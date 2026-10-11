import { describe, expect, it } from "vitest";
import { paraTexto } from "../compartilhado/decimal.ts";
import type { Metodologia } from "../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../metodologias/padrao.ts";
import { jurosSimples } from "./juros.ts";
import { tabelaIgpm } from "./testes/indices-igpm-2017-2018.ts";
import { metodologiaSelicUnica, tabelaRegimeNovo } from "./testes/regime-novo.ts";

describe("jurosSimples (regime antigo: percentual mensal rateado por mês-calendário)", () => {
  const padrao = metodologiaPadrao();
  const antigo = { metodologia: padrao, indices: tabelaIgpm(), casas: 6 };

  it("reproduz o percentual do SAJ: 10/01/2017 → 25/05/2018 a 1% ao mês = 16,516129%", () => {
    const r = jurosSimples({ ...antigo, termoInicial: "2017-01-10", termoFinal: "2018-05-25" });
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
    const r = jurosSimples({ ...antigo, termoInicial: "2018-05-10", termoFinal: "2018-05-25" });
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
      ...antigo,
      metodologia: doisPeriodos,
      termoInicial: "2017-12-10",
      termoFinal: "2018-01-20",
    });
    expect(r.detalhe.map((d) => [d.de, d.ate, d.taxa, d.percentual])).toEqual([
      ["2017-12-10", "2017-12-31", "1", "0.709677"],
      ["2018-01-01", "2018-01-20", "2", "1.290323"],
    ]);
    expect(paraTexto(r.percentual, 6)).toBe("2.000000");
  });

  it("fevereiro bissexto conta 29 dias no denominador", () => {
    const r = jurosSimples({ ...antigo, termoInicial: "2024-02-10", termoFinal: "2024-03-05" });
    expect(paraTexto(r.percentual, 6)).toBe("0.850945");
    expect(r.detalhe[0]).toMatchObject({ dias: 20, diasDoMes: 29, percentual: "0.689655" });
    expect(r.detalhe[1]).toMatchObject({ dias: 5, diasDoMes: 31, percentual: "0.161290" });
  });

  it("um único dia rende 1/diasDoMes da taxa; termo inicial posterior ao final rende zero", () => {
    const umDia = jurosSimples({ ...antigo, termoInicial: "2018-05-25", termoFinal: "2018-05-25" });
    expect(paraTexto(umDia.percentual, 6)).toBe("0.032258");
    const invertido = jurosSimples({
      ...antigo,
      termoInicial: "2018-06-01",
      termoFinal: "2018-05-25",
    });
    expect(paraTexto(invertido.percentual, 6)).toBe("0.000000");
    expect(invertido.detalhe).toEqual([]);
    expect(invertido.avisos).toEqual([]);
  });
});

describe("jurosSimples (regime novo: taxa legal da Lei 14.905/2024 e transição)", () => {
  const padrao = metodologiaPadrao();
  const novo = { metodologia: padrao, indices: tabelaRegimeNovo(), casas: 6 };

  it("reproduz o exemplo oficial da Calculadora do Cidadão: 30/08/2024 a 31/08/2024 = 1 dia da taxa de agosto", () => {
    const r = jurosSimples({ ...novo, termoInicial: "2024-08-30", termoFinal: "2024-08-31" });
    expect(paraTexto(r.percentual, 6)).toBe("0.019526");
    expect(r.detalhe).toEqual([
      {
        regime: "taxaLegal",
        de: "2024-08-30",
        ate: "2024-08-30",
        dias: 1,
        diasDoMes: 31,
        taxa: "0.605306",
        percentual: "0.019526",
      },
    ]);
    expect(r.avisos).toEqual([]);
    expect(r.mesesSemTaxaLegal).toEqual([]);
  });

  it("conta o dia do lançamento e não conta o dia do cálculo, como a Calculadora: 30/09/2024 → 11/10/2026 = 17,247591%", () => {
    const r = jurosSimples({ ...novo, termoInicial: "2024-09-30", termoFinal: "2026-10-11" });
    expect(paraTexto(r.percentual, 6)).toBe("17.247591");
    expect(r.detalhe).toHaveLength(26);
    expect(r.detalhe[0]).toEqual({
      regime: "taxaLegal",
      de: "2024-09-30",
      ate: "2024-09-30",
      dias: 1,
      diasDoMes: 30,
      taxa: "0.676227",
      percentual: "0.022541",
    });
    expect(r.detalhe[25]).toEqual({
      regime: "taxaLegal",
      de: "2026-10-01",
      ate: "2026-10-10",
      dias: 10,
      diasDoMes: 31,
      taxa: "0.379020",
      percentual: "0.122265",
    });
  });

  it("mês com taxa legal zero (mar/2025, piso da Resolução CMN 5.171) entra com zero", () => {
    const r = jurosSimples({ ...novo, termoInicial: "2025-03-10", termoFinal: "2025-03-31" });
    expect(paraTexto(r.percentual, 6)).toBe("0.000000");
    expect(r.detalhe).toEqual([
      {
        regime: "taxaLegal",
        de: "2025-03-10",
        ate: "2025-03-30",
        dias: 21,
        diasDoMes: 31,
        taxa: "0.000000",
        percentual: "0.000000",
      },
    ]);
  });

  it("lançamento datado no dia do cálculo não rende juros no regime novo", () => {
    const r = jurosSimples({ ...novo, termoInicial: "2026-10-11", termoFinal: "2026-10-11" });
    expect(paraTexto(r.percentual, 6)).toBe("0.000000");
    expect(r.detalhe).toEqual([]);
    expect(r.avisos).toEqual([]);
  });

  it("transição: 1% ao mês até 29/08/2024 (duas pontas) e taxa legal de 30/08/2024 em diante, com 30/08 contado", () => {
    const r = jurosSimples({ ...novo, termoInicial: "2024-03-10", termoFinal: "2026-10-11" });
    expect(paraTexto(r.percentual, 6)).toBe("23.585491");
    expect(r.detalhe).toHaveLength(33);
    expect(r.detalhe.slice(0, 7).map((d) => [d.regime, d.de, d.ate, d.dias, d.percentual])).toEqual(
      [
        ["percentualMensal", "2024-03-10", "2024-03-31", 22, "0.709677"],
        ["percentualMensal", "2024-04-01", "2024-04-30", 30, "1.000000"],
        ["percentualMensal", "2024-05-01", "2024-05-31", 31, "1.000000"],
        ["percentualMensal", "2024-06-01", "2024-06-30", 30, "1.000000"],
        ["percentualMensal", "2024-07-01", "2024-07-31", 31, "1.000000"],
        ["percentualMensal", "2024-08-01", "2024-08-29", 29, "0.935484"],
        ["taxaLegal", "2024-08-30", "2024-08-31", 2, "0.039052"],
      ],
    );
  });

  it("lançamento em 29/08/2024: um dia do regime antigo e a taxa legal desde 30/08", () => {
    const r = jurosSimples({ ...novo, termoInicial: "2024-08-29", termoFinal: "2026-10-11" });
    expect(paraTexto(r.percentual, 6)).toBe("17.972588");
    expect(r.detalhe[0]).toMatchObject({
      regime: "percentualMensal",
      de: "2024-08-29",
      ate: "2024-08-29",
      dias: 1,
      percentual: "0.032258",
    });
    expect(r.detalhe[1]).toMatchObject({
      regime: "taxaLegal",
      de: "2024-08-30",
      ate: "2024-08-31",
      dias: 2,
      percentual: "0.039052",
    });
  });

  it("metodologia com três períodos e taxas distintas: 1%, 2% e taxa legal", () => {
    const tresPeriodos: Metodologia = {
      ...padrao,
      periodos: [
        {
          de: null,
          ate: "2024-06-30",
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "1" },
        },
        {
          de: "2024-07-01",
          ate: "2024-08-29",
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "2" },
        },
        { de: "2024-08-30", ate: null, correcao: { indice: "IPCA" }, juros: { tipo: "taxaLegal" } },
      ],
    };
    const r = jurosSimples({
      ...novo,
      metodologia: tresPeriodos,
      termoInicial: "2024-01-10",
      termoFinal: "2026-10-11",
    });
    expect(paraTexto(r.percentual, 6)).toBe("27.520975");
    expect(r.detalhe.slice(5, 9).map((d) => [d.de, d.ate, d.taxa, d.percentual])).toEqual([
      ["2024-06-01", "2024-06-30", "1", "1.000000"],
      ["2024-07-01", "2024-07-31", "2", "2.000000"],
      ["2024-08-01", "2024-08-29", "2", "1.870968"],
      ["2024-08-30", "2024-08-31", "0.605306", "0.039052"],
    ]);
  });

  it("taxa legal ausente na tabela: aviso, e os dias ficam sem juros", () => {
    const r = jurosSimples({
      ...novo,
      indices: tabelaRegimeNovo({ "29543": "2026-09" }),
      termoInicial: "2026-10-01",
      termoFinal: "2026-10-11",
    });
    expect(paraTexto(r.percentual, 6)).toBe("0.000000");
    expect(r.detalhe).toEqual([]);
    expect(r.avisos).toEqual([
      "Taxa legal de out/2026 não disponível na tabela de índices: os dias de 01/10/2026 a 10/10/2026 ficaram sem juros.",
    ]);
    expect(r.mesesSemTaxaLegal).toEqual(["2026-10"]);
  });

  it("SELIC única: sem juros separados e sem aviso (a SELIC entra capitalizada na correção)", () => {
    const r = jurosSimples({
      ...novo,
      metodologia: metodologiaSelicUnica(),
      termoInicial: "2024-03-10",
      termoFinal: "2026-10-11",
    });
    expect(paraTexto(r.percentual, 6)).toBe("0.000000");
    expect(r.detalhe).toEqual([]);
    expect(r.avisos).toEqual([]);
  });

  it("devolve o percentual com precisão integral (arredondado só para exibir)", () => {
    const r = jurosSimples({ ...novo, termoInicial: "2024-09-30", termoFinal: "2026-10-11" });
    expect(r.percentual.decimalPlaces()).toBeGreaterThan(6);
  });
});
