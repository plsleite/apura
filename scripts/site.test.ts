// O que vai para o site publicado no Cloudflare Pages e o ambiente da montagem (§19.2): o Node
// fixado, as travas da instalação, os cabeçalhos de segurança e o index.html sem script embutido
// (que a política de conteúdo bloquearia). Fica em scripts/ porque lê arquivos do repositório.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const caminho = (relativo: string) => new URL(`../${relativo}`, import.meta.url);
const ler = (relativo: string) => readFileSync(caminho(relativo), "utf8");

/** "22.23.3" → [22, 23, 3]; compara versões X.Y.Z número a número. */
const partes = (versao: string) => versao.split(".").map(Number);
function naoMenor(versao: string, minima: string): boolean {
  const [a, b] = [partes(versao), partes(minima)];
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return true;
}

/** Os cabeçalhos do bloco "/*" do public/_headers, por nome. */
function cabecalhosDeTodasAsPaginas(): Map<string, string> {
  const linhas = ler("public/_headers").split("\n");
  const inicio = linhas.findIndex((l) => l.trim() === "/*");
  const mapa = new Map<string, string>();
  for (const linha of linhas.slice(inicio + 1)) {
    if (!/^\s+\S/.test(linha)) break;
    const [nome = "", ...valor] = linha.trim().split(":");
    mapa.set(nome.trim(), valor.join(":").trim());
  }
  return mapa;
}

describe("ambiente da montagem (§19.2)", () => {
  it(".node-version fixa uma versão exata do Node que satisfaz o engines do package.json", () => {
    const versao = ler(".node-version").trim();
    expect(versao).toMatch(/^\d+\.\d+\.\d+$/);
    const minima = (JSON.parse(ler("package.json")) as { engines: { node: string } }).engines.node;
    expect(minima).toMatch(/^>=\d+\.\d+\.\d+$/);
    expect(naoMenor(versao, minima.slice(2))).toBe(true);
  });

  it(".npmrc: nenhum pacote roda programa na instalação, e Node fora do engines para a instalação", () => {
    const linhas = ler(".npmrc")
      .split("\n")
      .map((l) => l.trim());
    expect(linhas).toContain("ignore-scripts=true");
    expect(linhas).toContain("engine-strict=true");
  });
});

describe("o site publicado (§19.2)", () => {
  it("cabeçalhos em todas as páginas: não indexar, política de conteúdo e proteções usuais", () => {
    const h = cabecalhosDeTodasAsPaginas();
    expect(h.get("X-Robots-Tag")).toBe("noindex");
    expect(h.get("X-Frame-Options")).toBe("DENY");
    expect(h.get("X-Content-Type-Options")).toBe("nosniff");
    expect(h.get("Referrer-Policy")).toBe("no-referrer");
    expect(h.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
    const politica = new Map(
      (h.get("Content-Security-Policy") ?? "").split(";").map((diretiva) => {
        const [nome = "", ...valores] = diretiva.trim().split(/\s+/);
        return [nome, valores.join(" ")] as const;
      }),
    );
    expect(politica.get("default-src")).toBe("'self'");
    expect(politica.get("script-src")).toBe("'self'");
    expect(politica.get("connect-src")).toBe("'self'");
    expect(politica.get("object-src")).toBe("'none'");
    expect(politica.get("base-uri")).toBe("'none'");
    expect(politica.get("form-action")).toBe("'none'");
    expect(politica.get("frame-ancestors")).toBe("'none'");
  });

  it("index.html: marca de não indexar e nenhum script embutido (só arquivos do próprio site)", () => {
    const html = ler("index.html");
    expect(html).toContain('<meta name="robots" content="noindex" />');
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
    expect(scripts.length).toBeGreaterThan(0);
    for (const [, atributos = "", corpo = ""] of scripts) {
      expect(corpo.trim()).toBe("");
      const src = /\bsrc="\/([^"]+)"/.exec(atributos)?.[1];
      expect(src).toBeDefined();
      expect(existsSync(caminho(src ?? "")) || existsSync(caminho(`public/${src ?? ""}`))).toBe(
        true,
      );
    }
  });
});
