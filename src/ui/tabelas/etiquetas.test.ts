import { describe, expect, it } from "vitest";
import type { Lancamento, LancamentoCalculado } from "../../compartilhado/tipos.ts";
import { etiquetasDaLinha, nomeDaSituacao } from "./etiquetas.ts";

const lancamento = (extra: Partial<Lancamento> = {}): Lancamento => ({
  id: "p",
  tipo: "prestacao",
  data: "2026-09-05",
  origem: "lote",
  editado: false,
  ...extra,
});

const calculado = (extra: Partial<LancamentoCalculado> = {}) =>
  ({ situacao: "atualizado", editado: false, ...extra }) as LancamentoCalculado;

describe("etiquetas da linha (§17.4)", () => {
  it("sem nada a marcar, nenhuma etiqueta", () => {
    expect(etiquetasDaLinha(lancamento(), calculado())).toEqual([]);
  });

  it("em ordem de importância: não computada, vincenda, valor informado, ajustada", () => {
    const todas = etiquetasDaLinha(
      lancamento({ editado: true }),
      calculado({ situacao: "vincenda", editado: true }),
    );
    expect(todas.map((e) => e.texto)).toEqual(["vincenda", "valor informado", "ajustada"]);
    expect(
      etiquetasDaLinha(
        lancamento({ editado: true }),
        calculado({ situacao: "ignorado", editado: true }),
      ).map((e) => e.texto),
    ).toEqual(["não computada", "valor informado", "ajustada"]);
  });

  it("no pagamento, no masculino; cada etiqueta com a sua explicação", () => {
    const pagamento = etiquetasDaLinha(
      lancamento({ tipo: "amortizacao", editado: true }),
      calculado({ situacao: "ignorado" }),
    );
    expect(pagamento).toEqual([
      {
        texto: "não computado",
        explicacao: "Fora dos totais: abra a memória da linha (▸) para ver o motivo.",
      },
      {
        texto: "ajustado",
        explicacao:
          "Alterado depois de lançado (data, valor, descrição, rendimento, termos ou regras próprias).",
      },
    ]);
    expect(
      etiquetasDaLinha(lancamento(), calculado({ situacao: "vincenda", editado: true })),
    ).toEqual([
      {
        texto: "vincenda",
        explicacao:
          "Vence depois da data de elaboração: entra pelo valor nominal, sem correção e sem juros.",
      },
      {
        texto: "valor informado",
        explicacao:
          "Valor digitado à mão, não apurado pela base dos alimentos; apagado, volta à base.",
      },
    ]);
  });

  it("o nome do botão diz o que ele contém: as etiquetas ou, sem elas, a descrição", () => {
    const etiquetas = etiquetasDaLinha(
      lancamento({ editado: true, descricao: "13º salário 2026" }),
      calculado({ situacao: "vincenda", editado: true }),
    );
    expect(nomeDaSituacao(lancamento({ descricao: "13º salário 2026" }), etiquetas)).toBe(
      "Situação da prestação de 05/09/2026: vincenda, valor informado, ajustada",
    );
    expect(
      nomeDaSituacao(lancamento({ tipo: "amortizacao" }), [
        { texto: "não computado", explicacao: "" },
      ]),
    ).toBe("Situação do pagamento de 05/09/2026: não computado");
    // linha só com descrição (decisão de 13/10/2026): o botão é a própria descrição
    expect(nomeDaSituacao(lancamento({ descricao: " 13º salário 2026 " }), [])).toBe(
      "Descrição da prestação de 05/09/2026: 13º salário 2026",
    );
  });
});
