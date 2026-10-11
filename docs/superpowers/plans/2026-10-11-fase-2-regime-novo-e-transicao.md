# Apura · Fase 2 · Regime novo e transição — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** fazer o motor calcular o regime novo da Lei 14.905/2024 (correção pelo IPCA e juros pela taxa legal, série 29543 do BCB) com transição automática em 30/08/2024, a SELIC única como alternativa do período antigo, a deflação com piso, os encargos próprios por lançamento, a multa e os honorários do art. 523, §1º, do CPC, e as pendências que a fase 1 destinou à fase 2; tudo provado por sete casos de referência novos: dois relatórios do SAJ Tribunais de 11/10/2026 reproduzidos centavo a centavo e cinco casos conferidos na Calculadora do Cidadão do BCB.

**Arquitetura:** a mesma da fase 1. O motor (`src/motor/`) continua um conjunto de funções puras que recebem o `Calculo` e uma `TabelaIndices` congelada e devolvem o `Resultado`. A fase 2 altera quatro arquivos do motor (`periodos.ts`, `correcao.ts`, `juros.ts`, `calcular.ts`), acrescenta duas funções de data, três séries à cópia embutida, uma regra de ESLint que impede relógio, rede e DOM no motor, um arquivo de dados de teste do regime novo e sete casos de referência em JSON. Nenhum tipo de `src/compartilhado/tipos.ts` muda.

**Stack:** Node 22 · npm · Vite 8.3 · React 19.3 · TypeScript 6.0 · Vitest 5.0 · decimal.js 10.6 · ESLint 10 + typescript-eslint 8 · Prettier 3.9, nas versões exatas já fixadas em `package.json`. Nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md` (design do MVP, fonte de verdade; §5 modelo de dados, §6.4 a §6.6 motor, §7 pontos de validação, §8 índices, §11 testes, §16 fases). Também: `docs/superpowers/roteiro.md`, `docs/superpowers/specs/2026-10-10-apura-visao-do-produto.md` e o plano da fase 1 (`docs/superpowers/plans/2026-10-10-fase-1-fundacao-e-motor-regime-antigo.md`, seções "Notas para as fases seguintes" e "Pendências registradas na execução da fase 1").

## Restrições globais (valem para todas as tarefas)

- TypeScript estrito; Node 22 e npm (não há pnpm). O script de índices exige Node ≥ 22.18 e internet.
- Dinheiro, percentuais, índices e fatores são sempre `Decimal`, importado só de `src/compartilhado/decimal.ts`; nunca `number`. Em arquivos e no `Resultado`, texto decimal com ponto (`"451.91"`, `"0.605306"`).
- Datas como texto `"AAAA-MM-DD"`; competências como `"AAAA-MM"`. O motor não usa `Date`, `fetch`, DOM nem armazenamento (a partir desta fase, o ESLint impede).
- **Precisão (decisão de 11/10/2026, ponto 9 do design):** o fator de correção e o percentual de juros multiplicam com precisão integral; só a exibição arredonda (fator e percentual com 6 casas, valores com 2, modo comercial). `corrigido = arred2(valorBase × fator)`; `jurosValor = arred2(corrigido × percentual ÷ 100)`; `atualizado = corrigido + jurosValor`. Totais = soma dos valores já arredondados de cada lançamento.
- **Regime antigo (`percentualMensal`):** juros rateados por mês-calendário contando o dia inicial e o dia final (convenção do SAJ, confirmada nos relatórios de 2018 e de 2026).
- **Regime novo (`taxaLegal`, decisão de 11/10/2026, pontos 3 e 4):** taxa legal do mês (série 29543) × dias ÷ dias corridos do mês, juros simples, sobre o valor corrigido pelo IPCA; conta-se o primeiro dia do trecho e **não** se conta o dia do termo final, como a Calculadora do Cidadão do BCB (exemplo oficial: 30/08/2024 a 31/08/2024 = 1 dia). Na transição, para lançamento anterior a 30/08/2024, o 1% ao mês vai até 29/08/2024 (duas pontas) e a taxa legal começa em 30/08/2024, dia que conta; 30 e 31/08/2024 usam a taxa de agosto/2024. O IGP-M vale até agosto/2024 inteiro e o IPCA de setembro/2024 em diante (índice do período vigente no dia 1 de cada mês).
- **SELIC única (`selicUnica`, decisão de 11/10/2026, ponto 5):** a SELIC (série 4390) entra como índice de correção capitalizado mês a mês, com pro rata geométrico no mês inicial, como o SAJ faz; não há juros separados. O valor parcial do mês da consulta entra inteiro, sem rateio.
- **Deflação (decisão de 11/10/2026, ponto 12):** padrão `aplicarComPiso`, sobre o fator bruto: se o fator acumulado ficar abaixo de 1, o corrigido é igual ao original e o resultado registra o piso (STJ, Corte Especial, REsp 1.265.580/RS). O SAJ não aplica piso; o caso dele usa `aplicarSemPiso` na própria metodologia.
- **Multa e honorários (ponto 8 confirmado):** cada percentual separadamente sobre o total devido; honorários não incidem sobre a multa; zero quando o total devido não é positivo (com aviso se os percentuais eram maiores que zero).
- Termo final próprio posterior à data de elaboração é limitado a ela, com aviso. Metodologias com lacunas ou sobreposições de períodos geram aviso; um dia nunca rende juros duas vezes.
- Termos do domínio em português no código, nos testes e nos dados; infraestrutura técnica em inglês. Imports relativos com a extensão `.ts`; tipos com `import type`.
- Nenhum índice inventado: só BCB/SGS (séries 433, 189, 29543 e 4390 nesta fase; 188 e 1619 na fase 3). Um caso de referência congela a tabela **como a fonte a usou**: por isso o caso do SAJ de 2026 traz dez/2025 = −0,02 (tabela do TJMS), diferente da série 189 do BCB (−0,01), com a divergência registrada em `observacoes`.
- Dados pessoais: nenhum número de processo nem nome de parte. Os três PDFs do SAJ de 11/10/2026 ficam fora do repositório e não são copiados nem citados pelo nome do arquivo.
- Commits em português no formato "módulo: o que muda", terminados com a linha de coautoria do modelo em uso (os comandos abaixo trazem `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; se outro modelo executar, troque pelo nome dele).
- Fora desta fase (não implementar): apuração do valor-base e lotes (fase 3), casos-limite da §6.7 (fase 3), cliente ao vivo do BCB e cache (fase 4), interface (fase 5), relatório (fase 6). Onde o código desta fase encostar nesses pontos, deixa aviso ou valor neutro e registra o gancho em "Notas para as fases seguintes".

## Foco da revisão

Entradas que o design implica mas que nenhum teste cobriria por si; cada uma ganhou um teste na tarefa dona do código.

1. **Lançamento datado no próprio dia do cálculo**: no regime novo rende zero dia de juros (Calculadora: 11/10/2026 a 11/10/2026 = 0) e no regime antigo rende um dia (duas pontas), sem exceção nem aviso. → Task 5 (teste "lançamento datado no dia do cálculo") e Task 8 (linha `p-2026-10-11` do caso do regime novo).
2. **Taxa legal do mês corrente ausente** (tabela desatualizada, por exemplo cálculo no dia 1 antes da publicação): o trecho fica sem juros, com aviso em frase completa, e o cálculo continua. → Task 5 (teste "taxa legal ausente na tabela").
3. **Metodologia com lacuna ou sobreposição** (o usuário divide períodos na tela e deixa um dia descoberto ou coberto duas vezes): aviso, nenhum dia contado duas vezes, lançamento na lacuna sem correção e sem juros. → Task 3 (testes de validação) e Task 6 (teste "metodologia com lacuna").
4. **Termo final próprio depois da data de elaboração**: limitado à data de elaboração, com aviso, sem correção ou juros "futuros". → Task 6 (teste "termo final próprio posterior").
5. **Deflação acumulada no regime novo e SELIC do mês corrente**: IPCA negativo em ago/2026 com set/2026 ainda sem índice aciona o piso; o valor parcial da SELIC do mês da consulta entra inteiro. → Task 4 (testes "deflação do IPCA com piso" e "mês corrente parcial") e Task 8 (caso de deflação).

---

## Para o responsável: o que esta fase entrega, o que foi descoberto e as escolhas feitas

Ao fim da fase o motor calcula qualquer prestação ou pagamento nos dois regimes, na transição e na SELIC única, com multa e honorários, e prova isso com 223 testes (eram 101), inclusive 7 casos de referência novos. Continua sem tela: a interface é a fase 5.

Descobertas de 11/10/2026 que moldaram o plano (todas discutidas e decididas com o responsável nesta sessão):

1. **O SAJ Tribunais não tem a taxa legal.** O Cálculo Judicial Avulso (alimentos) oferece IGP-M, IPCA e SELIC como indexadores e juros simples, compostos, SELIC ou poupança, mas nenhuma opção de IPCA + taxa legal: aplica IGP-M e 1% ao mês mesmo depois de 30/08/2024. O padrão do Apura segue a lei (decisão já tomada no design), e o gabarito do regime novo passa a ser a Calculadora do Cidadão do BCB. Os relatórios do SAJ de 2026 viram gabaritos do regime antigo em datas recentes (34 linhas) e da SELIC (7 linhas), todos reproduzidos.
2. **Contagem dos dias da taxa legal.** A Calculadora do Cidadão conta o dia inicial e não conta o dia final (30/09/2024 a 11/10/2026 inclui 30/09 e vai até 10/10). O design descrevia a mesma quantidade de dias com a atribuição invertida ("o dia inicial não conta"); a diferença só aparece quando as pontas caem em meses de taxas diferentes. Adotada a convenção da Calculadora, verificada em 26 consultas feitas pelo navegador integrado (18 na aba Taxa Legal, 7 no IPCA, mais o exemplo oficial): todas bateram.
3. **Precisão integral (ponto 9).** O SAJ multiplica pelo fator e pelo percentual sem arredondar e só imprime 6 casas: em 2 das 42 linhas de 2026 a conta refeita com o número impresso difere em R$ 0,01. Decidido multiplicar com precisão integral, como o SAJ; o teste genérico de casos admite R$ 0,01 nessa conferência e o caso de 2018 continua batendo em todas as linhas.
4. **SELIC única capitalizada (ponto 5).** O SAJ aplica a SELIC como índice composto mês a mês ("Corrigido com Percentual Capitalizado Mensal"), sem juros. Decidido seguir o SAJ: reaproveita o motor de correção, reproduz o relatório 3 e coincide com a Calculadora (que também capitaliza). A soma simples do texto original do design daria cerca de 4 pontos percentuais a menos em dois anos e meio.
5. **Piso na deflação mantido (ponto 12).** O SAJ deixa o corrigido cair abaixo do original (prestação de 06/2026: R$ 486,30 → R$ 484,78). O STJ (REsp 1.265.580/RS) manda considerar os índices negativos, mas prevalece o valor nominal se o cálculo final reduzir o principal: é o padrão `aplicarComPiso`, agora decidido sobre o fator bruto. O caso do SAJ usa `aplicarSemPiso` para reproduzi-lo.
6. **Multa e honorários (ponto 8)** confirmados como no design. Um relatório do SAJ com a aba Honorários preenchida pode entrar depois como caso de referência, sem mudar a regra.
7. **IGP-M de dezembro/2025.** A tabela do TJMS aplica −0,02 e a série 189 do BCB traz −0,01; todos os outros meses de 2024 a 2026 coincidem. O Apura usa o BCB (regra 6); o caso do SAJ congela a tabela do SAJ e registra a divergência. Em prestações que atravessam dez/2025, o Apura e o SAJ diferem em cerca de R$ 0,05 por R$ 500,00.
8. **Totais.** O SAJ soma os valores sem arredondar (imprime 92.892,98 onde as linhas somam 92.892,97). O Apura soma as linhas impressas, para que o relatório feche; o caso registra a diferença.
9. **Pendências da fase 1 resolvidas aqui:** validação única da metodologia (lacunas e sobreposições) com aviso e sem dupla contagem; piso sobre o fator bruto; termos finais próprios limitados à data de elaboração; multa e honorários; ordem numérica das séries e resumo de meses sem índice ordenado; ESLint proibindo `Date`, `fetch`, DOM e armazenamento no motor. O ponto em aberto "lançamento no dia da elaboração rende 1 dia" fica confirmado por coerência com o SAJ de 2026 (a prestação de 01/10/2026 rendeu 11 dias até 11/10, duas pontas) no regime antigo, e vale zero no regime novo (Calculadora).

Escolhas técnicas, dentro do que o design já decidiu:

- **SELIC única sem mudar o modelo de dados.** O período continua com `juros: { tipo: "selicUnica" }` (§5.3); o motor lê isso como "a correção desse período é a série 4390, capitalizada, e não há juros". `correcao.indice` fica `"nenhum"` nesse período. A tela (fase 5) mostra "SELIC única" como uma escolha só.
- **Fator e percentual devolvidos sem arredondar** por `fatorCorrecao` e `jurosSimples`; quem exibe chama `paraTexto(…, 6)`. O parâmetro `casas` sai de `ParametrosCorrecao` (não há mais arredondamento ali) e fica em `ParametrosJuros` só para o detalhe mensal impresso.
- **`jurosSimples` recebe a tabela de índices** (a taxa legal vem dela), como `fatorCorrecao` já recebia os índices mensais.
- **Mês corrente parcial da SELIC** identificado pela competência da data da consulta (`TabelaIndices.consultadoEm`): é o único mês cujo valor publicado é parcial. Entra inteiro, sem rateio (§6.4).
- **Casos do SAJ e da Calculadora em JSON** no formato da fase 1; o teste genérico executa todos. Os valores esperados foram calculados por aritmética decimal independente (Python, módulo `decimal`) e conferidos contra os PDFs do SAJ e contra a Calculadora antes de entrar no plano; o motor TypeScript foi ensaiado fora do repositório e reproduziu todos.

Dependem de internet: Task 1 (`npm run indices:atualizar -- 433 29543 4390`). Todo o resto roda sem rede.

---

## Estrutura de arquivos desta fase

| Arquivo | Responsabilidade |
|---|---|
| `dados/indices/433.json`, `29543.json`, `4390.json` | cópia embutida do IPCA, da taxa legal e da SELIC (geradas pelo script) |
| `src/indices/embutidos.ts` | tabela embutida com as quatro séries |
| `src/motor/testes/regime-novo.ts` | dados de teste: IGP-M, IPCA, taxa legal e SELIC de 2024 a out/2026 como estavam em 11/10/2026; `tabelaRegimeNovo()` e `metodologiaSelicUnica()` |
| `src/compartilhado/datas.ts` | `diaAnterior`, `diaSeguinte` |
| `src/motor/periodos.ts` | ordenação dos períodos, `validarMetodologia`, `dividirPorPeriodos` sem dupla contagem |
| `src/motor/correcao.ts` | SELIC única como índice, mês corrente parcial, fator com precisão integral, piso sobre o fator bruto |
| `src/motor/juros.ts` | taxa legal com a contagem da Calculadora, transição, SELIC única sem juros, percentual com precisão integral |
| `src/motor/calcular.ts` | termos finais limitados, validação da metodologia, multa e honorários, ordem das séries |
| `src/motor/casos.test.ts` | conferência pelos números impressos com tolerância de R$ 0,01 |
| `src/motor/casos/2026-10-11-saj-tjms-alimentos-igpm-2024-2026.json` | gabarito do SAJ: 32 prestações e 2 pagamentos, IGP-M + 1%, 2024–2026 |
| `src/motor/casos/2026-10-11-saj-tjms-selic-capitalizada.json` | gabarito do SAJ: SELIC capitalizada, 7 prestações |
| `src/motor/casos/2026-10-11-calculadora-bcb-regime-novo.json` | regime novo conferido na Calculadora |
| `src/motor/casos/2026-10-11-transicao-lei-14905.json` | transição em 30/08/2024, dia a dia na fronteira |
| `src/motor/casos/2026-09-15-deflacao-com-piso.json` | deflação do IPCA com piso |
| `src/motor/casos/2026-10-11-multa-e-honorarios-art-523.json` | multa e honorários sobre o total devido |
| `src/motor/casos/2026-10-11-encargos-proprios.json` | termos próprios e metodologia própria com três períodos |
| `eslint.config.js` | regra de pureza do motor |
| `docs/superpowers/roteiro.md`, `CLAUDE.md`, design (§7) | fechamento da fase |

## Como executar este plano

- Todos os comandos rodam na raiz do repositório, numa branch de trabalho (`superpowers:using-git-worktrees`). Antes de tudo: `npm install` (precisa de internet).
- Uma tarefa de cada vez, na ordem. Ciclo de cada regra: escrever o teste → rodar e vê-lo falhar → escrever o mínimo que passa → rodar e vê-lo passar → `npm run format && npm run verificar` → commit. Só se commita com tudo verde.
- Os valores esperados vêm dos relatórios do SAJ, da Calculadora do Cidadão e de aritmética decimal independente, e foram reproduzidos num ensaio do código fora do repositório. Se uma implementação não bater, a implementação está errada, não o valor esperado: pare e relate; não ajuste valores para "fazer passar".
- O Prettier pode reformatar o que foi escrito (quebras de linha); o conteúdo não muda. Os arquivos `src/motor/casos/*.json` são ignorados pelo Prettier de propósito.
- Mensagens de commit no formato "módulo: o que muda", com a linha de coautoria do modelo em uso ao final (os comandos já a incluem).

---

### Task 1: Séries embutidas do regime novo (IPCA, taxa legal e SELIC) e dados de teste

**Files:**
- Create: `dados/indices/433.json`, `dados/indices/29543.json`, `dados/indices/4390.json` (gerados pelo script), `src/motor/testes/regime-novo.ts`
- Modify: `src/indices/embutidos.ts`
- Test: `src/indices/embutidos.test.ts` (reescrito)

**Interfaces:**
- Consome: `interpretarRespostaSgs`, `montarArquivoSerie`, `SERIES` (fase 1, tarefas 12 e 13); tipos `TabelaIndices`, `ArquivoSerie`, `CodigoSerie`, `Competencia`, `ValorIndice`, `Metodologia`; `metodologiaPadrao()`.
- Produz:
  - `tabelaEmbutida(): TabelaIndices` passa a trazer as séries `"189"`, `"433"`, `"29543"` e `"4390"`.
  - `tabelaRegimeNovo(limites?: Partial<Record<CodigoSerie, Competencia>>): TabelaIndices` — tabela congelada em 11/10/2026 com as quatro séries (IGP-M e IPCA de jan/2024 a set/2026; taxa legal de ago/2024 a out/2026; SELIC de jan/2024 a out/2026, out/2026 parcial); `limites` corta uma série numa competência.
  - `metodologiaSelicUnica(): Metodologia` — um só período com `juros: { tipo: "selicUnica" }`.
  - As Tasks 3 a 6 usam os dois.

- [ ] **Step 1: Baixar as três séries (precisa de internet)**

Execute: `npm run indices:atualizar -- 433 29543 4390`
Esperado (os últimos meses podem ser mais recentes que estes, conforme a data da execução):

```text
433 (IPCA): 561 meses, último 2026-09 = 0.82
29543 (taxa legal): 27 meses, último 2026-10 = 0.379020
4390 (SELIC): 483 meses, último 2026-10 = 0.36
```

Confira: `dados/indices/29543.json` começa em `"2024-08"` com `"0.605306"` e tem `"2025-03"` com `"0.000000"`; `dados/indices/4390.json` começa em `"1986-08"` com `"2.57"`.

- [ ] **Step 2: Escrever o teste**

Substitua `src/indices/embutidos.test.ts` por:

```ts
import { describe, expect, it } from "vitest";
import type { CasoDeReferencia } from "../compartilhado/tipos.ts";
import { calcular } from "../motor/calcular.ts";
import textoDoCaso from "../motor/casos/2018-05-25-saj-tjms-alimentos.json?raw";
import { tabelaEmbutida } from "./embutidos.ts";

describe("cópia embutida dos índices", () => {
  const tabela = tabelaEmbutida();
  const igpm = tabela.series["189"];

  it("traz o IGP-M desde jun/1989, com os valores usados no caso SAJ 2018", () => {
    expect(igpm?.["1989-06"]?.valor).toBe("19.68");
    expect(igpm?.["2017-01"]?.valor).toBe("0.64");
    expect(igpm?.["2017-04"]?.valor).toBe("-1.10");
    expect(igpm?.["2018-04"]?.valor).toBe("0.57");
    expect(igpm?.["2018-05"]?.valor).toBe("1.38");
    expect(Object.keys(igpm ?? {}).length).toBeGreaterThanOrEqual(440);
  });

  it("traz o IPCA, a taxa legal e a SELIC do regime novo; INPC e salário mínimo ficam para a fase 3", () => {
    expect(tabela.series["433"]?.["1980-01"]?.valor).toBe("6.62");
    expect(tabela.series["433"]?.["2024-08"]?.valor).toBe("-0.02");
    expect(tabela.series["29543"]?.["2024-08"]?.valor).toBe("0.605306");
    expect(tabela.series["29543"]?.["2025-03"]?.valor).toBe("0.000000");
    expect(tabela.series["4390"]?.["1986-08"]?.valor).toBe("2.57");
    expect(tabela.series["4390"]?.["2024-03"]?.valor).toBe("0.83");
    expect(tabela.series["188"]).toBeUndefined();
    expect(tabela.series["1619"]).toBeUndefined();
  });

  it("marca a proveniência de cada valor; a data da consulta é a obtenção mais recente", () => {
    expect(tabela.consultadoEm).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    for (const serie of ["189", "433", "29543", "4390"] as const) {
      const valores = Object.values(tabela.series[serie] ?? {});
      expect(valores.length).toBeGreaterThan(0);
      for (const v of valores) {
        expect(v.fonte).toBe("embutida");
        expect(v.obtidoEm <= tabela.consultadoEm).toBe(true);
      }
    }
  });

  it("limitada a abr/2018, reproduz o total do caso SAJ 2018 (os dados embutidos batem com o relatório)", () => {
    const caso = JSON.parse(textoDoCaso) as CasoDeReferencia;
    const ateAbril = Object.fromEntries(
      Object.entries(igpm ?? {}).filter(([competencia]) => competencia <= "2018-04"),
    );
    const resultado = calcular(caso.calculo, {
      consultadoEm: tabela.consultadoEm,
      series: { "189": ateAbril },
    });
    expect(resultado.totais).toEqual(caso.esperado.totais);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Execute: `npm test`
Esperado: falham "traz o IPCA, a taxa legal e a SELIC…" (`tabela.series["433"]` é `undefined`) e "marca a proveniência…".

- [ ] **Step 4: Implementar `src/indices/embutidos.ts`**

```ts
import type {
  ArquivoSerie,
  CodigoSerie,
  Competencia,
  TabelaIndices,
  ValorIndice,
} from "../compartilhado/tipos.ts";
import ipca from "../../dados/indices/433.json" with { type: "json" };
import igpm from "../../dados/indices/189.json" with { type: "json" };
import taxaLegal from "../../dados/indices/29543.json" with { type: "json" };
import selic from "../../dados/indices/4390.json" with { type: "json" };

/** Séries com cópia embutida; INPC (188) e salário mínimo (1619) entram na fase 3. */
const ARQUIVOS: Partial<Record<CodigoSerie, ArquivoSerie>> = {
  "433": ipca as ArquivoSerie,
  "189": igpm as ArquivoSerie,
  "29543": taxaLegal as ArquivoSerie,
  "4390": selic as ArquivoSerie,
};

/**
 * Tabela de índices montada só com a cópia embutida (sem rede). `consultadoEm` é a data de
 * obtenção mais recente entre os arquivos. A fase 4 parte daqui para cache e busca ao vivo.
 */
export function tabelaEmbutida(): TabelaIndices {
  const series: TabelaIndices["series"] = {};
  let consultadoEm = "";
  for (const arquivo of Object.values(ARQUIVOS)) {
    if (!arquivo) continue;
    const valores: Record<Competencia, ValorIndice> = {};
    for (const { competencia, valor } of arquivo.valores) {
      valores[competencia] = { valor, fonte: "embutida", obtidoEm: arquivo.obtidoEm };
    }
    series[arquivo.codigo] = valores;
    if (arquivo.obtidoEm > consultadoEm) consultadoEm = arquivo.obtidoEm;
  }
  return { consultadoEm, series };
}
```

- [ ] **Step 5: Rodar e ver passar**

Execute: `npm test`
Esperado: todos passam.

- [ ] **Step 6: Criar os dados de teste do regime novo em `src/motor/testes/regime-novo.ts`**

Valores das séries do BCB como estavam em 11/10/2026 (fixos: não os troque pelos de um download posterior; os casos e testes dependem deles).

```ts
import type {
  CodigoSerie,
  Competencia,
  Metodologia,
  TabelaIndices,
  ValorIndice,
} from "../../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../../metodologias/padrao.ts";

/**
 * Séries do BCB como estavam em 11/10/2026: IGP-M (189) e IPCA (433) de jan/2024 a set/2026, taxa
 * legal (29543) de ago/2024 a out/2026 e SELIC (4390) de jan/2024 a out/2026, cujo valor de out/2026
 * é o acumulado parcial do mês corrente. Fonte: dados/indices/*.json baixados em 11/10/2026.
 */
export const REGIME_NOVO: Record<CodigoSerie, Record<Competencia, string>> = {
  // IGP-M
  "189": {
    "2024-01": "0.07",
    "2024-02": "-0.52",
    "2024-03": "-0.47",
    "2024-04": "0.31",
    "2024-05": "0.89",
    "2024-06": "0.81",
    "2024-07": "0.61",
    "2024-08": "0.29",
    "2024-09": "0.62",
    "2024-10": "1.52",
    "2024-11": "1.30",
    "2024-12": "0.94",
    "2025-01": "0.27",
    "2025-02": "1.06",
    "2025-03": "-0.34",
    "2025-04": "0.24",
    "2025-05": "-0.49",
    "2025-06": "-1.67",
    "2025-07": "-0.77",
    "2025-08": "0.36",
    "2025-09": "0.42",
    "2025-10": "-0.36",
    "2025-11": "0.27",
    "2025-12": "-0.01",
    "2026-01": "0.41",
    "2026-02": "-0.73",
    "2026-03": "0.52",
    "2026-04": "2.73",
    "2026-05": "0.84",
    "2026-06": "-0.50",
    "2026-07": "-1.16",
    "2026-08": "-0.22",
    "2026-09": "1.57",
  },
  // IPCA
  "433": {
    "2024-01": "0.42",
    "2024-02": "0.83",
    "2024-03": "0.16",
    "2024-04": "0.38",
    "2024-05": "0.46",
    "2024-06": "0.21",
    "2024-07": "0.38",
    "2024-08": "-0.02",
    "2024-09": "0.44",
    "2024-10": "0.56",
    "2024-11": "0.39",
    "2024-12": "0.52",
    "2025-01": "0.16",
    "2025-02": "1.31",
    "2025-03": "0.56",
    "2025-04": "0.43",
    "2025-05": "0.26",
    "2025-06": "0.24",
    "2025-07": "0.26",
    "2025-08": "-0.11",
    "2025-09": "0.48",
    "2025-10": "0.09",
    "2025-11": "0.18",
    "2025-12": "0.33",
    "2026-01": "0.33",
    "2026-02": "0.70",
    "2026-03": "0.88",
    "2026-04": "0.67",
    "2026-05": "0.58",
    "2026-06": "0.16",
    "2026-07": "0.07",
    "2026-08": "-0.32",
    "2026-09": "0.82",
  },
  // taxa legal
  "29543": {
    "2024-08": "0.605306",
    "2024-09": "0.676227",
    "2024-10": "0.704241",
    "2024-11": "0.385874",
    "2024-12": "0.171924",
    "2025-01": "0.589427",
    "2025-02": "0.902209",
    "2025-03": "0.000000",
    "2025-04": "0.321969",
    "2025-05": "0.623200",
    "2025-06": "0.775982",
    "2025-07": "0.834880",
    "2025-08": "0.942622",
    "2025-09": "1.305984",
    "2025-10": "0.736394",
    "2025-11": "1.093764",
    "2025-12": "0.851001",
    "2026-01": "0.967510",
    "2026-02": "0.962232",
    "2026-03": "0.155714",
    "2026-04": "0.768672",
    "2026-05": "0.198293",
    "2026-06": "0.450641",
    "2026-07": "0.706607",
    "2026-08": "1.154527",
    "2026-09": "1.499119",
    "2026-10": "0.379020",
  },
  // SELIC (mês corrente parcial em out/2026)
  "4390": {
    "2024-01": "0.97",
    "2024-02": "0.80",
    "2024-03": "0.83",
    "2024-04": "0.89",
    "2024-05": "0.83",
    "2024-06": "0.79",
    "2024-07": "0.91",
    "2024-08": "0.87",
    "2024-09": "0.84",
    "2024-10": "0.93",
    "2024-11": "0.79",
    "2024-12": "0.93",
    "2025-01": "1.01",
    "2025-02": "0.99",
    "2025-03": "0.96",
    "2025-04": "1.06",
    "2025-05": "1.14",
    "2025-06": "1.10",
    "2025-07": "1.28",
    "2025-08": "1.16",
    "2025-09": "1.22",
    "2025-10": "1.28",
    "2025-11": "1.05",
    "2025-12": "1.22",
    "2026-01": "1.16",
    "2026-02": "1.00",
    "2026-03": "1.21",
    "2026-04": "1.09",
    "2026-05": "1.07",
    "2026-06": "1.12",
    "2026-07": "1.22",
    "2026-08": "1.09",
    "2026-09": "1.08",
    "2026-10": "0.36",
  },
  "188": {},
  "1619": {},
};

/**
 * Tabela congelada em 11/10/2026 com as quatro séries. `limites` corta uma série numa competência
 * (ex.: `{ "4390": "2026-08" }` reproduz a tabela do SAJ, que ia até ago/2026).
 */
export function tabelaRegimeNovo(
  limites: Partial<Record<CodigoSerie, Competencia>> = {},
): TabelaIndices {
  const series: TabelaIndices["series"] = {};
  for (const [codigo, valores] of Object.entries(REGIME_NOVO) as Array<
    [CodigoSerie, Record<Competencia, string>]
  >) {
    if (Object.keys(valores).length === 0) continue;
    const limite = limites[codigo];
    const tabela: Record<Competencia, ValorIndice> = {};
    for (const [competencia, valor] of Object.entries(valores)) {
      if (limite === undefined || competencia <= limite) {
        tabela[competencia] = { valor, fonte: "embutida", obtidoEm: "2026-10-11T12:00:00.000Z" };
      }
    }
    series[codigo] = tabela;
  }
  return { consultadoEm: "2026-10-11T12:00:00.000Z", series };
}

/** Metodologia de um só período com SELIC única (Tema 1.368 do STJ): a SELIC capitalizada faz as vezes de correção e de juros. */
export function metodologiaSelicUnica(): Metodologia {
  return {
    ...metodologiaPadrao(),
    ajustada: true,
    periodos: [
      { de: null, ate: null, correcao: { indice: "nenhum" }, juros: { tipo: "selicUnica" } },
    ],
  };
}
```

- [ ] **Step 7: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add dados/indices src/indices/embutidos.ts src/indices/embutidos.test.ts src/motor/testes/regime-novo.ts && git commit -m "índices: cópia embutida do IPCA, da taxa legal e da SELIC e dados de teste do regime novo" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: Datas: dia anterior e dia seguinte

**Files:**
- Modify: `src/compartilhado/datas.ts`
- Test: `src/compartilhado/datas.test.ts`

**Interfaces:**
- Consome: `decompor`, `compor`, `diasDoMes` (fase 1).
- Produz: `diaAnterior(data: DataISO): DataISO` e `diaSeguinte(data: DataISO): DataISO`, usados pelas Tasks 3 e 5.

- [ ] **Step 1: Escrever o teste**

Em `src/compartilhado/datas.test.ts`, acrescente `diaAnterior,` (depois de `decompor,`) e `diaSeguinte,` (depois de `diasEntre,`) à lista importada de `./datas.ts`, e, antes do `});` que fecha o `describe("datas", …)`, acrescente:

```ts
  it("anda um dia para trás e para a frente, inclusive na virada de mês e de ano", () => {
    expect(diaAnterior("2026-10-11")).toBe("2026-10-10");
    expect(diaAnterior("2026-10-01")).toBe("2026-09-30");
    expect(diaAnterior("2024-03-01")).toBe("2024-02-29");
    expect(diaAnterior("2025-01-01")).toBe("2024-12-31");
    expect(diaSeguinte("2024-02-29")).toBe("2024-03-01");
    expect(diaSeguinte("2024-12-31")).toBe("2025-01-01");
    expect(diaSeguinte("2024-08-29")).toBe("2024-08-30");
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Execute: `npm test`
Esperado: erro de importação (`diaAnterior` não existe em `./datas.ts`).

- [ ] **Step 3: Implementar**

Acrescente ao fim de `src/compartilhado/datas.ts`:

```ts
/** Dia anterior: "2026-10-01" → "2026-09-30". */
export function diaAnterior(data: DataISO): DataISO {
  const { ano, mes, dia } = decompor(data);
  if (dia > 1) return compor(ano, mes, dia - 1);
  const anoAnterior = mes === 1 ? ano - 1 : ano;
  const mesAnterior = mes === 1 ? 12 : mes - 1;
  return compor(anoAnterior, mesAnterior, diasDoMes(anoAnterior, mesAnterior));
}

/** Dia seguinte: "2024-02-29" → "2024-03-01". */
export function diaSeguinte(data: DataISO): DataISO {
  const { ano, mes, dia } = decompor(data);
  if (dia < diasDoMes(ano, mes)) return compor(ano, mes, dia + 1);
  return mes === 12 ? compor(ano + 1, 1, 1) : compor(ano, mes + 1, 1);
}
```

- [ ] **Step 4: Rodar e ver passar**

Execute: `npm test`
Esperado: todos passam.

- [ ] **Step 5: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add src/compartilhado/datas.ts src/compartilhado/datas.test.ts && git commit -m "compartilhado: dia anterior e dia seguinte" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: Períodos da metodologia: ordenação, validação de lacunas e sobreposições, divisão sem dupla contagem

**Files:**
- Modify: `src/motor/periodos.ts` (reescrito)
- Test: `src/motor/periodos.test.ts`

**Interfaces:**
- Consome: `diaAnterior`, `diaSeguinte` (Task 2); `formatarData` (fase 1); tipos `Metodologia`, `PeriodoMetodologia`, `DataISO`.
- Produz:
  - `periodosOrdenados(metodologia): PeriodoMetodologia[]` — ordem cronológica, início aberto primeiro.
  - `periodoVigenteEm(metodologia, data)` — o primeiro período, em ordem cronológica, que contém a data (sobreposição: vence o que começa antes).
  - `validarMetodologia(metodologia): string[]` — avisos em frases completas: sem períodos; datas anteriores ao primeiro `de`; lacuna entre períodos; sobreposição; datas posteriores ao último `ate`. Lista vazia para a metodologia padrão.
  - `dividirPorPeriodos(metodologia, de, ate): TrechoDePeriodo[]` — mesma assinatura da fase 1, agora com um cursor que impede contar dia duas vezes.

- [ ] **Step 1: Escrever os testes**

Em `src/motor/periodos.test.ts`, troque a importação de `./periodos.ts` por `import { dividirPorPeriodos, periodoVigenteEm, validarMetodologia } from "./periodos.ts";` e, antes do `});` final do `describe`, acrescente:

```ts
  it("a metodologia padrão é contínua: nenhum aviso", () => {
    expect(validarMetodologia(padrao)).toEqual([]);
  });

  it("avisa lacuna entre períodos, e os dias da lacuna ficam fora dos trechos", () => {
    const comLacuna: Metodologia = {
      ...padrao,
      periodos: [
        {
          de: null,
          ate: "2020-12-31",
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "1" },
        },
        { de: "2021-02-01", ate: null, correcao: { indice: "IPCA" }, juros: { tipo: "taxaLegal" } },
      ],
    };
    expect(validarMetodologia(comLacuna)).toEqual([
      "A metodologia não cobre o período de 01/01/2021 a 31/01/2021: esses dias ficam sem correção e sem juros.",
    ]);
    expect(
      dividirPorPeriodos(comLacuna, "2020-12-10", "2021-02-10").map((t) => [t.de, t.ate]),
    ).toEqual([
      ["2020-12-10", "2020-12-31"],
      ["2021-02-01", "2021-02-10"],
    ]);
  });

  it("avisa sobreposição; o período iniciado antes fica com os dias comuns, sem contar dia duas vezes", () => {
    const sobrepostos: Metodologia = {
      ...padrao,
      periodos: [
        { de: "2021-01-01", ate: null, correcao: { indice: "IPCA" }, juros: { tipo: "taxaLegal" } },
        {
          de: null,
          ate: "2021-01-31",
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "1" },
        },
      ],
    };
    expect(validarMetodologia(sobrepostos)).toEqual([
      "Os períodos se sobrepõem de 01/01/2021 a 31/01/2021: nesses dias prevaleceu o período iniciado antes.",
    ]);
    expect(periodoVigenteEm(sobrepostos, "2021-01-15")?.correcao.indice).toBe("IGP-M");
    expect(
      dividirPorPeriodos(sobrepostos, "2020-12-10", "2021-02-10").map((t) => [
        t.de,
        t.ate,
        t.periodo.correcao.indice,
      ]),
    ).toEqual([
      ["2020-12-10", "2021-01-31", "IGP-M"],
      ["2021-02-01", "2021-02-10", "IPCA"],
    ]);
  });

  it("avisa extremos descobertos e metodologia sem períodos", () => {
    const fechada: Metodologia = {
      ...padrao,
      periodos: [
        {
          de: "2020-01-01",
          ate: "2020-12-31",
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "1" },
        },
      ],
    };
    expect(validarMetodologia(fechada)).toEqual([
      "A metodologia não cobre datas anteriores a 01/01/2020: esses dias ficam sem correção e sem juros.",
      "A metodologia não cobre datas posteriores a 31/12/2020: esses dias ficam sem correção e sem juros.",
    ]);
    expect(validarMetodologia({ ...padrao, periodos: [] })).toEqual([
      "A metodologia não tem períodos: nenhum lançamento recebe correção nem juros.",
    ]);
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Execute: `npm test`
Esperado: erro de importação (`validarMetodologia` não existe).

- [ ] **Step 3: Reescrever `src/motor/periodos.ts`**

```ts
import { diaAnterior, diaSeguinte } from "../compartilhado/datas.ts";
import { formatarData } from "../compartilhado/formatacao.ts";
import type { DataISO, Metodologia, PeriodoMetodologia } from "../compartilhado/tipos.ts";

/** Os períodos em ordem cronológica (o de início aberto vem primeiro). */
export function periodosOrdenados(metodologia: Metodologia): PeriodoMetodologia[] {
  return [...metodologia.periodos].sort((a, b) => {
    if (a.de === b.de) return 0;
    if (a.de === null) return -1;
    if (b.de === null) return 1;
    return a.de < b.de ? -1 : 1;
  });
}

/** O primeiro período, em ordem cronológica, cujo intervalo [de, ate] (nulos = aberto) contém a data. */
export function periodoVigenteEm(
  metodologia: Metodologia,
  data: DataISO,
): PeriodoMetodologia | undefined {
  return periodosOrdenados(metodologia).find(
    (periodo) =>
      (periodo.de === null || periodo.de <= data) && (periodo.ate === null || data <= periodo.ate),
  );
}

/**
 * Avisos sobre a cobertura dos períodos (§6.5): dias que nenhum período cobre ficam sem correção
 * e sem juros; dias cobertos por dois períodos seguem o que começa antes. Lista vazia = metodologia
 * contínua, do início aberto ao fim aberto.
 */
export function validarMetodologia(metodologia: Metodologia): string[] {
  const avisos: string[] = [];
  const periodos = periodosOrdenados(metodologia);
  const primeiro = periodos[0];
  if (primeiro === undefined) {
    return ["A metodologia não tem períodos: nenhum lançamento recebe correção nem juros."];
  }
  if (primeiro.de !== null) {
    avisos.push(
      `A metodologia não cobre datas anteriores a ${formatarData(primeiro.de)}: esses dias ficam sem correção e sem juros.`,
    );
  }
  for (let i = 1; i < periodos.length; i++) {
    const anterior = periodos[i - 1];
    const atual = periodos[i];
    if (anterior === undefined || atual === undefined || atual.de === null) continue;
    if (anterior.ate === null || atual.de <= anterior.ate) {
      const fim =
        anterior.ate !== null && (atual.ate === null || anterior.ate < atual.ate)
          ? anterior.ate
          : atual.ate;
      avisos.push(
        `Os períodos se sobrepõem de ${formatarData(atual.de)} a ${fim === null ? "o fim" : formatarData(fim)}: nesses dias prevaleceu o período iniciado antes.`,
      );
    } else if (atual.de > diaSeguinte(anterior.ate)) {
      avisos.push(
        `A metodologia não cobre o período de ${formatarData(diaSeguinte(anterior.ate))} a ${formatarData(diaAnterior(atual.de))}: esses dias ficam sem correção e sem juros.`,
      );
    }
  }
  const ultimo = periodos[periodos.length - 1];
  if (ultimo !== undefined && ultimo.ate !== null) {
    avisos.push(
      `A metodologia não cobre datas posteriores a ${formatarData(ultimo.ate)}: esses dias ficam sem correção e sem juros.`,
    );
  }
  return avisos;
}

export interface TrechoDePeriodo {
  periodo: PeriodoMetodologia;
  de: DataISO;
  ate: DataISO;
}

/**
 * Recorta o intervalo [de, ate] pelos períodos da metodologia, em ordem cronológica, sem contar
 * dia algum duas vezes: quando dois períodos se sobrepõem, o que começa antes fica com os dias
 * comuns. Dias que nenhum período cobre ficam de fora (`validarMetodologia` avisa). Vazio se
 * `ate` < `de`.
 */
export function dividirPorPeriodos(
  metodologia: Metodologia,
  de: DataISO,
  ate: DataISO,
): TrechoDePeriodo[] {
  const trechos: TrechoDePeriodo[] = [];
  if (ate < de) return trechos;
  let cursor = de;
  for (const periodo of periodosOrdenados(metodologia)) {
    const inicio = periodo.de !== null && periodo.de > cursor ? periodo.de : cursor;
    const fim = periodo.ate !== null && periodo.ate < ate ? periodo.ate : ate;
    if (inicio > fim) continue;
    trechos.push({ periodo, de: inicio, ate: fim });
    if (fim === ate) break;
    cursor = diaSeguinte(fim);
  }
  return trechos;
}
```

- [ ] **Step 4: Rodar e ver passar**

Execute: `npm test`
Esperado: todos passam, inclusive os quatro testes antigos de períodos.

- [ ] **Step 5: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add src/motor/periodos.ts src/motor/periodos.test.ts && git commit -m "motor: validação da metodologia e divisão por períodos sem dupla contagem" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4: Correção: SELIC única como índice capitalizado, mês corrente parcial, precisão integral e piso sobre o fator bruto

**Files:**
- Modify: `src/motor/correcao.ts` (reescrito), `src/motor/calcular.ts` (uma linha)
- Test: `src/motor/correcao.test.ts`

**Interfaces:**
- Consome: `periodoVigenteEm` (Task 3); `tabelaRegimeNovo`, `metodologiaSelicUnica` (Task 1); `CODIGO_DA_SERIE`, tipos (fase 1).
- Produz:
  - `interface IndiceMensal { competencia; serie: CodigoSerie | null; valor: TextoDecimal | null; parcial?: boolean }` — `parcial` só aparece (e vale `true`) no mês da consulta da série 4390.
  - `resolverIndicesMensais(metodologia, tabela, de, ate): IndiceMensal[]` — série nula quando nenhum período cobre o mês ou o período não tem correção; série `"4390"` em período de `selicUnica`.
  - `interface ParametrosCorrecao { termoInicial; termoFinal; indices: IndiceMensal[]; incidenciaMesInicial; deflacao }` — **sem** `casas`.
  - `interface ResultadoCorrecao { fator: Decimal; indices: IndiceAplicado[]; pisoAplicado: boolean; mesesSemIndice: Competencia[] }` — `fator` com precisão integral (quem exibe arredonda); `UM` quando o piso atua.
  - `fatorCorrecao(p): ResultadoCorrecao` — regras da fase 1 mais: mês `parcial` entra inteiro; piso decidido sobre o fator bruto.

- [ ] **Step 1: Escrever os testes**

Em `src/motor/correcao.test.ts`: (a) depois de `import { tabelaIgpm } from "./testes/indices-igpm-2017-2018.ts";` acrescente `import { metodologiaSelicUnica, tabelaRegimeNovo } from "./testes/regime-novo.ts";`; (b) troque a linha `const opcoes = { incidenciaMesInicial: "proRata", deflacao: "aplicarComPiso", casas: 6 } as const;` por `const opcoes = { incidenciaMesInicial: "proRata", deflacao: "aplicarComPiso" } as const;`; (c) substitua o `});` que fecha o `describe("fatorCorrecao", …)` (última linha do arquivo) por:

```ts
  it("devolve o fator com precisão integral: a conta usa todas as casas e só a exibição arredonda", () => {
    const r = fatorCorrecao({
      ...opcoes,
      termoInicial: "2017-01-10",
      termoFinal: "2018-05-25",
      indices: indicesDe("2017-01", "2018-05"),
    });
    expect(r.fator.decimalPlaces()).toBeGreaterThan(6);
    expect(paraTexto(r.fator, 6)).toBe("1.013020");
  });

  it("o piso decide sobre o fator bruto: 0,9999 × 1,0001 fica abaixo de 1 e é elevado a 1", () => {
    const indices = [
      { competencia: "2016-12", serie: "189" as const, valor: "0.50" },
      { competencia: "2017-01", serie: "189" as const, valor: "-0.01" },
      { competencia: "2017-02", serie: "189" as const, valor: "0.01" },
    ];
    const termos = { termoInicial: "2016-12-31", termoFinal: "2017-02-28" } as const;
    const comPiso = fatorCorrecao({ ...opcoes, ...termos, indices });
    expect(comPiso.pisoAplicado).toBe(true);
    expect(paraTexto(comPiso.fator, 8)).toBe("1.00000000");
    const semPiso = fatorCorrecao({ ...opcoes, ...termos, deflacao: "aplicarSemPiso", indices });
    expect(semPiso.pisoAplicado).toBe(false);
    expect(paraTexto(semPiso.fator, 8)).toBe("0.99999999");
  });
});

describe("regime novo e SELIC única", () => {
  const opcoes = { incidenciaMesInicial: "proRata", deflacao: "aplicarComPiso" } as const;

  it("usa o IGP-M até ago/2024 e o IPCA desde set/2024, pelo período vigente no dia 1 do mês", () => {
    expect(
      resolverIndicesMensais(metodologiaPadrao(), tabelaRegimeNovo(), "2024-07", "2024-10"),
    ).toEqual([
      { competencia: "2024-07", serie: "189", valor: "0.61" },
      { competencia: "2024-08", serie: "189", valor: "0.29" },
      { competencia: "2024-09", serie: "433", valor: "0.44" },
      { competencia: "2024-10", serie: "433", valor: "0.56" },
    ]);
  });

  it("num período de SELIC única a correção é a própria SELIC (série 4390); o mês da consulta é parcial", () => {
    expect(
      resolverIndicesMensais(metodologiaSelicUnica(), tabelaRegimeNovo(), "2026-08", "2026-10"),
    ).toEqual([
      { competencia: "2026-08", serie: "4390", valor: "1.09" },
      { competencia: "2026-09", serie: "4390", valor: "1.08" },
      { competencia: "2026-10", serie: "4390", valor: "0.36", parcial: true },
    ]);
  });

  it("mês sem período vigente fica sem série", () => {
    const soAte2020: Metodologia = {
      ...metodologiaPadrao(),
      periodos: [
        {
          de: null,
          ate: "2020-12-31",
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "1" },
        },
      ],
    };
    expect(resolverIndicesMensais(soAte2020, tabelaRegimeNovo(), "2024-01", "2024-01")).toEqual([
      { competencia: "2024-01", serie: null, valor: null },
    ]);
  });

  it("o mês corrente parcial da SELIC entra inteiro, sem rateio: 01/09/2024 → 11/10/2026 = 1,312387", () => {
    const r = fatorCorrecao({
      ...opcoes,
      termoInicial: "2024-09-01",
      termoFinal: "2026-10-11",
      indices: resolverIndicesMensais(
        metodologiaSelicUnica(),
        tabelaRegimeNovo(),
        "2024-09",
        "2026-10",
      ),
    });
    expect(paraTexto(r.fator, 6)).toBe("1.312387");
    expect(r.indices[0]).toEqual({
      serie: "4390",
      competencia: "2024-09",
      valor: "0.84",
      fracao: "29/30",
    });
    expect(r.indices.at(-1)).toEqual({
      serie: "4390",
      competencia: "2026-10",
      valor: "0.36",
      fracao: "1",
    });
    expect(r.mesesSemIndice).toEqual([]);
  });

  it("reproduz o SAJ na SELIC capitalizada: 10/03/2024 → 11/10/2026 com a tabela até ago/2026 = 1,358127", () => {
    const r = fatorCorrecao({
      ...opcoes,
      termoInicial: "2024-03-10",
      termoFinal: "2026-10-11",
      indices: resolverIndicesMensais(
        metodologiaSelicUnica(),
        tabelaRegimeNovo({ "4390": "2026-08" }),
        "2024-03",
        "2026-10",
      ),
    });
    expect(paraTexto(r.fator, 6)).toBe("1.358127");
    expect(r.mesesSemIndice).toEqual(["2026-09", "2026-10"]);
  });

  it("deflação do IPCA com piso: 31/07/2026 → 15/09/2026 com ago/2026 = −0,32 e set/2026 ainda sem índice", () => {
    const tabela = tabelaRegimeNovo({ "433": "2026-08" });
    const indices = resolverIndicesMensais(metodologiaPadrao(), tabela, "2026-07", "2026-09");
    const termos = { termoInicial: "2026-07-31", termoFinal: "2026-09-15" } as const;
    const comPiso = fatorCorrecao({ ...opcoes, ...termos, indices });
    expect(paraTexto(comPiso.fator, 6)).toBe("1.000000");
    expect(comPiso.pisoAplicado).toBe(true);
    expect(comPiso.mesesSemIndice).toEqual(["2026-09"]);
    const semPiso = fatorCorrecao({ ...opcoes, ...termos, deflacao: "aplicarSemPiso", indices });
    expect(paraTexto(semPiso.fator, 6)).toBe("0.996800");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Execute: `npm test`
Esperado: falham "o piso decide sobre o fator bruto" (`pisoAplicado` falso), "num período de SELIC única…" (série nula), "o mês corrente parcial…" e "reproduz o SAJ na SELIC capitalizada" (fator 1,000000), "deflação do IPCA com piso" e "mês sem período vigente" (o período padrão cobre 2024).

- [ ] **Step 3: Reescrever `src/motor/correcao.ts`**

```ts
import {
  competenciaDe,
  competenciasEntre,
  decompor,
  decomporCompetencia,
  diasDoMes,
  primeiroDiaDoMes,
} from "../compartilhado/datas.ts";
import { CEM, decimal, UM, ZERO, type Decimal } from "../compartilhado/decimal.ts";
import { CODIGO_DA_SERIE } from "../compartilhado/tipos.ts";
import type {
  CodigoSerie,
  Competencia,
  DataISO,
  IndiceAplicado,
  Metodologia,
  TabelaIndices,
  TextoDecimal,
} from "../compartilhado/tipos.ts";
import { periodoVigenteEm } from "./periodos.ts";

export interface IndiceMensal {
  competencia: Competencia;
  /** nula quando o período vigente não tem correção ("nenhum") ou nenhum período cobre o mês */
  serie: CodigoSerie | null;
  /** nulo quando a tabela não tem o mês (ainda não divulgado ou faltante) */
  valor: TextoDecimal | null;
  /** SELIC do mês da consulta: valor acumulado só até o último dia útil publicado (§6.4) */
  parcial?: boolean;
}

/**
 * Para cada mês de `de` a `ate`, qual série e valor se aplicam: a série vem do período da
 * metodologia vigente no dia 1 do mês (§6.4, itens 4 e 8); o valor vem da tabela congelada.
 * Num período de SELIC única a correção é a própria SELIC (série 4390), capitalizada mês a mês.
 */
export function resolverIndicesMensais(
  metodologia: Metodologia,
  tabela: TabelaIndices,
  de: Competencia,
  ate: Competencia,
): IndiceMensal[] {
  const mesDaConsulta = competenciaDe(tabela.consultadoEm);
  return competenciasEntre(de, ate).map((competencia) => {
    const periodo = periodoVigenteEm(metodologia, primeiroDiaDoMes(competencia));
    if (periodo === undefined) return { competencia, serie: null, valor: null };
    let serie: CodigoSerie | null;
    if (periodo.juros.tipo === "selicUnica") serie = CODIGO_DA_SERIE.SELIC;
    else if (periodo.correcao.indice === "nenhum") serie = null;
    else serie = CODIGO_DA_SERIE[periodo.correcao.indice];
    if (serie === null) return { competencia, serie: null, valor: null };
    const valor = tabela.series[serie]?.[competencia]?.valor ?? null;
    if (serie === CODIGO_DA_SERIE.SELIC && valor !== null && competencia === mesDaConsulta) {
      return { competencia, serie, valor, parcial: true };
    }
    return { competencia, serie, valor };
  });
}

export interface ParametrosCorrecao {
  termoInicial: DataISO;
  termoFinal: DataISO;
  /** um item por mês, do mês do termo inicial ao mês do termo final */
  indices: IndiceMensal[];
  incidenciaMesInicial: Metodologia["incidenciaMesInicial"];
  deflacao: Metodologia["deflacao"];
}

export interface ResultadoCorrecao {
  /** fator com precisão integral (arredonde só para exibir); igual a 1 quando o piso atua */
  fator: Decimal;
  indices: IndiceAplicado[];
  pisoAplicado: boolean;
  /** competências com série definida, sem valor na tabela e com fração maior que zero */
  mesesSemIndice: Competencia[];
}

/**
 * Fator de correção (§6.4): pro rata geométrico no mês do termo inicial, meses inteiros,
 * pro rata no mês do termo final quando o índice dele existe, meses sem índice com fator 1
 * (listados em `mesesSemIndice` só quando a fração deles é maior que zero), mês corrente parcial
 * da SELIC inteiro, deflação conforme a opção. Fator 1 quando o termo final é anterior ao inicial.
 */
export function fatorCorrecao(p: ParametrosCorrecao): ResultadoCorrecao {
  const indices: IndiceAplicado[] = [];
  const mesesSemIndice: Competencia[] = [];
  if (p.termoFinal < p.termoInicial)
    return { fator: UM, indices, pisoAplicado: false, mesesSemIndice };
  const inicio = decompor(p.termoInicial);
  const fim = decompor(p.termoFinal);
  const competenciaInicial = competenciaDe(p.termoInicial);
  const competenciaFinal = competenciaDe(p.termoFinal);
  let fator = UM;

  for (const mes of p.indices) {
    if (mes.competencia < competenciaInicial || mes.competencia > competenciaFinal) continue;
    const { ano, mes: numeroDoMes } = decomporCompetencia(mes.competencia);
    const dias = diasDoMes(ano, numeroDoMes);
    const ehInicial = mes.competencia === competenciaInicial;
    const ehFinal = mes.competencia === competenciaFinal;

    // Quantos "dias do mês" entram na conta: a fração do mês é numerador ÷ dias.
    let numerador: number;
    if (ehInicial && p.incidenciaMesInicial === "mesSeguinte") numerador = 0;
    else if (ehInicial && ehFinal) numerador = fim.dia - inicio.dia;
    else if (ehInicial) numerador = dias - inicio.dia;
    else if (ehFinal) numerador = fim.dia;
    else numerador = dias;
    // O valor parcial do mês corrente da SELIC já é "até hoje": entra inteiro, sem rateio.
    if (mes.parcial === true && numerador > 0) numerador = dias;

    indices.push({
      serie: mes.serie,
      competencia: mes.competencia,
      valor: mes.valor,
      fracao: numerador === dias ? "1" : `${numerador}/${dias}`,
    });
    // Só avisa quando o mês entra na conta: com fração zero, a falta do índice não muda o fator.
    if (mes.serie !== null && mes.valor === null && numerador > 0) {
      mesesSemIndice.push(mes.competencia);
    }
    if (mes.valor === null || numerador === 0) continue;

    let variacao = decimal(mes.valor);
    if (p.deflacao === "zerarNegativos" && variacao.isNegative()) variacao = ZERO;
    const fatorDoMes = UM.plus(variacao.div(CEM));
    fator = fator.times(
      numerador === dias ? fatorDoMes : fatorDoMes.pow(decimal(String(numerador)).div(dias)),
    );
  }

  // Piso (§6.4, item 5; STJ, REsp 1.265.580/RS): o corrigido nunca fica abaixo do original.
  if (p.deflacao === "aplicarComPiso" && fator.lt(UM)) {
    return { fator: UM, indices, pisoAplicado: true, mesesSemIndice };
  }
  return { fator, indices, pisoAplicado: false, mesesSemIndice };
}
```

- [ ] **Step 4: Ajustar `src/motor/calcular.ts` à nova assinatura**

Na chamada de `fatorCorrecao` em `atualizarLancamento`, remova a linha `casas: fatorCasas,` (o fator agora vem sem arredondar e `paraTexto(correcao.fator, fatorCasas)` continua arredondando só para exibir). A chamada fica:

```ts
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
```

- [ ] **Step 5: Rodar e ver passar**

Execute: `npm test`
Esperado: todos passam, inclusive o caso SAJ 2018 (as 28 linhas batem com precisão integral) e todos os testes antigos de correção.

- [ ] **Step 6: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add src/motor/correcao.ts src/motor/correcao.test.ts src/motor/calcular.ts && git commit -m "motor: correção com precisão integral, SELIC capitalizada e mês corrente parcial" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5: Juros: taxa legal com a contagem da Calculadora do BCB, transição em 30/08/2024 e SELIC única sem juros

**Files:**
- Modify: `src/motor/juros.ts` (reescrito), `src/motor/calcular.ts` (uma linha)
- Test: `src/motor/juros.test.ts` (reescrito)

**Interfaces:**
- Consome: `diaAnterior`, `ratearPorMesCalendario` (Tasks 2 e fase 1); `dividirPorPeriodos` (Task 3); `tabelaRegimeNovo`, `metodologiaSelicUnica` (Task 1); `CODIGO_DA_SERIE`, `formatarCompetencia`, `formatarData`.
- Produz:
  - `interface ParametrosJuros { termoInicial; termoFinal; metodologia; indices: TabelaIndices; casas: number }` — `indices` é novo (a taxa legal vem da série `"29543"`).
  - `interface ResultadoJuros { percentual: Decimal; detalhe: DetalheJuros[]; avisos: string[] }` — `percentual` com precisão integral.
  - `jurosSimples(p): ResultadoJuros` — `percentualMensal` como na fase 1; `taxaLegal`: em cada trecho, do primeiro dia do trecho até o termo final **exclusive** (ou até o fim do trecho, se o trecho acaba antes do termo final), taxa do mês × dias ÷ dias do mês, com `DetalheJuros` por mês (`regime: "taxaLegal"`, `taxa` = taxa do mês) e aviso quando a taxa do mês falta; `selicUnica`: nada (sem detalhe, sem aviso).

- [ ] **Step 1: Escrever os testes**

Substitua `src/motor/juros.test.ts` por:

```ts
import { describe, expect, it } from "vitest";
import { paraTexto } from "../compartilhado/decimal.ts";
import type { Metodologia } from "../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../metodologias/padrao.ts";
import { jurosSimples } from "./juros.ts";
import { tabelaIgpm } from "./testes/indices-igpm-2017-2018.ts";
import { metodologiaSelicUnica, tabelaRegimeNovo } from "./testes/regime-novo.ts";

describe("jurosSimples (regime antigo: percentual mensal rateado por mês-calendário)", () => {
  const padrao = metodologiaPadrao();
  const antigo = { metodologia: padrao, indices: tabelaIgpm(), casas: 6 };

  it("reproduz o percentual do SAJ: 10/01/2017 → 25/05/2018 a 1% ao mês = 16,516129%", () => {
    const r = jurosSimples({ ...antigo, termoInicial: "2017-01-10", termoFinal: "2018-05-25" });
    expect(paraTexto(r.percentual, 6)).toBe("16.516129");
    expect(r.detalhe).toHaveLength(17);
    expect(r.detalhe[0]).toEqual({
      regime: "percentualMensal",
      de: "2017-01-10",
      ate: "2017-01-31",
      dias: 22,
      diasDoMes: 31,
      taxa: "1",
      percentual: "0.709677",
    });
    expect(r.detalhe[1]).toMatchObject({
      de: "2017-02-01",
      ate: "2017-02-28",
      dias: 28,
      percentual: "1.000000",
    });
    expect(r.detalhe[16]).toEqual({
      regime: "percentualMensal",
      de: "2018-05-01",
      ate: "2018-05-25",
      dias: 25,
      diasDoMes: 31,
      taxa: "1",
      percentual: "0.806452",
    });
    expect(r.avisos).toEqual([]);
  });

  it("lançamento e termo final no mesmo mês: conta as duas pontas (10/05 a 25/05 = 16 dias)", () => {
    const r = jurosSimples({ ...antigo, termoInicial: "2018-05-10", termoFinal: "2018-05-25" });
    expect(paraTexto(r.percentual, 6)).toBe("0.516129");
    expect(r.detalhe).toEqual([
      {
        regime: "percentualMensal",
        de: "2018-05-10",
        ate: "2018-05-25",
        dias: 16,
        diasDoMes: 31,
        taxa: "1",
        percentual: "0.516129",
      },
    ]);
  });

  it("aplica a taxa de cada período aos dias que lhe cabem", () => {
    const doisPeriodos: Metodologia = {
      ...padrao,
      periodos: [
        {
          de: null,
          ate: "2017-12-31",
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "1" },
        },
        {
          de: "2018-01-01",
          ate: null,
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "2" },
        },
      ],
    };
    const r = jurosSimples({
      ...antigo,
      metodologia: doisPeriodos,
      termoInicial: "2017-12-10",
      termoFinal: "2018-01-20",
    });
    expect(r.detalhe.map((d) => [d.de, d.ate, d.taxa, d.percentual])).toEqual([
      ["2017-12-10", "2017-12-31", "1", "0.709677"],
      ["2018-01-01", "2018-01-20", "2", "1.290323"],
    ]);
    expect(paraTexto(r.percentual, 6)).toBe("2.000000");
  });

  it("fevereiro bissexto conta 29 dias no denominador", () => {
    const r = jurosSimples({ ...antigo, termoInicial: "2024-02-10", termoFinal: "2024-03-05" });
    expect(paraTexto(r.percentual, 6)).toBe("0.850945");
    expect(r.detalhe[0]).toMatchObject({ dias: 20, diasDoMes: 29, percentual: "0.689655" });
    expect(r.detalhe[1]).toMatchObject({ dias: 5, diasDoMes: 31, percentual: "0.161290" });
  });

  it("um único dia rende 1/diasDoMes da taxa; termo inicial posterior ao final rende zero", () => {
    const umDia = jurosSimples({ ...antigo, termoInicial: "2018-05-25", termoFinal: "2018-05-25" });
    expect(paraTexto(umDia.percentual, 6)).toBe("0.032258");
    const invertido = jurosSimples({
      ...antigo,
      termoInicial: "2018-06-01",
      termoFinal: "2018-05-25",
    });
    expect(paraTexto(invertido.percentual, 6)).toBe("0.000000");
    expect(invertido.detalhe).toEqual([]);
    expect(invertido.avisos).toEqual([]);
  });
});

describe("jurosSimples (regime novo: taxa legal da Lei 14.905/2024 e transição)", () => {
  const padrao = metodologiaPadrao();
  const novo = { metodologia: padrao, indices: tabelaRegimeNovo(), casas: 6 };

  it("reproduz o exemplo oficial da Calculadora do Cidadão: 30/08/2024 a 31/08/2024 = 1 dia da taxa de agosto", () => {
    const r = jurosSimples({ ...novo, termoInicial: "2024-08-30", termoFinal: "2024-08-31" });
    expect(paraTexto(r.percentual, 6)).toBe("0.019526");
    expect(r.detalhe).toEqual([
      {
        regime: "taxaLegal",
        de: "2024-08-30",
        ate: "2024-08-30",
        dias: 1,
        diasDoMes: 31,
        taxa: "0.605306",
        percentual: "0.019526",
      },
    ]);
    expect(r.avisos).toEqual([]);
  });

  it("conta o dia do lançamento e não conta o dia do cálculo, como a Calculadora: 30/09/2024 → 11/10/2026 = 17,247591%", () => {
    const r = jurosSimples({ ...novo, termoInicial: "2024-09-30", termoFinal: "2026-10-11" });
    expect(paraTexto(r.percentual, 6)).toBe("17.247591");
    expect(r.detalhe).toHaveLength(26);
    expect(r.detalhe[0]).toEqual({
      regime: "taxaLegal",
      de: "2024-09-30",
      ate: "2024-09-30",
      dias: 1,
      diasDoMes: 30,
      taxa: "0.676227",
      percentual: "0.022541",
    });
    expect(r.detalhe[25]).toEqual({
      regime: "taxaLegal",
      de: "2026-10-01",
      ate: "2026-10-10",
      dias: 10,
      diasDoMes: 31,
      taxa: "0.379020",
      percentual: "0.122265",
    });
  });

  it("mês com taxa legal zero (mar/2025, piso da Resolução CMN 5.171) entra com zero", () => {
    const r = jurosSimples({ ...novo, termoInicial: "2025-03-10", termoFinal: "2025-03-31" });
    expect(paraTexto(r.percentual, 6)).toBe("0.000000");
    expect(r.detalhe).toEqual([
      {
        regime: "taxaLegal",
        de: "2025-03-10",
        ate: "2025-03-30",
        dias: 21,
        diasDoMes: 31,
        taxa: "0.000000",
        percentual: "0.000000",
      },
    ]);
  });

  it("lançamento datado no dia do cálculo não rende juros no regime novo", () => {
    const r = jurosSimples({ ...novo, termoInicial: "2026-10-11", termoFinal: "2026-10-11" });
    expect(paraTexto(r.percentual, 6)).toBe("0.000000");
    expect(r.detalhe).toEqual([]);
    expect(r.avisos).toEqual([]);
  });

  it("transição: 1% ao mês até 29/08/2024 (duas pontas) e taxa legal de 30/08/2024 em diante, com 30/08 contado", () => {
    const r = jurosSimples({ ...novo, termoInicial: "2024-03-10", termoFinal: "2026-10-11" });
    expect(paraTexto(r.percentual, 6)).toBe("23.585491");
    expect(r.detalhe).toHaveLength(33);
    expect(r.detalhe.slice(0, 7).map((d) => [d.regime, d.de, d.ate, d.dias, d.percentual])).toEqual(
      [
        ["percentualMensal", "2024-03-10", "2024-03-31", 22, "0.709677"],
        ["percentualMensal", "2024-04-01", "2024-04-30", 30, "1.000000"],
        ["percentualMensal", "2024-05-01", "2024-05-31", 31, "1.000000"],
        ["percentualMensal", "2024-06-01", "2024-06-30", 30, "1.000000"],
        ["percentualMensal", "2024-07-01", "2024-07-31", 31, "1.000000"],
        ["percentualMensal", "2024-08-01", "2024-08-29", 29, "0.935484"],
        ["taxaLegal", "2024-08-30", "2024-08-31", 2, "0.039052"],
      ],
    );
  });

  it("lançamento em 29/08/2024: um dia do regime antigo e a taxa legal desde 30/08", () => {
    const r = jurosSimples({ ...novo, termoInicial: "2024-08-29", termoFinal: "2026-10-11" });
    expect(paraTexto(r.percentual, 6)).toBe("17.972588");
    expect(r.detalhe[0]).toMatchObject({
      regime: "percentualMensal",
      de: "2024-08-29",
      ate: "2024-08-29",
      dias: 1,
      percentual: "0.032258",
    });
    expect(r.detalhe[1]).toMatchObject({
      regime: "taxaLegal",
      de: "2024-08-30",
      ate: "2024-08-31",
      dias: 2,
      percentual: "0.039052",
    });
  });

  it("metodologia com três períodos e taxas distintas: 1%, 2% e taxa legal", () => {
    const tresPeriodos: Metodologia = {
      ...padrao,
      periodos: [
        {
          de: null,
          ate: "2024-06-30",
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "1" },
        },
        {
          de: "2024-07-01",
          ate: "2024-08-29",
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "2" },
        },
        { de: "2024-08-30", ate: null, correcao: { indice: "IPCA" }, juros: { tipo: "taxaLegal" } },
      ],
    };
    const r = jurosSimples({
      ...novo,
      metodologia: tresPeriodos,
      termoInicial: "2024-01-10",
      termoFinal: "2026-10-11",
    });
    expect(paraTexto(r.percentual, 6)).toBe("27.520975");
    expect(r.detalhe.slice(5, 9).map((d) => [d.de, d.ate, d.taxa, d.percentual])).toEqual([
      ["2024-06-01", "2024-06-30", "1", "1.000000"],
      ["2024-07-01", "2024-07-31", "2", "2.000000"],
      ["2024-08-01", "2024-08-29", "2", "1.870968"],
      ["2024-08-30", "2024-08-31", "0.605306", "0.039052"],
    ]);
  });

  it("taxa legal ausente na tabela: aviso, e os dias ficam sem juros", () => {
    const r = jurosSimples({
      ...novo,
      indices: tabelaRegimeNovo({ "29543": "2026-09" }),
      termoInicial: "2026-10-01",
      termoFinal: "2026-10-11",
    });
    expect(paraTexto(r.percentual, 6)).toBe("0.000000");
    expect(r.detalhe).toEqual([]);
    expect(r.avisos).toEqual([
      "Taxa legal de out/2026 não disponível na tabela de índices: os dias de 01/10/2026 a 10/10/2026 ficaram sem juros.",
    ]);
  });

  it("SELIC única: sem juros separados e sem aviso (a SELIC entra capitalizada na correção)", () => {
    const r = jurosSimples({
      ...novo,
      metodologia: metodologiaSelicUnica(),
      termoInicial: "2024-03-10",
      termoFinal: "2026-10-11",
    });
    expect(paraTexto(r.percentual, 6)).toBe("0.000000");
    expect(r.detalhe).toEqual([]);
    expect(r.avisos).toEqual([]);
  });

  it("devolve o percentual com precisão integral (arredondado só para exibir)", () => {
    const r = jurosSimples({ ...novo, termoInicial: "2024-09-30", termoFinal: "2026-10-11" });
    expect(r.percentual.decimalPlaces()).toBeGreaterThan(6);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Execute: `npm test`
Esperado: os testes do regime novo falham (percentual zero e aviso "ainda não implementados"); os do regime antigo passam.

- [ ] **Step 3: Reescrever `src/motor/juros.ts`**

```ts
import { diaAnterior, ratearPorMesCalendario } from "../compartilhado/datas.ts";
import { decimal, paraTexto, ZERO, type Decimal } from "../compartilhado/decimal.ts";
import { formatarCompetencia, formatarData } from "../compartilhado/formatacao.ts";
import { CODIGO_DA_SERIE } from "../compartilhado/tipos.ts";
import type { DataISO, DetalheJuros, Metodologia, TabelaIndices } from "../compartilhado/tipos.ts";
import { dividirPorPeriodos } from "./periodos.ts";

export interface ParametrosJuros {
  termoInicial: DataISO;
  termoFinal: DataISO;
  metodologia: Metodologia;
  /** tabela congelada: a taxa legal (série 29543) vem daqui */
  indices: TabelaIndices;
  /** casas decimais do percentual exibido em cada linha do detalhe (6 na metodologia padrão) */
  casas: number;
}

export interface ResultadoJuros {
  /** percentual total com precisão integral (arredonde só para exibir) */
  percentual: Decimal;
  detalhe: DetalheJuros[];
  avisos: string[];
}

/**
 * Juros simples do termo inicial ao termo final (§6.4), somando os trechos de cada período da
 * metodologia:
 * - `percentualMensal` (regime antigo): em cada mês tocado, taxa × dias ÷ diasDoMes, contando o
 *   dia inicial e o dia final, como o SAJ;
 * - `taxaLegal` (regime novo, Lei 14.905/2024): taxa do mês (série 29543) × dias ÷ dias corridos
 *   do mês, contando o primeiro dia do trecho e não contando o dia do termo final, como a
 *   Calculadora do Cidadão do BCB (30/08/2024 a 31/08/2024 = 1 dia). Na transição, o trecho da
 *   taxa legal começa em 30/08/2024 e esse dia conta;
 * - `selicUnica`: sem juros separados, porque a SELIC entra capitalizada na correção.
 */
export function jurosSimples(p: ParametrosJuros): ResultadoJuros {
  const detalhe: DetalheJuros[] = [];
  const avisos: string[] = [];
  let percentual = ZERO;
  if (p.termoFinal < p.termoInicial) return { percentual, detalhe, avisos };

  for (const trecho of dividirPorPeriodos(p.metodologia, p.termoInicial, p.termoFinal)) {
    const regra = trecho.periodo.juros;
    if (regra.tipo === "percentualMensal") {
      const taxa = decimal(regra.taxaMensal);
      for (const mes of ratearPorMesCalendario(trecho.de, trecho.ate)) {
        const parcela = taxa.times(mes.dias).div(mes.diasDoMes);
        percentual = percentual.plus(parcela);
        detalhe.push({
          regime: "percentualMensal",
          de: mes.de,
          ate: mes.ate,
          dias: mes.dias,
          diasDoMes: mes.diasDoMes,
          taxa: regra.taxaMensal,
          percentual: paraTexto(parcela, p.casas),
        });
      }
    } else if (regra.tipo === "taxaLegal") {
      const ultimoDia = trecho.ate === p.termoFinal ? diaAnterior(trecho.ate) : trecho.ate;
      for (const mes of ratearPorMesCalendario(trecho.de, ultimoDia)) {
        const taxa = p.indices.series[CODIGO_DA_SERIE.taxaLegal]?.[mes.competencia]?.valor;
        if (taxa === undefined) {
          avisos.push(
            `Taxa legal de ${formatarCompetencia(mes.competencia)} não disponível na tabela de índices: os dias de ${formatarData(mes.de)} a ${formatarData(mes.ate)} ficaram sem juros.`,
          );
          continue;
        }
        const parcela = decimal(taxa).times(mes.dias).div(mes.diasDoMes);
        percentual = percentual.plus(parcela);
        detalhe.push({
          regime: "taxaLegal",
          de: mes.de,
          ate: mes.ate,
          dias: mes.dias,
          diasDoMes: mes.diasDoMes,
          taxa,
          percentual: paraTexto(parcela, p.casas),
        });
      }
    }
  }
  return { percentual, detalhe, avisos };
}
```

- [ ] **Step 4: Ajustar `src/motor/calcular.ts` à nova assinatura**

Na chamada de `jurosSimples` em `atualizarLancamento`, acrescente `indices,` depois de `metodologia,`:

```ts
  const juros = jurosSimples({
    termoInicial: termoInicialJuros,
    termoFinal: termoFinalJuros,
    metodologia,
    indices,
    casas: percentualCasas,
  });
```

- [ ] **Step 5: Rodar e ver passar**

Execute: `npm test`
Esperado: todos passam, inclusive "23.585491" (transição) e "0.019526" (exemplo oficial da Calculadora).

- [ ] **Step 6: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add src/motor/juros.ts src/motor/juros.test.ts src/motor/calcular.ts && git commit -m "motor: juros pela taxa legal (Lei 14.905/2024) com a contagem da Calculadora do BCB" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6: Cálculo: termos finais limitados, validação da metodologia, multa e honorários, ordem das séries e tolerância na conferência dos casos

**Files:**
- Modify: `src/motor/calcular.ts` (reescrito), `src/motor/casos.test.ts` (um teste)
- Test: `src/motor/calcular.test.ts`

**Interfaces:**
- Consome: `validarMetodologia` (Task 3), `fatorCorrecao`/`resolverIndicesMensais` (Task 4), `jurosSimples` (Task 5), `tabelaRegimeNovo`/`metodologiaSelicUnica` (Task 1).
- Produz:
  - `atualizarLancamento(lancamento, calculo, indices): LancamentoCalculado` — mesma assinatura; novos avisos: validação da metodologia própria; termo final da correção ou dos juros limitado à data de elaboração.
  - `calcular(calculo, indices): Resultado` — mesma assinatura; `totais.multa`, `totais.honorarios` e `totais.totalGeral` calculados (§6.6); `avisos` começa pela validação da metodologia global; `consultaIndices.series`, `indicesUsados` e o resumo de meses sem índice em ordem numérica de série.
  - O teste genérico de casos aceita R$ 0,01 de diferença na conferência pelos números impressos.

- [ ] **Step 1: Escrever os testes**

Em `src/motor/calcular.test.ts`, depois de `import { tabelaIgpm } from "./testes/indices-igpm-2017-2018.ts";` acrescente `import { metodologiaSelicUnica, tabelaRegimeNovo } from "./testes/regime-novo.ts";` e, ao fim do arquivo, acrescente:

```ts
describe("calcular (regime novo, multa e honorários, validações)", () => {
  const hoje = "2026-10-11";
  const lancamento = (
    id: string,
    tipo: Lancamento["tipo"],
    data: string,
    valorInformado: string,
    encargos?: Lancamento["encargos"],
  ): Lancamento => ({ id, tipo, data, valorInformado, origem: "avulso", editado: true, encargos });

  it("regime novo de ponta a ponta: IPCA e taxa legal conferidos na Calculadora do Cidadão", () => {
    const r = calcular(
      calculoCom([lancamento("p", "prestacao", "2024-09-30", "1000.00")], hoje),
      tabelaRegimeNovo(),
    );
    expect(r.lancamentos[0]).toMatchObject({
      correcao: { fator: "1.099852", pisoAplicado: false },
      corrigido: "1099.85",
      juros: { percentual: "17.247591" },
      jurosValor: "189.70",
      atualizado: "1289.55",
      avisos: [
        "IPCA de out/2026 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
      ],
    });
    expect(r.consultaIndices.series).toEqual(["189", "433", "4390", "29543"]);
    expect(r.consultaIndices.ultimoMesPorSerie).toEqual({
      "189": "2026-09",
      "433": "2026-09",
      "4390": "2026-10",
      "29543": "2026-10",
    });
  });

  it("multa e honorários do art. 523, §1º, do CPC: cada um sobre o total devido, sem cumulação", () => {
    const calculo = calculoCom(
      [
        lancamento("p-2026-01", "prestacao", "2026-01-10", "1000.00"),
        lancamento("p-2026-02", "prestacao", "2026-02-10", "1000.00"),
        lancamento("a-2026-03", "amortizacao", "2026-03-10", "500.00"),
      ],
      hoje,
    );
    calculo.acrescimos = { multaPercentual: "10", honorariosPercentual: "10" };
    const r = calcular(calculo, tabelaRegimeNovo());
    expect(r.lancamentos.map((l) => l.atualizado)).toEqual(["1108.03", "1092.52", "538.69"]);
    expect(r.totais).toEqual({
      prestacoes: "2200.55",
      amortizacoes: "538.69",
      totalDevido: "1661.86",
      multa: "166.19",
      honorarios: "166.19",
      totalGeral: "1994.24",
    });
  });

  it("sem valor devido, multa e honorários são zero e há aviso", () => {
    const calculo = calculoCom([amortizacao]);
    calculo.acrescimos = { multaPercentual: "10", honorariosPercentual: "10" };
    const r = calcular(calculo, tabelaIgpm());
    expect(r.totais).toMatchObject({
      totalDevido: "-519.35",
      multa: "0.00",
      honorarios: "0.00",
      totalGeral: "-519.35",
    });
    expect(r.avisos).toContain(
      "Multa e honorários não foram aplicados porque não há valor devido.",
    );
  });

  it("termo final próprio posterior à data de elaboração é limitado a ela, com aviso", () => {
    const comTermos: Lancamento = {
      ...prestacao,
      encargos: { termoFinalCorrecao: "2018-12-31", termoFinalJuros: "2018-12-31" },
    };
    const r = calcular(calculoCom([comTermos]), tabelaIgpm());
    expect(r.lancamentos[0]).toMatchObject({
      correcao: { fator: "1.013020" },
      juros: { percentual: "16.516129" },
      atualizado: "533.40",
    });
    expect(r.lancamentos[0]?.avisos.slice(0, 2)).toEqual([
      "Termo final da correção (31/12/2018) posterior à data de elaboração: limitado a 25/05/2018.",
      "Termo final dos juros (31/12/2018) posterior à data de elaboração: limitado a 25/05/2018.",
    ]);
  });

  it("metodologia com lacuna: aviso global, e o lançamento na lacuna fica sem correção e sem juros", () => {
    const calculo = calculoCom(
      [lancamento("p", "prestacao", "2024-07-10", "1000.00")],
      "2024-08-20",
    );
    calculo.metodologia.periodos = [
      {
        de: null,
        ate: "2024-06-30",
        correcao: { indice: "IGP-M" },
        juros: { tipo: "percentualMensal", taxaMensal: "1" },
      },
      { de: "2024-09-01", ate: null, correcao: { indice: "IPCA" }, juros: { tipo: "taxaLegal" } },
    ];
    const r = calcular(calculo, tabelaRegimeNovo());
    expect(r.avisos[0]).toBe(
      "A metodologia não cobre o período de 01/07/2024 a 31/08/2024: esses dias ficam sem correção e sem juros.",
    );
    expect(r.lancamentos[0]).toMatchObject({
      correcao: { fator: "1.000000" },
      juros: { percentual: "0.000000" },
      atualizado: "1000.00",
    });
    expect(r.lancamentos[0]?.correcao.indices.map((i) => i.serie)).toEqual([null, null]);
  });

  it("metodologia própria do lançamento também é validada, com aviso no próprio lançamento", () => {
    const propria = metodologiaPadrao();
    propria.periodos = [propria.periodos[0]!];
    const r = calcular(
      calculoCom([{ ...prestacao, encargos: { metodologia: propria } }]),
      tabelaIgpm(),
    );
    expect(r.lancamentos[0]?.avisos).toContain(
      "A metodologia não cobre datas posteriores a 29/08/2024: esses dias ficam sem correção e sem juros.",
    );
    expect(r.avisos).not.toContain(
      "A metodologia não cobre datas posteriores a 29/08/2024: esses dias ficam sem correção e sem juros.",
    );
  });

  it("SELIC única de ponta a ponta reproduz o SAJ: R$ 10.000,00 de 10/03/2024 com a tabela até ago/2026", () => {
    const calculo = calculoCom([lancamento("p", "prestacao", "2024-03-10", "10000.00")], hoje);
    calculo.metodologia = metodologiaSelicUnica();
    const r = calcular(calculo, tabelaRegimeNovo({ "4390": "2026-08" }));
    expect(r.lancamentos[0]).toMatchObject({
      correcao: { fator: "1.358127" },
      corrigido: "13581.27",
      juros: { percentual: "0.000000", detalhe: [] },
      jurosValor: "0.00",
      atualizado: "13581.27",
    });
    expect(r.lancamentos[0]?.correcao.indices[0]).toEqual({
      serie: "4390",
      competencia: "2024-03",
      valor: "0.83",
      fracao: "21/31",
    });
  });
});
```

Em `src/motor/casos.test.ts`, troque a importação `import { arredondar, CEM, decimal, paraTexto } from "../compartilhado/decimal.ts";` por `import { arredondar, CEM, decimal } from "../compartilhado/decimal.ts";` e substitua o teste "o fator e o percentual impressos reproduzem o centavo" por:

```ts
    it("o fator e o percentual impressos reproduzem o centavo, com tolerância de R$ 0,01", () => {
      // O motor multiplica com precisão integral e imprime 6 casas (como o SAJ): a conta refeita
      // com os números impressos pode diferir em um centavo.
      const umCentavo = decimal("0.01");
      expect(resultado.lancamentos.length).toBeGreaterThan(0);
      for (const l of resultado.lancamentos) {
        const corrigido = arredondar(
          decimal(l.valorBase).times(decimal(l.correcao.fator)),
          valorCasas,
        );
        expect(corrigido.minus(decimal(l.corrigido)).abs().lte(umCentavo)).toBe(true);
        const juros = arredondar(
          decimal(l.corrigido).times(decimal(l.juros.percentual)).div(CEM),
          valorCasas,
        );
        expect(juros.minus(decimal(l.jurosValor)).abs().lte(umCentavo)).toBe(true);
      }
    });
```

- [ ] **Step 2: Rodar e ver falhar**

Execute: `npm test`
Esperado: falham "multa e honorários…" (multa `"0.00"`), "sem valor devido…" (sem o aviso), "termo final próprio posterior…" (sem avisos e juros além da data), "metodologia com lacuna" e "metodologia própria…" (sem avisos de validação), e "regime novo de ponta a ponta" (`series` em ordem de texto). O caso SAJ 2018 continua passando.

- [ ] **Step 3: Reescrever `src/motor/calcular.ts`**

```ts
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
import { NOME_DA_SERIE } from "../compartilhado/tipos.ts";
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
  const jurosValor = arredondar(corrigido.times(juros.percentual).div(CEM), valorCasas);
  const atualizado = corrigido.plus(jurosValor);

  return {
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
  };
}

/** Calcula o Resultado completo de um Cálculo com uma tabela de índices congelada (§4.3). */
export function calcular(calculo: Calculo, indices: TabelaIndices): Resultado {
  const lancamentos = calculo.lancamentos.map((l) => atualizarLancamento(l, calculo, indices));
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
  // fração zero não pesou no fator: não conta como índice usado nem como mês sem índice.
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
```

- [ ] **Step 4: Rodar e ver passar**

Execute: `npm test`
Esperado: todos passam.

- [ ] **Step 5: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add src/motor/calcular.ts src/motor/calcular.test.ts src/motor/casos.test.ts && git commit -m "motor: multa e honorários, validação da metodologia e termos finais limitados à data de elaboração" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 7: Casos de referência do SAJ TJMS de 2026 (IGP-M 2024–2026 e SELIC capitalizada)

**Files:**
- Create: `src/motor/casos/2026-10-11-saj-tjms-alimentos-igpm-2024-2026.json`, `src/motor/casos/2026-10-11-saj-tjms-selic-capitalizada.json`
- Test: `src/motor/casos.test.ts` (já executa todos os arquivos da pasta)

**Interfaces:**
- Consome: `calcular` (Task 6) e o formato `apura/caso-de-referencia@1` (fase 1).
- Produz: dois gabaritos do SAJ Tribunais (relatórios de 11/10/2026, sem número de processo; PDFs fora do repositório). Os valores de cada linha foram transcritos dos PDFs e conferidos por aritmética decimal independente; os campos `fator` e `jurosPercentual` são os que o motor imprime (6 casas). A tabela de índices é a do SAJ (dez/2025 = −0,02; SELIC até ago/2026).

- [ ] **Step 1: Criar `src/motor/casos/2026-10-11-saj-tjms-alimentos-igpm-2024-2026.json`**

```json
{
  "formato": "apura/caso-de-referencia@1",
  "nome": "SAJ TJMS, Cálculo Judicial Avulso (alimentos), 30% do salário mínimo, IGP-M e 1% ao mês, cálculo de 11/10/2026",
  "fonte": "Relatório de Cálculo Judicial – Sintético/Analítico do SAJ Tribunais (TJMS), tipo Alimentos, emitido em 11/10/2026 pelo responsável a partir de dados fictícios (30% do salário mínimo do período de 10/03/2024 a 10/10/2026, pagamentos de R$ 5.000,00 em 10/05/2024 e 10/09/2024); sem número de processo; PDF fora do repositório.",
  "observacoes": "Parâmetros declarados: IGP-M (FGV) da data do lançamento até 30/09/2026 (pro rata); juro legal simples de 1,00% ao mês sobre o valor corrigido, da data do lançamento até 11/10/2026. O SAJ data a primeira prestação na data inicial (10/03/2024) e as seguintes no dia 1 de cada mês, com 30% do salário mínimo do ano (R$ 1.412,00, R$ 1.518,00 e R$ 1.621,00). A metodologia do caso é só IGP-M + 1% (o SAJ não aplica a Lei 14.905/2024), sem piso na deflação (a prestação de 06/2026 sai corrigida abaixo do original) e com multiplicação em precisão integral (o SAJ imprime 6 casas, mas multiplica sem arredondar). A tabela congelada é a do SAJ: em dez/2025 ele aplica −0,02, enquanto a série 189 do BCB traz −0,01; os demais meses coincidem. Totais = soma das linhas impressas, como no relatório.",
  "calculo": {
    "formato": "apura/calculo@1",
    "tipo": "alimentos",
    "id": "caso-saj-tjms-2026-10-11-igpm",
    "criadoEm": "2026-10-11T00:00:00.000Z",
    "atualizadoEm": "2026-10-11T00:00:00.000Z",
    "dataElaboracao": "2026-10-11",
    "cabecalho": {"defensor": "", "orgao": "", "processo": "", "exequente": "", "executado": ""},
    "base": {"tipo": "percentualSalarioMinimo", "percentual": "30"},
    "lotes": {},
    "lancamentos": [
      {"id": "p-2024-03", "tipo": "prestacao", "data": "2024-03-10", "competencia": "2024-03", "valorInformado": "423.60", "origem": "avulso", "editado": true},
      {"id": "p-2024-04", "tipo": "prestacao", "data": "2024-04-01", "competencia": "2024-04", "valorInformado": "423.60", "origem": "avulso", "editado": true},
      {"id": "p-2024-05", "tipo": "prestacao", "data": "2024-05-01", "competencia": "2024-05", "valorInformado": "423.60", "origem": "avulso", "editado": true},
      {"id": "p-2024-06", "tipo": "prestacao", "data": "2024-06-01", "competencia": "2024-06", "valorInformado": "423.60", "origem": "avulso", "editado": true},
      {"id": "p-2024-07", "tipo": "prestacao", "data": "2024-07-01", "competencia": "2024-07", "valorInformado": "423.60", "origem": "avulso", "editado": true},
      {"id": "p-2024-08", "tipo": "prestacao", "data": "2024-08-01", "competencia": "2024-08", "valorInformado": "423.60", "origem": "avulso", "editado": true},
      {"id": "p-2024-09", "tipo": "prestacao", "data": "2024-09-01", "competencia": "2024-09", "valorInformado": "423.60", "origem": "avulso", "editado": true},
      {"id": "p-2024-10", "tipo": "prestacao", "data": "2024-10-01", "competencia": "2024-10", "valorInformado": "423.60", "origem": "avulso", "editado": true},
      {"id": "p-2024-11", "tipo": "prestacao", "data": "2024-11-01", "competencia": "2024-11", "valorInformado": "423.60", "origem": "avulso", "editado": true},
      {"id": "p-2024-12", "tipo": "prestacao", "data": "2024-12-01", "competencia": "2024-12", "valorInformado": "423.60", "origem": "avulso", "editado": true},
      {"id": "p-2025-01", "tipo": "prestacao", "data": "2025-01-01", "competencia": "2025-01", "valorInformado": "455.40", "origem": "avulso", "editado": true},
      {"id": "p-2025-02", "tipo": "prestacao", "data": "2025-02-01", "competencia": "2025-02", "valorInformado": "455.40", "origem": "avulso", "editado": true},
      {"id": "p-2025-03", "tipo": "prestacao", "data": "2025-03-01", "competencia": "2025-03", "valorInformado": "455.40", "origem": "avulso", "editado": true},
      {"id": "p-2025-04", "tipo": "prestacao", "data": "2025-04-01", "competencia": "2025-04", "valorInformado": "455.40", "origem": "avulso", "editado": true},
      {"id": "p-2025-05", "tipo": "prestacao", "data": "2025-05-01", "competencia": "2025-05", "valorInformado": "455.40", "origem": "avulso", "editado": true},
      {"id": "p-2025-06", "tipo": "prestacao", "data": "2025-06-01", "competencia": "2025-06", "valorInformado": "455.40", "origem": "avulso", "editado": true},
      {"id": "p-2025-07", "tipo": "prestacao", "data": "2025-07-01", "competencia": "2025-07", "valorInformado": "455.40", "origem": "avulso", "editado": true},
      {"id": "p-2025-08", "tipo": "prestacao", "data": "2025-08-01", "competencia": "2025-08", "valorInformado": "455.40", "origem": "avulso", "editado": true},
      {"id": "p-2025-09", "tipo": "prestacao", "data": "2025-09-01", "competencia": "2025-09", "valorInformado": "455.40", "origem": "avulso", "editado": true},
      {"id": "p-2025-10", "tipo": "prestacao", "data": "2025-10-01", "competencia": "2025-10", "valorInformado": "455.40", "origem": "avulso", "editado": true},
      {"id": "p-2025-11", "tipo": "prestacao", "data": "2025-11-01", "competencia": "2025-11", "valorInformado": "455.40", "origem": "avulso", "editado": true},
      {"id": "p-2025-12", "tipo": "prestacao", "data": "2025-12-01", "competencia": "2025-12", "valorInformado": "455.40", "origem": "avulso", "editado": true},
      {"id": "p-2026-01", "tipo": "prestacao", "data": "2026-01-01", "competencia": "2026-01", "valorInformado": "486.30", "origem": "avulso", "editado": true},
      {"id": "p-2026-02", "tipo": "prestacao", "data": "2026-02-01", "competencia": "2026-02", "valorInformado": "486.30", "origem": "avulso", "editado": true},
      {"id": "p-2026-03", "tipo": "prestacao", "data": "2026-03-01", "competencia": "2026-03", "valorInformado": "486.30", "origem": "avulso", "editado": true},
      {"id": "p-2026-04", "tipo": "prestacao", "data": "2026-04-01", "competencia": "2026-04", "valorInformado": "486.30", "origem": "avulso", "editado": true},
      {"id": "p-2026-05", "tipo": "prestacao", "data": "2026-05-01", "competencia": "2026-05", "valorInformado": "486.30", "origem": "avulso", "editado": true},
      {"id": "p-2026-06", "tipo": "prestacao", "data": "2026-06-01", "competencia": "2026-06", "valorInformado": "486.30", "origem": "avulso", "editado": true},
      {"id": "p-2026-07", "tipo": "prestacao", "data": "2026-07-01", "competencia": "2026-07", "valorInformado": "486.30", "origem": "avulso", "editado": true},
      {"id": "p-2026-08", "tipo": "prestacao", "data": "2026-08-01", "competencia": "2026-08", "valorInformado": "486.30", "origem": "avulso", "editado": true},
      {"id": "p-2026-09", "tipo": "prestacao", "data": "2026-09-01", "competencia": "2026-09", "valorInformado": "486.30", "origem": "avulso", "editado": true},
      {"id": "p-2026-10", "tipo": "prestacao", "data": "2026-10-01", "competencia": "2026-10", "valorInformado": "486.30", "origem": "avulso", "editado": true},
      {"id": "a-2024-05", "tipo": "amortizacao", "data": "2024-05-10", "descricao": "Pagamento", "valorInformado": "5000.00", "origem": "avulso", "editado": true},
      {"id": "a-2024-09", "tipo": "amortizacao", "data": "2024-09-10", "descricao": "Pagamento", "valorInformado": "5000.00", "origem": "avulso", "editado": true}
    ],
    "metodologia": {
      "id": "tjms-saj",
      "versao": 1,
      "nome": "TJMS/SAJ",
      "ajustada": true,
      "periodos": [
        {"de": null, "ate": null, "correcao": {"indice": "IGP-M"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "1"}}
      ],
      "incidenciaMesInicial": "proRata",
      "deflacao": "aplicarSemPiso",
      "arredondamento": {"fatorCasas": 6, "percentualCasas": 6, "valorCasas": 2, "modo": "comercial"}
    },
    "acrescimos": {"multaPercentual": "0", "honorariosPercentual": "0"},
    "observacoes": ""
  },
  "indices": {
    "consultadoEm": "2026-10-11T00:00:00.000Z",
    "series": {
      "189": {
        "2024-03": {"valor": "-0.47", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-04": {"valor": "0.31", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-05": {"valor": "0.89", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-06": {"valor": "0.81", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-07": {"valor": "0.61", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-08": {"valor": "0.29", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-09": {"valor": "0.62", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-10": {"valor": "1.52", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-11": {"valor": "1.30", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-12": {"valor": "0.94", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-01": {"valor": "0.27", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-02": {"valor": "1.06", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-03": {"valor": "-0.34", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-04": {"valor": "0.24", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-05": {"valor": "-0.49", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-06": {"valor": "-1.67", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-07": {"valor": "-0.77", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-08": {"valor": "0.36", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-09": {"valor": "0.42", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-10": {"valor": "-0.36", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-11": {"valor": "0.27", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-12": {"valor": "-0.02", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-01": {"valor": "0.41", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-02": {"valor": "-0.73", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-03": {"valor": "0.52", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-04": {"valor": "2.73", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-05": {"valor": "0.84", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-06": {"valor": "-0.50", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-07": {"valor": "-1.16", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-08": {"valor": "-0.22", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-09": {"valor": "1.57", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"}
      }
    }
  },
  "esperado": {
    "lancamentos": [
      {"id": "p-2024-03", "fator": "1.097151", "corrigido": "464.75", "jurosPercentual": "31.064516", "jurosValor": "144.37", "atualizado": "609.12"},
      {"id": "p-2024-04", "fator": "1.100545", "corrigido": "466.19", "jurosPercentual": "30.354839", "jurosValor": "141.51", "atualizado": "607.70"},
      {"id": "p-2024-05", "fator": "1.096943", "corrigido": "464.67", "jurosPercentual": "29.354839", "jurosValor": "136.40", "atualizado": "601.07"},
      {"id": "p-2024-06", "fator": "1.087285", "corrigido": "460.57", "jurosPercentual": "28.354839", "jurosValor": "130.59", "atualizado": "591.16"},
      {"id": "p-2024-07", "fator": "1.078627", "corrigido": "456.91", "jurosPercentual": "27.354839", "jurosValor": "124.99", "atualizado": "581.90"},
      {"id": "p-2024-08", "fator": "1.072198", "corrigido": "454.18", "jurosPercentual": "26.354839", "jurosValor": "119.70", "atualizado": "573.88"},
      {"id": "p-2024-09", "fator": "1.068977", "corrigido": "452.82", "jurosPercentual": "25.354839", "jurosValor": "114.81", "atualizado": "567.63"},
      {"id": "p-2024-10", "fator": "1.062092", "corrigido": "449.90", "jurosPercentual": "24.354839", "jurosValor": "109.57", "atualizado": "559.47"},
      {"id": "p-2024-11", "fator": "1.046249", "corrigido": "443.19", "jurosPercentual": "23.354839", "jurosValor": "103.51", "atualizado": "546.70"},
      {"id": "p-2024-12", "fator": "1.032955", "corrigido": "437.56", "jurosPercentual": "22.354839", "jurosValor": "97.82", "atualizado": "535.38"},
      {"id": "p-2025-01", "fator": "1.023555", "corrigido": "466.13", "jurosPercentual": "21.354839", "jurosValor": "99.54", "atualizado": "565.67"},
      {"id": "p-2025-02", "fator": "1.020504", "corrigido": "464.74", "jurosPercentual": "20.354839", "jurosValor": "94.60", "atualizado": "559.34"},
      {"id": "p-2025-03", "fator": "1.010291", "corrigido": "460.09", "jurosPercentual": "19.354839", "jurosValor": "89.05", "atualizado": "549.14"},
      {"id": "p-2025-04", "fator": "1.013545", "corrigido": "461.57", "jurosPercentual": "18.354839", "jurosValor": "84.72", "atualizado": "546.29"},
      {"id": "p-2025-05", "fator": "1.011360", "corrigido": "460.57", "jurosPercentual": "17.354839", "jurosValor": "79.93", "atualizado": "540.50"},
      {"id": "p-2025-06", "fator": "1.016749", "corrigido": "463.03", "jurosPercentual": "16.354839", "jurosValor": "75.73", "atualizado": "538.76"},
      {"id": "p-2025-07", "fator": "1.033695", "corrigido": "470.74", "jurosPercentual": "15.354839", "jurosValor": "72.28", "atualizado": "543.02"},
      {"id": "p-2025-08", "fator": "1.041336", "corrigido": "474.22", "jurosPercentual": "14.354839", "jurosValor": "68.07", "atualizado": "542.29"},
      {"id": "p-2025-09", "fator": "1.037576", "corrigido": "472.51", "jurosPercentual": "13.354839", "jurosValor": "63.10", "atualizado": "535.61"},
      {"id": "p-2025-10", "fator": "1.033501", "corrigido": "470.66", "jurosPercentual": "12.354839", "jurosValor": "58.15", "atualizado": "528.81"},
      {"id": "p-2025-11", "fator": "1.037021", "corrigido": "472.26", "jurosPercentual": "11.354839", "jurosValor": "53.62", "atualizado": "525.88"},
      {"id": "p-2025-12", "fator": "1.034328", "corrigido": "471.03", "jurosPercentual": "10.354839", "jurosValor": "48.77", "atualizado": "519.80"},
      {"id": "p-2026-01", "fator": "1.034392", "corrigido": "503.02", "jurosPercentual": "9.354839", "jurosValor": "47.06", "atualizado": "550.08"},
      {"id": "p-2026-02", "fator": "1.030574", "corrigido": "501.17", "jurosPercentual": "8.354839", "jurosValor": "41.87", "atualizado": "543.04"},
      {"id": "p-2026-03", "fator": "1.037707", "corrigido": "504.64", "jurosPercentual": "7.354839", "jurosValor": "37.12", "atualizado": "541.76"},
      {"id": "p-2026-04", "fator": "1.031585", "corrigido": "501.66", "jurosPercentual": "6.354839", "jurosValor": "31.88", "atualizado": "533.54"},
      {"id": "p-2026-05", "fator": "1.004802", "corrigido": "488.64", "jurosPercentual": "5.354839", "jurosValor": "26.17", "atualizado": "514.81"},
      {"id": "p-2026-06", "fator": "0.996867", "corrigido": "484.78", "jurosPercentual": "4.354839", "jurosValor": "21.11", "atualizado": "505.89"},
      {"id": "p-2026-07", "fator": "1.002086", "corrigido": "487.31", "jurosPercentual": "3.354839", "jurosValor": "16.35", "atualizado": "503.66"},
      {"id": "p-2026-08", "fator": "1.013537", "corrigido": "492.88", "jurosPercentual": "2.354839", "jurosValor": "11.61", "atualizado": "504.49"},
      {"id": "p-2026-09", "fator": "1.015173", "corrigido": "493.68", "jurosPercentual": "1.354839", "jurosValor": "6.69", "atualizado": "500.37"},
      {"id": "p-2026-10", "fator": "1.000000", "corrigido": "486.30", "jurosPercentual": "0.354839", "jurosValor": "1.73", "atualizado": "488.03"},
      {"id": "a-2024-05", "fator": "1.094125", "corrigido": "5470.63", "jurosPercentual": "29.064516", "jurosValor": "1590.01", "atualizado": "7060.64"},
      {"id": "a-2024-09", "fator": "1.066997", "corrigido": "5334.98", "jurosPercentual": "25.054839", "jurosValor": "1336.67", "atualizado": "6671.65"}
    ],
    "totais": {"prestacoes": "17454.79", "amortizacoes": "13732.29", "totalDevido": "3722.50", "multa": "0.00", "honorarios": "0.00", "totalGeral": "3722.50"}
  }
}
```

Conferência contra o relatório: prestações corrigidas 15.102,37 + juros 2.352,42 = 17.454,79; amortizações 10.805,61 + 2.926,68 = 13.732,29; total geral 3.722,50.

- [ ] **Step 2: Criar `src/motor/casos/2026-10-11-saj-tjms-selic-capitalizada.json`**

```json
{
  "formato": "apura/caso-de-referencia@1",
  "nome": "SAJ TJMS, Cálculo Judicial Avulso (alimentos), valor informado, SELIC capitalizada mensalmente, cálculo de 11/10/2026",
  "fonte": "Relatório de Cálculo Judicial – Sintético/Analítico do SAJ Tribunais (TJMS), tipo Alimentos, emitido em 11/10/2026 pelo responsável a partir de dados fictícios (R$ 10.000,00 por mês de 10/03/2024 a 10/09/2024, indexador Taxa SELIC); sem número de processo; PDF fora do repositório.",
  "observacoes": "Parâmetros declarados: Taxa SELIC, da data do lançamento até 31/08/2026 (pro rata) – Corrigido com Percentual Capitalizado Mensal; sem juros. A tabela de SELIC do SAJ ia até ago/2026 em 11/10/2026 (a série 4390 do BCB já tinha set/2026 e o parcial de out/2026); a tabela congelada reproduz a do SAJ. O SAJ soma os valores sem arredondar e imprime o total 92.892,98; o Apura soma as linhas impressas (92.892,97), que é o que o relatório deve fechar.",
  "calculo": {
    "formato": "apura/calculo@1",
    "tipo": "alimentos",
    "id": "caso-saj-tjms-2026-10-11-selic",
    "criadoEm": "2026-10-11T00:00:00.000Z",
    "atualizadoEm": "2026-10-11T00:00:00.000Z",
    "dataElaboracao": "2026-10-11",
    "cabecalho": {"defensor": "", "orgao": "", "processo": "", "exequente": "", "executado": ""},
    "base": {"tipo": "valorFixo", "valor": "1000.00", "dataFixacao": "2026-10-11", "indiceReajuste": "nenhum", "mesReajuste": 1},
    "lotes": {},
    "lancamentos": [
      {"id": "p-2024-03", "tipo": "prestacao", "data": "2024-03-10", "competencia": "2024-03", "valorInformado": "10000.00", "origem": "avulso", "editado": true},
      {"id": "p-2024-04", "tipo": "prestacao", "data": "2024-04-01", "competencia": "2024-04", "valorInformado": "10000.00", "origem": "avulso", "editado": true},
      {"id": "p-2024-05", "tipo": "prestacao", "data": "2024-05-01", "competencia": "2024-05", "valorInformado": "10000.00", "origem": "avulso", "editado": true},
      {"id": "p-2024-06", "tipo": "prestacao", "data": "2024-06-01", "competencia": "2024-06", "valorInformado": "10000.00", "origem": "avulso", "editado": true},
      {"id": "p-2024-07", "tipo": "prestacao", "data": "2024-07-01", "competencia": "2024-07", "valorInformado": "10000.00", "origem": "avulso", "editado": true},
      {"id": "p-2024-08", "tipo": "prestacao", "data": "2024-08-01", "competencia": "2024-08", "valorInformado": "10000.00", "origem": "avulso", "editado": true},
      {"id": "p-2024-09", "tipo": "prestacao", "data": "2024-09-01", "competencia": "2024-09", "valorInformado": "10000.00", "origem": "avulso", "editado": true}
    ],
    "metodologia": {
      "id": "tjms-saj",
      "versao": 1,
      "nome": "TJMS/SAJ",
      "ajustada": true,
      "periodos": [
        {"de": null, "ate": null, "correcao": {"indice": "nenhum"}, "juros": {"tipo": "selicUnica"}}
      ],
      "incidenciaMesInicial": "proRata",
      "deflacao": "aplicarComPiso",
      "arredondamento": {"fatorCasas": 6, "percentualCasas": 6, "valorCasas": 2, "modo": "comercial"}
    },
    "acrescimos": {"multaPercentual": "0", "honorariosPercentual": "0"},
    "observacoes": ""
  },
  "indices": {
    "consultadoEm": "2026-10-11T00:00:00.000Z",
    "series": {
      "4390": {
        "2024-03": {"valor": "0.83", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-04": {"valor": "0.89", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-05": {"valor": "0.83", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-06": {"valor": "0.79", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-07": {"valor": "0.91", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-08": {"valor": "0.87", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-09": {"valor": "0.84", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-10": {"valor": "0.93", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-11": {"valor": "0.79", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-12": {"valor": "0.93", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-01": {"valor": "1.01", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-02": {"valor": "0.99", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-03": {"valor": "0.96", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-04": {"valor": "1.06", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-05": {"valor": "1.14", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-06": {"valor": "1.10", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-07": {"valor": "1.28", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-08": {"valor": "1.16", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-09": {"valor": "1.22", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-10": {"valor": "1.28", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-11": {"valor": "1.05", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-12": {"valor": "1.22", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-01": {"valor": "1.16", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-02": {"valor": "1.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-03": {"valor": "1.21", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-04": {"valor": "1.09", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-05": {"valor": "1.07", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-06": {"valor": "1.12", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-07": {"valor": "1.22", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-08": {"valor": "1.09", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"}
      }
    }
  },
  "esperado": {
    "lancamentos": [
      {"id": "p-2024-03", "fator": "1.358127", "corrigido": "13581.27", "jurosPercentual": "0.000000", "jurosValor": "0.00", "atualizado": "13581.27"},
      {"id": "p-2024-04", "fator": "1.350145", "corrigido": "13501.45", "jurosPercentual": "0.000000", "jurosValor": "0.00", "atualizado": "13501.45"},
      {"id": "p-2024-05", "fator": "1.338273", "corrigido": "13382.73", "jurosPercentual": "0.000000", "jurosValor": "0.00", "atualizado": "13382.73"},
      {"id": "p-2024-06", "fator": "1.327263", "corrigido": "13272.63", "jurosPercentual": "0.000000", "jurosValor": "0.00", "atualizado": "13272.63"},
      {"id": "p-2024-07", "fator": "1.316820", "corrigido": "13168.20", "jurosPercentual": "0.000000", "jurosValor": "0.00", "atualizado": "13168.20"},
      {"id": "p-2024-08", "fator": "1.304962", "corrigido": "13049.62", "jurosPercentual": "0.000000", "jurosValor": "0.00", "atualizado": "13049.62"},
      {"id": "p-2024-09", "fator": "1.293707", "corrigido": "12937.07", "jurosPercentual": "0.000000", "jurosValor": "0.00", "atualizado": "12937.07"}
    ],
    "totais": {"prestacoes": "92892.97", "amortizacoes": "0.00", "totalDevido": "92892.97", "multa": "0.00", "honorarios": "0.00", "totalGeral": "92892.97"}
  }
}
```

- [ ] **Step 3: Rodar e ver passar**

Execute: `npm test`
Esperado: `casos.test.ts` passa com os três casos: 2018 (28 linhas), SAJ 2026 IGP-M (34 linhas) e SAJ 2026 SELIC (7 linhas), cada um com os testes de totais, conferência pelos números impressos e ordem dos lançamentos. Se alguma linha divergir, os PDFs estão certos (conferidos linha a linha em 11/10/2026): procure o erro no motor ou na transcrição.

- [ ] **Step 4: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add src/motor/casos && git commit -m "motor: casos de referência do SAJ TJMS de 2026 (IGP-M e SELIC capitalizada)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 8: Casos de referência do regime novo, transição, deflação, multa e encargos próprios, conferidos na Calculadora do Cidadão

**Files:**
- Create: `src/motor/casos/2026-10-11-calculadora-bcb-regime-novo.json`, `src/motor/casos/2026-10-11-transicao-lei-14905.json`, `src/motor/casos/2026-09-15-deflacao-com-piso.json`, `src/motor/casos/2026-10-11-multa-e-honorarios-art-523.json`, `src/motor/casos/2026-10-11-encargos-proprios.json`
- Test: `src/motor/casos.test.ts`

**Interfaces:**
- Consome: `calcular` (Task 6).
- Produz: cinco casos cujos índices de correção (IPCA, meses inteiros) e percentuais de juros (taxa legal) foram conferidos na Calculadora do Cidadão do BCB em 11/10/2026, com os números das consultas registrados no campo `fonte` de cada caso; pro rata do mês inicial, composição dos regimes, piso, multa e termos próprios por aritmética decimal independente. As tabelas congeladas trazem só os meses que cada caso usa, com os valores das séries do BCB.

- [ ] **Step 1: Criar `src/motor/casos/2026-10-11-calculadora-bcb-regime-novo.json`**

```json
{
  "formato": "apura/caso-de-referencia@1",
  "nome": "Regime novo (IPCA e taxa legal), conferido na Calculadora do Cidadão do BCB em 11/10/2026",
  "fonte": "Calculadora do Cidadão do BCB, consultada em 11/10/2026: aba Taxa Legal (30/09/2024→11/10/2026: 0,17247591; 10/03/2025→11/10/2026 e 31/03/2025→11/10/2026: 0,14471376; 31/08/2026→11/10/2026: 0,01658626; 01/10/2026→11/10/2026: 0,00122265; 11/10/2026→11/10/2026: 0; 30/06/2025→11/10/2026: 0,12776091) e aba Índices de preços, IPCA (10/2024→09/2026: 1,09985180; 04/2025→09/2026: 1,06217010; 09/2026→09/2026: 1,00820000; 07/2025→09/2026: 1,05235400). Pro rata do mês inicial e centavos por aritmética decimal independente.",
  "observacoes": "Lançamentos no último dia do mês têm fração zero na correção desse mês, por isso o fator coincide com o índice da Calculadora para os meses inteiros seguintes. Na taxa legal a Calculadora conta o dia inicial e não conta o dia final (exemplo oficial: 30/08/2024 a 31/08/2024 = 1 dia); mar/2025 tem taxa legal zero. Out/2026 sem IPCA na data do cálculo: entra com fator 1 e aviso.",
  "calculo": {
    "formato": "apura/calculo@1",
    "tipo": "alimentos",
    "id": "caso-calculadora-bcb-regime-novo",
    "criadoEm": "2026-10-11T00:00:00.000Z",
    "atualizadoEm": "2026-10-11T00:00:00.000Z",
    "dataElaboracao": "2026-10-11",
    "cabecalho": {"defensor": "", "orgao": "", "processo": "", "exequente": "", "executado": ""},
    "base": {"tipo": "valorFixo", "valor": "1000.00", "dataFixacao": "2026-10-11", "indiceReajuste": "nenhum", "mesReajuste": 1},
    "lotes": {},
    "lancamentos": [
      {"id": "p-2024-09-30", "tipo": "prestacao", "data": "2024-09-30", "competencia": "2024-09", "valorInformado": "1000.00", "origem": "avulso", "editado": true},
      {"id": "p-2025-03-10", "tipo": "prestacao", "data": "2025-03-10", "competencia": "2025-03", "valorInformado": "1000.00", "origem": "avulso", "editado": true},
      {"id": "p-2025-03-31", "tipo": "prestacao", "data": "2025-03-31", "competencia": "2025-03", "descricao": "Segunda prestação de março", "valorInformado": "1000.00", "origem": "avulso", "editado": true},
      {"id": "p-2026-08-31", "tipo": "prestacao", "data": "2026-08-31", "competencia": "2026-08", "valorInformado": "1000.00", "origem": "avulso", "editado": true},
      {"id": "p-2026-10-01", "tipo": "prestacao", "data": "2026-10-01", "competencia": "2026-10", "valorInformado": "1000.00", "origem": "avulso", "editado": true},
      {"id": "p-2026-10-11", "tipo": "prestacao", "data": "2026-10-11", "competencia": "2026-10", "descricao": "Vencida no dia do cálculo", "valorInformado": "1000.00", "origem": "avulso", "editado": true},
      {"id": "a-2025-06-30", "tipo": "amortizacao", "data": "2025-06-30", "descricao": "Pagamento parcial", "valorInformado": "500.00", "origem": "avulso", "editado": true}
    ],
    "metodologia": {
      "id": "tjms-saj",
      "versao": 1,
      "nome": "TJMS/SAJ",
      "ajustada": false,
      "periodos": [
        {"de": null, "ate": "2024-08-29", "correcao": {"indice": "IGP-M"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "1"}},
        {"de": "2024-08-30", "ate": null, "correcao": {"indice": "IPCA"}, "juros": {"tipo": "taxaLegal"}}
      ],
      "incidenciaMesInicial": "proRata",
      "deflacao": "aplicarComPiso",
      "arredondamento": {"fatorCasas": 6, "percentualCasas": 6, "valorCasas": 2, "modo": "comercial"}
    },
    "acrescimos": {"multaPercentual": "0", "honorariosPercentual": "0"},
    "observacoes": ""
  },
  "indices": {
    "consultadoEm": "2026-10-11T13:00:00.000Z",
    "series": {
      "433": {
        "2024-09": {"valor": "0.44", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-10": {"valor": "0.56", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-11": {"valor": "0.39", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-12": {"valor": "0.52", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-01": {"valor": "0.16", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-02": {"valor": "1.31", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-03": {"valor": "0.56", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-04": {"valor": "0.43", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-05": {"valor": "0.26", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-06": {"valor": "0.24", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-07": {"valor": "0.26", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-08": {"valor": "-0.11", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-09": {"valor": "0.48", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-10": {"valor": "0.09", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-11": {"valor": "0.18", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-12": {"valor": "0.33", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-01": {"valor": "0.33", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-02": {"valor": "0.70", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-03": {"valor": "0.88", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-04": {"valor": "0.67", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-05": {"valor": "0.58", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-06": {"valor": "0.16", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-07": {"valor": "0.07", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-08": {"valor": "-0.32", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-09": {"valor": "0.82", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"}
      },
      "29543": {
        "2024-09": {"valor": "0.676227", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-10": {"valor": "0.704241", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-11": {"valor": "0.385874", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-12": {"valor": "0.171924", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-01": {"valor": "0.589427", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-02": {"valor": "0.902209", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-03": {"valor": "0.000000", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-04": {"valor": "0.321969", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-05": {"valor": "0.623200", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-06": {"valor": "0.775982", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-07": {"valor": "0.834880", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-08": {"valor": "0.942622", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-09": {"valor": "1.305984", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-10": {"valor": "0.736394", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-11": {"valor": "1.093764", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-12": {"valor": "0.851001", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-01": {"valor": "0.967510", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-02": {"valor": "0.962232", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-03": {"valor": "0.155714", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-04": {"valor": "0.768672", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-05": {"valor": "0.198293", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-06": {"valor": "0.450641", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-07": {"valor": "0.706607", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-08": {"valor": "1.154527", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-09": {"valor": "1.499119", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-10": {"valor": "0.379020", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"}
      }
    }
  },
  "esperado": {
    "lancamentos": [
      {"id": "p-2024-09-30", "fator": "1.099852", "corrigido": "1099.85", "jurosPercentual": "17.247591", "jurosValor": "189.70", "atualizado": "1289.55"},
      {"id": "p-2025-03-10", "fator": "1.066196", "corrigido": "1066.20", "jurosPercentual": "14.471376", "jurosValor": "154.29", "atualizado": "1220.49"},
      {"id": "p-2025-03-31", "fator": "1.062170", "corrigido": "1062.17", "jurosPercentual": "14.471376", "jurosValor": "153.71", "atualizado": "1215.88"},
      {"id": "p-2026-08-31", "fator": "1.008200", "corrigido": "1008.20", "jurosPercentual": "1.658626", "jurosValor": "16.72", "atualizado": "1024.92"},
      {"id": "p-2026-10-01", "fator": "1.000000", "corrigido": "1000.00", "jurosPercentual": "0.122265", "jurosValor": "1.22", "atualizado": "1001.22"},
      {"id": "p-2026-10-11", "fator": "1.000000", "corrigido": "1000.00", "jurosPercentual": "0.000000", "jurosValor": "0.00", "atualizado": "1000.00"},
      {"id": "a-2025-06-30", "fator": "1.052354", "corrigido": "526.18", "jurosPercentual": "12.776091", "jurosValor": "67.23", "atualizado": "593.41"}
    ],
    "totais": {"prestacoes": "6752.06", "amortizacoes": "593.41", "totalDevido": "6158.65", "multa": "0.00", "honorarios": "0.00", "totalGeral": "6158.65"}
  }
}
```

- [ ] **Step 2: Criar `src/motor/casos/2026-10-11-transicao-lei-14905.json`**

```json
{
  "formato": "apura/caso-de-referencia@1",
  "nome": "Transição da Lei 14.905/2024 em 30/08/2024: IGP-M e 1% ao mês até 29/08/2024, IPCA e taxa legal desde 30/08/2024",
  "fonte": "Regime antigo pelas convenções do SAJ TJMS (casos de 2018 e 2026); taxa legal conferida na Calculadora do Cidadão do BCB em 11/10/2026 (30/08/2024→11/10/2026: 0,17940330; 31/08/2024→11/10/2026: 0,17920804) e IPCA (09/2024→09/2026: 1,10469120); composição dos dois regimes por aritmética decimal independente.",
  "observacoes": "Para lançamento anterior a 30/08/2024, os juros somam 1% ao mês até 29/08/2024 (contando as duas pontas, como o SAJ) e a taxa legal de 30/08/2024 até a véspera do cálculo (30/08 conta; 30 e 31/08 com a taxa de agosto/2024). A correção usa o IGP-M em todo o mês de agosto/2024 e o IPCA de setembro/2024 em diante. Os lançamentos de 29, 30 e 31/08/2024 testam a fronteira dia a dia.",
  "calculo": {
    "formato": "apura/calculo@1",
    "tipo": "alimentos",
    "id": "caso-transicao-lei-14905",
    "criadoEm": "2026-10-11T00:00:00.000Z",
    "atualizadoEm": "2026-10-11T00:00:00.000Z",
    "dataElaboracao": "2026-10-11",
    "cabecalho": {"defensor": "", "orgao": "", "processo": "", "exequente": "", "executado": ""},
    "base": {"tipo": "valorFixo", "valor": "1000.00", "dataFixacao": "2026-10-11", "indiceReajuste": "nenhum", "mesReajuste": 1},
    "lotes": {},
    "lancamentos": [
      {"id": "p-2024-03-10", "tipo": "prestacao", "data": "2024-03-10", "competencia": "2024-03", "valorInformado": "10000.00", "origem": "avulso", "editado": true},
      {"id": "p-2024-07-31", "tipo": "prestacao", "data": "2024-07-31", "competencia": "2024-07", "valorInformado": "10000.00", "origem": "avulso", "editado": true},
      {"id": "p-2024-08-29", "tipo": "prestacao", "data": "2024-08-29", "competencia": "2024-08", "descricao": "Último dia do regime antigo", "valorInformado": "10000.00", "origem": "avulso", "editado": true},
      {"id": "p-2024-08-30", "tipo": "prestacao", "data": "2024-08-30", "competencia": "2024-08", "descricao": "Primeiro dia do regime novo", "valorInformado": "10000.00", "origem": "avulso", "editado": true},
      {"id": "p-2024-08-31", "tipo": "prestacao", "data": "2024-08-31", "competencia": "2024-08", "valorInformado": "10000.00", "origem": "avulso", "editado": true},
      {"id": "a-2024-05-10", "tipo": "amortizacao", "data": "2024-05-10", "descricao": "Pagamento parcial", "valorInformado": "5000.00", "origem": "avulso", "editado": true}
    ],
    "metodologia": {
      "id": "tjms-saj",
      "versao": 1,
      "nome": "TJMS/SAJ",
      "ajustada": false,
      "periodos": [
        {"de": null, "ate": "2024-08-29", "correcao": {"indice": "IGP-M"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "1"}},
        {"de": "2024-08-30", "ate": null, "correcao": {"indice": "IPCA"}, "juros": {"tipo": "taxaLegal"}}
      ],
      "incidenciaMesInicial": "proRata",
      "deflacao": "aplicarComPiso",
      "arredondamento": {"fatorCasas": 6, "percentualCasas": 6, "valorCasas": 2, "modo": "comercial"}
    },
    "acrescimos": {"multaPercentual": "0", "honorariosPercentual": "0"},
    "observacoes": ""
  },
  "indices": {
    "consultadoEm": "2026-10-11T13:00:00.000Z",
    "series": {
      "189": {
        "2024-03": {"valor": "-0.47", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-04": {"valor": "0.31", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-05": {"valor": "0.89", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-06": {"valor": "0.81", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-07": {"valor": "0.61", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-08": {"valor": "0.29", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"}
      },
      "433": {
        "2024-09": {"valor": "0.44", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-10": {"valor": "0.56", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-11": {"valor": "0.39", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-12": {"valor": "0.52", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-01": {"valor": "0.16", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-02": {"valor": "1.31", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-03": {"valor": "0.56", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-04": {"valor": "0.43", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-05": {"valor": "0.26", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-06": {"valor": "0.24", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-07": {"valor": "0.26", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-08": {"valor": "-0.11", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-09": {"valor": "0.48", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-10": {"valor": "0.09", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-11": {"valor": "0.18", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-12": {"valor": "0.33", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-01": {"valor": "0.33", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-02": {"valor": "0.70", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-03": {"valor": "0.88", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-04": {"valor": "0.67", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-05": {"valor": "0.58", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-06": {"valor": "0.16", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-07": {"valor": "0.07", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-08": {"valor": "-0.32", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-09": {"valor": "0.82", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"}
      },
      "29543": {
        "2024-08": {"valor": "0.605306", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-09": {"valor": "0.676227", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-10": {"valor": "0.704241", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-11": {"valor": "0.385874", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-12": {"valor": "0.171924", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-01": {"valor": "0.589427", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-02": {"valor": "0.902209", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-03": {"valor": "0.000000", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-04": {"valor": "0.321969", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-05": {"valor": "0.623200", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-06": {"valor": "0.775982", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-07": {"valor": "0.834880", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-08": {"valor": "0.942622", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-09": {"valor": "1.305984", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-10": {"valor": "0.736394", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-11": {"valor": "1.093764", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-12": {"valor": "0.851001", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-01": {"valor": "0.967510", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-02": {"valor": "0.962232", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-03": {"valor": "0.155714", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-04": {"valor": "0.768672", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-05": {"valor": "0.198293", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-06": {"valor": "0.450641", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-07": {"valor": "0.706607", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-08": {"valor": "1.154527", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-09": {"valor": "1.499119", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-10": {"valor": "0.379020", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"}
      }
    }
  },
  "esperado": {
    "lancamentos": [
      {"id": "p-2024-03-10", "fator": "1.133573", "corrigido": "11335.73", "jurosPercentual": "23.585491", "jurosValor": "2673.59", "atualizado": "14009.32"},
      {"id": "p-2024-07-31", "fator": "1.107895", "corrigido": "11078.95", "jurosPercentual": "18.908071", "jurosValor": "2094.82", "atualizado": "13173.77"},
      {"id": "p-2024-08-29", "fator": "1.104898", "corrigido": "11048.98", "jurosPercentual": "17.972588", "jurosValor": "1985.79", "atualizado": "13034.77"},
      {"id": "p-2024-08-30", "fator": "1.104794", "corrigido": "11047.94", "jurosPercentual": "17.940330", "jurosValor": "1982.04", "atualizado": "13029.98"},
      {"id": "p-2024-08-31", "fator": "1.104691", "corrigido": "11046.91", "jurosPercentual": "17.920804", "jurosValor": "1979.70", "atualizado": "13026.61"},
      {"id": "a-2024-05-10", "fator": "1.130447", "corrigido": "5652.23", "jurosPercentual": "21.585491", "jurosValor": "1220.06", "atualizado": "6872.29"}
    ],
    "totais": {"prestacoes": "66274.45", "amortizacoes": "6872.29", "totalDevido": "59402.16", "multa": "0.00", "honorarios": "0.00", "totalGeral": "59402.16"}
  }
}
```

- [ ] **Step 3: Criar `src/motor/casos/2026-09-15-deflacao-com-piso.json`**

```json
{
  "formato": "apura/caso-de-referencia@1",
  "nome": "Deflação do IPCA com piso no valor original (ago/2026 = −0,32%), cálculo de 15/09/2026",
  "fonte": "Calculadora do Cidadão do BCB, consultada em 11/10/2026: IPCA 08/2026→08/2026 = 0,99680000 (deflação); taxa legal 31/07/2026→15/09/2026 = 0,01876910 e 31/08/2026→15/09/2026 = 0,00736832. Piso conforme §6.4 do design e STJ, Corte Especial, REsp 1.265.580/RS.",
  "observacoes": "Em 15/09/2026 a tabela tinha o IPCA até ago/2026 e a taxa legal até set/2026. A prestação e o pagamento de 31/07/2026 acumulam fator 0,996800: com o piso, corrigido = original e o resultado registra o piso; a prestação de 31/08/2026 não tem mês de correção disponível. Com a opção 'aplicarSemPiso', a prestação de 31/07/2026 daria R$ 996,80 corrigidos e R$ 1.015,51 atualizados (teste unitário).",
  "calculo": {
    "formato": "apura/calculo@1",
    "tipo": "alimentos",
    "id": "caso-deflacao-com-piso",
    "criadoEm": "2026-10-11T00:00:00.000Z",
    "atualizadoEm": "2026-10-11T00:00:00.000Z",
    "dataElaboracao": "2026-09-15",
    "cabecalho": {"defensor": "", "orgao": "", "processo": "", "exequente": "", "executado": ""},
    "base": {"tipo": "valorFixo", "valor": "1000.00", "dataFixacao": "2026-09-15", "indiceReajuste": "nenhum", "mesReajuste": 1},
    "lotes": {},
    "lancamentos": [
      {"id": "p-2026-07-31", "tipo": "prestacao", "data": "2026-07-31", "competencia": "2026-07", "valorInformado": "1000.00", "origem": "avulso", "editado": true},
      {"id": "p-2026-08-31", "tipo": "prestacao", "data": "2026-08-31", "competencia": "2026-08", "valorInformado": "1000.00", "origem": "avulso", "editado": true},
      {"id": "a-2026-07-31", "tipo": "amortizacao", "data": "2026-07-31", "descricao": "Pagamento parcial", "valorInformado": "300.00", "origem": "avulso", "editado": true}
    ],
    "metodologia": {
      "id": "tjms-saj",
      "versao": 1,
      "nome": "TJMS/SAJ",
      "ajustada": false,
      "periodos": [
        {"de": null, "ate": "2024-08-29", "correcao": {"indice": "IGP-M"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "1"}},
        {"de": "2024-08-30", "ate": null, "correcao": {"indice": "IPCA"}, "juros": {"tipo": "taxaLegal"}}
      ],
      "incidenciaMesInicial": "proRata",
      "deflacao": "aplicarComPiso",
      "arredondamento": {"fatorCasas": 6, "percentualCasas": 6, "valorCasas": 2, "modo": "comercial"}
    },
    "acrescimos": {"multaPercentual": "0", "honorariosPercentual": "0"},
    "observacoes": ""
  },
  "indices": {
    "consultadoEm": "2026-09-15T12:00:00.000Z",
    "series": {
      "433": {
        "2026-07": {"valor": "0.07", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-08": {"valor": "-0.32", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"}
      },
      "29543": {
        "2026-07": {"valor": "0.706607", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-08": {"valor": "1.154527", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-09": {"valor": "1.499119", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"}
      }
    }
  },
  "esperado": {
    "lancamentos": [
      {"id": "p-2026-07-31", "fator": "1.000000", "corrigido": "1000.00", "jurosPercentual": "1.876910", "jurosValor": "18.77", "atualizado": "1018.77"},
      {"id": "p-2026-08-31", "fator": "1.000000", "corrigido": "1000.00", "jurosPercentual": "0.736832", "jurosValor": "7.37", "atualizado": "1007.37"},
      {"id": "a-2026-07-31", "fator": "1.000000", "corrigido": "300.00", "jurosPercentual": "1.876910", "jurosValor": "5.63", "atualizado": "305.63"}
    ],
    "totais": {"prestacoes": "2026.14", "amortizacoes": "305.63", "totalDevido": "1720.51", "multa": "0.00", "honorarios": "0.00", "totalGeral": "1720.51"}
  }
}
```

- [ ] **Step 4: Criar `src/motor/casos/2026-10-11-multa-e-honorarios-art-523.json`**

```json
{
  "formato": "apura/caso-de-referencia@1",
  "nome": "Multa e honorários do art. 523, §1º, do CPC (10% e 10%) sobre o total devido, cálculo de 11/10/2026",
  "fonte": "Calculadora do Cidadão do BCB, consultada em 11/10/2026: taxa legal 10/01/2026→11/10/2026: 0,06704690; 10/02/2026→11/10/2026: 0,05708781; 10/03/2026→11/10/2026: 0,05010630. Correção pelo IPCA e centavos por aritmética decimal independente; multa e honorários conforme §6.6 do design.",
  "observacoes": "Cada percentual incide separadamente sobre o total devido (prestações atualizadas menos amortizações atualizadas); os honorários não incidem sobre a multa; total geral = total devido + multa + honorários.",
  "calculo": {
    "formato": "apura/calculo@1",
    "tipo": "alimentos",
    "id": "caso-multa-e-honorarios",
    "criadoEm": "2026-10-11T00:00:00.000Z",
    "atualizadoEm": "2026-10-11T00:00:00.000Z",
    "dataElaboracao": "2026-10-11",
    "cabecalho": {"defensor": "", "orgao": "", "processo": "", "exequente": "", "executado": ""},
    "base": {"tipo": "valorFixo", "valor": "1000.00", "dataFixacao": "2026-10-11", "indiceReajuste": "nenhum", "mesReajuste": 1},
    "lotes": {},
    "lancamentos": [
      {"id": "p-2026-01-10", "tipo": "prestacao", "data": "2026-01-10", "competencia": "2026-01", "valorInformado": "1000.00", "origem": "avulso", "editado": true},
      {"id": "p-2026-02-10", "tipo": "prestacao", "data": "2026-02-10", "competencia": "2026-02", "valorInformado": "1000.00", "origem": "avulso", "editado": true},
      {"id": "a-2026-03-10", "tipo": "amortizacao", "data": "2026-03-10", "descricao": "Pagamento parcial", "valorInformado": "500.00", "origem": "avulso", "editado": true}
    ],
    "metodologia": {
      "id": "tjms-saj",
      "versao": 1,
      "nome": "TJMS/SAJ",
      "ajustada": false,
      "periodos": [
        {"de": null, "ate": "2024-08-29", "correcao": {"indice": "IGP-M"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "1"}},
        {"de": "2024-08-30", "ate": null, "correcao": {"indice": "IPCA"}, "juros": {"tipo": "taxaLegal"}}
      ],
      "incidenciaMesInicial": "proRata",
      "deflacao": "aplicarComPiso",
      "arredondamento": {"fatorCasas": 6, "percentualCasas": 6, "valorCasas": 2, "modo": "comercial"}
    },
    "acrescimos": {"multaPercentual": "10", "honorariosPercentual": "10"},
    "observacoes": ""
  },
  "indices": {
    "consultadoEm": "2026-10-11T13:00:00.000Z",
    "series": {
      "433": {
        "2026-01": {"valor": "0.33", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-02": {"valor": "0.70", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-03": {"valor": "0.88", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-04": {"valor": "0.67", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-05": {"valor": "0.58", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-06": {"valor": "0.16", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-07": {"valor": "0.07", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-08": {"valor": "-0.32", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-09": {"valor": "0.82", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"}
      },
      "29543": {
        "2026-01": {"valor": "0.967510", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-02": {"valor": "0.962232", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-03": {"valor": "0.155714", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-04": {"valor": "0.768672", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-05": {"valor": "0.198293", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-06": {"valor": "0.450641", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-07": {"valor": "0.706607", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-08": {"valor": "1.154527", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-09": {"valor": "1.499119", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-10": {"valor": "0.379020", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"}
      }
    }
  },
  "esperado": {
    "lancamentos": [
      {"id": "p-2026-01-10", "fator": "1.038409", "corrigido": "1038.41", "jurosPercentual": "6.704690", "jurosValor": "69.62", "atualizado": "1108.03"},
      {"id": "p-2026-02-10", "fator": "1.033516", "corrigido": "1033.52", "jurosPercentual": "5.708781", "jurosValor": "59.00", "atualizado": "1092.52"},
      {"id": "a-2026-03-10", "fator": "1.025988", "corrigido": "512.99", "jurosPercentual": "5.010630", "jurosValor": "25.70", "atualizado": "538.69"}
    ],
    "totais": {"prestacoes": "2200.55", "amortizacoes": "538.69", "totalDevido": "1661.86", "multa": "166.19", "honorarios": "166.19", "totalGeral": "1994.24"}
  }
}
```

- [ ] **Step 5: Criar `src/motor/casos/2026-10-11-encargos-proprios.json`**

```json
{
  "formato": "apura/caso-de-referencia@1",
  "nome": "Encargos próprios por lançamento: termos iniciais e finais distintos e metodologia própria com três períodos, cálculo de 11/10/2026",
  "fonte": "Calculadora do Cidadão do BCB, consultada em 11/10/2026: taxa legal 01/06/2025→31/03/2026: 0,08621060; 20/05/2026→31/07/2026: 0,01211213; 01/02/2026→11/10/2026: 0,06018070; 30/08/2024→11/10/2026: 0,17940330; IPCA 01/2026→09/2026: 1,03951320. Regime antigo pelas convenções do SAJ; composição por aritmética decimal independente.",
  "observacoes": "p-2025-01-15: correção desde o vencimento e juros só de 01/06/2025 a 31/03/2026 (por exemplo, da citação ao depósito). p-2024-01-10: metodologia própria com 1% ao mês até 30/06/2024, 2% ao mês de 01/07 a 29/08/2024 e taxa legal desde 30/08/2024. p-2026-05-20: correção e juros cessam em 31/07/2026. a-2025-12-31: juros só a partir de 01/02/2026.",
  "calculo": {
    "formato": "apura/calculo@1",
    "tipo": "alimentos",
    "id": "caso-encargos-proprios",
    "criadoEm": "2026-10-11T00:00:00.000Z",
    "atualizadoEm": "2026-10-11T00:00:00.000Z",
    "dataElaboracao": "2026-10-11",
    "cabecalho": {"defensor": "", "orgao": "", "processo": "", "exequente": "", "executado": ""},
    "base": {"tipo": "valorFixo", "valor": "1000.00", "dataFixacao": "2026-10-11", "indiceReajuste": "nenhum", "mesReajuste": 1},
    "lotes": {},
    "lancamentos": [
      {"id": "p-2025-01-15", "tipo": "prestacao", "data": "2025-01-15", "competencia": "2025-01", "valorInformado": "1000.00", "encargos": {"termoInicialJuros": "2025-06-01", "termoFinalJuros": "2026-03-31"}, "origem": "avulso", "editado": true},
      {"id": "p-2024-01-10", "tipo": "prestacao", "data": "2024-01-10", "competencia": "2024-01", "valorInformado": "1000.00", "encargos": {"metodologia": {"id": "tjms-saj", "versao": 1, "nome": "TJMS/SAJ", "ajustada": true, "periodos": [{"de": null, "ate": "2024-06-30", "correcao": {"indice": "IGP-M"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "1"}}, {"de": "2024-07-01", "ate": "2024-08-29", "correcao": {"indice": "IGP-M"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "2"}}, {"de": "2024-08-30", "ate": null, "correcao": {"indice": "IPCA"}, "juros": {"tipo": "taxaLegal"}}], "incidenciaMesInicial": "proRata", "deflacao": "aplicarComPiso", "arredondamento": {"fatorCasas": 6, "percentualCasas": 6, "valorCasas": 2, "modo": "comercial"}}}, "origem": "avulso", "editado": true},
      {"id": "p-2026-05-20", "tipo": "prestacao", "data": "2026-05-20", "competencia": "2026-05", "valorInformado": "1000.00", "encargos": {"termoFinalCorrecao": "2026-07-31", "termoFinalJuros": "2026-07-31"}, "origem": "avulso", "editado": true},
      {"id": "a-2025-12-31", "tipo": "amortizacao", "data": "2025-12-31", "descricao": "Pagamento parcial", "valorInformado": "200.00", "encargos": {"termoInicialJuros": "2026-02-01"}, "origem": "avulso", "editado": true}
    ],
    "metodologia": {
      "id": "tjms-saj",
      "versao": 1,
      "nome": "TJMS/SAJ",
      "ajustada": false,
      "periodos": [
        {"de": null, "ate": "2024-08-29", "correcao": {"indice": "IGP-M"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "1"}},
        {"de": "2024-08-30", "ate": null, "correcao": {"indice": "IPCA"}, "juros": {"tipo": "taxaLegal"}}
      ],
      "incidenciaMesInicial": "proRata",
      "deflacao": "aplicarComPiso",
      "arredondamento": {"fatorCasas": 6, "percentualCasas": 6, "valorCasas": 2, "modo": "comercial"}
    },
    "acrescimos": {"multaPercentual": "0", "honorariosPercentual": "0"},
    "observacoes": ""
  },
  "indices": {
    "consultadoEm": "2026-10-11T13:00:00.000Z",
    "series": {
      "189": {
        "2024-01": {"valor": "0.07", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-02": {"valor": "-0.52", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-03": {"valor": "-0.47", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-04": {"valor": "0.31", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-05": {"valor": "0.89", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-06": {"valor": "0.81", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-07": {"valor": "0.61", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-08": {"valor": "0.29", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"}
      },
      "433": {
        "2024-09": {"valor": "0.44", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-10": {"valor": "0.56", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-11": {"valor": "0.39", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-12": {"valor": "0.52", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-01": {"valor": "0.16", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-02": {"valor": "1.31", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-03": {"valor": "0.56", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-04": {"valor": "0.43", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-05": {"valor": "0.26", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-06": {"valor": "0.24", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-07": {"valor": "0.26", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-08": {"valor": "-0.11", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-09": {"valor": "0.48", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-10": {"valor": "0.09", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-11": {"valor": "0.18", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-12": {"valor": "0.33", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-01": {"valor": "0.33", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-02": {"valor": "0.70", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-03": {"valor": "0.88", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-04": {"valor": "0.67", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-05": {"valor": "0.58", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-06": {"valor": "0.16", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-07": {"valor": "0.07", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-08": {"valor": "-0.32", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-09": {"valor": "0.82", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"}
      },
      "29543": {
        "2024-08": {"valor": "0.605306", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-09": {"valor": "0.676227", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-10": {"valor": "0.704241", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-11": {"valor": "0.385874", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2024-12": {"valor": "0.171924", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-01": {"valor": "0.589427", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-02": {"valor": "0.902209", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-03": {"valor": "0.000000", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-04": {"valor": "0.321969", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-05": {"valor": "0.623200", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-06": {"valor": "0.775982", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-07": {"valor": "0.834880", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-08": {"valor": "0.942622", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-09": {"valor": "1.305984", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-10": {"valor": "0.736394", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-11": {"valor": "1.093764", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-12": {"valor": "0.851001", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-01": {"valor": "0.967510", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-02": {"valor": "0.962232", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-03": {"valor": "0.155714", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-04": {"valor": "0.768672", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-05": {"valor": "0.198293", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-06": {"valor": "0.450641", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-07": {"valor": "0.706607", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-08": {"valor": "1.154527", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-09": {"valor": "1.499119", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-10": {"valor": "0.379020", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"}
      }
    }
  },
  "esperado": {
    "lancamentos": [
      {"id": "p-2025-01-15", "fator": "1.083004", "corrigido": "1083.00", "jurosPercentual": "8.621060", "jurosValor": "93.37", "atualizado": "1176.37"},
      {"id": "p-2024-01-10", "fator": "1.126500", "corrigido": "1126.50", "jurosPercentual": "27.520975", "jurosValor": "310.02", "atualizado": "1436.52"},
      {"id": "p-2026-05-20", "fator": "1.004360", "corrigido": "1004.36", "jurosPercentual": "1.211213", "jurosValor": "12.16", "atualizado": "1016.52"},
      {"id": "a-2025-12-31", "fator": "1.039513", "corrigido": "207.90", "jurosPercentual": "6.018070", "jurosValor": "12.51", "atualizado": "220.41"}
    ],
    "totais": {"prestacoes": "3629.41", "amortizacoes": "220.41", "totalDevido": "3409.00", "multa": "0.00", "honorarios": "0.00", "totalGeral": "3409.00"}
  }
}
```

- [ ] **Step 6: Rodar e ver passar**

Execute: `npm test`
Esperado: oito casos na pasta, todos verdes; no total, 12 arquivos de teste e 223 testes.

- [ ] **Step 7: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add src/motor/casos && git commit -m "motor: casos de referência do regime novo, transição, deflação, multa e encargos próprios" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 9: ESLint: o motor é puro (sem relógio, rede, DOM nem armazenamento)

**Files:**
- Modify: `eslint.config.js`

**Interfaces:**
- Produz: em `src/motor/**/*.ts`, qualquer referência a `Date`, `fetch`, `document`, `window`, `localStorage` ou `sessionStorage` é erro de lint (regra 4 do `CLAUDE.md`).

- [ ] **Step 1: Substituir `eslint.config.js`**

```js
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["dist", "node_modules", "coverage", ".claude", ".superpowers"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    // O motor é puro (regra 4 do CLAUDE.md): sem relógio, sem rede, sem DOM, sem armazenamento.
    files: ["src/motor/**/*.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "Date", message: "O motor não usa relógio: datas chegam como texto ISO." },
        {
          name: "fetch",
          message: "O motor não acessa a rede: os índices chegam na TabelaIndices.",
        },
        { name: "document", message: "O motor não usa o DOM." },
        { name: "window", message: "O motor não usa o DOM." },
        { name: "localStorage", message: "O motor não usa armazenamento." },
        { name: "sessionStorage", message: "O motor não usa armazenamento." },
      ],
    },
  },
  prettier,
);
```

- [ ] **Step 2: Ver a regra acusar (teste negativo, com arquivo temporário)**

Execute:

```bash
printf 'export const agora = Date.now();\nexport const pagina = typeof document;\n' > src/motor/temporario-impuro.ts && npx eslint src/motor/temporario-impuro.ts; rm -f src/motor/temporario-impuro.ts
```

Esperado: dois erros `no-restricted-globals` ("Unexpected use of 'Date'…" e "Unexpected use of 'document'…"); o arquivo temporário é apagado em seguida.

- [ ] **Step 3: Ver o lint passar no código real**

Execute: `npm run lint`
Esperado: nenhum erro (o motor já era puro; os testes do motor também não usam esses globais).

- [ ] **Step 4: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add eslint.config.js && git commit -m "projeto: ESLint proíbe relógio, rede, DOM e armazenamento no motor" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 10: Fechamento da fase: roteiro, CLAUDE.md, design, pendências e verificação final

**Files:**
- Modify: `docs/superpowers/roteiro.md`, `CLAUDE.md`, `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md` (§6.4, §6.8 e §7), este plano (seção "Pendências registradas na execução da fase 2")

- [ ] **Step 1: Rodar a verificação completa e a build**

Execute: `npm run verificar && npm run build`
Esperado: tudo verde; `dist/` gerado; 12 arquivos de teste e 223 testes.

- [ ] **Step 2: Atualizar a tabela do roteiro e os insumos**

Em `docs/superpowers/roteiro.md`, troque a linha da fase 2 por (use a data do dia):

```markdown
| 2 · Regime novo e transição | taxa legal, IPCA, transição 30/08/2024, SELIC única capitalizada, deflação com piso, encargos próprios, multa e honorários; gabaritos do SAJ de 2026 e casos conferidos na Calculadora do Cidadão | concluída em AAAA-MM-DD · plano: `docs/superpowers/plans/2026-10-11-fase-2-regime-novo-e-transicao.md` |
```

troque a situação da fase 3 de "pendente" para "plano a escrever", e substitua o item "Gabaritos da contadoria do TJMS ou do SAJ Tribunais, especialmente um relatório posterior a 30/08/2024 (fase 2)." da seção "Insumos que dependem do responsável" por:

```markdown
- Gabaritos do SAJ Tribunais: obtidos em 11/10/2026 (IGP-M 2024–2026 e SELIC capitalizada); o SAJ não calcula a taxa legal, cujo gabarito é a Calculadora do Cidadão do BCB. Opcionais: relatório do SAJ com a aba Honorários preenchida; relatório com juros "taxa selic" e indexador nenhum.
```

- [ ] **Step 3: Atualizar o `CLAUDE.md`**

Seção "Estado":

```markdown
## Estado

Fase 2 (regime novo e transição) concluída em AAAA-MM-DD: taxa legal com a contagem da Calculadora
do Cidadão, IPCA, transição em 30/08/2024, SELIC única capitalizada, deflação com piso, encargos
próprios, multa e honorários, precisão integral e sete casos de referência novos (dois do SAJ de
2026, cinco conferidos na Calculadora). Próxima: fase 3 (bases e lotes), com plano a escrever. A
tabela de fases do roteiro é a referência; atualize-a e esta seção ao concluir cada fase.
```

Regra 2 de "Regras obrigatórias": troque a frase "Arredondamento comercial (meio para cima): fator e percentual com 6 casas, valores com 2, e o fator e o percentual são arredondados antes de multiplicar." (no arquivo ela está quebrada em duas linhas, com a indentação da lista) por "Arredondamento comercial (meio para cima) nos valores (2 casas); o fator e o percentual de juros multiplicam com precisão integral e são impressos com 6 casas (convenção do SAJ, decidida em 11/10/2026)."

Mapa de pastas: na linha de `src/motor/testes/`, troque "tabela IGP-M usada pelos testes unitários" por "tabela IGP-M 2017–2018 e séries do regime novo 2024–2026 usadas pelos testes unitários".

Seção "Pontos de validação jurídica": acrescente ao fim do parágrafo: "Os pontos 3, 4, 5, 8, 9 e 12 foram decididos em 11/10/2026 (nota ao fim da §7 do design)."

Seção "Como registrar um caso de referência", no item `indices`: acrescente "quando a fonte usa um valor diferente do BCB (ex.: IGP-M de dez/2025 no SAJ), o caso congela o valor da fonte e explica em `observacoes`".

- [ ] **Step 4: Registrar as decisões no design (§6.4, §6.8 e §7)**

Em `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md`, faça estas substituições exatas:

1. Em §6.4, "6. O fator é arredondado a 6 casas (comercial) **antes** de multiplicar: `corrigido = arred2(valorBase × fator6)`." → "6. O fator multiplica com precisão integral e é impresso com 6 casas (decisão de 11/10/2026, ponto 9): `corrigido = arred2(valorBase × fator)`."
2. Em §6.4, na regra da taxa legal, "(o dia inicial não conta)" → "(conta-se o dia inicial e não se conta o dia do termo final, como a Calculadora do Cidadão; decisão de 11/10/2026)".
3. Em §6.4, a regra da SELIC única inteira → "- SELIC única (`selicUnica`, alternativa para o período antigo, Tema 1.368 do STJ): a SELIC (série 4390) entra como índice de correção capitalizado mês a mês, com pro rata geométrico no mês inicial, como o SAJ; não há juros separados; no mês corrente, o valor parcial já publicado pelo BCB entra inteiro, sem rateio (decisão de 11/10/2026)."
4. Em §6.4, "- O percentual total é arredondado a 6 casas antes de aplicar: `jurosValor = arred2(corrigido × percentual6 ÷ 100)`. `atualizado = corrigido + jurosValor`." → "- O percentual total multiplica com precisão integral e é impresso com 6 casas: `jurosValor = arred2(corrigido × percentual ÷ 100)`. `atualizado = corrigido + jurosValor`."
5. Em §6.8, o parágrafo inteiro → "Modo comercial (meio para cima) nos valores: valor-base (2 casas), corrigido (2), juros (2), multa e honorários (2). O fator e o percentual de juros são impressos com 6 casas, mas multiplicam com precisão integral (como o SAJ): quem refizer a conta com os números impressos pode encontrar diferença de até R$ 0,01 (decisão de 11/10/2026)."
6. Ao fim da §7 (depois do item 12), acrescente:

```markdown

**Decisões registradas em 11/10/2026 (fase 2).** Pontos 3 e 4: o SAJ Tribunais não calcula a taxa legal (segue IGP-M e 1% ao mês); o gabarito do regime novo é a Calculadora do Cidadão do BCB, que conta o dia inicial e não conta o dia final; na transição, 30/08/2024 conta. Ponto 5: SELIC única capitalizada mês a mês como índice de correção, sem juros, como o SAJ. Ponto 8: confirmado. Ponto 9: fator e percentual multiplicam com precisão integral e são impressos com 6 casas, como o SAJ. Ponto 12: piso mantido (STJ, REsp 1.265.580/RS), decidido sobre o fator bruto; o SAJ não aplica piso. Observação: a tabela do SAJ traz IGP-M de dez/2025 = −0,02 (BCB: −0,01).
```

- [ ] **Step 5: Preencher as pendências desta fase**

Na seção "Pendências registradas na execução da fase 2" deste plano, registre os achados das revisões que ficaram para fases seguintes (há itens já conhecidos lá).

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/roteiro.md CLAUDE.md docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md docs/superpowers/plans/2026-10-11-fase-2-regime-novo-e-transicao.md && git commit -m "docs: fase 2 concluída no roteiro, no CLAUDE.md e no design" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7: Integrar o trabalho**

Use a skill `superpowers:finishing-a-development-branch`: o repositório ainda não está no GitHub, então a integração é local (merge da branch de trabalho na `main`), e a decisão é do responsável.

---

## Notas para as fases seguintes (ganchos deixados por esta fase)

- **Fase 3 (bases e lotes).** O caso do SAJ de 2026 (`2026-10-11-saj-tjms-alimentos-igpm-2024-2026.json`) tem base "30% do salário mínimo do período" com os valores 423,60, 455,40 e 486,30 informados à mão: quando `src/motor/base.ts` apurar o valor pela série 1619, um teste pode confirmar que 30% × 1.412,00 / 1.518,00 / 1.621,00 reproduz esses valores. Rodar `npm run indices:atualizar -- 188 1619` e registrar os arquivos em `ARQUIVOS` de `src/indices/embutidos.ts` (o teste de embutidos espera `188` e `1619` ausentes: ajustar). O SAJ data a primeira prestação na data inicial e as seguintes no dia 1; o gerador de lotes do Apura usa o dia do vencimento escolhido (§6.1), e a diferença fica documentada no caso.
- **Fase 4 (índices ao vivo).** O mês corrente parcial da SELIC é identificado pela competência de `TabelaIndices.consultadoEm`: o congelamento deve gravar a data-hora real da consulta. O calendário de divulgação pode explicar o aviso "Taxa legal de mm/aaaa não disponível" (publicada no 1º dia útil do mês) e "IPCA de mm/aaaa não disponível" (por volta do dia 10 do mês seguinte).
- **Fase 5 (interface).** No editor de períodos, "SELIC única" é uma escolha só (define `juros.tipo = "selicUnica"` e `correcao.indice = "nenhum"`); os avisos de `validarMetodologia` aparecem ao dividir períodos; os termos finais próprios posteriores à data de elaboração podem ser recusados já na tela (o motor limita e avisa).
- **Fase 6 (relatório).** No bloco "Metodologia e fundamentos", a taxa legal é descrita como "pro rata por dias corridos, contando o dia do vencimento e não o dia do cálculo (Calculadora do Cidadão do BCB)"; o parágrafo de arredondamento diz que o fator e o percentual são impressos com 6 casas e multiplicam com precisão integral, de modo que a conferência manual pode diferir em R$ 0,01; na SELIC única, o texto é "atualização pela taxa SELIC capitalizada mensalmente (Tema 1.368 do STJ), sem juros". O detalhe dos juros por mês traz `regime: "taxaLegal"` com a taxa do mês em `taxa`.
- **Fase 7 (publicação).** A rotina mensal de índices passa a baixar as quatro séries (e as da fase 3).

### Pendências registradas na execução da fase 2

Preencher ao fim da execução com os achados das revisões. Itens já conhecidos ao escrever o plano:

- **Melhorias menores da fase 1 não tratadas aqui:** cast `as ArquivoSerie` sem checar formato e código; totais arredondados com as casas da metodologia global mesmo quando um lançamento tem metodologia própria; teste de casos não compara avisos; nomes curtos das séries duplicados (`SERIES` e `NOME_DA_SERIE`); `ValorMensal` repete o formato de `ArquivoSerie.valores`.
- **Gabaritos opcionais do SAJ:** aba Honorários preenchida (base dos honorários no SAJ); juros "taxa selic" com indexador nenhum (como o SAJ aplica a SELIC como juros); lançamento datado no dia do cálculo.
- **Regra do mês corrente parcial da SELIC** vale quando o termo final cai no mês da consulta; se o termo final for anterior ao mês da consulta e a série tiver o mês completo, aplica-se o pro rata normal.

## Auto-revisão do plano

**Cobertura da fase 2 (§16 do design, tabela do roteiro e pendências da fase 1):**

| Item | Task |
|---|---|
| correção pelo IPCA no regime novo (índice do período vigente no dia 1) | 4 (já previsto na fase 1; casos nas Tasks 7 e 8) |
| juros pela taxa legal (série 29543), pro rata por dias corridos, sobre o corrigido | 5 |
| transição automática em 30/08/2024 (30/08 conta; 30 e 31/08 com a taxa de agosto) | 5, caso de transição na 8 |
| SELIC única (série 4390) como alternativa do período antigo | 4 (índice capitalizado), 5 (sem juros), caso na 7 |
| deflação com piso, com caso de referência | 4, caso na 8 |
| encargos próprios por lançamento (termos e metodologia por períodos) com caso | 3, 6, caso na 8 |
| multa e honorários do art. 523, §1º | 6, caso na 8 |
| casos conferidos na Calculadora do Cidadão | 8 |
| séries 433, 29543 e 4390 embutidas | 1 |
| pendências da fase 1: validação da metodologia; piso sobre o fator bruto; ordem das séries e resumo; termos finais; ESLint | 3, 4, 6, 9 |
| atualização do roteiro, CLAUDE.md e design | 10 |

**Convenções da §12:** domínio em português, `Decimal` para valores, datas ISO como texto, motor sem rede/relógio/DOM (agora garantido pelo ESLint), imports com `.ts`, commits "módulo: o que muda". Verificadas tarefa a tarefa.

**Placeholders:** nenhum "TBD", "TODO" ou "implementar depois"; todo passo de código traz o código, e os sete casos trazem o JSON completo.

**Consistência de nomes entre tarefas:** `tabelaRegimeNovo`, `metodologiaSelicUnica` (1) usados em 4, 5, 6; `diaAnterior`, `diaSeguinte` (2) usados em 3 e 5; `periodosOrdenados`, `periodoVigenteEm`, `validarMetodologia`, `dividirPorPeriodos` (3) usados em 4, 5, 6; `IndiceMensal.parcial`, `ParametrosCorrecao` sem `casas`, `ResultadoCorrecao.fator` bruto (4) usados em 6; `ParametrosJuros.indices` (5) usado em 6; `calcular` (6) usado em 7 e 8.

**Foco da revisão:** os cinco itens têm teste na tarefa dona (5 e 8: lançamento no dia do cálculo; 5: taxa legal ausente; 3 e 6: lacuna e sobreposição; 6: termo final posterior; 4 e 8: deflação com piso e SELIC parcial).

**Ensaio:** todo o código deste plano foi executado numa cópia do repositório fora dele em 11/10/2026: `npm run format && npm run verificar` verde (Prettier, ESLint com a regra nova, `tsc -b`, 12 arquivos e 223 testes), teste negativo do ESLint acusando `Date` e `document`.
