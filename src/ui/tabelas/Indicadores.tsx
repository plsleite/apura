import { useLayoutEffect, useRef, useState } from "react";
import { decimal, ZERO } from "../../compartilhado/decimal.ts";
import { formatarData, formatarMoeda } from "../../compartilhado/formatacao.ts";
import type { DataISO, Totais } from "../../compartilhado/tipos.ts";

/** O total geral como o indicador o mostra: R$ 0,00 quando não há dívida (§6.6). */
export function totalGeralExibido(totais: Totais): string {
  return decimal(totais.totalDevido).lte(ZERO)
    ? formatarMoeda(ZERO)
    : formatarMoeda(decimal(totais.totalGeral));
}

/**
 * Os cinco indicadores (§9.3), na ordem: prestações atualizadas · amortizações atualizadas ·
 * total devido na data (destaque) · multa e honorários · total geral (destaque). Dívida negativa
 * nunca aparece como devida (§6.6): sai R$ 0,00, e o aviso do motor explica.
 *
 * Arrumação (decisão de 13/10/2026): o valor nunca quebra entre "R$" e o número; os cartões ficam
 * 5 numa linha, ou 3 em cima e 2 embaixo, ou 2, 2 e 1, ou um por linha, o maior número de colunas
 * em que o maior valor cabe inteiro. A medida é refeita quando a largura ou os valores mudam.
 */
export function Indicadores({
  totais,
  dataElaboracao,
}: {
  totais: Totais;
  dataElaboracao: DataISO;
}) {
  const devido = decimal(totais.totalDevido);
  const semDivida = devido.lte(ZERO);
  const moeda = (texto: string) => formatarMoeda(decimal(texto));
  const lista = useRef<HTMLDListElement>(null);
  const [colunas, setColunas] = useState(5);
  useLayoutEffect(() => {
    const dl = lista.current;
    // sem ResizeObserver (testes em jsdom), fica a arrumação padrão de 5 colunas
    if (dl === null || typeof ResizeObserver === "undefined") return;
    const medir = () => setColunas(colunasQueCabem(dl));
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(dl);
    return () => observador.disconnect();
  }, [totais, dataElaboracao]);
  const valor = (texto: string) => <span className="valor">{texto}</span>;
  return (
    <dl
      ref={lista}
      className="indicadores resumo"
      aria-label="Resumo do cálculo"
      style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))` }}
    >
      <div className="indicador">
        <dt>Prestações atualizadas</dt>
        <dd>{valor(moeda(totais.prestacoes))}</dd>
      </div>
      <div className="indicador">
        <dt>Amortizações atualizadas</dt>
        <dd>{valor(moeda(totais.amortizacoes))}</dd>
      </div>
      <div className="indicador destaque">
        <dt>Total devido em {formatarData(dataElaboracao)}</dt>
        <dd>{valor(semDivida ? formatarMoeda(ZERO) : moeda(totais.totalDevido))}</dd>
      </div>
      <div className="indicador">
        <dt>Multa e honorários</dt>
        <dd>{valor(formatarMoeda(decimal(totais.multa).plus(decimal(totais.honorarios))))}</dd>
      </div>
      <div className="indicador destaque">
        <dt>Total geral</dt>
        <dd>{valor(totalGeralExibido(totais))}</dd>
      </div>
    </dl>
  );
}

/**
 * Quantas colunas cabem: a largura que o maior valor pede (o texto mais o espaçamento e a borda do
 * cartão) contra a largura da lista, nas arrumações 5, 3, 2 e 1.
 */
function colunasQueCabem(dl: HTMLElement): number {
  const vao = Number.parseFloat(getComputedStyle(dl).columnGap) || 0;
  let necessaria = 0;
  for (const cartao of Array.from(dl.children)) {
    const texto = cartao.querySelector(".valor");
    if (texto === null) continue;
    const estilo = getComputedStyle(cartao);
    const extra = [
      estilo.paddingLeft,
      estilo.paddingRight,
      estilo.borderLeftWidth,
      estilo.borderRightWidth,
    ].reduce((soma, medida) => soma + (Number.parseFloat(medida) || 0), 0);
    necessaria = Math.max(necessaria, Math.ceil(texto.getBoundingClientRect().width + extra));
  }
  const largura = dl.clientWidth;
  for (const n of [5, 3, 2]) {
    if (n * necessaria + (n - 1) * vao <= largura) return n;
  }
  return 1;
}
