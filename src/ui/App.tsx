import { useState } from "react";
import { ambientePadrao, type Ambiente } from "./ambiente.ts";
import { BarraSuperior } from "./BarraSuperior.tsx";
import { Avisos } from "./componentes/Avisos.tsx";
import "./estilos.css";
import { Rodape } from "./Rodape.tsx";

/**
 * Tela única em duas colunas (§9): esquerda, dados do caso e lançamentos em lote; direita,
 * resultado e lançamentos individuais. O `ambiente` é injetável para os testes de componente.
 */
export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambiente }) {
  // A tabela de índices é congelada quando o app abre (§8.2); "Novo cálculo" congela outra.
  const [indices] = useState(() => ambiente.congelar());
  return (
    <div className="app">
      <BarraSuperior />
      <main className="principal">
        <div className="coluna-esquerda" />
        <div className="coluna-direita">
          <Avisos avisos={indices.situacao.avisos} />
        </div>
      </main>
      <Rodape situacaoDosIndices={indices.situacao.rodape} />
    </div>
  );
}
