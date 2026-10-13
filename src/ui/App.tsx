import { useMemo, useReducer, useState } from "react";
import { calcular } from "../motor/calcular.ts";
import { ambientePadrao, type Ambiente } from "./ambiente.ts";
import { CHAVE_RECENTES, removerChave } from "./armazenamento.ts";
import { BarraSuperior } from "./BarraSuperior.tsx";
import { Avisos } from "./componentes/Avisos.tsx";
import { estadoInicial, novoCalculo, reduzir } from "./estado/calculo.ts";
import "./estilos.css";
import {
  esquecer,
  gravarPreferencias,
  lerPreferencias,
  type Preferencias,
} from "./preferencias.ts";
import { Rodape } from "./Rodape.tsx";
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
        <div className="coluna-esquerda" key={estado.calculo.id}>
          <Processo
            cabecalho={estado.calculo.cabecalho}
            aoMudar={mudarCabecalho}
            preferencias={preferencias}
            aoMudarPreferencias={mudarPreferencias}
            aoEsquecer={esquecerTudo}
            armazenamentoDisponivel={armazenamento !== null}
          />
        </div>
        <div className="coluna-direita">
          <Avisos avisos={[...estado.situacao.avisos, ...resultado.avisos]} />
        </div>
      </main>
      <Rodape situacaoDosIndices={estado.situacao.rodape} />
    </div>
  );
}
