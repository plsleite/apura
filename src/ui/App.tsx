import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { Calculo, Lancamento, LancamentoCalculado } from "../compartilhado/tipos.ts";
import { compararIndicesUsados } from "../indices/congelar.ts";
import { metodologiaDaOpcao } from "../metodologias/padrao.ts";
import { calcular } from "../motor/calcular.ts";
import { motivoDoBloqueio } from "../relatorio/bloqueio.ts";
import { Relatorio } from "../relatorio/Relatorio.tsx";
import { tituloDoDocumento } from "../relatorio/tabelas.ts";
import { Abrir } from "./Abrir.tsx";
import { ambientePadrao, type Ambiente } from "./ambiente.ts";
import {
  ERRO_ARQUIVO_ILEGIVEL,
  lerArquivo,
  montarArquivo,
  nomeDoArquivo,
  serializarArquivo,
} from "./arquivo.ts";
import { CHAVE_RECENTES, removerChave } from "./armazenamento.ts";
import { BarraSuperior } from "./BarraSuperior.tsx";
import { Anuncios } from "./componentes/Anuncios.tsx";
import { Avisos } from "./componentes/Avisos.tsx";
import { Dialogo } from "./componentes/Dialogo.tsx";
import { Reserva } from "./componentes/Reserva.tsx";
import {
  estadoInicial,
  novoCalculo,
  reduzir,
  type MudancasDoLancamento,
} from "./estado/calculo.ts";
import { faltasDaBase } from "./estado/faltas.ts";
import { sugerirPagamento, sugerirPrestacao, valorPelaBase } from "./estado/novaLinha.ts";
import "./estilos.css";
import {
  esquecer,
  gravarPreferencias,
  lerPreferencias,
  type Preferencias,
} from "./preferencias.ts";
import {
  guardarRecente,
  lerRecentes,
  limparRecentes,
  removerRecente,
  type Recente,
} from "./recentes.ts";
import { Rodape } from "./Rodape.tsx";
import { TelaDeErro } from "./TelaDeErro.tsx";
import { VERSAO } from "./versao.ts";
import { Indicadores, totalGeralExibido } from "./tabelas/Indicadores.tsx";
import { Personalizar } from "./tabelas/Personalizar.tsx";
import { TabelaLancamentos, type LinhaDaTabela } from "./tabelas/TabelaLancamentos.tsx";
import { BaseDosAlimentos } from "./secoes/Base.tsx";
import { EditorDePeriodos } from "./secoes/EditorDePeriodos.tsx";
import { Encargos } from "./secoes/Encargos.tsx";
import { LotePagamentosSecao } from "./secoes/LotePagamentos.tsx";
import { LotePrestacoesSecao } from "./secoes/LotePrestacoes.tsx";
import { Processo } from "./secoes/Processo.tsx";

/**
 * O Apura, com a tela de erro de reserva em volta (§18.6): um defeito do programa ao montar a tela
 * troca a página pela reserva, que oferece salvar o último cálculo exibido. O `ambiente` é
 * injetável para os testes de componente.
 */
export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambiente }) {
  const ultimoCalculo = useRef<Calculo | null>(null);
  const aoExibir = useCallback((calculo: Calculo) => {
    ultimoCalculo.current = calculo;
  }, []);
  return (
    <Reserva reserva={<TelaDeErro ambiente={ambiente} calculo={() => ultimoCalculo.current} />}>
      <Tela ambiente={ambiente} aoExibir={aoExibir} />
    </Reserva>
  );
}

/**
 * Tela única em duas colunas (§9): esquerda, dados do caso e lançamentos em lote, na ordem da §20
 * (processo, base, encargos e data do cálculo, prestações, pagamentos: os parâmetros antes dos
 * lançamentos); direita, resultado e lançamentos individuais. Recálculo a cada alteração, sem botão
 * "Calcular" (§4.3).
 */
function Tela({
  ambiente,
  aoExibir,
}: {
  ambiente: Ambiente;
  /** recebe cada cálculo exibido (para a tela de erro de reserva salvá-lo) */
  aoExibir: (calculo: Calculo) => void;
}) {
  const armazenamento = ambiente.armazenamento();
  const [preferencias, setPreferencias] = useState(() => lerPreferencias(armazenamento));
  // Tema (decisão de 12/10/2026): "sistema" deixa o CSS seguir prefers-color-scheme; "claro" e
  // "escuro" vão para data-theme na raiz. Na carga da página, um script do index.html já marcou o
  // tema guardado antes do CSS (sem piscar); aqui o atributo acompanha cada troca no seletor.
  useLayoutEffect(() => {
    const raiz = document.documentElement;
    if (preferencias.tema === "sistema") raiz.removeAttribute("data-theme");
    else raiz.setAttribute("data-theme", preferencias.tema === "claro" ? "light" : "dark");
  }, [preferencias.tema]);
  const calculoNovo = (p: Preferencias) =>
    novoCalculo({
      id: ambiente.novoId(),
      agora: ambiente.agora(),
      hoje: ambiente.hoje(),
      cabecalho: p.lembrar ? { defensor: p.defensor, orgao: p.orgao } : {},
      metodologia: p.metodologia,
    });
  // A tabela de índices é congelada quando o app abre (§8.2); "Novo cálculo" congela outra.
  const [estado, despachar] = useReducer(reduzir, undefined, () =>
    estadoInicial(calculoNovo(preferencias), ambiente.congelar()),
  );
  const resultado = useMemo(
    () => calcular(estado.calculo, estado.tabela),
    [estado.calculo, estado.tabela],
  );
  // só depois de exibido: se o cálculo novo derrubar a tela, fica guardado o anterior
  useEffect(() => aoExibir(estado.calculo), [aoExibir, estado.calculo]);
  const agora = () => ambiente.agora();
  // o que falta na base para apurar as prestações lançadas: aviso no topo e campo em vermelho
  const faltas = faltasDaBase(estado.calculo);
  const [editorAberto, setEditorAberto] = useState(false);
  // Uma linha por lançamento, na ordem do cálculo (o motor devolve os calculados na mesma ordem).
  const linhas: LinhaDaTabela[] = estado.calculo.lancamentos.map((lancamento, i) => ({
    lancamento,
    calculado: resultado.lancamentos[i] as LancamentoCalculado,
  }));
  const excluir = (id: string) => despachar({ tipo: "excluirLancamento", id, em: agora() });
  const editar = (id: string, mudancas: MudancasDoLancamento) =>
    despachar({ tipo: "editarLancamento", id, mudancas, em: agora() });
  const incluir = (lancamento: Omit<Lancamento, "id" | "origem" | "editado">) =>
    despachar({ tipo: "incluirLancamento", lancamento, em: agora() });
  const valorDaBase = (data: string) => valorPelaBase(estado.calculo, estado.tabela, data);
  const [personalizando, setPersonalizando] = useState<Lancamento | null>(null);
  const personalizar = (id: string) =>
    setPersonalizando(estado.calculo.lancamentos.find((l) => l.id === id) ?? null);

  // Relatório (§18.1): na mesma página, no lugar das colunas, que continuam montadas (escondidas)
  // para a tela voltar como estava; o título da aba vira o nome sugerido do PDF; ao voltar, o foco
  // volta ao botão "Relatório / PDF".
  const [vendoRelatorio, setVendoRelatorio] = useState(false);
  const botaoRelatorio = useRef<HTMLButtonElement>(null);
  const voltouDoRelatorio = useRef(false);
  const bloqueioDoRelatorio = motivoDoBloqueio(estado.calculo, resultado);
  const tituloDoRelatorio = tituloDoDocumento(estado.calculo);
  useEffect(() => {
    if (!vendoRelatorio) {
      if (voltouDoRelatorio.current) botaoRelatorio.current?.focus();
      voltouDoRelatorio.current = false;
      return;
    }
    const anterior = document.title;
    document.title = tituloDoRelatorio;
    return () => {
      document.title = anterior;
    };
  }, [vendoRelatorio, tituloDoRelatorio]);
  const fecharRelatorio = () => {
    voltouDoRelatorio.current = true;
    setVendoRelatorio(false);
  };

  // Cada "Novo cálculo" ou "Abrir" remonta as duas colunas: os formulários, a linha nova e as
  // células em edição recomeçam (nada digitado para um cálculo vai parar no outro).
  const [aberturas, setAberturas] = useState(0);
  const novo = () => {
    despachar({ tipo: "novo", calculo: calculoNovo(preferencias), ...ambiente.congelar() });
    setAberturas(aberturas + 1);
    setVendoRelatorio(false);
  };

  // Salvar (§5.1): o arquivo leva o cálculo e o resultado, com o nome apura-<processo>-<data>.json.
  const salvar = () =>
    ambiente.baixar(
      nomeDoArquivo(estado.calculo),
      serializarArquivo(montarArquivo(estado.calculo, resultado)),
    );

  // Abrir (§5.1, §8.2): valida o arquivo, congela a tabela de hoje, recalcula e compara os
  // índices usados pelo cálculo salvo com os do recálculo. Qualquer falha inesperada vira a frase
  // do arquivo que não pôde ser lido: o painel fica aberto e o cálculo atual não muda.
  const [abrirAberto, setAbrirAberto] = useState(false);
  const [erroDeAbertura, setErroDeAbertura] = useState<string | null>(null);
  const [recentes, setRecentes] = useState<Recente[]>([]);
  const abrirTexto = (texto: string) => {
    let leitura: ReturnType<typeof lerArquivo>;
    let indices: ReturnType<Ambiente["congelar"]>;
    let avisos: string[];
    try {
      leitura = lerArquivo(texto);
      if (!leitura.ok) {
        setErroDeAbertura(leitura.erro);
        return;
      }
      indices = ambiente.congelar();
      const recalculado = calcular(leitura.calculo, indices.tabela);
      avisos = [
        ...leitura.avisos,
        ...(leitura.anterior === null
          ? []
          : compararIndicesUsados(leitura.anterior, {
              indicesUsados: recalculado.indicesUsados,
              consultadoEm: recalculado.consultaIndices.em,
            })),
      ];
    } catch {
      setErroDeAbertura(ERRO_ARQUIVO_ILEGIVEL);
      return;
    }
    despachar({ tipo: "abrir", calculo: leitura.calculo, ...indices, avisos });
    setAberturas(aberturas + 1);
    setVendoRelatorio(false);
    setErroDeAbertura(null);
    setAbrirAberto(false);
  };

  // Recentes (§5.5): o cálculo é guardado a cada alteração (nunca o cálculo em branco). Se a
  // gravação falha (cota cheia, armazenamento bloqueado), o painel "Abrir" avisa (13/10/2026):
  // a última tentativa fica guardada aqui e é lida quando o painel abre.
  const ultimaGravacaoFalhou = useRef(false);
  const [naoGuardado, setNaoGuardado] = useState(false);
  useEffect(() => {
    const guardar = preferencias.guardarRecentes && armazenamento !== null && estado.tocado;
    ultimaGravacaoFalhou.current =
      guardar && !guardarRecente(armazenamento, estado.calculo, resultado).gravado;
  }, [armazenamento, estado.calculo, estado.tocado, preferencias.guardarRecentes, resultado]);

  const mudarPreferencias = (mudancas: Partial<Preferencias>) => {
    const novas = { ...preferencias, ...mudancas };
    setPreferencias(novas);
    gravarPreferencias(armazenamento, novas);
    if (mudancas.guardarRecentes === false) removerChave(armazenamento, CHAVE_RECENTES);
  };
  const mudarCabecalho = (campo: keyof typeof estado.calculo.cabecalho, valor: string) => {
    despachar({ tipo: "cabecalho", campo, valor, em: agora() });
    if ((campo === "defensor" || campo === "orgao") && preferencias.lembrar) {
      mudarPreferencias({ [campo]: valor });
    }
  };
  const esquecerTudo = () => {
    esquecer(armazenamento);
    const novas = { ...preferencias, defensor: "", orgao: "", lembrar: false };
    setPreferencias(novas);
    gravarPreferencias(armazenamento, novas);
  };

  const avisosDaTela = [
    ...faltas.map((f) => f.aviso),
    ...estado.situacao.avisos,
    ...estado.avisosDaAbertura,
    ...resultado.avisos,
  ];

  return (
    <div className={vendoRelatorio ? "app vendo-relatorio" : "app"}>
      <BarraSuperior
        aoNovo={novo}
        aoAbrir={() => {
          setErroDeAbertura(null);
          setRecentes(lerRecentes(armazenamento));
          setNaoGuardado(ultimaGravacaoFalhou.current);
          setAbrirAberto(true);
        }}
        aoSalvar={salvar}
        aoRelatorio={() => setVendoRelatorio(true)}
        bloqueioDoRelatorio={bloqueioDoRelatorio}
        refDoRelatorio={botaoRelatorio}
        tema={preferencias.tema}
        aoMudarTema={(tema) => mudarPreferencias({ tema })}
      />
      <Anuncios totalGeral={totalGeralExibido(resultado.totais)} avisos={avisosDaTela.length} />
      {vendoRelatorio ? (
        <main className="principal-relatorio">
          <nav className="faixa-de-acoes" aria-label="Ações do relatório">
            <button type="button" className="botao secundario" onClick={fecharRelatorio}>
              ← Voltar ao cálculo
            </button>
            <button type="button" className="botao" onClick={() => ambiente.imprimir()}>
              Imprimir / Salvar PDF
            </button>
          </nav>
          <Avisos avisos={avisosDaTela} titulo="Antes de juntar, confira:" />
          <Reserva
            reserva={
              <p className="relatorio-erro" role="alert">
                Não foi possível montar o relatório deste cálculo.
              </p>
            }
          >
            <Relatorio
              calculo={estado.calculo}
              resultado={resultado}
              hoje={ambiente.hoje()}
              versao={VERSAO}
              focar
            />
          </Reserva>
        </main>
      ) : (
        <p className="so-na-impressao">
          Para imprimir o demonstrativo, use o botão Relatório / PDF.
        </p>
      )}
      <main className="principal" hidden={vendoRelatorio}>
        <div className="coluna-esquerda" key={`esquerda-${estado.calculo.id}-${aberturas}`}>
          <Processo
            cabecalho={estado.calculo.cabecalho}
            aoMudar={mudarCabecalho}
            preferencias={preferencias}
            aoMudarPreferencias={mudarPreferencias}
            aoEsquecer={esquecerTudo}
            armazenamentoDisponivel={armazenamento !== null}
          />
          <BaseDosAlimentos
            base={estado.calculo.base}
            hoje={ambiente.hoje()}
            faltas={faltas}
            aoMudar={(base) => despachar({ tipo: "base", base, em: agora() })}
          />
          <Encargos
            calculo={estado.calculo}
            aoMudarAcrescimo={(campo, valor) =>
              despachar({ tipo: "acrescimos", campo, valor, em: agora() })
            }
            aoMudarDataElaboracao={(data) =>
              despachar({ tipo: "dataElaboracao", data, em: agora() })
            }
            aoMudarObservacoes={(texto) => despachar({ tipo: "observacoes", texto, em: agora() })}
            aoAjustar={() => setEditorAberto(true)}
            aoEscolherMetodologia={(opcao) => {
              despachar({
                tipo: "metodologia",
                metodologia: metodologiaDaOpcao(opcao),
                em: agora(),
              });
              mudarPreferencias({ metodologia: opcao });
            }}
          />
          <LotePrestacoesSecao
            ultimoLote={estado.calculo.lotes.ultimoLotePrestacoes}
            avisos={estado.loteRecente === "prestacoes" ? estado.avisosDoLote : []}
            aoLancar={(lote) => despachar({ tipo: "lancarPrestacoes", lote, em: agora() })}
          />
          <LotePagamentosSecao
            ultimoLote={estado.calculo.lotes.ultimoLoteAmortizacoes}
            avisos={estado.loteRecente === "pagamentos" ? estado.avisosDoLote : []}
            aoLancar={(lote) => despachar({ tipo: "lancarPagamentos", lote, em: agora() })}
          />
        </div>
        <div className="coluna-direita" key={`direita-${estado.calculo.id}-${aberturas}`}>
          <Indicadores totais={resultado.totais} dataElaboracao={estado.calculo.dataElaboracao} />
          <TabelaLancamentos
            tipo="prestacao"
            linhas={linhas.filter((l) => l.lancamento.tipo === "prestacao")}
            aoPersonalizar={personalizar}
            aoExcluir={excluir}
            aoEditar={editar}
            aoSugerir={() => sugerirPrestacao(estado.calculo, estado.tabela)}
            valorDaBase={valorDaBase}
            aoIncluir={incluir}
          />
          <TabelaLancamentos
            tipo="amortizacao"
            linhas={linhas.filter((l) => l.lancamento.tipo === "amortizacao")}
            aoPersonalizar={personalizar}
            aoExcluir={excluir}
            aoEditar={editar}
            aoSugerir={() => sugerirPagamento(estado.calculo)}
            valorDaBase={valorDaBase}
            aoIncluir={incluir}
          />
          <Avisos avisos={avisosDaTela} />
        </div>
      </main>
      <Rodape situacaoDosIndices={estado.situacao.rodape} />
      <Dialogo
        titulo="Ajustar a metodologia de encargos"
        aberto={editorAberto}
        aoFechar={() => setEditorAberto(false)}
      >
        <EditorDePeriodos
          metodologia={estado.calculo.metodologia}
          opcaoPadrao={preferencias.metodologia}
          aoMudar={(metodologia) => despachar({ tipo: "metodologia", metodologia, em: agora() })}
        />
        <div className="dialogo-acoes">
          <button type="button" className="botao" onClick={() => setEditorAberto(false)}>
            Fechar
          </button>
        </div>
      </Dialogo>
      <Dialogo titulo="Abrir cálculo" aberto={abrirAberto} aoFechar={() => setAbrirAberto(false)}>
        <Abrir
          recentes={recentes}
          recentesLigados={preferencias.guardarRecentes}
          armazenamentoDisponivel={armazenamento !== null}
          erro={erroDeAbertura}
          naoGuardado={naoGuardado}
          aoAbrirRecente={(recente) => abrirTexto(recente.texto)}
          aoRemoverRecente={(id) => setRecentes(removerRecente(armazenamento, id))}
          aoLimparRecentes={() => {
            limparRecentes(armazenamento);
            setRecentes([]);
          }}
          aoAbrirTexto={abrirTexto}
          aoFalharLeitura={() => setErroDeAbertura(ERRO_ARQUIVO_ILEGIVEL)}
        />
        <div className="dialogo-acoes">
          <button type="button" className="botao secundario" onClick={() => setAbrirAberto(false)}>
            Cancelar
          </button>
        </div>
      </Dialogo>
      <Dialogo
        titulo={
          personalizando?.tipo === "amortizacao"
            ? "Personalizar pagamento"
            : "Personalizar prestação"
        }
        aberto={personalizando !== null}
        aoFechar={() => setPersonalizando(null)}
      >
        {personalizando !== null ? (
          <Personalizar
            lancamento={personalizando}
            calculo={estado.calculo}
            opcaoPadrao={preferencias.metodologia}
            aoEditar={editar}
            aoAplicarRendimento={(id, rendimento) =>
              despachar({ tipo: "aplicarRendimentoDaquiEmDiante", id, rendimento, em: agora() })
            }
            aoFechar={() => setPersonalizando(null)}
          />
        ) : null}
      </Dialogo>
    </div>
  );
}
