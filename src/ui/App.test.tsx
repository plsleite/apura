// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
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
    for (const nome of ["Novo cálculo", "Abrir", "Salvar"]) {
      expect(screen.getByRole("button", { name: nome })).toBeDefined();
    }
    const relatorio = screen.getByRole("button", { name: "Relatório / PDF" }) as HTMLButtonElement;
    expect(relatorio.disabled).toBe(true);
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

  it("abre com a cópia publicada quando nenhum ambiente é injetado (sem rede)", () => {
    render(<App />);
    expect(screen.getByRole("contentinfo").textContent).toContain("Índices oficiais BCB/SGS");
  });
});
