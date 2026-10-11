import { describe, expect, it } from "vitest";
import { paraTexto } from "../compartilhado/decimal.ts";
import type { Metodologia } from "../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../metodologias/padrao.ts";
import { jurosSimples } from "./juros.ts";

describe("jurosSimples (regime antigo: percentual mensal rateado por mês-calendário)", () => {
  const padrao = metodologiaPadrao();

  it("reproduz o percentual do SAJ: 10/01/2017 → 25/05/2018 a 1% ao mês = 16,516129%", () => {
    const r = jurosSimples({
      termoInicial: "2017-01-10",
      termoFinal: "2018-05-25",
      metodologia: padrao,
      casas: 6,
    });
    expect(paraTexto(r.percentual, 6)).toBe("16.516129");
    expect(r.detalhe).toHaveLength(17);
    expect(r.detalhe[0]).toEqual({
      regime: "percentualMensal",
      de: "2017-01-10",
      ate: "2017-01-31",
      dias: 22,
      diasDoMes: 31,
      taxa: "1",
      percentual: "0.709677",
    });
    expect(r.detalhe[1]).toMatchObject({
      de: "2017-02-01",
      ate: "2017-02-28",
      dias: 28,
      percentual: "1.000000",
    });
    expect(r.detalhe[16]).toEqual({
      regime: "percentualMensal",
      de: "2018-05-01",
      ate: "2018-05-25",
      dias: 25,
      diasDoMes: 31,
      taxa: "1",
      percentual: "0.806452",
    });
    expect(r.avisos).toEqual([]);
  });

  it("lançamento e termo final no mesmo mês: conta as duas pontas (10/05 a 25/05 = 16 dias)", () => {
    const r = jurosSimples({
      termoInicial: "2018-05-10",
      termoFinal: "2018-05-25",
      metodologia: padrao,
      casas: 6,
    });
    expect(paraTexto(r.percentual, 6)).toBe("0.516129");
    expect(r.detalhe).toEqual([
      {
        regime: "percentualMensal",
        de: "2018-05-10",
        ate: "2018-05-25",
        dias: 16,
        diasDoMes: 31,
        taxa: "1",
        percentual: "0.516129",
      },
    ]);
  });

  it("aplica a taxa de cada período aos dias que lhe cabem", () => {
    const doisPeriodos: Metodologia = {
      ...padrao,
      periodos: [
        {
          de: null,
          ate: "2017-12-31",
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "1" },
        },
        {
          de: "2018-01-01",
          ate: null,
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "2" },
        },
      ],
    };
    const r = jurosSimples({
      termoInicial: "2017-12-10",
      termoFinal: "2018-01-20",
      metodologia: doisPeriodos,
      casas: 6,
    });
    expect(r.detalhe.map((d) => [d.de, d.ate, d.taxa, d.percentual])).toEqual([
      ["2017-12-10", "2017-12-31", "1", "0.709677"],
      ["2018-01-01", "2018-01-20", "2", "1.290323"],
    ]);
    expect(paraTexto(r.percentual, 6)).toBe("2.000000");
  });

  it("fevereiro bissexto conta 29 dias no denominador", () => {
    const r = jurosSimples({
      termoInicial: "2024-02-10",
      termoFinal: "2024-03-05",
      metodologia: padrao,
      casas: 6,
    });
    expect(paraTexto(r.percentual, 6)).toBe("0.850945");
    expect(r.detalhe[0]).toMatchObject({ dias: 20, diasDoMes: 29, percentual: "0.689655" });
    expect(r.detalhe[1]).toMatchObject({ dias: 5, diasDoMes: 31, percentual: "0.161290" });
  });

  it("um único dia rende 1/diasDoMes da taxa; termo inicial posterior ao final rende zero", () => {
    const umDia = jurosSimples({
      termoInicial: "2018-05-25",
      termoFinal: "2018-05-25",
      metodologia: padrao,
      casas: 6,
    });
    expect(paraTexto(umDia.percentual, 6)).toBe("0.032258");
    const invertido = jurosSimples({
      termoInicial: "2018-06-01",
      termoFinal: "2018-05-25",
      metodologia: padrao,
      casas: 6,
    });
    expect(paraTexto(invertido.percentual, 6)).toBe("0.000000");
    expect(invertido.detalhe).toEqual([]);
    expect(invertido.avisos).toEqual([]);
  });

  it("regras ainda não implementadas (taxa legal, SELIC única) geram aviso e não somam", () => {
    const r = jurosSimples({
      termoInicial: "2024-08-01",
      termoFinal: "2024-09-30",
      metodologia: padrao,
      casas: 6,
    });
    expect(paraTexto(r.percentual, 6)).toBe("0.935484"); // só 01 a 29/08/2024, a 1% ao mês
    expect(r.detalhe).toHaveLength(1);
    expect(r.avisos).toEqual([
      'Juros pela regra "taxaLegal" ainda não implementados: o período de 30/08/2024 a 30/09/2024 ficou sem juros.',
    ]);
  });
});
