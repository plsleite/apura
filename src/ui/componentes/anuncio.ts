import { useEffect, useRef, useState } from "react";

/** Quanto o anúncio espera, depois da última mudança, para não falar a cada tecla (§18.6). */
export const ESPERA_DO_ANUNCIO_MS = 1000;

/**
 * Texto para uma região viva (`role="status"`): fica vazio ao abrir e passa a `texto` quando ele
 * muda e fica parado por `ESPERA_DO_ANUNCIO_MS`; o leitor de tela lê a mudança. Comparar com o
 * último texto visto (e não contar renderizações) mantém o anúncio calado também no modo estrito
 * do React, que roda os efeitos duas vezes ao montar.
 */
export function useAnuncio(texto: string): string {
  const [anuncio, setAnuncio] = useState("");
  const visto = useRef(texto);
  useEffect(() => {
    if (texto === visto.current) return;
    visto.current = texto;
    const espera = setTimeout(() => setAnuncio(texto), ESPERA_DO_ANUNCIO_MS);
    return () => clearTimeout(espera);
  }, [texto]);
  return anuncio;
}
