import { ratearPorMesCalendario } from "../compartilhado/datas.ts";
import { arredondar, decimal, paraTexto, ZERO, type Decimal } from "../compartilhado/decimal.ts";
import { formatarData } from "../compartilhado/formatacao.ts";
import type { DataISO, DetalheJuros, Metodologia } from "../compartilhado/tipos.ts";
import { dividirPorPeriodos } from "./periodos.ts";

export interface ParametrosJuros {
  termoInicial: DataISO;
  termoFinal: DataISO;
  metodologia: Metodologia;
  /** casas decimais do percentual (6 na metodologia padrão) */
  casas: number;
}

export interface ResultadoJuros {
  /** percentual total, já arredondado a `casas` */
  percentual: Decimal;
  detalhe: DetalheJuros[];
  avisos: string[];
}

/**
 * Juros simples do termo inicial ao termo final (§6.4). Regime antigo (`percentualMensal`):
 * em cada mês tocado, taxa × dias ÷ diasDoMes, contando o dia inicial e o dia final, como o
 * SAJ. Cada período da metodologia aplica a própria taxa aos dias que lhe cabem.
 * Regras `taxaLegal` e `selicUnica` são da fase 2: aqui geram aviso e não somam.
 */
export function jurosSimples(p: ParametrosJuros): ResultadoJuros {
  const detalhe: DetalheJuros[] = [];
  const avisos: string[] = [];
  if (p.termoFinal < p.termoInicial)
    return { percentual: arredondar(ZERO, p.casas), detalhe, avisos };

  let percentual = ZERO;
  for (const trecho of dividirPorPeriodos(p.metodologia, p.termoInicial, p.termoFinal)) {
    const regra = trecho.periodo.juros;
    if (regra.tipo !== "percentualMensal") {
      avisos.push(
        `Juros pela regra "${regra.tipo}" ainda não implementados: o período de ${formatarData(trecho.de)} a ${formatarData(trecho.ate)} ficou sem juros.`,
      );
      continue;
    }
    const taxa = decimal(regra.taxaMensal);
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
  }
  return { percentual: arredondar(percentual, p.casas), detalhe, avisos };
}
