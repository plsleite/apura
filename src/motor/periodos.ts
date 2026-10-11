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

/** Aviso de sobreposição; `null` em `de` ou em `ate` significa início ou fim aberto. */
function avisoDeSobreposicao(de: DataISO | null, ate: DataISO | null): string {
  const consequencia = "nesses dias prevaleceu o período iniciado antes.";
  if (de !== null && ate !== null) {
    return `Os períodos se sobrepõem de ${formatarData(de)} a ${formatarData(ate)}: ${consequencia}`;
  }
  if (ate !== null) return `Os períodos se sobrepõem até ${formatarData(ate)}: ${consequencia}`;
  if (de !== null)
    return `Os períodos se sobrepõem a partir de ${formatarData(de)}: ${consequencia}`;
  return `Os períodos se sobrepõem em todas as datas: ${consequencia}`;
}

/** O menor de dois fins (`null` = sem fim): o outro, se um deles for nulo. */
function menorFim(a: DataISO | null, b: DataISO | null): DataISO | null {
  if (a === null) return b;
  if (b === null) return a;
  return a < b ? a : b;
}

/** O maior de dois fins (`null` = sem fim): `null` se algum deles for nulo. */
function maiorFim(a: DataISO | null, b: DataISO | null): DataISO | null {
  if (a === null || b === null) return null;
  return a > b ? a : b;
}

/**
 * Avisos sobre a cobertura dos períodos (§6.5). Percorre os períodos em ordem cronológica e compara
 * cada um com o fim mais distante já coberto: dias que nenhum período cobre ficam sem correção e sem
 * juros; dias cobertos por dois períodos seguem o que começa antes. Lista vazia = metodologia
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
  let fimCoberto: DataISO | null = primeiro.ate;
  for (const atual of periodos.slice(1)) {
    if (fimCoberto === null || atual.de === null || atual.de <= fimCoberto) {
      avisos.push(avisoDeSobreposicao(atual.de, menorFim(fimCoberto, atual.ate)));
    } else if (atual.de > diaSeguinte(fimCoberto)) {
      avisos.push(
        `A metodologia não cobre o período de ${formatarData(diaSeguinte(fimCoberto))} a ${formatarData(diaAnterior(atual.de))}: esses dias ficam sem correção e sem juros.`,
      );
    }
    fimCoberto = maiorFim(fimCoberto, atual.ate);
  }
  if (fimCoberto !== null) {
    avisos.push(
      `A metodologia não cobre datas posteriores a ${formatarData(fimCoberto)}: esses dias ficam sem correção e sem juros.`,
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
