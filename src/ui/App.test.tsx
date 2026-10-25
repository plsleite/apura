// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App.tsx";
import { ambienteDeTeste } from "./testes/ambiente-de-teste.ts";

afterEach(cleanup);

describe("App (fundação da tela)", () => {
  it("mostra o nome do sistema, as quatro ações da barra e o rodapé com a situação dos índices", () => {
    render(<App ambiente={ambienteDeTeste()} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Apura · Sistema de Cálculos Judiciais · DPE-MS",
    );
    const logo = screen.getByRole("img", { name: "Defensoria Pública de Mato Grosso do Sul" });
    expect(logo.getAttribute("src")).toBe("/logos/dpems-horizontal-branca.png");
    expect([logo.getAttribute("width"), logo.getAttribute("height")]).toEqual(["368", "88"]);
    for (const nome of ["Novo cálculo", "Abrir", "Salvar"]) {
      expect(screen.getByRole("button", { name: nome })).toBeDefined();
    }
    const relatorio = screen.getByRole("button", { name: "Relatório / PDF" }) as HTMLButtonElement;
    // cálculo em branco: sem prestação, o relatório não abre (§18.1)
    expect(relatorio.disabled).toBe(true);
    expect(relatorio.title).toBe("Lance ao menos uma prestação para gerar o relatório.");
    const rodape = screen.getByRole("contentinfo").textContent ?? "";
    expect(rodape).toContain(
      "Índices oficiais BCB/SGS · IPCA até set/2026 · atualizados em 11/10/2026 09:00 (horário de Brasília)",
    );
    expect(rodape).toMatch(/Apura v\d+\.\d+\.\d+ · Defensoria Pública de Mato Grosso do Sul/);
    // com a tabela em dia, não há aviso do calendário
    expect(screen.queryByText(/ainda não chegou ao Apura/)).toBeNull();
  });

  it("as cinco seções da esquerda vêm na ordem da §20: processo, base, encargos, prestações, pagamentos (decisão de 15/10/2026)", () => {
    render(<App ambiente={ambienteDeTeste()} />);
    const esquerda = document.querySelector(".coluna-esquerda") as HTMLElement;
    const titulos = within(esquerda)
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(titulos).toEqual([
      "1 · Processo",
      "2 · Base dos alimentos",
      "3 · Encargos e data do cálculo",
      "4 · Prestações em atraso",
      "5 · Pagamentos",
    ]);
    // a tabela vazia não traz frase (§21.2)
    expect(screen.queryByText(/Nenhuma prestação lançada|Nenhum pagamento lançado/)).toBeNull();
  });

  it("a coluna da direita tem os indicadores no topo e, embaixo, uma área rolável com nome, que recebe foco pelo teclado, com as duas tabelas e os avisos (§20.3)", () => {
    // o cálculo em branco não tem aviso nenhum; a defasagem de um índice faz a caixa aparecer
    render(<App ambiente={ambienteDeTeste({ limites: { "433": "2026-07" } })} />);
    const direita = document.querySelector(".coluna-direita") as HTMLElement;
    const area = within(direita).getByRole("region", { name: "Tabelas e avisos" });
    expect(area.className).toBe("coluna-rolavel");
    expect(area.tabIndex).toBe(0);
    // os indicadores ficam fora da área rolável, antes dela (parados no topo da coluna)
    const resumo = within(direita).getByLabelText("Resumo do cálculo");
    expect(area.contains(resumo)).toBe(false);
    expect(resumo.compareDocumentPosition(area) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // dentro dela, as duas tabelas e a caixa de avisos
    expect(within(area).getByRole("region", { name: "Prestações" })).toBeDefined();
    expect(within(area).getByRole("region", { name: "Amortizações (pagamentos)" })).toBeDefined();
    expect(within(area).getByRole("region", { name: "Avisos" })).toBeDefined();
  });

  it("mostra na caixa de avisos os meses já divulgados que ainda não chegaram ao Apura", () => {
    render(<App ambiente={ambienteDeTeste({ limites: { "433": "2026-07" } })} />);
    const avisos = screen.getByRole("region", { name: "Avisos" });
    expect(avisos.textContent).toContain(
      "IPCA de ago/2026, divulgado por volta de 10/09/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
    );
  });

  it("congela a tabela ao abrir e de novo em 'Novo cálculo'; o cálculo em branco não mostra 'Nenhum lançamento.' (§21.2)", async () => {
    const ambiente = ambienteDeTeste();
    render(<App ambiente={ambiente} />);
    expect(ambiente.congelamentos()).toBe(1);
    expect(screen.queryByText("Nenhum lançamento.")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Novo cálculo" }));
    expect(ambiente.congelamentos()).toBe(2);
  });

  it("'Ajustar' abre o editor de períodos num painel; a mudança reflete no resumo; Esc fecha", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    await user.click(screen.getByRole("button", { name: "Ajustar" }));
    const painel = screen.getByRole("dialog", { name: "Ajustar a metodologia de encargos" });
    expect(painel).toBeDefined();
    await user.selectOptions(
      within(painel).getAllByLabelText("Índice de correção")[0] as HTMLElement,
      "INPC",
    );
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(/^Ajustada:/).textContent).toBe(
      "Ajustada: Até 29/08/2024: INPC e juros de 1% ao mês. Desde 30/08/2024: IPCA e taxa legal.",
    );
    expect(screen.getByText(/^Metodologia de encargos/).textContent).toBe(
      "Metodologia de encargos (ajustada)",
    );
  });

  it("todo campo de data vai de 01/01/1900 a 31/12/2199 (o teto de datas)", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    const conferir = () => {
      const campos = [...document.querySelectorAll<HTMLInputElement>('input[type="date"]')];
      expect(campos.length).toBeGreaterThan(0);
      for (const campo of campos) {
        expect([campo.id || campo.getAttribute("aria-label"), campo.min, campo.max]).toEqual([
          campo.id || campo.getAttribute("aria-label"),
          "1900-01-01",
          "2199-12-31",
        ]);
      }
      return campos.length;
    };
    conferir();
    const prestacoes = within(screen.getByRole("region", { name: /4 · Prestações em atraso/ }));
    await user.click(prestacoes.getByLabelText("Meses em atraso"));
    await user.type(prestacoes.getByLabelText("Dia do vencimento"), "5");
    await user.type(prestacoes.getByLabelText("Quantos meses"), "2");
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    await user.click(prestacoes.getByLabelText("Intervalo de vencimentos"));
    conferir();
    await user.click(screen.getByRole("button", { name: "+ Prestação" }));
    conferir();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Ajustar" }));
    conferir();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Personalizar prestação de 05/09/2026" }));
    await user.click(
      screen.getByLabelText("Usar regras próprias de correção e juros neste lançamento"),
    );
    expect(conferir()).toBeGreaterThanOrEqual(5);
  });

  it("abre com a cópia publicada quando nenhum ambiente é injetado (sem rede)", () => {
    render(<App />);
    expect(screen.getByRole("contentinfo").textContent).toContain("Índices oficiais BCB/SGS");
  });
});

/** Os textos de exemplo (`placeholder`) dos campos que há dentro de `raiz`, na ordem da tela. */
const exemplos = (raiz: ParentNode = document) =>
  [...raiz.querySelectorAll("[placeholder]")].map((c) => c.getAttribute("placeholder"));

describe("sem exemplos dentro dos campos (§21.1)", () => {
  it("na tela, nenhum campo traz exemplo, em qualquer forma da base e nos dois modos do lote", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    expect(exemplos()).toEqual([]);
    await user.click(screen.getByLabelText("% do salário mínimo"));
    expect(exemplos()).toEqual([]);
    await user.click(screen.getByLabelText("% dos rendimentos"));
    expect(exemplos()).toEqual([]);
    const prestacoes = within(screen.getByRole("region", { name: /4 · Prestações em atraso/ }));
    await user.click(prestacoes.getByLabelText("Meses em atraso"));
    expect(exemplos()).toEqual([]);
  });

  it("nas tabelas ficam só os textos que dizem o que acontece com o campo vazio", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    await user.type(screen.getByLabelText("Valor fixado"), "1.000,00");
    const prestacoes = within(screen.getByRole("region", { name: /4 · Prestações em atraso/ }));
    fireEvent.change(prestacoes.getByLabelText("Primeiro vencimento"), {
      target: { value: "2026-08-05" },
    });
    fireEvent.change(prestacoes.getByLabelText("Último vencimento"), {
      target: { value: "2026-09-05" },
    });
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    const pagamentos = within(screen.getByRole("region", { name: /5 · Pagamentos/ }));
    await user.type(pagamentos.getByLabelText("Valor por mês"), "400");
    fireEvent.change(pagamentos.getByLabelText("Primeiro pagamento"), {
      target: { value: "2026-09-05" },
    });
    fireEvent.change(pagamentos.getByLabelText("Último pagamento"), {
      target: { value: "2026-09-05" },
    });
    await user.click(pagamentos.getByRole("button", { name: "Lançar em lote" }));

    // linha nova: o pagamento não traz exemplo; a prestação diz que o vazio é "pela base"
    await user.click(screen.getByRole("button", { name: "+ Pagamento" }));
    expect(exemplos()).toEqual([]);
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "+ Prestação" }));
    expect(exemplos()).toEqual(["pela base"]);
    await user.keyboard("{Escape}");

    // células editáveis: o vencimento e o valor do pagamento ficam sem texto; o valor da prestação, "pela base"
    await user.click(
      screen.getByRole("button", {
        name: "Editar vencimento da prestação de 05/09/2026 (05/09/2026)",
      }),
    );
    expect(exemplos()).toEqual([]);
    await user.keyboard("{Escape}");
    await user.click(
      screen.getByRole("button", { name: "Editar valor da prestação de 05/09/2026 (R$ 1.000,00)" }),
    );
    expect(exemplos()).toEqual(["pela base"]);
    await user.keyboard("{Escape}");
    await user.click(
      screen.getByRole("button", { name: "Editar valor do pagamento de 05/09/2026 (R$ 400,00)" }),
    );
    expect(exemplos()).toEqual([]);
    await user.keyboard("{Escape}");
  });

  it("no Personalizar, só 'apurado pela base' e 'usa o rendimento padrão'", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    await user.type(screen.getByLabelText("Valor fixado"), "1.000,00");
    const prestacoes = within(screen.getByRole("region", { name: /4 · Prestações em atraso/ }));
    fireEvent.change(prestacoes.getByLabelText("Primeiro vencimento"), {
      target: { value: "2026-08-05" },
    });
    fireEvent.change(prestacoes.getByLabelText("Último vencimento"), {
      target: { value: "2026-09-05" },
    });
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    const pagamentos = within(screen.getByRole("region", { name: /5 · Pagamentos/ }));
    await user.type(pagamentos.getByLabelText("Valor por mês"), "400");
    fireEvent.change(pagamentos.getByLabelText("Primeiro pagamento"), {
      target: { value: "2026-09-05" },
    });
    fireEvent.change(pagamentos.getByLabelText("Último pagamento"), {
      target: { value: "2026-09-05" },
    });
    await user.click(pagamentos.getByRole("button", { name: "Lançar em lote" }));

    await user.click(screen.getByRole("button", { name: "Personalizar pagamento de 05/09/2026" }));
    let painel = screen.getByRole("dialog", { name: "Personalizar pagamento" });
    expect(exemplos(painel)).toEqual([]);
    await user.click(within(painel).getByRole("button", { name: "Cancelar" }));

    await user.click(screen.getByRole("button", { name: "Personalizar prestação de 05/09/2026" }));
    painel = screen.getByRole("dialog", { name: "Personalizar prestação" });
    expect(exemplos(painel)).toEqual(["apurado pela base"]);
    await user.click(within(painel).getByRole("button", { name: "Cancelar" }));

    // com a base em % dos rendimentos, o painel traz também o rendimento do mês
    await user.click(screen.getByLabelText("% dos rendimentos"));
    await user.type(screen.getByLabelText("Percentual dos rendimentos"), "30");
    await user.type(screen.getByLabelText("Rendimento mensal padrão (obrigatório)"), "2.000,00");
    await user.click(screen.getByRole("button", { name: "Personalizar prestação de 05/09/2026" }));
    painel = screen.getByRole("dialog", { name: "Personalizar prestação" });
    expect(exemplos(painel)).toEqual(["apurado pela base", "usa o rendimento padrão"]);
  });
});
