import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { decimal, ZERO, type Decimal } from "../../compartilhado/decimal.ts";
import {
  formatarCompetencia,
  formatarData,
  formatarFator,
  formatarMoeda,
  formatarPercentual,
} from "../../compartilhado/formatacao.ts";
import { NOME_DA_SERIE } from "../../compartilhado/tipos.ts";
import type {
  DataISO,
  Lancamento,
  LancamentoCalculado,
  TextoDecimal,
} from "../../compartilhado/tipos.ts";
import { Ajuda } from "../componentes/Ajuda.tsx";
import {
  DATA_MAXIMA,
  formatarDataParaCampo,
  formatarMoedaParaCampo,
  lerData,
  lerDataTexto,
  lerValorPositivo,
  mascaraData,
} from "../entrada.ts";
import type { MudancasDoLancamento } from "../estado/calculo.ts";
import type { RascunhoDeLancamento } from "../estado/novaLinha.ts";
import { CelulaEditavel } from "./CelulaEditavel.tsx";

/**
 * Tabelas de prestações e de amortizações (§9.3), com as mesmas colunas: vencimento (ou data do
 * pagamento), valor, fator, corrigido, juros (% e R$), atualizado. O vencimento é a referência de
 * cada linha; a competência não aparece (decisão de 13/10/2026). Vencimento e valor se corrigem
 * na própria célula (clique ou Enter; Enter grava, Esc desiste); ▸ expande a memória (base,
 * índices mês a mês, dias de juros por mês e regime, avisos); o lápis abre "Personalizar" para
 * os ajustes finos; o ✕ fica vermelho no primeiro clique e exclui no segundo.
 * "+ Prestação" / "+ Pagamento" abre uma linha nova no fim da tabela, já preenchida com a
 * sugestão (`estado/novaLinha.ts`); Enter ou ✓ inclui, Esc ou ✕ descarta.
 * Etiquetas na linha: vincenda, não computada, valor informado à mão, ajustada.
 */

export interface LinhaDaTabela {
  lancamento: Lancamento;
  calculado: LancamentoCalculado;
}

type NovoLancamento = Omit<Lancamento, "id" | "origem" | "editado">;

/** Tempo em que o ✕ fica armado (vermelho) esperando o segundo clique. */
const TEMPO_ARMADO_MS = 4000;

const NOME_DO_REGIME = {
  percentualMensal: "juros de",
  taxaLegal: "taxa legal de",
  selicUnica: "SELIC",
} as const;

/** "prestação de 05/09/2026", com a descrição entre parênteses quando há: o nome da linha. */
function nomeDoLancamento(lancamento: Lancamento): string {
  const base = `${lancamento.tipo === "prestacao" ? "prestação" : "pagamento"} de ${formatarData(lancamento.data)}`;
  return lancamento.descricao?.trim() ? `${base} (${lancamento.descricao.trim()})` : base;
}

function somar(
  linhas: LinhaDaTabela[],
  campo: "valorBase" | "corrigido" | "jurosValor" | "atualizado",
): Decimal {
  return linhas
    .filter((l) => l.calculado.situacao !== "ignorado")
    .reduce((soma, l) => soma.plus(decimal(l.calculado[campo])), ZERO);
}

/** Linha nova em edição: os textos dos campos e o que veio da sugestão. */
interface Rascunho {
  data: string;
  valor: string;
  /** valor sugerido, como aparece no campo; com `pelaBase`, deixá-lo igual mantém a prestação pela base */
  sugerido: string;
  pelaBase: boolean;
  encargos?: Lancamento["encargos"];
  erros: { data?: string; valor?: string };
}

const paraCampo = (valor: TextoDecimal) => (valor === "" ? "" : formatarMoedaParaCampo(valor));

export function TabelaLancamentos({
  tipo,
  linhas,
  aoPersonalizar,
  aoExcluir,
  aoEditar,
  aoSugerir,
  valorDaBase,
  aoIncluir,
}: {
  tipo: Lancamento["tipo"];
  linhas: LinhaDaTabela[];
  aoPersonalizar: (id: string) => void;
  aoExcluir: (id: string) => void;
  aoEditar: (id: string, mudancas: MudancasDoLancamento) => void;
  aoSugerir: () => RascunhoDeLancamento;
  /** valor que a base dá para um vencimento ("" quando não dá): acompanha a data da linha nova */
  valorDaBase: (data: DataISO) => TextoDecimal;
  aoIncluir: (lancamento: NovoLancamento) => void;
}) {
  const [expandidos, setExpandidos] = useState<ReadonlySet<string>>(new Set());
  // Exclusão em dois cliques, sem janela pop-up e sem mexer na linha (decisões de 13/10/2026): o
  // primeiro clique no ✕ o deixa vermelho ("armado"); um segundo clique, deliberado, exclui. Ele se
  // desarma com clique ou foco fora, Esc, 4 segundos sem o segundo clique (ver `Linha`) e quando o
  // cálculo muda (linhas novas vindas do App). Só um ✕ fica armado por vez.
  const [armado, setArmado] = useState<string | null>(null);
  const desarmar = useCallback(() => setArmado(null), []);
  const [linhasVistas, setLinhasVistas] = useState(linhas);
  if (linhas !== linhasVistas) {
    setLinhasVistas(linhas);
    setArmado(null);
    // memória aberta de uma linha que deixou de existir é esquecida: se a linha voltar (lote
    // relançado, mesmo id), volta fechada
    const presentes = new Set(linhas.map((l) => l.lancamento.id));
    if ([...expandidos].some((id) => !presentes.has(id))) {
      setExpandidos(new Set([...expandidos].filter((id) => presentes.has(id))));
    }
  }
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const idDosErros = useId();
  const campoDaDataNova = useRef<HTMLInputElement>(null);
  const botaoIncluir = useRef<HTMLButtonElement>(null);
  const focarIncluir = useRef(false);
  const linhaNovaAberta = rascunho !== null;
  useEffect(() => {
    if (linhaNovaAberta) campoDaDataNova.current?.focus();
    else if (focarIncluir.current) {
      focarIncluir.current = false;
      botaoIncluir.current?.focus();
    }
  }, [linhaNovaAberta]);
  const alternar = (id: string) => {
    const novo = new Set(expandidos);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    setExpandidos(novo);
  };
  const prestacoes = tipo === "prestacao";
  const titulo = prestacoes ? "Prestações" : "Amortizações (pagamentos)";
  const tituloId = prestacoes ? "titulo-tabela-prestacoes" : "titulo-tabela-amortizacoes";
  const nova = prestacoes ? "nova prestação" : "novo pagamento";

  const abrirLinhaNova = () => {
    if (rascunho !== null) {
      campoDaDataNova.current?.focus();
      return;
    }
    const sugestao = aoSugerir();
    const valor = paraCampo(sugestao.valor);
    setRascunho({
      data: sugestao.data,
      valor,
      sugerido: valor,
      pelaBase: sugestao.pelaBase,
      ...(sugestao.encargos ? { encargos: sugestao.encargos } : {}),
      erros: {},
    });
  };
  const mudarDataNova = (data: string) => {
    if (rascunho === null) return;
    // prestação pela base com o valor ainda não mexido: o valor sugerido acompanha o vencimento
    if (rascunho.pelaBase && rascunho.valor === rascunho.sugerido && lerData(data).ok) {
      const valor = paraCampo(valorDaBase(data));
      setRascunho({ ...rascunho, data, valor, sugerido: valor, erros: {} });
    } else setRascunho({ ...rascunho, data, erros: { ...rascunho.erros, data: undefined } });
  };
  const descartar = () => {
    focarIncluir.current = true;
    setRascunho(null);
  };
  const incluir = () => {
    if (rascunho === null) return;
    const data = lerData(rascunho.data);
    const semValor =
      prestacoes &&
      (rascunho.valor.trim() === "" || (rascunho.pelaBase && rascunho.valor === rascunho.sugerido));
    const valor = semValor ? null : lerValorPositivo(rascunho.valor);
    const erros: Rascunho["erros"] = {};
    if (!data.ok) erros.data = data.erro;
    if (valor !== null && !valor.ok) erros.valor = valor.erro;
    if (!data.ok || (valor !== null && !valor.ok)) {
      setRascunho({ ...rascunho, erros });
      return;
    }
    const lancamento: NovoLancamento = { tipo, data: data.valor };
    if (valor !== null) lancamento.valorInformado = valor.valor;
    if (rascunho.encargos) lancamento.encargos = rascunho.encargos;
    aoIncluir(lancamento);
    descartar();
  };
  const teclaNaLinhaNova = (evento: KeyboardEvent<HTMLTableRowElement>) => {
    if (evento.key === "Enter" && evento.target instanceof HTMLInputElement) {
      evento.preventDefault();
      // Enter segurado (tecla repetida) não inclui: só um Enter deliberado
      if (!evento.repeat) incluir();
    } else if (evento.key === "Escape") {
      evento.preventDefault();
      descartar();
    }
  };

  return (
    <section className="tabela-rolagem" aria-labelledby={tituloId}>
      <div className="titulo-secao">
        <h2 id={tituloId}>{titulo}</h2>
        <Ajuda assunto={titulo}>
          {prestacoes
            ? "Clique no vencimento ou no valor para corrigi-lo na própria linha: Enter grava, Esc desiste. Valor digitado fica marcado como informado à mão; apagado, volta a ser apurado pela base. ▸ mostra a memória do cálculo; o lápis ajusta descrição, rendimento, termos e regras próprias; o ✕ pede confirmação antes de excluir."
            : "Clique na data ou no valor para corrigi-lo na própria linha: Enter grava, Esc desiste. Cada pagamento é atualizado da sua data até a data do cálculo e abatido do total. ▸ mostra a memória do cálculo; o lápis ajusta descrição, termos e regras próprias; o ✕ pede confirmação antes de excluir."}
        </Ajuda>
      </div>
      <div className="rolagem">
        <table>
          <thead>
            <tr>
              <th scope="col">{prestacoes ? "Vencimento" : "Data"}</th>
              <th scope="col">Valor</th>
              <th scope="col">Fator</th>
              <th scope="col">Corrigido</th>
              <th scope="col">Juros %</th>
              <th scope="col">Juros R$</th>
              <th scope="col">Atualizado</th>
              <th scope="col">
                <span className="oculto-acessivel">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && rascunho === null ? (
              <tr>
                <td colSpan={8} className="texto">
                  {prestacoes
                    ? 'Nenhuma prestação lançada: use "Lançar em lote" na seção 3 ou "+ Prestação".'
                    : 'Nenhum pagamento lançado: use "Lançar em lote" na seção 4 ou "+ Pagamento".'}
                </td>
              </tr>
            ) : null}
            {linhas.map((linha) => (
              <Fragment key={linha.lancamento.id}>
                <Linha
                  linha={linha}
                  expandida={expandidos.has(linha.lancamento.id)}
                  aoAlternar={() => alternar(linha.lancamento.id)}
                  aoPersonalizar={() => aoPersonalizar(linha.lancamento.id)}
                  aoEditar={(mudancas) => aoEditar(linha.lancamento.id, mudancas)}
                  armado={armado === linha.lancamento.id}
                  aoArmar={() => setArmado(linha.lancamento.id)}
                  aoDesarmar={desarmar}
                  aoConfirmarExclusao={() => {
                    setArmado(null);
                    aoExcluir(linha.lancamento.id);
                    botaoIncluir.current?.focus();
                  }}
                />
                {expandidos.has(linha.lancamento.id) ? <Memoria linha={linha} /> : null}
              </Fragment>
            ))}
            {rascunho !== null ? (
              <tr className="linha-nova" onKeyDown={teclaNaLinhaNova}>
                <td className="texto">
                  <span className="campo-linha-nova">
                    <input
                      ref={campoDaDataNova}
                      type="date"
                      min="1900-01-01"
                      max={DATA_MAXIMA}
                      value={rascunho.data}
                      onChange={(e) => mudarDataNova(e.target.value)}
                      aria-label={
                        prestacoes ? "Vencimento da nova prestação" : "Data do novo pagamento"
                      }
                      aria-invalid={rascunho.erros.data !== undefined}
                      aria-describedby={rascunho.erros.data ? `${idDosErros}-data` : undefined}
                    />
                    {rascunho.erros.data ? (
                      <span className="erro" id={`${idDosErros}-data`} role="alert">
                        {rascunho.erros.data}
                      </span>
                    ) : null}
                  </span>
                </td>
                <td>
                  <span className="campo-linha-nova">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={rascunho.valor}
                      onChange={(e) =>
                        setRascunho({
                          ...rascunho,
                          valor: e.target.value,
                          erros: { ...rascunho.erros, valor: undefined },
                        })
                      }
                      aria-label={
                        prestacoes ? "Valor da nova prestação" : "Valor do novo pagamento"
                      }
                      aria-invalid={rascunho.erros.valor !== undefined}
                      aria-describedby={rascunho.erros.valor ? `${idDosErros}-valor` : undefined}
                      placeholder={prestacoes ? "pela base" : "0,00"}
                    />
                    {rascunho.erros.valor ? (
                      <span className="erro" id={`${idDosErros}-valor`} role="alert">
                        {rascunho.erros.valor}
                      </span>
                    ) : null}
                  </span>
                </td>
                <td colSpan={5} className="texto dica">
                  Enter inclui · Esc descarta
                </td>
                <td className="acoes-linha">
                  <button
                    type="button"
                    className="botao-icone"
                    onClick={incluir}
                    aria-label={`Incluir ${prestacoes ? "a" : "o"} ${nova}`}
                    title="Incluir (Enter)"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    className="botao-icone"
                    onClick={descartar}
                    aria-label={`Descartar ${prestacoes ? "a" : "o"} ${nova}`}
                    title="Descartar (Esc)"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ) : null}
          </tbody>
          {linhas.length > 0 ? (
            <tfoot>
              <tr>
                <td className="texto">Total</td>
                <td>{formatarMoeda(somar(linhas, "valorBase"))}</td>
                <td />
                <td>{formatarMoeda(somar(linhas, "corrigido"))}</td>
                <td />
                <td>{formatarMoeda(somar(linhas, "jurosValor"))}</td>
                <td>{formatarMoeda(somar(linhas, "atualizado"))}</td>
                <td />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      <div className="rodape-tabela">
        <button
          type="button"
          className="botao secundario"
          onClick={abrirLinhaNova}
          onKeyDown={ignorarRepeticao}
          ref={botaoIncluir}
        >
          {prestacoes ? "+ Prestação" : "+ Pagamento"}
        </button>
      </div>
    </section>
  );
}

/**
 * Enter ou Espaço segurados (tecla repetida) num botão não o acionam de novo: segurar Enter em
 * "+ Prestação" ou depois do Enter que exclui pelo ✕ (o foco vai ao "+") não acrescenta linhas.
 */
function ignorarRepeticao(evento: KeyboardEvent<HTMLButtonElement>) {
  if (evento.repeat && (evento.key === "Enter" || evento.key === " ")) evento.preventDefault();
}

function Linha({
  linha,
  expandida,
  aoAlternar,
  aoPersonalizar,
  aoEditar,
  armado,
  aoArmar,
  aoDesarmar,
  aoConfirmarExclusao,
}: {
  linha: LinhaDaTabela;
  expandida: boolean;
  aoAlternar: () => void;
  aoPersonalizar: () => void;
  aoEditar: (mudancas: MudancasDoLancamento) => void;
  armado: boolean;
  aoArmar: () => void;
  /** função estável (o prazo de 4 segundos não recomeça a cada desenho da tabela) */
  aoDesarmar: () => void;
  aoConfirmarExclusao: () => void;
}) {
  // O ✕ armado se desarma com qualquer clique ou foco fora dele (outra linha, a memória, outra
  // tabela, um campo, Tab para fora) e depois de 4 segundos sem o segundo clique.
  const xis = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!armado) return;
    const fora = (evento: Event) => {
      if (evento.target instanceof Node && xis.current?.contains(evento.target)) return;
      aoDesarmar();
    };
    const prazo = setTimeout(aoDesarmar, TEMPO_ARMADO_MS);
    document.addEventListener("pointerdown", fora, true);
    document.addEventListener("focusin", fora);
    return () => {
      clearTimeout(prazo);
      document.removeEventListener("pointerdown", fora, true);
      document.removeEventListener("focusin", fora);
    };
  }, [armado, aoDesarmar]);
  const cliqueNoXis = (evento: MouseEvent<HTMLButtonElement>) => {
    if (!armado) {
      aoArmar();
      return;
    }
    // o segundo clique de um clique duplo (detail 2) não confirma: só um segundo clique
    // deliberado exclui; Enter ou Espaço (detail 0) também confirmam
    if (evento.detail > 1) return;
    aoConfirmarExclusao();
  };
  const teclaNoXis = (evento: KeyboardEvent<HTMLButtonElement>) => {
    if (evento.key === "Escape" && armado) {
      evento.stopPropagation();
      aoDesarmar();
    }
    // Enter ou Espaço segurados (tecla repetida) não confirmam
    if (evento.repeat && (evento.key === "Enter" || evento.key === " ")) evento.preventDefault();
  };
  const { lancamento, calculado } = linha;
  const feminino = lancamento.tipo === "prestacao";
  const nome = nomeDoLancamento(lancamento);
  const artigo = feminino ? "da" : "do";
  // Etiquetas com a explicação no `title` (§9.4: nenhum rótulo sem explicação).
  const etiquetas: Array<{ texto: string; explicacao: string }> = [];
  if (calculado.situacao === "vincenda") {
    etiquetas.push({
      texto: "vincenda",
      explicacao:
        "Vence depois da data de elaboração: entra pelo valor nominal, sem correção e sem juros.",
    });
  }
  if (calculado.situacao === "ignorado") {
    etiquetas.push({
      texto: feminino ? "não computada" : "não computado",
      explicacao: "Fora dos totais: abra a memória da linha (▸) para ver o motivo.",
    });
  }
  if (calculado.editado) {
    etiquetas.push({
      texto: "valor informado",
      explicacao: feminino
        ? "Valor digitado à mão, não apurado pela base dos alimentos; apagado, volta à base."
        : "Valor digitado à mão.",
    });
  }
  if (lancamento.editado) {
    etiquetas.push({
      texto: feminino ? "ajustada" : "ajustado",
      explicacao: `${feminino ? "Alterada" : "Alterado"} depois de ${feminino ? "lançada" : "lançado"} (${feminino ? "vencimento" : "data"}, valor, descrição, rendimento, termos ou regras próprias).`,
    });
  }
  const moeda = (texto: string) => formatarMoeda(decimal(texto));
  // o campo do valor abre com o valor informado à mão ou, na prestação pela base, com o valor
  // apurado (gravá-lo sem mudar nada não o transforma em informado)
  const textoDoValor =
    lancamento.valorInformado !== undefined
      ? formatarMoedaParaCampo(lancamento.valorInformado)
      : decimal(calculado.valorBase).gt(ZERO)
        ? formatarMoedaParaCampo(calculado.valorBase)
        : "";
  return (
    <tr>
      <td className="texto">
        <button
          type="button"
          className="botao-expandir"
          aria-expanded={expandida}
          aria-label={`Memória ${artigo} ${nome}`}
          title="Memória do cálculo"
          onClick={aoAlternar}
        >
          {expandida ? "▾" : "▸"}
        </button>
        <CelulaEditavel
          nome={feminino ? `Vencimento da ${nome}` : `Data do ${nome}`}
          exibido={formatarData(lancamento.data)}
          textoInicial={formatarDataParaCampo(lancamento.data)}
          inputMode="numeric"
          placeholder="dd/mm/aaaa"
          mascara={mascaraData}
          aoGravar={(texto) => {
            const data = lerDataTexto(texto);
            if (!data.ok) return data.erro;
            aoEditar({ data: data.valor });
            return null;
          }}
        />
        {lancamento.descricao?.trim() ? (
          <span className="descricao">{lancamento.descricao.trim()}</span>
        ) : null}
        {etiquetas.map((etiqueta) => (
          <span key={etiqueta.texto} className="etiqueta" title={etiqueta.explicacao}>
            {etiqueta.texto}
          </span>
        ))}
      </td>
      <td>
        <CelulaEditavel
          nome={`Valor ${artigo} ${nome}`}
          exibido={moeda(calculado.valorBase)}
          textoInicial={textoDoValor}
          inputMode="decimal"
          placeholder={feminino ? "pela base" : undefined}
          aoGravar={(texto) => {
            if (texto.trim() === "") {
              if (!feminino) return "Informe um valor maior que zero.";
              aoEditar({ valorInformado: undefined });
              return null;
            }
            const valor = lerValorPositivo(texto);
            if (!valor.ok) return valor.erro;
            aoEditar({ valorInformado: valor.valor });
            return null;
          }}
        />
      </td>
      <td>{formatarFator(decimal(calculado.correcao.fator))}</td>
      <td>{moeda(calculado.corrigido)}</td>
      <td>{formatarPercentual(decimal(calculado.juros.percentual), 6)}</td>
      <td>{moeda(calculado.jurosValor)}</td>
      <td>{moeda(calculado.atualizado)}</td>
      <td className="acoes-linha">
        <button
          type="button"
          className="botao-icone"
          onClick={aoPersonalizar}
          aria-label={`Personalizar ${nome}`}
          title="Personalizar"
        >
          ✎
        </button>
        <button
          type="button"
          className={`botao-icone excluir${armado ? " armado" : ""}`}
          onClick={cliqueNoXis}
          onKeyDown={teclaNoXis}
          ref={xis}
          aria-label={
            armado
              ? `Clique de novo para excluir ${feminino ? "a" : "o"} ${nome}`
              : `Excluir ${nome}`
          }
          title={armado ? "Clique de novo para excluir" : "Excluir (pede um segundo clique)"}
        >
          ✕
        </button>
      </td>
    </tr>
  );
}

function descreverIndice(i: LancamentoCalculado["correcao"]["indices"][number]): string {
  const mes = formatarCompetencia(i.competencia);
  if (i.serie === null) return `${mes}: sem correção neste período`;
  const nome = NOME_DA_SERIE[i.serie];
  if (i.fracao.startsWith("0/")) return `${nome} de ${mes}: não entra`;
  const valor = i.valor === null ? "sem índice (fator 1,000000)" : `${i.valor.replace(".", ",")}%`;
  const fracao = i.fracao === "1" ? "" : ` (${i.fracao} do mês)`;
  return `${nome} de ${mes}: ${valor}${fracao}`;
}

function descreverJuros(d: LancamentoCalculado["juros"]["detalhe"][number]): string {
  const dias = d.diasDoMes === undefined ? `${d.dias} dias` : `${d.dias} de ${d.diasDoMes} dias`;
  return `${NOME_DO_REGIME[d.regime]} ${d.taxa.replace(".", ",")}% de ${formatarData(d.de)} a ${formatarData(d.ate)} (${dias}): ${formatarPercentual(decimal(d.percentual), 6)}`;
}

function Memoria({ linha }: { linha: LinhaDaTabela }) {
  const { calculado } = linha;
  return (
    <tr className="memoria">
      <td colSpan={8}>
        <p>
          <strong>Memória · {nomeDoLancamento(linha.lancamento)}</strong>
        </p>
        {/* com a base por períodos, a frase do motor já começa por "Base até/desde …" (§17.2) */}
        <p>
          {calculado.memoriaBase.startsWith("Base ")
            ? calculado.memoriaBase
            : `Base: ${calculado.memoriaBase}`}
        </p>
        <p>
          Correção (fator {formatarFator(decimal(calculado.correcao.fator))}
          {calculado.correcao.pisoAplicado ? ", com piso no valor original" : ""}):
        </p>
        <ul>
          {calculado.correcao.indices.map((i) => (
            <li key={`${i.serie ?? "x"}-${i.competencia}`}>{descreverIndice(i)}</li>
          ))}
          {calculado.correcao.indices.length === 0 ? <li>nenhum mês de correção</li> : null}
        </ul>
        <p>
          Juros ({formatarPercentual(decimal(calculado.juros.percentual), 6)} sobre o corrigido):
        </p>
        <ul>
          {calculado.juros.detalhe.map((d) => (
            <li key={`${d.de}-${d.ate}`}>{descreverJuros(d)}</li>
          ))}
          {calculado.juros.detalhe.length === 0 ? <li>sem juros</li> : null}
        </ul>
        {calculado.avisos.length > 0 ? (
          <>
            <p>Avisos:</p>
            <ul>
              {calculado.avisos.map((aviso) => (
                <li key={aviso}>{aviso}</li>
              ))}
            </ul>
          </>
        ) : null}
      </td>
    </tr>
  );
}
