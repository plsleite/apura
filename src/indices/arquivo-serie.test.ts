import { describe, expect, it } from "vitest";
import { compararSeries, lerArquivoSerie } from "./arquivo-serie.ts";
import type { ValorMensal } from "./cliente-bcb.ts";

describe("lerArquivoSerie: envelope e itens", () => {
  const envelope = {
    formato: "apura/serie@1",
    codigo: "433",
    nome: "IPCA (IBGE), variação % mensal",
    origem: "https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json",
    obtidoEm: "2026-10-11T14:02:00-03:00",
  };
  const valido = { competencia: "2026-09", valor: "0.82" };

  it("recusa o que não é objeto antes de olhar os campos (texto, número, undefined, lista)", () => {
    for (const dado of ["texto", 42, undefined, true, []]) {
      expect(() => lerArquivoSerie(dado, "433")).toThrow(
        "Arquivo da série 433 em formato inesperado.",
      );
    }
  });

  it("recusa obtidoEm que não é texto e valores que não é lista", () => {
    expect(() => lerArquivoSerie({ ...envelope, obtidoEm: 2026, valores: [] }, "433")).toThrow(
      "Arquivo da série 433 em formato inesperado.",
    );
    expect(() => lerArquivoSerie({ ...envelope, valores: {} }, "433")).toThrow(
      "Arquivo da série 433 em formato inesperado.",
    );
  });

  it("aceita itens válidos (inclusive negativos) e devolve o arquivo com os mesmos valores", () => {
    const valores = [valido, { competencia: "2026-10", valor: "-0.10" }];
    const arquivo = lerArquivoSerie({ ...envelope, valores }, "433");
    expect(arquivo.codigo).toBe("433");
    expect(arquivo.obtidoEm).toBe("2026-10-11T14:02:00-03:00");
    expect(arquivo.valores).toEqual(valores);
  });

  it("recusa item com competência inválida, nomeando a competência", () => {
    expect(() =>
      lerArquivoSerie(
        { ...envelope, valores: [valido, { competencia: "2017-13", valor: "0.64" }] },
        "433",
      ),
    ).toThrow("Arquivo da série 433 com valor inválido em 2017-13.");
  });

  it("recusa valor numérico, com vírgula ou ausente, nomeando a competência", () => {
    expect(() =>
      lerArquivoSerie({ ...envelope, valores: [{ competencia: "2026-09", valor: 0.82 }] }, "433"),
    ).toThrow("Arquivo da série 433 com valor inválido em 2026-09.");
    expect(() =>
      lerArquivoSerie({ ...envelope, valores: [{ competencia: "2026-09", valor: "0,82" }] }, "433"),
    ).toThrow("Arquivo da série 433 com valor inválido em 2026-09.");
    expect(() =>
      lerArquivoSerie({ ...envelope, valores: [{ competencia: "2026-09" }] }, "433"),
    ).toThrow("Arquivo da série 433 com valor inválido em 2026-09.");
  });

  it("recusa item que não é objeto ou sem competência em texto, nomeando a posição (a partir de 1)", () => {
    expect(() => lerArquivoSerie({ ...envelope, valores: [valido, null] }, "433")).toThrow(
      "Arquivo da série 433 com valor inválido em posição 2.",
    );
    expect(() => lerArquivoSerie({ ...envelope, valores: ["0.82"] }, "433")).toThrow(
      "Arquivo da série 433 com valor inválido em posição 1.",
    );
    expect(() => lerArquivoSerie({ ...envelope, valores: [{ valor: "0.82" }] }, "433")).toThrow(
      "Arquivo da série 433 com valor inválido em posição 1.",
    );
    expect(() =>
      lerArquivoSerie(
        { ...envelope, valores: [valido, valido, { competencia: 202609, valor: "0.82" }] },
        "433",
      ),
    ).toThrow("Arquivo da série 433 com valor inválido em posição 3.");
  });
});

describe("compararSeries", () => {
  const atual: ValorMensal[] = [
    { competencia: "2026-07", valor: "0.26" },
    { competencia: "2026-08", valor: "-0.11" },
    { competencia: "2026-09", valor: "0.82" },
  ];

  it("não encolhe nem muda quando a nova é igual à atual", () => {
    expect(compararSeries(atual, [...atual])).toEqual({
      encolheu: false,
      alterados: [],
      novos: [],
    });
  });

  it("encolheu quando a nova veio vazia, com o motivo em frase", () => {
    const comparacao = compararSeries(atual, []);
    expect(comparacao.encolheu).toBe(true);
    expect(comparacao.motivo).toBe("a lista nova veio vazia");
    expect(comparacao.alterados).toEqual([]);
    expect(comparacao.novos).toEqual([]);
  });

  it("encolheu quando o primeiro mês da nova é posterior ao da atual (e ainda lista os novos)", () => {
    const comparacao = compararSeries(atual, [
      { competencia: "2026-08", valor: "-0.11" },
      { competencia: "2026-09", valor: "0.82" },
      { competencia: "2026-10", valor: "0.30" },
    ]);
    expect(comparacao.encolheu).toBe(true);
    expect(comparacao.motivo).toBe(
      "a lista nova começa em ago/2026, depois do primeiro mês atual (jul/2026)",
    );
    expect(comparacao.alterados).toEqual([]);
    expect(comparacao.novos).toEqual(["2026-10"]);
  });

  it("encolheu quando o último mês da nova é anterior ao da atual", () => {
    const comparacao = compararSeries(atual, [
      { competencia: "2026-06", valor: "0.10" },
      { competencia: "2026-07", valor: "0.26" },
      { competencia: "2026-08", valor: "-0.11" },
    ]);
    expect(comparacao.encolheu).toBe(true);
    expect(comparacao.motivo).toBe(
      "a lista nova termina em ago/2026, antes do último mês atual (set/2026)",
    );
    expect(comparacao.novos).toEqual(["2026-06"]);
  });

  it("encolheu quando a nova tem menos meses, mesmo cobrindo as duas pontas", () => {
    const comparacao = compararSeries(atual, [
      { competencia: "2026-07", valor: "0.26" },
      { competencia: "2026-09", valor: "0.82" },
    ]);
    expect(comparacao.encolheu).toBe(true);
    expect(comparacao.motivo).toBe("a lista nova tem 2 meses e a atual tem 3");
    expect(comparacao.alterados).toEqual([]);
    expect(comparacao.novos).toEqual([]);
  });

  it("encolheu quando a nova perdeu um mês do meio, mesmo mantendo as pontas e a contagem", () => {
    const comparacao = compararSeries(atual, [
      { competencia: "2026-07", valor: "0.26" },
      { competencia: "2026-09", valor: "0.82" },
      { competencia: "2026-10", valor: "0.30" },
    ]);
    expect(comparacao.encolheu).toBe(true);
    expect(comparacao.motivo).toBe("a lista nova perdeu ago/2026");
    expect(comparacao.alterados).toEqual([]);
    expect(comparacao.novos).toEqual(["2026-10"]);
  });

  it("nomeia todos os meses perdidos do meio quando são mais de um", () => {
    const comparacao = compararSeries(
      [{ competencia: "2026-06", valor: "0.10" }, ...atual],
      [
        { competencia: "2026-06", valor: "0.10" },
        { competencia: "2026-09", valor: "0.82" },
        { competencia: "2026-10", valor: "0.30" },
        { competencia: "2026-11", valor: "0.25" },
      ],
    );
    expect(comparacao.encolheu).toBe(true);
    expect(comparacao.motivo).toBe("a lista nova perdeu jul/2026 e ago/2026");
  });

  it("não encolhe quando a nova tem os mesmos meses mais um antes e um depois", () => {
    const comparacao = compararSeries(atual, [
      { competencia: "2026-06", valor: "0.10" },
      ...atual,
      { competencia: "2026-10", valor: "0.30" },
    ]);
    expect(comparacao.encolheu).toBe(false);
    expect(comparacao.motivo).toBeUndefined();
    expect(comparacao.novos).toEqual(["2026-06", "2026-10"]);
  });

  it("lista os meses alterados com o valor antigo e o novo, sem encolher", () => {
    const comparacao = compararSeries(atual, [
      { competencia: "2026-07", valor: "0.26" },
      { competencia: "2026-08", valor: "-0.11" },
      { competencia: "2026-09", valor: "0.85" },
    ]);
    expect(comparacao).toEqual({
      encolheu: false,
      alterados: [{ competencia: "2026-09", antes: "0.82", depois: "0.85" }],
      novos: [],
    });
  });

  it("lista os meses novos em ordem crescente mesmo que a nova venha fora de ordem", () => {
    const comparacao = compararSeries(atual, [
      ...atual,
      { competencia: "2026-11", valor: "0.25" },
      { competencia: "2026-10", valor: "0.30" },
    ]);
    expect(comparacao).toEqual({
      encolheu: false,
      alterados: [],
      novos: ["2026-10", "2026-11"],
    });
  });

  it("alterados e novos juntos, alterados em ordem de competência", () => {
    const comparacao = compararSeries(atual, [
      { competencia: "2026-10", valor: "0.30" },
      { competencia: "2026-09", valor: "0.85" },
      { competencia: "2026-08", valor: "-0.11" },
      { competencia: "2026-07", valor: "0.27" },
    ]);
    expect(comparacao).toEqual({
      encolheu: false,
      alterados: [
        { competencia: "2026-07", antes: "0.26", depois: "0.27" },
        { competencia: "2026-09", antes: "0.82", depois: "0.85" },
      ],
      novos: ["2026-10"],
    });
  });

  it('valor igual em texto diferente conta como alterado ("0.8" e "0.80"): a comparação é textual', () => {
    const comparacao = compararSeries(
      [{ competencia: "2026-09", valor: "0.80" }],
      [{ competencia: "2026-09", valor: "0.8" }],
    );
    expect(comparacao.alterados).toEqual([
      { competencia: "2026-09", antes: "0.80", depois: "0.8" },
    ]);
  });

  it("competência repetida na nova com o mesmo valor não conta como alteração nem como encolhimento", () => {
    expect(compararSeries(atual, [...atual, { competencia: "2026-09", valor: "0.82" }])).toEqual({
      encolheu: false,
      alterados: [],
      novos: [],
    });
  });

  it("atual vazia nunca encolhe: tudo da nova é novo, e duas vazias não mudam nada", () => {
    expect(compararSeries([], atual)).toEqual({
      encolheu: false,
      alterados: [],
      novos: ["2026-07", "2026-08", "2026-09"],
    });
    expect(compararSeries([], [])).toEqual({ encolheu: false, alterados: [], novos: [] });
  });
});
