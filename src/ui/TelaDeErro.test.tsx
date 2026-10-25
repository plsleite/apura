// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculoCompleto } from "../relatorio/testes/calculos.ts";
import App from "./App.tsx";
import { lerArquivo } from "./arquivo.ts";
import { Reserva } from "./componentes/Reserva.tsx";
import { TelaDeErro } from "./TelaDeErro.tsx";
import { ambienteDeTeste } from "./testes/ambiente-de-teste.ts";

afterEach(cleanup);
// o React registra no console o erro que a reserva capturou: silenciado nestes testes
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  return () => vi.restoreAllMocks();
});

function Defeito(): never {
  throw new Error("defeito simulado");
}

describe("tela de erro de reserva (§18.6)", () => {
  it("Reserva mostra o conteúdo e, se ele lançar erro, a reserva no lugar", () => {
    const { rerender } = render(
      <Reserva reserva={<p>Reserva.</p>}>
        <p>Conteúdo.</p>
      </Reserva>,
    );
    expect(screen.getByText("Conteúdo.")).toBeDefined();
    rerender(
      <Reserva reserva={<p>Reserva.</p>}>
        <Defeito />
      </Reserva>,
    );
    expect(screen.getByText("Reserva.")).toBeDefined();
  });

  it("“Salvar o cálculo” baixa o último cálculo exibido, sem o resultado, e o arquivo abre com o aviso de sempre", async () => {
    const user = userEvent.setup();
    const ambiente = ambienteDeTeste();
    const calculo = calculoCompleto();
    render(<TelaDeErro ambiente={ambiente} calculo={() => calculo} />);
    const alerta = screen.getByRole("alert");
    expect(alerta.querySelector("h1")?.textContent).toBe("Algo deu errado no Apura.");
    expect(alerta.querySelector("p")?.textContent).toBe(
      "O cálculo em andamento pode ser salvo num arquivo antes de recomeçar.",
    );
    await user.click(screen.getByRole("button", { name: "Salvar o cálculo" }));
    expect(ambiente.baixados[0]?.nome).toBe("apura-0800000-46.2026.8.12.0001-2026-10-11.json");
    const conteudo = ambiente.baixados[0]?.conteudo ?? "";
    expect(JSON.parse(conteudo)).not.toHaveProperty("resultado");
    const leitura = lerArquivo(conteudo);
    expect(leitura.ok).toBe(true);
    await user.click(screen.getByRole("button", { name: "Recarregar a página" }));
    expect(ambiente.recargas()).toBe(1);
  });

  it("sem cálculo exibido (o defeito veio antes), só “Recarregar a página”", () => {
    render(<TelaDeErro ambiente={ambienteDeTeste()} calculo={() => null} />);
    expect(screen.queryByRole("button", { name: "Salvar o cálculo" })).toBeNull();
    expect(screen.getByRole("button", { name: "Recarregar a página" })).toBeDefined();
  });

  it("no App: um defeito no meio do uso troca a página pela reserva, que salva o cálculo que estava na tela", async () => {
    const user = userEvent.setup();
    const ambiente = ambienteDeTeste();
    let quebrar = false;
    const hoje = ambiente.hoje;
    ambiente.hoje = () => {
      if (quebrar) throw new Error("defeito simulado");
      return hoje();
    };
    render(<App ambiente={ambiente} />);
    await user.type(screen.getByLabelText("Exequente (alimentando)"), "A. B.");
    quebrar = true;
    await user.click(screen.getByRole("button", { name: /^Tema: igual ao computador\./ }));
    expect(screen.getByRole("alert").textContent).toContain("Algo deu errado no Apura.");
    await user.click(screen.getByRole("button", { name: "Salvar o cálculo" }));
    const salvo = JSON.parse(ambiente.baixados[0]?.conteudo ?? "{}") as {
      calculo?: { cabecalho?: { exequente?: string } };
    };
    expect(salvo.calculo?.cabecalho?.exequente).toBe("A. B.");
  });
});
