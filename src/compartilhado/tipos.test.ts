import { describe, expect, it } from "vitest";
import { CODIGO_DA_SERIE, NOME_DA_SERIE } from "./tipos.ts";

describe("séries do BCB", () => {
  it("mapeia nome de índice para código e volta", () => {
    expect(CODIGO_DA_SERIE["IGP-M"]).toBe("189");
    expect(CODIGO_DA_SERIE.INPC).toBe("188");
    expect(CODIGO_DA_SERIE.IPCA).toBe("433");
    expect(NOME_DA_SERIE["189"]).toBe("IGP-M");
    expect(NOME_DA_SERIE["1619"]).toBe("salário mínimo");
    expect(NOME_DA_SERIE["29543"]).toBe("taxa legal");
    expect(NOME_DA_SERIE["4390"]).toBe("SELIC");
  });
});
