// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Base } from "../../compartilhado/tipos.ts";
import { BaseDosAlimentos } from "./Base.tsx";

afterEach(cleanup);

const HOJE = "2026-10-11";
const fixa: Base = {
  tipo: "valorFixo",
  valor: "",
  dataFixacao: HOJE,
  indiceReajuste: "nenhum",
  mesReajuste: 10,
};

/** A seção dentro de um estado de verdade (como no App): cada mudança válida volta como `base`. */
function Harness({ inicial, espiao }: { inicial: Base; espiao: (base: Base) => void }) {
  const [base, setBase] = useState(inicial);
  return (
    <BaseDosAlimentos
      base={base}
      hoje={HOJE}
      aoMudar={(nova) => {
        setBase(nova);
        espiao(nova);
      }}
    />
  );
}

describe("2 · Base dos alimentos (§6.3, §9.2)", () => {
  it("valor fixo: mostra o mês do reajuste só com índice (IPCA, INPC, IGP-M), com o mês da fixação como padrão", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    render(<Harness inicial={fixa} espiao={espiao} />);
    expect((screen.getByLabelText("Valor fixo em reais") as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByLabelText("Mês do reajuste")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Ajuda: Reajuste anual" }));
    expect(screen.getByText(/Sem reajuste, o valor fixado vale igual/)).toBeDefined();
    await user.selectOptions(screen.getByLabelText("Reajuste anual"), "IPCA");
    expect(espiao).toHaveBeenLastCalledWith({ ...fixa, indiceReajuste: "IPCA" });
    expect((screen.getByLabelText("Mês do reajuste") as HTMLSelectElement).value).toBe("10");
    await user.click(screen.getByRole("button", { name: "Ajuda: Reajuste anual" }));
    expect(screen.getByText(/reajustado a cada 12 meses/)).toBeDefined();
    await user.selectOptions(screen.getByLabelText("Mês do reajuste"), "3");
    expect(espiao).toHaveBeenLastCalledWith({ ...fixa, indiceReajuste: "IPCA", mesReajuste: 3 });
    await user.selectOptions(screen.getByLabelText("Reajuste anual"), "SM");
    expect(screen.queryByLabelText("Mês do reajuste")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Ajuda: Reajuste anual" }));
    expect(screen.getByText(/O valor acompanha o salário mínimo/)).toBeDefined();
  });

  it("valor fixo: o valor aceita vírgula e só o válido chega; a data de fixação muda o mês do reajuste", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    render(<Harness inicial={fixa} espiao={espiao} />);
    await user.type(screen.getByLabelText("Valor fixado"), "1.000,00");
    expect(espiao).toHaveBeenLastCalledWith({ ...fixa, valor: "1000.00" });
    espiao.mockClear();
    await user.type(screen.getByLabelText("Valor fixado"), ",");
    expect(espiao).not.toHaveBeenCalled();
    // o erro de formato aparece ao sair do campo (decisão de 13/10/2026)
    expect(screen.queryByRole("alert")).toBeNull();
    await user.tab();
    expect(screen.getByRole("alert").textContent).toContain("Use vírgula para os centavos");
    fireEvent.change(screen.getByLabelText("Fixado em"), { target: { value: "2024-03-15" } });
    expect(espiao).toHaveBeenLastCalledWith({
      ...fixa,
      valor: "1000.00",
      dataFixacao: "2024-03-15",
      mesReajuste: 3,
    });
    espiao.mockClear();
    fireEvent.change(screen.getByLabelText("Fixado em"), { target: { value: "" } });
    expect(espiao).not.toHaveBeenCalled();
    fireEvent.blur(screen.getByLabelText("Fixado em"));
    expect(screen.getAllByRole("alert").map((a) => a.textContent)).toContain(
      "Informe a data (dia, mês e ano a partir de 1900).",
    );
  });

  it("mudar 'Fixado em' só acompanha o mês do reajuste enquanto ele não foi escolhido à mão", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    render(<Harness inicial={{ ...fixa, indiceReajuste: "IPCA" }} espiao={espiao} />);
    fireEvent.change(screen.getByLabelText("Fixado em"), { target: { value: "2024-03-15" } });
    expect((screen.getByLabelText("Mês do reajuste") as HTMLSelectElement).value).toBe("3");
    await user.selectOptions(screen.getByLabelText("Mês do reajuste"), "6");
    fireEvent.change(screen.getByLabelText("Fixado em"), { target: { value: "2024-04-10" } });
    expect(espiao).toHaveBeenLastCalledWith({
      ...fixa,
      indiceReajuste: "IPCA",
      dataFixacao: "2024-04-10",
      mesReajuste: 6,
    });
    expect((screen.getByLabelText("Mês do reajuste") as HTMLSelectElement).value).toBe("6");
  });

  it("trocar a forma mostra só os campos dela; voltar recupera o rascunho; o rendimento padrão é exigido", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    render(<Harness inicial={fixa} espiao={espiao} />);
    await user.type(screen.getByLabelText("Valor fixado"), "500");
    await user.click(screen.getByLabelText("% dos rendimentos"));
    expect(espiao).toHaveBeenLastCalledWith({
      tipo: "percentualRendimentos",
      percentual: "",
      rendimentoPadrao: "",
    });
    expect(screen.queryByLabelText("Valor fixado")).toBeNull();
    await user.type(screen.getByLabelText("Percentual dos rendimentos"), "30");
    await user.type(screen.getByLabelText("Rendimento mensal padrão (obrigatório)"), "1500");
    expect(espiao).toHaveBeenLastCalledWith({
      tipo: "percentualRendimentos",
      percentual: "30",
      rendimentoPadrao: "1500",
    });
    await user.clear(screen.getByLabelText("Rendimento mensal padrão (obrigatório)"));
    await user.tab();
    expect(screen.getByRole("alert").textContent).toBe("Informe um número.");
    await user.click(screen.getByLabelText("% do salário mínimo"));
    expect(espiao).toHaveBeenLastCalledWith({ tipo: "percentualSalarioMinimo", percentual: "" });
    expect(screen.queryByLabelText("Percentual dos rendimentos")).toBeNull();
    await user.type(screen.getByLabelText("Percentual do salário mínimo"), "-1");
    await user.tab();
    expect(screen.getByRole("alert").textContent).toBe("O percentual não pode ser negativo.");
    await user.click(screen.getByLabelText("Valor fixo em reais"));
    expect(espiao).toHaveBeenLastCalledWith({ ...fixa, valor: "500" });
    expect((screen.getByLabelText("Valor fixado") as HTMLInputElement).value).toBe("500,00");
  });
});
