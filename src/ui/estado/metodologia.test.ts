import { describe, expect, it } from "vitest";
import type { Metodologia } from "../../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../../metodologias/padrao.ts";
import { validarMetodologia } from "../../motor/periodos.ts";
import { metodologiaSelicUnica } from "../../motor/testes/regime-novo.ts";
import {
  dividirPeriodo,
  ehPadrao,
  escolherIndice,
  escolherJuros,
  escolherOpcoes,
  escolherTaxa,
  removerDivisao,
  restaurarPadrao,
  resumirMetodologia,
} from "./metodologia.ts";

describe("resumirMetodologia (resumo em uma frase, §9.2)", () => {
  it("descreve a padrão TJMS/SAJ v1 e a SELIC única", () => {
    expect(resumirMetodologia(metodologiaPadrao())).toBe(
      "Até 29/08/2024: IGP-M e juros de 1% ao mês. Desde 30/08/2024: IPCA e taxa legal.",
    );
    expect(resumirMetodologia(metodologiaSelicUnica())).toBe(
      "Sempre: SELIC única (correção e juros juntos).",
    );
  });

  it("descreve três períodos, taxas com casas, 'sem correção', 'sem juros' e taxa inválida", () => {
    const m: Metodologia = {
      ...metodologiaPadrao(),
      periodos: [
        {
          de: null,
          ate: "2019-12-31",
          correcao: { indice: "INPC" },
          juros: { tipo: "percentualMensal", taxaMensal: "0.5" },
        },
        {
          de: "2020-01-01",
          ate: "2022-12-31",
          correcao: { indice: "nenhum" },
          juros: { tipo: "percentualMensal", taxaMensal: "0" },
        },
        {
          de: "2023-01-01",
          ate: null,
          correcao: { indice: "IPCA" },
          juros: { tipo: "percentualMensal", taxaMensal: "x" },
        },
      ],
    };
    expect(resumirMetodologia(m)).toBe(
      'Até 31/12/2019: INPC e juros de 0,50% ao mês. De 01/01/2020 a 31/12/2022: sem correção e sem juros. Desde 01/01/2023: IPCA e juros de "x" ao mês (taxa inválida).',
    );
    expect(resumirMetodologia({ ...m, periodos: [] })).toBe(
      "Sem períodos: nenhum lançamento recebe correção nem juros.",
    );
  });
});

describe("dividir e remover divisões", () => {
  it("divide o período que contém a data, copiando as regras, e marca 'ajustada'", () => {
    const { metodologia, aviso } = dividirPeriodo(metodologiaPadrao(), "2023-01-01");
    expect(aviso).toBeUndefined();
    expect(metodologia.ajustada).toBe(true);
    expect(metodologia.periodos.map((p) => [p.de, p.ate, p.correcao.indice, p.juros.tipo])).toEqual(
      [
        [null, "2022-12-31", "IGP-M", "percentualMensal"],
        ["2023-01-01", "2024-08-29", "IGP-M", "percentualMensal"],
        ["2024-08-30", null, "IPCA", "taxaLegal"],
      ],
    );
    expect(validarMetodologia(metodologia)).toEqual([]);
  });

  it("não divide numa data que já inicia um período nem fora dos períodos; avisa", () => {
    const naFronteira = dividirPeriodo(metodologiaPadrao(), "2024-08-30");
    expect(naFronteira.aviso).toBe("Já existe uma divisão em 30/08/2024.");
    expect(naFronteira.metodologia).toEqual(metodologiaPadrao());
    const semPeriodo: Metodologia = {
      ...metodologiaPadrao(),
      periodos: [
        { de: "2020-01-01", ate: null, correcao: { indice: "IPCA" }, juros: { tipo: "taxaLegal" } },
      ],
    };
    expect(dividirPeriodo(semPeriodo, "2019-05-05").aviso).toBe(
      "Nenhum período cobre 05/05/2019: nada foi dividido.",
    );
  });

  it("remover a divisão funde o período no anterior, que mantém as regras; a padrão volta a ser padrão", () => {
    const dividida = dividirPeriodo(metodologiaPadrao(), "2023-01-01").metodologia;
    const fundida = removerDivisao(dividida, 1);
    expect(fundida).toEqual(metodologiaPadrao());
    expect(fundida.ajustada).toBe(false);
    // remover a primeira "divisão" (índice 0) ou um índice inexistente não muda nada
    expect(removerDivisao(dividida, 0)).toBe(dividida);
    expect(removerDivisao(dividida, 9)).toBe(dividida);
    // remover a transição legal: um período só, com as regras antigas
    const semTransicao = removerDivisao(metodologiaPadrao(), 1);
    expect(semTransicao.periodos).toEqual([
      {
        de: null,
        ate: null,
        correcao: { indice: "IGP-M" },
        juros: { tipo: "percentualMensal", taxaMensal: "1" },
      },
    ]);
    expect(semTransicao.ajustada).toBe(true);
  });
});

describe("índice, juros, taxa e opções de cada período", () => {
  it("troca o índice e a taxa; a taxa só com juros percentuais", () => {
    const comInpc = escolherIndice(metodologiaPadrao(), 0, "INPC");
    expect(comInpc.periodos[0]?.correcao).toEqual({ indice: "INPC" });
    expect(comInpc.ajustada).toBe(true);
    const comTaxa = escolherTaxa(comInpc, 0, "0.5");
    expect(comTaxa.periodos[0]?.juros).toEqual({ tipo: "percentualMensal", taxaMensal: "0.5" });
    expect(escolherTaxa(comTaxa, 1, "2")).toBe(comTaxa);
    expect(escolherIndice(comTaxa, 5, "IPCA")).toBe(comTaxa);
  });

  it("'SELIC única' é uma escolha só: juros selicUnica e correção 'nenhum'; o índice fica travado em 'nenhum'", () => {
    const selic = escolherJuros(metodologiaPadrao(), 0, "selicUnica");
    expect(selic.periodos[0]).toEqual({
      de: null,
      ate: "2024-08-29",
      correcao: { indice: "nenhum" },
      juros: { tipo: "selicUnica" },
    });
    expect(escolherIndice(selic, 0, "IGP-M").periodos[0]?.correcao).toEqual({ indice: "nenhum" });
    expect(validarMetodologia(selic)).toEqual([]);
    // voltar a juros percentuais recupera 1% ao mês; a taxa legal não tem taxa
    expect(escolherJuros(selic, 0, "percentualMensal").periodos[0]?.juros).toEqual({
      tipo: "percentualMensal",
      taxaMensal: "1",
    });
    expect(escolherJuros(selic, 0, "taxaLegal").periodos[0]?.juros).toEqual({ tipo: "taxaLegal" });
    // trocar para taxa legal preserva a taxa anterior ao voltar? não: ela se perde, e volta o padrão 1
    const legal = escolherJuros(escolherTaxa(metodologiaPadrao(), 0, "2"), 0, "taxaLegal");
    expect(escolherJuros(legal, 0, "percentualMensal").periodos[0]?.juros).toEqual({
      tipo: "percentualMensal",
      taxaMensal: "1",
    });
  });

  it("incidência no mês inicial e deflação; restaurar o padrão zera tudo", () => {
    const opcoes = escolherOpcoes(metodologiaPadrao(), {
      incidenciaMesInicial: "mesSeguinte",
      deflacao: "zerarNegativos",
    });
    expect(opcoes).toMatchObject({
      incidenciaMesInicial: "mesSeguinte",
      deflacao: "zerarNegativos",
      ajustada: true,
    });
    expect(ehPadrao(opcoes)).toBe(false);
    expect(
      escolherOpcoes(opcoes, { incidenciaMesInicial: "proRata", deflacao: "aplicarComPiso" })
        .ajustada,
    ).toBe(false);
    expect(restaurarPadrao()).toEqual(metodologiaPadrao());
    expect(ehPadrao({ ...metodologiaPadrao(), ajustada: true })).toBe(true);
  });
});
