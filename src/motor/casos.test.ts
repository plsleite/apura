import { describe, expect, it } from "vitest";
import { arredondar, CEM, decimal, paraTexto } from "../compartilhado/decimal.ts";
import type { CasoDeReferencia } from "../compartilhado/tipos.ts";
import { calcular } from "./calcular.ts";

// Todos os arquivos src/motor/casos/*.json entram automaticamente.
const casos = Object.values(
  import.meta.glob<CasoDeReferencia>("./casos/*.json", { eager: true, import: "default" }),
);

describe("casos de referência", () => {
  it("há pelo menos um caso na pasta", () => {
    expect(casos.length).toBeGreaterThan(0);
  });

  describe.each(casos.map((caso) => [caso.nome, caso] as const))("%s", (_nome, caso) => {
    const resultado = calcular(caso.calculo, caso.indices);
    const valorCasas = caso.calculo.metodologia.arredondamento.valorCasas;

    it.each(caso.esperado.lancamentos.map((e) => [e.id, e] as const))(
      "lançamento %s bate centavo a centavo",
      (id, esperado) => {
        const obtido = resultado.lancamentos.find((l) => l.id === id);
        expect(obtido).toBeDefined();
        if (!obtido) return;
        const campos: Array<[string, string | undefined, string]> = [
          ["corrigido", esperado.corrigido, obtido.corrigido],
          ["jurosValor", esperado.jurosValor, obtido.jurosValor],
          ["atualizado", esperado.atualizado, obtido.atualizado],
          ["fator", esperado.fator, obtido.correcao.fator],
          ["jurosPercentual", esperado.jurosPercentual, obtido.juros.percentual],
        ];
        const esperados: Record<string, string> = {};
        const obtidos: Record<string, string> = {};
        for (const [campo, valorEsperado, valorObtido] of campos) {
          if (valorEsperado !== undefined) {
            esperados[campo] = valorEsperado;
            obtidos[campo] = valorObtido;
          }
        }
        expect(obtidos).toEqual(esperados);
      },
    );

    it("totais batem", () => {
      expect(resultado.totais).toEqual(caso.esperado.totais);
    });

    it("o fator e o percentual impressos reproduzem o centavo", () => {
      for (const l of resultado.lancamentos) {
        const corrigido = arredondar(
          decimal(l.valorBase).times(decimal(l.correcao.fator)),
          valorCasas,
        );
        expect(paraTexto(corrigido, valorCasas)).toBe(l.corrigido);
        const juros = arredondar(
          decimal(l.corrigido).times(decimal(l.juros.percentual)).div(CEM),
          valorCasas,
        );
        expect(paraTexto(juros, valorCasas)).toBe(l.jurosValor);
      }
    });

    it("a ordem dos lançamentos não altera os totais", () => {
      const invertido = { ...caso.calculo, lancamentos: [...caso.calculo.lancamentos].reverse() };
      expect(calcular(invertido, caso.indices).totais).toEqual(caso.esperado.totais);
    });
  });
});
