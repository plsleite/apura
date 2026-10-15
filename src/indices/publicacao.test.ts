import { describe, expect, it } from "vitest";
import type { ArquivoSerie, CodigoSerie } from "../compartilhado/tipos.ts";
import {
  conferirPublicacao,
  conferirSitePublicado,
  lerVersaoDoSite,
  montarVersaoDoSite,
  type VersaoDoSite,
} from "./publicacao.ts";

function arquivo(codigo: CodigoSerie, obtidoEm: string): ArquivoSerie {
  return {
    formato: "apura/serie@1",
    codigo,
    nome: `série ${codigo}`,
    origem: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados?formato=json`,
    obtidoEm,
    valores: [{ competencia: "2026-09", valor: "0.48" }],
  };
}

describe("versao.json do site (§19.2)", () => {
  it("leva a versão e a obtenção mais recente entre as séries, comparada pelo instante", () => {
    // 23:11 em UTC são 20:11 em Brasília: anterior às 20:30 de Brasília, embora venha depois na ordem alfabética
    expect(
      montarVersaoDoSite("0.1.0", [
        arquivo("433", "2026-10-11T23:11:55.140Z"),
        arquivo("4390", "2026-10-11T20:30:00-03:00"),
        arquivo("189", "2026-10-10T10:47:00-03:00"),
      ]),
    ).toEqual({
      formato: "apura/versao-do-site@1",
      versao: "0.1.0",
      indicesAtualizadosEm: "2026-10-11T20:30:00-03:00",
    });
  });

  it("sem séries, a data fica vazia", () => {
    expect(montarVersaoDoSite("0.1.0", []).indicesAtualizadosEm).toBe("");
  });
});

const versao = (indicesAtualizadosEm: string): VersaoDoSite => ({
  formato: "apura/versao-do-site@1",
  versao: "0.1.0",
  indicesAtualizadosEm,
});
const MAIN = versao("2026-11-20T10:47:12-03:00");
const ANTERIOR = versao("2026-11-19T22:47:05-03:00");

describe("lerVersaoDoSite", () => {
  it("lê o arquivo no formato; recusa o resto", () => {
    expect(lerVersaoDoSite(JSON.stringify(MAIN))).toEqual(MAIN);
    expect(lerVersaoDoSite("<!doctype html><title>404</title>")).toBeNull();
    expect(lerVersaoDoSite(JSON.stringify({ ...MAIN, formato: "outro" }))).toBeNull();
    expect(lerVersaoDoSite(JSON.stringify({ ...MAIN, indicesAtualizadosEm: 3 }))).toBeNull();
    expect(lerVersaoDoSite(JSON.stringify({ ...MAIN, versao: undefined }))).toBeNull();
    expect(lerVersaoDoSite("null")).toBeNull();
  });

  it("recusa data que não seja data-hora com fuso (vazia, sem fuso, com quebra de linha)", () => {
    for (const data of ["", "2026-10-14T10:48:00", "2026-10-14T10:48:00-03:00\n::error::x"]) {
      expect(lerVersaoDoSite(JSON.stringify({ ...MAIN, indicesAtualizadosEm: data }))).toBeNull();
    }
  });
});

describe("conferirPublicacao (§19.4)", () => {
  it("em dia: os mesmos índices da main", () => {
    expect(conferirPublicacao(MAIN, MAIN, "2026-11-20T14:17:30-03:00")).toEqual({
      ok: true,
      mensagem:
        "O site publicado está em dia: índices de 20/11/2026 10:47 (horário de Brasília), os mesmos da main.",
    });
  });

  it("main mais nova há menos de 30 minutos: a publicação pode estar em andamento", () => {
    expect(conferirPublicacao(MAIN, ANTERIOR, "2026-11-20T11:16:59-03:00")).toEqual({
      ok: true,
      mensagem:
        "A main tem os índices de 20/11/2026 10:47, gravados há menos de 30 minutos; o site publicado ainda tem os de 19/11/2026 22:47 (horário de Brasília): a publicação pode estar em andamento.",
    });
  });

  it("site atrasado: a frase do design, com o que fazer", () => {
    expect(conferirPublicacao(MAIN, ANTERIOR, "2026-11-20T14:17:30-03:00")).toEqual({
      ok: false,
      mensagem:
        "O site publicado tem os índices de 19/11/2026 22:47; a main tem os de 20/11/2026 10:47 (horário de Brasília). Confira a última publicação no painel do Cloudflare Pages.",
    });
  });

  it("site com índices mais novos que a main: também é problema", () => {
    expect(conferirPublicacao(ANTERIOR, MAIN, "2026-11-20T14:17:30-03:00")).toEqual({
      ok: false,
      mensagem:
        "O site publicado tem índices mais novos (20/11/2026 10:47) que a main (19/11/2026 22:47, horário de Brasília): confira se a main recuou ou se outra versão foi publicada.",
    });
  });

  it("a mesma obtenção escrita em outro fuso está em dia", () => {
    expect(
      conferirPublicacao(MAIN, versao("2026-11-20T13:47:12Z"), "2026-11-20T14:17:30-03:00").ok,
    ).toBe(true);
  });
});

describe("conferirSitePublicado: lê o versao.json do site e confere (§19.4)", () => {
  const ENDERECO = "https://apura-dpems.pages.dev";
  const AGORA = "2026-11-20T14:17:30-03:00";

  function respostas(...lista: Array<Response | Error>) {
    const pedidos: string[] = [];
    const esperas: number[] = [];
    const fazerPedido = ((url: string) => {
      pedidos.push(url);
      const proxima = lista.shift();
      if (proxima === undefined) throw new Error("pedido a mais");
      return proxima instanceof Error ? Promise.reject(proxima) : Promise.resolve(proxima);
    }) as unknown as typeof fetch;
    const dormir = (ms: number) => {
      esperas.push(ms);
      return Promise.resolve();
    };
    return { pedidos, esperas, opcoes: { fetch: fazerPedido, dormir } };
  }

  it("lê <endereço>/versao.json uma vez e confere", async () => {
    const r = respostas(new Response(JSON.stringify(MAIN), { status: 200 }));
    expect(await conferirSitePublicado(`${ENDERECO}/`, MAIN, AGORA, r.opcoes)).toEqual({
      ok: true,
      mensagem:
        "O site publicado está em dia: índices de 20/11/2026 10:47 (horário de Brasília), os mesmos da main.",
    });
    expect(r.pedidos).toEqual([`${ENDERECO}/versao.json`]);
    expect(r.esperas).toEqual([]);
  });

  it("falha passageira: tenta de novo, até três vezes, com 10 s de espera", async () => {
    const semRede = Object.assign(new TypeError("fetch failed"), {
      cause: { code: "ENOTFOUND" },
    });
    const r = respostas(
      semRede,
      new Response("erro", { status: 503 }),
      new Response(JSON.stringify(MAIN), { status: 200 }),
    );
    expect((await conferirSitePublicado(ENDERECO, MAIN, AGORA, r.opcoes)).ok).toBe(true);
    expect(r.pedidos).toHaveLength(3);
    expect(r.esperas).toEqual([10_000, 10_000]);
  });

  it("fora do ar nas três tentativas: o motivo da última", async () => {
    const semRede = Object.assign(new TypeError("fetch failed"), {
      cause: { code: "ENOTFOUND" },
    });
    const r = respostas(semRede, new Response("x", { status: 404 }), semRede);
    expect(await conferirSitePublicado(ENDERECO, MAIN, AGORA, r.opcoes)).toEqual({
      ok: false,
      mensagem: `Não foi possível ler ${ENDERECO}/versao.json depois de 3 tentativas: sem resposta do site: TypeError (ENOTFOUND).`,
    });
  });

  it("HTTP de erro na última tentativa: o status", async () => {
    const r = respostas(
      new Response("x", { status: 404 }),
      new Response("x", { status: 404 }),
      new Response("x", { status: 404 }),
    );
    expect((await conferirSitePublicado(ENDERECO, MAIN, AGORA, r.opcoes)).mensagem).toBe(
      `Não foi possível ler ${ENDERECO}/versao.json depois de 3 tentativas: o site respondeu HTTP 404.`,
    );
  });

  it("arquivo fora do formato: não repete", async () => {
    const r = respostas(new Response("<!doctype html>", { status: 200 }));
    expect(await conferirSitePublicado(ENDERECO, MAIN, AGORA, r.opcoes)).toEqual({
      ok: false,
      mensagem: `O arquivo ${ENDERECO}/versao.json não está no formato esperado (apura/versao-do-site@1).`,
    });
    expect(r.pedidos).toHaveLength(1);
  });

  it("erro sem causa anexada: a mensagem do erro entra no motivo", async () => {
    const r = respostas(new Error("boom"), new Error("boom"), new Error("boom"));
    expect((await conferirSitePublicado(ENDERECO, MAIN, AGORA, r.opcoes)).mensagem).toBe(
      `Não foi possível ler ${ENDERECO}/versao.json depois de 3 tentativas: sem resposta do site: Error (boom).`,
    );
  });
});
