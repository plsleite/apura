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

/** Salário mínimo (série 1619 do BCB), R$ por mês, jan/2017 a fev/2018: R$ 937,00 em 2017 e R$ 954,00 em 2018. */
export const SALARIO_MINIMO_2017_2018: Record<Competencia, string> = {
  "2017-01": "937.00",
  "2017-02": "937.00",
  "2017-03": "937.00",
  "2017-04": "937.00",
  "2017-05": "937.00",
  "2017-06": "937.00",
  "2017-07": "937.00",
  "2017-08": "937.00",
  "2017-09": "937.00",
  "2017-10": "937.00",
  "2017-11": "937.00",
  "2017-12": "937.00",
  "2018-01": "954.00",
  "2018-02": "954.00",
};

/**
 * Tabela congelada como estava em 25/05/2018 (até abr/2018, por padrão; maio ainda não
 * divulgado). `ateCompetencia` muda o último mês; `excluir` remove meses para simular lacunas;
 * `comSalarioMinimo` acrescenta a série 1619 de jan/2017 a fev/2018.
 */
export function tabelaIgpm(
  ateCompetencia: Competencia = "2018-04",
  excluir: Competencia[] = [],
  comSalarioMinimo = false,
): TabelaIndices {
  const valores: Record<Competencia, ValorIndice> = {};
  for (const [competencia, valor] of Object.entries(IGPM_2017_2018)) {
    if (competencia <= ateCompetencia && !excluir.includes(competencia)) {
      valores[competencia] = { valor, fonte: "embutida", obtidoEm: "2026-10-10T00:00:00.000Z" };
    }
  }
  const series: TabelaIndices["series"] = { "189": valores };
  if (comSalarioMinimo) {
    const salarios: Record<Competencia, ValorIndice> = {};
    for (const [competencia, valor] of Object.entries(SALARIO_MINIMO_2017_2018)) {
      salarios[competencia] = { valor, fonte: "embutida", obtidoEm: "2026-10-10T00:00:00.000Z" };
    }
    series["1619"] = salarios;
  }
  return { consultadoEm: "2018-05-25T00:00:00.000Z", series };
}
