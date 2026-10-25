// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { ArquivoCalculo } from "../compartilhado/tipos.ts";
import { baseUnica } from "../motor/base.ts";
import { calcular } from "../motor/calcular.ts";
import { gerarLotePrestacoes } from "../motor/lote.ts";
import App from "./App.tsx";
import { montarArquivo, serializarArquivo } from "./arquivo.ts";
import { CHAVE_RECENTES } from "./armazenamento.ts";
import { novoCalculo } from "./estado/calculo.ts";
import { guardarRecente, lerRecentes } from "./recentes.ts";
import {
  ambienteDeTeste,
  AGORA_DE_TESTE,
  armazenamentoEmMemoria,
  armazenamentoQueFalha,
  HOJE_DE_TESTE,
} from "./testes/ambiente-de-teste.ts";

afterEach(cleanup);

/** Um cálculo salvo "em setembro": valor fixo, duas prestações, com o IPCA de set/2026 diferente do atual. */
function arquivoSalvo(): ArquivoCalculo {
  const calculo = novoCalculo({
    id: "salvo-1",
    agora: "2026-09-20T10:00:00-03:00",
    hoje: "2026-09-20",
  });
  calculo.cabecalho.processo = "0800001-31.2026.8.12.0001";
  calculo.cabecalho.exequente = "A. B.";
  calculo.cabecalho.executado = "C. D.";
  calculo.dataElaboracao = HOJE_DE_TESTE;
  calculo.base = baseUnica({
    tipo: "valorFixo",
    valor: "1000.00",
    dataFixacao: "2026-01-10",
    indiceReajuste: "nenhum",
    mesReajuste: 1,
  });
  calculo.lancamentos = gerarLotePrestacoes(
    { diaVencimento: 5, mesesEmAtraso: 2 },
    HOJE_DE_TESTE,
    [],
  ).lancamentos;
  const resultado = calcular(calculo, ambienteDeTeste().congelar().tabela);
  const indicesUsados = resultado.indicesUsados.map((i) =>
    i.serie === "433" && i.competencia === "2026-09" ? { ...i, valor: "0.80" } : i,
  );
  return montarArquivo(calculo, {
    ...resultado,
    indicesUsados,
    consultaIndices: { ...resultado.consultaIndices, em: "2026-09-20T09:00:00-03:00" },
  });
}

function arquivo(texto: string, nome = "calculo.json"): File {
  return new File([texto], nome, { type: "application/json" });
}

describe("Salvar e Abrir (§5.1, §5.5, §9.1)", () => {
  it("'Salvar' baixa apura-<processo>-<data>.json com o cálculo e o resultado", async () => {
    const user = userEvent.setup();
    const ambiente = ambienteDeTeste();
    render(<App ambiente={ambiente} />);
    await user.type(screen.getByLabelText("Nº do processo"), "0800000-46.2026.8.12.0001");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(ambiente.baixados).toHaveLength(1);
    expect(ambiente.baixados[0]?.nome).toBe("apura-0800000-46.2026.8.12.0001-2026-10-11.json");
    const conteudo = JSON.parse(ambiente.baixados[0]?.conteudo ?? "") as ArquivoCalculo;
    expect(conteudo.formato).toBe("apura/calculo@1");
    expect(conteudo.calculo.cabecalho.processo).toBe("0800000-46.2026.8.12.0001");
    expect(conteudo.resultado.consultaIndices.em).toBe("2026-10-11T12:00:00.000Z");
    // número com dígito verificador errado não vai para o cálculo: o arquivo leva o último válido
    const campo = screen.getByLabelText("Nº do processo");
    await user.tripleClick(campo);
    await user.paste("0800000-45.2026.8.12.0001");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(ambiente.baixados[1]?.nome).toBe("apura-0800000-46.2026.8.12.0001-2026-10-11.json");
    // apagar tudo é aceito (cálculo antes de existir processo)
    await user.clear(campo);
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(ambiente.baixados[2]?.nome).toBe("apura-2026-10-11.json");
  });

  it("abre um arquivo salvo, recalcula com os índices de hoje e avisa qual índice usado mudou", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    const painel = within(screen.getByRole("dialog", { name: "Abrir cálculo" }));
    expect(painel.getByText(/Nenhum cálculo recente ainda/)).toBeDefined();
    await user.upload(
      painel.getByLabelText("Abrir arquivo do Apura (.json)"),
      arquivo(serializarArquivo(arquivoSalvo())),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect((screen.getByLabelText("Nº do processo") as HTMLInputElement).value).toBe(
      "0800001-31.2026.8.12.0001",
    );
    expect((screen.getByLabelText("Valor fixado") as HTMLInputElement).value).toBe("1.000,00");
    expect(
      within(screen.getByRole("region", { name: "Prestações" })).getAllByRole("row"),
    ).toHaveLength(4);
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).toContain(
      "IPCA de set/2026 mudou de 0,80% para 0,82% desde a atualização dos índices de 20/09/2026.",
    );
    // editar depois de abrir limpa o aviso? não: ele vale até o próximo "Novo cálculo"
    await user.type(screen.getByLabelText("Exequente (alimentando)"), "!");
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).toContain(
      "IPCA de set/2026 mudou",
    );
    await user.click(screen.getByRole("button", { name: "Novo cálculo" }));
    // o cálculo em branco não tem aviso nenhum: a caixa some (§21.2)
    expect(screen.queryByText(/IPCA de set\/2026 mudou/)).toBeNull();
  });

  it("arquivo inválido: o painel fica aberto com a frase do erro e o cálculo atual não muda", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    await user.type(screen.getByLabelText("Nº do processo"), "0800002-16.2026.8.12.0001");
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    const painel = within(screen.getByRole("dialog", { name: "Abrir cálculo" }));
    await user.upload(painel.getByLabelText("Abrir arquivo do Apura (.json)"), arquivo("{nada"));
    expect(painel.getByRole("alert").textContent).toBe(
      "O arquivo está danificado ou não é um arquivo de cálculo do Apura: não pôde ser lido.",
    );
    const salvo = arquivoSalvo();
    (salvo.calculo as unknown as Record<string, unknown>).dataElaboracao = "ontem";
    await user.upload(
      painel.getByLabelText("Abrir arquivo do Apura (.json)"),
      arquivo(JSON.stringify(salvo)),
    );
    expect(painel.getByRole("alert").textContent).toBe(
      'O arquivo traz um dado inválido em "dataElaboracao" (nome interno do campo, para quem for corrigir o arquivo); o cálculo atual não foi alterado.',
    );
    await user.keyboard("{Escape}");
    expect((screen.getByLabelText("Nº do processo") as HTMLInputElement).value).toBe(
      "0800002-16.2026.8.12.0001",
    );
  });

  it("falha ao ler o arquivo ou ao recalculá-lo: o painel fica aberto com a frase do erro e o cálculo atual não muda", async () => {
    const user = userEvent.setup();
    const ambiente = ambienteDeTeste();
    const congelar = ambiente.congelar;
    let falharAoCongelar = false;
    ambiente.congelar = () => {
      if (falharAoCongelar) throw new Error("falha inesperada no recálculo");
      return congelar();
    };
    render(<App ambiente={ambiente} />);
    await user.type(screen.getByLabelText("Nº do processo"), "0800002-16.2026.8.12.0001");
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    const painel = within(screen.getByRole("dialog", { name: "Abrir cálculo" }));
    const frase =
      "O arquivo está danificado ou não é um arquivo de cálculo do Apura: não pôde ser lido.";
    // o navegador não consegue ler o arquivo (removido, sem permissão)
    const ilegivel = arquivo(serializarArquivo(arquivoSalvo()));
    ilegivel.text = () => Promise.reject(new Error("NotReadableError"));
    await user.upload(painel.getByLabelText("Abrir arquivo do Apura (.json)"), ilegivel);
    expect(painel.getByRole("alert").textContent).toBe(frase);
    expect(
      (painel.getByLabelText("Abrir arquivo do Apura (.json)") as HTMLInputElement).disabled,
    ).toBe(false);
    // o arquivo é válido, mas o recálculo lança um erro
    await user.click(painel.getByRole("button", { name: "Cancelar" }));
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    falharAoCongelar = true;
    await user.upload(
      within(screen.getByRole("dialog")).getByLabelText("Abrir arquivo do Apura (.json)"),
      arquivo(serializarArquivo(arquivoSalvo())),
    );
    expect(within(screen.getByRole("dialog")).getByRole("alert").textContent).toBe(frase);
    // o mesmo com um cálculo recente
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: /^Abrir 0800002-16\.2026\.8\.12\.0001/,
      }),
    );
    expect(within(screen.getByRole("dialog")).getByRole("alert").textContent).toBe(frase);
    falharAoCongelar = false;
    await user.keyboard("{Escape}");
    expect((screen.getByLabelText("Nº do processo") as HTMLInputElement).value).toBe(
      "0800002-16.2026.8.12.0001",
    );
  });

  it("recentes: guardados a cada alteração (não o cálculo em branco), listados por data, abertos, removidos e limpos", async () => {
    const user = userEvent.setup();
    const armazenamento = armazenamentoEmMemoria();
    const ambiente = ambienteDeTeste({ armazenamento });
    render(<App ambiente={ambiente} />);
    expect(lerRecentes(armazenamento)).toEqual([]);
    await user.type(screen.getByLabelText("Nº do processo"), "0800002-16.2026.8.12.0001");
    await user.type(screen.getByLabelText("Exequente (alimentando)"), "Exequente Um");
    expect(lerRecentes(armazenamento).map((r) => [r.processo, r.exequente])).toEqual([
      ["0800002-16.2026.8.12.0001", "Exequente Um"],
    ]);
    await user.click(screen.getByRole("button", { name: "Novo cálculo" }));
    await user.type(screen.getByLabelText("Nº do processo"), "0800003-98.2026.8.12.0001");
    expect(lerRecentes(armazenamento).map((r) => r.processo)).toEqual([
      "0800003-98.2026.8.12.0001",
      "0800002-16.2026.8.12.0001",
    ]);
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    const painel = within(screen.getByRole("dialog", { name: "Abrir cálculo" }));
    const itens = painel.getAllByRole("listitem");
    expect(itens.map((i) => i.textContent)).toEqual([
      "0800003-98.2026.8.12.0001atualizado em 11/10/2026 15:00AbrirRemover",
      "0800002-16.2026.8.12.0001 · Exequente Umatualizado em 11/10/2026 15:00AbrirRemover",
    ]);
    await user.click(within(itens[1] as HTMLElement).getByRole("button", { name: /^Abrir/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect((screen.getByLabelText("Nº do processo") as HTMLInputElement).value).toBe(
      "0800002-16.2026.8.12.0001",
    );
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(
      within(screen.getByRole("dialog")).getAllByRole("button", {
        name: /^Remover/,
      })[0] as HTMLElement,
    );
    expect(lerRecentes(armazenamento).map((r) => r.processo)).toEqual([
      "0800002-16.2026.8.12.0001",
    ]);
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Limpar recentes" }),
    );
    expect(lerRecentes(armazenamento)).toEqual([]);
    expect(
      within(screen.getByRole("dialog")).getByText(/Nenhum cálculo recente ainda/),
    ).toBeDefined();
  });

  it("recente enxuto (só o cálculo e os índices usados) abre, recalcula e avisa do índice que mudou; recente antigo, com o envelope inteiro, também abre", async () => {
    const user = userEvent.setup();
    const salvo = arquivoSalvo();
    const armazenamento = armazenamentoEmMemoria();
    guardarRecente(armazenamento, salvo.calculo, salvo.resultado);
    expect(lerRecentes(armazenamento)[0]?.texto).not.toContain("memoriaBase");
    render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
    const aviso =
      "IPCA de set/2026 mudou de 0,80% para 0,82% desde a atualização dos índices de 20/09/2026.";
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: /^Abrir 0800001-31\.2026\.8\.12\.0001/,
      }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      within(screen.getByRole("region", { name: "Prestações" })).getAllByRole("row"),
    ).toHaveLength(4);
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).toContain(aviso);
    cleanup();
    // recente gravado antes desta decisão: o texto é o arquivo inteiro, como "Salvar" grava
    const antigo = armazenamentoEmMemoria({
      [CHAVE_RECENTES]: JSON.stringify([
        {
          id: salvo.calculo.id,
          atualizadoEm: salvo.calculo.atualizadoEm,
          processo: salvo.calculo.cabecalho.processo,
          exequente: salvo.calculo.cabecalho.exequente,
          executado: salvo.calculo.cabecalho.executado,
          texto: serializarArquivo(salvo),
        },
      ]),
    });
    render(<App ambiente={ambienteDeTeste({ armazenamento: antigo })} />);
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: /^Abrir 0800001-31\.2026\.8\.12\.0001/,
      }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).toContain(aviso);
  });

  it("se o cálculo atual não pôde ser guardado nos recentes (cota cheia, armazenamento bloqueado), o painel 'Abrir' avisa", async () => {
    const user = userEvent.setup();
    const frase =
      "O cálculo atual não pôde ser guardado nos recentes deste navegador (o armazenamento está cheio ou bloqueado): salve o arquivo para não perdê-lo.";
    // cota cheia: os recentes antigos continuam lá, mas o atual não entra
    const cheio = armazenamentoEmMemoria();
    const guardado = arquivoSalvo();
    guardarRecente(cheio, guardado.calculo, guardado.resultado);
    cheio.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    render(<App ambiente={ambienteDeTeste({ armazenamento: cheio })} />);
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    // o cálculo em branco não vai para os recentes: nada a avisar
    expect(within(screen.getByRole("dialog")).queryByText(frase)).toBeNull();
    await user.keyboard("{Escape}");
    await user.type(screen.getByLabelText("Nº do processo"), "0800002-16.2026.8.12.0001");
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    const painel = within(screen.getByRole("dialog"));
    expect(painel.getByText(frase)).toBeDefined();
    expect(painel.getAllByRole("listitem")).toHaveLength(1);
    // "Novo cálculo": o cálculo em branco não tem o que guardar, e o aviso some
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Novo cálculo" }));
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    expect(within(screen.getByRole("dialog")).queryByText(frase)).toBeNull();
    cleanup();
    // armazenamento bloqueado
    render(<App ambiente={ambienteDeTeste({ armazenamento: armazenamentoQueFalha() })} />);
    await user.type(screen.getByLabelText("Nº do processo"), "0800002-16.2026.8.12.0001");
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    expect(within(screen.getByRole("dialog")).getByText(frase)).toBeDefined();
  });

  it("navegador que não permite guardar nada: o painel 'Abrir' diz isso (e não que a opção está desligada)", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste({ armazenamento: null })} />);
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    const painel = within(screen.getByRole("dialog"));
    expect(
      painel.getByText(
        "Este navegador não permite guardar dados (por exemplo, numa janela anônima com bloqueio): os cálculos recentes não ficam guardados aqui. Salve o arquivo para não perder o cálculo.",
      ),
    ).toBeDefined();
    expect(painel.queryByText(/está desligada/)).toBeNull();
  });

  it("com a guarda de recentes desligada nada é guardado e o painel explica; recente corrompido mostra erro", async () => {
    const user = userEvent.setup();
    const armazenamento = armazenamentoEmMemoria();
    render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
    await user.click(screen.getByLabelText("Guardar cálculos recentes neste navegador"));
    await user.type(screen.getByLabelText("Nº do processo"), "0800004-83.2026.8.12.0001");
    expect(armazenamento.getItem(CHAVE_RECENTES)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    expect(
      within(screen.getByRole("dialog")).getByText(
        /"Guardar cálculos recentes neste navegador" está desligada/,
      ),
    ).toBeDefined();
    await user.keyboard("{Escape}");
    await user.click(screen.getByLabelText("Guardar cálculos recentes neste navegador"));
    armazenamento.setItem(
      CHAVE_RECENTES,
      JSON.stringify([
        {
          id: "r",
          atualizadoEm: AGORA_DE_TESTE,
          processo: "quebrado",
          exequente: "",
          executado: "",
          texto: "{nada",
        },
      ]),
    );
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /^Abrir quebrado/ }),
    );
    expect(within(screen.getByRole("dialog")).getByRole("alert").textContent).toBe(
      "O arquivo está danificado ou não é um arquivo de cálculo do Apura: não pôde ser lido.",
    );
  });
});
