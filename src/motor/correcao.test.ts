import { describe, expect, it } from "vitest";
import { paraTexto } from "../compartilhado/decimal.ts";
import type { Competencia, Metodologia, TabelaIndices } from "../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../metodologias/padrao.ts";
import { fatorCorrecao, resolverIndicesMensais } from "./correcao.ts";
import { tabelaIgpm } from "./testes/indices-igpm-2017-2018.ts";

describe("resolverIndicesMensais", () => {
  it("escolhe a série pelo período vigente no dia 1 de cada mês e marca os meses sem valor", () => {
    expect(resolverIndicesMensais(metodologiaPadrao(), tabelaIgpm(), "2018-03", "2018-05")).toEqual(
      [
        { competencia: "2018-03", serie: "189", valor: "0.64" },
        { competencia: "2018-04", serie: "189", valor: "0.57" },
        { competencia: "2018-05", serie: "189", valor: null },
      ],
    );
  });

  it("devolve série nula quando o período não tem correção", () => {
    const semCorrecao: Metodologia = {
      ...metodologiaPadrao(),
      periodos: [
        {
          de: null,
          ate: null,
          correcao: { indice: "nenhum" },
          juros: { tipo: "percentualMensal", taxaMensal: "1" },
        },
      ],
    };
    expect(resolverIndicesMensais(semCorrecao, tabelaIgpm(), "2017-01", "2017-02")).toEqual([
      { competencia: "2017-01", serie: null, valor: null },
      { competencia: "2017-02", serie: null, valor: null },
    ]);
  });

  it("devolve lista vazia quando o intervalo de competências é invertido", () => {
    expect(resolverIndicesMensais(metodologiaPadrao(), tabelaIgpm(), "2018-05", "2017-01")).toEqual(
      [],
    );
  });
});

describe("fatorCorrecao", () => {
  const opcoes = { incidenciaMesInicial: "proRata", deflacao: "aplicarComPiso", casas: 6 } as const;
  const indicesDe = (de: Competencia, ate: Competencia, tabela: TabelaIndices = tabelaIgpm()) =>
    resolverIndicesMensais(metodologiaPadrao(), tabela, de, ate);

  it("reproduz o fator do SAJ para 10/01/2017 → 25/05/2018: pro rata no mês inicial, meses inteiros, maio sem índice", () => {
    const r = fatorCorrecao({
      ...opcoes,
      termoInicial: "2017-01-10",
      termoFinal: "2018-05-25",
      indices: indicesDe("2017-01", "2018-05"),
    });
    expect(paraTexto(r.fator, 6)).toBe("1.013020");
    expect(r.indices).toHaveLength(17);
    expect(r.indices[0]).toEqual({
      serie: "189",
      competencia: "2017-01",
      valor: "0.64",
      fracao: "21/31",
    });
    expect(r.indices[1]).toEqual({
      serie: "189",
      competencia: "2017-02",
      valor: "0.08",
      fracao: "1",
    });
    expect(r.indices[16]).toEqual({
      serie: "189",
      competencia: "2018-05",
      valor: null,
      fracao: "25/31",
    });
    expect(r.mesesSemIndice).toEqual(["2018-05"]);
    expect(r.pisoAplicado).toBe(false);
  });

  it("índices negativos entram com o sinal que têm (10/04/2017 → 25/05/2018 passa por quatro meses negativos)", () => {
    const r = fatorCorrecao({
      ...opcoes,
      termoInicial: "2017-04-10",
      termoFinal: "2018-05-25",
      indices: indicesDe("2017-04", "2018-05"),
    });
    expect(paraTexto(r.fator, 6)).toBe("1.011467");
    expect(r.pisoAplicado).toBe(false);
  });

  it("com incidência 'mesSeguinte' o mês do lançamento não entra", () => {
    const r = fatorCorrecao({
      ...opcoes,
      incidenciaMesInicial: "mesSeguinte",
      termoInicial: "2017-01-10",
      termoFinal: "2018-05-25",
      indices: indicesDe("2017-01", "2018-05"),
    });
    expect(paraTexto(r.fator, 6)).toBe("1.008652");
    expect(r.indices[0]).toEqual({
      serie: "189",
      competencia: "2017-01",
      valor: "0.64",
      fracao: "0/31",
    });
  });

  it("aplica pro rata do mês final quando o índice dele existe", () => {
    const r = fatorCorrecao({
      ...opcoes,
      termoInicial: "2017-01-10",
      termoFinal: "2017-03-15",
      indices: indicesDe("2017-01", "2017-03"),
    });
    expect(paraTexto(r.fator, 6)).toBe("1.005183");
    expect(r.indices[2]).toEqual({
      serie: "189",
      competencia: "2017-03",
      valor: "0.01",
      fracao: "15/31",
    });
  });

  it("usa uma única fração quando o lançamento e o termo final caem no mesmo mês", () => {
    const r = fatorCorrecao({
      ...opcoes,
      termoInicial: "2018-05-10",
      termoFinal: "2018-05-25",
      indices: indicesDe("2018-05", "2018-05", tabelaIgpm("2018-05")),
    });
    expect(paraTexto(r.fator, 6)).toBe("1.006654");
    expect(r.indices).toEqual([
      { serie: "189", competencia: "2018-05", valor: "1.38", fracao: "15/31" },
    ]);
  });

  it("lançamento no último dia do mês: o mês do lançamento tem fração zero", () => {
    const r = fatorCorrecao({
      ...opcoes,
      termoInicial: "2017-01-31",
      termoFinal: "2017-02-01",
      indices: indicesDe("2017-01", "2017-02"),
    });
    expect(paraTexto(r.fator, 6)).toBe("1.000029");
    expect(r.indices[0]?.fracao).toBe("0/31");
    expect(r.indices[1]?.fracao).toBe("1/28");
  });

  it("mês sem índice no meio do período entra com fator 1 e é listado", () => {
    const r = fatorCorrecao({
      ...opcoes,
      termoInicial: "2017-01-10",
      termoFinal: "2018-05-25",
      indices: indicesDe("2017-01", "2018-05", tabelaIgpm("2018-04", ["2017-10"])),
    });
    expect(paraTexto(r.fator, 6)).toBe("1.010998");
    expect(r.mesesSemIndice).toEqual(["2017-10", "2018-05"]);
    expect(r.indices[9]).toEqual({
      serie: "189",
      competencia: "2017-10",
      valor: null,
      fracao: "1",
    });
  });

  it("mês sem índice com fração zero ('mesSeguinte') fica na memória mas não é listado", () => {
    const r = fatorCorrecao({
      ...opcoes,
      incidenciaMesInicial: "mesSeguinte",
      termoInicial: "2018-05-10",
      termoFinal: "2018-06-20",
      indices: indicesDe("2018-05", "2018-06", tabelaIgpm("2018-04")),
    });
    expect(paraTexto(r.fator, 6)).toBe("1.000000");
    expect(r.indices[0]).toEqual({
      serie: "189",
      competencia: "2018-05",
      valor: null,
      fracao: "0/31",
    });
    expect(r.mesesSemIndice).toEqual(["2018-06"]);
  });

  it("mês inicial sem índice com fração zero (lançamento no último dia) não é listado e não muda o fator", () => {
    const termos = { termoInicial: "2018-04-30", termoFinal: "2018-06-20" } as const;
    const semAbril = fatorCorrecao({
      ...opcoes,
      ...termos,
      indices: indicesDe("2018-04", "2018-06", tabelaIgpm("2018-05", ["2018-04"])),
    });
    expect(paraTexto(semAbril.fator, 6)).toBe("1.013800");
    expect(semAbril.indices[0]).toEqual({
      serie: "189",
      competencia: "2018-04",
      valor: null,
      fracao: "0/30",
    });
    expect(semAbril.mesesSemIndice).toEqual(["2018-06"]);
    const comAbril = fatorCorrecao({
      ...opcoes,
      ...termos,
      indices: indicesDe("2018-04", "2018-06", tabelaIgpm("2018-05")),
    });
    expect(paraTexto(comAbril.fator, 6)).toBe("1.013800");
  });

  it("termo inicial igual ao final num mês sem índice: fração zero, fator 1 e nenhum aviso", () => {
    const r = fatorCorrecao({
      ...opcoes,
      termoInicial: "2018-05-25",
      termoFinal: "2018-05-25",
      indices: indicesDe("2018-05", "2018-05", tabelaIgpm("2018-04")),
    });
    expect(paraTexto(r.fator, 6)).toBe("1.000000");
    expect(r.indices).toEqual([
      { serie: "189", competencia: "2018-05", valor: null, fracao: "0/31" },
    ]);
    expect(r.mesesSemIndice).toEqual([]);
  });

  it("trata a deflação conforme a opção: piso, sem piso ou zerar negativos", () => {
    const indices = indicesDe("2017-04", "2017-07");
    const termos = { termoInicial: "2017-04-01", termoFinal: "2017-07-31" } as const;
    const comPiso = fatorCorrecao({ ...opcoes, ...termos, indices });
    expect(paraTexto(comPiso.fator, 6)).toBe("1.000000");
    expect(comPiso.pisoAplicado).toBe(true);
    const semPiso = fatorCorrecao({ ...opcoes, ...termos, deflacao: "aplicarSemPiso", indices });
    expect(paraTexto(semPiso.fator, 6)).toBe("0.966587");
    expect(semPiso.pisoAplicado).toBe(false);
    const zerando = fatorCorrecao({ ...opcoes, ...termos, deflacao: "zerarNegativos", indices });
    expect(paraTexto(zerando.fator, 6)).toBe("1.000000");
    expect(zerando.pisoAplicado).toBe(false);
  });

  it("'zerarNegativos' zera só os meses negativos quando há sinais mistos", () => {
    const r = fatorCorrecao({
      ...opcoes,
      deflacao: "zerarNegativos",
      termoInicial: "2017-04-10",
      termoFinal: "2018-05-25",
      indices: indicesDe("2017-04", "2018-05", tabelaIgpm()),
    });
    expect(paraTexto(r.fator, 6)).toBe("1.042965");
    expect(r.pisoAplicado).toBe(false);
  });

  it("termo final anterior ao inicial: fator 1, sem índices e sem avisos", () => {
    const r = fatorCorrecao({
      ...opcoes,
      termoInicial: "2018-06-10",
      termoFinal: "2018-05-25",
      indices: [],
    });
    expect(paraTexto(r.fator, 6)).toBe("1.000000");
    expect(r.indices).toEqual([]);
    expect(r.mesesSemIndice).toEqual([]);
  });

  it("período sem correção ('nenhum') dá fator 1 sem aviso", () => {
    const r = fatorCorrecao({
      ...opcoes,
      termoInicial: "2017-01-10",
      termoFinal: "2017-02-20",
      indices: [
        { competencia: "2017-01", serie: null, valor: null },
        { competencia: "2017-02", serie: null, valor: null },
      ],
    });
    expect(paraTexto(r.fator, 6)).toBe("1.000000");
    expect(r.mesesSemIndice).toEqual([]);
    expect(r.indices[0]).toEqual({
      serie: null,
      competencia: "2017-01",
      valor: null,
      fracao: "21/31",
    });
  });
});
