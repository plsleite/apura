import { describe, expect, it } from "vitest";
import { interpretarRespostaSgs, montarArquivoSerie, RespostaSgsInvalida } from "./cliente-bcb.ts";
import { SERIES, urlDaSerie } from "./series.ts";
import respostaGravada from "./testes/sgs-189-2017-2018.json?raw";

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
    expect(() => interpretarRespostaSgs('[{"data":"01/01/2017","valor":null}]')).toThrow(
      RespostaSgsInvalida,
    );
    expect(() => interpretarRespostaSgs("[1, 2]")).toThrow(RespostaSgsInvalida);
  });

  it("devolve lista vazia para resposta vazia (quem chama decide o que fazer)", () => {
    expect(interpretarRespostaSgs("[]")).toEqual([]);
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
