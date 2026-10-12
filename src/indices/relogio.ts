import { dataValida } from "../compartilhado/datas.ts";
import type { DataISO } from "../compartilhado/tipos.ts";

/**
 * Único lugar de `src/indices` que lê o relógio e converte fusos. Tudo sai no horário de Brasília
 * (decisão D4 de 11/10/2026): o deslocamento vem do `Intl` (Brasília não tem horário de verão
 * desde 2019, mas datas antigas o tiveram), e "-03:00" é só a reserva para um ambiente que não
 * saiba informá-lo. Nenhuma biblioteca de datas.
 */

const FUSO_BRASILIA = "America/Sao_Paulo";
/** Deslocamento de Brasília desde 2019, usado só quando o `Intl` não informa o seu. */
const DESLOCAMENTO_RESERVA = "-03:00";
const MILISSEGUNDOS_DA_RESERVA = -3 * 60 * 60 * 1000;

/** Só data-hora ISO completa, com "Z" ou deslocamento; sem fuso não há como converter. */
const FORMATO_ISO_DATA_HORA =
  /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

interface PartesBrasilia {
  ano: string;
  mes: string;
  dia: string;
  hora: string;
  minuto: string;
  segundo: string;
  /** "-03:00" (ou "-02:00" nos verões antigos) */
  deslocamento: string;
}

function doisDigitos(valor: number): string {
  return String(valor).padStart(2, "0");
}

/** Lê as partes pelo `Intl`; `comDeslocamento` pede também o "GMT-03:00" (`longOffset`). */
function partesPeloIntl(instante: Date, comDeslocamento: boolean): PartesBrasilia {
  const formatador = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO_BRASILIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    ...(comDeslocamento ? { timeZoneName: "longOffset" as const } : {}),
  });
  const partes = new Map<string, string>();
  for (const { type, value } of formatador.formatToParts(instante)) partes.set(type, value);
  const deslocamento =
    /^GMT([+-]\d{2}:\d{2})$/.exec(partes.get("timeZoneName") ?? "")?.[1] ?? DESLOCAMENTO_RESERVA;
  return {
    ano: partes.get("year") ?? "",
    mes: partes.get("month") ?? "",
    dia: partes.get("day") ?? "",
    hora: partes.get("hour") ?? "",
    minuto: partes.get("minute") ?? "",
    segundo: partes.get("second") ?? "",
    deslocamento,
  };
}

/** Reserva para um `Intl` que nem conheça o fuso: aritmética com UTC−3 fixo. */
function partesPelaReserva(instante: Date): PartesBrasilia {
  const deslocado = new Date(instante.getTime() + MILISSEGUNDOS_DA_RESERVA);
  return {
    ano: String(deslocado.getUTCFullYear()).padStart(4, "0"),
    mes: doisDigitos(deslocado.getUTCMonth() + 1),
    dia: doisDigitos(deslocado.getUTCDate()),
    hora: doisDigitos(deslocado.getUTCHours()),
    minuto: doisDigitos(deslocado.getUTCMinutes()),
    segundo: doisDigitos(deslocado.getUTCSeconds()),
    deslocamento: DESLOCAMENTO_RESERVA,
  };
}

function partesEmBrasilia(instante: Date): PartesBrasilia {
  if (Number.isNaN(instante.getTime())) {
    throw new Error("Instante inválido: não há como convertê-lo para o horário de Brasília.");
  }
  try {
    return partesPeloIntl(instante, true);
  } catch {
    try {
      return partesPeloIntl(instante, false);
    } catch {
      return partesPelaReserva(instante);
    }
  }
}

/** Data-hora ISO em Brasília, segundos inteiros, sem milissegundos: "2026-10-11T14:02:00-03:00". */
export function agoraEmBrasilia(instante: Date = new Date()): string {
  const p = partesEmBrasilia(instante);
  return `${p.ano}-${p.mes}-${p.dia}T${p.hora}:${p.minuto}:${p.segundo}${p.deslocamento}`;
}

/** Data de hoje em Brasília: "2026-10-11". */
export function hojeEmBrasilia(instante: Date = new Date()): DataISO {
  const p = partesEmBrasilia(instante);
  return `${p.ano}-${p.mes}-${p.dia}`;
}

/** Milissegundos desde a época para um ISO de data-hora com fuso; nulo para qualquer outro texto. */
function instanteDe(iso: string): number | null {
  if (!FORMATO_ISO_DATA_HORA.test(iso)) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Compara duas datas-hora ISO pelo instante que designam (negativo, zero ou positivo), e não pelo
 * texto: "2026-10-11T23:11:55.140Z" (UTC, como nos arquivos anteriores à fase 4) é ANTERIOR a
 * "2026-10-11T20:30:00-03:00" (Brasília), embora venha depois na ordem alfabética. É a comparação
 * que acha a obtenção mais recente entre arquivos gravados em fusos diferentes. Texto que não seja ISO de
 * data-hora com fuso cai na comparação textual, para nunca lançar.
 */
export function compararInstantes(a: string, b: string): number {
  const ia = instanteDe(a);
  const ib = instanteDe(b);
  if (ia !== null && ib !== null) return ia === ib ? 0 : ia < ib ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Data ("2026-10-31") e hora ("22:30") em Brasília de qualquer ISO de data-hora com "Z" ou
 * deslocamento; null para texto que não seja ISO válido (ou sem fuso). É a base de quem precisa
 * do dia ou do mês em Brasília (o mês parcial da SELIC na rotina, o dia de uma execução no
 * relatório) sem depender do formato de tela.
 */
export function dataHoraEmBrasilia(iso: string): { data: DataISO; hora: string } | null {
  const partes = FORMATO_ISO_DATA_HORA.exec(iso);
  if (!partes || !dataValida(partes[1] ?? "")) return null;
  const instante = new Date(iso);
  if (Number.isNaN(instante.getTime())) return null;
  const p = partesEmBrasilia(instante);
  return { data: `${p.ano}-${p.mes}-${p.dia}`, hora: `${p.hora}:${p.minuto}` };
}

/**
 * "11/10/2026 14:02" em Brasília, a partir de qualquer ISO de data-hora com "Z" ou deslocamento.
 * Texto que não seja ISO válido (ou sem fuso) volta como veio, para a tela nunca quebrar.
 */
export function formatarDataHoraBrasilia(iso: string): string {
  const emBrasilia = dataHoraEmBrasilia(iso);
  if (emBrasilia === null) return iso;
  const [ano, mes, dia] = emBrasilia.data.split("-");
  return `${dia ?? ""}/${mes ?? ""}/${ano ?? ""} ${emBrasilia.hora}`;
}
