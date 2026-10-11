import type {
  ArquivoSerie,
  CodigoSerie,
  Competencia,
  TextoDecimal,
} from "../compartilhado/tipos.ts";
import { SERIES, urlDaSerie } from "./series.ts";

export interface ValorMensal {
  competencia: Competencia;
  valor: TextoDecimal;
}

export class RespostaSgsInvalida extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "RespostaSgsInvalida";
  }
}

const FORMATO_DATA_BCB = /^\d{2}\/\d{2}\/\d{4}$/;
const FORMATO_VALOR = /^-?\d+(\.\d+)?$/;

/**
 * Interpreta o texto de uma resposta do SGS: exige lista JSON de {data, valor} (recusa HTML e
 * objetos de erro), datas dd/mm/aaaa e valores decimais em texto. Devolve em ordem de competência,
 * sem repetições; repetição com valor diferente é recusada.
 */
export function interpretarRespostaSgs(texto: string): ValorMensal[] {
  const aparado = texto.trim();
  if (!aparado.startsWith("[")) {
    throw new RespostaSgsInvalida(
      "A resposta do BCB não é uma lista JSON (pode ser HTML de erro ou série inexistente).",
    );
  }
  let dados: unknown;
  try {
    dados = JSON.parse(aparado);
  } catch {
    throw new RespostaSgsInvalida("A resposta do BCB não é JSON válido.");
  }
  if (!Array.isArray(dados)) throw new RespostaSgsInvalida("A resposta do BCB não é uma lista.");

  const porCompetencia = new Map<Competencia, TextoDecimal>();
  for (const item of dados) {
    if (typeof item !== "object" || item === null) {
      throw new RespostaSgsInvalida("Registro inválido na resposta do BCB.");
    }
    const { data, valor } = item as { data?: unknown; valor?: unknown };
    if (typeof data !== "string" || !FORMATO_DATA_BCB.test(data)) {
      throw new RespostaSgsInvalida(`Data inválida na resposta do BCB: ${String(data)}`);
    }
    if (typeof valor !== "string" || !FORMATO_VALOR.test(valor)) {
      throw new RespostaSgsInvalida(
        `Valor inválido na resposta do BCB para ${data}: ${String(valor)}`,
      );
    }
    const competencia = `${data.slice(6, 10)}-${data.slice(3, 5)}`;
    const existente = porCompetencia.get(competencia);
    if (existente !== undefined && existente !== valor) {
      throw new RespostaSgsInvalida(
        `Competência ${competencia} repetida com valores diferentes (${existente} e ${valor}).`,
      );
    }
    porCompetencia.set(competencia, valor);
  }
  return [...porCompetencia.entries()]
    .map(([competencia, valor]) => ({ competencia, valor }))
    .sort((a, b) => (a.competencia < b.competencia ? -1 : a.competencia > b.competencia ? 1 : 0));
}

/** Conteúdo de `dados/indices/<codigo>.json`. */
export function montarArquivoSerie(
  codigo: CodigoSerie,
  valores: ValorMensal[],
  obtidoEm: string,
): ArquivoSerie {
  return {
    formato: "apura/serie@1",
    codigo,
    nome: SERIES[codigo].descricao,
    origem: urlDaSerie(codigo),
    obtidoEm,
    valores,
  };
}
