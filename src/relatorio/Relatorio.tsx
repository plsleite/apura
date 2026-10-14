import { useEffect, useId, useRef } from "react";
import { formatarData } from "../compartilhado/formatacao.ts";
import type { Calculo, Resultado } from "../compartilhado/tipos.ts";
import { matrizesDeIndices } from "./matriz.ts";
import { metodologiaEFundamentos } from "./metodologia.ts";
import "./relatorio.css";
import {
  cabecalhoDoRelatorio,
  indicadoresDoRelatorio,
  rodapeDoRelatorio,
  tabelasDoRelatorio,
  totaisDoRelatorio,
  type TabelaDoRelatorio,
} from "./tabelas.ts";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/**
 * O relatório (§10.1 e §18.3): faixa verde, indicadores, prestações, amortizações, totais,
 * "Metodologia e fundamentos", índices aplicados e rodapé. Lê só o Cálculo e o Resultado; `hoje`
 * (a data em que o relatório é gerado) e `versao` vão para o rodapé. O mesmo HTML serve à tela e à
 * impressão (`relatorio.css`).
 */
export function Relatorio({
  calculo,
  resultado,
  hoje,
  versao,
  focar = false,
}: {
  calculo: Calculo;
  resultado: Resultado;
  hoje: string;
  versao: string;
  /** leva o foco ao título quando o relatório aparece (na tela, ao abrir pelo botão) */
  focar?: boolean;
}) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focar) titulo.current?.focus();
  }, [focar]);
  const cabecalho = cabecalhoDoRelatorio(calculo);
  const { prestacoes, amortizacoes } = tabelasDoRelatorio(calculo, resultado);
  const totais = totaisDoRelatorio(calculo, resultado);
  const rodape = rodapeDoRelatorio(calculo, versao, hoje);
  const data = formatarData(calculo.dataElaboracao);
  const id = useId();
  return (
    <article className="relatorio" aria-labelledby={`${id}-titulo`}>
      <header className="relatorio-faixa">
        <div className="relatorio-identificacao">
          {cabecalho.orgao === null ? null : <p className="relatorio-orgao">{cabecalho.orgao}</p>}
          <h1 id={`${id}-titulo`} ref={titulo} tabIndex={-1}>
            {cabecalho.titulo}
          </h1>
          {cabecalho.linhas.map((linha) => (
            <p key={linha} className="relatorio-sub">
              {linha}
            </p>
          ))}
        </div>
        <img
          className="relatorio-logo"
          src={`${import.meta.env.BASE_URL}logos/dpems-horizontal-branca-relatorio.png`}
          width={1105}
          height={264}
          alt="Defensoria Pública de Mato Grosso do Sul"
        />
      </header>
      <div className="relatorio-corpo">
        <ul className="relatorio-indicadores" aria-label="Resumo do cálculo">
          {indicadoresDoRelatorio(calculo, resultado).map((i) => (
            <li key={i.rotulo} className={i.destaque ? "destaque" : undefined}>
              <span className="rotulo">{i.rotulo}</span>
              <span className="valor">{i.valor}</span>
              <span className="apoio">{i.apoio}</span>
            </li>
          ))}
        </ul>

        <section aria-labelledby={`${id}-prestacoes`}>
          <h2 id={`${id}-prestacoes`}>Prestações</h2>
          <p className="relatorio-lede">
            Cada prestação é atualizada do vencimento até {data}; valores em reais.
          </p>
          <TabelaDeLancamentos
            nome="Prestações"
            primeira="Vencimento"
            tabela={prestacoes}
            notas="Notas da tabela de prestações"
          />
        </section>

        <section aria-labelledby={`${id}-amortizacoes`}>
          <h2 id={`${id}-amortizacoes`}>Amortizações</h2>
          {amortizacoes.linhas.length === 0 ? (
            <p className="relatorio-lede">Não há pagamentos a abater.</p>
          ) : (
            <>
              <p className="relatorio-lede">
                Cada pagamento é atualizado da data do pagamento até {data}; valores em reais.
              </p>
              <TabelaDeLancamentos
                nome="Amortizações"
                primeira="Data"
                tabela={amortizacoes}
                notas="Notas da tabela de amortizações"
              />
            </>
          )}
        </section>

        <section className="relatorio-totais" aria-labelledby={`${id}-totais`}>
          <h2 id={`${id}-totais`}>{totais.titulo}</h2>
          <dl>
            {totais.linhas.map((l) => (
              <div key={l.rotulo} className={l.destaque ? "destaque" : undefined}>
                <dt>{l.rotulo}</dt>
                <dd>{l.valor}</dd>
              </div>
            ))}
          </dl>
          {totais.nota === null ? null : <p className="relatorio-nota">{totais.nota}</p>}
        </section>

        <section className="relatorio-metodologia" aria-labelledby={`${id}-metodologia`}>
          <h2 id={`${id}-metodologia`}>Metodologia e fundamentos</h2>
          {metodologiaEFundamentos(calculo, resultado).map((p) => (
            <p key={p.titulo}>
              <strong>{p.titulo}</strong> {p.texto}
            </p>
          ))}
        </section>

        <section className="relatorio-indices" aria-labelledby={`${id}-indices`}>
          <h2 id={`${id}-indices`}>Índices aplicados</h2>
          <p className="relatorio-lede">
            Valores mensais publicados pelo Banco Central (em %; o salário mínimo em reais). O ponto
            indica mês sem índice divulgado na data da consulta.
          </p>
          {matrizesDeIndices(resultado).map((m) => (
            <table key={m.serie} className="relatorio-matriz" aria-label={m.nome}>
              <thead>
                <tr>
                  <th scope="col">Série · ano</th>
                  {MESES.map((mes) => (
                    <th key={mes} scope="col">
                      {mes}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {m.anos.map((a) => (
                  <tr key={a.ano}>
                    <th scope="row">
                      {m.nome} · {a.ano}
                    </th>
                    {a.meses.map((valor, i) => (
                      <td key={MESES[i]} className={valor === "·" ? "sem-indice" : undefined}>
                        {valor}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </section>

        <footer className="relatorio-rodape">
          <span>{rodape.esquerda}</span>
          <span>{rodape.direita}</span>
        </footer>
      </div>
    </article>
  );
}

function TabelaDeLancamentos({
  nome,
  primeira,
  tabela,
  notas,
}: {
  nome: string;
  primeira: string;
  tabela: TabelaDoRelatorio;
  notas: string;
}) {
  const traco = (valor: string | null) => valor ?? "—";
  return (
    <>
      <table className="relatorio-tabela" aria-label={nome}>
        <thead>
          <tr>
            <th scope="col">{primeira}</th>
            <th scope="col">Valor</th>
            <th scope="col">Fator de correção</th>
            <th scope="col">Corrigido</th>
            <th scope="col">Juros %</th>
            <th scope="col">Juros R$</th>
            <th scope="col">Atualizado</th>
            <th scope="col" aria-hidden="true"></th>
          </tr>
        </thead>
        <tbody>
          {tabela.linhas.map((l) => (
            <tr key={l.id} className={l.computada ? undefined : "nao-computada"}>
              <td>
                {l.data}
                {l.descricao === undefined ? null : ` · ${l.descricao}`}
                {l.palavras.map((p) => (
                  <span key={p} className="palavra">
                    {` · ${p}`}
                  </span>
                ))}
              </td>
              <td>{traco(l.valor)}</td>
              <td>{traco(l.fator)}</td>
              <td>{traco(l.corrigido)}</td>
              <td>{traco(l.jurosPercentual)}</td>
              <td>{traco(l.jurosValor)}</td>
              <td>{traco(l.atualizado)}</td>
              <td className="barra-proporcional" aria-hidden="true">
                <span style={{ width: `${Math.round(l.proporcao * 100)}%` }} />
              </td>
            </tr>
          ))}
          {/* os totais são a última linha do corpo, não um tfoot: o Chrome repetiria o tfoot em
              cada página impressa (§18.2) */}
          <tr className="linha-total">
            <td>Totais</td>
            <td>{tabela.totais.valor}</td>
            <td></td>
            <td>{tabela.totais.corrigido}</td>
            <td></td>
            <td>{tabela.totais.jurosValor}</td>
            <td>{tabela.totais.atualizado}</td>
            <td aria-hidden="true"></td>
          </tr>
        </tbody>
      </table>
      {tabela.notas.length === 0 ? null : (
        <ul className="relatorio-notas" aria-label={notas}>
          {tabela.notas.map((n) => (
            <li key={n.termo}>
              <strong>{n.termo}:</strong>
              {n.texto === undefined ? null : ` ${n.texto}`}
              {n.itens === undefined ? null : (
                <ul>
                  {/* duas linhas podem dar o mesmo texto: a chave leva a posição */}
                  {n.itens.map((item, i) => (
                    <li key={`${i}-${item}`}>{item}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
