// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { Calculo } from "../compartilhado/tipos.ts";
import { calcular } from "../motor/calcular.ts";
import { baseUnica } from "../motor/base.ts";
import { calculoCompleto, prestacao } from "../relatorio/testes/calculos.ts";
import App from "./App.tsx";
import { montarArquivo, serializarArquivo } from "./arquivo.ts";
import { ambienteDeTeste } from "./testes/ambiente-de-teste.ts";

afterEach(cleanup);

/** Abre o cálculo pelo painel "Abrir", como um arquivo salvo. */
async function abrir(user: ReturnType<typeof userEvent.setup>, calculo: Calculo) {
  const resultado = calcular(calculo, ambienteDeTeste().congelar().tabela);
  const texto = serializarArquivo(montarArquivo(calculo, resultado));
  await user.click(screen.getByRole("button", { name: "Abrir" }));
  const painel = within(screen.getByRole("dialog", { name: "Abrir cálculo" }));
  await user.upload(
    painel.getByLabelText("Abrir arquivo do Apura (.json)"),
    new File([texto], "calculo.json", { type: "application/json" }),
  );
}

const botao = () => screen.getByRole("button", { name: "Relatório / PDF" }) as HTMLButtonElement;

describe("Relatório na tela (§18.1)", () => {
  it("com prestação sem valor, o botão fica desligado e o title diz quantas e onde corrigir", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    await abrir(
      user,
      calculoCompleto({
        base: baseUnica({ tipo: "percentualSalarioMinimo", percentual: "" }),
        lancamentos: [prestacao("2024-10-05"), prestacao("2024-11-05")],
      }),
    );
    expect(botao().disabled).toBe(true);
    expect(botao().title).toBe(
      "2 prestações estão sem valor (veja a caixa de avisos): complete a base ou informe o valor para gerar o relatório.",
    );
  });

  it("abre no lugar das colunas, com a faixa de ações e a faixa “Antes de juntar, confira:”; imprime; volta como estava", async () => {
    const user = userEvent.setup();
    const ambiente = ambienteDeTeste();
    document.title = "Apura · Sistema de Cálculos Judiciais";
    render(<App ambiente={ambiente} />);
    await abrir(user, calculoCompleto());
    await user.click(screen.getByRole("button", { name: "+ Observações para o relatório" }));
    await user.type(screen.getByLabelText("Observações para o relatório"), "Conforme o acordo.");
    expect(botao().disabled).toBe(false);
    expect(botao().title).toBe("");
    await user.click(botao());

    const relatorio = screen.getByRole("article", {
      name: "Demonstrativo discriminado e atualizado do crédito · 11/10/2026",
    });
    // o foco vai para o título do relatório
    expect(document.activeElement?.textContent).toBe(
      "Demonstrativo discriminado e atualizado do crédito · 11/10/2026",
    );
    // as colunas do cálculo ficam escondidas (continuam montadas: o campo existe, fora da vista)
    expect(screen.getByLabelText("Nº do processo").closest("main")?.hidden).toBe(true);
    expect(screen.queryByRole("textbox", { name: "Nº do processo" })).toBeNull();
    expect(document.title).toBe("Apura – 0800000-46.2026.8.12.0001 – 11-10-2026");
    expect(relatorio.textContent).toContain("Observações. Conforme o acordo.");
    const confira = screen.getByRole("region", { name: "Antes de juntar, confira:" });
    expect(confira.textContent).toContain(
      "Prestações vincendas, incluídas pelo valor nominal, sem correção e sem juros: nov/2026.",
    );

    await user.click(screen.getByRole("button", { name: "Imprimir / Salvar PDF" }));
    expect(ambiente.impressoes()).toBe(1);

    await user.click(screen.getByRole("button", { name: "← Voltar ao cálculo" }));
    expect(screen.queryByRole("article")).toBeNull();
    expect(
      (screen.getByLabelText("Observações para o relatório") as HTMLTextAreaElement).value,
    ).toBe("Conforme o acordo.");
    expect(document.activeElement).toBe(botao());
    expect(document.title).toBe("Apura · Sistema de Cálculos Judiciais");
  });

  it("o relatório e o botão da barra não dividem classe (o CSS de um não deforma o outro)", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    await abrir(user, calculoCompleto());
    await user.click(botao());
    const doRelatorio = new Set(screen.getByRole("article").classList);
    expect([...botao().classList].filter((c) => doRelatorio.has(c))).toEqual([]);
  });

  it("“Novo cálculo” com o relatório aberto volta à tela de cálculo", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    await abrir(user, calculoCompleto());
    await user.click(botao());
    expect(screen.getByRole("article")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Novo cálculo" }));
    expect(screen.queryByRole("article")).toBeNull();
    expect(screen.getByLabelText("Nº do processo")).toBeDefined();
  });

  it("na tela de cálculo, a impressão só leva a frase que manda usar o botão (§18.2)", async () => {
    const user = userEvent.setup();
    const { container } = render(<App ambiente={ambienteDeTeste()} />);
    const frase = container.querySelector(".so-na-impressao");
    expect(frase?.textContent).toBe("Para imprimir o demonstrativo, use o botão Relatório / PDF.");
    await abrir(user, calculoCompleto());
    await user.click(botao());
    expect(container.querySelector(".so-na-impressao")).toBeNull();
    expect(container.querySelector(".app")?.classList.contains("vendo-relatorio")).toBe(true);
  });
});
