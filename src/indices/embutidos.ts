import { compararInstantes } from "./relogio.ts";
import type {
  ArquivoSerie,
  CodigoSerie,
  Competencia,
  TabelaIndices,
  ValorIndice,
} from "../compartilhado/tipos.ts";
import { lerArquivoSerie } from "./arquivo-serie.ts";
import inpc from "../../dados/indices/188.json" with { type: "json" };
import igpm from "../../dados/indices/189.json" with { type: "json" };
import ipca from "../../dados/indices/433.json" with { type: "json" };
import salarioMinimo from "../../dados/indices/1619.json" with { type: "json" };
import taxaLegal from "../../dados/indices/29543.json" with { type: "json" };
import selic from "../../dados/indices/4390.json" with { type: "json" };

/** As seis séries do catálogo (§8.1), com cópia embutida gerada por `scripts/atualizar-indices.ts`. */
const ARQUIVOS: Record<CodigoSerie, ArquivoSerie> = {
  "188": lerArquivoSerie(inpc, "188"),
  "189": lerArquivoSerie(igpm, "189"),
  "433": lerArquivoSerie(ipca, "433"),
  "1619": lerArquivoSerie(salarioMinimo, "1619"),
  "29543": lerArquivoSerie(taxaLegal, "29543"),
  "4390": lerArquivoSerie(selic, "4390"),
};

/** Os seis arquivos embutidos, já conferidos, por código (cópia rasa: quem recebe pode trocar séries sem afetar as demais chamadas). */
export function seriesEmbutidas(): Record<CodigoSerie, ArquivoSerie> {
  return { ...ARQUIVOS };
}

/**
 * Tabela de índices montada só com a cópia embutida, sem o calendário (`esperadoAte`). `consultadoEm`
 * é a data de obtenção mais recente entre os arquivos (comparada pelo instante). O app usa
 * `congelarIndices` (`src/indices/congelar.ts`), que acrescenta o calendário.
 */
export function tabelaEmbutida(): TabelaIndices {
  const series: TabelaIndices["series"] = {};
  let consultadoEm = "";
  for (const arquivo of Object.values(ARQUIVOS)) {
    const valores: Record<Competencia, ValorIndice> = {};
    for (const { competencia, valor } of arquivo.valores) {
      valores[competencia] = { valor, fonte: "embutida", obtidoEm: arquivo.obtidoEm };
    }
    series[arquivo.codigo] = valores;
    if (consultadoEm === "" || compararInstantes(arquivo.obtidoEm, consultadoEm) > 0) {
      consultadoEm = arquivo.obtidoEm;
    }
  }
  return { consultadoEm, series };
}
