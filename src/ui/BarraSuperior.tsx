/** Barra superior (§9.1): nome do sistema e as quatro ações. "Relatório / PDF" chega na fase 6. */
export function BarraSuperior({
  aoNovo,
  aoAbrir,
  aoSalvar,
}: {
  aoNovo?: () => void;
  aoAbrir?: () => void;
  aoSalvar?: () => void;
}) {
  return (
    <header className="barra">
      <h1 className="marca">
        Apura <small>· Sistema de Cálculos Judiciais · DPE-MS</small>
      </h1>
      <nav className="acoes-principais" aria-label="Ações do cálculo">
        <button type="button" className="botao-barra" onClick={aoNovo}>
          Novo cálculo
        </button>
        <button type="button" className="botao-barra" onClick={aoAbrir}>
          Abrir
        </button>
        <button type="button" className="botao-barra" onClick={aoSalvar}>
          Salvar
        </button>
        <button
          type="button"
          className="botao-barra principal"
          disabled
          title="O relatório em tela e PDF chega na próxima versão."
        >
          Relatório / PDF
        </button>
      </nav>
    </header>
  );
}
