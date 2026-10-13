import { describe, expect, it } from "vitest";
import { competenciasEntre } from "../compartilhado/datas.ts";
import type {
  Base,
  Calculo,
  CodigoSerie,
  Competencia,
  Lancamento,
  TabelaIndices,
} from "../compartilhado/tipos.ts";
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
      "Valor informado à mão (R$ 451,91), não apurado pela base dos alimentos.",
      "IGP-M de mai/2018 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
    ]);
    expect(r.avisos).toEqual([
      "Meses sem índice na tabela (entraram sem correção): IGP-M de mai/2018.",
      "Prestações com valor informado à mão, não apurado pela base dos alimentos: jan/2017.",
    ]);
  });

  it("mês sem índice no meio do período: aviso no lançamento e no resumo, em ordem cronológica", () => {
    const r = calcular(calculoCom([prestacao]), tabelaIgpm("2018-04", ["2017-10"]));
    expect(r.lancamentos[0]?.correcao.fator).toBe("1.010998");
    expect(r.lancamentos[0]?.avisos).toEqual([
      "Valor informado à mão (R$ 451,91), não apurado pela base dos alimentos.",
      "IGP-M de out/2017 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
      "IGP-M de mai/2018 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
    ]);
    expect(r.avisos).toEqual([
      "Meses sem índice na tabela (entraram sem correção): IGP-M de out/2017, mai/2018.",
      "Prestações com valor informado à mão, não apurado pela base dos alimentos: jan/2017.",
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
      "Valor informado à mão (R$ 451,91), não apurado pela base dos alimentos.",
      "IGP-M de mai/2018 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
    ]);
    expect(r.avisos).toEqual([
      "Meses sem índice na tabela (entraram sem correção): IGP-M de mai/2018.",
      "Prestações com valor informado à mão, não apurado pela base dos alimentos: abr/2018.",
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

  it("prestação posterior à data de elaboração é vincenda: valor nominal, sem correção e sem juros, mesmo com termos próprios (§6.7)", () => {
    const futura: Lancamento = {
      ...prestacao,
      id: "p-2018-06",
      data: "2018-06-10",
      competencia: "2018-06",
    };
    const r = calcular(calculoCom([futura]), tabelaIgpm());
    expect(r.lancamentos[0]).toMatchObject({
      situacao: "vincenda",
      correcao: { fator: "1.000000", indices: [] },
      corrigido: "451.91",
      juros: { percentual: "0.000000", detalhe: [] },
      jurosValor: "0.00",
      atualizado: "451.91",
    });
    expect(r.lancamentos[0]?.avisos).toEqual([
      "Valor informado à mão (R$ 451,91), não apurado pela base dos alimentos.",
      "Prestação com vencimento em 10/06/2018, posterior à data de elaboração (25/05/2018): vincenda, incluída pelo valor nominal, sem correção e sem juros.",
    ]);
    // a vincenda entra nos totais pelo valor nominal (art. 323 do CPC)
    expect(r.totais.prestacoes).toBe("451.91");
    expect(r.avisos).toContain(
      "Prestações vincendas, incluídas pelo valor nominal, sem correção e sem juros: jun/2018.",
    );
    // termo inicial próprio da correção no passado não muda nada: continua nominal, com aviso
    const comTermos: Lancamento = {
      ...futura,
      encargos: { termoInicialCorrecao: "2017-01-10", termoInicialJuros: "2017-01-10" },
    };
    const r2 = calcular(calculoCom([comTermos]), tabelaIgpm());
    expect(r2.lancamentos[0]).toMatchObject({
      situacao: "vincenda",
      correcao: { fator: "1.000000" },
      jurosValor: "0.00",
      atualizado: "451.91",
    });
    expect(r2.lancamentos[0]?.avisos.slice(1)).toEqual([
      "Prestação com vencimento em 10/06/2018, posterior à data de elaboração (25/05/2018): vincenda, incluída pelo valor nominal, sem correção e sem juros.",
      "Os termos próprios informados não se aplicam à prestação vincenda.",
    ]);
  });

  it("prestação sem valor informado é apurada pela base dos alimentos (§6.3), sem a marca de editado", () => {
    const semValor: Lancamento = {
      id: "p-2017-01-lote",
      tipo: "prestacao",
      data: "2017-01-10",
      competencia: "2017-01",
      origem: "lote",
      editado: false,
    };
    const r = calcular(calculoCom([semValor]), tabelaIgpm());
    expect(r.lancamentos[0]).toMatchObject({
      valorBase: "451.91",
      memoriaBase: "Valor fixado em 10/01/2017: R$ 451,91 (sem reajuste)",
      editado: false,
      situacao: "atualizado",
      corrigido: "457.79",
      jurosValor: "75.61",
      atualizado: "533.40",
    });
    expect(r.lancamentos[0]?.avisos).toEqual([
      "IGP-M de mai/2018 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
    ]);
    expect(r.avisos).not.toContainEqual(expect.stringContaining("informado à mão"));
  });

  it("avisa quando as amortizações igualam ou superam as prestações e quando não há lançamentos", () => {
    const r = calcular(calculoCom([amortizacao]), tabelaIgpm());
    expect(r.totais.totalDevido).toBe("-519.35");
    expect(r.avisos).toContain(
      "As amortizações atualizadas (R$ 519,35) igualam ou superam as prestações atualizadas (R$ 0,00): não há valor devido na data do cálculo.",
    );
    expect(calcular(calculoCom([]), tabelaIgpm()).avisos).toEqual(["Nenhum lançamento."]);
    // sem pagamento lançado, o total zerado vem de prestações sem valor: nada de "igualam ou
    // superam" nem de multa não aplicada (decisão de 13/10/2026)
    const semValor: Lancamento = {
      id: "p-2017-01",
      tipo: "prestacao",
      data: "2017-01-10",
      competencia: "2017-01",
      valorInformado: "1,5",
      origem: "avulso",
      editado: true,
    };
    const soPrestacaoSemValor = calcular(
      {
        ...calculoCom([semValor]),
        acrescimos: { multaPercentual: "10", honorariosPercentual: "10" },
      },
      tabelaIgpm(),
    );
    expect(soPrestacaoSemValor.totais.totalDevido).toBe("0.00");
    expect(soPrestacaoSemValor.avisos).not.toContainEqual(
      expect.stringContaining("igualam ou superam"),
    );
    expect(soPrestacaoSemValor.avisos).not.toContainEqual(
      expect.stringContaining("Multa e honorários não foram aplicados"),
    );
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
        "Valor informado à mão (R$ 1.000,00), não apurado pela base dos alimentos.",
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

  it("percentual de multa ou honorários inválido ou negativo não derruba o motor: aviso e percentual tratado como zero", () => {
    const calculo = calculoCom(
      [lancamento("p-2026-01", "prestacao", "2026-01-10", "1000.00")],
      hoje,
    );
    calculo.acrescimos = { multaPercentual: "10,5", honorariosPercentual: "-10" };
    const r = calcular(calculo, tabelaRegimeNovo());
    expect(r.totais.multa).toBe("0.00");
    expect(r.totais.honorarios).toBe("0.00");
    expect(r.totais.totalGeral).toBe(r.totais.totalDevido);
    expect(r.avisos).toContain('Percentual de multa inválido ("10,5"): a multa não foi aplicada.');
    expect(r.avisos).toContain(
      'Percentual de honorários negativo ("-10"): os honorários não foram aplicados.',
    );
    // percentual vazio também é inválido; percentuais válidos não geram aviso algum
    calculo.acrescimos = { multaPercentual: "", honorariosPercentual: "10" };
    expect(calcular(calculo, tabelaRegimeNovo()).avisos).toContain(
      'Percentual de multa inválido (""): a multa não foi aplicada.',
    );
    calculo.acrescimos = { multaPercentual: "10", honorariosPercentual: "0" };
    expect(
      calcular(calculo, tabelaRegimeNovo()).avisos.filter((a) => a.startsWith("Percentual")),
    ).toEqual([]);
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
    expect(r.lancamentos[0]?.avisos.slice(1, 3)).toEqual([
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

  it("juros incidem sobre o corrigido sem arredondar, como o SAJ (R$ 450,00 de 01/02/2025: 93,47 e não 93,48)", () => {
    const tabela = tabelaRegimeNovo();
    tabela.series["189"]!["2025-12"] = {
      valor: "-0.02",
      fonte: "embutida",
      obtidoEm: "2026-10-11T12:00:00.000Z",
    };
    const calculo = calculoCom(
      [
        {
          ...prestacao,
          id: "p-2025-02",
          data: "2025-02-01",
          competencia: "2025-02",
          valorInformado: "450.00",
        },
      ],
      hoje,
    );
    calculo.metodologia = {
      ...metodologiaPadrao(),
      ajustada: true,
      deflacao: "aplicarSemPiso",
      periodos: [
        {
          de: null,
          ate: null,
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "1" },
        },
      ],
    };
    const r = calcular(calculo, tabela);
    expect(r.lancamentos[0]).toMatchObject({
      correcao: { fator: "1.020504" },
      corrigido: "459.23",
      juros: { percentual: "20.354839" },
      jurosValor: "93.47",
      atualizado: "552.70",
    });
  });
});

describe("calcular (fase 3: situação dos lançamentos, base dos alimentos e proveniência)", () => {
  const hoje = "2026-10-11";
  const semValorInformado = (
    id: string,
    data: string,
    extra: Partial<Lancamento> = {},
  ): Lancamento => ({
    id,
    tipo: "prestacao",
    data,
    competencia: data.slice(0, 7),
    origem: "lote",
    editado: false,
    ...extra,
  });
  const comBase = (base: Base, lancamentos: Lancamento[], dataElaboracao = hoje): Calculo => ({
    ...calculoCom(lancamentos, dataElaboracao),
    base,
  });

  it("pagamento posterior à data de elaboração fica fora dos totais, com aviso no lançamento e no resumo", () => {
    const futuro: Lancamento = { ...amortizacao, id: "a-2018-06", data: "2018-06-10" };
    const r = calcular(calculoCom([prestacao, futuro]), tabelaIgpm());
    expect(r.lancamentos[1]).toMatchObject({
      situacao: "ignorado",
      editado: false,
      valorBase: "440.00",
      atualizado: "440.00",
      jurosValor: "0.00",
    });
    expect(r.lancamentos[1]?.avisos).toEqual([
      "Pagamento de 10/06/2018, posterior à data de elaboração (25/05/2018): não computado nos totais.",
    ]);
    expect(r.totais).toMatchObject({
      prestacoes: "533.40",
      amortizacoes: "0.00",
      totalDevido: "533.40",
    });
    expect(r.avisos).toContain("Lançamentos não computados nos totais: pagamento de 10/06/2018.");
  });

  it("valor zero ou negativo informado: aviso e lançamento fora dos totais (pagamentos são informados como positivos)", () => {
    const zero: Lancamento = { ...prestacao, id: "p-zero", valorInformado: "0" };
    const negativo: Lancamento = { ...amortizacao, id: "a-negativo", valorInformado: "-440.00" };
    const r = calcular(calculoCom([prestacao, zero, negativo, amortizacao]), tabelaIgpm());
    expect(r.lancamentos.map((l) => l.situacao)).toEqual([
      "atualizado",
      "ignorado",
      "ignorado",
      "atualizado",
    ]);
    expect(r.lancamentos[1]?.avisos.at(-1)).toBe(
      "Valor da prestação zero ou negativo (R$ 0,00): não computada nos totais.",
    );
    expect(r.lancamentos[2]?.avisos).toEqual([
      "Valor do pagamento zero ou negativo (-R$ 440,00): não computado nos totais; informe pagamentos como valores positivos.",
    ]);
    expect(r.lancamentos[2]).toMatchObject({ valorBase: "-440.00", atualizado: "-440.00" });
    expect(r.totais).toMatchObject({
      prestacoes: "533.40",
      amortizacoes: "519.35",
      totalDevido: "14.05",
    });
    expect(r.avisos).toContain(
      "Lançamentos não computados nos totais: prestação de jan/2017, pagamento de 10/01/2017.",
    );
  });

  it("texto decimal inválido no valor informado não derruba o motor: aviso e lançamento fora dos totais", () => {
    const invalidos = ["1,5", "", "NaN", "Infinity"].map((texto, i): Lancamento => ({
      ...prestacao,
      id: `p-invalido-${i}`,
      valorInformado: texto,
    }));
    const r = calcular(calculoCom([prestacao, ...invalidos]), tabelaIgpm());
    expect(r.lancamentos.slice(1).every((l) => l.situacao === "ignorado")).toBe(true);
    expect(r.lancamentos[1]).toMatchObject({
      valorBase: "0.00",
      memoriaBase: "Valor informado inválido",
      atualizado: "0.00",
    });
    expect(r.lancamentos[1]?.avisos).toEqual([
      'Valor informado ("1,5") não é um número válido: o lançamento não foi computado nos totais; corrija o valor.',
    ]);
    expect(r.totais.prestacoes).toBe("533.40");
    // base com texto inválido tampouco derruba
    const r2 = calcular(
      comBase({ tipo: "percentualSalarioMinimo", percentual: "trinta" }, [
        semValorInformado("p", "2024-03-10"),
      ]),
      tabelaRegimeNovo(),
    );
    expect(r2.lancamentos[0]).toMatchObject({ situacao: "ignorado", valorBase: "0.00" });
    expect(r2.totais.prestacoes).toBe("0.00");
  });

  it("pagamento sem valor informado fica fora dos totais, com aviso e resumo", () => {
    const semValor: Lancamento = {
      id: "a-sem-valor",
      tipo: "amortizacao",
      data: "2017-01-10",
      origem: "avulso",
      editado: false,
    };
    const r = calcular(calculoCom([prestacao, semValor]), tabelaIgpm());
    expect(r.lancamentos[1]).toMatchObject({
      situacao: "ignorado",
      editado: false,
      valorBase: "0.00",
      memoriaBase: "Valor não informado",
      atualizado: "0.00",
    });
    expect(r.lancamentos[1]?.avisos).toEqual([
      "Pagamento sem valor informado: não computado nos totais.",
    ]);
    expect(r.totais).toMatchObject({
      prestacoes: "533.40",
      amortizacoes: "0.00",
      totalDevido: "533.40",
    });
    expect(r.avisos).toContain("Lançamentos não computados nos totais: pagamento de 10/01/2017.");
  });

  it("marca 'editado' só nas prestações com valor informado, com aviso no lançamento e resumo no resultado", () => {
    const r = calcular(
      calculoCom([prestacao, amortizacao, semValorInformado("p-lote", "2017-02-10")]),
      tabelaIgpm(),
    );
    expect(r.lancamentos.map((l) => l.editado)).toEqual([true, false, false]);
    expect(r.lancamentos[0]?.avisos[0]).toBe(
      "Valor informado à mão (R$ 451,91), não apurado pela base dos alimentos.",
    );
    expect(r.lancamentos[1]?.avisos).toEqual([
      "IGP-M de mai/2018 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
    ]);
    expect(r.avisos).toContain(
      "Prestações com valor informado à mão, não apurado pela base dos alimentos: jan/2017.",
    );
  });

  it("prestação sem competência é identificada pela data nos avisos e resumos", () => {
    const semCompetencia: Lancamento = {
      ...prestacao,
      id: "p-sem-competencia",
      competencia: undefined,
      data: "2018-06-10",
    };
    const r = calcular(calculoCom([semCompetencia]), tabelaIgpm());
    expect(r.lancamentos[0]?.situacao).toBe("vincenda");
    expect(r.avisos).toContain(
      "Prestações vincendas, incluídas pelo valor nominal, sem correção e sem juros: 10/06/2018.",
    );
    expect(r.avisos).toContain(
      "Prestações com valor informado à mão, não apurado pela base dos alimentos: 10/06/2018.",
    );
  });

  it("base em % do salário mínimo: valor apurado, salário mínimo em indicesUsados e séries em ordem numérica", () => {
    const base: Base = { tipo: "percentualSalarioMinimo", percentual: "30" };
    const r = calcular(
      comBase(base, [
        semValorInformado("p-2025-01", "2025-01-10"),
        semValorInformado("p-2026-01", "2026-01-10"),
      ]),
      tabelaRegimeNovo(),
    );
    expect(r.lancamentos.map((l) => l.valorBase)).toEqual(["455.40", "486.30"]);
    expect(r.lancamentos[0]?.memoriaBase).toBe(
      "30% do salário mínimo de jan/2025 (R$ 1.518,00) = R$ 455,40",
    );
    expect(r.lancamentos.map((l) => l.editado)).toEqual([false, false]);
    const salarios = r.indicesUsados.filter((i) => i.serie === "1619");
    expect(salarios).toEqual([
      {
        serie: "1619",
        competencia: "2025-01",
        valor: "1518.00",
        fonte: "embutida",
        obtidoEm: "2026-10-11T12:00:00.000Z",
      },
      {
        serie: "1619",
        competencia: "2026-01",
        valor: "1621.00",
        fonte: "embutida",
        obtidoEm: "2026-10-11T12:00:00.000Z",
      },
    ]);
    expect([...new Set(r.indicesUsados.map((i) => i.serie))]).toEqual(["433", "1619", "29543"]);
  });

  it("prestação vincenda em % do salário mínimo de mês ainda sem salário mínimo publicado: último publicado, nominal, avisos e resumos", () => {
    const base: Base = { tipo: "percentualSalarioMinimo", percentual: "30" };
    const r = calcular(
      comBase(base, [semValorInformado("p-2027-01", "2027-01-10")]),
      tabelaRegimeNovo(),
    );
    expect(r.lancamentos[0]).toMatchObject({
      situacao: "vincenda",
      valorBase: "486.30",
      atualizado: "486.30",
      memoriaBase:
        "30% do salário mínimo vigente em jan/2027 (R$ 1.621,00, último publicado: dez/2026) = R$ 486,30",
    });
    expect(r.lancamentos[0]?.avisos).toEqual([
      "Salário mínimo de jan/2027 ainda não publicado na tabela de índices: usado o de dez/2026 (R$ 1.621,00), vigente até a publicação do novo.",
      "Prestação com vencimento em 10/01/2027, posterior à data de elaboração (11/10/2026): vincenda, incluída pelo valor nominal, sem correção e sem juros.",
    ]);
    expect(r.avisos).toEqual([
      "Meses sem índice na tabela para o valor-base das prestações (ver o aviso de cada uma): salário mínimo de jan/2027.",
      "Prestações vincendas, incluídas pelo valor nominal, sem correção e sem juros: jan/2027.",
    ]);
    expect(r.indicesUsados).toEqual([
      {
        serie: "1619",
        competencia: "2026-12",
        valor: "1621.00",
        fonte: "embutida",
        obtidoEm: "2026-10-11T12:00:00.000Z",
      },
    ]);
  });

  it("valor fixo reajustado pelo IPCA: os 12 meses do acumulado entram em indicesUsados mesmo fora do período de correção", () => {
    const base: Base = {
      tipo: "valorFixo",
      valor: "500.00",
      dataFixacao: "2024-03-15",
      indiceReajuste: "IPCA",
      mesReajuste: 3,
    };
    const r = calcular(
      comBase(base, [semValorInformado("p-2025-03", "2025-03-15")]),
      tabelaRegimeNovo(),
    );
    expect(r.lancamentos[0]).toMatchObject({
      valorBase: "525.29",
      editado: false,
      situacao: "atualizado",
    });
    const ipca = r.indicesUsados.filter((i) => i.serie === "433").map((i) => i.competencia);
    expect(ipca.slice(0, 12)).toEqual(competenciasEntre("2024-03", "2025-02")); // reajuste
    expect(ipca.slice(12)).toEqual(competenciasEntre("2025-03", "2026-09")); // correção
    // reajuste sem índice: resumo próprio no resultado
    const r2 = calcular(
      comBase({ ...base, dataFixacao: "2025-11-15", mesReajuste: 11 }, [
        semValorInformado("p-2026-11", "2026-11-15"),
      ]),
      tabelaRegimeNovo(),
    );
    expect(r2.avisos).toContain(
      "Meses sem índice na tabela para o valor-base das prestações (ver o aviso de cada uma): IPCA de out/2026.",
    );
  });
});

describe("calcular (fase 4: meses ainda não divulgados na data da consulta)", () => {
  const hoje = "2026-10-11";
  const ESPERADO_ATE: TabelaIndices["esperadoAte"] = {
    "188": "2026-09",
    "189": "2026-09",
    "433": "2026-09",
    "1619": "2026-12",
    "29543": "2026-10",
    "4390": "2026-10",
  };
  const comCalendario = (
    limites: Partial<Record<CodigoSerie, Competencia>> = {},
  ): TabelaIndices => ({ ...tabelaRegimeNovo(limites), esperadoAte: ESPERADO_ATE });
  const informada = (id: string, data: string, valorInformado: string): Lancamento => ({
    id,
    tipo: "prestacao",
    data,
    competencia: data.slice(0, 7),
    valorInformado,
    origem: "avulso",
    editado: true,
  });
  const pelaBase = (id: string, data: string): Lancamento => ({
    id,
    tipo: "prestacao",
    data,
    competencia: data.slice(0, 7),
    origem: "lote",
    editado: false,
  });
  const comBase = (base: Base, lancamentos: Lancamento[], dataElaboracao = hoje): Calculo => ({
    ...calculoCom(lancamentos, dataElaboracao),
    base,
  });

  it("IPCA do mês da consulta ainda não divulgado: aviso próprio no lançamento e resumo próprio, sem o genérico; valores inalterados", () => {
    const r = calcular(
      calculoCom([informada("p", "2024-09-30", "1000.00")], hoje),
      comCalendario(),
    );
    expect(r.lancamentos[0]).toMatchObject({
      correcao: { fator: "1.099852" },
      corrigido: "1099.85",
      juros: { percentual: "17.247591" },
      jurosValor: "189.70",
      atualizado: "1289.55",
    });
    expect(r.lancamentos[0]?.avisos).toEqual([
      "Valor informado à mão (R$ 1.000,00), não apurado pela base dos alimentos.",
      "IPCA de out/2026 ainda sem divulgação na data da consulta (previsão: por volta de 10/11/2026): o mês entrou sem correção (fator 1,000000).",
    ]);
    expect(r.avisos).toEqual([
      "Meses ainda sem divulgação na data da consulta (entraram sem correção): IPCA de out/2026.",
      "Prestações com valor informado à mão, não apurado pela base dos alimentos: set/2024.",
    ]);
  });

  it("buraco na tabela e mês ainda não divulgado no mesmo lançamento: cada um com o seu texto e o seu resumo", () => {
    const tabela = comCalendario();
    delete tabela.series["433"]?.["2025-05"];
    const r = calcular(calculoCom([informada("p", "2024-09-30", "1000.00")], hoje), tabela);
    expect(r.lancamentos[0]?.avisos).toEqual([
      "Valor informado à mão (R$ 1.000,00), não apurado pela base dos alimentos.",
      "IPCA de mai/2025 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
      "IPCA de out/2026 ainda sem divulgação na data da consulta (previsão: por volta de 10/11/2026): o mês entrou sem correção (fator 1,000000).",
    ]);
    expect(r.avisos).toEqual([
      "Meses ainda sem divulgação na data da consulta (entraram sem correção): IPCA de out/2026.",
      "Meses sem índice na tabela (entraram sem correção): IPCA de mai/2025.",
      "Prestações com valor informado à mão, não apurado pela base dos alimentos: set/2024.",
    ]);
  });

  it("o resumo dos não divulgados agrupa por série em ordem numérica, meses crescentes, sem repetição", () => {
    const selic: Lancamento = {
      ...informada("s", "2026-09-30", "1000.00"),
      encargos: { metodologia: metodologiaSelicUnica() },
    };
    const r = calcular(
      calculoCom(
        [informada("p1", "2026-08-30", "1000.00"), informada("p2", "2026-09-30", "1000.00"), selic],
        "2026-11-11",
      ),
      comCalendario(),
    );
    expect(r.avisos).toContain(
      "Meses ainda sem divulgação na data da consulta (entraram sem correção): IPCA de out/2026, nov/2026; SELIC de nov/2026.",
    );
    expect(r.avisos).not.toContainEqual(
      expect.stringContaining("Meses sem índice na tabela (entraram sem correção)"),
    );
    expect(r.lancamentos[2]?.avisos).toContain(
      "SELIC de nov/2026 ainda sem divulgação na data da consulta (previsão: ao longo de nov/2026, como acumulado parcial fechado no início de dez/2026): o mês entrou sem correção (fator 1,000000).",
    );
  });

  it("taxa legal ainda não divulgada: aviso próprio no lançamento e resumo próprio, sem o genérico", () => {
    const r = calcular(
      calculoCom([informada("p", "2026-10-30", "1000.00")], "2026-11-11"),
      comCalendario(),
    );
    expect(r.lancamentos[0]?.avisos).toEqual([
      "Valor informado à mão (R$ 1.000,00), não apurado pela base dos alimentos.",
      "IPCA de out/2026 ainda sem divulgação na data da consulta (previsão: por volta de 10/11/2026): o mês entrou sem correção (fator 1,000000).",
      "IPCA de nov/2026 ainda sem divulgação na data da consulta (previsão: por volta de 10/12/2026): o mês entrou sem correção (fator 1,000000).",
      "Taxa legal de nov/2026 ainda sem divulgação na data da consulta (previsão: no 1º dia útil de nov/2026): os dias de 01/11/2026 a 10/11/2026 ficaram sem juros.",
    ]);
    expect(r.avisos).toEqual([
      "Meses ainda sem divulgação na data da consulta (entraram sem correção): IPCA de out/2026, nov/2026.",
      "Meses de taxa legal ainda sem divulgação (os dias desses meses ficaram sem juros): nov/2026.",
      "Prestações com valor informado à mão, não apurado pela base dos alimentos: out/2026.",
    ]);
    // a taxa legal de out/2026 (30 e 31/10) foi aplicada normalmente
    expect(r.lancamentos[0]?.juros.detalhe).toEqual([
      {
        regime: "taxaLegal",
        de: "2026-10-30",
        ate: "2026-10-31",
        dias: 2,
        diasDoMes: 31,
        taxa: "0.379020",
        percentual: "0.024453",
      },
    ]);
  });

  it("taxa legal: buraco num mês já esperado e mês ainda não divulgado, cada um no seu resumo", () => {
    const tabela = comCalendario();
    delete tabela.series["29543"]?.["2026-09"];
    const r = calcular(calculoCom([informada("p", "2026-08-30", "1000.00")], "2026-11-11"), tabela);
    expect(r.lancamentos[0]?.avisos).toContain(
      "Taxa legal de set/2026 não disponível na tabela de índices: os dias de 01/09/2026 a 30/09/2026 ficaram sem juros.",
    );
    expect(r.lancamentos[0]?.avisos).toContain(
      "Taxa legal de nov/2026 ainda sem divulgação na data da consulta (previsão: no 1º dia útil de nov/2026): os dias de 01/11/2026 a 10/11/2026 ficaram sem juros.",
    );
    expect(r.avisos).toContain(
      "Meses de taxa legal ainda sem divulgação (os dias desses meses ficaram sem juros): nov/2026.",
    );
    expect(r.avisos).toContain(
      "Meses sem taxa legal na tabela (os dias desses meses ficaram sem juros): set/2026.",
    );
  });

  it("esperadoAte parcial (só o IPCA): taxa legal e salário mínimo seguem com os textos genéricos", () => {
    const tabela: TabelaIndices = {
      ...tabelaRegimeNovo({ "29543": "2026-09" }),
      esperadoAte: { "433": "2026-09" },
    };
    const r = calcular(calculoCom([informada("p", "2026-09-30", "1000.00")], hoje), tabela);
    expect(r.lancamentos[0]?.avisos).toEqual([
      "Valor informado à mão (R$ 1.000,00), não apurado pela base dos alimentos.",
      "IPCA de out/2026 ainda sem divulgação na data da consulta (previsão: por volta de 10/11/2026): o mês entrou sem correção (fator 1,000000).",
      "Taxa legal de out/2026 não disponível na tabela de índices: os dias de 01/10/2026 a 10/10/2026 ficaram sem juros.",
    ]);
    expect(r.avisos).toEqual([
      "Meses ainda sem divulgação na data da consulta (entraram sem correção): IPCA de out/2026.",
      "Meses sem taxa legal na tabela (os dias desses meses ficaram sem juros): out/2026.",
      "Prestações com valor informado à mão, não apurado pela base dos alimentos: set/2026.",
    ]);
    const salario = calcular(
      comBase({ tipo: "percentualSalarioMinimo", percentual: "30" }, [pelaBase("p", "2027-01-10")]),
      tabela,
    );
    expect(salario.lancamentos[0]?.avisos[0]).toBe(
      "Salário mínimo de jan/2027 ainda não publicado na tabela de índices: usado o de dez/2026 (R$ 1.621,00), vigente até a publicação do novo.",
    );
    expect(salario.avisos).toEqual([
      "Meses sem índice na tabela para o valor-base das prestações (ver o aviso de cada uma): salário mínimo de jan/2027.",
      "Prestações vincendas, incluídas pelo valor nominal, sem correção e sem juros: jan/2027.",
    ]);
  });

  it("salário mínimo ainda não publicado para o valor-base: resumo próprio, sem o genérico", () => {
    const r = calcular(
      comBase({ tipo: "percentualSalarioMinimo", percentual: "30" }, [pelaBase("p", "2027-01-10")]),
      comCalendario(),
    );
    expect(r.lancamentos[0]).toMatchObject({
      situacao: "vincenda",
      valorBase: "486.30",
      memoriaBase:
        "30% do salário mínimo vigente em jan/2027 (R$ 1.621,00, último publicado: dez/2026) = R$ 486,30",
    });
    expect(r.lancamentos[0]?.avisos[0]).toBe(
      "Salário mínimo de jan/2027 ainda não publicado na data da consulta (previsão: no início de 2027, com o decreto do salário mínimo): usado o de dez/2026 (R$ 1.621,00), vigente até a publicação do novo.",
    );
    expect(r.avisos).toEqual([
      "Meses ainda sem divulgação para o valor-base das prestações (ver o aviso de cada uma): salário mínimo de jan/2027.",
      "Prestações vincendas, incluídas pelo valor nominal, sem correção e sem juros: jan/2027.",
    ]);
  });

  it("buraco no salário mínimo num mês já esperado: 'não consta', memória 'último anterior disponível' e resumo genérico", () => {
    const tabela = comCalendario();
    delete tabela.series["1619"]?.["2026-06"];
    const r = calcular(
      comBase({ tipo: "percentualSalarioMinimo", percentual: "30" }, [pelaBase("p", "2026-06-10")]),
      tabela,
    );
    expect(r.lancamentos[0]).toMatchObject({
      situacao: "atualizado",
      valorBase: "486.30",
      memoriaBase:
        "30% do salário mínimo vigente em jun/2026 (R$ 1.621,00, último anterior disponível: mai/2026) = R$ 486,30",
    });
    expect(r.lancamentos[0]?.avisos).toEqual([
      "Salário mínimo de jun/2026 não consta na tabela de índices: usado o de mai/2026 (R$ 1.621,00), o último anterior disponível.",
      "IPCA de out/2026 ainda sem divulgação na data da consulta (previsão: por volta de 10/11/2026): o mês entrou sem correção (fator 1,000000).",
    ]);
    expect(r.avisos).toEqual([
      "Meses ainda sem divulgação na data da consulta (entraram sem correção): IPCA de out/2026.",
      "Meses sem índice na tabela para o valor-base das prestações (ver o aviso de cada uma): salário mínimo de jun/2026.",
    ]);
  });

  it("reajuste pelo IPCA ainda não divulgado: aviso próprio no lançamento e resumo próprio da base", () => {
    const base: Base = {
      tipo: "valorFixo",
      valor: "500.00",
      dataFixacao: "2025-11-15",
      indiceReajuste: "IPCA",
      mesReajuste: 11,
    };
    const r = calcular(comBase(base, [pelaBase("p", "2026-11-15")]), comCalendario());
    expect(r.lancamentos[0]?.avisos[0]).toBe(
      "IPCA de out/2026 ainda sem divulgação na data da consulta (previsão: por volta de 10/11/2026): o reajuste de nov/2026 não foi aplicado; a prestação mantém R$ 500,00.",
    );
    expect(r.avisos).toEqual([
      "Meses ainda sem divulgação para o valor-base das prestações (ver o aviso de cada uma): IPCA de out/2026.",
      "Prestações vincendas, incluídas pelo valor nominal, sem correção e sem juros: nov/2026.",
    ]);
    // buraco e mês não divulgado na mesma janela: texto genérico no lançamento; o resumo separa os meses
    const tabela = comCalendario();
    delete tabela.series["433"]?.["2026-05"];
    const r2 = calcular(comBase(base, [pelaBase("p", "2026-11-15")]), tabela);
    expect(r2.lancamentos[0]?.avisos[0]).toBe(
      "IPCA de mai/2026, out/2026 não disponível na tabela de índices (último mês disponível: set/2026): o reajuste de nov/2026 não foi aplicado; a prestação mantém R$ 500,00.",
    );
    expect(r2.avisos.slice(0, 2)).toEqual([
      "Meses ainda sem divulgação para o valor-base das prestações (ver o aviso de cada uma): IPCA de out/2026.",
      "Meses sem índice na tabela para o valor-base das prestações (ver o aviso de cada uma): IPCA de mai/2026.",
    ]);
  });

  it("tabela sem esperadoAte: todos os textos genéricos continuam como antes", () => {
    const r = calcular(
      calculoCom([informada("p", "2026-09-30", "1000.00")], hoje),
      tabelaRegimeNovo({ "29543": "2026-09" }),
    );
    expect(r.lancamentos[0]?.avisos.slice(1)).toEqual([
      "IPCA de out/2026 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
      "Taxa legal de out/2026 não disponível na tabela de índices: os dias de 01/10/2026 a 10/10/2026 ficaram sem juros.",
    ]);
    expect(r.avisos).toEqual([
      "Meses sem índice na tabela (entraram sem correção): IPCA de out/2026.",
      "Meses sem taxa legal na tabela (os dias desses meses ficaram sem juros): out/2026.",
      "Prestações com valor informado à mão, não apurado pela base dos alimentos: set/2026.",
    ]);
  });
});
