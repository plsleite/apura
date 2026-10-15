import { describe, expect, it } from "vitest";
import type { ArquivoSerie, CodigoSerie } from "../compartilhado/tipos.ts";
import { montarVersaoDoSite } from "./publicacao.ts";

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
