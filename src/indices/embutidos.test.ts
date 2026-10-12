import { describe, expect, it } from "vitest";
import type { CasoDeReferencia } from "../compartilhado/tipos.ts";
import { calcular } from "../motor/calcular.ts";
import textoDoCaso from "../motor/casos/2018-05-25-saj-tjms-alimentos.json?raw";
import { lerArquivoSerie, tabelaEmbutida } from "./embutidos.ts";

describe("cópia embutida dos índices", () => {
  const tabela = tabelaEmbutida();
  const igpm = tabela.series["189"];

  it("traz o IGP-M desde jun/1989, com os valores usados no caso SAJ 2018", () => {
    expect(igpm?.["1989-06"]?.valor).toBe("19.68");
    expect(igpm?.["2017-01"]?.valor).toBe("0.64");
    expect(igpm?.["2017-04"]?.valor).toBe("-1.10");
    expect(igpm?.["2018-04"]?.valor).toBe("0.57");
    expect(igpm?.["2018-05"]?.valor).toBe("1.38");
    expect(Object.keys(igpm ?? {}).length).toBeGreaterThanOrEqual(440);
  });

  it("traz o IPCA, a taxa legal e a SELIC do regime novo", () => {
    expect(tabela.series["433"]?.["1980-01"]?.valor).toBe("6.62");
    expect(tabela.series["433"]?.["2024-08"]?.valor).toBe("-0.02");
    expect(tabela.series["29543"]?.["2024-08"]?.valor).toBe("0.605306");
    expect(tabela.series["29543"]?.["2025-03"]?.valor).toBe("0.000000");
    expect(tabela.series["4390"]?.["1986-08"]?.valor).toBe("2.57");
    expect(tabela.series["4390"]?.["2024-03"]?.valor).toBe("0.83");
  });

  it("traz o INPC desde abr/1979 e o salário mínimo desde fev/1990, com os meses futuros do ano já publicados", () => {
    expect(tabela.series["188"]?.["1979-04"]?.valor).toBe("3.45");
    expect(tabela.series["188"]?.["2017-01"]?.valor).toBe("0.42");
    expect(tabela.series["188"]?.["2025-01"]?.valor).toBe("0.00");
    expect(tabela.series["188"]?.["2026-09"]?.valor).toBe("0.82");
    expect(tabela.series["1619"]?.["1990-02"]?.valor).toBe("2004.37");
    expect(tabela.series["1619"]?.["2017-01"]?.valor).toBe("937.00");
    expect(tabela.series["1619"]?.["2018-01"]?.valor).toBe("954.00");
    expect(tabela.series["1619"]?.["2023-04"]?.valor).toBe("1302.00");
    expect(tabela.series["1619"]?.["2023-05"]?.valor).toBe("1320.00");
    expect(tabela.series["1619"]?.["2024-01"]?.valor).toBe("1412.00");
    expect(tabela.series["1619"]?.["2025-01"]?.valor).toBe("1518.00");
    expect(tabela.series["1619"]?.["2026-01"]?.valor).toBe("1621.00");
    expect(tabela.series["1619"]?.["2026-12"]?.valor).toBe("1621.00");
  });

  it("recusa arquivo de série em formato inesperado", () => {
    expect(() =>
      lerArquivoSerie(
        { formato: "apura/serie@1", codigo: "189", obtidoEm: "x", valores: [] },
        "188",
      ),
    ).toThrow("Arquivo da série 188 em formato inesperado.");
    expect(() =>
      lerArquivoSerie({ formato: "outro", codigo: "188", obtidoEm: "x", valores: [] }, "188"),
    ).toThrow();
    expect(() =>
      lerArquivoSerie({ formato: "apura/serie@1", codigo: "188", obtidoEm: "x" }, "188"),
    ).toThrow();
    expect(() => lerArquivoSerie(null, "188")).toThrow();
    expect(
      lerArquivoSerie(
        {
          formato: "apura/serie@1",
          codigo: "188",
          nome: "",
          origem: "",
          obtidoEm: "x",
          valores: [],
        },
        "188",
      ).codigo,
    ).toBe("188");
  });

  it("marca a proveniência de cada valor; a data da consulta é a obtenção mais recente", () => {
    expect(tabela.consultadoEm).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    for (const serie of ["188", "189", "433", "1619", "29543", "4390"] as const) {
      const valores = Object.values(tabela.series[serie] ?? {});
      expect(valores.length).toBeGreaterThan(0);
      for (const v of valores) {
        expect(v.fonte).toBe("embutida");
        expect(v.obtidoEm <= tabela.consultadoEm).toBe(true);
      }
    }
  });

  it("limitada a abr/2018, reproduz o total do caso SAJ 2018 (os dados embutidos batem com o relatório)", () => {
    const caso = JSON.parse(textoDoCaso) as CasoDeReferencia;
    const ateAbril = Object.fromEntries(
      Object.entries(igpm ?? {}).filter(([competencia]) => competencia <= "2018-04"),
    );
    const resultado = calcular(caso.calculo, {
      consultadoEm: tabela.consultadoEm,
      series: { "189": ateAbril },
    });
    expect(resultado.totais).toEqual(caso.esperado.totais);
  });
});
