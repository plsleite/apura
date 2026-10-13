// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Ajuda } from "./Ajuda.tsx";
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

function ExemploQueRemove() {
  const [aberto, setAberto] = useState(false);
  const [comBotao, setComBotao] = useState(true);
  return (
    <div>
      <button type="button" onClick={() => setAberto(true)}>
        Abrir painel
      </button>
      <Dialogo titulo="Painel de teste" aberto={aberto} aoFechar={() => setAberto(false)}>
        <p>Texto do painel.</p>
        <Ajuda assunto="painel">Texto da ajuda.</Ajuda>
        <label htmlFor="a">Primeiro</label>
        <input id="a" />
        {comBotao ? (
          <button type="button" onClick={() => setComBotao(false)}>
            Remover este botão
          </button>
        ) : null}
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

  it("clicar no título ou num texto do painel não tira o teclado dele: Tab circula dentro e Esc fecha", async () => {
    const user = userEvent.setup();
    render(<ExemploQueRemove />);
    const abrir = screen.getByRole("button", { name: "Abrir painel" });
    await user.click(abrir);
    const dialogo = screen.getByRole("dialog");
    await user.click(screen.getByRole("heading", { name: "Painel de teste" }));
    expect(document.activeElement).not.toBe(document.body);
    await user.tab();
    expect(dialogo.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(dialogo);
    await user.click(screen.getByText("Texto do painel."));
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Fechar" }));
    await user.click(screen.getByText("Texto do painel."));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(abrir);
  });

  it("quando o controle focado some (ex.: remover uma divisão), Tab continua dentro e Esc fecha", async () => {
    const user = userEvent.setup();
    render(<ExemploQueRemove />);
    await user.click(screen.getByRole("button", { name: "Abrir painel" }));
    const dialogo = screen.getByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Remover este botão" }));
    expect(screen.queryByRole("button", { name: "Remover este botão" })).toBeNull();
    expect(dialogo.contains(document.activeElement)).toBe(true);
    await user.tab();
    expect(dialogo.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(dialogo);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Esc com o foco fora do painel (no corpo da página) também fecha", async () => {
    const user = userEvent.setup();
    render(<ExemploQueRemove />);
    await user.click(screen.getByRole("button", { name: "Abrir painel" }));
    (document.activeElement as HTMLElement).blur();
    expect(document.activeElement).toBe(document.body);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Esc num balão ⓘ dentro do painel fecha só o balão", async () => {
    const user = userEvent.setup();
    render(<ExemploQueRemove />);
    await user.click(screen.getByRole("button", { name: "Abrir painel" }));
    await user.click(screen.getByRole("button", { name: "Ajuda: painel" }));
    expect(screen.getByText("Texto da ajuda.")).toBeDefined();
    await user.keyboard("{Escape}");
    expect(screen.queryByText("Texto da ajuda.")).toBeNull();
    expect(screen.getByRole("dialog")).toBeDefined();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
