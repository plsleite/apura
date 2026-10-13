import { describe, expect, it } from "vitest";
import { metodologiaDaOpcao, metodologiaPadrao, OPCOES_DE_METODOLOGIA } from "./padrao.ts";

const ARREDONDAMENTO = { fatorCasas: 6, percentualCasas: 6, valorCasas: 2, modo: "comercial" };

describe("metodologias de encargos pré-carregadas (§5.3, §17.3)", () => {
  it("Lei 14.905/2024: os dois períodos da transição de 30/08/2024 e os padrões do design", () => {
    const m = metodologiaDaOpcao("lei14905");
    expect(m.id).toBe("lei-14905-2024");
    expect(m.versao).toBe(1);
    expect(m.nome).toBe("Lei 14.905/2024");
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
    expect(m.arredondamento).toEqual(ARREDONDAMENTO);
    // a padrão de fábrica continua sendo esta
    expect(metodologiaPadrao()).toEqual(m);
  });

  it("IGP-M e juros de 1% ao mês em todo o período, sem a mudança de 30/08/2024", () => {
    const m = metodologiaDaOpcao("igpmJuros1");
    expect(m).toEqual({
      id: "igpm-juros-1",
      versao: 1,
      nome: "IGP-M e juros de 1% ao mês",
      ajustada: false,
      periodos: [
        {
          de: null,
          ate: null,
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "1" },
        },
      ],
      incidenciaMesInicial: "proRata",
      deflacao: "aplicarComPiso",
      arredondamento: ARREDONDAMENTO,
    });
    expect(OPCOES_DE_METODOLOGIA).toEqual(["lei14905", "igpmJuros1"]);
  });

  it("devolve uma cópia independente a cada chamada", () => {
    const a = metodologiaPadrao();
    const b = metodologiaPadrao();
    a.ajustada = true;
    a.periodos.pop();
    expect(b.ajustada).toBe(false);
    expect(b.periodos).toHaveLength(2);
    expect(metodologiaDaOpcao("igpmJuros1")).not.toBe(metodologiaDaOpcao("igpmJuros1"));
  });
});
