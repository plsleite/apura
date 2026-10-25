// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Base, FormaDaBase } from "../../compartilhado/tipos.ts";
import { baseUnica } from "../../motor/base.ts";
import type { FaltaDaBase } from "../estado/faltas.ts";
import App from "../App.tsx";
import { ambienteDeTeste } from "../testes/ambiente-de-teste.ts";
import { BaseDosAlimentos } from "./Base.tsx";

afterEach(cleanup);

const HOJE = "2026-10-11";
const fixa: FormaDaBase = {
  tipo: "valorFixo",
  valor: "",
  dataFixacao: HOJE,
  indiceReajuste: "nenhum",
  mesReajuste: 10,
};

/** A seção dentro de um estado de verdade (como no App): cada mudança válida volta como `base`. */
function Harness({
  inicial,
  espiao,
  faltas,
}: {
  inicial: Base | FormaDaBase;
  espiao: (base: Base) => void;
  faltas?: FaltaDaBase[];
}) {
  const [base, setBase] = useState<Base>("periodos" in inicial ? inicial : baseUnica(inicial));
  return (
    <BaseDosAlimentos
      base={base}
      hoje={HOJE}
      faltas={faltas}
      aoMudar={(nova) => {
        setBase(nova);
        espiao(nova);
      }}
    />
  );
}

/** A forma que a última mudança gravou no período `indice`. */
function ultimaForma(espiao: ReturnType<typeof vi.fn>, indice = 0): FormaDaBase | undefined {
  const base = espiao.mock.lastCall?.[0] as Base | undefined;
  return base?.periodos[indice]?.forma;
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
    expect(ultimaForma(espiao)).toEqual({ ...fixa, indiceReajuste: "IPCA" });
    expect((screen.getByLabelText("Mês do reajuste") as HTMLSelectElement).value).toBe("10");
    await user.click(screen.getByRole("button", { name: "Ajuda: Reajuste anual" }));
    expect(screen.getByText(/reajustado a cada 12 meses/)).toBeDefined();
    await user.selectOptions(screen.getByLabelText("Mês do reajuste"), "3");
    expect(ultimaForma(espiao)).toEqual({ ...fixa, indiceReajuste: "IPCA", mesReajuste: 3 });
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
    expect(ultimaForma(espiao)).toEqual({ ...fixa, valor: "1000.00" });
    espiao.mockClear();
    await user.type(screen.getByLabelText("Valor fixado"), ",");
    expect(espiao).not.toHaveBeenCalled();
    // o erro de formato aparece ao sair do campo (decisão de 13/10/2026)
    expect(screen.queryByRole("alert")).toBeNull();
    await user.tab();
    expect(screen.getByRole("alert").textContent).toContain("Use vírgula para os centavos");
    fireEvent.change(screen.getByLabelText("Fixado em"), { target: { value: "2024-03-15" } });
    expect(ultimaForma(espiao)).toEqual({
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
    expect(ultimaForma(espiao)).toEqual({
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
    expect(ultimaForma(espiao)).toEqual({
      tipo: "percentualRendimentos",
      percentual: "",
      rendimentoPadrao: "",
    });
    expect(screen.queryByLabelText("Valor fixado")).toBeNull();
    await user.type(screen.getByLabelText("Percentual dos rendimentos"), "30");
    await user.type(screen.getByLabelText("Rendimento mensal padrão (obrigatório)"), "1500");
    expect(ultimaForma(espiao)).toEqual({
      tipo: "percentualRendimentos",
      percentual: "30",
      rendimentoPadrao: "1500",
    });
    await user.clear(screen.getByLabelText("Rendimento mensal padrão (obrigatório)"));
    await user.tab();
    expect(screen.getByRole("alert").textContent).toBe("Informe um número.");
    await user.click(screen.getByLabelText("% do salário mínimo"));
    expect(ultimaForma(espiao)).toEqual({ tipo: "percentualSalarioMinimo", percentual: "" });
    expect(screen.queryByLabelText("Percentual dos rendimentos")).toBeNull();
    await user.type(screen.getByLabelText("Percentual do salário mínimo"), "-1");
    await user.tab();
    expect(screen.getByRole("alert").textContent).toBe("O percentual não pode ser negativo.");
    await user.click(screen.getByLabelText("Valor fixo em reais"));
    expect(ultimaForma(espiao)).toEqual({ ...fixa, valor: "500" });
    expect((screen.getByLabelText("Valor fixado") as HTMLInputElement).value).toBe("500,00");
  });

  it('a divisão fica recolhida num botão discreto, que abre "Dividir em" com o foco na data (§21.5)', async () => {
    const user = userEvent.setup();
    render(<Harness inicial={fixa} espiao={vi.fn()} />);
    expect(screen.queryByRole("group", { name: /^(Até|Desde|De) / })).toBeNull();
    expect(screen.queryByText("A base mudou ao longo do tempo?")).toBeNull();
    expect(screen.queryByLabelText("Dividir em")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Dividir a base em períodos" }));
    expect(document.activeElement).toBe(screen.getByLabelText("Dividir em"));
    expect(screen.getByRole("button", { name: "Dividir" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Dividir a base em períodos" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Ajuda: Dividir em" }));
    expect(
      screen.getByText(/A data informada passa a iniciar um período novo da base/),
    ).toBeDefined();
  });

  it("depois de dividir, o campo recolhe e o foco volta ao botão; com erro, o campo fica aberto (§21.5)", async () => {
    const user = userEvent.setup();
    render(<Harness inicial={{ ...fixa, valor: "500.00" }} espiao={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Dividir a base em períodos" }));
    fireEvent.change(screen.getByLabelText("Dividir em"), { target: { value: "2025-01-01" } });
    await user.click(screen.getByRole("button", { name: "Dividir" }));
    expect(screen.queryByLabelText("Dividir em")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Dividir a base em períodos" }),
    );
    // a mesma data de novo: o aviso embaixo do campo, que continua aberto
    await user.click(screen.getByRole("button", { name: "Dividir a base em períodos" }));
    fireEvent.change(screen.getByLabelText("Dividir em"), { target: { value: "2025-01-01" } });
    await user.click(screen.getByRole("button", { name: "Dividir" }));
    expect(screen.getByRole("alert").textContent).toBe("Já existe uma divisão em 01/01/2025.");
    expect(screen.getByLabelText("Dividir em")).toBeDefined();
  });

  it("dividir: um bloco por período, com título; o novo nasce como cópia; trocar a forma de um não mexe no outro", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    render(
      <Harness
        inicial={{ ...fixa, valor: "500.00", dataFixacao: "2024-03-10", mesReajuste: 3 }}
        espiao={espiao}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Dividir a base em períodos" }));
    fireEvent.change(screen.getByLabelText("Dividir em"), { target: { value: "2025-01-01" } });
    await user.click(screen.getByRole("button", { name: "Dividir" }));
    const primeiro = within(screen.getByRole("group", { name: "Até 31/12/2024" }));
    const segundo = within(screen.getByRole("group", { name: "Desde 01/01/2025" }));
    expect((primeiro.getByLabelText("Valor fixado") as HTMLInputElement).value).toBe("500,00");
    expect((segundo.getByLabelText("Valor fixado") as HTMLInputElement).value).toBe("500,00");
    expect(primeiro.queryByRole("button", { name: /Remover/ })).toBeNull();
    await user.click(segundo.getByLabelText("% do salário mínimo"));
    await user.type(segundo.getByLabelText("Percentual do salário mínimo"), "30");
    expect(espiao.mock.lastCall?.[0]).toEqual({
      periodos: [
        {
          de: null,
          ate: "2024-12-31",
          forma: { ...fixa, valor: "500.00", dataFixacao: "2024-03-10", mesReajuste: 3 },
        },
        {
          de: "2025-01-01",
          ate: null,
          forma: { tipo: "percentualSalarioMinimo", percentual: "30" },
        },
      ],
    });
    expect((primeiro.getByLabelText("Valor fixo em reais") as HTMLInputElement).checked).toBe(true);
    // a mesma data de novo não divide
    await user.click(screen.getByRole("button", { name: "Dividir a base em períodos" }));
    fireEvent.change(screen.getByLabelText("Dividir em"), { target: { value: "2025-01-01" } });
    await user.click(screen.getByRole("button", { name: "Dividir" }));
    expect(screen.getByRole("alert").textContent).toBe("Já existe uma divisão em 01/01/2025.");
    expect(screen.getAllByRole("group", { name: /^(Até|Desde|De) / })).toHaveLength(2);
  });

  it('período que não é o primeiro passado a valor fixo: "Fixado em" vem com a data de início do período', async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    const inicial: Base = {
      periodos: [
        {
          de: null,
          ate: "2024-12-31",
          forma: { tipo: "percentualSalarioMinimo", percentual: "30" },
        },
        {
          de: "2025-01-01",
          ate: null,
          forma: { tipo: "percentualSalarioMinimo", percentual: "30" },
        },
      ],
    };
    render(<Harness inicial={inicial} espiao={espiao} />);
    const segundo = within(screen.getByRole("group", { name: "Desde 01/01/2025" }));
    await user.click(segundo.getByLabelText("Valor fixo em reais"));
    expect((segundo.getByLabelText("Fixado em") as HTMLInputElement).value).toBe("2025-01-01");
    expect(ultimaForma(espiao, 1)).toEqual({
      tipo: "valorFixo",
      valor: "",
      dataFixacao: "2025-01-01",
      indiceReajuste: "nenhum",
      mesReajuste: 1,
    });
  });

  it("remover a divisão: o período some, e o anterior se estende até o fim dele, com as regras dele", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    const inicial: Base = {
      periodos: [
        {
          de: null,
          ate: "2024-12-31",
          forma: { tipo: "percentualSalarioMinimo", percentual: "25" },
        },
        {
          de: "2025-01-01",
          ate: "2025-06-30",
          forma: { tipo: "percentualSalarioMinimo", percentual: "30" },
        },
        {
          de: "2025-07-01",
          ate: null,
          forma: { tipo: "percentualSalarioMinimo", percentual: "35" },
        },
      ],
    };
    render(<Harness inicial={inicial} espiao={espiao} />);
    await user.click(screen.getByRole("button", { name: "Remover a divisão de 01/07/2025" }));
    expect(espiao.mock.lastCall?.[0]).toEqual({
      periodos: [
        {
          de: null,
          ate: "2024-12-31",
          forma: { tipo: "percentualSalarioMinimo", percentual: "25" },
        },
        {
          de: "2025-01-01",
          ate: null,
          forma: { tipo: "percentualSalarioMinimo", percentual: "30" },
        },
      ],
    });
    const segundo = within(screen.getByRole("group", { name: "Desde 01/01/2025" }));
    expect((segundo.getByLabelText("Percentual do salário mínimo") as HTMLInputElement).value).toBe(
      "30",
    );
    await user.click(screen.getByRole("button", { name: "Remover a divisão de 01/01/2025" }));
    expect(screen.queryByRole("group", { name: /^(Até|Desde|De) / })).toBeNull();
    expect((screen.getByLabelText("Percentual do salário mínimo") as HTMLInputElement).value).toBe(
      "25",
    );
  });

  it("a primeira divisão e a remoção da última não perdem o que foi digitado nas outras formas do primeiro período", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    render(<Harness inicial={fixa} espiao={espiao} />);
    await user.type(screen.getByLabelText("Valor fixado"), "500");
    await user.click(screen.getByLabelText("% do salário mínimo"));
    await user.type(screen.getByLabelText("Percentual do salário mínimo"), "30");
    await user.click(screen.getByRole("button", { name: "Dividir a base em períodos" }));
    fireEvent.change(screen.getByLabelText("Dividir em"), { target: { value: "2025-01-01" } });
    await user.click(screen.getByRole("button", { name: "Dividir" }));
    const primeiro = within(screen.getByRole("group", { name: "Até 31/12/2024" }));
    await user.click(primeiro.getByLabelText("Valor fixo em reais"));
    expect((primeiro.getByLabelText("Valor fixado") as HTMLInputElement).value).toBe("500,00");
    expect(ultimaForma(espiao)).toEqual({ ...fixa, valor: "500" });
    await user.click(primeiro.getByLabelText("% do salário mínimo"));
    await user.click(screen.getByRole("button", { name: "Remover a divisão de 01/01/2025" }));
    await user.click(screen.getByLabelText("Valor fixo em reais"));
    expect((screen.getByLabelText("Valor fixado") as HTMLInputElement).value).toBe("500,00");
  });

  it("uma mudança vinda de fora (o rendimento aplicado pelo lápis) não é desfeita ao trocar a forma e voltar", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    const rendimentos = (padrao: string): Base =>
      baseUnica({ tipo: "percentualRendimentos", percentual: "30", rendimentoPadrao: padrao });
    const { rerender } = render(
      <BaseDosAlimentos base={rendimentos("2000.00")} hoje={HOJE} aoMudar={espiao} />,
    );
    rerender(<BaseDosAlimentos base={rendimentos("2500.00")} hoje={HOJE} aoMudar={espiao} />);
    await user.click(screen.getByLabelText("% do salário mínimo"));
    rerender(
      <BaseDosAlimentos
        base={baseUnica({ tipo: "percentualSalarioMinimo", percentual: "" })}
        hoje={HOJE}
        aoMudar={espiao}
      />,
    );
    await user.click(screen.getByLabelText("% dos rendimentos"));
    expect(ultimaForma(espiao)).toEqual({
      tipo: "percentualRendimentos",
      percentual: "30",
      rendimentoPadrao: "2500.00",
    });
  });

  it("o campo que falta fica em vermelho só no bloco do período apontado", () => {
    const inicial: Base = {
      periodos: [
        { de: null, ate: "2024-12-31", forma: { tipo: "percentualSalarioMinimo", percentual: "" } },
        { de: "2025-01-01", ate: null, forma: { tipo: "percentualSalarioMinimo", percentual: "" } },
      ],
    };
    const falta: FaltaDaBase = {
      periodo: 1,
      campo: "percentual",
      erro: "Informe o percentual.",
      aviso: "",
    };
    render(<Harness inicial={inicial} espiao={vi.fn()} faltas={[falta]} />);
    const primeiro = within(screen.getByRole("group", { name: "Até 31/12/2024" }));
    const segundo = within(screen.getByRole("group", { name: "Desde 01/01/2025" }));
    expect(primeiro.queryByRole("alert")).toBeNull();
    expect(segundo.getByRole("alert").textContent).toBe("Informe o percentual.");
  });

  it("no App: dividir a base muda só as prestações do período novo, e a memória diz qual período valeu", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    await user.type(screen.getByLabelText("Valor fixado"), "500");
    fireEvent.change(screen.getByLabelText("Fixado em"), { target: { value: "2024-03-10" } });
    const lote = within(screen.getByRole("region", { name: /4 · Prestações em atraso/ }));
    fireEvent.change(lote.getByLabelText("Primeiro vencimento"), {
      target: { value: "2024-11-05" },
    });
    fireEvent.change(lote.getByLabelText("Último vencimento"), { target: { value: "2025-02-05" } });
    await user.click(lote.getByRole("button", { name: "Lançar em lote" }));
    const valores = () =>
      within(screen.getByRole("region", { name: "Prestações" }))
        .getAllByRole("row")
        .slice(1, 5)
        .map((r) => within(r).getAllByRole("cell")[1]?.textContent);
    expect(valores()).toEqual(["R$ 500,00", "R$ 500,00", "R$ 500,00", "R$ 500,00"]);
    await user.click(screen.getByRole("button", { name: "Dividir a base em períodos" }));
    fireEvent.change(screen.getByLabelText("Dividir em"), { target: { value: "2025-01-01" } });
    await user.click(screen.getByRole("button", { name: "Dividir" }));
    const segundo = within(screen.getByRole("group", { name: "Desde 01/01/2025" }));
    await user.click(segundo.getByLabelText("% do salário mínimo"));
    // percentual em branco: o aviso diz qual período
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).toContain(
      "Falta o percentual do salário mínimo no período desde 01/01/2025 (seção 2 · Base dos alimentos)",
    );
    await user.type(segundo.getByLabelText("Percentual do salário mínimo"), "30");
    expect(valores()).toEqual(["R$ 500,00", "R$ 500,00", "R$ 455,40", "R$ 455,40"]);
    await user.click(screen.getByRole("button", { name: "Memória da prestação de 05/01/2025" }));
    const memoria = (
      screen.getByText("Memória · prestação de 05/01/2025").closest("tr") as HTMLElement
    ).textContent;
    expect(memoria).toContain(
      "Base desde 01/01/2025: 30% do salário mínimo de jan/2025 (R$ 1.518,00) = R$ 455,40",
    );
    expect(memoria).not.toContain("Base: Base");
  });
});
