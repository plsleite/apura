import { competenciaDe, primeiroDiaDoMes } from "../compartilhado/datas.ts";
import { decimal, decimalOuNulo } from "../compartilhado/decimal.ts";
import {
  formatarCompetencia,
  formatarData,
  formatarMoeda,
  formatarPercentual,
} from "../compartilhado/formatacao.ts";
import { CODIGO_DA_SERIE, NOME_DA_SERIE } from "../compartilhado/tipos.ts";
import type {
  Calculo,
  CodigoSerie,
  Competencia,
  DataISO,
  FormaDaBase,
  Metodologia,
  PeriodoDaBase,
  PeriodoMetodologia,
  ReajusteDaBase,
  Resultado,
} from "../compartilhado/tipos.ts";
import { formatarDataHoraBrasilia } from "../indices/relogio.ts";
import { descreverPeriodoDaBase, periodosDaBaseOrdenados } from "../motor/base.ts";
import { periodosOrdenados, periodoVigenteEm } from "../motor/periodos.ts";
import {
  comSinalDeMenos,
  listar,
  maiuscula,
  MESES_POR_EXTENSO,
  pares,
  percentualInformado,
  type Par,
} from "./texto.ts";

/**
 * "Metodologia e fundamentos" (§10.4, §18.4 e §18.5): parágrafos gerados do que foi aplicado,
 * nunca de parâmetros do sistema (nome da opção de metodologia, versão, "ajuste"). Cada parágrafo
 * só aparece quando há o que dizer. Lê só o Cálculo e o Resultado. Módulo puro.
 */

export interface Paragrafo {
  titulo: string;
  texto: string;
}

const MORA = "Encargos desde o vencimento de cada prestação (mora automática, art. 397 do CC).";
const TAXA_LEGAL =
  "juros pela taxa legal (art. 406, §1º, do CC; Lei 14.905/2024; Resolução CMN 5.171/2024), série 29543 do BCB, acumulada por juros simples e pro rata por dias corridos";
const SELIC_UNICA =
  "SELIC (série 4390 do BCB) como índice único de correção e juros, capitalizada mês a mês";
/** Primeiro dia do regime da Lei 14.905/2024: o IPCA a partir dele leva o art. 389 do CC. */
const INICIO_LEI_14905: DataISO = "2024-08-30";

export function metodologiaEFundamentos(calculo: Calculo, resultado: Resultado): Paragrafo[] {
  const candidatos: Array<[string, string | null]> = [
    ["Base.", paragrafoBase(calculo, resultado)],
    ["Termos.", paragrafoTermos(calculo, resultado)],
    ["Encargos.", paragrafoEncargos(calculo, resultado)],
    ["Amortizações.", paragrafoAmortizacoes(calculo, resultado)],
    ["Multa e honorários.", paragrafoMultaEHonorarios(calculo)],
    ["Deflação.", paragrafoDeflacao(calculo, resultado)],
    ["Observações.", calculo.observacoes.trim() === "" ? null : calculo.observacoes.trim()],
    ["Fontes e arredondamento.", paragrafoFontes(calculo, resultado)],
  ];
  return candidatos.flatMap(([titulo, texto]) => (texto === null ? [] : [{ titulo, texto }]));
}

// ---------------------------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------------------------

/** Prestação apurada pela base (sem valor informado), que a frase da base descreve. */
function pelaBase(p: Par): boolean {
  return p.lancamento.tipo === "prestacao" && p.lancamento.valorInformado === undefined;
}

function noPeriodo(periodo: PeriodoDaBase, data: DataISO): boolean {
  return (
    (periodo.de === null || periodo.de <= data) && (periodo.ate === null || data <= periodo.ate)
  );
}

function moedaDoTexto(texto: string): string | null {
  const valor = decimalOuNulo(texto);
  return valor === null ? null : formatarMoeda(valor);
}

/** "em mar/2025 (IPCA de mar/2024 a fev/2025: 5,0576%)" */
function descreverReajuste(r: ReajusteDaBase): string {
  const janela = `${r.indice} de ${formatarCompetencia(r.de)} a ${formatarCompetencia(r.ate)}: ${comSinalDeMenos(formatarPercentual(decimal(r.percentual ?? "0"), 4))}`;
  const mantido = r.situacao === "mantido" ? ", acumulado não positivo: valor mantido" : "";
  return `em ${formatarCompetencia(r.em)} (${janela}${mantido})`;
}

/** "; o reajuste de nov/2026 não foi aplicado (IPCA de out/2026 ainda não divulgado na data da consulta)" */
function descreverNaoAplicado(r: ReajusteDaBase): string {
  const faltantes = r.faltantes ?? [];
  const meses = listar(faltantes.map(formatarCompetencia));
  const varios = faltantes.length > 1;
  const motivo = r.aindaNaoDivulgados
    ? `ainda não ${varios ? "divulgados" : "divulgado"} na data da consulta`
    : `não ${varios ? "disponíveis" : "disponível"} na tabela de índices`;
  return `; o reajuste de ${formatarCompetencia(r.em)} não foi aplicado (${r.indice} de ${meses} ${motivo})`;
}

function fraseDoValorFixo(
  forma: Extract<FormaDaBase, { tipo: "valorFixo" }>,
  doPeriodo: Par[],
  resultado: Resultado,
): string | null {
  const valor = moedaDoTexto(forma.valor);
  if (valor === null) return null;
  const inicio = `valor fixo de ${valor}, fixado em ${formatarData(forma.dataFixacao)}`;
  if (forma.indiceReajuste === "nenhum") return `${inicio}, sem reajuste`;
  if (forma.indiceReajuste === "SM") {
    const mesFixacao = competenciaDe(forma.dataFixacao);
    const salario = resultado.indicesUsados.find(
      (i) => i.serie === CODIGO_DA_SERIE.SM && i.competencia === mesFixacao,
    );
    const nota =
      salario === undefined
        ? ""
        : ` (salário mínimo de ${formatarCompetencia(mesFixacao)}: ${formatarMoeda(decimal(salario.valor))})`;
    return `${inicio}, reajustado na proporção do salário mínimo vigente no mês de cada vencimento${nota}`;
  }
  // Mês do reajuste fora de 1 a 12 (só com arquivo fora do padrão): o motor não reajusta.
  if (!Number.isInteger(forma.mesReajuste) || forma.mesReajuste < 1 || forma.mesReajuste > 12) {
    return `${inicio}, sem reajuste`;
  }
  // Os reajustes da prestação de vencimento mais recente apurada pela base no período (§18.5).
  const ultima = doPeriodo
    .filter((p) => p.calculado.reajustes !== undefined)
    .sort((a, b) => (a.lancamento.data < b.lancamento.data ? -1 : 1))
    .at(-1);
  const reajustes = ultima?.calculado.reajustes ?? [];
  const feitos = reajustes.filter((r) => r.situacao !== "naoAplicado");
  const naoAplicado = reajustes.find((r) => r.situacao === "naoAplicado");
  const indice = forma.indiceReajuste;
  let frase: string;
  if (feitos.length > 0) {
    const valorFinal = feitos.at(-1)?.valor ?? forma.valor;
    frase = `${inicio}, reajustado pelo ${indice} acumulado desde o reajuste anterior: ${listar(feitos.map(descreverReajuste))}, chegando a ${formatarMoeda(decimal(valorFinal))}`;
  } else {
    const mes = MESES_POR_EXTENSO[forma.mesReajuste - 1] ?? "";
    frase = `${inicio}, com reajuste anual pelo ${indice} acumulado, em ${mes}`;
    if (naoAplicado === undefined && ultima !== undefined) {
      frase += "; não houve reajuste até o último vencimento";
    }
  }
  return naoAplicado === undefined ? frase : frase + descreverNaoAplicado(naoAplicado);
}

function fraseDosRendimentos(
  forma: Extract<FormaDaBase, { tipo: "percentualRendimentos" }>,
  doPeriodo: Par[],
): string | null {
  const percentual = percentualInformado(forma.percentual);
  if (percentual === null) return null;
  const proprios = doPeriodo
    .filter((p) => p.lancamento.rendimento !== undefined)
    .map((p) => {
      const descricao = p.lancamento.descricao?.trim();
      const quando = `${formatarData(p.lancamento.data)}${descricao ? ` (${descricao})` : ""}`;
      return `${quando}, ${moedaDoTexto(p.lancamento.rendimento ?? "") ?? ""}`;
    });
  const padrao = moedaDoTexto(forma.rendimentoPadrao);
  const inicio = `${percentual} dos rendimentos do executado`;
  if (padrao === null) return `${inicio}, sobre o rendimento de cada mês: ${proprios.join("; ")}`;
  const frase = `${inicio}, sobre o rendimento mensal de ${padrao}`;
  return proprios.length === 0
    ? frase
    : `${frase}; nos meses com rendimento próprio, sobre ele: ${proprios.join("; ")}`;
}

function fraseDaForma(forma: FormaDaBase, doPeriodo: Par[], resultado: Resultado): string | null {
  switch (forma.tipo) {
    case "valorFixo":
      return fraseDoValorFixo(forma, doPeriodo, resultado);
    case "percentualSalarioMinimo": {
      const percentual = percentualInformado(forma.percentual);
      return percentual === null
        ? null
        : `${percentual} do salário mínimo vigente no mês de cada vencimento`;
    }
    case "percentualRendimentos":
      return fraseDosRendimentos(forma, doPeriodo);
  }
}

/**
 * Base (§18.5): uma frase por período em que vence alguma prestação apurada pela base; com dois
 * ou mais períodos na base, cada frase começa pelo intervalo (§17.2). Complementos: prestações
 * anteriores à fixação e valores informados à mão.
 */
export function paragrafoBase(calculo: Calculo, resultado: Resultado): string | null {
  const todos = pares(calculo, resultado);
  const apuradas = todos.filter(pelaBase);
  const periodos = periodosDaBaseOrdenados(calculo.base);
  const frases: string[] = [];
  let anteriorAFixacao = false;
  for (const periodo of periodos) {
    const doPeriodo = apuradas.filter((p) => noPeriodo(periodo, p.lancamento.data));
    if (doPeriodo.length === 0) continue;
    const frase = fraseDaForma(periodo.forma, doPeriodo, resultado);
    if (frase === null) continue;
    frases.push(periodos.length > 1 ? `${descreverPeriodoDaBase(periodo)}, ${frase}` : frase);
    const forma = periodo.forma;
    if (
      forma.tipo === "valorFixo" &&
      doPeriodo.some((p) => competenciaDe(p.lancamento.data) < competenciaDe(forma.dataFixacao))
    ) {
      anteriorAFixacao = true;
    }
  }
  const textos: string[] = [];
  if (frases.length > 0) textos.push(`${maiuscula(frases.join("; "))}.`);
  if (anteriorAFixacao) {
    textos.push("As prestações vencidas antes da fixação entram pelo valor fixado, sem reajuste.");
  }
  if (todos.some((p) => p.calculado.editado)) {
    textos.push(
      "Nas prestações marcadas “valor informado”, vale o valor indicado na tabela, em vez do apurado pela base.",
    );
  }
  return textos.length === 0 ? null : textos.join(" ");
}

// ---------------------------------------------------------------------------------------------
// Termos e encargos
// ---------------------------------------------------------------------------------------------

const atualizados = (calculo: Calculo, resultado: Resultado): Par[] =>
  pares(calculo, resultado).filter((p) => p.calculado.situacao === "atualizado");

function sobrepoe(p: PeriodoMetodologia, inicio: DataISO, fim: DataISO): boolean {
  return (p.de === null || p.de <= fim) && (p.ate === null || inicio <= p.ate);
}

/**
 * Os períodos da metodologia que os lançamentos de fato alcançaram, pelo resultado de cada um
 * (§18.5): pela correção, o período do primeiro dia de cada mês que entrou com fração (o mês do
 * vencimento com fração zero, ou fora pela incidência a partir do mês seguinte, não conta); pelos
 * juros, os períodos que cada trecho de juros toca. Os termos próprios já estão no resultado.
 */
export function periodosAlcancados(m: Metodologia, lista: Par[]): PeriodoMetodologia[] {
  const periodos = periodosOrdenados(m);
  const alcancados = new Set<PeriodoMetodologia>();
  for (const { calculado } of lista) {
    for (const i of calculado.correcao.indices) {
      if (i.fracao.startsWith("0/")) continue;
      const periodo = periodoVigenteEm(m, primeiroDiaDoMes(i.competencia));
      if (periodo !== undefined) alcancados.add(periodo);
    }
    for (const d of calculado.juros.detalhe) {
      for (const periodo of periodos) if (sobrepoe(periodo, d.de, d.ate)) alcancados.add(periodo);
    }
  }
  return periodos.filter((p) => alcancados.has(p));
}

/** A regra (índice e juros, a taxa como número) do período que contém a data; "sem período" fora deles. */
function regraEm(m: Metodologia, data: DataISO): string {
  const p = periodoVigenteEm(m, data);
  if (p === undefined) return "sem período";
  const taxa =
    p.juros.tipo === "percentualMensal"
      ? (decimalOuNulo(p.juros.taxaMensal)?.toString() ?? p.juros.taxaMensal)
      : "";
  return `${p.correcao.indice}|${p.juros.tipo}|${taxa}`;
}

/**
 * A metodologia própria do lançamento aplica, no trecho que ele alcançou, as mesmas regras da
 * metodologia do cálculo nas mesmas datas (§18.7): diferença só num período que o lançamento não
 * alcança não conta. Compara o primeiro dia de cada mês que entrou na correção e as duas pontas de
 * cada trecho de juros.
 */
export function mesmasRegrasNoAlcance(
  propria: Metodologia,
  global: Metodologia,
  par: Par,
): boolean {
  const datas = [
    ...par.calculado.correcao.indices
      .filter((i) => !i.fracao.startsWith("0/"))
      .map((i) => primeiroDiaDoMes(i.competencia)),
    ...par.calculado.juros.detalhe.flatMap((d) => [d.de, d.ate]),
  ];
  return datas.every((data) => regraEm(propria, data) === regraEm(global, data));
}

const DEFLACAO_CURTA: Record<Metodologia["deflacao"], string> = {
  aplicarComPiso:
    "índices negativos computados, sem que o valor corrigido fique inferior ao original",
  aplicarSemPiso: "índices negativos computados, sem piso",
  zerarNegativos: "índices negativos desconsiderados (tomados como zero)",
};

/** "correção desde 10/04/2025", "correção até 30/06/2026", "correção de 10/04/2025 a 30/06/2026". */
function termo(nome: string, inicio?: string, fim?: string): string | null {
  if (inicio !== undefined && fim !== undefined) {
    return `${nome} de ${formatarData(inicio)} a ${formatarData(fim)}`;
  }
  if (inicio !== undefined) return `${nome} desde ${formatarData(inicio)}`;
  if (fim !== undefined) return `${nome} até ${formatarData(fim)}`;
  return null;
}

/**
 * O que os encargos de um lançamento têm de diferente dos do cálculo (§18.3, nota "Encargos
 * próprios"): os termos próprios; e, com metodologia própria, as regras dos períodos que o
 * lançamento alcançou (quando não são as do cálculo), a incidência no mês inicial e a deflação
 * (quando diferem). Lista vazia: nada difere, e a linha não leva a palavra "encargos próprios".
 */
export function diferencasDosEncargos(par: Par, calculo: Calculo): string[] {
  const e = par.lancamento.encargos ?? {};
  const partes = [
    termo("correção", e.termoInicialCorrecao, e.termoFinalCorrecao),
    termo("juros", e.termoInicialJuros, e.termoFinalJuros),
  ].filter((p): p is string => p !== null);
  const propria = e.metodologia;
  if (propria === undefined) return partes;
  const global = calculo.metodologia;
  if (!mesmasRegrasNoAlcance(propria, global, par)) {
    partes.push(regrasResumidas(propria, periodosAlcancados(propria, [par])));
  }
  if (propria.incidenciaMesInicial !== global.incidenciaMesInicial) {
    const data = par.lancamento.tipo === "prestacao" ? "vencimento" : "pagamento";
    partes.push(
      propria.incidenciaMesInicial === "mesSeguinte"
        ? `correção a partir do mês seguinte ao do ${data}`
        : `correção pelo índice do mês do ${data}, proporcional aos dias restantes (pro rata)`,
    );
  }
  if (propria.deflacao !== global.deflacao) partes.push(DEFLACAO_CURTA[propria.deflacao]);
  return partes;
}

/**
 * Termos (§18.5): a regra comum, descrita a partir dos lançamentos atualizados sem encargos
 * próprios e só com o que eles tiveram (correção, se algum mês entrou com índice; juros, se o
 * percentual passou de zero; o último mês inteiro com índice; o pro rata no mês do cálculo; o
 * valor parcial da SELIC no mês do cálculo); a mora fala das prestações, e, só com pagamentos, a
 * correção fala da data do pagamento. Com lançamentos de encargos próprios, a remissão às notas.
 */
export function paragrafoTermos(calculo: Calculo, resultado: Resultado): string | null {
  const lista = atualizados(calculo, resultado);
  if (lista.length === 0) return null;
  const comuns = lista.filter((p) => diferencasDosEncargos(p, calculo).length === 0);
  const frases: string[] = [];
  if (lista.some((p) => p.lancamento.tipo === "prestacao")) frases.push(MORA);

  const mesDoCalculo = competenciaDe(calculo.dataElaboracao);
  let comCorrecao = false;
  let ultimoInteiro: Competencia | null = null;
  let parcialDaSelic = false;
  let proRataFinal: { competencia: Competencia; dias: number } | null = null;
  for (const { lancamento, calculado } of comuns) {
    for (const i of calculado.correcao.indices) {
      if (i.serie === null || i.fracao.startsWith("0/")) continue;
      comCorrecao = true;
      if (i.valor === null) continue;
      if (i.fracao === "1") {
        if (ultimoInteiro === null || i.competencia > ultimoInteiro) ultimoInteiro = i.competencia;
        if (i.competencia === mesDoCalculo && i.serie === CODIGO_DA_SERIE.SELIC)
          parcialDaSelic = true;
      } else if (
        i.competencia === mesDoCalculo &&
        competenciaDe(lancamento.data) !== mesDoCalculo
      ) {
        proRataFinal = { competencia: i.competencia, dias: Number(i.fracao.split("/")[0]) };
      }
    }
  }
  const comJuros = comuns.some((p) => decimal(p.calculado.juros.percentual).gt(0));
  const data = comuns.some((p) => p.lancamento.tipo === "prestacao") ? "vencimento" : "pagamento";
  const mesSeguinte = calculo.metodologia.incidenciaMesInicial === "mesSeguinte";
  let correcao: string | null = null;
  if (comCorrecao) {
    // o valor parcial do mês do cálculo é só da SELIC (§6.4); o índice inteiro do mês do cálculo
    // em outra série (cálculo no último dia do mês, com o índice já publicado) é o último divulgado
    const ate =
      ultimoInteiro === null
        ? null
        : ultimoInteiro === mesDoCalculo && parcialDaSelic
          ? `até ${formatarCompetencia(ultimoInteiro)} (no mês do cálculo, o valor parcial já divulgado)`
          : `até ${formatarCompetencia(ultimoInteiro)}${proRataFinal === null ? ", último índice divulgado" : ""}`;
    const inicio = mesSeguinte
      ? `Correção a partir do mês seguinte ao do ${data}`
      : `Correção pelo índice do mês do ${data}, proporcional aos dias restantes (pro rata)`;
    const meses =
      ate === null
        ? ""
        : mesSeguinte
          ? `, pelos meses inteiros ${ate}`
          : `, e pelos meses seguintes ${ate}`;
    const final =
      proRataFinal === null
        ? ""
        : ` e, no mês do cálculo, pelo índice de ${formatarCompetencia(proRataFinal.competencia)} proporcional aos ${proRataFinal.dias} dias decorridos`;
    correcao = `${inicio}${meses}${final}`;
  }
  if (correcao !== null && comJuros) frases.push(`${correcao}; juros até a data do cálculo.`);
  else if (correcao !== null) frases.push(`${correcao}.`);
  else if (comJuros) frases.push("Juros até a data do cálculo.");
  if (comuns.length < lista.length) {
    frases.push(
      "Os lançamentos marcados “encargos próprios” seguem os termos e as regras indicados nas notas das tabelas.",
    );
  }
  return frases.length === 0 ? null : frases.join(" ");
}

function taxaInformada(texto: string): string {
  return decimalOuNulo(texto)?.toFixed().replace(".", ",") ?? texto;
}

/** "IPCA (art. 389, parágrafo único, do CC) e juros pela taxa legal (…)": as regras de um período. */
function regraDoPeriodo(p: PeriodoMetodologia): { texto: string; jurosSeparados: boolean } {
  if (p.juros.tipo === "selicUnica") return { texto: SELIC_UNICA, jurosSeparados: false };
  const indice = p.correcao.indice;
  const correcao =
    indice === "nenhum"
      ? "sem correção monetária"
      : indice === "IPCA" && p.de !== null && p.de >= INICIO_LEI_14905
        ? "IPCA (art. 389, parágrafo único, do CC)"
        : indice;
  if (p.juros.tipo === "taxaLegal") {
    return { texto: `${correcao} e ${TAXA_LEGAL}`, jurosSeparados: true };
  }
  const taxa = decimalOuNulo(p.juros.taxaMensal);
  if (taxa === null || taxa.isZero()) {
    return { texto: `${correcao} e sem juros`, jurosSeparados: false };
  }
  return {
    texto: `${correcao} e juros de ${taxaInformada(p.juros.taxaMensal)}% ao mês, simples, pro rata die`,
    jurosSeparados: true,
  };
}

/**
 * Encargos (§18.5): os períodos da metodologia do cálculo que os lançamentos atualizados com ela
 * (sem metodologia própria, ou com uma de mesmas regras) de fato alcançaram; com um só, sem o
 * intervalo. "sobre o valor corrigido" vem logo depois do último período com juros separados.
 */
export function paragrafoEncargos(calculo: Calculo, resultado: Resultado): string | null {
  const global = calculo.metodologia;
  const daGlobal = atualizados(calculo, resultado).filter((p) => {
    const propria = p.lancamento.encargos?.metodologia;
    return propria === undefined || mesmasRegrasNoAlcance(propria, global, p);
  });
  if (daGlobal.length === 0) return null;
  const alcancados = periodosAlcancados(global, daGlobal);
  if (alcancados.length === 0) return null;
  const regras = alcancados.map(regraDoPeriodo);
  const ultimoComJuros = regras.map((r) => r.jurosSeparados).lastIndexOf(true);
  const corrigido = (i: number) => (i === ultimoComJuros ? ", sobre o valor corrigido" : "");
  if (alcancados.length === 1) {
    const unico =
      periodosOrdenados(global).length === 1 ? ", do vencimento até a data do cálculo" : "";
    return `${maiuscula(regras[0]?.texto ?? "")}${unico}${corrigido(0)}.`;
  }
  const trechos = alcancados.map(
    (p, i) => `${descreverPeriodoDaBase(p)}, ${regras[i]?.texto ?? ""}${corrigido(i)}`,
  );
  return `${maiuscula(trechos.join("; "))}.`;
}

/**
 * As regras de uma metodologia em poucas palavras, para as notas de encargos próprios (§18.3): os
 * `periodos` dados (os que o lançamento alcançou) ou, sem eles, todos; com um só, sem o intervalo.
 */
export function regrasResumidas(m: Metodologia, periodos: PeriodoMetodologia[] = []): string {
  const lista = periodos.length > 0 ? periodos : periodosOrdenados(m);
  const curta = (p: PeriodoMetodologia): string => {
    if (p.juros.tipo === "selicUnica") return "SELIC como índice único de correção e juros";
    const correcao = p.correcao.indice === "nenhum" ? "sem correção monetária" : p.correcao.indice;
    if (p.juros.tipo === "taxaLegal") return `${correcao} e juros pela taxa legal`;
    const taxa = decimalOuNulo(p.juros.taxaMensal);
    if (taxa === null || taxa.isZero()) return `${correcao} e sem juros`;
    return `${correcao} e juros de ${taxaInformada(p.juros.taxaMensal)}% ao mês`;
  };
  if (lista.length === 1 && lista[0] !== undefined) return curta(lista[0]);
  return lista.map((p) => `${descreverPeriodoDaBase(p)}, ${curta(p)}`).join("; ");
}

// ---------------------------------------------------------------------------------------------
// Amortizações, multa e honorários, deflação, fontes
// ---------------------------------------------------------------------------------------------

function paragrafoAmortizacoes(calculo: Calculo, resultado: Resultado): string | null {
  const algum = atualizados(calculo, resultado).some((p) => p.lancamento.tipo === "amortizacao");
  return algum
    ? "Cada pagamento é atualizado pelos mesmos critérios, da data do pagamento até a data do cálculo, e abatido do total atualizado."
    : null;
}

function positivo(texto: string): string | null {
  const valor = decimalOuNulo(texto);
  return valor === null || !valor.gt(0) ? null : percentualInformado(texto);
}

function paragrafoMultaEHonorarios(calculo: Calculo): string | null {
  const multa = positivo(calculo.acrescimos.multaPercentual);
  const honorarios = positivo(calculo.acrescimos.honorariosPercentual);
  if (multa !== null && honorarios !== null) {
    return `Multa de ${multa} e honorários de ${honorarios} (art. 523, §1º, do CPC), cada um sobre o total devido atualizado, sem incidência dos honorários sobre a multa.`;
  }
  if (multa !== null)
    return `Multa de ${multa} (art. 523, §1º, do CPC), sobre o total devido atualizado.`;
  if (honorarios !== null) {
    return `Honorários de ${honorarios} (art. 523, §1º, do CPC), sobre o total devido atualizado.`;
  }
  return null;
}

/**
 * Deflação (§18.5): só quando um índice negativo entrou na conta de algum lançamento; com piso,
 * só quando o piso atuou. Cada lançamento segue a deflação da sua metodologia (a própria ou a do
 * cálculo).
 */
export function paragrafoDeflacao(calculo: Calculo, resultado: Resultado): string | null {
  const frases = new Set<string>();
  for (const { lancamento, calculado } of atualizados(calculo, resultado)) {
    const modo = (lancamento.encargos?.metodologia ?? calculo.metodologia).deflacao;
    const negativo = calculado.correcao.indices.some(
      (i) => i.valor !== null && !i.fracao.startsWith("0/") && decimal(i.valor).isNegative(),
    );
    if (!negativo) continue;
    if (modo === "aplicarComPiso" && calculado.correcao.pisoAplicado) {
      frases.add("Índices negativos computados; o valor corrigido não fica inferior ao original.");
    } else if (modo === "aplicarSemPiso") {
      frases.add("Índices negativos computados, sem piso.");
    } else if (modo === "zerarNegativos") {
      frases.add("Índices negativos desconsiderados (tomados como zero).");
    }
  }
  return frases.size === 0 ? null : [...frases].join(" ");
}

/**
 * Fontes e arredondamento (§18.5): as séries usadas, em ordem numérica, a data da consulta e o
 * arredondamento; os meses sem índice na data da consulta, por série.
 */
export function paragrafoFontes(calculo: Calculo, resultado: Resultado): string {
  const series = [...new Set(resultado.indicesUsados.map((i) => i.serie))].sort(
    (a, b) => Number(a) - Number(b),
  );
  const { fatorCasas, percentualCasas, valorCasas } = calculo.metodologia.arredondamento;
  const arredondamento = `Arredondamento comercial: fator e percentual de juros com ${fatorCasas === percentualCasas ? fatorCasas : `${fatorCasas} e ${percentualCasas}`} casas, valores com ${valorCasas} casas por lançamento.`;
  const partes: string[] = [];
  if (series.length > 0) {
    const lista = series.map((s) => `${NOME_DA_SERIE[s]}, série ${s}`).join("; ");
    partes.push(
      `Índices do Sistema Gerenciador de Séries Temporais do Banco Central (${lista}), atualizados em ${formatarDataHoraBrasilia(resultado.consultaIndices.em)} (horário de Brasília).`,
    );
  }
  partes.push(arredondamento);
  const faltas = new Map<CodigoSerie, Set<Competencia>>();
  for (const l of resultado.lancamentos) {
    for (const i of l.correcao.indices) {
      if (i.serie === null || i.valor !== null || i.fracao.startsWith("0/")) continue;
      const meses = faltas.get(i.serie) ?? new Set<Competencia>();
      meses.add(i.competencia);
      faltas.set(i.serie, meses);
    }
  }
  if (faltas.size > 0) {
    const total = [...faltas.values()].reduce((n, m) => n + m.size, 0);
    const descricao = [...faltas.entries()]
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(
        ([s, meses]) =>
          `${NOME_DA_SERIE[s]} de ${listar([...meses].sort().map(formatarCompetencia))}`,
      )
      .join("; ");
    partes.push(
      total === 1
        ? `Mês sem índice divulgado na data da consulta, computado sem correção: ${descricao}.`
        : `Meses sem índice divulgado na data da consulta, computados sem correção: ${descricao}.`,
    );
  }
  return partes.join(" ");
}
