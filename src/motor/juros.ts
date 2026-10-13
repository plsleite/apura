import { diaAnterior, ratearPorMesCalendario } from "../compartilhado/datas.ts";
import { decimal, decimalOuNulo, paraTexto, ZERO, type Decimal } from "../compartilhado/decimal.ts";
import { formatarCompetencia, formatarData } from "../compartilhado/formatacao.ts";
import { CODIGO_DA_SERIE } from "../compartilhado/tipos.ts";
import type {
  Competencia,
  DataISO,
  DetalheJuros,
  Metodologia,
  TabelaIndices,
} from "../compartilhado/tipos.ts";
import { aindaNaoDivulgado, divulgacaoPrevista } from "../compartilhado/divulgacao.ts";
import { dividirPorPeriodos } from "./periodos.ts";

export interface ParametrosJuros {
  termoInicial: DataISO;
  termoFinal: DataISO;
  metodologia: Metodologia;
  /** tabela congelada: a taxa legal (série 29543) vem daqui */
  indices: TabelaIndices;
  /** casas decimais do percentual exibido em cada linha do detalhe (6 na metodologia padrão) */
  casas: number;
}

export interface ResultadoJuros {
  /** percentual total com precisão integral (arredonde só para exibir) */
  percentual: Decimal;
  detalhe: DetalheJuros[];
  avisos: string[];
  /**
   * competências cuja taxa legal (série 29543) faltou na tabela num trecho com pelo menos um dia
   * (esses dias ficaram sem juros), em ordem cronológica e sem repetição; vazia quando não faltou
   */
  mesesSemTaxaLegal: Competencia[];
}

/**
 * Juros simples do termo inicial ao termo final (§6.4), somando os trechos de cada período da
 * metodologia:
 * - `percentualMensal` (regime antigo): em cada mês tocado, taxa × dias ÷ diasDoMes, contando o
 *   dia inicial e o dia final, como o SAJ;
 * - `taxaLegal` (regime novo, Lei 14.905/2024): taxa do mês (série 29543) × dias ÷ dias corridos
 *   do mês, contando o primeiro dia do trecho e não contando o dia do termo final, como a
 *   Calculadora do Cidadão do BCB (30/08/2024 a 31/08/2024 = 1 dia). Na transição, o trecho da
 *   taxa legal começa em 30/08/2024 e esse dia conta. Mês sem taxa na tabela fica sem juros, com
 *   aviso: "ainda não divulgada" quando o calendário da tabela (`esperadoAte`) diz que o mês ainda
 *   não saiu; "não disponível" nos demais casos;
 * - `selicUnica`: sem juros separados, porque a SELIC entra capitalizada na correção.
 */
export function jurosSimples(p: ParametrosJuros): ResultadoJuros {
  const detalhe: DetalheJuros[] = [];
  const avisos: string[] = [];
  const mesesSemTaxaLegal: Competencia[] = [];
  let percentual = ZERO;
  if (p.termoFinal < p.termoInicial) return { percentual, detalhe, avisos, mesesSemTaxaLegal };

  for (const trecho of dividirPorPeriodos(p.metodologia, p.termoInicial, p.termoFinal)) {
    const regra = trecho.periodo.juros;
    if (regra.tipo === "percentualMensal") {
      const taxa = decimalOuNulo(regra.taxaMensal);
      if (taxa === null) {
        avisos.push(
          `Taxa mensal de juros inválida ("${regra.taxaMensal}") no trecho de ${formatarData(trecho.de)} a ${formatarData(trecho.ate)}: esses dias ficaram sem juros.`,
        );
        continue;
      }
      for (const mes of ratearPorMesCalendario(trecho.de, trecho.ate)) {
        const parcela = taxa.times(mes.dias).div(mes.diasDoMes);
        percentual = percentual.plus(parcela);
        detalhe.push({
          regime: "percentualMensal",
          de: mes.de,
          ate: mes.ate,
          dias: mes.dias,
          diasDoMes: mes.diasDoMes,
          taxa: regra.taxaMensal,
          percentual: paraTexto(parcela, p.casas),
        });
      }
    } else if (regra.tipo === "taxaLegal") {
      const ultimoDia = trecho.ate === p.termoFinal ? diaAnterior(trecho.ate) : trecho.ate;
      for (const mes of ratearPorMesCalendario(trecho.de, ultimoDia)) {
        const taxa = p.indices.series[CODIGO_DA_SERIE.taxaLegal]?.[mes.competencia]?.valor;
        if (taxa === undefined) {
          if (!mesesSemTaxaLegal.includes(mes.competencia)) mesesSemTaxaLegal.push(mes.competencia);
          const dias = `os dias de ${formatarData(mes.de)} a ${formatarData(mes.ate)} ficaram sem juros`;
          avisos.push(
            aindaNaoDivulgado(p.indices, CODIGO_DA_SERIE.taxaLegal, mes.competencia)
              ? `Taxa legal de ${formatarCompetencia(mes.competencia)} ainda sem divulgação na data da consulta (previsão: ${divulgacaoPrevista(CODIGO_DA_SERIE.taxaLegal, mes.competencia)}): ${dias}.`
              : `Taxa legal de ${formatarCompetencia(mes.competencia)} não disponível na tabela de índices: ${dias}.`,
          );
          continue;
        }
        const parcela = decimal(taxa).times(mes.dias).div(mes.diasDoMes);
        percentual = percentual.plus(parcela);
        detalhe.push({
          regime: "taxaLegal",
          de: mes.de,
          ate: mes.ate,
          dias: mes.dias,
          diasDoMes: mes.diasDoMes,
          taxa,
          percentual: paraTexto(parcela, p.casas),
        });
      }
    }
  }
  return { percentual, detalhe, avisos, mesesSemTaxaLegal: mesesSemTaxaLegal.sort() };
}
