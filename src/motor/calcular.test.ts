import { describe, expect, it } from "vitest";
import type { Calculo, Lancamento } from "../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../metodologias/padrao.ts";
import { calcular } from "./calcular.ts";
import { tabelaIgpm } from "./testes/indices-igpm-2017-2018.ts";

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
