// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("com outro conteúdo no botão e outro nome (as etiquetas da tabela, §17.4), e flutuante: fecha ao rolar a página", async () => {
    const user = userEvent.setup();
    render(
      <Ajuda
        assunto="situação"
        nome="Situação da prestação de 05/09/2026: vincenda, ajustada"
        conteudoDoBotao={<>vincenda +1</>}
        classe="etiqueta"
        flutuante
      >
        Tudo sobre a linha.
      </Ajuda>,
    );
    const botao = screen.getByRole("button", {
      name: "Situação da prestação de 05/09/2026: vincenda, ajustada",
    });
    expect(botao.textContent).toBe("vincenda +1");
    expect(botao.className).toBe("etiqueta");
    await user.click(botao);
    const balao = screen.getByText("Tudo sobre a linha.");
    expect(balao.className).toBe("balao flutuante");
    // posição fixa, junto do botão, para não ficar presa na rolagem da tabela
    expect(balao.style.getPropertyValue("--balao-topo")).toMatch(/px$/);
    // rolar dentro do próprio balão (altura máxima com rolagem própria) não o fecha
    fireEvent.scroll(balao);
    expect(screen.getByText("Tudo sobre a linha.")).toBeDefined();
    fireEvent.scroll(window);
    expect(screen.queryByText("Tudo sobre a linha.")).toBeNull();
  });

  it("flutuante perto do pé da janela: o balão abre para cima do botão, em vez de sair da tela", async () => {
    const user = userEvent.setup();
    // botão de 700 a 720 px numa janela de 768 px; o balão tem 120 px de altura
    const medidas = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        const caixa = this.classList.contains("balao")
          ? { top: 0, bottom: 120, left: 0, right: 300, height: 120, width: 300 }
          : { top: 700, bottom: 720, left: 100, right: 160, height: 20, width: 60 };
        return { ...caixa, x: caixa.left, y: caixa.top, toJSON: () => caixa } as DOMRect;
      });
    render(
      <Ajuda assunto="pé" nome="Situação no pé" conteudoDoBotao="vincenda" flutuante>
        Tudo sobre a linha.
      </Ajuda>,
    );
    await user.click(screen.getByRole("button", { name: "Situação no pé" }));
    const balao = screen.getByText("Tudo sobre a linha.");
    expect(window.innerHeight).toBe(768);
    // 700 (topo do botão) − 6 − 120 (altura do balão) = 574
    expect(balao.style.getPropertyValue("--balao-topo")).toBe("574px");
    medidas.mockRestore();
  });
});
