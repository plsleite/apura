import { decimalOuNulo } from "../compartilhado/decimal.ts";
import type {
  Calculo,
  Lancamento,
  LancamentoCalculado,
  Resultado,
} from "../compartilhado/tipos.ts";

/** Utilitários de texto do relatório (§18): listas, percentuais, pares de lançamentos. Puro. */

export const MESES_POR_EXTENSO = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

/** "a", "a e b", "a, b e c". */
export function listar(itens: readonly string[]): string {
  if (itens.length <= 1) return itens[0] ?? "";
  return `${itens.slice(0, -1).join(", ")} e ${itens.at(-1) ?? ""}`;
}

/** "30%", "12,5%": o percentual como foi informado, sem casas fixas; nulo se inválido. */
export function percentualInformado(texto: string): string | null {
  const valor = decimalOuNulo(texto);
  return valor === null ? null : `${valor.toFixed().replace(".", ",")}%`;
}

/** Primeira letra maiúscula. */
export function maiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Troca o hífen do sinal negativo pelo sinal de menos tipográfico: "-0,53%" → "−0,53%". */
export function comSinalDeMenos(texto: string): string {
  return texto.replace(/^-/, "−");
}

/** Um lançamento do cálculo com o seu resultado (o motor devolve na mesma ordem). */
export interface Par {
  lancamento: Lancamento;
  calculado: LancamentoCalculado;
}

export function pares(calculo: Calculo, resultado: Resultado): Par[] {
  return calculo.lancamentos.flatMap((lancamento, i) => {
    const calculado = resultado.lancamentos[i];
    return calculado === undefined ? [] : [{ lancamento, calculado }];
  });
}
