// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Dialogo } from "./Dialogo.tsx";

afterEach(cleanup);

function Exemplo() {
  const [aberto, setAberto] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setAberto(true)}>
        Abrir painel
      </button>
      <Dialogo titulo="Painel de teste" aberto={aberto} aoFechar={() => setAberto(false)}>
        <label htmlFor="a">Primeiro</label>
        <input id="a" />
        <button type="button" onClick={() => setAberto(false)}>
          Fechar
        </button>
      </Dialogo>
    </div>
  );
}

describe("Dialogo (painel modal acessível)", () => {
  it("abre com o foco no primeiro campo, tem título ligado, fecha com Esc e devolve o foco ao botão", async () => {
    const user = userEvent.setup();
    render(<Exemplo />);
    expect(screen.queryByRole("dialog")).toBeNull();
    const abrir = screen.getByRole("button", { name: "Abrir painel" });
    await user.click(abrir);
    const dialogo = screen.getByRole("dialog", { name: "Painel de teste" });
    expect(dialogo.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(screen.getByLabelText("Primeiro"));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(abrir);
  });

  it("Tab circula dentro do painel; o clique no fundo fecha", async () => {
    const user = userEvent.setup();
    render(<Exemplo />);
    await user.click(screen.getByRole("button", { name: "Abrir painel" }));
    const campo = screen.getByLabelText("Primeiro");
    const fechar = screen.getByRole("button", { name: "Fechar" });
    expect(document.activeElement).toBe(campo);
    await user.tab();
    expect(document.activeElement).toBe(fechar);
    await user.tab();
    expect(document.activeElement).toBe(campo);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(fechar);
    const fundo = screen.getByRole("dialog").parentElement as HTMLElement;
    fireEvent.mouseDown(fundo);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
