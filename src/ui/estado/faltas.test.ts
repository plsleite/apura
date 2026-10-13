import { describe, expect, it } from "vitest";
import type { Lancamento } from "../../compartilhado/tipos.ts";
import { novoCalculo } from "./calculo.ts";
import { faltasDaBase } from "./faltas.ts";

const prestacao = (extra: Partial<Lancamento> = {}): Lancamento => ({
  id: "p-2026-09",
  tipo: "prestacao",
  data: "2026-09-05",
  competencia: "2026-09",
  origem: "lote",
  editado: false,
  ...extra,
});

function calculo(lancamentos: Lancamento[]) {
  const c = novoCalculo({ id: "c", agora: "2026-10-11T15:00:00-03:00", hoje: "2026-10-11" });
  c.lancamentos = lancamentos;
  return c;
}

describe("o que falta na base dos alimentos (decisão de 13/10/2026)", () => {
  it("sem prestação pela base, nada falta; com ela, o campo em branco é apontado", () => {
    expect(faltasDaBase(calculo([]))).toEqual([]);
    expect(faltasDaBase(calculo([prestacao({ valorInformado: "500.00" })]))).toEqual([]);
    expect(faltasDaBase(calculo([prestacao()]))).toEqual([
      {
        campo: "valor",
        erro: "Informe o valor fixado.",
        aviso:
          "Falta o valor fixado (seção 2 · Base dos alimentos): as prestações ficam sem valor até ele ser informado.",
      },
    ]);
  });

  it("percentual do salário mínimo; percentual e rendimento padrão dos rendimentos", () => {
    const sm = calculo([prestacao()]);
    sm.base = { tipo: "percentualSalarioMinimo", percentual: "" };
    expect(faltasDaBase(sm).map((f) => f.aviso)).toEqual([
      "Falta o percentual do salário mínimo (seção 2 · Base dos alimentos): as prestações ficam sem valor até ele ser informado.",
    ]);
    sm.base = { tipo: "percentualSalarioMinimo", percentual: "30" };
    expect(faltasDaBase(sm)).toEqual([]);
    const rend = calculo([prestacao()]);
    rend.base = { tipo: "percentualRendimentos", percentual: "", rendimentoPadrao: "" };
    expect(faltasDaBase(rend).map((f) => [f.campo, f.erro])).toEqual([
      ["percentual", "Informe o percentual."],
      ["rendimentoPadrao", "Informe o rendimento padrão."],
    ]);
    // prestação com rendimento próprio dispensa o rendimento padrão
    rend.lancamentos = [prestacao({ rendimento: "2000.00" })];
    expect(faltasDaBase(rend).map((f) => f.campo)).toEqual(["percentual"]);
  });
});
