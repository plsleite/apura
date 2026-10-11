/** Data como texto "AAAA-MM-DD". Ordena alfabeticamente na ordem cronológica. */
export type DataISO = string;
/** Competência (mês de referência) como texto "AAAA-MM". */
export type Competencia = string;

const FORMATO_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
const FORMATO_COMPETENCIA = /^(\d{4})-(\d{2})$/;

export function bissexto(ano: number): boolean {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

export function diasDoMes(ano: number, mes: number): number {
  if (mes === 2) return bissexto(ano) ? 29 : 28;
  return mes === 4 || mes === 6 || mes === 9 || mes === 11 ? 30 : 31;
}

export function dataValida(texto: string): boolean {
  const partes = FORMATO_DATA.exec(texto);
  if (!partes) return false;
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  return ano >= 1900 && mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasDoMes(ano, mes);
}

/** Lança erro para data inválida: a tela valida antes, e o motor só recebe datas válidas. */
export function decompor(data: DataISO): { ano: number; mes: number; dia: number } {
  if (!dataValida(data)) throw new Error(`Data inválida: ${data}`);
  return {
    ano: Number(data.slice(0, 4)),
    mes: Number(data.slice(5, 7)),
    dia: Number(data.slice(8, 10)),
  };
}

export function compor(ano: number, mes: number, dia: number): DataISO {
  return `${comporCompetencia(ano, mes)}-${String(dia).padStart(2, "0")}`;
}

export function competenciaValida(texto: string): boolean {
  const partes = FORMATO_COMPETENCIA.exec(texto);
  if (!partes) return false;
  const mes = Number(partes[2]);
  return Number(partes[1]) >= 1900 && mes >= 1 && mes <= 12;
}

export function competenciaDe(data: DataISO): Competencia {
  return data.slice(0, 7);
}

export function decomporCompetencia(competencia: Competencia): { ano: number; mes: number } {
  if (!competenciaValida(competencia)) throw new Error(`Competência inválida: ${competencia}`);
  return { ano: Number(competencia.slice(0, 4)), mes: Number(competencia.slice(5, 7)) };
}

export function comporCompetencia(ano: number, mes: number): Competencia {
  return `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}`;
}

export function mesSeguinte(competencia: Competencia): Competencia {
  const { ano, mes } = decomporCompetencia(competencia);
  return mes === 12 ? comporCompetencia(ano + 1, 1) : comporCompetencia(ano, mes + 1);
}

/** Competências de `de` a `ate`, inclusive; vazio se `ate` é anterior a `de`. */
export function competenciasEntre(de: Competencia, ate: Competencia): Competencia[] {
  const lista: Competencia[] = [];
  for (let atual = de; atual <= ate; atual = mesSeguinte(atual)) lista.push(atual);
  return lista;
}

export function primeiroDiaDoMes(competencia: Competencia): DataISO {
  return `${competencia}-01`;
}

export function ultimoDiaDoMes(competencia: Competencia): DataISO {
  const { ano, mes } = decomporCompetencia(competencia);
  return compor(ano, mes, diasDoMes(ano, mes));
}

/**
 * Dias desde 1970-01-01 pelo algoritmo civil (Howard Hinnant), sem objetos Date e sem fuso
 * horário. Negativo para datas anteriores a 1970.
 */
export function diasDesdeEpoca(data: DataISO): number {
  const { ano, mes, dia } = decompor(data);
  const anoDeslocado = mes <= 2 ? ano - 1 : ano;
  const era = Math.floor(anoDeslocado / 400);
  const anoDaEra = anoDeslocado - era * 400;
  const mesDeslocado = mes > 2 ? mes - 3 : mes + 9;
  const diaDoAno = Math.floor((153 * mesDeslocado + 2) / 5) + dia - 1;
  const diaDaEra =
    anoDaEra * 365 + Math.floor(anoDaEra / 4) - Math.floor(anoDaEra / 100) + diaDoAno;
  return era * 146097 + diaDaEra - 719468;
}

/** Dias de `a` até `b` (b − a); o dia inicial não conta. Negativo se `b` é anterior. */
export function diasEntre(a: DataISO, b: DataISO): number {
  return diasDesdeEpoca(b) - diasDesdeEpoca(a);
}

export interface TrechoMensal {
  competencia: Competencia;
  de: DataISO;
  ate: DataISO;
  /** dias do trecho dentro do mês, contando as duas pontas */
  dias: number;
  diasDoMes: number;
}

/**
 * Divide o intervalo [inicio, fim] por mês-calendário, contando o dia inicial e o dia final
 * (10/01 a 31/01 = 22 dias), como o SAJ faz nos juros. Vazio se `fim` é anterior a `inicio`.
 */
export function ratearPorMesCalendario(inicio: DataISO, fim: DataISO): TrechoMensal[] {
  const trechos: TrechoMensal[] = [];
  if (fim < inicio) return trechos;
  const competenciaInicial = competenciaDe(inicio);
  const competenciaFinal = competenciaDe(fim);
  for (const competencia of competenciasEntre(competenciaInicial, competenciaFinal)) {
    const de = competencia === competenciaInicial ? inicio : primeiroDiaDoMes(competencia);
    const ate = competencia === competenciaFinal ? fim : ultimoDiaDoMes(competencia);
    const { ano, mes } = decomporCompetencia(competencia);
    trechos.push({
      competencia,
      de,
      ate,
      dias: diasEntre(de, ate) + 1,
      diasDoMes: diasDoMes(ano, mes),
    });
  }
  return trechos;
}
