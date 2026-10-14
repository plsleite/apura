import { describe, expect, it } from "vitest";
import { baseUnica } from "../motor/base.ts";
import { motivoDoBloqueio } from "./bloqueio.ts";
import { calculoDeTeste, pagamento, prestacao, resultadoDe } from "./testes/calculos.ts";

describe("quando o botão “Relatório / PDF” fica desligado (§18.1)", () => {
  const motivo = (mudancas: Parameters<typeof calculoDeTeste>[0]) => {
    const calculo = calculoDeTeste(mudancas);
    return motivoDoBloqueio(calculo, resultadoDe(calculo));
  };

  it("sem prestação lançada", () => {
    expect(motivo({ lancamentos: [] })).toBe(
      "Lance ao menos uma prestação para gerar o relatório.",
    );
    expect(motivo({ lancamentos: [pagamento("2024-10-10", "10.00")] })).toBe(
      "Lance ao menos uma prestação para gerar o relatório.",
    );
  });

  it("com lançamento sem valor: a contagem e onde corrigir", () => {
    const semBase = {
      base: baseUnica({ tipo: "percentualSalarioMinimo" as const, percentual: "" }),
    };
    expect(
      motivo({ ...semBase, lancamentos: [prestacao("2024-10-05"), prestacao("2024-11-05")] }),
    ).toBe(
      "2 prestações estão sem valor (veja a caixa de avisos): complete a base ou informe o valor para gerar o relatório.",
    );
    expect(
      motivo({
        lancamentos: [prestacao("2024-10-05", { valorInformado: "0" })],
      }),
    ).toBe(
      "1 prestação está sem valor (veja a caixa de avisos): complete a base ou informe o valor para gerar o relatório.",
    );
    expect(
      motivo({
        lancamentos: [prestacao("2024-10-05"), pagamento("2024-10-10", "abc")],
      }),
    ).toBe(
      "1 pagamento está sem valor (veja a caixa de avisos): informe o valor para gerar o relatório.",
    );
    expect(
      motivo({
        ...semBase,
        lancamentos: [prestacao("2024-10-05"), pagamento("2024-10-10", "abc")],
      }),
    ).toBe(
      "1 prestação e 1 pagamento estão sem valor (veja a caixa de avisos): complete a base ou informe o valor para gerar o relatório.",
    );
  });

  it("pagamento posterior à data do cálculo não bloqueia; cálculo completo, ligado", () => {
    expect(
      motivo({ lancamentos: [prestacao("2024-10-05"), pagamento("2026-11-10", "10.00")] }),
    ).toBe(null);
    expect(motivo({})).toBe(null);
  });
});
