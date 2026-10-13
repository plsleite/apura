import { competenciaValida, dataValida } from "../compartilhado/datas.ts";
import { textoDecimalValido } from "../compartilhado/decimal.ts";
import { NOME_DA_SERIE } from "../compartilhado/tipos.ts";
import type {
  ArquivoCalculo,
  Base,
  Cabecalho,
  Calculo,
  CodigoSerie,
  EncargosProprios,
  IndiceUsado,
  Lancamento,
  LoteAmortizacoes,
  LotePrestacoes,
  Metodologia,
  PeriodoMetodologia,
  RegraJuros,
  Resultado,
} from "../compartilhado/tipos.ts";

/**
 * Salvar e abrir o cálculo como arquivo (§5.1, §9.1). A leitura trata o conteúdo como `unknown` e
 * confere tudo o que o motor pressupõe válido (formato, datas, competências, textos decimais,
 * listas fechadas), devolvendo um `Calculo` só com os campos conhecidos; o `resultado` do arquivo
 * é opcional: dele só interessam os índices usados e a data da consulta, para o aviso de índices
 * que mudaram, e um arquivo sem eles abre mesmo assim, com aviso. Módulo puro, sem DOM.
 */

export function montarArquivo(calculo: Calculo, resultado: Resultado): ArquivoCalculo {
  return { formato: "apura/calculo@1", calculo, resultado };
}

export function serializarArquivo(arquivo: ArquivoCalculo): string {
  return JSON.stringify(arquivo, null, 2);
}

/** "apura-0800000-11.2026.8.12.0001-2026-10-11.json"; sem processo, "apura-2026-10-11.json". */
export function nomeDoArquivo(calculo: Calculo): string {
  const processo = calculo.cabecalho.processo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^0-9A-Za-z.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `apura-${processo === "" ? "" : `${processo}-`}${calculo.dataElaboracao}.json`;
}

export type LeituraDoArquivo =
  | {
      ok: true;
      calculo: Calculo;
      /** índices usados no cálculo salvo e a data da consulta deles; nulos quando o arquivo não os traz */
      anterior: { indicesUsados: IndiceUsado[]; consultadoEm: string } | null;
      avisos: string[];
    }
  | { ok: false; erro: string };

class DadoInvalido extends Error {}

function falhar(caminho: string): never {
  throw new DadoInvalido(caminho);
}

function objeto(valor: unknown, caminho: string): Record<string, unknown> {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) falhar(caminho);
  return valor as Record<string, unknown>;
}

function texto(valor: unknown, caminho: string): string {
  if (typeof valor !== "string") falhar(caminho);
  return valor;
}

function textoOpcional(valor: unknown, caminho: string): string | undefined {
  return valor === undefined ? undefined : texto(valor, caminho);
}

function booleano(valor: unknown, caminho: string): boolean {
  if (typeof valor !== "boolean") falhar(caminho);
  return valor;
}

function inteiro(valor: unknown, caminho: string, minimo: number, maximo: number): number {
  if (typeof valor !== "number" || !Number.isInteger(valor) || valor < minimo || valor > maximo) {
    falhar(caminho);
  }
  return valor;
}

function data(valor: unknown, caminho: string): string {
  if (typeof valor !== "string" || !dataValida(valor)) falhar(caminho);
  return valor;
}

function dataOpcional(valor: unknown, caminho: string): string | undefined {
  return valor === undefined ? undefined : data(valor, caminho);
}

function dataOuNula(valor: unknown, caminho: string): string | null {
  return valor === null ? null : data(valor, caminho);
}

function competencia(valor: unknown, caminho: string): string {
  if (typeof valor !== "string" || !competenciaValida(valor)) falhar(caminho);
  return valor;
}

function decimalTexto(valor: unknown, caminho: string): string {
  if (!textoDecimalValido(valor)) falhar(caminho);
  return valor;
}

function umDe<T extends string>(valor: unknown, opcoes: readonly T[], caminho: string): T {
  if (typeof valor !== "string" || !(opcoes as readonly string[]).includes(valor)) falhar(caminho);
  return valor as T;
}

function lista(valor: unknown, caminho: string): unknown[] {
  if (!Array.isArray(valor)) falhar(caminho);
  return valor;
}

const INDICES_DE_CORRECAO = ["IGP-M", "INPC", "IPCA", "nenhum"] as const;
const INDICES_DE_REAJUSTE = ["IGP-M", "INPC", "IPCA", "SM", "nenhum"] as const;
const SERIES = Object.keys(NOME_DA_SERIE) as CodigoSerie[];

function lerJuros(valor: unknown, caminho: string): RegraJuros {
  const j = objeto(valor, caminho);
  const tipo = umDe(
    j.tipo,
    ["percentualMensal", "taxaLegal", "selicUnica"] as const,
    `${caminho}.tipo`,
  );
  if (tipo === "percentualMensal") {
    return { tipo, taxaMensal: decimalTexto(j.taxaMensal, `${caminho}.taxaMensal`) };
  }
  return { tipo };
}

function lerMetodologia(valor: unknown, caminho: string): Metodologia {
  const m = objeto(valor, caminho);
  const arredondamento = objeto(m.arredondamento, `${caminho}.arredondamento`);
  return {
    id: texto(m.id, `${caminho}.id`),
    versao: inteiro(m.versao, `${caminho}.versao`, 0, 1_000_000),
    nome: texto(m.nome, `${caminho}.nome`),
    ajustada: booleano(m.ajustada, `${caminho}.ajustada`),
    periodos: lista(m.periodos, `${caminho}.periodos`).map((p, i): PeriodoMetodologia => {
      const periodo = objeto(p, `${caminho}.periodos[${i}]`);
      const correcao = objeto(periodo.correcao, `${caminho}.periodos[${i}].correcao`);
      const de = dataOuNula(periodo.de, `${caminho}.periodos[${i}].de`);
      const ate = dataOuNula(periodo.ate, `${caminho}.periodos[${i}].ate`);
      // período com início posterior ao fim (pendência da fase 2): recusado aqui, antes do motor
      if (de !== null && ate !== null && de > ate) falhar(`${caminho}.periodos[${i}]`);
      return {
        de,
        ate,
        correcao: {
          indice: umDe(
            correcao.indice,
            INDICES_DE_CORRECAO,
            `${caminho}.periodos[${i}].correcao.indice`,
          ),
        },
        juros: lerJuros(periodo.juros, `${caminho}.periodos[${i}].juros`),
      };
    }),
    incidenciaMesInicial: umDe(
      m.incidenciaMesInicial,
      ["proRata", "mesSeguinte"] as const,
      `${caminho}.incidenciaMesInicial`,
    ),
    deflacao: umDe(
      m.deflacao,
      ["aplicarComPiso", "aplicarSemPiso", "zerarNegativos"] as const,
      `${caminho}.deflacao`,
    ),
    arredondamento: {
      fatorCasas: inteiro(arredondamento.fatorCasas, `${caminho}.arredondamento.fatorCasas`, 0, 20),
      percentualCasas: inteiro(
        arredondamento.percentualCasas,
        `${caminho}.arredondamento.percentualCasas`,
        0,
        20,
      ),
      valorCasas: inteiro(arredondamento.valorCasas, `${caminho}.arredondamento.valorCasas`, 0, 20),
      modo: umDe(arredondamento.modo, ["comercial"] as const, `${caminho}.arredondamento.modo`),
    },
  };
}

function lerBase(valor: unknown): Base {
  const b = objeto(valor, "base");
  const tipo = umDe(
    b.tipo,
    ["valorFixo", "percentualSalarioMinimo", "percentualRendimentos"] as const,
    "base.tipo",
  );
  switch (tipo) {
    case "valorFixo":
      return {
        tipo,
        valor: texto(b.valor, "base.valor"),
        dataFixacao: data(b.dataFixacao, "base.dataFixacao"),
        indiceReajuste: umDe(b.indiceReajuste, INDICES_DE_REAJUSTE, "base.indiceReajuste"),
        mesReajuste: inteiro(b.mesReajuste, "base.mesReajuste", 1, 12),
      };
    case "percentualSalarioMinimo":
      return { tipo, percentual: texto(b.percentual, "base.percentual") };
    case "percentualRendimentos":
      return {
        tipo,
        percentual: texto(b.percentual, "base.percentual"),
        rendimentoPadrao: texto(b.rendimentoPadrao, "base.rendimentoPadrao"),
      };
  }
}

function lerEncargos(valor: unknown, caminho: string): EncargosProprios {
  const e = objeto(valor, caminho);
  const encargos: EncargosProprios = {};
  const termos = [
    "termoInicialCorrecao",
    "termoFinalCorrecao",
    "termoInicialJuros",
    "termoFinalJuros",
  ] as const;
  for (const termo of termos) {
    const lido = dataOpcional(e[termo], `${caminho}.${termo}`);
    if (lido !== undefined) encargos[termo] = lido;
  }
  if (e.metodologia !== undefined) {
    encargos.metodologia = lerMetodologia(e.metodologia, `${caminho}.metodologia`);
  }
  return encargos;
}

function lerLancamento(valor: unknown, i: number): Lancamento {
  const caminho = `lancamentos[${i}]`;
  const l = objeto(valor, caminho);
  const lancamento: Lancamento = {
    id: texto(l.id, `${caminho}.id`),
    tipo: umDe(l.tipo, ["prestacao", "amortizacao"] as const, `${caminho}.tipo`),
    data: data(l.data, `${caminho}.data`),
    origem: umDe(l.origem, ["lote", "avulso"] as const, `${caminho}.origem`),
    editado: booleano(l.editado, `${caminho}.editado`),
  };
  if (l.competencia !== undefined) {
    lancamento.competencia = competencia(l.competencia, `${caminho}.competencia`);
  }
  const descricao = textoOpcional(l.descricao, `${caminho}.descricao`);
  if (descricao !== undefined) lancamento.descricao = descricao;
  const valorInformado = textoOpcional(l.valorInformado, `${caminho}.valorInformado`);
  if (valorInformado !== undefined) lancamento.valorInformado = valorInformado;
  const rendimento = textoOpcional(l.rendimento, `${caminho}.rendimento`);
  if (rendimento !== undefined) lancamento.rendimento = rendimento;
  if (l.encargos !== undefined)
    lancamento.encargos = lerEncargos(l.encargos, `${caminho}.encargos`);
  return lancamento;
}

function lerLotes(valor: unknown): Calculo["lotes"] {
  if (valor === undefined) return {};
  const l = objeto(valor, "lotes");
  const lotes: Calculo["lotes"] = {};
  if (l.ultimoLotePrestacoes !== undefined) {
    const p = objeto(l.ultimoLotePrestacoes, "lotes.ultimoLotePrestacoes");
    const lote: LotePrestacoes = {
      diaVencimento: inteiro(p.diaVencimento, "lotes.ultimoLotePrestacoes.diaVencimento", 1, 31),
    };
    if (p.mesesEmAtraso !== undefined) {
      lote.mesesEmAtraso = inteiro(
        p.mesesEmAtraso,
        "lotes.ultimoLotePrestacoes.mesesEmAtraso",
        1,
        100_000,
      );
    }
    if (p.de !== undefined) lote.de = competencia(p.de, "lotes.ultimoLotePrestacoes.de");
    if (p.ate !== undefined) lote.ate = competencia(p.ate, "lotes.ultimoLotePrestacoes.ate");
    lotes.ultimoLotePrestacoes = lote;
  }
  if (l.ultimoLoteAmortizacoes !== undefined) {
    const a = objeto(l.ultimoLoteAmortizacoes, "lotes.ultimoLoteAmortizacoes");
    const lote: LoteAmortizacoes = {
      valorMensal: texto(a.valorMensal, "lotes.ultimoLoteAmortizacoes.valorMensal"),
      diaPagamento: inteiro(a.diaPagamento, "lotes.ultimoLoteAmortizacoes.diaPagamento", 1, 31),
      de: competencia(a.de, "lotes.ultimoLoteAmortizacoes.de"),
      ate: competencia(a.ate, "lotes.ultimoLoteAmortizacoes.ate"),
    };
    lotes.ultimoLoteAmortizacoes = lote;
  }
  return lotes;
}

function lerCalculo(valor: unknown): Calculo {
  const c = objeto(valor, "calculo");
  const cabecalho = objeto(c.cabecalho, "cabecalho");
  const acrescimos = objeto(c.acrescimos, "acrescimos");
  const campos: Array<keyof Cabecalho> = [
    "defensor",
    "orgao",
    "processo",
    "exequente",
    "executado",
  ];
  return {
    formato: umDe(c.formato, ["apura/calculo@1"] as const, "calculo.formato"),
    tipo: umDe(c.tipo, ["alimentos"] as const, "calculo.tipo"),
    id: texto(c.id, "id"),
    criadoEm: texto(c.criadoEm, "criadoEm"),
    atualizadoEm: texto(c.atualizadoEm, "atualizadoEm"),
    dataElaboracao: data(c.dataElaboracao, "dataElaboracao"),
    cabecalho: Object.fromEntries(
      campos.map((campo) => [campo, texto(cabecalho[campo], `cabecalho.${campo}`)]),
    ) as unknown as Cabecalho,
    base: lerBase(c.base),
    lotes: lerLotes(c.lotes),
    lancamentos: lista(c.lancamentos, "lancamentos").map(lerLancamento),
    metodologia: lerMetodologia(c.metodologia, "metodologia"),
    acrescimos: {
      multaPercentual: texto(acrescimos.multaPercentual, "acrescimos.multaPercentual"),
      honorariosPercentual: texto(
        acrescimos.honorariosPercentual,
        "acrescimos.honorariosPercentual",
      ),
    },
    observacoes: texto(c.observacoes, "observacoes"),
  };
}

const AVISO_SEM_INDICES =
  "O arquivo não traz os índices usados no cálculo salvo: não dá para comparar com os índices atuais.";

/** Os índices usados do resultado salvo; nulos quando faltam ou estão estranhos; séries desconhecidas saem com aviso. */
function lerIndicesAnteriores(
  valor: unknown,
  avisos: string[],
): { indicesUsados: IndiceUsado[]; consultadoEm: string } | null {
  try {
    const r = objeto(valor, "resultado");
    const consulta = objeto(r.consultaIndices, "resultado.consultaIndices");
    const consultadoEm = texto(consulta.em, "resultado.consultaIndices.em");
    const desconhecidas = new Set<string>();
    const indicesUsados: IndiceUsado[] = [];
    for (const item of lista(r.indicesUsados, "resultado.indicesUsados")) {
      const i = objeto(item, "resultado.indicesUsados[]");
      const serie = texto(i.serie, "resultado.indicesUsados[].serie");
      if (!(SERIES as string[]).includes(serie)) {
        desconhecidas.add(serie);
        continue;
      }
      indicesUsados.push({
        serie: serie as CodigoSerie,
        competencia: competencia(i.competencia, "resultado.indicesUsados[].competencia"),
        valor: decimalTexto(i.valor, "resultado.indicesUsados[].valor"),
        fonte: umDe(i.fonte, ["embutida", "aoVivo"] as const, "resultado.indicesUsados[].fonte"),
        obtidoEm: texto(i.obtidoEm, "resultado.indicesUsados[].obtidoEm"),
      });
    }
    if (desconhecidas.size > 0) {
      avisos.push(
        `O arquivo traz índices de séries que o Apura não conhece (${[...desconhecidas].sort().join(", ")}); eles ficaram fora da comparação com os índices atuais.`,
      );
    }
    return { indicesUsados, consultadoEm };
  } catch {
    avisos.push(AVISO_SEM_INDICES);
    return null;
  }
}

/**
 * Lê o texto de um arquivo de cálculo. Só o `calculo` é obrigatório e inteiramente conferido; o
 * `resultado` é opcional (sem ele, aviso). Nunca lança: erro de leitura vira uma frase.
 */
export function lerArquivo(textoDoArquivo: string): LeituraDoArquivo {
  let conteudo: unknown;
  try {
    conteudo = JSON.parse(textoDoArquivo);
  } catch {
    return {
      ok: false,
      erro: "O arquivo está danificado ou não é um arquivo de cálculo do Apura: não pôde ser lido.",
    };
  }
  if (typeof conteudo !== "object" || conteudo === null || Array.isArray(conteudo)) {
    return { ok: false, erro: "O arquivo não é um cálculo do Apura (formato apura/calculo@1)." };
  }
  const envelope = conteudo as Record<string, unknown>;
  if (envelope.formato !== "apura/calculo@1") {
    return { ok: false, erro: "O arquivo não é um cálculo do Apura (formato apura/calculo@1)." };
  }
  try {
    const calculo = lerCalculo(envelope.calculo);
    const avisos: string[] = [];
    const anterior = lerIndicesAnteriores(envelope.resultado, avisos);
    return { ok: true, calculo, anterior, avisos };
  } catch (erro) {
    if (erro instanceof DadoInvalido) {
      return {
        ok: false,
        erro: `O arquivo traz um dado inválido em "${erro.message}" (nome interno do campo, para quem for corrigir o arquivo); o cálculo atual não foi alterado.`,
      };
    }
    throw erro;
  }
}
