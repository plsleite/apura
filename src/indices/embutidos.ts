import type {
  ArquivoSerie,
  CodigoSerie,
  Competencia,
  TabelaIndices,
  ValorIndice,
} from "../compartilhado/tipos.ts";
import ipca from "../../dados/indices/433.json" with { type: "json" };
import igpm from "../../dados/indices/189.json" with { type: "json" };
import taxaLegal from "../../dados/indices/29543.json" with { type: "json" };
import selic from "../../dados/indices/4390.json" with { type: "json" };

/** Séries com cópia embutida; INPC (188) e salário mínimo (1619) entram na fase 3. */
const ARQUIVOS: Partial<Record<CodigoSerie, ArquivoSerie>> = {
  "433": ipca as ArquivoSerie,
  "189": igpm as ArquivoSerie,
  "29543": taxaLegal as ArquivoSerie,
  "4390": selic as ArquivoSerie,
};

/**
 * Tabela de índices montada só com a cópia embutida (sem rede). `consultadoEm` é a data de
 * obtenção mais recente entre os arquivos. A fase 4 parte daqui para cache e busca ao vivo.
 */
export function tabelaEmbutida(): TabelaIndices {
  const series: TabelaIndices["series"] = {};
  let consultadoEm = "";
  for (const arquivo of Object.values(ARQUIVOS)) {
    if (!arquivo) continue;
    const valores: Record<Competencia, ValorIndice> = {};
    for (const { competencia, valor } of arquivo.valores) {
      valores[competencia] = { valor, fonte: "embutida", obtidoEm: arquivo.obtidoEm };
    }
    series[arquivo.codigo] = valores;
    if (arquivo.obtidoEm > consultadoEm) consultadoEm = arquivo.obtidoEm;
  }
  return { consultadoEm, series };
}
