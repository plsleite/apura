import { useAnuncio } from "./anuncio.ts";

/**
 * Regiões vivas da tela (§18.6), fora das colunas (que "Abrir" e "Novo cálculo" remontam): cerca de
 * um segundo depois da última mudança, o leitor de tela anuncia o total geral ("Total geral:
 * R$ 2.497,35") e, quando muda a quantidade de avisos, quantos são ("2 avisos no cálculo"). Ao
 * abrir a página, nada.
 */
export function Anuncios({ totalGeral, avisos }: { totalGeral: string; avisos: number }) {
  const total = useAnuncio(`Total geral: ${totalGeral}`);
  const quantos = useAnuncio(
    avisos === 0
      ? "Nenhum aviso no cálculo"
      : avisos === 1
        ? "1 aviso no cálculo"
        : `${avisos} avisos no cálculo`,
  );
  return (
    <>
      <p className="oculto-acessivel anuncio-do-total" role="status">
        {total}
      </p>
      <p className="oculto-acessivel anuncio-dos-avisos" role="status">
        {quantos}
      </p>
    </>
  );
}
