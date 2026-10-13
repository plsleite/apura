import type { Calculo, FormaDaBase, Lancamento } from "../../compartilhado/tipos.ts";
import {
  descreverPeriodoDaBase,
  periodoDaData,
  periodosDaBaseOrdenados,
} from "../../motor/base.ts";

/**
 * Campos da base dos alimentos que faltam para apurar as prestações (decisão de 13/10/2026): com
 * prestação lançada pela base e o campo em branco, a caixa de avisos diz o que falta e onde, e o
 * campo fica em vermelho na seção 2. Com a base por períodos (§17.2), cada período é conferido
 * pelas prestações que vencem nele, e o aviso diz qual período. Módulo puro.
 */
export type CampoDaBase = "valor" | "percentual" | "rendimentoPadrao";

export interface FaltaDaBase {
  /** posição do período na base, em ordem cronológica (0 = o primeiro) */
  periodo: number;
  campo: CampoDaBase;
  /** erro embaixo do campo */
  erro: string;
  /** frase da caixa de avisos */
  aviso: string;
}

const ONDE = "(seção 2 · Base dos alimentos)";

const vazio = (texto: string) => texto.trim() === "";

/** O que falta numa forma, dadas as prestações pela base que vencem no período dela. */
function faltasDaForma(
  forma: FormaDaBase,
  prestacoes: Lancamento[],
): Array<[CampoDaBase, string, string, boolean]> {
  // [campo, nome no aviso, erro do campo, só as prestações sem rendimento próprio]
  if (forma.tipo === "valorFixo") {
    return vazio(forma.valor)
      ? [["valor", "o valor fixado", "Informe o valor fixado.", false]]
      : [];
  }
  if (forma.tipo === "percentualSalarioMinimo") {
    return vazio(forma.percentual)
      ? [["percentual", "o percentual do salário mínimo", "Informe o percentual.", false]]
      : [];
  }
  const faltas: Array<[CampoDaBase, string, string, boolean]> = [];
  if (vazio(forma.percentual)) {
    faltas.push(["percentual", "o percentual dos rendimentos", "Informe o percentual.", false]);
  }
  if (vazio(forma.rendimentoPadrao) && prestacoes.some((l) => l.rendimento === undefined)) {
    faltas.push([
      "rendimentoPadrao",
      "o rendimento mensal padrão",
      "Informe o rendimento padrão.",
      true,
    ]);
  }
  return faltas;
}

export function faltasDaBase(calculo: Calculo): FaltaDaBase[] {
  const pelaBase = calculo.lancamentos.filter(
    (l) => l.tipo === "prestacao" && l.valorInformado === undefined,
  );
  const periodos = periodosDaBaseOrdenados(calculo.base);
  const varios = periodos.length > 1;
  return periodos.flatMap((periodo, indice) => {
    const prestacoes = pelaBase.filter((l) => periodoDaData(calculo.base, l.data) === periodo);
    if (prestacoes.length === 0) return [];
    const onde = varios ? ` no período ${descreverPeriodoDaBase(periodo)} ${ONDE}` : ` ${ONDE}`;
    const quais = varios ? "as prestações desse período" : "as prestações";
    return faltasDaForma(periodo.forma, prestacoes).map(
      ([campo, nome, erro, semRendimento]): FaltaDaBase => ({
        periodo: indice,
        campo,
        erro,
        aviso: `Falta ${nome}${onde}: ${quais}${semRendimento ? " sem rendimento próprio" : ""} ficam sem valor até ele ser informado.`,
      }),
    );
  });
}
