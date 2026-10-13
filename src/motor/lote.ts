import {
  competenciaDe,
  competenciasEntre,
  competenciaValida,
  dataNoMes,
  mesAnterior,
} from "../compartilhado/datas.ts";
import { decimalOuNulo } from "../compartilhado/decimal.ts";
import { formatarCompetencia } from "../compartilhado/formatacao.ts";
import type {
  Competencia,
  DataISO,
  Lancamento,
  LoteAmortizacoes,
  LotePrestacoes,
} from "../compartilhado/tipos.ts";

export interface LoteGerado {
  /** lançamentos novos, em ordem cronológica, com origem "lote"; a tela os acrescenta a `calculo.lancamentos` */
  lancamentos: Lancamento[];
  /** competências (prestações) ou meses (pagamentos) que já estavam lançados e não foram repetidos */
  pulados: Competencia[];
  avisos: string[];
}

/** Limite inferior das datas do motor (`dataValida` exige ano ≥ 1900). */
const PRIMEIRA_COMPETENCIA: Competencia = "1900-01";

function diaValido(dia: number): boolean {
  return Number.isInteger(dia) && dia >= 1 && dia <= 31;
}

/** Um id que não existe na lista: `p-2026-08`, ou `p-2026-08-2`, `p-2026-08-3`… quando já houver. */
export function idLivre(prefixo: string, existentes: Lancamento[]): string {
  const ids = new Set(existentes.map((l) => l.id));
  if (!ids.has(prefixo)) return prefixo;
  for (let n = 2; ; n++) {
    const id = `${prefixo}-${n}`;
    if (!ids.has(id)) return id;
  }
}

/**
 * Competências do lote de prestações (§6.1): o intervalo de/até quando informado; senão, "N meses
 * em atraso", contados para trás a partir do último vencimento que não ultrapassa a data de
 * elaboração (dia 5, 3 meses, elaboração em 10/10/2026 → ago, set e out/2026; em 03/10/2026 →
 * jul, ago e set/2026).
 */
export function competenciasDoLote(
  lote: LotePrestacoes,
  dataElaboracao: DataISO,
): { competencias: Competencia[]; avisos: string[] } {
  if (!diaValido(lote.diaVencimento)) {
    return {
      competencias: [],
      avisos: [`Dia do vencimento inválido (${lote.diaVencimento}): informe um dia de 1 a 31.`],
    };
  }
  if (lote.de !== undefined || lote.ate !== undefined) {
    if (
      lote.de === undefined ||
      lote.ate === undefined ||
      !competenciaValida(lote.de) ||
      !competenciaValida(lote.ate)
    ) {
      return {
        competencias: [],
        avisos: ["Informe o mês do primeiro e do último vencimento do lote (mês/ano)."],
      };
    }
    if (lote.ate < lote.de) {
      return {
        competencias: [],
        avisos: [
          `Mês final (${formatarCompetencia(lote.ate)}) anterior ao inicial (${formatarCompetencia(lote.de)}): nenhuma prestação lançada.`,
        ],
      };
    }
    return { competencias: competenciasEntre(lote.de, lote.ate), avisos: [] };
  }
  const meses = lote.mesesEmAtraso;
  if (meses === undefined || !Number.isInteger(meses) || meses < 1) {
    return {
      competencias: [],
      avisos: ["Informe quantos meses estão em atraso (1 ou mais) ou o intervalo de vencimentos."],
    };
  }
  let ultima = competenciaDe(dataElaboracao);
  if (dataNoMes(ultima, lote.diaVencimento) > dataElaboracao) {
    if (ultima === PRIMEIRA_COMPETENCIA) {
      return { competencias: [], avisos: ["Não há vencimento anterior a jan/1900 para lançar."] };
    }
    ultima = mesAnterior(ultima);
  }
  const competencias: Competencia[] = [];
  const avisos: string[] = [];
  for (let atual = ultima, i = 0; i < meses; i++) {
    competencias.unshift(atual);
    if (atual === PRIMEIRA_COMPETENCIA) {
      if (i + 1 < meses) {
        avisos.push(
          `As datas do motor começam em jan/1900: lançadas ${competencias.length} prestações em vez de ${meses}.`,
        );
      }
      break;
    }
    atual = mesAnterior(atual);
  }
  return { competencias, avisos };
}

/**
 * Gera as prestações do lote, sem valor informado (o motor apura pela base, §6.3), pulando as
 * competências que já têm prestação de lote ou avulsa sem descrição na lista (§6.1: lotes
 * cumulativos não duplicam; um 13º ou férias avulsos, com descrição, não ocupam a competência). O
 * vencimento é o dia escolhido ou o último dia do mês quando o mês é mais curto.
 */
export function gerarLotePrestacoes(
  lote: LotePrestacoes,
  dataElaboracao: DataISO,
  existentes: Lancamento[],
): LoteGerado {
  const { competencias, avisos } = competenciasDoLote(lote, dataElaboracao);
  // Ocupam a competência as prestações do próprio lote (mesmo anotadas no lápis) e as avulsas sem
  // descrição; uma avulsa com descrição (13º salário, férias) é um extra, e o lote ainda lança a
  // prestação do mês (decisão de 12/10/2026).
  const jaLancadas = new Set(
    existentes
      .filter(
        (l) => l.tipo === "prestacao" && (l.origem === "lote" || (l.descricao ?? "").trim() === ""),
      )
      .map((l) => l.competencia),
  );
  const lancamentos: Lancamento[] = [];
  const pulados: Competencia[] = [];
  for (const competencia of competencias) {
    if (jaLancadas.has(competencia)) {
      pulados.push(competencia);
      continue;
    }
    lancamentos.push({
      id: idLivre(`p-${competencia}`, [...existentes, ...lancamentos]),
      tipo: "prestacao",
      data: dataNoMes(competencia, lote.diaVencimento),
      competencia,
      origem: "lote",
      editado: false,
    });
  }
  if (pulados.length > 0) {
    avisos.push(
      `Meses de vencimento já lançados, não repetidos: ${pulados.map(formatarCompetencia).join(", ")}.`,
    );
  }
  if (competencias.length > 0 && lancamentos.length === 0) {
    avisos.push(
      "Nenhuma prestação nova: todos os meses de vencimento do lote já estavam lançados.",
    );
  }
  return { lancamentos, pulados, avisos };
}

/**
 * Gera um pagamento por mês do intervalo, com o valor mensal e o dia do pagamento (§6.2),
 * descrição "Pagamento parcial", pulando os meses que já têm pagamento na lista. Um segundo
 * pagamento no mesmo mês entra como pagamento avulso.
 */
export function gerarLoteAmortizacoes(
  lote: LoteAmortizacoes,
  existentes: Lancamento[],
): LoteGerado {
  const valor = decimalOuNulo(lote.valorMensal);
  if (valor === null || valor.lte(0)) {
    return {
      lancamentos: [],
      pulados: [],
      avisos: [
        `Valor mensal do pagamento inválido ou não positivo ("${lote.valorMensal}"): nenhum pagamento lançado.`,
      ],
    };
  }
  if (!diaValido(lote.diaPagamento)) {
    return {
      lancamentos: [],
      pulados: [],
      avisos: [`Dia do pagamento inválido (${lote.diaPagamento}): informe um dia de 1 a 31.`],
    };
  }
  if (!competenciaValida(lote.de) || !competenciaValida(lote.ate)) {
    return {
      lancamentos: [],
      pulados: [],
      avisos: ["Informe o mês inicial e o mês final dos pagamentos (mês/ano)."],
    };
  }
  if (lote.ate < lote.de) {
    return {
      lancamentos: [],
      pulados: [],
      avisos: [
        `Mês final (${formatarCompetencia(lote.ate)}) anterior ao inicial (${formatarCompetencia(lote.de)}): nenhum pagamento lançado.`,
      ],
    };
  }
  const jaLancados = new Set(
    existentes.filter((l) => l.tipo === "amortizacao").map((l) => competenciaDe(l.data)),
  );
  const lancamentos: Lancamento[] = [];
  const pulados: Competencia[] = [];
  const avisos: string[] = [];
  for (const competencia of competenciasEntre(lote.de, lote.ate)) {
    if (jaLancados.has(competencia)) {
      pulados.push(competencia);
      continue;
    }
    lancamentos.push({
      id: idLivre(`a-${competencia}`, [...existentes, ...lancamentos]),
      tipo: "amortizacao",
      data: dataNoMes(competencia, lote.diaPagamento),
      descricao: "Pagamento parcial",
      valorInformado: lote.valorMensal,
      origem: "lote",
      editado: false,
    });
  }
  if (pulados.length > 0) {
    avisos.push(
      `Meses com pagamento já lançado, não repetidos: ${pulados.map(formatarCompetencia).join(", ")}.`,
    );
  }
  if (lancamentos.length === 0) {
    avisos.push("Nenhum pagamento novo: todos os meses do lote já tinham pagamento lançado.");
  }
  return { lancamentos, pulados, avisos };
}
