import { describe, expect, it } from "vitest";
import { metodologiaDaOpcao } from "../metodologias/padrao.ts";
import { baseUnica } from "../motor/base.ts";
import { matrizesDeIndices } from "./matriz.ts";
import { calculoCompleto, calculoDeTeste, prestacao, resultadoDe } from "./testes/calculos.ts";

const vazio = (n: number): string[] => Array.from({ length: n }, () => "");

describe("matriz de índices aplicados (§18.3, item 7)", () => {
  it("uma tabela por série, na ordem de uso; o ponto só no mês que faltou; meses fora do uso vazios", () => {
    const calculo = calculoCompleto();
    const matrizes = matrizesDeIndices(resultadoDe(calculo));
    expect(matrizes.map((m) => m.nome)).toEqual(["IGP-M", "IPCA", "taxa legal"]);
    expect(matrizes[0]?.anos).toEqual([
      { ano: 2024, meses: [...vazio(6), "0,61", "0,29", ...vazio(4)] },
    ]);
    const ipca = matrizes[1]?.anos;
    expect(ipca?.map((a) => a.ano)).toEqual([2024, 2025, 2026]);
    expect(ipca?.[0]?.meses).toEqual([...vazio(8), "0,44", "0,56", "0,39", "0,52"]);
    expect(ipca?.[1]?.meses[7]).toBe("−0,11");
    expect(ipca?.[2]?.meses).toEqual([
      "0,33",
      "0,70",
      "0,88",
      "0,67",
      "0,58",
      "0,16",
      "0,07",
      "−0,32",
      "0,82",
      "·",
      "",
      "",
    ]);
    const taxaLegal = matrizes[2]?.anos;
    expect(taxaLegal?.[0]?.meses.slice(7)).toEqual([
      "0,605306",
      "0,676227",
      "0,704241",
      "0,385874",
      "0,171924",
    ]);
    expect(taxaLegal?.[2]?.meses.slice(8)).toEqual(["1,499119", "0,379020", "", ""]);
  });

  it("salário mínimo em reais, por último", () => {
    const calculo = calculoDeTeste({
      base: baseUnica({ tipo: "percentualSalarioMinimo", percentual: "30" }),
      metodologia: metodologiaDaOpcao("igpmJuros1"),
      lancamentos: [prestacao("2025-12-05"), prestacao("2026-01-05")],
    });
    const matrizes = matrizesDeIndices(resultadoDe(calculo));
    expect(matrizes.map((m) => m.nome)).toEqual(["IGP-M", "salário mínimo"]);
    expect(matrizes[1]?.anos).toEqual([
      { ano: 2025, meses: [...vazio(11), "1.518,00"] },
      { ano: 2026, meses: ["1.621,00", ...vazio(11)] },
    ]);
  });
});
