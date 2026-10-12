import { afterEach, describe, expect, it, vi } from "vitest";
import { competenciaDe } from "../compartilhado/datas.ts";
import {
  agoraEmBrasilia,
  dataHoraEmBrasilia,
  formatarDataHoraBrasilia,
  hojeEmBrasilia,
  compararInstantes,
} from "./relogio.ts";

const FORMATO_ISO_COM_DESLOCAMENTO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;

describe("relógio de Brasília", () => {
  describe("agoraEmBrasilia", () => {
    it("converte 23:30 de Campo Grande (UTC−4) para 00:30 do dia seguinte em Brasília", () => {
      expect(agoraEmBrasilia(new Date("2026-10-31T23:30:00-04:00"))).toBe(
        "2026-11-01T00:30:00-03:00",
      );
    });

    it("converte um instante dado em UTC", () => {
      expect(agoraEmBrasilia(new Date("2026-10-11T17:02:00Z"))).toBe("2026-10-11T14:02:00-03:00");
    });

    it("descarta os milissegundos e mantém os segundos inteiros", () => {
      expect(agoraEmBrasilia(new Date("2026-10-11T17:02:33.999Z"))).toBe(
        "2026-10-11T14:02:33-03:00",
      );
    });

    it("escreve a meia-noite como 00, nunca 24", () => {
      expect(agoraEmBrasilia(new Date("2026-10-12T03:00:00Z"))).toBe("2026-10-12T00:00:00-03:00");
    });

    it("volta ao ano anterior quando o UTC já virou o ano", () => {
      expect(agoraEmBrasilia(new Date("2027-01-01T01:30:00Z"))).toBe("2026-12-31T22:30:00-03:00");
    });

    it("tira o deslocamento do Intl: no horário de verão de 2018, Brasília era UTC−2", () => {
      expect(agoraEmBrasilia(new Date("2018-12-25T12:00:00Z"))).toBe("2018-12-25T10:00:00-02:00");
    });

    it("competenciaDe sobre o resultado dá o mês de Brasília, não o do fuso de origem", () => {
      expect(competenciaDe(agoraEmBrasilia(new Date("2026-10-31T23:30:00-04:00")))).toBe("2026-11");
      expect(competenciaDe(agoraEmBrasilia(new Date("2026-11-01T02:59:59Z")))).toBe("2026-10");
      expect(competenciaDe(agoraEmBrasilia(new Date("2026-11-01T03:00:00Z")))).toBe("2026-11");
    });

    it("sem argumento, lê o relógio e devolve ISO com segundos e deslocamento", () => {
      expect(agoraEmBrasilia()).toMatch(FORMATO_ISO_COM_DESLOCAMENTO);
    });

    it("recusa um instante inválido com mensagem em português", () => {
      expect(() => agoraEmBrasilia(new Date("x"))).toThrow("Instante inválido");
    });
  });

  describe("hojeEmBrasilia", () => {
    it("dá a data de Brasília mesmo quando o UTC ainda está no dia anterior ou já no seguinte", () => {
      expect(hojeEmBrasilia(new Date("2026-10-31T23:30:00-04:00"))).toBe("2026-11-01");
      expect(hojeEmBrasilia(new Date("2026-10-11T17:02:00Z"))).toBe("2026-10-11");
      expect(hojeEmBrasilia(new Date("2026-10-12T02:59:59Z"))).toBe("2026-10-11");
      expect(hojeEmBrasilia(new Date("2026-10-12T03:00:00Z"))).toBe("2026-10-12");
    });

    it("sem argumento, lê o relógio e devolve AAAA-MM-DD", () => {
      expect(hojeEmBrasilia()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("formatarDataHoraBrasilia", () => {
    it("converte ISO em UTC com milissegundos para dd/mm/aaaa hh:mm de Brasília", () => {
      expect(formatarDataHoraBrasilia("2026-10-11T23:11:55.140Z")).toBe("11/10/2026 20:11");
    });

    it("mantém a hora de um ISO já em Brasília", () => {
      expect(formatarDataHoraBrasilia("2026-10-11T14:02:00-03:00")).toBe("11/10/2026 14:02");
    });

    it("converte ISO com outros deslocamentos, inclusive virando o dia", () => {
      expect(formatarDataHoraBrasilia("2026-10-31T23:30:00-04:00")).toBe("01/11/2026 00:30");
      expect(formatarDataHoraBrasilia("2026-10-11T18:02:00+01:00")).toBe("11/10/2026 14:02");
      expect(formatarDataHoraBrasilia("2027-01-01T01:30:00Z")).toBe("31/12/2026 22:30");
    });

    it("aceita ISO sem segundos", () => {
      expect(formatarDataHoraBrasilia("2026-10-11T14:02-03:00")).toBe("11/10/2026 14:02");
    });

    it("devolve o texto original quando não é ISO de data-hora válido", () => {
      expect(formatarDataHoraBrasilia("x")).toBe("x");
      expect(formatarDataHoraBrasilia("")).toBe("");
      expect(formatarDataHoraBrasilia("11/10/2026 14:02")).toBe("11/10/2026 14:02");
      expect(formatarDataHoraBrasilia("2026-13-45T00:00:00Z")).toBe("2026-13-45T00:00:00Z");
      expect(formatarDataHoraBrasilia("2026-02-30T00:00:00Z")).toBe("2026-02-30T00:00:00Z");
      expect(formatarDataHoraBrasilia("2026-10-11T24:00:00Z")).toBe("2026-10-11T24:00:00Z");
    });

    it("não adivinha o fuso: só data ou data-hora sem deslocamento voltam como estão", () => {
      expect(formatarDataHoraBrasilia("2026-10-11")).toBe("2026-10-11");
      expect(formatarDataHoraBrasilia("2026-10-11T14:02:00")).toBe("2026-10-11T14:02:00");
    });

    it("fecha o ciclo com agoraEmBrasilia", () => {
      const iso = agoraEmBrasilia(new Date("2026-10-11T17:02:00Z"));
      expect(formatarDataHoraBrasilia(iso)).toBe("11/10/2026 14:02");
    });
  });

  describe("dataHoraEmBrasilia", () => {
    it("dá a data e a hora em Brasília, virando o dia e o mês pelo fuso", () => {
      expect(dataHoraEmBrasilia("2026-11-01T01:30:00Z")).toEqual({
        data: "2026-10-31",
        hora: "22:30",
      });
      expect(dataHoraEmBrasilia("2026-10-31T23:30:00-04:00")).toEqual({
        data: "2026-11-01",
        hora: "00:30",
      });
    });

    it("mantém a data e a hora de um ISO já em Brasília", () => {
      expect(dataHoraEmBrasilia("2026-10-11T14:02:59-03:00")).toEqual({
        data: "2026-10-11",
        hora: "14:02",
      });
    });

    it("devolve null para o que não é ISO de data-hora válido com fuso", () => {
      expect(dataHoraEmBrasilia("x")).toBeNull();
      expect(dataHoraEmBrasilia("2026-10-11")).toBeNull();
      expect(dataHoraEmBrasilia("2026-10-11T14:02:00")).toBeNull();
      expect(dataHoraEmBrasilia("2026-02-30T00:00:00Z")).toBeNull();
    });
  });

  describe("quando o ambiente não sabe informar o deslocamento", () => {
    const Original = Intl.DateTimeFormat;

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("usa -03:00 como reserva e mantém a hora de Brasília calculada pelo Intl", () => {
      class SemLongOffset {
        constructor(locale?: string | string[], opcoes?: Intl.DateTimeFormatOptions) {
          if (opcoes?.timeZoneName !== undefined) {
            throw new RangeError(
              "Value longOffset out of range for Intl.DateTimeFormat options property timeZoneName",
            );
          }
          return new Original(locale, opcoes);
        }
      }
      vi.stubGlobal("Intl", Object.assign(Object.create(Intl), { DateTimeFormat: SemLongOffset }));

      expect(agoraEmBrasilia(new Date("2026-10-11T17:02:00Z"))).toBe("2026-10-11T14:02:00-03:00");
      expect(hojeEmBrasilia(new Date("2026-10-31T23:30:00-04:00"))).toBe("2026-11-01");
      expect(formatarDataHoraBrasilia("2026-10-11T23:11:55.140Z")).toBe("11/10/2026 20:11");
      // A hora é a certa (UTC−2 no verão de 2018); só o deslocamento escrito é o de reserva.
      expect(agoraEmBrasilia(new Date("2018-12-25T12:00:00Z"))).toBe("2018-12-25T10:00:00-03:00");
    });

    it("sem o fuso America/Sao_Paulo no Intl, calcula com UTC−3 fixo em vez de falhar", () => {
      class SemFuso {
        constructor() {
          throw new RangeError("Invalid time zone specified: America/Sao_Paulo");
        }
      }
      vi.stubGlobal("Intl", Object.assign(Object.create(Intl), { DateTimeFormat: SemFuso }));

      expect(agoraEmBrasilia(new Date("2026-10-11T17:02:00Z"))).toBe("2026-10-11T14:02:00-03:00");
      expect(agoraEmBrasilia(new Date("2026-10-31T23:30:00-04:00"))).toBe(
        "2026-11-01T00:30:00-03:00",
      );
      expect(hojeEmBrasilia(new Date("2026-10-12T02:59:59Z"))).toBe("2026-10-11");
      expect(formatarDataHoraBrasilia("2026-10-11T23:11:55.140Z")).toBe("11/10/2026 20:11");
    });
  });
});

describe("compararInstantes", () => {
  it("compara pelo instante, não pelo texto: UTC das 23:11 é anterior a Brasília das 20:30 do mesmo dia", () => {
    expect(compararInstantes("2026-10-11T23:11:55.140Z", "2026-10-11T20:30:00-03:00")).toBe(-1);
    expect(compararInstantes("2026-10-11T20:30:00-03:00", "2026-10-11T23:11:55.140Z")).toBe(1);
    // mesmo instante escrito de duas formas
    expect(compararInstantes("2026-10-11T23:11:55Z", "2026-10-11T20:11:55-03:00")).toBe(0);
    // ordem alfabética e cronológica coincidem quando o deslocamento é o mesmo
    expect(compararInstantes("2026-10-25T09:00:00-03:00", "2026-10-11T20:11:55-03:00")).toBe(1);
  });

  it("texto que não é ISO de data-hora com fuso cai na comparação textual, sem lançar", () => {
    expect(compararInstantes("x", "2026-10-11T20:30:00-03:00")).toBe(1);
    expect(compararInstantes("2026-10-11", "2026-10-12")).toBe(-1);
    expect(compararInstantes("", "")).toBe(0);
  });
});
