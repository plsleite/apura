# Apura · Fase 4 · Índices: rotina central e monitoramento — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** fazer os índices do BCB chegarem ao Apura por uma rotina central no repositório, que de segunda a sexta, às 10h47, 14h17 e 22h47 de Brasília, baixa as seis séries, grava só o que mudou (série por série) e republica o site, enquanto o app apenas lê a cópia publicada, sem nenhuma consulta externa; congelar a tabela de cada cálculo com a data real dos índices (horário de Brasília); avisar, ao reabrir um cálculo, quais índices usados mudaram; explicar pelo calendário de divulgação por que um mês falta ("ainda sem divulgação na data da consulta", com a previsão; "ainda não chegou ao Apura"; ou, para buraco de dados, "não disponível na tabela de índices", que no salário mínimo é "não consta na tabela de índices"); e monitorar a rotina com ferramentas gratuitas (resumo de cada execução, alarme de silêncio e relatório mensal gravado no repositório), com o próprio repositório como registro histórico; mais as pendências que as fases 1, 2 e 3 destinaram a esta.

**Arquitetura:** o motor (`src/motor/`) continua puro e recebe a `TabelaIndices` pronta. Do lado do app, `src/indices/` monta essa tabela só com a cópia embutida (`embutidos.ts`) e o calendário (`calendario.ts`), e a congela por cálculo (`congelar.ts`, síncrono, o único ponto que a interface da fase 5 chama). Do lado da rotina, que roda no GitHub Actions e nunca no navegador, `atualizacao.ts` usa o cliente do BCB (`cliente-bcb.ts`) e a leitura de arquivos de série (`arquivo-serie.ts`, que não importa os dados embutidos) para baixar, conferir e gravar; `relatorio.ts` calcula o relatório mensal a partir do histórico de execuções e do `git log`. Rede e relógio entram por parâmetro com valor padrão; o disco e o git ficam nos scripts de `scripts/`, que passam a `src/indices/` uma interface de arquivos ou o texto já lido; `new Date()` só existe em `relogio.ts`. O motor recebe duas mudanças pequenas, justificadas por pendências: o mês parcial da SELIC passa a ser deduzido da data de obtenção do próprio valor, e os avisos dizem "ainda sem divulgação", com a previsão, quando a tabela traz o calendário (`esperadoAte`). Nenhuma dependência nova.

**Stack:** Node 22 · npm · Vite 8.3 · React 19.3 · TypeScript 6.0 · Vitest 5.0 · decimal.js 10.6 · ESLint 10 + typescript-eslint 8 · Prettier 3.9, nas versões exatas já fixadas em `package.json`. `fetch`, `AbortSignal.timeout`, `Response` e `Intl.DateTimeFormat` nativos do Node 22. GitHub Actions (`actions/checkout@v6` e `actions/setup-node@v6`, ambos em Node 24), `gh` e `jq` dos executores do GitHub; Healthchecks.io (plano gratuito) e Cloudflare Pages na fase 7.

**Spec:** `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md` (fonte de verdade: §3.1 índices oficiais; §4.2 e §4.3 o módulo `indices/` entrega a tabela; §5.1 reabrir recalcula e avisa; §5.4 `consultaIndices` e `indicesUsados`; §6.4 item 3 mês "ainda não divulgado"; §8 inteira; §10.4 "Fontes"; §11 testes de índices sem rede; §12.2 estrutura; §13 rotina de índices; §14 comunicação de rede; §15 riscos; §16 item 4), com as mudanças decididas pelo responsável em 11 e 12/10/2026 e registradas neste plano (rotina central no lugar da busca no navegador). Também: `docs/superpowers/roteiro.md`, `docs/superpowers/specs/2026-10-10-apura-visao-do-produto.md` (§5) e os planos das fases 1, 2 e 3 (seções "Notas para as fases seguintes" e "Pendências").


## Restrições globais (valem para todas as tarefas)

- TypeScript estrito; Node 22 e npm (não há pnpm). Internet só no `npm install` inicial e no último passo da Task 8 (o script de índices, que exige Node ≥ 22.18); os testes rodam sem rede.
- Dinheiro, percentuais, índices e fatores são sempre `Decimal`, importado só de `src/compartilhado/decimal.ts`; nunca `number`. Texto decimal com ponto nos arquivos e no `Resultado`. Tudo que chega de arquivo ou de rede é `unknown` até passar por `textoDecimalValido` (que aceita `unknown`), `ehValorMensalValido` ou `competenciaValida` (esta recebe texto: conferir antes `typeof x === "string"`); a data do BCB com mês inválido ("01/13/2026") é recusada.
- Datas como texto `"AAAA-MM-DD"`, competências `"AAAA-MM"`. O motor não usa `Date`, `fetch`, DOM nem armazenamento (o ESLint impede). Em `src/indices/`, rede e relógio entram **por parâmetro com valor padrão** (`fetch`, `agora`, `hoje`, `dormir`) e o disco entra como interface (`arquivos`, sem padrão), implementada pelos scripts de `scripts/`, os únicos com os tipos do Node; os testes injetam versões falsas; `new Date()` só aparece em `src/indices/relogio.ts`.
- **Rotina central (decisão de 12/10/2026):** o app não consulta o BCB nem grava nada no navegador; lê só a cópia publicada (`dados/indices/*.json`, importada por `embutidos.ts`). Quem consulta o BCB é a rotina do GitHub Actions, de segunda a sexta às 10h47, 14h17 e 22h47 de Brasília (três linhas de agendamento com `timezone: "America/Sao_Paulo"`, em minutos "quebrados", porque o início de cada hora é o horário de pico em que o GitHub atrasa ou descarta execuções), mais o botão "Run workflow".
- **Gravação série por série:** uma série que falha, encolhe, vem vazia ou tem o arquivo atual ilegível fica como estava, sem impedir as outras; a execução termina com falha (vermelha no GitHub e contada no relatório mensal). Série sem mudança não é regravada (mantém a data de obtenção). Antes de gravar na `main`, roda `npm run verificar`; o commit descreve a rodada, o que mudou e o endereço da execução; antes do envio, `git pull --rebase`.
- **Horário de Brasília:** toda data-hora de obtenção é texto ISO com o deslocamento de Brasília (`"2026-10-11T14:02:00-03:00"`), gravada por `agoraEmBrasilia()`; na tela e no relatório, "atualizados em 11/10/2026 14:02 (horário de Brasília)". Os arquivos embutidos anteriores a esta fase trazem UTC (`…Z`) e continuam válidos: as datas são comparadas pelo instante (`compararInstantes`), nunca como texto.
- **Mês parcial da SELIC (série 4390):** é o mês igual ao mês de `obtidoEm` do próprio valor (`competenciaDe(valor.obtidoEm) === competencia`), e não mais o mês de `tabela.consultadoEm`. Na rotina, a mudança da 4390 em mês igual ou posterior ao mês de `obtidoEm` do arquivo atual é "SELIC parcial" (informativa); só a mudança em mês anterior é revisão ("Atenção: …").
- **Decisão pelo corpo:** a resposta do BCB é julgada pelo corpo (lista JSON, objeto de erro do SGS, HTML), nunca pelo cabeçalho `content-type` nem só pelo status HTTP; erro 5xx e falha de rede repetem; erro 4xx e corpo inválido não.
- **Congelamento (§8.2):** a tabela de um cálculo é a cópia publicada lida quando ele começa, com o calendário do dia (`esperadoAte`); fica na memória; o arquivo salvo guarda o `Resultado`, cujo `indicesUsados` é comparado com o do recálculo ao reabrir (uma frase por série e mês para valor mudado, com o antigo e o novo; uma por mês novo do salário mínimo, nomeando o último publicado; uma frase para os que entraram e uma para os que saíram).
- **Calendário (decisão de 11/10/2026):** regras por série com dia aproximado, só para avisos. `TabelaIndices.esperadoAte` (opcional) leva ao motor o último mês que cada série deveria ter; sem ele (casos de referência antigos) o motor mantém os avisos genéricos de hoje, e **nenhum teste ou caso existente muda de texto**.
- **Monitoramento gratuito:** resumo de cada execução na página do GitHub; alarme de silêncio no Healthchecks.io (sinal só de sucesso, só em execução agendada; um e-mail se um dia útil passar sem rodada bem-sucedida); relatório mensal automático gravado em `docs/monitoramento/AAAA-MM.md` (sem e-mail e sem republicar o site); ajustes de horário ou de agendador só com o responsável. O próprio repositório é o registro histórico: cada atualização do robô é um commit descritivo.
- Avisos em frases completas, em português, com datas `dd/mm/aaaa`, competências como "out/2026", moeda "R$ 1.621,00" e percentuais com vírgula.
- Testes sem rede: `fetch` falso devolvendo `new Response(corpo, { status, headers })` ou lançando; as respostas reais do SGS gravadas em 11/10/2026 ficam em `src/indices/testes/` (ignoradas pelo Prettier), junto de uma lista sintética de execuções no formato da API do GitHub.
- Dados pessoais: nenhum número de processo nem nome de parte.
- Termos do domínio em português; infraestrutura técnica em inglês. Imports relativos com `.ts`; tipos com `import type`.
- Commits em português no formato "módulo: o que muda", terminados com a linha de coautoria do modelo que de fato executa (`Co-Authored-By: <nome do modelo> <noreply@anthropic.com>`; os comandos abaixo trazem o espaço reservado `<modelo>`, que deve ser trocado).
- Fora desta fase (não implementar): a tela (fase 5: quem chama `congelarIndices` e mostra o rodapé e os avisos), o relatório do cálculo (fase 6), o repositório no GitHub, a publicação e as contas do Healthchecks e do Cloudflare (fase 7: os dois workflows são escritos aqui, mas só podem ser testados lá). As fixtures `src/motor/testes/*.ts` com `obtidoEm` fixo em UTC (`regime-novo.ts` com 2026-10-11T12:00Z; `indices-igpm-2017-2018.ts` com 2026-10-10T00:00Z) não mudam.

## Foco da revisão

Entradas que o design implica mas que nenhum teste cobriria por si; cada uma ganhou teste na tarefa dona do código.

1. **Rodada noturna e virada do dia (fuso):** a rodada das 22h47 roda depois da meia-noite em UTC, e às 23:30 de 31/10 em Campo Grande já é 1/11 em Brasília; datas de obtenção, do commit e da rodada seguem Brasília, e um valor da SELIC obtido em outubro continua parcial mesmo numa tabela lida em novembro. → Task 2 (teste "converte 23:30 de Campo Grande (UTC−4) para 00:30 do dia seguinte em Brasília"), Task 6 (teste "SELIC de out/2026 obtida em out/2026 é parcial mesmo com a tabela consultada em nov/2026") e Task 9 (testes de `horarioAgendado` depois da meia-noite e de sexta para sábado).
2. **BCB fora do ar em parte das séries:** as séries que vieram são gravadas, as que falharam ficam como estavam, nada se perde, e a execução termina com falha para o alarme. → Task 8 (testes "falha só na 189…" e "BCB mudo nas seis…").
3. **Respostas estranhas do BCB:** mês repetido com valores diferentes, ordem decrescente, corpo de erro 404 com status 200, HTML com status 200 (série inexistente ou bloqueio), página 502, `content-type: text/html` com JSON válido, mês 13. → Task 4 (testes de `buscarSerie` e de `interpretarRespostaSgs`) e Task 8.
4. **SELIC parcial todo dia útil:** a atualização diária do mês corrente da SELIC não vira "Atenção", o fechamento do mês no mês seguinte também não, mas a mudança de um mês já fechado (da SELIC ou de outra série) vira. → Task 8 (testes de SELIC parcial, fechamento e revisão).
5. **Cálculo salvo num mês e reaberto noutro, e série que encolheu:** ao reabrir em jan/2027, o salário mínimo de jan/2027 substitui o "último publicado" de dez/2026 e o IPCA de out/2026 entra, cada um com sua frase; a mesma tabela duas vezes não gera aviso; na rotina, uma série que voltou menor não é gravada. → Task 7 (testes de `compararIndicesUsados`, inclusive "calcular duas vezes com a mesma tabela: nenhuma diferença") e Tasks 5 e 8 (testes de `compararSeries` e "encolheu numa série…").

---


## Para o responsável: o que esta fase entrega, o que foi decidido e o que foi descoberto

Ao fim da fase, fica pronto o caminho para os índices chegarem ao Apura sozinhos, por uma rotina central no repositório, que passa a rodar quando o repositório estiver no GitHub (fase 7; até lá, a cópia é atualizada à mão com `npm run indices:atualizar`), e o app passa a abrir com a tabela pronta, sem esperar nada e sem acessar nenhum serviço externo. A fase entrega a tabela congelada de cada cálculo com a data real dos índices, o texto do rodapé, os avisos do calendário, a comparação que diz, ao reabrir um cálculo, quais índices usados mudaram, a rotina diária e o seu monitoramento (673 testes passando e 9 pulados, em 23 arquivos; eram 382 passando em 15). Continua sem tela: a interface é a fase 5.

**Decisões de 12/10/2026 (rotina central), registradas no design pela Task 10:**

1. **Rotina central no lugar da busca no navegador.** É a prática consolidada: os tribunais (TJSP, TJMG, TJDFT, o SAJ do TJMS), a Justiça do Trabalho (PJe-Calc, com as tabelas mantidas pelo TRT-2) e a Justiça Federal (CJF) mantêm os índices de forma central, e o usuário só usa a versão publicada; onde o usuário atualiza sozinho (o PJe-Calc instalado), isso é tratado como fonte de erro. Dois defensores que calculam ao mesmo tempo usam a mesma tabela, a publicada, e não a que cada navegador conseguiu baixar.
2. **Três rodadas por dia útil, às 10h47, 14h17 e 22h47 de Brasília,** alinhadas à publicação dos índices: IGP-M às 8h (FGV, fim do mês), IPCA e INPC às 9h (IBGE, dias 9 a 12), taxa legal entre 8h30 e 12h39 do 1º dia útil (BCB), SELIC do dia até as 19h. A das 14h17 pega a taxa legal tardia e a demora do BCB em carregar a série, e serve de reserva da manhã; a das 22h47 pega a SELIC do dia. Minutos "quebrados" porque o GitHub atrasa e descarta execuções no início das horas.
3. **Gravação série por série:** uma série com problema não trava as outras.
4. **Conferências automáticas antes de gravar** (formatação, regras, tipos e testes) e **commit descritivo** como registro histórico.
5. **A SELIC parcial do dia não é tratada como revisão;** o alerta "Atenção" fica para mudança de mês já fechado.
6. **Monitoramento gratuito:** resumo de cada execução, alarme de silêncio no Healthchecks.io e relatório mensal gravado no repositório; ajustes só com o responsável, com os relatórios em mãos.

**Decisões de 11/10/2026 e o que acontece com cada uma:**

| Decisão | Situação |
|---|---|
| D1 · cache no navegador | revogada: não há cache; o app só lê a cópia publicada |
| D2 · a busca pede do último mês conhecido em diante | substituída: a rotina baixa o histórico completo de cada série (assim detecta revisões e série que encolheu) |
| D3 · para o mesmo mês vale o valor obtido mais recentemente | simplificada: só há uma fonte, o arquivo publicado; a rotina avisa valor revisto |
| D4 · horário de Brasília, dito como tal | mantida |
| D5 · tabela congelada na memória; o arquivo guarda o `Resultado` | mantida |
| D6 · aviso de índice mudado por série e mês, com o salário mínimo nomeado | mantida; a mudança agora vem de uma nova publicação do site |
| D7 · calendário com dia aproximado, só para avisos | mantida, com o aviso "ainda não chegou ao Apura" no lugar de "ainda não foi obtido do BCB" |
| D8 · 20 s e uma repetição no navegador | revogada; a rotina usa 30 s, até três tentativas e 2 s de espera |
| D9 · workflow com commit direto na `main` só com as conferências verdes | alterada: três rodadas por dia útil, em vez de uma por mês; as conferências continuam |

**Descobertas de 11 e 12/10/2026 que moldaram o plano (respostas gravadas em `src/indices/testes/`):**

1. **A API do BCB devolve erro disfarçado de sucesso:** intervalo sem dados vem como objeto de erro 404, que às vezes chega com status 200; série inexistente e bloqueio vêm como página HTML com status 200; houve uma página de erro 502 e uma resposta de 9,8 s. Por isso a rotina decide pelo conteúdo e confere tudo antes de gravar.
2. **A API não informa quando carregou cada valor,** e o BCB não documenta quanto tempo leva depois da divulgação oficial (numa amostra, o IPCA entrou em menos de 21 horas). A rodada das 14h17 existe por isso, e o relatório mensal mostrará em que rodada cada índice chegou.
3. **O agendador do GitHub não é pontual.** Num repositório pessoal que baixa séries do BCB, as execuções começaram com atraso típico de três a quatro horas; em outros, de 6 a 46 minutos; e às vezes execuções foram puladas. O monitoramento existe para medir isso desde o primeiro dia.
4. **Os tribunais toleram atraso de zero a um dia útil** e atualizam uma ou duas vezes por mês; a tabela oficial do TRT-2 nem inclui a SELIC do mês corrente.

**Mudanças no motor, as únicas desta fase, e por quê:**

- **Mês parcial da SELIC pela data de obtenção do próprio valor** (`obtidoEm`, a data e hora em que o valor foi baixado do BCB; `src/motor/correcao.ts`). Pendência da fase 2 (fuso): a data é gravada no horário de Brasília, e cada valor diz por si se é parcial. Nenhum teste ou caso existente muda.
- **Avisos "ainda sem divulgação", com a previsão** (`calcular.ts`, `juros.ts`, `base.ts`, usando `src/compartilhado/divulgacao.ts`) quando a tabela traz `esperadoAte` (o último mês que cada série já deveria ter, pelo calendário). Pendência das fases 1 e 3 (§6.4, item 3, e a lacuna no meio da série do salário mínimo). Sem `esperadoAte`, nada muda.

**O que a fase 5 vai chamar (ponto de integração):**

- `congelarIndices()` — síncrona e sem rede: devolve `{ tabela, situacao }` na hora, ao abrir o app e em "Novo cálculo". `situacao.rodape` é o texto do rodapé ("Índices oficiais BCB/SGS · IPCA até set/2026 · atualizados em 09/10/2026 14:17 (horário de Brasília)") e `situacao.avisos` são as frases do calendário para a caixa de avisos ("IPCA de out/2026, divulgado por volta de 10/11/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 09/10/2026.", por exemplo em 16/11/2026, com a cópia ainda de 09/10/2026). Some a dúvida que o plano anterior deixava para a fase 5 (esperar a consulta ou trocar os números enquanto o usuário digita).
- `compararIndicesUsados({ indicesUsados: salvo.indicesUsados, consultadoEm: salvo.consultaIndices.em }, { indicesUsados: novo.indicesUsados, consultadoEm: novo.consultaIndices.em })` — ao abrir um arquivo, a tela recalcula e mostra as frases devolvidas.

**O que você recebe e o que faz, no dia a dia (depois da fase 7):**

- **Nada, quando tudo funciona.** A rotina roda, grava o que mudou e o site se republica.
- **Um e-mail do Healthchecks.io** às 7h do dia seguinte a um dia útil inteiro sem nenhuma rodada bem-sucedida, e outro quando voltar. Uma rodada isolada que falha não gera e-mail do Healthchecks, porque a seguinte cobre; ela aparece em vermelho na página "Actions" do GitHub e no relatório mensal (o GitHub pode mandar o aviso de falha dele, conforme as notificações da conta; a conferir na fase 7).
- **Um relatório por mês** em `docs/monitoramento/AAAA-MM.md`, gerado no dia 2: execuções previstas e realizadas em cada rodada, falhas, atraso de início, dias úteis sem rodada bem-sucedida, cada atualização gravada (com as revisões à parte), consumo estimado das cotas gratuitas e duas referências (nenhum dia útil sem rodada bem-sucedida; atraso típico de até uma hora). Depois de um e de três meses, revisamos juntos e decidimos se muda horário ou agendador.
- **O histórico das atualizações** está no próprio repositório: cada commit do robô diz a rodada, o que chegou ou mudou e o endereço da execução.

**Escolhas técnicas, dentro do que foi decidido:**

- **Rede e relógio entram por parâmetro** nas funções de `src/indices/`, com o valor real como padrão; o disco e o git ficam nos scripts de `scripts/`; nenhum teste usa a rede.
- **A rotina não importa os dados embutidos:** a leitura e a comparação de arquivos de série ficam em `arquivo-serie.ts`, para que o script inicie mesmo com um arquivo de `dados/indices/` faltando (ele o recria) ou corrompido (ele diz qual é e como restaurá-lo).
- **Série sem mudança não é regravada:** a rotina só faz commit quando há dado novo, e a data de obtenção da SELIC parcial não avança sem que o valor tenha mudado.
- **O relatório mensal não manda e-mail nem republica o site:** o commit dele começa com `[CF-Pages-Skip]`, e a pasta `docs/` já é ignorada pelo Prettier.
- **Os segredos só entram nos passos que os usam** (o sinal ao Healthchecks e o deploy hook), e a rotina só grava a partir da `main`, sempre partindo da ponta dela (uma reexecução não parte de um commit antigo), com até três tentativas de envio se outro envio entrar no meio. O sinal de vida sai antes do deploy hook: uma falha das conferências ou da gravação suprime o sinal (é falha da rotina), uma falha do deploy hook não (o Cloudflare avisa por e-mail).
- **A rotina só diz "Ainda não disponível no BCB" quando o BCB respondeu:** série cuja busca falhou fica fora dessa lista, porque o problema já a cita e não se sabe o que o BCB tem.
- **Os testes dos scripts ficam em `scripts/`,** com os tipos do Node; o código do app em `src/` continua sem eles, para não usar por engano recursos que o navegador não tem.
- **Nenhum teste depende dos últimos meses das séries,** que a rotina atualiza: os valores fixados nos testes da cópia embutida são de meses fechados até jan/2026, que o BCB não costuma rever; se rever, as conferências falham, a rotina não grava e a execução fica vermelha.
- **O deploy hook do Cloudflare só é usado se for preciso:** se o commit do robô já publicar o site pela integração do Cloudflare Pages, o segredo não é criado e o passo fica pulado (evita duas publicações por mudança).

**Limites registrados (não resolvidos nesta fase, por decisão):**

- **SELIC parcial com termo final próprio.** Quando um termo final próprio cai antes do dia da consulta, no mesmo mês, o lançamento recebe a SELIC acumulada até a última atualização da rotina: inteira, se o lançamento começou antes desse mês, ou rateada, se começou nele.
- **Mês da SELIC que acabou de fechar.** O mês corrente da SELIC é tratado como parcial até a primeira atualização gravada no mês seguinte (normalmente a rodada noturna do 1º dia útil); só pesa em cálculo com data de elaboração nesse mês fechado, e só em metodologia personalizada com SELIC única até o mês corrente (a padrão do TJMS não usa a SELIC; a SELIC única do Tema 1.368 vale até 29/08/2024).
- **Os dias do calendário são aproximados e têm folga:** IPCA e INPC só são esperados a partir do dia 15 do mês seguinte; IGP-M, a partir do dia 5 do mês seguinte; taxa legal e SELIC parcial, a partir do dia 5 do próprio mês. Entre a divulgação real e esses dias, um mês que falte sai como "ainda sem divulgação", com a previsão já vencida.
- **O GitHub precisa alcançar o BCB.** Isso só pode ser conferido com o repositório no GitHub (fase 7); se não alcançar, a saída é rodar o script à mão num computador da Defensoria e enviar a atualização.
- **O robô grava na `main` quase todo dia útil** (por causa da SELIC): antes de integrar uma fase, é preciso trazer as atualizações dele do GitHub, e o script de índices não deve ser rodado em branches de trabalho.
- **O relatório conta feriados como dias úteis** (o GitHub roda de segunda a sexta sem calendário de feriados; num feriado a rotina roda e encontra "sem mudança").
- **Os dois workflows só podem ser testados com o repositório no GitHub** (fase 7).

**Ensaio:** todo o código deste plano foi executado numa cópia do repositório fora dele, em 11 e 12/10/2026. A parte que não mudou com a rotina central (relógio, calendário, cliente do BCB, arquivos de série e motor) vem do ensaio do plano anterior, já revisado. Os três módulos novos (congelamento sem rede; rotina série por série, com o workflow; relatório mensal, com o workflow) foram escritos por agentes e conferidos por revisores adversariais, que tentaram implementações erradas para ver se os testes as pegavam; as falhas de cobertura que eles acharam viraram testes. Depois, a fase foi reconstruída tarefa por tarefa a partir da main: cada um dos nove estados de código passa em `npm run verificar` com as contagens indicadas em cada tarefa, o estado final é idêntico ao do ensaio, `npm run build` gera `dist/`, e os passos "ver falhar" foram simulados (as listas de testes que falham em cada tarefa são as medidas). Também foi simulado o que o robô fará nos dados (dois meses novos e dois valores revistos em cada série, datas no horário de Brasília): as conferências continuam verdes. O script da rotina foi rodado contra o BCB em cópias de rascunho, em 12/10/2026: a partir dos arquivos de 11/10/2026, disse "sem mudança" para as seis séries, em cerca de 1 s, e não tocou em nenhum arquivo; com um valor de set/2026 alterado à mão no IPCA, o arquivo da taxa legal apagado e o do IGP-M corrompido, regravou o IPCA com o aviso "Atenção: na série 433 mudou 1 valor já publicado: 2026-09 de 0.80 para 0.82.", recriou a taxa legal (as duas com a data de obtenção no horário de Brasília), deixou o IGP-M como estava, disse como restaurá-lo e saiu com código 1. Os dois workflows foram conferidos por leitura, pelo Prettier e pela simulação dos trechos de shell; só podem ser executados no GitHub (fase 7). Por fim, o texto do plano passou por uma revisão adversarial em três frentes (coerência com o código, os dois workflows e o fechamento); os achados foram corrigidos (entre eles, os workflows passaram a partir sempre da ponta da `main` e a repetir o envio se outro entrar no meio), e a reconstrução e a aplicação ao pé da letra foram refeitas.

Depende de internet: o `npm install` inicial e o último passo da Task 8 (`npm run indices:atualizar`). Os testes e todo o resto rodam sem rede.


---

## Estrutura de arquivos desta fase

| Arquivo | Responsabilidade |
|---|---|
| `src/compartilhado/tipos.ts` | `TabelaIndices.esperadoAte` (opcional); documentação de `ValorIndice.obtidoEm` (horário de Brasília; mês parcial da SELIC) |
| `src/compartilhado/decimal.ts` | `textoDecimalValido` e `decimalOuNulo` aceitam `unknown` (recusam o que não é texto) |
| `src/compartilhado/divulgacao.ts` (novo) | `divulgacaoPrevista` (texto da previsão de cada mês) e `aindaNaoDivulgado` (regra pela tabela), usados pelo motor e pelos índices |
| `src/indices/testes/sgs-*.json`, `sgs-*.html` (novos) | oito respostas reais do SGS gravadas em 11/10/2026: intervalo com `dataInicial`, `ultimos/3` decrescente (com a SELIC parcial), salário mínimo futuro, erros 404 e 400 em JSON, HTML de série inexistente e página de erro 502 |
| `src/indices/testes/execucoes-rotina.json` (novo) | lista sintética de execuções no formato da API do GitHub, para o relatório mensal |
| `src/indices/cliente-bcb.ts` | `ehValorMensalValido`, `interpretarErroSgs`, `buscarSerie` (tempo-limite, repetição, decisão pelo corpo), usada pela rotina |
| `src/indices/relogio.ts` (novo) | `agoraEmBrasilia`, `hojeEmBrasilia`, `formatarDataHoraBrasilia`, `dataHoraEmBrasilia`, `compararInstantes`: único lugar que lê `Date` |
| `src/indices/calendario.ts` (novo) | `SERIES_EM_ORDEM_NUMERICA`, `ultimoMesEsperado`, `esperadoAte`, `mesesAtrasados`, `agruparAtrasados` |
| `src/indices/arquivo-serie.ts` (novo) | `lerArquivoSerie` (confere cada item) e `compararSeries` (série que encolheu, valores alterados, meses novos), sem importar os dados embutidos |
| `src/indices/embutidos.ts` | `seriesEmbutidas` (os seis arquivos conferidos) e `tabelaEmbutida` |
| `src/indices/congelar.ts` (novo) | `montarTabela`, `descreverSituacao`, `congelarIndices` (ponto de integração da fase 5, síncrono e sem rede), `compararIndicesUsados` |
| `src/motor/correcao.ts` | mês parcial da SELIC pelo `obtidoEm` do valor |
| `src/motor/calcular.ts`, `juros.ts`, `base.ts` | avisos "ainda sem divulgação" (com a previsão) quando a tabela traz `esperadoAte`, e, no salário mínimo, "não consta na tabela" para buraco de dados; resumos separados |
| `src/indices/atualizacao.ts` (novo) | orquestração da rotina, testável sem rede: `seriesPedidas`, `atualizarSeries` (baixa tudo, decide e grava série por série; SELIC parcial × revisão; meses atrasados) |
| `scripts/atualizar-indices.ts` (reescrito) | só argumentos, disco e console; código de saída 1 quando alguma série tem problema (as outras já foram gravadas) ou o código pedido é desconhecido |
| `.github/workflows/atualizar-indices.yml` (novo) | rotina de segunda a sexta às 10h47, 14h17 e 22h47 de Brasília: baixa, resume, confere, grava na `main`, dá sinal ao Healthchecks e publica pelo deploy hook (se houver) |
| `src/indices/relatorio.ts` (novo) | relatório mensal, testável sem rede: `lerExecucoes`, `rodadaDoTitulo`, `horarioAgendado`, `lerAtualizacoes`, `montarRelatorio` |
| `scripts/relatorio-indices.ts` e `scripts/relatorio-indices.test.ts` (novos), `package.json` (script `indices:relatorio`) e `vite.config.ts` (os testes de `scripts/` passam a rodar) | lê as execuções e o `git log` e grava `docs/monitoramento/AAAA-MM.md`; o teste usa um repositório git temporário |
| `.github/workflows/relatorio-indices.yml` (novo) | relatório mensal no dia 2, gravado no repositório sem republicar o site |
| `dados/indices/*.json` | regravados pela rotina só nas séries que mudarem (obtidoEm no horário de Brasília) |
| `docs/superpowers/roteiro.md`, `CLAUDE.md`, design (§3.1, §4.1, §4.2, §4.3, §5.1, §5.4, §5.5, §6.3, §8, §10.4, §11, §12.2, §12.3, §13, §14, §15, §16), `README.md` | fechamento da fase |

## Como executar este plano

- Todos os comandos rodam na raiz do repositório, numa branch de trabalho (`superpowers:using-git-worktrees`). Antes de tudo: `npm install` (precisa de internet).
- Uma tarefa de cada vez, na ordem. Ciclo de cada regra: escrever o teste → rodar e vê-lo falhar (o passo diz exatamente quais testes devem falhar; se outro falhar ou se um deles passar sem o código, pare e relate) → escrever o código → rodar e ver passar → `npm run format && npm run verificar` → commit. Só se commita com tudo verde.
- Nenhum teste acessa a rede. As respostas do BCB usadas nos testes são as gravadas em `src/indices/testes/`; `fetch`, disco e relógio são injetados. Se um teste parecer exigir rede, a implementação está errada.
- Todo o código deste plano foi executado numa cópia do repositório fora dele (ver "Ensaio" em "Para o responsável"). Se uma implementação não bater com o esperado de um passo, pare e relate; não ajuste expectativas para "fazer passar".
- O Prettier pode reformatar o que foi escrito (quebras de linha); o conteúdo não muda. `src/indices/testes/`, `src/motor/casos/*.json`, `dados/` e `docs/` são ignorados pelo Prettier de propósito.
- Arquivos marcados "reescrito" são substituídos por inteiro pelo conteúdo do passo; os demais recebem as edições indicadas, com o texto antigo e o novo.
- Os dois workflows (`.github/workflows/`) são conferidos por leitura e pelo Prettier; só podem ser executados com o repositório no GitHub (fase 7).
- Relatórios de subagentes vão em `.txt` (eles não gravam `.md`); o hook de gravação pode recusar caminhos com acento (a pasta "DEFENSORIA PÚBLICA"): grave por heredoc no shell.
- Mensagens de commit no formato "módulo: o que muda", com a linha de coautoria do modelo em uso ao final.

---


### Task 1: Fundação: tabela com calendário, texto decimal checado, erro do SGS reconhecido e respostas reais gravadas

**Files:**
- Create: `src/indices/testes/sgs-433-desde-set-2026.json`, `sgs-433-desde-ago-2026.json`, `sgs-4390-ultimos-3.json`, `sgs-1619-desde-dez-2026.json`, `sgs-erro-404-sem-valores.json`, `sgs-erro-400-data-invalida.json`, `sgs-serie-inexistente.html`, `sgs-erro-502.html`
- Modify: `src/compartilhado/tipos.ts`, `src/compartilhado/decimal.ts`, `src/indices/cliente-bcb.ts`
- Test: `src/compartilhado/decimal.test.ts`, `src/indices/cliente-bcb.test.ts`

**Interfaces:**
- Consome: `competenciaValida` (datas.ts), `textoDecimalValido` (decimal.ts), `ValorMensal` (cliente-bcb.ts), tipos `TabelaIndices`, `ValorIndice`, `ArquivoSerie`.
- Produz:
  - `TabelaIndices.esperadoAte?: Partial<Record<CodigoSerie, Competencia>>` — último mês que cada série deveria ter na data da consulta, pelo calendário (preenchido pela Task 7; lido pelo motor na Task 6).
  - `textoDecimalValido(texto: unknown): texto is TextoDecimal` e `decimalOuNulo(texto: unknown): Decimal | null` — recusam o que não é texto.
  - `ehValorMensalValido(item: unknown): item is ValorMensal` — item `{ competencia, valor }` válido (Task 5).
  - `interface ErroSgs { statusCode: number; detail: string }` e `interpretarErroSgs(texto: string): ErroSgs | null` — reconhece o objeto de erro do SGS (Task 4).
  - As oito respostas gravadas, importadas com `?raw` pelos testes (Tasks 4 e 8).

Fatos novos verificados em 11/10/2026 pelo navegador integrado, que estas respostas registram: intervalo sem dados devolve um objeto de erro 404 em JSON (não lista vazia), e o cache do navegador o devolve com status 200; data inválida devolve 400 em JSON; série inexistente devolve HTML com status 200; o BCB às vezes responde uma página de erro 502. As duas páginas HTML foram encurtadas ao início da página real (cabeçalho e título), porque os testes só precisam saber que não é JSON.

- [ ] **Step 1: Gravar as respostas reais do SGS**

Cada arquivo JSON tem uma linha só, exatamente como o BCB respondeu (a pasta `src/indices/testes/` é ignorada pelo Prettier).

`src/indices/testes/sgs-433-desde-set-2026.json` (`…bcdata.sgs.433/dados?formato=json&dataInicial=01/09/2026`):
```json
[{"data":"01/09/2026","valor":"0.82"}]
```

`src/indices/testes/sgs-433-desde-ago-2026.json` (`dataInicial=01/08/2026`):
```json
[{"data":"01/08/2026","valor":"-0.32"},{"data":"01/09/2026","valor":"0.82"}]
```

`src/indices/testes/sgs-4390-ultimos-3.json` (`…bcdata.sgs.4390/dados/ultimos/3?formato=json`; em ordem decrescente, como o BCB devolve):
```json
[{"data":"01/10/2026","valor":"0.36"},{"data":"01/09/2026","valor":"1.08"},{"data":"01/08/2026","valor":"1.09"}]
```

`src/indices/testes/sgs-1619-desde-dez-2026.json` (`dataInicial=01/12/2026`, mês futuro já publicado):
```json
[{"data":"01/12/2026","valor":"1621.00"}]
```

`src/indices/testes/sgs-erro-404-sem-valores.json` (`…bcdata.sgs.433/dados?formato=json&dataInicial=01/11/2026`, status 404 pelo terminal; status 200 quando o navegador serve do cache):
```json
{"erro":{"statusCode":404,"detail":"br.gov.bcb.pec.sgs.comum.excecoes.SGSNegocioException: Value(s) not found"}}
```

`src/indices/testes/sgs-erro-400-data-invalida.json` (`dataInicial=31/02/2026`, status 400):
```json
{"erro":{"statusCode":400,"detail":"br.gov.bcb.pec.sgs.comum.excecoes.SGSNegocioException: Invalid initial date"}}
```

`src/indices/testes/sgs-serie-inexistente.html` (`…bcdata.sgs.999999/dados?formato=json`, status 200 após 30 s; início da página real):
```html
<?xml version="1.0" encoding="pt-br"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt-br" xml:lang="pt-br">
<head>
<title>Requisição inválida!</title>
<link rev="made" />
<style>
	a:link    {color:#0036D7; text-decoration: none;}		/* #4D749F */
	a:hover   {color:#3366ff;}
```

`src/indices/testes/sgs-erro-502.html` (status 502, `content-type: text/html`; início da página real de erro do BCB):
```html
<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Banco Central do Brasil</title>
</head>
<body>
<header>
<h1 class="logo">Banco Central do Brasil</h1>
</header>
<div id="menu"></div>
<section class="content">
<div class="container">
<h2 class="cormorant">Requisição inválida</h2>
            <p>Seu "browser" (ou o servidor proxy) enviou uma requisição inválida ao servidor.</p>
```

- [ ] **Step 2: Escrever os testes**

Em `src/compartilhado/decimal.test.ts`, dentro de `describe("texto decimal válido", …)`, depois do teste "aceita dígitos com ponto decimal e sinal…", acrescente:

```ts
  it("recusa o que não é texto (número, nulo, objeto): dados de arquivo e de rede chegam como unknown", () => {
    for (const naoTexto of [451.91, 0, null, undefined, {}, [], true]) {
      expect(textoDecimalValido(naoTexto), String(naoTexto)).toBe(false);
      expect(decimalOuNulo(naoTexto), String(naoTexto)).toBeNull();
    }
  });
```

Em `src/indices/cliente-bcb.test.ts`, troque a importação do cliente por

```ts
import {
  ehValorMensalValido,
  interpretarErroSgs,
  interpretarRespostaSgs,
  montarArquivoSerie,
  RespostaSgsInvalida,
} from "./cliente-bcb.ts";
```

e, antes de `describe("montarArquivoSerie", …)`, acrescente:

```ts
describe("interpretarErroSgs", () => {
  it("reconhece o objeto de erro do SGS (404 sem valores, 400 data inválida) e ignora o resto", () => {
    expect(
      interpretarErroSgs(
        '{"erro":{"statusCode":404,"detail":"br.gov.bcb.pec.sgs.comum.excecoes.SGSNegocioException: Value(s) not found"}}',
      ),
    ).toEqual({
      statusCode: 404,
      detail: "br.gov.bcb.pec.sgs.comum.excecoes.SGSNegocioException: Value(s) not found",
    });
    expect(interpretarErroSgs('{"erro":{"statusCode":400}}')).toEqual({
      statusCode: 400,
      detail: "",
    });
    expect(interpretarErroSgs('[{"data":"01/01/2017","valor":"0.64"}]')).toBeNull();
    expect(interpretarErroSgs("<!DOCTYPE html>")).toBeNull();
    expect(interpretarErroSgs('{"erro":"texto"}')).toBeNull();
    expect(interpretarErroSgs("{")).toBeNull();
  });
});

describe("ehValorMensalValido", () => {
  it("aceita competência válida com valor em texto decimal; recusa mês 13, valor numérico e chave ausente", () => {
    expect(ehValorMensalValido({ competencia: "2017-01", valor: "0.64" })).toBe(true);
    expect(ehValorMensalValido({ competencia: "2017-13", valor: "0.64" })).toBe(false);
    expect(ehValorMensalValido({ competencia: "2017-01", valor: 0.64 })).toBe(false);
    expect(ehValorMensalValido({ competencia: "2017-01", valor: "0,64" })).toBe(false);
    expect(ehValorMensalValido({ competencia: "2017-01" })).toBe(false);
    expect(ehValorMensalValido(null)).toBe(false);
    expect(ehValorMensalValido("2017-01")).toBe(false);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Execute: `npm test -- src/compartilhado/decimal.test.ts src/indices/cliente-bcb.test.ts`
Esperado: falham exatamente três testes e passam dezesseis: "recusa o que não é texto…" (a expressão regular aceita `451.91` convertido em texto e `decimalOuNulo` devolve um `Decimal`), "reconhece o objeto de erro do SGS…" (`interpretarErroSgs is not a function`) e "aceita competência válida com valor em texto decimal…" (`ehValorMensalValido is not a function`).

- [ ] **Step 4: Escrever o código**

Em `src/compartilhado/decimal.ts`, substitua as duas funções do fim do arquivo por:

```ts
/**
 * Texto decimal que o motor aceita: dígitos com ponto decimal e sinal opcionais ("451.91", "-1.10",
 * "30"). Recusa vírgula, vazio, espaços, "NaN", "Infinity", notação com expoente e qualquer coisa
 * que não seja texto (número, nulo, objeto): dados de arquivo e respostas do BCB chegam
 * como `unknown`.
 */
export function textoDecimalValido(texto: unknown): texto is TextoDecimal {
  return typeof texto === "string" && FORMATO_TEXTO_DECIMAL.test(texto);
}

/** `Decimal` do texto quando ele é válido; `null` caso contrário (o motor avisa em vez de lançar erro). */
export function decimalOuNulo(texto: unknown): Decimal | null {
  return textoDecimalValido(texto) ? new Decimal(texto) : null;
}
```

Em `src/compartilhado/tipos.ts`, substitua `ValorIndice` e `TabelaIndices` por:

```ts
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
```

e, em `ArquivoSerie`, anote o campo `obtidoEm` com `/** data-hora ISO da obtenção no BCB, no horário de Brasília desde a fase 4 */`.

Em `src/indices/cliente-bcb.ts`, acrescente no topo as importações

```ts
import { competenciaValida } from "../compartilhado/datas.ts";
import { textoDecimalValido } from "../compartilhado/decimal.ts";
```

e, logo depois de `export interface ValorMensal { … }`, as duas funções:

```ts
/** Um item de série como gravado em arquivo: competência "AAAA-MM" válida e valor em texto decimal. */
export function ehValorMensalValido(item: unknown): item is ValorMensal {
  if (typeof item !== "object" || item === null) return false;
  const { competencia, valor } = item as { competencia?: unknown; valor?: unknown };
  return (
    typeof competencia === "string" && competenciaValida(competencia) && textoDecimalValido(valor)
  );
}

export interface ErroSgs {
  statusCode: number;
  detail: string;
}

/**
 * Objeto de erro do SGS, `{"erro":{"statusCode":404,"detail":"…Value(s) not found"}}` (intervalo sem
 * dados, data inválida); qualquer outro texto devolve null. O status HTTP não basta: esse corpo já
 * chegou com status 200, servido de cache (verificado em 11/10/2026).
 */
export function interpretarErroSgs(texto: string): ErroSgs | null {
  const aparado = texto.trim();
  if (!aparado.startsWith("{")) return null;
  try {
    const dados = JSON.parse(aparado) as { erro?: { statusCode?: unknown; detail?: unknown } };
    const erro = dados.erro;
    if (typeof erro !== "object" || erro === null || typeof erro.statusCode !== "number")
      return null;
    return {
      statusCode: erro.statusCode,
      detail: typeof erro.detail === "string" ? erro.detail : "",
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Execute: `npm run format && npm run verificar`
Esperado: tudo verde; 15 arquivos de teste, 385 passando | 9 pulados (394).

- [ ] **Step 6: Commit**

```bash
git add src/compartilhado/tipos.ts src/compartilhado/decimal.ts src/compartilhado/decimal.test.ts src/indices/cliente-bcb.ts src/indices/cliente-bcb.test.ts src/indices/testes/
git commit -m "indices: fundação da fase 4 (esperadoAte, texto decimal checado, erro do SGS, respostas reais gravadas)

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```


### Task 2: Relógio de Brasília: data-hora da obtenção, data de hoje, formatação e comparação por instante

**Files:**
- Create: `src/indices/relogio.ts`
- Test: `src/indices/relogio.test.ts`

**Interfaces:**
- Consome: `dataValida` (datas.ts), tipo `DataISO`.
- Produz:
  - `agoraEmBrasilia(instante: Date = new Date()): string` — "2026-10-11T14:02:00-03:00" (segundos inteiros; deslocamento lido do `Intl`, "-03:00" só como reserva). Usada pela rotina (Task 8); `relogio.ts` é o único arquivo de `src/indices/` com `new Date()`.
  - `hojeEmBrasilia(instante?: Date): DataISO` — "2026-10-11" (Task 7).
  - `formatarDataHoraBrasilia(iso: string): string` — "11/10/2026 14:02" a partir de qualquer ISO com "Z" ou deslocamento; texto que não seja ISO de data-hora volta como veio (Task 7 e fase 6).
  - `dataHoraEmBrasilia(iso: string): { data: DataISO; hora: string } | null` — "2026-11-01T01:30:00Z" → `{ data: "2026-10-31", hora: "22:30" }`; null para texto que não seja ISO de data-hora com fuso. É o que usa quem precisa do dia ou do mês em Brasília sem depender do formato de tela (Tasks 7, 8 e 9).
  - `compararInstantes(a: string, b: string): number` — compara pelo instante, não pelo texto: "2026-10-11T23:11:55.140Z" (UTC, cópia embutida de antes da fase 4) é anterior a "2026-10-11T20:30:00-03:00" (Tasks 5 e 7).

Por que existe: a decisão D4 (11/10/2026) manda gravar e exibir a data-hora no horário de Brasília, porque o BCB publica por esse calendário; a rodada das 22h47 roda depois da meia-noite em UTC, às 23:30 de 31/10 em Campo Grande já é 1/11 em Brasília, e o mês parcial da SELIC segue Brasília. Tudo que lê o relógio ou converte fuso fica aqui, para que o resto de `src/indices/` receba a data por parâmetro.

- [ ] **Step 1: Escrever o teste**

Crie `src/indices/relogio.test.ts` (25 testes):

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { competenciaDe } from "../compartilhado/datas.ts";
import {
  agoraEmBrasilia,
  dataHoraEmBrasilia,
  formatarDataHoraBrasilia,
  hojeEmBrasilia,
  compararInstantes,
} from "./relogio.ts";

const FORMATO_ISO_COM_DESLOCAMENTO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;

describe("relógio de Brasília", () => {
  describe("agoraEmBrasilia", () => {
    it("converte 23:30 de Campo Grande (UTC−4) para 00:30 do dia seguinte em Brasília", () => {
      expect(agoraEmBrasilia(new Date("2026-10-31T23:30:00-04:00"))).toBe(
        "2026-11-01T00:30:00-03:00",
      );
    });

    it("converte um instante dado em UTC", () => {
      expect(agoraEmBrasilia(new Date("2026-10-11T17:02:00Z"))).toBe("2026-10-11T14:02:00-03:00");
    });

    it("descarta os milissegundos e mantém os segundos inteiros", () => {
      expect(agoraEmBrasilia(new Date("2026-10-11T17:02:33.999Z"))).toBe(
        "2026-10-11T14:02:33-03:00",
      );
    });

    it("escreve a meia-noite como 00, nunca 24", () => {
      expect(agoraEmBrasilia(new Date("2026-10-12T03:00:00Z"))).toBe("2026-10-12T00:00:00-03:00");
    });

    it("volta ao ano anterior quando o UTC já virou o ano", () => {
      expect(agoraEmBrasilia(new Date("2027-01-01T01:30:00Z"))).toBe("2026-12-31T22:30:00-03:00");
    });

    it("tira o deslocamento do Intl: no horário de verão de 2018, Brasília era UTC−2", () => {
      expect(agoraEmBrasilia(new Date("2018-12-25T12:00:00Z"))).toBe("2018-12-25T10:00:00-02:00");
    });

    it("competenciaDe sobre o resultado dá o mês de Brasília, não o do fuso de origem", () => {
      expect(competenciaDe(agoraEmBrasilia(new Date("2026-10-31T23:30:00-04:00")))).toBe("2026-11");
      expect(competenciaDe(agoraEmBrasilia(new Date("2026-11-01T02:59:59Z")))).toBe("2026-10");
      expect(competenciaDe(agoraEmBrasilia(new Date("2026-11-01T03:00:00Z")))).toBe("2026-11");
    });

    it("sem argumento, lê o relógio e devolve ISO com segundos e deslocamento", () => {
      expect(agoraEmBrasilia()).toMatch(FORMATO_ISO_COM_DESLOCAMENTO);
    });

    it("recusa um instante inválido com mensagem em português", () => {
      expect(() => agoraEmBrasilia(new Date("x"))).toThrow("Instante inválido");
    });
  });

  describe("hojeEmBrasilia", () => {
    it("dá a data de Brasília mesmo quando o UTC ainda está no dia anterior ou já no seguinte", () => {
      expect(hojeEmBrasilia(new Date("2026-10-31T23:30:00-04:00"))).toBe("2026-11-01");
      expect(hojeEmBrasilia(new Date("2026-10-11T17:02:00Z"))).toBe("2026-10-11");
      expect(hojeEmBrasilia(new Date("2026-10-12T02:59:59Z"))).toBe("2026-10-11");
      expect(hojeEmBrasilia(new Date("2026-10-12T03:00:00Z"))).toBe("2026-10-12");
    });

    it("sem argumento, lê o relógio e devolve AAAA-MM-DD", () => {
      expect(hojeEmBrasilia()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("formatarDataHoraBrasilia", () => {
    it("converte ISO em UTC com milissegundos para dd/mm/aaaa hh:mm de Brasília", () => {
      expect(formatarDataHoraBrasilia("2026-10-11T23:11:55.140Z")).toBe("11/10/2026 20:11");
    });

    it("mantém a hora de um ISO já em Brasília", () => {
      expect(formatarDataHoraBrasilia("2026-10-11T14:02:00-03:00")).toBe("11/10/2026 14:02");
    });

    it("converte ISO com outros deslocamentos, inclusive virando o dia", () => {
      expect(formatarDataHoraBrasilia("2026-10-31T23:30:00-04:00")).toBe("01/11/2026 00:30");
      expect(formatarDataHoraBrasilia("2026-10-11T18:02:00+01:00")).toBe("11/10/2026 14:02");
      expect(formatarDataHoraBrasilia("2027-01-01T01:30:00Z")).toBe("31/12/2026 22:30");
    });

    it("aceita ISO sem segundos", () => {
      expect(formatarDataHoraBrasilia("2026-10-11T14:02-03:00")).toBe("11/10/2026 14:02");
    });

    it("devolve o texto original quando não é ISO de data-hora válido", () => {
      expect(formatarDataHoraBrasilia("x")).toBe("x");
      expect(formatarDataHoraBrasilia("")).toBe("");
      expect(formatarDataHoraBrasilia("11/10/2026 14:02")).toBe("11/10/2026 14:02");
      expect(formatarDataHoraBrasilia("2026-13-45T00:00:00Z")).toBe("2026-13-45T00:00:00Z");
      expect(formatarDataHoraBrasilia("2026-02-30T00:00:00Z")).toBe("2026-02-30T00:00:00Z");
      expect(formatarDataHoraBrasilia("2026-10-11T24:00:00Z")).toBe("2026-10-11T24:00:00Z");
    });

    it("não adivinha o fuso: só data ou data-hora sem deslocamento voltam como estão", () => {
      expect(formatarDataHoraBrasilia("2026-10-11")).toBe("2026-10-11");
      expect(formatarDataHoraBrasilia("2026-10-11T14:02:00")).toBe("2026-10-11T14:02:00");
    });

    it("fecha o ciclo com agoraEmBrasilia", () => {
      const iso = agoraEmBrasilia(new Date("2026-10-11T17:02:00Z"));
      expect(formatarDataHoraBrasilia(iso)).toBe("11/10/2026 14:02");
    });
  });

  describe("dataHoraEmBrasilia", () => {
    it("dá a data e a hora em Brasília, virando o dia e o mês pelo fuso", () => {
      expect(dataHoraEmBrasilia("2026-11-01T01:30:00Z")).toEqual({
        data: "2026-10-31",
        hora: "22:30",
      });
      expect(dataHoraEmBrasilia("2026-10-31T23:30:00-04:00")).toEqual({
        data: "2026-11-01",
        hora: "00:30",
      });
    });

    it("mantém a data e a hora de um ISO já em Brasília", () => {
      expect(dataHoraEmBrasilia("2026-10-11T14:02:59-03:00")).toEqual({
        data: "2026-10-11",
        hora: "14:02",
      });
    });

    it("devolve null para o que não é ISO de data-hora válido com fuso", () => {
      expect(dataHoraEmBrasilia("x")).toBeNull();
      expect(dataHoraEmBrasilia("2026-10-11")).toBeNull();
      expect(dataHoraEmBrasilia("2026-10-11T14:02:00")).toBeNull();
      expect(dataHoraEmBrasilia("2026-02-30T00:00:00Z")).toBeNull();
    });
  });

  describe("quando o ambiente não sabe informar o deslocamento", () => {
    const Original = Intl.DateTimeFormat;

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("usa -03:00 como reserva e mantém a hora de Brasília calculada pelo Intl", () => {
      class SemLongOffset {
        constructor(locale?: string | string[], opcoes?: Intl.DateTimeFormatOptions) {
          if (opcoes?.timeZoneName !== undefined) {
            throw new RangeError(
              "Value longOffset out of range for Intl.DateTimeFormat options property timeZoneName",
            );
          }
          return new Original(locale, opcoes);
        }
      }
      vi.stubGlobal("Intl", Object.assign(Object.create(Intl), { DateTimeFormat: SemLongOffset }));

      expect(agoraEmBrasilia(new Date("2026-10-11T17:02:00Z"))).toBe("2026-10-11T14:02:00-03:00");
      expect(hojeEmBrasilia(new Date("2026-10-31T23:30:00-04:00"))).toBe("2026-11-01");
      expect(formatarDataHoraBrasilia("2026-10-11T23:11:55.140Z")).toBe("11/10/2026 20:11");
      // A hora é a certa (UTC−2 no verão de 2018); só o deslocamento escrito é o de reserva.
      expect(agoraEmBrasilia(new Date("2018-12-25T12:00:00Z"))).toBe("2018-12-25T10:00:00-03:00");
    });

    it("sem o fuso America/Sao_Paulo no Intl, calcula com UTC−3 fixo em vez de falhar", () => {
      class SemFuso {
        constructor() {
          throw new RangeError("Invalid time zone specified: America/Sao_Paulo");
        }
      }
      vi.stubGlobal("Intl", Object.assign(Object.create(Intl), { DateTimeFormat: SemFuso }));

      expect(agoraEmBrasilia(new Date("2026-10-11T17:02:00Z"))).toBe("2026-10-11T14:02:00-03:00");
      expect(agoraEmBrasilia(new Date("2026-10-31T23:30:00-04:00"))).toBe(
        "2026-11-01T00:30:00-03:00",
      );
      expect(hojeEmBrasilia(new Date("2026-10-12T02:59:59Z"))).toBe("2026-10-11");
      expect(formatarDataHoraBrasilia("2026-10-11T23:11:55.140Z")).toBe("11/10/2026 20:11");
    });
  });
});

describe("compararInstantes", () => {
  it("compara pelo instante, não pelo texto: UTC das 23:11 é anterior a Brasília das 20:30 do mesmo dia", () => {
    expect(compararInstantes("2026-10-11T23:11:55.140Z", "2026-10-11T20:30:00-03:00")).toBe(-1);
    expect(compararInstantes("2026-10-11T20:30:00-03:00", "2026-10-11T23:11:55.140Z")).toBe(1);
    // mesmo instante escrito de duas formas
    expect(compararInstantes("2026-10-11T23:11:55Z", "2026-10-11T20:11:55-03:00")).toBe(0);
    // ordem alfabética e cronológica coincidem quando o deslocamento é o mesmo
    expect(compararInstantes("2026-10-25T09:00:00-03:00", "2026-10-11T20:11:55-03:00")).toBe(1);
  });

  it("texto que não é ISO de data-hora com fuso cai na comparação textual, sem lançar", () => {
    expect(compararInstantes("x", "2026-10-11T20:30:00-03:00")).toBe(1);
    expect(compararInstantes("2026-10-11", "2026-10-12")).toBe(-1);
    expect(compararInstantes("", "")).toBe(0);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Execute: `npm test -- src/indices/relogio.test.ts`
Esperado: o arquivo de teste falha ao carregar ("Cannot find module './relogio.ts'"); nenhum teste roda.

- [ ] **Step 3: Escrever o código**

Crie `src/indices/relogio.ts`:

```ts
import { dataValida } from "../compartilhado/datas.ts";
import type { DataISO } from "../compartilhado/tipos.ts";

/**
 * Único lugar de `src/indices` que lê o relógio e converte fusos. Tudo sai no horário de Brasília
 * (decisão D4 de 11/10/2026): o deslocamento vem do `Intl` (Brasília não tem horário de verão
 * desde 2019, mas datas antigas o tiveram), e "-03:00" é só a reserva para um ambiente que não
 * saiba informá-lo. Nenhuma biblioteca de datas.
 */

const FUSO_BRASILIA = "America/Sao_Paulo";
/** Deslocamento de Brasília desde 2019, usado só quando o `Intl` não informa o seu. */
const DESLOCAMENTO_RESERVA = "-03:00";
const MILISSEGUNDOS_DA_RESERVA = -3 * 60 * 60 * 1000;

/** Só data-hora ISO completa, com "Z" ou deslocamento; sem fuso não há como converter. */
const FORMATO_ISO_DATA_HORA =
  /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

interface PartesBrasilia {
  ano: string;
  mes: string;
  dia: string;
  hora: string;
  minuto: string;
  segundo: string;
  /** "-03:00" (ou "-02:00" nos verões antigos) */
  deslocamento: string;
}

function doisDigitos(valor: number): string {
  return String(valor).padStart(2, "0");
}

/** Lê as partes pelo `Intl`; `comDeslocamento` pede também o "GMT-03:00" (`longOffset`). */
function partesPeloIntl(instante: Date, comDeslocamento: boolean): PartesBrasilia {
  const formatador = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO_BRASILIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    ...(comDeslocamento ? { timeZoneName: "longOffset" as const } : {}),
  });
  const partes = new Map<string, string>();
  for (const { type, value } of formatador.formatToParts(instante)) partes.set(type, value);
  const deslocamento =
    /^GMT([+-]\d{2}:\d{2})$/.exec(partes.get("timeZoneName") ?? "")?.[1] ?? DESLOCAMENTO_RESERVA;
  return {
    ano: partes.get("year") ?? "",
    mes: partes.get("month") ?? "",
    dia: partes.get("day") ?? "",
    hora: partes.get("hour") ?? "",
    minuto: partes.get("minute") ?? "",
    segundo: partes.get("second") ?? "",
    deslocamento,
  };
}

/** Reserva para um `Intl` que nem conheça o fuso: aritmética com UTC−3 fixo. */
function partesPelaReserva(instante: Date): PartesBrasilia {
  const deslocado = new Date(instante.getTime() + MILISSEGUNDOS_DA_RESERVA);
  return {
    ano: String(deslocado.getUTCFullYear()).padStart(4, "0"),
    mes: doisDigitos(deslocado.getUTCMonth() + 1),
    dia: doisDigitos(deslocado.getUTCDate()),
    hora: doisDigitos(deslocado.getUTCHours()),
    minuto: doisDigitos(deslocado.getUTCMinutes()),
    segundo: doisDigitos(deslocado.getUTCSeconds()),
    deslocamento: DESLOCAMENTO_RESERVA,
  };
}

function partesEmBrasilia(instante: Date): PartesBrasilia {
  if (Number.isNaN(instante.getTime())) {
    throw new Error("Instante inválido: não há como convertê-lo para o horário de Brasília.");
  }
  try {
    return partesPeloIntl(instante, true);
  } catch {
    try {
      return partesPeloIntl(instante, false);
    } catch {
      return partesPelaReserva(instante);
    }
  }
}

/** Data-hora ISO em Brasília, segundos inteiros, sem milissegundos: "2026-10-11T14:02:00-03:00". */
export function agoraEmBrasilia(instante: Date = new Date()): string {
  const p = partesEmBrasilia(instante);
  return `${p.ano}-${p.mes}-${p.dia}T${p.hora}:${p.minuto}:${p.segundo}${p.deslocamento}`;
}

/** Data de hoje em Brasília: "2026-10-11". */
export function hojeEmBrasilia(instante: Date = new Date()): DataISO {
  const p = partesEmBrasilia(instante);
  return `${p.ano}-${p.mes}-${p.dia}`;
}

/** Milissegundos desde a época para um ISO de data-hora com fuso; nulo para qualquer outro texto. */
function instanteDe(iso: string): number | null {
  if (!FORMATO_ISO_DATA_HORA.test(iso)) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Compara duas datas-hora ISO pelo instante que designam (negativo, zero ou positivo), e não pelo
 * texto: "2026-10-11T23:11:55.140Z" (UTC, como nos arquivos anteriores à fase 4) é ANTERIOR a
 * "2026-10-11T20:30:00-03:00" (Brasília), embora venha depois na ordem alfabética. É a comparação
 * que acha a obtenção mais recente entre arquivos gravados em fusos diferentes. Texto que não seja ISO de
 * data-hora com fuso cai na comparação textual, para nunca lançar.
 */
export function compararInstantes(a: string, b: string): number {
  const ia = instanteDe(a);
  const ib = instanteDe(b);
  if (ia !== null && ib !== null) return ia === ib ? 0 : ia < ib ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Data ("2026-10-31") e hora ("22:30") em Brasília de qualquer ISO de data-hora com "Z" ou
 * deslocamento; null para texto que não seja ISO válido (ou sem fuso). É a base de quem precisa
 * do dia ou do mês em Brasília (o mês parcial da SELIC na rotina, o dia de uma execução no
 * relatório) sem depender do formato de tela.
 */
export function dataHoraEmBrasilia(iso: string): { data: DataISO; hora: string } | null {
  const partes = FORMATO_ISO_DATA_HORA.exec(iso);
  if (!partes || !dataValida(partes[1] ?? "")) return null;
  const instante = new Date(iso);
  if (Number.isNaN(instante.getTime())) return null;
  const p = partesEmBrasilia(instante);
  return { data: `${p.ano}-${p.mes}-${p.dia}`, hora: `${p.hora}:${p.minuto}` };
}

/**
 * "11/10/2026 14:02" em Brasília, a partir de qualquer ISO de data-hora com "Z" ou deslocamento.
 * Texto que não seja ISO válido (ou sem fuso) volta como veio, para a tela nunca quebrar.
 */
export function formatarDataHoraBrasilia(iso: string): string {
  const emBrasilia = dataHoraEmBrasilia(iso);
  if (emBrasilia === null) return iso;
  const [ano, mes, dia] = emBrasilia.data.split("-");
  return `${dia ?? ""}/${mes ?? ""}/${ano ?? ""} ${emBrasilia.hora}`;
}
```

- [ ] **Step 4: Rodar e ver passar**

Execute: `npm run format && npm run verificar`
Esperado: tudo verde; 16 arquivos de teste, 410 passando | 9 pulados (419).

- [ ] **Step 5: Commit**

```bash
git add src/indices/relogio.ts src/indices/relogio.test.ts
git commit -m "indices: relógio de Brasília (data-hora da obtenção, formatação e comparação por instante)

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```


### Task 3: Calendário de divulgação: previsão por série, regra "ainda não divulgado", último mês esperado, meses atrasados e agrupamento

**Files:**
- Create: `src/compartilhado/divulgacao.ts`, `src/indices/calendario.ts`
- Test: `src/compartilhado/divulgacao.test.ts`, `src/indices/calendario.test.ts`

**Interfaces:**
- Consome: `competenciasEntre`, `comporCompetencia`, `dataNoMes`, `decompor`, `mesAnterior`, `mesSeguinte`, `somarMeses` (datas.ts); `formatarCompetencia`, `formatarData`; tipos `CodigoSerie`, `Competencia`, `DataISO`, `TabelaIndices`.
- Produz:
  - Em `src/compartilhado/divulgacao.ts` (compartilhado porque o motor também usa, e o motor só depende de `src/compartilhado/`):
    - `divulgacaoPrevista(codigo, competencia): string` — "por volta de 10/11/2026" (IPCA, INPC), "no fim de out/2026" (IGP-M), "no 1º dia útil de nov/2026" (taxa legal), "ao longo de out/2026, como acumulado parcial fechado no início de nov/2026" (SELIC), "no início de 2027, com o decreto do salário mínimo"; sem ponto final, para encaixar em "(previsão: …)" (Task 6).
    - `aindaNaoDivulgado(tabela, serie, competencia): boolean` — `true` só quando a tabela traz `esperadoAte` para a série e o mês é posterior a ele (Task 6).
  - Em `src/indices/calendario.ts`:
    - `SERIES_EM_ORDEM_NUMERICA: readonly CodigoSerie[]` — 188, 189, 433, 1619, 4390, 29543 (Tasks 7 e 8).
    - `ultimoMesEsperado(codigo, hoje): Competencia` — IPCA e INPC: dia ≥ 15 → mês anterior, senão o retrasado; IGP-M: dia ≥ 5 → anterior, senão o retrasado; taxa legal e SELIC: dia ≥ 5 → o próprio mês, senão o anterior; salário mínimo: de fevereiro em diante dezembro do ano, em janeiro dezembro do ano anterior.
    - `esperadoAte(hoje): Record<CodigoSerie, Competencia>` — as seis, para `TabelaIndices.esperadoAte` (Task 7).
    - `interface MesAtrasado { serie; competencia; previsao }` e `mesesAtrasados(tabela, hoje): MesAtrasado[]` — meses do seguinte ao último presente até o esperado, por série presente (Tasks 7 e 8).
    - `interface GrupoDeAtraso { serie; de; ate; previsao }` e `agruparAtrasados(atrasados): GrupoDeAtraso[]` — junta meses seguidos da mesma série com a mesma previsão (o salário mínimo do ano inteiro vira um grupo só), para que a tela e a rotina digam uma frase por grupo (Tasks 7 e 8).

Decisão D7 (11/10/2026): regras por série com dia aproximado, só para avisos. Quem consulta o BCB é a rotina central; o calendário só explica por que um mês falta. Os dois módulos são puros: `hoje` chega como texto.

- [ ] **Step 1: Escrever os testes**

Crie `src/compartilhado/divulgacao.test.ts` (11 testes):

```ts
import { describe, expect, it } from "vitest";
import { aindaNaoDivulgado, divulgacaoPrevista } from "./divulgacao.ts";
import type { CodigoSerie, TabelaIndices } from "./tipos.ts";

const SEIS_SERIES: CodigoSerie[] = ["188", "189", "433", "1619", "29543", "4390"];

describe("divulgacaoPrevista", () => {
  it("IPCA e INPC: por volta do dia 10 do mês seguinte", () => {
    expect(divulgacaoPrevista("433", "2026-10")).toBe("por volta de 10/11/2026");
    expect(divulgacaoPrevista("188", "2026-10")).toBe("por volta de 10/11/2026");
    expect(divulgacaoPrevista("433", "2026-08")).toBe("por volta de 10/09/2026");
  });

  it("IPCA e INPC de dezembro: janeiro do ano seguinte", () => {
    expect(divulgacaoPrevista("433", "2026-12")).toBe("por volta de 10/01/2027");
    expect(divulgacaoPrevista("188", "2026-12")).toBe("por volta de 10/01/2027");
  });

  it("IGP-M: no fim do próprio mês", () => {
    expect(divulgacaoPrevista("189", "2026-10")).toBe("no fim de out/2026");
    expect(divulgacaoPrevista("189", "2027-01")).toBe("no fim de jan/2027");
  });

  it("taxa legal: no 1º dia útil do mês de referência", () => {
    expect(divulgacaoPrevista("29543", "2026-11")).toBe("no 1º dia útil de nov/2026");
    expect(divulgacaoPrevista("29543", "2026-10")).toBe("no 1º dia útil de out/2026");
  });

  it("SELIC: ao longo do mês, fechada no início do seguinte", () => {
    expect(divulgacaoPrevista("4390", "2026-10")).toBe(
      "ao longo de out/2026, como acumulado parcial fechado no início de nov/2026",
    );
    expect(divulgacaoPrevista("4390", "2026-12")).toBe(
      "ao longo de dez/2026, como acumulado parcial fechado no início de jan/2027",
    );
  });

  it("salário mínimo: no início do ano da competência, com o decreto", () => {
    expect(divulgacaoPrevista("1619", "2027-01")).toBe(
      "no início de 2027, com o decreto do salário mínimo",
    );
    expect(divulgacaoPrevista("1619", "2027-12")).toBe(
      "no início de 2027, com o decreto do salário mínimo",
    );
  });

  it('nenhuma frase termina com ponto final, para encaixar em "(previsão: …)"', () => {
    for (const serie of SEIS_SERIES) {
      const frase = divulgacaoPrevista(serie, "2026-10");
      expect(frase.length).toBeGreaterThan(0);
      expect(frase.endsWith(".")).toBe(false);
    }
  });
});

describe("aindaNaoDivulgado", () => {
  const semSeries: TabelaIndices = { consultadoEm: "2026-10-11T14:02:00-03:00", series: {} };
  const comCalendario = (): TabelaIndices => ({
    ...semSeries,
    esperadoAte: { "433": "2026-09", "29543": "2026-10" },
  });

  it("é verdadeiro só quando a tabela traz o esperadoAte da série e a competência é posterior a ele", () => {
    const tabela = comCalendario();
    expect(aindaNaoDivulgado(tabela, "433", "2026-10")).toBe(true);
    expect(aindaNaoDivulgado(tabela, "433", "2027-01")).toBe(true);
    expect(aindaNaoDivulgado(tabela, "433", "2026-09")).toBe(false);
    expect(aindaNaoDivulgado(tabela, "433", "2025-05")).toBe(false);
    expect(aindaNaoDivulgado(tabela, "29543", "2026-11")).toBe(true);
    expect(aindaNaoDivulgado(tabela, "29543", "2026-10")).toBe(false);
  });

  it("sem esperadoAte na tabela (casos de referência antigos) é sempre falso", () => {
    expect(aindaNaoDivulgado(semSeries, "433", "2026-10")).toBe(false);
    expect(aindaNaoDivulgado(semSeries, "433", "2099-12")).toBe(false);
  });

  it("série ausente do esperadoAte (calendário parcial) é sempre falso", () => {
    const tabela = comCalendario();
    expect(aindaNaoDivulgado(tabela, "1619", "2027-01")).toBe(false);
    expect(aindaNaoDivulgado(tabela, "189", "2026-10")).toBe(false);
  });

  it("não depende de a série ou o mês existirem na tabela: só do calendário", () => {
    const tabela: TabelaIndices = {
      consultadoEm: "2026-10-11T14:02:00-03:00",
      series: {},
      esperadoAte: { "433": "2026-09" },
    };
    expect(aindaNaoDivulgado(tabela, "433", "2026-10")).toBe(true);
    expect(aindaNaoDivulgado(tabela, "433", "2026-09")).toBe(false);
  });
});
```

Crie `src/indices/calendario.test.ts` (21 testes):

```ts
import { describe, expect, it } from "vitest";
import type {
  CodigoSerie,
  Competencia,
  TabelaIndices,
  ValorIndice,
} from "../compartilhado/tipos.ts";
import { agruparAtrasados, esperadoAte, mesesAtrasados, ultimoMesEsperado } from "./calendario.ts";

const SEIS_SERIES: CodigoSerie[] = ["188", "189", "433", "1619", "29543", "4390"];

/** Tabela de teste com as competências indicadas por série; o valor em si não importa ao calendário. */
function tabelaCom(meses: Partial<Record<CodigoSerie, Competencia[]>>): TabelaIndices {
  const series: TabelaIndices["series"] = {};
  for (const [codigo, lista] of Object.entries(meses) as Array<[CodigoSerie, Competencia[]]>) {
    const valores: Record<Competencia, ValorIndice> = {};
    for (const competencia of lista) {
      valores[competencia] = {
        valor: "0.50",
        fonte: "embutida",
        obtidoEm: "2026-10-11T14:02:00-03:00",
      };
    }
    series[codigo] = valores;
  }
  return { consultadoEm: "2026-10-11T14:02:00-03:00", series };
}

describe("calendário de divulgação", () => {
  describe("ultimoMesEsperado", () => {
    it("em 11/10/2026 espera os meses dos exemplos da especificação", () => {
      expect(ultimoMesEsperado("433", "2026-10-11")).toBe("2026-08");
      expect(ultimoMesEsperado("188", "2026-10-11")).toBe("2026-08");
      expect(ultimoMesEsperado("189", "2026-10-11")).toBe("2026-09");
      expect(ultimoMesEsperado("29543", "2026-10-11")).toBe("2026-10");
      expect(ultimoMesEsperado("4390", "2026-10-11")).toBe("2026-10");
      expect(ultimoMesEsperado("1619", "2026-10-11")).toBe("2026-12");
    });

    it("IPCA e INPC: do dia 15 em diante espera o mês anterior; antes, o retrasado", () => {
      expect(ultimoMesEsperado("433", "2026-10-14")).toBe("2026-08");
      expect(ultimoMesEsperado("433", "2026-10-15")).toBe("2026-09");
      expect(ultimoMesEsperado("433", "2026-10-31")).toBe("2026-09");
      expect(ultimoMesEsperado("188", "2026-10-14")).toBe("2026-08");
      expect(ultimoMesEsperado("188", "2026-10-15")).toBe("2026-09");
      expect(ultimoMesEsperado("433", "2026-10-01")).toBe("2026-08");
    });

    it("IGP-M: do dia 5 em diante espera o mês anterior; antes, o retrasado", () => {
      expect(ultimoMesEsperado("189", "2026-11-03")).toBe("2026-09");
      expect(ultimoMesEsperado("189", "2026-11-04")).toBe("2026-09");
      expect(ultimoMesEsperado("189", "2026-11-05")).toBe("2026-10");
      expect(ultimoMesEsperado("189", "2026-11-30")).toBe("2026-10");
    });

    it("taxa legal e SELIC: do dia 5 em diante espera o próprio mês; antes, o anterior", () => {
      expect(ultimoMesEsperado("29543", "2026-11-03")).toBe("2026-10");
      expect(ultimoMesEsperado("29543", "2026-11-04")).toBe("2026-10");
      expect(ultimoMesEsperado("29543", "2026-11-05")).toBe("2026-11");
      expect(ultimoMesEsperado("4390", "2026-11-03")).toBe("2026-10");
      expect(ultimoMesEsperado("4390", "2026-11-04")).toBe("2026-10");
      expect(ultimoMesEsperado("4390", "2026-11-05")).toBe("2026-11");
      expect(ultimoMesEsperado("4390", "2026-10-01")).toBe("2026-09");
    });

    it("salário mínimo: de fevereiro em diante espera dezembro do ano; em janeiro, dezembro do ano anterior", () => {
      expect(ultimoMesEsperado("1619", "2027-01-20")).toBe("2026-12");
      expect(ultimoMesEsperado("1619", "2027-01-01")).toBe("2026-12");
      expect(ultimoMesEsperado("1619", "2027-01-31")).toBe("2026-12");
      expect(ultimoMesEsperado("1619", "2027-02-01")).toBe("2027-12");
      expect(ultimoMesEsperado("1619", "2027-12-31")).toBe("2027-12");
    });

    it("vira o ano ao andar um ou dois meses para trás", () => {
      expect(ultimoMesEsperado("433", "2027-01-14")).toBe("2026-11");
      expect(ultimoMesEsperado("188", "2027-01-14")).toBe("2026-11");
      expect(ultimoMesEsperado("433", "2027-01-15")).toBe("2026-12");
      expect(ultimoMesEsperado("433", "2027-02-14")).toBe("2026-12");
      expect(ultimoMesEsperado("433", "2027-02-15")).toBe("2027-01");
      expect(ultimoMesEsperado("189", "2027-01-04")).toBe("2026-11");
      expect(ultimoMesEsperado("189", "2027-01-05")).toBe("2026-12");
      expect(ultimoMesEsperado("29543", "2027-01-04")).toBe("2026-12");
      expect(ultimoMesEsperado("29543", "2027-01-05")).toBe("2027-01");
      expect(ultimoMesEsperado("4390", "2027-01-04")).toBe("2026-12");
      expect(ultimoMesEsperado("4390", "2027-01-05")).toBe("2027-01");
    });
  });

  describe("esperadoAte", () => {
    it("reúne as seis séries para a data", () => {
      expect(esperadoAte("2026-10-11")).toEqual({
        "188": "2026-08",
        "189": "2026-09",
        "433": "2026-08",
        "1619": "2026-12",
        "29543": "2026-10",
        "4390": "2026-10",
      });
    });

    it("no início de janeiro, tudo recua para o ano anterior", () => {
      expect(esperadoAte("2027-01-03")).toEqual({
        "188": "2026-11",
        "189": "2026-11",
        "433": "2026-11",
        "1619": "2026-12",
        "29543": "2026-12",
        "4390": "2026-12",
      });
    });

    it("cada entrada coincide com ultimoMesEsperado da série", () => {
      const esperado = esperadoAte("2026-11-05");
      for (const serie of SEIS_SERIES) {
        expect(esperado[serie]).toBe(ultimoMesEsperado(serie, "2026-11-05"));
      }
    });
  });

  describe("mesesAtrasados", () => {
    it("IPCA até jul/2026 em 11/10/2026: falta ago/2026, previsto por volta de 10/09/2026", () => {
      const tabela = tabelaCom({ "433": ["2026-05", "2026-06", "2026-07"] });
      expect(mesesAtrasados(tabela, "2026-10-11")).toEqual([
        { serie: "433", competencia: "2026-08", previsao: "por volta de 10/09/2026" },
      ]);
    });

    it("série em dia ou adiantada não gera atraso", () => {
      expect(mesesAtrasados(tabelaCom({ "433": ["2026-07", "2026-08"] }), "2026-10-11")).toEqual(
        [],
      );
      expect(
        mesesAtrasados(tabelaCom({ "433": ["2026-08", "2026-09", "2026-10"] }), "2026-10-11"),
      ).toEqual([]);
      expect(mesesAtrasados(tabelaCom({ "1619": ["2026-12"] }), "2027-01-20")).toEqual([]);
    });

    it("série ausente da tabela não gera nada; tabela vazia devolve lista vazia", () => {
      expect(mesesAtrasados(tabelaCom({ "189": ["2026-09"] }), "2026-10-11")).toEqual([]);
      expect(mesesAtrasados(tabelaCom({}), "2026-10-11")).toEqual([]);
    });

    it("série presente sem nenhum mês é tratada como ausente", () => {
      expect(mesesAtrasados(tabelaCom({ "433": [] }), "2026-10-11")).toEqual([]);
    });

    it("lista todos os meses do seguinte ao último presente até o esperado, em ordem crescente", () => {
      const tabela = tabelaCom({ "433": ["2026-06"] });
      expect(mesesAtrasados(tabela, "2026-10-15")).toEqual([
        { serie: "433", competencia: "2026-07", previsao: "por volta de 10/08/2026" },
        { serie: "433", competencia: "2026-08", previsao: "por volta de 10/09/2026" },
        { serie: "433", competencia: "2026-09", previsao: "por volta de 10/10/2026" },
      ]);
    });

    it("usa o último mês presente, não a ordem das chaves nem buracos no meio", () => {
      const tabela = tabelaCom({ "189": ["2026-08", "2026-05", "2026-07"] });
      expect(mesesAtrasados(tabela, "2026-11-05")).toEqual([
        { serie: "189", competencia: "2026-09", previsao: "no fim de set/2026" },
        { serie: "189", competencia: "2026-10", previsao: "no fim de out/2026" },
      ]);
    });

    it("ordena as séries numericamente (188, 189, 433, 1619, 4390, 29543) e os meses crescentes", () => {
      const tabela = tabelaCom({
        "29543": ["2026-09"],
        "4390": ["2026-09"],
        "433": ["2026-07"],
        "188": ["2026-08"],
        "189": ["2026-08"],
        "1619": ["2026-12"],
      });
      expect(mesesAtrasados(tabela, "2026-10-11")).toEqual([
        { serie: "189", competencia: "2026-09", previsao: "no fim de set/2026" },
        { serie: "433", competencia: "2026-08", previsao: "por volta de 10/09/2026" },
        {
          serie: "4390",
          competencia: "2026-10",
          previsao: "ao longo de out/2026, como acumulado parcial fechado no início de nov/2026",
        },
        { serie: "29543", competencia: "2026-10", previsao: "no 1º dia útil de out/2026" },
      ]);
    });

    it("salário mínimo: em fevereiro, com a série ainda no ano anterior, faltam os doze meses do ano", () => {
      const atrasados = mesesAtrasados(tabelaCom({ "1619": ["2026-12"] }), "2027-02-01");
      expect(atrasados).toHaveLength(12);
      expect(atrasados[0]).toEqual({
        serie: "1619",
        competencia: "2027-01",
        previsao: "no início de 2027, com o decreto do salário mínimo",
      });
      expect(atrasados[11]?.competencia).toBe("2027-12");
      expect(atrasados.every((a) => a.serie === "1619")).toBe(true);
    });

    it("a virada de ano entra na contagem", () => {
      const tabela = tabelaCom({ "433": ["2026-11"] });
      expect(mesesAtrasados(tabela, "2027-02-15")).toEqual([
        { serie: "433", competencia: "2026-12", previsao: "por volta de 10/01/2027" },
        { serie: "433", competencia: "2027-01", previsao: "por volta de 10/02/2027" },
      ]);
    });
  });
});

describe("agruparAtrasados", () => {
  it("junta meses seguidos da mesma série com a mesma previsão (salário mínimo do ano inteiro)", () => {
    const tabela = {
      consultadoEm: "2026-10-11T20:11:55-03:00",
      series: {
        "1619": {
          "2026-12": {
            valor: "1621.00",
            fonte: "embutida" as const,
            obtidoEm: "2026-10-11T20:11:55-03:00",
          },
        },
      },
    };
    const grupos = agruparAtrasados(mesesAtrasados(tabela, "2027-02-01"));
    expect(grupos).toEqual([
      {
        serie: "1619",
        de: "2027-01",
        ate: "2027-12",
        previsao: "no início de 2027, com o decreto do salário mínimo",
      },
    ]);
  });

  it("mantém separados os meses com previsões diferentes e as séries diferentes", () => {
    const grupos = agruparAtrasados([
      { serie: "433", competencia: "2026-08", previsao: "por volta de 10/09/2026" },
      { serie: "433", competencia: "2026-09", previsao: "por volta de 10/10/2026" },
      { serie: "4390", competencia: "2026-10", previsao: "x" },
      { serie: "29543", competencia: "2026-10", previsao: "x" },
    ]);
    expect(grupos.map((g) => `${g.serie}:${g.de}-${g.ate}`)).toEqual([
      "433:2026-08-2026-08",
      "433:2026-09-2026-09",
      "4390:2026-10-2026-10",
      "29543:2026-10-2026-10",
    ]);
  });

  it("não junta meses não seguidos, mesmo com a mesma previsão; lista vazia dá lista vazia", () => {
    const grupos = agruparAtrasados([
      { serie: "1619", competencia: "2027-01", previsao: "p" },
      { serie: "1619", competencia: "2027-03", previsao: "p" },
    ]);
    expect(grupos).toHaveLength(2);
    expect(agruparAtrasados([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Execute: `npm test -- src/compartilhado/divulgacao.test.ts src/indices/calendario.test.ts`
Esperado: os dois arquivos falham ao carregar ("Cannot find module './divulgacao.ts'" e "Cannot find module './calendario.ts'"); nenhum teste roda.

- [ ] **Step 3: Escrever o código**

Crie `src/compartilhado/divulgacao.ts`:

```ts
import { dataNoMes, mesSeguinte } from "./datas.ts";
import { formatarCompetencia, formatarData } from "./formatacao.ts";
import type { CodigoSerie, Competencia, TabelaIndices } from "./tipos.ts";

// Calendário de divulgação das séries do BCB, na parte que o motor e o módulo de índices
// compartilham: o texto da previsão de cada mês e a regra "ainda não divulgado" pela tabela.
// As regras de "até que mês cada série deveria existir" ficam em `src/indices/calendario.ts`, que
// preenche `TabelaIndices.esperadoAte`; o motor só lê esse campo.

/**
 * Quando o mês da série deve ser divulgado, em frase curta, sem ponto final, para encaixar em
 * "(previsão: …)": "por volta de 10/11/2026", "no fim de out/2026", "no 1º dia útil de nov/2026".
 */
export function divulgacaoPrevista(codigo: CodigoSerie, competencia: Competencia): string {
  switch (codigo) {
    case "433":
    case "188":
      return `por volta de ${formatarData(dataNoMes(mesSeguinte(competencia), 10))}`;
    case "189":
      return `no fim de ${formatarCompetencia(competencia)}`;
    case "29543":
      return `no 1º dia útil de ${formatarCompetencia(competencia)}`;
    case "4390":
      return `ao longo de ${formatarCompetencia(competencia)}, como acumulado parcial fechado no início de ${formatarCompetencia(mesSeguinte(competencia))}`;
    case "1619":
      return `no início de ${competencia.slice(0, 4)}, com o decreto do salário mínimo`;
  }
}

/**
 * true quando a tabela diz até que mês a série deveria existir (`esperadoAte`, preenchido pelo
 * calendário no congelamento) e o mês é posterior: o índice ainda não saiu na data da consulta.
 * Sem `esperadoAte` (casos de referência antigos) ou sem a série nele, é sempre false.
 */
export function aindaNaoDivulgado(
  tabela: TabelaIndices,
  serie: CodigoSerie,
  competencia: Competencia,
): boolean {
  const esperado = tabela.esperadoAte?.[serie];
  return esperado !== undefined && competencia > esperado;
}
```

Crie `src/indices/calendario.ts`:

```ts
import {
  competenciasEntre,
  comporCompetencia,
  decompor,
  mesAnterior,
  mesSeguinte,
  somarMeses,
} from "../compartilhado/datas.ts";
import { divulgacaoPrevista } from "../compartilhado/divulgacao.ts";
import type { CodigoSerie, Competencia, DataISO, TabelaIndices } from "../compartilhado/tipos.ts";

/**
 * Calendário de divulgação das séries (decisão D7 de 11/10/2026): uma regra por série, com dia
 * aproximado, que serve só para avisar o que já deveria ter saído. Quem consulta o BCB é a rotina
 * central (scripts/atualizar-indices.ts); o app só lê a cópia publicada.
 * Módulo puro: `hoje` chega como texto (de `hojeEmBrasilia`, em relogio.ts).
 */

/** As seis séries em ordem numérica, a ordem dos avisos e das listas por série. */
export const SERIES_EM_ORDEM_NUMERICA: readonly CodigoSerie[] = [
  "188",
  "189",
  "433",
  "1619",
  "4390",
  "29543",
];

/**
 * Último mês que a série já deveria ter na data `hoje`, pelo calendário de divulgação.
 * - IPCA (433) e INPC (188): o IBGE divulga por volta do dia 10 do mês seguinte.
 * - IGP-M (189): a FGV divulga no fim do próprio mês; o SGS carrega nos primeiros dias do seguinte.
 * - Taxa legal (29543): publicada no 1º dia útil do mês de referência.
 * - SELIC acumulada no mês (4390): o mês corrente já aparece, como acumulado parcial.
 * - Salário mínimo (1619): o ano inteiro entra assim que o decreto sai, no fim do ano anterior ou
 *   no início do ano; só em janeiro ainda se admite não ter o ano novo.
 */
export function ultimoMesEsperado(codigo: CodigoSerie, hoje: DataISO): Competencia {
  const { ano, mes, dia } = decompor(hoje);
  const mesDeHoje = comporCompetencia(ano, mes);
  switch (codigo) {
    case "433":
    case "188":
      return dia >= 15 ? mesAnterior(mesDeHoje) : somarMeses(mesDeHoje, -2);
    case "189":
      return dia >= 5 ? mesAnterior(mesDeHoje) : somarMeses(mesDeHoje, -2);
    case "29543":
    case "4390":
      return dia >= 5 ? mesDeHoje : mesAnterior(mesDeHoje);
    case "1619":
      return mes >= 2 ? comporCompetencia(ano, 12) : comporCompetencia(ano - 1, 12);
  }
}

/** `ultimoMesEsperado` das seis séries, no formato de `TabelaIndices.esperadoAte`. */
export function esperadoAte(hoje: DataISO): Record<CodigoSerie, Competencia> {
  return {
    "188": ultimoMesEsperado("188", hoje),
    "189": ultimoMesEsperado("189", hoje),
    "433": ultimoMesEsperado("433", hoje),
    "1619": ultimoMesEsperado("1619", hoje),
    "29543": ultimoMesEsperado("29543", hoje),
    "4390": ultimoMesEsperado("4390", hoje),
  };
}

export interface MesAtrasado {
  serie: CodigoSerie;
  competencia: Competencia;
  previsao: string;
}

/**
 * Meses que o calendário diz já divulgados e a tabela ainda não tem: para cada série presente,
 * do mês seguinte ao último presente até `ultimoMesEsperado` (nada quando a série está em dia ou
 * adiantada; série ausente, ou sem nenhum mês, não entra). Séries em ordem numérica, meses crescentes.
 */
export function mesesAtrasados(tabela: TabelaIndices, hoje: DataISO): MesAtrasado[] {
  const atrasados: MesAtrasado[] = [];
  for (const serie of SERIES_EM_ORDEM_NUMERICA) {
    const presentes = Object.keys(tabela.series[serie] ?? {});
    if (presentes.length === 0) continue;
    const ultimoPresente = presentes.reduce((maior, atual) => (atual > maior ? atual : maior));
    const faltantes = competenciasEntre(
      mesSeguinte(ultimoPresente),
      ultimoMesEsperado(serie, hoje),
    );
    for (const competencia of faltantes) {
      atrasados.push({ serie, competencia, previsao: divulgacaoPrevista(serie, competencia) });
    }
  }
  return atrasados;
}

/** Meses atrasados seguidos da mesma série com a mesma previsão (o salário mínimo do ano inteiro). */
export interface GrupoDeAtraso {
  serie: CodigoSerie;
  de: Competencia;
  ate: Competencia;
  previsao: string;
}

/**
 * Junta os meses atrasados seguidos da mesma série que têm a mesma previsão de divulgação, para
 * que um ano inteiro de salário mínimo atrasado saia numa frase só ("jan/2027 a dez/2027"). Meses
 * com previsões diferentes (IPCA de set e de out) ficam separados. Mantém a ordem recebida.
 */
export function agruparAtrasados(atrasados: readonly MesAtrasado[]): GrupoDeAtraso[] {
  const grupos: GrupoDeAtraso[] = [];
  for (const { serie, competencia, previsao } of atrasados) {
    const ultimo = grupos.at(-1);
    if (
      ultimo !== undefined &&
      ultimo.serie === serie &&
      ultimo.previsao === previsao &&
      mesSeguinte(ultimo.ate) === competencia
    ) {
      ultimo.ate = competencia;
    } else {
      grupos.push({ serie, de: competencia, ate: competencia, previsao });
    }
  }
  return grupos;
}
```

- [ ] **Step 4: Rodar e ver passar**

Execute: `npm run format && npm run verificar`
Esperado: tudo verde; 18 arquivos de teste, 442 passando | 9 pulados (451).

- [ ] **Step 5: Commit**

```bash
git add src/compartilhado/divulgacao.ts src/compartilhado/divulgacao.test.ts src/indices/calendario.ts src/indices/calendario.test.ts
git commit -m "indices: calendário de divulgação (previsão por série, mês esperado, meses atrasados e agrupamento)

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```


### Task 4: Cliente do BCB para a rotina: `buscarSerie` com tempo-limite, repetição e decisão pelo corpo

**Files:**
- Modify: `src/indices/cliente-bcb.ts` (reescrito)
- Test: `src/indices/cliente-bcb.test.ts` (reescrito)

**Interfaces:**
- Consome: `urlDaSerie`, `interpretarRespostaSgs`, `interpretarErroSgs` (Task 1), `ValorMensal`; tipos `CodigoSerie`, `DataISO`.
- Produz:
  - `interface OpcoesBusca { fetch?; tempoLimiteMs? (20 000); tentativas? (2); esperaMs? (3 000); dormir? }` — tudo com padrão; os testes injetam `fetch` e `dormir`. Os padrões (20 s, duas tentativas, 3 s) vêm do plano anterior e não são usados: a rotina sempre passa os seus (Task 8: 30 s, três tentativas, 2 s de espera).
  - `type RespostaBusca = { ok: true; valores: ValorMensal[]; url; tentativas } | { ok: false; motivo: string; url; tentativas }`.
  - `buscarSerie(codigo, dataInicial: DataISO | undefined, opcoes?): Promise<RespostaBusca>` — nunca lança; GET simples, sem cabeçalhos, com `AbortSignal.timeout`; lê o corpo sempre e decide por ele: lista JSON → ok (mesmo com status ≠ 200); objeto de erro do SGS → falha definitiva (mesmo com status 200), salvo erro 5xx, que repete; status ≥ 500 → repete após `esperaMs`; HTML com 200 ou JSON fora do formato → falha definitiva; `fetch` que lança (rede, tempo esgotado) → repete. Sem `dataInicial`, pede o histórico completo, que é o que a rotina faz (Task 8).
  - `montarArquivoSerie` (já existente) continua montando o arquivo de `dados/indices/` (Task 8).
  - `interpretarRespostaSgs` passa a recusar data com mês inválido ("01/13/2026", pendência da fase 1): sem isso, a competência "2026-13" iria para o arquivo da série e derrubaria a montagem da tabela.

O cliente roda só na rotina (Node, no GitHub Actions ou num computador), nunca no navegador. Fatos de 11/10/2026 que os testes reproduzem: 502 em HTML seguido de sucesso; o corpo de erro 404 servido com status 200; JSON válido rotulado `text/html`; série inexistente em HTML com 200; IGP-M em 9,8 s. O erro 406 citado no design não se reproduziu em 11/10/2026; o teste usa um corpo sintético no formato dos erros reais 400 e 404.

- [ ] **Step 1: Escrever os testes**

Substitua `src/indices/cliente-bcb.test.ts` por (48 testes: os 11 antigos continuam, um deles agora também exige recusar o mês 13; entram 37):

```ts
import { describe, expect, it, vi } from "vitest";
import {
  buscarSerie,
  ehValorMensalValido,
  interpretarErroSgs,
  interpretarRespostaSgs,
  montarArquivoSerie,
  RespostaSgsInvalida,
} from "./cliente-bcb.ts";
import type { OpcoesBusca } from "./cliente-bcb.ts";
import { SERIES, urlDaSerie } from "./series.ts";
import sgs1619DesdeDez from "./testes/sgs-1619-desde-dez-2026.json?raw";
import respostaGravada from "./testes/sgs-189-2017-2018.json?raw";
import sgs433DesdeAgo from "./testes/sgs-433-desde-ago-2026.json?raw";
import sgs433DesdeSet from "./testes/sgs-433-desde-set-2026.json?raw";
import sgs4390Ultimos3 from "./testes/sgs-4390-ultimos-3.json?raw";
import sgsErro400DataInvalida from "./testes/sgs-erro-400-data-invalida.json?raw";
import sgsErro404SemValores from "./testes/sgs-erro-404-sem-valores.json?raw";
import sgsErro502Html from "./testes/sgs-erro-502.html?raw";
import sgsSerieInexistenteHtml from "./testes/sgs-serie-inexistente.html?raw";

describe("catálogo de séries do BCB", () => {
  it("tem as seis séries do design", () => {
    expect(Object.keys(SERIES).sort()).toEqual(["1619", "188", "189", "29543", "433", "4390"]);
    expect(SERIES["189"].descricao).toBe("IGP-M (FGV), variação % mensal");
  });

  it("monta a URL do SGS com e sem intervalo de datas", () => {
    expect(urlDaSerie("189")).toBe(
      "https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados?formato=json",
    );
    expect(urlDaSerie("189", "2017-01-01", "2018-05-31")).toBe(
      "https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados?formato=json&dataInicial=01/01/2017&dataFinal=31/05/2018",
    );
  });
});

describe("interpretarRespostaSgs", () => {
  it("lê a resposta real gravada do BCB para o IGP-M (jan/2017 a mai/2018)", () => {
    const valores = interpretarRespostaSgs(respostaGravada);
    expect(valores).toHaveLength(17);
    expect(valores[0]).toEqual({ competencia: "2017-01", valor: "0.64" });
    expect(valores[3]).toEqual({ competencia: "2017-04", valor: "-1.10" });
    expect(valores[16]).toEqual({ competencia: "2018-05", valor: "1.38" });
  });

  it("ordena por competência quando a resposta vem invertida e tolera repetição idêntica", () => {
    const texto =
      '[{"data":"01/03/2026","valor":"0.50"},{"data":"01/02/2026","valor":"0.30"},{"data":"01/01/2026","valor":"0.10"},{"data":"01/02/2026","valor":"0.30"}]';
    expect(interpretarRespostaSgs(texto)).toEqual([
      { competencia: "2026-01", valor: "0.10" },
      { competencia: "2026-02", valor: "0.30" },
      { competencia: "2026-03", valor: "0.50" },
    ]);
  });

  it("recusa repetição com valores diferentes", () => {
    const texto = '[{"data":"01/02/2026","valor":"0.30"},{"data":"01/02/2026","valor":"0.31"}]';
    expect(() => interpretarRespostaSgs(texto)).toThrow(RespostaSgsInvalida);
  });

  it("recusa HTML (série inexistente responde HTML com status 200)", () => {
    expect(() => interpretarRespostaSgs("<!DOCTYPE html><html><body>Erro</body></html>")).toThrow(
      RespostaSgsInvalida,
    );
  });

  it("recusa erro em JSON, JSON inválido e data ou valor fora do formato", () => {
    expect(() => interpretarRespostaSgs('{"erro":"parâmetro inválido"}')).toThrow(
      RespostaSgsInvalida,
    );
    expect(() => interpretarRespostaSgs("[{")).toThrow(RespostaSgsInvalida);
    expect(() => interpretarRespostaSgs('[{"data":"2017-01-01","valor":"0.64"}]')).toThrow(
      RespostaSgsInvalida,
    );
    expect(() => interpretarRespostaSgs('[{"data":"01/01/2017","valor":"0,64"}]')).toThrow(
      RespostaSgsInvalida,
    );
    // mês 13 ou 00 na data do BCB: recusado, nunca vira a competência "2017-13"
    expect(() => interpretarRespostaSgs('[{"data":"01/13/2017","valor":"0.64"}]')).toThrow(
      "Data inválida na resposta do BCB: 01/13/2017",
    );
    expect(() => interpretarRespostaSgs('[{"data":"01/00/2017","valor":"0.64"}]')).toThrow(
      RespostaSgsInvalida,
    );
    expect(() => interpretarRespostaSgs('[{"data":"01/01/2017","valor":null}]')).toThrow(
      RespostaSgsInvalida,
    );
    expect(() => interpretarRespostaSgs("[1, 2]")).toThrow(RespostaSgsInvalida);
  });

  it("devolve lista vazia para resposta vazia (quem chama decide o que fazer)", () => {
    expect(interpretarRespostaSgs("[]")).toEqual([]);
  });
});

describe("interpretarErroSgs", () => {
  it("reconhece o objeto de erro do SGS (404 sem valores, 400 data inválida) e ignora o resto", () => {
    expect(
      interpretarErroSgs(
        '{"erro":{"statusCode":404,"detail":"br.gov.bcb.pec.sgs.comum.excecoes.SGSNegocioException: Value(s) not found"}}',
      ),
    ).toEqual({
      statusCode: 404,
      detail: "br.gov.bcb.pec.sgs.comum.excecoes.SGSNegocioException: Value(s) not found",
    });
    expect(interpretarErroSgs('{"erro":{"statusCode":400}}')).toEqual({
      statusCode: 400,
      detail: "",
    });
    expect(interpretarErroSgs('[{"data":"01/01/2017","valor":"0.64"}]')).toBeNull();
    expect(interpretarErroSgs("<!DOCTYPE html>")).toBeNull();
    expect(interpretarErroSgs('{"erro":"texto"}')).toBeNull();
    expect(interpretarErroSgs("{")).toBeNull();
  });
});

describe("ehValorMensalValido", () => {
  it("aceita competência válida com valor em texto decimal; recusa mês 13, valor numérico e chave ausente", () => {
    expect(ehValorMensalValido({ competencia: "2017-01", valor: "0.64" })).toBe(true);
    expect(ehValorMensalValido({ competencia: "2017-13", valor: "0.64" })).toBe(false);
    expect(ehValorMensalValido({ competencia: "2017-01", valor: 0.64 })).toBe(false);
    expect(ehValorMensalValido({ competencia: "2017-01", valor: "0,64" })).toBe(false);
    expect(ehValorMensalValido({ competencia: "2017-01" })).toBe(false);
    expect(ehValorMensalValido(null)).toBe(false);
    expect(ehValorMensalValido("2017-01")).toBe(false);
  });
});

describe("montarArquivoSerie", () => {
  it("monta o arquivo com formato, nome, origem e data de obtenção", () => {
    const arquivo = montarArquivoSerie(
      "189",
      [{ competencia: "2017-01", valor: "0.64" }],
      "2026-10-10T20:00:00.000Z",
    );
    expect(arquivo).toEqual({
      formato: "apura/serie@1",
      codigo: "189",
      nome: "IGP-M (FGV), variação % mensal",
      origem: "https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados?formato=json",
      obtidoEm: "2026-10-10T20:00:00.000Z",
      valores: [{ competencia: "2017-01", valor: "0.64" }],
    });
  });
});

// ---------------------------------------------------------------------------------------------
// buscarSerie: fetch falso (roteiro de respostas ou de lançamentos, registrando cada chamada) e
// dormir falso (só registra as esperas). Nenhum teste acessa a rede.
// ---------------------------------------------------------------------------------------------

interface ChamadaFetch {
  url: string;
  init: RequestInit | undefined;
}

/** Um passo do roteiro: a resposta a devolver ou o que lançar no lugar dela. */
type PassoDoRoteiro = Response | { lancar: unknown };

function fetchFalso(roteiro: PassoDoRoteiro[]): {
  fetch: typeof globalThis.fetch;
  chamadas: ChamadaFetch[];
} {
  const chamadas: ChamadaFetch[] = [];
  const fetch: typeof globalThis.fetch = (entrada, init) => {
    chamadas.push({ url: String(entrada), init });
    const passo = roteiro[chamadas.length - 1];
    if (passo === undefined) {
      return Promise.reject(new Error("fetch falso chamado mais vezes do que o roteiro previa"));
    }
    if (passo instanceof Response) return Promise.resolve(passo);
    return Promise.reject(passo.lancar);
  };
  return { fetch, chamadas };
}

function dormirFalso(): { dormir: (ms: number) => Promise<void>; esperas: number[] } {
  const esperas: number[] = [];
  return {
    esperas,
    dormir: (ms) => {
      esperas.push(ms);
      return Promise.resolve();
    },
  };
}

function json(corpo: string, status = 200): Response {
  return new Response(corpo, { status, headers: { "content-type": "application/json" } });
}

function html(corpo: string, status = 200): Response {
  return new Response(corpo, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

/** Monta as opções com fetch e dormir falsos e devolve também os registros, para as asserções. */
function preparar(roteiro: PassoDoRoteiro[], extras: Partial<OpcoesBusca> = {}) {
  const { fetch, chamadas } = fetchFalso(roteiro);
  const { dormir, esperas } = dormirFalso();
  const opcoes: OpcoesBusca = { fetch, dormir, ...extras };
  return { opcoes, chamadas, esperas };
}

const URL_433_DESDE_SET = urlDaSerie("433", "2026-09-01");
const ERRO_404_DETALHE =
  "br.gov.bcb.pec.sgs.comum.excecoes.SGSNegocioException: Value(s) not found";

describe("buscarSerie · caminho principal", () => {
  it("(1) devolve o IPCA desde set/2026 numa tentativa, com dataInicial na URL e GET simples", async () => {
    const { opcoes, chamadas, esperas } = preparar([json(sgs433DesdeSet)]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toEqual({
      ok: true,
      valores: [{ competencia: "2026-09", valor: "0.82" }],
      url: URL_433_DESDE_SET,
      tentativas: 1,
    });
    expect(resposta.url).toContain("&dataInicial=01/09/2026");
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0]?.url).toBe(URL_433_DESDE_SET);
    // GET simples: só o sinal de tempo-limite, sem método nem cabeçalhos.
    expect(chamadas[0]?.init?.signal).toBeInstanceOf(AbortSignal);
    expect(chamadas[0]?.init?.headers).toBeUndefined();
    expect(chamadas[0]?.init?.method).toBeUndefined();
    expect(esperas).toEqual([]);
  });

  it("(2) decide pelo corpo, não pelo content-type: JSON válido anunciado como text/html é aceito", async () => {
    const { opcoes } = preparar([html(sgs433DesdeSet)]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta.ok).toBe(true);
    if (resposta.ok) expect(resposta.valores).toEqual([{ competencia: "2026-09", valor: "0.82" }]);
  });

  it("(3) devolve a SELIC de ultimos/3 (que vem decrescente) em ordem crescente de competência", async () => {
    const { opcoes } = preparar([json(sgs4390Ultimos3)]);
    const resposta = await buscarSerie("4390", "2026-08-01", opcoes);
    expect(resposta).toMatchObject({ ok: true, tentativas: 1 });
    if (resposta.ok) {
      expect(resposta.valores).toEqual([
        { competencia: "2026-08", valor: "1.09" },
        { competencia: "2026-09", valor: "1.08" },
        { competencia: "2026-10", valor: "0.36" },
      ]);
    }
  });

  it("(12) aceita a lista vazia '[]' como ok sem valores (quem chama decide o que fazer)", async () => {
    const { opcoes, esperas } = preparar([json("[]")]);
    const resposta = await buscarSerie("188", "2026-10-01", opcoes);
    expect(resposta).toEqual({
      ok: true,
      valores: [],
      url: urlDaSerie("188", "2026-10-01"),
      tentativas: 1,
    });
    expect(esperas).toEqual([]);
  });

  it("(13) sem dataInicial, a URL não leva o parâmetro (histórico completo)", async () => {
    const { opcoes, chamadas } = preparar([json(sgs1619DesdeDez)]);
    const resposta = await buscarSerie("1619", undefined, opcoes);
    expect(resposta.url).toBe(
      "https://api.bcb.gov.br/dados/serie/bcdata.sgs.1619/dados?formato=json",
    );
    expect(resposta.url).not.toContain("dataInicial");
    expect(chamadas[0]?.url).toBe(resposta.url);
    expect(resposta).toMatchObject({
      ok: true,
      valores: [{ competencia: "2026-12", valor: "1621.00" }],
    });
  });

  it("aceita JSON válido mesmo com status HTTP diferente de 200 (o corpo decide)", async () => {
    const { opcoes, esperas } = preparar([json(sgs1619DesdeDez, 503)]);
    const resposta = await buscarSerie("1619", "2026-12-01", opcoes);
    expect(resposta).toMatchObject({
      ok: true,
      valores: [{ competencia: "2026-12", valor: "1621.00" }],
      tentativas: 1,
    });
    expect(esperas).toEqual([]);
  });
});

describe("buscarSerie · erros do SGS no corpo (não repetem)", () => {
  it.each([404, 200])(
    "(4) 'Value(s) not found' com status HTTP %i: uma tentativa, sem esperar, motivo com 404 e o detalhe",
    async (status) => {
      const { opcoes, chamadas, esperas } = preparar([json(sgsErro404SemValores, status)]);
      const resposta = await buscarSerie("433", "2026-11-01", opcoes);
      expect(resposta).toEqual({
        ok: false,
        motivo: `o BCB respondeu erro 404: ${ERRO_404_DETALHE}`,
        url: urlDaSerie("433", "2026-11-01"),
        tentativas: 1,
      });
      expect(resposta.ok === false && resposta.motivo).toContain("404");
      expect(resposta.ok === false && resposta.motivo).toContain("Value(s) not found");
      expect(chamadas).toHaveLength(1);
      expect(esperas).toEqual([]);
    },
  );

  it("(5) data inicial inválida (400): ok false numa tentativa, com o detalhe do SGS", async () => {
    const { opcoes, chamadas, esperas } = preparar([json(sgsErro400DataInvalida, 400)]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({
      ok: false,
      motivo:
        "o BCB respondeu erro 400: br.gov.bcb.pec.sgs.comum.excecoes.SGSNegocioException: Invalid initial date",
      tentativas: 1,
    });
    expect(chamadas).toHaveLength(1);
    expect(esperas).toEqual([]);
  });

  it("objeto de erro do SGS com status HTTP 5xx: repete uma vez (erro do servidor) e fica com o motivo do SGS", async () => {
    const { opcoes, chamadas, esperas } = preparar([
      json(sgsErro404SemValores, 500),
      json(sgsErro404SemValores, 500),
    ]);
    const resposta = await buscarSerie("433", "2026-11-01", opcoes);
    expect(resposta).toMatchObject({
      ok: false,
      motivo: `o BCB respondeu erro 404: ${ERRO_404_DETALHE}`,
      tentativas: 2,
    });
    expect(chamadas).toHaveLength(2);
    expect(esperas).toEqual([3000]);
  });

  it("objeto de erro do SGS com código 503 no corpo (mesmo com status 200): repete e recupera", async () => {
    const { opcoes, chamadas } = preparar([
      json('{"erro":{"statusCode":503,"detail":"Service Unavailable"}}'),
      json(sgs433DesdeSet),
    ]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({ ok: true, tentativas: 2 });
    expect(chamadas).toHaveLength(2);
  });

  it("erro 406 do SGS (sintético, no formato dos erros reais 400 e 404): falha definitiva, sem repetir", async () => {
    const { opcoes, chamadas, esperas } = preparar([
      json('{"erro":{"statusCode":406,"detail":"Not Acceptable"}}', 406),
    ]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({
      ok: false,
      motivo: "o BCB respondeu erro 406: Not Acceptable",
      tentativas: 1,
    });
    expect(chamadas).toHaveLength(1);
    expect(esperas).toEqual([]);
  });

  it("erro do SGS sem detalhe: motivo termina no código, sem dois-pontos pendentes", async () => {
    const { opcoes } = preparar([json('{"erro":{"statusCode":400}}', 400)]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({
      ok: false,
      motivo: "o BCB respondeu erro 400",
      tentativas: 1,
    });
  });
});

describe("buscarSerie · resposta inválida (não repete)", () => {
  it("(10) página HTML da série inexistente com status 200: uma tentativa, motivo do intérprete", async () => {
    const { opcoes, chamadas, esperas } = preparar([html(sgsSerieInexistenteHtml)]);
    const resposta = await buscarSerie("433", undefined, opcoes);
    expect(resposta).toMatchObject({
      ok: false,
      motivo:
        "resposta inválida do BCB (HTTP 200): A resposta do BCB não é uma lista JSON (pode ser HTML de erro ou série inexistente).",
      tentativas: 1,
    });
    expect(chamadas).toHaveLength(1);
    expect(esperas).toEqual([]);
  });

  it("JSON fora do formato (data ISO em vez de dd/mm/aaaa) com 200: não repete e cita a data", async () => {
    const { opcoes, esperas } = preparar([json('[{"data":"2026-09-01","valor":"0.82"}]')]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({
      ok: false,
      motivo: "resposta inválida do BCB (HTTP 200): Data inválida na resposta do BCB: 2026-09-01",
      tentativas: 1,
    });
    expect(esperas).toEqual([]);
  });

  it("competência repetida com valores diferentes: falha da série, sem repetir", async () => {
    const { opcoes, chamadas } = preparar([
      json('[{"data":"01/10/2026","valor":"0.36"},{"data":"01/10/2026","valor":"0.58"}]'),
    ]);
    const resposta = await buscarSerie("4390", "2026-10-01", opcoes);
    expect(resposta).toMatchObject({
      ok: false,
      motivo:
        "resposta inválida do BCB (HTTP 200): Competência 2026-10 repetida com valores diferentes (0.36 e 0.58).",
      tentativas: 1,
    });
    expect(chamadas).toHaveLength(1);
  });

  it("HTML com status 4xx (nem erro do SGS nem 5xx): não repete e informa o status", async () => {
    const { opcoes, esperas } = preparar([html("<html>Não encontrado</html>", 404)]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({ ok: false, tentativas: 1 });
    expect(resposta.ok === false && resposta.motivo).toMatch(
      /^resposta inválida do BCB \(HTTP 404\): /,
    );
    expect(esperas).toEqual([]);
  });
});

describe("buscarSerie · falhas que repetem (5xx e sem resposta)", () => {
  it("(6) 502 com página HTML, depois JSON: ok na segunda tentativa, uma espera de 3000 ms", async () => {
    const { opcoes, chamadas, esperas } = preparar([
      html(sgsErro502Html, 502),
      json(sgs433DesdeAgo),
    ]);
    const resposta = await buscarSerie("433", "2026-08-01", opcoes);
    expect(resposta).toEqual({
      ok: true,
      valores: [
        { competencia: "2026-08", valor: "-0.32" },
        { competencia: "2026-09", valor: "0.82" },
      ],
      url: urlDaSerie("433", "2026-08-01"),
      tentativas: 2,
    });
    expect(chamadas).toHaveLength(2);
    expect(chamadas.map((c) => c.url)).toEqual([resposta.url, resposta.url]);
    expect(esperas).toEqual([3000]);
  });

  it("(7) 502 duas vezes: desiste com 'HTTP 502' e duas tentativas", async () => {
    const { opcoes, chamadas, esperas } = preparar([
      html(sgsErro502Html, 502),
      html(sgsErro502Html, 502),
    ]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toEqual({
      ok: false,
      motivo: "o BCB respondeu HTTP 502",
      url: URL_433_DESDE_SET,
      tentativas: 2,
    });
    expect(chamadas).toHaveLength(2);
    expect(esperas).toEqual([3000]);
  });

  it("(8) fetch lança TypeError('Failed to fetch') e depois responde: ok na segunda", async () => {
    const { opcoes, esperas } = preparar([
      { lancar: new TypeError("Failed to fetch") },
      json(sgs433DesdeSet),
    ]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({
      ok: true,
      valores: [{ competencia: "2026-09", valor: "0.82" }],
      tentativas: 2,
    });
    expect(esperas).toEqual([3000]);
  });

  it("(9) tempo esgotado duas vezes (DOMException TimeoutError): ok false com o nome do erro", async () => {
    const tempoEsgotado = () =>
      new DOMException("The operation was aborted due to timeout", "TimeoutError");
    const { opcoes, chamadas, esperas } = preparar([
      { lancar: tempoEsgotado() },
      { lancar: tempoEsgotado() },
    ]);
    const resposta = await buscarSerie("189", "2026-09-01", opcoes);
    expect(resposta).toEqual({
      ok: false,
      motivo: "sem resposta do BCB: TimeoutError",
      url: urlDaSerie("189", "2026-09-01"),
      tentativas: 2,
    });
    expect(resposta.ok === false && resposta.motivo).toContain("TimeoutError");
    expect(chamadas).toHaveLength(2);
    expect(esperas).toEqual([3000]);
  });

  it("AbortError (pedido cancelado) também conta como sem resposta e repete", async () => {
    const { opcoes } = preparar([
      { lancar: new DOMException("The operation was aborted.", "AbortError") },
      json(sgs433DesdeSet),
    ]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({ ok: true, tentativas: 2 });
  });

  it("o último motivo é o que fica: TypeError na primeira e 502 na segunda", async () => {
    const { opcoes } = preparar([
      { lancar: new TypeError("Failed to fetch") },
      html(sgsErro502Html, 502),
    ]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({
      ok: false,
      motivo: "o BCB respondeu HTTP 502",
      tentativas: 2,
    });
  });

  it("falha que repete seguida de erro do SGS: para na segunda, com o motivo do SGS", async () => {
    const { opcoes, esperas } = preparar([
      html(sgsErro502Html, 502),
      json(sgsErro404SemValores, 404),
    ]);
    const resposta = await buscarSerie("433", "2026-11-01", opcoes);
    expect(resposta).toMatchObject({
      ok: false,
      motivo: `o BCB respondeu erro 404: ${ERRO_404_DETALHE}`,
      tentativas: 2,
    });
    expect(esperas).toEqual([3000]);
  });

  it("nunca lança, mesmo quando o fetch lança algo que não é Error", async () => {
    const { opcoes } = preparar([{ lancar: "cabo desligado" }, { lancar: null }]);
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({
      ok: false,
      motivo: "sem resposta do BCB: null",
      tentativas: 2,
    });
  });
});

describe("buscarSerie · opções de tentativas, espera e tempo-limite", () => {
  it("(11) tentativas: 1 nunca repete, nem para 502 nem para falha de rede", async () => {
    const a = preparar([html(sgsErro502Html, 502)], { tentativas: 1 });
    const respostaA = await buscarSerie("433", "2026-09-01", a.opcoes);
    expect(respostaA).toMatchObject({
      ok: false,
      motivo: "o BCB respondeu HTTP 502",
      tentativas: 1,
    });
    expect(a.chamadas).toHaveLength(1);
    expect(a.esperas).toEqual([]);

    const b = preparar([{ lancar: new TypeError("Failed to fetch") }], { tentativas: 1 });
    const respostaB = await buscarSerie("433", "2026-09-01", b.opcoes);
    expect(respostaB).toMatchObject({
      ok: false,
      motivo: "sem resposta do BCB: TypeError",
      tentativas: 1,
    });
    expect(b.chamadas).toHaveLength(1);
    expect(b.esperas).toEqual([]);
  });

  it("tentativas: 3 e esperaMs: 2000 (como no script): três 502 → três tentativas e duas esperas", async () => {
    const { opcoes, chamadas, esperas } = preparar(
      [html(sgsErro502Html, 502), html(sgsErro502Html, 503), html(sgsErro502Html, 502)],
      { tentativas: 3, esperaMs: 2000 },
    );
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({
      ok: false,
      motivo: "o BCB respondeu HTTP 502",
      tentativas: 3,
    });
    expect(chamadas).toHaveLength(3);
    expect(esperas).toEqual([2000, 2000]);
  });

  it("tentativas: 3 recupera na terceira e para de pedir", async () => {
    const { opcoes, chamadas, esperas } = preparar(
      [
        { lancar: new TypeError("Failed to fetch") },
        html(sgsErro502Html, 502),
        json(sgs433DesdeSet),
      ],
      { tentativas: 3 },
    );
    const resposta = await buscarSerie("433", "2026-09-01", opcoes);
    expect(resposta).toMatchObject({ ok: true, tentativas: 3 });
    expect(chamadas).toHaveLength(3);
    expect(esperas).toEqual([3000, 3000]);
  });

  it.each([0, -2, Number.NaN])(
    "tentativas %p vale como uma só (sempre há ao menos um pedido)",
    async (tentativas) => {
      const { opcoes, chamadas, esperas } = preparar([html(sgsErro502Html, 502)], { tentativas });
      const resposta = await buscarSerie("433", "2026-09-01", opcoes);
      expect(resposta).toMatchObject({ ok: false, tentativas: 1 });
      expect(chamadas).toHaveLength(1);
      expect(esperas).toEqual([]);
    },
  );

  it("sem dormir injetado, usa a espera padrão (setTimeout) com o esperaMs informado", async () => {
    const { fetch, chamadas } = fetchFalso([html(sgsErro502Html, 502), json(sgs433DesdeSet)]);
    const resposta = await buscarSerie("433", "2026-09-01", { fetch, esperaMs: 0 });
    expect(resposta).toMatchObject({ ok: true, tentativas: 2 });
    expect(chamadas).toHaveLength(2);
  });

  it("um dormir que lança não impede a repetição nem faz buscarSerie lançar", async () => {
    const { fetch, chamadas } = fetchFalso([html(sgsErro502Html, 502), json(sgs433DesdeSet)]);
    const dormir = (): Promise<void> => Promise.reject(new Error("relógio quebrado"));
    const resposta = await buscarSerie("433", "2026-09-01", { fetch, dormir });
    expect(resposta).toMatchObject({ ok: true, tentativas: 2 });
    expect(chamadas).toHaveLength(2);
  });

  it("tempoLimiteMs aborta pelo AbortSignal.timeout um pedido que nunca responde", async () => {
    const chamadas: ChamadaFetch[] = [];
    // fetch falso que só termina quando o sinal de tempo-limite dispara, como faria a rede parada.
    const fetchParado: typeof globalThis.fetch = (entrada, init) => {
      chamadas.push({ url: String(entrada), init });
      return new Promise<Response>((_, rejeitar) => {
        const sinal = init?.signal;
        if (!sinal) {
          rejeitar(new Error("o pedido veio sem sinal de tempo-limite"));
          return;
        }
        sinal.addEventListener("abort", () => rejeitar(sinal.reason as unknown));
      });
    };
    const { dormir, esperas } = dormirFalso();
    const resposta = await buscarSerie("433", "2026-09-01", {
      fetch: fetchParado,
      dormir,
      tempoLimiteMs: 5,
      tentativas: 1,
    });
    expect(resposta).toMatchObject({
      ok: false,
      motivo: "sem resposta do BCB: TimeoutError",
      tentativas: 1,
    });
    expect(chamadas[0]?.init?.signal).toBeInstanceOf(AbortSignal);
    expect(esperas).toEqual([]);
  });
});

describe("buscarSerie: bordas do tempo-limite e do status 5xx", () => {
  const html = "<!doctype html><title>erro</title>";
  const json = '[{"data":"01/09/2026","valor":"0.82"}]';

  it("HTTP 500 (a fronteira do 5xx) repete como o 502", async () => {
    const respostas = [new Response(html, { status: 500 }), new Response(json, { status: 200 })];
    const esperas: number[] = [];
    const r = await buscarSerie("433", "2026-09-01", {
      fetch: (async () => respostas.shift() ?? new Response("", { status: 500 })) as typeof fetch,
      dormir: async (ms) => void esperas.push(ms),
    });
    expect(r.ok).toBe(true);
    expect(r.tentativas).toBe(2);
    expect(esperas).toEqual([3000]);
  });

  it("cada tentativa recebe um AbortSignal novo, ainda não abortado", async () => {
    const sinais: AbortSignal[] = [];
    let chamadas = 0;
    const r = await buscarSerie("433", "2026-09-01", {
      fetch: (async (_url, init) => {
        sinais.push(init?.signal as AbortSignal);
        chamadas += 1;
        if (chamadas === 1) throw new TypeError("Failed to fetch");
        return new Response(json, { status: 200 });
      }) as typeof fetch,
      dormir: async () => undefined,
    });
    expect(r.ok).toBe(true);
    expect(sinais).toHaveLength(2);
    expect(sinais[0]).toBeInstanceOf(AbortSignal);
    expect(sinais[0]).not.toBe(sinais[1]);
    expect(sinais.every((s) => !s.aborted)).toBe(true);
  });

  it("sem tempoLimiteMs, pede AbortSignal.timeout com os 20 s do padrão", async () => {
    const espiao = vi.spyOn(AbortSignal, "timeout");
    try {
      await buscarSerie("433", "2026-09-01", {
        fetch: (async () => new Response(json, { status: 200 })) as typeof fetch,
      });
      expect(espiao).toHaveBeenCalledWith(20_000);
    } finally {
      espiao.mockRestore();
    }
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Execute: `npm test -- src/indices/cliente-bcb.test.ts`
Esperado: falham exatamente 38 testes e passam 10. Falham os 37 de `buscarSerie` ("buscarSerie is not a function"), inclusive os três casos de "tentativas %p vale como uma só", "HTTP 500 (a fronteira do 5xx) repete como o 502", "objeto de erro do SGS com código 503 no corpo…", "erro 406 do SGS (sintético…)", "cada tentativa recebe um AbortSignal novo, ainda não abortado" e "sem tempoLimiteMs, pede AbortSignal.timeout com os 20 s do padrão"; e falha o antigo "recusa erro em JSON, JSON inválido e data ou valor fora do formato", que agora também exige recusar "01/13/2017" (sem o código, o mês 13 vira a competência "2017-13").

- [ ] **Step 3: Escrever o código**

Substitua `src/indices/cliente-bcb.ts` por:

```ts
import { competenciaValida } from "../compartilhado/datas.ts";
import { textoDecimalValido } from "../compartilhado/decimal.ts";
import type {
  ArquivoSerie,
  CodigoSerie,
  Competencia,
  DataISO,
  TextoDecimal,
} from "../compartilhado/tipos.ts";
import { SERIES, urlDaSerie } from "./series.ts";

export interface ValorMensal {
  competencia: Competencia;
  valor: TextoDecimal;
}

/** Um item de série como gravado em arquivo: competência "AAAA-MM" válida e valor em texto decimal. */
export function ehValorMensalValido(item: unknown): item is ValorMensal {
  if (typeof item !== "object" || item === null) return false;
  const { competencia, valor } = item as { competencia?: unknown; valor?: unknown };
  return (
    typeof competencia === "string" && competenciaValida(competencia) && textoDecimalValido(valor)
  );
}

export interface ErroSgs {
  statusCode: number;
  detail: string;
}

/**
 * Objeto de erro do SGS, `{"erro":{"statusCode":404,"detail":"…Value(s) not found"}}` (intervalo sem
 * dados, data inválida); qualquer outro texto devolve null. O status HTTP não basta: esse corpo já
 * chegou com status 200, servido de cache (verificado em 11/10/2026).
 */
export function interpretarErroSgs(texto: string): ErroSgs | null {
  const aparado = texto.trim();
  if (!aparado.startsWith("{")) return null;
  try {
    const dados = JSON.parse(aparado) as { erro?: { statusCode?: unknown; detail?: unknown } };
    const erro = dados.erro;
    if (typeof erro !== "object" || erro === null || typeof erro.statusCode !== "number")
      return null;
    return {
      statusCode: erro.statusCode,
      detail: typeof erro.detail === "string" ? erro.detail : "",
    };
  } catch {
    return null;
  }
}

export class RespostaSgsInvalida extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "RespostaSgsInvalida";
  }
}

const FORMATO_DATA_BCB = /^\d{2}\/\d{2}\/\d{4}$/;
const FORMATO_VALOR = /^-?\d+(\.\d+)?$/;

/**
 * Interpreta o texto de uma resposta do SGS: exige lista JSON de {data, valor} (recusa HTML e
 * objetos de erro), datas dd/mm/aaaa e valores decimais em texto. Devolve em ordem de competência,
 * sem repetições; repetição com valor diferente é recusada.
 */
export function interpretarRespostaSgs(texto: string): ValorMensal[] {
  const aparado = texto.trim();
  if (!aparado.startsWith("[")) {
    throw new RespostaSgsInvalida(
      "A resposta do BCB não é uma lista JSON (pode ser HTML de erro ou série inexistente).",
    );
  }
  let dados: unknown;
  try {
    dados = JSON.parse(aparado);
  } catch {
    throw new RespostaSgsInvalida("A resposta do BCB não é JSON válido.");
  }
  if (!Array.isArray(dados)) throw new RespostaSgsInvalida("A resposta do BCB não é uma lista.");

  const porCompetencia = new Map<Competencia, TextoDecimal>();
  for (const item of dados) {
    if (typeof item !== "object" || item === null) {
      throw new RespostaSgsInvalida("Registro inválido na resposta do BCB.");
    }
    const { data, valor } = item as { data?: unknown; valor?: unknown };
    if (typeof data !== "string" || !FORMATO_DATA_BCB.test(data)) {
      throw new RespostaSgsInvalida(`Data inválida na resposta do BCB: ${String(data)}`);
    }
    if (typeof valor !== "string" || !FORMATO_VALOR.test(valor)) {
      throw new RespostaSgsInvalida(
        `Valor inválido na resposta do BCB para ${data}: ${String(valor)}`,
      );
    }
    const competencia = `${data.slice(6, 10)}-${data.slice(3, 5)}`;
    if (!competenciaValida(competencia)) {
      throw new RespostaSgsInvalida(`Data inválida na resposta do BCB: ${data}`);
    }
    const existente = porCompetencia.get(competencia);
    if (existente !== undefined && existente !== valor) {
      throw new RespostaSgsInvalida(
        `Competência ${competencia} repetida com valores diferentes (${existente} e ${valor}).`,
      );
    }
    porCompetencia.set(competencia, valor);
  }
  return [...porCompetencia.entries()]
    .map(([competencia, valor]) => ({ competencia, valor }))
    .sort((a, b) => (a.competencia < b.competencia ? -1 : a.competencia > b.competencia ? 1 : 0));
}

/** Conteúdo de `dados/indices/<codigo>.json`. */
export function montarArquivoSerie(
  codigo: CodigoSerie,
  valores: ValorMensal[],
  obtidoEm: string,
): ArquivoSerie {
  return {
    formato: "apura/serie@1",
    codigo,
    nome: SERIES[codigo].descricao,
    origem: urlDaSerie(codigo),
    obtidoEm,
    valores,
  };
}

// ---------------------------------------------------------------------------------------------
// Busca de uma série (usada pela rotina central): tempo-limite por pedido, repetição só para falha de rede,
// tempo esgotado ou HTTP 5xx; a decisão é sempre pelo corpo da resposta, nunca pelo content-type.
// ---------------------------------------------------------------------------------------------

/** Opções de `buscarSerie`; tudo tem padrão, e os testes injetam `fetch` e `dormir` falsos. */
export interface OpcoesBusca {
  /** Função de rede; padrão `globalThis.fetch`. */
  fetch?: typeof globalThis.fetch;
  /** Tempo-limite de cada pedido, em milissegundos; padrão 20 s. */
  tempoLimiteMs?: number;
  /** Número máximo de pedidos, contando o primeiro; padrão 2 (uma repetição). */
  tentativas?: number;
  /** Espera entre um pedido e a repetição, em milissegundos; padrão 3 s. */
  esperaMs?: number;
  /** Como esperar; padrão `setTimeout`. Os testes injetam uma versão que só registra. */
  dormir?: (ms: number) => Promise<void>;
}

export type RespostaBusca =
  | { ok: true; valores: ValorMensal[]; url: string; tentativas: number }
  | { ok: false; motivo: string; url: string; tentativas: number };

const TEMPO_LIMITE_PADRAO_MS = 20_000;
const TENTATIVAS_PADRAO = 2;
const ESPERA_PADRAO_MS = 3_000;

function dormirPadrao(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

/** Resultado de um pedido isolado: os valores, ou o motivo da falha e se vale repetir. */
type ResultadoDoPedido =
  { ok: true; valores: ValorMensal[] } | { ok: false; motivo: string; repetir: boolean };

/** Nome do que o fetch lançou ("TypeError", "TimeoutError", "AbortError"); texto cru se não tiver nome. */
function nomeDoErro(erro: unknown): string {
  if (typeof erro === "object" && erro !== null && "name" in erro) {
    const { name } = erro as { name?: unknown };
    if (typeof name === "string" && name !== "") return name;
  }
  return String(erro);
}

/**
 * Decide pelo corpo, na ordem: lista JSON válida → ok (mesmo com status diferente de 200); objeto de
 * erro do SGS (404 sem valores, 400 data inválida) → falha definitiva, mesmo que o status seja 200,
 * salvo erro 5xx, que repete; status 5xx (página HTML do BCB) → falha que repete; o resto (HTML com 200, JSON fora do
 * formato) → falha definitiva com a mensagem do intérprete.
 */
function decidirPeloCorpo(status: number, texto: string): ResultadoDoPedido {
  let mensagemInvalida: string;
  try {
    return { ok: true, valores: interpretarRespostaSgs(texto) };
  } catch (erro) {
    mensagemInvalida = erro instanceof Error ? erro.message : String(erro);
  }
  const erroSgs = interpretarErroSgs(texto);
  if (erroSgs !== null) {
    const detalhe = erroSgs.detail === "" ? "" : `: ${erroSgs.detail}`;
    return {
      ok: false,
      motivo: `o BCB respondeu erro ${erroSgs.statusCode}${detalhe}`,
      // Erro do próprio servidor (5xx, no status HTTP ou no corpo) pode ser passageiro: repete.
      repetir: status >= 500 || erroSgs.statusCode >= 500,
    };
  }
  if (status >= 500) {
    return { ok: false, motivo: `o BCB respondeu HTTP ${status}`, repetir: true };
  }
  return {
    ok: false,
    motivo: `resposta inválida do BCB (HTTP ${status}): ${mensagemInvalida}`,
    repetir: false,
  };
}

/**
 * Um pedido: GET simples, sem cabeçalhos, com tempo-limite. Lê o texto sempre.
 */
async function pedirUmaVez(
  fazerPedido: typeof globalThis.fetch,
  url: string,
  tempoLimiteMs: number,
): Promise<ResultadoDoPedido> {
  let status: number;
  let texto: string;
  try {
    const resposta = await fazerPedido(url, { signal: AbortSignal.timeout(tempoLimiteMs) });
    status = resposta.status;
    texto = await resposta.text();
  } catch (erro) {
    // Falha de rede (TypeError), tempo esgotado (TimeoutError) ou pedido cancelado (AbortError).
    return { ok: false, motivo: `sem resposta do BCB: ${nomeDoErro(erro)}`, repetir: true };
  }
  return decidirPeloCorpo(status, texto);
}

/**
 * Busca uma série no SGS a partir de `dataInicial` (ou o histórico completo, sem ela). Nunca lança:
 * devolve `ok: false` com o motivo em texto e o número de tentativas feitas. Repete (após `esperaMs`)
 * só quando não houve resposta ou o BCB respondeu 5xx; erro do SGS e corpo inválido não repetem.
 */
export async function buscarSerie(
  codigo: CodigoSerie,
  dataInicial: DataISO | undefined,
  opcoes: OpcoesBusca = {},
): Promise<RespostaBusca> {
  const fazerPedido = opcoes.fetch ?? globalThis.fetch;
  const tempoLimiteMs = opcoes.tempoLimiteMs ?? TEMPO_LIMITE_PADRAO_MS;
  const esperaMs = opcoes.esperaMs ?? ESPERA_PADRAO_MS;
  const dormir = opcoes.dormir ?? dormirPadrao;
  // Sempre há ao menos um pedido: 0, negativo ou NaN valem como uma tentativa só.
  const maximo = Math.max(1, Math.floor(opcoes.tentativas ?? TENTATIVAS_PADRAO) || 1);
  const url = urlDaSerie(codigo, dataInicial);

  for (let tentativa = 1; ; tentativa += 1) {
    const resultado = await pedirUmaVez(fazerPedido, url, tempoLimiteMs);
    if (resultado.ok) {
      return { ok: true, valores: resultado.valores, url, tentativas: tentativa };
    }
    if (!resultado.repetir || tentativa >= maximo) {
      return { ok: false, motivo: resultado.motivo, url, tentativas: tentativa };
    }
    try {
      await dormir(esperaMs);
    } catch {
      // Um `dormir` que falha não impede a repetição: segue sem esperar.
    }
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Execute: `npm run format && npm run verificar`
Esperado: tudo verde; 18 arquivos de teste, 479 passando | 9 pulados (488).

- [ ] **Step 5: Commit**

```bash
git add src/indices/cliente-bcb.ts src/indices/cliente-bcb.test.ts
git commit -m "indices: busca de série no SGS com tempo-limite, repetição e decisão pelo corpo da resposta

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```


### Task 5: Arquivos de série: leitura que confere cada item, comparação de séries (encolheu, alterados, novos) e as seis séries embutidas

**Files:**
- Create: `src/indices/arquivo-serie.ts`
- Modify: `src/indices/embutidos.ts` (reescrito)
- Test: `src/indices/arquivo-serie.test.ts` (novo), `src/indices/embutidos.test.ts` (reescrito)

**Interfaces:**
- Consome: `ehValorMensalValido`, `ValorMensal` (Task 1), `compararInstantes` (Task 2), `formatarCompetencia`; tipos `ArquivoSerie`, `CodigoSerie`, `Competencia`, `TabelaIndices`, `TextoDecimal`, `ValorIndice`; os seis JSON de `dados/indices/`.
- Produz:
  - Em `arquivo-serie.ts` (módulo que **não** importa os JSON embutidos, para que o script da rotina inicie mesmo quando um arquivo falta ou está corrompido, e possa regravá-lo):
    - `lerArquivoSerie(dado: unknown, codigo): ArquivoSerie` — confere `typeof` antes de qualquer cast e cada item de `valores`; mensagens "Arquivo da série <codigo> em formato inesperado." e "Arquivo da série <codigo> com valor inválido em <competência ou posição>." (Task 8).
    - `interface ComparacaoDeSerie { encolheu; motivo?; alterados: Array<{ competencia; antes; depois }>; novos: Competencia[] }` e `compararSeries(atual: ValorMensal[], nova: ValorMensal[]): ComparacaoDeSerie` — encolheu quando a nova veio vazia, começa depois, termina antes, tem menos meses ou perdeu um mês do meio; alterados = mesmas competências com valor diferente (comparação textual); novos = competências que a atual não tinha; `atual` vazia nunca encolhe (Task 8).
  - Em `embutidos.ts`: `seriesEmbutidas(): Record<CodigoSerie, ArquivoSerie>` — os seis arquivos conferidos (Task 7); `tabelaEmbutida(): TabelaIndices` — como antes, sem `esperadoAte`, com `consultadoEm` = obtenção mais recente comparada pelo instante.

Pendências das fases 1 e 3 fechadas aqui: o leitor conferia só o envelope e fazia o cast antes do `typeof`; o script precisa recusar série que encolheu e avisar valores históricos alterados. O quinto motivo de "encolheu" (mês do meio perdido) cobre o caso em que a lista nova mantém as pontas e repõe a contagem com meses novos, que os outros quatro não enxergam: sem ele, a rotina gravaria um arquivo com buraco.

- [ ] **Step 1: Escrever os testes**

Crie `src/indices/arquivo-serie.test.ts` (20 testes):

```ts
import { describe, expect, it } from "vitest";
import { compararSeries, lerArquivoSerie } from "./arquivo-serie.ts";
import type { ValorMensal } from "./cliente-bcb.ts";

describe("lerArquivoSerie: envelope e itens", () => {
  const envelope = {
    formato: "apura/serie@1",
    codigo: "433",
    nome: "IPCA (IBGE), variação % mensal",
    origem: "https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json",
    obtidoEm: "2026-10-11T14:02:00-03:00",
  };
  const valido = { competencia: "2026-09", valor: "0.82" };

  it("recusa o que não é objeto antes de olhar os campos (texto, número, undefined, lista)", () => {
    for (const dado of ["texto", 42, undefined, true, []]) {
      expect(() => lerArquivoSerie(dado, "433")).toThrow(
        "Arquivo da série 433 em formato inesperado.",
      );
    }
  });

  it("recusa obtidoEm que não é texto e valores que não é lista", () => {
    expect(() => lerArquivoSerie({ ...envelope, obtidoEm: 2026, valores: [] }, "433")).toThrow(
      "Arquivo da série 433 em formato inesperado.",
    );
    expect(() => lerArquivoSerie({ ...envelope, valores: {} }, "433")).toThrow(
      "Arquivo da série 433 em formato inesperado.",
    );
  });

  it("aceita itens válidos (inclusive negativos) e devolve o arquivo com os mesmos valores", () => {
    const valores = [valido, { competencia: "2026-10", valor: "-0.10" }];
    const arquivo = lerArquivoSerie({ ...envelope, valores }, "433");
    expect(arquivo.codigo).toBe("433");
    expect(arquivo.obtidoEm).toBe("2026-10-11T14:02:00-03:00");
    expect(arquivo.valores).toEqual(valores);
  });

  it("recusa item com competência inválida, nomeando a competência", () => {
    expect(() =>
      lerArquivoSerie(
        { ...envelope, valores: [valido, { competencia: "2017-13", valor: "0.64" }] },
        "433",
      ),
    ).toThrow("Arquivo da série 433 com valor inválido em 2017-13.");
  });

  it("recusa valor numérico, com vírgula ou ausente, nomeando a competência", () => {
    expect(() =>
      lerArquivoSerie({ ...envelope, valores: [{ competencia: "2026-09", valor: 0.82 }] }, "433"),
    ).toThrow("Arquivo da série 433 com valor inválido em 2026-09.");
    expect(() =>
      lerArquivoSerie({ ...envelope, valores: [{ competencia: "2026-09", valor: "0,82" }] }, "433"),
    ).toThrow("Arquivo da série 433 com valor inválido em 2026-09.");
    expect(() =>
      lerArquivoSerie({ ...envelope, valores: [{ competencia: "2026-09" }] }, "433"),
    ).toThrow("Arquivo da série 433 com valor inválido em 2026-09.");
  });

  it("recusa item que não é objeto ou sem competência em texto, nomeando a posição (a partir de 1)", () => {
    expect(() => lerArquivoSerie({ ...envelope, valores: [valido, null] }, "433")).toThrow(
      "Arquivo da série 433 com valor inválido em posição 2.",
    );
    expect(() => lerArquivoSerie({ ...envelope, valores: ["0.82"] }, "433")).toThrow(
      "Arquivo da série 433 com valor inválido em posição 1.",
    );
    expect(() => lerArquivoSerie({ ...envelope, valores: [{ valor: "0.82" }] }, "433")).toThrow(
      "Arquivo da série 433 com valor inválido em posição 1.",
    );
    expect(() =>
      lerArquivoSerie(
        { ...envelope, valores: [valido, valido, { competencia: 202609, valor: "0.82" }] },
        "433",
      ),
    ).toThrow("Arquivo da série 433 com valor inválido em posição 3.");
  });
});

describe("compararSeries", () => {
  const atual: ValorMensal[] = [
    { competencia: "2026-07", valor: "0.26" },
    { competencia: "2026-08", valor: "-0.11" },
    { competencia: "2026-09", valor: "0.82" },
  ];

  it("não encolhe nem muda quando a nova é igual à atual", () => {
    expect(compararSeries(atual, [...atual])).toEqual({
      encolheu: false,
      alterados: [],
      novos: [],
    });
  });

  it("encolheu quando a nova veio vazia, com o motivo em frase", () => {
    const comparacao = compararSeries(atual, []);
    expect(comparacao.encolheu).toBe(true);
    expect(comparacao.motivo).toBe("a lista nova veio vazia");
    expect(comparacao.alterados).toEqual([]);
    expect(comparacao.novos).toEqual([]);
  });

  it("encolheu quando o primeiro mês da nova é posterior ao da atual (e ainda lista os novos)", () => {
    const comparacao = compararSeries(atual, [
      { competencia: "2026-08", valor: "-0.11" },
      { competencia: "2026-09", valor: "0.82" },
      { competencia: "2026-10", valor: "0.30" },
    ]);
    expect(comparacao.encolheu).toBe(true);
    expect(comparacao.motivo).toBe(
      "a lista nova começa em ago/2026, depois do primeiro mês atual (jul/2026)",
    );
    expect(comparacao.alterados).toEqual([]);
    expect(comparacao.novos).toEqual(["2026-10"]);
  });

  it("encolheu quando o último mês da nova é anterior ao da atual", () => {
    const comparacao = compararSeries(atual, [
      { competencia: "2026-06", valor: "0.10" },
      { competencia: "2026-07", valor: "0.26" },
      { competencia: "2026-08", valor: "-0.11" },
    ]);
    expect(comparacao.encolheu).toBe(true);
    expect(comparacao.motivo).toBe(
      "a lista nova termina em ago/2026, antes do último mês atual (set/2026)",
    );
    expect(comparacao.novos).toEqual(["2026-06"]);
  });

  it("encolheu quando a nova tem menos meses, mesmo cobrindo as duas pontas", () => {
    const comparacao = compararSeries(atual, [
      { competencia: "2026-07", valor: "0.26" },
      { competencia: "2026-09", valor: "0.82" },
    ]);
    expect(comparacao.encolheu).toBe(true);
    expect(comparacao.motivo).toBe("a lista nova tem 2 meses e a atual tem 3");
    expect(comparacao.alterados).toEqual([]);
    expect(comparacao.novos).toEqual([]);
  });

  it("encolheu quando a nova perdeu um mês do meio, mesmo mantendo as pontas e a contagem", () => {
    const comparacao = compararSeries(atual, [
      { competencia: "2026-07", valor: "0.26" },
      { competencia: "2026-09", valor: "0.82" },
      { competencia: "2026-10", valor: "0.30" },
    ]);
    expect(comparacao.encolheu).toBe(true);
    expect(comparacao.motivo).toBe("a lista nova perdeu ago/2026");
    expect(comparacao.alterados).toEqual([]);
    expect(comparacao.novos).toEqual(["2026-10"]);
  });

  it("nomeia todos os meses perdidos do meio quando são mais de um", () => {
    const comparacao = compararSeries(
      [{ competencia: "2026-06", valor: "0.10" }, ...atual],
      [
        { competencia: "2026-06", valor: "0.10" },
        { competencia: "2026-09", valor: "0.82" },
        { competencia: "2026-10", valor: "0.30" },
        { competencia: "2026-11", valor: "0.25" },
      ],
    );
    expect(comparacao.encolheu).toBe(true);
    expect(comparacao.motivo).toBe("a lista nova perdeu jul/2026 e ago/2026");
  });

  it("não encolhe quando a nova tem os mesmos meses mais um antes e um depois", () => {
    const comparacao = compararSeries(atual, [
      { competencia: "2026-06", valor: "0.10" },
      ...atual,
      { competencia: "2026-10", valor: "0.30" },
    ]);
    expect(comparacao.encolheu).toBe(false);
    expect(comparacao.motivo).toBeUndefined();
    expect(comparacao.novos).toEqual(["2026-06", "2026-10"]);
  });

  it("lista os meses alterados com o valor antigo e o novo, sem encolher", () => {
    const comparacao = compararSeries(atual, [
      { competencia: "2026-07", valor: "0.26" },
      { competencia: "2026-08", valor: "-0.11" },
      { competencia: "2026-09", valor: "0.85" },
    ]);
    expect(comparacao).toEqual({
      encolheu: false,
      alterados: [{ competencia: "2026-09", antes: "0.82", depois: "0.85" }],
      novos: [],
    });
  });

  it("lista os meses novos em ordem crescente mesmo que a nova venha fora de ordem", () => {
    const comparacao = compararSeries(atual, [
      ...atual,
      { competencia: "2026-11", valor: "0.25" },
      { competencia: "2026-10", valor: "0.30" },
    ]);
    expect(comparacao).toEqual({
      encolheu: false,
      alterados: [],
      novos: ["2026-10", "2026-11"],
    });
  });

  it("alterados e novos juntos, alterados em ordem de competência", () => {
    const comparacao = compararSeries(atual, [
      { competencia: "2026-10", valor: "0.30" },
      { competencia: "2026-09", valor: "0.85" },
      { competencia: "2026-08", valor: "-0.11" },
      { competencia: "2026-07", valor: "0.27" },
    ]);
    expect(comparacao).toEqual({
      encolheu: false,
      alterados: [
        { competencia: "2026-07", antes: "0.26", depois: "0.27" },
        { competencia: "2026-09", antes: "0.82", depois: "0.85" },
      ],
      novos: ["2026-10"],
    });
  });

  it('valor igual em texto diferente conta como alterado ("0.8" e "0.80"): a comparação é textual', () => {
    const comparacao = compararSeries(
      [{ competencia: "2026-09", valor: "0.80" }],
      [{ competencia: "2026-09", valor: "0.8" }],
    );
    expect(comparacao.alterados).toEqual([
      { competencia: "2026-09", antes: "0.80", depois: "0.8" },
    ]);
  });

  it("competência repetida na nova com o mesmo valor não conta como alteração nem como encolhimento", () => {
    expect(compararSeries(atual, [...atual, { competencia: "2026-09", valor: "0.82" }])).toEqual({
      encolheu: false,
      alterados: [],
      novos: [],
    });
  });

  it("atual vazia nunca encolhe: tudo da nova é novo, e duas vazias não mudam nada", () => {
    expect(compararSeries([], atual)).toEqual({
      encolheu: false,
      alterados: [],
      novos: ["2026-07", "2026-08", "2026-09"],
    });
    expect(compararSeries([], [])).toEqual({ encolheu: false, alterados: [], novos: [] });
  });
});
```

Substitua `src/indices/embutidos.test.ts` por (9 testes: os 6 antigos, com `lerArquivoSerie` importado do módulo novo, e 3 de `seriesEmbutidas`):

```ts
import { describe, expect, it } from "vitest";
import type { CasoDeReferencia } from "../compartilhado/tipos.ts";
import { calcular } from "../motor/calcular.ts";
import textoDoCaso from "../motor/casos/2018-05-25-saj-tjms-alimentos.json?raw";
import { lerArquivoSerie } from "./arquivo-serie.ts";
import { seriesEmbutidas, tabelaEmbutida } from "./embutidos.ts";
import { compararInstantes } from "./relogio.ts";

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
    expect(tabela.series["1619"]?.["1990-02"]?.valor).toBe("2004.37");
    expect(tabela.series["1619"]?.["2017-01"]?.valor).toBe("937.00");
    expect(tabela.series["1619"]?.["2018-01"]?.valor).toBe("954.00");
    expect(tabela.series["1619"]?.["2023-04"]?.valor).toBe("1302.00");
    expect(tabela.series["1619"]?.["2023-05"]?.valor).toBe("1320.00");
    expect(tabela.series["1619"]?.["2024-01"]?.valor).toBe("1412.00");
    expect(tabela.series["1619"]?.["2025-01"]?.valor).toBe("1518.00");
    expect(tabela.series["1619"]?.["2026-01"]?.valor).toBe("1621.00");
    // Os meses futuros do ano vêm publicados: dezembro do ano do último mês tem valor.
    const ultimoMinimo = Object.keys(tabela.series["1619"] ?? {})
      .sort()
      .at(-1);
    expect(ultimoMinimo).toMatch(/^\d{4}-12$/);
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
        expect(compararInstantes(v.obtidoEm, tabela.consultadoEm)).toBeLessThanOrEqual(0);
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

describe("seriesEmbutidas", () => {
  it("devolve os seis arquivos, cada um com o código da sua chave, formato apura/serie@1 e valores", () => {
    const series = seriesEmbutidas();
    expect(Object.keys(series).sort()).toEqual(["1619", "188", "189", "29543", "433", "4390"]);
    for (const [codigo, arquivo] of Object.entries(series)) {
      expect(arquivo.codigo).toBe(codigo);
      expect(arquivo.formato).toBe("apura/serie@1");
      expect(arquivo.valores.length).toBeGreaterThan(0);
      expect(arquivo.obtidoEm).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it("a tabela embutida nasce dos mesmos arquivos e não traz esperadoAte", () => {
    const series = seriesEmbutidas();
    const tabela = tabelaEmbutida();
    expect("esperadoAte" in tabela).toBe(false);
    expect(tabela.esperadoAte).toBeUndefined();
    const ipca = series["433"];
    const ultimo = ipca.valores.at(-1);
    if (ultimo === undefined) throw new Error("IPCA embutido sem valores");
    expect(tabela.series["433"]?.[ultimo.competencia]).toEqual({
      valor: ultimo.valor,
      fonte: "embutida",
      obtidoEm: ipca.obtidoEm,
    });
    expect(Object.keys(tabela.series["433"] ?? {})).toHaveLength(ipca.valores.length);
    const maiorObtidoEm = Object.values(series)
      .map((arquivo) => arquivo.obtidoEm)
      .sort(compararInstantes)
      .at(-1);
    expect(tabela.consultadoEm).toBe(maiorObtidoEm);
  });

  it("devolve uma cópia: tirar uma série do objeto devolvido não afeta a próxima chamada", () => {
    const copia: Partial<ReturnType<typeof seriesEmbutidas>> = seriesEmbutidas();
    delete copia["433"];
    expect(seriesEmbutidas()["433"].codigo).toBe("433");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Execute: `npm test -- src/indices/arquivo-serie.test.ts src/indices/embutidos.test.ts`
Esperado: os dois arquivos falham ao carregar ("Cannot find module './arquivo-serie.ts'"); nenhum teste roda.

- [ ] **Step 3: Escrever o código**

Crie `src/indices/arquivo-serie.ts`:

```ts
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
```

Substitua `src/indices/embutidos.ts` por:

```ts
import { compararInstantes } from "./relogio.ts";
import type {
  ArquivoSerie,
  CodigoSerie,
  Competencia,
  TabelaIndices,
  ValorIndice,
} from "../compartilhado/tipos.ts";
import { lerArquivoSerie } from "./arquivo-serie.ts";
import inpc from "../../dados/indices/188.json" with { type: "json" };
import igpm from "../../dados/indices/189.json" with { type: "json" };
import ipca from "../../dados/indices/433.json" with { type: "json" };
import salarioMinimo from "../../dados/indices/1619.json" with { type: "json" };
import taxaLegal from "../../dados/indices/29543.json" with { type: "json" };
import selic from "../../dados/indices/4390.json" with { type: "json" };

/** As seis séries do catálogo (§8.1), com cópia embutida gerada por `scripts/atualizar-indices.ts`. */
const ARQUIVOS: Record<CodigoSerie, ArquivoSerie> = {
  "188": lerArquivoSerie(inpc, "188"),
  "189": lerArquivoSerie(igpm, "189"),
  "433": lerArquivoSerie(ipca, "433"),
  "1619": lerArquivoSerie(salarioMinimo, "1619"),
  "29543": lerArquivoSerie(taxaLegal, "29543"),
  "4390": lerArquivoSerie(selic, "4390"),
};

/** Os seis arquivos embutidos, já conferidos, por código (cópia rasa: quem recebe pode trocar séries sem afetar as demais chamadas). */
export function seriesEmbutidas(): Record<CodigoSerie, ArquivoSerie> {
  return { ...ARQUIVOS };
}

/**
 * Tabela de índices montada só com a cópia embutida, sem o calendário (`esperadoAte`). `consultadoEm`
 * é a data de obtenção mais recente entre os arquivos (comparada pelo instante). O app usa
 * `congelarIndices` (`src/indices/congelar.ts`), que acrescenta o calendário.
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
    if (consultadoEm === "" || compararInstantes(arquivo.obtidoEm, consultadoEm) > 0) {
      consultadoEm = arquivo.obtidoEm;
    }
  }
  return { consultadoEm, series };
}
```

- [ ] **Step 4: Rodar e ver passar**

Execute: `npm run format && npm run verificar`
Esperado: tudo verde; 19 arquivos de teste, 502 passando | 9 pulados (511).

- [ ] **Step 5: Commit**

```bash
git add src/indices/arquivo-serie.ts src/indices/arquivo-serie.test.ts src/indices/embutidos.ts src/indices/embutidos.test.ts
git commit -m "indices: leitura e comparação de arquivos de série num módulo próprio e as seis séries embutidas

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```


### Task 6: Motor: mês parcial da SELIC pelo `obtidoEm` do valor e avisos "ainda sem divulgação", com a previsão, quando a tabela traz o calendário

**Files:**
- Modify: `src/motor/correcao.ts`, `src/motor/calcular.ts`, `src/motor/juros.ts`, `src/motor/base.ts` (os quatro reescritos)
- Test: `src/motor/correcao.test.ts`, `src/motor/calcular.test.ts`, `src/motor/juros.test.ts`, `src/motor/base.test.ts`

**Interfaces:**
- Consome: `TabelaIndices.esperadoAte` (Task 1); `aindaNaoDivulgado` e `divulgacaoPrevista` (Task 3, de `src/compartilhado/divulgacao.ts`); `competenciaDe`; as fixtures `tabelaRegimeNovo` e `tabelaIgpm` (inalteradas).
- Produz:
  - `resolverIndicesMensais` marca como parcial o mês da SELIC igual ao mês de `obtidoEm` do próprio valor (antes: o mês de `tabela.consultadoEm`).
  - Avisos novos quando a tabela traz `esperadoAte` (sem ele, nada muda e nenhum teste ou caso de referência existente altera texto). Para o mês posterior ao esperado (`aindaNaoDivulgado`): no lançamento, "IPCA de out/2026 ainda sem divulgação na data da consulta (previsão: por volta de 10/11/2026): o mês entrou sem correção (fator 1,000000)." e "Taxa legal de nov/2026 ainda sem divulgação na data da consulta (previsão: no 1º dia útil de nov/2026): os dias de 01/11/2026 a 10/11/2026 ficaram sem juros."; no reajuste por índice, "IPCA de out/2026 ainda sem divulgação na data da consulta (previsão: por volta de 10/11/2026): o reajuste de nov/2026 não foi aplicado; a prestação mantém R$ 500,00." (com vários meses, "(previsão para nov/2026: …)"); no salário mínimo, "Salário mínimo de jan/2027 ainda não publicado na data da consulta (previsão: no início de 2027, com o decreto do salário mínimo): usado o de dez/2026 (R$ 1.621,00), vigente até a publicação do novo."; resumos próprios no resultado ("Meses ainda sem divulgação na data da consulta (entraram sem correção): …", "Meses de taxa legal ainda sem divulgação (os dias desses meses ficaram sem juros): …", "Meses ainda sem divulgação para o valor-base das prestações (ver o aviso de cada uma): …"), e os resumos genéricos ficam só com os demais meses. Buraco de dados no salário mínimo (o calendário diz que o mês já deveria existir): "Salário mínimo de jun/2026 não consta na tabela de índices: usado o de mai/2026 (R$ 1.621,00), o último anterior disponível.", memória com "último anterior disponível: mai/2026". Sem calendário para a série 1619, o texto antigo ("ainda não publicado na tabela de índices…") continua.
  - A Task 7 preenche `esperadoAte` em toda tabela montada pelo app e lê `indicesUsados` (inalterado).

São as duas únicas mudanças do motor nesta fase, ambas por pendência registrada: (1) fase 2 → 4, fuso e mês parcial da SELIC: a rotina grava série por série, e a SELIC pode ficar para trás enquanto o IPCA atualiza; a data da tabela não diria mais qual mês da SELIC é parcial, e cada valor passa a dizer por si (a data de obtenção é gravada no horário de Brasília pela rotina, Task 8; os arquivos atuais, de 11/10/2026 às 20:11 em Brasília, já dão o mês certo); (2) fases 1 e 3 → 4, distinguir "ainda não divulgado" de "faltante" (§6.4, item 3) e a lacuna no meio da série do salário mínimo. "Ainda sem divulgação" é a forma neutra que serve a IPCA, SELIC e taxa legal; a previsão segue a decisão D7 (dia aproximado nos avisos).

- [ ] **Step 1: Escrever os testes**

Em `src/motor/correcao.test.ts`, acrescente ao fim do arquivo:

```ts

describe("mês parcial da SELIC pelo obtidoEm do próprio valor (fase 4)", () => {
  const consultadaEmNovembro = (): TabelaIndices => ({
    ...tabelaRegimeNovo(),
    consultadoEm: "2026-11-05T10:00:00-03:00",
  });

  it("SELIC de out/2026 obtida em out/2026 é parcial mesmo com a tabela consultada em nov/2026", () => {
    const tabela = consultadaEmNovembro();
    tabela.series["4390"]!["2026-10"] = {
      valor: "0.36",
      fonte: "embutida",
      obtidoEm: "2026-10-11T20:11:55-03:00",
    };
    expect(resolverIndicesMensais(metodologiaSelicUnica(), tabela, "2026-09", "2026-10")).toEqual([
      { competencia: "2026-09", serie: "4390", valor: "1.08" },
      { competencia: "2026-10", serie: "4390", valor: "0.36", parcial: true },
    ]);
  });

  it("SELIC de out/2026 obtida em nov/2026 é o mês fechado, não parcial; o parcial passa a ser nov/2026", () => {
    const tabela = consultadaEmNovembro();
    tabela.series["4390"]!["2026-10"] = {
      valor: "1.15",
      fonte: "embutida",
      obtidoEm: "2026-11-05T10:00:00-03:00",
    };
    tabela.series["4390"]!["2026-11"] = {
      valor: "0.14",
      fonte: "embutida",
      obtidoEm: "2026-11-05T10:00:00-03:00",
    };
    expect(resolverIndicesMensais(metodologiaSelicUnica(), tabela, "2026-10", "2026-11")).toEqual([
      { competencia: "2026-10", serie: "4390", valor: "1.15" },
      { competencia: "2026-11", serie: "4390", valor: "0.14", parcial: true },
    ]);
  });

  it("só a SELIC tem mês parcial: o IPCA obtido no mês da própria competência não é marcado", () => {
    const tabela = tabelaRegimeNovo();
    tabela.series["433"]!["2026-09"] = {
      valor: "0.82",
      fonte: "embutida",
      obtidoEm: "2026-09-30T10:00:00-03:00",
    };
    expect(resolverIndicesMensais(metodologiaPadrao(), tabela, "2026-09", "2026-09")).toEqual([
      { competencia: "2026-09", serie: "433", valor: "0.82" },
    ]);
  });

  it("SELIC sem valor no mês da obtenção fica sem valor e sem a marca de parcial", () => {
    expect(
      resolverIndicesMensais(
        metodologiaSelicUnica(),
        tabelaRegimeNovo({ "4390": "2026-08" }),
        "2026-10",
        "2026-10",
      ),
    ).toEqual([{ competencia: "2026-10", serie: "4390", valor: null }]);
  });
});
```

Em `src/motor/juros.test.ts`, troque o início do arquivo

```ts
import { describe, expect, it } from "vitest";
import { paraTexto } from "../compartilhado/decimal.ts";
import type { Metodologia } from "../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../metodologias/padrao.ts";
import { jurosSimples } from "./juros.ts";
import { tabelaIgpm } from "./testes/indices-igpm-2017-2018.ts";
```

por

```ts
import { describe, expect, it } from "vitest";
import { paraTexto } from "../compartilhado/decimal.ts";
import type { Metodologia, TabelaIndices } from "../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../metodologias/padrao.ts";
import { jurosSimples } from "./juros.ts";
import { tabelaIgpm } from "./testes/indices-igpm-2017-2018.ts";
```

e acrescente ao fim do arquivo:

```ts

describe("jurosSimples (fase 4: taxa legal ainda sem divulgação na data da consulta)", () => {
  const padrao = metodologiaPadrao();
  const ESPERADO_ATE: TabelaIndices["esperadoAte"] = {
    "188": "2026-09",
    "189": "2026-09",
    "433": "2026-09",
    "1619": "2026-12",
    "29543": "2026-10",
    "4390": "2026-10",
  };
  const comCalendario = (limites: Parameters<typeof tabelaRegimeNovo>[0] = {}): TabelaIndices => ({
    ...tabelaRegimeNovo(limites),
    esperadoAte: ESPERADO_ATE,
  });

  it("mês posterior ao esperado pelo calendário: aviso de 'ainda não divulgada', dias sem juros", () => {
    const r = jurosSimples({
      metodologia: padrao,
      indices: comCalendario(),
      casas: 6,
      termoInicial: "2026-10-01",
      termoFinal: "2026-11-11",
    });
    expect(r.detalhe).toEqual([
      {
        regime: "taxaLegal",
        de: "2026-10-01",
        ate: "2026-10-31",
        dias: 31,
        diasDoMes: 31,
        taxa: "0.379020",
        percentual: "0.379020",
      },
    ]);
    expect(paraTexto(r.percentual, 6)).toBe("0.379020");
    expect(r.avisos).toEqual([
      "Taxa legal de nov/2026 ainda sem divulgação na data da consulta (previsão: no 1º dia útil de nov/2026): os dias de 01/11/2026 a 10/11/2026 ficaram sem juros.",
    ]);
    expect(r.mesesSemTaxaLegal).toEqual(["2026-11"]);
  });

  it("buraco na tabela num mês já esperado pelo calendário: aviso genérico de 'não disponível'", () => {
    const tabela = comCalendario();
    delete tabela.series["29543"]?.["2026-09"];
    const r = jurosSimples({
      metodologia: padrao,
      indices: tabela,
      casas: 6,
      termoInicial: "2026-09-01",
      termoFinal: "2026-09-30",
    });
    expect(r.avisos).toEqual([
      "Taxa legal de set/2026 não disponível na tabela de índices: os dias de 01/09/2026 a 29/09/2026 ficaram sem juros.",
    ]);
    expect(r.mesesSemTaxaLegal).toEqual(["2026-09"]);
    expect(r.detalhe).toEqual([]);
  });

  it("buraco e mês ainda não divulgado no mesmo trecho: um aviso de cada tipo, na ordem dos meses", () => {
    const tabela = comCalendario();
    delete tabela.series["29543"]?.["2026-09"];
    const r = jurosSimples({
      metodologia: padrao,
      indices: tabela,
      casas: 6,
      termoInicial: "2026-09-15",
      termoFinal: "2026-11-11",
    });
    expect(r.avisos).toEqual([
      "Taxa legal de set/2026 não disponível na tabela de índices: os dias de 15/09/2026 a 30/09/2026 ficaram sem juros.",
      "Taxa legal de nov/2026 ainda sem divulgação na data da consulta (previsão: no 1º dia útil de nov/2026): os dias de 01/11/2026 a 10/11/2026 ficaram sem juros.",
    ]);
    expect(r.mesesSemTaxaLegal).toEqual(["2026-09", "2026-11"]);
    expect(r.detalhe.map((d) => d.de)).toEqual(["2026-10-01"]);
  });

  it("mês esperado pelo calendário mas ausente da tabela é 'não disponível'; o seguinte, 'ainda não divulgada'", () => {
    const r = jurosSimples({
      metodologia: padrao,
      indices: comCalendario({ "29543": "2026-09" }),
      casas: 6,
      termoInicial: "2026-10-01",
      termoFinal: "2026-11-11",
    });
    expect(r.avisos).toEqual([
      "Taxa legal de out/2026 não disponível na tabela de índices: os dias de 01/10/2026 a 31/10/2026 ficaram sem juros.",
      "Taxa legal de nov/2026 ainda sem divulgação na data da consulta (previsão: no 1º dia útil de nov/2026): os dias de 01/11/2026 a 10/11/2026 ficaram sem juros.",
    ]);
    expect(r.mesesSemTaxaLegal).toEqual(["2026-10", "2026-11"]);
  });

  it("esperadoAte parcial sem a taxa legal (só o IPCA): o aviso continua o genérico", () => {
    const tabela: TabelaIndices = {
      ...tabelaRegimeNovo({ "29543": "2026-09" }),
      esperadoAte: { "433": "2026-09" },
    };
    const r = jurosSimples({
      metodologia: padrao,
      indices: tabela,
      casas: 6,
      termoInicial: "2026-10-01",
      termoFinal: "2026-10-11",
    });
    expect(r.avisos).toEqual([
      "Taxa legal de out/2026 não disponível na tabela de índices: os dias de 01/10/2026 a 10/10/2026 ficaram sem juros.",
    ]);
  });

  it("o calendário não interfere no regime antigo nem na SELIC única", () => {
    const antigo = jurosSimples({
      metodologia: padrao,
      indices: comCalendario(),
      casas: 6,
      termoInicial: "2024-03-10",
      termoFinal: "2024-08-29",
    });
    expect(antigo.avisos).toEqual([]);
    expect(paraTexto(antigo.percentual, 6)).toBe("5.645161");
    const selic = jurosSimples({
      metodologia: metodologiaSelicUnica(),
      indices: comCalendario(),
      casas: 6,
      termoInicial: "2026-10-01",
      termoFinal: "2026-11-11",
    });
    expect(selic.avisos).toEqual([]);
    expect(selic.mesesSemTaxaLegal).toEqual([]);
  });
});
```

Em `src/motor/base.test.ts`, troque o início do arquivo

```ts
import { describe, expect, it } from "vitest";
import type { Base, Lancamento, TabelaIndices } from "../compartilhado/tipos.ts";
import { apurarValorBase } from "./base.ts";
import { tabelaIgpm } from "./testes/indices-igpm-2017-2018.ts";
import { tabelaRegimeNovo } from "./testes/regime-novo.ts";
```

por

```ts
import { describe, expect, it } from "vitest";
import type { Base, Competencia, Lancamento, TabelaIndices } from "../compartilhado/tipos.ts";
import { apurarValorBase } from "./base.ts";
import { tabelaIgpm } from "./testes/indices-igpm-2017-2018.ts";
import { tabelaRegimeNovo } from "./testes/regime-novo.ts";
```

e acrescente ao fim do arquivo:

```ts

describe("base com calendário de divulgação (fase 4: esperadoAte)", () => {
  const ESPERADO_ATE: TabelaIndices["esperadoAte"] = {
    "188": "2026-09",
    "189": "2026-09",
    "433": "2026-09",
    "1619": "2026-12",
    "29543": "2026-10",
    "4390": "2026-10",
  };
  const comCalendario = (): TabelaIndices => ({ ...tabelaRegimeNovo(), esperadoAte: ESPERADO_ATE });

  describe("percentual do salário mínimo", () => {
    const base: Base = { tipo: "percentualSalarioMinimo", percentual: "30" };

    it("mês posterior ao esperado: 'ainda não publicado', o último publicado vale até o novo decreto", () => {
      const r = apurarValorBase(prestacao("2027-01-05"), base, comCalendario(), 2);
      expect(r.valor?.toFixed(2)).toBe("486.30");
      expect(r.memoria).toBe(
        "30% do salário mínimo vigente em jan/2027 (R$ 1.621,00, último publicado: dez/2026) = R$ 486,30",
      );
      expect(r.avisos).toEqual([
        "Salário mínimo de jan/2027 ainda não publicado na data da consulta (previsão: no início de 2027, com o decreto do salário mínimo): usado o de dez/2026 (R$ 1.621,00), vigente até a publicação do novo.",
      ]);
      expect(r.mesesSemIndice).toEqual([{ serie: "1619", competencia: "2027-01" }]);
    });

    it("buraco num mês já esperado: 'não consta na tabela', usado o último anterior disponível", () => {
      const tabela = comCalendario();
      delete tabela.series["1619"]?.["2026-06"];
      const r = apurarValorBase(prestacao("2026-06-10"), base, tabela, 2);
      expect(r.valor?.toFixed(2)).toBe("486.30");
      expect(r.memoria).toBe(
        "30% do salário mínimo vigente em jun/2026 (R$ 1.621,00, último anterior disponível: mai/2026) = R$ 486,30",
      );
      expect(r.avisos).toEqual([
        "Salário mínimo de jun/2026 não consta na tabela de índices: usado o de mai/2026 (R$ 1.621,00), o último anterior disponível.",
      ]);
      expect(r.mesesSemIndice).toEqual([{ serie: "1619", competencia: "2026-06" }]);
      expect(r.indicesUsados.map((i) => i.competencia)).toEqual(["2026-05"]);
    });

    it("buraco no próprio mês esperado (dez/2026) é 'não consta'; o mês seguinte é 'ainda não publicado'", () => {
      const tabela = comCalendario();
      delete tabela.series["1619"]?.["2026-12"];
      expect(apurarValorBase(prestacao("2026-12-10"), base, tabela, 2).avisos).toEqual([
        "Salário mínimo de dez/2026 não consta na tabela de índices: usado o de nov/2026 (R$ 1.621,00), o último anterior disponível.",
      ]);
      expect(apurarValorBase(prestacao("2027-01-10"), base, tabela, 2).avisos).toEqual([
        "Salário mínimo de jan/2027 ainda não publicado na data da consulta (previsão: no início de 2027, com o decreto do salário mínimo): usado o de nov/2026 (R$ 1.621,00), vigente até a publicação do novo.",
      ]);
    });

    it("sem esperadoAte do salário mínimo (tabela antiga ou calendário parcial), o buraco recebe o texto antigo", () => {
      const semCalendario = tabelaRegimeNovo();
      delete semCalendario.series["1619"]?.["2026-06"];
      const antigo =
        "Salário mínimo de jun/2026 ainda não publicado na tabela de índices: usado o de mai/2026 (R$ 1.621,00), vigente até a publicação do novo.";
      expect(apurarValorBase(prestacao("2026-06-10"), base, semCalendario, 2).avisos).toEqual([
        antigo,
      ]);
      const parcial: TabelaIndices = { ...semCalendario, esperadoAte: { "433": "2026-09" } };
      const r = apurarValorBase(prestacao("2026-06-10"), base, parcial, 2);
      expect(r.avisos).toEqual([antigo]);
      expect(r.memoria).toContain("último publicado: mai/2026");
    });

    it("sem nenhum salário mínimo anterior, o aviso de 'sem valor' não muda", () => {
      const r = apurarValorBase(prestacao("2023-06-10"), base, comCalendario(), 2);
      expect(r.valor).toBeNull();
      expect(r.avisos).toEqual([
        "Salário mínimo de jun/2023 não disponível na tabela de índices: a prestação ficou sem valor; informe o valor à mão.",
      ]);
    });
  });

  describe("valor fixo reajustado pelo salário mínimo", () => {
    const base: Base = {
      tipo: "valorFixo",
      valor: "451.91",
      dataFixacao: "2017-01-10",
      indiceReajuste: "SM",
      mesReajuste: 1,
    };
    const tabela2017 = (esperadoAte: Competencia): TabelaIndices => ({
      ...tabelaIgpm("2018-04", [], true),
      esperadoAte: { "1619": esperadoAte },
    });

    it("mês posterior ao esperado: 'ainda não publicado' e memória com 'último publicado'", () => {
      const r = apurarValorBase(prestacao("2018-03-10"), base, tabela2017("2018-02"), 2);
      expect(r.valor?.toFixed(2)).toBe("460.11");
      expect(r.avisos).toEqual([
        "Salário mínimo de mar/2018 ainda não publicado na data da consulta (previsão: no início de 2018, com o decreto do salário mínimo): usado o de fev/2018 (R$ 954,00), vigente até a publicação do novo.",
      ]);
      expect(r.memoria).toBe(
        "R$ 451,91 fixados em 10/01/2017 × salário mínimo vigente em mar/2018 (R$ 954,00, último publicado: fev/2018) ÷ salário mínimo de jan/2017 (R$ 937,00) = R$ 460,11",
      );
      expect(r.mesesSemIndice).toEqual([{ serie: "1619", competencia: "2018-03" }]);
    });

    it("mês já esperado mas ausente: 'não consta' e memória com 'último anterior disponível'", () => {
      const r = apurarValorBase(prestacao("2018-03-10"), base, tabela2017("2018-12"), 2);
      expect(r.valor?.toFixed(2)).toBe("460.11");
      expect(r.avisos).toEqual([
        "Salário mínimo de mar/2018 não consta na tabela de índices: usado o de fev/2018 (R$ 954,00), o último anterior disponível.",
      ]);
      expect(r.memoria).toBe(
        "R$ 451,91 fixados em 10/01/2017 × salário mínimo vigente em mar/2018 (R$ 954,00, último anterior disponível: fev/2018) ÷ salário mínimo de jan/2017 (R$ 937,00) = R$ 460,11",
      );
      expect(r.mesesSemIndice).toEqual([{ serie: "1619", competencia: "2018-03" }]);
      expect(r.indicesUsados.map((i) => i.competencia)).toEqual(["2017-01", "2018-02"]);
    });

    it("mês presente na tabela: sem aviso, com ou sem calendário", () => {
      expect(
        apurarValorBase(prestacao("2018-01-10"), base, tabela2017("2018-02"), 2).avisos,
      ).toEqual([]);
      expect(
        apurarValorBase(prestacao("2018-01-10"), base, tabela2017("2017-12"), 2).avisos,
      ).toEqual([]);
    });
  });

  describe("valor fixo reajustado por índice", () => {
    const base: Base = {
      tipo: "valorFixo",
      valor: "500.00",
      dataFixacao: "2025-11-15",
      indiceReajuste: "IPCA",
      mesReajuste: 11,
    };

    it("todos os meses faltantes da janela ainda não divulgados: aviso próprio, sem 'último mês disponível'", () => {
      const r = apurarValorBase(prestacao("2026-11-15"), base, comCalendario(), 2);
      expect(r.valor?.toFixed(2)).toBe("500.00");
      expect(r.avisos).toEqual([
        "IPCA de out/2026 ainda sem divulgação na data da consulta (previsão: por volta de 10/11/2026): o reajuste de nov/2026 não foi aplicado; a prestação mantém R$ 500,00.",
      ]);
      expect(r.memoria).toBe(
        "Valor fixado em 15/11/2025: R$ 500,00 (reajuste de nov/2026 não aplicado: IPCA de out/2026 não disponível)",
      );
      expect(r.mesesSemIndice).toEqual([{ serie: "433", competencia: "2026-10" }]);
      expect(r.indicesUsados).toEqual([]);
    });

    it("dois meses ainda não divulgados saem listados na mesma frase", () => {
      const dezembro: Base = { ...base, dataFixacao: "2025-12-15", mesReajuste: 12 };
      const r = apurarValorBase(prestacao("2026-12-15"), dezembro, comCalendario(), 2);
      expect(r.avisos).toEqual([
        "IPCA de out/2026, nov/2026 ainda sem divulgação na data da consulta (previsão para nov/2026: por volta de 10/12/2026): o reajuste de dez/2026 não foi aplicado; a prestação mantém R$ 500,00.",
      ]);
      expect(r.mesesSemIndice).toEqual([
        { serie: "433", competencia: "2026-10" },
        { serie: "433", competencia: "2026-11" },
      ]);
    });

    it("segundo reajuste com meses ainda não divulgados: a frase mantém o valor já reajustado", () => {
      const marco: Base = { ...base, dataFixacao: "2024-11-15", mesReajuste: 11 };
      const r = apurarValorBase(prestacao("2026-11-15"), marco, comCalendario(), 2);
      expect(r.avisos).toEqual([
        "IPCA de out/2026 ainda sem divulgação na data da consulta (previsão: por volta de 10/11/2026): o reajuste de nov/2026 não foi aplicado; a prestação mantém R$ 523,40.",
      ]);
      expect(r.valor?.toFixed(2)).toBe("523.40");
      expect(r.memoria).toContain("reajustados em nov/2025 (IPCA de nov/2024 a out/2025: 4,6808%)");
    });

    it("buraco e mês ainda não divulgado na mesma janela: vale o texto genérico", () => {
      const tabela = comCalendario();
      delete tabela.series["433"]?.["2026-05"];
      const r = apurarValorBase(prestacao("2026-11-15"), base, tabela, 2);
      expect(r.avisos).toEqual([
        "IPCA de mai/2026, out/2026 não disponível na tabela de índices (último mês disponível: set/2026): o reajuste de nov/2026 não foi aplicado; a prestação mantém R$ 500,00.",
      ]);
      expect(r.mesesSemIndice).toEqual([
        { serie: "433", competencia: "2026-05" },
        { serie: "433", competencia: "2026-10" },
      ]);
    });

    it("buraco só, num mês já esperado: texto genérico", () => {
      const tabela = comCalendario();
      delete tabela.series["433"]?.["2025-05"];
      const marco: Base = { ...base, dataFixacao: "2024-03-15", mesReajuste: 3 };
      const r = apurarValorBase(prestacao("2026-09-15"), marco, tabela, 2);
      expect(r.avisos).toEqual([
        "IPCA de mai/2025 não disponível na tabela de índices (último mês disponível: set/2026): o reajuste de mar/2026 não foi aplicado; a prestação mantém R$ 525,29.",
      ]);
    });

    it("esperadoAte parcial sem o IPCA: texto genérico", () => {
      const tabela: TabelaIndices = { ...tabelaRegimeNovo(), esperadoAte: { "1619": "2026-12" } };
      const r = apurarValorBase(prestacao("2026-11-15"), base, tabela, 2);
      expect(r.avisos).toEqual([
        "IPCA de out/2026 não disponível na tabela de índices (último mês disponível: set/2026): o reajuste de nov/2026 não foi aplicado; a prestação mantém R$ 500,00.",
      ]);
    });

    it("INPC e IGP-M seguem a mesma regra pelas séries 188 e 189", () => {
      const inpc = apurarValorBase(
        prestacao("2026-11-15"),
        { ...base, indiceReajuste: "INPC" },
        comCalendario(),
        2,
      );
      expect(inpc.avisos).toEqual([
        "INPC de out/2026 ainda sem divulgação na data da consulta (previsão: por volta de 10/11/2026): o reajuste de nov/2026 não foi aplicado; a prestação mantém R$ 500,00.",
      ]);
      expect(inpc.mesesSemIndice).toEqual([{ serie: "188", competencia: "2026-10" }]);
      const igpm = apurarValorBase(
        prestacao("2026-11-15"),
        { ...base, indiceReajuste: "IGP-M" },
        comCalendario(),
        2,
      );
      expect(igpm.avisos).toEqual([
        "IGP-M de out/2026 ainda sem divulgação na data da consulta (previsão: no fim de out/2026): o reajuste de nov/2026 não foi aplicado; a prestação mantém R$ 500,00.",
      ]);
    });
  });
});
```

Em `src/motor/calcular.test.ts`, troque o início do arquivo

```ts
import { describe, expect, it } from "vitest";
import { competenciasEntre } from "../compartilhado/datas.ts";
import type { Base, Calculo, Lancamento } from "../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../metodologias/padrao.ts";
import { calcular } from "./calcular.ts";
import { tabelaIgpm } from "./testes/indices-igpm-2017-2018.ts";
```

por

```ts
import { describe, expect, it } from "vitest";
import { competenciasEntre } from "../compartilhado/datas.ts";
import type {
  Base,
  Calculo,
  CodigoSerie,
  Competencia,
  Lancamento,
  TabelaIndices,
} from "../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../metodologias/padrao.ts";
import { calcular } from "./calcular.ts";
import { tabelaIgpm } from "./testes/indices-igpm-2017-2018.ts";
```

e acrescente ao fim do arquivo:

```ts

describe("calcular (fase 4: meses ainda não divulgados na data da consulta)", () => {
  const hoje = "2026-10-11";
  const ESPERADO_ATE: TabelaIndices["esperadoAte"] = {
    "188": "2026-09",
    "189": "2026-09",
    "433": "2026-09",
    "1619": "2026-12",
    "29543": "2026-10",
    "4390": "2026-10",
  };
  const comCalendario = (
    limites: Partial<Record<CodigoSerie, Competencia>> = {},
  ): TabelaIndices => ({ ...tabelaRegimeNovo(limites), esperadoAte: ESPERADO_ATE });
  const informada = (id: string, data: string, valorInformado: string): Lancamento => ({
    id,
    tipo: "prestacao",
    data,
    competencia: data.slice(0, 7),
    valorInformado,
    origem: "avulso",
    editado: true,
  });
  const pelaBase = (id: string, data: string): Lancamento => ({
    id,
    tipo: "prestacao",
    data,
    competencia: data.slice(0, 7),
    origem: "lote",
    editado: false,
  });
  const comBase = (base: Base, lancamentos: Lancamento[], dataElaboracao = hoje): Calculo => ({
    ...calculoCom(lancamentos, dataElaboracao),
    base,
  });

  it("IPCA do mês da consulta ainda não divulgado: aviso próprio no lançamento e resumo próprio, sem o genérico; valores inalterados", () => {
    const r = calcular(
      calculoCom([informada("p", "2024-09-30", "1000.00")], hoje),
      comCalendario(),
    );
    expect(r.lancamentos[0]).toMatchObject({
      correcao: { fator: "1.099852" },
      corrigido: "1099.85",
      juros: { percentual: "17.247591" },
      jurosValor: "189.70",
      atualizado: "1289.55",
    });
    expect(r.lancamentos[0]?.avisos).toEqual([
      "Valor informado à mão (R$ 1.000,00), não apurado pela base dos alimentos.",
      "IPCA de out/2026 ainda sem divulgação na data da consulta (previsão: por volta de 10/11/2026): o mês entrou sem correção (fator 1,000000).",
    ]);
    expect(r.avisos).toEqual([
      "Meses ainda sem divulgação na data da consulta (entraram sem correção): IPCA de out/2026.",
      "Prestações com valor informado à mão, não apurado pela base dos alimentos: set/2024.",
    ]);
  });

  it("buraco na tabela e mês ainda não divulgado no mesmo lançamento: cada um com o seu texto e o seu resumo", () => {
    const tabela = comCalendario();
    delete tabela.series["433"]?.["2025-05"];
    const r = calcular(calculoCom([informada("p", "2024-09-30", "1000.00")], hoje), tabela);
    expect(r.lancamentos[0]?.avisos).toEqual([
      "Valor informado à mão (R$ 1.000,00), não apurado pela base dos alimentos.",
      "IPCA de mai/2025 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
      "IPCA de out/2026 ainda sem divulgação na data da consulta (previsão: por volta de 10/11/2026): o mês entrou sem correção (fator 1,000000).",
    ]);
    expect(r.avisos).toEqual([
      "Meses ainda sem divulgação na data da consulta (entraram sem correção): IPCA de out/2026.",
      "Meses sem índice na tabela (entraram sem correção): IPCA de mai/2025.",
      "Prestações com valor informado à mão, não apurado pela base dos alimentos: set/2024.",
    ]);
  });

  it("o resumo dos não divulgados agrupa por série em ordem numérica, meses crescentes, sem repetição", () => {
    const selic: Lancamento = {
      ...informada("s", "2026-09-30", "1000.00"),
      encargos: { metodologia: metodologiaSelicUnica() },
    };
    const r = calcular(
      calculoCom(
        [informada("p1", "2026-08-30", "1000.00"), informada("p2", "2026-09-30", "1000.00"), selic],
        "2026-11-11",
      ),
      comCalendario(),
    );
    expect(r.avisos).toContain(
      "Meses ainda sem divulgação na data da consulta (entraram sem correção): IPCA de out/2026, nov/2026; SELIC de nov/2026.",
    );
    expect(r.avisos).not.toContainEqual(
      expect.stringContaining("Meses sem índice na tabela (entraram sem correção)"),
    );
    expect(r.lancamentos[2]?.avisos).toContain(
      "SELIC de nov/2026 ainda sem divulgação na data da consulta (previsão: ao longo de nov/2026, como acumulado parcial fechado no início de dez/2026): o mês entrou sem correção (fator 1,000000).",
    );
  });

  it("taxa legal ainda não divulgada: aviso próprio no lançamento e resumo próprio, sem o genérico", () => {
    const r = calcular(
      calculoCom([informada("p", "2026-10-30", "1000.00")], "2026-11-11"),
      comCalendario(),
    );
    expect(r.lancamentos[0]?.avisos).toEqual([
      "Valor informado à mão (R$ 1.000,00), não apurado pela base dos alimentos.",
      "IPCA de out/2026 ainda sem divulgação na data da consulta (previsão: por volta de 10/11/2026): o mês entrou sem correção (fator 1,000000).",
      "IPCA de nov/2026 ainda sem divulgação na data da consulta (previsão: por volta de 10/12/2026): o mês entrou sem correção (fator 1,000000).",
      "Taxa legal de nov/2026 ainda sem divulgação na data da consulta (previsão: no 1º dia útil de nov/2026): os dias de 01/11/2026 a 10/11/2026 ficaram sem juros.",
    ]);
    expect(r.avisos).toEqual([
      "Meses ainda sem divulgação na data da consulta (entraram sem correção): IPCA de out/2026, nov/2026.",
      "Meses de taxa legal ainda sem divulgação (os dias desses meses ficaram sem juros): nov/2026.",
      "Prestações com valor informado à mão, não apurado pela base dos alimentos: out/2026.",
    ]);
    // a taxa legal de out/2026 (30 e 31/10) foi aplicada normalmente
    expect(r.lancamentos[0]?.juros.detalhe).toEqual([
      {
        regime: "taxaLegal",
        de: "2026-10-30",
        ate: "2026-10-31",
        dias: 2,
        diasDoMes: 31,
        taxa: "0.379020",
        percentual: "0.024453",
      },
    ]);
  });

  it("taxa legal: buraco num mês já esperado e mês ainda não divulgado, cada um no seu resumo", () => {
    const tabela = comCalendario();
    delete tabela.series["29543"]?.["2026-09"];
    const r = calcular(calculoCom([informada("p", "2026-08-30", "1000.00")], "2026-11-11"), tabela);
    expect(r.lancamentos[0]?.avisos).toContain(
      "Taxa legal de set/2026 não disponível na tabela de índices: os dias de 01/09/2026 a 30/09/2026 ficaram sem juros.",
    );
    expect(r.lancamentos[0]?.avisos).toContain(
      "Taxa legal de nov/2026 ainda sem divulgação na data da consulta (previsão: no 1º dia útil de nov/2026): os dias de 01/11/2026 a 10/11/2026 ficaram sem juros.",
    );
    expect(r.avisos).toContain(
      "Meses de taxa legal ainda sem divulgação (os dias desses meses ficaram sem juros): nov/2026.",
    );
    expect(r.avisos).toContain(
      "Meses sem taxa legal na tabela (os dias desses meses ficaram sem juros): set/2026.",
    );
  });

  it("esperadoAte parcial (só o IPCA): taxa legal e salário mínimo seguem com os textos genéricos", () => {
    const tabela: TabelaIndices = {
      ...tabelaRegimeNovo({ "29543": "2026-09" }),
      esperadoAte: { "433": "2026-09" },
    };
    const r = calcular(calculoCom([informada("p", "2026-09-30", "1000.00")], hoje), tabela);
    expect(r.lancamentos[0]?.avisos).toEqual([
      "Valor informado à mão (R$ 1.000,00), não apurado pela base dos alimentos.",
      "IPCA de out/2026 ainda sem divulgação na data da consulta (previsão: por volta de 10/11/2026): o mês entrou sem correção (fator 1,000000).",
      "Taxa legal de out/2026 não disponível na tabela de índices: os dias de 01/10/2026 a 10/10/2026 ficaram sem juros.",
    ]);
    expect(r.avisos).toEqual([
      "Meses ainda sem divulgação na data da consulta (entraram sem correção): IPCA de out/2026.",
      "Meses sem taxa legal na tabela (os dias desses meses ficaram sem juros): out/2026.",
      "Prestações com valor informado à mão, não apurado pela base dos alimentos: set/2026.",
    ]);
    const salario = calcular(
      comBase({ tipo: "percentualSalarioMinimo", percentual: "30" }, [pelaBase("p", "2027-01-10")]),
      tabela,
    );
    expect(salario.lancamentos[0]?.avisos[0]).toBe(
      "Salário mínimo de jan/2027 ainda não publicado na tabela de índices: usado o de dez/2026 (R$ 1.621,00), vigente até a publicação do novo.",
    );
    expect(salario.avisos).toEqual([
      "Meses sem índice na tabela para o valor-base das prestações (ver o aviso de cada uma): salário mínimo de jan/2027.",
      "Prestações vincendas, incluídas pelo valor nominal, sem correção e sem juros: jan/2027.",
    ]);
  });

  it("salário mínimo ainda não publicado para o valor-base: resumo próprio, sem o genérico", () => {
    const r = calcular(
      comBase({ tipo: "percentualSalarioMinimo", percentual: "30" }, [pelaBase("p", "2027-01-10")]),
      comCalendario(),
    );
    expect(r.lancamentos[0]).toMatchObject({
      situacao: "vincenda",
      valorBase: "486.30",
      memoriaBase:
        "30% do salário mínimo vigente em jan/2027 (R$ 1.621,00, último publicado: dez/2026) = R$ 486,30",
    });
    expect(r.lancamentos[0]?.avisos[0]).toBe(
      "Salário mínimo de jan/2027 ainda não publicado na data da consulta (previsão: no início de 2027, com o decreto do salário mínimo): usado o de dez/2026 (R$ 1.621,00), vigente até a publicação do novo.",
    );
    expect(r.avisos).toEqual([
      "Meses ainda sem divulgação para o valor-base das prestações (ver o aviso de cada uma): salário mínimo de jan/2027.",
      "Prestações vincendas, incluídas pelo valor nominal, sem correção e sem juros: jan/2027.",
    ]);
  });

  it("buraco no salário mínimo num mês já esperado: 'não consta', memória 'último anterior disponível' e resumo genérico", () => {
    const tabela = comCalendario();
    delete tabela.series["1619"]?.["2026-06"];
    const r = calcular(
      comBase({ tipo: "percentualSalarioMinimo", percentual: "30" }, [pelaBase("p", "2026-06-10")]),
      tabela,
    );
    expect(r.lancamentos[0]).toMatchObject({
      situacao: "atualizado",
      valorBase: "486.30",
      memoriaBase:
        "30% do salário mínimo vigente em jun/2026 (R$ 1.621,00, último anterior disponível: mai/2026) = R$ 486,30",
    });
    expect(r.lancamentos[0]?.avisos).toEqual([
      "Salário mínimo de jun/2026 não consta na tabela de índices: usado o de mai/2026 (R$ 1.621,00), o último anterior disponível.",
      "IPCA de out/2026 ainda sem divulgação na data da consulta (previsão: por volta de 10/11/2026): o mês entrou sem correção (fator 1,000000).",
    ]);
    expect(r.avisos).toEqual([
      "Meses ainda sem divulgação na data da consulta (entraram sem correção): IPCA de out/2026.",
      "Meses sem índice na tabela para o valor-base das prestações (ver o aviso de cada uma): salário mínimo de jun/2026.",
    ]);
  });

  it("reajuste pelo IPCA ainda não divulgado: aviso próprio no lançamento e resumo próprio da base", () => {
    const base: Base = {
      tipo: "valorFixo",
      valor: "500.00",
      dataFixacao: "2025-11-15",
      indiceReajuste: "IPCA",
      mesReajuste: 11,
    };
    const r = calcular(comBase(base, [pelaBase("p", "2026-11-15")]), comCalendario());
    expect(r.lancamentos[0]?.avisos[0]).toBe(
      "IPCA de out/2026 ainda sem divulgação na data da consulta (previsão: por volta de 10/11/2026): o reajuste de nov/2026 não foi aplicado; a prestação mantém R$ 500,00.",
    );
    expect(r.avisos).toEqual([
      "Meses ainda sem divulgação para o valor-base das prestações (ver o aviso de cada uma): IPCA de out/2026.",
      "Prestações vincendas, incluídas pelo valor nominal, sem correção e sem juros: nov/2026.",
    ]);
    // buraco e mês não divulgado na mesma janela: texto genérico no lançamento; o resumo separa os meses
    const tabela = comCalendario();
    delete tabela.series["433"]?.["2026-05"];
    const r2 = calcular(comBase(base, [pelaBase("p", "2026-11-15")]), tabela);
    expect(r2.lancamentos[0]?.avisos[0]).toBe(
      "IPCA de mai/2026, out/2026 não disponível na tabela de índices (último mês disponível: set/2026): o reajuste de nov/2026 não foi aplicado; a prestação mantém R$ 500,00.",
    );
    expect(r2.avisos.slice(0, 2)).toEqual([
      "Meses ainda sem divulgação para o valor-base das prestações (ver o aviso de cada uma): IPCA de out/2026.",
      "Meses sem índice na tabela para o valor-base das prestações (ver o aviso de cada uma): IPCA de mai/2026.",
    ]);
  });

  it("tabela sem esperadoAte: todos os textos genéricos continuam como antes", () => {
    const r = calcular(
      calculoCom([informada("p", "2026-09-30", "1000.00")], hoje),
      tabelaRegimeNovo({ "29543": "2026-09" }),
    );
    expect(r.lancamentos[0]?.avisos.slice(1)).toEqual([
      "IPCA de out/2026 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
      "Taxa legal de out/2026 não disponível na tabela de índices: os dias de 01/10/2026 a 10/10/2026 ficaram sem juros.",
    ]);
    expect(r.avisos).toEqual([
      "Meses sem índice na tabela (entraram sem correção): IPCA de out/2026.",
      "Meses sem taxa legal na tabela (os dias desses meses ficaram sem juros): out/2026.",
      "Prestações com valor informado à mão, não apurado pela base dos alimentos: set/2026.",
    ]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Execute: `npm test -- src/motor/correcao.test.ts src/motor/calcular.test.ts src/motor/juros.test.ts src/motor/base.test.ts`
Esperado: falham exatamente 22 testes e passam 104. Os que falham:

- `src/motor/correcao.test.ts` (1): "SELIC de out/2026 obtida em out/2026 é parcial mesmo com a tabela consultada em nov/2026".
- `src/motor/juros.test.ts` (3): "mês posterior ao esperado pelo calendário: aviso de 'ainda não divulgada', dias sem juros"; "buraco e mês ainda não divulgado no mesmo trecho: um aviso de cada tipo, na ordem dos meses"; "mês esperado pelo calendário mas ausente da tabela é 'não disponível'; o seguinte, 'ainda não divulgada'".
- `src/motor/base.test.ts` (9): "mês posterior ao esperado: 'ainda não publicado', o último publicado vale até o novo decreto"; "buraco num mês já esperado: 'não consta na tabela', usado o último anterior disponível"; "buraco no próprio mês esperado (dez/2026) é 'não consta'; o mês seguinte é 'ainda não publicado'"; "mês posterior ao esperado: 'ainda não publicado' e memória com 'último publicado'"; "mês já esperado mas ausente: 'não consta' e memória com 'último anterior disponível'"; "todos os meses faltantes da janela ainda não divulgados: aviso próprio, sem 'último mês disponível'"; "dois meses ainda não divulgados saem listados na mesma frase"; "segundo reajuste com meses ainda não divulgados: a frase mantém o valor já reajustado"; "INPC e IGP-M seguem a mesma regra pelas séries 188 e 189".
- `src/motor/calcular.test.ts` (9): "IPCA do mês da consulta ainda não divulgado: aviso próprio no lançamento e resumo próprio, sem o genérico; valores inalterados"; "buraco na tabela e mês ainda não divulgado no mesmo lançamento: cada um com o seu texto e o seu resumo"; "o resumo dos não divulgados agrupa por série em ordem numérica, meses crescentes, sem repetição"; "taxa legal ainda não divulgada: aviso próprio no lançamento e resumo próprio, sem o genérico"; "taxa legal: buraco num mês já esperado e mês ainda não divulgado, cada um no seu resumo"; "esperadoAte parcial (só o IPCA): taxa legal e salário mínimo seguem com os textos genéricos"; "salário mínimo ainda não publicado para o valor-base: resumo próprio, sem o genérico"; "buraco no salário mínimo num mês já esperado: 'não consta', memória 'último anterior disponível' e resumo genérico"; "reajuste pelo IPCA ainda não divulgado: aviso próprio no lançamento e resumo próprio da base".

Os demais 13 testes novos já passam sem o código: fixam o que não muda (os textos genéricos sem calendário ou para buraco de dados, e os casos da SELIC parcial que a regra antiga já acertava); os testes antigos do motor seguem verdes.

- [ ] **Step 3: Escrever o código**

Substitua `src/motor/correcao.ts` por:

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
  /**
   * SELIC do mês em que o próprio valor foi obtido (`obtidoEm`): acumulado parcial, só até o
   * último dia útil publicado (§6.4)
   */
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
  return competenciasEntre(de, ate).map((competencia) => {
    const periodo = periodoVigenteEm(metodologia, primeiroDiaDoMes(competencia));
    if (periodo === undefined) return { competencia, serie: null, valor: null };
    let serie: CodigoSerie | null;
    if (periodo.juros.tipo === "selicUnica") serie = CODIGO_DA_SERIE.SELIC;
    else if (periodo.correcao.indice === "nenhum") serie = null;
    else serie = CODIGO_DA_SERIE[periodo.correcao.indice];
    if (serie === null) return { competencia, serie: null, valor: null };
    const registro = tabela.series[serie]?.[competencia];
    if (registro === undefined) return { competencia, serie, valor: null };
    // O mês parcial da SELIC é o mês em que o próprio valor foi obtido, e não o da consulta da
    // tabela: a rotina grava série por série, a SELIC pode ficar para trás enquanto o IPCA atualiza,
    // e a data da tabela deixaria de dizer qual mês da SELIC é o parcial (fase 4).
    if (serie === CODIGO_DA_SERIE.SELIC && competenciaDe(registro.obtidoEm) === competencia) {
      return { competencia, serie, valor: registro.valor, parcial: true };
    }
    return { competencia, serie, valor: registro.valor };
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
 * da SELIC inteiro (exceção: quando o lançamento começa e termina no mês parcial, o valor
 * parcial é rateado pelos dias decorridos, (dia final − dia inicial) ÷ dia final), deflação
 * conforme a opção. Fator 1 quando o termo final é anterior ao inicial.
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

    // Quantos "dias do mês" entram na conta: a fração do mês é numerador ÷ denominador.
    let numerador: number;
    if (ehInicial && p.incidenciaMesInicial === "mesSeguinte") numerador = 0;
    else if (ehInicial && ehFinal) numerador = fim.dia - inicio.dia;
    else if (ehInicial) numerador = dias - inicio.dia;
    else if (ehFinal) numerador = fim.dia;
    else numerador = dias;
    let denominador = dias;
    // O valor parcial do mês corrente da SELIC é "até a obtenção": quando o lançamento cai nesse mês,
    // é rateado pelos dias do dia 1 ao termo final; quando o mês entra inteiro, entra inteiro. Com
    // lançamento no mês e termo final em outro mês, vale o pro rata normal do mês inicial.
    if (mes.parcial === true && numerador > 0) {
      if (ehInicial && ehFinal) {
        denominador = fim.dia;
        numerador = fim.dia - inicio.dia;
      } else if (!ehInicial) {
        numerador = dias;
      }
    }

    indices.push({
      serie: mes.serie,
      competencia: mes.competencia,
      valor: mes.valor,
      fracao: numerador === denominador ? "1" : `${numerador}/${denominador}`,
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
      numerador === denominador
        ? fatorDoMes
        : fatorDoMes.pow(decimal(String(numerador)).div(denominador)),
    );
  }

  // Piso (§6.4, item 5; STJ, REsp 1.265.580/RS): o corrigido nunca fica abaixo do original.
  if (p.deflacao === "aplicarComPiso" && fator.lt(UM)) {
    return { fator: UM, indices, pisoAplicado: true, mesesSemIndice };
  }
  return { fator, indices, pisoAplicado: false, mesesSemIndice };
}
```

Substitua `src/motor/juros.ts` por:

```ts
import { diaAnterior, ratearPorMesCalendario } from "../compartilhado/datas.ts";
import { decimal, paraTexto, ZERO, type Decimal } from "../compartilhado/decimal.ts";
import { formatarCompetencia, formatarData } from "../compartilhado/formatacao.ts";
import { CODIGO_DA_SERIE } from "../compartilhado/tipos.ts";
import type {
  Competencia,
  DataISO,
  DetalheJuros,
  Metodologia,
  TabelaIndices,
} from "../compartilhado/tipos.ts";
import { aindaNaoDivulgado, divulgacaoPrevista } from "../compartilhado/divulgacao.ts";
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
  /**
   * competências cuja taxa legal (série 29543) faltou na tabela num trecho com pelo menos um dia
   * (esses dias ficaram sem juros), em ordem cronológica e sem repetição; vazia quando não faltou
   */
  mesesSemTaxaLegal: Competencia[];
}

/**
 * Juros simples do termo inicial ao termo final (§6.4), somando os trechos de cada período da
 * metodologia:
 * - `percentualMensal` (regime antigo): em cada mês tocado, taxa × dias ÷ diasDoMes, contando o
 *   dia inicial e o dia final, como o SAJ;
 * - `taxaLegal` (regime novo, Lei 14.905/2024): taxa do mês (série 29543) × dias ÷ dias corridos
 *   do mês, contando o primeiro dia do trecho e não contando o dia do termo final, como a
 *   Calculadora do Cidadão do BCB (30/08/2024 a 31/08/2024 = 1 dia). Na transição, o trecho da
 *   taxa legal começa em 30/08/2024 e esse dia conta. Mês sem taxa na tabela fica sem juros, com
 *   aviso: "ainda não divulgada" quando o calendário da tabela (`esperadoAte`) diz que o mês ainda
 *   não saiu; "não disponível" nos demais casos;
 * - `selicUnica`: sem juros separados, porque a SELIC entra capitalizada na correção.
 */
export function jurosSimples(p: ParametrosJuros): ResultadoJuros {
  const detalhe: DetalheJuros[] = [];
  const avisos: string[] = [];
  const mesesSemTaxaLegal: Competencia[] = [];
  let percentual = ZERO;
  if (p.termoFinal < p.termoInicial) return { percentual, detalhe, avisos, mesesSemTaxaLegal };

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
          if (!mesesSemTaxaLegal.includes(mes.competencia)) mesesSemTaxaLegal.push(mes.competencia);
          const dias = `os dias de ${formatarData(mes.de)} a ${formatarData(mes.ate)} ficaram sem juros`;
          avisos.push(
            aindaNaoDivulgado(p.indices, CODIGO_DA_SERIE.taxaLegal, mes.competencia)
              ? `Taxa legal de ${formatarCompetencia(mes.competencia)} ainda sem divulgação na data da consulta (previsão: ${divulgacaoPrevista(CODIGO_DA_SERIE.taxaLegal, mes.competencia)}): ${dias}.`
              : `Taxa legal de ${formatarCompetencia(mes.competencia)} não disponível na tabela de índices: ${dias}.`,
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
  return { percentual, detalhe, avisos, mesesSemTaxaLegal: mesesSemTaxaLegal.sort() };
}
```

Substitua `src/motor/base.ts` por:

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
import { aindaNaoDivulgado, divulgacaoPrevista } from "../compartilhado/divulgacao.ts";

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

/**
 * Como descrever o salário mínimo que falta no mês do vencimento, quando entra o último anterior
 * (`usado`): "ainda não publicado" quando a tabela não diz até que mês a série deveria ir (casos
 * antigos, calendário sem a série 1619) ou quando o mês é posterior ao esperado pelo calendário;
 * "não consta" quando o calendário diz que o mês já deveria estar na tabela (buraco de dados). A
 * `nota` entra na memória da conta e o `aviso`, nos avisos do lançamento.
 */
function descreverSalarioAnterior(
  tabela: TabelaIndices,
  competencia: Competencia,
  usado: IndiceUsado,
): { nota: string; aviso: string } {
  const mes = formatarCompetencia(competencia);
  const anterior = formatarCompetencia(usado.competencia);
  const valor = formatarMoeda(decimal(usado.valor));
  if (aindaNaoDivulgado(tabela, SALARIO_MINIMO, competencia)) {
    return {
      nota: `último publicado: ${anterior}`,
      aviso: `Salário mínimo de ${mes} ainda não publicado na data da consulta (previsão: ${divulgacaoPrevista(SALARIO_MINIMO, competencia)}): usado o de ${anterior} (${valor}), vigente até a publicação do novo.`,
    };
  }
  if (tabela.esperadoAte?.[SALARIO_MINIMO] === undefined) {
    return {
      nota: `último publicado: ${anterior}`,
      aviso: `Salário mínimo de ${mes} ainda não publicado na tabela de índices: usado o de ${anterior} (${valor}), vigente até a publicação do novo.`,
    };
  }
  return {
    nota: `último anterior disponível: ${anterior}`,
    aviso: `Salário mínimo de ${mes} não consta na tabela de índices: usado o de ${anterior} (${valor}), o último anterior disponível.`,
  };
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
  const anterior = descreverSalarioAnterior(tabela, competencia, salario.usado);
  return {
    valor,
    memoria: `${pct} do salário mínimo vigente em ${mes} (${formatarMoeda(salarioValor)}, ${anterior.nota}) = ${formatarMoeda(valor)}`,
    indicesUsados: [salario.usado],
    mesesSemIndice: [{ serie: SALARIO_MINIMO, competencia }],
    avisos: [anterior.aviso],
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
  const anterior = noVencimento.publicado
    ? null
    : descreverSalarioAnterior(tabela, competencia, noVencimento.usado);
  const descricaoVencimento =
    anterior === null
      ? `salário mínimo de ${mes} (${formatarMoeda(salarioVencimento)})`
      : `salário mínimo vigente em ${mes} (${formatarMoeda(salarioVencimento)}, ${anterior.nota})`;
  const memoria = `${formatarMoeda(valorFixado)} fixados em ${formatarData(dataFixacao)} × ${descricaoVencimento} ÷ salário mínimo de ${formatarCompetencia(mesFixacao)} (${formatarMoeda(salarioFixacao)}) = ${formatarMoeda(valor)}`;
  if (anterior === null) {
    return { valor, memoria, indicesUsados, mesesSemIndice: [], avisos: [] };
  }
  return {
    valor,
    memoria,
    indicesUsados,
    mesesSemIndice: [{ serie: SALARIO_MINIMO, competencia }],
    avisos: [anterior.aviso],
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
      const lista = faltantes.map(formatarCompetencia).join(", ");
      const efeito = `o reajuste de ${formatarCompetencia(reajuste)} não foi aplicado; a prestação mantém ${formatarMoeda(vigente)}.`;
      if (faltantes.every((m) => aindaNaoDivulgado(tabela, serie, m))) {
        // Todos os meses que faltam ainda não saíram, pelo calendário da tabela: não é buraco de dados.
        const ultimoFaltante = faltantes.at(-1) ?? fimJanela;
        const previsao = divulgacaoPrevista(serie, ultimoFaltante);
        const quando =
          faltantes.length === 1
            ? `previsão: ${previsao}`
            : `previsão para ${formatarCompetencia(ultimoFaltante)}: ${previsao}`;
        avisos.push(
          `${nome} de ${lista} ainda sem divulgação na data da consulta (${quando}): ${efeito}`,
        );
      } else {
        const ultimo = Object.keys(tabela.series[serie] ?? {})
          .sort()
          .at(-1);
        const disponivel =
          ultimo === undefined ? "" : ` (último mês disponível: ${formatarCompetencia(ultimo)})`;
        avisos.push(
          `${nome} de ${lista} não disponível na tabela de índices${disponivel}: ${efeito}`,
        );
      }
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
 * 12 meses. Nunca lança erro: dado inválido ou faltante devolve `valor` nulo e aviso. Datas chegam
 * validadas pela tela (§6.7): `dataFixacao` com competência malformada não é tratada aqui.
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
    default:
      // Checagem de exaustividade: uma forma nova de Base esquecida aqui falha na compilação.
      base satisfies never;
      return semValor(
        "Base desconhecida",
        "Tipo de base não reconhecido: a prestação ficou sem valor; informe o valor à mão.",
      );
  }
}
```

Substitua `src/motor/calcular.ts` por:

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
import { aindaNaoDivulgado, divulgacaoPrevista } from "../compartilhado/divulgacao.ts";
import { jurosSimples } from "./juros.ts";
import { validarMetodologia } from "./periodos.ts";

/** Ordena códigos de série como números ("189" antes de "1619"). */
function compararSeries(a: CodigoSerie, b: CodigoSerie): number {
  return Number(a) - Number(b);
}

/** "jan/2017" pela competência ou, sem ela, a data: "10/01/2017". */
function rotuloDaCompetencia(l: Lancamento): string {
  return l.competencia === undefined ? formatarData(l.data) : formatarCompetencia(l.competencia);
}

/** "prestação de jan/2017" ou "pagamento de 10/01/2017", para os avisos. */
function rotulo(l: Lancamento): string {
  if (l.tipo === "amortizacao") return `pagamento de ${formatarData(l.data)}`;
  return `prestação de ${rotuloDaCompetencia(l)}`;
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
 * Prestações posteriores à data de elaboração saem como vincendas, pelo valor nominal;
 * lançamentos sem valor utilizável, com valor zero ou negativo, e pagamentos posteriores saem como
 * ignorados. Vincendas e ignorados não têm correção nem juros (§6.7).
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
  // Mês sem índice: "ainda não divulgado" quando o calendário da tabela (`esperadoAte`) diz que o
  // mês ainda não saiu na data da consulta; "não disponível" nos demais casos (buraco de dados ou
  // tabela sem calendário, como nos casos de referência antigos).
  for (const competencia of correcao.mesesSemIndice) {
    const serie = correcao.indices.find((i) => i.competencia === competencia)?.serie ?? null;
    const nome = serie === null ? "Índice" : NOME_DA_SERIE[serie];
    const mes = formatarCompetencia(competencia);
    avisos.push(
      serie !== null && aindaNaoDivulgado(indices, serie, competencia)
        ? `${nome} de ${mes} ainda sem divulgação na data da consulta (previsão: ${divulgacaoPrevista(serie, competencia)}): o mês entrou sem correção (fator 1,000000).`
        : `${nome} de ${mes} não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).`,
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
  // reajuste) também são índices usados; os meses deles que faltam têm resumos próprios. Cada mês
  // que faltou vai para um de dois grupos, cada um com o seu resumo: "ainda não divulgado" (posterior
  // ao último mês que a série deveria ter na data da consulta, pelo calendário em `esperadoAte`) ou
  // "sem índice na tabela" (buraco de dados, ou tabela sem calendário).
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
  type Faltas = Map<CodigoSerie, Set<Competencia>>;
  const naoDivulgado: Faltas = new Map();
  const semIndice: Faltas = new Map();
  const naoDivulgadoNaBase: Faltas = new Map();
  const semIndiceNaBase: Faltas = new Map();
  const anotar = (
    aindaNao: Faltas,
    faltante: Faltas,
    serie: CodigoSerie,
    competencia: Competencia,
  ): void => {
    const mapa = aindaNaoDivulgado(indices, serie, competencia) ? aindaNao : faltante;
    const meses = mapa.get(serie) ?? new Set<Competencia>();
    meses.add(competencia);
    mapa.set(serie, meses);
  };
  for (const r of rastros) {
    for (const i of r.lancamento.correcao.indices) {
      if (i.serie === null || i.fracao.startsWith("0/")) continue;
      if (i.valor === null) anotar(naoDivulgado, semIndice, i.serie, i.competencia);
      else registrar(i.serie, i.competencia);
    }
    for (const d of r.lancamento.juros.detalhe) {
      if (d.regime === "taxaLegal") registrar(CODIGO_DA_SERIE.taxaLegal, competenciaDe(d.de));
    }
    for (const i of r.indicesDaBase) registrar(i.serie, i.competencia);
    for (const m of r.mesesSemIndiceNaBase) {
      anotar(naoDivulgadoNaBase, semIndiceNaBase, m.serie, m.competencia);
    }
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
  if (naoDivulgado.size > 0) {
    avisos.push(
      `Meses ainda sem divulgação na data da consulta (entraram sem correção): ${descreverFaltas(naoDivulgado)}.`,
    );
  }
  if (semIndice.size > 0) {
    avisos.push(
      `Meses sem índice na tabela (entraram sem correção): ${descreverFaltas(semIndice)}.`,
    );
  }
  const semTaxaLegal = [
    ...new Set<Competencia>(rastros.flatMap((r) => r.mesesSemTaxaLegal)),
  ].sort();
  const taxaLegalNaoDivulgada = semTaxaLegal.filter((c) =>
    aindaNaoDivulgado(indices, CODIGO_DA_SERIE.taxaLegal, c),
  );
  const taxaLegalFaltante = semTaxaLegal.filter(
    (c) => !aindaNaoDivulgado(indices, CODIGO_DA_SERIE.taxaLegal, c),
  );
  const listarMeses = (meses: Competencia[]): string => meses.map(formatarCompetencia).join(", ");
  if (taxaLegalNaoDivulgada.length > 0) {
    avisos.push(
      `Meses de taxa legal ainda sem divulgação (os dias desses meses ficaram sem juros): ${listarMeses(taxaLegalNaoDivulgada)}.`,
    );
  }
  if (taxaLegalFaltante.length > 0) {
    avisos.push(
      `Meses sem taxa legal na tabela (os dias desses meses ficaram sem juros): ${listarMeses(taxaLegalFaltante)}.`,
    );
  }
  if (naoDivulgadoNaBase.size > 0) {
    avisos.push(
      `Meses ainda sem divulgação para o valor-base das prestações (ver o aviso de cada uma): ${descreverFaltas(naoDivulgadoNaBase)}.`,
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
      `Prestações vincendas, incluídas pelo valor nominal, sem correção e sem juros: ${vincendas.map(rotuloDaCompetencia).join(", ")}.`,
    );
  }
  const informadas = calculo.lancamentos.filter((_, i) => lancamentos[i]?.editado === true);
  if (informadas.length > 0) {
    avisos.push(
      `Prestações com valor informado à mão, não apurado pela base dos alimentos: ${informadas.map(rotuloDaCompetencia).join(", ")}.`,
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

- [ ] **Step 4: Rodar e ver passar**

Execute: `npm run format && npm run verificar`
Esperado: tudo verde; 19 arquivos de teste, 537 passando | 9 pulados (546). Os 12 casos de referência passam sem alteração.

- [ ] **Step 5: Commit**

```bash
git add src/motor/correcao.ts src/motor/correcao.test.ts src/motor/calcular.ts src/motor/calcular.test.ts src/motor/juros.ts src/motor/juros.test.ts src/motor/base.ts src/motor/base.test.ts
git commit -m "motor: mês parcial da SELIC pelo obtidoEm do valor e avisos de mês ainda sem divulgação, com a previsão, pelo calendário da tabela

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```


### Task 7: Congelamento sem rede: tabela da cópia publicada com o calendário, rodapé e avisos da tela, e aviso ao reabrir um cálculo

**Files:**
- Create: `src/indices/congelar.ts`
- Test: `src/indices/congelar.test.ts`

**Interfaces:**
- Consome: `seriesEmbutidas` (Task 5); `esperadoAte`, `mesesAtrasados`, `agruparAtrasados`, `MesAtrasado`, `GrupoDeAtraso`, `SERIES_EM_ORDEM_NUMERICA` (Task 3); `compararInstantes`, `dataHoraEmBrasilia`, `formatarDataHoraBrasilia`, `hojeEmBrasilia` (Task 2); `NOME_DA_SERIE`, `formatarCompetencia`, `formatarData`, `formatarMoeda`, `decimalOuNulo`; tipos `IndiceUsado`, `TabelaIndices`, `ValorIndice`.
- Produz (o ponto de integração da fase 5):
  - `montarTabela(embutidas, hoje): TabelaIndices` — séries em ordem numérica, meses crescentes, fonte "embutida", `obtidoEm` de cada arquivo; `consultadoEm` = o `obtidoEm` mais recente entre os arquivos, comparado pelo instante (há arquivos em UTC e em Brasília); `esperadoAte` = calendário de `hoje`. Arquivo guardado sob o código de outra série é ignorado; arquivo vazio entra como {}.
  - `interface OpcoesCongelamento { hoje?; embutidas? }` — padrões: a data de Brasília (`hojeEmBrasilia()`) e a cópia publicada (`seriesEmbutidas()`).
  - `interface SituacaoIndices { atualizadoEm; ultimoMesPorSerie; atrasados; rodape; avisos }` e `descreverSituacao(tabela, hoje): SituacaoIndices` — o rodapé da tela (§8.3), "Índices oficiais BCB/SGS · IPCA até set/2026 · atualizados em 09/10/2026 14:17 (horário de Brasília)" (sem IPCA na tabela, sai o trecho do IPCA; sem nenhuma data, sai o trecho "atualizados em"); e os avisos do calendário para a caixa de avisos, um por grupo de meses já divulgados que a cópia publicada ainda não tem: "IPCA de set/2026, divulgado por volta de 10/10/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 12/09/2026.", com a data dos dados daquela série; o salário mínimo do ano numa frase só ("Salário mínimo de jan/2027 a dez/2027, …"); SELIC e taxa legal no feminino.
  - `congelarIndices(opcoes?): { tabela; situacao }` — **síncrona e sem rede**: a tela chama ao abrir o app e em "Novo cálculo", e a tabela fica igual até o próximo "Novo cálculo" ou "Abrir…".
  - `compararIndicesUsados(anterior, atual): string[]` — compara `indicesUsados` do cálculo salvo com os do recálculo (D5 e D6): "IGP-M de set/2026 mudou de 1,57% para 1,58% desde a atualização dos índices de 11/10/2026."; "Salário mínimo de jan/2027 (R$ 1.700,00) passou a ser usado; em 11/10/2026 valia o último publicado, dez/2026 (R$ 1.621,00)."; "Entraram no cálculo índices obtidos depois de 11/10/2026: IPCA de out/2026 (0,30%), nov/2026 (0,25%)."; "Índices da atualização de 11/10/2026 que não constam mais na tabela: …". Nada mudou → `[]`.

Decisões de 11 e 12/10/2026 (D4, D5, D6, D7 e rotina central). A data citada nas frases ao reabrir é a da atualização da cópia publicada que o cálculo salvo usou (`consultaIndices.em`), e não a de uma consulta ao BCB. Como o app não consulta o BCB, o congelamento é só ler a cópia publicada e o calendário do dia; some a dúvida entre esperar a consulta e trocar os números enquanto o usuário digita. Pendências fechadas aqui: congelamento com a data real dos índices (fases 2 e 3); aviso de índice mudado que nomeia o salário mínimo que deixa de ser "último publicado" (fase 3). A propriedade da §11 ("salvar e reabrir devolve o mesmo Resultado com os mesmos índices") é provada no teste "calcular duas vezes com a mesma tabela: nenhuma diferença", com o caso SAJ TJMS de 2018. Os testes não acessam a rede nem o armazenamento: `fetch` e `localStorage` são trocados por travas que acusam qualquer acesso; a cópia embutida real só é usada para conferir os padrões.

- [ ] **Step 1: Escrever o teste**

Crie `src/indices/congelar.test.ts` (39 testes):

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ArquivoSerie,
  CasoDeReferencia,
  CodigoSerie,
  Competencia,
  IndiceUsado,
  TabelaIndices,
  TextoDecimal,
  ValorIndice,
} from "../compartilhado/tipos.ts";
import { calcular } from "../motor/calcular.ts";
import textoDoCaso from "../motor/casos/2018-05-25-saj-tjms-alimentos.json?raw";
import { esperadoAte, mesesAtrasados, SERIES_EM_ORDEM_NUMERICA } from "./calendario.ts";
import { montarArquivoSerie } from "./cliente-bcb.ts";
import {
  compararIndicesUsados,
  congelarIndices,
  descreverSituacao,
  montarTabela,
} from "./congelar.ts";
import { seriesEmbutidas, tabelaEmbutida } from "./embutidos.ts";

// O app não consulta o BCB nem usa armazenamento (rotina central, decisão de 12/10/2026): a
// tabela vem só da cópia publicada. Nenhum teste deste arquivo acessa a rede nem o armazenamento
// do navegador. Por garantia, o fetch e o localStorage globais são trocados por travas que lançam
// na hora, e o afterEach confere que ninguém as chamou. Os testes que dependem da cópia embutida
// real não fixam valores (ela muda a cada atualização); os demais usam uma cópia pequena e fixa.

let travaDaRede = vi.fn();
let travaDoArmazenamento = vi.fn();

const OBTIDO_11_10 = "2026-10-11T20:11:55-03:00";
const SEIS: CodigoSerie[] = ["188", "189", "433", "1619", "4390", "29543"];

beforeEach(() => {
  travaDaRede = vi.fn(() => {
    throw new Error("Teste tentou acessar a rede pelo fetch global.");
  });
  travaDoArmazenamento = vi.fn(() => {
    throw new Error("Teste tentou usar o armazenamento do navegador.");
  });
  vi.stubGlobal("fetch", travaDaRede);
  vi.stubGlobal("localStorage", {
    getItem: travaDoArmazenamento,
    setItem: travaDoArmazenamento,
    removeItem: travaDoArmazenamento,
    clear: travaDoArmazenamento,
    key: travaDoArmazenamento,
    length: 0,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  expect(travaDaRede, "um teste chamou o fetch global (rede)").not.toHaveBeenCalled();
  expect(travaDoArmazenamento, "um teste usou o localStorage").not.toHaveBeenCalled();
});

function arquivo(
  codigo: CodigoSerie,
  pares: Array<[Competencia, TextoDecimal]>,
  obtidoEm: string = OBTIDO_11_10,
): ArquivoSerie {
  return montarArquivoSerie(
    codigo,
    pares.map(([competencia, valor]) => ({ competencia, valor })),
    obtidoEm,
  );
}

/** Cópia embutida de teste, como se publicada em 11/10/2026: dois meses por série. */
function embutidasDeTeste(obtidoEm: string = OBTIDO_11_10): Record<CodigoSerie, ArquivoSerie> {
  return {
    "188": arquivo(
      "188",
      [
        ["2026-08", "-0.21"],
        ["2026-09", "0.82"],
      ],
      obtidoEm,
    ),
    "189": arquivo(
      "189",
      [
        ["2026-08", "0.36"],
        ["2026-09", "1.57"],
      ],
      obtidoEm,
    ),
    "433": arquivo(
      "433",
      [
        ["2026-08", "-0.11"],
        ["2026-09", "0.82"],
      ],
      obtidoEm,
    ),
    "1619": arquivo(
      "1619",
      [
        ["2026-11", "1621.00"],
        ["2026-12", "1621.00"],
      ],
      obtidoEm,
    ),
    "29543": arquivo(
      "29543",
      [
        ["2026-09", "0.371228"],
        ["2026-10", "0.379020"],
      ],
      obtidoEm,
    ),
    "4390": arquivo(
      "4390",
      [
        ["2026-09", "1.17"],
        ["2026-10", "0.36"],
      ],
      obtidoEm,
    ),
  };
}

/** Valor de tabela da cópia embutida, para montar tabelas à mão nos testes de descreverSituacao. */
function embutido(valor: TextoDecimal, obtidoEm: string = OBTIDO_11_10): ValorIndice {
  return { valor, fonte: "embutida", obtidoEm };
}

/** Série de tabela com os meses dados, todos com a mesma data de obtenção. */
function serieDe(
  meses: Competencia[],
  obtidoEm: string = OBTIDO_11_10,
): Record<Competencia, ValorIndice> {
  return Object.fromEntries(meses.map((mes) => [mes, embutido("0.10", obtidoEm)]));
}

// =============================================================================================
// montarTabela
// =============================================================================================

describe("montarTabela", () => {
  it("fonte embutida, obtidoEm de cada arquivo, séries em ordem numérica, meses crescentes e esperadoAte do calendário", () => {
    const embutidas = embutidasDeTeste();
    embutidas["189"] = arquivo("189", [["2026-09", "1.57"]], "2026-10-11T21:00:00-03:00");
    // Meses fora de ordem no arquivo saem em ordem crescente na tabela.
    embutidas["433"] = arquivo("433", [
      ["2026-09", "0.82"],
      ["2026-07", "0.26"],
      ["2026-08", "-0.11"],
    ]);
    const copia = structuredClone(embutidas);
    const tabela = montarTabela(embutidas, "2026-10-11");

    expect(tabela.series["433"]).toEqual({
      "2026-07": { valor: "0.26", fonte: "embutida", obtidoEm: OBTIDO_11_10 },
      "2026-08": { valor: "-0.11", fonte: "embutida", obtidoEm: OBTIDO_11_10 },
      "2026-09": { valor: "0.82", fonte: "embutida", obtidoEm: OBTIDO_11_10 },
    });
    expect(Object.keys(tabela.series["433"] ?? {})).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(tabela.series["189"]).toEqual({
      "2026-09": { valor: "1.57", fonte: "embutida", obtidoEm: "2026-10-11T21:00:00-03:00" },
    });
    expect(tabela.series["4390"]).toEqual({
      "2026-09": { valor: "1.17", fonte: "embutida", obtidoEm: OBTIDO_11_10 },
      "2026-10": { valor: "0.36", fonte: "embutida", obtidoEm: OBTIDO_11_10 },
    });
    expect(Object.keys(tabela.series)).toEqual([...SERIES_EM_ORDEM_NUMERICA]);
    expect(Object.keys(tabela.series)).toEqual(SEIS);
    expect(tabela.consultadoEm).toBe("2026-10-11T21:00:00-03:00");
    expect(tabela.esperadoAte).toEqual({
      "188": "2026-08",
      "189": "2026-09",
      "433": "2026-08",
      "1619": "2026-12",
      "29543": "2026-10",
      "4390": "2026-10",
    });
    // Os arquivos recebidos não são alterados.
    expect(embutidas).toEqual(copia);
  });

  it("consultadoEm é o obtidoEm mais recente pelo instante, não pelo texto (arquivos em UTC e em Brasília)", () => {
    // 20:30 em Brasília = 23:30 UTC, depois de 23:11 UTC, embora "…T20" venha antes de "…T23" no texto.
    const emUtc = "2026-10-11T23:11:55.140Z";
    const embutidas = embutidasDeTeste(emUtc);
    const depois = "2026-10-11T20:30:00-03:00";
    embutidas["433"] = arquivo("433", [["2026-09", "0.82"]], depois);
    const tabela = montarTabela(embutidas, "2026-10-11");
    expect(tabela.consultadoEm).toBe(depois);
    expect(tabela.series["433"]?.["2026-09"]?.obtidoEm).toBe(depois);
    expect(tabela.series["189"]?.["2026-09"]?.obtidoEm).toBe(emUtc);

    // E o inverso: 20:00 em Brasília (23:00 UTC) é anterior a 23:11 UTC.
    embutidas["433"] = arquivo("433", [["2026-09", "0.82"]], "2026-10-11T20:00:00-03:00");
    expect(montarTabela(embutidas, "2026-10-11").consultadoEm).toBe(emUtc);
  });

  it("hoje só decide o esperadoAte: no mesmo arquivo, 14/10 e 15/10 mudam o IPCA e o INPC e nada mais", () => {
    const dia14 = montarTabela(embutidasDeTeste(), "2026-10-14");
    const dia15 = montarTabela(embutidasDeTeste(), "2026-10-15");
    expect(dia14.esperadoAte).toEqual(esperadoAte("2026-10-14"));
    expect(dia15.esperadoAte).toEqual(esperadoAte("2026-10-15"));
    expect(dia14.esperadoAte?.["433"]).toBe("2026-08");
    expect(dia15.esperadoAte?.["433"]).toBe("2026-09");
    expect(dia14.esperadoAte?.["188"]).toBe("2026-08");
    expect(dia15.esperadoAte?.["188"]).toBe("2026-09");
    expect({ ...dia14, esperadoAte: undefined }).toEqual({ ...dia15, esperadoAte: undefined });
  });

  it("arquivo guardado sob o código de outra série é ignorado, também no consultadoEm (códigos nunca se misturam)", () => {
    const embutidas = embutidasDeTeste();
    embutidas["188"] = arquivo("433", [["2026-10", "0.30"]], "2026-10-20T10:00:00-03:00");
    const tabela = montarTabela(embutidas, "2026-10-25");
    expect("188" in tabela.series).toBe(false);
    expect(tabela.series["433"]).toEqual({
      "2026-08": { valor: "-0.11", fonte: "embutida", obtidoEm: OBTIDO_11_10 },
      "2026-09": { valor: "0.82", fonte: "embutida", obtidoEm: OBTIDO_11_10 },
    });
    expect(tabela.consultadoEm).toBe(OBTIDO_11_10);
  });

  it("arquivo vazio entra como {} e a data dele conta para consultadoEm; série sem arquivo fica de fora", () => {
    const parciais: Partial<Record<CodigoSerie, ArquivoSerie>> = embutidasDeTeste();
    parciais["188"] = arquivo("188", [], "2026-10-12T08:00:00-03:00");
    delete parciais["4390"];
    const tabela = montarTabela(parciais as Record<CodigoSerie, ArquivoSerie>, "2026-10-12");
    expect(tabela.series["188"]).toEqual({});
    expect("4390" in tabela.series).toBe(false);
    expect(Object.keys(tabela.series)).toEqual(["188", "189", "433", "1619", "29543"]);
    expect(tabela.consultadoEm).toBe("2026-10-12T08:00:00-03:00");
    // O esperadoAte cobre as seis séries, com ou sem arquivo.
    expect(tabela.esperadoAte).toEqual(esperadoAte("2026-10-12"));
  });

  it("sem nenhum arquivo: nenhuma série, consultadoEm vazio e o esperadoAte do calendário", () => {
    expect(montarTabela({} as Record<CodigoSerie, ArquivoSerie>, "2026-10-11")).toEqual({
      consultadoEm: "",
      series: {},
      esperadoAte: esperadoAte("2026-10-11"),
    });
  });

  it("com a cópia embutida real: igual à tabelaEmbutida mais o esperadoAte", () => {
    expect(montarTabela(seriesEmbutidas(), "2026-10-11")).toEqual({
      ...tabelaEmbutida(),
      esperadoAte: esperadoAte("2026-10-11"),
    });
  });
});

// =============================================================================================
// descreverSituacao
// =============================================================================================

const ATUALIZADO_09_10 = "2026-10-09T14:17:00-03:00";

/** A tabela de teste atualizada em 09/10/2026 14:17 (nenhuma série atrasada em 11/10/2026). */
function tabelaDe09_10(): TabelaIndices {
  return montarTabela(embutidasDeTeste(ATUALIZADO_09_10), "2026-10-11");
}

describe("descreverSituacao", () => {
  it("em dia: rodapé com o IPCA e a data e hora da atualização em Brasília (exemplo da especificação), sem avisos", () => {
    const tabela = tabelaDe09_10();
    const copia = structuredClone(tabela);
    expect(descreverSituacao(tabela, "2026-10-11")).toEqual({
      atualizadoEm: ATUALIZADO_09_10,
      ultimoMesPorSerie: {
        "188": "2026-09",
        "189": "2026-09",
        "433": "2026-09",
        "1619": "2026-12",
        "29543": "2026-10",
        "4390": "2026-10",
      },
      atrasados: [],
      rodape:
        "Índices oficiais BCB/SGS · IPCA até set/2026 · atualizados em 09/10/2026 14:17 (horário de Brasília)",
      avisos: [],
    });
    // A tabela recebida não é alterada.
    expect(tabela).toEqual(copia);
  });

  it("atualizadoEm é o consultadoEm da tabela como veio; o rodapé converte UTC para Brasília, inclusive na virada do dia", () => {
    const tabela = { ...tabelaDe09_10(), consultadoEm: "2026-10-10T02:30:00Z" };
    const situacao = descreverSituacao(tabela, "2026-10-11");
    expect(situacao.atualizadoEm).toBe("2026-10-10T02:30:00Z");
    expect(situacao.rodape).toBe(
      "Índices oficiais BCB/SGS · IPCA até set/2026 · atualizados em 09/10/2026 23:30 (horário de Brasília)",
    );
  });

  it("sem IPCA na tabela (ausente ou vazio), o rodapé omite o trecho 'IPCA até …'", () => {
    const semIpca = tabelaDe09_10();
    delete semIpca.series["433"];
    const situacao = descreverSituacao(semIpca, "2026-10-11");
    expect(situacao.rodape).toBe(
      "Índices oficiais BCB/SGS · atualizados em 09/10/2026 14:17 (horário de Brasília)",
    );
    expect("433" in situacao.ultimoMesPorSerie).toBe(false);

    const ipcaVazio = { ...tabelaDe09_10(), series: { ...tabelaDe09_10().series, "433": {} } };
    const vazio = descreverSituacao(ipcaVazio, "2026-10-11");
    expect(vazio.rodape).toBe(
      "Índices oficiais BCB/SGS · atualizados em 09/10/2026 14:17 (horário de Brasília)",
    );
    expect("433" in vazio.ultimoMesPorSerie).toBe(false);
  });

  it("o IPCA do rodapé é o maior mês da série, mesmo com os meses fora de ordem na tabela", () => {
    const tabela: TabelaIndices = {
      consultadoEm: ATUALIZADO_09_10,
      series: { "433": serieDe(["2026-09", "2026-07", "2026-08"], ATUALIZADO_09_10) },
    };
    const situacao = descreverSituacao(tabela, "2026-10-11");
    expect(situacao.rodape).toBe(
      "Índices oficiais BCB/SGS · IPCA até set/2026 · atualizados em 09/10/2026 14:17 (horário de Brasília)",
    );
    expect(situacao.ultimoMesPorSerie).toEqual({ "433": "2026-09" });
  });

  it("tabela vazia, sem séries nem data: nada atrasado e o rodapé fica só com a fonte", () => {
    expect(descreverSituacao({ consultadoEm: "", series: {} }, "2026-10-11")).toEqual({
      atualizadoEm: "",
      ultimoMesPorSerie: {},
      atrasados: [],
      rodape: "Índices oficiais BCB/SGS",
      avisos: [],
    });
  });

  it("mês atrasado pelo calendário vira aviso com a previsão e a data dos dados (exemplo da especificação)", () => {
    const tabela: TabelaIndices = {
      consultadoEm: "2026-09-12T10:00:00-03:00",
      series: { "433": serieDe(["2026-07", "2026-08"], "2026-09-12T10:00:00-03:00") },
    };
    const situacao = descreverSituacao(tabela, "2026-10-15");
    expect(situacao).toEqual({
      atualizadoEm: "2026-09-12T10:00:00-03:00",
      ultimoMesPorSerie: { "433": "2026-08" },
      atrasados: [{ serie: "433", competencia: "2026-09", previsao: "por volta de 10/10/2026" }],
      rodape:
        "Índices oficiais BCB/SGS · IPCA até ago/2026 · atualizados em 12/09/2026 10:00 (horário de Brasília)",
      avisos: [
        "IPCA de set/2026, divulgado por volta de 10/10/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 12/09/2026.",
      ],
    });
    // Na véspera do dia 15, o IPCA de set/2026 ainda não conta como divulgado.
    const vespera = descreverSituacao(tabela, "2026-10-14");
    expect(vespera.atrasados).toEqual([]);
    expect(vespera.avisos).toEqual([]);
  });

  it("a data do aviso é a dos dados da própria série (o maior obtidoEm dela, pelo instante, em Brasília), não a da tabela", () => {
    // IPCA: jul obtido às 00:30 de 13/09 em Brasília (03:30 UTC) e ago às 02:00 UTC de 13/09
    // (23:00 de 12/09 em Brasília). Pelo texto, o de ago seria o mais recente; pelo instante, é o
    // de jul, e a data em Brasília é 13/09/2026 (não 12/09/2026).
    // SELIC: obtida às 01:30 UTC de 02/10, que em Brasília ainda é 01/10/2026.
    const tabela: TabelaIndices = {
      consultadoEm: "2026-10-25T09:00:00-03:00",
      series: {
        "433": {
          "2026-07": embutido("0.26", "2026-09-13T00:30:00-03:00"),
          "2026-08": embutido("-0.11", "2026-09-13T02:00:00Z"),
        },
        "4390": serieDe(["2026-09"], "2026-10-02T01:30:00Z"),
        "189": serieDe(["2026-09"], "2026-10-25T09:00:00-03:00"),
      },
    };
    const situacao = descreverSituacao(tabela, "2026-10-25");
    expect(situacao.avisos).toEqual([
      "IPCA de set/2026, divulgado por volta de 10/10/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 13/09/2026.",
      "SELIC de out/2026, divulgada ao longo de out/2026, como acumulado parcial fechado no início de nov/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 01/10/2026.",
    ]);
    expect(situacao.rodape).toBe(
      "Índices oficiais BCB/SGS · IPCA até ago/2026 · atualizados em 25/10/2026 09:00 (horário de Brasília)",
    );
  });

  it("série atrasada cujos dados não têm data de obtenção: o aviso usa a data da tabela", () => {
    const tabela: TabelaIndices = {
      consultadoEm: OBTIDO_11_10,
      series: { "433": serieDe(["2026-08"], "") },
    };
    expect(descreverSituacao(tabela, "2026-10-15").avisos).toEqual([
      "IPCA de set/2026, divulgado por volta de 10/10/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
    ]);
  });

  it("o salário mínimo de um ano inteiro atrasado sai numa frase só (mesma previsão para os 12 meses)", () => {
    const tabela: TabelaIndices = {
      consultadoEm: OBTIDO_11_10,
      series: { "1619": serieDe(["2026-12"]) },
    };
    const situacao = descreverSituacao(tabela, "2027-02-01");
    expect(situacao.atrasados).toHaveLength(12);
    expect(situacao.atrasados[0]).toEqual({
      serie: "1619",
      competencia: "2027-01",
      previsao: "no início de 2027, com o decreto do salário mínimo",
    });
    expect(situacao.atrasados.at(-1)?.competencia).toBe("2027-12");
    expect(situacao.avisos).toEqual([
      "Salário mínimo de jan/2027 a dez/2027, divulgado no início de 2027, com o decreto do salário mínimo, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
    ]);
  });

  it("salário mínimo: em janeiro o ano novo ainda não é cobrado; ano parcial agrupa o resto; dois anos atrasados são duas frases", () => {
    const ateDez2026: TabelaIndices = {
      consultadoEm: OBTIDO_11_10,
      series: { "1619": serieDe(["2026-12"]) },
    };
    expect(descreverSituacao(ateDez2026, "2027-01-20").avisos).toEqual([]);

    const ateMar2027: TabelaIndices = {
      consultadoEm: OBTIDO_11_10,
      series: { "1619": serieDe(["2027-01", "2027-02", "2027-03"]) },
    };
    expect(descreverSituacao(ateMar2027, "2027-02-01").avisos).toEqual([
      "Salário mínimo de abr/2027 a dez/2027, divulgado no início de 2027, com o decreto do salário mínimo, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
    ]);

    const ateDez2025: TabelaIndices = {
      consultadoEm: OBTIDO_11_10,
      series: { "1619": serieDe(["2025-12"]) },
    };
    const doisAnos = descreverSituacao(ateDez2025, "2027-02-01");
    expect(doisAnos.atrasados).toHaveLength(24);
    expect(doisAnos.avisos).toEqual([
      "Salário mínimo de jan/2026 a dez/2026, divulgado no início de 2026, com o decreto do salário mínimo, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
      "Salário mínimo de jan/2027 a dez/2027, divulgado no início de 2027, com o decreto do salário mínimo, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
    ]);
  });

  it("vários atrasos: um aviso por grupo, séries em ordem numérica, meses crescentes, SELIC e taxa legal no feminino, maiúscula no início", () => {
    // Séries de propósito fora de ordem no objeto; meses com previsões diferentes (INPC de ago e de
    // set) ficam em frases separadas.
    const tabela: TabelaIndices = {
      consultadoEm: OBTIDO_11_10,
      series: {
        "29543": serieDe(["2026-09"]),
        "4390": serieDe(["2026-09"]),
        "1619": serieDe(["2026-11"]),
        "433": serieDe(["2026-09"]),
        "189": serieDe(["2026-08"]),
        "188": serieDe(["2026-07"]),
      },
    };
    const situacao = descreverSituacao(tabela, "2026-10-20");
    expect(situacao.atrasados.map((m) => `${m.serie} ${m.competencia}`)).toEqual([
      "188 2026-08",
      "188 2026-09",
      "189 2026-09",
      "1619 2026-12",
      "4390 2026-10",
      "29543 2026-10",
    ]);
    expect(situacao.atrasados).toEqual(mesesAtrasados(tabela, "2026-10-20"));
    expect(situacao.avisos).toEqual([
      "INPC de ago/2026, divulgado por volta de 10/09/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
      "INPC de set/2026, divulgado por volta de 10/10/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
      "IGP-M de set/2026, divulgado no fim de set/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
      "Salário mínimo de dez/2026, divulgado no início de 2026, com o decreto do salário mínimo, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
      "SELIC de out/2026, divulgada ao longo de out/2026, como acumulado parcial fechado no início de nov/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
      "Taxa legal de out/2026, divulgada no 1º dia útil de out/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
    ]);
    expect(situacao.ultimoMesPorSerie).toEqual({
      "188": "2026-07",
      "189": "2026-08",
      "433": "2026-09",
      "1619": "2026-11",
      "4390": "2026-09",
      "29543": "2026-09",
    });
    expect(Object.keys(situacao.ultimoMesPorSerie)).toEqual(SEIS);
    // Os avisos ficam na caixa da tela; o rodapé não muda por causa deles.
    expect(situacao.rodape).toBe(
      "Índices oficiais BCB/SGS · IPCA até set/2026 · atualizados em 11/10/2026 20:11 (horário de Brasília)",
    );
  });

  it("série adiantada ou em dia não gera aviso; série vazia ou ausente também não", () => {
    const tabela: TabelaIndices = {
      consultadoEm: OBTIDO_11_10,
      series: {
        "433": serieDe(["2026-11"]),
        "4390": serieDe(["2026-10"]),
        "188": {},
      },
    };
    const situacao = descreverSituacao(tabela, "2026-10-20");
    expect(situacao.atrasados).toEqual([]);
    expect(situacao.avisos).toEqual([]);
    expect(situacao.ultimoMesPorSerie).toEqual({ "433": "2026-11", "4390": "2026-10" });
  });
});

// =============================================================================================
// congelarIndices
// =============================================================================================

describe("congelarIndices", () => {
  it("padrões: cópia embutida real e hoje pelo relógio de Brasília (23:30 de 14/10 em Campo Grande já é 15/10 em Brasília e muda o esperadoAte do IPCA)", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // Campo Grande (MS) fica uma hora atrás de Brasília: 23:30 de 14/10 lá é 00:30 de 15/10 aqui.
    vi.setSystemTime(new Date("2026-10-14T23:30:00-04:00"));
    // O IPCA e o INPC de set/2026 só contam como divulgados a partir de 15/10: com a data de
    // Campo Grande o esperadoAte deles seria ago/2026; com a de Brasília, set/2026.
    expect(esperadoAte("2026-10-14")["433"]).toBe("2026-08");
    expect(esperadoAte("2026-10-15")["433"]).toBe("2026-09");

    const { tabela, situacao } = congelarIndices();
    expect(tabela).toEqual({ ...tabelaEmbutida(), esperadoAte: esperadoAte("2026-10-15") });
    expect(tabela.esperadoAte?.["433"]).toBe("2026-09");
    expect(situacao).toEqual(descreverSituacao(tabela, "2026-10-15"));
    expect(situacao.atualizadoEm).toBe(tabelaEmbutida().consultadoEm);
    expect(situacao.rodape).toMatch(
      /^Índices oficiais BCB\/SGS · IPCA até [a-z]{3}\/\d{4} · atualizados em \d{2}\/\d{2}\/\d{4} \d{2}:\d{2} \(horário de Brasília\)$/,
    );
  });

  it("só as embutidas informadas: hoje pelo relógio de Brasília (23:30 de 14/10 em Brasília é 15/10 em UTC, mas ainda 14/10 aqui)", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-15T02:30:00Z"));
    const { tabela } = congelarIndices({ embutidas: embutidasDeTeste() });
    expect(tabela).toEqual(montarTabela(embutidasDeTeste(), "2026-10-14"));
    expect(tabela.esperadoAte?.["433"]).toBe("2026-08");
  });

  it("só o hoje informado: usa a cópia embutida real", () => {
    expect(congelarIndices({ hoje: "2026-10-11" }).tabela).toEqual({
      ...tabelaEmbutida(),
      esperadoAte: esperadoAte("2026-10-11"),
    });
  });

  it("embutidas pequenas e hoje informado: a tabela de montarTabela e a situação de descreverSituacao, de forma síncrona", () => {
    const resultado = congelarIndices({ embutidas: embutidasDeTeste(), hoje: "2026-11-20" });
    expect(resultado).not.toBeInstanceOf(Promise);
    const { tabela, situacao } = resultado;
    expect(tabela).toEqual(montarTabela(embutidasDeTeste(), "2026-11-20"));
    expect(situacao).toEqual(descreverSituacao(tabela, "2026-11-20"));
    expect(situacao).toEqual({
      atualizadoEm: OBTIDO_11_10,
      ultimoMesPorSerie: {
        "188": "2026-09",
        "189": "2026-09",
        "433": "2026-09",
        "1619": "2026-12",
        "29543": "2026-10",
        "4390": "2026-10",
      },
      atrasados: [
        { serie: "188", competencia: "2026-10", previsao: "por volta de 10/11/2026" },
        { serie: "189", competencia: "2026-10", previsao: "no fim de out/2026" },
        { serie: "433", competencia: "2026-10", previsao: "por volta de 10/11/2026" },
        {
          serie: "4390",
          competencia: "2026-11",
          previsao: "ao longo de nov/2026, como acumulado parcial fechado no início de dez/2026",
        },
        { serie: "29543", competencia: "2026-11", previsao: "no 1º dia útil de nov/2026" },
      ],
      rodape:
        "Índices oficiais BCB/SGS · IPCA até set/2026 · atualizados em 11/10/2026 20:11 (horário de Brasília)",
      avisos: [
        "INPC de out/2026, divulgado por volta de 10/11/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
        "IGP-M de out/2026, divulgado no fim de out/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
        "IPCA de out/2026, divulgado por volta de 10/11/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
        "SELIC de nov/2026, divulgada ao longo de nov/2026, como acumulado parcial fechado no início de dez/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
        "Taxa legal de nov/2026, divulgada no 1º dia útil de nov/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
      ],
    });
  });

  it("cada chamada monta uma tabela nova: alterar o resultado de uma não muda a seguinte", () => {
    const primeira = congelarIndices({ embutidas: embutidasDeTeste(), hoje: "2026-10-11" });
    delete primeira.tabela.series["433"];
    const serie189 = primeira.tabela.series["189"];
    if (serie189) delete serie189["2026-09"];
    const segunda = congelarIndices({ embutidas: embutidasDeTeste(), hoje: "2026-10-11" });
    expect(segunda.tabela).toEqual(montarTabela(embutidasDeTeste(), "2026-10-11"));

    const real = congelarIndices({ hoje: "2026-10-11" });
    delete real.tabela.series["433"];
    expect(congelarIndices({ hoje: "2026-10-11" }).tabela.series["433"]).toBeDefined();
  });
});

// =============================================================================================
// compararIndicesUsados
// =============================================================================================

const CONSULTA_ANTERIOR = "2026-10-11T14:02:00-03:00";
const CONSULTA_ATUAL = "2026-11-12T10:00:00-03:00";

function usado(serie: CodigoSerie, competencia: Competencia, valor: TextoDecimal): IndiceUsado {
  return { serie, competencia, valor, fonte: "embutida", obtidoEm: OBTIDO_11_10 };
}

function comparar(anteriores: IndiceUsado[], atuais: IndiceUsado[]): string[] {
  return compararIndicesUsados(
    { indicesUsados: anteriores, consultadoEm: CONSULTA_ANTERIOR },
    { indicesUsados: atuais, consultadoEm: CONSULTA_ATUAL },
  );
}

describe("compararIndicesUsados", () => {
  it("nada mudou: lista vazia (mesmo com fonte e obtidoEm diferentes, ou ordem trocada)", () => {
    const anteriores = [usado("433", "2026-09", "0.82"), usado("189", "2026-09", "1.57")];
    const atuais = [
      { ...usado("189", "2026-09", "1.57"), fonte: "aoVivo" as const, obtidoEm: CONSULTA_ATUAL },
      usado("433", "2026-09", "0.82"),
    ];
    expect(comparar(anteriores, atuais)).toEqual([]);
    expect(comparar([], [])).toEqual([]);
  });

  it("mudou: uma linha por série e mês, com o valor antigo e o novo (exemplo da especificação)", () => {
    expect(comparar([usado("189", "2026-09", "1.57")], [usado("189", "2026-09", "1.58")])).toEqual([
      "IGP-M de set/2026 mudou de 1,57% para 1,58% desde a atualização dos índices de 11/10/2026.",
    ]);
  });

  it("mudou: salário mínimo em reais, taxa legal com 6 casas, negativo com sinal; séries em ordem numérica e meses crescentes", () => {
    const anteriores = [
      usado("29543", "2026-10", "0.379020"),
      usado("1619", "2026-12", "1621.00"),
      usado("433", "2026-09", "0.82"),
      usado("433", "2026-08", "-0.11"),
    ];
    const atuais = [
      usado("433", "2026-08", "0.05"),
      usado("433", "2026-09", "0.83"),
      usado("1619", "2026-12", "1630.00"),
      usado("29543", "2026-10", "0.380000"),
    ];
    expect(comparar(anteriores, atuais)).toEqual([
      "IPCA de ago/2026 mudou de -0,11% para 0,05% desde a atualização dos índices de 11/10/2026.",
      "IPCA de set/2026 mudou de 0,82% para 0,83% desde a atualização dos índices de 11/10/2026.",
      "Salário mínimo de dez/2026 mudou de R$ 1.621,00 para R$ 1.630,00 desde a atualização dos índices de 11/10/2026.",
      "Taxa legal de out/2026 mudou de 0,379020% para 0,380000% desde a atualização dos índices de 11/10/2026.",
    ]);
  });

  it("o mesmo número escrito de outro jeito (0.8 e 0.80) não conta como mudança", () => {
    expect(comparar([usado("433", "2026-09", "0.8")], [usado("433", "2026-09", "0.80")])).toEqual(
      [],
    );
  });

  it("entraram: uma frase, agrupada por série, meses crescentes (exemplo da especificação)", () => {
    const anteriores = [usado("433", "2026-09", "0.82")];
    const atuais = [
      usado("433", "2026-11", "0.25"),
      usado("433", "2026-09", "0.82"),
      usado("433", "2026-10", "0.30"),
    ];
    expect(comparar(anteriores, atuais)).toEqual([
      "Entraram no cálculo índices obtidos depois de 11/10/2026: IPCA de out/2026 (0,30%), nov/2026 (0,25%).",
    ]);
  });

  it("entraram de várias séries: séries em ordem numérica, separadas por ponto e vírgula", () => {
    const atuais = [
      usado("4390", "2026-10", "0.58"),
      usado("433", "2026-10", "0.30"),
      usado("189", "2026-10", "0.20"),
    ];
    expect(comparar([], atuais)).toEqual([
      "Entraram no cálculo índices obtidos depois de 11/10/2026: IGP-M de out/2026 (0,20%); IPCA de out/2026 (0,30%); SELIC de out/2026 (0,58%).",
    ]);
  });

  it("saíram: uma frase com os índices que não constam mais (exemplo da especificação)", () => {
    const anteriores = [usado("189", "2018-05", "0.64"), usado("189", "2018-04", "0.57")];
    expect(comparar(anteriores, [usado("189", "2018-04", "0.57")])).toEqual([
      "Índices da atualização de 11/10/2026 que não constam mais na tabela: IGP-M de mai/2018 (0,64%).",
    ]);
  });

  it("salário mínimo novo nomeado com o último publicado que valia antes, que não sai como 'saiu' (exemplo da especificação)", () => {
    expect(
      comparar([usado("1619", "2026-12", "1621.00")], [usado("1619", "2027-01", "1700.00")]),
    ).toEqual([
      "Salário mínimo de jan/2027 (R$ 1.700,00) passou a ser usado; em 11/10/2026 valia o último publicado, dez/2026 (R$ 1.621,00).",
    ]);
  });

  it("salário mínimo: cada mês novo vira uma frase com o maior mês anterior menor que ele; os demais meses antigos saem", () => {
    const anteriores = [usado("1619", "2017-01", "937.00"), usado("1619", "2026-12", "1621.00")];
    const atuais = [usado("1619", "2027-02", "1700.00"), usado("1619", "2027-01", "1700.00")];
    expect(comparar(anteriores, atuais)).toEqual([
      "Salário mínimo de jan/2027 (R$ 1.700,00) passou a ser usado; em 11/10/2026 valia o último publicado, dez/2026 (R$ 1.621,00).",
      "Salário mínimo de fev/2027 (R$ 1.700,00) passou a ser usado; em 11/10/2026 valia o último publicado, dez/2026 (R$ 1.621,00).",
      "Índices da atualização de 11/10/2026 que não constam mais na tabela: salário mínimo de jan/2017 (R$ 937,00).",
    ]);
  });

  it("salário mínimo: o mês anterior que continua em uso não sai; mês novo sem anterior menor entra na lista comum", () => {
    expect(
      comparar(
        [usado("1619", "2026-12", "1621.00")],
        [usado("1619", "2026-12", "1621.00"), usado("1619", "2027-01", "1700.00")],
      ),
    ).toEqual([
      "Salário mínimo de jan/2027 (R$ 1.700,00) passou a ser usado; em 11/10/2026 valia o último publicado, dez/2026 (R$ 1.621,00).",
    ]);
    expect(
      comparar(
        [usado("433", "2026-09", "0.82"), usado("1619", "2027-03", "1700.00")],
        [
          usado("433", "2026-09", "0.82"),
          usado("1619", "2027-01", "1700.00"),
          usado("1619", "2027-03", "1700.00"),
        ],
      ),
    ).toEqual([
      "Entraram no cálculo índices obtidos depois de 11/10/2026: salário mínimo de jan/2027 (R$ 1.700,00).",
    ]);
  });

  it("a frase do último publicado vale só para o salário mínimo: o IPCA novo entra na lista comum", () => {
    expect(
      comparar(
        [usado("1619", "2026-09", "1621.00")],
        [usado("1619", "2026-09", "1621.00"), usado("433", "2026-10", "0.30")],
      ),
    ).toEqual([
      "Entraram no cálculo índices obtidos depois de 11/10/2026: IPCA de out/2026 (0,30%).",
    ]);
  });

  it("ordem das frases: mudou, salário mínimo, entraram, saíram", () => {
    const anteriores = [
      usado("189", "2018-05", "0.64"),
      usado("1619", "2026-12", "1621.00"),
      usado("189", "2026-09", "1.57"),
    ];
    const atuais = [
      usado("433", "2026-10", "0.30"),
      usado("1619", "2027-01", "1700.00"),
      usado("189", "2026-09", "1.58"),
    ];
    expect(comparar(anteriores, atuais)).toEqual([
      "IGP-M de set/2026 mudou de 1,57% para 1,58% desde a atualização dos índices de 11/10/2026.",
      "Salário mínimo de jan/2027 (R$ 1.700,00) passou a ser usado; em 11/10/2026 valia o último publicado, dez/2026 (R$ 1.621,00).",
      "Entraram no cálculo índices obtidos depois de 11/10/2026: IPCA de out/2026 (0,30%).",
      "Índices da atualização de 11/10/2026 que não constam mais na tabela: IGP-M de mai/2018 (0,64%).",
    ]);
  });

  it("a data da consulta anterior é a de Brasília, mesmo quando gravada em UTC", () => {
    expect(
      compararIndicesUsados(
        { indicesUsados: [usado("189", "2026-09", "1.57")], consultadoEm: "2026-10-12T02:30:00Z" },
        { indicesUsados: [usado("189", "2026-09", "1.58")], consultadoEm: CONSULTA_ATUAL },
      ),
    ).toEqual([
      "IGP-M de set/2026 mudou de 1,57% para 1,58% desde a atualização dos índices de 11/10/2026.",
    ]);
  });

  describe("com o motor (caso SAJ TJMS de 2018)", () => {
    const caso = JSON.parse(textoDoCaso) as CasoDeReferencia;
    const usados = (tabela: TabelaIndices) => {
      const resultado = calcular(caso.calculo, tabela);
      return { indicesUsados: resultado.indicesUsados, consultadoEm: resultado.consultaIndices.em };
    };

    it("calcular duas vezes com a mesma tabela: nenhuma diferença", () => {
      const primeiro = usados(caso.indices);
      expect(primeiro.indicesUsados.length).toBeGreaterThan(0);
      expect(compararIndicesUsados(primeiro, usados(caso.indices))).toEqual([]);
    });

    it("recalcular com um índice revisto: uma linha de mudança", () => {
      const revista: TabelaIndices = structuredClone(caso.indices);
      const igpm = revista.series["189"];
      const abril = igpm?.["2018-04"];
      expect(abril?.valor).toBe("0.57");
      if (igpm && abril) igpm["2018-04"] = { ...abril, valor: "0.60" };
      const frases = compararIndicesUsados(usados(caso.indices), usados(revista));
      expect(frases).toHaveLength(1);
      expect(frases[0]).toMatch(
        /^IGP-M de abr\/2018 mudou de 0,57% para 0,60% desde a atualização dos índices de /,
      );
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Execute: `npm test -- src/indices/congelar.test.ts`
Esperado: o arquivo de teste falha ao carregar ("Cannot find module './congelar.ts'"); nenhum teste roda.

- [ ] **Step 3: Escrever o código**

Crie `src/indices/congelar.ts`:

```ts
import { decimalOuNulo } from "../compartilhado/decimal.ts";
import { formatarCompetencia, formatarData, formatarMoeda } from "../compartilhado/formatacao.ts";
import { NOME_DA_SERIE } from "../compartilhado/tipos.ts";
import type {
  ArquivoSerie,
  CodigoSerie,
  Competencia,
  DataISO,
  IndiceUsado,
  TabelaIndices,
  TextoDecimal,
  ValorIndice,
} from "../compartilhado/tipos.ts";
import {
  agruparAtrasados,
  esperadoAte,
  mesesAtrasados,
  SERIES_EM_ORDEM_NUMERICA,
} from "./calendario.ts";
import type { GrupoDeAtraso, MesAtrasado } from "./calendario.ts";
import { seriesEmbutidas } from "./embutidos.ts";
import {
  compararInstantes,
  dataHoraEmBrasilia,
  formatarDataHoraBrasilia,
  hojeEmBrasilia,
} from "./relogio.ts";

// Congelamento da tabela de índices de um cálculo (fase 4, rotina central, decisão de
// 12/10/2026): o app não consulta o BCB nem usa armazenamento; a tabela vem só da cópia publicada
// com o site (dados/indices/*.json, mantida em dia pela rotina do GitHub Actions). Este módulo
// monta a tabela, descreve a situação dos índices (rodapé e avisos da tela, pelo calendário de
// divulgação) e compara os índices usados por um cálculo salvo com os de um recálculo. Sem rede,
// sem armazenamento e síncrono; `hoje` e a cópia embutida entram por parâmetro, com padrão real.

// ---------------------------------------------------------------------------------------------
// Utilitários de texto
// ---------------------------------------------------------------------------------------------

/** Séries de nome feminino ("a SELIC", "a taxa legal"), para a concordância dos avisos. */
const SERIES_FEMININAS: ReadonlySet<CodigoSerie> = new Set<CodigoSerie>(["4390", "29543"]);

function posicaoDaSerie(serie: CodigoSerie): number {
  return SERIES_EM_ORDEM_NUMERICA.indexOf(serie);
}

function compararCompetencias(a: Competencia, b: Competencia): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Primeira letra maiúscula, para o nome da série que abre a frase ("Taxa legal de …"). */
function comMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Só a data, "11/10/2026", no horário de Brasília, de uma data-hora ISO (texto inválido volta como veio). */
function dataEmBrasilia(iso: string): string {
  const emBrasilia = dataHoraEmBrasilia(iso);
  return emBrasilia === null ? iso : formatarData(emBrasilia.data);
}

/** O maior de uma lista de datas-hora ISO, pelo instante (`compararInstantes`); vazio sem nenhuma. */
function maisRecente(datas: string[]): string {
  return (
    datas.reduce<string | undefined>(
      (maior, data) => (maior === undefined || compararInstantes(data, maior) > 0 ? data : maior),
      undefined,
    ) ?? ""
  );
}

function ultimoMes(valores: Record<Competencia, ValorIndice> | undefined): Competencia | undefined {
  return Object.keys(valores ?? {})
    .sort(compararCompetencias)
    .at(-1);
}

// ---------------------------------------------------------------------------------------------
// Tabela: a cópia publicada
// ---------------------------------------------------------------------------------------------

/**
 * Monta a tabela de índices a partir da cópia embutida: séries em ordem numérica, meses em ordem
 * crescente, cada valor com fonte "embutida" e o `obtidoEm` do seu arquivo. `consultadoEm` é o
 * `obtidoEm` mais recente entre os arquivos, comparado pelo instante (há arquivos em UTC, "…Z", e
 * em Brasília, "…-03:00"); `esperadoAte` vem do calendário de divulgação para `hoje`. Arquivo
 * guardado sob o código de outra série é ignorado (códigos nunca se misturam); arquivo vazio entra
 * como {} e a data dele conta; série sem arquivo fica de fora.
 */
export function montarTabela(
  embutidas: Record<CodigoSerie, ArquivoSerie>,
  hoje: DataISO,
): TabelaIndices {
  const series: TabelaIndices["series"] = {};
  const datas: string[] = [];
  for (const codigo of SERIES_EM_ORDEM_NUMERICA) {
    const arquivo: ArquivoSerie | undefined = embutidas[codigo];
    if (arquivo?.codigo !== codigo) continue;
    datas.push(arquivo.obtidoEm);
    const valores = [...arquivo.valores].sort((a, b) =>
      compararCompetencias(a.competencia, b.competencia),
    );
    series[codigo] = Object.fromEntries(
      valores.map(({ competencia, valor }) => [
        competencia,
        { valor, fonte: "embutida", obtidoEm: arquivo.obtidoEm } satisfies ValorIndice,
      ]),
    );
  }
  return { consultadoEm: maisRecente(datas), series, esperadoAte: esperadoAte(hoje) };
}

// ---------------------------------------------------------------------------------------------
// Situação dos índices: rodapé e avisos (§8.3)
// ---------------------------------------------------------------------------------------------

export interface OpcoesCongelamento {
  /** padrão `hojeEmBrasilia()` */
  hoje?: DataISO;
  /** padrão `seriesEmbutidas()`; os testes injetam séries pequenas */
  embutidas?: Record<CodigoSerie, ArquivoSerie>;
}

export interface SituacaoIndices {
  /** = tabela.consultadoEm */
  atualizadoEm: string;
  /** último mês de cada série presente na tabela (série ausente ou vazia não entra) */
  ultimoMesPorSerie: Partial<Record<CodigoSerie, Competencia>>;
  /** calendário: meses já divulgados que a cópia publicada não tem */
  atrasados: MesAtrasado[];
  /** rodapé da tela (§8.3); o relatório usa `Resultado.consultaIndices` */
  rodape: string;
  /** para a caixa de avisos da tela */
  avisos: string[];
}

/**
 * "Índices oficiais BCB/SGS · IPCA até set/2026 · atualizados em 09/10/2026 14:17 (horário de
 * Brasília)". Sem IPCA na tabela, sai o trecho "· IPCA até …"; sem data na tabela (nenhum arquivo),
 * sai o trecho "· atualizados em …".
 */
function montarRodape(tabela: TabelaIndices): string {
  const trechos = ["Índices oficiais BCB/SGS"];
  const ipca = ultimoMes(tabela.series["433"]);
  if (ipca !== undefined) trechos.push(`IPCA até ${formatarCompetencia(ipca)}`);
  if (tabela.consultadoEm !== "") {
    trechos.push(
      `atualizados em ${formatarDataHoraBrasilia(tabela.consultadoEm)} (horário de Brasília)`,
    );
  }
  return trechos.join(" · ");
}

/** Data (em Brasília) do dado mais recente que a tabela tem da série; a da tabela, se não tiver nenhum. */
function dataDosDadosDaSerie(tabela: TabelaIndices, serie: CodigoSerie): string {
  const maior = maisRecente(Object.values(tabela.series[serie] ?? {}).map((v) => v.obtidoEm));
  return dataEmBrasilia(maior === "" ? tabela.consultadoEm : maior);
}

/**
 * "IPCA de set/2026, divulgado por volta de 10/10/2026, ainda não chegou ao Apura: o cálculo usa os
 * índices disponíveis em 12/09/2026." A data é a dos dados que a tabela tem daquela série. Meses
 * seguidos com a mesma previsão saem numa frase só: "Salário mínimo de jan/2027 a dez/2027, …".
 */
function avisoDeAtraso(grupo: GrupoDeAtraso, tabela: TabelaIndices): string {
  const nome = comMaiuscula(NOME_DA_SERIE[grupo.serie]);
  const divulgado = SERIES_FEMININAS.has(grupo.serie) ? "divulgada" : "divulgado";
  const meses =
    grupo.de === grupo.ate
      ? formatarCompetencia(grupo.de)
      : `${formatarCompetencia(grupo.de)} a ${formatarCompetencia(grupo.ate)}`;
  return `${nome} de ${meses}, ${divulgado} ${grupo.previsao}, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em ${dataDosDadosDaSerie(tabela, grupo.serie)}.`;
}

/**
 * Descreve a situação dos índices da tabela para a tela: data da atualização da cópia publicada,
 * último mês de cada série, meses que o calendário dá como divulgados e a cópia ainda não tem, o
 * rodapé e um aviso por grupo de meses atrasados (séries em ordem numérica, meses crescentes).
 */
export function descreverSituacao(tabela: TabelaIndices, hoje: DataISO): SituacaoIndices {
  const ultimoMesPorSerie: SituacaoIndices["ultimoMesPorSerie"] = {};
  for (const serie of SERIES_EM_ORDEM_NUMERICA) {
    const ultimo = ultimoMes(tabela.series[serie]);
    if (ultimo !== undefined) ultimoMesPorSerie[serie] = ultimo;
  }
  const atrasados = mesesAtrasados(tabela, hoje);
  const avisos = agruparAtrasados(atrasados).map((grupo) => avisoDeAtraso(grupo, tabela));
  return {
    atualizadoEm: tabela.consultadoEm,
    ultimoMesPorSerie,
    atrasados,
    rodape: montarRodape(tabela),
    avisos,
  };
}

// ---------------------------------------------------------------------------------------------
// Congelamento: a função única da tela
// ---------------------------------------------------------------------------------------------

/**
 * Congela a tabela de índices para um cálculo: a função que a tela chama ao abrir o app e ao
 * iniciar um cálculo. Monta a tabela da cópia embutida para `hoje` (padrão: a data de Brasília) e
 * descreve a situação dela. Síncrona, sem rede e sem armazenamento.
 */
export function congelarIndices(opcoes: OpcoesCongelamento = {}): {
  tabela: TabelaIndices;
  situacao: SituacaoIndices;
} {
  const hoje = opcoes.hoje ?? hojeEmBrasilia();
  const embutidas = opcoes.embutidas ?? seriesEmbutidas();
  const tabela = montarTabela(embutidas, hoje);
  return { tabela, situacao: descreverSituacao(tabela, hoje) };
}

// ---------------------------------------------------------------------------------------------
// Comparação dos índices usados por um cálculo salvo com os do recálculo (D5, D6)
// ---------------------------------------------------------------------------------------------

/** Ordem das listas por série e mês: séries em ordem numérica, meses crescentes. */
function compararSerieECompetencia(
  a: { serie: CodigoSerie; competencia: Competencia },
  b: { serie: CodigoSerie; competencia: Competencia },
): number {
  return (
    posicaoDaSerie(a.serie) - posicaoDaSerie(b.serie) ||
    compararCompetencias(a.competencia, b.competencia)
  );
}

/** Salário mínimo em reais ("R$ 1.621,00"); as demais séries em percentual com vírgula ("1,57%"). */
function formatarValorDoIndice(serie: CodigoSerie, valor: TextoDecimal): string {
  if (serie === "1619") {
    const numero = decimalOuNulo(valor);
    return numero === null ? valor : formatarMoeda(numero);
  }
  return `${valor.replace(".", ",")}%`;
}

/** Mesmo número, mesmo que escrito de outro jeito ("0.8" e "0.80"); texto inválido compara como texto. */
function mesmoValor(a: TextoDecimal, b: TextoDecimal): boolean {
  const da = decimalOuNulo(a);
  const db = decimalOuNulo(b);
  return da !== null && db !== null ? da.equals(db) : a === b;
}

function chaveDoIndice(indice: { serie: CodigoSerie; competencia: Competencia }): string {
  return `${indice.serie}|${indice.competencia}`;
}

function porChave(indices: IndiceUsado[]): Map<string, IndiceUsado> {
  const mapa = new Map<string, IndiceUsado>();
  for (const indice of indices) mapa.set(chaveDoIndice(indice), indice);
  return mapa;
}

/** "IPCA de out/2026 (0,30%), nov/2026 (0,25%); SELIC de out/2026 (0,58%)" */
function listarPorSerie(indices: IndiceUsado[]): string {
  const ordenados = [...indices].sort(compararSerieECompetencia);
  const grupos: string[] = [];
  for (const serie of SERIES_EM_ORDEM_NUMERICA) {
    const meses = ordenados
      .filter((indice) => indice.serie === serie)
      .map(
        (indice) =>
          `${formatarCompetencia(indice.competencia)} (${formatarValorDoIndice(serie, indice.valor)})`,
      );
    if (meses.length > 0) grupos.push(`${NOME_DA_SERIE[serie]} de ${meses.join(", ")}`);
  }
  return grupos.join("; ");
}

/**
 * Compara os índices usados por um cálculo salvo (`anterior`) com os do recálculo (`atual`), por
 * série e competência (D6), e devolve as frases para a tela, nesta ordem: índices que mudaram de
 * valor (uma frase por série e mês); salário mínimo que passou a ser usado no lugar do último
 * publicado de antes (uma frase por mês novo); índices que entraram (uma frase, agrupada por
 * série); índices que saíram (uma frase). Nada mudou → lista vazia. A data citada é a da consulta
 * anterior, no horário de Brasília.
 */
export function compararIndicesUsados(
  anterior: { indicesUsados: IndiceUsado[]; consultadoEm: string },
  atual: { indicesUsados: IndiceUsado[]; consultadoEm: string },
): string[] {
  const data = dataEmBrasilia(anterior.consultadoEm);
  const antes = porChave(anterior.indicesUsados);
  const depois = porChave(atual.indicesUsados);

  const mudaram: Array<{ antes: IndiceUsado; depois: IndiceUsado }> = [];
  const novos: IndiceUsado[] = [];
  for (const [chave, indice] of depois) {
    const anteriorDoMes = antes.get(chave);
    if (anteriorDoMes === undefined) novos.push(indice);
    else if (!mesmoValor(anteriorDoMes.valor, indice.valor)) {
      mudaram.push({ antes: anteriorDoMes, depois: indice });
    }
  }
  const saidos = [...antes.entries()]
    .filter(([chave]) => !depois.has(chave))
    .map(([, indice]) => indice);

  const frases: string[] = [];
  mudaram.sort((a, b) => compararSerieECompetencia(a.depois, b.depois));
  for (const { antes: velho, depois: novo } of mudaram) {
    frases.push(
      `${comMaiuscula(NOME_DA_SERIE[novo.serie])} de ${formatarCompetencia(novo.competencia)} mudou de ${formatarValorDoIndice(novo.serie, velho.valor)} para ${formatarValorDoIndice(novo.serie, novo.valor)} desde a atualização dos índices de ${data}.`,
    );
  }

  // Salário mínimo: o mês novo X que antes era coberto pelo último publicado (o maior mês anterior
  // a X entre os usados antes) ganha frase própria, e esse mês anterior não sai como "saiu".
  const salariosAntes = anterior.indicesUsados
    .filter((indice) => indice.serie === "1619")
    .sort((a, b) => compararCompetencias(a.competencia, b.competencia));
  const pareados = new Set<string>();
  const entraram: IndiceUsado[] = [];
  for (const novo of [...novos].sort(compararSerieECompetencia)) {
    const vigente =
      novo.serie === "1619"
        ? salariosAntes.filter((indice) => indice.competencia < novo.competencia).at(-1)
        : undefined;
    if (vigente === undefined) {
      entraram.push(novo);
      continue;
    }
    pareados.add(chaveDoIndice(vigente));
    frases.push(
      `Salário mínimo de ${formatarCompetencia(novo.competencia)} (${formatarValorDoIndice("1619", novo.valor)}) passou a ser usado; em ${data} valia o último publicado, ${formatarCompetencia(vigente.competencia)} (${formatarValorDoIndice("1619", vigente.valor)}).`,
    );
  }

  if (entraram.length > 0) {
    frases.push(
      `Entraram no cálculo índices obtidos depois de ${data}: ${listarPorSerie(entraram)}.`,
    );
  }
  const sairam = saidos.filter((indice) => !pareados.has(chaveDoIndice(indice)));
  if (sairam.length > 0) {
    frases.push(
      `Índices da atualização de ${data} que não constam mais na tabela: ${listarPorSerie(sairam)}.`,
    );
  }
  return frases;
}
```

- [ ] **Step 4: Rodar e ver passar**

Execute: `npm run format && npm run verificar`
Esperado: tudo verde; 20 arquivos de teste, 576 passando | 9 pulados (585).

- [ ] **Step 5: Commit**

```bash
git add src/indices/congelar.ts src/indices/congelar.test.ts
git commit -m "indices: congelamento da cópia publicada com o calendário, situação para o rodapé e comparação dos índices usados ao reabrir

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```


### Task 8: Rotina central: atualização série por série testada sem rede, script reescrito e workflow de segunda a sexta

**Files:**
- Create: `src/indices/atualizacao.ts`, `.github/workflows/atualizar-indices.yml`
- Modify: `scripts/atualizar-indices.ts` (reescrito); `dados/indices/*.json` (só as séries que mudarem, pelo próprio script, no Step 7)
- Test: `src/indices/atualizacao.test.ts`

**Interfaces:**
- Consome: `buscarSerie`, `OpcoesBusca`, `RespostaBusca`, `montarArquivoSerie`, `ValorMensal` (Tasks 1 e 4); `lerArquivoSerie`, `compararSeries`, `ComparacaoDeSerie` (Task 5, de `arquivo-serie.ts`, que não importa os dados embutidos); `SERIES_EM_ORDEM_NUMERICA`, `mesesAtrasados`, `agruparAtrasados` (Task 3); `agoraEmBrasilia`, `dataHoraEmBrasilia` (Task 2); `SERIES`, `formatarCompetencia`; tipos `TabelaIndices` e `ValorIndice` (a tabela mínima que o calendário lê).
- Produz:
  - `seriesPedidas(argumentos): { ok: true; codigos } | { ok: false; mensagem }` — sem argumentos, as seis em ordem numérica; código desconhecido recusa tudo antes de baixar.
  - `interface ArquivosDeSeries { ler(codigo): string | null; gravar(codigo, texto): void }`, `interface OpcoesAtualizacao { fetch?; agora?; busca? }`, `BUSCA_DO_SCRIPT = { tempoLimiteMs: 30_000, tentativas: 3, esperaMs: 2_000 }`.
  - `interface ResultadoAtualizacao { linhas; avisos; problemas; atrasados }` e `atualizarSeries(codigos, arquivos, opcoes?): Promise<ResultadoAtualizacao>` — baixa **todas** as séries pedidas (histórico completo, em sequência), confere cada uma contra o arquivo atual e grava, **uma a uma**, as que vieram boas e mudaram. Série que falhou, encolheu, veio vazia ou tem arquivo atual ilegível fica como estava e entra em `problemas` ("A série 189 não foi baixada após 3 tentativas: o BCB respondeu HTTP 502."), sem impedir as outras. Série idêntica ao arquivo atual não é regravada (linha "433 (IPCA): sem mudança; 561 meses, último 2026-09 = 0.82"), o que mantém a data de obtenção original (na SELIC, ela diz qual mês é o parcial) e faz a rotina só gravar quando há dado novo. Valores já publicados que mudaram geram aviso, não impedimento: na SELIC, a mudança no mês do `obtidoEm` do arquivo atual ou depois é o acumulado parcial, informativo ("SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.30 para 0.36."); antes dele, e em qualquer mês das outras séries, é revisão ("Atenção: na série 433 mudou 1 valor já publicado: 2026-09 de 0.80 para 0.82."). Ao fim, os meses que o calendário dá como divulgados e que os arquivos ainda não têm, um por grupo: "Ainda não disponível no BCB: IPCA de set/2026 (divulgação prevista por volta de 10/10/2026)." (série cuja busca falhou fica de fora: o problema já a cita). Nunca lança por dado ruim; só um erro de disco sobe.
  - O script só lê os argumentos, acessa a pasta `dados/indices/` e escreve no console: linhas, avisos e meses atrasados na saída padrão; problemas na de erro, sem o prefixo "Error:". Código de saída 1 quando alguma série teve problema (as outras já foram gravadas) ou um código pedido é desconhecido (nada é baixado); 0 sem problemas, também quando nenhuma série mudou.
  - O workflow "Atualizar índices do BCB" roda de segunda a sexta às 10h47, 14h17 e 22h47 de Brasília (três agendamentos, cada um com `timezone: "America/Sao_Paulo"`) e pelo botão "Run workflow"; o título de cada execução traz o agendamento ("Atualizar índices · 47 10 * * 1-5", ou "· manual"), que o relatório mensal (Task 9) lê; deixa o resumo da execução com a saída do script; só grava na `main` se algum arquivo de `dados/` mudou (`git status --porcelain`, que também vê arquivo novo) e `npm run verificar` passou, com o commit "indices: séries do BCB em 13/10/2026 10:49 (rodada 10h47)", a saída do script no corpo e o endereço da execução (o relatório mensal lê esse título); `git pull --rebase` e envio, com até três tentativas se outro envio entrar no meio; sinal ao Healthchecks só em execução agendada sem problema e só se o segredo `HC_URL` existir; depois, deploy hook (com novas tentativas) só se o segredo `CF_DEPLOY_HOOK` existir; termina com falha quando alguma série teve problema. Só roda a partir da `main` e parte sempre da ponta dela, para que uma reexecução ou uma execução que esperou na fila não entre em conflito com a gravação anterior.

Decisões de 12/10/2026 (rotina central), aplicadas aqui: três rodadas por dia útil em minutos "quebrados", gravação série por série, conferências antes de gravar, commit descritivo como registro histórico, SELIC parcial separada de revisão, sinal de vida só de sucesso. Pendências das fases 1 e 3 fechadas aqui: não repetir em erro 4xx (a decisão é de `buscarSerie`: só rede, tempo esgotado e 5xx repetem); não depender do cabeçalho `content-type` (o BCB às vezes rotula JSON válido como `text/html`); recusar série que encolheu; avisar quando valores históricos mudarem; mensagens sem "Error:". A data de obtenção passa a ser gravada no horário de Brasília. Em execução agendada, o GitHub roda o workflow com o token padrão (`GITHUB_TOKEN`), cujo commit não dispara outros workflows: a publicação vem da integração do Cloudflare Pages ou do deploy hook (fase 7).

- [ ] **Step 1: Escrever o teste**

Crie `src/indices/atualizacao.test.ts` (58 testes):

```ts
import { describe, expect, it, vi } from "vitest";
import type { CodigoSerie } from "../compartilhado/tipos.ts";
import { atualizarSeries, BUSCA_DO_SCRIPT, seriesPedidas } from "./atualizacao.ts";
import type { ArquivosDeSeries, ResultadoAtualizacao } from "./atualizacao.ts";
import { montarArquivoSerie } from "./cliente-bcb.ts";
import type { ValorMensal } from "./cliente-bcb.ts";
import { urlDaSerie } from "./series.ts";
import sgs1619DesdeDez from "./testes/sgs-1619-desde-dez-2026.json?raw";
import sgs433DesdeAgo from "./testes/sgs-433-desde-ago-2026.json?raw";
import sgs433DesdeSet from "./testes/sgs-433-desde-set-2026.json?raw";
import sgs4390Ultimos3 from "./testes/sgs-4390-ultimos-3.json?raw";
import sgsErro404SemValores from "./testes/sgs-erro-404-sem-valores.json?raw";
import sgsErro502Html from "./testes/sgs-erro-502.html?raw";

// ---------------------------------------------------------------------------------------------
// Dublês: rede, disco e relógio entram por parâmetro; nenhum teste acessa a rede.
// ---------------------------------------------------------------------------------------------

/** 12/10/2026: pelo calendário, nenhuma das séries de teste "em dia" está atrasada. */
const AGORA = "2026-10-12T09:00:00-03:00";
const agoraFixo = (): string => AGORA;
const agoraEm = (iso: string) => (): string => iso;

/** As seis séries em ordem numérica, como o script pede sem argumentos. */
const SEIS: CodigoSerie[] = ["188", "189", "433", "1619", "4390", "29543"];

/** Uma resposta do BCB (corpo e status) ou o erro que o fetch lança. */
type Roteiro = { corpo: string; status?: number } | Error;

function codigoDaUrl(url: string): CodigoSerie {
  const codigo = /bcdata\.sgs\.(\d+)\//.exec(url)?.[1];
  if (codigo === undefined) throw new Error(`URL sem código de série: ${url}`);
  return codigo as CodigoSerie;
}

/** fetch falso: para cada série, uma fila de respostas consumida na ordem; registra as URLs pedidas. */
function fetchFalso(roteiros: Partial<Record<CodigoSerie, Roteiro[]>>) {
  const urls: string[] = [];
  const fetch = vi.fn(async (entrada: string | URL | Request): Promise<Response> => {
    const url = String(entrada);
    urls.push(url);
    const proxima = roteiros[codigoDaUrl(url)]?.shift();
    if (proxima === undefined) throw new Error(`Sem resposta prevista para ${url}`);
    if (proxima instanceof Error) throw proxima;
    return new Response(proxima.corpo, { status: proxima.status ?? 200 });
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, urls };
}

/** Disco falso: um Map com o texto de cada arquivo; `gravados` registra a ordem das gravações. */
function arquivosEmMemoria(inicial: Partial<Record<CodigoSerie, string>> = {}) {
  const textos = new Map<CodigoSerie, string>(
    Object.entries(inicial) as Array<[CodigoSerie, string]>,
  );
  const gravados: CodigoSerie[] = [];
  const arquivos: ArquivosDeSeries = {
    ler: (codigo) => textos.get(codigo) ?? null,
    gravar: (codigo, texto) => {
      textos.set(codigo, texto);
      gravados.push(codigo);
    },
  };
  return { arquivos, textos, gravados };
}

/** Texto de um arquivo de série como o script grava: 2 espaços e quebra final. */
function textoDoArquivo(codigo: CodigoSerie, valores: ValorMensal[], obtidoEm: string): string {
  return `${JSON.stringify(montarArquivoSerie(codigo, valores, obtidoEm), null, 2)}\n`;
}

/** Um arquivo atual qualquer, obtido um mês antes. */
function arquivoAtual(codigo: CodigoSerie, valores: ValorMensal[]): string {
  return textoDoArquivo(codigo, valores, "2026-09-12T09:00:00-03:00");
}

/** Corpo de resposta do SGS para os valores dados ("01/MM/AAAA"). */
function corpoSgs(valores: ValorMensal[]): string {
  return JSON.stringify(
    valores.map(({ competencia, valor }) => ({
      data: `01/${competencia.slice(5, 7)}/${competencia.slice(0, 4)}`,
      valor,
    })),
  );
}

/** Abrevia `{ competencia, valor }`. */
function v(competencia: string, valor: string): ValorMensal {
  return { competencia, valor };
}

/** Resultado esperado, com listas vazias no que o teste não informa. */
function esperado(parcial: Partial<ResultadoAtualizacao>): ResultadoAtualizacao {
  return { linhas: [], avisos: [], problemas: [], atrasados: [], ...parcial };
}

const dormirQueRegistra = () => {
  const esperas: number[] = [];
  const dormir = async (ms: number): Promise<void> => {
    esperas.push(ms);
  };
  return { dormir, esperas };
};

/** Respostas do BCB das seis séries, todas em dia em 12/10/2026 pelo calendário. */
const VALORES_EM_DIA: Record<CodigoSerie, ValorMensal[]> = {
  "188": [v("2026-08", "-0.21"), v("2026-09", "0.48")],
  "189": [v("2026-08", "0.20"), v("2026-09", "1.57")],
  "433": [v("2026-08", "-0.32"), v("2026-09", "0.82")],
  "1619": [v("2026-12", "1621.00")],
  "4390": [v("2026-08", "1.09"), v("2026-09", "1.08"), v("2026-10", "0.36")],
  "29543": [v("2026-09", "0.381234"), v("2026-10", "0.379020")],
};

const LINHAS_EM_DIA: Record<CodigoSerie, string> = {
  "188": "188 (INPC): 2 meses, último 2026-09 = 0.48",
  "189": "189 (IGP-M): 2 meses, último 2026-09 = 1.57",
  "433": "433 (IPCA): 2 meses, último 2026-09 = 0.82",
  "1619": "1619 (salário mínimo): 1 mês, último 2026-12 = 1621.00",
  "4390": "4390 (SELIC): 3 meses, último 2026-10 = 0.36",
  "29543": "29543 (taxa legal): 2 meses, último 2026-10 = 0.379020",
};

function roteirosEmDia(): Partial<Record<CodigoSerie, Roteiro[]>> {
  const roteiros: Partial<Record<CodigoSerie, Roteiro[]>> = {};
  for (const codigo of SEIS) roteiros[codigo] = [{ corpo: corpoSgs(VALORES_EM_DIA[codigo]) }];
  return roteiros;
}

// ---------------------------------------------------------------------------------------------

describe("seriesPedidas", () => {
  it("sem argumentos, pede as seis séries em ordem numérica", () => {
    expect(seriesPedidas([])).toEqual({
      ok: true,
      codigos: ["188", "189", "433", "1619", "4390", "29543"],
    });
  });

  it("mantém a ordem pedida e ignora repetições", () => {
    expect(seriesPedidas(["433", "189", "433"])).toEqual({ ok: true, codigos: ["433", "189"] });
  });

  it("recusa uma série desconhecida, nomeando as conhecidas", () => {
    expect(seriesPedidas(["abc"])).toEqual({
      ok: false,
      mensagem: "Série desconhecida: abc. Conhecidas: 188, 189, 433, 1619, 4390, 29543.",
    });
  });

  it("recusa várias séries desconhecidas numa só frase, mesmo misturadas com conhecidas", () => {
    expect(seriesPedidas(["433", "abc", "xyz"])).toEqual({
      ok: false,
      mensagem: "Séries desconhecidas: abc e xyz. Conhecidas: 188, 189, 433, 1619, 4390, 29543.",
    });
  });

  it("nomeia uma só vez a série desconhecida repetida", () => {
    expect(seriesPedidas(["abc", "433", "abc"])).toEqual({
      ok: false,
      mensagem: "Série desconhecida: abc. Conhecidas: 188, 189, 433, 1619, 4390, 29543.",
    });
  });

  it("argumento vazio é nomeado como (vazio), sem quebrar a frase", () => {
    expect(seriesPedidas([""])).toEqual({
      ok: false,
      mensagem: "Série desconhecida: (vazio). Conhecidas: 188, 189, 433, 1619, 4390, 29543.",
    });
  });
});

describe("atualizarSeries", () => {
  it("usa tempo-limite de 30 s, três tentativas e 2 s de espera", () => {
    expect(BUSCA_DO_SCRIPT).toEqual({ tempoLimiteMs: 30_000, tentativas: 3, esperaMs: 2_000 });
  });

  it("baixa o histórico inteiro de cada série, na ordem pedida, e grava os arquivos novos", async () => {
    const { fetch, urls } = fetchFalso({
      "433": [{ corpo: sgs433DesdeAgo }],
      "1619": [{ corpo: sgs1619DesdeDez }],
    });
    const { arquivos, textos, gravados } = arquivosEmMemoria();

    const resultado = await atualizarSeries(["433", "1619"], arquivos, {
      fetch,
      agora: agoraFixo,
    });

    expect(resultado).toEqual(
      esperado({
        linhas: [
          "433 (IPCA): 2 meses, último 2026-09 = 0.82",
          "1619 (salário mínimo): 1 mês, último 2026-12 = 1621.00",
        ],
      }),
    );
    // Sem dataInicial: o arquivo embutido guarda o histórico completo.
    expect(urls).toEqual([urlDaSerie("433"), urlDaSerie("1619")]);
    expect(fetch).toHaveBeenCalledWith(urlDaSerie("433"), {
      signal: expect.any(AbortSignal),
    });
    expect(gravados).toEqual(["433", "1619"]);
    expect(textos.get("433")).toBe(
      textoDoArquivo("433", [v("2026-08", "-0.32"), v("2026-09", "0.82")], AGORA),
    );
    expect(textos.get("1619")).toBe(textoDoArquivo("1619", [v("2026-12", "1621.00")], AGORA));
    expect(textos.get("433")).toMatch(/\n$/);
    expect(textos.get("433")).toContain('\n  "formato": "apura/serie@1",\n');
  });

  it("as seis séries em dia: grava todas, uma linha por série, sem avisos, problemas nem atrasados", async () => {
    const { fetch } = fetchFalso(roteirosEmDia());
    const { arquivos, gravados } = arquivosEmMemoria();

    const resultado = await atualizarSeries(SEIS, arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(esperado({ linhas: SEIS.map((codigo) => LINHAS_EM_DIA[codigo]) }));
    expect(gravados).toEqual(SEIS);
  });

  it("sem séries pedidas, não baixa nem grava nada", async () => {
    const { fetch } = fetchFalso({});
    const { arquivos, gravados } = arquivosEmMemoria();

    const resultado = await atualizarSeries([], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(esperado({}));
    expect(fetch).not.toHaveBeenCalled();
    expect(gravados).toEqual([]);
  });

  it("baixa em sequência: o segundo pedido só sai depois da resposta do primeiro", async () => {
    let liberar: (() => void) | undefined;
    const urls: string[] = [];
    const fetch = vi.fn(async (entrada: string | URL | Request): Promise<Response> => {
      urls.push(String(entrada));
      if (urls.length === 1) {
        await new Promise<void>((resolver) => {
          liberar = resolver;
        });
      }
      return new Response(sgs433DesdeSet);
    }) as unknown as typeof globalThis.fetch;
    const { arquivos } = arquivosEmMemoria();

    const pendente = atualizarSeries(["433", "188"], arquivos, { fetch, agora: agoraFixo });
    await Promise.resolve();
    expect(urls).toEqual([urlDaSerie("433")]);
    liberar?.();
    const resultado = await pendente;

    expect(urls).toEqual([urlDaSerie("433"), urlDaSerie("188")]);
    expect(resultado.problemas).toEqual([]);
  });

  it("usa a data-hora de Brasília quando `agora` não é informado", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeSet }] });
    const { arquivos, textos } = arquivosEmMemoria();

    const resultado = await atualizarSeries(["433"], arquivos, { fetch });

    expect(resultado.problemas).toEqual([]);
    const gravado = JSON.parse(textos.get("433") ?? "{}") as { obtidoEm?: unknown };
    expect(gravado.obtidoEm).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-0[23]:00$/);
  });

  it("não acusa nada quando a lista nova só acrescenta meses ao arquivo atual", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeAgo }] });
    const { arquivos, textos } = arquivosEmMemoria({
      "433": arquivoAtual("433", [v("2026-08", "-0.32")]),
    });

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(esperado({ linhas: ["433 (IPCA): 2 meses, último 2026-09 = 0.82"] }));
    expect(textos.get("433")).toContain(`"obtidoEm": "${AGORA}"`);
  });

  it("revisão no IPCA: avisa com 'Atenção' o valor já publicado que mudou, mas grava mesmo assim", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeAgo }] });
    const { arquivos, textos, gravados } = arquivosEmMemoria({
      "433": arquivoAtual("433", [v("2026-08", "-0.32"), v("2026-09", "0.80")]),
    });

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(
      esperado({
        linhas: ["433 (IPCA): 2 meses, último 2026-09 = 0.82"],
        avisos: ["Atenção: na série 433 mudou 1 valor já publicado: 2026-09 de 0.80 para 0.82."],
      }),
    );
    expect(gravados).toEqual(["433"]);
    expect(textos.get("433")).toContain('"valor": "0.82"');
  });

  it("reúne no mesmo aviso todos os valores alterados de uma série", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeAgo }] });
    const { arquivos } = arquivosEmMemoria({
      "433": arquivoAtual("433", [v("2026-08", "-0.30"), v("2026-09", "0.80")]),
    });

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.avisos).toEqual([
      "Atenção: na série 433 mudaram 2 valores já publicados: 2026-08 de -0.30 para -0.32 e 2026-09 de 0.80 para 0.82.",
    ]);
  });

  it("na taxa legal, mudança no mês da obtenção é revisão ('Atenção'): só a SELIC tem mês parcial", async () => {
    const { fetch } = fetchFalso({
      "29543": [{ corpo: corpoSgs(VALORES_EM_DIA["29543"]) }],
    });
    const { arquivos } = arquivosEmMemoria({
      "29543": textoDoArquivo(
        "29543",
        [v("2026-09", "0.381234"), v("2026-10", "0.379000")],
        "2026-10-05T10:47:00-03:00",
      ),
    });

    const resultado = await atualizarSeries(["29543"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(
      esperado({
        linhas: [LINHAS_EM_DIA["29543"]],
        avisos: [
          "Atenção: na série 29543 mudou 1 valor já publicado: 2026-10 de 0.379000 para 0.379020.",
        ],
      }),
    );
  });

  it("grava todas quando uma série tem valor alterado e mês novo e a outra tem arquivo vazio", async () => {
    const { fetch } = fetchFalso({
      "433": [{ corpo: sgs433DesdeAgo }],
      "1619": [{ corpo: sgs1619DesdeDez }],
    });
    const { arquivos, gravados } = arquivosEmMemoria({
      "433": arquivoAtual("433", [v("2026-08", "-0.30")]),
      "1619": arquivoAtual("1619", []),
    });

    const resultado = await atualizarSeries(["433", "1619"], arquivos, {
      fetch,
      agora: agoraFixo,
    });

    expect(resultado).toEqual(
      esperado({
        linhas: [
          "433 (IPCA): 2 meses, último 2026-09 = 0.82",
          "1619 (salário mínimo): 1 mês, último 2026-12 = 1621.00",
        ],
        avisos: ["Atenção: na série 433 mudou 1 valor já publicado: 2026-08 de -0.30 para -0.32."],
      }),
    );
    expect(gravados).toEqual(["433", "1619"]);
  });

  it("repete até três vezes com 2 s de espera e acusa a falha com o número de tentativas", async () => {
    const { fetch } = fetchFalso({
      "433": [
        { corpo: sgsErro502Html, status: 502 },
        new TypeError("Failed to fetch"),
        { corpo: sgsErro502Html, status: 502 },
      ],
    });
    const { arquivos, gravados } = arquivosEmMemoria();
    const { dormir, esperas } = dormirQueRegistra();

    const resultado = await atualizarSeries(["433"], arquivos, {
      fetch,
      agora: agoraFixo,
      busca: { dormir },
    });

    expect(resultado).toEqual(
      esperado({
        linhas: ["433 (IPCA): não gravada."],
        problemas: ["A série 433 não foi baixada após 3 tentativas: o BCB respondeu HTTP 502."],
      }),
    );
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(esperas).toEqual([2_000, 2_000]);
    expect(gravados).toEqual([]);
  });

  it("consegue na terceira tentativa depois de um 502 e de uma falha de rede", async () => {
    const { fetch } = fetchFalso({
      "433": [
        { corpo: sgsErro502Html, status: 502 },
        new TypeError("Failed to fetch"),
        { corpo: sgs433DesdeSet },
      ],
    });
    const { arquivos, gravados } = arquivosEmMemoria();
    const { dormir, esperas } = dormirQueRegistra();

    const resultado = await atualizarSeries(["433"], arquivos, {
      fetch,
      agora: agoraFixo,
      busca: { dormir },
    });

    expect(resultado).toEqual(esperado({ linhas: ["433 (IPCA): 1 mês, último 2026-09 = 0.82"] }));
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(esperas).toEqual([2_000, 2_000]);
    expect(gravados).toEqual(["433"]);
  });

  it("aceita opções de busca por cima das do script (uma tentativa só)", async () => {
    const { fetch } = fetchFalso({
      "433": [{ corpo: sgsErro502Html, status: 502 }, { corpo: sgs433DesdeSet }],
    });
    const { arquivos } = arquivosEmMemoria();
    const { dormir, esperas } = dormirQueRegistra();

    const resultado = await atualizarSeries(["433"], arquivos, {
      fetch,
      agora: agoraFixo,
      busca: { tentativas: 1, dormir },
    });

    expect(resultado.problemas).toEqual(["A série 433 não foi baixada: o BCB respondeu HTTP 502."]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(esperas).toEqual([]);
  });

  it("o tempo-limite de 30 s chega de fato ao pedido", async () => {
    const espiao = vi.spyOn(AbortSignal, "timeout");
    try {
      const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeSet }] });
      await atualizarSeries(["433"], arquivosEmMemoria().arquivos, { fetch, agora: agoraFixo });
      expect(espiao).toHaveBeenCalledWith(30_000);
    } finally {
      espiao.mockRestore();
    }
  });
});

describe("atualizarSeries: cada série decide por si (uma com problema não impede as outras)", () => {
  it("falha só na 189: as outras cinco são gravadas, a 189 fica como estava e o problema a cita", async () => {
    const roteiros = roteirosEmDia();
    roteiros["189"] = [
      { corpo: sgsErro502Html, status: 502 },
      new TypeError("Failed to fetch"),
      { corpo: sgsErro502Html, status: 502 },
    ];
    const { fetch, urls } = fetchFalso(roteiros);
    const atual189 = arquivoAtual("189", [v("2026-07", "0.50"), v("2026-08", "0.20")]);
    const { arquivos, textos, gravados } = arquivosEmMemoria({ "189": atual189 });
    const { dormir } = dormirQueRegistra();

    const resultado = await atualizarSeries(SEIS, arquivos, {
      fetch,
      agora: agoraFixo,
      busca: { dormir },
    });

    expect(resultado).toEqual(
      esperado({
        linhas: [
          LINHAS_EM_DIA["188"],
          "189 (IGP-M): não gravada.",
          LINHAS_EM_DIA["433"],
          LINHAS_EM_DIA["1619"],
          LINHAS_EM_DIA["4390"],
          LINHAS_EM_DIA["29543"],
        ],
        problemas: ["A série 189 não foi baixada após 3 tentativas: o BCB respondeu HTTP 502."],
        // A 189 ficou com o arquivo atual (até ago/2026), mas a busca falhou: não se sabe se o BCB
        // já tem set/2026, e a série fica fora dos atrasados (o problema já a cita).
      }),
    );
    expect(urls).toHaveLength(8);
    expect(gravados).toEqual(["188", "433", "1619", "4390", "29543"]);
    expect(textos.get("189")).toBe(atual189);
  });

  it("encolheu numa série: as outras são gravadas e ela fica como estava", async () => {
    const { fetch, urls } = fetchFalso({
      "433": [{ corpo: sgs433DesdeAgo }],
      "1619": [{ corpo: sgs1619DesdeDez }],
    });
    const atual433 = arquivoAtual("433", [
      v("2026-08", "-0.32"),
      v("2026-09", "0.82"),
      v("2026-10", "0.10"),
    ]);
    const { arquivos, textos, gravados } = arquivosEmMemoria({ "433": atual433 });

    const resultado = await atualizarSeries(["433", "1619"], arquivos, {
      fetch,
      agora: agoraFixo,
    });

    expect(resultado).toEqual(
      esperado({
        linhas: [
          "433 (IPCA): não gravada.",
          "1619 (salário mínimo): 1 mês, último 2026-12 = 1621.00",
        ],
        problemas: [
          "A série 433 encolheu: a lista nova termina em set/2026, antes do último mês atual (out/2026).",
        ],
      }),
    );
    expect(urls).toEqual([urlDaSerie("433"), urlDaSerie("1619")]);
    expect(gravados).toEqual(["1619"]);
    expect(textos.get("433")).toBe(atual433);
  });

  it("arquivo ilegível numa série: as outras são gravadas e o arquivo ilegível não é tocado", async () => {
    const { fetch } = fetchFalso({
      "433": [{ corpo: sgs433DesdeSet }],
      "1619": [{ corpo: sgs1619DesdeDez }],
    });
    const { arquivos, textos, gravados } = arquivosEmMemoria({ "1619": "não é JSON" });

    const resultado = await atualizarSeries(["433", "1619"], arquivos, {
      fetch,
      agora: agoraFixo,
    });

    expect(resultado).toEqual(
      esperado({
        linhas: ["433 (IPCA): 1 mês, último 2026-09 = 0.82", "1619 (salário mínimo): não gravada."],
        problemas: [
          'O arquivo atual da série 1619 não é JSON válido (restaure-o com "git checkout -- dados/indices/1619.json" ou apague-o para baixar a série inteira de novo).',
        ],
      }),
    );
    expect(gravados).toEqual(["433"]);
    expect(textos.get("1619")).toBe("não é JSON");
  });

  it("BCB mudo nas seis: nada é gravado e há seis problemas, um por série", async () => {
    const roteiros: Partial<Record<CodigoSerie, Roteiro[]>> = {};
    for (const codigo of SEIS) {
      roteiros[codigo] = [
        new TypeError("fetch failed"),
        new TypeError("fetch failed"),
        new TypeError("fetch failed"),
      ];
    }
    const { fetch } = fetchFalso(roteiros);
    const { arquivos, gravados } = arquivosEmMemoria();
    const { dormir, esperas } = dormirQueRegistra();

    const resultado = await atualizarSeries(SEIS, arquivos, {
      fetch,
      agora: agoraFixo,
      busca: { dormir },
    });

    expect(resultado).toEqual(
      esperado({
        linhas: [
          "188 (INPC): não gravada.",
          "189 (IGP-M): não gravada.",
          "433 (IPCA): não gravada.",
          "1619 (salário mínimo): não gravada.",
          "4390 (SELIC): não gravada.",
          "29543 (taxa legal): não gravada.",
        ],
        problemas: SEIS.map(
          (codigo) =>
            `A série ${codigo} não foi baixada após 3 tentativas: sem resposta do BCB: TypeError.`,
        ),
      }),
    );
    expect(fetch).toHaveBeenCalledTimes(18);
    expect(esperas).toHaveLength(12);
    expect(gravados).toEqual([]);
  });

  it("erro do SGS numa série (não repete): a outra é gravada", async () => {
    const { fetch } = fetchFalso({
      "433": [{ corpo: sgs433DesdeAgo }],
      "1619": [{ corpo: sgsErro404SemValores, status: 404 }],
    });
    const { arquivos, gravados } = arquivosEmMemoria();
    const { dormir, esperas } = dormirQueRegistra();

    const resultado = await atualizarSeries(["433", "1619"], arquivos, {
      fetch,
      agora: agoraFixo,
      busca: { dormir },
    });

    expect(resultado).toEqual(
      esperado({
        linhas: [
          "433 (IPCA): 2 meses, último 2026-09 = 0.82",
          "1619 (salário mínimo): não gravada.",
        ],
        problemas: [
          "A série 1619 não foi baixada: o BCB respondeu erro 404: br.gov.bcb.pec.sgs.comum.excecoes.SGSNegocioException: Value(s) not found.",
        ],
      }),
    );
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(esperas).toEqual([]);
    expect(gravados).toEqual(["433"]);
  });

  it("um problema por série, na ordem pedida, cada um em frase completa", async () => {
    const { fetch } = fetchFalso({
      "433": [{ corpo: sgs433DesdeSet }],
      "1619": [{ corpo: sgsErro404SemValores, status: 404 }],
      "188": [{ corpo: "[]" }],
    });
    const { arquivos, gravados } = arquivosEmMemoria({
      "433": arquivoAtual("433", [v("2026-08", "-0.32"), v("2026-09", "0.82")]),
    });

    const resultado = await atualizarSeries(["433", "1619", "188"], arquivos, {
      fetch,
      agora: agoraFixo,
    });

    expect(resultado).toEqual(
      esperado({
        linhas: [
          "433 (IPCA): não gravada.",
          "1619 (salário mínimo): não gravada.",
          "188 (INPC): não gravada.",
        ],
        problemas: [
          "A série 433 encolheu: a lista nova começa em set/2026, depois do primeiro mês atual (ago/2026).",
          "A série 1619 não foi baixada: o BCB respondeu erro 404: br.gov.bcb.pec.sgs.comum.excecoes.SGSNegocioException: Value(s) not found.",
          "A série 188 veio vazia.",
        ],
      }),
    );
    expect(gravados).toEqual([]);
  });

  it("linhas na ordem pedida misturando sem mudança, não gravada e gravada", async () => {
    const atual433 = arquivoAtual("433", [v("2026-08", "-0.32"), v("2026-09", "0.82")]);
    const atual1619 = arquivoAtual("1619", [v("2026-11", "1621.00")]);
    const { fetch } = fetchFalso({
      "433": [{ corpo: sgs433DesdeAgo }],
      "189": [{ corpo: sgsErro404SemValores, status: 404 }],
      "1619": [{ corpo: corpoSgs([v("2026-11", "1621.00"), v("2026-12", "1621.00")]) }],
    });
    const { arquivos, gravados } = arquivosEmMemoria({ "433": atual433, "1619": atual1619 });

    const resultado = await atualizarSeries(["433", "189", "1619"], arquivos, {
      fetch,
      agora: agoraFixo,
    });

    expect(resultado.linhas).toEqual([
      "433 (IPCA): sem mudança; 2 meses, último 2026-09 = 0.82",
      "189 (IGP-M): não gravada.",
      "1619 (salário mínimo): 2 meses, último 2026-12 = 1621.00",
    ]);
    expect(resultado.problemas).toHaveLength(1);
    expect(gravados).toEqual(["1619"]);
  });

  it("falha no BCB e arquivo ilegível na mesma série: um problema só, o da busca", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: sgsErro404SemValores, status: 404 }] });
    const { arquivos, textos, gravados } = arquivosEmMemoria({ "433": "{" });

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(
      esperado({
        linhas: ["433 (IPCA): não gravada."],
        problemas: [
          "A série 433 não foi baixada: o BCB respondeu erro 404: br.gov.bcb.pec.sgs.comum.excecoes.SGSNegocioException: Value(s) not found.",
        ],
      }),
    );
    expect(gravados).toEqual([]);
    expect(textos.get("433")).toBe("{");
  });

  it("recusa uma resposta válida porém vazia quando não há arquivo atual", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: "[]" }] });
    const { arquivos, gravados } = arquivosEmMemoria();

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(
      esperado({ linhas: ["433 (IPCA): não gravada."], problemas: ["A série 433 veio vazia."] }),
    );
    expect(gravados).toEqual([]);
  });

  it("recusa uma resposta vazia também quando o arquivo atual não tem valores", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: "[]" }] });
    const { arquivos, gravados } = arquivosEmMemoria({ "433": arquivoAtual("433", []) });

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.problemas).toEqual(["A série 433 veio vazia."]);
    expect(gravados).toEqual([]);
  });

  it("uma resposta vazia diante de um arquivo atual com valores é encolhimento", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: "[]" }] });
    const { arquivos, gravados } = arquivosEmMemoria({
      "433": arquivoAtual("433", [v("2026-09", "0.82")]),
    });

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.problemas).toEqual(["A série 433 encolheu: a lista nova veio vazia."]);
    expect(gravados).toEqual([]);
  });

  it("não grava por cima de um arquivo atual que não é JSON válido", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeSet }] });
    const { arquivos, textos, gravados } = arquivosEmMemoria({ "433": "{" });

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.problemas).toEqual([
      'O arquivo atual da série 433 não é JSON válido (restaure-o com "git checkout -- dados/indices/433.json" ou apague-o para baixar a série inteira de novo).',
    ]);
    expect(gravados).toEqual([]);
    expect(textos.get("433")).toBe("{");
  });

  it("não grava por cima de um arquivo atual em formato inesperado", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeSet }] });
    const { arquivos, gravados } = arquivosEmMemoria({ "433": '{"formato":"outro"}' });

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.problemas).toEqual([
      'O arquivo atual da série 433 não pôde ser lido (Arquivo da série 433 em formato inesperado) (restaure-o com "git checkout -- dados/indices/433.json" ou apague-o para baixar a série inteira de novo).',
    ]);
    expect(gravados).toEqual([]);
  });

  it("não grava por cima de um arquivo atual que é de outra série", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeSet }] });
    const atual = arquivoAtual("188", [v("2026-09", "0.80")]);
    const { arquivos, textos, gravados } = arquivosEmMemoria({ "433": atual });

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.problemas).toEqual([
      'O arquivo atual da série 433 não pôde ser lido (Arquivo da série 433 em formato inesperado) (restaure-o com "git checkout -- dados/indices/433.json" ou apague-o para baixar a série inteira de novo).',
    ]);
    expect(gravados).toEqual([]);
    expect(textos.get("433")).toBe(atual);
  });

  it("não grava por cima de um arquivo atual com valor inválido", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeSet }] });
    const atual = arquivoAtual("433", [v("2026-13", "0.82")]);
    const { arquivos, gravados } = arquivosEmMemoria({ "433": atual });

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.problemas).toEqual([
      'O arquivo atual da série 433 não pôde ser lido (Arquivo da série 433 com valor inválido em 2026-13) (restaure-o com "git checkout -- dados/indices/433.json" ou apague-o para baixar a série inteira de novo).',
    ]);
    expect(gravados).toEqual([]);
  });

  it("resposta com mês repetido com valores diferentes é falha daquela série", async () => {
    const { fetch } = fetchFalso({
      "433": [
        {
          corpo: '[{"data":"01/09/2026","valor":"0.82"},{"data":"01/09/2026","valor":"0.83"}]',
        },
      ],
    });
    const { arquivos, gravados } = arquivosEmMemoria();

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.problemas).toEqual([
      "A série 433 não foi baixada: resposta inválida do BCB (HTTP 200): Competência 2026-09 repetida com valores diferentes (0.82 e 0.83).",
    ]);
    expect(gravados).toEqual([]);
  });

  it("uma leitura do disco que falha interrompe antes de gravar qualquer série", async () => {
    const { fetch } = fetchFalso({
      "433": [{ corpo: sgs433DesdeSet }],
      "1619": [{ corpo: sgs1619DesdeDez }],
    });
    const gravados: CodigoSerie[] = [];
    const arquivos: ArquivosDeSeries = {
      ler: (codigo) => {
        if (codigo === "1619") throw new Error("EACCES: permissão negada");
        return null;
      },
      gravar: (codigo) => {
        gravados.push(codigo);
      },
    };

    await expect(
      atualizarSeries(["433", "1619"], arquivos, { fetch, agora: agoraFixo }),
    ).rejects.toThrow("EACCES: permissão negada");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(gravados).toEqual([]);
  });

  it("uma gravação que falha interrompe com o erro original", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeSet }] });
    const arquivos: ArquivosDeSeries = {
      ler: () => null,
      gravar: () => {
        throw new Error("ENOSPC: disco cheio");
      },
    };

    await expect(atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo })).rejects.toThrow(
      "ENOSPC: disco cheio",
    );
  });
});

describe("atualizarSeries: série sem mudança", () => {
  it("série idêntica ao arquivo atual não é regravada: mantém a data de obtenção", async () => {
    const atual = arquivoAtual("433", [v("2026-08", "-0.32"), v("2026-09", "0.82")]);
    const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeAgo }] });
    const { arquivos, textos, gravados } = arquivosEmMemoria({ "433": atual });

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(
      esperado({ linhas: ["433 (IPCA): sem mudança; 2 meses, último 2026-09 = 0.82"] }),
    );
    expect(gravados).toEqual([]);
    expect(textos.get("433")).toBe(atual);
  });

  it("SELIC sem mudança desde a última gravação: o mês parcial continua com a data de obtenção antiga", async () => {
    const valores = [v("2026-08", "1.09"), v("2026-09", "1.08"), v("2026-10", "0.36")];
    const atual = textoDoArquivo("4390", valores, "2026-10-11T20:11:55-03:00");
    const { fetch } = fetchFalso({ "4390": [{ corpo: sgs4390Ultimos3 }] });
    const { arquivos, textos, gravados } = arquivosEmMemoria({ "4390": atual });

    const resultado = await atualizarSeries(["4390"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(
      esperado({ linhas: ["4390 (SELIC): sem mudança; 3 meses, último 2026-10 = 0.36"] }),
    );
    expect(gravados).toEqual([]);
    expect(JSON.parse(textos.get("4390") ?? "{}").obtidoEm).toBe("2026-10-11T20:11:55-03:00");
  });

  it("uma série sem mudança e outra com mês novo: só a que mudou é gravada", async () => {
    const atual433 = arquivoAtual("433", [v("2026-08", "-0.32"), v("2026-09", "0.82")]);
    const atual1619 = arquivoAtual("1619", [v("2026-11", "1621.00")]);
    const { fetch } = fetchFalso({
      "433": [{ corpo: sgs433DesdeAgo }],
      "1619": [{ corpo: corpoSgs([v("2026-11", "1621.00"), v("2026-12", "1621.00")]) }],
    });
    const { arquivos, gravados } = arquivosEmMemoria({ "433": atual433, "1619": atual1619 });

    const resultado = await atualizarSeries(["433", "1619"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(
      esperado({
        linhas: [
          "433 (IPCA): sem mudança; 2 meses, último 2026-09 = 0.82",
          "1619 (salário mínimo): 2 meses, último 2026-12 = 1621.00",
        ],
      }),
    );
    expect(gravados).toEqual(["1619"]);
  });
});

describe("atualizarSeries: SELIC parcial × revisão (série 4390)", () => {
  it("SELIC parcial do mês do obtidoEm: aviso informativo, sem 'Atenção', e grava", async () => {
    const atual = textoDoArquivo(
      "4390",
      [v("2026-08", "1.09"), v("2026-09", "1.08"), v("2026-10", "0.30")],
      "2026-10-05T10:47:00-03:00",
    );
    // A resposta do BCB vem em ordem decrescente; o arquivo é gravado em ordem crescente.
    const { fetch } = fetchFalso({ "4390": [{ corpo: sgs4390Ultimos3 }] });
    const { arquivos, textos, gravados } = arquivosEmMemoria({ "4390": atual });

    const resultado = await atualizarSeries(["4390"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(
      esperado({
        linhas: ["4390 (SELIC): 3 meses, último 2026-10 = 0.36"],
        avisos: ["SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.30 para 0.36."],
      }),
    );
    expect(resultado.avisos.join(" ")).not.toContain("Atenção");
    expect(gravados).toEqual(["4390"]);
    const gravado = JSON.parse(textos.get("4390") ?? "{}") as {
      obtidoEm: string;
      valores: ValorMensal[];
    };
    expect(gravado.obtidoEm).toBe(AGORA);
    expect(gravado.valores.map((item) => item.competencia)).toEqual([
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
  });

  it("fechamento do mês parcial no mês seguinte: informativo, e o mês novo entra", async () => {
    const atual = textoDoArquivo(
      "4390",
      [v("2026-08", "1.09"), v("2026-09", "1.08"), v("2026-10", "0.95")],
      "2026-10-30T22:47:00-03:00",
    );
    const { fetch } = fetchFalso({
      "4390": [
        {
          corpo: corpoSgs([
            v("2026-08", "1.09"),
            v("2026-09", "1.08"),
            v("2026-10", "1.02"),
            v("2026-11", "0.05"),
          ]),
        },
      ],
    });
    const { arquivos, gravados } = arquivosEmMemoria({ "4390": atual });

    const resultado = await atualizarSeries(["4390"], arquivos, {
      fetch,
      agora: agoraEm("2026-11-03T10:47:00-03:00"),
    });

    expect(resultado).toEqual(
      esperado({
        linhas: ["4390 (SELIC): 4 meses, último 2026-11 = 0.05"],
        avisos: ["SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.95 para 1.02."],
      }),
    );
    expect(gravados).toEqual(["4390"]);
  });

  it("mudança da 4390 num mês anterior ao do obtidoEm é revisão: 'Atenção'", async () => {
    const atual = textoDoArquivo(
      "4390",
      [v("2026-08", "1.09"), v("2026-09", "1.07"), v("2026-10", "0.36")],
      "2026-10-11T20:11:55-03:00",
    );
    const { fetch } = fetchFalso({ "4390": [{ corpo: sgs4390Ultimos3 }] });
    const { arquivos } = arquivosEmMemoria({ "4390": atual });

    const resultado = await atualizarSeries(["4390"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(
      esperado({
        linhas: ["4390 (SELIC): 3 meses, último 2026-10 = 0.36"],
        avisos: ["Atenção: na série 4390 mudou 1 valor já publicado: 2026-09 de 1.07 para 1.08."],
      }),
    );
  });

  it("revisão e parcial na mesma execução: o 'Atenção' (mês anterior) vem antes da linha informativa", async () => {
    const atual = textoDoArquivo(
      "4390",
      [v("2026-08", "1.10"), v("2026-09", "1.07"), v("2026-10", "0.30")],
      "2026-10-11T20:11:55-03:00",
    );
    const { fetch } = fetchFalso({ "4390": [{ corpo: sgs4390Ultimos3 }] });
    const { arquivos } = arquivosEmMemoria({ "4390": atual });

    const resultado = await atualizarSeries(["4390"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.avisos).toEqual([
      "Atenção: na série 4390 mudaram 2 valores já publicados: 2026-08 de 1.10 para 1.09 e 2026-09 de 1.07 para 1.08.",
      "SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.30 para 0.36.",
    ]);
  });

  it("mês posterior ao do obtidoEm também é parcial (informativo)", async () => {
    // arquivoAtual: obtidoEm em set/2026; out/2026 é posterior.
    const { fetch } = fetchFalso({ "4390": [{ corpo: sgs4390Ultimos3 }] });
    const { arquivos } = arquivosEmMemoria({
      "4390": arquivoAtual("4390", [
        v("2026-08", "1.09"),
        v("2026-09", "1.08"),
        v("2026-10", "0.30"),
      ]),
    });

    const resultado = await atualizarSeries(["4390"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.avisos).toEqual([
      "SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.30 para 0.36.",
    ]);
  });

  it("obtidoEm em UTC (arquivo antigo) vale pelo mês em Brasília: 01/11 01h30 UTC ainda é out/2026", async () => {
    const atual = textoDoArquivo(
      "4390",
      [v("2026-09", "1.08"), v("2026-10", "0.95")],
      "2026-11-01T01:30:00.000Z",
    );
    const { fetch } = fetchFalso({
      "4390": [
        { corpo: corpoSgs([v("2026-09", "1.08"), v("2026-10", "1.02"), v("2026-11", "0.05")]) },
      ],
    });
    const { arquivos } = arquivosEmMemoria({ "4390": atual });

    const resultado = await atualizarSeries(["4390"], arquivos, {
      fetch,
      agora: agoraEm("2026-11-03T10:47:00-03:00"),
    });

    expect(resultado.avisos).toEqual([
      "SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.95 para 1.02.",
    ]);
  });

  it("obtidoEm ilegível no arquivo da SELIC: sem saber o mês parcial, toda mudança é revisão", async () => {
    const atual = textoDoArquivo(
      "4390",
      [v("2026-08", "1.09"), v("2026-09", "1.08"), v("2026-10", "0.30")],
      "ontem",
    );
    const { fetch } = fetchFalso({ "4390": [{ corpo: sgs4390Ultimos3 }] });
    const { arquivos, gravados } = arquivosEmMemoria({ "4390": atual });

    const resultado = await atualizarSeries(["4390"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.avisos).toEqual([
      "Atenção: na série 4390 mudou 1 valor já publicado: 2026-10 de 0.30 para 0.36.",
    ]);
    expect(gravados).toEqual(["4390"]);
  });

  it("SELIC que encolheu não gera aviso: só o problema", async () => {
    const atual = textoDoArquivo(
      "4390",
      [v("2026-07", "1.00"), v("2026-08", "1.09"), v("2026-09", "1.08"), v("2026-10", "0.30")],
      "2026-10-05T10:47:00-03:00",
    );
    const { fetch } = fetchFalso({ "4390": [{ corpo: sgs4390Ultimos3 }] });
    const { arquivos, gravados } = arquivosEmMemoria({ "4390": atual });

    const resultado = await atualizarSeries(["4390"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado).toEqual(
      esperado({
        linhas: ["4390 (SELIC): não gravada."],
        problemas: [
          "A série 4390 encolheu: a lista nova começa em ago/2026, depois do primeiro mês atual (jul/2026).",
        ],
      }),
    );
    expect(gravados).toEqual([]);
  });
});

describe("atualizarSeries: meses atrasados pelo calendário", () => {
  it("IPCA só até 2026-08 e hoje 20/10/2026: linha do IPCA de set/2026", async () => {
    const valores = [v("2026-07", "0.26"), v("2026-08", "-0.32")];
    const { fetch } = fetchFalso({ "433": [{ corpo: corpoSgs(valores) }] });
    const { arquivos, gravados } = arquivosEmMemoria({ "433": arquivoAtual("433", valores) });

    const resultado = await atualizarSeries(["433"], arquivos, {
      fetch,
      agora: agoraEm("2026-10-20T10:47:00-03:00"),
    });

    expect(resultado).toEqual(
      esperado({
        linhas: ["433 (IPCA): sem mudança; 2 meses, último 2026-08 = -0.32"],
        atrasados: [
          "Ainda não disponível no BCB: IPCA de set/2026 (divulgação prevista por volta de 10/10/2026).",
        ],
      }),
    );
    expect(gravados).toEqual([]);
  });

  it("salário mínimo do ano inteiro atrasado: uma linha só", async () => {
    const atual = textoDoArquivo("1619", [v("2026-12", "1621.00")], "2026-12-30T10:47:00-03:00");
    const { fetch } = fetchFalso({ "1619": [{ corpo: sgs1619DesdeDez }] });
    const { arquivos } = arquivosEmMemoria({ "1619": atual });

    const resultado = await atualizarSeries(["1619"], arquivos, {
      fetch,
      agora: agoraEm("2027-02-03T10:47:00-03:00"),
    });

    expect(resultado.atrasados).toEqual([
      "Ainda não disponível no BCB: salário mínimo de jan/2027 a dez/2027 (divulgação prevista no início de 2027, com o decreto do salário mínimo).",
    ]);
  });

  it("meses com previsões diferentes ficam em linhas separadas, em ordem numérica de série", async () => {
    const ipca = [v("2026-06", "0.24"), v("2026-07", "0.26")];
    const inpc = [v("2026-07", "0.21")];
    const { fetch } = fetchFalso({
      "433": [{ corpo: corpoSgs(ipca) }],
      "188": [{ corpo: corpoSgs(inpc) }],
    });
    const { arquivos } = arquivosEmMemoria({
      "433": arquivoAtual("433", ipca),
      "188": arquivoAtual("188", inpc),
    });

    const resultado = await atualizarSeries(["433", "188"], arquivos, {
      fetch,
      agora: agoraEm("2026-10-20T10:47:00-03:00"),
    });

    expect(resultado.linhas).toEqual([
      "433 (IPCA): sem mudança; 2 meses, último 2026-07 = 0.26",
      "188 (INPC): sem mudança; 1 mês, último 2026-07 = 0.21",
    ]);
    expect(resultado.atrasados).toEqual([
      "Ainda não disponível no BCB: INPC de ago/2026 (divulgação prevista por volta de 10/09/2026).",
      "Ainda não disponível no BCB: INPC de set/2026 (divulgação prevista por volta de 10/10/2026).",
      "Ainda não disponível no BCB: IPCA de ago/2026 (divulgação prevista por volta de 10/09/2026).",
      "Ainda não disponível no BCB: IPCA de set/2026 (divulgação prevista por volta de 10/10/2026).",
    ]);
  });

  it("SELIC e taxa legal atrasadas, com a previsão de cada uma", async () => {
    const selic = [v("2026-09", "1.08"), v("2026-10", "1.02")];
    const taxa = [v("2026-09", "0.381234"), v("2026-10", "0.379020")];
    const { fetch } = fetchFalso({
      "4390": [{ corpo: corpoSgs(selic) }],
      "29543": [{ corpo: corpoSgs(taxa) }],
    });
    const { arquivos } = arquivosEmMemoria({
      "4390": textoDoArquivo("4390", selic, "2026-11-01T09:00:00-03:00"),
      "29543": arquivoAtual("29543", taxa),
    });

    const resultado = await atualizarSeries(["29543", "4390"], arquivos, {
      fetch,
      agora: agoraEm("2026-11-10T14:17:00-03:00"),
    });

    expect(resultado.atrasados).toEqual([
      "Ainda não disponível no BCB: SELIC de nov/2026 (divulgação prevista ao longo de nov/2026, como acumulado parcial fechado no início de dez/2026).",
      "Ainda não disponível no BCB: taxa legal de nov/2026 (divulgação prevista no 1º dia útil de nov/2026).",
    ]);
  });

  it("série gravada com o mês que faltava não aparece nos atrasados", async () => {
    const { fetch } = fetchFalso({
      "433": [
        { corpo: corpoSgs([v("2026-07", "0.26"), v("2026-08", "-0.32"), v("2026-09", "0.82")]) },
      ],
    });
    const { arquivos, gravados } = arquivosEmMemoria({
      "433": arquivoAtual("433", [v("2026-07", "0.26"), v("2026-08", "-0.32")]),
    });

    const resultado = await atualizarSeries(["433"], arquivos, {
      fetch,
      agora: agoraEm("2026-10-20T10:47:00-03:00"),
    });

    expect(resultado).toEqual(esperado({ linhas: ["433 (IPCA): 3 meses, último 2026-09 = 0.82"] }));
    expect(gravados).toEqual(["433"]);
  });

  it("série que encolheu conta pelo arquivo atual; busca que falhou ou arquivo ilegível ficam fora", async () => {
    const { fetch } = fetchFalso({
      "433": [{ corpo: corpoSgs([v("2026-07", "0.26")]) }],
      "188": [{ corpo: corpoSgs([v("2026-08", "-0.21")]) }],
      "189": [{ corpo: sgsErro404SemValores, status: 404 }],
    });
    const { arquivos } = arquivosEmMemoria({
      "433": arquivoAtual("433", [v("2026-07", "0.26"), v("2026-08", "-0.32")]),
      "188": "{",
      "189": arquivoAtual("189", [v("2026-01", "0.10")]),
    });

    const resultado = await atualizarSeries(["433", "188", "189"], arquivos, {
      fetch,
      agora: agoraEm("2026-10-20T10:47:00-03:00"),
    });

    expect(resultado.problemas).toHaveLength(3);
    // O IPCA encolheu, mas o BCB respondeu: conta pelo arquivo atual (até ago/2026). O INPC tem o
    // arquivo ilegível, e a busca do IGP-M falhou (não se sabe o que o BCB tem): os dois ficam fora.
    expect(resultado.atrasados).toEqual([
      "Ainda não disponível no BCB: IPCA de set/2026 (divulgação prevista por volta de 10/10/2026).",
    ]);
  });

  it("série gravada que continua atrás do calendário aparece nos atrasados, pelo que foi gravado", async () => {
    const { fetch } = fetchFalso({
      "433": [{ corpo: corpoSgs([v("2026-07", "0.26"), v("2026-08", "-0.32")]) }],
    });
    const { arquivos, gravados } = arquivosEmMemoria({
      "433": arquivoAtual("433", [v("2026-07", "0.26")]),
    });

    const resultado = await atualizarSeries(["433"], arquivos, {
      fetch,
      agora: agoraEm("2026-10-20T10:47:00-03:00"),
    });

    expect(gravados).toEqual(["433"]);
    expect(resultado.atrasados).toEqual([
      "Ainda não disponível no BCB: IPCA de set/2026 (divulgação prevista por volta de 10/10/2026).",
    ]);
  });

  it("só as séries pedidas entram nos atrasados", async () => {
    const { fetch } = fetchFalso({ "433": [{ corpo: sgs433DesdeSet }] });
    const ler = vi.fn((codigo: CodigoSerie) =>
      codigo === "189" ? arquivoAtual("189", [v("2026-01", "0.10")]) : null,
    );
    const arquivos: ArquivosDeSeries = { ler, gravar: () => undefined };

    const resultado = await atualizarSeries(["433"], arquivos, { fetch, agora: agoraFixo });

    expect(resultado.atrasados).toEqual([]);
    expect(ler).not.toHaveBeenCalledWith("189");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Execute: `npm test -- src/indices/atualizacao.test.ts`
Esperado: o arquivo de teste falha ao carregar ("Cannot find module './atualizacao.ts'"); nenhum teste roda.

- [ ] **Step 3: Escrever o código**

Crie `src/indices/atualizacao.ts`:

```ts
import { formatarCompetencia } from "../compartilhado/formatacao.ts";
import type {
  ArquivoSerie,
  CodigoSerie,
  Competencia,
  TabelaIndices,
  ValorIndice,
} from "../compartilhado/tipos.ts";
import { agruparAtrasados, mesesAtrasados, SERIES_EM_ORDEM_NUMERICA } from "./calendario.ts";
import { buscarSerie, montarArquivoSerie } from "./cliente-bcb.ts";
import type { OpcoesBusca, RespostaBusca, ValorMensal } from "./cliente-bcb.ts";
import { compararSeries, lerArquivoSerie } from "./arquivo-serie.ts";
import type { ComparacaoDeSerie } from "./arquivo-serie.ts";
import { agoraEmBrasilia, dataHoraEmBrasilia } from "./relogio.ts";
import { SERIES } from "./series.ts";

/**
 * Orquestração de `scripts/atualizar-indices.ts`, a rotina central de índices (fase 4), separada do
 * script para ser testada sem rede e sem disco: baixa todas as séries pedidas, confere cada uma
 * contra o arquivo atual e grava, série por série, as que vieram boas e mudaram (uma série com
 * problema não impede as outras). Rede (`fetch`), disco (`ArquivosDeSeries`) e relógio (`agora`)
 * entram por parâmetro; o script passa as versões reais. Não importa `embutidos.ts` nem
 * `congelar.ts`: o script precisa iniciar mesmo com um arquivo de série faltando ou corrompido.
 */

/** O que o script sabe fazer com a pasta `dados/indices/`: ler o texto de um arquivo e gravar outro. */
export interface ArquivosDeSeries {
  /** Texto do arquivo atual da série, ou null quando ele não existe. */
  ler(codigo: CodigoSerie): string | null;
  /** Grava o texto completo do arquivo da série (substituindo o atual). */
  gravar(codigo: CodigoSerie, texto: string): void;
}

export interface OpcoesAtualizacao {
  /** Função de rede; padrão `globalThis.fetch`. */
  fetch?: typeof globalThis.fetch;
  /** Data-hora ISO em Brasília para `obtidoEm`; padrão `agoraEmBrasilia`. */
  agora?: () => string;
  /** Ajustes por cima de `BUSCA_DO_SCRIPT` (os testes injetam `dormir`). */
  busca?: Omit<OpcoesBusca, "fetch">;
}

/** Parâmetros de busca da rotina: 30 s por pedido, até três tentativas, 2 s de espera (ninguém espera por ela). */
export const BUSCA_DO_SCRIPT: Pick<OpcoesBusca, "tempoLimiteMs" | "tentativas" | "esperaMs"> = {
  tempoLimiteMs: 30_000,
  tentativas: 3,
  esperaMs: 2_000,
};

export type SeriesPedidas = { ok: true; codigos: CodigoSerie[] } | { ok: false; mensagem: string };

/** O que a execução tem a dizer, em frases prontas para a saída do script (e o resumo e o commit da rotina). */
export interface ResultadoAtualizacao {
  /**
   * uma por série pedida, na ordem: gravada ("433 (IPCA): 562 meses, último 2026-10 = 0.30"), sem
   * mudança ("433 (IPCA): sem mudança; 561 meses, …") ou não gravada ("433 (IPCA): não gravada.")
   */
  linhas: string[];
  /**
   * revisões ("Atenção: na série 433 mudou 1 valor já publicado: 2026-09 de 0.80 para 0.82.") e
   * SELIC parcial ("SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.30 para 0.36.")
   */
  avisos: string[];
  /** um por série com problema, em frase completa; a série fica como estava */
  problemas: string[];
  /**
   * depois da execução, os meses já divulgados pelo calendário que ainda não estão nos arquivos das
   * séries pedidas, um por grupo de `agruparAtrasados`:
   * "Ainda não disponível no BCB: IPCA de set/2026 (divulgação prevista por volta de 10/10/2026)."
   */
  atrasados: string[];
}

function ehCodigo(texto: string): texto is CodigoSerie {
  return Object.hasOwn(SERIES, texto);
}

/** "a" · "a e b" · "a, b e c" */
function listar(itens: string[]): string {
  const ultimo = itens.at(-1);
  if (ultimo === undefined) return "";
  const anteriores = itens.slice(0, -1);
  return anteriores.length === 0 ? ultimo : `${anteriores.join(", ")} e ${ultimo}`;
}

/** Tira um ponto final para a frase receber o seu (ou caber entre parênteses). */
function semPontoFinal(texto: string): string {
  return texto.endsWith(".") ? texto.slice(0, -1) : texto;
}

function mensagemDoErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}

/**
 * Séries a atualizar a partir dos argumentos da linha de comando: sem argumentos, as seis em ordem
 * numérica; com argumentos, na ordem pedida e sem repetição. Qualquer código desconhecido recusa o
 * pedido inteiro, antes de baixar o que for (cada desconhecido é nomeado uma vez só).
 */
export function seriesPedidas(argumentos: readonly string[]): SeriesPedidas {
  if (argumentos.length === 0) return { ok: true, codigos: [...SERIES_EM_ORDEM_NUMERICA] };
  const desconhecidos = [...new Set(argumentos.filter((argumento) => !ehCodigo(argumento)))];
  if (desconhecidos.length > 0) {
    const nomes = desconhecidos.map((argumento) => (argumento === "" ? "(vazio)" : argumento));
    const quais =
      nomes.length === 1
        ? `Série desconhecida: ${nomes[0]}`
        : `Séries desconhecidas: ${listar(nomes)}`;
    return {
      ok: false,
      mensagem: `${quais}. Conhecidas: ${SERIES_EM_ORDEM_NUMERICA.join(", ")}.`,
    };
  }
  const codigos: CodigoSerie[] = [];
  for (const argumento of argumentos) {
    if (ehCodigo(argumento) && !codigos.includes(argumento)) codigos.push(argumento);
  }
  return { ok: true, codigos };
}

/** Como sair do impasse de um arquivo atual ilegível, que o script se recusa a sobrescrever. */
function comoRestaurar(codigo: CodigoSerie): string {
  return `(restaure-o com "git checkout -- dados/indices/${codigo}.json" ou apague-o para baixar a série inteira de novo)`;
}

/** Arquivo atual lido e conferido (`arquivo` null quando não existe), ou o problema que impede a gravação. */
type ArquivoAtual = { ok: true; arquivo: ArquivoSerie | null } | { ok: false; problema: string };

function lerArquivoAtual(codigo: CodigoSerie, texto: string | null): ArquivoAtual {
  if (texto === null) return { ok: true, arquivo: null };
  let dado: unknown;
  try {
    dado = JSON.parse(texto);
  } catch {
    return {
      ok: false,
      problema: `O arquivo atual da série ${codigo} não é JSON válido ${comoRestaurar(codigo)}.`,
    };
  }
  try {
    return { ok: true, arquivo: lerArquivoSerie(dado, codigo) };
  } catch (erro) {
    return {
      ok: false,
      problema: `O arquivo atual da série ${codigo} não pôde ser lido (${semPontoFinal(mensagemDoErro(erro))}) ${comoRestaurar(codigo)}.`,
    };
  }
}

/** "A série 189 não foi baixada após 3 tentativas: o BCB respondeu HTTP 502." */
function problemaDeBusca(codigo: CodigoSerie, resposta: RespostaBusca & { ok: false }): string {
  const tentativas = resposta.tentativas > 1 ? ` após ${resposta.tentativas} tentativas` : "";
  return `A série ${codigo} não foi baixada${tentativas}: ${semPontoFinal(resposta.motivo)}.`;
}

type Alterados = ComparacaoDeSerie["alterados"];

/** "Atenção: na série 433 mudou 1 valor já publicado: 2026-09 de 0.82 para 0.85." */
function avisoDeRevisao(codigo: CodigoSerie, alterados: Alterados): string {
  const quantos =
    alterados.length === 1
      ? "mudou 1 valor já publicado"
      : `mudaram ${alterados.length} valores já publicados`;
  const itens = alterados.map(
    ({ competencia, antes, depois }) => `${competencia} de ${antes} para ${depois}`,
  );
  return `Atenção: na série ${codigo} ${quantos}: ${listar(itens)}.`;
}

/** "SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.30 para 0.36." */
function avisoDeSelicParcial({ competencia, antes, depois }: Alterados[number]): string {
  return `SELIC de ${formatarCompetencia(competencia)} (acumulado parcial do mês) atualizada de ${antes} para ${depois}.`;
}

/**
 * Mês ("AAAA-MM") de uma data-hora ISO no horário de Brasília, ou null quando o texto não é
 * data-hora com fuso. A conversão importa nos arquivos anteriores à fase 4, gravados em UTC:
 * "2026-11-01T01:30:00Z" ainda é 31/10/2026 em Brasília, e o mês parcial da SELIC era outubro.
 */
function mesEmBrasilia(iso: string): Competencia | null {
  return dataHoraEmBrasilia(iso)?.data.slice(0, 7) ?? null;
}

/**
 * Avisos dos valores já publicados que mudaram. Na SELIC (4390), o mês do `obtidoEm` do
 * arquivo atual e os seguintes eram o acumulado parcial, que muda todo dia útil até fechar no início
 * do mês seguinte: cada um vira uma linha informativa, sem "Atenção". Mês anterior a esse, ou
 * qualquer mês das outras séries, é revisão de valor publicado ("Atenção: …"), que vem primeiro.
 * Sem `obtidoEm` legível não há como saber qual mês era parcial, e toda mudança conta como revisão.
 */
function avisosDeAlterados(
  codigo: CodigoSerie,
  alterados: Alterados,
  obtidoEmAtual: string,
): string[] {
  const mesParcial = codigo === "4390" ? mesEmBrasilia(obtidoEmAtual) : null;
  const ehParcial = (competencia: Competencia): boolean =>
    mesParcial !== null && competencia >= mesParcial;
  const revisoes = alterados.filter(({ competencia }) => !ehParcial(competencia));
  const parciais = alterados.filter(({ competencia }) => ehParcial(competencia));
  return [
    ...(revisoes.length > 0 ? [avisoDeRevisao(codigo, revisoes)] : []),
    ...parciais.map(avisoDeSelicParcial),
  ];
}

/** "433 (IPCA)" */
function rotulo(codigo: CodigoSerie): string {
  return `${codigo} (${SERIES[codigo].nome})`;
}

/** "433 (IPCA): 561 meses, último 2026-09 = 0.82"; sem mudança: "433 (IPCA): sem mudança; 561 meses, …" */
function linhaDaSerie(codigo: CodigoSerie, valores: ValorMensal[], semMudanca = false): string {
  const ultimo = valores.at(-1);
  const meses = valores.length === 1 ? "1 mês" : `${valores.length} meses`;
  const situacao = semMudanca ? "sem mudança; " : "";
  return `${rotulo(codigo)}: ${situacao}${meses}, último ${ultimo?.competencia ?? "-"} = ${ultimo?.valor ?? "-"}`;
}

/** Conteúdo do arquivo como vai para o disco: JSON com 2 espaços e quebra de linha final. */
function textoDoArquivo(codigo: CodigoSerie, valores: ValorMensal[], obtidoEm: string): string {
  return `${JSON.stringify(montarArquivoSerie(codigo, valores, obtidoEm), null, 2)}\n`;
}

interface SerieBaixada {
  codigo: CodigoSerie;
  resposta: RespostaBusca;
  /** data-hora da obtenção, lida logo após a resposta */
  obtidoEm: string;
}

/** Valores com que a série termina a execução (os gravados ou os do arquivo atual) e sua obtenção. */
interface ValoresFinais {
  valores: ValorMensal[];
  obtidoEm: string;
}

/**
 * O que fazer com uma série depois de baixada e conferida: gravar; não regravar, por ser idêntica
 * ao arquivo atual (mantém a data de obtenção original, que na SELIC diz qual mês é o parcial, e a
 * rotina só grava quando há dado novo); ou deixá-la como estava, por um problema.
 */
type Decisao =
  | { tipo: "gravar"; valores: ValorMensal[]; obtidoEm: string }
  | { tipo: "semMudanca"; valores: ValorMensal[]; finais: ValoresFinais }
  | { tipo: "problema"; problema: string; finais: ValoresFinais | null };

interface SerieDecidida {
  codigo: CodigoSerie;
  decisao: Decisao;
  avisos: string[];
}

/**
 * Decide uma série pela resposta do BCB e pelo texto do arquivo atual. Problemas, um por série, na
 * ordem: busca que falhou; arquivo atual ilegível; resposta vazia sem nada no arquivo atual; lista
 * nova que encolheu. Valores já publicados que mudaram geram aviso, não impedimento.
 */
function decidir(
  { codigo, resposta, obtidoEm }: SerieBaixada,
  texto: string | null,
): SerieDecidida {
  const atual = lerArquivoAtual(codigo, texto);
  const arquivo = atual.ok ? atual.arquivo : null;
  const finaisDoArquivo: ValoresFinais | null =
    arquivo === null ? null : { valores: arquivo.valores, obtidoEm: arquivo.obtidoEm };
  const problema = (frase: string): SerieDecidida => ({
    codigo,
    decisao: { tipo: "problema", problema: frase, finais: finaisDoArquivo },
    avisos: [],
  });

  // Busca que falhou: não se sabe o que o BCB tem, e a série fica fora dos meses atrasados (o
  // problema já a cita).
  if (!resposta.ok) {
    return {
      codigo,
      decisao: { tipo: "problema", problema: problemaDeBusca(codigo, resposta), finais: null },
      avisos: [],
    };
  }
  if (!atual.ok) return problema(atual.problema);
  if (resposta.valores.length === 0 && (arquivo === null || arquivo.valores.length === 0)) {
    return problema(`A série ${codigo} veio vazia.`);
  }
  if (arquivo === null) {
    return { codigo, decisao: { tipo: "gravar", valores: resposta.valores, obtidoEm }, avisos: [] };
  }
  const comparacao = compararSeries(arquivo.valores, resposta.valores);
  if (comparacao.encolheu) {
    const motivo = semPontoFinal(comparacao.motivo ?? "a lista nova perdeu meses");
    return problema(`A série ${codigo} encolheu: ${motivo}.`);
  }
  const avisos = avisosDeAlterados(codigo, comparacao.alterados, arquivo.obtidoEm);
  const semMudanca =
    comparacao.alterados.length === 0 &&
    comparacao.novos.length === 0 &&
    resposta.valores.length === arquivo.valores.length;
  const decisao: Decisao = semMudanca
    ? {
        tipo: "semMudanca",
        valores: resposta.valores,
        finais: { valores: arquivo.valores, obtidoEm: arquivo.obtidoEm },
      }
    : { tipo: "gravar", valores: resposta.valores, obtidoEm };
  return { codigo, decisao, avisos };
}

/** Tabela só com o que o calendário precisa: as competências de cada série ao fim da execução. */
function tabelaMinima(
  finais: Partial<Record<CodigoSerie, ValoresFinais>>,
  consultadoEm: string,
): TabelaIndices {
  const series: TabelaIndices["series"] = {};
  for (const codigo of SERIES_EM_ORDEM_NUMERICA) {
    const serie = finais[codigo];
    if (serie === undefined) continue;
    const porCompetencia: Record<Competencia, ValorIndice> = {};
    for (const { competencia, valor } of serie.valores) {
      porCompetencia[competencia] = { valor, fonte: "embutida", obtidoEm: serie.obtidoEm };
    }
    series[codigo] = porCompetencia;
  }
  return { consultadoEm, series };
}

/**
 * "Ainda não disponível no BCB: IPCA de set/2026 (divulgação prevista por volta de 10/10/2026)." e
 * "Ainda não disponível no BCB: salário mínimo de jan/2027 a dez/2027 (…).": um por grupo de meses
 * atrasados pelo calendário, em ordem numérica de série. Só entram as séries com valores finais
 * conhecidos: as gravadas, as sem mudança e as que tiveram problema depois de o BCB responder
 * (pelo arquivo atual legível).
 */
function linhasDeAtrasados(
  finais: Partial<Record<CodigoSerie, ValoresFinais>>,
  agora: string,
): string[] {
  const hoje = agora.slice(0, 10);
  const grupos = agruparAtrasados(mesesAtrasados(tabelaMinima(finais, agora), hoje));
  return grupos.map(({ serie, de, ate, previsao }) => {
    const meses =
      de === ate
        ? formatarCompetencia(de)
        : `${formatarCompetencia(de)} a ${formatarCompetencia(ate)}`;
    return `Ainda não disponível no BCB: ${SERIES[serie].nome} de ${meses} (divulgação prevista ${previsao}).`;
  });
}

/**
 * Baixa o histórico completo de cada série pedida (em sequência, com `BUSCA_DO_SCRIPT`), confere
 * cada uma contra o arquivo atual e grava, uma a uma, as que vieram boas e mudaram. Série que
 * falhou, encolheu, veio vazia ou tem arquivo atual ilegível fica como estava e entra em
 * `problemas`, sem impedir as outras. Série idêntica ao arquivo atual não é regravada. Todos os
 * arquivos são lidos antes da primeira gravação. Ao fim, aponta os meses que o calendário diz já
 * divulgados e que os arquivos ainda não têm. Nunca lança por dado ruim (do BCB ou do arquivo);
 * só um erro do disco sobe, para o script imprimir.
 */
export async function atualizarSeries(
  codigos: readonly CodigoSerie[],
  arquivos: ArquivosDeSeries,
  opcoes: OpcoesAtualizacao = {},
): Promise<ResultadoAtualizacao> {
  const agora = opcoes.agora ?? agoraEmBrasilia;
  const busca: OpcoesBusca = { ...BUSCA_DO_SCRIPT, ...opcoes.busca, fetch: opcoes.fetch };

  // 1) Baixa todas as séries, em sequência, antes de qualquer decisão.
  const baixadas: SerieBaixada[] = [];
  for (const codigo of codigos) {
    const resposta = await buscarSerie(codigo, undefined, busca);
    baixadas.push({ codigo, resposta, obtidoEm: agora() });
  }

  // 2) Lê o arquivo atual de cada uma e decide (um erro de leitura do disco interrompe aqui).
  const decididas = baixadas.map((baixada) => decidir(baixada, arquivos.ler(baixada.codigo)));

  // 3) Grava, série por série, as que vieram boas e mudaram.
  const linhas: string[] = [];
  const avisos: string[] = [];
  const problemas: string[] = [];
  const finais: Partial<Record<CodigoSerie, ValoresFinais>> = {};
  for (const { codigo, decisao, avisos: avisosDaSerie } of decididas) {
    avisos.push(...avisosDaSerie);
    switch (decisao.tipo) {
      case "gravar":
        arquivos.gravar(codigo, textoDoArquivo(codigo, decisao.valores, decisao.obtidoEm));
        linhas.push(linhaDaSerie(codigo, decisao.valores));
        finais[codigo] = { valores: decisao.valores, obtidoEm: decisao.obtidoEm };
        break;
      case "semMudanca":
        linhas.push(linhaDaSerie(codigo, decisao.valores, true));
        finais[codigo] = decisao.finais;
        break;
      case "problema":
        linhas.push(`${rotulo(codigo)}: não gravada.`);
        problemas.push(decisao.problema);
        if (decisao.finais !== null) finais[codigo] = decisao.finais;
        break;
    }
  }

  // 4) Meses já divulgados pelo calendário que os arquivos ainda não têm.
  return { linhas, avisos, problemas, atrasados: linhasDeAtrasados(finais, agora()) };
}
```

Substitua `scripts/atualizar-indices.ts` por:

```ts
// Atualiza a cópia publicada das séries do BCB em dados/indices/ (a rotina central de índices:
// .github/workflows/atualizar-indices.yml roda este script nos dias úteis; também serve à mão).
//   npm run indices:atualizar             → todas as séries do catálogo
//   npm run indices:atualizar -- 189 433  → só as indicadas
// Roda no Node 22.18+ sem compilação (sintaxe apagável); por isso os imports relativos têm a
// extensão .ts. A orquestração (baixar tudo → conferir cada série contra o arquivo atual → gravar
// as boas que mudaram) está em src/indices/atualizacao.ts, testada sem rede; aqui ficam só os
// argumentos, o disco e o console.
// Saída: uma linha por série, depois os avisos (revisões e SELIC parcial) e os meses atrasados pelo
// calendário, tudo na saída padrão; por fim os problemas, na saída de erros. Uma série com problema
// fica como estava e não impede as outras de serem gravadas, mas o código de saída é 1 (a
// execução da rotina fica marcada como falha); também é 1 quando um código pedido é desconhecido (aí nada é baixado). Sem
// problemas, 0, mesmo com avisos.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CodigoSerie } from "../src/compartilhado/tipos.ts";
import { atualizarSeries, seriesPedidas } from "../src/indices/atualizacao.ts";
import type { ArquivosDeSeries } from "../src/indices/atualizacao.ts";

const PASTA = join(import.meta.dirname, "..", "dados", "indices");

/** A pasta dados/indices/ como o módulo de atualização a enxerga: um arquivo <codigo>.json por série. */
function arquivosEmDisco(pasta: string): ArquivosDeSeries {
  const caminho = (codigo: CodigoSerie): string => join(pasta, `${codigo}.json`);
  return {
    ler(codigo) {
      try {
        return readFileSync(caminho(codigo), "utf8");
      } catch (erro) {
        if ((erro as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw erro;
      }
    },
    gravar(codigo, texto) {
      mkdirSync(pasta, { recursive: true });
      writeFileSync(caminho(codigo), texto);
    },
  };
}

/** Devolve o código de saída do processo; só o que for inesperado (disco, por exemplo) lança. */
async function main(): Promise<number> {
  const pedido = seriesPedidas(process.argv.slice(2));
  if (!pedido.ok) {
    console.error(pedido.mensagem);
    return 1;
  }
  const resultado = await atualizarSeries(pedido.codigos, arquivosEmDisco(PASTA));
  for (const linha of resultado.linhas) console.log(linha);
  for (const aviso of resultado.avisos) console.log(aviso);
  for (const atrasado of resultado.atrasados) console.log(atrasado);
  for (const problema of resultado.problemas) console.error(problema);
  return resultado.problemas.length > 0 ? 1 : 0;
}

main().then(
  (codigo) => {
    process.exitCode = codigo;
  },
  (erro: unknown) => {
    console.error(erro instanceof Error ? erro.message : String(erro));
    process.exitCode = 1;
  },
);
```

- [ ] **Step 4: Rodar e ver passar**

Execute: `npm run format && npm run verificar`
Esperado: tudo verde; 21 arquivos de teste, 634 passando | 9 pulados (643).

Confira o script sem rede (série desconhecida não baixa nada):

```bash
node scripts/atualizar-indices.ts abc
```

Esperado, na saída de erro e com código de saída 1: `Série desconhecida: abc. Conhecidas: 188, 189, 433, 1619, 4390, 29543.`

- [ ] **Step 5: Escrever o workflow da rotina**

Crie `.github/workflows/atualizar-indices.yml` (conferido por leitura e pelo Prettier; só pode ser executado com o repositório no GitHub, na fase 7):

```yaml
# Rotina central de índices (fase 4, decisão de 12/10/2026).
#
# O que faz: baixa as seis séries do BCB com o mesmo script usado à mão (npm run
# indices:atualizar), grava série por série as que vieram boas e mudaram (uma série com problema não
# impede as outras), confere formatação, lint, tipos e testes e, se algum arquivo de dados/ mudou,
# grava na main com um commit que traz a rodada, a saída do script e o endereço desta execução. O
# app não consulta o BCB: lê só a cópia publicada em dados/indices/.
#
# Quando roda: de segunda a sexta às 10h47, 14h17 e 22h47 de Brasília (três agendamentos, cada um
# com o fuso America/Sao_Paulo) e à mão, em "Actions" (workflow_dispatch). O título de cada
# execução diz a rodada; o relatório mensal (relatorio-indices.yml) conta as execuções por ele.
#
# Monitoramento: cada execução deixa um resumo com a saída do script; problema numa série faz a
# execução terminar com falha (vermelha no GitHub); nas execuções agendadas sem problema, um sinal de vida vai
# ao Healthchecks.io (só se o segredo HC_URL existir), que avisa quando os sinais param. Uma falha
# nas conferências ou na gravação também suprime o sinal; a do deploy hook, que vem depois, não.
#
# Só grava a partir da main: disparado à mão em outro ramo, o job não roda. O checkout pega sempre
# a ponta da main, para que uma reexecução ou uma execução que esperou na fila não parta de um
# commit antigo (o rebase entraria em conflito com a gravação anterior).
#
# Só pode ser executado e testado quando o repositório estiver no GitHub (fase 7): até lá, é apenas
# conferido por leitura e pelo Prettier.
#
# Atenção: o commit feito com o GITHUB_TOKEN não dispara outros workflows; a publicação do site
# reage pela integração Git do Cloudflare Pages ou pelo deploy hook (só se o segredo CF_DEPLOY_HOOK
# existir). E a main recebe commits deste robô quase todo dia útil: atualize a sua cópia (git pull)
# antes de enviar alterações.
name: Atualizar índices do BCB
run-name: "Atualizar índices · ${{ github.event_name == 'schedule' && github.event.schedule || 'manual' }}"

on:
  schedule:
    - cron: "47 10 * * 1-5"
      timezone: "America/Sao_Paulo"
    - cron: "17 14 * * 1-5"
      timezone: "America/Sao_Paulo"
    - cron: "47 22 * * 1-5"
      timezone: "America/Sao_Paulo"
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: atualizar-indices
  cancel-in-progress: false

jobs:
  atualizar:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    timeout-minutes: 15
    # Os segredos só entram nos passos que os usam; aqui ficam apenas os indicadores de que existem.
    env:
      TEM_HC: ${{ secrets.HC_URL != '' }}
      TEM_CF: ${{ secrets.CF_DEPLOY_HOOK != '' }}
      AGENDAMENTO: ${{ github.event.schedule }}
    steps:
      - uses: actions/checkout@v6
        with:
          ref: main

      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      # Com "shell: bash", o GitHub usa "set -eo pipefail": o código de saída do script atravessa o
      # tee. "continue-on-error" deixa a execução seguir para gravar as séries boas; o último passo
      # devolve a falha.
      - name: Baixar as séries do BCB
        id: baixar
        continue-on-error: true
        shell: bash
        run: |
          case "$AGENDAMENTO" in
            "47 10 * * 1-5") RODADA="10h47" ;;
            "17 14 * * 1-5") RODADA="14h17" ;;
            "47 22 * * 1-5") RODADA="22h47" ;;
            "") RODADA="manual" ;;
            *) RODADA="$AGENDAMENTO" ;;
          esac
          echo "RODADA=$RODADA" >> "$GITHUB_ENV"
          npm run --silent indices:atualizar 2>&1 | tee "$RUNNER_TEMP/saida.txt"

      - name: Resumo da execução
        if: always()
        shell: bash
        run: |
          {
            echo "## Atualização dos índices do BCB · rodada ${RODADA:-não identificada}"
            echo
            if [ -f "$RUNNER_TEMP/saida.txt" ]; then
              echo '```'
              cat "$RUNNER_TEMP/saida.txt"
              echo '```'
            else
              echo "O script não chegou a rodar; veja os passos anteriores."
            fi
          } >> "$GITHUB_STEP_SUMMARY"

      - name: Ver se algum arquivo mudou
        id: mudancas
        shell: bash
        run: |
          if [ -z "$(git status --porcelain -- dados)" ]; then
            echo "houve=false" >> "$GITHUB_OUTPUT"
            echo "Nenhum arquivo de dados/ mudou; nada a gravar."
          else
            echo "houve=true" >> "$GITHUB_OUTPUT"
            git status --short -- dados
          fi

      - name: Conferir formatação, lint, tipos e testes
        if: steps.mudancas.outputs.houve == 'true'
        run: npm run verificar

      # TZ: a data do commit (e a da reaplicação pelo rebase) fica no horário de Brasília.
      - name: Gravar na main
        id: gravar
        if: steps.mudancas.outputs.houve == 'true'
        shell: bash
        env:
          TZ: America/Sao_Paulo
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          MENSAGEM="$RUNNER_TEMP/mensagem.txt"
          {
            echo "indices: séries do BCB em $(TZ=America/Sao_Paulo date '+%d/%m/%Y %H:%M') (rodada $RODADA)"
            echo
            cat "$RUNNER_TEMP/saida.txt"
            echo
            echo "Execução: $GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID"
          } > "$MENSAGEM"
          git add dados
          git commit -F "$MENSAGEM"
          # Outro envio pode entrar entre o pull e o push: tenta de novo, até três vezes.
          for tentativa in 1 2 3; do
            if git pull --rebase origin main && git push origin HEAD:main; then exit 0; fi
            git rebase --abort 2>/dev/null || true
            sleep $((tentativa * 10))
          done
          echo "::error::Não foi possível gravar na main depois de 3 tentativas."
          exit 1

      - name: Sinal de vida ao Healthchecks
        if: steps.baixar.outcome == 'success' && github.event_name == 'schedule' && env.TEM_HC == 'true'
        env:
          HC_URL: ${{ secrets.HC_URL }}
        run: curl -fsS -m 10 --retry 5 "$HC_URL" || true

      - name: Publicar pelo deploy hook
        if: steps.gravar.outcome == 'success' && env.TEM_CF == 'true'
        env:
          CF_DEPLOY_HOOK: ${{ secrets.CF_DEPLOY_HOOK }}
        run: curl -fsS -m 30 --retry 3 --retry-all-errors -X POST "$CF_DEPLOY_HOOK"

      - name: Sinalizar problema nas séries
        if: steps.baixar.outcome == 'failure'
        run: |
          echo "::error::Alguma série do BCB não foi atualizada (veja o resumo da execução e a saída do passo \"Baixar as séries do BCB\"); as demais, se mudaram, foram gravadas."
          exit 1
```

Execute: `npx prettier --check .github/workflows/atualizar-indices.yml`
Esperado: "All matched files use Prettier code style!"

- [ ] **Step 6: Commit do código**

```bash
git add src/indices/atualizacao.ts src/indices/atualizacao.test.ts scripts/atualizar-indices.ts .github/workflows/atualizar-indices.yml
git commit -m "indices: rotina central (atualização série por série, script e workflow de segunda a sexta às 10h47, 14h17 e 22h47)

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

- [ ] **Step 7: Rodar o script contra o BCB (precisa de internet)**

Até a fase 7 não há robô; esta execução à mão confere o script contra o BCB real.

Execute: `npm run indices:atualizar`
Esperado: seis linhas, uma por série, na ordem 188, 189, 433, 1619, 4390, 29543. Cada uma diz "sem mudança; …" (arquivo intocado) ou traz a contagem nova (arquivo regravado com `obtidoEm` no horário de Brasília, por exemplo `"2026-10-13T10:15:02-03:00"`). Depois podem vir a linha da SELIC parcial ("SELIC de out/2026 (acumulado parcial do mês) atualizada de … para …", porque ela muda a cada dia útil), avisos "Atenção: …" de valores revistos pelo BCB e linhas "Ainda não disponível no BCB: …". Se o BCB falhar numa série, o script grava as outras, diz qual falhou e termina com código 1: rode de novo mais tarde.

Execute: `npm run verificar`
Esperado: tudo verde, com a mesma contagem do Step 4 (os testes não dependem dos meses novos).

Se algum arquivo mudou (`git status --short dados/indices` lista algo):

```bash
git add dados/indices
git commit -m "indices: séries do BCB atualizadas à mão (data de obtenção no horário de Brasília)

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

Se nada mudou, não há commit: os arquivos atuais, de 11/10/2026 às 23:11 UTC (20:11 em Brasília), já dão o mês certo para a SELIC parcial, e passam a ser gravados no horário de Brasília na primeira vez que cada série mudar.


### Task 9: Relatório mensal da rotina: montagem testada sem rede, script, workflow do dia 2 e comando `indices:relatorio`

**Files:**
- Create: `src/indices/relatorio.ts`, `scripts/relatorio-indices.ts`, `.github/workflows/relatorio-indices.yml`, `src/indices/testes/execucoes-rotina.json`
- Modify: `package.json` (script `indices:relatorio`), `vite.config.ts` (os testes de `scripts/` passam a rodar)
- Test: `src/indices/relatorio.test.ts`, `scripts/relatorio-indices.test.ts`

**Interfaces:**
- Consome: `dataHoraEmBrasilia` (Task 2); `competenciaDe`, `competenciaValida`, `dataValida`, `diaAnterior`, `diaSeguinte`, `diasDesdeEpoca`, `primeiroDiaDoMes`, `ultimoDiaDoMes`; `formatarCompetencia`, `formatarData`; o título das execuções e o dos commits que o workflow da Task 8 escreve.
- Produz:
  - `type Rodada = "10h47" | "14h17" | "22h47"` e `RODADAS` (hora, minuto e linha de agendamento de cada uma).
  - `interface ExecucaoDaRotina { id; titulo; evento; conclusao; criadaEm; iniciadaEm; atualizadaEm; tentativa }` e `lerExecucoes(dado: unknown): ExecucaoDaRotina[]` — lê a lista de execuções da API do GitHub (ou o objeto com `workflow_runs`), ignorando itens malformados.
  - `rodadaDoTitulo(titulo)` — "Atualizar índices · 47 10 * * 1-5" → "10h47"; "… · manual" → "manual"; outro → null.
  - `horarioAgendado(rodada, criadaEm)` — o horário agendado (ISO com "-03:00") da ocorrência mais recente da rodada, em dia de segunda a sexta, igual ou anterior à criação: a 22h47 criada às 00h30 de sábado em Brasília é a de sexta.
  - `ARGUMENTOS_DO_GIT_LOG`, `interface AtualizacaoRegistrada { em; rodada; linhas }` e `lerAtualizacoes(textoDoGitLog)` — os commits da rotina em `dados/indices` ("indices: séries do BCB em … (rodada …)"), com as linhas do corpo, sem a linha "Execução: …".
  - `montarRelatorio(mes, execucoes, atualizacoes): string` — o relatório em Markdown: dias úteis do mês (feriados não descontados, e o texto diz isso); por rodada, execuções previstas, realizadas, com sucesso, com falha e canceladas pela fila, com o atraso de início (mediana e máximo, em minutos); execuções manuais; dias úteis sem nenhuma execução agendada bem-sucedida (o que o alarme do Healthchecks acusa); atualizações gravadas, com as revisões ("Atenção") à parte; estimativas de minutos de execução e de publicações do site; e as duas referências ("Nenhum dia útil sem rodada bem-sucedida" e "Atraso típico de início até 1 hora"), com a nota de que ajustes de horário ou de agendador só se fazem com o responsável. Cada execução conta no mês e no dia do seu horário agendado, mesmo criada depois da meia-noite; reexecução não conta como execução nova.
  - O script `scripts/relatorio-indices.ts <AAAA-MM> <arquivo de execuções>` roda o `git log`, grava `docs/monitoramento/<AAAA-MM>.md` e imprime o caminho; mês inválido, arquivo ilegível ou falta de repositório git dão mensagem simples, sem "Error:", e código 1. `APURA_RAIZ` troca a raiz do repositório, só para os testes.
  - O workflow "Relatório da rotina de índices" roda no dia 2 de cada mês às 12h17 de Brasília e pelo botão "Run workflow" (com um mês já encerrado, opcional); lê as execuções pela API do GitHub (`gh api`, com o token padrão), roda o script e grava o relatório na `main` (só a partir dela, com até três tentativas de envio) com o commit "[CF-Pages-Skip] monitoramento: relatório da rotina de índices de AAAA-MM", que não republica o site. Mês corrente ou futuro é recusado.

Decisão de 12/10/2026 (monitoramento gratuito, com o próprio repositório como registro histórico). Os testes do script ficam em `scripts/` (verificados pelo `tsconfig.node.json`, que traz os tipos do Node), para que o código do navegador em `src/` continue sem eles; criam um repositório git temporário e nunca gravam no repositório real. A lista de execuções de teste é sintética, com o formato da API do GitHub e um repositório fictício.

- [ ] **Step 1: Escrever os testes**

Em `vite.config.ts`, troque

```ts
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
```

por

```ts
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.ts"],
```

Crie `src/indices/testes/execucoes-rotina.json` (execuções sintéticas de set a nov/2026, uma por linha; a pasta é ignorada pelo Prettier):

```json
[
  {"id":9100067000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 10 * * 1-5","run_number":67,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100067000","created_at":"2026-11-02T13:59:00Z","updated_at":"2026-11-02T14:00:10Z","run_attempt":1,"run_started_at":"2026-11-02T13:59:00Z"},
  {"id":9100066000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 22 * * 1-5","run_number":66,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100066000","created_at":"2026-10-31T03:22:00Z","updated_at":"2026-10-31T03:23:10Z","run_attempt":1,"run_started_at":"2026-10-31T03:22:00Z"},
  {"id":9100065000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 17 14 * * 1-5","run_number":65,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100065000","created_at":"2026-10-30T17:25:00Z","updated_at":"2026-10-30T17:26:10Z","run_attempt":1,"run_started_at":"2026-10-30T17:25:00Z"},
  {"id":9100064000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 10 * * 1-5","run_number":64,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100064000","created_at":"2026-10-30T13:59:00Z","updated_at":"2026-10-30T14:00:10Z","run_attempt":1,"run_started_at":"2026-10-30T13:59:00Z"},
  {"id":9100063000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 22 * * 1-5","run_number":63,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100063000","created_at":"2026-10-30T02:37:00Z","updated_at":"2026-10-30T02:38:10Z","run_attempt":1,"run_started_at":"2026-10-30T02:37:00Z"},
  {"id":9100062000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 17 14 * * 1-5","run_number":62,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100062000","created_at":"2026-10-29T17:25:00Z","updated_at":"2026-10-29T17:26:10Z","run_attempt":1,"run_started_at":"2026-10-29T17:25:00Z"},
  {"id":9100061000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 10 * * 1-5","run_number":61,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100061000","created_at":"2026-10-29T13:59:00Z","updated_at":"2026-10-29T14:00:10Z","run_attempt":1,"run_started_at":"2026-10-29T13:59:00Z"},
  {"id":9100060000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 22 * * 1-5","run_number":60,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100060000","created_at":"2026-10-29T02:37:00Z","updated_at":"2026-10-29T02:38:10Z","run_attempt":1,"run_started_at":"2026-10-29T02:37:00Z"},
  {"id":9100059000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 17 14 * * 1-5","run_number":59,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100059000","created_at":"2026-10-28T17:25:00Z","updated_at":"2026-10-28T17:26:10Z","run_attempt":1,"run_started_at":"2026-10-28T17:25:00Z"},
  {"id":9100058000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 10 * * 1-5","run_number":58,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100058000","created_at":"2026-10-28T13:59:00Z","updated_at":"2026-10-28T14:00:10Z","run_attempt":1,"run_started_at":"2026-10-28T13:59:00Z"},
  {"id":9100057000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 22 * * 1-5","run_number":57,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100057000","created_at":"2026-10-28T02:37:00Z","updated_at":"2026-10-28T02:38:10Z","run_attempt":1,"run_started_at":"2026-10-28T02:37:00Z"},
  {"id":9100056000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 17 14 * * 1-5","run_number":56,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100056000","created_at":"2026-10-27T17:25:00Z","updated_at":"2026-10-27T17:26:10Z","run_attempt":1,"run_started_at":"2026-10-27T17:25:00Z"},
  {"id":9100055000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 10 * * 1-5","run_number":55,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100055000","created_at":"2026-10-27T13:59:00Z","updated_at":"2026-10-27T14:00:10Z","run_attempt":1,"run_started_at":"2026-10-27T13:59:00Z"},
  {"id":9100054000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 22 * * 1-5","run_number":54,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100054000","created_at":"2026-10-27T02:37:00Z","updated_at":"2026-10-27T02:38:10Z","run_attempt":1,"run_started_at":"2026-10-27T02:37:00Z"},
  {"id":9100053000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 17 14 * * 1-5","run_number":53,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100053000","created_at":"2026-10-26T17:25:00Z","updated_at":"2026-10-26T17:26:10Z","run_attempt":1,"run_started_at":"2026-10-26T17:25:00Z"},
  {"id":9100052000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 10 * * 1-5","run_number":52,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100052000","created_at":"2026-10-26T13:59:00Z","updated_at":"2026-10-26T14:00:10Z","run_attempt":1,"run_started_at":"2026-10-26T13:59:00Z"},
  {"id":9100051000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 22 * * 1-5","run_number":51,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100051000","created_at":"2026-10-24T02:37:00Z","updated_at":"2026-10-24T02:38:10Z","run_attempt":1,"run_started_at":"2026-10-24T02:37:00Z"},
  {"id":9100050000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 17 14 * * 1-5","run_number":50,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100050000","created_at":"2026-10-23T17:25:00Z","updated_at":"2026-10-23T17:26:10Z","run_attempt":1,"run_started_at":"2026-10-23T17:25:00Z"},
  {"id":9100049000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 10 * * 1-5","run_number":49,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100049000","created_at":"2026-10-23T13:59:00Z","updated_at":"2026-10-23T14:00:10Z","run_attempt":1,"run_started_at":"2026-10-23T13:59:00Z"},
  {"id":9100048000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 22 * * 1-5","run_number":48,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100048000","created_at":"2026-10-23T02:37:00Z","updated_at":"2026-10-23T02:38:10Z","run_attempt":1,"run_started_at":"2026-10-23T02:37:00Z"},
  {"id":9100047000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 17 14 * * 1-5","run_number":47,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100047000","created_at":"2026-10-22T17:25:00Z","updated_at":"2026-10-22T17:26:10Z","run_attempt":1,"run_started_at":"2026-10-22T17:25:00Z"},
  {"id":9100046000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 10 * * 1-5","run_number":46,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100046000","created_at":"2026-10-22T13:59:00Z","updated_at":"2026-10-22T14:00:10Z","run_attempt":1,"run_started_at":"2026-10-22T13:59:00Z"},
  {"id":9100045000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 22 * * 1-5","run_number":45,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100045000","created_at":"2026-10-22T02:37:00Z","updated_at":"2026-10-22T02:38:10Z","run_attempt":1,"run_started_at":"2026-10-22T02:37:00Z"},
  {"id":9100044000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 17 14 * * 1-5","run_number":44,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100044000","created_at":"2026-10-21T17:25:00Z","updated_at":"2026-10-21T17:26:10Z","run_attempt":1,"run_started_at":"2026-10-21T17:25:00Z"},
  {"id":9100043000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 10 * * 1-5","run_number":43,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100043000","created_at":"2026-10-21T13:59:00Z","updated_at":"2026-10-21T14:00:10Z","run_attempt":1,"run_started_at":"2026-10-21T13:59:00Z"},
  {"id":9100042000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 10 * * 1-5","run_number":42,"event":"schedule","status":"completed","conclusion":"cancelled","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100042000","created_at":"2026-10-20T14:27:00Z","updated_at":"2026-10-20T14:27:30Z","run_attempt":1,"run_started_at":"2026-10-20T14:27:00Z"},
  {"id":9100041000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 22 * * 1-5","run_number":41,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100041000","created_at":"2026-10-20T02:37:00Z","updated_at":"2026-10-20T02:38:10Z","run_attempt":1,"run_started_at":"2026-10-20T02:37:00Z"},
  {"id":9100040000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 17 14 * * 1-5","run_number":40,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100040000","created_at":"2026-10-19T17:25:00Z","updated_at":"2026-10-19T17:26:10Z","run_attempt":1,"run_started_at":"2026-10-19T17:25:00Z"},
  {"id":9100039000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 10 * * 1-5","run_number":39,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100039000","created_at":"2026-10-19T13:59:00Z","updated_at":"2026-10-19T14:00:10Z","run_attempt":1,"run_started_at":"2026-10-19T13:59:00Z"},
  {"id":9100038000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 22 * * 1-5","run_number":38,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100038000","created_at":"2026-10-17T02:37:00Z","updated_at":"2026-10-17T02:38:10Z","run_attempt":1,"run_started_at":"2026-10-17T02:37:00Z"},
  {"id":9100037000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 17 14 * * 1-5","run_number":37,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100037000","created_at":"2026-10-16T17:25:00Z","updated_at":"2026-10-16T17:26:10Z","run_attempt":1,"run_started_at":"2026-10-16T17:25:00Z"},
  {"id":9100036000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 10 * * 1-5","run_number":36,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100036000","created_at":"2026-10-16T13:59:00Z","updated_at":"2026-10-16T14:00:10Z","run_attempt":1,"run_started_at":"2026-10-16T13:59:00Z"},
  {"id":9100035000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 22 * * 1-5","run_number":35,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100035000","created_at":"2026-10-16T02:17:00Z","updated_at":"2026-10-16T02:18:10Z","run_attempt":1,"run_started_at":"2026-10-16T02:17:00Z"},
  {"id":9100034000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 17 14 * * 1-5","run_number":34,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100034000","created_at":"2026-10-15T17:25:00Z","updated_at":"2026-10-15T17:26:10Z","run_attempt":1,"run_started_at":"2026-10-15T17:25:00Z"},
  {"id":9100033000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 10 * * 1-5","run_number":33,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100033000","created_at":"2026-10-15T13:59:00Z","updated_at":"2026-10-15T14:00:10Z","run_attempt":1,"run_started_at":"2026-10-15T13:59:00Z"},
  {"id":9100032000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 22 * * 1-5","run_number":32,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100032000","created_at":"2026-10-15T02:17:00Z","updated_at":"2026-10-15T02:18:10Z","run_attempt":1,"run_started_at":"2026-10-15T02:17:00Z"},
  {"id":9100031000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · manual","run_number":31,"event":"workflow_dispatch","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100031000","created_at":"2026-10-14T15:05:00Z","updated_at":"2026-10-14T15:06:35Z","run_attempt":1,"run_started_at":"2026-10-14T15:05:00Z"},
  {"id":9100030000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 17 14 * * 1-5","run_number":30,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100030000","created_at":"2026-10-14T17:25:00Z","updated_at":"2026-10-14T17:26:10Z","run_attempt":1,"run_started_at":"2026-10-14T17:25:00Z"},
  {"id":9100029000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 10 * * 1-5","run_number":29,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100029000","created_at":"2026-10-14T13:59:00Z","updated_at":"2026-10-14T14:00:10Z","run_attempt":1,"run_started_at":"2026-10-14T13:59:00Z"},
  {"id":9100028000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 17 14 * * 1-5","run_number":28,"event":"schedule","status":"completed","conclusion":"failure","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100028000","created_at":"2026-10-13T17:42:00Z","updated_at":"2026-10-13T17:45:05Z","run_attempt":1,"run_started_at":"2026-10-13T17:42:00Z"},
  {"id":9100027000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 22 * * 1-5","run_number":27,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100027000","created_at":"2026-10-13T02:17:00Z","updated_at":"2026-10-13T02:18:10Z","run_attempt":1,"run_started_at":"2026-10-13T02:17:00Z"},
  {"id":9100026000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 17 14 * * 1-5","run_number":26,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100026000","created_at":"2026-10-12T17:25:00Z","updated_at":"2026-10-12T17:26:10Z","run_attempt":1,"run_started_at":"2026-10-12T17:25:00Z"},
  {"id":9100025000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 10 * * 1-5","run_number":25,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100025000","created_at":"2026-10-12T13:59:00Z","updated_at":"2026-10-12T14:00:10Z","run_attempt":1,"run_started_at":"2026-10-12T13:59:00Z"},
  {"id":9100024000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 22 * * 1-5","run_number":24,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100024000","created_at":"2026-10-10T02:17:00Z","updated_at":"2026-10-10T12:01:10Z","run_attempt":2,"run_started_at":"2026-10-10T12:00:00Z"},
  {"id":9100023000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 17 14 * * 1-5","run_number":23,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100023000","created_at":"2026-10-09T17:25:00Z","updated_at":"2026-10-09T17:26:10Z","run_attempt":1,"run_started_at":"2026-10-09T17:25:00Z"},
  {"id":9100022000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 10 * * 1-5","run_number":22,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100022000","created_at":"2026-10-09T13:59:00Z","updated_at":"2026-10-09T14:00:10Z","run_attempt":1,"run_started_at":"2026-10-09T13:59:00Z"},
  {"id":9100021000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 22 * * 1-5","run_number":21,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100021000","created_at":"2026-10-09T02:17:00Z","updated_at":"2026-10-09T02:18:10Z","run_attempt":1,"run_started_at":"2026-10-09T02:17:00Z"},
  {"id":9100020000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 17 14 * * 1-5","run_number":20,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100020000","created_at":"2026-10-08T17:25:00Z","updated_at":"2026-10-08T17:26:10Z","run_attempt":1,"run_started_at":"2026-10-08T17:25:00Z"},
  {"id":9100019000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 10 * * 1-5","run_number":19,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100019000","created_at":"2026-10-08T13:59:00Z","updated_at":"2026-10-08T14:00:10Z","run_attempt":1,"run_started_at":"2026-10-08T13:59:00Z"},
  {"id":9100018000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 22 * * 1-5","run_number":18,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100018000","created_at":"2026-10-08T02:17:00Z","updated_at":"2026-10-08T02:18:10Z","run_attempt":1,"run_started_at":"2026-10-08T02:17:00Z"},
  {"id":9100017000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 17 14 * * 1-5","run_number":17,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100017000","created_at":"2026-10-07T17:25:00Z","updated_at":"2026-10-07T17:26:10Z","run_attempt":1,"run_started_at":"2026-10-07T17:25:00Z"},
  {"id":9100016000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 10 * * 1-5","run_number":16,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100016000","created_at":"2026-10-07T13:59:00Z","updated_at":"2026-10-07T14:00:10Z","run_attempt":1,"run_started_at":"2026-10-07T13:59:00Z"},
  {"id":9100015000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 22 * * 1-5","run_number":15,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100015000","created_at":"2026-10-07T02:17:00Z","updated_at":"2026-10-07T02:18:10Z","run_attempt":1,"run_started_at":"2026-10-07T02:17:00Z"},
  {"id":9100014000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 17 14 * * 1-5","run_number":14,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100014000","created_at":"2026-10-06T17:25:00Z","updated_at":"2026-10-06T17:26:10Z","run_attempt":1,"run_started_at":"2026-10-06T17:25:00Z"},
  {"id":9100013000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 10 * * 1-5","run_number":13,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100013000","created_at":"2026-10-06T13:59:00Z","updated_at":"2026-10-06T14:00:10Z","run_attempt":1,"run_started_at":"2026-10-06T13:59:00Z"},
  {"id":9100012000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 22 * * 1-5","run_number":12,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100012000","created_at":"2026-10-06T02:17:00Z","updated_at":"2026-10-06T02:18:10Z","run_attempt":1,"run_started_at":"2026-10-06T02:17:00Z"},
  {"id":9100011000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 17 14 * * 1-5","run_number":11,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100011000","created_at":"2026-10-05T17:25:00Z","updated_at":"2026-10-05T17:26:10Z","run_attempt":1,"run_started_at":"2026-10-05T17:25:00Z"},
  {"id":9100010000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 10 * * 1-5","run_number":10,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100010000","created_at":"2026-10-05T13:59:00Z","updated_at":"2026-10-05T14:00:10Z","run_attempt":1,"run_started_at":"2026-10-05T13:59:00Z"},
  {"id":9100009000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 22 * * 1-5","run_number":9,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100009000","created_at":"2026-10-03T02:17:00Z","updated_at":"2026-10-03T02:18:10Z","run_attempt":1,"run_started_at":"2026-10-03T02:17:00Z"},
  {"id":9100008000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 17 14 * * 1-5","run_number":8,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100008000","created_at":"2026-10-02T17:25:00Z","updated_at":"2026-10-02T17:26:10Z","run_attempt":1,"run_started_at":"2026-10-02T17:25:00Z"},
  {"id":9100007000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 10 * * 1-5","run_number":7,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100007000","created_at":"2026-10-02T13:59:00Z","updated_at":"2026-10-02T14:00:10Z","run_attempt":1,"run_started_at":"2026-10-02T13:59:00Z"},
  {"id":9100006000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 22 * * 1-5","run_number":6,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100006000","created_at":"2026-10-02T02:17:00Z","updated_at":"2026-10-02T02:18:10Z","run_attempt":1,"run_started_at":"2026-10-02T02:17:00Z"},
  {"id":9100005000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 17 14 * * 1-5","run_number":5,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100005000","created_at":"2026-10-01T17:25:00Z","updated_at":"2026-10-01T17:26:10Z","run_attempt":1,"run_started_at":"2026-10-01T17:25:00Z"},
  {"id":9100004000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 10 * * 1-5","run_number":4,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100004000","created_at":"2026-10-01T13:59:00Z","updated_at":"2026-10-01T14:00:10Z","run_attempt":1,"run_started_at":"2026-10-01T13:59:00Z"},
  {"id":9100003000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices do BCB","run_number":3,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100003000","created_at":"2026-10-01T12:00:00Z","updated_at":"2026-10-01T12:01:10Z","run_attempt":1,"run_started_at":"2026-10-01T12:00:00Z"},
  {"id":9100002000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · 47 22 * * 1-5","run_number":2,"event":"schedule","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100002000","created_at":"2026-10-01T03:30:00Z","updated_at":"2026-10-01T03:31:10Z","run_attempt":1,"run_started_at":"2026-10-01T03:30:00Z"},
  {"id":9100001000,"name":"Atualizar índices do BCB","display_title":"Atualizar índices · manual","run_number":1,"event":"workflow_dispatch","status":"completed","conclusion":"success","workflow_id":123456789,"html_url":"https://github.com/exemplo/apura/actions/runs/9100001000","created_at":"2026-10-01T02:00:00Z","updated_at":"2026-10-01T02:01:35Z","run_attempt":1,"run_started_at":"2026-10-01T02:00:00Z"}
]
```

Crie `src/indices/relatorio.test.ts` (33 testes):

```ts
import { describe, expect, it } from "vitest";
import { diaSeguinte } from "../compartilhado/datas.ts";
import {
  RODADAS,
  horarioAgendado,
  lerAtualizacoes,
  lerExecucoes,
  montarRelatorio,
  rodadaDoTitulo,
} from "./relatorio.ts";
import type { AtualizacaoRegistrada, ExecucaoDaRotina, Rodada } from "./relatorio.ts";
import textoDasExecucoes from "./testes/execucoes-rotina.json?raw";

/**
 * A fixture sintética `testes/execucoes-rotina.json` tem o formato da API do GitHub (lista de
 * workflow_run, da mais recente para a mais antiga) e descreve out/2026 (22 dias úteis):
 * - 10h47: todos os dias úteis criada 12 min depois, menos 13/10 (sem execução) e 20/10
 *   (cancelada pela fila, 40 min depois);
 * - 14h17: 8 min depois, menos 13/10 (falha, 25 min depois) e 20/10 (sem execução);
 * - 22h47: sem execução em 13/10 e 20/10; dos 20 dias restantes, os 10 primeiros com 30 min, os 9
 *   seguintes com 50 min e 30/10 com 95 min (criada às 00h22 de sábado, 31/10); a de 09/10 é uma
 *   reexecução (tentativa 2, reiniciada em 10/10);
 * - uma manual em 14/10 às 12h05; fora do mês: 22h47 de 30/09 criada às 00h30 de 01/10 em Brasília
 *   (conta em setembro, 103 min de atraso), manual às 23h de 30/09 (02h de 01/10 UTC) e 10h47 de
 *   02/11; uma com o título antigo, sem rodada.
 * Duração (início → última atualização): sucesso 70 s, falha 185 s, cancelada 30 s, manual 95 s.
 */
const execucoesDaFixture = (): unknown => JSON.parse(textoDasExecucoes) as unknown;

const SEPARADOR_DE_CAMPO = "\x1f";
const SEPARADOR_DE_REGISTRO = "\x1e";

/** Um registro como `git log --format=%cI%x1f%s%x1f%b%x1e` o escreve (com a quebra de linha final). */
function registroDoGitLog(em: string, titulo: string, corpo: string): string {
  return `${em}${SEPARADOR_DE_CAMPO}${titulo}${SEPARADOR_DE_CAMPO}${corpo}${SEPARADOR_DE_REGISTRO}\n`;
}

/** Git log sintético, do mais recente para o mais antigo: três commits da rotina (um sem rodada) e um alheio. */
const GIT_LOG = [
  registroDoGitLog(
    "2026-10-09T14:27:40-03:00",
    "indices: séries do BCB em 09/10/2026 14:27 (rodada 14h17)",
    [
      "433 (IPCA): 562 meses, último 2026-09 = 0.48",
      "188 (INPC): sem mudança; 561 meses, último 2026-08 = 0.20",
      "Atenção: na série 433 mudou 1 valor já publicado: 2026-08 de 0.80 para 0.82.",
      "",
      "Execução: https://github.com/exemplo/apura/actions/runs/9100026000",
      "",
    ].join("\n"),
  ),
  registroDoGitLog("2026-10-06T09:00:00-03:00", "docs: ajuste no roteiro", "Corpo qualquer.\n"),
  registroDoGitLog(
    "2026-10-05T11:01:15-03:00",
    "indices: séries do BCB em 05/10/2026 11:01 (rodada 10h47)",
    [
      "4390 (SELIC): 489 meses, último 2026-10 = 0.10",
      "SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.05 para 0.10.",
      "Ainda não disponível no BCB: IPCA de set/2026 (divulgação prevista por volta de 10/10/2026).",
      "",
      "Execução: https://github.com/exemplo/apura/actions/runs/9100010000",
      "",
    ].join("\n"),
  ),
  registroDoGitLog("2026-09-12T09:01:00-03:00", "indices: séries do BCB em 12/09/2026", ""),
].join("");

let proximoId = 1;

/** Execução montada à mão (por padrão, manual, bem-sucedida e sem horários de início e fim). */
function execucao(campos: Partial<ExecucaoDaRotina> & { criadaEm: string }): ExecucaoDaRotina {
  proximoId += 1;
  return {
    id: proximoId,
    titulo: "Atualizar índices · manual",
    evento: "workflow_dispatch",
    conclusao: "success",
    iniciadaEm: null,
    atualizadaEm: null,
    tentativa: 1,
    ...campos,
  };
}

function doisDigitos(valor: number): string {
  return String(valor).padStart(2, "0");
}

/** Execução agendada da rodada no dia, criada `atrasoS` segundos depois do horário de Brasília. */
function agendada(
  rodada: Rodada,
  data: string,
  atrasoS: number,
  campos: Partial<ExecucaoDaRotina> = {},
): ExecucaoDaRotina {
  const { hora, minuto, cron } = RODADAS[rodada];
  let segundos = hora * 3600 + minuto * 60 + atrasoS;
  let dia = data;
  while (segundos >= 86400) {
    segundos -= 86400;
    dia = diaSeguinte(dia);
  }
  const criadaEm = `${dia}T${doisDigitos(Math.floor(segundos / 3600))}:${doisDigitos(Math.floor(segundos / 60) % 60)}:${doisDigitos(segundos % 60)}-03:00`;
  return execucao({
    titulo: `Atualizar índices · ${cron}`,
    evento: "schedule",
    criadaEm,
    ...campos,
  });
}

/** Os 20 dias úteis de fev/2027 (1º de fevereiro de 2027 é segunda-feira). */
const DIAS_UTEIS_FEV_2027 = [
  1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26,
].map((dia) => `2027-02-${doisDigitos(dia)}`);

/** As três rodadas em todos os dias úteis de fev/2027, bem-sucedidas, criadas `atrasoS` depois. */
function fevereiroCompleto(atrasoS: number): ExecucaoDaRotina[] {
  return DIAS_UTEIS_FEV_2027.flatMap((dia) =>
    (["10h47", "14h17", "22h47"] as const).map((rodada) => agendada(rodada, dia, atrasoS)),
  );
}

describe("RODADAS", () => {
  it("traz o horário e a linha de cron de cada rodada, de segunda a sexta", () => {
    expect(RODADAS).toEqual({
      "10h47": { hora: 10, minuto: 47, cron: "47 10 * * 1-5" },
      "14h17": { hora: 14, minuto: 17, cron: "17 14 * * 1-5" },
      "22h47": { hora: 22, minuto: 47, cron: "47 22 * * 1-5" },
    });
  });
});

describe("lerExecucoes", () => {
  it("lê a lista de workflow_run da API do GitHub, com os campos traduzidos", () => {
    const execucoes = lerExecucoes(execucoesDaFixture());
    expect(execucoes).toHaveLength(67);
    expect(execucoes[0]).toEqual({
      id: 9100067000,
      titulo: "Atualizar índices · 47 10 * * 1-5",
      evento: "schedule",
      conclusao: "success",
      criadaEm: "2026-11-02T13:59:00Z",
      iniciadaEm: "2026-11-02T13:59:00Z",
      atualizadaEm: "2026-11-02T14:00:10Z",
      tentativa: 1,
    });
    expect(execucoes.find((e) => e.tentativa === 2)).toEqual({
      id: 9100024000,
      titulo: "Atualizar índices · 47 22 * * 1-5",
      evento: "schedule",
      conclusao: "success",
      criadaEm: "2026-10-10T02:17:00Z",
      iniciadaEm: "2026-10-10T12:00:00Z",
      atualizadaEm: "2026-10-10T12:01:10Z",
      tentativa: 2,
    });
  });

  it("aceita também o objeto da API, com a lista em workflow_runs", () => {
    const lista = execucoesDaFixture();
    expect(lerExecucoes({ total_count: 67, workflow_runs: lista })).toEqual(lerExecucoes(lista));
  });

  it("devolve lista vazia para o que não é lista nem objeto com workflow_runs", () => {
    for (const dado of [null, undefined, 42, "texto", {}, { workflow_runs: "x" }, { runs: [] }]) {
      expect(lerExecucoes(dado)).toEqual([]);
    }
  });

  it("aceita conclusão e horários nulos ou ausentes, e tentativa ausente como 1", () => {
    expect(
      lerExecucoes([
        {
          id: 7,
          display_title: "Atualizar índices · manual",
          event: "workflow_dispatch",
          conclusion: null,
          created_at: "2026-10-14T12:05:00-03:00",
          run_started_at: null,
          updated_at: null,
          run_attempt: 3,
        },
        {
          id: 8,
          display_title: "Atualizar índices · manual",
          event: "workflow_dispatch",
          created_at: "2026-10-14T15:05:00.250Z",
        },
      ]),
    ).toEqual([
      {
        id: 7,
        titulo: "Atualizar índices · manual",
        evento: "workflow_dispatch",
        conclusao: null,
        criadaEm: "2026-10-14T12:05:00-03:00",
        iniciadaEm: null,
        atualizadaEm: null,
        tentativa: 3,
      },
      {
        id: 8,
        titulo: "Atualizar índices · manual",
        evento: "workflow_dispatch",
        conclusao: null,
        criadaEm: "2026-10-14T15:05:00.250Z",
        iniciadaEm: null,
        atualizadaEm: null,
        tentativa: 1,
      },
    ]);
  });

  it("ignora os itens malformados e mantém os bons, na ordem", () => {
    const bom = {
      id: 1,
      display_title: "Atualizar índices · 47 10 * * 1-5",
      event: "schedule",
      conclusion: "success",
      created_at: "2026-10-14T13:59:00Z",
      run_started_at: "2026-10-14T13:59:00Z",
      updated_at: "2026-10-14T14:00:10Z",
      run_attempt: 1,
    };
    const malformados: unknown[] = [
      null,
      42,
      "execução",
      [bom],
      {},
      { ...bom, id: undefined },
      { ...bom, id: "1" },
      { ...bom, id: 1.5 },
      { ...bom, id: 0 },
      { ...bom, display_title: undefined },
      { ...bom, display_title: 5 },
      { ...bom, event: undefined },
      { ...bom, conclusion: 7 },
      { ...bom, created_at: undefined },
      { ...bom, created_at: "ontem" },
      { ...bom, created_at: "2026-10-14T13:59:00" },
      { ...bom, created_at: "2026-02-30T13:59:00Z" },
      { ...bom, run_started_at: "logo" },
      { ...bom, updated_at: 5 },
      { ...bom, run_attempt: 0 },
      { ...bom, run_attempt: "2" },
      { ...bom, run_attempt: 1.5 },
    ];
    const lidas = lerExecucoes([...malformados, bom, { ...bom, id: 2 }]);
    expect(lidas.map((e) => e.id)).toEqual([1, 2]);
  });
});

describe("rodadaDoTitulo", () => {
  it("reconhece as três rodadas pelo cron do título", () => {
    expect(rodadaDoTitulo("Atualizar índices · 47 10 * * 1-5")).toBe("10h47");
    expect(rodadaDoTitulo("Atualizar índices · 17 14 * * 1-5")).toBe("14h17");
    expect(rodadaDoTitulo("Atualizar índices · 47 22 * * 1-5")).toBe("22h47");
  });

  it("reconhece a execução manual", () => {
    expect(rodadaDoTitulo("Atualizar índices · manual")).toBe("manual");
  });

  it("tolera espaços a mais em volta do cron e entre os seus campos", () => {
    expect(rodadaDoTitulo("Atualizar índices ·  47 10  * * 1-5 ")).toBe("10h47");
    expect(rodadaDoTitulo("Atualizar índices ·  manual ")).toBe("manual");
  });

  it("devolve null para qualquer outro título", () => {
    for (const titulo of [
      "",
      "Atualizar índices do BCB",
      "Atualizar índices · ",
      "Atualizar índices · 0 12 12 * *",
      "Atualizar índices · 47 10 * * *",
      "Atualizar índices · Manual",
      "Relatório da rotina de índices",
      "47 10 * * 1-5",
    ]) {
      expect(rodadaDoTitulo(titulo)).toBeNull();
    }
  });
});

describe("horarioAgendado", () => {
  it("no mesmo dia, quando a execução foi criada depois do horário", () => {
    expect(horarioAgendado("10h47", "2026-10-14T13:59:00Z")).toBe("2026-10-14T10:47:00-03:00");
    expect(horarioAgendado("10h47", "2026-10-14T13:59:00+00:00")).toBe("2026-10-14T10:47:00-03:00");
    expect(horarioAgendado("14h17", "2026-10-14T14:25:00-03:00")).toBe("2026-10-14T14:17:00-03:00");
  });

  it("no próprio minuto agendado conta o mesmo dia; um segundo antes, o dia útil anterior", () => {
    expect(horarioAgendado("10h47", "2026-10-14T13:47:00Z")).toBe("2026-10-14T10:47:00-03:00");
    expect(horarioAgendado("10h47", "2026-10-14T13:46:59Z")).toBe("2026-10-13T10:47:00-03:00");
  });

  it("depois da meia-noite, volta ao dia anterior", () => {
    expect(horarioAgendado("22h47", "2026-10-15T03:10:00Z")).toBe("2026-10-14T22:47:00-03:00");
  });

  it("de sexta para sábado, fica na sexta", () => {
    expect(horarioAgendado("22h47", "2026-10-17T03:30:00Z")).toBe("2026-10-16T22:47:00-03:00");
  });

  it("na segunda cedo, e no fim de semana, volta à sexta", () => {
    expect(horarioAgendado("10h47", "2026-10-19T12:00:00Z")).toBe("2026-10-16T10:47:00-03:00");
    expect(horarioAgendado("22h47", "2026-10-19T05:00:00Z")).toBe("2026-10-16T22:47:00-03:00");
    expect(horarioAgendado("14h17", "2026-10-18T18:00:00Z")).toBe("2026-10-16T14:17:00-03:00");
    expect(horarioAgendado("14h17", "2026-10-17T18:00:00Z")).toBe("2026-10-16T14:17:00-03:00");
  });

  it("atravessa a virada do mês pelo horário de Brasília, não pelo UTC", () => {
    expect(horarioAgendado("22h47", "2026-10-01T02:17:00Z")).toBe("2026-09-30T22:47:00-03:00");
    expect(horarioAgendado("22h47", "2026-10-01T03:30:00Z")).toBe("2026-09-30T22:47:00-03:00");
    expect(horarioAgendado("22h47", "2026-10-31T03:22:00Z")).toBe("2026-10-30T22:47:00-03:00");
  });

  it("recusa, com frase completa, o que não é data-hora ISO com fuso", () => {
    expect(() => horarioAgendado("10h47", "2026-10-14 13:59")).toThrow(
      "A data-hora 2026-10-14 13:59 não é ISO com fuso; não há como achar o horário agendado.",
    );
  });
});

describe("lerAtualizacoes", () => {
  it("pega só os commits da rotina, com a rodada e as linhas do corpo", () => {
    expect(lerAtualizacoes(GIT_LOG)).toEqual<AtualizacaoRegistrada[]>([
      {
        em: "2026-10-09T14:27:40-03:00",
        rodada: "14h17",
        linhas: [
          "433 (IPCA): 562 meses, último 2026-09 = 0.48",
          "188 (INPC): sem mudança; 561 meses, último 2026-08 = 0.20",
          "Atenção: na série 433 mudou 1 valor já publicado: 2026-08 de 0.80 para 0.82.",
        ],
      },
      {
        em: "2026-10-05T11:01:15-03:00",
        rodada: "10h47",
        linhas: [
          "4390 (SELIC): 489 meses, último 2026-10 = 0.10",
          "SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.05 para 0.10.",
          "Ainda não disponível no BCB: IPCA de set/2026 (divulgação prevista por volta de 10/10/2026).",
        ],
      },
      { em: "2026-09-12T09:01:00-03:00", rodada: "", linhas: [] },
    ]);
  });

  it("aceita quebras de linha do Windows e ignora registros incompletos ou com data inválida", () => {
    const texto = [
      registroDoGitLog(
        "2026-10-20T10:59:00-03:00",
        "indices: séries do BCB em 20/10/2026 10:59 (rodada manual)",
        "189 (IGP-M): 448 meses, último 2026-09 = 0.42\r\n\r\nExecução: https://exemplo/1\r\n",
      ),
      "2026-10-21T10:59:00-03:00\x1findices: séries do BCB em 21/10/2026\x1e\n",
      registroDoGitLog("ontem", "indices: séries do BCB em 22/10/2026 (rodada 10h47)", "x\n"),
    ].join("");
    expect(lerAtualizacoes(texto)).toEqual([
      {
        em: "2026-10-20T10:59:00-03:00",
        rodada: "manual",
        linhas: ["189 (IGP-M): 448 meses, último 2026-09 = 0.42"],
      },
    ]);
  });

  it("devolve lista vazia para um histórico vazio", () => {
    expect(lerAtualizacoes("")).toEqual([]);
    expect(lerAtualizacoes("\n")).toEqual([]);
  });
});

describe("montarRelatorio", () => {
  it("monta o relatório de out/2026 a partir das execuções e do git log", () => {
    const relatorio = montarRelatorio(
      "2026-10",
      lerExecucoes(execucoesDaFixture()),
      lerAtualizacoes(GIT_LOG),
    );
    expect(relatorio).toBe(
      [
        "# Monitoramento da rotina de índices · out/2026",
        "",
        'Execuções do workflow "Atualizar índices do BCB" no GitHub Actions e atualizações dos índices gravadas no repositório. Datas e horas no horário de Brasília; minutos inteiros.',
        "",
        "## Agenda do mês",
        "",
        "- Dias úteis: 22 (segunda a sexta-feira; os feriados não são descontados).",
        "- Rodadas agendadas em cada dia útil: 10h47, 14h17 e 22h47.",
        "",
        "## Execuções agendadas",
        "",
        "| Rodada | Previstas | Realizadas | Com sucesso | Com falha | Canceladas pela fila | Atraso de início (mediana) | Atraso de início (máximo) |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
        "| 10h47 | 22 | 21 | 20 | 0 | 1 | 12 min | 40 min |",
        "| 14h17 | 22 | 21 | 20 | 1 | 0 | 8 min | 25 min |",
        "| 22h47 | 22 | 20 | 20 | 0 | 0 | 40 min | 95 min |",
        "| Todas | 66 | 62 | 60 | 1 | 1 | 12 min | 95 min |",
        "",
        "- Cada execução conta no mês do seu horário agendado, mesmo quando o GitHub a cria depois da meia-noite.",
        "- O atraso de início vai do horário agendado até a criação da execução pelo GitHub.",
        "- Com falha: qualquer conclusão que não seja sucesso nem cancelamento pela fila.",
        "- Reexecuções (2ª tentativa em diante), que não contam como execução nova: 1.",
        "- Execuções sem rodada reconhecível no título, deixadas fora das contas: 1.",
        "",
        "## Execuções manuais",
        "",
        "Execuções manuais no mês: 1.",
        "",
        "- 14/10/2026 12:05 · sucesso",
        "",
        "## Dias úteis sem nenhuma execução bem-sucedida",
        "",
        "É, aproximadamente, o que o alarme de silêncio do Healthchecks acusa (uma falha só do deploy hook conta aqui como falha, mas não suprime o sinal).",
        "",
        "- 13/10/2026",
        "- 20/10/2026",
        "",
        "## Atualizações gravadas",
        "",
        "### 05/10/2026 11:01 · rodada 10h47",
        "",
        "- 4390 (SELIC): 489 meses, último 2026-10 = 0.10",
        "- SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.05 para 0.10.",
        "- Ainda não disponível no BCB: IPCA de set/2026 (divulgação prevista por volta de 10/10/2026).",
        "",
        "### 09/10/2026 14:27 · rodada 14h17",
        "",
        "- 433 (IPCA): 562 meses, último 2026-09 = 0.48",
        "",
        "## Revisões de valores já publicados",
        "",
        "- 09/10/2026 14:27 · rodada 14h17 · Atenção: na série 433 mudou 1 valor já publicado: 2026-08 de 0.80 para 0.82.",
        "",
        "## Estimativas",
        "",
        "- Minutos de execução no GitHub Actions: 127 (estimativa: em cada execução, os minutos iniciados entre o início e a última atualização; nas reexecuções, só a última tentativa).",
        "- Publicações do site: 2 (uma por atualização gravada).",
        "",
        "## Referências",
        "",
        "- Nenhum dia útil sem rodada bem-sucedida: não cumprida (2 dias).",
        "- Atraso típico de início até 1 hora: cumprida (mediana geral 12 min).",
        "",
        "Ajustes de horário ou de agendador só com o responsável.",
        "",
      ].join("\n"),
    );
  });

  it("conta pelo horário agendado na virada do mês e credita o dia agendado", () => {
    // A 22h47 de 30/09 foi criada às 00h30 de 01/10 em Brasília: conta em setembro, no dia 30/09.
    const setembro = montarRelatorio("2026-09", lerExecucoes(execucoesDaFixture()), []);
    expect(setembro).toContain("| 22h47 | 22 | 1 | 1 | 0 | 0 | 103 min | 103 min |\n");
    expect(setembro).toContain("| Todas | 66 | 1 | 1 | 0 | 0 | 103 min | 103 min |\n");
    expect(setembro).toContain("Execuções manuais no mês: 1.\n\n- 30/09/2026 23:00 · sucesso\n");
    expect(setembro).toContain("- 29/09/2026\n\n## Atualizações gravadas");
    expect(setembro).not.toContain("- 30/09/2026\n");
    // Sexta-feira: 10h47 com falha, 14h17 ausente e 22h47 bem-sucedida criada às 00h30 de sábado.
    const sexta = montarRelatorio(
      "2027-02",
      [
        agendada("10h47", "2027-02-26", 5 * 60, { conclusao: "failure" }),
        agendada("22h47", "2027-02-26", 103 * 60),
      ],
      [],
    );
    expect(sexta).toContain("| 22h47 | 20 | 1 | 1 | 0 | 0 | 103 min | 103 min |\n");
    expect(sexta).toContain("- 25/02/2027\n\n## Atualizações gravadas");
    expect(sexta).not.toContain("- 26/02/2027\n");
  });

  it("num mês sem execuções nem atualizações, diz isso em cada seção", () => {
    const relatorio = montarRelatorio("2026-11", [], []);
    expect(relatorio).toContain("# Monitoramento da rotina de índices · nov/2026\n");
    expect(relatorio).toContain("- Dias úteis: 21 (segunda a sexta-feira;");
    expect(relatorio).toContain("| 10h47 | 21 | 0 | 0 | 0 | 0 | — | — |\n");
    expect(relatorio).toContain("| Todas | 63 | 0 | 0 | 0 | 0 | — | — |\n");
    expect(relatorio).toContain(
      "- Reexecuções (2ª tentativa em diante), que não contam como execução nova: 0.\n",
    );
    expect(relatorio).not.toContain("sem rodada reconhecível");
    expect(relatorio).toContain("Execuções manuais no mês: 0.\n\n## Dias úteis");
    expect(relatorio).toContain("- 02/11/2026\n");
    expect(relatorio).toContain("- 30/11/2026\n");
    expect(relatorio).toContain(
      "## Atualizações gravadas\n\nNenhuma atualização gravada no mês.\n",
    );
    expect(relatorio).toContain(
      "## Revisões de valores já publicados\n\nNenhuma revisão de valor já publicado no mês.\n",
    );
    expect(relatorio).toContain("- Minutos de execução no GitHub Actions: 0 (estimativa:");
    expect(relatorio).toContain("- Publicações do site: 0 (uma por atualização gravada).");
    expect(relatorio).toContain(
      "- Nenhum dia útil sem rodada bem-sucedida: não cumprida (21 dias).",
    );
    expect(relatorio).toContain(
      "- Atraso típico de início até 1 hora: sem dados (nenhuma execução agendada no mês).",
    );
  });

  it("com todas as rodadas bem-sucedidas e pouco atraso, cumpre as duas referências", () => {
    const relatorio = montarRelatorio("2027-02", fevereiroCompleto(5 * 60), []);
    expect(relatorio).toContain("- Dias úteis: 20 (segunda a sexta-feira;");
    expect(relatorio).toContain("| 22h47 | 20 | 20 | 20 | 0 | 0 | 5 min | 5 min |\n");
    expect(relatorio).toContain("| Todas | 60 | 60 | 60 | 0 | 0 | 5 min | 5 min |\n");
    expect(relatorio).toContain(
      "## Dias úteis sem nenhuma execução bem-sucedida\n\nÉ, aproximadamente, o que o alarme de silêncio do Healthchecks acusa (uma falha só do deploy hook conta aqui como falha, mas não suprime o sinal).\n\nNenhum: todos os dias úteis tiveram ao menos uma execução agendada bem-sucedida.\n",
    );
    expect(relatorio).toContain("- Nenhum dia útil sem rodada bem-sucedida: cumprida (0 dias).");
    expect(relatorio).toContain(
      "- Atraso típico de início até 1 hora: cumprida (mediana geral 5 min).",
    );
  });

  it("um dia útil só com falha e cancelamento basta para não cumprir a referência", () => {
    const execucoes = fevereiroCompleto(5 * 60).map((e) =>
      e.criadaEm.startsWith("2027-02-17T10") ? { ...e, conclusao: "failure" } : e,
    );
    const semSucesso = execucoes
      .filter((e) => e.criadaEm.startsWith("2027-02-17T"))
      .map((e) => (e.conclusao === "success" ? { ...e, conclusao: "cancelled" } : e));
    const outras = execucoes.filter((e) => !e.criadaEm.startsWith("2027-02-17T"));
    const relatorio = montarRelatorio("2027-02", [...outras, ...semSucesso], []);
    expect(relatorio).toContain("| Todas | 60 | 60 | 57 | 1 | 2 | 5 min | 5 min |\n");
    expect(relatorio).toContain("suprime o sinal).\n\n- 17/02/2027\n\n## Atualizações gravadas");
    expect(relatorio).toContain("- Nenhum dia útil sem rodada bem-sucedida: não cumprida (1 dia).");
  });

  it("execução manual bem-sucedida não supre o dia útil sem rodada agendada bem-sucedida", () => {
    const execucoes = fevereiroCompleto(5 * 60).filter(
      (e) => !e.criadaEm.startsWith("2027-02-26T"),
    );
    const manual = execucao({ criadaEm: "2027-02-26T12:00:00-03:00", conclusao: "failure" });
    const outraManual = execucao({ criadaEm: "2027-02-26T15:00:00-03:00" });
    const relatorio = montarRelatorio("2027-02", [...execucoes, manual, outraManual], []);
    expect(relatorio).toContain(
      "Execuções manuais no mês: 2.\n\n- 26/02/2027 12:00 · falha\n- 26/02/2027 15:00 · sucesso\n",
    );
    expect(relatorio).toContain("suprime o sinal).\n\n- 26/02/2027\n\n");
  });

  it("arredonda a mediana e o máximo ao minuto mais próximo (meio minuto para cima)", () => {
    const relatorio = montarRelatorio(
      "2027-02",
      [
        agendada("10h47", "2027-02-01", 10 * 60),
        agendada("10h47", "2027-02-02", 15 * 60),
        agendada("14h17", "2027-02-01", 89),
        agendada("22h47", "2027-02-01", 150),
      ],
      [],
    );
    // 10h47: mediana de 10 e 15 min = 12,5 → 13; 14h17: 1 min 29 s → 1; 22h47: 2 min 30 s → 3.
    expect(relatorio).toContain("| 10h47 | 20 | 2 | 2 | 0 | 0 | 13 min | 15 min |\n");
    expect(relatorio).toContain("| 14h17 | 20 | 1 | 1 | 0 | 0 | 1 min | 1 min |\n");
    expect(relatorio).toContain("| 22h47 | 20 | 1 | 1 | 0 | 0 | 3 min | 3 min |\n");
    // Geral: 89 s, 150 s, 600 s, 900 s → (150 + 600) ÷ 2 = 375 s = 6 min 15 s → 6.
    expect(relatorio).toContain("| Todas | 60 | 4 | 4 | 0 | 0 | 6 min | 15 min |\n");
  });

  it("até 1 hora de mediana a referência é cumprida; de 61 minutos em diante, não", () => {
    const cumprida = montarRelatorio("2027-02", [agendada("10h47", "2027-02-01", 3600 + 29)], []);
    expect(cumprida).toContain(
      "- Atraso típico de início até 1 hora: cumprida (mediana geral 60 min).",
    );
    const naoCumprida = montarRelatorio(
      "2027-02",
      [agendada("10h47", "2027-02-01", 3600 + 30)],
      [],
    );
    expect(naoCumprida).toContain(
      "- Atraso típico de início até 1 hora: não cumprida (mediana geral 61 min).",
    );
  });

  it("conta uma reexecução uma vez só, pela tentativa mais recente, em qualquer ordem", () => {
    const primeira = agendada("14h17", "2027-02-03", 8 * 60, { id: 500, conclusao: "failure" });
    const segunda = { ...primeira, conclusao: "success", tentativa: 2 };
    for (const lista of [
      [primeira, segunda],
      [segunda, primeira],
    ]) {
      const relatorio = montarRelatorio("2027-02", lista, []);
      expect(relatorio).toContain("| 14h17 | 20 | 1 | 1 | 0 | 0 | 8 min | 8 min |\n");
      expect(relatorio).toContain(
        "- Reexecuções (2ª tentativa em diante), que não contam como execução nova: 1.\n",
      );
      expect(relatorio).not.toContain("- 03/02/2027\n");
    }
  });

  it("conta como falha qualquer conclusão que não seja sucesso nem cancelamento", () => {
    const relatorio = montarRelatorio(
      "2027-02",
      [
        agendada("10h47", "2027-02-01", 60, { conclusao: "timed_out" }),
        agendada("14h17", "2027-02-01", 60, { conclusao: "startup_failure" }),
        agendada("22h47", "2027-02-01", 60, { conclusao: null }),
        execucao({ criadaEm: "2027-02-02T09:00:00-03:00", conclusao: "timed_out" }),
        execucao({ criadaEm: "2027-02-02T10:00:00-03:00", conclusao: null }),
        execucao({ criadaEm: "2027-02-02T11:00:00-03:00", conclusao: "neutral" }),
      ],
      [],
    );
    expect(relatorio).toContain("| Todas | 60 | 3 | 0 | 3 | 0 | 1 min | 1 min |\n");
    expect(relatorio).toContain(
      "- 02/02/2027 09:00 · tempo esgotado\n- 02/02/2027 10:00 · sem conclusão\n- 02/02/2027 11:00 · neutral\n",
    );
    expect(relatorio).toContain(
      "- Nenhum dia útil sem rodada bem-sucedida: não cumprida (20 dias).",
    );
  });

  it("ignora execuções com data de criação inválida, sem lançar", () => {
    const relatorio = montarRelatorio(
      "2027-02",
      [
        execucao({
          titulo: "Atualizar índices · 47 10 * * 1-5",
          evento: "schedule",
          criadaEm: "ontem",
        }),
        execucao({ criadaEm: "2027-02-30T10:00:00Z" }),
      ],
      [],
    );
    expect(relatorio).toContain("| Todas | 60 | 0 | 0 | 0 | 0 | — | — |\n");
    expect(relatorio).toContain("Execuções manuais no mês: 0.\n");
    expect(relatorio).not.toContain("sem rodada reconhecível");
  });

  it("estima os minutos somando, por execução, os minutos iniciados entre o início e o fim", () => {
    const relatorio = montarRelatorio(
      "2027-02",
      [
        // 60 s → 1; 61 s → 2; sem início → 0; fim antes do início → 0; 60,5 s → 2 (as frações de
        // segundo contam); manual de 3 min 1 s → 4.
        agendada("10h47", "2027-02-01", 0, {
          iniciadaEm: "2027-02-01T10:47:00-03:00",
          atualizadaEm: "2027-02-01T13:48:00Z",
        }),
        agendada("14h17", "2027-02-01", 0, {
          iniciadaEm: "2027-02-01T14:17:00-03:00",
          atualizadaEm: "2027-02-01T14:18:01-03:00",
        }),
        agendada("22h47", "2027-02-01", 0, { atualizadaEm: "2027-02-01T22:50:00-03:00" }),
        agendada("10h47", "2027-02-02", 0, {
          iniciadaEm: "2027-02-02T10:50:00-03:00",
          atualizadaEm: "2027-02-02T10:49:00-03:00",
        }),
        agendada("14h17", "2027-02-02", 0, {
          iniciadaEm: "2027-02-02T17:17:00Z",
          atualizadaEm: "2027-02-02T17:18:00.500Z",
        }),
        execucao({
          criadaEm: "2027-02-03T09:00:00-03:00",
          iniciadaEm: "2027-02-03T09:00:00-03:00",
          atualizadaEm: "2027-02-03T09:03:01-03:00",
        }),
        // Fora do mês: não entra na estimativa.
        execucao({
          criadaEm: "2027-03-01T09:00:00-03:00",
          iniciadaEm: "2027-03-01T09:00:00-03:00",
          atualizadaEm: "2027-03-01T09:30:00-03:00",
        }),
      ],
      [],
    );
    expect(relatorio).toContain("- Minutos de execução no GitHub Actions: 9 (estimativa:");
  });

  it("separa as revisões, tira as linhas sem mudança e põe as atualizações em ordem cronológica", () => {
    const atualizacoes: AtualizacaoRegistrada[] = [
      {
        em: "2026-11-01T01:00:00Z",
        rodada: "22h47",
        linhas: [
          "189 (IGP-M): 448 meses, último 2026-10 = 0.42",
          "Atenção: na série 189 mudou 1 valor já publicado: 2026-09 de 0.40 para 0.41.",
        ],
      },
      { em: "2026-10-01T02:30:00Z", rodada: "22h47", linhas: ["433 (IPCA): fora do mês"] },
      {
        em: "2026-10-15T09:00:00-03:00",
        rodada: "",
        linhas: ["188 (INPC): sem mudança; 561 meses, último 2026-09 = 0.30"],
      },
      {
        em: "2026-10-02T10:58:00-03:00",
        rodada: "manual",
        linhas: [
          "Atenção: na série 4390 mudou 1 valor já publicado: 2026-08 de 1.10 para 1.16.",
          "4390 (SELIC): 489 meses, último 2026-10 = 0.10",
        ],
      },
    ];
    const relatorio = montarRelatorio("2026-10", [], atualizacoes);
    expect(relatorio).toContain(
      [
        "## Atualizações gravadas",
        "",
        "### 02/10/2026 10:58 · rodada manual",
        "",
        "- 4390 (SELIC): 489 meses, último 2026-10 = 0.10",
        "",
        "### 15/10/2026 09:00 · rodada não informada",
        "",
        "- Só séries sem mudança.",
        "",
        "### 31/10/2026 22:00 · rodada 22h47",
        "",
        "- 189 (IGP-M): 448 meses, último 2026-10 = 0.42",
        "",
        "## Revisões de valores já publicados",
        "",
        "- 02/10/2026 10:58 · rodada manual · Atenção: na série 4390 mudou 1 valor já publicado: 2026-08 de 1.10 para 1.16.",
        "- 31/10/2026 22:00 · rodada 22h47 · Atenção: na série 189 mudou 1 valor já publicado: 2026-09 de 0.40 para 0.41.",
        "",
      ].join("\n"),
    );
    expect(relatorio).not.toContain("fora do mês");
    expect(relatorio).toContain("- Publicações do site: 3 (uma por atualização gravada).");
  });
});
```

Crie `scripts/relatorio-indices.test.ts` (6 testes):

```ts
// Testes do script do relatório mensal. Ficam em scripts/ (e não em src/) porque usam o Node
// (processo filho, git e arquivos temporários): o tsconfig.node.json já traz os tipos do Node, e o
// código do navegador em src/ continua sem eles. Nada acessa a rede, e nada é gravado no
// repositório: o script roda com APURA_RAIZ apontada para uma pasta temporária.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ARGUMENTOS_DO_GIT_LOG,
  lerAtualizacoes,
  lerExecucoes,
  montarRelatorio,
} from "../src/indices/relatorio.ts";
import type { AtualizacaoRegistrada } from "../src/indices/relatorio.ts";

const SCRIPT = fileURLToPath(new URL("./relatorio-indices.ts", import.meta.url));
const TEXTO_DAS_EXECUCOES = readFileSync(
  new URL("../src/indices/testes/execucoes-rotina.json", import.meta.url),
  "utf8",
);

const pasta = mkdtempSync(join(tmpdir(), "apura-relatorio-"));
const execucoes = join(pasta, "execucoes.json");
writeFileSync(execucoes, TEXTO_DAS_EXECUCOES);

afterAll(() => {
  rmSync(pasta, { recursive: true, force: true });
});

/**
 * Ambiente sem as variáveis GIT_* de quem roda os testes (um gancho do git, por exemplo, traz
 * GIT_DIR e faria o git ler outro repositório), sem a configuração global e de sistema da máquina
 * (assinatura de commits, ganchos) e sem subir para pastas acima de `pasta` à procura de um
 * repositório.
 */
function ambiente(extras: Record<string, string> = {}): NodeJS.ProcessEnv {
  const limpo = Object.fromEntries(
    Object.entries(process.env).filter(([nome]) => !nome.startsWith("GIT_")),
  );
  const configuracaoVazia = join(pasta, "gitconfig-vazio");
  writeFileSync(configuracaoVazia, "");
  return {
    ...limpo,
    GIT_CONFIG_GLOBAL: configuracaoVazia,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CEILING_DIRECTORIES: pasta,
    ...extras,
  };
}

/** Roda o script com a raiz do repositório em `raiz`. */
function rodar(raiz: string, ...argumentos: string[]) {
  const { status, stdout, stderr } = spawnSync(process.execPath, [SCRIPT, ...argumentos], {
    cwd: pasta,
    encoding: "utf8",
    env: ambiente({ APURA_RAIZ: raiz }),
    timeout: 20_000,
  });
  return { status, stdout, stderr };
}

function git(repositorio: string, argumentos: readonly string[], data?: string): string {
  const datas: Record<string, string> =
    data === undefined ? {} : { GIT_AUTHOR_DATE: data, GIT_COMMITTER_DATE: data };
  return execFileSync("git", argumentos, {
    cwd: repositorio,
    encoding: "utf8",
    env: ambiente({
      GIT_AUTHOR_NAME: "Rotina de teste",
      GIT_AUTHOR_EMAIL: "rotina@exemplo.invalid",
      GIT_COMMITTER_NAME: "Rotina de teste",
      GIT_COMMITTER_EMAIL: "rotina@exemplo.invalid",
      ...datas,
    }),
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/** Grava `conteudo` em `arquivo` (relativo ao repositório) e faz o commit com a mensagem e a data. */
function commit(
  repositorio: string,
  arquivo: string,
  conteudo: string,
  mensagem: string,
  data: string,
) {
  const caminho = join(repositorio, arquivo);
  mkdirSync(join(caminho, ".."), { recursive: true });
  writeFileSync(caminho, conteudo);
  const arquivoDaMensagem = join(pasta, "mensagem.txt");
  writeFileSync(arquivoDaMensagem, mensagem);
  git(repositorio, ["add", "--", arquivo]);
  git(repositorio, ["commit", "-q", "-F", arquivoDaMensagem], data);
}

/**
 * Repositório de verdade, do mais antigo para o mais recente: dois commits da rotina em
 * dados/indices (o segundo com revisão), um alheio em dados/indices e um fora de dados/indices com
 * título igual ao da rotina (prova o filtro do caminho).
 */
const repositorio = join(pasta, "repositorio");

const ATUALIZACOES_ESPERADAS: AtualizacaoRegistrada[] = [
  {
    em: "2026-10-09T14:27:40-03:00",
    rodada: "14h17",
    linhas: [
      "433 (IPCA): 562 meses, último 2026-09 = 0.48",
      "188 (INPC): sem mudança; 561 meses, último 2026-08 = 0.20",
      "Atenção: na série 433 mudou 1 valor já publicado: 2026-08 de 0.80 para 0.82.",
    ],
  },
  {
    em: "2026-10-05T11:01:15-03:00",
    rodada: "10h47",
    linhas: [
      "4390 (SELIC): 489 meses, último 2026-10 = 0.10",
      "SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.05 para 0.10.",
    ],
  },
];

beforeAll(() => {
  mkdirSync(repositorio);
  git(repositorio, ["init", "-q"]);
  commit(
    repositorio,
    "dados/indices/4390.json",
    '{"serie": 4390}\n',
    [
      "indices: séries do BCB em 05/10/2026 11:01 (rodada 10h47)",
      "",
      "4390 (SELIC): 489 meses, último 2026-10 = 0.10",
      "SELIC de out/2026 (acumulado parcial do mês) atualizada de 0.05 para 0.10.",
      "",
      "Execução: https://github.com/exemplo/apura/actions/runs/9100010000",
      "",
    ].join("\n"),
    "2026-10-05T11:01:15-03:00",
  );
  commit(
    repositorio,
    "dados/indices/433.json",
    '{"serie": 433, "nome": "IPCA"}\n',
    "indices: nome da série 433\n",
    "2026-10-06T09:00:00-03:00",
  );
  commit(
    repositorio,
    "docs/notas.md",
    "Notas.\n",
    "indices: séries do BCB em 07/10/2026 10:00 (rodada 10h47)\n\nFora de dados/indices.\n",
    "2026-10-07T10:00:00-03:00",
  );
  commit(
    repositorio,
    "dados/indices/433.json",
    '{"serie": 433, "nome": "IPCA", "valores": []}\n',
    [
      "indices: séries do BCB em 09/10/2026 14:27 (rodada 14h17)",
      "",
      "433 (IPCA): 562 meses, último 2026-09 = 0.48",
      "188 (INPC): sem mudança; 561 meses, último 2026-08 = 0.20",
      "Atenção: na série 433 mudou 1 valor já publicado: 2026-08 de 0.80 para 0.82.",
      "",
      "Execução: https://github.com/exemplo/apura/actions/runs/9100026000",
      "",
    ].join("\n"),
    "2026-10-09T14:27:40-03:00",
  );
});

describe("ARGUMENTOS_DO_GIT_LOG", () => {
  it("num repositório de verdade, dão o texto que lerAtualizacoes entende, só de dados/indices", () => {
    const texto = git(repositorio, ARGUMENTOS_DO_GIT_LOG);
    expect(lerAtualizacoes(texto)).toEqual(ATUALIZACOES_ESPERADAS);
  });
});

describe("scripts/relatorio-indices.ts", () => {
  it("grava docs/monitoramento/<mês>.md na raiz do repositório, imprime o caminho e sai com 0", () => {
    const { status, stdout, stderr } = rodar(repositorio, "2026-10", execucoes);
    expect(stderr).toBe("");
    expect(status).toBe(0);
    expect(stdout).toBe("docs/monitoramento/2026-10.md\n");
    const gravado = readFileSync(join(repositorio, "docs", "monitoramento", "2026-10.md"), "utf8");
    const execucoesLidas = lerExecucoes(JSON.parse(TEXTO_DAS_EXECUCOES) as unknown);
    expect(gravado).toBe(montarRelatorio("2026-10", execucoesLidas, ATUALIZACOES_ESPERADAS));
    expect(gravado).toContain("### 05/10/2026 11:01 · rodada 10h47\n");
    expect(gravado).toContain("### 09/10/2026 14:27 · rodada 14h17\n");
    expect(gravado).not.toContain("07/10/2026 10:00");
  });

  it("recusa mês inválido com mensagem simples e código 1, sem gravar nada", () => {
    const raiz = join(pasta, "mes-invalido");
    mkdirSync(raiz);
    for (const mes of ["2026-13", "10/2026", "2026-1", ""]) {
      const { status, stdout, stderr } = rodar(raiz, mes, execucoes);
      expect(status).toBe(1);
      expect(stdout).toBe("");
      expect(stderr).toBe(
        `Mês inválido: "${mes}". Informe o mês no formato AAAA-MM, por exemplo 2026-10.\n`,
      );
    }
    expect(existsSync(join(raiz, "docs"))).toBe(false);
  });

  it("recusa a falta de argumentos mostrando o uso", () => {
    const { status, stderr } = rodar(join(pasta, "sem-argumentos"), "2026-10");
    expect(status).toBe(1);
    expect(stderr).toBe("Uso: npm run indices:relatorio -- <AAAA-MM> <arquivo-execucoes.json>\n");
  });

  it("recusa arquivo inexistente, que não é JSON ou que não traz execuções, com código 1", () => {
    const naoJson = join(pasta, "nao-json.json");
    writeFileSync(naoJson, "isto não é JSON");
    const semLista = join(pasta, "sem-lista.json");
    writeFileSync(semLista, JSON.stringify({ mensagem: "nada" }));
    const inexistente = join(pasta, "nao-existe.json");
    const casos: Array<[string, string]> = [
      [inexistente, `O arquivo de execuções ${inexistente} não existe.\n`],
      [naoJson, `O arquivo de execuções ${naoJson} não é JSON válido.\n`],
      [
        semLista,
        `O arquivo de execuções ${semLista} não traz uma lista de execuções do GitHub Actions.\n`,
      ],
    ];
    for (const [arquivo, mensagem] of casos) {
      const { status, stdout, stderr } = rodar(repositorio, "2026-11", arquivo);
      expect(status).toBe(1);
      expect(stdout).toBe("");
      expect(stderr).toBe(mensagem);
      expect(stderr).not.toContain("Error:");
    }
    expect(existsSync(join(repositorio, "docs", "monitoramento", "2026-11.md"))).toBe(false);
  });

  it("fora de um repositório git, recusa com mensagem simples e código 1, sem gravar nada", () => {
    const raiz = join(pasta, "sem-git");
    mkdirSync(raiz);
    const { status, stdout, stderr } = rodar(raiz, "2026-10", execucoes);
    expect(status).toBe(1);
    expect(stdout).toBe("");
    expect(stderr).toBe("Não foi possível ler o histórico do git em dados/indices.\n");
    expect(existsSync(join(raiz, "docs"))).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Execute: `npm test -- src/indices/relatorio.test.ts scripts/relatorio-indices.test.ts`
Esperado: os dois arquivos falham ao carregar ("Cannot find module './relatorio.ts'" e "Cannot find module '../src/indices/relatorio.ts'"); nenhum teste roda.

- [ ] **Step 3: Escrever o código**

Crie `src/indices/relatorio.ts`:

```ts
import {
  competenciaDe,
  dataValida,
  diaAnterior,
  diaSeguinte,
  diasDesdeEpoca,
  primeiroDiaDoMes,
  ultimoDiaDoMes,
} from "../compartilhado/datas.ts";
import { formatarCompetencia, formatarData } from "../compartilhado/formatacao.ts";
import type { Competencia, DataISO } from "../compartilhado/tipos.ts";
import { dataHoraEmBrasilia } from "./relogio.ts";

/**
 * Relatório mensal da rotina central de índices (decisão de 12/10/2026): a partir das execuções
 * do workflow "Atualizar índices do BCB" (API do GitHub) e dos commits da rotina em dados/indices
 * (git log), monta o Markdown gravado em docs/monitoramento/AAAA-MM.md. Módulo puro, testado sem
 * rede: quem lê a API, o git e o disco é scripts/relatorio-indices.ts. Não importa embutidos.ts
 * nem congelar.ts. A conversão de fuso fica em relogio.ts (dataHoraEmBrasilia); aqui só há
 * aritmética de calendário sobre textos ISO, sem objetos Date.
 */

/** As três rodadas diárias da rotina, de segunda a sexta (decisão de 12/10/2026), pelo horário de Brasília. */
export type Rodada = "10h47" | "14h17" | "22h47";

/** Horário e linha de cron de cada rodada; o cron é o que o workflow põe no título da execução. */
export const RODADAS: Record<Rodada, { hora: number; minuto: number; cron: string }> = {
  "10h47": { hora: 10, minuto: 47, cron: "47 10 * * 1-5" },
  "14h17": { hora: 14, minuto: 17, cron: "17 14 * * 1-5" },
  "22h47": { hora: 22, minuto: 47, cron: "47 22 * * 1-5" },
};

const ORDEM_DAS_RODADAS: readonly Rodada[] = ["10h47", "14h17", "22h47"];

/** Início do título da execução (run-name do workflow): "Atualizar índices · <cron ou manual>". */
const PREFIXO_DO_TITULO = "Atualizar índices · ";
/** Início do título dos commits que a rotina grava em dados/indices. */
const PREFIXO_DO_COMMIT = "indices: séries do BCB em";
/** Deslocamento de Brasília desde 2019 (sem horário de verão), usado no horário agendado. */
const DESLOCAMENTO_BRASILIA = "-03:00";
/** Referência de atraso típico de início: até 1 hora. */
const ATRASO_TIPICO_MAXIMO_MIN = 60;

const MS_POR_MINUTO = 60_000;
const MS_POR_DIA = 86_400_000;
const SEPARADOR_DE_CAMPO = "\x1f";
const SEPARADOR_DE_REGISTRO = "\x1e";

/**
 * Argumentos do `git log` que dão o texto lido por lerAtualizacoes: data ISO do commit, título e
 * corpo, separados por \x1f, um registro por \x1e, só dos commits que tocam dados/indices.
 */
export const ARGUMENTOS_DO_GIT_LOG: readonly string[] = [
  "log",
  "--format=%cI%x1f%s%x1f%b%x1e",
  "--",
  "dados/indices",
];

/** Uma execução do workflow da rotina, como a API do GitHub a descreve (workflow_run). */
export interface ExecucaoDaRotina {
  id: number;
  /** display_title: "Atualizar índices · 47 10 * * 1-5" ou "Atualizar índices · manual" */
  titulo: string;
  /** "schedule", "workflow_dispatch"… */
  evento: string;
  /** "success", "failure", "cancelled"…; null enquanto não terminou */
  conclusao: string | null;
  /** ISO com fuso (a API usa UTC, "Z") */
  criadaEm: string;
  iniciadaEm: string | null;
  atualizadaEm: string | null;
  /** run_attempt: 2 em diante é reexecução da mesma execução */
  tentativa: number;
}

/** Um commit da rotina em dados/indices, lido do git log. */
export interface AtualizacaoRegistrada {
  /** ISO do commit (%cI) */
  em: string;
  /** o X de "(rodada X)" no título; vazio quando o título não traz a rodada */
  rodada: string;
  /** corpo do commit (a saída do script), sem linhas vazias e sem a linha "Execução: …" */
  linhas: string[];
}

// ---------------------------------------------------------------------------------------------
// Datas e horas

const FORMATO_ISO_DATA_HORA =
  /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(\.\d+)?)?(?:Z|([+-])([01]\d|2[0-3]):([0-5]\d))$/;

/**
 * Milissegundos desde a época para uma data-hora ISO com "Z" ou deslocamento, sem objetos Date
 * (dias pelo algoritmo civil de datas.ts); null para qualquer outro texto.
 */
function instanteEmMs(iso: string): number | null {
  const partes = FORMATO_ISO_DATA_HORA.exec(iso);
  if (!partes) return null;
  const data = partes[1] ?? "";
  if (!dataValida(data)) return null;
  const segundos = Number(partes[4] ?? "0") + Number(`0${partes[5] ?? ""}`);
  const sinal = partes[6] === "-" ? -1 : 1;
  const deslocamentoMin =
    partes[6] === undefined ? 0 : sinal * (Number(partes[7]) * 60 + Number(partes[8]));
  const minutosDoDia = Number(partes[2]) * 60 + Number(partes[3]) - deslocamentoMin;
  return (
    diasDesdeEpoca(data) * MS_POR_DIA + minutosDoDia * MS_POR_MINUTO + Math.round(segundos * 1000)
  );
}

function ehDataHoraISO(valor: unknown): valor is string {
  return typeof valor === "string" && instanteEmMs(valor) !== null;
}

interface HorarioDeBrasilia {
  data: DataISO;
  hora: number;
  minuto: number;
  /** "14/10/2026 12:05" */
  texto: string;
}

/** Data e hora em Brasília de uma data-hora ISO com fuso (pela conversão de relogio.ts). */
function emBrasilia(iso: string): HorarioDeBrasilia | null {
  if (instanteEmMs(iso) === null) return null;
  const local = dataHoraEmBrasilia(iso);
  if (local === null) return null;
  const [hora = 0, minuto = 0] = local.hora.split(":").map(Number);
  return { data: local.data, hora, minuto, texto: `${formatarData(local.data)} ${local.hora}` };
}

/** 0 = domingo … 6 = sábado (1º/01/1970 foi uma quinta-feira). */
function diaDaSemana(data: DataISO): number {
  return (((diasDesdeEpoca(data) + 4) % 7) + 7) % 7;
}

function diaUtil(data: DataISO): boolean {
  const dia = diaDaSemana(data);
  return dia >= 1 && dia <= 5;
}

/** Dias de segunda a sexta do mês, em ordem (feriados não são descontados). */
function diasUteisDoMes(mes: Competencia): DataISO[] {
  const dias: DataISO[] = [];
  const ultimo = ultimoDiaDoMes(mes);
  for (let dia = primeiroDiaDoMes(mes); dia <= ultimo; dia = diaSeguinte(dia)) {
    if (diaUtil(dia)) dias.push(dia);
  }
  return dias;
}

function doisDigitos(valor: number): string {
  return String(valor).padStart(2, "0");
}

// ---------------------------------------------------------------------------------------------
// Leitura das execuções e do git log

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/** Data-hora opcional: ausente ou nula vira null; texto ISO com fuso fica; o resto é malformado. */
function dataHoraOpcional(valor: unknown): string | null | undefined {
  if (valor === undefined || valor === null) return null;
  return ehDataHoraISO(valor) ? valor : undefined;
}

function lerExecucao(item: unknown): ExecucaoDaRotina | null {
  if (!ehObjeto(item)) return null;
  const {
    id,
    display_title: titulo,
    event: evento,
    conclusion,
    created_at: criadaEm,
    run_started_at,
    updated_at,
    run_attempt,
  } = item;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) return null;
  if (typeof titulo !== "string" || typeof evento !== "string") return null;
  if (conclusion !== undefined && conclusion !== null && typeof conclusion !== "string") {
    return null;
  }
  if (!ehDataHoraISO(criadaEm)) return null;
  const iniciadaEm = dataHoraOpcional(run_started_at);
  const atualizadaEm = dataHoraOpcional(updated_at);
  if (iniciadaEm === undefined || atualizadaEm === undefined) return null;
  const tentativa = run_attempt ?? 1;
  if (typeof tentativa !== "number" || !Number.isSafeInteger(tentativa) || tentativa < 1) {
    return null;
  }
  return {
    id,
    titulo,
    evento,
    conclusao: conclusion ?? null,
    criadaEm,
    iniciadaEm,
    atualizadaEm,
    tentativa,
  };
}

/**
 * Execuções a partir do que a API do GitHub devolve: a lista de workflow_run (como o workflow do
 * relatório a grava) ou o objeto com `workflow_runs`. Item malformado é ignorado: sem id inteiro
 * positivo, sem título ou evento em texto, com conclusão que não seja texto ou nula, sem
 * created_at ISO com fuso, com run_started_at ou updated_at que não sejam ISO com fuso nem nulos,
 * ou com run_attempt que não seja inteiro a partir de 1 (ausente vale 1). Qualquer outro dado
 * devolve lista vazia.
 */
export function lerExecucoes(dado: unknown): ExecucaoDaRotina[] {
  const itens: unknown =
    ehObjeto(dado) && Array.isArray(dado.workflow_runs) ? dado.workflow_runs : dado;
  if (!Array.isArray(itens)) return [];
  const execucoes: ExecucaoDaRotina[] = [];
  for (const item of itens as unknown[]) {
    const execucao = lerExecucao(item);
    if (execucao !== null) execucoes.push(execucao);
  }
  return execucoes;
}

/**
 * Rodada pelo título da execução (run-name do workflow): "Atualizar índices · 47 10 * * 1-5" é a
 * das 10h47, "Atualizar índices · manual" é manual; qualquer outro título é null.
 */
export function rodadaDoTitulo(titulo: string): Rodada | "manual" | null {
  if (!titulo.startsWith(PREFIXO_DO_TITULO)) return null;
  const resto = titulo.slice(PREFIXO_DO_TITULO.length).trim().replace(/\s+/g, " ");
  if (resto === "manual") return "manual";
  return ORDEM_DAS_RODADAS.find((rodada) => RODADAS[rodada].cron === resto) ?? null;
}

/**
 * Horário agendado (ISO com -03:00) da ocorrência mais recente da rodada, num dia de segunda a
 * sexta em Brasília, igual ou anterior a `criadaEm`: a 22h47 criada em 2026-10-17T03:30:00Z
 * (sábado, 00h30 em Brasília) é a de "2026-10-16T22:47:00-03:00". Lança para texto que não seja
 * data-hora ISO com fuso (lerExecucoes já os descarta).
 */
export function horarioAgendado(rodada: Rodada, criadaEm: string): string {
  const local = emBrasilia(criadaEm);
  if (local === null) {
    throw new Error(
      `A data-hora ${criadaEm} não é ISO com fuso; não há como achar o horário agendado.`,
    );
  }
  const { hora, minuto } = RODADAS[rodada];
  let dia =
    local.hora * 60 + local.minuto >= hora * 60 + minuto ? local.data : diaAnterior(local.data);
  while (!diaUtil(dia)) dia = diaAnterior(dia);
  return `${dia}T${doisDigitos(hora)}:${doisDigitos(minuto)}:00${DESLOCAMENTO_BRASILIA}`;
}

/**
 * Commits da rotina a partir do texto de `git` com ARGUMENTOS_DO_GIT_LOG: só os de título
 * iniciado por "indices: séries do BCB em" e data ISO válida, na ordem do log. A rodada
 * vem do "(rodada X)" do título (vazia se não houver); as linhas são o corpo sem linhas vazias e
 * sem a linha "Execução: …".
 */
export function lerAtualizacoes(textoDoGitLog: string): AtualizacaoRegistrada[] {
  const atualizacoes: AtualizacaoRegistrada[] = [];
  for (const registro of textoDoGitLog.split(SEPARADOR_DE_REGISTRO)) {
    const campos = registro.replace(/^\s+/, "").split(SEPARADOR_DE_CAMPO);
    if (campos.length < 3) continue;
    const em = (campos[0] ?? "").trim();
    const titulo = (campos[1] ?? "").trim();
    const corpo = campos.slice(2).join(SEPARADOR_DE_CAMPO);
    if (!ehDataHoraISO(em) || !titulo.startsWith(PREFIXO_DO_COMMIT)) continue;
    const rodada = /\(rodada ([^)]*)\)/.exec(titulo)?.[1]?.trim() ?? "";
    const linhas = corpo
      .split(/\r?\n/)
      .map((linha) => linha.trim())
      .filter((linha) => linha !== "" && !linha.startsWith("Execução:"));
    atualizacoes.push({ em, rodada, linhas });
  }
  return atualizacoes;
}

// ---------------------------------------------------------------------------------------------
// Relatório

interface ExecucaoAgendada {
  execucao: ExecucaoDaRotina;
  /** dia do horário agendado (Brasília) */
  dia: DataISO;
  atrasoMs: number;
}

/** Execução manual ou atualização do mês, com a data-hora em Brasília e o instante para ordenar. */
interface Datada<T> {
  item: T;
  local: HorarioDeBrasilia;
  ms: number;
}

interface ResumoDaRodada {
  rotulo: string;
  previstas: number;
  execucoes: ExecucaoAgendada[];
}

const NOME_DA_CONCLUSAO = new Map<string, string>([
  ["success", "sucesso"],
  ["failure", "falha"],
  ["cancelled", "cancelada"],
  ["timed_out", "tempo esgotado"],
  ["startup_failure", "falha ao iniciar"],
]);

function nomeDaConclusao(conclusao: string | null): string {
  if (conclusao === null) return "sem conclusão";
  return NOME_DA_CONCLUSAO.get(conclusao) ?? conclusao;
}

/** "a" · "a e b" · "a, b e c" */
function listar(itens: readonly string[]): string {
  const ultimo = itens.at(-1);
  if (ultimo === undefined) return "";
  const anteriores = itens.slice(0, -1);
  return anteriores.length === 0 ? ultimo : `${anteriores.join(", ")} e ${ultimo}`;
}

function quantosDias(n: number): string {
  return `${n} ${n === 1 ? "dia" : "dias"}`;
}

function mediana(valores: readonly number[]): number | null {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  const centro = ordenados[meio] ?? 0;
  return ordenados.length % 2 === 1 ? centro : ((ordenados[meio - 1] ?? 0) + centro) / 2;
}

/** Minutos inteiros, ao minuto mais próximo (meio minuto para cima). */
function emMinutos(ms: number): number {
  return Math.round(ms / MS_POR_MINUTO);
}

function textoDeMinutos(ms: number | null): string {
  return ms === null ? "—" : `${emMinutos(ms)} min`;
}

/**
 * Minutos iniciados entre o início e a última atualização (0 sem os dois ou com fim anterior). Na
 * reexecução, a API só dá o início da tentativa mais recente: as anteriores ficam de fora.
 */
function minutosDeExecucao(execucao: ExecucaoDaRotina): number {
  if (execucao.iniciadaEm === null || execucao.atualizadaEm === null) return 0;
  const inicio = instanteEmMs(execucao.iniciadaEm);
  const fim = instanteEmMs(execucao.atualizadaEm);
  if (inicio === null || fim === null || fim <= inicio) return 0;
  return Math.ceil((fim - inicio) / MS_POR_MINUTO);
}

/** Uma execução por id, a da tentativa mais recente: reexecução não é execução nova. */
function semRepeticoes(execucoes: readonly ExecucaoDaRotina[]): ExecucaoDaRotina[] {
  const porId = new Map<number, ExecucaoDaRotina>();
  for (const execucao of execucoes) {
    if (instanteEmMs(execucao.criadaEm) === null) continue;
    const anterior = porId.get(execucao.id);
    if (anterior === undefined || execucao.tentativa >= anterior.tentativa) {
      porId.set(execucao.id, execucao);
    }
  }
  return [...porId.values()];
}

function linhaDaTabela(resumo: ResumoDaRodada): string {
  const conclusoes = resumo.execucoes.map(({ execucao }) => execucao.conclusao);
  const sucesso = conclusoes.filter((c) => c === "success").length;
  const canceladas = conclusoes.filter((c) => c === "cancelled").length;
  const falhas = conclusoes.length - sucesso - canceladas;
  const atrasos = resumo.execucoes.map(({ atrasoMs }) => atrasoMs);
  const maximo = atrasos.length === 0 ? null : Math.max(...atrasos);
  const colunas = [
    resumo.rotulo,
    String(resumo.previstas),
    String(conclusoes.length),
    String(sucesso),
    String(falhas),
    String(canceladas),
    textoDeMinutos(mediana(atrasos)),
    textoDeMinutos(maximo),
  ];
  return `| ${colunas.join(" | ")} |`;
}

/**
 * Relatório do mês em Markdown: agenda (dias úteis, sem descontar feriados), execuções agendadas
 * por rodada (previstas, realizadas, com sucesso, com falha, canceladas pela fila e atraso de
 * início, mediana e máximo), execuções manuais, dias úteis sem nenhuma execução agendada
 * bem-sucedida (aproximadamente o que o alarme do Healthchecks acusa), atualizações gravadas e revisões em seção
 * própria, estimativas e referências. Uma execução agendada pertence ao mês pelo horário agendado
 * em Brasília; manuais e atualizações, pela data-hora em Brasília. Reexecuções (o mesmo id com
 * tentativa maior) contam uma vez, pela tentativa mais recente; execuções com título sem rodada
 * reconhecível ficam fora das contas (só são contadas). Minutos inteiros: o atraso arredonda ao
 * minuto mais próximo só no fim (mediana e máximo calculados em milissegundos).
 */
export function montarRelatorio(
  mes: Competencia,
  execucoes: ExecucaoDaRotina[],
  atualizacoes: AtualizacaoRegistrada[],
): string {
  const diasUteis = diasUteisDoMes(mes);
  const porRodada = new Map<Rodada, ExecucaoAgendada[]>(
    ORDEM_DAS_RODADAS.map((rodada) => [rodada, []]),
  );
  const manuais: Datada<ExecucaoDaRotina>[] = [];
  let naoReconhecidas = 0;
  let reexecucoes = 0;
  let minutos = 0;

  for (const execucao of semRepeticoes(execucoes)) {
    const criadaMs = instanteEmMs(execucao.criadaEm);
    const local = emBrasilia(execucao.criadaEm);
    if (criadaMs === null || local === null) continue;
    const rodada = rodadaDoTitulo(execucao.titulo);
    if (rodada === null || rodada === "manual") {
      if (competenciaDe(local.data) !== mes) continue;
      if (rodada === null) {
        naoReconhecidas += 1;
        continue;
      }
      manuais.push({ item: execucao, local, ms: criadaMs });
    } else {
      const agendado = horarioAgendado(rodada, execucao.criadaEm);
      if (competenciaDe(agendado) !== mes) continue;
      porRodada.get(rodada)?.push({
        execucao,
        dia: agendado.slice(0, 10),
        atrasoMs: criadaMs - (instanteEmMs(agendado) ?? criadaMs),
      });
    }
    if (execucao.tentativa > 1) reexecucoes += 1;
    minutos += minutosDeExecucao(execucao);
  }

  const resumos: ResumoDaRodada[] = ORDEM_DAS_RODADAS.map((rodada) => ({
    rotulo: rodada,
    previstas: diasUteis.length,
    execucoes: porRodada.get(rodada) ?? [],
  }));
  const todas = resumos.flatMap((resumo) => resumo.execucoes);
  const geral: ResumoDaRodada = {
    rotulo: "Todas",
    previstas: diasUteis.length * ORDEM_DAS_RODADAS.length,
    execucoes: todas,
  };
  const diasComSucesso = new Set(
    todas.filter(({ execucao }) => execucao.conclusao === "success").map(({ dia }) => dia),
  );
  const diasSemSucesso = diasUteis.filter((dia) => !diasComSucesso.has(dia));
  const medianaGeral = mediana(todas.map(({ atrasoMs }) => atrasoMs));
  manuais.sort((a, b) => a.ms - b.ms);

  const doMes: Datada<AtualizacaoRegistrada>[] = [];
  for (const atualizacao of atualizacoes) {
    const local = emBrasilia(atualizacao.em);
    const ms = instanteEmMs(atualizacao.em);
    if (local !== null && ms !== null && competenciaDe(local.data) === mes) {
      doMes.push({ item: atualizacao, local, ms });
    }
  }
  doMes.sort((a, b) => a.ms - b.ms);

  const linhas: string[] = [];
  const secao = (titulo: string): void => {
    linhas.push(`## ${titulo}`, "");
  };

  linhas.push(
    `# Monitoramento da rotina de índices · ${formatarCompetencia(mes)}`,
    "",
    'Execuções do workflow "Atualizar índices do BCB" no GitHub Actions e atualizações dos índices gravadas no repositório. Datas e horas no horário de Brasília; minutos inteiros.',
    "",
  );

  secao("Agenda do mês");
  linhas.push(
    `- Dias úteis: ${diasUteis.length} (segunda a sexta-feira; os feriados não são descontados).`,
    `- Rodadas agendadas em cada dia útil: ${listar(ORDEM_DAS_RODADAS)}.`,
    "",
  );

  secao("Execuções agendadas");
  linhas.push(
    "| Rodada | Previstas | Realizadas | Com sucesso | Com falha | Canceladas pela fila | Atraso de início (mediana) | Atraso de início (máximo) |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...resumos.map(linhaDaTabela),
    linhaDaTabela(geral),
    "",
    "- Cada execução conta no mês do seu horário agendado, mesmo quando o GitHub a cria depois da meia-noite.",
    "- O atraso de início vai do horário agendado até a criação da execução pelo GitHub.",
    "- Com falha: qualquer conclusão que não seja sucesso nem cancelamento pela fila.",
    `- Reexecuções (2ª tentativa em diante), que não contam como execução nova: ${reexecucoes}.`,
  );
  if (naoReconhecidas > 0) {
    linhas.push(
      `- Execuções sem rodada reconhecível no título, deixadas fora das contas: ${naoReconhecidas}.`,
    );
  }
  linhas.push("");

  secao("Execuções manuais");
  linhas.push(`Execuções manuais no mês: ${manuais.length}.`, "");
  if (manuais.length > 0) {
    for (const { item, local } of manuais) {
      linhas.push(`- ${local.texto} · ${nomeDaConclusao(item.conclusao)}`);
    }
    linhas.push("");
  }

  secao("Dias úteis sem nenhuma execução bem-sucedida");
  linhas.push(
    "É, aproximadamente, o que o alarme de silêncio do Healthchecks acusa (uma falha só do deploy hook conta aqui como falha, mas não suprime o sinal).",
    "",
  );
  if (diasSemSucesso.length === 0) {
    linhas.push("Nenhum: todos os dias úteis tiveram ao menos uma execução agendada bem-sucedida.");
  } else {
    for (const dia of diasSemSucesso) linhas.push(`- ${formatarData(dia)}`);
  }
  linhas.push("");

  const rotuloDaRodada = (rodada: string): string =>
    rodada === "" ? "rodada não informada" : `rodada ${rodada}`;
  const revisoes: string[] = [];
  secao("Atualizações gravadas");
  if (doMes.length === 0) linhas.push("Nenhuma atualização gravada no mês.", "");
  for (const { item: atualizacao, local } of doMes) {
    const cabecalho = `${local.texto} · ${rotuloDaRodada(atualizacao.rodada)}`;
    const informativas: string[] = [];
    for (const linha of atualizacao.linhas) {
      if (linha.startsWith("Atenção")) revisoes.push(`- ${cabecalho} · ${linha}`);
      else if (!linha.includes(": sem mudança")) informativas.push(`- ${linha}`);
    }
    linhas.push(`### ${cabecalho}`, "");
    linhas.push(...(informativas.length > 0 ? informativas : ["- Só séries sem mudança."]), "");
  }

  secao("Revisões de valores já publicados");
  if (revisoes.length === 0) linhas.push("Nenhuma revisão de valor já publicado no mês.");
  else linhas.push(...revisoes);
  linhas.push("");

  secao("Estimativas");
  linhas.push(
    `- Minutos de execução no GitHub Actions: ${minutos} (estimativa: em cada execução, os minutos iniciados entre o início e a última atualização; nas reexecuções, só a última tentativa).`,
    `- Publicações do site: ${doMes.length} (uma por atualização gravada).`,
    "",
  );

  secao("Referências");
  const semFalta = diasSemSucesso.length === 0 ? "cumprida" : "não cumprida";
  linhas.push(
    `- Nenhum dia útil sem rodada bem-sucedida: ${semFalta} (${quantosDias(diasSemSucesso.length)}).`,
  );
  if (medianaGeral === null) {
    linhas.push(
      "- Atraso típico de início até 1 hora: sem dados (nenhuma execução agendada no mês).",
    );
  } else {
    const minutosDaMediana = emMinutos(medianaGeral);
    const atrasoOk = minutosDaMediana <= ATRASO_TIPICO_MAXIMO_MIN ? "cumprida" : "não cumprida";
    linhas.push(
      `- Atraso típico de início até 1 hora: ${atrasoOk} (mediana geral ${minutosDaMediana} min).`,
    );
  }
  linhas.push("", "Ajustes de horário ou de agendador só com o responsável.", "");

  return linhas.join("\n");
}
```

Crie `scripts/relatorio-indices.ts`:

```ts
// Relatório mensal da rotina de índices (decisão de 12/10/2026), gravado como arquivo.
//   npm run indices:relatorio -- 2026-10 execucoes.json
// O arquivo de execuções é a lista de workflow_run do workflow "Atualizar índices do BCB", como o
// workflow .github/workflows/relatorio-indices.yml a baixa da API do GitHub. O script lê também os
// commits da rotina em dados/indices pelo git log e grava docs/monitoramento/<AAAA-MM>.md.
// Roda no Node 22.18+ sem compilação (sintaxe apagável); por isso os imports relativos têm a
// extensão .ts. A montagem do relatório está em src/indices/relatorio.ts, testada sem rede; aqui
// ficam só os argumentos, o git, o disco e o console. Mês inválido ou arquivo ilegível: mensagem
// simples e código de saída 1. A variável de ambiente APURA_RAIZ, usada só pelos testes, troca a
// raiz do repositório (onde roda o git log e onde fica docs/monitoramento).
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { competenciaValida } from "../src/compartilhado/datas.ts";
import {
  ARGUMENTOS_DO_GIT_LOG,
  lerAtualizacoes,
  lerExecucoes,
  montarRelatorio,
} from "../src/indices/relatorio.ts";

const RAIZ = process.env.APURA_RAIZ || join(import.meta.dirname, "..");

/** Problema previsto (arquivo ou git): vira só a mensagem, sem "Error:", e código 1. */
class Recusa extends Error {}

function lerArquivoDeExecucoes(caminho: string): unknown {
  let texto: string;
  try {
    texto = readFileSync(caminho, "utf8");
  } catch (erro) {
    const codigo = (erro as NodeJS.ErrnoException).code;
    throw new Recusa(
      codigo === "ENOENT"
        ? `O arquivo de execuções ${caminho} não existe.`
        : `O arquivo de execuções ${caminho} não pôde ser lido.`,
    );
  }
  let dado: unknown;
  try {
    dado = JSON.parse(texto);
  } catch {
    throw new Recusa(`O arquivo de execuções ${caminho} não é JSON válido.`);
  }
  const lista =
    Array.isArray(dado) ||
    (typeof dado === "object" &&
      dado !== null &&
      Array.isArray((dado as { workflow_runs?: unknown }).workflow_runs));
  if (!lista) {
    throw new Recusa(
      `O arquivo de execuções ${caminho} não traz uma lista de execuções do GitHub Actions.`,
    );
  }
  return dado;
}

function lerGitLog(): string {
  try {
    return execFileSync("git", ARGUMENTOS_DO_GIT_LOG, {
      cwd: RAIZ,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Recusa("Não foi possível ler o histórico do git em dados/indices.");
  }
}

/** Devolve o código de saída do processo; só o que for inesperado (disco, por exemplo) lança. */
function main(argumentos: readonly string[]): number {
  if (argumentos.length !== 2) {
    console.error("Uso: npm run indices:relatorio -- <AAAA-MM> <arquivo-execucoes.json>");
    return 1;
  }
  const [mes = "", caminho = ""] = argumentos;
  if (!/^\d{4}-\d{2}$/.test(mes) || !competenciaValida(mes)) {
    console.error(`Mês inválido: "${mes}". Informe o mês no formato AAAA-MM, por exemplo 2026-10.`);
    return 1;
  }
  try {
    const execucoes = lerExecucoes(lerArquivoDeExecucoes(caminho));
    const atualizacoes = lerAtualizacoes(lerGitLog());
    const pasta = join(RAIZ, "docs", "monitoramento");
    mkdirSync(pasta, { recursive: true });
    const arquivo = join(pasta, `${mes}.md`);
    writeFileSync(arquivo, montarRelatorio(mes, execucoes, atualizacoes));
    console.log(relative(RAIZ, arquivo));
    return 0;
  } catch (erro) {
    if (erro instanceof Recusa) {
      console.error(erro.message);
      return 1;
    }
    throw erro;
  }
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : String(erro));
  process.exitCode = 1;
}
```

Em `package.json`, troque

```json
    "indices:atualizar": "node scripts/atualizar-indices.ts"
```

por

```json
    "indices:atualizar": "node scripts/atualizar-indices.ts",
    "indices:relatorio": "node scripts/relatorio-indices.ts"
```

- [ ] **Step 4: Rodar e ver passar**

Execute: `npm run format && npm run verificar`
Esperado: tudo verde; 23 arquivos de teste, 673 passando | 9 pulados (682).

Confira a recusa de mês inválido (sem rede e sem gravar nada):

```bash
npm run --silent indices:relatorio -- 2026-13 src/indices/testes/execucoes-rotina.json
```

Esperado, na saída de erro e com código de saída 1: `Mês inválido: "2026-13". Informe o mês no formato AAAA-MM, por exemplo 2026-10.`

- [ ] **Step 5: Escrever o workflow do relatório**

Crie `.github/workflows/relatorio-indices.yml` (conferido por leitura e pelo Prettier; só pode ser executado com o repositório no GitHub, na fase 7):

```yaml
# Relatório mensal da rotina de índices (decisão de 12/10/2026): no dia 2 de cada mês, às 12h17
# de Brasília, lê pela API do GitHub as execuções do workflow "Atualizar índices do BCB" do mês
# anterior, junta os commits da rotina em dados/indices (git log, por isso o histórico completo) e
# grava o relatório em docs/monitoramento/AAAA-MM.md, sem e-mail. Também pode ser disparado à mão em
# "Actions", com um mês opcional (AAAA-MM, já encerrado; vazio = mês anterior). Só pode ser
# executado e testado quando o repositório estiver no GitHub (fase 7): até lá, é só conferido por
# leitura.
# O commit começa com "[CF-Pages-Skip]" para o Cloudflare Pages não publicar o site por causa dele;
# a pasta docs/ é ignorada pelo Prettier, por isso não há "npm run verificar" antes de gravar.
name: Relatório da rotina de índices

on:
  schedule:
    - cron: "17 12 2 * *" # dia 2 de cada mês, 12h17 em Brasília; cobre o mês anterior
      timezone: "America/Sao_Paulo"
  workflow_dispatch:
    inputs:
      mes:
        description: "Mês do relatório (AAAA-MM, já encerrado); vazio = mês anterior"
        required: false
        type: string

permissions:
  actions: read
  contents: write

jobs:
  relatorio:
    # Só a partir da main, e sempre a ponta dela (histórico completo para o git log).
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v6
        with:
          ref: main
          fetch-depth: 0

      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Escolher o mês
        shell: bash
        env:
          MES_PEDIDO: ${{ inputs.mes }}
        run: |
          if [ -n "$MES_PEDIDO" ]; then
            MES="$MES_PEDIDO"
          else
            MES="$(TZ=America/Sao_Paulo date -d "$(TZ=America/Sao_Paulo date +%Y-%m-01) -1 month" +%Y-%m)"
          fi
          if ! [[ "$MES" =~ ^[0-9]{4}-(0[1-9]|1[0-2])$ ]]; then
            echo "::error::Mês inválido: $MES. Informe o mês no formato AAAA-MM, por exemplo 2026-10."
            exit 1
          fi
          # Mês corrente ou futuro: os dias úteis ainda por vir sairiam como "sem execução".
          ATUAL="$(TZ=America/Sao_Paulo date +%Y-%m)"
          if ! [[ "$MES" < "$ATUAL" ]]; then
            echo "::error::O relatório de $MES só pode ser montado depois que o mês terminar. Informe um mês anterior a $ATUAL."
            exit 1
          fi
          echo "MES=$MES" >> "$GITHUB_ENV"
          echo "Relatório de $MES."

      - name: Ler as execuções da rotina
        shell: bash
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          DE="$(date -d "$MES-01 -1 day" +%Y-%m-%d)"
          ATE="$(date -d "$MES-01 +1 month" +%Y-%m-%d)"
          gh api --method GET --paginate "repos/$GITHUB_REPOSITORY/actions/workflows/atualizar-indices.yml/runs" \
            -f per_page=100 -f created="$DE..$ATE" --jq '.workflow_runs[]' | jq -s '.' > "$RUNNER_TEMP/execucoes.json"
          echo "Execuções lidas de $DE a $ATE: $(jq 'length' "$RUNNER_TEMP/execucoes.json")."

      - name: Montar o relatório
        run: npm run --silent indices:relatorio -- "$MES" "$RUNNER_TEMP/execucoes.json"

      - name: Gravar na main
        shell: bash
        run: |
          git add docs/monitoramento
          if git diff --cached --quiet; then
            echo "O relatório de $MES não mudou; nada a gravar."
            exit 0
          fi
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git commit -m "[CF-Pages-Skip] monitoramento: relatório da rotina de índices de $MES"
          # Outro envio pode entrar entre o pull e o push: tenta de novo, até três vezes.
          for tentativa in 1 2 3; do
            if git pull --rebase origin main && git push origin HEAD:main; then exit 0; fi
            git rebase --abort 2>/dev/null || true
            sleep $((tentativa * 10))
          done
          echo "::error::Não foi possível gravar na main depois de 3 tentativas."
          exit 1
```

Execute: `npx prettier --check .github/workflows/relatorio-indices.yml`
Esperado: "All matched files use Prettier code style!"

- [ ] **Step 6: Commit**

```bash
git add src/indices/relatorio.ts src/indices/relatorio.test.ts src/indices/testes/execucoes-rotina.json scripts/relatorio-indices.ts scripts/relatorio-indices.test.ts .github/workflows/relatorio-indices.yml package.json vite.config.ts
git commit -m "indices: relatório mensal da rotina (execuções, atrasos, dias sem sucesso e atualizações gravadas em docs/monitoramento)

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```


### Task 10: Fechamento da fase: roteiro, CLAUDE.md, design, pendências e verificação final

**Files:**
- Modify: `docs/superpowers/roteiro.md`, `CLAUDE.md`, `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md` (§3.1, §4.1, §4.2, §4.3, §5.1, §5.4, §5.5, §6.3, §8.1, §8.2, §8.3 e nota ao fim da §8, §10.4, §11, §12.2, §12.3, §13, §14, §15, §16), `README.md`, este plano (seção "Pendências registradas na execução da fase 4")

- [ ] **Step 1: Rodar a verificação completa e a build**

Execute: `npm run verificar && npm run build`
Esperado: tudo verde; `dist/` gerado; 23 arquivos de teste, 673 passando | 9 pulados (682).

- [ ] **Step 2: Atualizar o roteiro**

Em `docs/superpowers/roteiro.md`, troque a linha da fase 4 por (use a data do dia):

```markdown
| 4 · Índices: rotina central e monitoramento | rotina central diária no repositório, congelamento por cálculo, calendário de divulgação, monitoramento gratuito | concluída em AAAA-MM-DD · plano: `docs/superpowers/plans/2026-10-12-fase-4-indices-rotina-central.md` |
```

troque a situação da fase 5 de "pendente" para "plano a escrever", e acrescente à seção "Insumos que dependem do responsável", logo depois do item "Criação do repositório privado no GitHub e da conta no Cloudflare Pages (…)":

```markdown
- Rotina de índices e monitoramento, feitos uma vez na fase 7, com o repositório no GitHub:
  - criar no Healthchecks.io (plano gratuito) uma verificação com agendamento "0 7 * * 1-5", fuso America/Sao_Paulo e tolerância de 1 dia, e guardar o endereço de sinal no segredo `HC_URL` do repositório;
  - ligar no Cloudflare Pages o aviso por e-mail de publicação com falha;
  - não exigir pull request para gravar na `main` (a rotina grava direto, depois das conferências automáticas);
  - rodar a rotina à mão ("Run workflow" em "Atualizar índices do BCB") e conferir o resumo, o commit do robô e a publicação do site (se o resumo mostrar as seis séries como "sem mudança", não há commit para conferir, e o passo "Ver se algum arquivo mudou" diz "Nenhum arquivo de dados/ mudou; nada a gravar.": repita num dia útil depois das 19h, quando a SELIC do dia já saiu); só se o commit não publicar, criar o deploy hook da `main` no Cloudflare e guardá-lo no segredo `CF_DEPLOY_HOOK`;
  - opcional: ampliar para 400 dias a guarda do histórico de execuções (Settings > Actions > General), antes da primeira execução;
  - depois de um e de três meses, revisar com o Claude os relatórios em `docs/monitoramento/` e decidir se muda horário ou agendador.
- Teste na rede da Defensoria: com o site publicado (fase 7), abrir o Apura num computador da instituição; o app não acessa mais o BCB, então basta que a rede alcance o site.
```

- [ ] **Step 3: Atualizar o `CLAUDE.md`**

Seção "Estado": substitua a seção inteira (o título e o parágrafo) pelo bloco abaixo; use a data do dia:

```markdown
## Estado

Fase 4 (índices: rotina central e monitoramento) concluída em AAAA-MM-DD: o app não consulta o BCB e
lê só a cópia publicada com o site; uma rotina do GitHub Actions, ativa a partir da fase 7 (de
segunda a sexta, 10h47, 14h17 e 22h47 de Brasília), baixa as seis séries, grava série por série só o
que mudou, confere tudo com `npm run verificar` e faz commit descritivo na `main`; congelamento por
cálculo (`congelarIndices`, síncrono), com a data real dos índices no horário de Brasília, rodapé e
avisos do calendário ("ainda não chegou ao Apura"); aviso ao reabrir com os índices que mudaram
(`compararIndicesUsados`); avisos do motor "ainda sem divulgação na data da consulta", com a
previsão, quando a tabela traz `esperadoAte`; mês parcial da SELIC deduzido do `obtidoEm` do próprio
valor; monitoramento gratuito (resumo de cada execução, alarme de silêncio no Healthchecks.io,
relatório mensal em `docs/monitoramento/`); respostas reais do SGS gravadas para os testes. Os dois
workflows só são testados na fase 7. Próxima: fase 5 (interface), com plano a escrever. A tabela de
fases do roteiro é a referência; atualize-a e esta seção ao concluir cada fase.
```

Na tabela de comandos, troque a linha de `npm run indices:atualizar` por estas duas:

```markdown
| `npm run indices:atualizar` | baixa as séries do BCB para `dados/indices/` (é o que a rotina diária roda); grava série por série só o que mudou; `-- 189 433` limita às séries indicadas |
| `npm run indices:relatorio -- AAAA-MM <execucoes.json>` | monta o relatório mensal da rotina em `docs/monitoramento/` (é o que o workflow mensal roda) |
```

e acrescente, logo depois da tabela de comandos, o parágrafo:

```markdown
Depois da fase 7, a `main` do GitHub recebe commits do robô quase todo dia útil (`dados/indices/`)
e, no dia 2 de cada mês, o relatório da rotina (`docs/monitoramento/`): traga essas atualizações
para a `main` local antes de integrar uma branch, e não rode `npm run indices:atualizar` em
branches de trabalho.
```

No "Mapa de pastas" (a segunda coluna começa na posição 27, depois de 26 caracteres), faça as mudanças uma linha de cada vez:

1. Insira como primeira linha do bloco, antes de `dados/indices/`:

```
.github/workflows/        atualizar-indices.yml (rotina de índices, seg–sex) · relatorio-indices.yml (relatório mensal)
```

2. Insira, logo depois da linha de `docs/superpowers/plans/`:

```
docs/monitoramento/       relatórios mensais da rotina de índices (gerados pelo workflow)
```

3. Troque a linha de `scripts/` por:

```
scripts/                  atualizar-indices.ts · relatorio-indices.ts (com o teste dele)
```

4. Troque a linha de `src/compartilhado/` por:

```
src/compartilhado/        decimal.ts · datas.ts · formatacao.ts · tipos.ts · divulgacao.ts
```

5. Troque a linha de `src/indices/` por:

```
src/indices/              series.ts · cliente-bcb.ts · arquivo-serie.ts · embutidos.ts · calendario.ts · relogio.ts · congelar.ts · atualizacao.ts · relatorio.ts
```

6. Troque a linha de `src/indices/testes/` por:

```
src/indices/testes/       respostas reais do SGS gravadas em 10 e 11/10/2026 e execuções sintéticas da rotina
```

Na regra 4 ("Motor puro"), acrescente ao fim do parágrafo:

```markdown
O app também não acessa a rede: lê só a cópia publicada dos índices. Em `src/indices/`, a rede e o
relógio da rotina e do relatório entram por parâmetro com valor padrão, e o disco entra como objeto
passado pelo script, para que nenhum teste use a rede; disco, git e argumentos ficam nos scripts de
`scripts/`, os únicos com os tipos do Node; `new Date()` só em `src/indices/relogio.ts`.
```

Na regra 6 ("Nenhum índice inventado"), substitua o texto depois do título em negrito por:

```markdown
Só séries do BCB/SGS, baixadas pelo script de índices (normalmente pela rotina central); cada valor
carrega série, competência, fonte e data de obtenção (no horário de Brasília nas gravações a partir
da fase 4; os arquivos anteriores trazem UTC, e as datas são sempre comparadas pelo instante, com
`compararInstantes`); não há inserção manual no MVP.
```

Na seção "Como registrar um caso de referência", acrescente ao fim do item de `indices`:

```markdown
Num caso com SELIC no mês da consulta, o `obtidoEm` do valor desse mês deve cair nesse mês (é ele
que marca o mês parcial). `esperadoAte` é opcional. Sem ele, o mês que falta sai com o aviso
genérico ("não disponível na tabela de índices"; no salário mínimo, "ainda não publicado na tabela
de índices"). Com ele, o mês posterior ao esperado sai como "ainda sem divulgação na data da
consulta (previsão: …)" (no salário mínimo, "ainda não publicado na data da consulta (previsão:
…)"), e o mês já esperado que falta continua "não disponível na tabela de índices" (no salário
mínimo, "não consta na tabela de índices", com o último anterior disponível).
```

No bloco de comandos do `README.md`, logo depois da linha de `indices:atualizar`, acrescente:

```bash
npm run indices:relatorio -- 2026-10 execucoes.json   # relatório mensal da rotina (normalmente feito pelo workflow)
```

e, logo depois do bloco de comandos, o parágrafo:

```markdown
Os índices do BCB são atualizados por uma rotina do GitHub Actions
(`.github/workflows/atualizar-indices.yml`); o app não consulta o BCB. Depois da fase 7, a `main`
recebe commits dessa rotina quase todo dia útil.
```

- [ ] **Step 4: Registrar as decisões no design**

Em `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md`:

- §3.1: troque "- Índices oficiais do BCB/SGS com cópia embutida, atualização silenciosa e congelamento por cálculo." por "- Índices oficiais do BCB/SGS publicados com o site e atualizados por uma rotina central diária no repositório, com congelamento por cálculo."
- §4.1: acrescente ao fim do parágrafo "Verificação feita em 10/10/2026: …": " Desde a fase 4 (decisão de 12/10/2026), o app não chama o BCB: uma rotina central no repositório baixa os índices e o site é republicado."
- §4.2, linha de `indices/`: troque o texto da coluna do meio por "Cópia embutida das séries (publicada com o site), congelamento por cálculo e calendário de divulgação, que entregam uma tabela de índices ao motor; fora do app, a rotina central (cliente da API do BCB, script e workflow) e o relatório mensal da rotina."
- §4.3: troque o item 1 por "1. Ao abrir o app ou iniciar um novo cálculo, `indices/` congela a tabela de índices da cópia publicada com o site (§8), sem nenhuma consulta externa."
- §5.1: troque "Ao reabrir, o Apura recalcula com os índices atuais e avisa se algum índice usado mudou." por "Ao reabrir, o Apura recalcula com os índices atuais e avisa, por série e mês, qual índice usado mudou, qual passou a entrar e qual deixou de constar, comparando `resultado.indicesUsados` do arquivo com o do recálculo (decisão de 11/10/2026, fase 4); o arquivo não guarda a tabela inteira."
- §5.4: acrescente, logo antes do título "### 5.5 Armazenamento no navegador", o parágrafo:

```markdown
Desde a fase 4, `consultaIndices.em` é a data de obtenção mais recente entre os arquivos da cópia
publicada, comparada pelo instante (no horário de Brasília nas gravações da rotina; os arquivos
anteriores à fase 4 trazem UTC), e o `fonte` de cada item de `indicesUsados` é sempre `"embutida"`
(o valor `"aoVivo"` fica reservado no tipo).
```

- §5.5: apague a linha "- **Cache de índices** (§8)."
- §6.3, item do percentual do salário mínimo: acrescente ao fim do item, depois de um espaço, a frase:

```markdown
Com o calendário na tabela (fase 4), o mês posterior ao esperado sai como "ainda não publicado na data da consulta", com a previsão, e o mês já esperado que falta (buraco de dados) sai como "não consta na tabela de índices", com o último anterior disponível.
```

- §8.1, no parágrafo "Fatos verificados em 10/10/2026: …": troque "(validar o tipo de conteúdo)" por "(decidir pelo corpo da resposta, não pelo tipo de conteúdo)" e "(tempo-limite de 30 s e nova tentativa com espera crescente)" por "(na rotina: 30 s, até três tentativas, 2 s de espera)", e acrescente ao fim do parágrafo: " Reverificados em 11 e 12/10/2026: intervalo sem dados devolve `{"erro":{"statusCode":404,"detail":"…Value(s) not found"}}` (não lista vazia), às vezes com status 200; data inválida devolve 400 em JSON; o 406 não se reproduziu e é tratado como qualquer objeto de erro do SGS; série inexistente e bloqueio devolvem HTML com status 200; houve um 502 em HTML e uma resposta de 9,8 s; a API não informa quando carregou cada valor. O cliente decide pelo corpo da resposta, nunca pelo cabeçalho `content-type` nem só pelo status."
- §8.2: troque o título por "### 8.2 Rotina central, sem botão para o usuário e sem inserção manual" e os itens 1 a 3 por:

```markdown
1. **Cópia publicada com o site**: um arquivo JSON por série em `dados/indices/`, com `obtidoEm` (horário de Brasília) e endereço de origem, gravado pela rotina central: o workflow `atualizar-indices.yml` roda de segunda a sexta às 10h47, 14h17 e 22h47 de Brasília (e pelo botão "Run workflow"), baixa o histórico de cada série pelo script `scripts/atualizar-indices.ts`, confere, grava só as séries que mudaram (uma série com problema não trava as outras), roda as conferências automáticas, faz commit descritivo na `main`, e o site é republicado. O próprio repositório é o registro histórico das atualizações.
2. **O app não consulta o BCB**: lê só a cópia publicada, sem rede e sem armazenamento no navegador (decisão de 12/10/2026, que substituiu a busca ao vivo e o cache no navegador previstos antes).
3. **Congelamento por cálculo**: a tabela de índices usada por um cálculo é fixada quando ele começa: é a cópia publicada lida nesse momento, com o calendário do dia. Os números não mudam enquanto o usuário digita, e a data-hora impressa no relatório é a da obtenção dos índices, no horário de Brasília. Cálculo novo pega a cópia mais recente; cálculo reaberto é recalculado com os índices atuais, com aviso se algum mudou.
```

- §8.3: troque "fonte (cópia embutida ou ao vivo)" por "fonte (cópia publicada)". Troque o item do rodapé (o que começa por "- Único sinal na tela, no rodapé, sem botão:") por:

```markdown
- Único sinal na tela, no rodapé, sem botão: "Índices oficiais BCB/SGS · IPCA até set/2026 · atualizados em 09/10/2026 14:17 (horário de Brasília)", com a data da obtenção mais recente da cópia publicada. A caixa de avisos recebe os avisos do calendário, por exemplo em 16/11/2026, com a cópia ainda de 09/10/2026: "IPCA de out/2026, divulgado por volta de 10/11/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 09/10/2026."
```

E troque o item do calendário (o que começa por "- Calendário de divulgação") por:

```markdown
- Calendário de divulgação conhecido pelo app, para avisos em português claro e só para avisos: IPCA e INPC esperados a partir do dia 15 do mês seguinte (divulgação por volta do dia 10); IGP-M a partir do dia 5 do mês seguinte (divulgação no fim do próprio mês); taxa legal e SELIC parcial a partir do dia 5 do próprio mês; salário mínimo do ano inteiro a partir de fevereiro. A tabela congelada leva ao motor o último mês esperado de cada série (`esperadoAte`), e os avisos distinguem o mês posterior ao esperado, "ainda sem divulgação na data da consulta", com a previsão (no salário mínimo, "ainda não publicado na data da consulta"), do mês já esperado que falta, "não disponível na tabela de índices" (no salário mínimo, "não consta na tabela de índices"), que indica buraco de dados ou cópia desatualizada.
```
- Ao fim da §8 (antes da linha `---` que precede "## 9. Interface"), acrescente:

```markdown
**Decisões registradas em 11 e 12/10/2026 (fase 4).** Rotina central no lugar da busca no navegador (12/10/2026), seguindo a prática dos tribunais e da Justiça do Trabalho e Federal, que mantêm os índices de forma central: o app só lê a cópia publicada; a rotina roda de segunda a sexta às 10h47, 14h17 e 22h47 de Brasília (minutos "quebrados", porque o início de cada hora é o pico em que o GitHub atrasa ou descarta execuções), alinhada à publicação do IGP-M (8h), do IPCA e INPC (9h), da taxa legal (entre 8h30 e o início da tarde do 1º dia útil) e da SELIC (até 19h). Gravação série por série, conferências automáticas antes de gravar, commit descritivo como registro histórico, série sem mudança não regravada. Na SELIC, a mudança do mês corrente ou do seu fechamento é informativa; só a mudança de mês fechado é revisão ("Atenção"). Monitoramento gratuito: resumo de cada execução, alarme de silêncio no Healthchecks.io (e-mail se um dia útil passar sem rodada bem-sucedida), relatório mensal em `docs/monitoramento/`; ajustes de horário ou de agendador só com o responsável, após revisão com os relatórios. Revogadas: o cache no navegador e a busca ao vivo (D1, D2 e D8 de 11/10/2026, na tabela de decisões do plano da fase 4). Mantidas: horário de Brasília para datas de obtenção e consulta (texto com "-03:00", exibido como "(horário de Brasília)"); tabela congelada na memória e arquivo guardando o `Resultado`; aviso de índice mudado por série e mês, com o salário mínimo nomeado; calendário com dia aproximado, só para avisos. Mudanças no motor: o mês parcial da SELIC é o mês de `obtidoEm` do próprio valor, e os avisos dizem "ainda sem divulgação na data da consulta (previsão: …)" quando a tabela traz `esperadoAte`. Limites aceitos: a SELIC parcial continua entrando inteira (ou rateada, se o lançamento começou no mesmo mês) quando um termo final próprio cai antes do dia da consulta no mesmo mês; o mês corrente da SELIC é tratado como parcial até a primeira atualização gravada no mês seguinte (os dois só alcançam metodologias personalizadas com SELIC única até o mês corrente); os dias do calendário são aproximados; o agendador do GitHub pode atrasar horas, e por isso é medido.
```

- §10.4, item "Fontes e arredondamento": troque "Índices consultados em dd/mm/aaaa no Sistema Gerenciador de Séries Temporais do Banco Central (séries …)." por "Índices do Sistema Gerenciador de Séries Temporais do Banco Central (séries …), atualizados em dd/mm/aaaa hh:mm (horário de Brasília)." A frase final é definida na fase 6; não copie esta observação para o design.
- §11: troque o item que começa por "- **Índices**: parser e cliente testados" por:

```markdown
- **Índices**: cliente, rotina central e relatório mensal testados sem rede, com respostas gravadas do BCB (ordem invertida, mês corrente parcial, HTML em vez de JSON, página 502, erros 400 e 404 em JSON; o 406, que não se reproduziu em 2026, com corpo sintético) e uma lista sintética de execuções no formato da API do GitHub; propriedade: a mesma tabela não gera aviso de índice mudado.
```
- §12.2: troque a linha `  src/compartilhado/        decimal.ts · datas.ts · formatacao.ts · tipos.ts` por `  src/compartilhado/        decimal.ts · datas.ts · formatacao.ts · tipos.ts · divulgacao.ts`; troque a linha `  .github/workflows/        testes.yml · publicar.yml · atualizar-indices.yml` por `  .github/workflows/        testes.yml · publicar.yml · atualizar-indices.yml · relatorio-indices.yml`; acrescente, logo depois da linha `  docs/superpowers/plans/   planos de implementação`, a linha `  docs/monitoramento/       relatórios mensais da rotina de índices`; troque `  scripts/                  atualizar-indices.ts` por `  scripts/                  atualizar-indices.ts · relatorio-indices.ts`; e troque `  src/indices/              series.ts · cliente-bcb.ts · cache.ts · congelar.ts · calendario.ts` por `  src/indices/              series.ts · cliente-bcb.ts · arquivo-serie.ts · embutidos.ts · calendario.ts · relogio.ts · congelar.ts · atualizacao.ts · relatorio.ts`.
- §12.3: troque "`npm run indices:atualizar`)" por "`npm run indices:atualizar`, `npm run indices:relatorio`)".
- §13: troque "- Rotina mensal de índices (GitHub Actions): executa o script, abre commit com os JSON atualizados e dispara a publicação." por "- Rotina central de índices (GitHub Actions), de segunda a sexta às 10h47, 14h17 e 22h47 de Brasília: executa o script, grava na `main` as séries que mudaram (depois das conferências automáticas), e o site é republicado. Monitoramento gratuito: resumo de cada execução; alarme de silêncio no Healthchecks.io (e-mail se um dia útil passar sem rodada bem-sucedida); relatório mensal em `docs/monitoramento/` (workflow `relatorio-indices.yml`, dia 2); ajustes de horário ou de agendador só com o responsável."
- §14: troque "- Única comunicação de rede: GET à API pública do BCB, sem dados do cálculo na requisição." por "- O app não faz nenhuma comunicação de rede além de carregar o próprio site; quem consulta a API pública do BCB é a rotina central no repositório (decisão de 12/10/2026). A rotina também envia um sinal sem conteúdo ao Healthchecks.io e, se configurado, aciona o deploy hook do Cloudflare; os endereços ficam em segredos do repositório e só entram nos passos que os usam."
- §15: troque as duas linhas da tabela que começam por "| API do BCB lenta, fora do ar ou bloqueada na rede institucional |" e "| BCB mudar o formato ou o CORS da API |" por estas três:

```markdown
| API do BCB lenta, fora do ar ou inacessível para o GitHub | três rodadas por dia útil; gravação série por série; o app segue com a cópia publicada; alarme de silêncio; script executável à mão |
| BCB mudar o formato da API | decisão pelo corpo da resposta, validada por testes com respostas gravadas; a cópia publicada garante a operação; o script isola a mudança |
| Agendador do GitHub atrasado ou que descarta execuções | minutos "quebrados", três rodadas, alarme de silêncio e relatório mensal; se preciso, disparo por outro agendador (decisão com o responsável) |
```

- §16: troque "4. **Índices ao vivo**: cliente BCB, cache, congelamento por cálculo, calendário, rotina mensal." por "4. **Índices: rotina central e monitoramento**: rotina central diária no repositório, congelamento por cálculo, calendário de divulgação, monitoramento."

- [ ] **Step 5: Registrar as pendências desta fase**

Acrescente a este plano, antes de "Auto-revisão do plano", a seção "Pendências registradas na execução da fase 4" com os achados das revisões que ficaram para fases seguintes ou como melhorias menores, agrupados por destino, e as decisões tomadas na execução (modelo: a seção homônima do plano da fase 3). Inclua, no mínimo:

- **Fase 5:** a tela chama `congelarIndices()` ao abrir o app e em "Novo cálculo", mostra `situacao.rodape` e `situacao.avisos` (além de `resultado.avisos`), e ao abrir um arquivo mostra `compararIndicesUsados`; validar o arquivo aberto (`dataValida` e `competenciaValida` recebem texto: conferir `typeof … === "string"` antes).
- **Fase 6:** a frase de fontes do relatório usa `resultado.consultaIndices.em` com `formatarDataHoraBrasilia`; a SELIC parcial é o `IndiceUsado` da série 4390 cuja `competenciaDe(obtidoEm)` é igual à competência, impressa com a data de obtenção do próprio valor.
- **Fase 7:** a lista da seção "Insumos que dependem do responsável" do roteiro (Healthchecks, aviso do Cloudflare, `main` sem exigência de pull request, primeira execução manual, deploy hook só se preciso, revisões após um e três meses); conferir se os executores do GitHub alcançam o BCB.
- **Sem fase:** as fixtures `src/motor/testes/*.ts` com `obtidoEm` fixo em 12:00Z; um aviso do motor quando o mês parcial da SELIC não for o mês final do lançamento; os padrões de `buscarSerie` (20 s, duas tentativas, 3 s), herdados do plano anterior e não usados (a rotina passa `BUSCA_DO_SCRIPT`: 30 s, três tentativas, 2 s); o motor deduz o mês parcial da SELIC pelo texto de `obtidoEm`, e a rotina, pelo mês em Brasília (só diferem num arquivo em UTC gravado na última noite do mês, o que não ocorre depois da fase 4).

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/roteiro.md CLAUDE.md README.md docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md docs/superpowers/plans/2026-10-12-fase-4-indices-rotina-central.md
git commit -m "docs: fase 4 concluída no roteiro, no CLAUDE.md e no design

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

- [ ] **Step 7: Integrar o trabalho**

Use a skill `superpowers:finishing-a-development-branch`: o repositório ainda não está no GitHub, então a integração é local (merge da branch de trabalho na `main`, com commit de merge, feito pela pasta principal, como nas fases 1 a 3), e a decisão é do responsável.


## Notas para as fases seguintes (ganchos deixados por esta fase)

- **Fase 5 (interface).** Ao abrir o app e em "Novo cálculo", a tela chama `congelarIndices()`, que é síncrona e sem rede, e usa a `tabela` devolvida até o próximo "Novo cálculo" ou "Abrir…" (§8.2, item 3: os números não mudam enquanto o usuário digita). O rodapé mostra `situacao.rodape`; a caixa de avisos recebe `situacao.avisos` (meses já divulgados que ainda não chegaram ao Apura) além de `resultado.avisos`. Em "Abrir…": ler o arquivo, recalcular com a tabela congelada e mostrar `compararIndicesUsados({ indicesUsados: arquivo.resultado.indicesUsados, consultadoEm: arquivo.resultado.consultaIndices.em }, { indicesUsados: novo.indicesUsados, consultadoEm: novo.consultaIndices.em })`. "Esquecer" (§5.5) não envolve índices: o app não guarda nada deles no navegador. Validar na abertura de arquivo o `formato`, as datas e os textos decimais: `textoDecimalValido` aceita `unknown`; `dataValida` e `competenciaValida` recebem texto (conferir `typeof … === "string"` antes, como faz `ehValorMensalValido`).
- **Fase 6 (relatório).** "Fontes e arredondamento" imprime `resultado.consultaIndices.em` com `formatarDataHoraBrasilia` e o sufixo "(horário de Brasília)"; é a obtenção mais recente entre as séries da cópia publicada. A matriz de índices lê `indicesUsados`; a SELIC parcial é o `IndiceUsado` da série 4390 cuja `competenciaDe(obtidoEm)` é igual à competência, impressa como acumulado parcial obtido do BCB em `formatarDataHoraBrasilia(obtidoEm)` desse `IndiceUsado` (e não com `consultaIndices.em`, que pode ser de outra série, gravada numa rodada posterior). Os meses "ainda sem divulgação na data da consulta" vêm com esse texto e a previsão nos avisos de cada lançamento (§6.4, item 3); `resultado.avisos` traz só resumos, sem a previsão ("Meses ainda sem divulgação na data da consulta (entraram sem correção): …" e, na taxa legal, "Meses de taxa legal ainda sem divulgação (…)"). O rodapé de `SituacaoIndices` é o da tela, não o do relatório.
- **Fase 7 (publicação).** Seguir a lista "Rotina de índices e monitoramento" dos insumos do roteiro. O commit do robô é feito com o token padrão do GitHub (`GITHUB_TOKEN`), e eventos gerados com ele não disparam outros workflows por "push": a integração Git do Cloudflare Pages (§13) publica mesmo assim, porque não é um workflow; se a publicação for feita por um workflow `publicar.yml`, ele precisa reagir com `on: workflow_run` ao término de "Atualizar índices do BCB", ou usar o deploy hook (`CF_DEPLOY_HOOK`). Conferir na primeira execução manual se os executores do GitHub alcançam o BCB e repetir o teste da rede institucional com o site publicado. A partir daí, a `main` do GitHub recebe commits do robô quase todo dia útil: antes de integrar uma fase, trazer essas atualizações (`git pull`) e só então fazer o merge.
- **Depois de um e de três meses de rotina.** Revisar com o responsável os relatórios de `docs/monitoramento/`: se as referências não forem cumpridas (dia útil sem rodada bem-sucedida, atraso típico acima de uma hora), as saídas, nessa ordem de simplicidade, são mudar os minutos ou acrescentar uma rodada; disparar a rotina por outro agendador gratuito (pelo botão de disparo da API do GitHub); ou rodar o script num computador da Defensoria.
- **Novas séries (visão do produto).** Um índice novo do SGS entra no tipo `CodigoSerie` e em `NOME_DA_SERIE` (`tipos.ts`), em `series.ts`, em `SERIES_EM_ORDEM_NUMERICA`, `ultimoMesEsperado` e `esperadoAte` (`calendario.ts`), em `divulgacaoPrevista` (`divulgacao.ts`), em `SERIES_FEMININAS` (`congelar.ts`, quando o nome da série é feminino: dá a concordância de "divulgada" nos avisos) e na importação de `embutidos.ts`; o arquivo `dados/indices/<codigo>.json` é criado com `npm run indices:atualizar -- <codigo>` antes do commit (sem ele, `embutidos.ts` não compila); daí em diante, a rotina o mantém sem outra mudança.
- **Inserção excepcional de índices (visão, §4.3).** Não pode ser feita editando `dados/indices/*.json`: a rotina regrava a série do BCB e trataria o valor como revisão. Quando existir, fica numa camada própria (arquivo separado, com autoria e motivo), aplicada sobre a cópia publicada no congelamento.

### Pendências registradas na execução da fase 4

Achados que ficaram para fases seguintes ou como melhorias menores, agrupados por destino, e as decisões tomadas na execução. Os itens abaixo reúnem os ganchos já conhecidos ao escrever o plano, os achados das revisões e os da revisão final que ficaram registrados:

**Fase 5**

- A tela chama `congelarIndices()` ao abrir o app e em "Novo cálculo" (síncrona, sem rede) e usa a tabela devolvida até o próximo "Novo cálculo" ou "Abrir…". Mostra `situacao.rodape` no rodapé e `situacao.avisos` na caixa de avisos, além de `resultado.avisos`.
- Ao abrir um arquivo, a tela recalcula com a tabela congelada e mostra o resultado de `compararIndicesUsados`, passando `resultado.consultaIndices.em` do arquivo como `consultadoEm`. A função também exige o `consultadoEm` do recálculo, embora não o use.
- Validar o arquivo aberto antes de usá-lo: `formato`, datas e textos decimais. `dataValida` e `competenciaValida` recebem texto: conferir `typeof … === "string"` antes, como faz `ehValorMensalValido`.
- Conferir também os códigos de série de `indicesUsados` antes de `compararIndicesUsados`. Um código desconhecido (só pode vir do arquivo salvo) cai entre os índices que saíram, e `listarPorSerie` percorre só `SERIES_EM_ORDEM_NUMERICA`: o código some da frase sem aviso, e a frase pode sair com a lista vazia ("… que não constam mais na tabela: .").
- `seriesEmbutidas` devolve uma cópia rasa dos JSON importados (mesmos objetos e listas): nenhum consumidor deve alterar `valores` no lugar.

**Fase 6**

- A frase de fontes do relatório usa `resultado.consultaIndices.em` com `formatarDataHoraBrasilia` e o sufixo "(horário de Brasília)".
- A SELIC parcial é o `IndiceUsado` da série 4390 cuja `competenciaDe(obtidoEm)` é igual à competência. Sai impressa com a data de obtenção do próprio valor, e não com `consultaIndices.em`, que pode ser de outra série.
- A memória do reajuste não aplicado diz "não disponível" mesmo quando os meses que faltam estão só "ainda sem divulgação", e a janela mista usa palavras diferentes no aviso e no resumo. O relatório pode mostrar palavras diferentes para o mesmo mês: padronizar o texto ou ajustar o motor.

**Fase 7**

- Seguir a lista "Rotina de índices e monitoramento" da seção "Insumos que dependem do responsável" do roteiro: verificação no Healthchecks.io com o segredo `HC_URL`; aviso por e-mail de publicação com falha no Cloudflare Pages; `main` sem exigência de pull request; primeira execução manual com conferência do resumo, do commit do robô e da publicação; deploy hook (`CF_DEPLOY_HOOK`) só se o commit não publicar; revisão dos relatórios de `docs/monitoramento/` depois de um e de três meses.
- Conferir se os executores do GitHub alcançam o BCB (na primeira execução manual) e repetir o teste da rede institucional com o site publicado.
- Na primeira execução agendada, conferir que a chave `timezone` é aceita (horário de Brasília) e que `github.event.schedule` traz só a expressão cron. Uma execução manual fora da `main` aparece como "skipped" na lista de execuções do GitHub (no relatório mensal, como "não executada (disparada fora da main)", sem minutos).
- Conferir o `display_title` das primeiras execuções contra o `cron` de `RODADAS`, a conclusão de execução pulada e de estouro de tempo, o efeito de `[CF-Pages-Skip]` e o filtro `created` do `gh api`.
- Avaliar fixar `actions/checkout@v6` e `actions/setup-node@v6` por SHA, com Dependabot: hoje estão por tag móvel num job com `contents: write`.
- Token de escrita: o `actions/checkout` grava o `GITHUB_TOKEN` com `contents: write` (`persist-credentials: true`), e o token fica legível no `npm ci` e no `npm run verificar`, que rodam código de terceiros; o mesmo vale para `relatorio-indices.yml`. Proposta, junto com a fixação das actions por SHA: `persist-credentials: false`; `npm ci --ignore-scripts` (o único script de instalação no lockfile é o do fsevents, opcional e só do macOS); e a credencial posta só no passo de gravação, com `GH_TOKEN: ${{ github.token }}` e `git remote set-url`.
- O passo "Sinalizar problema nas séries" (`atualizar-indices.yml`) tem `if: steps.baixar.outcome == 'failure'`, com o `success()` implícito: quando as conferências, a gravação ou o deploy hook também falham, o passo é pulado e some a mensagem de que alguma série não foi atualizada. Correção: `if: always() && steps.baixar.outcome == 'failure'`.
- O resumo da execução é escrito antes das conferências e da gravação e nunca é completado: quando o `npm run verificar` ou o envio falham, ele continua listando as séries que mudaram, embora nada tenha sido gravado. Proposta: pôr `id: conferir` no passo de conferências e acrescentar, depois de "Gravar na main", um passo `if: always()` que escreva o desfecho no resumo ("Gravado na main: <commit>", "Nada foi gravado: as conferências falharam…", "Nenhum arquivo mudou; nada foi gravado."); o `if: always()` não altera o `success()` implícito do sinal ao Healthchecks. Se for adotada, o roteiro (primeira execução manual) pode passar a citar a frase do resumo; hoje ele manda reconhecer a execução sem mudança pelas seis séries "sem mudança" no resumo e pela frase do passo "Ver se algum arquivo mudou".
- Nenhum workflow confere os envios humanos à `main`. Um envio que quebre o `npm run verificar` (teste quebrado, merge mal resolvido ou `dados/indices/*.json` corrompido) trava a gravação das seis séries em todas as rodadas, porque as conferências rodam sobre a ponta da `main`. O `testes.yml` já previsto na §12.2 do design resolve: `on: push` na `main` e em `pull_request`, `permissions: contents: read`, `npm ci` e `npm run verificar` (os envios do robô não o disparam). Ajustar também o comentário de `atualizarSeries` (`atualizacao.ts`) e o texto deste plano: "arquivo ilegível fica como estava, sem impedir as outras" só vale dentro do script; na rotina, um arquivo ilegível já na `main` bloqueia as conferências.
- Nada confere que o site publicado tem a cópia da `main`. Uma integração Git do Cloudflare que deixa de disparar não gera build com falha nem e-mail; o Healthchecks fica verde e o relatório mensal continua contando as atualizações gravadas. Proposta: gerar no build um arquivo de versão (ex.: `versao-indices.json`, com o maior `obtidoEm`) e compará-lo com o da `main` no início de cada rodada.

**Sem fase (melhorias menores)**

- As fixtures `src/motor/testes/*.ts` continuam com `obtidoEm` fixo em UTC: `regime-novo.ts` com 2026-10-11T12:00Z e `indices-igpm-2017-2018.ts` com 2026-10-10T00:00Z.
- Falta um aviso do motor para o mês parcial da SELIC que não é o mês final do lançamento (hoje só o design registra esse limite).
- Os padrões de `buscarSerie` (20 s, duas tentativas, 3 s) vêm do plano anterior e não são usados: a rotina passa `BUSCA_DO_SCRIPT` (30 s, três tentativas, 2 s).
- O motor deduz o mês parcial da SELIC pelo texto de `obtidoEm`, e a rotina, pelo mês em Brasília. Só diferem num arquivo em UTC gravado na última noite do mês, o que não ocorre depois da fase 4.
- As opções numéricas de `buscarSerie` não são validadas por completo (`tentativas` infinito; `tempoLimiteMs` NaN, negativo ou fracionário faz `AbortSignal.timeout` lançar). A única chamadora passa constantes.
- `textoDecimalValido`, com o predicado `texto is TextoDecimal`, estreita para `never` um argumento já `string` no ramo falso; nenhum chamador usa esse ramo. A saída é um tipo nominal ou uma sobrecarga.
- `FORMATO_VALOR` (`cliente-bcb.ts`) duplica `FORMATO_TEXTO_DECIMAL` (`decimal.ts`): unificar com `textoDecimalValido`.
- Relógio: a reserva sem `longOffset` escreve "-03:00" com a hora do fuso real (errado só com horário de verão e `Intl` sem `longOffset`; o Node 22 tem `longOffset` e Brasília não tem horário de verão desde 2019). `compararInstantes` não confere `dataValida` (o V8 aceita "2026-02-30T…Z") e, com texto sem fuso misturado a instantes, a comparação textual não é uma ordem total. `horarioAgendado` (`relatorio.ts`) fixa "-03:00" e `relatorio.ts` repete o leitor de data-hora ISO de `relogio.ts`. Só importam com `obtidoEm` malformado, arquivo editado à mão ou horário de verão de volta.
- `new Date()` só deve aparecer em `src/indices/relogio.ts`, mas nenhuma regra do ESLint impõe isso fora do motor. Conferido por busca ao fim da fase (12/10/2026): fora dos testes, só `relogio.ts` o usa.
- `SERIES_EM_ORDEM_NUMERICA` e `esperadoAte` (`calendario.ts`) repetem as seis séries à mão; a nota "Novas séries" manda atualizar as duas.
- `lerArquivoSerie` não confere que `nome` e `origem` são texto antes do cast (ninguém lê esses campos), e a mensagem de item inválido usa a competência vazia como veio ("… inválido em .").
- `montarTabela` (`congelar.ts`) e `tabelaEmbutida` (`embutidos.ts`) são duas montagens da tabela com regras um pouco diferentes (`tabelaEmbutida` só tem uso em testes). `montarTabela` e `OpcoesCongelamento.embutidas` são tipadas como `Record` completo, embora aceitem série ausente.
- Com `anterior.consultadoEm` vazio ou inválido, as frases ao reabrir saem truncadas ("… de ."); só ocorre com a cópia publicada sem arquivos.
- No relatório mensal, uma reexecução feita dias depois ("Re-run all jobs") credita o sucesso ao dia agendado e apaga a falha original, porque a API dá uma entrada por id, com a conclusão da última tentativa (`semRepeticoes`, `relatorio.ts`). Proposta: só creditar o dia quando `tentativa === 1` ou quando a tentativa vencedora começou nesse dia (`emBrasilia(iniciadaEm)?.data === dia`), com um teste; e dizer na nota das reexecuções que elas podem esconder falhas de dias anteriores.
- A frase "A série X encolheu: …" (`atualizacao.ts`) não diz o que fazer, diferente da do arquivo ilegível, que traz `comoRestaurar`. Proposta: acrescentar "se o BCB mantiver a lista menor, apague dados/indices/<codigo>.json para baixar a série inteira de novo".
- Design, §6.4 (ajuste de rótulo a fazer com o responsável, porque a §6.4 fica ao lado do ponto 1 da §7, ainda aberto): no item 3 da correção monetária, "o relatório lista o mês como 'ainda não divulgado'" já não é o texto do motor, que diz "ainda sem divulgação na data da consulta", com a previsão, quando a tabela traz `esperadoAte`, e "não disponível na tabela de índices" nos demais casos; o pro rata do mês final (ponto 1 da §7) fica como está. Na SELIC única, registrar que o mês parcial é, desde a fase 4, o do `obtidoEm` do próprio valor (`correcao.ts`).
- Lacunas de teste e de organização: a regra "mês presente posterior a `esperadoAte` não vira aviso" só tem teste para o salário mínimo; o teste da espera padrão (`setTimeout`) não verifica o valor passado; no último `describe` de `cliente-bcb.test.ts`, "html" e "json" sombreiam auxiliares de mesmo nome; há um nome de teste impreciso em `arquivo-serie.test.ts` e um caso de `lerArquivoSerie` ainda em `embutidos.test.ts`; a importação de `divulgacao.ts` fica fora do agrupamento nos três arquivos do motor; a variável `marco` de `base.test.ts` tem base de novembro.
- Linhas de comentário longas em `scripts/atualizar-indices.ts` e no workflow `atualizar-indices.yml` (o Prettier não quebra comentários).

**Decisões tomadas na execução**

- O trailer de coautoria de cada commit nomeia o modelo que de fato o executou: Claude Sonnet 5.5 nas dez tarefas.
- As contagens de testes do plano conferiram ao fim de cada tarefa: 385, 410, 442, 479, 502, 537, 576, 634 e 673 passando, sempre com 9 pulados; 23 arquivos ao fim.
- Os achados menores acima foram mantidos como estavam no plano, porque nenhum muda o resultado de um cálculo.
- Revisão final da fase (12/10/2026), aplicada numa onda única de correções, com commits de coautoria do Claude Opus 5.5: F1, o teste da cópia embutida exige só a presença de dez/2026 no salário mínimo, e não que o último mês seja dezembro (a exigência travaria a rotina se o BCB publicasse o ano novo aos poucos); F2, um teste confere as linhas de cron e o `case` do passo Baixar de `atualizar-indices.yml` contra `RODADAS`; F3, o roteiro diz como reconhecer a execução sem mudança; F4, o motivo da falha de rede traz a causa (`ENOTFOUND`, `ECONNRESET`…); F5, o motivo de falha sai numa linha só, com até 300 caracteres; F6, a coluna "Canceladas" do relatório mensal, com a nota das três origens do cancelamento; F7, a conclusão "skipped" em português e sem minutos na estimativa; F8, esta seção; F9, acertos de documentação (`CLAUDE.md`, `README.md`, §6.3 do design e notas deste plano). Contagem ao fim: 678 passando, 9 pulados (687), em 23 arquivos. A chave `timezone` de `on.schedule` foi conferida na documentação de sintaxe de workflow do GitHub, que a documenta (fuso IANA); a conferência na primeira execução agendada continua na fase 7. Descartado: o reforço `::stop-commands::` no passo Baixar, dispensável depois de F5.
- Na Task 8, o script de índices rodou contra o BCB real em 12/10/2026 (feriado): as seis séries vieram "sem mudança", com código de saída 0, e nenhum commit de dados foi feito.
- Os relatórios dos subagentes foram gravados em `.txt`, por heredoc no shell, porque o gancho de gravação pode recusar o caminho com acento ("PÚBLICA").
- A Task 10 vai até o commit dos documentos; a integração na `main` fica para depois, com a decisão do responsável.


## Auto-revisão do plano

**Cobertura da fase 4 (§16 do design, item 4; tabela do roteiro; decisões de 11 e 12/10/2026; pendências das fases 1 a 3):**

| Item | Task |
|---|---|
| cliente do BCB usado pela rotina: validação e ordenação com `interpretarRespostaSgs`, mês inválido recusado, tempo-limite e nova tentativa só em rede e 5xx, decisão pelo corpo | 4 (fundação na 1) |
| app sem rede: tabela montada só com a cópia publicada e o calendário; nenhuma inserção manual; nenhum armazenamento no navegador | 5 e 7 |
| congelamento por cálculo com a data real dos índices (horário de Brasília), síncrono, ponto de integração único para a fase 5 | 2 e 7 |
| rodapé e avisos da tela (§8.3), com "ainda não chegou ao Apura" e o salário mínimo do ano numa frase | 3 (agrupamento) e 7 |
| cálculo reaberto recalculado com os índices atuais, com aviso de quais índices usados mudaram (inclusive o salário mínimo "último publicado") | 7 |
| calendário de divulgação: "ainda sem divulgação" (com a previsão) × buraco de dados ("não disponível na tabela"; no salário mínimo, "não consta") × "ainda não chegou ao Apura"; até que mês cada série deveria existir | 3 (regras e previsão), 6 (avisos do motor), 7 (situação da tela) e 8 (meses atrasados na saída da rotina) |
| rotina central: três rodadas de segunda a sexta (10h47, 14h17 e 22h47 de Brasília, três linhas com `timezone`), gravação série por série, série sem mudança não regravada, série que encolheu ou veio vazia recusada, arquivo ilegível com remédio, SELIC parcial separada de revisão, conferências antes de gravar, commit descritivo, `git pull --rebase`, código de saída 1 com problema | 5 (comparação) e 8 |
| monitoramento gratuito: resumo da execução, sinal ao Healthchecks só de sucesso e só em execução agendada, relatório mensal gravado em `docs/monitoramento/` sem republicar o site | 8 (resumo e sinal) e 9 (relatório) |
| pendência: fuso da data da consulta (Brasília) | 2, 7 e 8 |
| pendência: SELIC parcial com termo final próprio e mês parcial só inicial | registradas como limite ("Para o responsável") e na nota da §8 (10) |
| pendência: aviso de índice mudado nomeia o salário mínimo | 7 |
| pendência: lacuna no meio da série do salário mínimo × mês ainda não publicado | 6 |
| pendência: melhorias do script (content-type, 4xx, série que encolheu, valores alterados, mensagens sem "Error:") | 4, 5 e 8 |
| pendência: `lerArquivoSerie` confere os itens e o `typeof` antes do cast; `decimalOuNulo` e `textoDecimalValido` com `typeof`; data do SGS com mês inválido recusada | 1, 4 e 5 |
| pendência: fixtures com `obtidoEm` 12:00Z | mantidas (restrições globais); nota na 10 |
| testes de índices com respostas reais gravadas, sem rede (§11; o 406, que não se reproduziu, com corpo sintético); propriedade "a mesma tabela não gera aviso"; execuções sintéticas no formato da API do GitHub | 1, 4, 7, 8 e 9 |
| roteiro (fase e insumos da fase 7), `CLAUDE.md` (Estado, comandos, aviso dos commits do robô, mapa, regras 4 e 6, caso de referência), design (§3.1, §4.1, §4.2, §4.3, §5.1, §5.4, §5.5, §6.3, §8 e nota, §10.4, §11, §12.2, §12.3, §13, §14, §15, §16), `README.md` | 10 |

**Convenções da §12:** domínio em português (`buscarSerie`, `congelarIndices`, `esperadoAte`, `mesesAtrasados`, `montarRelatorio`), `Decimal` só onde há valor (nenhum `number` para índices; os minutos do relatório são contagens), datas ISO como texto, motor sem rede/relógio/DOM (as duas mudanças do motor só leem campos da tabela), rede/disco/relógio injetáveis em `src/indices/`, imports com `.ts`, commits "módulo: o que muda". Verificadas tarefa a tarefa.

**Placeholders:** nenhum "TBD", "TODO" ou "implementar depois"; todo passo de código traz o código inteiro (arquivos novos e reescritos por inteiro; nos demais arquivos existentes, o trecho antigo e o novo, como diz "Como executar este plano"). Os únicos espaços a preencher na execução são a data do dia (Task 10) e o nome do modelo na linha de coautoria.

**Consistência de nomes entre tarefas:** `esperadoAte` (campo, 1) lido em 6 e preenchido em 7; `ehValorMensalValido`, `interpretarErroSgs` (1) usados em 4 e 5; `agoraEmBrasilia`, `hojeEmBrasilia`, `formatarDataHoraBrasilia`, `dataHoraEmBrasilia`, `compararInstantes` (2) usados em 5, 7, 8 e 9 (na 9, só `dataHoraEmBrasilia`); `divulgacaoPrevista`, `aindaNaoDivulgado` (3, compartilhado) usados em 6 e, pela `previsao` de `MesAtrasado`, em 7 e 8; `SERIES_EM_ORDEM_NUMERICA`, `esperadoAte()`, `mesesAtrasados`, `MesAtrasado`, `agruparAtrasados`, `GrupoDeAtraso` (3) usados em 7 e 8; `buscarSerie`, `OpcoesBusca`, `RespostaBusca`, `montarArquivoSerie` (4) usados em 8; `lerArquivoSerie`, `compararSeries`, `ComparacaoDeSerie` (5, `arquivo-serie.ts`) usados em 5 e 8; `seriesEmbutidas` (5) usado em 7; `montarTabela`, `descreverSituacao`, `SituacaoIndices`, `OpcoesCongelamento`, `congelarIndices`, `compararIndicesUsados` (7) para a fase 5; `ResultadoAtualizacao` (8) usado pelo script; `lerExecucoes`, `rodadaDoTitulo`, `horarioAgendado`, `lerAtualizacoes`, `montarRelatorio` (9) usados pelo script do relatório; o título do commit do robô ("indices: séries do BCB em … (rodada …)") é escrito pelo workflow da 8 e lido por `lerAtualizacoes` na 9, e o `run-name` ("Atualizar índices · <agendamento>") é escrito na 8 e lido por `rodadaDoTitulo` na 9.

**Foco da revisão:** os cinco itens têm teste na tarefa dona (2, 6 e 9: fuso e virada do dia; 8: BCB fora do ar em parte das séries; 4 e 8: respostas estranhas; 8: SELIC parcial, fechamento e revisão; 7, 5 e 8: reabertura meses depois e série que encolheu).

**Ensaio:** a fase foi reconstruída tarefa por tarefa a partir da main (ver "Ensaio" em "Para o responsável"); contagens medidas ao fim de cada tarefa: 1 → 385 | 9 (394); 2 → 410 (419); 3 → 442 (451); 4 → 479 (488); 5 → 502 (511); 6 → 537 (546); 7 → 576 (585); 8 → 634 (643); 9 → 673 (682), sempre com 9 pulados. As instruções de código das Tasks 2 a 9 foram aplicadas ao pé da letra por um programa, a partir do estado da Task 1, com `npm run verificar` verde em cada tarefa e resultado idêntico ao do ensaio; os blocos da Task 1 conferem com os arquivos ensaiados.
