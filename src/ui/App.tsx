import { useMemo, useReducer } from "react";
import { calcular } from "../motor/calcular.ts";
import { ambientePadrao, type Ambiente } from "./ambiente.ts";
import { BarraSuperior } from "./BarraSuperior.tsx";
import { Avisos } from "./componentes/Avisos.tsx";
import { estadoInicial, novoCalculo, reduzir } from "./estado/calculo.ts";
import "./estilos.css";
import { Rodape } from "./Rodape.tsx";

/**
 * Tela única em duas colunas (§9): esquerda, dados do caso e lançamentos em lote; direita,
 * resultado e lançamentos individuais. Recálculo a cada alteração, sem botão "Calcular" (§4.3).
 * O `ambiente` é injetável para os testes de componente.
 */
export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambiente }) {
  // A tabela de índices é congelada quando o app abre (§8.2); "Novo cálculo" congela outra.
  const [estado, despachar] = useReducer(reduzir, undefined, () =>
    estadoInicial(
      novoCalculo({ id: ambiente.novoId(), agora: ambiente.agora(), hoje: ambiente.hoje() }),
      ambiente.congelar(),
    ),
  );
  const resultado = useMemo(
    () => calcular(estado.calculo, estado.tabela),
    [estado.calculo, estado.tabela],
  );
  const novo = () =>
    despachar({
      tipo: "novo",
      calculo: novoCalculo({
        id: ambiente.novoId(),
        agora: ambiente.agora(),
        hoje: ambiente.hoje(),
      }),
      ...ambiente.congelar(),
    });
  return (
    <div className="app">
      <BarraSuperior aoNovo={novo} />
      <main className="principal">
        <div className="coluna-esquerda" />
        <div className="coluna-direita">
          <Avisos avisos={[...estado.situacao.avisos, ...resultado.avisos]} />
        </div>
      </main>
      <Rodape situacaoDosIndices={estado.situacao.rodape} />
    </div>
  );
}
