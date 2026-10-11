import { describe, expect, it } from "vitest";
import { arredondar, decimal, Decimal, paraTexto, CEM, UM, ZERO } from "./decimal.ts";

describe("decimal", () => {
  it("soma 0,1 com 0,2 sem o erro do ponto flutuante", () => {
    expect(decimal("0.1").plus(decimal("0.2")).toString()).toBe("0.3");
    expect(0.1 + 0.2).not.toBe(0.3); // por isso o Apura não usa number para valores
  });

  it("aceita texto com ponto decimal e devolve o próprio objeto quando já é Decimal", () => {
    const valor = decimal("451.91");
    expect(valor).toBeInstanceOf(Decimal);
    expect(decimal(valor)).toBe(valor);
    expect(decimal("-1.10").isNegative()).toBe(true);
  });

  it("rejeita texto com vírgula ou vazio", () => {
    expect(() => decimal("451,91")).toThrow();
    expect(() => decimal("")).toThrow();
  });

  it("arredonda no modo comercial (meio para cima)", () => {
    expect(paraTexto(arredondar(decimal("2.675"), 2), 2)).toBe("2.68");
    expect(paraTexto(arredondar(decimal("0.125"), 2), 2)).toBe("0.13");
    expect(paraTexto(arredondar(decimal("0.124"), 2), 2)).toBe("0.12");
    expect(paraTexto(arredondar(decimal("1.0130195"), 6), 6)).toBe("1.013020");
    expect(paraTexto(arredondar(decimal("1.0130194"), 6), 6)).toBe("1.013019");
  });

  it("paraTexto fixa o número de casas, com zeros à direita", () => {
    expect(paraTexto(decimal("188.3"), 2)).toBe("188.30");
    expect(paraTexto(decimal("7145.725"), 2)).toBe("7145.73");
    expect(paraTexto(UM, 6)).toBe("1.000000");
    expect(paraTexto(ZERO, 2)).toBe("0.00");
  });

  it("calcula potência com expoente fracionário com precisão suficiente para 6 casas", () => {
    // mês de janeiro/2017 (0,64%) pro rata de 21 dias em 31: (1,0064)^(21/31)
    const fator = UM.plus(decimal("0.64").div(CEM)).pow(decimal("21").div(31));
    expect(paraTexto(fator, 6)).toBe("1.004331");
  });
});
