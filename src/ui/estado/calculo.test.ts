import { describe, expect, it } from "vitest";
import type { Lancamento } from "../../compartilhado/tipos.ts";
import { descreverSituacao } from "../../indices/congelar.ts";
import { metodologiaDaOpcao, metodologiaPadrao } from "../../metodologias/padrao.ts";
import { baseUnica } from "../../motor/base.ts";
import { tabelaRegimeNovo } from "../../motor/testes/regime-novo.ts";
import { estadoInicial, novoCalculo, reduzir, type Estado } from "./calculo.ts";

const HOJE = "2026-10-11";
const AGORA = "2026-10-11T15:00:00-03:00";
const DEPOIS = "2026-10-11T15:05:00-03:00";

function indices() {
  const tabela = tabelaRegimeNovo();
  return { tabela, situacao: descreverSituacao(tabela, HOJE) };
}

function estadoNovo(): Estado {
  return estadoInicial(novoCalculo({ id: "c-1", agora: AGORA, hoje: HOJE }), indices());
}

describe("novoCalculo", () => {
  it("nasce com a metodologia escolhida como padrão nas preferências (§17.3)", () => {
    expect(novoCalculo({ id: "c", agora: AGORA, hoje: HOJE }).metodologia).toEqual(
      metodologiaPadrao(),
    );
    expect(
      novoCalculo({ id: "c", agora: AGORA, hoje: HOJE, metodologia: "igpmJuros1" }).metodologia,
    ).toEqual(metodologiaDaOpcao("igpmJuros1"));
  });

  it("nasce em branco, com a data de hoje, valor fixo sem reajuste fixado hoje e a metodologia padrão", () => {
    const calculo = novoCalculo({
      id: "c-1",
      agora: AGORA,
      hoje: HOJE,
      cabecalho: { defensor: "Defensor(a) de teste", orgao: "Órgão de teste" },
    });
    expect(calculo).toMatchObject({
      formato: "apura/calculo@1",
      tipo: "alimentos",
      id: "c-1",
      criadoEm: AGORA,
      atualizadoEm: AGORA,
      dataElaboracao: HOJE,
      cabecalho: {
        defensor: "Defensor(a) de teste",
        orgao: "Órgão de teste",
        processo: "",
        exequente: "",
        executado: "",
      },
      base: {
        periodos: [
          {
            de: null,
            ate: null,
            forma: {
              tipo: "valorFixo",
              valor: "",
              dataFixacao: HOJE,
              indiceReajuste: "nenhum",
              mesReajuste: 10,
            },
          },
        ],
      },
      lotes: {},
      lancamentos: [],
      // multa e honorários do art. 523, §1º, do CPC: 10% cada por padrão (decisão de 13/10/2026)
      acrescimos: { multaPercentual: "10", honorariosPercentual: "10" },
      observacoes: "",
    });
    expect(calculo.metodologia).toEqual(metodologiaPadrao());
  });
});

describe("reduzir: campos simples", () => {
  it("altera cabeçalho, base, data de elaboração, acréscimos, observações e metodologia, marcando atualizadoEm", () => {
    const inicial = estadoNovo();
    let estado = reduzir(inicial, {
      tipo: "cabecalho",
      campo: "processo",
      valor: "0800001-11",
      em: DEPOIS,
    });
    expect(estado.calculo.cabecalho.processo).toBe("0800001-11");
    expect(estado.calculo.atualizadoEm).toBe(DEPOIS);
    expect(inicial.tocado).toBe(false);
    expect(estado.tocado).toBe(true);
    estado = reduzir(estado, {
      tipo: "base",
      base: baseUnica({ tipo: "percentualSalarioMinimo", percentual: "30" }),
      em: DEPOIS,
    });
    expect(estado.calculo.base).toEqual(
      baseUnica({ tipo: "percentualSalarioMinimo", percentual: "30" }),
    );
    estado = reduzir(estado, { tipo: "dataElaboracao", data: "2026-09-30", em: DEPOIS });
    expect(estado.calculo.dataElaboracao).toBe("2026-09-30");
    estado = reduzir(estado, {
      tipo: "acrescimos",
      campo: "multaPercentual",
      valor: "0",
      em: DEPOIS,
    });
    expect(estado.calculo.acrescimos).toEqual({ multaPercentual: "0", honorariosPercentual: "10" });
    estado = reduzir(estado, { tipo: "observacoes", texto: "Conforme a sentença.", em: DEPOIS });
    expect(estado.calculo.observacoes).toBe("Conforme a sentença.");
    const ajustada = {
      ...metodologiaPadrao(),
      ajustada: true,
      deflacao: "zerarNegativos" as const,
    };
    estado = reduzir(estado, { tipo: "metodologia", metodologia: ajustada, em: DEPOIS });
    expect(estado.calculo.metodologia).toEqual(ajustada);
    // a tabela e a situação dos índices não mudam com edições (§8.2)
    expect(estado.tabela).toBe(inicial.tabela);
    expect(estado.situacao).toBe(inicial.situacao);
    expect(estado.calculo.criadoEm).toBe(AGORA);
  });
});

describe("reduzir: lotes cumulativos e lançamentos", () => {
  it("lança prestações em lote, guarda o lote, ordena por data e acumula sem repetir, com os avisos do lote", () => {
    let estado = reduzir(estadoNovo(), {
      tipo: "lancarPrestacoes",
      lote: { diaVencimento: 5, de: "2026-08", ate: "2026-09" },
      em: DEPOIS,
    });
    expect(estado.calculo.lancamentos.map((l) => l.id)).toEqual(["p-2026-08", "p-2026-09"]);
    // os ids das linhas recém-lançadas, para a tela rolar até elas (§20.3)
    expect(estado.idsDoLote).toEqual(["p-2026-08", "p-2026-09"]);
    expect(estado.calculo.lotes.ultimoLotePrestacoes).toEqual({
      diaVencimento: 5,
      de: "2026-08",
      ate: "2026-09",
    });
    expect(estado.avisosDoLote).toEqual([]);
    estado = reduzir(estado, {
      tipo: "lancarPrestacoes",
      lote: { diaVencimento: 5, de: "2026-06", ate: "2026-08" },
      em: DEPOIS,
    });
    expect(estado.calculo.lancamentos.map((l) => l.id)).toEqual([
      "p-2026-06",
      "p-2026-07",
      "p-2026-08",
      "p-2026-09",
    ]);
    expect(estado.avisosDoLote).toEqual([
      "Meses de vencimento já lançados, não repetidos: ago/2026.",
    ]);
    expect(estado.loteRecente).toBe("prestacoes");
    // só as novas, não as já lançadas
    expect(estado.idsDoLote).toEqual(["p-2026-06", "p-2026-07"]);
    expect(estado.calculo.lancamentos.every((l) => l.valorInformado === undefined)).toBe(true);
  });

  it("lança pagamentos em lote e guarda o lote", () => {
    const estado = reduzir(estadoNovo(), {
      tipo: "lancarPagamentos",
      lote: { valorMensal: "400.00", diaPagamento: 5, de: "2026-08", ate: "2026-09" },
      em: DEPOIS,
    });
    expect(estado.calculo.lancamentos.map((l) => [l.id, l.valorInformado, l.descricao])).toEqual([
      ["a-2026-08", "400.00", "Pagamento parcial"],
      ["a-2026-09", "400.00", "Pagamento parcial"],
    ]);
    expect(estado.calculo.lotes.ultimoLoteAmortizacoes?.valorMensal).toBe("400.00");
    expect(estado.avisosDoLote).toEqual([]);
    expect(estado.loteRecente).toBe("pagamentos");
    expect(estado.idsDoLote).toEqual(["a-2026-08", "a-2026-09"]);
  });

  it("inclui avulsos com id livre e origem 'avulso', intercalados na ordem cronológica", () => {
    let estado = reduzir(estadoNovo(), {
      tipo: "lancarPrestacoes",
      lote: { diaVencimento: 5, de: "2026-08", ate: "2026-09" },
      em: DEPOIS,
    });
    estado = reduzir(estado, {
      tipo: "incluirLancamento",
      lancamento: {
        tipo: "prestacao",
        data: "2026-08-20",
        competencia: "2026-08",
        descricao: "13º salário",
        rendimento: "3000.00",
      },
      em: DEPOIS,
    });
    estado = reduzir(estado, {
      tipo: "incluirLancamento",
      lancamento: { tipo: "amortizacao", data: "2026-08-10", valorInformado: "150.00" },
      em: DEPOIS,
    });
    expect(estado.calculo.lancamentos.map((l) => l.id)).toEqual([
      "p-2026-08",
      "a-2026-08",
      "p-2026-08-2",
      "p-2026-09",
    ]);
    const avulsa = estado.calculo.lancamentos.find((l) => l.id === "p-2026-08-2");
    expect(avulsa).toMatchObject({ origem: "avulso", editado: false, descricao: "13º salário" });
  });

  it("editar marca 'editado', apaga campos com undefined, e relançar o lote não sobrescreve a edição", () => {
    let estado = reduzir(estadoNovo(), {
      tipo: "lancarPrestacoes",
      lote: { diaVencimento: 5, de: "2026-08", ate: "2026-09" },
      em: DEPOIS,
    });
    estado = reduzir(estado, {
      tipo: "editarLancamento",
      id: "p-2026-08",
      mudancas: { valorInformado: "999.00", data: "2026-08-07" },
      em: DEPOIS,
    });
    let editada = estado.calculo.lancamentos.find((l) => l.id === "p-2026-08") as Lancamento;
    expect(editada).toMatchObject({ valorInformado: "999.00", data: "2026-08-07", editado: true });
    estado = reduzir(estado, {
      tipo: "lancarPrestacoes",
      lote: { diaVencimento: 5, de: "2026-07", ate: "2026-09" },
      em: DEPOIS,
    });
    editada = estado.calculo.lancamentos.find((l) => l.id === "p-2026-08") as Lancamento;
    expect(editada).toMatchObject({ valorInformado: "999.00", data: "2026-08-07", editado: true });
    expect(estado.avisosDoLote).toEqual([
      "Meses de vencimento já lançados, não repetidos: ago/2026, set/2026.",
    ]);
    estado = reduzir(estado, {
      tipo: "editarLancamento",
      id: "p-2026-08",
      mudancas: { valorInformado: undefined },
      em: DEPOIS,
    });
    editada = estado.calculo.lancamentos.find((l) => l.id === "p-2026-08") as Lancamento;
    expect("valorInformado" in editada).toBe(false);
    expect(editada.editado).toBe(true);
  });

  it("a competência acompanha o vencimento: ao incluir e ao mudar a data de uma prestação (decisão de 13/10/2026)", () => {
    let estado = reduzir(estadoNovo(), {
      tipo: "incluirLancamento",
      lancamento: { tipo: "prestacao", data: "2026-08-25" },
      em: DEPOIS,
    });
    expect(estado.calculo.lancamentos[0]).toMatchObject({
      id: "p-2026-08",
      competencia: "2026-08",
    });
    estado = reduzir(estado, {
      tipo: "editarLancamento",
      id: "p-2026-08",
      mudancas: { data: "2026-09-05" },
      em: DEPOIS,
    });
    expect(estado.calculo.lancamentos[0]).toMatchObject({
      id: "p-2026-08",
      data: "2026-09-05",
      competencia: "2026-09",
      editado: true,
    });
    // o lote passa a considerar setembro ocupado e lança agosto
    estado = reduzir(estado, {
      tipo: "lancarPrestacoes",
      lote: { diaVencimento: 5, de: "2026-08", ate: "2026-09" },
      em: DEPOIS,
    });
    expect(estado.calculo.lancamentos.map((l) => l.competencia)).toEqual(["2026-08", "2026-09"]);
    expect(estado.avisosDoLote).toEqual([
      "Meses de vencimento já lançados, não repetidos: set/2026.",
    ]);
    // pagamento não tem competência
    estado = reduzir(estado, {
      tipo: "incluirLancamento",
      lancamento: { tipo: "amortizacao", data: "2026-09-10", valorInformado: "100.00" },
      em: DEPOIS,
    });
    expect(
      "competencia" in (estado.calculo.lancamentos.find((l) => l.id === "a-2026-09") ?? {}),
    ).toBe(false);
  });

  it("aplicar o rendimento daqui em diante divide a base no vencimento da linha (§17.2): as linhas seguem a regra, sem a marca de ajustada", () => {
    let estado = reduzir(estadoNovo(), {
      tipo: "base",
      base: baseUnica({
        tipo: "percentualRendimentos",
        percentual: "30",
        rendimentoPadrao: "2000.00",
      }),
      em: DEPOIS,
    });
    estado = reduzir(estado, {
      tipo: "lancarPrestacoes",
      lote: { diaVencimento: 5, de: "2026-07", ate: "2026-09" },
      em: DEPOIS,
    });
    estado = reduzir(estado, {
      tipo: "incluirLancamento",
      lancamento: {
        tipo: "prestacao",
        data: "2026-09-20",
        descricao: "13º salário",
        rendimento: "3000.00",
      },
      em: DEPOIS,
    });
    // a linha de onde se aplica tinha um rendimento próprio digitado antes
    estado = reduzir(estado, {
      tipo: "editarLancamento",
      id: "p-2026-08",
      mudancas: { rendimento: "2400.00" },
      em: DEPOIS,
    });
    estado = reduzir(estado, {
      tipo: "aplicarRendimentoDaquiEmDiante",
      id: "p-2026-08",
      rendimento: "2500.00",
      em: DEPOIS,
    });
    expect(estado.calculo.base).toEqual({
      periodos: [
        {
          de: null,
          ate: "2026-08-04",
          forma: { tipo: "percentualRendimentos", percentual: "30", rendimentoPadrao: "2000.00" },
        },
        {
          de: "2026-08-05",
          ate: null,
          forma: { tipo: "percentualRendimentos", percentual: "30", rendimentoPadrao: "2500.00" },
        },
      ],
    });
    // a linha de onde se aplicou perde o rendimento próprio; as outras ficam como estão
    expect(
      estado.calculo.lancamentos.map((l) => [l.data, l.rendimento ?? null, l.editado]),
    ).toEqual([
      ["2026-07-05", null, false],
      ["2026-08-05", null, true],
      ["2026-09-05", null, false],
      ["2026-09-20", "3000.00", false],
    ]);
    expect(estado.calculo.atualizadoEm).toBe(DEPOIS);
    // linha inexistente ou período de outra forma: nada muda
    expect(
      reduzir(estado, {
        tipo: "aplicarRendimentoDaquiEmDiante",
        id: "x",
        rendimento: "1",
        em: DEPOIS,
      }),
    ).toBe(estado);
    const fixo = reduzir(estadoNovo(), {
      tipo: "lancarPrestacoes",
      lote: { diaVencimento: 5, de: "2026-07", ate: "2026-07" },
      em: DEPOIS,
    });
    expect(
      reduzir(fixo, {
        tipo: "aplicarRendimentoDaquiEmDiante",
        id: "p-2026-07",
        rendimento: "1",
        em: DEPOIS,
      }),
    ).toBe(fixo);
  });

  it("exclui pelo id", () => {
    let estado = reduzir(estadoNovo(), {
      tipo: "lancarPrestacoes",
      lote: { diaVencimento: 5, de: "2026-08", ate: "2026-09" },
      em: DEPOIS,
    });
    estado = reduzir(estado, { tipo: "excluirLancamento", id: "p-2026-08", em: DEPOIS });
    expect(estado.calculo.lancamentos.map((l) => l.id)).toEqual(["p-2026-09"]);
  });
});

describe("reduzir: novo e abrir", () => {
  it("'novo' troca o cálculo e os índices e limpa os avisos; 'abrir' guarda os avisos da abertura", () => {
    let estado = reduzir(estadoNovo(), {
      tipo: "lancarPrestacoes",
      lote: { diaVencimento: 5, de: "2026-06", ate: "2026-06" },
      em: DEPOIS,
    });
    estado = reduzir(estado, {
      tipo: "lancarPrestacoes",
      lote: { diaVencimento: 5, de: "2026-06", ate: "2026-06" },
      em: DEPOIS,
    });
    expect(estado.avisosDoLote).toHaveLength(2);
    const outros = indices();
    const novo = novoCalculo({ id: "c-2", agora: DEPOIS, hoje: HOJE });
    estado = reduzir(estado, { tipo: "novo", calculo: novo, ...outros });
    expect(estado).toEqual({
      calculo: novo,
      tabela: outros.tabela,
      situacao: outros.situacao,
      avisosDoLote: [],
      loteRecente: null,
      idsDoLote: [],
      avisosDaAbertura: [],
      tocado: false,
    });
    estado = reduzir(estado, {
      tipo: "abrir",
      calculo: novo,
      ...outros,
      avisos: [
        "IPCA de set/2026 mudou de 0,80% para 0,82% desde a atualização dos índices de 11/10/2026.",
      ],
    });
    expect(estado.avisosDaAbertura).toHaveLength(1);
    expect(estado.avisosDoLote).toEqual([]);
    expect(estado.idsDoLote).toEqual([]);
    expect(estado.tocado).toBe(false);
  });
});
