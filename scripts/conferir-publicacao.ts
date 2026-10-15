// Confere se o site publicado tem a cópia dos índices da main (§19.4 do design): lê o versao.json
// do site e compara a data dos índices com a da pasta dados/indices/. É o primeiro passo de cada
// rodada da rotina (.github/workflows/atualizar-indices.yml, que passa o endereço em SITE_URL);
// também serve à mão:
//   SITE_URL=https://apura-dpems.pages.dev npm run indices:conferir-publicacao
// Saída: uma frase na saída padrão. Código 0 com o site em dia (ou com a publicação de um commit
// recente em andamento); 1 com o site atrasado, adiantado, fora do ar ou com o arquivo ilegível.
// A conferência (rede injetável, tentativas, frases) está em src/indices/publicacao.ts, testada
// sem rede; aqui ficam só o disco, a variável de ambiente e o console.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { lerArquivoSerie } from "../src/indices/arquivo-serie.ts";
import { SERIES_EM_ORDEM_NUMERICA } from "../src/indices/calendario.ts";
import { conferirSitePublicado, montarVersaoDoSite } from "../src/indices/publicacao.ts";
import { agoraEmBrasilia } from "../src/indices/relogio.ts";

const RAIZ = join(import.meta.dirname, "..");

/** O que o site deveria ter: a versão do package.json e a data dos índices de dados/indices/. */
function versaoDaMain() {
  const pacote = JSON.parse(readFileSync(join(RAIZ, "package.json"), "utf8")) as {
    version: string;
  };
  const arquivos = SERIES_EM_ORDEM_NUMERICA.map((codigo) =>
    lerArquivoSerie(
      JSON.parse(readFileSync(join(RAIZ, "dados", "indices", `${codigo}.json`), "utf8")),
      codigo,
    ),
  );
  return montarVersaoDoSite(pacote.version, arquivos);
}

async function main(): Promise<number> {
  const endereco = process.env.SITE_URL ?? "";
  // https sempre; http só na própria máquina (para conferir um site montado localmente)
  if (!/^(https:\/\/\S+|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?)$/.test(endereco)) {
    console.error(
      "Informe o endereço do site em SITE_URL, com https:// (por exemplo, SITE_URL=https://apura-dpems.pages.dev).",
    );
    return 1;
  }
  const conferencia = await conferirSitePublicado(endereco, versaoDaMain(), agoraEmBrasilia());
  console.log(conferencia.mensagem);
  return conferencia.ok ? 0 : 1;
}

main().then(
  (codigo) => {
    process.exitCode = codigo;
  },
  (erro: unknown) => {
    console.error(erro instanceof Error ? erro.message : String(erro));
    process.exitCode = 1;
  },
);
