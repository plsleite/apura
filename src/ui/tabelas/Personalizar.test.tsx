// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../App.tsx";
import { ambienteDeTeste } from "../testes/ambiente-de-teste.ts";
import { textoDoBalao } from "../testes/texto-do-balao.ts";

afterEach(cleanup);

async function montarCaso(user: ReturnType<typeof userEvent.setup>) {
  render(<App ambiente={ambienteDeTeste()} />);
  await user.type(screen.getByLabelText("Valor fixado"), "1.000,00");
  const prestacoes = within(screen.getByRole("region", { name: /4 · Prestações em atraso/ }));
  await user.click(prestacoes.getByLabelText("Meses em atraso"));
  await user.type(prestacoes.getByLabelText("Dia do vencimento"), "5");
  await user.type(prestacoes.getByLabelText("Quantos meses"), "2");
  await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
}

function linhaDaPrestacao(nome: string): HTMLElement {
  return screen.getByRole("button", { name: `Memória da ${nome}` }).closest("tr") as HTMLElement;
}

describe("Personalizar, o lápis da linha (§9.3)", () => {
  it("o lápis abre o painel com os dados da prestação; valor informado à mão marca a linha e muda o cálculo", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    await user.click(screen.getByRole("button", { name: "Personalizar prestação de 05/09/2026" }));
    const painel = within(screen.getByRole("dialog", { name: "Personalizar prestação" }));
    // a competência não aparece: o vencimento é a referência da linha (decisão de 13/10/2026)
    expect(painel.queryByLabelText(/Competência/)).toBeNull();
    expect((painel.getByLabelText("Vencimento") as HTMLInputElement).value).toBe("2026-09-05");
    expect(
      (painel.getByLabelText("Valor informado à mão (opcional)") as HTMLInputElement).value,
    ).toBe("");
    await user.type(painel.getByLabelText("Valor informado à mão (opcional)"), "1.200,00");
    await user.type(painel.getByLabelText("Descrição (opcional)"), "Valor diverso");
    await user.click(painel.getByRole("button", { name: "Aplicar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    const linha = linhaDaPrestacao("prestação de 05/09/2026 (Valor diverso)");
    const celulas = within(linha)
      .getAllByRole("cell")
      .map((c) => c.textContent);
    expect(celulas[1]).toBe("R$ 1.200,00");
    expect(celulas[0]).toContain("valor informado +1");
    expect(
      within(linha).getByRole("button", {
        name: "Situação da prestação de 05/09/2026: valor informado, ajustada",
      }),
    ).toBeDefined();
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).toContain(
      "Prestações com valor informado à mão, não apurado pela base dos alimentos: set/2026.",
    );
    // relançar o lote não sobrescreve a edição
    const prestacoes = within(screen.getByRole("region", { name: /4 · Prestações em atraso/ }));
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    expect(
      within(linhaDaPrestacao("prestação de 05/09/2026 (Valor diverso)")).getAllByRole("cell")[1]
        ?.textContent,
    ).toBe("R$ 1.200,00");
    // limpar o valor volta a apurar pela base
    await user.click(
      screen.getByRole("button", {
        name: "Personalizar prestação de 05/09/2026 (Valor diverso)",
      }),
    );
    const outra = within(screen.getByRole("dialog", { name: "Personalizar prestação" }));
    await user.clear(outra.getByLabelText("Valor informado à mão (opcional)"));
    await user.click(outra.getByRole("button", { name: "Aplicar" }));
    expect(
      within(linhaDaPrestacao("prestação de 05/09/2026 (Valor diverso)")).getAllByRole("cell")[1]
        ?.textContent,
    ).toBe("R$ 1.000,00");
  });

  it("no painel da prestação, o valor informado à mão e a descrição têm balão ⓘ, com o texto curto da descrição (§21.9)", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    await user.click(screen.getByRole("button", { name: "Personalizar prestação de 05/09/2026" }));
    const painel = within(screen.getByRole("dialog", { name: "Personalizar prestação" }));
    expect(
      painel.getByRole("button", { name: "Ajuda: Valor informado à mão (opcional)" }),
    ).toBeDefined();
    await user.click(painel.getByRole("button", { name: "Ajuda: Descrição (opcional)" }));
    expect(textoDoBalao("Descrição (opcional)")).toBe(
      '13º e férias: lance por "+ Prestação" e descreva aqui.',
    );
  });

  it("termo final posterior à data de elaboração e termo inicial depois do final são recusados no painel", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    await user.click(screen.getByRole("button", { name: "Personalizar prestação de 05/09/2026" }));
    const painel = within(screen.getByRole("dialog", { name: "Personalizar prestação" }));
    fireEvent.change(painel.getByLabelText("Correção até"), { target: { value: "2026-12-31" } });
    fireEvent.change(painel.getByLabelText("Juros desde"), { target: { value: "2026-10-01" } });
    fireEvent.change(painel.getByLabelText("Juros até"), { target: { value: "2026-09-20" } });
    await user.click(painel.getByRole("button", { name: "Aplicar" }));
    expect(painel.getAllByRole("alert").map((a) => a.textContent)).toEqual([
      "Não pode ser posterior à data de elaboração (11/10/2026).",
      "O termo inicial não pode ser posterior ao termo final.",
    ]);
    expect(screen.getByRole("dialog")).toBeDefined();
    fireEvent.change(painel.getByLabelText("Correção até"), { target: { value: "2026-09-30" } });
    // termo inicial depois da data de elaboração, sem termo final informado, também é recusado
    fireEvent.change(painel.getByLabelText("Juros desde"), { target: { value: "2026-11-01" } });
    fireEvent.change(painel.getByLabelText("Juros até"), { target: { value: "" } });
    await user.click(painel.getByRole("button", { name: "Aplicar" }));
    expect(painel.getAllByRole("alert").map((a) => a.textContent)).toEqual([
      "O termo inicial não pode ser posterior à data de elaboração (11/10/2026).",
    ]);
    fireEvent.change(painel.getByLabelText("Juros desde"), { target: { value: "" } });
    fireEvent.change(painel.getByLabelText("Juros até"), { target: { value: "2026-09-20" } });
    await user.click(painel.getByRole("button", { name: "Aplicar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Memória da prestação de 05/09/2026" }));
    const memoria = screen
      .getByText("Memória · prestação de 05/09/2026")
      .closest("tr") as HTMLElement;
    // juros até 20/09/2026: a taxa legal não conta o dia do termo final (05/09 a 19/09, 15 dias)
    expect(memoria.textContent).toContain("de 05/09/2026 a 19/09/2026 (15 de 30 dias)");
    expect(memoria.textContent).not.toContain("IPCA de out/2026");
  });

  it("o lápis de um pagamento abre 'Personalizar pagamento' com a data e o valor pago; Cancelar não muda nada", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    await user.click(screen.getByRole("button", { name: "+ Pagamento" }));
    await user.type(screen.getByLabelText("Valor do novo pagamento"), "150{Enter}");
    await user.click(screen.getByRole("button", { name: "Personalizar pagamento de 11/10/2026" }));
    const painel = within(screen.getByRole("dialog", { name: "Personalizar pagamento" }));
    expect((painel.getByLabelText("Data do pagamento") as HTMLInputElement).value).toBe(
      "2026-10-11",
    );
    expect((painel.getByLabelText("Valor pago") as HTMLInputElement).value).toBe("150,00");
    // no pagamento, o valor e a descrição não têm balão ⓘ (§21.9)
    expect(painel.queryByRole("button", { name: "Ajuda: Valor pago" })).toBeNull();
    expect(painel.queryByRole("button", { name: "Ajuda: Descrição (opcional)" })).toBeNull();
    await user.clear(painel.getByLabelText("Valor pago"));
    await user.click(painel.getByRole("button", { name: "Aplicar" }));
    expect(painel.getByRole("alert").textContent).toBe("Informe um número.");
    await user.click(painel.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    const amortizacoes = within(screen.getByRole("region", { name: "Amortizações (pagamentos)" }));
    expect(amortizacoes.getAllByRole("row")[1]?.textContent).toContain("▸11/10/2026R$ 150,00");
  });

  it("a linha nova herda as regras próprias de correção e juros da última prestação, não os termos", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    await user.click(screen.getByRole("button", { name: "Personalizar prestação de 05/10/2026" }));
    const painel = within(screen.getByRole("dialog", { name: "Personalizar prestação" }));
    await user.click(
      painel.getByLabelText("Usar regras próprias de correção e juros neste lançamento"),
    );
    await user.selectOptions(
      painel.getAllByLabelText("Juros")[1] as HTMLElement,
      "percentualMensal",
    );
    fireEvent.change(painel.getByLabelText("Juros até"), { target: { value: "2026-10-08" } });
    await user.click(painel.getByRole("button", { name: "Aplicar" }));
    await user.click(screen.getByRole("button", { name: "+ Prestação" }));
    fireEvent.change(screen.getByLabelText("Vencimento da nova prestação"), {
      target: { value: "2026-10-07" },
    });
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Memória da prestação de 07/10/2026" }));
    const memoria = screen
      .getByText("Memória · prestação de 07/10/2026")
      .closest("tr") as HTMLElement;
    // juros de 1% ao mês (regras herdadas) até a data do cálculo (o termo final não é herdado)
    expect(memoria.textContent).toContain("juros de 1% de 07/10/2026 a 11/10/2026");
  });

  it("base em % dos rendimentos: rendimento do mês e 'aplicar daqui em diante', que divide a base (§17.2)", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    await user.click(screen.getByLabelText("% dos rendimentos"));
    await user.type(screen.getByLabelText("Percentual dos rendimentos"), "30");
    await user.type(screen.getByLabelText("Rendimento mensal padrão (obrigatório)"), "1.000,00");
    const prestacoes = within(screen.getByRole("region", { name: /4 · Prestações em atraso/ }));
    await user.click(prestacoes.getByLabelText("Meses em atraso"));
    await user.type(prestacoes.getByLabelText("Dia do vencimento"), "5");
    await user.type(prestacoes.getByLabelText("Quantos meses"), "3");
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    const valores = () =>
      within(screen.getByRole("region", { name: "Prestações" }))
        .getAllByRole("row")
        .slice(1, 4)
        .map((r) => within(r).getAllByRole("cell")[1]?.textContent);
    expect(valores()).toEqual(["R$ 300,00", "R$ 300,00", "R$ 300,00"]);
    // rendimento só deste mês: a linha fica com o rendimento próprio
    await user.click(screen.getByRole("button", { name: "Personalizar prestação de 05/08/2026" }));
    let painel = within(screen.getByRole("dialog", { name: "Personalizar prestação" }));
    await user.type(painel.getByLabelText("Rendimento deste mês (opcional)"), "1.500,00");
    await user.click(painel.getByRole("button", { name: "Aplicar" }));
    expect(valores()).toEqual(["R$ 450,00", "R$ 300,00", "R$ 300,00"]);
    // daqui em diante: a base se divide no vencimento, com o novo rendimento padrão
    await user.click(screen.getByRole("button", { name: "Personalizar prestação de 05/09/2026" }));
    painel = within(screen.getByRole("dialog", { name: "Personalizar prestação" }));
    await user.type(painel.getByLabelText("Rendimento deste mês (opcional)"), "2.000,00");
    await user.click(
      painel.getByRole("button", { name: "Aplicar este rendimento daqui em diante" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(valores()).toEqual(["R$ 450,00", "R$ 600,00", "R$ 600,00"]);
    const antes = within(screen.getByRole("group", { name: "Até 04/09/2026" }));
    const depois = within(screen.getByRole("group", { name: "Desde 05/09/2026" }));
    expect(
      (antes.getByLabelText("Rendimento mensal padrão (obrigatório)") as HTMLInputElement).value,
    ).toBe("1.000,00");
    expect(
      (depois.getByLabelText("Rendimento mensal padrão (obrigatório)") as HTMLInputElement).value,
    ).toBe("2.000,00");
    // as linhas seguem a regra: nenhuma ganha a marca de ajustada por isso
    const outubro = screen
      .getByRole("button", { name: "Memória da prestação de 05/10/2026" })
      .closest("tr") as HTMLElement;
    expect(outubro.textContent).not.toContain("ajustada");
    // em outra forma de base, o painel não mostra o rendimento, e "Aplicar" não o apaga
    await user.click(antes.getByLabelText("Valor fixo em reais"));
    await user.click(screen.getByRole("button", { name: "Personalizar prestação de 05/08/2026" }));
    const outroPainel = within(screen.getByRole("dialog", { name: "Personalizar prestação" }));
    expect(outroPainel.queryByLabelText("Rendimento deste mês (opcional)")).toBeNull();
    await user.click(outroPainel.getByRole("button", { name: "Aplicar" }));
    await user.click(
      within(screen.getByRole("group", { name: "Até 04/09/2026" })).getByLabelText(
        "% dos rendimentos",
      ),
    );
    expect(valores()).toEqual(["R$ 450,00", "R$ 600,00", "R$ 600,00"]);
    cleanup();
    render(<App ambiente={ambienteDeTeste()} />);
    expect(screen.queryByLabelText("Rendimento deste mês (opcional)")).toBeNull();
  });

  it("regras próprias de correção e juros num lançamento, pelo mesmo editor de períodos", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    await user.click(screen.getByRole("button", { name: "Personalizar prestação de 05/10/2026" }));
    const painel = within(screen.getByRole("dialog", { name: "Personalizar prestação" }));
    await user.click(
      painel.getByLabelText("Usar regras próprias de correção e juros neste lançamento"),
    );
    const juros = painel.getAllByLabelText("Juros");
    await user.selectOptions(juros[1] as HTMLElement, "percentualMensal");
    await user.click(painel.getByRole("button", { name: "Aplicar" }));
    await user.click(screen.getByRole("button", { name: "Memória da prestação de 05/10/2026" }));
    const memoria = screen
      .getByText("Memória · prestação de 05/10/2026")
      .closest("tr") as HTMLElement;
    expect(memoria.textContent).toContain("juros de 1% de 05/10/2026 a 11/10/2026");
    expect(screen.getByText(/Até 29\/08\/2024/).textContent).toContain("taxa legal");
  });
});
