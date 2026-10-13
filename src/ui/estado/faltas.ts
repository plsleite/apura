import type { Base, Calculo } from "../../compartilhado/tipos.ts";

/**
 * Campos da base dos alimentos que faltam para apurar as prestações (decisão de 13/10/2026): com
 * prestação lançada pela base e o campo em branco, a caixa de avisos diz o que falta e onde, e o
 * campo fica em vermelho na seção 2. Módulo puro.
 */
export type CampoDaBase = "valor" | "percentual" | "rendimentoPadrao";

export interface FaltaDaBase {
  campo: CampoDaBase;
  /** erro embaixo do campo */
  erro: string;
  /** frase da caixa de avisos */
  aviso: string;
}

const ONDE = "(seção 2 · Base dos alimentos)";

function falta(
  campo: CampoDaBase,
  nome: string,
  erro: string,
  quais = "as prestações",
): FaltaDaBase {
  return {
    campo,
    erro,
    aviso: `Falta ${nome} ${ONDE}: ${quais} ficam sem valor até ele ser informado.`,
  };
}

const vazio = (texto: string) => texto.trim() === "";

export function faltasDaBase(calculo: Calculo): FaltaDaBase[] {
  const pelaBase = calculo.lancamentos.filter(
    (l) => l.tipo === "prestacao" && l.valorInformado === undefined,
  );
  if (pelaBase.length === 0) return [];
  const base: Base = calculo.base;
  if (base.tipo === "valorFixo") {
    return vazio(base.valor) ? [falta("valor", "o valor fixado", "Informe o valor fixado.")] : [];
  }
  if (base.tipo === "percentualSalarioMinimo") {
    return vazio(base.percentual)
      ? [falta("percentual", "o percentual do salário mínimo", "Informe o percentual.")]
      : [];
  }
  const faltas: FaltaDaBase[] = [];
  if (vazio(base.percentual)) {
    faltas.push(falta("percentual", "o percentual dos rendimentos", "Informe o percentual."));
  }
  if (vazio(base.rendimentoPadrao) && pelaBase.some((l) => l.rendimento === undefined)) {
    faltas.push(
      falta(
        "rendimentoPadrao",
        "o rendimento mensal padrão",
        "Informe o rendimento padrão.",
        "as prestações sem rendimento próprio",
      ),
    );
  }
  return faltas;
}
