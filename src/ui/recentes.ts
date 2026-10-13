import type { Calculo, Resultado } from "../compartilhado/tipos.ts";
import { compararInstantes } from "../indices/relogio.ts";
import { montarArquivo, serializarArquivo } from "./arquivo.ts";
import { CHAVE_RECENTES, gravarJson, lerJson, removerChave } from "./armazenamento.ts";

/**
 * Cálculos recentes no navegador (§5.5): os cinco últimos, guardados a cada alteração, no mesmo
 * envelope do arquivo salvo (texto JSON), listados por data, processo e partes; "Remover" por item
 * e "Limpar recentes". A leitura confere só o que a lista mostra; o texto de cada um passa por
 * `lerArquivo` ao abrir. Nada é transmitido.
 */

export const MAXIMO_DE_RECENTES = 5;

export interface Recente {
  id: string;
  atualizadoEm: string;
  processo: string;
  exequente: string;
  executado: string;
  /** o arquivo de cálculo serializado, como "Salvar" gravaria */
  texto: string;
}

function ehRecente(valor: unknown): valor is Recente {
  if (typeof valor !== "object" || valor === null) return false;
  const r = valor as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.atualizadoEm === "string" &&
    typeof r.processo === "string" &&
    typeof r.exequente === "string" &&
    typeof r.executado === "string" &&
    typeof r.texto === "string"
  );
}

function ordenar(recentes: Recente[]): Recente[] {
  return [...recentes].sort((a, b) => compararInstantes(b.atualizadoEm, a.atualizadoEm));
}

/** Os recentes gravados, do mais novo ao mais antigo; lista vazia se não há, se está corrompido ou se a leitura falha. */
export function lerRecentes(armazenamento: Storage | null): Recente[] {
  const lido = lerJson(armazenamento, CHAVE_RECENTES);
  if (!Array.isArray(lido)) return [];
  return ordenar(lido.filter(ehRecente)).slice(0, MAXIMO_DE_RECENTES);
}

/** Guarda (ou atualiza, pelo id) o cálculo; devolve a lista nova, ou a antiga se não deu para gravar. */
export function guardarRecente(
  armazenamento: Storage | null,
  calculo: Calculo,
  resultado: Resultado,
): Recente[] {
  const atuais = lerRecentes(armazenamento);
  const recente: Recente = {
    id: calculo.id,
    atualizadoEm: calculo.atualizadoEm,
    processo: calculo.cabecalho.processo,
    exequente: calculo.cabecalho.exequente,
    executado: calculo.cabecalho.executado,
    texto: serializarArquivo(montarArquivo(calculo, resultado)),
  };
  const novos = ordenar([recente, ...atuais.filter((r) => r.id !== calculo.id)]).slice(
    0,
    MAXIMO_DE_RECENTES,
  );
  return gravarJson(armazenamento, CHAVE_RECENTES, novos) ? novos : atuais;
}

export function removerRecente(armazenamento: Storage | null, id: string): Recente[] {
  const novos = lerRecentes(armazenamento).filter((r) => r.id !== id);
  gravarJson(armazenamento, CHAVE_RECENTES, novos);
  return novos;
}

export function limparRecentes(armazenamento: Storage | null): void {
  removerChave(armazenamento, CHAVE_RECENTES);
}
