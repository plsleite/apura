import { decimal } from "../compartilhado/decimal.ts";
import { CODIGO_DA_SERIE, NOME_DA_SERIE } from "../compartilhado/tipos.ts";
import type { CodigoSerie, Competencia, Resultado } from "../compartilhado/tipos.ts";
import { numero } from "./tabelas.ts";
import { comSinalDeMenos } from "./texto.ts";

/**
 * Matriz "série · ano × meses" dos índices aplicados (§18.3, item 7): os valores de
 * `resultado.indicesUsados`, como o BCB publica (salário mínimo em reais); "·" só no mês que o
 * cálculo precisou e que não tinha índice na data da consulta; vazio nos meses fora do uso.
 * Módulo puro.
 */

export interface MatrizDeSerie {
  serie: CodigoSerie;
  nome: string;
  anos: Array<{ ano: number; meses: string[] }>;
}

const CORRECAO: readonly CodigoSerie[] = ["189", "188", "433"];
const DEPOIS: readonly CodigoSerie[] = [
  CODIGO_DA_SERIE.taxaLegal,
  CODIGO_DA_SERIE.SELIC,
  CODIGO_DA_SERIE.SM,
];

function formatar(serie: CodigoSerie, valor: string): string {
  if (serie === CODIGO_DA_SERIE.SM) return numero(decimal(valor));
  return comSinalDeMenos(valor.replace(".", ","));
}

export function matrizesDeIndices(resultado: Resultado): MatrizDeSerie[] {
  const valores = new Map<CodigoSerie, Map<Competencia, string>>();
  for (const i of resultado.indicesUsados) {
    const mapa = valores.get(i.serie) ?? new Map<Competencia, string>();
    mapa.set(i.competencia, formatar(i.serie, i.valor));
    valores.set(i.serie, mapa);
  }
  for (const l of resultado.lancamentos) {
    for (const i of l.correcao.indices) {
      if (i.serie === null || i.valor !== null || i.fracao.startsWith("0/")) continue;
      const mapa = valores.get(i.serie) ?? new Map<Competencia, string>();
      if (!mapa.has(i.competencia)) mapa.set(i.competencia, "·");
      valores.set(i.serie, mapa);
    }
  }
  const primeiroMes = (s: CodigoSerie) => [...(valores.get(s)?.keys() ?? [])].sort()[0] ?? "";
  const ordem = [
    ...CORRECAO.filter((s) => valores.has(s)).sort((a, b) =>
      primeiroMes(a) < primeiroMes(b) ? -1 : primeiroMes(a) > primeiroMes(b) ? 1 : 0,
    ),
    ...DEPOIS.filter((s) => valores.has(s)),
  ];
  return ordem.map((serie) => {
    const mapa = valores.get(serie) ?? new Map<Competencia, string>();
    const meses = [...mapa.keys()].sort();
    const de = Number(meses[0]?.slice(0, 4));
    const ate = Number(meses.at(-1)?.slice(0, 4));
    const anos: MatrizDeSerie["anos"] = [];
    for (let ano = de; ano <= ate; ano++) {
      anos.push({
        ano,
        meses: Array.from(
          { length: 12 },
          (_, m) => mapa.get(`${ano}-${String(m + 1).padStart(2, "0")}`) ?? "",
        ),
      });
    }
    return { serie, nome: NOME_DA_SERIE[serie], anos };
  });
}
