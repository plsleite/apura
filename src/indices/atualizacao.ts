import { formatarCompetencia } from "../compartilhado/formatacao.ts";
import type {
  ArquivoSerie,
  CodigoSerie,
  Competencia,
  TabelaIndices,
  ValorIndice,
} from "../compartilhado/tipos.ts";
import { agruparAtrasados, mesesAtrasados, SERIES_EM_ORDEM_NUMERICA } from "./calendario.ts";
import { buscarSerie, montarArquivoSerie } from "./cliente-bcb.ts";
import type { OpcoesBusca, RespostaBusca, ValorMensal } from "./cliente-bcb.ts";
import { compararSeries, lerArquivoSerie } from "./arquivo-serie.ts";
import type { ComparacaoDeSerie } from "./arquivo-serie.ts";
import { agoraEmBrasilia, dataHoraEmBrasilia } from "./relogio.ts";
import { SERIES } from "./series.ts";

/**
 * Orquestração de `scripts/atualizar-indices.ts`, a rotina central de índices (fase 4), separada do
 * script para ser testada sem rede e sem disco: baixa todas as séries pedidas, confere cada uma
 * contra o arquivo atual e grava, série por série, as que vieram boas e mudaram (uma série com
 * problema não impede as outras). Rede (`fetch`), disco (`ArquivosDeSeries`) e relógio (`agora`)
 * entram por parâmetro; o script passa as versões reais. Não importa `embutidos.ts` nem
 * `congelar.ts`: o script precisa iniciar mesmo com um arquivo de série faltando ou corrompido.
 */

/** O que o script sabe fazer com a pasta `dados/indices/`: ler o texto de um arquivo e gravar outro. */
export interface ArquivosDeSeries {
  /** Texto do arquivo atual da série, ou null quando ele não existe. */
  ler(codigo: CodigoSerie): string | null;
  /** Grava o texto completo do arquivo da série (substituindo o atual). */
  gravar(codigo: CodigoSerie, texto: string): void;
}

export interface OpcoesAtualizacao {
  /** Função de rede; padrão `globalThis.fetch`. */
  fetch?: typeof globalThis.fetch;
  /** Data-hora ISO em Brasília para `obtidoEm`; padrão `agoraEmBrasilia`. */
  agora?: () => string;
  /** Ajustes por cima de `BUSCA_DO_SCRIPT` (os testes injetam `dormir`). */
  busca?: Omit<OpcoesBusca, "fetch">;
}

/** Parâmetros de busca da rotina: 30 s por pedido, até três tentativas, 2 s de espera (ninguém espera por ela). */
export const BUSCA_DO_SCRIPT: Pick<OpcoesBusca, "tempoLimiteMs" | "tentativas" | "esperaMs"> = {
  tempoLimiteMs: 30_000,
  tentativas: 3,
  esperaMs: 2_000,
};

export type SeriesPedidas = { ok: true; codigos: CodigoSerie[] } | { ok: false; mensagem: string };

/** O que a execução tem a dizer, em frases prontas para a saída do script (e o resumo e o commit da rotina). */
export interface ResultadoAtualizacao {
  /**
   * uma por série pedida, na ordem: gravada ("433 (IPCA): 562 meses, último 2026-10 = 0.30"), sem
   * mudança ("433 (IPCA): sem mudança; 561 meses, …") ou não gravada ("433 (IPCA): não gravada.")
   */
  linhas: string[];
  /**
   * revisões ("Atenção: na série 433 mudou 1 valor já publicado: 2026-09 de 0.80 para 0.82.") e
   * SELIC parcial ("SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.30 para 0.36.")
   */
  avisos: string[];
  /** um por série com problema, em frase completa; a série fica como estava */
  problemas: string[];
  /**
   * depois da execução, os meses já divulgados pelo calendário que ainda não estão nos arquivos das
   * séries pedidas, um por grupo de `agruparAtrasados`:
   * "Ainda não disponível no BCB: IPCA de set/2026 (divulgação prevista por volta de 10/10/2026)."
   */
  atrasados: string[];
}

function ehCodigo(texto: string): texto is CodigoSerie {
  return Object.hasOwn(SERIES, texto);
}

/** "a" · "a e b" · "a, b e c" */
function listar(itens: string[]): string {
  const ultimo = itens.at(-1);
  if (ultimo === undefined) return "";
  const anteriores = itens.slice(0, -1);
  return anteriores.length === 0 ? ultimo : `${anteriores.join(", ")} e ${ultimo}`;
}

/** Tira um ponto final para a frase receber o seu (ou caber entre parênteses). */
function semPontoFinal(texto: string): string {
  return texto.endsWith(".") ? texto.slice(0, -1) : texto;
}

function mensagemDoErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}

/**
 * Séries a atualizar a partir dos argumentos da linha de comando: sem argumentos, as seis em ordem
 * numérica; com argumentos, na ordem pedida e sem repetição. Qualquer código desconhecido recusa o
 * pedido inteiro, antes de baixar o que for (cada desconhecido é nomeado uma vez só).
 */
export function seriesPedidas(argumentos: readonly string[]): SeriesPedidas {
  if (argumentos.length === 0) return { ok: true, codigos: [...SERIES_EM_ORDEM_NUMERICA] };
  const desconhecidos = [...new Set(argumentos.filter((argumento) => !ehCodigo(argumento)))];
  if (desconhecidos.length > 0) {
    const nomes = desconhecidos.map((argumento) => (argumento === "" ? "(vazio)" : argumento));
    const quais =
      nomes.length === 1
        ? `Série desconhecida: ${nomes[0]}`
        : `Séries desconhecidas: ${listar(nomes)}`;
    return {
      ok: false,
      mensagem: `${quais}. Conhecidas: ${SERIES_EM_ORDEM_NUMERICA.join(", ")}.`,
    };
  }
  const codigos: CodigoSerie[] = [];
  for (const argumento of argumentos) {
    if (ehCodigo(argumento) && !codigos.includes(argumento)) codigos.push(argumento);
  }
  return { ok: true, codigos };
}

/** Como sair do impasse de um arquivo atual ilegível, que o script se recusa a sobrescrever. */
function comoRestaurar(codigo: CodigoSerie): string {
  return `(restaure-o com "git checkout -- dados/indices/${codigo}.json" ou apague-o para baixar a série inteira de novo)`;
}

/** Arquivo atual lido e conferido (`arquivo` null quando não existe), ou o problema que impede a gravação. */
type ArquivoAtual = { ok: true; arquivo: ArquivoSerie | null } | { ok: false; problema: string };

function lerArquivoAtual(codigo: CodigoSerie, texto: string | null): ArquivoAtual {
  if (texto === null) return { ok: true, arquivo: null };
  let dado: unknown;
  try {
    dado = JSON.parse(texto);
  } catch {
    return {
      ok: false,
      problema: `O arquivo atual da série ${codigo} não é JSON válido ${comoRestaurar(codigo)}.`,
    };
  }
  try {
    return { ok: true, arquivo: lerArquivoSerie(dado, codigo) };
  } catch (erro) {
    return {
      ok: false,
      problema: `O arquivo atual da série ${codigo} não pôde ser lido (${semPontoFinal(mensagemDoErro(erro))}) ${comoRestaurar(codigo)}.`,
    };
  }
}

/** "A série 189 não foi baixada após 3 tentativas: o BCB respondeu HTTP 502." */
function problemaDeBusca(codigo: CodigoSerie, resposta: RespostaBusca & { ok: false }): string {
  const tentativas = resposta.tentativas > 1 ? ` após ${resposta.tentativas} tentativas` : "";
  return `A série ${codigo} não foi baixada${tentativas}: ${semPontoFinal(resposta.motivo)}.`;
}

type Alterados = ComparacaoDeSerie["alterados"];

/** "Atenção: na série 433 mudou 1 valor já publicado: 2026-09 de 0.82 para 0.85." */
function avisoDeRevisao(codigo: CodigoSerie, alterados: Alterados): string {
  const quantos =
    alterados.length === 1
      ? "mudou 1 valor já publicado"
      : `mudaram ${alterados.length} valores já publicados`;
  const itens = alterados.map(
    ({ competencia, antes, depois }) => `${competencia} de ${antes} para ${depois}`,
  );
  return `Atenção: na série ${codigo} ${quantos}: ${listar(itens)}.`;
}

/** "SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.30 para 0.36." */
function avisoDeSelicParcial({ competencia, antes, depois }: Alterados[number]): string {
  return `SELIC de ${formatarCompetencia(competencia)} (acumulado parcial do mês) atualizada de ${antes} para ${depois}.`;
}

/**
 * Mês ("AAAA-MM") de uma data-hora ISO no horário de Brasília, ou null quando o texto não é
 * data-hora com fuso. A conversão importa nos arquivos anteriores à fase 4, gravados em UTC:
 * "2026-11-01T01:30:00Z" ainda é 31/10/2026 em Brasília, e o mês parcial da SELIC era outubro.
 */
function mesEmBrasilia(iso: string): Competencia | null {
  return dataHoraEmBrasilia(iso)?.data.slice(0, 7) ?? null;
}

/**
 * Avisos dos valores já publicados que mudaram. Na SELIC (4390), o mês do `obtidoEm` do
 * arquivo atual e os seguintes eram o acumulado parcial, que muda todo dia útil até fechar no início
 * do mês seguinte: cada um vira uma linha informativa, sem "Atenção". Mês anterior a esse, ou
 * qualquer mês das outras séries, é revisão de valor publicado ("Atenção: …"), que vem primeiro.
 * Sem `obtidoEm` legível não há como saber qual mês era parcial, e toda mudança conta como revisão.
 */
function avisosDeAlterados(
  codigo: CodigoSerie,
  alterados: Alterados,
  obtidoEmAtual: string,
): string[] {
  const mesParcial = codigo === "4390" ? mesEmBrasilia(obtidoEmAtual) : null;
  const ehParcial = (competencia: Competencia): boolean =>
    mesParcial !== null && competencia >= mesParcial;
  const revisoes = alterados.filter(({ competencia }) => !ehParcial(competencia));
  const parciais = alterados.filter(({ competencia }) => ehParcial(competencia));
  return [
    ...(revisoes.length > 0 ? [avisoDeRevisao(codigo, revisoes)] : []),
    ...parciais.map(avisoDeSelicParcial),
  ];
}

/** "433 (IPCA)" */
function rotulo(codigo: CodigoSerie): string {
  return `${codigo} (${SERIES[codigo].nome})`;
}

/** "433 (IPCA): 561 meses, último 2026-09 = 0.82"; sem mudança: "433 (IPCA): sem mudança; 561 meses, …" */
function linhaDaSerie(codigo: CodigoSerie, valores: ValorMensal[], semMudanca = false): string {
  const ultimo = valores.at(-1);
  const meses = valores.length === 1 ? "1 mês" : `${valores.length} meses`;
  const situacao = semMudanca ? "sem mudança; " : "";
  return `${rotulo(codigo)}: ${situacao}${meses}, último ${ultimo?.competencia ?? "-"} = ${ultimo?.valor ?? "-"}`;
}

/** Conteúdo do arquivo como vai para o disco: JSON com 2 espaços e quebra de linha final. */
function textoDoArquivo(codigo: CodigoSerie, valores: ValorMensal[], obtidoEm: string): string {
  return `${JSON.stringify(montarArquivoSerie(codigo, valores, obtidoEm), null, 2)}\n`;
}

interface SerieBaixada {
  codigo: CodigoSerie;
  resposta: RespostaBusca;
  /** data-hora da obtenção, lida logo após a resposta */
  obtidoEm: string;
}

/** Valores com que a série termina a execução (os gravados ou os do arquivo atual) e sua obtenção. */
interface ValoresFinais {
  valores: ValorMensal[];
  obtidoEm: string;
}

/**
 * O que fazer com uma série depois de baixada e conferida: gravar; não regravar, por ser idêntica
 * ao arquivo atual (mantém a data de obtenção original, que na SELIC diz qual mês é o parcial, e a
 * rotina só grava quando há dado novo); ou deixá-la como estava, por um problema.
 */
type Decisao =
  | { tipo: "gravar"; valores: ValorMensal[]; obtidoEm: string }
  | { tipo: "semMudanca"; valores: ValorMensal[]; finais: ValoresFinais }
  | { tipo: "problema"; problema: string; finais: ValoresFinais | null };

interface SerieDecidida {
  codigo: CodigoSerie;
  decisao: Decisao;
  avisos: string[];
}

/**
 * Decide uma série pela resposta do BCB e pelo texto do arquivo atual. Problemas, um por série, na
 * ordem: busca que falhou; arquivo atual ilegível; resposta vazia sem nada no arquivo atual; lista
 * nova que encolheu. Valores já publicados que mudaram geram aviso, não impedimento.
 */
function decidir(
  { codigo, resposta, obtidoEm }: SerieBaixada,
  texto: string | null,
): SerieDecidida {
  const atual = lerArquivoAtual(codigo, texto);
  const arquivo = atual.ok ? atual.arquivo : null;
  const finaisDoArquivo: ValoresFinais | null =
    arquivo === null ? null : { valores: arquivo.valores, obtidoEm: arquivo.obtidoEm };
  const problema = (frase: string): SerieDecidida => ({
    codigo,
    decisao: { tipo: "problema", problema: frase, finais: finaisDoArquivo },
    avisos: [],
  });

  // Busca que falhou: não se sabe o que o BCB tem, e a série fica fora dos meses atrasados (o
  // problema já a cita).
  if (!resposta.ok) {
    return {
      codigo,
      decisao: { tipo: "problema", problema: problemaDeBusca(codigo, resposta), finais: null },
      avisos: [],
    };
  }
  if (!atual.ok) return problema(atual.problema);
  if (resposta.valores.length === 0 && (arquivo === null || arquivo.valores.length === 0)) {
    return problema(`A série ${codigo} veio vazia.`);
  }
  if (arquivo === null) {
    return { codigo, decisao: { tipo: "gravar", valores: resposta.valores, obtidoEm }, avisos: [] };
  }
  const comparacao = compararSeries(arquivo.valores, resposta.valores);
  if (comparacao.encolheu) {
    const motivo = semPontoFinal(comparacao.motivo ?? "a lista nova perdeu meses");
    return problema(`A série ${codigo} encolheu: ${motivo}.`);
  }
  const avisos = avisosDeAlterados(codigo, comparacao.alterados, arquivo.obtidoEm);
  const semMudanca =
    comparacao.alterados.length === 0 &&
    comparacao.novos.length === 0 &&
    resposta.valores.length === arquivo.valores.length;
  const decisao: Decisao = semMudanca
    ? {
        tipo: "semMudanca",
        valores: resposta.valores,
        finais: { valores: arquivo.valores, obtidoEm: arquivo.obtidoEm },
      }
    : { tipo: "gravar", valores: resposta.valores, obtidoEm };
  return { codigo, decisao, avisos };
}

/** Tabela só com o que o calendário precisa: as competências de cada série ao fim da execução. */
function tabelaMinima(
  finais: Partial<Record<CodigoSerie, ValoresFinais>>,
  consultadoEm: string,
): TabelaIndices {
  const series: TabelaIndices["series"] = {};
  for (const codigo of SERIES_EM_ORDEM_NUMERICA) {
    const serie = finais[codigo];
    if (serie === undefined) continue;
    const porCompetencia: Record<Competencia, ValorIndice> = {};
    for (const { competencia, valor } of serie.valores) {
      porCompetencia[competencia] = { valor, fonte: "embutida", obtidoEm: serie.obtidoEm };
    }
    series[codigo] = porCompetencia;
  }
  return { consultadoEm, series };
}

/**
 * "Ainda não disponível no BCB: IPCA de set/2026 (divulgação prevista por volta de 10/10/2026)." e
 * "Ainda não disponível no BCB: salário mínimo de jan/2027 a dez/2027 (…).": um por grupo de meses
 * atrasados pelo calendário, em ordem numérica de série. Só entram as séries com valores finais
 * conhecidos: as gravadas, as sem mudança e as que tiveram problema depois de o BCB responder
 * (pelo arquivo atual legível).
 */
function linhasDeAtrasados(
  finais: Partial<Record<CodigoSerie, ValoresFinais>>,
  agora: string,
): string[] {
  const hoje = agora.slice(0, 10);
  const grupos = agruparAtrasados(mesesAtrasados(tabelaMinima(finais, agora), hoje));
  return grupos.map(({ serie, de, ate, previsao }) => {
    const meses =
      de === ate
        ? formatarCompetencia(de)
        : `${formatarCompetencia(de)} a ${formatarCompetencia(ate)}`;
    return `Ainda não disponível no BCB: ${SERIES[serie].nome} de ${meses} (divulgação prevista ${previsao}).`;
  });
}

/**
 * Baixa o histórico completo de cada série pedida (em sequência, com `BUSCA_DO_SCRIPT`), confere
 * cada uma contra o arquivo atual e grava, uma a uma, as que vieram boas e mudaram. Série que
 * falhou, encolheu, veio vazia ou tem arquivo atual ilegível fica como estava e entra em
 * `problemas`, sem impedir as outras. Série idêntica ao arquivo atual não é regravada. Todos os
 * arquivos são lidos antes da primeira gravação. Ao fim, aponta os meses que o calendário diz já
 * divulgados e que os arquivos ainda não têm. Nunca lança por dado ruim (do BCB ou do arquivo);
 * só um erro do disco sobe, para o script imprimir.
 */
export async function atualizarSeries(
  codigos: readonly CodigoSerie[],
  arquivos: ArquivosDeSeries,
  opcoes: OpcoesAtualizacao = {},
): Promise<ResultadoAtualizacao> {
  const agora = opcoes.agora ?? agoraEmBrasilia;
  const busca: OpcoesBusca = { ...BUSCA_DO_SCRIPT, ...opcoes.busca, fetch: opcoes.fetch };

  // 1) Baixa todas as séries, em sequência, antes de qualquer decisão.
  const baixadas: SerieBaixada[] = [];
  for (const codigo of codigos) {
    const resposta = await buscarSerie(codigo, undefined, busca);
    baixadas.push({ codigo, resposta, obtidoEm: agora() });
  }

  // 2) Lê o arquivo atual de cada uma e decide (um erro de leitura do disco interrompe aqui).
  const decididas = baixadas.map((baixada) => decidir(baixada, arquivos.ler(baixada.codigo)));

  // 3) Grava, série por série, as que vieram boas e mudaram.
  const linhas: string[] = [];
  const avisos: string[] = [];
  const problemas: string[] = [];
  const finais: Partial<Record<CodigoSerie, ValoresFinais>> = {};
  for (const { codigo, decisao, avisos: avisosDaSerie } of decididas) {
    avisos.push(...avisosDaSerie);
    switch (decisao.tipo) {
      case "gravar":
        arquivos.gravar(codigo, textoDoArquivo(codigo, decisao.valores, decisao.obtidoEm));
        linhas.push(linhaDaSerie(codigo, decisao.valores));
        finais[codigo] = { valores: decisao.valores, obtidoEm: decisao.obtidoEm };
        break;
      case "semMudanca":
        linhas.push(linhaDaSerie(codigo, decisao.valores, true));
        finais[codigo] = decisao.finais;
        break;
      case "problema":
        linhas.push(`${rotulo(codigo)}: não gravada.`);
        problemas.push(decisao.problema);
        if (decisao.finais !== null) finais[codigo] = decisao.finais;
        break;
    }
  }

  // 4) Meses já divulgados pelo calendário que os arquivos ainda não têm.
  return { linhas, avisos, problemas, atrasados: linhasDeAtrasados(finais, agora()) };
}
