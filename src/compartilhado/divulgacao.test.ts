import { describe, expect, it } from "vitest";
import { aindaNaoDivulgado, divulgacaoPrevista } from "./divulgacao.ts";
import type { CodigoSerie, TabelaIndices } from "./tipos.ts";

const SEIS_SERIES: CodigoSerie[] = ["188", "189", "433", "1619", "29543", "4390"];

describe("divulgacaoPrevista", () => {
  it("IPCA e INPC: por volta do dia 10 do mês seguinte", () => {
    expect(divulgacaoPrevista("433", "2026-10")).toBe("por volta de 10/11/2026");
    expect(divulgacaoPrevista("188", "2026-10")).toBe("por volta de 10/11/2026");
    expect(divulgacaoPrevista("433", "2026-08")).toBe("por volta de 10/09/2026");
  });

  it("IPCA e INPC de dezembro: janeiro do ano seguinte", () => {
    expect(divulgacaoPrevista("433", "2026-12")).toBe("por volta de 10/01/2027");
    expect(divulgacaoPrevista("188", "2026-12")).toBe("por volta de 10/01/2027");
  });

  it("IGP-M: no fim do próprio mês", () => {
    expect(divulgacaoPrevista("189", "2026-10")).toBe("no fim de out/2026");
    expect(divulgacaoPrevista("189", "2027-01")).toBe("no fim de jan/2027");
  });

  it("taxa legal: no 1º dia útil do mês de referência", () => {
    expect(divulgacaoPrevista("29543", "2026-11")).toBe("no 1º dia útil de nov/2026");
    expect(divulgacaoPrevista("29543", "2026-10")).toBe("no 1º dia útil de out/2026");
  });

  it("SELIC: ao longo do mês, fechada no início do seguinte", () => {
    expect(divulgacaoPrevista("4390", "2026-10")).toBe(
      "ao longo de out/2026, como acumulado parcial fechado no início de nov/2026",
    );
    expect(divulgacaoPrevista("4390", "2026-12")).toBe(
      "ao longo de dez/2026, como acumulado parcial fechado no início de jan/2027",
    );
  });

  it("salário mínimo: no início do ano da competência, com o decreto", () => {
    expect(divulgacaoPrevista("1619", "2027-01")).toBe(
      "no início de 2027, com o decreto do salário mínimo",
    );
    expect(divulgacaoPrevista("1619", "2027-12")).toBe(
      "no início de 2027, com o decreto do salário mínimo",
    );
  });

  it('nenhuma frase termina com ponto final, para encaixar em "(previsão: …)"', () => {
    for (const serie of SEIS_SERIES) {
      const frase = divulgacaoPrevista(serie, "2026-10");
      expect(frase.length).toBeGreaterThan(0);
      expect(frase.endsWith(".")).toBe(false);
    }
  });
});

describe("aindaNaoDivulgado", () => {
  const semSeries: TabelaIndices = { consultadoEm: "2026-10-11T14:02:00-03:00", series: {} };
  const comCalendario = (): TabelaIndices => ({
    ...semSeries,
    esperadoAte: { "433": "2026-09", "29543": "2026-10" },
  });

  it("é verdadeiro só quando a tabela traz o esperadoAte da série e a competência é posterior a ele", () => {
    const tabela = comCalendario();
    expect(aindaNaoDivulgado(tabela, "433", "2026-10")).toBe(true);
    expect(aindaNaoDivulgado(tabela, "433", "2027-01")).toBe(true);
    expect(aindaNaoDivulgado(tabela, "433", "2026-09")).toBe(false);
    expect(aindaNaoDivulgado(tabela, "433", "2025-05")).toBe(false);
    expect(aindaNaoDivulgado(tabela, "29543", "2026-11")).toBe(true);
    expect(aindaNaoDivulgado(tabela, "29543", "2026-10")).toBe(false);
  });

  it("sem esperadoAte na tabela (casos de referência antigos) é sempre falso", () => {
    expect(aindaNaoDivulgado(semSeries, "433", "2026-10")).toBe(false);
    expect(aindaNaoDivulgado(semSeries, "433", "2099-12")).toBe(false);
  });

  it("série ausente do esperadoAte (calendário parcial) é sempre falso", () => {
    const tabela = comCalendario();
    expect(aindaNaoDivulgado(tabela, "1619", "2027-01")).toBe(false);
    expect(aindaNaoDivulgado(tabela, "189", "2026-10")).toBe(false);
  });

  it("não depende de a série ou o mês existirem na tabela: só do calendário", () => {
    const tabela: TabelaIndices = {
      consultadoEm: "2026-10-11T14:02:00-03:00",
      series: {},
      esperadoAte: { "433": "2026-09" },
    };
    expect(aindaNaoDivulgado(tabela, "433", "2026-10")).toBe(true);
    expect(aindaNaoDivulgado(tabela, "433", "2026-09")).toBe(false);
  });
});
