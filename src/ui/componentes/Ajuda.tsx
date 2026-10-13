import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

/**
 * Ajuda sob demanda (decisão de 13/10/2026, no lugar dos textos sempre visíveis da §9.4): o
 * "toggletip" das boas práticas de acessibilidade. Um botão ⓘ ao lado do título ou do campo abre
 * um balão curto com clique, toque, Enter ou Espaço; Esc, um novo clique ou qualquer clique ou
 * foco fora o fecham. O conteúdo entra numa região `role="status"`, para o leitor de tela ler o
 * balão quando ele abre. Funciona sem mouse (o balão que só aparece ao passar o mouse não serve
 * no celular nem para quem usa teclado). O botão pode mostrar outro conteúdo no lugar do ⓘ e ter
 * outro nome (as etiquetas da tabela, §17.4), e o balão pode flutuar em posição fixa, para não
 * ficar preso na rolagem da tabela.
 */
export function Ajuda({
  assunto,
  children,
  nome,
  conteudoDoBotao = "ⓘ",
  classe = "botao-ajuda",
  flutuante = false,
}: {
  assunto: string;
  children: ReactNode;
  /** nome do botão para o leitor de tela; padrão: "Ajuda: <assunto>" */
  nome?: string;
  /** o que o botão mostra; padrão: ⓘ (as etiquetas da tabela mostram a etiqueta, §17.4) */
  conteudoDoBotao?: ReactNode;
  classe?: string;
  /**
   * balão em posição fixa, junto do botão (embaixo ou, se não couber, em cima), para não ficar
   * preso numa área com rolagem própria (a tabela); fecha ao rolar a página
   */
  flutuante?: boolean;
}) {
  const [aberta, setAberta] = useState(false);
  // posição do balão flutuante: abaixo do botão ou, se não couber, acima dele
  const [posicao, setPosicao] = useState<{
    topo: number;
    acima: number;
    esquerda: number;
  } | null>(null);
  const raiz = useRef<HTMLSpanElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const balao = useRef<HTMLSpanElement>(null);
  // medido o balão (antes de a tela ser pintada), ele sobe para cima do botão quando não cabe
  // embaixo e cabe em cima
  useLayoutEffect(() => {
    if (!aberta || posicao === null || balao.current === null) return;
    const altura = balao.current.getBoundingClientRect().height;
    const naoCabeEmbaixo = posicao.topo + altura > window.innerHeight - 8;
    const cabeEmCima = posicao.acima - altura >= 8;
    if (naoCabeEmbaixo && cabeEmCima && posicao.topo !== posicao.acima - altura) {
      setPosicao({ ...posicao, topo: posicao.acima - altura });
    }
  }, [aberta, posicao]);
  useEffect(() => {
    if (!aberta) return;
    const fora = (evento: Event) => {
      if (evento.target instanceof Node && raiz.current?.contains(evento.target)) return;
      setAberta(false);
    };
    const rolou = () => setAberta(false);
    document.addEventListener("pointerdown", fora, true);
    document.addEventListener("focusin", fora);
    if (flutuante) window.addEventListener("scroll", rolou, true);
    return () => {
      document.removeEventListener("pointerdown", fora, true);
      document.removeEventListener("focusin", fora);
      window.removeEventListener("scroll", rolou, true);
    };
  }, [aberta, flutuante]);
  const alternar = () => {
    if (!aberta && flutuante && botao.current !== null) {
      const caixa = botao.current.getBoundingClientRect();
      // 356 = largura máxima do balão (340) + margem de 16 px até a borda da janela
      const esquerda = Math.max(16, Math.min(caixa.left - 10, window.innerWidth - 356));
      setPosicao({ topo: caixa.bottom + 6, acima: caixa.top - 6, esquerda });
    }
    setAberta(!aberta);
  };
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
        ref={botao}
        type="button"
        className={classe}
        aria-expanded={aberta}
        aria-label={nome ?? `Ajuda: ${assunto}`}
        onClick={alternar}
      >
        {conteudoDoBotao}
      </button>
      <span role="status">
        {aberta ? (
          flutuante && posicao !== null ? (
            <span
              ref={balao}
              className="balao flutuante"
              style={
                {
                  "--balao-topo": `${posicao.topo}px`,
                  "--balao-esquerda": `${posicao.esquerda}px`,
                } as CSSProperties
              }
            >
              {children}
            </span>
          ) : (
            <span className="balao">{children}</span>
          )
        ) : null}
      </span>
    </span>
  );
}
