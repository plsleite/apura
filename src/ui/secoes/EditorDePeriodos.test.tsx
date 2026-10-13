// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Metodologia } from "../../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../../metodologias/padrao.ts";
import { Dialogo } from "../componentes/Dialogo.tsx";
import { EditorDePeriodos } from "./EditorDePeriodos.tsx";

afterEach(cleanup);

function Harness({ inicial, espiao }: { inicial: Metodologia; espiao: (m: Metodologia) => void }) {
  const [metodologia, setMetodologia] = useState(inicial);
  return (
    <EditorDePeriodos
      metodologia={metodologia}
      aoMudar={(m) => {
        setMetodologia(m);
        espiao(m);
      }}
    />
  );
}

function NoPainel() {
  const [metodologia, setMetodologia] = useState(metodologiaPadrao());
  const [aberto, setAberto] = useState(true);
  return (
    <Dialogo titulo="Períodos de teste" aberto={aberto} aoFechar={() => setAberto(false)}>
      <EditorDePeriodos metodologia={metodologia} aoMudar={setMetodologia} />
    </Dialogo>
  );
}

function titulos(): string[] {
  return screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent ?? "");
}

describe("Editor de períodos (§6.5)", () => {
  it("mostra os períodos da metodologia padrão; divide numa data e remove a divisão", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    render(<Harness inicial={metodologiaPadrao()} espiao={espiao} />);
    expect(titulos()).toEqual(["Período 1 · Até 29/08/2024", "Período 2 · Desde 30/08/2024"]);
    expect(screen.queryByRole("button", { name: /Restaurar/ })).toBeNull();
    fireEvent.change(screen.getByLabelText("Dividir em uma data"), {
      target: { value: "2023-01-01" },
    });
    await user.click(screen.getByRole("button", { name: "Dividir" }));
    expect(titulos()).toEqual([
      "Período 1 · Até 31/12/2022",
      "Período 2 · De 01/01/2023 a 29/08/2024",
      "Período 3 · Desde 30/08/2024",
    ]);
    expect(espiao.mock.lastCall?.[0].ajustada).toBe(true);
    // dividir de novo na mesma data avisa e não muda nada
    await user.click(screen.getByRole("button", { name: "Dividir" }));
    expect(screen.getByRole("alert").textContent).toBe("Já existe uma divisão em 01/01/2023.");
    expect(titulos()).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "Remover a divisão de 01/01/2023" }));
    expect(titulos()).toEqual(["Período 1 · Até 29/08/2024", "Período 2 · Desde 30/08/2024"]);
    expect(espiao.mock.lastCall?.[0]).toEqual(metodologiaPadrao());
  });

  it("troca índice, juros e taxa de um período; a taxa inválida fica no campo com erro", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    render(<Harness inicial={metodologiaPadrao()} espiao={espiao} />);
    const indices = screen.getAllByLabelText("Índice de correção");
    await user.selectOptions(indices[0] as HTMLElement, "INPC");
    expect(espiao.mock.lastCall?.[0].periodos[0].correcao).toEqual({ indice: "INPC" });
    const taxas = screen.getAllByLabelText("Taxa mensal (%)");
    expect(taxas).toHaveLength(1);
    await user.clear(taxas[0] as HTMLElement);
    await user.type(taxas[0] as HTMLElement, "0,5");
    expect(espiao.mock.lastCall?.[0].periodos[0].juros).toEqual({
      tipo: "percentualMensal",
      taxaMensal: "0.5",
    });
    await user.type(taxas[0] as HTMLElement, "x");
    await user.tab();
    expect(screen.getByRole("alert").textContent).toContain("Use vírgula");
    expect(espiao.mock.lastCall?.[0].periodos[0].juros.taxaMensal).toBe("0.5");
    const juros = screen.getAllByLabelText("Juros");
    await user.selectOptions(juros[1] as HTMLElement, "percentualMensal");
    expect(espiao.mock.lastCall?.[0].periodos[1].juros).toEqual({
      tipo: "percentualMensal",
      taxaMensal: "1",
    });
    expect(screen.getAllByLabelText("Taxa mensal (%)")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: /Restaurar a metodologia padrão/ }));
    expect(espiao.mock.lastCall?.[0]).toEqual(metodologiaPadrao());
  });

  it("'SELIC única' é uma escolha só: zera o índice, trava o seletor e explica", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    render(<Harness inicial={metodologiaPadrao()} espiao={espiao} />);
    const juros = screen.getAllByLabelText("Juros");
    await user.selectOptions(juros[0] as HTMLElement, "selicUnica");
    expect(espiao.mock.lastCall?.[0].periodos[0]).toEqual({
      de: null,
      ate: "2024-08-29",
      correcao: { indice: "nenhum" },
      juros: { tipo: "selicUnica" },
    });
    const indices = screen.getAllByLabelText("Índice de correção") as HTMLSelectElement[];
    expect(indices[0]?.disabled).toBe(true);
    expect(indices[0]?.value).toBe("nenhum");
    expect(screen.getByText(/A SELIC capitalizada já inclui correção e juros/)).toBeDefined();
    expect(screen.queryByRole("region", { name: "Avisos da metodologia" })).toBeNull();
  });

  it("incidência e deflação; avisos de validação para uma metodologia com lacuna (vinda de arquivo)", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    const comLacuna: Metodologia = {
      ...metodologiaPadrao(),
      ajustada: true,
      periodos: [
        {
          de: null,
          ate: "2024-08-29",
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "1" },
        },
        { de: "2024-09-15", ate: null, correcao: { indice: "IPCA" }, juros: { tipo: "taxaLegal" } },
      ],
    };
    render(<Harness inicial={comLacuna} espiao={espiao} />);
    expect(screen.getByRole("region", { name: "Avisos da metodologia" }).textContent).toContain(
      "A metodologia não cobre o período de 30/08/2024 a 14/09/2024",
    );
    await user.click(screen.getByLabelText("só a partir do mês seguinte"));
    expect(espiao.mock.lastCall?.[0].incidenciaMesInicial).toBe("mesSeguinte");
    await user.click(screen.getByLabelText("ignorar os meses negativos"));
    expect(espiao.mock.lastCall?.[0].deflacao).toBe("zerarNegativos");
    await user.click(screen.getByLabelText("aplicar sem piso"));
    expect(espiao.mock.lastCall?.[0].deflacao).toBe("aplicarSemPiso");
  });

  it("no painel, depois de 'Remover divisão' e de 'Restaurar a metodologia padrão' (o botão some), Tab fica dentro e Esc fecha", async () => {
    const user = userEvent.setup();
    render(<NoPainel />);
    const dialogo = screen.getByRole("dialog", { name: "Períodos de teste" });
    fireEvent.change(screen.getByLabelText("Dividir em uma data"), {
      target: { value: "2023-01-01" },
    });
    await user.click(screen.getByRole("button", { name: "Dividir" }));
    await user.click(screen.getByRole("button", { name: "Remover a divisão de 01/01/2023" }));
    expect(dialogo.contains(document.activeElement)).toBe(true);
    await user.tab({ shift: true });
    expect(dialogo.contains(document.activeElement)).toBe(true);
    await user.selectOptions(
      screen.getAllByLabelText("Índice de correção")[0] as HTMLElement,
      "INPC",
    );
    await user.click(screen.getByRole("button", { name: /Restaurar a metodologia padrão/ }));
    expect(screen.queryByRole("button", { name: /Restaurar/ })).toBeNull();
    expect(dialogo.contains(document.activeElement)).toBe(true);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
