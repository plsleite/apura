# Apura

Sistema de Cálculos Judiciais da Defensoria Pública de Mato Grosso do Sul.

O Apura é um aplicativo web em que as regras de cálculo judicial ficam parametrizadas, para que
um usuário sem conhecimento jurídico aprofundado produza cálculos corretos e auditáveis em poucos
passos. O primeiro tipo de cálculo é a execução de alimentos (demonstrativo do art. 524 do CPC),
com índices oficiais do Banco Central e relatório na identidade visual da DPE-MS.

## Requisitos

- Node.js 22.18 ou mais recente e npm.

## Comandos

```bash
npm install            # instala as dependências
npm run dev            # abre o app em desenvolvimento
npm test               # roda os testes
npm run verificar      # formatação, lint, tipos e testes
npm run build          # gera o site estático em dist/
npm run indices:atualizar -- 189   # atualiza a cópia embutida de uma série do BCB
```

## Documentação

- Roteiro de fases: `docs/superpowers/roteiro.md`
- Design do MVP: `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md`
- Visão do produto: `docs/superpowers/specs/2026-10-10-apura-visao-do-produto.md`
- Instruções para o Claude Code: `CLAUDE.md`

Uso interno da Defensoria Pública de Mato Grosso do Sul.
