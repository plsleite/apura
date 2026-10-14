// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calcular } from "../motor/calcular.ts";
import { calculoCompleto } from "../relatorio/testes/calculos.ts";
import App from "./App.tsx";
import { montarArquivo, serializarArquivo } from "./arquivo.ts";
import { ambienteDeTeste } from "./testes/ambiente-de-teste.ts";

// Simula um defeito do próprio programa ao montar o relatório.
vi.mock("../relatorio/Relatorio.tsx", () => ({
  Relatorio: () => {
    throw new Error("defeito simulado no relatório");
  },
}));

afterEach(cleanup);
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  return () => vi.restoreAllMocks();
});

describe("defeito ao montar o relatório (§18.6)", () => {
  it("só a área do relatório mostra a frase; “Voltar ao cálculo” devolve a tela intacta", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    const calculo = calculoCompleto();
    const texto = serializarArquivo(
      montarArquivo(calculo, calcular(calculo, ambienteDeTeste().congelar().tabela)),
    );
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.upload(
      within(screen.getByRole("dialog")).getByLabelText("Abrir arquivo do Apura (.json)"),
      new File([texto], "calculo.json", { type: "application/json" }),
    );
    await user.click(screen.getByRole("button", { name: "Relatório / PDF" }));
    expect(screen.getByRole("alert").textContent).toBe(
      "Não foi possível montar o relatório deste cálculo.",
    );
    expect(screen.queryByText(/Algo deu errado no Apura/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "← Voltar ao cálculo" }));
    expect((screen.getByLabelText("Nº do processo") as HTMLInputElement).value).toBe(
      "0800000-46.2026.8.12.0001",
    );
  });
});
