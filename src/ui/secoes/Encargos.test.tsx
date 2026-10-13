// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Calculo } from "../../compartilhado/tipos.ts";
import { novoCalculo } from "../estado/calculo.ts";
import { dividirPeriodo } from "../estado/metodologia.ts";
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
    />
  );
}

const inicial = novoCalculo({ id: "c", agora: "2026-10-11T15:00:00-03:00", hoje: "2026-10-11" });

describe("5 · Encargos e data do cálculo (§9.2)", () => {
  it("resume a metodologia em uma frase, com '(padrão)' quando é a padrão (sem citar outro sistema) e 'ajustada' quando não é", () => {
    render(<Harness inicial={inicial} espiao={vi.fn()} />);
    expect(screen.getByText(/Metodologia de encargos/).textContent).toBe(
      "Metodologia de encargos (padrão)",
    );
    expect(screen.getByText(/Até 29\/08\/2024/).textContent).toBe(
      "Até 29/08/2024: IGP-M e juros de 1% ao mês. Desde 30/08/2024: IPCA e taxa legal.",
    );
    cleanup();
    const ajustada = {
      ...inicial,
      metodologia: dividirPeriodo(inicial.metodologia, "2023-01-01").metodologia,
    };
    render(<Harness inicial={ajustada} espiao={vi.fn()} />);
    expect(screen.getByText(/Metodologia de encargos/).textContent).toBe(
      "Metodologia de encargos (ajustada)",
    );
    expect(screen.getByText(/Até 31\/12\/2022/)).toBeDefined();
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
    await user.type(screen.getByLabelText("Observações para o relatório"), "Conforme a sentença.");
    expect(espiao.mock.lastCall?.[0].observacoes).toBe("Conforme a sentença.");
    await user.click(screen.getByRole("button", { name: "Ajustar" }));
    expect(espiao.mock.lastCall?.[0].observacoes).toBe("ajustar!");
  });
});
