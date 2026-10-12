import { formatarCompetencia } from "../compartilhado/formatacao.ts";
import type {
  ArquivoSerie,
  CodigoSerie,
  Competencia,
  TextoDecimal,
} from "../compartilhado/tipos.ts";
import { ehValorMensalValido } from "./cliente-bcb.ts";
import type { ValorMensal } from "./cliente-bcb.ts";

// Leitura e comparação de arquivos de série (`dados/indices/<codigo>.json`), sem importar os
// próprios arquivos: o script de atualização usa este módulo e precisa iniciar mesmo quando um
// arquivo embutido falta (ele o recria) ou está corrompido (ele diz qual é e como restaurá-lo).

function erroDeFormato(codigo: CodigoSerie): Error {
  return new Error(`Arquivo da série ${codigo} em formato inesperado.`);
}

/** Como nomear um item inválido na mensagem: pela competência, se ela for texto; senão pela posição (a partir de 1). */
function descreverItem(item: unknown, posicao: number): string {
  if (typeof item === "object" && item !== null) {
    const { competencia } = item as { competencia?: unknown };
    if (typeof competencia === "string") return competencia;
  }
  return `posição ${posicao + 1}`;
}

/**
 * Confere o formato, o código e cada valor de um arquivo de série antes de usá-lo: os JSON são
 * importados sem checagem de tipo, e um arquivo trocado, de formato antigo ou com um valor
 * corrompido deve falhar aqui, não no cálculo. Nada é convertido antes de saber que é um objeto.
 */
export function lerArquivoSerie(dado: unknown, codigo: CodigoSerie): ArquivoSerie {
  if (typeof dado !== "object" || dado === null) throw erroDeFormato(codigo);
  const arquivo = dado as Partial<ArquivoSerie>;
  if (
    arquivo.formato !== "apura/serie@1" ||
    arquivo.codigo !== codigo ||
    typeof arquivo.obtidoEm !== "string" ||
    !Array.isArray(arquivo.valores)
  ) {
    throw erroDeFormato(codigo);
  }
  arquivo.valores.forEach((item: unknown, posicao) => {
    if (!ehValorMensalValido(item)) {
      throw new Error(
        `Arquivo da série ${codigo} com valor inválido em ${descreverItem(item, posicao)}.`,
      );
    }
  });
  return arquivo as ArquivoSerie;
}

/** Diferenças entre a lista atual de uma série e a lista nova obtida do BCB. */
export interface ComparacaoDeSerie {
  /** a nova perdeu meses em relação à atual (vazia, começa depois, termina antes, tem menos meses ou perdeu algum mês do meio) */
  encolheu: boolean;
  /** por que encolheu, em frase para encaixar depois de "A série 433 encolheu: " */
  motivo?: string;
  /** competências presentes nas duas listas com valor diferente (a SELIC parcial entra aqui; quem chama decide o que dizer) */
  alterados: Array<{ competencia: Competencia; antes: TextoDecimal; depois: TextoDecimal }>;
  /** competências que só a nova tem */
  novos: Competencia[];
}

function porCompetencia(valores: ValorMensal[]): Map<Competencia, TextoDecimal> {
  const mapa = new Map<Competencia, TextoDecimal>();
  for (const { competencia, valor } of valores) mapa.set(competencia, valor);
  return mapa;
}

function ordenarCompetencias(competencias: Iterable<Competencia>): Competencia[] {
  return [...competencias].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** "ago/2026" · "jul/2026 e ago/2026" · "jun/2026, jul/2026 e ago/2026" */
function listarCompetencias(competencias: Competencia[]): string {
  const nomes = competencias.map(formatarCompetencia);
  const ultimo = nomes.pop();
  if (ultimo === undefined) return "";
  return nomes.length === 0 ? ultimo : `${nomes.join(", ")} e ${ultimo}`;
}

/**
 * Motivo pelo qual a nova encolheu, ou undefined quando não encolheu. Uma `atual` vazia nunca
 * encolhe. Os quatro primeiros motivos são os da especificação; o quinto (mês da atual ausente na
 * nova) cobre o buraco no meio que os outros não enxergam quando a nova mantém as pontas e repõe a
 * contagem com meses novos. Só o primeiro motivo aplicável é relatado.
 */
function motivoDeEncolhimento(
  mesesAtual: Competencia[],
  mesesNova: Competencia[],
): string | undefined {
  const primeiroAtual = mesesAtual.at(0);
  const ultimoAtual = mesesAtual.at(-1);
  if (primeiroAtual === undefined || ultimoAtual === undefined) return undefined;
  const primeiroNova = mesesNova.at(0);
  const ultimoNova = mesesNova.at(-1);
  if (primeiroNova === undefined || ultimoNova === undefined) return "a lista nova veio vazia";
  if (primeiroNova > primeiroAtual) {
    return `a lista nova começa em ${formatarCompetencia(primeiroNova)}, depois do primeiro mês atual (${formatarCompetencia(primeiroAtual)})`;
  }
  if (ultimoNova < ultimoAtual) {
    return `a lista nova termina em ${formatarCompetencia(ultimoNova)}, antes do último mês atual (${formatarCompetencia(ultimoAtual)})`;
  }
  if (mesesNova.length < mesesAtual.length) {
    // Aqui as duas pontas coincidem ou a nova as ultrapassa; com menos meses, as duas listas têm
    // pelo menos dois meses, por isso o plural basta.
    return `a lista nova tem ${mesesNova.length} meses e a atual tem ${mesesAtual.length}`;
  }
  const naNova = new Set(mesesNova);
  const perdidos = mesesAtual.filter((competencia) => !naNova.has(competencia));
  if (perdidos.length > 0) {
    return `a lista nova perdeu ${listarCompetencias(perdidos)}`;
  }
  return undefined;
}

/**
 * Compara a lista atual de uma série (o arquivo em `dados/indices/`) com a lista nova vinda do BCB.
 * Os valores são comparados como texto ("0.8" e "0.80" contam como alterados), porque é o texto
 * que vai para o arquivo e para o relatório.
 */
export function compararSeries(atual: ValorMensal[], nova: ValorMensal[]): ComparacaoDeSerie {
  const mapaAtual = porCompetencia(atual);
  const mapaNova = porCompetencia(nova);
  const mesesAtual = ordenarCompetencias(mapaAtual.keys());
  const mesesNova = ordenarCompetencias(mapaNova.keys());

  const alterados: ComparacaoDeSerie["alterados"] = [];
  const novos: Competencia[] = [];
  for (const competencia of mesesNova) {
    const depois = mapaNova.get(competencia);
    if (depois === undefined) continue;
    const antes = mapaAtual.get(competencia);
    if (antes === undefined) novos.push(competencia);
    else if (antes !== depois) alterados.push({ competencia, antes, depois });
  }

  const motivo = motivoDeEncolhimento(mesesAtual, mesesNova);
  return motivo === undefined
    ? { encolheu: false, alterados, novos }
    : { encolheu: true, motivo, alterados, novos };
}
