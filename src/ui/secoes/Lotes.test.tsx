// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../App.tsx";
import { intervaloDoLote } from "./LotePrestacoes.tsx";
import { ambienteDeTeste } from "../testes/ambiente-de-teste.ts";

afterEach(cleanup);

function secao(nome: RegExp) {
  return within(screen.getByRole("region", { name: nome }));
}

describe("intervalo de vencimentos (decisão de 13/10/2026)", () => {
  it("o dia vem do primeiro vencimento; o mês final é o do último, se a prestação dele não vencer depois", () => {
    expect(intervaloDoLote("2026-01-20", "2026-03-10")).toEqual({
      diaVencimento: 20,
      de: "2026-01",
      ate: "2026-02",
    });
    expect(intervaloDoLote("2026-01-31", "2026-04-30")).toEqual({
      diaVencimento: 31,
      de: "2026-01",
      ate: "2026-04",
    });
    expect(intervaloDoLote("2026-03-10", "2026-03-10")).toEqual({
      diaVencimento: 10,
      de: "2026-03",
      ate: "2026-03",
    });
    expect(intervaloDoLote("2026-03-10", "2026-02-01")).toBeNull();
  });
});

describe("4 · Prestações em atraso e 5 · Pagamentos: lotes cumulativos (§6.1, §6.2)", () => {
  it("lança por 'meses em atraso', acumula sem repetir e mostra os avisos do lote embaixo do formulário", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    const prestacoes = secao(/4 · Prestações em atraso/);
    // o padrão é o intervalo de vencimentos, sem o dia; "Meses em atraso" mostra o dia
    expect(
      (prestacoes.getByLabelText("Intervalo de vencimentos") as HTMLInputElement).checked,
    ).toBe(true);
    expect(prestacoes.queryByLabelText("Dia do vencimento")).toBeNull();
    await user.click(prestacoes.getByLabelText("Meses em atraso"));
    await user.type(prestacoes.getByLabelText("Dia do vencimento"), "5");
    await user.type(prestacoes.getByLabelText("Quantos meses"), "3");
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    // o cálculo deixa de estar vazio
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).not.toContain(
      "Nenhum lançamento.",
    );
    expect(prestacoes.queryByRole("region", { name: "Avisos do lote de prestações" })).toBeNull();
    // relançar os mesmos meses: nada novo, com aviso no próprio formulário
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    expect(
      prestacoes.getByRole("region", { name: "Avisos do lote de prestações" }).textContent,
    ).toContain("Meses de vencimento já lançados, não repetidos: ago/2026, set/2026, out/2026.");
    // o intervalo acrescenta só o que falta, e o aviso é trocado
    await user.click(prestacoes.getByLabelText("Intervalo de vencimentos"));
    fireEvent.change(prestacoes.getByLabelText("Primeiro vencimento"), {
      target: { value: "2026-07-05" },
    });
    fireEvent.change(prestacoes.getByLabelText("Último vencimento"), {
      target: { value: "2026-08-05" },
    });
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    expect(
      prestacoes.getByRole("region", { name: "Avisos do lote de prestações" }).textContent,
    ).toContain("Meses de vencimento já lançados, não repetidos: ago/2026.");
  });

  it("valida antes de chamar o motor: dia fora de 1 a 31, meses vazios, datas vazias, intervalo invertido ou longo demais", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    const prestacoes = secao(/4 · Prestações em atraso/);
    const erros = () => prestacoes.getAllByRole("alert").map((a) => a.textContent);
    await user.click(prestacoes.getByLabelText("Meses em atraso"));
    await user.type(prestacoes.getByLabelText("Dia do vencimento"), "32");
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    expect(erros()).toEqual([
      "Informe um número inteiro de 1 a 31.",
      "Informe um número inteiro de 1 a 600.",
    ]);
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).toContain(
      "Nenhum lançamento.",
    );
    await user.click(prestacoes.getByLabelText("Intervalo de vencimentos"));
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    expect(erros()).toEqual([
      "Informe a data (dia, mês e ano a partir de 1900).",
      "Informe a data (dia, mês e ano a partir de 1900).",
    ]);
    const primeiro = prestacoes.getByLabelText("Primeiro vencimento");
    const ultimo = prestacoes.getByLabelText("Último vencimento");
    fireEvent.change(primeiro, { target: { value: "2026-10-10" } });
    fireEvent.change(ultimo, { target: { value: "2026-09-10" } });
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    expect(erros()).toEqual(["O último vencimento não pode ser anterior ao primeiro."]);
    fireEvent.change(primeiro, { target: { value: "1970-01-10" } });
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    expect(erros()).toEqual(["No máximo 600 meses por lote."]);
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).toContain(
      "Nenhum lançamento.",
    );
  });

  it("pagamentos: intervalo de pagamentos por datas, como o das prestações; lote cumulativo com aviso; valor e datas validados (decisão de 13/10/2026)", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    const prestacoes = secao(/4 · Prestações em atraso/);
    const pagamentos = secao(/5 · Pagamentos/);
    expect(pagamentos.queryByLabelText("Dia do pagamento")).toBeNull();
    await user.click(prestacoes.getByLabelText("Meses em atraso"));
    await user.type(prestacoes.getByLabelText("Dia do vencimento"), "7");
    await user.type(prestacoes.getByLabelText("Quantos meses"), "2");
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    const erros = () => pagamentos.getAllByRole("alert").map((a) => a.textContent);
    // tudo vazio: três erros, nada lançado
    await user.click(pagamentos.getByRole("button", { name: "Lançar em lote" }));
    expect(erros()).toEqual([
      "Informe um número.",
      "Informe a data (dia, mês e ano a partir de 1900).",
      "Informe a data (dia, mês e ano a partir de 1900).",
    ]);
    await user.type(pagamentos.getByLabelText("Valor por mês"), "400,00");
    const primeiro = pagamentos.getByLabelText("Primeiro pagamento");
    const ultimo = pagamentos.getByLabelText("Último pagamento");
    fireEvent.change(primeiro, { target: { value: "2026-09-10" } });
    fireEvent.change(ultimo, { target: { value: "2026-08-10" } });
    await user.click(pagamentos.getByRole("button", { name: "Lançar em lote" }));
    expect(erros()).toEqual(["O último pagamento não pode ser anterior ao primeiro."]);
    // de 10/08 a 05/09: só agosto (o pagamento de setembro, no dia 10, viria depois de 05/09)
    fireEvent.change(primeiro, { target: { value: "2026-08-10" } });
    fireEvent.change(ultimo, { target: { value: "2026-09-05" } });
    await user.click(pagamentos.getByRole("button", { name: "Lançar em lote" }));
    expect(pagamentos.queryByRole("region", { name: "Avisos do lote de pagamentos" })).toBeNull();
    // relançar: nada novo, com aviso no próprio formulário (e só agosto tinha entrado)
    await user.click(pagamentos.getByRole("button", { name: "Lançar em lote" }));
    expect(
      pagamentos.getByRole("region", { name: "Avisos do lote de pagamentos" }).textContent,
    ).toContain("Meses com pagamento já lançado, não repetidos: ago/2026.");
    expect(
      pagamentos.getByRole("region", { name: "Avisos do lote de pagamentos" }).textContent,
    ).not.toContain("set/2026");
    // o aviso do lote de pagamentos não aparece no formulário de prestações
    expect(prestacoes.queryByRole("region", { name: /Avisos do lote/ })).toBeNull();
    // valor inválido: erro inline, nada lançado
    await user.clear(pagamentos.getByLabelText("Valor por mês"));
    await user.type(pagamentos.getByLabelText("Valor por mês"), "0");
    await user.click(pagamentos.getByRole("button", { name: "Lançar em lote" }));
    expect(pagamentos.getByRole("alert").textContent).toBe("Informe um valor maior que zero.");
  });
});
