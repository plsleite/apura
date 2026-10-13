import type { CodigoSerie, Competencia, DataISO } from "../../compartilhado/tipos.ts";
import { esperadoAte } from "../../indices/calendario.ts";
import { descreverSituacao } from "../../indices/congelar.ts";
import { tabelaRegimeNovo } from "../../motor/testes/regime-novo.ts";
import type { Ambiente } from "../ambiente.ts";

/**
 * Ambiente falso para os testes de componente: dia fixo (11/10/2026), tabela de índices fixa (a
 * das seis séries de 2024 a 2026 usada pelos testes do motor, nunca a cópia publicada, que a
 * rotina central muda), ids previsíveis, armazenamento em memória e downloads capturados. Nenhum
 * teste da tela depende dos últimos meses de `dados/indices/`.
 */

export const HOJE_DE_TESTE: DataISO = "2026-10-11";
export const AGORA_DE_TESTE = "2026-10-11T15:00:00-03:00";

/** Um `Storage` em memória, com a interface do `localStorage`. */
export function armazenamentoEmMemoria(inicial: Record<string, string> = {}): Storage {
  const dados = new Map<string, string>(Object.entries(inicial));
  return {
    get length() {
      return dados.size;
    },
    key: (indice: number) => [...dados.keys()][indice] ?? null,
    getItem: (chave: string) => dados.get(chave) ?? null,
    setItem: (chave: string, valor: string) => {
      dados.set(chave, String(valor));
    },
    removeItem: (chave: string) => {
      dados.delete(chave);
    },
    clear: () => {
      dados.clear();
    },
  };
}

/** Um `Storage` que lança em toda operação, como num navegador com o armazenamento bloqueado. */
export function armazenamentoQueFalha(): Storage {
  const falhar = (): never => {
    throw new Error("Armazenamento bloqueado.");
  };
  return {
    length: 0,
    key: falhar,
    getItem: falhar,
    setItem: falhar,
    removeItem: falhar,
    clear: falhar,
  };
}

export interface AmbienteDeTeste extends Ambiente {
  /** arquivos "baixados" pela tela, na ordem */
  baixados: Array<{ nome: string; conteudo: string }>;
  armazenado: Storage | null;
  /** quantas vezes a tela congelou a tabela de índices */
  congelamentos: () => number;
}

export function ambienteDeTeste(
  opcoes: {
    /** corta séries numa competência (ex.: `{ "433": "2026-07" }`), para simular cópia atrasada */
    limites?: Partial<Record<CodigoSerie, Competencia>>;
    armazenamento?: Storage | null;
    hoje?: DataISO;
    agora?: string;
  } = {},
): AmbienteDeTeste {
  const hoje = opcoes.hoje ?? HOJE_DE_TESTE;
  const agora = opcoes.agora ?? AGORA_DE_TESTE;
  const armazenado =
    opcoes.armazenamento === undefined ? armazenamentoEmMemoria() : opcoes.armazenamento;
  const baixados: AmbienteDeTeste["baixados"] = [];
  let contador = 0;
  let congelamentos = 0;
  return {
    congelar: () => {
      congelamentos++;
      const tabela = { ...tabelaRegimeNovo(opcoes.limites), esperadoAte: esperadoAte(hoje) };
      return { tabela, situacao: descreverSituacao(tabela, hoje) };
    },
    hoje: () => hoje,
    agora: () => agora,
    novoId: () => `id-${++contador}`,
    armazenamento: () => armazenado,
    baixar: (nome, conteudo) => {
      baixados.push({ nome, conteudo });
    },
    baixados,
    armazenado,
    congelamentos: () => congelamentos,
  };
}
