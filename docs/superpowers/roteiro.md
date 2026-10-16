# Apura · Roteiro de fases e guia de retomada

Este arquivo diz em que ponto o projeto está e como retomar o trabalho em qualquer sessão nova. Atualize a tabela ao concluir cada fase.

## Documentos de referência

- Design do MVP (fonte de verdade): `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md`
- Visão além do MVP: `docs/superpowers/specs/2026-10-10-apura-visao-do-produto.md`
- Briefing original: `docs/referencia/briefing-inicial.md`
- Planos de implementação: `docs/superpowers/plans/` (um por fase, nomeados `AAAA-MM-DD-fase-N-<tema>.md`)
- Instruções permanentes para o Claude Code: `CLAUDE.md` (criado na fase 1)

## Como cada fase funciona

1. Em sessão nova, enviar o prompt de retomada (abaixo) indicando a fase.
2. O Claude lê o design, a visão e o `CLAUDE.md`, e escreve o plano da fase com o fluxo writing-plans (tarefas pequenas, teste antes do código, comandos de verificação, commits).
3. O responsável revisa o plano e escolhe a forma de execução: por subagentes (um implementa, outro revisa, tarefa a tarefa) ou execução direta na sessão (revisão única no fim).
4. Execução com TDD; ao final, revisão de código e atualização desta tabela.

## Fases (seção 16 do design)

| Fase | Escopo | Situação |
|---|---|---|
| 1 · Fundação e motor do regime antigo | projeto Vite/React/TS, Vitest, ESLint/Prettier, CLAUDE.md, primitivas (decimal, datas, rateio), caso SAJ 2018 reproduzido, cópia embutida do IGP-M e script de índices | concluída em 2026-10-11 · plano: `docs/superpowers/plans/2026-10-10-fase-1-fundacao-e-motor-regime-antigo.md` |
| 2 · Regime novo e transição | taxa legal, IPCA, transição 30/08/2024, SELIC única capitalizada, deflação com piso, encargos próprios, multa e honorários; gabaritos do SAJ de 2026 e casos conferidos na Calculadora do Cidadão | concluída em 2026-10-11 · plano: `docs/superpowers/plans/2026-10-11-fase-2-regime-novo-e-transicao.md` |
| 3 · Bases e lotes | valor fixo com reajuste, % do salário mínimo, % dos rendimentos; lotes cumulativos de prestações e amortizações; casos-limite | concluída em 2026-10-11 · plano: `docs/superpowers/plans/2026-10-11-fase-3-bases-e-lotes.md` |
| 4 · Índices: rotina central e monitoramento | rotina central diária no repositório, congelamento por cálculo, calendário de divulgação, monitoramento gratuito | concluída em 2026-10-12 · plano: `docs/superpowers/plans/2026-10-12-fase-4-indices-rotina-central.md` |
| 5 · Interface | layout em duas colunas, seções, tabelas, personalização, recentes, preferências, salvar/abrir, temas | concluída em 2026-10-13 · plano: `docs/superpowers/plans/2026-10-12-fase-5-interface.md` |
| 5b · Ajustes da interface depois do uso | pagamento sugerido no mês seguinte, base dos alimentos por períodos, escolha da metodologia padrão de encargos (guardada no navegador), etiquetas das linhas numa linha só (§17 do design) | concluída em 2026-10-13 · plano: `docs/superpowers/plans/2026-10-13-fase-5b-ajustes-da-interface.md` |
| 6 · Relatório e PDF | componente, metodologia gerada, matriz de índices, marca, fontes, impressão; tela de erro de reserva, região viva e ajustes visuais (§18 do design) | concluída em 2026-10-13 · plano: `docs/superpowers/plans/2026-10-13-fase-6-relatorio-e-pdf.md` |
| 7 · Publicação | GitHub Actions, Cloudflare Pages, versão 0.1.0 para os testadores; rotina em etapas, conferência da publicação, monitoramento; acertos do relatório (§19 do design) | concluída em 2026-10-15 · plano: `docs/superpowers/plans/2026-10-14-fase-7-publicacao.md` · site: `https://apura-dpems.pages.dev` · repositório: `plsleite/apura` (privado) |
| 7b · Ajustes da tela | cabeçalho fixo, nova ordem das seções (parâmetros antes dos lançamentos), tabela sempre à vista (coluna da direita presa, com rolagem própria e cabeçalhos presos); versão 0.1.1 (§20 do design) | concluída em 2026-10-15 · plano: `docs/superpowers/plans/2026-10-15-fase-7b-ajustes-da-tela.md` |
| 0.1.2 · Destaque das linhas do lote | depois de "Lançar em lote", as linhas novas ganham um fundo verde-claro, parado 1 s e apagado em 3 s; ajuste direto, sem plano de fase (§20.5 do design) | concluída em 2026-10-15 |

Depois do MVP: ver a seção 6 da visão do produto (art. 524, servidor e usuários, cálculo livre, honorários, danos morais, integrações).

## Insumos que dependem do responsável

- Pontos de validação jurídica (seção 7 do design): cada fase pergunta os que lhe tocam.
- Gabaritos do SAJ Tribunais: obtidos em 11/10/2026 (IGP-M 2024–2026; SELIC capitalizada; base "valor informado" R$ 1.500,00 × 0,30 em 22 prestações, sem reajuste; INPC com base "salário mínimo do período" 0,30 e quatro pagamentos mensais; SELIC como indexador e como juros com aba Honorários a 10%, analisado sem virar caso porque conta a SELIC duas vezes). O SAJ não calcula a taxa legal nem o valor fixo com reajuste por índice: os gabaritos desses são a Calculadora do Cidadão do BCB e aritmética decimal independente. Opcional restante: lançamento datado no dia do cálculo.
- Publicação e rotina (feitas na fase 7, em 14–15/10/2026): repositório privado `plsleite/apura`; Cloudflare Pages `apura-dpems` com integração Git (pré-visualizações restritas, aviso de montagem com falha); Healthchecks.io "Apura · rotina de índices" (`0 7 * * 1-5`, America/Sao_Paulo, 1 dia) com o segredo `HC_URL`; alertas de segurança das dependências; guarda de 400 dias; actions exigidas por SHA; e-mail de workflow com falha. Primeira rodada manual em 15/10/2026 02:15: gravou a SELIC e o Cloudflare publicou sozinho (sem deploy hook). Teste na rede da Defensoria, impressão do relatório lá e "Salvar" no Safari: conferidos pelo responsável em 15/10/2026.
- Pendências com data:
  - **Agendador do GitHub:** as duas primeiras rodadas agendadas (15/10/2026) rodaram verdes, mas atrasadas: a das 10h47 começou às 14h54 e a das 14h17 às 17h20 (horário de Brasília), com 3 a 4 horas de atraso, como em vários relatos recentes de repositórios privados do plano gratuito; a chave `timezone` funciona (títulos "47 10 * * 1-5" e "17 14 * * 1-5") e o Healthchecks recebeu os dois sinais. Decisão do responsável (15/10/2026): não montar agora o disparo externo; acompanhar os atrasos nos relatórios mensais (revisões de um e três meses, abaixo) e agir só se crescerem ou se as rodadas passarem a faltar (§15 do design: outro agendador chamando o "Run workflow" pela API, com uma chave restrita ao `apura`). Efeito prático: um índice divulgado de manhã pode chegar ao site só à tarde.
  - **02/11/2026, depois das 12h17:** conferir o primeiro relatório mensal (`docs/monitoramento/2026-10.md`, commit "[CF-Pages-Skip] monitoramento: …", sem nova publicação).
  - **Depois de 19/10/2026:** a máquina padrão do GitHub passa ao Ubuntu 26; conferir a primeira rodada depois disso.
  - **Um e três meses depois da ligação:** revisar com o Claude os relatórios em `docs/monitoramento/` e decidir se muda horário ou agendador; na de um mês, ajustar duas notas do relatório mensal que a rotina em etapas desatualizou (estimativa de minutos por etapa; comparação com o alarme do Healthchecks nos dias de site atrasado).
  - **Antes de abril de 2027:** o Node 22 chega ao fim da vida útil; trocar pelo 24 (`.node-version`, `engines`, testes).

## Prompt de retomada (modelo)

```text
/superpowers:writing-plans Plano da fase N do Apura (<tema da fase>)

Contexto: projeto Apura, nesta pasta, repositório git na branch main. Leia por inteiro, nesta ordem: CLAUDE.md (se existir), docs/superpowers/roteiro.md, docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md e docs/superpowers/specs/2026-10-10-apura-visao-do-produto.md. Os planos das fases anteriores estão em docs/superpowers/plans/. Não reabra decisões já tomadas.

Quem fala com você: Defensor Público, coordenador de TI, sem formação em programação. Escreva tudo em português; explique escolhas técnicas em linguagem acessível, com prós e contras; prefira a solução mais simples que atenda; pergunte antes de decidir, uma pergunta por vez, em múltipla escolha com a opção recomendada marcada.

Tarefa desta sessão: escrever o plano da fase N conforme a seção 16 do design e a tabela do roteiro, em docs/superpowers/plans/, sem executar código. Ao terminar, peça minha revisão e pergunte como prefiro executar; a execução, com TDD, só começa depois da minha escolha. Ao concluir a fase, atualize a tabela do roteiro.
```
