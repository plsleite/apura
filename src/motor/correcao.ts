import {
  competenciaDe,
  competenciasEntre,
  decompor,
  decomporCompetencia,
  diasDoMes,
  primeiroDiaDoMes,
} from "../compartilhado/datas.ts";
import { CEM, decimal, UM, ZERO, type Decimal } from "../compartilhado/decimal.ts";
import { CODIGO_DA_SERIE } from "../compartilhado/tipos.ts";
import type {
  CodigoSerie,
  Competencia,
  DataISO,
  IndiceAplicado,
  Metodologia,
  TabelaIndices,
  TextoDecimal,
} from "../compartilhado/tipos.ts";
import { periodoVigenteEm } from "./periodos.ts";

export interface IndiceMensal {
  competencia: Competencia;
  /** nula quando o período vigente não tem correção ("nenhum") ou nenhum período cobre o mês */
  serie: CodigoSerie | null;
  /** nulo quando a tabela não tem o mês (ainda não divulgado ou faltante) */
  valor: TextoDecimal | null;
  /** SELIC do mês da consulta: valor acumulado só até o último dia útil publicado (§6.4) */
  parcial?: boolean;
}

/**
 * Para cada mês de `de` a `ate`, qual série e valor se aplicam: a série vem do período da
 * metodologia vigente no dia 1 do mês (§6.4, itens 4 e 8); o valor vem da tabela congelada.
 * Num período de SELIC única a correção é a própria SELIC (série 4390), capitalizada mês a mês.
 */
export function resolverIndicesMensais(
  metodologia: Metodologia,
  tabela: TabelaIndices,
  de: Competencia,
  ate: Competencia,
): IndiceMensal[] {
  const mesDaConsulta = competenciaDe(tabela.consultadoEm);
  return competenciasEntre(de, ate).map((competencia) => {
    const periodo = periodoVigenteEm(metodologia, primeiroDiaDoMes(competencia));
    if (periodo === undefined) return { competencia, serie: null, valor: null };
    let serie: CodigoSerie | null;
    if (periodo.juros.tipo === "selicUnica") serie = CODIGO_DA_SERIE.SELIC;
    else if (periodo.correcao.indice === "nenhum") serie = null;
    else serie = CODIGO_DA_SERIE[periodo.correcao.indice];
    if (serie === null) return { competencia, serie: null, valor: null };
    const valor = tabela.series[serie]?.[competencia]?.valor ?? null;
    if (serie === CODIGO_DA_SERIE.SELIC && valor !== null && competencia === mesDaConsulta) {
      return { competencia, serie, valor, parcial: true };
    }
    return { competencia, serie, valor };
  });
}

export interface ParametrosCorrecao {
  termoInicial: DataISO;
  termoFinal: DataISO;
  /** um item por mês, do mês do termo inicial ao mês do termo final */
  indices: IndiceMensal[];
  incidenciaMesInicial: Metodologia["incidenciaMesInicial"];
  deflacao: Metodologia["deflacao"];
}

export interface ResultadoCorrecao {
  /** fator com precisão integral (arredonde só para exibir); igual a 1 quando o piso atua */
  fator: Decimal;
  indices: IndiceAplicado[];
  pisoAplicado: boolean;
  /** competências com série definida, sem valor na tabela e com fração maior que zero */
  mesesSemIndice: Competencia[];
}

/**
 * Fator de correção (§6.4): pro rata geométrico no mês do termo inicial, meses inteiros,
 * pro rata no mês do termo final quando o índice dele existe, meses sem índice com fator 1
 * (listados em `mesesSemIndice` só quando a fração deles é maior que zero), mês corrente parcial
 * da SELIC inteiro, deflação conforme a opção. Fator 1 quando o termo final é anterior ao inicial.
 */
export function fatorCorrecao(p: ParametrosCorrecao): ResultadoCorrecao {
  const indices: IndiceAplicado[] = [];
  const mesesSemIndice: Competencia[] = [];
  if (p.termoFinal < p.termoInicial)
    return { fator: UM, indices, pisoAplicado: false, mesesSemIndice };
  const inicio = decompor(p.termoInicial);
  const fim = decompor(p.termoFinal);
  const competenciaInicial = competenciaDe(p.termoInicial);
  const competenciaFinal = competenciaDe(p.termoFinal);
  let fator = UM;

  for (const mes of p.indices) {
    if (mes.competencia < competenciaInicial || mes.competencia > competenciaFinal) continue;
    const { ano, mes: numeroDoMes } = decomporCompetencia(mes.competencia);
    const dias = diasDoMes(ano, numeroDoMes);
    const ehInicial = mes.competencia === competenciaInicial;
    const ehFinal = mes.competencia === competenciaFinal;

    // Quantos "dias do mês" entram na conta: a fração do mês é numerador ÷ denominador.
    let numerador: number;
    if (ehInicial && p.incidenciaMesInicial === "mesSeguinte") numerador = 0;
    else if (ehInicial && ehFinal) numerador = fim.dia - inicio.dia;
    else if (ehInicial) numerador = dias - inicio.dia;
    else if (ehFinal) numerador = fim.dia;
    else numerador = dias;
    let denominador = dias;
    // O valor parcial do mês corrente da SELIC é "até a consulta": quando o lançamento cai nesse mês,
    // é rateado pelos dias do dia 1 ao termo final; quando o mês entra inteiro, entra inteiro. Com
    // lançamento no mês e termo final em outro mês, vale o pro rata normal do mês inicial.
    if (mes.parcial === true && numerador > 0) {
      if (ehInicial && ehFinal) {
        denominador = fim.dia;
        numerador = fim.dia - inicio.dia;
      } else if (!ehInicial) {
        numerador = dias;
      }
    }

    indices.push({
      serie: mes.serie,
      competencia: mes.competencia,
      valor: mes.valor,
      fracao: numerador === denominador ? "1" : `${numerador}/${denominador}`,
    });
    // Só avisa quando o mês entra na conta: com fração zero, a falta do índice não muda o fator.
    if (mes.serie !== null && mes.valor === null && numerador > 0) {
      mesesSemIndice.push(mes.competencia);
    }
    if (mes.valor === null || numerador === 0) continue;

    let variacao = decimal(mes.valor);
    if (p.deflacao === "zerarNegativos" && variacao.isNegative()) variacao = ZERO;
    const fatorDoMes = UM.plus(variacao.div(CEM));
    fator = fator.times(
      numerador === denominador
        ? fatorDoMes
        : fatorDoMes.pow(decimal(String(numerador)).div(denominador)),
    );
  }

  // Piso (§6.4, item 5; STJ, REsp 1.265.580/RS): o corrigido nunca fica abaixo do original.
  if (p.deflacao === "aplicarComPiso" && fator.lt(UM)) {
    return { fator: UM, indices, pisoAplicado: true, mesesSemIndice };
  }
  return { fator, indices, pisoAplicado: false, mesesSemIndice };
}
