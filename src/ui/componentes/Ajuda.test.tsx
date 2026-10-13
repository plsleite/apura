// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Ajuda } from "./Ajuda.tsx";

afterEach(cleanup);

function Exemplo() {
  return (
    <div>
      <h2>Seção de teste</h2>
      <Ajuda assunto="seção de teste">Texto da ajuda.</Ajuda>
      <button type="button">Outro botão</button>
    </div>
  );
}

describe("Ajuda (toggletip: ajuda sob demanda)", () => {
  it("abre com clique e fecha com novo clique; o conteúdo entra numa região de status", async () => {
    const user = userEvent.setup();
    render(<Exemplo />);
    const botao = screen.getByRole("button", { name: "Ajuda: seção de teste" });
    expect(botao.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Texto da ajuda.")).toBeNull();
    await user.click(botao);
    expect(botao.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("status").textContent).toBe("Texto da ajuda.");
    await user.click(botao);
    expect(screen.queryByText("Texto da ajuda.")).toBeNull();
  });

  it("abre pelo teclado; Esc, clique fora e foco fora fecham", async () => {
    const user = userEvent.setup();
    render(<Exemplo />);
    const botao = screen.getByRole("button", { name: "Ajuda: seção de teste" });
    botao.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByText("Texto da ajuda.")).toBeDefined();
    await user.keyboard("{Escape}");
    expect(screen.queryByText("Texto da ajuda.")).toBeNull();
    expect(document.activeElement).toBe(botao);
    await user.keyboard(" ");
    expect(screen.getByText("Texto da ajuda.")).toBeDefined();
    await user.click(screen.getByRole("heading", { name: "Seção de teste" }));
    expect(screen.queryByText("Texto da ajuda.")).toBeNull();
    await user.click(botao);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Outro botão" }));
    expect(screen.queryByText("Texto da ajuda.")).toBeNull();
  });
});
