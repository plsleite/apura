import { describe, expect, it } from "vitest";
import type { Metodologia, PeriodoMetodologia } from "../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../metodologias/padrao.ts";
import { dividirPorPeriodos, periodoVigenteEm, validarMetodologia } from "./periodos.ts";

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

  it("a metodologia padrão é contínua: nenhum aviso", () => {
    expect(validarMetodologia(padrao)).toEqual([]);
  });

  it("avisa lacuna entre períodos, e os dias da lacuna ficam fora dos trechos", () => {
    const comLacuna: Metodologia = {
      ...padrao,
      periodos: [
        {
          de: null,
          ate: "2020-12-31",
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "1" },
        },
        { de: "2021-02-01", ate: null, correcao: { indice: "IPCA" }, juros: { tipo: "taxaLegal" } },
      ],
    };
    expect(validarMetodologia(comLacuna)).toEqual([
      "A metodologia não cobre o período de 01/01/2021 a 31/01/2021: esses dias ficam sem correção e sem juros.",
    ]);
    expect(
      dividirPorPeriodos(comLacuna, "2020-12-10", "2021-02-10").map((t) => [t.de, t.ate]),
    ).toEqual([
      ["2020-12-10", "2020-12-31"],
      ["2021-02-01", "2021-02-10"],
    ]);
  });

  it("avisa sobreposição; o período iniciado antes fica com os dias comuns, sem contar dia duas vezes", () => {
    const sobrepostos: Metodologia = {
      ...padrao,
      periodos: [
        { de: "2021-01-01", ate: null, correcao: { indice: "IPCA" }, juros: { tipo: "taxaLegal" } },
        {
          de: null,
          ate: "2021-01-31",
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "1" },
        },
      ],
    };
    expect(validarMetodologia(sobrepostos)).toEqual([
      "Os períodos se sobrepõem de 01/01/2021 a 31/01/2021: nesses dias prevaleceu o período iniciado antes.",
    ]);
    expect(periodoVigenteEm(sobrepostos, "2021-01-15")?.correcao.indice).toBe("IGP-M");
    expect(
      dividirPorPeriodos(sobrepostos, "2020-12-10", "2021-02-10").map((t) => [
        t.de,
        t.ate,
        t.periodo.correcao.indice,
      ]),
    ).toEqual([
      ["2020-12-10", "2021-01-31", "IGP-M"],
      ["2021-02-01", "2021-02-10", "IPCA"],
    ]);
  });

  it("avisa extremos descobertos e metodologia sem períodos", () => {
    const fechada: Metodologia = {
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
    expect(validarMetodologia(fechada)).toEqual([
      "A metodologia não cobre datas anteriores a 01/01/2020: esses dias ficam sem correção e sem juros.",
      "A metodologia não cobre datas posteriores a 31/12/2020: esses dias ficam sem correção e sem juros.",
    ]);
    expect(validarMetodologia({ ...padrao, periodos: [] })).toEqual([
      "A metodologia não tem períodos: nenhum lançamento recebe correção nem juros.",
    ]);
  });
  it("períodos aninhados e inícios abertos: compara com o fim mais distante já coberto", () => {
    const comPeriodos = (periodos: Metodologia["periodos"]): Metodologia => ({
      ...padrao,
      periodos,
    });
    const correcao: PeriodoMetodologia["correcao"] = { indice: "IGP-M" };
    const juros: PeriodoMetodologia["juros"] = { tipo: "percentualMensal", taxaMensal: "1" };
    expect(
      validarMetodologia(
        comPeriodos([
          { de: null, ate: null, correcao, juros },
          { de: "2020-01-01", ate: "2020-06-30", correcao, juros },
        ]),
      ),
    ).toEqual([
      "Os períodos se sobrepõem de 01/01/2020 a 30/06/2020: nesses dias prevaleceu o período iniciado antes.",
    ]);
    expect(
      validarMetodologia(
        comPeriodos([
          { de: "2020-01-01", ate: "2020-12-31", correcao, juros },
          { de: "2020-03-01", ate: "2020-04-30", correcao, juros },
          { de: "2020-08-01", ate: "2021-06-30", correcao, juros },
        ]),
      ),
    ).toEqual([
      "A metodologia não cobre datas anteriores a 01/01/2020: esses dias ficam sem correção e sem juros.",
      "Os períodos se sobrepõem de 01/03/2020 a 30/04/2020: nesses dias prevaleceu o período iniciado antes.",
      "Os períodos se sobrepõem de 01/08/2020 a 31/12/2020: nesses dias prevaleceu o período iniciado antes.",
      "A metodologia não cobre datas posteriores a 30/06/2021: esses dias ficam sem correção e sem juros.",
    ]);
    expect(
      validarMetodologia(
        comPeriodos([
          { de: null, ate: "2020-12-31", correcao, juros },
          { de: null, ate: "2021-12-31", correcao, juros },
        ]),
      ),
    ).toEqual([
      "Os períodos se sobrepõem até 31/12/2020: nesses dias prevaleceu o período iniciado antes.",
      "A metodologia não cobre datas posteriores a 31/12/2021: esses dias ficam sem correção e sem juros.",
    ]);
  });
});
