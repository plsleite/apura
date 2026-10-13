import { diaAnterior } from "../../compartilhado/datas.ts";
import { formatarData, formatarPercentual } from "../../compartilhado/formatacao.ts";
import { decimalOuNulo } from "../../compartilhado/decimal.ts";
import type {
  DataISO,
  IndiceCorrecao,
  Metodologia,
  PeriodoMetodologia,
  RegraJuros,
} from "../../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../../metodologias/padrao.ts";
import { periodosOrdenados } from "../../motor/periodos.ts";

/**
 * Edição da metodologia por períodos (§6.5, §9.2): resumo em uma frase para a tela, divisão de um
 * período numa data, remoção de uma divisão, troca de índice e de regra de juros em cada período
 * ("SELIC única" é uma escolha só: juros `selicUnica` e correção "nenhum"), incidência no mês
 * inicial e deflação. Toda função devolve uma cópia nova com `ajustada` recalculada (true quando
 * difere da metodologia padrão). Módulo puro.
 */

export type EscolhaDeJuros = "percentualMensal" | "taxaLegal" | "selicUnica";

/** Forma canônica (campos conhecidos, em ordem fixa, sem `ajustada`), para comparar metodologias. */
function canonico(m: Metodologia): string {
  return JSON.stringify({
    id: m.id,
    versao: m.versao,
    nome: m.nome,
    periodos: periodosOrdenados(m).map((p) => [
      p.de,
      p.ate,
      p.correcao.indice,
      p.juros.tipo,
      p.juros.tipo === "percentualMensal" ? p.juros.taxaMensal : null,
    ]),
    incidenciaMesInicial: m.incidenciaMesInicial,
    deflacao: m.deflacao,
    arredondamento: [
      m.arredondamento.fatorCasas,
      m.arredondamento.percentualCasas,
      m.arredondamento.valorCasas,
      m.arredondamento.modo,
    ],
  });
}

/** True quando a metodologia é, campo a campo, a padrão "TJMS/SAJ v1" (a ordem das chaves não importa). */
export function ehPadrao(m: Metodologia): boolean {
  return canonico(m) === canonico(metodologiaPadrao());
}

/** Cópia com `ajustada` recalculada e os períodos em ordem cronológica. */
export function normalizar(m: Metodologia): Metodologia {
  const ordenada: Metodologia = { ...structuredClone(m), periodos: periodosOrdenados(m) };
  return { ...ordenada, ajustada: !ehPadrao(ordenada) };
}

/** "Até 29/08/2024", "Desde 30/08/2024", "De 01/01/2020 a 31/12/2022" ou "Sempre". */
export function descreverIntervalo(p: Pick<PeriodoMetodologia, "de" | "ate">): string {
  if (p.de !== null && p.ate !== null) return `De ${formatarData(p.de)} a ${formatarData(p.ate)}`;
  if (p.de !== null) return `Desde ${formatarData(p.de)}`;
  if (p.ate !== null) return `Até ${formatarData(p.ate)}`;
  return "Sempre";
}

/** "IGP-M e juros de 1% ao mês", "IPCA e taxa legal", "SELIC única (correção e juros juntos)", "sem correção e sem juros". */
export function descreverRegras(p: PeriodoMetodologia): string {
  if (p.juros.tipo === "selicUnica") return "SELIC única (correção e juros juntos)";
  const correcao = p.correcao.indice === "nenhum" ? "sem correção" : p.correcao.indice;
  if (p.juros.tipo === "taxaLegal") return `${correcao} e taxa legal`;
  const taxa = decimalOuNulo(p.juros.taxaMensal);
  const juros =
    taxa === null
      ? `juros de "${p.juros.taxaMensal}" ao mês (taxa inválida)`
      : taxa.isZero()
        ? "sem juros"
        : `juros de ${formatarPercentual(taxa, taxa.decimalPlaces() > 2 ? taxa.decimalPlaces() : taxa.decimalPlaces() === 0 ? 0 : 2)} ao mês`;
  return `${correcao} e ${juros}`;
}

/** Resumo em uma frase (§9.2): "Até 29/08/2024: IGP-M e juros de 1% ao mês. Desde 30/08/2024: IPCA e taxa legal." */
export function resumirMetodologia(m: Metodologia): string {
  const periodos = periodosOrdenados(m);
  if (periodos.length === 0) return "Sem períodos: nenhum lançamento recebe correção nem juros.";
  return periodos.map((p) => `${descreverIntervalo(p)}: ${descreverRegras(p)}.`).join(" ");
}

/**
 * Divide na data o período que a contém: [de, véspera] e [data, até], com as mesmas regras.
 * Data que já é início de período, ou fora de todos os períodos, não divide (devolve o aviso).
 */
export function dividirPeriodo(
  m: Metodologia,
  data: DataISO,
): { metodologia: Metodologia; aviso?: string } {
  const periodos = periodosOrdenados(m);
  const indice = periodos.findIndex(
    (p) => (p.de === null || p.de <= data) && (p.ate === null || data <= p.ate),
  );
  const alvo = periodos[indice];
  if (alvo === undefined) {
    return {
      metodologia: m,
      aviso: `Nenhum período cobre ${formatarData(data)}: nada foi dividido.`,
    };
  }
  if (alvo.de === data) {
    return { metodologia: m, aviso: `Já existe uma divisão em ${formatarData(data)}.` };
  }
  const antes: PeriodoMetodologia = { ...structuredClone(alvo), ate: diaAnterior(data) };
  const depois: PeriodoMetodologia = { ...structuredClone(alvo), de: data };
  return {
    metodologia: normalizar({
      ...m,
      periodos: [...periodos.slice(0, indice), antes, depois, ...periodos.slice(indice + 1)],
    }),
  };
}

/** Remove a divisão que começa o período `indice` (≥ 1): ele é absorvido pelo anterior, que mantém as próprias regras. */
export function removerDivisao(m: Metodologia, indice: number): Metodologia {
  const periodos = periodosOrdenados(m);
  const anterior = periodos[indice - 1];
  const removido = periodos[indice];
  if (indice < 1 || anterior === undefined || removido === undefined) return m;
  const fundido: PeriodoMetodologia = { ...structuredClone(anterior), ate: removido.ate };
  return normalizar({
    ...m,
    periodos: [...periodos.slice(0, indice - 1), fundido, ...periodos.slice(indice + 1)],
  });
}

/** Troca o índice de correção do período; com SELIC única, o índice é sempre "nenhum". */
export function escolherIndice(
  m: Metodologia,
  indice: number,
  correcao: IndiceCorrecao,
): Metodologia {
  const periodos = periodosOrdenados(m);
  const alvo = periodos[indice];
  if (alvo === undefined) return m;
  const novo: PeriodoMetodologia = {
    ...structuredClone(alvo),
    correcao: { indice: alvo.juros.tipo === "selicUnica" ? "nenhum" : correcao },
  };
  return normalizar({ ...m, periodos: periodos.with(indice, novo) });
}

/**
 * Troca a regra de juros do período: "percentualMensal" mantém a taxa que havia (ou 1% ao mês),
 * "taxaLegal" não tem taxa, e "selicUnica" é uma escolha só: zera também o índice de correção.
 */
export function escolherJuros(
  m: Metodologia,
  indice: number,
  escolha: EscolhaDeJuros,
): Metodologia {
  const periodos = periodosOrdenados(m);
  const alvo = periodos[indice];
  if (alvo === undefined) return m;
  const juros: RegraJuros =
    escolha === "percentualMensal"
      ? {
          tipo: "percentualMensal",
          taxaMensal: alvo.juros.tipo === "percentualMensal" ? alvo.juros.taxaMensal : "1",
        }
      : { tipo: escolha };
  const novo: PeriodoMetodologia = {
    ...structuredClone(alvo),
    juros,
    correcao: { indice: escolha === "selicUnica" ? "nenhum" : alvo.correcao.indice },
  };
  return normalizar({ ...m, periodos: periodos.with(indice, novo) });
}

/** Troca a taxa mensal do período (só faz sentido com juros "percentualMensal"). */
export function escolherTaxa(m: Metodologia, indice: number, taxaMensal: string): Metodologia {
  const periodos = periodosOrdenados(m);
  const alvo = periodos[indice];
  if (alvo === undefined || alvo.juros.tipo !== "percentualMensal") return m;
  const novo: PeriodoMetodologia = {
    ...structuredClone(alvo),
    juros: { tipo: "percentualMensal", taxaMensal },
  };
  return normalizar({ ...m, periodos: periodos.with(indice, novo) });
}

export function escolherOpcoes(
  m: Metodologia,
  opcoes: Partial<Pick<Metodologia, "incidenciaMesInicial" | "deflacao">>,
): Metodologia {
  return normalizar({ ...m, ...opcoes });
}

/** De volta à metodologia padrão "TJMS/SAJ v1". */
export function restaurarPadrao(): Metodologia {
  return metodologiaPadrao();
}
