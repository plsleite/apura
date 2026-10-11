import type { Metodologia } from "../compartilhado/tipos.ts";
import tjmsSajV1 from "./tjms-saj.v1.json" with { type: "json" };

/** Cópia nova da metodologia padrão "TJMS/SAJ v1": cada cálculo guarda e pode ajustar a sua. */
export function metodologiaPadrao(): Metodologia {
  return structuredClone(tjmsSajV1 as Metodologia);
}
