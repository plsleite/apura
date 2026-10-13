import { diaAnterior } from "../../compartilhado/datas.ts";
import { formatarData } from "../../compartilhado/formatacao.ts";
import type { Base, DataISO, FormaDaBase, PeriodoDaBase } from "../../compartilhado/tipos.ts";
import { descreverPeriodoDaBase, periodosDaBaseOrdenados } from "../../motor/base.ts";
import { DATA_MINIMA } from "../entrada.ts";

/**
 * Edição da base dos alimentos por períodos (§17.2, fase 5b), no padrão do editor de períodos da
 * metodologia: dividir numa data (o período novo nasce como cópia do dividido), remover uma
 * divisão (o período é absorvido pelo anterior, que mantém a própria forma), trocar a forma de um
 * período.
 * Toda função devolve uma base nova, com os períodos em ordem cronológica. Módulo puro.
 */

/** "Até 31/12/2024", "De 01/01/2025 a 30/06/2025", "Desde 01/07/2025": o título do bloco na seção 2. */
export function tituloDoPeriodo(p: Pick<PeriodoDaBase, "de" | "ate">): string {
  const texto = descreverPeriodoDaBase(p);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Divide na data o período que a contém; data que já é início de período não divide (aviso). */
export function dividirBase(base: Base, data: DataISO): { base: Base; aviso?: string } {
  // o período anterior acabaria em 1899, antes da primeira data que o arquivo aceita
  if (data <= DATA_MINIMA) {
    return { base, aviso: `A data precisa ser posterior a ${formatarData(DATA_MINIMA)}.` };
  }
  const periodos = periodosDaBaseOrdenados(base);
  const indice = periodos.findIndex(
    (p) => (p.de === null || p.de <= data) && (p.ate === null || data <= p.ate),
  );
  const alvo = periodos[indice];
  if (alvo === undefined) {
    return { base, aviso: `Nenhum período cobre ${formatarData(data)}: nada foi dividido.` };
  }
  if (alvo.de === data) {
    return { base, aviso: `Já existe uma divisão em ${formatarData(data)}.` };
  }
  const antes: PeriodoDaBase = { ...structuredClone(alvo), ate: diaAnterior(data) };
  const depois: PeriodoDaBase = { ...structuredClone(alvo), de: data };
  return {
    base: {
      periodos: [...periodos.slice(0, indice), antes, depois, ...periodos.slice(indice + 1)],
    },
  };
}

/** Remove a divisão que começa o período `indice` (≥ 1): o anterior se estende até o fim dele. */
export function removerDivisaoDaBase(base: Base, indice: number): Base {
  const periodos = periodosDaBaseOrdenados(base);
  const anterior = periodos[indice - 1];
  const removido = periodos[indice];
  if (indice < 1 || anterior === undefined || removido === undefined) return base;
  const fundido: PeriodoDaBase = { ...structuredClone(anterior), ate: removido.ate };
  return {
    periodos: [...periodos.slice(0, indice - 1), fundido, ...periodos.slice(indice + 1)],
  };
}

/** Troca a forma (e os campos) do período `indice`. */
export function trocarForma(base: Base, indice: number, forma: FormaDaBase): Base {
  const periodos = periodosDaBaseOrdenados(base);
  const alvo = periodos[indice];
  if (alvo === undefined) return base;
  return { periodos: periodos.with(indice, { ...alvo, forma }) };
}
