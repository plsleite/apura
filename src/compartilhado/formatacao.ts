import type { Competencia, DataISO } from "./datas.ts";
import { paraTexto, type Decimal } from "./decimal.ts";

const MESES_ABREVIADOS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

/**
 * "R$ 1.234,56"; valores negativos como "-R$ 6.957,45".
 * O sinal vem do texto já arredondado: um negativo que arredonda para zero sai "R$ 0,00".
 */
export function formatarMoeda(valor: Decimal): string {
  const texto = paraTexto(valor, 2);
  const negativo = texto.startsWith("-");
  const partes = (negativo ? texto.slice(1) : texto).split(".");
  const inteiro = (partes[0] ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const centavos = partes[1] ?? "00";
  return `${negativo ? "-" : ""}R$ ${inteiro},${centavos}`;
}

/** "2018-05-25" → "25/05/2018". */
export function formatarData(data: DataISO): string {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`;
}

/** "2018-05" → "mai/2018". */
export function formatarCompetencia(competencia: Competencia): string {
  const mes = Number(competencia.slice(5, 7));
  return `${MESES_ABREVIADOS[mes - 1] ?? "?"}/${competencia.slice(0, 4)}`;
}

/** "16,516129%" */
export function formatarPercentual(valor: Decimal, casas: number): string {
  return `${paraTexto(valor, casas).replace(".", ",")}%`;
}

/** "1,013020" (sempre 6 casas) */
export function formatarFator(valor: Decimal): string {
  return paraTexto(valor, 6).replace(".", ",");
}
