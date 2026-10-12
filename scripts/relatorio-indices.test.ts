// Testes do script do relatório mensal. Ficam em scripts/ (e não em src/) porque usam o Node
// (processo filho, git e arquivos temporários): o tsconfig.node.json já traz os tipos do Node, e o
// código do navegador em src/ continua sem eles. Nada acessa a rede, e nada é gravado no
// repositório: o script roda com APURA_RAIZ apontada para uma pasta temporária.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ARGUMENTOS_DO_GIT_LOG,
  lerAtualizacoes,
  lerExecucoes,
  montarRelatorio,
  RODADAS,
} from "../src/indices/relatorio.ts";
import type { AtualizacaoRegistrada } from "../src/indices/relatorio.ts";

const SCRIPT = fileURLToPath(new URL("./relatorio-indices.ts", import.meta.url));
const TEXTO_DAS_EXECUCOES = readFileSync(
  new URL("../src/indices/testes/execucoes-rotina.json", import.meta.url),
  "utf8",
);

const pasta = mkdtempSync(join(tmpdir(), "apura-relatorio-"));
const execucoes = join(pasta, "execucoes.json");
writeFileSync(execucoes, TEXTO_DAS_EXECUCOES);

afterAll(() => {
  rmSync(pasta, { recursive: true, force: true });
});

/**
 * Ambiente sem as variáveis GIT_* de quem roda os testes (um gancho do git, por exemplo, traz
 * GIT_DIR e faria o git ler outro repositório), sem a configuração global e de sistema da máquina
 * (assinatura de commits, ganchos) e sem subir para pastas acima de `pasta` à procura de um
 * repositório.
 */
function ambiente(extras: Record<string, string> = {}): NodeJS.ProcessEnv {
  const limpo = Object.fromEntries(
    Object.entries(process.env).filter(([nome]) => !nome.startsWith("GIT_")),
  );
  const configuracaoVazia = join(pasta, "gitconfig-vazio");
  writeFileSync(configuracaoVazia, "");
  return {
    ...limpo,
    GIT_CONFIG_GLOBAL: configuracaoVazia,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CEILING_DIRECTORIES: pasta,
    ...extras,
  };
}

/** Roda o script com a raiz do repositório em `raiz`. */
function rodar(raiz: string, ...argumentos: string[]) {
  const { status, stdout, stderr } = spawnSync(process.execPath, [SCRIPT, ...argumentos], {
    cwd: pasta,
    encoding: "utf8",
    env: ambiente({ APURA_RAIZ: raiz }),
    timeout: 20_000,
  });
  return { status, stdout, stderr };
}

function git(repositorio: string, argumentos: readonly string[], data?: string): string {
  const datas: Record<string, string> =
    data === undefined ? {} : { GIT_AUTHOR_DATE: data, GIT_COMMITTER_DATE: data };
  return execFileSync("git", argumentos, {
    cwd: repositorio,
    encoding: "utf8",
    env: ambiente({
      GIT_AUTHOR_NAME: "Rotina de teste",
      GIT_AUTHOR_EMAIL: "rotina@exemplo.invalid",
      GIT_COMMITTER_NAME: "Rotina de teste",
      GIT_COMMITTER_EMAIL: "rotina@exemplo.invalid",
      ...datas,
    }),
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/** Grava `conteudo` em `arquivo` (relativo ao repositório) e faz o commit com a mensagem e a data. */
function commit(
  repositorio: string,
  arquivo: string,
  conteudo: string,
  mensagem: string,
  data: string,
) {
  const caminho = join(repositorio, arquivo);
  mkdirSync(join(caminho, ".."), { recursive: true });
  writeFileSync(caminho, conteudo);
  const arquivoDaMensagem = join(pasta, "mensagem.txt");
  writeFileSync(arquivoDaMensagem, mensagem);
  git(repositorio, ["add", "--", arquivo]);
  git(repositorio, ["commit", "-q", "-F", arquivoDaMensagem], data);
}

/**
 * Repositório de verdade, do mais antigo para o mais recente: dois commits da rotina em
 * dados/indices (o segundo com revisão), um alheio em dados/indices e um fora de dados/indices com
 * título igual ao da rotina (prova o filtro do caminho).
 */
const repositorio = join(pasta, "repositorio");

const ATUALIZACOES_ESPERADAS: AtualizacaoRegistrada[] = [
  {
    em: "2026-10-09T14:27:40-03:00",
    rodada: "14h17",
    linhas: [
      "433 (IPCA): 562 meses, último 2026-09 = 0.48",
      "188 (INPC): sem mudança; 561 meses, último 2026-08 = 0.20",
      "Atenção: na série 433 mudou 1 valor já publicado: 2026-08 de 0.80 para 0.82.",
    ],
  },
  {
    em: "2026-10-05T11:01:15-03:00",
    rodada: "10h47",
    linhas: [
      "4390 (SELIC): 489 meses, último 2026-10 = 0.10",
      "SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.05 para 0.10.",
    ],
  },
];

beforeAll(() => {
  mkdirSync(repositorio);
  git(repositorio, ["init", "-q"]);
  commit(
    repositorio,
    "dados/indices/4390.json",
    '{"serie": 4390}\n',
    [
      "indices: séries do BCB em 05/10/2026 11:01 (rodada 10h47)",
      "",
      "4390 (SELIC): 489 meses, último 2026-10 = 0.10",
      "SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.05 para 0.10.",
      "",
      "Execução: https://github.com/exemplo/apura/actions/runs/9100010000",
      "",
    ].join("\n"),
    "2026-10-05T11:01:15-03:00",
  );
  commit(
    repositorio,
    "dados/indices/433.json",
    '{"serie": 433, "nome": "IPCA"}\n',
    "indices: nome da série 433\n",
    "2026-10-06T09:00:00-03:00",
  );
  commit(
    repositorio,
    "docs/notas.md",
    "Notas.\n",
    "indices: séries do BCB em 07/10/2026 10:00 (rodada 10h47)\n\nFora de dados/indices.\n",
    "2026-10-07T10:00:00-03:00",
  );
  commit(
    repositorio,
    "dados/indices/433.json",
    '{"serie": 433, "nome": "IPCA", "valores": []}\n',
    [
      "indices: séries do BCB em 09/10/2026 14:27 (rodada 14h17)",
      "",
      "433 (IPCA): 562 meses, último 2026-09 = 0.48",
      "188 (INPC): sem mudança; 561 meses, último 2026-08 = 0.20",
      "Atenção: na série 433 mudou 1 valor já publicado: 2026-08 de 0.80 para 0.82.",
      "",
      "Execução: https://github.com/exemplo/apura/actions/runs/9100026000",
      "",
    ].join("\n"),
    "2026-10-09T14:27:40-03:00",
  );
});

describe("ARGUMENTOS_DO_GIT_LOG", () => {
  it("num repositório de verdade, dão o texto que lerAtualizacoes entende, só de dados/indices", () => {
    const texto = git(repositorio, ARGUMENTOS_DO_GIT_LOG);
    expect(lerAtualizacoes(texto)).toEqual(ATUALIZACOES_ESPERADAS);
  });
});

describe("scripts/relatorio-indices.ts", () => {
  it("grava docs/monitoramento/<mês>.md na raiz do repositório, imprime o caminho e sai com 0", () => {
    const { status, stdout, stderr } = rodar(repositorio, "2026-10", execucoes);
    expect(stderr).toBe("");
    expect(status).toBe(0);
    expect(stdout).toBe("docs/monitoramento/2026-10.md\n");
    const gravado = readFileSync(join(repositorio, "docs", "monitoramento", "2026-10.md"), "utf8");
    const execucoesLidas = lerExecucoes(JSON.parse(TEXTO_DAS_EXECUCOES) as unknown);
    expect(gravado).toBe(montarRelatorio("2026-10", execucoesLidas, ATUALIZACOES_ESPERADAS));
    expect(gravado).toContain("### 05/10/2026 11:01 · rodada 10h47\n");
    expect(gravado).toContain("### 09/10/2026 14:27 · rodada 14h17\n");
    expect(gravado).not.toContain("07/10/2026 10:00");
  });

  it("recusa mês inválido com mensagem simples e código 1, sem gravar nada", () => {
    const raiz = join(pasta, "mes-invalido");
    mkdirSync(raiz);
    for (const mes of ["2026-13", "10/2026", "2026-1", ""]) {
      const { status, stdout, stderr } = rodar(raiz, mes, execucoes);
      expect(status).toBe(1);
      expect(stdout).toBe("");
      expect(stderr).toBe(
        `Mês inválido: "${mes}". Informe o mês no formato AAAA-MM, por exemplo 2026-10.\n`,
      );
    }
    expect(existsSync(join(raiz, "docs"))).toBe(false);
  });

  it("recusa a falta de argumentos mostrando o uso", () => {
    const { status, stderr } = rodar(join(pasta, "sem-argumentos"), "2026-10");
    expect(status).toBe(1);
    expect(stderr).toBe("Uso: npm run indices:relatorio -- <AAAA-MM> <arquivo-execucoes.json>\n");
  });

  it("recusa arquivo inexistente, que não é JSON ou que não traz execuções, com código 1", () => {
    const naoJson = join(pasta, "nao-json.json");
    writeFileSync(naoJson, "isto não é JSON");
    const semLista = join(pasta, "sem-lista.json");
    writeFileSync(semLista, JSON.stringify({ mensagem: "nada" }));
    const inexistente = join(pasta, "nao-existe.json");
    const casos: Array<[string, string]> = [
      [inexistente, `O arquivo de execuções ${inexistente} não existe.\n`],
      [naoJson, `O arquivo de execuções ${naoJson} não é JSON válido.\n`],
      [
        semLista,
        `O arquivo de execuções ${semLista} não traz uma lista de execuções do GitHub Actions.\n`,
      ],
    ];
    for (const [arquivo, mensagem] of casos) {
      const { status, stdout, stderr } = rodar(repositorio, "2026-11", arquivo);
      expect(status).toBe(1);
      expect(stdout).toBe("");
      expect(stderr).toBe(mensagem);
      expect(stderr).not.toContain("Error:");
    }
    expect(existsSync(join(repositorio, "docs", "monitoramento", "2026-11.md"))).toBe(false);
  });

  it("fora de um repositório git, recusa com mensagem simples e código 1, sem gravar nada", () => {
    const raiz = join(pasta, "sem-git");
    mkdirSync(raiz);
    const { status, stdout, stderr } = rodar(raiz, "2026-10", execucoes);
    expect(status).toBe(1);
    expect(stdout).toBe("");
    expect(stderr).toBe("Não foi possível ler o histórico do git em dados/indices.\n");
    expect(existsSync(join(raiz, "docs"))).toBe(false);
  });
});

describe("agendamentos do workflow da rotina", () => {
  it("as linhas de cron e o case de atualizar-indices.yml são as de RODADAS", () => {
    const yml = readFileSync(
      new URL("../.github/workflows/atualizar-indices.yml", import.meta.url),
      "utf8",
    );
    const crons = [...yml.matchAll(/- cron: "([^"]+)"/g)].map((m) => m[1]);
    expect(crons).toEqual(Object.values(RODADAS).map((r) => r.cron));
    for (const [rodada, { cron }] of Object.entries(RODADAS)) {
      expect(yml).toContain(`"${cron}") RODADA="${rodada}" ;;`);
    }
  });
});
