import { describe, expect, it, vi } from "vitest";
import {
  buscarSerie,
  ehValorMensalValido,
  interpretarErroSgs,
  interpretarRespostaSgs,
  montarArquivoSerie,
  RespostaSgsInvalida,
} from "./cliente-bcb.ts";
import type { OpcoesBusca } from "./cliente-bcb.ts";
import { SERIES, urlDaSerie } from "./series.ts";
import sgs1619DesdeDez from "./testes/sgs-1619-desde-dez-2026.json?raw";
import respostaGravada from "./testes/sgs-189-2017-2018.json?raw";
import sgs433DesdeAgo from "./testes/sgs-433-desde-ago-2026.json?raw";
import sgs433DesdeSet from "./testes/sgs-433-desde-set-2026.json?raw";
import sgs4390Ultimos3 from "./testes/sgs-4390-ultimos-3.json?raw";
import sgsErro400DataInvalida from "./testes/sgs-erro-400-data-invalida.json?raw";
import sgsErro404SemValores from "./testes/sgs-erro-404-sem-valores.json?raw";
import sgsErro502Html from "./testes/sgs-erro-502.html?raw";
import sgsSerieInexistenteHtml from "./testes/sgs-serie-inexistente.html?raw";

describe("catálogo de séries do BCB", () => {
  it("tem as seis séries do design", () => {
    expect(Object.keys(SERIES).sort()).toEqual(["1619", "188", "189", "29543", "433", "4390"]);
    expect(SERIES["189"].descricao).toBe("IGP-M (FGV), variação % mensal");
  });

  it("monta a URL do SGS com e sem intervalo de datas", () => {
    expect(urlDaSerie("189")).toBe(
      "https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados?formato=json",
    );
    expect(urlDaSerie("189", "2017-01-01", "2018-05-31")).toBe(
      "https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados?formato=json&dataInicial=01/01/2017&dataFinal=31/05/2018",
    );
  });
});

describe("interpretarRespostaSgs", () => {
  it("lê a resposta real gravada do BCB para o IGP-M (jan/2017 a mai/2018)", () => {
    const valores = interpretarRespostaSgs(respostaGravada);
    expect(valores).toHaveLength(17);
    expect(valores[0]).toEqual({ competencia: "2017-01", valor: "0.64" });
    expect(valores[3]).toEqual({ competencia: "2017-04", valor: "-1.10" });
    expect(valores[16]).toEqual({ competencia: "2018-05", valor: "1.38" });
  });

  it("ordena por competência quando a resposta vem invertida e tolera repetição idêntica", () => {
    const texto =
      '[{"data":"01/03/2026","valor":"0.50"},{"data":"01/02/2026","valor":"0.30"},{"data":"01/01/2026","valor":"0.10"},{"data":"01/02/2026","valor":"0.30"}]';
    expect(interpretarRespostaSgs(texto)).toEqual([
      { competencia: "2026-01", valor: "0.10" },
      { competencia: "2026-02", valor: "0.30" },
      { competencia: "2026-03", valor: "0.50" },
    ]);
  });

  it("recusa repetição com valores diferentes", () => {
    const texto = '[{"data":"01/02/2026","valor":"0.30"},{"data":"01/02/2026","valor":"0.31"}]';
    expect(() => interpretarRespostaSgs(texto)).toThrow(RespostaSgsInvalida);
  });

  it("recusa HTML (série inexistente responde HTML com status 200)", () => {
    expect(() => interpretarRespostaSgs("<!DOCTYPE html><html><body>Erro</body></html>")).toThrow(
      RespostaSgsInvalida,
    );
  });

  it("recusa erro em JSON, JSON inválido e data ou valor fora do formato", () => {
    expect(() => interpretarRespostaSgs('{"erro":"parâmetro inválido"}')).toThrow(
      RespostaSgsInvalida,
    );
    expect(() => interpretarRespostaSgs("[{")).toThrow(RespostaSgsInvalida);
    expect(() => interpretarRespostaSgs('[{"data":"2017-01-01","valor":"0.64"}]')).toThrow(
      RespostaSgsInvalida,
    );
    expect(() => interpretarRespostaSgs('[{"data":"01/01/2017","valor":"0,64"}]')).toThrow(
      RespostaSgsInvalida,
    );
    // mês 13 ou 00 na data do BCB: recusado, nunca vira a competência "2017-13"
    expect(() => interpretarRespostaSgs('[{"data":"01/13/2017","valor":"0.64"}]')).toThrow(
      "Data inválida na resposta do BCB: 01/13/2017",
    );
    expect(() => interpretarRespostaSgs('[{"data":"01/00/2017","valor":"0.64"}]')).toThrow(
      RespostaSgsInvalida,
    );
    expect(() => interpretarRespostaSgs('[{"data":"01/01/2017","valor":null}]')).toThrow(
      RespostaSgsInvalida,
    );
    expect(() => interpretarRespostaSgs("[1, 2]")).toThrow(RespostaSgsInvalida);
  });

  it("devolve lista vazia para resposta vazia (quem chama decide o que fazer)", () => {
    expect(interpretarRespostaSgs("[]")).toEqual([]);
  });
});

describe("interpretarErroSgs", () => {
  it("reconhece o objeto de erro do SGS (404 sem valores, 400 data inválida) e ignora o resto", () => {
    expect(
      interpretarErroSgs(
        '{"erro":{"statusCode":404,"detail":"br.gov.bcb.pec.sgs.comum.excecoes.SGSNegocioException: Value(s) not found"}}',
      ),
    ).toEqual({
      statusCode: 404,
      detail: "br.gov.bcb.pec.sgs.comum.excecoes.SGSNegocioException: Value(s) not found",
    });
    expect(interpretarErroSgs('{"erro":{"statusCode":400}}')).toEqual({
      statusCode: 400,
      detail: "",
    });
    expect(interpretarErroSgs('[{"data":"01/01/2017","valor":"0.64"}]')).toBeNull();
    expect(interpretarErroSgs("<!DOCTYPE html>")).toBeNull();
    expect(interpretarErroSgs('{"erro":"texto"}')).toBeNull();
    expect(interpretarErroSgs("{")).toBeNull();
  });
});

describe("ehValorMensalValido", () => {
  it("aceita competência válida com valor em texto decimal; recusa mês 13, valor numérico e chave ausente", () => {
    expect(ehValorMensalValido({ competencia: "2017-01", valor: "0.64" })).toBe(true);
    expect(ehValorMensalValido({ competencia: "2017-13", valor: "0.64" })).toBe(false);
    expect(ehValorMensalValido({ competencia: "2017-01", valor: 0.64 })).toBe(false);
    expect(ehValorMensalValido({ competencia: "2017-01", valor: "0,64" })).toBe(false);
    expect(ehValorMensalValido({ competencia: "2017-01" })).toBe(false);
    expect(ehValorMensalValido(null)).toBe(false);
    expect(ehValorMensalValido("2017-01")).toBe(false);
  });
});

describe("montarArquivoSerie", () => {
  it("monta o arquivo com formato, nome, origem e data de obtenção", () => {
    const arquivo = montarArquivoSerie(
      "189",
      [{ competencia: "2017-01", valor: "0.64" }],
      "2026-10-10T20:00:00.000Z",
    );
    expect(arquivo).toEqual({
      formato: "apura/serie@1",
      codigo: "189",
      nome: "IGP-M (FGV), variação % mensal",
      origem: "https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados?formato=json",
      obtidoEm: "2026-10-10T20:00:00.000Z",
      valores: [{ competencia: "2017-01", valor: "0.64" }],
    });
  });
});

// ---------------------------------------------------------------------------------------------
// buscarSerie: fetch falso (roteiro de respostas ou de lançamentos, registrando cada chamada) e
// dormir falso (só registra as esperas). Nenhum teste acessa a rede.
// ---------------------------------------------------------------------------------------------

interface ChamadaFetch {
  url: string;
  init: RequestInit | undefined;
}

/** Um passo do roteiro: a resposta a devolver ou o que lançar no lugar dela. */
type PassoDoRoteiro = Response | { lancar: unknown };

function fetchFalso(roteiro: PassoDoRoteiro[]): {
  fetch: typeof globalThis.fetch;
  chamadas: ChamadaFetch[];
} {
  const chamadas: ChamadaFetch[] = [];
  const fetch: typeof globalThis.fetch = (entrada, init) => {
    chamadas.push({ url: String(entrada), init });
    const passo = roteiro[chamadas.length - 1];
    if (passo === undefined) {
      return Promise.reject(new Error("fetch falso chamado mais vezes do que o roteiro previa"));
    }
    if (passo instanceof Response) return Promise.resolve(passo);
    return Promise.reject(passo.lancar);
  };
  return { fetch, chamadas };
}

function dormirFalso(): { dormir: (ms: number) => Promise<void>; esperas: number[] } {
  const esperas: number[] = [];
  return {
    esperas,
    dormir: (ms) => {
      esperas.push(ms);
      return Promise.resolve();
    },
  };
}

function json(corpo: string, status = 200): Response {
  return new Response(corpo, { status, headers: { "content-type": "application/json" } });
}

function html(corpo: string, status = 200): Response {
  return new Response(corpo, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

/** Monta as opções com fetch e dormir falsos e devolve também os registros, para as asserções. */
function preparar(roteiro: PassoDoRoteiro[], extras: Partial<OpcoesBusca> = {}) {
  const { fetch, chamadas } = fetchFalso(roteiro);
  const { dormir, esperas } = dormirFalso();
  const opcoes: OpcoesBusca = { fetch, dormir, ...extras };
  return { opcoes, chamadas, esperas };
}

const URL_433_DESDE_SET = urlDaSerie("433", "2026-09-01");
const ERRO_404_DETALHE =
  "br.gov.bcb.pec.sgs.comum.excecoes.SGSNegocioException: Value(s) not found";

describe("buscarSerie · caminho principal", () => {
  it("(1) devolve o IPCA desde set/2026 numa tentativa, com dataInicial na URL e GET simples", async () => {
    const { opcoes, chamadas, esperas } = preparar([json(sgs433DesdeSet)]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toEqual({
      ok: true,
      valores: [{ competencia: "2026-09", valor: "0.82" }],
      url: URL_433_DESDE_SET,
      tentativas: 1,
    });
    expect(resposta.url).toContain("&dataInicial=01/09/2026");
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0]?.url).toBe(URL_433_DESDE_SET);
    // GET simples: só o sinal de tempo-limite, sem método nem cabeçalhos.
    expect(chamadas[0]?.init?.signal).toBeInstanceOf(AbortSignal);
    expect(chamadas[0]?.init?.headers).toBeUndefined();
    expect(chamadas[0]?.init?.method).toBeUndefined();
    expect(esperas).toEqual([]);
  });

  it("(2) decide pelo corpo, não pelo content-type: JSON válido anunciado como text/html é aceito", async () => {
    const { opcoes } = preparar([html(sgs433DesdeSet)]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta.ok).toBe(true);
    if (resposta.ok) expect(resposta.valores).toEqual([{ competencia: "2026-09", valor: "0.82" }]);
  });

  it("(3) devolve a SELIC de ultimos/3 (que vem decrescente) em ordem crescente de competência", async () => {
    const { opcoes } = preparar([json(sgs4390Ultimos3)]);
    const resposta = await buscarSerie("4390", "2026-08-01", opcoes);
    expect(resposta).toMatchObject({ ok: true, tentativas: 1 });
    if (resposta.ok) {
      expect(resposta.valores).toEqual([
        { competencia: "2026-08", valor: "1.09" },
        { competencia: "2026-09", valor: "1.08" },
        { competencia: "2026-10", valor: "0.36" },
      ]);
    }
  });

  it("(12) aceita a lista vazia '[]' como ok sem valores (quem chama decide o que fazer)", async () => {
    const { opcoes, esperas } = preparar([json("[]")]);
    const resposta = await buscarSerie("188", "2026-10-01", opcoes);
    expect(resposta).toEqual({
      ok: true,
      valores: [],
      url: urlDaSerie("188", "2026-10-01"),
      tentativas: 1,
    });
    expect(esperas).toEqual([]);
  });

  it("(13) sem dataInicial, a URL não leva o parâmetro (histórico completo)", async () => {
    const { opcoes, chamadas } = preparar([json(sgs1619DesdeDez)]);
    const resposta = await buscarSerie("1619", undefined, opcoes);
    expect(resposta.url).toBe(
      "https://api.bcb.gov.br/dados/serie/bcdata.sgs.1619/dados?formato=json",
    );
    expect(resposta.url).not.toContain("dataInicial");
    expect(chamadas[0]?.url).toBe(resposta.url);
    expect(resposta).toMatchObject({
      ok: true,
      valores: [{ competencia: "2026-12", valor: "1621.00" }],
    });
  });

  it("aceita JSON válido mesmo com status HTTP diferente de 200 (o corpo decide)", async () => {
    const { opcoes, esperas } = preparar([json(sgs1619DesdeDez, 503)]);
    const resposta = await buscarSerie("1619", "2026-12-01", opcoes);
    expect(resposta).toMatchObject({
      ok: true,
      valores: [{ competencia: "2026-12", valor: "1621.00" }],
      tentativas: 1,
    });
    expect(esperas).toEqual([]);
  });
});

describe("buscarSerie · erros do SGS no corpo (não repetem)", () => {
  it.each([404, 200])(
    "(4) 'Value(s) not found' com status HTTP %i: uma tentativa, sem esperar, motivo com 404 e o detalhe",
    async (status) => {
      const { opcoes, chamadas, esperas } = preparar([json(sgsErro404SemValores, status)]);
      const resposta = await buscarSerie("433", "2026-11-01", opcoes);
      expect(resposta).toEqual({
        ok: false,
        motivo: `o BCB respondeu erro 404: ${ERRO_404_DETALHE}`,
        url: urlDaSerie("433", "2026-11-01"),
        tentativas: 1,
      });
      expect(resposta.ok === false && resposta.motivo).toContain("404");
      expect(resposta.ok === false && resposta.motivo).toContain("Value(s) not found");
      expect(chamadas).toHaveLength(1);
      expect(esperas).toEqual([]);
    },
  );

  it("(5) data inicial inválida (400): ok false numa tentativa, com o detalhe do SGS", async () => {
    const { opcoes, chamadas, esperas } = preparar([json(sgsErro400DataInvalida, 400)]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({
      ok: false,
      motivo:
        "o BCB respondeu erro 400: br.gov.bcb.pec.sgs.comum.excecoes.SGSNegocioException: Invalid initial date",
      tentativas: 1,
    });
    expect(chamadas).toHaveLength(1);
    expect(esperas).toEqual([]);
  });

  it("detalhe do SGS com várias linhas e longo: o motivo fica numa linha só, com até 300 caracteres e '…' ao cortar", async () => {
    const detail = `java.lang.IllegalStateException: falha\n\tat br.gov.bcb.X(X.java:1)\n${"x".repeat(1000)}`;
    const corpo = JSON.stringify({ erro: { statusCode: 400, detail } });
    const { opcoes, chamadas } = preparar([json(corpo, 400)]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({ ok: false, tentativas: 1 });
    expect(chamadas).toHaveLength(1);
    const motivo = resposta.ok ? "" : resposta.motivo;
    expect(motivo).toMatch(
      /^o BCB respondeu erro 400: java\.lang\.IllegalStateException: falha at br\.gov\.bcb\.X\(X\.java:1\) /,
    );
    expect(motivo).not.toContain("\n");
    expect(motivo.length).toBeLessThanOrEqual(300);
    expect(motivo.endsWith("…")).toBe(true);
  });

  it("objeto de erro do SGS com status HTTP 5xx: repete uma vez (erro do servidor) e fica com o motivo do SGS", async () => {
    const { opcoes, chamadas, esperas } = preparar([
      json(sgsErro404SemValores, 500),
      json(sgsErro404SemValores, 500),
    ]);
    const resposta = await buscarSerie("433", "2026-11-01", opcoes);
    expect(resposta).toMatchObject({
      ok: false,
      motivo: `o BCB respondeu erro 404: ${ERRO_404_DETALHE}`,
      tentativas: 2,
    });
    expect(chamadas).toHaveLength(2);
    expect(esperas).toEqual([3000]);
  });

  it("objeto de erro do SGS com código 503 no corpo (mesmo com status 200): repete e recupera", async () => {
    const { opcoes, chamadas } = preparar([
      json('{"erro":{"statusCode":503,"detail":"Service Unavailable"}}'),
      json(sgs433DesdeSet),
    ]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({ ok: true, tentativas: 2 });
    expect(chamadas).toHaveLength(2);
  });

  it("erro 406 do SGS (sintético, no formato dos erros reais 400 e 404): falha definitiva, sem repetir", async () => {
    const { opcoes, chamadas, esperas } = preparar([
      json('{"erro":{"statusCode":406,"detail":"Not Acceptable"}}', 406),
    ]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({
      ok: false,
      motivo: "o BCB respondeu erro 406: Not Acceptable",
      tentativas: 1,
    });
    expect(chamadas).toHaveLength(1);
    expect(esperas).toEqual([]);
  });

  it("erro do SGS sem detalhe: motivo termina no código, sem dois-pontos pendentes", async () => {
    const { opcoes } = preparar([json('{"erro":{"statusCode":400}}', 400)]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({
      ok: false,
      motivo: "o BCB respondeu erro 400",
      tentativas: 1,
    });
  });
});

describe("buscarSerie · resposta inválida (não repete)", () => {
  it("(10) página HTML da série inexistente com status 200: uma tentativa, motivo do intérprete", async () => {
    const { opcoes, chamadas, esperas } = preparar([html(sgsSerieInexistenteHtml)]);
    const resposta = await buscarSerie("433", undefined, opcoes);
    expect(resposta).toMatchObject({
      ok: false,
      motivo:
        "resposta inválida do BCB (HTTP 200): A resposta do BCB não é uma lista JSON (pode ser HTML de erro ou série inexistente).",
      tentativas: 1,
    });
    expect(chamadas).toHaveLength(1);
    expect(esperas).toEqual([]);
  });

  it("JSON fora do formato (data ISO em vez de dd/mm/aaaa) com 200: não repete e cita a data", async () => {
    const { opcoes, esperas } = preparar([json('[{"data":"2026-09-01","valor":"0.82"}]')]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({
      ok: false,
      motivo: "resposta inválida do BCB (HTTP 200): Data inválida na resposta do BCB: 2026-09-01",
      tentativas: 1,
    });
    expect(esperas).toEqual([]);
  });

  it("competência repetida com valores diferentes: falha da série, sem repetir", async () => {
    const { opcoes, chamadas } = preparar([
      json('[{"data":"01/10/2026","valor":"0.36"},{"data":"01/10/2026","valor":"0.58"}]'),
    ]);
    const resposta = await buscarSerie("4390", "2026-10-01", opcoes);
    expect(resposta).toMatchObject({
      ok: false,
      motivo:
        "resposta inválida do BCB (HTTP 200): Competência 2026-10 repetida com valores diferentes (0.36 e 0.58).",
      tentativas: 1,
    });
    expect(chamadas).toHaveLength(1);
  });

  it("HTML com status 4xx (nem erro do SGS nem 5xx): não repete e informa o status", async () => {
    const { opcoes, esperas } = preparar([html("<html>Não encontrado</html>", 404)]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({ ok: false, tentativas: 1 });
    expect(resposta.ok === false && resposta.motivo).toMatch(
      /^resposta inválida do BCB \(HTTP 404\): /,
    );
    expect(esperas).toEqual([]);
  });
});

describe("buscarSerie · falhas que repetem (5xx e sem resposta)", () => {
  it("(6) 502 com página HTML, depois JSON: ok na segunda tentativa, uma espera de 3000 ms", async () => {
    const { opcoes, chamadas, esperas } = preparar([
      html(sgsErro502Html, 502),
      json(sgs433DesdeAgo),
    ]);
    const resposta = await buscarSerie("433", "2026-08-01", opcoes);
    expect(resposta).toEqual({
      ok: true,
      valores: [
        { competencia: "2026-08", valor: "-0.32" },
        { competencia: "2026-09", valor: "0.82" },
      ],
      url: urlDaSerie("433", "2026-08-01"),
      tentativas: 2,
    });
    expect(chamadas).toHaveLength(2);
    expect(chamadas.map((c) => c.url)).toEqual([resposta.url, resposta.url]);
    expect(esperas).toEqual([3000]);
  });

  it("(7) 502 duas vezes: desiste com 'HTTP 502' e duas tentativas", async () => {
    const { opcoes, chamadas, esperas } = preparar([
      html(sgsErro502Html, 502),
      html(sgsErro502Html, 502),
    ]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toEqual({
      ok: false,
      motivo: "o BCB respondeu HTTP 502",
      url: URL_433_DESDE_SET,
      tentativas: 2,
    });
    expect(chamadas).toHaveLength(2);
    expect(esperas).toEqual([3000]);
  });

  it("(8) fetch lança TypeError('Failed to fetch') e depois responde: ok na segunda", async () => {
    const { opcoes, esperas } = preparar([
      { lancar: new TypeError("Failed to fetch") },
      json(sgs433DesdeSet),
    ]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({
      ok: true,
      valores: [{ competencia: "2026-09", valor: "0.82" }],
      tentativas: 2,
    });
    expect(esperas).toEqual([3000]);
  });

  it("(9) tempo esgotado duas vezes (DOMException TimeoutError): ok false com o nome do erro", async () => {
    const tempoEsgotado = () =>
      new DOMException("The operation was aborted due to timeout", "TimeoutError");
    const { opcoes, chamadas, esperas } = preparar([
      { lancar: tempoEsgotado() },
      { lancar: tempoEsgotado() },
    ]);
    const resposta = await buscarSerie("189", "2026-09-01", opcoes);
    expect(resposta).toEqual({
      ok: false,
      motivo: "sem resposta do BCB: TimeoutError",
      url: urlDaSerie("189", "2026-09-01"),
      tentativas: 2,
    });
    expect(resposta.ok === false && resposta.motivo).toContain("TimeoutError");
    expect(chamadas).toHaveLength(2);
    expect(esperas).toEqual([3000]);
  });

  it("AbortError (pedido cancelado) também conta como sem resposta e repete", async () => {
    const { opcoes } = preparar([
      { lancar: new DOMException("The operation was aborted.", "AbortError") },
      json(sgs433DesdeSet),
    ]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({ ok: true, tentativas: 2 });
  });

  it("o último motivo é o que fica: TypeError na primeira e 502 na segunda", async () => {
    const { opcoes } = preparar([
      { lancar: new TypeError("Failed to fetch") },
      html(sgsErro502Html, 502),
    ]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({
      ok: false,
      motivo: "o BCB respondeu HTTP 502",
      tentativas: 2,
    });
  });

  it("falha que repete seguida de erro do SGS: para na segunda, com o motivo do SGS", async () => {
    const { opcoes, esperas } = preparar([
      html(sgsErro502Html, 502),
      json(sgsErro404SemValores, 404),
    ]);
    const resposta = await buscarSerie("433", "2026-11-01", opcoes);
    expect(resposta).toMatchObject({
      ok: false,
      motivo: `o BCB respondeu erro 404: ${ERRO_404_DETALHE}`,
      tentativas: 2,
    });
    expect(esperas).toEqual([3000]);
  });

  it("nunca lança, mesmo quando o fetch lança algo que não é Error", async () => {
    const { opcoes } = preparar([{ lancar: "cabo desligado" }, { lancar: null }]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({
      ok: false,
      motivo: "sem resposta do BCB: null",
      tentativas: 2,
    });
  });

  it("falha de rede com causa (fetch do Node): o motivo traz o código da causa", async () => {
    const causa = Object.assign(new Error("getaddrinfo ENOTFOUND api.bcb.gov.br"), {
      code: "ENOTFOUND",
    });
    const { opcoes } = preparar([{ lancar: new TypeError("fetch failed", { cause: causa }) }], {
      tentativas: 1,
    });
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toEqual({
      ok: false,
      motivo: "sem resposta do BCB: TypeError (ENOTFOUND)",
      url: URL_433_DESDE_SET,
      tentativas: 1,
    });
  });

  it("falha de rede com causa sem código: o motivo traz a mensagem da causa", async () => {
    const { opcoes } = preparar(
      [{ lancar: new TypeError("fetch failed", { cause: new Error("bad port") }) }],
      { tentativas: 1 },
    );
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({
      ok: false,
      motivo: "sem resposta do BCB: TypeError (bad port)",
      tentativas: 1,
    });
  });
});

describe("buscarSerie · opções de tentativas, espera e tempo-limite", () => {
  it("(11) tentativas: 1 nunca repete, nem para 502 nem para falha de rede", async () => {
    const a = preparar([html(sgsErro502Html, 502)], { tentativas: 1 });
    const respostaA = await buscarSerie("433", "2026-09-01", a.opcoes);
    expect(respostaA).toMatchObject({
      ok: false,
      motivo: "o BCB respondeu HTTP 502",
      tentativas: 1,
    });
    expect(a.chamadas).toHaveLength(1);
    expect(a.esperas).toEqual([]);

    const b = preparar([{ lancar: new TypeError("Failed to fetch") }], { tentativas: 1 });
    const respostaB = await buscarSerie("433", "2026-09-01", b.opcoes);
    expect(respostaB).toMatchObject({
      ok: false,
      motivo: "sem resposta do BCB: TypeError",
      tentativas: 1,
    });
    expect(b.chamadas).toHaveLength(1);
    expect(b.esperas).toEqual([]);
  });

  it("tentativas: 3 e esperaMs: 2000 (como no script): três 502 → três tentativas e duas esperas", async () => {
    const { opcoes, chamadas, esperas } = preparar(
      [html(sgsErro502Html, 502), html(sgsErro502Html, 503), html(sgsErro502Html, 502)],
      { tentativas: 3, esperaMs: 2000 },
    );
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({
      ok: false,
      motivo: "o BCB respondeu HTTP 502",
      tentativas: 3,
    });
    expect(chamadas).toHaveLength(3);
    expect(esperas).toEqual([2000, 2000]);
  });

  it("tentativas: 3 recupera na terceira e para de pedir", async () => {
    const { opcoes, chamadas, esperas } = preparar(
      [
        { lancar: new TypeError("Failed to fetch") },
        html(sgsErro502Html, 502),
        json(sgs433DesdeSet),
      ],
      { tentativas: 3 },
    );
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({ ok: true, tentativas: 3 });
    expect(chamadas).toHaveLength(3);
    expect(esperas).toEqual([3000, 3000]);
  });

  it.each([0, -2, Number.NaN])(
    "tentativas %p vale como uma só (sempre há ao menos um pedido)",
    async (tentativas) => {
      const { opcoes, chamadas, esperas } = preparar([html(sgsErro502Html, 502)], { tentativas });
      const resposta = await buscarSerie("433", "2026-09-01", opcoes);
      expect(resposta).toMatchObject({ ok: false, tentativas: 1 });
      expect(chamadas).toHaveLength(1);
      expect(esperas).toEqual([]);
    },
  );

  it("sem dormir injetado, usa a espera padrão (setTimeout) com o esperaMs informado", async () => {
    const { fetch, chamadas } = fetchFalso([html(sgsErro502Html, 502), json(sgs433DesdeSet)]);
    const resposta = await buscarSerie("433", "2026-09-01", { fetch, esperaMs: 0 });
    expect(resposta).toMatchObject({ ok: true, tentativas: 2 });
    expect(chamadas).toHaveLength(2);
  });

  it("um dormir que lança não impede a repetição nem faz buscarSerie lançar", async () => {
    const { fetch, chamadas } = fetchFalso([html(sgsErro502Html, 502), json(sgs433DesdeSet)]);
    const dormir = (): Promise<void> => Promise.reject(new Error("relógio quebrado"));
    const resposta = await buscarSerie("433", "2026-09-01", { fetch, dormir });
    expect(resposta).toMatchObject({ ok: true, tentativas: 2 });
    expect(chamadas).toHaveLength(2);
  });

  it("tempoLimiteMs aborta pelo AbortSignal.timeout um pedido que nunca responde", async () => {
    const chamadas: ChamadaFetch[] = [];
    // fetch falso que só termina quando o sinal de tempo-limite dispara, como faria a rede parada.
    const fetchParado: typeof globalThis.fetch = (entrada, init) => {
      chamadas.push({ url: String(entrada), init });
      return new Promise<Response>((_, rejeitar) => {
        const sinal = init?.signal;
        if (!sinal) {
          rejeitar(new Error("o pedido veio sem sinal de tempo-limite"));
          return;
        }
        sinal.addEventListener("abort", () => rejeitar(sinal.reason as unknown));
      });
    };
    const { dormir, esperas } = dormirFalso();
    const resposta = await buscarSerie("433", "2026-09-01", {
      fetch: fetchParado,
      dormir,
      tempoLimiteMs: 5,
      tentativas: 1,
    });
    expect(resposta).toMatchObject({
      ok: false,
      motivo: "sem resposta do BCB: TimeoutError",
      tentativas: 1,
    });
    expect(chamadas[0]?.init?.signal).toBeInstanceOf(AbortSignal);
    expect(esperas).toEqual([]);
  });
});

describe("buscarSerie: bordas do tempo-limite e do status 5xx", () => {
  const html = "<!doctype html><title>erro</title>";
  const json = '[{"data":"01/09/2026","valor":"0.82"}]';

  it("HTTP 500 (a fronteira do 5xx) repete como o 502", async () => {
    const respostas = [new Response(html, { status: 500 }), new Response(json, { status: 200 })];
    const esperas: number[] = [];
    const r = await buscarSerie("433", "2026-09-01", {
      fetch: (async () => respostas.shift() ?? new Response("", { status: 500 })) as typeof fetch,
      dormir: async (ms) => void esperas.push(ms),
    });
    expect(r.ok).toBe(true);
    expect(r.tentativas).toBe(2);
    expect(esperas).toEqual([3000]);
  });

  it("cada tentativa recebe um AbortSignal novo, ainda não abortado", async () => {
    const sinais: AbortSignal[] = [];
    let chamadas = 0;
    const r = await buscarSerie("433", "2026-09-01", {
      fetch: (async (_url, init) => {
        sinais.push(init?.signal as AbortSignal);
        chamadas += 1;
        if (chamadas === 1) throw new TypeError("Failed to fetch");
        return new Response(json, { status: 200 });
      }) as typeof fetch,
      dormir: async () => undefined,
    });
    expect(r.ok).toBe(true);
    expect(sinais).toHaveLength(2);
    expect(sinais[0]).toBeInstanceOf(AbortSignal);
    expect(sinais[0]).not.toBe(sinais[1]);
    expect(sinais.every((s) => !s.aborted)).toBe(true);
  });

  it("sem tempoLimiteMs, pede AbortSignal.timeout com os 20 s do padrão", async () => {
    const espiao = vi.spyOn(AbortSignal, "timeout");
    try {
      await buscarSerie("433", "2026-09-01", {
        fetch: (async () => new Response(json, { status: 200 })) as typeof fetch,
      });
      expect(espiao).toHaveBeenCalledWith(20_000);
    } finally {
      espiao.mockRestore();
    }
  });
});
