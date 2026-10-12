import { describe, expect, it } from "vitest";
import { arredondar, CEM, decimal } from "../compartilhado/decimal.ts";
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
        // Campos obrigatórios: sempre comparados; um caso sem eles (ex.: "corigido") falha.
        const obrigatorios: Array<[string, string | undefined, string]> = [
          ["corrigido", esperado.corrigido, obtido.corrigido],
          ["jurosValor", esperado.jurosValor, obtido.jurosValor],
          ["atualizado", esperado.atualizado, obtido.atualizado],
        ];
        // Campos opcionais: comparados só quando o caso os informa.
        const opcionais: Array<[string, string | undefined, string]> = [
          ["fator", esperado.fator, obtido.correcao.fator],
          ["jurosPercentual", esperado.jurosPercentual, obtido.juros.percentual],
          ["valorBase", esperado.valorBase, obtido.valorBase],
          ["memoriaBase", esperado.memoriaBase, obtido.memoriaBase],
          ["situacao", esperado.situacao, obtido.situacao],
          [
            "editado",
            esperado.editado === undefined ? undefined : String(esperado.editado),
            String(obtido.editado),
          ],
        ];
        const esperados: Record<string, string | undefined> = {};
        const obtidos: Record<string, string> = {};
        for (const [campo, valorEsperado, valorObtido] of obrigatorios) {
          expect(
            valorEsperado,
            `campo obrigatório "${campo}" ausente no esperado de ${id}`,
          ).toBeDefined();
          esperados[campo] = valorEsperado;
          obtidos[campo] = valorObtido;
        }
        for (const [campo, valorEsperado, valorObtido] of opcionais) {
          if (valorEsperado !== undefined) {
            esperados[campo] = valorEsperado;
            obtidos[campo] = valorObtido;
          }
        }
        expect(obtidos).toEqual(esperados);
        if (esperado.avisos !== undefined) expect(obtido.avisos).toEqual(esperado.avisos);
      },
    );

    it("os ids do esperado não se repetem e coincidem com os ids calculados", () => {
      const idsEsperados = caso.esperado.lancamentos.map((e) => e.id);
      const repetidos = idsEsperados.filter((id, i) => idsEsperados.indexOf(id) !== i);
      expect(repetidos, "ids repetidos no esperado").toEqual([]);
      const idsCalculados = resultado.lancamentos.map((l) => l.id);
      // Nenhuma linha calculada sem gabarito e nenhuma linha de gabarito sem cálculo.
      expect([...new Set(idsCalculados)].sort()).toEqual([...new Set(idsEsperados)].sort());
    });

    it("totais batem", () => {
      expect(resultado.totais).toEqual(caso.esperado.totais);
    });

    it("avisos do resultado batem (quando o caso os informa)", () => {
      if (caso.esperado.avisos !== undefined)
        expect(resultado.avisos).toEqual(caso.esperado.avisos);
    });

    it("o fator e o percentual impressos reproduzem o centavo, com tolerância proporcional ao valor", () => {
      // O motor multiplica com precisão integral e imprime 6 casas (como o SAJ): a conta refeita
      // com os números impressos pode diferir em um centavo, mais o erro do fator impresso
      // (até 0,0000005 × valor), relevante acima de R$ 10.000,00.
      expect(resultado.lancamentos.length).toBeGreaterThan(0);
      for (const l of resultado.lancamentos) {
        const tolerancia = decimal(l.valorBase).abs().times("0.0000005").plus("0.01");
        const corrigido = arredondar(
          decimal(l.valorBase).times(decimal(l.correcao.fator)),
          valorCasas,
        );
        expect(corrigido.minus(decimal(l.corrigido)).abs().lte(tolerancia)).toBe(true);
        const juros = arredondar(
          decimal(l.corrigido).times(decimal(l.juros.percentual)).div(CEM),
          valorCasas,
        );
        expect(juros.minus(decimal(l.jurosValor)).abs().lte(tolerancia)).toBe(true);
      }
    });

    it("a ordem dos lançamentos não altera os totais", () => {
      const invertido = { ...caso.calculo, lancamentos: [...caso.calculo.lancamentos].reverse() };
      expect(calcular(invertido, caso.indices).totais).toEqual(caso.esperado.totais);
    });
  });
});
