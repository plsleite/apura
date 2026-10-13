import { describe, expect, it } from "vitest";
import type { Calculo, Lancamento } from "../../compartilhado/tipos.ts";
import { tabelaRegimeNovo } from "../../motor/testes/regime-novo.ts";
import { novoCalculo } from "./calculo.ts";
import { dividirPeriodo } from "./metodologia.ts";
import { sugerirPagamento, sugerirPrestacao, valorPelaBase } from "./novaLinha.ts";

const HOJE = "2026-10-11";

function calculoCom(lancamentos: Lancamento[], base?: Calculo["base"]): Calculo {
  const calculo = novoCalculo({ id: "c", agora: "2026-10-11T15:00:00-03:00", hoje: HOJE });
  calculo.base = base ?? {
    tipo: "valorFixo",
    valor: "1000.00",
    dataFixacao: "2024-01-10",
    indiceReajuste: "nenhum",
    mesReajuste: 1,
  };
  calculo.lancamentos = lancamentos;
  return calculo;
}

const prestacao = (id: string, data: string, extra: Partial<Lancamento> = {}): Lancamento => ({
  id,
  tipo: "prestacao",
  data,
  competencia: data.slice(0, 7),
  origem: "lote",
  editado: false,
  ...extra,
});

describe("sugestões da linha nova (decisões de 13/10/2026)", () => {
  it("prestação: mês seguinte ao da última, mesmo dia; valor pela base", () => {
    const calculo = calculoCom([
      prestacao("p-2026-08", "2026-08-05"),
      prestacao("p-2026-09", "2026-09-05"),
    ]);
    expect(sugerirPrestacao(calculo, tabelaRegimeNovo())).toEqual({
      tipo: "prestacao",
      data: "2026-10-05",
      valor: "1000.00",
      pelaBase: true,
    });
    // dia 31 em mês curto cai no último dia
    const fim = calculoCom([prestacao("p-2026-01", "2026-01-31")]);
    expect(sugerirPrestacao(fim, tabelaRegimeNovo()).data).toBe("2026-02-28");
  });

  it("prestação: sem prestação anterior, a data de elaboração; base em % do salário mínimo dá o valor do mês", () => {
    const calculo = calculoCom([], { tipo: "percentualSalarioMinimo", percentual: "30" });
    expect(sugerirPrestacao(calculo, tabelaRegimeNovo())).toEqual({
      tipo: "prestacao",
      data: HOJE,
      valor: "486.30",
      pelaBase: true,
    });
    expect(valorPelaBase(calculo, tabelaRegimeNovo(), "2025-03-10")).toBe("455.40");
    // base sem como apurar (valor fixo em branco): sem sugestão
    const embranco = calculoCom([], {
      ...calculo.base,
      tipo: "valorFixo",
      valor: "",
      dataFixacao: HOJE,
      indiceReajuste: "nenhum",
      mesReajuste: 10,
    });
    expect(valorPelaBase(embranco, tabelaRegimeNovo(), HOJE)).toBe("");
  });

  it("prestação: a última tinha valor informado à mão, a nova vem com o mesmo valor, também informado", () => {
    const calculo = calculoCom([
      prestacao("p-2026-09", "2026-09-05", { valorInformado: "1200.00" }),
    ]);
    expect(sugerirPrestacao(calculo, tabelaRegimeNovo())).toEqual({
      tipo: "prestacao",
      data: "2026-10-05",
      valor: "1200.00",
      pelaBase: false,
    });
  });

  it("um 13º ou férias avulsos (com descrição) não servem de modelo: vale a última prestação comum", () => {
    const calculo = calculoCom([
      prestacao("p-2025-12", "2025-12-10"),
      prestacao("p-2025-12-2", "2025-12-20", {
        origem: "avulso",
        descricao: "13º salário 2025",
        valorInformado: "1000.00",
      }),
    ]);
    expect(sugerirPrestacao(calculo, tabelaRegimeNovo())).toMatchObject({
      data: "2026-01-10",
      pelaBase: true,
    });
  });

  it("herda só as regras próprias de correção e juros, não os termos próprios (datas)", () => {
    const calculo = calculoCom([]);
    const regras = dividirPeriodo(calculo.metodologia, "2023-01-01").metodologia;
    calculo.lancamentos = [
      prestacao("p-2026-09", "2026-09-05", {
        encargos: { metodologia: regras, termoFinalJuros: "2026-09-30" },
      }),
    ];
    const sugestao = sugerirPrestacao(calculo, tabelaRegimeNovo());
    expect(sugestao.encargos).toEqual({ metodologia: regras });
    expect(sugestao.encargos?.metodologia).not.toBe(regras);
  });

  it("pagamento: data de hoje e o valor do último pagamento; sem pagamento anterior, valor em branco", () => {
    const pagamento: Lancamento = {
      id: "a-2026-09",
      tipo: "amortizacao",
      data: "2026-09-05",
      valorInformado: "400.00",
      origem: "lote",
      editado: false,
    };
    expect(sugerirPagamento(calculoCom([pagamento]))).toEqual({
      tipo: "amortizacao",
      data: HOJE,
      valor: "400.00",
      pelaBase: false,
    });
    expect(sugerirPagamento(calculoCom([]))).toEqual({
      tipo: "amortizacao",
      data: HOJE,
      valor: "",
      pelaBase: false,
    });
  });
});
