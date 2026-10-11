// Atualiza a cópia embutida das séries do BCB em dados/indices/.
//   npm run indices:atualizar             → todas as séries do catálogo
//   npm run indices:atualizar -- 189 433  → só as indicadas
// Roda no Node 22.18+ sem compilação; por isso os imports relativos têm a extensão .ts.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CodigoSerie } from "../src/compartilhado/tipos.ts";
import { interpretarRespostaSgs, montarArquivoSerie } from "../src/indices/cliente-bcb.ts";
import { SERIES, urlDaSerie } from "../src/indices/series.ts";

const PASTA = join(import.meta.dirname, "..", "dados", "indices");
const TEMPO_LIMITE_MS = 30_000;
const TENTATIVAS = 3;

function ehCodigo(texto: string): texto is CodigoSerie {
  return Object.hasOwn(SERIES, texto);
}

async function baixar(url: string): Promise<string> {
  let ultimoErro: unknown;
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    try {
      const resposta = await fetch(url, { signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      const tipo = resposta.headers.get("content-type") ?? "";
      if (!tipo.includes("application/json")) throw new Error(`conteúdo inesperado (${tipo})`);
      return await resposta.text();
    } catch (erro) {
      ultimoErro = erro;
      if (tentativa < TENTATIVAS) {
        await new Promise((resolver) => setTimeout(resolver, 2_000 * tentativa));
      }
    }
  }
  throw new Error(`Falha ao baixar ${url}: ${String(ultimoErro)}`);
}

async function main(): Promise<void> {
  const pedidos = process.argv.slice(2);
  const codigos =
    pedidos.length === 0
      ? (Object.keys(SERIES) as CodigoSerie[])
      : pedidos.map((pedido) => {
          if (!ehCodigo(pedido)) {
            throw new Error(
              `Série desconhecida: ${pedido}. Conhecidas: ${Object.keys(SERIES).join(", ")}.`,
            );
          }
          return pedido;
        });
  mkdirSync(PASTA, { recursive: true });
  for (const codigo of codigos) {
    const url = urlDaSerie(codigo);
    const valores = interpretarRespostaSgs(await baixar(url));
    if (valores.length === 0) throw new Error(`A série ${codigo} veio vazia; nada foi gravado.`);
    const arquivo = montarArquivoSerie(codigo, valores, new Date().toISOString());
    writeFileSync(join(PASTA, `${codigo}.json`), `${JSON.stringify(arquivo, null, 2)}\n`);
    const ultimo = valores.at(-1);
    console.log(
      `${codigo} (${SERIES[codigo].nome}): ${valores.length} meses, último ${ultimo?.competencia ?? "-"} = ${ultimo?.valor ?? "-"}`,
    );
  }
}

main().catch((erro: unknown) => {
  console.error(String(erro));
  process.exitCode = 1;
});
