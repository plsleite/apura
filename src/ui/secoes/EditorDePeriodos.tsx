import { useState } from "react";
import type { IndiceCorrecao, Metodologia, PeriodoMetodologia } from "../../compartilhado/tipos.ts";
import { periodosOrdenados, validarMetodologia } from "../../motor/periodos.ts";
import { Avisos } from "../componentes/Avisos.tsx";
import { CampoSelecao, CampoTexto, Opcao, useCampoValidado } from "../componentes/Campo.tsx";
import { DATA_MAXIMA, formatarNumeroParaCampo, lerData, lerPercentual } from "../entrada.ts";
import {
  descreverIntervalo,
  dividirPeriodo,
  escolherIndice,
  escolherJuros,
  escolherOpcoes,
  escolherTaxa,
  removerDivisao,
  restaurarPadrao,
  type EscolhaDeJuros,
} from "../estado/metodologia.ts";
import { formatarData } from "../../compartilhado/formatacao.ts";

/**
 * Editor de períodos (§6.5, §9.2): lista de períodos (de/até) com índice de correção e regra de
 * juros em cada um, "Dividir em uma data" e "Remover divisão", incidência no mês inicial e
 * tratamento da deflação. Serve à metodologia global e à metodologia própria de um lançamento. As
 * mudanças valem na hora; os avisos de `validarMetodologia` aparecem embaixo.
 */

const OPCOES_DE_INDICE: ReadonlyArray<{ valor: IndiceCorrecao; rotulo: string }> = [
  { valor: "IGP-M", rotulo: "IGP-M" },
  { valor: "INPC", rotulo: "INPC" },
  { valor: "IPCA", rotulo: "IPCA" },
  { valor: "nenhum", rotulo: "nenhum (sem correção)" },
];

const OPCOES_DE_JUROS: ReadonlyArray<{ valor: EscolhaDeJuros; rotulo: string }> = [
  { valor: "percentualMensal", rotulo: "percentual mensal fixo" },
  { valor: "taxaLegal", rotulo: "taxa legal (art. 406 do CC, desde 30/08/2024)" },
  { valor: "selicUnica", rotulo: "SELIC única (Tema 1.368 do STJ)" },
];

export function EditorDePeriodos({
  metodologia,
  aoMudar,
  prefixoDosIds = "periodo",
}: {
  metodologia: Metodologia;
  aoMudar: (metodologia: Metodologia) => void;
  /** prefixo dos ids dos campos, para dois editores não colidirem */
  prefixoDosIds?: string;
}) {
  const periodos = periodosOrdenados(metodologia);
  const [avisoDaDivisao, setAvisoDaDivisao] = useState<string | null>(null);
  const [dataDaDivisao, setDataDaDivisao] = useState("");
  const dividir = () => {
    const leitura = lerData(dataDaDivisao);
    if (!leitura.ok) {
      setAvisoDaDivisao(leitura.erro);
      return;
    }
    const { metodologia: nova, aviso } = dividirPeriodo(metodologia, leitura.valor);
    setAvisoDaDivisao(aviso ?? null);
    if (aviso === undefined) aoMudar(nova);
  };
  return (
    <div className="editor-de-periodos">
      {periodos.map((periodo, i) => (
        <Periodo
          key={`${periodo.de ?? "inicio"}-${periodo.ate ?? "fim"}`}
          periodo={periodo}
          indice={i}
          prefixo={prefixoDosIds}
          aoEscolherIndice={(v) => aoMudar(escolherIndice(metodologia, i, v))}
          aoEscolherJuros={(v) => aoMudar(escolherJuros(metodologia, i, v))}
          aoEscolherTaxa={(v) => aoMudar(escolherTaxa(metodologia, i, v))}
          aoRemover={i > 0 ? () => aoMudar(removerDivisao(metodologia, i)) : undefined}
        />
      ))}
      <div className="linha">
        <CampoTexto
          id={`${prefixoDosIds}-dividir-em`}
          rotulo="Dividir em uma data"
          ajuda="A data informada passa a iniciar um período novo, com as mesmas regras do anterior; depois ajuste índice e juros de cada um. Ex.: IGP-M e 1% ao mês até 2022, IPCA e 2% ao mês desde 2023. A divisão de 30/08/2024 é a transição da Lei 14.905/2024."
          tipo="date"
          valor={dataDaDivisao}
          aoMudar={(v) => {
            setDataDaDivisao(v);
            setAvisoDaDivisao(null);
          }}
          erro={avisoDaDivisao}
          min="1900-01-01"
          max={DATA_MAXIMA}
        />
        <button type="button" className="botao secundario" onClick={dividir}>
          Dividir
        </button>
      </div>
      <fieldset className="grupo">
        <legend>Mês inicial de cada lançamento (vencimento ou pagamento)</legend>
        <Opcao
          tipo="radio"
          nome={`${prefixoDosIds}-incidencia`}
          rotulo="proporcional aos dias restantes do mês (pro rata)"
          marcado={metodologia.incidenciaMesInicial === "proRata"}
          aoMudar={() => aoMudar(escolherOpcoes(metodologia, { incidenciaMesInicial: "proRata" }))}
        />
        <Opcao
          tipo="radio"
          nome={`${prefixoDosIds}-incidencia`}
          rotulo="só a partir do mês seguinte"
          marcado={metodologia.incidenciaMesInicial === "mesSeguinte"}
          aoMudar={() =>
            aoMudar(escolherOpcoes(metodologia, { incidenciaMesInicial: "mesSeguinte" }))
          }
        />
      </fieldset>
      <fieldset className="grupo">
        <legend>Índices negativos (deflação)</legend>
        <Opcao
          tipo="radio"
          nome={`${prefixoDosIds}-deflacao`}
          rotulo="aplicar, sem deixar o corrigido abaixo do original (piso)"
          marcado={metodologia.deflacao === "aplicarComPiso"}
          aoMudar={() => aoMudar(escolherOpcoes(metodologia, { deflacao: "aplicarComPiso" }))}
        />
        <Opcao
          tipo="radio"
          nome={`${prefixoDosIds}-deflacao`}
          rotulo="aplicar sem piso"
          marcado={metodologia.deflacao === "aplicarSemPiso"}
          aoMudar={() => aoMudar(escolherOpcoes(metodologia, { deflacao: "aplicarSemPiso" }))}
        />
        <Opcao
          tipo="radio"
          nome={`${prefixoDosIds}-deflacao`}
          rotulo="ignorar os meses negativos"
          marcado={metodologia.deflacao === "zerarNegativos"}
          aoMudar={() => aoMudar(escolherOpcoes(metodologia, { deflacao: "zerarNegativos" }))}
        />
      </fieldset>
      <Avisos avisos={validarMetodologia(metodologia)} titulo="Avisos da metodologia" />
      {metodologia.ajustada ? (
        <div className="linha">
          <button
            type="button"
            className="botao discreto"
            onClick={() => aoMudar(restaurarPadrao())}
          >
            Restaurar a metodologia padrão
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Periodo({
  periodo,
  indice,
  prefixo,
  aoEscolherIndice,
  aoEscolherJuros,
  aoEscolherTaxa,
  aoRemover,
}: {
  periodo: PeriodoMetodologia;
  indice: number;
  prefixo: string;
  aoEscolherIndice: (indice: IndiceCorrecao) => void;
  aoEscolherJuros: (juros: EscolhaDeJuros) => void;
  aoEscolherTaxa: (taxa: string) => void;
  aoRemover?: () => void;
}) {
  const selic = periodo.juros.tipo === "selicUnica";
  const taxa = useCampoValidado({
    valorGuardado: periodo.juros.tipo === "percentualMensal" ? periodo.juros.taxaMensal : "",
    paraTexto: formatarNumeroParaCampo,
    ler: lerPercentual,
    aoValidar: aoEscolherTaxa,
  });
  const id = `${prefixo}-${indice}`;
  return (
    <div className="periodo">
      <h3>
        Período {indice + 1} · {descreverIntervalo(periodo)}
      </h3>
      <div className="linha">
        <CampoSelecao
          id={`${id}-indice`}
          rotulo="Índice de correção"
          valor={periodo.correcao.indice}
          opcoes={OPCOES_DE_INDICE}
          aoMudar={aoEscolherIndice}
          disabled={selic}
        />
        <CampoSelecao
          id={`${id}-juros`}
          rotulo="Juros"
          valor={periodo.juros.tipo}
          opcoes={OPCOES_DE_JUROS}
          aoMudar={aoEscolherJuros}
        />
        {periodo.juros.tipo === "percentualMensal" ? (
          <CampoTexto
            id={`${id}-taxa`}
            rotulo="Taxa mensal (%)"
            valor={taxa.texto}
            aoMudar={taxa.aoMudar}
            aoSair={taxa.aoSair}
            erro={taxa.erro}
            inputMode="decimal"
            classe="curto"
          />
        ) : null}
        {aoRemover && periodo.de !== null ? (
          <button
            type="button"
            className="botao discreto"
            onClick={aoRemover}
            aria-label={`Remover a divisão de ${formatarData(periodo.de)}`}
          >
            Remover divisão
          </button>
        ) : null}
      </div>
      {selic ? (
        <p className="nota">
          A SELIC capitalizada já inclui correção e juros: neste período não há índice de correção
          nem outra taxa (combiná-los contaria a SELIC duas vezes).
        </p>
      ) : null}
    </div>
  );
}
