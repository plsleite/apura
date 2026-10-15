import type { ArquivoSerie } from "../compartilhado/tipos.ts";
import { causaDoErro, nomeDoErro } from "./cliente-bcb.ts";
import {
  compararInstantes,
  dataHoraEmBrasilia,
  formatarDataHoraBrasilia,
  minutosEntre,
} from "./relogio.ts";

/**
 * O arquivo `versao.json` do site publicado (§19.2): a versão do Apura e a data de obtenção mais
 * recente da cópia dos índices (a mesma que o rodapé da tela mostra). A montagem do site o grava
 * (`vite.config.ts`), e a rotina de índices o lê para conferir que o site tem a cópia da `main`
 * (§19.4). Módulo puro: a rede entra por parâmetro.
 */
export interface VersaoDoSite {
  formato: "apura/versao-do-site@1";
  /** a do package.json */
  versao: string;
  /** data-hora ISO da obtenção mais recente entre as séries, comparada pelo instante */
  indicesAtualizadosEm: string;
}

export function montarVersaoDoSite(
  versao: string,
  arquivos: readonly ArquivoSerie[],
): VersaoDoSite {
  let indicesAtualizadosEm = "";
  for (const { obtidoEm } of arquivos) {
    if (indicesAtualizadosEm === "" || compararInstantes(obtidoEm, indicesAtualizadosEm) > 0) {
      indicesAtualizadosEm = obtidoEm;
    }
  }
  return { formato: "apura/versao-do-site@1", versao, indicesAtualizadosEm };
}

/**
 * O `versao.json` lido do site, conferido campo a campo (a data, como data-hora ISO com fuso);
 * nulo se não estiver no formato.
 */
export function lerVersaoDoSite(texto: string): VersaoDoSite | null {
  let dado: unknown;
  try {
    dado = JSON.parse(texto);
  } catch {
    return null;
  }
  if (typeof dado !== "object" || dado === null) return null;
  const { formato, versao, indicesAtualizadosEm } = dado as Partial<VersaoDoSite>;
  if (
    formato !== "apura/versao-do-site@1" ||
    typeof versao !== "string" ||
    typeof indicesAtualizadosEm !== "string" ||
    dataHoraEmBrasilia(indicesAtualizadosEm) === null
  ) {
    return null;
  }
  return { formato, versao, indicesAtualizadosEm };
}

export interface ConferenciaDaPublicacao {
  /** falso quando o site precisa de atenção: a rotina termina com falha (vermelha) */
  ok: boolean;
  /** uma frase completa, para a saída da rotina, o resumo e o e-mail do GitHub */
  mensagem: string;
}

/** Tempo para a publicação de um commit novo da `main` chegar ao site (a montagem leva minutos). */
export const TOLERANCIA_DA_PUBLICACAO_MINUTOS = 30;

/**
 * Compara a data dos índices do site com a da `main` (§19.4): em dia quando são o mesmo instante;
 * com a `main` mais nova há menos de `TOLERANCIA_DA_PUBLICACAO_MINUTOS`, a publicação pode estar em
 * andamento; qualquer outra diferença (site atrasado ou adiantado) pede atenção.
 */
export function conferirPublicacao(
  main: VersaoDoSite,
  site: VersaoDoSite,
  agora: string,
): ConferenciaDaPublicacao {
  const daMain = formatarDataHoraBrasilia(main.indicesAtualizadosEm);
  const doSite = formatarDataHoraBrasilia(site.indicesAtualizadosEm);
  const ordem = compararInstantes(site.indicesAtualizadosEm, main.indicesAtualizadosEm);
  if (ordem === 0) {
    return {
      ok: true,
      mensagem: `O site publicado está em dia: índices de ${daMain} (horário de Brasília), os mesmos da main.`,
    };
  }
  if (ordem > 0) {
    return {
      ok: false,
      mensagem: `O site publicado tem índices mais novos (${doSite}) que a main (${daMain}, horário de Brasília): confira se a main recuou ou se outra versão foi publicada.`,
    };
  }
  const idade = minutosEntre(main.indicesAtualizadosEm, agora);
  if (idade !== null && idade < TOLERANCIA_DA_PUBLICACAO_MINUTOS) {
    return {
      ok: true,
      mensagem: `A main tem os índices de ${daMain}, gravados há menos de ${TOLERANCIA_DA_PUBLICACAO_MINUTOS} minutos; o site publicado ainda tem os de ${doSite} (horário de Brasília): a publicação pode estar em andamento.`,
    };
  }
  return {
    ok: false,
    mensagem: `O site publicado tem os índices de ${doSite}; a main tem os de ${daMain} (horário de Brasília). Confira a última publicação no painel do Cloudflare Pages.`,
  };
}

export interface OpcoesDaConferencia {
  /** Função de rede; padrão `globalThis.fetch`. */
  fetch?: typeof globalThis.fetch;
  /** Como esperar entre as tentativas; padrão `setTimeout`. Os testes injetam uma que só registra. */
  dormir?: (ms: number) => Promise<void>;
}

const TENTATIVAS = 3;
const ESPERA_MS = 10_000;
const TEMPO_LIMITE_MS = 20_000;

/** " (ENOTFOUND)": a causa que o fetch do Node anexa; sem ela, a mensagem do erro, numa linha. */
function detalheDoErro(erro: unknown): string {
  const causa = causaDoErro(erro);
  if (causa !== "") return causa;
  const mensagem = erro instanceof Error ? erro.message.replace(/\s+/g, " ").trim() : "";
  return mensagem === "" ? "" : ` (${mensagem})`;
}

function dormirPadrao(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

/**
 * Lê `<endereço>/versao.json` e confere com a `main` (§19.4). Até três tentativas, com 10 s de
 * espera, quando o site não responde ou responde com erro; arquivo fora do formato não repete.
 * Nunca lança: a falha vira a frase de `ConferenciaDaPublicacao`.
 */
export async function conferirSitePublicado(
  endereco: string,
  main: VersaoDoSite,
  agora: string,
  opcoes: OpcoesDaConferencia = {},
): Promise<ConferenciaDaPublicacao> {
  const fazerPedido = opcoes.fetch ?? globalThis.fetch;
  const dormir = opcoes.dormir ?? dormirPadrao;
  const url = `${endereco.replace(/\/+$/, "")}/versao.json`;
  let motivo = "";
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    if (tentativa > 1) await dormir(ESPERA_MS);
    let texto: string;
    try {
      const resposta = await fazerPedido(url, { signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
      texto = await resposta.text();
      if (!resposta.ok) {
        motivo = `o site respondeu HTTP ${resposta.status}`;
        continue;
      }
    } catch (erro) {
      motivo = `sem resposta do site: ${nomeDoErro(erro)}${detalheDoErro(erro)}`;
      continue;
    }
    const site = lerVersaoDoSite(texto);
    if (site === null) {
      return {
        ok: false,
        mensagem: `O arquivo ${url} não está no formato esperado (apura/versao-do-site@1).`,
      };
    }
    return conferirPublicacao(main, site, agora);
  }
  return {
    ok: false,
    mensagem: `Não foi possível ler ${url} depois de ${TENTATIVAS} tentativas: ${motivo}.`,
  };
}
