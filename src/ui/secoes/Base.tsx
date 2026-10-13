import { useState } from "react";
import { decompor } from "../../compartilhado/datas.ts";
import type { Base, IndiceReajuste } from "../../compartilhado/tipos.ts";
import { CampoSelecao, CampoTexto, Opcao, useCampoValidado } from "../componentes/Campo.tsx";
import {
  formatarMoedaParaCampo,
  formatarNumeroParaCampo,
  lerData,
  lerPercentual,
  lerValorPositivo,
} from "../entrada.ts";
import type { CampoDaBase, FaltaDaBase } from "../estado/faltas.ts";

/**
 * Seção "2 · Base dos alimentos" (§9.2, §6.3): três formas, e só os campos da forma escolhida
 * aparecem. O mês do reajuste some quando o reajuste é pelo salário mínimo ou "nenhum"; em "% dos
 * rendimentos" o rendimento padrão é exigido. Cada forma guarda um rascunho, para que trocar de
 * forma e voltar não perca o que foi digitado. Explicações nos balões ⓘ dos campos. Com prestação
 * lançada pela base, o campo que falta fica em vermelho ("Informe o percentual."; decisão de
 * 13/10/2026).
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

type BaseValorFixo = Extract<Base, { tipo: "valorFixo" }>;
type BasePercentualSM = Extract<Base, { tipo: "percentualSalarioMinimo" }>;
type BasePercentualRendimentos = Extract<Base, { tipo: "percentualRendimentos" }>;

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

function rascunhosIniciais(base: Base, hoje: string): Rascunhos {
  const mes = decompor(hoje).mes;
  return {
    valorFixo: {
      tipo: "valorFixo",
      valor: "",
      dataFixacao: hoje,
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
  /** data de hoje, para o rascunho do valor fixo */
  hoje: string;
  /** campos que faltam para apurar as prestações lançadas (`faltasDaBase`) */
  faltas?: FaltaDaBase[];
  aoMudar: (base: Base) => void;
}) {
  const [rascunhos, setRascunhos] = useState(() => rascunhosIniciais(base, hoje));
  const escolher = (tipo: Base["tipo"]) => aoMudar(rascunhos[tipo]);
  const atualizar = <T extends Base>(nova: T) => {
    setRascunhos({ ...rascunhos, [nova.tipo]: nova });
    aoMudar(nova);
  };
  return (
    <section className="secao" aria-labelledby="titulo-base">
      <h2 id="titulo-base">2 · Base dos alimentos</h2>
      <fieldset className="grupo">
        <legend>Como os alimentos foram fixados</legend>
        <Opcao
          tipo="radio"
          nome="tipo-da-base"
          rotulo="Valor fixo em reais"
          marcado={base.tipo === "valorFixo"}
          aoMudar={() => escolher("valorFixo")}
        />
        <Opcao
          tipo="radio"
          nome="tipo-da-base"
          rotulo="% do salário mínimo"
          marcado={base.tipo === "percentualSalarioMinimo"}
          aoMudar={() => escolher("percentualSalarioMinimo")}
        />
        <Opcao
          tipo="radio"
          nome="tipo-da-base"
          rotulo="% dos rendimentos"
          marcado={base.tipo === "percentualRendimentos"}
          aoMudar={() => escolher("percentualRendimentos")}
        />
      </fieldset>
      {base.tipo === "valorFixo" ? (
        <ValorFixo base={base} faltas={faltas} aoMudar={atualizar} />
      ) : base.tipo === "percentualSalarioMinimo" ? (
        <PercentualSalarioMinimo base={base} faltas={faltas} aoMudar={atualizar} />
      ) : (
        <PercentualRendimentos base={base} faltas={faltas} aoMudar={atualizar} />
      )}
    </section>
  );
}

function ValorFixo({
  base,
  faltas,
  aoMudar,
}: {
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
          id="base-valor"
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
          id="base-fixacao"
          rotulo="Fixado em"
          ajuda="Data da sentença ou do acordo que fixou o valor. O mês do reajuste acompanha esta data, salvo se você escolher outro."
          tipo="date"
          valor={data.texto}
          aoMudar={data.aoMudar}
          erro={data.erro}
          min="1900-01-01"
        />
        <CampoSelecao
          id="base-reajuste"
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
            id="base-mes-reajuste"
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
  faltas,
  aoMudar,
}: {
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
          id="base-percentual-sm"
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
  faltas,
  aoMudar,
}: {
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
          id="base-percentual-rendimentos"
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
          id="base-rendimento-padrao"
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
