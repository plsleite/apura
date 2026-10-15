// Regras de segurança dos workflows do GitHub Actions (§19.3 e §19.4 do design), conferidas pela
// leitura dos arquivos: cada action fixada pelo SHA do commit da versão; checkout sem guardar a
// credencial; o Node do .node-version, sem cache de pacotes; a credencial de escrita só nos passos
// que gravam, em etapas (jobs) que não instalam nem rodam pacotes de terceiros; o testes.yml só com
// leitura; a conferência da publicação antes de baixar as séries. O actionlint (CLAUDE.md) confere
// a sintaxe; aqui ficam as regras do projeto.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const PASTA = new URL("../.github/workflows/", import.meta.url);
const WORKFLOWS = readdirSync(PASTA)
  .filter((nome) => nome.endsWith(".yml"))
  .sort();
const ler = (nome: string) => readFileSync(new URL(nome, PASTA), "utf8");

/** As etapas (jobs) do workflow, por nome, cada uma com o seu texto. */
function etapas(texto: string): Map<string, string> {
  const mapa = new Map<string, string>();
  const linhas = texto.split("\n");
  let atual: string | null = null;
  let dentro = false;
  for (const linha of linhas) {
    if (/^jobs:\s*$/.test(linha)) {
      dentro = true;
      continue;
    }
    if (!dentro || /^\s*(#.*)?$/.test(linha)) continue; // comentários e linhas vazias: de nenhuma etapa
    if (/^\S/.test(linha)) break;
    const nome = /^ {2}([\w-]+):\s*$/.exec(linha)?.[1];
    if (nome !== undefined) {
      atual = nome;
      mapa.set(nome, "");
      continue;
    }
    if (atual !== null) mapa.set(atual, `${mapa.get(atual) ?? ""}${linha}\n`);
  }
  return mapa;
}

interface Passo {
  nome: string;
  texto: string;
}

/** Os passos (itens de `steps:`, com 6 espaços antes do "-"), cada um com o seu nome. */
function passos(texto: string): Passo[] {
  const lista: Passo[] = [];
  let atual: Passo | undefined;
  for (const linha of texto.split("\n")) {
    if (/^ {6}#/.test(linha)) continue; // comentário entre passos: não é de nenhum
    if (/^ {6}- /.test(linha)) {
      atual = { nome: "", texto: "" };
      lista.push(atual);
    } else if (/^ {0,5}\S/.test(linha) || /^ {6}\S/.test(linha)) {
      atual = undefined; // fim da lista de passos (outra chave da etapa, outra etapa)
    }
    if (atual === undefined) continue;
    atual.texto += `${linha}\n`;
    const nome = /^ {6}(?:- | {2})name: (.+)$/.exec(linha)?.[1];
    if (nome !== undefined && atual.nome === "") atual.nome = nome.replace(/^"|"$/g, "");
  }
  return lista;
}

/** As expressões `${{ … }}` do texto. */
const expressoes = (texto: string) => texto.match(/\$\{\{[\s\S]*?\}\}/g) ?? [];

/**
 * Expressão que alcança a credencial do GitHub, em qualquer grafia (os contextos não diferenciam
 * maiúsculas): `github.token`, `github['token']`, `secrets.GITHUB_TOKEN`, `toJSON(github)`…
 */
const alcancaToken = (e: string) =>
  /github\s*(\.\s*token|\[)|secrets\s*(\.\s*github_token|\[)|tojson\s*\(\s*(github|secrets)\s*\)/i.test(
    e,
  );

/** A única forma aceita de pedir a credencial, e só nos passos permitidos. */
const TOKEN = "${{ github.token }}";
const usosDoToken = (texto: string) => expressoes(texto).filter((e) => e === TOKEN).length;

/** Os únicos segredos dos workflows (§19.5): o sinal ao Healthchecks e o deploy hook. */
const SEGREDOS_PERMITIDOS = new Set([
  "${{ secrets.HC_URL != '' }}",
  "${{ secrets.HC_URL }}",
  "${{ secrets.CF_DEPLOY_HOOK != '' }}",
  "${{ secrets.CF_DEPLOY_HOOK }}",
]);

/** A etapa pede alguma permissão de escrita (`contents: write`, `"write"`, `write-all`…). */
const pedeEscrita = (texto: string) => /\bwrite-all\b|[\w-]+:\s*["']?write\b/.test(texto);

/** A etapa instala ou roda pacotes de terceiros. */
const rodaPacotes = (texto: string) =>
  /\b(npm|npx|pnpm|yarn|bun|bunx|node|tsx|deno)\b|node_modules|setup-node/.test(texto);

describe("workflows do GitHub Actions (§19.3, §19.4)", () => {
  it("são os três previstos, com as etapas previstas", () => {
    expect(WORKFLOWS).toEqual(["atualizar-indices.yml", "relatorio-indices.yml", "testes.yml"]);
    expect([...etapas(ler("atualizar-indices.yml")).keys()]).toEqual([
      "baixar",
      "gravar",
      "fechar",
    ]);
    expect([...etapas(ler("relatorio-indices.yml")).keys()]).toEqual(["montar", "gravar"]);
    expect([...etapas(ler("testes.yml")).keys()]).toEqual(["testes"]);
  });

  it.each(WORKFLOWS)(
    "%s: toda action fixada pelo SHA do commit, com a versão num comentário",
    (nome) => {
      const usos = [...ler(nome).matchAll(/^\s*(?:- )?uses: (.+)$/gm)].map((m) => m[1] ?? "");
      expect(usos.length).toBeGreaterThan(0);
      for (const uso of usos) {
        expect(uso).toMatch(/^[\w-]+\/[\w-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/);
      }
    },
  );

  it.each(WORKFLOWS)("%s: checkout sem guardar a credencial", (nome) => {
    const checkouts = passos(ler(nome)).filter((p) => p.texto.includes("actions/checkout@"));
    expect(checkouts.length).toBeGreaterThan(0);
    for (const passo of checkouts) expect(passo.texto).toContain("persist-credentials: false");
  });

  it.each(WORKFLOWS)(
    "%s: Node do .node-version, sem cache de pacotes, permissões declaradas",
    (nome) => {
      const texto = ler(nome);
      expect(texto).toMatch(/^permissions:/m);
      const setup = passos(texto).filter((p) => p.texto.includes("actions/setup-node@"));
      expect(setup).toHaveLength(1);
      expect(setup[0]?.texto).toContain("node-version-file: .node-version");
      expect(setup[0]?.texto).toContain("package-manager-cache: false");
      expect(texto).not.toMatch(/node-version: /);
      expect(texto).not.toMatch(/^\s+cache: /m);
    },
  );

  it.each([
    ["atualizar-indices.yml", [["gravar", "Gravar na main"]]],
    [
      "relatorio-indices.yml",
      [
        ["montar", "Ler as execuções da rotina"],
        ["gravar", "Gravar na main"],
      ],
    ],
    ["testes.yml", []],
  ] as const)(
    "%s: a credencial só nos passos %j, em nenhum outro lugar do arquivo",
    (nome, permitidos) => {
      const texto = ler(nome);
      let nosPermitidos = 0;
      for (const [etapa, passo] of permitidos) {
        const p = passos(etapas(texto).get(etapa) ?? "").find((x) => x.nome === passo);
        expect(p, `${etapa} › ${passo}`).toBeDefined();
        expect(usosDoToken(p?.texto ?? "")).toBeGreaterThan(0);
        nosPermitidos += usosDoToken(p?.texto ?? "");
      }
      expect(usosDoToken(texto)).toBe(nosPermitidos);
      // nenhuma outra forma de alcançar a credencial, e só os segredos previstos
      for (const e of expressoes(texto)) {
        if (alcancaToken(e)) expect(e).toBe(TOKEN);
        if (/secrets/i.test(e)) expect(SEGREDOS_PERMITIDOS.has(e), e).toBe(true);
      }
    },
  );

  it.each(WORKFLOWS)(
    "%s: o topo não dá escrita; toda etapa declara permissões; etapa com escrita só usa checkout e download-artifact e não roda pacotes",
    (nome) => {
      const texto = ler(nome);
      const topo = texto.slice(0, texto.search(/^jobs:/m));
      expect(topo).toMatch(/^permissions:/m);
      expect(pedeEscrita(topo)).toBe(false);
      for (const [etapa, corpo] of etapas(texto)) {
        expect(corpo, `etapa ${etapa}`).toMatch(/^ {4}permissions:/m);
        if (!pedeEscrita(corpo)) continue;
        expect(rodaPacotes(corpo), `etapa ${etapa}`).toBe(false);
        for (const uso of corpo.match(/uses: \S+/g) ?? []) {
          expect(uso, `etapa ${etapa}`).toMatch(/^uses: actions\/(checkout|download-artifact)@/);
        }
      }
    },
  );

  it("testes.yml: só leitura, a cada envio e pull request, com verificar, build e auditoria", () => {
    const texto = ler("testes.yml");
    expect(texto).toMatch(/^on: \[push, pull_request\]$/m);
    expect(texto).toMatch(/^permissions:\n {2}contents: read$/m);
    expect(texto).not.toContain("write");
    const comandos = passos(texto).map((p) => /run: (.+)$/m.exec(p.texto)?.[1]);
    expect(comandos).toEqual([
      undefined,
      undefined,
      "npm ci",
      "npm run verificar",
      "npm run build",
      "npm audit --audit-level=high",
      "npm audit signatures",
    ]);
  });

  it("atualizar-indices.yml: baixar (só leitura) → gravar (escrita, máquina limpa) → fechar", () => {
    const texto = ler("atualizar-indices.yml");
    expect([...etapas(texto).keys()]).toEqual(["baixar", "gravar", "fechar"]);
    expect(texto).toContain("SITE_URL: https://apura-dpems.pages.dev");
    const baixar = passos(etapas(texto).get("baixar") ?? "");
    const nomes = baixar.map((p) => p.nome);
    expect(nomes.indexOf("Conferir a publicação do site")).toBeGreaterThan(-1);
    expect(nomes.indexOf("Conferir a publicação do site")).toBeLessThan(
      nomes.indexOf("Baixar as séries do BCB"),
    );
    expect(baixar.find((p) => p.nome === "Conferir a publicação do site")?.texto).toContain(
      "continue-on-error: true",
    );
    const fechar = passos(etapas(texto).get("fechar") ?? "");
    const passo = (nome: string) => fechar.find((p) => p.nome === nome)?.texto ?? "";
    expect(etapas(texto).get("fechar")).toContain(
      "if: always() && needs.baixar.result != 'skipped'",
    );
    expect(passo("Desfecho no resumo")).not.toBe("");
    const sinal = /if: (.+)$/m.exec(passo("Sinal de vida ao Healthchecks"))?.[1] ?? "";
    expect(sinal).toContain("needs.baixar.outputs.baixar == 'success'");
    expect(sinal).toContain("github.event_name == 'schedule'");
    expect(sinal).not.toContain("publicacao");
    expect(passo("Sinalizar problema nas séries")).toContain(
      "if: always() && needs.baixar.outputs.baixar == 'failure'",
    );
    expect(passo("Sinalizar problema na publicação do site")).toContain(
      "if: always() && needs.baixar.outputs.publicacao == 'failure'",
    );
    expect(passo("Sinalizar problema nas conferências")).toContain(
      "if: always() && needs.baixar.outputs.conferir == 'failure'",
    );
    // o deploy hook vem depois do sinal, e a falha dele não apaga o "gravado"
    expect(passo("Publicar pelo deploy hook")).toContain("needs.gravar.outputs.commit != ''");
    expect(fechar.map((p) => p.nome).indexOf("Publicar pelo deploy hook")).toBeGreaterThan(
      fechar.map((p) => p.nome).indexOf("Sinal de vida ao Healthchecks"),
    );
    // a etapa "gravar" não volta séries que outra rodada já gravou (reexecução de etapa)
    const gravar = passos(etapas(texto).get("gravar") ?? "").find(
      (p) => p.nome === "Gravar na main",
    );
    expect(gravar?.texto).toContain('git diff --quiet "$BASE" HEAD -- dados/indices');
  });
});
