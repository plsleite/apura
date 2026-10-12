import { dataNoMes, mesSeguinte } from "./datas.ts";
import { formatarCompetencia, formatarData } from "./formatacao.ts";
import type { CodigoSerie, Competencia, TabelaIndices } from "./tipos.ts";

// Calendário de divulgação das séries do BCB, na parte que o motor e o módulo de índices
// compartilham: o texto da previsão de cada mês e a regra "ainda não divulgado" pela tabela.
// As regras de "até que mês cada série deveria existir" ficam em `src/indices/calendario.ts`, que
// preenche `TabelaIndices.esperadoAte`; o motor só lê esse campo.

/**
 * Quando o mês da série deve ser divulgado, em frase curta, sem ponto final, para encaixar em
 * "(previsão: …)": "por volta de 10/11/2026", "no fim de out/2026", "no 1º dia útil de nov/2026".
 */
export function divulgacaoPrevista(codigo: CodigoSerie, competencia: Competencia): string {
  switch (codigo) {
    case "433":
    case "188":
      return `por volta de ${formatarData(dataNoMes(mesSeguinte(competencia), 10))}`;
    case "189":
      return `no fim de ${formatarCompetencia(competencia)}`;
    case "29543":
      return `no 1º dia útil de ${formatarCompetencia(competencia)}`;
    case "4390":
      return `ao longo de ${formatarCompetencia(competencia)}, como acumulado parcial fechado no início de ${formatarCompetencia(mesSeguinte(competencia))}`;
    case "1619":
      return `no início de ${competencia.slice(0, 4)}, com o decreto do salário mínimo`;
  }
}

/**
 * true quando a tabela diz até que mês a série deveria existir (`esperadoAte`, preenchido pelo
 * calendário no congelamento) e o mês é posterior: o índice ainda não saiu na data da consulta.
 * Sem `esperadoAte` (casos de referência antigos) ou sem a série nele, é sempre false.
 */
export function aindaNaoDivulgado(
  tabela: TabelaIndices,
  serie: CodigoSerie,
  competencia: Competencia,
): boolean {
  const esperado = tabela.esperadoAte?.[serie];
  return esperado !== undefined && competencia > esperado;
}
