import { describe, expect, it } from "vitest";
import type { Calculo, FormaDaBase, Metodologia, TabelaIndices } from "../compartilhado/tipos.ts";
import { metodologiaDaOpcao } from "../metodologias/padrao.ts";
import { baseUnica } from "../motor/base.ts";
import { tabelaRegimeNovo } from "../motor/testes/regime-novo.ts";
import {
  metodologiaEFundamentos,
  paragrafoBase,
  paragrafoDeflacao,
  paragrafoEncargos,
  paragrafoFontes,
  paragrafoTermos,
} from "./metodologia.ts";
import {
  calculoDeTeste,
  metodologiaDeTresPeriodos,
  pagamento,
  prestacao,
  resultadoDe,
} from "./testes/calculos.ts";

const ENCARGOS_LEI_14905 =
  "Até 29/08/2024, IGP-M e juros de 1% ao mês, simples, pro rata die; desde 30/08/2024, IPCA (art. 389, parágrafo único, do CC) e juros pela taxa legal (art. 406, §1º, do CC; Lei 14.905/2024; Resolução CMN 5.171/2024), série 29543 do BCB, acumulada por juros simples e pro rata por dias corridos, sobre o valor corrigido.";

/** Os textos dos parágrafos de um cálculo, calculado com a tabela fixa de 2024–2026. */
function textos(calculo: Calculo, tabela?: TabelaIndices) {
  const resultado = resultadoDe(calculo, tabela);
  return {
    base: paragrafoBase(calculo, resultado),
    termos: paragrafoTermos(calculo, resultado),
    encargos: paragrafoEncargos(calculo, resultado),
    deflacao: paragrafoDeflacao(calculo, resultado),
    fontes: paragrafoFontes(calculo, resultado),
  };
}

describe("Metodologia e fundamentos (§10.4, §18.4, §18.5)", () => {
  it("cálculo completo: os parágrafos na ordem, com os títulos, e só os que têm o que dizer", () => {
    const calculo = calculoDeTeste({
      lancamentos: [
        prestacao("2024-07-05"),
        prestacao("2024-10-05"),
        pagamento("2024-10-10", "200.00"),
      ],
      observacoes: "Conforme a sentença.\nValores do acordo.",
    });
    const paragrafos = metodologiaEFundamentos(calculo, resultadoDe(calculo));
    expect(paragrafos.map((p) => p.titulo)).toEqual([
      "Base.",
      "Termos.",
      "Encargos.",
      "Amortizações.",
      "Multa e honorários.",
      "Observações.",
      "Fontes e arredondamento.",
    ]);
    expect(paragrafos.map((p) => p.texto)).toEqual([
      "Valor fixo de R$ 500,00, fixado em 01/07/2024, sem reajuste.",
      "Encargos desde o vencimento de cada prestação (mora automática, art. 397 do CC). Correção pelo índice do mês do vencimento, proporcional aos dias restantes (pro rata), e pelos meses seguintes até set/2026, último índice divulgado; juros até a data do cálculo.",
      ENCARGOS_LEI_14905,
      "Cada pagamento é atualizado pelos mesmos critérios, da data do pagamento até a data do cálculo, e abatido do total atualizado.",
      "Multa de 10% e honorários de 10% (art. 523, §1º, do CPC), cada um sobre o total devido atualizado, sem incidência dos honorários sobre a multa.",
      "Conforme a sentença.\nValores do acordo.",
      "Índices do Sistema Gerenciador de Séries Temporais do Banco Central (IGP-M, série 189; IPCA, série 433; taxa legal, série 29543), atualizados em 11/10/2026 09:00 (horário de Brasília). Arredondamento comercial: fator e percentual de juros com 6 casas, valores com 2 casas por lançamento. Mês sem índice divulgado na data da consulta, computado sem correção: IPCA de out/2026.",
    ]);
  });

  it("sem pagamento computado, sem multa e honorários e sem observações: os parágrafos somem", () => {
    const calculo = calculoDeTeste({
      lancamentos: [prestacao("2024-10-05"), pagamento("2026-11-10", "200.00")],
      acrescimos: { multaPercentual: "0", honorariosPercentual: "0" },
      observacoes: "  ",
    });
    const titulos = metodologiaEFundamentos(calculo, resultadoDe(calculo)).map((p) => p.titulo);
    expect(titulos).toEqual(["Base.", "Termos.", "Encargos.", "Fontes e arredondamento."]);
  });

  it("multa ou honorários sozinhos", () => {
    const so = (multa: string, honorarios: string) => {
      const calculo = calculoDeTeste({
        acrescimos: { multaPercentual: multa, honorariosPercentual: honorarios },
      });
      return metodologiaEFundamentos(calculo, resultadoDe(calculo)).find(
        (p) => p.titulo === "Multa e honorários.",
      )?.texto;
    };
    expect(so("10", "0")).toBe(
      "Multa de 10% (art. 523, §1º, do CPC), sobre o total devido atualizado.",
    );
    expect(so("0", "12.5")).toBe(
      "Honorários de 12,5% (art. 523, §1º, do CPC), sobre o total devido atualizado.",
    );
  });
});

describe("Base (§18.5)", () => {
  const com = (forma: FormaDaBase, lancamentos = calculoDeTeste().lancamentos) =>
    textos(calculoDeTeste({ base: baseUnica(forma), lancamentos })).base;

  it("valor fixo com reajuste pelo índice: os reajustes aplicados, com o acumulado de 4 casas", () => {
    const forma: FormaDaBase = {
      tipo: "valorFixo",
      valor: "500.00",
      dataFixacao: "2024-03-15",
      indiceReajuste: "IPCA",
      mesReajuste: 3,
    };
    expect(com(forma, [prestacao("2024-04-15"), prestacao("2026-09-15")])).toBe(
      "Valor fixo de R$ 500,00, fixado em 15/03/2024, reajustado pelo IPCA acumulado desde o reajuste anterior: em mar/2025 (IPCA de mar/2024 a fev/2025: 5,0576%) e em mar/2026 (IPCA de mar/2025 a fev/2026: 3,8125%), chegando a R$ 545,32.",
    );
    // antes do primeiro reajuste
    expect(
      com({ ...forma, dataFixacao: "2026-03-15" }, [
        prestacao("2026-04-15"),
        prestacao("2026-09-15"),
      ]),
    ).toBe(
      "Valor fixo de R$ 500,00, fixado em 15/03/2026, com reajuste anual pelo IPCA acumulado, em março; não houve reajuste até o último vencimento.",
    );
  });

  it("reajuste não aplicado por falta de índice e acumulado não positivo", () => {
    const novembro: FormaDaBase = {
      tipo: "valorFixo",
      valor: "500.00",
      dataFixacao: "2025-11-15",
      indiceReajuste: "IPCA",
      mesReajuste: 11,
    };
    const comCalendario: TabelaIndices = {
      ...tabelaRegimeNovo(),
      esperadoAte: { "433": "2026-09", "189": "2026-09", "29543": "2026-10" },
    };
    const calculo = calculoDeTeste({
      base: baseUnica(novembro),
      lancamentos: [prestacao("2025-12-15"), prestacao("2026-11-15")],
    });
    expect(textos(calculo, comCalendario).base).toBe(
      "Valor fixo de R$ 500,00, fixado em 15/11/2025, com reajuste anual pelo IPCA acumulado, em novembro; o reajuste de nov/2026 não foi aplicado (IPCA de out/2026 ainda não divulgado na data da consulta).",
    );
    const semCalendario = textos(calculo).base;
    expect(semCalendario).toContain(
      "o reajuste de nov/2026 não foi aplicado (IPCA de out/2026 não disponível na tabela de índices).",
    );
    // IGP-M de mai a ago/2025: acumulado negativo (0,9951 × 0,9833 × 0,9923 × 1,0036 = 0,974443)
    const igpm: FormaDaBase = {
      tipo: "valorFixo",
      valor: "500.00",
      dataFixacao: "2025-05-10",
      indiceReajuste: "IGP-M",
      mesReajuste: 9,
    };
    expect(com(igpm, [prestacao("2025-09-10")])).toBe(
      "Valor fixo de R$ 500,00, fixado em 10/05/2025, reajustado pelo IGP-M acumulado desde o reajuste anterior: em set/2025 (IGP-M de mai/2025 a ago/2025: −2,5557%, acumulado não positivo: valor mantido), chegando a R$ 500,00.",
    );
  });

  it("valor fixo sem reajuste e pelo salário mínimo; percentual do salário mínimo", () => {
    expect(com({ ...calculoDeTeste().base.periodos[0]!.forma })).toBe(
      "Valor fixo de R$ 500,00, fixado em 01/07/2024, sem reajuste.",
    );
    expect(
      com({
        tipo: "valorFixo",
        valor: "500.00",
        dataFixacao: "2024-03-10",
        indiceReajuste: "SM",
        mesReajuste: 3,
      }),
    ).toBe(
      "Valor fixo de R$ 500,00, fixado em 10/03/2024, reajustado na proporção do salário mínimo vigente no mês de cada vencimento (salário mínimo de mar/2024: R$ 1.412,00).",
    );
    expect(com({ tipo: "percentualSalarioMinimo", percentual: "30" })).toBe(
      "30% do salário mínimo vigente no mês de cada vencimento.",
    );
  });

  it("percentual dos rendimentos, com os meses de rendimento próprio", () => {
    const forma: FormaDaBase = {
      tipo: "percentualRendimentos",
      percentual: "30",
      rendimentoPadrao: "2000.00",
    };
    expect(
      com(forma, [
        prestacao("2025-11-05"),
        prestacao("2025-12-05", {
          id: "p-13",
          origem: "avulso",
          descricao: "13º salário",
          rendimento: "2000.00",
        }),
        prestacao("2026-01-05", {
          id: "p-ferias",
          origem: "avulso",
          descricao: "férias",
          rendimento: "2666.67",
        }),
      ]),
    ).toBe(
      "30% dos rendimentos do executado, sobre o rendimento mensal de R$ 2.000,00; nos meses com rendimento próprio, sobre ele: 05/12/2025 (13º salário), R$ 2.000,00; 05/01/2026 (férias), R$ 2.666,67.",
    );
  });

  it("base dividida em períodos: uma frase por período (§17.2), só os períodos com prestação", () => {
    const calculo = calculoDeTeste({
      base: {
        periodos: [
          {
            de: null,
            ate: "2024-12-31",
            forma: {
              tipo: "valorFixo",
              valor: "500.00",
              dataFixacao: "2024-03-10",
              indiceReajuste: "nenhum",
              mesReajuste: 3,
            },
          },
          {
            de: "2025-01-01",
            ate: "2025-12-31",
            forma: { tipo: "percentualSalarioMinimo", percentual: "30" },
          },
          {
            de: "2026-01-01",
            ate: null,
            forma: { tipo: "percentualSalarioMinimo", percentual: "" },
          },
        ],
      },
      lancamentos: [prestacao("2024-12-05"), prestacao("2025-01-05")],
    });
    expect(textos(calculo).base).toBe(
      "Até 31/12/2024, valor fixo de R$ 500,00, fixado em 10/03/2024, sem reajuste; de 01/01/2025 a 31/12/2025, 30% do salário mínimo vigente no mês de cada vencimento.",
    );
  });

  it("complementos: prestação anterior à fixação e valor informado à mão", () => {
    const calculo = calculoDeTeste({
      base: baseUnica({
        tipo: "valorFixo",
        valor: "500.00",
        dataFixacao: "2024-08-10",
        indiceReajuste: "nenhum",
        mesReajuste: 8,
      }),
      lancamentos: [
        prestacao("2024-07-05"),
        prestacao("2024-10-05", { valorInformado: "600.00", editado: true }),
      ],
    });
    expect(textos(calculo).base).toBe(
      "Valor fixo de R$ 500,00, fixado em 10/08/2024, sem reajuste. As prestações vencidas antes da fixação entram pelo valor fixado, sem reajuste. Nas prestações marcadas “valor informado”, vale o valor indicado na tabela, em vez do apurado pela base.",
    );
  });

  it("todas as prestações com valor informado: só a frase do valor informado", () => {
    const calculo = calculoDeTeste({
      lancamentos: [prestacao("2024-10-05", { valorInformado: "600.00" })],
    });
    expect(textos(calculo).base).toBe(
      "Nas prestações marcadas “valor informado”, vale o valor indicado na tabela, em vez do apurado pela base.",
    );
  });
});

describe("Termos (§18.5)", () => {
  const INICIO =
    "Encargos desde o vencimento de cada prestação (mora automática, art. 397 do CC). ";

  it("correção a partir do mês seguinte", () => {
    const metodologia: Metodologia = {
      ...metodologiaDaOpcao("lei14905"),
      incidenciaMesInicial: "mesSeguinte",
    };
    expect(textos(calculoDeTeste({ metodologia })).termos).toBe(
      `${INICIO}Correção a partir do mês seguinte ao do vencimento, pelos meses inteiros até set/2026, último índice divulgado; juros até a data do cálculo.`,
    );
  });

  it("pro rata no mês final, quando a data do cálculo é passada e o índice do mês já saiu (§7, ponto 1)", () => {
    const calculo = calculoDeTeste({
      dataElaboracao: "2026-08-15",
      lancamentos: [prestacao("2026-03-05")],
    });
    expect(textos(calculo).termos).toBe(
      `${INICIO}Correção pelo índice do mês do vencimento, proporcional aos dias restantes (pro rata), e pelos meses seguintes até jul/2026 e, no mês do cálculo, pelo índice de ago/2026 proporcional aos 15 dias decorridos; juros até a data do cálculo.`,
    );
  });

  it("lançamentos com encargos próprios: remissão às notas das tabelas", () => {
    const calculo = calculoDeTeste({
      lancamentos: [
        prestacao("2024-10-05"),
        prestacao("2024-11-05", { encargos: { termoInicialJuros: "2025-01-10" }, editado: true }),
      ],
    });
    expect(textos(calculo).termos).toBe(
      `${INICIO}Correção pelo índice do mês do vencimento, proporcional aos dias restantes (pro rata), e pelos meses seguintes até set/2026, último índice divulgado; juros até a data do cálculo. Os lançamentos marcados “encargos próprios” seguem os termos e as regras indicados nas notas das tabelas.`,
    );
  });

  it("só vincendas: sem o parágrafo", () => {
    const calculo = calculoDeTeste({ lancamentos: [prestacao("2026-11-05")] });
    expect(textos(calculo).termos).toBe(null);
    expect(textos(calculo).encargos).toBe(null);
  });
});

describe("Encargos (§18.5)", () => {
  it("Lei 14.905/2024 com lançamentos dos dois lados de 30/08/2024: o texto aprovado, na íntegra", () => {
    expect(textos(calculoDeTeste()).encargos).toBe(ENCARGOS_LEI_14905);
  });

  it("Lei 14.905/2024 com tudo desde 30/08/2024: só o trecho aplicado, sem a data", () => {
    const calculo = calculoDeTeste({
      lancamentos: [prestacao("2024-10-05"), pagamento("2025-01-10", "100.00")],
    });
    expect(textos(calculo).encargos).toBe(
      "IPCA (art. 389, parágrafo único, do CC) e juros pela taxa legal (art. 406, §1º, do CC; Lei 14.905/2024; Resolução CMN 5.171/2024), série 29543 do BCB, acumulada por juros simples e pro rata por dias corridos, sobre o valor corrigido.",
    );
  });

  it("vencimento em 30/08/2024: o IGP-M de agosto entra na correção, e o período antigo é descrito", () => {
    const calculo = calculoDeTeste({ lancamentos: [prestacao("2024-08-30")] });
    expect(textos(calculo).encargos).toBe(ENCARGOS_LEI_14905);
  });

  it("IGP-M e juros de 1% ao mês (§17.3)", () => {
    const calculo = calculoDeTeste({ metodologia: metodologiaDaOpcao("igpmJuros1") });
    expect(textos(calculo).encargos).toBe(
      "IGP-M e juros de 1% ao mês, simples, pro rata die, do vencimento até a data do cálculo, sobre o valor corrigido.",
    );
  });

  it("metodologia ajustada com três períodos, SELIC única e 2% ao mês", () => {
    const calculo = calculoDeTeste({
      metodologia: metodologiaDeTresPeriodos(),
      lancamentos: [prestacao("2024-12-05")],
    });
    expect(textos(calculo).encargos).toBe(
      "Até 31/12/2024, INPC e juros de 2% ao mês, simples, pro rata die; de 01/01/2025 a 30/06/2025, SELIC (série 4390 do BCB) como índice único de correção e juros, capitalizada mês a mês; desde 01/07/2025, IPCA (art. 389, parágrafo único, do CC) e juros pela taxa legal (art. 406, §1º, do CC; Lei 14.905/2024; Resolução CMN 5.171/2024), série 29543 do BCB, acumulada por juros simples e pro rata por dias corridos, sobre o valor corrigido.",
    );
  });

  it("SELIC única sozinha: sem “sobre o valor corrigido” e sem juros nos termos", () => {
    const metodologia: Metodologia = {
      ...metodologiaDaOpcao("lei14905"),
      ajustada: true,
      periodos: [
        { de: null, ate: null, correcao: { indice: "nenhum" }, juros: { tipo: "selicUnica" } },
      ],
    };
    const t = textos(calculoDeTeste({ metodologia }));
    expect(t.encargos).toBe(
      "SELIC (série 4390 do BCB) como índice único de correção e juros, capitalizada mês a mês, do vencimento até a data do cálculo.",
    );
    expect(t.termos).not.toContain("juros até a data do cálculo");
  });

  it("taxa com casas decimais e juros zero", () => {
    const metodologia: Metodologia = {
      ...metodologiaDaOpcao("igpmJuros1"),
      ajustada: true,
      periodos: [
        {
          de: null,
          ate: "2024-12-31",
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "0.5" },
        },
        {
          de: "2025-01-01",
          ate: null,
          correcao: { indice: "INPC" },
          juros: { tipo: "percentualMensal", taxaMensal: "0" },
        },
      ],
    };
    expect(textos(calculoDeTeste({ metodologia })).encargos).toBe(
      "Até 31/12/2024, IGP-M e juros de 0,5% ao mês, simples, pro rata die, sobre o valor corrigido; desde 01/01/2025, INPC e sem juros.",
    );
  });
});

describe("Deflação (§18.5)", () => {
  // IGP-M de mai a jul/2025 negativo: a prestação de 10/05/2025 calculada em 31/07/2025 fica com
  // fator abaixo de 1
  const comDeflacao = (deflacao: Metodologia["deflacao"]) =>
    textos(
      calculoDeTeste({
        dataElaboracao: "2025-07-31",
        metodologia: { ...metodologiaDaOpcao("igpmJuros1"), deflacao },
        lancamentos: [prestacao("2025-05-10")],
      }),
    ).deflacao;

  it("só quando um índice negativo entrou na conta (e, com piso, só se o piso atuou)", () => {
    expect(comDeflacao("aplicarComPiso")).toBe(
      "Índices negativos computados; o valor corrigido não fica inferior ao original.",
    );
    expect(comDeflacao("aplicarSemPiso")).toBe("Índices negativos computados, sem piso.");
    expect(comDeflacao("zerarNegativos")).toBe(
      "Índices negativos desconsiderados (tomados como zero).",
    );
    // índices negativos sem o piso atuar (fator final acima de 1): sem o parágrafo
    expect(textos(calculoDeTeste()).deflacao).toBe(null);
  });
});

describe("Fontes e arredondamento (§18.5)", () => {
  it("as séries usadas em ordem numérica, com nome; os meses sem índice por série", () => {
    const calculo = calculoDeTeste({
      metodologia: metodologiaDaOpcao("igpmJuros1"),
      base: baseUnica({ tipo: "percentualSalarioMinimo", percentual: "30" }),
    });
    const semSetembro = tabelaRegimeNovo({ "189": "2026-08" });
    expect(textos(calculo, semSetembro).fontes).toBe(
      "Índices do Sistema Gerenciador de Séries Temporais do Banco Central (IGP-M, série 189; salário mínimo, série 1619), atualizados em 11/10/2026 09:00 (horário de Brasília). Arredondamento comercial: fator e percentual de juros com 6 casas, valores com 2 casas por lançamento. Meses sem índice divulgado na data da consulta, computados sem correção: IGP-M de set/2026 e out/2026.",
    );
  });
});

describe("o texto acompanha o que o motor aplicou (revisão do ensaio)", () => {
  const INICIO =
    "Encargos desde o vencimento de cada prestação (mora automática, art. 397 do CC). ";
  const TAXA_LEGAL =
    "juros pela taxa legal (art. 406, §1º, do CC; Lei 14.905/2024; Resolução CMN 5.171/2024), série 29543 do BCB, acumulada por juros simples e pro rata por dias corridos";
  const umPeriodo = (periodo: Metodologia["periodos"][number]): Metodologia => ({
    ...metodologiaDaOpcao("igpmJuros1"),
    ajustada: true,
    periodos: [periodo],
  });

  it("Encargos: só os períodos que a correção (meses com fração) ou os juros de fato alcançaram", () => {
    // termos finais antes de 30/08/2024 (depósito judicial): não houve IPCA nem taxa legal
    const deposito = calculoDeTeste({
      lancamentos: [
        prestacao("2024-07-05", {
          encargos: { termoFinalCorrecao: "2024-07-31", termoFinalJuros: "2024-07-31" },
        }),
      ],
    });
    expect(textos(deposito).encargos).toBe(
      "IGP-M e juros de 1% ao mês, simples, pro rata die, sobre o valor corrigido.",
    );
    // vencimento em 31/08/2024: o IGP-M de agosto entra com fração 0/31 e os juros começam em 31/08
    const ultimoDia = calculoDeTeste({ lancamentos: [prestacao("2024-08-31")] });
    expect(textos(ultimoDia).encargos).toBe(
      `IPCA (art. 389, parágrafo único, do CC) e ${TAXA_LEGAL}, sobre o valor corrigido.`,
    );
    // correção a partir do mês seguinte e vencimento em 30/08/2024
    const seguinte = calculoDeTeste({
      metodologia: { ...metodologiaDaOpcao("lei14905"), incidenciaMesInicial: "mesSeguinte" },
      lancamentos: [prestacao("2024-08-30")],
    });
    expect(textos(seguinte).encargos).toBe(
      `IPCA (art. 389, parágrafo único, do CC) e ${TAXA_LEGAL}, sobre o valor corrigido.`,
    );
  });

  it("Encargos: “sobre o valor corrigido” logo depois do último período com juros separados", () => {
    const metodologia: Metodologia = {
      ...metodologiaDaOpcao("lei14905"),
      ajustada: true,
      periodos: [
        { de: null, ate: "2024-12-31", correcao: { indice: "IPCA" }, juros: { tipo: "taxaLegal" } },
        {
          de: "2025-01-01",
          ate: null,
          correcao: { indice: "nenhum" },
          juros: { tipo: "selicUnica" },
        },
      ],
    };
    expect(
      textos(calculoDeTeste({ metodologia, lancamentos: [prestacao("2024-12-05")] })).encargos,
    ).toBe(
      `Até 31/12/2024, IPCA e ${TAXA_LEGAL}, sobre o valor corrigido; desde 01/01/2025, SELIC (série 4390 do BCB) como índice único de correção e juros, capitalizada mês a mês.`,
    );
  });

  it("Termos: sem juros (taxa zero) não fala em juros; sem correção não fala em correção", () => {
    const semJuros = calculoDeTeste({
      metodologia: umPeriodo({
        de: null,
        ate: null,
        correcao: { indice: "INPC" },
        juros: { tipo: "percentualMensal", taxaMensal: "0" },
      }),
      lancamentos: [prestacao("2025-03-05")],
    });
    expect(textos(semJuros).termos).toBe(
      `${INICIO}Correção pelo índice do mês do vencimento, proporcional aos dias restantes (pro rata), e pelos meses seguintes até set/2026, último índice divulgado.`,
    );
    const semCorrecao = calculoDeTeste({
      metodologia: umPeriodo({
        de: null,
        ate: null,
        correcao: { indice: "nenhum" },
        juros: { tipo: "percentualMensal", taxaMensal: "1" },
      }),
      lancamentos: [prestacao("2025-03-05")],
    });
    expect(textos(semCorrecao).termos).toBe(`${INICIO}Juros até a data do cálculo.`);
  });

  it("Termos: só pagamentos atualizados (prestações vincendas) falam da data do pagamento", () => {
    const calculo = calculoDeTeste({
      lancamentos: [prestacao("2026-11-05"), pagamento("2025-01-10", "100.00")],
    });
    expect(textos(calculo).termos).toBe(
      "Correção pelo índice do mês do pagamento, proporcional aos dias restantes (pro rata), e pelos meses seguintes até set/2026, último índice divulgado; juros até a data do cálculo.",
    );
  });

  it("Termos com SELIC única: o mês do cálculo entra pelo valor parcial já divulgado", () => {
    const calculo = calculoDeTeste({
      metodologia: umPeriodo({
        de: null,
        ate: null,
        correcao: { indice: "nenhum" },
        juros: { tipo: "selicUnica" },
      }),
      lancamentos: [prestacao("2025-01-05")],
    });
    expect(textos(calculo).termos).toBe(
      `${INICIO}Correção pelo índice do mês do vencimento, proporcional aos dias restantes (pro rata), e pelos meses seguintes até out/2026 (no mês do cálculo, o valor parcial já divulgado).`,
    );
  });

  it("Base: vários meses faltantes no plural; mês do reajuste inválido fica “sem reajuste”, como o motor", () => {
    const forma: FormaDaBase = {
      tipo: "valorFixo",
      valor: "500.00",
      dataFixacao: "2024-03-15",
      indiceReajuste: "IPCA",
      mesReajuste: 3,
    };
    const tabela = tabelaRegimeNovo();
    delete tabela.series["433"]?.["2025-05"];
    delete tabela.series["433"]?.["2025-06"];
    const faltando = calculoDeTeste({
      base: baseUnica(forma),
      lancamentos: [prestacao("2026-09-05")],
    });
    expect(textos(faltando, tabela).base).toContain(
      "o reajuste de mar/2026 não foi aplicado (IPCA de mai/2025 e jun/2025 não disponíveis na tabela de índices).",
    );
    const invalido = calculoDeTeste({
      base: baseUnica({ ...forma, mesReajuste: 13 }),
      lancamentos: [prestacao("2025-04-05")],
    });
    expect(textos(invalido).base).toBe(
      "Valor fixo de R$ 500,00, fixado em 15/03/2024, sem reajuste.",
    );
  });
});

describe("revisão final da fase 6", () => {
  it("cálculo no último dia do mês, com o IPCA do mês já publicado: “último índice divulgado”, não o valor parcial (só da SELIC)", () => {
    const calculo = calculoDeTeste({
      dataElaboracao: "2026-09-30",
      lancamentos: [prestacao("2026-03-05")],
    });
    expect(textos(calculo).termos).toBe(
      "Encargos desde o vencimento de cada prestação (mora automática, art. 397 do CC). Correção pelo índice do mês do vencimento, proporcional aos dias restantes (pro rata), e pelos meses seguintes até set/2026, último índice divulgado; juros até a data do cálculo.",
    );
  });

  it("metodologia própria diferente só num período que o lançamento não alcança: o lançamento segue a regra comum", () => {
    const propria: Metodologia = {
      ...metodologiaDaOpcao("lei14905"),
      ajustada: true,
      periodos: [
        {
          de: null,
          ate: "2024-08-29",
          correcao: { indice: "INPC" },
          juros: { tipo: "percentualMensal", taxaMensal: "2" },
        },
        { de: "2024-08-30", ate: null, correcao: { indice: "IPCA" }, juros: { tipo: "taxaLegal" } },
      ],
    };
    const calculo = calculoDeTeste({
      lancamentos: [prestacao("2025-03-05", { encargos: { metodologia: propria } })],
    });
    const t = textos(calculo);
    expect(t.termos).not.toContain("encargos próprios");
    expect(t.encargos).toBe(
      "IPCA (art. 389, parágrafo único, do CC) e juros pela taxa legal (art. 406, §1º, do CC; Lei 14.905/2024; Resolução CMN 5.171/2024), série 29543 do BCB, acumulada por juros simples e pro rata por dias corridos, sobre o valor corrigido.",
    );
  });
});

describe("acertos da fase 7 (§19.7)", () => {
  it("1. todas as prestações com termo inicial próprio: sem a frase da mora, só a remissão às notas", () => {
    const desde2025 = { termoInicialCorrecao: "2025-01-10", termoInicialJuros: "2025-01-10" };
    const calculo = calculoDeTeste({
      lancamentos: [
        prestacao("2024-07-05", { encargos: desde2025 }),
        prestacao("2024-10-05", { encargos: desde2025 }),
      ],
    });
    expect(textos(calculo).termos).toBe(
      "Os lançamentos marcados “encargos próprios” seguem os termos e as regras indicados nas notas das tabelas.",
    );
  });

  it("1. a mora continua quando alguma prestação começa no vencimento, ou só tem termo final ou metodologia própria", () => {
    const mora = "Encargos desde o vencimento de cada prestação (mora automática, art. 397 do CC).";
    const umaComum = calculoDeTeste({
      lancamentos: [
        prestacao("2024-07-05", { encargos: { termoInicialJuros: "2025-01-10" } }),
        prestacao("2024-10-05"),
      ],
    });
    expect(textos(umaComum).termos?.startsWith(mora)).toBe(true);
    const soTermoFinal = calculoDeTeste({
      lancamentos: [prestacao("2024-07-05", { encargos: { termoFinalJuros: "2025-12-31" } })],
    });
    expect(textos(soTermoFinal).termos?.startsWith(mora)).toBe(true);
    const soMetodologia = calculoDeTeste({
      lancamentos: [
        prestacao("2025-03-05", {
          encargos: { metodologia: metodologiaDaOpcao("igpmJuros1") },
        }),
      ],
    });
    expect(textos(soMetodologia).termos?.startsWith(mora)).toBe(true);
  });

  it("2. metodologia de um período só, só pagamentos atualizados: “da data do pagamento até a data do cálculo”", () => {
    const calculo = calculoDeTeste({
      metodologia: metodologiaDaOpcao("igpmJuros1"),
      lancamentos: [prestacao("2026-11-05"), pagamento("2025-03-10", "200.00")],
    });
    expect(textos(calculo).encargos).toBe(
      "IGP-M e juros de 1% ao mês, simples, pro rata die, da data do pagamento até a data do cálculo, sobre o valor corrigido.",
    );
  });

  it("3. nenhum mês com índice divulgado: sem a frase da correção; “Fontes” diz o mês", () => {
    const calculo = calculoDeTeste({ lancamentos: [prestacao("2026-10-05")] });
    const t = textos(calculo);
    expect(t.termos).toBe(
      "Encargos desde o vencimento de cada prestação (mora automática, art. 397 do CC). Juros até a data do cálculo.",
    );
    expect(t.fontes).toContain(
      "Mês sem índice divulgado na data da consulta, computado sem correção: IPCA de out/2026.",
    );
  });
});

describe("revisão do ensaio da fase 7 (§19.7, itens 2 e 4, revistos em 14/10/2026)", () => {
  const desde2025 = { termoInicialCorrecao: "2025-01-10", termoInicialJuros: "2025-01-10" };

  it("Encargos de um período só, nenhuma prestação começando no vencimento: sem o trecho das datas", () => {
    const soComTermos = calculoDeTeste({
      metodologia: metodologiaDaOpcao("igpmJuros1"),
      lancamentos: [
        prestacao("2024-07-05", { encargos: desde2025 }),
        prestacao("2024-10-05", { encargos: desde2025 }),
      ],
    });
    expect(textos(soComTermos).encargos).toBe(
      "IGP-M e juros de 1% ao mês, simples, pro rata die, sobre o valor corrigido.",
    );
    const comPagamento = calculoDeTeste({
      metodologia: metodologiaDaOpcao("igpmJuros1"),
      lancamentos: [
        prestacao("2024-07-05", { encargos: desde2025 }),
        pagamento("2025-03-10", "200.00"),
      ],
    });
    expect(textos(comPagamento).encargos).toBe(
      "IGP-M e juros de 1% ao mês, simples, pro rata die, sobre o valor corrigido.",
    );
  });

  it("Encargos de um período só: uma prestação começando no vencimento basta para “do vencimento”", () => {
    const calculo = calculoDeTeste({
      metodologia: metodologiaDaOpcao("igpmJuros1"),
      lancamentos: [prestacao("2024-07-05", { encargos: desde2025 }), prestacao("2024-10-05")],
    });
    expect(textos(calculo).encargos).toBe(
      "IGP-M e juros de 1% ao mês, simples, pro rata die, do vencimento até a data do cálculo, sobre o valor corrigido.",
    );
  });
});

describe("segunda revisão do ensaio da fase 7 (§19.7, itens 2 e 4)", () => {
  const igpm = metodologiaDaOpcao("igpmJuros1");

  it("Deflação: linha cuja deflação própria não mudou a conta conta pela regra do cálculo", () => {
    // cálculo "com piso"; a de 05/01/2024 é "sem piso" com o acumulado acima do original (nada
    // difere); a de 05/06/2026 segue a regra do cálculo, e o piso atuou
    const semPisoInocua = calculoDeTeste({
      metodologia: igpm,
      lancamentos: [
        prestacao("2024-01-05", {
          encargos: { metodologia: { ...igpm, deflacao: "aplicarSemPiso" } },
        }),
        prestacao("2026-06-05"),
      ],
    });
    expect(textos(semPisoInocua).deflacao).toBe(
      "Índices negativos computados; o valor corrigido não fica inferior ao original.",
    );
    // cálculo "sem piso"; a única linha é "com piso", e o piso não atuou: vale a regra do cálculo
    const comPisoInocua = calculoDeTeste({
      metodologia: { ...igpm, deflacao: "aplicarSemPiso" },
      lancamentos: [
        prestacao("2024-01-05", {
          encargos: { metodologia: { ...igpm, deflacao: "aplicarComPiso" } },
        }),
      ],
    });
    expect(textos(comPisoInocua).deflacao).toBe("Índices negativos computados, sem piso.");
  });

  it("Encargos de um período só: pagamento com termo inicial próprio não começa na data do pagamento", () => {
    const calculo = calculoDeTeste({
      metodologia: igpm,
      lancamentos: [
        prestacao("2026-11-05"),
        pagamento("2025-03-10", "200.00", {
          encargos: { termoInicialCorrecao: "2025-06-01", termoInicialJuros: "2025-06-01" },
        }),
      ],
    });
    expect(textos(calculo).encargos).toBe(
      "IGP-M e juros de 1% ao mês, simples, pro rata die, sobre o valor corrigido.",
    );
  });
});
