import { competenciaDe } from "../compartilhado/datas.ts";
import {
  arredondar,
  CEM,
  decimal,
  decimalOuNulo,
  paraTexto,
  UM,
  ZERO,
  type Decimal,
} from "../compartilhado/decimal.ts";
import { formatarCompetencia, formatarData, formatarMoeda } from "../compartilhado/formatacao.ts";
import { CODIGO_DA_SERIE, NOME_DA_SERIE } from "../compartilhado/tipos.ts";
import type {
  Calculo,
  CodigoSerie,
  Competencia,
  DataISO,
  IndiceUsado,
  Lancamento,
  LancamentoCalculado,
  ReajusteDaBase,
  SalarioMinimoAnterior,
  Resultado,
  SituacaoLancamento,
  TabelaIndices,
  TextoDecimal,
  Totais,
} from "../compartilhado/tipos.ts";
import { apurarPelaBase, type MesSemIndice } from "./base.ts";
import { fatorCorrecao, resolverIndicesMensais } from "./correcao.ts";
import { aindaNaoDivulgado, divulgacaoPrevista } from "../compartilhado/divulgacao.ts";
import { jurosSimples } from "./juros.ts";
import { validarMetodologia } from "./periodos.ts";

/** Ordena códigos de série como números ("189" antes de "1619"). */
function compararSeries(a: CodigoSerie, b: CodigoSerie): number {
  return Number(a) - Number(b);
}

/** "jan/2017" pela competência ou, sem ela, a data: "10/01/2017". */
function rotuloDaCompetencia(l: Lancamento): string {
  return l.competencia === undefined ? formatarData(l.data) : formatarCompetencia(l.competencia);
}

/** "prestação de jan/2017" ou "pagamento de 10/01/2017", para os avisos. */
function rotulo(l: Lancamento): string {
  if (l.tipo === "amortizacao") return `pagamento de ${formatarData(l.data)}`;
  return `prestação de ${rotuloDaCompetencia(l)}`;
}

/**
 * Termo final próprio posterior à data de elaboração é limitado a ela, com aviso: o cálculo
 * atualiza até a data em que é feito (§6.4).
 */
function limitarTermoFinal(
  termo: DataISO | undefined,
  dataElaboracao: DataISO,
  rotulo: string,
  avisos: string[],
): DataISO {
  if (termo === undefined || termo <= dataElaboracao) return termo ?? dataElaboracao;
  avisos.push(
    `Termo final ${rotulo} (${formatarData(termo)}) posterior à data de elaboração: limitado a ${formatarData(dataElaboracao)}.`,
  );
  return dataElaboracao;
}

function temTermosProprios(l: Lancamento): boolean {
  const e = l.encargos;
  return (
    e !== undefined &&
    (e.termoInicialCorrecao !== undefined ||
      e.termoFinalCorrecao !== undefined ||
      e.termoInicialJuros !== undefined ||
      e.termoFinalJuros !== undefined)
  );
}

interface Rastro {
  lancamento: LancamentoCalculado;
  mesesSemTaxaLegal: Competencia[];
  indicesDaBase: IndiceUsado[];
  mesesSemIndiceNaBase: MesSemIndice[];
  /** reajustes do valor fixo por índice da prestação apurada pela base (§18.4) */
  reajustesDaBase?: ReajusteDaBase[];
  /** salário mínimo anterior usado no lugar do que faltou (§19.7, item 6) */
  salarioMinimoAnteriorDaBase?: SalarioMinimoAnterior;
}

type RastroDaBase = Pick<
  Rastro,
  "indicesDaBase" | "mesesSemIndiceNaBase" | "reajustesDaBase" | "salarioMinimoAnteriorDaBase"
>;

interface ValorResolvido {
  valorBase: Decimal;
  memoriaBase: string;
  editado: boolean;
  /** não há valor utilizável: o lançamento fica fora dos totais */
  semValor: boolean;
}

/**
 * Valor-base do lançamento (§6.3): o valor informado prevalece (nas prestações, é "informado à
 * mão" e gera aviso); prestação sem valor é apurada pela base dos alimentos; pagamento sem valor
 * fica sem valor.
 */
function resolverValor(
  lancamento: Lancamento,
  calculo: Calculo,
  indices: TabelaIndices,
  valorCasas: number,
  avisos: string[],
  rastro: RastroDaBase,
): ValorResolvido {
  if (lancamento.valorInformado !== undefined) {
    const informado = decimalOuNulo(lancamento.valorInformado);
    const editado = lancamento.tipo === "prestacao";
    if (informado === null) {
      avisos.push(
        `Valor informado ("${lancamento.valorInformado}") não é um número válido: o lançamento não foi computado nos totais; corrija o valor.`,
      );
      return { valorBase: ZERO, memoriaBase: "Valor informado inválido", editado, semValor: true };
    }
    const valorBase = arredondar(informado, valorCasas);
    if (editado) {
      avisos.push(
        `Valor informado à mão (${formatarMoeda(valorBase)}), não apurado pela base dos alimentos.`,
      );
    }
    return {
      valorBase,
      memoriaBase: `Valor informado: ${formatarMoeda(valorBase)}`,
      editado,
      semValor: false,
    };
  }
  if (lancamento.tipo === "amortizacao") {
    avisos.push("Pagamento sem valor informado: não computado nos totais.");
    return { valorBase: ZERO, memoriaBase: "Valor não informado", editado: false, semValor: true };
  }
  const base = apurarPelaBase(lancamento, calculo.base, indices, valorCasas);
  avisos.push(...base.avisos);
  rastro.indicesDaBase = base.indicesUsados;
  rastro.mesesSemIndiceNaBase = base.mesesSemIndice;
  if (base.reajustes !== undefined) rastro.reajustesDaBase = base.reajustes;
  if (base.salarioMinimoAnterior !== undefined) {
    rastro.salarioMinimoAnteriorDaBase = base.salarioMinimoAnterior;
  }
  if (base.valor === null) {
    return { valorBase: ZERO, memoriaBase: base.memoria, editado: false, semValor: true };
  }
  return { valorBase: base.valor, memoriaBase: base.memoria, editado: false, semValor: false };
}

/**
 * Situação do lançamento (§6.7): sem valor utilizável, valor zero ou negativo e pagamento
 * posterior à data de elaboração ficam fora dos totais; prestação posterior à data de elaboração
 * é vincenda (valor nominal, sem encargos, mesmo com termos próprios).
 */
function decidirSituacao(
  lancamento: Lancamento,
  calculo: Calculo,
  valor: ValorResolvido,
  avisos: string[],
): SituacaoLancamento {
  if (valor.semValor) return "ignorado";
  if (valor.valorBase.lte(ZERO)) {
    avisos.push(
      lancamento.tipo === "prestacao"
        ? `Valor da prestação zero ou negativo (${formatarMoeda(valor.valorBase)}): não computada nos totais.`
        : `Valor do pagamento zero ou negativo (${formatarMoeda(valor.valorBase)}): não computado nos totais; informe pagamentos como valores positivos.`,
    );
    return "ignorado";
  }
  if (lancamento.data <= calculo.dataElaboracao) return "atualizado";
  const datas = `${formatarData(lancamento.data)}, posterior à data de elaboração (${formatarData(calculo.dataElaboracao)})`;
  if (lancamento.tipo === "amortizacao") {
    avisos.push(`Pagamento de ${datas}: não computado nos totais.`);
    return "ignorado";
  }
  avisos.push(
    `Prestação com vencimento em ${datas}: vincenda, incluída pelo valor nominal, sem correção e sem juros.`,
  );
  if (temTermosProprios(lancamento)) {
    avisos.push("Os termos próprios informados não se aplicam à prestação vincenda.");
  }
  return "vincenda";
}

/**
 * Atualiza um lançamento (prestação ou amortização) da sua data até a data de elaboração,
 * ou pelos termos próprios e metodologia própria quando informados (§6.4 e §6.5). O fator e o
 * percentual multiplicam com precisão integral e só são arredondados para exibição (convenção
 * do SAJ); os juros incidem sobre o corrigido sem arredondar; corrigido e juros têm 2 casas.
 * Prestações posteriores à data de elaboração saem como vincendas, pelo valor nominal;
 * lançamentos sem valor utilizável, com valor zero ou negativo, e pagamentos posteriores saem como
 * ignorados. Vincendas e ignorados não têm correção nem juros (§6.7).
 */
export function atualizarLancamento(
  lancamento: Lancamento,
  calculo: Calculo,
  indices: TabelaIndices,
): LancamentoCalculado {
  return atualizarComRastro(lancamento, calculo, indices).lancamento;
}

/**
 * Faz o trabalho de `atualizarLancamento` e devolve também o que `calcular` resume no Resultado:
 * as competências cuja taxa legal faltou, os índices que a base consumiu e os meses que faltaram
 * para a base.
 */
function atualizarComRastro(
  lancamento: Lancamento,
  calculo: Calculo,
  indices: TabelaIndices,
): Rastro {
  const metodologia = lancamento.encargos?.metodologia ?? calculo.metodologia;
  const { fatorCasas, percentualCasas, valorCasas } = metodologia.arredondamento;
  const avisos: string[] = [];
  if (lancamento.encargos?.metodologia !== undefined) {
    avisos.push(...validarMetodologia(lancamento.encargos.metodologia));
  }
  const rastroDaBase: RastroDaBase = { indicesDaBase: [], mesesSemIndiceNaBase: [] };
  const valor = resolverValor(lancamento, calculo, indices, valorCasas, avisos, rastroDaBase);
  const situacao = decidirSituacao(lancamento, calculo, valor, avisos);
  const comum = {
    id: lancamento.id,
    tipo: lancamento.tipo,
    data: lancamento.data,
    competencia: lancamento.competencia,
    descricao: lancamento.descricao,
    valorBase: paraTexto(valor.valorBase, valorCasas),
    memoriaBase: valor.memoriaBase,
    editado: valor.editado,
    situacao,
    ...(rastroDaBase.reajustesDaBase === undefined
      ? {}
      : { reajustes: rastroDaBase.reajustesDaBase }),
    ...(rastroDaBase.salarioMinimoAnteriorDaBase === undefined
      ? {}
      : { salarioMinimoAnterior: rastroDaBase.salarioMinimoAnteriorDaBase }),
  };

  // Vincenda e ignorado entram pelo valor nominal: sem correção e sem juros (§6.7).
  if (situacao !== "atualizado") {
    return {
      lancamento: {
        ...comum,
        correcao: { fator: paraTexto(UM, fatorCasas), indices: [], pisoAplicado: false },
        corrigido: paraTexto(valor.valorBase, valorCasas),
        juros: { percentual: paraTexto(ZERO, percentualCasas), detalhe: [] },
        jurosValor: paraTexto(ZERO, valorCasas),
        atualizado: paraTexto(valor.valorBase, valorCasas),
        avisos,
      },
      mesesSemTaxaLegal: [],
      ...rastroDaBase,
    };
  }

  const termoInicialCorrecao = lancamento.encargos?.termoInicialCorrecao ?? lancamento.data;
  const termoFinalCorrecao = limitarTermoFinal(
    lancamento.encargos?.termoFinalCorrecao,
    calculo.dataElaboracao,
    "da correção",
    avisos,
  );
  const termoInicialJuros = lancamento.encargos?.termoInicialJuros ?? lancamento.data;
  const termoFinalJuros = limitarTermoFinal(
    lancamento.encargos?.termoFinalJuros,
    calculo.dataElaboracao,
    "dos juros",
    avisos,
  );

  const correcao = fatorCorrecao({
    termoInicial: termoInicialCorrecao,
    termoFinal: termoFinalCorrecao,
    indices: resolverIndicesMensais(
      metodologia,
      indices,
      competenciaDe(termoInicialCorrecao),
      competenciaDe(termoFinalCorrecao),
    ),
    incidenciaMesInicial: metodologia.incidenciaMesInicial,
    deflacao: metodologia.deflacao,
  });
  // Mês sem índice: "ainda não divulgado" quando o calendário da tabela (`esperadoAte`) diz que o
  // mês ainda não saiu na data da consulta; "não disponível" nos demais casos (buraco de dados ou
  // tabela sem calendário, como nos casos de referência antigos).
  for (const competencia of correcao.mesesSemIndice) {
    const serie = correcao.indices.find((i) => i.competencia === competencia)?.serie ?? null;
    const nome = serie === null ? "Índice" : NOME_DA_SERIE[serie];
    const mes = formatarCompetencia(competencia);
    avisos.push(
      serie !== null && aindaNaoDivulgado(indices, serie, competencia)
        ? `${nome} de ${mes} ainda sem divulgação na data da consulta (previsão: ${divulgacaoPrevista(serie, competencia)}): o mês entrou sem correção (fator 1,000000).`
        : `${nome} de ${mes} não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).`,
    );
  }
  if (correcao.pisoAplicado) {
    avisos.push(
      "Índices negativos no período: o valor corrigido foi mantido igual ao valor original (fator 1,000000).",
    );
  }
  const corrigidoBruto = valor.valorBase.times(correcao.fator);
  const corrigido = arredondar(corrigidoBruto, valorCasas);

  const juros = jurosSimples({
    termoInicial: termoInicialJuros,
    termoFinal: termoFinalJuros,
    metodologia,
    indices,
    casas: percentualCasas,
  });
  avisos.push(...juros.avisos);
  // Juros sobre o corrigido sem arredondar, como o SAJ (decisão de 11/10/2026, ponto 9).
  const jurosValor = arredondar(corrigidoBruto.times(juros.percentual).div(CEM), valorCasas);
  const atualizado = corrigido.plus(jurosValor);

  return {
    lancamento: {
      ...comum,
      correcao: {
        fator: paraTexto(correcao.fator, fatorCasas),
        indices: correcao.indices,
        pisoAplicado: correcao.pisoAplicado,
      },
      corrigido: paraTexto(corrigido, valorCasas),
      juros: { percentual: paraTexto(juros.percentual, percentualCasas), detalhe: juros.detalhe },
      jurosValor: paraTexto(jurosValor, valorCasas),
      atualizado: paraTexto(atualizado, valorCasas),
      avisos,
    },
    mesesSemTaxaLegal: juros.mesesSemTaxaLegal,
    ...rastroDaBase,
  };
}

/**
 * Percentual de multa ou de honorários (§6.6) lido do texto do cálculo: texto inválido ("10,5",
 * vazio) ou negativo vale zero, com aviso, para que a entrada da tela nunca derrube o motor
 * (regra 4 do CLAUDE.md).
 */
function lerPercentualDoAcrescimo(
  texto: TextoDecimal,
  nome: "multa" | "honorários",
): { percentual: Decimal; aviso?: string } {
  const naoAplicado =
    nome === "multa" ? "a multa não foi aplicada" : "os honorários não foram aplicados";
  const valor = decimalOuNulo(texto);
  if (valor === null) {
    return {
      percentual: ZERO,
      aviso: `Percentual de ${nome} inválido ("${texto}"): ${naoAplicado}.`,
    };
  }
  if (valor.lt(ZERO)) {
    return {
      percentual: ZERO,
      aviso: `Percentual de ${nome} negativo ("${texto}"): ${naoAplicado}.`,
    };
  }
  return { percentual: valor };
}

/** Lista "prestação de jan/2017, pagamento de 10/02/2017" na ordem dos lançamentos. */
function listar(lancamentos: Lancamento[]): string {
  return lancamentos.map(rotulo).join(", ");
}

/** Calcula o Resultado completo de um Cálculo com uma tabela de índices congelada (§4.3). */
export function calcular(calculo: Calculo, indices: TabelaIndices): Resultado {
  const rastros = calculo.lancamentos.map((l) => atualizarComRastro(l, calculo, indices));
  const lancamentos = rastros.map((r) => r.lancamento);
  const valorCasas = calculo.metodologia.arredondamento.valorCasas;

  // Totais: só os lançamentos computados (vincendas entram pelo valor nominal; ignorados não entram).
  const somar = (tipo: Lancamento["tipo"]): Decimal =>
    lancamentos
      .filter((l) => l.tipo === tipo && l.situacao !== "ignorado")
      .reduce((soma, l) => soma.plus(decimal(l.atualizado)), ZERO);
  const prestacoes = somar("prestacao");
  const amortizacoes = somar("amortizacao");
  const totalDevido = prestacoes.minus(amortizacoes);
  // Multa e honorários do art. 523, §1º, do CPC (§6.6): cada percentual sobre o total devido,
  // separadamente (os honorários não incidem sobre a multa); nada quando não há valor devido.
  const multaLida = lerPercentualDoAcrescimo(calculo.acrescimos.multaPercentual, "multa");
  const honorariosLidos = lerPercentualDoAcrescimo(
    calculo.acrescimos.honorariosPercentual,
    "honorários",
  );
  const percentualMulta = multaLida.percentual;
  const percentualHonorarios = honorariosLidos.percentual;
  const haValorDevido = totalDevido.gt(ZERO);
  const multa = haValorDevido
    ? arredondar(totalDevido.times(percentualMulta).div(CEM), valorCasas)
    : ZERO;
  const honorarios = haValorDevido
    ? arredondar(totalDevido.times(percentualHonorarios).div(CEM), valorCasas)
    : ZERO;
  const totalGeral = totalDevido.plus(multa).plus(honorarios);
  const totais: Totais = {
    prestacoes: paraTexto(prestacoes, valorCasas),
    amortizacoes: paraTexto(amortizacoes, valorCasas),
    totalDevido: paraTexto(totalDevido, valorCasas),
    multa: paraTexto(multa, valorCasas),
    honorarios: paraTexto(honorarios, valorCasas),
    totalGeral: paraTexto(totalGeral, valorCasas),
  };

  const avisos: string[] = [...validarMetodologia(calculo.metodologia)];
  if (lancamentos.length === 0) {
    avisos.push("Nenhum lançamento.");
  } else if (!haValorDevido && amortizacoes.gt(ZERO)) {
    // só com pagamento lançado: sem ele, o total zerado vem de prestações sem valor, que têm
    // aviso próprio (decisão de 13/10/2026)
    avisos.push(
      `As amortizações atualizadas (${formatarMoeda(amortizacoes)}) igualam ou superam as prestações atualizadas (${formatarMoeda(prestacoes)}): não há valor devido na data do cálculo.`,
    );
    if (!percentualMulta.isZero() || !percentualHonorarios.isZero()) {
      avisos.push("Multa e honorários não foram aplicados porque não há valor devido.");
    }
  }
  if (multaLida.aviso !== undefined) avisos.push(multaLida.aviso);
  if (honorariosLidos.aviso !== undefined) avisos.push(honorariosLidos.aviso);

  // Índices efetivamente usados (sem repetição) e resumo dos meses sem índice. Um mês de
  // fração zero não pesou no fator: não conta como índice usado nem como mês sem índice. A taxa
  // legal dos juros (série 29543) e os índices da base (salário mínimo, série 1619, e índice de
  // reajuste) também são índices usados; os meses deles que faltam têm resumos próprios. Cada mês
  // que faltou vai para um de dois grupos, cada um com o seu resumo: "ainda não divulgado" (posterior
  // ao último mês que a série deveria ter na data da consulta, pelo calendário em `esperadoAte`) ou
  // "sem índice na tabela" (buraco de dados, ou tabela sem calendário).
  const usados = new Map<string, IndiceUsado>();
  const registrar = (serie: CodigoSerie, competencia: Competencia): void => {
    const chave = `${serie}|${competencia}`;
    const registro = indices.series[serie]?.[competencia];
    if (!usados.has(chave) && registro) {
      usados.set(chave, {
        serie,
        competencia,
        valor: registro.valor,
        fonte: registro.fonte,
        obtidoEm: registro.obtidoEm,
      });
    }
  };
  type Faltas = Map<CodigoSerie, Set<Competencia>>;
  const naoDivulgado: Faltas = new Map();
  const semIndice: Faltas = new Map();
  const naoDivulgadoNaBase: Faltas = new Map();
  const semIndiceNaBase: Faltas = new Map();
  const anotar = (
    aindaNao: Faltas,
    faltante: Faltas,
    serie: CodigoSerie,
    competencia: Competencia,
  ): void => {
    const mapa = aindaNaoDivulgado(indices, serie, competencia) ? aindaNao : faltante;
    const meses = mapa.get(serie) ?? new Set<Competencia>();
    meses.add(competencia);
    mapa.set(serie, meses);
  };
  for (const r of rastros) {
    for (const i of r.lancamento.correcao.indices) {
      if (i.serie === null || i.fracao.startsWith("0/")) continue;
      if (i.valor === null) anotar(naoDivulgado, semIndice, i.serie, i.competencia);
      else registrar(i.serie, i.competencia);
    }
    for (const d of r.lancamento.juros.detalhe) {
      if (d.regime === "taxaLegal") registrar(CODIGO_DA_SERIE.taxaLegal, competenciaDe(d.de));
    }
    for (const i of r.indicesDaBase) registrar(i.serie, i.competencia);
    for (const m of r.mesesSemIndiceNaBase) {
      anotar(naoDivulgadoNaBase, semIndiceNaBase, m.serie, m.competencia);
    }
  }
  const indicesUsados = [...usados.values()].sort(
    (a, b) =>
      compararSeries(a.serie, b.serie) ||
      (a.competencia < b.competencia ? -1 : a.competencia > b.competencia ? 1 : 0),
  );
  const descreverFaltas = (mapa: Map<CodigoSerie, Set<Competencia>>): string =>
    [...mapa.entries()]
      .sort(([a], [b]) => compararSeries(a, b))
      .map(
        ([serie, meses]) =>
          `${NOME_DA_SERIE[serie]} de ${[...meses].sort().map(formatarCompetencia).join(", ")}`,
      )
      .join("; ");
  if (naoDivulgado.size > 0) {
    avisos.push(
      `Meses ainda sem divulgação na data da consulta (entraram sem correção): ${descreverFaltas(naoDivulgado)}.`,
    );
  }
  if (semIndice.size > 0) {
    avisos.push(
      `Meses sem índice na tabela (entraram sem correção): ${descreverFaltas(semIndice)}.`,
    );
  }
  const semTaxaLegal = [
    ...new Set<Competencia>(rastros.flatMap((r) => r.mesesSemTaxaLegal)),
  ].sort();
  const taxaLegalNaoDivulgada = semTaxaLegal.filter((c) =>
    aindaNaoDivulgado(indices, CODIGO_DA_SERIE.taxaLegal, c),
  );
  const taxaLegalFaltante = semTaxaLegal.filter(
    (c) => !aindaNaoDivulgado(indices, CODIGO_DA_SERIE.taxaLegal, c),
  );
  const listarMeses = (meses: Competencia[]): string => meses.map(formatarCompetencia).join(", ");
  if (taxaLegalNaoDivulgada.length > 0) {
    avisos.push(
      `Meses de taxa legal ainda sem divulgação (os dias desses meses ficaram sem juros): ${listarMeses(taxaLegalNaoDivulgada)}.`,
    );
  }
  if (taxaLegalFaltante.length > 0) {
    avisos.push(
      `Meses sem taxa legal na tabela (os dias desses meses ficaram sem juros): ${listarMeses(taxaLegalFaltante)}.`,
    );
  }
  if (naoDivulgadoNaBase.size > 0) {
    avisos.push(
      `Meses ainda sem divulgação para o valor-base das prestações (ver o aviso de cada uma): ${descreverFaltas(naoDivulgadoNaBase)}.`,
    );
  }
  if (semIndiceNaBase.size > 0) {
    avisos.push(
      `Meses sem índice na tabela para o valor-base das prestações (ver o aviso de cada uma): ${descreverFaltas(semIndiceNaBase)}.`,
    );
  }

  // Resumos dos lançamentos especiais (§5.4): vincendas, valores informados à mão e ignorados.
  const porSituacao = (situacao: SituacaoLancamento): Lancamento[] =>
    calculo.lancamentos.filter((_, i) => lancamentos[i]?.situacao === situacao);
  const vincendas = porSituacao("vincenda");
  if (vincendas.length > 0) {
    avisos.push(
      `Prestações vincendas, incluídas pelo valor nominal, sem correção e sem juros: ${vincendas.map(rotuloDaCompetencia).join(", ")}.`,
    );
  }
  const informadas = calculo.lancamentos.filter((_, i) => lancamentos[i]?.editado === true);
  if (informadas.length > 0) {
    avisos.push(
      `Prestações com valor informado à mão, não apurado pela base dos alimentos: ${informadas.map(rotuloDaCompetencia).join(", ")}.`,
    );
  }
  const ignorados = porSituacao("ignorado");
  if (ignorados.length > 0) {
    avisos.push(`Lançamentos não computados nos totais: ${listar(ignorados)}.`);
  }

  const series = (Object.keys(indices.series) as CodigoSerie[]).sort(compararSeries);
  const ultimoMesPorSerie: Partial<Record<CodigoSerie, Competencia>> = {};
  for (const serie of series) {
    const ultimo = Object.keys(indices.series[serie] ?? {})
      .sort()
      .at(-1);
    if (ultimo !== undefined) ultimoMesPorSerie[serie] = ultimo;
  }

  return {
    lancamentos,
    totais,
    indicesUsados,
    consultaIndices: { em: indices.consultadoEm, series, ultimoMesPorSerie },
    avisos,
  };
}
