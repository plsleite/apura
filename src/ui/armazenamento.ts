/**
 * Acesso protegido ao armazenamento do navegador (§5.5): só duas chaves, preferências e cálculos
 * recentes; toda leitura e gravação fica dentro de try/catch, porque o `localStorage` pode
 * faltar, estar bloqueado (janela anônima com bloqueio, política do navegador) ou lotado. Nada
 * é transmitido: o armazenamento é local ao navegador.
 */

/** Também lida por um script do `index.html`, que aplica o tema fixado antes do CSS. */
export const CHAVE_PREFERENCIAS = "apura.preferencias";
export const CHAVE_RECENTES = "apura.recentes";

/** O JSON gravado na chave, já convertido; nulo se não há, se está corrompido ou se a leitura falha. */
export function lerJson(armazenamento: Storage | null, chave: string): unknown {
  try {
    const texto = armazenamento?.getItem(chave);
    return texto === null || texto === undefined ? null : JSON.parse(texto);
  } catch {
    return null;
  }
}

/** Grava o valor como JSON; devolve false quando não foi possível (sem armazenamento, bloqueado, cheio). */
export function gravarJson(armazenamento: Storage | null, chave: string, valor: unknown): boolean {
  try {
    if (armazenamento === null) return false;
    armazenamento.setItem(chave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

export function removerChave(armazenamento: Storage | null, chave: string): void {
  try {
    armazenamento?.removeItem(chave);
  } catch {
    // sem armazenamento não há o que remover
  }
}
