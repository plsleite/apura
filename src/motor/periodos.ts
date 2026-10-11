import { diaAnterior, diaSeguinte } from "../compartilhado/datas.ts";
import { formatarData } from "../compartilhado/formatacao.ts";
import type { DataISO, Metodologia, PeriodoMetodologia } from "../compartilhado/tipos.ts";

/** Os períodos em ordem cronológica (o de início aberto vem primeiro). */
export function periodosOrdenados(metodologia: Metodologia): PeriodoMetodologia[] {
  return [...metodologia.periodos].sort((a, b) => {
    if (a.de === b.de) return 0;
    if (a.de === null) return -1;
    if (b.de === null) return 1;
    return a.de < b.de ? -1 : 1;
  });
}

/** O primeiro período, em ordem cronológica, cujo intervalo [de, ate] (nulos = aberto) contém a data. */
export function periodoVigenteEm(
  metodologia: Metodologia,
  data: DataISO,
): PeriodoMetodologia | undefined {
  return periodosOrdenados(metodologia).find(
    (periodo) =>
      (periodo.de === null || periodo.de <= data) && (periodo.ate === null || data <= periodo.ate),
  );
}

/**
 * Avisos sobre a cobertura dos períodos (§6.5): dias que nenhum período cobre ficam sem correção
 * e sem juros; dias cobertos por dois períodos seguem o que começa antes. Lista vazia = metodologia
 * contínua, do início aberto ao fim aberto.
 */
export function validarMetodologia(metodologia: Metodologia): string[] {
  const avisos: string[] = [];
  const periodos = periodosOrdenados(metodologia);
  const primeiro = periodos[0];
  if (primeiro === undefined) {
    return ["A metodologia não tem períodos: nenhum lançamento recebe correção nem juros."];
  }
  if (primeiro.de !== null) {
    avisos.push(
      `A metodologia não cobre datas anteriores a ${formatarData(primeiro.de)}: esses dias ficam sem correção e sem juros.`,
    );
  }
  for (let i = 1; i < periodos.length; i++) {
    const anterior = periodos[i - 1];
    const atual = periodos[i];
    if (anterior === undefined || atual === undefined || atual.de === null) continue;
    if (anterior.ate === null || atual.de <= anterior.ate) {
      const fim =
        anterior.ate !== null && (atual.ate === null || anterior.ate < atual.ate)
          ? anterior.ate
          : atual.ate;
      avisos.push(
        `Os períodos se sobrepõem de ${formatarData(atual.de)} a ${fim === null ? "o fim" : formatarData(fim)}: nesses dias prevaleceu o período iniciado antes.`,
      );
    } else if (atual.de > diaSeguinte(anterior.ate)) {
      avisos.push(
        `A metodologia não cobre o período de ${formatarData(diaSeguinte(anterior.ate))} a ${formatarData(diaAnterior(atual.de))}: esses dias ficam sem correção e sem juros.`,
      );
    }
  }
  const ultimo = periodos[periodos.length - 1];
  if (ultimo !== undefined && ultimo.ate !== null) {
    avisos.push(
      `A metodologia não cobre datas posteriores a ${formatarData(ultimo.ate)}: esses dias ficam sem correção e sem juros.`,
    );
  }
  return avisos;
}

export interface TrechoDePeriodo {
  periodo: PeriodoMetodologia;
  de: DataISO;
  ate: DataISO;
}

/**
 * Recorta o intervalo [de, ate] pelos períodos da metodologia, em ordem cronológica, sem contar
 * dia algum duas vezes: quando dois períodos se sobrepõem, o que começa antes fica com os dias
 * comuns. Dias que nenhum período cobre ficam de fora (`validarMetodologia` avisa). Vazio se
 * `ate` < `de`.
 */
export function dividirPorPeriodos(
  metodologia: Metodologia,
  de: DataISO,
  ate: DataISO,
): TrechoDePeriodo[] {
  const trechos: TrechoDePeriodo[] = [];
  if (ate < de) return trechos;
  let cursor = de;
  for (const periodo of periodosOrdenados(metodologia)) {
    const inicio = periodo.de !== null && periodo.de > cursor ? periodo.de : cursor;
    const fim = periodo.ate !== null && periodo.ate < ate ? periodo.ate : ate;
    if (inicio > fim) continue;
    trechos.push({ periodo, de: inicio, ate: fim });
    if (fim === ate) break;
    cursor = diaSeguinte(fim);
  }
  return trechos;
}
