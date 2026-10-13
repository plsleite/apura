import type { Calculo, Resultado } from "../compartilhado/tipos.ts";
import { compararInstantes } from "../indices/relogio.ts";
import { CHAVE_RECENTES, gravarJson, lerJson, removerChave } from "./armazenamento.ts";

/**
 * Cálculos recentes no navegador (§5.5): os cinco últimos, guardados a cada alteração, listados
 * por data, processo e partes; "Remover" por item e "Limpar recentes". Cada recente guarda só o
 * necessário para reabrir (decisão de 13/10/2026): o cálculo e, do resultado, só os índices usados
 * e a data da consulta (o que `lerArquivo` usa para avisar dos índices que mudaram), em JSON
 * compacto; a memória do cálculo fica de fora (o arquivo de "Salvar" continua completo). Recentes
 * antigos, gravados com o envelope inteiro, continuam abrindo. A leitura confere só o que a lista
 * mostra; o texto de cada um passa por `lerArquivo` ao abrir. Nada é transmitido.
 */

export const MAXIMO_DE_RECENTES = 5;

export interface Recente {
  id: string;
  atualizadoEm: string;
  processo: string;
  exequente: string;
  executado: string;
  /**
   * `{ formato, calculo, resultado: { indicesUsados, consultaIndices } }` em JSON compacto, lido
   * por `lerArquivo` (os recentes antigos trazem o arquivo inteiro, como "Salvar" grava)
   */
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

/** O texto de um recente: o cálculo e, do resultado, só o que `lerArquivo` usa para comparar índices. */
function textoDoRecente(calculo: Calculo, resultado: Resultado): string {
  return JSON.stringify({
    formato: "apura/calculo@1",
    calculo,
    resultado: {
      indicesUsados: resultado.indicesUsados,
      consultaIndices: resultado.consultaIndices,
    },
  });
}

/**
 * Guarda (ou atualiza, pelo id) o cálculo; devolve a lista nova, ou a antiga se não deu para
 * gravar (cota cheia, armazenamento bloqueado), com `gravado` dizendo qual.
 */
export function guardarRecente(
  armazenamento: Storage | null,
  calculo: Calculo,
  resultado: Resultado,
): { recentes: Recente[]; gravado: boolean } {
  const atuais = lerRecentes(armazenamento);
  const recente: Recente = {
    id: calculo.id,
    atualizadoEm: calculo.atualizadoEm,
    processo: calculo.cabecalho.processo,
    exequente: calculo.cabecalho.exequente,
    executado: calculo.cabecalho.executado,
    texto: textoDoRecente(calculo, resultado),
  };
  const novos = ordenar([recente, ...atuais.filter((r) => r.id !== calculo.id)]).slice(
    0,
    MAXIMO_DE_RECENTES,
  );
  return gravarJson(armazenamento, CHAVE_RECENTES, novos)
    ? { recentes: novos, gravado: true }
    : { recentes: atuais, gravado: false };
}

/** Remove um recente; devolve a lista nova, ou a antiga se não deu para gravar. */
export function removerRecente(armazenamento: Storage | null, id: string): Recente[] {
  const atuais = lerRecentes(armazenamento);
  const novos = atuais.filter((r) => r.id !== id);
  return gravarJson(armazenamento, CHAVE_RECENTES, novos) ? novos : atuais;
}

export function limparRecentes(armazenamento: Storage | null): void {
  removerChave(armazenamento, CHAVE_RECENTES);
}
