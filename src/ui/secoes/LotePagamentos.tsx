import { useState, type FormEvent } from "react";
import { dataNoMes, somarMeses } from "../../compartilhado/datas.ts";
import type { LoteAmortizacoes } from "../../compartilhado/tipos.ts";
import { Ajuda } from "../componentes/Ajuda.tsx";
import { Avisos } from "../componentes/Avisos.tsx";
import { CampoTexto } from "../componentes/Campo.tsx";
import {
  DATA_MAXIMA,
  DATA_MINIMA,
  formatarMoedaParaCampo,
  lerData,
  lerValorPositivo,
} from "../entrada.ts";
import { intervaloDoLote, MAXIMO_DE_MESES } from "./LotePrestacoes.tsx";

/**
 * Seção "5 · Pagamentos" (§6.2, §9.2): valor por mês e o intervalo de pagamentos, com o primeiro e
 * o último pagamento em datas completas, como o intervalo de vencimentos das prestações (decisão de
 * 13/10/2026): um pagamento por mês, no dia do primeiro (no último dia, nos meses mais curtos), até
 * o último. "Lançar em lote", cumulativo. Um segundo pagamento no mesmo mês entra como pagamento
 * avulso.
 */
export function LotePagamentosSecao({
  ultimoLote,
  avisos,
  aoLancar,
}: {
  ultimoLote?: LoteAmortizacoes;
  avisos: string[];
  aoLancar: (lote: LoteAmortizacoes) => void;
}) {
  const [valor, setValor] = useState(
    ultimoLote ? formatarMoedaParaCampo(ultimoLote.valorMensal) : "",
  );
  const [primeiro, setPrimeiro] = useState<string>(
    ultimoLote ? dataNoMes(ultimoLote.de, ultimoLote.diaPagamento) : "",
  );
  const [ultimo, setUltimo] = useState<string>(
    ultimoLote ? dataNoMes(ultimoLote.ate, ultimoLote.diaPagamento) : "",
  );
  const [erros, setErros] = useState<Partial<Record<"valor" | "primeiro" | "ultimo", string>>>({});

  const lancar = (evento: FormEvent) => {
    evento.preventDefault();
    const novosErros: typeof erros = {};
    const valorLido = lerValorPositivo(valor);
    if (!valorLido.ok) novosErros.valor = valorLido.erro;
    const primeiroLido = lerData(primeiro);
    const ultimoLido = lerData(ultimo);
    if (!primeiroLido.ok) novosErros.primeiro = primeiroLido.erro;
    if (!ultimoLido.ok) novosErros.ultimo = ultimoLido.erro;
    let lote: LoteAmortizacoes | null = null;
    if (primeiroLido.ok && ultimoLido.ok) {
      const intervalo = intervaloDoLote(primeiroLido.valor, ultimoLido.valor);
      if (intervalo === null) {
        novosErros.ultimo = "O último pagamento não pode ser anterior ao primeiro.";
      } else if (somarMeses(intervalo.de, MAXIMO_DE_MESES) <= intervalo.ate) {
        novosErros.ultimo = `No máximo ${MAXIMO_DE_MESES} meses por lote.`;
      } else if (valorLido.ok) {
        lote = {
          valorMensal: valorLido.valor,
          diaPagamento: intervalo.diaVencimento,
          de: intervalo.de,
          ate: intervalo.ate,
        };
      }
    }
    setErros(novosErros);
    if (lote !== null) aoLancar(lote);
  };

  return (
    <section className="secao" aria-labelledby="titulo-pagamentos">
      <div className="titulo-secao">
        <h2 id="titulo-pagamentos">5 · Pagamentos</h2>
        <Ajuda assunto="Pagamentos">
          Lança um pagamento por mês, do primeiro ao último pagamento, no dia do primeiro (no último
          dia do mês, quando ele é mais curto). Cada pagamento é atualizado da sua data até a data
          do cálculo e abatido do total. Mês que já tem pagamento não é repetido: um segundo
          pagamento no mesmo mês entra pelo "+ Pagamento", na tabela ao lado.
        </Ajuda>
      </div>
      <form onSubmit={lancar} noValidate>
        <div className="linha">
          <CampoTexto
            id="pagamento-valor"
            rotulo="Valor por mês"
            valor={valor}
            aoMudar={setValor}
            erro={erros.valor}
            inputMode="decimal"
            classe="medio"
            placeholder="ex.: 400,00"
          />
          <CampoTexto
            id="pagamento-primeiro"
            rotulo="Primeiro pagamento"
            tipo="date"
            valor={primeiro}
            aoMudar={setPrimeiro}
            erro={erros.primeiro}
            min={DATA_MINIMA}
            max={DATA_MAXIMA}
          />
          <CampoTexto
            id="pagamento-ultimo"
            rotulo="Último pagamento"
            tipo="date"
            valor={ultimo}
            aoMudar={setUltimo}
            erro={erros.ultimo}
            min={DATA_MINIMA}
            max={DATA_MAXIMA}
          />
          <button type="submit" className="botao">
            Lançar em lote
          </button>
        </div>
      </form>
      <Avisos avisos={avisos} titulo="Avisos do lote de pagamentos" />
    </section>
  );
}
