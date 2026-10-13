import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useMascara } from "../componentes/Campo.tsx";

/**
 * Célula editável na própria tabela (decisão de 13/10/2026), no padrão das planilhas: o clique
 * (ou Enter, ou Espaço) torna o texto editável; Enter ou sair do campo (Tab, clique fora) grava;
 * Esc desiste. Editar não muda a tabela: o campo tem a largura, a letra e o alinhamento do texto
 * que substitui, só com um contorno (a data é digitada como dd/mm/aaaa, sem o calendário do
 * navegador, que alargaria a coluna). Texto inválido fica no campo, em vermelho, com o erro num
 * balão logo abaixo (sem empurrar a linha), e não é gravado. Texto igual ao inicial não grava nada
 * (não marca a linha como ajustada). Trocar de janela (conferir um PDF, por exemplo) não grava: o
 * campo continua aberto, como estava.
 */
export function CelulaEditavel({
  nome,
  exibido,
  textoInicial,
  inputMode,
  placeholder,
  mascara,
  aoGravar,
}: {
  /** nome do campo para o leitor de tela, ex.: "Valor da prestação de 05/09/2026" */
  nome: string;
  /** o que a célula mostra fora da edição */
  exibido: string;
  /** o texto com que o campo abre */
  textoInicial: string;
  inputMode?: "decimal" | "numeric";
  placeholder?: string;
  /** máscara de números aplicada enquanto se digita (data dd/mm/aaaa) */
  mascara?: (texto: string) => string;
  /** grava o texto; devolve a mensagem de erro, ou null quando gravou */
  aoGravar: (texto: string) => string | null;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(textoInicial);
  const [erro, setErro] = useState<string | null>(null);
  // largura do texto no momento do clique: o campo ocupa exatamente esse espaço
  const [largura, setLargura] = useState<number | null>(null);
  const { ref: campo, onChange } = useMascara({
    valor: texto,
    aoMudar: (novo) => {
      setTexto(novo);
      setErro(null);
    },
    mascara,
  });
  const botao = useRef<HTMLButtonElement>(null);
  // depois de Enter ou Esc o foco volta ao botão da célula (o teclado continua na tabela); depois
  // de sair do campo com Tab ou clique, fica onde a pessoa o pôs
  const voltarFoco = useRef(false);
  // o campo some ao gravar ou desistir: o blur que vier depois não grava de novo
  const encerrado = useRef(false);
  const idDoErro = useId();

  useEffect(() => {
    if (editando) {
      campo.current?.focus();
      campo.current?.select();
    } else if (voltarFoco.current) {
      voltarFoco.current = false;
      botao.current?.focus();
    }
  }, [editando, campo]);

  const abrir = () => {
    encerrado.current = false;
    const medida = botao.current?.getBoundingClientRect().width ?? 0;
    setLargura(medida > 0 ? medida : null);
    setTexto(textoInicial);
    setErro(null);
    setEditando(true);
  };
  const fechar = (comFoco: boolean) => {
    encerrado.current = true;
    voltarFoco.current = comFoco;
    setEditando(false);
  };
  const gravar = (comFoco: boolean) => {
    if (encerrado.current) return;
    if (texto === textoInicial) {
      fechar(comFoco);
      return;
    }
    const falha = aoGravar(texto);
    if (falha === null) fechar(comFoco);
    else setErro(falha);
  };
  const tecla = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key === "Enter") {
      evento.preventDefault();
      gravar(true);
    } else if (evento.key === "Escape") {
      evento.preventDefault();
      evento.stopPropagation();
      fechar(true);
    }
  };

  if (!editando) {
    return (
      <button
        type="button"
        className="celula-editavel"
        ref={botao}
        onClick={abrir}
        aria-label={`Editar ${nome.charAt(0).toLowerCase()}${nome.slice(1)} (${exibido})`}
        title="Clique para corrigir (Enter grava, Esc desiste)"
      >
        {exibido}
      </button>
    );
  }
  return (
    <span className="celula-em-edicao">
      <input
        ref={campo}
        type="text"
        value={texto}
        onChange={onChange}
        onKeyDown={tecla}
        onBlur={(evento) => {
          // a janela inteira perdeu o foco (troca de programa): nada é gravado pela metade; o
          // campo continua aberto e recebe o foco de volta quando a pessoa voltar
          const destino = evento.relatedTarget;
          if (destino === null && !document.hasFocus()) return;
          gravar(false);
          // gravar o vencimento pode mudar a linha de lugar, e o navegador tira o foco de um
          // elemento movido: o foco volta para onde o Tab ou o clique o levou
          if (destino instanceof HTMLElement) {
            requestAnimationFrame(() => {
              if (destino.isConnected && document.activeElement === document.body) destino.focus();
            });
          }
        }}
        style={largura === null ? undefined : { width: `${largura}px` }}
        aria-label={nome}
        aria-invalid={erro !== null}
        aria-describedby={erro === null ? undefined : idDoErro}
        inputMode={inputMode}
        placeholder={placeholder}
      />
      {erro !== null ? (
        <span className="erro" id={idDoErro} role="alert">
          {erro}
        </span>
      ) : null}
    </span>
  );
}
