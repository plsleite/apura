import { describe, expect, it } from "vitest";
import { decimal } from "../compartilhado/decimal.ts";
import { formatarMoeda } from "../compartilhado/formatacao.ts";
import {
  cabecalhoDoRelatorio,
  indicadoresDoRelatorio,
  rodapeDoRelatorio,
  tabelasDoRelatorio,
  tituloDoDocumento,
  totaisDoRelatorio,
} from "./tabelas.ts";
import { metodologiaDaOpcao } from "../metodologias/padrao.ts";
import {
  calculoCompleto,
  calculoDeTeste,
  metodologiaDeTresPeriodos,
  pagamento,
  prestacao,
  resultadoDe,
} from "./testes/calculos.ts";

describe("tabelas do relatório (§18.3)", () => {
  const calculo = calculoCompleto();
  const { prestacoes, amortizacoes } = tabelasDoRelatorio(calculo, resultadoDe(calculo));

  it("prestações: vencimento, palavras, valores com o fator e o percentual de 6 casas; vincenda com “—” (fora das somas de corrigido e juros)", () => {
    expect(prestacoes.linhas).toEqual([
      {
        id: "p-2024-07-05",
        data: "05/07/2024",
        palavras: [],
        valor: "500,00",
        fator: "1,113560",
        corrigido: "556,78",
        jurosPercentual: "19,746781%",
        jurosValor: "109,95",
        atualizado: "666,73",
        computada: true,
        proporcao: expect.any(Number),
      },
      {
        id: "p-2024-10-05",
        data: "05/10/2024",
        palavras: ["valor informado"],
        valor: "600,00",
        fator: "1,098862",
        corrigido: "659,32",
        jurosPercentual: "17,134181%",
        jurosValor: "112,97",
        atualizado: "772,29",
        computada: true,
        proporcao: expect.any(Number),
      },
      {
        id: "p-2025-03-05",
        data: "05/03/2025",
        palavras: ["encargos próprios"],
        valor: "500,00",
        fator: "1,060652",
        corrigido: "530,33",
        jurosPercentual: "14,149407%",
        jurosValor: "75,04",
        atualizado: "605,37",
        computada: true,
        proporcao: expect.any(Number),
      },
      {
        id: "p-2026-11-05",
        data: "05/11/2026",
        palavras: ["vincenda"],
        valor: "500,00",
        fator: null,
        corrigido: null,
        jurosPercentual: null,
        jurosValor: null,
        atualizado: "500,00",
        computada: true,
        proporcao: expect.any(Number),
      },
    ]);
    expect(prestacoes.totais).toEqual({
      valor: "2.100,00",
      corrigido: "1.746,43",
      jurosValor: "297,96",
      atualizado: "2.544,39",
    });
  });

  it("a barra é proporcional ao maior atualizado das duas tabelas", () => {
    expect(prestacoes.linhas[1]?.proporcao).toBe(1);
    expect(prestacoes.linhas[0]?.proporcao).toBeCloseTo(666.73 / 772.29, 6);
    expect(amortizacoes.linhas[0]?.proporcao).toBeCloseTo(256.94 / 772.29, 6);
    expect(amortizacoes.linhas[1]?.proporcao).toBe(0);
  });

  it("notas das prestações: só as que ocorrem, na ordem; encargos próprios com o que difere do padrão", () => {
    expect(prestacoes.notas).toEqual([
      {
        termo: "Vincenda",
        texto:
          "vencimento posterior à data do cálculo; incluída pelo valor nominal, sem correção e sem juros (art. 323 do CPC).",
      },
      {
        termo: "Valor informado",
        texto: "valor indicado no cálculo, em vez do apurado pela base dos alimentos.",
      },
      {
        termo: "Encargos próprios",
        itens: ["05/03/2025: correção desde 10/04/2025; juros desde 01/05/2025."],
      },
    ]);
  });

  it("amortizações: “Data” com a descrição; pagamento posterior à data do cálculo “não computado”, fora dos totais", () => {
    expect(amortizacoes.linhas).toEqual([
      {
        id: "a-2024-10-10",
        data: "10/10/2024",
        descricao: "Pagamento parcial",
        palavras: [],
        valor: "200,00",
        fator: "1,097872",
        corrigido: "219,57",
        jurosPercentual: "17,020593%",
        jurosValor: "37,37",
        atualizado: "256,94",
        computada: true,
        proporcao: expect.any(Number),
      },
      {
        id: "a-2026-11-10",
        data: "10/11/2026",
        descricao: "Pagamento parcial",
        palavras: ["não computado"],
        valor: "150,00",
        fator: null,
        corrigido: null,
        jurosPercentual: null,
        jurosValor: null,
        atualizado: null,
        computada: false,
        proporcao: expect.any(Number),
      },
    ]);
    expect(amortizacoes.totais).toEqual({
      valor: "200,00",
      corrigido: "219,57",
      jurosValor: "37,37",
      atualizado: "256,94",
    });
    expect(amortizacoes.notas).toEqual([
      {
        termo: "Não computado",
        texto: "pagamento com data posterior à data do cálculo; não entra nos totais.",
      },
    ]);
  });

  it("linhas em ordem de data, mesmo fora de ordem no cálculo; descrição aparada", () => {
    const fora = calculoDeTeste({
      lancamentos: [
        prestacao("2025-12-05", { id: "p-13", origem: "avulso", descricao: " 13º salário " }),
        prestacao("2024-10-05"),
      ],
    });
    const linhas = tabelasDoRelatorio(fora, resultadoDe(fora)).prestacoes.linhas;
    expect(linhas.map((l) => [l.data, l.descricao])).toEqual([
      ["05/10/2024", undefined],
      ["05/12/2025", "13º salário"],
    ]);
  });

  it("encargos próprios: termos finais, intervalos completos, metodologia própria resumida e a descrição da linha", () => {
    const proprio = calculoDeTeste({
      lancamentos: [
        prestacao("2024-12-05", {
          encargos: {
            termoInicialCorrecao: "2025-01-10",
            termoFinalCorrecao: "2026-06-30",
            termoFinalJuros: "2026-06-30",
            metodologia: metodologiaDeTresPeriodos(),
          },
        }),
        pagamento("2025-02-10", "100.00", {
          descricao: "Depósito",
          encargos: {
            metodologia: {
              ...metodologiaDeTresPeriodos(),
              periodos: [
                {
                  de: null,
                  ate: null,
                  correcao: { indice: "INPC" },
                  juros: { tipo: "percentualMensal", taxaMensal: "1" },
                },
              ],
            },
          },
        }),
      ],
    });
    const t = tabelasDoRelatorio(proprio, resultadoDe(proprio));
    expect(t.prestacoes.notas).toEqual([
      {
        termo: "Encargos próprios",
        itens: [
          "05/12/2024: correção de 10/01/2025 a 30/06/2026; juros até 30/06/2026; até 31/12/2024, INPC e juros de 2% ao mês; de 01/01/2025 a 30/06/2025, SELIC como índice único de correção e juros; desde 01/07/2025, IPCA e juros pela taxa legal.",
        ],
      },
    ]);
    expect(t.amortizacoes.notas).toEqual([
      { termo: "Encargos próprios", itens: ["10/02/2025 (Depósito): INPC e juros de 1% ao mês."] },
    ]);
  });

  it("sem pagamentos: tabela vazia, totais zerados e sem notas", () => {
    const so = calculoDeTeste();
    const { amortizacoes: vazia } = tabelasDoRelatorio(so, resultadoDe(so));
    expect(vazia.linhas).toEqual([]);
    expect(vazia.notas).toEqual([]);
  });
});

describe("indicadores, totais, cabeçalho e rodapé (§18.3)", () => {
  it("indicadores com a linha de apoio", () => {
    const calculo = calculoCompleto();
    expect(indicadoresDoRelatorio(calculo, resultadoDe(calculo))).toEqual([
      {
        rotulo: "Prestações atualizadas",
        valor: "R$ 2.544,39",
        apoio: "4 prestações, jul/2024 a nov/2026",
      },
      { rotulo: "Amortizações atualizadas", valor: "R$ 256,94", apoio: "1 pagamento" },
      {
        rotulo: "Total devido em 11/10/2026",
        valor: "R$ 2.287,45",
        apoio: "prestações menos amortizações",
        destaque: true,
      },
      { rotulo: "Multa e honorários", valor: "R$ 457,50", apoio: "10% + 10% sobre o total devido" },
      {
        rotulo: "Total geral",
        valor: "R$ 2.744,95",
        apoio: "com multa e honorários",
        destaque: true,
      },
    ]);
  });

  it("apoio dos indicadores: uma prestação, mesmo ano, nenhum pagamento, só multa, nada", () => {
    const apoio = (mudancas: Parameters<typeof calculoDeTeste>[0]) => {
      const calculo = calculoDeTeste(mudancas);
      return indicadoresDoRelatorio(calculo, resultadoDe(calculo)).map((i) => i.apoio);
    };
    expect(
      apoio({
        lancamentos: [prestacao("2025-01-05"), prestacao("2025-12-05")],
        acrescimos: { multaPercentual: "10", honorariosPercentual: "0" },
      }),
    ).toEqual([
      "2 prestações, jan a dez/2025",
      "nenhum pagamento",
      "prestações menos amortizações",
      "10% de multa sobre o total devido",
      "com multa",
    ]);
    expect(
      apoio({
        lancamentos: [
          prestacao("2025-01-05"),
          pagamento("2025-02-10", "10.00"),
          pagamento("2025-03-10", "10.00"),
        ],
        acrescimos: { multaPercentual: "0", honorariosPercentual: "0" },
      }),
    ).toEqual([
      "1 prestação, jan/2025",
      "2 pagamentos",
      "prestações menos amortizações",
      "sem multa e sem honorários",
      "igual ao total devido",
    ]);
  });

  it("totais com multa e honorários", () => {
    const calculo = calculoCompleto();
    expect(totaisDoRelatorio(calculo, resultadoDe(calculo))).toEqual({
      titulo: "Totais em 11/10/2026",
      linhas: [
        { rotulo: "Prestações atualizadas", valor: "2.544,39" },
        { rotulo: "Amortizações atualizadas", valor: "− 256,94" },
        { rotulo: "Total devido", valor: "2.287,45" },
        { rotulo: "Multa de 10% (art. 523, §1º, do CPC)", valor: "228,75" },
        { rotulo: "Honorários de 10% (art. 523, §1º, do CPC)", valor: "228,75" },
        { rotulo: "Total geral", valor: "2.744,95", destaque: true },
      ],
      nota: null,
    });
  });

  it("total devido zero ou negativo: 0,00, a frase do saldo e nenhum valor devido nos indicadores", () => {
    const calculo = calculoDeTeste({
      lancamentos: [prestacao("2024-10-05"), pagamento("2024-10-10", "2000.00")],
      acrescimos: { multaPercentual: "0", honorariosPercentual: "10" },
    });
    const resultado = resultadoDe(calculo);
    const sobra = formatarMoeda(
      decimal(resultado.totais.amortizacoes).minus(decimal(resultado.totais.prestacoes)),
    );
    const totais = totaisDoRelatorio(calculo, resultado);
    expect(totais.linhas.map((l) => [l.rotulo, l.valor])).toEqual([
      ["Prestações atualizadas", expect.any(String)],
      ["Amortizações atualizadas", expect.stringMatching(/^− /)],
      ["Total devido", "0,00"],
      ["Honorários de 10% (art. 523, §1º, do CPC)", "0,00"],
      ["Total geral", "0,00"],
    ]);
    expect(totais.nota).toBe(
      `As amortizações atualizadas superam as prestações atualizadas em ${sobra}; não há saldo devedor.`,
    );
    const indicadores = indicadoresDoRelatorio(calculo, resultado);
    expect(indicadores[2]?.valor).toBe("R$ 0,00");
    expect(indicadores[4]?.valor).toBe("R$ 0,00");
  });

  it("cabeçalho: campos em branco somem com o rótulo", () => {
    expect(cabecalhoDoRelatorio(calculoDeTeste())).toEqual({
      orgao: "1ª Defensoria Pública de Teste",
      titulo: "Demonstrativo discriminado e atualizado do crédito · 11/10/2026",
      linhas: [
        "Processo nº 0800000-46.2026.8.12.0001",
        "Exequente: A. B. · Executado: C. D.",
        "Defensor(a): Defensor(a) de teste",
      ],
    });
    const embranco = calculoDeTeste({
      cabecalho: { defensor: " ", orgao: "", processo: "", exequente: "A. B.", executado: "" },
    });
    expect(cabecalhoDoRelatorio(embranco)).toEqual({
      orgao: null,
      titulo: "Demonstrativo discriminado e atualizado do crédito · 11/10/2026",
      linhas: ["Exequente: A. B."],
    });
  });

  it("título da aba (nome sugerido do PDF) e rodapé", () => {
    expect(tituloDoDocumento(calculoDeTeste())).toBe(
      "Apura – 0800000-46.2026.8.12.0001 – 11-10-2026",
    );
    const semProcesso = calculoDeTeste({
      cabecalho: { defensor: "", orgao: "", processo: "", exequente: "", executado: "" },
    });
    expect(tituloDoDocumento(semProcesso)).toBe("Apura – 11-10-2026");
    expect(rodapeDoRelatorio(calculoDeTeste(), "0.1.0", "2026-10-13")).toEqual({
      esquerda: "Defensoria Pública de Mato Grosso do Sul · 1ª Defensoria Pública de Teste",
      direita: "Fonte dos índices: BCB/SGS · Gerado com Apura v0.1.0 em 13/10/2026",
    });
    expect(rodapeDoRelatorio(semProcesso, "0.1.0", "2026-10-13").esquerda).toBe(
      "Defensoria Pública de Mato Grosso do Sul",
    );
  });
});

describe("encargos próprios: só o que difere da metodologia do cálculo (revisão do ensaio)", () => {
  const nota = (mudancas: Parameters<typeof calculoDeTeste>[0]) => {
    const calculo = calculoDeTeste(mudancas);
    const t = tabelasDoRelatorio(calculo, resultadoDe(calculo));
    return {
      palavras: t.prestacoes.linhas[0]?.palavras,
      itens: t.prestacoes.notas.find((n) => n.termo === "Encargos próprios")?.itens,
    };
  };

  it("mesmas regras com a correção a partir do mês seguinte: só isso", () => {
    expect(
      nota({
        lancamentos: [
          prestacao("2025-03-05", {
            encargos: {
              metodologia: {
                ...metodologiaDaOpcao("lei14905"),
                incidenciaMesInicial: "mesSeguinte",
              },
            },
          }),
        ],
      }).itens,
    ).toEqual(["05/03/2025: correção a partir do mês seguinte ao do vencimento."]);
  });

  it("deflação diferente da do cálculo, com índice negativo na conta (§19.7, item 4)", () => {
    expect(
      nota({
        lancamentos: [
          prestacao("2025-03-05", {
            encargos: {
              metodologia: { ...metodologiaDaOpcao("lei14905"), deflacao: "zerarNegativos" },
            },
          }),
        ],
      }).itens,
    ).toEqual(["05/03/2025: índices negativos desconsiderados (tomados como zero)."]);
  });

  it("só os períodos da metodologia própria que o lançamento alcançou", () => {
    expect(
      nota({
        lancamentos: [
          prestacao("2025-03-05", {
            encargos: {
              metodologia: {
                ...metodologiaDaOpcao("lei14905"),
                ajustada: true,
                periodos: [
                  {
                    de: null,
                    ate: "2024-08-29",
                    correcao: { indice: "IGP-M" },
                    juros: { tipo: "percentualMensal", taxaMensal: "1" },
                  },
                  {
                    de: "2024-08-30",
                    ate: null,
                    correcao: { indice: "INPC" },
                    juros: { tipo: "percentualMensal", taxaMensal: "1" },
                  },
                ],
              },
            },
          }),
        ],
      }).itens,
    ).toEqual(["05/03/2025: INPC e juros de 1% ao mês."]);
  });

  it("metodologia própria igual à do cálculo e sem termos: nada difere, sem palavra e sem nota", () => {
    const r = nota({
      lancamentos: [
        prestacao("2025-03-05", { encargos: { metodologia: metodologiaDaOpcao("lei14905") } }),
      ],
    });
    expect(r.palavras).toEqual([]);
    expect(r.itens).toBe(undefined);
  });

  it("sem pagamentos, “Amortizações atualizadas” sai 0,00, sem o sinal de menos", () => {
    const calculo = calculoDeTeste();
    expect(totaisDoRelatorio(calculo, resultadoDe(calculo)).linhas[1]).toEqual({
      rotulo: "Amortizações atualizadas",
      valor: "0,00",
    });
  });
});

describe("encargos próprios: só diferença no trecho alcançado (revisão final da fase 6)", () => {
  it("metodologia própria diferente só antes de 30/08/2024, prestação de 2025: sem palavra e sem nota", () => {
    const calculo = calculoDeTeste({
      lancamentos: [
        prestacao("2025-03-05", {
          encargos: {
            metodologia: {
              ...metodologiaDaOpcao("lei14905"),
              ajustada: true,
              periodos: [
                {
                  de: null,
                  ate: "2024-08-29",
                  correcao: { indice: "INPC" },
                  juros: { tipo: "percentualMensal", taxaMensal: "2" },
                },
                {
                  de: "2024-08-30",
                  ate: null,
                  correcao: { indice: "IPCA" },
                  juros: { tipo: "taxaLegal" },
                },
              ],
            },
          },
        }),
      ],
    });
    const t = tabelasDoRelatorio(calculo, resultadoDe(calculo));
    expect(t.prestacoes.linhas[0]?.palavras).toEqual([]);
    expect(t.prestacoes.notas).toEqual([]);
  });
});

describe("deflação própria só com índice negativo na conta (§19.7, item 4)", () => {
  const linha = (data: string, deflacao: "aplicarSemPiso" | "zerarNegativos") => {
    const calculo = calculoDeTeste({
      lancamentos: [
        prestacao(data, {
          encargos: { metodologia: { ...metodologiaDaOpcao("lei14905"), deflacao } },
        }),
      ],
    });
    const t = tabelasDoRelatorio(calculo, resultadoDe(calculo));
    return {
      palavras: t.prestacoes.linhas[0]?.palavras,
      itens: t.prestacoes.notas.find((n) => n.termo === "Encargos próprios")?.itens,
    };
  };

  it("sem índice negativo na conta (set/2026 e out/2026): sem palavra e sem nota", () => {
    expect(linha("2026-09-05", "aplicarSemPiso")).toEqual({ palavras: [], itens: undefined });
    expect(linha("2026-09-05", "zerarNegativos")).toEqual({ palavras: [], itens: undefined });
  });

  it("com índice negativo na conta (ago/2026, −0,32%): a deflação própria entra na nota", () => {
    expect(linha("2026-08-05", "zerarNegativos")).toEqual({
      palavras: ["encargos próprios"],
      itens: ["05/08/2026: índices negativos desconsiderados (tomados como zero)."],
    });
  });

  it("própria com piso, cálculo sem piso: só entra se o piso atuou", () => {
    const comPiso = (data: string) => {
      const calculo = calculoDeTeste({
        metodologia: { ...metodologiaDaOpcao("lei14905"), deflacao: "aplicarSemPiso" },
        lancamentos: [
          prestacao(data, {
            encargos: {
              metodologia: { ...metodologiaDaOpcao("lei14905"), deflacao: "aplicarComPiso" },
            },
          }),
        ],
      });
      return tabelasDoRelatorio(calculo, resultadoDe(calculo)).prestacoes.notas.find(
        (n) => n.termo === "Encargos próprios",
      )?.itens;
    };
    // ago/2026 (−0,32%) e set/2026 (+0,82%): o acumulado fica positivo, o piso não atua
    expect(comPiso("2026-08-05")).toBe(undefined);
  });
});

describe("deflação própria × deflação do cálculo (§19.7, item 4, revisto em 14/10/2026)", () => {
  const linhaDe = (
    data: string,
    doCalculo: "aplicarComPiso" | "aplicarSemPiso" | "zerarNegativos",
    propria: "aplicarComPiso" | "aplicarSemPiso" | "zerarNegativos",
  ) => {
    const calculo = calculoDeTeste({
      metodologia: { ...metodologiaDaOpcao("igpmJuros1"), deflacao: doCalculo },
      lancamentos: [
        prestacao(data, {
          encargos: {
            metodologia: { ...metodologiaDaOpcao("igpmJuros1"), deflacao: propria },
          },
        }),
      ],
    });
    const t = tabelasDoRelatorio(calculo, resultadoDe(calculo));
    return {
      palavras: t.prestacoes.linhas[0]?.palavras,
      itens: t.prestacoes.notas.find((n) => n.termo === "Encargos próprios")?.itens,
    };
  };

  it("cálculo “desconsiderados”, linha “com piso”: negativos na conta mudam o valor, mesmo sem o piso atuar", () => {
    expect(linhaDe("2024-01-05", "zerarNegativos", "aplicarComPiso")).toEqual({
      palavras: ["encargos próprios"],
      itens: [
        "05/01/2024: índices negativos computados, sem que o valor corrigido fique inferior ao original.",
      ],
    });
  });

  it("cálculo “com piso”, linha “sem piso”, acumulado acima do original: o piso não teria atuado, nada difere", () => {
    expect(linhaDe("2024-01-05", "aplicarComPiso", "aplicarSemPiso")).toEqual({
      palavras: [],
      itens: undefined,
    });
  });
});
