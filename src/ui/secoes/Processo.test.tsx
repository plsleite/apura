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

  it("as explicações ficam nos balões ⓘ, não em texto fixo", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    expect(screen.queryByText(/não são gravados em servidor algum/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Ajuda: Processo" }));
    expect(screen.getByText(/não são gravados em servidor algum/)).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Ajuda: cálculos recentes" }));
    expect(screen.getByText(/Em computador compartilhado, desligue/)).toBeDefined();
    expect(screen.queryByText(/não são gravados em servidor algum/)).toBeNull();
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
      lembrar: true,
      guardarRecentes: true,
      tema: "sistema",
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

  it("abre com os nomes gravados antes; desligar 'Lembrar' apaga os nomes gravados e para de gravar", async () => {
    const user = userEvent.setup();
    const armazenamento = armazenamentoEmMemoria({
      [CHAVE_PREFERENCIAS]: JSON.stringify({
        defensor: "Quem ficou gravado",
        orgao: "Órgão gravado",
        lembrar: true,
        guardarRecentes: true,
      }),
    });
    render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
    const defensor = screen.getByLabelText("Defensor(a) responsável") as HTMLInputElement;
    expect(defensor.value).toBe("Quem ficou gravado");
    await user.click(screen.getByLabelText("Lembrar neste navegador"));
    expect(preferenciasGravadas(armazenamento)).toEqual({
      defensor: "",
      orgao: "",
      lembrar: false,
      guardarRecentes: true,
      tema: "sistema",
    });
    await user.type(defensor, " e mais");
    expect(defensor.value).toBe("Quem ficou gravado e mais");
    expect((preferenciasGravadas(armazenamento) as { defensor: string }).defensor).toBe("");
  });

  it("'Esquecer' apaga preferências e recentes, desliga 'Lembrar' e mantém o cálculo na tela", async () => {
    const user = userEvent.setup();
    const armazenamento = armazenamentoEmMemoria({ [CHAVE_RECENTES]: "[]" });
    render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
    const defensor = screen.getByLabelText("Defensor(a) responsável") as HTMLInputElement;
    await user.type(defensor, "Alguém");
    await user.click(screen.getByRole("button", { name: "Esquecer" }));
    expect(armazenamento.getItem(CHAVE_RECENTES)).toBeNull();
    expect(preferenciasGravadas(armazenamento)).toEqual({
      defensor: "",
      orgao: "",
      lembrar: false,
      guardarRecentes: true,
      tema: "sistema",
    });
    expect((screen.getByLabelText("Lembrar neste navegador") as HTMLInputElement).checked).toBe(
      false,
    );
    expect(defensor.value).toBe("Alguém");
  });

  it("desligar 'Guardar cálculos recentes' apaga os recentes já guardados", async () => {
    const user = userEvent.setup();
    const armazenamento = armazenamentoEmMemoria({ [CHAVE_RECENTES]: "[]" });
    render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
    await user.click(screen.getByLabelText("Guardar cálculos recentes neste navegador"));
    expect(armazenamento.getItem(CHAVE_RECENTES)).toBeNull();
    expect(
      (preferenciasGravadas(armazenamento) as { guardarRecentes: boolean }).guardarRecentes,
    ).toBe(false);
  });

  it("sem armazenamento (bloqueado ou ausente), a tela funciona e avisa que nada é guardado", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste({ armazenamento: null })} />);
    expect(screen.getByText(/Este navegador não permite guardar nada/).textContent).toContain(
      "não permite guardar nada",
    );
    await user.type(screen.getByLabelText("Defensor(a) responsável"), "Ninguém");
    await user.click(screen.getByRole("button", { name: "Esquecer" }));
    // do sistema → claro → escuro
    await user.click(screen.getByRole("button", { name: "Tema do sistema" }));
    await user.click(screen.getByRole("button", { name: "Tema claro" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    cleanup();
    document.documentElement.removeAttribute("data-theme");
    render(<App ambiente={ambienteDeTeste({ armazenamento: armazenamentoQueFalha() })} />);
    await user.type(screen.getByLabelText("Órgão de atuação"), "Órgão");
    expect((screen.getByLabelText("Órgão de atuação") as HTMLInputElement).value).toBe("Órgão");
    await user.click(screen.getByRole("button", { name: "Tema do sistema" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("o botão de tema alterna do sistema → claro → escuro → do sistema, aplica na raiz e fica guardado", async () => {
    const user = userEvent.setup();
    const armazenamento = armazenamentoEmMemoria();
    render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
    const botao = screen.getByRole("button", { name: /^Tema / });
    expect(botao.textContent).toBe("Tema do sistema");
    expect(botao.getAttribute("title")).toBe("Clique para mudar para o tema claro");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    await user.click(botao);
    expect(botao.textContent).toBe("Tema claro");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect((preferenciasGravadas(armazenamento) as { tema: string }).tema).toBe("claro");
    await user.click(botao);
    expect(botao.textContent).toBe("Tema escuro");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect((preferenciasGravadas(armazenamento) as { tema: string }).tema).toBe("escuro");
    // pelo teclado também: Enter no botão volta a "do sistema"
    botao.focus();
    await user.keyboard("{Enter}");
    expect(botao.textContent).toBe("Tema do sistema");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect((preferenciasGravadas(armazenamento) as { tema: string }).tema).toBe("sistema");
  });

  it("abre com o tema guardado; Esquecer e desligar Lembrar não apagam o tema", async () => {
    const user = userEvent.setup();
    const armazenamento = armazenamentoEmMemoria({
      [CHAVE_PREFERENCIAS]: JSON.stringify({ tema: "escuro" }),
    });
    render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
    expect(screen.getByRole("button", { name: /^Tema / }).textContent).toBe("Tema escuro");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    await user.click(screen.getByRole("button", { name: "Esquecer" }));
    expect((preferenciasGravadas(armazenamento) as { tema: string }).tema).toBe("escuro");
    await user.click(screen.getByLabelText("Lembrar neste navegador"));
    expect(preferenciasGravadas(armazenamento)).toEqual({
      defensor: "",
      orgao: "",
      lembrar: true,
      guardarRecentes: true,
      tema: "escuro",
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
