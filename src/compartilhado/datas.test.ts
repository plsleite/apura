import { describe, expect, it } from "vitest";
import {
  competenciaDe,
  competenciasEntre,
  competenciaValida,
  compor,
  dataValida,
  decompor,
  diaAnterior,
  diasDesdeEpoca,
  diasDoMes,
  diasEntre,
  diaSeguinte,
  mesSeguinte,
  primeiroDiaDoMes,
  ratearPorMesCalendario,
  ultimoDiaDoMes,
} from "./datas.ts";

describe("datas", () => {
  it("conhece os dias de cada mês, inclusive em ano bissexto", () => {
    expect(diasDoMes(2017, 1)).toBe(31);
    expect(diasDoMes(2017, 4)).toBe(30);
    expect(diasDoMes(2017, 2)).toBe(28);
    expect(diasDoMes(2024, 2)).toBe(29);
    expect(diasDoMes(1900, 2)).toBe(28);
    expect(diasDoMes(2000, 2)).toBe(29);
  });

  it("valida datas no formato AAAA-MM-DD", () => {
    expect(dataValida("2018-05-25")).toBe(true);
    expect(dataValida("2016-02-29")).toBe(true);
    expect(dataValida("2017-02-29")).toBe(false);
    expect(dataValida("2017-13-01")).toBe(false);
    expect(dataValida("2017-04-31")).toBe(false);
    expect(dataValida("25/05/2018")).toBe(false);
    expect(dataValida("2018-5-25")).toBe(false);
  });

  it("decompõe e compõe datas", () => {
    expect(decompor("2018-05-25")).toEqual({ ano: 2018, mes: 5, dia: 25 });
    expect(compor(2018, 5, 25)).toBe("2018-05-25");
    expect(() => decompor("2017-02-29")).toThrow();
  });

  it("extrai, valida e percorre competências", () => {
    expect(competenciaDe("2018-05-25")).toBe("2018-05");
    expect(competenciaValida("2018-05")).toBe(true);
    expect(competenciaValida("2018-13")).toBe(false);
    expect(competenciaValida("05/2018")).toBe(false);
    expect(mesSeguinte("2017-12")).toBe("2018-01");
    expect(mesSeguinte("2017-01")).toBe("2017-02");
    expect(competenciasEntre("2017-11", "2018-02")).toEqual([
      "2017-11",
      "2017-12",
      "2018-01",
      "2018-02",
    ]);
    expect(competenciasEntre("2018-02", "2018-02")).toEqual(["2018-02"]);
    expect(competenciasEntre("2018-02", "2017-11")).toEqual([]);
    expect(primeiroDiaDoMes("2024-02")).toBe("2024-02-01");
    expect(ultimoDiaDoMes("2024-02")).toBe("2024-02-29");
    expect(ultimoDiaDoMes("2017-04")).toBe("2017-04-30");
  });

  it("conta dias sem objetos Date", () => {
    expect(diasDesdeEpoca("1970-01-01")).toBe(0);
    expect(diasDesdeEpoca("1970-01-02")).toBe(1);
    expect(diasDesdeEpoca("2000-03-01")).toBe(11017);
    expect(diasDesdeEpoca("2017-01-10")).toBe(17176);
    expect(diasDesdeEpoca("1900-03-01")).toBe(-25508);
    expect(diasEntre("2017-01-10", "2018-05-25")).toBe(500);
    expect(diasEntre("2024-02-28", "2024-03-01")).toBe(2);
    expect(diasEntre("2023-02-28", "2023-03-01")).toBe(1);
    expect(diasEntre("2018-05-25", "2017-01-10")).toBe(-500);
  });

  it("rateia por mês-calendário contando as duas pontas (convenção do SAJ)", () => {
    const trechos = ratearPorMesCalendario("2017-01-10", "2018-05-25");
    expect(trechos).toHaveLength(17);
    expect(trechos[0]).toEqual({
      competencia: "2017-01",
      de: "2017-01-10",
      ate: "2017-01-31",
      dias: 22,
      diasDoMes: 31,
    });
    expect(trechos[1]).toEqual({
      competencia: "2017-02",
      de: "2017-02-01",
      ate: "2017-02-28",
      dias: 28,
      diasDoMes: 28,
    });
    expect(trechos[16]).toEqual({
      competencia: "2018-05",
      de: "2018-05-01",
      ate: "2018-05-25",
      dias: 25,
      diasDoMes: 31,
    });
  });

  it("rateia fevereiro bissexto, intervalos de um dia e intervalos invertidos", () => {
    expect(ratearPorMesCalendario("2024-02-10", "2024-03-05")).toEqual([
      { competencia: "2024-02", de: "2024-02-10", ate: "2024-02-29", dias: 20, diasDoMes: 29 },
      { competencia: "2024-03", de: "2024-03-01", ate: "2024-03-05", dias: 5, diasDoMes: 31 },
    ]);
    expect(ratearPorMesCalendario("2018-05-25", "2018-05-25")).toEqual([
      { competencia: "2018-05", de: "2018-05-25", ate: "2018-05-25", dias: 1, diasDoMes: 31 },
    ]);
    expect(ratearPorMesCalendario("2018-05-25", "2018-05-24")).toEqual([]);
  });

  it("anda um dia para trás e para a frente, inclusive na virada de mês e de ano", () => {
    expect(diaAnterior("2026-10-11")).toBe("2026-10-10");
    expect(diaAnterior("2026-10-01")).toBe("2026-09-30");
    expect(diaAnterior("2024-03-01")).toBe("2024-02-29");
    expect(diaAnterior("2025-01-01")).toBe("2024-12-31");
    expect(diaSeguinte("2024-02-29")).toBe("2024-03-01");
    expect(diaSeguinte("2024-12-31")).toBe("2025-01-01");
    expect(diaSeguinte("2024-08-29")).toBe("2024-08-30");
  });
});
