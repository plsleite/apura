// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App.tsx";
import { Anuncios } from "./componentes/Anuncios.tsx";
import { ambienteDeTeste } from "./testes/ambiente-de-teste.ts";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("região viva (§18.6)", () => {
  it("o total geral é anunciado cerca de um segundo depois da última mudança, nunca ao abrir", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<Anuncios totalGeral="R$ 100,00" avisos={1} />);
    const total = () => container.querySelector(".anuncio-do-total");
    expect(total()?.getAttribute("role")).toBe("status");
    act(() => vi.advanceTimersByTime(2000));
    expect(total()?.textContent).toBe("");
    rerender(<Anuncios totalGeral="R$ 200,00" avisos={1} />);
    act(() => vi.advanceTimersByTime(500));
    rerender(<Anuncios totalGeral="R$ 2.497,35" avisos={1} />);
    act(() => vi.advanceTimersByTime(900));
    expect(total()?.textContent).toBe("");
    act(() => vi.advanceTimersByTime(100));
    expect(total()?.textContent).toBe("Total geral: R$ 2.497,35");
  });

  it("a quantidade de avisos é anunciada quando muda", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<Anuncios totalGeral="R$ 1,00" avisos={1} />);
    const quantos = () => container.querySelector(".anuncio-dos-avisos");
    act(() => vi.advanceTimersByTime(2000));
    expect(quantos()?.textContent).toBe("");
    rerender(<Anuncios totalGeral="R$ 1,00" avisos={2} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(quantos()?.textContent).toBe("2 avisos no cálculo");
    rerender(<Anuncios totalGeral="R$ 1,00" avisos={0} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(quantos()?.textContent).toBe("Nenhum aviso no cálculo");
    rerender(<Anuncios totalGeral="R$ 1,00" avisos={1} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(quantos()?.textContent).toBe("1 aviso no cálculo");
  });

  it("no App, os anúncios ficam fora das colunas: “Novo cálculo” (que remonta as colunas) não os recria", async () => {
    const user = userEvent.setup();
    const { container } = render(<App ambiente={ambienteDeTeste()} />);
    const antes = container.querySelector(".anuncio-do-total");
    expect(antes?.closest(".principal")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Novo cálculo" }));
    expect(container.querySelector(".anuncio-do-total")).toBe(antes);
    expect(container.querySelectorAll(".anuncio-do-total")).toHaveLength(1);
  });
});
