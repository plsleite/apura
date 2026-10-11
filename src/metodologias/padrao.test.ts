import { describe, expect, it } from "vitest";
import { metodologiaPadrao } from "./padrao.ts";

describe("metodologia padrão TJMS/SAJ v1", () => {
  it("tem os dois períodos da Lei 14.905/2024 e os padrões do design", () => {
    const m = metodologiaPadrao();
    expect(m.id).toBe("tjms-saj");
    expect(m.versao).toBe(1);
    expect(m.nome).toBe("TJMS/SAJ");
    expect(m.ajustada).toBe(false);
    expect(m.periodos).toEqual([
      {
        de: null,
        ate: "2024-08-29",
        correcao: { indice: "IGP-M" },
        juros: { tipo: "percentualMensal", taxaMensal: "1" },
      },
      { de: "2024-08-30", ate: null, correcao: { indice: "IPCA" }, juros: { tipo: "taxaLegal" } },
    ]);
    expect(m.incidenciaMesInicial).toBe("proRata");
    expect(m.deflacao).toBe("aplicarComPiso");
    expect(m.arredondamento).toEqual({
      fatorCasas: 6,
      percentualCasas: 6,
      valorCasas: 2,
      modo: "comercial",
    });
  });

  it("devolve uma cópia independente a cada chamada", () => {
    const a = metodologiaPadrao();
    const b = metodologiaPadrao();
    a.ajustada = true;
    a.periodos.pop();
    expect(b.ajustada).toBe(false);
    expect(b.periodos).toHaveLength(2);
  });
});
