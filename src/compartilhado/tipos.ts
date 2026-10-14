import type { Competencia, DataISO } from "./datas.ts";
import type { TextoDecimal } from "./decimal.ts";

export type { Competencia, DataISO, TextoDecimal };

// ---------------------------------------------------------------------------------------------
// Séries do BCB/SGS
// ---------------------------------------------------------------------------------------------

/** Códigos das séries do SGS usadas pelo Apura (§8.1 do design). */
export type CodigoSerie = "433" | "188" | "189" | "1619" | "29543" | "4390";

export type NomeIndice = "IGP-M" | "INPC" | "IPCA";
export type IndiceCorrecao = NomeIndice | "nenhum";
export type IndiceReajuste = NomeIndice | "SM" | "nenhum";

export const CODIGO_DA_SERIE: Record<NomeIndice | "SM" | "taxaLegal" | "SELIC", CodigoSerie> = {
  "IGP-M": "189",
  INPC: "188",
  IPCA: "433",
  SM: "1619",
  taxaLegal: "29543",
  SELIC: "4390",
};

export const NOME_DA_SERIE: Record<CodigoSerie, string> = {
  "189": "IGP-M",
  "188": "INPC",
  "433": "IPCA",
  "1619": "salário mínimo",
  "29543": "taxa legal",
  "4390": "SELIC",
};

/**
 * Um valor de índice com proveniência (§8.3). `fonte` diz de onde o valor veio: desde a fase 4,
 * sempre da cópia publicada com o site (`"embutida"`), que a rotina central baixa do BCB; `"aoVivo"`
 * fica reservado (decisão de 12/10/2026).
 */
export interface ValorIndice {
  valor: TextoDecimal;
  fonte: "embutida" | "aoVivo";
  /**
   * Data-hora ISO em que o valor foi obtido do BCB, no horário de Brasília
   * ("2026-10-11T14:02:00-03:00"; os arquivos anteriores à fase 4 trazem UTC, "…Z"). Na SELIC
   * (série 4390), o mês igual ao mês de `obtidoEm` é o acumulado parcial do mês corrente (§6.4).
   */
  obtidoEm: string;
}

/** Tabela de índices congelada para um cálculo: por código de série, por competência. */
export interface TabelaIndices {
  /**
   * data-hora ISO da obtenção mais recente entre as séries da tabela (horário de Brasília nas
   * gravações da rotina central; UTC nos arquivos anteriores à fase 4)
   */
  consultadoEm: string;
  series: Partial<Record<CodigoSerie, Record<Competencia, ValorIndice>>>;
  /**
   * Último mês que cada série deveria ter na data da consulta, pelo calendário de divulgação
   * (§8.3; `src/indices/calendario.ts`). Com ele, o motor distingue o mês "ainda não divulgado"
   * (posterior a este) do mês faltante na tabela. Ausente nos casos de referência antigos: o motor
   * então usa só o aviso genérico.
   */
  esperadoAte?: Partial<Record<CodigoSerie, Competencia>>;
}

/** Arquivo `dados/indices/<codigo>.json`, gerado por `scripts/atualizar-indices.ts`. */
export interface ArquivoSerie {
  formato: "apura/serie@1";
  codigo: CodigoSerie;
  nome: string;
  origem: string;
  /** data-hora ISO da obtenção no BCB, no horário de Brasília desde a fase 4 */
  obtidoEm: string;
  valores: Array<{ competencia: Competencia; valor: TextoDecimal }>;
}

// ---------------------------------------------------------------------------------------------
// Metodologia (§5.3)
// ---------------------------------------------------------------------------------------------

export type RegraJuros =
  | { tipo: "percentualMensal"; taxaMensal: TextoDecimal }
  | { tipo: "taxaLegal" }
  | { tipo: "selicUnica" };

export interface PeriodoMetodologia {
  de: DataISO | null;
  ate: DataISO | null;
  correcao: { indice: IndiceCorrecao };
  juros: RegraJuros;
}

export interface Metodologia {
  id: string;
  versao: number;
  nome: string;
  ajustada: boolean;
  periodos: PeriodoMetodologia[];
  incidenciaMesInicial: "proRata" | "mesSeguinte";
  deflacao: "aplicarComPiso" | "aplicarSemPiso" | "zerarNegativos";
  arredondamento: {
    fatorCasas: number;
    percentualCasas: number;
    valorCasas: number;
    modo: "comercial";
  };
}

// ---------------------------------------------------------------------------------------------
// Cálculo (§5.2)
// ---------------------------------------------------------------------------------------------

export interface Cabecalho {
  defensor: string;
  orgao: string;
  processo: string;
  exequente: string;
  executado: string;
}

/** Uma das três formas da base dos alimentos (§5.2, §6.3), com os seus campos. */
export type FormaDaBase =
  | {
      tipo: "valorFixo";
      valor: TextoDecimal;
      dataFixacao: DataISO;
      indiceReajuste: IndiceReajuste;
      /** mês do reajuste anual, 1 a 12 */
      mesReajuste: number;
    }
  | { tipo: "percentualSalarioMinimo"; percentual: TextoDecimal }
  | { tipo: "percentualRendimentos"; percentual: TextoDecimal; rendimentoPadrao: TextoDecimal };

/**
 * Um período da base (§17.2): vale para as prestações cujo vencimento cai de `de` a `ate`,
 * inclusive. `de` nulo: sem começo (o primeiro período); `ate` nulo: sem fim (o último).
 */
export interface PeriodoDaBase {
  de: DataISO | null;
  ate: DataISO | null;
  forma: FormaDaBase;
}

/**
 * Base dos alimentos por períodos (§17.2, fase 5b): seguidos, sem buraco nem sobreposição, o
 * primeiro sem começo e o último sem fim. O cálculo comum tem um período só, de `null` a `null`.
 */
export interface Base {
  periodos: PeriodoDaBase[];
}

export interface LotePrestacoes {
  diaVencimento: number;
  mesesEmAtraso?: number;
  de?: Competencia;
  ate?: Competencia;
}

export interface LoteAmortizacoes {
  valorMensal: TextoDecimal;
  diaPagamento: number;
  de: Competencia;
  ate: Competencia;
}

export interface EncargosProprios {
  termoInicialCorrecao?: DataISO;
  termoFinalCorrecao?: DataISO;
  termoInicialJuros?: DataISO;
  termoFinalJuros?: DataISO;
  metodologia?: Metodologia;
}

export interface Lancamento {
  id: string;
  tipo: "prestacao" | "amortizacao";
  /** vencimento (prestação) ou data do pagamento (amortização) */
  data: DataISO;
  competencia?: Competencia;
  descricao?: string;
  /** amortizações sempre; prestações só quando o valor foi informado à mão (as demais são apuradas pela base, §6.3) */
  valorInformado?: TextoDecimal;
  rendimento?: TextoDecimal;
  encargos?: EncargosProprios;
  origem: "lote" | "avulso";
  editado: boolean;
}

export interface Calculo {
  formato: "apura/calculo@1";
  tipo: "alimentos";
  id: string;
  criadoEm: string;
  atualizadoEm: string;
  dataElaboracao: DataISO;
  cabecalho: Cabecalho;
  base: Base;
  lotes: { ultimoLotePrestacoes?: LotePrestacoes; ultimoLoteAmortizacoes?: LoteAmortizacoes };
  lancamentos: Lancamento[];
  /** cópia da metodologia aplicada */
  metodologia: Metodologia;
  acrescimos: { multaPercentual: TextoDecimal; honorariosPercentual: TextoDecimal };
  observacoes: string;
}

// ---------------------------------------------------------------------------------------------
// Resultado (§5.4)
// ---------------------------------------------------------------------------------------------

/** Um mês da memória de correção. `serie` nula = período sem correção; `valor` nulo = sem índice. */
export interface IndiceAplicado {
  serie: CodigoSerie | null;
  competencia: Competencia;
  valor: TextoDecimal | null;
  /** fração do mês aplicada: "1" (mês inteiro), "21/31" (pro rata) ou "0/31" (mês não entra) */
  fracao: string;
}

export interface DetalheJuros {
  regime: RegraJuros["tipo"];
  de: DataISO;
  ate: DataISO;
  dias: number;
  diasDoMes?: number;
  taxa: TextoDecimal;
  percentual: TextoDecimal;
}

/**
 * Como o lançamento entrou no cálculo (§6.7): "atualizado" (correção e juros até a data de
 * elaboração); "vincenda" (prestação posterior à data de elaboração, pelo valor nominal, sem
 * encargos); "ignorado" (fora dos totais: pagamento posterior à data de elaboração, valor zero ou
 * negativo, valor inválido ou base sem como apurar).
 */
export type SituacaoLancamento = "atualizado" | "vincenda" | "ignorado";

/**
 * Um reajuste anual do valor fixo por índice (§6.3), como o motor o aplicou, para o relatório
 * descrever a base sem depender da redação da memória (§18.4).
 */
export interface ReajusteDaBase {
  /** mês do reajuste */
  em: Competencia;
  indice: NomeIndice;
  /** janela do acumulado, inclusive */
  de: Competencia;
  ate: Competencia;
  /** "aplicado"; "mantido" (acumulado não positivo); "naoAplicado" (faltou índice na janela) */
  situacao: "aplicado" | "mantido" | "naoAplicado";
  /** acumulado da janela em %, com 4 casas ("5.0576"); ausente quando não aplicado */
  percentual?: TextoDecimal;
  /** valor vigente depois do reajuste (o mesmo de antes quando mantido ou não aplicado) */
  valor: TextoDecimal;
  /** meses que faltaram na janela (só quando não aplicado) */
  faltantes?: Competencia[];
  /** todos os meses faltantes ainda sem divulgação na data da consulta (só quando não aplicado) */
  aindaNaoDivulgados?: boolean;
}

export interface LancamentoCalculado {
  id: string;
  tipo: Lancamento["tipo"];
  data: DataISO;
  competencia?: Competencia;
  descricao?: string;
  valorBase: TextoDecimal;
  memoriaBase: string;
  /** prestação cujo valor foi informado à mão, em vez de apurado pela base dos alimentos (§6.3) */
  editado: boolean;
  situacao: SituacaoLancamento;
  /**
   * reajustes do valor fixo por índice até o vencimento (vazio antes do primeiro), só nas
   * prestações apuradas por essa forma da base (§18.4)
   */
  reajustes?: ReajusteDaBase[];
  correcao: { fator: TextoDecimal; indices: IndiceAplicado[]; pisoAplicado: boolean };
  corrigido: TextoDecimal;
  juros: { percentual: TextoDecimal; detalhe: DetalheJuros[] };
  jurosValor: TextoDecimal;
  atualizado: TextoDecimal;
  avisos: string[];
}

export interface Totais {
  prestacoes: TextoDecimal;
  amortizacoes: TextoDecimal;
  totalDevido: TextoDecimal;
  multa: TextoDecimal;
  honorarios: TextoDecimal;
  totalGeral: TextoDecimal;
}

export interface IndiceUsado {
  serie: CodigoSerie;
  competencia: Competencia;
  valor: TextoDecimal;
  fonte: ValorIndice["fonte"];
  obtidoEm: string;
}

export interface Resultado {
  lancamentos: LancamentoCalculado[];
  totais: Totais;
  indicesUsados: IndiceUsado[];
  consultaIndices: {
    em: string;
    series: CodigoSerie[];
    ultimoMesPorSerie: Partial<Record<CodigoSerie, Competencia>>;
  };
  avisos: string[];
}

// ---------------------------------------------------------------------------------------------
// Caso de referência (§11): arquivo em src/motor/casos/*.json
// ---------------------------------------------------------------------------------------------

export interface LancamentoEsperado {
  id: string;
  corrigido: TextoDecimal;
  jurosValor: TextoDecimal;
  atualizado: TextoDecimal;
  fator?: TextoDecimal;
  jurosPercentual?: TextoDecimal;
  valorBase?: TextoDecimal;
  memoriaBase?: string;
  situacao?: SituacaoLancamento;
  editado?: boolean;
  /** avisos do lançamento, comparados por inteiro quando informados */
  avisos?: string[];
}

export interface CasoDeReferencia {
  formato: "apura/caso-de-referencia@1";
  nome: string;
  fonte: string;
  observacoes?: string;
  calculo: Calculo;
  indices: TabelaIndices;
  /** `avisos` (do Resultado) são comparados por inteiro quando o caso os informa */
  esperado: { lancamentos: LancamentoEsperado[]; totais: Totais; avisos?: string[] };
}

// ---------------------------------------------------------------------------------------------
// Arquivo de cálculo (§5.1): o que "Salvar" grava e "Abrir" lê
// ---------------------------------------------------------------------------------------------

/**
 * Arquivo `apura-<processo>-<data>.json`: as entradas e o resultado derivado (para auditoria). Ao
 * reabrir, o Apura recalcula com os índices atuais e compara `resultado.indicesUsados` com o do
 * recálculo. O mesmo envelope guarda os cálculos recentes no navegador (§5.5).
 */
export interface ArquivoCalculo {
  formato: "apura/calculo@1";
  calculo: Calculo;
  resultado: Resultado;
}
