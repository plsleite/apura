import type {
  ArquivoSerie,
  CodigoSerie,
  Competencia,
  TabelaIndices,
  ValorIndice,
} from "../compartilhado/tipos.ts";
import igpm from "../../dados/indices/189.json";

/** Séries com cópia embutida; as demais entram quando o script as baixar (fases 2 e 3). */
const ARQUIVOS: Partial<Record<CodigoSerie, ArquivoSerie>> = {
  "189": igpm as ArquivoSerie,
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
