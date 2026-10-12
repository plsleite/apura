import { describe, expect, it } from "vitest";
import { diaSeguinte } from "../compartilhado/datas.ts";
import {
  RODADAS,
  horarioAgendado,
  lerAtualizacoes,
  lerExecucoes,
  montarRelatorio,
  rodadaDoTitulo,
} from "./relatorio.ts";
import type { AtualizacaoRegistrada, ExecucaoDaRotina, Rodada } from "./relatorio.ts";
import textoDasExecucoes from "./testes/execucoes-rotina.json?raw";

/**
 * A fixture sintética `testes/execucoes-rotina.json` tem o formato da API do GitHub (lista de
 * workflow_run, da mais recente para a mais antiga) e descreve out/2026 (22 dias úteis):
 * - 10h47: todos os dias úteis criada 12 min depois, menos 13/10 (sem execução) e 20/10
 *   (cancelada, 40 min depois);
 * - 14h17: 8 min depois, menos 13/10 (falha, 25 min depois) e 20/10 (sem execução);
 * - 22h47: sem execução em 13/10 e 20/10; dos 20 dias restantes, os 10 primeiros com 30 min, os 9
 *   seguintes com 50 min e 30/10 com 95 min (criada às 00h22 de sábado, 31/10); a de 09/10 é uma
 *   reexecução (tentativa 2, reiniciada em 10/10);
 * - uma manual em 14/10 às 12h05; fora do mês: 22h47 de 30/09 criada às 00h30 de 01/10 em Brasília
 *   (conta em setembro, 103 min de atraso), manual às 23h de 30/09 (02h de 01/10 UTC) e 10h47 de
 *   02/11; uma com o título antigo, sem rodada.
 * Duração (início → última atualização): sucesso 70 s, falha 185 s, cancelada 30 s, manual 95 s.
 */
const execucoesDaFixture = (): unknown => JSON.parse(textoDasExecucoes) as unknown;

const SEPARADOR_DE_CAMPO = "\x1f";
const SEPARADOR_DE_REGISTRO = "\x1e";

/** Um registro como `git log --format=%cI%x1f%s%x1f%b%x1e` o escreve (com a quebra de linha final). */
function registroDoGitLog(em: string, titulo: string, corpo: string): string {
  return `${em}${SEPARADOR_DE_CAMPO}${titulo}${SEPARADOR_DE_CAMPO}${corpo}${SEPARADOR_DE_REGISTRO}\n`;
}

/** Git log sintético, do mais recente para o mais antigo: três commits da rotina (um sem rodada) e um alheio. */
const GIT_LOG = [
  registroDoGitLog(
    "2026-10-09T14:27:40-03:00",
    "indices: séries do BCB em 09/10/2026 14:27 (rodada 14h17)",
    [
      "433 (IPCA): 562 meses, último 2026-09 = 0.48",
      "188 (INPC): sem mudança; 561 meses, último 2026-08 = 0.20",
      "Atenção: na série 433 mudou 1 valor já publicado: 2026-08 de 0.80 para 0.82.",
      "",
      "Execução: https://github.com/exemplo/apura/actions/runs/9100026000",
      "",
    ].join("\n"),
  ),
  registroDoGitLog("2026-10-06T09:00:00-03:00", "docs: ajuste no roteiro", "Corpo qualquer.\n"),
  registroDoGitLog(
    "2026-10-05T11:01:15-03:00",
    "indices: séries do BCB em 05/10/2026 11:01 (rodada 10h47)",
    [
      "4390 (SELIC): 489 meses, último 2026-10 = 0.10",
      "SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.05 para 0.10.",
      "Ainda não disponível no BCB: IPCA de set/2026 (divulgação prevista por volta de 10/10/2026).",
      "",
      "Execução: https://github.com/exemplo/apura/actions/runs/9100010000",
      "",
    ].join("\n"),
  ),
  registroDoGitLog("2026-09-12T09:01:00-03:00", "indices: séries do BCB em 12/09/2026", ""),
].join("");

let proximoId = 1;

/** Execução montada à mão (por padrão, manual, bem-sucedida e sem horários de início e fim). */
function execucao(campos: Partial<ExecucaoDaRotina> & { criadaEm: string }): ExecucaoDaRotina {
  proximoId += 1;
  return {
    id: proximoId,
    titulo: "Atualizar índices · manual",
    evento: "workflow_dispatch",
    conclusao: "success",
    iniciadaEm: null,
    atualizadaEm: null,
    tentativa: 1,
    ...campos,
  };
}

function doisDigitos(valor: number): string {
  return String(valor).padStart(2, "0");
}

/** Execução agendada da rodada no dia, criada `atrasoS` segundos depois do horário de Brasília. */
function agendada(
  rodada: Rodada,
  data: string,
  atrasoS: number,
  campos: Partial<ExecucaoDaRotina> = {},
): ExecucaoDaRotina {
  const { hora, minuto, cron } = RODADAS[rodada];
  let segundos = hora * 3600 + minuto * 60 + atrasoS;
  let dia = data;
  while (segundos >= 86400) {
    segundos -= 86400;
    dia = diaSeguinte(dia);
  }
  const criadaEm = `${dia}T${doisDigitos(Math.floor(segundos / 3600))}:${doisDigitos(Math.floor(segundos / 60) % 60)}:${doisDigitos(segundos % 60)}-03:00`;
  return execucao({
    titulo: `Atualizar índices · ${cron}`,
    evento: "schedule",
    criadaEm,
    ...campos,
  });
}

/** Os 20 dias úteis de fev/2027 (1º de fevereiro de 2027 é segunda-feira). */
const DIAS_UTEIS_FEV_2027 = [
  1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26,
].map((dia) => `2027-02-${doisDigitos(dia)}`);

/** As três rodadas em todos os dias úteis de fev/2027, bem-sucedidas, criadas `atrasoS` depois. */
function fevereiroCompleto(atrasoS: number): ExecucaoDaRotina[] {
  return DIAS_UTEIS_FEV_2027.flatMap((dia) =>
    (["10h47", "14h17", "22h47"] as const).map((rodada) => agendada(rodada, dia, atrasoS)),
  );
}

describe("RODADAS", () => {
  it("traz o horário e a linha de cron de cada rodada, de segunda a sexta", () => {
    expect(RODADAS).toEqual({
      "10h47": { hora: 10, minuto: 47, cron: "47 10 * * 1-5" },
      "14h17": { hora: 14, minuto: 17, cron: "17 14 * * 1-5" },
      "22h47": { hora: 22, minuto: 47, cron: "47 22 * * 1-5" },
    });
  });
});

describe("lerExecucoes", () => {
  it("lê a lista de workflow_run da API do GitHub, com os campos traduzidos", () => {
    const execucoes = lerExecucoes(execucoesDaFixture());
    expect(execucoes).toHaveLength(67);
    expect(execucoes[0]).toEqual({
      id: 9100067000,
      titulo: "Atualizar índices · 47 10 * * 1-5",
      evento: "schedule",
      conclusao: "success",
      criadaEm: "2026-11-02T13:59:00Z",
      iniciadaEm: "2026-11-02T13:59:00Z",
      atualizadaEm: "2026-11-02T14:00:10Z",
      tentativa: 1,
    });
    expect(execucoes.find((e) => e.tentativa === 2)).toEqual({
      id: 9100024000,
      titulo: "Atualizar índices · 47 22 * * 1-5",
      evento: "schedule",
      conclusao: "success",
      criadaEm: "2026-10-10T02:17:00Z",
      iniciadaEm: "2026-10-10T12:00:00Z",
      atualizadaEm: "2026-10-10T12:01:10Z",
      tentativa: 2,
    });
  });

  it("aceita também o objeto da API, com a lista em workflow_runs", () => {
    const lista = execucoesDaFixture();
    expect(lerExecucoes({ total_count: 67, workflow_runs: lista })).toEqual(lerExecucoes(lista));
  });

  it("devolve lista vazia para o que não é lista nem objeto com workflow_runs", () => {
    for (const dado of [null, undefined, 42, "texto", {}, { workflow_runs: "x" }, { runs: [] }]) {
      expect(lerExecucoes(dado)).toEqual([]);
    }
  });

  it("aceita conclusão e horários nulos ou ausentes, e tentativa ausente como 1", () => {
    expect(
      lerExecucoes([
        {
          id: 7,
          display_title: "Atualizar índices · manual",
          event: "workflow_dispatch",
          conclusion: null,
          created_at: "2026-10-14T12:05:00-03:00",
          run_started_at: null,
          updated_at: null,
          run_attempt: 3,
        },
        {
          id: 8,
          display_title: "Atualizar índices · manual",
          event: "workflow_dispatch",
          created_at: "2026-10-14T15:05:00.250Z",
        },
      ]),
    ).toEqual([
      {
        id: 7,
        titulo: "Atualizar índices · manual",
        evento: "workflow_dispatch",
        conclusao: null,
        criadaEm: "2026-10-14T12:05:00-03:00",
        iniciadaEm: null,
        atualizadaEm: null,
        tentativa: 3,
      },
      {
        id: 8,
        titulo: "Atualizar índices · manual",
        evento: "workflow_dispatch",
        conclusao: null,
        criadaEm: "2026-10-14T15:05:00.250Z",
        iniciadaEm: null,
        atualizadaEm: null,
        tentativa: 1,
      },
    ]);
  });

  it("ignora os itens malformados e mantém os bons, na ordem", () => {
    const bom = {
      id: 1,
      display_title: "Atualizar índices · 47 10 * * 1-5",
      event: "schedule",
      conclusion: "success",
      created_at: "2026-10-14T13:59:00Z",
      run_started_at: "2026-10-14T13:59:00Z",
      updated_at: "2026-10-14T14:00:10Z",
      run_attempt: 1,
    };
    const malformados: unknown[] = [
      null,
      42,
      "execução",
      [bom],
      {},
      { ...bom, id: undefined },
      { ...bom, id: "1" },
      { ...bom, id: 1.5 },
      { ...bom, id: 0 },
      { ...bom, display_title: undefined },
      { ...bom, display_title: 5 },
      { ...bom, event: undefined },
      { ...bom, conclusion: 7 },
      { ...bom, created_at: undefined },
      { ...bom, created_at: "ontem" },
      { ...bom, created_at: "2026-10-14T13:59:00" },
      { ...bom, created_at: "2026-02-30T13:59:00Z" },
      { ...bom, run_started_at: "logo" },
      { ...bom, updated_at: 5 },
      { ...bom, run_attempt: 0 },
      { ...bom, run_attempt: "2" },
      { ...bom, run_attempt: 1.5 },
    ];
    const lidas = lerExecucoes([...malformados, bom, { ...bom, id: 2 }]);
    expect(lidas.map((e) => e.id)).toEqual([1, 2]);
  });
});

describe("rodadaDoTitulo", () => {
  it("reconhece as três rodadas pelo cron do título", () => {
    expect(rodadaDoTitulo("Atualizar índices · 47 10 * * 1-5")).toBe("10h47");
    expect(rodadaDoTitulo("Atualizar índices · 17 14 * * 1-5")).toBe("14h17");
    expect(rodadaDoTitulo("Atualizar índices · 47 22 * * 1-5")).toBe("22h47");
  });

  it("reconhece a execução manual", () => {
    expect(rodadaDoTitulo("Atualizar índices · manual")).toBe("manual");
  });

  it("tolera espaços a mais em volta do cron e entre os seus campos", () => {
    expect(rodadaDoTitulo("Atualizar índices ·  47 10  * * 1-5 ")).toBe("10h47");
    expect(rodadaDoTitulo("Atualizar índices ·  manual ")).toBe("manual");
  });

  it("devolve null para qualquer outro título", () => {
    for (const titulo of [
      "",
      "Atualizar índices do BCB",
      "Atualizar índices · ",
      "Atualizar índices · 0 12 12 * *",
      "Atualizar índices · 47 10 * * *",
      "Atualizar índices · Manual",
      "Relatório da rotina de índices",
      "47 10 * * 1-5",
    ]) {
      expect(rodadaDoTitulo(titulo)).toBeNull();
    }
  });
});

describe("horarioAgendado", () => {
  it("no mesmo dia, quando a execução foi criada depois do horário", () => {
    expect(horarioAgendado("10h47", "2026-10-14T13:59:00Z")).toBe("2026-10-14T10:47:00-03:00");
    expect(horarioAgendado("10h47", "2026-10-14T13:59:00+00:00")).toBe("2026-10-14T10:47:00-03:00");
    expect(horarioAgendado("14h17", "2026-10-14T14:25:00-03:00")).toBe("2026-10-14T14:17:00-03:00");
  });

  it("no próprio minuto agendado conta o mesmo dia; um segundo antes, o dia útil anterior", () => {
    expect(horarioAgendado("10h47", "2026-10-14T13:47:00Z")).toBe("2026-10-14T10:47:00-03:00");
    expect(horarioAgendado("10h47", "2026-10-14T13:46:59Z")).toBe("2026-10-13T10:47:00-03:00");
  });

  it("depois da meia-noite, volta ao dia anterior", () => {
    expect(horarioAgendado("22h47", "2026-10-15T03:10:00Z")).toBe("2026-10-14T22:47:00-03:00");
  });

  it("de sexta para sábado, fica na sexta", () => {
    expect(horarioAgendado("22h47", "2026-10-17T03:30:00Z")).toBe("2026-10-16T22:47:00-03:00");
  });

  it("na segunda cedo, e no fim de semana, volta à sexta", () => {
    expect(horarioAgendado("10h47", "2026-10-19T12:00:00Z")).toBe("2026-10-16T10:47:00-03:00");
    expect(horarioAgendado("22h47", "2026-10-19T05:00:00Z")).toBe("2026-10-16T22:47:00-03:00");
    expect(horarioAgendado("14h17", "2026-10-18T18:00:00Z")).toBe("2026-10-16T14:17:00-03:00");
    expect(horarioAgendado("14h17", "2026-10-17T18:00:00Z")).toBe("2026-10-16T14:17:00-03:00");
  });

  it("atravessa a virada do mês pelo horário de Brasília, não pelo UTC", () => {
    expect(horarioAgendado("22h47", "2026-10-01T02:17:00Z")).toBe("2026-09-30T22:47:00-03:00");
    expect(horarioAgendado("22h47", "2026-10-01T03:30:00Z")).toBe("2026-09-30T22:47:00-03:00");
    expect(horarioAgendado("22h47", "2026-10-31T03:22:00Z")).toBe("2026-10-30T22:47:00-03:00");
  });

  it("recusa, com frase completa, o que não é data-hora ISO com fuso", () => {
    expect(() => horarioAgendado("10h47", "2026-10-14 13:59")).toThrow(
      "A data-hora 2026-10-14 13:59 não é ISO com fuso; não há como achar o horário agendado.",
    );
  });
});

describe("lerAtualizacoes", () => {
  it("pega só os commits da rotina, com a rodada e as linhas do corpo", () => {
    expect(lerAtualizacoes(GIT_LOG)).toEqual<AtualizacaoRegistrada[]>([
      {
        em: "2026-10-09T14:27:40-03:00",
        rodada: "14h17",
        linhas: [
          "433 (IPCA): 562 meses, último 2026-09 = 0.48",
          "188 (INPC): sem mudança; 561 meses, último 2026-08 = 0.20",
          "Atenção: na série 433 mudou 1 valor já publicado: 2026-08 de 0.80 para 0.82.",
        ],
      },
      {
        em: "2026-10-05T11:01:15-03:00",
        rodada: "10h47",
        linhas: [
          "4390 (SELIC): 489 meses, último 2026-10 = 0.10",
          "SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.05 para 0.10.",
          "Ainda não disponível no BCB: IPCA de set/2026 (divulgação prevista por volta de 10/10/2026).",
        ],
      },
      { em: "2026-09-12T09:01:00-03:00", rodada: "", linhas: [] },
    ]);
  });

  it("aceita quebras de linha do Windows e ignora registros incompletos ou com data inválida", () => {
    const texto = [
      registroDoGitLog(
        "2026-10-20T10:59:00-03:00",
        "indices: séries do BCB em 20/10/2026 10:59 (rodada manual)",
        "189 (IGP-M): 448 meses, último 2026-09 = 0.42\r\n\r\nExecução: https://exemplo/1\r\n",
      ),
      "2026-10-21T10:59:00-03:00\x1findices: séries do BCB em 21/10/2026\x1e\n",
      registroDoGitLog("ontem", "indices: séries do BCB em 22/10/2026 (rodada 10h47)", "x\n"),
    ].join("");
    expect(lerAtualizacoes(texto)).toEqual([
      {
        em: "2026-10-20T10:59:00-03:00",
        rodada: "manual",
        linhas: ["189 (IGP-M): 448 meses, último 2026-09 = 0.42"],
      },
    ]);
  });

  it("devolve lista vazia para um histórico vazio", () => {
    expect(lerAtualizacoes("")).toEqual([]);
    expect(lerAtualizacoes("\n")).toEqual([]);
  });
});

describe("montarRelatorio", () => {
  it("monta o relatório de out/2026 a partir das execuções e do git log", () => {
    const relatorio = montarRelatorio(
      "2026-10",
      lerExecucoes(execucoesDaFixture()),
      lerAtualizacoes(GIT_LOG),
    );
    expect(relatorio).toBe(
      [
        "# Monitoramento da rotina de índices · out/2026",
        "",
        'Execuções do workflow "Atualizar índices do BCB" no GitHub Actions e atualizações dos índices gravadas no repositório. Datas e horas no horário de Brasília; minutos inteiros.',
        "",
        "## Agenda do mês",
        "",
        "- Dias úteis: 22 (segunda a sexta-feira; os feriados não são descontados).",
        "- Rodadas agendadas em cada dia útil: 10h47, 14h17 e 22h47.",
        "",
        "## Execuções agendadas",
        "",
        "| Rodada | Previstas | Realizadas | Com sucesso | Com falha | Canceladas | Atraso de início (mediana) | Atraso de início (máximo) |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
        "| 10h47 | 22 | 21 | 20 | 0 | 1 | 12 min | 40 min |",
        "| 14h17 | 22 | 21 | 20 | 1 | 0 | 8 min | 25 min |",
        "| 22h47 | 22 | 20 | 20 | 0 | 0 | 40 min | 95 min |",
        "| Todas | 66 | 62 | 60 | 1 | 1 | 12 min | 95 min |",
        "",
        "- Cada execução conta no mês do seu horário agendado, mesmo quando o GitHub a cria depois da meia-noite.",
        "- O atraso de início vai do horário agendado até a criação da execução pelo GitHub.",
        "- Com falha: qualquer conclusão que não seja sucesso nem cancelamento.",
        "- Canceladas: pela fila do GitHub (uma execução mais nova tomou o lugar da que esperava), à mão ou pelo próprio GitHub ao passar do tempo-limite da execução; a página da execução diz qual foi.",
        "- Reexecuções (2ª tentativa em diante), que não contam como execução nova: 1.",
        "- Execuções sem rodada reconhecível no título, deixadas fora das contas: 1.",
        "",
        "## Execuções manuais",
        "",
        "Execuções manuais no mês: 1.",
        "",
        "- 14/10/2026 12:05 · sucesso",
        "",
        "## Dias úteis sem nenhuma execução bem-sucedida",
        "",
        "É, aproximadamente, o que o alarme de silêncio do Healthchecks acusa (uma falha só do deploy hook conta aqui como falha, mas não suprime o sinal).",
        "",
        "- 13/10/2026",
        "- 20/10/2026",
        "",
        "## Atualizações gravadas",
        "",
        "### 05/10/2026 11:01 · rodada 10h47",
        "",
        "- 4390 (SELIC): 489 meses, último 2026-10 = 0.10",
        "- SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.05 para 0.10.",
        "- Ainda não disponível no BCB: IPCA de set/2026 (divulgação prevista por volta de 10/10/2026).",
        "",
        "### 09/10/2026 14:27 · rodada 14h17",
        "",
        "- 433 (IPCA): 562 meses, último 2026-09 = 0.48",
        "",
        "## Revisões de valores já publicados",
        "",
        "- 09/10/2026 14:27 · rodada 14h17 · Atenção: na série 433 mudou 1 valor já publicado: 2026-08 de 0.80 para 0.82.",
        "",
        "## Estimativas",
        "",
        "- Minutos de execução no GitHub Actions: 127 (estimativa: em cada execução, os minutos iniciados entre o início e a última atualização; nas reexecuções, só a última tentativa).",
        "- Publicações do site: 2 (uma por atualização gravada).",
        "",
        "## Referências",
        "",
        "- Nenhum dia útil sem rodada bem-sucedida: não cumprida (2 dias).",
        "- Atraso típico de início até 1 hora: cumprida (mediana geral 12 min).",
        "",
        "Ajustes de horário ou de agendador só com o responsável.",
        "",
      ].join("\n"),
    );
  });

  it("conta pelo horário agendado na virada do mês e credita o dia agendado", () => {
    // A 22h47 de 30/09 foi criada às 00h30 de 01/10 em Brasília: conta em setembro, no dia 30/09.
    const setembro = montarRelatorio("2026-09", lerExecucoes(execucoesDaFixture()), []);
    expect(setembro).toContain("| 22h47 | 22 | 1 | 1 | 0 | 0 | 103 min | 103 min |\n");
    expect(setembro).toContain("| Todas | 66 | 1 | 1 | 0 | 0 | 103 min | 103 min |\n");
    expect(setembro).toContain("Execuções manuais no mês: 1.\n\n- 30/09/2026 23:00 · sucesso\n");
    expect(setembro).toContain("- 29/09/2026\n\n## Atualizações gravadas");
    expect(setembro).not.toContain("- 30/09/2026\n");
    // Sexta-feira: 10h47 com falha, 14h17 ausente e 22h47 bem-sucedida criada às 00h30 de sábado.
    const sexta = montarRelatorio(
      "2027-02",
      [
        agendada("10h47", "2027-02-26", 5 * 60, { conclusao: "failure" }),
        agendada("22h47", "2027-02-26", 103 * 60),
      ],
      [],
    );
    expect(sexta).toContain("| 22h47 | 20 | 1 | 1 | 0 | 0 | 103 min | 103 min |\n");
    expect(sexta).toContain("- 25/02/2027\n\n## Atualizações gravadas");
    expect(sexta).not.toContain("- 26/02/2027\n");
  });

  it("num mês sem execuções nem atualizações, diz isso em cada seção", () => {
    const relatorio = montarRelatorio("2026-11", [], []);
    expect(relatorio).toContain("# Monitoramento da rotina de índices · nov/2026\n");
    expect(relatorio).toContain("- Dias úteis: 21 (segunda a sexta-feira;");
    expect(relatorio).toContain("| 10h47 | 21 | 0 | 0 | 0 | 0 | — | — |\n");
    expect(relatorio).toContain("| Todas | 63 | 0 | 0 | 0 | 0 | — | — |\n");
    expect(relatorio).toContain(
      "- Reexecuções (2ª tentativa em diante), que não contam como execução nova: 0.\n",
    );
    expect(relatorio).not.toContain("sem rodada reconhecível");
    expect(relatorio).toContain("Execuções manuais no mês: 0.\n\n## Dias úteis");
    expect(relatorio).toContain("- 02/11/2026\n");
    expect(relatorio).toContain("- 30/11/2026\n");
    expect(relatorio).toContain(
      "## Atualizações gravadas\n\nNenhuma atualização gravada no mês.\n",
    );
    expect(relatorio).toContain(
      "## Revisões de valores já publicados\n\nNenhuma revisão de valor já publicado no mês.\n",
    );
    expect(relatorio).toContain("- Minutos de execução no GitHub Actions: 0 (estimativa:");
    expect(relatorio).toContain("- Publicações do site: 0 (uma por atualização gravada).");
    expect(relatorio).toContain(
      "- Nenhum dia útil sem rodada bem-sucedida: não cumprida (21 dias).",
    );
    expect(relatorio).toContain(
      "- Atraso típico de início até 1 hora: sem dados (nenhuma execução agendada no mês).",
    );
  });

  it("com todas as rodadas bem-sucedidas e pouco atraso, cumpre as duas referências", () => {
    const relatorio = montarRelatorio("2027-02", fevereiroCompleto(5 * 60), []);
    expect(relatorio).toContain("- Dias úteis: 20 (segunda a sexta-feira;");
    expect(relatorio).toContain("| 22h47 | 20 | 20 | 20 | 0 | 0 | 5 min | 5 min |\n");
    expect(relatorio).toContain("| Todas | 60 | 60 | 60 | 0 | 0 | 5 min | 5 min |\n");
    expect(relatorio).toContain(
      "## Dias úteis sem nenhuma execução bem-sucedida\n\nÉ, aproximadamente, o que o alarme de silêncio do Healthchecks acusa (uma falha só do deploy hook conta aqui como falha, mas não suprime o sinal).\n\nNenhum: todos os dias úteis tiveram ao menos uma execução agendada bem-sucedida.\n",
    );
    expect(relatorio).toContain("- Nenhum dia útil sem rodada bem-sucedida: cumprida (0 dias).");
    expect(relatorio).toContain(
      "- Atraso típico de início até 1 hora: cumprida (mediana geral 5 min).",
    );
  });

  it("um dia útil só com falha e cancelamento basta para não cumprir a referência", () => {
    const execucoes = fevereiroCompleto(5 * 60).map((e) =>
      e.criadaEm.startsWith("2027-02-17T10") ? { ...e, conclusao: "failure" } : e,
    );
    const semSucesso = execucoes
      .filter((e) => e.criadaEm.startsWith("2027-02-17T"))
      .map((e) => (e.conclusao === "success" ? { ...e, conclusao: "cancelled" } : e));
    const outras = execucoes.filter((e) => !e.criadaEm.startsWith("2027-02-17T"));
    const relatorio = montarRelatorio("2027-02", [...outras, ...semSucesso], []);
    expect(relatorio).toContain("| Todas | 60 | 60 | 57 | 1 | 2 | 5 min | 5 min |\n");
    expect(relatorio).toContain("suprime o sinal).\n\n- 17/02/2027\n\n## Atualizações gravadas");
    expect(relatorio).toContain("- Nenhum dia útil sem rodada bem-sucedida: não cumprida (1 dia).");
  });

  it("execução manual bem-sucedida não supre o dia útil sem rodada agendada bem-sucedida", () => {
    const execucoes = fevereiroCompleto(5 * 60).filter(
      (e) => !e.criadaEm.startsWith("2027-02-26T"),
    );
    const manual = execucao({ criadaEm: "2027-02-26T12:00:00-03:00", conclusao: "failure" });
    const outraManual = execucao({ criadaEm: "2027-02-26T15:00:00-03:00" });
    const relatorio = montarRelatorio("2027-02", [...execucoes, manual, outraManual], []);
    expect(relatorio).toContain(
      "Execuções manuais no mês: 2.\n\n- 26/02/2027 12:00 · falha\n- 26/02/2027 15:00 · sucesso\n",
    );
    expect(relatorio).toContain("suprime o sinal).\n\n- 26/02/2027\n\n");
  });

  it("arredonda a mediana e o máximo ao minuto mais próximo (meio minuto para cima)", () => {
    const relatorio = montarRelatorio(
      "2027-02",
      [
        agendada("10h47", "2027-02-01", 10 * 60),
        agendada("10h47", "2027-02-02", 15 * 60),
        agendada("14h17", "2027-02-01", 89),
        agendada("22h47", "2027-02-01", 150),
      ],
      [],
    );
    // 10h47: mediana de 10 e 15 min = 12,5 → 13; 14h17: 1 min 29 s → 1; 22h47: 2 min 30 s → 3.
    expect(relatorio).toContain("| 10h47 | 20 | 2 | 2 | 0 | 0 | 13 min | 15 min |\n");
    expect(relatorio).toContain("| 14h17 | 20 | 1 | 1 | 0 | 0 | 1 min | 1 min |\n");
    expect(relatorio).toContain("| 22h47 | 20 | 1 | 1 | 0 | 0 | 3 min | 3 min |\n");
    // Geral: 89 s, 150 s, 600 s, 900 s → (150 + 600) ÷ 2 = 375 s = 6 min 15 s → 6.
    expect(relatorio).toContain("| Todas | 60 | 4 | 4 | 0 | 0 | 6 min | 15 min |\n");
  });

  it("até 1 hora de mediana a referência é cumprida; de 61 minutos em diante, não", () => {
    const cumprida = montarRelatorio("2027-02", [agendada("10h47", "2027-02-01", 3600 + 29)], []);
    expect(cumprida).toContain(
      "- Atraso típico de início até 1 hora: cumprida (mediana geral 60 min).",
    );
    const naoCumprida = montarRelatorio(
      "2027-02",
      [agendada("10h47", "2027-02-01", 3600 + 30)],
      [],
    );
    expect(naoCumprida).toContain(
      "- Atraso típico de início até 1 hora: não cumprida (mediana geral 61 min).",
    );
  });

  it("conta uma reexecução uma vez só, pela tentativa mais recente, em qualquer ordem", () => {
    const primeira = agendada("14h17", "2027-02-03", 8 * 60, { id: 500, conclusao: "failure" });
    const segunda = { ...primeira, conclusao: "success", tentativa: 2 };
    for (const lista of [
      [primeira, segunda],
      [segunda, primeira],
    ]) {
      const relatorio = montarRelatorio("2027-02", lista, []);
      expect(relatorio).toContain("| 14h17 | 20 | 1 | 1 | 0 | 0 | 8 min | 8 min |\n");
      expect(relatorio).toContain(
        "- Reexecuções (2ª tentativa em diante), que não contam como execução nova: 1.\n",
      );
      expect(relatorio).not.toContain("- 03/02/2027\n");
    }
  });

  it("conta como falha qualquer conclusão que não seja sucesso nem cancelamento", () => {
    const relatorio = montarRelatorio(
      "2027-02",
      [
        agendada("10h47", "2027-02-01", 60, { conclusao: "timed_out" }),
        agendada("14h17", "2027-02-01", 60, { conclusao: "startup_failure" }),
        agendada("22h47", "2027-02-01", 60, { conclusao: null }),
        execucao({ criadaEm: "2027-02-02T09:00:00-03:00", conclusao: "timed_out" }),
        execucao({ criadaEm: "2027-02-02T10:00:00-03:00", conclusao: null }),
        execucao({ criadaEm: "2027-02-02T11:00:00-03:00", conclusao: "neutral" }),
      ],
      [],
    );
    expect(relatorio).toContain("| Todas | 60 | 3 | 0 | 3 | 0 | 1 min | 1 min |\n");
    expect(relatorio).toContain(
      "- 02/02/2027 09:00 · tempo esgotado\n- 02/02/2027 10:00 · sem conclusão\n- 02/02/2027 11:00 · neutral\n",
    );
    expect(relatorio).toContain(
      "- Nenhum dia útil sem rodada bem-sucedida: não cumprida (20 dias).",
    );
  });

  it("execução manual disparada fora da main (skipped): conclusão em português e nenhum minuto na estimativa", () => {
    const relatorio = montarRelatorio(
      "2027-02",
      [
        execucao({
          criadaEm: "2027-02-02T09:00:00-03:00",
          conclusao: "skipped",
          iniciadaEm: "2027-02-02T12:00:00Z",
          atualizadaEm: "2027-02-02T12:00:05Z",
        }),
      ],
      [],
    );
    expect(relatorio).toContain("- 02/02/2027 09:00 · não executada (disparada fora da main)\n");
    expect(relatorio).toContain("- Minutos de execução no GitHub Actions: 0 (estimativa:");
  });

  it("ignora execuções com data de criação inválida, sem lançar", () => {
    const relatorio = montarRelatorio(
      "2027-02",
      [
        execucao({
          titulo: "Atualizar índices · 47 10 * * 1-5",
          evento: "schedule",
          criadaEm: "ontem",
        }),
        execucao({ criadaEm: "2027-02-30T10:00:00Z" }),
      ],
      [],
    );
    expect(relatorio).toContain("| Todas | 60 | 0 | 0 | 0 | 0 | — | — |\n");
    expect(relatorio).toContain("Execuções manuais no mês: 0.\n");
    expect(relatorio).not.toContain("sem rodada reconhecível");
  });

  it("estima os minutos somando, por execução, os minutos iniciados entre o início e o fim", () => {
    const relatorio = montarRelatorio(
      "2027-02",
      [
        // 60 s → 1; 61 s → 2; sem início → 0; fim antes do início → 0; 60,5 s → 2 (as frações de
        // segundo contam); manual de 3 min 1 s → 4.
        agendada("10h47", "2027-02-01", 0, {
          iniciadaEm: "2027-02-01T10:47:00-03:00",
          atualizadaEm: "2027-02-01T13:48:00Z",
        }),
        agendada("14h17", "2027-02-01", 0, {
          iniciadaEm: "2027-02-01T14:17:00-03:00",
          atualizadaEm: "2027-02-01T14:18:01-03:00",
        }),
        agendada("22h47", "2027-02-01", 0, { atualizadaEm: "2027-02-01T22:50:00-03:00" }),
        agendada("10h47", "2027-02-02", 0, {
          iniciadaEm: "2027-02-02T10:50:00-03:00",
          atualizadaEm: "2027-02-02T10:49:00-03:00",
        }),
        agendada("14h17", "2027-02-02", 0, {
          iniciadaEm: "2027-02-02T17:17:00Z",
          atualizadaEm: "2027-02-02T17:18:00.500Z",
        }),
        execucao({
          criadaEm: "2027-02-03T09:00:00-03:00",
          iniciadaEm: "2027-02-03T09:00:00-03:00",
          atualizadaEm: "2027-02-03T09:03:01-03:00",
        }),
        // Fora do mês: não entra na estimativa.
        execucao({
          criadaEm: "2027-03-01T09:00:00-03:00",
          iniciadaEm: "2027-03-01T09:00:00-03:00",
          atualizadaEm: "2027-03-01T09:30:00-03:00",
        }),
      ],
      [],
    );
    expect(relatorio).toContain("- Minutos de execução no GitHub Actions: 9 (estimativa:");
  });

  it("separa as revisões, tira as linhas sem mudança e põe as atualizações em ordem cronológica", () => {
    const atualizacoes: AtualizacaoRegistrada[] = [
      {
        em: "2026-11-01T01:00:00Z",
        rodada: "22h47",
        linhas: [
          "189 (IGP-M): 448 meses, último 2026-10 = 0.42",
          "Atenção: na série 189 mudou 1 valor já publicado: 2026-09 de 0.40 para 0.41.",
        ],
      },
      { em: "2026-10-01T02:30:00Z", rodada: "22h47", linhas: ["433 (IPCA): fora do mês"] },
      {
        em: "2026-10-15T09:00:00-03:00",
        rodada: "",
        linhas: ["188 (INPC): sem mudança; 561 meses, último 2026-09 = 0.30"],
      },
      {
        em: "2026-10-02T10:58:00-03:00",
        rodada: "manual",
        linhas: [
          "Atenção: na série 4390 mudou 1 valor já publicado: 2026-08 de 1.10 para 1.16.",
          "4390 (SELIC): 489 meses, último 2026-10 = 0.10",
        ],
      },
    ];
    const relatorio = montarRelatorio("2026-10", [], atualizacoes);
    expect(relatorio).toContain(
      [
        "## Atualizações gravadas",
        "",
        "### 02/10/2026 10:58 · rodada manual",
        "",
        "- 4390 (SELIC): 489 meses, último 2026-10 = 0.10",
        "",
        "### 15/10/2026 09:00 · rodada não informada",
        "",
        "- Só séries sem mudança.",
        "",
        "### 31/10/2026 22:00 · rodada 22h47",
        "",
        "- 189 (IGP-M): 448 meses, último 2026-10 = 0.42",
        "",
        "## Revisões de valores já publicados",
        "",
        "- 02/10/2026 10:58 · rodada manual · Atenção: na série 4390 mudou 1 valor já publicado: 2026-08 de 1.10 para 1.16.",
        "- 31/10/2026 22:00 · rodada 22h47 · Atenção: na série 189 mudou 1 valor já publicado: 2026-09 de 0.40 para 0.41.",
        "",
      ].join("\n"),
    );
    expect(relatorio).not.toContain("fora do mês");
    expect(relatorio).toContain("- Publicações do site: 3 (uma por atualização gravada).");
  });
});
