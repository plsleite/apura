import { describe, expect, it } from "vitest";
import { decimal } from "./decimal.ts";
import {
  formatarCompetencia,
  formatarData,
  formatarFator,
  formatarMoeda,
  formatarPercentual,
} from "./formatacao.ts";

describe("formatação pt-BR", () => {
  it("formata moeda com separador de milhar e duas casas", () => {
    expect(formatarMoeda(decimal("1234.5"))).toBe("R$ 1.234,50");
    expect(formatarMoeda(decimal("0"))).toBe("R$ 0,00");
    expect(formatarMoeda(decimal("451.91"))).toBe("R$ 451,91");
    expect(formatarMoeda(decimal("1000000"))).toBe("R$ 1.000.000,00");
    expect(formatarMoeda(decimal("-6957.45"))).toBe("-R$ 6.957,45");
    expect(formatarMoeda(decimal("7145.725"))).toBe("R$ 7.145,73");
    expect(formatarMoeda(decimal("-0.004"))).toBe("R$ 0,00");
    expect(formatarMoeda(decimal("-100").times(0))).toBe("R$ 0,00");
    expect(formatarMoeda(decimal("-7145.725"))).toBe("-R$ 7.145,73");
  });

  it("formata data e competência", () => {
    expect(formatarData("2018-05-25")).toBe("25/05/2018");
    expect(formatarCompetencia("2018-05")).toBe("mai/2018");
    expect(formatarCompetencia("2017-01")).toBe("jan/2017");
    expect(formatarCompetencia("2024-12")).toBe("dez/2024");
  });

  it("formata percentual e fator com vírgula e casas fixas", () => {
    expect(formatarPercentual(decimal("16.516129"), 6)).toBe("16,516129%");
    expect(formatarPercentual(decimal("1"), 2)).toBe("1,00%");
    expect(formatarFator(decimal("1.01302"))).toBe("1,013020");
  });
});
