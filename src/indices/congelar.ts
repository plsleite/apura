import { decimalOuNulo } from "../compartilhado/decimal.ts";
import { formatarCompetencia, formatarData, formatarMoeda } from "../compartilhado/formatacao.ts";
import { NOME_DA_SERIE } from "../compartilhado/tipos.ts";
import type {
  ArquivoSerie,
  CodigoSerie,
  Competencia,
  DataISO,
  IndiceUsado,
  TabelaIndices,
  TextoDecimal,
  ValorIndice,
} from "../compartilhado/tipos.ts";
import {
  agruparAtrasados,
  esperadoAte,
  mesesAtrasados,
  SERIES_EM_ORDEM_NUMERICA,
} from "./calendario.ts";
import type { GrupoDeAtraso, MesAtrasado } from "./calendario.ts";
import { seriesEmbutidas } from "./embutidos.ts";
import {
  compararInstantes,
  dataHoraEmBrasilia,
  formatarDataHoraBrasilia,
  hojeEmBrasilia,
} from "./relogio.ts";

// Congelamento da tabela de índices de um cálculo (fase 4, rotina central, decisão de
// 12/10/2026): o app não consulta o BCB nem usa armazenamento; a tabela vem só da cópia publicada
// com o site (dados/indices/*.json, mantida em dia pela rotina do GitHub Actions). Este módulo
// monta a tabela, descreve a situação dos índices (rodapé e avisos da tela, pelo calendário de
// divulgação) e compara os índices usados por um cálculo salvo com os de um recálculo. Sem rede,
// sem armazenamento e síncrono; `hoje` e a cópia embutida entram por parâmetro, com padrão real.

// ---------------------------------------------------------------------------------------------
// Utilitários de texto
// ---------------------------------------------------------------------------------------------

/** Séries de nome feminino ("a SELIC", "a taxa legal"), para a concordância dos avisos. */
const SERIES_FEMININAS: ReadonlySet<CodigoSerie> = new Set<CodigoSerie>(["4390", "29543"]);

function posicaoDaSerie(serie: CodigoSerie): number {
  return SERIES_EM_ORDEM_NUMERICA.indexOf(serie);
}

function compararCompetencias(a: Competencia, b: Competencia): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Primeira letra maiúscula, para o nome da série que abre a frase ("Taxa legal de …"). */
function comMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Só a data, "11/10/2026", no horário de Brasília, de uma data-hora ISO (texto inválido volta como veio). */
function dataEmBrasilia(iso: string): string {
  const emBrasilia = dataHoraEmBrasilia(iso);
  return emBrasilia === null ? iso : formatarData(emBrasilia.data);
}

/** O maior de uma lista de datas-hora ISO, pelo instante (`compararInstantes`); vazio sem nenhuma. */
function maisRecente(datas: string[]): string {
  return (
    datas.reduce<string | undefined>(
      (maior, data) => (maior === undefined || compararInstantes(data, maior) > 0 ? data : maior),
      undefined,
    ) ?? ""
  );
}

function ultimoMes(valores: Record<Competencia, ValorIndice> | undefined): Competencia | undefined {
  return Object.keys(valores ?? {})
    .sort(compararCompetencias)
    .at(-1);
}

// ---------------------------------------------------------------------------------------------
// Tabela: a cópia publicada
// ---------------------------------------------------------------------------------------------

/**
 * Monta a tabela de índices a partir da cópia embutida: séries em ordem numérica, meses em ordem
 * crescente, cada valor com fonte "embutida" e o `obtidoEm` do seu arquivo. `consultadoEm` é o
 * `obtidoEm` mais recente entre os arquivos, comparado pelo instante (há arquivos em UTC, "…Z", e
 * em Brasília, "…-03:00"); `esperadoAte` vem do calendário de divulgação para `hoje`. Arquivo
 * guardado sob o código de outra série é ignorado (códigos nunca se misturam); arquivo vazio entra
 * como {} e a data dele conta; série sem arquivo fica de fora.
 */
export function montarTabela(
  embutidas: Record<CodigoSerie, ArquivoSerie>,
  hoje: DataISO,
): TabelaIndices {
  const series: TabelaIndices["series"] = {};
  const datas: string[] = [];
  for (const codigo of SERIES_EM_ORDEM_NUMERICA) {
    const arquivo: ArquivoSerie | undefined = embutidas[codigo];
    if (arquivo?.codigo !== codigo) continue;
    datas.push(arquivo.obtidoEm);
    const valores = [...arquivo.valores].sort((a, b) =>
      compararCompetencias(a.competencia, b.competencia),
    );
    series[codigo] = Object.fromEntries(
      valores.map(({ competencia, valor }) => [
        competencia,
        { valor, fonte: "embutida", obtidoEm: arquivo.obtidoEm } satisfies ValorIndice,
      ]),
    );
  }
  return { consultadoEm: maisRecente(datas), series, esperadoAte: esperadoAte(hoje) };
}

// ---------------------------------------------------------------------------------------------
// Situação dos índices: rodapé e avisos (§8.3)
// ---------------------------------------------------------------------------------------------

export interface OpcoesCongelamento {
  /** padrão `hojeEmBrasilia()` */
  hoje?: DataISO;
  /** padrão `seriesEmbutidas()`; os testes injetam séries pequenas */
  embutidas?: Record<CodigoSerie, ArquivoSerie>;
}

export interface SituacaoIndices {
  /** = tabela.consultadoEm */
  atualizadoEm: string;
  /** último mês de cada série presente na tabela (série ausente ou vazia não entra) */
  ultimoMesPorSerie: Partial<Record<CodigoSerie, Competencia>>;
  /** calendário: meses já divulgados que a cópia publicada não tem */
  atrasados: MesAtrasado[];
  /** rodapé da tela (§8.3); o relatório usa `Resultado.consultaIndices` */
  rodape: string;
  /** para a caixa de avisos da tela */
  avisos: string[];
}

/**
 * "Índices oficiais BCB/SGS · IPCA até set/2026 · atualizados em 09/10/2026 14:17 (horário de
 * Brasília)". Sem IPCA na tabela, sai o trecho "· IPCA até …"; sem data na tabela (nenhum arquivo),
 * sai o trecho "· atualizados em …".
 */
function montarRodape(tabela: TabelaIndices): string {
  const trechos = ["Índices oficiais BCB/SGS"];
  const ipca = ultimoMes(tabela.series["433"]);
  if (ipca !== undefined) trechos.push(`IPCA até ${formatarCompetencia(ipca)}`);
  if (tabela.consultadoEm !== "") {
    trechos.push(
      `atualizados em ${formatarDataHoraBrasilia(tabela.consultadoEm)} (horário de Brasília)`,
    );
  }
  return trechos.join(" · ");
}

/** Data (em Brasília) do dado mais recente que a tabela tem da série; a da tabela, se não tiver nenhum. */
function dataDosDadosDaSerie(tabela: TabelaIndices, serie: CodigoSerie): string {
  const maior = maisRecente(Object.values(tabela.series[serie] ?? {}).map((v) => v.obtidoEm));
  return dataEmBrasilia(maior === "" ? tabela.consultadoEm : maior);
}

/**
 * "IPCA de set/2026, divulgado por volta de 10/10/2026, ainda não chegou ao Apura: o cálculo usa os
 * índices disponíveis em 12/09/2026." A data é a dos dados que a tabela tem daquela série. Meses
 * seguidos com a mesma previsão saem numa frase só: "Salário mínimo de jan/2027 a dez/2027, …".
 */
function avisoDeAtraso(grupo: GrupoDeAtraso, tabela: TabelaIndices): string {
  const nome = comMaiuscula(NOME_DA_SERIE[grupo.serie]);
  const divulgado = SERIES_FEMININAS.has(grupo.serie) ? "divulgada" : "divulgado";
  const meses =
    grupo.de === grupo.ate
      ? formatarCompetencia(grupo.de)
      : `${formatarCompetencia(grupo.de)} a ${formatarCompetencia(grupo.ate)}`;
  return `${nome} de ${meses}, ${divulgado} ${grupo.previsao}, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em ${dataDosDadosDaSerie(tabela, grupo.serie)}.`;
}

/**
 * Descreve a situação dos índices da tabela para a tela: data da atualização da cópia publicada,
 * último mês de cada série, meses que o calendário dá como divulgados e a cópia ainda não tem, o
 * rodapé e um aviso por grupo de meses atrasados (séries em ordem numérica, meses crescentes).
 */
export function descreverSituacao(tabela: TabelaIndices, hoje: DataISO): SituacaoIndices {
  const ultimoMesPorSerie: SituacaoIndices["ultimoMesPorSerie"] = {};
  for (const serie of SERIES_EM_ORDEM_NUMERICA) {
    const ultimo = ultimoMes(tabela.series[serie]);
    if (ultimo !== undefined) ultimoMesPorSerie[serie] = ultimo;
  }
  const atrasados = mesesAtrasados(tabela, hoje);
  const avisos = agruparAtrasados(atrasados).map((grupo) => avisoDeAtraso(grupo, tabela));
  return {
    atualizadoEm: tabela.consultadoEm,
    ultimoMesPorSerie,
    atrasados,
    rodape: montarRodape(tabela),
    avisos,
  };
}

// ---------------------------------------------------------------------------------------------
// Congelamento: a função única da tela
// ---------------------------------------------------------------------------------------------

/**
 * Congela a tabela de índices para um cálculo: a função que a tela chama ao abrir o app e ao
 * iniciar um cálculo. Monta a tabela da cópia embutida para `hoje` (padrão: a data de Brasília) e
 * descreve a situação dela. Síncrona, sem rede e sem armazenamento.
 */
export function congelarIndices(opcoes: OpcoesCongelamento = {}): {
  tabela: TabelaIndices;
  situacao: SituacaoIndices;
} {
  const hoje = opcoes.hoje ?? hojeEmBrasilia();
  const embutidas = opcoes.embutidas ?? seriesEmbutidas();
  const tabela = montarTabela(embutidas, hoje);
  return { tabela, situacao: descreverSituacao(tabela, hoje) };
}

// ---------------------------------------------------------------------------------------------
// Comparação dos índices usados por um cálculo salvo com os do recálculo (D5, D6)
// ---------------------------------------------------------------------------------------------

/** Ordem das listas por série e mês: séries em ordem numérica, meses crescentes. */
function compararSerieECompetencia(
  a: { serie: CodigoSerie; competencia: Competencia },
  b: { serie: CodigoSerie; competencia: Competencia },
): number {
  return (
    posicaoDaSerie(a.serie) - posicaoDaSerie(b.serie) ||
    compararCompetencias(a.competencia, b.competencia)
  );
}

/** Salário mínimo em reais ("R$ 1.621,00"); as demais séries em percentual com vírgula ("1,57%"). */
function formatarValorDoIndice(serie: CodigoSerie, valor: TextoDecimal): string {
  if (serie === "1619") {
    const numero = decimalOuNulo(valor);
    return numero === null ? valor : formatarMoeda(numero);
  }
  return `${valor.replace(".", ",")}%`;
}

/** Mesmo número, mesmo que escrito de outro jeito ("0.8" e "0.80"); texto inválido compara como texto. */
function mesmoValor(a: TextoDecimal, b: TextoDecimal): boolean {
  const da = decimalOuNulo(a);
  const db = decimalOuNulo(b);
  return da !== null && db !== null ? da.equals(db) : a === b;
}

function chaveDoIndice(indice: { serie: CodigoSerie; competencia: Competencia }): string {
  return `${indice.serie}|${indice.competencia}`;
}

function porChave(indices: IndiceUsado[]): Map<string, IndiceUsado> {
  const mapa = new Map<string, IndiceUsado>();
  for (const indice of indices) mapa.set(chaveDoIndice(indice), indice);
  return mapa;
}

/** "IPCA de out/2026 (0,30%), nov/2026 (0,25%); SELIC de out/2026 (0,58%)" */
function listarPorSerie(indices: IndiceUsado[]): string {
  const ordenados = [...indices].sort(compararSerieECompetencia);
  const grupos: string[] = [];
  for (const serie of SERIES_EM_ORDEM_NUMERICA) {
    const meses = ordenados
      .filter((indice) => indice.serie === serie)
      .map(
        (indice) =>
          `${formatarCompetencia(indice.competencia)} (${formatarValorDoIndice(serie, indice.valor)})`,
      );
    if (meses.length > 0) grupos.push(`${NOME_DA_SERIE[serie]} de ${meses.join(", ")}`);
  }
  return grupos.join("; ");
}

/**
 * Compara os índices usados por um cálculo salvo (`anterior`) com os do recálculo (`atual`), por
 * série e competência (D6), e devolve as frases para a tela, nesta ordem: índices que mudaram de
 * valor (uma frase por série e mês); salário mínimo que passou a ser usado no lugar do último
 * publicado de antes (uma frase por mês novo); índices que entraram (uma frase, agrupada por
 * série); índices que saíram (uma frase). Nada mudou → lista vazia. A data citada é a da consulta
 * anterior, no horário de Brasília.
 */
export function compararIndicesUsados(
  anterior: { indicesUsados: IndiceUsado[]; consultadoEm: string },
  atual: { indicesUsados: IndiceUsado[]; consultadoEm: string },
): string[] {
  const data = dataEmBrasilia(anterior.consultadoEm);
  const antes = porChave(anterior.indicesUsados);
  const depois = porChave(atual.indicesUsados);

  const mudaram: Array<{ antes: IndiceUsado; depois: IndiceUsado }> = [];
  const novos: IndiceUsado[] = [];
  for (const [chave, indice] of depois) {
    const anteriorDoMes = antes.get(chave);
    if (anteriorDoMes === undefined) novos.push(indice);
    else if (!mesmoValor(anteriorDoMes.valor, indice.valor)) {
      mudaram.push({ antes: anteriorDoMes, depois: indice });
    }
  }
  const saidos = [...antes.entries()]
    .filter(([chave]) => !depois.has(chave))
    .map(([, indice]) => indice);

  const frases: string[] = [];
  mudaram.sort((a, b) => compararSerieECompetencia(a.depois, b.depois));
  for (const { antes: velho, depois: novo } of mudaram) {
    frases.push(
      `${comMaiuscula(NOME_DA_SERIE[novo.serie])} de ${formatarCompetencia(novo.competencia)} mudou de ${formatarValorDoIndice(novo.serie, velho.valor)} para ${formatarValorDoIndice(novo.serie, novo.valor)} desde a atualização dos índices de ${data}.`,
    );
  }

  // Salário mínimo: o mês novo X que antes era coberto pelo último publicado (o maior mês anterior
  // a X entre os usados antes) ganha frase própria, e esse mês anterior não sai como "saiu".
  const salariosAntes = anterior.indicesUsados
    .filter((indice) => indice.serie === "1619")
    .sort((a, b) => compararCompetencias(a.competencia, b.competencia));
  const pareados = new Set<string>();
  const entraram: IndiceUsado[] = [];
  for (const novo of [...novos].sort(compararSerieECompetencia)) {
    const vigente =
      novo.serie === "1619"
        ? salariosAntes.filter((indice) => indice.competencia < novo.competencia).at(-1)
        : undefined;
    if (vigente === undefined) {
      entraram.push(novo);
      continue;
    }
    pareados.add(chaveDoIndice(vigente));
    frases.push(
      `Salário mínimo de ${formatarCompetencia(novo.competencia)} (${formatarValorDoIndice("1619", novo.valor)}) passou a ser usado; em ${data} valia o último publicado, ${formatarCompetencia(vigente.competencia)} (${formatarValorDoIndice("1619", vigente.valor)}).`,
    );
  }

  if (entraram.length > 0) {
    frases.push(
      `Entraram no cálculo índices obtidos depois de ${data}: ${listarPorSerie(entraram)}.`,
    );
  }
  const sairam = saidos.filter((indice) => !pareados.has(chaveDoIndice(indice)));
  if (sairam.length > 0) {
    frases.push(
      `Índices da atualização de ${data} que não constam mais na tabela: ${listarPorSerie(sairam)}.`,
    );
  }
  return frases;
}
