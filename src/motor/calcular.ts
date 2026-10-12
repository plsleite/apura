import { competenciaDe } from "../compartilhado/datas.ts";
import {
  arredondar,
  CEM,
  decimal,
  paraTexto,
  ZERO,
  type Decimal,
} from "../compartilhado/decimal.ts";
import { formatarCompetencia, formatarData, formatarMoeda } from "../compartilhado/formatacao.ts";
import { CODIGO_DA_SERIE, NOME_DA_SERIE } from "../compartilhado/tipos.ts";
import type {
  Calculo,
  CodigoSerie,
  Competencia,
  DataISO,
  IndiceUsado,
  Lancamento,
  LancamentoCalculado,
  Resultado,
  TabelaIndices,
  Totais,
} from "../compartilhado/tipos.ts";
import { fatorCorrecao, resolverIndicesMensais } from "./correcao.ts";
import { jurosSimples } from "./juros.ts";
import { validarMetodologia } from "./periodos.ts";

/** Ordena códigos de série como números ("189" antes de "1619"). */
function compararSeries(a: CodigoSerie, b: CodigoSerie): number {
  return Number(a) - Number(b);
}

/**
 * Termo final próprio posterior à data de elaboração é limitado a ela, com aviso: o cálculo
 * atualiza até a data em que é feito (§6.4).
 */
function limitarTermoFinal(
  termo: DataISO | undefined,
  dataElaboracao: DataISO,
  rotulo: string,
  avisos: string[],
): DataISO {
  if (termo === undefined || termo <= dataElaboracao) return termo ?? dataElaboracao;
  avisos.push(
    `Termo final ${rotulo} (${formatarData(termo)}) posterior à data de elaboração: limitado a ${formatarData(dataElaboracao)}.`,
  );
  return dataElaboracao;
}

/**
 * Atualiza um lançamento (prestação ou amortização) da sua data até a data de elaboração,
 * ou pelos termos próprios e metodologia própria quando informados (§6.4 e §6.5). O fator e o
 * percentual multiplicam com precisão integral e só são arredondados para exibição (convenção
 * do SAJ); corrigido e juros têm 2 casas.
 */
export function atualizarLancamento(
  lancamento: Lancamento,
  calculo: Calculo,
  indices: TabelaIndices,
): LancamentoCalculado {
  return atualizarComRastro(lancamento, calculo, indices).lancamento;
}

/**
 * Faz o trabalho de `atualizarLancamento` e devolve também as competências cuja taxa legal faltou
 * na tabela, para o resumo do `Resultado` em `calcular`.
 */
function atualizarComRastro(
  lancamento: Lancamento,
  calculo: Calculo,
  indices: TabelaIndices,
): { lancamento: LancamentoCalculado; mesesSemTaxaLegal: Competencia[] } {
  const metodologia = lancamento.encargos?.metodologia ?? calculo.metodologia;
  const { fatorCasas, percentualCasas, valorCasas } = metodologia.arredondamento;
  const avisos: string[] = [];
  if (lancamento.encargos?.metodologia !== undefined) {
    avisos.push(...validarMetodologia(lancamento.encargos.metodologia));
  }
  const termoInicialCorrecao = lancamento.encargos?.termoInicialCorrecao ?? lancamento.data;
  const termoFinalCorrecao = limitarTermoFinal(
    lancamento.encargos?.termoFinalCorrecao,
    calculo.dataElaboracao,
    "da correção",
    avisos,
  );
  const termoInicialJuros = lancamento.encargos?.termoInicialJuros ?? lancamento.data;
  const termoFinalJuros = limitarTermoFinal(
    lancamento.encargos?.termoFinalJuros,
    calculo.dataElaboracao,
    "dos juros",
    avisos,
  );

  // Valor-base: nesta fase, só o valor informado (a apuração pela base dos alimentos é a fase 3).
  let valorBase = ZERO;
  let memoriaBase = "Valor não informado";
  if (lancamento.valorInformado !== undefined) {
    valorBase = arredondar(decimal(lancamento.valorInformado), valorCasas);
    memoriaBase = `Valor informado: ${formatarMoeda(valorBase)}`;
  } else {
    avisos.push("Valor não informado: o lançamento entrou com R$ 0,00.");
  }

  if (lancamento.data > calculo.dataElaboracao) {
    avisos.push(
      `Data do lançamento (${formatarData(lancamento.data)}) posterior à data de elaboração (${formatarData(calculo.dataElaboracao)}): sem correção e sem juros.`,
    );
  }

  const correcao = fatorCorrecao({
    termoInicial: termoInicialCorrecao,
    termoFinal: termoFinalCorrecao,
    indices: resolverIndicesMensais(
      metodologia,
      indices,
      competenciaDe(termoInicialCorrecao),
      competenciaDe(termoFinalCorrecao),
    ),
    incidenciaMesInicial: metodologia.incidenciaMesInicial,
    deflacao: metodologia.deflacao,
  });
  for (const competencia of correcao.mesesSemIndice) {
    const serie = correcao.indices.find((i) => i.competencia === competencia)?.serie ?? null;
    const nome = serie === null ? "Índice" : NOME_DA_SERIE[serie];
    avisos.push(
      `${nome} de ${formatarCompetencia(competencia)} não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).`,
    );
  }
  if (correcao.pisoAplicado) {
    avisos.push(
      "Índices negativos no período: o valor corrigido foi mantido igual ao valor original (fator 1,000000).",
    );
  }
  const corrigido = arredondar(valorBase.times(correcao.fator), valorCasas);

  const juros = jurosSimples({
    termoInicial: termoInicialJuros,
    termoFinal: termoFinalJuros,
    metodologia,
    indices,
    casas: percentualCasas,
  });
  avisos.push(...juros.avisos);
  // Juros sobre o corrigido sem arredondar, como o SAJ (decisão de 11/10/2026, ponto 9).
  const jurosValor = arredondar(
    valorBase.times(correcao.fator).times(juros.percentual).div(CEM),
    valorCasas,
  );
  const atualizado = corrigido.plus(jurosValor);

  return {
    lancamento: {
      id: lancamento.id,
      tipo: lancamento.tipo,
      data: lancamento.data,
      competencia: lancamento.competencia,
      descricao: lancamento.descricao,
      valorBase: paraTexto(valorBase, valorCasas),
      memoriaBase,
      correcao: {
        fator: paraTexto(correcao.fator, fatorCasas),
        indices: correcao.indices,
        pisoAplicado: correcao.pisoAplicado,
      },
      corrigido: paraTexto(corrigido, valorCasas),
      juros: { percentual: paraTexto(juros.percentual, percentualCasas), detalhe: juros.detalhe },
      jurosValor: paraTexto(jurosValor, valorCasas),
      atualizado: paraTexto(atualizado, valorCasas),
      avisos,
    },
    mesesSemTaxaLegal: juros.mesesSemTaxaLegal,
  };
}

/** Calcula o Resultado completo de um Cálculo com uma tabela de índices congelada (§4.3). */
export function calcular(calculo: Calculo, indices: TabelaIndices): Resultado {
  const rastros = calculo.lancamentos.map((l) => atualizarComRastro(l, calculo, indices));
  const lancamentos = rastros.map((r) => r.lancamento);
  const valorCasas = calculo.metodologia.arredondamento.valorCasas;

  const somar = (tipo: Lancamento["tipo"]): Decimal =>
    lancamentos
      .filter((l) => l.tipo === tipo)
      .reduce((soma, l) => soma.plus(decimal(l.atualizado)), ZERO);
  const prestacoes = somar("prestacao");
  const amortizacoes = somar("amortizacao");
  const totalDevido = prestacoes.minus(amortizacoes);
  // Multa e honorários do art. 523, §1º, do CPC (§6.6): cada percentual sobre o total devido,
  // separadamente (os honorários não incidem sobre a multa); nada quando não há valor devido.
  const percentualMulta = decimal(calculo.acrescimos.multaPercentual);
  const percentualHonorarios = decimal(calculo.acrescimos.honorariosPercentual);
  const haValorDevido = totalDevido.gt(ZERO);
  const multa = haValorDevido
    ? arredondar(totalDevido.times(percentualMulta).div(CEM), valorCasas)
    : ZERO;
  const honorarios = haValorDevido
    ? arredondar(totalDevido.times(percentualHonorarios).div(CEM), valorCasas)
    : ZERO;
  const totalGeral = totalDevido.plus(multa).plus(honorarios);
  const totais: Totais = {
    prestacoes: paraTexto(prestacoes, valorCasas),
    amortizacoes: paraTexto(amortizacoes, valorCasas),
    totalDevido: paraTexto(totalDevido, valorCasas),
    multa: paraTexto(multa, valorCasas),
    honorarios: paraTexto(honorarios, valorCasas),
    totalGeral: paraTexto(totalGeral, valorCasas),
  };

  const avisos: string[] = [...validarMetodologia(calculo.metodologia)];
  if (lancamentos.length === 0) {
    avisos.push("Nenhum lançamento.");
  } else if (!haValorDevido) {
    avisos.push(
      `As amortizações atualizadas (${formatarMoeda(amortizacoes)}) igualam ou superam as prestações atualizadas (${formatarMoeda(prestacoes)}): não há valor devido na data do cálculo.`,
    );
    if (!percentualMulta.isZero() || !percentualHonorarios.isZero()) {
      avisos.push("Multa e honorários não foram aplicados porque não há valor devido.");
    }
  }

  // Índices efetivamente usados (sem repetição) e resumo dos meses sem índice. Um mês de
  // fração zero não pesou no fator: não conta como índice usado nem como mês sem índice. A taxa
  // legal dos juros (série 29543) também é índice usado; o mês dela que falta tem resumo próprio.
  const usados = new Map<string, IndiceUsado>();
  const semIndice = new Map<CodigoSerie, Set<Competencia>>();
  for (const l of lancamentos) {
    for (const i of l.correcao.indices) {
      if (i.serie === null || i.fracao.startsWith("0/")) continue;
      if (i.valor === null) {
        const meses = semIndice.get(i.serie) ?? new Set<Competencia>();
        meses.add(i.competencia);
        semIndice.set(i.serie, meses);
        continue;
      }
      const chave = `${i.serie}|${i.competencia}`;
      const registro = indices.series[i.serie]?.[i.competencia];
      if (!usados.has(chave) && registro) {
        usados.set(chave, {
          serie: i.serie,
          competencia: i.competencia,
          valor: registro.valor,
          fonte: registro.fonte,
          obtidoEm: registro.obtidoEm,
        });
      }
    }
    for (const d of l.juros.detalhe) {
      if (d.regime !== "taxaLegal") continue;
      const serie = CODIGO_DA_SERIE.taxaLegal;
      const competencia = competenciaDe(d.de);
      const chave = `${serie}|${competencia}`;
      const registro = indices.series[serie]?.[competencia];
      if (!usados.has(chave) && registro) {
        usados.set(chave, {
          serie,
          competencia,
          valor: registro.valor,
          fonte: registro.fonte,
          obtidoEm: registro.obtidoEm,
        });
      }
    }
  }
  const indicesUsados = [...usados.values()].sort(
    (a, b) =>
      compararSeries(a.serie, b.serie) ||
      (a.competencia < b.competencia ? -1 : a.competencia > b.competencia ? 1 : 0),
  );
  if (semIndice.size > 0) {
    const lista = [...semIndice.entries()]
      .sort(([a], [b]) => compararSeries(a, b))
      .map(
        ([serie, meses]) =>
          `${NOME_DA_SERIE[serie]} de ${[...meses].sort().map(formatarCompetencia).join(", ")}`,
      )
      .join("; ");
    avisos.push(`Meses sem índice na tabela (entraram sem correção): ${lista}.`);
  }
  const semTaxaLegal = new Set<Competencia>(rastros.flatMap((r) => r.mesesSemTaxaLegal));
  if (semTaxaLegal.size > 0) {
    const lista = [...semTaxaLegal].sort().map(formatarCompetencia).join(", ");
    avisos.push(
      `Meses sem taxa legal na tabela (os dias desses meses ficaram sem juros): ${lista}.`,
    );
  }

  const series = (Object.keys(indices.series) as CodigoSerie[]).sort(compararSeries);
  const ultimoMesPorSerie: Partial<Record<CodigoSerie, Competencia>> = {};
  for (const serie of series) {
    const ultimo = Object.keys(indices.series[serie] ?? {})
      .sort()
      .at(-1);
    if (ultimo !== undefined) ultimoMesPorSerie[serie] = ultimo;
  }

  return {
    lancamentos,
    totais,
    indicesUsados,
    consultaIndices: { em: indices.consultadoEm, series, ultimoMesPorSerie },
    avisos,
  };
}
