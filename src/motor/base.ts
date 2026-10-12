import {
  competenciaDe,
  competenciasEntre,
  comporCompetencia,
  decomporCompetencia,
  mesAnterior,
  somarMeses,
} from "../compartilhado/datas.ts";
import {
  arredondar,
  CEM,
  decimal,
  decimalOuNulo,
  UM,
  type Decimal,
} from "../compartilhado/decimal.ts";
import {
  formatarCompetencia,
  formatarData,
  formatarMoeda,
  formatarPercentual,
} from "../compartilhado/formatacao.ts";
import { CODIGO_DA_SERIE } from "../compartilhado/tipos.ts";
import type {
  Base,
  CodigoSerie,
  Competencia,
  IndiceUsado,
  Lancamento,
  NomeIndice,
  TabelaIndices,
} from "../compartilhado/tipos.ts";
import { aindaNaoDivulgado, divulgacaoPrevista } from "../compartilhado/divulgacao.ts";

export interface MesSemIndice {
  serie: CodigoSerie;
  competencia: Competencia;
}

/** Resultado da apuração do valor-base de uma prestação pela base dos alimentos (§6.3). */
export interface ValorBaseApurado {
  /** valor com as casas da metodologia; nulo quando não há como apurar (o aviso diz o que falta) */
  valor: Decimal | null;
  /** a conta em uma frase, para o resultado e o relatório */
  memoria: string;
  /** salário mínimo e índices de reajuste efetivamente usados, com proveniência (§8.3) */
  indicesUsados: IndiceUsado[];
  /** meses que faltaram na tabela de índices (salário mínimo ainda não publicado, índice de reajuste ausente) */
  mesesSemIndice: MesSemIndice[];
  avisos: string[];
}

const SALARIO_MINIMO = CODIGO_DA_SERIE.SM;

type BaseValorFixo = Extract<Base, { tipo: "valorFixo" }>;

/** "30%", "48,23%": o percentual da base como foi informado, sem casas fixas. */
function percentualInformado(valor: Decimal): string {
  return `${valor.toFixed().replace(".", ",")}%`;
}

function semValor(
  memoria: string,
  aviso: string,
  mesesSemIndice: MesSemIndice[] = [],
): ValorBaseApurado {
  return { valor: null, memoria, indicesUsados: [], mesesSemIndice, avisos: [aviso] };
}

function registro(
  tabela: TabelaIndices,
  serie: CodigoSerie,
  competencia: Competencia,
): IndiceUsado | null {
  const valor = tabela.series[serie]?.[competencia];
  if (valor === undefined) return null;
  return { serie, competencia, valor: valor.valor, fonte: valor.fonte, obtidoEm: valor.obtidoEm };
}

/**
 * Salário mínimo vigente na competência: o do próprio mês ou, quando a tabela ainda não o traz, o
 * último anterior, que vigora até a publicação do novo. Nulo se não houver nenhum anterior.
 */
function salarioMinimoVigente(
  tabela: TabelaIndices,
  competencia: Competencia,
): { usado: IndiceUsado; publicado: boolean } | null {
  const direto = registro(tabela, SALARIO_MINIMO, competencia);
  if (direto !== null) return { usado: direto, publicado: true };
  const anterior = Object.keys(tabela.series[SALARIO_MINIMO] ?? {})
    .filter((c) => c < competencia)
    .sort()
    .at(-1);
  if (anterior === undefined) return null;
  const usado = registro(tabela, SALARIO_MINIMO, anterior);
  return usado === null ? null : { usado, publicado: false };
}

/**
 * Como descrever o salário mínimo que falta no mês do vencimento, quando entra o último anterior
 * (`usado`): "ainda não publicado" quando a tabela não diz até que mês a série deveria ir (casos
 * antigos, calendário sem a série 1619) ou quando o mês é posterior ao esperado pelo calendário;
 * "não consta" quando o calendário diz que o mês já deveria estar na tabela (buraco de dados). A
 * `nota` entra na memória da conta e o `aviso`, nos avisos do lançamento.
 */
function descreverSalarioAnterior(
  tabela: TabelaIndices,
  competencia: Competencia,
  usado: IndiceUsado,
): { nota: string; aviso: string } {
  const mes = formatarCompetencia(competencia);
  const anterior = formatarCompetencia(usado.competencia);
  const valor = formatarMoeda(decimal(usado.valor));
  if (aindaNaoDivulgado(tabela, SALARIO_MINIMO, competencia)) {
    return {
      nota: `último publicado: ${anterior}`,
      aviso: `Salário mínimo de ${mes} ainda não publicado na data da consulta (previsão: ${divulgacaoPrevista(SALARIO_MINIMO, competencia)}): usado o de ${anterior} (${valor}), vigente até a publicação do novo.`,
    };
  }
  if (tabela.esperadoAte?.[SALARIO_MINIMO] === undefined) {
    return {
      nota: `último publicado: ${anterior}`,
      aviso: `Salário mínimo de ${mes} ainda não publicado na tabela de índices: usado o de ${anterior} (${valor}), vigente até a publicação do novo.`,
    };
  }
  return {
    nota: `último anterior disponível: ${anterior}`,
    aviso: `Salário mínimo de ${mes} não consta na tabela de índices: usado o de ${anterior} (${valor}), o último anterior disponível.`,
  };
}

function porSalarioMinimo(
  percentualTexto: string,
  competencia: Competencia,
  tabela: TabelaIndices,
  valorCasas: number,
): ValorBaseApurado {
  const percentual = decimalOuNulo(percentualTexto);
  if (percentual === null) {
    return semValor(
      "Percentual da base inválido",
      `Percentual da base ("${percentualTexto}") não é um número válido: a prestação ficou sem valor; informe o valor à mão.`,
    );
  }
  const mes = formatarCompetencia(competencia);
  const salario = salarioMinimoVigente(tabela, competencia);
  if (salario === null) {
    return semValor(
      "Salário mínimo não disponível",
      `Salário mínimo de ${mes} não disponível na tabela de índices: a prestação ficou sem valor; informe o valor à mão.`,
      [{ serie: SALARIO_MINIMO, competencia }],
    );
  }
  const salarioValor = decimal(salario.usado.valor);
  const valor = arredondar(percentual.times(salarioValor).div(CEM), valorCasas);
  const pct = percentualInformado(percentual);
  if (salario.publicado) {
    return {
      valor,
      memoria: `${pct} do salário mínimo de ${mes} (${formatarMoeda(salarioValor)}) = ${formatarMoeda(valor)}`,
      indicesUsados: [salario.usado],
      mesesSemIndice: [],
      avisos: [],
    };
  }
  const anterior = descreverSalarioAnterior(tabela, competencia, salario.usado);
  return {
    valor,
    memoria: `${pct} do salário mínimo vigente em ${mes} (${formatarMoeda(salarioValor)}, ${anterior.nota}) = ${formatarMoeda(valor)}`,
    indicesUsados: [salario.usado],
    mesesSemIndice: [{ serie: SALARIO_MINIMO, competencia }],
    avisos: [anterior.aviso],
  };
}

function porRendimentos(
  base: Extract<Base, { tipo: "percentualRendimentos" }>,
  lancamento: Lancamento,
  competencia: Competencia,
  valorCasas: number,
): ValorBaseApurado {
  const percentual = decimalOuNulo(base.percentual);
  if (percentual === null) {
    return semValor(
      "Percentual da base inválido",
      `Percentual da base ("${base.percentual}") não é um número válido: a prestação ficou sem valor; informe o valor à mão.`,
    );
  }
  const proprio = lancamento.rendimento !== undefined;
  const texto = lancamento.rendimento ?? base.rendimentoPadrao;
  const origem = proprio ? `de ${formatarCompetencia(competencia)}` : "padrão";
  const rendimento = decimalOuNulo(texto);
  if (rendimento === null) {
    return semValor(
      "Rendimento inválido",
      `Rendimento ${origem} ("${texto}") não é um número válido: a prestação ficou sem valor; informe o rendimento ou o valor à mão.`,
    );
  }
  const valor = arredondar(percentual.times(rendimento).div(CEM), valorCasas);
  return {
    valor,
    memoria: `${percentualInformado(percentual)} do rendimento ${origem} (${formatarMoeda(rendimento)}) = ${formatarMoeda(valor)}`,
    indicesUsados: [],
    mesesSemIndice: [],
    avisos: [],
  };
}

function porSalarioMinimoProporcional(
  valorFixado: Decimal,
  dataFixacao: string,
  mesFixacao: Competencia,
  competencia: Competencia,
  tabela: TabelaIndices,
  valorCasas: number,
): ValorBaseApurado {
  const naFixacao = registro(tabela, SALARIO_MINIMO, mesFixacao);
  if (naFixacao === null) {
    return semValor(
      "Salário mínimo da fixação não disponível",
      `Salário mínimo de ${formatarCompetencia(mesFixacao)} (mês da fixação) não disponível na tabela de índices: a prestação ficou sem valor; informe o valor à mão.`,
      [{ serie: SALARIO_MINIMO, competencia: mesFixacao }],
    );
  }
  const mes = formatarCompetencia(competencia);
  const noVencimento = salarioMinimoVigente(tabela, competencia);
  if (noVencimento === null) {
    return semValor(
      "Salário mínimo não disponível",
      `Salário mínimo de ${mes} não disponível na tabela de índices: a prestação ficou sem valor; informe o valor à mão.`,
      [{ serie: SALARIO_MINIMO, competencia }],
    );
  }
  const salarioFixacao = decimal(naFixacao.valor);
  const salarioVencimento = decimal(noVencimento.usado.valor);
  const valor = arredondar(valorFixado.times(salarioVencimento).div(salarioFixacao), valorCasas);
  const indicesUsados =
    noVencimento.usado.competencia === mesFixacao ? [naFixacao] : [naFixacao, noVencimento.usado];
  const anterior = noVencimento.publicado
    ? null
    : descreverSalarioAnterior(tabela, competencia, noVencimento.usado);
  const descricaoVencimento =
    anterior === null
      ? `salário mínimo de ${mes} (${formatarMoeda(salarioVencimento)})`
      : `salário mínimo vigente em ${mes} (${formatarMoeda(salarioVencimento)}, ${anterior.nota})`;
  const memoria = `${formatarMoeda(valorFixado)} fixados em ${formatarData(dataFixacao)} × ${descricaoVencimento} ÷ salário mínimo de ${formatarCompetencia(mesFixacao)} (${formatarMoeda(salarioFixacao)}) = ${formatarMoeda(valor)}`;
  if (anterior === null) {
    return { valor, memoria, indicesUsados, mesesSemIndice: [], avisos: [] };
  }
  return {
    valor,
    memoria,
    indicesUsados,
    mesesSemIndice: [{ serie: SALARIO_MINIMO, competencia }],
    avisos: [anterior.aviso],
  };
}

function porIndiceAcumulado(
  base: BaseValorFixo,
  nome: NomeIndice,
  valorFixado: Decimal,
  mesFixacao: Competencia,
  competencia: Competencia,
  tabela: TabelaIndices,
  valorCasas: number,
): ValorBaseApurado {
  const serie = CODIGO_DA_SERIE[nome];
  const fixacao = formatarData(base.dataFixacao);
  if (!Number.isInteger(base.mesReajuste) || base.mesReajuste < 1 || base.mesReajuste > 12) {
    return {
      valor: valorFixado,
      memoria: `Valor fixado em ${fixacao}: ${formatarMoeda(valorFixado)} (mês do reajuste inválido, sem reajuste)`,
      indicesUsados: [],
      mesesSemIndice: [],
      avisos: [
        `Mês do reajuste inválido (${base.mesReajuste}): a prestação entrou com o valor fixado, sem reajuste.`,
      ],
    };
  }
  const { ano: anoFixacao, mes: mesDaFixacao } = decomporCompetencia(mesFixacao);
  // Primeiro reajuste: a primeira ocorrência do mês escolhido depois do mês da fixação (12 meses
  // depois quando é o próprio mês da fixação); os seguintes, a cada 12 meses (§6.3).
  let reajuste = comporCompetencia(
    base.mesReajuste > mesDaFixacao ? anoFixacao : anoFixacao + 1,
    base.mesReajuste,
  );
  let inicioJanela = mesFixacao;
  let vigente = valorFixado;
  const aplicados: string[] = [];
  const indicesUsados: IndiceUsado[] = [];
  const mesesSemIndice: MesSemIndice[] = [];
  const avisos: string[] = [];
  let naoAplicado: string | null = null;
  while (reajuste <= competencia) {
    const fimJanela = mesAnterior(reajuste);
    const meses = competenciasEntre(inicioJanela, fimJanela);
    const faltantes = meses.filter((m) => registro(tabela, serie, m) === null);
    if (faltantes.length > 0) {
      const lista = faltantes.map(formatarCompetencia).join(", ");
      const efeito = `o reajuste de ${formatarCompetencia(reajuste)} não foi aplicado; a prestação mantém ${formatarMoeda(vigente)}.`;
      if (faltantes.every((m) => aindaNaoDivulgado(tabela, serie, m))) {
        // Todos os meses que faltam ainda não saíram, pelo calendário da tabela: não é buraco de dados.
        const ultimoFaltante = faltantes.at(-1) ?? fimJanela;
        const previsao = divulgacaoPrevista(serie, ultimoFaltante);
        const quando =
          faltantes.length === 1
            ? `previsão: ${previsao}`
            : `previsão para ${formatarCompetencia(ultimoFaltante)}: ${previsao}`;
        avisos.push(
          `${nome} de ${lista} ainda sem divulgação na data da consulta (${quando}): ${efeito}`,
        );
      } else {
        const ultimo = Object.keys(tabela.series[serie] ?? {})
          .sort()
          .at(-1);
        const disponivel =
          ultimo === undefined ? "" : ` (último mês disponível: ${formatarCompetencia(ultimo)})`;
        avisos.push(
          `${nome} de ${lista} não disponível na tabela de índices${disponivel}: ${efeito}`,
        );
      }
      mesesSemIndice.push(...faltantes.map((m) => ({ serie, competencia: m })));
      naoAplicado = `reajuste de ${formatarCompetencia(reajuste)} não aplicado: ${nome} de ${lista} não disponível`;
      break;
    }
    let acumulado = UM;
    for (const m of meses) {
      const usado = registro(tabela, serie, m);
      if (usado === null) continue;
      acumulado = acumulado.times(UM.plus(decimal(usado.valor).div(CEM)));
      indicesUsados.push(usado);
    }
    const janela = `${nome} de ${formatarCompetencia(inicioJanela)} a ${formatarCompetencia(fimJanela)}: ${formatarPercentual(acumulado.minus(UM).times(CEM), 4)}`;
    if (acumulado.lte(UM)) {
      aplicados.push(
        `em ${formatarCompetencia(reajuste)} (${janela}, acumulado não positivo: valor mantido)`,
      );
    } else {
      vigente = arredondar(vigente.times(acumulado), valorCasas);
      aplicados.push(`em ${formatarCompetencia(reajuste)} (${janela})`);
    }
    inicioJanela = reajuste;
    reajuste = somarMeses(reajuste, 12);
  }
  let memoria: string;
  if (aplicados.length === 0) {
    const nota =
      naoAplicado ?? `primeiro reajuste pelo ${nome} em ${formatarCompetencia(reajuste)}`;
    memoria = `Valor fixado em ${fixacao}: ${formatarMoeda(valorFixado)} (${nota})`;
  } else {
    const nota = naoAplicado === null ? "" : `; ${naoAplicado}`;
    memoria = `${formatarMoeda(valorFixado)} fixados em ${fixacao}, reajustados ${aplicados.join(" e ")} = ${formatarMoeda(vigente)}${nota}`;
  }
  return { valor: vigente, memoria, indicesUsados, mesesSemIndice, avisos };
}

function porValorFixo(
  base: BaseValorFixo,
  competencia: Competencia,
  tabela: TabelaIndices,
  valorCasas: number,
): ValorBaseApurado {
  const fixado = decimalOuNulo(base.valor);
  if (fixado === null) {
    return semValor(
      "Valor fixado inválido",
      `Valor fixado ("${base.valor}") não é um número válido: a prestação ficou sem valor; informe o valor à mão.`,
    );
  }
  const valorFixado = arredondar(fixado, valorCasas);
  const mesFixacao = competenciaDe(base.dataFixacao);
  const fixacao = formatarData(base.dataFixacao);
  if (competencia < mesFixacao) {
    return {
      valor: valorFixado,
      memoria: `Valor fixado em ${fixacao}: ${formatarMoeda(valorFixado)} (prestação anterior à fixação, sem reajuste)`,
      indicesUsados: [],
      mesesSemIndice: [],
      avisos: [
        `Prestação de ${formatarCompetencia(competencia)} anterior à data de fixação (${fixacao}): usado o valor fixado, sem reajuste.`,
      ],
    };
  }
  switch (base.indiceReajuste) {
    case "nenhum":
      return {
        valor: valorFixado,
        memoria: `Valor fixado em ${fixacao}: ${formatarMoeda(valorFixado)} (sem reajuste)`,
        indicesUsados: [],
        mesesSemIndice: [],
        avisos: [],
      };
    case "SM":
      return porSalarioMinimoProporcional(
        valorFixado,
        base.dataFixacao,
        mesFixacao,
        competencia,
        tabela,
        valorCasas,
      );
    default:
      return porIndiceAcumulado(
        base,
        base.indiceReajuste,
        valorFixado,
        mesFixacao,
        competencia,
        tabela,
        valorCasas,
      );
  }
}

/**
 * Valor-base de uma prestação sem valor informado (§6.3), pelo mês do vencimento: percentual do
 * salário mínimo (série 1619), percentual dos rendimentos (o do lançamento ou o padrão) ou valor
 * fixo, sem reajuste, reajustado pela proporção do salário mínimo ou pelo índice acumulado a cada
 * 12 meses. Nunca lança erro: dado inválido ou faltante devolve `valor` nulo e aviso. Datas chegam
 * validadas pela tela (§6.7): `dataFixacao` com competência malformada não é tratada aqui.
 */
export function apurarValorBase(
  lancamento: Lancamento,
  base: Base,
  tabela: TabelaIndices,
  valorCasas: number,
): ValorBaseApurado {
  const competencia = competenciaDe(lancamento.data);
  switch (base.tipo) {
    case "percentualSalarioMinimo":
      return porSalarioMinimo(base.percentual, competencia, tabela, valorCasas);
    case "percentualRendimentos":
      return porRendimentos(base, lancamento, competencia, valorCasas);
    case "valorFixo":
      return porValorFixo(base, competencia, tabela, valorCasas);
    default:
      // Checagem de exaustividade: uma forma nova de Base esquecida aqui falha na compilação.
      base satisfies never;
      return semValor(
        "Base desconhecida",
        "Tipo de base não reconhecido: a prestação ficou sem valor; informe o valor à mão.",
      );
  }
}
