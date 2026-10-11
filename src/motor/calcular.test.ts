import { describe, expect, it } from "vitest";
import { competenciasEntre } from "../compartilhado/datas.ts";
import type { Calculo, Lancamento } from "../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../metodologias/padrao.ts";
import { calcular } from "./calcular.ts";
import { tabelaIgpm } from "./testes/indices-igpm-2017-2018.ts";
import { metodologiaSelicUnica, tabelaRegimeNovo } from "./testes/regime-novo.ts";

function calculoCom(lancamentos: Lancamento[], dataElaboracao = "2018-05-25"): Calculo {
  return {
    formato: "apura/calculo@1",
    tipo: "alimentos",
    id: "teste",
    criadoEm: "2026-10-10T00:00:00.000Z",
    atualizadoEm: "2026-10-10T00:00:00.000Z",
    dataElaboracao,
    cabecalho: { defensor: "", orgao: "", processo: "", exequente: "", executado: "" },
    base: {
      tipo: "valorFixo",
      valor: "451.91",
      dataFixacao: "2017-01-10",
      indiceReajuste: "nenhum",
      mesReajuste: 1,
    },
    lotes: {},
    lancamentos,
    metodologia: metodologiaPadrao(),
    acrescimos: { multaPercentual: "0", honorariosPercentual: "0" },
    observacoes: "",
  };
}

const prestacao: Lancamento = {
  id: "p-2017-01",
  tipo: "prestacao",
  data: "2017-01-10",
  competencia: "2017-01",
  valorInformado: "451.91",
  origem: "avulso",
  editado: false,
};

const amortizacao: Lancamento = {
  id: "a-2017-01",
  tipo: "amortizacao",
  data: "2017-01-10",
  descricao: "Pagamento parcial",
  valorInformado: "440.00",
  origem: "avulso",
  editado: false,
};

describe("calcular", () => {
  it("atualiza uma prestação e uma amortização como o SAJ e apura os totais", () => {
    const r = calcular(calculoCom([prestacao, amortizacao]), tabelaIgpm());
    expect(r.lancamentos[0]).toMatchObject({
      id: "p-2017-01",
      tipo: "prestacao",
      competencia: "2017-01",
      valorBase: "451.91",
      memoriaBase: "Valor informado: R$ 451,91",
      correcao: { fator: "1.013020", pisoAplicado: false },
      corrigido: "457.79",
      juros: { percentual: "16.516129" },
      jurosValor: "75.61",
      atualizado: "533.40",
    });
    expect(r.lancamentos[0]?.correcao.indices).toHaveLength(17);
    expect(r.lancamentos[0]?.juros.detalhe).toHaveLength(17);
    expect(r.lancamentos[1]).toMatchObject({
      id: "a-2017-01",
      tipo: "amortizacao",
      descricao: "Pagamento parcial",
      corrigido: "445.73",
      jurosValor: "73.62",
      atualizado: "519.35",
    });
    expect(r.totais).toEqual({
      prestacoes: "533.40",
      amortizacoes: "519.35",
      totalDevido: "14.05",
      multa: "0.00",
      honorarios: "0.00",
      totalGeral: "14.05",
    });
  });

  it("registra os índices efetivamente usados e a situação da consulta", () => {
    const r = calcular(calculoCom([prestacao, amortizacao]), tabelaIgpm());
    expect(r.indicesUsados).toHaveLength(16); // jan/2017 a abr/2018, sem repetição entre lançamentos
    expect(r.indicesUsados[0]).toEqual({
      serie: "189",
      competencia: "2017-01",
      valor: "0.64",
      fonte: "embutida",
      obtidoEm: "2026-10-10T00:00:00.000Z",
    });
    expect(r.consultaIndices).toEqual({
      em: "2018-05-25T00:00:00.000Z",
      series: ["189"],
      ultimoMesPorSerie: { "189": "2018-04" },
    });
  });

  it("avisa o mês sem índice no lançamento e no resumo", () => {
    const r = calcular(calculoCom([prestacao]), tabelaIgpm());
    expect(r.lancamentos[0]?.avisos).toEqual([
      "IGP-M de mai/2018 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
    ]);
    expect(r.avisos).toEqual([
      "Meses sem índice na tabela (entraram sem correção): IGP-M de mai/2018.",
    ]);
  });

  it("mês sem índice no meio do período: aviso no lançamento e no resumo, em ordem cronológica", () => {
    const r = calcular(calculoCom([prestacao]), tabelaIgpm("2018-04", ["2017-10"]));
    expect(r.lancamentos[0]?.correcao.fator).toBe("1.010998");
    expect(r.lancamentos[0]?.avisos).toEqual([
      "IGP-M de out/2017 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
      "IGP-M de mai/2018 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
    ]);
    expect(r.avisos).toEqual([
      "Meses sem índice na tabela (entraram sem correção): IGP-M de out/2017, mai/2018.",
    ]);
  });

  it("mês que não entra no cálculo (fração zero) não gera aviso nem conta como índice usado", () => {
    const fimDeMes: Lancamento = {
      ...prestacao,
      id: "p-2018-04",
      data: "2018-04-30",
      competencia: "2018-04",
    };
    const r = calcular(calculoCom([fimDeMes]), tabelaIgpm("2018-04", ["2018-04"]));
    expect(r.lancamentos[0]?.correcao.fator).toBe("1.000000");
    expect(r.lancamentos[0]?.correcao.indices.map((i) => i.fracao)).toEqual(["0/30", "25/31"]);
    expect(r.lancamentos[0]?.avisos).toEqual([
      "IGP-M de mai/2018 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
    ]);
    expect(r.avisos).toEqual([
      "Meses sem índice na tabela (entraram sem correção): IGP-M de mai/2018.",
    ]);
    expect(r.indicesUsados).toEqual([]);
  });

  it("usa os termos próprios do lançamento quando informados", () => {
    const comTermos: Lancamento = {
      ...prestacao,
      encargos: { termoFinalCorrecao: "2017-03-15", termoInicialJuros: "2018-05-25" },
    };
    const r = calcular(calculoCom([comTermos]), tabelaIgpm());
    expect(r.lancamentos[0]).toMatchObject({
      correcao: { fator: "1.005183" },
      corrigido: "454.25",
      juros: { percentual: "0.032258" },
      jurosValor: "0.15",
      atualizado: "454.40",
    });
  });

  it("usa a metodologia própria do lançamento quando informada", () => {
    const propria = metodologiaPadrao();
    propria.incidenciaMesInicial = "mesSeguinte";
    const r = calcular(
      calculoCom([{ ...prestacao, encargos: { metodologia: propria } }]),
      tabelaIgpm(),
    );
    expect(r.lancamentos[0]?.correcao.fator).toBe("1.008652");
  });

  it("lançamento posterior à data de elaboração entra pelo valor nominal, sem encargos, com aviso", () => {
    const futuro: Lancamento = {
      ...prestacao,
      id: "p-2018-06",
      data: "2018-06-10",
      competencia: "2018-06",
    };
    const r = calcular(calculoCom([futuro]), tabelaIgpm());
    expect(r.lancamentos[0]).toMatchObject({
      correcao: { fator: "1.000000" },
      corrigido: "451.91",
      juros: { percentual: "0.000000" },
      jurosValor: "0.00",
      atualizado: "451.91",
    });
    expect(r.lancamentos[0]?.avisos).toEqual([
      "Data do lançamento (10/06/2018) posterior à data de elaboração (25/05/2018): sem correção e sem juros.",
    ]);
  });

  it("lançamento sem valor informado entra com zero e aviso (a base será apurada na fase 3)", () => {
    const semValor: Lancamento = {
      id: "p-sem-valor",
      tipo: "prestacao",
      data: "2017-01-10",
      competencia: "2017-01",
      origem: "lote",
      editado: false,
    };
    const r = calcular(calculoCom([semValor]), tabelaIgpm());
    expect(r.lancamentos[0]).toMatchObject({
      valorBase: "0.00",
      corrigido: "0.00",
      jurosValor: "0.00",
      atualizado: "0.00",
    });
    expect(r.lancamentos[0]?.avisos).toContain(
      "Valor não informado: o lançamento entrou com R$ 0,00.",
    );
  });

  it("avisa quando as amortizações igualam ou superam as prestações e quando não há lançamentos", () => {
    const r = calcular(calculoCom([amortizacao]), tabelaIgpm());
    expect(r.totais.totalDevido).toBe("-519.35");
    expect(r.avisos).toContain(
      "As amortizações atualizadas (R$ 519,35) igualam ou superam as prestações atualizadas (R$ 0,00): não há valor devido na data do cálculo.",
    );
    expect(calcular(calculoCom([]), tabelaIgpm()).avisos).toEqual(["Nenhum lançamento."]);
  });
});

describe("calcular (regime novo, multa e honorários, validações)", () => {
  const hoje = "2026-10-11";
  const lancamento = (
    id: string,
    tipo: Lancamento["tipo"],
    data: string,
    valorInformado: string,
    encargos?: Lancamento["encargos"],
  ): Lancamento => ({ id, tipo, data, valorInformado, origem: "avulso", editado: true, encargos });

  it("regime novo de ponta a ponta: IPCA e taxa legal conferidos na Calculadora do Cidadão", () => {
    const r = calcular(
      calculoCom([lancamento("p", "prestacao", "2024-09-30", "1000.00")], hoje),
      tabelaRegimeNovo(),
    );
    expect(r.lancamentos[0]).toMatchObject({
      correcao: { fator: "1.099852", pisoAplicado: false },
      corrigido: "1099.85",
      juros: { percentual: "17.247591" },
      jurosValor: "189.70",
      atualizado: "1289.55",
      avisos: [
        "IPCA de out/2026 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
      ],
    });
    // séries em ordem numérica (como texto, "1619" viria antes de "188")
    expect(r.consultaIndices.series).toEqual(["188", "189", "433", "1619", "4390", "29543"]);
    expect(r.consultaIndices.ultimoMesPorSerie).toEqual({
      "188": "2026-09",
      "189": "2026-09",
      "433": "2026-09",
      "1619": "2026-12",
      "4390": "2026-10",
      "29543": "2026-10",
    });
    // A taxa legal consumida nos juros consta de indicesUsados, com fonte e data de obtenção.
    const taxaLegal = r.indicesUsados.filter((i) => i.serie === "29543");
    expect(taxaLegal).toHaveLength(26);
    expect(taxaLegal.map((i) => i.competencia)).toEqual(competenciasEntre("2024-09", "2026-10"));
    expect(taxaLegal[0]).toEqual({
      serie: "29543",
      competencia: "2024-09",
      valor: "0.676227",
      fonte: "embutida",
      obtidoEm: "2026-10-11T12:00:00.000Z",
    });
    expect([...new Set(r.indicesUsados.map((i) => i.serie))]).toEqual(["433", "29543"]);
  });

  it("taxa legal ausente na tabela: aviso no lançamento e resumo próprio no resultado", () => {
    const r = calcular(
      calculoCom([lancamento("p", "prestacao", "2026-09-30", "1000.00")], hoje),
      tabelaRegimeNovo({ "29543": "2026-09" }),
    );
    expect(r.avisos).toContain(
      "Meses sem taxa legal na tabela (os dias desses meses ficaram sem juros): out/2026.",
    );
    expect(r.lancamentos[0]?.avisos).toContain(
      "Taxa legal de out/2026 não disponível na tabela de índices: os dias de 01/10/2026 a 10/10/2026 ficaram sem juros.",
    );
    expect(r.indicesUsados.some((i) => i.serie === "29543" && i.competencia === "2026-10")).toBe(
      false,
    );
  });

  it("multa e honorários do art. 523, §1º, do CPC: cada um sobre o total devido, sem cumulação", () => {
    const calculo = calculoCom(
      [
        lancamento("p-2026-01", "prestacao", "2026-01-10", "1000.00"),
        lancamento("p-2026-02", "prestacao", "2026-02-10", "1000.00"),
        lancamento("a-2026-03", "amortizacao", "2026-03-10", "500.00"),
      ],
      hoje,
    );
    calculo.acrescimos = { multaPercentual: "10", honorariosPercentual: "10" };
    const r = calcular(calculo, tabelaRegimeNovo());
    expect(r.lancamentos.map((l) => l.atualizado)).toEqual(["1108.03", "1092.52", "538.69"]);
    expect(r.totais).toEqual({
      prestacoes: "2200.55",
      amortizacoes: "538.69",
      totalDevido: "1661.86",
      multa: "166.19",
      honorarios: "166.19",
      totalGeral: "1994.24",
    });
  });

  it("sem valor devido, multa e honorários são zero e há aviso", () => {
    const calculo = calculoCom([amortizacao]);
    calculo.acrescimos = { multaPercentual: "10", honorariosPercentual: "10" };
    const r = calcular(calculo, tabelaIgpm());
    expect(r.totais).toMatchObject({
      totalDevido: "-519.35",
      multa: "0.00",
      honorarios: "0.00",
      totalGeral: "-519.35",
    });
    expect(r.avisos).toContain(
      "Multa e honorários não foram aplicados porque não há valor devido.",
    );
  });

  it("termo final próprio posterior à data de elaboração é limitado a ela, com aviso", () => {
    const comTermos: Lancamento = {
      ...prestacao,
      encargos: { termoFinalCorrecao: "2018-12-31", termoFinalJuros: "2018-12-31" },
    };
    const r = calcular(calculoCom([comTermos]), tabelaIgpm());
    expect(r.lancamentos[0]).toMatchObject({
      correcao: { fator: "1.013020" },
      juros: { percentual: "16.516129" },
      atualizado: "533.40",
    });
    expect(r.lancamentos[0]?.avisos.slice(0, 2)).toEqual([
      "Termo final da correção (31/12/2018) posterior à data de elaboração: limitado a 25/05/2018.",
      "Termo final dos juros (31/12/2018) posterior à data de elaboração: limitado a 25/05/2018.",
    ]);
  });

  it("metodologia com lacuna: aviso global, e o lançamento na lacuna fica sem correção e sem juros", () => {
    const calculo = calculoCom(
      [lancamento("p", "prestacao", "2024-07-10", "1000.00")],
      "2024-08-20",
    );
    calculo.metodologia.periodos = [
      {
        de: null,
        ate: "2024-06-30",
        correcao: { indice: "IGP-M" },
        juros: { tipo: "percentualMensal", taxaMensal: "1" },
      },
      { de: "2024-09-01", ate: null, correcao: { indice: "IPCA" }, juros: { tipo: "taxaLegal" } },
    ];
    const r = calcular(calculo, tabelaRegimeNovo());
    expect(r.avisos[0]).toBe(
      "A metodologia não cobre o período de 01/07/2024 a 31/08/2024: esses dias ficam sem correção e sem juros.",
    );
    expect(r.lancamentos[0]).toMatchObject({
      correcao: { fator: "1.000000" },
      juros: { percentual: "0.000000" },
      atualizado: "1000.00",
    });
    expect(r.lancamentos[0]?.correcao.indices.map((i) => i.serie)).toEqual([null, null]);
  });

  it("metodologia própria do lançamento também é validada, com aviso no próprio lançamento", () => {
    const propria = metodologiaPadrao();
    propria.periodos = [propria.periodos[0]!];
    const r = calcular(
      calculoCom([{ ...prestacao, encargos: { metodologia: propria } }]),
      tabelaIgpm(),
    );
    expect(r.lancamentos[0]?.avisos).toContain(
      "A metodologia não cobre datas posteriores a 29/08/2024: esses dias ficam sem correção e sem juros.",
    );
    expect(r.avisos).not.toContain(
      "A metodologia não cobre datas posteriores a 29/08/2024: esses dias ficam sem correção e sem juros.",
    );
  });

  it("SELIC única de ponta a ponta reproduz o SAJ: R$ 10.000,00 de 10/03/2024 com a tabela até ago/2026", () => {
    const calculo = calculoCom([lancamento("p", "prestacao", "2024-03-10", "10000.00")], hoje);
    calculo.metodologia = metodologiaSelicUnica();
    const r = calcular(calculo, tabelaRegimeNovo({ "4390": "2026-08" }));
    expect(r.lancamentos[0]).toMatchObject({
      correcao: { fator: "1.358127" },
      corrigido: "13581.27",
      juros: { percentual: "0.000000", detalhe: [] },
      jurosValor: "0.00",
      atualizado: "13581.27",
    });
    expect(r.lancamentos[0]?.correcao.indices[0]).toEqual({
      serie: "4390",
      competencia: "2024-03",
      valor: "0.83",
      fracao: "21/31",
    });
  });
});
