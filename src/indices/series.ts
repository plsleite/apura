import { formatarData } from "../compartilhado/formatacao.ts";
import { NOME_DA_SERIE } from "../compartilhado/tipos.ts";
import type { CodigoSerie, DataISO } from "../compartilhado/tipos.ts";

export interface DescricaoSerie {
  codigo: CodigoSerie;
  nome: string;
  descricao: string;
  unidade: string;
  uso: string;
}

/** As seis séries do SGS usadas pelo Apura (§8.1 do design); o nome curto vem de `NOME_DA_SERIE`, para não haver duas listas. */
export const SERIES: Record<CodigoSerie, DescricaoSerie> = {
  "433": {
    codigo: "433",
    nome: NOME_DA_SERIE["433"],
    descricao: "IPCA (IBGE), variação % mensal",
    unidade: "% a.m.",
    uso: "correção do regime novo; alternativa no antigo; reajuste",
  },
  "188": {
    codigo: "188",
    nome: NOME_DA_SERIE["188"],
    descricao: "INPC (IBGE), variação % mensal",
    unidade: "% a.m.",
    uso: "alternativa de correção; reajuste",
  },
  "189": {
    codigo: "189",
    nome: NOME_DA_SERIE["189"],
    descricao: "IGP-M (FGV), variação % mensal",
    unidade: "% a.m.",
    uso: "padrão do regime antigo; reajuste",
  },
  "1619": {
    codigo: "1619",
    nome: NOME_DA_SERIE["1619"],
    descricao: "Salário mínimo, R$ por mês",
    unidade: "R$",
    uso: "base em % do salário mínimo; reajuste pelo salário mínimo",
  },
  "29543": {
    codigo: "29543",
    nome: NOME_DA_SERIE["29543"],
    descricao: "Taxa legal (art. 406 do CC), % mensal, 6 casas, desde ago/2024",
    unidade: "% a.m.",
    uso: "juros do regime novo",
  },
  "4390": {
    codigo: "4390",
    nome: NOME_DA_SERIE["4390"],
    descricao: "SELIC acumulada no mês, % (mês corrente parcial)",
    unidade: "% a.m.",
    uso: "alternativa SELIC única",
  },
};

export const URL_BASE_SGS = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.";

/** URL do SGS para a série; sem datas, o BCB devolve o histórico completo das séries mensais. */
export function urlDaSerie(
  codigo: CodigoSerie,
  dataInicial?: DataISO,
  dataFinal?: DataISO,
): string {
  let url = `${URL_BASE_SGS}${codigo}/dados?formato=json`;
  if (dataInicial !== undefined) url += `&dataInicial=${formatarData(dataInicial)}`;
  if (dataFinal !== undefined) url += `&dataFinal=${formatarData(dataFinal)}`;
  return url;
}
