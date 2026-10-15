# Apura · Fase 7b · Ajustes da tela — plano de implementação

> **Para agentes executores:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa a tarefa. Os passos usam caixas de seleção (`- [ ]`) para acompanhamento. A Task 7 tem ações para fora (enviar a branch, merge na `main`, envio da `main`, etiqueta `v0.1.1`): **cada uma só depois da confirmação do responsável no chat, uma de cada vez** (passos marcados com ⚑).

**Objetivo:** três ajustes da tela decididos pelo responsável em 15/10/2026, depois do uso da versão 0.1.0: a barra superior presa no topo ao rolar (cabeçalho fixo), as seções da esquerda na ordem "processo, base, encargos e data do cálculo, prestações, pagamentos" (os parâmetros antes dos lançamentos) e a tabela sempre à vista (a coluna da direita presa abaixo da barra, com rolagem própria e os cabeçalhos das tabelas presos, como o "congelar painéis" da planilha). Versão 0.1.1.

**Arquitetura:** só a interface muda (`src/ui/` e `src/ui/estilos.css`); o motor, o relatório e os números não mudam. A ordem das seções é uma troca de posição no `App.tsx` com os títulos renumerados. O cabeçalho fixo e a coluna presa são CSS (`position: sticky`, `overflow: auto`, `overscroll-behavior`, `scroll-padding-top`), com duas peças pequenas de componente: a área rolável da coluna ganha nome e foco (`App.tsx`), e a tabela mede se é mais larga que a coluna (`ResizeObserver`, como os indicadores já fazem) para decidir se rola de lado sozinha ou deixa o cabeçalho preso (`TabelaLancamentos.tsx`). Depois de "Lançar em lote", a área rolável da coluna rola até a primeira linha nova (ids do último lote no estado; só a área rola, nunca a página). O jsdom não calcula leiaute: os testes de componente conferem a ordem das seções, as classes, o foco e os nomes acessíveis, e um teste de leitura da folha de estilos (`scripts/estilos.test.ts`) prende as declarações que sustentam o comportamento; o efeito visual é conferido no navegador integrado (Task 6).

**Tecnologia:** TypeScript estrito, React 19, Vite 8, Vitest (Node e jsdom), CSS sem pré-processador. Nenhuma dependência nova; `public/_headers` (política de conteúdo) não muda.

**Especificação:** `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md`: §9 (interface; a §9.2 é renumerada por este plano), §17.4 (balões flutuantes), §18.6 (lápis e ✕ presos à direita) e a §20, nova, escrita pela Task 7 com o texto dado lá, no modelo da §17. Até a Task 7, as decisões estão em "Para o responsável", abaixo, e no texto da §20 da Task 7.

## Restrições globais (valem para todas as tarefas)

- As do `CLAUDE.md` (regras obrigatórias 1 a 9): TDD; motor puro (não é tocado); nenhum teste com rede nem com os últimos meses de `dados/indices/` (os testes de componente usam o ambiente de teste com a tabela fixa de 2024–2026); imports relativos com `.ts`/`.tsx` e `import type`; nenhum dado pessoal em teste, fixture ou documentação.
- Só `src/ui/` e estilos mudam. O motor (`src/motor/`), o relatório (`src/relatorio/`) e a impressão não mudam; os casos de referência continuam idênticos (o `npm run verificar` de cada tarefa prova).
- Nenhuma dependência nova. Se alguma parecesse necessária, a regra da fase 7 valeria (versão com 14 dias de publicada, `npm install <pacote>@<versão> --before=<data>`), com prós e contras no chat antes; este plano não precisa de nenhuma.
- A política de conteúdo do site (`public/_headers`) não muda: nada de script embutido nem recurso de fora (`scripts/site.test.ts` continua passando).
- Não rodar `npm run indices:atualizar` na branch (a rotina central grava a `main`).
- Versão 0.1.1 (`npm version 0.1.1 --no-git-tag-version --ignore-scripts`), com a seção no `CHANGELOG.md` (o `scripts/versao.test.ts` exige); a etiqueta `v0.1.1` vai no commit publicado.
- Commits em português, "módulo: o que muda", terminados com a linha de coautoria do modelo que de fato executa (`Co-Authored-By: <nome do modelo> <noreply@anthropic.com>`).
- Ordem com a fase 7: o fechamento da fase 7 (Task 15 do plano `2026-10-14-fase-7-publicacao.md`) mexe no roteiro, no `CLAUDE.md` e no design. Em 15/10/2026 ele ainda não está na `main` (a tabela do roteiro diz "7 · Publicação … pendente"). As Tasks 1 a 6 rodam já, na branch; a Task 7 (documentos e integração) espera o fechamento da fase 7 entrar na `main`, traz essa `main` para a branch e parte dela.

## Foco da revisão

Situações que a especificação implica e que podem morder quem usa o Apura; cada uma tem teste (jsdom) ou conferência (navegador) na tarefa dona.

1. **Campo escondido sob a barra presa ao navegar com o teclado** (Tab até um campo no pé da coluna da esquerda, ou "Dividir" logo abaixo da dobra): a página precisa reservar a altura da barra. → Task 2 (`scripts/estilos.test.ts`: `scroll-padding-top` na raiz, e zero onde a barra não fica presa) e Task 6 (Tab pela tela em 1366×768: o campo em foco sempre abaixo da barra).
2. **Rolagem da coluna que "vaza" para a página** ao chegar ao fim das tabelas, ou coluna que não rola porque a tabela rola dentro dela (rolagem dentro de rolagem). → Task 3 (`overscroll-behavior: contain`; a tabela que cabe perde a rolagem própria; uma área só para a coluna inteira) e Task 6 (roda do mouse no fim da lista; 40 prestações e 20 pagamentos).
3. **Balão cortado pela área rolável** (ⓘ do título da tabela aberto perto da borda; etiquetas; "Personalizar"). → Task 3 (`Tabelas.test.tsx`: o balão do título é `balao flutuante`, em posição fixa) e Task 6 (abrir cada um com a coluna rolada).
4. **Tela estreita, baixa ou celular que herda o comportamento "preso" e quebra**: barra em duas linhas presa, região rolável que vira parada de Tab sem rolar nada, tabela sem a rolagem lateral de antes. → Task 2 e Task 3 (`scripts/estilos.test.ts`: abaixo de 1024 px a barra é `static`, a área é `display: contents` e a `.rolagem` volta a `overflow-x: auto`) e Task 6 (375 px, 1024×768 e uma janela de 1366×560).
5. **Cabeçalho da tabela preso na tela em que a tabela não cabe** (1024 a cerca de 1150 px): se a tabela perder a rolagem lateral própria, a coluna inteira rola de lado e os títulos saem da vista; se não a perder, o cabeçalho não pode ficar preso. → Task 3 (`Tabelas.test.tsx`: a tabela mais larga que a caixa é marcada `transborda`, e a medida é refeita quando as larguras mudam) e Task 6 (1024×768: a tabela rola de lado sozinha, com o título preso e o lápis e o ✕ à vista).

---

## Para o responsável: o que esta fase entrega e o que foi decidido

Ao fim da fase 7b, quem abre o Apura numa tela de notebook (1366×768) ou maior vê a barra verde presa no topo enquanto rola a página; as seções da esquerda na ordem processo → base → encargos e data do cálculo → prestações → pagamentos; e, à direita, os cinco indicadores e as tabelas sempre à vista: a coluna fica presa abaixo da barra, as linhas rolam dentro dela com a roda do mouse, e o título de cada tabela e a linha "Vencimento · Valor · Fator…" ficam parados no topo, como o "congelar painéis" do Excel. No celular e em janelas estreitas, nada muda. O rodapé e o relatório passam a dizer "v0.1.1". A contagem de testes vai de `1002 passando | 10 pulados (1012)`, em 60 arquivos, para `1014 passando | 10 pulados (1024)`, em 61 arquivos.

**Decisões suas, de 15/10/2026 (vão para a §20 do design na Task 7):**

- **D1 · Cabeçalho fixo:** a barra presa no topo, sem animação de encolher; mais baixa de vez se ficar alta demais presa; não presa em telas estreitas, onde quebra em mais de uma linha; o campo em foco nunca escondido sob ela (WCAG 2.4.11); a impressão do relatório não muda.
- **D2 · Nova ordem das seções:** 1 · Processo, 2 · Base dos alimentos, 3 · Encargos e data do cálculo, 4 · Prestações em atraso, 5 · Pagamentos; títulos, §9.2 e testes renumerados.
- **D3 · Tabela sempre à vista ("só a direita presa"):** a partir de 1024 px de largura e com altura suficiente, a coluna da direita presa abaixo da barra, ocupando a altura que sobra, com rolagem própria, uma só para a coluna inteira; indicadores parados no topo; título e linha de títulos de cada tabela presos; área rolável com foco pelo teclado e nome para o leitor de tela; abaixo de 1024 px ou em tela baixa demais, tudo como hoje; balões nunca cortados; lápis e ✕ presos à direita.
- **D4 · Rolagem depois do lote (decidida em 15/10/2026, depois da revisão do plano):** depois de "Lançar em lote", a coluna da direita rola sozinha até as linhas recém-lançadas; só a área da coluna rola, a página não se move (Task 4).

**Decisões técnicas deste plano (reabra qualquer uma na revisão, se discordar):**

- **T1 · Barra de 64 px (antes 80):** logo em 40 px (antes 48), nome do sistema em 22 px (antes 24) e o subtítulo em 12,5 px, com 10 px de espaço em cima e embaixo. Dois motivos, medidos no navegador: presa, a barra de 80 px tomava 10% de uma tela de 768 px; e, em 1024 px, a barra de antes pedia 1041 px e quebrava em duas linhas, justamente onde a coluna presa começa (com 64 px, ela pede 993 px e cabe numa linha a partir de 1024). A altura fica numa variável do CSS (`--barra-altura`), que a página e a coluna da direita usam (Task 2).
- **T2 · Campo em foco nunca sob a barra:** `scroll-padding-top` na raiz da página, igual à altura da barra mais 8 px; zero abaixo de 1024 px, onde a barra não fica presa. É a solução padrão para o critério 2.4.11 do WCAG: o navegador, ao rolar até um campo que recebe o foco, respeita essa reserva (o Chrome, medido no ensaio, leva o campo para o meio da tela, nunca para debaixo da barra) (Task 2).
- **T3 · Limites da coluna presa:** largura mínima de 1024 px (o ponto das duas colunas, como hoje) e altura mínima de 600 px (`@media (min-width: 1024px) and (min-height: 600px)`): em 600 px sobram cerca de 500 px para a coluna, uns 400 para as linhas. Abaixo de 600 px de altura, a coluna inteira volta a rolar com a página (tudo como hoje); não há a variante intermediária "indicadores rolam junto", que exigiria medir a altura dos indicadores (muda com a largura e com os valores) para prender os títulos abaixo deles (Task 3).
- **T4 · Indicadores fora da área rolável:** eles são o cabeçalho fixo da coluna (um item que não rola), e a área rolável é o que vem embaixo (as duas tabelas e os avisos). Assim o título de cada tabela fica preso em `top: 0` da área e a linha de títulos das colunas em `top: 35px` (a altura do título, fixada no CSS), sem medir nada (Task 3).
- **T5 · Cabeçalho preso e rolagem lateral (o cuidado técnico conhecido):** um cabeçalho só fica preso em relação à caixa que rola. Hoje cada tabela rola de lado dentro da própria caixa (`.rolagem` com `overflow-x: auto`), para a tabela mais larga que a coluna; essa caixa não rola na vertical, e por isso o cabeçalho não tinha como ficar preso. Escolha: **a tabela que cabe na coluna perde a rolagem lateral própria** (`overflow-x: visible`), e o cabeçalho se prende à área rolável da coluna; **a tabela que não cabe** (o componente mede com `ResizeObserver`, como os indicadores já medem a largura, e marca a caixa com a classe `transborda`) **continua rolando de lado sozinha**, como hoje, com o título preso e a linha de títulos rolando junto com as linhas. Medido no ensaio: com valores na casa do milhar ("R$ 1.000,00"), a tabela de prestações tem 603 px; a coluna tem 542 px em 1024, 684 em 1280, 730 em 1366 e 773 em 1920 px. Logo, em 1280, 1366 e 1920 px tudo fica preso, e só de 1024 a cerca de 1150 px a linha de títulos rola. A alternativa de rolar de lado a coluna inteira, como uma folha única, foi ensaiada e descartada: o navegador mede a largura intrínseca da tabela de modo instável (603 px no leiaute, 728 px na medida "max-content" que a folha exigiria), o `container-type` necessário para prender os títulos à esquerda muda a referência dos balões em posição fixa (eles ficariam presos à área), e, sem isso, o título, o "+ Prestação" e os avisos saíam da vista ao rolar de lado (Task 3).
- **T6 · Área rolável sempre focável, sem JavaScript de leiaute:** `tabIndex={0}`, `role="region"` e `aria-label="Tabelas e avisos"` fixos. A regra base do CSS dissolve a área (`display: contents`): ela só vira uma caixa dentro do bloco `@media` das telas largas e altas. Fora dele (colunas empilhadas abaixo de 1024 px, ou tela mais baixa que 600 px), um elemento dissolvido não recebe foco nem entra na ordem do Tab, conferido no navegador em 375 px e em 1366×560 (a revisão achou a primeira versão, que só dissolvia abaixo de 1024 px e deixava uma parada de Tab inútil em 1366×560). Dispensa consultar a largura da janela pelo JavaScript e manter duas cópias da mesma consulta de mídia (Task 3).
- **T7 · Balões dos títulos das tabelas flutuantes:** os ⓘ de "Prestações" e "Amortizações (pagamentos)" passam a usar o modo flutuante que as etiquetas já usam (§17.4: balão em posição fixa, que fecha ao rolar), para não ficarem cortados pela área rolável. Os balões das etiquetas já flutuam, e os painéis ("Personalizar") já são fixos. Limites aceitos: o balão de erro de uma célula em edição, na última linha visível, fica em parte abaixo da borda da área e se alcança rolando; e, como a coluna presa cria um contexto de empilhamento próprio, um balão flutuante aberto dentro dela que suba até a barra (só quando não cabe embaixo e é mais alto que a tela menos a barra, caso raro) passa por baixo da barra, não por cima (achado da revisão; a solução estrutural, montar os balões fora da coluna com `createPortal`, fica para uma fase futura, se incomodar) (Task 3).
- **T8 · Teste de leitura da folha de estilos** (`scripts/estilos.test.ts`, em `scripts/` porque lê um arquivo do repositório com o Node, como `site.test.ts`; o vitest entrega vazio um `.css?raw`): lê `src/ui/estilos.css`, separa as regras de primeiro nível (de um bloco `@media`, quando pedido), junta as de mesmo seletor na ordem da folha (a declaração posterior vence, como no navegador) e confere as declarações que sustentam as decisões (`position: sticky` na barra e na coluna, `scroll-padding-top`, `overflow: auto` e `overscroll-behavior: contain` na área, títulos e cabeçalhos presos, e o contrário abaixo de 1024 px). **Prova que a regra está escrita, não que o navegador a aplica**: isso é a Task 6. Serve para uma mudança descuidada no CSS não perder a decisão sem ninguém notar (Tasks 2 e 3).
- **T9 · Rolagem automática depois do lote (D4):** o redutor guarda os ids das linhas que o último "Lançar em lote" acrescentou (`idsDoLote`, zerado em "Novo cálculo" e "Abrir"); a tabela que recebeu o lote rola **só a área da coluna** (`scrollTop` da área, pela diferença entre o topo da primeira linha nova e o topo da área, menos a reserva dos cabeçalhos presos), e só quando a área tem o que rolar (`scrollHeight` maior que `clientHeight`; nas colunas empilhadas e em tela baixa ela é dissolvida e não tem altura). Não se usa `scrollIntoView`: a revisão mediu que ele rola também a página (197 px numa tela de 1366×768; mais de 1000 px numa de 560), tirando a pessoa do formulário. Relançar um lote sem linha nova não rola (Task 4).
- **T10 · Alturas fixadas no CSS:** `--barra-altura: 64px`, `--titulo-da-tabela: 35px` (o título mede 34,3 px e ganha altura fixa) e `--cabecalhos-da-tabela: 62px` (título mais a linha de títulos, de 25,7 px: 60,7 px, arredondados para cima com uma folga de 1 px), para os `top` dos elementos presos e o `scroll-padding-top` da área. A reserva lateral para o lápis e o ✕ presos à direita (`scroll-padding-right: 72px`) fica na caixa que rola de lado, `.tabela-rolagem > .rolagem` (a área da coluna nunca rola de lado). Medidas conferidas no navegador (Task 6 as reconfere).

**Você faz:** na Task 7, autorizar o envio da branch, o merge, o envio da `main` e a etiqueta `v0.1.1`, um de cada vez (chat); conferir a pré-visualização do Cloudflare antes do merge, se quiser.

**Ensaio:** todo o código das Tasks 1 a 5 foi escrito e executado em 15/10/2026 numa cópia do repositório fora dele (a partir de `c17a68f`, a `main` do GitHub trazida para a branch), tarefa a tarefa (teste que falha, código, `npm run verificar` verde, commit), e conferido no navegador integrado com um cálculo curto (2 prestações) e um longo (40 prestações de jan/2023 a abr/2026 e 20 pagamentos), em 1920×1080, 1366×768, 1280×720, 1024×768 e 375 px, nos temas claro e escuro: barra presa de 64 px (e numa linha só em 1024 px); coluna presa em `top: 80px` com rolagem própria sem transbordo lateral (`scrollWidth = clientWidth`); título preso em `top` da área e linha de títulos logo abaixo (1280, 1366 e 1920); em 1024, as duas tabelas marcadas `transborda`, rolando de lado sozinhas com o título preso; balão ⓘ do título em posição fixa, inteiro, com a coluna rolada; Tab até um campo do pé da esquerda com o campo abaixo da barra; foco num lápis da 26ª linha com a linha abaixo dos cabeçalhos presos; depois de um lote de 05/05 a 05/09/2026, a área rolou até a linha de 05/05/2026, logo abaixo dos cabeçalhos presos; em 375 px, barra em três linhas e `static`, área dissolvida (`display: contents`) e não focável, resumo no topo, página sem rolagem lateral; relatório aberto com a barra presa e a tela de cálculo intacta ao voltar (foco de volta em "Relatório / PDF"). Um problema achado e corrigido no ensaio: a primeira versão da coluna presa fazia a área transbordar 1 px de lado (título com `100cqw` sem descontar as bordas da seção), o que virou uma rolagem lateral de 1 px; a versão final não tem transbordo. Outro, que mudou a abordagem (T5): a "folha única" rolando de lado. Depois, uma revisão adversarial independente (agente que não escreveu o código, com medidas no navegador) achou um problema crítico, três importantes e oito menores: `scrollIntoView` rolava também a página depois do lote (T9, corrigido: só a área rola, com teste que observa o `scrollTop` da área e a página parada); a área ficava focável sem rolar nada em telas largas e baixas (T6, corrigido: dissolvida por padrão); os balões flutuantes não ficam acima da barra (T7, limite registrado); `scroll-padding-right` morto na área (T10, movido para a caixa da tabela); o leitor do CSS que só lia a primeira regra de cada seletor (T8, corrigido); dois `ResizeObserver` recriados a cada render (corrigido: um por tabela); e acertos de texto (§9.2 da Task 7, Step 6 da Task 6, a conta dos 62 px, os limites fora do Chromium). As correções foram ensaiadas e conferidas no navegador: depois do lote, a área rola até a linha nova e a página não se move (`scrollY` igual antes e depois, em 1366×768 e em 1366×560); em 1366×560 a área é dissolvida e não recebe foco. Por fim, a fase foi reconstruída tarefa por tarefa numa segunda cópia, a partir da mesma `main`, aplicando só os patches deste plano (primeiro os testes, para registrar o que falha; depois o código): cada passo "ver falhar" traz a falha medida nessa reconstrução, cada tarefa termina com a contagem medida, o `npm run format` não muda nada em tarefa alguma, e o estado final é idêntico ao do ensaio (`diff -r` vazio).

---

## Estrutura de arquivos

| Arquivo | Papel nesta fase | Tarefa |
|---|---|---|
| `src/ui/App.tsx` | ordem das seções; a área rolável da coluna da direita (nome, foco); ids do último lote para as tabelas | 1, 3, 4 |
| `src/ui/secoes/Encargos.tsx`, `LotePrestacoes.tsx`, `LotePagamentos.tsx` | títulos renumerados (3, 4, 5) | 1 |
| `src/ui/tabelas/TabelaLancamentos.tsx` | frases "na seção 4/5"; balão do título flutuante; medida `transborda`; rolagem até a linha nova; `data-id` nas linhas | 1, 3, 4 |
| `src/ui/estilos.css` | barra presa e mais baixa, `scroll-padding-top`; coluna presa, área rolável, títulos e cabeçalhos presos; o contrário abaixo de 1024 px | 2, 3 |
| `src/ui/estado/calculo.ts` | `idsDoLote` no estado | 4 |
| `scripts/estilos.test.ts` (novo) | teste de leitura da folha de estilos (T8) | 2, 3 |
| `src/ui/App.test.tsx`, `secoes/Lotes.test.tsx`, `secoes/Base.test.tsx`, `tabelas/Tabelas.test.tsx`, `tabelas/Personalizar.test.tsx`, `estado/calculo.test.ts` | testes renumerados e novos | 1, 3, 4 |
| `package.json`, `package-lock.json`, `CHANGELOG.md` | versão 0.1.1 | 5 |
| `docs/superpowers/specs/…design.md` (§9.2, §20), `docs/superpowers/roteiro.md`, `CLAUDE.md`, este plano | fechamento | 7 |

---

## Como executar este plano

- **Tasks 1 a 6** rodam na branch de trabalho da fase (a do plano, `claude/apura-fase-7b-plan-ab53e9`, ou outra criada a partir dela, já com a `main` do GitHub de 15/10/2026, `c17a68f`). Antes de tudo: `npm install` (nenhuma dependência nova). **A Task 7** espera o fechamento da fase 7 na `main` (ver "Restrições globais").
- **Os passos de código são patches.** Cada tarefa traz dois blocos `diff`: os testes e o código. Para aplicar um bloco: salve o conteúdo dele, exatamente como está, num arquivo **fora do repositório** (na pasta de rascunho da sessão, `$RASCUNHO`; o gancho de gravação pode recusar caminhos com acento, como a pasta "DEFENSORIA PÚBLICA": grave por heredoc no shell, por exemplo `cat > "$RASCUNHO/t1-testes.patch" <<'PATCH'` … `PATCH`) e rode `git apply --whitespace=nowarn "$RASCUNHO/t1-testes.patch"`. Os patches foram aplicados, um a um, numa cópia limpa a partir de `c17a68f`: aplicam-se sem conflito sobre o estado da tarefa anterior. Se `git apply` recusar, pare e relate (não edite à mão para "encaixar").
- Ciclo de cada tarefa: aplicar o patch dos testes → `npx vitest run` e ver falhar exatamente o que o passo diz (se outra coisa falhar, ou se um teste listado passar sem o código, pare e relate) → aplicar o patch do código → `npm run format && npm run verificar` (o `format` não deve mudar nada) → conferir a contagem → commit com a mensagem do passo. Só se commita com tudo verde.
- Leia o patch antes de aplicá-lo: ele é o código da tarefa, e o revisor de cada tarefa o confere contra as decisões de "Para o responsável" (e, depois da Task 7, contra a §20).
- Relatórios de subagentes vão em `.txt`, fora do repositório (na pasta de rascunho da sessão, por heredoc no shell), nunca na raiz do projeto.

---

### Task 1: Nova ordem das seções da esquerda

**Files:**
- Modify: `src/ui/App.tsx` (ordem das seções), `src/ui/secoes/Encargos.tsx`, `src/ui/secoes/LotePrestacoes.tsx`, `src/ui/secoes/LotePagamentos.tsx` (títulos e comentários), `src/ui/tabelas/TabelaLancamentos.tsx` (frases da tabela vazia)
- Test: `src/ui/App.test.tsx` (teste novo da ordem), `src/ui/secoes/Lotes.test.tsx`, `src/ui/secoes/Base.test.tsx`, `src/ui/tabelas/Tabelas.test.tsx`, `src/ui/tabelas/Personalizar.test.tsx` (números das seções)

**Interfaces:**
- Consumes: os componentes das seções como estão (`Processo`, `BaseDosAlimentos`, `Encargos`, `LotePrestacoesSecao`, `LotePagamentosSecao`).
- Produces: os títulos "3 · Encargos e data do cálculo", "4 · Prestações em atraso" e "5 · Pagamentos" (ids `titulo-encargos`, `titulo-prestacoes`, `titulo-pagamentos` inalterados), que os testes das tarefas seguintes procuram por `/4 · Prestações em atraso/` e `/5 · Pagamentos/`. A "seção 2" (base) não muda de número: `estado/faltas.ts`, `Personalizar.tsx` e `Abrir.tsx` ("seção 1") ficam como estão.

- [ ] **Step 1: Aplicar o patch dos testes** (`$RASCUNHO/t1-testes.patch`)

```diff
diff --git a/src/ui/App.test.tsx b/src/ui/App.test.tsx
index 24dcfec..986d5a1 100644
--- a/src/ui/App.test.tsx
+++ b/src/ui/App.test.tsx
@@ -34,6 +34,28 @@ describe("App (fundação da tela)", () => {
     );
   });
 
+  it("as cinco seções da esquerda vêm na ordem da §20: processo, base, encargos, prestações, pagamentos (decisão de 15/10/2026)", () => {
+    render(<App ambiente={ambienteDeTeste()} />);
+    const esquerda = document.querySelector(".coluna-esquerda") as HTMLElement;
+    const titulos = within(esquerda)
+      .getAllByRole("heading", { level: 2 })
+      .map((h) => h.textContent);
+    expect(titulos).toEqual([
+      "1 · Processo",
+      "2 · Base dos alimentos",
+      "3 · Encargos e data do cálculo",
+      "4 · Prestações em atraso",
+      "5 · Pagamentos",
+    ]);
+    // a tabela vazia aponta para a seção certa
+    expect(screen.getByText(/Nenhuma prestação lançada/).textContent).toBe(
+      'Nenhuma prestação lançada: use "Lançar em lote" na seção 4 ou "+ Prestação".',
+    );
+    expect(screen.getByText(/Nenhum pagamento lançado/).textContent).toBe(
+      'Nenhum pagamento lançado: use "Lançar em lote" na seção 5 ou "+ Pagamento".',
+    );
+  });
+
   it("mostra na caixa de avisos os meses já divulgados que ainda não chegaram ao Apura", () => {
     render(<App ambiente={ambienteDeTeste({ limites: { "433": "2026-07" } })} />);
     const avisos = screen.getByRole("region", { name: "Avisos" });
@@ -89,7 +111,7 @@ describe("App (fundação da tela)", () => {
       return campos.length;
     };
     conferir();
-    const prestacoes = within(screen.getByRole("region", { name: /3 · Prestações em atraso/ }));
+    const prestacoes = within(screen.getByRole("region", { name: /4 · Prestações em atraso/ }));
     await user.click(prestacoes.getByLabelText("Meses em atraso"));
     await user.type(prestacoes.getByLabelText("Dia do vencimento"), "5");
     await user.type(prestacoes.getByLabelText("Quantos meses"), "2");
diff --git a/src/ui/secoes/Base.test.tsx b/src/ui/secoes/Base.test.tsx
index 18ba66b..ad98a66 100644
--- a/src/ui/secoes/Base.test.tsx
+++ b/src/ui/secoes/Base.test.tsx
@@ -353,7 +353,7 @@ describe("2 · Base dos alimentos (§6.3, §9.2)", () => {
     render(<App ambiente={ambienteDeTeste()} />);
     await user.type(screen.getByLabelText("Valor fixado"), "500");
     fireEvent.change(screen.getByLabelText("Fixado em"), { target: { value: "2024-03-10" } });
-    const lote = within(screen.getByRole("region", { name: /3 · Prestações em atraso/ }));
+    const lote = within(screen.getByRole("region", { name: /4 · Prestações em atraso/ }));
     fireEvent.change(lote.getByLabelText("Primeiro vencimento"), {
       target: { value: "2024-11-05" },
     });
diff --git a/src/ui/secoes/Lotes.test.tsx b/src/ui/secoes/Lotes.test.tsx
index f70cbc9..852dd20 100644
--- a/src/ui/secoes/Lotes.test.tsx
+++ b/src/ui/secoes/Lotes.test.tsx
@@ -33,11 +33,11 @@ describe("intervalo de vencimentos (decisão de 13/10/2026)", () => {
   });
 });
 
-describe("3 · Prestações em atraso e 4 · Pagamentos: lotes cumulativos (§6.1, §6.2)", () => {
+describe("4 · Prestações em atraso e 5 · Pagamentos: lotes cumulativos (§6.1, §6.2)", () => {
   it("lança por 'meses em atraso', acumula sem repetir e mostra os avisos do lote embaixo do formulário", async () => {
     const user = userEvent.setup();
     render(<App ambiente={ambienteDeTeste()} />);
-    const prestacoes = secao(/3 · Prestações em atraso/);
+    const prestacoes = secao(/4 · Prestações em atraso/);
     // o padrão é o intervalo de vencimentos, sem o dia; "Meses em atraso" mostra o dia
     expect(
       (prestacoes.getByLabelText("Intervalo de vencimentos") as HTMLInputElement).checked,
@@ -74,7 +74,7 @@ describe("3 · Prestações em atraso e 4 · Pagamentos: lotes cumulativos (§6.
   it("valida antes de chamar o motor: dia fora de 1 a 31, meses vazios, datas vazias, intervalo invertido ou longo demais", async () => {
     const user = userEvent.setup();
     render(<App ambiente={ambienteDeTeste()} />);
-    const prestacoes = secao(/3 · Prestações em atraso/);
+    const prestacoes = secao(/4 · Prestações em atraso/);
     const erros = () => prestacoes.getAllByRole("alert").map((a) => a.textContent);
     await user.click(prestacoes.getByLabelText("Meses em atraso"));
     await user.type(prestacoes.getByLabelText("Dia do vencimento"), "32");
@@ -109,8 +109,8 @@ describe("3 · Prestações em atraso e 4 · Pagamentos: lotes cumulativos (§6.
   it("pagamentos: intervalo de pagamentos por datas, como o das prestações; lote cumulativo com aviso; valor e datas validados (decisão de 13/10/2026)", async () => {
     const user = userEvent.setup();
     render(<App ambiente={ambienteDeTeste()} />);
-    const prestacoes = secao(/3 · Prestações em atraso/);
-    const pagamentos = secao(/4 · Pagamentos/);
+    const prestacoes = secao(/4 · Prestações em atraso/);
+    const pagamentos = secao(/5 · Pagamentos/);
     expect(pagamentos.queryByLabelText("Dia do pagamento")).toBeNull();
     await user.click(prestacoes.getByLabelText("Meses em atraso"));
     await user.type(prestacoes.getByLabelText("Dia do vencimento"), "7");
diff --git a/src/ui/tabelas/Personalizar.test.tsx b/src/ui/tabelas/Personalizar.test.tsx
index 850bc59..779d5df 100644
--- a/src/ui/tabelas/Personalizar.test.tsx
+++ b/src/ui/tabelas/Personalizar.test.tsx
@@ -10,7 +10,7 @@ afterEach(cleanup);
 async function montarCaso(user: ReturnType<typeof userEvent.setup>) {
   render(<App ambiente={ambienteDeTeste()} />);
   await user.type(screen.getByLabelText("Valor fixado"), "1.000,00");
-  const prestacoes = within(screen.getByRole("region", { name: /3 · Prestações em atraso/ }));
+  const prestacoes = within(screen.getByRole("region", { name: /4 · Prestações em atraso/ }));
   await user.click(prestacoes.getByLabelText("Meses em atraso"));
   await user.type(prestacoes.getByLabelText("Dia do vencimento"), "5");
   await user.type(prestacoes.getByLabelText("Quantos meses"), "2");
@@ -52,7 +52,7 @@ describe("Personalizar, o lápis da linha (§9.3)", () => {
       "Prestações com valor informado à mão, não apurado pela base dos alimentos: set/2026.",
     );
     // relançar o lote não sobrescreve a edição
-    const prestacoes = within(screen.getByRole("region", { name: /3 · Prestações em atraso/ }));
+    const prestacoes = within(screen.getByRole("region", { name: /4 · Prestações em atraso/ }));
     await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
     expect(
       within(linhaDaPrestacao("prestação de 05/09/2026 (Valor diverso)")).getAllByRole("cell")[1]
@@ -161,7 +161,7 @@ describe("Personalizar, o lápis da linha (§9.3)", () => {
     await user.click(screen.getByLabelText("% dos rendimentos"));
     await user.type(screen.getByLabelText("Percentual dos rendimentos"), "30");
     await user.type(screen.getByLabelText("Rendimento mensal padrão (obrigatório)"), "1.000,00");
-    const prestacoes = within(screen.getByRole("region", { name: /3 · Prestações em atraso/ }));
+    const prestacoes = within(screen.getByRole("region", { name: /4 · Prestações em atraso/ }));
     await user.click(prestacoes.getByLabelText("Meses em atraso"));
     await user.type(prestacoes.getByLabelText("Dia do vencimento"), "5");
     await user.type(prestacoes.getByLabelText("Quantos meses"), "3");
diff --git a/src/ui/tabelas/Tabelas.test.tsx b/src/ui/tabelas/Tabelas.test.tsx
index e7c8d62..f7025b8 100644
--- a/src/ui/tabelas/Tabelas.test.tsx
+++ b/src/ui/tabelas/Tabelas.test.tsx
@@ -51,7 +51,7 @@ function esperado() {
 async function montarCaso(user: ReturnType<typeof userEvent.setup>) {
   render(<App ambiente={ambienteDeTeste()} />);
   await user.type(screen.getByLabelText("Valor fixado"), "1.000,00");
-  const prestacoes = within(screen.getByRole("region", { name: /3 · Prestações em atraso/ }));
+  const prestacoes = within(screen.getByRole("region", { name: /4 · Prestações em atraso/ }));
   await user.click(prestacoes.getByLabelText("Meses em atraso"));
   await user.type(prestacoes.getByLabelText("Dia do vencimento"), "5");
   await user.type(prestacoes.getByLabelText("Quantos meses"), "2");
@@ -141,7 +141,7 @@ describe("lado direito: indicadores, tabelas e memória (§9.3)", () => {
   it("um pagamento entra na tabela de amortizações com as mesmas colunas e abate do total; excluir recalcula", async () => {
     const user = userEvent.setup();
     await montarCaso(user);
-    const pagamentos = within(screen.getByRole("region", { name: /4 · Pagamentos/ }));
+    const pagamentos = within(screen.getByRole("region", { name: /5 · Pagamentos/ }));
     await user.type(pagamentos.getByLabelText("Valor por mês"), "400");
     fireEvent.change(pagamentos.getByLabelText("Primeiro pagamento"), {
       target: { value: "2026-09-05" },
@@ -246,7 +246,7 @@ describe("lado direito: indicadores, tabelas e memória (§9.3)", () => {
     expect(screen.queryByRole("button", { name: /05\/10\/2026/ })).toBeNull();
     expect(document.activeElement).toBe(screen.getByRole("button", { name: "+ Prestação" }));
     // relançado o lote, 05/10/2026 volta com a memória fechada e o ✕ desarmado
-    const lote = within(screen.getByRole("region", { name: /3 · Prestações em atraso/ }));
+    const lote = within(screen.getByRole("region", { name: /4 · Prestações em atraso/ }));
     await user.click(lote.getByRole("button", { name: "Lançar em lote" }));
     expect(
       screen
@@ -365,7 +365,7 @@ describe("lado direito: indicadores, tabelas e memória (§9.3)", () => {
     ).toBeDefined();
     expect(screen.queryByRole("button", { name: /05\/09\/2026/ })).toBeNull();
     // pagamento não fica sem valor
-    const pagamentos = within(screen.getByRole("region", { name: /4 · Pagamentos/ }));
+    const pagamentos = within(screen.getByRole("region", { name: /5 · Pagamentos/ }));
     await user.type(pagamentos.getByLabelText("Valor por mês"), "400");
     fireEvent.change(pagamentos.getByLabelText("Primeiro pagamento"), {
       target: { value: "2026-09-05" },
@@ -500,7 +500,7 @@ describe("lado direito: indicadores, tabelas e memória (§9.3)", () => {
     expect(
       screen.getByLabelText("Percentual do salário mínimo").getAttribute("aria-invalid"),
     ).toBeNull();
-    const prestacoes = within(screen.getByRole("region", { name: /3 · Prestações em atraso/ }));
+    const prestacoes = within(screen.getByRole("region", { name: /4 · Prestações em atraso/ }));
     await user.click(prestacoes.getByLabelText("Meses em atraso"));
     await user.type(prestacoes.getByLabelText("Dia do vencimento"), "5");
     await user.type(prestacoes.getByLabelText("Quantos meses"), "2");
@@ -537,7 +537,7 @@ describe("lado direito: indicadores, tabelas e memória (§9.3)", () => {
   it("amortizações maiores que as prestações: total devido e total geral saem como R$ 0,00, com o aviso do motor", async () => {
     const user = userEvent.setup();
     await montarCaso(user);
-    const pagamentos = within(screen.getByRole("region", { name: /4 · Pagamentos/ }));
+    const pagamentos = within(screen.getByRole("region", { name: /5 · Pagamentos/ }));
     await user.type(pagamentos.getByLabelText("Valor por mês"), "5.000,00");
     fireEvent.change(pagamentos.getByLabelText("Primeiro pagamento"), {
       target: { value: "2026-09-05" },
```

- [ ] **Step 2: Ver falhar.** `npx vitest run`: `Tests  25 failed | 978 passed | 10 skipped (1013)`, em 5 arquivos: o teste novo da ordem (`App.test.tsx`) e os 24 que agora procuram as regiões "4 · Prestações em atraso" e "5 · Pagamentos" (`App.test.tsx`: "todo campo de data…"; `Base.test.tsx`: "no App: dividir a base…"; `Lotes.test.tsx`: os 3 do `describe` de lotes; `Personalizar.test.tsx`: os 6; `Tabelas.test.tsx`: os 13, inclusive os 3 de "Enter segurado"), todos com `Unable to find an accessible element with the role "region" and name /4 · Prestações em atraso/` (ou `/5 · Pagamentos/`), e o da ordem com os títulos na ordem antiga.

- [ ] **Step 3: Aplicar o patch do código** (`$RASCUNHO/t1-codigo.patch`)

```diff
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index ca0c709..91b5006 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -82,8 +82,10 @@ export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambien
 }
 
 /**
- * Tela única em duas colunas (§9): esquerda, dados do caso e lançamentos em lote; direita,
- * resultado e lançamentos individuais. Recálculo a cada alteração, sem botão "Calcular" (§4.3).
+ * Tela única em duas colunas (§9): esquerda, dados do caso e lançamentos em lote, na ordem da §20
+ * (processo, base, encargos e data do cálculo, prestações, pagamentos: os parâmetros antes dos
+ * lançamentos); direita, resultado e lançamentos individuais. Recálculo a cada alteração, sem botão
+ * "Calcular" (§4.3).
  */
 function Tela({
   ambiente,
@@ -322,16 +324,6 @@ function Tela({
             faltas={faltas}
             aoMudar={(base) => despachar({ tipo: "base", base, em: agora() })}
           />
-          <LotePrestacoesSecao
-            ultimoLote={estado.calculo.lotes.ultimoLotePrestacoes}
-            avisos={estado.loteRecente === "prestacoes" ? estado.avisosDoLote : []}
-            aoLancar={(lote) => despachar({ tipo: "lancarPrestacoes", lote, em: agora() })}
-          />
-          <LotePagamentosSecao
-            ultimoLote={estado.calculo.lotes.ultimoLoteAmortizacoes}
-            avisos={estado.loteRecente === "pagamentos" ? estado.avisosDoLote : []}
-            aoLancar={(lote) => despachar({ tipo: "lancarPagamentos", lote, em: agora() })}
-          />
           <Encargos
             calculo={estado.calculo}
             aoMudarAcrescimo={(campo, valor) =>
@@ -351,6 +343,16 @@ function Tela({
               mudarPreferencias({ metodologia: opcao });
             }}
           />
+          <LotePrestacoesSecao
+            ultimoLote={estado.calculo.lotes.ultimoLotePrestacoes}
+            avisos={estado.loteRecente === "prestacoes" ? estado.avisosDoLote : []}
+            aoLancar={(lote) => despachar({ tipo: "lancarPrestacoes", lote, em: agora() })}
+          />
+          <LotePagamentosSecao
+            ultimoLote={estado.calculo.lotes.ultimoLoteAmortizacoes}
+            avisos={estado.loteRecente === "pagamentos" ? estado.avisosDoLote : []}
+            aoLancar={(lote) => despachar({ tipo: "lancarPagamentos", lote, em: agora() })}
+          />
         </div>
         <div className="coluna-direita" key={`direita-${estado.calculo.id}-${aberturas}`}>
           <Indicadores totais={resultado.totais} dataElaboracao={estado.calculo.dataElaboracao} />
diff --git a/src/ui/secoes/Encargos.tsx b/src/ui/secoes/Encargos.tsx
index dbae996..46b9095 100644
--- a/src/ui/secoes/Encargos.tsx
+++ b/src/ui/secoes/Encargos.tsx
@@ -12,7 +12,7 @@ import {
 import { opcaoDaMetodologia, resumirMetodologia } from "../estado/metodologia.ts";
 
 /**
- * Seção "5 · Encargos e data do cálculo" (§9.2; explicações nos balões ⓘ): metodologia escolhida
+ * Seção "3 · Encargos e data do cálculo" (§9.2, na ordem da §20; explicações nos balões ⓘ): metodologia escolhida
  * entre as duas opções pré-carregadas (§17.3; ajustada, nenhuma fica marcada e o resumo em uma
  * frase aparece) e "Ajustar" (abre o editor de períodos), multa e honorários do art. 523,
  * §1º, do CPC (10% cada por padrão, decisão de 13/10/2026), data de elaboração e observações para
@@ -56,7 +56,7 @@ export function Encargos({
   return (
     <section className="secao" aria-labelledby="titulo-encargos">
       <div className="titulo-secao">
-        <h2 id="titulo-encargos">5 · Encargos e data do cálculo</h2>
+        <h2 id="titulo-encargos">3 · Encargos e data do cálculo</h2>
       </div>
       <fieldset className="grupo metodologia-de-encargos">
         <legend>
diff --git a/src/ui/secoes/LotePagamentos.tsx b/src/ui/secoes/LotePagamentos.tsx
index cf23ea2..d68aeb3 100644
--- a/src/ui/secoes/LotePagamentos.tsx
+++ b/src/ui/secoes/LotePagamentos.tsx
@@ -14,7 +14,7 @@ import {
 import { intervaloDoLote, MAXIMO_DE_MESES } from "./LotePrestacoes.tsx";
 
 /**
- * Seção "4 · Pagamentos" (§6.2, §9.2): valor por mês e o intervalo de pagamentos, com o primeiro e
+ * Seção "5 · Pagamentos" (§6.2, §9.2): valor por mês e o intervalo de pagamentos, com o primeiro e
  * o último pagamento em datas completas, como o intervalo de vencimentos das prestações (decisão de
  * 13/10/2026): um pagamento por mês, no dia do primeiro (no último dia, nos meses mais curtos), até
  * o último. "Lançar em lote", cumulativo. Um segundo pagamento no mesmo mês entra como pagamento
@@ -72,7 +72,7 @@ export function LotePagamentosSecao({
   return (
     <section className="secao" aria-labelledby="titulo-pagamentos">
       <div className="titulo-secao">
-        <h2 id="titulo-pagamentos">4 · Pagamentos</h2>
+        <h2 id="titulo-pagamentos">5 · Pagamentos</h2>
         <Ajuda assunto="Pagamentos">
           Lança um pagamento por mês, do primeiro ao último pagamento, no dia do primeiro (no último
           dia do mês, quando ele é mais curto). Cada pagamento é atualizado da sua data até a data
diff --git a/src/ui/secoes/LotePrestacoes.tsx b/src/ui/secoes/LotePrestacoes.tsx
index 6a6b32f..00af95b 100644
--- a/src/ui/secoes/LotePrestacoes.tsx
+++ b/src/ui/secoes/LotePrestacoes.tsx
@@ -16,7 +16,7 @@ import { DATA_MAXIMA, DATA_MINIMA, lerData, lerInteiro } from "../entrada.ts";
 export const MAXIMO_DE_MESES = 600;
 
 /**
- * Seção "3 · Prestações em atraso" (§6.1, §9.2). Por padrão, o intervalo de vencimentos, com o
+ * Seção "4 · Prestações em atraso" (§6.1, §9.2). Por padrão, o intervalo de vencimentos, com o
  * primeiro e o último vencimento em datas completas: as prestações vencem todo mês no dia do
  * primeiro (no último dia, nos meses mais curtos), até o último vencimento informado. Em "Meses
  * em atraso", aparecem o dia do vencimento e quantos meses (decisão de 13/10/2026). "Lançar em
@@ -85,7 +85,7 @@ export function LotePrestacoesSecao({
   return (
     <section className="secao" aria-labelledby="titulo-prestacoes">
       <div className="titulo-secao">
-        <h2 id="titulo-prestacoes">3 · Prestações em atraso</h2>
+        <h2 id="titulo-prestacoes">4 · Prestações em atraso</h2>
         <Ajuda assunto="Prestações em atraso">
           Cada "Lançar em lote" acrescenta as prestações do período à tabela ao lado, sem apagar as
           anteriores (ex.: jan a mar; depois jul a set); um mês de vencimento já lançado não é
diff --git a/src/ui/tabelas/TabelaLancamentos.tsx b/src/ui/tabelas/TabelaLancamentos.tsx
index 44b06ca..be60dbe 100644
--- a/src/ui/tabelas/TabelaLancamentos.tsx
+++ b/src/ui/tabelas/TabelaLancamentos.tsx
@@ -253,8 +253,8 @@ export function TabelaLancamentos({
               <tr>
                 <td colSpan={8} className="texto">
                   {prestacoes
-                    ? 'Nenhuma prestação lançada: use "Lançar em lote" na seção 3 ou "+ Prestação".'
-                    : 'Nenhum pagamento lançado: use "Lançar em lote" na seção 4 ou "+ Pagamento".'}
+                    ? 'Nenhuma prestação lançada: use "Lançar em lote" na seção 4 ou "+ Prestação".'
+                    : 'Nenhum pagamento lançado: use "Lançar em lote" na seção 5 ou "+ Pagamento".'}
                 </td>
               </tr>
             ) : null}
```

- [ ] **Step 4: Verificar.** `npm run format && npm run verificar`: o `format` não muda nada; `Tests  1003 passed | 10 skipped (1013)`, 60 arquivos.

- [ ] **Step 5: Commit.** `git add -A && git commit -m "ui: seções da esquerda na ordem da §20 (parâmetros antes dos lançamentos)"` (com a linha de coautoria).

---

### Task 2: Cabeçalho fixo: a barra presa no topo, mais baixa, com a altura reservada ao rolar até o foco

**Files:**
- Create: `scripts/estilos.test.ts`
- Modify: `src/ui/estilos.css`

**Interfaces:**
- Consumes: `.barra`, `.logo`, `.marca`, `.marca small` e o bloco `@media (max-width: 1023px)` de `estilos.css` como estão.
- Produces: a variável `--barra-altura: 64px` em `:root` (a Task 3 a usa no `top` e no `max-height` da coluna presa); as funções `bloco(texto, cabecalho)` e `declaracoes(corpo)` e a constante `estreita` em `scripts/estilos.test.ts` (a Task 3 acrescenta um `describe` que as usa).

- [ ] **Step 1: Aplicar o patch dos testes** (`$RASCUNHO/t2-testes.patch`)

```diff
diff --git a/scripts/estilos.test.ts b/scripts/estilos.test.ts
new file mode 100644
index 0000000..ee452e3
--- /dev/null
+++ b/scripts/estilos.test.ts
@@ -0,0 +1,82 @@
+// A folha de estilos da tela (src/ui/estilos.css), lida do disco: fica em scripts/ porque lê um
+// arquivo do repositório com o Node, como site.test.ts (o vitest entrega vazio um `.css?raw`).
+import { readFileSync } from "node:fs";
+import { describe, expect, it } from "vitest";
+
+const estilos = readFileSync(new URL("../src/ui/estilos.css", import.meta.url), "utf8");
+
+/**
+ * O jsdom não calcula layout: o que a tela faz ao rolar (barra presa, coluna da direita presa com
+ * rolagem própria, cabeçalhos das tabelas presos) só se vê no navegador. Estes testes leem a folha
+ * de estilos e prendem as declarações que sustentam essas decisões (§20 do design), para que uma
+ * mudança descuidada não as perca sem ninguém notar: provam que a regra está escrita, não que o
+ * navegador a aplica (isso é a conferência visual da fase).
+ */
+
+/** O CSS sem comentários, com o espaço em branco reduzido a um espaço. */
+const css = estilos.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ");
+
+/** As regras de primeiro nível de `texto`: o cabeçalho e o conteúdo entre chaves (aninhadas incluídas). */
+function regras(texto: string): Array<{ cabecalho: string; corpo: string }> {
+  const lista: Array<{ cabecalho: string; corpo: string }> = [];
+  let i = 0;
+  for (let abre = texto.indexOf("{", i); abre !== -1; abre = texto.indexOf("{", i)) {
+    let nivel = 1;
+    let j = abre + 1;
+    for (; j < texto.length && nivel > 0; j++) {
+      if (texto[j] === "{") nivel++;
+      else if (texto[j] === "}") nivel--;
+    }
+    lista.push({
+      cabecalho: texto.slice(i, abre).trim(),
+      corpo: texto.slice(abre + 1, j - 1).trim(),
+    });
+    i = j;
+  }
+  return lista;
+}
+
+/**
+ * O conteúdo das regras de primeiro nível de `texto` (a folha inteira ou o conteúdo de um bloco
+ * @media) cujo cabeçalho é exatamente `cabecalho`. Com mais de uma regra igual, os conteúdos se
+ * juntam na ordem da folha, e a declaração posterior vence, como no navegador.
+ */
+function bloco(texto: string, cabecalho: string): string {
+  const alvo = cabecalho.replace(/\s+/g, " ").trim();
+  const achadas = regras(texto).filter((r) => r.cabecalho === alvo);
+  if (achadas.length === 0) throw new Error(`Regra "${cabecalho}" não encontrada.`);
+  return achadas.map((r) => r.corpo).join("; ");
+}
+
+/** As declarações de um bloco, como pares nome → valor. */
+function declaracoes(corpo: string): Map<string, string> {
+  const mapa = new Map<string, string>();
+  for (const parte of corpo.split(";")) {
+    const [nome = "", ...valor] = parte.split(":");
+    if (nome.trim() !== "" && !nome.includes("{")) mapa.set(nome.trim(), valor.join(":").trim());
+  }
+  return mapa;
+}
+
+const estreita = bloco(css, "@media (max-width: 1023px)");
+
+describe("cabeçalho fixo (§20.1)", () => {
+  it("a barra fica presa no topo, acima do conteúdo, e tem a altura declarada em --barra-altura", () => {
+    const barra = declaracoes(bloco(css, ".barra"));
+    expect(barra.get("position")).toBe("sticky");
+    expect(barra.get("top")).toBe("0");
+    expect(Number(barra.get("z-index"))).toBeGreaterThan(0);
+    expect(declaracoes(bloco(css, ":root")).get("--barra-altura")).toBe("64px");
+  });
+
+  it("o campo em foco nunca fica escondido sob a barra: a página reserva a altura dela ao rolar até o foco (WCAG 2.4.11)", () => {
+    expect(declaracoes(bloco(css, "html")).get("scroll-padding-top")).toBe(
+      "calc(var(--barra-altura) + 8px)",
+    );
+  });
+
+  it("em telas estreitas, onde a barra quebra em mais de uma linha, ela não fica presa e nada é reservado", () => {
+    expect(declaracoes(bloco(estreita, ".barra")).get("position")).toBe("static");
+    expect(declaracoes(bloco(estreita, "html")).get("scroll-padding-top")).toBe("0");
+  });
+});
```

O que este teste prova: que a folha de estilos declara a barra presa (`position: sticky; top: 0`, com `z-index`), a altura em `--barra-altura`, a reserva `scroll-padding-top` na raiz e, abaixo de 1024 px, a barra `static` sem reserva. O que fica só na conferência visual (Task 6): que a barra de fato fica presa e mede 64 px, cabe numa linha em 1024 px, e que o campo em foco fica abaixo dela.

- [ ] **Step 2: Ver falhar.** `npx vitest run`: `Tests  3 failed | 1003 passed | 10 skipped (1016)`, 1 arquivo: os três testes de "cabeçalho fixo (§20.1)" (`expected undefined to be 'sticky'`; `Error: Regra "html" não encontrada.`; `expected undefined to be 'static'`).

- [ ] **Step 3: Aplicar o patch do código** (`$RASCUNHO/t2-codigo.patch`)

```diff
diff --git a/src/ui/estilos.css b/src/ui/estilos.css
index cba0318..ec3d95d 100644
--- a/src/ui/estilos.css
+++ b/src/ui/estilos.css
@@ -23,6 +23,9 @@
   --foco: #1fa463;
   --titulos: "Ubuntu", "Segoe UI", system-ui, sans-serif;
   --corpo: "Source Sans 3", "Segoe UI", system-ui, sans-serif;
+  /* altura da barra presa (§20.1): logo de 40 px, 10 px de espaço em cima e embaixo e a linha
+     dourada de 4 px; a página e a coluna da direita a usam para não esconder nada sob ela */
+  --barra-altura: 64px;
   color-scheme: light;
 }
 
@@ -80,6 +83,12 @@ body {
   line-height: 1.45;
 }
 
+/* ao rolar até um campo que recebe o foco (Tab), a página reserva a altura da barra presa, para o
+   campo nunca ficar escondido sob ela (WCAG 2.4.11) */
+html {
+  scroll-padding-top: calc(var(--barra-altura) + 8px);
+}
+
 h1,
 h2,
 h3 {
@@ -117,14 +126,20 @@ textarea {
   flex-direction: column;
 }
 
+/* A barra fica presa no topo ao rolar a página (§20.1), sem animação; para não tomar espaço
+   demais presa, ela ficou mais baixa de vez (64 px: logo de 40 px, antes 48). Abaixo de 1024 px,
+   onde ela quebra em mais de uma linha, volta a rolar com a página. */
 .barra {
+  position: sticky;
+  top: 0;
+  z-index: 9;
   background: var(--cabecalho-fundo);
   color: var(--cabecalho-texto);
   display: flex;
   flex-wrap: wrap;
   align-items: center;
   gap: 12px 24px;
-  padding: 14px 24px;
+  padding: 10px 24px;
   /* linha dourada da faixa do relatório (§10.1) */
   border-bottom: 4px solid var(--ouro);
 }
@@ -142,9 +157,9 @@ textarea {
   min-width: 0;
 }
 
-/* logo horizontal branco: 48 px de altura, com respiro (§10.2, área de proteção do manual) */
+/* logo horizontal branco: 40 px de altura, com respiro (§10.2, área de proteção do manual) */
 .logo {
-  height: 48px;
+  height: 40px;
   width: auto;
   flex: none;
 }
@@ -155,7 +170,7 @@ textarea {
   padding-left: 20px;
   border-left: 1px solid rgba(255, 255, 255, 0.35);
   font-family: var(--titulos);
-  font-size: 24px;
+  font-size: 22px;
   font-weight: 700;
   line-height: 1.1;
   letter-spacing: 0.01em;
@@ -164,7 +179,7 @@ textarea {
 .marca small {
   font-family: var(--corpo);
   font-weight: 400;
-  font-size: 13.5px;
+  font-size: 12.5px;
   letter-spacing: 0.02em;
   opacity: 0.9;
 }
@@ -1050,9 +1065,15 @@ td.dica {
     font-size: 20px;
   }
 
+  /* a barra quebra em duas linhas: volta a rolar com a página, e nada é reservado no topo */
   .barra {
+    position: static;
     padding: 12px 16px;
   }
+
+  html {
+    scroll-padding-top: 0;
+  }
 }
 
 .rotulo-estatico {
```

Por que `z-index: 9`: os painéis (`.dialogo-fundo`, 10) e os balões flutuantes (`.balao.flutuante`, 20) ficam por cima da barra; os balões comuns (`.balao`, 5) e o erro da célula em edição (3) passam por baixo dela quando a seção rola para cima.

- [ ] **Step 4: Verificar.** `npm run format && npm run verificar`: o `format` não muda nada; `Tests  1006 passed | 10 skipped (1016)`, 61 arquivos.

- [ ] **Step 5: Commit.** `git add -A && git commit -m "ui: barra presa no topo, mais baixa (64 px), com a altura reservada ao rolar até o foco (§20.1)"`.

---

### Task 3: Tabela sempre à vista: a coluna da direita presa, com rolagem própria, título e cabeçalho das tabelas presos

**Files:**
- Modify: `src/ui/App.tsx` (área rolável), `src/ui/tabelas/TabelaLancamentos.tsx` (balão flutuante; medida `transborda`), `src/ui/estilos.css` (bloco `@media (min-width: 1024px) and (min-height: 600px)` e a dissolução abaixo de 1024 px)
- Test: `scripts/estilos.test.ts` (`describe` novo), `src/ui/App.test.tsx`, `src/ui/tabelas/Tabelas.test.tsx`

**Interfaces:**
- Consumes: `--barra-altura` (Task 2); `bloco`, `declaracoes`, `estreita` de `scripts/estilos.test.ts` (Task 2); `Ajuda` com a opção `flutuante` (§17.4); `Indicadores` com a classe `indicadores resumo` e `aria-label="Resumo do cálculo"`.
- Produces: `<div className="coluna-rolavel" role="region" aria-label="Tabelas e avisos" tabIndex={0}>` no `App.tsx`, envolvendo as duas tabelas e `Avisos`; `tabelaTransborda(caixa: HTMLElement): boolean` exportada de `TabelaLancamentos.tsx` e a `ref` `caixaDaTabela` na `div.rolagem` (a Task 4 a usa para achar a linha nova); a classe `transborda` na `div.rolagem` quando a tabela é mais larga que ela; as variáveis `--titulo-da-tabela: 35px` e `--cabecalhos-da-tabela: 62px`.

- [ ] **Step 1: Aplicar o patch dos testes** (`$RASCUNHO/t3-testes.patch`)

```diff
diff --git a/scripts/estilos.test.ts b/scripts/estilos.test.ts
index ee452e3..61f261f 100644
--- a/scripts/estilos.test.ts
+++ b/scripts/estilos.test.ts
@@ -80,3 +80,47 @@ describe("cabeçalho fixo (§20.1)", () => {
     expect(declaracoes(bloco(estreita, "html")).get("scroll-padding-top")).toBe("0");
   });
 });
+
+describe("tabela sempre à vista: a coluna da direita presa, com rolagem própria (§20.3)", () => {
+  const larga = () => bloco(css, "@media (min-width: 1024px) and (min-height: 600px)");
+
+  it("a partir de 1024 px de largura e 600 px de altura, a coluna da direita fica presa abaixo da barra e ocupa a altura que sobra", () => {
+    const coluna = declaracoes(bloco(larga(), ".coluna-direita"));
+    expect(coluna.get("position")).toBe("sticky");
+    expect(coluna.get("top")).toBe("calc(var(--barra-altura) + 16px)");
+    expect(coluna.get("max-height")).toBe("calc(100vh - var(--barra-altura) - 32px)");
+  });
+
+  it("a área rolável é uma só para a coluna inteira, e a rolagem dela não passa para a página ao chegar ao fim", () => {
+    const area = declaracoes(bloco(larga(), ".coluna-rolavel"));
+    expect(area.get("overflow")).toBe("auto");
+    expect(area.get("overscroll-behavior")).toBe("contain");
+    expect(area.get("scroll-padding-top")).toBe("var(--cabecalhos-da-tabela)");
+    // a tabela que cabe na coluna perde a rolagem lateral própria (senão o cabeçalho dela não
+    // teria como ficar preso); a que não cabe (marcada pelo componente) continua rolando de lado
+    expect(
+      declaracoes(bloco(larga(), ".tabela-rolagem > .rolagem:not(.transborda)")).get("overflow-x"),
+    ).toBe("visible");
+  });
+
+  it("o título de cada tabela e a linha de títulos das colunas ficam presos no topo da área, como o congelar painéis", () => {
+    const titulo = declaracoes(bloco(larga(), ".tabela-rolagem > .titulo-secao"));
+    expect(titulo.get("position")).toBe("sticky");
+    expect(titulo.get("top")).toBe("0");
+    expect(titulo.get("height")).toBe("var(--titulo-da-tabela)");
+    const cabecalho = declaracoes(bloco(larga(), ".tabela-rolagem thead th"));
+    expect(cabecalho.get("position")).toBe("sticky");
+    expect(cabecalho.get("top")).toBe("var(--titulo-da-tabela)");
+    // o lápis e o ✕ continuam presos à direita (§18.6), também no cabeçalho
+    expect(declaracoes(bloco(larga(), ".tabela-rolagem thead th:last-child")).get("right")).toBe(
+      "0",
+    );
+  });
+
+  it("fora das telas largas e altas, a área rolável é dissolvida (não é caixa nem parada do Tab); abaixo de 1024 px as tabelas voltam a rolar sozinhas", () => {
+    expect(declaracoes(bloco(css, ".coluna-rolavel")).get("display")).toBe("contents");
+    expect(declaracoes(bloco(larga(), ".coluna-rolavel")).get("display")).toBe("flex");
+    expect(declaracoes(bloco(estreita, ".coluna-direita")).get("display")).toBe("contents");
+    expect(declaracoes(bloco(css, ".tabela-rolagem > .rolagem")).get("overflow-x")).toBe("auto");
+  });
+});
diff --git a/src/ui/App.test.tsx b/src/ui/App.test.tsx
index 986d5a1..fa04fd3 100644
--- a/src/ui/App.test.tsx
+++ b/src/ui/App.test.tsx
@@ -56,6 +56,22 @@ describe("App (fundação da tela)", () => {
     );
   });
 
+  it("a coluna da direita tem os indicadores no topo e, embaixo, uma área rolável com nome, que recebe foco pelo teclado, com as duas tabelas e os avisos (§20.3)", () => {
+    render(<App ambiente={ambienteDeTeste()} />);
+    const direita = document.querySelector(".coluna-direita") as HTMLElement;
+    const area = within(direita).getByRole("region", { name: "Tabelas e avisos" });
+    expect(area.className).toBe("coluna-rolavel");
+    expect(area.tabIndex).toBe(0);
+    // os indicadores ficam fora da área rolável, antes dela (parados no topo da coluna)
+    const resumo = within(direita).getByLabelText("Resumo do cálculo");
+    expect(area.contains(resumo)).toBe(false);
+    expect(resumo.compareDocumentPosition(area) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
+    // dentro dela, as duas tabelas e a caixa de avisos
+    expect(within(area).getByRole("region", { name: "Prestações" })).toBeDefined();
+    expect(within(area).getByRole("region", { name: "Amortizações (pagamentos)" })).toBeDefined();
+    expect(within(area).getByRole("region", { name: "Avisos" })).toBeDefined();
+  });
+
   it("mostra na caixa de avisos os meses já divulgados que ainda não chegaram ao Apura", () => {
     render(<App ambiente={ambienteDeTeste({ limites: { "433": "2026-07" } })} />);
     const avisos = screen.getByRole("region", { name: "Avisos" });
diff --git a/src/ui/tabelas/Tabelas.test.tsx b/src/ui/tabelas/Tabelas.test.tsx
index f7025b8..a30d81f 100644
--- a/src/ui/tabelas/Tabelas.test.tsx
+++ b/src/ui/tabelas/Tabelas.test.tsx
@@ -115,6 +115,61 @@ describe("lado direito: indicadores, tabelas e memória (§9.3)", () => {
     ).toBeDefined();
   });
 
+  it("o balão ⓘ do título da tabela flutua em posição fixa, para não ficar cortado pela rolagem da coluna (§20.3)", async () => {
+    const user = userEvent.setup();
+    render(<App ambiente={ambienteDeTeste()} />);
+    await user.click(screen.getByRole("button", { name: "Ajuda: Prestações" }));
+    expect(screen.getByText(/Clique no vencimento ou no valor/).className).toBe("balao flutuante");
+    await user.keyboard("{Escape}");
+    await user.click(screen.getByRole("button", { name: "Ajuda: Amortizações (pagamentos)" }));
+    expect(screen.getByText(/Clique na data ou no valor/).className).toBe("balao flutuante");
+  });
+
+  it('a tabela mais larga que a caixa é marcada "transborda" (rola de lado sozinha); a que cabe, não (§20.3)', async () => {
+    // o jsdom não mede: ResizeObserver e as larguras são simulados. A caixa de cada tabela tem
+    // 540 px; a tabela de prestações mede 603 (não cabe) e a de pagamentos, 500 (cabe).
+    const observadores: Array<() => void> = [];
+    vi.stubGlobal(
+      "ResizeObserver",
+      class {
+        constructor(aoMudar: () => void) {
+          observadores.push(aoMudar);
+        }
+        observe() {}
+        disconnect() {}
+      },
+    );
+    let larguraDasPrestacoes = 603;
+    const retangulo = vi
+      .spyOn(Element.prototype, "getBoundingClientRect")
+      .mockImplementation(function (this: Element) {
+        const prestacoes =
+          this.closest("section")?.getAttribute("aria-labelledby") === "titulo-tabela-prestacoes";
+        const w = this.tagName !== "TABLE" ? 0 : prestacoes ? larguraDasPrestacoes : 500;
+        const caixa = { top: 0, bottom: 0, left: 0, right: w, width: w, height: 0 };
+        return { ...caixa, x: 0, y: 0, toJSON: () => caixa } as DOMRect;
+      });
+    const clientWidth = vi
+      .spyOn(Element.prototype, "clientWidth", "get")
+      .mockImplementation(function (this: Element) {
+        return this.classList.contains("rolagem") ? 540 : 0;
+      });
+    try {
+      await montarCaso(userEvent.setup());
+      const caixas = () =>
+        [...document.querySelectorAll(".tabela-rolagem > .rolagem")].map((c) => c.className);
+      expect(caixas()).toEqual(["rolagem transborda", "rolagem"]);
+      // a medida é refeita quando a caixa ou a tabela mudam de largura: a tabela passa a caber
+      larguraDasPrestacoes = 540;
+      act(() => observadores.forEach((aoMudar) => aoMudar()));
+      expect(caixas()).toEqual(["rolagem", "rolagem"]);
+    } finally {
+      retangulo.mockRestore();
+      clientWidth.mockRestore();
+      vi.unstubAllGlobals();
+    }
+  });
+
   it("▸ expande a memória (base, índices, juros e avisos) e volta a esconder", async () => {
     const user = userEvent.setup();
     await montarCaso(user);
```

O que estes testes provam: a estrutura da coluna (indicadores antes da área; a área com nome, `tabIndex` 0 e as duas tabelas e os avisos dentro), o balão do título em modo flutuante, a marca `transborda` decidida pela comparação das larguras e refeita quando elas mudam, e as declarações do CSS (coluna presa, área com rolagem própria e `overscroll-behavior: contain`, títulos e cabeçalhos presos, área dissolvida por padrão e caixa só no bloco largo-e-alto, tabelas rolando sozinhas abaixo de 1024 px). O que fica só na conferência visual (Task 6): que a coluna fica presa e rola sozinha, que os títulos e cabeçalhos ficam parados enquanto as linhas rolam, que a rolagem não passa para a página no fim, que em 1024 px a tabela rola de lado sozinha com o lápis e o ✕ à vista, e que os balões não ficam cortados.

- [ ] **Step 2: Ver falhar.** `npx vitest run`: `Tests  7 failed | 1006 passed | 10 skipped (1023)`, 3 arquivos: os quatro do `describe` "tabela sempre à vista" em `scripts/estilos.test.ts` (três com `Error: Regra "@media (min-width: 1024px) and (min-height: 600px)" não encontrada.` e o quarto com `Error: Regra ".coluna-rolavel" não encontrada.`); em `App.test.tsx`, "a coluna da direita tem os indicadores no topo…" (`Unable to find an accessible element with the role "region" and name "Tabelas e avisos"`); em `Tabelas.test.tsx`, "o balão ⓘ do título da tabela flutua…" (`expected 'balao' to be 'balao flutuante'`) e "a tabela mais larga que a caixa é marcada "transborda"…" (`expected [ 'rolagem', 'rolagem' ] to deeply equal [ 'rolagem transborda', 'rolagem' ]`).

- [ ] **Step 3: Aplicar o patch do código** (`$RASCUNHO/t3-codigo.patch`)

```diff
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index 91b5006..a221b06 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -356,27 +356,33 @@ function Tela({
         </div>
         <div className="coluna-direita" key={`direita-${estado.calculo.id}-${aberturas}`}>
           <Indicadores totais={resultado.totais} dataElaboracao={estado.calculo.dataElaboracao} />
-          <TabelaLancamentos
-            tipo="prestacao"
-            linhas={linhas.filter((l) => l.lancamento.tipo === "prestacao")}
-            aoPersonalizar={personalizar}
-            aoExcluir={excluir}
-            aoEditar={editar}
-            aoSugerir={() => sugerirPrestacao(estado.calculo, estado.tabela)}
-            valorDaBase={valorDaBase}
-            aoIncluir={incluir}
-          />
-          <TabelaLancamentos
-            tipo="amortizacao"
-            linhas={linhas.filter((l) => l.lancamento.tipo === "amortizacao")}
-            aoPersonalizar={personalizar}
-            aoExcluir={excluir}
-            aoEditar={editar}
-            aoSugerir={() => sugerirPagamento(estado.calculo)}
-            valorDaBase={valorDaBase}
-            aoIncluir={incluir}
-          />
-          <Avisos avisos={avisosDaTela} />
+          {/* Tabela sempre à vista (§20.3): em telas largas e altas o CSS prende a coluna abaixo
+              da barra e dá a esta área (as duas tabelas e os avisos) uma rolagem própria; ela tem
+              nome e recebe o foco pelo teclado (nas colunas empilhadas, o CSS a dissolve, e o
+              navegador não a põe na ordem do Tab) */}
+          <div className="coluna-rolavel" role="region" aria-label="Tabelas e avisos" tabIndex={0}>
+            <TabelaLancamentos
+              tipo="prestacao"
+              linhas={linhas.filter((l) => l.lancamento.tipo === "prestacao")}
+              aoPersonalizar={personalizar}
+              aoExcluir={excluir}
+              aoEditar={editar}
+              aoSugerir={() => sugerirPrestacao(estado.calculo, estado.tabela)}
+              valorDaBase={valorDaBase}
+              aoIncluir={incluir}
+            />
+            <TabelaLancamentos
+              tipo="amortizacao"
+              linhas={linhas.filter((l) => l.lancamento.tipo === "amortizacao")}
+              aoPersonalizar={personalizar}
+              aoExcluir={excluir}
+              aoEditar={editar}
+              aoSugerir={() => sugerirPagamento(estado.calculo)}
+              valorDaBase={valorDaBase}
+              aoIncluir={incluir}
+            />
+            <Avisos avisos={avisosDaTela} />
+          </div>
         </div>
       </main>
       <Rodape situacaoDosIndices={estado.situacao.rodape} />
diff --git a/src/ui/estilos.css b/src/ui/estilos.css
index ec3d95d..e8b7a85 100644
--- a/src/ui/estilos.css
+++ b/src/ui/estilos.css
@@ -26,6 +26,10 @@
   /* altura da barra presa (§20.1): logo de 40 px, 10 px de espaço em cima e embaixo e a linha
      dourada de 4 px; a página e a coluna da direita a usam para não esconder nada sob ela */
   --barra-altura: 64px;
+  /* alturas do título de cada tabela e dele mais a linha de títulos das colunas, presos no topo
+     da área rolável (§20.3); a área as reserva ao rolar até um controle que recebe o foco */
+  --titulo-da-tabela: 35px;
+  --cabecalhos-da-tabela: 62px;
   color-scheme: light;
 }
 
@@ -253,6 +257,14 @@ textarea {
   min-width: 0;
 }
 
+/* a área rolável da coluna da direita (§20.3) só existe como caixa nas telas largas e altas (bloco
+   @media mais abaixo); fora delas é dissolvida: as tabelas e os avisos entram direto na coluna (ou
+   na grade, nas colunas empilhadas), e um elemento dissolvido não recebe foco nem entra na ordem
+   do Tab */
+.coluna-rolavel {
+  display: contents;
+}
+
 .rodape {
   display: flex;
   flex-wrap: wrap;
@@ -573,6 +585,9 @@ textarea {
 .tabela-rolagem > .rolagem {
   position: relative;
   overflow-x: auto;
+  /* ao rolar de lado até uma célula que recebe o foco, reserva a largura do lápis e do ✕, presos
+     à borda direita (§18.6), para a célula não ficar escondida sob eles */
+  scroll-padding-right: 72px;
 }
 
 .tabela-rolagem > .titulo-secao {
@@ -1076,6 +1091,72 @@ td.dica {
   }
 }
 
+/* ---- Tabela sempre à vista (§20.3): a coluna da direita presa, com rolagem própria ---- */
+
+/* A partir de 1024 px de largura e 600 px de altura: a coluna da direita fica presa logo abaixo
+   da barra e ocupa a altura que sobra da tela; a página continua rolando pela esquerda. Os cinco
+   indicadores ficam parados no topo da coluna; o que vem embaixo (as duas tabelas e os avisos)
+   fica numa área com rolagem própria, uma só para a coluna inteira. Em tela mais baixa, ou mais
+   estreita, nada fica preso (as colunas empilham abaixo de 1024 px, como antes). */
+@media (min-width: 1024px) and (min-height: 600px) {
+  .coluna-direita {
+    position: sticky;
+    top: calc(var(--barra-altura) + 16px);
+    max-height: calc(100vh - var(--barra-altura) - 32px);
+  }
+
+  .coluna-direita > .indicadores {
+    flex: none;
+  }
+
+  /* a área rolável: a rolagem não passa para a página ao chegar ao fim (overscroll-behavior),
+     e, ao rolar até um controle que recebe o foco, a área reserva a altura dos cabeçalhos presos */
+  .coluna-rolavel {
+    display: flex;
+    flex: 1 1 auto;
+    flex-direction: column;
+    gap: 12px;
+    min-height: 0;
+    overflow: auto;
+    overscroll-behavior: contain;
+    scroll-padding-top: var(--cabecalhos-da-tabela);
+  }
+
+  /* Um cabeçalho só fica preso em relação à caixa que rola. A rolagem lateral própria de cada
+     tabela (overflow-x: auto na .rolagem), que a tabela mais larga que a coluna precisa, faz da
+     .rolagem essa caixa, e ela não rola na vertical: o cabeçalho ficaria solto. Por isso a tabela
+     que cabe na coluna (a partir de cerca de 1150 px de tela, com valores na casa do milhar) perde
+     a rolagem própria, e o cabeçalho se prende à área rolável da coluna; a tabela que não cabe
+     (o componente mede e marca `transborda`) rola de lado sozinha, como antes, com o título preso
+     e o cabeçalho rolando junto com as linhas. */
+  .tabela-rolagem > .rolagem:not(.transborda) {
+    overflow-x: visible;
+  }
+
+  /* presos no topo da área, como o "congelar painéis" da planilha: o título da tabela e, logo
+     abaixo, a linha de títulos das colunas (os números rolam por baixo dos dois) */
+  .tabela-rolagem > .titulo-secao {
+    position: sticky;
+    top: 0;
+    z-index: 3;
+    height: var(--titulo-da-tabela);
+    background: var(--superficie);
+    border-radius: 7px 7px 0 0;
+  }
+
+  .tabela-rolagem thead th {
+    position: sticky;
+    top: var(--titulo-da-tabela);
+    z-index: 2;
+  }
+
+  /* o lápis e o ✕ continuam presos à direita (§18.6), também no cabeçalho, por cima dele */
+  .tabela-rolagem thead th:last-child {
+    right: 0;
+    z-index: 3;
+  }
+}
+
 .rotulo-estatico {
   font-size: 11.5px;
   text-transform: uppercase;
diff --git a/src/ui/tabelas/TabelaLancamentos.tsx b/src/ui/tabelas/TabelaLancamentos.tsx
index be60dbe..9205bed 100644
--- a/src/ui/tabelas/TabelaLancamentos.tsx
+++ b/src/ui/tabelas/TabelaLancamentos.tsx
@@ -3,6 +3,7 @@ import {
   useCallback,
   useEffect,
   useId,
+  useLayoutEffect,
   useRef,
   useState,
   type KeyboardEvent,
@@ -152,6 +153,24 @@ export function TabelaLancamentos({
     else novo.add(id);
     setExpandidos(novo);
   };
+  // A tabela mais larga que a coluna rola de lado sozinha (classe `transborda` na caixa que a
+  // envolve); a que cabe, não, e o cabeçalho dela pode ficar preso ao rolar a coluna (§20.3; o
+  // CSS explica). Medido de novo quando a caixa ou a tabela mudam de largura (a tabela é sempre o
+  // mesmo elemento, mesmo vazia: um observador só, pela vida do componente); sem ResizeObserver
+  // (testes em jsdom), a tabela é tida como cabendo.
+  const caixaDaTabela = useRef<HTMLDivElement>(null);
+  const [transborda, setTransborda] = useState(false);
+  useLayoutEffect(() => {
+    const caixa = caixaDaTabela.current;
+    if (caixa === null || typeof ResizeObserver === "undefined") return;
+    const medir = () => setTransborda(tabelaTransborda(caixa));
+    medir();
+    const observador = new ResizeObserver(medir);
+    observador.observe(caixa);
+    const tabela = caixa.querySelector("table");
+    if (tabela !== null) observador.observe(tabela);
+    return () => observador.disconnect();
+  }, []);
   const prestacoes = tipo === "prestacao";
   const titulo = prestacoes ? "Prestações" : "Amortizações (pagamentos)";
   const tituloId = prestacoes ? "titulo-tabela-prestacoes" : "titulo-tabela-amortizacoes";
@@ -220,13 +239,14 @@ export function TabelaLancamentos({
     <section className="tabela-rolagem" aria-labelledby={tituloId}>
       <div className="titulo-secao">
         <h2 id={tituloId}>{titulo}</h2>
-        <Ajuda assunto={titulo}>
+        {/* flutuante: o balão não fica cortado pela rolagem própria da coluna (§20.3) */}
+        <Ajuda assunto={titulo} flutuante>
           {prestacoes
             ? "Clique no vencimento ou no valor para corrigi-lo na própria linha: Enter grava, Esc desiste. Valor digitado fica marcado como informado à mão; apagado, volta a ser apurado pela base. ▸ mostra a memória do cálculo; o lápis ajusta descrição, rendimento, termos e regras próprias; o ✕ pede confirmação antes de excluir."
             : "Clique na data ou no valor para corrigi-lo na própria linha: Enter grava, Esc desiste. Cada pagamento é atualizado da sua data até a data do cálculo e abatido do total. ▸ mostra a memória do cálculo; o lápis ajusta descrição, termos e regras próprias; o ✕ pede confirmação antes de excluir."}
         </Ajuda>
       </div>
-      <div className="rolagem">
+      <div className={transborda ? "rolagem transborda" : "rolagem"} ref={caixaDaTabela}>
         {/* com alguma descrição (13º, férias), a primeira coluna prefere ser mais larga, para a
             descrição aparecer, sem empurrar o lápis e o ✕ para fora (§17.4) */}
         <table
@@ -386,6 +406,12 @@ export function TabelaLancamentos({
   );
 }
 
+/** A tabela dentro da caixa é mais larga que ela (precisa rolar de lado)? */
+export function tabelaTransborda(caixa: HTMLElement): boolean {
+  const tabela = caixa.querySelector("table");
+  return tabela !== null && tabela.getBoundingClientRect().width > caixa.clientWidth + 0.5;
+}
+
 /**
  * Enter ou Espaço segurados (tecla repetida) num botão não o acionam de novo: segurar Enter em
  * "+ Prestação" ou depois do Enter que exclui pelo ✕ (o foco vai ao "+") não acrescenta linhas.
```

Notas do código: a área é dissolvida (`display: contents`) na regra base e só vira caixa (`display: flex`) no bloco largo-e-alto (T6); é um `flex` em coluna, não uma grade, porque, no ensaio, uma grade `minmax(100%, max-content)` não crescia com a tabela que não cabia; os `z-index` (título 3, cabeçalho 2, última célula do cabeçalho 3) mantêm o lápis e o ✕ do cabeçalho por cima do resto e os títulos por cima das linhas, todos abaixo da barra (9) e dos painéis (10); a coluna presa é um contexto de empilhamento próprio, por isso tudo dentro dela, inclusive os balões flutuantes (20), fica abaixo da barra (limite da T7); o `border-radius: 7px 7px 0 0` do título acompanha o canto da seção quando ela está no lugar e deixa só um canto de 7 px quando o título está preso no meio da tabela; a medida usa `getBoundingClientRect().width` da tabela contra o `clientWidth` da caixa, com 0,5 px de folga, para o arredondamento não marcar `transborda` à toa quando a tabela cabe justa (em 1366 px, 730,2 px de tabela em 730,2 px de caixa); o `ResizeObserver` é criado uma vez por tabela (a tabela é sempre o mesmo elemento, mesmo vazia).

- [ ] **Step 4: Verificar.** `npm run format && npm run verificar`: o `format` não muda nada; `Tests  1013 passed | 10 skipped (1023)`, 61 arquivos.

- [ ] **Step 5: Commit.** `git add -A && git commit -m "ui: coluna da direita presa abaixo da barra, com rolagem própria, título e cabeçalho das tabelas presos (§20.3)"`.

---

### Task 4: Depois de "Lançar em lote", a coluna rola até a primeira linha recém-lançada (D4)

**Files:**
- Modify: `src/ui/estado/calculo.ts` (`idsDoLote`), `src/ui/App.tsx` (passa os ids à tabela que recebeu o lote), `src/ui/tabelas/TabelaLancamentos.tsx` (`data-id` nas linhas; rolagem)
- Test: `src/ui/estado/calculo.test.ts`, `src/ui/tabelas/Tabelas.test.tsx`

**Interfaces:**
- Consumes: `Estado`, `estadoInicial`, `reduzir` (ações `lancarPrestacoes` e `lancarPagamentos`, cujo `lote.lancamentos` traz só as linhas novas); `caixaDaTabela` (Task 3); `.coluna-rolavel` com o `scroll-padding-top` da área (Task 3).
- Produces: `Estado.idsDoLote: string[]` (ids das linhas acrescentadas pelo último lote; `[]` em `estadoInicial`, portanto em "novo" e "abrir"); a prop opcional `idsDoLote?: string[]` de `TabelaLancamentos`; `data-id={lancamento.id}` em cada `<tr>` de linha.

- [ ] **Step 1: Aplicar o patch dos testes** (`$RASCUNHO/t4-testes.patch`)

```diff
diff --git a/src/ui/estado/calculo.test.ts b/src/ui/estado/calculo.test.ts
index db05aaf..cb0ddc1 100644
--- a/src/ui/estado/calculo.test.ts
+++ b/src/ui/estado/calculo.test.ts
@@ -129,6 +129,8 @@ describe("reduzir: lotes cumulativos e lançamentos", () => {
       em: DEPOIS,
     });
     expect(estado.calculo.lancamentos.map((l) => l.id)).toEqual(["p-2026-08", "p-2026-09"]);
+    // os ids das linhas recém-lançadas, para a tela rolar até elas (§20.3)
+    expect(estado.idsDoLote).toEqual(["p-2026-08", "p-2026-09"]);
     expect(estado.calculo.lotes.ultimoLotePrestacoes).toEqual({
       diaVencimento: 5,
       de: "2026-08",
@@ -150,6 +152,8 @@ describe("reduzir: lotes cumulativos e lançamentos", () => {
       "Meses de vencimento já lançados, não repetidos: ago/2026.",
     ]);
     expect(estado.loteRecente).toBe("prestacoes");
+    // só as novas, não as já lançadas
+    expect(estado.idsDoLote).toEqual(["p-2026-06", "p-2026-07"]);
     expect(estado.calculo.lancamentos.every((l) => l.valorInformado === undefined)).toBe(true);
   });
 
@@ -166,6 +170,7 @@ describe("reduzir: lotes cumulativos e lançamentos", () => {
     expect(estado.calculo.lotes.ultimoLoteAmortizacoes?.valorMensal).toBe("400.00");
     expect(estado.avisosDoLote).toEqual([]);
     expect(estado.loteRecente).toBe("pagamentos");
+    expect(estado.idsDoLote).toEqual(["a-2026-08", "a-2026-09"]);
   });
 
   it("inclui avulsos com id livre e origem 'avulso', intercalados na ordem cronológica", () => {
@@ -397,6 +402,7 @@ describe("reduzir: novo e abrir", () => {
       situacao: outros.situacao,
       avisosDoLote: [],
       loteRecente: null,
+      idsDoLote: [],
       avisosDaAbertura: [],
       tocado: false,
     });
@@ -410,6 +416,7 @@ describe("reduzir: novo e abrir", () => {
     });
     expect(estado.avisosDaAbertura).toHaveLength(1);
     expect(estado.avisosDoLote).toEqual([]);
+    expect(estado.idsDoLote).toEqual([]);
     expect(estado.tocado).toBe(false);
   });
 });
diff --git a/src/ui/tabelas/Tabelas.test.tsx b/src/ui/tabelas/Tabelas.test.tsx
index a30d81f..52f4082 100644
--- a/src/ui/tabelas/Tabelas.test.tsx
+++ b/src/ui/tabelas/Tabelas.test.tsx
@@ -170,6 +170,62 @@ describe("lado direito: indicadores, tabelas e memória (§9.3)", () => {
     }
   });
 
+  it('depois de "Lançar em lote", a área da coluna rola até a primeira linha recém-lançada, sem mexer na página; relançar sem novidade não rola (§20.3)', async () => {
+    // o jsdom não calcula leiaute: a área é tida como rolável (conteúdo de 2000 px numa caixa de
+    // 500 px) e começa em 100 px da janela; cada linha da tabela está em 500 px
+    const scrollHeight = vi
+      .spyOn(Element.prototype, "scrollHeight", "get")
+      .mockImplementation(function (this: Element) {
+        return this.classList.contains("coluna-rolavel") ? 2000 : 0;
+      });
+    const clientHeight = vi
+      .spyOn(Element.prototype, "clientHeight", "get")
+      .mockImplementation(function (this: Element) {
+        return this.classList.contains("coluna-rolavel") ? 500 : 0;
+      });
+    const retangulo = vi
+      .spyOn(Element.prototype, "getBoundingClientRect")
+      .mockImplementation(function (this: Element) {
+        const top = this.classList.contains("coluna-rolavel")
+          ? 100
+          : this.tagName === "TR"
+            ? 500
+            : 0;
+        const caixa = { top, bottom: top, left: 0, right: 0, width: 0, height: 0 };
+        return { ...caixa, x: 0, y: top, toJSON: () => caixa } as DOMRect;
+      });
+    try {
+      const user = userEvent.setup();
+      await montarCaso(user);
+      const area = screen.getByRole("region", { name: "Tabelas e avisos" });
+      // o lote de 2 meses lança 05/09 e 05/10/2026: a linha de 05/09 (500 px) vai ao topo da área
+      // (100 px), descontada a reserva dos cabeçalhos presos (sem CSS no jsdom, zero): 400 px de
+      // rolagem, só na área (a página não é tocada: nada de scrollIntoView)
+      expect(area.scrollTop).toBe(400);
+      expect(window.scrollY).toBe(0);
+      // o mesmo lote de novo: nada de novo, nada rola
+      area.scrollTop = 0;
+      const prestacoes = within(screen.getByRole("region", { name: /4 · Prestações em atraso/ }));
+      await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
+      expect(area.scrollTop).toBe(0);
+      // um lote de pagamentos rola até o primeiro pagamento novo
+      const pagamentos = within(screen.getByRole("region", { name: /5 · Pagamentos/ }));
+      await user.type(pagamentos.getByLabelText("Valor por mês"), "400,00");
+      fireEvent.change(pagamentos.getByLabelText("Primeiro pagamento"), {
+        target: { value: "2026-08-10" },
+      });
+      fireEvent.change(pagamentos.getByLabelText("Último pagamento"), {
+        target: { value: "2026-09-10" },
+      });
+      await user.click(pagamentos.getByRole("button", { name: "Lançar em lote" }));
+      expect(area.scrollTop).toBe(400);
+    } finally {
+      scrollHeight.mockRestore();
+      clientHeight.mockRestore();
+      retangulo.mockRestore();
+    }
+  });
+
   it("▸ expande a memória (base, índices, juros e avisos) e volta a esconder", async () => {
     const user = userEvent.setup();
     await montarCaso(user);
```

O que estes testes provam: o redutor guarda só os ids das linhas novas de cada lote e os zera em "novo" e "abrir"; a tabela que recebeu o lote rola a área (`scrollTop`) até a primeira linha nova, pela diferença entre as posições (simuladas), uma vez por lote, sem tocar na página (`window.scrollY` continua zero), e não rola quando o lote não acrescenta nada. O que fica só na conferência visual (Task 6): a linha nova aparecer logo abaixo dos cabeçalhos presos (a reserva do `scroll-padding-top`, que o jsdom não tem), e nada rolar nas colunas empilhadas e em tela baixa (a área dissolvida não tem altura).

- [ ] **Step 2: Ver falhar.** `npx vitest run`: `Tests  4 failed | 1010 passed | 10 skipped (1024)`, 2 arquivos: em `calculo.test.ts`, "lança prestações em lote…" (`expected undefined to deeply equal [ 'p-2026-08', 'p-2026-09' ]`), "lança pagamentos em lote…" (`expected undefined to deeply equal [ 'a-2026-08', 'a-2026-09' ]`) e "'novo' troca o cálculo…" (o `toEqual` do estado, sem `idsDoLote`); em `Tabelas.test.tsx`, "depois de "Lançar em lote", a área da coluna rola…" (`expected +0 to be 400`).

- [ ] **Step 3: Aplicar o patch do código** (`$RASCUNHO/t4-codigo.patch`)

```diff
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index a221b06..a60a8e8 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -64,6 +64,9 @@ import { LotePagamentosSecao } from "./secoes/LotePagamentos.tsx";
 import { LotePrestacoesSecao } from "./secoes/LotePrestacoes.tsx";
 import { Processo } from "./secoes/Processo.tsx";
 
+/** A tabela que não recebeu o último lote: a mesma lista vazia sempre, para a rolagem não disparar. */
+const SEM_LOTE: string[] = [];
+
 /**
  * O Apura, com a tela de erro de reserva em volta (§18.6): um defeito do programa ao montar a tela
  * troca a página pela reserva, que oferece salvar o último cálculo exibido. O `ambiente` é
@@ -370,6 +373,7 @@ function Tela({
               aoSugerir={() => sugerirPrestacao(estado.calculo, estado.tabela)}
               valorDaBase={valorDaBase}
               aoIncluir={incluir}
+              idsDoLote={estado.loteRecente === "prestacoes" ? estado.idsDoLote : SEM_LOTE}
             />
             <TabelaLancamentos
               tipo="amortizacao"
@@ -380,6 +384,7 @@ function Tela({
               aoSugerir={() => sugerirPagamento(estado.calculo)}
               valorDaBase={valorDaBase}
               aoIncluir={incluir}
+              idsDoLote={estado.loteRecente === "pagamentos" ? estado.idsDoLote : SEM_LOTE}
             />
             <Avisos avisos={avisosDaTela} />
           </div>
diff --git a/src/ui/estado/calculo.ts b/src/ui/estado/calculo.ts
index eaf7476..1d1f31e 100644
--- a/src/ui/estado/calculo.ts
+++ b/src/ui/estado/calculo.ts
@@ -32,6 +32,8 @@ export interface Estado {
   /** avisos do último "Lançar em lote" (competências puladas, lote vazio) e qual formulário o fez */
   avisosDoLote: string[];
   loteRecente: "prestacoes" | "pagamentos" | null;
+  /** ids das linhas que o último "Lançar em lote" acrescentou (a tela rola até a primeira, §20.3) */
+  idsDoLote: string[];
   /** avisos da abertura de um arquivo (índices que mudaram, dados que não puderam ser lidos) */
   avisosDaAbertura: string[];
   /** true depois da primeira edição desde "novo" ou "abrir": só então o cálculo vai para os recentes */
@@ -129,6 +131,7 @@ export function estadoInicial(calculo: Calculo, indices: Indices): Estado {
     situacao: indices.situacao,
     avisosDoLote: [],
     loteRecente: null,
+    idsDoLote: [],
     avisosDaAbertura: [],
     tocado: false,
   };
@@ -215,6 +218,7 @@ export function reduzir(estado: Estado, acao: Acao): Estado {
         },
         avisosDoLote: lote.avisos,
         loteRecente: "prestacoes",
+        idsDoLote: lote.lancamentos.map((l) => l.id),
       };
     }
     case "lancarPagamentos": {
@@ -232,6 +236,7 @@ export function reduzir(estado: Estado, acao: Acao): Estado {
         },
         avisosDoLote: lote.avisos,
         loteRecente: "pagamentos",
+        idsDoLote: lote.lancamentos.map((l) => l.id),
       };
     }
     case "incluirLancamento": {
diff --git a/src/ui/tabelas/TabelaLancamentos.tsx b/src/ui/tabelas/TabelaLancamentos.tsx
index 9205bed..6644885 100644
--- a/src/ui/tabelas/TabelaLancamentos.tsx
+++ b/src/ui/tabelas/TabelaLancamentos.tsx
@@ -105,6 +105,7 @@ export function TabelaLancamentos({
   aoSugerir,
   valorDaBase,
   aoIncluir,
+  idsDoLote,
 }: {
   tipo: Lancamento["tipo"];
   linhas: LinhaDaTabela[];
@@ -115,6 +116,11 @@ export function TabelaLancamentos({
   /** valor que a base dá para um vencimento ("" quando não dá): acompanha a data da linha nova */
   valorDaBase: (data: DataISO) => TextoDecimal;
   aoIncluir: (lancamento: NovoLancamento) => void;
+  /**
+   * ids das linhas que o último "Lançar em lote" acrescentou a esta tabela (a mesma lista até o
+   * próximo lote): a área rolável da coluna rola até a primeira delas (§20.3)
+   */
+  idsDoLote?: string[];
 }) {
   const [expandidos, setExpandidos] = useState<ReadonlySet<string>>(new Set());
   // Exclusão em dois cliques, sem janela pop-up e sem mexer na linha (decisões de 13/10/2026): o
@@ -171,6 +177,24 @@ export function TabelaLancamentos({
     if (tabela !== null) observador.observe(tabela);
     return () => observador.disconnect();
   }, []);
+  // Depois de "Lançar em lote", a área rolável da coluna rola até a primeira linha nova, que fica
+  // logo abaixo dos cabeçalhos presos (a reserva do scroll-padding-top da área). Só a área rola,
+  // nunca a página (scrollIntoView rolaria também a janela e tiraria a pessoa do formulário), e só
+  // quando a área tem o que rolar (nas colunas empilhadas ou em tela baixa ela é dissolvida pelo
+  // CSS e não tem altura). A lista muda de identidade a cada lote, e é isso que dispara a rolagem.
+  useEffect(() => {
+    const alvo = idsDoLote?.[0];
+    const caixa = caixaDaTabela.current;
+    if (alvo === undefined || caixa === null) return;
+    const linha = [...caixa.querySelectorAll("tr[data-id]")].find(
+      (tr) => tr.getAttribute("data-id") === alvo,
+    );
+    const area = linha?.closest<HTMLElement>(".coluna-rolavel");
+    if (!linha || !area || area.scrollHeight <= area.clientHeight) return;
+    const reserva = Number.parseFloat(getComputedStyle(area).scrollPaddingTop) || 0;
+    area.scrollTop +=
+      linha.getBoundingClientRect().top - area.getBoundingClientRect().top - reserva;
+  }, [idsDoLote]);
   const prestacoes = tipo === "prestacao";
   const titulo = prestacoes ? "Prestações" : "Amortizações (pagamentos)";
   const tituloId = prestacoes ? "titulo-tabela-prestacoes" : "titulo-tabela-amortizacoes";
@@ -496,7 +520,7 @@ function Linha({
         ? formatarMoedaParaCampo(calculado.valorBase)
         : "";
   return (
-    <tr>
+    <tr data-id={lancamento.id}>
       <td className="texto">
         <div className="celula-vencimento">
           <button
```

Notas do código: a linha é procurada pelo atributo (`querySelectorAll` + `getAttribute`), e não por um seletor com o id dentro, para não depender de escape (`CSS.escape` não existe no jsdom); a rolagem é feita no `scrollTop` da área, nunca por `scrollIntoView` (que rola também a página, achado da revisão), e a reserva vem do `scroll-padding-top` calculado da área (62 px no bloco largo-e-alto; "auto", lido como zero, onde a área é dissolvida, caso em que a guarda `scrollHeight <= clientHeight` já impede a rolagem); a lista vazia `SEM_LOTE` é a mesma referência sempre, por isso a tabela que não recebeu o lote não dispara o efeito; "Novo cálculo" e "Abrir" remontam a coluna com `idsDoLote` vazio, e nada rola.

- [ ] **Step 4: Verificar.** `npm run format && npm run verificar`: o `format` não muda nada; `Tests  1014 passed | 10 skipped (1024)`, 61 arquivos.

- [ ] **Step 5: Commit.** `git add -A && git commit -m 'ui: depois de "Lançar em lote", a área da coluna rola até a primeira linha recém-lançada (§20.3)'`.

---

### Task 5: Versão 0.1.1 e registro de mudanças

**Files:**
- Modify: `package.json`, `package-lock.json` (pelo `npm version`), `CHANGELOG.md`

**Interfaces:**
- Consumes: `scripts/versao.test.ts` (exige a seção `## [0.1.1] · AAAA-MM-DD` e a mesma versão no lock); `VERSAO` (`src/ui/versao.ts`) passa a "0.1.1" no rodapé da tela e no do relatório.
- Produces: a versão 0.1.1.

- [ ] **Step 1: Subir a versão.** `npm version 0.1.1 --no-git-tag-version --ignore-scripts` (muda `package.json` e as duas entradas do `package-lock.json`; não cria etiqueta nem commit).

- [ ] **Step 2: Aplicar o patch do `CHANGELOG.md`** (`$RASCUNHO/t5-changelog.patch`). A data da seção é a do dia em que a fase é publicada (a Task 7 a corrige, se for outra).

```diff
diff --git a/CHANGELOG.md b/CHANGELOG.md
index c9b4839..9235363 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -4,6 +4,19 @@ O que muda no Apura para quem o usa, versão por versão, da mais nova para a ma
 numeração segue o versionamento semântico (0.1.0, 0.1.1, 0.2.0…): o último número sobe nas
 correções, e o do meio, nas novidades.
 
+## [0.1.1] · 2026-10-15
+
+Ajustes da tela depois do uso pelos testadores (§20 do design). Os números não mudam.
+
+- A barra do topo fica presa ao rolar a página, um pouco mais baixa que antes; o campo que
+  recebe o foco pelo teclado nunca fica escondido sob ela.
+- As seções da esquerda mudam de ordem: processo, base dos alimentos, encargos e data do cálculo,
+  prestações em atraso e pagamentos (os parâmetros vêm antes dos lançamentos).
+- Tabela sempre à vista: em telas a partir de 1024 px de largura e 600 px de altura, a coluna da
+  direita fica presa abaixo da barra, com rolagem própria; os cinco indicadores, o título de cada
+  tabela e a linha de títulos das colunas ficam à vista enquanto as linhas rolam, e, depois de
+  "Lançar em lote", a coluna rola até as linhas recém-lançadas. Em telas menores, tudo como antes.
+
 ## [0.1.0] · 2026-10-14
 
 Primeira versão para os testadores: o cálculo da execução de alimentos (demonstrativo
```

- [ ] **Step 3: Verificar.** `npm run format && npm run verificar`: `Tests  1014 passed | 10 skipped (1024)`, 61 arquivos (`scripts/versao.test.ts` passa com a seção nova; sem ela, falharia com "o CHANGELOG.md tem a seção da versão"). `git status` mostra só os três arquivos.

- [ ] **Step 4: Commit.** `git add -A && git commit -m "versão 0.1.1: ajustes da tela (fase 7b), com a seção no CHANGELOG"`.

---

### Task 6: Conferência no navegador integrado

**Files:** nenhum, salvo correção (com teste, no arquivo da tarefa dona, e commit "ui: <o que mudou> (conferência da fase 7b)").

Sobe-se o app (`npm run dev`, pelo `preview_start` do navegador integrado, com `.claude/launch.json` fora do git se preciso) e usa-se um cálculo **curto** (base valor fixo R$ 1.000,00; "Meses em atraso" 2) e um **longo** (intervalo de vencimentos 05/01/2023 a 05/04/2026, 40 prestações; pagamentos de R$ 300,00 de 10/09/2024 a 10/04/2026, 20 pagamentos). As medidas se tiram com `getBoundingClientRect()` pelo JavaScript do navegador integrado, como no ensaio. Nenhum dado pessoal nos campos.

- [ ] **Step 1 · 1366×768, tema claro, cálculo longo.** A barra mede 64 px de altura, `position: sticky`, e fica no topo ao rolar a página; a coluna da direita fica presa com o topo em 80 px (barra + 16) e altura `100vh − 96`; os indicadores no topo dela, sem rolar; a área rolável abaixo, com `scrollWidth` igual a `clientWidth` (nenhuma rolagem lateral de 1 px) e `scrollHeight` maior que `clientHeight`; rolando a área 600 px com a roda do mouse, o título "Prestações" fica no topo da área (35 px) e a linha "Vencimento · Valor · …" logo abaixo (26 px), com as linhas passando por baixo; no fim da lista, a roda do mouse sobre a área não rola a página (e, com a tabela curta, rola); o lápis e o ✕ visíveis à direita em todas as linhas e no cabeçalho; os indicadores em 5 numa linha.
- [ ] **Step 2 · Balões e painéis com a coluna rolada.** O ⓘ de "Prestações" abre o balão inteiro, em posição fixa, por cima das linhas, e fecha ao rolar; a etiqueta de uma linha (depois de digitar um valor numa célula, "valor informado") abre o balão inteiro; o lápis abre "Personalizar" por cima de tudo; o erro de uma célula em edição ("abc" no valor) aparece abaixo da célula.
- [ ] **Step 3 · Teclado, 1366×768.** Só com Tab, da barra ao fim da esquerda: cada campo que recebe o foco fica inteiro abaixo da barra (topo do campo ≥ 72 px), inclusive "Dividir", "Ajustar", os campos de lote e "Lançar em lote" no pé; Tab chega à área "Tabelas e avisos" (anel de foco em volta dela), depois aos controles dentro dela; com a área rolada, Tab até um lápis de uma linha abaixo da dobra o traz para a vista, abaixo dos cabeçalhos presos (topo do botão ≥ topo da área + 62); Esc e Enter nos painéis e balões como antes. (O Chrome, ao rolar por foco, leva o campo para o meio da tela: o critério é "nunca sob a barra", não "logo abaixo dela".)
- [ ] **Step 4 · Lote (D4).** Com a página rolada 200 px e a área no topo, "Lançar em lote" de 05/05/2026 a 05/09/2026 (cinco prestações novas no fim da tabela): a área rola até a linha de 05/05/2026, que aparece logo abaixo dos cabeçalhos presos (topo da linha = topo da área + 62), e **a página não se move** (`window.scrollY` igual antes e depois); relançar o mesmo lote não move a área; um lote de pagamentos rola até o primeiro pagamento novo. Dispare o lote por um clique de verdade ou por JavaScript (`botao.click()`): a ferramenta de clique do navegador integrado rola o botão para a vista antes de clicar e falseia a medida de `scrollY` (no ensaio, 200 → 557 pela ferramenta; 200 → 200 por JavaScript).
- [ ] **Step 5 · 1280×720 e 1920×1080.** O mesmo do Step 1; em 1280×720 os indicadores ficam em 3 + 2 e a área tem cerca de 410 px de altura; em nenhum dos dois a tabela ganha a classe `transborda`.
- [ ] **Step 6 · 1024×768, cálculo longo.** A barra numa linha só (64 px); a coluna presa; as duas tabelas marcadas `transborda` (603 e 601 px numa caixa de 540; a tabela de pagamentos vazia, de 540 px, não é marcada), rolando de lado sozinhas, com a barra de rolagem lateral de cada uma no pé da tabela, o título preso no topo da área e a linha de títulos rolando com as linhas; o lápis e o ✕ presos à direita; a área não rola de lado (`scrollWidth` = `clientWidth`).
- [ ] **Step 7 · Tela baixa: 1366×560.** Nada preso: a coluna rola com a página, a área dissolvida (`display: contents`) e não focável (`area.focus()` não a foca; a consulta de mídia exige 600 px de altura); a barra continua presa; um "Lançar em lote" não move a página (`window.scrollY` igual antes e depois).
- [ ] **Step 8 · Celular, 375 px.** A barra em mais de uma linha e `static`; o resumo (indicadores) no topo, as seções, as tabelas e os avisos, nessa ordem; a área "Tabelas e avisos" dissolvida (`display: contents`) e não focável (`area.focus()` não a foca); as tabelas rolam de lado sozinhas, a página sem rolagem lateral (`document.documentElement.scrollWidth` = 375); os balões como faixa no pé da tela.
- [ ] **Step 9 · Tema escuro, 1366×768.** Botão de tema em "escuro" (ou `data-theme="dark"`): o título preso tem o fundo da superfície escura, sem transparência (as linhas não aparecem por trás), o cabeçalho verde-escuro, a barra presa.
- [ ] **Step 10 · Relatório e impressão não mudaram.** "Relatório / PDF": o relatório abre na mesma página, a barra presa acima dele, o título da aba "Apura – <data>"; "← Voltar ao cálculo" devolve a tela como estava, com o foco em "Relatório / PDF"; o PDF da impressão (Chrome sem janela, `--headless --print-to-pdf`, como na fase 6, ou a pré-visualização de impressão) sai sem a barra e igual ao de antes da fase: nenhum seletor do relatório ou de `@media print` foi tocado (`git diff c17a68f -- src/relatorio/` vazio).
- [ ] **Step 11 · Registro.** Anotar no "Estado" deste plano o que foi conferido e qualquer ajuste de CSS que tenha sido preciso (com o commit). `npm run build` gera `dist/`.

---

### Task 7: Fechamento: documentos (§9.2, §20, roteiro, CLAUDE.md, plano), pré-visualização, integração e etiqueta `v0.1.1`

Espera o fechamento da fase 7 (Task 15 do plano da fase 7) estar na `main`. Antes de começar: trazer a `main` do GitHub para a branch (num worktree do app, pela ferramenta de sincronizar com a base; senão `git -C "$RAIZ" pull --ff-only` e `git merge main` na branch), resolver conflitos se houver (os arquivos abaixo são os que o fechamento da fase 7 também toca; prevalece o texto da fase 7, acrescido do desta) e conferir `npm run verificar` verde.

**Files:**
- Modify: `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md` (§9.2 renumerada; §20 nova, antes do "Anexo A"; §12.2 com `scripts/estilos.test.ts`; §16 com "7b")
- Modify: `docs/superpowers/roteiro.md` (linha "7b · Ajustes da tela")
- Modify: `CLAUDE.md` ("Estado": parágrafo da fase 7b; "Mapa de pastas": `scripts/` com `estilos.test.ts`)
- Modify: `CHANGELOG.md` (a data da seção 0.1.1, se a publicação for em outro dia)
- Modify: este plano (seção "Estado")

- [ ] **Step 1: §9.2 do design.** Trocar a lista numerada da §9.2 por esta (além da ordem e dos números, três frases desatualizadas desde as fases 5 e 5b são corrigidas, achado da revisão: os lotes pedem o primeiro e o último vencimento ou pagamento, não "dia" e "de / até"; multa e honorários vêm com 10%):

```markdown
### 9.2 Seções da esquerda

Na ordem da fase 7b (§20.2; até ela, prestações e pagamentos vinham antes dos encargos):

1. **Processo**: defensor(a) e órgão (lembrados no navegador, com "Lembrar neste navegador" e "Esquecer"), nº do processo, exequente (alimentando), executado (alimentante); opção "Guardar cálculos recentes neste navegador". Ajuda: partes e processo não são gravados em servidor algum.
2. **Base dos alimentos**: três opções; só os campos da opção escolhida aparecem; ajuda sobre reajuste e salário mínimo. Desde a fase 5b, "Dividir em" cria períodos com formas diferentes (§17.2).
3. **Encargos e data do cálculo**: metodologia escolhida entre as duas opções (§17.3) e "Ajustar", que abre o editor de períodos: lista de períodos (de/até) com índice de correção e regra de juros (tipo e taxa) em cada um, "Dividir em uma data" e "Remover divisão", incidência no mês inicial e tratamento da deflação; multa e honorários (10% cada por padrão, decisão de 13/10/2026); data de elaboração; observações para o relatório.
4. **Prestações em atraso**: o intervalo de vencimentos (primeiro e último vencimento) ou "Meses em atraso" com o dia do vencimento; botão "Lançar em lote" (cumulativo).
5. **Pagamentos**: valor por mês, primeiro e último pagamento; botão "Lançar em lote" (cumulativo).
```

Na §9.1, depois de "Página única em duas colunas (em telas estreitas, as colunas empilham com o resumo no topo).", acrescentar: "Desde a fase 7b, a barra superior fica presa no topo e, em telas largas e altas, a coluna da direita fica presa abaixo dela, com rolagem própria (§20)." Na §12.2, em `scripts/`, acrescentar `estilos.test.ts` (ao lado de `versao.test.ts`, `site.test.ts` e `workflows.test.ts`, se o fechamento da fase 7 os tiver listado; se não, acrescentar `estilos.test.ts` mesmo assim, depois de `relatorio-indices.ts`). Na §16, depois do item 7, acrescentar: "   7b. **Ajustes da tela** (§20): cabeçalho fixo, nova ordem das seções, tabela sempre à vista; versão 0.1.1."

- [ ] **Step 2: §20 do design.** Inserir antes de "## Anexo A · Caso de referência", separada por `---`:

```markdown
## 20. Ajustes da tela depois do uso (fase 7b)

Decididos pelo responsável em 15/10/2026, depois do uso da versão 0.1.0 pelos testadores. Três ajustes, só na interface (`src/ui/` e `src/ui/estilos.css`): o motor, o relatório, a impressão e os números não mudam. Onde esta seção e as anteriores divergirem, vale esta. Versão 0.1.1.

### 20.1 Cabeçalho fixo

- A barra superior fica presa no topo ao rolar a página (`position: sticky`), sem animação de encolher. Para não tomar espaço demais presa, ficou mais baixa de vez: 64 px (logo em 40 px, antes 48; nome do sistema em 22 px). Com isso ela cabe numa linha só a partir de 1024 px de largura (a de antes, de 80 px, pedia 1041 px e quebrava em duas linhas em 1024). A altura fica na variável `--barra-altura`, que a página e a coluna da direita usam.
- Em telas estreitas (abaixo de 1024 px), onde a barra quebra em mais de uma linha, ela não fica presa.
- Ao navegar com o teclado, o campo que recebe o foco nunca fica escondido sob a barra: a página reserva a altura da barra mais 8 px ao rolar até o foco (`scroll-padding-top` na raiz; critério 2.4.11 do WCAG), e nada abaixo de 1024 px.
- A impressão do relatório não muda (a barra já não saía no papel).

### 20.2 Nova ordem das seções da esquerda

1 · Processo, 2 · Base dos alimentos, 3 · Encargos e data do cálculo, 4 · Prestações em atraso, 5 · Pagamentos: os parâmetros vêm antes dos lançamentos. A §9.2 passou a listar as seções nessa ordem, e as frases da tela que citam o número de uma seção acompanharam ("use "Lançar em lote" na seção 4" e "na seção 5", nas tabelas vazias); a base continua "seção 2" nos avisos do que falta, e o processo, "seção 1". Os testes de componente procuram as seções pelos nomes novos e conferem a ordem dos títulos.

### 20.3 Tabela sempre à vista ("só a direita presa")

- **Quando.** Em telas a partir de 1024 px de largura e 600 px de altura (`@media (min-width: 1024px) and (min-height: 600px)`), a coluna da direita fica presa logo abaixo da barra (`top` = barra + 16 px) e ocupa a altura que sobra da tela (`max-height` = `100vh` − barra − 32 px); a página continua rolando pela esquerda. Abaixo de 1024 px as colunas empilham, como antes; abaixo de 600 px de altura a coluna rola com a página (nada preso, sem a variante intermediária "indicadores rolam junto").
- **O que fica parado e o que rola.** Os cinco indicadores ficam parados no topo da coluna, fora da área rolável. Embaixo deles, uma área com rolagem própria, uma só para a coluna inteira (as duas tabelas e a caixa de avisos), sem rolagem dentro de rolagem; a pessoa rola as linhas com o mouse sobre ela, e a rolagem não passa para a página ao chegar ao fim (`overscroll-behavior: contain`). A área tem nome para o leitor de tela (região "Tabelas e avisos") e recebe o foco pelo teclado (`tabIndex` 0); fora das telas largas e altas (colunas empilhadas, ou tela mais baixa que 600 px) ela é dissolvida pelo CSS (`display: contents`, a regra base) e não entra na ordem do Tab. Ao rolar até um controle que recebe o foco, a área reserva a altura dos cabeçalhos presos (`scroll-padding-top`); a caixa de cada tabela, quando rola de lado, reserva a largura do lápis e do ✕ (`scroll-padding-right`).
- **Congelar painéis.** Ficam presos no topo da área o título de cada tabela ("Prestações", "Amortizações (pagamentos)", com altura fixa de 35 px e fundo opaco) e, logo abaixo, a linha de títulos das colunas; os números rolam por baixo. O lápis e o ✕ continuam presos à direita (§18.6), também no cabeçalho.
- **Cabeçalho preso e rolagem lateral.** Um cabeçalho só fica preso em relação à caixa que rola. Até a fase 7, cada tabela rolava de lado dentro da própria caixa (`overflow-x: auto`), para a tabela mais larga que a coluna; essa caixa não rola na vertical, e o cabeçalho não tinha como ficar preso. Decisão: a tabela que cabe na coluna perde a rolagem lateral própria (`overflow-x: visible`), e o cabeçalho se prende à área da coluna; a tabela que não cabe (o componente mede com `ResizeObserver` e marca a caixa com `transborda`) continua rolando de lado sozinha, com o título preso e a linha de títulos rolando junto com as linhas. Medido em 15/10/2026 com valores na casa do milhar: a tabela de prestações tem 603 px; a coluna tem 542 px em 1024, 684 em 1280, 730 em 1366 e 773 em 1920 px de tela. Em 1280, 1366 e 1920 px tudo fica preso; só de 1024 a cerca de 1150 px a linha de títulos rola. A alternativa de rolar de lado a coluna inteira, como uma folha única, foi ensaiada e descartada: o navegador mede a largura intrínseca da tabela de modo instável (603 px no leiaute, 728 px na medida de conteúdo que a folha exigiria), o `container-type` necessário para prender os títulos à esquerda muda a referência dos balões em posição fixa, e, sem isso, o título, o "+ Prestação" e os avisos saíam da vista ao rolar de lado.
- **Balões.** Os balões não ficam cortados pela área rolável: os ⓘ dos títulos das tabelas passam a flutuar em posição fixa, como os das etiquetas (§17.4), e os painéis ("Personalizar") já são fixos. Limites aceitos: o balão de erro de uma célula em edição, na última linha visível, fica em parte abaixo da borda da área e se alcança rolando; e um balão flutuante aberto dentro da coluna presa que suba até a barra (só quando não cabe embaixo e é mais alto que a tela menos a barra) passa por baixo dela, porque a coluna presa é um contexto de empilhamento próprio (a solução estrutural, montar os balões fora da coluna, fica para depois, se incomodar).
- **Depois de "Lançar em lote"** (decisão D4 de 15/10/2026), só a área da coluna rola, pelo `scrollTop`, até a primeira linha recém-lançada, que fica logo abaixo dos cabeçalhos presos; a página não se move (não se usa `scrollIntoView`, que rolaria também a janela e tiraria a pessoa do formulário). O estado da tela guarda os ids das linhas do último lote (`idsDoLote`), zerados em "Novo cálculo" e "Abrir"; relançar um lote sem linha nova não rola, e nada rola onde a área é dissolvida (colunas empilhadas, tela baixa).
- **Limites fora do Chromium** (não conferidos no ensaio): `overscroll-behavior` só no Safari 16 em diante (antes, a rolagem encadeia para a página, como era); `position: sticky` na última célula do cabeçalho nos dois eixos (`top` e `right`) conferida só no Chromium.
- **Testes.** O jsdom não calcula leiaute: os testes de componente conferem a ordem das seções, a estrutura da coluna (indicadores antes da área; a área com nome e foco, com as duas tabelas e os avisos), o balão flutuante do título, a marca `transborda` (com `ResizeObserver` e as larguras simulados) e a rolagem da área depois do lote (alturas e posições simuladas; a página parada); um teste de leitura da folha de estilos (`scripts/estilos.test.ts`) prende as declarações que sustentam o comportamento (barra e coluna presas, `scroll-padding-top`, `overflow: auto` e `overscroll-behavior: contain`, títulos e cabeçalhos presos, e o contrário abaixo de 1024 px): prova que a regra está escrita, não que o navegador a aplica. O efeito visual (preso, rolagem, cortes, foco sob a barra) é conferido no navegador integrado, em 1920×1080, 1366×768, 1280×720, 1024×768, 1366×560 e 375 px, nos temas claro e escuro, com uma tabela curta e uma longa (40 prestações e 20 pagamentos), só com o teclado, e com o relatório e a impressão conferidos como inalterados.

### 20.4 Registro

Fase "7b · Ajustes da tela" na tabela do roteiro, depois da 7, com plano próprio em `docs/superpowers/plans/2026-10-15-fase-7b-ajustes-da-tela.md`, escrito depois de um ensaio do código numa cópia fora do repositório, conferido no navegador e revisado por um agente independente, como nas fases 5b, 6 e 7. Versão 0.1.1, com a seção no `CHANGELOG.md`.
```

- [ ] **Step 3: Roteiro.** Na tabela de fases, depois da linha da fase 7, acrescentar: `| 7b · Ajustes da tela | cabeçalho fixo, nova ordem das seções (parâmetros antes dos lançamentos), tabela sempre à vista (coluna da direita presa, com rolagem própria e cabeçalhos presos); versão 0.1.1 (§20 do design) | concluída em <AAAA-MM-DD> · plano: \`docs/superpowers/plans/2026-10-15-fase-7b-ajustes-da-tela.md\` |`.

- [ ] **Step 4: CLAUDE.md.** Em "Estado", depois do parágrafo da fase 7 (que o fechamento dela escreveu), acrescentar: "Fase 7b (ajustes da tela, §20 do design) concluída em <data>: a barra superior fica presa no topo, mais baixa (64 px, `--barra-altura`), com `scroll-padding-top` na raiz para o campo em foco nunca ficar sob ela; as seções da esquerda na ordem processo, base, encargos e data do cálculo, prestações, pagamentos; em telas a partir de 1024×600 px a coluna da direita fica presa abaixo da barra, com os indicadores parados no topo e uma área rolável (`.coluna-rolavel`, região "Tabelas e avisos", focável) com as duas tabelas e os avisos, o título e a linha de títulos de cada tabela presos (`--titulo-da-tabela`, `--cabecalhos-da-tabela`), `overscroll-behavior: contain`, a tabela que não cabe marcada `transborda` (rola de lado sozinha; a que cabe deixa o cabeçalho preso) e, depois de "Lançar em lote", a rolagem só da área até a primeira linha nova (`idsDoLote` no estado; nunca `scrollIntoView`, que rolaria a página); fora dessas telas a área é dissolvida (`display: contents`, regra base) e tudo fica como antes; os balões ⓘ dos títulos das tabelas flutuam; `scripts/estilos.test.ts` lê a folha de estilos e prende essas declarações (o jsdom não calcula leiaute; o efeito é conferido no navegador). Versão 0.1.1 (1014 testes passando e 10 pulados)." Em "Mapa de pastas", na linha de `scripts/`, acrescentar `estilos.test.ts` ao lado dos outros testes de leitura. Trocar "Próxima: fase 7 (publicação)" (ou o que o fechamento da fase 7 tiver escrito) por "Próxima: a definir com os testadores (ver a §6 da visão do produto)".

- [ ] **Step 5: Este plano.** Preencher "Estado" (modo de execução, quem fez o quê, contagens medidas, o que a Task 6 achou).

- [ ] **Step 6: Verificar e commit.** `npm run format && npm run verificar` verde (o `format` ignora `*.md`); `git add -A && git commit -m "docs: fechamento da fase 7b (design §9.2 e §20, roteiro, CLAUDE.md e plano)"`.

- [ ] **Step 7 ⚑: Enviar a branch.** Com o "sim" do responsável: `git push -u origin <branch da fase>`; o `testes.yml` roda (`gh run watch … --exit-status`: verde) e o Cloudflare monta a pré-visualização restrita, que o responsável pode abrir e conferir (barra presa, ordem, coluna presa) antes do merge.

- [ ] **Step 8 ⚑: Merge na `main` pela pasta principal.** Com o "sim": `git -C "$RAIZ" pull --ff-only` (traz os commits do robô); `git -C "$RAIZ" merge --no-ff <branch da fase> -m "Merge da fase 7b: ajustes da tela"`; `npm run verificar` em `$RAIZ` (verde; o teste de versão confere a 0.1.1 e a seção do CHANGELOG).

- [ ] **Step 9 ⚑: Enviar a `main`.** Com o "sim": `git -C "$RAIZ" push origin main`. O Cloudflare publica; `curl -s https://apura-dpems.pages.dev/versao.json` passa a dizer `"versao": "0.1.1"`, e o rodapé do site, "v0.1.1".

- [ ] **Step 10 ⚑: Etiqueta.** Com o "sim": `git -C "$RAIZ" tag -a v0.1.1 -m "Apura 0.1.1: ajustes da tela (fase 7b)"` no commit enviado; `git -C "$RAIZ" push origin v0.1.1`.

- [ ] **Step 11 ⚑ (opcional): Apagar a branch remota** (`git push origin --delete <branch da fase>`), para a pré-visualização dela sair.

---

## Notas para as fases seguintes

- As alturas presas são números fixos no CSS (`--barra-altura: 64px`, `--titulo-da-tabela: 35px`, `--cabecalhos-da-tabela: 62px`): quem mudar a fonte, o espaço ou o tamanho do logo da barra, do título ou do cabeçalho das tabelas precisa remedi-las no navegador e corrigir as variáveis (o `scripts/estilos.test.ts` prende os valores por nome, não as medidas).
- A medida `transborda` (`tabelaTransborda`) compara a largura da tabela com a da caixa a cada mudança de tamanho; uma coluna nova na tabela ou valores muito largos só mudam a partir de que largura de tela o cabeçalho fica preso (hoje cerca de 1150 px com valores na casa do milhar).
- `scripts/estilos.test.ts` tem o leitor de regras (`bloco`, `declaracoes`): serve para prender outras decisões de CSS que o jsdom não cobre.
- Melhorias sem fase, vistas no ensaio e na revisão e deixadas de fora por decisão de escopo: um atalho de teclado para ir da esquerda à área rolável; a largura do lápis e do ✕ (72 px no `scroll-padding-right` da caixa da tabela) medida em vez de fixada; o balão de erro da célula em edição na última linha, que fica em parte abaixo da borda da área; os balões flutuantes montados fora da coluna (`createPortal`), para passarem por cima da barra no caso raro em que sobem até ela; a conferência no Safari e no Firefox (sticky nos dois eixos na última célula do cabeçalho; `overscroll-behavior` só no Safari 16 em diante).

## Estado

Plano escrito em 15/10/2026, a partir do ensaio e da reconstrução descritos em "Para o responsável", e revisto no mesmo dia depois de uma revisão adversarial independente (um crítico, três importantes e oito menores, todos tratados: ver o parágrafo "Ensaio"; relatório do revisor fora do repositório, na pasta de rascunho da sessão). Revisado pelo responsável em 15/10/2026 (D4: sim). Aguardando a escolha do modo de execução.

## Auto-revisão do plano

- **Cobertura das decisões:** D1 → Task 2 (CSS e teste) e Task 6 (Steps 1, 3, 6 a 9); D2 → Task 1 e Task 7 (§9.2); D3 → Task 3 (CSS, componente e testes) e Task 6 (Steps 1, 2, 5 a 9); D4 (sim) → Task 4 e Task 6 (Step 4); versão 0.1.1 → Task 5 e Task 7 (etiqueta); §20, roteiro e CLAUDE.md → Task 7; relatório e impressão inalterados → Task 6 (Step 10). Restrições do responsável: só a interface muda (Tasks 1 a 4 tocam só `src/ui/` e `scripts/estilos.test.ts`); nenhuma dependência nova; `_headers` intocado; nenhum teste com os dados reais (os de componente usam o ambiente de teste; o de estilos lê só o CSS).
- **Placeholders:** nenhum "TBD" ou "implementar depois"; todo passo de código traz o patch inteiro, aplicado na reconstrução. Os espaços a preencher na execução são a data (Tasks 5 e 7), o nome do modelo na linha de coautoria, a pasta de rascunho (`$RASCUNHO`), a raiz do repositório (`$RAIZ`), e o nome da branch.
- **Nomes entre tarefas (conferidos no código do ensaio):** `titulo-encargos`, `titulo-prestacoes`, `titulo-pagamentos` e as regiões "4 · Prestações em atraso" e "5 · Pagamentos" (Task 1, usados nas 3 e 4); `--barra-altura`, `bloco`, `declaracoes`, `estreita` (Task 2, usados na 3); `.coluna-rolavel` (dissolvida na regra base, caixa no bloco largo-e-alto), "Tabelas e avisos", `caixaDaTabela`, `tabelaTransborda`, `transborda`, `--titulo-da-tabela`, `--cabecalhos-da-tabela` (Task 3, usados na 4 e na 7); `Estado.idsDoLote`, `SEM_LOTE`, a prop `idsDoLote`, `data-id` (Task 4, usados na 7).
- **Foco da revisão:** os cinco itens têm teste ou conferência na tarefa dona (1: Tasks 2 e 6; 2: Tasks 3 e 6; 3: Tasks 3 e 6; 4: Tasks 2, 3 e 6; 5: Tasks 3 e 6).
- **Reconstrução:** contagens medidas ao fim de cada tarefa, a partir de 1002 passando e 10 pulados (1012), em 60 arquivos: 1 → 1003 (1013), 60; 2 → 1006 (1016), 61; 3 → 1013 (1023), 61; 4 → 1014 (1024), 61; 5 → 1014 (1024), 61; sempre com 10 pulados. Os passos "ver falhar" trazem as falhas medidas; em todas as tarefas o `format` não mudou nada; o estado final é idêntico ao do ensaio (`diff -r` vazio).
