import type {
  Calculo,
  FormaDaBase,
  Lancamento,
  Metodologia,
  Resultado,
  TabelaIndices,
} from "../../compartilhado/tipos.ts";
import { metodologiaDaOpcao } from "../../metodologias/padrao.ts";
import { baseUnica } from "../../motor/base.ts";
import { calcular } from "../../motor/calcular.ts";
import { tabelaRegimeNovo } from "../../motor/testes/regime-novo.ts";

/**
 * Cálculos de exemplo para os testes do relatório: a tabela fixa de 2024–2026 dos testes do
 * motor (nunca a cópia publicada), data do cálculo 11/10/2026 e dados fictícios.
 */

export const DATA_DO_CALCULO = "2026-10-11";

export const VALOR_FIXO_500: FormaDaBase = {
  tipo: "valorFixo",
  valor: "500.00",
  dataFixacao: "2024-07-01",
  indiceReajuste: "nenhum",
  mesReajuste: 7,
};

export function prestacao(data: string, extra: Partial<Lancamento> = {}): Lancamento {
  return {
    id: `p-${data}`,
    tipo: "prestacao",
    data,
    competencia: data.slice(0, 7),
    origem: "lote",
    editado: false,
    ...extra,
  };
}

export function pagamento(
  data: string,
  valor: string,
  extra: Partial<Lancamento> = {},
): Lancamento {
  return {
    id: `a-${data}`,
    tipo: "amortizacao",
    data,
    descricao: "Pagamento parcial",
    valorInformado: valor,
    origem: "lote",
    editado: false,
    ...extra,
  };
}

export function calculoDeTeste(mudancas: Partial<Calculo> = {}): Calculo {
  return {
    formato: "apura/calculo@1",
    tipo: "alimentos",
    id: "calculo-de-teste",
    criadoEm: "2026-10-11T09:00:00-03:00",
    atualizadoEm: "2026-10-11T09:00:00-03:00",
    dataElaboracao: DATA_DO_CALCULO,
    cabecalho: {
      defensor: "Defensor(a) de teste",
      orgao: "1ª Defensoria Pública de Teste",
      processo: "0800000-46.2026.8.12.0001",
      exequente: "A. B.",
      executado: "C. D.",
    },
    base: baseUnica(VALOR_FIXO_500),
    lotes: {},
    lancamentos: [prestacao("2024-07-05"), prestacao("2024-10-05")],
    metodologia: metodologiaDaOpcao("lei14905"),
    acrescimos: { multaPercentual: "10", honorariosPercentual: "10" },
    observacoes: "",
    ...mudancas,
  };
}

export function resultadoDe(
  calculo: Calculo,
  tabela: TabelaIndices = tabelaRegimeNovo(),
): Resultado {
  return calcular(calculo, tabela);
}

/** Uma metodologia de três períodos: INPC e 2% ao mês; SELIC única; IPCA e taxa legal. */
export function metodologiaDeTresPeriodos(): Metodologia {
  return {
    ...metodologiaDaOpcao("lei14905"),
    ajustada: true,
    periodos: [
      {
        de: null,
        ate: "2024-12-31",
        correcao: { indice: "INPC" },
        juros: { tipo: "percentualMensal", taxaMensal: "2" },
      },
      {
        de: "2025-01-01",
        ate: "2025-06-30",
        correcao: { indice: "nenhum" },
        juros: { tipo: "selicUnica" },
      },
      { de: "2025-07-01", ate: null, correcao: { indice: "IPCA" }, juros: { tipo: "taxaLegal" } },
    ],
  };
}

/**
 * Um cálculo com uma linha de cada tipo: prestação comum, com valor informado, com encargos
 * próprios e vincenda; pagamento computado e pagamento posterior à data do cálculo.
 */
export function calculoCompleto(mudancas: Partial<Calculo> = {}): Calculo {
  return calculoDeTeste({
    lancamentos: [
      prestacao("2024-07-05"),
      prestacao("2024-10-05", { valorInformado: "600.00", editado: true }),
      prestacao("2025-03-05", {
        encargos: { termoInicialCorrecao: "2025-04-10", termoInicialJuros: "2025-05-01" },
        editado: true,
      }),
      prestacao("2026-11-05"),
      pagamento("2024-10-10", "200.00"),
      pagamento("2026-11-10", "150.00"),
    ],
    ...mudancas,
  });
}
