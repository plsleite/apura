import { VERSAO } from "./versao.ts";

/** Rodapé (§9.3): situação dos índices, sem botão, e a versão do Apura. */
export function Rodape({ situacaoDosIndices }: { situacaoDosIndices: string }) {
  return (
    <footer className="rodape">
      <span>{situacaoDosIndices}</span>
      <span>Apura v{VERSAO} · Defensoria Pública de Mato Grosso do Sul</span>
    </footer>
  );
}
