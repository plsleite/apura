import { useMemo, useReducer, useState } from "react";
import type { Lancamento, LancamentoCalculado } from "../compartilhado/tipos.ts";
import { calcular } from "../motor/calcular.ts";
import { ambientePadrao, type Ambiente } from "./ambiente.ts";
import { CHAVE_RECENTES, removerChave } from "./armazenamento.ts";
import { BarraSuperior } from "./BarraSuperior.tsx";
import { Avisos } from "./componentes/Avisos.tsx";
import { Dialogo } from "./componentes/Dialogo.tsx";
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
import { Rodape } from "./Rodape.tsx";
import { Indicadores } from "./tabelas/Indicadores.tsx";
import { Personalizar } from "./tabelas/Personalizar.tsx";
import { TabelaLancamentos, type LinhaDaTabela } from "./tabelas/TabelaLancamentos.tsx";
import { BaseDosAlimentos } from "./secoes/Base.tsx";
import { EditorDePeriodos } from "./secoes/EditorDePeriodos.tsx";
import { Encargos } from "./secoes/Encargos.tsx";
import { LotePagamentosSecao } from "./secoes/LotePagamentos.tsx";
import { LotePrestacoesSecao } from "./secoes/LotePrestacoes.tsx";
import { Processo } from "./secoes/Processo.tsx";

/**
 * Tela única em duas colunas (§9): esquerda, dados do caso e lançamentos em lote; direita,
 * resultado e lançamentos individuais. Recálculo a cada alteração, sem botão "Calcular" (§4.3).
 * O `ambiente` é injetável para os testes de componente.
 */
export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambiente }) {
  const armazenamento = ambiente.armazenamento();
  const [preferencias, setPreferencias] = useState(() => lerPreferencias(armazenamento));
  const calculoNovo = (p: Preferencias) =>
    novoCalculo({
      id: ambiente.novoId(),
      agora: ambiente.agora(),
      hoje: ambiente.hoje(),
      cabecalho: p.lembrar ? { defensor: p.defensor, orgao: p.orgao } : {},
    });
  // A tabela de índices é congelada quando o app abre (§8.2); "Novo cálculo" congela outra.
  const [estado, despachar] = useReducer(reduzir, undefined, () =>
    estadoInicial(calculoNovo(preferencias), ambiente.congelar()),
  );
  const resultado = useMemo(
    () => calcular(estado.calculo, estado.tabela),
    [estado.calculo, estado.tabela],
  );
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

  const novo = () =>
    despachar({ tipo: "novo", calculo: calculoNovo(preferencias), ...ambiente.congelar() });

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

  return (
    <div className="app">
      <BarraSuperior aoNovo={novo} />
      <main className="principal">
        <div className="coluna-esquerda" key={`esquerda-${estado.calculo.id}`}>
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
          />
        </div>
        <div className="coluna-direita" key={`direita-${estado.calculo.id}`}>
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
          <Avisos
            avisos={[
              ...faltas.map((f) => f.aviso),
              ...estado.situacao.avisos,
              ...estado.avisosDaAbertura,
              ...resultado.avisos,
            ]}
          />
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
          aoMudar={(metodologia) => despachar({ tipo: "metodologia", metodologia, em: agora() })}
        />
        <div className="dialogo-acoes">
          <button type="button" className="botao" onClick={() => setEditorAberto(false)}>
            Fechar
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
