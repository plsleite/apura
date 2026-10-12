// Relatório mensal da rotina de índices (decisão de 12/10/2026), gravado como arquivo.
//   npm run indices:relatorio -- 2026-10 execucoes.json
// O arquivo de execuções é a lista de workflow_run do workflow "Atualizar índices do BCB", como o
// workflow .github/workflows/relatorio-indices.yml a baixa da API do GitHub. O script lê também os
// commits da rotina em dados/indices pelo git log e grava docs/monitoramento/<AAAA-MM>.md.
// Roda no Node 22.18+ sem compilação (sintaxe apagável); por isso os imports relativos têm a
// extensão .ts. A montagem do relatório está em src/indices/relatorio.ts, testada sem rede; aqui
// ficam só os argumentos, o git, o disco e o console. Mês inválido ou arquivo ilegível: mensagem
// simples e código de saída 1. A variável de ambiente APURA_RAIZ, usada só pelos testes, troca a
// raiz do repositório (onde roda o git log e onde fica docs/monitoramento).
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { competenciaValida } from "../src/compartilhado/datas.ts";
import {
  ARGUMENTOS_DO_GIT_LOG,
  lerAtualizacoes,
  lerExecucoes,
  montarRelatorio,
} from "../src/indices/relatorio.ts";

const RAIZ = process.env.APURA_RAIZ || join(import.meta.dirname, "..");

/** Problema previsto (arquivo ou git): vira só a mensagem, sem "Error:", e código 1. */
class Recusa extends Error {}

function lerArquivoDeExecucoes(caminho: string): unknown {
  let texto: string;
  try {
    texto = readFileSync(caminho, "utf8");
  } catch (erro) {
    const codigo = (erro as NodeJS.ErrnoException).code;
    throw new Recusa(
      codigo === "ENOENT"
        ? `O arquivo de execuções ${caminho} não existe.`
        : `O arquivo de execuções ${caminho} não pôde ser lido.`,
    );
  }
  let dado: unknown;
  try {
    dado = JSON.parse(texto);
  } catch {
    throw new Recusa(`O arquivo de execuções ${caminho} não é JSON válido.`);
  }
  const lista =
    Array.isArray(dado) ||
    (typeof dado === "object" &&
      dado !== null &&
      Array.isArray((dado as { workflow_runs?: unknown }).workflow_runs));
  if (!lista) {
    throw new Recusa(
      `O arquivo de execuções ${caminho} não traz uma lista de execuções do GitHub Actions.`,
    );
  }
  return dado;
}

function lerGitLog(): string {
  try {
    return execFileSync("git", ARGUMENTOS_DO_GIT_LOG, {
      cwd: RAIZ,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Recusa("Não foi possível ler o histórico do git em dados/indices.");
  }
}

/** Devolve o código de saída do processo; só o que for inesperado (disco, por exemplo) lança. */
function main(argumentos: readonly string[]): number {
  if (argumentos.length !== 2) {
    console.error("Uso: npm run indices:relatorio -- <AAAA-MM> <arquivo-execucoes.json>");
    return 1;
  }
  const [mes = "", caminho = ""] = argumentos;
  if (!/^\d{4}-\d{2}$/.test(mes) || !competenciaValida(mes)) {
    console.error(`Mês inválido: "${mes}". Informe o mês no formato AAAA-MM, por exemplo 2026-10.`);
    return 1;
  }
  try {
    const execucoes = lerExecucoes(lerArquivoDeExecucoes(caminho));
    const atualizacoes = lerAtualizacoes(lerGitLog());
    const pasta = join(RAIZ, "docs", "monitoramento");
    mkdirSync(pasta, { recursive: true });
    const arquivo = join(pasta, `${mes}.md`);
    writeFileSync(arquivo, montarRelatorio(mes, execucoes, atualizacoes));
    console.log(relative(RAIZ, arquivo));
    return 0;
  } catch (erro) {
    if (erro instanceof Recusa) {
      console.error(erro.message);
      return 1;
    }
    throw erro;
  }
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : String(erro));
  process.exitCode = 1;
}
