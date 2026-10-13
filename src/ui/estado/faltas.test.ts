import { describe, expect, it } from "vitest";
import type { Lancamento } from "../../compartilhado/tipos.ts";
import { baseUnica } from "../../motor/base.ts";
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
        periodo: 0,
        campo: "valor",
        erro: "Informe o valor fixado.",
        aviso:
          "Falta o valor fixado (seção 2 · Base dos alimentos): as prestações ficam sem valor até ele ser informado.",
      },
    ]);
  });

  it("percentual do salário mínimo; percentual e rendimento padrão dos rendimentos", () => {
    const sm = calculo([prestacao()]);
    sm.base = baseUnica({ tipo: "percentualSalarioMinimo", percentual: "" });
    expect(faltasDaBase(sm).map((f) => f.aviso)).toEqual([
      "Falta o percentual do salário mínimo (seção 2 · Base dos alimentos): as prestações ficam sem valor até ele ser informado.",
    ]);
    sm.base = baseUnica({ tipo: "percentualSalarioMinimo", percentual: "30" });
    expect(faltasDaBase(sm)).toEqual([]);
    const rend = calculo([prestacao()]);
    rend.base = baseUnica({ tipo: "percentualRendimentos", percentual: "", rendimentoPadrao: "" });
    expect(faltasDaBase(rend).map((f) => [f.campo, f.erro])).toEqual([
      ["percentual", "Informe o percentual."],
      ["rendimentoPadrao", "Informe o rendimento padrão."],
    ]);
    // prestação com rendimento próprio dispensa o rendimento padrão
    rend.lancamentos = [prestacao({ rendimento: "2000.00" })];
    expect(faltasDaBase(rend).map((f) => f.campo)).toEqual(["percentual"]);
  });

  it("base por períodos: o aviso diz qual período, e só avisa o período em que vence alguma prestação pela base (§17.2)", () => {
    const c = calculo([prestacao({ id: "p-2026-09", data: "2026-09-05" })]);
    c.base = {
      periodos: [
        {
          de: null,
          ate: "2024-12-31",
          forma: {
            tipo: "valorFixo",
            valor: "",
            dataFixacao: "2024-03-10",
            indiceReajuste: "nenhum",
            mesReajuste: 3,
          },
        },
        {
          de: "2025-01-01",
          ate: null,
          forma: { tipo: "percentualRendimentos", percentual: "", rendimentoPadrao: "" },
        },
      ],
    };
    // nenhuma prestação vence no 1º período: o valor em branco não é apontado
    expect(faltasDaBase(c)).toEqual([
      {
        periodo: 1,
        campo: "percentual",
        erro: "Informe o percentual.",
        aviso:
          "Falta o percentual dos rendimentos no período desde 01/01/2025 (seção 2 · Base dos alimentos): as prestações desse período ficam sem valor até ele ser informado.",
      },
      {
        periodo: 1,
        campo: "rendimentoPadrao",
        erro: "Informe o rendimento padrão.",
        aviso:
          "Falta o rendimento mensal padrão no período desde 01/01/2025 (seção 2 · Base dos alimentos): as prestações desse período sem rendimento próprio ficam sem valor até ele ser informado.",
      },
    ]);
    c.lancamentos.push(prestacao({ id: "p-2024-05", data: "2024-05-05" }));
    expect(faltasDaBase(c)[0]).toEqual({
      periodo: 0,
      campo: "valor",
      erro: "Informe o valor fixado.",
      aviso:
        "Falta o valor fixado no período até 31/12/2024 (seção 2 · Base dos alimentos): as prestações desse período ficam sem valor até ele ser informado.",
    });
  });
});
