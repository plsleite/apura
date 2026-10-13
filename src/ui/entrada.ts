import { competenciaValida, dataValida } from "../compartilhado/datas.ts";
import { decimal, paraTexto, textoDecimalValido, ZERO } from "../compartilhado/decimal.ts";
import type { Competencia, DataISO, TextoDecimal } from "../compartilhado/tipos.ts";

/**
 * Leitura do que o usuário digita (§9.4: formatação pt-BR, entrada de valores aceita vírgula,
 * validação inline). Cada função devolve o valor no formato do motor ou a frase do erro, que a
 * tela mostra embaixo do campo. Módulo puro, sem DOM.
 */

export type Leitura<T> = { ok: true; valor: T } | { ok: false; erro: string };

const SO_DIGITOS = /^\d+$/;
const COM_MILHARES = /^\d{1,3}(\.\d{3})+$/;
const ERRO_DE_FORMATO: Leitura<never> = {
  ok: false,
  erro: "Use vírgula para os centavos (ex.: 1.234,56 ou 1234,56).",
};

/**
 * Lê um número em pt-BR: "1.234,56", "1234,56", "1.234", "1234", "0,3", ",5", com sinal, e ignora
 * "R$", "%" e espaços. O ponto só vale como separador de milhar (grupos de três dígitos): "1.5" é
 * recusado, para nunca ler R$ 1,50 como R$ 15,00. Devolve o texto decimal com ponto do motor.
 */
export function lerDecimal(texto: string): Leitura<TextoDecimal> {
  const limpo = texto.replace(/R\$|%|\s/g, "");
  if (limpo === "") return { ok: false, erro: "Informe um número." };
  const negativo = limpo.startsWith("-");
  const partes = (negativo ? limpo.slice(1) : limpo).split(",");
  const [inteiro, centavos] = partes;
  if (partes.length > 2 || inteiro === undefined) return ERRO_DE_FORMATO;
  if (centavos !== undefined && !SO_DIGITOS.test(centavos)) return ERRO_DE_FORMATO;
  let parteInteira: string;
  if (SO_DIGITOS.test(inteiro)) parteInteira = inteiro;
  else if (COM_MILHARES.test(inteiro)) parteInteira = inteiro.replaceAll(".", "");
  else if (inteiro === "" && centavos !== undefined) parteInteira = "0";
  else return ERRO_DE_FORMATO;
  const valor = `${negativo ? "-" : ""}${parteInteira}${centavos === undefined ? "" : `.${centavos}`}`;
  return textoDecimalValido(valor) ? { ok: true, valor } : ERRO_DE_FORMATO;
}

/** Valor em reais que precisa ser maior que zero (prestação, pagamento, valor fixado, rendimento). */
export function lerValorPositivo(texto: string): Leitura<TextoDecimal> {
  const leitura = lerDecimal(texto);
  if (!leitura.ok) return leitura;
  if (decimal(leitura.valor).lte(ZERO)) {
    return { ok: false, erro: "Informe um valor maior que zero." };
  }
  return leitura;
}

/** Percentual que não pode ser negativo (multa, honorários, taxa mensal, percentual da base). */
export function lerPercentual(texto: string): Leitura<TextoDecimal> {
  const leitura = lerDecimal(texto);
  if (!leitura.ok) return leitura;
  if (decimal(leitura.valor).lt(ZERO)) {
    return { ok: false, erro: "O percentual não pode ser negativo." };
  }
  return leitura;
}

/** Número inteiro entre `minimo` e `maximo` (dia do mês, meses em atraso). */
export function lerInteiro(texto: string, minimo: number, maximo: number): Leitura<number> {
  const limpo = texto.trim();
  const erro = { ok: false, erro: `Informe um número inteiro de ${minimo} a ${maximo}.` } as const;
  if (!SO_DIGITOS.test(limpo)) return erro;
  const numero = Number(limpo);
  return numero >= minimo && numero <= maximo ? { ok: true, valor: numero } : erro;
}

/** Competência digitada como "mm/aaaa" (também "m/aaaa"), devolvida como "AAAA-MM". */
export function lerCompetenciaTexto(texto: string): Leitura<Competencia> {
  const partes = /^\s*(\d{1,2})\s*\/\s*(\d{4})\s*$/.exec(texto);
  const erro = { ok: false, erro: "Informe o mês como mm/aaaa (ex.: 10/2026)." } as const;
  if (!partes) return erro;
  const competencia = `${partes[2]}-${(partes[1] ?? "").padStart(2, "0")}`;
  return competenciaValida(competencia) ? { ok: true, valor: competencia } : erro;
}

/** "2026-10" → "10/2026", o formato dos campos de competência. */
export function formatarCompetenciaParaCampo(competencia: Competencia): string {
  return `${competencia.slice(5, 7)}/${competencia.slice(0, 4)}`;
}

/** "1234.5" → "1.234,50": como um campo de valor em reais mostra o texto decimal guardado. */
export function formatarMoedaParaCampo(texto: TextoDecimal): string {
  if (!textoDecimalValido(texto)) return texto;
  const [inteiro, centavos] = paraTexto(decimal(texto), 2).split(".");
  const negativo = inteiro?.startsWith("-") ?? false;
  const digitos = (negativo ? inteiro?.slice(1) : inteiro) ?? "0";
  return `${negativo ? "-" : ""}${digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${centavos ?? "00"}`;
}

/** "33.333" → "33,333": como um campo de percentual mostra o texto decimal guardado (sem zeros a mais). */
export function formatarNumeroParaCampo(texto: TextoDecimal): string {
  return texto.replace(".", ",");
}

/** Data de um campo `type="date"` ("AAAA-MM-DD"): vazia ou fora da tabela de datas do motor é erro. */
export function lerData(texto: string): Leitura<DataISO> {
  return dataValida(texto)
    ? { ok: true, valor: texto }
    : { ok: false, erro: "Informe a data (dia, mês e ano a partir de 1900)." };
}

/** "2026-09-05" → "05/09/2026": como a data aparece no campo de texto da tabela. */
export function formatarDataParaCampo(data: DataISO): string {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`;
}

/**
 * Máscara da data digitada na tabela (decisão de 13/10/2026: o campo tem o tamanho do texto, sem
 * o calendário do navegador): só os números, até 8, com as barras no lugar ("05092026" →
 * "05/09/2026"); texto colado com barras também serve.
 */
export function mascaraData(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Data digitada como dd/mm/aaaa (a partir de 1900), devolvida como "AAAA-MM-DD". */
export function lerDataTexto(texto: string): Leitura<DataISO> {
  const partes = /^\s*(\d{2})\/(\d{2})\/(\d{4})\s*$/.exec(texto);
  const data = partes ? `${partes[3]}-${partes[2]}-${partes[1]}` : "";
  return dataValida(data)
    ? { ok: true, valor: data }
    : { ok: false, erro: "Informe a data como dd/mm/aaaa (ex.: 05/09/2026)." };
}

/**
 * Número do processo no padrão do CNJ (Resolução CNJ 65/2008), `NNNNNNN-DD.AAAA.J.TR.OOOO`: a
 * máscara põe hífen e pontos enquanto a pessoa digita só os números (até 20); texto colado com ou
 * sem pontuação também serve.
 */
export function formatarNumeroProcesso(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 20);
  const partes: Array<[number, number, string]> = [
    [0, 7, ""],
    [7, 9, "-"],
    [9, 13, "."],
    [13, 14, "."],
    [14, 16, "."],
    [16, 20, "."],
  ];
  let saida = "";
  for (const [inicio, fim, separador] of partes) {
    if (d.length <= inicio) break;
    saida += separador + d.slice(inicio, fim);
  }
  return saida;
}

/** Dígitos verificadores do CNJ (módulo 97, ISO 7064): 98 − (NNNNNNN AAAA J TR OOOO 00 mod 97). */
function digitosVerificadores(d: string): string {
  const base = d.slice(0, 7) + d.slice(9, 20) + "00";
  let resto = 0;
  for (const c of base) resto = (resto * 10 + Number(c)) % 97;
  return String(98 - resto).padStart(2, "0");
}

/**
 * Número do processo digitado: vazio é aceito (cálculo antes do processo); senão, 20 dígitos com
 * os dígitos verificadores certos, devolvidos no formato do CNJ.
 */
export function lerNumeroProcesso(texto: string): Leitura<string> {
  const d = texto.replace(/\D/g, "");
  if (d === "" && texto.trim() === "") return { ok: true, valor: "" };
  if (d.length !== 20 || digitosVerificadores(d) !== d.slice(7, 9)) {
    return { ok: false, erro: "Número do processo inválido (confira os dígitos)." };
  }
  return { ok: true, valor: formatarNumeroProcesso(d) };
}
