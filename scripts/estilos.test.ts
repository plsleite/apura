// A folha de estilos da tela (src/ui/estilos.css), lida do disco: fica em scripts/ porque lê um
// arquivo do repositório com o Node, como site.test.ts (o vitest entrega vazio um `.css?raw`).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const estilos = readFileSync(new URL("../src/ui/estilos.css", import.meta.url), "utf8");

/**
 * O jsdom não calcula layout: o que a tela faz ao rolar (barra presa, coluna da direita presa com
 * rolagem própria, cabeçalhos das tabelas presos) só se vê no navegador. Estes testes leem a folha
 * de estilos e prendem as declarações que sustentam essas decisões (§20 do design), para que uma
 * mudança descuidada não as perca sem ninguém notar: provam que a regra está escrita, não que o
 * navegador a aplica (isso é a conferência visual da fase).
 */

/** O CSS sem comentários, com o espaço em branco reduzido a um espaço. */
const css = estilos.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ");

/** As regras de primeiro nível de `texto`: o cabeçalho e o conteúdo entre chaves (aninhadas incluídas). */
function regras(texto: string): Array<{ cabecalho: string; corpo: string }> {
  const lista: Array<{ cabecalho: string; corpo: string }> = [];
  let i = 0;
  for (let abre = texto.indexOf("{", i); abre !== -1; abre = texto.indexOf("{", i)) {
    let nivel = 1;
    let j = abre + 1;
    for (; j < texto.length && nivel > 0; j++) {
      if (texto[j] === "{") nivel++;
      else if (texto[j] === "}") nivel--;
    }
    lista.push({
      cabecalho: texto.slice(i, abre).trim(),
      corpo: texto.slice(abre + 1, j - 1).trim(),
    });
    i = j;
  }
  return lista;
}

/**
 * O conteúdo das regras de primeiro nível de `texto` (a folha inteira ou o conteúdo de um bloco
 * @media) cujo cabeçalho é exatamente `cabecalho`. Com mais de uma regra igual, os conteúdos se
 * juntam na ordem da folha, e a declaração posterior vence, como no navegador.
 */
function bloco(texto: string, cabecalho: string): string {
  const alvo = cabecalho.replace(/\s+/g, " ").trim();
  const achadas = regras(texto).filter((r) => r.cabecalho === alvo);
  if (achadas.length === 0) throw new Error(`Regra "${cabecalho}" não encontrada.`);
  return achadas.map((r) => r.corpo).join("; ");
}

/** As declarações de um bloco, como pares nome → valor. */
function declaracoes(corpo: string): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const parte of corpo.split(";")) {
    const [nome = "", ...valor] = parte.split(":");
    if (nome.trim() !== "" && !nome.includes("{")) mapa.set(nome.trim(), valor.join(":").trim());
  }
  return mapa;
}

const estreita = bloco(css, "@media (max-width: 1023px)");

describe("cabeçalho fixo (§20.1)", () => {
  it("a barra fica presa no topo, acima do conteúdo, e tem a altura declarada em --barra-altura", () => {
    const barra = declaracoes(bloco(css, ".barra"));
    expect(barra.get("position")).toBe("sticky");
    expect(barra.get("top")).toBe("0");
    expect(Number(barra.get("z-index"))).toBeGreaterThan(0);
    expect(declaracoes(bloco(css, ":root")).get("--barra-altura")).toBe("64px");
  });

  it("o campo em foco nunca fica escondido sob a barra: a página reserva a altura dela ao rolar até o foco (WCAG 2.4.11)", () => {
    expect(declaracoes(bloco(css, "html")).get("scroll-padding-top")).toBe(
      "calc(var(--barra-altura) + 8px)",
    );
  });

  it("em telas estreitas, onde a barra quebra em mais de uma linha, ela não fica presa e nada é reservado", () => {
    expect(declaracoes(bloco(estreita, ".barra")).get("position")).toBe("static");
    expect(declaracoes(bloco(estreita, "html")).get("scroll-padding-top")).toBe("0");
  });
});
