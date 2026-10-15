// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App.tsx";
import { ambienteDeTeste } from "./testes/ambiente-de-teste.ts";

afterEach(cleanup);

describe("App (fundação da tela)", () => {
  it("mostra o nome do sistema, as quatro ações da barra e o rodapé com a situação dos índices", () => {
    render(<App ambiente={ambienteDeTeste()} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Apura · Sistema de Cálculos Judiciais · DPE-MS",
    );
    const logo = screen.getByRole("img", { name: "Defensoria Pública de Mato Grosso do Sul" });
    expect(logo.getAttribute("src")).toBe("/logos/dpems-horizontal-branca.png");
    expect([logo.getAttribute("width"), logo.getAttribute("height")]).toEqual(["368", "88"]);
    for (const nome of ["Novo cálculo", "Abrir", "Salvar"]) {
      expect(screen.getByRole("button", { name: nome })).toBeDefined();
    }
    const relatorio = screen.getByRole("button", { name: "Relatório / PDF" }) as HTMLButtonElement;
    // cálculo em branco: sem prestação, o relatório não abre (§18.1)
    expect(relatorio.disabled).toBe(true);
    expect(relatorio.title).toBe("Lance ao menos uma prestação para gerar o relatório.");
    const rodape = screen.getByRole("contentinfo").textContent ?? "";
    expect(rodape).toContain(
      "Índices oficiais BCB/SGS · IPCA até set/2026 · atualizados em 11/10/2026 09:00 (horário de Brasília)",
    );
    expect(rodape).toMatch(/Apura v\d+\.\d+\.\d+ · Defensoria Pública de Mato Grosso do Sul/);
    // com a tabela em dia, não há aviso do calendário
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).not.toContain(
      "ainda não chegou ao Apura",
    );
  });

  it("as cinco seções da esquerda vêm na ordem da §20: processo, base, encargos, prestações, pagamentos (decisão de 15/10/2026)", () => {
    render(<App ambiente={ambienteDeTeste()} />);
    const esquerda = document.querySelector(".coluna-esquerda") as HTMLElement;
    const titulos = within(esquerda)
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(titulos).toEqual([
      "1 · Processo",
      "2 · Base dos alimentos",
      "3 · Encargos e data do cálculo",
      "4 · Prestações em atraso",
      "5 · Pagamentos",
    ]);
    // a tabela vazia aponta para a seção certa
    expect(screen.getByText(/Nenhuma prestação lançada/).textContent).toBe(
      'Nenhuma prestação lançada: use "Lançar em lote" na seção 4 ou "+ Prestação".',
    );
    expect(screen.getByText(/Nenhum pagamento lançado/).textContent).toBe(
      'Nenhum pagamento lançado: use "Lançar em lote" na seção 5 ou "+ Pagamento".',
    );
  });

  it("mostra na caixa de avisos os meses já divulgados que ainda não chegaram ao Apura", () => {
    render(<App ambiente={ambienteDeTeste({ limites: { "433": "2026-07" } })} />);
    const avisos = screen.getByRole("region", { name: "Avisos" });
    expect(avisos.textContent).toContain(
      "IPCA de ago/2026, divulgado por volta de 10/09/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
    );
  });

  it("congela a tabela ao abrir e de novo em 'Novo cálculo'; o cálculo em branco mostra 'Nenhum lançamento.'", async () => {
    const ambiente = ambienteDeTeste();
    render(<App ambiente={ambiente} />);
    expect(ambiente.congelamentos()).toBe(1);
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).toContain(
      "Nenhum lançamento.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Novo cálculo" }));
    expect(ambiente.congelamentos()).toBe(2);
  });

  it("'Ajustar' abre o editor de períodos num painel; a mudança reflete no resumo; Esc fecha", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    await user.click(screen.getByRole("button", { name: "Ajustar" }));
    const painel = screen.getByRole("dialog", { name: "Ajustar a metodologia de encargos" });
    expect(painel).toBeDefined();
    await user.selectOptions(
      within(painel).getAllByLabelText("Índice de correção")[0] as HTMLElement,
      "INPC",
    );
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(/^Ajustada:/).textContent).toBe(
      "Ajustada: Até 29/08/2024: INPC e juros de 1% ao mês. Desde 30/08/2024: IPCA e taxa legal.",
    );
    expect(screen.getByText(/^Metodologia de encargos/).textContent).toBe(
      "Metodologia de encargos (ajustada)",
    );
  });

  it("todo campo de data vai de 01/01/1900 a 31/12/2199 (o teto de datas)", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    const conferir = () => {
      const campos = [...document.querySelectorAll<HTMLInputElement>('input[type="date"]')];
      expect(campos.length).toBeGreaterThan(0);
      for (const campo of campos) {
        expect([campo.id || campo.getAttribute("aria-label"), campo.min, campo.max]).toEqual([
          campo.id || campo.getAttribute("aria-label"),
          "1900-01-01",
          "2199-12-31",
        ]);
      }
      return campos.length;
    };
    conferir();
    const prestacoes = within(screen.getByRole("region", { name: /4 · Prestações em atraso/ }));
    await user.click(prestacoes.getByLabelText("Meses em atraso"));
    await user.type(prestacoes.getByLabelText("Dia do vencimento"), "5");
    await user.type(prestacoes.getByLabelText("Quantos meses"), "2");
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    await user.click(prestacoes.getByLabelText("Intervalo de vencimentos"));
    conferir();
    await user.click(screen.getByRole("button", { name: "+ Prestação" }));
    conferir();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Ajustar" }));
    conferir();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Personalizar prestação de 05/09/2026" }));
    await user.click(
      screen.getByLabelText("Usar regras próprias de correção e juros neste lançamento"),
    );
    expect(conferir()).toBeGreaterThanOrEqual(5);
  });

  it("abre com a cópia publicada quando nenhum ambiente é injetado (sem rede)", () => {
    render(<App />);
    expect(screen.getByRole("contentinfo").textContent).toContain("Índices oficiais BCB/SGS");
  });
});
