import { describe, expect, it } from "vitest";
import type { CasoDeReferencia, Competencia, ValorIndice } from "../compartilhado/tipos.ts";
import { calcular } from "./calcular.ts";
import casoSaj2026 from "./casos/2026-10-11-saj-tjms-alimentos-igpm-2024-2026.json" with { type: "json" };
import casoInpc from "./casos/2026-10-11-saj-tjms-inpc-salario-minimo-lotes.json" with { type: "json" };
import casoLote from "./casos/2026-10-11-saj-tjms-percentual-rendimentos-lote.json" with { type: "json" };
import { gerarLoteAmortizacoes, gerarLotePrestacoes } from "./lote.ts";
import { metodologiaSelicUnica, tabelaRegimeNovo } from "./testes/regime-novo.ts";

/**
 * Os casos do SAJ transcritos com valores informados à mão também fecham quando o motor apura a
 * base sozinho: prova de que a apuração reproduz o que a contadoria calculou.
 */
describe("casos de referência recalculados pela base dos alimentos", () => {
  it("SAJ 2026: 30% do salário mínimo do período (1.412,00, 1.518,00 e 1.621,00) reproduz as 32 prestações e os totais", () => {
    const caso = casoSaj2026 as unknown as CasoDeReferencia;
    const salarios: Record<Competencia, ValorIndice> = {};
    for (const [competencia, valor] of [
      ["2024", "1412.00"],
      ["2025", "1518.00"],
      ["2026", "1621.00"],
    ] as const) {
      for (let mes = 1; mes <= 12; mes++) {
        salarios[`${competencia}-${String(mes).padStart(2, "0")}`] = {
          valor,
          fonte: "embutida",
          obtidoEm: caso.indices.consultadoEm,
        };
      }
    }
    const calculo = {
      ...caso.calculo,
      lancamentos: caso.calculo.lancamentos.map((l) =>
        l.tipo === "prestacao"
          ? { ...l, valorInformado: undefined, origem: "lote" as const, editado: false }
          : l,
      ),
    };
    const r = calcular(calculo, {
      ...caso.indices,
      series: { ...caso.indices.series, "1619": salarios },
    });
    const prestacoes = r.lancamentos.filter((l) => l.tipo === "prestacao");
    expect(prestacoes).toHaveLength(32);
    expect(new Set(prestacoes.map((l) => l.valorBase))).toEqual(
      new Set(["423.60", "455.40", "486.30"]),
    );
    expect(prestacoes[0]?.memoriaBase).toBe(
      "30% do salário mínimo de mar/2024 (R$ 1.412,00) = R$ 423,60",
    );
    expect(prestacoes.every((l) => !l.editado && l.situacao === "atualizado")).toBe(true);
    expect(r.lancamentos.map((l) => [l.id, l.atualizado])).toEqual(
      caso.esperado.lancamentos.map((e) => [e.id, e.atualizado]),
    );
    expect(r.totais).toEqual(caso.esperado.totais);
    expect(r.indicesUsados.filter((i) => i.serie === "1619")).toHaveLength(32);
  });

  it("lote → base → cálculo: o lote do caso de 30% × R$ 1.500,00 gera exatamente as 22 prestações do caso", () => {
    const caso = casoLote as unknown as CasoDeReferencia;
    const lote = caso.calculo.lotes.ultimoLotePrestacoes;
    expect(lote).toBeDefined();
    if (!lote) return;
    const gerado = gerarLotePrestacoes(lote, caso.calculo.dataElaboracao, []);
    expect(gerado.avisos).toEqual([]);
    expect(gerado.lancamentos).toEqual(caso.calculo.lancamentos);
    const r = calcular({ ...caso.calculo, lancamentos: gerado.lancamentos }, caso.indices);
    expect(r.totais).toEqual(caso.esperado.totais);
  });

  it("lote de prestações e lote de pagamentos geram exatamente os lançamentos do caso INPC do SAJ", () => {
    const caso = casoInpc as unknown as CasoDeReferencia;
    const { ultimoLotePrestacoes, ultimoLoteAmortizacoes } = caso.calculo.lotes;
    expect(ultimoLotePrestacoes).toBeDefined();
    expect(ultimoLoteAmortizacoes).toBeDefined();
    if (!ultimoLotePrestacoes || !ultimoLoteAmortizacoes) return;
    const prestacoes = gerarLotePrestacoes(ultimoLotePrestacoes, caso.calculo.dataElaboracao, []);
    const pagamentos = gerarLoteAmortizacoes(ultimoLoteAmortizacoes, prestacoes.lancamentos);
    expect([...prestacoes.avisos, ...pagamentos.avisos]).toEqual([]);
    expect([...prestacoes.lancamentos, ...pagamentos.lancamentos]).toEqual(
      caso.calculo.lancamentos,
    );
    expect(calcular(caso.calculo, caso.indices).totais).toEqual(caso.esperado.totais);
  });

  it("SELIC única com base em 30% do salário mínimo reproduz os 22 valores corrigidos do relatório do SAJ de 11/10/2026 (tabela até ago/2026)", () => {
    // Relatório do SAJ com indexador "Taxa SELIC … Corrigido com Percentual Capitalizado Mensal",
    // de 01/01/2025 a 01/10/2026, no dia 1. A coluna de juros desse relatório ("Taxa Selic, sobre o
    // juro + Selic") conta a SELIC dos meses intermediários duas vezes e não é reproduzida: no
    // Apura a SELIC única já inclui correção e juros (§6.4).
    const corrigidosDoSaj = [
      "569.01",
      "563.30",
      "557.81",
      "552.48",
      "546.67",
      "540.51",
      "534.61",
      "527.87",
      "521.80",
      "515.51",
      "509.03",
      "503.72",
      "531.42",
      "525.34",
      "520.12",
      "513.91",
      "508.38",
      "502.98",
      "497.40",
      "491.43",
      "486.30",
      "486.30",
    ];
    const caso = casoInpc as unknown as CasoDeReferencia;
    const calculo = {
      ...caso.calculo,
      lancamentos: caso.calculo.lancamentos.filter((l) => l.tipo === "prestacao"),
      metodologia: metodologiaSelicUnica(),
    };
    const r = calcular(calculo, tabelaRegimeNovo({ "4390": "2026-08" }));
    expect(r.lancamentos.map((l) => l.valorBase)).toEqual(
      caso.esperado.lancamentos.slice(0, 22).map((e) => e.valorBase),
    );
    expect(r.lancamentos.map((l) => l.corrigido)).toEqual(corrigidosDoSaj);
    expect(r.lancamentos.every((l) => l.jurosValor === "0.00")).toBe(true);
  });
});
