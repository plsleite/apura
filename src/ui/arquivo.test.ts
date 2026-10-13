import { describe, expect, it } from "vitest";
import type { Calculo } from "../compartilhado/tipos.ts";
import { calcular } from "../motor/calcular.ts";
import { gerarLotePrestacoes } from "../motor/lote.ts";
import { tabelaRegimeNovo } from "../motor/testes/regime-novo.ts";
import { metodologiaDaOpcao, metodologiaPadrao } from "../metodologias/padrao.ts";
import { lerArquivo, montarArquivo, nomeDoArquivo, serializarArquivo } from "./arquivo.ts";
import { novoCalculo } from "./estado/calculo.ts";
import { dividirPeriodo } from "./estado/metodologia.ts";

const HOJE = "2026-10-11";
const AGORA = "2026-10-11T15:00:00-03:00";

function calculoCompleto(): Calculo {
  const calculo = novoCalculo({
    id: "c-1",
    agora: AGORA,
    hoje: HOJE,
    cabecalho: { defensor: "Defensor(a) de teste", orgao: "Órgão de teste" },
  });
  calculo.cabecalho.processo = "0800000-11.2026.8.12.0001";
  calculo.cabecalho.exequente = "A. B. C.";
  calculo.cabecalho.executado = "D. E. F.";
  calculo.base = {
    periodos: [
      {
        de: null,
        ate: "2025-12-31",
        forma: {
          tipo: "valorFixo",
          valor: "1000.00",
          dataFixacao: "2024-03-15",
          indiceReajuste: "IPCA",
          mesReajuste: 3,
        },
      },
      { de: "2026-01-01", ate: null, forma: { tipo: "percentualSalarioMinimo", percentual: "30" } },
    ],
  };
  calculo.lotes = { ultimoLotePrestacoes: { diaVencimento: 5, mesesEmAtraso: 2 } };
  calculo.lancamentos = gerarLotePrestacoes(
    { diaVencimento: 5, mesesEmAtraso: 2 },
    HOJE,
    [],
  ).lancamentos;
  calculo.lancamentos.push({
    id: "a-2026-09",
    tipo: "amortizacao",
    data: "2026-09-05",
    descricao: "Pagamento parcial",
    valorInformado: "400.00",
    origem: "avulso",
    editado: true,
    encargos: {
      termoFinalJuros: "2026-09-30",
      metodologia: dividirPeriodo(calculo.metodologia, "2023-01-01").metodologia,
    },
  });
  calculo.acrescimos = { multaPercentual: "10", honorariosPercentual: "10" };
  calculo.observacoes = "Conforme a sentença.";
  return calculo;
}

describe("arquivo de cálculo: montar, serializar, nomear", () => {
  it("o envelope traz formato, cálculo e resultado; o nome usa o processo limpo e a data de elaboração", () => {
    const calculo = calculoCompleto();
    const resultado = calcular(calculo, tabelaRegimeNovo());
    const arquivo = montarArquivo(calculo, resultado);
    expect(arquivo.formato).toBe("apura/calculo@1");
    expect(JSON.parse(serializarArquivo(arquivo))).toEqual(arquivo);
    expect(nomeDoArquivo(calculo)).toBe("apura-0800000-11.2026.8.12.0001-2026-10-11.json");
    calculo.cabecalho.processo = "  Nº 12 / 2026 (ação) ";
    expect(nomeDoArquivo(calculo)).toBe("apura-N-12-2026-acao-2026-10-11.json");
    calculo.cabecalho.processo = "";
    expect(nomeDoArquivo(calculo)).toBe("apura-2026-10-11.json");
  });
});

describe("lerArquivo (validação do arquivo aberto, §5.1)", () => {
  it("lê de volta o que foi salvo, com os índices usados e a data da consulta, sem avisos", () => {
    const calculo = calculoCompleto();
    const resultado = calcular(calculo, tabelaRegimeNovo());
    const leitura = lerArquivo(serializarArquivo(montarArquivo(calculo, resultado)));
    expect(leitura.ok).toBe(true);
    if (!leitura.ok) return;
    expect(leitura.calculo).toEqual(calculo);
    expect(leitura.anterior).toEqual({
      indicesUsados: resultado.indicesUsados,
      consultadoEm: resultado.consultaIndices.em,
    });
    expect(leitura.avisos).toEqual([]);
  });

  it("descarta campos desconhecidos e aceita cálculo sem lotes", () => {
    const calculo = calculoCompleto();
    const texto = JSON.stringify({
      formato: "apura/calculo@1",
      calculo: {
        ...calculo,
        lotes: undefined,
        extra: 1,
        cabecalho: { ...calculo.cabecalho, cpf: "x" },
      },
      resultado: calcular(calculo, tabelaRegimeNovo()),
      outra: "coisa",
    });
    const leitura = lerArquivo(texto);
    expect(leitura.ok).toBe(true);
    if (!leitura.ok) return;
    expect(leitura.calculo).toEqual({ ...calculo, lotes: {} });
  });

  it("recalcula a marca de metodologia ajustada em vez de confiar no arquivo, e põe o nome da opção reconhecida (§17.3)", () => {
    const calculo = calculoCompleto();
    const resultado = calcular(calculo, tabelaRegimeNovo());
    const arquivo = structuredClone({ formato: "apura/calculo@1", calculo, resultado });
    // a global com o nome de antes e marcada "ajustada" sem estar; a própria, igual à segunda opção
    Object.assign(arquivo.calculo.metodologia, {
      id: "tjms-saj",
      nome: "TJMS/SAJ",
      ajustada: true,
    });
    const pagamento = arquivo.calculo.lancamentos[2]!;
    pagamento.encargos = { metodologia: { ...metodologiaDaOpcao("igpmJuros1"), ajustada: true } };
    const leitura = lerArquivo(JSON.stringify(arquivo));
    expect(leitura.ok).toBe(true);
    if (!leitura.ok) return;
    expect(leitura.calculo.metodologia).toEqual(metodologiaPadrao());
    expect(leitura.calculo.lancamentos[2]?.encargos?.metodologia).toEqual(
      metodologiaDaOpcao("igpmJuros1"),
    );
    expect("cpf" in leitura.calculo.cabecalho).toBe(false);
  });

  it("recusa o que não é um cálculo do Apura, com uma frase", () => {
    expect(lerArquivo("{nada")).toEqual({
      ok: false,
      erro: "O arquivo está danificado ou não é um arquivo de cálculo do Apura: não pôde ser lido.",
    });
    const naoEh = {
      ok: false,
      erro: "O arquivo não é um cálculo do Apura (formato apura/calculo@1).",
    };
    expect(lerArquivo("[]")).toEqual(naoEh);
    expect(lerArquivo('{"formato":"apura/serie@1"}')).toEqual(naoEh);
    expect(lerArquivo('{"calculo":{}}')).toEqual(naoEh);
  });

  it("recusa dados inválidos no cálculo, dizendo onde", () => {
    const calculo = calculoCompleto();
    const resultado = calcular(calculo, tabelaRegimeNovo());
    const periodo = (c: Record<string, unknown>, i: number) =>
      (c.base as { periodos: Array<Record<string, unknown>> }).periodos[i]!;
    const forma = (c: Record<string, unknown>, i: number) =>
      periodo(c, i).forma as Record<string, unknown>;
    const com = (mexer: (c: Record<string, unknown>) => void): string => {
      const copia = structuredClone(calculo) as unknown as Record<string, unknown>;
      mexer(copia);
      return JSON.stringify({ formato: "apura/calculo@1", calculo: copia, resultado });
    };
    const casos: Array<[string, (c: Record<string, unknown>) => void]> = [
      ["dataElaboracao", (c) => (c.dataElaboracao = "11/10/2026")],
      ["dataElaboracao", (c) => (c.dataElaboracao = "2026-02-30")],
      ["base.periodos[0].forma.tipo", (c) => (forma(c, 0).tipo = "outra")],
      ["base.periodos[0].forma.dataFixacao", (c) => (forma(c, 0).dataFixacao = "")],
      ["base.periodos[0].forma.mesReajuste", (c) => (forma(c, 0).mesReajuste = 13)],
      ["base.periodos[0].forma.indiceReajuste", (c) => (forma(c, 0).indiceReajuste = "SELIC")],
      ["base.periodos[1].forma.percentual", (c) => (forma(c, 1).percentual = 30)],
      // a base antiga, de um item só, não abre (sem retrocompatibilidade, §17.2)
      ["base.periodos", (c) => (c.base = forma(c, 0))],
      ["base.periodos", (c) => (c.base = { periodos: [] })],
      // o primeiro sem começo, o último sem fim, seguidos, sem buraco nem sobreposição
      ["base.periodos[0].de", (c) => (periodo(c, 0).de = "2020-01-01")],
      ["base.periodos[1].ate", (c) => (periodo(c, 1).ate = "2030-12-31")],
      ["base.periodos[1].de", (c) => (periodo(c, 1).de = "2026-02-01")],
      ["base.periodos[1].de", (c) => (periodo(c, 1).de = "2025-12-31")],
      ["base.periodos[0].ate", (c) => (periodo(c, 0).ate = null)],
      ["base.periodos[0].ate", (c) => (periodo(c, 0).ate = "2025-13-01")],
      [
        "lancamentos[0].data",
        (c) => ((c.lancamentos as Array<Record<string, unknown>>)[0]!.data = 20260905),
      ],
      [
        "lancamentos[0].competencia",
        (c) => ((c.lancamentos as Array<Record<string, unknown>>)[0]!.competencia = "2026-13"),
      ],
      [
        "lancamentos[1].editado",
        (c) => ((c.lancamentos as Array<Record<string, unknown>>)[1]!.editado = "sim"),
      ],
      [
        "lancamentos[2].encargos.termoFinalJuros",
        (c) =>
          ((
            (c.lancamentos as Array<Record<string, unknown>>)[2]!.encargos as Record<
              string,
              unknown
            >
          ).termoFinalJuros = "ontem"),
      ],
      [
        "lancamentos[2].encargos.metodologia.periodos[0].juros.taxaMensal",
        (c) => {
          const m = (
            (c.lancamentos as Array<Record<string, unknown>>)[2]!.encargos as Record<
              string,
              unknown
            >
          ).metodologia as Record<string, unknown>;
          (
            (m.periodos as Array<Record<string, unknown>>)[0]!.juros as Record<string, unknown>
          ).taxaMensal = "1,5";
        },
      ],
      [
        "metodologia.deflacao",
        (c) => ((c.metodologia as Record<string, unknown>).deflacao = "inventada"),
      ],
      [
        "metodologia.periodos[0] (início depois do fim)",
        (c) => {
          const p = (c.metodologia as Record<string, unknown>).periodos as Array<
            Record<string, unknown>
          >;
          p[0]!.de = "2025-01-01";
          p[0]!.ate = "2024-12-31";
        },
      ],
      [
        "metodologia.periodos[1].correcao.indice",
        (c) =>
          ((
            (
              (c.metodologia as Record<string, unknown>).periodos as Array<Record<string, unknown>>
            )[1]!.correcao as Record<string, unknown>
          ).indice = "SELIC"),
      ],
      [
        "acrescimos.multaPercentual",
        (c) => ((c.acrescimos as Record<string, unknown>).multaPercentual = 10),
      ],
      ["cabecalho.processo", (c) => ((c.cabecalho as Record<string, unknown>).processo = null)],
      ["lancamentos", (c) => (c.lancamentos = {})],
      ["calculo", (c) => delete c.metodologia && undefined],
    ];
    for (const [caminho, mexer] of casos) {
      const leitura = lerArquivo(com(mexer));
      expect(leitura.ok, caminho).toBe(false);
      if (leitura.ok) continue;
      expect(leitura.erro, caminho).toMatch(/^O arquivo traz um dado inválido em "/);
      // na base, a frase aponta o campo exato
      if (caminho.startsWith("base")) expect(leitura.erro, caminho).toContain(`"${caminho}"`);
    }
    expect(lerArquivo(com((c) => (c.dataElaboracao = "2026-02-30")))).toEqual({
      ok: false,
      erro: 'O arquivo traz um dado inválido em "dataElaboracao" (nome interno do campo, para quem for corrigir o arquivo); o cálculo atual não foi alterado.',
    });
    // datas depois de 31/12/2199 (o teto de datas do Apura) também são recusadas
    expect(lerArquivo(com((c) => (c.dataElaboracao = "9999-12-01")))).toEqual({
      ok: false,
      erro: 'O arquivo traz um dado inválido em "dataElaboracao" (nome interno do campo, para quem for corrigir o arquivo); o cálculo atual não foi alterado.',
    });
    expect(
      lerArquivo(
        com((c) => ((c.lancamentos as Array<Record<string, unknown>>)[0]!.data = "2200-01-05")),
      ),
    ).toMatchObject({ ok: false, erro: expect.stringContaining('"lancamentos[0].data"') });
    expect(lerArquivo(com((c) => (c.dataElaboracao = "2199-12-31"))).ok).toBe(true);
    // textos decimais da base e dos acréscimos são aceitos como texto (o motor avisa se inválidos)
    const leitura = lerArquivo(com((c) => (forma(c, 0).valor = "1,5")));
    expect(leitura.ok).toBe(true);
  });

  it("resultado ausente ou estranho: abre com aviso e sem comparação; série desconhecida sai com aviso", () => {
    const calculo = calculoCompleto();
    const resultado = calcular(calculo, tabelaRegimeNovo());
    const aviso =
      "O arquivo não traz os índices usados no cálculo salvo: não dá para comparar com os índices atuais.";
    const semResultado = lerArquivo(JSON.stringify({ formato: "apura/calculo@1", calculo }));
    expect(semResultado.ok && semResultado.anterior).toBeNull();
    expect(semResultado.ok && semResultado.avisos).toEqual([aviso]);
    const estranho = lerArquivo(
      JSON.stringify({
        formato: "apura/calculo@1",
        calculo,
        resultado: { ...resultado, indicesUsados: "x" },
      }),
    );
    expect(estranho.ok && estranho.anterior).toBeNull();
    expect(estranho.ok && estranho.avisos).toEqual([aviso]);
    const comDesconhecida = lerArquivo(
      JSON.stringify({
        formato: "apura/calculo@1",
        calculo,
        resultado: {
          ...resultado,
          indicesUsados: [
            ...resultado.indicesUsados,
            {
              serie: "7478",
              competencia: "2026-09",
              valor: "0.5",
              fonte: "embutida",
              obtidoEm: AGORA,
            },
          ],
        },
      }),
    );
    expect(comDesconhecida.ok && comDesconhecida.anterior?.indicesUsados).toEqual(
      resultado.indicesUsados,
    );
    expect(comDesconhecida.ok && comDesconhecida.avisos).toEqual([
      "O arquivo traz índices de séries que o Apura não conhece (7478); eles ficaram fora da comparação com os índices atuais.",
    ]);
  });
});
