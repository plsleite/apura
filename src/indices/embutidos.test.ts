import { describe, expect, it } from "vitest";
import type { CasoDeReferencia } from "../compartilhado/tipos.ts";
import { calcular } from "../motor/calcular.ts";
import textoDoCaso from "../motor/casos/2018-05-25-saj-tjms-alimentos.json?raw";
import { tabelaEmbutida } from "./embutidos.ts";

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

  it("marca a proveniência de cada valor e a data da consulta", () => {
    expect(igpm?.["2017-01"]?.fonte).toBe("embutida");
    expect(igpm?.["2017-01"]?.obtidoEm).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(tabela.consultadoEm).toBe(igpm?.["2017-01"]?.obtidoEm);
    expect(tabela.series["433"]).toBeUndefined(); // IPCA só entra na fase 2
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
