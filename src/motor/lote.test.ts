import { describe, expect, it } from "vitest";
import type { Lancamento } from "../compartilhado/tipos.ts";
import { competenciasDoLote, gerarLoteAmortizacoes, gerarLotePrestacoes, idLivre } from "./lote.ts";

describe("lote de prestações (§6.1)", () => {
  it("N meses em atraso: a última prestação é a do vencimento mais recente que não ultrapassa a data de elaboração", () => {
    expect(competenciasDoLote({ diaVencimento: 5, mesesEmAtraso: 3 }, "2026-10-10")).toEqual({
      competencias: ["2026-08", "2026-09", "2026-10"],
      avisos: [],
    });
    expect(competenciasDoLote({ diaVencimento: 5, mesesEmAtraso: 3 }, "2026-10-03")).toEqual({
      competencias: ["2026-07", "2026-08", "2026-09"],
      avisos: [],
    });
    // elaboração no próprio dia do vencimento: a prestação do dia conta
    expect(
      competenciasDoLote({ diaVencimento: 5, mesesEmAtraso: 1 }, "2026-10-05").competencias,
    ).toEqual(["2026-10"]);
    // virada de ano
    expect(
      competenciasDoLote({ diaVencimento: 10, mesesEmAtraso: 3 }, "2026-01-05").competencias,
    ).toEqual(["2025-10", "2025-11", "2025-12"]);
  });

  it("dia 31 em mês curto: fevereiro (bissexto ou não) e abril caem no último dia; a comparação com a data de elaboração usa o dia real", () => {
    const r = gerarLotePrestacoes(
      { diaVencimento: 31, de: "2024-01", ate: "2024-04" },
      "2026-10-11",
      [],
    );
    expect(r.lancamentos.map((l) => l.data)).toEqual([
      "2024-01-31",
      "2024-02-29",
      "2024-03-31",
      "2024-04-30",
    ]);
    expect(
      gerarLotePrestacoes({ diaVencimento: 31, de: "2025-02", ate: "2025-02" }, "2026-10-11", [])
        .lancamentos[0]?.data,
    ).toBe("2025-02-28");
    // dia 31, elaboração em 28/02/2026: fev/2026 vence em 28/02 e conta como a última
    expect(
      competenciasDoLote({ diaVencimento: 31, mesesEmAtraso: 2 }, "2026-02-28").competencias,
    ).toEqual(["2026-01", "2026-02"]);
    // dia 31, elaboração em 27/02/2026: fev/2026 ainda não venceu
    expect(
      competenciasDoLote({ diaVencimento: 31, mesesEmAtraso: 2 }, "2026-02-27").competencias,
    ).toEqual(["2025-12", "2026-01"]);
  });

  it("intervalo de competências gera uma prestação por mês, sem valor informado, com origem lote", () => {
    const r = gerarLotePrestacoes(
      { diaVencimento: 10, de: "2026-08", ate: "2026-10" },
      "2026-10-11",
      [],
    );
    expect(r.lancamentos).toEqual([
      {
        id: "p-2026-08",
        tipo: "prestacao",
        data: "2026-08-10",
        competencia: "2026-08",
        origem: "lote",
        editado: false,
      },
      {
        id: "p-2026-09",
        tipo: "prestacao",
        data: "2026-09-10",
        competencia: "2026-09",
        origem: "lote",
        editado: false,
      },
      {
        id: "p-2026-10",
        tipo: "prestacao",
        data: "2026-10-10",
        competencia: "2026-10",
        origem: "lote",
        editado: false,
      },
    ]);
    expect(r.pulados).toEqual([]);
    expect(r.avisos).toEqual([]);
  });

  it("lotes cumulativos: competências já lançadas (de lote ou avulsas) são puladas, com aviso; um lote que se sobrepõe a outro só acrescenta as novas", () => {
    const primeiro = gerarLotePrestacoes(
      { diaVencimento: 10, de: "2026-06", ate: "2026-08" },
      "2026-10-11",
      [],
    );
    const avulsa: Lancamento = {
      id: "x",
      tipo: "prestacao",
      data: "2026-09-20",
      competencia: "2026-09",
      valorInformado: "100.00",
      origem: "avulso",
      editado: true,
    };
    const existentes = [...primeiro.lancamentos, avulsa];
    const segundo = gerarLotePrestacoes(
      { diaVencimento: 10, de: "2026-07", ate: "2026-10" },
      "2026-10-11",
      existentes,
    );
    expect(segundo.lancamentos.map((l) => l.id)).toEqual(["p-2026-10"]);
    expect(segundo.pulados).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(segundo.avisos).toEqual([
      "Meses de vencimento já lançados, não repetidos: jul/2026, ago/2026, set/2026.",
    ]);
    const terceiro = gerarLotePrestacoes(
      { diaVencimento: 10, de: "2026-06", ate: "2026-08" },
      "2026-10-11",
      existentes,
    );
    expect(terceiro.lancamentos).toEqual([]);
    expect(terceiro.avisos).toEqual([
      "Meses de vencimento já lançados, não repetidos: jun/2026, jul/2026, ago/2026.",
      "Nenhuma prestação nova: todos os meses de vencimento do lote já estavam lançados.",
    ]);
  });

  it("prestação avulsa com descrição (13º, férias) não ocupa a competência: o lote lança a prestação comum do mês (decisão de 12/10/2026)", () => {
    const decimoTerceiro: Lancamento = {
      id: "p-2025-12",
      tipo: "prestacao",
      data: "2025-12-20",
      competencia: "2025-12",
      descricao: "13º salário 2025",
      rendimento: "3000.00",
      origem: "avulso",
      editado: false,
    };
    const lote = gerarLotePrestacoes(
      { diaVencimento: 10, de: "2025-11", ate: "2025-12" },
      "2026-10-11",
      [decimoTerceiro],
    );
    expect(lote.lancamentos.map((l) => [l.id, l.competencia])).toEqual([
      ["p-2025-11", "2025-11"],
      ["p-2025-12-2", "2025-12"],
    ]);
    expect(lote.pulados).toEqual([]);
    expect(lote.avisos).toEqual([]);
    // descrição vazia ou só com espaços não conta como descrição: a competência fica ocupada
    const comum: Lancamento = { ...decimoTerceiro, id: "x", descricao: "  " };
    expect(
      gerarLotePrestacoes({ diaVencimento: 10, de: "2025-12", ate: "2025-12" }, "2026-10-11", [
        comum,
      ]).pulados,
    ).toEqual(["2025-12"]);
    // uma prestação do próprio lote que ganhou descrição no lápis continua ocupando a competência
    const doLote: Lancamento = { ...decimoTerceiro, origem: "lote", descricao: "conforme acordo" };
    expect(
      gerarLotePrestacoes({ diaVencimento: 10, de: "2025-12", ate: "2025-12" }, "2026-10-11", [
        doLote,
      ]).pulados,
    ).toEqual(["2025-12"]);
  });

  it("ids não colidem com os existentes", () => {
    const existentes: Lancamento[] = [
      {
        id: "p-2026-08",
        tipo: "prestacao",
        data: "2026-08-10",
        competencia: "2026-07",
        origem: "avulso",
        editado: true,
      },
    ];
    expect(idLivre("p-2026-08", existentes)).toBe("p-2026-08-2");
    const r = gerarLotePrestacoes(
      { diaVencimento: 10, de: "2026-08", ate: "2026-08" },
      "2026-10-11",
      existentes,
    );
    expect(r.lancamentos[0]?.id).toBe("p-2026-08-2");
  });

  it("entradas incompletas ou inválidas geram aviso e nenhuma prestação, sem erro", () => {
    expect(competenciasDoLote({ diaVencimento: 10 }, "2026-10-11")).toEqual({
      competencias: [],
      avisos: ["Informe quantos meses estão em atraso (1 ou mais) ou o intervalo de vencimentos."],
    });
    expect(
      competenciasDoLote({ diaVencimento: 10, mesesEmAtraso: 0 }, "2026-10-11").competencias,
    ).toEqual([]);
    expect(competenciasDoLote({ diaVencimento: 0, mesesEmAtraso: 2 }, "2026-10-11").avisos).toEqual(
      ["Dia do vencimento inválido (0): informe um dia de 1 a 31."],
    );
    expect(
      competenciasDoLote({ diaVencimento: 32, mesesEmAtraso: 2 }, "2026-10-11").competencias,
    ).toEqual([]);
    expect(competenciasDoLote({ diaVencimento: 10, de: "2026-08" }, "2026-10-11").avisos).toEqual([
      "Informe o mês do primeiro e do último vencimento do lote (mês/ano).",
    ]);
    expect(
      competenciasDoLote({ diaVencimento: 10, de: "2026-10", ate: "2026-08" }, "2026-10-11").avisos,
    ).toEqual(["Mês final (ago/2026) anterior ao inicial (out/2026): nenhuma prestação lançada."]);
  });
});

describe("lote de prestações: limite inferior das datas", () => {
  it("'meses em atraso' maior que a tabela de datas para em jan/1900 com aviso, sem erro", () => {
    const r = competenciasDoLote({ diaVencimento: 5, mesesEmAtraso: 100000 }, "2026-10-11");
    expect(r.competencias[0]).toBe("1900-01");
    expect(r.competencias.at(-1)).toBe("2026-10");
    expect(r.competencias).toHaveLength(1522);
    expect(r.avisos).toEqual([
      "As datas do motor começam em jan/1900: lançadas 1522 prestações em vez de 100000.",
    ]);
    expect(competenciasDoLote({ diaVencimento: 15, mesesEmAtraso: 1 }, "1900-01-10")).toEqual({
      competencias: [],
      avisos: ["Não há vencimento anterior a jan/1900 para lançar."],
    });
    expect(
      competenciasDoLote({ diaVencimento: 5, mesesEmAtraso: 1522 }, "2026-10-11").avisos,
    ).toEqual([]);
  });
});

describe("lote de pagamentos (§6.2)", () => {
  it("gera um pagamento por mês, com valor e dia, sem descrição, pulando meses que já têm pagamento", () => {
    const existente: Lancamento = {
      id: "a-2026-02",
      tipo: "amortizacao",
      data: "2026-02-20",
      descricao: "Pagamento avulso",
      valorInformado: "150.00",
      origem: "avulso",
      editado: true,
    };
    const r = gerarLoteAmortizacoes(
      { valorMensal: "300.00", diaPagamento: 31, de: "2026-01", ate: "2026-04" },
      [existente],
    );
    expect(r.lancamentos).toEqual([
      {
        id: "a-2026-01",
        tipo: "amortizacao",
        data: "2026-01-31",
        valorInformado: "300.00",
        origem: "lote",
        editado: false,
      },
      {
        id: "a-2026-03",
        tipo: "amortizacao",
        data: "2026-03-31",
        valorInformado: "300.00",
        origem: "lote",
        editado: false,
      },
      {
        id: "a-2026-04",
        tipo: "amortizacao",
        data: "2026-04-30",
        valorInformado: "300.00",
        origem: "lote",
        editado: false,
      },
    ]);
    // sem descrição (§21.8): a tabela e o relatório mostram só a data
    expect(r.lancamentos.some((l) => Object.hasOwn(l, "descricao"))).toBe(false);
    expect(r.pulados).toEqual(["2026-02"]);
    expect(r.avisos).toEqual(["Meses com pagamento já lançado, não repetidos: fev/2026."]);
  });

  it("valor inválido ou não positivo, dia inválido e intervalo invertido geram aviso e nenhum pagamento", () => {
    expect(
      gerarLoteAmortizacoes(
        { valorMensal: "1,5", diaPagamento: 10, de: "2026-01", ate: "2026-02" },
        [],
      ).avisos,
    ).toEqual([
      'Valor mensal do pagamento inválido ou não positivo ("1,5"): nenhum pagamento lançado.',
    ]);
    expect(
      gerarLoteAmortizacoes(
        { valorMensal: "0", diaPagamento: 10, de: "2026-01", ate: "2026-02" },
        [],
      ).lancamentos,
    ).toEqual([]);
    expect(
      gerarLoteAmortizacoes(
        { valorMensal: "-300.00", diaPagamento: 10, de: "2026-01", ate: "2026-02" },
        [],
      ).lancamentos,
    ).toEqual([]);
    expect(
      gerarLoteAmortizacoes(
        { valorMensal: "300.00", diaPagamento: 40, de: "2026-01", ate: "2026-02" },
        [],
      ).avisos,
    ).toEqual(["Dia do pagamento inválido (40): informe um dia de 1 a 31."]);
    expect(
      gerarLoteAmortizacoes(
        { valorMensal: "300.00", diaPagamento: 10, de: "2026-03", ate: "2026-01" },
        [],
      ).avisos,
    ).toEqual(["Mês final (jan/2026) anterior ao inicial (mar/2026): nenhum pagamento lançado."]);
    expect(
      gerarLoteAmortizacoes(
        { valorMensal: "300.00", diaPagamento: 10, de: "2026-01", ate: "2026-01" },
        [
          {
            id: "a",
            tipo: "amortizacao",
            data: "2026-01-05",
            valorInformado: "1.00",
            origem: "avulso",
            editado: true,
          },
        ],
      ).avisos,
    ).toEqual([
      "Meses com pagamento já lançado, não repetidos: jan/2026.",
      "Nenhum pagamento novo: todos os meses do lote já tinham pagamento lançado.",
    ]);
  });
});
