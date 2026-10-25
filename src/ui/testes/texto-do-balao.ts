import { screen, within } from "@testing-library/react";

/**
 * O texto inteiro do balão ⓘ já aberto do botão "Ajuda: <assunto>". Cada balão tem a sua região
 * de status (vazia enquanto fechado), por isso a busca é feita dentro do balão do botão.
 */
export function textoDoBalao(assunto: string): string {
  const botao = screen.getByRole("button", { name: `Ajuda: ${assunto}` });
  const balao = botao.closest(".ajuda-balao") as HTMLElement;
  return within(balao).getByRole("status").textContent ?? "";
}
