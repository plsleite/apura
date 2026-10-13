import { competenciaDe, dataNoMes, decompor, mesSeguinte } from "../../compartilhado/datas.ts";
import { paraTexto } from "../../compartilhado/decimal.ts";
import type {
  Calculo,
  DataISO,
  EncargosProprios,
  Lancamento,
  TabelaIndices,
  TextoDecimal,
} from "../../compartilhado/tipos.ts";
import { apurarPelaBase } from "../../motor/base.ts";

/**
 * Sugestões da linha nova de "+ Prestação" e "+ Pagamento" (decisões de 13/10/2026): a linha
 * aparece na tabela já preenchida, editável, e herda as regras próprias de correção e juros
 * (metodologia própria) do último lançamento do mesmo tipo; os termos próprios (datas) não são
 * herdados, e a correção e os juros correm da data da linha até a data do cálculo. Módulo puro.
 */
export interface RascunhoDeLancamento {
  tipo: Lancamento["tipo"];
  data: DataISO;
  /** valor sugerido (texto decimal com ponto), ou "" quando não há o que sugerir */
  valor: TextoDecimal;
  /**
   * prestação cujo valor sugerido vem da base dos alimentos: se a pessoa não mexer no valor, ela
   * entra sem valor informado (continua pela base, com reajustes)
   */
  pelaBase: boolean;
  encargos?: EncargosProprios;
}

/**
 * Valor que a base dos alimentos dá para uma prestação com este vencimento (pelo período em que
 * ele cai, §17.2), ou "" se não dá.
 */
export function valorPelaBase(
  calculo: Calculo,
  tabela: TabelaIndices,
  data: DataISO,
): TextoDecimal {
  const casas = calculo.metodologia.arredondamento.valorCasas;
  const prestacao: Lancamento = {
    id: "rascunho",
    tipo: "prestacao",
    data,
    competencia: competenciaDe(data),
    origem: "avulso",
    editado: false,
  };
  const apurado = apurarPelaBase(prestacao, calculo.base, tabela, casas);
  return apurado.valor === null ? "" : paraTexto(apurado.valor, casas);
}

/** O pagamento mais recente pela data (o último incluído, entre os do mesmo dia). */
function ultimoPagamento(calculo: Calculo): Lancamento | undefined {
  return calculo.lancamentos
    .filter((l) => l.tipo === "amortizacao")
    .reduce<Lancamento | undefined>(
      (ultimo, l) => (ultimo && ultimo.data > l.data ? ultimo : l),
      undefined,
    );
}

/**
 * A prestação que serve de modelo: a última comum (sem descrição); só se não houver nenhuma, a
 * última de todas. Um 13º ou férias avulsos (com descrição) são extras e não ditam o vencimento,
 * o valor nem as regras da próxima prestação.
 */
function ultimaPrestacaoComum(calculo: Calculo): Lancamento | undefined {
  const prestacoes = calculo.lancamentos.filter((l) => l.tipo === "prestacao");
  return prestacoes.filter((l) => (l.descricao ?? "").trim() === "").at(-1) ?? prestacoes.at(-1);
}

function herdarRegras(anterior: Lancamento | undefined): EncargosProprios | undefined {
  const metodologia = anterior?.encargos?.metodologia;
  return metodologia === undefined ? undefined : { metodologia: structuredClone(metodologia) };
}

/**
 * Prestação nova: vencimento no mês seguinte ao da última prestação comum, no mesmo dia (último
 * dia do mês quando ele é mais curto); sem prestação anterior, a data de elaboração. Valor: o
 * informado à mão da última comum, se ela o tinha (a nova também fica como informada); senão, o da
 * base para o novo vencimento.
 */
export function sugerirPrestacao(calculo: Calculo, tabela: TabelaIndices): RascunhoDeLancamento {
  const anterior = ultimaPrestacaoComum(calculo);
  const data =
    anterior === undefined
      ? calculo.dataElaboracao
      : dataNoMes(mesSeguinte(competenciaDe(anterior.data)), decompor(anterior.data).dia);
  const encargos = herdarRegras(anterior);
  const comum = { tipo: "prestacao" as const, data, ...(encargos ? { encargos } : {}) };
  if (anterior?.valorInformado !== undefined) {
    return { ...comum, valor: anterior.valorInformado, pelaBase: false };
  }
  return { ...comum, valor: valorPelaBase(calculo, tabela, data), pelaBase: true };
}

/**
 * Pagamento novo (decisão de 13/10/2026, fase 5b): no mês seguinte ao do último pagamento, no
 * mesmo dia (último dia do mês quando ele é mais curto), com o valor dele; sem pagamento anterior,
 * a data de elaboração e o valor em branco. A data pode passar da data do cálculo: a pessoa a
 * corrige na linha antes de incluí-la.
 */
export function sugerirPagamento(calculo: Calculo): RascunhoDeLancamento {
  const anterior = ultimoPagamento(calculo);
  const encargos = herdarRegras(anterior);
  return {
    tipo: "amortizacao",
    data:
      anterior === undefined
        ? calculo.dataElaboracao
        : dataNoMes(mesSeguinte(competenciaDe(anterior.data)), decompor(anterior.data).dia),
    valor: anterior?.valorInformado ?? "",
    pelaBase: false,
    ...(encargos ? { encargos } : {}),
  };
}
