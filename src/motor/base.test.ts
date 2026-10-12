import { describe, expect, it } from "vitest";
import type { Base, Competencia, Lancamento, TabelaIndices } from "../compartilhado/tipos.ts";
import { apurarValorBase } from "./base.ts";
import { tabelaIgpm } from "./testes/indices-igpm-2017-2018.ts";
import { tabelaRegimeNovo } from "./testes/regime-novo.ts";

function prestacao(data: string, extra: Partial<Lancamento> = {}): Lancamento {
  return {
    id: `p-${data}`,
    tipo: "prestacao",
    data,
    competencia: data.slice(0, 7),
    origem: "lote",
    editado: false,
    ...extra,
  };
}

const obtidoEm = "2026-10-11T12:00:00.000Z";

describe("base em percentual do salário mínimo (§6.3)", () => {
  const base: Base = { tipo: "percentualSalarioMinimo", percentual: "30" };

  it("percentual × salário mínimo do mês do vencimento, com proveniência (série 1619)", () => {
    const tabela = tabelaRegimeNovo();
    const r = apurarValorBase(prestacao("2024-03-10"), base, tabela, 2);
    expect(r.valor?.toFixed(2)).toBe("423.60");
    expect(r.memoria).toBe("30% do salário mínimo de mar/2024 (R$ 1.412,00) = R$ 423,60");
    expect(r.indicesUsados).toEqual([
      { serie: "1619", competencia: "2024-03", valor: "1412.00", fonte: "embutida", obtidoEm },
    ]);
    expect(r.avisos).toEqual([]);
    expect(r.mesesSemIndice).toEqual([]);
    expect(apurarValorBase(prestacao("2025-01-01"), base, tabela, 2).valor?.toFixed(2)).toBe(
      "455.40",
    );
    expect(apurarValorBase(prestacao("2026-10-01"), base, tabela, 2).valor?.toFixed(2)).toBe(
      "486.30",
    );
  });

  it("usa o mês do vencimento, não a competência, para escolher o salário mínimo", () => {
    const r = apurarValorBase(
      prestacao("2026-01-10", { competencia: "2025-12" }),
      base,
      tabelaRegimeNovo(),
      2,
    );
    expect(r.valor?.toFixed()).toBe("486.3");
    expect(r.memoria).toBe("30% do salário mínimo de jan/2026 (R$ 1.621,00) = R$ 486,30");
  });

  it("mês ainda sem salário mínimo publicado: usa o último anterior (vigente até o novo decreto), com aviso e mês sinalizado", () => {
    const r = apurarValorBase(prestacao("2027-01-05"), base, tabelaRegimeNovo(), 2);
    expect(r.valor?.toFixed(2)).toBe("486.30");
    expect(r.memoria).toBe(
      "30% do salário mínimo vigente em jan/2027 (R$ 1.621,00, último publicado: dez/2026) = R$ 486,30",
    );
    expect(r.avisos).toEqual([
      "Salário mínimo de jan/2027 ainda não publicado na tabela de índices: usado o de dez/2026 (R$ 1.621,00), vigente até a publicação do novo.",
    ]);
    expect(r.indicesUsados.map((i) => i.competencia)).toEqual(["2026-12"]);
    expect(r.mesesSemIndice).toEqual([{ serie: "1619", competencia: "2027-01" }]);
  });

  it("sem nenhum salário mínimo anterior na tabela: fica sem valor, com aviso", () => {
    const r = apurarValorBase(prestacao("2023-06-10"), base, tabelaRegimeNovo(), 2);
    expect(r.valor).toBeNull();
    expect(r.avisos).toEqual([
      "Salário mínimo de jun/2023 não disponível na tabela de índices: a prestação ficou sem valor; informe o valor à mão.",
    ]);
    expect(r.mesesSemIndice).toEqual([{ serie: "1619", competencia: "2023-06" }]);
    const semSerie: TabelaIndices = { consultadoEm: obtidoEm, series: {} };
    expect(apurarValorBase(prestacao("2024-03-10"), base, semSerie, 2).valor).toBeNull();
  });

  it("percentual inválido: sem valor, com aviso, sem erro", () => {
    const r = apurarValorBase(
      prestacao("2024-03-10"),
      { tipo: "percentualSalarioMinimo", percentual: "30,5" },
      tabelaRegimeNovo(),
      2,
    );
    expect(r.valor).toBeNull();
    expect(r.avisos).toEqual([
      'Percentual da base ("30,5") não é um número válido: a prestação ficou sem valor; informe o valor à mão.',
    ]);
    expect(
      apurarValorBase(
        prestacao("2024-03-10"),
        { tipo: "percentualSalarioMinimo", percentual: "48.23" },
        tabelaRegimeNovo(),
        2,
      ).memoria,
    ).toBe("48,23% do salário mínimo de mar/2024 (R$ 1.412,00) = R$ 681,01");
    // o próprio Decimal sai arredondado a 2 casas (681,0076 → 681,01); toFixed(2) arredondaria
    // de novo e esconderia a falha, por isso aqui vai toFixed() sem argumento
    expect(
      apurarValorBase(
        prestacao("2024-03-10"),
        { tipo: "percentualSalarioMinimo", percentual: "48.23" },
        tabelaRegimeNovo(),
        2,
      ).valor?.toFixed(),
    ).toBe("681.01");
  });
});

describe("base em percentual dos rendimentos (§6.3)", () => {
  const base: Base = {
    tipo: "percentualRendimentos",
    percentual: "30",
    rendimentoPadrao: "1500.00",
  };
  const tabela = tabelaRegimeNovo();

  it("usa o rendimento do mês quando informado no lançamento; senão, o padrão", () => {
    const padrao = apurarValorBase(prestacao("2024-03-10"), base, tabela, 2);
    expect(padrao.valor?.toFixed(2)).toBe("450.00");
    expect(padrao.memoria).toBe("30% do rendimento padrão (R$ 1.500,00) = R$ 450,00");
    expect(padrao.indicesUsados).toEqual([]);
    const proprio = apurarValorBase(
      prestacao("2024-03-10", { rendimento: "3000.00" }),
      base,
      tabela,
      2,
    );
    expect(proprio.valor?.toFixed(2)).toBe("900.00");
    expect(proprio.memoria).toBe("30% do rendimento de mar/2024 (R$ 3.000,00) = R$ 900,00");
    // 13º salário como prestação avulsa com o rendimento do evento
    const decimoTerceiro = apurarValorBase(
      prestacao("2025-12-20", { descricao: "13º salário 2025", rendimento: "3200.00" }),
      base,
      tabela,
      2,
    );
    expect(decimoTerceiro.valor?.toFixed(2)).toBe("960.00");
    expect(decimoTerceiro.memoria).toBe("30% do rendimento de dez/2025 (R$ 3.200,00) = R$ 960,00");
  });

  it("arredonda a 2 casas e trata rendimento ou percentual inválido com aviso", () => {
    expect(
      apurarValorBase(
        prestacao("2024-03-10"),
        { ...base, percentual: "33.333" },
        tabela,
        2,
      ).valor?.toFixed(2),
    ).toBe("500.00");
    // o próprio Decimal sai arredondado (499,995 → 500): toFixed() não arredonda de novo
    expect(
      apurarValorBase(
        prestacao("2024-03-10"),
        { ...base, percentual: "33.333" },
        tabela,
        2,
      ).valor?.toFixed(),
    ).toBe("500");
    const invalido = apurarValorBase(
      prestacao("2024-03-10", { rendimento: "abc" }),
      base,
      tabela,
      2,
    );
    expect(invalido.valor).toBeNull();
    expect(invalido.avisos).toEqual([
      'Rendimento de mar/2024 ("abc") não é um número válido: a prestação ficou sem valor; informe o rendimento ou o valor à mão.',
    ]);
    const padraoInvalido = apurarValorBase(
      prestacao("2024-03-10"),
      { ...base, rendimentoPadrao: "" },
      tabela,
      2,
    );
    expect(padraoInvalido.avisos).toEqual([
      'Rendimento padrão ("") não é um número válido: a prestação ficou sem valor; informe o rendimento ou o valor à mão.',
    ]);
    expect(
      apurarValorBase(
        prestacao("2024-03-10"),
        { ...base, rendimentoPadrao: "0" },
        tabela,
        2,
      ).valor?.toFixed(2),
    ).toBe("0.00");
  });
});

describe("base em valor fixo (§6.3)", () => {
  const tabela = tabelaRegimeNovo();

  it("sem reajuste: o valor fixado, com arredondamento a 2 casas", () => {
    const base: Base = {
      tipo: "valorFixo",
      valor: "451.91",
      dataFixacao: "2017-01-10",
      indiceReajuste: "nenhum",
      mesReajuste: 1,
    };
    const r = apurarValorBase(prestacao("2018-02-10"), base, tabelaIgpm(), 2);
    expect(r.valor?.toFixed(2)).toBe("451.91");
    expect(r.memoria).toBe("Valor fixado em 10/01/2017: R$ 451,91 (sem reajuste)");
    expect(r.indicesUsados).toEqual([]);
    expect(
      apurarValorBase(
        prestacao("2018-02-10"),
        { ...base, valor: "500.005" },
        tabelaIgpm(),
        2,
      ).valor?.toFixed(2),
    ).toBe("500.01");
    // o próprio Decimal sai arredondado (500,005 → 500,01): toFixed() não arredonda de novo
    expect(
      apurarValorBase(
        prestacao("2018-02-10"),
        { ...base, valor: "500.005" },
        tabelaIgpm(),
        2,
      ).valor?.toFixed(),
    ).toBe("500.01");
  });

  it("prestação anterior à data de fixação: valor fixado, sem reajuste, com aviso", () => {
    const base: Base = {
      tipo: "valorFixo",
      valor: "500.00",
      dataFixacao: "2024-03-15",
      indiceReajuste: "IPCA",
      mesReajuste: 3,
    };
    const r = apurarValorBase(prestacao("2024-01-15"), base, tabela, 2);
    expect(r.valor?.toFixed(2)).toBe("500.00");
    expect(r.memoria).toBe(
      "Valor fixado em 15/03/2024: R$ 500,00 (prestação anterior à fixação, sem reajuste)",
    );
    expect(r.avisos).toEqual([
      "Prestação de jan/2024 anterior à data de fixação (15/03/2024): usado o valor fixado, sem reajuste.",
    ]);
    // no próprio mês da fixação, mesmo antes do dia, vale o valor fixado sem aviso
    expect(apurarValorBase(prestacao("2024-03-10"), base, tabela, 2).avisos).toEqual([]);
  });

  it("valor fixado inválido: sem valor, com aviso", () => {
    const base: Base = {
      tipo: "valorFixo",
      valor: "1.500,00",
      dataFixacao: "2024-03-15",
      indiceReajuste: "nenhum",
      mesReajuste: 3,
    };
    const r = apurarValorBase(prestacao("2024-04-15"), base, tabela, 2);
    expect(r.valor).toBeNull();
    expect(r.avisos).toEqual([
      'Valor fixado ("1.500,00") não é um número válido: a prestação ficou sem valor; informe o valor à mão.',
    ]);
  });

  describe("reajuste pelo salário mínimo (proporção entre o SM do vencimento e o da fixação)", () => {
    const base: Base = {
      tipo: "valorFixo",
      valor: "451.91",
      dataFixacao: "2017-01-10",
      indiceReajuste: "SM",
      mesReajuste: 1,
    };
    const tabela2017 = tabelaIgpm("2018-04", [], true);

    it("reproduz a base do caso SAJ 2018: R$ 451,91 em 2017 e R$ 460,11 em 2018", () => {
      const em2017 = apurarValorBase(prestacao("2017-05-10"), base, tabela2017, 2);
      expect(em2017.valor?.toFixed(2)).toBe("451.91");
      expect(em2017.memoria).toBe(
        "R$ 451,91 fixados em 10/01/2017 × salário mínimo de mai/2017 (R$ 937,00) ÷ salário mínimo de jan/2017 (R$ 937,00) = R$ 451,91",
      );
      expect(em2017.indicesUsados.map((i) => `${i.serie}|${i.competencia}|${i.valor}`)).toEqual([
        "1619|2017-01|937.00",
        "1619|2017-05|937.00",
      ]);
      const em2018 = apurarValorBase(prestacao("2018-01-10"), base, tabela2017, 2);
      expect(em2018.valor?.toFixed(2)).toBe("460.11");
      // o próprio Decimal sai arredondado (460,1090… → 460,11): toFixed() não arredonda de novo
      expect(em2018.valor?.toFixed()).toBe("460.11");
      expect(em2018.memoria).toBe(
        "R$ 451,91 fixados em 10/01/2017 × salário mínimo de jan/2018 (R$ 954,00) ÷ salário mínimo de jan/2017 (R$ 937,00) = R$ 460,11",
      );
      // no mês da fixação, o salário mínimo entra uma vez só na proveniência
      expect(
        apurarValorBase(prestacao("2017-01-10"), base, tabela2017, 2).indicesUsados,
      ).toHaveLength(1);
    });

    it("o mês de reajuste não interfere: o valor acompanha o salário mínimo no mês em que ele muda", () => {
      expect(
        apurarValorBase(
          prestacao("2018-01-10"),
          { ...base, mesReajuste: 6 },
          tabela2017,
          2,
        ).valor?.toFixed(2),
      ).toBe("460.11");
    });

    it("salário mínimo do vencimento ainda não publicado: usa o último, com aviso; sem o da fixação, fica sem valor", () => {
      const futuro = apurarValorBase(prestacao("2018-03-10"), base, tabela2017, 2);
      expect(futuro.valor?.toFixed(2)).toBe("460.11");
      expect(futuro.avisos).toEqual([
        "Salário mínimo de mar/2018 ainda não publicado na tabela de índices: usado o de fev/2018 (R$ 954,00), vigente até a publicação do novo.",
      ]);
      expect(futuro.mesesSemIndice).toEqual([{ serie: "1619", competencia: "2018-03" }]);
      const semFixacao = apurarValorBase(
        prestacao("2018-01-10"),
        { ...base, dataFixacao: "2016-12-10" },
        tabela2017,
        2,
      );
      expect(semFixacao.valor).toBeNull();
      expect(semFixacao.avisos).toEqual([
        "Salário mínimo de dez/2016 (mês da fixação) não disponível na tabela de índices: a prestação ficou sem valor; informe o valor à mão.",
      ]);
    });
  });

  describe("reajuste anual pelo índice acumulado (IGP-M, INPC ou IPCA)", () => {
    const base: Base = {
      tipo: "valorFixo",
      valor: "500.00",
      dataFixacao: "2024-03-15",
      indiceReajuste: "IPCA",
      mesReajuste: 3,
    };

    it("antes do primeiro reajuste vale o valor fixado; a memória diz quando ele vem", () => {
      const r = apurarValorBase(prestacao("2025-02-15"), base, tabela, 2);
      expect(r.valor?.toFixed(2)).toBe("500.00");
      expect(r.memoria).toBe(
        "Valor fixado em 15/03/2024: R$ 500,00 (primeiro reajuste pelo IPCA em mar/2025)",
      );
      expect(r.indicesUsados).toEqual([]);
      expect(apurarValorBase(prestacao("2024-03-15"), base, tabela, 2).valor?.toFixed(2)).toBe(
        "500.00",
      );
    });

    it("primeiro reajuste 12 meses após a fixação, pelo acumulado com precisão integral; arredondamento a 2 casas a cada reajuste", () => {
      // Calculadora do Cidadão (IPCA 03/2024→02/2025): 1,05057630; R$ 500,00 → R$ 525,29
      const primeiro = apurarValorBase(prestacao("2025-03-15"), base, tabela, 2);
      expect(primeiro.valor?.toFixed(2)).toBe("525.29");
      expect(primeiro.memoria).toBe(
        "R$ 500,00 fixados em 15/03/2024, reajustados em mar/2025 (IPCA de mar/2024 a fev/2025: 5,0576%) = R$ 525,29",
      );
      expect(primeiro.indicesUsados).toHaveLength(12);
      expect(primeiro.indicesUsados[0]).toEqual({
        serie: "433",
        competencia: "2024-03",
        valor: "0.16",
        fonte: "embutida",
        obtidoEm,
      });
      expect(primeiro.indicesUsados.at(-1)?.competencia).toBe("2025-02");
      // Calculadora (IPCA 03/2025→02/2026): 1,03812500; R$ 525,29 → R$ 545,32 (o segundo reajuste parte do valor arredondado)
      const segundo = apurarValorBase(prestacao("2026-09-15"), base, tabela, 2);
      expect(segundo.valor?.toFixed(2)).toBe("545.32");
      expect(segundo.memoria).toBe(
        "R$ 500,00 fixados em 15/03/2024, reajustados em mar/2025 (IPCA de mar/2024 a fev/2025: 5,0576%) e em mar/2026 (IPCA de mar/2025 a fev/2026: 3,8125%) = R$ 545,32",
      );
      expect(segundo.indicesUsados).toHaveLength(24);
      expect(apurarValorBase(prestacao("2026-02-15"), base, tabela, 2).valor?.toFixed(2)).toBe(
        "525.29",
      );
    });

    it("mês de reajuste diferente do mês da fixação: o primeiro reajuste usa o acumulado desde a fixação até o mês anterior, depois janelas de 12 meses", () => {
      const janeiro: Base = { ...base, mesReajuste: 1 };
      expect(apurarValorBase(prestacao("2024-12-15"), janeiro, tabela, 2).valor?.toFixed(2)).toBe(
        "500.00",
      );
      const primeiro = apurarValorBase(prestacao("2025-01-15"), janeiro, tabela, 2);
      expect(primeiro.valor?.toFixed(2)).toBe("517.67");
      expect(primeiro.memoria).toBe(
        "R$ 500,00 fixados em 15/03/2024, reajustados em jan/2025 (IPCA de mar/2024 a dez/2024: 3,5335%) = R$ 517,67",
      );
      const segundo = apurarValorBase(prestacao("2026-01-15"), janeiro, tabela, 2);
      expect(segundo.valor?.toFixed(2)).toBe("539.75");
      expect(segundo.memoria).toContain(
        "e em jan/2026 (IPCA de jan/2025 a dez/2025: 4,2644%) = R$ 539,75",
      );
      // mês de reajuste logo depois da fixação: janela curta, de um mês
      const junho: Base = { ...base, dataFixacao: "2024-05-20", mesReajuste: 6 };
      const curto = apurarValorBase(prestacao("2024-06-20"), junho, tabela, 2);
      expect(curto.valor?.toFixed(2)).toBe("502.30");
      expect(curto.memoria).toBe(
        "R$ 500,00 fixados em 20/05/2024, reajustados em jun/2024 (IPCA de mai/2024 a mai/2024: 0,4600%) = R$ 502,30",
      );
    });

    it("acumulado negativo não reduz o valor: IGP-M de 2017 (−0,53%) mantém R$ 451,91 em 2018", () => {
      const igpm: Base = {
        tipo: "valorFixo",
        valor: "451.91",
        dataFixacao: "2017-01-10",
        indiceReajuste: "IGP-M",
        mesReajuste: 1,
      };
      const r = apurarValorBase(prestacao("2018-01-10"), igpm, tabelaIgpm(), 2);
      expect(r.valor?.toFixed(2)).toBe("451.91");
      expect(r.memoria).toBe(
        "R$ 451,91 fixados em 10/01/2017, reajustados em jan/2018 (IGP-M de jan/2017 a dez/2017: -0,5326%, acumulado não positivo: valor mantido) = R$ 451,91",
      );
      expect(r.indicesUsados).toHaveLength(12);
      expect(r.avisos).toEqual([]);
    });

    it("índice do reajuste ainda não divulgado: reajuste não aplicado, valor vigente mantido, aviso e mês sinalizado", () => {
      const novembro: Base = { ...base, dataFixacao: "2025-11-15", mesReajuste: 11 };
      const r = apurarValorBase(prestacao("2026-11-15"), novembro, tabela, 2);
      expect(r.valor?.toFixed(2)).toBe("500.00");
      expect(r.avisos).toEqual([
        "IPCA de out/2026 não disponível na tabela de índices (último mês disponível: set/2026): o reajuste de nov/2026 não foi aplicado; a prestação mantém R$ 500,00.",
      ]);
      expect(r.memoria).toBe(
        "Valor fixado em 15/11/2025: R$ 500,00 (reajuste de nov/2026 não aplicado: IPCA de out/2026 não disponível)",
      );
      expect(r.mesesSemIndice).toEqual([{ serie: "433", competencia: "2026-10" }]);
      expect(r.indicesUsados).toEqual([]);
    });

    it("índice faltante no meio da janela: o reajuste daquele ano não é aplicado e a cadeia para ali, sem estimar", () => {
      const comLacuna = tabelaRegimeNovo();
      delete comLacuna.series["433"]?.["2025-05"];
      const r = apurarValorBase(prestacao("2026-09-15"), base, comLacuna, 2);
      expect(r.valor?.toFixed(2)).toBe("525.29");
      expect(r.avisos).toEqual([
        "IPCA de mai/2025 não disponível na tabela de índices (último mês disponível: set/2026): o reajuste de mar/2026 não foi aplicado; a prestação mantém R$ 525,29.",
      ]);
      expect(r.memoria).toBe(
        "R$ 500,00 fixados em 15/03/2024, reajustados em mar/2025 (IPCA de mar/2024 a fev/2025: 5,0576%) = R$ 525,29; reajuste de mar/2026 não aplicado: IPCA de mai/2025 não disponível",
      );
      expect(r.indicesUsados).toHaveLength(12);
    });

    it("mês do reajuste inválido: valor fixado, com aviso", () => {
      const r = apurarValorBase(prestacao("2026-09-15"), { ...base, mesReajuste: 13 }, tabela, 2);
      expect(r.valor?.toFixed(2)).toBe("500.00");
      expect(r.avisos).toEqual([
        "Mês do reajuste inválido (13): a prestação entrou com o valor fixado, sem reajuste.",
      ]);
    });

    it("INPC como índice de reajuste usa a série 188", () => {
      const inpc: Base = { ...base, indiceReajuste: "INPC" };
      const r = apurarValorBase(prestacao("2025-03-15"), inpc, tabela, 2);
      expect(r.indicesUsados.every((i) => i.serie === "188")).toBe(true);
      expect(r.indicesUsados).toHaveLength(12);
      expect(r.memoria).toContain("INPC de mar/2024 a fev/2025");
    });
  });
});

describe("base de tipo desconhecido", () => {
  it("tipo de base desconhecido (arquivo editado à mão) fica sem valor, com aviso, sem erro", () => {
    const estranha = { tipo: "desconhecida" } as unknown as Base;
    const r = apurarValorBase(prestacao("2024-03-10"), estranha, tabelaRegimeNovo(), 2);
    expect(r.valor).toBeNull();
    expect(r.avisos).toEqual([
      "Tipo de base não reconhecido: a prestação ficou sem valor; informe o valor à mão.",
    ]);
  });
});

describe("base com calendário de divulgação (fase 4: esperadoAte)", () => {
  const ESPERADO_ATE: TabelaIndices["esperadoAte"] = {
    "188": "2026-09",
    "189": "2026-09",
    "433": "2026-09",
    "1619": "2026-12",
    "29543": "2026-10",
    "4390": "2026-10",
  };
  const comCalendario = (): TabelaIndices => ({ ...tabelaRegimeNovo(), esperadoAte: ESPERADO_ATE });

  describe("percentual do salário mínimo", () => {
    const base: Base = { tipo: "percentualSalarioMinimo", percentual: "30" };

    it("mês posterior ao esperado: 'ainda não publicado', o último publicado vale até o novo decreto", () => {
      const r = apurarValorBase(prestacao("2027-01-05"), base, comCalendario(), 2);
      expect(r.valor?.toFixed(2)).toBe("486.30");
      expect(r.memoria).toBe(
        "30% do salário mínimo vigente em jan/2027 (R$ 1.621,00, último publicado: dez/2026) = R$ 486,30",
      );
      expect(r.avisos).toEqual([
        "Salário mínimo de jan/2027 ainda não publicado na data da consulta (previsão: no início de 2027, com o decreto do salário mínimo): usado o de dez/2026 (R$ 1.621,00), vigente até a publicação do novo.",
      ]);
      expect(r.mesesSemIndice).toEqual([{ serie: "1619", competencia: "2027-01" }]);
    });

    it("buraco num mês já esperado: 'não consta na tabela', usado o último anterior disponível", () => {
      const tabela = comCalendario();
      delete tabela.series["1619"]?.["2026-06"];
      const r = apurarValorBase(prestacao("2026-06-10"), base, tabela, 2);
      expect(r.valor?.toFixed(2)).toBe("486.30");
      expect(r.memoria).toBe(
        "30% do salário mínimo vigente em jun/2026 (R$ 1.621,00, último anterior disponível: mai/2026) = R$ 486,30",
      );
      expect(r.avisos).toEqual([
        "Salário mínimo de jun/2026 não consta na tabela de índices: usado o de mai/2026 (R$ 1.621,00), o último anterior disponível.",
      ]);
      expect(r.mesesSemIndice).toEqual([{ serie: "1619", competencia: "2026-06" }]);
      expect(r.indicesUsados.map((i) => i.competencia)).toEqual(["2026-05"]);
    });

    it("buraco no próprio mês esperado (dez/2026) é 'não consta'; o mês seguinte é 'ainda não publicado'", () => {
      const tabela = comCalendario();
      delete tabela.series["1619"]?.["2026-12"];
      expect(apurarValorBase(prestacao("2026-12-10"), base, tabela, 2).avisos).toEqual([
        "Salário mínimo de dez/2026 não consta na tabela de índices: usado o de nov/2026 (R$ 1.621,00), o último anterior disponível.",
      ]);
      expect(apurarValorBase(prestacao("2027-01-10"), base, tabela, 2).avisos).toEqual([
        "Salário mínimo de jan/2027 ainda não publicado na data da consulta (previsão: no início de 2027, com o decreto do salário mínimo): usado o de nov/2026 (R$ 1.621,00), vigente até a publicação do novo.",
      ]);
    });

    it("sem esperadoAte do salário mínimo (tabela antiga ou calendário parcial), o buraco recebe o texto antigo", () => {
      const semCalendario = tabelaRegimeNovo();
      delete semCalendario.series["1619"]?.["2026-06"];
      const antigo =
        "Salário mínimo de jun/2026 ainda não publicado na tabela de índices: usado o de mai/2026 (R$ 1.621,00), vigente até a publicação do novo.";
      expect(apurarValorBase(prestacao("2026-06-10"), base, semCalendario, 2).avisos).toEqual([
        antigo,
      ]);
      const parcial: TabelaIndices = { ...semCalendario, esperadoAte: { "433": "2026-09" } };
      const r = apurarValorBase(prestacao("2026-06-10"), base, parcial, 2);
      expect(r.avisos).toEqual([antigo]);
      expect(r.memoria).toContain("último publicado: mai/2026");
    });

    it("sem nenhum salário mínimo anterior, o aviso de 'sem valor' não muda", () => {
      const r = apurarValorBase(prestacao("2023-06-10"), base, comCalendario(), 2);
      expect(r.valor).toBeNull();
      expect(r.avisos).toEqual([
        "Salário mínimo de jun/2023 não disponível na tabela de índices: a prestação ficou sem valor; informe o valor à mão.",
      ]);
    });
  });

  describe("valor fixo reajustado pelo salário mínimo", () => {
    const base: Base = {
      tipo: "valorFixo",
      valor: "451.91",
      dataFixacao: "2017-01-10",
      indiceReajuste: "SM",
      mesReajuste: 1,
    };
    const tabela2017 = (esperadoAte: Competencia): TabelaIndices => ({
      ...tabelaIgpm("2018-04", [], true),
      esperadoAte: { "1619": esperadoAte },
    });

    it("mês posterior ao esperado: 'ainda não publicado' e memória com 'último publicado'", () => {
      const r = apurarValorBase(prestacao("2018-03-10"), base, tabela2017("2018-02"), 2);
      expect(r.valor?.toFixed(2)).toBe("460.11");
      expect(r.avisos).toEqual([
        "Salário mínimo de mar/2018 ainda não publicado na data da consulta (previsão: no início de 2018, com o decreto do salário mínimo): usado o de fev/2018 (R$ 954,00), vigente até a publicação do novo.",
      ]);
      expect(r.memoria).toBe(
        "R$ 451,91 fixados em 10/01/2017 × salário mínimo vigente em mar/2018 (R$ 954,00, último publicado: fev/2018) ÷ salário mínimo de jan/2017 (R$ 937,00) = R$ 460,11",
      );
      expect(r.mesesSemIndice).toEqual([{ serie: "1619", competencia: "2018-03" }]);
    });

    it("mês já esperado mas ausente: 'não consta' e memória com 'último anterior disponível'", () => {
      const r = apurarValorBase(prestacao("2018-03-10"), base, tabela2017("2018-12"), 2);
      expect(r.valor?.toFixed(2)).toBe("460.11");
      expect(r.avisos).toEqual([
        "Salário mínimo de mar/2018 não consta na tabela de índices: usado o de fev/2018 (R$ 954,00), o último anterior disponível.",
      ]);
      expect(r.memoria).toBe(
        "R$ 451,91 fixados em 10/01/2017 × salário mínimo vigente em mar/2018 (R$ 954,00, último anterior disponível: fev/2018) ÷ salário mínimo de jan/2017 (R$ 937,00) = R$ 460,11",
      );
      expect(r.mesesSemIndice).toEqual([{ serie: "1619", competencia: "2018-03" }]);
      expect(r.indicesUsados.map((i) => i.competencia)).toEqual(["2017-01", "2018-02"]);
    });

    it("mês presente na tabela: sem aviso, com ou sem calendário", () => {
      expect(
        apurarValorBase(prestacao("2018-01-10"), base, tabela2017("2018-02"), 2).avisos,
      ).toEqual([]);
      expect(
        apurarValorBase(prestacao("2018-01-10"), base, tabela2017("2017-12"), 2).avisos,
      ).toEqual([]);
    });
  });

  describe("valor fixo reajustado por índice", () => {
    const base: Base = {
      tipo: "valorFixo",
      valor: "500.00",
      dataFixacao: "2025-11-15",
      indiceReajuste: "IPCA",
      mesReajuste: 11,
    };

    it("todos os meses faltantes da janela ainda não divulgados: aviso próprio, sem 'último mês disponível'", () => {
      const r = apurarValorBase(prestacao("2026-11-15"), base, comCalendario(), 2);
      expect(r.valor?.toFixed(2)).toBe("500.00");
      expect(r.avisos).toEqual([
        "IPCA de out/2026 ainda sem divulgação na data da consulta (previsão: por volta de 10/11/2026): o reajuste de nov/2026 não foi aplicado; a prestação mantém R$ 500,00.",
      ]);
      expect(r.memoria).toBe(
        "Valor fixado em 15/11/2025: R$ 500,00 (reajuste de nov/2026 não aplicado: IPCA de out/2026 não disponível)",
      );
      expect(r.mesesSemIndice).toEqual([{ serie: "433", competencia: "2026-10" }]);
      expect(r.indicesUsados).toEqual([]);
    });

    it("dois meses ainda não divulgados saem listados na mesma frase", () => {
      const dezembro: Base = { ...base, dataFixacao: "2025-12-15", mesReajuste: 12 };
      const r = apurarValorBase(prestacao("2026-12-15"), dezembro, comCalendario(), 2);
      expect(r.avisos).toEqual([
        "IPCA de out/2026, nov/2026 ainda sem divulgação na data da consulta (previsão para nov/2026: por volta de 10/12/2026): o reajuste de dez/2026 não foi aplicado; a prestação mantém R$ 500,00.",
      ]);
      expect(r.mesesSemIndice).toEqual([
        { serie: "433", competencia: "2026-10" },
        { serie: "433", competencia: "2026-11" },
      ]);
    });

    it("segundo reajuste com meses ainda não divulgados: a frase mantém o valor já reajustado", () => {
      const marco: Base = { ...base, dataFixacao: "2024-11-15", mesReajuste: 11 };
      const r = apurarValorBase(prestacao("2026-11-15"), marco, comCalendario(), 2);
      expect(r.avisos).toEqual([
        "IPCA de out/2026 ainda sem divulgação na data da consulta (previsão: por volta de 10/11/2026): o reajuste de nov/2026 não foi aplicado; a prestação mantém R$ 523,40.",
      ]);
      expect(r.valor?.toFixed(2)).toBe("523.40");
      expect(r.memoria).toContain("reajustados em nov/2025 (IPCA de nov/2024 a out/2025: 4,6808%)");
    });

    it("buraco e mês ainda não divulgado na mesma janela: vale o texto genérico", () => {
      const tabela = comCalendario();
      delete tabela.series["433"]?.["2026-05"];
      const r = apurarValorBase(prestacao("2026-11-15"), base, tabela, 2);
      expect(r.avisos).toEqual([
        "IPCA de mai/2026, out/2026 não disponível na tabela de índices (último mês disponível: set/2026): o reajuste de nov/2026 não foi aplicado; a prestação mantém R$ 500,00.",
      ]);
      expect(r.mesesSemIndice).toEqual([
        { serie: "433", competencia: "2026-05" },
        { serie: "433", competencia: "2026-10" },
      ]);
    });

    it("buraco só, num mês já esperado: texto genérico", () => {
      const tabela = comCalendario();
      delete tabela.series["433"]?.["2025-05"];
      const marco: Base = { ...base, dataFixacao: "2024-03-15", mesReajuste: 3 };
      const r = apurarValorBase(prestacao("2026-09-15"), marco, tabela, 2);
      expect(r.avisos).toEqual([
        "IPCA de mai/2025 não disponível na tabela de índices (último mês disponível: set/2026): o reajuste de mar/2026 não foi aplicado; a prestação mantém R$ 525,29.",
      ]);
    });

    it("esperadoAte parcial sem o IPCA: texto genérico", () => {
      const tabela: TabelaIndices = { ...tabelaRegimeNovo(), esperadoAte: { "1619": "2026-12" } };
      const r = apurarValorBase(prestacao("2026-11-15"), base, tabela, 2);
      expect(r.avisos).toEqual([
        "IPCA de out/2026 não disponível na tabela de índices (último mês disponível: set/2026): o reajuste de nov/2026 não foi aplicado; a prestação mantém R$ 500,00.",
      ]);
    });

    it("INPC e IGP-M seguem a mesma regra pelas séries 188 e 189", () => {
      const inpc = apurarValorBase(
        prestacao("2026-11-15"),
        { ...base, indiceReajuste: "INPC" },
        comCalendario(),
        2,
      );
      expect(inpc.avisos).toEqual([
        "INPC de out/2026 ainda sem divulgação na data da consulta (previsão: por volta de 10/11/2026): o reajuste de nov/2026 não foi aplicado; a prestação mantém R$ 500,00.",
      ]);
      expect(inpc.mesesSemIndice).toEqual([{ serie: "188", competencia: "2026-10" }]);
      const igpm = apurarValorBase(
        prestacao("2026-11-15"),
        { ...base, indiceReajuste: "IGP-M" },
        comCalendario(),
        2,
      );
      expect(igpm.avisos).toEqual([
        "IGP-M de out/2026 ainda sem divulgação na data da consulta (previsão: no fim de out/2026): o reajuste de nov/2026 não foi aplicado; a prestação mantém R$ 500,00.",
      ]);
    });
  });
});
