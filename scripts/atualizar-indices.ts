// Atualiza a cópia publicada das séries do BCB em dados/indices/ (a rotina central de índices:
// .github/workflows/atualizar-indices.yml roda este script nos dias úteis; também serve à mão).
//   npm run indices:atualizar             → todas as séries do catálogo
//   npm run indices:atualizar -- 189 433  → só as indicadas
// Roda no Node 22.18+ sem compilação (sintaxe apagável); por isso os imports relativos têm a
// extensão .ts. A orquestração (baixar tudo → conferir cada série contra o arquivo atual → gravar
// as boas que mudaram) está em src/indices/atualizacao.ts, testada sem rede; aqui ficam só os
// argumentos, o disco e o console.
// Saída: uma linha por série, depois os avisos (revisões e SELIC parcial) e os meses atrasados pelo
// calendário, tudo na saída padrão; por fim os problemas, na saída de erros. Uma série com problema
// fica como estava e não impede as outras de serem gravadas, mas o código de saída é 1 (a
// execução da rotina fica marcada como falha); também é 1 quando um código pedido é desconhecido (aí nada é baixado). Sem
// problemas, 0, mesmo com avisos.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CodigoSerie } from "../src/compartilhado/tipos.ts";
import { atualizarSeries, seriesPedidas } from "../src/indices/atualizacao.ts";
import type { ArquivosDeSeries } from "../src/indices/atualizacao.ts";

const PASTA = join(import.meta.dirname, "..", "dados", "indices");

/** A pasta dados/indices/ como o módulo de atualização a enxerga: um arquivo <codigo>.json por série. */
function arquivosEmDisco(pasta: string): ArquivosDeSeries {
  const caminho = (codigo: CodigoSerie): string => join(pasta, `${codigo}.json`);
  return {
    ler(codigo) {
      try {
        return readFileSync(caminho(codigo), "utf8");
      } catch (erro) {
        if ((erro as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw erro;
      }
    },
    gravar(codigo, texto) {
      mkdirSync(pasta, { recursive: true });
      writeFileSync(caminho(codigo), texto);
    },
  };
}

/** Devolve o código de saída do processo; só o que for inesperado (disco, por exemplo) lança. */
async function main(): Promise<number> {
  const pedido = seriesPedidas(process.argv.slice(2));
  if (!pedido.ok) {
    console.error(pedido.mensagem);
    return 1;
  }
  const resultado = await atualizarSeries(pedido.codigos, arquivosEmDisco(PASTA));
  for (const linha of resultado.linhas) console.log(linha);
  for (const aviso of resultado.avisos) console.log(aviso);
  for (const atrasado of resultado.atrasados) console.log(atrasado);
  for (const problema of resultado.problemas) console.error(problema);
  return resultado.problemas.length > 0 ? 1 : 0;
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
