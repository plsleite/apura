// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App.tsx";
import { ERRO_ARQUIVO_ILEGIVEL } from "./arquivo.ts";
import { CHAVE_RECENTES } from "./armazenamento.ts";
import {
  ambienteDeTeste,
  AGORA_DE_TESTE,
  armazenamentoEmMemoria,
} from "./testes/ambiente-de-teste.ts";

// Simula um defeito do próprio programa na leitura do arquivo (não um dado errado, que a leitura
// já devolve como erro): a exceção não pode escapar da abertura de um recente.
vi.mock("./arquivo.ts", async (original) => ({
  ...(await original<typeof import("./arquivo.ts")>()),
  lerArquivo: () => {
    throw new Error("defeito simulado na leitura");
  },
}));

afterEach(cleanup);

describe("Abrir um recente quando a leitura falha por defeito do programa", () => {
  it("a exceção vira a frase do painel, o painel fica aberto e o cálculo atual não muda", async () => {
    const user = userEvent.setup();
    const armazenamento = armazenamentoEmMemoria({
      [CHAVE_RECENTES]: JSON.stringify([
        {
          id: "r",
          atualizadoEm: AGORA_DE_TESTE,
          processo: "0800001-31.2026.8.12.0001",
          exequente: "",
          executado: "",
          texto: "{}",
        },
      ]),
    });
    render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: /^Abrir 0800001-31\.2026\.8\.12\.0001/,
      }),
    );
    const painel = within(screen.getByRole("dialog"));
    expect(painel.getByText(ERRO_ARQUIVO_ILEGIVEL)).toBeDefined();
    expect((screen.getByLabelText("Nº do processo") as HTMLInputElement).value).toBe("");
  });
});
