// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { decimal } from "../../compartilhado/decimal.ts";
import { formatarMoeda } from "../../compartilhado/formatacao.ts";
import { baseUnica } from "../../motor/base.ts";
import { calcular } from "../../motor/calcular.ts";
import { gerarLoteAmortizacoes, gerarLotePrestacoes } from "../../motor/lote.ts";
import App from "../App.tsx";
import { novoCalculo } from "../estado/calculo.ts";
import { TabelaLancamentos } from "./TabelaLancamentos.tsx";
import { ambienteDeTeste, AGORA_DE_TESTE, HOJE_DE_TESTE } from "../testes/ambiente-de-teste.ts";

afterEach(cleanup);

const moeda = (texto: string) => formatarMoeda(decimal(texto));
/** multa e honorários de 10% cada, o padrão do cálculo novo (decisão de 13/10/2026) */
const multaEHonorarios = (r: ReturnType<typeof calcular>) =>
  formatarMoeda(decimal(r.totais.multa).plus(decimal(r.totais.honorarios)));

/** O que o motor devolve para o mesmo caso montado na tela: valor fixo R$ 1.000,00, dia 5, 2 meses. */
function esperado() {
  const calculo = novoCalculo({ id: "x", agora: AGORA_DE_TESTE, hoje: HOJE_DE_TESTE });
  calculo.base = baseUnica({
    tipo: "valorFixo",
    valor: "1000.00",
    dataFixacao: HOJE_DE_TESTE,
    indiceReajuste: "nenhum",
    mesReajuste: 10,
  });
  calculo.lancamentos = gerarLotePrestacoes(
    { diaVencimento: 5, mesesEmAtraso: 2 },
    HOJE_DE_TESTE,
    [],
  ).lancamentos;
  const comPagamento = {
    ...calculo,
    lancamentos: [
      ...calculo.lancamentos,
      ...gerarLoteAmortizacoes(
        { valorMensal: "400.00", diaPagamento: 5, de: "2026-09", ate: "2026-09" },
        calculo.lancamentos,
      ).lancamentos,
    ],
  };
  const tabela = ambienteDeTeste().congelar().tabela;
  return { soPrestacoes: calcular(calculo, tabela), comPagamento: calcular(comPagamento, tabela) };
}

async function montarCaso(user: ReturnType<typeof userEvent.setup>) {
  render(<App ambiente={ambienteDeTeste()} />);
  await user.type(screen.getByLabelText("Valor fixado"), "1.000,00");
  const prestacoes = within(screen.getByRole("region", { name: /3 · Prestações em atraso/ }));
  await user.click(prestacoes.getByLabelText("Meses em atraso"));
  await user.type(prestacoes.getByLabelText("Dia do vencimento"), "5");
  await user.type(prestacoes.getByLabelText("Quantos meses"), "2");
  await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
}

/** O nome do botão das etiquetas da linha ("Situação da prestação de …: …"; §17.4). */
function situacao(linha: HTMLElement): string | null {
  return within(linha)
    .getByRole("button", { name: /^Situação / })
    .getAttribute("aria-label");
}

describe("lado direito: indicadores, tabelas e memória (§9.3)", () => {
  it("mostra as prestações do lote com os valores do motor, os totais e os cinco indicadores", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    const r = esperado().soPrestacoes;
    const tabela = within(screen.getByRole("region", { name: "Prestações" }));
    const linhas = tabela.getAllByRole("row");
    // cabeçalho + 2 prestações + total
    expect(linhas).toHaveLength(4);
    const primeira = linhas[1] as HTMLElement;
    const celulas = within(primeira)
      .getAllByRole("cell")
      .map((c) => c.textContent);
    const l0 = r.lancamentos[0]!;
    expect(celulas.slice(0, 7)).toEqual([
      "▸05/09/2026",
      "R$ 1.000,00",
      l0.correcao.fator.replace(".", ","),
      moeda(l0.corrigido),
      `${l0.juros.percentual.replace(".", ",")}%`,
      moeda(l0.jurosValor),
      moeda(l0.atualizado),
    ]);
    const total = within(linhas[3] as HTMLElement)
      .getAllByRole("cell")
      .map((c) => c.textContent);
    expect(total[0]).toBe("Total");
    expect(total[6]).toBe(moeda(r.totais.prestacoes));
    const resumo = within(screen.getByLabelText("Resumo do cálculo"));
    expect(resumo.getAllByRole("term").map((t) => t.textContent)).toEqual([
      "Prestações atualizadas",
      "Amortizações atualizadas",
      "Total devido em 11/10/2026",
      "Multa e honorários",
      "Total geral",
    ]);
    expect(resumo.getAllByRole("definition").map((d) => d.textContent)).toEqual([
      moeda(r.totais.prestacoes),
      "R$ 0,00",
      moeda(r.totais.totalDevido),
      multaEHonorarios(r),
      moeda(r.totais.totalGeral),
    ]);
    expect(
      within(screen.getByRole("region", { name: "Amortizações (pagamentos)" })).getByText(
        /Nenhum pagamento lançado/,
      ),
    ).toBeDefined();
  });

  it("▸ expande a memória (base, índices, juros e avisos) e volta a esconder", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    const r = esperado().soPrestacoes;
    const l0 = r.lancamentos[0]!;
    const botao = screen.getByRole("button", { name: "Memória da prestação de 05/09/2026" });
    expect(botao.getAttribute("aria-expanded")).toBe("false");
    await user.click(botao);
    expect(botao.getAttribute("aria-expanded")).toBe("true");
    expect(botao.textContent).toBe("▾");
    const memoria = screen
      .getByText("Memória · prestação de 05/09/2026")
      .closest("tr") as HTMLElement;
    expect(memoria.textContent).toContain(`Base: ${l0.memoriaBase}`);
    expect(memoria.textContent).toContain("IPCA de set/2026: ");
    expect(memoria.textContent).toContain("(25/30 do mês)");
    expect(memoria.textContent).toContain("IPCA de out/2026: sem índice (fator 1,000000)");
    expect(memoria.textContent).toContain("taxa legal de ");
    for (const aviso of l0.avisos) expect(memoria.textContent).toContain(aviso);
    await user.click(botao);
    expect(screen.queryByText("Memória · prestação de 05/09/2026")).toBeNull();
  });

  it("um pagamento entra na tabela de amortizações com as mesmas colunas e abate do total; excluir recalcula", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    const pagamentos = within(screen.getByRole("region", { name: /4 · Pagamentos/ }));
    await user.type(pagamentos.getByLabelText("Valor por mês"), "400");
    fireEvent.change(pagamentos.getByLabelText("Primeiro pagamento"), {
      target: { value: "2026-09-05" },
    });
    fireEvent.change(pagamentos.getByLabelText("Último pagamento"), {
      target: { value: "2026-09-05" },
    });
    await user.click(pagamentos.getByRole("button", { name: "Lançar em lote" }));
    const r = esperado().comPagamento;
    const amortizacoes = within(screen.getByRole("region", { name: "Amortizações (pagamentos)" }));
    const linha = amortizacoes.getAllByRole("row")[1] as HTMLElement;
    const celulas = within(linha)
      .getAllByRole("cell")
      .map((c) => c.textContent);
    const pagamento = r.lancamentos.find((l) => l.tipo === "amortizacao")!;
    expect(celulas.slice(0, 2)).toEqual(["▸05/09/2026Pagamento parcial", "R$ 400,00"]);
    expect(celulas[6]).toBe(moeda(pagamento.atualizado));
    const resumo = within(screen.getByLabelText("Resumo do cálculo"));
    expect(resumo.getAllByRole("definition").map((d) => d.textContent)).toEqual([
      moeda(r.totais.prestacoes),
      moeda(r.totais.amortizacoes),
      moeda(r.totais.totalDevido),
      multaEHonorarios(r),
      moeda(r.totais.totalGeral),
    ]);
    // o ✕ de outra tabela também leva o "armado" para ele (um só ✕ armado na tela)
    const xisDaPrestacao = () =>
      screen.getByRole("button", { name: /excluir (a )?prestação de 05\/09\/2026$/i });
    const xisDoPagamento = () =>
      screen.getByRole("button", { name: /excluir (o )?pagamento de 05\/09\/2026/i });
    await user.click(xisDaPrestacao());
    await user.click(xisDoPagamento());
    expect(xisDaPrestacao().getAttribute("aria-label")).toBe("Excluir prestação de 05/09/2026");
    expect(xisDoPagamento().getAttribute("aria-label")).toBe(
      "Clique de novo para excluir o pagamento de 05/09/2026 (Pagamento parcial)",
    );
    await user.click(xisDoPagamento());
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "+ Pagamento" }));
    expect(amortizacoes.getByText(/Nenhum pagamento lançado/)).toBeDefined();
    expect(resumo.getAllByRole("definition")[1]?.textContent).toBe("R$ 0,00");
    await user.click(xisDaPrestacao());
    await user.click(xisDaPrestacao());
    expect(
      within(screen.getByRole("region", { name: "Prestações" })).getAllByRole("row"),
    ).toHaveLength(3);
  });

  it("o ✕ fica vermelho no primeiro clique e só exclui num segundo clique deliberado; clique ou foco fora, Esc ou mudança no cálculo o desarmam (decisão de 13/10/2026)", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    const tabela = within(screen.getByRole("region", { name: "Prestações" }));
    const linhas = () => tabela.getAllByRole("row").length;
    const xis = (data: string) =>
      screen.getByRole("button", { name: new RegExp(`excluir (a )?prestação de ${data}$`, "i") });
    const armado = (data: string) => xis(data).classList.contains("armado");
    expect(linhas()).toBe(4);
    // primeiro clique: o mesmo botão fica vermelho e muda o nome; nada é excluído nem sai do lugar
    await user.click(xis("05/09/2026"));
    expect(armado("05/09/2026")).toBe(true);
    expect(xis("05/09/2026").getAttribute("aria-label")).toBe(
      "Clique de novo para excluir a prestação de 05/09/2026",
    );
    expect(
      screen.getByRole("button", { name: "Personalizar prestação de 05/09/2026" }),
    ).toBeDefined();
    expect(linhas()).toBe(4);
    // Esc desarma, e o foco fica no ✕
    await user.keyboard("{Escape}");
    expect(armado("05/09/2026")).toBe(false);
    expect(document.activeElement).toBe(xis("05/09/2026"));
    // um clique duplo arma, mas não exclui (o segundo clique do duplo não conta)
    await user.dblClick(xis("05/09/2026"));
    expect(armado("05/09/2026")).toBe(true);
    expect(linhas()).toBe(4);
    // o ✕ de outra linha leva o "armado" para ela
    await user.click(xis("05/10/2026"));
    expect(armado("05/09/2026")).toBe(false);
    expect(armado("05/10/2026")).toBe(true);
    // outra ação na tela desarma
    await user.type(screen.getByLabelText("Nº do processo"), "1");
    expect(armado("05/10/2026")).toBe(false);
    // abrir a memória de uma linha também desarma (clique fora do ✕)
    await user.click(xis("05/09/2026"));
    await user.click(screen.getByRole("button", { name: "Memória da prestação de 05/10/2026" }));
    expect(armado("05/09/2026")).toBe(false);
    // um clique numa área sem foco (o título da tabela) também desarma
    await user.click(xis("05/09/2026"));
    await user.click(screen.getByRole("heading", { name: "Prestações" }));
    expect(armado("05/09/2026")).toBe(false);
    // levar o foco para fora com Tab também desarma
    await user.click(xis("05/09/2026"));
    await user.tab();
    expect(armado("05/09/2026")).toBe(false);
    expect(linhas()).toBe(5); // 2 prestações, a memória aberta de 05/10/2026, o total e o cabeçalho
    // pelo teclado: Enter arma, Enter de novo exclui (a linha com a memória aberta) e leva o
    // foco para "+ Prestação"
    xis("05/10/2026").focus();
    await user.keyboard("{Enter}");
    expect(armado("05/10/2026")).toBe(true);
    await user.keyboard("{Enter}");
    expect(linhas()).toBe(3);
    expect(screen.queryByRole("button", { name: /05\/10\/2026/ })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "+ Prestação" }));
    // relançado o lote, 05/10/2026 volta com a memória fechada e o ✕ desarmado
    const lote = within(screen.getByRole("region", { name: /3 · Prestações em atraso/ }));
    await user.click(lote.getByRole("button", { name: "Lançar em lote" }));
    expect(
      screen
        .getByRole("button", { name: "Memória da prestação de 05/10/2026" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    expect(armado("05/10/2026")).toBe(false);
    expect(linhas()).toBe(4);
  });

  it("o ✕ armado volta ao normal depois de 4 segundos sem o segundo clique", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      await montarCaso(user);
      const xis = () =>
        screen.getByRole("button", { name: /excluir (a )?prestação de 05\/09\/2026$/i });
      await user.click(xis());
      expect(xis().classList.contains("armado")).toBe(true);
      act(() => vi.advanceTimersByTime(3900));
      expect(xis().classList.contains("armado")).toBe(true);
      act(() => vi.advanceTimersByTime(200));
      expect(xis().classList.contains("armado")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("vencimento e valor se corrigem na própria célula: Enter ou sair grava, Esc desiste, inválido não grava (decisão de 13/10/2026)", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    const tabela = within(screen.getByRole("region", { name: "Prestações" }));
    const primeira = () => tabela.getAllByRole("row")[1] as HTMLElement;
    // clique no valor: o campo abre com o valor apurado pela base, selecionado
    await user.click(
      screen.getByRole("button", { name: "Editar valor da prestação de 05/09/2026 (R$ 1.000,00)" }),
    );
    const campo = screen.getByLabelText("Valor da prestação de 05/09/2026") as HTMLInputElement;
    expect(document.activeElement).toBe(campo);
    expect(campo.value).toBe("1.000,00");
    // Enter sem mudar nada não marca a linha
    await user.keyboard("{Enter}");
    expect(primeira().textContent).not.toContain("ajustada");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Editar valor da prestação de 05/09/2026 (R$ 1.000,00)" }),
    );
    // valor digitado grava como informado à mão
    await user.keyboard("{Enter}");
    await user.clear(screen.getByLabelText("Valor da prestação de 05/09/2026"));
    await user.type(screen.getByLabelText("Valor da prestação de 05/09/2026"), "1.200,00{Enter}");
    expect(within(primeira()).getAllByRole("cell")[1]?.textContent).toBe("R$ 1.200,00");
    // uma etiqueta só na linha, a mais importante, e "+N"; todas no nome do botão (§17.4)
    expect(primeira().textContent).toContain("valor informado +1");
    expect(situacao(primeira())).toBe(
      "Situação da prestação de 05/09/2026: valor informado, ajustada",
    );
    // texto inválido fica no campo, em vermelho, e não é gravado; Esc desiste
    await user.click(
      screen.getByRole("button", { name: "Editar valor da prestação de 05/09/2026 (R$ 1.200,00)" }),
    );
    await user.clear(screen.getByLabelText("Valor da prestação de 05/09/2026"));
    await user.type(screen.getByLabelText("Valor da prestação de 05/09/2026"), "1.5{Enter}");
    expect(screen.getByRole("alert").textContent).toBe(
      "Use vírgula para os centavos (ex.: 1.234,56 ou 1234,56).",
    );
    expect(
      screen.getByLabelText("Valor da prestação de 05/09/2026").getAttribute("aria-invalid"),
    ).toBe("true");
    await user.keyboard("{Escape}");
    expect(within(primeira()).getAllByRole("cell")[1]?.textContent).toBe("R$ 1.200,00");
    // trocar de janela no meio da digitação (conferir um PDF) não grava o valor pela metade
    await user.click(
      screen.getByRole("button", { name: "Editar valor da prestação de 05/09/2026 (R$ 1.200,00)" }),
    );
    await user.clear(screen.getByLabelText("Valor da prestação de 05/09/2026"));
    await user.type(screen.getByLabelText("Valor da prestação de 05/09/2026"), "45");
    const janelaSemFoco = vi.spyOn(document, "hasFocus").mockReturnValue(false);
    fireEvent.blur(screen.getByLabelText("Valor da prestação de 05/09/2026"));
    janelaSemFoco.mockRestore();
    // o campo continua aberto, com o que foi digitado, e nada foi gravado
    expect(
      (screen.getByLabelText("Valor da prestação de 05/09/2026") as HTMLInputElement).value,
    ).toBe("45");
    await user.keyboard("{Escape}");
    expect(within(primeira()).getAllByRole("cell")[1]?.textContent).toBe("R$ 1.200,00");
    // apagar o valor volta a apurar pela base
    await user.click(
      screen.getByRole("button", { name: "Editar valor da prestação de 05/09/2026 (R$ 1.200,00)" }),
    );
    await user.clear(screen.getByLabelText("Valor da prestação de 05/09/2026"));
    await user.keyboard("{Enter}");
    expect(within(primeira()).getAllByRole("cell")[1]?.textContent).toBe("R$ 1.000,00");
    expect(primeira().textContent).not.toContain("valor informado");
    // o vencimento: sair do campo com Tab grava, e a linha passa a se chamar pela nova data
    await user.click(
      screen.getByRole("button", {
        name: "Editar vencimento da prestação de 05/09/2026 (05/09/2026)",
      }),
    );
    // o vencimento é digitado como texto dd/mm/aaaa (as barras entram sozinhas)
    const vencimento = screen.getByLabelText(
      "Vencimento da prestação de 05/09/2026",
    ) as HTMLInputElement;
    expect(vencimento.value).toBe("05/09/2026");
    await user.clear(vencimento);
    await user.type(vencimento, "3109{Enter}");
    expect(screen.getByRole("alert").textContent).toBe(
      "Informe a data como dd/mm/aaaa (ex.: 05/09/2026).",
    );
    await user.clear(vencimento);
    await user.type(vencimento, "10092026");
    expect(vencimento.value).toBe("10/09/2026");
    await user.tab();
    expect(
      screen.getByRole("button", { name: "Memória da prestação de 10/09/2026" }),
    ).toBeDefined();
    expect(screen.queryByRole("button", { name: /05\/09\/2026/ })).toBeNull();
    // pagamento não fica sem valor
    const pagamentos = within(screen.getByRole("region", { name: /4 · Pagamentos/ }));
    await user.type(pagamentos.getByLabelText("Valor por mês"), "400");
    fireEvent.change(pagamentos.getByLabelText("Primeiro pagamento"), {
      target: { value: "2026-09-05" },
    });
    fireEvent.change(pagamentos.getByLabelText("Último pagamento"), {
      target: { value: "2026-09-05" },
    });
    await user.click(pagamentos.getByRole("button", { name: "Lançar em lote" }));
    await user.click(
      screen.getByRole("button", {
        name: "Editar valor do pagamento de 05/09/2026 (Pagamento parcial) (R$ 400,00)",
      }),
    );
    await user.clear(screen.getByLabelText("Valor do pagamento de 05/09/2026 (Pagamento parcial)"));
    await user.keyboard("{Enter}");
    expect(screen.getByRole("alert").textContent).toBe("Informe um valor maior que zero.");
  });

  it("+ Prestação e + Pagamento abrem uma linha nova já sugerida no fim da tabela: Enter ou ✓ inclui, Esc ou ✕ descarta (decisão de 13/10/2026)", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    const tabela = within(screen.getByRole("region", { name: "Prestações" }));
    // vencimento no mês seguinte ao da última prestação e o valor da base; Enter inclui pela base
    await user.click(screen.getByRole("button", { name: "+ Prestação" }));
    const vencimento = screen.getByLabelText("Vencimento da nova prestação") as HTMLInputElement;
    expect(document.activeElement).toBe(vencimento);
    expect(vencimento.value).toBe("2026-11-05");
    expect((screen.getByLabelText("Valor da nova prestação") as HTMLInputElement).value).toBe(
      "1.000,00",
    );
    expect(tabela.getAllByRole("row").at(-2)?.textContent).toContain("Enter inclui · Esc descarta");
    await user.keyboard("{Enter}");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "+ Prestação" }));
    const novembro = screen
      .getByRole("button", { name: "Memória da prestação de 05/11/2026" })
      .closest("tr") as HTMLElement;
    expect(within(novembro).getAllByRole("cell")[1]?.textContent).toBe("R$ 1.000,00");
    expect(novembro.textContent).toContain("vincenda");
    expect(novembro.textContent).not.toContain("valor informado");
    // outro vencimento e valor digitado: entra como informado à mão, pelo ✓
    await user.click(screen.getByRole("button", { name: "+ Prestação" }));
    expect((screen.getByLabelText("Vencimento da nova prestação") as HTMLInputElement).value).toBe(
      "2026-12-05",
    );
    fireEvent.change(screen.getByLabelText("Vencimento da nova prestação"), {
      target: { value: "2026-08-20" },
    });
    await user.clear(screen.getByLabelText("Valor da nova prestação"));
    await user.type(screen.getByLabelText("Valor da nova prestação"), "500");
    await user.click(screen.getByRole("button", { name: "Incluir a nova prestação" }));
    const agosto = screen
      .getByRole("button", { name: "Memória da prestação de 20/08/2026" })
      .closest("tr") as HTMLElement;
    expect(within(agosto).getAllByRole("cell")[1]?.textContent).toBe("R$ 500,00");
    expect(agosto.textContent).toContain("valor informado");
    // Esc descarta e devolve o foco a "+ Prestação"
    const antes = tabela.getAllByRole("row").length;
    await user.click(screen.getByRole("button", { name: "+ Prestação" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByLabelText("Vencimento da nova prestação")).toBeNull();
    expect(tabela.getAllByRole("row")).toHaveLength(antes);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "+ Prestação" }));
    // pagamento: data de hoje; sem pagamento anterior, o valor é obrigatório
    await user.click(screen.getByRole("button", { name: "+ Pagamento" }));
    expect((screen.getByLabelText("Data do novo pagamento") as HTMLInputElement).value).toBe(
      "2026-10-11",
    );
    await user.keyboard("{Enter}");
    expect(screen.getByRole("alert").textContent).toBe("Informe um número.");
    await user.type(screen.getByLabelText("Valor do novo pagamento"), "150{Enter}");
    const amortizacoes = within(screen.getByRole("region", { name: "Amortizações (pagamentos)" }));
    expect(amortizacoes.getAllByRole("row")[1]?.textContent).toContain("▸11/10/2026R$ 150,00");
    // o próximo pagamento já vem com o valor do anterior; ✕ descarta
    await user.click(screen.getByRole("button", { name: "+ Pagamento" }));
    expect((screen.getByLabelText("Valor do novo pagamento") as HTMLInputElement).value).toBe(
      "150,00",
    );
    await user.click(screen.getByRole("button", { name: "Descartar o novo pagamento" }));
    expect(screen.queryByLabelText("Data do novo pagamento")).toBeNull();
    // a linha nova não passa para outro cálculo: "Novo cálculo" a descarta
    await user.click(screen.getByRole("button", { name: "+ Prestação" }));
    await user.click(screen.getByRole("button", { name: "Novo cálculo" }));
    expect(screen.queryByLabelText("Vencimento da nova prestação")).toBeNull();
  });

  describe("Enter segurado (tecla repetida) não acrescenta linhas", () => {
    const memorias = (tipo: "prestação" | "pagamento") =>
      screen.queryAllByRole("button", { name: new RegExp(`^Memória d[ao] ${tipo} de `) }).length;

    it("em + Prestação: abre a linha nova uma vez e não inclui nada", async () => {
      const user = userEvent.setup();
      await montarCaso(user);
      expect(memorias("prestação")).toBe(2);
      screen.getByRole("button", { name: "+ Prestação" }).focus();
      await user.keyboard("{Enter>8/}");
      expect(memorias("prestação")).toBe(2);
      expect(screen.getByLabelText("Vencimento da nova prestação")).toBeDefined();
    });

    it("em + Pagamento, com o valor do pagamento anterior já sugerido", async () => {
      const user = userEvent.setup();
      await montarCaso(user);
      await user.click(screen.getByRole("button", { name: "+ Pagamento" }));
      await user.type(screen.getByLabelText("Valor do novo pagamento"), "150{Enter}");
      expect(memorias("pagamento")).toBe(1);
      screen.getByRole("button", { name: "+ Pagamento" }).focus();
      await user.keyboard("{Enter>8/}");
      expect(memorias("pagamento")).toBe(1);
      expect(screen.getByLabelText("Data do novo pagamento")).toBeDefined();
    });

    it("no Enter que confirma a exclusão pelo ✕ (o foco vai a + Prestação): só a linha excluída some", async () => {
      const user = userEvent.setup();
      await montarCaso(user);
      screen.getByRole("button", { name: "Excluir prestação de 05/10/2026" }).focus();
      await user.keyboard("{Enter}");
      await user.keyboard("{Enter>8/}");
      expect(memorias("prestação")).toBe(1);
      expect(screen.queryByRole("button", { name: /05\/10\/2026/ })).toBeNull();
      expect(
        screen.getByRole("button", { name: "Memória da prestação de 05/09/2026" }),
      ).toBeDefined();
      expect(memorias("pagamento")).toBe(0);
    });
  });

  it("base incompleta: o aviso diz o que falta e onde, e o campo fica em vermelho até ser preenchido (decisão de 13/10/2026)", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    await user.click(screen.getByLabelText("% do salário mínimo"));
    // sem prestação lançada, nada é cobrado
    expect(
      screen.getByLabelText("Percentual do salário mínimo").getAttribute("aria-invalid"),
    ).toBeNull();
    const prestacoes = within(screen.getByRole("region", { name: /3 · Prestações em atraso/ }));
    await user.click(prestacoes.getByLabelText("Meses em atraso"));
    await user.type(prestacoes.getByLabelText("Dia do vencimento"), "5");
    await user.type(prestacoes.getByLabelText("Quantos meses"), "2");
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    const avisos = () => screen.getByRole("region", { name: "Avisos" }).textContent;
    expect(avisos()).toContain(
      "Falta o percentual do salário mínimo (seção 2 · Base dos alimentos): as prestações ficam sem valor até ele ser informado.",
    );
    expect(avisos()).not.toContain("igualam ou superam");
    const campo = screen.getByLabelText("Percentual do salário mínimo");
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Informe o percentual.")).toBeDefined();
    // a etiqueta "não computada" explica onde está o motivo: na memória, aberta pelo ▸
    const setembro = screen
      .getByRole("button", { name: "Memória da prestação de 05/09/2026" })
      .closest("tr") as HTMLElement;
    const etiqueta = within(setembro).getByRole("button", {
      name: "Situação da prestação de 05/09/2026: não computada",
    });
    await user.click(etiqueta);
    expect(etiqueta.nextElementSibling?.textContent).toBe(
      "não computada: Fora dos totais: abra a memória da linha (▸) para ver o motivo.",
    );
    await user.click(screen.getByRole("button", { name: "Memória da prestação de 05/09/2026" }));
    expect(
      screen.getByText(/Memória · prestação de 05\/09\/2026/).closest("tr")?.textContent,
    ).toContain("Percentual do salário mínimo não informado: a prestação ficou sem valor.");
    await user.type(campo, "30");
    expect(avisos()).not.toContain("Falta o percentual");
    expect(campo.getAttribute("aria-invalid")).toBeNull();
    expect(screen.queryByText("Informe o percentual.")).toBeNull();
  });

  it("amortizações maiores que as prestações: total devido e total geral saem como R$ 0,00, com o aviso do motor", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    const pagamentos = within(screen.getByRole("region", { name: /4 · Pagamentos/ }));
    await user.type(pagamentos.getByLabelText("Valor por mês"), "5.000,00");
    fireEvent.change(pagamentos.getByLabelText("Primeiro pagamento"), {
      target: { value: "2026-09-05" },
    });
    fireEvent.change(pagamentos.getByLabelText("Último pagamento"), {
      target: { value: "2026-09-05" },
    });
    await user.click(pagamentos.getByRole("button", { name: "Lançar em lote" }));
    const resumo = within(screen.getByLabelText("Resumo do cálculo"));
    const valores = resumo.getAllByRole("definition").map((d) => d.textContent);
    expect(valores[2]).toBe("R$ 0,00");
    expect(valores[4]).toBe("R$ 0,00");
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).toContain(
      "igualam ou superam as prestações atualizadas",
    );
  });

  it('etiquetas numa linha só: a mais importante e "+N"; o balão traz a descrição inteira e todas as etiquetas, com a explicação (§17.4)', async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    await user.click(screen.getByRole("button", { name: "Personalizar prestação de 05/10/2026" }));
    const painel = within(screen.getByRole("dialog", { name: "Personalizar prestação" }));
    fireEvent.change(painel.getByLabelText("Vencimento"), { target: { value: "2026-11-05" } });
    await user.type(painel.getByLabelText("Valor informado à mão (opcional)"), "1.200,00");
    const descricao = "13º salário 2026, pago em dobro conforme o acordo homologado";
    await user.type(painel.getByLabelText("Descrição (opcional)"), descricao);
    await user.click(painel.getByRole("button", { name: "Aplicar" }));
    const linha = screen
      .getByRole("button", { name: `Memória da prestação de 05/11/2026 (${descricao})` })
      .closest("tr") as HTMLElement;
    const celula = within(linha).getAllByRole("cell")[0] as HTMLElement;
    const botao = within(celula).getByRole("button", {
      name: "Situação da prestação de 05/11/2026: vincenda, valor informado, ajustada",
    });
    // o botão leva a descrição (que encolhe até caber, inteira no title) e a etiqueta mais
    // importante, com "+N" (decisão de 13/10/2026)
    expect(within(botao).getByText("vincenda +2").className).toBe("etiqueta");
    expect(within(botao).getByText(descricao).getAttribute("title")).toBe(descricao);
    expect(celula.textContent).not.toContain("ajustada");
    await user.click(botao);
    // o balão (a região de status ao lado do botão)
    const balao = botao.nextElementSibling?.textContent ?? "";
    for (const trecho of [
      descricao,
      "vincenda: Vence depois da data de elaboração",
      "valor informado: Valor digitado à mão",
      "ajustada: Alterada depois de lançada",
    ]) {
      expect(balao).toContain(trecho);
    }
    await user.keyboard("{Escape}");
    expect(screen.queryByText(/Vence depois da data de elaboração/)).toBeNull();
    // linha sem etiqueta e sem descrição não tem o botão
    const setembro = screen
      .getByRole("button", { name: "Memória da prestação de 05/09/2026" })
      .closest("tr") as HTMLElement;
    expect(within(setembro).queryByRole("button", { name: /^(Situação|Descrição) / })).toBeNull();
  });

  it("linha só com descrição, sem etiqueta: a descrição é o botão e abre o balão com ela inteira (decisão de 13/10/2026)", async () => {
    const user = userEvent.setup();
    const calculo = novoCalculo({ id: "x", agora: AGORA_DE_TESTE, hoje: HOJE_DE_TESTE });
    calculo.base = baseUnica({
      tipo: "valorFixo",
      valor: "1000.00",
      dataFixacao: "2026-01-10",
      indiceReajuste: "nenhum",
      mesReajuste: 1,
    });
    const descricao = "Férias de 2026, conforme o acordo homologado";
    calculo.lancamentos = [
      {
        id: "p-2026-07",
        tipo: "prestacao",
        data: "2026-07-20",
        competencia: "2026-07",
        descricao,
        origem: "lote",
        editado: false,
      },
    ];
    const resultado = calcular(calculo, ambienteDeTeste().congelar().tabela);
    render(
      <TabelaLancamentos
        tipo="prestacao"
        linhas={[{ lancamento: calculo.lancamentos[0]!, calculado: resultado.lancamentos[0]! }]}
        aoPersonalizar={vi.fn()}
        aoExcluir={vi.fn()}
        aoEditar={vi.fn()}
        aoSugerir={vi.fn()}
        valorDaBase={() => ""}
        aoIncluir={vi.fn()}
      />,
    );
    const botao = screen.getByRole("button", {
      name: `Descrição da prestação de 20/07/2026: ${descricao}`,
    });
    expect(botao.textContent).toBe(descricao);
    await user.click(botao);
    expect(botao.nextElementSibling?.textContent).toBe(descricao);
  });
});
