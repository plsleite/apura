import { describe, expect, it } from "vitest";
import { baseUnica } from "../motor/base.ts";
import { calcular } from "../motor/calcular.ts";
import { tabelaRegimeNovo } from "../motor/testes/regime-novo.ts";
import { lerArquivo, montarArquivo, serializarArquivo } from "./arquivo.ts";
import { CHAVE_RECENTES } from "./armazenamento.ts";
import { gerarLotePrestacoes } from "../motor/lote.ts";
import { novoCalculo } from "./estado/calculo.ts";
import { guardarRecente, lerRecentes, limparRecentes, removerRecente } from "./recentes.ts";
import { armazenamentoEmMemoria, armazenamentoQueFalha } from "./testes/ambiente-de-teste.ts";

const HOJE = "2026-10-11";

function calculoDe(id: string, atualizadoEm: string, processo = "") {
  const calculo = novoCalculo({ id, agora: "2026-10-11T10:00:00-03:00", hoje: HOJE });
  calculo.atualizadoEm = atualizadoEm;
  calculo.cabecalho.processo = processo;
  calculo.cabecalho.exequente = "A. B.";
  calculo.cabecalho.executado = "C. D.";
  return calculo;
}

describe("cálculos recentes no navegador (§5.5)", () => {
  it("guarda do mais novo ao mais antigo, atualiza pelo id, limita a cinco e lê de volta o cálculo", () => {
    const armazenamento = armazenamentoEmMemoria();
    const tabela = tabelaRegimeNovo();
    for (let i = 1; i <= 6; i++) {
      const calculo = calculoDe(`c-${i}`, `2026-10-11T1${i}:00:00-03:00`, `processo-${i}`);
      expect(guardarRecente(armazenamento, calculo, calcular(calculo, tabela)).gravado).toBe(true);
    }
    let recentes = lerRecentes(armazenamento);
    expect(recentes.map((r) => r.id)).toEqual(["c-6", "c-5", "c-4", "c-3", "c-2"]);
    expect(recentes[0]).toMatchObject({
      processo: "processo-6",
      exequente: "A. B.",
      executado: "C. D.",
    });
    const relido = lerArquivo(recentes[0]!.texto);
    expect(relido.ok && relido.calculo.id).toBe("c-6");
    // atualizar um já guardado o traz para o topo, sem duplicar
    const c3 = calculoDe("c-3", "2026-10-11T20:00:00-03:00", "processo-3-novo");
    recentes = guardarRecente(armazenamento, c3, calcular(c3, tabela)).recentes;
    expect(recentes.map((r) => r.id)).toEqual(["c-3", "c-6", "c-5", "c-4", "c-2"]);
    expect(recentes[0]?.processo).toBe("processo-3-novo");
    recentes = removerRecente(armazenamento, "c-5");
    expect(recentes.map((r) => r.id)).toEqual(["c-3", "c-6", "c-4", "c-2"]);
    expect(lerRecentes(armazenamento).map((r) => r.id)).toEqual(["c-3", "c-6", "c-4", "c-2"]);
    limparRecentes(armazenamento);
    expect(lerRecentes(armazenamento)).toEqual([]);
    expect(armazenamento.getItem(CHAVE_RECENTES)).toBeNull();
  });

  it("conteúdo corrompido, itens estranhos e armazenamento bloqueado nunca quebram a tela", () => {
    expect(lerRecentes(armazenamentoEmMemoria({ [CHAVE_RECENTES]: "{nada" }))).toEqual([]);
    expect(lerRecentes(armazenamentoEmMemoria({ [CHAVE_RECENTES]: '{"a":1}' }))).toEqual([]);
    const misto = armazenamentoEmMemoria({
      [CHAVE_RECENTES]: JSON.stringify([
        {
          id: "ok",
          atualizadoEm: "2026-10-11T10:00:00-03:00",
          processo: "",
          exequente: "",
          executado: "",
          texto: "{}",
        },
        { id: 5 },
        "x",
      ]),
    });
    expect(lerRecentes(misto).map((r) => r.id)).toEqual(["ok"]);
    const bloqueado = armazenamentoQueFalha();
    const calculo = calculoDe("c", "2026-10-11T10:00:00-03:00");
    expect(lerRecentes(bloqueado)).toEqual([]);
    expect(guardarRecente(bloqueado, calculo, calcular(calculo, tabelaRegimeNovo()))).toEqual({
      recentes: [],
      gravado: false,
    });
    expect(removerRecente(bloqueado, "c")).toEqual([]);
    expect(() => limparRecentes(bloqueado)).not.toThrow();
    expect(guardarRecente(null, calculo, calcular(calculo, tabelaRegimeNovo()))).toEqual({
      recentes: [],
      gravado: false,
    });
  });

  it("cada recente guarda só o cálculo e, do resultado, os índices usados e a data da consulta, em JSON compacto (D5 revisto)", () => {
    const armazenamento = armazenamentoEmMemoria();
    const calculo = calculoDe("c-1", "2026-10-11T10:00:00-03:00", "processo-1");
    calculo.base = baseUnica({
      tipo: "valorFixo",
      valor: "1000.00",
      dataFixacao: "2024-01-10",
      indiceReajuste: "nenhum",
      mesReajuste: 1,
    });
    calculo.lancamentos = gerarLotePrestacoes(
      { diaVencimento: 5, mesesEmAtraso: 24 },
      HOJE,
      [],
    ).lancamentos;
    const resultado = calcular(calculo, tabelaRegimeNovo());
    guardarRecente(armazenamento, calculo, resultado);
    const [recente] = lerRecentes(armazenamento);
    const texto = recente?.texto ?? "";
    expect(texto).not.toContain("\n");
    expect(texto).not.toContain("memoriaBase");
    const conteudo = JSON.parse(texto) as Record<string, Record<string, unknown>>;
    expect(Object.keys(conteudo)).toEqual(["formato", "calculo", "resultado"]);
    expect(conteudo.calculo).toEqual(calculo);
    expect(conteudo.resultado).toEqual({
      indicesUsados: resultado.indicesUsados,
      consultaIndices: resultado.consultaIndices,
    });
    const completo = serializarArquivo(montarArquivo(calculo, resultado));
    expect(texto.length * 4).toBeLessThan(completo.length);
    // abre como um arquivo: o cálculo inteiro e os índices para comparar
    const relido = lerArquivo(texto);
    expect(relido.ok && relido.calculo).toEqual(calculo);
    expect(relido.ok && relido.anterior).toEqual({
      indicesUsados: resultado.indicesUsados,
      consultadoEm: resultado.consultaIndices.em,
    });
    expect(relido.ok && relido.avisos).toEqual([]);
  });

  it("gravação que falha (cota cheia): guardar e remover devolvem a lista antiga", () => {
    const armazenamento = armazenamentoEmMemoria();
    const tabela = tabelaRegimeNovo();
    const c1 = calculoDe("c-1", "2026-10-11T10:00:00-03:00");
    const c2 = calculoDe("c-2", "2026-10-11T11:00:00-03:00");
    guardarRecente(armazenamento, c1, calcular(c1, tabela));
    armazenamento.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    expect(guardarRecente(armazenamento, c2, calcular(c2, tabela))).toMatchObject({
      gravado: false,
      recentes: [{ id: "c-1" }],
    });
    expect(removerRecente(armazenamento, "c-1").map((r) => r.id)).toEqual(["c-1"]);
    expect(lerRecentes(armazenamento).map((r) => r.id)).toEqual(["c-1"]);
  });
});
