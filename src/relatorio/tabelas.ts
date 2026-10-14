import { competenciaDe } from "../compartilhado/datas.ts";
import { Decimal, decimal, decimalOuNulo, ZERO } from "../compartilhado/decimal.ts";
import {
  formatarCompetencia,
  formatarData,
  formatarFator,
  formatarMoeda,
  formatarPercentual,
} from "../compartilhado/formatacao.ts";
import type { Calculo, Resultado } from "../compartilhado/tipos.ts";
import { diferencasDosEncargos } from "./metodologia.ts";
import { pares, percentualInformado, type Par } from "./texto.ts";

/**
 * O conteúdo das tabelas, dos indicadores, dos totais, do cabeçalho e do rodapé do relatório
 * (§18.3), já formatado para a impressão. Lê só o Cálculo e o Resultado. Módulo puro.
 */

/** Uma linha de tabela; `null` nas colunas sai como "—". */
export interface LinhaDoRelatorio {
  id: string;
  /** vencimento (prestações) ou data do pagamento, dd/mm/aaaa */
  data: string;
  descricao?: string;
  /** "vincenda", "não computado", "valor informado", "encargos próprios" */
  palavras: string[];
  valor: string | null;
  fator: string | null;
  corrigido: string | null;
  jurosPercentual: string | null;
  jurosValor: string | null;
  atualizado: string | null;
  /** fração do maior atualizado das duas tabelas, de 0 a 1, para a barra */
  proporcao: number;
  /** entra nos totais */
  computada: boolean;
}

/** Nota abaixo da tabela: "Vincenda: …" ou "Encargos próprios:" com uma linha por lançamento. */
export interface NotaDaTabela {
  termo: string;
  texto?: string;
  itens?: string[];
}

export interface TabelaDoRelatorio {
  linhas: LinhaDoRelatorio[];
  totais: { valor: string; corrigido: string; jurosValor: string; atualizado: string };
  notas: NotaDaTabela[];
}

/** "1.234,56": a moeda sem o "R$" (as tabelas dizem "valores em reais"). */
export function numero(valor: Decimal): string {
  return formatarMoeda(valor).replace("R$ ", "").replace(/^-/, "−");
}

const NOTA_VINCENDA: NotaDaTabela = {
  termo: "Vincenda",
  texto:
    "vencimento posterior à data do cálculo; incluída pelo valor nominal, sem correção e sem juros (art. 323 do CPC).",
};
const NOTA_VALOR_INFORMADO: NotaDaTabela = {
  termo: "Valor informado",
  texto: "valor indicado no cálculo, em vez do apurado pela base dos alimentos.",
};
const NOTA_NAO_COMPUTADO: NotaDaTabela = {
  termo: "Não computado",
  texto: "pagamento com data posterior à data do cálculo; não entra nos totais.",
};

/**
 * "05/03/2025: correção desde 10/04/2025; juros desde 01/05/2025." (§18.3): o que difere da
 * metodologia do cálculo, com a descrição entre parênteses depois da data, quando há (duas linhas
 * podem ter a mesma data).
 */
function encargosProprios(par: Par, calculo: Calculo): string {
  const l = par.lancamento;
  const descricao = l.descricao?.trim();
  return `${formatarData(l.data)}${descricao ? ` (${descricao})` : ""}: ${diferencasDosEncargos(par, calculo).join("; ")}.`;
}

/** Linha atualizada com encargos diferentes dos do cálculo: a palavra "encargos próprios". */
function comEncargosProprios(par: Par, calculo: Calculo): boolean {
  return par.calculado.situacao === "atualizado" && diferencasDosEncargos(par, calculo).length > 0;
}

function linha(par: Par, maior: Decimal, calculo: Calculo): LinhaDoRelatorio {
  const { lancamento, calculado } = par;
  const prestacao = lancamento.tipo === "prestacao";
  const palavras: string[] = [];
  if (calculado.situacao === "ignorado")
    palavras.push(prestacao ? "não computada" : "não computado");
  if (calculado.situacao === "vincenda") palavras.push("vincenda");
  if (calculado.editado) palavras.push("valor informado");
  if (comEncargosProprios(par, calculo)) palavras.push("encargos próprios");
  const descricao = lancamento.descricao?.trim();
  const atualizada = calculado.situacao === "atualizado";
  const computada = calculado.situacao !== "ignorado";
  const atualizado = decimal(calculado.atualizado);
  return {
    id: lancamento.id,
    data: formatarData(lancamento.data),
    ...(descricao ? { descricao } : {}),
    palavras,
    valor: numero(decimal(calculado.valorBase)),
    fator: atualizada ? formatarFator(decimal(calculado.correcao.fator)) : null,
    corrigido: atualizada ? numero(decimal(calculado.corrigido)) : null,
    jurosPercentual: atualizada ? formatarPercentual(decimal(calculado.juros.percentual), 6) : null,
    jurosValor: atualizada ? numero(decimal(calculado.jurosValor)) : null,
    atualizado: computada ? numero(atualizado) : null,
    proporcao: computada && maior.gt(ZERO) ? atualizado.div(maior).toNumber() : 0,
    computada,
  };
}

function tabela(lista: Par[], maior: Decimal, calculo: Calculo): TabelaDoRelatorio {
  const ordenada = [...lista].sort((a, b) =>
    a.lancamento.data < b.lancamento.data ? -1 : a.lancamento.data > b.lancamento.data ? 1 : 0,
  );
  // Cada total soma o que a coluna mostra: valor e atualizado, das linhas computadas (vincendas pelo
  // valor nominal); corrigido e juros, só das atualizadas (a vincenda mostra "—").
  const computadas = ordenada.filter((p) => p.calculado.situacao !== "ignorado");
  const atualizadas = ordenada.filter((p) => p.calculado.situacao === "atualizado");
  const soma = (lista: Par[], campo: "valorBase" | "corrigido" | "jurosValor" | "atualizado") =>
    numero(lista.reduce((s, p) => s.plus(decimal(p.calculado[campo])), ZERO));
  const notas: NotaDaTabela[] = [];
  if (
    ordenada.some((p) => p.calculado.situacao === "ignorado" && p.lancamento.tipo === "amortizacao")
  ) {
    notas.push(NOTA_NAO_COMPUTADO);
  }
  if (ordenada.some((p) => p.calculado.situacao === "vincenda")) notas.push(NOTA_VINCENDA);
  if (ordenada.some((p) => p.calculado.editado)) notas.push(NOTA_VALOR_INFORMADO);
  const proprios = ordenada.filter((p) => comEncargosProprios(p, calculo));
  if (proprios.length > 0) {
    notas.push({
      termo: "Encargos próprios",
      itens: proprios.map((p) => encargosProprios(p, calculo)),
    });
  }
  return {
    linhas: ordenada.map((p) => linha(p, maior, calculo)),
    totais: {
      valor: soma(computadas, "valorBase"),
      corrigido: soma(atualizadas, "corrigido"),
      jurosValor: soma(atualizadas, "jurosValor"),
      atualizado: soma(computadas, "atualizado"),
    },
    notas,
  };
}

/** As tabelas de prestações e de amortizações, com a barra relativa ao maior atualizado das duas. */
export function tabelasDoRelatorio(
  calculo: Calculo,
  resultado: Resultado,
): { prestacoes: TabelaDoRelatorio; amortizacoes: TabelaDoRelatorio } {
  const todos = pares(calculo, resultado);
  const maior = todos
    .filter((p) => p.calculado.situacao !== "ignorado")
    .reduce((m, p) => Decimal.max(m, decimal(p.calculado.atualizado)), ZERO);
  return {
    prestacoes: tabela(
      todos.filter((p) => p.lancamento.tipo === "prestacao"),
      maior,
      calculo,
    ),
    amortizacoes: tabela(
      todos.filter((p) => p.lancamento.tipo === "amortizacao"),
      maior,
      calculo,
    ),
  };
}

// ---------------------------------------------------------------------------------------------
// Indicadores e totais
// ---------------------------------------------------------------------------------------------

export interface Indicador {
  rotulo: string;
  valor: string;
  apoio: string;
  destaque?: boolean;
}

/** "jan a dez/2025", "jul/2024 a nov/2026", "out/2026". */
function intervaloDeMeses(datas: string[]): string {
  const meses = datas.map(competenciaDe).sort();
  const primeiro = meses[0];
  const ultimo = meses.at(-1);
  if (primeiro === undefined || ultimo === undefined) return "";
  if (primeiro === ultimo) return formatarCompetencia(primeiro);
  if (primeiro.slice(0, 4) === ultimo.slice(0, 4)) {
    return `${formatarCompetencia(primeiro).slice(0, 3)} a ${formatarCompetencia(ultimo)}`;
  }
  return `${formatarCompetencia(primeiro)} a ${formatarCompetencia(ultimo)}`;
}

function percentualPositivo(texto: string): string | null {
  const valor = decimalOuNulo(texto);
  return valor === null || !valor.gt(ZERO) ? null : percentualInformado(texto);
}

/** Os cinco indicadores (§18.3, item 2), com a linha de apoio; dívida negativa sai R$ 0,00. */
export function indicadoresDoRelatorio(calculo: Calculo, resultado: Resultado): Indicador[] {
  const computados = pares(calculo, resultado).filter((p) => p.calculado.situacao !== "ignorado");
  const prestacoes = computados.filter((p) => p.lancamento.tipo === "prestacao");
  const pagamentos = computados.filter((p) => p.lancamento.tipo === "amortizacao").length;
  const t = resultado.totais;
  const semDivida = !decimal(t.totalDevido).gt(ZERO);
  const moeda = (texto: string) => formatarMoeda(semDivida ? ZERO : decimal(texto));
  const multa = percentualPositivo(calculo.acrescimos.multaPercentual);
  const honorarios = percentualPositivo(calculo.acrescimos.honorariosPercentual);
  const apoioAcrescimos =
    multa !== null && honorarios !== null
      ? `${multa} + ${honorarios} sobre o total devido`
      : multa !== null
        ? `${multa} de multa sobre o total devido`
        : honorarios !== null
          ? `${honorarios} de honorários sobre o total devido`
          : "sem multa e sem honorários";
  const apoioGeral =
    multa !== null && honorarios !== null
      ? "com multa e honorários"
      : multa !== null
        ? "com multa"
        : honorarios !== null
          ? "com honorários"
          : "igual ao total devido";
  const n = prestacoes.length;
  return [
    {
      rotulo: "Prestações atualizadas",
      valor: formatarMoeda(decimal(t.prestacoes)),
      apoio: `${n} ${n === 1 ? "prestação" : "prestações"}, ${intervaloDeMeses(prestacoes.map((p) => p.lancamento.data))}`,
    },
    {
      rotulo: "Amortizações atualizadas",
      valor: formatarMoeda(decimal(t.amortizacoes)),
      apoio:
        pagamentos === 0
          ? "nenhum pagamento"
          : `${pagamentos} ${pagamentos === 1 ? "pagamento" : "pagamentos"}`,
    },
    {
      rotulo: `Total devido em ${formatarData(calculo.dataElaboracao)}`,
      valor: moeda(t.totalDevido),
      apoio: "prestações menos amortizações",
      destaque: true,
    },
    {
      rotulo: "Multa e honorários",
      valor: formatarMoeda(decimal(t.multa).plus(decimal(t.honorarios))),
      apoio: apoioAcrescimos,
    },
    { rotulo: "Total geral", valor: moeda(t.totalGeral), apoio: apoioGeral, destaque: true },
  ];
}

export interface LinhaDeTotal {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}

/** "Totais em dd/mm/aaaa" (§18.3, item 5); total devido zero ou negativo sai 0,00, com a frase. */
export function totaisDoRelatorio(
  calculo: Calculo,
  resultado: Resultado,
): { titulo: string; linhas: LinhaDeTotal[]; nota: string | null } {
  const t = resultado.totais;
  const devido = decimal(t.totalDevido);
  const semDivida = !devido.gt(ZERO);
  const linhas: LinhaDeTotal[] = [
    { rotulo: "Prestações atualizadas", valor: numero(decimal(t.prestacoes)) },
    {
      rotulo: "Amortizações atualizadas",
      valor: decimal(t.amortizacoes).isZero() ? "0,00" : `− ${numero(decimal(t.amortizacoes))}`,
    },
    { rotulo: "Total devido", valor: numero(semDivida ? ZERO : devido) },
  ];
  const multa = percentualPositivo(calculo.acrescimos.multaPercentual);
  const honorarios = percentualPositivo(calculo.acrescimos.honorariosPercentual);
  if (multa !== null) {
    linhas.push({
      rotulo: `Multa de ${multa} (art. 523, §1º, do CPC)`,
      valor: numero(decimal(t.multa)),
    });
  }
  if (honorarios !== null) {
    linhas.push({
      rotulo: `Honorários de ${honorarios} (art. 523, §1º, do CPC)`,
      valor: numero(decimal(t.honorarios)),
    });
  }
  linhas.push({
    rotulo: "Total geral",
    valor: numero(semDivida ? ZERO : decimal(t.totalGeral)),
    destaque: true,
  });
  const sobra = devido.negated();
  const nota = !semDivida
    ? null
    : sobra.gt(ZERO)
      ? `As amortizações atualizadas superam as prestações atualizadas em ${formatarMoeda(sobra)}; não há saldo devedor.`
      : decimal(t.amortizacoes).gt(ZERO)
        ? "As amortizações atualizadas igualam as prestações atualizadas; não há saldo devedor."
        : null;
  return { titulo: `Totais em ${formatarData(calculo.dataElaboracao)}`, linhas, nota };
}

// ---------------------------------------------------------------------------------------------
// Cabeçalho, título da aba e rodapé
// ---------------------------------------------------------------------------------------------

const preenchido = (texto: string): string | null => (texto.trim() === "" ? null : texto.trim());

/** A faixa verde (§18.3, item 1): campos em branco somem com o rótulo. */
export function cabecalhoDoRelatorio(calculo: Calculo): {
  orgao: string | null;
  titulo: string;
  linhas: string[];
} {
  const c = calculo.cabecalho;
  const processo = preenchido(c.processo);
  const partes = [
    preenchido(c.exequente) === null ? null : `Exequente: ${c.exequente.trim()}`,
    preenchido(c.executado) === null ? null : `Executado: ${c.executado.trim()}`,
  ].filter((p): p is string => p !== null);
  const defensor = preenchido(c.defensor);
  return {
    orgao: preenchido(c.orgao),
    titulo: `Demonstrativo discriminado e atualizado do crédito · ${formatarData(calculo.dataElaboracao)}`,
    linhas: [
      ...(processo === null ? [] : [`Processo nº ${processo}`]),
      ...(partes.length === 0 ? [] : [partes.join(" · ")]),
      ...(defensor === null ? [] : [`Defensor(a): ${defensor}`]),
    ],
  };
}

/** Título da aba enquanto o relatório está aberto: o nome que o navegador sugere para o PDF (§18.1). */
export function tituloDoDocumento(calculo: Calculo): string {
  const data = formatarData(calculo.dataElaboracao).replaceAll("/", "-");
  const processo = preenchido(calculo.cabecalho.processo);
  return processo === null ? `Apura – ${data}` : `Apura – ${processo} – ${data}`;
}

/** Rodapé (§10.1, §18.3): o único lugar do relatório com o nome Apura. */
export function rodapeDoRelatorio(
  calculo: Calculo,
  versao: string,
  hoje: string,
): { esquerda: string; direita: string } {
  const orgao = preenchido(calculo.cabecalho.orgao);
  return {
    esquerda: `Defensoria Pública de Mato Grosso do Sul${orgao === null ? "" : ` · ${orgao}`}`,
    direita: `Fonte dos índices: BCB/SGS · Gerado com Apura v${versao} em ${formatarData(hoje)}`,
  };
}
