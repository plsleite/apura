# Apura · instruções para o Claude Code

## O que é

Apura — Sistema de Cálculos Judiciais da Defensoria Pública de Mato Grosso do Sul. O MVP calcula a
execução de alimentos (demonstrativo discriminado e atualizado do crédito, art. 524 do CPC) num
aplicativo que roda inteiro no navegador, sem servidor, publicado como site estático, com relatório
em HTML e PDF na identidade visual da DPE-MS.

Ao iniciar uma sessão de trabalho, leia, nesta ordem:

1. `docs/superpowers/roteiro.md` — fases, situação atual e como retomar.
2. `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md` — design do MVP, fonte de
   verdade (escopo, arquitetura, modelo de dados, regras do motor, índices, interface, relatório,
   testes, convenções). O Anexo A é o caso de referência do SAJ/TJMS de 2018.
3. `docs/superpowers/specs/2026-10-10-apura-visao-do-produto.md` — visão além do MVP; nenhuma
   decisão técnica pode inviabilizá-la.
4. O plano da fase em andamento, em `docs/superpowers/plans/`.

Quem executa uma tarefa já especificada num brief (por exemplo, um subagente de execução de plano)
segue o brief e consulta esses documentos só no ponto que o brief indicar.

Não reabra decisões já tomadas nesses documentos. Quem fala com você é um Defensor Público,
coordenador de TI, sem formação em programação: escreva em português, explique escolhas técnicas em
linguagem acessível com prós e contras, prefira a solução mais simples que atenda e pergunte antes
de decidir, uma pergunta por vez, em múltipla escolha com a opção recomendada marcada.

## Estado

Fase 1 (fundação e motor do regime antigo) concluída em 2026-10-11: projeto, primitivas, motor do
regime antigo reproduzindo o caso SAJ 2018 e cópia embutida do IGP-M. Próxima: fase 2 (regime novo
e transição), com plano a escrever. A tabela de fases do roteiro é a referência; atualize-a e esta
seção ao concluir cada fase.

## Comandos

| Comando | O que faz |
|---|---|
| `npm install` | instala as dependências (versões exatas; `package-lock.json` é commitado) |
| `npm run dev` | abre o app em desenvolvimento |
| `npm test` | roda todos os testes uma vez |
| `npm run test:watch` | roda os testes continuamente enquanto edita |
| `npm run lint` | ESLint |
| `npm run tipos` | verificação de tipos (`tsc -b`) |
| `npm run format` | formata o código com Prettier (`format:check` só confere) |
| `npm run verificar` | Prettier (conferência) + ESLint + tipos + testes; deve passar antes de cada commit |
| `npm run build` | gera o site estático em `dist/` |
| `npm run indices:atualizar` | baixa as séries do BCB para `dados/indices/`; `-- 189 433` limita às séries indicadas |

## Mapa de pastas

```
dados/indices/            cópia embutida das séries do BCB (JSON gerado pelo script)
docs/identidade-visual/   manual e logos da DPE-MS
docs/referencia/          briefing original, relatório de exemplo
docs/superpowers/specs/   design e visão
docs/superpowers/plans/   planos de implementação (um por fase)
scripts/                  atualizar-indices.ts
src/compartilhado/        decimal.ts · datas.ts · formatacao.ts · tipos.ts
src/motor/                periodos.ts · correcao.ts · juros.ts · calcular.ts · casos/ (casos de referência)
src/indices/              series.ts · cliente-bcb.ts · embutidos.ts (cache, congelamento e calendário: fase 4)
src/metodologias/         tjms-saj.v1.json · padrao.ts
src/ui/                   interface (fase 5)
src/relatorio/            relatório e impressão (fase 6)
```

## Regras obrigatórias

1. **TDD.** Toda regra nasce com um teste que falha e um exemplo numérico; só então o código.
   O motor é testado sem interface e sem rede.
2. **Decimal.** Dinheiro, percentuais, índices e fatores são `Decimal`, importado somente de
   `src/compartilhado/decimal.ts` (que o importa de `decimal.js` com importação nomeada,
   `import { Decimal } from "decimal.js"`: a importação padrão quebra a checagem de tipos do script
   de índices); nunca `number`. Nos arquivos e no `Resultado`, texto decimal com ponto
   (`"451.91"`). Arredondamento comercial (meio para cima): fator e percentual com 6 casas, valores
   com 2, e o fator e o percentual são arredondados antes de multiplicar.
3. **Datas como texto ISO** (`"AAAA-MM-DD"`, competências `"AAAA-MM"`), com os utilitários de
   `src/compartilhado/datas.ts`. Nada de `Date` no motor.
4. **Motor puro.** `src/motor/` não usa `Date.now()`, `fetch`, DOM ou armazenamento; recebe o
   `Calculo` e a `TabelaIndices` e devolve o `Resultado`. Nunca lança erro por dado do usuário:
   devolve avisos em frases completas.
5. **Português no domínio** (`prestacao`, `amortizacao`, `fatorCorrecao`, `metodologia`);
   infraestrutura técnica com os nomes usuais em inglês. Commits e documentação em português,
   mensagens no formato "módulo: o que muda".
6. **Nenhum índice inventado.** Só séries do BCB/SGS; cada valor carrega série, competência, fonte e
   data de obtenção.
7. **Relatório sem parâmetros de sistema.** O texto de metodologia descreve o que foi aplicado,
   nunca nomes de perfis, versões ou "personalização".
8. **Imports relativos com a extensão `.ts`** e `import type` para tipos (o script de índices roda
   no Node sem compilação e precisa disso).
9. **Dados pessoais.** Nenhum número de processo real nem nome de parte em testes, casos de
   referência ou documentação.

## Pontos de validação jurídica

A seção 7 do design lista as convenções que ainda dependem de confirmação jurídica ou de gabaritos
da contadoria. Não as "resolva" sozinho: implemente o padrão decidido no design e pergunte ao
responsável quando a fase tocar em uma delas.

## Como registrar um caso de referência

Um caso é um arquivo JSON em `src/motor/casos/AAAA-MM-DD-<origem>-<tema>.json` no formato
`apura/caso-de-referencia@1` (tipo `CasoDeReferencia` em `src/compartilhado/tipos.ts`), com:

- `nome` e `fonte` (de onde vieram os valores: relatório do SAJ, Calculadora do Cidadão, contadoria);
- `calculo`: o `Calculo` completo de entrada;
- `indices`: a `TabelaIndices` congelada **como estava na data do cálculo** (só os meses que a
  fonte usou; incluir um mês posterior muda o resultado);
- `esperado`: por lançamento, `corrigido`, `jurosValor` e `atualizado` (e, quando a fonte os der,
  `fator` e `jurosPercentual`); e os `totais`.

O teste `src/motor/casos.test.ts` executa todos os arquivos da pasta automaticamente. O PDF ou a
planilha de origem ficam fora do repositório; o número do processo é omitido.
