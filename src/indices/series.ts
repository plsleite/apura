import { formatarData } from "../compartilhado/formatacao.ts";
import type { CodigoSerie, DataISO } from "../compartilhado/tipos.ts";

export interface DescricaoSerie {
  codigo: CodigoSerie;
  nome: string;
  descricao: string;
  unidade: string;
  uso: string;
}

/** As seis séries do SGS usadas pelo Apura (§8.1 do design). */
export const SERIES: Record<CodigoSerie, DescricaoSerie> = {
  "433": {
    codigo: "433",
    nome: "IPCA",
    descricao: "IPCA (IBGE), variação % mensal",
    unidade: "% a.m.",
    uso: "correção do regime novo; alternativa no antigo; reajuste",
  },
  "188": {
    codigo: "188",
    nome: "INPC",
    descricao: "INPC (IBGE), variação % mensal",
    unidade: "% a.m.",
    uso: "alternativa de correção; reajuste",
  },
  "189": {
    codigo: "189",
    nome: "IGP-M",
    descricao: "IGP-M (FGV), variação % mensal",
    unidade: "% a.m.",
    uso: "padrão do regime antigo; reajuste",
  },
  "1619": {
    codigo: "1619",
    nome: "salário mínimo",
    descricao: "Salário mínimo, R$ por mês",
    unidade: "R$",
    uso: "base em % do salário mínimo; reajuste pelo salário mínimo",
  },
  "29543": {
    codigo: "29543",
    nome: "taxa legal",
    descricao: "Taxa legal (art. 406 do CC), % mensal, 6 casas, desde ago/2024",
    unidade: "% a.m.",
    uso: "juros do regime novo",
  },
  "4390": {
    codigo: "4390",
    nome: "SELIC",
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
