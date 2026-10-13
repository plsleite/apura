import { formatarData } from "../../compartilhado/formatacao.ts";
import type { Lancamento, LancamentoCalculado } from "../../compartilhado/tipos.ts";

/**
 * Etiquetas da linha das tabelas (§17.4, fase 5b): "não computada", "vincenda", "valor
 * informado" e "ajustada" (no masculino nos pagamentos), em ordem de importância, cada uma com a
 * sua explicação (§9.4: nenhum rótulo sem explicação). A linha mostra só a primeira e "+N", ao
 * lado da descrição, que encolhe até caber; o balão mostra a descrição inteira e todas as
 * etiquetas. Módulo puro.
 */
export interface Etiqueta {
  texto: string;
  explicacao: string;
}

export function etiquetasDaLinha(
  lancamento: Lancamento,
  calculado: LancamentoCalculado,
): Etiqueta[] {
  const feminino = lancamento.tipo === "prestacao";
  const etiquetas: Etiqueta[] = [];
  if (calculado.situacao === "ignorado") {
    etiquetas.push({
      texto: feminino ? "não computada" : "não computado",
      explicacao: "Fora dos totais: abra a memória da linha (▸) para ver o motivo.",
    });
  }
  if (calculado.situacao === "vincenda") {
    etiquetas.push({
      texto: "vincenda",
      explicacao:
        "Vence depois da data de elaboração: entra pelo valor nominal, sem correção e sem juros.",
    });
  }
  if (calculado.editado) {
    etiquetas.push({
      texto: "valor informado",
      explicacao: feminino
        ? "Valor digitado à mão, não apurado pela base dos alimentos; apagado, volta à base."
        : "Valor digitado à mão.",
    });
  }
  if (lancamento.editado) {
    etiquetas.push({
      texto: feminino ? "ajustada" : "ajustado",
      explicacao: `${feminino ? "Alterada" : "Alterado"} depois de ${feminino ? "lançada" : "lançado"} (${feminino ? "vencimento" : "data"}, valor, descrição, rendimento, termos ou regras próprias).`,
    });
  }
  return etiquetas;
}

/**
 * Nome do botão da linha: "Situação da prestação de 05/09/2026: vincenda, valor informado,
 * ajustada"; sem etiquetas, o botão é a descrição: "Descrição da prestação de 05/09/2026: 13º
 * salário 2026" (decisão de 13/10/2026).
 */
export function nomeDaSituacao(lancamento: Lancamento, etiquetas: Etiqueta[]): string {
  const qual = `${lancamento.tipo === "prestacao" ? "da prestação" : "do pagamento"} de ${formatarData(lancamento.data)}`;
  if (etiquetas.length === 0) return `Descrição ${qual}: ${lancamento.descricao?.trim() ?? ""}`;
  return `Situação ${qual}: ${etiquetas.map((e) => e.texto).join(", ")}`;
}
