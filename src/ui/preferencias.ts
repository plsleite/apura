import { OPCOES_DE_METODOLOGIA, type OpcaoDeMetodologia } from "../metodologias/padrao.ts";
import { CHAVE_PREFERENCIAS, gravarJson, lerJson } from "./armazenamento.ts";

/**
 * Preferências do usuário neste navegador (§5.5, §21.4): defensor(a) e órgão, sempre guardados;
 * o tema da tela (igual ao computador, claro ou escuro; padrão: igual ao computador, guardado
 * como "sistema"; decisão de 12/10/2026 e §21.7); e a metodologia de encargos padrão dos cálculos
 * novos (padrão: a da Lei 14.905/2024; §17.3). Os cinco cálculos recentes também são sempre
 * guardados (`recentes.ts`). As opções "Lembrar neste navegador" e "Guardar cálculos recentes" e
 * o botão "Esquecer" saíram na §21.4: o que ficou gravado delas é ignorado na leitura e some na
 * gravação seguinte. Nada é transmitido.
 */
export type Tema = "sistema" | "claro" | "escuro";

export const TEMAS: readonly Tema[] = ["sistema", "claro", "escuro"];

export interface Preferencias {
  defensor: string;
  orgao: string;
  tema: Tema;
  metodologia: OpcaoDeMetodologia;
}

export const PREFERENCIAS_PADRAO: Preferencias = {
  defensor: "",
  orgao: "",
  tema: "sistema",
  metodologia: "lei14905",
};

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
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
  return {
    defensor: texto(dados.defensor),
    orgao: texto(dados.orgao),
    tema: tema(dados.tema),
    metodologia: metodologia(dados.metodologia),
  };
}

/** Grava as preferências. Devolve false se não deu para gravar. */
export function gravarPreferencias(armazenamento: Storage | null, p: Preferencias): boolean {
  return gravarJson(armazenamento, CHAVE_PREFERENCIAS, p);
}
