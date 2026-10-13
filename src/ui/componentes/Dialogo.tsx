import { useEffect, useId, useRef, type ReactNode } from "react";

const FOCAVEIS =
  'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/**
 * Painel modal acessível, sem `<dialog>` nativo (o jsdom dos testes não o implementa): papel
 * "dialog" com `aria-modal`, título ligado por `aria-labelledby`, foco no primeiro campo ao abrir
 * e de volta ao botão que abriu ao fechar, Esc fecha, Tab circula dentro do painel e um clique no
 * fundo fecha. Nenhuma janela pop-up do navegador (§9.4).
 */
export function Dialogo({
  titulo,
  aberto,
  aoFechar,
  children,
}: {
  titulo: string;
  aberto: boolean;
  aoFechar: () => void;
  children: ReactNode;
}) {
  const tituloId = useId();
  const painel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement;
    painel.current?.querySelector<HTMLElement>(FOCAVEIS)?.focus();
    return () => {
      if (anterior instanceof HTMLElement) anterior.focus();
    };
  }, [aberto]);

  if (!aberto) return null;

  const aoTeclar = (evento: React.KeyboardEvent<HTMLDivElement>) => {
    if (evento.key === "Escape") {
      evento.stopPropagation();
      aoFechar();
      return;
    }
    if (evento.key !== "Tab" || !painel.current) return;
    const focaveis = [...painel.current.querySelectorAll<HTMLElement>(FOCAVEIS)];
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (!primeiro || !ultimo) return;
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  };

  return (
    <div
      className="dialogo-fundo"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) aoFechar();
      }}
    >
      <div
        className="dialogo"
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        ref={painel}
        onKeyDown={aoTeclar}
      >
        <h2 id={tituloId}>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}
