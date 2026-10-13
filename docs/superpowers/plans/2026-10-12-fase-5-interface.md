# Apura · Fase 5 · Interface — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** construir a interface do Apura (§9 do design): uma tela única em duas colunas que edita o Cálculo e recalcula a cada alteração, sem botão "Calcular"; à esquerda, as cinco seções (processo, com o número no padrão do CNJ, conferido pelos dígitos verificadores, e defensor e órgão lembrados no navegador; base dos alimentos em três formas; prestações em lote; pagamentos em lote; encargos, com o editor de metodologia por períodos, multa, honorários, data de elaboração e observações); à direita, os cinco indicadores, as tabelas de prestações e de amortizações com memória por lançamento, vencimento e valor corrigidos na própria linha, lápis ("Personalizar") para os ajustes finos, exclusão em dois cliques (o ✕ fica vermelho no primeiro e exclui no segundo) e linha nova já sugerida em "+ Prestação" e "+ Pagamento", e a caixa de avisos; "Salvar" e "Abrir" (arquivo validado, recálculo com os índices de hoje e aviso dos índices que mudaram); cinco cálculos recentes e preferências guardados só no navegador, com "Esquecer" e a opção de não guardar recentes em computador compartilhado; tema do sistema, claro ou escuro, por um botão na barra que alterna entre os três, guardado no navegador; explicações em balões ⓘ, abertos sob demanda; a identidade visual da DPE-MS (logo horizontal na barra, fontes Ubuntu e Source Sans 3 embutidas, faixa verde com linha dourada); e a ligação de todos os ganchos deixados pelas fases 1 a 4 (congelamento dos índices, rodapé e avisos do calendário, comparação ao reabrir, lotes cumulativos, bases, metodologia por períodos), com três ajustes pequenos no motor que as fases anteriores destinaram a esta.

**Arquitetura:** o motor (`src/motor/`) continua puro e recebe o `Calculo` e a `TabelaIndices`; a fase o toca em pontos pequenos (percentuais e taxa mensal inválidos deixam de lançar erro; o lote não pula a competência de uma prestação avulsa com descrição; os avisos do lote falam em mês de vencimento). A interface fica em `src/ui/` e separa o que é lógica do que é tela: módulos puros, testados sem DOM (`estado/calculo.ts`, o redutor com todas as ações da tela; `estado/metodologia.ts`, a edição por períodos; `estado/novaLinha.ts`, as sugestões da linha nova; `entrada.ts`, a leitura do que o usuário digita em pt-BR; `arquivo.ts`, o formato salvo e a sua validação; `recentes.ts` e `preferencias.ts`, sobre `armazenamento.ts`, o acesso protegido ao navegador), e componentes React por seção (`secoes/`, `tabelas/`, `componentes/`), montados por `App.tsx`. Tudo o que vem do mundo exterior (cópia publicada dos índices, relógio, ids, armazenamento, download) entra por um objeto `Ambiente` injetável, para que os testes de componente rodem sem rede, sem relógio real e sem a cópia publicada dos índices (usam a tabela fixa de 2024–2026 dos testes do motor). O CSS é puro, com variáveis de cor nos dois temas; os painéis modais são um componente próprio (o `<dialog>` nativo não existe no jsdom dos testes). "Relatório / PDF" fica na barra, desligado, até a fase 6.

**Stack:** Node 22 · npm · Vite 8.3 · React 19.3 · TypeScript 6.0 · Vitest 5.0 · decimal.js 10.6 · ESLint 10 + typescript-eslint 8 + eslint-plugin-react-hooks 7 · Prettier 3.9, nas versões exatas já fixadas em `package.json`, mais quatro dependências de desenvolvimento novas, só para os testes de componente (justificadas em "Para o responsável"): `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `@testing-library/user-event` 14.6.7 e `jsdom` 30.1.1; e duas de execução, as fontes do manual (Task 14): `@fontsource/ubuntu` 5.3.0 e `@fontsource/source-sans-3` 5.3.0.

**Spec:** `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md` (fonte de verdade: §3.1 escopo; §4.2 e §4.3 o módulo `ui/` edita o Cálculo e chama o motor a cada alteração; §5.1 salvar e abrir; §5.2 `Lancamento.editado` é da tela; §5.5 preferências e recentes; §6.1, §6.2 lotes; §6.3 bases; §6.5 editor de períodos; §6.6 multa e honorários; §6.7 datas validadas na tela; §8.2 e §8.3 congelamento, rodapé e avisos; §9 inteira; §10.2 cores e tipografia; §11 testes de interface; §12.2 estrutura; §14 LGPD; §16 item 5). Também: `docs/superpowers/roteiro.md`, `docs/superpowers/specs/2026-10-10-apura-visao-do-produto.md` (§5), os mockups de `docs/referencia/mockups/` (em especial `03-tela-principal.html`), o manual de identidade visual e os planos das fases 1 a 4 (seções "Notas para as fases seguintes" e "Pendências"). A decisão de 12/10/2026 sobre o 13º e o lote (abaixo) é registrada no design pela Task 16.


## Restrições globais (valem para todas as tarefas)

- TypeScript estrito; Node 22.22.2 ou mais recente (exigência do `jsdom` 30; o `engines.node` do `package.json` sobe para `>=22.22.2` na Task 2) e npm. Internet só nos dois `npm install`: o inicial (dependências já fixadas) e o da Task 2 (as quatro de teste). Os testes rodam sem rede: a tela nunca usa `fetch`, e os testes de componente trocam `localStorage`, relógio, ids e download por versões falsas (`src/ui/testes/ambiente-de-teste.ts`).
- O motor (`src/motor/`) continua puro: sem `Date`, `fetch`, DOM ou armazenamento (o ESLint impede). A interface fica em `src/ui/`; `new Date()` continua só em `src/indices/relogio.ts` (a tela usa `hojeEmBrasilia()` e `agoraEmBrasilia()` de lá, pelo `Ambiente`).
- Dinheiro, percentuais, índices e fatores são `Decimal` (só de `src/compartilhado/decimal.ts`) ou texto decimal com ponto (`"1234.56"`) no `Calculo` e nos arquivos; a tela nunca faz conta com `number`. Tudo o que o usuário digita passa por `src/ui/entrada.ts` antes de entrar no estado; tudo o que vem de arquivo ou do armazenamento é `unknown` até passar por `src/ui/arquivo.ts`, `preferencias.ts` ou `recentes.ts`.
- **O Cálculo no estado é sempre válido para o motor:** datas válidas (campos `type="date"`; vazio ou inválido fica em vermelho e o estado guarda o último valor válido), competências `"AAAA-MM"`, textos decimais com ponto. O único campo que o motor exige válido e que o usuário pode ainda não ter preenchido é `base.valor` (ou `percentual`, `rendimentoPadrao`): vazio o motor trata com aviso ("a prestação ficou sem valor; informe o valor à mão").
- **Entrada em pt-BR (§9.4):** vírgula nos centavos, ponto só como separador de milhar; `"1.5"` é recusado (nunca lido como 15); datas `dd/mm/aaaa` nos campos de data do navegador; intervalos dos lotes em datas; número do processo no padrão do CNJ (`NNNNNNN-DD.AAAA.J.TR.OOOO`), com máscara; moeda exibida como `R$ 1.234,56`, fator com 6 casas e percentual com 6 casas e vírgula.
- **Validação inline, sem pop-up (§9.4):** cada campo tem rótulo associado (`<label for>`), ajuda curta num balão ⓘ ao lado do rótulo, aberto sob demanda (D21), e erro embaixo, com `aria-invalid` e `aria-describedby`; os painéis (editor de períodos, personalizar, abrir) são um componente próprio com papel `dialog`, foco gerido e Esc; nada de `window.alert`, `confirm` ou `<dialog>` nativo.
- **Congelamento (§8.2):** a tela chama `congelarIndices()` ao abrir o app e em "Novo cálculo" e usa a tabela devolvida até o próximo "Novo cálculo" ou "Abrir"; o rodapé mostra `situacao.rodape`; a caixa de avisos mostra `situacao.avisos` + avisos da abertura + `resultado.avisos`. Em "Abrir", a tela valida o arquivo, congela a tabela de hoje, recalcula e mostra `compararIndicesUsados(anterior, atual)`.
- **Nada é transmitido (§5.5, §14):** preferências (defensor, órgão, "Lembrar", "Guardar recentes") e os cinco cálculos recentes ficam só no `localStorage`, sob duas chaves (`apura.preferencias`, `apura.recentes`), com toda leitura e gravação dentro de try/catch (o armazenamento pode faltar, estar bloqueado ou cheio); "Esquecer" apaga as duas chaves.
- **Nenhum teste depende dos últimos meses de `dados/indices/`:** os testes de componente usam `tabelaRegimeNovo()` (fixture de 2024–2026 dos testes do motor) com `hoje = "2026-10-11"`; o único teste que abre o App com a cópia publicada real não fixa valores. Depois da fase 7, a rotina central roda `npm run verificar` antes de gravar índices: um teste preso a dado recente a travaria.
- **Cores e tipografia (§10.2):** verde `#1D6B34`, amarelo-ouro `#D8BB73`, preto `#373636`, cinza `#868686`, vermelho `#ED1C24` (na tela, o texto discreto usa `#6E716C` e o vermelho `#C8101A`, por contraste sobre o fundo claro; o cinza e o vermelho do manual ficam para elementos não textuais), fundo claro `#F3F4F1`, tema escuro como no relatório de exemplo; variáveis CSS em `:root`, em `@media (prefers-color-scheme: dark)` (salvo `[data-theme="light"]`) e em `:root[data-theme="dark"]` (o botão de tema grava `data-theme` na raiz; "do sistema" remove o atributo); `font-family` com "Ubuntu" (títulos e números) e "Source Sans 3" (texto) primeiro e reservas do sistema; as duas fontes são embutidas no site pela Task 14, a partir dos pacotes `@fontsource` (licenças livres UFL e OFL), sem carregar do Google; o logo é o horizontal branco do manual, reduzido (`public/logos/`), nunca recolorido ou distorcido.
- Telas estreitas (abaixo de 1024 px): as colunas empilham, com o resumo (indicadores) no topo (§9.1); tabelas com rolagem horizontal própria. Abaixo de 600 px, os campos lado a lado da seção 1 ficam um por linha e o balão ⓘ aparece como uma faixa no pé da tela.
- Avisos em frases completas, em português; textos de ajuda curtos, nos balões ⓘ (sempre visíveis só os erros, os avisos e os exemplos dentro dos campos); a tela não menciona outros sistemas (nada de "SAJ" nos textos, D22); nenhum rótulo técnico sem explicação; rótulos exatos deste plano (os testes os procuram por texto).
- Dados pessoais: nenhum número de processo real nem nome de parte nos testes ou no plano (os testes usam números fictícios com dígitos verificadores válidos, como "0800000-46.2026.8.12.0001", e "A. B.", "Defensor(a) de teste").
- Termos do domínio em português; infraestrutura técnica em inglês. Imports relativos com `.ts`/`.tsx`; tipos com `import type`. Testes de componente levam `// @vitest-environment jsdom` na primeira linha; os demais rodam em Node (o `environment` padrão da configuração continua `node`).
- Commits em português no formato "módulo: o que muda" (`ui:` para a interface, `motor:` para o motor), terminados com a linha de coautoria do modelo que de fato executa (`Co-Authored-By: <nome do modelo> <noreply@anthropic.com>`; os comandos abaixo trazem o espaço reservado `<modelo>`, que deve ser trocado).
- Fora desta fase (não implementar): relatório e PDF (fase 6: o botão "Relatório / PDF" fica desligado, com a explicação no `title`), publicação, integração contínua e versão 0.1.0 (fase 7), inserção manual de índices (fora do MVP). Os pontos de validação jurídica abertos não são decididos aqui (pro rata no mês final, ponto 1 da §7; rótulo "ainda não divulgado" da §6.4).

## Foco da revisão

Entradas que o design implica mas que nenhum teste cobriria por si; cada uma ganhou teste na tarefa dona do código.

1. **Ponto como separador decimal ("1.5", "12.34"):** o usuário habituado a planilhas digita ponto; ler "1.5" como 15 multiplicaria a dívida por dez em silêncio. A leitura recusa o ponto fora do papel de separador de milhar, com a frase "Use vírgula para os centavos (ex.: 1.234,56 ou 1234,56).", e o estado guarda o último valor válido. → Task 3 (testes de `lerDecimal`) e Task 5 (teste de `useCampoValidado`: o inválido não chega ao estado).
2. **Armazenamento ausente, bloqueado ou cheio (janela anônima com bloqueio, política do navegador):** a tela precisa funcionar do mesmo jeito, sem lembrar nada, sem quebrar e avisando. → Task 5 (testes com `armazenamento: null` e com um `Storage` que lança em toda operação) e Task 12 (recentes com armazenamento bloqueado).
3. **Arquivo adulterado, antigo ou de outro programa:** formato diferente, JSON inválido, data "ontem", percentual numérico, série de índice que o Apura não conhece, `resultado` faltando. Nada disso pode derrubar a tela nem entrar no motor; o painel diz, em uma frase, o que há de errado e onde, e um arquivo sem `resultado` abre com aviso. → Task 12 (dezoito casos inválidos em `lerArquivo`, mais os três de `resultado`) e Task 12 (teste de componente "arquivo inválido: o painel fica aberto com a frase do erro e o cálculo atual não muda").
4. **Relançar um lote depois de editar uma prestação:** a edição (valor informado, data, termos) não pode ser sobrescrita, e a competência editada não é duplicada. → Task 4 (teste "editar marca 'editado', apaga campos com undefined, e relançar o lote não sobrescreve a edição") e Task 11 (teste do lápis, que relança o lote depois de informar um valor).
5. **Termos próprios impossíveis e o 13º lançado antes do lote:** termo final posterior à data de elaboração, termo inicial depois do final, termo inicial posterior à data de elaboração sem termo final; e um 13º avulso em dez/2025 lançado antes de um lote que inclui dezembro (no teste, nov a dez/2025), que até aqui fazia o lote pular dezembro. → Task 11 (teste "termo final posterior à data de elaboração e termo inicial depois do final são recusados no painel", que cobre os três casos) e Task 1 (teste "prestação avulsa com descrição (13º, férias) não ocupa a competência").

---


## Para o responsável: o que esta fase entrega, o que foi decidido e o que foi descoberto

Ao fim da fase, o Apura passa a ser usável de ponta a ponta no navegador, ainda sem o relatório: a pessoa abre o site, preenche o processo e as partes, escolhe a base dos alimentos, lança as prestações em atraso e os pagamentos em lote, corrige vencimento e valor na própria linha e ajusta o resto no lápis ou no editor de períodos da metodologia, vê o resultado recalculado a cada tecla (cinco indicadores, duas tabelas com memória por lançamento, avisos em frases completas), salva o cálculo num arquivo e o reabre depois, com aviso dos índices que mudaram; defensor e órgão ficam lembrados no navegador, e os cinco últimos cálculos ficam em "Abrir". Tema do sistema, claro ou escuro, pelo botão da barra (guardado no navegador); funciona em tela estreita (celular), com o resumo no topo, e só com o teclado. A contagem de testes vai de 678 passando e 9 pulados (23 arquivos) para 788 passando e os mesmos 9 pulados (43 arquivos); os 9 pulados são, desde a fase 3, as comparações de avisos dos casos de referência que não trazem `esperado.avisos`. O relatório em tela e PDF é a fase 6; o botão já está na barra, desligado.

**Decisões suas, de 13/10/2026, depois de ver a tela (D17 a D29):**

- **D17 · Nº do processo no padrão do CNJ** (`NNNNNNN-DD.AAAA.J.TR.OOOO`): a pessoa digita só os números e a máscara põe o hífen e os pontos (texto colado, com ou sem pontuação, e até com texto antes, como "Processo nº …", também serve; Backspace logo depois do hífen ou de um ponto apaga o dígito antes dele, e o cursor fica onde estava); os dois dígitos verificadores são conferidos (módulo 97, Resolução CNJ 65/2008); número incompleto ou com dígito errado fica em vermelho, com "Número do processo inválido (confira os dígitos).", e não vai para o cálculo; vazio é aceito (cálculo antes de existir processo); vale para qualquer tribunal (Tasks 3 e 5).
- **D18 · Seção 1 em duas colunas:** "Defensor(a) responsável" e "Órgão de atuação" lado a lado, com metade da largura cada; "Nº do processo" com a largura do número; "Exequente (alimentando)" e "Executado (alimentante)" lado a lado; no celular, um embaixo do outro (Task 5; o CSS é o da Task 2).
- **D19 · Edição direta nas tabelas:** o vencimento (a data, nos pagamentos) e o valor se corrigem na própria linha, como numa planilha: clique (ou Enter) abre o campo; Enter ou sair do campo grava; Esc desiste; texto inválido fica em vermelho, com o erro num balão logo abaixo, e não é gravado; Tab sai do campo e vai à célula seguinte; trocar de janela no meio da digitação (conferir um PDF, por exemplo) não grava nada pela metade. Na prestação, digitar um valor o marca como "valor informado"; apagá-lo volta a apurar pela base. O lápis continua para os ajustes finos (descrição, rendimento, termos e regras próprias) (Task 10).
- **D26 · Multa e honorários de 10%:** o cálculo novo nasce com multa e honorários do art. 523, §1º, do CPC de 10% cada (o percentual da lei); o balão de cada campo lembra que, no rito da prisão, eles ficam em 0 (Tasks 4 e 7).
- **D27 · Lotes pelo intervalo de datas:** o padrão da seção 3 passa a ser o intervalo, com "Primeiro vencimento" e "Último vencimento" em datas completas (campo de data do navegador); as prestações vencem todo mês no dia do primeiro (no último dia, nos meses mais curtos), e o último mês é o do último vencimento, se a prestação dele não vencer depois da data informada (primeiro 20/01, último 10/03: jan e fev). O "Dia do vencimento" só aparece em "Meses em atraso", ao lado de "Quantos meses". Os pagamentos em lote seguem o mesmo modelo: "Valor por mês", "Primeiro pagamento" e "Último pagamento" (datas), um pagamento por mês no dia do primeiro; o "Dia do pagamento" e os campos de mês somem, e com eles a sugestão do dia pelo lote de prestações (Task 9).
- **D28 · Rótulos:** os botões perdem as reticências ("Abrir", "Ajustar"), e o botão de tema diz "Tema do sistema", "Tema claro" ou "Tema escuro" (Tasks 2, 7, 13).
- **D29 · Base incompleta:** com prestação lançada pela base e o campo que a alimenta em branco (valor fixado, percentual do salário mínimo, percentual dos rendimentos ou rendimento padrão), a caixa de avisos diz, no topo, o que falta e onde ("Falta o percentual do salário mínimo (seção 2 · Base dos alimentos): as prestações ficam sem valor até ele ser informado."), e o campo fica em vermelho com "Informe o percentual."; na memória da linha, o motor diz "Percentual do salário mínimo não informado: a prestação ficou sem valor.", sem mandar informar o valor à mão; o aviso de que as amortizações igualam ou superam as prestações só sai quando há pagamento. Os exemplos dentro dos campos passam a começar por "ex.:" e ficam mais claros e em itálico, para não parecerem um valor digitado (Tasks 1, 2, 6, 9 e 10).
- **D25 · Editar sem mexer na tabela:** o campo de edição ocupa exatamente o lugar do texto (a largura é medida no clique; mesma letra, alinhamento e altura; só um contorno), e o erro aparece num balão por cima da linha seguinte; o vencimento e a data do pagamento são digitados como texto `dd/mm/aaaa`, com as barras entrando sozinhas, em vez do campo de data do navegador, cujo calendário alargava a coluna (o calendário continua no lápis e na linha nova).
- **D24 · Cartões do resumo:** o valor nunca quebra entre "R$" e o número; os cartões ficam 5 numa linha, ou 3 em cima e 2 embaixo, ou 2, 2 e 1, ou um por linha: o maior número de colunas em que o maior valor cabe inteiro (a tela mede o valor e a largura disponível, e refaz a conta quando um dos dois muda); os de baixo têm a largura dos de cima.
- **D20 · Linha nova em "+ Prestação" e "+ Pagamento":** em vez de abrir um painel, o botão acrescenta uma linha no fim da tabela, já em edição, com o cursor no vencimento (ou na data). Prestação: vencimento no mês seguinte ao da última prestação comum (um 13º ou férias avulsos, com descrição, não servem de modelo), no mesmo dia; valor sugerido: se ela tinha valor informado à mão, o mesmo valor (também informado); senão, o valor que a base dá para o novo vencimento (sem mexer nele, a prestação entra "pela base", com os reajustes). Pagamento: data de hoje e o valor do pagamento anterior. Enter ou ✓ inclui; Esc ou ✕ descarta; "Novo cálculo" e "Abrir" também a descartam. A linha nova herda as regras próprias de correção e juros da última do mesmo tipo, mas não os termos próprios: correção e juros correm da data da linha até a data do cálculo (Task 10).
- **D21 · Ajuda em balões ⓘ** (altera a §9.4, que pedia a ajuda sempre visível): as explicações saem do texto fixo e vão para um botão ⓘ ao lado do título ou do campo, que abre um balão curto com clique, toque, Enter ou Espaço e fecha com Esc, novo clique ou clique fora; o leitor de tela lê o balão quando ele abre; no celular, o balão aparece como uma faixa no pé da tela. Ficam sempre visíveis só os erros, os avisos e os exemplos dentro dos campos (Task 5 e seguintes).
- **D22 · Nenhuma menção ao SAJ na tela:** a ferramenta não remete o usuário a outro sistema. A metodologia padrão aparece como "Metodologia de encargos (padrão)"; a incidência proporcional, como "proporcional aos dias restantes do mês (pro rata)" (Tasks 7 e 8).
- **D23 · Vencimento como referência de cada linha:** a competência sai da tela. A primeira coluna das prestações é o vencimento; o lote pede "Vencimentos de (mês/ano)" e "até (mês/ano)" no intervalo; os avisos do lote falam em "mês de vencimento já lançado"; o painel do lápis não tem campo de competência. Por dentro, a competência continua existindo (é o mês do vencimento, atualizado quando o vencimento muda) e é o que o lote usa para não repetir meses (Tasks 1, 4, 9, 10 e 11).

**Decisão sua, de 13/10/2026 (D16):** a tela recebe a identidade visual da DPE-MS nesta fase (Task 14): logo horizontal branco na barra, fontes Ubuntu e Source Sans 3 embutidas, faixa verde com linha dourada e indicadores no estilo do relatório de exemplo. O acabamento foi conferido no navegador em 1366 px e em 375 px, nos temas claro e escuro.

**Decisões suas, de 13/10/2026 (D12, D24 e D25):** o ✕ de excluir pede um segundo clique: no primeiro, ele fica vermelho, sem janela pop-up e sem mexer na linha (D12, Task 10); os cinco cartões do resumo nunca quebram o valor entre "R$" e o número e se arrumam em 5, 3 + 2, 2 + 2 + 1 ou um por linha (D24, Task 10); editar o vencimento ou o valor na célula não muda a tabela (D25, Task 10).

**Decisão sua, de 12/10/2026 (D1):** uma prestação avulsa **com descrição** (13º salário, férias) não ocupa a competência: o lote lança a prestação comum do mês normalmente e o 13º fica como extra; uma avulsa **sem descrição** continua ocupando a competência (o lote a pula, com aviso), assim como toda prestação que veio de um lote, mesmo que tenha ganhado descrição no lápis (senão relançar o lote a duplicaria). Muda uma linha do gerador de lotes (`src/motor/lote.ts`), com teste (Task 1).

**Decisões técnicas tomadas neste plano, com o efeito na tela (reabra qualquer uma na revisão, se discordar):**

- **D2 · Percentuais inválidos: o motor tolera e a tela valida.** Multa, honorários e taxa mensal de juros com texto inválido (`"10,5"`, vazio) ou negativo faziam o motor lançar erro (pendência das fases 2 e 3). Agora o motor os trata como zero, com aviso ("Percentual de multa inválido ("10,5"): a multa não foi aplicada."), e a tela nem deixa o inválido chegar (campo em vermelho). Os dois lados, porque a regra 4 do `CLAUDE.md` diz que o motor nunca lança por dado do usuário, e um arquivo editado à mão pode trazer esses textos.
- **D3 · Entrada de números:** vírgula é o separador dos centavos; o ponto só vale como separador de milhar ("1.500", "1.234,56"); "1.5" é recusado com a frase de ajuda, em vez de ser lido como R$ 1,50 ou como R$ 15,00. "R$", "%" e espaços são ignorados. Prós: nunca lê um valor errado em silêncio. Contras: quem digitar "1.5" precisa corrigir para "1,5" (a mensagem diz como).
- **D4 · Validação ao digitar:** nos campos ligados ao Cálculo (seções 1, 2 e 5 e o editor de períodos), cada tecla é lida; o que é válido entra no estado e recalcula na hora (inclusive valores intermediários: ao digitar "1234", o cálculo passa por 1, 12, 123 e 1234); o que é inválido fica no campo, em vermelho, e o estado guarda o último valor válido. Ao sair do campo, o texto é reformatado ("1234,5" vira "1.234,50"). Datas usam o campo de data do navegador (calendário, `dd/mm/aaaa` em navegador em português); os intervalos dos lotes também são datas (D27). Os formulários de lote (seções 3 e 4), o painel "Personalizar" e a linha nova das tabelas validam ao enviar ("Lançar em lote", "Aplicar", Enter ou ✓), com o erro embaixo de cada campo (D11, D13, D20); as células editáveis, ao gravar (D19).
- **D5 · Recentes e preferências:** o cálculo vai para os recentes a partir da primeira edição (o cálculo em branco não); desligar "Guardar cálculos recentes" apaga os já guardados (é o uso em computador compartilhado); "Esquecer" apaga nomes e recentes e desliga "Lembrar neste navegador" (senão a próxima tecla voltaria a gravar); as duas opções ficam gravadas mesmo desligadas, para valerem na próxima visita. Os recentes guardam o mesmo envelope do arquivo salvo (cálculo e resultado), e "Abrir" um recente segue o mesmo caminho de abrir um arquivo (validação, recálculo, aviso de índices que mudaram).
- **D6 · "Novo cálculo" não pede confirmação:** com os recentes ligados (padrão), o cálculo anterior continua em "Abrir"; com os recentes desligados, a ajuda da seção 1 avisa que "Novo cálculo" e "Abrir" descartam o cálculo atual e que convém salvar antes. Prós: sem pop-up (§9.4) e sem fricção no uso normal. Contras: em computador compartilhado, com a opção desligada, um clique errado perde o trabalho não salvo.
- **D7 · Base inicial:** o cálculo novo nasce em "Valor fixo em reais", reajuste "nenhum", multa e honorários de 10% (D26), com o valor em branco e "Fixado em" preenchido com a data de hoje (é o único campo da base que o motor exige válido). Enquanto o valor estiver em branco, cada prestação lançada sai "não computada" com o aviso do motor pedindo o valor; enquanto a data de fixação for a de hoje, as prestações anteriores saem com o aviso "anterior à data de fixação: usado o valor fixado, sem reajuste" (inofensivo sem reajuste). Trocar de forma de base e voltar recupera o que foi digitado em cada uma.
- **D8 · Painéis modais próprios** (editor de períodos, "Personalizar", "Abrir") em vez do `<dialog>` nativo: o jsdom dos testes não o implementa. O componente tem papel `dialog`, `aria-modal`, título ligado, foco no primeiro campo ao abrir e de volta ao botão ao fechar, Esc fecha, Tab circula dentro, clique no fundo fecha.
- **D9 · Tema por um botão na barra** (decisões suas de 12 e 13/10/2026, que ajustam a §9.4): um botão que mostra o tema atual ("Tema do sistema", "Tema claro" ou "Tema escuro") e, a cada clique (ou Enter), passa ao seguinte, na ordem do sistema → claro → escuro → do sistema; ao passar o mouse, diz para qual tema vai. Padrão "do sistema", guardado nas preferências do navegador (sobrevive a "Esquecer" e a desligar "Lembrar", que só apagam dados pessoais). "Do sistema" deixa o CSS seguir `prefers-color-scheme`; "claro" e "escuro" marcam `data-theme` na raiz da página: na carga, um script curto no `index.html` lê a preferência e marca o atributo antes do CSS (sem piscar no tema do sistema); depois, o App acompanha cada clique no botão. Fica na barra superior, à direita das ações (acessível pelo teclado e por leitor de tela, que lê "Tema claro" etc.). A impressão sempre clara é tratada na fase 6.
- **D10 · Arquivo salvo:** `{ formato: "apura/calculo@1", calculo, resultado }`, nome `apura-<processo>-<data de elaboração>.json` (o processo limpo de acentos e símbolos; sem processo, `apura-<data>.json`), baixado pelo navegador (a API de "salvar como" só existe no Chrome). A abertura é por "Escolher arquivo" no painel "Abrir"; o arquivo é lido como texto e validado campo a campo; o `resultado` é opcional (sem ele, abre com aviso e sem a comparação de índices).
- **D11 · Lotes:** até 600 meses (50 anos) por lote; os dois lotes pedem o intervalo em datas (D27); os avisos do lote (meses de vencimento já lançados, lote vazio) aparecem embaixo do formulário que o lançou, e não na caixa geral.
- **D12 · Linhas das tabelas:** o botão ▸ no começo da linha expande a memória (base, índices mês a mês com a fração, dias de juros por mês e regime, avisos do lançamento); etiquetas "vincenda", "não computada"/"não computado", "valor informado" (valor à mão, do motor) e "ajustada"/"ajustado" (alterada depois de lançada, na célula ou no lápis, `Lancamento.editado`), cada uma com a explicação ao passar o mouse (`title`); o lápis abre "Personalizar". O ✕ exclui em dois cliques, sem janela pop-up e sem mexer na linha (decisões suas de 13/10/2026): o primeiro clique deixa o próprio ✕ vermelho, do mesmo tamanho, e o leitor de tela passa a ler "Clique de novo para excluir a prestação de dd/mm/aaaa"; um segundo clique deliberado (ou Enter) exclui e leva o foco para "+ Prestação" ou "+ Pagamento"; o segundo clique de um clique duplo e o Enter segurado não excluem (protegem do engano); Esc, qualquer clique ou foco fora do ✕ (outra linha, a memória, um campo, Tab para fora), 4 segundos sem o segundo clique ou mudança no cálculo o desarmam; o ✕ de outra linha, inclusive da outra tabela, leva o "armado" para ela (só um por vez). A memória aberta de uma linha excluída é esquecida (se a linha voltar pelo lote, volta fechada). Não há "desfazer" depois do segundo clique. Dívida negativa nunca aparece como devida: total devido e total geral saem R$ 0,00, com o aviso do motor (§6.6).
- **D13 · Lápis ("Personalizar"):** painel para os ajustes finos de uma linha: vencimento (ou data), valor, descrição, termos próprios e regras próprias; em "% dos rendimentos", "Rendimento deste mês" e, ao lado, "Aplicar este rendimento daqui em diante" (prestações da data em diante). A inclusão avulsa é a linha nova da tabela (D20).
- **D14 · Termos próprios:** termo final posterior à data de elaboração, termo inicial posterior ao final e termo inicial posterior à data de elaboração (quando não há termo final) são recusados no painel (o motor também limitaria, com aviso, ou daria encargos zero). "Usar regras próprias" copia a metodologia global para o lançamento e a edita no mesmo editor de períodos.
- **D15 · Editor de períodos:** "SELIC única" é uma escolha só (juros `selicUnica` e correção "nenhum", com o seletor de índice travado e uma frase explicando que a SELIC já inclui correção e juros); "Dividir em uma data" cria um período novo com as mesmas regras do anterior; "Remover divisão" funde o período no anterior; a metodologia volta a ser "não ajustada" quando fica igual à padrão campo a campo; "Restaurar a metodologia padrão" aparece só quando ajustada. Os avisos de `validarMetodologia` aparecem no editor (só uma metodologia vinda de arquivo pode ter lacuna; pela tela os períodos são sempre contíguos).

**Dependências novas (só de desenvolvimento, versões exatas, todas publicadas há mais de 14 dias em 12/10/2026):**

| Pacote | Versão | Para quê | Alternativas consideradas |
|---|---|---|---|
| `@testing-library/react` + `@testing-library/dom` | 16.3.3 + 10.4.2 | testes de componente (§11 do design): renderizam a tela e a consultam como um usuário (por rótulo, papel e texto) | só testar o redutor puro (deixaria a tela sem teste; o design pede testes de componente para lote, edição, recentes e preferências); testes de navegador com Playwright (pesados, lentos, e precisariam de navegador instalado em cada máquina e no GitHub) |
| `@testing-library/user-event` | 14.6.7 | digitação e cliques realistas (um evento por tecla, como no navegador), o que importa para a validação inline | `fireEvent` cru (um evento por campo; não exercita a leitura tecla a tecla) |
| `@fontsource/ubuntu` + `@fontsource/source-sans-3` | 5.3.0 + 5.3.0 (19/07/2026; a 5.3.1 do Source Sans 3, de 11/10/2026, tem menos de 14 dias) | as duas fontes do manual (§10.2), embutidas no site: o Vite copia os `.woff2` para `dist/assets/` e nada é carregado do Google; só o alfabeto latino e quatro pesos (cerca de 92 KB no total) | baixar os `.woff2` à mão para `public/fontes/`, como dizia a §10.2 (arquivos binários sem versão nem licença rastreáveis no `package.json`); carregar do Google Fonts (proibido pela §10.2 e pela regra de não transmitir nada) |
| `jsdom` | 30.1.1 (22/09/2026; a 30.1.2, de 04/10/2026, tem menos de 14 dias) | um DOM dentro do Node para os testes de componente, ativado só nos arquivos marcados `// @vitest-environment jsdom`; o resto da suíte continua em Node | `happy-dom` (mais rápido, porém menos completo; o jsdom é o padrão da Testing Library e o mais testado com ela). Limite conhecido: não implementa `<dialog>` (por isso o painel próprio, D8) |

**Limites registrados (não resolvidos nesta fase, por decisão):**

- **Recálculo a cada tecla:** com 180 lançamentos (dez anos de prestações e cinco de pagamentos), `calcular` leva cerca de 90 ms na máquina de desenvolvimento; a digitação continua fluida nesse tamanho, e o MVP não prevê execuções maiores. Se um dia incomodar, a saída é adiar o recálculo (`useDeferredValue`) sem mudar o motor.
- **Sem confirmação em "Novo cálculo" (D6) e sem "desfazer" depois de uma exclusão confirmada (D12):** depois do "Sim", clicar de novo "Lançar em lote" (seção 3 ou 4) traz de volta a prestação ou o pagamento de lote que não tinha sido mexido; lançamentos avulsos (13º, férias, pagamento avulso) e ajustes feitos no lápis precisam ser refeitos à mão.
- **Edição na célula (D19):** Tab grava e leva o foco à célula seguinte (o botão dela), sem abri-la já em edição; para corrigir, Enter. Texto inválido numa célula fica em vermelho até ser corrigido ou desfeito com Esc.
- Os campos de data do navegador mostram o formato do idioma do navegador (num navegador em inglês, `mm/dd/yyyy`), não do app.
- **Sem CSS de impressão** (fase 6). O logo da barra é um PNG reduzido (o manual só traz EPS e PNG; não há versão vetorial).
- **Acessibilidade básica** (§9.4): rótulos, teclado, foco visível, `aria-*` nos erros e painéis; sem auditoria com leitor de tela.
- **Sem roteiro de conferência manual automatizado:** a Task 15 é uma conferência no navegador, com o que observar; o executor registra o que viu.

**Ensaio:** todo o código deste plano foi escrito e executado numa cópia do repositório fora dele, em 12 e 13/10/2026, no fluxo de cada tarefa (teste que falha, código, `npm run verificar` verde, commit). Depois, a fase foi reconstruída tarefa por tarefa a partir da `main` (57701db), numa segunda cópia, aplicando só os arquivos de cada tarefa, na ordem deste plano, primeiro os testes (para registrar exatamente o que falha) e depois o código: os catorze estados passam em `npm run verificar` com as contagens indicadas em cada tarefa, o estado final é idêntico ao do ensaio (`diff -r` vazio), e `npm run build` gera `dist/`. A tela foi conferida no navegador integrado da sessão: duas colunas em 1280 px; coluna única com o resumo no topo em 770 px e em 375 px (celular); tema escuro; navegação só com o teclado (Tab percorre os controles na ordem, com o foco visível; Esc fecha os painéis); fluxo completo (base, dois lotes, memória expandida, lápis, editor de períodos, "Abrir" com recente); botão de tema ("claro" vence o sistema escuro, "escuro" marca `data-theme="dark"`, "do sistema" remove o atributo, e a escolha fica gravada em `apura.preferencias`); exclusão em dois cliques (o ✕ fica vermelho no primeiro clique, Esc o desarma, e um clique duplo não exclui). A identidade visual (Task 14) foi conferida em 1366 px e em 375 px, nos temas claro e escuro: logo nítido na barra, fontes carregadas Ubuntu 500 e 700 e Source Sans 3 400 e 600, sem pedido ao Google, e nenhuma rolagem lateral da página no celular (a medição achou dois defeitos de CSS que a alargavam: a classe `principal` repetida no botão "Relatório / PDF", que a Task 14 corrige, e o rótulo oculto "Ações" das tabelas, que o CSS da Task 2 prende dentro da rolagem da tabela). Em 13/10/2026, os ajustes D17 a D23 foram ensaiados do mesmo jeito e conferidos no navegador: seção 1 em duas colunas (um campo por linha em 375 px), máscara do processo, valor corrigido na célula com Enter (a linha ganha "valor informado" e "ajustada"), linha nova com o vencimento seguinte e o valor da base, Enter incluindo e Esc descartando com o foco de volta em "+ Prestação", balão ⓘ da tabela (no celular, faixa no pé da tela), tudo sem rolagem lateral da página; a conferência achou, e o CSS corrige, a primeira coluna empurrando os botões da linha para fora da tabela quando havia etiquetas (agora a descrição e as etiquetas descem para baixo do vencimento). Uma revisão adversarial desse pacote, feita por um agente independente, achou seis defeitos, todos corrigidos e com teste: a linha nova sobrevivia a "Novo cálculo" e a "Abrir" e podia ser incluída no outro cálculo; colar o número do processo com um espaço ou texto antes cortava o último dígito; trocar de janela no meio da digitação gravava o valor pela metade; sair com Tab de um vencimento que muda a linha de lugar perdia o foco (conferido no navegador: o foco fica no valor da linha, na nova posição); os erros da linha nova não estavam ligados aos campos; e um 13º avulso servia de modelo para a próxima prestação. Depois, os ajustes D12 (✕ vermelho), D24 (cartões) e D25 (edição do tamanho do texto) foram conferidos no navegador: cinco cartões numa linha em 842 px, 3 + 2 em 620 px e 2 + 2 + 1 em 375 px, sempre com o valor inteiro; a altura da linha e a largura de cada coluna medidas antes e depois de abrir a data, abrir o valor e armar o ✕ ficaram idênticas. Por fim, D26 a D29 foram conferidos do mesmo jeito: botões sem reticências e "Tema do sistema"; multa e honorários com 10%; as duas seções de lote com o intervalo em datas; e, com "% do salário mínimo" sem percentual e um lote lançado, o aviso "Falta o percentual do salário mínimo…" no topo da caixa, o campo em vermelho e nada de "igualam ou superam". A conferência mostrou que os exemplos dentro dos campos ("30", "1.000,00") pareciam valores digitados, o que explica as prestações zeradas vistas pelo responsável com o percentual em branco: os exemplos passaram a "ex.: 30", mais claros e em itálico. O tempo de `calcular` com 180 lançamentos e a cópia publicada real foi medido (cerca de 90 ms). O texto do plano passou por uma revisão adversarial contra o código ensaiado.

Depende de internet: só os dois `npm install` (o inicial e o da Task 2). Os testes e todo o resto rodam sem rede.


---

## Estrutura de arquivos desta fase

| Arquivo | Responsabilidade |
|---|---|
| `src/motor/calcular.ts`, `juros.ts`, `lote.ts`, `base.ts` | Task 1: campo da base em branco com aviso próprio e aviso de amortizações só com pagamento (D29); percentuais de multa e honorários e taxa mensal inválidos ou negativos valem zero com aviso; o lote considera ocupada a competência das prestações de lote e das avulsas sem descrição (o 13º ou as férias avulsos não a ocupam) e seus avisos falam em mês de vencimento; o aviso de valor informado inválido deixa de mandar usar ponto decimal |
| `package.json`, `package-lock.json` | Task 2: as quatro dependências de teste |
| `index.html`, `src/main.tsx` | Task 2: título, `color-scheme`, o script inline que aplica o tema guardado (`apura.preferencias`) na raiz antes do CSS (usado pela Task 13) e a raiz em `src/ui/App.tsx` (o `src/App.tsx` provisório da fase 1 é removido) |
| `README.md` | Task 2: requisito de Node 22.22.2 (exigência do `jsdom` 30) |
| `src/ui/estilos.css` | Task 2: o CSS da fase (variáveis de cor nos dois temas, pelo sistema ou por `data-theme`; estrutura, campos, tabelas, painéis, telas estreitas); as tarefas seguintes só usam as classes; a Task 14 o reescreve com o acabamento visual |
| `public/logos/dpems-horizontal-branca.png`, `src/main.tsx` (fontes), `src/ui/BarraSuperior.tsx` (logo) | Task 14: identidade visual da DPE-MS |
| `src/ui/ambiente.ts` | Task 2: `Ambiente` (congelar, hoje, agora, novoId, armazenamento, baixar) e `ambientePadrao()` |
| `src/ui/versao.ts` | Task 2: `VERSAO` do `package.json` para o rodapé |
| `src/ui/BarraSuperior.tsx`, `Rodape.tsx`, `componentes/Avisos.tsx` | Task 2: barra com as quatro ações, rodapé com a situação dos índices e a versão, caixa de avisos |
| `src/ui/testes/ambiente-de-teste.ts` | Task 2: ambiente falso (tabela fixa, dia fixo, ids previsíveis, armazenamento em memória ou que falha, downloads capturados, contagem de congelamentos) |
| `src/ui/App.tsx` | Task 2 em diante: monta a tela; reescrito a cada tarefa que liga uma peça nova |
| `src/ui/entrada.ts` | Task 3: `lerDecimal`, `lerValorPositivo`, `lerPercentual`, `lerInteiro`, `lerCompetenciaTexto`, `lerData`, `lerNumeroProcesso`, a máscara `formatarNumeroProcesso` e as formatações de volta para os campos |
| `src/ui/estado/calculo.ts` | Task 4: `Estado`, `Acao`, `novoCalculo`, `estadoInicial`, `reduzir` (redutor puro com todas as ações da tela) |
| `src/ui/armazenamento.ts`, `preferencias.ts` | Task 5: acesso protegido ao `localStorage`; preferências com "Lembrar", "Guardar recentes" e "Esquecer" |
| `src/ui/componentes/Ajuda.tsx` | Task 5: botão ⓘ e balão de ajuda (D21) |
| `src/ui/componentes/Campo.tsx` | Task 5: `CampoTexto`, `CampoArea`, `CampoSelecao`, `Opcao` (com a ajuda no balão) e o gancho `useCampoValidado` |
| `src/ui/secoes/Processo.tsx` | Task 5: seção "1 · Processo" |
| `src/ui/estado/faltas.ts` | Task 6: o que falta na base para apurar as prestações lançadas (D29) |
| `src/ui/secoes/Base.tsx` | Task 6: seção "2 · Base dos alimentos" com três formas e rascunho por forma |
| `src/ui/estado/metodologia.ts` | Task 7: `resumirMetodologia`, `dividirPeriodo`, `removerDivisao`, `escolherIndice`, `escolherJuros`, `escolherTaxa`, `escolherOpcoes`, `ehPadrao`, `restaurarPadrao` |
| `src/ui/secoes/Encargos.tsx` | Task 7: seção "5 · Encargos e data do cálculo" |
| `src/ui/componentes/Dialogo.tsx` | Task 8: painel modal acessível |
| `src/ui/secoes/EditorDePeriodos.tsx` | Task 8: editor de períodos (global e por lançamento) |
| `src/ui/secoes/LotePrestacoes.tsx`, `LotePagamentos.tsx` | Task 9: seções "3 · Prestações em atraso" e "4 · Pagamentos" |
| `src/ui/tabelas/Indicadores.tsx`, `TabelaLancamentos.tsx`, `CelulaEditavel.tsx` | Task 10: cinco indicadores; tabelas com memória, etiquetas, vencimento e valor editáveis na célula, lápis, ✕ e a linha nova |
| `src/ui/estado/novaLinha.ts` | Task 10: sugestões da linha nova (vencimento, valor, regras próprias herdadas) |
| `src/ui/tabelas/Personalizar.tsx` | Task 11: painel "Personalizar" (lápis) |
| `src/compartilhado/tipos.ts` | Task 12: `ArquivoCalculo` (§5.1) |
| `src/ui/arquivo.ts`, `recentes.ts`, `Abrir.tsx` | Task 12: salvar e abrir (validação completa), recentes, painel "Abrir" |
| `src/ui/preferencias.ts`, `BarraSuperior.tsx`, `App.tsx` (reescritos) | Task 13: tema da tela (do sistema, claro, escuro) nas preferências, botão na barra e `data-theme` na raiz |
| testes `*.test.ts` / `*.test.tsx` ao lado de cada módulo | em cada tarefa |
| `docs/superpowers/roteiro.md`, `CLAUDE.md`, design | Task 16: fechamento |

## Como executar este plano

- Todos os comandos rodam na raiz do repositório, numa branch de trabalho (`superpowers:using-git-worktrees`). Antes de tudo: `npm install` (precisa de internet). A Task 2 instala as quatro dependências de teste (também precisa de internet).
- Uma tarefa de cada vez, na ordem. Ciclo de cada tarefa: escrever os testes → rodar e vê-los falhar (o passo diz exatamente o que deve falhar; se outra coisa falhar ou se um teste passar sem o código, pare e relate) → escrever o código → rodar e ver passar → `npm run format && npm run verificar` → commit. Só se commita com tudo verde. A contagem indicada em cada tarefa ("N passando | 9 pulados (total), em F arquivos") é a medida na reconstrução.
- Nenhum teste acessa a rede nem o armazenamento real do navegador: os testes de componente recebem `ambienteDeTeste()`; os testes puros rodam em Node. Se um teste parecer exigir rede ou a cópia publicada dos índices com valores fixos, a implementação está errada.
- Todo o código deste plano foi executado numa cópia do repositório fora dele e reconstruído tarefa por tarefa (ver "Ensaio"). Se uma implementação não bater com o esperado de um passo, pare e relate; não ajuste expectativas para "fazer passar".
- Os arquivos deste plano já estão formatados pelo Prettier; `npm run format` não deve mudá-los. `docs/` continua ignorado pelo Prettier.
- A marca de cada arquivo vem do bloco **Files** da tarefa: `Create` = arquivo novo, criado com o conteúdo do passo; `Modify (reescrito)` e `Test (reescritos)` = substituído por inteiro pelo conteúdo do passo (o `App.tsx` é reescrito em quase toda tarefa: substitua o arquivo inteiro, não tente editar trechos); `Modify` sem a marca = recebe as edições indicadas, com o texto antigo e o novo. Um bloco de código precedido só de "`caminho`:" é sempre o arquivo inteiro.
- Rótulos, ajudas e avisos são procurados por texto nos testes: copie-os exatamente.
- A conferência no navegador (Task 15) usa `npm run dev` e o navegador integrado (ou qualquer navegador); registre o que viu no relatório da tarefa.
- Relatórios de subagentes vão em `.txt`, fora do repositório (na pasta de rascunho da sessão), nunca na raiz do projeto (o `.gitignore` não ignora `*.txt`); o hook de gravação pode recusar caminhos com acento (a pasta "DEFENSORIA PÚBLICA"): grave por heredoc no shell.
- Mensagens de commit no formato "módulo: o que muda", com a linha de coautoria do modelo em uso ao final.

---

### Task 1: Motor: percentuais inválidos sem erro e lote que não pula o 13º avulso

Ajustes pequenos no motor, destinados a esta fase pelas pendências das fases 2 e 3 e pelas decisões D1 (12/10/2026), D23 e D29 (13/10/2026). Nenhum caso de referência muda.

**Files:**
- Modify: `src/motor/calcular.ts` (importação de `TextoDecimal`; função `lerPercentualDoAcrescimo`; leitura dos percentuais; dois avisos; frase do valor informado inválido)
- Modify: `src/motor/juros.ts` (importação de `decimalOuNulo`; taxa mensal inválida)
- Modify: `src/motor/base.ts` (função `semCampo`; campo da base em branco com aviso próprio)
- Modify: `src/motor/lote.ts` (deduplicação por prestações de origem lote e avulsas sem descrição; docblock; frases dos avisos)
- Test: `src/motor/calcular.test.ts`, `src/motor/juros.test.ts`, `src/motor/lote.test.ts`, `src/motor/base.test.ts`

**Interfaces:**
- Consumes: `decimalOuNulo` (`src/compartilhado/decimal.ts`), `formatarData` (já importada em `juros.ts`).
- Produces: nenhuma assinatura muda. Avisos novos no `Resultado`: `Percentual de multa inválido ("10,5"): a multa não foi aplicada.`, `Percentual de honorários negativo ("-10"): os honorários não foram aplicados.` (em `resultado.avisos`); `Taxa mensal de juros inválida ("1,5") no trecho de 10/01/2018 a 20/02/2018: esses dias ficaram sem juros.` (nos avisos do lançamento). Regra nova do lote: `gerarLotePrestacoes` considera ocupada a competência das prestações de origem `lote` e das avulsas **sem descrição** (ou com descrição só de espaços); só a avulsa com descrição é extra. O aviso de valor informado inválido deixa de mandar usar "ponto decimal" (a tela pede vírgula): `Valor informado ("1,5") não é um número válido: o lançamento não foi computado nos totais; corrija o valor.` Campo da base em branco (a tela ainda não o recebeu) tem aviso próprio, sem "não é um número válido" nem "informe o valor à mão" (D29): `Percentual do salário mínimo não informado: a prestação ficou sem valor.`, `Percentual dos rendimentos não informado: …`, `Rendimento padrão não informado: …`, `Valor fixado não informado: …` (a memória da linha diz `<campo> não informado`); o texto de fato inválido continua com a frase de antes. O aviso `As amortizações atualizadas (…) igualam ou superam as prestações atualizadas (…)` e o de multa e honorários não aplicados só saem quando há pagamento (amortizações maiores que zero): sem pagamento, o total zerado vem de prestações sem valor, que têm aviso próprio (D29). Os avisos do lote falam em mês de vencimento, não em competência (D23): `Meses de vencimento já lançados, não repetidos: jul/2026, ago/2026.`, `Nenhuma prestação nova: todos os meses de vencimento do lote já estavam lançados.`, `Informe quantos meses estão em atraso (1 ou mais) ou o intervalo de vencimentos.`, `Informe o mês do primeiro e do último vencimento do lote (mês/ano).`, `Mês final (ago/2026) anterior ao inicial (out/2026): nenhuma prestação lançada.`, `As datas do motor começam em jan/1900: lançadas 1522 prestações em vez de 100000.`, `Não há vencimento anterior a jan/1900 para lançar.`

- [ ] **Step 1: Escrever os três testes**

Em `src/motor/calcular.test.ts`, dentro de `describe("calcular (regime novo, multa e honorários, validações)")`, logo **antes** do teste `"termo final próprio posterior à data de elaboração é limitado a ela, com aviso"`, inserir:

```ts
  it("percentual de multa ou honorários inválido ou negativo não derruba o motor: aviso e percentual tratado como zero", () => {
    const calculo = calculoCom(
      [lancamento("p-2026-01", "prestacao", "2026-01-10", "1000.00")],
      hoje,
    );
    calculo.acrescimos = { multaPercentual: "10,5", honorariosPercentual: "-10" };
    const r = calcular(calculo, tabelaRegimeNovo());
    expect(r.totais.multa).toBe("0.00");
    expect(r.totais.honorarios).toBe("0.00");
    expect(r.totais.totalGeral).toBe(r.totais.totalDevido);
    expect(r.avisos).toContain('Percentual de multa inválido ("10,5"): a multa não foi aplicada.');
    expect(r.avisos).toContain(
      'Percentual de honorários negativo ("-10"): os honorários não foram aplicados.',
    );
    // percentual vazio também é inválido; percentuais válidos não geram aviso algum
    calculo.acrescimos = { multaPercentual: "", honorariosPercentual: "10" };
    expect(calcular(calculo, tabelaRegimeNovo()).avisos).toContain(
      'Percentual de multa inválido (""): a multa não foi aplicada.',
    );
    calculo.acrescimos = { multaPercentual: "10", honorariosPercentual: "0" };
    expect(
      calcular(calculo, tabelaRegimeNovo()).avisos.filter((a) => a.startsWith("Percentual")),
    ).toEqual([]);
  });

```

Em `src/motor/juros.test.ts`, dentro de `describe("jurosSimples (regime antigo: percentual mensal rateado por mês-calendário)")`, logo **antes** do teste `"um único dia rende 1/diasDoMes da taxa; termo inicial posterior ao final rende zero"`, inserir:

```ts
  it("taxa mensal inválida não derruba o motor: o trecho fica sem juros, com aviso", () => {
    const invalida: Metodologia = {
      ...padrao,
      periodos: [
        {
          de: null,
          ate: null,
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "1,5" },
        },
      ],
    };
    const r = jurosSimples({
      ...antigo,
      metodologia: invalida,
      termoInicial: "2018-01-10",
      termoFinal: "2018-02-20",
    });
    expect(paraTexto(r.percentual, 6)).toBe("0.000000");
    expect(r.detalhe).toEqual([]);
    expect(r.avisos).toEqual([
      'Taxa mensal de juros inválida ("1,5") no trecho de 10/01/2018 a 20/02/2018: esses dias ficaram sem juros.',
    ]);
  });

```

Em `src/motor/lote.test.ts`, dentro de `describe("lote de prestações (§6.1)")`, logo **antes** do teste `"ids não colidem com os existentes"`, inserir:

```ts
  it("prestação avulsa com descrição (13º, férias) não ocupa a competência: o lote lança a prestação comum do mês (decisão de 12/10/2026)", () => {
    const decimoTerceiro: Lancamento = {
      id: "p-2025-12",
      tipo: "prestacao",
      data: "2025-12-20",
      competencia: "2025-12",
      descricao: "13º salário 2025",
      rendimento: "3000.00",
      origem: "avulso",
      editado: false,
    };
    const lote = gerarLotePrestacoes(
      { diaVencimento: 10, de: "2025-11", ate: "2025-12" },
      "2026-10-11",
      [decimoTerceiro],
    );
    expect(lote.lancamentos.map((l) => [l.id, l.competencia])).toEqual([
      ["p-2025-11", "2025-11"],
      ["p-2025-12-2", "2025-12"],
    ]);
    expect(lote.pulados).toEqual([]);
    expect(lote.avisos).toEqual([]);
    // descrição vazia ou só com espaços não conta como descrição: a competência fica ocupada
    const comum: Lancamento = { ...decimoTerceiro, id: "x", descricao: "  " };
    expect(
      gerarLotePrestacoes({ diaVencimento: 10, de: "2025-12", ate: "2025-12" }, "2026-10-11", [
        comum,
      ]).pulados,
    ).toEqual(["2025-12"]);
    // uma prestação do próprio lote que ganhou descrição no lápis continua ocupando a competência
    const doLote: Lancamento = { ...decimoTerceiro, origem: "lote", descricao: "conforme acordo" };
    expect(
      gerarLotePrestacoes({ diaVencimento: 10, de: "2025-12", ate: "2025-12" }, "2026-10-11", [
        doLote,
      ]).pulados,
    ).toEqual(["2025-12"]);
  });

```

Em `src/motor/base.test.ts` (D29):

(a) dentro de `describe("base em percentual do salário mínimo (§6.3)")`, logo **antes** do teste `"percentual inválido: sem valor, com aviso, sem erro"`, inserir:

```ts
  it("percentual em branco: sem valor, com aviso próprio (decisão de 13/10/2026)", () => {
    const r = apurarValorBase(
      prestacao("2024-03-10"),
      { tipo: "percentualSalarioMinimo", percentual: "" },
      tabelaRegimeNovo(),
      2,
    );
    expect(r.valor).toBeNull();
    expect(r.memoria).toBe("Percentual do salário mínimo não informado");
    expect(r.avisos).toEqual([
      "Percentual do salário mínimo não informado: a prestação ficou sem valor.",
    ]);
  });

```

(b) no teste `"arredonda a 2 casas e trata rendimento ou percentual inválido com aviso"`, trocar

```ts
    expect(padraoInvalido.avisos).toEqual([
      'Rendimento padrão ("") não é um número válido: a prestação ficou sem valor; informe o rendimento ou o valor à mão.',
    ]);
```

por

```ts
    // em branco (a tela ainda não recebeu o campo): aviso próprio, sem "não é um número válido"
    expect(padraoInvalido.avisos).toEqual([
      "Rendimento padrão não informado: a prestação ficou sem valor.",
    ]);
    expect(padraoInvalido.memoria).toBe("Rendimento padrão não informado");
    expect(
      apurarValorBase(prestacao("2024-03-10"), { ...base, percentual: " " }, tabela, 2).avisos,
    ).toEqual(["Percentual dos rendimentos não informado: a prestação ficou sem valor."]);
```

(c) no teste `"valor fixado inválido: sem valor, com aviso"`, logo depois do `expect(r.avisos).toEqual([…])` que fecha o teste, acrescentar:

```ts
    expect(
      apurarValorBase(prestacao("2024-04-15"), { ...base, valor: "" }, tabela, 2).avisos,
    ).toEqual(["Valor fixado não informado: a prestação ficou sem valor."]);
```

Em `src/motor/calcular.test.ts`, no teste `"avisa quando as amortizações igualam ou superam as prestações e quando não há lançamentos"`, logo depois da linha `expect(calcular(calculoCom([]), tabelaIgpm()).avisos).toEqual(["Nenhum lançamento."]);`, acrescentar (D29):

```ts
    // sem pagamento lançado, o total zerado vem de prestações sem valor: nada de "igualam ou
    // superam" nem de multa não aplicada (decisão de 13/10/2026)
    const semValor: Lancamento = {
      id: "p-2017-01",
      tipo: "prestacao",
      data: "2017-01-10",
      competencia: "2017-01",
      valorInformado: "1,5",
      origem: "avulso",
      editado: true,
    };
    const soPrestacaoSemValor = calcular(
      {
        ...calculoCom([semValor]),
        acrescimos: { multaPercentual: "10", honorariosPercentual: "10" },
      },
      tabelaIgpm(),
    );
    expect(soPrestacaoSemValor.totais.totalDevido).toBe("0.00");
    expect(soPrestacaoSemValor.avisos).not.toContainEqual(
      expect.stringContaining("igualam ou superam"),
    );
    expect(soPrestacaoSemValor.avisos).not.toContainEqual(
      expect.stringContaining("Multa e honorários não foram aplicados"),
    );
```

Ainda em `src/motor/lote.test.ts`, trocar as frases esperadas dos avisos do lote (D23: a tela mostra o vencimento como referência de cada linha, não a competência), nos testes `"lotes cumulativos: competências já lançadas…"`, `"entradas incompletas ou inválidas geram aviso…"` e `"'meses em atraso' maior que a tabela de datas…"` (o texto entre aspas muda; o resto da linha fica):

- `"Competências já lançadas, não repetidas: jul/2026, ago/2026, set/2026."` → `"Meses de vencimento já lançados, não repetidos: jul/2026, ago/2026, set/2026."`
- `"Competências já lançadas, não repetidas: jun/2026, jul/2026, ago/2026."` → `"Meses de vencimento já lançados, não repetidos: jun/2026, jul/2026, ago/2026."`
- `"Nenhuma prestação nova: todas as competências do lote já estavam lançadas."` → `"Nenhuma prestação nova: todos os meses de vencimento do lote já estavam lançados."`
- `"Informe quantos meses estão em atraso (1 ou mais) ou o intervalo de competências."` → `"Informe quantos meses estão em atraso (1 ou mais) ou o intervalo de vencimentos."`
- `"Informe as competências inicial e final do lote (mês/ano)."` → `"Informe o mês do primeiro e do último vencimento do lote (mês/ano)."`
- `"Competência final (ago/2026) anterior à inicial (out/2026): nenhuma prestação lançada."` → `"Mês final (ago/2026) anterior ao inicial (out/2026): nenhuma prestação lançada."`
- `"As datas do motor começam em jan/1900: lançadas 1522 competências em vez de 100000."` → `"As datas do motor começam em jan/1900: lançadas 1522 prestações em vez de 100000."`
- `"Não há competência anterior a jan/1900 para lançar."` → `"Não há vencimento anterior a jan/1900 para lançar."`

Ainda em `src/motor/calcular.test.ts`, no teste `"texto decimal inválido no valor informado não derruba o motor: aviso e lançamento fora dos totais"`, trocar a frase esperada

```ts
      'Valor informado ("1,5") não é um número válido (use ponto decimal, como 451.91): o lançamento não foi computado nos totais.',
```

por

```ts
      'Valor informado ("1,5") não é um número válido: o lançamento não foi computado nos totais; corrija o valor.',
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/motor/calcular.test.ts src/motor/juros.test.ts src/motor/lote.test.ts src/motor/base.test.ts`

Esperado: `11 failed | 98 passed (109)`, exatamente estes onze:
- `calcular.test.ts › percentual de multa ou honorários inválido ou negativo não derruba o motor…` com `Error: [DecimalError] Invalid argument: 10,5`;
- `calcular.test.ts › texto decimal inválido no valor informado não derruba o motor…` (a frase esperada mudou: o motor ainda diz "use ponto decimal");
- `juros.test.ts › taxa mensal inválida não derruba o motor…` com `Error: [DecimalError] Invalid argument: 1,5`;
- `lote.test.ts › prestação avulsa com descrição (13º, férias) não ocupa a competência…` com `AssertionError: expected [ [ 'p-2025-11', '2025-11' ] ] to deeply equal …` (o lote pulou dez/2025);
- `lote.test.ts › lotes cumulativos: competências já lançadas…`, `› entradas incompletas ou inválidas geram aviso…` e `› 'meses em atraso' maior que a tabela de datas…`, os três com `AssertionError: expected … to deeply equal …` (as frases esperadas mudaram: o motor ainda fala em competência);
- `base.test.ts › percentual em branco…`, `› arredonda a 2 casas e trata rendimento ou percentual inválido com aviso` e `› valor fixado inválido…`, os três com `AssertionError` (o motor ainda diz "não é um número válido" para o campo em branco);
- `calcular.test.ts › avisa quando as amortizações igualam ou superam…` com `AssertionError` (sem pagamento, o motor ainda diz que as amortizações igualam ou superam as prestações).

- [ ] **Step 3: Implementar**

Em `src/motor/calcular.ts`:

(a) Na lista `import type { … } from "../compartilhado/tipos.ts";`, acrescentar `TextoDecimal` entre `TabelaIndices` e `Totais`:

```ts
  TabelaIndices,
  TextoDecimal,
  Totais,
} from "../compartilhado/tipos.ts";
```

(b) Logo **antes** do comentário `/** Lista "prestação de jan/2017, pagamento de 10/02/2017" na ordem dos lançamentos. */` (que precede `function listar`), inserir:

```ts
/**
 * Percentual de multa ou de honorários (§6.6) lido do texto do cálculo: texto inválido ("10,5",
 * vazio) ou negativo vale zero, com aviso, para que a entrada da tela nunca derrube o motor
 * (regra 4 do CLAUDE.md).
 */
function lerPercentualDoAcrescimo(
  texto: TextoDecimal,
  nome: "multa" | "honorários",
): { percentual: Decimal; aviso?: string } {
  const naoAplicado =
    nome === "multa" ? "a multa não foi aplicada" : "os honorários não foram aplicados";
  const valor = decimalOuNulo(texto);
  if (valor === null) {
    return {
      percentual: ZERO,
      aviso: `Percentual de ${nome} inválido ("${texto}"): ${naoAplicado}.`,
    };
  }
  if (valor.lt(ZERO)) {
    return {
      percentual: ZERO,
      aviso: `Percentual de ${nome} negativo ("${texto}"): ${naoAplicado}.`,
    };
  }
  return { percentual: valor };
}

```

(c) Dentro de `calcular`, trocar

```ts
  const percentualMulta = decimal(calculo.acrescimos.multaPercentual);
  const percentualHonorarios = decimal(calculo.acrescimos.honorariosPercentual);
```

por

```ts
  const multaLida = lerPercentualDoAcrescimo(calculo.acrescimos.multaPercentual, "multa");
  const honorariosLidos = lerPercentualDoAcrescimo(
    calculo.acrescimos.honorariosPercentual,
    "honorários",
  );
  const percentualMulta = multaLida.percentual;
  const percentualHonorarios = honorariosLidos.percentual;
```

(d) Na função `resolverValor`, trocar a frase

```ts
        `Valor informado ("${lancamento.valorInformado}") não é um número válido (use ponto decimal, como 451.91): o lançamento não foi computado nos totais.`,
```

por

```ts
        `Valor informado ("${lancamento.valorInformado}") não é um número válido: o lançamento não foi computado nos totais; corrija o valor.`,
```

(e) Ainda em `calcular`, logo depois do bloco que termina com

```ts
      avisos.push("Multa e honorários não foram aplicados porque não há valor devido.");
    }
  }
```

inserir:

```ts
  if (multaLida.aviso !== undefined) avisos.push(multaLida.aviso);
  if (honorariosLidos.aviso !== undefined) avisos.push(honorariosLidos.aviso);
```

Em `src/motor/juros.ts`:

(a) Trocar a linha de importação de `decimal.ts` por:

```ts
import { decimal, decimalOuNulo, paraTexto, ZERO, type Decimal } from "../compartilhado/decimal.ts";
```

(b) Em `jurosSimples`, trocar

```ts
    if (regra.tipo === "percentualMensal") {
      const taxa = decimal(regra.taxaMensal);
      for (const mes of ratearPorMesCalendario(trecho.de, trecho.ate)) {
```

por

```ts
    if (regra.tipo === "percentualMensal") {
      const taxa = decimalOuNulo(regra.taxaMensal);
      if (taxa === null) {
        avisos.push(
          `Taxa mensal de juros inválida ("${regra.taxaMensal}") no trecho de ${formatarData(trecho.de)} a ${formatarData(trecho.ate)}: esses dias ficaram sem juros.`,
        );
        continue;
      }
      for (const mes of ratearPorMesCalendario(trecho.de, trecho.ate)) {
```

Em `src/motor/lote.ts`:

(a) Trocar o docblock de `gerarLotePrestacoes` por:

```ts
/**
 * Gera as prestações do lote, sem valor informado (o motor apura pela base, §6.3), pulando as
 * competências que já têm prestação de lote ou avulsa sem descrição na lista (§6.1: lotes
 * cumulativos não duplicam; um 13º ou férias avulsos, com descrição, não ocupam a competência). O
 * vencimento é o dia escolhido ou o último dia do mês quando o mês é mais curto.
 */
```

(b) Dentro de `gerarLotePrestacoes`, trocar

```ts
  const jaLancadas = new Set(
    existentes.filter((l) => l.tipo === "prestacao").map((l) => l.competencia),
  );
```

por

```ts
  // Ocupam a competência as prestações do próprio lote (mesmo anotadas no lápis) e as avulsas sem
  // descrição; uma avulsa com descrição (13º salário, férias) é um extra, e o lote ainda lança a
  // prestação do mês (decisão de 12/10/2026).
  const jaLancadas = new Set(
    existentes
      .filter(
        (l) => l.tipo === "prestacao" && (l.origem === "lote" || (l.descricao ?? "").trim() === ""),
      )
      .map((l) => l.competencia),
  );
```

(c) Trocar as frases dos avisos (D23), em `competenciasDoLote` e no fim de `gerarLotePrestacoes` (o texto muda; o resto da linha fica; o Prettier quebra as linhas longas no `npm run format`):

- ``"Informe as competências inicial e final do lote (mês/ano)."`` → ``"Informe o mês do primeiro e do último vencimento do lote (mês/ano)."``
- ```Competência final (${formatarCompetencia(lote.ate)}) anterior à inicial (${formatarCompetencia(lote.de)}): nenhuma prestação lançada.``` → ```Mês final (${formatarCompetencia(lote.ate)}) anterior ao inicial (${formatarCompetencia(lote.de)}): nenhuma prestação lançada.```
- ``"Informe quantos meses estão em atraso (1 ou mais) ou o intervalo de competências."`` → ``"Informe quantos meses estão em atraso (1 ou mais) ou o intervalo de vencimentos."``
- ``"Não há competência anterior a jan/1900 para lançar."`` → ``"Não há vencimento anterior a jan/1900 para lançar."``
- ```As datas do motor começam em jan/1900: lançadas ${competencias.length} competências em vez de ${meses}.``` → ```As datas do motor começam em jan/1900: lançadas ${competencias.length} prestações em vez de ${meses}.```
- ```Competências já lançadas, não repetidas: ${pulados.map(formatarCompetencia).join(", ")}.``` → ```Meses de vencimento já lançados, não repetidos: ${pulados.map(formatarCompetencia).join(", ")}.```
- ``"Nenhuma prestação nova: todas as competências do lote já estavam lançadas."`` → ``"Nenhuma prestação nova: todos os meses de vencimento do lote já estavam lançados."``

Em `src/motor/base.ts` (D29):

(a) logo depois da função `semValor`, inserir:

```ts
/**
 * Campo da base deixado em branco (a tela ainda não o recebeu): aviso próprio, em vez de "não é um
 * número válido", que fica para o texto de fato inválido (arquivo editado à mão).
 */
function semCampo(nome: string): ValorBaseApurado {
  return semValor(`${nome} não informado`, `${nome} não informado: a prestação ficou sem valor.`);
}
```

(b) na primeira linha de `porSalarioMinimo`, antes de `const percentual = decimalOuNulo(percentualTexto);`, inserir `if (percentualTexto.trim() === "") return semCampo("Percentual do salário mínimo");`;

(c) em `porRendimentos`, antes de `const percentual = decimalOuNulo(base.percentual);`, inserir `if (base.percentual.trim() === "") return semCampo("Percentual dos rendimentos");` e, logo depois da linha `const origem = proprio ? …;`, inserir ``if (texto.trim() === "") return semCampo(`Rendimento ${origem}`);``;

(d) em `porValorFixo`, antes de `const fixado = decimalOuNulo(base.valor);`, inserir `if (base.valor.trim() === "") return semCampo("Valor fixado");`.

Em `src/motor/calcular.ts`, ainda (D29), trocar

```ts
  } else if (!haValorDevido) {
    avisos.push(
```

por

```ts
  } else if (!haValorDevido && amortizacoes.gt(ZERO)) {
    // só com pagamento lançado: sem ele, o total zerado vem de prestações sem valor, que têm
    // aviso próprio (decisão de 13/10/2026)
    avisos.push(
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/motor/calcular.test.ts src/motor/juros.test.ts src/motor/lote.test.ts src/motor/base.test.ts`
Esperado: `109 passed (109)`.

- [ ] **Step 5: Verificação completa**

Run: `npm run format && npm run verificar`
Esperado: Prettier, ESLint e `tsc -b` limpos; `682 passed | 9 skipped (691)` em 23 arquivos.

- [ ] **Step 6: Commit**

```bash
git add src/motor/calcular.ts src/motor/juros.ts src/motor/lote.ts src/motor/base.ts src/motor/calcular.test.ts src/motor/juros.test.ts src/motor/lote.test.ts src/motor/base.test.ts
git commit -m "motor: percentuais inválidos sem erro, lote que não pula avulsas com descrição e avisos da base em branco

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 2: Fundação da tela: dependências de teste, estilos, ambiente injetável, barra, rodapé e avisos dos índices

A casca da interface: o `App` passa a viver em `src/ui/`, congela a tabela de índices ao abrir, mostra o rodapé com a situação dos índices e os avisos do calendário, e ganha o primeiro teste de componente. O CSS da fase entra aqui (as tarefas seguintes só usam as classes; a Task 14 o reescreve com o acabamento visual), assim como o ambiente injetável e o ambiente de teste.

**Files:**
- Modify: `package.json`, `package-lock.json` (quatro dependências de desenvolvimento)
- Modify (reescrito): `index.html`, `src/main.tsx`
- Modify: `README.md` (requisito de Node)
- Delete: `src/App.tsx`
- Create: `src/ui/App.tsx`, `src/ui/BarraSuperior.tsx`, `src/ui/Rodape.tsx`, `src/ui/componentes/Avisos.tsx`, `src/ui/ambiente.ts`, `src/ui/versao.ts`, `src/ui/estilos.css`, `src/ui/testes/ambiente-de-teste.ts`
- Test: `src/ui/App.test.tsx`

**Interfaces:**
- Consumes: `congelarIndices`, `descreverSituacao`, `SituacaoIndices` (`src/indices/congelar.ts`); `hojeEmBrasilia`, `agoraEmBrasilia` (`src/indices/relogio.ts`); `esperadoAte` (`src/indices/calendario.ts`); `tabelaRegimeNovo` (`src/motor/testes/regime-novo.ts`).
- Produces: `Ambiente` e `ambientePadrao()` (`ambiente.ts`): `congelar(): { tabela; situacao }`, `hoje(): DataISO`, `agora(): string`, `novoId(): string`, `armazenamento(): Storage | null`, `baixar(nome, conteudo)`. `ambienteDeTeste(opcoes?)` (`testes/ambiente-de-teste.ts`): `Ambiente` com `baixados`, `armazenado`, `congelamentos()`; `armazenamentoEmMemoria(inicial?)`, `armazenamentoQueFalha()`, `HOJE_DE_TESTE = "2026-10-11"`, `AGORA_DE_TESTE`. `App({ ambiente? })`. `Avisos({ avisos, titulo? })` (região com `aria-label` = título, padrão "Avisos"; nada quando vazia). `BarraSuperior({ aoNovo?, aoAbrir?, aoSalvar? })`. `Rodape({ situacaoDosIndices })`. `VERSAO`. Classes CSS de `estilos.css` usadas por todas as tarefas.

- [ ] **Step 1: Instalar as dependências de teste (precisa de internet)**

```bash
npm install --save-dev --save-exact @testing-library/react@16.3.3 @testing-library/dom@10.4.2 @testing-library/user-event@14.6.7 jsdom@30.1.1
```

Esperado: `package.json` ganha as quatro linhas em `devDependencies`, nas versões exatas, e `package-lock.json` é atualizado; `found 0 vulnerabilities`. Em seguida, em `package.json`, trocar `"node": ">=22.18"` por `"node": ">=22.22.2"` (exigência do `jsdom` 30) e, em `README.md`, trocar a linha `- Node.js 22.18 ou mais recente e npm.` por `- Node.js 22.22.2 ou mais recente e npm (os testes de componente usam o jsdom 30).`

- [ ] **Step 2: Escrever o teste de componente**

`src/ui/App.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App.tsx";
import { ambienteDeTeste } from "./testes/ambiente-de-teste.ts";

afterEach(cleanup);

describe("App (fundação da tela)", () => {
  it("mostra o nome do sistema, as quatro ações da barra e o rodapé com a situação dos índices", () => {
    render(<App ambiente={ambienteDeTeste()} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Apura · Sistema de Cálculos Judiciais · DPE-MS",
    );
    for (const nome of ["Novo cálculo", "Abrir", "Salvar"]) {
      expect(screen.getByRole("button", { name: nome })).toBeDefined();
    }
    const relatorio = screen.getByRole("button", { name: "Relatório / PDF" }) as HTMLButtonElement;
    expect(relatorio.disabled).toBe(true);
    const rodape = screen.getByRole("contentinfo").textContent ?? "";
    expect(rodape).toContain(
      "Índices oficiais BCB/SGS · IPCA até set/2026 · atualizados em 11/10/2026 09:00 (horário de Brasília)",
    );
    expect(rodape).toMatch(/Apura v\d+\.\d+\.\d+ · Defensoria Pública de Mato Grosso do Sul/);
    // com a tabela em dia, não há aviso do calendário
    expect(screen.queryByRole("region", { name: "Avisos" })).toBeNull();
  });

  it("mostra na caixa de avisos os meses já divulgados que ainda não chegaram ao Apura", () => {
    render(<App ambiente={ambienteDeTeste({ limites: { "433": "2026-07" } })} />);
    const avisos = screen.getByRole("region", { name: "Avisos" });
    expect(avisos.textContent).toContain(
      "IPCA de ago/2026, divulgado por volta de 10/09/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
    );
  });

  it("abre com a cópia publicada quando nenhum ambiente é injetado (sem rede)", () => {
    render(<App />);
    expect(screen.getByRole("contentinfo").textContent).toContain("Índices oficiais BCB/SGS");
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run src/ui/App.test.tsx`
Esperado: o arquivo falha ao importar: `Error: Failed to resolve import "./App.tsx" from "src/ui/App.test.tsx". Does the file exist?` (`Test Files 1 failed`, `Tests no tests`).

- [ ] **Step 4: Escrever os arquivos da fundação**

`index.html` (reescrito; o script inline aplica o tema fixado antes do CSS, Task 13):

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <title>Apura · Sistema de Cálculos Judiciais</title>
    <script>
      // Tema fixado pelo usuário (preferência "tema" em apura.preferencias): marcado na raiz
      // antes do CSS e do app, para a página não piscar no tema do sistema. O App mantém em dia.
      try {
        var preferencias = JSON.parse(localStorage.getItem("apura.preferencias") || "{}");
        if (preferencias.tema === "claro" || preferencias.tema === "escuro") {
          document.documentElement.setAttribute(
            "data-theme",
            preferencias.tema === "claro" ? "light" : "dark",
          );
        }
      } catch (erro) {
        // sem armazenamento (bloqueado ou ausente): vale o tema do sistema
      }
    </script>
  </head>
  <body>
    <div id="raiz"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx` (reescrito):

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./ui/App.tsx";

const raiz = document.getElementById("raiz");
if (raiz) {
  createRoot(raiz).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
```

Remover o provisório da fase 1:

```bash
git rm src/App.tsx
```

`src/ui/versao.ts` (novo):

```ts
import pacote from "../../package.json" with { type: "json" };

/** Versão do Apura, a do `package.json` (0.1.0 a partir da fase 7), para o rodapé da tela. */
export const VERSAO: string = pacote.version;
```

`src/ui/ambiente.ts` (novo):

```ts
import type { DataISO } from "../compartilhado/tipos.ts";
import { congelarIndices, type SituacaoIndices } from "../indices/congelar.ts";
import { agoraEmBrasilia, hojeEmBrasilia } from "../indices/relogio.ts";
import type { TabelaIndices } from "../compartilhado/tipos.ts";

/**
 * Tudo o que a tela precisa do mundo exterior, num objeto só, para que os testes de componente
 * troquem cada peça por uma versão falsa: a cópia publicada dos índices (congelada por cálculo),
 * o relógio, a geração de ids, o armazenamento do navegador e o download de arquivos. A tela
 * nunca acessa a rede (§14 do design).
 */
export interface Ambiente {
  /** congela a tabela de índices de um cálculo (síncrono, sem rede), ao abrir o app e em "Novo cálculo" */
  congelar: () => { tabela: TabelaIndices; situacao: SituacaoIndices };
  /** data de hoje em Brasília, para a data de elaboração padrão */
  hoje: () => DataISO;
  /** data-hora ISO de agora em Brasília, para `criadoEm` e `atualizadoEm` */
  agora: () => string;
  /** id novo para cálculos */
  novoId: () => string;
  /**
   * o `localStorage` do navegador, ou nulo quando ele não existe ou está bloqueado (janela anônima
   * com bloqueio, política do navegador): quem usa trata nulo como "não guardar"
   */
  armazenamento: () => Storage | null;
  /** entrega ao usuário um arquivo de texto com o nome dado (download) */
  baixar: (nome: string, conteudo: string) => void;
}

function armazenamentoDoNavegador(): Storage | null {
  try {
    const armazenamento = globalThis.localStorage;
    // Em navegadores com o armazenamento bloqueado, só acessar a propriedade já lança.
    return armazenamento ?? null;
  } catch {
    return null;
  }
}

function baixarPeloNavegador(nome: string, conteudo: string): void {
  const url = URL.createObjectURL(new Blob([conteudo], { type: "application/json" }));
  const ancora = document.createElement("a");
  ancora.href = url;
  ancora.download = nome;
  document.body.append(ancora);
  ancora.click();
  ancora.remove();
  URL.revokeObjectURL(url);
}

/** O ambiente real do navegador. */
export function ambientePadrao(): Ambiente {
  return {
    congelar: () => congelarIndices(),
    hoje: () => hojeEmBrasilia(),
    agora: () => agoraEmBrasilia(),
    novoId: () => crypto.randomUUID(),
    armazenamento: armazenamentoDoNavegador,
    baixar: baixarPeloNavegador,
  };
}
```

`src/ui/componentes/Avisos.tsx` (novo):

```tsx
/**
 * Caixa de avisos em frases completas (§9.3): só aparece quando há aviso. Recebe as frases já
 * prontas (do congelamento dos índices, do motor, do lote ou da abertura de um arquivo).
 */
export function Avisos({ avisos, titulo = "Avisos" }: { avisos: string[]; titulo?: string }) {
  if (avisos.length === 0) return null;
  return (
    <section className="avisos" aria-label={titulo}>
      <h2>{titulo}</h2>
      <ul>
        {avisos.map((aviso, i) => (
          <li key={`${i}-${aviso}`}>{aviso}</li>
        ))}
      </ul>
    </section>
  );
}
```

`src/ui/BarraSuperior.tsx` (novo):

```tsx
/** Barra superior (§9.1): nome do sistema e as quatro ações. "Relatório / PDF" chega na fase 6. */
export function BarraSuperior({
  aoNovo,
  aoAbrir,
  aoSalvar,
}: {
  aoNovo?: () => void;
  aoAbrir?: () => void;
  aoSalvar?: () => void;
}) {
  return (
    <header className="barra">
      <h1 className="marca">
        Apura <small>· Sistema de Cálculos Judiciais · DPE-MS</small>
      </h1>
      <nav className="acoes-principais" aria-label="Ações do cálculo">
        <button type="button" className="botao-barra" onClick={aoNovo}>
          Novo cálculo
        </button>
        <button type="button" className="botao-barra" onClick={aoAbrir}>
          Abrir
        </button>
        <button type="button" className="botao-barra" onClick={aoSalvar}>
          Salvar
        </button>
        <button
          type="button"
          className="botao-barra principal"
          disabled
          title="O relatório em tela e PDF chega na próxima versão."
        >
          Relatório / PDF
        </button>
      </nav>
    </header>
  );
}
```

`src/ui/Rodape.tsx` (novo):

```tsx
import { VERSAO } from "./versao.ts";

/** Rodapé (§9.3): situação dos índices, sem botão, e a versão do Apura. */
export function Rodape({ situacaoDosIndices }: { situacaoDosIndices: string }) {
  return (
    <footer className="rodape">
      <span>{situacaoDosIndices}</span>
      <span>Apura v{VERSAO} · Defensoria Pública de Mato Grosso do Sul</span>
    </footer>
  );
}
```

`src/ui/App.tsx` (novo; será reescrito nas tarefas seguintes):

```tsx
import { useState } from "react";
import { ambientePadrao, type Ambiente } from "./ambiente.ts";
import { BarraSuperior } from "./BarraSuperior.tsx";
import { Avisos } from "./componentes/Avisos.tsx";
import "./estilos.css";
import { Rodape } from "./Rodape.tsx";

/**
 * Tela única em duas colunas (§9): esquerda, dados do caso e lançamentos em lote; direita,
 * resultado e lançamentos individuais. O `ambiente` é injetável para os testes de componente.
 */
export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambiente }) {
  // A tabela de índices é congelada quando o app abre (§8.2); "Novo cálculo" congela outra.
  const [indices] = useState(() => ambiente.congelar());
  return (
    <div className="app">
      <BarraSuperior />
      <main className="principal">
        <div className="coluna-esquerda" />
        <div className="coluna-direita">
          <Avisos avisos={indices.situacao.avisos} />
        </div>
      </main>
      <Rodape situacaoDosIndices={indices.situacao.rodape} />
    </div>
  );
}
```

`src/ui/testes/ambiente-de-teste.ts` (novo; já com tudo o que as tarefas seguintes usam):

```ts
import type { CodigoSerie, Competencia, DataISO } from "../../compartilhado/tipos.ts";
import { esperadoAte } from "../../indices/calendario.ts";
import { descreverSituacao } from "../../indices/congelar.ts";
import { tabelaRegimeNovo } from "../../motor/testes/regime-novo.ts";
import type { Ambiente } from "../ambiente.ts";

/**
 * Ambiente falso para os testes de componente: dia fixo (11/10/2026), tabela de índices fixa (a
 * das seis séries de 2024 a 2026 usada pelos testes do motor, nunca a cópia publicada, que a
 * rotina central muda), ids previsíveis, armazenamento em memória e downloads capturados. Nenhum
 * teste da tela depende dos últimos meses de `dados/indices/`.
 */

export const HOJE_DE_TESTE: DataISO = "2026-10-11";
export const AGORA_DE_TESTE = "2026-10-11T15:00:00-03:00";

/** Um `Storage` em memória, com a interface do `localStorage`. */
export function armazenamentoEmMemoria(inicial: Record<string, string> = {}): Storage {
  const dados = new Map<string, string>(Object.entries(inicial));
  return {
    get length() {
      return dados.size;
    },
    key: (indice: number) => [...dados.keys()][indice] ?? null,
    getItem: (chave: string) => dados.get(chave) ?? null,
    setItem: (chave: string, valor: string) => {
      dados.set(chave, String(valor));
    },
    removeItem: (chave: string) => {
      dados.delete(chave);
    },
    clear: () => {
      dados.clear();
    },
  };
}

/** Um `Storage` que lança em toda operação, como num navegador com o armazenamento bloqueado. */
export function armazenamentoQueFalha(): Storage {
  const falhar = (): never => {
    throw new Error("Armazenamento bloqueado.");
  };
  return {
    length: 0,
    key: falhar,
    getItem: falhar,
    setItem: falhar,
    removeItem: falhar,
    clear: falhar,
  };
}

export interface AmbienteDeTeste extends Ambiente {
  /** arquivos "baixados" pela tela, na ordem */
  baixados: Array<{ nome: string; conteudo: string }>;
  armazenado: Storage | null;
  /** quantas vezes a tela congelou a tabela de índices */
  congelamentos: () => number;
}

export function ambienteDeTeste(
  opcoes: {
    /** corta séries numa competência (ex.: `{ "433": "2026-07" }`), para simular cópia atrasada */
    limites?: Partial<Record<CodigoSerie, Competencia>>;
    armazenamento?: Storage | null;
    hoje?: DataISO;
    agora?: string;
  } = {},
): AmbienteDeTeste {
  const hoje = opcoes.hoje ?? HOJE_DE_TESTE;
  const agora = opcoes.agora ?? AGORA_DE_TESTE;
  const armazenado =
    opcoes.armazenamento === undefined ? armazenamentoEmMemoria() : opcoes.armazenamento;
  const baixados: AmbienteDeTeste["baixados"] = [];
  let contador = 0;
  let congelamentos = 0;
  return {
    congelar: () => {
      congelamentos++;
      const tabela = { ...tabelaRegimeNovo(opcoes.limites), esperadoAte: esperadoAte(hoje) };
      return { tabela, situacao: descreverSituacao(tabela, hoje) };
    },
    hoje: () => hoje,
    agora: () => agora,
    novoId: () => `id-${++contador}`,
    armazenamento: () => armazenado,
    baixar: (nome, conteudo) => {
      baixados.push({ nome, conteudo });
    },
    baixados,
    armazenado,
    congelamentos: () => congelamentos,
  };
}
```

`src/ui/estilos.css` (novo; o CSS da fase, antes do acabamento da Task 14):

```css
/* Apura · estilos da tela (fase 5). Cores do manual de identidade da DPE-MS (§10.2 do design):
   verde #1D6B34, amarelo-ouro #D8BB73, preto #373636, cinza #868686, vermelho #ED1C24; fundo claro
   #F3F4F1 e tema escuro como no relatório de exemplo. Tema do sistema, claro ou escuro, pelo
   botão da barra (decisão de 12/10/2026; o padrão é o do sistema). As fontes
   Ubuntu e Source Sans 3 entram embutidas na fase 6; até lá valem as reservas do sistema. */

:root {
  --verde: #1d6b34;
  --verde-claro: #1fa463;
  --ouro: #d8bb73;
  --vermelho: #c8101a;
  --fundo: #f3f4f1;
  --superficie: #ffffff;
  --texto: #373636;
  --discreto: #6e716c;
  --linha: #dcdfd9;
  --linha-alternada: #f7f8f5;
  --cabecalho-fundo: #1d6b34;
  --cabecalho-texto: #ffffff;
  --aviso-fundo: #fff8e1;
  --aviso-borda: #d8bb73;
  --foco: #1fa463;
  --titulos: "Ubuntu", "Segoe UI", system-ui, sans-serif;
  --corpo: "Source Sans 3", "Segoe UI", system-ui, sans-serif;
  color-scheme: light;
}

/* Tema escuro: pelo sistema (salvo se o usuário escolheu "claro") ou pela escolha "escuro" do
   seletor da barra, que o App grava em data-theme na raiz. As duas listas são iguais de propósito. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --verde: #3fa866;
    --verde-claro: #5cc385;
    --vermelho: #ff6b6b;
    --fundo: #0f1813;
    --superficie: #17221b;
    --texto: #e8ebe6;
    --discreto: #9ba69d;
    --linha: #2a3a2f;
    --linha-alternada: #1b2820;
    --cabecalho-fundo: #143f24;
    --cabecalho-texto: #ffffff;
    --aviso-fundo: #2a2410;
    --aviso-borda: #a88d4a;
    --foco: #5cc385;
    color-scheme: dark;
  }
}

:root[data-theme="dark"] {
  --verde: #3fa866;
  --verde-claro: #5cc385;
  --vermelho: #ff6b6b;
  --fundo: #0f1813;
  --superficie: #17221b;
  --texto: #e8ebe6;
  --discreto: #9ba69d;
  --linha: #2a3a2f;
  --linha-alternada: #1b2820;
  --cabecalho-fundo: #143f24;
  --cabecalho-texto: #ffffff;
  --aviso-fundo: #2a2410;
  --aviso-borda: #a88d4a;
  --foco: #5cc385;
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  background: var(--fundo);
  color: var(--texto);
  font-family: var(--corpo);
  font-size: 15px;
  line-height: 1.45;
}

h1,
h2,
h3 {
  font-family: var(--titulos);
  margin: 0;
}

button,
input,
select,
textarea {
  font: inherit;
  color: inherit;
}

:focus-visible {
  outline: 2px solid var(--foco);
  outline-offset: 2px;
}

.oculto-acessivel {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* ---- Estrutura: barra, duas colunas, rodapé ---- */

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.barra {
  background: var(--cabecalho-fundo);
  color: var(--cabecalho-texto);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  padding: 10px 16px;
}

.marca {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.02em;
  flex: 1;
}

.marca small {
  font-weight: 400;
  font-size: 14px;
  opacity: 0.9;
}

.acoes-principais {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.botao-barra {
  background: transparent;
  color: var(--cabecalho-texto);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 4px;
  padding: 5px 10px;
  cursor: pointer;
}

.botao-barra.principal {
  background: #fff;
  color: #1d6b34;
  border-color: #fff;
  font-weight: 600;
}

.botao-barra:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.botao-tema {
  min-width: 10.5em;
}

.principal {
  flex: 1;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 16px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
  gap: 16px;
  align-items: start;
}

.coluna-esquerda,
.coluna-direita {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.rodape {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px 16px;
  padding: 8px 16px;
  font-size: 12.5px;
  color: var(--discreto);
  border-top: 1px solid var(--linha);
}

/* ---- Seções da esquerda e campos ---- */

.secao {
  background: var(--superficie);
  border: 1px solid var(--linha);
  border-radius: 8px;
  padding: 12px 14px;
}

.secao > h2,
.secao > .titulo-secao > h2 {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--verde);
  margin: 0 0 8px;
}

/* título da seção com o botão ⓘ da ajuda ao lado */
.titulo-secao {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.secao > .titulo-secao > h2 {
  margin: 0;
}

/* dois campos lado a lado, cada um com metade da largura (empilham no celular) */
.grade-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
  margin-bottom: 6px;
}

.grade-2 .campo input {
  width: 100%;
}

.linha {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: flex-end;
  margin-bottom: 6px;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.rotulo-do-campo,
.grupo > legend {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--discreto);
}

.campo input,
.campo select,
.campo textarea {
  background: var(--superficie);
  border: 1px solid var(--linha);
  border-radius: 4px;
  padding: 6px 8px;
  min-width: 0;
}

/* exemplos dentro dos campos: mais claros e em itálico, para não parecerem um valor digitado */
::placeholder {
  color: var(--discreto);
  opacity: 0.75;
  font-style: italic;
}

.campo input[aria-invalid="true"],
.campo select[aria-invalid="true"] {
  border-color: var(--vermelho);
}

.campo.largo {
  flex: 1 1 100%;
}

.campo.curto input {
  width: 6em;
}

.campo.medio input {
  width: 10em;
}

/* nº do processo no padrão do CNJ: 25 caracteres */
.campo.processo {
  margin-bottom: 6px;
}

.campo.processo input {
  width: 27ch;
  max-width: 100%;
  font-variant-numeric: tabular-nums;
}

.rotulo-do-campo {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* ---- Ajuda sob demanda (botão ⓘ e balão) ---- */

.ajuda-balao {
  position: relative;
  display: inline-flex;
}

.botao-ajuda {
  background: transparent;
  border: 0;
  border-radius: 50%;
  padding: 0 3px;
  cursor: pointer;
  color: var(--verde);
  font-family: var(--corpo);
  font-size: 15px;
  line-height: 1;
  text-transform: none;
  letter-spacing: 0;
}

.botao-ajuda[aria-expanded="true"] {
  color: var(--texto);
}

.balao {
  position: absolute;
  top: calc(100% + 6px);
  left: -10px;
  z-index: 5;
  width: max-content;
  max-width: 340px;
  background: var(--superficie);
  color: var(--texto);
  border: 1px solid var(--linha);
  border-top: 3px solid var(--verde);
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
  padding: 8px 10px;
  font-family: var(--corpo);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.4;
  text-transform: none;
  letter-spacing: normal;
  white-space: normal;
  text-align: left;
}

.grupo {
  border: 0;
  padding: 0;
  margin: 0 0 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
}

.grupo > legend {
  padding: 0;
  margin-bottom: 2px;
  width: 100%;
}

.grupo label {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.nota {
  font-size: 13px;
  color: var(--discreto);
  margin: 2px 0 6px;
}

.erro {
  font-size: 13px;
  color: var(--vermelho);
  margin: 0;
}

.botao {
  background: var(--verde);
  color: #fff;
  border: 1px solid var(--verde);
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
}

.botao.secundario {
  background: transparent;
  color: var(--verde);
}

.botao.discreto {
  background: transparent;
  color: var(--discreto);
  border-color: transparent;
  text-decoration: underline;
  padding: 2px 4px;
}

.botao:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ---- Lado direito: indicadores, tabelas, avisos ---- */

/* cinco cartões; quantos cabem por linha (5, 3, 2 ou 1, para ficar 5, 3 + 2, 2 + 2 + 1 ou um por
   linha) é o componente que decide, medindo o maior valor (decisão de 13/10/2026): o valor nunca
   quebra entre "R$" e o número */
.indicadores {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.indicador {
  background: var(--superficie);
  border: 1px solid var(--linha);
  border-radius: 8px;
  padding: 8px 10px;
  min-width: 0;
}

.indicador.destaque {
  border: 2px solid var(--verde);
}

.indicador dt {
  font-family: var(--titulos);
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--discreto);
  min-height: 2.4em;
}

.indicador dd {
  margin: 4px 0 0;
  font-family: var(--titulos);
  font-weight: 700;
  font-size: 17px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.tabela-rolagem {
  background: var(--superficie);
  border: 1px solid var(--linha);
  border-radius: 8px;
}

/* só a tabela rola na horizontal (o balão da ajuda do título não fica preso na rolagem);
   position: relative prende aqui os rótulos ocultos (posição absoluta) do cabeçalho, que senão
   alargariam a página inteira em telas estreitas */
.tabela-rolagem > .rolagem {
  position: relative;
  overflow-x: auto;
}

.tabela-rolagem > .titulo-secao {
  padding: 10px 12px 4px;
  margin: 0;
}

.tabela-rolagem > .titulo-secao > h2 {
  font-size: 14px;
  color: var(--verde);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}

th,
td {
  padding: 5px 6px;
  border-bottom: 1px solid var(--linha);
  text-align: right;
  white-space: nowrap;
  font-size: 13px;
}

th {
  font-family: var(--titulos);
  font-weight: 500;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: var(--cabecalho-fundo);
  color: var(--cabecalho-texto);
}

th:first-child,
td:first-child,
td.texto {
  text-align: left;
}

tfoot td {
  font-weight: 700;
  background: var(--linha-alternada);
  border-top: 2px solid var(--verde);
}

tr.memoria td {
  background: var(--linha-alternada);
  text-align: left;
  white-space: normal;
  font-size: 13px;
  padding: 8px 12px;
}

tr.memoria ul {
  margin: 4px 0 0;
  padding-left: 18px;
}

.botao-expandir {
  background: transparent;
  border: 0;
  padding: 0 6px 0 0;
  cursor: pointer;
  color: var(--verde);
}

/* vencimento e valor editáveis na própria célula: parecem texto, com contorno ao passar o mouse */
.celula-editavel {
  background: transparent;
  border: 1px dashed transparent;
  border-radius: 3px;
  padding: 1px 4px;
  margin: -2px -5px;
  cursor: text;
  font-variant-numeric: tabular-nums;
}

.celula-editavel:hover {
  border-color: var(--discreto);
  background: var(--linha-alternada);
}

/* em edição, o campo ocupa exatamente o lugar do texto (mesma caixa, letra e alinhamento; a
   largura vem do texto medido no clique): a tabela não se mexe. O erro aparece num balão logo
   abaixo, por cima da linha seguinte, sem empurrar nada. */
.celula-em-edicao {
  position: relative;
  display: inline-block;
}

.celula-em-edicao input {
  box-sizing: border-box;
  margin: -2px -5px;
  padding: 1px 4px;
  border: 1px solid var(--verde);
  border-radius: 3px;
  background: var(--superficie);
  font: inherit;
  line-height: inherit;
  text-align: inherit;
  font-variant-numeric: tabular-nums;
}

.celula-em-edicao input:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--foco);
}

.celula-em-edicao input[aria-invalid="true"] {
  border-color: var(--vermelho);
}

.celula-em-edicao .erro {
  position: absolute;
  top: calc(100% + 4px);
  right: -5px;
  z-index: 3;
  width: max-content;
  max-width: 18em;
  padding: 4px 8px;
  background: var(--superficie);
  border: 1px solid var(--vermelho);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  white-space: normal;
  text-align: left;
  font-size: 12px;
}

td:first-child .celula-em-edicao .erro {
  right: auto;
  left: -5px;
}

/* campos da linha nova ("+ Prestação", "+ Pagamento") */
.campo-linha-nova {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  vertical-align: middle;
}

.campo-linha-nova input {
  background: var(--superficie);
  border: 1px solid var(--verde);
  border-radius: 3px;
  padding: 2px 4px;
  width: 8.5em;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.campo-linha-nova input[type="date"] {
  width: auto;
  text-align: left;
}

.campo-linha-nova input[aria-invalid="true"] {
  border-color: var(--vermelho);
}

.campo-linha-nova .erro {
  max-width: 16em;
  white-space: normal;
  text-align: left;
  font-size: 12px;
}

/* a primeira coluna quebra a linha: descrição e etiquetas descem para baixo do vencimento
   quando falta espaço, sem empurrar os botões da linha para fora da tabela */
tbody td:first-child {
  white-space: normal;
  min-width: 8.5em;
}

td .descricao {
  margin-left: 6px;
  color: var(--discreto);
}

tr.linha-nova td {
  background: var(--linha-alternada);
  border-bottom-color: var(--verde);
}

td.dica {
  color: var(--discreto);
  font-size: 12px;
}

.etiqueta {
  display: inline-block;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 11px;
  margin: 1px 0 1px 4px;
  white-space: nowrap;
  background: var(--aviso-fundo);
  border: 1px solid var(--aviso-borda);
  color: var(--texto);
}

.acoes-linha {
  white-space: nowrap;
}

.botao-icone {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 2px 6px;
  cursor: pointer;
  color: var(--verde);
}

.botao-icone:hover {
  border-color: var(--linha);
}

/* ✕ armado: vermelho, esperando o segundo clique (mesmo tamanho; a linha não se mexe) */
.botao-icone.excluir.armado {
  background: var(--vermelho);
  border-color: var(--vermelho);
  color: var(--superficie);
  font-weight: 700;
}

.rodape-tabela {
  padding: 8px 12px;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.avisos {
  background: var(--aviso-fundo);
  border: 1px solid var(--aviso-borda);
  border-radius: 8px;
  padding: 10px 14px;
}

.avisos h2 {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 4px;
}

.avisos ul {
  margin: 0;
  padding-left: 18px;
}

.avisos li + li {
  margin-top: 4px;
}

/* ---- Diálogos (editor de períodos, personalizar, abrir) ---- */

.dialogo-fundo {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 10;
}

.dialogo {
  background: var(--superficie);
  color: var(--texto);
  border: 1px solid var(--linha);
  border-radius: 10px;
  width: min(760px, 100%);
  max-height: 90vh;
  overflow: auto;
  padding: 16px 18px;
}

.dialogo > h2 {
  font-size: 16px;
  color: var(--verde);
  margin-bottom: 10px;
}

.dialogo-acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 12px;
}

.lista-simples {
  list-style: none;
  padding: 0;
  margin: 0;
}

.lista-simples li {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--linha);
}

.periodo {
  border: 1px solid var(--linha);
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 8px;
}

.periodo > h3 {
  font-size: 13px;
  margin-bottom: 6px;
}

/* ---- Celular: campos lado a lado empilham; o balão da ajuda vira uma faixa no pé da tela ---- */

@media (max-width: 599px) {
  .grade-2 {
    grid-template-columns: minmax(0, 1fr);
  }

  .balao {
    position: fixed;
    top: auto;
    left: 16px;
    right: 16px;
    bottom: 16px;
    width: auto;
    max-width: none;
    z-index: 20;
  }
}

/* ---- Telas estreitas: as colunas empilham, com o resumo no topo (§9.1) ---- */

@media (max-width: 1023px) {
  .principal {
    grid-template-columns: minmax(0, 1fr);
  }

  .coluna-direita {
    display: contents;
  }

  .resumo {
    order: -1;
  }

  .marca {
    flex-basis: 100%;
  }
}

.rotulo-estatico {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--discreto);
}

.resumo-metodologia {
  margin: 2px 0 0;
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/ui/App.test.tsx`
Esperado: `3 passed (3)`.

- [ ] **Step 6: Verificação completa e build**

Run: `npm run format && npm run verificar && npm run build`
Esperado: `685 passed | 9 skipped (694)` em 24 arquivos; `dist/` gerado (`✓ built`).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json README.md index.html src/main.tsx src/ui
git commit -m "ui: fundação da tela (dependências de teste, estilos, barra, rodapé e avisos dos índices)

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 3: Leitura do que o usuário digita (pt-BR): valores, percentuais, inteiros, meses, datas e número do processo

Módulo puro, sem DOM, usado por todos os campos: devolve o valor no formato do motor ou a frase do erro.

**Files:**
- Create: `src/ui/entrada.ts`
- Test: `src/ui/entrada.test.ts`

**Interfaces:**
- Consumes: `competenciaValida`, `dataValida` (`datas.ts`); `decimal`, `paraTexto`, `textoDecimalValido`, `ZERO` (`decimal.ts`).
- Produces: `type Leitura<T> = { ok: true; valor: T } | { ok: false; erro: string }`; `lerDecimal(texto): Leitura<TextoDecimal>`; `lerValorPositivo`; `lerPercentual`; `lerInteiro(texto, minimo, maximo): Leitura<number>`; `lerCompetenciaTexto("10/2026") → "2026-10"`; `lerData("2026-10-05")`; `formatarCompetenciaParaCampo("2026-10") → "10/2026"`; `formatarMoedaParaCampo("1234.5") → "1.234,50"`; `formatarNumeroParaCampo("33.333") → "33,333"`; `formatarNumeroProcesso("08000004620268120001") → "0800000-46.2026.8.12.0001"` (máscara do CNJ, até 20 dígitos, aceita texto colado com ou sem pontuação); `lerNumeroProcesso(texto): Leitura<string>` (vazio é aceito; senão, 20 dígitos com os dígitos verificadores certos, módulo 97, D17); `formatarDataParaCampo("2026-09-05") → "05/09/2026"`, `mascaraData("05092026") → "05/09/2026"` e `lerDataTexto("05/09/2026") → "2026-09-05"` (a data digitada na célula da tabela, D25). Frases de erro: `Informe um número.`, `Use vírgula para os centavos (ex.: 1.234,56 ou 1234,56).`, `Informe um valor maior que zero.`, `O percentual não pode ser negativo.`, `Informe um número inteiro de 1 a 31.`, `Informe o mês como mm/aaaa (ex.: 10/2026).`, `Informe a data (dia, mês e ano a partir de 1900).`, `Número do processo inválido (confira os dígitos).`, `Informe a data como dd/mm/aaaa (ex.: 05/09/2026).`

- [ ] **Step 1: Escrever os testes**

`src/ui/entrada.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  formatarCompetenciaParaCampo,
  formatarDataParaCampo,
  formatarMoedaParaCampo,
  formatarNumeroParaCampo,
  formatarNumeroProcesso,
  lerCompetenciaTexto,
  lerData,
  lerDataTexto,
  lerDecimal,
  lerInteiro,
  lerNumeroProcesso,
  lerPercentual,
  lerValorPositivo,
  mascaraData,
} from "./entrada.ts";

describe("lerDecimal (entrada em pt-BR, §9.4)", () => {
  it("aceita vírgula nos centavos e ponto só como separador de milhar", () => {
    expect(lerDecimal("1.234,56")).toEqual({ ok: true, valor: "1234.56" });
    expect(lerDecimal("1234,56")).toEqual({ ok: true, valor: "1234.56" });
    expect(lerDecimal("1.234")).toEqual({ ok: true, valor: "1234" });
    expect(lerDecimal("1.234.567,8")).toEqual({ ok: true, valor: "1234567.8" });
    expect(lerDecimal("1234")).toEqual({ ok: true, valor: "1234" });
    expect(lerDecimal("0,3")).toEqual({ ok: true, valor: "0.3" });
    expect(lerDecimal(",5")).toEqual({ ok: true, valor: "0.5" });
    expect(lerDecimal("-1,10")).toEqual({ ok: true, valor: "-1.10" });
  });

  it("ignora R$, % e espaços em volta", () => {
    expect(lerDecimal(" R$ 1.500,00 ")).toEqual({ ok: true, valor: "1500.00" });
    expect(lerDecimal("30 %")).toEqual({ ok: true, valor: "30" });
    expect(lerDecimal("R$ 1,00")).toEqual({ ok: true, valor: "1.00" });
  });

  it("recusa o ponto como separador decimal, para nunca ler 1,50 como 15", () => {
    const erro = "Use vírgula para os centavos (ex.: 1.234,56 ou 1234,56).";
    expect(lerDecimal("1.5")).toEqual({ ok: false, erro });
    expect(lerDecimal("12.34")).toEqual({ ok: false, erro });
    expect(lerDecimal("1.2345")).toEqual({ ok: false, erro });
    expect(lerDecimal("1,2,3")).toEqual({ ok: false, erro });
    expect(lerDecimal("1,")).toEqual({ ok: false, erro });
    expect(lerDecimal("abc")).toEqual({ ok: false, erro });
    expect(lerDecimal("1e3")).toEqual({ ok: false, erro });
    expect(lerDecimal("--1")).toEqual({ ok: false, erro });
  });

  it("vazio pede um número", () => {
    expect(lerDecimal("")).toEqual({ ok: false, erro: "Informe um número." });
    expect(lerDecimal("   ")).toEqual({ ok: false, erro: "Informe um número." });
  });
});

describe("lerValorPositivo, lerPercentual e lerInteiro", () => {
  it("valor em reais precisa ser maior que zero", () => {
    expect(lerValorPositivo("450,00")).toEqual({ ok: true, valor: "450.00" });
    expect(lerValorPositivo("0")).toEqual({ ok: false, erro: "Informe um valor maior que zero." });
    expect(lerValorPositivo("-5")).toEqual({ ok: false, erro: "Informe um valor maior que zero." });
    expect(lerValorPositivo("x")).toEqual({
      ok: false,
      erro: "Use vírgula para os centavos (ex.: 1.234,56 ou 1234,56).",
    });
  });

  it("percentual aceita zero e recusa negativo", () => {
    expect(lerPercentual("0")).toEqual({ ok: true, valor: "0" });
    expect(lerPercentual("10")).toEqual({ ok: true, valor: "10" });
    expect(lerPercentual("33,333")).toEqual({ ok: true, valor: "33.333" });
    expect(lerPercentual("-1")).toEqual({ ok: false, erro: "O percentual não pode ser negativo." });
  });

  it("inteiro dentro da faixa", () => {
    expect(lerInteiro("5", 1, 31)).toEqual({ ok: true, valor: 5 });
    expect(lerInteiro(" 31 ", 1, 31)).toEqual({ ok: true, valor: 31 });
    const erro = { ok: false, erro: "Informe um número inteiro de 1 a 31." };
    expect(lerInteiro("0", 1, 31)).toEqual(erro);
    expect(lerInteiro("32", 1, 31)).toEqual(erro);
    expect(lerInteiro("5,5", 1, 31)).toEqual(erro);
    expect(lerInteiro("", 1, 31)).toEqual(erro);
    expect(lerInteiro("-1", 1, 31)).toEqual(erro);
  });
});

describe("competências e formatação para os campos", () => {
  it("lê mm/aaaa e m/aaaa; recusa mês ou formato inválido", () => {
    expect(lerCompetenciaTexto("10/2026")).toEqual({ ok: true, valor: "2026-10" });
    expect(lerCompetenciaTexto("1/2026")).toEqual({ ok: true, valor: "2026-01" });
    expect(lerCompetenciaTexto(" 08 / 2025 ")).toEqual({ ok: true, valor: "2025-08" });
    const erro = { ok: false, erro: "Informe o mês como mm/aaaa (ex.: 10/2026)." };
    expect(lerCompetenciaTexto("13/2026")).toEqual(erro);
    expect(lerCompetenciaTexto("2026-10")).toEqual(erro);
    expect(lerCompetenciaTexto("10/26")).toEqual(erro);
    expect(lerCompetenciaTexto("10/1899")).toEqual(erro);
    expect(lerCompetenciaTexto("")).toEqual(erro);
  });

  it("lê a data de um campo de data e recusa vazio, 30/02 e anos antes de 1900", () => {
    expect(lerData("2026-10-05")).toEqual({ ok: true, valor: "2026-10-05" });
    const erro = { ok: false, erro: "Informe a data (dia, mês e ano a partir de 1900)." };
    expect(lerData("")).toEqual(erro);
    expect(lerData("2026-02-30")).toEqual(erro);
    expect(lerData("1899-12-31")).toEqual(erro);
    expect(lerData("05/10/2026")).toEqual(erro);
  });

  it("formata de volta para os campos", () => {
    expect(formatarCompetenciaParaCampo("2026-10")).toBe("10/2026");
    expect(formatarMoedaParaCampo("1234.5")).toBe("1.234,50");
    expect(formatarMoedaParaCampo("1234567")).toBe("1.234.567,00");
    expect(formatarMoedaParaCampo("0.3")).toBe("0,30");
    expect(formatarMoedaParaCampo("-45.1")).toBe("-45,10");
    expect(formatarMoedaParaCampo("")).toBe("");
    expect(formatarNumeroParaCampo("33.333")).toBe("33,333");
    expect(formatarNumeroParaCampo("10")).toBe("10");
  });
});

describe("data digitada na tabela (dd/mm/aaaa, decisão de 13/10/2026)", () => {
  it("a máscara põe as barras; a leitura aceita só datas válidas a partir de 1900", () => {
    expect(formatarDataParaCampo("2026-09-05")).toBe("05/09/2026");
    expect(mascaraData("0")).toBe("0");
    expect(mascaraData("050")).toBe("05/0");
    expect(mascaraData("05092")).toBe("05/09/2");
    expect(mascaraData("050920261")).toBe("05/09/2026");
    expect(mascaraData("05/09/2026")).toBe("05/09/2026");
    expect(lerDataTexto("05/09/2026")).toEqual({ ok: true, valor: "2026-09-05" });
    const erro = { ok: false, erro: "Informe a data como dd/mm/aaaa (ex.: 05/09/2026)." };
    expect(lerDataTexto("31/02/2026")).toEqual(erro);
    expect(lerDataTexto("05/09/202")).toEqual(erro);
    expect(lerDataTexto("31/12/1899")).toEqual(erro);
    expect(lerDataTexto("")).toEqual(erro);
  });
});

describe("número do processo no padrão do CNJ (Resolução CNJ 65/2008)", () => {
  it("a máscara põe hífen e pontos à medida que os números chegam, e aceita texto colado", () => {
    expect(formatarNumeroProcesso("0800000")).toBe("0800000");
    expect(formatarNumeroProcesso("08000004")).toBe("0800000-4");
    expect(formatarNumeroProcesso("080000046")).toBe("0800000-46");
    expect(formatarNumeroProcesso("0800000462026")).toBe("0800000-46.2026");
    expect(formatarNumeroProcesso("08000004620268")).toBe("0800000-46.2026.8");
    expect(formatarNumeroProcesso("0800000462026812")).toBe("0800000-46.2026.8.12");
    expect(formatarNumeroProcesso("08000004620268120001")).toBe("0800000-46.2026.8.12.0001");
    expect(formatarNumeroProcesso("0800000-46.2026.8.12.0001")).toBe("0800000-46.2026.8.12.0001");
    expect(formatarNumeroProcesso("080000046202681200019999")).toBe("0800000-46.2026.8.12.0001");
    expect(formatarNumeroProcesso("abc")).toBe("");
  });

  it("confere os dígitos verificadores; vazio é aceito; incompleto ou com dígito errado é recusado", () => {
    expect(lerNumeroProcesso("0800000-46.2026.8.12.0001")).toEqual({
      ok: true,
      valor: "0800000-46.2026.8.12.0001",
    });
    expect(lerNumeroProcesso("08000004620268120001")).toEqual({
      ok: true,
      valor: "0800000-46.2026.8.12.0001",
    });
    // outro tribunal também passa (o formato e os dígitos são os do CNJ)
    expect(lerNumeroProcesso("0800000-50.2026.8.26.0100").ok).toBe(true);
    expect(lerNumeroProcesso("")).toEqual({ ok: true, valor: "" });
    const erro = { ok: false, erro: "Número do processo inválido (confira os dígitos)." };
    expect(lerNumeroProcesso("0800000-45.2026.8.12.0001")).toEqual(erro);
    expect(lerNumeroProcesso("0800000-46.2026.8.12.001")).toEqual(erro);
    expect(lerNumeroProcesso("processo")).toEqual(erro);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/entrada.test.ts`
Esperado: `Error: Cannot find module './entrada.ts'` (`Test Files 1 failed`, `Tests no tests`).

- [ ] **Step 3: Implementar**

`src/ui/entrada.ts`:

```ts
import { competenciaValida, dataValida } from "../compartilhado/datas.ts";
import { decimal, paraTexto, textoDecimalValido, ZERO } from "../compartilhado/decimal.ts";
import type { Competencia, DataISO, TextoDecimal } from "../compartilhado/tipos.ts";

/**
 * Leitura do que o usuário digita (§9.4: formatação pt-BR, entrada de valores aceita vírgula,
 * validação inline). Cada função devolve o valor no formato do motor ou a frase do erro, que a
 * tela mostra embaixo do campo. Módulo puro, sem DOM.
 */

export type Leitura<T> = { ok: true; valor: T } | { ok: false; erro: string };

const SO_DIGITOS = /^\d+$/;
const COM_MILHARES = /^\d{1,3}(\.\d{3})+$/;
const ERRO_DE_FORMATO: Leitura<never> = {
  ok: false,
  erro: "Use vírgula para os centavos (ex.: 1.234,56 ou 1234,56).",
};

/**
 * Lê um número em pt-BR: "1.234,56", "1234,56", "1.234", "1234", "0,3", ",5", com sinal, e ignora
 * "R$", "%" e espaços. O ponto só vale como separador de milhar (grupos de três dígitos): "1.5" é
 * recusado, para nunca ler R$ 1,50 como R$ 15,00. Devolve o texto decimal com ponto do motor.
 */
export function lerDecimal(texto: string): Leitura<TextoDecimal> {
  const limpo = texto.replace(/R\$|%|\s/g, "");
  if (limpo === "") return { ok: false, erro: "Informe um número." };
  const negativo = limpo.startsWith("-");
  const partes = (negativo ? limpo.slice(1) : limpo).split(",");
  const [inteiro, centavos] = partes;
  if (partes.length > 2 || inteiro === undefined) return ERRO_DE_FORMATO;
  if (centavos !== undefined && !SO_DIGITOS.test(centavos)) return ERRO_DE_FORMATO;
  let parteInteira: string;
  if (SO_DIGITOS.test(inteiro)) parteInteira = inteiro;
  else if (COM_MILHARES.test(inteiro)) parteInteira = inteiro.replaceAll(".", "");
  else if (inteiro === "" && centavos !== undefined) parteInteira = "0";
  else return ERRO_DE_FORMATO;
  const valor = `${negativo ? "-" : ""}${parteInteira}${centavos === undefined ? "" : `.${centavos}`}`;
  return textoDecimalValido(valor) ? { ok: true, valor } : ERRO_DE_FORMATO;
}

/** Valor em reais que precisa ser maior que zero (prestação, pagamento, valor fixado, rendimento). */
export function lerValorPositivo(texto: string): Leitura<TextoDecimal> {
  const leitura = lerDecimal(texto);
  if (!leitura.ok) return leitura;
  if (decimal(leitura.valor).lte(ZERO)) {
    return { ok: false, erro: "Informe um valor maior que zero." };
  }
  return leitura;
}

/** Percentual que não pode ser negativo (multa, honorários, taxa mensal, percentual da base). */
export function lerPercentual(texto: string): Leitura<TextoDecimal> {
  const leitura = lerDecimal(texto);
  if (!leitura.ok) return leitura;
  if (decimal(leitura.valor).lt(ZERO)) {
    return { ok: false, erro: "O percentual não pode ser negativo." };
  }
  return leitura;
}

/** Número inteiro entre `minimo` e `maximo` (dia do mês, meses em atraso). */
export function lerInteiro(texto: string, minimo: number, maximo: number): Leitura<number> {
  const limpo = texto.trim();
  const erro = { ok: false, erro: `Informe um número inteiro de ${minimo} a ${maximo}.` } as const;
  if (!SO_DIGITOS.test(limpo)) return erro;
  const numero = Number(limpo);
  return numero >= minimo && numero <= maximo ? { ok: true, valor: numero } : erro;
}

/** Competência digitada como "mm/aaaa" (também "m/aaaa"), devolvida como "AAAA-MM". */
export function lerCompetenciaTexto(texto: string): Leitura<Competencia> {
  const partes = /^\s*(\d{1,2})\s*\/\s*(\d{4})\s*$/.exec(texto);
  const erro = { ok: false, erro: "Informe o mês como mm/aaaa (ex.: 10/2026)." } as const;
  if (!partes) return erro;
  const competencia = `${partes[2]}-${(partes[1] ?? "").padStart(2, "0")}`;
  return competenciaValida(competencia) ? { ok: true, valor: competencia } : erro;
}

/** "2026-10" → "10/2026", o formato dos campos de competência. */
export function formatarCompetenciaParaCampo(competencia: Competencia): string {
  return `${competencia.slice(5, 7)}/${competencia.slice(0, 4)}`;
}

/** "1234.5" → "1.234,50": como um campo de valor em reais mostra o texto decimal guardado. */
export function formatarMoedaParaCampo(texto: TextoDecimal): string {
  if (!textoDecimalValido(texto)) return texto;
  const [inteiro, centavos] = paraTexto(decimal(texto), 2).split(".");
  const negativo = inteiro?.startsWith("-") ?? false;
  const digitos = (negativo ? inteiro?.slice(1) : inteiro) ?? "0";
  return `${negativo ? "-" : ""}${digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${centavos ?? "00"}`;
}

/** "33.333" → "33,333": como um campo de percentual mostra o texto decimal guardado (sem zeros a mais). */
export function formatarNumeroParaCampo(texto: TextoDecimal): string {
  return texto.replace(".", ",");
}

/** Data de um campo `type="date"` ("AAAA-MM-DD"): vazia ou fora da tabela de datas do motor é erro. */
export function lerData(texto: string): Leitura<DataISO> {
  return dataValida(texto)
    ? { ok: true, valor: texto }
    : { ok: false, erro: "Informe a data (dia, mês e ano a partir de 1900)." };
}

/** "2026-09-05" → "05/09/2026": como a data aparece no campo de texto da tabela. */
export function formatarDataParaCampo(data: DataISO): string {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`;
}

/**
 * Máscara da data digitada na tabela (decisão de 13/10/2026: o campo tem o tamanho do texto, sem
 * o calendário do navegador): só os números, até 8, com as barras no lugar ("05092026" →
 * "05/09/2026"); texto colado com barras também serve.
 */
export function mascaraData(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Data digitada como dd/mm/aaaa (a partir de 1900), devolvida como "AAAA-MM-DD". */
export function lerDataTexto(texto: string): Leitura<DataISO> {
  const partes = /^\s*(\d{2})\/(\d{2})\/(\d{4})\s*$/.exec(texto);
  const data = partes ? `${partes[3]}-${partes[2]}-${partes[1]}` : "";
  return dataValida(data)
    ? { ok: true, valor: data }
    : { ok: false, erro: "Informe a data como dd/mm/aaaa (ex.: 05/09/2026)." };
}

/**
 * Número do processo no padrão do CNJ (Resolução CNJ 65/2008), `NNNNNNN-DD.AAAA.J.TR.OOOO`: a
 * máscara põe hífen e pontos enquanto a pessoa digita só os números (até 20); texto colado com ou
 * sem pontuação também serve.
 */
export function formatarNumeroProcesso(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 20);
  const partes: Array<[number, number, string]> = [
    [0, 7, ""],
    [7, 9, "-"],
    [9, 13, "."],
    [13, 14, "."],
    [14, 16, "."],
    [16, 20, "."],
  ];
  let saida = "";
  for (const [inicio, fim, separador] of partes) {
    if (d.length <= inicio) break;
    saida += separador + d.slice(inicio, fim);
  }
  return saida;
}

/** Dígitos verificadores do CNJ (módulo 97, ISO 7064): 98 − (NNNNNNN AAAA J TR OOOO 00 mod 97). */
function digitosVerificadores(d: string): string {
  const base = d.slice(0, 7) + d.slice(9, 20) + "00";
  let resto = 0;
  for (const c of base) resto = (resto * 10 + Number(c)) % 97;
  return String(98 - resto).padStart(2, "0");
}

/**
 * Número do processo digitado: vazio é aceito (cálculo antes do processo); senão, 20 dígitos com
 * os dígitos verificadores certos, devolvidos no formato do CNJ.
 */
export function lerNumeroProcesso(texto: string): Leitura<string> {
  const d = texto.replace(/\D/g, "");
  if (d === "" && texto.trim() === "") return { ok: true, valor: "" };
  if (d.length !== 20 || digitosVerificadores(d) !== d.slice(7, 9)) {
    return { ok: false, erro: "Número do processo inválido (confira os dígitos)." };
  }
  return { ok: true, valor: formatarNumeroProcesso(d) };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/ui/entrada.test.ts`
Esperado: `13 passed (13)`.

- [ ] **Step 5: Verificação completa**

Run: `npm run format && npm run verificar`
Esperado: `698 passed | 9 skipped (707)` em 25 arquivos.

- [ ] **Step 6: Commit**

```bash
git add src/ui/entrada.ts src/ui/entrada.test.ts
git commit -m "ui: leitura de valores em pt-BR (vírgula nos centavos, ponto só de milhar, mm/aaaa) e número do processo do CNJ

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 4: Estado do cálculo: cálculo novo e redutor puro com todas as ações da tela, ligado ao App

O coração da interface, testado sem DOM: um `Estado` (cálculo, tabela congelada, situação dos índices, avisos do lote e da abertura, marca de "tocado") e um redutor `reduzir(estado, acao)` com as ações que as seções seguintes despacham. O App passa a usar `useReducer`, recalcula por `useMemo` e liga "Novo cálculo" (que congela outra tabela).

**Files:**
- Create: `src/ui/estado/calculo.ts`
- Modify (reescrito): `src/ui/App.tsx`
- Test: `src/ui/estado/calculo.test.ts`, `src/ui/App.test.tsx` (reescrito: ganha o teste de "Novo cálculo")

**Interfaces:**
- Consumes: `gerarLotePrestacoes`, `gerarLoteAmortizacoes`, `idLivre` (`src/motor/lote.ts`); `metodologiaPadrao`; `competenciaDe`, `decompor`; `calcular`.
- Produces: `Estado { calculo; tabela; situacao; avisosDoLote; loteRecente: "prestacoes" | "pagamentos" | null; avisosDaAbertura; tocado }`; `Indices { tabela; situacao }`; `MudancasDoLancamento` (campos `data`, `descricao`, `valorInformado`, `rendimento`, `encargos`; `undefined` apaga; a competência não se edita: numa prestação, acompanha o mês do novo vencimento, D23); `Acao` (`novo`, `abrir`, `cabecalho`, `base`, `dataElaboracao`, `acrescimos`, `observacoes`, `metodologia`, `lancarPrestacoes`, `lancarPagamentos`, `incluirLancamento`, `editarLancamento`, `aplicarRendimentoDaquiEmDiante`, `excluirLancamento`; as de edição levam `em` = data-hora de agora); `novoCalculo({ id, agora, hoje, cabecalho? })` (multa e honorários de 10% cada, D26); `estadoInicial(calculo, indices)`; `reduzir(estado, acao)`. Regras: lançamentos sempre em ordem cronológica (data, depois id); toda edição marca `atualizadoEm = em` e `tocado = true`; `editarLancamento` marca `editado = true`; `incluirLancamento` dá o id por `idLivre` (`p-AAAA-MM`, `a-AAAA-MM`), origem `avulso` e, na prestação, a competência do mês do vencimento; os lotes guardam `calculo.lotes.ultimoLote…`, `avisosDoLote` e `loteRecente`; `novo`/`abrir` zeram avisos e `tocado`.

- [ ] **Step 1: Escrever os testes do redutor e o novo teste do App**

`src/ui/estado/calculo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Lancamento } from "../../compartilhado/tipos.ts";
import { descreverSituacao } from "../../indices/congelar.ts";
import { metodologiaPadrao } from "../../metodologias/padrao.ts";
import { tabelaRegimeNovo } from "../../motor/testes/regime-novo.ts";
import { estadoInicial, novoCalculo, reduzir, type Estado } from "./calculo.ts";

const HOJE = "2026-10-11";
const AGORA = "2026-10-11T15:00:00-03:00";
const DEPOIS = "2026-10-11T15:05:00-03:00";

function indices() {
  const tabela = tabelaRegimeNovo();
  return { tabela, situacao: descreverSituacao(tabela, HOJE) };
}

function estadoNovo(): Estado {
  return estadoInicial(novoCalculo({ id: "c-1", agora: AGORA, hoje: HOJE }), indices());
}

describe("novoCalculo", () => {
  it("nasce em branco, com a data de hoje, valor fixo sem reajuste fixado hoje e a metodologia padrão", () => {
    const calculo = novoCalculo({
      id: "c-1",
      agora: AGORA,
      hoje: HOJE,
      cabecalho: { defensor: "Defensor(a) de teste", orgao: "Órgão de teste" },
    });
    expect(calculo).toMatchObject({
      formato: "apura/calculo@1",
      tipo: "alimentos",
      id: "c-1",
      criadoEm: AGORA,
      atualizadoEm: AGORA,
      dataElaboracao: HOJE,
      cabecalho: {
        defensor: "Defensor(a) de teste",
        orgao: "Órgão de teste",
        processo: "",
        exequente: "",
        executado: "",
      },
      base: {
        tipo: "valorFixo",
        valor: "",
        dataFixacao: HOJE,
        indiceReajuste: "nenhum",
        mesReajuste: 10,
      },
      lotes: {},
      lancamentos: [],
      // multa e honorários do art. 523, §1º, do CPC: 10% cada por padrão (decisão de 13/10/2026)
      acrescimos: { multaPercentual: "10", honorariosPercentual: "10" },
      observacoes: "",
    });
    expect(calculo.metodologia).toEqual(metodologiaPadrao());
  });
});

describe("reduzir: campos simples", () => {
  it("altera cabeçalho, base, data de elaboração, acréscimos, observações e metodologia, marcando atualizadoEm", () => {
    const inicial = estadoNovo();
    let estado = reduzir(inicial, {
      tipo: "cabecalho",
      campo: "processo",
      valor: "0800001-11",
      em: DEPOIS,
    });
    expect(estado.calculo.cabecalho.processo).toBe("0800001-11");
    expect(estado.calculo.atualizadoEm).toBe(DEPOIS);
    expect(inicial.tocado).toBe(false);
    expect(estado.tocado).toBe(true);
    estado = reduzir(estado, {
      tipo: "base",
      base: { tipo: "percentualSalarioMinimo", percentual: "30" },
      em: DEPOIS,
    });
    expect(estado.calculo.base).toEqual({ tipo: "percentualSalarioMinimo", percentual: "30" });
    estado = reduzir(estado, { tipo: "dataElaboracao", data: "2026-09-30", em: DEPOIS });
    expect(estado.calculo.dataElaboracao).toBe("2026-09-30");
    estado = reduzir(estado, {
      tipo: "acrescimos",
      campo: "multaPercentual",
      valor: "0",
      em: DEPOIS,
    });
    expect(estado.calculo.acrescimos).toEqual({ multaPercentual: "0", honorariosPercentual: "10" });
    estado = reduzir(estado, { tipo: "observacoes", texto: "Conforme a sentença.", em: DEPOIS });
    expect(estado.calculo.observacoes).toBe("Conforme a sentença.");
    const ajustada = {
      ...metodologiaPadrao(),
      ajustada: true,
      deflacao: "zerarNegativos" as const,
    };
    estado = reduzir(estado, { tipo: "metodologia", metodologia: ajustada, em: DEPOIS });
    expect(estado.calculo.metodologia).toEqual(ajustada);
    // a tabela e a situação dos índices não mudam com edições (§8.2)
    expect(estado.tabela).toBe(inicial.tabela);
    expect(estado.situacao).toBe(inicial.situacao);
    expect(estado.calculo.criadoEm).toBe(AGORA);
  });
});

describe("reduzir: lotes cumulativos e lançamentos", () => {
  it("lança prestações em lote, guarda o lote, ordena por data e acumula sem repetir, com os avisos do lote", () => {
    let estado = reduzir(estadoNovo(), {
      tipo: "lancarPrestacoes",
      lote: { diaVencimento: 5, de: "2026-08", ate: "2026-09" },
      em: DEPOIS,
    });
    expect(estado.calculo.lancamentos.map((l) => l.id)).toEqual(["p-2026-08", "p-2026-09"]);
    expect(estado.calculo.lotes.ultimoLotePrestacoes).toEqual({
      diaVencimento: 5,
      de: "2026-08",
      ate: "2026-09",
    });
    expect(estado.avisosDoLote).toEqual([]);
    estado = reduzir(estado, {
      tipo: "lancarPrestacoes",
      lote: { diaVencimento: 5, de: "2026-06", ate: "2026-08" },
      em: DEPOIS,
    });
    expect(estado.calculo.lancamentos.map((l) => l.id)).toEqual([
      "p-2026-06",
      "p-2026-07",
      "p-2026-08",
      "p-2026-09",
    ]);
    expect(estado.avisosDoLote).toEqual([
      "Meses de vencimento já lançados, não repetidos: ago/2026.",
    ]);
    expect(estado.loteRecente).toBe("prestacoes");
    expect(estado.calculo.lancamentos.every((l) => l.valorInformado === undefined)).toBe(true);
  });

  it("lança pagamentos em lote e guarda o lote", () => {
    const estado = reduzir(estadoNovo(), {
      tipo: "lancarPagamentos",
      lote: { valorMensal: "400.00", diaPagamento: 5, de: "2026-08", ate: "2026-09" },
      em: DEPOIS,
    });
    expect(estado.calculo.lancamentos.map((l) => [l.id, l.valorInformado, l.descricao])).toEqual([
      ["a-2026-08", "400.00", "Pagamento parcial"],
      ["a-2026-09", "400.00", "Pagamento parcial"],
    ]);
    expect(estado.calculo.lotes.ultimoLoteAmortizacoes?.valorMensal).toBe("400.00");
    expect(estado.avisosDoLote).toEqual([]);
    expect(estado.loteRecente).toBe("pagamentos");
  });

  it("inclui avulsos com id livre e origem 'avulso', intercalados na ordem cronológica", () => {
    let estado = reduzir(estadoNovo(), {
      tipo: "lancarPrestacoes",
      lote: { diaVencimento: 5, de: "2026-08", ate: "2026-09" },
      em: DEPOIS,
    });
    estado = reduzir(estado, {
      tipo: "incluirLancamento",
      lancamento: {
        tipo: "prestacao",
        data: "2026-08-20",
        competencia: "2026-08",
        descricao: "13º salário",
        rendimento: "3000.00",
      },
      em: DEPOIS,
    });
    estado = reduzir(estado, {
      tipo: "incluirLancamento",
      lancamento: { tipo: "amortizacao", data: "2026-08-10", valorInformado: "150.00" },
      em: DEPOIS,
    });
    expect(estado.calculo.lancamentos.map((l) => l.id)).toEqual([
      "p-2026-08",
      "a-2026-08",
      "p-2026-08-2",
      "p-2026-09",
    ]);
    const avulsa = estado.calculo.lancamentos.find((l) => l.id === "p-2026-08-2");
    expect(avulsa).toMatchObject({ origem: "avulso", editado: false, descricao: "13º salário" });
  });

  it("editar marca 'editado', apaga campos com undefined, e relançar o lote não sobrescreve a edição", () => {
    let estado = reduzir(estadoNovo(), {
      tipo: "lancarPrestacoes",
      lote: { diaVencimento: 5, de: "2026-08", ate: "2026-09" },
      em: DEPOIS,
    });
    estado = reduzir(estado, {
      tipo: "editarLancamento",
      id: "p-2026-08",
      mudancas: { valorInformado: "999.00", data: "2026-08-07" },
      em: DEPOIS,
    });
    let editada = estado.calculo.lancamentos.find((l) => l.id === "p-2026-08") as Lancamento;
    expect(editada).toMatchObject({ valorInformado: "999.00", data: "2026-08-07", editado: true });
    estado = reduzir(estado, {
      tipo: "lancarPrestacoes",
      lote: { diaVencimento: 5, de: "2026-07", ate: "2026-09" },
      em: DEPOIS,
    });
    editada = estado.calculo.lancamentos.find((l) => l.id === "p-2026-08") as Lancamento;
    expect(editada).toMatchObject({ valorInformado: "999.00", data: "2026-08-07", editado: true });
    expect(estado.avisosDoLote).toEqual([
      "Meses de vencimento já lançados, não repetidos: ago/2026, set/2026.",
    ]);
    estado = reduzir(estado, {
      tipo: "editarLancamento",
      id: "p-2026-08",
      mudancas: { valorInformado: undefined },
      em: DEPOIS,
    });
    editada = estado.calculo.lancamentos.find((l) => l.id === "p-2026-08") as Lancamento;
    expect("valorInformado" in editada).toBe(false);
    expect(editada.editado).toBe(true);
  });

  it("a competência acompanha o vencimento: ao incluir e ao mudar a data de uma prestação (decisão de 13/10/2026)", () => {
    let estado = reduzir(estadoNovo(), {
      tipo: "incluirLancamento",
      lancamento: { tipo: "prestacao", data: "2026-08-25" },
      em: DEPOIS,
    });
    expect(estado.calculo.lancamentos[0]).toMatchObject({
      id: "p-2026-08",
      competencia: "2026-08",
    });
    estado = reduzir(estado, {
      tipo: "editarLancamento",
      id: "p-2026-08",
      mudancas: { data: "2026-09-05" },
      em: DEPOIS,
    });
    expect(estado.calculo.lancamentos[0]).toMatchObject({
      id: "p-2026-08",
      data: "2026-09-05",
      competencia: "2026-09",
      editado: true,
    });
    // o lote passa a considerar setembro ocupado e lança agosto
    estado = reduzir(estado, {
      tipo: "lancarPrestacoes",
      lote: { diaVencimento: 5, de: "2026-08", ate: "2026-09" },
      em: DEPOIS,
    });
    expect(estado.calculo.lancamentos.map((l) => l.competencia)).toEqual(["2026-08", "2026-09"]);
    expect(estado.avisosDoLote).toEqual([
      "Meses de vencimento já lançados, não repetidos: set/2026.",
    ]);
    // pagamento não tem competência
    estado = reduzir(estado, {
      tipo: "incluirLancamento",
      lancamento: { tipo: "amortizacao", data: "2026-09-10", valorInformado: "100.00" },
      em: DEPOIS,
    });
    expect(
      "competencia" in (estado.calculo.lancamentos.find((l) => l.id === "a-2026-09") ?? {}),
    ).toBe(false);
  });

  it("aplica o rendimento daqui em diante só às prestações da data em diante", () => {
    let estado = reduzir(estadoNovo(), {
      tipo: "lancarPrestacoes",
      lote: { diaVencimento: 5, de: "2026-07", ate: "2026-09" },
      em: DEPOIS,
    });
    estado = reduzir(estado, {
      tipo: "lancarPagamentos",
      lote: { valorMensal: "100.00", diaPagamento: 5, de: "2026-08", ate: "2026-08" },
      em: DEPOIS,
    });
    estado = reduzir(estado, {
      tipo: "aplicarRendimentoDaquiEmDiante",
      id: "p-2026-08",
      rendimento: "2500.00",
      em: DEPOIS,
    });
    expect(estado.calculo.lancamentos.map((l) => [l.id, l.rendimento ?? null, l.editado])).toEqual([
      ["p-2026-07", null, false],
      ["a-2026-08", null, false],
      ["p-2026-08", "2500.00", true],
      ["p-2026-09", "2500.00", true],
    ]);
    expect(
      reduzir(estado, {
        tipo: "aplicarRendimentoDaquiEmDiante",
        id: "x",
        rendimento: "1",
        em: DEPOIS,
      }),
    ).toBe(estado);
  });

  it("exclui pelo id", () => {
    let estado = reduzir(estadoNovo(), {
      tipo: "lancarPrestacoes",
      lote: { diaVencimento: 5, de: "2026-08", ate: "2026-09" },
      em: DEPOIS,
    });
    estado = reduzir(estado, { tipo: "excluirLancamento", id: "p-2026-08", em: DEPOIS });
    expect(estado.calculo.lancamentos.map((l) => l.id)).toEqual(["p-2026-09"]);
  });
});

describe("reduzir: novo e abrir", () => {
  it("'novo' troca o cálculo e os índices e limpa os avisos; 'abrir' guarda os avisos da abertura", () => {
    let estado = reduzir(estadoNovo(), {
      tipo: "lancarPrestacoes",
      lote: { diaVencimento: 5, de: "2026-06", ate: "2026-06" },
      em: DEPOIS,
    });
    estado = reduzir(estado, {
      tipo: "lancarPrestacoes",
      lote: { diaVencimento: 5, de: "2026-06", ate: "2026-06" },
      em: DEPOIS,
    });
    expect(estado.avisosDoLote).toHaveLength(2);
    const outros = indices();
    const novo = novoCalculo({ id: "c-2", agora: DEPOIS, hoje: HOJE });
    estado = reduzir(estado, { tipo: "novo", calculo: novo, ...outros });
    expect(estado).toEqual({
      calculo: novo,
      tabela: outros.tabela,
      situacao: outros.situacao,
      avisosDoLote: [],
      loteRecente: null,
      avisosDaAbertura: [],
      tocado: false,
    });
    estado = reduzir(estado, {
      tipo: "abrir",
      calculo: novo,
      ...outros,
      avisos: [
        "IPCA de set/2026 mudou de 0,80% para 0,82% desde a atualização dos índices de 11/10/2026.",
      ],
    });
    expect(estado.avisosDaAbertura).toHaveLength(1);
    expect(estado.avisosDoLote).toEqual([]);
    expect(estado.tocado).toBe(false);
  });
});
```

`src/ui/App.test.tsx` (reescrito; acrescenta o teste "congela a tabela ao abrir e de novo em 'Novo cálculo'…" e troca a asserção da caixa de avisos, que agora existe sempre por causa de "Nenhum lançamento."):

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App.tsx";
import { ambienteDeTeste } from "./testes/ambiente-de-teste.ts";

afterEach(cleanup);

describe("App (fundação da tela)", () => {
  it("mostra o nome do sistema, as quatro ações da barra e o rodapé com a situação dos índices", () => {
    render(<App ambiente={ambienteDeTeste()} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Apura · Sistema de Cálculos Judiciais · DPE-MS",
    );
    for (const nome of ["Novo cálculo", "Abrir", "Salvar"]) {
      expect(screen.getByRole("button", { name: nome })).toBeDefined();
    }
    const relatorio = screen.getByRole("button", { name: "Relatório / PDF" }) as HTMLButtonElement;
    expect(relatorio.disabled).toBe(true);
    const rodape = screen.getByRole("contentinfo").textContent ?? "";
    expect(rodape).toContain(
      "Índices oficiais BCB/SGS · IPCA até set/2026 · atualizados em 11/10/2026 09:00 (horário de Brasília)",
    );
    expect(rodape).toMatch(/Apura v\d+\.\d+\.\d+ · Defensoria Pública de Mato Grosso do Sul/);
    // com a tabela em dia, não há aviso do calendário
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).not.toContain(
      "ainda não chegou ao Apura",
    );
  });

  it("mostra na caixa de avisos os meses já divulgados que ainda não chegaram ao Apura", () => {
    render(<App ambiente={ambienteDeTeste({ limites: { "433": "2026-07" } })} />);
    const avisos = screen.getByRole("region", { name: "Avisos" });
    expect(avisos.textContent).toContain(
      "IPCA de ago/2026, divulgado por volta de 10/09/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
    );
  });

  it("congela a tabela ao abrir e de novo em 'Novo cálculo'; o cálculo em branco mostra 'Nenhum lançamento.'", async () => {
    const ambiente = ambienteDeTeste();
    render(<App ambiente={ambiente} />);
    expect(ambiente.congelamentos()).toBe(1);
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).toContain(
      "Nenhum lançamento.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Novo cálculo" }));
    expect(ambiente.congelamentos()).toBe(2);
  });

  it("abre com a cópia publicada quando nenhum ambiente é injetado (sem rede)", () => {
    render(<App />);
    expect(screen.getByRole("contentinfo").textContent).toContain("Índices oficiais BCB/SGS");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/estado/calculo.test.ts src/ui/App.test.tsx`
Esperado: `calculo.test.ts` falha ao importar (`Cannot find module './calculo.ts'`); em `App.test.tsx`, `2 failed | 2 passed (4)`: "mostra o nome do sistema…" e "congela a tabela ao abrir e de novo em 'Novo cálculo'…", ambos com `Unable to find an accessible element with the role "region" and name "Avisos"` (o App ainda não calcula, então não há aviso "Nenhum lançamento.").

- [ ] **Step 3: Implementar o redutor e ligar ao App**

`src/ui/estado/calculo.ts`:

```ts
import { competenciaDe, decompor } from "../../compartilhado/datas.ts";
import type {
  Base,
  Cabecalho,
  Calculo,
  DataISO,
  Lancamento,
  LoteAmortizacoes,
  LotePrestacoes,
  Metodologia,
  TabelaIndices,
  TextoDecimal,
} from "../../compartilhado/tipos.ts";
import type { SituacaoIndices } from "../../indices/congelar.ts";
import { metodologiaPadrao } from "../../metodologias/padrao.ts";
import { gerarLoteAmortizacoes, gerarLotePrestacoes, idLivre } from "../../motor/lote.ts";

/**
 * Estado da tela e o redutor puro que o altera (§4.3: a tela edita o Cálculo; a cada alteração o
 * motor recalcula). O redutor não lê relógio nem ids: cada ação traz `em` (data-hora de agora, do
 * ambiente) e, quando precisa, o id novo. A tabela congelada e a situação dos índices mudam só em
 * "novo" e "abrir" (§8.2). Os avisos do último "Lançar em lote" e os da abertura de um arquivo
 * ficam no estado para a tela mostrar.
 */

export interface Estado {
  calculo: Calculo;
  tabela: TabelaIndices;
  situacao: SituacaoIndices;
  /** avisos do último "Lançar em lote" (competências puladas, lote vazio) e qual formulário o fez */
  avisosDoLote: string[];
  loteRecente: "prestacoes" | "pagamentos" | null;
  /** avisos da abertura de um arquivo (índices que mudaram, dados que não puderam ser lidos) */
  avisosDaAbertura: string[];
  /** true depois da primeira edição desde "novo" ou "abrir": só então o cálculo vai para os recentes */
  tocado: boolean;
}

export interface Indices {
  tabela: TabelaIndices;
  situacao: SituacaoIndices;
}

/** Campos de um lançamento que a tela edita em "Personalizar"; `undefined` apaga o campo. */
/**
 * A competência não é editável na tela (decisão de 13/10/2026): ela acompanha o mês do
 * vencimento, que é a referência de cada linha, e serve por dentro para o lote não repetir meses.
 */
export type MudancasDoLancamento = Partial<
  Pick<Lancamento, "data" | "descricao" | "valorInformado" | "rendimento" | "encargos">
>;

export type Acao =
  | ({ tipo: "novo"; calculo: Calculo } & Indices)
  | ({ tipo: "abrir"; calculo: Calculo; avisos: string[] } & Indices)
  | { tipo: "cabecalho"; campo: keyof Cabecalho; valor: string; em: string }
  | { tipo: "base"; base: Base; em: string }
  | { tipo: "dataElaboracao"; data: DataISO; em: string }
  | {
      tipo: "acrescimos";
      campo: "multaPercentual" | "honorariosPercentual";
      valor: TextoDecimal;
      em: string;
    }
  | { tipo: "observacoes"; texto: string; em: string }
  | { tipo: "metodologia"; metodologia: Metodologia; em: string }
  | { tipo: "lancarPrestacoes"; lote: LotePrestacoes; em: string }
  | { tipo: "lancarPagamentos"; lote: LoteAmortizacoes; em: string }
  | {
      tipo: "incluirLancamento";
      lancamento: Omit<Lancamento, "id" | "origem" | "editado">;
      em: string;
    }
  | { tipo: "editarLancamento"; id: string; mudancas: MudancasDoLancamento; em: string }
  | { tipo: "aplicarRendimentoDaquiEmDiante"; id: string; rendimento: TextoDecimal; em: string }
  | { tipo: "excluirLancamento"; id: string; em: string };

/**
 * Cálculo novo em branco (§5.2): data de elaboração de hoje, base em valor fixo sem reajuste com a
 * data de fixação de hoje (o único campo da base que o motor exige válido) e o valor a preencher,
 * metodologia padrão, multa e honorários a zero. Defensor e órgão vêm das preferências.
 */
export function novoCalculo(p: {
  id: string;
  agora: string;
  hoje: DataISO;
  cabecalho?: Partial<Cabecalho>;
}): Calculo {
  return {
    formato: "apura/calculo@1",
    tipo: "alimentos",
    id: p.id,
    criadoEm: p.agora,
    atualizadoEm: p.agora,
    dataElaboracao: p.hoje,
    cabecalho: {
      defensor: "",
      orgao: "",
      processo: "",
      exequente: "",
      executado: "",
      ...p.cabecalho,
    },
    base: {
      tipo: "valorFixo",
      valor: "",
      dataFixacao: p.hoje,
      indiceReajuste: "nenhum",
      mesReajuste: decompor(p.hoje).mes,
    },
    lotes: {},
    lancamentos: [],
    metodologia: metodologiaPadrao(),
    acrescimos: { multaPercentual: "10", honorariosPercentual: "10" },
    observacoes: "",
  };
}

export function estadoInicial(calculo: Calculo, indices: Indices): Estado {
  return {
    calculo,
    tabela: indices.tabela,
    situacao: indices.situacao,
    avisosDoLote: [],
    loteRecente: null,
    avisosDaAbertura: [],
    tocado: false,
  };
}

/** Lançamentos em ordem cronológica (data, depois id), a ordem das tabelas e do arquivo. */
function ordenar(lancamentos: Lancamento[]): Lancamento[] {
  return [...lancamentos].sort(
    (a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0) || (a.id < b.id ? -1 : 1),
  );
}

function comLancamentos(estado: Estado, lancamentos: Lancamento[], em: string): Estado {
  return {
    ...estado,
    calculo: { ...estado.calculo, lancamentos: ordenar(lancamentos), atualizadoEm: em },
    tocado: true,
  };
}

function comCalculo(estado: Estado, mudancas: Partial<Calculo>, em: string): Estado {
  return {
    ...estado,
    calculo: { ...estado.calculo, ...mudancas, atualizadoEm: em },
    tocado: true,
  };
}

function aplicarMudancas(lancamento: Lancamento, mudancas: MudancasDoLancamento): Lancamento {
  const novo: Lancamento = { ...lancamento, editado: true };
  for (const chave of Object.keys(mudancas) as Array<keyof MudancasDoLancamento>) {
    const valor = mudancas[chave];
    if (valor === undefined) delete novo[chave];
    else Object.assign(novo, { [chave]: valor });
  }
  if (novo.tipo === "prestacao" && mudancas.data !== undefined) {
    novo.competencia = competenciaDe(mudancas.data);
  }
  return novo;
}

export function reduzir(estado: Estado, acao: Acao): Estado {
  switch (acao.tipo) {
    case "novo":
      return estadoInicial(acao.calculo, acao);
    case "abrir":
      return { ...estadoInicial(acao.calculo, acao), avisosDaAbertura: acao.avisos };
    case "cabecalho":
      return comCalculo(
        estado,
        { cabecalho: { ...estado.calculo.cabecalho, [acao.campo]: acao.valor } },
        acao.em,
      );
    case "base":
      return comCalculo(estado, { base: acao.base }, acao.em);
    case "dataElaboracao":
      return comCalculo(estado, { dataElaboracao: acao.data }, acao.em);
    case "acrescimos":
      return comCalculo(
        estado,
        { acrescimos: { ...estado.calculo.acrescimos, [acao.campo]: acao.valor } },
        acao.em,
      );
    case "observacoes":
      return comCalculo(estado, { observacoes: acao.texto }, acao.em);
    case "metodologia":
      return comCalculo(estado, { metodologia: acao.metodologia }, acao.em);
    case "lancarPrestacoes": {
      const lote = gerarLotePrestacoes(
        acao.lote,
        estado.calculo.dataElaboracao,
        estado.calculo.lancamentos,
      );
      const proximo = comLancamentos(
        estado,
        [...estado.calculo.lancamentos, ...lote.lancamentos],
        acao.em,
      );
      return {
        ...proximo,
        calculo: {
          ...proximo.calculo,
          lotes: { ...proximo.calculo.lotes, ultimoLotePrestacoes: acao.lote },
        },
        avisosDoLote: lote.avisos,
        loteRecente: "prestacoes",
      };
    }
    case "lancarPagamentos": {
      const lote = gerarLoteAmortizacoes(acao.lote, estado.calculo.lancamentos);
      const proximo = comLancamentos(
        estado,
        [...estado.calculo.lancamentos, ...lote.lancamentos],
        acao.em,
      );
      return {
        ...proximo,
        calculo: {
          ...proximo.calculo,
          lotes: { ...proximo.calculo.lotes, ultimoLoteAmortizacoes: acao.lote },
        },
        avisosDoLote: lote.avisos,
        loteRecente: "pagamentos",
      };
    }
    case "incluirLancamento": {
      // a competência de uma prestação é sempre o mês do vencimento (decisão de 13/10/2026)
      const mes = competenciaDe(acao.lancamento.data);
      const prefixo = acao.lancamento.tipo === "prestacao" ? `p-${mes}` : `a-${mes}`;
      const novo: Lancamento = {
        ...acao.lancamento,
        ...(acao.lancamento.tipo === "prestacao" ? { competencia: mes } : {}),
        id: idLivre(prefixo, estado.calculo.lancamentos),
        origem: "avulso",
        editado: false,
      };
      return comLancamentos(estado, [...estado.calculo.lancamentos, novo], acao.em);
    }
    case "editarLancamento":
      return comLancamentos(
        estado,
        estado.calculo.lancamentos.map((l) =>
          l.id === acao.id ? aplicarMudancas(l, acao.mudancas) : l,
        ),
        acao.em,
      );
    case "aplicarRendimentoDaquiEmDiante": {
      const origem = estado.calculo.lancamentos.find((l) => l.id === acao.id);
      if (origem === undefined) return estado;
      return comLancamentos(
        estado,
        estado.calculo.lancamentos.map((l) =>
          l.tipo === "prestacao" && l.data >= origem.data
            ? { ...l, rendimento: acao.rendimento, editado: true }
            : l,
        ),
        acao.em,
      );
    }
    case "excluirLancamento":
      return comLancamentos(
        estado,
        estado.calculo.lancamentos.filter((l) => l.id !== acao.id),
        acao.em,
      );
  }
}
```

`src/ui/App.tsx` (reescrito):

```tsx
import { useMemo, useReducer } from "react";
import { calcular } from "../motor/calcular.ts";
import { ambientePadrao, type Ambiente } from "./ambiente.ts";
import { BarraSuperior } from "./BarraSuperior.tsx";
import { Avisos } from "./componentes/Avisos.tsx";
import { estadoInicial, novoCalculo, reduzir } from "./estado/calculo.ts";
import "./estilos.css";
import { Rodape } from "./Rodape.tsx";

/**
 * Tela única em duas colunas (§9): esquerda, dados do caso e lançamentos em lote; direita,
 * resultado e lançamentos individuais. Recálculo a cada alteração, sem botão "Calcular" (§4.3).
 * O `ambiente` é injetável para os testes de componente.
 */
export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambiente }) {
  // A tabela de índices é congelada quando o app abre (§8.2); "Novo cálculo" congela outra.
  const [estado, despachar] = useReducer(reduzir, undefined, () =>
    estadoInicial(
      novoCalculo({ id: ambiente.novoId(), agora: ambiente.agora(), hoje: ambiente.hoje() }),
      ambiente.congelar(),
    ),
  );
  const resultado = useMemo(
    () => calcular(estado.calculo, estado.tabela),
    [estado.calculo, estado.tabela],
  );
  const novo = () =>
    despachar({
      tipo: "novo",
      calculo: novoCalculo({
        id: ambiente.novoId(),
        agora: ambiente.agora(),
        hoje: ambiente.hoje(),
      }),
      ...ambiente.congelar(),
    });
  return (
    <div className="app">
      <BarraSuperior aoNovo={novo} />
      <main className="principal">
        <div className="coluna-esquerda" />
        <div className="coluna-direita">
          <Avisos avisos={[...estado.situacao.avisos, ...resultado.avisos]} />
        </div>
      </main>
      <Rodape situacaoDosIndices={estado.situacao.rodape} />
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/ui/estado/calculo.test.ts src/ui/App.test.tsx`
Esperado: `14 passed (14)` (10 do redutor e 4 do App).

- [ ] **Step 5: Verificação completa**

Run: `npm run format && npm run verificar`
Esperado: `709 passed | 9 skipped (718)` em 26 arquivos.

- [ ] **Step 6: Commit**

```bash
git add src/ui/estado/calculo.ts src/ui/estado/calculo.test.ts src/ui/App.tsx src/ui/App.test.tsx
git commit -m "ui: estado do cálculo (redutor puro com lotes, avulsos, edição e novo cálculo) ligado ao App

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 5: Campos reutilizáveis com ajuda em balões, seção "1 · Processo" e preferências no navegador (lembrar, esquecer, guardar recentes)

Os componentes de campo com rótulo, ajuda num balão ⓘ (D21) e erro inline, o gancho `useCampoValidado` (liga um campo de texto a um valor validado do estado), o acesso protegido ao armazenamento, as preferências (§5.5) e a primeira seção da esquerda, com o número do processo no padrão do CNJ (D17) e os campos em duas colunas (D18).

**Files:**
- Create: `src/ui/armazenamento.ts`, `src/ui/preferencias.ts`, `src/ui/componentes/Ajuda.tsx`, `src/ui/componentes/Campo.tsx`, `src/ui/secoes/Processo.tsx`
- Modify (reescrito): `src/ui/App.tsx`
- Test: `src/ui/componentes/Ajuda.test.tsx`, `src/ui/preferencias.test.ts`, `src/ui/componentes/Campo.test.tsx`, `src/ui/secoes/Processo.test.tsx`

**Interfaces:**
- Consumes: `Leitura` e as leituras/formatações de `entrada.ts`, inclusive `formatarNumeroProcesso` e `lerNumeroProcesso` (Task 3); `armazenamentoEmMemoria`, `armazenamentoQueFalha`, `ambienteDeTeste` (Task 2); `Acao "cabecalho"` (Task 4).
- Produces: `CHAVE_PREFERENCIAS = "apura.preferencias"`, `CHAVE_RECENTES = "apura.recentes"`, `lerJson`, `gravarJson`, `removerChave` (`armazenamento.ts`); `Preferencias { defensor; orgao; lembrar; guardarRecentes }` (o `tema` entra na Task 13), `PREFERENCIAS_PADRAO`, `lerPreferencias(armazenamento)`, `gravarPreferencias(armazenamento, p): boolean`, `esquecer(armazenamento)` (`preferencias.ts`); `Ajuda({ assunto, children })` (`Ajuda.tsx`: botão "ⓘ" com `aria-label` "Ajuda: <assunto>" e `aria-expanded`; o balão entra numa região `role="status"`, lida pelo leitor de tela ao abrir; Esc, novo clique ou clique ou foco fora fecham; o Esc não fecha o painel em volta); `CampoTexto`, `CampoArea`, `CampoSelecao`, `Opcao`, `useCampoValidado({ valorGuardado, paraTexto, ler, aoValidar })` (`Campo.tsx`; os campos aceitam `ajuda`, que vira o ⓘ ao lado do rótulo, e o `CampoTexto` aceita `mascara`, uma máscara de números que mantém o cursor depois do mesmo dígito e faz o Backspace num separador apagar o dígito antes dele (a lógica fica no gancho `useMascara({ valor, aoMudar, mascara })`, que a célula editável da Task 10 também usa); `aria-describedby` aponta só para o erro); `Processo({ cabecalho, aoMudar, preferencias, aoMudarPreferencias, aoEsquecer, armazenamentoDisponivel })`. Rótulos: "Defensor(a) responsável", "Órgão de atuação", "Lembrar neste navegador", "Esquecer", "Nº do processo" (máscara do CNJ, exemplo `0000000-00.0000.0.00.0000` dentro do campo), "Exequente (alimentando)", "Executado (alimentante)", "Guardar cálculos recentes neste navegador"; balões "Ajuda: Processo", "Ajuda: Nº do processo", "Ajuda: cálculos recentes". Defensor e órgão, e exequente e executado, ficam lado a lado (classe `grade-2`; D18).

- [ ] **Step 1: Escrever os testes**

`src/ui/componentes/Ajuda.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Ajuda } from "./Ajuda.tsx";

afterEach(cleanup);

function Exemplo() {
  return (
    <div>
      <h2>Seção de teste</h2>
      <Ajuda assunto="seção de teste">Texto da ajuda.</Ajuda>
      <button type="button">Outro botão</button>
    </div>
  );
}

describe("Ajuda (toggletip: ajuda sob demanda)", () => {
  it("abre com clique e fecha com novo clique; o conteúdo entra numa região de status", async () => {
    const user = userEvent.setup();
    render(<Exemplo />);
    const botao = screen.getByRole("button", { name: "Ajuda: seção de teste" });
    expect(botao.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Texto da ajuda.")).toBeNull();
    await user.click(botao);
    expect(botao.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("status").textContent).toBe("Texto da ajuda.");
    await user.click(botao);
    expect(screen.queryByText("Texto da ajuda.")).toBeNull();
  });

  it("abre pelo teclado; Esc, clique fora e foco fora fecham", async () => {
    const user = userEvent.setup();
    render(<Exemplo />);
    const botao = screen.getByRole("button", { name: "Ajuda: seção de teste" });
    botao.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByText("Texto da ajuda.")).toBeDefined();
    await user.keyboard("{Escape}");
    expect(screen.queryByText("Texto da ajuda.")).toBeNull();
    expect(document.activeElement).toBe(botao);
    await user.keyboard(" ");
    expect(screen.getByText("Texto da ajuda.")).toBeDefined();
    await user.click(screen.getByRole("heading", { name: "Seção de teste" }));
    expect(screen.queryByText("Texto da ajuda.")).toBeNull();
    await user.click(botao);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Outro botão" }));
    expect(screen.queryByText("Texto da ajuda.")).toBeNull();
  });
});
```

`src/ui/preferencias.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CHAVE_PREFERENCIAS, CHAVE_RECENTES } from "./armazenamento.ts";
import {
  esquecer,
  gravarPreferencias,
  lerPreferencias,
  PREFERENCIAS_PADRAO,
} from "./preferencias.ts";
import { armazenamentoEmMemoria, armazenamentoQueFalha } from "./testes/ambiente-de-teste.ts";

describe("preferências no navegador (§5.5)", () => {
  it("sem nada gravado, valem os padrões: lembrar e guardar recentes ligados, nomes vazios", () => {
    expect(lerPreferencias(armazenamentoEmMemoria())).toEqual(PREFERENCIAS_PADRAO);
    expect(lerPreferencias(null)).toEqual(PREFERENCIAS_PADRAO);
  });

  it("grava e lê de volta; com 'lembrar' desligado, grava os nomes vazios mas mantém as duas opções", () => {
    const armazenamento = armazenamentoEmMemoria();
    const p = {
      defensor: "Defensor(a) de teste",
      orgao: "Órgão de teste",
      lembrar: true,
      guardarRecentes: false,
    };
    expect(gravarPreferencias(armazenamento, p)).toBe(true);
    expect(lerPreferencias(armazenamento)).toEqual(p);
    expect(gravarPreferencias(armazenamento, { ...p, lembrar: false })).toBe(true);
    expect(JSON.parse(armazenamento.getItem(CHAVE_PREFERENCIAS) ?? "")).toEqual({
      defensor: "",
      orgao: "",
      lembrar: false,
      guardarRecentes: false,
    });
    expect(lerPreferencias(armazenamento)).toEqual({
      defensor: "",
      orgao: "",
      lembrar: false,
      guardarRecentes: false,
    });
  });

  it("conteúdo corrompido ou de outro formato volta aos padrões campo a campo", () => {
    expect(lerPreferencias(armazenamentoEmMemoria({ [CHAVE_PREFERENCIAS]: "{nada" }))).toEqual(
      PREFERENCIAS_PADRAO,
    );
    expect(lerPreferencias(armazenamentoEmMemoria({ [CHAVE_PREFERENCIAS]: "[1,2]" }))).toEqual(
      PREFERENCIAS_PADRAO,
    );
    const parcial = armazenamentoEmMemoria({
      [CHAVE_PREFERENCIAS]: JSON.stringify({ defensor: 7, orgao: "Órgão", guardarRecentes: "sim" }),
    });
    expect(lerPreferencias(parcial)).toEqual({
      defensor: "",
      orgao: "Órgão",
      lembrar: true,
      guardarRecentes: true,
    });
  });

  it("armazenamento bloqueado: ler devolve os padrões, gravar devolve false, esquecer não lança", () => {
    const bloqueado = armazenamentoQueFalha();
    expect(lerPreferencias(bloqueado)).toEqual(PREFERENCIAS_PADRAO);
    expect(gravarPreferencias(bloqueado, PREFERENCIAS_PADRAO)).toBe(false);
    expect(() => esquecer(bloqueado)).not.toThrow();
    expect(gravarPreferencias(null, PREFERENCIAS_PADRAO)).toBe(false);
  });

  it("esquecer apaga preferências e recentes e deixa o resto do armazenamento em paz", () => {
    const armazenamento = armazenamentoEmMemoria({
      [CHAVE_PREFERENCIAS]: "{}",
      [CHAVE_RECENTES]: "[]",
      "outra.chave": "fica",
    });
    esquecer(armazenamento);
    expect(armazenamento.getItem(CHAVE_PREFERENCIAS)).toBeNull();
    expect(armazenamento.getItem(CHAVE_RECENTES)).toBeNull();
    expect(armazenamento.getItem("outra.chave")).toBe("fica");
  });
});
```

`src/ui/componentes/Campo.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { formatarMoedaParaCampo, lerValorPositivo } from "../entrada.ts";
import { CampoTexto, useCampoValidado } from "./Campo.tsx";

afterEach(cleanup);

/** Um valor em reais guardado no "estado" (texto decimal) e um botão que o muda por fora. */
function Exemplo() {
  const [valor, setValor] = useState("100.00");
  const campo = useCampoValidado({
    valorGuardado: valor,
    paraTexto: formatarMoedaParaCampo,
    ler: lerValorPositivo,
    aoValidar: setValor,
  });
  return (
    <div>
      <CampoTexto
        id="valor"
        rotulo="Valor"
        valor={campo.texto}
        aoMudar={campo.aoMudar}
        aoSair={campo.aoSair}
        erro={campo.erro}
        ajuda="Use vírgula para os centavos."
      />
      <output data-testid="estado">{valor}</output>
      <button type="button" onClick={() => setValor("2500.00")}>
        Mudar por fora
      </button>
    </div>
  );
}

describe("useCampoValidado + CampoTexto (validação inline, §9.4)", () => {
  it("mostra o valor formatado; só o que é válido vai para o estado; o erro aparece e some", async () => {
    const user = userEvent.setup();
    render(<Exemplo />);
    const campo = screen.getByLabelText("Valor") as HTMLInputElement;
    expect(campo.value).toBe("100,00");
    // sem erro, o campo não aponta para descrição alguma; a ajuda fica no botão ⓘ ao lado do rótulo
    expect(campo.getAttribute("aria-describedby")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Ajuda: Valor" }));
    expect(screen.getByText("Use vírgula para os centavos.")).toBeDefined();
    await user.clear(campo);
    await user.type(campo, "1.5");
    expect(screen.getByRole("alert").textContent).toBe(
      "Use vírgula para os centavos (ex.: 1.234,56 ou 1234,56).",
    );
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect(campo.getAttribute("aria-describedby")).toBe("valor-erro");
    // o estado guarda o último valor válido digitado ("1", antes do ponto), nunca o inválido
    expect(screen.getByTestId("estado").textContent).toBe("1");
    await user.clear(campo);
    await user.type(campo, "1.234,5");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByTestId("estado").textContent).toBe("1234.5");
    // ao sair do campo, o texto é reformatado
    fireEvent.blur(campo);
    expect(campo.value).toBe("1.234,50");
  });

  it("uma mudança vinda de fora atualiza o campo e limpa o erro", async () => {
    const user = userEvent.setup();
    render(<Exemplo />);
    const campo = screen.getByLabelText("Valor") as HTMLInputElement;
    await user.clear(campo);
    await user.type(campo, "x");
    expect(screen.getByRole("alert")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Mudar por fora" }));
    expect(campo.value).toBe("2.500,00");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
```

`src/ui/secoes/Processo.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../App.tsx";
import { CHAVE_PREFERENCIAS, CHAVE_RECENTES } from "../armazenamento.ts";
import {
  ambienteDeTeste,
  armazenamentoEmMemoria,
  armazenamentoQueFalha,
} from "../testes/ambiente-de-teste.ts";

afterEach(cleanup);

function preferenciasGravadas(armazenamento: Storage): unknown {
  return JSON.parse(armazenamento.getItem(CHAVE_PREFERENCIAS) ?? "null");
}

describe("1 · Processo: número do processo no padrão do CNJ (decisão de 13/10/2026)", () => {
  it("a máscara põe hífen e pontos ao digitar; dígito verificador errado ou número incompleto mostram erro; vazio é aceito", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    const campo = screen.getByLabelText("Nº do processo") as HTMLInputElement;
    await user.type(campo, "080000046202681200");
    expect(campo.value).toBe("0800000-46.2026.8.12.00");
    expect(screen.getByRole("alert").textContent).toBe(
      "Número do processo inválido (confira os dígitos).",
    );
    await user.type(campo, "01");
    expect(campo.value).toBe("0800000-46.2026.8.12.0001");
    expect(screen.queryByRole("alert")).toBeNull();
    // colado com pontuação e dígito verificador errado: erro
    await user.tripleClick(campo);
    await user.paste("0800000-45.2026.8.12.0001");
    expect(campo.value).toBe("0800000-45.2026.8.12.0001");
    expect(screen.getByRole("alert").textContent).toBe(
      "Número do processo inválido (confira os dígitos).",
    );
    // colado com texto antes (do PDF): só os números contam
    await user.tripleClick(campo);
    await user.paste("Processo nº 0800000-46.2026.8.12.0001");
    expect(campo.value).toBe("0800000-46.2026.8.12.0001");
    expect(screen.queryByRole("alert")).toBeNull();
    // Backspace logo depois do hífen apaga o dígito antes dele, e o cursor fica no lugar
    campo.setSelectionRange(8, 8);
    await user.keyboard("{Backspace}");
    expect(campo.value).toBe("0800004-62.0268.1.20.001");
    expect(campo.selectionStart).toBe(6);
    // apagar tudo é aceito (cálculo antes de existir processo)
    await user.clear(campo);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("as explicações ficam nos balões ⓘ, não em texto fixo", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    expect(screen.queryByText(/não são gravados em servidor algum/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Ajuda: Processo" }));
    expect(screen.getByText(/não são gravados em servidor algum/)).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Ajuda: cálculos recentes" }));
    expect(screen.getByText(/Em computador compartilhado, desligue/)).toBeDefined();
    expect(screen.queryByText(/não são gravados em servidor algum/)).toBeNull();
  });
});

describe("1 · Processo: preferências e recentes no navegador (§5.5)", () => {
  it("lembra defensor(a) e órgão enquanto digita e os preenche no próximo cálculo", async () => {
    const user = userEvent.setup();
    const ambiente = ambienteDeTeste();
    render(<App ambiente={ambiente} />);
    await user.type(screen.getByLabelText("Defensor(a) responsável"), "Defensor(a) de teste");
    await user.type(screen.getByLabelText("Órgão de atuação"), "1ª Defensoria de teste");
    expect(preferenciasGravadas(ambiente.armazenado as Storage)).toEqual({
      defensor: "Defensor(a) de teste",
      orgao: "1ª Defensoria de teste",
      lembrar: true,
      guardarRecentes: true,
    });
    await user.type(screen.getByLabelText("Nº do processo"), "08000004620268120001");
    await user.click(screen.getByRole("button", { name: "Novo cálculo" }));
    expect((screen.getByLabelText("Defensor(a) responsável") as HTMLInputElement).value).toBe(
      "Defensor(a) de teste",
    );
    expect((screen.getByLabelText("Órgão de atuação") as HTMLInputElement).value).toBe(
      "1ª Defensoria de teste",
    );
    expect((screen.getByLabelText("Nº do processo") as HTMLInputElement).value).toBe("");
  });

  it("abre com os nomes gravados antes; desligar 'Lembrar' apaga os nomes gravados e para de gravar", async () => {
    const user = userEvent.setup();
    const armazenamento = armazenamentoEmMemoria({
      [CHAVE_PREFERENCIAS]: JSON.stringify({
        defensor: "Quem ficou gravado",
        orgao: "Órgão gravado",
        lembrar: true,
        guardarRecentes: true,
      }),
    });
    render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
    const defensor = screen.getByLabelText("Defensor(a) responsável") as HTMLInputElement;
    expect(defensor.value).toBe("Quem ficou gravado");
    await user.click(screen.getByLabelText("Lembrar neste navegador"));
    expect(preferenciasGravadas(armazenamento)).toEqual({
      defensor: "",
      orgao: "",
      lembrar: false,
      guardarRecentes: true,
    });
    await user.type(defensor, " e mais");
    expect(defensor.value).toBe("Quem ficou gravado e mais");
    expect((preferenciasGravadas(armazenamento) as { defensor: string }).defensor).toBe("");
  });

  it("'Esquecer' apaga preferências e recentes, desliga 'Lembrar' e mantém o cálculo na tela", async () => {
    const user = userEvent.setup();
    const armazenamento = armazenamentoEmMemoria({ [CHAVE_RECENTES]: "[]" });
    render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
    const defensor = screen.getByLabelText("Defensor(a) responsável") as HTMLInputElement;
    await user.type(defensor, "Alguém");
    await user.click(screen.getByRole("button", { name: "Esquecer" }));
    expect(armazenamento.getItem(CHAVE_RECENTES)).toBeNull();
    expect(preferenciasGravadas(armazenamento)).toEqual({
      defensor: "",
      orgao: "",
      lembrar: false,
      guardarRecentes: true,
    });
    expect((screen.getByLabelText("Lembrar neste navegador") as HTMLInputElement).checked).toBe(
      false,
    );
    expect(defensor.value).toBe("Alguém");
  });

  it("desligar 'Guardar cálculos recentes' apaga os recentes já guardados", async () => {
    const user = userEvent.setup();
    const armazenamento = armazenamentoEmMemoria({ [CHAVE_RECENTES]: "[]" });
    render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
    await user.click(screen.getByLabelText("Guardar cálculos recentes neste navegador"));
    expect(armazenamento.getItem(CHAVE_RECENTES)).toBeNull();
    expect(
      (preferenciasGravadas(armazenamento) as { guardarRecentes: boolean }).guardarRecentes,
    ).toBe(false);
  });

  it("sem armazenamento (bloqueado ou ausente), a tela funciona e avisa que nada é guardado", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste({ armazenamento: null })} />);
    expect(screen.getByText(/Este navegador não permite guardar nada/).textContent).toContain(
      "não permite guardar nada",
    );
    await user.type(screen.getByLabelText("Defensor(a) responsável"), "Ninguém");
    await user.click(screen.getByRole("button", { name: "Esquecer" }));
    cleanup();
    render(<App ambiente={ambienteDeTeste({ armazenamento: armazenamentoQueFalha() })} />);
    await user.type(screen.getByLabelText("Órgão de atuação"), "Órgão");
    expect((screen.getByLabelText("Órgão de atuação") as HTMLInputElement).value).toBe("Órgão");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/componentes/Ajuda.test.tsx src/ui/preferencias.test.ts src/ui/componentes/Campo.test.tsx src/ui/secoes/Processo.test.tsx`
Esperado: os quatro arquivos falham ao importar (`Failed to resolve import "./Ajuda.tsx"`, `Cannot find module './armazenamento.ts'`, `Failed to resolve import "./Campo.tsx"`, `Failed to resolve import "../armazenamento.ts"`); `Tests no tests`.

- [ ] **Step 3: Implementar**

`src/ui/armazenamento.ts`:

```ts
/**
 * Acesso protegido ao armazenamento do navegador (§5.5): só duas chaves, preferências e cálculos
 * recentes; toda leitura e gravação fica dentro de try/catch, porque o `localStorage` pode
 * faltar, estar bloqueado (janela anônima com bloqueio, política do navegador) ou lotado. Nada
 * é transmitido: o armazenamento é local ao navegador.
 */

/** Também lida por um script do `index.html`, que aplica o tema fixado antes do CSS. */
export const CHAVE_PREFERENCIAS = "apura.preferencias";
export const CHAVE_RECENTES = "apura.recentes";

/** O JSON gravado na chave, já convertido; nulo se não há, se está corrompido ou se a leitura falha. */
export function lerJson(armazenamento: Storage | null, chave: string): unknown {
  try {
    const texto = armazenamento?.getItem(chave);
    return texto === null || texto === undefined ? null : JSON.parse(texto);
  } catch {
    return null;
  }
}

/** Grava o valor como JSON; devolve false quando não foi possível (sem armazenamento, bloqueado, cheio). */
export function gravarJson(armazenamento: Storage | null, chave: string, valor: unknown): boolean {
  try {
    if (armazenamento === null) return false;
    armazenamento.setItem(chave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

export function removerChave(armazenamento: Storage | null, chave: string): void {
  try {
    armazenamento?.removeItem(chave);
  } catch {
    // sem armazenamento não há o que remover
  }
}
```

`src/ui/preferencias.ts`:

```ts
import {
  CHAVE_PREFERENCIAS,
  CHAVE_RECENTES,
  gravarJson,
  lerJson,
  removerChave,
} from "./armazenamento.ts";

/**
 * Preferências do usuário neste navegador (§5.5): defensor(a) e órgão, com "Lembrar neste
 * navegador" (ligado por padrão), e a opção "Guardar cálculos recentes neste navegador" (ligada
 * por padrão; para desligar em computador compartilhado). "Esquecer" apaga preferências e
 * recentes. Nada é transmitido.
 */
export interface Preferencias {
  defensor: string;
  orgao: string;
  lembrar: boolean;
  guardarRecentes: boolean;
}

export const PREFERENCIAS_PADRAO: Preferencias = {
  defensor: "",
  orgao: "",
  lembrar: true,
  guardarRecentes: true,
};

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

function booleano(valor: unknown, padrao: boolean): boolean {
  return typeof valor === "boolean" ? valor : padrao;
}

/** As preferências gravadas, campo a campo conferido; o padrão para o que falta ou está estranho. */
export function lerPreferencias(armazenamento: Storage | null): Preferencias {
  const lido = lerJson(armazenamento, CHAVE_PREFERENCIAS);
  if (typeof lido !== "object" || lido === null) return { ...PREFERENCIAS_PADRAO };
  const dados = lido as Record<string, unknown>;
  const lembrar = booleano(dados.lembrar, PREFERENCIAS_PADRAO.lembrar);
  return {
    defensor: lembrar ? texto(dados.defensor) : "",
    orgao: lembrar ? texto(dados.orgao) : "",
    lembrar,
    guardarRecentes: booleano(dados.guardarRecentes, PREFERENCIAS_PADRAO.guardarRecentes),
  };
}

/**
 * Grava as preferências. Com "Lembrar" desligado, defensor e órgão são gravados vazios (as duas
 * opções continuam gravadas, para valerem na próxima visita). Devolve false se não deu para gravar.
 */
export function gravarPreferencias(armazenamento: Storage | null, p: Preferencias): boolean {
  const gravadas: Preferencias = p.lembrar ? p : { ...p, defensor: "", orgao: "" };
  return gravarJson(armazenamento, CHAVE_PREFERENCIAS, gravadas);
}

/** "Esquecer": apaga preferências e cálculos recentes deste navegador. */
export function esquecer(armazenamento: Storage | null): void {
  removerChave(armazenamento, CHAVE_PREFERENCIAS);
  removerChave(armazenamento, CHAVE_RECENTES);
}
```

`src/ui/componentes/Ajuda.tsx`:

```tsx
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/**
 * Ajuda sob demanda (decisão de 13/10/2026, no lugar dos textos sempre visíveis da §9.4): o
 * "toggletip" das boas práticas de acessibilidade. Um botão ⓘ ao lado do título ou do campo abre
 * um balão curto com clique, toque, Enter ou Espaço; Esc, um novo clique ou qualquer clique ou
 * foco fora o fecham. O conteúdo entra numa região `role="status"`, para o leitor de tela ler o
 * balão quando ele abre. Funciona sem mouse (o balão que só aparece ao passar o mouse não serve
 * no celular nem para quem usa teclado).
 */
export function Ajuda({ assunto, children }: { assunto: string; children: ReactNode }) {
  const [aberta, setAberta] = useState(false);
  const raiz = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!aberta) return;
    const fora = (evento: Event) => {
      if (evento.target instanceof Node && raiz.current?.contains(evento.target)) return;
      setAberta(false);
    };
    document.addEventListener("pointerdown", fora, true);
    document.addEventListener("focusin", fora);
    return () => {
      document.removeEventListener("pointerdown", fora, true);
      document.removeEventListener("focusin", fora);
    };
  }, [aberta]);
  const tecla = (evento: KeyboardEvent<HTMLSpanElement>) => {
    if (evento.key === "Escape" && aberta) {
      // não fecha o painel em volta (Dialogo), só o balão
      evento.stopPropagation();
      setAberta(false);
    }
  };
  return (
    <span className="ajuda-balao" ref={raiz} onKeyDown={tecla}>
      <button
        type="button"
        className="botao-ajuda"
        aria-expanded={aberta}
        aria-label={`Ajuda: ${assunto}`}
        onClick={() => setAberta(!aberta)}
      >
        ⓘ
      </button>
      <span role="status">{aberta ? <span className="balao">{children}</span> : null}</span>
    </span>
  );
}
```

`src/ui/componentes/Campo.tsx`:

```tsx
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type RefObject,
} from "react";
import type { Leitura } from "../entrada.ts";
import { Ajuda } from "./Ajuda.tsx";

/**
 * Campos de formulário com rótulo associado, ajuda sob demanda (botão ⓘ ao lado do rótulo, que
 * abre um balão; decisão de 13/10/2026) e erro inline (§9.4): nada de janelas pop-up.
 * `useCampoValidado` liga um campo de texto a um valor do estado: o que o usuário digita fica no
 * campo; só o que passa na leitura vai para o estado, e o erro aparece embaixo até ser corrigido
 * (o estado guarda o último valor válido). `useMascara` formata números enquanto se digita.
 */

interface PropriedadesComuns {
  id?: string;
  rotulo: string;
  ajuda?: ReactNode;
  erro?: string | null;
  /** classe extra do invólucro: "curto", "medio", "largo" */
  classe?: string;
}

function Envoltorio({
  id,
  rotulo,
  ajuda,
  erro,
  classe,
  children,
}: PropriedadesComuns & { children: ReactNode }) {
  return (
    <div className={`campo${classe ? ` ${classe}` : ""}`}>
      <span className="rotulo-do-campo">
        <label htmlFor={id}>{rotulo}</label>
        {ajuda ? <Ajuda assunto={rotulo}>{ajuda}</Ajuda> : null}
      </span>
      {children}
      {erro ? (
        <p className="erro" id={`${id}-erro`} role="alert">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

function descritoPor(id: string, erro?: string | null): string | undefined {
  return erro ? `${id}-erro` : undefined;
}

/**
 * Liga um `<input>` de texto a uma máscara de números (nº do processo, data dd/mm/aaaa). Sem
 * máscara, só repassa o texto. Com máscara, o texto digitado é formatado a cada tecla; o cursor
 * fica depois do mesmo dígito em que estava (editar no meio não o joga para o fim), e Backspace
 * logo depois de um separador (hífen, ponto, barra) apaga também o dígito antes dele.
 */
export function useMascara(opcoes: {
  valor: string;
  aoMudar: (texto: string) => void;
  mascara?: ((texto: string) => string) | undefined;
}): {
  ref: RefObject<HTMLInputElement | null>;
  onChange: (evento: ChangeEvent<HTMLInputElement>) => void;
} {
  const { valor, aoMudar, mascara } = opcoes;
  const ref = useRef<HTMLInputElement>(null);
  const cursor = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (cursor.current !== null && document.activeElement === ref.current) {
      ref.current?.setSelectionRange(cursor.current, cursor.current);
    }
    cursor.current = null;
  });
  const onChange = (evento: ChangeEvent<HTMLInputElement>) => {
    if (mascara === undefined) {
      aoMudar(evento.target.value);
      return;
    }
    let texto = evento.target.value;
    let posicao = evento.target.selectionStart ?? texto.length;
    const apagouSeparador =
      (evento.nativeEvent as InputEvent).inputType === "deleteContentBackward" &&
      texto.length === valor.length - 1 &&
      soDigitos(texto) === soDigitos(valor);
    if (apagouSeparador && posicao > 0) {
      texto = texto.slice(0, posicao - 1) + texto.slice(posicao);
      posicao -= 1;
    }
    const digitosAntes = soDigitos(texto.slice(0, posicao)).length;
    const formatado = mascara(texto);
    cursor.current = posicaoDepoisDosDigitos(formatado, digitosAntes);
    aoMudar(formatado);
  };
  return { ref, onChange };
}

const soDigitos = (texto: string) => texto.replace(/\D/g, "");

/** Posição logo depois do n-ésimo dígito do texto (0 = início). */
function posicaoDepoisDosDigitos(texto: string, n: number): number {
  if (n === 0) return 0;
  let vistos = 0;
  for (let i = 0; i < texto.length; i++) {
    if (/\d/.test(texto.charAt(i)) && ++vistos === n) return i + 1;
  }
  return texto.length;
}

export function CampoTexto({
  id: idDado,
  rotulo,
  valor,
  aoMudar,
  aoSair,
  tipo = "text",
  ajuda,
  erro,
  classe,
  mascara,
  ...resto
}: PropriedadesComuns & {
  valor: string;
  aoMudar: (texto: string) => void;
  aoSair?: () => void;
  tipo?: "text" | "date" | "number";
  min?: string;
  max?: string;
  inputMode?: "decimal" | "numeric" | "text";
  autoComplete?: string;
  placeholder?: string;
  disabled?: boolean;
  /**
   * máscara de números (ex.: nº do processo): recebe o texto digitado e devolve o formatado. O
   * cursor fica depois do mesmo dígito em que estava, e apagar um separador (hífen, ponto) com
   * Backspace apaga também o dígito antes dele
   */
  mascara?: (texto: string) => string;
}) {
  const idGerado = useId();
  const id = idDado ?? idGerado;
  const { ref: campo, onChange: mudar } = useMascara({ valor, aoMudar, mascara });
  return (
    <Envoltorio id={id} rotulo={rotulo} ajuda={ajuda} erro={erro} classe={classe}>
      <input
        id={id}
        ref={campo}
        type={tipo}
        value={valor}
        onChange={mudar}
        onBlur={aoSair}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritoPor(id, erro)}
        {...resto}
      />
    </Envoltorio>
  );
}

export function CampoArea({
  id: idDado,
  rotulo,
  valor,
  aoMudar,
  ajuda,
  erro,
  classe,
  linhas = 3,
}: PropriedadesComuns & { valor: string; aoMudar: (texto: string) => void; linhas?: number }) {
  const idGerado = useId();
  const id = idDado ?? idGerado;
  return (
    <Envoltorio id={id} rotulo={rotulo} ajuda={ajuda} erro={erro} classe={classe}>
      <textarea
        id={id}
        value={valor}
        rows={linhas}
        onChange={(e) => aoMudar(e.target.value)}
        aria-describedby={descritoPor(id, erro)}
      />
    </Envoltorio>
  );
}

export function CampoSelecao<T extends string>({
  id: idDado,
  rotulo,
  valor,
  opcoes,
  aoMudar,
  ajuda,
  erro,
  classe,
  disabled,
}: PropriedadesComuns & {
  valor: T;
  opcoes: ReadonlyArray<{ valor: T; rotulo: string }>;
  aoMudar: (valor: T) => void;
  disabled?: boolean;
}) {
  const idGerado = useId();
  const id = idDado ?? idGerado;
  return (
    <Envoltorio id={id} rotulo={rotulo} ajuda={ajuda} erro={erro} classe={classe}>
      <select
        id={id}
        value={valor}
        disabled={disabled}
        onChange={(e) => aoMudar(e.target.value as T)}
        aria-describedby={descritoPor(id, erro)}
      >
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
    </Envoltorio>
  );
}

export function Opcao({
  rotulo,
  marcado,
  aoMudar,
  tipo = "checkbox",
  nome,
}: {
  rotulo: string;
  marcado: boolean;
  aoMudar: (marcado: boolean) => void;
  tipo?: "checkbox" | "radio";
  nome?: string;
}) {
  return (
    <label>
      <input
        type={tipo}
        name={nome}
        checked={marcado}
        onChange={(e) => aoMudar(e.target.checked)}
      />
      {rotulo}
    </label>
  );
}

/**
 * Liga um campo de texto a um valor validado do estado. `valorGuardado` é o valor atual do
 * estado; `paraTexto` o mostra no campo; `ler` interpreta o que foi digitado; `aoValidar` recebe
 * só valores válidos. Quando o estado muda por fora (novo cálculo, arquivo aberto, sugestão de
 * outro formulário), o campo acompanha; enquanto o usuário digita, o texto é dele.
 */
export function useCampoValidado<T>(opcoes: {
  valorGuardado: T;
  paraTexto: (valor: T) => string;
  ler: (texto: string) => Leitura<T>;
  aoValidar: (valor: T) => void;
}): { texto: string; erro: string | null; aoMudar: (texto: string) => void; aoSair: () => void } {
  const [texto, setTexto] = useState(() => opcoes.paraTexto(opcoes.valorGuardado));
  const [erro, setErro] = useState<string | null>(null);
  const [visto, setVisto] = useState(opcoes.valorGuardado);
  if (opcoes.valorGuardado !== visto) {
    // mudança vinda de fora (não do que acabamos de validar): o campo acompanha o estado
    setVisto(opcoes.valorGuardado);
    setTexto(opcoes.paraTexto(opcoes.valorGuardado));
    setErro(null);
  }
  return {
    texto,
    erro,
    aoMudar: (novo) => {
      setTexto(novo);
      const leitura = opcoes.ler(novo);
      if (leitura.ok) {
        setErro(null);
        setVisto(leitura.valor);
        opcoes.aoValidar(leitura.valor);
      } else {
        setErro(leitura.erro);
      }
    },
    aoSair: () => {
      if (erro === null) setTexto(opcoes.paraTexto(opcoes.valorGuardado));
    },
  };
}
```

`src/ui/secoes/Processo.tsx`:

```tsx
import type { Cabecalho } from "../../compartilhado/tipos.ts";
import { Ajuda } from "../componentes/Ajuda.tsx";
import { CampoTexto, Opcao, useCampoValidado } from "../componentes/Campo.tsx";
import { formatarNumeroProcesso, lerNumeroProcesso } from "../entrada.ts";
import type { Preferencias } from "../preferencias.ts";

/**
 * Seção "1 · Processo" (§9.2): defensor(a) e órgão lembrados no navegador, nº do processo no
 * padrão do CNJ (máscara e dígitos verificadores) e as partes; opção de guardar cálculos recentes
 * neste navegador. Campos em duas colunas, ocupando a largura da seção (empilham no celular);
 * explicações nos balões ⓘ (decisões de 13/10/2026). Partes e processo não são gravados em
 * servidor algum (§14).
 */
export function Processo({
  cabecalho,
  aoMudar,
  preferencias,
  aoMudarPreferencias,
  aoEsquecer,
  armazenamentoDisponivel,
}: {
  cabecalho: Cabecalho;
  aoMudar: (campo: keyof Cabecalho, valor: string) => void;
  preferencias: Preferencias;
  aoMudarPreferencias: (mudancas: Partial<Preferencias>) => void;
  aoEsquecer: () => void;
  armazenamentoDisponivel: boolean;
}) {
  const processo = useCampoValidado({
    valorGuardado: cabecalho.processo,
    paraTexto: (texto) => texto,
    ler: lerNumeroProcesso,
    aoValidar: (valor) => aoMudar("processo", valor),
  });
  return (
    <section className="secao" aria-labelledby="titulo-processo">
      <div className="titulo-secao">
        <h2 id="titulo-processo">1 · Processo</h2>
        <Ajuda assunto="Processo">
          Partes e processo não são gravados em servidor algum: vão só para o relatório e para o
          arquivo que você salvar. Defensor(a) e órgão ficam guardados só neste navegador, para o
          próximo cálculo; "Esquecer" apaga o que está guardado (nomes e cálculos recentes) e
          desliga o "Lembrar".
        </Ajuda>
      </div>
      <div className="grade-2">
        <CampoTexto
          id="defensor"
          rotulo="Defensor(a) responsável"
          valor={cabecalho.defensor}
          aoMudar={(v) => aoMudar("defensor", v)}
          autoComplete="off"
        />
        <CampoTexto
          id="orgao"
          rotulo="Órgão de atuação"
          valor={cabecalho.orgao}
          aoMudar={(v) => aoMudar("orgao", v)}
          autoComplete="off"
        />
      </div>
      <div className="linha">
        <Opcao
          rotulo="Lembrar neste navegador"
          marcado={preferencias.lembrar}
          aoMudar={(marcado) => aoMudarPreferencias({ lembrar: marcado })}
        />
        <button type="button" className="botao discreto" onClick={aoEsquecer}>
          Esquecer
        </button>
      </div>
      {armazenamentoDisponivel ? null : (
        <p className="nota">
          Este navegador não permite guardar nada: "Lembrar neste navegador" e "Guardar cálculos
          recentes" não têm efeito aqui, e o tema escolhido vale só até recarregar ou fechar a
          página.
        </p>
      )}
      <CampoTexto
        id="processo"
        rotulo="Nº do processo"
        valor={processo.texto}
        aoMudar={processo.aoMudar}
        mascara={formatarNumeroProcesso}
        aoSair={processo.aoSair}
        erro={processo.erro}
        classe="processo"
        inputMode="numeric"
        placeholder="0000000-00.0000.0.00.0000"
        autoComplete="off"
        ajuda="Padrão do CNJ: digite só os números, e o hífen e os pontos entram sozinhos. Pode ficar em branco se o processo ainda não existe."
      />
      <div className="grade-2">
        <CampoTexto
          id="exequente"
          rotulo="Exequente (alimentando)"
          valor={cabecalho.exequente}
          aoMudar={(v) => aoMudar("exequente", v)}
          autoComplete="off"
        />
        <CampoTexto
          id="executado"
          rotulo="Executado (alimentante)"
          valor={cabecalho.executado}
          aoMudar={(v) => aoMudar("executado", v)}
          autoComplete="off"
        />
      </div>
      <div className="linha">
        <Opcao
          rotulo="Guardar cálculos recentes neste navegador"
          marcado={preferencias.guardarRecentes}
          aoMudar={(marcado) => aoMudarPreferencias({ guardarRecentes: marcado })}
        />
        <Ajuda assunto="cálculos recentes">
          Os cinco últimos cálculos ficam em "Abrir", só neste navegador. Em computador
          compartilhado, desligue: os recentes já guardados são apagados, e "Novo cálculo" e "Abrir"
          passam a descartar o cálculo atual sem aviso (salve antes).
        </Ajuda>
      </div>
    </section>
  );
}
```

`src/ui/App.tsx` (reescrito):

```tsx
import { useMemo, useReducer, useState } from "react";
import { calcular } from "../motor/calcular.ts";
import { ambientePadrao, type Ambiente } from "./ambiente.ts";
import { CHAVE_RECENTES, removerChave } from "./armazenamento.ts";
import { BarraSuperior } from "./BarraSuperior.tsx";
import { Avisos } from "./componentes/Avisos.tsx";
import { estadoInicial, novoCalculo, reduzir } from "./estado/calculo.ts";
import "./estilos.css";
import {
  esquecer,
  gravarPreferencias,
  lerPreferencias,
  type Preferencias,
} from "./preferencias.ts";
import { Rodape } from "./Rodape.tsx";
import { Processo } from "./secoes/Processo.tsx";

/**
 * Tela única em duas colunas (§9): esquerda, dados do caso e lançamentos em lote; direita,
 * resultado e lançamentos individuais. Recálculo a cada alteração, sem botão "Calcular" (§4.3).
 * O `ambiente` é injetável para os testes de componente.
 */
export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambiente }) {
  const armazenamento = ambiente.armazenamento();
  const [preferencias, setPreferencias] = useState(() => lerPreferencias(armazenamento));
  const calculoNovo = (p: Preferencias) =>
    novoCalculo({
      id: ambiente.novoId(),
      agora: ambiente.agora(),
      hoje: ambiente.hoje(),
      cabecalho: p.lembrar ? { defensor: p.defensor, orgao: p.orgao } : {},
    });
  // A tabela de índices é congelada quando o app abre (§8.2); "Novo cálculo" congela outra.
  const [estado, despachar] = useReducer(reduzir, undefined, () =>
    estadoInicial(calculoNovo(preferencias), ambiente.congelar()),
  );
  const resultado = useMemo(
    () => calcular(estado.calculo, estado.tabela),
    [estado.calculo, estado.tabela],
  );
  const agora = () => ambiente.agora();

  const novo = () =>
    despachar({ tipo: "novo", calculo: calculoNovo(preferencias), ...ambiente.congelar() });

  const mudarPreferencias = (mudancas: Partial<Preferencias>) => {
    const novas = { ...preferencias, ...mudancas };
    setPreferencias(novas);
    gravarPreferencias(armazenamento, novas);
    if (mudancas.guardarRecentes === false) removerChave(armazenamento, CHAVE_RECENTES);
  };
  const mudarCabecalho = (campo: keyof typeof estado.calculo.cabecalho, valor: string) => {
    despachar({ tipo: "cabecalho", campo, valor, em: agora() });
    if ((campo === "defensor" || campo === "orgao") && preferencias.lembrar) {
      mudarPreferencias({ [campo]: valor });
    }
  };
  const esquecerTudo = () => {
    esquecer(armazenamento);
    const novas = { ...preferencias, defensor: "", orgao: "", lembrar: false };
    setPreferencias(novas);
    gravarPreferencias(armazenamento, novas);
  };

  return (
    <div className="app">
      <BarraSuperior aoNovo={novo} />
      <main className="principal">
        <div className="coluna-esquerda" key={estado.calculo.id}>
          <Processo
            cabecalho={estado.calculo.cabecalho}
            aoMudar={mudarCabecalho}
            preferencias={preferencias}
            aoMudarPreferencias={mudarPreferencias}
            aoEsquecer={esquecerTudo}
            armazenamentoDisponivel={armazenamento !== null}
          />
        </div>
        <div className="coluna-direita">
          <Avisos avisos={[...estado.situacao.avisos, ...resultado.avisos]} />
        </div>
      </main>
      <Rodape situacaoDosIndices={estado.situacao.rodape} />
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/ui/componentes/Ajuda.test.tsx src/ui/preferencias.test.ts src/ui/componentes/Campo.test.tsx src/ui/secoes/Processo.test.tsx`
Esperado: `16 passed (16)` (2 do balão, 5 das preferências, 2 do campo, 7 da seção).

- [ ] **Step 5: Verificação completa**

Run: `npm run format && npm run verificar`
Esperado: `725 passed | 9 skipped (734)` em 30 arquivos.

- [ ] **Step 6: Commit**

```bash
git add src/ui/armazenamento.ts src/ui/preferencias.ts src/ui/preferencias.test.ts src/ui/componentes/Ajuda.tsx src/ui/componentes/Ajuda.test.tsx src/ui/componentes/Campo.tsx src/ui/componentes/Campo.test.tsx src/ui/secoes/Processo.tsx src/ui/secoes/Processo.test.tsx src/ui/App.tsx
git commit -m "ui: seção Processo (nº do CNJ, defensor e órgão lembrados no navegador, Esquecer, opção de recentes) e ajuda em balões

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 6: Seção "2 · Base dos alimentos": três formas, campos condicionais e validação inline

**Files:**
- Create: `src/ui/estado/faltas.ts`, `src/ui/secoes/Base.tsx`
- Modify (reescrito): `src/ui/App.tsx`
- Test: `src/ui/estado/faltas.test.ts`, `src/ui/secoes/Base.test.tsx`

**Interfaces:**
- Consumes: `Base`, `IndiceReajuste` (tipos); `decompor`; `CampoSelecao`, `CampoTexto`, `Opcao`, `useCampoValidado` (Task 5); `formatarMoedaParaCampo`, `formatarNumeroParaCampo`, `lerData`, `lerPercentual`, `lerValorPositivo` (Task 3); `Acao "base"` (Task 4).
- Produces: `CampoDaBase`, `FaltaDaBase { campo; erro; aviso }`, `faltasDaBase(calculo)` (`estado/faltas.ts`, puro, D29: com prestação lançada sem valor informado, aponta o campo da base em branco: valor fixado, percentual do salário mínimo ou dos rendimentos, rendimento padrão (este, só se houver prestação sem rendimento próprio), com o erro do campo, "Informe o percentual.", e a frase da caixa de avisos, "Falta o percentual do salário mínimo (seção 2 · Base dos alimentos): as prestações ficam sem valor até ele ser informado."); `BaseDosAlimentos({ base, hoje, faltas?, aoMudar })` (o campo apontado em `faltas` fica em vermelho, com o erro, enquanto estiver em branco; a ligação com o App vem na Task 10, junto com a caixa de avisos); `NOMES_DOS_MESES`. Rótulos: "Valor fixo em reais", "% do salário mínimo", "% dos rendimentos", "Valor fixado", "Fixado em", "Reajuste anual" (opções: `nenhum`, `IPCA`, `INPC`, `IGP-M`, `SM`), "Mês do reajuste" (só com índice; padrão: mês da data de fixação), "Percentual do salário mínimo", "Percentual dos rendimentos", "Rendimento mensal padrão (obrigatório)". As explicações (fixação, reajuste, percentual do salário mínimo, rendimento padrão) ficam nos balões ⓘ dos campos (D21). A seção guarda um rascunho por forma (trocar e voltar não perde o digitado); só o que é válido chega a `aoMudar`; o mês do reajuste acompanha a data de fixação enquanto for igual ao mês da data anterior (uma escolha diferente, feita à mão no seletor, é preservada; se a pessoa escolher à mão justamente o mês da data, ele volta a acompanhar).

- [ ] **Step 1: Escrever os testes** (a seção é testada dentro de um `Harness` com estado de verdade, como no App: cada mudança válida volta como `base`)

`src/ui/estado/faltas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Lancamento } from "../../compartilhado/tipos.ts";
import { novoCalculo } from "./calculo.ts";
import { faltasDaBase } from "./faltas.ts";

const prestacao = (extra: Partial<Lancamento> = {}): Lancamento => ({
  id: "p-2026-09",
  tipo: "prestacao",
  data: "2026-09-05",
  competencia: "2026-09",
  origem: "lote",
  editado: false,
  ...extra,
});

function calculo(lancamentos: Lancamento[]) {
  const c = novoCalculo({ id: "c", agora: "2026-10-11T15:00:00-03:00", hoje: "2026-10-11" });
  c.lancamentos = lancamentos;
  return c;
}

describe("o que falta na base dos alimentos (decisão de 13/10/2026)", () => {
  it("sem prestação pela base, nada falta; com ela, o campo em branco é apontado", () => {
    expect(faltasDaBase(calculo([]))).toEqual([]);
    expect(faltasDaBase(calculo([prestacao({ valorInformado: "500.00" })]))).toEqual([]);
    expect(faltasDaBase(calculo([prestacao()]))).toEqual([
      {
        campo: "valor",
        erro: "Informe o valor fixado.",
        aviso:
          "Falta o valor fixado (seção 2 · Base dos alimentos): as prestações ficam sem valor até ele ser informado.",
      },
    ]);
  });

  it("percentual do salário mínimo; percentual e rendimento padrão dos rendimentos", () => {
    const sm = calculo([prestacao()]);
    sm.base = { tipo: "percentualSalarioMinimo", percentual: "" };
    expect(faltasDaBase(sm).map((f) => f.aviso)).toEqual([
      "Falta o percentual do salário mínimo (seção 2 · Base dos alimentos): as prestações ficam sem valor até ele ser informado.",
    ]);
    sm.base = { tipo: "percentualSalarioMinimo", percentual: "30" };
    expect(faltasDaBase(sm)).toEqual([]);
    const rend = calculo([prestacao()]);
    rend.base = { tipo: "percentualRendimentos", percentual: "", rendimentoPadrao: "" };
    expect(faltasDaBase(rend).map((f) => [f.campo, f.erro])).toEqual([
      ["percentual", "Informe o percentual."],
      ["rendimentoPadrao", "Informe o rendimento padrão."],
    ]);
    // prestação com rendimento próprio dispensa o rendimento padrão
    rend.lancamentos = [prestacao({ rendimento: "2000.00" })];
    expect(faltasDaBase(rend).map((f) => f.campo)).toEqual(["percentual"]);
  });
});
```

`src/ui/secoes/Base.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Base } from "../../compartilhado/tipos.ts";
import { BaseDosAlimentos } from "./Base.tsx";

afterEach(cleanup);

const HOJE = "2026-10-11";
const fixa: Base = {
  tipo: "valorFixo",
  valor: "",
  dataFixacao: HOJE,
  indiceReajuste: "nenhum",
  mesReajuste: 10,
};

/** A seção dentro de um estado de verdade (como no App): cada mudança válida volta como `base`. */
function Harness({ inicial, espiao }: { inicial: Base; espiao: (base: Base) => void }) {
  const [base, setBase] = useState(inicial);
  return (
    <BaseDosAlimentos
      base={base}
      hoje={HOJE}
      aoMudar={(nova) => {
        setBase(nova);
        espiao(nova);
      }}
    />
  );
}

describe("2 · Base dos alimentos (§6.3, §9.2)", () => {
  it("valor fixo: mostra o mês do reajuste só com índice (IPCA, INPC, IGP-M), com o mês da fixação como padrão", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    render(<Harness inicial={fixa} espiao={espiao} />);
    expect((screen.getByLabelText("Valor fixo em reais") as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByLabelText("Mês do reajuste")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Ajuda: Reajuste anual" }));
    expect(screen.getByText(/Sem reajuste, o valor fixado vale igual/)).toBeDefined();
    await user.selectOptions(screen.getByLabelText("Reajuste anual"), "IPCA");
    expect(espiao).toHaveBeenLastCalledWith({ ...fixa, indiceReajuste: "IPCA" });
    expect((screen.getByLabelText("Mês do reajuste") as HTMLSelectElement).value).toBe("10");
    await user.click(screen.getByRole("button", { name: "Ajuda: Reajuste anual" }));
    expect(screen.getByText(/reajustado a cada 12 meses/)).toBeDefined();
    await user.selectOptions(screen.getByLabelText("Mês do reajuste"), "3");
    expect(espiao).toHaveBeenLastCalledWith({ ...fixa, indiceReajuste: "IPCA", mesReajuste: 3 });
    await user.selectOptions(screen.getByLabelText("Reajuste anual"), "SM");
    expect(screen.queryByLabelText("Mês do reajuste")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Ajuda: Reajuste anual" }));
    expect(screen.getByText(/O valor acompanha o salário mínimo/)).toBeDefined();
  });

  it("valor fixo: o valor aceita vírgula e só o válido chega; a data de fixação muda o mês do reajuste", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    render(<Harness inicial={fixa} espiao={espiao} />);
    await user.type(screen.getByLabelText("Valor fixado"), "1.000,00");
    expect(espiao).toHaveBeenLastCalledWith({ ...fixa, valor: "1000.00" });
    espiao.mockClear();
    await user.type(screen.getByLabelText("Valor fixado"), ",");
    expect(espiao).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("Use vírgula para os centavos");
    fireEvent.change(screen.getByLabelText("Fixado em"), { target: { value: "2024-03-15" } });
    expect(espiao).toHaveBeenLastCalledWith({
      ...fixa,
      valor: "1000.00",
      dataFixacao: "2024-03-15",
      mesReajuste: 3,
    });
    espiao.mockClear();
    fireEvent.change(screen.getByLabelText("Fixado em"), { target: { value: "" } });
    expect(espiao).not.toHaveBeenCalled();
    expect(screen.getAllByRole("alert").map((a) => a.textContent)).toContain(
      "Informe a data (dia, mês e ano a partir de 1900).",
    );
  });

  it("mudar 'Fixado em' só acompanha o mês do reajuste enquanto ele não foi escolhido à mão", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    render(<Harness inicial={{ ...fixa, indiceReajuste: "IPCA" }} espiao={espiao} />);
    fireEvent.change(screen.getByLabelText("Fixado em"), { target: { value: "2024-03-15" } });
    expect((screen.getByLabelText("Mês do reajuste") as HTMLSelectElement).value).toBe("3");
    await user.selectOptions(screen.getByLabelText("Mês do reajuste"), "6");
    fireEvent.change(screen.getByLabelText("Fixado em"), { target: { value: "2024-04-10" } });
    expect(espiao).toHaveBeenLastCalledWith({
      ...fixa,
      indiceReajuste: "IPCA",
      dataFixacao: "2024-04-10",
      mesReajuste: 6,
    });
    expect((screen.getByLabelText("Mês do reajuste") as HTMLSelectElement).value).toBe("6");
  });

  it("trocar a forma mostra só os campos dela; voltar recupera o rascunho; o rendimento padrão é exigido", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    render(<Harness inicial={fixa} espiao={espiao} />);
    await user.type(screen.getByLabelText("Valor fixado"), "500");
    await user.click(screen.getByLabelText("% dos rendimentos"));
    expect(espiao).toHaveBeenLastCalledWith({
      tipo: "percentualRendimentos",
      percentual: "",
      rendimentoPadrao: "",
    });
    expect(screen.queryByLabelText("Valor fixado")).toBeNull();
    await user.type(screen.getByLabelText("Percentual dos rendimentos"), "30");
    await user.type(screen.getByLabelText("Rendimento mensal padrão (obrigatório)"), "1500");
    expect(espiao).toHaveBeenLastCalledWith({
      tipo: "percentualRendimentos",
      percentual: "30",
      rendimentoPadrao: "1500",
    });
    await user.clear(screen.getByLabelText("Rendimento mensal padrão (obrigatório)"));
    expect(screen.getByRole("alert").textContent).toBe("Informe um número.");
    await user.click(screen.getByLabelText("% do salário mínimo"));
    expect(espiao).toHaveBeenLastCalledWith({ tipo: "percentualSalarioMinimo", percentual: "" });
    expect(screen.queryByLabelText("Percentual dos rendimentos")).toBeNull();
    await user.type(screen.getByLabelText("Percentual do salário mínimo"), "-1");
    expect(screen.getByRole("alert").textContent).toBe("O percentual não pode ser negativo.");
    await user.click(screen.getByLabelText("Valor fixo em reais"));
    expect(espiao).toHaveBeenLastCalledWith({ ...fixa, valor: "500" });
    expect((screen.getByLabelText("Valor fixado") as HTMLInputElement).value).toBe("500,00");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/estado/faltas.test.ts src/ui/secoes/Base.test.tsx`
Esperado: os dois arquivos falham ao importar (`Cannot find module './faltas.ts'`, `Failed to resolve import "./Base.tsx"`); `Tests no tests`.

- [ ] **Step 3: Implementar**

`src/ui/estado/faltas.ts`:

```ts
import type { Base, Calculo } from "../../compartilhado/tipos.ts";

/**
 * Campos da base dos alimentos que faltam para apurar as prestações (decisão de 13/10/2026): com
 * prestação lançada pela base e o campo em branco, a caixa de avisos diz o que falta e onde, e o
 * campo fica em vermelho na seção 2. Módulo puro.
 */
export type CampoDaBase = "valor" | "percentual" | "rendimentoPadrao";

export interface FaltaDaBase {
  campo: CampoDaBase;
  /** erro embaixo do campo */
  erro: string;
  /** frase da caixa de avisos */
  aviso: string;
}

const ONDE = "(seção 2 · Base dos alimentos)";

function falta(
  campo: CampoDaBase,
  nome: string,
  erro: string,
  quais = "as prestações",
): FaltaDaBase {
  return {
    campo,
    erro,
    aviso: `Falta ${nome} ${ONDE}: ${quais} ficam sem valor até ele ser informado.`,
  };
}

const vazio = (texto: string) => texto.trim() === "";

export function faltasDaBase(calculo: Calculo): FaltaDaBase[] {
  const pelaBase = calculo.lancamentos.filter(
    (l) => l.tipo === "prestacao" && l.valorInformado === undefined,
  );
  if (pelaBase.length === 0) return [];
  const base: Base = calculo.base;
  if (base.tipo === "valorFixo") {
    return vazio(base.valor) ? [falta("valor", "o valor fixado", "Informe o valor fixado.")] : [];
  }
  if (base.tipo === "percentualSalarioMinimo") {
    return vazio(base.percentual)
      ? [falta("percentual", "o percentual do salário mínimo", "Informe o percentual.")]
      : [];
  }
  const faltas: FaltaDaBase[] = [];
  if (vazio(base.percentual)) {
    faltas.push(falta("percentual", "o percentual dos rendimentos", "Informe o percentual."));
  }
  if (vazio(base.rendimentoPadrao) && pelaBase.some((l) => l.rendimento === undefined)) {
    faltas.push(
      falta(
        "rendimentoPadrao",
        "o rendimento mensal padrão",
        "Informe o rendimento padrão.",
        "as prestações sem rendimento próprio",
      ),
    );
  }
  return faltas;
}
```

`src/ui/secoes/Base.tsx`:

```tsx
import { useState } from "react";
import { decompor } from "../../compartilhado/datas.ts";
import type { Base, IndiceReajuste } from "../../compartilhado/tipos.ts";
import { CampoSelecao, CampoTexto, Opcao, useCampoValidado } from "../componentes/Campo.tsx";
import {
  formatarMoedaParaCampo,
  formatarNumeroParaCampo,
  lerData,
  lerPercentual,
  lerValorPositivo,
} from "../entrada.ts";
import type { CampoDaBase, FaltaDaBase } from "../estado/faltas.ts";

/**
 * Seção "2 · Base dos alimentos" (§9.2, §6.3): três formas, e só os campos da forma escolhida
 * aparecem. O mês do reajuste some quando o reajuste é pelo salário mínimo ou "nenhum"; em "% dos
 * rendimentos" o rendimento padrão é exigido. Cada forma guarda um rascunho, para que trocar de
 * forma e voltar não perca o que foi digitado. Explicações nos balões ⓘ dos campos. Com prestação
 * lançada pela base, o campo que falta fica em vermelho ("Informe o percentual."; decisão de
 * 13/10/2026).
 */

/** Erro do campo: o da leitura (texto inválido) ou, com o campo em branco, o de campo que falta. */
function erroDoCampo(
  campo: { texto: string; erro: string | null },
  qual: CampoDaBase,
  faltas: FaltaDaBase[],
): string | null {
  if (campo.erro !== null) return campo.erro;
  if (campo.texto.trim() !== "") return null;
  return faltas.find((f) => f.campo === qual)?.erro ?? null;
}

export const NOMES_DOS_MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

type BaseValorFixo = Extract<Base, { tipo: "valorFixo" }>;
type BasePercentualSM = Extract<Base, { tipo: "percentualSalarioMinimo" }>;
type BasePercentualRendimentos = Extract<Base, { tipo: "percentualRendimentos" }>;

interface Rascunhos {
  valorFixo: BaseValorFixo;
  percentualSalarioMinimo: BasePercentualSM;
  percentualRendimentos: BasePercentualRendimentos;
}

const OPCOES_DE_REAJUSTE: ReadonlyArray<{ valor: IndiceReajuste; rotulo: string }> = [
  { valor: "nenhum", rotulo: "nenhum (valor constante)" },
  { valor: "IPCA", rotulo: "IPCA" },
  { valor: "INPC", rotulo: "INPC" },
  { valor: "IGP-M", rotulo: "IGP-M" },
  { valor: "SM", rotulo: "salário mínimo (proporção)" },
];

const OPCOES_DE_MES = NOMES_DOS_MESES.map((nome, i) => ({ valor: String(i + 1), rotulo: nome }));

function rascunhosIniciais(base: Base, hoje: string): Rascunhos {
  const mes = decompor(hoje).mes;
  return {
    valorFixo: {
      tipo: "valorFixo",
      valor: "",
      dataFixacao: hoje,
      indiceReajuste: "nenhum",
      mesReajuste: mes,
    },
    percentualSalarioMinimo: { tipo: "percentualSalarioMinimo", percentual: "" },
    percentualRendimentos: { tipo: "percentualRendimentos", percentual: "", rendimentoPadrao: "" },
    [base.tipo]: base,
  };
}

export function BaseDosAlimentos({
  base,
  hoje,
  faltas = [],
  aoMudar,
}: {
  base: Base;
  /** data de hoje, para o rascunho do valor fixo */
  hoje: string;
  /** campos que faltam para apurar as prestações lançadas (`faltasDaBase`) */
  faltas?: FaltaDaBase[];
  aoMudar: (base: Base) => void;
}) {
  const [rascunhos, setRascunhos] = useState(() => rascunhosIniciais(base, hoje));
  const escolher = (tipo: Base["tipo"]) => aoMudar(rascunhos[tipo]);
  const atualizar = <T extends Base>(nova: T) => {
    setRascunhos({ ...rascunhos, [nova.tipo]: nova });
    aoMudar(nova);
  };
  return (
    <section className="secao" aria-labelledby="titulo-base">
      <h2 id="titulo-base">2 · Base dos alimentos</h2>
      <fieldset className="grupo">
        <legend>Como os alimentos foram fixados</legend>
        <Opcao
          tipo="radio"
          nome="tipo-da-base"
          rotulo="Valor fixo em reais"
          marcado={base.tipo === "valorFixo"}
          aoMudar={() => escolher("valorFixo")}
        />
        <Opcao
          tipo="radio"
          nome="tipo-da-base"
          rotulo="% do salário mínimo"
          marcado={base.tipo === "percentualSalarioMinimo"}
          aoMudar={() => escolher("percentualSalarioMinimo")}
        />
        <Opcao
          tipo="radio"
          nome="tipo-da-base"
          rotulo="% dos rendimentos"
          marcado={base.tipo === "percentualRendimentos"}
          aoMudar={() => escolher("percentualRendimentos")}
        />
      </fieldset>
      {base.tipo === "valorFixo" ? (
        <ValorFixo base={base} faltas={faltas} aoMudar={atualizar} />
      ) : base.tipo === "percentualSalarioMinimo" ? (
        <PercentualSalarioMinimo base={base} faltas={faltas} aoMudar={atualizar} />
      ) : (
        <PercentualRendimentos base={base} faltas={faltas} aoMudar={atualizar} />
      )}
    </section>
  );
}

function ValorFixo({
  base,
  faltas,
  aoMudar,
}: {
  base: BaseValorFixo;
  faltas: FaltaDaBase[];
  aoMudar: (base: BaseValorFixo) => void;
}) {
  const valor = useCampoValidado({
    valorGuardado: base.valor,
    paraTexto: formatarMoedaParaCampo,
    ler: lerValorPositivo,
    aoValidar: (v) => aoMudar({ ...base, valor: v }),
  });
  const data = useCampoValidado({
    valorGuardado: base.dataFixacao,
    paraTexto: (d) => d,
    ler: lerData,
    // o mês do reajuste acompanha a data de fixação enquanto for igual ao mês da data anterior
    // (uma escolha diferente, feita à mão no seletor, é preservada)
    aoValidar: (d) =>
      aoMudar({
        ...base,
        dataFixacao: d,
        mesReajuste:
          base.mesReajuste === decompor(base.dataFixacao).mes ? decompor(d).mes : base.mesReajuste,
      }),
  });
  const comMes = base.indiceReajuste !== "nenhum" && base.indiceReajuste !== "SM";
  return (
    <>
      <div className="linha">
        <CampoTexto
          id="base-valor"
          rotulo="Valor fixado"
          valor={valor.texto}
          aoMudar={valor.aoMudar}
          aoSair={valor.aoSair}
          erro={erroDoCampo(valor, "valor", faltas)}
          inputMode="decimal"
          classe="medio"
          placeholder="ex.: 1.000,00"
        />
        <CampoTexto
          id="base-fixacao"
          rotulo="Fixado em"
          ajuda="Data da sentença ou do acordo que fixou o valor. O mês do reajuste acompanha esta data, salvo se você escolher outro."
          tipo="date"
          valor={data.texto}
          aoMudar={data.aoMudar}
          erro={data.erro}
          min="1900-01-01"
        />
        <CampoSelecao
          id="base-reajuste"
          rotulo="Reajuste anual"
          ajuda={
            base.indiceReajuste === "nenhum"
              ? "Sem reajuste, o valor fixado vale igual para todas as prestações. Se a sentença previu reajuste, escolha o índice."
              : base.indiceReajuste === "SM"
                ? "O valor acompanha o salário mínimo: valor fixado × salário mínimo do mês do vencimento ÷ salário mínimo do mês da fixação."
                : "O valor é reajustado a cada 12 meses pelo índice acumulado dos 12 meses anteriores ao mês do reajuste. Padrão: o mês da fixação; mude se a sentença disser outro mês."
          }
          valor={base.indiceReajuste}
          opcoes={OPCOES_DE_REAJUSTE}
          aoMudar={(indice) => aoMudar({ ...base, indiceReajuste: indice })}
        />
        {comMes ? (
          <CampoSelecao
            id="base-mes-reajuste"
            rotulo="Mês do reajuste"
            valor={String(base.mesReajuste)}
            opcoes={OPCOES_DE_MES}
            aoMudar={(mes) => aoMudar({ ...base, mesReajuste: Number(mes) })}
          />
        ) : null}
      </div>
    </>
  );
}

function PercentualSalarioMinimo({
  base,
  faltas,
  aoMudar,
}: {
  base: BasePercentualSM;
  faltas: FaltaDaBase[];
  aoMudar: (base: BasePercentualSM) => void;
}) {
  const percentual = useCampoValidado({
    valorGuardado: base.percentual,
    paraTexto: formatarNumeroParaCampo,
    ler: lerPercentual,
    aoValidar: (p) => aoMudar({ ...base, percentual: p }),
  });
  return (
    <>
      <div className="linha">
        <CampoTexto
          id="base-percentual-sm"
          rotulo="Percentual do salário mínimo"
          ajuda="Percentual × salário mínimo oficial do mês de cada vencimento (valor publicado pelo Banco Central). Mês ainda sem salário mínimo publicado usa o último publicado, com aviso."
          valor={percentual.texto}
          aoMudar={percentual.aoMudar}
          aoSair={percentual.aoSair}
          erro={erroDoCampo(percentual, "percentual", faltas)}
          inputMode="decimal"
          classe="curto"
          placeholder="ex.: 30"
        />
      </div>
    </>
  );
}

function PercentualRendimentos({
  base,
  faltas,
  aoMudar,
}: {
  base: BasePercentualRendimentos;
  faltas: FaltaDaBase[];
  aoMudar: (base: BasePercentualRendimentos) => void;
}) {
  const percentual = useCampoValidado({
    valorGuardado: base.percentual,
    paraTexto: formatarNumeroParaCampo,
    ler: lerPercentual,
    aoValidar: (p) => aoMudar({ ...base, percentual: p }),
  });
  const rendimento = useCampoValidado({
    valorGuardado: base.rendimentoPadrao,
    paraTexto: formatarMoedaParaCampo,
    ler: lerValorPositivo,
    aoValidar: (r) => aoMudar({ ...base, rendimentoPadrao: r }),
  });
  return (
    <>
      <div className="linha">
        <CampoTexto
          id="base-percentual-rendimentos"
          rotulo="Percentual dos rendimentos"
          valor={percentual.texto}
          aoMudar={percentual.aoMudar}
          aoSair={percentual.aoSair}
          erro={erroDoCampo(percentual, "percentual", faltas)}
          inputMode="decimal"
          classe="curto"
          placeholder="ex.: 30"
        />
        <CampoTexto
          id="base-rendimento-padrao"
          rotulo="Rendimento mensal padrão (obrigatório)"
          ajuda="Percentual × rendimento do mês. O rendimento padrão vale para todas as prestações; quando o rendimento mudar, ou para 13º e férias, informe o rendimento daquele mês na própria prestação (lápis na tabela)."
          valor={rendimento.texto}
          aoMudar={rendimento.aoMudar}
          aoSair={rendimento.aoSair}
          erro={erroDoCampo(rendimento, "rendimentoPadrao", faltas)}
          inputMode="decimal"
          classe="medio"
          placeholder="ex.: 1.500,00"
        />
      </div>
    </>
  );
}
```

`src/ui/App.tsx` (reescrito; acrescenta a seção abaixo de "1 · Processo"):

```tsx
import { useMemo, useReducer, useState } from "react";
import { calcular } from "../motor/calcular.ts";
import { ambientePadrao, type Ambiente } from "./ambiente.ts";
import { CHAVE_RECENTES, removerChave } from "./armazenamento.ts";
import { BarraSuperior } from "./BarraSuperior.tsx";
import { Avisos } from "./componentes/Avisos.tsx";
import { estadoInicial, novoCalculo, reduzir } from "./estado/calculo.ts";
import "./estilos.css";
import {
  esquecer,
  gravarPreferencias,
  lerPreferencias,
  type Preferencias,
} from "./preferencias.ts";
import { Rodape } from "./Rodape.tsx";
import { BaseDosAlimentos } from "./secoes/Base.tsx";
import { Processo } from "./secoes/Processo.tsx";

/**
 * Tela única em duas colunas (§9): esquerda, dados do caso e lançamentos em lote; direita,
 * resultado e lançamentos individuais. Recálculo a cada alteração, sem botão "Calcular" (§4.3).
 * O `ambiente` é injetável para os testes de componente.
 */
export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambiente }) {
  const armazenamento = ambiente.armazenamento();
  const [preferencias, setPreferencias] = useState(() => lerPreferencias(armazenamento));
  const calculoNovo = (p: Preferencias) =>
    novoCalculo({
      id: ambiente.novoId(),
      agora: ambiente.agora(),
      hoje: ambiente.hoje(),
      cabecalho: p.lembrar ? { defensor: p.defensor, orgao: p.orgao } : {},
    });
  // A tabela de índices é congelada quando o app abre (§8.2); "Novo cálculo" congela outra.
  const [estado, despachar] = useReducer(reduzir, undefined, () =>
    estadoInicial(calculoNovo(preferencias), ambiente.congelar()),
  );
  const resultado = useMemo(
    () => calcular(estado.calculo, estado.tabela),
    [estado.calculo, estado.tabela],
  );
  const agora = () => ambiente.agora();

  const novo = () =>
    despachar({ tipo: "novo", calculo: calculoNovo(preferencias), ...ambiente.congelar() });

  const mudarPreferencias = (mudancas: Partial<Preferencias>) => {
    const novas = { ...preferencias, ...mudancas };
    setPreferencias(novas);
    gravarPreferencias(armazenamento, novas);
    if (mudancas.guardarRecentes === false) removerChave(armazenamento, CHAVE_RECENTES);
  };
  const mudarCabecalho = (campo: keyof typeof estado.calculo.cabecalho, valor: string) => {
    despachar({ tipo: "cabecalho", campo, valor, em: agora() });
    if ((campo === "defensor" || campo === "orgao") && preferencias.lembrar) {
      mudarPreferencias({ [campo]: valor });
    }
  };
  const esquecerTudo = () => {
    esquecer(armazenamento);
    const novas = { ...preferencias, defensor: "", orgao: "", lembrar: false };
    setPreferencias(novas);
    gravarPreferencias(armazenamento, novas);
  };

  return (
    <div className="app">
      <BarraSuperior aoNovo={novo} />
      <main className="principal">
        <div className="coluna-esquerda" key={estado.calculo.id}>
          <Processo
            cabecalho={estado.calculo.cabecalho}
            aoMudar={mudarCabecalho}
            preferencias={preferencias}
            aoMudarPreferencias={mudarPreferencias}
            aoEsquecer={esquecerTudo}
            armazenamentoDisponivel={armazenamento !== null}
          />
          <BaseDosAlimentos
            base={estado.calculo.base}
            hoje={ambiente.hoje()}
            aoMudar={(base) => despachar({ tipo: "base", base, em: agora() })}
          />
        </div>
        <div className="coluna-direita">
          <Avisos avisos={[...estado.situacao.avisos, ...resultado.avisos]} />
        </div>
      </main>
      <Rodape situacaoDosIndices={estado.situacao.rodape} />
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/ui/estado/faltas.test.ts src/ui/secoes/Base.test.tsx`
Esperado: `6 passed (6)` (2 do módulo, 4 da seção).

- [ ] **Step 5: Verificação completa**

Run: `npm run format && npm run verificar`
Esperado: `731 passed | 9 skipped (740)` em 32 arquivos.

- [ ] **Step 6: Commit**

```bash
git add src/ui/estado/faltas.ts src/ui/estado/faltas.test.ts src/ui/secoes/Base.tsx src/ui/secoes/Base.test.tsx src/ui/App.tsx
git commit -m "ui: seção Base dos alimentos com três formas, campos condicionais e validação inline

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 7: Edição da metodologia por períodos (módulo puro) e seção "5 · Encargos e data do cálculo"

O módulo puro que resume a metodologia em uma frase e a edita (dividir, remover divisão, índice, juros, taxa, incidência, deflação, "ajustada" recalculada), e a seção com o resumo, "Ajustar" (ligado ao editor na Task 8), multa, honorários, data de elaboração e observações.

**Files:**
- Create: `src/ui/estado/metodologia.ts`, `src/ui/secoes/Encargos.tsx`
- Modify (reescrito): `src/ui/App.tsx`
- Test: `src/ui/estado/metodologia.test.ts`, `src/ui/secoes/Encargos.test.tsx`

**Interfaces:**
- Consumes: `periodosOrdenados`, `validarMetodologia` (`src/motor/periodos.ts`); `metodologiaPadrao`; `diaAnterior`; `formatarData`, `formatarPercentual`; `decimalOuNulo`; `CampoArea`, `CampoTexto`, `useCampoValidado`; `lerData`, `lerPercentual`, `formatarNumeroParaCampo`; ações `acrescimos`, `dataElaboracao`, `observacoes` (Task 4).
- Produces (`estado/metodologia.ts`): `EscolhaDeJuros = "percentualMensal" | "taxaLegal" | "selicUnica"`; `ehPadrao(m)`; `normalizar(m)`; `descreverIntervalo(p)`; `descreverRegras(p)`; `resumirMetodologia(m)` (ex.: "Até 29/08/2024: IGP-M e juros de 1% ao mês. Desde 30/08/2024: IPCA e taxa legal."); `dividirPeriodo(m, data): { metodologia; aviso? }`; `removerDivisao(m, indice)`; `escolherIndice(m, indice, correcao)`; `escolherJuros(m, indice, escolha)` (SELIC única zera o índice); `escolherTaxa(m, indice, taxaMensal)`; `escolherOpcoes(m, { incidenciaMesInicial?, deflacao? })`; `restaurarPadrao()`. `Encargos({ calculo, aoMudarAcrescimo, aoMudarDataElaboracao, aoMudarObservacoes, aoAjustar })`. Rótulos: "Metodologia de encargos (padrão)" / "(ajustada)" (sem menção ao SAJ, D22; o balão "Ajuda: Metodologia de encargos" explica), "Ajustar", "Multa (art. 523, %)", "Honorários (%)", "Data de elaboração", "Observações para o relatório".

- [ ] **Step 1: Escrever os testes**

`src/ui/estado/metodologia.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Metodologia } from "../../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../../metodologias/padrao.ts";
import { validarMetodologia } from "../../motor/periodos.ts";
import { metodologiaSelicUnica } from "../../motor/testes/regime-novo.ts";
import {
  dividirPeriodo,
  ehPadrao,
  escolherIndice,
  escolherJuros,
  escolherOpcoes,
  escolherTaxa,
  removerDivisao,
  restaurarPadrao,
  resumirMetodologia,
} from "./metodologia.ts";

describe("resumirMetodologia (resumo em uma frase, §9.2)", () => {
  it("descreve a padrão TJMS/SAJ v1 e a SELIC única", () => {
    expect(resumirMetodologia(metodologiaPadrao())).toBe(
      "Até 29/08/2024: IGP-M e juros de 1% ao mês. Desde 30/08/2024: IPCA e taxa legal.",
    );
    expect(resumirMetodologia(metodologiaSelicUnica())).toBe(
      "Sempre: SELIC única (correção e juros juntos).",
    );
  });

  it("descreve três períodos, taxas com casas, 'sem correção', 'sem juros' e taxa inválida", () => {
    const m: Metodologia = {
      ...metodologiaPadrao(),
      periodos: [
        {
          de: null,
          ate: "2019-12-31",
          correcao: { indice: "INPC" },
          juros: { tipo: "percentualMensal", taxaMensal: "0.5" },
        },
        {
          de: "2020-01-01",
          ate: "2022-12-31",
          correcao: { indice: "nenhum" },
          juros: { tipo: "percentualMensal", taxaMensal: "0" },
        },
        {
          de: "2023-01-01",
          ate: null,
          correcao: { indice: "IPCA" },
          juros: { tipo: "percentualMensal", taxaMensal: "x" },
        },
      ],
    };
    expect(resumirMetodologia(m)).toBe(
      'Até 31/12/2019: INPC e juros de 0,50% ao mês. De 01/01/2020 a 31/12/2022: sem correção e sem juros. Desde 01/01/2023: IPCA e juros de "x" ao mês (taxa inválida).',
    );
    expect(resumirMetodologia({ ...m, periodos: [] })).toBe(
      "Sem períodos: nenhum lançamento recebe correção nem juros.",
    );
  });
});

describe("dividir e remover divisões", () => {
  it("divide o período que contém a data, copiando as regras, e marca 'ajustada'", () => {
    const { metodologia, aviso } = dividirPeriodo(metodologiaPadrao(), "2023-01-01");
    expect(aviso).toBeUndefined();
    expect(metodologia.ajustada).toBe(true);
    expect(metodologia.periodos.map((p) => [p.de, p.ate, p.correcao.indice, p.juros.tipo])).toEqual(
      [
        [null, "2022-12-31", "IGP-M", "percentualMensal"],
        ["2023-01-01", "2024-08-29", "IGP-M", "percentualMensal"],
        ["2024-08-30", null, "IPCA", "taxaLegal"],
      ],
    );
    expect(validarMetodologia(metodologia)).toEqual([]);
  });

  it("não divide numa data que já inicia um período nem fora dos períodos; avisa", () => {
    const naFronteira = dividirPeriodo(metodologiaPadrao(), "2024-08-30");
    expect(naFronteira.aviso).toBe("Já existe uma divisão em 30/08/2024.");
    expect(naFronteira.metodologia).toEqual(metodologiaPadrao());
    const semPeriodo: Metodologia = {
      ...metodologiaPadrao(),
      periodos: [
        { de: "2020-01-01", ate: null, correcao: { indice: "IPCA" }, juros: { tipo: "taxaLegal" } },
      ],
    };
    expect(dividirPeriodo(semPeriodo, "2019-05-05").aviso).toBe(
      "Nenhum período cobre 05/05/2019: nada foi dividido.",
    );
  });

  it("remover a divisão funde o período no anterior, que mantém as regras; a padrão volta a ser padrão", () => {
    const dividida = dividirPeriodo(metodologiaPadrao(), "2023-01-01").metodologia;
    const fundida = removerDivisao(dividida, 1);
    expect(fundida).toEqual(metodologiaPadrao());
    expect(fundida.ajustada).toBe(false);
    // remover a primeira "divisão" (índice 0) ou um índice inexistente não muda nada
    expect(removerDivisao(dividida, 0)).toBe(dividida);
    expect(removerDivisao(dividida, 9)).toBe(dividida);
    // remover a transição legal: um período só, com as regras antigas
    const semTransicao = removerDivisao(metodologiaPadrao(), 1);
    expect(semTransicao.periodos).toEqual([
      {
        de: null,
        ate: null,
        correcao: { indice: "IGP-M" },
        juros: { tipo: "percentualMensal", taxaMensal: "1" },
      },
    ]);
    expect(semTransicao.ajustada).toBe(true);
  });
});

describe("índice, juros, taxa e opções de cada período", () => {
  it("troca o índice e a taxa; a taxa só com juros percentuais", () => {
    const comInpc = escolherIndice(metodologiaPadrao(), 0, "INPC");
    expect(comInpc.periodos[0]?.correcao).toEqual({ indice: "INPC" });
    expect(comInpc.ajustada).toBe(true);
    const comTaxa = escolherTaxa(comInpc, 0, "0.5");
    expect(comTaxa.periodos[0]?.juros).toEqual({ tipo: "percentualMensal", taxaMensal: "0.5" });
    expect(escolherTaxa(comTaxa, 1, "2")).toBe(comTaxa);
    expect(escolherIndice(comTaxa, 5, "IPCA")).toBe(comTaxa);
  });

  it("'SELIC única' é uma escolha só: juros selicUnica e correção 'nenhum'; o índice fica travado em 'nenhum'", () => {
    const selic = escolherJuros(metodologiaPadrao(), 0, "selicUnica");
    expect(selic.periodos[0]).toEqual({
      de: null,
      ate: "2024-08-29",
      correcao: { indice: "nenhum" },
      juros: { tipo: "selicUnica" },
    });
    expect(escolherIndice(selic, 0, "IGP-M").periodos[0]?.correcao).toEqual({ indice: "nenhum" });
    expect(validarMetodologia(selic)).toEqual([]);
    // voltar a juros percentuais recupera 1% ao mês; a taxa legal não tem taxa
    expect(escolherJuros(selic, 0, "percentualMensal").periodos[0]?.juros).toEqual({
      tipo: "percentualMensal",
      taxaMensal: "1",
    });
    expect(escolherJuros(selic, 0, "taxaLegal").periodos[0]?.juros).toEqual({ tipo: "taxaLegal" });
    // trocar para taxa legal preserva a taxa anterior ao voltar? não: ela se perde, e volta o padrão 1
    const legal = escolherJuros(escolherTaxa(metodologiaPadrao(), 0, "2"), 0, "taxaLegal");
    expect(escolherJuros(legal, 0, "percentualMensal").periodos[0]?.juros).toEqual({
      tipo: "percentualMensal",
      taxaMensal: "1",
    });
  });

  it("incidência no mês inicial e deflação; restaurar o padrão zera tudo", () => {
    const opcoes = escolherOpcoes(metodologiaPadrao(), {
      incidenciaMesInicial: "mesSeguinte",
      deflacao: "zerarNegativos",
    });
    expect(opcoes).toMatchObject({
      incidenciaMesInicial: "mesSeguinte",
      deflacao: "zerarNegativos",
      ajustada: true,
    });
    expect(ehPadrao(opcoes)).toBe(false);
    expect(
      escolherOpcoes(opcoes, { incidenciaMesInicial: "proRata", deflacao: "aplicarComPiso" })
        .ajustada,
    ).toBe(false);
    expect(restaurarPadrao()).toEqual(metodologiaPadrao());
    expect(ehPadrao({ ...metodologiaPadrao(), ajustada: true })).toBe(true);
  });
});
```

`src/ui/secoes/Encargos.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Calculo } from "../../compartilhado/tipos.ts";
import { novoCalculo } from "../estado/calculo.ts";
import { dividirPeriodo } from "../estado/metodologia.ts";
import { Encargos } from "./Encargos.tsx";

afterEach(cleanup);

function Harness({ inicial, espiao }: { inicial: Calculo; espiao: (c: Calculo) => void }) {
  const [calculo, setCalculo] = useState(inicial);
  const mudar = (novo: Calculo) => {
    setCalculo(novo);
    espiao(novo);
  };
  return (
    <Encargos
      calculo={calculo}
      aoMudarAcrescimo={(campo, valor) =>
        mudar({ ...calculo, acrescimos: { ...calculo.acrescimos, [campo]: valor } })
      }
      aoMudarDataElaboracao={(data) => mudar({ ...calculo, dataElaboracao: data })}
      aoMudarObservacoes={(texto) => mudar({ ...calculo, observacoes: texto })}
      aoAjustar={() => espiao({ ...calculo, observacoes: "ajustar!" })}
    />
  );
}

const inicial = novoCalculo({ id: "c", agora: "2026-10-11T15:00:00-03:00", hoje: "2026-10-11" });

describe("5 · Encargos e data do cálculo (§9.2)", () => {
  it("resume a metodologia em uma frase, com '(padrão)' quando é a padrão (sem citar outro sistema) e 'ajustada' quando não é", () => {
    render(<Harness inicial={inicial} espiao={vi.fn()} />);
    expect(screen.getByText(/Metodologia de encargos/).textContent).toBe(
      "Metodologia de encargos (padrão)",
    );
    expect(screen.getByText(/Até 29\/08\/2024/).textContent).toBe(
      "Até 29/08/2024: IGP-M e juros de 1% ao mês. Desde 30/08/2024: IPCA e taxa legal.",
    );
    cleanup();
    const ajustada = {
      ...inicial,
      metodologia: dividirPeriodo(inicial.metodologia, "2023-01-01").metodologia,
    };
    render(<Harness inicial={ajustada} espiao={vi.fn()} />);
    expect(screen.getByText(/Metodologia de encargos/).textContent).toBe(
      "Metodologia de encargos (ajustada)",
    );
    expect(screen.getByText(/Até 31\/12\/2022/)).toBeDefined();
  });

  it("multa e honorários vêm com 10% cada (decisão de 13/10/2026), aceitam vírgula e recusam negativos; a data de elaboração é validada; observações livres", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    render(<Harness inicial={inicial} espiao={espiao} />);
    const multa = screen.getByLabelText("Multa (art. 523, %)") as HTMLInputElement;
    expect(multa.value).toBe("10");
    expect((screen.getByLabelText("Honorários (%)") as HTMLInputElement).value).toBe("10");
    await user.clear(multa);
    await user.type(multa, "0");
    expect(espiao.mock.lastCall?.[0].acrescimos).toEqual({
      multaPercentual: "0",
      honorariosPercentual: "10",
    });
    const honorarios = screen.getByLabelText("Honorários (%)");
    await user.clear(honorarios);
    await user.type(honorarios, "-5");
    expect(screen.getByRole("alert").textContent).toBe("O percentual não pode ser negativo.");
    expect(espiao.mock.lastCall?.[0].acrescimos.honorariosPercentual).toBe("10");
    await user.clear(honorarios);
    await user.type(honorarios, "12,5");
    expect(espiao.mock.lastCall?.[0].acrescimos.honorariosPercentual).toBe("12.5");
    fireEvent.change(screen.getByLabelText("Data de elaboração"), {
      target: { value: "2026-09-30" },
    });
    expect(espiao.mock.lastCall?.[0].dataElaboracao).toBe("2026-09-30");
    espiao.mockClear();
    fireEvent.change(screen.getByLabelText("Data de elaboração"), { target: { value: "" } });
    expect(espiao).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("Informe a data");
    await user.type(screen.getByLabelText("Observações para o relatório"), "Conforme a sentença.");
    expect(espiao.mock.lastCall?.[0].observacoes).toBe("Conforme a sentença.");
    await user.click(screen.getByRole("button", { name: "Ajustar" }));
    expect(espiao.mock.lastCall?.[0].observacoes).toBe("ajustar!");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/estado/metodologia.test.ts src/ui/secoes/Encargos.test.tsx`
Esperado: os dois arquivos falham ao importar (`Cannot find module './metodologia.ts'`, `Failed to resolve import "../estado/metodologia.ts"`); `Tests no tests`.

- [ ] **Step 3: Implementar**

`src/ui/estado/metodologia.ts`:

```ts
import { diaAnterior } from "../../compartilhado/datas.ts";
import { formatarData, formatarPercentual } from "../../compartilhado/formatacao.ts";
import { decimalOuNulo } from "../../compartilhado/decimal.ts";
import type {
  DataISO,
  IndiceCorrecao,
  Metodologia,
  PeriodoMetodologia,
  RegraJuros,
} from "../../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../../metodologias/padrao.ts";
import { periodosOrdenados } from "../../motor/periodos.ts";

/**
 * Edição da metodologia por períodos (§6.5, §9.2): resumo em uma frase para a tela, divisão de um
 * período numa data, remoção de uma divisão, troca de índice e de regra de juros em cada período
 * ("SELIC única" é uma escolha só: juros `selicUnica` e correção "nenhum"), incidência no mês
 * inicial e deflação. Toda função devolve uma cópia nova com `ajustada` recalculada (true quando
 * difere da metodologia padrão). Módulo puro.
 */

export type EscolhaDeJuros = "percentualMensal" | "taxaLegal" | "selicUnica";

/** Forma canônica (campos conhecidos, em ordem fixa, sem `ajustada`), para comparar metodologias. */
function canonico(m: Metodologia): string {
  return JSON.stringify({
    id: m.id,
    versao: m.versao,
    nome: m.nome,
    periodos: periodosOrdenados(m).map((p) => [
      p.de,
      p.ate,
      p.correcao.indice,
      p.juros.tipo,
      p.juros.tipo === "percentualMensal" ? p.juros.taxaMensal : null,
    ]),
    incidenciaMesInicial: m.incidenciaMesInicial,
    deflacao: m.deflacao,
    arredondamento: [
      m.arredondamento.fatorCasas,
      m.arredondamento.percentualCasas,
      m.arredondamento.valorCasas,
      m.arredondamento.modo,
    ],
  });
}

/** True quando a metodologia é, campo a campo, a padrão "TJMS/SAJ v1" (a ordem das chaves não importa). */
export function ehPadrao(m: Metodologia): boolean {
  return canonico(m) === canonico(metodologiaPadrao());
}

/** Cópia com `ajustada` recalculada e os períodos em ordem cronológica. */
export function normalizar(m: Metodologia): Metodologia {
  const ordenada: Metodologia = { ...structuredClone(m), periodos: periodosOrdenados(m) };
  return { ...ordenada, ajustada: !ehPadrao(ordenada) };
}

/** "Até 29/08/2024", "Desde 30/08/2024", "De 01/01/2020 a 31/12/2022" ou "Sempre". */
export function descreverIntervalo(p: Pick<PeriodoMetodologia, "de" | "ate">): string {
  if (p.de !== null && p.ate !== null) return `De ${formatarData(p.de)} a ${formatarData(p.ate)}`;
  if (p.de !== null) return `Desde ${formatarData(p.de)}`;
  if (p.ate !== null) return `Até ${formatarData(p.ate)}`;
  return "Sempre";
}

/** "IGP-M e juros de 1% ao mês", "IPCA e taxa legal", "SELIC única (correção e juros juntos)", "sem correção e sem juros". */
export function descreverRegras(p: PeriodoMetodologia): string {
  if (p.juros.tipo === "selicUnica") return "SELIC única (correção e juros juntos)";
  const correcao = p.correcao.indice === "nenhum" ? "sem correção" : p.correcao.indice;
  if (p.juros.tipo === "taxaLegal") return `${correcao} e taxa legal`;
  const taxa = decimalOuNulo(p.juros.taxaMensal);
  const juros =
    taxa === null
      ? `juros de "${p.juros.taxaMensal}" ao mês (taxa inválida)`
      : taxa.isZero()
        ? "sem juros"
        : `juros de ${formatarPercentual(taxa, taxa.decimalPlaces() > 2 ? taxa.decimalPlaces() : taxa.decimalPlaces() === 0 ? 0 : 2)} ao mês`;
  return `${correcao} e ${juros}`;
}

/** Resumo em uma frase (§9.2): "Até 29/08/2024: IGP-M e juros de 1% ao mês. Desde 30/08/2024: IPCA e taxa legal." */
export function resumirMetodologia(m: Metodologia): string {
  const periodos = periodosOrdenados(m);
  if (periodos.length === 0) return "Sem períodos: nenhum lançamento recebe correção nem juros.";
  return periodos.map((p) => `${descreverIntervalo(p)}: ${descreverRegras(p)}.`).join(" ");
}

/**
 * Divide na data o período que a contém: [de, véspera] e [data, até], com as mesmas regras.
 * Data que já é início de período, ou fora de todos os períodos, não divide (devolve o aviso).
 */
export function dividirPeriodo(
  m: Metodologia,
  data: DataISO,
): { metodologia: Metodologia; aviso?: string } {
  const periodos = periodosOrdenados(m);
  const indice = periodos.findIndex(
    (p) => (p.de === null || p.de <= data) && (p.ate === null || data <= p.ate),
  );
  const alvo = periodos[indice];
  if (alvo === undefined) {
    return {
      metodologia: m,
      aviso: `Nenhum período cobre ${formatarData(data)}: nada foi dividido.`,
    };
  }
  if (alvo.de === data) {
    return { metodologia: m, aviso: `Já existe uma divisão em ${formatarData(data)}.` };
  }
  const antes: PeriodoMetodologia = { ...structuredClone(alvo), ate: diaAnterior(data) };
  const depois: PeriodoMetodologia = { ...structuredClone(alvo), de: data };
  return {
    metodologia: normalizar({
      ...m,
      periodos: [...periodos.slice(0, indice), antes, depois, ...periodos.slice(indice + 1)],
    }),
  };
}

/** Remove a divisão que começa o período `indice` (≥ 1): ele é absorvido pelo anterior, que mantém as próprias regras. */
export function removerDivisao(m: Metodologia, indice: number): Metodologia {
  const periodos = periodosOrdenados(m);
  const anterior = periodos[indice - 1];
  const removido = periodos[indice];
  if (indice < 1 || anterior === undefined || removido === undefined) return m;
  const fundido: PeriodoMetodologia = { ...structuredClone(anterior), ate: removido.ate };
  return normalizar({
    ...m,
    periodos: [...periodos.slice(0, indice - 1), fundido, ...periodos.slice(indice + 1)],
  });
}

/** Troca o índice de correção do período; com SELIC única, o índice é sempre "nenhum". */
export function escolherIndice(
  m: Metodologia,
  indice: number,
  correcao: IndiceCorrecao,
): Metodologia {
  const periodos = periodosOrdenados(m);
  const alvo = periodos[indice];
  if (alvo === undefined) return m;
  const novo: PeriodoMetodologia = {
    ...structuredClone(alvo),
    correcao: { indice: alvo.juros.tipo === "selicUnica" ? "nenhum" : correcao },
  };
  return normalizar({ ...m, periodos: periodos.with(indice, novo) });
}

/**
 * Troca a regra de juros do período: "percentualMensal" mantém a taxa que havia (ou 1% ao mês),
 * "taxaLegal" não tem taxa, e "selicUnica" é uma escolha só: zera também o índice de correção.
 */
export function escolherJuros(
  m: Metodologia,
  indice: number,
  escolha: EscolhaDeJuros,
): Metodologia {
  const periodos = periodosOrdenados(m);
  const alvo = periodos[indice];
  if (alvo === undefined) return m;
  const juros: RegraJuros =
    escolha === "percentualMensal"
      ? {
          tipo: "percentualMensal",
          taxaMensal: alvo.juros.tipo === "percentualMensal" ? alvo.juros.taxaMensal : "1",
        }
      : { tipo: escolha };
  const novo: PeriodoMetodologia = {
    ...structuredClone(alvo),
    juros,
    correcao: { indice: escolha === "selicUnica" ? "nenhum" : alvo.correcao.indice },
  };
  return normalizar({ ...m, periodos: periodos.with(indice, novo) });
}

/** Troca a taxa mensal do período (só faz sentido com juros "percentualMensal"). */
export function escolherTaxa(m: Metodologia, indice: number, taxaMensal: string): Metodologia {
  const periodos = periodosOrdenados(m);
  const alvo = periodos[indice];
  if (alvo === undefined || alvo.juros.tipo !== "percentualMensal") return m;
  const novo: PeriodoMetodologia = {
    ...structuredClone(alvo),
    juros: { tipo: "percentualMensal", taxaMensal },
  };
  return normalizar({ ...m, periodos: periodos.with(indice, novo) });
}

export function escolherOpcoes(
  m: Metodologia,
  opcoes: Partial<Pick<Metodologia, "incidenciaMesInicial" | "deflacao">>,
): Metodologia {
  return normalizar({ ...m, ...opcoes });
}

/** De volta à metodologia padrão "TJMS/SAJ v1". */
export function restaurarPadrao(): Metodologia {
  return metodologiaPadrao();
}
```

`src/ui/secoes/Encargos.tsx`:

```tsx
import type { Calculo } from "../../compartilhado/tipos.ts";
import { Ajuda } from "../componentes/Ajuda.tsx";
import { CampoArea, CampoTexto, useCampoValidado } from "../componentes/Campo.tsx";
import { formatarNumeroParaCampo, lerData, lerPercentual } from "../entrada.ts";
import { resumirMetodologia } from "../estado/metodologia.ts";

/**
 * Seção "5 · Encargos e data do cálculo" (§9.2; explicações nos balões ⓘ): metodologia com
 * resumo em uma frase e "Ajustar" (abre o editor de períodos), multa e honorários do art. 523,
 * §1º, do CPC (10% cada por padrão, decisão de 13/10/2026), data de elaboração e observações para
 * o relatório.
 */
export function Encargos({
  calculo,
  aoMudarAcrescimo,
  aoMudarDataElaboracao,
  aoMudarObservacoes,
  aoAjustar,
}: {
  calculo: Calculo;
  aoMudarAcrescimo: (campo: "multaPercentual" | "honorariosPercentual", valor: string) => void;
  aoMudarDataElaboracao: (data: string) => void;
  aoMudarObservacoes: (texto: string) => void;
  aoAjustar: () => void;
}) {
  const multa = useCampoValidado({
    valorGuardado: calculo.acrescimos.multaPercentual,
    paraTexto: formatarNumeroParaCampo,
    ler: lerPercentual,
    aoValidar: (v) => aoMudarAcrescimo("multaPercentual", v),
  });
  const honorarios = useCampoValidado({
    valorGuardado: calculo.acrescimos.honorariosPercentual,
    paraTexto: formatarNumeroParaCampo,
    ler: lerPercentual,
    aoValidar: (v) => aoMudarAcrescimo("honorariosPercentual", v),
  });
  const data = useCampoValidado({
    valorGuardado: calculo.dataElaboracao,
    paraTexto: (d) => d,
    ler: lerData,
    aoValidar: aoMudarDataElaboracao,
  });
  const ajustada = calculo.metodologia.ajustada;
  return (
    <section className="secao" aria-labelledby="titulo-encargos">
      <div className="titulo-secao">
        <h2 id="titulo-encargos">5 · Encargos e data do cálculo</h2>
      </div>
      <div className="linha">
        <div className="campo largo">
          <span className="rotulo-do-campo">
            <span className="rotulo-estatico" id="rotulo-metodologia">
              Metodologia de encargos{ajustada ? " (ajustada)" : " (padrão)"}
            </span>
            <Ajuda assunto="Metodologia de encargos">
              Correção pelo índice de cada período, proporcional aos dias restantes do mês do
              vencimento ou do pagamento (pro rata); juros simples sobre o valor corrigido; a
              transição de 30/08/2024 (Lei 14.905/2024) já vem pronta. Em "Ajustar" dá para dividir
              períodos, trocar índices e taxas e escolher SELIC única, incidência no mês inicial e
              tratamento de índices negativos.
            </Ajuda>
          </span>
          <p className="resumo-metodologia" aria-labelledby="rotulo-metodologia">
            {resumirMetodologia(calculo.metodologia)}
          </p>
        </div>
        <button type="button" className="botao secundario" onClick={aoAjustar}>
          Ajustar
        </button>
      </div>
      <div className="linha">
        <CampoTexto
          id="multa"
          rotulo="Multa (art. 523, %)"
          ajuda="Multa do art. 523, §1º, do CPC (rito da penhora), sobre o total devido; os honorários não incidem sobre ela, nem ela sobre eles. Vem com 10%, o percentual da lei; no rito da prisão, ponha 0."
          valor={multa.texto}
          aoMudar={multa.aoMudar}
          aoSair={multa.aoSair}
          erro={multa.erro}
          inputMode="decimal"
          classe="curto"
        />
        <CampoTexto
          id="honorarios"
          rotulo="Honorários (%)"
          ajuda="Honorários do art. 523, §1º, do CPC (rito da penhora), sobre o total devido, sem incidir sobre a multa. Vêm com 10%, o percentual da lei; no rito da prisão, ponha 0."
          valor={honorarios.texto}
          aoMudar={honorarios.aoMudar}
          aoSair={honorarios.aoSair}
          erro={honorarios.erro}
          inputMode="decimal"
          classe="curto"
        />
        <CampoTexto
          id="data-elaboracao"
          rotulo="Data de elaboração"
          ajuda="Data até a qual tudo é atualizado. O padrão é hoje."
          tipo="date"
          valor={data.texto}
          aoMudar={data.aoMudar}
          erro={data.erro}
          min="1900-01-01"
        />
      </div>
      <CampoArea
        id="observacoes"
        rotulo="Observações para o relatório"
        valor={calculo.observacoes}
        aoMudar={aoMudarObservacoes}
        classe="largo"
        ajuda='Texto livre que sai no bloco "Metodologia e fundamentos" do relatório (ex.: "Conforme sentença de fls. 45").'
      />
    </section>
  );
}
```

`src/ui/App.tsx` (reescrito; acrescenta a seção 5 depois da base; "Ajustar" ainda não faz nada):

```tsx
import { useMemo, useReducer, useState } from "react";
import { calcular } from "../motor/calcular.ts";
import { ambientePadrao, type Ambiente } from "./ambiente.ts";
import { CHAVE_RECENTES, removerChave } from "./armazenamento.ts";
import { BarraSuperior } from "./BarraSuperior.tsx";
import { Avisos } from "./componentes/Avisos.tsx";
import { estadoInicial, novoCalculo, reduzir } from "./estado/calculo.ts";
import "./estilos.css";
import {
  esquecer,
  gravarPreferencias,
  lerPreferencias,
  type Preferencias,
} from "./preferencias.ts";
import { Rodape } from "./Rodape.tsx";
import { BaseDosAlimentos } from "./secoes/Base.tsx";
import { Encargos } from "./secoes/Encargos.tsx";
import { Processo } from "./secoes/Processo.tsx";

/**
 * Tela única em duas colunas (§9): esquerda, dados do caso e lançamentos em lote; direita,
 * resultado e lançamentos individuais. Recálculo a cada alteração, sem botão "Calcular" (§4.3).
 * O `ambiente` é injetável para os testes de componente.
 */
export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambiente }) {
  const armazenamento = ambiente.armazenamento();
  const [preferencias, setPreferencias] = useState(() => lerPreferencias(armazenamento));
  const calculoNovo = (p: Preferencias) =>
    novoCalculo({
      id: ambiente.novoId(),
      agora: ambiente.agora(),
      hoje: ambiente.hoje(),
      cabecalho: p.lembrar ? { defensor: p.defensor, orgao: p.orgao } : {},
    });
  // A tabela de índices é congelada quando o app abre (§8.2); "Novo cálculo" congela outra.
  const [estado, despachar] = useReducer(reduzir, undefined, () =>
    estadoInicial(calculoNovo(preferencias), ambiente.congelar()),
  );
  const resultado = useMemo(
    () => calcular(estado.calculo, estado.tabela),
    [estado.calculo, estado.tabela],
  );
  const agora = () => ambiente.agora();

  const novo = () =>
    despachar({ tipo: "novo", calculo: calculoNovo(preferencias), ...ambiente.congelar() });

  const mudarPreferencias = (mudancas: Partial<Preferencias>) => {
    const novas = { ...preferencias, ...mudancas };
    setPreferencias(novas);
    gravarPreferencias(armazenamento, novas);
    if (mudancas.guardarRecentes === false) removerChave(armazenamento, CHAVE_RECENTES);
  };
  const mudarCabecalho = (campo: keyof typeof estado.calculo.cabecalho, valor: string) => {
    despachar({ tipo: "cabecalho", campo, valor, em: agora() });
    if ((campo === "defensor" || campo === "orgao") && preferencias.lembrar) {
      mudarPreferencias({ [campo]: valor });
    }
  };
  const esquecerTudo = () => {
    esquecer(armazenamento);
    const novas = { ...preferencias, defensor: "", orgao: "", lembrar: false };
    setPreferencias(novas);
    gravarPreferencias(armazenamento, novas);
  };

  return (
    <div className="app">
      <BarraSuperior aoNovo={novo} />
      <main className="principal">
        <div className="coluna-esquerda" key={estado.calculo.id}>
          <Processo
            cabecalho={estado.calculo.cabecalho}
            aoMudar={mudarCabecalho}
            preferencias={preferencias}
            aoMudarPreferencias={mudarPreferencias}
            aoEsquecer={esquecerTudo}
            armazenamentoDisponivel={armazenamento !== null}
          />
          <BaseDosAlimentos
            base={estado.calculo.base}
            hoje={ambiente.hoje()}
            aoMudar={(base) => despachar({ tipo: "base", base, em: agora() })}
          />
          <Encargos
            calculo={estado.calculo}
            aoMudarAcrescimo={(campo, valor) =>
              despachar({ tipo: "acrescimos", campo, valor, em: agora() })
            }
            aoMudarDataElaboracao={(data) =>
              despachar({ tipo: "dataElaboracao", data, em: agora() })
            }
            aoMudarObservacoes={(texto) => despachar({ tipo: "observacoes", texto, em: agora() })}
            aoAjustar={() => undefined}
          />
        </div>
        <div className="coluna-direita">
          <Avisos avisos={[...estado.situacao.avisos, ...resultado.avisos]} />
        </div>
      </main>
      <Rodape situacaoDosIndices={estado.situacao.rodape} />
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/ui/estado/metodologia.test.ts src/ui/secoes/Encargos.test.tsx`
Esperado: `10 passed (10)` (8 do módulo, 2 da seção).

- [ ] **Step 5: Verificação completa**

Run: `npm run format && npm run verificar`
Esperado: `741 passed | 9 skipped (750)` em 34 arquivos.

- [ ] **Step 6: Commit**

```bash
git add src/ui/estado/metodologia.ts src/ui/estado/metodologia.test.ts src/ui/secoes/Encargos.tsx src/ui/secoes/Encargos.test.tsx src/ui/App.tsx
git commit -m "ui: seção Encargos e data do cálculo, com o resumo da metodologia e a edição por períodos (módulo puro)

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 8: Painel modal acessível e editor de períodos ("Ajustar")

**Files:**
- Create: `src/ui/componentes/Dialogo.tsx`, `src/ui/secoes/EditorDePeriodos.tsx`
- Modify (reescrito): `src/ui/App.tsx`, `src/ui/App.test.tsx` (ganha o teste do editor)
- Test: `src/ui/componentes/Dialogo.test.tsx`, `src/ui/secoes/EditorDePeriodos.test.tsx`, `src/ui/App.test.tsx`

**Interfaces:**
- Consumes: tudo de `estado/metodologia.ts` (Task 7); `validarMetodologia`, `periodosOrdenados`; `Avisos`, `CampoSelecao`, `CampoTexto`, `Opcao`, `useCampoValidado`; `lerData`, `lerPercentual`, `formatarNumeroParaCampo`; ação `metodologia` (Task 4).
- Produces: `Dialogo({ titulo, aberto, aoFechar, children })` (papel `dialog`, `aria-modal`, título por `aria-labelledby`, foco no primeiro controle, Esc, Tab circular, clique no fundo); `EditorDePeriodos({ metodologia, aoMudar, prefixoDosIds? })`. Rótulos: "Período N · <intervalo>", "Índice de correção" (IGP-M, INPC, IPCA, nenhum), "Juros" (`percentualMensal` "percentual mensal fixo", `taxaLegal` "taxa legal (art. 406 do CC, desde 30/08/2024)", `selicUnica` "SELIC única (Tema 1.368 do STJ)"), "Taxa mensal (%)", "Remover divisão" (`aria-label` "Remover a divisão de dd/mm/aaaa"), "Dividir em uma data", "Dividir", incidência ("proporcional aos dias restantes do mês (pro rata)" / "só a partir do mês seguinte"), deflação ("aplicar, sem deixar o corrigido abaixo do original (piso)" / "aplicar sem piso" / "ignorar os meses negativos"), "Avisos da metodologia", "Restaurar a metodologia padrão"; a explicação de "Dividir em uma data" fica no balão ⓘ, e a frase da SELIC única continua visível (é um aviso). O App abre o editor no painel "Ajustar a metodologia de encargos", com "Fechar".

- [ ] **Step 1: Escrever os testes**

`src/ui/componentes/Dialogo.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Dialogo } from "./Dialogo.tsx";

afterEach(cleanup);

function Exemplo() {
  const [aberto, setAberto] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setAberto(true)}>
        Abrir painel
      </button>
      <Dialogo titulo="Painel de teste" aberto={aberto} aoFechar={() => setAberto(false)}>
        <label htmlFor="a">Primeiro</label>
        <input id="a" />
        <button type="button" onClick={() => setAberto(false)}>
          Fechar
        </button>
      </Dialogo>
    </div>
  );
}

describe("Dialogo (painel modal acessível)", () => {
  it("abre com o foco no primeiro campo, tem título ligado, fecha com Esc e devolve o foco ao botão", async () => {
    const user = userEvent.setup();
    render(<Exemplo />);
    expect(screen.queryByRole("dialog")).toBeNull();
    const abrir = screen.getByRole("button", { name: "Abrir painel" });
    await user.click(abrir);
    const dialogo = screen.getByRole("dialog", { name: "Painel de teste" });
    expect(dialogo.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(screen.getByLabelText("Primeiro"));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(abrir);
  });

  it("Tab circula dentro do painel; o clique no fundo fecha", async () => {
    const user = userEvent.setup();
    render(<Exemplo />);
    await user.click(screen.getByRole("button", { name: "Abrir painel" }));
    const campo = screen.getByLabelText("Primeiro");
    const fechar = screen.getByRole("button", { name: "Fechar" });
    expect(document.activeElement).toBe(campo);
    await user.tab();
    expect(document.activeElement).toBe(fechar);
    await user.tab();
    expect(document.activeElement).toBe(campo);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(fechar);
    const fundo = screen.getByRole("dialog").parentElement as HTMLElement;
    fireEvent.mouseDown(fundo);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
```

`src/ui/secoes/EditorDePeriodos.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Metodologia } from "../../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../../metodologias/padrao.ts";
import { EditorDePeriodos } from "./EditorDePeriodos.tsx";

afterEach(cleanup);

function Harness({ inicial, espiao }: { inicial: Metodologia; espiao: (m: Metodologia) => void }) {
  const [metodologia, setMetodologia] = useState(inicial);
  return (
    <EditorDePeriodos
      metodologia={metodologia}
      aoMudar={(m) => {
        setMetodologia(m);
        espiao(m);
      }}
    />
  );
}

function titulos(): string[] {
  return screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent ?? "");
}

describe("Editor de períodos (§6.5)", () => {
  it("mostra os períodos da metodologia padrão; divide numa data e remove a divisão", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    render(<Harness inicial={metodologiaPadrao()} espiao={espiao} />);
    expect(titulos()).toEqual(["Período 1 · Até 29/08/2024", "Período 2 · Desde 30/08/2024"]);
    expect(screen.queryByRole("button", { name: /Restaurar/ })).toBeNull();
    fireEvent.change(screen.getByLabelText("Dividir em uma data"), {
      target: { value: "2023-01-01" },
    });
    await user.click(screen.getByRole("button", { name: "Dividir" }));
    expect(titulos()).toEqual([
      "Período 1 · Até 31/12/2022",
      "Período 2 · De 01/01/2023 a 29/08/2024",
      "Período 3 · Desde 30/08/2024",
    ]);
    expect(espiao.mock.lastCall?.[0].ajustada).toBe(true);
    // dividir de novo na mesma data avisa e não muda nada
    await user.click(screen.getByRole("button", { name: "Dividir" }));
    expect(screen.getByRole("alert").textContent).toBe("Já existe uma divisão em 01/01/2023.");
    expect(titulos()).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "Remover a divisão de 01/01/2023" }));
    expect(titulos()).toEqual(["Período 1 · Até 29/08/2024", "Período 2 · Desde 30/08/2024"]);
    expect(espiao.mock.lastCall?.[0]).toEqual(metodologiaPadrao());
  });

  it("troca índice, juros e taxa de um período; a taxa inválida fica no campo com erro", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    render(<Harness inicial={metodologiaPadrao()} espiao={espiao} />);
    const indices = screen.getAllByLabelText("Índice de correção");
    await user.selectOptions(indices[0] as HTMLElement, "INPC");
    expect(espiao.mock.lastCall?.[0].periodos[0].correcao).toEqual({ indice: "INPC" });
    const taxas = screen.getAllByLabelText("Taxa mensal (%)");
    expect(taxas).toHaveLength(1);
    await user.clear(taxas[0] as HTMLElement);
    await user.type(taxas[0] as HTMLElement, "0,5");
    expect(espiao.mock.lastCall?.[0].periodos[0].juros).toEqual({
      tipo: "percentualMensal",
      taxaMensal: "0.5",
    });
    await user.type(taxas[0] as HTMLElement, "x");
    expect(screen.getByRole("alert").textContent).toContain("Use vírgula");
    expect(espiao.mock.lastCall?.[0].periodos[0].juros.taxaMensal).toBe("0.5");
    const juros = screen.getAllByLabelText("Juros");
    await user.selectOptions(juros[1] as HTMLElement, "percentualMensal");
    expect(espiao.mock.lastCall?.[0].periodos[1].juros).toEqual({
      tipo: "percentualMensal",
      taxaMensal: "1",
    });
    expect(screen.getAllByLabelText("Taxa mensal (%)")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: /Restaurar a metodologia padrão/ }));
    expect(espiao.mock.lastCall?.[0]).toEqual(metodologiaPadrao());
  });

  it("'SELIC única' é uma escolha só: zera o índice, trava o seletor e explica", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    render(<Harness inicial={metodologiaPadrao()} espiao={espiao} />);
    const juros = screen.getAllByLabelText("Juros");
    await user.selectOptions(juros[0] as HTMLElement, "selicUnica");
    expect(espiao.mock.lastCall?.[0].periodos[0]).toEqual({
      de: null,
      ate: "2024-08-29",
      correcao: { indice: "nenhum" },
      juros: { tipo: "selicUnica" },
    });
    const indices = screen.getAllByLabelText("Índice de correção") as HTMLSelectElement[];
    expect(indices[0]?.disabled).toBe(true);
    expect(indices[0]?.value).toBe("nenhum");
    expect(screen.getByText(/A SELIC capitalizada já inclui correção e juros/)).toBeDefined();
    expect(screen.queryByRole("region", { name: "Avisos da metodologia" })).toBeNull();
  });

  it("incidência e deflação; avisos de validação para uma metodologia com lacuna (vinda de arquivo)", async () => {
    const user = userEvent.setup();
    const espiao = vi.fn();
    const comLacuna: Metodologia = {
      ...metodologiaPadrao(),
      ajustada: true,
      periodos: [
        {
          de: null,
          ate: "2024-08-29",
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "1" },
        },
        { de: "2024-09-15", ate: null, correcao: { indice: "IPCA" }, juros: { tipo: "taxaLegal" } },
      ],
    };
    render(<Harness inicial={comLacuna} espiao={espiao} />);
    expect(screen.getByRole("region", { name: "Avisos da metodologia" }).textContent).toContain(
      "A metodologia não cobre o período de 30/08/2024 a 14/09/2024",
    );
    await user.click(screen.getByLabelText("só a partir do mês seguinte"));
    expect(espiao.mock.lastCall?.[0].incidenciaMesInicial).toBe("mesSeguinte");
    await user.click(screen.getByLabelText("ignorar os meses negativos"));
    expect(espiao.mock.lastCall?.[0].deflacao).toBe("zerarNegativos");
    await user.click(screen.getByLabelText("aplicar sem piso"));
    expect(espiao.mock.lastCall?.[0].deflacao).toBe("aplicarSemPiso");
  });
});
```

`src/ui/App.test.tsx` (reescrito; acrescenta o teste "'Ajustar' abre o editor de períodos num painel…"):

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App.tsx";
import { ambienteDeTeste } from "./testes/ambiente-de-teste.ts";

afterEach(cleanup);

describe("App (fundação da tela)", () => {
  it("mostra o nome do sistema, as quatro ações da barra e o rodapé com a situação dos índices", () => {
    render(<App ambiente={ambienteDeTeste()} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Apura · Sistema de Cálculos Judiciais · DPE-MS",
    );
    for (const nome of ["Novo cálculo", "Abrir", "Salvar"]) {
      expect(screen.getByRole("button", { name: nome })).toBeDefined();
    }
    const relatorio = screen.getByRole("button", { name: "Relatório / PDF" }) as HTMLButtonElement;
    expect(relatorio.disabled).toBe(true);
    const rodape = screen.getByRole("contentinfo").textContent ?? "";
    expect(rodape).toContain(
      "Índices oficiais BCB/SGS · IPCA até set/2026 · atualizados em 11/10/2026 09:00 (horário de Brasília)",
    );
    expect(rodape).toMatch(/Apura v\d+\.\d+\.\d+ · Defensoria Pública de Mato Grosso do Sul/);
    // com a tabela em dia, não há aviso do calendário
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).not.toContain(
      "ainda não chegou ao Apura",
    );
  });

  it("mostra na caixa de avisos os meses já divulgados que ainda não chegaram ao Apura", () => {
    render(<App ambiente={ambienteDeTeste({ limites: { "433": "2026-07" } })} />);
    const avisos = screen.getByRole("region", { name: "Avisos" });
    expect(avisos.textContent).toContain(
      "IPCA de ago/2026, divulgado por volta de 10/09/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
    );
  });

  it("congela a tabela ao abrir e de novo em 'Novo cálculo'; o cálculo em branco mostra 'Nenhum lançamento.'", async () => {
    const ambiente = ambienteDeTeste();
    render(<App ambiente={ambiente} />);
    expect(ambiente.congelamentos()).toBe(1);
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).toContain(
      "Nenhum lançamento.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Novo cálculo" }));
    expect(ambiente.congelamentos()).toBe(2);
  });

  it("'Ajustar' abre o editor de períodos num painel; a mudança reflete no resumo; Esc fecha", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    await user.click(screen.getByRole("button", { name: "Ajustar" }));
    const painel = screen.getByRole("dialog", { name: "Ajustar a metodologia de encargos" });
    expect(painel).toBeDefined();
    await user.selectOptions(
      within(painel).getAllByLabelText("Índice de correção")[0] as HTMLElement,
      "INPC",
    );
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(/Até 29\/08\/2024/).textContent).toBe(
      "Até 29/08/2024: INPC e juros de 1% ao mês. Desde 30/08/2024: IPCA e taxa legal.",
    );
    expect(screen.getByText(/Metodologia de encargos/).textContent).toBe(
      "Metodologia de encargos (ajustada)",
    );
  });

  it("abre com a cópia publicada quando nenhum ambiente é injetado (sem rede)", () => {
    render(<App />);
    expect(screen.getByRole("contentinfo").textContent).toContain("Índices oficiais BCB/SGS");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/componentes/Dialogo.test.tsx src/ui/secoes/EditorDePeriodos.test.tsx src/ui/App.test.tsx`
Esperado: `Dialogo.test.tsx` e `EditorDePeriodos.test.tsx` falham ao importar; em `App.test.tsx`, `1 failed | 4 passed (5)`: "'Ajustar' abre o editor de períodos num painel…" com `Unable to find an accessible element with the role "dialog" and name "Ajustar a metodologia de encargos"`.

- [ ] **Step 3: Implementar**

`src/ui/componentes/Dialogo.tsx`:

```tsx
import { useEffect, useId, useRef, type ReactNode } from "react";

const FOCAVEIS =
  'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/**
 * Painel modal acessível, sem `<dialog>` nativo (o jsdom dos testes não o implementa): papel
 * "dialog" com `aria-modal`, título ligado por `aria-labelledby`, foco no primeiro campo ao abrir
 * e de volta ao botão que abriu ao fechar, Esc fecha, Tab circula dentro do painel e um clique no
 * fundo fecha. Nenhuma janela pop-up do navegador (§9.4).
 */
export function Dialogo({
  titulo,
  aberto,
  aoFechar,
  children,
}: {
  titulo: string;
  aberto: boolean;
  aoFechar: () => void;
  children: ReactNode;
}) {
  const tituloId = useId();
  const painel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement;
    painel.current?.querySelector<HTMLElement>(FOCAVEIS)?.focus();
    return () => {
      if (anterior instanceof HTMLElement) anterior.focus();
    };
  }, [aberto]);

  if (!aberto) return null;

  const aoTeclar = (evento: React.KeyboardEvent<HTMLDivElement>) => {
    if (evento.key === "Escape") {
      evento.stopPropagation();
      aoFechar();
      return;
    }
    if (evento.key !== "Tab" || !painel.current) return;
    const focaveis = [...painel.current.querySelectorAll<HTMLElement>(FOCAVEIS)];
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (!primeiro || !ultimo) return;
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  };

  return (
    <div
      className="dialogo-fundo"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) aoFechar();
      }}
    >
      <div
        className="dialogo"
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        ref={painel}
        onKeyDown={aoTeclar}
      >
        <h2 id={tituloId}>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}
```

`src/ui/secoes/EditorDePeriodos.tsx`:

```tsx
import { useState } from "react";
import type { IndiceCorrecao, Metodologia, PeriodoMetodologia } from "../../compartilhado/tipos.ts";
import { periodosOrdenados, validarMetodologia } from "../../motor/periodos.ts";
import { Avisos } from "../componentes/Avisos.tsx";
import { CampoSelecao, CampoTexto, Opcao, useCampoValidado } from "../componentes/Campo.tsx";
import { formatarNumeroParaCampo, lerData, lerPercentual } from "../entrada.ts";
import {
  descreverIntervalo,
  dividirPeriodo,
  escolherIndice,
  escolherJuros,
  escolherOpcoes,
  escolherTaxa,
  removerDivisao,
  restaurarPadrao,
  type EscolhaDeJuros,
} from "../estado/metodologia.ts";
import { formatarData } from "../../compartilhado/formatacao.ts";

/**
 * Editor de períodos (§6.5, §9.2): lista de períodos (de/até) com índice de correção e regra de
 * juros em cada um, "Dividir em uma data" e "Remover divisão", incidência no mês inicial e
 * tratamento da deflação. Serve à metodologia global e à metodologia própria de um lançamento. As
 * mudanças valem na hora; os avisos de `validarMetodologia` aparecem embaixo.
 */

const OPCOES_DE_INDICE: ReadonlyArray<{ valor: IndiceCorrecao; rotulo: string }> = [
  { valor: "IGP-M", rotulo: "IGP-M" },
  { valor: "INPC", rotulo: "INPC" },
  { valor: "IPCA", rotulo: "IPCA" },
  { valor: "nenhum", rotulo: "nenhum (sem correção)" },
];

const OPCOES_DE_JUROS: ReadonlyArray<{ valor: EscolhaDeJuros; rotulo: string }> = [
  { valor: "percentualMensal", rotulo: "percentual mensal fixo" },
  { valor: "taxaLegal", rotulo: "taxa legal (art. 406 do CC, desde 30/08/2024)" },
  { valor: "selicUnica", rotulo: "SELIC única (Tema 1.368 do STJ)" },
];

export function EditorDePeriodos({
  metodologia,
  aoMudar,
  prefixoDosIds = "periodo",
}: {
  metodologia: Metodologia;
  aoMudar: (metodologia: Metodologia) => void;
  /** prefixo dos ids dos campos, para dois editores não colidirem */
  prefixoDosIds?: string;
}) {
  const periodos = periodosOrdenados(metodologia);
  const [avisoDaDivisao, setAvisoDaDivisao] = useState<string | null>(null);
  const [dataDaDivisao, setDataDaDivisao] = useState("");
  const dividir = () => {
    const leitura = lerData(dataDaDivisao);
    if (!leitura.ok) {
      setAvisoDaDivisao(leitura.erro);
      return;
    }
    const { metodologia: nova, aviso } = dividirPeriodo(metodologia, leitura.valor);
    setAvisoDaDivisao(aviso ?? null);
    if (aviso === undefined) aoMudar(nova);
  };
  return (
    <div className="editor-de-periodos">
      {periodos.map((periodo, i) => (
        <Periodo
          key={`${periodo.de ?? "inicio"}-${periodo.ate ?? "fim"}`}
          periodo={periodo}
          indice={i}
          prefixo={prefixoDosIds}
          aoEscolherIndice={(v) => aoMudar(escolherIndice(metodologia, i, v))}
          aoEscolherJuros={(v) => aoMudar(escolherJuros(metodologia, i, v))}
          aoEscolherTaxa={(v) => aoMudar(escolherTaxa(metodologia, i, v))}
          aoRemover={i > 0 ? () => aoMudar(removerDivisao(metodologia, i)) : undefined}
        />
      ))}
      <div className="linha">
        <CampoTexto
          id={`${prefixoDosIds}-dividir-em`}
          rotulo="Dividir em uma data"
          ajuda="A data informada passa a iniciar um período novo, com as mesmas regras do anterior; depois ajuste índice e juros de cada um. Ex.: IGP-M e 1% ao mês até 2022, IPCA e 2% ao mês desde 2023. A divisão de 30/08/2024 é a transição da Lei 14.905/2024."
          tipo="date"
          valor={dataDaDivisao}
          aoMudar={(v) => {
            setDataDaDivisao(v);
            setAvisoDaDivisao(null);
          }}
          erro={avisoDaDivisao}
          min="1900-01-01"
        />
        <button type="button" className="botao secundario" onClick={dividir}>
          Dividir
        </button>
      </div>
      <fieldset className="grupo">
        <legend>Mês inicial de cada lançamento (vencimento ou pagamento)</legend>
        <Opcao
          tipo="radio"
          nome={`${prefixoDosIds}-incidencia`}
          rotulo="proporcional aos dias restantes do mês (pro rata)"
          marcado={metodologia.incidenciaMesInicial === "proRata"}
          aoMudar={() => aoMudar(escolherOpcoes(metodologia, { incidenciaMesInicial: "proRata" }))}
        />
        <Opcao
          tipo="radio"
          nome={`${prefixoDosIds}-incidencia`}
          rotulo="só a partir do mês seguinte"
          marcado={metodologia.incidenciaMesInicial === "mesSeguinte"}
          aoMudar={() =>
            aoMudar(escolherOpcoes(metodologia, { incidenciaMesInicial: "mesSeguinte" }))
          }
        />
      </fieldset>
      <fieldset className="grupo">
        <legend>Índices negativos (deflação)</legend>
        <Opcao
          tipo="radio"
          nome={`${prefixoDosIds}-deflacao`}
          rotulo="aplicar, sem deixar o corrigido abaixo do original (piso)"
          marcado={metodologia.deflacao === "aplicarComPiso"}
          aoMudar={() => aoMudar(escolherOpcoes(metodologia, { deflacao: "aplicarComPiso" }))}
        />
        <Opcao
          tipo="radio"
          nome={`${prefixoDosIds}-deflacao`}
          rotulo="aplicar sem piso"
          marcado={metodologia.deflacao === "aplicarSemPiso"}
          aoMudar={() => aoMudar(escolherOpcoes(metodologia, { deflacao: "aplicarSemPiso" }))}
        />
        <Opcao
          tipo="radio"
          nome={`${prefixoDosIds}-deflacao`}
          rotulo="ignorar os meses negativos"
          marcado={metodologia.deflacao === "zerarNegativos"}
          aoMudar={() => aoMudar(escolherOpcoes(metodologia, { deflacao: "zerarNegativos" }))}
        />
      </fieldset>
      <Avisos avisos={validarMetodologia(metodologia)} titulo="Avisos da metodologia" />
      {metodologia.ajustada ? (
        <div className="linha">
          <button
            type="button"
            className="botao discreto"
            onClick={() => aoMudar(restaurarPadrao())}
          >
            Restaurar a metodologia padrão
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Periodo({
  periodo,
  indice,
  prefixo,
  aoEscolherIndice,
  aoEscolherJuros,
  aoEscolherTaxa,
  aoRemover,
}: {
  periodo: PeriodoMetodologia;
  indice: number;
  prefixo: string;
  aoEscolherIndice: (indice: IndiceCorrecao) => void;
  aoEscolherJuros: (juros: EscolhaDeJuros) => void;
  aoEscolherTaxa: (taxa: string) => void;
  aoRemover?: () => void;
}) {
  const selic = periodo.juros.tipo === "selicUnica";
  const taxa = useCampoValidado({
    valorGuardado: periodo.juros.tipo === "percentualMensal" ? periodo.juros.taxaMensal : "",
    paraTexto: formatarNumeroParaCampo,
    ler: lerPercentual,
    aoValidar: aoEscolherTaxa,
  });
  const id = `${prefixo}-${indice}`;
  return (
    <div className="periodo">
      <h3>
        Período {indice + 1} · {descreverIntervalo(periodo)}
      </h3>
      <div className="linha">
        <CampoSelecao
          id={`${id}-indice`}
          rotulo="Índice de correção"
          valor={periodo.correcao.indice}
          opcoes={OPCOES_DE_INDICE}
          aoMudar={aoEscolherIndice}
          disabled={selic}
        />
        <CampoSelecao
          id={`${id}-juros`}
          rotulo="Juros"
          valor={periodo.juros.tipo}
          opcoes={OPCOES_DE_JUROS}
          aoMudar={aoEscolherJuros}
        />
        {periodo.juros.tipo === "percentualMensal" ? (
          <CampoTexto
            id={`${id}-taxa`}
            rotulo="Taxa mensal (%)"
            valor={taxa.texto}
            aoMudar={taxa.aoMudar}
            aoSair={taxa.aoSair}
            erro={taxa.erro}
            inputMode="decimal"
            classe="curto"
          />
        ) : null}
        {aoRemover && periodo.de !== null ? (
          <button
            type="button"
            className="botao discreto"
            onClick={aoRemover}
            aria-label={`Remover a divisão de ${formatarData(periodo.de)}`}
          >
            Remover divisão
          </button>
        ) : null}
      </div>
      {selic ? (
        <p className="nota">
          A SELIC capitalizada já inclui correção e juros: neste período não há índice de correção
          nem outra taxa (combiná-los contaria a SELIC duas vezes).
        </p>
      ) : null}
    </div>
  );
}
```

`src/ui/App.tsx` (reescrito; "Ajustar" abre o painel com o editor):

```tsx
import { useMemo, useReducer, useState } from "react";
import { calcular } from "../motor/calcular.ts";
import { ambientePadrao, type Ambiente } from "./ambiente.ts";
import { CHAVE_RECENTES, removerChave } from "./armazenamento.ts";
import { BarraSuperior } from "./BarraSuperior.tsx";
import { Avisos } from "./componentes/Avisos.tsx";
import { Dialogo } from "./componentes/Dialogo.tsx";
import { estadoInicial, novoCalculo, reduzir } from "./estado/calculo.ts";
import "./estilos.css";
import {
  esquecer,
  gravarPreferencias,
  lerPreferencias,
  type Preferencias,
} from "./preferencias.ts";
import { Rodape } from "./Rodape.tsx";
import { BaseDosAlimentos } from "./secoes/Base.tsx";
import { EditorDePeriodos } from "./secoes/EditorDePeriodos.tsx";
import { Encargos } from "./secoes/Encargos.tsx";
import { Processo } from "./secoes/Processo.tsx";

/**
 * Tela única em duas colunas (§9): esquerda, dados do caso e lançamentos em lote; direita,
 * resultado e lançamentos individuais. Recálculo a cada alteração, sem botão "Calcular" (§4.3).
 * O `ambiente` é injetável para os testes de componente.
 */
export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambiente }) {
  const armazenamento = ambiente.armazenamento();
  const [preferencias, setPreferencias] = useState(() => lerPreferencias(armazenamento));
  const calculoNovo = (p: Preferencias) =>
    novoCalculo({
      id: ambiente.novoId(),
      agora: ambiente.agora(),
      hoje: ambiente.hoje(),
      cabecalho: p.lembrar ? { defensor: p.defensor, orgao: p.orgao } : {},
    });
  // A tabela de índices é congelada quando o app abre (§8.2); "Novo cálculo" congela outra.
  const [estado, despachar] = useReducer(reduzir, undefined, () =>
    estadoInicial(calculoNovo(preferencias), ambiente.congelar()),
  );
  const resultado = useMemo(
    () => calcular(estado.calculo, estado.tabela),
    [estado.calculo, estado.tabela],
  );
  const agora = () => ambiente.agora();
  const [editorAberto, setEditorAberto] = useState(false);

  const novo = () =>
    despachar({ tipo: "novo", calculo: calculoNovo(preferencias), ...ambiente.congelar() });

  const mudarPreferencias = (mudancas: Partial<Preferencias>) => {
    const novas = { ...preferencias, ...mudancas };
    setPreferencias(novas);
    gravarPreferencias(armazenamento, novas);
    if (mudancas.guardarRecentes === false) removerChave(armazenamento, CHAVE_RECENTES);
  };
  const mudarCabecalho = (campo: keyof typeof estado.calculo.cabecalho, valor: string) => {
    despachar({ tipo: "cabecalho", campo, valor, em: agora() });
    if ((campo === "defensor" || campo === "orgao") && preferencias.lembrar) {
      mudarPreferencias({ [campo]: valor });
    }
  };
  const esquecerTudo = () => {
    esquecer(armazenamento);
    const novas = { ...preferencias, defensor: "", orgao: "", lembrar: false };
    setPreferencias(novas);
    gravarPreferencias(armazenamento, novas);
  };

  return (
    <div className="app">
      <BarraSuperior aoNovo={novo} />
      <main className="principal">
        <div className="coluna-esquerda" key={estado.calculo.id}>
          <Processo
            cabecalho={estado.calculo.cabecalho}
            aoMudar={mudarCabecalho}
            preferencias={preferencias}
            aoMudarPreferencias={mudarPreferencias}
            aoEsquecer={esquecerTudo}
            armazenamentoDisponivel={armazenamento !== null}
          />
          <BaseDosAlimentos
            base={estado.calculo.base}
            hoje={ambiente.hoje()}
            aoMudar={(base) => despachar({ tipo: "base", base, em: agora() })}
          />
          <Encargos
            calculo={estado.calculo}
            aoMudarAcrescimo={(campo, valor) =>
              despachar({ tipo: "acrescimos", campo, valor, em: agora() })
            }
            aoMudarDataElaboracao={(data) =>
              despachar({ tipo: "dataElaboracao", data, em: agora() })
            }
            aoMudarObservacoes={(texto) => despachar({ tipo: "observacoes", texto, em: agora() })}
            aoAjustar={() => setEditorAberto(true)}
          />
        </div>
        <div className="coluna-direita">
          <Avisos avisos={[...estado.situacao.avisos, ...resultado.avisos]} />
        </div>
      </main>
      <Rodape situacaoDosIndices={estado.situacao.rodape} />
      <Dialogo
        titulo="Ajustar a metodologia de encargos"
        aberto={editorAberto}
        aoFechar={() => setEditorAberto(false)}
      >
        <EditorDePeriodos
          metodologia={estado.calculo.metodologia}
          aoMudar={(metodologia) => despachar({ tipo: "metodologia", metodologia, em: agora() })}
        />
        <div className="dialogo-acoes">
          <button type="button" className="botao" onClick={() => setEditorAberto(false)}>
            Fechar
          </button>
        </div>
      </Dialogo>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/ui/componentes/Dialogo.test.tsx src/ui/secoes/EditorDePeriodos.test.tsx src/ui/App.test.tsx`
Esperado: `11 passed (11)` (2 do painel, 4 do editor, 5 do App).

- [ ] **Step 5: Verificação completa**

Run: `npm run format && npm run verificar`
Esperado: `748 passed | 9 skipped (757)` em 36 arquivos.

- [ ] **Step 6: Commit**

```bash
git add src/ui/componentes/Dialogo.tsx src/ui/componentes/Dialogo.test.tsx src/ui/secoes/EditorDePeriodos.tsx src/ui/secoes/EditorDePeriodos.test.tsx src/ui/App.tsx src/ui/App.test.tsx
git commit -m "ui: editor de períodos num painel modal acessível (dividir, remover, índices, juros, SELIC única, incidência, deflação)

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 9: Seções "3 · Prestações em atraso" e "4 · Pagamentos": lotes cumulativos com validação antes do motor

**Files:**
- Create: `src/ui/secoes/LotePrestacoes.tsx`, `src/ui/secoes/LotePagamentos.tsx`
- Modify (reescrito): `src/ui/App.tsx`
- Test: `src/ui/secoes/Lotes.test.tsx`

**Interfaces:**
- Consumes: `LotePrestacoes`, `LoteAmortizacoes` (tipos); `competenciaDe`, `dataNoMes`, `decompor`, `mesAnterior`, `somarMeses`; `Avisos`, `CampoTexto`, `Opcao`; `lerData`, `lerInteiro`, `lerCompetenciaTexto`, `lerValorPositivo`, `formatarCompetenciaParaCampo`, `formatarMoedaParaCampo`; ações `lancarPrestacoes` e `lancarPagamentos`, `estado.avisosDoLote` e `estado.loteRecente` (Task 4).
- Produces: `MAXIMO_DE_MESES = 600`; `intervaloDoLote(primeiro, ultimo)` (do primeiro e do último vencimento ao lote do motor: o dia do primeiro, os meses do primeiro ao do último, menos o último se a prestação dele vencer depois da data; `null` se o último vier antes); `LotePrestacoesSecao({ ultimoLote?, avisos, aoLancar })`; `LotePagamentosSecao({ ultimoLote?, avisos, aoLancar })`. Rótulos: "Intervalo de vencimentos" (o padrão) / "Meses em atraso", "Primeiro vencimento" e "Último vencimento" (datas; D27), "Dia do vencimento" e "Quantos meses" (só em "Meses em atraso"), "Valor por mês", "Primeiro pagamento" e "Último pagamento" (datas; D27), "Lançar em lote"; os exemplos dentro dos campos começam por "ex.:" (D29); balões "Ajuda: Prestações em atraso" e "Ajuda: Pagamentos"; regiões "Avisos do lote de prestações" e "Avisos do lote de pagamentos". Erros próprios: "O último vencimento não pode ser anterior ao primeiro." (prestações), "O último pagamento não pode ser anterior ao primeiro." (pagamentos), "No máximo 600 meses por lote.". Os formulários guardam o último lote lançado (prefill) e validam ao enviar (Enter funciona).

- [ ] **Step 1: Escrever os testes** (de componente, pelo App)

`src/ui/secoes/Lotes.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../App.tsx";
import { intervaloDoLote } from "./LotePrestacoes.tsx";
import { ambienteDeTeste } from "../testes/ambiente-de-teste.ts";

afterEach(cleanup);

function secao(nome: RegExp) {
  return within(screen.getByRole("region", { name: nome }));
}

describe("intervalo de vencimentos (decisão de 13/10/2026)", () => {
  it("o dia vem do primeiro vencimento; o mês final é o do último, se a prestação dele não vencer depois", () => {
    expect(intervaloDoLote("2026-01-20", "2026-03-10")).toEqual({
      diaVencimento: 20,
      de: "2026-01",
      ate: "2026-02",
    });
    expect(intervaloDoLote("2026-01-31", "2026-04-30")).toEqual({
      diaVencimento: 31,
      de: "2026-01",
      ate: "2026-04",
    });
    expect(intervaloDoLote("2026-03-10", "2026-03-10")).toEqual({
      diaVencimento: 10,
      de: "2026-03",
      ate: "2026-03",
    });
    expect(intervaloDoLote("2026-03-10", "2026-02-01")).toBeNull();
  });
});

describe("3 · Prestações em atraso e 4 · Pagamentos: lotes cumulativos (§6.1, §6.2)", () => {
  it("lança por 'meses em atraso', acumula sem repetir e mostra os avisos do lote embaixo do formulário", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    const prestacoes = secao(/3 · Prestações em atraso/);
    // o padrão é o intervalo de vencimentos, sem o dia; "Meses em atraso" mostra o dia
    expect(
      (prestacoes.getByLabelText("Intervalo de vencimentos") as HTMLInputElement).checked,
    ).toBe(true);
    expect(prestacoes.queryByLabelText("Dia do vencimento")).toBeNull();
    await user.click(prestacoes.getByLabelText("Meses em atraso"));
    await user.type(prestacoes.getByLabelText("Dia do vencimento"), "5");
    await user.type(prestacoes.getByLabelText("Quantos meses"), "3");
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    // o cálculo deixa de estar vazio
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).not.toContain(
      "Nenhum lançamento.",
    );
    expect(prestacoes.queryByRole("region", { name: "Avisos do lote de prestações" })).toBeNull();
    // relançar os mesmos meses: nada novo, com aviso no próprio formulário
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    expect(
      prestacoes.getByRole("region", { name: "Avisos do lote de prestações" }).textContent,
    ).toContain("Meses de vencimento já lançados, não repetidos: ago/2026, set/2026, out/2026.");
    // o intervalo acrescenta só o que falta, e o aviso é trocado
    await user.click(prestacoes.getByLabelText("Intervalo de vencimentos"));
    fireEvent.change(prestacoes.getByLabelText("Primeiro vencimento"), {
      target: { value: "2026-07-05" },
    });
    fireEvent.change(prestacoes.getByLabelText("Último vencimento"), {
      target: { value: "2026-08-05" },
    });
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    expect(
      prestacoes.getByRole("region", { name: "Avisos do lote de prestações" }).textContent,
    ).toContain("Meses de vencimento já lançados, não repetidos: ago/2026.");
  });

  it("valida antes de chamar o motor: dia fora de 1 a 31, meses vazios, datas vazias, intervalo invertido ou longo demais", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    const prestacoes = secao(/3 · Prestações em atraso/);
    const erros = () => prestacoes.getAllByRole("alert").map((a) => a.textContent);
    await user.click(prestacoes.getByLabelText("Meses em atraso"));
    await user.type(prestacoes.getByLabelText("Dia do vencimento"), "32");
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    expect(erros()).toEqual([
      "Informe um número inteiro de 1 a 31.",
      "Informe um número inteiro de 1 a 600.",
    ]);
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).toContain(
      "Nenhum lançamento.",
    );
    await user.click(prestacoes.getByLabelText("Intervalo de vencimentos"));
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    expect(erros()).toEqual([
      "Informe a data (dia, mês e ano a partir de 1900).",
      "Informe a data (dia, mês e ano a partir de 1900).",
    ]);
    const primeiro = prestacoes.getByLabelText("Primeiro vencimento");
    const ultimo = prestacoes.getByLabelText("Último vencimento");
    fireEvent.change(primeiro, { target: { value: "2026-10-10" } });
    fireEvent.change(ultimo, { target: { value: "2026-09-10" } });
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    expect(erros()).toEqual(["O último vencimento não pode ser anterior ao primeiro."]);
    fireEvent.change(primeiro, { target: { value: "1970-01-10" } });
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    expect(erros()).toEqual(["No máximo 600 meses por lote."]);
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).toContain(
      "Nenhum lançamento.",
    );
  });

  it("pagamentos: intervalo de pagamentos por datas, como o das prestações; lote cumulativo com aviso; valor e datas validados (decisão de 13/10/2026)", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    const prestacoes = secao(/3 · Prestações em atraso/);
    const pagamentos = secao(/4 · Pagamentos/);
    expect(pagamentos.queryByLabelText("Dia do pagamento")).toBeNull();
    await user.click(prestacoes.getByLabelText("Meses em atraso"));
    await user.type(prestacoes.getByLabelText("Dia do vencimento"), "7");
    await user.type(prestacoes.getByLabelText("Quantos meses"), "2");
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    const erros = () => pagamentos.getAllByRole("alert").map((a) => a.textContent);
    // tudo vazio: três erros, nada lançado
    await user.click(pagamentos.getByRole("button", { name: "Lançar em lote" }));
    expect(erros()).toEqual([
      "Informe um número.",
      "Informe a data (dia, mês e ano a partir de 1900).",
      "Informe a data (dia, mês e ano a partir de 1900).",
    ]);
    await user.type(pagamentos.getByLabelText("Valor por mês"), "400,00");
    const primeiro = pagamentos.getByLabelText("Primeiro pagamento");
    const ultimo = pagamentos.getByLabelText("Último pagamento");
    fireEvent.change(primeiro, { target: { value: "2026-09-10" } });
    fireEvent.change(ultimo, { target: { value: "2026-08-10" } });
    await user.click(pagamentos.getByRole("button", { name: "Lançar em lote" }));
    expect(erros()).toEqual(["O último pagamento não pode ser anterior ao primeiro."]);
    // de 10/08 a 05/09: só agosto (o pagamento de setembro, no dia 10, viria depois de 05/09)
    fireEvent.change(primeiro, { target: { value: "2026-08-10" } });
    fireEvent.change(ultimo, { target: { value: "2026-09-05" } });
    await user.click(pagamentos.getByRole("button", { name: "Lançar em lote" }));
    expect(pagamentos.queryByRole("region", { name: "Avisos do lote de pagamentos" })).toBeNull();
    // relançar: nada novo, com aviso no próprio formulário (e só agosto tinha entrado)
    await user.click(pagamentos.getByRole("button", { name: "Lançar em lote" }));
    expect(
      pagamentos.getByRole("region", { name: "Avisos do lote de pagamentos" }).textContent,
    ).toContain("Meses com pagamento já lançado, não repetidos: ago/2026.");
    expect(
      pagamentos.getByRole("region", { name: "Avisos do lote de pagamentos" }).textContent,
    ).not.toContain("set/2026");
    // o aviso do lote de pagamentos não aparece no formulário de prestações
    expect(prestacoes.queryByRole("region", { name: /Avisos do lote/ })).toBeNull();
    // valor inválido: erro inline, nada lançado
    await user.clear(pagamentos.getByLabelText("Valor por mês"));
    await user.type(pagamentos.getByLabelText("Valor por mês"), "0");
    await user.click(pagamentos.getByRole("button", { name: "Lançar em lote" }));
    expect(pagamentos.getByRole("alert").textContent).toBe("Informe um valor maior que zero.");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/secoes/Lotes.test.tsx`
Esperado: o arquivo falha ao importar: `Error: Failed to resolve import "./LotePrestacoes.tsx" from "src/ui/secoes/Lotes.test.tsx". Does the file exist?` (`Tests no tests`).

- [ ] **Step 3: Implementar**

`src/ui/secoes/LotePrestacoes.tsx`:

```tsx
import { useState, type FormEvent } from "react";
import {
  competenciaDe,
  dataNoMes,
  decompor,
  mesAnterior,
  somarMeses,
} from "../../compartilhado/datas.ts";
import type { Competencia, DataISO, LotePrestacoes } from "../../compartilhado/tipos.ts";
import { Ajuda } from "../componentes/Ajuda.tsx";
import { Avisos } from "../componentes/Avisos.tsx";
import { CampoTexto, Opcao } from "../componentes/Campo.tsx";
import { lerData, lerInteiro } from "../entrada.ts";

/** Limite de meses por lote: 600 (50 anos), para a tela nunca pedir milhares de prestações. */
export const MAXIMO_DE_MESES = 600;

/**
 * Seção "3 · Prestações em atraso" (§6.1, §9.2). Por padrão, o intervalo de vencimentos, com o
 * primeiro e o último vencimento em datas completas: as prestações vencem todo mês no dia do
 * primeiro (no último dia, nos meses mais curtos), até o último vencimento informado. Em "Meses
 * em atraso", aparecem o dia do vencimento e quantos meses (decisão de 13/10/2026). "Lançar em
 * lote" é cumulativo. A validação é feita ao lançar, com erro embaixo de cada campo; o formulário
 * guarda o último lote lançado.
 */
export function LotePrestacoesSecao({
  ultimoLote,
  avisos,
  aoLancar,
}: {
  ultimoLote?: LotePrestacoes;
  /** avisos do último lote de prestações (meses já lançados, lote vazio) */
  avisos: string[];
  aoLancar: (lote: LotePrestacoes) => void;
}) {
  const [modo, setModo] = useState<"intervalo" | "meses">(
    ultimoLote?.mesesEmAtraso !== undefined ? "meses" : "intervalo",
  );
  const [dia, setDia] = useState(
    ultimoLote?.mesesEmAtraso !== undefined ? String(ultimoLote.diaVencimento) : "",
  );
  const [meses, setMeses] = useState(ultimoLote?.mesesEmAtraso?.toString() ?? "");
  const [primeiro, setPrimeiro] = useState<string>(
    ultimoLote?.de ? dataNoMes(ultimoLote.de, ultimoLote.diaVencimento) : "",
  );
  const [ultimo, setUltimo] = useState<string>(
    ultimoLote?.ate ? dataNoMes(ultimoLote.ate, ultimoLote.diaVencimento) : "",
  );
  const [erros, setErros] = useState<
    Partial<Record<"dia" | "meses" | "primeiro" | "ultimo", string>>
  >({});

  const lancar = (evento: FormEvent) => {
    evento.preventDefault();
    const novosErros: typeof erros = {};
    let lote: LotePrestacoes | null = null;
    if (modo === "meses") {
      const diaLido = lerInteiro(dia, 1, 31);
      if (!diaLido.ok) novosErros.dia = diaLido.erro;
      const mesesLidos = lerInteiro(meses, 1, MAXIMO_DE_MESES);
      if (!mesesLidos.ok) novosErros.meses = mesesLidos.erro;
      if (diaLido.ok && mesesLidos.ok) {
        lote = { diaVencimento: diaLido.valor, mesesEmAtraso: mesesLidos.valor };
      }
    } else {
      const primeiroLido = lerData(primeiro);
      const ultimoLido = lerData(ultimo);
      if (!primeiroLido.ok) novosErros.primeiro = primeiroLido.erro;
      if (!ultimoLido.ok) novosErros.ultimo = ultimoLido.erro;
      if (primeiroLido.ok && ultimoLido.ok) {
        const intervalo = intervaloDoLote(primeiroLido.valor, ultimoLido.valor);
        if (intervalo === null) {
          novosErros.ultimo = "O último vencimento não pode ser anterior ao primeiro.";
        } else if (somarMeses(intervalo.de, MAXIMO_DE_MESES) <= intervalo.ate) {
          novosErros.ultimo = `No máximo ${MAXIMO_DE_MESES} meses por lote.`;
        } else {
          lote = intervalo;
        }
      }
    }
    setErros(novosErros);
    if (lote !== null) aoLancar(lote);
  };

  return (
    <section className="secao" aria-labelledby="titulo-prestacoes">
      <div className="titulo-secao">
        <h2 id="titulo-prestacoes">3 · Prestações em atraso</h2>
        <Ajuda assunto="Prestações em atraso">
          Cada "Lançar em lote" acrescenta as prestações do período à tabela ao lado, sem apagar as
          anteriores (ex.: jan a mar; depois jul a set); um mês de vencimento já lançado não é
          repetido. No intervalo, informe o primeiro e o último vencimento: as prestações vencem
          todo mês no dia do primeiro (no último dia do mês, quando ele é mais curto). "Meses em
          atraso" lança os últimos vencimentos já ocorridos até a data de elaboração, do mais
          recente para trás (dia 5 e 3 meses, com elaboração em 10/10/2026: ago, set e out/2026).
          Edição, exclusão e inclusão avulsa (13º, férias) ficam na tabela.
        </Ajuda>
      </div>
      <form onSubmit={lancar} noValidate>
        <fieldset className="grupo">
          <legend>Quais meses</legend>
          <Opcao
            tipo="radio"
            nome="modo-do-lote"
            rotulo="Intervalo de vencimentos"
            marcado={modo === "intervalo"}
            aoMudar={() => setModo("intervalo")}
          />
          <Opcao
            tipo="radio"
            nome="modo-do-lote"
            rotulo="Meses em atraso"
            marcado={modo === "meses"}
            aoMudar={() => setModo("meses")}
          />
        </fieldset>
        <div className="linha">
          {modo === "meses" ? (
            <>
              <CampoTexto
                id="lote-dia"
                rotulo="Dia do vencimento"
                valor={dia}
                aoMudar={setDia}
                erro={erros.dia}
                inputMode="numeric"
                classe="curto"
                placeholder="ex.: 5"
              />
              <CampoTexto
                id="lote-meses"
                rotulo="Quantos meses"
                valor={meses}
                aoMudar={setMeses}
                erro={erros.meses}
                inputMode="numeric"
                classe="curto"
                placeholder="ex.: 3"
              />
            </>
          ) : (
            <>
              <CampoTexto
                id="lote-primeiro"
                rotulo="Primeiro vencimento"
                tipo="date"
                valor={primeiro}
                aoMudar={setPrimeiro}
                erro={erros.primeiro}
                min="1900-01-01"
              />
              <CampoTexto
                id="lote-ultimo"
                rotulo="Último vencimento"
                tipo="date"
                valor={ultimo}
                aoMudar={setUltimo}
                erro={erros.ultimo}
                min="1900-01-01"
              />
            </>
          )}
          <button type="submit" className="botao">
            Lançar em lote
          </button>
        </div>
      </form>
      <Avisos avisos={avisos} titulo="Avisos do lote de prestações" />
    </section>
  );
}

/**
 * Do primeiro e do último vencimento ao lote do motor: o dia é o do primeiro; o mês final é o do
 * último vencimento, ou o anterior, quando a prestação daquele mês venceria depois da data
 * informada (primeiro 20/01, último 10/03: jan e fev). `null` quando o último vem antes do primeiro.
 */
export function intervaloDoLote(
  primeiro: DataISO,
  ultimo: DataISO,
): { diaVencimento: number; de: Competencia; ate: Competencia } | null {
  if (ultimo < primeiro) return null;
  const diaVencimento = decompor(primeiro).dia;
  const de = competenciaDe(primeiro);
  let ate = competenciaDe(ultimo);
  if (dataNoMes(ate, diaVencimento) > ultimo) ate = mesAnterior(ate);
  return { diaVencimento, de, ate };
}
```

`src/ui/secoes/LotePagamentos.tsx`:

```tsx
import { useState, type FormEvent } from "react";
import { dataNoMes, somarMeses } from "../../compartilhado/datas.ts";
import type { LoteAmortizacoes } from "../../compartilhado/tipos.ts";
import { Ajuda } from "../componentes/Ajuda.tsx";
import { Avisos } from "../componentes/Avisos.tsx";
import { CampoTexto } from "../componentes/Campo.tsx";
import { formatarMoedaParaCampo, lerData, lerValorPositivo } from "../entrada.ts";
import { intervaloDoLote, MAXIMO_DE_MESES } from "./LotePrestacoes.tsx";

/**
 * Seção "4 · Pagamentos" (§6.2, §9.2): valor por mês e o intervalo de pagamentos, com o primeiro e
 * o último pagamento em datas completas, como o intervalo de vencimentos das prestações (decisão de
 * 13/10/2026): um pagamento por mês, no dia do primeiro (no último dia, nos meses mais curtos), até
 * o último. "Lançar em lote", cumulativo. Um segundo pagamento no mesmo mês entra como pagamento
 * avulso.
 */
export function LotePagamentosSecao({
  ultimoLote,
  avisos,
  aoLancar,
}: {
  ultimoLote?: LoteAmortizacoes;
  avisos: string[];
  aoLancar: (lote: LoteAmortizacoes) => void;
}) {
  const [valor, setValor] = useState(
    ultimoLote ? formatarMoedaParaCampo(ultimoLote.valorMensal) : "",
  );
  const [primeiro, setPrimeiro] = useState<string>(
    ultimoLote ? dataNoMes(ultimoLote.de, ultimoLote.diaPagamento) : "",
  );
  const [ultimo, setUltimo] = useState<string>(
    ultimoLote ? dataNoMes(ultimoLote.ate, ultimoLote.diaPagamento) : "",
  );
  const [erros, setErros] = useState<Partial<Record<"valor" | "primeiro" | "ultimo", string>>>({});

  const lancar = (evento: FormEvent) => {
    evento.preventDefault();
    const novosErros: typeof erros = {};
    const valorLido = lerValorPositivo(valor);
    if (!valorLido.ok) novosErros.valor = valorLido.erro;
    const primeiroLido = lerData(primeiro);
    const ultimoLido = lerData(ultimo);
    if (!primeiroLido.ok) novosErros.primeiro = primeiroLido.erro;
    if (!ultimoLido.ok) novosErros.ultimo = ultimoLido.erro;
    let lote: LoteAmortizacoes | null = null;
    if (primeiroLido.ok && ultimoLido.ok) {
      const intervalo = intervaloDoLote(primeiroLido.valor, ultimoLido.valor);
      if (intervalo === null) {
        novosErros.ultimo = "O último pagamento não pode ser anterior ao primeiro.";
      } else if (somarMeses(intervalo.de, MAXIMO_DE_MESES) <= intervalo.ate) {
        novosErros.ultimo = `No máximo ${MAXIMO_DE_MESES} meses por lote.`;
      } else if (valorLido.ok) {
        lote = {
          valorMensal: valorLido.valor,
          diaPagamento: intervalo.diaVencimento,
          de: intervalo.de,
          ate: intervalo.ate,
        };
      }
    }
    setErros(novosErros);
    if (lote !== null) aoLancar(lote);
  };

  return (
    <section className="secao" aria-labelledby="titulo-pagamentos">
      <div className="titulo-secao">
        <h2 id="titulo-pagamentos">4 · Pagamentos</h2>
        <Ajuda assunto="Pagamentos">
          Lança um pagamento por mês, do primeiro ao último pagamento, no dia do primeiro (no último
          dia do mês, quando ele é mais curto). Cada pagamento é atualizado da sua data até a data
          do cálculo e abatido do total. Mês que já tem pagamento não é repetido: um segundo
          pagamento no mesmo mês entra pelo "+ Pagamento", na tabela ao lado.
        </Ajuda>
      </div>
      <form onSubmit={lancar} noValidate>
        <div className="linha">
          <CampoTexto
            id="pagamento-valor"
            rotulo="Valor por mês"
            valor={valor}
            aoMudar={setValor}
            erro={erros.valor}
            inputMode="decimal"
            classe="medio"
            placeholder="ex.: 400,00"
          />
          <CampoTexto
            id="pagamento-primeiro"
            rotulo="Primeiro pagamento"
            tipo="date"
            valor={primeiro}
            aoMudar={setPrimeiro}
            erro={erros.primeiro}
            min="1900-01-01"
          />
          <CampoTexto
            id="pagamento-ultimo"
            rotulo="Último pagamento"
            tipo="date"
            valor={ultimo}
            aoMudar={setUltimo}
            erro={erros.ultimo}
            min="1900-01-01"
          />
          <button type="submit" className="botao">
            Lançar em lote
          </button>
        </div>
      </form>
      <Avisos avisos={avisos} titulo="Avisos do lote de pagamentos" />
    </section>
  );
}
```

`src/ui/App.tsx` (reescrito; as duas seções entram entre a base e os encargos):

```tsx
import { useMemo, useReducer, useState } from "react";
import { calcular } from "../motor/calcular.ts";
import { ambientePadrao, type Ambiente } from "./ambiente.ts";
import { CHAVE_RECENTES, removerChave } from "./armazenamento.ts";
import { BarraSuperior } from "./BarraSuperior.tsx";
import { Avisos } from "./componentes/Avisos.tsx";
import { Dialogo } from "./componentes/Dialogo.tsx";
import { estadoInicial, novoCalculo, reduzir } from "./estado/calculo.ts";
import "./estilos.css";
import {
  esquecer,
  gravarPreferencias,
  lerPreferencias,
  type Preferencias,
} from "./preferencias.ts";
import { Rodape } from "./Rodape.tsx";
import { BaseDosAlimentos } from "./secoes/Base.tsx";
import { EditorDePeriodos } from "./secoes/EditorDePeriodos.tsx";
import { Encargos } from "./secoes/Encargos.tsx";
import { LotePagamentosSecao } from "./secoes/LotePagamentos.tsx";
import { LotePrestacoesSecao } from "./secoes/LotePrestacoes.tsx";
import { Processo } from "./secoes/Processo.tsx";

/**
 * Tela única em duas colunas (§9): esquerda, dados do caso e lançamentos em lote; direita,
 * resultado e lançamentos individuais. Recálculo a cada alteração, sem botão "Calcular" (§4.3).
 * O `ambiente` é injetável para os testes de componente.
 */
export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambiente }) {
  const armazenamento = ambiente.armazenamento();
  const [preferencias, setPreferencias] = useState(() => lerPreferencias(armazenamento));
  const calculoNovo = (p: Preferencias) =>
    novoCalculo({
      id: ambiente.novoId(),
      agora: ambiente.agora(),
      hoje: ambiente.hoje(),
      cabecalho: p.lembrar ? { defensor: p.defensor, orgao: p.orgao } : {},
    });
  // A tabela de índices é congelada quando o app abre (§8.2); "Novo cálculo" congela outra.
  const [estado, despachar] = useReducer(reduzir, undefined, () =>
    estadoInicial(calculoNovo(preferencias), ambiente.congelar()),
  );
  const resultado = useMemo(
    () => calcular(estado.calculo, estado.tabela),
    [estado.calculo, estado.tabela],
  );
  const agora = () => ambiente.agora();
  const [editorAberto, setEditorAberto] = useState(false);

  const novo = () =>
    despachar({ tipo: "novo", calculo: calculoNovo(preferencias), ...ambiente.congelar() });

  const mudarPreferencias = (mudancas: Partial<Preferencias>) => {
    const novas = { ...preferencias, ...mudancas };
    setPreferencias(novas);
    gravarPreferencias(armazenamento, novas);
    if (mudancas.guardarRecentes === false) removerChave(armazenamento, CHAVE_RECENTES);
  };
  const mudarCabecalho = (campo: keyof typeof estado.calculo.cabecalho, valor: string) => {
    despachar({ tipo: "cabecalho", campo, valor, em: agora() });
    if ((campo === "defensor" || campo === "orgao") && preferencias.lembrar) {
      mudarPreferencias({ [campo]: valor });
    }
  };
  const esquecerTudo = () => {
    esquecer(armazenamento);
    const novas = { ...preferencias, defensor: "", orgao: "", lembrar: false };
    setPreferencias(novas);
    gravarPreferencias(armazenamento, novas);
  };

  return (
    <div className="app">
      <BarraSuperior aoNovo={novo} />
      <main className="principal">
        <div className="coluna-esquerda" key={estado.calculo.id}>
          <Processo
            cabecalho={estado.calculo.cabecalho}
            aoMudar={mudarCabecalho}
            preferencias={preferencias}
            aoMudarPreferencias={mudarPreferencias}
            aoEsquecer={esquecerTudo}
            armazenamentoDisponivel={armazenamento !== null}
          />
          <BaseDosAlimentos
            base={estado.calculo.base}
            hoje={ambiente.hoje()}
            aoMudar={(base) => despachar({ tipo: "base", base, em: agora() })}
          />
          <LotePrestacoesSecao
            ultimoLote={estado.calculo.lotes.ultimoLotePrestacoes}
            avisos={estado.loteRecente === "prestacoes" ? estado.avisosDoLote : []}
            aoLancar={(lote) => despachar({ tipo: "lancarPrestacoes", lote, em: agora() })}
          />
          <LotePagamentosSecao
            ultimoLote={estado.calculo.lotes.ultimoLoteAmortizacoes}
            avisos={estado.loteRecente === "pagamentos" ? estado.avisosDoLote : []}
            aoLancar={(lote) => despachar({ tipo: "lancarPagamentos", lote, em: agora() })}
          />
          <Encargos
            calculo={estado.calculo}
            aoMudarAcrescimo={(campo, valor) =>
              despachar({ tipo: "acrescimos", campo, valor, em: agora() })
            }
            aoMudarDataElaboracao={(data) =>
              despachar({ tipo: "dataElaboracao", data, em: agora() })
            }
            aoMudarObservacoes={(texto) => despachar({ tipo: "observacoes", texto, em: agora() })}
            aoAjustar={() => setEditorAberto(true)}
          />
        </div>
        <div className="coluna-direita">
          <Avisos avisos={[...estado.situacao.avisos, ...resultado.avisos]} />
        </div>
      </main>
      <Rodape situacaoDosIndices={estado.situacao.rodape} />
      <Dialogo
        titulo="Ajustar a metodologia de encargos"
        aberto={editorAberto}
        aoFechar={() => setEditorAberto(false)}
      >
        <EditorDePeriodos
          metodologia={estado.calculo.metodologia}
          aoMudar={(metodologia) => despachar({ tipo: "metodologia", metodologia, em: agora() })}
        />
        <div className="dialogo-acoes">
          <button type="button" className="botao" onClick={() => setEditorAberto(false)}>
            Fechar
          </button>
        </div>
      </Dialogo>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/ui/secoes/Lotes.test.tsx`
Esperado: `4 passed (4)` (1 do intervalo, 3 das seções).

- [ ] **Step 5: Verificação completa**

Run: `npm run format && npm run verificar`
Esperado: `752 passed | 9 skipped (761)` em 37 arquivos.

- [ ] **Step 6: Commit**

```bash
git add src/ui/secoes/LotePrestacoes.tsx src/ui/secoes/LotePagamentos.tsx src/ui/secoes/Lotes.test.tsx src/ui/App.tsx
git commit -m "ui: seções de lote de prestações e de pagamentos, cumulativas, com validação antes do motor e avisos no formulário

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 10: Lado direito: cinco indicadores, tabelas com memória, edição na célula, linha nova, etiquetas e exclusão

**Files:**
- Create: `src/ui/estado/novaLinha.ts`, `src/ui/tabelas/CelulaEditavel.tsx`, `src/ui/tabelas/Indicadores.tsx`, `src/ui/tabelas/TabelaLancamentos.tsx`
- Modify (reescrito): `src/ui/App.tsx`
- Test: `src/ui/estado/novaLinha.test.ts`, `src/ui/tabelas/Tabelas.test.tsx`

**Interfaces:**
- Consumes: `Totais`, `Lancamento`, `LancamentoCalculado`, `EncargosProprios`, `NOME_DA_SERIE` (tipos); `decimal`, `paraTexto`, `ZERO`; `competenciaDe`, `dataNoMes`, `decompor`, `mesSeguinte`; `apurarValorBase` (`src/motor/base.ts`); `formatarMoeda`, `formatarData`, `formatarCompetencia`, `formatarFator`, `formatarPercentual`; `Ajuda`, `useMascara` (Task 5); `faltasDaBase` (Task 6); `lerData`, `lerDataTexto`, `mascaraData`, `formatarDataParaCampo`, `lerValorPositivo`, `formatarMoedaParaCampo` (Task 3); `MudancasDoLancamento` e as ações `excluirLancamento`, `editarLancamento` e `incluirLancamento` (Task 4).
- Produces: `RascunhoDeLancamento { tipo; data; valor; pelaBase; encargos? }`, `valorPelaBase(calculo, tabela, data)`, `sugerirPrestacao(calculo, tabela)`, `sugerirPagamento(calculo)` (`estado/novaLinha.ts`, puro, D20: o modelo é a última prestação comum, sem descrição (a última de todas só se não houver comum); vencimento no mês seguinte ao dela, no mesmo dia (último dia do mês quando ele é mais curto), ou a data de elaboração se não há prestação; valor informado dela, se o tinha, ou o que a base dá para o novo vencimento, com `pelaBase`; pagamento com a data de elaboração e o valor do último; herda só `encargos.metodologia`, copiada, nunca os termos); `CelulaEditavel({ nome, exibido, textoInicial, inputMode?, placeholder?, mascara?, aoGravar })` (D19 e D25: botão "Editar <nome> (<exibido>)"; clique, Enter ou Espaço abrem um campo de texto com o `aria-label` `nome`, na largura do botão medida no clique, com a mesma caixa, letra e alinhamento, e o erro num balão abaixo; Enter ou sair do campo gravam, Esc desiste; texto igual ao inicial não grava; `aoGravar` devolve a frase do erro, que fica em `role="alert"`, com `aria-invalid`; depois de Enter ou Esc, o foco volta ao botão da célula; quando a janela perde o foco, nada é gravado e o campo continua aberto; se a gravação muda a linha de lugar, o foco volta para onde o Tab ou o clique o levou); `Indicadores({ totais, dataElaboracao })` (lista `aria-label="Resumo do cálculo"`, cinco `dt`/`dd` na ordem do §9.3, o valor num `<span class="valor">` que não quebra; R$ 0,00 quando não há valor devido; D24: um `ResizeObserver` mede a lista e o maior valor e escolhe 5, 3, 2 ou 1 colunas, nessa ordem, a maior em que o valor cabe inteiro; sem `ResizeObserver`, como no jsdom, ficam 5); `LinhaDaTabela { lancamento; calculado }`; `TabelaLancamentos({ tipo, linhas, aoPersonalizar, aoExcluir, aoEditar, aoSugerir, valorDaBase, aoIncluir })` (regiões "Prestações" e "Amortizações (pagamentos)", com os balões "Ajuda: Prestações" e "Ajuda: Amortizações (pagamentos)"; oito colunas, a primeira com o vencimento (ou a data do pagamento), sem a competência (D23); o nome da linha é "prestação de dd/mm/aaaa" ou "pagamento de dd/mm/aaaa", com a descrição entre parênteses quando há ("pagamento de 05/09/2026 (Pagamento parcial)"); na primeira célula, o botão ▸ "Memória da <nome>" (ou "Memória do <nome>") com `aria-expanded` e "▸"/"▾", a célula editável do vencimento ("Vencimento da <nome>" ou "Data do <nome>"; texto `dd/mm/aaaa` com `mascaraData`, lido por `lerDataTexto`), a descrição e as etiquetas; a célula editável do valor ("Valor da <nome>"): na prestação, abre com o valor informado ou o apurado pela base, um valor digitado vira `valorInformado` e o campo vazio o apaga (volta à base); no pagamento, vazio é "Informe um valor maior que zero."; botões "Personalizar <nome>" e "Excluir <nome>"; o primeiro clique no ✕ não exclui: o mesmo botão fica vermelho (classe `armado`, mesmo tamanho; a linha não se mexe) e passa a se chamar "Clique de novo para excluir a <nome>" (ou "o <nome>"); um segundo clique deliberado (ou Enter) chama `aoExcluir` e foca o botão "+"; o segundo clique de um clique duplo (`detail` 2) e o Enter segurado (tecla repetida) não excluem; Esc, clique ou foco fora do ✕ (`pointerdown` e `focusin` no documento), 4 segundos sem o segundo clique, o ✕ de outra linha (inclusive da outra tabela) e linhas novas vindas do App o desarmam; a memória aberta de uma linha que sumiu é esquecida; "+ Prestação" / "+ Pagamento" acrescentam a linha nova no fim da tabela (D20), com "Vencimento da nova prestação" ou "Data do novo pagamento" (com o foco) e "Valor da nova prestação" ou "Valor do novo pagamento", os erros ligados aos campos por `aria-describedby`, o texto "Enter inclui · Esc descarta" e os botões ✓ "Incluir a nova prestação" / "Incluir o novo pagamento" e ✕ "Descartar a nova prestação" / "Descartar o novo pagamento"; na prestação pela base, o valor sugerido acompanha o vencimento enquanto não for mexido, e deixá-lo igual inclui a prestação sem valor informado; incluir ou descartar devolve o foco ao "+"; linha de totais; etiquetas "vincenda", "não computada", "valor informado", "ajustada", com a explicação no `title`). O App monta `linhas` emparelhando `calculo.lancamentos[i]` com `resultado.lancamentos[i]` (o motor devolve na mesma ordem) e liga `aoEditar` (`editarLancamento`), `aoSugerir` (`sugerirPrestacao` ou `sugerirPagamento` com o cálculo e a tabela do momento), `valorDaBase` (`valorPelaBase`) e `aoIncluir` (`incluirLancamento`); a caixa de avisos começa pelas frases de `faltasDaBase` e a seção 2 recebe `faltas` (o campo em branco fica em vermelho; D29); "Novo cálculo" remonta a coluna da direita, como a da esquerda (a linha nova e as células em edição não passam de um cálculo para outro). O lápis fica para a Task 11 (até lá, não faz nada).

- [ ] **Step 1: Escrever os testes** (os valores esperados vêm do próprio motor, chamado no teste com os mesmos dados da tela, nunca de números fixos)

`src/ui/estado/novaLinha.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Calculo, Lancamento } from "../../compartilhado/tipos.ts";
import { tabelaRegimeNovo } from "../../motor/testes/regime-novo.ts";
import { novoCalculo } from "./calculo.ts";
import { dividirPeriodo } from "./metodologia.ts";
import { sugerirPagamento, sugerirPrestacao, valorPelaBase } from "./novaLinha.ts";

const HOJE = "2026-10-11";

function calculoCom(lancamentos: Lancamento[], base?: Calculo["base"]): Calculo {
  const calculo = novoCalculo({ id: "c", agora: "2026-10-11T15:00:00-03:00", hoje: HOJE });
  calculo.base = base ?? {
    tipo: "valorFixo",
    valor: "1000.00",
    dataFixacao: "2024-01-10",
    indiceReajuste: "nenhum",
    mesReajuste: 1,
  };
  calculo.lancamentos = lancamentos;
  return calculo;
}

const prestacao = (id: string, data: string, extra: Partial<Lancamento> = {}): Lancamento => ({
  id,
  tipo: "prestacao",
  data,
  competencia: data.slice(0, 7),
  origem: "lote",
  editado: false,
  ...extra,
});

describe("sugestões da linha nova (decisões de 13/10/2026)", () => {
  it("prestação: mês seguinte ao da última, mesmo dia; valor pela base", () => {
    const calculo = calculoCom([
      prestacao("p-2026-08", "2026-08-05"),
      prestacao("p-2026-09", "2026-09-05"),
    ]);
    expect(sugerirPrestacao(calculo, tabelaRegimeNovo())).toEqual({
      tipo: "prestacao",
      data: "2026-10-05",
      valor: "1000.00",
      pelaBase: true,
    });
    // dia 31 em mês curto cai no último dia
    const fim = calculoCom([prestacao("p-2026-01", "2026-01-31")]);
    expect(sugerirPrestacao(fim, tabelaRegimeNovo()).data).toBe("2026-02-28");
  });

  it("prestação: sem prestação anterior, a data de elaboração; base em % do salário mínimo dá o valor do mês", () => {
    const calculo = calculoCom([], { tipo: "percentualSalarioMinimo", percentual: "30" });
    expect(sugerirPrestacao(calculo, tabelaRegimeNovo())).toEqual({
      tipo: "prestacao",
      data: HOJE,
      valor: "486.30",
      pelaBase: true,
    });
    expect(valorPelaBase(calculo, tabelaRegimeNovo(), "2025-03-10")).toBe("455.40");
    // base sem como apurar (valor fixo em branco): sem sugestão
    const embranco = calculoCom([], {
      ...calculo.base,
      tipo: "valorFixo",
      valor: "",
      dataFixacao: HOJE,
      indiceReajuste: "nenhum",
      mesReajuste: 10,
    });
    expect(valorPelaBase(embranco, tabelaRegimeNovo(), HOJE)).toBe("");
  });

  it("prestação: a última tinha valor informado à mão, a nova vem com o mesmo valor, também informado", () => {
    const calculo = calculoCom([
      prestacao("p-2026-09", "2026-09-05", { valorInformado: "1200.00" }),
    ]);
    expect(sugerirPrestacao(calculo, tabelaRegimeNovo())).toEqual({
      tipo: "prestacao",
      data: "2026-10-05",
      valor: "1200.00",
      pelaBase: false,
    });
  });

  it("um 13º ou férias avulsos (com descrição) não servem de modelo: vale a última prestação comum", () => {
    const calculo = calculoCom([
      prestacao("p-2025-12", "2025-12-10"),
      prestacao("p-2025-12-2", "2025-12-20", {
        origem: "avulso",
        descricao: "13º salário 2025",
        valorInformado: "1000.00",
      }),
    ]);
    expect(sugerirPrestacao(calculo, tabelaRegimeNovo())).toMatchObject({
      data: "2026-01-10",
      pelaBase: true,
    });
  });

  it("herda só as regras próprias de correção e juros, não os termos próprios (datas)", () => {
    const calculo = calculoCom([]);
    const regras = dividirPeriodo(calculo.metodologia, "2023-01-01").metodologia;
    calculo.lancamentos = [
      prestacao("p-2026-09", "2026-09-05", {
        encargos: { metodologia: regras, termoFinalJuros: "2026-09-30" },
      }),
    ];
    const sugestao = sugerirPrestacao(calculo, tabelaRegimeNovo());
    expect(sugestao.encargos).toEqual({ metodologia: regras });
    expect(sugestao.encargos?.metodologia).not.toBe(regras);
  });

  it("pagamento: data de hoje e o valor do último pagamento; sem pagamento anterior, valor em branco", () => {
    const pagamento: Lancamento = {
      id: "a-2026-09",
      tipo: "amortizacao",
      data: "2026-09-05",
      valorInformado: "400.00",
      origem: "lote",
      editado: false,
    };
    expect(sugerirPagamento(calculoCom([pagamento]))).toEqual({
      tipo: "amortizacao",
      data: HOJE,
      valor: "400.00",
      pelaBase: false,
    });
    expect(sugerirPagamento(calculoCom([]))).toEqual({
      tipo: "amortizacao",
      data: HOJE,
      valor: "",
      pelaBase: false,
    });
  });
});
```

`src/ui/tabelas/Tabelas.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { decimal } from "../../compartilhado/decimal.ts";
import { formatarMoeda } from "../../compartilhado/formatacao.ts";
import { calcular } from "../../motor/calcular.ts";
import { gerarLoteAmortizacoes, gerarLotePrestacoes } from "../../motor/lote.ts";
import App from "../App.tsx";
import { novoCalculo } from "../estado/calculo.ts";
import { ambienteDeTeste, AGORA_DE_TESTE, HOJE_DE_TESTE } from "../testes/ambiente-de-teste.ts";

afterEach(cleanup);

const moeda = (texto: string) => formatarMoeda(decimal(texto));
/** multa e honorários de 10% cada, o padrão do cálculo novo (decisão de 13/10/2026) */
const multaEHonorarios = (r: ReturnType<typeof calcular>) =>
  formatarMoeda(decimal(r.totais.multa).plus(decimal(r.totais.honorarios)));

/** O que o motor devolve para o mesmo caso montado na tela: valor fixo R$ 1.000,00, dia 5, 2 meses. */
function esperado() {
  const calculo = novoCalculo({ id: "x", agora: AGORA_DE_TESTE, hoje: HOJE_DE_TESTE });
  calculo.base = {
    tipo: "valorFixo",
    valor: "1000.00",
    dataFixacao: HOJE_DE_TESTE,
    indiceReajuste: "nenhum",
    mesReajuste: 10,
  };
  calculo.lancamentos = gerarLotePrestacoes(
    { diaVencimento: 5, mesesEmAtraso: 2 },
    HOJE_DE_TESTE,
    [],
  ).lancamentos;
  const comPagamento = {
    ...calculo,
    lancamentos: [
      ...calculo.lancamentos,
      ...gerarLoteAmortizacoes(
        { valorMensal: "400.00", diaPagamento: 5, de: "2026-09", ate: "2026-09" },
        calculo.lancamentos,
      ).lancamentos,
    ],
  };
  const tabela = ambienteDeTeste().congelar().tabela;
  return { soPrestacoes: calcular(calculo, tabela), comPagamento: calcular(comPagamento, tabela) };
}

async function montarCaso(user: ReturnType<typeof userEvent.setup>) {
  render(<App ambiente={ambienteDeTeste()} />);
  await user.type(screen.getByLabelText("Valor fixado"), "1.000,00");
  const prestacoes = within(screen.getByRole("region", { name: /3 · Prestações em atraso/ }));
  await user.click(prestacoes.getByLabelText("Meses em atraso"));
  await user.type(prestacoes.getByLabelText("Dia do vencimento"), "5");
  await user.type(prestacoes.getByLabelText("Quantos meses"), "2");
  await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
}

describe("lado direito: indicadores, tabelas e memória (§9.3)", () => {
  it("mostra as prestações do lote com os valores do motor, os totais e os cinco indicadores", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    const r = esperado().soPrestacoes;
    const tabela = within(screen.getByRole("region", { name: "Prestações" }));
    const linhas = tabela.getAllByRole("row");
    // cabeçalho + 2 prestações + total
    expect(linhas).toHaveLength(4);
    const primeira = linhas[1] as HTMLElement;
    const celulas = within(primeira)
      .getAllByRole("cell")
      .map((c) => c.textContent);
    const l0 = r.lancamentos[0]!;
    expect(celulas.slice(0, 7)).toEqual([
      "▸05/09/2026",
      "R$ 1.000,00",
      l0.correcao.fator.replace(".", ","),
      moeda(l0.corrigido),
      `${l0.juros.percentual.replace(".", ",")}%`,
      moeda(l0.jurosValor),
      moeda(l0.atualizado),
    ]);
    const total = within(linhas[3] as HTMLElement)
      .getAllByRole("cell")
      .map((c) => c.textContent);
    expect(total[0]).toBe("Total");
    expect(total[6]).toBe(moeda(r.totais.prestacoes));
    const resumo = within(screen.getByLabelText("Resumo do cálculo"));
    expect(resumo.getAllByRole("term").map((t) => t.textContent)).toEqual([
      "Prestações atualizadas",
      "Amortizações atualizadas",
      "Total devido em 11/10/2026",
      "Multa e honorários",
      "Total geral",
    ]);
    expect(resumo.getAllByRole("definition").map((d) => d.textContent)).toEqual([
      moeda(r.totais.prestacoes),
      "R$ 0,00",
      moeda(r.totais.totalDevido),
      multaEHonorarios(r),
      moeda(r.totais.totalGeral),
    ]);
    expect(
      within(screen.getByRole("region", { name: "Amortizações (pagamentos)" })).getByText(
        /Nenhum pagamento lançado/,
      ),
    ).toBeDefined();
  });

  it("▸ expande a memória (base, índices, juros e avisos) e volta a esconder", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    const r = esperado().soPrestacoes;
    const l0 = r.lancamentos[0]!;
    const botao = screen.getByRole("button", { name: "Memória da prestação de 05/09/2026" });
    expect(botao.getAttribute("aria-expanded")).toBe("false");
    await user.click(botao);
    expect(botao.getAttribute("aria-expanded")).toBe("true");
    expect(botao.textContent).toBe("▾");
    const memoria = screen
      .getByText("Memória · prestação de 05/09/2026")
      .closest("tr") as HTMLElement;
    expect(memoria.textContent).toContain(`Base: ${l0.memoriaBase}`);
    expect(memoria.textContent).toContain("IPCA de set/2026: ");
    expect(memoria.textContent).toContain("(25/30 do mês)");
    expect(memoria.textContent).toContain("IPCA de out/2026: sem índice (fator 1,000000)");
    expect(memoria.textContent).toContain("taxa legal de ");
    for (const aviso of l0.avisos) expect(memoria.textContent).toContain(aviso);
    await user.click(botao);
    expect(screen.queryByText("Memória · prestação de 05/09/2026")).toBeNull();
  });

  it("um pagamento entra na tabela de amortizações com as mesmas colunas e abate do total; excluir recalcula", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    const pagamentos = within(screen.getByRole("region", { name: /4 · Pagamentos/ }));
    await user.type(pagamentos.getByLabelText("Valor por mês"), "400");
    fireEvent.change(pagamentos.getByLabelText("Primeiro pagamento"), {
      target: { value: "2026-09-05" },
    });
    fireEvent.change(pagamentos.getByLabelText("Último pagamento"), {
      target: { value: "2026-09-05" },
    });
    await user.click(pagamentos.getByRole("button", { name: "Lançar em lote" }));
    const r = esperado().comPagamento;
    const amortizacoes = within(screen.getByRole("region", { name: "Amortizações (pagamentos)" }));
    const linha = amortizacoes.getAllByRole("row")[1] as HTMLElement;
    const celulas = within(linha)
      .getAllByRole("cell")
      .map((c) => c.textContent);
    const pagamento = r.lancamentos.find((l) => l.tipo === "amortizacao")!;
    expect(celulas.slice(0, 2)).toEqual(["▸05/09/2026Pagamento parcial", "R$ 400,00"]);
    expect(celulas[6]).toBe(moeda(pagamento.atualizado));
    const resumo = within(screen.getByLabelText("Resumo do cálculo"));
    expect(resumo.getAllByRole("definition").map((d) => d.textContent)).toEqual([
      moeda(r.totais.prestacoes),
      moeda(r.totais.amortizacoes),
      moeda(r.totais.totalDevido),
      multaEHonorarios(r),
      moeda(r.totais.totalGeral),
    ]);
    // o ✕ de outra tabela também leva o "armado" para ele (um só ✕ armado na tela)
    const xisDaPrestacao = () =>
      screen.getByRole("button", { name: /excluir (a )?prestação de 05\/09\/2026$/i });
    const xisDoPagamento = () =>
      screen.getByRole("button", { name: /excluir (o )?pagamento de 05\/09\/2026/i });
    await user.click(xisDaPrestacao());
    await user.click(xisDoPagamento());
    expect(xisDaPrestacao().getAttribute("aria-label")).toBe("Excluir prestação de 05/09/2026");
    expect(xisDoPagamento().getAttribute("aria-label")).toBe(
      "Clique de novo para excluir o pagamento de 05/09/2026 (Pagamento parcial)",
    );
    await user.click(xisDoPagamento());
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "+ Pagamento" }));
    expect(amortizacoes.getByText(/Nenhum pagamento lançado/)).toBeDefined();
    expect(resumo.getAllByRole("definition")[1]?.textContent).toBe("R$ 0,00");
    await user.click(xisDaPrestacao());
    await user.click(xisDaPrestacao());
    expect(
      within(screen.getByRole("region", { name: "Prestações" })).getAllByRole("row"),
    ).toHaveLength(3);
  });

  it("o ✕ fica vermelho no primeiro clique e só exclui num segundo clique deliberado; clique ou foco fora, Esc ou mudança no cálculo o desarmam (decisão de 13/10/2026)", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    const tabela = within(screen.getByRole("region", { name: "Prestações" }));
    const linhas = () => tabela.getAllByRole("row").length;
    const xis = (data: string) =>
      screen.getByRole("button", { name: new RegExp(`excluir (a )?prestação de ${data}$`, "i") });
    const armado = (data: string) => xis(data).classList.contains("armado");
    expect(linhas()).toBe(4);
    // primeiro clique: o mesmo botão fica vermelho e muda o nome; nada é excluído nem sai do lugar
    await user.click(xis("05/09/2026"));
    expect(armado("05/09/2026")).toBe(true);
    expect(xis("05/09/2026").getAttribute("aria-label")).toBe(
      "Clique de novo para excluir a prestação de 05/09/2026",
    );
    expect(
      screen.getByRole("button", { name: "Personalizar prestação de 05/09/2026" }),
    ).toBeDefined();
    expect(linhas()).toBe(4);
    // Esc desarma, e o foco fica no ✕
    await user.keyboard("{Escape}");
    expect(armado("05/09/2026")).toBe(false);
    expect(document.activeElement).toBe(xis("05/09/2026"));
    // um clique duplo arma, mas não exclui (o segundo clique do duplo não conta)
    await user.dblClick(xis("05/09/2026"));
    expect(armado("05/09/2026")).toBe(true);
    expect(linhas()).toBe(4);
    // o ✕ de outra linha leva o "armado" para ela
    await user.click(xis("05/10/2026"));
    expect(armado("05/09/2026")).toBe(false);
    expect(armado("05/10/2026")).toBe(true);
    // outra ação na tela desarma
    await user.type(screen.getByLabelText("Nº do processo"), "1");
    expect(armado("05/10/2026")).toBe(false);
    // abrir a memória de uma linha também desarma (clique fora do ✕)
    await user.click(xis("05/09/2026"));
    await user.click(screen.getByRole("button", { name: "Memória da prestação de 05/10/2026" }));
    expect(armado("05/09/2026")).toBe(false);
    // um clique numa área sem foco (o título da tabela) também desarma
    await user.click(xis("05/09/2026"));
    await user.click(screen.getByRole("heading", { name: "Prestações" }));
    expect(armado("05/09/2026")).toBe(false);
    // levar o foco para fora com Tab também desarma
    await user.click(xis("05/09/2026"));
    await user.tab();
    expect(armado("05/09/2026")).toBe(false);
    expect(linhas()).toBe(5); // 2 prestações, a memória aberta de 05/10/2026, o total e o cabeçalho
    // pelo teclado: Enter arma, Enter de novo exclui (a linha com a memória aberta) e leva o
    // foco para "+ Prestação"
    xis("05/10/2026").focus();
    await user.keyboard("{Enter}");
    expect(armado("05/10/2026")).toBe(true);
    await user.keyboard("{Enter}");
    expect(linhas()).toBe(3);
    expect(screen.queryByRole("button", { name: /05\/10\/2026/ })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "+ Prestação" }));
    // relançado o lote, 05/10/2026 volta com a memória fechada e o ✕ desarmado
    const lote = within(screen.getByRole("region", { name: /3 · Prestações em atraso/ }));
    await user.click(lote.getByRole("button", { name: "Lançar em lote" }));
    expect(
      screen
        .getByRole("button", { name: "Memória da prestação de 05/10/2026" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    expect(armado("05/10/2026")).toBe(false);
    expect(linhas()).toBe(4);
  });

  it("o ✕ armado volta ao normal depois de 4 segundos sem o segundo clique", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      await montarCaso(user);
      const xis = () =>
        screen.getByRole("button", { name: /excluir (a )?prestação de 05\/09\/2026$/i });
      await user.click(xis());
      expect(xis().classList.contains("armado")).toBe(true);
      act(() => vi.advanceTimersByTime(3900));
      expect(xis().classList.contains("armado")).toBe(true);
      act(() => vi.advanceTimersByTime(200));
      expect(xis().classList.contains("armado")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("vencimento e valor se corrigem na própria célula: Enter ou sair grava, Esc desiste, inválido não grava (decisão de 13/10/2026)", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    const tabela = within(screen.getByRole("region", { name: "Prestações" }));
    const primeira = () => tabela.getAllByRole("row")[1] as HTMLElement;
    // clique no valor: o campo abre com o valor apurado pela base, selecionado
    await user.click(
      screen.getByRole("button", { name: "Editar valor da prestação de 05/09/2026 (R$ 1.000,00)" }),
    );
    const campo = screen.getByLabelText("Valor da prestação de 05/09/2026") as HTMLInputElement;
    expect(document.activeElement).toBe(campo);
    expect(campo.value).toBe("1.000,00");
    // Enter sem mudar nada não marca a linha
    await user.keyboard("{Enter}");
    expect(primeira().textContent).not.toContain("ajustada");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Editar valor da prestação de 05/09/2026 (R$ 1.000,00)" }),
    );
    // valor digitado grava como informado à mão
    await user.keyboard("{Enter}");
    await user.clear(screen.getByLabelText("Valor da prestação de 05/09/2026"));
    await user.type(screen.getByLabelText("Valor da prestação de 05/09/2026"), "1.200,00{Enter}");
    expect(within(primeira()).getAllByRole("cell")[1]?.textContent).toBe("R$ 1.200,00");
    expect(primeira().textContent).toContain("valor informado");
    expect(primeira().textContent).toContain("ajustada");
    // texto inválido fica no campo, em vermelho, e não é gravado; Esc desiste
    await user.click(
      screen.getByRole("button", { name: "Editar valor da prestação de 05/09/2026 (R$ 1.200,00)" }),
    );
    await user.clear(screen.getByLabelText("Valor da prestação de 05/09/2026"));
    await user.type(screen.getByLabelText("Valor da prestação de 05/09/2026"), "1.5{Enter}");
    expect(screen.getByRole("alert").textContent).toBe(
      "Use vírgula para os centavos (ex.: 1.234,56 ou 1234,56).",
    );
    expect(
      screen.getByLabelText("Valor da prestação de 05/09/2026").getAttribute("aria-invalid"),
    ).toBe("true");
    await user.keyboard("{Escape}");
    expect(within(primeira()).getAllByRole("cell")[1]?.textContent).toBe("R$ 1.200,00");
    // trocar de janela no meio da digitação (conferir um PDF) não grava o valor pela metade
    await user.click(
      screen.getByRole("button", { name: "Editar valor da prestação de 05/09/2026 (R$ 1.200,00)" }),
    );
    await user.clear(screen.getByLabelText("Valor da prestação de 05/09/2026"));
    await user.type(screen.getByLabelText("Valor da prestação de 05/09/2026"), "45");
    const janelaSemFoco = vi.spyOn(document, "hasFocus").mockReturnValue(false);
    fireEvent.blur(screen.getByLabelText("Valor da prestação de 05/09/2026"));
    janelaSemFoco.mockRestore();
    // o campo continua aberto, com o que foi digitado, e nada foi gravado
    expect(
      (screen.getByLabelText("Valor da prestação de 05/09/2026") as HTMLInputElement).value,
    ).toBe("45");
    await user.keyboard("{Escape}");
    expect(within(primeira()).getAllByRole("cell")[1]?.textContent).toBe("R$ 1.200,00");
    // apagar o valor volta a apurar pela base
    await user.click(
      screen.getByRole("button", { name: "Editar valor da prestação de 05/09/2026 (R$ 1.200,00)" }),
    );
    await user.clear(screen.getByLabelText("Valor da prestação de 05/09/2026"));
    await user.keyboard("{Enter}");
    expect(within(primeira()).getAllByRole("cell")[1]?.textContent).toBe("R$ 1.000,00");
    expect(primeira().textContent).not.toContain("valor informado");
    // o vencimento: sair do campo com Tab grava, e a linha passa a se chamar pela nova data
    await user.click(
      screen.getByRole("button", {
        name: "Editar vencimento da prestação de 05/09/2026 (05/09/2026)",
      }),
    );
    // o vencimento é digitado como texto dd/mm/aaaa (as barras entram sozinhas)
    const vencimento = screen.getByLabelText(
      "Vencimento da prestação de 05/09/2026",
    ) as HTMLInputElement;
    expect(vencimento.value).toBe("05/09/2026");
    await user.clear(vencimento);
    await user.type(vencimento, "3109{Enter}");
    expect(screen.getByRole("alert").textContent).toBe(
      "Informe a data como dd/mm/aaaa (ex.: 05/09/2026).",
    );
    await user.clear(vencimento);
    await user.type(vencimento, "10092026");
    expect(vencimento.value).toBe("10/09/2026");
    await user.tab();
    expect(
      screen.getByRole("button", { name: "Memória da prestação de 10/09/2026" }),
    ).toBeDefined();
    expect(screen.queryByRole("button", { name: /05\/09\/2026/ })).toBeNull();
    // pagamento não fica sem valor
    const pagamentos = within(screen.getByRole("region", { name: /4 · Pagamentos/ }));
    await user.type(pagamentos.getByLabelText("Valor por mês"), "400");
    fireEvent.change(pagamentos.getByLabelText("Primeiro pagamento"), {
      target: { value: "2026-09-05" },
    });
    fireEvent.change(pagamentos.getByLabelText("Último pagamento"), {
      target: { value: "2026-09-05" },
    });
    await user.click(pagamentos.getByRole("button", { name: "Lançar em lote" }));
    await user.click(
      screen.getByRole("button", {
        name: "Editar valor do pagamento de 05/09/2026 (Pagamento parcial) (R$ 400,00)",
      }),
    );
    await user.clear(screen.getByLabelText("Valor do pagamento de 05/09/2026 (Pagamento parcial)"));
    await user.keyboard("{Enter}");
    expect(screen.getByRole("alert").textContent).toBe("Informe um valor maior que zero.");
  });

  it("+ Prestação e + Pagamento abrem uma linha nova já sugerida no fim da tabela: Enter ou ✓ inclui, Esc ou ✕ descarta (decisão de 13/10/2026)", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    const tabela = within(screen.getByRole("region", { name: "Prestações" }));
    // vencimento no mês seguinte ao da última prestação e o valor da base; Enter inclui pela base
    await user.click(screen.getByRole("button", { name: "+ Prestação" }));
    const vencimento = screen.getByLabelText("Vencimento da nova prestação") as HTMLInputElement;
    expect(document.activeElement).toBe(vencimento);
    expect(vencimento.value).toBe("2026-11-05");
    expect((screen.getByLabelText("Valor da nova prestação") as HTMLInputElement).value).toBe(
      "1.000,00",
    );
    expect(tabela.getAllByRole("row").at(-2)?.textContent).toContain("Enter inclui · Esc descarta");
    await user.keyboard("{Enter}");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "+ Prestação" }));
    const novembro = screen
      .getByRole("button", { name: "Memória da prestação de 05/11/2026" })
      .closest("tr") as HTMLElement;
    expect(within(novembro).getAllByRole("cell")[1]?.textContent).toBe("R$ 1.000,00");
    expect(novembro.textContent).toContain("vincenda");
    expect(novembro.textContent).not.toContain("valor informado");
    // outro vencimento e valor digitado: entra como informado à mão, pelo ✓
    await user.click(screen.getByRole("button", { name: "+ Prestação" }));
    expect((screen.getByLabelText("Vencimento da nova prestação") as HTMLInputElement).value).toBe(
      "2026-12-05",
    );
    fireEvent.change(screen.getByLabelText("Vencimento da nova prestação"), {
      target: { value: "2026-08-20" },
    });
    await user.clear(screen.getByLabelText("Valor da nova prestação"));
    await user.type(screen.getByLabelText("Valor da nova prestação"), "500");
    await user.click(screen.getByRole("button", { name: "Incluir a nova prestação" }));
    const agosto = screen
      .getByRole("button", { name: "Memória da prestação de 20/08/2026" })
      .closest("tr") as HTMLElement;
    expect(within(agosto).getAllByRole("cell")[1]?.textContent).toBe("R$ 500,00");
    expect(agosto.textContent).toContain("valor informado");
    // Esc descarta e devolve o foco a "+ Prestação"
    const antes = tabela.getAllByRole("row").length;
    await user.click(screen.getByRole("button", { name: "+ Prestação" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByLabelText("Vencimento da nova prestação")).toBeNull();
    expect(tabela.getAllByRole("row")).toHaveLength(antes);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "+ Prestação" }));
    // pagamento: data de hoje; sem pagamento anterior, o valor é obrigatório
    await user.click(screen.getByRole("button", { name: "+ Pagamento" }));
    expect((screen.getByLabelText("Data do novo pagamento") as HTMLInputElement).value).toBe(
      "2026-10-11",
    );
    await user.keyboard("{Enter}");
    expect(screen.getByRole("alert").textContent).toBe("Informe um número.");
    await user.type(screen.getByLabelText("Valor do novo pagamento"), "150{Enter}");
    const amortizacoes = within(screen.getByRole("region", { name: "Amortizações (pagamentos)" }));
    expect(amortizacoes.getAllByRole("row")[1]?.textContent).toContain("▸11/10/2026R$ 150,00");
    // o próximo pagamento já vem com o valor do anterior; ✕ descarta
    await user.click(screen.getByRole("button", { name: "+ Pagamento" }));
    expect((screen.getByLabelText("Valor do novo pagamento") as HTMLInputElement).value).toBe(
      "150,00",
    );
    await user.click(screen.getByRole("button", { name: "Descartar o novo pagamento" }));
    expect(screen.queryByLabelText("Data do novo pagamento")).toBeNull();
    // a linha nova não passa para outro cálculo: "Novo cálculo" a descarta
    await user.click(screen.getByRole("button", { name: "+ Prestação" }));
    await user.click(screen.getByRole("button", { name: "Novo cálculo" }));
    expect(screen.queryByLabelText("Vencimento da nova prestação")).toBeNull();
  });

  it("base incompleta: o aviso diz o que falta e onde, e o campo fica em vermelho até ser preenchido (decisão de 13/10/2026)", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    await user.click(screen.getByLabelText("% do salário mínimo"));
    // sem prestação lançada, nada é cobrado
    expect(
      screen.getByLabelText("Percentual do salário mínimo").getAttribute("aria-invalid"),
    ).toBeNull();
    const prestacoes = within(screen.getByRole("region", { name: /3 · Prestações em atraso/ }));
    await user.click(prestacoes.getByLabelText("Meses em atraso"));
    await user.type(prestacoes.getByLabelText("Dia do vencimento"), "5");
    await user.type(prestacoes.getByLabelText("Quantos meses"), "2");
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    const avisos = () => screen.getByRole("region", { name: "Avisos" }).textContent;
    expect(avisos()).toContain(
      "Falta o percentual do salário mínimo (seção 2 · Base dos alimentos): as prestações ficam sem valor até ele ser informado.",
    );
    expect(avisos()).not.toContain("igualam ou superam");
    const campo = screen.getByLabelText("Percentual do salário mínimo");
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Informe o percentual.")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Memória da prestação de 05/09/2026" }));
    expect(
      screen.getByText(/Memória · prestação de 05\/09\/2026/).closest("tr")?.textContent,
    ).toContain("Percentual do salário mínimo não informado: a prestação ficou sem valor.");
    await user.type(campo, "30");
    expect(avisos()).not.toContain("Falta o percentual");
    expect(campo.getAttribute("aria-invalid")).toBeNull();
    expect(screen.queryByText("Informe o percentual.")).toBeNull();
  });

  it("amortizações maiores que as prestações: total devido e total geral saem como R$ 0,00, com o aviso do motor", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    const pagamentos = within(screen.getByRole("region", { name: /4 · Pagamentos/ }));
    await user.type(pagamentos.getByLabelText("Valor por mês"), "5.000,00");
    fireEvent.change(pagamentos.getByLabelText("Primeiro pagamento"), {
      target: { value: "2026-09-05" },
    });
    fireEvent.change(pagamentos.getByLabelText("Último pagamento"), {
      target: { value: "2026-09-05" },
    });
    await user.click(pagamentos.getByRole("button", { name: "Lançar em lote" }));
    const resumo = within(screen.getByLabelText("Resumo do cálculo"));
    const valores = resumo.getAllByRole("definition").map((d) => d.textContent);
    expect(valores[2]).toBe("R$ 0,00");
    expect(valores[4]).toBe("R$ 0,00");
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).toContain(
      "igualam ou superam as prestações atualizadas",
    );
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/estado/novaLinha.test.ts src/ui/tabelas/Tabelas.test.tsx`
Esperado: `novaLinha.test.ts` falha ao importar (`Cannot find module './novaLinha.ts'`); em `Tabelas.test.tsx`, `9 failed (9)`: "base incompleta…" (`AssertionError: expected 'Avisos…' to contain 'Falta o percentual do salário mínimo…'`: a seção 2 já existe, mas o App ainda não liga as faltas), "mostra as prestações do lote…", "o ✕ fica vermelho no primeiro clique…", "vencimento e valor se corrigem na própria célula…" e "+ Prestação e + Pagamento abrem uma linha nova…" (`Unable to find an accessible element with the role "region" and name "Prestações"`), "o ✕ armado volta ao normal depois de 4 segundos…" (`` role "button" and name `/excluir (a )?prestação de 05\/09\/2026$/i` ``), "▸ expande a memória…" (`role "button" and name "Memória da prestação de 05/09/2026"`), "um pagamento entra na tabela de amortizações…" (`name "Amortizações (pagamentos)"`) e "amortizações maiores que as prestações…" (`Unable to find a label with the text of: Resumo do cálculo`).

- [ ] **Step 3: Implementar**

`src/ui/estado/novaLinha.ts`:

```ts
import { competenciaDe, dataNoMes, decompor, mesSeguinte } from "../../compartilhado/datas.ts";
import { paraTexto } from "../../compartilhado/decimal.ts";
import type {
  Calculo,
  DataISO,
  EncargosProprios,
  Lancamento,
  TabelaIndices,
  TextoDecimal,
} from "../../compartilhado/tipos.ts";
import { apurarValorBase } from "../../motor/base.ts";

/**
 * Sugestões da linha nova de "+ Prestação" e "+ Pagamento" (decisões de 13/10/2026): a linha
 * aparece na tabela já preenchida, editável, e herda as regras próprias de correção e juros
 * (metodologia própria) do último lançamento do mesmo tipo; os termos próprios (datas) não são
 * herdados, e a correção e os juros correm da data da linha até a data do cálculo. Módulo puro.
 */
export interface RascunhoDeLancamento {
  tipo: Lancamento["tipo"];
  data: DataISO;
  /** valor sugerido (texto decimal com ponto), ou "" quando não há o que sugerir */
  valor: TextoDecimal;
  /**
   * prestação cujo valor sugerido vem da base dos alimentos: se a pessoa não mexer no valor, ela
   * entra sem valor informado (continua pela base, com reajustes)
   */
  pelaBase: boolean;
  encargos?: EncargosProprios;
}

/** Valor que a base dos alimentos dá para uma prestação com este vencimento, ou "" se não dá. */
export function valorPelaBase(
  calculo: Calculo,
  tabela: TabelaIndices,
  data: DataISO,
): TextoDecimal {
  const casas = calculo.metodologia.arredondamento.valorCasas;
  const prestacao: Lancamento = {
    id: "rascunho",
    tipo: "prestacao",
    data,
    competencia: competenciaDe(data),
    origem: "avulso",
    editado: false,
  };
  const apurado = apurarValorBase(prestacao, calculo.base, tabela, casas);
  return apurado.valor === null ? "" : paraTexto(apurado.valor, casas);
}

function ultimoDoTipo(calculo: Calculo, tipo: Lancamento["tipo"]): Lancamento | undefined {
  return calculo.lancamentos.filter((l) => l.tipo === tipo).at(-1);
}

/**
 * A prestação que serve de modelo: a última comum (sem descrição); só se não houver nenhuma, a
 * última de todas. Um 13º ou férias avulsos (com descrição) são extras e não ditam o vencimento,
 * o valor nem as regras da próxima prestação.
 */
function ultimaPrestacaoComum(calculo: Calculo): Lancamento | undefined {
  const prestacoes = calculo.lancamentos.filter((l) => l.tipo === "prestacao");
  return prestacoes.filter((l) => (l.descricao ?? "").trim() === "").at(-1) ?? prestacoes.at(-1);
}

function herdarRegras(anterior: Lancamento | undefined): EncargosProprios | undefined {
  const metodologia = anterior?.encargos?.metodologia;
  return metodologia === undefined ? undefined : { metodologia: structuredClone(metodologia) };
}

/**
 * Prestação nova: vencimento no mês seguinte ao da última prestação comum, no mesmo dia (último
 * dia do mês quando ele é mais curto); sem prestação anterior, a data de elaboração. Valor: o
 * informado à mão da última comum, se ela o tinha (a nova também fica como informada); senão, o da
 * base para o novo vencimento.
 */
export function sugerirPrestacao(calculo: Calculo, tabela: TabelaIndices): RascunhoDeLancamento {
  const anterior = ultimaPrestacaoComum(calculo);
  const data =
    anterior === undefined
      ? calculo.dataElaboracao
      : dataNoMes(mesSeguinte(competenciaDe(anterior.data)), decompor(anterior.data).dia);
  const encargos = herdarRegras(anterior);
  const comum = { tipo: "prestacao" as const, data, ...(encargos ? { encargos } : {}) };
  if (anterior?.valorInformado !== undefined) {
    return { ...comum, valor: anterior.valorInformado, pelaBase: false };
  }
  return { ...comum, valor: valorPelaBase(calculo, tabela, data), pelaBase: true };
}

/** Pagamento novo: data de hoje (a data de elaboração) e o valor do último pagamento. */
export function sugerirPagamento(calculo: Calculo): RascunhoDeLancamento {
  const anterior = ultimoDoTipo(calculo, "amortizacao");
  const encargos = herdarRegras(anterior);
  return {
    tipo: "amortizacao",
    data: calculo.dataElaboracao,
    valor: anterior?.valorInformado ?? "",
    pelaBase: false,
    ...(encargos ? { encargos } : {}),
  };
}
```

`src/ui/tabelas/CelulaEditavel.tsx`:

```tsx
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useMascara } from "../componentes/Campo.tsx";

/**
 * Célula editável na própria tabela (decisão de 13/10/2026), no padrão das planilhas: o clique
 * (ou Enter, ou Espaço) torna o texto editável; Enter ou sair do campo (Tab, clique fora) grava;
 * Esc desiste. Editar não muda a tabela: o campo tem a largura, a letra e o alinhamento do texto
 * que substitui, só com um contorno (a data é digitada como dd/mm/aaaa, sem o calendário do
 * navegador, que alargaria a coluna). Texto inválido fica no campo, em vermelho, com o erro num
 * balão logo abaixo (sem empurrar a linha), e não é gravado. Texto igual ao inicial não grava nada
 * (não marca a linha como ajustada). Trocar de janela (conferir um PDF, por exemplo) não grava: o
 * campo continua aberto, como estava.
 */
export function CelulaEditavel({
  nome,
  exibido,
  textoInicial,
  inputMode,
  placeholder,
  mascara,
  aoGravar,
}: {
  /** nome do campo para o leitor de tela, ex.: "Valor da prestação de 05/09/2026" */
  nome: string;
  /** o que a célula mostra fora da edição */
  exibido: string;
  /** o texto com que o campo abre */
  textoInicial: string;
  inputMode?: "decimal" | "numeric";
  placeholder?: string;
  /** máscara de números aplicada enquanto se digita (data dd/mm/aaaa) */
  mascara?: (texto: string) => string;
  /** grava o texto; devolve a mensagem de erro, ou null quando gravou */
  aoGravar: (texto: string) => string | null;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(textoInicial);
  const [erro, setErro] = useState<string | null>(null);
  // largura do texto no momento do clique: o campo ocupa exatamente esse espaço
  const [largura, setLargura] = useState<number | null>(null);
  const { ref: campo, onChange } = useMascara({
    valor: texto,
    aoMudar: (novo) => {
      setTexto(novo);
      setErro(null);
    },
    mascara,
  });
  const botao = useRef<HTMLButtonElement>(null);
  // depois de Enter ou Esc o foco volta ao botão da célula (o teclado continua na tabela); depois
  // de sair do campo com Tab ou clique, fica onde a pessoa o pôs
  const voltarFoco = useRef(false);
  // o campo some ao gravar ou desistir: o blur que vier depois não grava de novo
  const encerrado = useRef(false);
  const idDoErro = useId();

  useEffect(() => {
    if (editando) {
      campo.current?.focus();
      campo.current?.select();
    } else if (voltarFoco.current) {
      voltarFoco.current = false;
      botao.current?.focus();
    }
  }, [editando, campo]);

  const abrir = () => {
    encerrado.current = false;
    const medida = botao.current?.getBoundingClientRect().width ?? 0;
    setLargura(medida > 0 ? medida : null);
    setTexto(textoInicial);
    setErro(null);
    setEditando(true);
  };
  const fechar = (comFoco: boolean) => {
    encerrado.current = true;
    voltarFoco.current = comFoco;
    setEditando(false);
  };
  const gravar = (comFoco: boolean) => {
    if (encerrado.current) return;
    if (texto === textoInicial) {
      fechar(comFoco);
      return;
    }
    const falha = aoGravar(texto);
    if (falha === null) fechar(comFoco);
    else setErro(falha);
  };
  const tecla = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key === "Enter") {
      evento.preventDefault();
      gravar(true);
    } else if (evento.key === "Escape") {
      evento.preventDefault();
      evento.stopPropagation();
      fechar(true);
    }
  };

  if (!editando) {
    return (
      <button
        type="button"
        className="celula-editavel"
        ref={botao}
        onClick={abrir}
        aria-label={`Editar ${nome.charAt(0).toLowerCase()}${nome.slice(1)} (${exibido})`}
        title="Clique para corrigir (Enter grava, Esc desiste)"
      >
        {exibido}
      </button>
    );
  }
  return (
    <span className="celula-em-edicao">
      <input
        ref={campo}
        type="text"
        value={texto}
        onChange={onChange}
        onKeyDown={tecla}
        onBlur={(evento) => {
          // a janela inteira perdeu o foco (troca de programa): nada é gravado pela metade; o
          // campo continua aberto e recebe o foco de volta quando a pessoa voltar
          const destino = evento.relatedTarget;
          if (destino === null && !document.hasFocus()) return;
          gravar(false);
          // gravar o vencimento pode mudar a linha de lugar, e o navegador tira o foco de um
          // elemento movido: o foco volta para onde o Tab ou o clique o levou
          if (destino instanceof HTMLElement) {
            requestAnimationFrame(() => {
              if (destino.isConnected && document.activeElement === document.body) destino.focus();
            });
          }
        }}
        style={largura === null ? undefined : { width: `${largura}px` }}
        aria-label={nome}
        aria-invalid={erro !== null}
        aria-describedby={erro === null ? undefined : idDoErro}
        inputMode={inputMode}
        placeholder={placeholder}
      />
      {erro !== null ? (
        <span className="erro" id={idDoErro} role="alert">
          {erro}
        </span>
      ) : null}
    </span>
  );
}
```

`src/ui/tabelas/Indicadores.tsx`:

```tsx
import { useLayoutEffect, useRef, useState } from "react";
import { decimal, ZERO } from "../../compartilhado/decimal.ts";
import { formatarData, formatarMoeda } from "../../compartilhado/formatacao.ts";
import type { DataISO, Totais } from "../../compartilhado/tipos.ts";

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
        <dd>{valor(semDivida ? formatarMoeda(ZERO) : moeda(totais.totalGeral))}</dd>
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
```

`src/ui/tabelas/TabelaLancamentos.tsx`:

```tsx
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { decimal, ZERO, type Decimal } from "../../compartilhado/decimal.ts";
import {
  formatarCompetencia,
  formatarData,
  formatarFator,
  formatarMoeda,
  formatarPercentual,
} from "../../compartilhado/formatacao.ts";
import { NOME_DA_SERIE } from "../../compartilhado/tipos.ts";
import type {
  DataISO,
  Lancamento,
  LancamentoCalculado,
  TextoDecimal,
} from "../../compartilhado/tipos.ts";
import { Ajuda } from "../componentes/Ajuda.tsx";
import {
  formatarDataParaCampo,
  formatarMoedaParaCampo,
  lerData,
  lerDataTexto,
  lerValorPositivo,
  mascaraData,
} from "../entrada.ts";
import type { MudancasDoLancamento } from "../estado/calculo.ts";
import type { RascunhoDeLancamento } from "../estado/novaLinha.ts";
import { CelulaEditavel } from "./CelulaEditavel.tsx";

/**
 * Tabelas de prestações e de amortizações (§9.3), com as mesmas colunas: vencimento (ou data do
 * pagamento), valor, fator, corrigido, juros (% e R$), atualizado. O vencimento é a referência de
 * cada linha; a competência não aparece (decisão de 13/10/2026). Vencimento e valor se corrigem
 * na própria célula (clique ou Enter; Enter grava, Esc desiste); ▸ expande a memória (base,
 * índices mês a mês, dias de juros por mês e regime, avisos); o lápis abre "Personalizar" para
 * os ajustes finos; o ✕ fica vermelho no primeiro clique e exclui no segundo.
 * "+ Prestação" / "+ Pagamento" abre uma linha nova no fim da tabela, já preenchida com a
 * sugestão (`estado/novaLinha.ts`); Enter ou ✓ inclui, Esc ou ✕ descarta.
 * Etiquetas na linha: vincenda, não computada, valor informado à mão, ajustada.
 */

export interface LinhaDaTabela {
  lancamento: Lancamento;
  calculado: LancamentoCalculado;
}

type NovoLancamento = Omit<Lancamento, "id" | "origem" | "editado">;

/** Tempo em que o ✕ fica armado (vermelho) esperando o segundo clique. */
const TEMPO_ARMADO_MS = 4000;

const NOME_DO_REGIME = {
  percentualMensal: "juros de",
  taxaLegal: "taxa legal de",
  selicUnica: "SELIC",
} as const;

/** "prestação de 05/09/2026", com a descrição entre parênteses quando há: o nome da linha. */
function nomeDoLancamento(lancamento: Lancamento): string {
  const base = `${lancamento.tipo === "prestacao" ? "prestação" : "pagamento"} de ${formatarData(lancamento.data)}`;
  return lancamento.descricao?.trim() ? `${base} (${lancamento.descricao.trim()})` : base;
}

function somar(
  linhas: LinhaDaTabela[],
  campo: "valorBase" | "corrigido" | "jurosValor" | "atualizado",
): Decimal {
  return linhas
    .filter((l) => l.calculado.situacao !== "ignorado")
    .reduce((soma, l) => soma.plus(decimal(l.calculado[campo])), ZERO);
}

/** Linha nova em edição: os textos dos campos e o que veio da sugestão. */
interface Rascunho {
  data: string;
  valor: string;
  /** valor sugerido, como aparece no campo; com `pelaBase`, deixá-lo igual mantém a prestação pela base */
  sugerido: string;
  pelaBase: boolean;
  encargos?: Lancamento["encargos"];
  erros: { data?: string; valor?: string };
}

const paraCampo = (valor: TextoDecimal) => (valor === "" ? "" : formatarMoedaParaCampo(valor));

export function TabelaLancamentos({
  tipo,
  linhas,
  aoPersonalizar,
  aoExcluir,
  aoEditar,
  aoSugerir,
  valorDaBase,
  aoIncluir,
}: {
  tipo: Lancamento["tipo"];
  linhas: LinhaDaTabela[];
  aoPersonalizar: (id: string) => void;
  aoExcluir: (id: string) => void;
  aoEditar: (id: string, mudancas: MudancasDoLancamento) => void;
  aoSugerir: () => RascunhoDeLancamento;
  /** valor que a base dá para um vencimento ("" quando não dá): acompanha a data da linha nova */
  valorDaBase: (data: DataISO) => TextoDecimal;
  aoIncluir: (lancamento: NovoLancamento) => void;
}) {
  const [expandidos, setExpandidos] = useState<ReadonlySet<string>>(new Set());
  // Exclusão em dois cliques, sem janela pop-up e sem mexer na linha (decisões de 13/10/2026): o
  // primeiro clique no ✕ o deixa vermelho ("armado"); um segundo clique, deliberado, exclui. Ele se
  // desarma com clique ou foco fora, Esc, 4 segundos sem o segundo clique (ver `Linha`) e quando o
  // cálculo muda (linhas novas vindas do App). Só um ✕ fica armado por vez.
  const [armado, setArmado] = useState<string | null>(null);
  const desarmar = useCallback(() => setArmado(null), []);
  const [linhasVistas, setLinhasVistas] = useState(linhas);
  if (linhas !== linhasVistas) {
    setLinhasVistas(linhas);
    setArmado(null);
    // memória aberta de uma linha que deixou de existir é esquecida: se a linha voltar (lote
    // relançado, mesmo id), volta fechada
    const presentes = new Set(linhas.map((l) => l.lancamento.id));
    if ([...expandidos].some((id) => !presentes.has(id))) {
      setExpandidos(new Set([...expandidos].filter((id) => presentes.has(id))));
    }
  }
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const idDosErros = useId();
  const campoDaDataNova = useRef<HTMLInputElement>(null);
  const botaoIncluir = useRef<HTMLButtonElement>(null);
  const focarIncluir = useRef(false);
  const linhaNovaAberta = rascunho !== null;
  useEffect(() => {
    if (linhaNovaAberta) campoDaDataNova.current?.focus();
    else if (focarIncluir.current) {
      focarIncluir.current = false;
      botaoIncluir.current?.focus();
    }
  }, [linhaNovaAberta]);
  const alternar = (id: string) => {
    const novo = new Set(expandidos);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    setExpandidos(novo);
  };
  const prestacoes = tipo === "prestacao";
  const titulo = prestacoes ? "Prestações" : "Amortizações (pagamentos)";
  const tituloId = prestacoes ? "titulo-tabela-prestacoes" : "titulo-tabela-amortizacoes";
  const nova = prestacoes ? "nova prestação" : "novo pagamento";

  const abrirLinhaNova = () => {
    if (rascunho !== null) {
      campoDaDataNova.current?.focus();
      return;
    }
    const sugestao = aoSugerir();
    const valor = paraCampo(sugestao.valor);
    setRascunho({
      data: sugestao.data,
      valor,
      sugerido: valor,
      pelaBase: sugestao.pelaBase,
      ...(sugestao.encargos ? { encargos: sugestao.encargos } : {}),
      erros: {},
    });
  };
  const mudarDataNova = (data: string) => {
    if (rascunho === null) return;
    // prestação pela base com o valor ainda não mexido: o valor sugerido acompanha o vencimento
    if (rascunho.pelaBase && rascunho.valor === rascunho.sugerido && lerData(data).ok) {
      const valor = paraCampo(valorDaBase(data));
      setRascunho({ ...rascunho, data, valor, sugerido: valor, erros: {} });
    } else setRascunho({ ...rascunho, data, erros: { ...rascunho.erros, data: undefined } });
  };
  const descartar = () => {
    focarIncluir.current = true;
    setRascunho(null);
  };
  const incluir = () => {
    if (rascunho === null) return;
    const data = lerData(rascunho.data);
    const semValor =
      prestacoes &&
      (rascunho.valor.trim() === "" || (rascunho.pelaBase && rascunho.valor === rascunho.sugerido));
    const valor = semValor ? null : lerValorPositivo(rascunho.valor);
    const erros: Rascunho["erros"] = {};
    if (!data.ok) erros.data = data.erro;
    if (valor !== null && !valor.ok) erros.valor = valor.erro;
    if (!data.ok || (valor !== null && !valor.ok)) {
      setRascunho({ ...rascunho, erros });
      return;
    }
    const lancamento: NovoLancamento = { tipo, data: data.valor };
    if (valor !== null) lancamento.valorInformado = valor.valor;
    if (rascunho.encargos) lancamento.encargos = rascunho.encargos;
    aoIncluir(lancamento);
    descartar();
  };
  const teclaNaLinhaNova = (evento: KeyboardEvent<HTMLTableRowElement>) => {
    if (evento.key === "Enter" && evento.target instanceof HTMLInputElement) {
      evento.preventDefault();
      incluir();
    } else if (evento.key === "Escape") {
      evento.preventDefault();
      descartar();
    }
  };

  return (
    <section className="tabela-rolagem" aria-labelledby={tituloId}>
      <div className="titulo-secao">
        <h2 id={tituloId}>{titulo}</h2>
        <Ajuda assunto={titulo}>
          {prestacoes
            ? "Clique no vencimento ou no valor para corrigi-lo na própria linha: Enter grava, Esc desiste. Valor digitado fica marcado como informado à mão; apagado, volta a ser apurado pela base. ▸ mostra a memória do cálculo; o lápis ajusta descrição, rendimento, termos e regras próprias; o ✕ pede confirmação antes de excluir."
            : "Clique na data ou no valor para corrigi-lo na própria linha: Enter grava, Esc desiste. Cada pagamento é atualizado da sua data até a data do cálculo e abatido do total. ▸ mostra a memória do cálculo; o lápis ajusta descrição, termos e regras próprias; o ✕ pede confirmação antes de excluir."}
        </Ajuda>
      </div>
      <div className="rolagem">
        <table>
          <thead>
            <tr>
              <th scope="col">{prestacoes ? "Vencimento" : "Data"}</th>
              <th scope="col">Valor</th>
              <th scope="col">Fator</th>
              <th scope="col">Corrigido</th>
              <th scope="col">Juros %</th>
              <th scope="col">Juros R$</th>
              <th scope="col">Atualizado</th>
              <th scope="col">
                <span className="oculto-acessivel">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && rascunho === null ? (
              <tr>
                <td colSpan={8} className="texto">
                  {prestacoes
                    ? 'Nenhuma prestação lançada: use "Lançar em lote" na seção 3 ou "+ Prestação".'
                    : 'Nenhum pagamento lançado: use "Lançar em lote" na seção 4 ou "+ Pagamento".'}
                </td>
              </tr>
            ) : null}
            {linhas.map((linha) => (
              <Fragment key={linha.lancamento.id}>
                <Linha
                  linha={linha}
                  expandida={expandidos.has(linha.lancamento.id)}
                  aoAlternar={() => alternar(linha.lancamento.id)}
                  aoPersonalizar={() => aoPersonalizar(linha.lancamento.id)}
                  aoEditar={(mudancas) => aoEditar(linha.lancamento.id, mudancas)}
                  armado={armado === linha.lancamento.id}
                  aoArmar={() => setArmado(linha.lancamento.id)}
                  aoDesarmar={desarmar}
                  aoConfirmarExclusao={() => {
                    setArmado(null);
                    aoExcluir(linha.lancamento.id);
                    botaoIncluir.current?.focus();
                  }}
                />
                {expandidos.has(linha.lancamento.id) ? <Memoria linha={linha} /> : null}
              </Fragment>
            ))}
            {rascunho !== null ? (
              <tr className="linha-nova" onKeyDown={teclaNaLinhaNova}>
                <td className="texto">
                  <span className="campo-linha-nova">
                    <input
                      ref={campoDaDataNova}
                      type="date"
                      min="1900-01-01"
                      value={rascunho.data}
                      onChange={(e) => mudarDataNova(e.target.value)}
                      aria-label={
                        prestacoes ? "Vencimento da nova prestação" : "Data do novo pagamento"
                      }
                      aria-invalid={rascunho.erros.data !== undefined}
                      aria-describedby={rascunho.erros.data ? `${idDosErros}-data` : undefined}
                    />
                    {rascunho.erros.data ? (
                      <span className="erro" id={`${idDosErros}-data`} role="alert">
                        {rascunho.erros.data}
                      </span>
                    ) : null}
                  </span>
                </td>
                <td>
                  <span className="campo-linha-nova">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={rascunho.valor}
                      onChange={(e) =>
                        setRascunho({
                          ...rascunho,
                          valor: e.target.value,
                          erros: { ...rascunho.erros, valor: undefined },
                        })
                      }
                      aria-label={
                        prestacoes ? "Valor da nova prestação" : "Valor do novo pagamento"
                      }
                      aria-invalid={rascunho.erros.valor !== undefined}
                      aria-describedby={rascunho.erros.valor ? `${idDosErros}-valor` : undefined}
                      placeholder={prestacoes ? "pela base" : "0,00"}
                    />
                    {rascunho.erros.valor ? (
                      <span className="erro" id={`${idDosErros}-valor`} role="alert">
                        {rascunho.erros.valor}
                      </span>
                    ) : null}
                  </span>
                </td>
                <td colSpan={5} className="texto dica">
                  Enter inclui · Esc descarta
                </td>
                <td className="acoes-linha">
                  <button
                    type="button"
                    className="botao-icone"
                    onClick={incluir}
                    aria-label={`Incluir ${prestacoes ? "a" : "o"} ${nova}`}
                    title="Incluir (Enter)"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    className="botao-icone"
                    onClick={descartar}
                    aria-label={`Descartar ${prestacoes ? "a" : "o"} ${nova}`}
                    title="Descartar (Esc)"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ) : null}
          </tbody>
          {linhas.length > 0 ? (
            <tfoot>
              <tr>
                <td className="texto">Total</td>
                <td>{formatarMoeda(somar(linhas, "valorBase"))}</td>
                <td />
                <td>{formatarMoeda(somar(linhas, "corrigido"))}</td>
                <td />
                <td>{formatarMoeda(somar(linhas, "jurosValor"))}</td>
                <td>{formatarMoeda(somar(linhas, "atualizado"))}</td>
                <td />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      <div className="rodape-tabela">
        <button
          type="button"
          className="botao secundario"
          onClick={abrirLinhaNova}
          ref={botaoIncluir}
        >
          {prestacoes ? "+ Prestação" : "+ Pagamento"}
        </button>
      </div>
    </section>
  );
}

function Linha({
  linha,
  expandida,
  aoAlternar,
  aoPersonalizar,
  aoEditar,
  armado,
  aoArmar,
  aoDesarmar,
  aoConfirmarExclusao,
}: {
  linha: LinhaDaTabela;
  expandida: boolean;
  aoAlternar: () => void;
  aoPersonalizar: () => void;
  aoEditar: (mudancas: MudancasDoLancamento) => void;
  armado: boolean;
  aoArmar: () => void;
  /** função estável (o prazo de 4 segundos não recomeça a cada desenho da tabela) */
  aoDesarmar: () => void;
  aoConfirmarExclusao: () => void;
}) {
  // O ✕ armado se desarma com qualquer clique ou foco fora dele (outra linha, a memória, outra
  // tabela, um campo, Tab para fora) e depois de 4 segundos sem o segundo clique.
  const xis = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!armado) return;
    const fora = (evento: Event) => {
      if (evento.target instanceof Node && xis.current?.contains(evento.target)) return;
      aoDesarmar();
    };
    const prazo = setTimeout(aoDesarmar, TEMPO_ARMADO_MS);
    document.addEventListener("pointerdown", fora, true);
    document.addEventListener("focusin", fora);
    return () => {
      clearTimeout(prazo);
      document.removeEventListener("pointerdown", fora, true);
      document.removeEventListener("focusin", fora);
    };
  }, [armado, aoDesarmar]);
  const cliqueNoXis = (evento: MouseEvent<HTMLButtonElement>) => {
    if (!armado) {
      aoArmar();
      return;
    }
    // o segundo clique de um clique duplo (detail 2) não confirma: só um segundo clique
    // deliberado exclui; Enter ou Espaço (detail 0) também confirmam
    if (evento.detail > 1) return;
    aoConfirmarExclusao();
  };
  const teclaNoXis = (evento: KeyboardEvent<HTMLButtonElement>) => {
    if (evento.key === "Escape" && armado) {
      evento.stopPropagation();
      aoDesarmar();
    }
    // Enter ou Espaço segurados (tecla repetida) não confirmam
    if (evento.repeat && (evento.key === "Enter" || evento.key === " ")) evento.preventDefault();
  };
  const { lancamento, calculado } = linha;
  const feminino = lancamento.tipo === "prestacao";
  const nome = nomeDoLancamento(lancamento);
  const artigo = feminino ? "da" : "do";
  // Etiquetas com a explicação no `title` (§9.4: nenhum rótulo sem explicação).
  const etiquetas: Array<{ texto: string; explicacao: string }> = [];
  if (calculado.situacao === "vincenda") {
    etiquetas.push({
      texto: "vincenda",
      explicacao:
        "Vence depois da data de elaboração: entra pelo valor nominal, sem correção e sem juros.",
    });
  }
  if (calculado.situacao === "ignorado") {
    etiquetas.push({
      texto: feminino ? "não computada" : "não computado",
      explicacao: "Fora dos totais; o motivo está na memória (clique no nome da linha).",
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
  const moeda = (texto: string) => formatarMoeda(decimal(texto));
  // o campo do valor abre com o valor informado à mão ou, na prestação pela base, com o valor
  // apurado (gravá-lo sem mudar nada não o transforma em informado)
  const textoDoValor =
    lancamento.valorInformado !== undefined
      ? formatarMoedaParaCampo(lancamento.valorInformado)
      : decimal(calculado.valorBase).gt(ZERO)
        ? formatarMoedaParaCampo(calculado.valorBase)
        : "";
  return (
    <tr>
      <td className="texto">
        <button
          type="button"
          className="botao-expandir"
          aria-expanded={expandida}
          aria-label={`Memória ${artigo} ${nome}`}
          title="Memória do cálculo"
          onClick={aoAlternar}
        >
          {expandida ? "▾" : "▸"}
        </button>
        <CelulaEditavel
          nome={feminino ? `Vencimento da ${nome}` : `Data do ${nome}`}
          exibido={formatarData(lancamento.data)}
          textoInicial={formatarDataParaCampo(lancamento.data)}
          inputMode="numeric"
          placeholder="dd/mm/aaaa"
          mascara={mascaraData}
          aoGravar={(texto) => {
            const data = lerDataTexto(texto);
            if (!data.ok) return data.erro;
            aoEditar({ data: data.valor });
            return null;
          }}
        />
        {lancamento.descricao?.trim() ? (
          <span className="descricao">{lancamento.descricao.trim()}</span>
        ) : null}
        {etiquetas.map((etiqueta) => (
          <span key={etiqueta.texto} className="etiqueta" title={etiqueta.explicacao}>
            {etiqueta.texto}
          </span>
        ))}
      </td>
      <td>
        <CelulaEditavel
          nome={`Valor ${artigo} ${nome}`}
          exibido={moeda(calculado.valorBase)}
          textoInicial={textoDoValor}
          inputMode="decimal"
          placeholder={feminino ? "pela base" : undefined}
          aoGravar={(texto) => {
            if (texto.trim() === "") {
              if (!feminino) return "Informe um valor maior que zero.";
              aoEditar({ valorInformado: undefined });
              return null;
            }
            const valor = lerValorPositivo(texto);
            if (!valor.ok) return valor.erro;
            aoEditar({ valorInformado: valor.valor });
            return null;
          }}
        />
      </td>
      <td>{formatarFator(decimal(calculado.correcao.fator))}</td>
      <td>{moeda(calculado.corrigido)}</td>
      <td>{formatarPercentual(decimal(calculado.juros.percentual), 6)}</td>
      <td>{moeda(calculado.jurosValor)}</td>
      <td>{moeda(calculado.atualizado)}</td>
      <td className="acoes-linha">
        <button
          type="button"
          className="botao-icone"
          onClick={aoPersonalizar}
          aria-label={`Personalizar ${nome}`}
          title="Personalizar"
        >
          ✎
        </button>
        <button
          type="button"
          className={`botao-icone excluir${armado ? " armado" : ""}`}
          onClick={cliqueNoXis}
          onKeyDown={teclaNoXis}
          ref={xis}
          aria-label={
            armado
              ? `Clique de novo para excluir ${feminino ? "a" : "o"} ${nome}`
              : `Excluir ${nome}`
          }
          title={armado ? "Clique de novo para excluir" : "Excluir (pede um segundo clique)"}
        >
          ✕
        </button>
      </td>
    </tr>
  );
}

function descreverIndice(i: LancamentoCalculado["correcao"]["indices"][number]): string {
  const mes = formatarCompetencia(i.competencia);
  if (i.serie === null) return `${mes}: sem correção neste período`;
  const nome = NOME_DA_SERIE[i.serie];
  if (i.fracao.startsWith("0/")) return `${nome} de ${mes}: não entra`;
  const valor = i.valor === null ? "sem índice (fator 1,000000)" : `${i.valor.replace(".", ",")}%`;
  const fracao = i.fracao === "1" ? "" : ` (${i.fracao} do mês)`;
  return `${nome} de ${mes}: ${valor}${fracao}`;
}

function descreverJuros(d: LancamentoCalculado["juros"]["detalhe"][number]): string {
  const dias = d.diasDoMes === undefined ? `${d.dias} dias` : `${d.dias} de ${d.diasDoMes} dias`;
  return `${NOME_DO_REGIME[d.regime]} ${d.taxa.replace(".", ",")}% de ${formatarData(d.de)} a ${formatarData(d.ate)} (${dias}): ${formatarPercentual(decimal(d.percentual), 6)}`;
}

function Memoria({ linha }: { linha: LinhaDaTabela }) {
  const { calculado } = linha;
  return (
    <tr className="memoria">
      <td colSpan={8}>
        <p>
          <strong>Memória · {nomeDoLancamento(linha.lancamento)}</strong>
        </p>
        <p>Base: {calculado.memoriaBase}</p>
        <p>
          Correção (fator {formatarFator(decimal(calculado.correcao.fator))}
          {calculado.correcao.pisoAplicado ? ", com piso no valor original" : ""}):
        </p>
        <ul>
          {calculado.correcao.indices.map((i) => (
            <li key={`${i.serie ?? "x"}-${i.competencia}`}>{descreverIndice(i)}</li>
          ))}
          {calculado.correcao.indices.length === 0 ? <li>nenhum mês de correção</li> : null}
        </ul>
        <p>
          Juros ({formatarPercentual(decimal(calculado.juros.percentual), 6)} sobre o corrigido):
        </p>
        <ul>
          {calculado.juros.detalhe.map((d) => (
            <li key={`${d.de}-${d.ate}`}>{descreverJuros(d)}</li>
          ))}
          {calculado.juros.detalhe.length === 0 ? <li>sem juros</li> : null}
        </ul>
        {calculado.avisos.length > 0 ? (
          <>
            <p>Avisos:</p>
            <ul>
              {calculado.avisos.map((aviso) => (
                <li key={aviso}>{aviso}</li>
              ))}
            </ul>
          </>
        ) : null}
      </td>
    </tr>
  );
}
```

`src/ui/App.tsx` (reescrito; a coluna da direita ganha indicadores, as duas tabelas, com a edição na célula e a linha nova ligadas ao redutor, e a caixa de avisos com `situacao.avisos`, `avisosDaAbertura` e `resultado.avisos`):

```tsx
import { useMemo, useReducer, useState } from "react";
import type { Lancamento, LancamentoCalculado } from "../compartilhado/tipos.ts";
import { calcular } from "../motor/calcular.ts";
import { ambientePadrao, type Ambiente } from "./ambiente.ts";
import { CHAVE_RECENTES, removerChave } from "./armazenamento.ts";
import { BarraSuperior } from "./BarraSuperior.tsx";
import { Avisos } from "./componentes/Avisos.tsx";
import { Dialogo } from "./componentes/Dialogo.tsx";
import {
  estadoInicial,
  novoCalculo,
  reduzir,
  type MudancasDoLancamento,
} from "./estado/calculo.ts";
import { faltasDaBase } from "./estado/faltas.ts";
import { sugerirPagamento, sugerirPrestacao, valorPelaBase } from "./estado/novaLinha.ts";
import "./estilos.css";
import {
  esquecer,
  gravarPreferencias,
  lerPreferencias,
  type Preferencias,
} from "./preferencias.ts";
import { Rodape } from "./Rodape.tsx";
import { Indicadores } from "./tabelas/Indicadores.tsx";
import { TabelaLancamentos, type LinhaDaTabela } from "./tabelas/TabelaLancamentos.tsx";
import { BaseDosAlimentos } from "./secoes/Base.tsx";
import { EditorDePeriodos } from "./secoes/EditorDePeriodos.tsx";
import { Encargos } from "./secoes/Encargos.tsx";
import { LotePagamentosSecao } from "./secoes/LotePagamentos.tsx";
import { LotePrestacoesSecao } from "./secoes/LotePrestacoes.tsx";
import { Processo } from "./secoes/Processo.tsx";

/**
 * Tela única em duas colunas (§9): esquerda, dados do caso e lançamentos em lote; direita,
 * resultado e lançamentos individuais. Recálculo a cada alteração, sem botão "Calcular" (§4.3).
 * O `ambiente` é injetável para os testes de componente.
 */
export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambiente }) {
  const armazenamento = ambiente.armazenamento();
  const [preferencias, setPreferencias] = useState(() => lerPreferencias(armazenamento));
  const calculoNovo = (p: Preferencias) =>
    novoCalculo({
      id: ambiente.novoId(),
      agora: ambiente.agora(),
      hoje: ambiente.hoje(),
      cabecalho: p.lembrar ? { defensor: p.defensor, orgao: p.orgao } : {},
    });
  // A tabela de índices é congelada quando o app abre (§8.2); "Novo cálculo" congela outra.
  const [estado, despachar] = useReducer(reduzir, undefined, () =>
    estadoInicial(calculoNovo(preferencias), ambiente.congelar()),
  );
  const resultado = useMemo(
    () => calcular(estado.calculo, estado.tabela),
    [estado.calculo, estado.tabela],
  );
  const agora = () => ambiente.agora();
  // o que falta na base para apurar as prestações lançadas: aviso no topo e campo em vermelho
  const faltas = faltasDaBase(estado.calculo);
  const [editorAberto, setEditorAberto] = useState(false);
  // Uma linha por lançamento, na ordem do cálculo (o motor devolve os calculados na mesma ordem).
  const linhas: LinhaDaTabela[] = estado.calculo.lancamentos.map((lancamento, i) => ({
    lancamento,
    calculado: resultado.lancamentos[i] as LancamentoCalculado,
  }));
  const excluir = (id: string) => despachar({ tipo: "excluirLancamento", id, em: agora() });
  const editar = (id: string, mudancas: MudancasDoLancamento) =>
    despachar({ tipo: "editarLancamento", id, mudancas, em: agora() });
  const incluir = (lancamento: Omit<Lancamento, "id" | "origem" | "editado">) =>
    despachar({ tipo: "incluirLancamento", lancamento, em: agora() });
  const valorDaBase = (data: string) => valorPelaBase(estado.calculo, estado.tabela, data);

  const novo = () =>
    despachar({ tipo: "novo", calculo: calculoNovo(preferencias), ...ambiente.congelar() });

  const mudarPreferencias = (mudancas: Partial<Preferencias>) => {
    const novas = { ...preferencias, ...mudancas };
    setPreferencias(novas);
    gravarPreferencias(armazenamento, novas);
    if (mudancas.guardarRecentes === false) removerChave(armazenamento, CHAVE_RECENTES);
  };
  const mudarCabecalho = (campo: keyof typeof estado.calculo.cabecalho, valor: string) => {
    despachar({ tipo: "cabecalho", campo, valor, em: agora() });
    if ((campo === "defensor" || campo === "orgao") && preferencias.lembrar) {
      mudarPreferencias({ [campo]: valor });
    }
  };
  const esquecerTudo = () => {
    esquecer(armazenamento);
    const novas = { ...preferencias, defensor: "", orgao: "", lembrar: false };
    setPreferencias(novas);
    gravarPreferencias(armazenamento, novas);
  };

  return (
    <div className="app">
      <BarraSuperior aoNovo={novo} />
      <main className="principal">
        <div className="coluna-esquerda" key={`esquerda-${estado.calculo.id}`}>
          <Processo
            cabecalho={estado.calculo.cabecalho}
            aoMudar={mudarCabecalho}
            preferencias={preferencias}
            aoMudarPreferencias={mudarPreferencias}
            aoEsquecer={esquecerTudo}
            armazenamentoDisponivel={armazenamento !== null}
          />
          <BaseDosAlimentos
            base={estado.calculo.base}
            hoje={ambiente.hoje()}
            faltas={faltas}
            aoMudar={(base) => despachar({ tipo: "base", base, em: agora() })}
          />
          <LotePrestacoesSecao
            ultimoLote={estado.calculo.lotes.ultimoLotePrestacoes}
            avisos={estado.loteRecente === "prestacoes" ? estado.avisosDoLote : []}
            aoLancar={(lote) => despachar({ tipo: "lancarPrestacoes", lote, em: agora() })}
          />
          <LotePagamentosSecao
            ultimoLote={estado.calculo.lotes.ultimoLoteAmortizacoes}
            avisos={estado.loteRecente === "pagamentos" ? estado.avisosDoLote : []}
            aoLancar={(lote) => despachar({ tipo: "lancarPagamentos", lote, em: agora() })}
          />
          <Encargos
            calculo={estado.calculo}
            aoMudarAcrescimo={(campo, valor) =>
              despachar({ tipo: "acrescimos", campo, valor, em: agora() })
            }
            aoMudarDataElaboracao={(data) =>
              despachar({ tipo: "dataElaboracao", data, em: agora() })
            }
            aoMudarObservacoes={(texto) => despachar({ tipo: "observacoes", texto, em: agora() })}
            aoAjustar={() => setEditorAberto(true)}
          />
        </div>
        <div className="coluna-direita" key={`direita-${estado.calculo.id}`}>
          <Indicadores totais={resultado.totais} dataElaboracao={estado.calculo.dataElaboracao} />
          <TabelaLancamentos
            tipo="prestacao"
            linhas={linhas.filter((l) => l.lancamento.tipo === "prestacao")}
            aoPersonalizar={() => undefined}
            aoExcluir={excluir}
            aoEditar={editar}
            aoSugerir={() => sugerirPrestacao(estado.calculo, estado.tabela)}
            valorDaBase={valorDaBase}
            aoIncluir={incluir}
          />
          <TabelaLancamentos
            tipo="amortizacao"
            linhas={linhas.filter((l) => l.lancamento.tipo === "amortizacao")}
            aoPersonalizar={() => undefined}
            aoExcluir={excluir}
            aoEditar={editar}
            aoSugerir={() => sugerirPagamento(estado.calculo)}
            valorDaBase={valorDaBase}
            aoIncluir={incluir}
          />
          <Avisos
            avisos={[
              ...faltas.map((f) => f.aviso),
              ...estado.situacao.avisos,
              ...estado.avisosDaAbertura,
              ...resultado.avisos,
            ]}
          />
        </div>
      </main>
      <Rodape situacaoDosIndices={estado.situacao.rodape} />
      <Dialogo
        titulo="Ajustar a metodologia de encargos"
        aberto={editorAberto}
        aoFechar={() => setEditorAberto(false)}
      >
        <EditorDePeriodos
          metodologia={estado.calculo.metodologia}
          aoMudar={(metodologia) => despachar({ tipo: "metodologia", metodologia, em: agora() })}
        />
        <div className="dialogo-acoes">
          <button type="button" className="botao" onClick={() => setEditorAberto(false)}>
            Fechar
          </button>
        </div>
      </Dialogo>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/ui/estado/novaLinha.test.ts src/ui/tabelas/Tabelas.test.tsx`
Esperado: `15 passed (15)` (6 das sugestões, 9 das tabelas).

- [ ] **Step 5: Verificação completa**

Run: `npm run format && npm run verificar`
Esperado: `767 passed | 9 skipped (776)` em 39 arquivos.

- [ ] **Step 6: Commit**

```bash
git add src/ui/estado/novaLinha.ts src/ui/estado/novaLinha.test.ts src/ui/tabelas/CelulaEditavel.tsx src/ui/tabelas/Indicadores.tsx src/ui/tabelas/TabelaLancamentos.tsx src/ui/tabelas/Tabelas.test.tsx src/ui/App.tsx
git commit -m "ui: lado direito com indicadores, tabelas de prestações e amortizações, memória por lançamento, edição na célula, linha nova e exclusão

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 11: "Personalizar" (lápis): valor, data, descrição, rendimento, termos próprios e regras próprias

**Files:**
- Create: `src/ui/tabelas/Personalizar.tsx`
- Modify (reescrito): `src/ui/App.tsx`
- Test: `src/ui/tabelas/Personalizar.test.tsx`

**Interfaces:**
- Consumes: `formatarData`; `Ajuda`, `CampoTexto`, `Opcao`; `lerData`, `lerValorPositivo`, `formatarMoedaParaCampo`, `Leitura`; `MudancasDoLancamento` e as ações `editarLancamento` e `aplicarRendimentoDaquiEmDiante` (Task 4); `EditorDePeriodos` (Task 8); `Dialogo`.
- Produces: `Personalizar({ lancamento, calculo, aoEditar, aoAplicarRendimento, aoFechar })`, o painel do lápis para os ajustes finos (D13; a inclusão avulsa é a linha nova da Task 10). Títulos dos painéis: "Personalizar prestação", "Personalizar pagamento". Rótulos: "Vencimento" / "Data do pagamento", "Valor informado à mão (opcional)" / "Valor pago", "Descrição (opcional)", "Rendimento deste mês (opcional)", "Aplicar este rendimento daqui em diante", "Termos próprios", "Correção desde", "Correção até", "Juros desde", "Juros até", "Usar regras próprias de correção e juros neste lançamento", "Cancelar", "Aplicar"; sem campo de competência (D23); as explicações nos balões "Ajuda: Valor informado à mão (opcional)" (ou "Ajuda: Valor pago"), "Ajuda: Descrição (opcional)", "Ajuda: Rendimento deste mês (opcional)" e "Ajuda: Termos próprios". Erros próprios: "Não pode ser posterior à data de elaboração (dd/mm/aaaa).", "O termo inicial não pode ser posterior ao termo final.", "O termo inicial não pode ser posterior à data de elaboração (dd/mm/aaaa)." (termo inicial informado sem termo final).

- [ ] **Step 1: Escrever os testes**

`src/ui/tabelas/Personalizar.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../App.tsx";
import { ambienteDeTeste } from "../testes/ambiente-de-teste.ts";

afterEach(cleanup);

async function montarCaso(user: ReturnType<typeof userEvent.setup>) {
  render(<App ambiente={ambienteDeTeste()} />);
  await user.type(screen.getByLabelText("Valor fixado"), "1.000,00");
  const prestacoes = within(screen.getByRole("region", { name: /3 · Prestações em atraso/ }));
  await user.click(prestacoes.getByLabelText("Meses em atraso"));
  await user.type(prestacoes.getByLabelText("Dia do vencimento"), "5");
  await user.type(prestacoes.getByLabelText("Quantos meses"), "2");
  await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
}

function linhaDaPrestacao(nome: string): HTMLElement {
  return screen.getByRole("button", { name: `Memória da ${nome}` }).closest("tr") as HTMLElement;
}

describe("Personalizar, o lápis da linha (§9.3)", () => {
  it("o lápis abre o painel com os dados da prestação; valor informado à mão marca a linha e muda o cálculo", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    await user.click(screen.getByRole("button", { name: "Personalizar prestação de 05/09/2026" }));
    const painel = within(screen.getByRole("dialog", { name: "Personalizar prestação" }));
    // a competência não aparece: o vencimento é a referência da linha (decisão de 13/10/2026)
    expect(painel.queryByLabelText(/Competência/)).toBeNull();
    expect((painel.getByLabelText("Vencimento") as HTMLInputElement).value).toBe("2026-09-05");
    expect(
      (painel.getByLabelText("Valor informado à mão (opcional)") as HTMLInputElement).value,
    ).toBe("");
    await user.type(painel.getByLabelText("Valor informado à mão (opcional)"), "1.200,00");
    await user.type(painel.getByLabelText("Descrição (opcional)"), "Valor diverso");
    await user.click(painel.getByRole("button", { name: "Aplicar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    const linha = linhaDaPrestacao("prestação de 05/09/2026 (Valor diverso)");
    const celulas = within(linha)
      .getAllByRole("cell")
      .map((c) => c.textContent);
    expect(celulas[1]).toBe("R$ 1.200,00");
    expect(celulas[0]).toContain("valor informado");
    expect(celulas[0]).toContain("ajustada");
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).toContain(
      "Prestações com valor informado à mão, não apurado pela base dos alimentos: set/2026.",
    );
    // relançar o lote não sobrescreve a edição
    const prestacoes = within(screen.getByRole("region", { name: /3 · Prestações em atraso/ }));
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    expect(
      within(linhaDaPrestacao("prestação de 05/09/2026 (Valor diverso)")).getAllByRole("cell")[1]
        ?.textContent,
    ).toBe("R$ 1.200,00");
    // limpar o valor volta a apurar pela base
    await user.click(
      screen.getByRole("button", {
        name: "Personalizar prestação de 05/09/2026 (Valor diverso)",
      }),
    );
    const outra = within(screen.getByRole("dialog", { name: "Personalizar prestação" }));
    await user.clear(outra.getByLabelText("Valor informado à mão (opcional)"));
    await user.click(outra.getByRole("button", { name: "Aplicar" }));
    expect(
      within(linhaDaPrestacao("prestação de 05/09/2026 (Valor diverso)")).getAllByRole("cell")[1]
        ?.textContent,
    ).toBe("R$ 1.000,00");
  });

  it("termo final posterior à data de elaboração e termo inicial depois do final são recusados no painel", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    await user.click(screen.getByRole("button", { name: "Personalizar prestação de 05/09/2026" }));
    const painel = within(screen.getByRole("dialog", { name: "Personalizar prestação" }));
    fireEvent.change(painel.getByLabelText("Correção até"), { target: { value: "2026-12-31" } });
    fireEvent.change(painel.getByLabelText("Juros desde"), { target: { value: "2026-10-01" } });
    fireEvent.change(painel.getByLabelText("Juros até"), { target: { value: "2026-09-20" } });
    await user.click(painel.getByRole("button", { name: "Aplicar" }));
    expect(painel.getAllByRole("alert").map((a) => a.textContent)).toEqual([
      "Não pode ser posterior à data de elaboração (11/10/2026).",
      "O termo inicial não pode ser posterior ao termo final.",
    ]);
    expect(screen.getByRole("dialog")).toBeDefined();
    fireEvent.change(painel.getByLabelText("Correção até"), { target: { value: "2026-09-30" } });
    // termo inicial depois da data de elaboração, sem termo final informado, também é recusado
    fireEvent.change(painel.getByLabelText("Juros desde"), { target: { value: "2026-11-01" } });
    fireEvent.change(painel.getByLabelText("Juros até"), { target: { value: "" } });
    await user.click(painel.getByRole("button", { name: "Aplicar" }));
    expect(painel.getAllByRole("alert").map((a) => a.textContent)).toEqual([
      "O termo inicial não pode ser posterior à data de elaboração (11/10/2026).",
    ]);
    fireEvent.change(painel.getByLabelText("Juros desde"), { target: { value: "" } });
    fireEvent.change(painel.getByLabelText("Juros até"), { target: { value: "2026-09-20" } });
    await user.click(painel.getByRole("button", { name: "Aplicar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Memória da prestação de 05/09/2026" }));
    const memoria = screen
      .getByText("Memória · prestação de 05/09/2026")
      .closest("tr") as HTMLElement;
    // juros até 20/09/2026: a taxa legal não conta o dia do termo final (05/09 a 19/09, 15 dias)
    expect(memoria.textContent).toContain("de 05/09/2026 a 19/09/2026 (15 de 30 dias)");
    expect(memoria.textContent).not.toContain("IPCA de out/2026");
  });

  it("o lápis de um pagamento abre 'Personalizar pagamento' com a data e o valor pago; Cancelar não muda nada", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    await user.click(screen.getByRole("button", { name: "+ Pagamento" }));
    await user.type(screen.getByLabelText("Valor do novo pagamento"), "150{Enter}");
    await user.click(screen.getByRole("button", { name: "Personalizar pagamento de 11/10/2026" }));
    const painel = within(screen.getByRole("dialog", { name: "Personalizar pagamento" }));
    expect((painel.getByLabelText("Data do pagamento") as HTMLInputElement).value).toBe(
      "2026-10-11",
    );
    expect((painel.getByLabelText("Valor pago") as HTMLInputElement).value).toBe("150,00");
    await user.clear(painel.getByLabelText("Valor pago"));
    await user.click(painel.getByRole("button", { name: "Aplicar" }));
    expect(painel.getByRole("alert").textContent).toBe("Informe um número.");
    await user.click(painel.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    const amortizacoes = within(screen.getByRole("region", { name: "Amortizações (pagamentos)" }));
    expect(amortizacoes.getAllByRole("row")[1]?.textContent).toContain("▸11/10/2026R$ 150,00");
  });

  it("a linha nova herda as regras próprias de correção e juros da última prestação, não os termos", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    await user.click(screen.getByRole("button", { name: "Personalizar prestação de 05/10/2026" }));
    const painel = within(screen.getByRole("dialog", { name: "Personalizar prestação" }));
    await user.click(
      painel.getByLabelText("Usar regras próprias de correção e juros neste lançamento"),
    );
    await user.selectOptions(
      painel.getAllByLabelText("Juros")[1] as HTMLElement,
      "percentualMensal",
    );
    fireEvent.change(painel.getByLabelText("Juros até"), { target: { value: "2026-10-08" } });
    await user.click(painel.getByRole("button", { name: "Aplicar" }));
    await user.click(screen.getByRole("button", { name: "+ Prestação" }));
    fireEvent.change(screen.getByLabelText("Vencimento da nova prestação"), {
      target: { value: "2026-10-07" },
    });
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Memória da prestação de 07/10/2026" }));
    const memoria = screen
      .getByText("Memória · prestação de 07/10/2026")
      .closest("tr") as HTMLElement;
    // juros de 1% ao mês (regras herdadas) até a data do cálculo (o termo final não é herdado)
    expect(memoria.textContent).toContain("juros de 1% de 07/10/2026 a 11/10/2026");
  });

  it("base em % dos rendimentos: rendimento do mês e 'aplicar daqui em diante'", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    await user.click(screen.getByLabelText("% dos rendimentos"));
    await user.type(screen.getByLabelText("Percentual dos rendimentos"), "30");
    await user.type(screen.getByLabelText("Rendimento mensal padrão (obrigatório)"), "1.000,00");
    const prestacoes = within(screen.getByRole("region", { name: /3 · Prestações em atraso/ }));
    await user.click(prestacoes.getByLabelText("Meses em atraso"));
    await user.type(prestacoes.getByLabelText("Dia do vencimento"), "5");
    await user.type(prestacoes.getByLabelText("Quantos meses"), "3");
    await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
    const valores = () =>
      within(screen.getByRole("region", { name: "Prestações" }))
        .getAllByRole("row")
        .slice(1, 4)
        .map((r) => within(r).getAllByRole("cell")[1]?.textContent);
    expect(valores()).toEqual(["R$ 300,00", "R$ 300,00", "R$ 300,00"]);
    await user.click(screen.getByRole("button", { name: "Personalizar prestação de 05/09/2026" }));
    const painel = within(screen.getByRole("dialog", { name: "Personalizar prestação" }));
    await user.type(painel.getByLabelText("Rendimento deste mês (opcional)"), "2.000,00");
    await user.click(
      painel.getByRole("button", { name: "Aplicar este rendimento daqui em diante" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(valores()).toEqual(["R$ 300,00", "R$ 600,00", "R$ 600,00"]);
    cleanup();
    render(<App ambiente={ambienteDeTeste()} />);
    expect(screen.queryByLabelText("Rendimento deste mês (opcional)")).toBeNull();
  });

  it("regras próprias de correção e juros num lançamento, pelo mesmo editor de períodos", async () => {
    const user = userEvent.setup();
    await montarCaso(user);
    await user.click(screen.getByRole("button", { name: "Personalizar prestação de 05/10/2026" }));
    const painel = within(screen.getByRole("dialog", { name: "Personalizar prestação" }));
    await user.click(
      painel.getByLabelText("Usar regras próprias de correção e juros neste lançamento"),
    );
    const juros = painel.getAllByLabelText("Juros");
    await user.selectOptions(juros[1] as HTMLElement, "percentualMensal");
    await user.click(painel.getByRole("button", { name: "Aplicar" }));
    await user.click(screen.getByRole("button", { name: "Memória da prestação de 05/10/2026" }));
    const memoria = screen
      .getByText("Memória · prestação de 05/10/2026")
      .closest("tr") as HTMLElement;
    expect(memoria.textContent).toContain("juros de 1% de 05/10/2026 a 11/10/2026");
    expect(screen.getByText(/Até 29\/08\/2024/).textContent).toContain("taxa legal");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/tabelas/Personalizar.test.tsx`
Esperado: `6 failed (6)`, todos com `Unable to find an accessible element with the role "dialog" and name "Personalizar prestação"` (o terceiro, "o lápis de um pagamento abre 'Personalizar pagamento'…", com `name "Personalizar pagamento"`).

- [ ] **Step 3: Implementar**

`src/ui/tabelas/Personalizar.tsx`:

```tsx
import { useState, type FormEvent } from "react";
import { formatarData } from "../../compartilhado/formatacao.ts";
import type {
  Calculo,
  DataISO,
  EncargosProprios,
  Lancamento,
  Metodologia,
} from "../../compartilhado/tipos.ts";
import { Ajuda } from "../componentes/Ajuda.tsx";
import { CampoTexto, Opcao } from "../componentes/Campo.tsx";
import { formatarMoedaParaCampo, lerData, lerValorPositivo, type Leitura } from "../entrada.ts";
import type { MudancasDoLancamento } from "../estado/calculo.ts";
import { EditorDePeriodos } from "../secoes/EditorDePeriodos.tsx";

/**
 * "Personalizar" (§9.3, §6.5), o lápis da linha, para os ajustes finos: valor, data (vencimento
 * ou pagamento) e descrição; rendimento do mês (base em % dos rendimentos), com "aplicar daqui em
 * diante"; termos inicial e final da correção e dos juros; metodologia própria no mesmo editor de
 * períodos. Vencimento e valor também se corrigem na própria tabela, e a linha nova de
 * "+ Prestação"/"+ Pagamento" nasce na tabela (decisões de 13/10/2026). Validação ao aplicar,
 * erro embaixo de cada campo; termo final posterior à data de elaboração é recusado aqui (o motor
 * também limitaria, com aviso).
 */

type Campo =
  | "data"
  | "valor"
  | "rendimento"
  | "termoInicialCorrecao"
  | "termoFinalCorrecao"
  | "termoInicialJuros"
  | "termoFinalJuros";

function lerOpcional<T>(texto: string, ler: (t: string) => Leitura<T>): Leitura<T | undefined> {
  return texto.trim() === "" ? { ok: true, valor: undefined } : ler(texto);
}

export function Personalizar({
  lancamento,
  calculo,
  aoEditar,
  aoAplicarRendimento,
  aoFechar,
}: {
  lancamento: Lancamento;
  calculo: Calculo;
  aoEditar: (id: string, mudancas: MudancasDoLancamento) => void;
  aoAplicarRendimento: (id: string, rendimento: string) => void;
  aoFechar: () => void;
}) {
  const prestacao = lancamento.tipo === "prestacao";
  const [data, setData] = useState(lancamento.data);
  const [descricao, setDescricao] = useState(lancamento.descricao ?? "");
  const [valor, setValor] = useState(
    lancamento.valorInformado === undefined
      ? ""
      : formatarMoedaParaCampo(lancamento.valorInformado),
  );
  const [rendimento, setRendimento] = useState(
    lancamento.rendimento === undefined ? "" : formatarMoedaParaCampo(lancamento.rendimento),
  );
  const [termos, setTermos] = useState({
    termoInicialCorrecao: lancamento.encargos?.termoInicialCorrecao ?? "",
    termoFinalCorrecao: lancamento.encargos?.termoFinalCorrecao ?? "",
    termoInicialJuros: lancamento.encargos?.termoInicialJuros ?? "",
    termoFinalJuros: lancamento.encargos?.termoFinalJuros ?? "",
  });
  const [metodologiaPropria, setMetodologiaPropria] = useState<Metodologia | null>(
    lancamento.encargos?.metodologia ?? null,
  );
  const [erros, setErros] = useState<Partial<Record<Campo, string>>>({});
  const comRendimento = calculo.base.tipo === "percentualRendimentos" && prestacao;

  const aplicar = (evento: FormEvent) => {
    evento.preventDefault();
    const novosErros: typeof erros = {};
    const dataLida = lerData(data);
    if (!dataLida.ok) novosErros.data = dataLida.erro;
    const valorLido = prestacao ? lerOpcional(valor, lerValorPositivo) : lerValorPositivo(valor);
    if (!valorLido.ok) novosErros.valor = valorLido.erro;
    const rendimentoLido = lerOpcional(rendimento, lerValorPositivo);
    if (!rendimentoLido.ok) novosErros.rendimento = rendimentoLido.erro;
    const termosLidos: Partial<Record<keyof typeof termos, DataISO>> = {};
    for (const campo of Object.keys(termos) as Array<keyof typeof termos>) {
      const leitura = lerOpcional(termos[campo], lerData);
      if (!leitura.ok) novosErros[campo] = leitura.erro;
      else if (leitura.valor !== undefined) termosLidos[campo] = leitura.valor;
    }
    const elaboracao = formatarData(calculo.dataElaboracao);
    for (const final of ["termoFinalCorrecao", "termoFinalJuros"] as const) {
      const valorFinal = termosLidos[final];
      if (valorFinal !== undefined && valorFinal > calculo.dataElaboracao) {
        novosErros[final] = `Não pode ser posterior à data de elaboração (${elaboracao}).`;
      }
    }
    for (const [inicial, final] of [
      ["termoInicialCorrecao", "termoFinalCorrecao"],
      ["termoInicialJuros", "termoFinalJuros"],
    ] as const) {
      const de = termosLidos[inicial];
      const ate = termosLidos[final];
      if (de !== undefined && ate !== undefined && de > ate) {
        novosErros[inicial] = "O termo inicial não pode ser posterior ao termo final.";
      } else if (de !== undefined && ate === undefined && de > calculo.dataElaboracao) {
        novosErros[inicial] =
          `O termo inicial não pode ser posterior à data de elaboração (${elaboracao}).`;
      }
    }
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0 || !dataLida.ok || !valorLido.ok || !rendimentoLido.ok) {
      return;
    }
    const encargos: EncargosProprios = { ...termosLidos };
    if (metodologiaPropria !== null) encargos.metodologia = metodologiaPropria;
    aoEditar(lancamento.id, {
      data: dataLida.valor,
      descricao: descricao.trim() === "" ? undefined : descricao.trim(),
      valorInformado: valorLido.valor,
      rendimento: comRendimento ? rendimentoLido.valor : undefined,
      encargos: Object.keys(encargos).length > 0 ? encargos : undefined,
    });
    aoFechar();
  };

  const termo = (campo: keyof typeof termos, rotulo: string) => (
    <CampoTexto
      id={`personalizar-${campo}`}
      rotulo={rotulo}
      tipo="date"
      valor={termos[campo]}
      aoMudar={(v) => setTermos({ ...termos, [campo]: v })}
      erro={erros[campo]}
      min="1900-01-01"
    />
  );

  return (
    <form onSubmit={aplicar} noValidate>
      <div className="linha">
        <CampoTexto
          id="personalizar-data"
          rotulo={prestacao ? "Vencimento" : "Data do pagamento"}
          tipo="date"
          valor={data}
          aoMudar={setData}
          erro={erros.data}
          min="1900-01-01"
        />
        <CampoTexto
          id="personalizar-valor"
          rotulo={prestacao ? "Valor informado à mão (opcional)" : "Valor pago"}
          valor={valor}
          aoMudar={setValor}
          erro={erros.valor}
          inputMode="decimal"
          classe="medio"
          placeholder={prestacao ? "apurado pela base" : "ex.: 400,00"}
          ajuda={
            prestacao
              ? "Deixe em branco para o Apura apurar o valor pela base dos alimentos; informe-o só quando a prestação tiver valor diverso. O relatório marca os valores informados à mão."
              : "Valor positivo. Cada pagamento é atualizado da sua data até a data do cálculo e abatido do total."
          }
        />
        <CampoTexto
          id="personalizar-descricao"
          rotulo="Descrição (opcional)"
          valor={descricao}
          aoMudar={setDescricao}
          classe="medio"
          placeholder={prestacao ? "ex.: 13º salário 2025" : "ex.: pagamento em espécie"}
          ajuda={
            prestacao
              ? "Aparece ao lado do vencimento e no relatório. 13º salário e férias entram como prestação avulsa (+ Prestação) com descrição."
              : "Aparece ao lado da data e no relatório."
          }
        />
      </div>
      {comRendimento ? (
        <div className="linha">
          <CampoTexto
            id="personalizar-rendimento"
            rotulo="Rendimento deste mês (opcional)"
            valor={rendimento}
            aoMudar={setRendimento}
            erro={erros.rendimento}
            inputMode="decimal"
            classe="medio"
            placeholder="usa o rendimento padrão"
            ajuda="Para 13º ou férias, informe o rendimento do evento; quando o salário mudou, informe o novo rendimento e aplique às prestações seguintes."
          />
          <button
            type="button"
            className="botao secundario"
            onClick={() => {
              const leitura = lerValorPositivo(rendimento);
              if (!leitura.ok) {
                setErros({ ...erros, rendimento: leitura.erro });
                return;
              }
              aoAplicarRendimento(lancamento.id, leitura.valor);
              aoFechar();
            }}
          >
            Aplicar este rendimento daqui em diante
          </button>
        </div>
      ) : null}
      <fieldset className="grupo">
        <legend>
          <span className="rotulo-do-campo">
            Termos próprios
            <Ajuda assunto="Termos próprios">
              Preencha só se diferentes do padrão, que vai da data do lançamento até a data do
              cálculo. Exemplos: encargos que cessam num depósito judicial (termo final anterior à
              data de elaboração) ou sentença que fixa outro termo inicial. Termo final posterior à
              data de elaboração não é aceito.
            </Ajuda>
          </span>
        </legend>
        <div className="linha">
          {termo("termoInicialCorrecao", "Correção desde")}
          {termo("termoFinalCorrecao", "Correção até")}
          {termo("termoInicialJuros", "Juros desde")}
          {termo("termoFinalJuros", "Juros até")}
        </div>
      </fieldset>
      <div className="linha">
        <Opcao
          rotulo="Usar regras próprias de correção e juros neste lançamento"
          marcado={metodologiaPropria !== null}
          aoMudar={(marcado) =>
            setMetodologiaPropria(marcado ? structuredClone(calculo.metodologia) : null)
          }
        />
      </div>
      {metodologiaPropria !== null ? (
        <EditorDePeriodos
          metodologia={metodologiaPropria}
          aoMudar={setMetodologiaPropria}
          prefixoDosIds="proprio"
        />
      ) : null}
      <div className="dialogo-acoes">
        <button type="button" className="botao secundario" onClick={aoFechar}>
          Cancelar
        </button>
        <button type="submit" className="botao">
          Aplicar
        </button>
      </div>
    </form>
  );
}
```

`src/ui/App.tsx` (reescrito; o lápis abre o painel):

```tsx
import { useMemo, useReducer, useState } from "react";
import type { Lancamento, LancamentoCalculado } from "../compartilhado/tipos.ts";
import { calcular } from "../motor/calcular.ts";
import { ambientePadrao, type Ambiente } from "./ambiente.ts";
import { CHAVE_RECENTES, removerChave } from "./armazenamento.ts";
import { BarraSuperior } from "./BarraSuperior.tsx";
import { Avisos } from "./componentes/Avisos.tsx";
import { Dialogo } from "./componentes/Dialogo.tsx";
import {
  estadoInicial,
  novoCalculo,
  reduzir,
  type MudancasDoLancamento,
} from "./estado/calculo.ts";
import { faltasDaBase } from "./estado/faltas.ts";
import { sugerirPagamento, sugerirPrestacao, valorPelaBase } from "./estado/novaLinha.ts";
import "./estilos.css";
import {
  esquecer,
  gravarPreferencias,
  lerPreferencias,
  type Preferencias,
} from "./preferencias.ts";
import { Rodape } from "./Rodape.tsx";
import { Indicadores } from "./tabelas/Indicadores.tsx";
import { Personalizar } from "./tabelas/Personalizar.tsx";
import { TabelaLancamentos, type LinhaDaTabela } from "./tabelas/TabelaLancamentos.tsx";
import { BaseDosAlimentos } from "./secoes/Base.tsx";
import { EditorDePeriodos } from "./secoes/EditorDePeriodos.tsx";
import { Encargos } from "./secoes/Encargos.tsx";
import { LotePagamentosSecao } from "./secoes/LotePagamentos.tsx";
import { LotePrestacoesSecao } from "./secoes/LotePrestacoes.tsx";
import { Processo } from "./secoes/Processo.tsx";

/**
 * Tela única em duas colunas (§9): esquerda, dados do caso e lançamentos em lote; direita,
 * resultado e lançamentos individuais. Recálculo a cada alteração, sem botão "Calcular" (§4.3).
 * O `ambiente` é injetável para os testes de componente.
 */
export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambiente }) {
  const armazenamento = ambiente.armazenamento();
  const [preferencias, setPreferencias] = useState(() => lerPreferencias(armazenamento));
  const calculoNovo = (p: Preferencias) =>
    novoCalculo({
      id: ambiente.novoId(),
      agora: ambiente.agora(),
      hoje: ambiente.hoje(),
      cabecalho: p.lembrar ? { defensor: p.defensor, orgao: p.orgao } : {},
    });
  // A tabela de índices é congelada quando o app abre (§8.2); "Novo cálculo" congela outra.
  const [estado, despachar] = useReducer(reduzir, undefined, () =>
    estadoInicial(calculoNovo(preferencias), ambiente.congelar()),
  );
  const resultado = useMemo(
    () => calcular(estado.calculo, estado.tabela),
    [estado.calculo, estado.tabela],
  );
  const agora = () => ambiente.agora();
  // o que falta na base para apurar as prestações lançadas: aviso no topo e campo em vermelho
  const faltas = faltasDaBase(estado.calculo);
  const [editorAberto, setEditorAberto] = useState(false);
  // Uma linha por lançamento, na ordem do cálculo (o motor devolve os calculados na mesma ordem).
  const linhas: LinhaDaTabela[] = estado.calculo.lancamentos.map((lancamento, i) => ({
    lancamento,
    calculado: resultado.lancamentos[i] as LancamentoCalculado,
  }));
  const excluir = (id: string) => despachar({ tipo: "excluirLancamento", id, em: agora() });
  const editar = (id: string, mudancas: MudancasDoLancamento) =>
    despachar({ tipo: "editarLancamento", id, mudancas, em: agora() });
  const incluir = (lancamento: Omit<Lancamento, "id" | "origem" | "editado">) =>
    despachar({ tipo: "incluirLancamento", lancamento, em: agora() });
  const valorDaBase = (data: string) => valorPelaBase(estado.calculo, estado.tabela, data);
  const [personalizando, setPersonalizando] = useState<Lancamento | null>(null);
  const personalizar = (id: string) =>
    setPersonalizando(estado.calculo.lancamentos.find((l) => l.id === id) ?? null);

  const novo = () =>
    despachar({ tipo: "novo", calculo: calculoNovo(preferencias), ...ambiente.congelar() });

  const mudarPreferencias = (mudancas: Partial<Preferencias>) => {
    const novas = { ...preferencias, ...mudancas };
    setPreferencias(novas);
    gravarPreferencias(armazenamento, novas);
    if (mudancas.guardarRecentes === false) removerChave(armazenamento, CHAVE_RECENTES);
  };
  const mudarCabecalho = (campo: keyof typeof estado.calculo.cabecalho, valor: string) => {
    despachar({ tipo: "cabecalho", campo, valor, em: agora() });
    if ((campo === "defensor" || campo === "orgao") && preferencias.lembrar) {
      mudarPreferencias({ [campo]: valor });
    }
  };
  const esquecerTudo = () => {
    esquecer(armazenamento);
    const novas = { ...preferencias, defensor: "", orgao: "", lembrar: false };
    setPreferencias(novas);
    gravarPreferencias(armazenamento, novas);
  };

  return (
    <div className="app">
      <BarraSuperior aoNovo={novo} />
      <main className="principal">
        <div className="coluna-esquerda" key={`esquerda-${estado.calculo.id}`}>
          <Processo
            cabecalho={estado.calculo.cabecalho}
            aoMudar={mudarCabecalho}
            preferencias={preferencias}
            aoMudarPreferencias={mudarPreferencias}
            aoEsquecer={esquecerTudo}
            armazenamentoDisponivel={armazenamento !== null}
          />
          <BaseDosAlimentos
            base={estado.calculo.base}
            hoje={ambiente.hoje()}
            faltas={faltas}
            aoMudar={(base) => despachar({ tipo: "base", base, em: agora() })}
          />
          <LotePrestacoesSecao
            ultimoLote={estado.calculo.lotes.ultimoLotePrestacoes}
            avisos={estado.loteRecente === "prestacoes" ? estado.avisosDoLote : []}
            aoLancar={(lote) => despachar({ tipo: "lancarPrestacoes", lote, em: agora() })}
          />
          <LotePagamentosSecao
            ultimoLote={estado.calculo.lotes.ultimoLoteAmortizacoes}
            avisos={estado.loteRecente === "pagamentos" ? estado.avisosDoLote : []}
            aoLancar={(lote) => despachar({ tipo: "lancarPagamentos", lote, em: agora() })}
          />
          <Encargos
            calculo={estado.calculo}
            aoMudarAcrescimo={(campo, valor) =>
              despachar({ tipo: "acrescimos", campo, valor, em: agora() })
            }
            aoMudarDataElaboracao={(data) =>
              despachar({ tipo: "dataElaboracao", data, em: agora() })
            }
            aoMudarObservacoes={(texto) => despachar({ tipo: "observacoes", texto, em: agora() })}
            aoAjustar={() => setEditorAberto(true)}
          />
        </div>
        <div className="coluna-direita" key={`direita-${estado.calculo.id}`}>
          <Indicadores totais={resultado.totais} dataElaboracao={estado.calculo.dataElaboracao} />
          <TabelaLancamentos
            tipo="prestacao"
            linhas={linhas.filter((l) => l.lancamento.tipo === "prestacao")}
            aoPersonalizar={personalizar}
            aoExcluir={excluir}
            aoEditar={editar}
            aoSugerir={() => sugerirPrestacao(estado.calculo, estado.tabela)}
            valorDaBase={valorDaBase}
            aoIncluir={incluir}
          />
          <TabelaLancamentos
            tipo="amortizacao"
            linhas={linhas.filter((l) => l.lancamento.tipo === "amortizacao")}
            aoPersonalizar={personalizar}
            aoExcluir={excluir}
            aoEditar={editar}
            aoSugerir={() => sugerirPagamento(estado.calculo)}
            valorDaBase={valorDaBase}
            aoIncluir={incluir}
          />
          <Avisos
            avisos={[
              ...faltas.map((f) => f.aviso),
              ...estado.situacao.avisos,
              ...estado.avisosDaAbertura,
              ...resultado.avisos,
            ]}
          />
        </div>
      </main>
      <Rodape situacaoDosIndices={estado.situacao.rodape} />
      <Dialogo
        titulo="Ajustar a metodologia de encargos"
        aberto={editorAberto}
        aoFechar={() => setEditorAberto(false)}
      >
        <EditorDePeriodos
          metodologia={estado.calculo.metodologia}
          aoMudar={(metodologia) => despachar({ tipo: "metodologia", metodologia, em: agora() })}
        />
        <div className="dialogo-acoes">
          <button type="button" className="botao" onClick={() => setEditorAberto(false)}>
            Fechar
          </button>
        </div>
      </Dialogo>
      <Dialogo
        titulo={
          personalizando?.tipo === "amortizacao"
            ? "Personalizar pagamento"
            : "Personalizar prestação"
        }
        aberto={personalizando !== null}
        aoFechar={() => setPersonalizando(null)}
      >
        {personalizando !== null ? (
          <Personalizar
            lancamento={personalizando}
            calculo={estado.calculo}
            aoEditar={editar}
            aoAplicarRendimento={(id, rendimento) =>
              despachar({ tipo: "aplicarRendimentoDaquiEmDiante", id, rendimento, em: agora() })
            }
            aoFechar={() => setPersonalizando(null)}
          />
        ) : null}
      </Dialogo>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/ui/tabelas/Personalizar.test.tsx`
Esperado: `6 passed (6)`.

- [ ] **Step 5: Verificação completa**

Run: `npm run format && npm run verificar`
Esperado: `773 passed | 9 skipped (782)` em 40 arquivos.

- [ ] **Step 6: Commit**

```bash
git add src/ui/tabelas/Personalizar.tsx src/ui/tabelas/Personalizar.test.tsx src/ui/App.tsx
git commit -m "ui: Personalizar lançamento pelo lápis (valor, data, descrição, rendimento, termos próprios e regras próprias)

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 12: Salvar e Abrir: arquivo validado, recálculo com os índices de hoje, aviso dos índices que mudaram e cálculos recentes

**Files:**
- Modify: `src/compartilhado/tipos.ts` (tipo `ArquivoCalculo`)
- Create: `src/ui/arquivo.ts`, `src/ui/recentes.ts`, `src/ui/Abrir.tsx`
- Modify (reescrito): `src/ui/App.tsx`
- Test: `src/ui/arquivo.test.ts`, `src/ui/recentes.test.ts`, `src/ui/Abrir.test.tsx`

**Interfaces:**
- Consumes: `compararIndicesUsados` (`src/indices/congelar.ts`); `compararInstantes`, `formatarDataHoraBrasilia` (`relogio.ts`); `competenciaValida`, `dataValida`, `textoDecimalValido`, `NOME_DA_SERIE`; `CHAVE_RECENTES`, `lerJson`, `gravarJson`, `removerChave` (Task 5); ação `abrir` e `estado.tocado` (Task 4); `Ambiente.baixar`.
- Produces: `ArquivoCalculo { formato: "apura/calculo@1"; calculo; resultado }` (tipos); `montarArquivo`, `serializarArquivo`, `nomeDoArquivo` ("apura-<processo limpo>-<dataElaboracao>.json"), `LeituraDoArquivo`, `lerArquivo(texto)` (`arquivo.ts`); `MAXIMO_DE_RECENTES = 5`, `Recente { id; atualizadoEm; processo; exequente; executado; texto }`, `lerRecentes`, `guardarRecente(armazenamento, calculo, resultado)`, `removerRecente`, `limparRecentes` (`recentes.ts`); `Abrir({ recentes, recentesLigados, erro, aoAbrirRecente, aoRemoverRecente, aoLimparRecentes, aoAbrirTexto })`. Painel "Abrir cálculo": lista `aria-label="Cálculos recentes"` com "Abrir <processo>, atualizado em …" e "Remover …", "Limpar recentes", campo "Abrir arquivo do Apura (.json)", com o balão "Ajuda: Abrir arquivo", "Cancelar". Frases: "O arquivo está danificado ou não é um arquivo de cálculo do Apura: não pôde ser lido.", "O arquivo não é um cálculo do Apura (formato apura/calculo@1).", `O arquivo traz um dado inválido em "<caminho>" (nome interno do campo, para quem for corrigir o arquivo); o cálculo atual não foi alterado.` (também para período da metodologia com início depois do fim, pendência da fase 2), "O arquivo não traz os índices usados no cálculo salvo: não dá para comparar com os índices atuais.", "O arquivo traz índices de séries que o Apura não conhece (…); eles ficaram fora da comparação com os índices atuais.".

- [ ] **Step 1: Escrever os testes**

`src/ui/arquivo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Calculo } from "../compartilhado/tipos.ts";
import { calcular } from "../motor/calcular.ts";
import { gerarLotePrestacoes } from "../motor/lote.ts";
import { tabelaRegimeNovo } from "../motor/testes/regime-novo.ts";
import { lerArquivo, montarArquivo, nomeDoArquivo, serializarArquivo } from "./arquivo.ts";
import { novoCalculo } from "./estado/calculo.ts";
import { dividirPeriodo } from "./estado/metodologia.ts";

const HOJE = "2026-10-11";
const AGORA = "2026-10-11T15:00:00-03:00";

function calculoCompleto(): Calculo {
  const calculo = novoCalculo({
    id: "c-1",
    agora: AGORA,
    hoje: HOJE,
    cabecalho: { defensor: "Defensor(a) de teste", orgao: "Órgão de teste" },
  });
  calculo.cabecalho.processo = "0800000-11.2026.8.12.0001";
  calculo.cabecalho.exequente = "A. B. C.";
  calculo.cabecalho.executado = "D. E. F.";
  calculo.base = {
    tipo: "valorFixo",
    valor: "1000.00",
    dataFixacao: "2024-03-15",
    indiceReajuste: "IPCA",
    mesReajuste: 3,
  };
  calculo.lotes = { ultimoLotePrestacoes: { diaVencimento: 5, mesesEmAtraso: 2 } };
  calculo.lancamentos = gerarLotePrestacoes(
    { diaVencimento: 5, mesesEmAtraso: 2 },
    HOJE,
    [],
  ).lancamentos;
  calculo.lancamentos.push({
    id: "a-2026-09",
    tipo: "amortizacao",
    data: "2026-09-05",
    descricao: "Pagamento parcial",
    valorInformado: "400.00",
    origem: "avulso",
    editado: true,
    encargos: {
      termoFinalJuros: "2026-09-30",
      metodologia: dividirPeriodo(calculo.metodologia, "2023-01-01").metodologia,
    },
  });
  calculo.acrescimos = { multaPercentual: "10", honorariosPercentual: "10" };
  calculo.observacoes = "Conforme a sentença.";
  return calculo;
}

describe("arquivo de cálculo: montar, serializar, nomear", () => {
  it("o envelope traz formato, cálculo e resultado; o nome usa o processo limpo e a data de elaboração", () => {
    const calculo = calculoCompleto();
    const resultado = calcular(calculo, tabelaRegimeNovo());
    const arquivo = montarArquivo(calculo, resultado);
    expect(arquivo.formato).toBe("apura/calculo@1");
    expect(JSON.parse(serializarArquivo(arquivo))).toEqual(arquivo);
    expect(nomeDoArquivo(calculo)).toBe("apura-0800000-11.2026.8.12.0001-2026-10-11.json");
    calculo.cabecalho.processo = "  Nº 12 / 2026 (ação) ";
    expect(nomeDoArquivo(calculo)).toBe("apura-N-12-2026-acao-2026-10-11.json");
    calculo.cabecalho.processo = "";
    expect(nomeDoArquivo(calculo)).toBe("apura-2026-10-11.json");
  });
});

describe("lerArquivo (validação do arquivo aberto, §5.1)", () => {
  it("lê de volta o que foi salvo, com os índices usados e a data da consulta, sem avisos", () => {
    const calculo = calculoCompleto();
    const resultado = calcular(calculo, tabelaRegimeNovo());
    const leitura = lerArquivo(serializarArquivo(montarArquivo(calculo, resultado)));
    expect(leitura.ok).toBe(true);
    if (!leitura.ok) return;
    expect(leitura.calculo).toEqual(calculo);
    expect(leitura.anterior).toEqual({
      indicesUsados: resultado.indicesUsados,
      consultadoEm: resultado.consultaIndices.em,
    });
    expect(leitura.avisos).toEqual([]);
  });

  it("descarta campos desconhecidos e aceita cálculo sem lotes", () => {
    const calculo = calculoCompleto();
    const texto = JSON.stringify({
      formato: "apura/calculo@1",
      calculo: {
        ...calculo,
        lotes: undefined,
        extra: 1,
        cabecalho: { ...calculo.cabecalho, cpf: "x" },
      },
      resultado: calcular(calculo, tabelaRegimeNovo()),
      outra: "coisa",
    });
    const leitura = lerArquivo(texto);
    expect(leitura.ok).toBe(true);
    if (!leitura.ok) return;
    expect(leitura.calculo).toEqual({ ...calculo, lotes: {} });
    expect("cpf" in leitura.calculo.cabecalho).toBe(false);
  });

  it("recusa o que não é um cálculo do Apura, com uma frase", () => {
    expect(lerArquivo("{nada")).toEqual({
      ok: false,
      erro: "O arquivo está danificado ou não é um arquivo de cálculo do Apura: não pôde ser lido.",
    });
    const naoEh = {
      ok: false,
      erro: "O arquivo não é um cálculo do Apura (formato apura/calculo@1).",
    };
    expect(lerArquivo("[]")).toEqual(naoEh);
    expect(lerArquivo('{"formato":"apura/serie@1"}')).toEqual(naoEh);
    expect(lerArquivo('{"calculo":{}}')).toEqual(naoEh);
  });

  it("recusa dados inválidos no cálculo, dizendo onde", () => {
    const calculo = calculoCompleto();
    const resultado = calcular(calculo, tabelaRegimeNovo());
    const com = (mexer: (c: Record<string, unknown>) => void): string => {
      const copia = structuredClone(calculo) as unknown as Record<string, unknown>;
      mexer(copia);
      return JSON.stringify({ formato: "apura/calculo@1", calculo: copia, resultado });
    };
    const casos: Array<[string, (c: Record<string, unknown>) => void]> = [
      ["dataElaboracao", (c) => (c.dataElaboracao = "11/10/2026")],
      ["dataElaboracao", (c) => (c.dataElaboracao = "2026-02-30")],
      ["base.tipo", (c) => ((c.base as Record<string, unknown>).tipo = "outra")],
      ["base.dataFixacao", (c) => ((c.base as Record<string, unknown>).dataFixacao = "")],
      ["base.mesReajuste", (c) => ((c.base as Record<string, unknown>).mesReajuste = 13)],
      [
        "base.indiceReajuste",
        (c) => ((c.base as Record<string, unknown>).indiceReajuste = "SELIC"),
      ],
      [
        "lancamentos[0].data",
        (c) => ((c.lancamentos as Array<Record<string, unknown>>)[0]!.data = 20260905),
      ],
      [
        "lancamentos[0].competencia",
        (c) => ((c.lancamentos as Array<Record<string, unknown>>)[0]!.competencia = "2026-13"),
      ],
      [
        "lancamentos[1].editado",
        (c) => ((c.lancamentos as Array<Record<string, unknown>>)[1]!.editado = "sim"),
      ],
      [
        "lancamentos[2].encargos.termoFinalJuros",
        (c) =>
          ((
            (c.lancamentos as Array<Record<string, unknown>>)[2]!.encargos as Record<
              string,
              unknown
            >
          ).termoFinalJuros = "ontem"),
      ],
      [
        "lancamentos[2].encargos.metodologia.periodos[0].juros.taxaMensal",
        (c) => {
          const m = (
            (c.lancamentos as Array<Record<string, unknown>>)[2]!.encargos as Record<
              string,
              unknown
            >
          ).metodologia as Record<string, unknown>;
          (
            (m.periodos as Array<Record<string, unknown>>)[0]!.juros as Record<string, unknown>
          ).taxaMensal = "1,5";
        },
      ],
      [
        "metodologia.deflacao",
        (c) => ((c.metodologia as Record<string, unknown>).deflacao = "inventada"),
      ],
      [
        "metodologia.periodos[0] (início depois do fim)",
        (c) => {
          const p = (c.metodologia as Record<string, unknown>).periodos as Array<
            Record<string, unknown>
          >;
          p[0]!.de = "2025-01-01";
          p[0]!.ate = "2024-12-31";
        },
      ],
      [
        "metodologia.periodos[1].correcao.indice",
        (c) =>
          ((
            (
              (c.metodologia as Record<string, unknown>).periodos as Array<Record<string, unknown>>
            )[1]!.correcao as Record<string, unknown>
          ).indice = "SELIC"),
      ],
      [
        "acrescimos.multaPercentual",
        (c) => ((c.acrescimos as Record<string, unknown>).multaPercentual = 10),
      ],
      ["cabecalho.processo", (c) => ((c.cabecalho as Record<string, unknown>).processo = null)],
      ["lancamentos", (c) => (c.lancamentos = {})],
      ["calculo", (c) => delete c.metodologia && undefined],
    ];
    for (const [caminho, mexer] of casos) {
      const leitura = lerArquivo(com(mexer));
      expect(leitura.ok, caminho).toBe(false);
      if (leitura.ok) continue;
      expect(leitura.erro, caminho).toMatch(/^O arquivo traz um dado inválido em "/);
    }
    expect(lerArquivo(com((c) => (c.dataElaboracao = "2026-02-30")))).toEqual({
      ok: false,
      erro: 'O arquivo traz um dado inválido em "dataElaboracao" (nome interno do campo, para quem for corrigir o arquivo); o cálculo atual não foi alterado.',
    });
    // textos decimais da base e dos acréscimos são aceitos como texto (o motor avisa se inválidos)
    const leitura = lerArquivo(com((c) => ((c.base as Record<string, unknown>).valor = "1,5")));
    expect(leitura.ok).toBe(true);
  });

  it("resultado ausente ou estranho: abre com aviso e sem comparação; série desconhecida sai com aviso", () => {
    const calculo = calculoCompleto();
    const resultado = calcular(calculo, tabelaRegimeNovo());
    const aviso =
      "O arquivo não traz os índices usados no cálculo salvo: não dá para comparar com os índices atuais.";
    const semResultado = lerArquivo(JSON.stringify({ formato: "apura/calculo@1", calculo }));
    expect(semResultado.ok && semResultado.anterior).toBeNull();
    expect(semResultado.ok && semResultado.avisos).toEqual([aviso]);
    const estranho = lerArquivo(
      JSON.stringify({
        formato: "apura/calculo@1",
        calculo,
        resultado: { ...resultado, indicesUsados: "x" },
      }),
    );
    expect(estranho.ok && estranho.anterior).toBeNull();
    expect(estranho.ok && estranho.avisos).toEqual([aviso]);
    const comDesconhecida = lerArquivo(
      JSON.stringify({
        formato: "apura/calculo@1",
        calculo,
        resultado: {
          ...resultado,
          indicesUsados: [
            ...resultado.indicesUsados,
            {
              serie: "7478",
              competencia: "2026-09",
              valor: "0.5",
              fonte: "embutida",
              obtidoEm: AGORA,
            },
          ],
        },
      }),
    );
    expect(comDesconhecida.ok && comDesconhecida.anterior?.indicesUsados).toEqual(
      resultado.indicesUsados,
    );
    expect(comDesconhecida.ok && comDesconhecida.avisos).toEqual([
      "O arquivo traz índices de séries que o Apura não conhece (7478); eles ficaram fora da comparação com os índices atuais.",
    ]);
  });
});
```

`src/ui/recentes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calcular } from "../motor/calcular.ts";
import { tabelaRegimeNovo } from "../motor/testes/regime-novo.ts";
import { lerArquivo } from "./arquivo.ts";
import { CHAVE_RECENTES } from "./armazenamento.ts";
import { novoCalculo } from "./estado/calculo.ts";
import { guardarRecente, lerRecentes, limparRecentes, removerRecente } from "./recentes.ts";
import { armazenamentoEmMemoria, armazenamentoQueFalha } from "./testes/ambiente-de-teste.ts";

const HOJE = "2026-10-11";

function calculoDe(id: string, atualizadoEm: string, processo = "") {
  const calculo = novoCalculo({ id, agora: "2026-10-11T10:00:00-03:00", hoje: HOJE });
  calculo.atualizadoEm = atualizadoEm;
  calculo.cabecalho.processo = processo;
  calculo.cabecalho.exequente = "A. B.";
  calculo.cabecalho.executado = "C. D.";
  return calculo;
}

describe("cálculos recentes no navegador (§5.5)", () => {
  it("guarda do mais novo ao mais antigo, atualiza pelo id, limita a cinco e lê de volta o arquivo inteiro", () => {
    const armazenamento = armazenamentoEmMemoria();
    const tabela = tabelaRegimeNovo();
    for (let i = 1; i <= 6; i++) {
      const calculo = calculoDe(`c-${i}`, `2026-10-11T1${i}:00:00-03:00`, `processo-${i}`);
      guardarRecente(armazenamento, calculo, calcular(calculo, tabela));
    }
    let recentes = lerRecentes(armazenamento);
    expect(recentes.map((r) => r.id)).toEqual(["c-6", "c-5", "c-4", "c-3", "c-2"]);
    expect(recentes[0]).toMatchObject({
      processo: "processo-6",
      exequente: "A. B.",
      executado: "C. D.",
    });
    const relido = lerArquivo(recentes[0]!.texto);
    expect(relido.ok && relido.calculo.id).toBe("c-6");
    // atualizar um já guardado o traz para o topo, sem duplicar
    const c3 = calculoDe("c-3", "2026-10-11T20:00:00-03:00", "processo-3-novo");
    recentes = guardarRecente(armazenamento, c3, calcular(c3, tabela));
    expect(recentes.map((r) => r.id)).toEqual(["c-3", "c-6", "c-5", "c-4", "c-2"]);
    expect(recentes[0]?.processo).toBe("processo-3-novo");
    recentes = removerRecente(armazenamento, "c-5");
    expect(recentes.map((r) => r.id)).toEqual(["c-3", "c-6", "c-4", "c-2"]);
    expect(lerRecentes(armazenamento).map((r) => r.id)).toEqual(["c-3", "c-6", "c-4", "c-2"]);
    limparRecentes(armazenamento);
    expect(lerRecentes(armazenamento)).toEqual([]);
    expect(armazenamento.getItem(CHAVE_RECENTES)).toBeNull();
  });

  it("conteúdo corrompido, itens estranhos e armazenamento bloqueado nunca quebram a tela", () => {
    expect(lerRecentes(armazenamentoEmMemoria({ [CHAVE_RECENTES]: "{nada" }))).toEqual([]);
    expect(lerRecentes(armazenamentoEmMemoria({ [CHAVE_RECENTES]: '{"a":1}' }))).toEqual([]);
    const misto = armazenamentoEmMemoria({
      [CHAVE_RECENTES]: JSON.stringify([
        {
          id: "ok",
          atualizadoEm: "2026-10-11T10:00:00-03:00",
          processo: "",
          exequente: "",
          executado: "",
          texto: "{}",
        },
        { id: 5 },
        "x",
      ]),
    });
    expect(lerRecentes(misto).map((r) => r.id)).toEqual(["ok"]);
    const bloqueado = armazenamentoQueFalha();
    const calculo = calculoDe("c", "2026-10-11T10:00:00-03:00");
    expect(lerRecentes(bloqueado)).toEqual([]);
    expect(guardarRecente(bloqueado, calculo, calcular(calculo, tabelaRegimeNovo()))).toEqual([]);
    expect(removerRecente(bloqueado, "c")).toEqual([]);
    expect(() => limparRecentes(bloqueado)).not.toThrow();
    expect(guardarRecente(null, calculo, calcular(calculo, tabelaRegimeNovo()))).toEqual([]);
  });
});
```

`src/ui/Abrir.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { ArquivoCalculo } from "../compartilhado/tipos.ts";
import { calcular } from "../motor/calcular.ts";
import { gerarLotePrestacoes } from "../motor/lote.ts";
import App from "./App.tsx";
import { montarArquivo, serializarArquivo } from "./arquivo.ts";
import { CHAVE_RECENTES } from "./armazenamento.ts";
import { novoCalculo } from "./estado/calculo.ts";
import { lerRecentes } from "./recentes.ts";
import {
  ambienteDeTeste,
  AGORA_DE_TESTE,
  armazenamentoEmMemoria,
  HOJE_DE_TESTE,
} from "./testes/ambiente-de-teste.ts";

afterEach(cleanup);

/** Um cálculo salvo "em setembro": valor fixo, duas prestações, com o IPCA de set/2026 diferente do atual. */
function arquivoSalvo(): ArquivoCalculo {
  const calculo = novoCalculo({
    id: "salvo-1",
    agora: "2026-09-20T10:00:00-03:00",
    hoje: "2026-09-20",
  });
  calculo.cabecalho.processo = "0800001-31.2026.8.12.0001";
  calculo.cabecalho.exequente = "A. B.";
  calculo.cabecalho.executado = "C. D.";
  calculo.dataElaboracao = HOJE_DE_TESTE;
  calculo.base = {
    tipo: "valorFixo",
    valor: "1000.00",
    dataFixacao: "2026-01-10",
    indiceReajuste: "nenhum",
    mesReajuste: 1,
  };
  calculo.lancamentos = gerarLotePrestacoes(
    { diaVencimento: 5, mesesEmAtraso: 2 },
    HOJE_DE_TESTE,
    [],
  ).lancamentos;
  const resultado = calcular(calculo, ambienteDeTeste().congelar().tabela);
  const indicesUsados = resultado.indicesUsados.map((i) =>
    i.serie === "433" && i.competencia === "2026-09" ? { ...i, valor: "0.80" } : i,
  );
  return montarArquivo(calculo, {
    ...resultado,
    indicesUsados,
    consultaIndices: { ...resultado.consultaIndices, em: "2026-09-20T09:00:00-03:00" },
  });
}

function arquivo(texto: string, nome = "calculo.json"): File {
  return new File([texto], nome, { type: "application/json" });
}

describe("Salvar e Abrir (§5.1, §5.5, §9.1)", () => {
  it("'Salvar' baixa apura-<processo>-<data>.json com o cálculo e o resultado", async () => {
    const user = userEvent.setup();
    const ambiente = ambienteDeTeste();
    render(<App ambiente={ambiente} />);
    await user.type(screen.getByLabelText("Nº do processo"), "0800000-46.2026.8.12.0001");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(ambiente.baixados).toHaveLength(1);
    expect(ambiente.baixados[0]?.nome).toBe("apura-0800000-46.2026.8.12.0001-2026-10-11.json");
    const conteudo = JSON.parse(ambiente.baixados[0]?.conteudo ?? "") as ArquivoCalculo;
    expect(conteudo.formato).toBe("apura/calculo@1");
    expect(conteudo.calculo.cabecalho.processo).toBe("0800000-46.2026.8.12.0001");
    expect(conteudo.resultado.consultaIndices.em).toBe("2026-10-11T12:00:00.000Z");
    // número com dígito verificador errado não vai para o cálculo: o arquivo leva o último válido
    const campo = screen.getByLabelText("Nº do processo");
    await user.tripleClick(campo);
    await user.paste("0800000-45.2026.8.12.0001");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(ambiente.baixados[1]?.nome).toBe("apura-0800000-46.2026.8.12.0001-2026-10-11.json");
    // apagar tudo é aceito (cálculo antes de existir processo)
    await user.clear(campo);
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(ambiente.baixados[2]?.nome).toBe("apura-2026-10-11.json");
  });

  it("abre um arquivo salvo, recalcula com os índices de hoje e avisa qual índice usado mudou", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    const painel = within(screen.getByRole("dialog", { name: "Abrir cálculo" }));
    expect(painel.getByText(/Nenhum cálculo recente ainda/)).toBeDefined();
    await user.upload(
      painel.getByLabelText("Abrir arquivo do Apura (.json)"),
      arquivo(serializarArquivo(arquivoSalvo())),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect((screen.getByLabelText("Nº do processo") as HTMLInputElement).value).toBe(
      "0800001-31.2026.8.12.0001",
    );
    expect((screen.getByLabelText("Valor fixado") as HTMLInputElement).value).toBe("1.000,00");
    expect(
      within(screen.getByRole("region", { name: "Prestações" })).getAllByRole("row"),
    ).toHaveLength(4);
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).toContain(
      "IPCA de set/2026 mudou de 0,80% para 0,82% desde a atualização dos índices de 20/09/2026.",
    );
    // editar depois de abrir limpa o aviso? não: ele vale até o próximo "Novo cálculo"
    await user.type(screen.getByLabelText("Exequente (alimentando)"), "!");
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).toContain(
      "IPCA de set/2026 mudou",
    );
    await user.click(screen.getByRole("button", { name: "Novo cálculo" }));
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).not.toContain(
      "IPCA de set/2026 mudou",
    );
  });

  it("arquivo inválido: o painel fica aberto com a frase do erro e o cálculo atual não muda", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    await user.type(screen.getByLabelText("Nº do processo"), "0800002-16.2026.8.12.0001");
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    const painel = within(screen.getByRole("dialog", { name: "Abrir cálculo" }));
    await user.upload(painel.getByLabelText("Abrir arquivo do Apura (.json)"), arquivo("{nada"));
    expect(painel.getByRole("alert").textContent).toBe(
      "O arquivo está danificado ou não é um arquivo de cálculo do Apura: não pôde ser lido.",
    );
    const salvo = arquivoSalvo();
    (salvo.calculo as unknown as Record<string, unknown>).dataElaboracao = "ontem";
    await user.upload(
      painel.getByLabelText("Abrir arquivo do Apura (.json)"),
      arquivo(JSON.stringify(salvo)),
    );
    expect(painel.getByRole("alert").textContent).toBe(
      'O arquivo traz um dado inválido em "dataElaboracao" (nome interno do campo, para quem for corrigir o arquivo); o cálculo atual não foi alterado.',
    );
    await user.keyboard("{Escape}");
    expect((screen.getByLabelText("Nº do processo") as HTMLInputElement).value).toBe(
      "0800002-16.2026.8.12.0001",
    );
  });

  it("recentes: guardados a cada alteração (não o cálculo em branco), listados por data, abertos, removidos e limpos", async () => {
    const user = userEvent.setup();
    const armazenamento = armazenamentoEmMemoria();
    const ambiente = ambienteDeTeste({ armazenamento });
    render(<App ambiente={ambiente} />);
    expect(lerRecentes(armazenamento)).toEqual([]);
    await user.type(screen.getByLabelText("Nº do processo"), "0800002-16.2026.8.12.0001");
    await user.type(screen.getByLabelText("Exequente (alimentando)"), "Exequente Um");
    expect(lerRecentes(armazenamento).map((r) => [r.processo, r.exequente])).toEqual([
      ["0800002-16.2026.8.12.0001", "Exequente Um"],
    ]);
    await user.click(screen.getByRole("button", { name: "Novo cálculo" }));
    await user.type(screen.getByLabelText("Nº do processo"), "0800003-98.2026.8.12.0001");
    expect(lerRecentes(armazenamento).map((r) => r.processo)).toEqual([
      "0800003-98.2026.8.12.0001",
      "0800002-16.2026.8.12.0001",
    ]);
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    const painel = within(screen.getByRole("dialog", { name: "Abrir cálculo" }));
    const itens = painel.getAllByRole("listitem");
    expect(itens.map((i) => i.textContent)).toEqual([
      "0800003-98.2026.8.12.0001atualizado em 11/10/2026 15:00AbrirRemover",
      "0800002-16.2026.8.12.0001 · Exequente Umatualizado em 11/10/2026 15:00AbrirRemover",
    ]);
    await user.click(within(itens[1] as HTMLElement).getByRole("button", { name: /^Abrir/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect((screen.getByLabelText("Nº do processo") as HTMLInputElement).value).toBe(
      "0800002-16.2026.8.12.0001",
    );
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(
      within(screen.getByRole("dialog")).getAllByRole("button", {
        name: /^Remover/,
      })[0] as HTMLElement,
    );
    expect(lerRecentes(armazenamento).map((r) => r.processo)).toEqual([
      "0800002-16.2026.8.12.0001",
    ]);
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Limpar recentes" }),
    );
    expect(lerRecentes(armazenamento)).toEqual([]);
    expect(
      within(screen.getByRole("dialog")).getByText(/Nenhum cálculo recente ainda/),
    ).toBeDefined();
  });

  it("com a guarda de recentes desligada nada é guardado e o painel explica; recente corrompido mostra erro", async () => {
    const user = userEvent.setup();
    const armazenamento = armazenamentoEmMemoria();
    render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
    await user.click(screen.getByLabelText("Guardar cálculos recentes neste navegador"));
    await user.type(screen.getByLabelText("Nº do processo"), "0800004-83.2026.8.12.0001");
    expect(armazenamento.getItem(CHAVE_RECENTES)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    expect(
      within(screen.getByRole("dialog")).getByText(
        /"Guardar cálculos recentes neste navegador" está desligada/,
      ),
    ).toBeDefined();
    await user.keyboard("{Escape}");
    await user.click(screen.getByLabelText("Guardar cálculos recentes neste navegador"));
    armazenamento.setItem(
      CHAVE_RECENTES,
      JSON.stringify([
        {
          id: "r",
          atualizadoEm: AGORA_DE_TESTE,
          processo: "quebrado",
          exequente: "",
          executado: "",
          texto: "{nada",
        },
      ]),
    );
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /^Abrir quebrado/ }),
    );
    expect(within(screen.getByRole("dialog")).getByRole("alert").textContent).toBe(
      "O arquivo está danificado ou não é um arquivo de cálculo do Apura: não pôde ser lido.",
    );
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/arquivo.test.ts src/ui/recentes.test.ts src/ui/Abrir.test.tsx`
Esperado: os três arquivos falham ao importar `./arquivo.ts` (`Tests no tests`).

- [ ] **Step 3: Implementar**

Em `src/compartilhado/tipos.ts`, acrescentar ao fim do arquivo:

```ts

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
```

`src/ui/arquivo.ts`:

```ts
import { competenciaValida, dataValida } from "../compartilhado/datas.ts";
import { textoDecimalValido } from "../compartilhado/decimal.ts";
import { NOME_DA_SERIE } from "../compartilhado/tipos.ts";
import type {
  ArquivoCalculo,
  Base,
  Cabecalho,
  Calculo,
  CodigoSerie,
  EncargosProprios,
  IndiceUsado,
  Lancamento,
  LoteAmortizacoes,
  LotePrestacoes,
  Metodologia,
  PeriodoMetodologia,
  RegraJuros,
  Resultado,
} from "../compartilhado/tipos.ts";

/**
 * Salvar e abrir o cálculo como arquivo (§5.1, §9.1). A leitura trata o conteúdo como `unknown` e
 * confere tudo o que o motor pressupõe válido (formato, datas, competências, textos decimais,
 * listas fechadas), devolvendo um `Calculo` só com os campos conhecidos; o `resultado` do arquivo
 * é opcional: dele só interessam os índices usados e a data da consulta, para o aviso de índices
 * que mudaram, e um arquivo sem eles abre mesmo assim, com aviso. Módulo puro, sem DOM.
 */

export function montarArquivo(calculo: Calculo, resultado: Resultado): ArquivoCalculo {
  return { formato: "apura/calculo@1", calculo, resultado };
}

export function serializarArquivo(arquivo: ArquivoCalculo): string {
  return JSON.stringify(arquivo, null, 2);
}

/** "apura-0800000-11.2026.8.12.0001-2026-10-11.json"; sem processo, "apura-2026-10-11.json". */
export function nomeDoArquivo(calculo: Calculo): string {
  const processo = calculo.cabecalho.processo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^0-9A-Za-z.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `apura-${processo === "" ? "" : `${processo}-`}${calculo.dataElaboracao}.json`;
}

export type LeituraDoArquivo =
  | {
      ok: true;
      calculo: Calculo;
      /** índices usados no cálculo salvo e a data da consulta deles; nulos quando o arquivo não os traz */
      anterior: { indicesUsados: IndiceUsado[]; consultadoEm: string } | null;
      avisos: string[];
    }
  | { ok: false; erro: string };

class DadoInvalido extends Error {}

function falhar(caminho: string): never {
  throw new DadoInvalido(caminho);
}

function objeto(valor: unknown, caminho: string): Record<string, unknown> {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) falhar(caminho);
  return valor as Record<string, unknown>;
}

function texto(valor: unknown, caminho: string): string {
  if (typeof valor !== "string") falhar(caminho);
  return valor;
}

function textoOpcional(valor: unknown, caminho: string): string | undefined {
  return valor === undefined ? undefined : texto(valor, caminho);
}

function booleano(valor: unknown, caminho: string): boolean {
  if (typeof valor !== "boolean") falhar(caminho);
  return valor;
}

function inteiro(valor: unknown, caminho: string, minimo: number, maximo: number): number {
  if (typeof valor !== "number" || !Number.isInteger(valor) || valor < minimo || valor > maximo) {
    falhar(caminho);
  }
  return valor;
}

function data(valor: unknown, caminho: string): string {
  if (typeof valor !== "string" || !dataValida(valor)) falhar(caminho);
  return valor;
}

function dataOpcional(valor: unknown, caminho: string): string | undefined {
  return valor === undefined ? undefined : data(valor, caminho);
}

function dataOuNula(valor: unknown, caminho: string): string | null {
  return valor === null ? null : data(valor, caminho);
}

function competencia(valor: unknown, caminho: string): string {
  if (typeof valor !== "string" || !competenciaValida(valor)) falhar(caminho);
  return valor;
}

function decimalTexto(valor: unknown, caminho: string): string {
  if (!textoDecimalValido(valor)) falhar(caminho);
  return valor;
}

function umDe<T extends string>(valor: unknown, opcoes: readonly T[], caminho: string): T {
  if (typeof valor !== "string" || !(opcoes as readonly string[]).includes(valor)) falhar(caminho);
  return valor as T;
}

function lista(valor: unknown, caminho: string): unknown[] {
  if (!Array.isArray(valor)) falhar(caminho);
  return valor;
}

const INDICES_DE_CORRECAO = ["IGP-M", "INPC", "IPCA", "nenhum"] as const;
const INDICES_DE_REAJUSTE = ["IGP-M", "INPC", "IPCA", "SM", "nenhum"] as const;
const SERIES = Object.keys(NOME_DA_SERIE) as CodigoSerie[];

function lerJuros(valor: unknown, caminho: string): RegraJuros {
  const j = objeto(valor, caminho);
  const tipo = umDe(
    j.tipo,
    ["percentualMensal", "taxaLegal", "selicUnica"] as const,
    `${caminho}.tipo`,
  );
  if (tipo === "percentualMensal") {
    return { tipo, taxaMensal: decimalTexto(j.taxaMensal, `${caminho}.taxaMensal`) };
  }
  return { tipo };
}

function lerMetodologia(valor: unknown, caminho: string): Metodologia {
  const m = objeto(valor, caminho);
  const arredondamento = objeto(m.arredondamento, `${caminho}.arredondamento`);
  return {
    id: texto(m.id, `${caminho}.id`),
    versao: inteiro(m.versao, `${caminho}.versao`, 0, 1_000_000),
    nome: texto(m.nome, `${caminho}.nome`),
    ajustada: booleano(m.ajustada, `${caminho}.ajustada`),
    periodos: lista(m.periodos, `${caminho}.periodos`).map((p, i): PeriodoMetodologia => {
      const periodo = objeto(p, `${caminho}.periodos[${i}]`);
      const correcao = objeto(periodo.correcao, `${caminho}.periodos[${i}].correcao`);
      const de = dataOuNula(periodo.de, `${caminho}.periodos[${i}].de`);
      const ate = dataOuNula(periodo.ate, `${caminho}.periodos[${i}].ate`);
      // período com início posterior ao fim (pendência da fase 2): recusado aqui, antes do motor
      if (de !== null && ate !== null && de > ate) falhar(`${caminho}.periodos[${i}]`);
      return {
        de,
        ate,
        correcao: {
          indice: umDe(
            correcao.indice,
            INDICES_DE_CORRECAO,
            `${caminho}.periodos[${i}].correcao.indice`,
          ),
        },
        juros: lerJuros(periodo.juros, `${caminho}.periodos[${i}].juros`),
      };
    }),
    incidenciaMesInicial: umDe(
      m.incidenciaMesInicial,
      ["proRata", "mesSeguinte"] as const,
      `${caminho}.incidenciaMesInicial`,
    ),
    deflacao: umDe(
      m.deflacao,
      ["aplicarComPiso", "aplicarSemPiso", "zerarNegativos"] as const,
      `${caminho}.deflacao`,
    ),
    arredondamento: {
      fatorCasas: inteiro(arredondamento.fatorCasas, `${caminho}.arredondamento.fatorCasas`, 0, 20),
      percentualCasas: inteiro(
        arredondamento.percentualCasas,
        `${caminho}.arredondamento.percentualCasas`,
        0,
        20,
      ),
      valorCasas: inteiro(arredondamento.valorCasas, `${caminho}.arredondamento.valorCasas`, 0, 20),
      modo: umDe(arredondamento.modo, ["comercial"] as const, `${caminho}.arredondamento.modo`),
    },
  };
}

function lerBase(valor: unknown): Base {
  const b = objeto(valor, "base");
  const tipo = umDe(
    b.tipo,
    ["valorFixo", "percentualSalarioMinimo", "percentualRendimentos"] as const,
    "base.tipo",
  );
  switch (tipo) {
    case "valorFixo":
      return {
        tipo,
        valor: texto(b.valor, "base.valor"),
        dataFixacao: data(b.dataFixacao, "base.dataFixacao"),
        indiceReajuste: umDe(b.indiceReajuste, INDICES_DE_REAJUSTE, "base.indiceReajuste"),
        mesReajuste: inteiro(b.mesReajuste, "base.mesReajuste", 1, 12),
      };
    case "percentualSalarioMinimo":
      return { tipo, percentual: texto(b.percentual, "base.percentual") };
    case "percentualRendimentos":
      return {
        tipo,
        percentual: texto(b.percentual, "base.percentual"),
        rendimentoPadrao: texto(b.rendimentoPadrao, "base.rendimentoPadrao"),
      };
  }
}

function lerEncargos(valor: unknown, caminho: string): EncargosProprios {
  const e = objeto(valor, caminho);
  const encargos: EncargosProprios = {};
  const termos = [
    "termoInicialCorrecao",
    "termoFinalCorrecao",
    "termoInicialJuros",
    "termoFinalJuros",
  ] as const;
  for (const termo of termos) {
    const lido = dataOpcional(e[termo], `${caminho}.${termo}`);
    if (lido !== undefined) encargos[termo] = lido;
  }
  if (e.metodologia !== undefined) {
    encargos.metodologia = lerMetodologia(e.metodologia, `${caminho}.metodologia`);
  }
  return encargos;
}

function lerLancamento(valor: unknown, i: number): Lancamento {
  const caminho = `lancamentos[${i}]`;
  const l = objeto(valor, caminho);
  const lancamento: Lancamento = {
    id: texto(l.id, `${caminho}.id`),
    tipo: umDe(l.tipo, ["prestacao", "amortizacao"] as const, `${caminho}.tipo`),
    data: data(l.data, `${caminho}.data`),
    origem: umDe(l.origem, ["lote", "avulso"] as const, `${caminho}.origem`),
    editado: booleano(l.editado, `${caminho}.editado`),
  };
  if (l.competencia !== undefined) {
    lancamento.competencia = competencia(l.competencia, `${caminho}.competencia`);
  }
  const descricao = textoOpcional(l.descricao, `${caminho}.descricao`);
  if (descricao !== undefined) lancamento.descricao = descricao;
  const valorInformado = textoOpcional(l.valorInformado, `${caminho}.valorInformado`);
  if (valorInformado !== undefined) lancamento.valorInformado = valorInformado;
  const rendimento = textoOpcional(l.rendimento, `${caminho}.rendimento`);
  if (rendimento !== undefined) lancamento.rendimento = rendimento;
  if (l.encargos !== undefined)
    lancamento.encargos = lerEncargos(l.encargos, `${caminho}.encargos`);
  return lancamento;
}

function lerLotes(valor: unknown): Calculo["lotes"] {
  if (valor === undefined) return {};
  const l = objeto(valor, "lotes");
  const lotes: Calculo["lotes"] = {};
  if (l.ultimoLotePrestacoes !== undefined) {
    const p = objeto(l.ultimoLotePrestacoes, "lotes.ultimoLotePrestacoes");
    const lote: LotePrestacoes = {
      diaVencimento: inteiro(p.diaVencimento, "lotes.ultimoLotePrestacoes.diaVencimento", 1, 31),
    };
    if (p.mesesEmAtraso !== undefined) {
      lote.mesesEmAtraso = inteiro(
        p.mesesEmAtraso,
        "lotes.ultimoLotePrestacoes.mesesEmAtraso",
        1,
        100_000,
      );
    }
    if (p.de !== undefined) lote.de = competencia(p.de, "lotes.ultimoLotePrestacoes.de");
    if (p.ate !== undefined) lote.ate = competencia(p.ate, "lotes.ultimoLotePrestacoes.ate");
    lotes.ultimoLotePrestacoes = lote;
  }
  if (l.ultimoLoteAmortizacoes !== undefined) {
    const a = objeto(l.ultimoLoteAmortizacoes, "lotes.ultimoLoteAmortizacoes");
    const lote: LoteAmortizacoes = {
      valorMensal: texto(a.valorMensal, "lotes.ultimoLoteAmortizacoes.valorMensal"),
      diaPagamento: inteiro(a.diaPagamento, "lotes.ultimoLoteAmortizacoes.diaPagamento", 1, 31),
      de: competencia(a.de, "lotes.ultimoLoteAmortizacoes.de"),
      ate: competencia(a.ate, "lotes.ultimoLoteAmortizacoes.ate"),
    };
    lotes.ultimoLoteAmortizacoes = lote;
  }
  return lotes;
}

function lerCalculo(valor: unknown): Calculo {
  const c = objeto(valor, "calculo");
  const cabecalho = objeto(c.cabecalho, "cabecalho");
  const acrescimos = objeto(c.acrescimos, "acrescimos");
  const campos: Array<keyof Cabecalho> = [
    "defensor",
    "orgao",
    "processo",
    "exequente",
    "executado",
  ];
  return {
    formato: umDe(c.formato, ["apura/calculo@1"] as const, "calculo.formato"),
    tipo: umDe(c.tipo, ["alimentos"] as const, "calculo.tipo"),
    id: texto(c.id, "id"),
    criadoEm: texto(c.criadoEm, "criadoEm"),
    atualizadoEm: texto(c.atualizadoEm, "atualizadoEm"),
    dataElaboracao: data(c.dataElaboracao, "dataElaboracao"),
    cabecalho: Object.fromEntries(
      campos.map((campo) => [campo, texto(cabecalho[campo], `cabecalho.${campo}`)]),
    ) as unknown as Cabecalho,
    base: lerBase(c.base),
    lotes: lerLotes(c.lotes),
    lancamentos: lista(c.lancamentos, "lancamentos").map(lerLancamento),
    metodologia: lerMetodologia(c.metodologia, "metodologia"),
    acrescimos: {
      multaPercentual: texto(acrescimos.multaPercentual, "acrescimos.multaPercentual"),
      honorariosPercentual: texto(
        acrescimos.honorariosPercentual,
        "acrescimos.honorariosPercentual",
      ),
    },
    observacoes: texto(c.observacoes, "observacoes"),
  };
}

const AVISO_SEM_INDICES =
  "O arquivo não traz os índices usados no cálculo salvo: não dá para comparar com os índices atuais.";

/** Os índices usados do resultado salvo; nulos quando faltam ou estão estranhos; séries desconhecidas saem com aviso. */
function lerIndicesAnteriores(
  valor: unknown,
  avisos: string[],
): { indicesUsados: IndiceUsado[]; consultadoEm: string } | null {
  try {
    const r = objeto(valor, "resultado");
    const consulta = objeto(r.consultaIndices, "resultado.consultaIndices");
    const consultadoEm = texto(consulta.em, "resultado.consultaIndices.em");
    const desconhecidas = new Set<string>();
    const indicesUsados: IndiceUsado[] = [];
    for (const item of lista(r.indicesUsados, "resultado.indicesUsados")) {
      const i = objeto(item, "resultado.indicesUsados[]");
      const serie = texto(i.serie, "resultado.indicesUsados[].serie");
      if (!(SERIES as string[]).includes(serie)) {
        desconhecidas.add(serie);
        continue;
      }
      indicesUsados.push({
        serie: serie as CodigoSerie,
        competencia: competencia(i.competencia, "resultado.indicesUsados[].competencia"),
        valor: decimalTexto(i.valor, "resultado.indicesUsados[].valor"),
        fonte: umDe(i.fonte, ["embutida", "aoVivo"] as const, "resultado.indicesUsados[].fonte"),
        obtidoEm: texto(i.obtidoEm, "resultado.indicesUsados[].obtidoEm"),
      });
    }
    if (desconhecidas.size > 0) {
      avisos.push(
        `O arquivo traz índices de séries que o Apura não conhece (${[...desconhecidas].sort().join(", ")}); eles ficaram fora da comparação com os índices atuais.`,
      );
    }
    return { indicesUsados, consultadoEm };
  } catch {
    avisos.push(AVISO_SEM_INDICES);
    return null;
  }
}

/**
 * Lê o texto de um arquivo de cálculo. Só o `calculo` é obrigatório e inteiramente conferido; o
 * `resultado` é opcional (sem ele, aviso). Nunca lança: erro de leitura vira uma frase.
 */
export function lerArquivo(textoDoArquivo: string): LeituraDoArquivo {
  let conteudo: unknown;
  try {
    conteudo = JSON.parse(textoDoArquivo);
  } catch {
    return {
      ok: false,
      erro: "O arquivo está danificado ou não é um arquivo de cálculo do Apura: não pôde ser lido.",
    };
  }
  if (typeof conteudo !== "object" || conteudo === null || Array.isArray(conteudo)) {
    return { ok: false, erro: "O arquivo não é um cálculo do Apura (formato apura/calculo@1)." };
  }
  const envelope = conteudo as Record<string, unknown>;
  if (envelope.formato !== "apura/calculo@1") {
    return { ok: false, erro: "O arquivo não é um cálculo do Apura (formato apura/calculo@1)." };
  }
  try {
    const calculo = lerCalculo(envelope.calculo);
    const avisos: string[] = [];
    const anterior = lerIndicesAnteriores(envelope.resultado, avisos);
    return { ok: true, calculo, anterior, avisos };
  } catch (erro) {
    if (erro instanceof DadoInvalido) {
      return {
        ok: false,
        erro: `O arquivo traz um dado inválido em "${erro.message}" (nome interno do campo, para quem for corrigir o arquivo); o cálculo atual não foi alterado.`,
      };
    }
    throw erro;
  }
}
```

`src/ui/recentes.ts`:

```ts
import type { Calculo, Resultado } from "../compartilhado/tipos.ts";
import { compararInstantes } from "../indices/relogio.ts";
import { montarArquivo, serializarArquivo } from "./arquivo.ts";
import { CHAVE_RECENTES, gravarJson, lerJson, removerChave } from "./armazenamento.ts";

/**
 * Cálculos recentes no navegador (§5.5): os cinco últimos, guardados a cada alteração, no mesmo
 * envelope do arquivo salvo (texto JSON), listados por data, processo e partes; "Remover" por item
 * e "Limpar recentes". A leitura confere só o que a lista mostra; o texto de cada um passa por
 * `lerArquivo` ao abrir. Nada é transmitido.
 */

export const MAXIMO_DE_RECENTES = 5;

export interface Recente {
  id: string;
  atualizadoEm: string;
  processo: string;
  exequente: string;
  executado: string;
  /** o arquivo de cálculo serializado, como "Salvar" gravaria */
  texto: string;
}

function ehRecente(valor: unknown): valor is Recente {
  if (typeof valor !== "object" || valor === null) return false;
  const r = valor as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.atualizadoEm === "string" &&
    typeof r.processo === "string" &&
    typeof r.exequente === "string" &&
    typeof r.executado === "string" &&
    typeof r.texto === "string"
  );
}

function ordenar(recentes: Recente[]): Recente[] {
  return [...recentes].sort((a, b) => compararInstantes(b.atualizadoEm, a.atualizadoEm));
}

/** Os recentes gravados, do mais novo ao mais antigo; lista vazia se não há, se está corrompido ou se a leitura falha. */
export function lerRecentes(armazenamento: Storage | null): Recente[] {
  const lido = lerJson(armazenamento, CHAVE_RECENTES);
  if (!Array.isArray(lido)) return [];
  return ordenar(lido.filter(ehRecente)).slice(0, MAXIMO_DE_RECENTES);
}

/** Guarda (ou atualiza, pelo id) o cálculo; devolve a lista nova, ou a antiga se não deu para gravar. */
export function guardarRecente(
  armazenamento: Storage | null,
  calculo: Calculo,
  resultado: Resultado,
): Recente[] {
  const atuais = lerRecentes(armazenamento);
  const recente: Recente = {
    id: calculo.id,
    atualizadoEm: calculo.atualizadoEm,
    processo: calculo.cabecalho.processo,
    exequente: calculo.cabecalho.exequente,
    executado: calculo.cabecalho.executado,
    texto: serializarArquivo(montarArquivo(calculo, resultado)),
  };
  const novos = ordenar([recente, ...atuais.filter((r) => r.id !== calculo.id)]).slice(
    0,
    MAXIMO_DE_RECENTES,
  );
  return gravarJson(armazenamento, CHAVE_RECENTES, novos) ? novos : atuais;
}

export function removerRecente(armazenamento: Storage | null, id: string): Recente[] {
  const novos = lerRecentes(armazenamento).filter((r) => r.id !== id);
  gravarJson(armazenamento, CHAVE_RECENTES, novos);
  return novos;
}

export function limparRecentes(armazenamento: Storage | null): void {
  removerChave(armazenamento, CHAVE_RECENTES);
}
```

`src/ui/Abrir.tsx`:

```tsx
import { useId, useState } from "react";
import { formatarDataHoraBrasilia } from "../indices/relogio.ts";
import { Ajuda } from "./componentes/Ajuda.tsx";
import type { Recente } from "./recentes.ts";

/**
 * Conteúdo do painel "Abrir" (§5.5, §9.1): os cálculos recentes deste navegador, por data,
 * processo e partes, com "Abrir" e "Remover" em cada um e "Limpar recentes"; e a escolha de um
 * arquivo salvo. O arquivo é lido aqui (texto) e entregue a quem valida e recalcula.
 */
export function Abrir({
  recentes,
  recentesLigados,
  erro,
  aoAbrirRecente,
  aoRemoverRecente,
  aoLimparRecentes,
  aoAbrirTexto,
}: {
  recentes: Recente[];
  recentesLigados: boolean;
  /** frase de erro da última tentativa (arquivo inválido), ou nulo */
  erro: string | null;
  aoAbrirRecente: (recente: Recente) => void;
  aoRemoverRecente: (id: string) => void;
  aoLimparRecentes: () => void;
  aoAbrirTexto: (texto: string) => void;
}) {
  const idDoArquivo = useId();
  const [lendo, setLendo] = useState(false);
  const escolherArquivo = async (arquivo: File | undefined) => {
    if (arquivo === undefined) return;
    setLendo(true);
    try {
      aoAbrirTexto(await arquivo.text());
    } finally {
      setLendo(false);
    }
  };
  return (
    <div>
      <h3>Cálculos recentes neste navegador</h3>
      {!recentesLigados ? (
        <p className="nota">
          A opção "Guardar cálculos recentes neste navegador" está desligada na seção 1 · Processo.
          Ligue-a para os cinco últimos cálculos aparecerem aqui.
        </p>
      ) : recentes.length === 0 ? (
        <p className="nota">Nenhum cálculo recente ainda. Os cinco últimos aparecem aqui.</p>
      ) : (
        <ul className="lista-simples" aria-label="Cálculos recentes">
          {recentes.map((recente) => {
            const nome = recente.processo.trim() === "" ? "(sem nº de processo)" : recente.processo;
            const partes = [recente.exequente, recente.executado].filter((p) => p.trim() !== "");
            return (
              <li key={recente.id}>
                <span>
                  <strong>{nome}</strong>
                  {partes.length > 0 ? ` · ${partes.join(" × ")}` : ""}
                  <br />
                  <small>atualizado em {formatarDataHoraBrasilia(recente.atualizadoEm)}</small>
                </span>
                <button
                  type="button"
                  className="botao secundario"
                  onClick={() => aoAbrirRecente(recente)}
                  aria-label={`Abrir ${nome}, atualizado em ${formatarDataHoraBrasilia(recente.atualizadoEm)}`}
                >
                  Abrir
                </button>
                <button
                  type="button"
                  className="botao discreto"
                  onClick={() => aoRemoverRecente(recente.id)}
                  aria-label={`Remover ${nome}, atualizado em ${formatarDataHoraBrasilia(recente.atualizadoEm)}`}
                >
                  Remover
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {recentes.length > 0 ? (
        <div className="linha">
          <button type="button" className="botao discreto" onClick={aoLimparRecentes}>
            Limpar recentes
          </button>
        </div>
      ) : null}
      <h3>Arquivo salvo</h3>
      <div className="campo">
        <span className="rotulo-do-campo">
          <label htmlFor={idDoArquivo}>Abrir arquivo do Apura (.json)</label>
          <Ajuda assunto="Abrir arquivo">
            O cálculo é recalculado com os índices de hoje; se algum índice usado antes mudou, um
            aviso diz qual.
          </Ajuda>
        </span>
        <input
          id={idDoArquivo}
          type="file"
          accept=".json,application/json"
          disabled={lendo}
          onChange={(evento) => {
            void escolherArquivo(evento.target.files?.[0]);
            evento.target.value = "";
          }}
        />
        {erro ? (
          <p className="erro" role="alert">
            {erro}
          </p>
        ) : null}
      </div>
    </div>
  );
}
```

`src/ui/App.tsx` (reescrito: "Salvar", "Abrir", recentes guardados a cada alteração):

```tsx
import { useEffect, useMemo, useReducer, useState } from "react";
import type { Lancamento, LancamentoCalculado } from "../compartilhado/tipos.ts";
import { compararIndicesUsados } from "../indices/congelar.ts";
import { calcular } from "../motor/calcular.ts";
import { Abrir } from "./Abrir.tsx";
import { ambientePadrao, type Ambiente } from "./ambiente.ts";
import { lerArquivo, montarArquivo, nomeDoArquivo, serializarArquivo } from "./arquivo.ts";
import { CHAVE_RECENTES, removerChave } from "./armazenamento.ts";
import { BarraSuperior } from "./BarraSuperior.tsx";
import { Avisos } from "./componentes/Avisos.tsx";
import { Dialogo } from "./componentes/Dialogo.tsx";
import {
  estadoInicial,
  novoCalculo,
  reduzir,
  type MudancasDoLancamento,
} from "./estado/calculo.ts";
import { faltasDaBase } from "./estado/faltas.ts";
import { sugerirPagamento, sugerirPrestacao, valorPelaBase } from "./estado/novaLinha.ts";
import "./estilos.css";
import {
  esquecer,
  gravarPreferencias,
  lerPreferencias,
  type Preferencias,
} from "./preferencias.ts";
import {
  guardarRecente,
  lerRecentes,
  limparRecentes,
  removerRecente,
  type Recente,
} from "./recentes.ts";
import { Rodape } from "./Rodape.tsx";
import { Indicadores } from "./tabelas/Indicadores.tsx";
import { Personalizar } from "./tabelas/Personalizar.tsx";
import { TabelaLancamentos, type LinhaDaTabela } from "./tabelas/TabelaLancamentos.tsx";
import { BaseDosAlimentos } from "./secoes/Base.tsx";
import { EditorDePeriodos } from "./secoes/EditorDePeriodos.tsx";
import { Encargos } from "./secoes/Encargos.tsx";
import { LotePagamentosSecao } from "./secoes/LotePagamentos.tsx";
import { LotePrestacoesSecao } from "./secoes/LotePrestacoes.tsx";
import { Processo } from "./secoes/Processo.tsx";

/**
 * Tela única em duas colunas (§9): esquerda, dados do caso e lançamentos em lote; direita,
 * resultado e lançamentos individuais. Recálculo a cada alteração, sem botão "Calcular" (§4.3).
 * O `ambiente` é injetável para os testes de componente.
 */
export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambiente }) {
  const armazenamento = ambiente.armazenamento();
  const [preferencias, setPreferencias] = useState(() => lerPreferencias(armazenamento));
  const calculoNovo = (p: Preferencias) =>
    novoCalculo({
      id: ambiente.novoId(),
      agora: ambiente.agora(),
      hoje: ambiente.hoje(),
      cabecalho: p.lembrar ? { defensor: p.defensor, orgao: p.orgao } : {},
    });
  // A tabela de índices é congelada quando o app abre (§8.2); "Novo cálculo" congela outra.
  const [estado, despachar] = useReducer(reduzir, undefined, () =>
    estadoInicial(calculoNovo(preferencias), ambiente.congelar()),
  );
  const resultado = useMemo(
    () => calcular(estado.calculo, estado.tabela),
    [estado.calculo, estado.tabela],
  );
  const agora = () => ambiente.agora();
  // o que falta na base para apurar as prestações lançadas: aviso no topo e campo em vermelho
  const faltas = faltasDaBase(estado.calculo);
  const [editorAberto, setEditorAberto] = useState(false);
  // Uma linha por lançamento, na ordem do cálculo (o motor devolve os calculados na mesma ordem).
  const linhas: LinhaDaTabela[] = estado.calculo.lancamentos.map((lancamento, i) => ({
    lancamento,
    calculado: resultado.lancamentos[i] as LancamentoCalculado,
  }));
  const excluir = (id: string) => despachar({ tipo: "excluirLancamento", id, em: agora() });
  const editar = (id: string, mudancas: MudancasDoLancamento) =>
    despachar({ tipo: "editarLancamento", id, mudancas, em: agora() });
  const incluir = (lancamento: Omit<Lancamento, "id" | "origem" | "editado">) =>
    despachar({ tipo: "incluirLancamento", lancamento, em: agora() });
  const valorDaBase = (data: string) => valorPelaBase(estado.calculo, estado.tabela, data);
  const [personalizando, setPersonalizando] = useState<Lancamento | null>(null);
  const personalizar = (id: string) =>
    setPersonalizando(estado.calculo.lancamentos.find((l) => l.id === id) ?? null);

  // Cada "Novo cálculo" ou "Abrir" remonta as duas colunas: os formulários, a linha nova e as
  // células em edição recomeçam (nada digitado para um cálculo vai parar no outro).
  const [aberturas, setAberturas] = useState(0);
  const novo = () => {
    despachar({ tipo: "novo", calculo: calculoNovo(preferencias), ...ambiente.congelar() });
    setAberturas(aberturas + 1);
  };

  // Salvar (§5.1): o arquivo leva o cálculo e o resultado, com o nome apura-<processo>-<data>.json.
  const salvar = () =>
    ambiente.baixar(
      nomeDoArquivo(estado.calculo),
      serializarArquivo(montarArquivo(estado.calculo, resultado)),
    );

  // Abrir (§5.1, §8.2): valida o arquivo, congela a tabela de hoje, recalcula e compara os
  // índices usados pelo cálculo salvo com os do recálculo.
  const [abrirAberto, setAbrirAberto] = useState(false);
  const [erroDeAbertura, setErroDeAbertura] = useState<string | null>(null);
  const [recentes, setRecentes] = useState<Recente[]>([]);
  const abrirTexto = (texto: string) => {
    const leitura = lerArquivo(texto);
    if (!leitura.ok) {
      setErroDeAbertura(leitura.erro);
      return;
    }
    const indices = ambiente.congelar();
    const recalculado = calcular(leitura.calculo, indices.tabela);
    const avisos = [
      ...leitura.avisos,
      ...(leitura.anterior === null
        ? []
        : compararIndicesUsados(leitura.anterior, {
            indicesUsados: recalculado.indicesUsados,
            consultadoEm: recalculado.consultaIndices.em,
          })),
    ];
    despachar({ tipo: "abrir", calculo: leitura.calculo, ...indices, avisos });
    setAberturas(aberturas + 1);
    setErroDeAbertura(null);
    setAbrirAberto(false);
  };

  // Recentes (§5.5): o cálculo é guardado a cada alteração (nunca o cálculo em branco).
  useEffect(() => {
    if (!preferencias.guardarRecentes || armazenamento === null || !estado.tocado) return;
    guardarRecente(armazenamento, estado.calculo, resultado);
  }, [armazenamento, estado.calculo, estado.tocado, preferencias.guardarRecentes, resultado]);

  const mudarPreferencias = (mudancas: Partial<Preferencias>) => {
    const novas = { ...preferencias, ...mudancas };
    setPreferencias(novas);
    gravarPreferencias(armazenamento, novas);
    if (mudancas.guardarRecentes === false) removerChave(armazenamento, CHAVE_RECENTES);
  };
  const mudarCabecalho = (campo: keyof typeof estado.calculo.cabecalho, valor: string) => {
    despachar({ tipo: "cabecalho", campo, valor, em: agora() });
    if ((campo === "defensor" || campo === "orgao") && preferencias.lembrar) {
      mudarPreferencias({ [campo]: valor });
    }
  };
  const esquecerTudo = () => {
    esquecer(armazenamento);
    const novas = { ...preferencias, defensor: "", orgao: "", lembrar: false };
    setPreferencias(novas);
    gravarPreferencias(armazenamento, novas);
  };

  return (
    <div className="app">
      <BarraSuperior
        aoNovo={novo}
        aoAbrir={() => {
          setErroDeAbertura(null);
          setRecentes(lerRecentes(armazenamento));
          setAbrirAberto(true);
        }}
        aoSalvar={salvar}
      />
      <main className="principal">
        <div className="coluna-esquerda" key={`esquerda-${estado.calculo.id}-${aberturas}`}>
          <Processo
            cabecalho={estado.calculo.cabecalho}
            aoMudar={mudarCabecalho}
            preferencias={preferencias}
            aoMudarPreferencias={mudarPreferencias}
            aoEsquecer={esquecerTudo}
            armazenamentoDisponivel={armazenamento !== null}
          />
          <BaseDosAlimentos
            base={estado.calculo.base}
            hoje={ambiente.hoje()}
            faltas={faltas}
            aoMudar={(base) => despachar({ tipo: "base", base, em: agora() })}
          />
          <LotePrestacoesSecao
            ultimoLote={estado.calculo.lotes.ultimoLotePrestacoes}
            avisos={estado.loteRecente === "prestacoes" ? estado.avisosDoLote : []}
            aoLancar={(lote) => despachar({ tipo: "lancarPrestacoes", lote, em: agora() })}
          />
          <LotePagamentosSecao
            ultimoLote={estado.calculo.lotes.ultimoLoteAmortizacoes}
            avisos={estado.loteRecente === "pagamentos" ? estado.avisosDoLote : []}
            aoLancar={(lote) => despachar({ tipo: "lancarPagamentos", lote, em: agora() })}
          />
          <Encargos
            calculo={estado.calculo}
            aoMudarAcrescimo={(campo, valor) =>
              despachar({ tipo: "acrescimos", campo, valor, em: agora() })
            }
            aoMudarDataElaboracao={(data) =>
              despachar({ tipo: "dataElaboracao", data, em: agora() })
            }
            aoMudarObservacoes={(texto) => despachar({ tipo: "observacoes", texto, em: agora() })}
            aoAjustar={() => setEditorAberto(true)}
          />
        </div>
        <div className="coluna-direita" key={`direita-${estado.calculo.id}-${aberturas}`}>
          <Indicadores totais={resultado.totais} dataElaboracao={estado.calculo.dataElaboracao} />
          <TabelaLancamentos
            tipo="prestacao"
            linhas={linhas.filter((l) => l.lancamento.tipo === "prestacao")}
            aoPersonalizar={personalizar}
            aoExcluir={excluir}
            aoEditar={editar}
            aoSugerir={() => sugerirPrestacao(estado.calculo, estado.tabela)}
            valorDaBase={valorDaBase}
            aoIncluir={incluir}
          />
          <TabelaLancamentos
            tipo="amortizacao"
            linhas={linhas.filter((l) => l.lancamento.tipo === "amortizacao")}
            aoPersonalizar={personalizar}
            aoExcluir={excluir}
            aoEditar={editar}
            aoSugerir={() => sugerirPagamento(estado.calculo)}
            valorDaBase={valorDaBase}
            aoIncluir={incluir}
          />
          <Avisos
            avisos={[
              ...faltas.map((f) => f.aviso),
              ...estado.situacao.avisos,
              ...estado.avisosDaAbertura,
              ...resultado.avisos,
            ]}
          />
        </div>
      </main>
      <Rodape situacaoDosIndices={estado.situacao.rodape} />
      <Dialogo
        titulo="Ajustar a metodologia de encargos"
        aberto={editorAberto}
        aoFechar={() => setEditorAberto(false)}
      >
        <EditorDePeriodos
          metodologia={estado.calculo.metodologia}
          aoMudar={(metodologia) => despachar({ tipo: "metodologia", metodologia, em: agora() })}
        />
        <div className="dialogo-acoes">
          <button type="button" className="botao" onClick={() => setEditorAberto(false)}>
            Fechar
          </button>
        </div>
      </Dialogo>
      <Dialogo titulo="Abrir cálculo" aberto={abrirAberto} aoFechar={() => setAbrirAberto(false)}>
        <Abrir
          recentes={recentes}
          recentesLigados={preferencias.guardarRecentes && armazenamento !== null}
          erro={erroDeAbertura}
          aoAbrirRecente={(recente) => abrirTexto(recente.texto)}
          aoRemoverRecente={(id) => setRecentes(removerRecente(armazenamento, id))}
          aoLimparRecentes={() => {
            limparRecentes(armazenamento);
            setRecentes([]);
          }}
          aoAbrirTexto={abrirTexto}
        />
        <div className="dialogo-acoes">
          <button type="button" className="botao secundario" onClick={() => setAbrirAberto(false)}>
            Cancelar
          </button>
        </div>
      </Dialogo>
      <Dialogo
        titulo={
          personalizando?.tipo === "amortizacao"
            ? "Personalizar pagamento"
            : "Personalizar prestação"
        }
        aberto={personalizando !== null}
        aoFechar={() => setPersonalizando(null)}
      >
        {personalizando !== null ? (
          <Personalizar
            lancamento={personalizando}
            calculo={estado.calculo}
            aoEditar={editar}
            aoAplicarRendimento={(id, rendimento) =>
              despachar({ tipo: "aplicarRendimentoDaquiEmDiante", id, rendimento, em: agora() })
            }
            aoFechar={() => setPersonalizando(null)}
          />
        ) : null}
      </Dialogo>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/ui/arquivo.test.ts src/ui/recentes.test.ts src/ui/Abrir.test.tsx`
Esperado: `13 passed (13)` (6 do arquivo, 2 dos recentes, 5 do painel).

- [ ] **Step 5: Verificação completa**

Run: `npm run format && npm run verificar`
Esperado: `786 passed | 9 skipped (795)` em 43 arquivos.

- [ ] **Step 6: Commit**

```bash
git add src/compartilhado/tipos.ts src/ui/arquivo.ts src/ui/arquivo.test.ts src/ui/recentes.ts src/ui/recentes.test.ts src/ui/Abrir.tsx src/ui/Abrir.test.tsx src/ui/App.tsx
git commit -m "ui: Salvar e Abrir (arquivo validado, recálculo com os índices de hoje e aviso dos que mudaram) e cálculos recentes no navegador

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 13: Tema da tela: botão na barra que alterna "do sistema", "claro" e "escuro", guardado nas preferências

Decisão do responsável de 12/10/2026 (D9): além de seguir o sistema, a pessoa pode fixar o tema claro ou escuro, e a escolha fica no navegador. O CSS da Task 2 já aceita `data-theme="light"` e `data-theme="dark"` na raiz, e o `index.html` da Task 2 já marca o tema guardado antes do CSS; esta tarefa põe o `tema` nas preferências, o botão na barra e a marcação na raiz a cada troca.

**Files:**
- Modify (reescrito): `src/ui/preferencias.ts`, `src/ui/BarraSuperior.tsx`, `src/ui/App.tsx`
- Test (reescritos): `src/ui/preferencias.test.ts`, `src/ui/secoes/Processo.test.tsx`

**Interfaces:**
- Consumes: `gravarPreferencias`, `lerPreferencias`, `esquecer` e o fluxo `mudarPreferencias` do App (Task 5); as variáveis de `estilos.css` por `data-theme` (Task 2).
- Produces: `type Tema = "sistema" | "claro" | "escuro"`, `TEMAS`, `Preferencias.tema` (padrão `"sistema"`; valor desconhecido no armazenamento vira `"sistema"`; gravado mesmo com "Lembrar" desligado); `proximoTema(tema)` (do sistema → claro → escuro → do sistema); `BarraSuperior({ aoNovo?, aoAbrir?, aoSalvar?, tema?, aoMudarTema? })` com o botão de texto "Tema do sistema" / "Tema claro" / "Tema escuro", que chama `aoMudarTema(proximoTema(tema))` e tem `title` "Clique para mudar para o tema <seguinte>"; o App aplica na raiz, por `useLayoutEffect`, `setAttribute("data-theme", …)` ("claro" → `light`, "escuro" → `dark`) ou `removeAttribute` ("sistema"); na carga da página, o script inline do `index.html` (Task 2) já marcou o tema guardado antes do CSS. "Esquecer" e desligar "Lembrar" mantêm o tema (o App regrava as preferências em seguida).

- [ ] **Step 1: Escrever os testes**

`src/ui/preferencias.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CHAVE_PREFERENCIAS, CHAVE_RECENTES } from "./armazenamento.ts";
import {
  esquecer,
  gravarPreferencias,
  lerPreferencias,
  PREFERENCIAS_PADRAO,
} from "./preferencias.ts";
import { armazenamentoEmMemoria, armazenamentoQueFalha } from "./testes/ambiente-de-teste.ts";

describe("preferências no navegador (§5.5)", () => {
  it("sem nada gravado, valem os padrões: lembrar e guardar recentes ligados, nomes vazios, tema do sistema", () => {
    expect(lerPreferencias(armazenamentoEmMemoria())).toEqual(PREFERENCIAS_PADRAO);
    expect(lerPreferencias(null)).toEqual(PREFERENCIAS_PADRAO);
    expect(PREFERENCIAS_PADRAO.tema).toBe("sistema");
  });

  it("grava e lê de volta; com 'lembrar' desligado, grava os nomes vazios mas mantém as opções e o tema", () => {
    const armazenamento = armazenamentoEmMemoria();
    const p = {
      defensor: "Defensor(a) de teste",
      orgao: "Órgão de teste",
      lembrar: true,
      guardarRecentes: false,
      tema: "escuro" as const,
    };
    expect(gravarPreferencias(armazenamento, p)).toBe(true);
    expect(lerPreferencias(armazenamento)).toEqual(p);
    expect(gravarPreferencias(armazenamento, { ...p, lembrar: false })).toBe(true);
    expect(JSON.parse(armazenamento.getItem(CHAVE_PREFERENCIAS) ?? "")).toEqual({
      defensor: "",
      orgao: "",
      lembrar: false,
      guardarRecentes: false,
      tema: "escuro",
    });
    expect(lerPreferencias(armazenamento)).toEqual({
      defensor: "",
      orgao: "",
      lembrar: false,
      guardarRecentes: false,
      tema: "escuro",
    });
  });

  it("conteúdo corrompido ou de outro formato volta aos padrões campo a campo (tema desconhecido vira 'sistema')", () => {
    expect(lerPreferencias(armazenamentoEmMemoria({ [CHAVE_PREFERENCIAS]: "{nada" }))).toEqual(
      PREFERENCIAS_PADRAO,
    );
    expect(lerPreferencias(armazenamentoEmMemoria({ [CHAVE_PREFERENCIAS]: "[1,2]" }))).toEqual(
      PREFERENCIAS_PADRAO,
    );
    const parcial = armazenamentoEmMemoria({
      [CHAVE_PREFERENCIAS]: JSON.stringify({
        defensor: 7,
        orgao: "Órgão",
        guardarRecentes: "sim",
        tema: "roxo",
      }),
    });
    expect(lerPreferencias(parcial)).toEqual({
      defensor: "",
      orgao: "Órgão",
      lembrar: true,
      guardarRecentes: true,
      tema: "sistema",
    });
    expect(
      lerPreferencias(armazenamentoEmMemoria({ [CHAVE_PREFERENCIAS]: '{"tema":"claro"}' })).tema,
    ).toBe("claro");
  });

  it("armazenamento bloqueado: ler devolve os padrões, gravar devolve false, esquecer não lança", () => {
    const bloqueado = armazenamentoQueFalha();
    expect(lerPreferencias(bloqueado)).toEqual(PREFERENCIAS_PADRAO);
    expect(gravarPreferencias(bloqueado, PREFERENCIAS_PADRAO)).toBe(false);
    expect(() => esquecer(bloqueado)).not.toThrow();
    expect(gravarPreferencias(null, PREFERENCIAS_PADRAO)).toBe(false);
  });

  it("esquecer apaga preferências e recentes e deixa o resto do armazenamento em paz", () => {
    const armazenamento = armazenamentoEmMemoria({
      [CHAVE_PREFERENCIAS]: "{}",
      [CHAVE_RECENTES]: "[]",
      "outra.chave": "fica",
    });
    esquecer(armazenamento);
    expect(armazenamento.getItem(CHAVE_PREFERENCIAS)).toBeNull();
    expect(armazenamento.getItem(CHAVE_RECENTES)).toBeNull();
    expect(armazenamento.getItem("outra.chave")).toBe("fica");
  });
});
```

`src/ui/secoes/Processo.test.tsx` (reescrito: os dois testes do número do processo e dos balões continuam iguais; as expectativas das preferências gravadas ganham `tema: "sistema"`, o `afterEach` limpa `data-theme` da raiz, o teste sem armazenamento também usa o botão, e entram os dois testes do botão):

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../App.tsx";
import { CHAVE_PREFERENCIAS, CHAVE_RECENTES } from "../armazenamento.ts";
import {
  ambienteDeTeste,
  armazenamentoEmMemoria,
  armazenamentoQueFalha,
} from "../testes/ambiente-de-teste.ts";

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-theme");
});

function preferenciasGravadas(armazenamento: Storage): unknown {
  return JSON.parse(armazenamento.getItem(CHAVE_PREFERENCIAS) ?? "null");
}

describe("1 · Processo: número do processo no padrão do CNJ (decisão de 13/10/2026)", () => {
  it("a máscara põe hífen e pontos ao digitar; dígito verificador errado ou número incompleto mostram erro; vazio é aceito", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    const campo = screen.getByLabelText("Nº do processo") as HTMLInputElement;
    await user.type(campo, "080000046202681200");
    expect(campo.value).toBe("0800000-46.2026.8.12.00");
    expect(screen.getByRole("alert").textContent).toBe(
      "Número do processo inválido (confira os dígitos).",
    );
    await user.type(campo, "01");
    expect(campo.value).toBe("0800000-46.2026.8.12.0001");
    expect(screen.queryByRole("alert")).toBeNull();
    // colado com pontuação e dígito verificador errado: erro
    await user.tripleClick(campo);
    await user.paste("0800000-45.2026.8.12.0001");
    expect(campo.value).toBe("0800000-45.2026.8.12.0001");
    expect(screen.getByRole("alert").textContent).toBe(
      "Número do processo inválido (confira os dígitos).",
    );
    // colado com texto antes (do PDF): só os números contam
    await user.tripleClick(campo);
    await user.paste("Processo nº 0800000-46.2026.8.12.0001");
    expect(campo.value).toBe("0800000-46.2026.8.12.0001");
    expect(screen.queryByRole("alert")).toBeNull();
    // Backspace logo depois do hífen apaga o dígito antes dele, e o cursor fica no lugar
    campo.setSelectionRange(8, 8);
    await user.keyboard("{Backspace}");
    expect(campo.value).toBe("0800004-62.0268.1.20.001");
    expect(campo.selectionStart).toBe(6);
    // apagar tudo é aceito (cálculo antes de existir processo)
    await user.clear(campo);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("as explicações ficam nos balões ⓘ, não em texto fixo", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    expect(screen.queryByText(/não são gravados em servidor algum/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Ajuda: Processo" }));
    expect(screen.getByText(/não são gravados em servidor algum/)).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Ajuda: cálculos recentes" }));
    expect(screen.getByText(/Em computador compartilhado, desligue/)).toBeDefined();
    expect(screen.queryByText(/não são gravados em servidor algum/)).toBeNull();
  });
});

describe("1 · Processo: preferências e recentes no navegador (§5.5)", () => {
  it("lembra defensor(a) e órgão enquanto digita e os preenche no próximo cálculo", async () => {
    const user = userEvent.setup();
    const ambiente = ambienteDeTeste();
    render(<App ambiente={ambiente} />);
    await user.type(screen.getByLabelText("Defensor(a) responsável"), "Defensor(a) de teste");
    await user.type(screen.getByLabelText("Órgão de atuação"), "1ª Defensoria de teste");
    expect(preferenciasGravadas(ambiente.armazenado as Storage)).toEqual({
      defensor: "Defensor(a) de teste",
      orgao: "1ª Defensoria de teste",
      lembrar: true,
      guardarRecentes: true,
      tema: "sistema",
    });
    await user.type(screen.getByLabelText("Nº do processo"), "08000004620268120001");
    await user.click(screen.getByRole("button", { name: "Novo cálculo" }));
    expect((screen.getByLabelText("Defensor(a) responsável") as HTMLInputElement).value).toBe(
      "Defensor(a) de teste",
    );
    expect((screen.getByLabelText("Órgão de atuação") as HTMLInputElement).value).toBe(
      "1ª Defensoria de teste",
    );
    expect((screen.getByLabelText("Nº do processo") as HTMLInputElement).value).toBe("");
  });

  it("abre com os nomes gravados antes; desligar 'Lembrar' apaga os nomes gravados e para de gravar", async () => {
    const user = userEvent.setup();
    const armazenamento = armazenamentoEmMemoria({
      [CHAVE_PREFERENCIAS]: JSON.stringify({
        defensor: "Quem ficou gravado",
        orgao: "Órgão gravado",
        lembrar: true,
        guardarRecentes: true,
      }),
    });
    render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
    const defensor = screen.getByLabelText("Defensor(a) responsável") as HTMLInputElement;
    expect(defensor.value).toBe("Quem ficou gravado");
    await user.click(screen.getByLabelText("Lembrar neste navegador"));
    expect(preferenciasGravadas(armazenamento)).toEqual({
      defensor: "",
      orgao: "",
      lembrar: false,
      guardarRecentes: true,
      tema: "sistema",
    });
    await user.type(defensor, " e mais");
    expect(defensor.value).toBe("Quem ficou gravado e mais");
    expect((preferenciasGravadas(armazenamento) as { defensor: string }).defensor).toBe("");
  });

  it("'Esquecer' apaga preferências e recentes, desliga 'Lembrar' e mantém o cálculo na tela", async () => {
    const user = userEvent.setup();
    const armazenamento = armazenamentoEmMemoria({ [CHAVE_RECENTES]: "[]" });
    render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
    const defensor = screen.getByLabelText("Defensor(a) responsável") as HTMLInputElement;
    await user.type(defensor, "Alguém");
    await user.click(screen.getByRole("button", { name: "Esquecer" }));
    expect(armazenamento.getItem(CHAVE_RECENTES)).toBeNull();
    expect(preferenciasGravadas(armazenamento)).toEqual({
      defensor: "",
      orgao: "",
      lembrar: false,
      guardarRecentes: true,
      tema: "sistema",
    });
    expect((screen.getByLabelText("Lembrar neste navegador") as HTMLInputElement).checked).toBe(
      false,
    );
    expect(defensor.value).toBe("Alguém");
  });

  it("desligar 'Guardar cálculos recentes' apaga os recentes já guardados", async () => {
    const user = userEvent.setup();
    const armazenamento = armazenamentoEmMemoria({ [CHAVE_RECENTES]: "[]" });
    render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
    await user.click(screen.getByLabelText("Guardar cálculos recentes neste navegador"));
    expect(armazenamento.getItem(CHAVE_RECENTES)).toBeNull();
    expect(
      (preferenciasGravadas(armazenamento) as { guardarRecentes: boolean }).guardarRecentes,
    ).toBe(false);
  });

  it("sem armazenamento (bloqueado ou ausente), a tela funciona e avisa que nada é guardado", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste({ armazenamento: null })} />);
    expect(screen.getByText(/Este navegador não permite guardar nada/).textContent).toContain(
      "não permite guardar nada",
    );
    await user.type(screen.getByLabelText("Defensor(a) responsável"), "Ninguém");
    await user.click(screen.getByRole("button", { name: "Esquecer" }));
    // do sistema → claro → escuro
    await user.click(screen.getByRole("button", { name: "Tema do sistema" }));
    await user.click(screen.getByRole("button", { name: "Tema claro" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    cleanup();
    document.documentElement.removeAttribute("data-theme");
    render(<App ambiente={ambienteDeTeste({ armazenamento: armazenamentoQueFalha() })} />);
    await user.type(screen.getByLabelText("Órgão de atuação"), "Órgão");
    expect((screen.getByLabelText("Órgão de atuação") as HTMLInputElement).value).toBe("Órgão");
    await user.click(screen.getByRole("button", { name: "Tema do sistema" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("o botão de tema alterna do sistema → claro → escuro → do sistema, aplica na raiz e fica guardado", async () => {
    const user = userEvent.setup();
    const armazenamento = armazenamentoEmMemoria();
    render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
    const botao = screen.getByRole("button", { name: /^Tema / });
    expect(botao.textContent).toBe("Tema do sistema");
    expect(botao.getAttribute("title")).toBe("Clique para mudar para o tema claro");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    await user.click(botao);
    expect(botao.textContent).toBe("Tema claro");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect((preferenciasGravadas(armazenamento) as { tema: string }).tema).toBe("claro");
    await user.click(botao);
    expect(botao.textContent).toBe("Tema escuro");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect((preferenciasGravadas(armazenamento) as { tema: string }).tema).toBe("escuro");
    // pelo teclado também: Enter no botão volta a "do sistema"
    botao.focus();
    await user.keyboard("{Enter}");
    expect(botao.textContent).toBe("Tema do sistema");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect((preferenciasGravadas(armazenamento) as { tema: string }).tema).toBe("sistema");
  });

  it("abre com o tema guardado; Esquecer e desligar Lembrar não apagam o tema", async () => {
    const user = userEvent.setup();
    const armazenamento = armazenamentoEmMemoria({
      [CHAVE_PREFERENCIAS]: JSON.stringify({ tema: "escuro" }),
    });
    render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
    expect(screen.getByRole("button", { name: /^Tema / }).textContent).toBe("Tema escuro");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    await user.click(screen.getByRole("button", { name: "Esquecer" }));
    expect((preferenciasGravadas(armazenamento) as { tema: string }).tema).toBe("escuro");
    await user.click(screen.getByLabelText("Lembrar neste navegador"));
    expect(preferenciasGravadas(armazenamento)).toEqual({
      defensor: "",
      orgao: "",
      lembrar: true,
      guardarRecentes: true,
      tema: "escuro",
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/preferencias.test.ts src/ui/secoes/Processo.test.tsx`
Esperado: em `preferencias.test.ts`, `3 failed | 2 passed`: "sem nada gravado…" (`PREFERENCIAS_PADRAO.tema` é `undefined`), "grava e lê de volta…" e "conteúdo corrompido…" (o objeto lido não tem `tema`); em `Processo.test.tsx`, `6 failed | 3 passed`: "lembra defensor(a) e órgão…", "abre com os nomes gravados…" e "'Esquecer' apaga…" (as preferências gravadas não têm `tema`), "sem armazenamento…", "o botão de tema alterna…" e "abre com o tema guardado…" (`Unable to find an accessible element with the role "button" and name "Tema do sistema"` ou `` name `/^Tema /` ``).

- [ ] **Step 3: Implementar**

`src/ui/preferencias.ts`:

```ts
import {
  CHAVE_PREFERENCIAS,
  CHAVE_RECENTES,
  gravarJson,
  lerJson,
  removerChave,
} from "./armazenamento.ts";

/**
 * Preferências do usuário neste navegador (§5.5): defensor(a) e órgão, com "Lembrar neste
 * navegador" (ligado por padrão); a opção "Guardar cálculos recentes neste navegador" (ligada
 * por padrão; para desligar em computador compartilhado); e o tema da tela (do sistema, claro ou
 * escuro; padrão: do sistema; decisão de 12/10/2026). "Esquecer" apaga preferências e recentes;
 * o App regrava em seguida as opções e o tema, que não são dados pessoais. Nada é transmitido.
 */
export type Tema = "sistema" | "claro" | "escuro";

export const TEMAS: readonly Tema[] = ["sistema", "claro", "escuro"];

export interface Preferencias {
  defensor: string;
  orgao: string;
  lembrar: boolean;
  guardarRecentes: boolean;
  tema: Tema;
}

export const PREFERENCIAS_PADRAO: Preferencias = {
  defensor: "",
  orgao: "",
  lembrar: true,
  guardarRecentes: true,
  tema: "sistema",
};

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

function booleano(valor: unknown, padrao: boolean): boolean {
  return typeof valor === "boolean" ? valor : padrao;
}

function tema(valor: unknown): Tema {
  return typeof valor === "string" && (TEMAS as string[]).includes(valor)
    ? (valor as Tema)
    : PREFERENCIAS_PADRAO.tema;
}

/** As preferências gravadas, campo a campo conferido; o padrão para o que falta ou está estranho. */
export function lerPreferencias(armazenamento: Storage | null): Preferencias {
  const lido = lerJson(armazenamento, CHAVE_PREFERENCIAS);
  if (typeof lido !== "object" || lido === null) return { ...PREFERENCIAS_PADRAO };
  const dados = lido as Record<string, unknown>;
  const lembrar = booleano(dados.lembrar, PREFERENCIAS_PADRAO.lembrar);
  return {
    defensor: lembrar ? texto(dados.defensor) : "",
    orgao: lembrar ? texto(dados.orgao) : "",
    lembrar,
    guardarRecentes: booleano(dados.guardarRecentes, PREFERENCIAS_PADRAO.guardarRecentes),
    tema: tema(dados.tema),
  };
}

/**
 * Grava as preferências. Com "Lembrar" desligado, defensor e órgão são gravados vazios (as duas
 * opções e o tema continuam gravados, para valerem na próxima visita). Devolve false se não deu
 * para gravar.
 */
export function gravarPreferencias(armazenamento: Storage | null, p: Preferencias): boolean {
  const gravadas: Preferencias = p.lembrar ? p : { ...p, defensor: "", orgao: "" };
  return gravarJson(armazenamento, CHAVE_PREFERENCIAS, gravadas);
}

/** "Esquecer": apaga preferências e cálculos recentes deste navegador. */
export function esquecer(armazenamento: Storage | null): void {
  removerChave(armazenamento, CHAVE_PREFERENCIAS);
  removerChave(armazenamento, CHAVE_RECENTES);
}
```

`src/ui/BarraSuperior.tsx`:

```tsx
import { TEMAS, type Tema } from "./preferencias.ts";

/** O tema seguinte na volta do botão: do sistema → claro → escuro → do sistema. */
export function proximoTema(tema: Tema): Tema {
  return TEMAS[(TEMAS.indexOf(tema) + 1) % TEMAS.length] ?? "sistema";
}

const NOME_DO_TEMA: Record<Tema, string> = {
  sistema: "do sistema",
  claro: "claro",
  escuro: "escuro",
};

/**
 * Barra superior (§9.1): nome do sistema, as quatro ações e o botão de tema, que alterna a cada
 * clique entre "do sistema", "claro" e "escuro" (decisão de 13/10/2026). "Relatório / PDF" chega
 * na fase 6.
 */
export function BarraSuperior({
  aoNovo,
  aoAbrir,
  aoSalvar,
  tema = "sistema",
  aoMudarTema,
}: {
  aoNovo?: () => void;
  aoAbrir?: () => void;
  aoSalvar?: () => void;
  tema?: Tema;
  aoMudarTema?: (tema: Tema) => void;
}) {
  return (
    <header className="barra">
      <h1 className="marca">
        Apura <small>· Sistema de Cálculos Judiciais · DPE-MS</small>
      </h1>
      <nav className="acoes-principais" aria-label="Ações do cálculo">
        <button type="button" className="botao-barra" onClick={aoNovo}>
          Novo cálculo
        </button>
        <button type="button" className="botao-barra" onClick={aoAbrir}>
          Abrir
        </button>
        <button type="button" className="botao-barra" onClick={aoSalvar}>
          Salvar
        </button>
        <button
          type="button"
          className="botao-barra principal"
          disabled
          title="Em construção: o relatório em tela e PDF chega na fase 6 do MVP."
        >
          Relatório / PDF
        </button>
      </nav>
      <button
        type="button"
        className="botao-barra botao-tema"
        onClick={() => aoMudarTema?.(proximoTema(tema))}
        title={`Clique para mudar para o tema ${NOME_DO_TEMA[proximoTema(tema)]}`}
      >
        Tema {NOME_DO_TEMA[tema]}
      </button>
    </header>
  );
}
```

`src/ui/App.tsx` (reescrito; `useLayoutEffect` aplica o tema na raiz e a barra recebe `tema` e `aoMudarTema`):

```tsx
import { useEffect, useLayoutEffect, useMemo, useReducer, useState } from "react";
import type { Lancamento, LancamentoCalculado } from "../compartilhado/tipos.ts";
import { compararIndicesUsados } from "../indices/congelar.ts";
import { calcular } from "../motor/calcular.ts";
import { Abrir } from "./Abrir.tsx";
import { ambientePadrao, type Ambiente } from "./ambiente.ts";
import { lerArquivo, montarArquivo, nomeDoArquivo, serializarArquivo } from "./arquivo.ts";
import { CHAVE_RECENTES, removerChave } from "./armazenamento.ts";
import { BarraSuperior } from "./BarraSuperior.tsx";
import { Avisos } from "./componentes/Avisos.tsx";
import { Dialogo } from "./componentes/Dialogo.tsx";
import {
  estadoInicial,
  novoCalculo,
  reduzir,
  type MudancasDoLancamento,
} from "./estado/calculo.ts";
import { faltasDaBase } from "./estado/faltas.ts";
import { sugerirPagamento, sugerirPrestacao, valorPelaBase } from "./estado/novaLinha.ts";
import "./estilos.css";
import {
  esquecer,
  gravarPreferencias,
  lerPreferencias,
  type Preferencias,
} from "./preferencias.ts";
import {
  guardarRecente,
  lerRecentes,
  limparRecentes,
  removerRecente,
  type Recente,
} from "./recentes.ts";
import { Rodape } from "./Rodape.tsx";
import { Indicadores } from "./tabelas/Indicadores.tsx";
import { Personalizar } from "./tabelas/Personalizar.tsx";
import { TabelaLancamentos, type LinhaDaTabela } from "./tabelas/TabelaLancamentos.tsx";
import { BaseDosAlimentos } from "./secoes/Base.tsx";
import { EditorDePeriodos } from "./secoes/EditorDePeriodos.tsx";
import { Encargos } from "./secoes/Encargos.tsx";
import { LotePagamentosSecao } from "./secoes/LotePagamentos.tsx";
import { LotePrestacoesSecao } from "./secoes/LotePrestacoes.tsx";
import { Processo } from "./secoes/Processo.tsx";

/**
 * Tela única em duas colunas (§9): esquerda, dados do caso e lançamentos em lote; direita,
 * resultado e lançamentos individuais. Recálculo a cada alteração, sem botão "Calcular" (§4.3).
 * O `ambiente` é injetável para os testes de componente.
 */
export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambiente }) {
  const armazenamento = ambiente.armazenamento();
  const [preferencias, setPreferencias] = useState(() => lerPreferencias(armazenamento));
  // Tema (decisão de 12/10/2026): "sistema" deixa o CSS seguir prefers-color-scheme; "claro" e
  // "escuro" vão para data-theme na raiz. Na carga da página, um script do index.html já marcou o
  // tema guardado antes do CSS (sem piscar); aqui o atributo acompanha cada troca no seletor.
  useLayoutEffect(() => {
    const raiz = document.documentElement;
    if (preferencias.tema === "sistema") raiz.removeAttribute("data-theme");
    else raiz.setAttribute("data-theme", preferencias.tema === "claro" ? "light" : "dark");
  }, [preferencias.tema]);
  const calculoNovo = (p: Preferencias) =>
    novoCalculo({
      id: ambiente.novoId(),
      agora: ambiente.agora(),
      hoje: ambiente.hoje(),
      cabecalho: p.lembrar ? { defensor: p.defensor, orgao: p.orgao } : {},
    });
  // A tabela de índices é congelada quando o app abre (§8.2); "Novo cálculo" congela outra.
  const [estado, despachar] = useReducer(reduzir, undefined, () =>
    estadoInicial(calculoNovo(preferencias), ambiente.congelar()),
  );
  const resultado = useMemo(
    () => calcular(estado.calculo, estado.tabela),
    [estado.calculo, estado.tabela],
  );
  const agora = () => ambiente.agora();
  // o que falta na base para apurar as prestações lançadas: aviso no topo e campo em vermelho
  const faltas = faltasDaBase(estado.calculo);
  const [editorAberto, setEditorAberto] = useState(false);
  // Uma linha por lançamento, na ordem do cálculo (o motor devolve os calculados na mesma ordem).
  const linhas: LinhaDaTabela[] = estado.calculo.lancamentos.map((lancamento, i) => ({
    lancamento,
    calculado: resultado.lancamentos[i] as LancamentoCalculado,
  }));
  const excluir = (id: string) => despachar({ tipo: "excluirLancamento", id, em: agora() });
  const editar = (id: string, mudancas: MudancasDoLancamento) =>
    despachar({ tipo: "editarLancamento", id, mudancas, em: agora() });
  const incluir = (lancamento: Omit<Lancamento, "id" | "origem" | "editado">) =>
    despachar({ tipo: "incluirLancamento", lancamento, em: agora() });
  const valorDaBase = (data: string) => valorPelaBase(estado.calculo, estado.tabela, data);
  const [personalizando, setPersonalizando] = useState<Lancamento | null>(null);
  const personalizar = (id: string) =>
    setPersonalizando(estado.calculo.lancamentos.find((l) => l.id === id) ?? null);

  // Cada "Novo cálculo" ou "Abrir" remonta as duas colunas: os formulários, a linha nova e as
  // células em edição recomeçam (nada digitado para um cálculo vai parar no outro).
  const [aberturas, setAberturas] = useState(0);
  const novo = () => {
    despachar({ tipo: "novo", calculo: calculoNovo(preferencias), ...ambiente.congelar() });
    setAberturas(aberturas + 1);
  };

  // Salvar (§5.1): o arquivo leva o cálculo e o resultado, com o nome apura-<processo>-<data>.json.
  const salvar = () =>
    ambiente.baixar(
      nomeDoArquivo(estado.calculo),
      serializarArquivo(montarArquivo(estado.calculo, resultado)),
    );

  // Abrir (§5.1, §8.2): valida o arquivo, congela a tabela de hoje, recalcula e compara os
  // índices usados pelo cálculo salvo com os do recálculo.
  const [abrirAberto, setAbrirAberto] = useState(false);
  const [erroDeAbertura, setErroDeAbertura] = useState<string | null>(null);
  const [recentes, setRecentes] = useState<Recente[]>([]);
  const abrirTexto = (texto: string) => {
    const leitura = lerArquivo(texto);
    if (!leitura.ok) {
      setErroDeAbertura(leitura.erro);
      return;
    }
    const indices = ambiente.congelar();
    const recalculado = calcular(leitura.calculo, indices.tabela);
    const avisos = [
      ...leitura.avisos,
      ...(leitura.anterior === null
        ? []
        : compararIndicesUsados(leitura.anterior, {
            indicesUsados: recalculado.indicesUsados,
            consultadoEm: recalculado.consultaIndices.em,
          })),
    ];
    despachar({ tipo: "abrir", calculo: leitura.calculo, ...indices, avisos });
    setAberturas(aberturas + 1);
    setErroDeAbertura(null);
    setAbrirAberto(false);
  };

  // Recentes (§5.5): o cálculo é guardado a cada alteração (nunca o cálculo em branco).
  useEffect(() => {
    if (!preferencias.guardarRecentes || armazenamento === null || !estado.tocado) return;
    guardarRecente(armazenamento, estado.calculo, resultado);
  }, [armazenamento, estado.calculo, estado.tocado, preferencias.guardarRecentes, resultado]);

  const mudarPreferencias = (mudancas: Partial<Preferencias>) => {
    const novas = { ...preferencias, ...mudancas };
    setPreferencias(novas);
    gravarPreferencias(armazenamento, novas);
    if (mudancas.guardarRecentes === false) removerChave(armazenamento, CHAVE_RECENTES);
  };
  const mudarCabecalho = (campo: keyof typeof estado.calculo.cabecalho, valor: string) => {
    despachar({ tipo: "cabecalho", campo, valor, em: agora() });
    if ((campo === "defensor" || campo === "orgao") && preferencias.lembrar) {
      mudarPreferencias({ [campo]: valor });
    }
  };
  const esquecerTudo = () => {
    esquecer(armazenamento);
    const novas = { ...preferencias, defensor: "", orgao: "", lembrar: false };
    setPreferencias(novas);
    gravarPreferencias(armazenamento, novas);
  };

  return (
    <div className="app">
      <BarraSuperior
        aoNovo={novo}
        aoAbrir={() => {
          setErroDeAbertura(null);
          setRecentes(lerRecentes(armazenamento));
          setAbrirAberto(true);
        }}
        aoSalvar={salvar}
        tema={preferencias.tema}
        aoMudarTema={(tema) => mudarPreferencias({ tema })}
      />
      <main className="principal">
        <div className="coluna-esquerda" key={`esquerda-${estado.calculo.id}-${aberturas}`}>
          <Processo
            cabecalho={estado.calculo.cabecalho}
            aoMudar={mudarCabecalho}
            preferencias={preferencias}
            aoMudarPreferencias={mudarPreferencias}
            aoEsquecer={esquecerTudo}
            armazenamentoDisponivel={armazenamento !== null}
          />
          <BaseDosAlimentos
            base={estado.calculo.base}
            hoje={ambiente.hoje()}
            faltas={faltas}
            aoMudar={(base) => despachar({ tipo: "base", base, em: agora() })}
          />
          <LotePrestacoesSecao
            ultimoLote={estado.calculo.lotes.ultimoLotePrestacoes}
            avisos={estado.loteRecente === "prestacoes" ? estado.avisosDoLote : []}
            aoLancar={(lote) => despachar({ tipo: "lancarPrestacoes", lote, em: agora() })}
          />
          <LotePagamentosSecao
            ultimoLote={estado.calculo.lotes.ultimoLoteAmortizacoes}
            avisos={estado.loteRecente === "pagamentos" ? estado.avisosDoLote : []}
            aoLancar={(lote) => despachar({ tipo: "lancarPagamentos", lote, em: agora() })}
          />
          <Encargos
            calculo={estado.calculo}
            aoMudarAcrescimo={(campo, valor) =>
              despachar({ tipo: "acrescimos", campo, valor, em: agora() })
            }
            aoMudarDataElaboracao={(data) =>
              despachar({ tipo: "dataElaboracao", data, em: agora() })
            }
            aoMudarObservacoes={(texto) => despachar({ tipo: "observacoes", texto, em: agora() })}
            aoAjustar={() => setEditorAberto(true)}
          />
        </div>
        <div className="coluna-direita" key={`direita-${estado.calculo.id}-${aberturas}`}>
          <Indicadores totais={resultado.totais} dataElaboracao={estado.calculo.dataElaboracao} />
          <TabelaLancamentos
            tipo="prestacao"
            linhas={linhas.filter((l) => l.lancamento.tipo === "prestacao")}
            aoPersonalizar={personalizar}
            aoExcluir={excluir}
            aoEditar={editar}
            aoSugerir={() => sugerirPrestacao(estado.calculo, estado.tabela)}
            valorDaBase={valorDaBase}
            aoIncluir={incluir}
          />
          <TabelaLancamentos
            tipo="amortizacao"
            linhas={linhas.filter((l) => l.lancamento.tipo === "amortizacao")}
            aoPersonalizar={personalizar}
            aoExcluir={excluir}
            aoEditar={editar}
            aoSugerir={() => sugerirPagamento(estado.calculo)}
            valorDaBase={valorDaBase}
            aoIncluir={incluir}
          />
          <Avisos
            avisos={[
              ...faltas.map((f) => f.aviso),
              ...estado.situacao.avisos,
              ...estado.avisosDaAbertura,
              ...resultado.avisos,
            ]}
          />
        </div>
      </main>
      <Rodape situacaoDosIndices={estado.situacao.rodape} />
      <Dialogo
        titulo="Ajustar a metodologia de encargos"
        aberto={editorAberto}
        aoFechar={() => setEditorAberto(false)}
      >
        <EditorDePeriodos
          metodologia={estado.calculo.metodologia}
          aoMudar={(metodologia) => despachar({ tipo: "metodologia", metodologia, em: agora() })}
        />
        <div className="dialogo-acoes">
          <button type="button" className="botao" onClick={() => setEditorAberto(false)}>
            Fechar
          </button>
        </div>
      </Dialogo>
      <Dialogo titulo="Abrir cálculo" aberto={abrirAberto} aoFechar={() => setAbrirAberto(false)}>
        <Abrir
          recentes={recentes}
          recentesLigados={preferencias.guardarRecentes && armazenamento !== null}
          erro={erroDeAbertura}
          aoAbrirRecente={(recente) => abrirTexto(recente.texto)}
          aoRemoverRecente={(id) => setRecentes(removerRecente(armazenamento, id))}
          aoLimparRecentes={() => {
            limparRecentes(armazenamento);
            setRecentes([]);
          }}
          aoAbrirTexto={abrirTexto}
        />
        <div className="dialogo-acoes">
          <button type="button" className="botao secundario" onClick={() => setAbrirAberto(false)}>
            Cancelar
          </button>
        </div>
      </Dialogo>
      <Dialogo
        titulo={
          personalizando?.tipo === "amortizacao"
            ? "Personalizar pagamento"
            : "Personalizar prestação"
        }
        aberto={personalizando !== null}
        aoFechar={() => setPersonalizando(null)}
      >
        {personalizando !== null ? (
          <Personalizar
            lancamento={personalizando}
            calculo={estado.calculo}
            aoEditar={editar}
            aoAplicarRendimento={(id, rendimento) =>
              despachar({ tipo: "aplicarRendimentoDaquiEmDiante", id, rendimento, em: agora() })
            }
            aoFechar={() => setPersonalizando(null)}
          />
        ) : null}
      </Dialogo>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/ui/preferencias.test.ts src/ui/secoes/Processo.test.tsx`
Esperado: `14 passed (14)` (5 das preferências, 9 da seção e do botão).

- [ ] **Step 5: Verificação completa**

Run: `npm run format && npm run verificar`
Esperado: `788 passed | 9 skipped (797)` em 43 arquivos.

- [ ] **Step 6: Commit**

```bash
git add src/ui/preferencias.ts src/ui/preferencias.test.ts src/ui/BarraSuperior.tsx src/ui/App.tsx src/ui/secoes/Processo.test.tsx
git commit -m "ui: botão de tema (do sistema, claro, escuro) na barra, guardado nas preferências

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 14: Identidade visual da DPE-MS: logo na barra, fontes do manual e acabamento no estilo do relatório

Decisão do responsável de 13/10/2026 (D16): a tela ganha, já nesta fase, a identidade visual da Defensoria: o logo horizontal branco da DPE-MS na barra, as fontes do manual (Ubuntu nos títulos e números, Source Sans 3 no texto) embutidas no site, a faixa verde com a linha dourada embaixo e os indicadores no estilo do relatório de exemplo (faixa colorida no topo de cada cartão). A tarefa também corrige um defeito de CSS da Task 2: o botão "Relatório / PDF" usava a classe `principal`, a mesma da área principal da página, e herdava o layout dela (aparecia esticado e branco, e em tela estreita alargava a página).

**Files:**
- Modify: `package.json`, `package-lock.json` (duas dependências de fontes)
- Create: `public/logos/dpems-horizontal-branca.png` (gerado do logo do manual)
- Modify (reescrito): `src/main.tsx`, `src/ui/BarraSuperior.tsx`, `src/ui/estilos.css`
- Test (reescrito): `src/ui/App.test.tsx`

**Interfaces:**
- Consumes: `docs/identidade-visual/logos/branca-horizontal-01.png` (8334 × 8334 px, com margens transparentes); o botão de tema da Task 13; as variáveis de cor da Task 2 (`--ouro`, `--verde`, `--titulos`, `--corpo`).
- Produces: `<img class="logo" src="{BASE_URL}logos/dpems-horizontal-branca.png" width=368 height=88 alt="Defensoria Pública de Mato Grosso do Sul">` à esquerda da barra, separado do nome por um fio claro; o `h1` mantém o texto acessível "Apura · Sistema de Cálculos Judiciais · DPE-MS" (os separadores ficam ocultos na tela, e "Sistema de Cálculos Judiciais" vai para a linha de baixo); o botão "Relatório / PDF" passa à classe `relatorio` (desligado: contorno tracejado, sem fundo); botões da barra sem quebra de linha (`white-space: nowrap; flex: none`); anel de foco dourado sobre o verde; em tela estreita, logo de 34 px (a arrumação dos cartões é a do componente, D24).

- [ ] **Step 1: Escrever o teste** (`src/ui/App.test.tsx` reescrito: o primeiro teste passa a exigir o logo, com o texto alternativo, o endereço e as dimensões)

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App.tsx";
import { ambienteDeTeste } from "./testes/ambiente-de-teste.ts";

afterEach(cleanup);

describe("App (fundação da tela)", () => {
  it("mostra o nome do sistema, as quatro ações da barra e o rodapé com a situação dos índices", () => {
    render(<App ambiente={ambienteDeTeste()} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Apura · Sistema de Cálculos Judiciais · DPE-MS",
    );
    const logo = screen.getByRole("img", { name: "Defensoria Pública de Mato Grosso do Sul" });
    expect(logo.getAttribute("src")).toBe("/logos/dpems-horizontal-branca.png");
    expect([logo.getAttribute("width"), logo.getAttribute("height")]).toEqual(["368", "88"]);
    for (const nome of ["Novo cálculo", "Abrir", "Salvar"]) {
      expect(screen.getByRole("button", { name: nome })).toBeDefined();
    }
    const relatorio = screen.getByRole("button", { name: "Relatório / PDF" }) as HTMLButtonElement;
    expect(relatorio.disabled).toBe(true);
    const rodape = screen.getByRole("contentinfo").textContent ?? "";
    expect(rodape).toContain(
      "Índices oficiais BCB/SGS · IPCA até set/2026 · atualizados em 11/10/2026 09:00 (horário de Brasília)",
    );
    expect(rodape).toMatch(/Apura v\d+\.\d+\.\d+ · Defensoria Pública de Mato Grosso do Sul/);
    // com a tabela em dia, não há aviso do calendário
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).not.toContain(
      "ainda não chegou ao Apura",
    );
  });

  it("mostra na caixa de avisos os meses já divulgados que ainda não chegaram ao Apura", () => {
    render(<App ambiente={ambienteDeTeste({ limites: { "433": "2026-07" } })} />);
    const avisos = screen.getByRole("region", { name: "Avisos" });
    expect(avisos.textContent).toContain(
      "IPCA de ago/2026, divulgado por volta de 10/09/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 11/10/2026.",
    );
  });

  it("congela a tabela ao abrir e de novo em 'Novo cálculo'; o cálculo em branco mostra 'Nenhum lançamento.'", async () => {
    const ambiente = ambienteDeTeste();
    render(<App ambiente={ambiente} />);
    expect(ambiente.congelamentos()).toBe(1);
    expect(screen.getByRole("region", { name: "Avisos" }).textContent).toContain(
      "Nenhum lançamento.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Novo cálculo" }));
    expect(ambiente.congelamentos()).toBe(2);
  });

  it("'Ajustar' abre o editor de períodos num painel; a mudança reflete no resumo; Esc fecha", async () => {
    const user = userEvent.setup();
    render(<App ambiente={ambienteDeTeste()} />);
    await user.click(screen.getByRole("button", { name: "Ajustar" }));
    const painel = screen.getByRole("dialog", { name: "Ajustar a metodologia de encargos" });
    expect(painel).toBeDefined();
    await user.selectOptions(
      within(painel).getAllByLabelText("Índice de correção")[0] as HTMLElement,
      "INPC",
    );
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(/Até 29\/08\/2024/).textContent).toBe(
      "Até 29/08/2024: INPC e juros de 1% ao mês. Desde 30/08/2024: IPCA e taxa legal.",
    );
    expect(screen.getByText(/Metodologia de encargos/).textContent).toBe(
      "Metodologia de encargos (ajustada)",
    );
  });

  it("abre com a cópia publicada quando nenhum ambiente é injetado (sem rede)", () => {
    render(<App />);
    expect(screen.getByRole("contentinfo").textContent).toContain("Índices oficiais BCB/SGS");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/App.test.tsx`
Esperado: `1 failed | 4 passed (5)`: "mostra o nome do sistema, as quatro ações da barra e o rodapé com a situação dos índices", com `Unable to find an accessible element with the role "img" and name "Defensoria Pública de Mato Grosso do Sul"`.

- [ ] **Step 3: Instalar as fontes (precisa de internet)**

```bash
npm install --save-exact @fontsource/ubuntu@5.3.0 @fontsource/source-sans-3@5.3.0
```

Esperado: as duas linhas entram em `dependencies` do `package.json`, nas versões exatas; `found 0 vulnerabilities`.

- [ ] **Step 4: Gerar o logo otimizado** (com o `sips`, que vem com o macOS: recorta as margens transparentes do quadro de 8334 px e reduz para 88 px de altura, o dobro dos 44 px exibidos, para ficar nítido em telas de alta densidade)

```bash
mkdir -p public/logos
sips -c 1825 7641 --cropOffset 3254 344 docs/identidade-visual/logos/branca-horizontal-01.png --out "${TMPDIR:-/tmp}/apura-logo-recortado.png"
sips --resampleHeight 88 "${TMPDIR:-/tmp}/apura-logo-recortado.png" --out public/logos/dpems-horizontal-branca.png
sips -g pixelWidth -g pixelHeight public/logos/dpems-horizontal-branca.png
shasum -a 256 public/logos/dpems-horizontal-branca.png
```

Esperado: `pixelWidth: 368`, `pixelHeight: 88`, cerca de 31 KB, e a assinatura `64e8f8e09e9d818c28f4f8005027e652db2dcd2bd0dbeb924cf529cd7be87d81` (a medida no ensaio, em 13/10/2026; se a versão do macOS mudar, a assinatura pode mudar: basta conferir as dimensões e que o logo aparece inteiro, sem margem).

- [ ] **Step 5: Implementar**

`src/main.tsx` (reescrito; as quatro importações de fontes no topo):

```tsx
// Fontes do manual de identidade da DPE-MS (§10.2), embutidas no site (sem carregar do Google):
// Ubuntu para títulos e números de destaque; Source Sans 3 para o texto. Só o alfabeto latino.
import "@fontsource/source-sans-3/latin-400.css";
import "@fontsource/source-sans-3/latin-600.css";
import "@fontsource/ubuntu/latin-500.css";
import "@fontsource/ubuntu/latin-700.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./ui/App.tsx";

const raiz = document.getElementById("raiz");
if (raiz) {
  createRoot(raiz).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
```

`src/ui/BarraSuperior.tsx` (reescrito):

```tsx
import { TEMAS, type Tema } from "./preferencias.ts";

/** O tema seguinte na volta do botão: do sistema → claro → escuro → do sistema. */
export function proximoTema(tema: Tema): Tema {
  return TEMAS[(TEMAS.indexOf(tema) + 1) % TEMAS.length] ?? "sistema";
}

const NOME_DO_TEMA: Record<Tema, string> = {
  sistema: "do sistema",
  claro: "claro",
  escuro: "escuro",
};

/**
 * Barra superior (§9.1): logo da DPE-MS, nome do sistema, as quatro ações e o botão de tema, que alterna a cada
 * clique entre "do sistema", "claro" e "escuro" (decisão de 13/10/2026). "Relatório / PDF" chega
 * na fase 6.
 */
export function BarraSuperior({
  aoNovo,
  aoAbrir,
  aoSalvar,
  tema = "sistema",
  aoMudarTema,
}: {
  aoNovo?: () => void;
  aoAbrir?: () => void;
  aoSalvar?: () => void;
  tema?: Tema;
  aoMudarTema?: (tema: Tema) => void;
}) {
  return (
    <header className="barra">
      <div className="identidade">
        <img
          className="logo"
          src={`${import.meta.env.BASE_URL}logos/dpems-horizontal-branca.png`}
          width={368}
          height={88}
          alt="Defensoria Pública de Mato Grosso do Sul"
        />
        <h1 className="marca">
          Apura<span className="oculto-acessivel"> · </span>
          <small>
            Sistema de Cálculos Judiciais<span className="oculto-acessivel"> · DPE-MS</span>
          </small>
        </h1>
      </div>
      <nav className="acoes-principais" aria-label="Ações do cálculo">
        <button type="button" className="botao-barra" onClick={aoNovo}>
          Novo cálculo
        </button>
        <button type="button" className="botao-barra" onClick={aoAbrir}>
          Abrir
        </button>
        <button type="button" className="botao-barra" onClick={aoSalvar}>
          Salvar
        </button>
        <button
          type="button"
          className="botao-barra relatorio"
          disabled
          title="Em construção: o relatório em tela e PDF chega na fase 6 do MVP."
        >
          Relatório / PDF
        </button>
      </nav>
      <button
        type="button"
        className="botao-barra botao-tema"
        onClick={() => aoMudarTema?.(proximoTema(tema))}
        title={`Clique para mudar para o tema ${NOME_DO_TEMA[proximoTema(tema)]}`}
      >
        Tema {NOME_DO_TEMA[tema]}
      </button>
    </header>
  );
}
```

`src/ui/estilos.css` (reescrito, versão final da fase):

```css
/* Apura · estilos da tela (fase 5). Cores do manual de identidade da DPE-MS (§10.2 do design):
   verde #1D6B34, amarelo-ouro #D8BB73, preto #373636, cinza #868686, vermelho #ED1C24; fundo claro
   #F3F4F1 e tema escuro como no relatório de exemplo. Tema do sistema, claro ou escuro, pelo
   botão da barra (decisões de 12 e 13/10/2026; o padrão é o do sistema). Fontes Ubuntu
   (títulos e números) e Source Sans 3 (texto), embutidas pelo main.tsx. Barra no estilo da
   faixa do relatório: verde, logo horizontal branco da DPE-MS e linha dourada embaixo. */

:root {
  --verde: #1d6b34;
  --verde-claro: #1fa463;
  --ouro: #d8bb73;
  --vermelho: #c8101a;
  --fundo: #f3f4f1;
  --superficie: #ffffff;
  --texto: #373636;
  --discreto: #6e716c;
  --linha: #dcdfd9;
  --linha-alternada: #f7f8f5;
  --cabecalho-fundo: #1d6b34;
  --cabecalho-texto: #ffffff;
  --aviso-fundo: #fff8e1;
  --aviso-borda: #d8bb73;
  --foco: #1fa463;
  --titulos: "Ubuntu", "Segoe UI", system-ui, sans-serif;
  --corpo: "Source Sans 3", "Segoe UI", system-ui, sans-serif;
  color-scheme: light;
}

/* Tema escuro: pelo sistema (salvo se o usuário escolheu "claro") ou pela escolha "escuro" do
   seletor da barra, que o App grava em data-theme na raiz. As duas listas são iguais de propósito. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --verde: #3fa866;
    --verde-claro: #5cc385;
    --vermelho: #ff6b6b;
    --fundo: #0f1813;
    --superficie: #17221b;
    --texto: #e8ebe6;
    --discreto: #9ba69d;
    --linha: #2a3a2f;
    --linha-alternada: #1b2820;
    --cabecalho-fundo: #143f24;
    --cabecalho-texto: #ffffff;
    --aviso-fundo: #2a2410;
    --aviso-borda: #a88d4a;
    --foco: #5cc385;
    color-scheme: dark;
  }
}

:root[data-theme="dark"] {
  --verde: #3fa866;
  --verde-claro: #5cc385;
  --vermelho: #ff6b6b;
  --fundo: #0f1813;
  --superficie: #17221b;
  --texto: #e8ebe6;
  --discreto: #9ba69d;
  --linha: #2a3a2f;
  --linha-alternada: #1b2820;
  --cabecalho-fundo: #143f24;
  --cabecalho-texto: #ffffff;
  --aviso-fundo: #2a2410;
  --aviso-borda: #a88d4a;
  --foco: #5cc385;
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  background: var(--fundo);
  color: var(--texto);
  font-family: var(--corpo);
  font-size: 15px;
  line-height: 1.45;
}

h1,
h2,
h3 {
  font-family: var(--titulos);
  margin: 0;
}

button,
input,
select,
textarea {
  font: inherit;
  color: inherit;
}

:focus-visible {
  outline: 2px solid var(--foco);
  outline-offset: 2px;
}

.oculto-acessivel {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* ---- Estrutura: barra, duas colunas, rodapé ---- */

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.barra {
  background: var(--cabecalho-fundo);
  color: var(--cabecalho-texto);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 24px;
  padding: 14px 24px;
  /* linha dourada da faixa do relatório (§10.1) */
  border-bottom: 4px solid var(--ouro);
}

/* sobre o verde, o anel de foco é dourado (o verde-claro sumiria) */
.barra :focus-visible {
  outline-color: var(--ouro);
}

.identidade {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
  min-width: 0;
}

/* logo horizontal branco: 48 px de altura, com respiro (§10.2, área de proteção do manual) */
.logo {
  height: 48px;
  width: auto;
  flex: none;
}

.marca {
  display: flex;
  flex-direction: column;
  padding-left: 20px;
  border-left: 1px solid rgba(255, 255, 255, 0.35);
  font-family: var(--titulos);
  font-size: 24px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0.01em;
}

.marca small {
  font-family: var(--corpo);
  font-weight: 400;
  font-size: 13.5px;
  letter-spacing: 0.02em;
  opacity: 0.9;
}

.acoes-principais {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.botao-barra {
  background: transparent;
  color: var(--cabecalho-texto);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  white-space: nowrap;
  flex: none;
  transition: background-color 150ms ease-out;
}

.botao-barra:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
}

.botao-barra.relatorio {
  background: #fff;
  color: #1d6b34;
  border-color: #fff;
  font-weight: 600;
}

.botao-barra:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* "Relatório / PDF" desligado até a fase 6: contorno tracejado, sem o fundo branco de destaque */
.botao-barra.relatorio:disabled {
  background: transparent;
  color: var(--cabecalho-texto);
  border-color: rgba(255, 255, 255, 0.6);
  border-style: dashed;
  font-weight: 400;
}

.botao-tema {
  min-width: 10.5em;
}

.principal {
  flex: 1;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 16px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
  gap: 16px;
  align-items: start;
}

.coluna-esquerda,
.coluna-direita {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.rodape {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px 16px;
  padding: 8px 16px;
  font-size: 12.5px;
  color: var(--discreto);
  border-top: 1px solid var(--linha);
}

/* ---- Seções da esquerda e campos ---- */

.secao {
  background: var(--superficie);
  border: 1px solid var(--linha);
  border-radius: 8px;
  padding: 12px 14px;
}

.secao > h2,
.secao > .titulo-secao > h2 {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--verde);
  margin: 0 0 8px;
}

/* título da seção com o botão ⓘ da ajuda ao lado */
.titulo-secao {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.secao > .titulo-secao > h2 {
  margin: 0;
}

/* dois campos lado a lado, cada um com metade da largura (empilham no celular) */
.grade-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
  margin-bottom: 6px;
}

.grade-2 .campo input {
  width: 100%;
}

.linha {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: flex-end;
  margin-bottom: 6px;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.rotulo-do-campo,
.grupo > legend {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--discreto);
}

.campo input,
.campo select,
.campo textarea {
  background: var(--superficie);
  border: 1px solid var(--linha);
  border-radius: 4px;
  padding: 6px 8px;
  min-width: 0;
}

/* exemplos dentro dos campos: mais claros e em itálico, para não parecerem um valor digitado */
::placeholder {
  color: var(--discreto);
  opacity: 0.75;
  font-style: italic;
}

.campo input[aria-invalid="true"],
.campo select[aria-invalid="true"] {
  border-color: var(--vermelho);
}

.campo.largo {
  flex: 1 1 100%;
}

.campo.curto input {
  width: 6em;
}

.campo.medio input {
  width: 10em;
}

/* nº do processo no padrão do CNJ: 25 caracteres */
.campo.processo {
  margin-bottom: 6px;
}

.campo.processo input {
  width: 27ch;
  max-width: 100%;
  font-variant-numeric: tabular-nums;
}

.rotulo-do-campo {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* ---- Ajuda sob demanda (botão ⓘ e balão) ---- */

.ajuda-balao {
  position: relative;
  display: inline-flex;
}

.botao-ajuda {
  background: transparent;
  border: 0;
  border-radius: 50%;
  padding: 0 3px;
  cursor: pointer;
  color: var(--verde);
  font-family: var(--corpo);
  font-size: 15px;
  line-height: 1;
  text-transform: none;
  letter-spacing: 0;
}

.botao-ajuda[aria-expanded="true"] {
  color: var(--texto);
}

.balao {
  position: absolute;
  top: calc(100% + 6px);
  left: -10px;
  z-index: 5;
  width: max-content;
  max-width: 340px;
  background: var(--superficie);
  color: var(--texto);
  border: 1px solid var(--linha);
  border-top: 3px solid var(--verde);
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
  padding: 8px 10px;
  font-family: var(--corpo);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.4;
  text-transform: none;
  letter-spacing: normal;
  white-space: normal;
  text-align: left;
}

.grupo {
  border: 0;
  padding: 0;
  margin: 0 0 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
}

.grupo > legend {
  padding: 0;
  margin-bottom: 2px;
  width: 100%;
}

.grupo label {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.nota {
  font-size: 13px;
  color: var(--discreto);
  margin: 2px 0 6px;
}

.erro {
  font-size: 13px;
  color: var(--vermelho);
  margin: 0;
}

.botao {
  background: var(--verde);
  color: #fff;
  border: 1px solid var(--verde);
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
}

.botao.secundario {
  background: transparent;
  color: var(--verde);
}

.botao.discreto {
  background: transparent;
  color: var(--discreto);
  border-color: transparent;
  text-decoration: underline;
  padding: 2px 4px;
}

.botao:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ---- Lado direito: indicadores, tabelas, avisos ---- */

/* cinco cartões; quantos cabem por linha (5, 3, 2 ou 1, para ficar 5, 3 + 2, 2 + 2 + 1 ou um por
   linha) é o componente que decide, medindo o maior valor (decisão de 13/10/2026): o valor nunca
   quebra entre "R$" e o número */
.indicadores {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

/* indicadores no estilo do relatório (§10.1): faixa verde no topo; os de destaque, dourada,
   com o valor em verde */
.indicador {
  background: var(--superficie);
  border: 1px solid var(--linha);
  border-top: 4px solid var(--verde);
  border-radius: 4px;
  padding: 10px 12px;
  min-width: 0;
}

.indicador.destaque {
  border-top-color: var(--ouro);
}

.indicador.destaque dd {
  color: var(--verde);
}

.indicador dt {
  font-family: var(--titulos);
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--discreto);
  min-height: 2.4em;
}

.indicador dd {
  margin: 4px 0 0;
  font-family: var(--titulos);
  font-weight: 700;
  font-size: 18px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.tabela-rolagem {
  background: var(--superficie);
  border: 1px solid var(--linha);
  border-radius: 8px;
}

/* só a tabela rola na horizontal (o balão da ajuda do título não fica preso na rolagem);
   position: relative prende aqui os rótulos ocultos (posição absoluta) do cabeçalho, que senão
   alargariam a página inteira em telas estreitas */
.tabela-rolagem > .rolagem {
  position: relative;
  overflow-x: auto;
}

.tabela-rolagem > .titulo-secao {
  padding: 10px 12px 4px;
  margin: 0;
}

.tabela-rolagem > .titulo-secao > h2 {
  font-size: 14px;
  color: var(--verde);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}

th,
td {
  padding: 5px 6px;
  border-bottom: 1px solid var(--linha);
  text-align: right;
  white-space: nowrap;
  font-size: 13px;
}

th {
  font-family: var(--titulos);
  font-weight: 500;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: var(--cabecalho-fundo);
  color: var(--cabecalho-texto);
}

th:first-child,
td:first-child,
td.texto {
  text-align: left;
}

tfoot td {
  font-weight: 700;
  background: var(--linha-alternada);
  border-top: 2px solid var(--verde);
}

tr.memoria td {
  background: var(--linha-alternada);
  text-align: left;
  white-space: normal;
  font-size: 13px;
  padding: 8px 12px;
}

tr.memoria ul {
  margin: 4px 0 0;
  padding-left: 18px;
}

.botao-expandir {
  background: transparent;
  border: 0;
  padding: 0 6px 0 0;
  cursor: pointer;
  color: var(--verde);
}

/* vencimento e valor editáveis na própria célula: parecem texto, com contorno ao passar o mouse */
.celula-editavel {
  background: transparent;
  border: 1px dashed transparent;
  border-radius: 3px;
  padding: 1px 4px;
  margin: -2px -5px;
  cursor: text;
  font-variant-numeric: tabular-nums;
}

.celula-editavel:hover {
  border-color: var(--discreto);
  background: var(--linha-alternada);
}

/* em edição, o campo ocupa exatamente o lugar do texto (mesma caixa, letra e alinhamento; a
   largura vem do texto medido no clique): a tabela não se mexe. O erro aparece num balão logo
   abaixo, por cima da linha seguinte, sem empurrar nada. */
.celula-em-edicao {
  position: relative;
  display: inline-block;
}

.celula-em-edicao input {
  box-sizing: border-box;
  margin: -2px -5px;
  padding: 1px 4px;
  border: 1px solid var(--verde);
  border-radius: 3px;
  background: var(--superficie);
  font: inherit;
  line-height: inherit;
  text-align: inherit;
  font-variant-numeric: tabular-nums;
}

.celula-em-edicao input:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--foco);
}

.celula-em-edicao input[aria-invalid="true"] {
  border-color: var(--vermelho);
}

.celula-em-edicao .erro {
  position: absolute;
  top: calc(100% + 4px);
  right: -5px;
  z-index: 3;
  width: max-content;
  max-width: 18em;
  padding: 4px 8px;
  background: var(--superficie);
  border: 1px solid var(--vermelho);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  white-space: normal;
  text-align: left;
  font-size: 12px;
}

td:first-child .celula-em-edicao .erro {
  right: auto;
  left: -5px;
}

/* campos da linha nova ("+ Prestação", "+ Pagamento") */
.campo-linha-nova {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  vertical-align: middle;
}

.campo-linha-nova input {
  background: var(--superficie);
  border: 1px solid var(--verde);
  border-radius: 3px;
  padding: 2px 4px;
  width: 8.5em;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.campo-linha-nova input[type="date"] {
  width: auto;
  text-align: left;
}

.campo-linha-nova input[aria-invalid="true"] {
  border-color: var(--vermelho);
}

.campo-linha-nova .erro {
  max-width: 16em;
  white-space: normal;
  text-align: left;
  font-size: 12px;
}

/* a primeira coluna quebra a linha: descrição e etiquetas descem para baixo do vencimento
   quando falta espaço, sem empurrar os botões da linha para fora da tabela */
tbody td:first-child {
  white-space: normal;
  min-width: 8.5em;
}

td .descricao {
  margin-left: 6px;
  color: var(--discreto);
}

tr.linha-nova td {
  background: var(--linha-alternada);
  border-bottom-color: var(--verde);
}

td.dica {
  color: var(--discreto);
  font-size: 12px;
}

.etiqueta {
  display: inline-block;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 11px;
  margin: 1px 0 1px 4px;
  white-space: nowrap;
  background: var(--aviso-fundo);
  border: 1px solid var(--aviso-borda);
  color: var(--texto);
}

.acoes-linha {
  white-space: nowrap;
}

.botao-icone {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 2px 6px;
  cursor: pointer;
  color: var(--verde);
}

.botao-icone:hover {
  border-color: var(--linha);
}

/* ✕ armado: vermelho, esperando o segundo clique (mesmo tamanho; a linha não se mexe) */
.botao-icone.excluir.armado {
  background: var(--vermelho);
  border-color: var(--vermelho);
  color: var(--superficie);
  font-weight: 700;
}

.rodape-tabela {
  padding: 8px 12px;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.avisos {
  background: var(--aviso-fundo);
  border: 1px solid var(--aviso-borda);
  border-radius: 8px;
  padding: 10px 14px;
}

.avisos h2 {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 4px;
}

.avisos ul {
  margin: 0;
  padding-left: 18px;
}

.avisos li + li {
  margin-top: 4px;
}

/* ---- Diálogos (editor de períodos, personalizar, abrir) ---- */

.dialogo-fundo {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 10;
}

.dialogo {
  background: var(--superficie);
  color: var(--texto);
  border: 1px solid var(--linha);
  border-radius: 10px;
  width: min(760px, 100%);
  max-height: 90vh;
  overflow: auto;
  padding: 16px 18px;
}

.dialogo > h2 {
  font-size: 16px;
  color: var(--verde);
  margin-bottom: 10px;
}

.dialogo-acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 12px;
}

.lista-simples {
  list-style: none;
  padding: 0;
  margin: 0;
}

.lista-simples li {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--linha);
}

.periodo {
  border: 1px solid var(--linha);
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 8px;
}

.periodo > h3 {
  font-size: 13px;
  margin-bottom: 6px;
}

/* ---- Celular: campos lado a lado empilham; o balão da ajuda vira uma faixa no pé da tela ---- */

@media (max-width: 599px) {
  .grade-2 {
    grid-template-columns: minmax(0, 1fr);
  }

  .balao {
    position: fixed;
    top: auto;
    left: 16px;
    right: 16px;
    bottom: 16px;
    width: auto;
    max-width: none;
    z-index: 20;
  }
}

/* ---- Telas estreitas: as colunas empilham, com o resumo no topo (§9.1) ---- */

@media (max-width: 1023px) {
  .principal {
    grid-template-columns: minmax(0, 1fr);
  }

  .coluna-direita {
    display: contents;
  }

  .resumo {
    order: -1;
  }

  .identidade {
    flex-basis: 100%;
    gap: 14px;
  }

  .logo {
    height: 34px;
  }

  .marca {
    padding-left: 14px;
    font-size: 20px;
  }

  .barra {
    padding: 12px 16px;
  }
}

.rotulo-estatico {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--discreto);
}

.resumo-metodologia {
  margin: 2px 0 0;
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run src/ui/App.test.tsx`
Esperado: `5 passed (5)`.

- [ ] **Step 7: Verificação completa e build**

Run: `npm run format && npm run verificar && npm run build`
Esperado: `788 passed | 9 skipped (797)` em 43 arquivos; no build, quatro `.woff2` em `dist/assets/` (`source-sans-3-latin-400`, `source-sans-3-latin-600`, `ubuntu-latin-500`, `ubuntu-latin-700`) e `dist/logos/dpems-horizontal-branca.png`.

- [ ] **Step 8: Olhar no navegador**

Run: `npm run dev`. Esperado: barra verde com o logo da DPE-MS à esquerda, um fio claro, "Apura" em Ubuntu e "Sistema de Cálculos Judiciais" embaixo; linha dourada sob a barra; "Relatório / PDF" com contorno tracejado; indicadores com faixa verde no topo (total devido e total geral com faixa dourada e valor em verde); nenhuma rolagem lateral da página em 375 px. A conferência completa é a Task 15.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json public/logos/dpems-horizontal-branca.png src/main.tsx src/ui/BarraSuperior.tsx src/ui/estilos.css src/ui/App.test.tsx
git commit -m "ui: identidade visual (logo da DPE-MS na barra, fontes Ubuntu e Source Sans 3 embutidas, faixa com linha dourada, indicadores no estilo do relatório)

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 15: Conferência no navegador (duas colunas, celular, temas, teclado) e build

Não há código novo nesta tarefa: é a conferência manual da §9 que os testes de componente não fazem (layout, cores, rolagem, foco), com o que observar. Qualquer ajuste de CSS que ela exija entra em `src/ui/estilos.css`, com `npm run verificar` verde e commit próprio ("ui: …"); mudanças de comportamento não cabem aqui (voltam à tarefa dona, com teste).

**Files:**
- Nenhum arquivo novo. Possível ajuste: `src/ui/estilos.css`.

- [ ] **Step 1: Subir o app**

Run: `npm run dev` e abrir o endereço indicado (ou use o navegador integrado da sessão).

- [ ] **Step 2: Fluxo completo, em janela larga (≥ 1024 px)**

Preencher: "Nº do processo" digitando só os números `08000004620268120001` (a máscara mostra `0800000-46.2026.8.12.0001`; trocar um dígito verificador deixa o campo em vermelho); "Valor fixado" `1.000,00`; "Meses em atraso"; "Dia do vencimento" `5`; "Quantos meses" `3`; "Lançar em lote" (o intervalo de vencimentos, o padrão, pede o primeiro e o último vencimento como datas); "Valor por mês" `400,00`; "Primeiro pagamento" e "Último pagamento" com dois meses (ex.: `05/08/2026` e `05/09/2026`); "Lançar em lote"; antes de tudo, escolher "% do salário mínimo" sem preencher o percentual e lançar o lote de prestações mostra o aviso "Falta o percentual do salário mínimo…" no topo da caixa de avisos e o campo em vermelho, que somem ao digitar o percentual (depois, voltar a "Valor fixo em reais"). Esperado: barra com o logo da DPE-MS nítido (sem margem nem distorção), "Apura" em Ubuntu e a linha dourada embaixo; textos em Source Sans 3 (nas ferramentas do navegador, as fontes carregadas são Ubuntu 500 e 700 e Source Sans 3 400 e 600, sem pedido ao Google); duas colunas (dados à esquerda; indicadores, tabelas e avisos à direita); na seção 1, defensor e órgão lado a lado, cada um com metade da largura, e exequente e executado também; nenhum texto de ajuda fixo: um ⓘ ao lado dos títulos e de alguns campos abre o balão (clique fora fecha), e nenhum texto menciona o SAJ; três prestações (os três últimos vencimentos até hoje) e dois pagamentos com oito colunas, a primeira com o vencimento (sem competência) (rolagem horizontal própria da tabela se a coluna for estreita); indicadores coerentes com as linhas de totais; o ▸ da primeira prestação expande a memória (base, índices mês a mês com a fração, juros por mês e regime, avisos) e "▾" a esconde; clique no valor de uma prestação abre o campo na própria célula sem mexer em nada da tabela (mesma altura de linha, mesmas larguras de coluna; o vencimento abre como texto `05/09/2026`), `1.200,00` e Enter gravam e a linha ganha "valor informado" e "ajustada" (descrição e etiquetas descem para baixo do vencimento, sem empurrar o lápis e o ✕ para fora), e apagar o valor com Enter volta à base; "+ Prestação" acrescenta no fim da tabela uma linha com o vencimento do mês seguinte ao da última e o valor da base, e Enter a inclui; "+ Pagamento" sugere a data de hoje e o valor do último pagamento, e Esc descarta; o lápis abre "Personalizar prestação" com os dados da linha (sem campo de competência); o ✕ de uma prestação fica vermelho no primeiro clique, sem mexer na linha, volta ao normal com Esc, com um clique fora ou depois de 4 segundos, um clique duplo nele não exclui, e um segundo clique, com uma pausa, exclui; "Ajustar" abre o editor com os dois períodos da metodologia padrão; "Abrir" lista o cálculo atual nos recentes; "Salvar" baixa `apura-<processo>-<data>.json`; "Relatório / PDF" desligado, com a explicação ao passar o mouse.

- [ ] **Step 3: Janela estreita (celular, ~375 px) e tema escuro**

Reduzir a janela (ou emular um celular nas ferramentas do navegador) e clicar o botão "Tema" da barra até "Tema escuro" (depois, voltar a "Tema do sistema" e ativar o tema escuro do sistema, ou a emulação `prefers-color-scheme: dark`: o resultado deve ser o mesmo; e "claro" deve vencer o sistema escuro). Esperado: os cartões do resumo nunca separam "R$" do número: 5 numa linha quando cabem, senão 3 + 2, senão 2 + 2 + 1 (o caso do celular), senão um por linha (conferir alargando e estreitando a janela); coluna única com os cinco indicadores no topo, depois as seções 1 a 5, depois as tabelas (com rolagem horizontal) e os avisos; barra com o nome em cima e os botões embaixo; na seção 1, um campo por linha; um ⓘ aberto mostra o balão como uma faixa no pé da tela; cores do tema escuro (fundo `#0F1813`, cartões `#17221B`, verde `#3FA866`) com texto legível; o ✕ armado, vermelho, legível no tema escuro; nenhuma rolagem horizontal da página inteira.

- [ ] **Step 4: Só com o teclado**

Recarregar e usar apenas Tab, Shift+Tab, Enter, Espaço e Esc. Esperado: o foco percorre, na ordem, os botões da barra, os campos da seção 1 (inclusive a caixa "Lembrar" e "Esquecer"), as opções e campos das seções 2 a 5, os botões das tabelas e o rodapé, sempre com o anel de foco visível (verde); Enter em "Lançar em lote" lança; Enter em "Ajustar" abre o editor com o foco no primeiro seletor, Tab circula dentro do painel e Esc fecha, devolvendo o foco ao botão "Ajustar"; o mesmo no lápis ("Personalizar") e em "Abrir"; Enter no ✕ o deixa vermelho, Esc o desarma e Enter de novo exclui, com o foco indo para "+ Prestação"; Enter numa célula de vencimento ou valor abre o campo, Enter grava e devolve o foco à célula, Esc desiste; Enter em "+ Prestação" abre a linha nova com o foco no vencimento, Enter inclui, Esc descarta, e o foco volta a "+ Prestação"; Enter num ⓘ abre o balão e Esc o fecha (dentro de um painel, sem fechar o painel).

- [ ] **Step 5: Build**

Run: `npm run build`
Esperado: `✓ built`, com `dist/index.html`, um `.css` e um `.js` em `dist/assets/`.

- [ ] **Step 6: Registrar**

No relatório da tarefa, listar o que foi visto em cada passo e qualquer ajuste feito (com o commit).

---

### Task 16: Fechamento da fase: roteiro, CLAUDE.md, design, pendências e verificação final

**Files:**
- Modify: `docs/superpowers/roteiro.md`, `CLAUDE.md`, `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md`, `docs/superpowers/plans/2026-10-12-fase-5-interface.md` (seção "Pendências registradas na execução da fase 5")

- [ ] **Step 1: Roteiro**

Em `docs/superpowers/roteiro.md`, na tabela de fases, trocar a linha da fase 5

```md
| 5 · Interface | layout em duas colunas, seções, tabelas, personalização, recentes, preferências, salvar/abrir, temas | plano a escrever |
```

por (com a data do dia)

```md
| 5 · Interface | layout em duas colunas, seções, tabelas, personalização, recentes, preferências, salvar/abrir, temas | concluída em <AAAA-MM-DD> · plano: `docs/superpowers/plans/2026-10-12-fase-5-interface.md` |
```

e a situação da fase 6 de `pendente` para `plano a escrever`.

- [ ] **Step 2: CLAUDE.md**

(a) Substituir o parágrafo inteiro da seção `## Estado` por:

```md
Fase 5 (interface) concluída em <AAAA-MM-DD>: tela única em duas colunas em `src/ui/` (React),
que edita o `Calculo` por um redutor puro (`estado/calculo.ts`) e recalcula a cada alteração;
cinco seções à esquerda (processo, com o número no padrão do CNJ conferido pelos dígitos e defensor e
órgão lembrados no navegador; base dos alimentos
em três formas; prestações e pagamentos em lote, cumulativos; encargos, com o editor de metodologia
por períodos, multa, honorários, data de elaboração e observações); à direita, cinco indicadores,
tabelas de prestações e amortizações com memória por lançamento, vencimento e valor editáveis na
própria linha, "Personalizar" (lápis) para os ajustes finos, exclusão em dois cliques (o ✕ fica vermelho
no primeiro) e linha nova já sugerida (`estado/novaLinha.ts`), e a caixa de avisos (calendário dos índices,
abertura de arquivo e motor); explicações em balões ⓘ (`componentes/Ajuda.tsx`), sem menção a outros
sistemas; o vencimento é a referência de cada linha (a competência não aparece na tela);
"Salvar" e "Abrir" (`arquivo.ts` valida tudo o que vem do arquivo; recálculo com os índices de
hoje e `compararIndicesUsados`); cinco cálculos recentes e preferências só no `localStorage`
(`recentes.ts`, `preferencias.ts`, com "Esquecer"); tema do sistema, claro ou escuro pelo botão da
barra, guardado nas preferências; identidade visual da DPE-MS (logo em `public/logos/`, fontes Ubuntu
e Source Sans 3 pelos pacotes `@fontsource`, importadas no `main.tsx`); tudo o
que vem do navegador entra pelo `Ambiente` (`ambiente.ts`), trocado nos testes de componente
(Testing Library + jsdom, só nos arquivos marcados `// @vitest-environment jsdom`; o ambiente de
teste usa a tabela fixa de 2024–2026 dos testes do motor, nunca a cópia publicada). Motor:
percentuais de multa e honorários e taxa mensal inválidos valem zero, com aviso; o lote considera
ocupada a competência das prestações de lote e das avulsas sem descrição (13º e férias avulsos não a
ocupam), e os avisos do lote falam em mês de vencimento. "Relatório
/ PDF" está na barra, desligado, até a fase 6. Próxima: fase 6 (relatório e PDF), com plano a
escrever. A tabela de fases do roteiro é a referência; atualize-a e esta seção ao concluir cada
fase.
```

(b) No mapa de pastas, acrescentar, depois da linha de `docs/monitoramento/`, a linha `public/logos/             logo da DPE-MS reduzido para a barra da tela (gerado do PNG do manual)`, e trocar a linha

```
src/ui/                   interface (fase 5)
```

por

```
src/ui/                   App.tsx · BarraSuperior.tsx · Rodape.tsx · Abrir.tsx · ambiente.ts · entrada.ts · arquivo.ts · recentes.ts · preferencias.ts · armazenamento.ts · versao.ts · estilos.css · estado/ (calculo.ts · metodologia.ts · novaLinha.ts) · secoes/ · tabelas/ · componentes/ · testes/ (ambiente de teste)
```

(c) Na regra 4 ("Motor puro"), acrescentar ao fim: `Na interface, relógio, ids, armazenamento e download entram pelo \`Ambiente\` (\`src/ui/ambiente.ts\`), trocado nos testes de componente; nenhum teste depende dos últimos meses de \`dados/indices/\`.`

(d) Na regra 2 ("Decimal"), acrescentar ao fim: `A tela lê o que o usuário digita com \`src/ui/entrada.ts\` (vírgula nos centavos; ponto só de milhar; "1.5" é recusado) e só põe no \`Calculo\` texto decimal válido.`

- [ ] **Step 3: Design (notas de execução, sem reabrir decisões)**

Em `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md`:

(a) Ao fim da §5.5, acrescentar o parágrafo:

```md
**Decisões registradas em 12/10/2026 (fase 5).** Os recentes guardam o mesmo envelope do arquivo salvo (cálculo e resultado) e entram a partir da primeira edição (o cálculo em branco não); desligar "Guardar cálculos recentes" apaga os já guardados; "Esquecer" apaga nomes e recentes e desliga "Lembrar neste navegador"; as duas opções continuam gravadas mesmo desligadas; toda leitura e gravação é protegida (armazenamento ausente, bloqueado ou cheio não quebra a tela); as preferências incluem o tema da tela (do sistema, claro ou escuro), que "Esquecer" não apaga. "Novo cálculo" não pede confirmação: com os recentes ligados, o cálculo anterior fica em "Abrir"; com eles desligados, a ajuda da seção 1 avisa que convém salvar antes.
```

(b) Na §6.1, depois de "Competência já existente não é duplicada; o aviso diz quais foram puladas.", acrescentar: `Ocupam a competência as prestações de lote (mesmo que ganhem descrição depois) e as avulsas sem descrição: um 13º ou férias avulsos, com descrição, não impedem o lote de lançar a prestação do mês (decisão de 12/10/2026, fase 5). Na tela, a competência não aparece: o vencimento é a referência de cada linha, e os avisos do lote falam em mês de vencimento (decisão de 13/10/2026).`

(c) Na §6.4, ao fim do item "Regime antigo (`percentualMensal`, …)", acrescentar: `Taxa mensal com texto inválido deixa o trecho sem juros, com aviso (fase 5).`

(d) Na §6.6, acrescentar ao fim da lista o item: `- Percentual de multa ou de honorários com texto inválido ou negativo vale zero, com aviso (fase 5); a tela não deixa o inválido chegar ao motor.`

(e) Ao fim da §9.4, acrescentar:

```md
**Decisões registradas em 12 e 13/10/2026 (fase 5).** Ajuda: em vez de textos sempre visíveis, balões ⓘ ao lado dos títulos e dos campos, abertos sob demanda (clique, toque, Enter ou Espaço; Esc, novo clique ou clique fora fecham; no celular, uma faixa no pé da tela); sempre visíveis ficam só os erros, os avisos e os exemplos dentro dos campos (decisão de 13/10/2026). A tela não menciona outros sistemas (a metodologia padrão aparece como "padrão"). Nº do processo no padrão do CNJ, com máscara e conferência dos dígitos verificadores (vazio é aceito); com prestação lançada e o campo da base que a alimenta em branco, a caixa de avisos diz o que falta e onde, e o campo fica em vermelho; os exemplos dentro dos campos começam por "ex.:"; na seção 1, os campos ficam lado a lado, em duas colunas. Entrada de números: vírgula nos centavos, ponto só como separador de milhar, "1.5" recusado com a frase de ajuda; cada tecla válida recalcula e o inválido fica no campo, em vermelho, com o estado guardando o último valor válido; datas pelo campo de data do navegador, inclusive nos intervalos dos lotes. Painéis (editor de períodos, "Personalizar", "Abrir") são um componente próprio com papel `dialog` (o `<dialog>` nativo não existe no jsdom dos testes). O cálculo novo nasce em valor fixo, sem reajuste, fixado hoje, com o valor em branco e multa e honorários de 10% cada (decisão de 13/10/2026). Lotes de até 600 meses; o lote de prestações pede, por padrão, o primeiro e o último vencimento (datas), e o dia do vencimento só em "meses em atraso"; o lote de pagamentos pede o primeiro e o último pagamento (datas); os avisos do lote saem embaixo do formulário que o lançou. Linhas das tabelas com o vencimento como referência (a competência não aparece; por dentro, é o mês do vencimento), etiquetas "vincenda", "não computada", "valor informado" e "ajustada", e vencimento e valor editáveis na própria célula (Enter grava, Esc desiste; valor digitado vira "valor informado", apagado volta à base); o ✕ exclui em dois cliques, sem janela pop-up: no primeiro, ele fica vermelho, sem mexer na linha (decisão de 13/10/2026); editar na célula não muda a tabela (o campo tem o tamanho do texto, e a data é digitada como dd/mm/aaaa); dívida negativa sai como R$ 0,00 nos indicadores, cujos valores nunca quebram entre "R$" e o número, com os cartões em 5, 3 + 2, 2 + 2 + 1 ou um por linha. "+ Prestação" e "+ Pagamento" acrescentam uma linha nova no fim da tabela, já sugerida (prestação: vencimento no mês seguinte ao da última e o valor informado da última ou o da base; pagamento: data de hoje e o valor do anterior), que herda as regras próprias de correção e juros da última, mas não os termos; o lápis ("Personalizar") fica para os ajustes finos; em "% dos rendimentos" o painel traz o rendimento do mês e "Aplicar este rendimento daqui em diante". Termo final posterior à data de elaboração e termo inicial posterior ao final são recusados no painel. "SELIC única" é uma escolha só no editor (juros `selicUnica` e correção "nenhum"). Tema: em vez de só "conforme o sistema", um botão na barra que alterna "do sistema", "claro" e "escuro" a cada clique (padrão "do sistema"), guardado nas preferências; "claro" e "escuro" marcam `data-theme` na raiz, e a impressão continua sempre clara (fase 6). "Relatório / PDF" fica na barra, desligado, até a fase 6. Identidade visual na tela já nesta fase (decisão de 13/10/2026): logo horizontal branco da DPE-MS na barra (`public/logos/dpems-horizontal-branca.png`, gerado do PNG do manual), faixa verde com linha dourada e fontes Ubuntu e Source Sans 3 embutidas pelos pacotes `@fontsource` (no lugar de `.woff2` copiados para `public/fontes/`), sem carregar do Google. Na tela, o texto discreto usa o cinza `#6E716C` e o vermelho `#C8101A`, por contraste (o cinza e o vermelho do manual ficam para elementos não textuais); os campos de data mostram o formato do idioma do navegador. Arquivo salvo: `{ formato, calculo, resultado }`, nome `apura-<processo>-<data de elaboração>.json`, validado campo a campo ao abrir; o `resultado` é opcional (sem ele, abre com aviso e sem a comparação de índices).
```

(f) Na §11, trocar o item `- **Interface**: testes de componente (Testing Library) para lote cumulativo, edição e recálculo, recentes e preferências. Impressão: roteiro de conferência manual.` por:

```md
- **Interface**: testes de componente (Testing Library + jsdom, só nos arquivos marcados `// @vitest-environment jsdom`) para a fundação, processo e preferências, base, encargos e editor de períodos, lotes, tabelas e memória, personalizar, salvar e abrir; testes puros do redutor, da leitura de entrada, da edição da metodologia, do arquivo e dos recentes; todos sem rede, sem relógio real e sem a cópia publicada dos índices (ambiente de teste com a tabela fixa de 2024–2026). Layout, cores, rolagem e foco: conferência manual no navegador. Impressão: roteiro de conferência manual (fase 6).
```

(g) Na §12.2, trocar a linha `  src/ui/                   App.tsx · secoes/ · tabelas/ · estado/ · recentes.ts · preferencias.ts` por `  src/ui/                   App.tsx · BarraSuperior.tsx · Rodape.tsx · Abrir.tsx · ambiente.ts · entrada.ts · arquivo.ts · recentes.ts · preferencias.ts · armazenamento.ts · versao.ts · estilos.css · estado/ · secoes/ · tabelas/ · componentes/ · testes/`.

- [ ] **Step 4: Pendências deste plano**

Preencher a seção "Pendências registradas na execução da fase 5" (ao fim deste plano) com os achados das revisões que ficaram para fases seguintes ou como melhorias menores, e as decisões tomadas na execução (modelo que executou cada tarefa, contagens medidas, ajustes de CSS da Task 15), no formato das fases anteriores.

- [ ] **Step 5: Verificação final**

Run: `npm run format && npm run verificar && npm run build`
Esperado: tudo verde, `788 passed | 9 skipped (797)` em 43 arquivos (mais o que as revisões tiverem acrescentado), `dist/` gerado.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/roteiro.md CLAUDE.md docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md docs/superpowers/plans/2026-10-12-fase-5-interface.md
git commit -m "docs: fase 5 concluída no roteiro, no CLAUDE.md, no design e nas pendências do plano

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

A integração na `main` (merge local pela pasta principal, com commit de merge) fica para depois, com a decisão do responsável.

---

## Estado

Fase 5: plano escrito em 12/10/2026 e ajustado em 13/10/2026 (D16 a D29), ensaiado e reconstruído tarefa por tarefa; execução a começar depois da escolha do responsável (subagentes com revisor a cada tarefa, ou execução direta com revisão no fim).

## Notas para as fases seguintes (ganchos deixados por esta fase)

- **Fase 6 (relatório e PDF).** "Relatório / PDF" é o quarto botão de `src/ui/BarraSuperior.tsx` (hoje `disabled`, com `title`): a fase 6 lhe dá um `aoRelatorio` e um painel ou página com o componente do relatório, que lê só `estado.calculo` e `resultado` (o `App` já os tem; `ArquivoCalculo` em `tipos.ts` é o mesmo par). A versão para o rodapé do relatório é `VERSAO` (`src/ui/versao.ts`). As cores dos dois temas estão nas variáveis de `src/ui/estilos.css` (o tema escuro vale pelo sistema ou por `data-theme="dark"` na raiz, que o botão da barra grava); o relatório força o tema claro na impressão (`print-color-adjust: exact`, ignorando `data-theme`) e precisa de `@media print` escondendo a barra, as seções e os painéis. As fontes Ubuntu e Source Sans 3 já estão embutidas (pacotes `@fontsource`, importados no `src/main.tsx`), e o logo horizontal branco já está em `public/logos/dpems-horizontal-branca.png` (368 × 88 px): a faixa do relatório pode reaproveitá-lo; se a impressão pedir mais resolução, gerar outra versão do mesmo PNG do manual com o `sips`, como na Task 14. O resumo de uma frase da metodologia (`resumirMetodologia`, em `src/ui/estado/metodologia.ts`) é da tela, não o texto de "Metodologia e fundamentos" (§10.4), que a fase 6 gera do que foi aplicado. As descrições de memória por linha (`descreverIndice`, `descreverJuros` em `TabelaLancamentos.tsx`) podem servir de ponto de partida para a memória analítica do relatório. `situacao.rodape` é o rodapé da tela; o relatório imprime `resultado.consultaIndices.em` com `formatarDataHoraBrasilia`.
- **Fase 7 (publicação).** `package.json` passa a `0.1.0`: o rodapé da tela lê `VERSAO` de lá. O `testes.yml` roda `npm run verificar`, que agora inclui os testes de componente em jsdom: o `jsdom` 30 exige Node `^22.22.2 || ^24.15.0`, então `actions/setup-node` deve pedir uma versão que o satisfaça (o `engines` do `package.json` já exige `>=22.22.2` desde a Task 2; `node-version: 22`, como nos workflows existentes, resolve para a última 22.x, que satisfaz). As quatro dependências de teste seguem a regra de idade mínima de versões (14 dias).
- **Depois do MVP (visão, §4).** Novos tipos de cálculo entram como novas ações do redutor e novas seções; o `Ambiente` é o ponto para trocar `localStorage` por um servidor de guarda (os recentes e o arquivo já usam o envelope `ArquivoCalculo`); integrações preenchem `cabecalho` pela ação `cabecalho`.

### Pendências registradas na execução da fase 5

(A preencher na Task 16, Step 4, no formato das fases anteriores: achados das revisões por fase de destino, melhorias menores sem fase, decisões tomadas na execução.)

Já conhecidas ao escrever o plano:

- **Fase 6.** O relatório força o tema claro na impressão mesmo com `data-theme="dark"`. O relatório decide como mostrar a linha "ignorado" e os valores informados à mão (hoje etiquetas na tela); o CSS de impressão; o botão "Relatório / PDF" (classe `relatorio`).
- **Fase 7.** Versão `0.1.0` no `package.json`; `actions/setup-node` com um Node que satisfaça o `engines` (`>=22.22.2`, já ajustado na Task 2).
- **Sem fase (melhorias menores).** Recálculo a cada tecla sem adiamento (cerca de 90 ms com 180 lançamentos); sem confirmação em "Novo cálculo" e sem "desfazer" depois de uma exclusão confirmada; ao abrir pelo "Abrir" um cálculo com os mesmos ids das linhas que estavam com a memória aberta (por exemplo, o mesmo cálculo de novo), essas memórias continuam abertas; Tab numa célula em edição grava e leva o foco à célula seguinte sem abri-la (Enter abre); o foco do painel vai para o primeiro controle, sem preferir o campo mais relevante; `Opcao` (caixa ou rádio) tem o rótulo por envolvimento (`<label>` em volta), não por `for`; a tabela mostra "Valor" como a soma dos valores-base das linhas computadas, e o "Fator" dos pagamentos repete o das prestações do mesmo mês (correto, mas o SAJ não imprime fator de pagamento).

## Auto-revisão do plano

**Cobertura da fase 5 (§16 do design, item 5; §9; §5.1; §5.5; tabela do roteiro; ganchos e pendências das fases 1 a 4):**

| Item | Task |
|---|---|
| layout em duas colunas, barra com as quatro ações, rodapé com a situação dos índices e a versão (§9.1, §9.3) | 2 (estrutura e CSS), 14 (identidade visual), 15 (conferência) |
| congelamento ao abrir e em "Novo cálculo"; rodapé `situacao.rodape`; avisos `situacao.avisos` (fase 4) | 2 e 4 |
| seção 1 · Processo com "Lembrar neste navegador", "Esquecer", "Guardar cálculos recentes" (§9.2, §5.5) | 5 |
| seção 2 · Base: três formas, campos condicionais, mês de reajuste oculto com SM/nenhum, rendimento padrão exigido (fase 3) | 6 |
| seção 3 e 4 · lotes cumulativos pelo intervalo de datas, avisos do lote, limites antes do motor (fase 3) | 9 (redutor na 4) |
| seção 5 · metodologia com resumo e "Ajustar", multa e honorários, data de elaboração, observações | 7 |
| editor de períodos: dividir, remover, índice, juros, taxa, SELIC única como escolha só, avisos de `validarMetodologia`, incidência, deflação (§6.5; fases 2 e 3) | 7 (módulo) e 8 (painel) |
| indicadores; tabelas com memória, `situacao` e `editado` na linha, vencimento e valor editáveis na célula, linha nova sugerida em "+ Prestação" e "+ Pagamento", ✕ de dois cliques (decisões de 13/10/2026) (§9.3) | 10 |
| nº do processo no padrão do CNJ; seção 1 em duas colunas; ajuda em balões ⓘ; nenhuma menção ao SAJ; vencimento como referência de cada linha (decisões de 13/10/2026, D17 a D29) | 1, 2 (CSS), 3, 4, 5 a 12 |
| "Personalizar": valor, data, descrição, rendimento mês a mês, termos (termo final posterior recusado), metodologia própria (fases 2 e 3) | 11 |
| `Lancamento.editado` é da tela e não é sobrescrito ao relançar lote (fase 3) | 4 e 11 |
| salvar e abrir (§5.1): formato, validação do arquivo (formato, datas, decimais, séries), recálculo, `compararIndicesUsados` (fase 4) | 12 |
| cinco recentes, por data, processo e partes; "Remover", "Limpar recentes" (§5.5) | 12 |
| leitura do armazenamento sempre protegida (janela anônima) | 5 e 12 |
| percentuais de multa, honorários e taxa mensal inválidos (pendências das fases 2 e 3) | 1 e 7 |
| 13º avulso antes do lote (pendência da fase 3; decisão D1) | 1 |
| tema do sistema, claro ou escuro, pelo botão guardado nas preferências (decisões de 12 e 13/10/2026); telas estreitas com o resumo no topo; acessibilidade básica (§9.4) | 2 (CSS), 8 (painel), 13 (botão de tema), 15 |
| nenhum teste depende dos últimos meses de `dados/indices/` | 2 (ambiente de teste) |
| dependências novas justificadas, versões exatas | "Para o responsável" e 2 |
| roteiro, CLAUDE.md, design, pendências | 16 |

**Convenções da §12:** domínio em português (`reduzir`, `lerDecimal`, `montarArquivo`, `BaseDosAlimentos`), `Decimal` ou texto decimal para valores, datas ISO como texto, motor puro (as três mudanças só trocam `decimal` por `decimalOuNulo` e um filtro), `new Date()` só em `relogio.ts`, imports com `.ts`/`.tsx`, commits "módulo: o que muda". Verificadas tarefa a tarefa.

**Placeholders:** nenhum "TBD", "TODO" ou "implementar depois"; todo passo de código traz o código inteiro (arquivos novos e reescritos por inteiro; nos arquivos existentes, o trecho antigo e o novo). Os únicos espaços a preencher na execução são a data do dia (Task 16) e o nome do modelo na linha de coautoria.

**Consistência de nomes entre tarefas:** `Ambiente`, `ambientePadrao`, `ambienteDeTeste`, `armazenamentoEmMemoria`, `armazenamentoQueFalha`, `HOJE_DE_TESTE`, `AGORA_DE_TESTE`, `Avisos`, `BarraSuperior`, `Rodape`, `VERSAO` (2) usados em 4 a 12; `Leitura`, `lerDecimal`, `lerValorPositivo`, `lerPercentual`, `lerInteiro`, `lerCompetenciaTexto`, `lerData`, `lerNumeroProcesso`, `formatarNumeroProcesso`, `formatarCompetenciaParaCampo`, `formatarMoedaParaCampo`, `formatarNumeroParaCampo` (3) usados em 5 a 11; `Estado`, `Acao`, `MudancasDoLancamento`, `novoCalculo`, `estadoInicial`, `reduzir`, `estado.avisosDoLote`, `estado.loteRecente`, `estado.avisosDaAbertura`, `estado.tocado` (4) usados em 5 a 12; `CHAVE_PREFERENCIAS`, `CHAVE_RECENTES`, `lerJson`, `gravarJson`, `removerChave`, `Preferencias`, `lerPreferencias`, `gravarPreferencias`, `esquecer`, `Ajuda`, `CampoTexto`, `CampoArea`, `CampoSelecao`, `Opcao`, `useCampoValidado`, `Processo` (5) usados em 6 a 12; `BaseDosAlimentos` (6); `resumirMetodologia`, `dividirPeriodo`, `removerDivisao`, `escolherIndice`, `escolherJuros`, `escolherTaxa`, `escolherOpcoes`, `restaurarPadrao`, `descreverIntervalo`, `EscolhaDeJuros`, `Encargos` (7) usados em 8 e 11; `Dialogo`, `EditorDePeriodos` (8) usados em 11 e 12; `MAXIMO_DE_MESES`, `LotePrestacoesSecao`, `LotePagamentosSecao` (9); `RascunhoDeLancamento`, `sugerirPrestacao`, `sugerirPagamento`, `valorPelaBase`, `CelulaEditavel`, `Indicadores`, `TabelaLancamentos`, `LinhaDaTabela` (10) usados em 11 e 12; `Personalizar` (11) usado em 12; `ArquivoCalculo`, `montarArquivo`, `serializarArquivo`, `nomeDoArquivo`, `lerArquivo`, `LeituraDoArquivo`, `Recente`, `lerRecentes`, `guardarRecente`, `removerRecente`, `limparRecentes`, `Abrir` (12); `Tema`, `TEMAS`, `Preferencias.tema`, `proximoTema`, `BarraSuperior` com `tema` e `aoMudarTema` (13); classes `logo`, `identidade`, `relatorio` e o logo em `public/logos/` (14).

**Foco da revisão:** os cinco itens têm teste na tarefa dona (3 e 5: ponto decimal; 5 e 12: armazenamento ausente ou bloqueado; 12: arquivo adulterado; 4 e 11: relançar lote depois de editar; 11 e 1: termos impossíveis e 13º antes do lote).

**Ensaio:** a fase foi reconstruída tarefa por tarefa a partir da main (ver "Ensaio" em "Para o responsável"); contagens medidas ao fim de cada tarefa: 1 → 682 | 9 (691), 23 arquivos; 2 → 685 (694), 24; 3 → 698 (707), 25; 4 → 709 (718), 26; 5 → 725 (734), 30; 6 → 731 (740), 32; 7 → 741 (750), 34; 8 → 748 (757), 36; 9 → 752 (761), 37; 10 → 767 (776), 39; 11 → 773 (782), 40; 12 → 786 (795), 43; 13 → 788 (797), 43; 14 → 788 (797), 43; sempre com 9 pulados. Os passos "ver falhar" trazem as falhas medidas nessa reconstrução. O estado final da reconstrução é idêntico ao do ensaio, e `npm run build` passa.
