import { useState, type FormEvent } from "react";
import {
  competenciaDe,
  dataNoMes,
  decompor,
  mesAnterior,
  somarMeses,
} from "../../compartilhado/datas.ts";
import type { Competencia, DataISO, LotePrestacoes } from "../../compartilhado/tipos.ts";
import { Ajuda } from "../componentes/Ajuda.tsx";
import { Avisos } from "../componentes/Avisos.tsx";
import { CampoTexto, Opcao } from "../componentes/Campo.tsx";
import { DATA_MAXIMA, DATA_MINIMA, lerData, lerInteiro } from "../entrada.ts";

/** Limite de meses por lote: 600 (50 anos), para a tela nunca pedir milhares de prestações. */
export const MAXIMO_DE_MESES = 600;

/**
 * Seção "3 · Prestações em atraso" (§6.1, §9.2). Por padrão, o intervalo de vencimentos, com o
 * primeiro e o último vencimento em datas completas: as prestações vencem todo mês no dia do
 * primeiro (no último dia, nos meses mais curtos), até o último vencimento informado. Em "Meses
 * em atraso", aparecem o dia do vencimento e quantos meses (decisão de 13/10/2026). "Lançar em
 * lote" é cumulativo. A validação é feita ao lançar, com erro embaixo de cada campo; o formulário
 * guarda o último lote lançado.
 */
export function LotePrestacoesSecao({
  ultimoLote,
  avisos,
  aoLancar,
}: {
  ultimoLote?: LotePrestacoes;
  /** avisos do último lote de prestações (meses já lançados, lote vazio) */
  avisos: string[];
  aoLancar: (lote: LotePrestacoes) => void;
}) {
  const [modo, setModo] = useState<"intervalo" | "meses">(
    ultimoLote?.mesesEmAtraso !== undefined ? "meses" : "intervalo",
  );
  const [dia, setDia] = useState(
    ultimoLote?.mesesEmAtraso !== undefined ? String(ultimoLote.diaVencimento) : "",
  );
  const [meses, setMeses] = useState(ultimoLote?.mesesEmAtraso?.toString() ?? "");
  const [primeiro, setPrimeiro] = useState<string>(
    ultimoLote?.de ? dataNoMes(ultimoLote.de, ultimoLote.diaVencimento) : "",
  );
  const [ultimo, setUltimo] = useState<string>(
    ultimoLote?.ate ? dataNoMes(ultimoLote.ate, ultimoLote.diaVencimento) : "",
  );
  const [erros, setErros] = useState<
    Partial<Record<"dia" | "meses" | "primeiro" | "ultimo", string>>
  >({});

  const lancar = (evento: FormEvent) => {
    evento.preventDefault();
    const novosErros: typeof erros = {};
    let lote: LotePrestacoes | null = null;
    if (modo === "meses") {
      const diaLido = lerInteiro(dia, 1, 31);
      if (!diaLido.ok) novosErros.dia = diaLido.erro;
      const mesesLidos = lerInteiro(meses, 1, MAXIMO_DE_MESES);
      if (!mesesLidos.ok) novosErros.meses = mesesLidos.erro;
      if (diaLido.ok && mesesLidos.ok) {
        lote = { diaVencimento: diaLido.valor, mesesEmAtraso: mesesLidos.valor };
      }
    } else {
      const primeiroLido = lerData(primeiro);
      const ultimoLido = lerData(ultimo);
      if (!primeiroLido.ok) novosErros.primeiro = primeiroLido.erro;
      if (!ultimoLido.ok) novosErros.ultimo = ultimoLido.erro;
      if (primeiroLido.ok && ultimoLido.ok) {
        const intervalo = intervaloDoLote(primeiroLido.valor, ultimoLido.valor);
        if (intervalo === null) {
          novosErros.ultimo = "O último vencimento não pode ser anterior ao primeiro.";
        } else if (somarMeses(intervalo.de, MAXIMO_DE_MESES) <= intervalo.ate) {
          novosErros.ultimo = `No máximo ${MAXIMO_DE_MESES} meses por lote.`;
        } else {
          lote = intervalo;
        }
      }
    }
    setErros(novosErros);
    if (lote !== null) aoLancar(lote);
  };

  return (
    <section className="secao" aria-labelledby="titulo-prestacoes">
      <div className="titulo-secao">
        <h2 id="titulo-prestacoes">3 · Prestações em atraso</h2>
        <Ajuda assunto="Prestações em atraso">
          Cada "Lançar em lote" acrescenta as prestações do período à tabela ao lado, sem apagar as
          anteriores (ex.: jan a mar; depois jul a set); um mês de vencimento já lançado não é
          repetido. No intervalo, informe o primeiro e o último vencimento: as prestações vencem
          todo mês no dia do primeiro (no último dia do mês, quando ele é mais curto). "Meses em
          atraso" lança os últimos vencimentos já ocorridos até a data de elaboração, do mais
          recente para trás (dia 5 e 3 meses, com elaboração em 10/10/2026: ago, set e out/2026).
          Edição, exclusão e inclusão avulsa (13º, férias) ficam na tabela.
        </Ajuda>
      </div>
      <form onSubmit={lancar} noValidate>
        <fieldset className="grupo">
          <legend>Quais meses</legend>
          <Opcao
            tipo="radio"
            nome="modo-do-lote"
            rotulo="Intervalo de vencimentos"
            marcado={modo === "intervalo"}
            aoMudar={() => setModo("intervalo")}
          />
          <Opcao
            tipo="radio"
            nome="modo-do-lote"
            rotulo="Meses em atraso"
            marcado={modo === "meses"}
            aoMudar={() => setModo("meses")}
          />
        </fieldset>
        <div className="linha">
          {modo === "meses" ? (
            <>
              <CampoTexto
                id="lote-dia"
                rotulo="Dia do vencimento"
                valor={dia}
                aoMudar={setDia}
                erro={erros.dia}
                inputMode="numeric"
                classe="curto"
                placeholder="ex.: 5"
              />
              <CampoTexto
                id="lote-meses"
                rotulo="Quantos meses"
                valor={meses}
                aoMudar={setMeses}
                erro={erros.meses}
                inputMode="numeric"
                classe="curto"
                placeholder="ex.: 3"
              />
            </>
          ) : (
            <>
              <CampoTexto
                id="lote-primeiro"
                rotulo="Primeiro vencimento"
                tipo="date"
                valor={primeiro}
                aoMudar={setPrimeiro}
                erro={erros.primeiro}
                min={DATA_MINIMA}
                max={DATA_MAXIMA}
              />
              <CampoTexto
                id="lote-ultimo"
                rotulo="Último vencimento"
                tipo="date"
                valor={ultimo}
                aoMudar={setUltimo}
                erro={erros.ultimo}
                min={DATA_MINIMA}
                max={DATA_MAXIMA}
              />
            </>
          )}
          <button type="submit" className="botao">
            Lançar em lote
          </button>
        </div>
      </form>
      <Avisos avisos={avisos} titulo="Avisos do lote de prestações" />
    </section>
  );
}

/**
 * Do primeiro e do último vencimento ao lote do motor: o dia é o do primeiro; o mês final é o do
 * último vencimento, ou o anterior, quando a prestação daquele mês venceria depois da data
 * informada (primeiro 20/01, último 10/03: jan e fev). `null` quando o último vem antes do primeiro.
 */
export function intervaloDoLote(
  primeiro: DataISO,
  ultimo: DataISO,
): { diaVencimento: number; de: Competencia; ate: Competencia } | null {
  if (ultimo < primeiro) return null;
  const diaVencimento = decompor(primeiro).dia;
  const de = competenciaDe(primeiro);
  let ate = competenciaDe(ultimo);
  if (dataNoMes(ate, diaVencimento) > ultimo) ate = mesAnterior(ate);
  return { diaVencimento, de, ate };
}
