import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/**
 * Ajuda sob demanda (decisão de 13/10/2026, no lugar dos textos sempre visíveis da §9.4): o
 * "toggletip" das boas práticas de acessibilidade. Um botão ⓘ ao lado do título ou do campo abre
 * um balão curto com clique, toque, Enter ou Espaço; Esc, um novo clique ou qualquer clique ou
 * foco fora o fecham. O conteúdo entra numa região `role="status"`, para o leitor de tela ler o
 * balão quando ele abre. Funciona sem mouse (o balão que só aparece ao passar o mouse não serve
 * no celular nem para quem usa teclado).
 */
export function Ajuda({ assunto, children }: { assunto: string; children: ReactNode }) {
  const [aberta, setAberta] = useState(false);
  const raiz = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!aberta) return;
    const fora = (evento: Event) => {
      if (evento.target instanceof Node && raiz.current?.contains(evento.target)) return;
      setAberta(false);
    };
    document.addEventListener("pointerdown", fora, true);
    document.addEventListener("focusin", fora);
    return () => {
      document.removeEventListener("pointerdown", fora, true);
      document.removeEventListener("focusin", fora);
    };
  }, [aberta]);
  const tecla = (evento: KeyboardEvent<HTMLSpanElement>) => {
    if (evento.key === "Escape" && aberta) {
      // não fecha o painel em volta (Dialogo), só o balão
      evento.stopPropagation();
      setAberta(false);
    }
  };
  return (
    <span className="ajuda-balao" ref={raiz} onKeyDown={tecla}>
      <button
        type="button"
        className="botao-ajuda"
        aria-expanded={aberta}
        aria-label={`Ajuda: ${assunto}`}
        onClick={() => setAberta(!aberta)}
      >
        ⓘ
      </button>
      <span role="status">{aberta ? <span className="balao">{children}</span> : null}</span>
    </span>
  );
}
