import { describe, expect, it } from "vitest";
import type { Base, FormaDaBase } from "../../compartilhado/tipos.ts";
import { baseUnica } from "../../motor/base.ts";
import { dividirBase, removerDivisaoDaBase, tituloDoPeriodo, trocarForma } from "./base.ts";

const fixo: FormaDaBase = {
  tipo: "valorFixo",
  valor: "500.00",
  dataFixacao: "2024-03-10",
  indiceReajuste: "nenhum",
  mesReajuste: 3,
};
const sm: FormaDaBase = { tipo: "percentualSalarioMinimo", percentual: "30" };
const rendimentos: FormaDaBase = {
  tipo: "percentualRendimentos",
  percentual: "30",
  rendimentoPadrao: "2000.00",
};

describe("edição da base por períodos (§17.2, fase 5b)", () => {
  it("dividir numa data: o período que a contém vira dois, o novo como cópia do dividido", () => {
    const { base, aviso } = dividirBase(baseUnica(fixo), "2025-01-01");
    expect(aviso).toBeUndefined();
    expect(base).toEqual({
      periodos: [
        { de: null, ate: "2024-12-31", forma: fixo },
        { de: "2025-01-01", ate: null, forma: fixo },
      ],
    });
    // a cópia é independente
    expect(base.periodos[1]!.forma).not.toBe(base.periodos[0]!.forma);
    // dividir de novo no meio do segundo: três períodos, em ordem
    const tres = dividirBase(base, "2025-07-01").base;
    expect(tres.periodos.map((p) => [p.de, p.ate])).toEqual([
      [null, "2024-12-31"],
      ["2025-01-01", "2025-06-30"],
      ["2025-07-01", null],
    ]);
  });

  it("data que já é início de período não divide, com a frase de aviso", () => {
    const dividida = dividirBase(baseUnica(fixo), "2025-01-01").base;
    expect(dividirBase(dividida, "2025-01-01")).toEqual({
      base: dividida,
      aviso: "Já existe uma divisão em 01/01/2025.",
    });
  });

  it("dividir em 01/01/1900 não divide: o período anterior acabaria em 1899, e o arquivo não reabriria", () => {
    const unica = baseUnica(fixo);
    expect(dividirBase(unica, "1900-01-01")).toEqual({
      base: unica,
      aviso: "A data precisa ser posterior a 01/01/1900.",
    });
    expect(dividirBase(unica, "1900-01-02").base.periodos[0]?.ate).toBe("1900-01-01");
  });

  it("remover a divisão: o período some, e o anterior se estende até o fim dele, com as regras do anterior", () => {
    const tres: Base = {
      periodos: [
        { de: null, ate: "2024-12-31", forma: fixo },
        { de: "2025-01-01", ate: "2025-06-30", forma: sm },
        { de: "2025-07-01", ate: null, forma: rendimentos },
      ],
    };
    expect(removerDivisaoDaBase(tres, 2)).toEqual({
      periodos: [
        { de: null, ate: "2024-12-31", forma: fixo },
        { de: "2025-01-01", ate: null, forma: sm },
      ],
    });
    expect(removerDivisaoDaBase(tres, 1)).toEqual({
      periodos: [
        { de: null, ate: "2025-06-30", forma: fixo },
        { de: "2025-07-01", ate: null, forma: rendimentos },
      ],
    });
    // o primeiro período não tem divisão a remover
    expect(removerDivisaoDaBase(tres, 0)).toBe(tres);
  });

  it("trocar a forma de um período não mexe nos outros", () => {
    const dividida = dividirBase(baseUnica(fixo), "2025-01-01").base;
    expect(trocarForma(dividida, 1, sm)).toEqual({
      periodos: [
        { de: null, ate: "2024-12-31", forma: fixo },
        { de: "2025-01-01", ate: null, forma: sm },
      ],
    });
  });

  it('título do bloco: "Até …", "De … a …", "Desde …"', () => {
    expect(tituloDoPeriodo({ de: null, ate: "2024-12-31" })).toBe("Até 31/12/2024");
    expect(tituloDoPeriodo({ de: "2025-01-01", ate: "2025-06-30" })).toBe(
      "De 01/01/2025 a 30/06/2025",
    );
    expect(tituloDoPeriodo({ de: "2025-07-01", ate: null })).toBe("Desde 01/07/2025");
  });
});
