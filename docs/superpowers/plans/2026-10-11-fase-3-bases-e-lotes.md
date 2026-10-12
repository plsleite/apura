# Apura · Fase 3 · Bases e lotes — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** fazer o motor apurar sozinho o valor de cada prestação pela base dos alimentos (valor fixo com reajuste anual, percentual do salário mínimo ou percentual dos rendimentos), gerar prestações e pagamentos em lote, tratar os casos-limite da §6.7 (prestação vincenda, pagamento posterior ao cálculo, valor zero, negativo ou inválido, dado faltante) com uma marca de situação em cada linha do resultado, registrar a proveniência do salário mínimo e dos índices de reajuste, embutir as séries 188 (INPC) e 1619 (salário mínimo), adotar a convenção do SAJ para os juros (sobre o valor corrigido sem arredondar) e provar tudo com quatro casos de referência novos (dois relatórios do SAJ Tribunais de 11/10/2026 reproduzidos centavo a centavo: 22 prestações com base "valor informado" e 26 lançamentos com INPC, lote de prestações e lote de pagamentos; o caso de 2018 recalculado pela base; e um caso de reajuste pelo IPCA conferido na Calculadora do Cidadão), além de quatro testes de ponta a ponta e das pendências que as fases 1 e 2 destinaram a esta.

**Arquitetura:** a mesma das fases anteriores: o motor (`src/motor/`) é um conjunto de funções puras que recebem o `Calculo` e uma `TabelaIndices` congelada e devolvem o `Resultado`. Entram dois módulos: `lote.ts` (geradores de lançamentos, chamados pela tela a cada "Lançar em lote"; `calcular` não os chama) e `base.ts` (valor-base de uma prestação pelo mês do vencimento). `calcular.ts` passa a decidir o valor de cada lançamento (informado à mão ou apurado pela base) e a sua situação (atualizado, vincenda ou ignorado), e a somar só o que conta. `LancamentoCalculado` ganha dois campos (`editado` e `situacao`), e o formato do caso de referência ganha campos opcionais para provar a base e os avisos. Nenhuma dependência nova.

**Stack:** Node 22 · npm · Vite 8.3 · React 19.3 · TypeScript 6.0 · Vitest 5.0 · decimal.js 10.6 · ESLint 10 + typescript-eslint 8 · Prettier 3.9, nas versões exatas já fixadas em `package.json`. Python 3 (módulo `decimal`) e `pdftotext` só para conferências fora do repositório.

**Spec:** `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md` (fonte de verdade: §3.1 escopo; §4.2 e §4.4 módulos; §5.2 e §5.4 modelo de dados; §6.1 a §6.3 lotes e valor-base; §6.7 casos-limite; §7 pontos de validação; §8.1 e §8.3 séries e proveniência; §11 testes; §12.2 estrutura; §16 fases; Anexo A). Também: `docs/superpowers/roteiro.md`, `docs/superpowers/specs/2026-10-10-apura-visao-do-produto.md` (§3 e §5: o gerador de prestações e a base ficam separados do motor de atualização) e os planos das fases 1 e 2 (seções "Notas para as fases seguintes" e "Pendências").

## Restrições globais (valem para todas as tarefas)

- TypeScript estrito; Node 22 e npm (não há pnpm). O script de índices exige Node ≥ 22.18 e internet (só a Task 1).
- Dinheiro, percentuais, índices e fatores são sempre `Decimal`, importado só de `src/compartilhado/decimal.ts`; nunca `number`. Em arquivos e no `Resultado`, texto decimal com ponto (`"451.91"`). Todo texto decimal que vem do usuário (valor informado, rendimento, valor e percentual da base, valor mensal do lote) passa por `decimalOuNulo` (Task 2): texto inválido vira aviso, nunca erro (regra 4 do `CLAUDE.md`).
- Datas como texto `"AAAA-MM-DD"`; competências como `"AAAA-MM"`. O motor não usa `Date`, `fetch`, DOM nem armazenamento (o ESLint impede). O gerador de lotes recebe a data de elaboração como parâmetro.
- **Precisão (ponto 9, completado em 11/10/2026 nesta fase):** o fator e o percentual multiplicam com precisão integral e são impressos com 6 casas; `corrigido = arred2(valorBase × fator)`; **`jurosValor = arred2(valorBase × fator × percentual ÷ 100)`** (os juros incidem sobre o corrigido sem arredondar, como o SAJ); `atualizado = corrigido + jurosValor`. Totais = soma das linhas computadas, já arredondadas.
- **Valor-base (§6.3, decisões de 11/10/2026, ponto 6 e lacunas):** a base usa sempre o mês da data do vencimento (a competência é só o rótulo da linha, e o lote a grava igual ao mês do vencimento). Valor fixo com reajuste por índice: primeiro reajuste 12 meses após a fixação quando o mês do reajuste é o da fixação; com outro mês, na primeira ocorrência dele depois do mês da fixação, com o acumulado do mês da fixação ao mês anterior ao reajuste; depois, a cada 12 meses; o acumulado (produto de 1 + i/100) multiplica com precisão integral e aparece na memória com 4 casas; o valor reajustado é arredondado a 2 casas a cada reajuste, e o seguinte parte dele; acumulado não positivo mantém o valor; mês do acumulado sem índice na tabela: o reajuste não é aplicado, o valor vigente anterior é mantido e o aviso diz até que mês o índice está disponível. Reajuste pelo salário mínimo: valor × SM do mês do vencimento ÷ SM do mês da fixação, sem usar o mês de reajuste. "Nenhum": valor constante. Prestação anterior ao mês da fixação: valor fixado, sem reajuste, com aviso. Percentual do salário mínimo: percentual × SM do mês do vencimento; mês ainda sem SM publicado: o último publicado (vigente até o novo decreto), com aviso. Percentual dos rendimentos: percentual × rendimento do lançamento, se informado, senão o padrão; não há reajuste automático; 13º e férias entram como prestação avulsa com o rendimento do evento. Valor informado à mão prevalece. Valor-base com 2 casas; `memoriaBase` explica a conta em uma frase.
- **Lotes (§6.1 e §6.2):** prestações por dia de vencimento com "N meses em atraso" (a última é a do vencimento mais recente que não ultrapassa a data de elaboração) ou intervalo de competências; dia 31 (29, 30) em mês curto cai no último dia; competências já lançadas são puladas, com aviso; as prestações do lote nascem sem valor informado. Pagamentos: um por mês, com valor, dia e descrição "Pagamento parcial"; meses que já têm pagamento são pulados, com aviso. O dia do pagamento é sempre informado (a tela o preenche com o dia do vencimento).
- **Casos-limite (§6.7):** prestação posterior à data de elaboração é `vincenda` (valor nominal, sem correção e sem juros, mesmo com termos próprios; entra nos totais); pagamento posterior, valor zero ou negativo, texto inválido, pagamento sem valor e base sem como apurar são `ignorado` (aparecem pelo valor nominal, fora dos totais, com aviso). Amortizações são informadas como valores positivos.
- **Proveniência (§8.3):** o salário mínimo e os índices de reajuste entram em `indicesUsados` com série, competência, valor, fonte e data de obtenção; os meses que faltaram para a base têm resumo próprio no resultado; séries sempre em ordem numérica ("188" antes de "189", "1619" depois de "433").
- **Valores informados à mão:** só prestações com `valorInformado` recebem `editado = true`, aviso no lançamento e resumo no resultado; pagamentos nunca (o valor deles é sempre informado). Nos casos de referência, as amortizações ficam com `editado: false`.
- Casos de referência congelam a tabela **como a fonte a usou** (o SAJ aplica IGP-M de dez/2025 = −0,02; o BCB, −0,01) e os valores esperados vêm da fonte ou de aritmética decimal independente: se o motor não bater, a implementação está errada, não o valor esperado.
- Nenhum índice inventado: só BCB/SGS (as seis séries desta fase). O salário mínimo "último publicado" não é estimativa: é o valor legalmente vigente até o novo decreto, e a proveniência registra o mês realmente usado.
- Dados pessoais: nenhum número de processo nem nome de parte. Os PDFs do SAJ ficam fora do repositório e não são copiados nem citados pelo nome do arquivo. Os relatórios de 11/10/2026 trazem na assinatura o nome do responsável: não o transcreva.
- Termos do domínio em português; infraestrutura técnica em inglês. Imports relativos com `.ts`; tipos com `import type`.
- Commits em português no formato "módulo: o que muda", terminados com a linha de coautoria do modelo que de fato executa (`Co-Authored-By: <nome do modelo> <noreply@anthropic.com>`; os comandos abaixo trazem o espaço reservado `<modelo>`, que deve ser trocado).
- Fora desta fase (não implementar): interface (fase 5), índices ao vivo e congelamento com data real (fase 4), validação de entrada na tela e percentuais de multa e honorários inválidos (fase 5), relatório e exibição de total negativo (fase 6). Onde o código desta fase encostar nesses pontos, deixa aviso ou valor neutro e registra o gancho em "Notas para as fases seguintes".

## Foco da revisão

Entradas que o design implica mas que nenhum teste cobriria por si; cada uma ganhou teste na tarefa dona do código.

1. **Lote que se sobrepõe a outro ou é relançado**: só as competências novas entram; as já lançadas (de lote ou avulsas) são listadas no aviso; relançar o mesmo lote não duplica nada e avisa que nada entrou. → Task 3 (testes "lotes cumulativos…" e, para pagamentos, "gera um pagamento por mês… pulando meses…").
2. **Dia 31 em fevereiro (bissexto e não) e data de elaboração antes ou depois do dia do vencimento**: 29/02/2024 e 28/02/2025; "N meses em atraso" muda a última competência conforme a elaboração seja 27/02 ou 28/02 com dia 31, e 03/10 ou 10/10 com dia 5. → Task 2 (`dataNoMes`) e Task 3 (testes "N meses em atraso…" e "dia 31 em mês curto…").
3. **Reajuste em mês diferente do mês da fixação, janela curta, acumulado negativo e índice faltante no meio da janela**: jan/2025 com acumulado de mar a dez/2024; jun/2024 com um mês só; IGP-M de 2017 (−0,53%) mantém o valor; IPCA de mai/2025 ausente interrompe a cadeia sem estimar. → Task 4 (testes do grupo "reajuste anual pelo índice acumulado").
4. **Mês sem salário mínimo publicado, inclusive numa prestação vincenda**: usa o último publicado, avisa, sinaliza o mês e, se a prestação é futura, entra pelo nominal; sem nenhum salário mínimo anterior, fica sem valor e fora dos totais. → Task 4 (testes do grupo "percentual do salário mínimo") e Task 6 (teste "prestação vincenda em % do salário mínimo…").
5. **Texto decimal inválido e valor zero ou negativo, em prestação, em pagamento e na própria base; juros na fronteira do centavo**: `"1,5"`, `""`, `"NaN"` e `"Infinity"` não derrubam o motor; `"0"` e `"-440.00"` ficam fora dos totais; R$ 450,00 de 01/02/2025 rende 93,47 (sobre o corrigido bruto) e não 93,48. → Task 5 (teste "juros incidem sobre o corrigido sem arredondar…") e Task 6 (testes "texto decimal inválido…" e "valor zero ou negativo…").

---

## Para o responsável: o que esta fase entrega, o que foi descoberto e as escolhas feitas

Ao fim da fase, o motor calcula um cálculo de alimentos inteiro a partir da base e dos lotes, sem que o usuário digite valor de prestação, e prova isso com 386 testes (eram 226) em 15 arquivos, inclusive quatro casos de referência novos (12 no total). Continua sem tela: a interface é a fase 5.

**Decisões tomadas com o responsável em 11/10/2026 (todas registradas no design pela Task 9):**

1. **Ponto 6 (reajuste anual do valor fixo)**: regra do design confirmada; primeiro reajuste 12 meses após a fixação quando o mês do reajuste é o da fixação; acumulado com precisão integral (impresso com 4 casas); valor reajustado arredondado a 2 casas a cada reajuste; acumulado negativo não reduz o valor; o reajuste pelo salário mínimo segue o salário mínimo do mês do vencimento, sem usar o mês de reajuste.
2. **Prestação anterior à data de fixação**: entra com o valor fixado, sem reajuste, com aviso.
3. **Competência = mês do vencimento**; a base usa sempre o mês da data do vencimento.
4. **Lote de pagamentos** pula os meses que já têm pagamento, com aviso.
5. **Ponto 11 (13º e férias)**: toda prestação sem valor informado, avulsa ou de lote, é apurada pela base; na base em % dos rendimentos, o usuário informa no lançamento o rendimento do evento (o 13º ou as férias recebidos) e o motor aplica o percentual; o rendimento é sempre informado (padrão ou do mês), sem reajuste automático.
6. **Dado faltante**: salário mínimo ainda não publicado → o último publicado, com aviso (é o vigente até o novo decreto); índice de reajuste não publicado → reajuste não aplicado, valor vigente mantido, aviso dizendo até que mês o índice existe; rendimento ausente ou zero cai na regra do valor zero.
7. **Ponto 7 (amortização pelo método do SAJ)** confirmado como padrão único.
8. **Ponto 10 (IGP-M padrão; INPC, IPCA e SELIC única como alternativas)** confirmado, com a ressalva de que a SELIC já inclui correção e juros: o motor avisa quando um período combina SELIC com índice de correção, e a tela (fase 5) deve avisar quem tentar somar juros à SELIC.
9. **Marca "editado"**: só prestações com valor digitado; pagamentos nunca; os sete casos de 2026 passam a ter amortizações com `editado: false`, como o de 2018.
10. **Marcas no resultado**: o motor preenche em cada linha `situacao` (atualizado, vincenda ou ignorado) e `editado`; a tela e o relatório só leem.
11. **Dia do pagamento**: a tela preenche com o dia do vencimento; o motor recebe sempre o dia (decisão técnica, sem efeito jurídico).
12. **Juros sobre o corrigido sem arredondar** (complemento do ponto 9, decidido diante do relatório novo do SAJ): `jurosValor = arred2(valorBase × fator × percentual ÷ 100)`.
13. **Séries**: a Task 1 baixa as seis séries juntas, para que a data da consulta e o mês parcial da SELIC fiquem coerentes.
14. **Itens sem fase incorporados**: o caso de referência passa a conferir `valorBase`, `memoriaBase`, `situacao`, `editado` e avisos (campos opcionais); tolerância proporcional ao valor na conferência pelos números impressos; leitura dos arquivos de série com checagem de formato e nomes curtos das séries num lugar só. Ficou para a fase 5 o tratamento de percentuais de multa e honorários inválidos.

**Descobertas de 11/10/2026 que moldaram o plano:**

1. **O relatório do SAJ "valor informado" não reajusta.** No Cálculo Judicial Avulso, "valor informado" é um valor mensal fixo (R$ 1.500,00) multiplicado pela quantidade (0,30): R$ 450,00 em todos os 22 meses, de 01/2025 a 10/2026, sem reajuste anual. Ele não serve de gabarito para o reajuste por índice, mas é um gabarito exato para a base em **percentual dos rendimentos** (30% do rendimento padrão de R$ 1.500,00), que não tinha nenhum, e para o **lote no dia 1** (todas as prestações do SAJ caem no dia 1 porque a data inicial é dia 1). Entra como caso de referência na Task 7, com a tabela do SAJ (dez/2025 = −0,02).
2. **O SAJ calcula os juros sobre o corrigido sem arredondar.** Nas 69 linhas dos três relatórios anteriores as duas formas coincidiam; no novo, duas linhas diferem em R$ 0,01 (02/2025: 93,47 no SAJ contra 93,48 sobre o corrigido arredondado; 09/2025: 62,35 contra 62,36). Com a convenção do SAJ, as 91 linhas dos quatro relatórios batem; só um pagamento do caso conferido na Calculadora (a-2025-06-30, cujo centavo vinha de aritmética nossa) muda de 67,23 para 67,22 (Task 5).
3. **Reajuste por índice sem gabarito externo.** O SAJ não tem valor fixo com reajuste anual por índice; o caso da Task 7 é conferido na Calculadora do Cidadão (IPCA 03/2024→02/2025 = 1,05057630, R$ 500,00 → R$ 525,29; 03/2025→02/2026 = 1,03812500, R$ 525,29 → R$ 545,32; o produto das variações mensais da série 433 dá 1,03812497, mesma correção em centavos) e por um motor independente em Python, que reproduziu as oito linhas do caso antes de o motor TypeScript ser escrito no plano.
4. **A série 1619 traz os meses futuros do ano** (em 11/10/2026, até dez/2026 = R$ 1.621,00); jan/2027 só entra com o decreto. Daí a regra do "último publicado".
5. **A hipótese da base do caso de 2018 se confirma**: R$ 451,91 fixados em jan/2017 e reajustados pela proporção do salário mínimo (954 ÷ 937) dão exatamente R$ 460,11 em 2018; 48,23% do salário mínimo daria R$ 451,92. O caso de 2018 é recalculado pela base na Task 7 e o Anexo A é corrigido na Task 9.
6. **O relatório INPC do SAJ** (gerado em 11/10/2026 a partir da lista abaixo: base "salário mínimo do período" 0,30, de 01/01/2025 a 01/10/2026, INPC + 1% ao mês, quatro pagamentos de R$ 300,00) bate centavo a centavo nas 22 prestações e nos 4 pagamentos com a tabela do BCB: a tabela de INPC do SAJ coincide com a série 188 em todos os meses usados, e ia até ago/2026 (set e out/2026 entram sem correção, com aviso). Prova, com gabarito externo, o lote de prestações no dia 1, o lote de pagamentos e a base em 30% do salário mínimo apurada pelo motor (Task 8).
7. **O relatório SELIC do SAJ** (indexador "Taxa SELIC … Corrigido com Percentual Capitalizado Mensal", juros "Taxa Selic, sobre o juro + Selic" e aba Honorários a 10%) ensina três coisas. A coluna de correção bate com a SELIC única do Apura nas 22 linhas (vira um teste na Task 8). A coluna de juros conta a SELIC do primeiro e do último mês uma vez e a dos meses intermediários duas vezes (42,76% de jan/2025 a ago/2026, contra 22,43% da soma simples e 24,95% da capitalizada), em 20 de 20 linhas: é a dupla contagem que o Tema 1.368 do STJ afasta e que o Apura não oferece; o aviso do motor (Task 5) e o alerta da tela (fase 5) existem exatamente para isso, e nenhum caso é extraído dessa coluna. Os honorários do SAJ incidem sobre "atualização − amortização" (13.507,52 × 10% = 1.350,75), a mesma base do Apura (ponto 8, confirmado de novo).

**Gabaritos do SAJ recebidos em 11/10/2026 (Cálculo Judicial Avulso, tipo Alimentos, dados fictícios, PDFs fora do repositório):**

1. Base "valor informado" R$ 1.500,00 × 0,30, de 01/01/2025 a 01/10/2026, IGP-M + 1% ao mês, sem pagamentos → caso de % dos rendimentos e lote no dia 1 (Task 7).
2. Base "salário mínimo do período" 0,30, de 01/01/2025 a 01/10/2026, INPC + 1% ao mês, quatro pagamentos de R$ 300,00 em 10/01, 10/02, 10/03 e 10/04/2026 → caso INPC com os dois lotes (Task 8).
3. Mesma base e período, indexador Taxa SELIC capitalizada, juros "Taxa Selic sobre o juro + Selic", um pagamento (INPC + 1%) e aba Honorários a 10% → analisado na descoberta 7; só os 22 corrigidos viram teste (Task 8).

Fica em aberto só o gabarito opcional do lançamento datado no próprio dia do cálculo (Cálculo Processual Avulso, R$ 1.000,00, IGP-M + 1%), para confirmar que rende um dia de juros.

**Escolhas técnicas, dentro do que o design decidiu:**

- **`situacao` e `editado` em `LancamentoCalculado`.** A linha ignorada continua no resultado, pelo valor nominal, para a tela mostrá-la e o usuário excluí-la; só os totais a deixam de fora. A vincenda entra nos totais pelo nominal (art. 323 do CPC).
- **`base.ts` devolve `valor: Decimal | null`**, a memória, os índices usados e os meses que faltaram; `calcular` transforma `null` em linha ignorada com aviso. Assim a regra "nunca lançar erro por dado do usuário" fica num lugar só.
- **`lote.ts` é puro e é a tela quem o chama**: `gerarLotePrestacoes(lote, dataElaboracao, calculo.lancamentos)` e `gerarLoteAmortizacoes(lote, calculo.lancamentos)` devolvem os lançamentos novos, os meses pulados e os avisos; a tela acrescenta os lançamentos à lista e guarda o lote em `calculo.lotes`. Ids determinísticos (`p-AAAA-MM`, `a-AAAA-MM`, com sufixo `-2`, `-3`… se já existirem), sem relógio nem aleatoriedade.
- **Vincenda e ignorado não passam pela correção nem pelos juros** (fator 1,000000, listas vazias), o que também evita avisos de termos limitados numa linha que não é atualizada.
- **Resumos no resultado**, em frases completas: meses sem índice para o valor-base; prestações vincendas; prestações com valor informado à mão; lançamentos não computados nos totais.
- **Casos antigos continuam intactos** (só os três ajustes já previstos: `base.valor` em dois casos e o centavo da linha a-2025-06-30). Todas as prestações transcritas com valor informado passam a gerar o aviso "valor informado à mão", que os casos antigos não comparam (o campo `avisos` do esperado é opcional).

Depende de internet: Task 1 (`npm run indices:atualizar`). Todo o resto roda sem rede.

**Ensaio:** todo o código deste plano foi executado numa cópia do repositório fora dele em 11/10/2026: `npm run format && npm run verificar` verde (Prettier, ESLint, `tsc -b`, 15 arquivos e 386 testes) e `npm run build` gerando `dist/`. Os valores esperados dos casos novos vieram de dois relatórios do SAJ (22 e 26 linhas), do relatório de 2018 (28 linhas) e de um motor independente em Python conferido na Calculadora do Cidadão (8 linhas).

---

## Estrutura de arquivos desta fase

| Arquivo | Responsabilidade |
|---|---|
| `dados/indices/188.json`, `1619.json` (novos) e os quatro já existentes (atualizados) | cópia embutida das seis séries, geradas pelo script na mesma data |
| `src/indices/embutidos.ts` | tabela embutida com as seis séries; `lerArquivoSerie` confere formato e código de cada arquivo |
| `src/indices/series.ts` | nomes curtos vindos de `NOME_DA_SERIE` (uma lista só) |
| `src/motor/testes/regime-novo.ts` | fixtures: INPC (188) e salário mínimo (1619) de 2024 a 2026 ao lado das quatro séries da fase 2 |
| `src/motor/testes/indices-igpm-2017-2018.ts` | fixture: salário mínimo 2017–2018 (`tabelaIgpm(…, …, true)`) |
| `src/compartilhado/datas.ts` | `mesAnterior`, `somarMeses`, `dataNoMes` |
| `src/compartilhado/decimal.ts` | `textoDecimalValido`, `decimalOuNulo` |
| `src/compartilhado/tipos.ts` | `SituacaoLancamento`; `editado` e `situacao` em `LancamentoCalculado`; campos opcionais em `LancamentoEsperado`; `avisos` opcionais no esperado do caso |
| `src/motor/lote.ts` (novo) | `competenciasDoLote`, `gerarLotePrestacoes`, `gerarLoteAmortizacoes`, `idLivre` |
| `src/motor/base.ts` (novo) | `apurarValorBase`: as três bases, reajustes, salário mínimo vigente, memória, proveniência |
| `src/motor/periodos.ts` | aviso de SELIC única combinada com índice de correção |
| `src/motor/calcular.ts` | valor pela base, situação, valores informados à mão, texto inválido, juros sobre o corrigido bruto, proveniência da base, resumos |
| `src/motor/casos.test.ts` | campos opcionais (`valorBase`, `memoriaBase`, `situacao`, `editado`, `avisos`), avisos do resultado, tolerância proporcional |
| `src/motor/casos-pela-base.test.ts` (novo) | SAJ 2026 recalculado pela base em 30% do SM; lote → base → cálculo; os dois lotes do caso INPC; os 22 corrigidos da SELIC única |
| `src/motor/casos/2026-10-11-saj-tjms-inpc-salario-minimo-lotes.json` (novo) | gabarito do SAJ: INPC + 1%, 30% do salário mínimo em lote no dia 1 e quatro pagamentos em lote |
| `src/motor/casos/2026-10-11-saj-tjms-percentual-rendimentos-lote.json` (novo) | gabarito do SAJ: 30% × R$ 1.500,00, 22 prestações em lote no dia 1 |
| `src/motor/casos/2018-05-25-saj-tjms-base-valor-fixo-reajuste-sm.json` (novo) | o caso de 2018 com a base apurada: R$ 451,91 reajustados pelo salário mínimo |
| `src/motor/casos/2026-10-11-valor-fixo-reajuste-ipca.json` (novo) | valor fixo reajustado pelo IPCA, com prestação anterior à fixação, vincenda e pagamento posterior |
| `src/motor/casos/2026-10-11-calculadora-bcb-regime-novo.json` | um centavo na linha a-2025-06-30 (juros sobre o corrigido bruto) |
| `src/motor/casos/2026-10-11-saj-tjms-selic-capitalizada.json`, `2026-10-11-transicao-lei-14905.json` | `base.valor` corrigido para `"10000.00"` |
| `src/motor/casos/2018-05-25-saj-tjms-alimentos.json` | observações: hipótese da base confirmada |
| `docs/superpowers/roteiro.md`, `CLAUDE.md`, design (§5, §6, §7, Anexo A) | fechamento da fase |

## Como executar este plano

- Todos os comandos rodam na raiz do repositório, numa branch de trabalho (`superpowers:using-git-worktrees`). Antes de tudo: `npm install` (precisa de internet).
- Uma tarefa de cada vez, na ordem. Ciclo de cada regra: escrever o teste → rodar e vê-lo falhar (o passo diz exatamente quais testes devem falhar; se outro falhar ou se um deles passar sem o código, pare e relate) → escrever o código → rodar e ver passar → `npm run format && npm run verificar` → commit. Só se commita com tudo verde.
- Os valores esperados vêm dos relatórios do SAJ, da Calculadora do Cidadão e de aritmética decimal independente, e foram reproduzidos num ensaio do código fora do repositório. Se uma implementação não bater, a implementação está errada, não o valor esperado: pare e relate; não ajuste valores para "fazer passar".
- O Prettier pode reformatar o que foi escrito (quebras de linha); o conteúdo não muda. Os arquivos `src/motor/casos/*.json` são ignorados pelo Prettier de propósito (um lançamento por linha).
- Arquivos marcados "reescrito" são substituídos por inteiro pelo conteúdo do passo; os demais recebem as edições indicadas, com o texto antigo e o novo.
- Relatórios de subagentes vão em `.txt` (eles não gravam `.md`).
- Mensagens de commit no formato "módulo: o que muda", com a linha de coautoria do modelo em uso ao final.

---
### Task 1: Séries embutidas: as seis atualizadas (INPC e salário mínimo novas), leitura checada, nomes num lugar só e dados de teste

**Files:**
- Create: `dados/indices/188.json`, `dados/indices/1619.json` (gerados pelo script)
- Modify: `dados/indices/189.json`, `433.json`, `29543.json`, `4390.json` (atualizados pelo script), `src/indices/embutidos.ts` (reescrito), `src/indices/series.ts`, `src/motor/testes/regime-novo.ts` (reescrito), `src/motor/testes/indices-igpm-2017-2018.ts` (reescrito), `src/motor/calcular.test.ts` (uma expectativa)
- Test: `src/indices/embutidos.test.ts` (reescrito)

**Interfaces:**
- Consome: `interpretarRespostaSgs`, `montarArquivoSerie`, `SERIES`, `urlDaSerie` (fase 1); tipos `ArquivoSerie`, `CodigoSerie`, `TabelaIndices`, `ValorIndice`, `Competencia`; `NOME_DA_SERIE`.
- Produz:
  - `tabelaEmbutida(): TabelaIndices` com as seis séries (`"188"`, `"189"`, `"433"`, `"1619"`, `"29543"`, `"4390"`).
  - `lerArquivoSerie(dado: unknown, codigo: CodigoSerie): ArquivoSerie` — lança erro se o formato não for `"apura/serie@1"`, se o código não bater, se faltar `obtidoEm` ou se `valores` não for lista.
  - `tabelaRegimeNovo(limites?)` passa a trazer `"188"` (INPC, jan/2024 a set/2026) e `"1619"` (salário mínimo, jan/2024 a dez/2026); `REGIME_NOVO["188"]` e `REGIME_NOVO["1619"]` preenchidos.
  - `tabelaIgpm(ateCompetencia?, excluir?, comSalarioMinimo = false)`: com `true`, acrescenta a série `"1619"` de jan/2017 a fev/2018; `SALARIO_MINIMO_2017_2018` exportado.
  - As Tasks 4, 6 e 7 usam `tabelaRegimeNovo()` e `tabelaIgpm(…, …, true)`.

- [ ] **Step 1: Baixar as seis séries juntas (precisa de internet)**

Execute: `npm run indices:atualizar`
Esperado (seis linhas; os últimos meses podem ser mais recentes que estes, conforme a data da execução; o que importa é que as seis saiam na mesma rodada, para que a data da consulta e o mês parcial da SELIC fiquem coerentes):

```text
433 (IPCA): 561 meses, último 2026-09 = 0.82
188 (INPC): 570 meses, último 2026-09 = 0.82
189 (IGP-M): 448 meses, último 2026-09 = 1.57
1619 (salário mínimo): 443 meses, último 2026-12 = 1621.00
29543 (taxa legal): 27 meses, último 2026-10 = 0.379020
4390 (SELIC): 483 meses, último 2026-10 = 0.36
```

Confira: `dados/indices/188.json` começa em `"1979-04"` com `"3.45"` e tem `"2025-01"` com `"0.00"`; `dados/indices/1619.json` começa em `"1990-02"` com `"2004.37"`, tem `"2017-01"` com `"937.00"`, `"2018-01"` com `"954.00"`, `"2024-01"` com `"1412.00"`, `"2025-01"` com `"1518.00"` e `"2026-01"` a `"2026-12"` com `"1621.00"`. Se a execução cair em 2027 e o decreto do salário mínimo já tiver saído, a série trará também os meses de 2027: os testes não dependem deles.

- [ ] **Step 2: Escrever o teste**

Substitua `src/indices/embutidos.test.ts` por:

```ts
import { describe, expect, it } from "vitest";
import type { CasoDeReferencia } from "../compartilhado/tipos.ts";
import { calcular } from "../motor/calcular.ts";
import textoDoCaso from "../motor/casos/2018-05-25-saj-tjms-alimentos.json?raw";
import { lerArquivoSerie, tabelaEmbutida } from "./embutidos.ts";

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

  it("traz o IPCA, a taxa legal e a SELIC do regime novo", () => {
    expect(tabela.series["433"]?.["1980-01"]?.valor).toBe("6.62");
    expect(tabela.series["433"]?.["2024-08"]?.valor).toBe("-0.02");
    expect(tabela.series["29543"]?.["2024-08"]?.valor).toBe("0.605306");
    expect(tabela.series["29543"]?.["2025-03"]?.valor).toBe("0.000000");
    expect(tabela.series["4390"]?.["1986-08"]?.valor).toBe("2.57");
    expect(tabela.series["4390"]?.["2024-03"]?.valor).toBe("0.83");
  });

  it("traz o INPC desde abr/1979 e o salário mínimo desde fev/1990, com os meses futuros do ano já publicados", () => {
    expect(tabela.series["188"]?.["1979-04"]?.valor).toBe("3.45");
    expect(tabela.series["188"]?.["2017-01"]?.valor).toBe("0.42");
    expect(tabela.series["188"]?.["2025-01"]?.valor).toBe("0.00");
    expect(tabela.series["188"]?.["2026-09"]?.valor).toBe("0.82");
    expect(tabela.series["1619"]?.["1990-02"]?.valor).toBe("2004.37");
    expect(tabela.series["1619"]?.["2017-01"]?.valor).toBe("937.00");
    expect(tabela.series["1619"]?.["2018-01"]?.valor).toBe("954.00");
    expect(tabela.series["1619"]?.["2023-04"]?.valor).toBe("1302.00");
    expect(tabela.series["1619"]?.["2023-05"]?.valor).toBe("1320.00");
    expect(tabela.series["1619"]?.["2024-01"]?.valor).toBe("1412.00");
    expect(tabela.series["1619"]?.["2025-01"]?.valor).toBe("1518.00");
    expect(tabela.series["1619"]?.["2026-01"]?.valor).toBe("1621.00");
    expect(tabela.series["1619"]?.["2026-12"]?.valor).toBe("1621.00");
  });

  it("recusa arquivo de série em formato inesperado", () => {
    expect(() =>
      lerArquivoSerie(
        { formato: "apura/serie@1", codigo: "189", obtidoEm: "x", valores: [] },
        "188",
      ),
    ).toThrow("Arquivo da série 188 em formato inesperado.");
    expect(() =>
      lerArquivoSerie({ formato: "outro", codigo: "188", obtidoEm: "x", valores: [] }, "188"),
    ).toThrow();
    expect(() =>
      lerArquivoSerie({ formato: "apura/serie@1", codigo: "188", obtidoEm: "x" }, "188"),
    ).toThrow();
    expect(() => lerArquivoSerie(null, "188")).toThrow();
    expect(
      lerArquivoSerie(
        {
          formato: "apura/serie@1",
          codigo: "188",
          nome: "",
          origem: "",
          obtidoEm: "x",
          valores: [],
        },
        "188",
      ).codigo,
    ).toBe("188");
  });

  it("marca a proveniência de cada valor; a data da consulta é a obtenção mais recente", () => {
    expect(tabela.consultadoEm).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    for (const serie of ["188", "189", "433", "1619", "29543", "4390"] as const) {
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

Execute: `npm test -- src/indices/embutidos.test.ts`
Esperado: falham exatamente três testes e passam três: "traz o INPC desde abr/1979 e o salário mínimo desde fev/1990…" (`tabela.series["188"]` é `undefined`), "recusa arquivo de série em formato inesperado" (`lerArquivoSerie is not a function`: o Vite não derruba o arquivo por uma exportação ausente, só a chamada falha) e "marca a proveniência de cada valor…" (as séries 188 e 1619 vêm vazias).

- [ ] **Step 4: Reescrever `src/indices/embutidos.ts` e unificar os nomes em `src/indices/series.ts`**

Substitua `src/indices/embutidos.ts` por:

```ts
import type {
  ArquivoSerie,
  CodigoSerie,
  Competencia,
  TabelaIndices,
  ValorIndice,
} from "../compartilhado/tipos.ts";
import inpc from "../../dados/indices/188.json" with { type: "json" };
import igpm from "../../dados/indices/189.json" with { type: "json" };
import ipca from "../../dados/indices/433.json" with { type: "json" };
import salarioMinimo from "../../dados/indices/1619.json" with { type: "json" };
import taxaLegal from "../../dados/indices/29543.json" with { type: "json" };
import selic from "../../dados/indices/4390.json" with { type: "json" };

/**
 * Confere o formato e o código de um arquivo de série antes de usá-lo: os JSON são importados sem
 * checagem de tipo, e um arquivo trocado ou de formato antigo deve falhar aqui, não no cálculo.
 */
export function lerArquivoSerie(dado: unknown, codigo: CodigoSerie): ArquivoSerie {
  const arquivo = dado as Partial<ArquivoSerie> | null;
  if (
    typeof arquivo !== "object" ||
    arquivo === null ||
    arquivo.formato !== "apura/serie@1" ||
    arquivo.codigo !== codigo ||
    typeof arquivo.obtidoEm !== "string" ||
    !Array.isArray(arquivo.valores)
  ) {
    throw new Error(`Arquivo da série ${codigo} em formato inesperado.`);
  }
  return arquivo as ArquivoSerie;
}

/** As seis séries do catálogo (§8.1), com cópia embutida gerada por `scripts/atualizar-indices.ts`. */
const ARQUIVOS: Record<CodigoSerie, ArquivoSerie> = {
  "188": lerArquivoSerie(inpc, "188"),
  "189": lerArquivoSerie(igpm, "189"),
  "433": lerArquivoSerie(ipca, "433"),
  "1619": lerArquivoSerie(salarioMinimo, "1619"),
  "29543": lerArquivoSerie(taxaLegal, "29543"),
  "4390": lerArquivoSerie(selic, "4390"),
};

/**
 * Tabela de índices montada só com a cópia embutida (sem rede). `consultadoEm` é a data de
 * obtenção mais recente entre os arquivos. A fase 4 parte daqui para cache e busca ao vivo.
 */
export function tabelaEmbutida(): TabelaIndices {
  const series: TabelaIndices["series"] = {};
  let consultadoEm = "";
  for (const arquivo of Object.values(ARQUIVOS)) {
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

Em `src/indices/series.ts`: acrescente, depois de `import { formatarData } from "../compartilhado/formatacao.ts";`, a linha `import { NOME_DA_SERIE } from "../compartilhado/tipos.ts";`; troque o comentário `/** As seis séries do SGS usadas pelo Apura (§8.1 do design). */` por `/** As seis séries do SGS usadas pelo Apura (§8.1 do design); o nome curto vem de \`NOME_DA_SERIE\`, para não haver duas listas. */`; e, em cada uma das seis entradas, troque o nome literal pela referência: `nome: "IPCA",` → `nome: NOME_DA_SERIE["433"],`; `nome: "INPC",` → `nome: NOME_DA_SERIE["188"],`; `nome: "IGP-M",` → `nome: NOME_DA_SERIE["189"],`; `nome: "salário mínimo",` → `nome: NOME_DA_SERIE["1619"],`; `nome: "taxa legal",` → `nome: NOME_DA_SERIE["29543"],`; `nome: "SELIC",` → `nome: NOME_DA_SERIE["4390"],`.

- [ ] **Step 5: Rodar e ver passar**

Execute: `npm test -- src/indices`
Esperado: todos passam (6 testes em `embutidos.test.ts`, mais os do cliente BCB).

- [ ] **Step 6: Dados de teste com INPC e salário mínimo (primeiro a expectativa, depois a fixture)**

Em `src/motor/calcular.test.ts`, no teste "regime novo de ponta a ponta: IPCA e taxa legal conferidos na Calculadora do Cidadão", troque

```ts
    expect(r.consultaIndices.series).toEqual(["189", "433", "4390", "29543"]);
    expect(r.consultaIndices.ultimoMesPorSerie).toEqual({
      "189": "2026-09",
      "433": "2026-09",
      "4390": "2026-10",
      "29543": "2026-10",
    });
```

por

```ts
    // séries em ordem numérica (como texto, "1619" viria antes de "188")
    expect(r.consultaIndices.series).toEqual(["188", "189", "433", "1619", "4390", "29543"]);
    expect(r.consultaIndices.ultimoMesPorSerie).toEqual({
      "188": "2026-09",
      "189": "2026-09",
      "433": "2026-09",
      "1619": "2026-12",
      "4390": "2026-10",
      "29543": "2026-10",
    });
```

Execute: `npm test -- src/motor/calcular.test.ts`
Esperado: falha só "regime novo de ponta a ponta…" (recebe quatro séries).

Substitua `src/motor/testes/regime-novo.ts` por (valores das séries do BCB como estavam em 11/10/2026; fixos: não os troque pelos de um download posterior, porque casos e testes dependem deles):

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
 * Séries do BCB como estavam em 11/10/2026: IGP-M (189), IPCA (433) e INPC (188) de jan/2024 a
 * set/2026, taxa legal (29543) de ago/2024 a out/2026, SELIC (4390) de jan/2024 a out/2026, cujo
 * valor de out/2026 é o acumulado parcial do mês corrente, e salário mínimo (1619) de jan/2024 a
 * dez/2026. Fonte: dados/indices/*.json baixados em 11/10/2026.
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
  // INPC
  "188": {
    "2024-01": "0.57",
    "2024-02": "0.81",
    "2024-03": "0.19",
    "2024-04": "0.37",
    "2024-05": "0.46",
    "2024-06": "0.25",
    "2024-07": "0.26",
    "2024-08": "-0.14",
    "2024-09": "0.48",
    "2024-10": "0.61",
    "2024-11": "0.33",
    "2024-12": "0.48",
    "2025-01": "0.00",
    "2025-02": "1.48",
    "2025-03": "0.51",
    "2025-04": "0.48",
    "2025-05": "0.35",
    "2025-06": "0.23",
    "2025-07": "0.21",
    "2025-08": "-0.21",
    "2025-09": "0.52",
    "2025-10": "0.03",
    "2025-11": "0.03",
    "2025-12": "0.21",
    "2026-01": "0.39",
    "2026-02": "0.56",
    "2026-03": "0.91",
    "2026-04": "0.81",
    "2026-05": "0.65",
    "2026-06": "0.14",
    "2026-07": "-0.01",
    "2026-08": "-0.32",
    "2026-09": "0.82",
  },
  // salário mínimo (os meses futuros do ano já publicados, §8.1)
  "1619": {
    "2024-01": "1412.00",
    "2024-02": "1412.00",
    "2024-03": "1412.00",
    "2024-04": "1412.00",
    "2024-05": "1412.00",
    "2024-06": "1412.00",
    "2024-07": "1412.00",
    "2024-08": "1412.00",
    "2024-09": "1412.00",
    "2024-10": "1412.00",
    "2024-11": "1412.00",
    "2024-12": "1412.00",
    "2025-01": "1518.00",
    "2025-02": "1518.00",
    "2025-03": "1518.00",
    "2025-04": "1518.00",
    "2025-05": "1518.00",
    "2025-06": "1518.00",
    "2025-07": "1518.00",
    "2025-08": "1518.00",
    "2025-09": "1518.00",
    "2025-10": "1518.00",
    "2025-11": "1518.00",
    "2025-12": "1518.00",
    "2026-01": "1621.00",
    "2026-02": "1621.00",
    "2026-03": "1621.00",
    "2026-04": "1621.00",
    "2026-05": "1621.00",
    "2026-06": "1621.00",
    "2026-07": "1621.00",
    "2026-08": "1621.00",
    "2026-09": "1621.00",
    "2026-10": "1621.00",
    "2026-11": "1621.00",
    "2026-12": "1621.00",
  },
};

/**
 * Tabela congelada em 11/10/2026 com as seis séries. `limites` corta uma série numa competência
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

Substitua `src/motor/testes/indices-igpm-2017-2018.ts` por:

```ts
import type { Competencia, TabelaIndices, ValorIndice } from "../../compartilhado/tipos.ts";

/** IGP-M (série 189 do BCB), variação % mensal, jan/2017 a mai/2018 (Anexo A do design). */
export const IGPM_2017_2018: Record<Competencia, string> = {
  "2017-01": "0.64",
  "2017-02": "0.08",
  "2017-03": "0.01",
  "2017-04": "-1.10",
  "2017-05": "-0.93",
  "2017-06": "-0.67",
  "2017-07": "-0.72",
  "2017-08": "0.10",
  "2017-09": "0.47",
  "2017-10": "0.20",
  "2017-11": "0.52",
  "2017-12": "0.89",
  "2018-01": "0.76",
  "2018-02": "0.07",
  "2018-03": "0.64",
  "2018-04": "0.57",
  "2018-05": "1.38",
};

/** Salário mínimo (série 1619 do BCB), R$ por mês, jan/2017 a fev/2018: R$ 937,00 em 2017 e R$ 954,00 em 2018. */
export const SALARIO_MINIMO_2017_2018: Record<Competencia, string> = {
  "2017-01": "937.00",
  "2017-02": "937.00",
  "2017-03": "937.00",
  "2017-04": "937.00",
  "2017-05": "937.00",
  "2017-06": "937.00",
  "2017-07": "937.00",
  "2017-08": "937.00",
  "2017-09": "937.00",
  "2017-10": "937.00",
  "2017-11": "937.00",
  "2017-12": "937.00",
  "2018-01": "954.00",
  "2018-02": "954.00",
};

/**
 * Tabela congelada como estava em 25/05/2018 (até abr/2018, por padrão; maio ainda não
 * divulgado). `ateCompetencia` muda o último mês; `excluir` remove meses para simular lacunas;
 * `comSalarioMinimo` acrescenta a série 1619 de jan/2017 a fev/2018.
 */
export function tabelaIgpm(
  ateCompetencia: Competencia = "2018-04",
  excluir: Competencia[] = [],
  comSalarioMinimo = false,
): TabelaIndices {
  const valores: Record<Competencia, ValorIndice> = {};
  for (const [competencia, valor] of Object.entries(IGPM_2017_2018)) {
    if (competencia <= ateCompetencia && !excluir.includes(competencia)) {
      valores[competencia] = { valor, fonte: "embutida", obtidoEm: "2026-10-10T00:00:00.000Z" };
    }
  }
  const series: TabelaIndices["series"] = { "189": valores };
  if (comSalarioMinimo) {
    const salarios: Record<Competencia, ValorIndice> = {};
    for (const [competencia, valor] of Object.entries(SALARIO_MINIMO_2017_2018)) {
      salarios[competencia] = { valor, fonte: "embutida", obtidoEm: "2026-10-10T00:00:00.000Z" };
    }
    series["1619"] = salarios;
  }
  return { consultadoEm: "2018-05-25T00:00:00.000Z", series };
}
```

Execute: `npm test`
Esperado: todos passam.

- [ ] **Step 7: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add dados/indices src/indices/embutidos.ts src/indices/embutidos.test.ts src/indices/series.ts src/motor/testes/regime-novo.ts src/motor/testes/indices-igpm-2017-2018.ts src/motor/calcular.test.ts && git commit -m "índices: cópia embutida do INPC e do salário mínimo, leitura checada e dados de teste da fase 3" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

### Task 2: Datas e decimal: mês anterior, soma de meses, data no mês e texto decimal válido

**Files:**
- Modify: `src/compartilhado/datas.ts`, `src/compartilhado/decimal.ts`
- Test: `src/compartilhado/datas.test.ts`, `src/compartilhado/decimal.test.ts`

**Interfaces:**
- Consome: `decomporCompetencia`, `comporCompetencia`, `compor`, `diasDoMes` (fase 1); `Decimal`.
- Produz:
  - `mesAnterior(competencia: Competencia): Competencia` — `"2018-01"` → `"2017-12"`.
  - `somarMeses(competencia: Competencia, n: number): Competencia` — `n` negativo anda para trás.
  - `dataNoMes(competencia: Competencia, dia: number): DataISO` — dia maior que o mês tem vira o último dia do mês.
  - `textoDecimalValido(texto: string): boolean` — aceita `^-?\d+(\.\d+)?$`.
  - `decimalOuNulo(texto: string | undefined): Decimal | null`.
  - Usadas pelas Tasks 3, 4 e 6.

- [ ] **Step 1: Escrever os testes**

Em `src/compartilhado/datas.test.ts`, acrescente à lista importada de `./datas.ts` os nomes `dataNoMes,` (depois de `compor,`), `mesAnterior,` (depois de `diaSeguinte,`) e `somarMeses,` (depois de `ratearPorMesCalendario,`), e, ao fim do arquivo (depois do `});` que fecha `describe("datas", …)`), acrescente:

```ts

describe("datas (fase 3)", () => {
  it("anda meses para trás e para a frente", () => {
    expect(mesAnterior("2018-01")).toBe("2017-12");
    expect(mesAnterior("2018-02")).toBe("2018-01");
    expect(somarMeses("2024-03", 12)).toBe("2025-03");
    expect(somarMeses("2024-03", -3)).toBe("2023-12");
    expect(somarMeses("2024-11", 2)).toBe("2025-01");
    expect(somarMeses("2024-03", 0)).toBe("2024-03");
  });

  it("dia que o mês não tem vira o último dia do mês (dia 31 em mês curto, fevereiro bissexto ou não)", () => {
    expect(dataNoMes("2026-01", 31)).toBe("2026-01-31");
    expect(dataNoMes("2026-04", 31)).toBe("2026-04-30");
    expect(dataNoMes("2026-02", 31)).toBe("2026-02-28");
    expect(dataNoMes("2024-02", 31)).toBe("2024-02-29");
    expect(dataNoMes("2024-02", 29)).toBe("2024-02-29");
    expect(dataNoMes("2025-02", 29)).toBe("2025-02-28");
    expect(dataNoMes("2026-10", 5)).toBe("2026-10-05");
  });
});
```

Em `src/compartilhado/decimal.test.ts`, troque a linha de importação `import { arredondar, decimal, Decimal, paraTexto, CEM, UM, ZERO } from "./decimal.ts";` por

```ts
import {
  arredondar,
  decimal,
  Decimal,
  decimalOuNulo,
  paraTexto,
  textoDecimalValido,
  CEM,
  UM,
  ZERO,
} from "./decimal.ts";
```

e acrescente ao fim do arquivo:

```ts

describe("texto decimal válido", () => {
  it("aceita dígitos com ponto decimal e sinal; recusa vírgula, vazio, NaN, Infinity e expoente", () => {
    for (const valido of ["451.91", "-1.10", "30", "0", "0.000000", "10000.00"]) {
      expect(textoDecimalValido(valido), valido).toBe(true);
      expect(decimalOuNulo(valido)?.toString()).toBe(new Decimal(valido).toString());
    }
    for (const invalido of [
      "1,5",
      "",
      " ",
      "NaN",
      "Infinity",
      "-Infinity",
      "1e5",
      "R$ 10",
      "1.",
      ".5",
      "abc",
    ]) {
      expect(textoDecimalValido(invalido), JSON.stringify(invalido)).toBe(false);
      expect(decimalOuNulo(invalido), JSON.stringify(invalido)).toBeNull();
    }
    expect(decimalOuNulo(undefined)).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Execute: `npm test -- src/compartilhado`
Esperado: falham exatamente os três testes novos, com `TypeError: … is not a function` ("anda meses para trás e para a frente", "dia que o mês não tem vira o último dia do mês…" e "aceita dígitos com ponto decimal e sinal…"); os 14 testes antigos passam.

- [ ] **Step 3: Implementar**

Acrescente ao fim de `src/compartilhado/datas.ts`:

```ts

/** Competência anterior: "2018-01" → "2017-12". */
export function mesAnterior(competencia: Competencia): Competencia {
  const { ano, mes } = decomporCompetencia(competencia);
  return mes === 1 ? comporCompetencia(ano - 1, 12) : comporCompetencia(ano, mes - 1);
}

/** Soma `n` meses à competência (negativo anda para trás): somarMeses("2024-03", 12) = "2025-03". */
export function somarMeses(competencia: Competencia, n: number): Competencia {
  const { ano, mes } = decomporCompetencia(competencia);
  const total = ano * 12 + (mes - 1) + n;
  return comporCompetencia(Math.floor(total / 12), (((total % 12) + 12) % 12) + 1);
}

/**
 * Data no mês da competência com o dia pedido; dia que o mês não tem (31 em abril, 29 a 31 em
 * fevereiro) vira o último dia do mês (§6.1): dataNoMes("2026-02", 31) = "2026-02-28".
 */
export function dataNoMes(competencia: Competencia, dia: number): DataISO {
  const { ano, mes } = decomporCompetencia(competencia);
  return compor(ano, mes, Math.min(dia, diasDoMes(ano, mes)));
}
```

Acrescente ao fim de `src/compartilhado/decimal.ts`:

```ts

const FORMATO_TEXTO_DECIMAL = /^-?\d+(\.\d+)?$/;

/**
 * Texto decimal que o motor aceita: dígitos com ponto decimal e sinal opcionais ("451.91", "-1.10",
 * "30"). Recusa vírgula, vazio, espaços, "NaN", "Infinity" e notação com expoente.
 */
export function textoDecimalValido(texto: string): boolean {
  return FORMATO_TEXTO_DECIMAL.test(texto);
}

/** `Decimal` do texto quando ele é válido; `null` caso contrário (o motor avisa em vez de lançar erro). */
export function decimalOuNulo(texto: string | undefined): Decimal | null {
  return texto !== undefined && textoDecimalValido(texto) ? new Decimal(texto) : null;
}
```

- [ ] **Step 4: Rodar e ver passar**

Execute: `npm test`
Esperado: todos passam.

- [ ] **Step 5: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add src/compartilhado/datas.ts src/compartilhado/datas.test.ts src/compartilhado/decimal.ts src/compartilhado/decimal.test.ts && git commit -m "compartilhado: meses anterior e somados, data no mês e texto decimal válido" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

### Task 3: Lote: prestações por dia de vencimento e pagamentos mensais, cumulativos e sem duplicar

**Files:**
- Create: `src/motor/lote.ts`
- Test: `src/motor/lote.test.ts`

**Interfaces:**
- Consome: `competenciaDe`, `competenciasEntre`, `competenciaValida`, `dataNoMes`, `mesAnterior` (datas); `decimalOuNulo` (decimal); `formatarCompetencia`; tipos `Lancamento`, `LotePrestacoes`, `LoteAmortizacoes`, `Competencia`, `DataISO`.
- Produz (usadas pela tela na fase 5 e pelo teste de ponta a ponta da Task 7):
  - `interface LoteGerado { lancamentos: Lancamento[]; pulados: Competencia[]; avisos: string[] }`.
  - `competenciasDoLote(lote: LotePrestacoes, dataElaboracao: DataISO): { competencias: Competencia[]; avisos: string[] }` — intervalo de/até quando informado; senão "N meses em atraso".
  - `gerarLotePrestacoes(lote: LotePrestacoes, dataElaboracao: DataISO, existentes: Lancamento[]): LoteGerado` — prestações sem `valorInformado`, `origem: "lote"`, `editado: false`, id `p-AAAA-MM`; pula competências já existentes entre as prestações.
  - `gerarLoteAmortizacoes(lote: LoteAmortizacoes, existentes: Lancamento[]): LoteGerado` — amortizações com `valorInformado`, descrição "Pagamento parcial", id `a-AAAA-MM`; pula meses que já têm amortização (pelo mês da data).
  - `idLivre(prefixo: string, existentes: Lancamento[]): string`.

- [ ] **Step 1: Escrever o teste**

Crie `src/motor/lote.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Lancamento } from "../compartilhado/tipos.ts";
import { competenciasDoLote, gerarLoteAmortizacoes, gerarLotePrestacoes, idLivre } from "./lote.ts";

describe("lote de prestações (§6.1)", () => {
  it("N meses em atraso: a última prestação é a do vencimento mais recente que não ultrapassa a data de elaboração", () => {
    expect(competenciasDoLote({ diaVencimento: 5, mesesEmAtraso: 3 }, "2026-10-10")).toEqual({
      competencias: ["2026-08", "2026-09", "2026-10"],
      avisos: [],
    });
    expect(competenciasDoLote({ diaVencimento: 5, mesesEmAtraso: 3 }, "2026-10-03")).toEqual({
      competencias: ["2026-07", "2026-08", "2026-09"],
      avisos: [],
    });
    // elaboração no próprio dia do vencimento: a prestação do dia conta
    expect(
      competenciasDoLote({ diaVencimento: 5, mesesEmAtraso: 1 }, "2026-10-05").competencias,
    ).toEqual(["2026-10"]);
    // virada de ano
    expect(
      competenciasDoLote({ diaVencimento: 10, mesesEmAtraso: 3 }, "2026-01-05").competencias,
    ).toEqual(["2025-10", "2025-11", "2025-12"]);
  });

  it("dia 31 em mês curto: fevereiro (bissexto ou não) e abril caem no último dia; a comparação com a data de elaboração usa o dia real", () => {
    const r = gerarLotePrestacoes(
      { diaVencimento: 31, de: "2024-01", ate: "2024-04" },
      "2026-10-11",
      [],
    );
    expect(r.lancamentos.map((l) => l.data)).toEqual([
      "2024-01-31",
      "2024-02-29",
      "2024-03-31",
      "2024-04-30",
    ]);
    expect(
      gerarLotePrestacoes({ diaVencimento: 31, de: "2025-02", ate: "2025-02" }, "2026-10-11", [])
        .lancamentos[0]?.data,
    ).toBe("2025-02-28");
    // dia 31, elaboração em 28/02/2026: fev/2026 vence em 28/02 e conta como a última
    expect(
      competenciasDoLote({ diaVencimento: 31, mesesEmAtraso: 2 }, "2026-02-28").competencias,
    ).toEqual(["2026-01", "2026-02"]);
    // dia 31, elaboração em 27/02/2026: fev/2026 ainda não venceu
    expect(
      competenciasDoLote({ diaVencimento: 31, mesesEmAtraso: 2 }, "2026-02-27").competencias,
    ).toEqual(["2025-12", "2026-01"]);
  });

  it("intervalo de competências gera uma prestação por mês, sem valor informado, com origem lote", () => {
    const r = gerarLotePrestacoes(
      { diaVencimento: 10, de: "2026-08", ate: "2026-10" },
      "2026-10-11",
      [],
    );
    expect(r.lancamentos).toEqual([
      {
        id: "p-2026-08",
        tipo: "prestacao",
        data: "2026-08-10",
        competencia: "2026-08",
        origem: "lote",
        editado: false,
      },
      {
        id: "p-2026-09",
        tipo: "prestacao",
        data: "2026-09-10",
        competencia: "2026-09",
        origem: "lote",
        editado: false,
      },
      {
        id: "p-2026-10",
        tipo: "prestacao",
        data: "2026-10-10",
        competencia: "2026-10",
        origem: "lote",
        editado: false,
      },
    ]);
    expect(r.pulados).toEqual([]);
    expect(r.avisos).toEqual([]);
  });

  it("lotes cumulativos: competências já lançadas (de lote ou avulsas) são puladas, com aviso; um lote que se sobrepõe a outro só acrescenta as novas", () => {
    const primeiro = gerarLotePrestacoes(
      { diaVencimento: 10, de: "2026-06", ate: "2026-08" },
      "2026-10-11",
      [],
    );
    const avulsa: Lancamento = {
      id: "x",
      tipo: "prestacao",
      data: "2026-09-20",
      competencia: "2026-09",
      valorInformado: "100.00",
      origem: "avulso",
      editado: true,
    };
    const existentes = [...primeiro.lancamentos, avulsa];
    const segundo = gerarLotePrestacoes(
      { diaVencimento: 10, de: "2026-07", ate: "2026-10" },
      "2026-10-11",
      existentes,
    );
    expect(segundo.lancamentos.map((l) => l.id)).toEqual(["p-2026-10"]);
    expect(segundo.pulados).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(segundo.avisos).toEqual([
      "Competências já lançadas, não repetidas: jul/2026, ago/2026, set/2026.",
    ]);
    const terceiro = gerarLotePrestacoes(
      { diaVencimento: 10, de: "2026-06", ate: "2026-08" },
      "2026-10-11",
      existentes,
    );
    expect(terceiro.lancamentos).toEqual([]);
    expect(terceiro.avisos).toEqual([
      "Competências já lançadas, não repetidas: jun/2026, jul/2026, ago/2026.",
      "Nenhuma prestação nova: todas as competências do lote já estavam lançadas.",
    ]);
  });

  it("ids não colidem com os existentes", () => {
    const existentes: Lancamento[] = [
      {
        id: "p-2026-08",
        tipo: "prestacao",
        data: "2026-08-10",
        competencia: "2026-07",
        origem: "avulso",
        editado: true,
      },
    ];
    expect(idLivre("p-2026-08", existentes)).toBe("p-2026-08-2");
    const r = gerarLotePrestacoes(
      { diaVencimento: 10, de: "2026-08", ate: "2026-08" },
      "2026-10-11",
      existentes,
    );
    expect(r.lancamentos[0]?.id).toBe("p-2026-08-2");
  });

  it("entradas incompletas ou inválidas geram aviso e nenhuma prestação, sem erro", () => {
    expect(competenciasDoLote({ diaVencimento: 10 }, "2026-10-11")).toEqual({
      competencias: [],
      avisos: ["Informe quantos meses estão em atraso (1 ou mais) ou o intervalo de competências."],
    });
    expect(
      competenciasDoLote({ diaVencimento: 10, mesesEmAtraso: 0 }, "2026-10-11").competencias,
    ).toEqual([]);
    expect(competenciasDoLote({ diaVencimento: 0, mesesEmAtraso: 2 }, "2026-10-11").avisos).toEqual(
      ["Dia do vencimento inválido (0): informe um dia de 1 a 31."],
    );
    expect(
      competenciasDoLote({ diaVencimento: 32, mesesEmAtraso: 2 }, "2026-10-11").competencias,
    ).toEqual([]);
    expect(competenciasDoLote({ diaVencimento: 10, de: "2026-08" }, "2026-10-11").avisos).toEqual([
      "Informe as competências inicial e final do lote (mês/ano).",
    ]);
    expect(
      competenciasDoLote({ diaVencimento: 10, de: "2026-10", ate: "2026-08" }, "2026-10-11").avisos,
    ).toEqual([
      "Competência final (ago/2026) anterior à inicial (out/2026): nenhuma prestação lançada.",
    ]);
  });
});

describe("lote de pagamentos (§6.2)", () => {
  it("gera um pagamento por mês, com valor, dia e descrição, pulando meses que já têm pagamento", () => {
    const existente: Lancamento = {
      id: "a-2026-02",
      tipo: "amortizacao",
      data: "2026-02-20",
      descricao: "Pagamento avulso",
      valorInformado: "150.00",
      origem: "avulso",
      editado: true,
    };
    const r = gerarLoteAmortizacoes(
      { valorMensal: "300.00", diaPagamento: 31, de: "2026-01", ate: "2026-04" },
      [existente],
    );
    expect(r.lancamentos).toEqual([
      {
        id: "a-2026-01",
        tipo: "amortizacao",
        data: "2026-01-31",
        descricao: "Pagamento parcial",
        valorInformado: "300.00",
        origem: "lote",
        editado: false,
      },
      {
        id: "a-2026-03",
        tipo: "amortizacao",
        data: "2026-03-31",
        descricao: "Pagamento parcial",
        valorInformado: "300.00",
        origem: "lote",
        editado: false,
      },
      {
        id: "a-2026-04",
        tipo: "amortizacao",
        data: "2026-04-30",
        descricao: "Pagamento parcial",
        valorInformado: "300.00",
        origem: "lote",
        editado: false,
      },
    ]);
    expect(r.pulados).toEqual(["2026-02"]);
    expect(r.avisos).toEqual(["Meses com pagamento já lançado, não repetidos: fev/2026."]);
  });

  it("valor inválido ou não positivo, dia inválido e intervalo invertido geram aviso e nenhum pagamento", () => {
    expect(
      gerarLoteAmortizacoes(
        { valorMensal: "1,5", diaPagamento: 10, de: "2026-01", ate: "2026-02" },
        [],
      ).avisos,
    ).toEqual([
      'Valor mensal do pagamento inválido ou não positivo ("1,5"): nenhum pagamento lançado.',
    ]);
    expect(
      gerarLoteAmortizacoes(
        { valorMensal: "0", diaPagamento: 10, de: "2026-01", ate: "2026-02" },
        [],
      ).lancamentos,
    ).toEqual([]);
    expect(
      gerarLoteAmortizacoes(
        { valorMensal: "-300.00", diaPagamento: 10, de: "2026-01", ate: "2026-02" },
        [],
      ).lancamentos,
    ).toEqual([]);
    expect(
      gerarLoteAmortizacoes(
        { valorMensal: "300.00", diaPagamento: 40, de: "2026-01", ate: "2026-02" },
        [],
      ).avisos,
    ).toEqual(["Dia do pagamento inválido (40): informe um dia de 1 a 31."]);
    expect(
      gerarLoteAmortizacoes(
        { valorMensal: "300.00", diaPagamento: 10, de: "2026-03", ate: "2026-01" },
        [],
      ).avisos,
    ).toEqual(["Mês final (jan/2026) anterior ao inicial (mar/2026): nenhum pagamento lançado."]);
    expect(
      gerarLoteAmortizacoes(
        { valorMensal: "300.00", diaPagamento: 10, de: "2026-01", ate: "2026-01" },
        [
          {
            id: "a",
            tipo: "amortizacao",
            data: "2026-01-05",
            valorInformado: "1.00",
            origem: "avulso",
            editado: true,
          },
        ],
      ).avisos,
    ).toEqual([
      "Meses com pagamento já lançado, não repetidos: jan/2026.",
      "Nenhum pagamento novo: todos os meses do lote já tinham pagamento lançado.",
    ]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Execute: `npm test -- src/motor/lote.test.ts`
Esperado: o arquivo falha ao carregar: não resolve a importação de `./lote.ts`.

- [ ] **Step 3: Implementar**

Crie `src/motor/lote.ts`:

```ts
import {
  competenciaDe,
  competenciasEntre,
  competenciaValida,
  dataNoMes,
  mesAnterior,
} from "../compartilhado/datas.ts";
import { decimalOuNulo } from "../compartilhado/decimal.ts";
import { formatarCompetencia } from "../compartilhado/formatacao.ts";
import type {
  Competencia,
  DataISO,
  Lancamento,
  LoteAmortizacoes,
  LotePrestacoes,
} from "../compartilhado/tipos.ts";

export interface LoteGerado {
  /** lançamentos novos, em ordem cronológica, com origem "lote"; a tela os acrescenta a `calculo.lancamentos` */
  lancamentos: Lancamento[];
  /** competências (prestações) ou meses (pagamentos) que já estavam lançados e não foram repetidos */
  pulados: Competencia[];
  avisos: string[];
}

function diaValido(dia: number): boolean {
  return Number.isInteger(dia) && dia >= 1 && dia <= 31;
}

/** Um id que não existe na lista: `p-2026-08`, ou `p-2026-08-2`, `p-2026-08-3`… quando já houver. */
export function idLivre(prefixo: string, existentes: Lancamento[]): string {
  const ids = new Set(existentes.map((l) => l.id));
  if (!ids.has(prefixo)) return prefixo;
  for (let n = 2; ; n++) {
    const id = `${prefixo}-${n}`;
    if (!ids.has(id)) return id;
  }
}

/**
 * Competências do lote de prestações (§6.1): o intervalo de/até quando informado; senão, "N meses
 * em atraso", contados para trás a partir do último vencimento que não ultrapassa a data de
 * elaboração (dia 5, 3 meses, elaboração em 10/10/2026 → ago, set e out/2026; em 03/10/2026 →
 * jul, ago e set/2026).
 */
export function competenciasDoLote(
  lote: LotePrestacoes,
  dataElaboracao: DataISO,
): { competencias: Competencia[]; avisos: string[] } {
  if (!diaValido(lote.diaVencimento)) {
    return {
      competencias: [],
      avisos: [`Dia do vencimento inválido (${lote.diaVencimento}): informe um dia de 1 a 31.`],
    };
  }
  if (lote.de !== undefined || lote.ate !== undefined) {
    if (
      lote.de === undefined ||
      lote.ate === undefined ||
      !competenciaValida(lote.de) ||
      !competenciaValida(lote.ate)
    ) {
      return {
        competencias: [],
        avisos: ["Informe as competências inicial e final do lote (mês/ano)."],
      };
    }
    if (lote.ate < lote.de) {
      return {
        competencias: [],
        avisos: [
          `Competência final (${formatarCompetencia(lote.ate)}) anterior à inicial (${formatarCompetencia(lote.de)}): nenhuma prestação lançada.`,
        ],
      };
    }
    return { competencias: competenciasEntre(lote.de, lote.ate), avisos: [] };
  }
  const meses = lote.mesesEmAtraso;
  if (meses === undefined || !Number.isInteger(meses) || meses < 1) {
    return {
      competencias: [],
      avisos: ["Informe quantos meses estão em atraso (1 ou mais) ou o intervalo de competências."],
    };
  }
  let ultima = competenciaDe(dataElaboracao);
  if (dataNoMes(ultima, lote.diaVencimento) > dataElaboracao) ultima = mesAnterior(ultima);
  const competencias: Competencia[] = [];
  for (let atual = ultima, i = 0; i < meses; i++, atual = mesAnterior(atual)) {
    competencias.unshift(atual);
  }
  return { competencias, avisos: [] };
}

/**
 * Gera as prestações do lote, sem valor informado (o motor apura pela base, §6.3), pulando as
 * competências que já têm prestação na lista (§6.1: lotes cumulativos não duplicam). O
 * vencimento é o dia escolhido ou o último dia do mês quando o mês é mais curto.
 */
export function gerarLotePrestacoes(
  lote: LotePrestacoes,
  dataElaboracao: DataISO,
  existentes: Lancamento[],
): LoteGerado {
  const { competencias, avisos } = competenciasDoLote(lote, dataElaboracao);
  const jaLancadas = new Set(
    existentes.filter((l) => l.tipo === "prestacao").map((l) => l.competencia),
  );
  const lancamentos: Lancamento[] = [];
  const pulados: Competencia[] = [];
  for (const competencia of competencias) {
    if (jaLancadas.has(competencia)) {
      pulados.push(competencia);
      continue;
    }
    lancamentos.push({
      id: idLivre(`p-${competencia}`, [...existentes, ...lancamentos]),
      tipo: "prestacao",
      data: dataNoMes(competencia, lote.diaVencimento),
      competencia,
      origem: "lote",
      editado: false,
    });
  }
  if (pulados.length > 0) {
    avisos.push(
      `Competências já lançadas, não repetidas: ${pulados.map(formatarCompetencia).join(", ")}.`,
    );
  }
  if (competencias.length > 0 && lancamentos.length === 0) {
    avisos.push("Nenhuma prestação nova: todas as competências do lote já estavam lançadas.");
  }
  return { lancamentos, pulados, avisos };
}

/**
 * Gera um pagamento por mês do intervalo, com o valor mensal e o dia do pagamento (§6.2),
 * descrição "Pagamento parcial", pulando os meses que já têm pagamento na lista. Um segundo
 * pagamento no mesmo mês entra como pagamento avulso.
 */
export function gerarLoteAmortizacoes(
  lote: LoteAmortizacoes,
  existentes: Lancamento[],
): LoteGerado {
  const valor = decimalOuNulo(lote.valorMensal);
  if (valor === null || valor.lte(0)) {
    return {
      lancamentos: [],
      pulados: [],
      avisos: [
        `Valor mensal do pagamento inválido ou não positivo ("${lote.valorMensal}"): nenhum pagamento lançado.`,
      ],
    };
  }
  if (!diaValido(lote.diaPagamento)) {
    return {
      lancamentos: [],
      pulados: [],
      avisos: [`Dia do pagamento inválido (${lote.diaPagamento}): informe um dia de 1 a 31.`],
    };
  }
  if (!competenciaValida(lote.de) || !competenciaValida(lote.ate)) {
    return {
      lancamentos: [],
      pulados: [],
      avisos: ["Informe o mês inicial e o mês final dos pagamentos (mês/ano)."],
    };
  }
  if (lote.ate < lote.de) {
    return {
      lancamentos: [],
      pulados: [],
      avisos: [
        `Mês final (${formatarCompetencia(lote.ate)}) anterior ao inicial (${formatarCompetencia(lote.de)}): nenhum pagamento lançado.`,
      ],
    };
  }
  const jaLancados = new Set(
    existentes.filter((l) => l.tipo === "amortizacao").map((l) => competenciaDe(l.data)),
  );
  const lancamentos: Lancamento[] = [];
  const pulados: Competencia[] = [];
  const avisos: string[] = [];
  for (const competencia of competenciasEntre(lote.de, lote.ate)) {
    if (jaLancados.has(competencia)) {
      pulados.push(competencia);
      continue;
    }
    lancamentos.push({
      id: idLivre(`a-${competencia}`, [...existentes, ...lancamentos]),
      tipo: "amortizacao",
      data: dataNoMes(competencia, lote.diaPagamento),
      descricao: "Pagamento parcial",
      valorInformado: lote.valorMensal,
      origem: "lote",
      editado: false,
    });
  }
  if (pulados.length > 0) {
    avisos.push(
      `Meses com pagamento já lançado, não repetidos: ${pulados.map(formatarCompetencia).join(", ")}.`,
    );
  }
  if (lancamentos.length === 0) {
    avisos.push("Nenhum pagamento novo: todos os meses do lote já tinham pagamento lançado.");
  }
  return { lancamentos, pulados, avisos };
}
```

- [ ] **Step 4: Rodar e ver passar**

Execute: `npm test -- src/motor/lote.test.ts`
Esperado: 8 testes passam.

- [ ] **Step 5: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add src/motor/lote.ts src/motor/lote.test.ts && git commit -m "motor: lotes de prestações e de pagamentos, cumulativos e sem duplicar" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

### Task 4: Base: valor-base pelo salário mínimo, pelos rendimentos e por valor fixo com reajuste

**Files:**
- Create: `src/motor/base.ts`
- Test: `src/motor/base.test.ts`

**Interfaces:**
- Consome: `competenciaDe`, `competenciasEntre`, `comporCompetencia`, `decomporCompetencia`, `mesAnterior`, `somarMeses` (datas); `arredondar`, `CEM`, `decimal`, `decimalOuNulo`, `UM` (decimal); `formatarCompetencia`, `formatarData`, `formatarMoeda`, `formatarPercentual`; `CODIGO_DA_SERIE`; tipos `Base`, `CodigoSerie`, `Competencia`, `IndiceUsado`, `Lancamento`, `NomeIndice`, `TabelaIndices`; fixtures `tabelaRegimeNovo()` e `tabelaIgpm(…, …, true)` (Task 1).
- Produz (usada pela Task 6):
  - `interface MesSemIndice { serie: CodigoSerie; competencia: Competencia }`.
  - `interface ValorBaseApurado { valor: Decimal | null; memoria: string; indicesUsados: IndiceUsado[]; mesesSemIndice: MesSemIndice[]; avisos: string[] }`.
  - `apurarValorBase(lancamento: Lancamento, base: Base, tabela: TabelaIndices, valorCasas: number): ValorBaseApurado` — pelo mês da data do vencimento; nunca lança erro.

- [ ] **Step 1: Escrever o teste**

Crie `src/motor/base.test.ts` (os valores de reajuste vêm da Calculadora do Cidadão: IPCA 03/2024→02/2025 = 1,05057630 → R$ 525,29; 03/2025→02/2026 = 1,03812500 → R$ 545,32; mar a dez/2024 = 3,5335% → R$ 517,67; jan a dez/2025 = 4,2644% → R$ 539,75; mai/2024 = 0,46% → R$ 502,30; IGP-M de 2017 acumulado = −0,5326%; todos conferidos por aritmética decimal independente):

```ts
import { describe, expect, it } from "vitest";
import type { Base, Lancamento, TabelaIndices } from "../compartilhado/tipos.ts";
import { apurarValorBase } from "./base.ts";
import { tabelaIgpm } from "./testes/indices-igpm-2017-2018.ts";
import { tabelaRegimeNovo } from "./testes/regime-novo.ts";

function prestacao(data: string, extra: Partial<Lancamento> = {}): Lancamento {
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

const obtidoEm = "2026-10-11T12:00:00.000Z";

describe("base em percentual do salário mínimo (§6.3)", () => {
  const base: Base = { tipo: "percentualSalarioMinimo", percentual: "30" };

  it("percentual × salário mínimo do mês do vencimento, com proveniência (série 1619)", () => {
    const tabela = tabelaRegimeNovo();
    const r = apurarValorBase(prestacao("2024-03-10"), base, tabela, 2);
    expect(r.valor?.toFixed(2)).toBe("423.60");
    expect(r.memoria).toBe("30% do salário mínimo de mar/2024 (R$ 1.412,00) = R$ 423,60");
    expect(r.indicesUsados).toEqual([
      { serie: "1619", competencia: "2024-03", valor: "1412.00", fonte: "embutida", obtidoEm },
    ]);
    expect(r.avisos).toEqual([]);
    expect(r.mesesSemIndice).toEqual([]);
    expect(apurarValorBase(prestacao("2025-01-01"), base, tabela, 2).valor?.toFixed(2)).toBe(
      "455.40",
    );
    expect(apurarValorBase(prestacao("2026-10-01"), base, tabela, 2).valor?.toFixed(2)).toBe(
      "486.30",
    );
  });

  it("mês ainda sem salário mínimo publicado: usa o último anterior (vigente até o novo decreto), com aviso e mês sinalizado", () => {
    const r = apurarValorBase(prestacao("2027-01-05"), base, tabelaRegimeNovo(), 2);
    expect(r.valor?.toFixed(2)).toBe("486.30");
    expect(r.memoria).toBe(
      "30% do salário mínimo vigente em jan/2027 (R$ 1.621,00, último publicado: dez/2026) = R$ 486,30",
    );
    expect(r.avisos).toEqual([
      "Salário mínimo de jan/2027 ainda não publicado na tabela de índices: usado o de dez/2026 (R$ 1.621,00), vigente até a publicação do novo.",
    ]);
    expect(r.indicesUsados.map((i) => i.competencia)).toEqual(["2026-12"]);
    expect(r.mesesSemIndice).toEqual([{ serie: "1619", competencia: "2027-01" }]);
  });

  it("sem nenhum salário mínimo anterior na tabela: fica sem valor, com aviso", () => {
    const r = apurarValorBase(prestacao("2023-06-10"), base, tabelaRegimeNovo(), 2);
    expect(r.valor).toBeNull();
    expect(r.avisos).toEqual([
      "Salário mínimo de jun/2023 não disponível na tabela de índices: a prestação ficou sem valor; informe o valor à mão.",
    ]);
    expect(r.mesesSemIndice).toEqual([{ serie: "1619", competencia: "2023-06" }]);
    const semSerie: TabelaIndices = { consultadoEm: obtidoEm, series: {} };
    expect(apurarValorBase(prestacao("2024-03-10"), base, semSerie, 2).valor).toBeNull();
  });

  it("percentual inválido: sem valor, com aviso, sem erro", () => {
    const r = apurarValorBase(
      prestacao("2024-03-10"),
      { tipo: "percentualSalarioMinimo", percentual: "30,5" },
      tabelaRegimeNovo(),
      2,
    );
    expect(r.valor).toBeNull();
    expect(r.avisos).toEqual([
      'Percentual da base ("30,5") não é um número válido: a prestação ficou sem valor; informe o valor à mão.',
    ]);
    expect(
      apurarValorBase(
        prestacao("2024-03-10"),
        { tipo: "percentualSalarioMinimo", percentual: "48.23" },
        tabelaRegimeNovo(),
        2,
      ).memoria,
    ).toBe("48,23% do salário mínimo de mar/2024 (R$ 1.412,00) = R$ 681,01");
  });
});

describe("base em percentual dos rendimentos (§6.3)", () => {
  const base: Base = {
    tipo: "percentualRendimentos",
    percentual: "30",
    rendimentoPadrao: "1500.00",
  };
  const tabela = tabelaRegimeNovo();

  it("usa o rendimento do mês quando informado no lançamento; senão, o padrão", () => {
    const padrao = apurarValorBase(prestacao("2024-03-10"), base, tabela, 2);
    expect(padrao.valor?.toFixed(2)).toBe("450.00");
    expect(padrao.memoria).toBe("30% do rendimento padrão (R$ 1.500,00) = R$ 450,00");
    expect(padrao.indicesUsados).toEqual([]);
    const proprio = apurarValorBase(
      prestacao("2024-03-10", { rendimento: "3000.00" }),
      base,
      tabela,
      2,
    );
    expect(proprio.valor?.toFixed(2)).toBe("900.00");
    expect(proprio.memoria).toBe("30% do rendimento de mar/2024 (R$ 3.000,00) = R$ 900,00");
    // 13º salário como prestação avulsa com o rendimento do evento
    const decimoTerceiro = apurarValorBase(
      prestacao("2025-12-20", { descricao: "13º salário 2025", rendimento: "3200.00" }),
      base,
      tabela,
      2,
    );
    expect(decimoTerceiro.valor?.toFixed(2)).toBe("960.00");
    expect(decimoTerceiro.memoria).toBe("30% do rendimento de dez/2025 (R$ 3.200,00) = R$ 960,00");
  });

  it("arredonda a 2 casas e trata rendimento ou percentual inválido com aviso", () => {
    expect(
      apurarValorBase(
        prestacao("2024-03-10"),
        { ...base, percentual: "33.333" },
        tabela,
        2,
      ).valor?.toFixed(2),
    ).toBe("500.00");
    const invalido = apurarValorBase(
      prestacao("2024-03-10", { rendimento: "abc" }),
      base,
      tabela,
      2,
    );
    expect(invalido.valor).toBeNull();
    expect(invalido.avisos).toEqual([
      'Rendimento de mar/2024 ("abc") não é um número válido: a prestação ficou sem valor; informe o rendimento ou o valor à mão.',
    ]);
    const padraoInvalido = apurarValorBase(
      prestacao("2024-03-10"),
      { ...base, rendimentoPadrao: "" },
      tabela,
      2,
    );
    expect(padraoInvalido.avisos).toEqual([
      'Rendimento padrão ("") não é um número válido: a prestação ficou sem valor; informe o rendimento ou o valor à mão.',
    ]);
    expect(
      apurarValorBase(
        prestacao("2024-03-10"),
        { ...base, rendimentoPadrao: "0" },
        tabela,
        2,
      ).valor?.toFixed(2),
    ).toBe("0.00");
  });
});

describe("base em valor fixo (§6.3)", () => {
  const tabela = tabelaRegimeNovo();

  it("sem reajuste: o valor fixado, com arredondamento a 2 casas", () => {
    const base: Base = {
      tipo: "valorFixo",
      valor: "451.91",
      dataFixacao: "2017-01-10",
      indiceReajuste: "nenhum",
      mesReajuste: 1,
    };
    const r = apurarValorBase(prestacao("2018-02-10"), base, tabelaIgpm(), 2);
    expect(r.valor?.toFixed(2)).toBe("451.91");
    expect(r.memoria).toBe("Valor fixado em 10/01/2017: R$ 451,91 (sem reajuste)");
    expect(r.indicesUsados).toEqual([]);
    expect(
      apurarValorBase(
        prestacao("2018-02-10"),
        { ...base, valor: "500.005" },
        tabelaIgpm(),
        2,
      ).valor?.toFixed(2),
    ).toBe("500.01");
  });

  it("prestação anterior à data de fixação: valor fixado, sem reajuste, com aviso", () => {
    const base: Base = {
      tipo: "valorFixo",
      valor: "500.00",
      dataFixacao: "2024-03-15",
      indiceReajuste: "IPCA",
      mesReajuste: 3,
    };
    const r = apurarValorBase(prestacao("2024-01-15"), base, tabela, 2);
    expect(r.valor?.toFixed(2)).toBe("500.00");
    expect(r.memoria).toBe(
      "Valor fixado em 15/03/2024: R$ 500,00 (prestação anterior à fixação, sem reajuste)",
    );
    expect(r.avisos).toEqual([
      "Prestação de jan/2024 anterior à data de fixação (15/03/2024): usado o valor fixado, sem reajuste.",
    ]);
    // no próprio mês da fixação, mesmo antes do dia, vale o valor fixado sem aviso
    expect(apurarValorBase(prestacao("2024-03-10"), base, tabela, 2).avisos).toEqual([]);
  });

  it("valor fixado inválido: sem valor, com aviso", () => {
    const base: Base = {
      tipo: "valorFixo",
      valor: "1.500,00",
      dataFixacao: "2024-03-15",
      indiceReajuste: "nenhum",
      mesReajuste: 3,
    };
    const r = apurarValorBase(prestacao("2024-04-15"), base, tabela, 2);
    expect(r.valor).toBeNull();
    expect(r.avisos).toEqual([
      'Valor fixado ("1.500,00") não é um número válido: a prestação ficou sem valor; informe o valor à mão.',
    ]);
  });

  describe("reajuste pelo salário mínimo (proporção entre o SM do vencimento e o da fixação)", () => {
    const base: Base = {
      tipo: "valorFixo",
      valor: "451.91",
      dataFixacao: "2017-01-10",
      indiceReajuste: "SM",
      mesReajuste: 1,
    };
    const tabela2017 = tabelaIgpm("2018-04", [], true);

    it("reproduz a base do caso SAJ 2018: R$ 451,91 em 2017 e R$ 460,11 em 2018", () => {
      const em2017 = apurarValorBase(prestacao("2017-05-10"), base, tabela2017, 2);
      expect(em2017.valor?.toFixed(2)).toBe("451.91");
      expect(em2017.memoria).toBe(
        "R$ 451,91 fixados em 10/01/2017 × salário mínimo de mai/2017 (R$ 937,00) ÷ salário mínimo de jan/2017 (R$ 937,00) = R$ 451,91",
      );
      expect(em2017.indicesUsados.map((i) => `${i.serie}|${i.competencia}|${i.valor}`)).toEqual([
        "1619|2017-01|937.00",
        "1619|2017-05|937.00",
      ]);
      const em2018 = apurarValorBase(prestacao("2018-01-10"), base, tabela2017, 2);
      expect(em2018.valor?.toFixed(2)).toBe("460.11");
      expect(em2018.memoria).toBe(
        "R$ 451,91 fixados em 10/01/2017 × salário mínimo de jan/2018 (R$ 954,00) ÷ salário mínimo de jan/2017 (R$ 937,00) = R$ 460,11",
      );
      // no mês da fixação, o salário mínimo entra uma vez só na proveniência
      expect(
        apurarValorBase(prestacao("2017-01-10"), base, tabela2017, 2).indicesUsados,
      ).toHaveLength(1);
    });

    it("o mês de reajuste não interfere: o valor acompanha o salário mínimo no mês em que ele muda", () => {
      expect(
        apurarValorBase(
          prestacao("2018-01-10"),
          { ...base, mesReajuste: 6 },
          tabela2017,
          2,
        ).valor?.toFixed(2),
      ).toBe("460.11");
    });

    it("salário mínimo do vencimento ainda não publicado: usa o último, com aviso; sem o da fixação, fica sem valor", () => {
      const futuro = apurarValorBase(prestacao("2018-03-10"), base, tabela2017, 2);
      expect(futuro.valor?.toFixed(2)).toBe("460.11");
      expect(futuro.avisos).toEqual([
        "Salário mínimo de mar/2018 ainda não publicado na tabela de índices: usado o de fev/2018 (R$ 954,00), vigente até a publicação do novo.",
      ]);
      expect(futuro.mesesSemIndice).toEqual([{ serie: "1619", competencia: "2018-03" }]);
      const semFixacao = apurarValorBase(
        prestacao("2018-01-10"),
        { ...base, dataFixacao: "2016-12-10" },
        tabela2017,
        2,
      );
      expect(semFixacao.valor).toBeNull();
      expect(semFixacao.avisos).toEqual([
        "Salário mínimo de dez/2016 (mês da fixação) não disponível na tabela de índices: a prestação ficou sem valor; informe o valor à mão.",
      ]);
    });
  });

  describe("reajuste anual pelo índice acumulado (IGP-M, INPC ou IPCA)", () => {
    const base: Base = {
      tipo: "valorFixo",
      valor: "500.00",
      dataFixacao: "2024-03-15",
      indiceReajuste: "IPCA",
      mesReajuste: 3,
    };

    it("antes do primeiro reajuste vale o valor fixado; a memória diz quando ele vem", () => {
      const r = apurarValorBase(prestacao("2025-02-15"), base, tabela, 2);
      expect(r.valor?.toFixed(2)).toBe("500.00");
      expect(r.memoria).toBe(
        "Valor fixado em 15/03/2024: R$ 500,00 (primeiro reajuste pelo IPCA em mar/2025)",
      );
      expect(r.indicesUsados).toEqual([]);
      expect(apurarValorBase(prestacao("2024-03-15"), base, tabela, 2).valor?.toFixed(2)).toBe(
        "500.00",
      );
    });

    it("primeiro reajuste 12 meses após a fixação, pelo acumulado com precisão integral; arredondamento a 2 casas a cada reajuste", () => {
      // Calculadora do Cidadão (IPCA 03/2024→02/2025): 1,05057630; R$ 500,00 → R$ 525,29
      const primeiro = apurarValorBase(prestacao("2025-03-15"), base, tabela, 2);
      expect(primeiro.valor?.toFixed(2)).toBe("525.29");
      expect(primeiro.memoria).toBe(
        "R$ 500,00 fixados em 15/03/2024, reajustados em mar/2025 (IPCA de mar/2024 a fev/2025: 5,0576%) = R$ 525,29",
      );
      expect(primeiro.indicesUsados).toHaveLength(12);
      expect(primeiro.indicesUsados[0]).toEqual({
        serie: "433",
        competencia: "2024-03",
        valor: "0.16",
        fonte: "embutida",
        obtidoEm,
      });
      expect(primeiro.indicesUsados.at(-1)?.competencia).toBe("2025-02");
      // Calculadora (IPCA 03/2025→02/2026): 1,03812500; R$ 525,29 → R$ 545,32 (o segundo reajuste parte do valor arredondado)
      const segundo = apurarValorBase(prestacao("2026-09-15"), base, tabela, 2);
      expect(segundo.valor?.toFixed(2)).toBe("545.32");
      expect(segundo.memoria).toBe(
        "R$ 500,00 fixados em 15/03/2024, reajustados em mar/2025 (IPCA de mar/2024 a fev/2025: 5,0576%) e em mar/2026 (IPCA de mar/2025 a fev/2026: 3,8125%) = R$ 545,32",
      );
      expect(segundo.indicesUsados).toHaveLength(24);
      expect(apurarValorBase(prestacao("2026-02-15"), base, tabela, 2).valor?.toFixed(2)).toBe(
        "525.29",
      );
    });

    it("mês de reajuste diferente do mês da fixação: o primeiro reajuste usa o acumulado desde a fixação até o mês anterior, depois janelas de 12 meses", () => {
      const janeiro: Base = { ...base, mesReajuste: 1 };
      expect(apurarValorBase(prestacao("2024-12-15"), janeiro, tabela, 2).valor?.toFixed(2)).toBe(
        "500.00",
      );
      const primeiro = apurarValorBase(prestacao("2025-01-15"), janeiro, tabela, 2);
      expect(primeiro.valor?.toFixed(2)).toBe("517.67");
      expect(primeiro.memoria).toBe(
        "R$ 500,00 fixados em 15/03/2024, reajustados em jan/2025 (IPCA de mar/2024 a dez/2024: 3,5335%) = R$ 517,67",
      );
      const segundo = apurarValorBase(prestacao("2026-01-15"), janeiro, tabela, 2);
      expect(segundo.valor?.toFixed(2)).toBe("539.75");
      expect(segundo.memoria).toContain(
        "e em jan/2026 (IPCA de jan/2025 a dez/2025: 4,2644%) = R$ 539,75",
      );
      // mês de reajuste logo depois da fixação: janela curta, de um mês
      const junho: Base = { ...base, dataFixacao: "2024-05-20", mesReajuste: 6 };
      const curto = apurarValorBase(prestacao("2024-06-20"), junho, tabela, 2);
      expect(curto.valor?.toFixed(2)).toBe("502.30");
      expect(curto.memoria).toBe(
        "R$ 500,00 fixados em 20/05/2024, reajustados em jun/2024 (IPCA de mai/2024 a mai/2024: 0,4600%) = R$ 502,30",
      );
    });

    it("acumulado negativo não reduz o valor: IGP-M de 2017 (−0,53%) mantém R$ 451,91 em 2018", () => {
      const igpm: Base = {
        tipo: "valorFixo",
        valor: "451.91",
        dataFixacao: "2017-01-10",
        indiceReajuste: "IGP-M",
        mesReajuste: 1,
      };
      const r = apurarValorBase(prestacao("2018-01-10"), igpm, tabelaIgpm(), 2);
      expect(r.valor?.toFixed(2)).toBe("451.91");
      expect(r.memoria).toBe(
        "R$ 451,91 fixados em 10/01/2017, reajustados em jan/2018 (IGP-M de jan/2017 a dez/2017: -0,5326%, acumulado não positivo: valor mantido) = R$ 451,91",
      );
      expect(r.indicesUsados).toHaveLength(12);
      expect(r.avisos).toEqual([]);
    });

    it("índice do reajuste ainda não divulgado: reajuste não aplicado, valor vigente mantido, aviso e mês sinalizado", () => {
      const novembro: Base = { ...base, dataFixacao: "2025-11-15", mesReajuste: 11 };
      const r = apurarValorBase(prestacao("2026-11-15"), novembro, tabela, 2);
      expect(r.valor?.toFixed(2)).toBe("500.00");
      expect(r.avisos).toEqual([
        "IPCA de out/2026 não disponível na tabela de índices (último mês disponível: set/2026): o reajuste de nov/2026 não foi aplicado; a prestação mantém R$ 500,00.",
      ]);
      expect(r.memoria).toBe(
        "Valor fixado em 15/11/2025: R$ 500,00 (reajuste de nov/2026 não aplicado: IPCA de out/2026 não disponível)",
      );
      expect(r.mesesSemIndice).toEqual([{ serie: "433", competencia: "2026-10" }]);
      expect(r.indicesUsados).toEqual([]);
    });

    it("índice faltante no meio da janela: o reajuste daquele ano não é aplicado e a cadeia para ali, sem estimar", () => {
      const comLacuna = tabelaRegimeNovo();
      delete comLacuna.series["433"]?.["2025-05"];
      const r = apurarValorBase(prestacao("2026-09-15"), base, comLacuna, 2);
      expect(r.valor?.toFixed(2)).toBe("525.29");
      expect(r.avisos).toEqual([
        "IPCA de mai/2025 não disponível na tabela de índices (último mês disponível: set/2026): o reajuste de mar/2026 não foi aplicado; a prestação mantém R$ 525,29.",
      ]);
      expect(r.memoria).toBe(
        "R$ 500,00 fixados em 15/03/2024, reajustados em mar/2025 (IPCA de mar/2024 a fev/2025: 5,0576%) = R$ 525,29; reajuste de mar/2026 não aplicado: IPCA de mai/2025 não disponível",
      );
      expect(r.indicesUsados).toHaveLength(12);
    });

    it("mês do reajuste inválido: valor fixado, com aviso", () => {
      const r = apurarValorBase(prestacao("2026-09-15"), { ...base, mesReajuste: 13 }, tabela, 2);
      expect(r.valor?.toFixed(2)).toBe("500.00");
      expect(r.avisos).toEqual([
        "Mês do reajuste inválido (13): a prestação entrou com o valor fixado, sem reajuste.",
      ]);
    });

    it("INPC como índice de reajuste usa a série 188", () => {
      const inpc: Base = { ...base, indiceReajuste: "INPC" };
      const r = apurarValorBase(prestacao("2025-03-15"), inpc, tabela, 2);
      expect(r.indicesUsados.every((i) => i.serie === "188")).toBe(true);
      expect(r.indicesUsados).toHaveLength(12);
      expect(r.memoria).toContain("INPC de mar/2024 a fev/2025");
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Execute: `npm test -- src/motor/base.test.ts`
Esperado: o arquivo falha ao carregar: não resolve a importação de `./base.ts`.

- [ ] **Step 3: Implementar**

Crie `src/motor/base.ts`:

```ts
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
  const publicadoEm = formatarCompetencia(salario.usado.competencia);
  return {
    valor,
    memoria: `${pct} do salário mínimo vigente em ${mes} (${formatarMoeda(salarioValor)}, último publicado: ${publicadoEm}) = ${formatarMoeda(valor)}`,
    indicesUsados: [salario.usado],
    mesesSemIndice: [{ serie: SALARIO_MINIMO, competencia }],
    avisos: [
      `Salário mínimo de ${mes} ainda não publicado na tabela de índices: usado o de ${publicadoEm} (${formatarMoeda(salarioValor)}), vigente até a publicação do novo.`,
    ],
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
  const descricaoVencimento = noVencimento.publicado
    ? `salário mínimo de ${mes} (${formatarMoeda(salarioVencimento)})`
    : `salário mínimo vigente em ${mes} (${formatarMoeda(salarioVencimento)}, último publicado: ${formatarCompetencia(noVencimento.usado.competencia)})`;
  const memoria = `${formatarMoeda(valorFixado)} fixados em ${formatarData(dataFixacao)} × ${descricaoVencimento} ÷ salário mínimo de ${formatarCompetencia(mesFixacao)} (${formatarMoeda(salarioFixacao)}) = ${formatarMoeda(valor)}`;
  if (noVencimento.publicado) {
    return { valor, memoria, indicesUsados, mesesSemIndice: [], avisos: [] };
  }
  return {
    valor,
    memoria,
    indicesUsados,
    mesesSemIndice: [{ serie: SALARIO_MINIMO, competencia }],
    avisos: [
      `Salário mínimo de ${mes} ainda não publicado na tabela de índices: usado o de ${formatarCompetencia(noVencimento.usado.competencia)} (${formatarMoeda(salarioVencimento)}), vigente até a publicação do novo.`,
    ],
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
      const ultimo = Object.keys(tabela.series[serie] ?? {})
        .sort()
        .at(-1);
      const disponivel =
        ultimo === undefined ? "" : ` (último mês disponível: ${formatarCompetencia(ultimo)})`;
      const lista = faltantes.map(formatarCompetencia).join(", ");
      avisos.push(
        `${nome} de ${lista} não disponível na tabela de índices${disponivel}: o reajuste de ${formatarCompetencia(reajuste)} não foi aplicado; a prestação mantém ${formatarMoeda(vigente)}.`,
      );
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
 * 12 meses. Nunca lança erro: dado inválido ou faltante devolve `valor` nulo e aviso.
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
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Execute: `npm test -- src/motor/base.test.ts`
Esperado: 20 testes passam.

- [ ] **Step 5: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add src/motor/base.ts src/motor/base.test.ts && git commit -m "motor: valor-base pela base dos alimentos (salário mínimo, rendimentos, valor fixo com reajuste)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

### Task 5: Juros sobre o corrigido sem arredondar (convenção do SAJ), aviso de SELIC combinada com índice e tolerância proporcional nos casos

**Files:**
- Modify: `src/motor/calcular.ts` (uma linha), `src/motor/periodos.ts`, `src/motor/casos.test.ts` (tolerância), `src/motor/casos/2026-10-11-calculadora-bcb-regime-novo.json` (uma linha, os totais e as observações)
- Test: `src/motor/calcular.test.ts` (um teste novo), `src/motor/periodos.test.ts` (um teste novo)

**Interfaces:**
- Consome: `tabelaRegimeNovo()` (Task 1), `metodologiaPadrao()`, `validarMetodologia`, `PeriodoMetodologia`.
- Produz: `jurosValor = arred2(valorBase × fator × percentual ÷ 100)` em `atualizarLancamento`; `validarMetodologia` passa a avisar "…a SELIC já inclui correção e juros: o índice X informado não foi aplicado." quando um período tem `juros.tipo === "selicUnica"` e `correcao.indice !== "nenhum"`; o teste genérico de casos tolera `valorBase × 0,0000005 + 0,01` na conferência pelos números impressos.

- [ ] **Step 1: Escrever os testes**

Em `src/motor/calcular.test.ts`, dentro de `describe("calcular (regime novo, multa e honorários, validações)", …)` (que define `hoje`), acrescente como último teste, antes do `});` que fecha esse `describe`:

```ts
  it("juros incidem sobre o corrigido sem arredondar, como o SAJ (R$ 450,00 de 01/02/2025: 93,47 e não 93,48)", () => {
    const tabela = tabelaRegimeNovo();
    tabela.series["189"]!["2025-12"] = {
      valor: "-0.02",
      fonte: "embutida",
      obtidoEm: "2026-10-11T12:00:00.000Z",
    };
    const calculo = calculoCom(
      [
        {
          ...prestacao,
          id: "p-2025-02",
          data: "2025-02-01",
          competencia: "2025-02",
          valorInformado: "450.00",
        },
      ],
      hoje,
    );
    calculo.metodologia = {
      ...metodologiaPadrao(),
      ajustada: true,
      deflacao: "aplicarSemPiso",
      periodos: [
        {
          de: null,
          ate: null,
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "1" },
        },
      ],
    };
    const r = calcular(calculo, tabela);
    expect(r.lancamentos[0]).toMatchObject({
      correcao: { fator: "1.020504" },
      corrigido: "459.23",
      juros: { percentual: "20.354839" },
      jurosValor: "93.47",
      atualizado: "552.70",
    });
  });
```

Em `src/motor/periodos.test.ts`, acrescente ao fim do arquivo:

```ts

describe("SELIC única combinada com índice de correção", () => {
  it("avisa que a SELIC já inclui correção e juros e que o índice do período não foi aplicado", () => {
    const metodologia = metodologiaPadrao();
    metodologia.periodos = [
      { de: null, ate: "2024-08-29", correcao: { indice: "IGP-M" }, juros: { tipo: "selicUnica" } },
      { de: "2024-08-30", ate: null, correcao: { indice: "IPCA" }, juros: { tipo: "taxaLegal" } },
    ];
    expect(validarMetodologia(metodologia)).toEqual([
      "No período até 29/08/2024, a SELIC já inclui correção e juros: o índice IGP-M informado não foi aplicado.",
    ]);
    metodologia.periodos = [
      { de: null, ate: null, correcao: { indice: "INPC" }, juros: { tipo: "selicUnica" } },
    ];
    expect(validarMetodologia(metodologia)).toEqual([
      "Em toda a metodologia, a SELIC já inclui correção e juros: o índice INPC informado não foi aplicado.",
    ]);
    metodologia.periodos = [
      { de: null, ate: null, correcao: { indice: "nenhum" }, juros: { tipo: "selicUnica" } },
    ];
    expect(validarMetodologia(metodologia)).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Execute: `npm test -- src/motor/calcular.test.ts src/motor/periodos.test.ts`
Esperado: falham exatamente dois testes: "juros incidem sobre o corrigido sem arredondar, como o SAJ…" (recebe `jurosValor: "93.48"` e `atualizado: "552.71"`) e "avisa que a SELIC já inclui correção e juros…" (recebe `[]`).

- [ ] **Step 3: Implementar**

Em `src/motor/calcular.ts`, troque

```ts
  const jurosValor = arredondar(corrigido.times(juros.percentual).div(CEM), valorCasas);
```

por

```ts
  // Juros sobre o corrigido sem arredondar, como o SAJ (decisão de 11/10/2026, ponto 9).
  const jurosValor = arredondar(
    valorBase.times(correcao.fator).times(juros.percentual).div(CEM),
    valorCasas,
  );
```

Em `src/motor/periodos.ts`, dentro de `validarMetodologia`, troque o trecho final

```ts
  if (fimCoberto !== null) {
    avisos.push(
      `A metodologia não cobre datas posteriores a ${formatarData(fimCoberto)}: esses dias ficam sem correção e sem juros.`,
    );
  }
  return avisos;
}
```

por

```ts
  if (fimCoberto !== null) {
    avisos.push(
      `A metodologia não cobre datas posteriores a ${formatarData(fimCoberto)}: esses dias ficam sem correção e sem juros.`,
    );
  }
  // SELIC única já inclui correção e juros (§6.4): um índice de correção no mesmo período é ignorado.
  for (const periodo of periodos) {
    if (periodo.juros.tipo === "selicUnica" && periodo.correcao.indice !== "nenhum") {
      avisos.push(
        `${descreverPeriodo(periodo)}, a SELIC já inclui correção e juros: o índice ${periodo.correcao.indice} informado não foi aplicado.`,
      );
    }
  }
  return avisos;
}

/** "No período de 01/01/2020 a 29/08/2024", "No período desde …", "No período até …" ou "Em toda a metodologia". */
function descreverPeriodo(periodo: PeriodoMetodologia): string {
  if (periodo.de !== null && periodo.ate !== null) {
    return `No período de ${formatarData(periodo.de)} a ${formatarData(periodo.ate)}`;
  }
  if (periodo.de !== null) return `No período desde ${formatarData(periodo.de)}`;
  if (periodo.ate !== null) return `No período até ${formatarData(periodo.ate)}`;
  return "Em toda a metodologia";
}
```

- [ ] **Step 4: Rodar e ver o efeito**

Execute: `npm test`
Esperado: os dois testes novos passam; falham exatamente três testes de `src/motor/casos.test.ts`, todos do caso "Regime novo (IPCA e taxa legal), conferido na Calculadora do Cidadão do BCB em 11/10/2026": "lançamento a-2025-06-30 bate centavo a centavo" (recebe `jurosValor: "67.22"` e `atualizado: "593.40"`), "totais batem" e "a ordem dos lançamentos não altera os totais". É a consequência esperada: o centavo dessa linha vinha de aritmética nossa sobre o corrigido arredondado (R$ 526,18 × 12,776091% = 67,2252 → 67,23); sobre o corrigido bruto (500 × 1,052354… × 12,776091% = 67,2249) dá 67,22. A Calculadora dá só o percentual, não o valor em reais, então o gabarito externo não é contrariado.

- [ ] **Step 5: Atualizar o caso da Calculadora e a tolerância do teste de casos**

Em `src/motor/casos/2026-10-11-calculadora-bcb-regime-novo.json`:

1. Na linha do esperado `{"id": "a-2025-06-30", …}`, troque `"jurosValor": "67.23", "atualizado": "593.41"` por `"jurosValor": "67.22", "atualizado": "593.40"`.
2. Nos totais, troque `"amortizacoes": "593.41", "totalDevido": "6158.65"` por `"amortizacoes": "593.40", "totalDevido": "6158.66"` e `"totalGeral": "6158.65"` por `"totalGeral": "6158.66"` (`prestacoes` continua `"6752.06"`).
3. Em `observacoes`, acrescente ao fim do texto, depois de "Out/2026 sem IPCA na data do cálculo: entra com fator 1 e aviso.": ` Os juros incidem sobre o corrigido sem arredondar (convenção do SAJ, decidida na fase 3): no pagamento de 30/06/2025, 500 × 1,052354… × 12,776091% = 67,22 (sobre o corrigido arredondado, R$ 526,18, daria 67,23).`

Em `src/motor/casos.test.ts`, troque o teste "o fator e o percentual impressos reproduzem o centavo, com tolerância de R$ 0,01" inteiro por:

```ts
    it("o fator e o percentual impressos reproduzem o centavo, com tolerância proporcional ao valor", () => {
      // O motor multiplica com precisão integral e imprime 6 casas (como o SAJ): a conta refeita
      // com os números impressos pode diferir em um centavo, mais o erro do fator impresso
      // (até 0,0000005 × valor), relevante acima de R$ 10.000,00.
      expect(resultado.lancamentos.length).toBeGreaterThan(0);
      for (const l of resultado.lancamentos) {
        const tolerancia = decimal(l.valorBase).abs().times("0.0000005").plus("0.01");
        const corrigido = arredondar(
          decimal(l.valorBase).times(decimal(l.correcao.fator)),
          valorCasas,
        );
        expect(corrigido.minus(decimal(l.corrigido)).abs().lte(tolerancia)).toBe(true);
        const juros = arredondar(
          decimal(l.corrigido).times(decimal(l.juros.percentual)).div(CEM),
          valorCasas,
        );
        expect(juros.minus(decimal(l.jurosValor)).abs().lte(tolerancia)).toBe(true);
      }
    });
```

- [ ] **Step 6: Rodar e ver passar**

Execute: `npm test`
Esperado: todos passam (os três relatórios do SAJ já gravados, 69 linhas, continuam batendo com a convenção nova).

- [ ] **Step 7: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add src/motor/calcular.ts src/motor/calcular.test.ts src/motor/periodos.ts src/motor/periodos.test.ts src/motor/casos.test.ts src/motor/casos/2026-10-11-calculadora-bcb-regime-novo.json && git commit -m "motor: juros sobre o corrigido sem arredondar (SAJ), aviso de SELIC com índice e tolerância proporcional nos casos" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

### Task 6: Cálculo: valor pela base, situação dos lançamentos, valores informados à mão, texto inválido, proveniência da base e resumos

**Files:**
- Modify: `src/compartilhado/tipos.ts`, `src/motor/calcular.ts` (reescrito), `src/motor/casos.test.ts` (campos opcionais e avisos), `src/motor/casos/2026-10-11-saj-tjms-selic-capitalizada.json` e `src/motor/casos/2026-10-11-transicao-lei-14905.json` (`base.valor`)
- Test: `src/motor/calcular.test.ts` (reescrito por inteiro)

**Interfaces:**
- Consome: `apurarValorBase`, `MesSemIndice` (Task 4); `decimalOuNulo` (Task 2); `tabelaRegimeNovo()` e `tabelaIgpm()` (Task 1); `fatorCorrecao`, `resolverIndicesMensais`, `jurosSimples`, `validarMetodologia` (fases 1 e 2).
- Produz:
  - `type SituacaoLancamento = "atualizado" | "vincenda" | "ignorado"` e, em `LancamentoCalculado`, `editado: boolean` e `situacao: SituacaoLancamento`.
  - `LancamentoEsperado` com `valorBase?`, `memoriaBase?`, `situacao?`, `editado?`, `avisos?`; `CasoDeReferencia.esperado.avisos?`.
  - `calcular`: valor pela base quando não há `valorInformado`; situação; totais só com os computados; `indicesUsados` com salário mínimo e índices de reajuste; resumos "Meses sem índice na tabela para o valor-base das prestações…", "Prestações vincendas…", "Prestações com valor informado à mão…", "Lançamentos não computados nos totais…".
  - A Task 7 depende de tudo isto.

- [ ] **Step 1: Tipos**

Em `src/compartilhado/tipos.ts`, faça quatro edições:

1. No `interface Lancamento`, troque o comentário `/** amortizações sempre; prestações só se editadas à mão ou avulsas */` por `/** amortizações sempre; prestações só quando o valor foi informado à mão (as demais são apuradas pela base, §6.3) */`.
2. Antes de `export interface LancamentoCalculado {`, acrescente:

```ts
/**
 * Como o lançamento entrou no cálculo (§6.7): "atualizado" (correção e juros até a data de
 * elaboração); "vincenda" (prestação posterior à data de elaboração, pelo valor nominal, sem
 * encargos); "ignorado" (fora dos totais: pagamento posterior à data de elaboração, valor zero ou
 * negativo, valor inválido ou base sem como apurar).
 */
export type SituacaoLancamento = "atualizado" | "vincenda" | "ignorado";

```

3. Em `LancamentoCalculado`, logo depois de `memoriaBase: string;`, acrescente:

```ts
  /** prestação cujo valor foi informado à mão, em vez de apurado pela base dos alimentos (§6.3) */
  editado: boolean;
  situacao: SituacaoLancamento;
```

4. Em `LancamentoEsperado`, depois de `jurosPercentual?: TextoDecimal;`, acrescente:

```ts
  valorBase?: TextoDecimal;
  memoriaBase?: string;
  situacao?: SituacaoLancamento;
  editado?: boolean;
  /** avisos do lançamento, comparados por inteiro quando informados */
  avisos?: string[];
```

e, em `CasoDeReferencia`, troque `  esperado: { lancamentos: LancamentoEsperado[]; totais: Totais };` por

```ts
  /** `avisos` (do Resultado) são comparados por inteiro quando o caso os informa */
  esperado: { lancamentos: LancamentoEsperado[]; totais: Totais; avisos?: string[] };
```

- [ ] **Step 2: Teste genérico de casos**

Em `src/motor/casos.test.ts`:

1. Na lista `opcionais`, depois da linha `["jurosPercentual", esperado.jurosPercentual, obtido.juros.percentual],`, acrescente:

```ts
          ["valorBase", esperado.valorBase, obtido.valorBase],
          ["memoriaBase", esperado.memoriaBase, obtido.memoriaBase],
          ["situacao", esperado.situacao, obtido.situacao],
          [
            "editado",
            esperado.editado === undefined ? undefined : String(esperado.editado),
            String(obtido.editado),
          ],
```

2. Logo depois de `expect(obtidos).toEqual(esperados);`, acrescente a linha `if (esperado.avisos !== undefined) expect(obtido.avisos).toEqual(esperado.avisos);`.
3. Depois do teste "totais batem", acrescente:

```ts

    it("avisos do resultado batem (quando o caso os informa)", () => {
      if (caso.esperado.avisos !== undefined)
        expect(resultado.avisos).toEqual(caso.esperado.avisos);
    });
```

- [ ] **Step 3: Testes do cálculo**

Substitua `src/motor/calcular.test.ts` por inteiro (os testes antigos permanecem, com as listas de avisos completas; os sete marcados abaixo mudam de expectativa; o bloco "fase 3" é novo):

```ts
import { describe, expect, it } from "vitest";
import { competenciasEntre } from "../compartilhado/datas.ts";
import type { Calculo, Lancamento } from "../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../metodologias/padrao.ts";
import { calcular } from "./calcular.ts";
import { tabelaIgpm } from "./testes/indices-igpm-2017-2018.ts";
import { metodologiaSelicUnica, tabelaRegimeNovo } from "./testes/regime-novo.ts";
import type { Base } from "../compartilhado/tipos.ts";

function calculoCom(lancamentos: Lancamento[], dataElaboracao = "2018-05-25"): Calculo {
  return {
    formato: "apura/calculo@1",
    tipo: "alimentos",
    id: "teste",
    criadoEm: "2026-10-10T00:00:00.000Z",
    atualizadoEm: "2026-10-10T00:00:00.000Z",
    dataElaboracao,
    cabecalho: { defensor: "", orgao: "", processo: "", exequente: "", executado: "" },
    base: {
      tipo: "valorFixo",
      valor: "451.91",
      dataFixacao: "2017-01-10",
      indiceReajuste: "nenhum",
      mesReajuste: 1,
    },
    lotes: {},
    lancamentos,
    metodologia: metodologiaPadrao(),
    acrescimos: { multaPercentual: "0", honorariosPercentual: "0" },
    observacoes: "",
  };
}

const prestacao: Lancamento = {
  id: "p-2017-01",
  tipo: "prestacao",
  data: "2017-01-10",
  competencia: "2017-01",
  valorInformado: "451.91",
  origem: "avulso",
  editado: false,
};

const amortizacao: Lancamento = {
  id: "a-2017-01",
  tipo: "amortizacao",
  data: "2017-01-10",
  descricao: "Pagamento parcial",
  valorInformado: "440.00",
  origem: "avulso",
  editado: false,
};

describe("calcular", () => {
  it("atualiza uma prestação e uma amortização como o SAJ e apura os totais", () => {
    const r = calcular(calculoCom([prestacao, amortizacao]), tabelaIgpm());
    expect(r.lancamentos[0]).toMatchObject({
      id: "p-2017-01",
      tipo: "prestacao",
      competencia: "2017-01",
      valorBase: "451.91",
      memoriaBase: "Valor informado: R$ 451,91",
      correcao: { fator: "1.013020", pisoAplicado: false },
      corrigido: "457.79",
      juros: { percentual: "16.516129" },
      jurosValor: "75.61",
      atualizado: "533.40",
    });
    expect(r.lancamentos[0]?.correcao.indices).toHaveLength(17);
    expect(r.lancamentos[0]?.juros.detalhe).toHaveLength(17);
    expect(r.lancamentos[1]).toMatchObject({
      id: "a-2017-01",
      tipo: "amortizacao",
      descricao: "Pagamento parcial",
      corrigido: "445.73",
      jurosValor: "73.62",
      atualizado: "519.35",
    });
    expect(r.totais).toEqual({
      prestacoes: "533.40",
      amortizacoes: "519.35",
      totalDevido: "14.05",
      multa: "0.00",
      honorarios: "0.00",
      totalGeral: "14.05",
    });
  });

  it("registra os índices efetivamente usados e a situação da consulta", () => {
    const r = calcular(calculoCom([prestacao, amortizacao]), tabelaIgpm());
    expect(r.indicesUsados).toHaveLength(16); // jan/2017 a abr/2018, sem repetição entre lançamentos
    expect(r.indicesUsados[0]).toEqual({
      serie: "189",
      competencia: "2017-01",
      valor: "0.64",
      fonte: "embutida",
      obtidoEm: "2026-10-10T00:00:00.000Z",
    });
    expect(r.consultaIndices).toEqual({
      em: "2018-05-25T00:00:00.000Z",
      series: ["189"],
      ultimoMesPorSerie: { "189": "2018-04" },
    });
  });

  it("avisa o mês sem índice no lançamento e no resumo", () => {
    const r = calcular(calculoCom([prestacao]), tabelaIgpm());
    expect(r.lancamentos[0]?.avisos).toEqual([
      "Valor informado à mão (R$ 451,91), não apurado pela base dos alimentos.",
      "IGP-M de mai/2018 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
    ]);
    expect(r.avisos).toEqual([
      "Meses sem índice na tabela (entraram sem correção): IGP-M de mai/2018.",
      "Prestações com valor informado à mão, não apurado pela base dos alimentos: jan/2017.",
    ]);
  });

  it("mês sem índice no meio do período: aviso no lançamento e no resumo, em ordem cronológica", () => {
    const r = calcular(calculoCom([prestacao]), tabelaIgpm("2018-04", ["2017-10"]));
    expect(r.lancamentos[0]?.correcao.fator).toBe("1.010998");
    expect(r.lancamentos[0]?.avisos).toEqual([
      "Valor informado à mão (R$ 451,91), não apurado pela base dos alimentos.",
      "IGP-M de out/2017 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
      "IGP-M de mai/2018 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
    ]);
    expect(r.avisos).toEqual([
      "Meses sem índice na tabela (entraram sem correção): IGP-M de out/2017, mai/2018.",
      "Prestações com valor informado à mão, não apurado pela base dos alimentos: jan/2017.",
    ]);
  });

  it("mês que não entra no cálculo (fração zero) não gera aviso nem conta como índice usado", () => {
    const fimDeMes: Lancamento = {
      ...prestacao,
      id: "p-2018-04",
      data: "2018-04-30",
      competencia: "2018-04",
    };
    const r = calcular(calculoCom([fimDeMes]), tabelaIgpm("2018-04", ["2018-04"]));
    expect(r.lancamentos[0]?.correcao.fator).toBe("1.000000");
    expect(r.lancamentos[0]?.correcao.indices.map((i) => i.fracao)).toEqual(["0/30", "25/31"]);
    expect(r.lancamentos[0]?.avisos).toEqual([
      "Valor informado à mão (R$ 451,91), não apurado pela base dos alimentos.",
      "IGP-M de mai/2018 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
    ]);
    expect(r.avisos).toEqual([
      "Meses sem índice na tabela (entraram sem correção): IGP-M de mai/2018.",
      "Prestações com valor informado à mão, não apurado pela base dos alimentos: abr/2018.",
    ]);
    expect(r.indicesUsados).toEqual([]);
  });

  it("usa os termos próprios do lançamento quando informados", () => {
    const comTermos: Lancamento = {
      ...prestacao,
      encargos: { termoFinalCorrecao: "2017-03-15", termoInicialJuros: "2018-05-25" },
    };
    const r = calcular(calculoCom([comTermos]), tabelaIgpm());
    expect(r.lancamentos[0]).toMatchObject({
      correcao: { fator: "1.005183" },
      corrigido: "454.25",
      juros: { percentual: "0.032258" },
      jurosValor: "0.15",
      atualizado: "454.40",
    });
  });

  it("usa a metodologia própria do lançamento quando informada", () => {
    const propria = metodologiaPadrao();
    propria.incidenciaMesInicial = "mesSeguinte";
    const r = calcular(
      calculoCom([{ ...prestacao, encargos: { metodologia: propria } }]),
      tabelaIgpm(),
    );
    expect(r.lancamentos[0]?.correcao.fator).toBe("1.008652");
  });

  it("prestação posterior à data de elaboração é vincenda: valor nominal, sem correção e sem juros, mesmo com termos próprios (§6.7)", () => {
    const futura: Lancamento = {
      ...prestacao,
      id: "p-2018-06",
      data: "2018-06-10",
      competencia: "2018-06",
    };
    const r = calcular(calculoCom([futura]), tabelaIgpm());
    expect(r.lancamentos[0]).toMatchObject({
      situacao: "vincenda",
      correcao: { fator: "1.000000", indices: [] },
      corrigido: "451.91",
      juros: { percentual: "0.000000", detalhe: [] },
      jurosValor: "0.00",
      atualizado: "451.91",
    });
    expect(r.lancamentos[0]?.avisos).toEqual([
      "Valor informado à mão (R$ 451,91), não apurado pela base dos alimentos.",
      "Prestação com vencimento em 10/06/2018, posterior à data de elaboração (25/05/2018): vincenda, incluída pelo valor nominal, sem correção e sem juros.",
    ]);
    // a vincenda entra nos totais pelo valor nominal (art. 323 do CPC)
    expect(r.totais.prestacoes).toBe("451.91");
    expect(r.avisos).toContain(
      "Prestações vincendas, incluídas pelo valor nominal, sem correção e sem juros: jun/2018.",
    );
    // termo inicial próprio da correção no passado não muda nada: continua nominal, com aviso
    const comTermos: Lancamento = {
      ...futura,
      encargos: { termoInicialCorrecao: "2017-01-10", termoInicialJuros: "2017-01-10" },
    };
    const r2 = calcular(calculoCom([comTermos]), tabelaIgpm());
    expect(r2.lancamentos[0]).toMatchObject({
      situacao: "vincenda",
      correcao: { fator: "1.000000" },
      jurosValor: "0.00",
      atualizado: "451.91",
    });
    expect(r2.lancamentos[0]?.avisos.slice(1)).toEqual([
      "Prestação com vencimento em 10/06/2018, posterior à data de elaboração (25/05/2018): vincenda, incluída pelo valor nominal, sem correção e sem juros.",
      "Os termos próprios informados não se aplicam à prestação vincenda.",
    ]);
  });

  it("prestação sem valor informado é apurada pela base dos alimentos (§6.3), sem a marca de editado", () => {
    const semValor: Lancamento = {
      id: "p-2017-01-lote",
      tipo: "prestacao",
      data: "2017-01-10",
      competencia: "2017-01",
      origem: "lote",
      editado: false,
    };
    const r = calcular(calculoCom([semValor]), tabelaIgpm());
    expect(r.lancamentos[0]).toMatchObject({
      valorBase: "451.91",
      memoriaBase: "Valor fixado em 10/01/2017: R$ 451,91 (sem reajuste)",
      editado: false,
      situacao: "atualizado",
      corrigido: "457.79",
      jurosValor: "75.61",
      atualizado: "533.40",
    });
    expect(r.lancamentos[0]?.avisos).toEqual([
      "IGP-M de mai/2018 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
    ]);
    expect(r.avisos).not.toContainEqual(expect.stringContaining("informado à mão"));
  });

  it("avisa quando as amortizações igualam ou superam as prestações e quando não há lançamentos", () => {
    const r = calcular(calculoCom([amortizacao]), tabelaIgpm());
    expect(r.totais.totalDevido).toBe("-519.35");
    expect(r.avisos).toContain(
      "As amortizações atualizadas (R$ 519,35) igualam ou superam as prestações atualizadas (R$ 0,00): não há valor devido na data do cálculo.",
    );
    expect(calcular(calculoCom([]), tabelaIgpm()).avisos).toEqual(["Nenhum lançamento."]);
  });
});

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
        "Valor informado à mão (R$ 1.000,00), não apurado pela base dos alimentos.",
        "IPCA de out/2026 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
      ],
    });
    // séries em ordem numérica (como texto, "1619" viria antes de "188")
    expect(r.consultaIndices.series).toEqual(["188", "189", "433", "1619", "4390", "29543"]);
    expect(r.consultaIndices.ultimoMesPorSerie).toEqual({
      "188": "2026-09",
      "189": "2026-09",
      "433": "2026-09",
      "1619": "2026-12",
      "4390": "2026-10",
      "29543": "2026-10",
    });
    // A taxa legal consumida nos juros consta de indicesUsados, com fonte e data de obtenção.
    const taxaLegal = r.indicesUsados.filter((i) => i.serie === "29543");
    expect(taxaLegal).toHaveLength(26);
    expect(taxaLegal.map((i) => i.competencia)).toEqual(competenciasEntre("2024-09", "2026-10"));
    expect(taxaLegal[0]).toEqual({
      serie: "29543",
      competencia: "2024-09",
      valor: "0.676227",
      fonte: "embutida",
      obtidoEm: "2026-10-11T12:00:00.000Z",
    });
    expect([...new Set(r.indicesUsados.map((i) => i.serie))]).toEqual(["433", "29543"]);
  });

  it("taxa legal ausente na tabela: aviso no lançamento e resumo próprio no resultado", () => {
    const r = calcular(
      calculoCom([lancamento("p", "prestacao", "2026-09-30", "1000.00")], hoje),
      tabelaRegimeNovo({ "29543": "2026-09" }),
    );
    expect(r.avisos).toContain(
      "Meses sem taxa legal na tabela (os dias desses meses ficaram sem juros): out/2026.",
    );
    expect(r.lancamentos[0]?.avisos).toContain(
      "Taxa legal de out/2026 não disponível na tabela de índices: os dias de 01/10/2026 a 10/10/2026 ficaram sem juros.",
    );
    expect(r.indicesUsados.some((i) => i.serie === "29543" && i.competencia === "2026-10")).toBe(
      false,
    );
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
    expect(r.lancamentos[0]?.avisos.slice(1, 3)).toEqual([
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

  it("juros incidem sobre o corrigido sem arredondar, como o SAJ (R$ 450,00 de 01/02/2025: 93,47 e não 93,48)", () => {
    const tabela = tabelaRegimeNovo();
    tabela.series["189"]!["2025-12"] = {
      valor: "-0.02",
      fonte: "embutida",
      obtidoEm: "2026-10-11T12:00:00.000Z",
    };
    const calculo = calculoCom(
      [
        {
          ...prestacao,
          id: "p-2025-02",
          data: "2025-02-01",
          competencia: "2025-02",
          valorInformado: "450.00",
        },
      ],
      hoje,
    );
    calculo.metodologia = {
      ...metodologiaPadrao(),
      ajustada: true,
      deflacao: "aplicarSemPiso",
      periodos: [
        {
          de: null,
          ate: null,
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "1" },
        },
      ],
    };
    const r = calcular(calculo, tabela);
    expect(r.lancamentos[0]).toMatchObject({
      correcao: { fator: "1.020504" },
      corrigido: "459.23",
      juros: { percentual: "20.354839" },
      jurosValor: "93.47",
      atualizado: "552.70",
    });
  });
});

describe("calcular (fase 3: situação dos lançamentos, base dos alimentos e proveniência)", () => {
  const hoje = "2026-10-11";
  const semValorInformado = (
    id: string,
    data: string,
    extra: Partial<Lancamento> = {},
  ): Lancamento => ({
    id,
    tipo: "prestacao",
    data,
    competencia: data.slice(0, 7),
    origem: "lote",
    editado: false,
    ...extra,
  });
  const comBase = (base: Base, lancamentos: Lancamento[], dataElaboracao = hoje): Calculo => ({
    ...calculoCom(lancamentos, dataElaboracao),
    base,
  });

  it("pagamento posterior à data de elaboração fica fora dos totais, com aviso no lançamento e no resumo", () => {
    const futuro: Lancamento = { ...amortizacao, id: "a-2018-06", data: "2018-06-10" };
    const r = calcular(calculoCom([prestacao, futuro]), tabelaIgpm());
    expect(r.lancamentos[1]).toMatchObject({
      situacao: "ignorado",
      editado: false,
      valorBase: "440.00",
      atualizado: "440.00",
      jurosValor: "0.00",
    });
    expect(r.lancamentos[1]?.avisos).toEqual([
      "Pagamento de 10/06/2018, posterior à data de elaboração (25/05/2018): não computado nos totais.",
    ]);
    expect(r.totais).toMatchObject({
      prestacoes: "533.40",
      amortizacoes: "0.00",
      totalDevido: "533.40",
    });
    expect(r.avisos).toContain("Lançamentos não computados nos totais: pagamento de 10/06/2018.");
  });

  it("valor zero ou negativo informado: aviso e lançamento fora dos totais (pagamentos são informados como positivos)", () => {
    const zero: Lancamento = { ...prestacao, id: "p-zero", valorInformado: "0" };
    const negativo: Lancamento = { ...amortizacao, id: "a-negativo", valorInformado: "-440.00" };
    const r = calcular(calculoCom([prestacao, zero, negativo, amortizacao]), tabelaIgpm());
    expect(r.lancamentos.map((l) => l.situacao)).toEqual([
      "atualizado",
      "ignorado",
      "ignorado",
      "atualizado",
    ]);
    expect(r.lancamentos[1]?.avisos.at(-1)).toBe(
      "Valor da prestação zero ou negativo (R$ 0,00): não computada nos totais.",
    );
    expect(r.lancamentos[2]?.avisos).toEqual([
      "Valor do pagamento zero ou negativo (-R$ 440,00): não computado nos totais; informe pagamentos como valores positivos.",
    ]);
    expect(r.lancamentos[2]).toMatchObject({ valorBase: "-440.00", atualizado: "-440.00" });
    expect(r.totais).toMatchObject({
      prestacoes: "533.40",
      amortizacoes: "519.35",
      totalDevido: "14.05",
    });
    expect(r.avisos).toContain(
      "Lançamentos não computados nos totais: prestação de jan/2017, pagamento de 10/01/2017.",
    );
  });

  it("texto decimal inválido no valor informado não derruba o motor: aviso e lançamento fora dos totais", () => {
    const invalidos = ["1,5", "", "NaN", "Infinity"].map((texto, i): Lancamento => ({
      ...prestacao,
      id: `p-invalido-${i}`,
      valorInformado: texto,
    }));
    const r = calcular(calculoCom([prestacao, ...invalidos]), tabelaIgpm());
    expect(r.lancamentos.slice(1).every((l) => l.situacao === "ignorado")).toBe(true);
    expect(r.lancamentos[1]).toMatchObject({
      valorBase: "0.00",
      memoriaBase: "Valor informado inválido",
      atualizado: "0.00",
    });
    expect(r.lancamentos[1]?.avisos).toEqual([
      'Valor informado ("1,5") não é um número válido (use ponto decimal, como 451.91): o lançamento não foi computado nos totais.',
    ]);
    expect(r.totais.prestacoes).toBe("533.40");
    // base com texto inválido tampouco derruba
    const r2 = calcular(
      comBase({ tipo: "percentualSalarioMinimo", percentual: "trinta" }, [
        semValorInformado("p", "2024-03-10"),
      ]),
      tabelaRegimeNovo(),
    );
    expect(r2.lancamentos[0]).toMatchObject({ situacao: "ignorado", valorBase: "0.00" });
    expect(r2.totais.prestacoes).toBe("0.00");
  });

  it("marca 'editado' só nas prestações com valor informado, com aviso no lançamento e resumo no resultado", () => {
    const r = calcular(
      calculoCom([prestacao, amortizacao, semValorInformado("p-lote", "2017-02-10")]),
      tabelaIgpm(),
    );
    expect(r.lancamentos.map((l) => l.editado)).toEqual([true, false, false]);
    expect(r.lancamentos[0]?.avisos[0]).toBe(
      "Valor informado à mão (R$ 451,91), não apurado pela base dos alimentos.",
    );
    expect(r.lancamentos[1]?.avisos).toEqual([
      "IGP-M de mai/2018 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
    ]);
    expect(r.avisos).toContain(
      "Prestações com valor informado à mão, não apurado pela base dos alimentos: jan/2017.",
    );
  });

  it("base em % do salário mínimo: valor apurado, salário mínimo em indicesUsados e séries em ordem numérica", () => {
    const base: Base = { tipo: "percentualSalarioMinimo", percentual: "30" };
    const r = calcular(
      comBase(base, [
        semValorInformado("p-2025-01", "2025-01-10"),
        semValorInformado("p-2026-01", "2026-01-10"),
      ]),
      tabelaRegimeNovo(),
    );
    expect(r.lancamentos.map((l) => l.valorBase)).toEqual(["455.40", "486.30"]);
    expect(r.lancamentos[0]?.memoriaBase).toBe(
      "30% do salário mínimo de jan/2025 (R$ 1.518,00) = R$ 455,40",
    );
    expect(r.lancamentos.map((l) => l.editado)).toEqual([false, false]);
    const salarios = r.indicesUsados.filter((i) => i.serie === "1619");
    expect(salarios).toEqual([
      {
        serie: "1619",
        competencia: "2025-01",
        valor: "1518.00",
        fonte: "embutida",
        obtidoEm: "2026-10-11T12:00:00.000Z",
      },
      {
        serie: "1619",
        competencia: "2026-01",
        valor: "1621.00",
        fonte: "embutida",
        obtidoEm: "2026-10-11T12:00:00.000Z",
      },
    ]);
    expect([...new Set(r.indicesUsados.map((i) => i.serie))]).toEqual(["433", "1619", "29543"]);
  });

  it("prestação vincenda em % do salário mínimo de mês ainda sem salário mínimo publicado: último publicado, nominal, avisos e resumos", () => {
    const base: Base = { tipo: "percentualSalarioMinimo", percentual: "30" };
    const r = calcular(
      comBase(base, [semValorInformado("p-2027-01", "2027-01-10")]),
      tabelaRegimeNovo(),
    );
    expect(r.lancamentos[0]).toMatchObject({
      situacao: "vincenda",
      valorBase: "486.30",
      atualizado: "486.30",
      memoriaBase:
        "30% do salário mínimo vigente em jan/2027 (R$ 1.621,00, último publicado: dez/2026) = R$ 486,30",
    });
    expect(r.lancamentos[0]?.avisos).toEqual([
      "Salário mínimo de jan/2027 ainda não publicado na tabela de índices: usado o de dez/2026 (R$ 1.621,00), vigente até a publicação do novo.",
      "Prestação com vencimento em 10/01/2027, posterior à data de elaboração (11/10/2026): vincenda, incluída pelo valor nominal, sem correção e sem juros.",
    ]);
    expect(r.avisos).toEqual([
      "Meses sem índice na tabela para o valor-base das prestações (ver o aviso de cada uma): salário mínimo de jan/2027.",
      "Prestações vincendas, incluídas pelo valor nominal, sem correção e sem juros: jan/2027.",
    ]);
    expect(r.indicesUsados).toEqual([
      {
        serie: "1619",
        competencia: "2026-12",
        valor: "1621.00",
        fonte: "embutida",
        obtidoEm: "2026-10-11T12:00:00.000Z",
      },
    ]);
  });

  it("valor fixo reajustado pelo IPCA: os 12 meses do acumulado entram em indicesUsados mesmo fora do período de correção", () => {
    const base: Base = {
      tipo: "valorFixo",
      valor: "500.00",
      dataFixacao: "2024-03-15",
      indiceReajuste: "IPCA",
      mesReajuste: 3,
    };
    const r = calcular(
      comBase(base, [semValorInformado("p-2025-03", "2025-03-15")]),
      tabelaRegimeNovo(),
    );
    expect(r.lancamentos[0]).toMatchObject({
      valorBase: "525.29",
      editado: false,
      situacao: "atualizado",
    });
    const ipca = r.indicesUsados.filter((i) => i.serie === "433").map((i) => i.competencia);
    expect(ipca.slice(0, 12)).toEqual(competenciasEntre("2024-03", "2025-02")); // reajuste
    expect(ipca.slice(12)).toEqual(competenciasEntre("2025-03", "2026-09")); // correção
    // reajuste sem índice: resumo próprio no resultado
    const r2 = calcular(
      comBase({ ...base, dataFixacao: "2025-11-15", mesReajuste: 11 }, [
        semValorInformado("p-2026-11", "2026-11-15"),
      ]),
      tabelaRegimeNovo(),
    );
    expect(r2.avisos).toContain(
      "Meses sem índice na tabela para o valor-base das prestações (ver o aviso de cada uma): IPCA de out/2026.",
    );
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Execute: `npm test -- src/motor/calcular.test.ts`
Esperado: falham exatamente 14 testes e passam 12. Os 14: "avisa o mês sem índice no lançamento e no resumo"; "mês sem índice no meio do período: aviso no lançamento e no resumo, em ordem cronológica"; "mês que não entra no cálculo (fração zero) não gera aviso nem conta como índice usado"; "prestação posterior à data de elaboração é vincenda: valor nominal, sem correção e sem juros, mesmo com termos próprios (§6.7)"; "prestação sem valor informado é apurada pela base dos alimentos (§6.3), sem a marca de editado"; "regime novo de ponta a ponta: IPCA e taxa legal conferidos na Calculadora do Cidadão"; "termo final próprio posterior à data de elaboração é limitado a ela, com aviso"; "pagamento posterior à data de elaboração fica fora dos totais, com aviso no lançamento e no resumo"; "valor zero ou negativo informado: aviso e lançamento fora dos totais (pagamentos são informados como positivos)"; "texto decimal inválido no valor informado não derruba o motor: aviso e lançamento fora dos totais"; "marca 'editado' só nas prestações com valor informado, com aviso no lançamento e resumo no resultado"; "base em % do salário mínimo: valor apurado, salário mínimo em indicesUsados e séries em ordem numérica"; "prestação vincenda em % do salário mínimo de mês ainda sem salário mínimo publicado: último publicado, nominal, avisos e resumos"; "valor fixo reajustado pelo IPCA: os 12 meses do acumulado entram em indicesUsados mesmo fora do período de correção". (`npm run tipos` também falha neste ponto: `calcular.ts` ainda não preenche `editado` e `situacao`.)

- [ ] **Step 5: Reescrever `src/motor/calcular.ts`**

```ts
import { competenciaDe } from "../compartilhado/datas.ts";
import {
  arredondar,
  CEM,
  decimal,
  decimalOuNulo,
  paraTexto,
  UM,
  ZERO,
  type Decimal,
} from "../compartilhado/decimal.ts";
import { formatarCompetencia, formatarData, formatarMoeda } from "../compartilhado/formatacao.ts";
import { CODIGO_DA_SERIE, NOME_DA_SERIE } from "../compartilhado/tipos.ts";
import type {
  Calculo,
  CodigoSerie,
  Competencia,
  DataISO,
  IndiceUsado,
  Lancamento,
  LancamentoCalculado,
  Resultado,
  SituacaoLancamento,
  TabelaIndices,
  Totais,
} from "../compartilhado/tipos.ts";
import { apurarValorBase, type MesSemIndice } from "./base.ts";
import { fatorCorrecao, resolverIndicesMensais } from "./correcao.ts";
import { jurosSimples } from "./juros.ts";
import { validarMetodologia } from "./periodos.ts";

/** Ordena códigos de série como números ("189" antes de "1619"). */
function compararSeries(a: CodigoSerie, b: CodigoSerie): number {
  return Number(a) - Number(b);
}

/** "prestação de jan/2017" ou "pagamento de 10/01/2017", para os avisos. */
function rotulo(l: Lancamento): string {
  if (l.tipo === "amortizacao") return `pagamento de ${formatarData(l.data)}`;
  return `prestação de ${l.competencia === undefined ? formatarData(l.data) : formatarCompetencia(l.competencia)}`;
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

function temTermosProprios(l: Lancamento): boolean {
  const e = l.encargos;
  return (
    e !== undefined &&
    (e.termoInicialCorrecao !== undefined ||
      e.termoFinalCorrecao !== undefined ||
      e.termoInicialJuros !== undefined ||
      e.termoFinalJuros !== undefined)
  );
}

interface Rastro {
  lancamento: LancamentoCalculado;
  mesesSemTaxaLegal: Competencia[];
  indicesDaBase: IndiceUsado[];
  mesesSemIndiceNaBase: MesSemIndice[];
}

interface ValorResolvido {
  valorBase: Decimal;
  memoriaBase: string;
  editado: boolean;
  /** não há valor utilizável: o lançamento fica fora dos totais */
  semValor: boolean;
}

/**
 * Valor-base do lançamento (§6.3): o valor informado prevalece (nas prestações, é "informado à
 * mão" e gera aviso); prestação sem valor é apurada pela base dos alimentos; pagamento sem valor
 * fica sem valor.
 */
function resolverValor(
  lancamento: Lancamento,
  calculo: Calculo,
  indices: TabelaIndices,
  valorCasas: number,
  avisos: string[],
  rastro: Pick<Rastro, "indicesDaBase" | "mesesSemIndiceNaBase">,
): ValorResolvido {
  if (lancamento.valorInformado !== undefined) {
    const informado = decimalOuNulo(lancamento.valorInformado);
    const editado = lancamento.tipo === "prestacao";
    if (informado === null) {
      avisos.push(
        `Valor informado ("${lancamento.valorInformado}") não é um número válido (use ponto decimal, como 451.91): o lançamento não foi computado nos totais.`,
      );
      return { valorBase: ZERO, memoriaBase: "Valor informado inválido", editado, semValor: true };
    }
    const valorBase = arredondar(informado, valorCasas);
    if (editado) {
      avisos.push(
        `Valor informado à mão (${formatarMoeda(valorBase)}), não apurado pela base dos alimentos.`,
      );
    }
    return {
      valorBase,
      memoriaBase: `Valor informado: ${formatarMoeda(valorBase)}`,
      editado,
      semValor: false,
    };
  }
  if (lancamento.tipo === "amortizacao") {
    avisos.push("Pagamento sem valor informado: não computado nos totais.");
    return { valorBase: ZERO, memoriaBase: "Valor não informado", editado: false, semValor: true };
  }
  const base = apurarValorBase(lancamento, calculo.base, indices, valorCasas);
  avisos.push(...base.avisos);
  rastro.indicesDaBase = base.indicesUsados;
  rastro.mesesSemIndiceNaBase = base.mesesSemIndice;
  if (base.valor === null) {
    return { valorBase: ZERO, memoriaBase: base.memoria, editado: false, semValor: true };
  }
  return { valorBase: base.valor, memoriaBase: base.memoria, editado: false, semValor: false };
}

/**
 * Situação do lançamento (§6.7): sem valor utilizável, valor zero ou negativo e pagamento
 * posterior à data de elaboração ficam fora dos totais; prestação posterior à data de elaboração
 * é vincenda (valor nominal, sem encargos, mesmo com termos próprios).
 */
function decidirSituacao(
  lancamento: Lancamento,
  calculo: Calculo,
  valor: ValorResolvido,
  avisos: string[],
): SituacaoLancamento {
  if (valor.semValor) return "ignorado";
  if (valor.valorBase.lte(ZERO)) {
    avisos.push(
      lancamento.tipo === "prestacao"
        ? `Valor da prestação zero ou negativo (${formatarMoeda(valor.valorBase)}): não computada nos totais.`
        : `Valor do pagamento zero ou negativo (${formatarMoeda(valor.valorBase)}): não computado nos totais; informe pagamentos como valores positivos.`,
    );
    return "ignorado";
  }
  if (lancamento.data <= calculo.dataElaboracao) return "atualizado";
  const datas = `${formatarData(lancamento.data)}, posterior à data de elaboração (${formatarData(calculo.dataElaboracao)})`;
  if (lancamento.tipo === "amortizacao") {
    avisos.push(`Pagamento de ${datas}: não computado nos totais.`);
    return "ignorado";
  }
  avisos.push(
    `Prestação com vencimento em ${datas}: vincenda, incluída pelo valor nominal, sem correção e sem juros.`,
  );
  if (temTermosProprios(lancamento)) {
    avisos.push("Os termos próprios informados não se aplicam à prestação vincenda.");
  }
  return "vincenda";
}

/**
 * Atualiza um lançamento (prestação ou amortização) da sua data até a data de elaboração,
 * ou pelos termos próprios e metodologia própria quando informados (§6.4 e §6.5). O fator e o
 * percentual multiplicam com precisão integral e só são arredondados para exibição (convenção
 * do SAJ); os juros incidem sobre o corrigido sem arredondar; corrigido e juros têm 2 casas.
 */
export function atualizarLancamento(
  lancamento: Lancamento,
  calculo: Calculo,
  indices: TabelaIndices,
): LancamentoCalculado {
  return atualizarComRastro(lancamento, calculo, indices).lancamento;
}

/**
 * Faz o trabalho de `atualizarLancamento` e devolve também o que `calcular` resume no Resultado:
 * as competências cuja taxa legal faltou, os índices que a base consumiu e os meses que faltaram
 * para a base.
 */
function atualizarComRastro(
  lancamento: Lancamento,
  calculo: Calculo,
  indices: TabelaIndices,
): Rastro {
  const metodologia = lancamento.encargos?.metodologia ?? calculo.metodologia;
  const { fatorCasas, percentualCasas, valorCasas } = metodologia.arredondamento;
  const avisos: string[] = [];
  if (lancamento.encargos?.metodologia !== undefined) {
    avisos.push(...validarMetodologia(lancamento.encargos.metodologia));
  }
  const rastroDaBase: Pick<Rastro, "indicesDaBase" | "mesesSemIndiceNaBase"> = {
    indicesDaBase: [],
    mesesSemIndiceNaBase: [],
  };
  const valor = resolverValor(lancamento, calculo, indices, valorCasas, avisos, rastroDaBase);
  const situacao = decidirSituacao(lancamento, calculo, valor, avisos);
  const comum = {
    id: lancamento.id,
    tipo: lancamento.tipo,
    data: lancamento.data,
    competencia: lancamento.competencia,
    descricao: lancamento.descricao,
    valorBase: paraTexto(valor.valorBase, valorCasas),
    memoriaBase: valor.memoriaBase,
    editado: valor.editado,
    situacao,
  };

  // Vincenda e ignorado entram pelo valor nominal: sem correção e sem juros (§6.7).
  if (situacao !== "atualizado") {
    return {
      lancamento: {
        ...comum,
        correcao: { fator: paraTexto(UM, fatorCasas), indices: [], pisoAplicado: false },
        corrigido: paraTexto(valor.valorBase, valorCasas),
        juros: { percentual: paraTexto(ZERO, percentualCasas), detalhe: [] },
        jurosValor: paraTexto(ZERO, valorCasas),
        atualizado: paraTexto(valor.valorBase, valorCasas),
        avisos,
      },
      mesesSemTaxaLegal: [],
      ...rastroDaBase,
    };
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
  const corrigidoBruto = valor.valorBase.times(correcao.fator);
  const corrigido = arredondar(corrigidoBruto, valorCasas);

  const juros = jurosSimples({
    termoInicial: termoInicialJuros,
    termoFinal: termoFinalJuros,
    metodologia,
    indices,
    casas: percentualCasas,
  });
  avisos.push(...juros.avisos);
  // Juros sobre o corrigido sem arredondar, como o SAJ (decisão de 11/10/2026, ponto 9).
  const jurosValor = arredondar(corrigidoBruto.times(juros.percentual).div(CEM), valorCasas);
  const atualizado = corrigido.plus(jurosValor);

  return {
    lancamento: {
      ...comum,
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
    },
    mesesSemTaxaLegal: juros.mesesSemTaxaLegal,
    ...rastroDaBase,
  };
}

/** Lista "prestação de jan/2017, pagamento de 10/02/2017" na ordem dos lançamentos. */
function listar(lancamentos: Lancamento[]): string {
  return lancamentos.map(rotulo).join(", ");
}

/** Calcula o Resultado completo de um Cálculo com uma tabela de índices congelada (§4.3). */
export function calcular(calculo: Calculo, indices: TabelaIndices): Resultado {
  const rastros = calculo.lancamentos.map((l) => atualizarComRastro(l, calculo, indices));
  const lancamentos = rastros.map((r) => r.lancamento);
  const valorCasas = calculo.metodologia.arredondamento.valorCasas;

  // Totais: só os lançamentos computados (vincendas entram pelo valor nominal; ignorados não entram).
  const somar = (tipo: Lancamento["tipo"]): Decimal =>
    lancamentos
      .filter((l) => l.tipo === tipo && l.situacao !== "ignorado")
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
  // fração zero não pesou no fator: não conta como índice usado nem como mês sem índice. A taxa
  // legal dos juros (série 29543) e os índices da base (salário mínimo, série 1619, e índice de
  // reajuste) também são índices usados; os meses deles que faltam têm resumos próprios.
  const usados = new Map<string, IndiceUsado>();
  const registrar = (serie: CodigoSerie, competencia: Competencia): void => {
    const chave = `${serie}|${competencia}`;
    const registro = indices.series[serie]?.[competencia];
    if (!usados.has(chave) && registro) {
      usados.set(chave, {
        serie,
        competencia,
        valor: registro.valor,
        fonte: registro.fonte,
        obtidoEm: registro.obtidoEm,
      });
    }
  };
  const semIndice = new Map<CodigoSerie, Set<Competencia>>();
  const semIndiceNaBase = new Map<CodigoSerie, Set<Competencia>>();
  const anotar = (
    mapa: Map<CodigoSerie, Set<Competencia>>,
    serie: CodigoSerie,
    competencia: Competencia,
  ): void => {
    const meses = mapa.get(serie) ?? new Set<Competencia>();
    meses.add(competencia);
    mapa.set(serie, meses);
  };
  for (const r of rastros) {
    for (const i of r.lancamento.correcao.indices) {
      if (i.serie === null || i.fracao.startsWith("0/")) continue;
      if (i.valor === null) anotar(semIndice, i.serie, i.competencia);
      else registrar(i.serie, i.competencia);
    }
    for (const d of r.lancamento.juros.detalhe) {
      if (d.regime === "taxaLegal") registrar(CODIGO_DA_SERIE.taxaLegal, competenciaDe(d.de));
    }
    for (const i of r.indicesDaBase) registrar(i.serie, i.competencia);
    for (const m of r.mesesSemIndiceNaBase) anotar(semIndiceNaBase, m.serie, m.competencia);
  }
  const indicesUsados = [...usados.values()].sort(
    (a, b) =>
      compararSeries(a.serie, b.serie) ||
      (a.competencia < b.competencia ? -1 : a.competencia > b.competencia ? 1 : 0),
  );
  const descreverFaltas = (mapa: Map<CodigoSerie, Set<Competencia>>): string =>
    [...mapa.entries()]
      .sort(([a], [b]) => compararSeries(a, b))
      .map(
        ([serie, meses]) =>
          `${NOME_DA_SERIE[serie]} de ${[...meses].sort().map(formatarCompetencia).join(", ")}`,
      )
      .join("; ");
  if (semIndice.size > 0) {
    avisos.push(
      `Meses sem índice na tabela (entraram sem correção): ${descreverFaltas(semIndice)}.`,
    );
  }
  const semTaxaLegal = new Set<Competencia>(rastros.flatMap((r) => r.mesesSemTaxaLegal));
  if (semTaxaLegal.size > 0) {
    const lista = [...semTaxaLegal].sort().map(formatarCompetencia).join(", ");
    avisos.push(
      `Meses sem taxa legal na tabela (os dias desses meses ficaram sem juros): ${lista}.`,
    );
  }
  if (semIndiceNaBase.size > 0) {
    avisos.push(
      `Meses sem índice na tabela para o valor-base das prestações (ver o aviso de cada uma): ${descreverFaltas(semIndiceNaBase)}.`,
    );
  }

  // Resumos dos lançamentos especiais (§5.4): vincendas, valores informados à mão e ignorados.
  const porSituacao = (situacao: SituacaoLancamento): Lancamento[] =>
    calculo.lancamentos.filter((_, i) => lancamentos[i]?.situacao === situacao);
  const vincendas = porSituacao("vincenda");
  if (vincendas.length > 0) {
    avisos.push(
      `Prestações vincendas, incluídas pelo valor nominal, sem correção e sem juros: ${vincendas.map((l) => (l.competencia === undefined ? formatarData(l.data) : formatarCompetencia(l.competencia))).join(", ")}.`,
    );
  }
  const informadas = calculo.lancamentos.filter((_, i) => lancamentos[i]?.editado === true);
  if (informadas.length > 0) {
    avisos.push(
      `Prestações com valor informado à mão, não apurado pela base dos alimentos: ${informadas.map((l) => (l.competencia === undefined ? formatarData(l.data) : formatarCompetencia(l.competencia))).join(", ")}.`,
    );
  }
  const ignorados = porSituacao("ignorado");
  if (ignorados.length > 0) {
    avisos.push(`Lançamentos não computados nos totais: ${listar(ignorados)}.`);
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

- [ ] **Step 6: Rodar e ver passar**

Execute: `npm test && npm run tipos`
Esperado: todos passam (os 26 de `calcular.test.ts`, os casos e o restante); tipos limpos.

- [ ] **Step 7: Corrigir `base.valor` nos dois casos de R$ 10.000,00**

Em `src/motor/casos/2026-10-11-saj-tjms-selic-capitalizada.json` e em `src/motor/casos/2026-10-11-transicao-lei-14905.json`, na linha `"base": {"tipo": "valorFixo", "valor": "1000.00", …}`, troque `"valor": "1000.00"` por `"valor": "10000.00"` (as prestações desses casos valem R$ 10.000,00; o campo não afeta o resultado porque todos os lançamentos têm valor informado, mas passaria a conflitar com a base se um deles fosse apagado).

Execute: `npm test`
Esperado: todos passam.

- [ ] **Step 8: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add src/compartilhado/tipos.ts src/motor/calcular.ts src/motor/calcular.test.ts src/motor/casos.test.ts src/motor/casos/2026-10-11-saj-tjms-selic-capitalizada.json src/motor/casos/2026-10-11-transicao-lei-14905.json && git commit -m "motor: valor-base pela base dos alimentos, situação dos lançamentos, valores informados à mão e proveniência da base" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

### Task 7: Casos de referência das três bases, testes de ponta a ponta e observações do caso de 2018

**Files:**
- Create: `src/motor/casos/2026-10-11-saj-tjms-percentual-rendimentos-lote.json`, `src/motor/casos/2018-05-25-saj-tjms-base-valor-fixo-reajuste-sm.json`, `src/motor/casos/2026-10-11-valor-fixo-reajuste-ipca.json`, `src/motor/casos-pela-base.test.ts`
- Modify: `src/motor/casos/2018-05-25-saj-tjms-alimentos.json` (só `observacoes`)

**Interfaces:**
- Consome: `calcular` (Task 6), `gerarLotePrestacoes` (Task 3), o formato do caso com os campos opcionais (Task 6), `src/motor/casos.test.ts` (executa todo JSON da pasta).
- Produz: três casos novos (11 no total) e dois testes de ponta a ponta. Fontes: relatório do SAJ Tribunais de 11/10/2026 (22 linhas, base "valor informado" R$ 1.500,00 × 0,30, IGP-M + 1%, tabela do SAJ com dez/2025 = −0,02); relatório de 2018 (28 linhas, Anexo A); Calculadora do Cidadão e motor independente em Python (8 linhas). O PDF de 2026 fica fora do repositório; nenhum nome nem número de processo é transcrito.

- [ ] **Step 1: Caso do SAJ: 30% de R$ 1.500,00 em lote no dia 1**

Crie `src/motor/casos/2026-10-11-saj-tjms-percentual-rendimentos-lote.json` (as 22 prestações nascem sem valor informado, com origem "lote", e o motor apura R$ 450,00 pela base em percentual dos rendimentos; os valores esperados são os impressos no relatório; os totais são a soma das linhas impressas, 11.216,68, enquanto o SAJ imprime a soma sem arredondar, 11.216,66):

```json
{
  "formato": "apura/caso-de-referencia@1",
  "nome": "SAJ TJMS, Cálculo Judicial Avulso (alimentos), 30% de R$ 1.500,00 em lote no dia 1, IGP-M e 1% ao mês, cálculo de 11/10/2026",
  "fonte": "Relatório de Cálculo Judicial – Sintético/Analítico do SAJ Tribunais (TJMS), tipo Alimentos, emitido em 11/10/2026 pelo responsável a partir de dados fictícios (base 'valor informado' R$ 1.500,00, quantidade 0,30, de 01/01/2025 a 01/10/2026, sem pagamentos); sem número de processo; PDF fora do repositório.",
  "observacoes": "No SAJ, a base 'valor informado' multiplica um valor mensal fixo (R$ 1.500,00) pela quantidade (0,30) e não aplica reajuste algum: R$ 450,00 em todos os 22 meses. No Apura isso corresponde à base em percentual dos rendimentos (30% do rendimento padrão de R$ 1.500,00) ou ao valor fixo sem reajuste; o caso usa a primeira e deixa as prestações sem valor informado, para que o motor apure cada uma pela base. Como a data inicial é dia 1, todas as prestações do SAJ caem no dia 1, igual ao lote do Apura com dia de vencimento 1 (de jan/2025 a out/2026). Parâmetros declarados: IGP-M (FGV) da data do lançamento até 30/09/2026 (pro rata); juro legal simples de 1,00% ao mês sobre o valor corrigido, da data do lançamento até 11/10/2026; sem piso na deflação (jun/2026 sai corrigida abaixo do original). A tabela congelada é a do SAJ: dez/2025 = −0,02 (série 189 do BCB: −0,01). Os juros incidem sobre o corrigido sem arredondar (02/2025: 459,2268 × 20,354839% = 93,47; sobre R$ 459,23 daria 93,48; o mesmo em 09/2025). O SAJ soma as linhas sem arredondar e imprime 11.216,66; o Apura soma as linhas impressas (11.216,68).",
  "calculo": {
    "formato": "apura/calculo@1",
    "tipo": "alimentos",
    "id": "caso-saj-2026-percentual-rendimentos",
    "criadoEm": "2026-10-11T17:00:00.000Z",
    "atualizadoEm": "2026-10-11T17:00:00.000Z",
    "dataElaboracao": "2026-10-11",
    "cabecalho": {
      "defensor": "",
      "orgao": "",
      "processo": "",
      "exequente": "",
      "executado": ""
    },
    "base": {
      "tipo": "percentualRendimentos",
      "percentual": "30",
      "rendimentoPadrao": "1500.00"
    },
    "lotes": {
      "ultimoLotePrestacoes": {
        "diaVencimento": 1,
        "de": "2025-01",
        "ate": "2026-10"
      }
    },
    "lancamentos": [
      {"id": "p-2025-01", "tipo": "prestacao", "data": "2025-01-01", "competencia": "2025-01", "origem": "lote", "editado": false},
      {"id": "p-2025-02", "tipo": "prestacao", "data": "2025-02-01", "competencia": "2025-02", "origem": "lote", "editado": false},
      {"id": "p-2025-03", "tipo": "prestacao", "data": "2025-03-01", "competencia": "2025-03", "origem": "lote", "editado": false},
      {"id": "p-2025-04", "tipo": "prestacao", "data": "2025-04-01", "competencia": "2025-04", "origem": "lote", "editado": false},
      {"id": "p-2025-05", "tipo": "prestacao", "data": "2025-05-01", "competencia": "2025-05", "origem": "lote", "editado": false},
      {"id": "p-2025-06", "tipo": "prestacao", "data": "2025-06-01", "competencia": "2025-06", "origem": "lote", "editado": false},
      {"id": "p-2025-07", "tipo": "prestacao", "data": "2025-07-01", "competencia": "2025-07", "origem": "lote", "editado": false},
      {"id": "p-2025-08", "tipo": "prestacao", "data": "2025-08-01", "competencia": "2025-08", "origem": "lote", "editado": false},
      {"id": "p-2025-09", "tipo": "prestacao", "data": "2025-09-01", "competencia": "2025-09", "origem": "lote", "editado": false},
      {"id": "p-2025-10", "tipo": "prestacao", "data": "2025-10-01", "competencia": "2025-10", "origem": "lote", "editado": false},
      {"id": "p-2025-11", "tipo": "prestacao", "data": "2025-11-01", "competencia": "2025-11", "origem": "lote", "editado": false},
      {"id": "p-2025-12", "tipo": "prestacao", "data": "2025-12-01", "competencia": "2025-12", "origem": "lote", "editado": false},
      {"id": "p-2026-01", "tipo": "prestacao", "data": "2026-01-01", "competencia": "2026-01", "origem": "lote", "editado": false},
      {"id": "p-2026-02", "tipo": "prestacao", "data": "2026-02-01", "competencia": "2026-02", "origem": "lote", "editado": false},
      {"id": "p-2026-03", "tipo": "prestacao", "data": "2026-03-01", "competencia": "2026-03", "origem": "lote", "editado": false},
      {"id": "p-2026-04", "tipo": "prestacao", "data": "2026-04-01", "competencia": "2026-04", "origem": "lote", "editado": false},
      {"id": "p-2026-05", "tipo": "prestacao", "data": "2026-05-01", "competencia": "2026-05", "origem": "lote", "editado": false},
      {"id": "p-2026-06", "tipo": "prestacao", "data": "2026-06-01", "competencia": "2026-06", "origem": "lote", "editado": false},
      {"id": "p-2026-07", "tipo": "prestacao", "data": "2026-07-01", "competencia": "2026-07", "origem": "lote", "editado": false},
      {"id": "p-2026-08", "tipo": "prestacao", "data": "2026-08-01", "competencia": "2026-08", "origem": "lote", "editado": false},
      {"id": "p-2026-09", "tipo": "prestacao", "data": "2026-09-01", "competencia": "2026-09", "origem": "lote", "editado": false},
      {"id": "p-2026-10", "tipo": "prestacao", "data": "2026-10-01", "competencia": "2026-10", "origem": "lote", "editado": false}
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
      "arredondamento": {
        "fatorCasas": 6,
        "percentualCasas": 6,
        "valorCasas": 2,
        "modo": "comercial"
      }
    },
    "acrescimos": {
      "multaPercentual": "0",
      "honorariosPercentual": "0"
    },
    "observacoes": ""
  },
  "indices": {
    "consultadoEm": "2026-10-11T00:00:00.000Z",
    "series": {
      "189": {
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
      {"id": "p-2025-01", "valorBase": "450.00", "editado": false, "situacao": "atualizado", "fator": "1.023555", "corrigido": "460.60", "jurosPercentual": "21.354839", "jurosValor": "98.36", "atualizado": "558.96", "memoriaBase": "30% do rendimento padrão (R$ 1.500,00) = R$ 450,00"},
      {"id": "p-2025-02", "valorBase": "450.00", "editado": false, "situacao": "atualizado", "fator": "1.020504", "corrigido": "459.23", "jurosPercentual": "20.354839", "jurosValor": "93.47", "atualizado": "552.70"},
      {"id": "p-2025-03", "valorBase": "450.00", "editado": false, "situacao": "atualizado", "fator": "1.010291", "corrigido": "454.63", "jurosPercentual": "19.354839", "jurosValor": "87.99", "atualizado": "542.62"},
      {"id": "p-2025-04", "valorBase": "450.00", "editado": false, "situacao": "atualizado", "fator": "1.013545", "corrigido": "456.10", "jurosPercentual": "18.354839", "jurosValor": "83.72", "atualizado": "539.82"},
      {"id": "p-2025-05", "valorBase": "450.00", "editado": false, "situacao": "atualizado", "fator": "1.011360", "corrigido": "455.11", "jurosPercentual": "17.354839", "jurosValor": "78.98", "atualizado": "534.09"},
      {"id": "p-2025-06", "valorBase": "450.00", "editado": false, "situacao": "atualizado", "fator": "1.016749", "corrigido": "457.54", "jurosPercentual": "16.354839", "jurosValor": "74.83", "atualizado": "532.37"},
      {"id": "p-2025-07", "valorBase": "450.00", "editado": false, "situacao": "atualizado", "fator": "1.033695", "corrigido": "465.16", "jurosPercentual": "15.354839", "jurosValor": "71.42", "atualizado": "536.58"},
      {"id": "p-2025-08", "valorBase": "450.00", "editado": false, "situacao": "atualizado", "fator": "1.041336", "corrigido": "468.60", "jurosPercentual": "14.354839", "jurosValor": "67.27", "atualizado": "535.87"},
      {"id": "p-2025-09", "valorBase": "450.00", "editado": false, "situacao": "atualizado", "fator": "1.037576", "corrigido": "466.91", "jurosPercentual": "13.354839", "jurosValor": "62.35", "atualizado": "529.26"},
      {"id": "p-2025-10", "valorBase": "450.00", "editado": false, "situacao": "atualizado", "fator": "1.033501", "corrigido": "465.08", "jurosPercentual": "12.354839", "jurosValor": "57.46", "atualizado": "522.54"},
      {"id": "p-2025-11", "valorBase": "450.00", "editado": false, "situacao": "atualizado", "fator": "1.037021", "corrigido": "466.66", "jurosPercentual": "11.354839", "jurosValor": "52.99", "atualizado": "519.65"},
      {"id": "p-2025-12", "valorBase": "450.00", "editado": false, "situacao": "atualizado", "fator": "1.034328", "corrigido": "465.45", "jurosPercentual": "10.354839", "jurosValor": "48.20", "atualizado": "513.65"},
      {"id": "p-2026-01", "valorBase": "450.00", "editado": false, "situacao": "atualizado", "fator": "1.034392", "corrigido": "465.48", "jurosPercentual": "9.354839", "jurosValor": "43.54", "atualizado": "509.02"},
      {"id": "p-2026-02", "valorBase": "450.00", "editado": false, "situacao": "atualizado", "fator": "1.030574", "corrigido": "463.76", "jurosPercentual": "8.354839", "jurosValor": "38.75", "atualizado": "502.51"},
      {"id": "p-2026-03", "valorBase": "450.00", "editado": false, "situacao": "atualizado", "fator": "1.037707", "corrigido": "466.97", "jurosPercentual": "7.354839", "jurosValor": "34.34", "atualizado": "501.31"},
      {"id": "p-2026-04", "valorBase": "450.00", "editado": false, "situacao": "atualizado", "fator": "1.031585", "corrigido": "464.21", "jurosPercentual": "6.354839", "jurosValor": "29.50", "atualizado": "493.71"},
      {"id": "p-2026-05", "valorBase": "450.00", "editado": false, "situacao": "atualizado", "fator": "1.004802", "corrigido": "452.16", "jurosPercentual": "5.354839", "jurosValor": "24.21", "atualizado": "476.37"},
      {"id": "p-2026-06", "valorBase": "450.00", "editado": false, "situacao": "atualizado", "fator": "0.996867", "corrigido": "448.59", "jurosPercentual": "4.354839", "jurosValor": "19.54", "atualizado": "468.13"},
      {"id": "p-2026-07", "valorBase": "450.00", "editado": false, "situacao": "atualizado", "fator": "1.002086", "corrigido": "450.94", "jurosPercentual": "3.354839", "jurosValor": "15.13", "atualizado": "466.07"},
      {"id": "p-2026-08", "valorBase": "450.00", "editado": false, "situacao": "atualizado", "fator": "1.013537", "corrigido": "456.09", "jurosPercentual": "2.354839", "jurosValor": "10.74", "atualizado": "466.83"},
      {"id": "p-2026-09", "valorBase": "450.00", "editado": false, "situacao": "atualizado", "fator": "1.015173", "corrigido": "456.83", "jurosPercentual": "1.354839", "jurosValor": "6.19", "atualizado": "463.02"},
      {"id": "p-2026-10", "valorBase": "450.00", "editado": false, "situacao": "atualizado", "fator": "1.000000", "corrigido": "450.00", "jurosPercentual": "0.354839", "jurosValor": "1.60", "atualizado": "451.60"}
    ],
    "totais": {
      "prestacoes": "11216.68",
      "amortizacoes": "0.00",
      "totalDevido": "11216.68",
      "multa": "0.00",
      "honorarios": "0.00",
      "totalGeral": "11216.68"
    },
    "avisos": ["Meses sem índice na tabela (entraram sem correção): IGP-M de out/2026."]
  }
}
```

Execute: `npm test -- src/motor/casos.test.ts`
Esperado: todos passam, inclusive as 22 linhas, os totais e os avisos do caso novo. Se alguma linha não bater, pare e relate: a implementação (ou a transcrição) está errada, não o relatório.

- [ ] **Step 2: Caso de 2018 recalculado pela base em valor fixo reajustado pelo salário mínimo**

Crie `src/motor/casos/2018-05-25-saj-tjms-base-valor-fixo-reajuste-sm.json` (mesmas 28 linhas do caso de 2018; as prestações sem valor informado; a base R$ 451,91 fixados em 10/01/2017, reajuste "SM"; a série 1619 congelada de jan/2017 a fev/2018):

```json
{
  "formato": "apura/caso-de-referencia@1",
  "nome": "SAJ TJMS, execução de alimentos de 25/05/2018, com a base apurada: valor fixo de R$ 451,91 reajustado pelo salário mínimo",
  "fonte": "Relatório de Cálculo Processual – Sintético, TJMS/SAJ, emitido em 25/05/2018; transcrito no Anexo A de docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md. Número do processo omitido; PDF original fora do repositório. Salário mínimo (série 1619 do BCB): R$ 937,00 em 2017 e R$ 954,00 em 2018.",
  "observacoes": "Mesmas 14 prestações e 14 amortizações do caso de 2018, mas as prestações entram sem valor informado e o motor apura cada uma pela base: R$ 451,91 fixados em 10/01/2017 e reajustados pela proporção do salário mínimo do mês do vencimento sobre o de jan/2017 (937,00). Em 2017 o valor fica R$ 451,91; em 2018, 451,91 × 954 ÷ 937 = 460,109… = R$ 460,11, exatamente o valor do relatório. A hipótese de 48,23% do salário mínimo não confere (937 × 48,23% = 451,9151 → 451,92). Os pagamentos têm valor informado, como sempre.",
  "calculo": {
    "formato": "apura/calculo@1",
    "tipo": "alimentos",
    "id": "caso-saj-2018-base-valor-fixo-sm",
    "criadoEm": "2026-10-10T00:00:00.000Z",
    "atualizadoEm": "2026-10-10T00:00:00.000Z",
    "dataElaboracao": "2018-05-25",
    "cabecalho": {
      "defensor": "",
      "orgao": "",
      "processo": "",
      "exequente": "",
      "executado": ""
    },
    "base": {
      "tipo": "valorFixo",
      "valor": "451.91",
      "dataFixacao": "2017-01-10",
      "indiceReajuste": "SM",
      "mesReajuste": 1
    },
    "lotes": {
      "ultimoLotePrestacoes": {
        "diaVencimento": 10,
        "de": "2017-01",
        "ate": "2018-02"
      }
    },
    "lancamentos": [
      {"id": "p-2017-01", "tipo": "prestacao", "data": "2017-01-10", "competencia": "2017-01", "origem": "lote", "editado": false},
      {"id": "p-2017-02", "tipo": "prestacao", "data": "2017-02-10", "competencia": "2017-02", "origem": "lote", "editado": false},
      {"id": "p-2017-03", "tipo": "prestacao", "data": "2017-03-10", "competencia": "2017-03", "origem": "lote", "editado": false},
      {"id": "p-2017-04", "tipo": "prestacao", "data": "2017-04-10", "competencia": "2017-04", "origem": "lote", "editado": false},
      {"id": "p-2017-05", "tipo": "prestacao", "data": "2017-05-10", "competencia": "2017-05", "origem": "lote", "editado": false},
      {"id": "p-2017-06", "tipo": "prestacao", "data": "2017-06-10", "competencia": "2017-06", "origem": "lote", "editado": false},
      {"id": "p-2017-07", "tipo": "prestacao", "data": "2017-07-10", "competencia": "2017-07", "origem": "lote", "editado": false},
      {"id": "p-2017-08", "tipo": "prestacao", "data": "2017-08-10", "competencia": "2017-08", "origem": "lote", "editado": false},
      {"id": "p-2017-09", "tipo": "prestacao", "data": "2017-09-10", "competencia": "2017-09", "origem": "lote", "editado": false},
      {"id": "p-2017-10", "tipo": "prestacao", "data": "2017-10-10", "competencia": "2017-10", "origem": "lote", "editado": false},
      {"id": "p-2017-11", "tipo": "prestacao", "data": "2017-11-10", "competencia": "2017-11", "origem": "lote", "editado": false},
      {"id": "p-2017-12", "tipo": "prestacao", "data": "2017-12-10", "competencia": "2017-12", "origem": "lote", "editado": false},
      {"id": "p-2018-01", "tipo": "prestacao", "data": "2018-01-10", "competencia": "2018-01", "origem": "lote", "editado": false},
      {"id": "p-2018-02", "tipo": "prestacao", "data": "2018-02-10", "competencia": "2018-02", "origem": "lote", "editado": false},
      {"id": "a-2017-01", "tipo": "amortizacao", "data": "2017-01-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false},
      {"id": "a-2017-02", "tipo": "amortizacao", "data": "2017-02-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false},
      {"id": "a-2017-03", "tipo": "amortizacao", "data": "2017-03-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false},
      {"id": "a-2017-04", "tipo": "amortizacao", "data": "2017-04-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false},
      {"id": "a-2017-05", "tipo": "amortizacao", "data": "2017-05-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false},
      {"id": "a-2017-06", "tipo": "amortizacao", "data": "2017-06-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false},
      {"id": "a-2017-07", "tipo": "amortizacao", "data": "2017-07-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false},
      {"id": "a-2017-08", "tipo": "amortizacao", "data": "2017-08-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false},
      {"id": "a-2017-09", "tipo": "amortizacao", "data": "2017-09-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false},
      {"id": "a-2017-10", "tipo": "amortizacao", "data": "2017-10-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false},
      {"id": "a-2017-11", "tipo": "amortizacao", "data": "2017-11-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false},
      {"id": "a-2017-12", "tipo": "amortizacao", "data": "2017-12-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false},
      {"id": "a-2018-01", "tipo": "amortizacao", "data": "2018-01-10", "descricao": "Pagamento parcial", "valorInformado": "448.00", "origem": "avulso", "editado": false},
      {"id": "a-2018-02", "tipo": "amortizacao", "data": "2018-02-10", "descricao": "Pagamento parcial", "valorInformado": "448.00", "origem": "avulso", "editado": false}
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
      "arredondamento": {
        "fatorCasas": 6,
        "percentualCasas": 6,
        "valorCasas": 2,
        "modo": "comercial"
      }
    },
    "acrescimos": {
      "multaPercentual": "0",
      "honorariosPercentual": "0"
    },
    "observacoes": ""
  },
  "indices": {
    "consultadoEm": "2018-05-25T00:00:00.000Z",
    "series": {
      "189": {
        "2017-01": {"valor": "0.64", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z"},
        "2017-02": {"valor": "0.08", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z"},
        "2017-03": {"valor": "0.01", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z"},
        "2017-04": {"valor": "-1.10", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z"},
        "2017-05": {"valor": "-0.93", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z"},
        "2017-06": {"valor": "-0.67", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z"},
        "2017-07": {"valor": "-0.72", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z"},
        "2017-08": {"valor": "0.10", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z"},
        "2017-09": {"valor": "0.47", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z"},
        "2017-10": {"valor": "0.20", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z"},
        "2017-11": {"valor": "0.52", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z"},
        "2017-12": {"valor": "0.89", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z"},
        "2018-01": {"valor": "0.76", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z"},
        "2018-02": {"valor": "0.07", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z"},
        "2018-03": {"valor": "0.64", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z"},
        "2018-04": {"valor": "0.57", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z"}
      },
      "1619": {
        "2017-01": {"valor": "937.00", "fonte": "embutida", "obtidoEm": "2018-05-25T00:00:00.000Z"},
        "2017-02": {"valor": "937.00", "fonte": "embutida", "obtidoEm": "2018-05-25T00:00:00.000Z"},
        "2017-03": {"valor": "937.00", "fonte": "embutida", "obtidoEm": "2018-05-25T00:00:00.000Z"},
        "2017-04": {"valor": "937.00", "fonte": "embutida", "obtidoEm": "2018-05-25T00:00:00.000Z"},
        "2017-05": {"valor": "937.00", "fonte": "embutida", "obtidoEm": "2018-05-25T00:00:00.000Z"},
        "2017-06": {"valor": "937.00", "fonte": "embutida", "obtidoEm": "2018-05-25T00:00:00.000Z"},
        "2017-07": {"valor": "937.00", "fonte": "embutida", "obtidoEm": "2018-05-25T00:00:00.000Z"},
        "2017-08": {"valor": "937.00", "fonte": "embutida", "obtidoEm": "2018-05-25T00:00:00.000Z"},
        "2017-09": {"valor": "937.00", "fonte": "embutida", "obtidoEm": "2018-05-25T00:00:00.000Z"},
        "2017-10": {"valor": "937.00", "fonte": "embutida", "obtidoEm": "2018-05-25T00:00:00.000Z"},
        "2017-11": {"valor": "937.00", "fonte": "embutida", "obtidoEm": "2018-05-25T00:00:00.000Z"},
        "2017-12": {"valor": "937.00", "fonte": "embutida", "obtidoEm": "2018-05-25T00:00:00.000Z"},
        "2018-01": {"valor": "954.00", "fonte": "embutida", "obtidoEm": "2018-05-25T00:00:00.000Z"},
        "2018-02": {"valor": "954.00", "fonte": "embutida", "obtidoEm": "2018-05-25T00:00:00.000Z"}
      }
    }
  },
  "esperado": {
    "lancamentos": [
      {"id": "p-2017-01", "valorBase": "451.91", "editado": false, "situacao": "atualizado", "memoriaBase": "R$ 451,91 fixados em 10/01/2017 × salário mínimo de jan/2017 (R$ 937,00) ÷ salário mínimo de jan/2017 (R$ 937,00) = R$ 451,91", "fator": "1.013020", "corrigido": "457.79", "jurosPercentual": "16.516129", "jurosValor": "75.61", "atualizado": "533.40"},
      {"id": "p-2017-02", "valorBase": "451.91", "editado": false, "situacao": "atualizado", "fator": "1.008364", "corrigido": "455.69", "jurosPercentual": "15.485023", "jurosValor": "70.56", "atualizado": "526.25"},
      {"id": "p-2017-03", "valorBase": "451.91", "editado": false, "situacao": "atualizado", "fator": "1.007813", "corrigido": "455.44", "jurosPercentual": "14.516129", "jurosValor": "66.11", "atualizado": "521.55"},
      {"id": "p-2017-04", "valorBase": "451.91", "editado": false, "situacao": "atualizado", "fator": "1.011467", "corrigido": "457.09", "jurosPercentual": "13.506452", "jurosValor": "61.74", "atualizado": "518.83"},
      {"id": "p-2017-05", "valorBase": "451.91", "editado": false, "situacao": "atualizado", "fator": "1.022029", "corrigido": "461.87", "jurosPercentual": "12.516129", "jurosValor": "57.81", "atualizado": "519.68"},
      {"id": "p-2017-06", "valorBase": "451.91", "editado": false, "situacao": "atualizado", "fator": "1.030826", "corrigido": "465.84", "jurosPercentual": "11.506452", "jurosValor": "53.60", "atualizado": "519.44"},
      {"id": "p-2017-07", "valorBase": "451.91", "editado": false, "situacao": "atualizado", "fator": "1.037873", "corrigido": "469.03", "jurosPercentual": "10.516129", "jurosValor": "49.32", "atualizado": "518.35"},
      {"id": "p-2017-08", "valorBase": "451.91", "editado": false, "situacao": "atualizado", "fator": "1.042629", "corrigido": "471.17", "jurosPercentual": "9.516129", "jurosValor": "44.84", "atualizado": "516.01"},
      {"id": "p-2017-09", "valorBase": "451.91", "editado": false, "situacao": "atualizado", "fator": "1.040296", "corrigido": "470.12", "jurosPercentual": "8.506452", "jurosValor": "39.99", "atualizado": "510.11"},
      {"id": "p-2017-10", "valorBase": "451.91", "editado": false, "situacao": "atualizado", "fator": "1.036381", "corrigido": "468.35", "jurosPercentual": "7.516129", "jurosValor": "35.20", "atualizado": "503.55"},
      {"id": "p-2017-11", "valorBase": "451.91", "editado": false, "situacao": "atualizado", "fator": "1.033192", "corrigido": "466.91", "jurosPercentual": "6.506452", "jurosValor": "30.38", "atualizado": "497.29"},
      {"id": "p-2017-12", "valorBase": "451.91", "editado": false, "situacao": "atualizado", "fator": "1.026687", "corrigido": "463.97", "jurosPercentual": "5.516129", "jurosValor": "25.59", "atualizado": "489.56"},
      {"id": "p-2018-01", "valorBase": "460.11", "editado": false, "situacao": "atualizado", "memoriaBase": "R$ 451,91 fixados em 10/01/2017 × salário mínimo de jan/2018 (R$ 954,00) ÷ salário mínimo de jan/2017 (R$ 937,00) = R$ 460,11", "fator": "1.018053", "corrigido": "468.42", "jurosPercentual": "4.516129", "jurosValor": "21.15", "atualizado": "489.57"},
      {"id": "p-2018-02", "valorBase": "460.11", "editado": false, "situacao": "atualizado", "fator": "1.012592", "corrigido": "465.90", "jurosPercentual": "3.485023", "jurosValor": "16.24", "atualizado": "482.14"},
      {"id": "a-2017-01", "fator": "1.013020", "corrigido": "445.73", "jurosPercentual": "16.516129", "jurosValor": "73.62", "atualizado": "519.35", "editado": false, "situacao": "atualizado"},
      {"id": "a-2017-02", "fator": "1.008364", "corrigido": "443.68", "jurosPercentual": "15.485023", "jurosValor": "68.70", "atualizado": "512.38", "editado": false, "situacao": "atualizado"},
      {"id": "a-2017-03", "fator": "1.007813", "corrigido": "443.44", "jurosPercentual": "14.516129", "jurosValor": "64.37", "atualizado": "507.81", "editado": false, "situacao": "atualizado"},
      {"id": "a-2017-04", "fator": "1.011467", "corrigido": "445.05", "jurosPercentual": "13.506452", "jurosValor": "60.11", "atualizado": "505.16", "editado": false, "situacao": "atualizado"},
      {"id": "a-2017-05", "fator": "1.022029", "corrigido": "449.69", "jurosPercentual": "12.516129", "jurosValor": "56.28", "atualizado": "505.97", "editado": false, "situacao": "atualizado"},
      {"id": "a-2017-06", "fator": "1.030826", "corrigido": "453.56", "jurosPercentual": "11.506452", "jurosValor": "52.19", "atualizado": "505.75", "editado": false, "situacao": "atualizado"},
      {"id": "a-2017-07", "fator": "1.037873", "corrigido": "456.66", "jurosPercentual": "10.516129", "jurosValor": "48.02", "atualizado": "504.68", "editado": false, "situacao": "atualizado"},
      {"id": "a-2017-08", "fator": "1.042629", "corrigido": "458.76", "jurosPercentual": "9.516129", "jurosValor": "43.66", "atualizado": "502.42", "editado": false, "situacao": "atualizado"},
      {"id": "a-2017-09", "fator": "1.040296", "corrigido": "457.73", "jurosPercentual": "8.506452", "jurosValor": "38.94", "atualizado": "496.67", "editado": false, "situacao": "atualizado"},
      {"id": "a-2017-10", "fator": "1.036381", "corrigido": "456.01", "jurosPercentual": "7.516129", "jurosValor": "34.27", "atualizado": "490.28", "editado": false, "situacao": "atualizado"},
      {"id": "a-2017-11", "fator": "1.033192", "corrigido": "454.60", "jurosPercentual": "6.506452", "jurosValor": "29.58", "atualizado": "484.18", "editado": false, "situacao": "atualizado"},
      {"id": "a-2017-12", "fator": "1.026687", "corrigido": "451.74", "jurosPercentual": "5.516129", "jurosValor": "24.92", "atualizado": "476.66", "editado": false, "situacao": "atualizado"},
      {"id": "a-2018-01", "fator": "1.018053", "corrigido": "456.09", "jurosPercentual": "4.516129", "jurosValor": "20.60", "atualizado": "476.69", "editado": false, "situacao": "atualizado"},
      {"id": "a-2018-02", "fator": "1.012592", "corrigido": "453.64", "jurosPercentual": "3.485023", "jurosValor": "15.81", "atualizado": "469.45", "editado": false, "situacao": "atualizado"}
    ],
    "totais": {
      "prestacoes": "7145.73",
      "amortizacoes": "6957.45",
      "totalDevido": "188.28",
      "multa": "0.00",
      "honorarios": "0.00",
      "totalGeral": "188.28"
    }
  }
}
```

Execute: `npm test -- src/motor/casos.test.ts`
Esperado: todos passam (R$ 451,91 em 2017 e R$ 460,11 em 2018 apurados pela base reproduzem as 28 linhas e os totais do relatório).

- [ ] **Step 3: Caso de valor fixo reajustado pelo IPCA**

Crie `src/motor/casos/2026-10-11-valor-fixo-reajuste-ipca.json`:

```json
{
  "formato": "apura/caso-de-referencia@1",
  "nome": "Valor fixo de R$ 500,00 fixado em 15/03/2024, reajustado em março pelo IPCA acumulado de 12 meses, com prestação anterior à fixação, vincenda e pagamento posterior ao cálculo, cálculo de 11/10/2026",
  "fonte": "Base conferida na Calculadora do Cidadão do BCB (aba Índices de preços, IPCA), consultada em 11/10/2026: 03/2024→02/2025 = 1,05057630 (R$ 500,00 → R$ 525,29); 03/2025→02/2026 = 1,03812500 (R$ 525,29 → R$ 545,32; o produto das variações mensais da série 433 dá 1,03812497, mesma correção em centavos). Encargos pelas convenções já provadas nos casos do SAJ (regime antigo) e da Calculadora (taxa legal, ex.: 31/03/2025→11/10/2026 = 0,14471376, igual ao percentual de p-2025-03); centavos por aritmética decimal independente (Python, módulo decimal).",
  "observacoes": "Reajuste anual (§6.3, ponto 6 decidido na fase 3): primeiro reajuste 12 meses após a fixação (mar/2025), pelo acumulado de mar/2024 a fev/2025 com precisão integral, arredondado a 2 casas; o segundo (mar/2026) parte do valor arredondado R$ 525,29. A prestação de jan/2024 é anterior à fixação e entra com o valor fixado, com aviso. A de nov/2026 é vincenda: valor nominal (já com os dois reajustes), sem correção e sem juros, somada aos totais. O pagamento de 20/10/2026 é posterior à data de elaboração: aparece pelo valor nominal, fora dos totais. Os IPCA do acumulado (mar/2024 a fev/2026) entram em indicesUsados mesmo fora do período de correção. Out/2026 sem IPCA na data do cálculo: fator 1 e aviso.",
  "calculo": {
    "formato": "apura/calculo@1",
    "tipo": "alimentos",
    "id": "caso-valor-fixo-reajuste-ipca",
    "criadoEm": "2026-10-11T13:00:00.000Z",
    "atualizadoEm": "2026-10-11T13:00:00.000Z",
    "dataElaboracao": "2026-10-11",
    "cabecalho": {
      "defensor": "",
      "orgao": "",
      "processo": "",
      "exequente": "",
      "executado": ""
    },
    "base": {
      "tipo": "valorFixo",
      "valor": "500.00",
      "dataFixacao": "2024-03-15",
      "indiceReajuste": "IPCA",
      "mesReajuste": 3
    },
    "lotes": {

    },
    "lancamentos": [
      {"id": "p-2024-01", "tipo": "prestacao", "data": "2024-01-15", "competencia": "2024-01", "descricao": "Anterior à fixação", "origem": "avulso", "editado": false},
      {"id": "p-2024-03", "tipo": "prestacao", "data": "2024-03-15", "competencia": "2024-03", "origem": "lote", "editado": false},
      {"id": "p-2025-02", "tipo": "prestacao", "data": "2025-02-15", "competencia": "2025-02", "origem": "lote", "editado": false},
      {"id": "p-2025-03", "tipo": "prestacao", "data": "2025-03-15", "competencia": "2025-03", "descricao": "Primeiro reajuste", "origem": "lote", "editado": false},
      {"id": "p-2026-02", "tipo": "prestacao", "data": "2026-02-15", "competencia": "2026-02", "origem": "lote", "editado": false},
      {"id": "p-2026-03", "tipo": "prestacao", "data": "2026-03-15", "competencia": "2026-03", "descricao": "Segundo reajuste", "origem": "lote", "editado": false},
      {"id": "p-2026-09", "tipo": "prestacao", "data": "2026-09-15", "competencia": "2026-09", "origem": "lote", "editado": false},
      {"id": "p-2026-11", "tipo": "prestacao", "data": "2026-11-15", "competencia": "2026-11", "descricao": "Vincenda", "origem": "avulso", "editado": false},
      {"id": "a-2026-09-01", "tipo": "amortizacao", "data": "2026-09-01", "descricao": "Pagamento parcial", "valorInformado": "200.00", "origem": "avulso", "editado": false},
      {"id": "a-2026-10-20", "tipo": "amortizacao", "data": "2026-10-20", "descricao": "Pagamento posterior ao cálculo", "valorInformado": "100.00", "origem": "avulso", "editado": false}
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
      "arredondamento": {
        "fatorCasas": 6,
        "percentualCasas": 6,
        "valorCasas": 2,
        "modo": "comercial"
      }
    },
    "acrescimos": {
      "multaPercentual": "0",
      "honorariosPercentual": "0"
    },
    "observacoes": ""
  },
  "indices": {
    "consultadoEm": "2026-10-11T13:00:00.000Z",
    "series": {
      "189": {
        "2024-01": {"valor": "0.07", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2024-02": {"valor": "-0.52", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2024-03": {"valor": "-0.47", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2024-04": {"valor": "0.31", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2024-05": {"valor": "0.89", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2024-06": {"valor": "0.81", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2024-07": {"valor": "0.61", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2024-08": {"valor": "0.29", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"}
      },
      "433": {
        "2024-03": {"valor": "0.16", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2024-04": {"valor": "0.38", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2024-05": {"valor": "0.46", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2024-06": {"valor": "0.21", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2024-07": {"valor": "0.38", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2024-08": {"valor": "-0.02", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2024-09": {"valor": "0.44", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2024-10": {"valor": "0.56", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2024-11": {"valor": "0.39", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2024-12": {"valor": "0.52", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-01": {"valor": "0.16", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-02": {"valor": "1.31", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-03": {"valor": "0.56", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-04": {"valor": "0.43", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-05": {"valor": "0.26", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-06": {"valor": "0.24", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-07": {"valor": "0.26", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-08": {"valor": "-0.11", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-09": {"valor": "0.48", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-10": {"valor": "0.09", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-11": {"valor": "0.18", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-12": {"valor": "0.33", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2026-01": {"valor": "0.33", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2026-02": {"valor": "0.70", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2026-03": {"valor": "0.88", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2026-04": {"valor": "0.67", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2026-05": {"valor": "0.58", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2026-06": {"valor": "0.16", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2026-07": {"valor": "0.07", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2026-08": {"valor": "-0.32", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2026-09": {"valor": "0.82", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"}
      },
      "29543": {
        "2024-08": {"valor": "0.605306", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2024-09": {"valor": "0.676227", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2024-10": {"valor": "0.704241", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2024-11": {"valor": "0.385874", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2024-12": {"valor": "0.171924", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-01": {"valor": "0.589427", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-02": {"valor": "0.902209", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-03": {"valor": "0.000000", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-04": {"valor": "0.321969", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-05": {"valor": "0.623200", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-06": {"valor": "0.775982", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-07": {"valor": "0.834880", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-08": {"valor": "0.942622", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-09": {"valor": "1.305984", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-10": {"valor": "0.736394", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-11": {"valor": "1.093764", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2025-12": {"valor": "0.851001", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2026-01": {"valor": "0.967510", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2026-02": {"valor": "0.962232", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2026-03": {"valor": "0.155714", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2026-04": {"valor": "0.768672", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2026-05": {"valor": "0.198293", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2026-06": {"valor": "0.450641", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2026-07": {"valor": "0.706607", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2026-08": {"valor": "1.154527", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2026-09": {"valor": "1.499119", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"},
        "2026-10": {"valor": "0.379020", "fonte": "embutida", "obtidoEm": "2026-10-11T13:00:00.000Z"}
      }
    }
  },
  "esperado": {
    "lancamentos": [
      {"id": "p-2024-01", "valorBase": "500.00", "editado": false, "memoriaBase": "Valor fixado em 15/03/2024: R$ 500,00 (prestação anterior à fixação, sem reajuste)", "situacao": "atualizado", "fator": "1.126373", "corrigido": "563.19", "jurosPercentual": "25.424200", "jurosValor": "143.19", "atualizado": "706.38", "avisos": ["Prestação de jan/2024 anterior à data de fixação (15/03/2024): usado o valor fixado, sem reajuste.", "IPCA de out/2026 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000)."]},
      {"id": "p-2024-03", "valorBase": "500.00", "editado": false, "memoriaBase": "Valor fixado em 15/03/2024: R$ 500,00 (primeiro reajuste pelo IPCA em mar/2025)", "situacao": "atualizado", "fator": "1.134435", "corrigido": "567.22", "jurosPercentual": "23.424200", "jurosValor": "132.87", "atualizado": "700.09"},
      {"id": "p-2025-02", "valorBase": "500.00", "editado": false, "situacao": "atualizado", "fator": "1.074592", "corrigido": "537.30", "jurosPercentual": "14.922480", "jurosValor": "80.18", "atualizado": "617.48"},
      {"id": "p-2025-03", "valorBase": "525.29", "editado": false, "memoriaBase": "R$ 500,00 fixados em 15/03/2024, reajustados em mar/2025 (IPCA de mar/2024 a fev/2025: 5,0576%) = R$ 525,29", "situacao": "atualizado", "fator": "1.065236", "corrigido": "559.56", "jurosPercentual": "14.471376", "jurosValor": "80.98", "atualizado": "640.54", "avisos": ["IPCA de out/2026 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000)."]},
      {"id": "p-2026-02", "valorBase": "525.29", "editado": false, "situacao": "atualizado", "fator": "1.032229", "corrigido": "542.22", "jurosPercentual": "5.536954", "jurosValor": "30.02", "atualizado": "572.24"},
      {"id": "p-2026-03", "valorBase": "545.32", "editado": false, "memoriaBase": "R$ 500,00 fixados em 15/03/2024, reajustados em mar/2025 (IPCA de mar/2024 a fev/2025: 5,0576%) e em mar/2026 (IPCA de mar/2025 a fev/2026: 3,8125%) = R$ 545,32", "situacao": "atualizado", "fator": "1.024539", "corrigido": "558.70", "jurosPercentual": "4.985515", "jurosValor": "27.85", "atualizado": "586.55"},
      {"id": "p-2026-09", "valorBase": "545.32", "editado": false, "situacao": "atualizado", "fator": "1.004092", "corrigido": "547.55", "jurosPercentual": "0.921795", "jurosValor": "5.05", "atualizado": "552.60"},
      {"id": "p-2026-11", "valorBase": "545.32", "editado": false, "situacao": "vincenda", "fator": "1.000000", "corrigido": "545.32", "jurosPercentual": "0.000000", "jurosValor": "0.00", "atualizado": "545.32", "avisos": ["Prestação com vencimento em 15/11/2026, posterior à data de elaboração (11/10/2026): vincenda, incluída pelo valor nominal, sem correção e sem juros."]},
      {"id": "a-2026-09-01", "valorBase": "200.00", "editado": false, "situacao": "atualizado", "fator": "1.007926", "corrigido": "201.59", "jurosPercentual": "1.621384", "jurosValor": "3.27", "atualizado": "204.86"},
      {"id": "a-2026-10-20", "valorBase": "100.00", "editado": false, "situacao": "ignorado", "fator": "1.000000", "corrigido": "100.00", "jurosPercentual": "0.000000", "jurosValor": "0.00", "atualizado": "100.00", "avisos": ["Pagamento de 20/10/2026, posterior à data de elaboração (11/10/2026): não computado nos totais."]}
    ],
    "totais": {
      "prestacoes": "4921.20",
      "amortizacoes": "204.86",
      "totalDevido": "4716.34",
      "multa": "0.00",
      "honorarios": "0.00",
      "totalGeral": "4716.34"
    },
    "avisos": ["Meses sem índice na tabela (entraram sem correção): IPCA de out/2026.", "Prestações vincendas, incluídas pelo valor nominal, sem correção e sem juros: nov/2026.", "Lançamentos não computados nos totais: pagamento de 20/10/2026."]
  }
}
```

Execute: `npm test -- src/motor/casos.test.ts`
Esperado: todos passam, inclusive os avisos por lançamento e os do resultado.

- [ ] **Step 4: Testes de ponta a ponta**

Crie `src/motor/casos-pela-base.test.ts` (a Task 8 o reescreve com dois testes a mais):

```ts
import { describe, expect, it } from "vitest";
import type { CasoDeReferencia, Competencia, ValorIndice } from "../compartilhado/tipos.ts";
import { calcular } from "./calcular.ts";
import casoSaj2026 from "./casos/2026-10-11-saj-tjms-alimentos-igpm-2024-2026.json" with { type: "json" };
import casoLote from "./casos/2026-10-11-saj-tjms-percentual-rendimentos-lote.json" with { type: "json" };
import { gerarLotePrestacoes } from "./lote.ts";

/**
 * Os casos do SAJ transcritos com valores informados à mão também fecham quando o motor apura a
 * base sozinho: prova de que a apuração reproduz o que a contadoria calculou.
 */
describe("casos de referência recalculados pela base dos alimentos", () => {
  it("SAJ 2026: 30% do salário mínimo do período (1.412,00, 1.518,00 e 1.621,00) reproduz as 32 prestações e os totais", () => {
    const caso = casoSaj2026 as unknown as CasoDeReferencia;
    const salarios: Record<Competencia, ValorIndice> = {};
    for (const [competencia, valor] of [
      ["2024", "1412.00"],
      ["2025", "1518.00"],
      ["2026", "1621.00"],
    ] as const) {
      for (let mes = 1; mes <= 12; mes++) {
        salarios[`${competencia}-${String(mes).padStart(2, "0")}`] = {
          valor,
          fonte: "embutida",
          obtidoEm: caso.indices.consultadoEm,
        };
      }
    }
    const calculo = {
      ...caso.calculo,
      lancamentos: caso.calculo.lancamentos.map((l) =>
        l.tipo === "prestacao"
          ? { ...l, valorInformado: undefined, origem: "lote" as const, editado: false }
          : l,
      ),
    };
    const r = calcular(calculo, {
      ...caso.indices,
      series: { ...caso.indices.series, "1619": salarios },
    });
    const prestacoes = r.lancamentos.filter((l) => l.tipo === "prestacao");
    expect(prestacoes).toHaveLength(32);
    expect(new Set(prestacoes.map((l) => l.valorBase))).toEqual(
      new Set(["423.60", "455.40", "486.30"]),
    );
    expect(prestacoes[0]?.memoriaBase).toBe(
      "30% do salário mínimo de mar/2024 (R$ 1.412,00) = R$ 423,60",
    );
    expect(prestacoes.every((l) => !l.editado && l.situacao === "atualizado")).toBe(true);
    expect(r.lancamentos.map((l) => [l.id, l.atualizado])).toEqual(
      caso.esperado.lancamentos.map((e) => [e.id, e.atualizado]),
    );
    expect(r.totais).toEqual(caso.esperado.totais);
    expect(r.indicesUsados.filter((i) => i.serie === "1619")).toHaveLength(32);
  });

  it("lote → base → cálculo: o lote do caso de 30% × R$ 1.500,00 gera exatamente as 22 prestações do caso", () => {
    const caso = casoLote as unknown as CasoDeReferencia;
    const lote = caso.calculo.lotes.ultimoLotePrestacoes;
    expect(lote).toBeDefined();
    if (!lote) return;
    const gerado = gerarLotePrestacoes(lote, caso.calculo.dataElaboracao, []);
    expect(gerado.avisos).toEqual([]);
    expect(gerado.lancamentos).toEqual(caso.calculo.lancamentos);
    const r = calcular({ ...caso.calculo, lancamentos: gerado.lancamentos }, caso.indices);
    expect(r.totais).toEqual(caso.esperado.totais);
  });
});
```

Execute: `npm test -- src/motor/casos-pela-base.test.ts`
Esperado: 2 testes passam: o caso do SAJ de 2026 (base "salário mínimo do período") fecha com as prestações apuradas pela base em 30% × 1.412,00 / 1.518,00 / 1.621,00, e o lote do caso de 30% × R$ 1.500,00 gera exatamente as 22 prestações do caso.

- [ ] **Step 5: Observações do caso de 2018**

Em `src/motor/casos/2018-05-25-saj-tjms-alimentos.json`, no campo `observacoes`, troque o trecho final

`Valores nominais usados como informados; a hipótese de base em 48,23% do salário mínimo fica para teste separado na fase 3. As prestações estão marcadas como editadas à mão porque o caso usa os valores nominais do relatório; a apuração pela base dos alimentos é testada à parte na fase 3.`

por

`Valores nominais usados como informados (prestações com valor informado à mão, editado = true). A base foi confirmada na fase 3: R$ 451,91 fixados em 10/01/2017 e reajustados pela proporção do salário mínimo (954 ÷ 937) reproduzem R$ 460,11 em 2018; a hipótese de 48,23% do salário mínimo não confere (937 × 48,23% = 451,9151 → 451,92). O caso 2018-05-25-saj-tjms-base-valor-fixo-reajuste-sm.json recalcula estas mesmas linhas pela base.`

- [ ] **Step 6: Verificar e commitar**

Execute: `npm run format && npm run verificar`
Esperado: 15 arquivos de teste e 353 testes verdes.

```bash
git add src/motor/casos src/motor/casos-pela-base.test.ts && git commit -m "motor: casos de referência das três bases (SAJ 30% de R$ 1.500,00 em lote, 2018 pela base em SM, reajuste pelo IPCA) e testes de ponta a ponta" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

### Task 8: Caso de referência do SAJ com INPC, lotes de prestações e pagamentos, e os 22 corrigidos do relatório SELIC

**Files:**
- Create: `src/motor/casos/2026-10-11-saj-tjms-inpc-salario-minimo-lotes.json`
- Modify: `src/motor/casos-pela-base.test.ts` (reescrito, com dois testes a mais)

**Interfaces:**
- Consome: `gerarLotePrestacoes`, `gerarLoteAmortizacoes` (Task 3), `calcular` (Task 6), `metodologiaSelicUnica` e `tabelaRegimeNovo` (fase 2 e Task 1), o formato do caso (Task 6).
- Produz: o único gabarito do SAJ para a correção pelo INPC (ponto 10) e para o lote de pagamentos; um teste dos 22 corrigidos da SELIC única com base em % do salário mínimo. Fontes: dois relatórios do SAJ Tribunais de 11/10/2026 (INPC e SELIC), fora do repositório, sem nome nem número de processo.

- [ ] **Step 1: Caso INPC**

Crie `src/motor/casos/2026-10-11-saj-tjms-inpc-salario-minimo-lotes.json` (22 prestações geradas pelo lote do dia 1, sem valor informado, e 4 pagamentos gerados pelo lote de R$ 300,00 no dia 10; a tabela de INPC do SAJ coincide com a série 188 do BCB e ia até ago/2026; os valores esperados são os impressos no relatório; a soma das linhas, 11.773,69, difere em um centavo do total impresso pelo SAJ, 11.773,68, que soma sem arredondar):

```json
{
  "formato": "apura/caso-de-referencia@1",
  "nome": "SAJ TJMS, Cálculo Judicial Avulso (alimentos), 30% do salário mínimo do período em lote no dia 1, INPC e 1% ao mês, quatro pagamentos mensais, cálculo de 11/10/2026",
  "fonte": "Relatório de Cálculo Judicial – Sintético/Analítico do SAJ Tribunais (TJMS), tipo Alimentos, emitido em 11/10/2026 pelo responsável a partir de dados fictícios (base 'salário mínimo do período', quantidade 0,30, de 01/01/2025 a 01/10/2026; pagamentos de R$ 300,00 em 10/01, 10/02, 10/03 e 10/04/2026; indexador INPC; juros simples de 1% ao mês); sem número de processo; PDF fora do repositório.",
  "observacoes": "Parâmetros declarados: INPC (IBGE) da data do lançamento até 31/08/2026 (pro rata); juro legal simples de 1,00% ao mês sobre o valor corrigido, da data do lançamento até 11/10/2026. A tabela de INPC do SAJ ia até ago/2026 em 11/10/2026 (a série 188 do BCB já tinha set/2026 = 0,82); a tabela congelada reproduz a do SAJ, e set e out/2026 entram sem correção, com aviso. Todas as prestações do SAJ caem no dia 1 porque a data inicial é dia 1: é o lote do Apura com dia de vencimento 1, de jan/2025 a out/2026, sem valor informado (30% do salário mínimo do mês: R$ 1.518,00 em 2025, R$ 1.621,00 em 2026). Os quatro pagamentos são o lote de pagamentos de R$ 300,00 no dia 10, de jan a abr/2026. Sem piso na deflação (jun a ago/2026 saem corrigidas abaixo do original). A tabela de INPC do SAJ coincide com a série 188 do BCB em todos os meses usados. Os juros incidem sobre o corrigido sem arredondar. Totais = soma das linhas impressas: 11.773,69 nas prestações (o SAJ soma sem arredondar e imprime 11.773,68) e 1.318,17 nos pagamentos (igual ao SAJ); total devido 10.455,52 (SAJ: 10.455,51).",
  "calculo": {
    "formato": "apura/calculo@1",
    "tipo": "alimentos",
    "id": "caso-saj-2026-inpc-salario-minimo-lotes",
    "criadoEm": "2026-10-11T17:17:00.000Z",
    "atualizadoEm": "2026-10-11T17:17:00.000Z",
    "dataElaboracao": "2026-10-11",
    "cabecalho": {
      "defensor": "",
      "orgao": "",
      "processo": "",
      "exequente": "",
      "executado": ""
    },
    "base": {
      "tipo": "percentualSalarioMinimo",
      "percentual": "30"
    },
    "lotes": {
      "ultimoLotePrestacoes": {
        "diaVencimento": 1,
        "de": "2025-01",
        "ate": "2026-10"
      },
      "ultimoLoteAmortizacoes": {
        "valorMensal": "300.00",
        "diaPagamento": 10,
        "de": "2026-01",
        "ate": "2026-04"
      }
    },
    "lancamentos": [
      {"id": "p-2025-01", "tipo": "prestacao", "data": "2025-01-01", "competencia": "2025-01", "origem": "lote", "editado": false},
      {"id": "p-2025-02", "tipo": "prestacao", "data": "2025-02-01", "competencia": "2025-02", "origem": "lote", "editado": false},
      {"id": "p-2025-03", "tipo": "prestacao", "data": "2025-03-01", "competencia": "2025-03", "origem": "lote", "editado": false},
      {"id": "p-2025-04", "tipo": "prestacao", "data": "2025-04-01", "competencia": "2025-04", "origem": "lote", "editado": false},
      {"id": "p-2025-05", "tipo": "prestacao", "data": "2025-05-01", "competencia": "2025-05", "origem": "lote", "editado": false},
      {"id": "p-2025-06", "tipo": "prestacao", "data": "2025-06-01", "competencia": "2025-06", "origem": "lote", "editado": false},
      {"id": "p-2025-07", "tipo": "prestacao", "data": "2025-07-01", "competencia": "2025-07", "origem": "lote", "editado": false},
      {"id": "p-2025-08", "tipo": "prestacao", "data": "2025-08-01", "competencia": "2025-08", "origem": "lote", "editado": false},
      {"id": "p-2025-09", "tipo": "prestacao", "data": "2025-09-01", "competencia": "2025-09", "origem": "lote", "editado": false},
      {"id": "p-2025-10", "tipo": "prestacao", "data": "2025-10-01", "competencia": "2025-10", "origem": "lote", "editado": false},
      {"id": "p-2025-11", "tipo": "prestacao", "data": "2025-11-01", "competencia": "2025-11", "origem": "lote", "editado": false},
      {"id": "p-2025-12", "tipo": "prestacao", "data": "2025-12-01", "competencia": "2025-12", "origem": "lote", "editado": false},
      {"id": "p-2026-01", "tipo": "prestacao", "data": "2026-01-01", "competencia": "2026-01", "origem": "lote", "editado": false},
      {"id": "p-2026-02", "tipo": "prestacao", "data": "2026-02-01", "competencia": "2026-02", "origem": "lote", "editado": false},
      {"id": "p-2026-03", "tipo": "prestacao", "data": "2026-03-01", "competencia": "2026-03", "origem": "lote", "editado": false},
      {"id": "p-2026-04", "tipo": "prestacao", "data": "2026-04-01", "competencia": "2026-04", "origem": "lote", "editado": false},
      {"id": "p-2026-05", "tipo": "prestacao", "data": "2026-05-01", "competencia": "2026-05", "origem": "lote", "editado": false},
      {"id": "p-2026-06", "tipo": "prestacao", "data": "2026-06-01", "competencia": "2026-06", "origem": "lote", "editado": false},
      {"id": "p-2026-07", "tipo": "prestacao", "data": "2026-07-01", "competencia": "2026-07", "origem": "lote", "editado": false},
      {"id": "p-2026-08", "tipo": "prestacao", "data": "2026-08-01", "competencia": "2026-08", "origem": "lote", "editado": false},
      {"id": "p-2026-09", "tipo": "prestacao", "data": "2026-09-01", "competencia": "2026-09", "origem": "lote", "editado": false},
      {"id": "p-2026-10", "tipo": "prestacao", "data": "2026-10-01", "competencia": "2026-10", "origem": "lote", "editado": false},
      {"id": "a-2026-01", "tipo": "amortizacao", "data": "2026-01-10", "descricao": "Pagamento parcial", "valorInformado": "300.00", "origem": "lote", "editado": false},
      {"id": "a-2026-02", "tipo": "amortizacao", "data": "2026-02-10", "descricao": "Pagamento parcial", "valorInformado": "300.00", "origem": "lote", "editado": false},
      {"id": "a-2026-03", "tipo": "amortizacao", "data": "2026-03-10", "descricao": "Pagamento parcial", "valorInformado": "300.00", "origem": "lote", "editado": false},
      {"id": "a-2026-04", "tipo": "amortizacao", "data": "2026-04-10", "descricao": "Pagamento parcial", "valorInformado": "300.00", "origem": "lote", "editado": false}
    ],
    "metodologia": {
      "id": "tjms-saj",
      "versao": 1,
      "nome": "TJMS/SAJ",
      "ajustada": true,
      "periodos": [
        {"de": null, "ate": null, "correcao": {"indice": "INPC"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "1"}}
      ],
      "incidenciaMesInicial": "proRata",
      "deflacao": "aplicarSemPiso",
      "arredondamento": {
        "fatorCasas": 6,
        "percentualCasas": 6,
        "valorCasas": 2,
        "modo": "comercial"
      }
    },
    "acrescimos": {
      "multaPercentual": "0",
      "honorariosPercentual": "0"
    },
    "observacoes": ""
  },
  "indices": {
    "consultadoEm": "2026-10-11T00:00:00.000Z",
    "series": {
      "188": {
        "2025-01": {"valor": "0.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-02": {"valor": "1.48", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-03": {"valor": "0.51", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-04": {"valor": "0.48", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-05": {"valor": "0.35", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-06": {"valor": "0.23", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-07": {"valor": "0.21", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-08": {"valor": "-0.21", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-09": {"valor": "0.52", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-10": {"valor": "0.03", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-11": {"valor": "0.03", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-12": {"valor": "0.21", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-01": {"valor": "0.39", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-02": {"valor": "0.56", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-03": {"valor": "0.91", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-04": {"valor": "0.81", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-05": {"valor": "0.65", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-06": {"valor": "0.14", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-07": {"valor": "-0.01", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-08": {"valor": "-0.32", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"}
      },
      "1619": {
        "2025-01": {"valor": "1518.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-02": {"valor": "1518.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-03": {"valor": "1518.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-04": {"valor": "1518.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-05": {"valor": "1518.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-06": {"valor": "1518.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-07": {"valor": "1518.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-08": {"valor": "1518.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-09": {"valor": "1518.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-10": {"valor": "1518.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-11": {"valor": "1518.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2025-12": {"valor": "1518.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-01": {"valor": "1621.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-02": {"valor": "1621.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-03": {"valor": "1621.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-04": {"valor": "1621.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-05": {"valor": "1621.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-06": {"valor": "1621.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-07": {"valor": "1621.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-08": {"valor": "1621.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-09": {"valor": "1621.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
        "2026-10": {"valor": "1621.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"}
      }
    }
  },
  "esperado": {
    "lancamentos": [
      {"id": "p-2025-01", "valorBase": "455.40", "editado": false, "situacao": "atualizado", "memoriaBase": "30% do salário mínimo de jan/2025 (R$ 1.518,00) = R$ 455,40", "fator": "1.071880", "corrigido": "488.13", "jurosPercentual": "21.354839", "jurosValor": "104.24", "atualizado": "592.37"},
      {"id": "p-2025-02", "valorBase": "455.40", "editado": false, "situacao": "atualizado", "fator": "1.071318", "corrigido": "487.88", "jurosPercentual": "20.354839", "jurosValor": "99.31", "atualizado": "587.19"},
      {"id": "p-2025-03", "valorBase": "455.40", "editado": false, "situacao": "atualizado", "fator": "1.056074", "corrigido": "480.94", "jurosPercentual": "19.354839", "jurosValor": "93.08", "atualizado": "574.02"},
      {"id": "p-2025-04", "valorBase": "455.40", "editado": false, "situacao": "atualizado", "fator": "1.050720", "corrigido": "478.50", "jurosPercentual": "18.354839", "jurosValor": "87.83", "atualizado": "566.33"},
      {"id": "p-2025-05", "valorBase": "455.40", "editado": false, "situacao": "atualizado", "fator": "1.045750", "corrigido": "476.23", "jurosPercentual": "17.354839", "jurosValor": "82.65", "atualizado": "558.88"},
      {"id": "p-2025-06", "valorBase": "455.40", "editado": false, "situacao": "atualizado", "fator": "1.042140", "corrigido": "474.59", "jurosPercentual": "16.354839", "jurosValor": "77.62", "atualizado": "552.21"},
      {"id": "p-2025-07", "valorBase": "455.40", "editado": false, "situacao": "atualizado", "fator": "1.039758", "corrigido": "473.51", "jurosPercentual": "15.354839", "jurosValor": "72.71", "atualizado": "546.22"},
      {"id": "p-2025-08", "valorBase": "455.40", "editado": false, "situacao": "atualizado", "fator": "1.037720", "corrigido": "472.58", "jurosPercentual": "14.354839", "jurosValor": "67.84", "atualizado": "540.42"},
      {"id": "p-2025-09", "valorBase": "455.40", "editado": false, "situacao": "atualizado", "fator": "1.039653", "corrigido": "473.46", "jurosPercentual": "13.354839", "jurosValor": "63.23", "atualizado": "536.69"},
      {"id": "p-2025-10", "valorBase": "455.40", "editado": false, "situacao": "atualizado", "fator": "1.034444", "corrigido": "471.09", "jurosPercentual": "12.354839", "jurosValor": "58.20", "atualizado": "529.29"},
      {"id": "p-2025-11", "valorBase": "455.40", "editado": false, "situacao": "atualizado", "fator": "1.034133", "corrigido": "470.94", "jurosPercentual": "11.354839", "jurosValor": "53.47", "atualizado": "524.41"},
      {"id": "p-2025-12", "valorBase": "455.40", "editado": false, "situacao": "atualizado", "fator": "1.033763", "corrigido": "470.78", "jurosPercentual": "10.354839", "jurosValor": "48.75", "atualizado": "519.53"},
      {"id": "p-2026-01", "valorBase": "486.30", "editado": false, "situacao": "atualizado", "memoriaBase": "30% do salário mínimo de jan/2026 (R$ 1.621,00) = R$ 486,30", "fator": "1.031537", "corrigido": "501.64", "jurosPercentual": "9.354839", "jurosValor": "46.93", "atualizado": "548.57"},
      {"id": "p-2026-02", "valorBase": "486.30", "editado": false, "situacao": "atualizado", "fator": "1.027454", "corrigido": "499.65", "jurosPercentual": "8.354839", "jurosValor": "41.75", "atualizado": "541.40"},
      {"id": "p-2026-03", "valorBase": "486.30", "editado": false, "situacao": "atualizado", "fator": "1.021638", "corrigido": "496.82", "jurosPercentual": "7.354839", "jurosValor": "36.54", "atualizado": "533.36"},
      {"id": "p-2026-04", "valorBase": "486.30", "editado": false, "situacao": "atualizado", "fator": "1.012448", "corrigido": "492.35", "jurosPercentual": "6.354839", "jurosValor": "31.29", "atualizado": "523.64"},
      {"id": "p-2026-05", "valorBase": "486.30", "editado": false, "situacao": "atualizado", "fator": "1.004373", "corrigido": "488.43", "jurosPercentual": "5.354839", "jurosValor": "26.15", "atualizado": "514.58"},
      {"id": "p-2026-06", "valorBase": "486.30", "editado": false, "situacao": "atualizado", "fator": "0.998049", "corrigido": "485.35", "jurosPercentual": "4.354839", "jurosValor": "21.14", "atualizado": "506.49"},
      {"id": "p-2026-07", "valorBase": "486.30", "editado": false, "situacao": "atualizado", "fator": "0.996704", "corrigido": "484.70", "jurosPercentual": "3.354839", "jurosValor": "16.26", "atualizado": "500.96"},
      {"id": "p-2026-08", "valorBase": "486.30", "editado": false, "situacao": "atualizado", "fator": "0.996903", "corrigido": "484.79", "jurosPercentual": "2.354839", "jurosValor": "11.42", "atualizado": "496.21"},
      {"id": "p-2026-09", "valorBase": "486.30", "editado": false, "situacao": "atualizado", "fator": "1.000000", "corrigido": "486.30", "jurosPercentual": "1.354839", "jurosValor": "6.59", "atualizado": "492.89"},
      {"id": "p-2026-10", "valorBase": "486.30", "editado": false, "situacao": "atualizado", "fator": "1.000000", "corrigido": "486.30", "jurosPercentual": "0.354839", "jurosValor": "1.73", "atualizado": "488.03"},
      {"id": "a-2026-01", "valorBase": "300.00", "editado": false, "situacao": "atualizado", "corrigido": "309.11", "jurosPercentual": "9.064516", "jurosValor": "28.02", "atualizado": "337.13"},
      {"id": "a-2026-02", "valorBase": "300.00", "editado": false, "situacao": "atualizado", "corrigido": "307.68", "jurosPercentual": "8.033410", "jurosValor": "24.72", "atualizado": "332.40"},
      {"id": "a-2026-03", "valorBase": "300.00", "editado": false, "situacao": "atualizado", "corrigido": "305.69", "jurosPercentual": "7.064516", "jurosValor": "21.60", "atualizado": "327.29"},
      {"id": "a-2026-04", "valorBase": "300.00", "editado": false, "situacao": "atualizado", "corrigido": "303.00", "jurosPercentual": "6.054839", "jurosValor": "18.35", "atualizado": "321.35"}
    ],
    "totais": {
      "prestacoes": "11773.69",
      "amortizacoes": "1318.17",
      "totalDevido": "10455.52",
      "multa": "0.00",
      "honorarios": "0.00",
      "totalGeral": "10455.52"
    },
    "avisos": ["Meses sem índice na tabela (entraram sem correção): INPC de set/2026, out/2026."]
  }
}
```

Execute: `npm test -- src/motor/casos.test.ts`
Esperado: todos passam (26 linhas, totais e avisos do caso novo). Se alguma linha não bater, pare e relate: a implementação (ou a transcrição) está errada, não o relatório.

- [ ] **Step 2: Testes de ponta a ponta com os dois lotes e com a SELIC única**

Substitua `src/motor/casos-pela-base.test.ts` por:

```ts
import { describe, expect, it } from "vitest";
import type { CasoDeReferencia, Competencia, ValorIndice } from "../compartilhado/tipos.ts";
import { calcular } from "./calcular.ts";
import casoSaj2026 from "./casos/2026-10-11-saj-tjms-alimentos-igpm-2024-2026.json" with { type: "json" };
import casoInpc from "./casos/2026-10-11-saj-tjms-inpc-salario-minimo-lotes.json" with { type: "json" };
import casoLote from "./casos/2026-10-11-saj-tjms-percentual-rendimentos-lote.json" with { type: "json" };
import { gerarLoteAmortizacoes, gerarLotePrestacoes } from "./lote.ts";
import { metodologiaSelicUnica, tabelaRegimeNovo } from "./testes/regime-novo.ts";

/**
 * Os casos do SAJ transcritos com valores informados à mão também fecham quando o motor apura a
 * base sozinho: prova de que a apuração reproduz o que a contadoria calculou.
 */
describe("casos de referência recalculados pela base dos alimentos", () => {
  it("SAJ 2026: 30% do salário mínimo do período (1.412,00, 1.518,00 e 1.621,00) reproduz as 32 prestações e os totais", () => {
    const caso = casoSaj2026 as unknown as CasoDeReferencia;
    const salarios: Record<Competencia, ValorIndice> = {};
    for (const [competencia, valor] of [
      ["2024", "1412.00"],
      ["2025", "1518.00"],
      ["2026", "1621.00"],
    ] as const) {
      for (let mes = 1; mes <= 12; mes++) {
        salarios[`${competencia}-${String(mes).padStart(2, "0")}`] = {
          valor,
          fonte: "embutida",
          obtidoEm: caso.indices.consultadoEm,
        };
      }
    }
    const calculo = {
      ...caso.calculo,
      lancamentos: caso.calculo.lancamentos.map((l) =>
        l.tipo === "prestacao"
          ? { ...l, valorInformado: undefined, origem: "lote" as const, editado: false }
          : l,
      ),
    };
    const r = calcular(calculo, {
      ...caso.indices,
      series: { ...caso.indices.series, "1619": salarios },
    });
    const prestacoes = r.lancamentos.filter((l) => l.tipo === "prestacao");
    expect(prestacoes).toHaveLength(32);
    expect(new Set(prestacoes.map((l) => l.valorBase))).toEqual(
      new Set(["423.60", "455.40", "486.30"]),
    );
    expect(prestacoes[0]?.memoriaBase).toBe(
      "30% do salário mínimo de mar/2024 (R$ 1.412,00) = R$ 423,60",
    );
    expect(prestacoes.every((l) => !l.editado && l.situacao === "atualizado")).toBe(true);
    expect(r.lancamentos.map((l) => [l.id, l.atualizado])).toEqual(
      caso.esperado.lancamentos.map((e) => [e.id, e.atualizado]),
    );
    expect(r.totais).toEqual(caso.esperado.totais);
    expect(r.indicesUsados.filter((i) => i.serie === "1619")).toHaveLength(32);
  });

  it("lote → base → cálculo: o lote do caso de 30% × R$ 1.500,00 gera exatamente as 22 prestações do caso", () => {
    const caso = casoLote as unknown as CasoDeReferencia;
    const lote = caso.calculo.lotes.ultimoLotePrestacoes;
    expect(lote).toBeDefined();
    if (!lote) return;
    const gerado = gerarLotePrestacoes(lote, caso.calculo.dataElaboracao, []);
    expect(gerado.avisos).toEqual([]);
    expect(gerado.lancamentos).toEqual(caso.calculo.lancamentos);
    const r = calcular({ ...caso.calculo, lancamentos: gerado.lancamentos }, caso.indices);
    expect(r.totais).toEqual(caso.esperado.totais);
  });

  it("lote de prestações e lote de pagamentos geram exatamente os lançamentos do caso INPC do SAJ", () => {
    const caso = casoInpc as unknown as CasoDeReferencia;
    const { ultimoLotePrestacoes, ultimoLoteAmortizacoes } = caso.calculo.lotes;
    expect(ultimoLotePrestacoes).toBeDefined();
    expect(ultimoLoteAmortizacoes).toBeDefined();
    if (!ultimoLotePrestacoes || !ultimoLoteAmortizacoes) return;
    const prestacoes = gerarLotePrestacoes(ultimoLotePrestacoes, caso.calculo.dataElaboracao, []);
    const pagamentos = gerarLoteAmortizacoes(ultimoLoteAmortizacoes, prestacoes.lancamentos);
    expect([...prestacoes.avisos, ...pagamentos.avisos]).toEqual([]);
    expect([...prestacoes.lancamentos, ...pagamentos.lancamentos]).toEqual(
      caso.calculo.lancamentos,
    );
    expect(calcular(caso.calculo, caso.indices).totais).toEqual(caso.esperado.totais);
  });

  it("SELIC única com base em 30% do salário mínimo reproduz os 22 valores corrigidos do relatório do SAJ de 11/10/2026 (tabela até ago/2026)", () => {
    // Relatório do SAJ com indexador "Taxa SELIC … Corrigido com Percentual Capitalizado Mensal",
    // de 01/01/2025 a 01/10/2026, no dia 1. A coluna de juros desse relatório ("Taxa Selic, sobre o
    // juro + Selic") conta a SELIC dos meses intermediários duas vezes e não é reproduzida: no
    // Apura a SELIC única já inclui correção e juros (§6.4).
    const corrigidosDoSaj = [
      "569.01",
      "563.30",
      "557.81",
      "552.48",
      "546.67",
      "540.51",
      "534.61",
      "527.87",
      "521.80",
      "515.51",
      "509.03",
      "503.72",
      "531.42",
      "525.34",
      "520.12",
      "513.91",
      "508.38",
      "502.98",
      "497.40",
      "491.43",
      "486.30",
      "486.30",
    ];
    const caso = casoInpc as unknown as CasoDeReferencia;
    const calculo = {
      ...caso.calculo,
      lancamentos: caso.calculo.lancamentos.filter((l) => l.tipo === "prestacao"),
      metodologia: metodologiaSelicUnica(),
    };
    const r = calcular(calculo, tabelaRegimeNovo({ "4390": "2026-08" }));
    expect(r.lancamentos.map((l) => l.valorBase)).toEqual(
      caso.esperado.lancamentos.slice(0, 22).map((e) => e.valorBase),
    );
    expect(r.lancamentos.map((l) => l.corrigido)).toEqual(corrigidosDoSaj);
    expect(r.lancamentos.every((l) => l.jurosValor === "0.00")).toBe(true);
  });
});
```

Execute: `npm test -- src/motor/casos-pela-base.test.ts`
Esperado: 4 testes passam: os dois da Task 7; o lote de prestações seguido do lote de pagamentos gera exatamente os 26 lançamentos do caso INPC; e a SELIC única com a base em 30% do salário mínimo reproduz os 22 valores corrigidos do relatório SELIC do SAJ (tabela até ago/2026), com juros zero (a coluna de juros desse relatório, que conta a SELIC duas vezes nos meses intermediários, não é reproduzida de propósito).

- [ ] **Step 3: Verificar e commitar**

Execute: `npm run format && npm run verificar`
Esperado: 15 arquivos de teste e 386 testes verdes.

```bash
git add src/motor/casos src/motor/casos-pela-base.test.ts && git commit -m "motor: caso de referência do SAJ com INPC e lotes de prestações e pagamentos; corrigidos da SELIC única" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

### Task 9: Fechamento da fase: roteiro, CLAUDE.md, design, pendências e verificação final

**Files:**
- Modify: `docs/superpowers/roteiro.md`, `CLAUDE.md`, `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md` (§5.2, §5.4, §6.1, §6.2, §6.3, §6.4, §6.7, §6.8, §7, Anexo A), este plano (seção "Pendências registradas na execução da fase 3")

- [ ] **Step 1: Rodar a verificação completa e a build**

Execute: `npm run verificar && npm run build`
Esperado: tudo verde; `dist/` gerado; 15 arquivos de teste e 386 testes.

- [ ] **Step 2: Atualizar o roteiro**

Em `docs/superpowers/roteiro.md`, troque a linha da fase 3 por (use a data do dia):

```markdown
| 3 · Bases e lotes | valor fixo com reajuste, % do salário mínimo, % dos rendimentos; lotes cumulativos de prestações e amortizações; casos-limite | concluída em AAAA-MM-DD · plano: `docs/superpowers/plans/2026-10-11-fase-3-bases-e-lotes.md` |
```

troque a situação da fase 4 de "pendente" para "plano a escrever", e substitua o item "Gabaritos do SAJ Tribunais: obtidos em 11/10/2026 (IGP-M 2024–2026 e SELIC capitalizada); …" da seção "Insumos que dependem do responsável" por:

```markdown
- Gabaritos do SAJ Tribunais: obtidos em 11/10/2026 (IGP-M 2024–2026; SELIC capitalizada; base "valor informado" R$ 1.500,00 × 0,30 em 22 prestações, sem reajuste; INPC com base "salário mínimo do período" 0,30 e quatro pagamentos mensais; SELIC como indexador e como juros com aba Honorários a 10%, analisado sem virar caso porque conta a SELIC duas vezes). O SAJ não calcula a taxa legal nem o valor fixo com reajuste por índice: os gabaritos desses são a Calculadora do Cidadão do BCB e aritmética decimal independente. Opcional restante: lançamento datado no dia do cálculo.
```

- [ ] **Step 3: Atualizar o `CLAUDE.md`**

Seção "Estado" (substitua o parágrafo inteiro; use a data do dia):

```markdown
## Estado

Fase 3 (bases e lotes) concluída em AAAA-MM-DD: valor-base pelas três bases (valor fixo com
reajuste anual por índice ou pelo salário mínimo, % do salário mínimo, % dos rendimentos), lotes
cumulativos de prestações e pagamentos, situação dos lançamentos (vincenda e ignorado), valores
informados à mão, texto decimal inválido tratado, juros sobre o corrigido sem arredondar (SAJ),
séries 188 e 1619 embutidas e quatro casos de referência novos (dois do SAJ de 11/10/2026: valor
informado 0,30 × R$ 1.500,00 e INPC com lotes; 2018 pela base; reajuste pelo IPCA conferido na
Calculadora). Próxima: fase 4 (índices ao vivo), com plano a escrever. A tabela de fases do
roteiro é a referência; atualize-a e esta seção ao concluir cada fase.
```

Mapa de pastas: na linha de `src/motor/`, troque `periodos.ts · correcao.ts · juros.ts · calcular.ts · casos/ (casos de referência)` por `periodos.ts · correcao.ts · juros.ts · lote.ts · base.ts · calcular.ts · casos/ (casos de referência)`; na linha de `src/motor/testes/`, troque "tabela IGP-M 2017–2018 e séries do regime novo 2024–2026 usadas pelos testes unitários" por "IGP-M e salário mínimo de 2017–2018 e as seis séries de 2024–2026 usadas pelos testes unitários".

Regra 2 de "Regras obrigatórias": acrescente ao fim da frase "o fator e o percentual de juros multiplicam com precisão integral e são impressos com 6 casas (convenção do SAJ, decidida em 11/10/2026)." o texto " Os juros incidem sobre o corrigido sem arredondar: `jurosValor = arred2(valorBase × fator × percentual ÷ 100)` (fase 3)."

Seção "Pontos de validação jurídica": troque "Os pontos 3, 4, 5, 8, 9 e 12 foram decididos em 11/10/2026 (nota ao fim da §7 do design)." por "Os pontos 3, 4, 5, 8, 9 e 12 foram decididos em 11/10/2026 na fase 2, e os pontos 6, 7, 10 e 11 na fase 3 (notas ao fim da §7 do design); resta a parte do ponto 1 sobre o pro rata no mês final."

Seção "Como registrar um caso de referência": no item `calculo`, acrescente "(prestações sem `valorInformado` quando o caso prova a apuração pela base)"; no item `esperado`, troque "e os `totais`." por "opcionalmente `valorBase`, `memoriaBase`, `situacao`, `editado` e `avisos` do lançamento; os `totais`; e, opcionalmente, os `avisos` do resultado. Os campos opcionais só são comparados quando o caso os traz."

- [ ] **Step 4: Registrar as decisões no design**

Em `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md`, faça estas substituições:

1. §5.2, linha `  valorInformado?: string                  // amortizações sempre; prestações só se editadas à mão`: troque o comentário por `// amortizações sempre; prestações só quando o valor foi informado à mão (as demais, pela base, §6.3)`.
2. §5.4, linha `    valorBase: string; memoriaBase: string          // ex.: "48,23% do salário mínimo de jan/2017 (R$ 937,00)"`: troque por

```ts
    valorBase: string; memoriaBase: string          // ex.: "30% do salário mínimo de mar/2024 (R$ 1.412,00) = R$ 423,60"
    editado: boolean                                 // valor informado à mão, não apurado pela base (§6.3)
    situacao: "atualizado" | "vincenda" | "ignorado" // §6.7 (fase 3)
```

3. §6.1, depois do item "- Lotes são cumulativos: …", acrescente: `- A competência de cada prestação é o mês do vencimento, e a base (§6.3) usa sempre o mês da data do vencimento (decisão de 11/10/2026). As prestações do lote nascem sem valor informado (o motor as apura pela base), com origem "lote" e id \`p-AAAA-MM\` (\`p-AAAA-MM-2\`, \`-3\`… se o id já existir).`
4. §6.2, troque o item único por: `- Entrada: valor por mês, dia do pagamento (a tela o preenche com o dia do vencimento; o motor recebe sempre o dia) e intervalo de meses. Gera um lançamento \`amortizacao\` por mês, descrição "Pagamento parcial", editável, com id \`a-AAAA-MM\`. Meses que já têm pagamento lançado são pulados, com aviso (decisão de 11/10/2026); um segundo pagamento no mesmo mês entra como pagamento avulso. Amortizações avulsas são lançadas na tabela de resultado.`
5. §6.3, troque a lista inteira (seis itens) por:

```markdown
- A base usa sempre o mês da data do vencimento da prestação (a competência é o rótulo da linha e, no lote, é igual ao mês do vencimento). Toda prestação sem valor informado, de lote ou avulsa, é apurada pela base (decisões de 11/10/2026, fase 3).
- Valor fixo com reajuste por índice (IGP-M, INPC ou IPCA): no mês do reajuste (padrão: mês da fixação; editável), o valor vigente é multiplicado pelo índice acumulado dos 12 meses anteriores ao mês do reajuste; a partir daí, a cada 12 meses. O primeiro reajuste cai 12 meses após a fixação quando o mês do reajuste é o próprio mês da fixação (fixado em 15/03/2024, reajuste em março: mar/2025, com o acumulado de mar/2024 a fev/2025); com outro mês escolhido, cai na primeira ocorrência dele depois do mês da fixação, com o acumulado desde o mês da fixação até o mês anterior ao reajuste (pode ter menos de 12 meses). O acumulado (produto dos fatores mensais) multiplica com precisão integral e aparece na memória com 4 casas; o valor reajustado é arredondado a 2 casas a cada reajuste, e o seguinte parte dele. Acumulado negativo ou zero não reduz o valor: o valor vigente é mantido e a memória registra. Se faltar na tabela algum mês do acumulado, o reajuste não é aplicado, o valor vigente anterior é mantido e o aviso diz até que mês o índice está disponível.
- Reajuste "pelo salário mínimo": valor × (salário mínimo do mês do vencimento ÷ salário mínimo do mês da fixação), sem usar o mês de reajuste (o valor acompanha o salário mínimo no mês em que ele muda). "Nenhum": valor constante.
- Prestação anterior ao mês da fixação: entra com o valor fixado, sem reajuste, com aviso.
- Percentual do salário mínimo: percentual × salário mínimo do mês do vencimento (série 1619). Mês ainda sem salário mínimo publicado: usa-se o último publicado, que vigora até o novo decreto, com aviso; a proveniência registra o mês realmente usado.
- Percentual dos rendimentos: percentual × rendimento do mês (o do lançamento, se informado; senão o padrão). Não há reajuste automático: quando o rendimento muda, o usuário informa o novo rendimento nos meses afetados ou altera o padrão.
- Valor informado à mão prevalece: a linha do resultado traz `editado = true`, aviso no lançamento e resumo no resultado; o relatório menciona esses valores. Amortizações têm o valor sempre informado e não recebem a marca.
- Valor-base arredondado a 2 casas. `memoriaBase` explica a conta em uma frase (ex.: "30% do salário mínimo de mar/2024 (R$ 1.412,00) = R$ 423,60"; "R$ 500,00 fixados em 15/03/2024, reajustados em mar/2025 (IPCA de mar/2024 a fev/2025: 5,0576%) = R$ 525,29").
- 13º salário e férias, quando a base for percentual dos rendimentos, entram como prestação avulsa com descrição e com o rendimento do evento informado no lançamento; o motor aplica o percentual (ponto de validação 11, decidido em 11/10/2026).
```

6. §6.4, item "- O percentual total multiplica com precisão integral e é impresso com 6 casas: `jurosValor = arred2(corrigido × percentual ÷ 100)`. `atualizado = corrigido + jurosValor`.": troque por "- O percentual total multiplica com precisão integral, é impresso com 6 casas e incide sobre o valor corrigido sem arredondar, como o SAJ (decisão de 11/10/2026, fase 3): `jurosValor = arred2(valorBase × fator × percentual ÷ 100)`. `atualizado = corrigido + jurosValor`."
7. §6.7, troque a lista inteira (cinco itens) por:

```markdown
- Prestação com data posterior à data de elaboração: entra pelo valor nominal, sem correção e sem juros, mesmo com termos próprios, com `situacao = "vincenda"` (art. 323 do CPC) e aviso; soma nos totais; pode ser excluída.
- Amortização posterior à data de elaboração: `situacao = "ignorado"`, fora dos totais, com aviso; a linha permanece no resultado pelo valor nominal.
- Mês sem salário mínimo publicado: usa-se o último publicado, com aviso (§6.3). Mês sem índice de reajuste: o reajuste não é aplicado e o valor vigente anterior é mantido, com aviso. Sem nenhum salário mínimo anterior, sem rendimento válido ou com texto decimal inválido na base: a prestação fica sem valor (`ignorado`), com aviso pedindo o valor à mão.
- Valor zero ou negativo, texto decimal inválido (`"1,5"`, vazio, `"NaN"`, `"Infinity"`) ou pagamento sem valor: aviso; lançamento `ignorado` nos totais. Amortizações são informadas como valores positivos (o SAJ as imprime negativas).
- Datas inválidas: validação na tela; o motor recebe só datas válidas.
```

8. §6.8, acrescente ao fim do parágrafo: " Os juros incidem sobre o corrigido sem arredondar (`valorBase × fator × percentual`), como o SAJ (decisão de 11/10/2026, fase 3)."
9. §7, itens: no 4, troque "sobre o valor corrigido pelo IPCA; conferir períodos na Calculadora do Cidadão do BCB." por "sobre o valor corrigido pelo IPCA, conferida na Calculadora do Cidadão do BCB (decidido em 11/10/2026; ver nota abaixo)."; no 6 e no 7, acrescente ao fim " (decidido em 11/10/2026; ver nota da fase 3)"; no 9, troque "valores com 2 casas por lançamento, a confrontar com gabaritos (decidido em 11/10/2026; ver nota abaixo)." por "juros sobre o corrigido sem arredondar, valores com 2 casas por lançamento, confrontados com os gabaritos do SAJ (decidido em 11/10/2026; ver notas abaixo)."; no 10, troque "com INPC e IPCA como alternativas." por "com INPC, IPCA e SELIC única como alternativas (decidido em 11/10/2026; ver nota da fase 3)."; no 11, acrescente ao fim " (decidido em 11/10/2026; ver nota da fase 3)".
10. §7, depois do parágrafo "**Decisões registradas em 11/10/2026 (fase 2).** …", acrescente:

```markdown

**Decisões registradas em 11/10/2026 (fase 3).** Ponto 6: regra da §6.3 confirmada e completada: primeiro reajuste 12 meses após a fixação (ou na primeira ocorrência do mês escolhido, com o acumulado desde a fixação), acumulado com precisão integral impresso com 4 casas, valor arredondado a 2 casas a cada reajuste, acumulado negativo não reduz, reajuste pelo salário mínimo pela proporção do mês do vencimento sem usar o mês de reajuste, prestação anterior à fixação pelo valor fixado com aviso. Ponto 7: método do SAJ confirmado como padrão único. Ponto 9 (complemento): os juros incidem sobre o corrigido sem arredondar, como o SAJ (relatório de 11/10/2026 com 22 prestações, duas delas na fronteira do centavo). Ponto 10: IGP-M confirmado como padrão do período antigo, com INPC, IPCA e SELIC única como alternativas; a SELIC já inclui correção e juros, e o motor avisa quando um período a combina com índice de correção (um relatório do SAJ de 11/10/2026 que usa a SELIC como indexador e como juros conta a SELIC dos meses intermediários duas vezes, combinação que o Apura não oferece; a coluna de correção dele coincide com a SELIC única do Apura). Ponto 8 (confirmação adicional): no mesmo relatório, os honorários do SAJ incidem sobre atualização menos amortização, a base do Apura. Ponto 11: 13º e férias como prestação avulsa com o rendimento do evento informado; o rendimento é sempre informado (padrão ou do mês), sem reajuste automático. Lacunas fechadas: competência = mês do vencimento; lote de pagamentos pula meses já lançados; salário mínimo ainda não publicado → último publicado; a marca "editado" vale só para prestações com valor informado; o resultado traz `situacao` e `editado` em cada linha. Gabaritos: dois relatórios do SAJ de 11/10/2026 reproduzidos centavo a centavo, um com base "valor informado" (R$ 1.500,00 × 0,30, sem reajuste, como caso de % dos rendimentos) e outro com INPC, base "salário mínimo do período" e pagamentos mensais (tabela de INPC igual à do BCB); o SAJ não tem valor fixo com reajuste por índice, cujo caso é conferido na Calculadora do Cidadão e por aritmética independente.
```

11. Anexo A, troque o parágrafo "Hipótese não confirmada: a base parece ser 48,23% do salário mínimo …, a confirmar." por: "Base confirmada na fase 3 (11/10/2026): valor fixo de R$ 451,91 fixado em 10/01/2017 e reajustado pela proporção do salário mínimo (937,00 em 2017; 954,00 em 2018): 451,91 × 954 ÷ 937 = 460,109… = R$ 460,11, exatamente o valor de 2018. A hipótese de 48,23% do salário mínimo não confere (937 × 48,23% = 451,9151 → 451,92). O caso de referência original usa os valores nominais como informados; o caso `2018-05-25-saj-tjms-base-valor-fixo-reajuste-sm.json` recalcula as mesmas 28 linhas pela base."

- [ ] **Step 5: Preencher as pendências desta fase**

Na seção "Pendências registradas na execução da fase 3" deste plano, registre os achados das revisões que ficaram para fases seguintes (há itens já conhecidos lá) e as decisões tomadas na execução.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/roteiro.md CLAUDE.md docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md docs/superpowers/plans/2026-10-11-fase-3-bases-e-lotes.md && git commit -m "docs: fase 3 concluída no roteiro, no CLAUDE.md e no design" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

- [ ] **Step 7: Integrar o trabalho**

Use a skill `superpowers:finishing-a-development-branch`: o repositório ainda não está no GitHub, então a integração é local (merge da branch de trabalho na `main`, com commit de merge, feito pela pasta principal, como nas fases 1 e 2), e a decisão é do responsável.

---

## Notas para as fases seguintes (ganchos deixados por esta fase)

- **Fase 4 (índices ao vivo).** A rotina de atualização baixa as seis séries; o congelamento grava a data-hora real da consulta. O calendário de divulgação explica os avisos novos: "Salário mínimo de mm/aaaa ainda não publicado" (o decreto sai no fim do ano anterior ou no início do ano; a série 1619 traz os meses futuros do ano) e "IPCA de mm/aaaa não disponível … o reajuste de mm/aaaa não foi aplicado" (IPCA e INPC por volta do dia 10 do mês seguinte). Ao reabrir um cálculo depois da publicação de um salário mínimo novo, o recálculo avisa que um índice usado mudou (§8.2): a linha "último publicado" vira o valor definitivo.
- **Fase 5 (interface).** "Lançar em lote" chama `gerarLotePrestacoes(lote, calculo.dataElaboracao, calculo.lancamentos)` ou `gerarLoteAmortizacoes(lote, calculo.lancamentos)`, acrescenta `lancamentos` à lista, guarda o lote em `calculo.lotes` e mostra `avisos`; "+ Prestação" cria uma avulsa sem `valorInformado` (o motor apura pela base) e "+ Pagamento" uma amortização com valor. O formulário de pagamentos preenche o dia com o dia do vencimento do último lote de prestações. A tela esconde o mês de reajuste quando o reajuste é pelo salário mínimo ou "nenhum", exige o rendimento padrão na base em % dos rendimentos e oferece a edição do rendimento mês a mês (sugestão: "aplicar este rendimento daqui em diante"). Ao combinar SELIC única com juros ou índice, a tela avisa que a SELIC já inclui correção e juros (o motor também avisa). A linha do resultado mostra `situacao` ("vincenda", "não computado") e `editado` (lápis); os avisos de cada lançamento aparecem ao expandir a linha. O campo `Lancamento.editado` é da tela (lápis, não sobrescrever ao relançar lote): o motor não o lê; a marca do resultado deriva de `valorInformado`.
- **Fase 6 (relatório).** O parágrafo "Base" do bloco de metodologia é montado a partir de `calculo.base` e das `memoriaBase` (uma frase por forma de base, com os reajustes aplicados e seus percentuais) e menciona as prestações com `editado = true`; linhas `vincenda` ganham a etiqueta e as `ignorado` aparecem fora dos totais (ou são omitidas, a decidir); a matriz de índices (§10.1, item 7) passa a incluir salário mínimo (1619) e INPC (188) a partir de `indicesUsados`; o salário mínimo "último publicado" deve ser descrito como tal. O texto de encargos diz que os juros incidem sobre o valor corrigido (sem arredondar) e que o reajuste anual usou o acumulado com precisão integral.
- **Fase 7 (publicação).** A rotina mensal roda `npm run indices:atualizar` sem argumentos (as seis séries).

### Pendências registradas na execução da fase 3

Achados que ficaram para fases seguintes ou como melhorias menores, agrupados por destino, e as decisões tomadas na execução. Os itens abaixo reúnem os já conhecidos ao escrever o plano e os achados das revisões:

- **Melhorias menores da fase 1 não tratadas aqui:** totais arredondados com as casas da metodologia global mesmo quando um lançamento tem metodologia própria; `ValorMensal` repete o formato de `ArquivoSerie.valores`.
- **Gabarito opcional do SAJ ainda não obtido:** lançamento datado no dia do cálculo (os da aba Honorários e da SELIC como juros foram obtidos e analisados em 11/10/2026: ver "Para o responsável", descoberta 7).

**Fase 4**

- Fuso da data da consulta (já registrado na fase 2) e congelamento com a data-hora real.
- Quando a série 1619 ganhar o ano seguinte, as prestações que usaram o "último publicado" mudam de valor ao recalcular: o aviso de "índice usado mudou" (§8.2) deve nomear o salário mínimo.
- `scripts/atualizar-indices.ts` recusa respostas com `content-type` diferente de `application/json`, e o BCB às vezes rotula JSON válido como `text/html`: a Task 1 precisou de várias tentativas até as seis séries saírem na mesma rodada. `interpretarRespostaSgs` já recusa corpo que não seja lista JSON, então a checagem do cabeçalho pode sair; o cliente ao vivo não deve depender do cabeçalho.
- `lerArquivoSerie` confere só o envelope do arquivo (os itens de `valores` não são checados) e faz o cast antes do `typeof`; a condição sobre `obtidoEm` não tem teste próprio. Relevante quando a fase 4 reaproveitar o leitor para cache e dados ao vivo.
- Lacuna no meio da série do salário mínimo (tabela congelada antiga ou dados ao vivo) sai com o aviso 'ainda não publicado… vigente até a publicação do novo', que confunde quando o buraco é de dados; o calendário de divulgação pode distinguir os dois casos.

**Fase 5**

- Percentuais de multa e honorários e `taxaMensal` ainda são lidos com `decimal()` e lançam `DecimalError` com texto inválido; `decimalOuNulo` já existe para tratá-los no motor, se a fase 5 preferir isso à validação na tela.
- A tela valida, antes de chamar o motor, `dataElaboracao`, `dataFixacao` (malformada ou anterior a 1900 lança no motor, pela convenção da §6.7) e `base.tipo` (desconhecido devolve valor nulo com aviso desde a onda de correção final; a tela e a abertura de arquivo ainda devem validá-lo); grava `rendimento` omitido, e não `""`, quando o campo está vazio (texto vazio conta como informado e gera aviso); o campo `Lancamento.editado` é só da tela (o motor não o lê).
- Dia do vencimento ou do pagamento fora de 1 a 31, "meses em atraso" menor que 1 e intervalo invertido geram aviso e lote vazio; a tela impede antes. Intervalos de milhares de meses são lentos (o gerador é quadrático porque `idLivre` reconstrói o conjunto de ids a cada lançamento) e a competência "9999-12" faz `competenciasEntre` lançar; a tela limita o intervalo.
- Lote de pagamentos: um segundo pagamento no mesmo mês só entra como avulso (decisão de 11/10/2026); a tela deve dizer isso no aviso.
- SELIC única combinada com juros ou índice: a tela avisa; o relatório SELIC do SAJ de 11/10/2026 mostra o efeito (SELIC contada duas vezes nos meses intermediários), bom exemplo para o texto de ajuda.
- Salário mínimo anterior a jul/1994 fica na série 1619 em moeda nominal da época; uma prestação em % do salário mínimo com vencimento anterior sairia em moeda antiga (fora do MVP; a tela pode limitar as datas).
- 13º e férias (ponto 11) dividem a competência com a prestação regular: um avulso de dez/2025 lançado ANTES do lote faz o lote pular dez/2025 (§6.1, 'competência já existente não é duplicada'). Perguntar ao responsável e decidir na tela: lançar o lote antes dos avulsos, ou o gerador ignorar avulsos com descrição na deduplicação. Também: a tela valida `dataFixacao` com `dataValida` (competência malformada lança no motor; dia inválido, como 30/02, passa em silêncio e sai impresso na memória) e esconde/bloqueia `rendimento` fora da base em % dos rendimentos (o motor o ignora em silêncio).

**Fase 6**

- A `memoriaBase` do valor fixo reajustado por índice cresce uma cláusula por reajuste; com muitos anos a frase fica longa; o relatório decide se resume. Quando falta índice no meio de uma janela, a memória e o aviso não dizem que os reajustes seguintes também não foram aplicados.
- Linhas `ignorado` aparecem no resultado pelo valor nominal; o relatório não pode somá-las nem exibi-las como devidas. Uma prestação com texto inválido sai `editado = true` e entra nos dois resumos ("informado à mão" e "não computados"); rótulos se repetem quando há vários lançamentos ignorados na mesma competência (agrupar).
- `temTermosProprios` não considera `encargos.metodologia`: uma vincenda que só tem metodologia própria não recebe o aviso de que os encargos próprios não se aplicam, embora receba os avisos de validação dessa metodologia.

**Sem fase (melhorias menores)**

- Lacunas de teste apontadas nas revisões e ainda abertas: o guard `competencias.length > 0` em `gerarLotePrestacoes`, o sufixo `-3` de `idLivre` e a colisão de ids `a-`, os avisos de `mesesEmAtraso` 0 e dia 32; `somarMeses` com saltos de vários anos; literal esperado em `decimalOuNulo`; os ramos "de … a …" e "desde …" de `descreverPeriodo`; o valor de um único reajuste conferido só com `toFixed(2)`; a guarda `Number.isInteger(mesReajuste)` com NaN e 2,5.
- Código: `decimalOuNulo` e `textoDecimalValido` não conferem `typeof texto === "string"`; `PRIMEIRA_COMPETENCIA` em lote.ts repete o limite de 1900 de datas.ts; textos de aviso e memória duplicados em base.ts e um `continue` inalcançável em `porIndiceAcumulado`; docblock de `validarMetodologia` desatualizado; a função `calcular` ficou longa (totais, avisos, proveniência e resumos juntos); a tolerância do ramo dos juros em casos.test.ts não escala com o percentual (falha segura acima de cerca de 200% acumulados).
- Casos de referência: os pagamentos do caso INPC não trazem `fator` no esperado (o relatório não imprime fator acumulado dos pagamentos); em casos-pela-base.test.ts, `slice(0, 22)` pressupõe a ordem do JSON, `every(…).toBe(true)` não diz qual prestação falhou, o `calcular` final do teste do lote repete o que casos.test.ts já prova e o comentário de abertura não menciona lotes nem SELIC.
- A Calculadora do Cidadão usa a série 28655 para o IGP-M (número-índice), e não a 189: por isso o caso de reajuste por índice usa o IPCA. `rotulo` em calcular.ts usa a data quando a prestação não tem competência. O teste genérico compara `editado` como texto.
- Quando houver outros tipos de cálculo (cálculo livre, honorários, danos morais), condicionar o aviso 'valor informado à mão, não apurado pela base dos alimentos' e o resumo correspondente a `calculo.tipo === "alimentos"`; no MVP todo valor informado de prestação os gera, o que é correto. O aviso de índice de reajuste faltante usa 'não disponível' no singular com lista plural.

**Decisões tomadas na execução**

- O trailer de coautoria de cada commit nomeia o modelo que de fato o executou: Claude Haiku 5.5 nas Tasks 2, 3 e 5; Claude Sonnet 5.5 nas demais.
- Task 3: por achado da revisão da Task 2, `competenciasDoLote` ganhou a guarda do limite inferior das datas (constante `PRIMEIRA_COMPETENCIA = "1900-01"`): "meses em atraso" além de jan/1900 para ali com aviso, e elaboração em jan/1900 com vencimento posterior devolve aviso e nenhuma competência; antes, 1.523 meses ou mais lançavam "Competência inválida".
- Task 4: a revisão (Opus) apontou que os testes conferiam o arredondamento do valor-base com `toFixed(2)`, que arredonda de novo; uma rodada de correção acrescentou asserções com `toFixed()` sem argumento ("681.01", "500", "500.01", "460.11"), provadas por mutação; base.ts não mudou.
- As contagens de testes do plano estavam uma unidade abaixo: 354 após a Task 7 e 387 ao fim.
- As revisões das Tasks 4 e 6 foram feitas em Opus (módulos centrais); as demais em Sonnet; a re-revisão da Task 4 em Haiku.
- Salário mínimo anterior a jul/1994 (moeda nominal na série 1619) ficou fora do MVP, registrado acima.
- Relatórios dos subagentes gravados em `.txt`; o da Task 2 foi transcrito pelo controlador.
- Onda de correção da revisão final (um commit): `default` em `apurarValorBase` para base desconhecida, testes de competência × vencimento, pagamento sem valor e prestação sem competência, `it.runIf` nos avisos dos casos, renomeação da variável local que sombreava `mesAnterior`, limpeza de código morto, `editado: false` nas amortizações dos casos de 2026, metadados e observações dos casos novos, e três ajustes de texto no design.

## Auto-revisão do plano

**Cobertura da fase 3 (§16 do design, tabela do roteiro, pendências das fases 1 e 2 e brief desta sessão):**

| Item | Task |
|---|---|
| valor fixo com reajuste anual (IGP-M, INPC, IPCA, salário mínimo ou nenhum), com `memoriaBase` em uma frase | 4 (casos na 7) |
| percentual do salário mínimo (série 1619), inclusive mês ainda sem salário mínimo | 4 e 6 (caso do SAJ 2026 recalculado na 7) |
| percentual dos rendimentos (rendimento do mês ou padrão; 13º pelo rendimento do evento) | 4 (caso do SAJ na 7) |
| valor informado à mão prevalece e é marcado (`editado`), com aviso e resumo; alcance decidido (só prestações) | 6 |
| proveniência do salário mínimo e dos índices de reajuste em `indicesUsados`; meses faltantes nos avisos; ordem numérica das séries | 6 (expectativa das séries na 1) |
| lote de prestações: dia de vencimento, "N meses em atraso" ou intervalo, dia 31 em mês curto, cumulativo sem duplicar, aviso dos pulados | 2 e 3 |
| lote de pagamentos, cumulativo sem duplicar | 3 |
| casos-limite da §6.7: vincenda (inclusive com termos próprios), pagamento posterior, valor zero ou negativo, dado faltante, texto inválido | 6 (e 4 para a base) |
| séries 188 e 1619 embutidas (as seis baixadas juntas), teste de embutidos ajustado, leitura checada, nomes num lugar só | 1 |
| casos de referência, um por tipo de base, com gabaritos (SAJ, 2018, Calculadora + aritmética) | 7 e 8 |
| gabarito INPC do SAJ (ponto 10) com os dois lotes; 22 corrigidos da SELIC única; base dos honorários do SAJ confirmada | 8 (nota da §7 na 9) |
| caso do SAJ de 2026 confirmado pela base (423,60 / 455,40 / 486,30) | 7 |
| hipótese da base do caso de 2018 testada como caso separado, sem mexer no caso de 2018 (só `observacoes`) | 7 |
| `base.valor` dos casos SELIC e transição corrigido | 6 |
| juros sobre o corrigido sem arredondar (decisão de 11/10/2026) e linha a-2025-06-30 | 5 |
| aviso de SELIC combinada com índice (ponto 10) | 5 |
| teste de casos compara `valorBase`, `memoriaBase`, `situacao`, `editado` e avisos; tolerância proporcional | 5 e 6 |
| roteiro, `CLAUDE.md`, design (§5.2, §5.4, §6.1 a §6.4, §6.7, §6.8, §7 com os sufixos dos itens 4 e 9, Anexo A) | 9 |

**Convenções da §12:** domínio em português (`apurarValorBase`, `gerarLotePrestacoes`, `situacao`, `vincenda`), `Decimal` para valores, datas ISO como texto, motor sem rede/relógio/DOM (o gerador recebe a data de elaboração), imports com `.ts`, commits "módulo: o que muda". Verificadas tarefa a tarefa.

**Placeholders:** nenhum "TBD", "TODO" ou "implementar depois"; todo passo de código traz o código, e os quatro casos trazem o JSON completo.

**Consistência de nomes entre tarefas:** `lerArquivoSerie`, `tabelaRegimeNovo` com `"188"`/`"1619"`, `tabelaIgpm(…, …, true)`, `SALARIO_MINIMO_2017_2018` (1) usados em 4, 6 e 7; `mesAnterior`, `somarMeses`, `dataNoMes`, `textoDecimalValido`, `decimalOuNulo` (2) usados em 3, 4 e 6; `LoteGerado`, `competenciasDoLote`, `gerarLotePrestacoes`, `gerarLoteAmortizacoes`, `idLivre` (3) usados em 7 e 8; `metodologiaSelicUnica`, `tabelaRegimeNovo` (fase 2 e Task 1) usados em 8; `ValorBaseApurado`, `MesSemIndice`, `apurarValorBase` (4) usados em 6; `validarMetodologia` com o aviso da SELIC (5) usado em 6; `SituacaoLancamento`, `LancamentoCalculado.editado`/`situacao`, `LancamentoEsperado` opcionais, `esperado.avisos` (6) usados em 7 e 8; `calcular` (6) usado em 7 e 8.

**Foco da revisão:** os cinco itens têm teste na tarefa dona (3: lotes sobrepostos e relançados; 2 e 3: dia 31 em fevereiro e elaboração antes/depois do vencimento; 4: mês de reajuste diferente, janela curta, acumulado negativo, índice faltante no meio; 4 e 6: mês sem salário mínimo e vincenda; 5 e 6: fronteira do centavo, texto inválido, zero e negativo).

**Ensaio:** todo o código deste plano foi executado numa cópia do repositório fora dele em 11/10/2026: `npm run format && npm run verificar` verde (Prettier, ESLint, `tsc -b`, 15 arquivos e 386 testes) e `npm run build`; os passos RED das Tasks 1, 2 e 6 foram simulados (3, 3 e 14 falhas exatas) e as oito linhas do caso de reajuste pelo IPCA foram reproduzidas por um motor independente em Python antes do motor TypeScript.
