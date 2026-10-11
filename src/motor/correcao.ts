import {
  competenciaDe,
  competenciasEntre,
  decompor,
  decomporCompetencia,
  diasDoMes,
  primeiroDiaDoMes,
} from "../compartilhado/datas.ts";
import { arredondar, CEM, decimal, UM, ZERO, type Decimal } from "../compartilhado/decimal.ts";
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
  /** nula quando o período vigente não tem correção ("nenhum") */
  serie: CodigoSerie | null;
  /** nulo quando a tabela não tem o mês (ainda não divulgado ou faltante) */
  valor: TextoDecimal | null;
}

/**
 * Para cada mês de `de` a `ate`, qual série e valor se aplicam: a série vem do período da
 * metodologia vigente no dia 1 do mês (§6.4, itens 4 e 8); o valor vem da tabela congelada.
 */
export function resolverIndicesMensais(
  metodologia: Metodologia,
  tabela: TabelaIndices,
  de: Competencia,
  ate: Competencia,
): IndiceMensal[] {
  return competenciasEntre(de, ate).map((competencia) => {
    const indice =
      periodoVigenteEm(metodologia, primeiroDiaDoMes(competencia))?.correcao.indice ?? "nenhum";
    if (indice === "nenhum") return { competencia, serie: null, valor: null };
    const serie = CODIGO_DA_SERIE[indice];
    return { competencia, serie, valor: tabela.series[serie]?.[competencia]?.valor ?? null };
  });
}

export interface ParametrosCorrecao {
  termoInicial: DataISO;
  termoFinal: DataISO;
  /** um item por mês, do mês do termo inicial ao mês do termo final */
  indices: IndiceMensal[];
  incidenciaMesInicial: Metodologia["incidenciaMesInicial"];
  deflacao: Metodologia["deflacao"];
  /** casas decimais do fator (6 na metodologia padrão) */
  casas: number;
}

export interface ResultadoCorrecao {
  /** já arredondado a `casas`; elevado a 1 quando o piso atua */
  fator: Decimal;
  indices: IndiceAplicado[];
  pisoAplicado: boolean;
  /** competências com série definida mas sem valor na tabela */
  mesesSemIndice: Competencia[];
}

/**
 * Fator de correção (§6.4): pro rata geométrico no mês do termo inicial, meses inteiros,
 * pro rata no mês do termo final quando o índice dele existe, meses sem índice com fator 1,
 * deflação conforme a opção. Fator 1 quando o termo final é anterior ao inicial.
 */
export function fatorCorrecao(p: ParametrosCorrecao): ResultadoCorrecao {
  const indices: IndiceAplicado[] = [];
  const mesesSemIndice: Competencia[] = [];
  if (p.termoFinal < p.termoInicial) {
    return { fator: arredondar(UM, p.casas), indices, pisoAplicado: false, mesesSemIndice };
  }
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

    // Quantos "dias do mês" entram na conta: a fração do mês é numerador ÷ dias.
    let numerador: number;
    if (ehInicial && p.incidenciaMesInicial === "mesSeguinte") numerador = 0;
    else if (ehInicial && ehFinal) numerador = fim.dia - inicio.dia;
    else if (ehInicial) numerador = dias - inicio.dia;
    else if (ehFinal) numerador = fim.dia;
    else numerador = dias;

    indices.push({
      serie: mes.serie,
      competencia: mes.competencia,
      valor: mes.valor,
      fracao: numerador === dias ? "1" : `${numerador}/${dias}`,
    });
    if (mes.serie !== null && mes.valor === null) mesesSemIndice.push(mes.competencia);
    if (mes.valor === null || numerador === 0) continue;

    let variacao = decimal(mes.valor);
    if (p.deflacao === "zerarNegativos" && variacao.isNegative()) variacao = ZERO;
    const fatorDoMes = UM.plus(variacao.div(CEM));
    fator = fator.times(
      numerador === dias ? fatorDoMes : fatorDoMes.pow(decimal(String(numerador)).div(dias)),
    );
  }

  let fatorArredondado = arredondar(fator, p.casas);
  let pisoAplicado = false;
  if (p.deflacao === "aplicarComPiso" && fatorArredondado.lt(UM)) {
    fatorArredondado = arredondar(UM, p.casas);
    pisoAplicado = true;
  }
  return { fator: fatorArredondado, indices, pisoAplicado, mesesSemIndice };
}
