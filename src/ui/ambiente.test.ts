// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { baixarPeloNavegador } from "./ambiente.ts";

describe("download do arquivo pelo navegador (§19.7, item 9)", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("revoga o endereço provisório só um minuto depois do clique (o Safari perde o download se ele some antes)", () => {
    vi.useFakeTimers();
    const criar = vi.fn(() => "blob:apura/1");
    const revogar = vi.fn();
    vi.stubGlobal(
      "URL",
      Object.assign(class extends URL {}, { createObjectURL: criar, revokeObjectURL: revogar }),
    );
    const clique = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    baixarPeloNavegador("Apura – teste.json", "{}");

    expect(criar).toHaveBeenCalledTimes(1);
    expect(clique).toHaveBeenCalledTimes(1);
    const ancora = clique.mock.contexts[0] as HTMLAnchorElement;
    expect(ancora.download).toBe("Apura – teste.json");
    expect(ancora.getAttribute("href")).toBe("blob:apura/1");
    expect(document.body.contains(ancora)).toBe(false);
    expect(revogar).not.toHaveBeenCalled();
    vi.advanceTimersByTime(59_999);
    expect(revogar).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revogar).toHaveBeenCalledWith("blob:apura/1");
  });
});
