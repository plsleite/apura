import { competenciaValida } from "../compartilhado/datas.ts";
import { textoDecimalValido } from "../compartilhado/decimal.ts";
import type {
  ArquivoSerie,
  CodigoSerie,
  Competencia,
  DataISO,
  TextoDecimal,
} from "../compartilhado/tipos.ts";
import { SERIES, urlDaSerie } from "./series.ts";

export interface ValorMensal {
  competencia: Competencia;
  valor: TextoDecimal;
}

/** Um item de série como gravado em arquivo: competência "AAAA-MM" válida e valor em texto decimal. */
export function ehValorMensalValido(item: unknown): item is ValorMensal {
  if (typeof item !== "object" || item === null) return false;
  const { competencia, valor } = item as { competencia?: unknown; valor?: unknown };
  return (
    typeof competencia === "string" && competenciaValida(competencia) && textoDecimalValido(valor)
  );
}

export interface ErroSgs {
  statusCode: number;
  detail: string;
}

/**
 * Objeto de erro do SGS, `{"erro":{"statusCode":404,"detail":"…Value(s) not found"}}` (intervalo sem
 * dados, data inválida); qualquer outro texto devolve null. O status HTTP não basta: esse corpo já
 * chegou com status 200, servido de cache (verificado em 11/10/2026).
 */
export function interpretarErroSgs(texto: string): ErroSgs | null {
  const aparado = texto.trim();
  if (!aparado.startsWith("{")) return null;
  try {
    const dados = JSON.parse(aparado) as { erro?: { statusCode?: unknown; detail?: unknown } };
    const erro = dados.erro;
    if (typeof erro !== "object" || erro === null || typeof erro.statusCode !== "number")
      return null;
    return {
      statusCode: erro.statusCode,
      detail: typeof erro.detail === "string" ? erro.detail : "",
    };
  } catch {
    return null;
  }
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
    if (!competenciaValida(competencia)) {
      throw new RespostaSgsInvalida(`Data inválida na resposta do BCB: ${data}`);
    }
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

// ---------------------------------------------------------------------------------------------
// Busca de uma série (usada pela rotina central): tempo-limite por pedido, repetição só para falha de rede,
// tempo esgotado ou HTTP 5xx; a decisão é sempre pelo corpo da resposta, nunca pelo content-type.
// ---------------------------------------------------------------------------------------------

/** Opções de `buscarSerie`; tudo tem padrão, e os testes injetam `fetch` e `dormir` falsos. */
export interface OpcoesBusca {
  /** Função de rede; padrão `globalThis.fetch`. */
  fetch?: typeof globalThis.fetch;
  /** Tempo-limite de cada pedido, em milissegundos; padrão 20 s. */
  tempoLimiteMs?: number;
  /** Número máximo de pedidos, contando o primeiro; padrão 2 (uma repetição). */
  tentativas?: number;
  /** Espera entre um pedido e a repetição, em milissegundos; padrão 3 s. */
  esperaMs?: number;
  /** Como esperar; padrão `setTimeout`. Os testes injetam uma versão que só registra. */
  dormir?: (ms: number) => Promise<void>;
}

export type RespostaBusca =
  | { ok: true; valores: ValorMensal[]; url: string; tentativas: number }
  | { ok: false; motivo: string; url: string; tentativas: number };

const TEMPO_LIMITE_PADRAO_MS = 20_000;
const TENTATIVAS_PADRAO = 2;
const ESPERA_PADRAO_MS = 3_000;

function dormirPadrao(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

/** Resultado de um pedido isolado: os valores, ou o motivo da falha e se vale repetir. */
type ResultadoDoPedido =
  { ok: true; valores: ValorMensal[] } | { ok: false; motivo: string; repetir: boolean };

/** Nome do que o fetch lançou ("TypeError", "TimeoutError", "AbortError"); texto cru se não tiver nome. */
function nomeDoErro(erro: unknown): string {
  if (typeof erro === "object" && erro !== null && "name" in erro) {
    const { name } = erro as { name?: unknown };
    if (typeof name === "string" && name !== "") return name;
  }
  return String(erro);
}

/** " (ECONNRESET)": código (ou, sem ele, a mensagem) da causa que o fetch do Node anexa ao TypeError "fetch failed"; vazio sem causa. */
function causaDoErro(erro: unknown): string {
  if (typeof erro !== "object" || erro === null || !("cause" in erro)) return "";
  const { cause } = erro as { cause?: unknown };
  if (typeof cause !== "object" || cause === null) return "";
  const { code, message } = cause as { code?: unknown; message?: unknown };
  if (typeof code === "string" && code !== "") return ` (${code})`;
  if (typeof message === "string" && message !== "") return ` (${message})`;
  return "";
}

/** Limite do motivo de falha, que vai para a saída, o resumo, o commit e o relatório mensal. */
const LIMITE_DO_MOTIVO = 300;

/** Uma linha só (espaços e quebras viram um espaço), com no máximo LIMITE_DO_MOTIVO caracteres e "…" ao cortar. */
function motivoEmUmaLinha(texto: string): string {
  const linha = texto.replace(/\s+/g, " ").trim();
  return linha.length <= LIMITE_DO_MOTIVO ? linha : `${linha.slice(0, LIMITE_DO_MOTIVO - 1)}…`;
}

/**
 * Decide pelo corpo, na ordem: lista JSON válida → ok (mesmo com status diferente de 200); objeto de
 * erro do SGS (404 sem valores, 400 data inválida) → falha definitiva, mesmo que o status seja 200,
 * salvo erro 5xx, que repete; status 5xx (página HTML do BCB) → falha que repete; o resto (HTML com 200, JSON fora do
 * formato) → falha definitiva com a mensagem do intérprete.
 */
function decidirPeloCorpo(status: number, texto: string): ResultadoDoPedido {
  let mensagemInvalida: string;
  try {
    return { ok: true, valores: interpretarRespostaSgs(texto) };
  } catch (erro) {
    mensagemInvalida = erro instanceof Error ? erro.message : String(erro);
  }
  const erroSgs = interpretarErroSgs(texto);
  if (erroSgs !== null) {
    const detalhe = erroSgs.detail === "" ? "" : `: ${erroSgs.detail}`;
    return {
      ok: false,
      motivo: `o BCB respondeu erro ${erroSgs.statusCode}${detalhe}`,
      // Erro do próprio servidor (5xx, no status HTTP ou no corpo) pode ser passageiro: repete.
      repetir: status >= 500 || erroSgs.statusCode >= 500,
    };
  }
  if (status >= 500) {
    return { ok: false, motivo: `o BCB respondeu HTTP ${status}`, repetir: true };
  }
  return {
    ok: false,
    motivo: `resposta inválida do BCB (HTTP ${status}): ${mensagemInvalida}`,
    repetir: false,
  };
}

/**
 * Um pedido: GET simples, sem cabeçalhos, com tempo-limite. Lê o texto sempre.
 */
async function pedirUmaVez(
  fazerPedido: typeof globalThis.fetch,
  url: string,
  tempoLimiteMs: number,
): Promise<ResultadoDoPedido> {
  let status: number;
  let texto: string;
  try {
    const resposta = await fazerPedido(url, { signal: AbortSignal.timeout(tempoLimiteMs) });
    status = resposta.status;
    texto = await resposta.text();
  } catch (erro) {
    // Falha de rede (TypeError), tempo esgotado (TimeoutError) ou pedido cancelado (AbortError).
    return {
      ok: false,
      motivo: `sem resposta do BCB: ${nomeDoErro(erro)}${causaDoErro(erro)}`,
      repetir: true,
    };
  }
  return decidirPeloCorpo(status, texto);
}

/**
 * Busca uma série no SGS a partir de `dataInicial` (ou o histórico completo, sem ela). Nunca lança:
 * devolve `ok: false` com o motivo em texto e o número de tentativas feitas. Repete (após `esperaMs`)
 * só quando não houve resposta ou o BCB respondeu 5xx; erro do SGS e corpo inválido não repetem.
 */
export async function buscarSerie(
  codigo: CodigoSerie,
  dataInicial: DataISO | undefined,
  opcoes: OpcoesBusca = {},
): Promise<RespostaBusca> {
  const fazerPedido = opcoes.fetch ?? globalThis.fetch;
  const tempoLimiteMs = opcoes.tempoLimiteMs ?? TEMPO_LIMITE_PADRAO_MS;
  const esperaMs = opcoes.esperaMs ?? ESPERA_PADRAO_MS;
  const dormir = opcoes.dormir ?? dormirPadrao;
  // Sempre há ao menos um pedido: 0, negativo ou NaN valem como uma tentativa só.
  const maximo = Math.max(1, Math.floor(opcoes.tentativas ?? TENTATIVAS_PADRAO) || 1);
  const url = urlDaSerie(codigo, dataInicial);

  for (let tentativa = 1; ; tentativa += 1) {
    const resultado = await pedirUmaVez(fazerPedido, url, tempoLimiteMs);
    if (resultado.ok) {
      return { ok: true, valores: resultado.valores, url, tentativas: tentativa };
    }
    if (!resultado.repetir || tentativa >= maximo) {
      return { ok: false, motivo: motivoEmUmaLinha(resultado.motivo), url, tentativas: tentativa };
    }
    try {
      await dormir(esperaMs);
    } catch {
      // Um `dormir` que falha não impede a repetição: segue sem esperar.
    }
  }
}
