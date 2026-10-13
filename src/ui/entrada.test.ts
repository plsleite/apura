import { describe, expect, it } from "vitest";
import {
  formatarCompetenciaParaCampo,
  formatarDataParaCampo,
  formatarMoedaParaCampo,
  formatarNumeroParaCampo,
  formatarNumeroProcesso,
  lerCompetenciaTexto,
  lerData,
  lerDataTexto,
  lerDecimal,
  lerInteiro,
  lerNumeroProcesso,
  lerPercentual,
  lerValorPositivo,
  mascaraData,
} from "./entrada.ts";

describe("lerDecimal (entrada em pt-BR, §9.4)", () => {
  it("aceita vírgula nos centavos e ponto só como separador de milhar", () => {
    expect(lerDecimal("1.234,56")).toEqual({ ok: true, valor: "1234.56" });
    expect(lerDecimal("1234,56")).toEqual({ ok: true, valor: "1234.56" });
    expect(lerDecimal("1.234")).toEqual({ ok: true, valor: "1234" });
    expect(lerDecimal("1.234.567,8")).toEqual({ ok: true, valor: "1234567.8" });
    expect(lerDecimal("1234")).toEqual({ ok: true, valor: "1234" });
    expect(lerDecimal("0,3")).toEqual({ ok: true, valor: "0.3" });
    expect(lerDecimal(",5")).toEqual({ ok: true, valor: "0.5" });
    expect(lerDecimal("-1,10")).toEqual({ ok: true, valor: "-1.10" });
  });

  it("ignora R$, % e espaços em volta", () => {
    expect(lerDecimal(" R$ 1.500,00 ")).toEqual({ ok: true, valor: "1500.00" });
    expect(lerDecimal("30 %")).toEqual({ ok: true, valor: "30" });
    expect(lerDecimal("R$ 1,00")).toEqual({ ok: true, valor: "1.00" });
  });

  it("recusa o ponto como separador decimal, para nunca ler 1,50 como 15", () => {
    const erro = "Use vírgula para os centavos (ex.: 1.234,56 ou 1234,56).";
    expect(lerDecimal("1.5")).toEqual({ ok: false, erro });
    expect(lerDecimal("12.34")).toEqual({ ok: false, erro });
    expect(lerDecimal("1.2345")).toEqual({ ok: false, erro });
    expect(lerDecimal("1,2,3")).toEqual({ ok: false, erro });
    expect(lerDecimal("1,")).toEqual({ ok: false, erro });
    expect(lerDecimal("abc")).toEqual({ ok: false, erro });
    expect(lerDecimal("1e3")).toEqual({ ok: false, erro });
    expect(lerDecimal("--1")).toEqual({ ok: false, erro });
  });

  it('recusa grupo de milhar que começa por zero ("0.500" não é 500)', () => {
    const erro = "Use vírgula para os centavos (ex.: 1.234,56 ou 1234,56).";
    expect(lerDecimal("0.500")).toEqual({ ok: false, erro });
    expect(lerDecimal("0.075")).toEqual({ ok: false, erro });
    expect(lerDecimal("-0.500")).toEqual({ ok: false, erro });
    expect(lerDecimal("0,500")).toEqual({ ok: true, valor: "0.500" });
    expect(lerDecimal("1.000")).toEqual({ ok: true, valor: "1000" });
    expect(lerDecimal("10.000,50")).toEqual({ ok: true, valor: "10000.50" });
  });

  it("vazio pede um número", () => {
    expect(lerDecimal("")).toEqual({ ok: false, erro: "Informe um número." });
    expect(lerDecimal("   ")).toEqual({ ok: false, erro: "Informe um número." });
  });
});

describe("lerValorPositivo, lerPercentual e lerInteiro", () => {
  it("valor em reais precisa ser maior que zero", () => {
    expect(lerValorPositivo("450,00")).toEqual({ ok: true, valor: "450.00" });
    expect(lerValorPositivo("0")).toEqual({ ok: false, erro: "Informe um valor maior que zero." });
    expect(lerValorPositivo("-5")).toEqual({ ok: false, erro: "Informe um valor maior que zero." });
    expect(lerValorPositivo("x")).toEqual({
      ok: false,
      erro: "Use vírgula para os centavos (ex.: 1.234,56 ou 1234,56).",
    });
  });

  it("percentual aceita zero e recusa negativo", () => {
    expect(lerPercentual("0")).toEqual({ ok: true, valor: "0" });
    expect(lerPercentual("10")).toEqual({ ok: true, valor: "10" });
    expect(lerPercentual("33,333")).toEqual({ ok: true, valor: "33.333" });
    expect(lerPercentual("-1")).toEqual({ ok: false, erro: "O percentual não pode ser negativo." });
  });

  it("inteiro dentro da faixa", () => {
    expect(lerInteiro("5", 1, 31)).toEqual({ ok: true, valor: 5 });
    expect(lerInteiro(" 31 ", 1, 31)).toEqual({ ok: true, valor: 31 });
    const erro = { ok: false, erro: "Informe um número inteiro de 1 a 31." };
    expect(lerInteiro("0", 1, 31)).toEqual(erro);
    expect(lerInteiro("32", 1, 31)).toEqual(erro);
    expect(lerInteiro("5,5", 1, 31)).toEqual(erro);
    expect(lerInteiro("", 1, 31)).toEqual(erro);
    expect(lerInteiro("-1", 1, 31)).toEqual(erro);
  });
});

describe("competências e formatação para os campos", () => {
  it("lê mm/aaaa e m/aaaa; recusa mês ou formato inválido", () => {
    expect(lerCompetenciaTexto("10/2026")).toEqual({ ok: true, valor: "2026-10" });
    expect(lerCompetenciaTexto("1/2026")).toEqual({ ok: true, valor: "2026-01" });
    expect(lerCompetenciaTexto(" 08 / 2025 ")).toEqual({ ok: true, valor: "2025-08" });
    const erro = { ok: false, erro: "Informe o mês como mm/aaaa (ex.: 10/2026)." };
    expect(lerCompetenciaTexto("13/2026")).toEqual(erro);
    expect(lerCompetenciaTexto("2026-10")).toEqual(erro);
    expect(lerCompetenciaTexto("10/26")).toEqual(erro);
    expect(lerCompetenciaTexto("10/1899")).toEqual(erro);
    expect(lerCompetenciaTexto("")).toEqual(erro);
  });

  it("lê a data de um campo de data e recusa vazio, 30/02 e anos antes de 1900", () => {
    expect(lerData("2026-10-05")).toEqual({ ok: true, valor: "2026-10-05" });
    const erro = { ok: false, erro: "Informe a data (dia, mês e ano a partir de 1900)." };
    expect(lerData("")).toEqual(erro);
    expect(lerData("2026-02-30")).toEqual(erro);
    expect(lerData("1899-12-31")).toEqual(erro);
    expect(lerData("05/10/2026")).toEqual(erro);
  });

  it("formata de volta para os campos", () => {
    expect(formatarCompetenciaParaCampo("2026-10")).toBe("10/2026");
    expect(formatarMoedaParaCampo("1234.5")).toBe("1.234,50");
    expect(formatarMoedaParaCampo("1234567")).toBe("1.234.567,00");
    expect(formatarMoedaParaCampo("0.3")).toBe("0,30");
    expect(formatarMoedaParaCampo("-45.1")).toBe("-45,10");
    expect(formatarMoedaParaCampo("")).toBe("");
    expect(formatarNumeroParaCampo("33.333")).toBe("33,333");
    expect(formatarNumeroParaCampo("10")).toBe("10");
  });
});

describe("data digitada na tabela (dd/mm/aaaa, decisão de 13/10/2026)", () => {
  it("a máscara põe as barras; a leitura aceita só datas válidas a partir de 1900", () => {
    expect(formatarDataParaCampo("2026-09-05")).toBe("05/09/2026");
    expect(mascaraData("0")).toBe("0");
    expect(mascaraData("050")).toBe("05/0");
    expect(mascaraData("05092")).toBe("05/09/2");
    expect(mascaraData("050920261")).toBe("05/09/2026");
    expect(mascaraData("05/09/2026")).toBe("05/09/2026");
    expect(lerDataTexto("05/09/2026")).toEqual({ ok: true, valor: "2026-09-05" });
    const erro = { ok: false, erro: "Informe a data como dd/mm/aaaa (ex.: 05/09/2026)." };
    expect(lerDataTexto("31/02/2026")).toEqual(erro);
    expect(lerDataTexto("05/09/202")).toEqual(erro);
    expect(lerDataTexto("31/12/1899")).toEqual(erro);
    expect(lerDataTexto("")).toEqual(erro);
  });
});

describe("número do processo no padrão do CNJ (Resolução CNJ 65/2008)", () => {
  it("a máscara põe hífen e pontos à medida que os números chegam, e aceita texto colado", () => {
    expect(formatarNumeroProcesso("0800000")).toBe("0800000");
    expect(formatarNumeroProcesso("08000004")).toBe("0800000-4");
    expect(formatarNumeroProcesso("080000046")).toBe("0800000-46");
    expect(formatarNumeroProcesso("0800000462026")).toBe("0800000-46.2026");
    expect(formatarNumeroProcesso("08000004620268")).toBe("0800000-46.2026.8");
    expect(formatarNumeroProcesso("0800000462026812")).toBe("0800000-46.2026.8.12");
    expect(formatarNumeroProcesso("08000004620268120001")).toBe("0800000-46.2026.8.12.0001");
    expect(formatarNumeroProcesso("0800000-46.2026.8.12.0001")).toBe("0800000-46.2026.8.12.0001");
    expect(formatarNumeroProcesso("080000046202681200019999")).toBe("0800000-46.2026.8.12.0001");
    expect(formatarNumeroProcesso("abc")).toBe("");
  });

  it("confere os dígitos verificadores; vazio é aceito; incompleto ou com dígito errado é recusado", () => {
    expect(lerNumeroProcesso("0800000-46.2026.8.12.0001")).toEqual({
      ok: true,
      valor: "0800000-46.2026.8.12.0001",
    });
    expect(lerNumeroProcesso("08000004620268120001")).toEqual({
      ok: true,
      valor: "0800000-46.2026.8.12.0001",
    });
    // outro tribunal também passa (o formato e os dígitos são os do CNJ)
    expect(lerNumeroProcesso("0800000-50.2026.8.26.0100").ok).toBe(true);
    expect(lerNumeroProcesso("")).toEqual({ ok: true, valor: "" });
    const erro = { ok: false, erro: "Número do processo inválido (confira os dígitos)." };
    expect(lerNumeroProcesso("0800000-45.2026.8.12.0001")).toEqual(erro);
    expect(lerNumeroProcesso("0800000-46.2026.8.12.001")).toEqual(erro);
    expect(lerNumeroProcesso("processo")).toEqual(erro);
  });
});
