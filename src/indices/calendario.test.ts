import { describe, expect, it } from "vitest";
import type {
  CodigoSerie,
  Competencia,
  TabelaIndices,
  ValorIndice,
} from "../compartilhado/tipos.ts";
import { agruparAtrasados, esperadoAte, mesesAtrasados, ultimoMesEsperado } from "./calendario.ts";

const SEIS_SERIES: CodigoSerie[] = ["188", "189", "433", "1619", "29543", "4390"];

/** Tabela de teste com as competências indicadas por série; o valor em si não importa ao calendário. */
function tabelaCom(meses: Partial<Record<CodigoSerie, Competencia[]>>): TabelaIndices {
  const series: TabelaIndices["series"] = {};
  for (const [codigo, lista] of Object.entries(meses) as Array<[CodigoSerie, Competencia[]]>) {
    const valores: Record<Competencia, ValorIndice> = {};
    for (const competencia of lista) {
      valores[competencia] = {
        valor: "0.50",
        fonte: "embutida",
        obtidoEm: "2026-10-11T14:02:00-03:00",
      };
    }
    series[codigo] = valores;
  }
  return { consultadoEm: "2026-10-11T14:02:00-03:00", series };
}

describe("calendário de divulgação", () => {
  describe("ultimoMesEsperado", () => {
    it("em 11/10/2026 espera os meses dos exemplos da especificação", () => {
      expect(ultimoMesEsperado("433", "2026-10-11")).toBe("2026-08");
      expect(ultimoMesEsperado("188", "2026-10-11")).toBe("2026-08");
      expect(ultimoMesEsperado("189", "2026-10-11")).toBe("2026-09");
      expect(ultimoMesEsperado("29543", "2026-10-11")).toBe("2026-10");
      expect(ultimoMesEsperado("4390", "2026-10-11")).toBe("2026-10");
      expect(ultimoMesEsperado("1619", "2026-10-11")).toBe("2026-12");
    });

    it("IPCA e INPC: do dia 15 em diante espera o mês anterior; antes, o retrasado", () => {
      expect(ultimoMesEsperado("433", "2026-10-14")).toBe("2026-08");
      expect(ultimoMesEsperado("433", "2026-10-15")).toBe("2026-09");
      expect(ultimoMesEsperado("433", "2026-10-31")).toBe("2026-09");
      expect(ultimoMesEsperado("188", "2026-10-14")).toBe("2026-08");
      expect(ultimoMesEsperado("188", "2026-10-15")).toBe("2026-09");
      expect(ultimoMesEsperado("433", "2026-10-01")).toBe("2026-08");
    });

    it("IGP-M: do dia 5 em diante espera o mês anterior; antes, o retrasado", () => {
      expect(ultimoMesEsperado("189", "2026-11-03")).toBe("2026-09");
      expect(ultimoMesEsperado("189", "2026-11-04")).toBe("2026-09");
      expect(ultimoMesEsperado("189", "2026-11-05")).toBe("2026-10");
      expect(ultimoMesEsperado("189", "2026-11-30")).toBe("2026-10");
    });

    it("taxa legal e SELIC: do dia 5 em diante espera o próprio mês; antes, o anterior", () => {
      expect(ultimoMesEsperado("29543", "2026-11-03")).toBe("2026-10");
      expect(ultimoMesEsperado("29543", "2026-11-04")).toBe("2026-10");
      expect(ultimoMesEsperado("29543", "2026-11-05")).toBe("2026-11");
      expect(ultimoMesEsperado("4390", "2026-11-03")).toBe("2026-10");
      expect(ultimoMesEsperado("4390", "2026-11-04")).toBe("2026-10");
      expect(ultimoMesEsperado("4390", "2026-11-05")).toBe("2026-11");
      expect(ultimoMesEsperado("4390", "2026-10-01")).toBe("2026-09");
    });

    it("salário mínimo: de fevereiro em diante espera dezembro do ano; em janeiro, dezembro do ano anterior", () => {
      expect(ultimoMesEsperado("1619", "2027-01-20")).toBe("2026-12");
      expect(ultimoMesEsperado("1619", "2027-01-01")).toBe("2026-12");
      expect(ultimoMesEsperado("1619", "2027-01-31")).toBe("2026-12");
      expect(ultimoMesEsperado("1619", "2027-02-01")).toBe("2027-12");
      expect(ultimoMesEsperado("1619", "2027-12-31")).toBe("2027-12");
    });

    it("vira o ano ao andar um ou dois meses para trás", () => {
      expect(ultimoMesEsperado("433", "2027-01-14")).toBe("2026-11");
      expect(ultimoMesEsperado("188", "2027-01-14")).toBe("2026-11");
      expect(ultimoMesEsperado("433", "2027-01-15")).toBe("2026-12");
      expect(ultimoMesEsperado("433", "2027-02-14")).toBe("2026-12");
      expect(ultimoMesEsperado("433", "2027-02-15")).toBe("2027-01");
      expect(ultimoMesEsperado("189", "2027-01-04")).toBe("2026-11");
      expect(ultimoMesEsperado("189", "2027-01-05")).toBe("2026-12");
      expect(ultimoMesEsperado("29543", "2027-01-04")).toBe("2026-12");
      expect(ultimoMesEsperado("29543", "2027-01-05")).toBe("2027-01");
      expect(ultimoMesEsperado("4390", "2027-01-04")).toBe("2026-12");
      expect(ultimoMesEsperado("4390", "2027-01-05")).toBe("2027-01");
    });
  });

  describe("esperadoAte", () => {
    it("reúne as seis séries para a data", () => {
      expect(esperadoAte("2026-10-11")).toEqual({
        "188": "2026-08",
        "189": "2026-09",
        "433": "2026-08",
        "1619": "2026-12",
        "29543": "2026-10",
        "4390": "2026-10",
      });
    });

    it("no início de janeiro, tudo recua para o ano anterior", () => {
      expect(esperadoAte("2027-01-03")).toEqual({
        "188": "2026-11",
        "189": "2026-11",
        "433": "2026-11",
        "1619": "2026-12",
        "29543": "2026-12",
        "4390": "2026-12",
      });
    });

    it("cada entrada coincide com ultimoMesEsperado da série", () => {
      const esperado = esperadoAte("2026-11-05");
      for (const serie of SEIS_SERIES) {
        expect(esperado[serie]).toBe(ultimoMesEsperado(serie, "2026-11-05"));
      }
    });
  });

  describe("mesesAtrasados", () => {
    it("IPCA até jul/2026 em 11/10/2026: falta ago/2026, previsto por volta de 10/09/2026", () => {
      const tabela = tabelaCom({ "433": ["2026-05", "2026-06", "2026-07"] });
      expect(mesesAtrasados(tabela, "2026-10-11")).toEqual([
        { serie: "433", competencia: "2026-08", previsao: "por volta de 10/09/2026" },
      ]);
    });

    it("série em dia ou adiantada não gera atraso", () => {
      expect(mesesAtrasados(tabelaCom({ "433": ["2026-07", "2026-08"] }), "2026-10-11")).toEqual(
        [],
      );
      expect(
        mesesAtrasados(tabelaCom({ "433": ["2026-08", "2026-09", "2026-10"] }), "2026-10-11"),
      ).toEqual([]);
      expect(mesesAtrasados(tabelaCom({ "1619": ["2026-12"] }), "2027-01-20")).toEqual([]);
    });

    it("série ausente da tabela não gera nada; tabela vazia devolve lista vazia", () => {
      expect(mesesAtrasados(tabelaCom({ "189": ["2026-09"] }), "2026-10-11")).toEqual([]);
      expect(mesesAtrasados(tabelaCom({}), "2026-10-11")).toEqual([]);
    });

    it("série presente sem nenhum mês é tratada como ausente", () => {
      expect(mesesAtrasados(tabelaCom({ "433": [] }), "2026-10-11")).toEqual([]);
    });

    it("lista todos os meses do seguinte ao último presente até o esperado, em ordem crescente", () => {
      const tabela = tabelaCom({ "433": ["2026-06"] });
      expect(mesesAtrasados(tabela, "2026-10-15")).toEqual([
        { serie: "433", competencia: "2026-07", previsao: "por volta de 10/08/2026" },
        { serie: "433", competencia: "2026-08", previsao: "por volta de 10/09/2026" },
        { serie: "433", competencia: "2026-09", previsao: "por volta de 10/10/2026" },
      ]);
    });

    it("usa o último mês presente, não a ordem das chaves nem buracos no meio", () => {
      const tabela = tabelaCom({ "189": ["2026-08", "2026-05", "2026-07"] });
      expect(mesesAtrasados(tabela, "2026-11-05")).toEqual([
        { serie: "189", competencia: "2026-09", previsao: "no fim de set/2026" },
        { serie: "189", competencia: "2026-10", previsao: "no fim de out/2026" },
      ]);
    });

    it("ordena as séries numericamente (188, 189, 433, 1619, 4390, 29543) e os meses crescentes", () => {
      const tabela = tabelaCom({
        "29543": ["2026-09"],
        "4390": ["2026-09"],
        "433": ["2026-07"],
        "188": ["2026-08"],
        "189": ["2026-08"],
        "1619": ["2026-12"],
      });
      expect(mesesAtrasados(tabela, "2026-10-11")).toEqual([
        { serie: "189", competencia: "2026-09", previsao: "no fim de set/2026" },
        { serie: "433", competencia: "2026-08", previsao: "por volta de 10/09/2026" },
        {
          serie: "4390",
          competencia: "2026-10",
          previsao: "ao longo de out/2026, como acumulado parcial fechado no início de nov/2026",
        },
        { serie: "29543", competencia: "2026-10", previsao: "no 1º dia útil de out/2026" },
      ]);
    });

    it("salário mínimo: em fevereiro, com a série ainda no ano anterior, faltam os doze meses do ano", () => {
      const atrasados = mesesAtrasados(tabelaCom({ "1619": ["2026-12"] }), "2027-02-01");
      expect(atrasados).toHaveLength(12);
      expect(atrasados[0]).toEqual({
        serie: "1619",
        competencia: "2027-01",
        previsao: "no início de 2027, com o decreto do salário mínimo",
      });
      expect(atrasados[11]?.competencia).toBe("2027-12");
      expect(atrasados.every((a) => a.serie === "1619")).toBe(true);
    });

    it("a virada de ano entra na contagem", () => {
      const tabela = tabelaCom({ "433": ["2026-11"] });
      expect(mesesAtrasados(tabela, "2027-02-15")).toEqual([
        { serie: "433", competencia: "2026-12", previsao: "por volta de 10/01/2027" },
        { serie: "433", competencia: "2027-01", previsao: "por volta de 10/02/2027" },
      ]);
    });
  });
});

describe("agruparAtrasados", () => {
  it("junta meses seguidos da mesma série com a mesma previsão (salário mínimo do ano inteiro)", () => {
    const tabela = {
      consultadoEm: "2026-10-11T20:11:55-03:00",
      series: {
        "1619": {
          "2026-12": {
            valor: "1621.00",
            fonte: "embutida" as const,
            obtidoEm: "2026-10-11T20:11:55-03:00",
          },
        },
      },
    };
    const grupos = agruparAtrasados(mesesAtrasados(tabela, "2027-02-01"));
    expect(grupos).toEqual([
      {
        serie: "1619",
        de: "2027-01",
        ate: "2027-12",
        previsao: "no início de 2027, com o decreto do salário mínimo",
      },
    ]);
  });

  it("mantém separados os meses com previsões diferentes e as séries diferentes", () => {
    const grupos = agruparAtrasados([
      { serie: "433", competencia: "2026-08", previsao: "por volta de 10/09/2026" },
      { serie: "433", competencia: "2026-09", previsao: "por volta de 10/10/2026" },
      { serie: "4390", competencia: "2026-10", previsao: "x" },
      { serie: "29543", competencia: "2026-10", previsao: "x" },
    ]);
    expect(grupos.map((g) => `${g.serie}:${g.de}-${g.ate}`)).toEqual([
      "433:2026-08-2026-08",
      "433:2026-09-2026-09",
      "4390:2026-10-2026-10",
      "29543:2026-10-2026-10",
    ]);
  });

  it("não junta meses não seguidos, mesmo com a mesma previsão; lista vazia dá lista vazia", () => {
    const grupos = agruparAtrasados([
      { serie: "1619", competencia: "2027-01", previsao: "p" },
      { serie: "1619", competencia: "2027-03", previsao: "p" },
    ]);
    expect(grupos).toHaveLength(2);
    expect(agruparAtrasados([])).toEqual([]);
  });
});
