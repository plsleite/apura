import {
  competenciaDe,
  dataValida,
  diaAnterior,
  diaSeguinte,
  diasDesdeEpoca,
  primeiroDiaDoMes,
  ultimoDiaDoMes,
} from "../compartilhado/datas.ts";
import { formatarCompetencia, formatarData } from "../compartilhado/formatacao.ts";
import type { Competencia, DataISO } from "../compartilhado/tipos.ts";
import { dataHoraEmBrasilia } from "./relogio.ts";

/**
 * Relatório mensal da rotina central de índices (decisão de 12/10/2026): a partir das execuções
 * do workflow "Atualizar índices do BCB" (API do GitHub) e dos commits da rotina em dados/indices
 * (git log), monta o Markdown gravado em docs/monitoramento/AAAA-MM.md. Módulo puro, testado sem
 * rede: quem lê a API, o git e o disco é scripts/relatorio-indices.ts. Não importa embutidos.ts
 * nem congelar.ts. A conversão de fuso fica em relogio.ts (dataHoraEmBrasilia); aqui só há
 * aritmética de calendário sobre textos ISO, sem objetos Date.
 */

/** As três rodadas diárias da rotina, de segunda a sexta (decisão de 12/10/2026), pelo horário de Brasília. */
export type Rodada = "10h47" | "14h17" | "22h47";

/** Horário e linha de cron de cada rodada; o cron é o que o workflow põe no título da execução. */
export const RODADAS: Record<Rodada, { hora: number; minuto: number; cron: string }> = {
  "10h47": { hora: 10, minuto: 47, cron: "47 10 * * 1-5" },
  "14h17": { hora: 14, minuto: 17, cron: "17 14 * * 1-5" },
  "22h47": { hora: 22, minuto: 47, cron: "47 22 * * 1-5" },
};

const ORDEM_DAS_RODADAS: readonly Rodada[] = ["10h47", "14h17", "22h47"];

/** Início do título da execução (run-name do workflow): "Atualizar índices · <cron ou manual>". */
const PREFIXO_DO_TITULO = "Atualizar índices · ";
/** Início do título dos commits que a rotina grava em dados/indices. */
const PREFIXO_DO_COMMIT = "indices: séries do BCB em";
/** Deslocamento de Brasília desde 2019 (sem horário de verão), usado no horário agendado. */
const DESLOCAMENTO_BRASILIA = "-03:00";
/** Referência de atraso típico de início: até 1 hora. */
const ATRASO_TIPICO_MAXIMO_MIN = 60;

const MS_POR_MINUTO = 60_000;
const MS_POR_DIA = 86_400_000;
const SEPARADOR_DE_CAMPO = "\x1f";
const SEPARADOR_DE_REGISTRO = "\x1e";

/**
 * Argumentos do `git log` que dão o texto lido por lerAtualizacoes: data ISO do commit, título e
 * corpo, separados por \x1f, um registro por \x1e, só dos commits que tocam dados/indices.
 */
export const ARGUMENTOS_DO_GIT_LOG: readonly string[] = [
  "log",
  "--format=%cI%x1f%s%x1f%b%x1e",
  "--",
  "dados/indices",
];

/** Uma execução do workflow da rotina, como a API do GitHub a descreve (workflow_run). */
export interface ExecucaoDaRotina {
  id: number;
  /** display_title: "Atualizar índices · 47 10 * * 1-5" ou "Atualizar índices · manual" */
  titulo: string;
  /** "schedule", "workflow_dispatch"… */
  evento: string;
  /** "success", "failure", "cancelled"…; null enquanto não terminou */
  conclusao: string | null;
  /** ISO com fuso (a API usa UTC, "Z") */
  criadaEm: string;
  iniciadaEm: string | null;
  atualizadaEm: string | null;
  /** run_attempt: 2 em diante é reexecução da mesma execução */
  tentativa: number;
}

/** Um commit da rotina em dados/indices, lido do git log. */
export interface AtualizacaoRegistrada {
  /** ISO do commit (%cI) */
  em: string;
  /** o X de "(rodada X)" no título; vazio quando o título não traz a rodada */
  rodada: string;
  /** corpo do commit (a saída do script), sem linhas vazias e sem a linha "Execução: …" */
  linhas: string[];
}

// ---------------------------------------------------------------------------------------------
// Datas e horas

const FORMATO_ISO_DATA_HORA =
  /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(\.\d+)?)?(?:Z|([+-])([01]\d|2[0-3]):([0-5]\d))$/;

/**
 * Milissegundos desde a época para uma data-hora ISO com "Z" ou deslocamento, sem objetos Date
 * (dias pelo algoritmo civil de datas.ts); null para qualquer outro texto.
 */
function instanteEmMs(iso: string): number | null {
  const partes = FORMATO_ISO_DATA_HORA.exec(iso);
  if (!partes) return null;
  const data = partes[1] ?? "";
  if (!dataValida(data)) return null;
  const segundos = Number(partes[4] ?? "0") + Number(`0${partes[5] ?? ""}`);
  const sinal = partes[6] === "-" ? -1 : 1;
  const deslocamentoMin =
    partes[6] === undefined ? 0 : sinal * (Number(partes[7]) * 60 + Number(partes[8]));
  const minutosDoDia = Number(partes[2]) * 60 + Number(partes[3]) - deslocamentoMin;
  return (
    diasDesdeEpoca(data) * MS_POR_DIA + minutosDoDia * MS_POR_MINUTO + Math.round(segundos * 1000)
  );
}

function ehDataHoraISO(valor: unknown): valor is string {
  return typeof valor === "string" && instanteEmMs(valor) !== null;
}

interface HorarioDeBrasilia {
  data: DataISO;
  hora: number;
  minuto: number;
  /** "14/10/2026 12:05" */
  texto: string;
}

/** Data e hora em Brasília de uma data-hora ISO com fuso (pela conversão de relogio.ts). */
function emBrasilia(iso: string): HorarioDeBrasilia | null {
  if (instanteEmMs(iso) === null) return null;
  const local = dataHoraEmBrasilia(iso);
  if (local === null) return null;
  const [hora = 0, minuto = 0] = local.hora.split(":").map(Number);
  return { data: local.data, hora, minuto, texto: `${formatarData(local.data)} ${local.hora}` };
}

/** 0 = domingo … 6 = sábado (1º/01/1970 foi uma quinta-feira). */
function diaDaSemana(data: DataISO): number {
  return (((diasDesdeEpoca(data) + 4) % 7) + 7) % 7;
}

function diaUtil(data: DataISO): boolean {
  const dia = diaDaSemana(data);
  return dia >= 1 && dia <= 5;
}

/** Dias de segunda a sexta do mês, em ordem (feriados não são descontados). */
function diasUteisDoMes(mes: Competencia): DataISO[] {
  const dias: DataISO[] = [];
  const ultimo = ultimoDiaDoMes(mes);
  for (let dia = primeiroDiaDoMes(mes); dia <= ultimo; dia = diaSeguinte(dia)) {
    if (diaUtil(dia)) dias.push(dia);
  }
  return dias;
}

function doisDigitos(valor: number): string {
  return String(valor).padStart(2, "0");
}

// ---------------------------------------------------------------------------------------------
// Leitura das execuções e do git log

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/** Data-hora opcional: ausente ou nula vira null; texto ISO com fuso fica; o resto é malformado. */
function dataHoraOpcional(valor: unknown): string | null | undefined {
  if (valor === undefined || valor === null) return null;
  return ehDataHoraISO(valor) ? valor : undefined;
}

function lerExecucao(item: unknown): ExecucaoDaRotina | null {
  if (!ehObjeto(item)) return null;
  const {
    id,
    display_title: titulo,
    event: evento,
    conclusion,
    created_at: criadaEm,
    run_started_at,
    updated_at,
    run_attempt,
  } = item;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) return null;
  if (typeof titulo !== "string" || typeof evento !== "string") return null;
  if (conclusion !== undefined && conclusion !== null && typeof conclusion !== "string") {
    return null;
  }
  if (!ehDataHoraISO(criadaEm)) return null;
  const iniciadaEm = dataHoraOpcional(run_started_at);
  const atualizadaEm = dataHoraOpcional(updated_at);
  if (iniciadaEm === undefined || atualizadaEm === undefined) return null;
  const tentativa = run_attempt ?? 1;
  if (typeof tentativa !== "number" || !Number.isSafeInteger(tentativa) || tentativa < 1) {
    return null;
  }
  return {
    id,
    titulo,
    evento,
    conclusao: conclusion ?? null,
    criadaEm,
    iniciadaEm,
    atualizadaEm,
    tentativa,
  };
}

/**
 * Execuções a partir do que a API do GitHub devolve: a lista de workflow_run (como o workflow do
 * relatório a grava) ou o objeto com `workflow_runs`. Item malformado é ignorado: sem id inteiro
 * positivo, sem título ou evento em texto, com conclusão que não seja texto ou nula, sem
 * created_at ISO com fuso, com run_started_at ou updated_at que não sejam ISO com fuso nem nulos,
 * ou com run_attempt que não seja inteiro a partir de 1 (ausente vale 1). Qualquer outro dado
 * devolve lista vazia.
 */
export function lerExecucoes(dado: unknown): ExecucaoDaRotina[] {
  const itens: unknown =
    ehObjeto(dado) && Array.isArray(dado.workflow_runs) ? dado.workflow_runs : dado;
  if (!Array.isArray(itens)) return [];
  const execucoes: ExecucaoDaRotina[] = [];
  for (const item of itens as unknown[]) {
    const execucao = lerExecucao(item);
    if (execucao !== null) execucoes.push(execucao);
  }
  return execucoes;
}

/**
 * Rodada pelo título da execução (run-name do workflow): "Atualizar índices · 47 10 * * 1-5" é a
 * das 10h47, "Atualizar índices · manual" é manual; qualquer outro título é null.
 */
export function rodadaDoTitulo(titulo: string): Rodada | "manual" | null {
  if (!titulo.startsWith(PREFIXO_DO_TITULO)) return null;
  const resto = titulo.slice(PREFIXO_DO_TITULO.length).trim().replace(/\s+/g, " ");
  if (resto === "manual") return "manual";
  return ORDEM_DAS_RODADAS.find((rodada) => RODADAS[rodada].cron === resto) ?? null;
}

/**
 * Horário agendado (ISO com -03:00) da ocorrência mais recente da rodada, num dia de segunda a
 * sexta em Brasília, igual ou anterior a `criadaEm`: a 22h47 criada em 2026-10-17T03:30:00Z
 * (sábado, 00h30 em Brasília) é a de "2026-10-16T22:47:00-03:00". Lança para texto que não seja
 * data-hora ISO com fuso (lerExecucoes já os descarta).
 */
export function horarioAgendado(rodada: Rodada, criadaEm: string): string {
  const local = emBrasilia(criadaEm);
  if (local === null) {
    throw new Error(
      `A data-hora ${criadaEm} não é ISO com fuso; não há como achar o horário agendado.`,
    );
  }
  const { hora, minuto } = RODADAS[rodada];
  let dia =
    local.hora * 60 + local.minuto >= hora * 60 + minuto ? local.data : diaAnterior(local.data);
  while (!diaUtil(dia)) dia = diaAnterior(dia);
  return `${dia}T${doisDigitos(hora)}:${doisDigitos(minuto)}:00${DESLOCAMENTO_BRASILIA}`;
}

/**
 * Commits da rotina a partir do texto de `git` com ARGUMENTOS_DO_GIT_LOG: só os de título
 * iniciado por "indices: séries do BCB em" e data ISO válida, na ordem do log. A rodada
 * vem do "(rodada X)" do título (vazia se não houver); as linhas são o corpo sem linhas vazias e
 * sem a linha "Execução: …".
 */
export function lerAtualizacoes(textoDoGitLog: string): AtualizacaoRegistrada[] {
  const atualizacoes: AtualizacaoRegistrada[] = [];
  for (const registro of textoDoGitLog.split(SEPARADOR_DE_REGISTRO)) {
    const campos = registro.replace(/^\s+/, "").split(SEPARADOR_DE_CAMPO);
    if (campos.length < 3) continue;
    const em = (campos[0] ?? "").trim();
    const titulo = (campos[1] ?? "").trim();
    const corpo = campos.slice(2).join(SEPARADOR_DE_CAMPO);
    if (!ehDataHoraISO(em) || !titulo.startsWith(PREFIXO_DO_COMMIT)) continue;
    const rodada = /\(rodada ([^)]*)\)/.exec(titulo)?.[1]?.trim() ?? "";
    const linhas = corpo
      .split(/\r?\n/)
      .map((linha) => linha.trim())
      .filter((linha) => linha !== "" && !linha.startsWith("Execução:"));
    atualizacoes.push({ em, rodada, linhas });
  }
  return atualizacoes;
}

// ---------------------------------------------------------------------------------------------
// Relatório

interface ExecucaoAgendada {
  execucao: ExecucaoDaRotina;
  /** dia do horário agendado (Brasília) */
  dia: DataISO;
  atrasoMs: number;
}

/** Execução manual ou atualização do mês, com a data-hora em Brasília e o instante para ordenar. */
interface Datada<T> {
  item: T;
  local: HorarioDeBrasilia;
  ms: number;
}

interface ResumoDaRodada {
  rotulo: string;
  previstas: number;
  execucoes: ExecucaoAgendada[];
}

const NOME_DA_CONCLUSAO = new Map<string, string>([
  ["success", "sucesso"],
  ["failure", "falha"],
  ["cancelled", "cancelada"],
  ["timed_out", "tempo esgotado"],
  ["startup_failure", "falha ao iniciar"],
  ["skipped", "não executada (disparada fora da main)"],
]);

function nomeDaConclusao(conclusao: string | null): string {
  if (conclusao === null) return "sem conclusão";
  return NOME_DA_CONCLUSAO.get(conclusao) ?? conclusao;
}

/** "a" · "a e b" · "a, b e c" */
function listar(itens: readonly string[]): string {
  const ultimo = itens.at(-1);
  if (ultimo === undefined) return "";
  const anteriores = itens.slice(0, -1);
  return anteriores.length === 0 ? ultimo : `${anteriores.join(", ")} e ${ultimo}`;
}

function quantosDias(n: number): string {
  return `${n} ${n === 1 ? "dia" : "dias"}`;
}

function mediana(valores: readonly number[]): number | null {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  const centro = ordenados[meio] ?? 0;
  return ordenados.length % 2 === 1 ? centro : ((ordenados[meio - 1] ?? 0) + centro) / 2;
}

/** Minutos inteiros, ao minuto mais próximo (meio minuto para cima). */
function emMinutos(ms: number): number {
  return Math.round(ms / MS_POR_MINUTO);
}

function textoDeMinutos(ms: number | null): string {
  return ms === null ? "—" : `${emMinutos(ms)} min`;
}

/**
 * Minutos iniciados entre o início e a última atualização (0 sem os dois ou com fim anterior). Na
 * reexecução, a API só dá o início da tentativa mais recente: as anteriores ficam de fora.
 */
function minutosDeExecucao(execucao: ExecucaoDaRotina): number {
  if (execucao.iniciadaEm === null || execucao.atualizadaEm === null) return 0;
  const inicio = instanteEmMs(execucao.iniciadaEm);
  const fim = instanteEmMs(execucao.atualizadaEm);
  if (inicio === null || fim === null || fim <= inicio) return 0;
  return Math.ceil((fim - inicio) / MS_POR_MINUTO);
}

/** Uma execução por id, a da tentativa mais recente: reexecução não é execução nova. */
function semRepeticoes(execucoes: readonly ExecucaoDaRotina[]): ExecucaoDaRotina[] {
  const porId = new Map<number, ExecucaoDaRotina>();
  for (const execucao of execucoes) {
    if (instanteEmMs(execucao.criadaEm) === null) continue;
    const anterior = porId.get(execucao.id);
    if (anterior === undefined || execucao.tentativa >= anterior.tentativa) {
      porId.set(execucao.id, execucao);
    }
  }
  return [...porId.values()];
}

function linhaDaTabela(resumo: ResumoDaRodada): string {
  const conclusoes = resumo.execucoes.map(({ execucao }) => execucao.conclusao);
  const sucesso = conclusoes.filter((c) => c === "success").length;
  const canceladas = conclusoes.filter((c) => c === "cancelled").length;
  const falhas = conclusoes.length - sucesso - canceladas;
  const atrasos = resumo.execucoes.map(({ atrasoMs }) => atrasoMs);
  const maximo = atrasos.length === 0 ? null : Math.max(...atrasos);
  const colunas = [
    resumo.rotulo,
    String(resumo.previstas),
    String(conclusoes.length),
    String(sucesso),
    String(falhas),
    String(canceladas),
    textoDeMinutos(mediana(atrasos)),
    textoDeMinutos(maximo),
  ];
  return `| ${colunas.join(" | ")} |`;
}

/**
 * Relatório do mês em Markdown: agenda (dias úteis, sem descontar feriados), execuções agendadas
 * por rodada (previstas, realizadas, com sucesso, com falha, canceladas e atraso de
 * início, mediana e máximo), execuções manuais, dias úteis sem nenhuma execução agendada
 * bem-sucedida (aproximadamente o que o alarme do Healthchecks acusa), atualizações gravadas e revisões em seção
 * própria, estimativas e referências. Uma execução agendada pertence ao mês pelo horário agendado
 * em Brasília; manuais e atualizações, pela data-hora em Brasília. Reexecuções (o mesmo id com
 * tentativa maior) contam uma vez, pela tentativa mais recente; execuções com título sem rodada
 * reconhecível ficam fora das contas (só são contadas). Minutos inteiros: o atraso arredonda ao
 * minuto mais próximo só no fim (mediana e máximo calculados em milissegundos).
 */
export function montarRelatorio(
  mes: Competencia,
  execucoes: ExecucaoDaRotina[],
  atualizacoes: AtualizacaoRegistrada[],
): string {
  const diasUteis = diasUteisDoMes(mes);
  const porRodada = new Map<Rodada, ExecucaoAgendada[]>(
    ORDEM_DAS_RODADAS.map((rodada) => [rodada, []]),
  );
  const manuais: Datada<ExecucaoDaRotina>[] = [];
  let naoReconhecidas = 0;
  let reexecucoes = 0;
  let minutos = 0;

  for (const execucao of semRepeticoes(execucoes)) {
    const criadaMs = instanteEmMs(execucao.criadaEm);
    const local = emBrasilia(execucao.criadaEm);
    if (criadaMs === null || local === null) continue;
    const rodada = rodadaDoTitulo(execucao.titulo);
    if (rodada === null || rodada === "manual") {
      if (competenciaDe(local.data) !== mes) continue;
      if (rodada === null) {
        naoReconhecidas += 1;
        continue;
      }
      manuais.push({ item: execucao, local, ms: criadaMs });
    } else {
      const agendado = horarioAgendado(rodada, execucao.criadaEm);
      if (competenciaDe(agendado) !== mes) continue;
      porRodada.get(rodada)?.push({
        execucao,
        dia: agendado.slice(0, 10),
        atrasoMs: criadaMs - (instanteEmMs(agendado) ?? criadaMs),
      });
    }
    if (execucao.tentativa > 1) reexecucoes += 1;
    if (execucao.conclusao !== "skipped") minutos += minutosDeExecucao(execucao);
  }

  const resumos: ResumoDaRodada[] = ORDEM_DAS_RODADAS.map((rodada) => ({
    rotulo: rodada,
    previstas: diasUteis.length,
    execucoes: porRodada.get(rodada) ?? [],
  }));
  const todas = resumos.flatMap((resumo) => resumo.execucoes);
  const geral: ResumoDaRodada = {
    rotulo: "Todas",
    previstas: diasUteis.length * ORDEM_DAS_RODADAS.length,
    execucoes: todas,
  };
  const diasComSucesso = new Set(
    todas.filter(({ execucao }) => execucao.conclusao === "success").map(({ dia }) => dia),
  );
  const diasSemSucesso = diasUteis.filter((dia) => !diasComSucesso.has(dia));
  const medianaGeral = mediana(todas.map(({ atrasoMs }) => atrasoMs));
  manuais.sort((a, b) => a.ms - b.ms);

  const doMes: Datada<AtualizacaoRegistrada>[] = [];
  for (const atualizacao of atualizacoes) {
    const local = emBrasilia(atualizacao.em);
    const ms = instanteEmMs(atualizacao.em);
    if (local !== null && ms !== null && competenciaDe(local.data) === mes) {
      doMes.push({ item: atualizacao, local, ms });
    }
  }
  doMes.sort((a, b) => a.ms - b.ms);

  const linhas: string[] = [];
  const secao = (titulo: string): void => {
    linhas.push(`## ${titulo}`, "");
  };

  linhas.push(
    `# Monitoramento da rotina de índices · ${formatarCompetencia(mes)}`,
    "",
    'Execuções do workflow "Atualizar índices do BCB" no GitHub Actions e atualizações dos índices gravadas no repositório. Datas e horas no horário de Brasília; minutos inteiros.',
    "",
  );

  secao("Agenda do mês");
  linhas.push(
    `- Dias úteis: ${diasUteis.length} (segunda a sexta-feira; os feriados não são descontados).`,
    `- Rodadas agendadas em cada dia útil: ${listar(ORDEM_DAS_RODADAS)}.`,
    "",
  );

  secao("Execuções agendadas");
  linhas.push(
    "| Rodada | Previstas | Realizadas | Com sucesso | Com falha | Canceladas | Atraso de início (mediana) | Atraso de início (máximo) |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...resumos.map(linhaDaTabela),
    linhaDaTabela(geral),
    "",
    "- Cada execução conta no mês do seu horário agendado, mesmo quando o GitHub a cria depois da meia-noite.",
    "- O atraso de início vai do horário agendado até a criação da execução pelo GitHub.",
    "- Com falha: qualquer conclusão que não seja sucesso nem cancelamento.",
    "- Canceladas: pela fila do GitHub (uma execução mais nova tomou o lugar da que esperava), à mão ou pelo próprio GitHub ao passar do tempo-limite da execução; a página da execução diz qual foi.",
    `- Reexecuções (2ª tentativa em diante), que não contam como execução nova: ${reexecucoes}.`,
  );
  if (naoReconhecidas > 0) {
    linhas.push(
      `- Execuções sem rodada reconhecível no título, deixadas fora das contas: ${naoReconhecidas}.`,
    );
  }
  linhas.push("");

  secao("Execuções manuais");
  linhas.push(`Execuções manuais no mês: ${manuais.length}.`, "");
  if (manuais.length > 0) {
    for (const { item, local } of manuais) {
      linhas.push(`- ${local.texto} · ${nomeDaConclusao(item.conclusao)}`);
    }
    linhas.push("");
  }

  secao("Dias úteis sem nenhuma execução bem-sucedida");
  linhas.push(
    "É, aproximadamente, o que o alarme de silêncio do Healthchecks acusa (uma falha só do deploy hook conta aqui como falha, mas não suprime o sinal).",
    "",
  );
  if (diasSemSucesso.length === 0) {
    linhas.push("Nenhum: todos os dias úteis tiveram ao menos uma execução agendada bem-sucedida.");
  } else {
    for (const dia of diasSemSucesso) linhas.push(`- ${formatarData(dia)}`);
  }
  linhas.push("");

  const rotuloDaRodada = (rodada: string): string =>
    rodada === "" ? "rodada não informada" : `rodada ${rodada}`;
  const revisoes: string[] = [];
  secao("Atualizações gravadas");
  if (doMes.length === 0) linhas.push("Nenhuma atualização gravada no mês.", "");
  for (const { item: atualizacao, local } of doMes) {
    const cabecalho = `${local.texto} · ${rotuloDaRodada(atualizacao.rodada)}`;
    const informativas: string[] = [];
    for (const linha of atualizacao.linhas) {
      if (linha.startsWith("Atenção")) revisoes.push(`- ${cabecalho} · ${linha}`);
      else if (!linha.includes(": sem mudança")) informativas.push(`- ${linha}`);
    }
    linhas.push(`### ${cabecalho}`, "");
    linhas.push(...(informativas.length > 0 ? informativas : ["- Só séries sem mudança."]), "");
  }

  secao("Revisões de valores já publicados");
  if (revisoes.length === 0) linhas.push("Nenhuma revisão de valor já publicado no mês.");
  else linhas.push(...revisoes);
  linhas.push("");

  secao("Estimativas");
  linhas.push(
    `- Minutos de execução no GitHub Actions: ${minutos} (estimativa: em cada execução, os minutos iniciados entre o início e a última atualização; nas reexecuções, só a última tentativa).`,
    `- Publicações do site: ${doMes.length} (uma por atualização gravada).`,
    "",
  );

  secao("Referências");
  const semFalta = diasSemSucesso.length === 0 ? "cumprida" : "não cumprida";
  linhas.push(
    `- Nenhum dia útil sem rodada bem-sucedida: ${semFalta} (${quantosDias(diasSemSucesso.length)}).`,
  );
  if (medianaGeral === null) {
    linhas.push(
      "- Atraso típico de início até 1 hora: sem dados (nenhuma execução agendada no mês).",
    );
  } else {
    const minutosDaMediana = emMinutos(medianaGeral);
    const atrasoOk = minutosDaMediana <= ATRASO_TIPICO_MAXIMO_MIN ? "cumprida" : "não cumprida";
    linhas.push(
      `- Atraso típico de início até 1 hora: ${atrasoOk} (mediana geral ${minutosDaMediana} min).`,
    );
  }
  linhas.push("", "Ajustes de horário ou de agendador só com o responsável.", "");

  return linhas.join("\n");
}
