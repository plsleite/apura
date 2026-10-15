import { OPCOES_DE_METODOLOGIA, type OpcaoDeMetodologia } from "../metodologias/padrao.ts";
import {
  CHAVE_PREFERENCIAS,
  CHAVE_RECENTES,
  gravarJson,
  lerJson,
  removerChave,
} from "./armazenamento.ts";

/**
 * Preferências do usuário neste navegador (§5.5): defensor(a) e órgão, com "Lembrar neste
 * navegador" (ligado por padrão); a opção "Guardar cálculos recentes neste navegador" (ligada
 * por padrão; para desligar em computador compartilhado); o tema da tela (do sistema, claro ou
 * escuro; padrão: do sistema; decisão de 12/10/2026); e a metodologia de encargos padrão dos
 * cálculos novos (padrão: a da Lei 14.905/2024; §17.3). "Esquecer" apaga preferências e recentes;
 * o App regrava em seguida as opções, o tema e a metodologia, que não são dados pessoais. Nada é
 * transmitido.
 */
export type Tema = "sistema" | "claro" | "escuro";

export const TEMAS: readonly Tema[] = ["sistema", "claro", "escuro"];

export interface Preferencias {
  defensor: string;
  orgao: string;
  lembrar: boolean;
  guardarRecentes: boolean;
  tema: Tema;
  metodologia: OpcaoDeMetodologia;
}

export const PREFERENCIAS_PADRAO: Preferencias = {
  defensor: "",
  orgao: "",
  lembrar: true,
  guardarRecentes: true,
  tema: "sistema",
  metodologia: "lei14905",
};

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

function booleano(valor: unknown, padrao: boolean): boolean {
  return typeof valor === "boolean" ? valor : padrao;
}

function tema(valor: unknown): Tema {
  return typeof valor === "string" && (TEMAS as string[]).includes(valor)
    ? (valor as Tema)
    : PREFERENCIAS_PADRAO.tema;
}

function metodologia(valor: unknown): OpcaoDeMetodologia {
  return typeof valor === "string" && (OPCOES_DE_METODOLOGIA as string[]).includes(valor)
    ? (valor as OpcaoDeMetodologia)
    : PREFERENCIAS_PADRAO.metodologia;
}

/**
 * As preferências gravadas, campo a campo conferido; o padrão para o que falta ou está estranho.
 */
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
    tema: tema(dados.tema),
    metodologia: metodologia(dados.metodologia),
  };
}

/**
 * Grava as preferências. Com "Lembrar" desligado, defensor e órgão são gravados vazios (as duas
 * opções, o tema e a metodologia continuam gravados, para valerem na próxima visita). Devolve
 * false se não deu para gravar.
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
