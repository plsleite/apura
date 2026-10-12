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
| 4 · Índices ao vivo | cliente BCB, cache, congelamento por cálculo, calendário de divulgação, rotina mensal | plano a escrever |
| 5 · Interface | layout em duas colunas, seções, tabelas, personalização, recentes, preferências, salvar/abrir, temas | pendente |
| 6 · Relatório e PDF | componente, metodologia gerada, matriz de índices, marca, fontes, impressão | pendente |
| 7 · Publicação | GitHub Actions, Cloudflare Pages, versão 0.1.0 para os testadores | pendente |

Depois do MVP: ver a seção 6 da visão do produto (art. 524, servidor e usuários, cálculo livre, honorários, danos morais, integrações).

## Insumos que dependem do responsável

- Pontos de validação jurídica (seção 7 do design): cada fase pergunta os que lhe tocam.
- Gabaritos do SAJ Tribunais: obtidos em 11/10/2026 (IGP-M 2024–2026; SELIC capitalizada; base "valor informado" R$ 1.500,00 × 0,30 em 22 prestações, sem reajuste; INPC com base "salário mínimo do período" 0,30 e quatro pagamentos mensais; SELIC como indexador e como juros com aba Honorários a 10%, analisado sem virar caso porque conta a SELIC duas vezes). O SAJ não calcula a taxa legal nem o valor fixo com reajuste por índice: os gabaritos desses são a Calculadora do Cidadão do BCB e aritmética decimal independente. Opcional restante: lançamento datado no dia do cálculo.
- Criação do repositório privado no GitHub e da conta no Cloudflare Pages (fase 7, ou antes se os testadores precisarem).

## Prompt de retomada (modelo)

```text
/superpowers:writing-plans Plano da fase N do Apura (<tema da fase>)

Contexto: projeto Apura, nesta pasta, repositório git na branch main. Leia por inteiro, nesta ordem: CLAUDE.md (se existir), docs/superpowers/roteiro.md, docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md e docs/superpowers/specs/2026-10-10-apura-visao-do-produto.md. Os planos das fases anteriores estão em docs/superpowers/plans/. Não reabra decisões já tomadas.

Quem fala com você: Defensor Público, coordenador de TI, sem formação em programação. Escreva tudo em português; explique escolhas técnicas em linguagem acessível, com prós e contras; prefira a solução mais simples que atenda; pergunte antes de decidir, uma pergunta por vez, em múltipla escolha com a opção recomendada marcada.

Tarefa desta sessão: escrever o plano da fase N conforme a seção 16 do design e a tabela do roteiro, em docs/superpowers/plans/, sem executar código. Ao terminar, peça minha revisão e pergunte como prefiro executar; a execução, com TDD, só começa depois da minha escolha. Ao concluir a fase, atualize a tabela do roteiro.
```
