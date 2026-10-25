import type { Ref } from "react";
import { TEMAS, type Tema } from "./preferencias.ts";

/** O tema seguinte na volta do botão: igual ao computador → claro → escuro → igual ao computador. */
export function proximoTema(tema: Tema): Tema {
  return TEMAS[(TEMAS.indexOf(tema) + 1) % TEMAS.length] ?? "sistema";
}

const ICONE_DO_TEMA: Record<Tema, "sol" | "lua" | "meio"> = {
  sistema: "meio",
  claro: "sol",
  escuro: "lua",
};

const NOME_DO_TEMA: Record<Tema, string> = {
  sistema: "igual ao computador",
  claro: "claro",
  escuro: "escuro",
};

/**
 * O ícone do botão de tema (§21.7), que mostra o tema de agora: sol (claro), lua (escuro) e um
 * círculo com a metade esquerda cheia, como ◐ (igual ao computador). Desenhado em SVG, com
 * `currentColor`, para acompanhar a cor do botão e valer nos dois temas e em qualquer fonte; é
 * enfeite: o nome do botão vai no `aria-label`.
 */
function IconeDoTema({ tema }: { tema: Tema }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      data-icone={ICONE_DO_TEMA[tema]}
    >
      {tema === "claro" ? (
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
        </g>
      ) : tema === "escuro" ? (
        <path fill="currentColor" d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
      ) : (
        <g stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" fill="none" />
          <path fill="currentColor" d="M12 3a9 9 0 0 0 0 18z" />
        </g>
      )}
    </svg>
  );
}

/**
 * Barra superior (§9.1): logo da DPE-MS, nome do sistema, as quatro ações e o botão de tema, um
 * ícone que alterna a cada clique entre "igual ao computador", "claro" e "escuro" (decisão de
 * 13/10/2026; ícone, §21.7). "Relatório / PDF" fica desligado, com o motivo no `title`, sem
 * prestação ou com lançamento sem valor (§18.1).
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
  const descricaoDoTema = `Tema: ${NOME_DO_TEMA[tema]}. Clique para ${NOME_DO_TEMA[proximoTema(tema)]}.`;
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
        aria-label={descricaoDoTema}
        title={descricaoDoTema}
      >
        <IconeDoTema tema={tema} />
      </button>
    </header>
  );
}
