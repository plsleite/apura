import type { DataISO, Metodologia, PeriodoMetodologia } from "../compartilhado/tipos.ts";

/** O período da metodologia cujo intervalo [de, ate] (nulos = aberto) contém a data. */
export function periodoVigenteEm(
  metodologia: Metodologia,
  data: DataISO,
): PeriodoMetodologia | undefined {
  return metodologia.periodos.find(
    (periodo) =>
      (periodo.de === null || periodo.de <= data) && (periodo.ate === null || data <= periodo.ate),
  );
}

export interface TrechoDePeriodo {
  periodo: PeriodoMetodologia;
  de: DataISO;
  ate: DataISO;
}

/**
 * Recorta o intervalo [de, ate] pelos períodos da metodologia, em ordem cronológica.
 * Dias que nenhum período cobre ficam de fora (quem chama avisa). Vazio se `ate` < `de`.
 */
export function dividirPorPeriodos(
  metodologia: Metodologia,
  de: DataISO,
  ate: DataISO,
): TrechoDePeriodo[] {
  const trechos: TrechoDePeriodo[] = [];
  if (ate < de) return trechos;
  for (const periodo of metodologia.periodos) {
    const inicio = periodo.de !== null && periodo.de > de ? periodo.de : de;
    const fim = periodo.ate !== null && periodo.ate < ate ? periodo.ate : ate;
    if (inicio <= fim) trechos.push({ periodo, de: inicio, ate: fim });
  }
  return trechos.sort((a, b) => (a.de < b.de ? -1 : a.de > b.de ? 1 : 0));
}
