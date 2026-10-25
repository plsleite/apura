// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../App.tsx";
import { CHAVE_PREFERENCIAS, CHAVE_RECENTES } from "../armazenamento.ts";
import {
  ambienteDeTeste,
  armazenamentoEmMemoria,
  armazenamentoQueFalha,
} from "../testes/ambiente-de-teste.ts";

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-theme");
});

function preferenciasGravadas(armazenamento: Storage): unknown {
  return JSON.parse(armazenamento.getItem(CHAVE_PREFERENCIAS) ?? "null");
}

describe("1 · Processo: número do processo no padrão do CNJ (decisão de 13/10/2026)", () => {
  it("a máscara põe hífen e pontos ao digitar; dígito verificador errado ou número incompleto mostram erro; vazio é aceito", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    const campo = screen.getByLabelText("Nº do processo") as HTMLInputElement;
    await user.type(campo, "080000046202681200");
    expect(campo.value).toBe("0800000-46.2026.8.12.00");
    // incompleto: nada em vermelho enquanto digita; o erro aparece ao sair do campo
    expect(screen.queryByRole("alert")).toBeNull();
    expect(campo.getAttribute("aria-invalid")).toBeNull();
    await user.tab();
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toBe(
      "Número do processo inválido (confira os dígitos).",
    );
    await user.type(campo, "01");
    expect(campo.value).toBe("0800000-46.2026.8.12.0001");
    expect(screen.queryByRole("alert")).toBeNull();
    // colado com pontuação e dígito verificador errado: erro
    await user.tripleClick(campo);
    await user.paste("0800000-45.2026.8.12.0001");
    expect(campo.value).toBe("0800000-45.2026.8.12.0001");
    expect(screen.queryByRole("alert")).toBeNull();
    await user.tab();
    expect(screen.getByRole("alert").textContent).toBe(
      "Número do processo inválido (confira os dígitos).",
    );
    // colado com texto antes (do PDF): só os números contam
    await user.tripleClick(campo);
    await user.paste("Processo nº 0800000-46.2026.8.12.0001");
    expect(campo.value).toBe("0800000-46.2026.8.12.0001");
    expect(screen.queryByRole("alert")).toBeNull();
    // Backspace logo depois do hífen apaga o dígito antes dele, e o cursor fica no lugar
    campo.setSelectionRange(8, 8);
    await user.keyboard("{Backspace}");
    expect(campo.value).toBe("0800004-62.0268.1.20.001");
    expect(campo.selectionStart).toBe(6);
    // apagar tudo é aceito (cálculo antes de existir processo)
    await user.clear(campo);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("a seção 1 não tem 'Lembrar', 'Esquecer' nem 'Guardar cálculos recentes', nem os balões 'Processo' e 'cálculos recentes' (§21.4)", () => {
    render(<App ambiente={ambienteDeTeste()} />);
    expect(screen.queryByLabelText("Lembrar neste navegador")).toBeNull();
    expect(screen.queryByRole("button", { name: "Esquecer" })).toBeNull();
    expect(screen.queryByLabelText(/Guardar cálculos recentes/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Ajuda: Processo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Ajuda: cálculos recentes" })).toBeNull();
  });
});

describe("1 · Processo: preferências e recentes no navegador (§5.5)", () => {
  it("lembra defensor(a) e órgão enquanto digita e os preenche no próximo cálculo", async () => {
    const user = userEvent.setup();
    const ambiente = ambienteDeTeste();
    render(<App ambiente={ambiente} />);
    await user.type(screen.getByLabelText("Defensor(a) responsável"), "Defensor(a) de teste");
    await user.type(screen.getByLabelText("Órgão de atuação"), "1ª Defensoria de teste");
    expect(preferenciasGravadas(ambiente.armazenado as Storage)).toEqual({
      defensor: "Defensor(a) de teste",
      orgao: "1ª Defensoria de teste",
      tema: "sistema",
      metodologia: "lei14905",
    });
    await user.type(screen.getByLabelText("Nº do processo"), "08000004620268120001");
    await user.click(screen.getByRole("button", { name: "Novo cálculo" }));
    expect((screen.getByLabelText("Defensor(a) responsável") as HTMLInputElement).value).toBe(
      "Defensor(a) de teste",
    );
    expect((screen.getByLabelText("Órgão de atuação") as HTMLInputElement).value).toBe(
      "1ª Defensoria de teste",
    );
    expect((screen.getByLabelText("Nº do processo") as HTMLInputElement).value).toBe("");
  });

  it("abre com os nomes gravados antes, mesmo de quem tinha desligado 'Lembrar', e continua gravando (§21.4)", async () => {
    const user = userEvent.setup();
    const armazenamento = armazenamentoEmMemoria({
      [CHAVE_PREFERENCIAS]: JSON.stringify({
        defensor: "Quem ficou gravado",
        orgao: "Órgão gravado",
        lembrar: false,
        guardarRecentes: false,
      }),
    });
    render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
    const defensor = screen.getByLabelText("Defensor(a) responsável") as HTMLInputElement;
    expect(defensor.value).toBe("Quem ficou gravado");
    await user.type(defensor, " e mais");
    expect(defensor.value).toBe("Quem ficou gravado e mais");
    expect(preferenciasGravadas(armazenamento)).toEqual({
      defensor: "Quem ficou gravado e mais",
      orgao: "Órgão gravado",
      tema: "sistema",
      metodologia: "lei14905",
    });
  });

  it("os recentes são sempre guardados, mesmo com a opção antiga desligada (§21.4)", async () => {
    const user = userEvent.setup();
    const armazenamento = armazenamentoEmMemoria({
      [CHAVE_PREFERENCIAS]: JSON.stringify({ guardarRecentes: false }),
    });
    render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
    await user.type(screen.getByLabelText("Nº do processo"), "08000004620268120001");
    expect(JSON.parse(armazenamento.getItem(CHAVE_RECENTES) ?? "[]")).toHaveLength(1);
  });

  it("sem armazenamento (bloqueado ou ausente), a tela funciona e avisa que nada é guardado", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste({ armazenamento: null })} />);
    expect(screen.getByText(/Este navegador não permite guardar nada/).textContent).toBe(
      "Este navegador não permite guardar nada: os cálculos recentes não ficam guardados, e defensor(a), órgão e tema valem só até recarregar ou fechar a página.",
    );
    await user.type(screen.getByLabelText("Defensor(a) responsável"), "Ninguém");
    // igual ao computador → claro → escuro
    await user.click(
      screen.getByRole("button", { name: "Tema: igual ao computador. Clique para claro." }),
    );
    await user.click(screen.getByRole("button", { name: "Tema: claro. Clique para escuro." }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    cleanup();
    document.documentElement.removeAttribute("data-theme");
    render(<App ambiente={ambienteDeTeste({ armazenamento: armazenamentoQueFalha() })} />);
    await user.type(screen.getByLabelText("Órgão de atuação"), "Órgão");
    expect((screen.getByLabelText("Órgão de atuação") as HTMLInputElement).value).toBe("Órgão");
    await user.click(
      screen.getByRole("button", { name: "Tema: igual ao computador. Clique para claro." }),
    );
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("o botão de tema é um ícone: igual ao computador → claro → escuro → igual ao computador, com o nome e a dica dizendo o atual e o próximo (§21.7)", async () => {
    const user = userEvent.setup();
    const armazenamento = armazenamentoEmMemoria();
    render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
    const botao = screen.getByRole("button", {
      name: "Tema: igual ao computador. Clique para claro.",
    });
    const icone = () => botao.querySelector("svg")?.getAttribute("data-icone");
    expect(botao.textContent).toBe("");
    expect(botao.getAttribute("title")).toBe("Tema: igual ao computador. Clique para claro.");
    expect(icone()).toBe("meio");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    await user.click(botao);
    expect(botao.getAttribute("aria-label")).toBe("Tema: claro. Clique para escuro.");
    expect(botao.getAttribute("title")).toBe("Tema: claro. Clique para escuro.");
    expect(icone()).toBe("sol");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect((preferenciasGravadas(armazenamento) as { tema: string }).tema).toBe("claro");
    await user.click(botao);
    expect(botao.getAttribute("aria-label")).toBe("Tema: escuro. Clique para igual ao computador.");
    expect(icone()).toBe("lua");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect((preferenciasGravadas(armazenamento) as { tema: string }).tema).toBe("escuro");
    // pelo teclado também: Enter no botão volta a "igual ao computador"
    botao.focus();
    await user.keyboard("{Enter}");
    expect(botao.getAttribute("aria-label")).toBe("Tema: igual ao computador. Clique para claro.");
    expect(icone()).toBe("meio");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect((preferenciasGravadas(armazenamento) as { tema: string }).tema).toBe("sistema");
  });

  it("abre com o tema guardado, e digitar o defensor não o apaga", async () => {
    const user = userEvent.setup();
    const armazenamento = armazenamentoEmMemoria({
      [CHAVE_PREFERENCIAS]: JSON.stringify({ tema: "escuro" }),
    });
    render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
    expect(screen.getByRole("button", { name: /^Tema: escuro\./ })).toBeDefined();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    await user.type(screen.getByLabelText("Defensor(a) responsável"), "Alguém");
    expect(preferenciasGravadas(armazenamento)).toEqual({
      defensor: "Alguém",
      orgao: "",
      tema: "escuro",
      metodologia: "lei14905",
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
