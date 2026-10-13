// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { formatarMoedaParaCampo, lerValorPositivo } from "../entrada.ts";
import { CampoTexto, useCampoValidado } from "./Campo.tsx";

afterEach(cleanup);

/** Um valor em reais guardado no "estado" (texto decimal) e um botão que o muda por fora. */
function Exemplo() {
  const [valor, setValor] = useState("100.00");
  const campo = useCampoValidado({
    valorGuardado: valor,
    paraTexto: formatarMoedaParaCampo,
    ler: lerValorPositivo,
    aoValidar: setValor,
  });
  return (
    <div>
      <CampoTexto
        id="valor"
        rotulo="Valor"
        valor={campo.texto}
        aoMudar={campo.aoMudar}
        aoSair={campo.aoSair}
        erro={campo.erro}
        ajuda="Use vírgula para os centavos."
      />
      <output data-testid="estado">{valor}</output>
      <button type="button" onClick={() => setValor("2500.00")}>
        Mudar por fora
      </button>
    </div>
  );
}

describe("useCampoValidado + CampoTexto (validação inline, §9.4)", () => {
  it("mostra o valor formatado; só o que é válido vai para o estado; o erro aparece e some", async () => {
    const user = userEvent.setup();
    render(<Exemplo />);
    const campo = screen.getByLabelText("Valor") as HTMLInputElement;
    expect(campo.value).toBe("100,00");
    // sem erro, o campo não aponta para descrição alguma; a ajuda fica no botão ⓘ ao lado do rótulo
    expect(campo.getAttribute("aria-describedby")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Ajuda: Valor" }));
    expect(screen.getByText("Use vírgula para os centavos.")).toBeDefined();
    await user.clear(campo);
    await user.type(campo, "1.5");
    expect(screen.getByRole("alert").textContent).toBe(
      "Use vírgula para os centavos (ex.: 1.234,56 ou 1234,56).",
    );
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect(campo.getAttribute("aria-describedby")).toBe("valor-erro");
    // o estado guarda o último valor válido digitado ("1", antes do ponto), nunca o inválido
    expect(screen.getByTestId("estado").textContent).toBe("1");
    await user.clear(campo);
    await user.type(campo, "1.234,5");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByTestId("estado").textContent).toBe("1234.5");
    // ao sair do campo, o texto é reformatado
    fireEvent.blur(campo);
    expect(campo.value).toBe("1.234,50");
  });

  it("uma mudança vinda de fora atualiza o campo e limpa o erro", async () => {
    const user = userEvent.setup();
    render(<Exemplo />);
    const campo = screen.getByLabelText("Valor") as HTMLInputElement;
    await user.clear(campo);
    await user.type(campo, "x");
    expect(screen.getByRole("alert")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Mudar por fora" }));
    expect(campo.value).toBe("2.500,00");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
