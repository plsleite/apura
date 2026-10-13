import type { Calculo } from "../../compartilhado/tipos.ts";
import type { OpcaoDeMetodologia } from "../../metodologias/padrao.ts";
import { Ajuda } from "../componentes/Ajuda.tsx";
import { CampoArea, CampoTexto, Opcao, useCampoValidado } from "../componentes/Campo.tsx";
import { DATA_MAXIMA, formatarNumeroParaCampo, lerData, lerPercentual } from "../entrada.ts";
import { opcaoDaMetodologia, resumirMetodologia } from "../estado/metodologia.ts";

/**
 * Seção "5 · Encargos e data do cálculo" (§9.2; explicações nos balões ⓘ): metodologia escolhida
 * entre as duas opções pré-carregadas (§17.3; ajustada, nenhuma fica marcada e o resumo em uma
 * frase aparece) e "Ajustar" (abre o editor de períodos), multa e honorários do art. 523,
 * §1º, do CPC (10% cada por padrão, decisão de 13/10/2026), data de elaboração e observações para
 * o relatório.
 */
export function Encargos({
  calculo,
  aoMudarAcrescimo,
  aoMudarDataElaboracao,
  aoMudarObservacoes,
  aoAjustar,
  aoEscolherMetodologia,
}: {
  calculo: Calculo;
  aoMudarAcrescimo: (campo: "multaPercentual" | "honorariosPercentual", valor: string) => void;
  aoMudarDataElaboracao: (data: string) => void;
  aoMudarObservacoes: (texto: string) => void;
  aoAjustar: () => void;
  /** aplica a opção ao cálculo e a guarda como padrão dos cálculos novos (§17.3) */
  aoEscolherMetodologia: (opcao: OpcaoDeMetodologia) => void;
}) {
  const multa = useCampoValidado({
    valorGuardado: calculo.acrescimos.multaPercentual,
    paraTexto: formatarNumeroParaCampo,
    ler: lerPercentual,
    aoValidar: (v) => aoMudarAcrescimo("multaPercentual", v),
  });
  const honorarios = useCampoValidado({
    valorGuardado: calculo.acrescimos.honorariosPercentual,
    paraTexto: formatarNumeroParaCampo,
    ler: lerPercentual,
    aoValidar: (v) => aoMudarAcrescimo("honorariosPercentual", v),
  });
  const data = useCampoValidado({
    valorGuardado: calculo.dataElaboracao,
    paraTexto: (d) => d,
    ler: lerData,
    aoValidar: aoMudarDataElaboracao,
  });
  const opcao = opcaoDaMetodologia(calculo.metodologia);
  return (
    <section className="secao" aria-labelledby="titulo-encargos">
      <div className="titulo-secao">
        <h2 id="titulo-encargos">5 · Encargos e data do cálculo</h2>
      </div>
      <fieldset className="grupo metodologia-de-encargos">
        <legend>
          <span className="rotulo-do-campo">
            <span className="rotulo-estatico">
              Metodologia de encargos{opcao === null ? " (ajustada)" : ""}
            </span>
            <Ajuda assunto="Metodologia de encargos">
              Correção pelo índice de cada período, proporcional aos dias restantes do mês do
              vencimento ou do pagamento (pro rata); juros simples sobre o valor corrigido. A opção
              escolhida vale para este cálculo e para os próximos (fica guardada neste navegador).
              Em "Ajustar" dá para dividir períodos, trocar índices e taxas e escolher SELIC única,
              incidência no mês inicial e tratamento de índices negativos.
            </Ajuda>
          </span>
        </legend>
        <Opcao
          tipo="radio"
          nome="metodologia"
          rotulo="Até 29/08/2024: IGP-M e juros de 1% ao mês. Desde 30/08/2024: IPCA e taxa legal."
          marcado={opcao === "lei14905"}
          aoMudar={() => aoEscolherMetodologia("lei14905")}
        />
        <span className="opcao-com-ajuda">
          <Opcao
            tipo="radio"
            nome="metodologia"
            rotulo="IGP-M e juros de 1% ao mês em todo o período."
            marcado={opcao === "igpmJuros1"}
            aoMudar={() => aoEscolherMetodologia("igpmJuros1")}
          />
          <Ajuda assunto="IGP-M e juros de 1% ao mês em todo o período">
            IGP-M e juros de 1% ao mês do vencimento até a data do cálculo, sem a mudança de
            30/08/2024. Use quando a decisão ou o acordo fixou esses critérios, ou quando o juízo
            mantém o critério anterior à Lei 14.905/2024. Sem isso, a regra legal desde 30/08/2024 é
            IPCA e taxa legal (arts. 389 e 406 do CC).
          </Ajuda>
        </span>
        {opcao === null ? (
          <p className="resumo-metodologia">Ajustada: {resumirMetodologia(calculo.metodologia)}</p>
        ) : null}
        <div className="linha">
          <button type="button" className="botao secundario" onClick={aoAjustar}>
            Ajustar
          </button>
        </div>
      </fieldset>
      <div className="linha">
        <CampoTexto
          id="multa"
          rotulo="Multa (art. 523, %)"
          ajuda="Multa do art. 523, §1º, do CPC (rito da penhora), sobre o total devido; os honorários não incidem sobre ela, nem ela sobre eles. Vem com 10%, o percentual da lei; no rito da prisão, ponha 0."
          valor={multa.texto}
          aoMudar={multa.aoMudar}
          aoSair={multa.aoSair}
          erro={multa.erro}
          inputMode="decimal"
          classe="curto"
        />
        <CampoTexto
          id="honorarios"
          rotulo="Honorários (%)"
          ajuda="Honorários do art. 523, §1º, do CPC (rito da penhora), sobre o total devido, sem incidir sobre a multa. Vêm com 10%, o percentual da lei; no rito da prisão, ponha 0."
          valor={honorarios.texto}
          aoMudar={honorarios.aoMudar}
          aoSair={honorarios.aoSair}
          erro={honorarios.erro}
          inputMode="decimal"
          classe="curto"
        />
        <CampoTexto
          id="data-elaboracao"
          rotulo="Data de elaboração"
          ajuda="Data até a qual tudo é atualizado. O padrão é hoje."
          tipo="date"
          valor={data.texto}
          aoMudar={data.aoMudar}
          aoSair={data.aoSair}
          erro={data.erro}
          min="1900-01-01"
          max={DATA_MAXIMA}
        />
      </div>
      <CampoArea
        id="observacoes"
        rotulo="Observações para o relatório"
        valor={calculo.observacoes}
        aoMudar={aoMudarObservacoes}
        classe="largo"
        ajuda='Texto livre que sai no bloco "Metodologia e fundamentos" do relatório (ex.: "Conforme sentença de fls. 45").'
      />
    </section>
  );
}
