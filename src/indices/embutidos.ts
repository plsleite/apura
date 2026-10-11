import type {
  ArquivoSerie,
  CodigoSerie,
  Competencia,
  TabelaIndices,
  ValorIndice,
} from "../compartilhado/tipos.ts";
import inpc from "../../dados/indices/188.json" with { type: "json" };
import igpm from "../../dados/indices/189.json" with { type: "json" };
import ipca from "../../dados/indices/433.json" with { type: "json" };
import salarioMinimo from "../../dados/indices/1619.json" with { type: "json" };
import taxaLegal from "../../dados/indices/29543.json" with { type: "json" };
import selic from "../../dados/indices/4390.json" with { type: "json" };

/**
 * Confere o formato e o código de um arquivo de série antes de usá-lo: os JSON são importados sem
 * checagem de tipo, e um arquivo trocado ou de formato antigo deve falhar aqui, não no cálculo.
 */
export function lerArquivoSerie(dado: unknown, codigo: CodigoSerie): ArquivoSerie {
  const arquivo = dado as Partial<ArquivoSerie> | null;
  if (
    typeof arquivo !== "object" ||
    arquivo === null ||
    arquivo.formato !== "apura/serie@1" ||
    arquivo.codigo !== codigo ||
    typeof arquivo.obtidoEm !== "string" ||
    !Array.isArray(arquivo.valores)
  ) {
    throw new Error(`Arquivo da série ${codigo} em formato inesperado.`);
  }
  return arquivo as ArquivoSerie;
}

/** As seis séries do catálogo (§8.1), com cópia embutida gerada por `scripts/atualizar-indices.ts`. */
const ARQUIVOS: Record<CodigoSerie, ArquivoSerie> = {
  "188": lerArquivoSerie(inpc, "188"),
  "189": lerArquivoSerie(igpm, "189"),
  "433": lerArquivoSerie(ipca, "433"),
  "1619": lerArquivoSerie(salarioMinimo, "1619"),
  "29543": lerArquivoSerie(taxaLegal, "29543"),
  "4390": lerArquivoSerie(selic, "4390"),
};

/**
 * Tabela de índices montada só com a cópia embutida (sem rede). `consultadoEm` é a data de
 * obtenção mais recente entre os arquivos. A fase 4 parte daqui para cache e busca ao vivo.
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
    if (arquivo.obtidoEm > consultadoEm) consultadoEm = arquivo.obtidoEm;
  }
  return { consultadoEm, series };
}
