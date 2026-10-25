import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type RefObject,
} from "react";
import type { Leitura } from "../entrada.ts";
import { Ajuda } from "./Ajuda.tsx";

/**
 * Campos de formulário com rótulo associado, ajuda sob demanda (botão ⓘ ao lado do rótulo, que
 * abre um balão; decisão de 13/10/2026) e erro inline (§9.4): nada de janelas pop-up.
 * `useCampoValidado` liga um campo de texto a um valor do estado: o que o usuário digita fica no
 * campo; só o que passa na leitura vai para o estado (o estado guarda o último valor válido), e o
 * erro de formato aparece embaixo ao sair do campo, até ser corrigido (decisão de 13/10/2026).
 * `useMascara` formata números enquanto se digita.
 */

interface PropriedadesComuns {
  id?: string;
  rotulo: string;
  ajuda?: ReactNode;
  erro?: string | null;
  /** classe extra do invólucro: "curto", "medio", "largo" */
  classe?: string;
}

function Envoltorio({
  id,
  rotulo,
  ajuda,
  erro,
  classe,
  children,
}: PropriedadesComuns & { children: ReactNode }) {
  return (
    <div className={`campo${classe ? ` ${classe}` : ""}`}>
      <span className="rotulo-do-campo">
        <label htmlFor={id}>{rotulo}</label>
        {ajuda ? <Ajuda assunto={rotulo}>{ajuda}</Ajuda> : null}
      </span>
      {children}
      {erro ? (
        <p className="erro" id={`${id}-erro`} role="alert">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

function descritoPor(id: string, erro?: string | null): string | undefined {
  return erro ? `${id}-erro` : undefined;
}

/**
 * Liga um `<input>` de texto a uma máscara de números (nº do processo, data dd/mm/aaaa). Sem
 * máscara, só repassa o texto. Com máscara, o texto digitado é formatado a cada tecla; o cursor
 * fica depois do mesmo dígito em que estava (editar no meio não o joga para o fim), e Backspace
 * logo depois de um separador (hífen, ponto, barra) apaga também o dígito antes dele.
 */
export function useMascara(opcoes: {
  valor: string;
  aoMudar: (texto: string) => void;
  mascara?: ((texto: string) => string) | undefined;
}): {
  ref: RefObject<HTMLInputElement | null>;
  onChange: (evento: ChangeEvent<HTMLInputElement>) => void;
} {
  const { valor, aoMudar, mascara } = opcoes;
  const ref = useRef<HTMLInputElement>(null);
  const cursor = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (cursor.current !== null && document.activeElement === ref.current) {
      ref.current?.setSelectionRange(cursor.current, cursor.current);
    }
    cursor.current = null;
  });
  const onChange = (evento: ChangeEvent<HTMLInputElement>) => {
    if (mascara === undefined) {
      aoMudar(evento.target.value);
      return;
    }
    let texto = evento.target.value;
    let posicao = evento.target.selectionStart ?? texto.length;
    const apagouSeparador =
      (evento.nativeEvent as InputEvent).inputType === "deleteContentBackward" &&
      texto.length === valor.length - 1 &&
      soDigitos(texto) === soDigitos(valor);
    if (apagouSeparador && posicao > 0) {
      texto = texto.slice(0, posicao - 1) + texto.slice(posicao);
      posicao -= 1;
    }
    const digitosAntes = soDigitos(texto.slice(0, posicao)).length;
    const formatado = mascara(texto);
    cursor.current = posicaoDepoisDosDigitos(formatado, digitosAntes);
    aoMudar(formatado);
  };
  return { ref, onChange };
}

const soDigitos = (texto: string) => texto.replace(/\D/g, "");

/** Posição logo depois do n-ésimo dígito do texto (0 = início). */
function posicaoDepoisDosDigitos(texto: string, n: number): number {
  if (n === 0) return 0;
  let vistos = 0;
  for (let i = 0; i < texto.length; i++) {
    if (/\d/.test(texto.charAt(i)) && ++vistos === n) return i + 1;
  }
  return texto.length;
}

export function CampoTexto({
  id: idDado,
  rotulo,
  valor,
  aoMudar,
  aoSair,
  tipo = "text",
  ajuda,
  erro,
  classe,
  mascara,
  ...resto
}: PropriedadesComuns & {
  valor: string;
  aoMudar: (texto: string) => void;
  aoSair?: () => void;
  tipo?: "text" | "date" | "number";
  min?: string;
  max?: string;
  inputMode?: "decimal" | "numeric" | "text";
  autoComplete?: string;
  placeholder?: string;
  disabled?: boolean;
  /** o React põe o foco no campo quando ele aparece (campos que abrem a pedido da pessoa) */
  autoFocus?: boolean;
  /**
   * máscara de números (ex.: nº do processo): recebe o texto digitado e devolve o formatado. O
   * cursor fica depois do mesmo dígito em que estava, e apagar um separador (hífen, ponto) com
   * Backspace apaga também o dígito antes dele
   */
  mascara?: (texto: string) => string;
}) {
  const idGerado = useId();
  const id = idDado ?? idGerado;
  const { ref: campo, onChange: mudar } = useMascara({ valor, aoMudar, mascara });
  return (
    <Envoltorio id={id} rotulo={rotulo} ajuda={ajuda} erro={erro} classe={classe}>
      <input
        id={id}
        ref={campo}
        type={tipo}
        value={valor}
        onChange={mudar}
        onBlur={aoSair}
        data-vazio={tipo === "date" && valor === "" ? "" : undefined}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritoPor(id, erro)}
        {...resto}
      />
    </Envoltorio>
  );
}

export function CampoArea({
  id: idDado,
  rotulo,
  valor,
  aoMudar,
  ajuda,
  erro,
  classe,
  linhas = 3,
  autoFocus,
}: PropriedadesComuns & {
  valor: string;
  aoMudar: (texto: string) => void;
  linhas?: number;
  /** o React põe o foco na caixa quando ela aparece (caixas que abrem a pedido da pessoa) */
  autoFocus?: boolean;
}) {
  const idGerado = useId();
  const id = idDado ?? idGerado;
  return (
    <Envoltorio id={id} rotulo={rotulo} ajuda={ajuda} erro={erro} classe={classe}>
      <textarea
        id={id}
        value={valor}
        rows={linhas}
        autoFocus={autoFocus}
        onChange={(e) => aoMudar(e.target.value)}
        aria-describedby={descritoPor(id, erro)}
      />
    </Envoltorio>
  );
}

export function CampoSelecao<T extends string>({
  id: idDado,
  rotulo,
  valor,
  opcoes,
  aoMudar,
  ajuda,
  erro,
  classe,
  disabled,
}: PropriedadesComuns & {
  valor: T;
  opcoes: ReadonlyArray<{ valor: T; rotulo: string }>;
  aoMudar: (valor: T) => void;
  disabled?: boolean;
}) {
  const idGerado = useId();
  const id = idDado ?? idGerado;
  return (
    <Envoltorio id={id} rotulo={rotulo} ajuda={ajuda} erro={erro} classe={classe}>
      <select
        id={id}
        value={valor}
        disabled={disabled}
        onChange={(e) => aoMudar(e.target.value as T)}
        aria-describedby={descritoPor(id, erro)}
      >
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
    </Envoltorio>
  );
}

export function Opcao({
  rotulo,
  marcado,
  aoMudar,
  tipo = "checkbox",
  nome,
}: {
  rotulo: string;
  marcado: boolean;
  aoMudar: (marcado: boolean) => void;
  tipo?: "checkbox" | "radio";
  nome?: string;
}) {
  return (
    <label>
      <input
        type={tipo}
        name={nome}
        checked={marcado}
        onChange={(e) => aoMudar(e.target.checked)}
      />
      {rotulo}
    </label>
  );
}

/**
 * Liga um campo de texto a um valor validado do estado. `valorGuardado` é o valor atual do
 * estado; `paraTexto` o mostra no campo; `ler` interpreta o que foi digitado; `aoValidar` recebe
 * só valores válidos (cada tecla que forma um valor válido já recalcula). Quando o estado muda por
 * fora (novo cálculo, arquivo aberto, sugestão de outro formulário), o campo acompanha; enquanto o
 * usuário digita, o texto é dele.
 *
 * O erro de formato (decisão de 13/10/2026) só aparece quando a pessoa sai do campo (`aoSair`)
 * com texto inválido: enquanto digita, nada fica vermelho e nada é anunciado. Depois de mostrado,
 * some assim que o texto volta a ser válido.
 */
export function useCampoValidado<T>(opcoes: {
  valorGuardado: T;
  paraTexto: (valor: T) => string;
  ler: (texto: string) => Leitura<T>;
  aoValidar: (valor: T) => void;
}): { texto: string; erro: string | null; aoMudar: (texto: string) => void; aoSair: () => void } {
  const [texto, setTexto] = useState(() => opcoes.paraTexto(opcoes.valorGuardado));
  const [erro, setErro] = useState<string | null>(null);
  const [erroVisivel, setErroVisivel] = useState(false);
  const [visto, setVisto] = useState(opcoes.valorGuardado);
  if (opcoes.valorGuardado !== visto) {
    // mudança vinda de fora (não do que acabamos de validar): o campo acompanha o estado
    setVisto(opcoes.valorGuardado);
    setTexto(opcoes.paraTexto(opcoes.valorGuardado));
    setErro(null);
    setErroVisivel(false);
  }
  return {
    texto,
    erro: erroVisivel ? erro : null,
    aoMudar: (novo) => {
      setTexto(novo);
      const leitura = opcoes.ler(novo);
      if (leitura.ok) {
        setErro(null);
        setErroVisivel(false);
        setVisto(leitura.valor);
        opcoes.aoValidar(leitura.valor);
      } else {
        setErro(leitura.erro);
      }
    },
    aoSair: () => {
      if (erro === null) setTexto(opcoes.paraTexto(opcoes.valorGuardado));
      else setErroVisivel(true);
    },
  };
}
