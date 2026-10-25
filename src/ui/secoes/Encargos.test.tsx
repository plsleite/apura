// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Calculo } from "../../compartilhado/tipos.ts";
import { novoCalculo } from "../estado/calculo.ts";
import { metodologiaDaOpcao } from "../../metodologias/padrao.ts";
import { dividirPeriodo } from "../estado/metodologia.ts";
import App from "../App.tsx";
import { CHAVE_PREFERENCIAS } from "../armazenamento.ts";
import { ambienteDeTeste, armazenamentoEmMemoria } from "../testes/ambiente-de-teste.ts";
import { Encargos } from "./Encargos.tsx";

afterEach(cleanup);

function Harness({ inicial, espiao }: { inicial: Calculo; espiao: (c: Calculo) => void }) {
  const [calculo, setCalculo] = useState(inicial);
  const mudar = (novo: Calculo) => {
    setCalculo(novo);
    espiao(novo);
  };
  return (
    <Encargos
      calculo={calculo}
      aoMudarAcrescimo={(campo, valor) =>
        mudar({ ...calculo, acrescimos: { ...calculo.acrescimos, [campo]: valor } })
      }
      aoMudarDataElaboracao={(data) => mudar({ ...calculo, dataElaboracao: data })}
      aoMudarObservacoes={(texto) => mudar({ ...calculo, observacoes: texto })}
      aoAjustar={() => espiao({ ...calculo, observacoes: "ajustar!" })}
      aoEscolherMetodologia={(opcao) =>
        mudar({ ...calculo, metodologia: metodologiaDaOpcao(opcao) })
      }
    />
  );
}

const inicial = novoCalculo({ id: "c", agora: "2026-10-11T15:00:00-03:00", hoje: "2026-10-11" });

describe("5 · Encargos e data do cálculo (§9.2)", () => {
  it("a metodologia se escolhe entre as duas opções; ajustada, nenhuma fica marcada e o resumo aparece (§17.3, sem citar outro sistema)", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    render(<Harness inicial={inicial} espiao={espiao} />);
    expect(screen.getByText(/^Metodologia de encargos/).textContent).toBe(
      "Metodologia de encargos",
    );
    const transicao = screen.getByLabelText(
      "Até 29/08/2024: IGP-M e juros de 1% ao mês. Desde 30/08/2024: IPCA e taxa legal.",
    ) as HTMLInputElement;
    const semTransicao = screen.getByLabelText(
      "IGP-M e juros de 1% ao mês em todo o período.",
    ) as HTMLInputElement;
    expect([transicao.checked, semTransicao.checked]).toEqual([true, false]);
    expect(screen.queryByText(/^Ajustada:/)).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Ajuda: IGP-M e juros de 1% ao mês em todo o período" }),
    );
    expect(
      screen.getByText(/Use quando a decisão ou o acordo fixou esses critérios/).textContent,
    ).toBe(
      "IGP-M e juros de 1% ao mês do vencimento até a data do cálculo, sem a mudança de 30/08/2024. Use quando a decisão ou o acordo fixou esses critérios, ou quando o juízo mantém o critério anterior à Lei 14.905/2024. Sem isso, a regra legal desde 30/08/2024 é IPCA e taxa legal (arts. 389 e 406 do CC).",
    );
    await user.click(semTransicao);
    expect(espiao.mock.lastCall?.[0].metodologia).toEqual(metodologiaDaOpcao("igpmJuros1"));
    expect([transicao.checked, semTransicao.checked]).toEqual([false, true]);
    cleanup();
    const ajustada = {
      ...inicial,
      metodologia: dividirPeriodo(inicial.metodologia, "2023-01-01").metodologia,
    };
    render(<Harness inicial={ajustada} espiao={vi.fn()} />);
    expect(screen.getByText(/^Metodologia de encargos/).textContent).toBe(
      "Metodologia de encargos (ajustada)",
    );
    expect(
      screen
        .getAllByRole("radio")
        .filter((r) => (r as HTMLInputElement).name === "metodologia")
        .map((r) => (r as HTMLInputElement).checked),
    ).toEqual([false, false]);
    expect(screen.getByText(/^Ajustada:/).textContent).toBe(
      "Ajustada: Até 31/12/2022: IGP-M e juros de 1% ao mês. De 01/01/2023 a 29/08/2024: IGP-M e juros de 1% ao mês. Desde 30/08/2024: IPCA e taxa legal.",
    );
  });

  it("multa e honorários vêm com 10% cada (decisão de 13/10/2026), aceitam vírgula e recusam negativos; a data de elaboração é validada; observações livres", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    render(<Harness inicial={inicial} espiao={espiao} />);
    const multa = screen.getByLabelText("Multa (art. 523, %)") as HTMLInputElement;
    expect(multa.value).toBe("10");
    expect((screen.getByLabelText("Honorários (%)") as HTMLInputElement).value).toBe("10");
    await user.clear(multa);
    await user.type(multa, "0");
    expect(espiao.mock.lastCall?.[0].acrescimos).toEqual({
      multaPercentual: "0",
      honorariosPercentual: "10",
    });
    const honorarios = screen.getByLabelText("Honorários (%)");
    await user.clear(honorarios);
    await user.type(honorarios, "-5");
    await user.tab();
    expect(screen.getByRole("alert").textContent).toBe("O percentual não pode ser negativo.");
    expect(espiao.mock.lastCall?.[0].acrescimos.honorariosPercentual).toBe("10");
    await user.clear(honorarios);
    await user.type(honorarios, "12,5");
    expect(espiao.mock.lastCall?.[0].acrescimos.honorariosPercentual).toBe("12.5");
    fireEvent.change(screen.getByLabelText("Data de elaboração"), {
      target: { value: "2026-09-30" },
    });
    expect(espiao.mock.lastCall?.[0].dataElaboracao).toBe("2026-09-30");
    espiao.mockClear();
    fireEvent.change(screen.getByLabelText("Data de elaboração"), { target: { value: "" } });
    expect(espiao).not.toHaveBeenCalled();
    fireEvent.blur(screen.getByLabelText("Data de elaboração"));
    expect(screen.getByRole("alert").textContent).toContain("Informe a data");
    await user.click(screen.getByRole("button", { name: "+ Observações para o relatório" }));
    await user.type(screen.getByLabelText("Observações para o relatório"), "Conforme a sentença.");
    expect(espiao.mock.lastCall?.[0].observacoes).toBe("Conforme a sentença.");
    await user.click(screen.getByRole("button", { name: "Ajustar" }));
    expect(espiao.mock.lastCall?.[0].observacoes).toBe("ajustar!");
  });

  it("as observações ficam recolhidas: o botão abre a caixa, com o foco nela e sem balão ⓘ (§21.6)", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    render(<Harness inicial={inicial} espiao={espiao} />);
    expect(screen.queryByLabelText("Observações para o relatório")).toBeNull();
    await user.click(screen.getByRole("button", { name: "+ Observações para o relatório" }));
    const caixa = screen.getByLabelText("Observações para o relatório");
    expect(document.activeElement).toBe(caixa);
    expect(screen.queryByRole("button", { name: "+ Observações para o relatório" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Ajuda: Observações para o relatório" }),
    ).toBeNull();
    await user.type(caixa, "Conforme a sentença.");
    expect(espiao.mock.lastCall?.[0].observacoes).toBe("Conforme a sentença.");
  });

  it("com observações, a caixa já vem aberta, sem tomar o foco (§21.6)", () => {
    render(
      <Harness inicial={{ ...inicial, observacoes: "Conforme o acordo." }} espiao={vi.fn()} />,
    );
    const caixa = screen.getByLabelText("Observações para o relatório") as HTMLTextAreaElement;
    expect(caixa.value).toBe("Conforme o acordo.");
    expect(document.activeElement).not.toBe(caixa);
    expect(screen.queryByRole("button", { name: "+ Observações para o relatório" })).toBeNull();
  });

  it("no App: 'Novo cálculo' recolhe as observações, e abrir o cálculo que as tem mostra a caixa aberta (§21.6)", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste({ armazenamento: armazenamentoEmMemoria() })} />);
    await user.type(screen.getByLabelText("Nº do processo"), "08000004620268120001");
    await user.click(screen.getByRole("button", { name: "+ Observações para o relatório" }));
    await user.type(screen.getByLabelText("Observações para o relatório"), "Conforme o acordo.");
    await user.click(screen.getByRole("button", { name: "Novo cálculo" }));
    expect(screen.queryByLabelText("Observações para o relatório")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /^Abrir 0800000-46/ }),
    );
    expect(
      (screen.getByLabelText("Observações para o relatório") as HTMLTextAreaElement).value,
    ).toBe("Conforme o acordo.");
  });

  it("no App: a opção escolhida vale para o cálculo, fica guardada, vem nos cálculos novos e é o que 'Restaurar' restaura", async () => {
    const user = userEvent.setup();
    const armazenamento = armazenamentoEmMemoria();
    render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
    const opcao = (rotulo: RegExp) => screen.getByLabelText(rotulo) as HTMLInputElement;
    const semTransicao = /^IGP-M e juros de 1% ao mês em todo o período/;
    const guardada = () =>
      (JSON.parse(armazenamento.getItem(CHAVE_PREFERENCIAS) ?? "{}") as { metodologia?: string })
        .metodologia;
    await user.click(opcao(semTransicao));
    expect(guardada()).toBe("igpmJuros1");
    await user.click(screen.getByRole("button", { name: "Novo cálculo" }));
    expect(opcao(semTransicao).checked).toBe(true);
    // ajustada no editor, "Restaurar" volta à opção guardada
    await user.click(screen.getByRole("button", { name: "Ajustar" }));
    const painel = within(
      screen.getByRole("dialog", { name: "Ajustar a metodologia de encargos" }),
    );
    await user.selectOptions(painel.getByLabelText("Índice de correção"), "INPC");
    expect(screen.getByText(/^Metodologia de encargos/).textContent).toBe(
      "Metodologia de encargos (ajustada)",
    );
    await user.click(painel.getByRole("button", { name: "Restaurar a metodologia padrão" }));
    await user.keyboard("{Escape}");
    expect(opcao(semTransicao).checked).toBe(true);
    // a outra opção também se guarda
    await user.click(opcao(/^Até 29\/08\/2024: IGP-M/));
    expect(guardada()).toBe("lei14905");
  });
});
