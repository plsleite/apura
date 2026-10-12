import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ArquivoSerie,
  CasoDeReferencia,
  CodigoSerie,
  Competencia,
  IndiceUsado,
  TabelaIndices,
  TextoDecimal,
  ValorIndice,
} from "../compartilhado/tipos.ts";
import { calcular } from "../motor/calcular.ts";
import textoDoCaso from "../motor/casos/2018-05-25-saj-tjms-alimentos.json?raw";
import { esperadoAte, mesesAtrasados, SERIES_EM_ORDEM_NUMERICA } from "./calendario.ts";
import { montarArquivoSerie } from "./cliente-bcb.ts";
import {
  compararIndicesUsados,
  congelarIndices,
  descreverSituacao,
  montarTabela,
} from "./congelar.ts";
import { seriesEmbutidas, tabelaEmbutida } from "./embutidos.ts";

// O app não consulta o BCB nem usa armazenamento (rotina central, decisão de 12/10/2026): a
// tabela vem só da cópia publicada. Nenhum teste deste arquivo acessa a rede nem o armazenamento
// do navegador. Por garantia, o fetch e o localStorage globais são trocados por travas que lançam
// na hora, e o afterEach confere que ninguém as chamou. Os testes que dependem da cópia embutida
// real não fixam valores (ela muda a cada atualização); os demais usam uma cópia pequena e fixa.

let travaDaRede = vi.fn();
let travaDoArmazenamento = vi.fn();

const OBTIDO_11_10 = "2026-10-11T20:11:55-03:00";
const SEIS: CodigoSerie[] = ["188", "189", "433", "1619", "4390", "29543"];

beforeEach(() => {
  travaDaRede = vi.fn(() => {
    throw new Error("Teste tentou acessar a rede pelo fetch global.");
  });
  travaDoArmazenamento = vi.fn(() => {
    throw new Error("Teste tentou usar o armazenamento do navegador.");
  });
  vi.stubGlobal("fetch", travaDaRede);
  vi.stubGlobal("localStorage", {
    getItem: travaDoArmazenamento,
    setItem: travaDoArmazenamento,
    removeItem: travaDoArmazenamento,
    clear: travaDoArmazenamento,
    key: travaDoArmazenamento,
    length: 0,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  expect(travaDaRede, "um teste chamou o fetch global (rede)").not.toHaveBeenCalled();
  expect(travaDoArmazenamento, "um teste usou o localStorage").not.toHaveBeenCalled();
});

function arquivo(
  codigo: CodigoSerie,
  pares: Array<[Competencia, TextoDecimal]>,
  obtidoEm: string = OBTIDO_11_10,
): ArquivoSerie {
  return montarArquivoSerie(
    codigo,
    pares.map(([competencia, valor]) => ({ competencia, valor })),
    obtidoEm,
  );
}

/** Cópia embutida de teste, como se publicada em 11/10/2026: dois meses por série. */
function embutidasDeTeste(obtidoEm: string = OBTIDO_11_10): Record<CodigoSerie, ArquivoSerie> {
  return {
    "188": arquivo(
      "188",
      [
        ["2026-08", "-0.21"],
        ["2026-09", "0.82"],
      ],
      obtidoEm,
    ),
    "189": arquivo(
      "189",
      [
        ["2026-08", "0.36"],
        ["2026-09", "1.57"],
      ],
      obtidoEm,
    ),
    "433": arquivo(
      "433",
      [
        ["2026-08", "-0.11"],
        ["2026-09", "0.82"],
      ],
      obtidoEm,
    ),
    "1619": arquivo(
      "1619",
      [
        ["2026-11", "1621.00"],
        ["2026-12", "1621.00"],
      ],
      obtidoEm,
    ),
    "29543": arquivo(
      "29543",
      [
        ["2026-09", "0.371228"],
        ["2026-10", "0.379020"],
      ],
      obtidoEm,
    ),
    "4390": arquivo(
      "4390",
      [
        ["2026-09", "1.17"],
        ["2026-10", "0.36"],
      ],
      obtidoEm,
    ),
  };
}

/** Valor de tabela da cópia embutida, para montar tabelas à mão nos testes de descreverSituacao. */
function embutido(valor: TextoDecimal, obtidoEm: string = OBTIDO_11_10): ValorIndice {
  return { valor, fonte: "embutida", obtidoEm };
}

/** Série de tabela com os meses dados, todos com a mesma data de obtenção. */
function serieDe(
  meses: Competencia[],
  obtidoEm: string = OBTIDO_11_10,
): Record<Competencia, ValorIndice> {
  return Object.fromEntries(meses.map((mes) => [mes, embutido("0.10", obtidoEm)]));
}

// =============================================================================================
// montarTabela
// =============================================================================================

describe("montarTabela", () => {
  it("fonte embutida, obtidoEm de cada arquivo, séries em ordem numérica, meses crescentes e esperadoAte do calendário", () => {
    const embutidas = embutidasDeTeste();
    embutidas["189"] = arquivo("189", [["2026-09", "1.57"]], "2026-10-11T21:00:00-03:00");
    // Meses fora de ordem no arquivo saem em ordem crescente na tabela.
    embutidas["433"] = arquivo("433", [
      ["2026-09", "0.82"],
      ["2026-07", "0.26"],
      ["2026-08", "-0.11"],
    ]);
    const copia = structuredClone(embutidas);
    const tabela = montarTabela(embutidas, "2026-10-11");

    expect(tabela.series["433"]).toEqual({
      "2026-07": { valor: "0.26", fonte: "embutida", obtidoEm: OBTIDO_11_10 },
      "2026-08": { valor: "-0.11", fonte: "embutida", obtidoEm: OBTIDO_11_10 },
      "2026-09": { valor: "0.82", fonte: "embutida", obtidoEm: OBTIDO_11_10 },
    });
    expect(Object.keys(tabela.series["433"] ?? {})).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(tabela.series["189"]).toEqual({
      "2026-09": { valor: "1.57", fonte: "embutida", obtidoEm: "2026-10-11T21:00:00-03:00" },
    });
    expect(tabela.series["4390"]).toEqual({
      "2026-09": { valor: "1.17", fonte: "embutida", obtidoEm: OBTIDO_11_10 },
      "2026-10": { valor: "0.36", fonte: "embutida", obtidoEm: OBTIDO_11_10 },
    });
    expect(Object.keys(tabela.series)).toEqual([...SERIES_EM_ORDEM_NUMERICA]);
    expect(Object.keys(tabela.series)).toEqual(SEIS);
    expect(tabela.consultadoEm).toBe("2026-10-11T21:00:00-03:00");
    expect(tabela.esperadoAte).toEqual({
      "188": "2026-08",
      "189": "2026-09",
      "433": "2026-08",
      "1619": "2026-12",
      "29543": "2026-10",
      "4390": "2026-10",
    });
    // Os arquivos recebidos não são alterados.
    expect(embutidas).toEqual(copia);
  });

  it("consultadoEm é o obtidoEm mais recente pelo instante, não pelo texto (arquivos em UTC e em Brasília)", () => {
    // 20:30 em Brasília = 23:30 UTC, depois de 23:11 UTC, embora "…T20" venha antes de "…T23" no texto.
    const emUtc = "2026-10-11T23:11:55.140Z";
    const embutidas = embutidasDeTeste(emUtc);
    const depois = "2026-10-11T20:30:00-03:00";
    embutidas["433"] = arquivo("433", [["2026-09", "0.82"]], depois);
    const tabela = montarTabela(embutidas, "2026-10-11");
    expect(tabela.consultadoEm).toBe(depois);
    expect(tabela.series["433"]?.["2026-09"]?.obtidoEm).toBe(depois);
    expect(tabela.series["189"]?.["2026-09"]?.obtidoEm).toBe(emUtc);

    // E o inverso: 20:00 em Brasília (23:00 UTC) é anterior a 23:11 UTC.
    embutidas["433"] = arquivo("433", [["2026-09", "0.82"]], "2026-10-11T20:00:00-03:00");
    expect(montarTabela(embutidas, "2026-10-11").consultadoEm).toBe(emUtc);
  });

  it("hoje só decide o esperadoAte: no mesmo arquivo, 14/10 e 15/10 mudam o IPCA e o INPC e nada mais", () => {
    const dia14 = montarTabela(embutidasDeTeste(), "2026-10-14");
    const dia15 = montarTabela(embutidasDeTeste(), "2026-10-15");
    expect(dia14.esperadoAte).toEqual(esperadoAte("2026-10-14"));
    expect(dia15.esperadoAte).toEqual(esperadoAte("2026-10-15"));
    expect(dia14.esperadoAte?.["433"]).toBe("2026-08");
    expect(dia15.esperadoAte?.["433"]).toBe("2026-09");
    expect(dia14.esperadoAte?.["188"]).toBe("2026-08");
    expect(dia15.esperadoAte?.["188"]).toBe("2026-09");
    expect({ ...dia14, esperadoAte: undefined }).toEqual({ ...dia15, esperadoAte: undefined });
  });

  it("arquivo guardado sob o código de outra série é ignorado, também no consultadoEm (códigos nunca se misturam)", () => {
    const embutidas = embutidasDeTeste();
    embutidas["188"] = arquivo("433", [["2026-10", "0.30"]], "2026-10-20T10:00:00-03:00");
    const tabela = montarTabela(embutidas, "2026-10-25");
    expect("188" in tabela.series).toBe(false);
    expect(tabela.series["433"]).toEqual({
      "2026-08": { valor: "-0.11", fonte: "embutida", obtidoEm: OBTIDO_11_10 },
      "2026-09": { valor: "0.82", fonte: "embutida", obtidoEm: OBTIDO_11_10 },
    });
    expect(tabela.consultadoEm).toBe(OBTIDO_11_10);
  });

  it("arquivo vazio entra como {} e a data dele conta para consultadoEm; série sem arquivo fica de fora", () => {
    const parciais: Partial<Record<CodigoSerie, ArquivoSerie>> = embutidasDeTeste();
    parciais["188"] = arquivo("188", [], "2026-10-12T08:00:00-03:00");
    delete parciais["4390"];
    const tabela = montarTabela(parciais as Record<CodigoSerie, ArquivoSerie>, "2026-10-12");
    expect(tabela.series["188"]).toEqual({});
    expect("4390" in tabela.series).toBe(false);
    expect(Object.keys(tabela.series)).toEqual(["188", "189", "433", "1619", "29543"]);
    expect(tabela.consultadoEm).toBe("2026-10-12T08:00:00-03:00");
    // O esperadoAte cobre as seis séries, com ou sem arquivo.
    expect(tabela.esperadoAte).toEqual(esperadoAte("2026-10-12"));
  });

  it("sem nenhum arquivo: nenhuma série, consultadoEm vazio e o esperadoAte do calendário", () => {
    expect(montarTabela({} as Record<CodigoSerie, ArquivoSerie>, "2026-10-11")).toEqual({
      consultadoEm: "",
      series: {},
      esperadoAte: esperadoAte("2026-10-11"),
    });
  });

  it("com a cópia embutida real: igual à tabelaEmbutida mais o esperadoAte", () => {
    expect(montarTabela(seriesEmbutidas(), "2026-10-11")).toEqual({
      ...tabelaEmbutida(),
      esperadoAte: esperadoAte("2026-10-11"),
    });
  });
});

// =============================================================================================
// descreverSituacao
// =============================================================================================

const ATUALIZADO_09_10 = "2026-10-09T14:17:00-03:00";

/** A tabela de teste atualizada em 09/10/2026 14:17 (nenhuma série atrasada em 11/10/2026). */
function tabelaDe09_10(): TabelaIndices {
  return montarTabela(embutidasDeTeste(ATUALIZADO_09_10), "2026-10-11");
}

describe("descreverSituacao", () => {
  it("em dia: rodapé com o IPCA e a data e hora da atualização em Brasília (exemplo da especificação), sem avisos", () => {
    const tabela = tabelaDe09_10();
    const copia = structuredClone(tabela);
    expect(descreverSituacao(tabela, "2026-10-11")).toEqual({
      atualizadoEm: ATUALIZADO_09_10,
      ultimoMesPorSerie: {
        "188": "2026-09",
        "189": "2026-09",
        "433": "2026-09",
        "1619": "2026-12",
        "29543": "2026-10",
        "4390": "2026-10",
      },
      atrasados: [],
      rodape:
        "Índices oficiais BCB/SGS · IPCA até set/2026 · atualizados em 09/10/2026 14:17 (horário de Brasília)",
      avisos: [],
    });
    // A tabela recebida não é alterada.
    expect(tabela).toEqual(copia);
  });

  it("atualizadoEm é o consultadoEm da tabela como veio; o rodapé converte UTC para Brasília, inclusive na virada do dia", () => {
    const tabela = { ...tabelaDe09_10(), consultadoEm: "2026-10-10T02:30:00Z" };
    const situacao = descreverSituacao(tabela, "2026-10-11");
    expect(situacao.atualizadoEm).toBe("2026-10-10T02:30:00Z");
    expect(situacao.rodape).toBe(
      "Índices oficiais BCB/SGS · IPCA até set/2026 · atualizados em 09/10/2026 23:30 (horário de Brasília)",
    );
  });

  it("sem IPCA na tabela (ausente ou vazio), o rodapé omite o trecho 'IPCA até …'", () => {
    const semIpca = tabelaDe09_10();
    delete semIpca.series["433"];
    const situacao = descreverSituacao(semIpca, "2026-10-11");
    expect(situacao.rodape).toBe(
      "Índices oficiais BCB/SGS · atualizados em 09/10/2026 14:17 (horário de Brasília)",
    );
    expect("433" in situacao.ultimoMesPorSerie).toBe(false);

    const ipcaVazio = { ...tabelaDe09_10(), series: { ...tabelaDe09_10().series, "433": {} } };
    const vazio = descreverSituacao(ipcaVazio, "2026-10-11");
    expect(vazio.rodape).toBe(
      "Índices oficiais BCB/SGS · atualizados em 09/10/2026 14:17 (horário de Brasília)",
    );
    expect("433" in vazio.ultimoMesPorSerie).toBe(false);
  });

  it("o IPCA do rodapé é o maior mês da série, mesmo com os meses fora de ordem na tabela", () => {
    const tabela: TabelaIndices = {
      consultadoEm: ATUALIZADO_09_10,
      series: { "433": serieDe(["2026-09", "2026-07", "2026-08"], ATUALIZADO_09_10) },
    };
    const situacao = descreverSituacao(tabela, "2026-10-11");
    expect(situacao.rodape).toBe(
      "Índices oficiais BCB/SGS · IPCA até set/2026 · atualizados em 09/10/2026 14:17 (horário de Brasília)",
    );
    expect(situacao.ultimoMesPorSerie).toEqual({ "433": "2026-09" });
  });

  it("tabela vazia, sem séries nem data: nada atrasado e o rodapé fica só com a fonte", () => {
    expect(descreverSituacao({ consultadoEm: "", series: {} }, "2026-10-11")).toEqual({
      atualizadoEm: "",
      ultimoMesPorSerie: {},
      atrasados: [],
      rodape: "Índices oficiais BCB/SGS",
      avisos: [],
    });
  });

  it("mês atrasado pelo calendário vira aviso com a previsão e a data dos dados (exemplo da especificação)", () => {
    const tabela: TabelaIndices = {
      consultadoEm: "2026-09-12T10:00:00-03:00",
      series: { "433": serieDe(["2026-07", "2026-08"], "2026-09-12T10:00:00-03:00") },
    };
    const situacao = descreverSituacao(tabela, "2026-10-15");
    expect(situacao).toEqual({
      atualizadoEm: "2026-09-12T10:00:00-03:00",
      ultimoMesPorSerie: { "433": "2026-08" },
      atrasados: [{ serie: "433", competencia: "2026-09", previsao: "por volta de 10/10/2026" }],
      rodape:
        "Índices oficiais BCB/SGS · IPCA até ago/2026 · atualizados em 12/09/2026 10:00 (horário de Brasília)",
      avisos: [
        "IPCA de set/2026, divulgado por volta de 10/10/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 12/09/2026.",
      ],
    });
    // Na véspera do dia 15, o IPCA de set/2026 ainda não conta como divulgado.
    const vespera = descreverSituacao(tabela, "2026-10-14");
    expect(vespera.atrasados).toEqual([]);
    expect(vespera.avisos).toEqual([]);
  });

  it("a data do aviso é a dos dados da própria série (o maior obtidoEm dela, pelo instante, em Brasília), não a da tabela", () => {
    // IPCA: jul obtido às 00:30 de 13/09 em Brasília (03:30 UTC) e ago às 02:00 UTC de 13/09
    // (23:00 de 12/09 em Brasília). Pelo texto, o de ago seria o mais recente; pelo instante, é o
    // de jul, e a data em Brasília é 13/09/2026 (não 12/09/2026).
    // SELIC: obtida às 01:30 UTC de 02/10, que em Brasília ainda é 01/10/2026.
    const tabela: TabelaIndices = {
      consultadoEm: "2026-10-25T09:00:00-03:00",
      series: {
        "433": {
          "2026-07": embutido("0.26", "2026-09-13T00:30:00-03:00"),
          "2026-08": embutido("-0.11", "2026-09-13T02:00:00Z"),
        },
        "4390": serieDe(["2026-09"], "2026-10-02T01:30:00Z"),
        "189": serieDe(["2026-09"], "2026-10-25T09:00:00-03:00"),
      },
    };
    const situacao = descreverSituacao(tabela, "2026-10-25");
    expect(situacao.avisos).toEqual([
      "IPCA de set/2026, divulgado por volta de 10/10/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 13/09/2026.",
      "SELIC de out/2026, divulgada ao longo de out/2026, como acumulado parcial fechado no início de nov/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 01/10/2026.",
    ]);
    expect(situacao.rodape).toBe(
      "Índices oficiais BCB/SGS · IPCA até ago/2026 · atualizados em 25/10/2026 09:00 (horário de Brasília)",
    );
  });

  it("série atrasada cujos dados não têm data de obtenção: o aviso usa a data da tabela", () => {
    const tabela: TabelaIndices = {
      consultadoEm: OBTIDO_11_10,
      series: { "433": serieDe(["2026-08"], "") },
    };
    expect(descreverSituacao(tabela, "2026-10-15").avisos).toEqual([
      "IPCA de set/2026, divulgado por volta de 10/10/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
    ]);
  });

  it("o salário mínimo de um ano inteiro atrasado sai numa frase só (mesma previsão para os 12 meses)", () => {
    const tabela: TabelaIndices = {
      consultadoEm: OBTIDO_11_10,
      series: { "1619": serieDe(["2026-12"]) },
    };
    const situacao = descreverSituacao(tabela, "2027-02-01");
    expect(situacao.atrasados).toHaveLength(12);
    expect(situacao.atrasados[0]).toEqual({
      serie: "1619",
      competencia: "2027-01",
      previsao: "no início de 2027, com o decreto do salário mínimo",
    });
    expect(situacao.atrasados.at(-1)?.competencia).toBe("2027-12");
    expect(situacao.avisos).toEqual([
      "Salário mínimo de jan/2027 a dez/2027, divulgado no início de 2027, com o decreto do salário mínimo, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
    ]);
  });

  it("salário mínimo: em janeiro o ano novo ainda não é cobrado; ano parcial agrupa o resto; dois anos atrasados são duas frases", () => {
    const ateDez2026: TabelaIndices = {
      consultadoEm: OBTIDO_11_10,
      series: { "1619": serieDe(["2026-12"]) },
    };
    expect(descreverSituacao(ateDez2026, "2027-01-20").avisos).toEqual([]);

    const ateMar2027: TabelaIndices = {
      consultadoEm: OBTIDO_11_10,
      series: { "1619": serieDe(["2027-01", "2027-02", "2027-03"]) },
    };
    expect(descreverSituacao(ateMar2027, "2027-02-01").avisos).toEqual([
      "Salário mínimo de abr/2027 a dez/2027, divulgado no início de 2027, com o decreto do salário mínimo, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
    ]);

    const ateDez2025: TabelaIndices = {
      consultadoEm: OBTIDO_11_10,
      series: { "1619": serieDe(["2025-12"]) },
    };
    const doisAnos = descreverSituacao(ateDez2025, "2027-02-01");
    expect(doisAnos.atrasados).toHaveLength(24);
    expect(doisAnos.avisos).toEqual([
      "Salário mínimo de jan/2026 a dez/2026, divulgado no início de 2026, com o decreto do salário mínimo, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
      "Salário mínimo de jan/2027 a dez/2027, divulgado no início de 2027, com o decreto do salário mínimo, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
    ]);
  });

  it("vários atrasos: um aviso por grupo, séries em ordem numérica, meses crescentes, SELIC e taxa legal no feminino, maiúscula no início", () => {
    // Séries de propósito fora de ordem no objeto; meses com previsões diferentes (INPC de ago e de
    // set) ficam em frases separadas.
    const tabela: TabelaIndices = {
      consultadoEm: OBTIDO_11_10,
      series: {
        "29543": serieDe(["2026-09"]),
        "4390": serieDe(["2026-09"]),
        "1619": serieDe(["2026-11"]),
        "433": serieDe(["2026-09"]),
        "189": serieDe(["2026-08"]),
        "188": serieDe(["2026-07"]),
      },
    };
    const situacao = descreverSituacao(tabela, "2026-10-20");
    expect(situacao.atrasados.map((m) => `${m.serie} ${m.competencia}`)).toEqual([
      "188 2026-08",
      "188 2026-09",
      "189 2026-09",
      "1619 2026-12",
      "4390 2026-10",
      "29543 2026-10",
    ]);
    expect(situacao.atrasados).toEqual(mesesAtrasados(tabela, "2026-10-20"));
    expect(situacao.avisos).toEqual([
      "INPC de ago/2026, divulgado por volta de 10/09/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
      "INPC de set/2026, divulgado por volta de 10/10/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
      "IGP-M de set/2026, divulgado no fim de set/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
      "Salário mínimo de dez/2026, divulgado no início de 2026, com o decreto do salário mínimo, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
      "SELIC de out/2026, divulgada ao longo de out/2026, como acumulado parcial fechado no início de nov/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
      "Taxa legal de out/2026, divulgada no 1º dia útil de out/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
    ]);
    expect(situacao.ultimoMesPorSerie).toEqual({
      "188": "2026-07",
      "189": "2026-08",
      "433": "2026-09",
      "1619": "2026-11",
      "4390": "2026-09",
      "29543": "2026-09",
    });
    expect(Object.keys(situacao.ultimoMesPorSerie)).toEqual(SEIS);
    // Os avisos ficam na caixa da tela; o rodapé não muda por causa deles.
    expect(situacao.rodape).toBe(
      "Índices oficiais BCB/SGS · IPCA até set/2026 · atualizados em 11/10/2026 20:11 (horário de Brasília)",
    );
  });

  it("série adiantada ou em dia não gera aviso; série vazia ou ausente também não", () => {
    const tabela: TabelaIndices = {
      consultadoEm: OBTIDO_11_10,
      series: {
        "433": serieDe(["2026-11"]),
        "4390": serieDe(["2026-10"]),
        "188": {},
      },
    };
    const situacao = descreverSituacao(tabela, "2026-10-20");
    expect(situacao.atrasados).toEqual([]);
    expect(situacao.avisos).toEqual([]);
    expect(situacao.ultimoMesPorSerie).toEqual({ "433": "2026-11", "4390": "2026-10" });
  });
});

// =============================================================================================
// congelarIndices
// =============================================================================================

describe("congelarIndices", () => {
  it("padrões: cópia embutida real e hoje pelo relógio de Brasília (23:30 de 14/10 em Campo Grande já é 15/10 em Brasília e muda o esperadoAte do IPCA)", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // Campo Grande (MS) fica uma hora atrás de Brasília: 23:30 de 14/10 lá é 00:30 de 15/10 aqui.
    vi.setSystemTime(new Date("2026-10-14T23:30:00-04:00"));
    // O IPCA e o INPC de set/2026 só contam como divulgados a partir de 15/10: com a data de
    // Campo Grande o esperadoAte deles seria ago/2026; com a de Brasília, set/2026.
    expect(esperadoAte("2026-10-14")["433"]).toBe("2026-08");
    expect(esperadoAte("2026-10-15")["433"]).toBe("2026-09");

    const { tabela, situacao } = congelarIndices();
    expect(tabela).toEqual({ ...tabelaEmbutida(), esperadoAte: esperadoAte("2026-10-15") });
    expect(tabela.esperadoAte?.["433"]).toBe("2026-09");
    expect(situacao).toEqual(descreverSituacao(tabela, "2026-10-15"));
    expect(situacao.atualizadoEm).toBe(tabelaEmbutida().consultadoEm);
    expect(situacao.rodape).toMatch(
      /^Índices oficiais BCB\/SGS · IPCA até [a-z]{3}\/\d{4} · atualizados em \d{2}\/\d{2}\/\d{4} \d{2}:\d{2} \(horário de Brasília\)$/,
    );
  });

  it("só as embutidas informadas: hoje pelo relógio de Brasília (23:30 de 14/10 em Brasília é 15/10 em UTC, mas ainda 14/10 aqui)", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-15T02:30:00Z"));
    const { tabela } = congelarIndices({ embutidas: embutidasDeTeste() });
    expect(tabela).toEqual(montarTabela(embutidasDeTeste(), "2026-10-14"));
    expect(tabela.esperadoAte?.["433"]).toBe("2026-08");
  });

  it("só o hoje informado: usa a cópia embutida real", () => {
    expect(congelarIndices({ hoje: "2026-10-11" }).tabela).toEqual({
      ...tabelaEmbutida(),
      esperadoAte: esperadoAte("2026-10-11"),
    });
  });

  it("embutidas pequenas e hoje informado: a tabela de montarTabela e a situação de descreverSituacao, de forma síncrona", () => {
    const resultado = congelarIndices({ embutidas: embutidasDeTeste(), hoje: "2026-11-20" });
    expect(resultado).not.toBeInstanceOf(Promise);
    const { tabela, situacao } = resultado;
    expect(tabela).toEqual(montarTabela(embutidasDeTeste(), "2026-11-20"));
    expect(situacao).toEqual(descreverSituacao(tabela, "2026-11-20"));
    expect(situacao).toEqual({
      atualizadoEm: OBTIDO_11_10,
      ultimoMesPorSerie: {
        "188": "2026-09",
        "189": "2026-09",
        "433": "2026-09",
        "1619": "2026-12",
        "29543": "2026-10",
        "4390": "2026-10",
      },
      atrasados: [
        { serie: "188", competencia: "2026-10", previsao: "por volta de 10/11/2026" },
        { serie: "189", competencia: "2026-10", previsao: "no fim de out/2026" },
        { serie: "433", competencia: "2026-10", previsao: "por volta de 10/11/2026" },
        {
          serie: "4390",
          competencia: "2026-11",
          previsao: "ao longo de nov/2026, como acumulado parcial fechado no início de dez/2026",
        },
        { serie: "29543", competencia: "2026-11", previsao: "no 1º dia útil de nov/2026" },
      ],
      rodape:
        "Índices oficiais BCB/SGS · IPCA até set/2026 · atualizados em 11/10/2026 20:11 (horário de Brasília)",
      avisos: [
        "INPC de out/2026, divulgado por volta de 10/11/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
        "IGP-M de out/2026, divulgado no fim de out/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
        "IPCA de out/2026, divulgado por volta de 10/11/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
        "SELIC de nov/2026, divulgada ao longo de nov/2026, como acumulado parcial fechado no início de dez/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
        "Taxa legal de nov/2026, divulgada no 1º dia útil de nov/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
      ],
    });
  });

  it("cada chamada monta uma tabela nova: alterar o resultado de uma não muda a seguinte", () => {
    const primeira = congelarIndices({ embutidas: embutidasDeTeste(), hoje: "2026-10-11" });
    delete primeira.tabela.series["433"];
    const serie189 = primeira.tabela.series["189"];
    if (serie189) delete serie189["2026-09"];
    const segunda = congelarIndices({ embutidas: embutidasDeTeste(), hoje: "2026-10-11" });
    expect(segunda.tabela).toEqual(montarTabela(embutidasDeTeste(), "2026-10-11"));

    const real = congelarIndices({ hoje: "2026-10-11" });
    delete real.tabela.series["433"];
    expect(congelarIndices({ hoje: "2026-10-11" }).tabela.series["433"]).toBeDefined();
  });
});

// =============================================================================================
// compararIndicesUsados
// =============================================================================================

const CONSULTA_ANTERIOR = "2026-10-11T14:02:00-03:00";
const CONSULTA_ATUAL = "2026-11-12T10:00:00-03:00";

function usado(serie: CodigoSerie, competencia: Competencia, valor: TextoDecimal): IndiceUsado {
  return { serie, competencia, valor, fonte: "embutida", obtidoEm: OBTIDO_11_10 };
}

function comparar(anteriores: IndiceUsado[], atuais: IndiceUsado[]): string[] {
  return compararIndicesUsados(
    { indicesUsados: anteriores, consultadoEm: CONSULTA_ANTERIOR },
    { indicesUsados: atuais, consultadoEm: CONSULTA_ATUAL },
  );
}

describe("compararIndicesUsados", () => {
  it("nada mudou: lista vazia (mesmo com fonte e obtidoEm diferentes, ou ordem trocada)", () => {
    const anteriores = [usado("433", "2026-09", "0.82"), usado("189", "2026-09", "1.57")];
    const atuais = [
      { ...usado("189", "2026-09", "1.57"), fonte: "aoVivo" as const, obtidoEm: CONSULTA_ATUAL },
      usado("433", "2026-09", "0.82"),
    ];
    expect(comparar(anteriores, atuais)).toEqual([]);
    expect(comparar([], [])).toEqual([]);
  });

  it("mudou: uma linha por série e mês, com o valor antigo e o novo (exemplo da especificação)", () => {
    expect(comparar([usado("189", "2026-09", "1.57")], [usado("189", "2026-09", "1.58")])).toEqual([
      "IGP-M de set/2026 mudou de 1,57% para 1,58% desde a atualização dos índices de 11/10/2026.",
    ]);
  });

  it("mudou: salário mínimo em reais, taxa legal com 6 casas, negativo com sinal; séries em ordem numérica e meses crescentes", () => {
    const anteriores = [
      usado("29543", "2026-10", "0.379020"),
      usado("1619", "2026-12", "1621.00"),
      usado("433", "2026-09", "0.82"),
      usado("433", "2026-08", "-0.11"),
    ];
    const atuais = [
      usado("433", "2026-08", "0.05"),
      usado("433", "2026-09", "0.83"),
      usado("1619", "2026-12", "1630.00"),
      usado("29543", "2026-10", "0.380000"),
    ];
    expect(comparar(anteriores, atuais)).toEqual([
      "IPCA de ago/2026 mudou de -0,11% para 0,05% desde a atualização dos índices de 11/10/2026.",
      "IPCA de set/2026 mudou de 0,82% para 0,83% desde a atualização dos índices de 11/10/2026.",
      "Salário mínimo de dez/2026 mudou de R$ 1.621,00 para R$ 1.630,00 desde a atualização dos índices de 11/10/2026.",
      "Taxa legal de out/2026 mudou de 0,379020% para 0,380000% desde a atualização dos índices de 11/10/2026.",
    ]);
  });

  it("o mesmo número escrito de outro jeito (0.8 e 0.80) não conta como mudança", () => {
    expect(comparar([usado("433", "2026-09", "0.8")], [usado("433", "2026-09", "0.80")])).toEqual(
      [],
    );
  });

  it("entraram: uma frase, agrupada por série, meses crescentes (exemplo da especificação)", () => {
    const anteriores = [usado("433", "2026-09", "0.82")];
    const atuais = [
      usado("433", "2026-11", "0.25"),
      usado("433", "2026-09", "0.82"),
      usado("433", "2026-10", "0.30"),
    ];
    expect(comparar(anteriores, atuais)).toEqual([
      "Entraram no cálculo índices obtidos depois de 11/10/2026: IPCA de out/2026 (0,30%), nov/2026 (0,25%).",
    ]);
  });

  it("entraram de várias séries: séries em ordem numérica, separadas por ponto e vírgula", () => {
    const atuais = [
      usado("4390", "2026-10", "0.58"),
      usado("433", "2026-10", "0.30"),
      usado("189", "2026-10", "0.20"),
    ];
    expect(comparar([], atuais)).toEqual([
      "Entraram no cálculo índices obtidos depois de 11/10/2026: IGP-M de out/2026 (0,20%); IPCA de out/2026 (0,30%); SELIC de out/2026 (0,58%).",
    ]);
  });

  it("saíram: uma frase com os índices que não constam mais (exemplo da especificação)", () => {
    const anteriores = [usado("189", "2018-05", "0.64"), usado("189", "2018-04", "0.57")];
    expect(comparar(anteriores, [usado("189", "2018-04", "0.57")])).toEqual([
      "Índices da atualização de 11/10/2026 que não constam mais na tabela: IGP-M de mai/2018 (0,64%).",
    ]);
  });

  it("salário mínimo novo nomeado com o último publicado que valia antes, que não sai como 'saiu' (exemplo da especificação)", () => {
    expect(
      comparar([usado("1619", "2026-12", "1621.00")], [usado("1619", "2027-01", "1700.00")]),
    ).toEqual([
      "Salário mínimo de jan/2027 (R$ 1.700,00) passou a ser usado; em 11/10/2026 valia o último publicado, dez/2026 (R$ 1.621,00).",
    ]);
  });

  it("salário mínimo: cada mês novo vira uma frase com o maior mês anterior menor que ele; os demais meses antigos saem", () => {
    const anteriores = [usado("1619", "2017-01", "937.00"), usado("1619", "2026-12", "1621.00")];
    const atuais = [usado("1619", "2027-02", "1700.00"), usado("1619", "2027-01", "1700.00")];
    expect(comparar(anteriores, atuais)).toEqual([
      "Salário mínimo de jan/2027 (R$ 1.700,00) passou a ser usado; em 11/10/2026 valia o último publicado, dez/2026 (R$ 1.621,00).",
      "Salário mínimo de fev/2027 (R$ 1.700,00) passou a ser usado; em 11/10/2026 valia o último publicado, dez/2026 (R$ 1.621,00).",
      "Índices da atualização de 11/10/2026 que não constam mais na tabela: salário mínimo de jan/2017 (R$ 937,00).",
    ]);
  });

  it("salário mínimo: o mês anterior que continua em uso não sai; mês novo sem anterior menor entra na lista comum", () => {
    expect(
      comparar(
        [usado("1619", "2026-12", "1621.00")],
        [usado("1619", "2026-12", "1621.00"), usado("1619", "2027-01", "1700.00")],
      ),
    ).toEqual([
      "Salário mínimo de jan/2027 (R$ 1.700,00) passou a ser usado; em 11/10/2026 valia o último publicado, dez/2026 (R$ 1.621,00).",
    ]);
    expect(
      comparar(
        [usado("433", "2026-09", "0.82"), usado("1619", "2027-03", "1700.00")],
        [
          usado("433", "2026-09", "0.82"),
          usado("1619", "2027-01", "1700.00"),
          usado("1619", "2027-03", "1700.00"),
        ],
      ),
    ).toEqual([
      "Entraram no cálculo índices obtidos depois de 11/10/2026: salário mínimo de jan/2027 (R$ 1.700,00).",
    ]);
  });

  it("a frase do último publicado vale só para o salário mínimo: o IPCA novo entra na lista comum", () => {
    expect(
      comparar(
        [usado("1619", "2026-09", "1621.00")],
        [usado("1619", "2026-09", "1621.00"), usado("433", "2026-10", "0.30")],
      ),
    ).toEqual([
      "Entraram no cálculo índices obtidos depois de 11/10/2026: IPCA de out/2026 (0,30%).",
    ]);
  });

  it("ordem das frases: mudou, salário mínimo, entraram, saíram", () => {
    const anteriores = [
      usado("189", "2018-05", "0.64"),
      usado("1619", "2026-12", "1621.00"),
      usado("189", "2026-09", "1.57"),
    ];
    const atuais = [
      usado("433", "2026-10", "0.30"),
      usado("1619", "2027-01", "1700.00"),
      usado("189", "2026-09", "1.58"),
    ];
    expect(comparar(anteriores, atuais)).toEqual([
      "IGP-M de set/2026 mudou de 1,57% para 1,58% desde a atualização dos índices de 11/10/2026.",
      "Salário mínimo de jan/2027 (R$ 1.700,00) passou a ser usado; em 11/10/2026 valia o último publicado, dez/2026 (R$ 1.621,00).",
      "Entraram no cálculo índices obtidos depois de 11/10/2026: IPCA de out/2026 (0,30%).",
      "Índices da atualização de 11/10/2026 que não constam mais na tabela: IGP-M de mai/2018 (0,64%).",
    ]);
  });

  it("a data da consulta anterior é a de Brasília, mesmo quando gravada em UTC", () => {
    expect(
      compararIndicesUsados(
        { indicesUsados: [usado("189", "2026-09", "1.57")], consultadoEm: "2026-10-12T02:30:00Z" },
        { indicesUsados: [usado("189", "2026-09", "1.58")], consultadoEm: CONSULTA_ATUAL },
      ),
    ).toEqual([
      "IGP-M de set/2026 mudou de 1,57% para 1,58% desde a atualização dos índices de 11/10/2026.",
    ]);
  });

  describe("com o motor (caso SAJ TJMS de 2018)", () => {
    const caso = JSON.parse(textoDoCaso) as CasoDeReferencia;
    const usados = (tabela: TabelaIndices) => {
      const resultado = calcular(caso.calculo, tabela);
      return { indicesUsados: resultado.indicesUsados, consultadoEm: resultado.consultaIndices.em };
    };

    it("calcular duas vezes com a mesma tabela: nenhuma diferença", () => {
      const primeiro = usados(caso.indices);
      expect(primeiro.indicesUsados.length).toBeGreaterThan(0);
      expect(compararIndicesUsados(primeiro, usados(caso.indices))).toEqual([]);
    });

    it("recalcular com um índice revisto: uma linha de mudança", () => {
      const revista: TabelaIndices = structuredClone(caso.indices);
      const igpm = revista.series["189"];
      const abril = igpm?.["2018-04"];
      expect(abril?.valor).toBe("0.57");
      if (igpm && abril) igpm["2018-04"] = { ...abril, valor: "0.60" };
      const frases = compararIndicesUsados(usados(caso.indices), usados(revista));
      expect(frases).toHaveLength(1);
      expect(frases[0]).toMatch(
        /^IGP-M de abr\/2018 mudou de 0,57% para 0,60% desde a atualização dos índices de /,
      );
    });
  });
});
