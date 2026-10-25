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

  it("na tabela que não cabe na coluna (marcada transborda), a linha de títulos não desce: fica no topo da tabela, sem cobrir a primeira linha", () => {
    // a .rolagem com overflow-x: auto é a caixa de rolagem do cabeçalho nos dois eixos e não rola
    // na vertical: com top: var(--titulo-da-tabela), a linha de títulos desceria 35 px de vez,
    // por cima da primeira prestação (achado da revisão final da fase 7b)
    const cabecalho = declaracoes(bloco(larga(), ".tabela-rolagem > .rolagem.transborda thead th"));
    expect(cabecalho.get("top")).toBe("auto");
  });

  it("fora das telas largas e altas, a área rolável é dissolvida (não é caixa nem parada do Tab); abaixo de 1024 px as tabelas voltam a rolar sozinhas", () => {
    expect(declaracoes(bloco(css, ".coluna-rolavel")).get("display")).toBe("contents");
    expect(declaracoes(bloco(larga(), ".coluna-rolavel")).get("display")).toBe("flex");
    expect(declaracoes(bloco(estreita, ".coluna-direita")).get("display")).toBe("contents");
    expect(declaracoes(bloco(css, ".tabela-rolagem > .rolagem")).get("overflow-x")).toBe("auto");
  });
});

describe("destaque das linhas do último lote (§20.5)", () => {
  /** A cor de fundo dos passos `from` e `to` de uma animação. */
  const passos = (nome: string) => {
    const corpo = bloco(css, `@keyframes ${nome}`);
    return [bloco(corpo, "from"), bloco(corpo, "to")].map((p) =>
      declaracoes(p).get("background-color"),
    );
  };

  it("as linhas novas ganham um fundo verde-claro que fica parado meio segundo e se apaga em 1,5 s (2 s no total, decisão de 16/10/2026); o verde já aparece durante a espera (fill-mode both)", () => {
    expect(declaracoes(bloco(css, ".tabela-rolagem tbody tr.recem-lancada")).get("animation")).toBe(
      "destaque-da-linha 1.5s ease-in-out 0.5s both",
    );
    expect(passos("destaque-da-linha")).toEqual(["var(--destaque-do-lote)", "transparent"]);
  });

  it("a célula do lápis e do ✕, presa à direita com fundo próprio, tem o mesmo destaque e termina na cor da superfície, não transparente", () => {
    expect(
      declaracoes(bloco(css, ".tabela-rolagem tbody tr.recem-lancada > td.acoes-linha")).get(
        "animation",
      ),
    ).toBe("destaque-da-celula-presa 1.5s ease-in-out 0.5s both");
    expect(passos("destaque-da-celula-presa")).toEqual([
      "var(--destaque-do-lote)",
      "var(--superficie)",
    ]);
  });

  it("o verde do destaque é uma cor do tema: verde-claro no claro e um verde escuro discreto no escuro (pelo sistema ou pela escolha)", () => {
    const claro = declaracoes(bloco(css, ":root")).get("--destaque-do-lote");
    const escuroPeloSistema = declaracoes(
      bloco(bloco(css, "@media (prefers-color-scheme: dark)"), ':root:not([data-theme="light"])'),
    ).get("--destaque-do-lote");
    const escuroEscolhido = declaracoes(bloco(css, ':root[data-theme="dark"]')).get(
      "--destaque-do-lote",
    );
    expect(claro).toMatch(/^#[0-9a-f]{6}$/);
    expect(escuroPeloSistema).toMatch(/^#[0-9a-f]{6}$/);
    expect(escuroPeloSistema).not.toBe(claro);
    expect(escuroEscolhido).toBe(escuroPeloSistema);
  });

  it("quem prefere menos movimento vê o verde cheio pelos mesmos 2 s, e ele some de uma vez, sem esmaecer", () => {
    // step-end: o primeiro passo (verde) vale do começo da espera até o fim, e então o último
    expect(
      declaracoes(
        bloco(
          bloco(css, "@media (prefers-reduced-motion: reduce)"),
          ".tabela-rolagem tbody tr.recem-lancada, .tabela-rolagem tbody tr.recem-lancada > td.acoes-linha",
        ),
      ).get("animation-timing-function"),
    ).toBe("step-end");
  });
});

describe("botão de tema como ícone (§21.7)", () => {
  it("o botão de tema não tem borda nem a largura mínima do texto de antes", () => {
    const tema = declaracoes(bloco(css, ".botao-tema"));
    expect(tema.get("border-color")).toBe("transparent");
    expect(tema.has("min-width")).toBe(false);
  });
});

describe("sem exemplos dentro dos campos (§21.1)", () => {
  it("o campo de data em branco tem a cor discreta e o itálico dos textos dentro dos campos", () => {
    const vazio = declaracoes(bloco(css, '.campo input[type="date"][data-vazio]'));
    expect(vazio.get("color")).toBe("var(--discreto)");
    expect(vazio.get("font-style")).toBe("italic");
  });
});

describe("tipografia da tela (§21.3)", () => {
  // o @media print fica de fora: é a impressão, que não muda
  const tela = regras(css)
    .filter((r) => r.cabecalho !== "@media print")
    .map((r) => `${r.cabecalho} { ${r.corpo} }`)
    .join(" ");

  it("a tela usa só cinco tamanhos de letra: 12, 13, 15, 17 e 22 px", () => {
    const tamanhos = new Set([...tela.matchAll(/font-size:\s*([^;}]+)/g)].map((m) => m[1]?.trim()));
    expect([...tamanhos].sort()).toEqual(["12px", "13px", "15px", "17px", "22px"]);
  });

  it("nenhum texto da tela em maiúsculas forçadas", () => {
    expect(tela).not.toMatch(/text-transform:\s*uppercase/);
  });

  it("rótulos e legendas em 13 px; títulos das seções e das tabelas em 17 px; cabeçalhos das tabelas e rótulos dos indicadores em 13 px", () => {
    expect(declaracoes(bloco(css, ".rotulo-do-campo, .grupo > legend")).get("font-size")).toBe(
      "13px",
    );
    expect(declaracoes(bloco(css, ".rotulo-estatico")).get("font-size")).toBe("13px");
    const titulo = declaracoes(bloco(css, ".secao > h2, .secao > .titulo-secao > h2"));
    expect(titulo.get("font-size")).toBe("17px");
    expect(titulo.get("color")).toBe("var(--verde)");
    expect(declaracoes(bloco(css, ".tabela-rolagem > .titulo-secao > h2")).get("font-size")).toBe(
      "17px",
    );
    expect(declaracoes(bloco(css, "th")).get("font-size")).toBe("13px");
    expect(declaracoes(bloco(css, ".indicador dt")).get("font-size")).toBe("13px");
  });

  it("o título da tabela continua em 35 px, e a reserva dos cabeçalhos presos acompanha a linha de títulos maior (§20.3)", () => {
    const raiz = declaracoes(bloco(css, ":root"));
    expect(raiz.get("--titulo-da-tabela")).toBe("35px");
    expect(raiz.get("--cabecalhos-da-tabela")).toBe("66px");
    expect(declaracoes(bloco(css, ".tabela-rolagem > .titulo-secao")).get("padding")).toBe(
      "8px 12px 2px",
    );
  });

  it("subtítulos e o título dos avisos em 15 px (este em negrito); título do diálogo e valores dos indicadores em 17 px", () => {
    expect(declaracoes(bloco(css, ".dialogo h3")).get("font-size")).toBe("15px");
    expect(declaracoes(bloco(css, ".periodo > h3, .titulo-do-periodo > h3")).get("font-size")).toBe(
      "15px",
    );
    const avisos = declaracoes(bloco(css, ".avisos h2"));
    expect(avisos.get("font-size")).toBe("15px");
    expect(avisos.get("font-weight")).toBe("700");
    expect(declaracoes(bloco(css, ".dialogo > h2")).get("font-size")).toBe("17px");
    expect(declaracoes(bloco(css, ".indicador dd")).get("font-size")).toBe("17px");
  });

  it("dicas, erros das células e rodapé em 13 px; etiquetas e subtítulo da marca em 12 px", () => {
    for (const seletor of [
      "td.dica",
      ".celula-em-edicao .erro",
      ".campo-linha-nova .erro",
      ".rodape",
    ]) {
      expect(declaracoes(bloco(css, seletor)).get("font-size"), seletor).toBe("13px");
    }
    expect(declaracoes(bloco(css, ".etiqueta")).get("font-size")).toBe("12px");
    expect(declaracoes(bloco(css, ".marca small")).get("font-size")).toBe("12px");
  });

  it("a marca e o título da tela de erro em 22 px; em telas estreitas a marca não tem tamanho próprio (fica em 22 px)", () => {
    expect(declaracoes(bloco(css, ".marca")).get("font-size")).toBe("22px");
    expect(declaracoes(bloco(estreita, ".marca")).has("font-size")).toBe(false);
    expect(declaracoes(bloco(css, ".tela-de-erro h1")).get("font-size")).toBe("22px");
  });
});
