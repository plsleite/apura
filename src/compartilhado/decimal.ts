import { Decimal } from "decimal.js";

// Precisão interna alta (40 dígitos significativos) para que o arredondamento final, a 2 ou a
// 6 casas, nunca seja afetado por erro acumulado nas contas. Modo comercial = meio para cima.
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

/** Texto decimal com ponto, como gravado em arquivos e no Resultado: "451.91", "0.64". */
export type TextoDecimal = string;

/** Constrói um Decimal a partir de texto; devolve o próprio objeto se já for Decimal. */
export function decimal(valor: TextoDecimal | Decimal): Decimal {
  return valor instanceof Decimal ? valor : new Decimal(valor);
}

/** Arredondamento comercial (meio para cima) a `casas` casas decimais. */
export function arredondar(valor: Decimal, casas: number): Decimal {
  return valor.toDecimalPlaces(casas, Decimal.ROUND_HALF_UP);
}

/** Arredonda e fixa o número de casas, com zeros à direita: paraTexto(1.01302, 6) = "1.013020". */
export function paraTexto(valor: Decimal, casas: number): TextoDecimal {
  return arredondar(valor, casas).toFixed(casas);
}

export const ZERO = new Decimal(0);
export const UM = new Decimal(1);
export const CEM = new Decimal(100);

const FORMATO_TEXTO_DECIMAL = /^-?\d+(\.\d+)?$/;

/**
 * Texto decimal que o motor aceita: dígitos com ponto decimal e sinal opcionais ("451.91", "-1.10",
 * "30"). Recusa vírgula, vazio, espaços, "NaN", "Infinity" e notação com expoente.
 */
export function textoDecimalValido(texto: string): boolean {
  return FORMATO_TEXTO_DECIMAL.test(texto);
}

/** `Decimal` do texto quando ele é válido; `null` caso contrário (o motor avisa em vez de lançar erro). */
export function decimalOuNulo(texto: string | undefined): Decimal | null {
  return texto !== undefined && textoDecimalValido(texto) ? new Decimal(texto) : null;
}
