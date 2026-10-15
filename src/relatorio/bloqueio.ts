import { decimalOuNulo } from "../compartilhado/decimal.ts";
import type { Calculo, Resultado } from "../compartilhado/tipos.ts";
import { listar, pares, type Par } from "./texto.ts";

/**
 * O pagamento com data posterior à data do cálculo e com valor válido e positivo: o único
 * "não computado" que pode chegar ao relatório (§18.1). Sem valor, ou com valor zero, negativo
 * ou inválido, ele conta como os demais lançamentos sem valor (§19.7, item 5).
 */
function posteriorComValor(p: Par, calculo: Calculo): boolean {
  if (p.lancamento.tipo !== "amortizacao" || p.lancamento.data <= calculo.dataElaboracao) {
    return false;
  }
  const valor = decimalOuNulo(p.lancamento.valorInformado);
  return valor !== null && valor.gt(0);
}

/**
 * Por que "Relatório / PDF" fica desligado (§18.1), ou `null` quando pode abrir: sem prestação
 * lançada, ou com algum lançamento "não computado" por falta de valor ou por valor inválido. O
 * pagamento com data posterior à data do cálculo e com valor não bloqueia. Módulo puro.
 */
export function motivoDoBloqueio(calculo: Calculo, resultado: Resultado): string | null {
  const todos = pares(calculo, resultado);
  if (!todos.some((p) => p.lancamento.tipo === "prestacao")) {
    return "Lance ao menos uma prestação para gerar o relatório.";
  }
  const semValor = todos.filter(
    (p) => p.calculado.situacao === "ignorado" && !posteriorComValor(p, calculo),
  );
  if (semValor.length === 0) return null;
  const n = semValor.filter((p) => p.lancamento.tipo === "prestacao").length;
  const m = semValor.length - n;
  const partes = [
    ...(n === 0 ? [] : [`${n} ${n === 1 ? "prestação" : "prestações"}`]),
    ...(m === 0 ? [] : [`${m} ${m === 1 ? "pagamento" : "pagamentos"}`]),
  ];
  const verbo = semValor.length === 1 ? "está" : "estão";
  const correcao = n > 0 ? "complete a base ou informe o valor" : "informe o valor";
  return `${listar(partes)} ${verbo} sem valor (veja a caixa de avisos): ${correcao} para gerar o relatório.`;
}
