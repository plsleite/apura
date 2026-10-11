import type { Competencia, TabelaIndices, ValorIndice } from "../../compartilhado/tipos.ts";

/** IGP-M (série 189 do BCB), variação % mensal, jan/2017 a mai/2018 (Anexo A do design). */
export const IGPM_2017_2018: Record<Competencia, string> = {
  "2017-01": "0.64",
  "2017-02": "0.08",
  "2017-03": "0.01",
  "2017-04": "-1.10",
  "2017-05": "-0.93",
  "2017-06": "-0.67",
  "2017-07": "-0.72",
  "2017-08": "0.10",
  "2017-09": "0.47",
  "2017-10": "0.20",
  "2017-11": "0.52",
  "2017-12": "0.89",
  "2018-01": "0.76",
  "2018-02": "0.07",
  "2018-03": "0.64",
  "2018-04": "0.57",
  "2018-05": "1.38",
};

/**
 * Tabela congelada como estava em 25/05/2018 (até abr/2018, por padrão; maio ainda não
 * divulgado). `ateCompetencia` muda o último mês; `excluir` remove meses para simular lacunas.
 */
export function tabelaIgpm(
  ateCompetencia: Competencia = "2018-04",
  excluir: Competencia[] = [],
): TabelaIndices {
  const valores: Record<Competencia, ValorIndice> = {};
  for (const [competencia, valor] of Object.entries(IGPM_2017_2018)) {
    if (competencia <= ateCompetencia && !excluir.includes(competencia)) {
      valores[competencia] = { valor, fonte: "embutida", obtidoEm: "2026-10-10T00:00:00.000Z" };
    }
  }
  return { consultadoEm: "2018-05-25T00:00:00.000Z", series: { "189": valores } };
}
