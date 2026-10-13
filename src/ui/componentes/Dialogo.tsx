import { useEffect, useId, useRef, type ReactNode } from "react";

const FOCAVEIS =
  'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/**
 * Painel modal acessível, sem `<dialog>` nativo (o jsdom dos testes não o implementa): papel
 * "dialog" com `aria-modal`, título ligado por `aria-labelledby`, foco no primeiro campo ao abrir
 * e de volta ao botão que abriu ao fechar, Esc fecha, Tab circula dentro do painel e um clique no
 * fundo fecha. Nenhuma janela pop-up do navegador (§9.4).
 *
 * Esc e Tab não dependem de o foco estar num controle: o painel recebe o foco quando se clica no
 * título ou numa área vazia (`tabIndex={-1}`), o teclado é ouvido no documento enquanto o painel
 * está aberto, e o foco volta ao painel quando o controle focado some (ex.: "Remover divisão").
 * O Esc de um balão ⓘ dentro do painel fecha só o balão (o balão interrompe a propagação).
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
  const aoFecharAtual = useRef(aoFechar);
  useEffect(() => {
    aoFecharAtual.current = aoFechar;
  });

  useEffect(() => {
    if (!aberto) return;
    const elemento = painel.current;
    if (!elemento) return;
    const anterior = document.activeElement;
    (elemento.querySelector<HTMLElement>(FOCAVEIS) ?? elemento).focus();

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.stopPropagation();
        aoFecharAtual.current();
        return;
      }
      if (evento.key !== "Tab") return;
      const focaveis = [...elemento.querySelectorAll<HTMLElement>(FOCAVEIS)];
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const ativo = document.activeElement;
      if (!primeiro || !ultimo) {
        evento.preventDefault();
        elemento.focus();
      } else if (ativo === elemento || !(ativo instanceof Node) || !elemento.contains(ativo)) {
        evento.preventDefault();
        (evento.shiftKey ? ultimo : primeiro).focus();
      } else if (evento.shiftKey && ativo === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && ativo === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    };
    // o controle focado saiu da tela (o navegador manda o foco para o corpo da página)
    const devolverFoco = new MutationObserver(() => {
      const ativo = document.activeElement;
      if (ativo === null || ativo === document.body) elemento.focus();
    });
    devolverFoco.observe(elemento, { childList: true, subtree: true });
    document.addEventListener("keydown", aoTeclar);
    return () => {
      devolverFoco.disconnect();
      document.removeEventListener("keydown", aoTeclar);
      if (anterior instanceof HTMLElement) anterior.focus();
    };
  }, [aberto]);

  if (!aberto) return null;

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
        tabIndex={-1}
        ref={painel}
      >
        <h2 id={tituloId}>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}
