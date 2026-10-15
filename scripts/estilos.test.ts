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

describe("tabela sempre à vista: a coluna da direita presa, com rolagem própria (§20.3)", () => {
  const larga = () => bloco(css, "@media (min-width: 1024px) and (min-height: 600px)");

  it("a partir de 1024 px de largura e 600 px de altura, a coluna da direita fica presa abaixo da barra e ocupa a altura que sobra", () => {
    const coluna = declaracoes(bloco(larga(), ".coluna-direita"));
    expect(coluna.get("position")).toBe("sticky");
    expect(coluna.get("top")).toBe("calc(var(--barra-altura) + 16px)");
    expect(coluna.get("max-height")).toBe("calc(100vh - var(--barra-altura) - 32px)");
  });

  it("a área rolável é uma só para a coluna inteira, e a rolagem dela não passa para a página ao chegar ao fim", () => {
    const area = declaracoes(bloco(larga(), ".coluna-rolavel"));
    expect(area.get("overflow")).toBe("auto");
    expect(area.get("overscroll-behavior")).toBe("contain");
    expect(area.get("scroll-padding-top")).toBe("var(--cabecalhos-da-tabela)");
    // a tabela que cabe na coluna perde a rolagem lateral própria (senão o cabeçalho dela não
    // teria como ficar preso); a que não cabe (marcada pelo componente) continua rolando de lado
    expect(
      declaracoes(bloco(larga(), ".tabela-rolagem > .rolagem:not(.transborda)")).get("overflow-x"),
    ).toBe("visible");
  });

  it("o título de cada tabela e a linha de títulos das colunas ficam presos no topo da área, como o congelar painéis", () => {
    const titulo = declaracoes(bloco(larga(), ".tabela-rolagem > .titulo-secao"));
    expect(titulo.get("position")).toBe("sticky");
    expect(titulo.get("top")).toBe("0");
    expect(titulo.get("height")).toBe("var(--titulo-da-tabela)");
    const cabecalho = declaracoes(bloco(larga(), ".tabela-rolagem thead th"));
    expect(cabecalho.get("position")).toBe("sticky");
    expect(cabecalho.get("top")).toBe("var(--titulo-da-tabela)");
    // o lápis e o ✕ continuam presos à direita (§18.6), também no cabeçalho
    expect(declaracoes(bloco(larga(), ".tabela-rolagem thead th:last-child")).get("right")).toBe(
      "0",
    );
  });

  it("fora das telas largas e altas, a área rolável é dissolvida (não é caixa nem parada do Tab); abaixo de 1024 px as tabelas voltam a rolar sozinhas", () => {
    expect(declaracoes(bloco(css, ".coluna-rolavel")).get("display")).toBe("contents");
    expect(declaracoes(bloco(larga(), ".coluna-rolavel")).get("display")).toBe("flex");
    expect(declaracoes(bloco(estreita, ".coluna-direita")).get("display")).toBe("contents");
    expect(declaracoes(bloco(css, ".tabela-rolagem > .rolagem")).get("overflow-x")).toBe("auto");
  });
});
