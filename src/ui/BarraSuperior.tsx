import type { Ref } from "react";
import { TEMAS, type Tema } from "./preferencias.ts";

/** O tema seguinte na volta do botão: do sistema → claro → escuro → do sistema. */
export function proximoTema(tema: Tema): Tema {
  return TEMAS[(TEMAS.indexOf(tema) + 1) % TEMAS.length] ?? "sistema";
}

const NOME_DO_TEMA: Record<Tema, string> = {
  sistema: "do sistema",
  claro: "claro",
  escuro: "escuro",
};

/**
 * Barra superior (§9.1): logo da DPE-MS, nome do sistema, as quatro ações e o botão de tema, que alterna a cada
 * clique entre "do sistema", "claro" e "escuro" (decisão de 13/10/2026). "Relatório / PDF" fica
 * desligado, com o motivo no `title`, sem prestação ou com lançamento sem valor (§18.1).
 */
export function BarraSuperior({
  aoNovo,
  aoAbrir,
  aoSalvar,
  aoRelatorio,
  bloqueioDoRelatorio = null,
  refDoRelatorio,
  tema = "sistema",
  aoMudarTema,
}: {
  aoNovo?: () => void;
  aoAbrir?: () => void;
  aoSalvar?: () => void;
  aoRelatorio?: () => void;
  /** por que o relatório não pode abrir (vai para o `title`), ou nulo */
  bloqueioDoRelatorio?: string | null;
  refDoRelatorio?: Ref<HTMLButtonElement>;
  tema?: Tema;
  aoMudarTema?: (tema: Tema) => void;
}) {
  return (
    <header className="barra">
      <div className="identidade">
        <img
          className="logo"
          src={`${import.meta.env.BASE_URL}logos/dpems-horizontal-branca.png`}
          width={368}
          height={88}
          alt="Defensoria Pública de Mato Grosso do Sul"
        />
        <h1 className="marca">
          Apura<span className="oculto-acessivel"> · </span>
          <small>
            Sistema de Cálculos Judiciais<span className="oculto-acessivel"> · DPE-MS</span>
          </small>
        </h1>
      </div>
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
          ref={refDoRelatorio}
          type="button"
          className="botao-barra relatorio"
          disabled={aoRelatorio === undefined || bloqueioDoRelatorio !== null}
          title={bloqueioDoRelatorio ?? undefined}
          onClick={aoRelatorio}
        >
          Relatório / PDF
        </button>
      </nav>
      <button
        type="button"
        className="botao-barra botao-tema"
        onClick={() => aoMudarTema?.(proximoTema(tema))}
        title={`Clique para mudar para o tema ${NOME_DO_TEMA[proximoTema(tema)]}`}
      >
        Tema {NOME_DO_TEMA[tema]}
      </button>
    </header>
  );
}
