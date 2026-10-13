import type { Metodologia } from "../compartilhado/tipos.ts";
import igpmJuros1V1 from "./igpm-juros-1.v1.json" with { type: "json" };
import lei14905V1 from "./lei-14905-2024.v1.json" with { type: "json" };

/**
 * As metodologias de encargos pré-carregadas, que a pessoa escolhe na seção 5 (§17.3):
 * "lei14905" (até 29/08/2024, IGP-M e juros de 1% ao mês; desde 30/08/2024, IPCA e taxa legal,
 * Lei 14.905/2024) e "igpmJuros1" (IGP-M e juros de 1% ao mês em todo o período).
 */
export type OpcaoDeMetodologia = "lei14905" | "igpmJuros1";

export const OPCOES_DE_METODOLOGIA: readonly OpcaoDeMetodologia[] = ["lei14905", "igpmJuros1"];

const METODOLOGIAS: Record<OpcaoDeMetodologia, Metodologia> = {
  lei14905: lei14905V1 as Metodologia,
  igpmJuros1: igpmJuros1V1 as Metodologia,
};

/** Cópia nova da metodologia da opção: cada cálculo guarda e pode ajustar a sua. */
export function metodologiaDaOpcao(opcao: OpcaoDeMetodologia): Metodologia {
  return structuredClone(METODOLOGIAS[opcao]);
}

/** Cópia nova da metodologia padrão de fábrica, a da Lei 14.905/2024. */
export function metodologiaPadrao(): Metodologia {
  return metodologiaDaOpcao("lei14905");
}
