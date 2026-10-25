import { useEffect, useRef, useState } from "react";
import { formatarData } from "../../compartilhado/formatacao.ts";
import { decompor } from "../../compartilhado/datas.ts";
import type {
  Base,
  FormaDaBase,
  IndiceReajuste,
  PeriodoDaBase,
} from "../../compartilhado/tipos.ts";
import { periodosDaBaseOrdenados } from "../../motor/base.ts";
import { CampoSelecao, CampoTexto, Opcao, useCampoValidado } from "../componentes/Campo.tsx";
import {
  DATA_MAXIMA,
  DATA_MINIMA,
  formatarMoedaParaCampo,
  formatarNumeroParaCampo,
  lerData,
  lerPercentual,
  lerValorPositivo,
} from "../entrada.ts";
import { dividirBase, removerDivisaoDaBase, tituloDoPeriodo, trocarForma } from "../estado/base.ts";
import type { CampoDaBase, FaltaDaBase } from "../estado/faltas.ts";

/**
 * Seção "2 · Base dos alimentos" (§9.2, §6.3, §17.2, §21.5): a base é uma lista de períodos
 * seguidos. Com um período só, a seção é a de antes (três formas, e só os campos da forma
 * escolhida aparecem); com dois ou mais, um bloco por período, com o título ("Até 31/12/2024",
 * "Desde 01/01/2025"), a forma e os campos dele e, menos no primeiro, "Remover divisão". No pé, a
 * divisão fica recolhida num botão discreto, "Dividir a base em períodos", que abre "Dividir em"
 * com o foco na data; dividida a base, o campo recolhe e o foco volta ao botão, e com erro o campo
 * continua aberto (quem usa o teclado não se perde). O mês do reajuste some quando o reajuste é
 * pelo salário mínimo ou "nenhum"; em "% dos rendimentos" o rendimento padrão é exigido. Cada
 * período guarda um rascunho por forma, para que trocar de forma e voltar não perca o que foi
 * digitado. Explicações nos balões ⓘ dos campos. Com prestação lançada pela base, o campo que
 * falta fica em vermelho no bloco do período ("Informe o percentual."; decisões de 13/10/2026).
 */

/** Erro do campo: o da leitura (texto inválido) ou, com o campo em branco, o de campo que falta. */
function erroDoCampo(
  campo: { texto: string; erro: string | null },
  qual: CampoDaBase,
  faltas: FaltaDaBase[],
): string | null {
  if (campo.erro !== null) return campo.erro;
  if (campo.texto.trim() !== "") return null;
  return faltas.find((f) => f.campo === qual)?.erro ?? null;
}

export const NOMES_DOS_MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

type BaseValorFixo = Extract<FormaDaBase, { tipo: "valorFixo" }>;
type BasePercentualSM = Extract<FormaDaBase, { tipo: "percentualSalarioMinimo" }>;
type BasePercentualRendimentos = Extract<FormaDaBase, { tipo: "percentualRendimentos" }>;

interface Rascunhos {
  valorFixo: BaseValorFixo;
  percentualSalarioMinimo: BasePercentualSM;
  percentualRendimentos: BasePercentualRendimentos;
}

const OPCOES_DE_REAJUSTE: ReadonlyArray<{ valor: IndiceReajuste; rotulo: string }> = [
  { valor: "nenhum", rotulo: "nenhum (valor constante)" },
  { valor: "IPCA", rotulo: "IPCA" },
  { valor: "INPC", rotulo: "INPC" },
  { valor: "IGP-M", rotulo: "IGP-M" },
  { valor: "SM", rotulo: "salário mínimo (proporção)" },
];

const OPCOES_DE_MES = NOMES_DOS_MESES.map((nome, i) => ({ valor: String(i + 1), rotulo: nome }));

/** Rascunhos de um período; o valor fixo nasce fixado no início do período (o primeiro, hoje). */
function rascunhosIniciais(base: FormaDaBase, fixacao: string): Rascunhos {
  const mes = decompor(fixacao).mes;
  return {
    valorFixo: {
      tipo: "valorFixo",
      valor: "",
      dataFixacao: fixacao,
      indiceReajuste: "nenhum",
      mesReajuste: mes,
    },
    percentualSalarioMinimo: { tipo: "percentualSalarioMinimo", percentual: "" },
    percentualRendimentos: { tipo: "percentualRendimentos", percentual: "", rendimentoPadrao: "" },
    [base.tipo]: base,
  };
}

export function BaseDosAlimentos({
  base,
  hoje,
  faltas = [],
  aoMudar,
}: {
  base: Base;
  /** data de hoje, para o rascunho do valor fixo do primeiro período */
  hoje: string;
  /** campos que faltam para apurar as prestações lançadas (`faltasDaBase`) */
  faltas?: FaltaDaBase[];
  aoMudar: (base: Base) => void;
}) {
  const periodos = periodosDaBaseOrdenados(base);
  const varios = periodos.length > 1;
  const [dividindo, setDividindo] = useState(false);
  const [dataDaDivisao, setDataDaDivisao] = useState("");
  const [avisoDaDivisao, setAvisoDaDivisao] = useState<string | null>(null);
  // depois de dividir, o campo recolhe e o foco volta ao botão que o abre (como o "+ Incluir" da
  // tabela); o botão só existe com o campo recolhido, por isso o foco espera o efeito
  const botaoDividir = useRef<HTMLButtonElement>(null);
  const focarBotaoDividir = useRef(false);
  useEffect(() => {
    if (!dividindo && focarBotaoDividir.current) {
      focarBotaoDividir.current = false;
      botaoDividir.current?.focus();
    }
  }, [dividindo]);
  const dividir = () => {
    const leitura = lerData(dataDaDivisao);
    if (!leitura.ok) {
      setAvisoDaDivisao(leitura.erro);
      return;
    }
    const { base: nova, aviso } = dividirBase(base, leitura.valor);
    setAvisoDaDivisao(aviso ?? null);
    if (aviso === undefined) {
      setDataDaDivisao("");
      focarBotaoDividir.current = true;
      setDividindo(false);
      aoMudar(nova);
    }
  };
  const forma = (periodo: PeriodoDaBase, i: number) => (
    <FormaDoPeriodo
      forma={periodo.forma}
      prefixo={i === 0 ? "base" : `base-${i}`}
      fixacao={periodo.de ?? hoje}
      faltas={faltas.filter((f) => f.periodo === i)}
      aoMudar={(nova) => aoMudar(trocarForma(base, i, nova))}
    />
  );
  return (
    <section className="secao" aria-labelledby="titulo-base">
      <h2 id="titulo-base">2 · Base dos alimentos</h2>
      {periodos.map((periodo, i) => (
        // a mesma estrutura com um ou com vários períodos (só o título e o papel de grupo
        // mudam), e a chave é o início do período: dividir ou juntar não remonta os blocos que
        // ficam, nem o primeiro, que guarda os rascunhos do que foi digitado em cada forma
        <div
          key={periodo.de ?? "inicio"}
          className={varios ? "periodo" : undefined}
          role={varios ? "group" : undefined}
          aria-labelledby={varios ? `titulo-periodo-base-${i}` : undefined}
        >
          {varios ? (
            <div className="titulo-do-periodo">
              <h3 id={`titulo-periodo-base-${i}`}>{tituloDoPeriodo(periodo)}</h3>
              {i > 0 && periodo.de !== null ? (
                <button
                  type="button"
                  className="botao discreto"
                  onClick={() => aoMudar(removerDivisaoDaBase(base, i))}
                  aria-label={`Remover a divisão de ${formatarData(periodo.de)}`}
                >
                  Remover divisão
                </button>
              ) : null}
            </div>
          ) : null}
          {forma(periodo, i)}
        </div>
      ))}
      <div className="linha dividir-base">
        {dividindo ? (
          <>
            <CampoTexto
              id="base-dividir-em"
              rotulo="Dividir em"
              ajuda="A data informada passa a iniciar um período novo da base, com as mesmas regras do anterior; depois ajuste a forma e os valores de cada um. Ex.: valor fixo até 2024 e % do salário mínimo desde 2025."
              tipo="date"
              valor={dataDaDivisao}
              aoMudar={(v) => {
                setDataDaDivisao(v);
                setAvisoDaDivisao(null);
              }}
              erro={avisoDaDivisao}
              min={DATA_MINIMA}
              max={DATA_MAXIMA}
              autoFocus
            />
            <button type="button" className="botao secundario" onClick={dividir}>
              Dividir
            </button>
          </>
        ) : (
          <button
            type="button"
            className="botao discreto"
            ref={botaoDividir}
            onClick={() => setDividindo(true)}
          >
            Dividir a base em períodos
          </button>
        )}
      </div>
    </section>
  );
}

/** A escolha da forma e os campos dela, num período (`prefixo` distingue os ids de cada bloco). */
function FormaDoPeriodo({
  forma,
  prefixo,
  fixacao,
  faltas,
  aoMudar,
}: {
  forma: FormaDaBase;
  prefixo: string;
  /** data de fixação do rascunho do valor fixo: o início do período (o primeiro, hoje) */
  fixacao: string;
  faltas: FaltaDaBase[];
  aoMudar: (forma: FormaDaBase) => void;
}) {
  const [rascunhos, setRascunhos] = useState(() => rascunhosIniciais(forma, fixacao));
  const escolher = (tipo: FormaDaBase["tipo"]) => {
    // a forma atual entra nos rascunhos antes da troca: ela pode ter mudado por fora (o
    // rendimento aplicado pelo lápis, um arquivo aberto) sem passar por este bloco
    const atuais = { ...rascunhos, [forma.tipo]: forma };
    setRascunhos(atuais);
    aoMudar(atuais[tipo]);
  };
  const atualizar = <T extends FormaDaBase>(nova: T) => {
    setRascunhos({ ...rascunhos, [nova.tipo]: nova });
    aoMudar(nova);
  };
  const nome = prefixo === "base" ? "tipo-da-base" : `tipo-da-${prefixo}`;
  return (
    <>
      <fieldset className="grupo">
        <legend>Como os alimentos foram fixados</legend>
        <Opcao
          tipo="radio"
          nome={nome}
          rotulo="Valor fixo em reais"
          marcado={forma.tipo === "valorFixo"}
          aoMudar={() => escolher("valorFixo")}
        />
        <Opcao
          tipo="radio"
          nome={nome}
          rotulo="% do salário mínimo"
          marcado={forma.tipo === "percentualSalarioMinimo"}
          aoMudar={() => escolher("percentualSalarioMinimo")}
        />
        <Opcao
          tipo="radio"
          nome={nome}
          rotulo="% dos rendimentos"
          marcado={forma.tipo === "percentualRendimentos"}
          aoMudar={() => escolher("percentualRendimentos")}
        />
      </fieldset>
      {forma.tipo === "valorFixo" ? (
        <ValorFixo base={forma} prefixo={prefixo} faltas={faltas} aoMudar={atualizar} />
      ) : forma.tipo === "percentualSalarioMinimo" ? (
        <PercentualSalarioMinimo
          base={forma}
          prefixo={prefixo}
          faltas={faltas}
          aoMudar={atualizar}
        />
      ) : (
        <PercentualRendimentos base={forma} prefixo={prefixo} faltas={faltas} aoMudar={atualizar} />
      )}
    </>
  );
}

function ValorFixo({
  base,
  prefixo,
  faltas,
  aoMudar,
}: {
  prefixo: string;
  base: BaseValorFixo;
  faltas: FaltaDaBase[];
  aoMudar: (base: BaseValorFixo) => void;
}) {
  const valor = useCampoValidado({
    valorGuardado: base.valor,
    paraTexto: formatarMoedaParaCampo,
    ler: lerValorPositivo,
    aoValidar: (v) => aoMudar({ ...base, valor: v }),
  });
  const data = useCampoValidado({
    valorGuardado: base.dataFixacao,
    paraTexto: (d) => d,
    ler: lerData,
    // o mês do reajuste acompanha a data de fixação enquanto for igual ao mês da data anterior
    // (uma escolha diferente, feita à mão no seletor, é preservada)
    aoValidar: (d) =>
      aoMudar({
        ...base,
        dataFixacao: d,
        mesReajuste:
          base.mesReajuste === decompor(base.dataFixacao).mes ? decompor(d).mes : base.mesReajuste,
      }),
  });
  const comMes = base.indiceReajuste !== "nenhum" && base.indiceReajuste !== "SM";
  return (
    <>
      <div className="linha">
        <CampoTexto
          id={`${prefixo}-valor`}
          rotulo="Valor fixado"
          valor={valor.texto}
          aoMudar={valor.aoMudar}
          aoSair={valor.aoSair}
          erro={erroDoCampo(valor, "valor", faltas)}
          inputMode="decimal"
          classe="medio"
          placeholder="ex.: 1.000,00"
        />
        <CampoTexto
          id={`${prefixo}-fixacao`}
          rotulo="Fixado em"
          ajuda="Data da sentença ou do acordo que fixou o valor. O mês do reajuste acompanha esta data, salvo se você escolher outro."
          tipo="date"
          valor={data.texto}
          aoMudar={data.aoMudar}
          aoSair={data.aoSair}
          erro={data.erro}
          min={DATA_MINIMA}
          max={DATA_MAXIMA}
        />
        <CampoSelecao
          id={`${prefixo}-reajuste`}
          rotulo="Reajuste anual"
          ajuda={
            base.indiceReajuste === "nenhum"
              ? "Sem reajuste, o valor fixado vale igual para todas as prestações. Se a sentença previu reajuste, escolha o índice."
              : base.indiceReajuste === "SM"
                ? "O valor acompanha o salário mínimo: valor fixado × salário mínimo do mês do vencimento ÷ salário mínimo do mês da fixação."
                : "O valor é reajustado a cada 12 meses pelo índice acumulado dos 12 meses anteriores ao mês do reajuste. Padrão: o mês da fixação; mude se a sentença disser outro mês."
          }
          valor={base.indiceReajuste}
          opcoes={OPCOES_DE_REAJUSTE}
          aoMudar={(indice) => aoMudar({ ...base, indiceReajuste: indice })}
        />
        {comMes ? (
          <CampoSelecao
            id={`${prefixo}-mes-reajuste`}
            rotulo="Mês do reajuste"
            valor={String(base.mesReajuste)}
            opcoes={OPCOES_DE_MES}
            aoMudar={(mes) => aoMudar({ ...base, mesReajuste: Number(mes) })}
          />
        ) : null}
      </div>
    </>
  );
}

function PercentualSalarioMinimo({
  base,
  prefixo,
  faltas,
  aoMudar,
}: {
  prefixo: string;
  base: BasePercentualSM;
  faltas: FaltaDaBase[];
  aoMudar: (base: BasePercentualSM) => void;
}) {
  const percentual = useCampoValidado({
    valorGuardado: base.percentual,
    paraTexto: formatarNumeroParaCampo,
    ler: lerPercentual,
    aoValidar: (p) => aoMudar({ ...base, percentual: p }),
  });
  return (
    <>
      <div className="linha">
        <CampoTexto
          id={`${prefixo}-percentual-sm`}
          rotulo="Percentual do salário mínimo"
          ajuda="Percentual × salário mínimo oficial do mês de cada vencimento (valor publicado pelo Banco Central). Mês ainda sem salário mínimo publicado usa o último publicado, com aviso."
          valor={percentual.texto}
          aoMudar={percentual.aoMudar}
          aoSair={percentual.aoSair}
          erro={erroDoCampo(percentual, "percentual", faltas)}
          inputMode="decimal"
          classe="curto"
          placeholder="ex.: 30"
        />
      </div>
    </>
  );
}

function PercentualRendimentos({
  base,
  prefixo,
  faltas,
  aoMudar,
}: {
  prefixo: string;
  base: BasePercentualRendimentos;
  faltas: FaltaDaBase[];
  aoMudar: (base: BasePercentualRendimentos) => void;
}) {
  const percentual = useCampoValidado({
    valorGuardado: base.percentual,
    paraTexto: formatarNumeroParaCampo,
    ler: lerPercentual,
    aoValidar: (p) => aoMudar({ ...base, percentual: p }),
  });
  const rendimento = useCampoValidado({
    valorGuardado: base.rendimentoPadrao,
    paraTexto: formatarMoedaParaCampo,
    ler: lerValorPositivo,
    aoValidar: (r) => aoMudar({ ...base, rendimentoPadrao: r }),
  });
  return (
    <>
      <div className="linha">
        <CampoTexto
          id={`${prefixo}-percentual-rendimentos`}
          rotulo="Percentual dos rendimentos"
          valor={percentual.texto}
          aoMudar={percentual.aoMudar}
          aoSair={percentual.aoSair}
          erro={erroDoCampo(percentual, "percentual", faltas)}
          inputMode="decimal"
          classe="curto"
          placeholder="ex.: 30"
        />
        <CampoTexto
          id={`${prefixo}-rendimento-padrao`}
          rotulo="Rendimento mensal padrão (obrigatório)"
          ajuda="Percentual × rendimento do mês. O rendimento padrão vale para todas as prestações; quando o rendimento mudar, ou para 13º e férias, informe o rendimento daquele mês na própria prestação (lápis na tabela)."
          valor={rendimento.texto}
          aoMudar={rendimento.aoMudar}
          aoSair={rendimento.aoSair}
          erro={erroDoCampo(rendimento, "rendimentoPadrao", faltas)}
          inputMode="decimal"
          classe="medio"
          placeholder="ex.: 1.500,00"
        />
      </div>
    </>
  );
}
