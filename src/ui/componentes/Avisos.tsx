/**
 * Caixa de avisos em frases completas (§9.3): só aparece quando há aviso. Recebe as frases já
 * prontas (do congelamento dos índices, do motor, do lote ou da abertura de um arquivo).
 */
export function Avisos({ avisos, titulo = "Avisos" }: { avisos: string[]; titulo?: string }) {
  if (avisos.length === 0) return null;
  return (
    <section className="avisos" aria-label={titulo}>
      <h2>{titulo}</h2>
      <ul>
        {avisos.map((aviso, i) => (
          <li key={`${i}-${aviso}`}>{aviso}</li>
        ))}
      </ul>
    </section>
  );
}
