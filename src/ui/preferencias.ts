import {
  CHAVE_PREFERENCIAS,
  CHAVE_RECENTES,
  gravarJson,
  lerJson,
  removerChave,
} from "./armazenamento.ts";

/**
 * Preferências do usuário neste navegador (§5.5): defensor(a) e órgão, com "Lembrar neste
 * navegador" (ligado por padrão), e a opção "Guardar cálculos recentes neste navegador" (ligada
 * por padrão; para desligar em computador compartilhado). "Esquecer" apaga preferências e
 * recentes. Nada é transmitido.
 */
export interface Preferencias {
  defensor: string;
  orgao: string;
  lembrar: boolean;
  guardarRecentes: boolean;
}

export const PREFERENCIAS_PADRAO: Preferencias = {
  defensor: "",
  orgao: "",
  lembrar: true,
  guardarRecentes: true,
};

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

function booleano(valor: unknown, padrao: boolean): boolean {
  return typeof valor === "boolean" ? valor : padrao;
}

/** As preferências gravadas, campo a campo conferido; o padrão para o que falta ou está estranho. */
export function lerPreferencias(armazenamento: Storage | null): Preferencias {
  const lido = lerJson(armazenamento, CHAVE_PREFERENCIAS);
  if (typeof lido !== "object" || lido === null) return { ...PREFERENCIAS_PADRAO };
  const dados = lido as Record<string, unknown>;
  const lembrar = booleano(dados.lembrar, PREFERENCIAS_PADRAO.lembrar);
  return {
    defensor: lembrar ? texto(dados.defensor) : "",
    orgao: lembrar ? texto(dados.orgao) : "",
    lembrar,
    guardarRecentes: booleano(dados.guardarRecentes, PREFERENCIAS_PADRAO.guardarRecentes),
  };
}

/**
 * Grava as preferências. Com "Lembrar" desligado, defensor e órgão são gravados vazios (as duas
 * opções continuam gravadas, para valerem na próxima visita). Devolve false se não deu para gravar.
 */
export function gravarPreferencias(armazenamento: Storage | null, p: Preferencias): boolean {
  const gravadas: Preferencias = p.lembrar ? p : { ...p, defensor: "", orgao: "" };
  return gravarJson(armazenamento, CHAVE_PREFERENCIAS, gravadas);
}

/** "Esquecer": apaga preferências e cálculos recentes deste navegador. */
export function esquecer(armazenamento: Storage | null): void {
  removerChave(armazenamento, CHAVE_PREFERENCIAS);
  removerChave(armazenamento, CHAVE_RECENTES);
}
