import { describe, expect, it, vi } from "vitest";
import type { CodigoSerie } from "../compartilhado/tipos.ts";
import { atualizarSeries, BUSCA_DO_SCRIPT, seriesPedidas } from "./atualizacao.ts";
import type { ArquivosDeSeries, ResultadoAtualizacao } from "./atualizacao.ts";
import { montarArquivoSerie } from "./cliente-bcb.ts";
import type { ValorMensal } from "./cliente-bcb.ts";
import { urlDaSerie } from "./series.ts";
import sgs1619DesdeDez from "./testes/sgs-1619-desde-dez-2026.json?raw";
import sgs433DesdeAgo from "./testes/sgs-433-desde-ago-2026.json?raw";
import sgs433DesdeSet from "./testes/sgs-433-desde-set-2026.json?raw";
import sgs4390Ultimos3 from "./testes/sgs-4390-ultimos-3.json?raw";
import sgsErro404SemValores from "./testes/sgs-erro-404-sem-valores.json?raw";
import sgsErro502Html from "./testes/sgs-erro-502.html?raw";

// ---------------------------------------------------------------------------------------------
// Dublês: rede, disco e relógio entram por parâmetro; nenhum teste acessa a rede.
// ---------------------------------------------------------------------------------------------

/** 12/10/2026: pelo calendário, nenhuma das séries de teste "em dia" está atrasada. */
const AGORA = "2026-10-12T09:00:00-03:00";
const agoraFixo = (): string => AGORA;
const agoraEm = (iso: string) => (): string => iso;

/** As seis séries em ordem numérica, como o script pede sem argumentos. */
const SEIS: CodigoSerie[] = ["188", "189", "433", "1619", "4390", "29543"];

/** Uma resposta do BCB (corpo e status) ou o erro que o fetch lança. */
type Roteiro = { corpo: string; status?: number } | Error;

function codigoDaUrl(url: string): CodigoSerie {
  const codigo = /bcdata\.sgs\.(\d+)\//.exec(url)?.[1];
  if (codigo === undefined) throw new Error(`URL sem código de série: ${url}`);
  return codigo as CodigoSerie;
}

/** fetch falso: para cada série, uma fila de respostas consumida na ordem; registra as URLs pedidas. */
function fetchFalso(roteiros: Partial<Record<CodigoSerie, Roteiro[]>>) {
  const urls: string[] = [];
  const fetch = vi.fn(async (entrada: string | URL | Request): Promise<Response> => {
    const url = String(entrada);
    urls.push(url);
    const proxima = roteiros[codigoDaUrl(url)]?.shift();
    if (proxima === undefined) throw new Error(`Sem resposta prevista para ${url}`);
    if (proxima instanceof Error) throw proxima;
    return new Response(proxima.corpo, { status: proxima.status ?? 200 });
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, urls };
}

/** Disco falso: um Map com o texto de cada arquivo; `gravados` registra a ordem das gravações. */
function arquivosEmMemoria(inicial: Partial<Record<CodigoSerie, string>> = {}) {
  const textos = new Map<CodigoSerie, string>(
    Object.entries(inicial) as Array<[CodigoSerie, string]>,
  );
  const gravados: CodigoSerie[] = [];
  const arquivos: ArquivosDeSeries = {
    ler: (codigo) => textos.get(codigo) ?? null,
    gravar: (codigo, texto) => {
      textos.set(codigo, texto);
      gravados.push(codigo);
    },
  };
  return { arquivos, textos, gravados };
}

/** Texto de um arquivo de série como o script grava: 2 espaços e quebra final. */
function textoDoArquivo(codigo: CodigoSerie, valores: ValorMensal[], obtidoEm: string): string {
  return `${JSON.stringify(montarArquivoSerie(codigo, valores, obtidoEm), null, 2)}\n`;
}

/** Um arquivo atual qualquer, obtido um mês antes. */
function arquivoAtual(codigo: CodigoSerie, valores: ValorMensal[]): string {
  return textoDoArquivo(codigo, valores, "2026-09-12T09:00:00-03:00");
}

/** Corpo de resposta do SGS para os valores dados ("01/MM/AAAA"). */
function corpoSgs(valores: ValorMensal[]): string {
  return JSON.stringify(
    valores.map(({ competencia, valor }) => ({
      data: `01/${competencia.slice(5, 7)}/${competencia.slice(0, 4)}`,
      valor,
    })),
  );
}

/** Abrevia `{ competencia, valor }`. */
function v(competencia: string, valor: string): ValorMensal {
  return { competencia, valor };
}

/** Resultado esperado, com listas vazias no que o teste não informa. */
function esperado(parcial: Partial<ResultadoAtualizacao>): ResultadoAtualizacao {
  return { linhas: [], avisos: [], problemas: [], atrasados: [], ...parcial };
}

const dormirQueRegistra = () => {
  const esperas: number[] = [];
  const dormir = async (ms: number): Promise<void> => {
    esperas.push(ms);
  };
  return { dormir, esperas };
};

/** Respostas do BCB das seis séries, todas em dia em 12/10/2026 pelo calendário. */
const VALORES_EM_DIA: Record<CodigoSerie, ValorMensal[]> = {
  "188": [v("2026-08", "-0.21"), v("2026-09", "0.48")],
  "189": [v("2026-08", "0.20"), v("2026-09", "1.57")],
  "433": [v("2026-08", "-0.32"), v("2026-09", "0.82")],
  "1619": [v("2026-12", "1621.00")],
  "4390": [v("2026-08", "1.09"), v("2026-09", "1.08"), v("2026-10", "0.36")],
  "29543": [v("2026-09", "0.381234"), v("2026-10", "0.379020")],
};

const LINHAS_EM_DIA: Record<CodigoSerie, string> = {
  "188": "188 (INPC): 2 meses, último 2026-09 = 0.48",
  "189": "189 (IGP-M): 2 meses, último 2026-09 = 1.57",
  "433": "433 (IPCA): 2 meses, último 2026-09 = 0.82",
  "1619": "1619 (salário mínimo): 1 mês, último 2026-12 = 1621.00",
  "4390": "4390 (SELIC): 3 meses, último 2026-10 = 0.36",
  "29543": "29543 (taxa legal): 2 meses, último 2026-10 = 0.379020",
};

function roteirosEmDia(): Partial<Record<CodigoSerie, Roteiro[]>> {
  const roteiros: Partial<Record<CodigoSerie, Roteiro[]>> = {};
  for (const codigo of SEIS) roteiros[codigo] = [{ corpo: corpoSgs(VALORES_EM_DIA[codigo]) }];
  return roteiros;
}

// ---------------------------------------------------------------------------------------------

describe("seriesPedidas", () => {
  it("sem argumentos, pede as seis séries em ordem numérica", () => {
    expect(seriesPedidas([])).toEqual({
      ok: true,
      codigos: ["188", "189", "433", "1619", "4390", "29543"],
    });
  });

  it("mantém a ordem pedida e ignora repetições", () => {
    expect(seriesPedidas(["433", "189", "433"])).toEqual({ ok: true, codigos: ["433", "189"] });
  });

  it("recusa uma série desconhecida, nomeando as conhecidas", () => {
    expect(seriesPedidas(["abc"])).toEqual({
      ok: false,
      mensagem: "Série desconhecida: abc. Conhecidas: 188, 189, 433, 1619, 4390, 29543.",
    });
  });

  it("recusa várias séries desconhecidas numa só frase, mesmo misturadas com conhecidas", () => {
    expect(seriesPedidas(["433", "abc", "xyz"])).toEqual({
      ok: false,
      mensagem: "Séries desconhecidas: abc e xyz. Conhecidas: 188, 189, 433, 1619, 4390, 29543.",
    });
  });

  it("nomeia uma só vez a série desconhecida repetida", () => {
    expect(seriesPedidas(["abc", "433", "abc"])).toEqual({
      ok: false,
      mensagem: "Série desconhecida: abc. Conhecidas: 188, 189, 433, 1619, 4390, 29543.",
    });
  });

  it("argumento vazio é nomeado como (vazio), sem quebrar a frase", () => {
    expect(seriesPedidas([""])).toEqual({
      ok: false,
      mensagem: "Série desconhecida: (vazio). Conhecidas: 188, 189, 433, 1619, 4390, 29543.",
    });
  });
});

describe("atualizarSeries", () => {
  it("usa tempo-limite de 30 s, três tentativas e 2 s de espera", () => {
    expect(BUSCA_DO_SCRIPT).toEqual({ tempoLimiteMs: 30_000, tentativas: 3, esperaMs: 2_000 });
  });

  it("baixa o histórico inteiro de cada série, na ordem pedida, e grava os arquivos novos", async () => {
    const { fetch, urls } = fetchFalso({
      "433": [{ corpo: sgs433DesdeAgo }],
      "1619": [{ corpo: sgs1619DesdeDez }],
    });
    const { arquivos, textos, gravados } = arquivosEmMemoria();

    const resultado = await atualizarSeries(["433", "1619"], arquivos, {
      fetch,
      agora: agoraFixo,
    });

    expect(resultado).toEqual(
      esperado({
        linhas: [
          "433 (IPCA): 2 meses, último 2026-09 = 0.82",
          "1619 (salário mínimo): 1 mês, último 2026-12 = 1621.00",
        ],
      }),
    );
    // Sem dataInicial: o arquivo embutido guarda o histórico completo.
    expect(urls).toEqual([urlDaSerie("433"), urlDaSerie("1619")]);
    expect(fetch).toHaveBeenCalledWith(urlDaSerie("433"), {
      signal: expect.any(AbortSignal),
    });
    expect(gravados).toEqual(["433", "1619"]);
    expect(textos.get("433")).toBe(
      textoDoArquivo("433", [v("2026-08", "-0.32"), v("2026-09", "0.82")], AGORA),
    );
    expect(textos.get("1619")).toBe(textoDoArquivo("1619", [v("2026-12", "1621.00")], AGORA));
    expect(textos.get("433")).toMatch(/\n$/);
    expect(textos.get("433")).toContain('\n  "formato": "apura/serie@1",\n');
  });

  it("as seis séries em dia: grava todas, uma linha por série, sem avisos, problemas nem atrasados", async () => {
    const { fetch } = fetchFalso(roteirosEmDia());
    const { arquivos, gravados } = arquivosEmMemoria();

    const resultado = await atualizarSeries(SEIS, arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(esperado({ linhas: SEIS.map((codigo) => LINHAS_EM_DIA[codigo]) }));
    expect(gravados).toEqual(SEIS);
  });

  it("sem séries pedidas, não baixa nem grava nada", async () => {
    const { fetch } = fetchFalso({});
    const { arquivos, gravados } = arquivosEmMemoria();

    const resultado = await atualizarSeries([], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(esperado({}));
    expect(fetch).not.toHaveBeenCalled();
    expect(gravados).toEqual([]);
  });

  it("baixa em sequência: o segundo pedido só sai depois da resposta do primeiro", async () => {
    let liberar: (() => void) | undefined;
    const urls: string[] = [];
    const fetch = vi.fn(async (entrada: string | URL | Request): Promise<Response> => {
      urls.push(String(entrada));
      if (urls.length === 1) {
        await new Promise<void>((resolver) => {
          liberar = resolver;
        });
      }
      return new Response(sgs433DesdeSet);
    }) as unknown as typeof globalThis.fetch;
    const { arquivos } = arquivosEmMemoria();

    const pendente = atualizarSeries(["433", "188"], arquivos, { fetch, agora: agoraFixo });
    await Promise.resolve();
    expect(urls).toEqual([urlDaSerie("433")]);
    liberar?.();
    const resultado = await pendente;

    expect(urls).toEqual([urlDaSerie("433"), urlDaSerie("188")]);
    expect(resultado.problemas).toEqual([]);
  });

  it("usa a data-hora de Brasília quando `agora` não é informado", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeSet }] });
    const { arquivos, textos } = arquivosEmMemoria();

    const resultado = await atualizarSeries(["433"], arquivos, { fetch });

    expect(resultado.problemas).toEqual([]);
    const gravado = JSON.parse(textos.get("433") ?? "{}") as { obtidoEm?: unknown };
    expect(gravado.obtidoEm).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-0[23]:00$/);
  });

  it("não acusa nada quando a lista nova só acrescenta meses ao arquivo atual", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeAgo }] });
    const { arquivos, textos } = arquivosEmMemoria({
      "433": arquivoAtual("433", [v("2026-08", "-0.32")]),
    });

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(esperado({ linhas: ["433 (IPCA): 2 meses, último 2026-09 = 0.82"] }));
    expect(textos.get("433")).toContain(`"obtidoEm": "${AGORA}"`);
  });

  it("revisão no IPCA: avisa com 'Atenção' o valor já publicado que mudou, mas grava mesmo assim", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeAgo }] });
    const { arquivos, textos, gravados } = arquivosEmMemoria({
      "433": arquivoAtual("433", [v("2026-08", "-0.32"), v("2026-09", "0.80")]),
    });

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(
      esperado({
        linhas: ["433 (IPCA): 2 meses, último 2026-09 = 0.82"],
        avisos: ["Atenção: na série 433 mudou 1 valor já publicado: 2026-09 de 0.80 para 0.82."],
      }),
    );
    expect(gravados).toEqual(["433"]);
    expect(textos.get("433")).toContain('"valor": "0.82"');
  });

  it("reúne no mesmo aviso todos os valores alterados de uma série", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeAgo }] });
    const { arquivos } = arquivosEmMemoria({
      "433": arquivoAtual("433", [v("2026-08", "-0.30"), v("2026-09", "0.80")]),
    });

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.avisos).toEqual([
      "Atenção: na série 433 mudaram 2 valores já publicados: 2026-08 de -0.30 para -0.32 e 2026-09 de 0.80 para 0.82.",
    ]);
  });

  it("na taxa legal, mudança no mês da obtenção é revisão ('Atenção'): só a SELIC tem mês parcial", async () => {
    const { fetch } = fetchFalso({
      "29543": [{ corpo: corpoSgs(VALORES_EM_DIA["29543"]) }],
    });
    const { arquivos } = arquivosEmMemoria({
      "29543": textoDoArquivo(
        "29543",
        [v("2026-09", "0.381234"), v("2026-10", "0.379000")],
        "2026-10-05T10:47:00-03:00",
      ),
    });

    const resultado = await atualizarSeries(["29543"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(
      esperado({
        linhas: [LINHAS_EM_DIA["29543"]],
        avisos: [
          "Atenção: na série 29543 mudou 1 valor já publicado: 2026-10 de 0.379000 para 0.379020.",
        ],
      }),
    );
  });

  it("grava todas quando uma série tem valor alterado e mês novo e a outra tem arquivo vazio", async () => {
    const { fetch } = fetchFalso({
      "433": [{ corpo: sgs433DesdeAgo }],
      "1619": [{ corpo: sgs1619DesdeDez }],
    });
    const { arquivos, gravados } = arquivosEmMemoria({
      "433": arquivoAtual("433", [v("2026-08", "-0.30")]),
      "1619": arquivoAtual("1619", []),
    });

    const resultado = await atualizarSeries(["433", "1619"], arquivos, {
      fetch,
      agora: agoraFixo,
    });

    expect(resultado).toEqual(
      esperado({
        linhas: [
          "433 (IPCA): 2 meses, último 2026-09 = 0.82",
          "1619 (salário mínimo): 1 mês, último 2026-12 = 1621.00",
        ],
        avisos: ["Atenção: na série 433 mudou 1 valor já publicado: 2026-08 de -0.30 para -0.32."],
      }),
    );
    expect(gravados).toEqual(["433", "1619"]);
  });

  it("repete até três vezes com 2 s de espera e acusa a falha com o número de tentativas", async () => {
    const { fetch } = fetchFalso({
      "433": [
        { corpo: sgsErro502Html, status: 502 },
        new TypeError("Failed to fetch"),
        { corpo: sgsErro502Html, status: 502 },
      ],
    });
    const { arquivos, gravados } = arquivosEmMemoria();
    const { dormir, esperas } = dormirQueRegistra();

    const resultado = await atualizarSeries(["433"], arquivos, {
      fetch,
      agora: agoraFixo,
      busca: { dormir },
    });

    expect(resultado).toEqual(
      esperado({
        linhas: ["433 (IPCA): não gravada."],
        problemas: ["A série 433 não foi baixada após 3 tentativas: o BCB respondeu HTTP 502."],
      }),
    );
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(esperas).toEqual([2_000, 2_000]);
    expect(gravados).toEqual([]);
  });

  it("consegue na terceira tentativa depois de um 502 e de uma falha de rede", async () => {
    const { fetch } = fetchFalso({
      "433": [
        { corpo: sgsErro502Html, status: 502 },
        new TypeError("Failed to fetch"),
        { corpo: sgs433DesdeSet },
      ],
    });
    const { arquivos, gravados } = arquivosEmMemoria();
    const { dormir, esperas } = dormirQueRegistra();

    const resultado = await atualizarSeries(["433"], arquivos, {
      fetch,
      agora: agoraFixo,
      busca: { dormir },
    });

    expect(resultado).toEqual(esperado({ linhas: ["433 (IPCA): 1 mês, último 2026-09 = 0.82"] }));
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(esperas).toEqual([2_000, 2_000]);
    expect(gravados).toEqual(["433"]);
  });

  it("aceita opções de busca por cima das do script (uma tentativa só)", async () => {
    const { fetch } = fetchFalso({
      "433": [{ corpo: sgsErro502Html, status: 502 }, { corpo: sgs433DesdeSet }],
    });
    const { arquivos } = arquivosEmMemoria();
    const { dormir, esperas } = dormirQueRegistra();

    const resultado = await atualizarSeries(["433"], arquivos, {
      fetch,
      agora: agoraFixo,
      busca: { tentativas: 1, dormir },
    });

    expect(resultado.problemas).toEqual(["A série 433 não foi baixada: o BCB respondeu HTTP 502."]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(esperas).toEqual([]);
  });

  it("o tempo-limite de 30 s chega de fato ao pedido", async () => {
    const espiao = vi.spyOn(AbortSignal, "timeout");
    try {
      const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeSet }] });
      await atualizarSeries(["433"], arquivosEmMemoria().arquivos, { fetch, agora: agoraFixo });
      expect(espiao).toHaveBeenCalledWith(30_000);
    } finally {
      espiao.mockRestore();
    }
  });
});

describe("atualizarSeries: cada série decide por si (uma com problema não impede as outras)", () => {
  it("falha só na 189: as outras cinco são gravadas, a 189 fica como estava e o problema a cita", async () => {
    const roteiros = roteirosEmDia();
    roteiros["189"] = [
      { corpo: sgsErro502Html, status: 502 },
      new TypeError("Failed to fetch"),
      { corpo: sgsErro502Html, status: 502 },
    ];
    const { fetch, urls } = fetchFalso(roteiros);
    const atual189 = arquivoAtual("189", [v("2026-07", "0.50"), v("2026-08", "0.20")]);
    const { arquivos, textos, gravados } = arquivosEmMemoria({ "189": atual189 });
    const { dormir } = dormirQueRegistra();

    const resultado = await atualizarSeries(SEIS, arquivos, {
      fetch,
      agora: agoraFixo,
      busca: { dormir },
    });

    expect(resultado).toEqual(
      esperado({
        linhas: [
          LINHAS_EM_DIA["188"],
          "189 (IGP-M): não gravada.",
          LINHAS_EM_DIA["433"],
          LINHAS_EM_DIA["1619"],
          LINHAS_EM_DIA["4390"],
          LINHAS_EM_DIA["29543"],
        ],
        problemas: ["A série 189 não foi baixada após 3 tentativas: o BCB respondeu HTTP 502."],
        // A 189 ficou com o arquivo atual (até ago/2026), mas a busca falhou: não se sabe se o BCB
        // já tem set/2026, e a série fica fora dos atrasados (o problema já a cita).
      }),
    );
    expect(urls).toHaveLength(8);
    expect(gravados).toEqual(["188", "433", "1619", "4390", "29543"]);
    expect(textos.get("189")).toBe(atual189);
  });

  it("encolheu numa série: as outras são gravadas e ela fica como estava", async () => {
    const { fetch, urls } = fetchFalso({
      "433": [{ corpo: sgs433DesdeAgo }],
      "1619": [{ corpo: sgs1619DesdeDez }],
    });
    const atual433 = arquivoAtual("433", [
      v("2026-08", "-0.32"),
      v("2026-09", "0.82"),
      v("2026-10", "0.10"),
    ]);
    const { arquivos, textos, gravados } = arquivosEmMemoria({ "433": atual433 });

    const resultado = await atualizarSeries(["433", "1619"], arquivos, {
      fetch,
      agora: agoraFixo,
    });

    expect(resultado).toEqual(
      esperado({
        linhas: [
          "433 (IPCA): não gravada.",
          "1619 (salário mínimo): 1 mês, último 2026-12 = 1621.00",
        ],
        problemas: [
          "A série 433 encolheu: a lista nova termina em set/2026, antes do último mês atual (out/2026).",
        ],
      }),
    );
    expect(urls).toEqual([urlDaSerie("433"), urlDaSerie("1619")]);
    expect(gravados).toEqual(["1619"]);
    expect(textos.get("433")).toBe(atual433);
  });

  it("arquivo ilegível numa série: as outras são gravadas e o arquivo ilegível não é tocado", async () => {
    const { fetch } = fetchFalso({
      "433": [{ corpo: sgs433DesdeSet }],
      "1619": [{ corpo: sgs1619DesdeDez }],
    });
    const { arquivos, textos, gravados } = arquivosEmMemoria({ "1619": "não é JSON" });

    const resultado = await atualizarSeries(["433", "1619"], arquivos, {
      fetch,
      agora: agoraFixo,
    });

    expect(resultado).toEqual(
      esperado({
        linhas: ["433 (IPCA): 1 mês, último 2026-09 = 0.82", "1619 (salário mínimo): não gravada."],
        problemas: [
          'O arquivo atual da série 1619 não é JSON válido (restaure-o com "git checkout -- dados/indices/1619.json" ou apague-o para baixar a série inteira de novo).',
        ],
      }),
    );
    expect(gravados).toEqual(["433"]);
    expect(textos.get("1619")).toBe("não é JSON");
  });

  it("BCB mudo nas seis: nada é gravado e há seis problemas, um por série", async () => {
    const roteiros: Partial<Record<CodigoSerie, Roteiro[]>> = {};
    for (const codigo of SEIS) {
      roteiros[codigo] = [
        new TypeError("fetch failed"),
        new TypeError("fetch failed"),
        new TypeError("fetch failed"),
      ];
    }
    const { fetch } = fetchFalso(roteiros);
    const { arquivos, gravados } = arquivosEmMemoria();
    const { dormir, esperas } = dormirQueRegistra();

    const resultado = await atualizarSeries(SEIS, arquivos, {
      fetch,
      agora: agoraFixo,
      busca: { dormir },
    });

    expect(resultado).toEqual(
      esperado({
        linhas: [
          "188 (INPC): não gravada.",
          "189 (IGP-M): não gravada.",
          "433 (IPCA): não gravada.",
          "1619 (salário mínimo): não gravada.",
          "4390 (SELIC): não gravada.",
          "29543 (taxa legal): não gravada.",
        ],
        problemas: SEIS.map(
          (codigo) =>
            `A série ${codigo} não foi baixada após 3 tentativas: sem resposta do BCB: TypeError.`,
        ),
      }),
    );
    expect(fetch).toHaveBeenCalledTimes(18);
    expect(esperas).toHaveLength(12);
    expect(gravados).toEqual([]);
  });

  it("erro do SGS numa série (não repete): a outra é gravada", async () => {
    const { fetch } = fetchFalso({
      "433": [{ corpo: sgs433DesdeAgo }],
      "1619": [{ corpo: sgsErro404SemValores, status: 404 }],
    });
    const { arquivos, gravados } = arquivosEmMemoria();
    const { dormir, esperas } = dormirQueRegistra();

    const resultado = await atualizarSeries(["433", "1619"], arquivos, {
      fetch,
      agora: agoraFixo,
      busca: { dormir },
    });

    expect(resultado).toEqual(
      esperado({
        linhas: [
          "433 (IPCA): 2 meses, último 2026-09 = 0.82",
          "1619 (salário mínimo): não gravada.",
        ],
        problemas: [
          "A série 1619 não foi baixada: o BCB respondeu erro 404: br.gov.bcb.pec.sgs.comum.excecoes.SGSNegocioException: Value(s) not found.",
        ],
      }),
    );
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(esperas).toEqual([]);
    expect(gravados).toEqual(["433"]);
  });

  it("um problema por série, na ordem pedida, cada um em frase completa", async () => {
    const { fetch } = fetchFalso({
      "433": [{ corpo: sgs433DesdeSet }],
      "1619": [{ corpo: sgsErro404SemValores, status: 404 }],
      "188": [{ corpo: "[]" }],
    });
    const { arquivos, gravados } = arquivosEmMemoria({
      "433": arquivoAtual("433", [v("2026-08", "-0.32"), v("2026-09", "0.82")]),
    });

    const resultado = await atualizarSeries(["433", "1619", "188"], arquivos, {
      fetch,
      agora: agoraFixo,
    });

    expect(resultado).toEqual(
      esperado({
        linhas: [
          "433 (IPCA): não gravada.",
          "1619 (salário mínimo): não gravada.",
          "188 (INPC): não gravada.",
        ],
        problemas: [
          "A série 433 encolheu: a lista nova começa em set/2026, depois do primeiro mês atual (ago/2026).",
          "A série 1619 não foi baixada: o BCB respondeu erro 404: br.gov.bcb.pec.sgs.comum.excecoes.SGSNegocioException: Value(s) not found.",
          "A série 188 veio vazia.",
        ],
      }),
    );
    expect(gravados).toEqual([]);
  });

  it("linhas na ordem pedida misturando sem mudança, não gravada e gravada", async () => {
    const atual433 = arquivoAtual("433", [v("2026-08", "-0.32"), v("2026-09", "0.82")]);
    const atual1619 = arquivoAtual("1619", [v("2026-11", "1621.00")]);
    const { fetch } = fetchFalso({
      "433": [{ corpo: sgs433DesdeAgo }],
      "189": [{ corpo: sgsErro404SemValores, status: 404 }],
      "1619": [{ corpo: corpoSgs([v("2026-11", "1621.00"), v("2026-12", "1621.00")]) }],
    });
    const { arquivos, gravados } = arquivosEmMemoria({ "433": atual433, "1619": atual1619 });

    const resultado = await atualizarSeries(["433", "189", "1619"], arquivos, {
      fetch,
      agora: agoraFixo,
    });

    expect(resultado.linhas).toEqual([
      "433 (IPCA): sem mudança; 2 meses, último 2026-09 = 0.82",
      "189 (IGP-M): não gravada.",
      "1619 (salário mínimo): 2 meses, último 2026-12 = 1621.00",
    ]);
    expect(resultado.problemas).toHaveLength(1);
    expect(gravados).toEqual(["1619"]);
  });

  it("falha no BCB e arquivo ilegível na mesma série: um problema só, o da busca", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: sgsErro404SemValores, status: 404 }] });
    const { arquivos, textos, gravados } = arquivosEmMemoria({ "433": "{" });

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(
      esperado({
        linhas: ["433 (IPCA): não gravada."],
        problemas: [
          "A série 433 não foi baixada: o BCB respondeu erro 404: br.gov.bcb.pec.sgs.comum.excecoes.SGSNegocioException: Value(s) not found.",
        ],
      }),
    );
    expect(gravados).toEqual([]);
    expect(textos.get("433")).toBe("{");
  });

  it("recusa uma resposta válida porém vazia quando não há arquivo atual", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: "[]" }] });
    const { arquivos, gravados } = arquivosEmMemoria();

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(
      esperado({ linhas: ["433 (IPCA): não gravada."], problemas: ["A série 433 veio vazia."] }),
    );
    expect(gravados).toEqual([]);
  });

  it("recusa uma resposta vazia também quando o arquivo atual não tem valores", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: "[]" }] });
    const { arquivos, gravados } = arquivosEmMemoria({ "433": arquivoAtual("433", []) });

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.problemas).toEqual(["A série 433 veio vazia."]);
    expect(gravados).toEqual([]);
  });

  it("uma resposta vazia diante de um arquivo atual com valores é encolhimento", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: "[]" }] });
    const { arquivos, gravados } = arquivosEmMemoria({
      "433": arquivoAtual("433", [v("2026-09", "0.82")]),
    });

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.problemas).toEqual(["A série 433 encolheu: a lista nova veio vazia."]);
    expect(gravados).toEqual([]);
  });

  it("não grava por cima de um arquivo atual que não é JSON válido", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeSet }] });
    const { arquivos, textos, gravados } = arquivosEmMemoria({ "433": "{" });

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.problemas).toEqual([
      'O arquivo atual da série 433 não é JSON válido (restaure-o com "git checkout -- dados/indices/433.json" ou apague-o para baixar a série inteira de novo).',
    ]);
    expect(gravados).toEqual([]);
    expect(textos.get("433")).toBe("{");
  });

  it("não grava por cima de um arquivo atual em formato inesperado", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeSet }] });
    const { arquivos, gravados } = arquivosEmMemoria({ "433": '{"formato":"outro"}' });

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.problemas).toEqual([
      'O arquivo atual da série 433 não pôde ser lido (Arquivo da série 433 em formato inesperado) (restaure-o com "git checkout -- dados/indices/433.json" ou apague-o para baixar a série inteira de novo).',
    ]);
    expect(gravados).toEqual([]);
  });

  it("não grava por cima de um arquivo atual que é de outra série", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeSet }] });
    const atual = arquivoAtual("188", [v("2026-09", "0.80")]);
    const { arquivos, textos, gravados } = arquivosEmMemoria({ "433": atual });

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.problemas).toEqual([
      'O arquivo atual da série 433 não pôde ser lido (Arquivo da série 433 em formato inesperado) (restaure-o com "git checkout -- dados/indices/433.json" ou apague-o para baixar a série inteira de novo).',
    ]);
    expect(gravados).toEqual([]);
    expect(textos.get("433")).toBe(atual);
  });

  it("não grava por cima de um arquivo atual com valor inválido", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeSet }] });
    const atual = arquivoAtual("433", [v("2026-13", "0.82")]);
    const { arquivos, gravados } = arquivosEmMemoria({ "433": atual });

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.problemas).toEqual([
      'O arquivo atual da série 433 não pôde ser lido (Arquivo da série 433 com valor inválido em 2026-13) (restaure-o com "git checkout -- dados/indices/433.json" ou apague-o para baixar a série inteira de novo).',
    ]);
    expect(gravados).toEqual([]);
  });

  it("resposta com mês repetido com valores diferentes é falha daquela série", async () => {
    const { fetch } = fetchFalso({
      "433": [
        {
          corpo: '[{"data":"01/09/2026","valor":"0.82"},{"data":"01/09/2026","valor":"0.83"}]',
        },
      ],
    });
    const { arquivos, gravados } = arquivosEmMemoria();

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.problemas).toEqual([
      "A série 433 não foi baixada: resposta inválida do BCB (HTTP 200): Competência 2026-09 repetida com valores diferentes (0.82 e 0.83).",
    ]);
    expect(gravados).toEqual([]);
  });

  it("uma leitura do disco que falha interrompe antes de gravar qualquer série", async () => {
    const { fetch } = fetchFalso({
      "433": [{ corpo: sgs433DesdeSet }],
      "1619": [{ corpo: sgs1619DesdeDez }],
    });
    const gravados: CodigoSerie[] = [];
    const arquivos: ArquivosDeSeries = {
      ler: (codigo) => {
        if (codigo === "1619") throw new Error("EACCES: permissão negada");
        return null;
      },
      gravar: (codigo) => {
        gravados.push(codigo);
      },
    };

    await expect(
      atualizarSeries(["433", "1619"], arquivos, { fetch, agora: agoraFixo }),
    ).rejects.toThrow("EACCES: permissão negada");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(gravados).toEqual([]);
  });

  it("uma gravação que falha interrompe com o erro original", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeSet }] });
    const arquivos: ArquivosDeSeries = {
      ler: () => null,
      gravar: () => {
        throw new Error("ENOSPC: disco cheio");
      },
    };

    await expect(atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo })).rejects.toThrow(
      "ENOSPC: disco cheio",
    );
  });
});

describe("atualizarSeries: série sem mudança", () => {
  it("série idêntica ao arquivo atual não é regravada: mantém a data de obtenção", async () => {
    const atual = arquivoAtual("433", [v("2026-08", "-0.32"), v("2026-09", "0.82")]);
    const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeAgo }] });
    const { arquivos, textos, gravados } = arquivosEmMemoria({ "433": atual });

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(
      esperado({ linhas: ["433 (IPCA): sem mudança; 2 meses, último 2026-09 = 0.82"] }),
    );
    expect(gravados).toEqual([]);
    expect(textos.get("433")).toBe(atual);
  });

  it("SELIC sem mudança desde a última gravação: o mês parcial continua com a data de obtenção antiga", async () => {
    const valores = [v("2026-08", "1.09"), v("2026-09", "1.08"), v("2026-10", "0.36")];
    const atual = textoDoArquivo("4390", valores, "2026-10-11T20:11:55-03:00");
    const { fetch } = fetchFalso({ "4390": [{ corpo: sgs4390Ultimos3 }] });
    const { arquivos, textos, gravados } = arquivosEmMemoria({ "4390": atual });

    const resultado = await atualizarSeries(["4390"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(
      esperado({ linhas: ["4390 (SELIC): sem mudança; 3 meses, último 2026-10 = 0.36"] }),
    );
    expect(gravados).toEqual([]);
    expect(JSON.parse(textos.get("4390") ?? "{}").obtidoEm).toBe("2026-10-11T20:11:55-03:00");
  });

  it("uma série sem mudança e outra com mês novo: só a que mudou é gravada", async () => {
    const atual433 = arquivoAtual("433", [v("2026-08", "-0.32"), v("2026-09", "0.82")]);
    const atual1619 = arquivoAtual("1619", [v("2026-11", "1621.00")]);
    const { fetch } = fetchFalso({
      "433": [{ corpo: sgs433DesdeAgo }],
      "1619": [{ corpo: corpoSgs([v("2026-11", "1621.00"), v("2026-12", "1621.00")]) }],
    });
    const { arquivos, gravados } = arquivosEmMemoria({ "433": atual433, "1619": atual1619 });

    const resultado = await atualizarSeries(["433", "1619"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(
      esperado({
        linhas: [
          "433 (IPCA): sem mudança; 2 meses, último 2026-09 = 0.82",
          "1619 (salário mínimo): 2 meses, último 2026-12 = 1621.00",
        ],
      }),
    );
    expect(gravados).toEqual(["1619"]);
  });
});

describe("atualizarSeries: SELIC parcial × revisão (série 4390)", () => {
  it("SELIC parcial do mês do obtidoEm: aviso informativo, sem 'Atenção', e grava", async () => {
    const atual = textoDoArquivo(
      "4390",
      [v("2026-08", "1.09"), v("2026-09", "1.08"), v("2026-10", "0.30")],
      "2026-10-05T10:47:00-03:00",
    );
    // A resposta do BCB vem em ordem decrescente; o arquivo é gravado em ordem crescente.
    const { fetch } = fetchFalso({ "4390": [{ corpo: sgs4390Ultimos3 }] });
    const { arquivos, textos, gravados } = arquivosEmMemoria({ "4390": atual });

    const resultado = await atualizarSeries(["4390"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(
      esperado({
        linhas: ["4390 (SELIC): 3 meses, último 2026-10 = 0.36"],
        avisos: ["SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.30 para 0.36."],
      }),
    );
    expect(resultado.avisos.join(" ")).not.toContain("Atenção");
    expect(gravados).toEqual(["4390"]);
    const gravado = JSON.parse(textos.get("4390") ?? "{}") as {
      obtidoEm: string;
      valores: ValorMensal[];
    };
    expect(gravado.obtidoEm).toBe(AGORA);
    expect(gravado.valores.map((item) => item.competencia)).toEqual([
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
  });

  it("fechamento do mês parcial no mês seguinte: informativo, e o mês novo entra", async () => {
    const atual = textoDoArquivo(
      "4390",
      [v("2026-08", "1.09"), v("2026-09", "1.08"), v("2026-10", "0.95")],
      "2026-10-30T22:47:00-03:00",
    );
    const { fetch } = fetchFalso({
      "4390": [
        {
          corpo: corpoSgs([
            v("2026-08", "1.09"),
            v("2026-09", "1.08"),
            v("2026-10", "1.02"),
            v("2026-11", "0.05"),
          ]),
        },
      ],
    });
    const { arquivos, gravados } = arquivosEmMemoria({ "4390": atual });

    const resultado = await atualizarSeries(["4390"], arquivos, {
      fetch,
      agora: agoraEm("2026-11-03T10:47:00-03:00"),
    });

    expect(resultado).toEqual(
      esperado({
        linhas: ["4390 (SELIC): 4 meses, último 2026-11 = 0.05"],
        avisos: ["SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.95 para 1.02."],
      }),
    );
    expect(gravados).toEqual(["4390"]);
  });

  it("mudança da 4390 num mês anterior ao do obtidoEm é revisão: 'Atenção'", async () => {
    const atual = textoDoArquivo(
      "4390",
      [v("2026-08", "1.09"), v("2026-09", "1.07"), v("2026-10", "0.36")],
      "2026-10-11T20:11:55-03:00",
    );
    const { fetch } = fetchFalso({ "4390": [{ corpo: sgs4390Ultimos3 }] });
    const { arquivos } = arquivosEmMemoria({ "4390": atual });

    const resultado = await atualizarSeries(["4390"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(
      esperado({
        linhas: ["4390 (SELIC): 3 meses, último 2026-10 = 0.36"],
        avisos: ["Atenção: na série 4390 mudou 1 valor já publicado: 2026-09 de 1.07 para 1.08."],
      }),
    );
  });

  it("revisão e parcial na mesma execução: o 'Atenção' (mês anterior) vem antes da linha informativa", async () => {
    const atual = textoDoArquivo(
      "4390",
      [v("2026-08", "1.10"), v("2026-09", "1.07"), v("2026-10", "0.30")],
      "2026-10-11T20:11:55-03:00",
    );
    const { fetch } = fetchFalso({ "4390": [{ corpo: sgs4390Ultimos3 }] });
    const { arquivos } = arquivosEmMemoria({ "4390": atual });

    const resultado = await atualizarSeries(["4390"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.avisos).toEqual([
      "Atenção: na série 4390 mudaram 2 valores já publicados: 2026-08 de 1.10 para 1.09 e 2026-09 de 1.07 para 1.08.",
      "SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.30 para 0.36.",
    ]);
  });

  it("mês posterior ao do obtidoEm também é parcial (informativo)", async () => {
    // arquivoAtual: obtidoEm em set/2026; out/2026 é posterior.
    const { fetch } = fetchFalso({ "4390": [{ corpo: sgs4390Ultimos3 }] });
    const { arquivos } = arquivosEmMemoria({
      "4390": arquivoAtual("4390", [
        v("2026-08", "1.09"),
        v("2026-09", "1.08"),
        v("2026-10", "0.30"),
      ]),
    });

    const resultado = await atualizarSeries(["4390"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.avisos).toEqual([
      "SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.30 para 0.36.",
    ]);
  });

  it("obtidoEm em UTC (arquivo antigo) vale pelo mês em Brasília: 01/11 01h30 UTC ainda é out/2026", async () => {
    const atual = textoDoArquivo(
      "4390",
      [v("2026-09", "1.08"), v("2026-10", "0.95")],
      "2026-11-01T01:30:00.000Z",
    );
    const { fetch } = fetchFalso({
      "4390": [
        { corpo: corpoSgs([v("2026-09", "1.08"), v("2026-10", "1.02"), v("2026-11", "0.05")]) },
      ],
    });
    const { arquivos } = arquivosEmMemoria({ "4390": atual });

    const resultado = await atualizarSeries(["4390"], arquivos, {
      fetch,
      agora: agoraEm("2026-11-03T10:47:00-03:00"),
    });

    expect(resultado.avisos).toEqual([
      "SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.95 para 1.02.",
    ]);
  });

  it("obtidoEm ilegível no arquivo da SELIC: sem saber o mês parcial, toda mudança é revisão", async () => {
    const atual = textoDoArquivo(
      "4390",
      [v("2026-08", "1.09"), v("2026-09", "1.08"), v("2026-10", "0.30")],
      "ontem",
    );
    const { fetch } = fetchFalso({ "4390": [{ corpo: sgs4390Ultimos3 }] });
    const { arquivos, gravados } = arquivosEmMemoria({ "4390": atual });

    const resultado = await atualizarSeries(["4390"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.avisos).toEqual([
      "Atenção: na série 4390 mudou 1 valor já publicado: 2026-10 de 0.30 para 0.36.",
    ]);
    expect(gravados).toEqual(["4390"]);
  });

  it("SELIC que encolheu não gera aviso: só o problema", async () => {
    const atual = textoDoArquivo(
      "4390",
      [v("2026-07", "1.00"), v("2026-08", "1.09"), v("2026-09", "1.08"), v("2026-10", "0.30")],
      "2026-10-05T10:47:00-03:00",
    );
    const { fetch } = fetchFalso({ "4390": [{ corpo: sgs4390Ultimos3 }] });
    const { arquivos, gravados } = arquivosEmMemoria({ "4390": atual });

    const resultado = await atualizarSeries(["4390"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(
      esperado({
        linhas: ["4390 (SELIC): não gravada."],
        problemas: [
          "A série 4390 encolheu: a lista nova começa em ago/2026, depois do primeiro mês atual (jul/2026).",
        ],
      }),
    );
    expect(gravados).toEqual([]);
  });
});

describe("atualizarSeries: meses atrasados pelo calendário", () => {
  it("IPCA só até 2026-08 e hoje 20/10/2026: linha do IPCA de set/2026", async () => {
    const valores = [v("2026-07", "0.26"), v("2026-08", "-0.32")];
    const { fetch } = fetchFalso({ "433": [{ corpo: corpoSgs(valores) }] });
    const { arquivos, gravados } = arquivosEmMemoria({ "433": arquivoAtual("433", valores) });

    const resultado = await atualizarSeries(["433"], arquivos, {
      fetch,
      agora: agoraEm("2026-10-20T10:47:00-03:00"),
    });

    expect(resultado).toEqual(
      esperado({
        linhas: ["433 (IPCA): sem mudança; 2 meses, último 2026-08 = -0.32"],
        atrasados: [
          "Ainda não disponível no BCB: IPCA de set/2026 (divulgação prevista por volta de 10/10/2026).",
        ],
      }),
    );
    expect(gravados).toEqual([]);
  });

  it("salário mínimo do ano inteiro atrasado: uma linha só", async () => {
    const atual = textoDoArquivo("1619", [v("2026-12", "1621.00")], "2026-12-30T10:47:00-03:00");
    const { fetch } = fetchFalso({ "1619": [{ corpo: sgs1619DesdeDez }] });
    const { arquivos } = arquivosEmMemoria({ "1619": atual });

    const resultado = await atualizarSeries(["1619"], arquivos, {
      fetch,
      agora: agoraEm("2027-02-03T10:47:00-03:00"),
    });

    expect(resultado.atrasados).toEqual([
      "Ainda não disponível no BCB: salário mínimo de jan/2027 a dez/2027 (divulgação prevista no início de 2027, com o decreto do salário mínimo).",
    ]);
  });

  it("meses com previsões diferentes ficam em linhas separadas, em ordem numérica de série", async () => {
    const ipca = [v("2026-06", "0.24"), v("2026-07", "0.26")];
    const inpc = [v("2026-07", "0.21")];
    const { fetch } = fetchFalso({
      "433": [{ corpo: corpoSgs(ipca) }],
      "188": [{ corpo: corpoSgs(inpc) }],
    });
    const { arquivos } = arquivosEmMemoria({
      "433": arquivoAtual("433", ipca),
      "188": arquivoAtual("188", inpc),
    });

    const resultado = await atualizarSeries(["433", "188"], arquivos, {
      fetch,
      agora: agoraEm("2026-10-20T10:47:00-03:00"),
    });

    expect(resultado.linhas).toEqual([
      "433 (IPCA): sem mudança; 2 meses, último 2026-07 = 0.26",
      "188 (INPC): sem mudança; 1 mês, último 2026-07 = 0.21",
    ]);
    expect(resultado.atrasados).toEqual([
      "Ainda não disponível no BCB: INPC de ago/2026 (divulgação prevista por volta de 10/09/2026).",
      "Ainda não disponível no BCB: INPC de set/2026 (divulgação prevista por volta de 10/10/2026).",
      "Ainda não disponível no BCB: IPCA de ago/2026 (divulgação prevista por volta de 10/09/2026).",
      "Ainda não disponível no BCB: IPCA de set/2026 (divulgação prevista por volta de 10/10/2026).",
    ]);
  });

  it("SELIC e taxa legal atrasadas, com a previsão de cada uma", async () => {
    const selic = [v("2026-09", "1.08"), v("2026-10", "1.02")];
    const taxa = [v("2026-09", "0.381234"), v("2026-10", "0.379020")];
    const { fetch } = fetchFalso({
      "4390": [{ corpo: corpoSgs(selic) }],
      "29543": [{ corpo: corpoSgs(taxa) }],
    });
    const { arquivos } = arquivosEmMemoria({
      "4390": textoDoArquivo("4390", selic, "2026-11-01T09:00:00-03:00"),
      "29543": arquivoAtual("29543", taxa),
    });

    const resultado = await atualizarSeries(["29543", "4390"], arquivos, {
      fetch,
      agora: agoraEm("2026-11-10T14:17:00-03:00"),
    });

    expect(resultado.atrasados).toEqual([
      "Ainda não disponível no BCB: SELIC de nov/2026 (divulgação prevista ao longo de nov/2026, como acumulado parcial fechado no início de dez/2026).",
      "Ainda não disponível no BCB: taxa legal de nov/2026 (divulgação prevista no 1º dia útil de nov/2026).",
    ]);
  });

  it("série gravada com o mês que faltava não aparece nos atrasados", async () => {
    const { fetch } = fetchFalso({
      "433": [
        { corpo: corpoSgs([v("2026-07", "0.26"), v("2026-08", "-0.32"), v("2026-09", "0.82")]) },
      ],
    });
    const { arquivos, gravados } = arquivosEmMemoria({
      "433": arquivoAtual("433", [v("2026-07", "0.26"), v("2026-08", "-0.32")]),
    });

    const resultado = await atualizarSeries(["433"], arquivos, {
      fetch,
      agora: agoraEm("2026-10-20T10:47:00-03:00"),
    });

    expect(resultado).toEqual(esperado({ linhas: ["433 (IPCA): 3 meses, último 2026-09 = 0.82"] }));
    expect(gravados).toEqual(["433"]);
  });

  it("série que encolheu conta pelo arquivo atual; busca que falhou ou arquivo ilegível ficam fora", async () => {
    const { fetch } = fetchFalso({
      "433": [{ corpo: corpoSgs([v("2026-07", "0.26")]) }],
      "188": [{ corpo: corpoSgs([v("2026-08", "-0.21")]) }],
      "189": [{ corpo: sgsErro404SemValores, status: 404 }],
    });
    const { arquivos } = arquivosEmMemoria({
      "433": arquivoAtual("433", [v("2026-07", "0.26"), v("2026-08", "-0.32")]),
      "188": "{",
      "189": arquivoAtual("189", [v("2026-01", "0.10")]),
    });

    const resultado = await atualizarSeries(["433", "188", "189"], arquivos, {
      fetch,
      agora: agoraEm("2026-10-20T10:47:00-03:00"),
    });

    expect(resultado.problemas).toHaveLength(3);
    // O IPCA encolheu, mas o BCB respondeu: conta pelo arquivo atual (até ago/2026). O INPC tem o
    // arquivo ilegível, e a busca do IGP-M falhou (não se sabe o que o BCB tem): os dois ficam fora.
    expect(resultado.atrasados).toEqual([
      "Ainda não disponível no BCB: IPCA de set/2026 (divulgação prevista por volta de 10/10/2026).",
    ]);
  });

  it("série gravada que continua atrás do calendário aparece nos atrasados, pelo que foi gravado", async () => {
    const { fetch } = fetchFalso({
      "433": [{ corpo: corpoSgs([v("2026-07", "0.26"), v("2026-08", "-0.32")]) }],
    });
    const { arquivos, gravados } = arquivosEmMemoria({
      "433": arquivoAtual("433", [v("2026-07", "0.26")]),
    });

    const resultado = await atualizarSeries(["433"], arquivos, {
      fetch,
      agora: agoraEm("2026-10-20T10:47:00-03:00"),
    });

    expect(gravados).toEqual(["433"]);
    expect(resultado.atrasados).toEqual([
      "Ainda não disponível no BCB: IPCA de set/2026 (divulgação prevista por volta de 10/10/2026).",
    ]);
  });

  it("só as séries pedidas entram nos atrasados", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeSet }] });
    const ler = vi.fn((codigo: CodigoSerie) =>
      codigo === "189" ? arquivoAtual("189", [v("2026-01", "0.10")]) : null,
    );
    const arquivos: ArquivosDeSeries = { ler, gravar: () => undefined };

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.atrasados).toEqual([]);
    expect(ler).not.toHaveBeenCalledWith("189");
  });
});
