// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Relatorio } from "./Relatorio.tsx";
import { calculoCompleto, calculoDeTeste, prestacao, resultadoDe } from "./testes/calculos.ts";

afterEach(cleanup);

function mostrar(calculo = calculoCompleto()) {
  return render(
    <Relatorio
      calculo={calculo}
      resultado={resultadoDe(calculo)}
      hoje="2026-10-13"
      versao="0.1.0"
    />,
  );
}

describe("Relatorio (§10.1, §18.3)", () => {
  it("faixa verde: órgão, título com a data do cálculo, processo, partes, defensor(a) e o logo", () => {
    mostrar();
    const faixa = screen.getByRole("banner");
    expect(within(faixa).getByRole("heading", { level: 1 }).textContent).toBe(
      "Demonstrativo discriminado e atualizado do crédito · 11/10/2026",
    );
    expect(faixa.textContent).toContain("1ª Defensoria Pública de Teste");
    expect(faixa.textContent).toContain("Processo nº 0800000-46.2026.8.12.0001");
    expect(faixa.textContent).toContain("Exequente: A. B. · Executado: C. D.");
    expect(faixa.textContent).toContain("Defensor(a): Defensor(a) de teste");
    const logo = within(faixa).getByRole("img", {
      name: "Defensoria Pública de Mato Grosso do Sul",
    });
    expect(logo.getAttribute("src")).toContain("logos/dpems-horizontal-branca-relatorio.png");
  });

  it("os cinco indicadores, na ordem, com a linha de apoio", () => {
    mostrar();
    const indicadores = screen.getByRole("list", { name: "Resumo do cálculo" });
    const itens = within(indicadores)
      .getAllByRole("listitem")
      .map((i) => i.textContent);
    expect(itens).toEqual([
      "Prestações atualizadasR$ 2.544,394 prestações, jul/2024 a nov/2026",
      "Amortizações atualizadasR$ 256,941 pagamento",
      "Total devido em 11/10/2026R$ 2.287,45prestações menos amortizações",
      "Multa e honoráriosR$ 457,5010% + 10% sobre o total devido",
      "Total geralR$ 2.744,95com multa e honorários",
    ]);
  });

  it("tabela de prestações: colunas, palavras na célula do vencimento, “—” na vincenda, totais na última linha do corpo e as notas", () => {
    mostrar();
    const tabela = screen.getByRole("table", { name: "Prestações" });
    expect(
      within(tabela)
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual([
      "Vencimento",
      "Valor",
      "Fator de correção",
      "Corrigido",
      "Juros %",
      "Juros R$",
      "Atualizado",
    ]);
    const linhas = within(tabela).getAllByRole("row").slice(1);
    const celulas = (i: number) =>
      within(linhas[i] as HTMLElement)
        .getAllByRole("cell")
        .map((c) => c.textContent);
    expect(celulas(1)).toEqual([
      "05/10/2024 · valor informado",
      "600,00",
      "1,098862",
      "659,32",
      "17,134181%",
      "112,97",
      "772,29",
    ]);
    expect(celulas(3)).toEqual(["05/11/2026 · vincenda", "500,00", "—", "—", "—", "—", "500,00"]);
    expect(celulas(4)).toEqual(["Totais", "2.100,00", "", "1.746,43", "", "297,96", "2.544,39"]);
    expect(tabela.querySelector("tfoot")).toBe(null);
    const notas = screen.getByRole("list", { name: "Notas da tabela de prestações" });
    // só os itens de primeiro nível (os de "Encargos próprios" ficam numa lista dentro do item)
    expect(Array.from(notas.children).map((n) => n.textContent)).toEqual([
      "Vincenda: vencimento posterior à data do cálculo; incluída pelo valor nominal, sem correção e sem juros (art. 323 do CPC).",
      "Valor informado: valor indicado no cálculo, em vez do apurado pela base dos alimentos.",
      "Encargos próprios:05/03/2025: correção desde 10/04/2025; juros desde 01/05/2025.",
    ]);
  });

  it("tabela de amortizações: “Data” com a descrição e o pagamento não computado; sem pagamentos, a frase", () => {
    mostrar();
    const tabela = screen.getByRole("table", { name: "Amortizações" });
    expect(within(tabela).getAllByRole("columnheader")[0]?.textContent).toBe("Data");
    const linhas = within(tabela).getAllByRole("row");
    expect(linhas[2]?.textContent).toBe(
      "10/11/2026 · Pagamento parcial · não computado150,00—————",
    );
    cleanup();
    mostrar(calculoDeTeste());
    expect(screen.queryByRole("table", { name: "Amortizações" })).toBe(null);
    expect(screen.getByText("Não há pagamentos a abater.")).toBeTruthy();
  });

  it("totais, metodologia e fundamentos, índices aplicados e rodapé", () => {
    mostrar();
    const totais = screen.getByRole("region", { name: "Totais em 11/10/2026" });
    expect(totais.textContent).toContain("Amortizações atualizadas− 256,94");
    expect(totais.textContent).toContain("Total geral2.744,95");
    const metodologia = screen.getByRole("region", { name: "Metodologia e fundamentos" });
    expect(
      within(metodologia)
        .getAllByRole("paragraph")
        .map((p) => p.firstChild?.textContent),
    ).toEqual([
      "Base.",
      "Termos.",
      "Encargos.",
      "Amortizações.",
      "Multa e honorários.",
      "Fontes e arredondamento.",
    ]);
    const indices = screen.getByRole("region", { name: "Índices aplicados" });
    expect(indices.textContent).toContain(
      "O ponto indica mês sem índice divulgado na data da consulta.",
    );
    expect(
      within(indices)
        .getAllByRole("table")
        .map((t) => t.getAttribute("aria-label")),
    ).toEqual(["IGP-M", "IPCA", "taxa legal"]);
    const rodape = screen.getByRole("contentinfo");
    expect(rodape.textContent).toBe(
      "Defensoria Pública de Mato Grosso do Sul · 1ª Defensoria Pública de TesteFonte dos índices: BCB/SGS · Gerado com Apura v0.1.0 em 13/10/2026",
    );
  });

  it("sem parâmetros de sistema: o nome Apura só no rodapé; nada de “ajuste”, “personalização”, “SAJ” ou o nome da opção", () => {
    const { container } = mostrar();
    const texto = container.textContent ?? "";
    expect(texto.match(/Apura/g)).toHaveLength(1);
    expect(texto).not.toMatch(/\bajust|personaliz|\bSAJ\b|igpm-juros|lei14905/i);
  });

  it("duas notas de encargos próprios iguais não repetem a chave do React", () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const igual = { encargos: { termoInicialJuros: "2025-05-01" } };
    mostrar(
      calculoDeTeste({
        lancamentos: [
          prestacao("2025-03-05", { id: "a", ...igual }),
          prestacao("2025-03-05", { id: "b", ...igual }),
        ],
      }),
    );
    expect(erro).not.toHaveBeenCalled();
    erro.mockRestore();
  });
});
