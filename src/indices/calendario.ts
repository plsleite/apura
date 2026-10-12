import {
  competenciasEntre,
  comporCompetencia,
  decompor,
  mesAnterior,
  mesSeguinte,
  somarMeses,
} from "../compartilhado/datas.ts";
import { divulgacaoPrevista } from "../compartilhado/divulgacao.ts";
import type { CodigoSerie, Competencia, DataISO, TabelaIndices } from "../compartilhado/tipos.ts";

/**
 * Calendário de divulgação das séries (decisão D7 de 11/10/2026): uma regra por série, com dia
 * aproximado, que serve só para avisar o que já deveria ter saído. Quem consulta o BCB é a rotina
 * central (scripts/atualizar-indices.ts); o app só lê a cópia publicada.
 * Módulo puro: `hoje` chega como texto (de `hojeEmBrasilia`, em relogio.ts).
 */

/** As seis séries em ordem numérica, a ordem dos avisos e das listas por série. */
export const SERIES_EM_ORDEM_NUMERICA: readonly CodigoSerie[] = [
  "188",
  "189",
  "433",
  "1619",
  "4390",
  "29543",
];

/**
 * Último mês que a série já deveria ter na data `hoje`, pelo calendário de divulgação.
 * - IPCA (433) e INPC (188): o IBGE divulga por volta do dia 10 do mês seguinte.
 * - IGP-M (189): a FGV divulga no fim do próprio mês; o SGS carrega nos primeiros dias do seguinte.
 * - Taxa legal (29543): publicada no 1º dia útil do mês de referência.
 * - SELIC acumulada no mês (4390): o mês corrente já aparece, como acumulado parcial.
 * - Salário mínimo (1619): o ano inteiro entra assim que o decreto sai, no fim do ano anterior ou
 *   no início do ano; só em janeiro ainda se admite não ter o ano novo.
 */
export function ultimoMesEsperado(codigo: CodigoSerie, hoje: DataISO): Competencia {
  const { ano, mes, dia } = decompor(hoje);
  const mesDeHoje = comporCompetencia(ano, mes);
  switch (codigo) {
    case "433":
    case "188":
      return dia >= 15 ? mesAnterior(mesDeHoje) : somarMeses(mesDeHoje, -2);
    case "189":
      return dia >= 5 ? mesAnterior(mesDeHoje) : somarMeses(mesDeHoje, -2);
    case "29543":
    case "4390":
      return dia >= 5 ? mesDeHoje : mesAnterior(mesDeHoje);
    case "1619":
      return mes >= 2 ? comporCompetencia(ano, 12) : comporCompetencia(ano - 1, 12);
  }
}

/** `ultimoMesEsperado` das seis séries, no formato de `TabelaIndices.esperadoAte`. */
export function esperadoAte(hoje: DataISO): Record<CodigoSerie, Competencia> {
  return {
    "188": ultimoMesEsperado("188", hoje),
    "189": ultimoMesEsperado("189", hoje),
    "433": ultimoMesEsperado("433", hoje),
    "1619": ultimoMesEsperado("1619", hoje),
    "29543": ultimoMesEsperado("29543", hoje),
    "4390": ultimoMesEsperado("4390", hoje),
  };
}

export interface MesAtrasado {
  serie: CodigoSerie;
  competencia: Competencia;
  previsao: string;
}

/**
 * Meses que o calendário diz já divulgados e a tabela ainda não tem: para cada série presente,
 * do mês seguinte ao último presente até `ultimoMesEsperado` (nada quando a série está em dia ou
 * adiantada; série ausente, ou sem nenhum mês, não entra). Séries em ordem numérica, meses crescentes.
 */
export function mesesAtrasados(tabela: TabelaIndices, hoje: DataISO): MesAtrasado[] {
  const atrasados: MesAtrasado[] = [];
  for (const serie of SERIES_EM_ORDEM_NUMERICA) {
    const presentes = Object.keys(tabela.series[serie] ?? {});
    if (presentes.length === 0) continue;
    const ultimoPresente = presentes.reduce((maior, atual) => (atual > maior ? atual : maior));
    const faltantes = competenciasEntre(
      mesSeguinte(ultimoPresente),
      ultimoMesEsperado(serie, hoje),
    );
    for (const competencia of faltantes) {
      atrasados.push({ serie, competencia, previsao: divulgacaoPrevista(serie, competencia) });
    }
  }
  return atrasados;
}

/** Meses atrasados seguidos da mesma série com a mesma previsão (o salário mínimo do ano inteiro). */
export interface GrupoDeAtraso {
  serie: CodigoSerie;
  de: Competencia;
  ate: Competencia;
  previsao: string;
}

/**
 * Junta os meses atrasados seguidos da mesma série que têm a mesma previsão de divulgação, para
 * que um ano inteiro de salário mínimo atrasado saia numa frase só ("jan/2027 a dez/2027"). Meses
 * com previsões diferentes (IPCA de set e de out) ficam separados. Mantém a ordem recebida.
 */
export function agruparAtrasados(atrasados: readonly MesAtrasado[]): GrupoDeAtraso[] {
  const grupos: GrupoDeAtraso[] = [];
  for (const { serie, competencia, previsao } of atrasados) {
    const ultimo = grupos.at(-1);
    if (
      ultimo !== undefined &&
      ultimo.serie === serie &&
      ultimo.previsao === previsao &&
      mesSeguinte(ultimo.ate) === competencia
    ) {
      ultimo.ate = competencia;
    } else {
      grupos.push({ serie, de: competencia, ate: competencia, previsao });
    }
  }
  return grupos;
}
