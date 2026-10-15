import type { DataISO } from "../compartilhado/tipos.ts";
import { congelarIndices, type SituacaoIndices } from "../indices/congelar.ts";
import { agoraEmBrasilia, hojeEmBrasilia } from "../indices/relogio.ts";
import type { TabelaIndices } from "../compartilhado/tipos.ts";

/**
 * Tudo o que a tela precisa do mundo exterior, num objeto só, para que os testes de componente
 * troquem cada peça por uma versão falsa: a cópia publicada dos índices (congelada por cálculo),
 * o relógio, a geração de ids, o armazenamento do navegador, o download de arquivos e a
 * impressão. A tela
 * nunca acessa a rede (§14 do design).
 */
export interface Ambiente {
  /** congela a tabela de índices de um cálculo (síncrono, sem rede), ao abrir o app e em "Novo cálculo" */
  congelar: () => { tabela: TabelaIndices; situacao: SituacaoIndices };
  /** data de hoje em Brasília, para a data de elaboração padrão */
  hoje: () => DataISO;
  /** data-hora ISO de agora em Brasília, para `criadoEm` e `atualizadoEm` */
  agora: () => string;
  /** id novo para cálculos */
  novoId: () => string;
  /**
   * o `localStorage` do navegador, ou nulo quando ele não existe ou está bloqueado (janela anônima
   * com bloqueio, política do navegador): quem usa trata nulo como "não guardar"
   */
  armazenamento: () => Storage | null;
  /** entrega ao usuário um arquivo de texto com o nome dado (download) */
  baixar: (nome: string, conteudo: string) => void;
  /** abre a impressão do navegador ("Imprimir / Salvar PDF", §18.1) */
  imprimir: () => void;
  /** recarrega a página (tela de erro de reserva, §18.6) */
  recarregar: () => void;
}

function armazenamentoDoNavegador(): Storage | null {
  try {
    const armazenamento = globalThis.localStorage;
    // Em navegadores com o armazenamento bloqueado, só acessar a propriedade já lança.
    return armazenamento ?? null;
  } catch {
    return null;
  }
}

/** Espera antes de revogar o endereço provisório do arquivo baixado (§19.7, item 9). */
const ESPERA_PARA_REVOGAR_MS = 60_000;

/**
 * Entrega o arquivo pelo download do navegador. O endereço provisório (`blob:`) só é revogado um
 * minuto depois do clique: o Safari às vezes perde o download quando ele some antes de começar.
 */
export function baixarPeloNavegador(nome: string, conteudo: string): void {
  const url = URL.createObjectURL(new Blob([conteudo], { type: "application/json" }));
  const ancora = document.createElement("a");
  ancora.href = url;
  ancora.download = nome;
  document.body.append(ancora);
  ancora.click();
  ancora.remove();
  setTimeout(() => URL.revokeObjectURL(url), ESPERA_PARA_REVOGAR_MS);
}

/** O ambiente real do navegador. */
export function ambientePadrao(): Ambiente {
  return {
    congelar: () => congelarIndices(),
    hoje: () => hojeEmBrasilia(),
    agora: () => agoraEmBrasilia(),
    novoId: () => crypto.randomUUID(),
    armazenamento: armazenamentoDoNavegador,
    baixar: baixarPeloNavegador,
    imprimir: () => window.print(),
    recarregar: () => window.location.reload(),
  };
}
