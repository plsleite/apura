import { competenciaDe, decompor } from "../../compartilhado/datas.ts";
import type {
  Base,
  Cabecalho,
  Calculo,
  DataISO,
  Lancamento,
  LoteAmortizacoes,
  LotePrestacoes,
  Metodologia,
  TabelaIndices,
  TextoDecimal,
} from "../../compartilhado/tipos.ts";
import type { SituacaoIndices } from "../../indices/congelar.ts";
import { metodologiaDaOpcao, type OpcaoDeMetodologia } from "../../metodologias/padrao.ts";
import { baseUnica } from "../../motor/base.ts";
import { aplicarRendimentoNaBase } from "./base.ts";
import { gerarLoteAmortizacoes, gerarLotePrestacoes, idLivre } from "../../motor/lote.ts";

/**
 * Estado da tela e o redutor puro que o altera (§4.3: a tela edita o Cálculo; a cada alteração o
 * motor recalcula). O redutor não lê relógio nem ids: cada ação traz `em` (data-hora de agora, do
 * ambiente) e, quando precisa, o id novo. A tabela congelada e a situação dos índices mudam só em
 * "novo" e "abrir" (§8.2). Os avisos do último "Lançar em lote" e os da abertura de um arquivo
 * ficam no estado para a tela mostrar.
 */

export interface Estado {
  calculo: Calculo;
  tabela: TabelaIndices;
  situacao: SituacaoIndices;
  /** avisos do último "Lançar em lote" (competências puladas, lote vazio) e qual formulário o fez */
  avisosDoLote: string[];
  loteRecente: "prestacoes" | "pagamentos" | null;
  /** ids das linhas que o último "Lançar em lote" acrescentou (a tela rola até a primeira, §20.3) */
  idsDoLote: string[];
  /** avisos da abertura de um arquivo (índices que mudaram, dados que não puderam ser lidos) */
  avisosDaAbertura: string[];
  /** true depois da primeira edição desde "novo" ou "abrir": só então o cálculo vai para os recentes */
  tocado: boolean;
}

export interface Indices {
  tabela: TabelaIndices;
  situacao: SituacaoIndices;
}

/**
 * Campos de um lançamento que a tela edita em "Personalizar"; `undefined` apaga o campo. A
 * competência não é editável na tela (decisão de 13/10/2026): ela acompanha o mês do vencimento,
 * que é a referência de cada linha, e serve por dentro para o lote não repetir meses.
 */
export type MudancasDoLancamento = Partial<
  Pick<Lancamento, "data" | "descricao" | "valorInformado" | "rendimento" | "encargos">
>;

export type Acao =
  | ({ tipo: "novo"; calculo: Calculo } & Indices)
  | ({ tipo: "abrir"; calculo: Calculo; avisos: string[] } & Indices)
  | { tipo: "cabecalho"; campo: keyof Cabecalho; valor: string; em: string }
  | { tipo: "base"; base: Base; em: string }
  | { tipo: "dataElaboracao"; data: DataISO; em: string }
  | {
      tipo: "acrescimos";
      campo: "multaPercentual" | "honorariosPercentual";
      valor: TextoDecimal;
      em: string;
    }
  | { tipo: "observacoes"; texto: string; em: string }
  | { tipo: "metodologia"; metodologia: Metodologia; em: string }
  | { tipo: "lancarPrestacoes"; lote: LotePrestacoes; em: string }
  | { tipo: "lancarPagamentos"; lote: LoteAmortizacoes; em: string }
  | {
      tipo: "incluirLancamento";
      lancamento: Omit<Lancamento, "id" | "origem" | "editado">;
      em: string;
    }
  | { tipo: "editarLancamento"; id: string; mudancas: MudancasDoLancamento; em: string }
  | { tipo: "aplicarRendimentoDaquiEmDiante"; id: string; rendimento: TextoDecimal; em: string }
  | { tipo: "excluirLancamento"; id: string; em: string };

/**
 * Cálculo novo em branco (§5.2): data de elaboração de hoje, base de um período só (§17.2) em
 * valor fixo sem reajuste com a data de fixação de hoje (o único campo da base que o motor exige
 * válido) e o valor a preencher, a metodologia escolhida como padrão nas preferências (§17.3),
 * multa e honorários de 10% cada (decisão de 13/10/2026, D26). Defensor e órgão vêm das
 * preferências.
 */
export function novoCalculo(p: {
  id: string;
  agora: string;
  hoje: DataISO;
  cabecalho?: Partial<Cabecalho>;
  /** a metodologia padrão escolhida nas preferências (§17.3); sem ela, a da Lei 14.905/2024 */
  metodologia?: OpcaoDeMetodologia;
}): Calculo {
  return {
    formato: "apura/calculo@1",
    tipo: "alimentos",
    id: p.id,
    criadoEm: p.agora,
    atualizadoEm: p.agora,
    dataElaboracao: p.hoje,
    cabecalho: {
      defensor: "",
      orgao: "",
      processo: "",
      exequente: "",
      executado: "",
      ...p.cabecalho,
    },
    base: baseUnica({
      tipo: "valorFixo",
      valor: "",
      dataFixacao: p.hoje,
      indiceReajuste: "nenhum",
      mesReajuste: decompor(p.hoje).mes,
    }),
    lotes: {},
    lancamentos: [],
    metodologia: metodologiaDaOpcao(p.metodologia ?? "lei14905"),
    acrescimos: { multaPercentual: "10", honorariosPercentual: "10" },
    observacoes: "",
  };
}

export function estadoInicial(calculo: Calculo, indices: Indices): Estado {
  return {
    calculo,
    tabela: indices.tabela,
    situacao: indices.situacao,
    avisosDoLote: [],
    loteRecente: null,
    idsDoLote: [],
    avisosDaAbertura: [],
    tocado: false,
  };
}

/** Lançamentos em ordem cronológica (data, depois id), a ordem das tabelas e do arquivo. */
function ordenar(lancamentos: Lancamento[]): Lancamento[] {
  return [...lancamentos].sort(
    (a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0) || (a.id < b.id ? -1 : 1),
  );
}

function comLancamentos(estado: Estado, lancamentos: Lancamento[], em: string): Estado {
  return {
    ...estado,
    calculo: { ...estado.calculo, lancamentos: ordenar(lancamentos), atualizadoEm: em },
    tocado: true,
  };
}

function comCalculo(estado: Estado, mudancas: Partial<Calculo>, em: string): Estado {
  return {
    ...estado,
    calculo: { ...estado.calculo, ...mudancas, atualizadoEm: em },
    tocado: true,
  };
}

function aplicarMudancas(lancamento: Lancamento, mudancas: MudancasDoLancamento): Lancamento {
  const novo: Lancamento = { ...lancamento, editado: true };
  for (const chave of Object.keys(mudancas) as Array<keyof MudancasDoLancamento>) {
    const valor = mudancas[chave];
    if (valor === undefined) delete novo[chave];
    else Object.assign(novo, { [chave]: valor });
  }
  if (novo.tipo === "prestacao" && mudancas.data !== undefined) {
    novo.competencia = competenciaDe(mudancas.data);
  }
  return novo;
}

export function reduzir(estado: Estado, acao: Acao): Estado {
  switch (acao.tipo) {
    case "novo":
      return estadoInicial(acao.calculo, acao);
    case "abrir":
      return { ...estadoInicial(acao.calculo, acao), avisosDaAbertura: acao.avisos };
    case "cabecalho":
      return comCalculo(
        estado,
        { cabecalho: { ...estado.calculo.cabecalho, [acao.campo]: acao.valor } },
        acao.em,
      );
    case "base":
      return comCalculo(estado, { base: acao.base }, acao.em);
    case "dataElaboracao":
      return comCalculo(estado, { dataElaboracao: acao.data }, acao.em);
    case "acrescimos":
      return comCalculo(
        estado,
        { acrescimos: { ...estado.calculo.acrescimos, [acao.campo]: acao.valor } },
        acao.em,
      );
    case "observacoes":
      return comCalculo(estado, { observacoes: acao.texto }, acao.em);
    case "metodologia":
      return comCalculo(estado, { metodologia: acao.metodologia }, acao.em);
    case "lancarPrestacoes": {
      const lote = gerarLotePrestacoes(
        acao.lote,
        estado.calculo.dataElaboracao,
        estado.calculo.lancamentos,
      );
      const proximo = comLancamentos(
        estado,
        [...estado.calculo.lancamentos, ...lote.lancamentos],
        acao.em,
      );
      return {
        ...proximo,
        calculo: {
          ...proximo.calculo,
          lotes: { ...proximo.calculo.lotes, ultimoLotePrestacoes: acao.lote },
        },
        avisosDoLote: lote.avisos,
        loteRecente: "prestacoes",
        idsDoLote: lote.lancamentos.map((l) => l.id),
      };
    }
    case "lancarPagamentos": {
      const lote = gerarLoteAmortizacoes(acao.lote, estado.calculo.lancamentos);
      const proximo = comLancamentos(
        estado,
        [...estado.calculo.lancamentos, ...lote.lancamentos],
        acao.em,
      );
      return {
        ...proximo,
        calculo: {
          ...proximo.calculo,
          lotes: { ...proximo.calculo.lotes, ultimoLoteAmortizacoes: acao.lote },
        },
        avisosDoLote: lote.avisos,
        loteRecente: "pagamentos",
        idsDoLote: lote.lancamentos.map((l) => l.id),
      };
    }
    case "incluirLancamento": {
      // a competência de uma prestação é sempre o mês do vencimento (decisão de 13/10/2026)
      const mes = competenciaDe(acao.lancamento.data);
      const prefixo = acao.lancamento.tipo === "prestacao" ? `p-${mes}` : `a-${mes}`;
      const novo: Lancamento = {
        ...acao.lancamento,
        ...(acao.lancamento.tipo === "prestacao" ? { competencia: mes } : {}),
        id: idLivre(prefixo, estado.calculo.lancamentos),
        origem: "avulso",
        editado: false,
      };
      return comLancamentos(estado, [...estado.calculo.lancamentos, novo], acao.em);
    }
    case "editarLancamento":
      return comLancamentos(
        estado,
        estado.calculo.lancamentos.map((l) =>
          l.id === acao.id ? aplicarMudancas(l, acao.mudancas) : l,
        ),
        acao.em,
      );
    case "aplicarRendimentoDaquiEmDiante": {
      // divide a base no vencimento da linha, com o novo rendimento padrão (§17.2); a linha de
      // onde se aplicou passa a seguir a regra, e as demais ficam como estão
      const origem = estado.calculo.lancamentos.find((l) => l.id === acao.id);
      if (origem === undefined) return estado;
      const base = aplicarRendimentoNaBase(estado.calculo.base, origem.data, acao.rendimento);
      if (base === estado.calculo.base) return estado;
      const lancamentos = estado.calculo.lancamentos.map((l) => {
        if (l.id !== origem.id) return l;
        const semRendimento = { ...l };
        delete semRendimento.rendimento;
        return semRendimento;
      });
      return comCalculo(estado, { base, lancamentos }, acao.em);
    }
    case "excluirLancamento":
      return comLancamentos(
        estado,
        estado.calculo.lancamentos.filter((l) => l.id !== acao.id),
        acao.em,
      );
  }
}
