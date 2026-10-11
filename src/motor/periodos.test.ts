import { describe, expect, it } from "vitest";
import type { Metodologia } from "../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../metodologias/padrao.ts";
import { dividirPorPeriodos, periodoVigenteEm } from "./periodos.ts";

describe("períodos da metodologia", () => {
  const padrao = metodologiaPadrao();

  it("encontra o período vigente em uma data (transição em 30/08/2024)", () => {
    expect(periodoVigenteEm(padrao, "2017-01-01")?.correcao.indice).toBe("IGP-M");
    expect(periodoVigenteEm(padrao, "2024-08-29")?.correcao.indice).toBe("IGP-M");
    expect(periodoVigenteEm(padrao, "2024-08-30")?.correcao.indice).toBe("IPCA");
    expect(periodoVigenteEm(padrao, "2026-10-10")?.juros.tipo).toBe("taxaLegal");
  });

  it("devolve undefined quando nenhum período cobre a data", () => {
    const comBuraco: Metodologia = {
      ...padrao,
      periodos: [
        {
          de: "2020-01-01",
          ate: "2020-12-31",
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "1" },
        },
      ],
    };
    expect(periodoVigenteEm(comBuraco, "2021-01-01")).toBeUndefined();
    expect(periodoVigenteEm(comBuraco, "2020-06-15")).toBeDefined();
  });

  it("divide um intervalo pelos períodos, em ordem cronológica", () => {
    const trechos = dividirPorPeriodos(padrao, "2024-08-01", "2024-09-30");
    expect(trechos.map((t) => [t.de, t.ate, t.periodo.correcao.indice])).toEqual([
      ["2024-08-01", "2024-08-29", "IGP-M"],
      ["2024-08-30", "2024-09-30", "IPCA"],
    ]);
  });

  it("intervalo dentro de um único período e intervalo invertido", () => {
    const unico = dividirPorPeriodos(padrao, "2017-01-10", "2018-05-25");
    expect(unico).toHaveLength(1);
    expect(unico[0]).toMatchObject({ de: "2017-01-10", ate: "2018-05-25" });
    expect(dividirPorPeriodos(padrao, "2018-05-25", "2017-01-10")).toEqual([]);
  });
});
