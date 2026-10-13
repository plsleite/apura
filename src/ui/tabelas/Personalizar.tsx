import { useState, type FormEvent } from "react";
import { formatarData } from "../../compartilhado/formatacao.ts";
import type {
  Calculo,
  DataISO,
  EncargosProprios,
  Lancamento,
  Metodologia,
} from "../../compartilhado/tipos.ts";
import { periodoDaData } from "../../motor/base.ts";
import { Ajuda } from "../componentes/Ajuda.tsx";
import { CampoTexto, Opcao } from "../componentes/Campo.tsx";
import {
  DATA_MAXIMA,
  formatarMoedaParaCampo,
  lerData,
  lerValorPositivo,
  type Leitura,
} from "../entrada.ts";
import type { MudancasDoLancamento } from "../estado/calculo.ts";
import { EditorDePeriodos } from "../secoes/EditorDePeriodos.tsx";

/**
 * "Personalizar" (§9.3, §6.5), o lápis da linha, para os ajustes finos: valor, data (vencimento
 * ou pagamento) e descrição; rendimento do mês (período da base em % dos rendimentos), com
 * "aplicar daqui em diante", que divide a base no vencimento (§17.2); termos inicial e final da correção e dos juros; metodologia própria no mesmo editor de
 * períodos. Vencimento e valor também se corrigem na própria tabela, e a linha nova de
 * "+ Prestação"/"+ Pagamento" nasce na tabela (decisões de 13/10/2026). Validação ao aplicar,
 * erro embaixo de cada campo; termo final posterior à data de elaboração é recusado aqui (o motor
 * também limitaria, com aviso).
 */

type Campo =
  | "data"
  | "valor"
  | "rendimento"
  | "termoInicialCorrecao"
  | "termoFinalCorrecao"
  | "termoInicialJuros"
  | "termoFinalJuros";

function lerOpcional<T>(texto: string, ler: (t: string) => Leitura<T>): Leitura<T | undefined> {
  return texto.trim() === "" ? { ok: true, valor: undefined } : ler(texto);
}

export function Personalizar({
  lancamento,
  calculo,
  aoEditar,
  aoAplicarRendimento,
  aoFechar,
}: {
  lancamento: Lancamento;
  calculo: Calculo;
  aoEditar: (id: string, mudancas: MudancasDoLancamento) => void;
  aoAplicarRendimento: (id: string, rendimento: string) => void;
  aoFechar: () => void;
}) {
  const prestacao = lancamento.tipo === "prestacao";
  const [data, setData] = useState(lancamento.data);
  const [descricao, setDescricao] = useState(lancamento.descricao ?? "");
  const [valor, setValor] = useState(
    lancamento.valorInformado === undefined
      ? ""
      : formatarMoedaParaCampo(lancamento.valorInformado),
  );
  const [rendimento, setRendimento] = useState(
    lancamento.rendimento === undefined ? "" : formatarMoedaParaCampo(lancamento.rendimento),
  );
  const [termos, setTermos] = useState({
    termoInicialCorrecao: lancamento.encargos?.termoInicialCorrecao ?? "",
    termoFinalCorrecao: lancamento.encargos?.termoFinalCorrecao ?? "",
    termoInicialJuros: lancamento.encargos?.termoInicialJuros ?? "",
    termoFinalJuros: lancamento.encargos?.termoFinalJuros ?? "",
  });
  const [metodologiaPropria, setMetodologiaPropria] = useState<Metodologia | null>(
    lancamento.encargos?.metodologia ?? null,
  );
  const [erros, setErros] = useState<Partial<Record<Campo, string>>>({});
  // o rendimento do mês aparece quando o período da base em que a prestação vence é "% dos
  // rendimentos" (§17.2)
  const comRendimento =
    prestacao &&
    periodoDaData(calculo.base, lancamento.data)?.forma.tipo === "percentualRendimentos";

  const aplicar = (evento: FormEvent) => {
    evento.preventDefault();
    const novosErros: typeof erros = {};
    const dataLida = lerData(data);
    if (!dataLida.ok) novosErros.data = dataLida.erro;
    const valorLido = prestacao ? lerOpcional(valor, lerValorPositivo) : lerValorPositivo(valor);
    if (!valorLido.ok) novosErros.valor = valorLido.erro;
    const rendimentoLido = lerOpcional(rendimento, lerValorPositivo);
    if (!rendimentoLido.ok) novosErros.rendimento = rendimentoLido.erro;
    const termosLidos: Partial<Record<keyof typeof termos, DataISO>> = {};
    for (const campo of Object.keys(termos) as Array<keyof typeof termos>) {
      const leitura = lerOpcional(termos[campo], lerData);
      if (!leitura.ok) novosErros[campo] = leitura.erro;
      else if (leitura.valor !== undefined) termosLidos[campo] = leitura.valor;
    }
    const elaboracao = formatarData(calculo.dataElaboracao);
    for (const final of ["termoFinalCorrecao", "termoFinalJuros"] as const) {
      const valorFinal = termosLidos[final];
      if (valorFinal !== undefined && valorFinal > calculo.dataElaboracao) {
        novosErros[final] = `Não pode ser posterior à data de elaboração (${elaboracao}).`;
      }
    }
    for (const [inicial, final] of [
      ["termoInicialCorrecao", "termoFinalCorrecao"],
      ["termoInicialJuros", "termoFinalJuros"],
    ] as const) {
      const de = termosLidos[inicial];
      const ate = termosLidos[final];
      if (de !== undefined && ate !== undefined && de > ate) {
        novosErros[inicial] = "O termo inicial não pode ser posterior ao termo final.";
      } else if (de !== undefined && ate === undefined && de > calculo.dataElaboracao) {
        novosErros[inicial] =
          `O termo inicial não pode ser posterior à data de elaboração (${elaboracao}).`;
      }
    }
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0 || !dataLida.ok || !valorLido.ok || !rendimentoLido.ok) {
      return;
    }
    const encargos: EncargosProprios = { ...termosLidos };
    if (metodologiaPropria !== null) encargos.metodologia = metodologiaPropria;
    aoEditar(lancamento.id, {
      data: dataLida.valor,
      descricao: descricao.trim() === "" ? undefined : descricao.trim(),
      valorInformado: valorLido.valor,
      // sem o campo no painel (outra forma de base), o rendimento da linha fica como está
      rendimento: comRendimento ? rendimentoLido.valor : lancamento.rendimento,
      encargos: Object.keys(encargos).length > 0 ? encargos : undefined,
    });
    aoFechar();
  };

  const termo = (campo: keyof typeof termos, rotulo: string) => (
    <CampoTexto
      id={`personalizar-${campo}`}
      rotulo={rotulo}
      tipo="date"
      valor={termos[campo]}
      aoMudar={(v) => setTermos({ ...termos, [campo]: v })}
      erro={erros[campo]}
      min="1900-01-01"
      max={DATA_MAXIMA}
    />
  );

  return (
    <form onSubmit={aplicar} noValidate>
      <div className="linha">
        <CampoTexto
          id="personalizar-data"
          rotulo={prestacao ? "Vencimento" : "Data do pagamento"}
          tipo="date"
          valor={data}
          aoMudar={setData}
          erro={erros.data}
          min="1900-01-01"
          max={DATA_MAXIMA}
        />
        <CampoTexto
          id="personalizar-valor"
          rotulo={prestacao ? "Valor informado à mão (opcional)" : "Valor pago"}
          valor={valor}
          aoMudar={setValor}
          erro={erros.valor}
          inputMode="decimal"
          classe="medio"
          placeholder={prestacao ? "apurado pela base" : "ex.: 400,00"}
          ajuda={
            prestacao
              ? "Deixe em branco para o Apura apurar o valor pela base dos alimentos; informe-o só quando a prestação tiver valor diverso. O relatório marca os valores informados à mão."
              : "Valor positivo. Cada pagamento é atualizado da sua data até a data do cálculo e abatido do total."
          }
        />
        <CampoTexto
          id="personalizar-descricao"
          rotulo="Descrição (opcional)"
          valor={descricao}
          aoMudar={setDescricao}
          classe="medio"
          placeholder={prestacao ? "ex.: 13º salário 2025" : "ex.: pagamento em espécie"}
          ajuda={
            prestacao
              ? "Aparece ao lado do vencimento e no relatório. 13º salário e férias entram como prestação avulsa (+ Prestação) com descrição."
              : "Aparece ao lado da data e no relatório."
          }
        />
      </div>
      {comRendimento ? (
        <div className="linha">
          <CampoTexto
            id="personalizar-rendimento"
            rotulo="Rendimento deste mês (opcional)"
            valor={rendimento}
            aoMudar={setRendimento}
            erro={erros.rendimento}
            inputMode="decimal"
            classe="medio"
            placeholder="usa o rendimento padrão"
            ajuda="Para 13º ou férias, informe o rendimento do evento. Quando o salário mudou, informe o novo rendimento e use “Aplicar este rendimento daqui em diante”: a base ganha um período novo, desde este vencimento, com esse rendimento padrão (seção 2)."
          />
          <button
            type="button"
            className="botao secundario"
            onClick={() => {
              const leitura = lerValorPositivo(rendimento);
              if (!leitura.ok) {
                setErros({ ...erros, rendimento: leitura.erro });
                return;
              }
              aoAplicarRendimento(lancamento.id, leitura.valor);
              aoFechar();
            }}
          >
            Aplicar este rendimento daqui em diante
          </button>
        </div>
      ) : null}
      <fieldset className="grupo">
        <legend>
          <span className="rotulo-do-campo">
            Termos próprios
            <Ajuda assunto="Termos próprios">
              Preencha só se diferentes do padrão, que vai da data do lançamento até a data do
              cálculo. Exemplos: encargos que cessam num depósito judicial (termo final anterior à
              data de elaboração) ou sentença que fixa outro termo inicial. Termo final posterior à
              data de elaboração não é aceito.
            </Ajuda>
          </span>
        </legend>
        <div className="linha">
          {termo("termoInicialCorrecao", "Correção desde")}
          {termo("termoFinalCorrecao", "Correção até")}
          {termo("termoInicialJuros", "Juros desde")}
          {termo("termoFinalJuros", "Juros até")}
        </div>
      </fieldset>
      <div className="linha">
        <Opcao
          rotulo="Usar regras próprias de correção e juros neste lançamento"
          marcado={metodologiaPropria !== null}
          aoMudar={(marcado) =>
            setMetodologiaPropria(marcado ? structuredClone(calculo.metodologia) : null)
          }
        />
      </div>
      {metodologiaPropria !== null ? (
        <EditorDePeriodos
          metodologia={metodologiaPropria}
          aoMudar={setMetodologiaPropria}
          prefixoDosIds="proprio"
        />
      ) : null}
      <div className="dialogo-acoes">
        <button type="button" className="botao secundario" onClick={aoFechar}>
          Cancelar
        </button>
        <button type="submit" className="botao">
          Aplicar
        </button>
      </div>
    </form>
  );
}
