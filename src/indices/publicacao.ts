import type { ArquivoSerie } from "../compartilhado/tipos.ts";
import { compararInstantes } from "./relogio.ts";

/**
 * O arquivo `versao.json` do site publicado (§19.2): a versão do Apura e a data de obtenção mais
 * recente da cópia dos índices (a mesma que o rodapé da tela mostra). A montagem do site o grava
 * (`vite.config.ts`), e a rotina de índices o lê para conferir que o site tem a cópia da `main`.
 * Módulo puro.
 */
export interface VersaoDoSite {
  formato: "apura/versao-do-site@1";
  /** a do package.json */
  versao: string;
  /** data-hora ISO da obtenção mais recente entre as séries, comparada pelo instante */
  indicesAtualizadosEm: string;
}

export function montarVersaoDoSite(
  versao: string,
  arquivos: readonly ArquivoSerie[],
): VersaoDoSite {
  let indicesAtualizadosEm = "";
  for (const { obtidoEm } of arquivos) {
    if (indicesAtualizadosEm === "" || compararInstantes(obtidoEm, indicesAtualizadosEm) > 0) {
      indicesAtualizadosEm = obtidoEm;
    }
  }
  return { formato: "apura/versao-do-site@1", versao, indicesAtualizadosEm };
}
