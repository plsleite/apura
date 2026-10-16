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

Fase 5 (interface) concluída em 2026-10-13: tela única em duas colunas em `src/ui/` (React),
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
ocupam), e os avisos do lote falam em mês de vencimento. Rodada de correções antes da integração
(13/10/2026): os recentes guardam só o cálculo e os índices usados (JSON compacto), com aviso no
"Abrir" quando não dá para guardar; o erro de formato de um campo aparece ao sair dele, não enquanto
se digita; datas de 1900 a 2199 na tela e no arquivo. Fase 5b (ajustes depois do uso, §17 do
design) concluída em 2026-10-13: "+ Pagamento" sugere o mês seguinte ao do último pagamento; a base
dos alimentos é uma lista de períodos (`base: { periodos: [{ de, ate, forma }] }`, o primeiro sem
começo e o último sem fim), cada prestação apurada pelo período do vencimento (`apurarPelaBase`),
editada na seção 2 com "Dividir em" e "Remover divisão" (`estado/base.ts`), e "Aplicar este
rendimento daqui em diante" divide a base; sem retrocompatibilidade de arquivos (a base antiga é
recusada na abertura); a metodologia de encargos se escolhe entre "Lei 14.905/2024"
(`lei-14905-2024.v1.json`, a padrão) e "IGP-M e juros de 1% ao mês" (`igpm-juros-1.v1.json`),
reconhecidas pelo conteúdo, e a escolha fica nas preferências (sobrevive a "Esquecer"; "Restaurar"
volta a ela); as linhas das tabelas ficam numa linha só, com a etiqueta mais importante e "+N", e a
descrição, que encolhe até caber, abre com a etiqueta um balão flutuante (`tabelas/etiquetas.ts`)
(861 testes passando e 10 pulados). Fase 6 (relatório e PDF, §18 do design) concluída em
2026-10-13: "Relatório / PDF" troca as colunas (que ficam montadas, escondidas) pelo relatório em
`src/relatorio/`, que lê só o `Calculo` e o `Resultado`: módulos puros montam "Metodologia e
fundamentos" a partir do que o motor de fato aplicou (`metodologia.ts`: só os períodos que a correção
ou os juros alcançaram; os textos aprovados da §18.5 nos testes, literalmente), as linhas com as
palavras "vincenda", "valor informado", "encargos próprios" (só o que difere da metodologia do
cálculo) e "não computado" e as notas abaixo da tabela, os totais, os indicadores, o cabeçalho e o
rodapé (`tabelas.ts`), a matriz de índices (`matriz.ts`) e o motivo do botão desligado
(`bloqueio.ts`: lançamento sem valor bloqueia; pagamento posterior à data do cálculo, não);
`Relatorio.tsx` desenha, e `relatorio.css` acompanha o tema na tela e força o claro na impressão
(A4, cabeçalho repetido, totais como última linha do corpo, não `tfoot`); o motor devolve os
reajustes do valor fixo estruturados (`LancamentoCalculado.reajustes`), sem mudar números; a
impressão (`imprimir`) e a recarga (`recarregar`) entram pelo `Ambiente`; tela de erro de reserva
(`componentes/Reserva.tsx`, `TelaDeErro.tsx`), região viva (`componentes/Anuncios.tsx`, fora das
colunas) e lápis/✕ presos à direita das tabelas; a raiz do relatório tem a classe `demonstrativo`
(a `relatorio` é do botão da barra) (939 testes passando e 10 pulados).
Fase 7 (publicação, §19 do design) concluída em 2026-10-15: o Apura 0.1.0 está em
`https://apura-dpems.pages.dev` (Cloudflare Pages com integração Git; aberto a quem tiver o endereço,
sem indexação; pré-visualizações de branch restritas ao responsável), a partir do repositório privado
`plsleite/apura`; a montagem no Cloudflare roda `npm run verificar && npm run build` com o Node do
`.node-version`, e o `public/_headers` manda os cabeçalhos de segurança (política de conteúdo: o app
só carrega o que vem do próprio site; por isso o script do tema fica em `public/tema.js`, e nada de
script embutido no `index.html`); `testes.yml` roda a cada envio; a rotina de índices roda em três
etapas (baixar e conferir, sem escrita; gravar, numa máquina limpa sem pacotes; fechar) e confere a
cada rodada se o site tem os índices da `main` (`versao.json`, `src/indices/publicacao.ts`);
avisos por e-mail do GitHub, do Healthchecks.io e do Cloudflare (§19.5); as frases do relatório da
§19.7, o salário mínimo usado no lugar do que faltou (`salarioMinimoAnterior`) e o "Salvar" no
Safari (1002 testes passando e 10 pulados). Pendências com data no roteiro (o agendador do GitHub
dispara as rodadas com 3 a 4 horas de atraso; acompanhado nos relatórios mensais).
Fase 7b (ajustes da tela, §20 do design) concluída em 2026-10-15: a barra superior fica presa no
topo, mais baixa (64 px, `--barra-altura`), com `scroll-padding-top` na raiz para o campo em foco
nunca ficar sob ela; as seções da esquerda na ordem processo, base, encargos e data do cálculo,
prestações, pagamentos; em telas a partir de 1024×600 px a coluna da direita fica presa abaixo da
barra, com os indicadores parados no topo e uma área rolável (`.coluna-rolavel`, região "Tabelas e
avisos", focável) com as duas tabelas e os avisos, o título e a linha de títulos de cada tabela
presos (`--titulo-da-tabela`, `--cabecalhos-da-tabela`), `overscroll-behavior: contain`, a tabela
que não cabe marcada `transborda` (rola de lado sozinha, com a linha de títulos no topo dela,
`top: auto`; a que cabe deixa o cabeçalho preso) e, depois de "Lançar em lote", a rolagem só da
área até a primeira linha nova (`idsDoLote` no estado; nunca `scrollIntoView`, que rolaria a
página); fora dessas telas a área é dissolvida (`display: contents`, regra base) e tudo fica como
antes; os balões ⓘ dos títulos das tabelas flutuam; `scripts/estilos.test.ts` lê a folha de
estilos e prende essas declarações (o jsdom não calcula leiaute; o efeito é conferido no
navegador). Versão 0.1.1 (1015 testes passando e 10 pulados).
Versão 0.1.2 (ajuste direto, §20.5 do design, 15/10/2026): depois de "Lançar em lote", as linhas
novas (`idsDoLote`) ganham a classe `recem-lancada`, com fundo `--destaque-do-lote` (verde-claro;
verde escuro discreto no tema escuro) parado 1 s e apagado em 3 s (`animation-fill-mode: both`;
a célula presa do lápis e do ✕ termina na cor da superfície; com `prefers-reduced-motion`,
`step-end`); a `TabelaLancamentos` tira a classe no `animationend` da própria linha, para nada
refazer o destaque, e a esquece quando a linha sai da tabela (1022 testes passando e 10
pulados). Próxima: a definir com os
testadores (ver a §6 da visão do produto). A tabela de fases do roteiro é a referência; atualize-a e esta seção ao
concluir cada fase.

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
| `npm run indices:atualizar` | baixa as séries do BCB para `dados/indices/` (é o que a rotina diária roda); grava série por série só o que mudou; `-- 189 433` limita às séries indicadas |
| `npm run indices:relatorio -- AAAA-MM <execucoes.json>` | monta o relatório mensal da rotina de um mês já encerrado (o script não recusa o mês corrente, o workflow sim) em `docs/monitoramento/` (é o que o workflow mensal roda) |
| `SITE_URL=https://apura-dpems.pages.dev npm run indices:conferir-publicacao` | confere se o site publicado tem os índices de `dados/indices/` (é o primeiro passo de cada rodada da rotina) |
| `actionlint .github/workflows/*.yml` | confere a sintaxe dos workflows (Homebrew); rode sempre que um workflow mudar, junto com `scripts/workflows.test.ts` |

A `main` do GitHub (`plsleite/apura`) recebe commits do robô quase todo dia útil (`dados/indices/`)
e, no dia 2 de cada mês, o relatório da rotina (`docs/monitoramento/`): traga essas atualizações
para a `main` local antes de integrar uma branch, e não rode `npm run indices:atualizar` em
branches de trabalho.

## Mapa de pastas

```
.github/workflows/        testes.yml (a cada envio) · atualizar-indices.yml (rotina de índices, seg–sex, em etapas) · relatorio-indices.yml (relatório mensal)
dados/indices/            cópia embutida das séries do BCB (JSON gerado pelo script)
docs/identidade-visual/   manual e logos da DPE-MS
docs/referencia/          briefing original, relatório de exemplo
docs/superpowers/specs/   design e visão
docs/superpowers/plans/   planos de implementação (um por fase)
docs/monitoramento/       relatórios mensais da rotina de índices (gerados pelo workflow)
public/                   _headers (cabeçalhos do site no Cloudflare) · tema.js (tema lembrado, antes do app) · logos/ (da barra da tela e da faixa do relatório)
scripts/                  atualizar-indices.ts · relatorio-indices.ts · conferir-publicacao.ts · testes que leem o repositório (versao, site, workflows, estilos, relatorio-indices)
src/compartilhado/        decimal.ts · datas.ts · formatacao.ts · tipos.ts · divulgacao.ts
src/motor/                periodos.ts · correcao.ts · juros.ts · lote.ts · base.ts · calcular.ts · casos/ (casos de referência)
src/motor/testes/         dados de teste: IGP-M e salário mínimo de 2017–2018 e as seis séries de 2024–2026 usadas pelos testes unitários
src/indices/              series.ts · cliente-bcb.ts · arquivo-serie.ts · embutidos.ts · calendario.ts · relogio.ts · congelar.ts · atualizacao.ts · relatorio.ts · publicacao.ts
src/indices/testes/       respostas reais do SGS gravadas em 10 e 11/10/2026 e execuções sintéticas da rotina
src/metodologias/         lei-14905-2024.v1.json · igpm-juros-1.v1.json · padrao.ts
src/ui/                   App.tsx · BarraSuperior.tsx · Rodape.tsx · Abrir.tsx · TelaDeErro.tsx · ambiente.ts · entrada.ts · arquivo.ts · recentes.ts · preferencias.ts · armazenamento.ts · versao.ts · estilos.css · estado/ (calculo.ts · base.ts · faltas.ts · metodologia.ts · novaLinha.ts) · secoes/ · tabelas/ · componentes/ · testes/ (ambiente de teste)
src/relatorio/            texto.ts · metodologia.ts · tabelas.ts · matriz.ts · bloqueio.ts · Relatorio.tsx · relatorio.css · testes/ (cálculos de exemplo)
```

## Regras obrigatórias

1. **TDD.** Toda regra nasce com um teste que falha e um exemplo numérico; só então o código.
   O motor é testado sem interface e sem rede.
2. **Decimal.** Dinheiro, percentuais, índices e fatores são `Decimal`, importado somente de
   `src/compartilhado/decimal.ts` (que o importa de `decimal.js` com importação nomeada,
   `import { Decimal } from "decimal.js"`: a importação padrão quebra a checagem de tipos do script
   de índices); nunca `number`. Nos arquivos e no `Resultado`, texto decimal com ponto
   (`"451.91"`). Arredondamento comercial (meio para cima) nos valores (2 casas); o fator e o
   percentual de juros multiplicam com precisão integral e são impressos com 6 casas (convenção do
   SAJ, decidida em 11/10/2026). Os juros incidem sobre o corrigido sem arredondar:
   `jurosValor = arred2(valorBase × fator × percentual ÷ 100)` (fase 3).
   A tela lê o que o usuário digita com `src/ui/entrada.ts` (vírgula nos centavos; ponto só de milhar;
   "1.5" é recusado) e só põe no `Calculo` texto decimal válido.
3. **Datas como texto ISO** (`"AAAA-MM-DD"`, competências `"AAAA-MM"`), com os utilitários de
   `src/compartilhado/datas.ts`. Nada de `Date` no motor.
4. **Motor puro.** `src/motor/` não usa `Date.now()`, `fetch`, DOM ou armazenamento; recebe o
   `Calculo` e a `TabelaIndices` e devolve o `Resultado`. Nunca lança erro por dado do usuário:
   devolve avisos em frases completas. O app também não acessa a rede: lê só a cópia publicada dos
   índices. Em `src/indices/`, a rede e o relógio entram por parâmetro com valor padrão (`fetch`,
   `agora` e `dormir` na rotina; `hoje` no congelamento), o disco da rotina entra como objeto
   passado pelo script, e o relatório mensal é puro (recebe o mês, as execuções e o texto do
   `git log` já lidos), para que nenhum teste use a rede; disco, git e argumentos ficam nos scripts
   de `scripts/`, os únicos com os tipos do Node; `new Date()` só em `src/indices/relogio.ts`.
   Na interface, relógio, ids, armazenamento e download entram pelo `Ambiente` (`src/ui/ambiente.ts`),
   trocado nos testes de componente; nenhum teste depende dos últimos meses de `dados/indices/`.
5. **Português no domínio** (`prestacao`, `amortizacao`, `fatorCorrecao`, `metodologia`);
   infraestrutura técnica com os nomes usuais em inglês. Commits e documentação em português,
   mensagens no formato "módulo: o que muda".
6. **Nenhum índice inventado.** Só séries do BCB/SGS, baixadas pelo script de índices (normalmente
   pela rotina central); cada valor carrega série, competência, fonte e data de obtenção (no horário
   de Brasília nas gravações a partir da fase 4; os arquivos anteriores trazem UTC, e as datas são
   sempre comparadas pelo instante, com `compararInstantes`); não há inserção manual no MVP.
7. **Relatório sem parâmetros de sistema.** O texto de metodologia descreve o que foi aplicado,
   nunca nomes de perfis, versões ou "personalização".
8. **Imports relativos com a extensão `.ts`** e `import type` para tipos (o script de índices roda
   no Node sem compilação e precisa disso).
9. **Dados pessoais.** Nenhum número de processo real nem nome de parte em testes, casos de
   referência ou documentação.
10. **Versões, dependências e workflows (§19.6).** Cada mudança para quem usa sobe a versão
    (`npm version <x.y.z> --no-git-tag-version --ignore-scripts`) e ganha a seção no `CHANGELOG.md`
    (o teste exige); a etiqueta `v<x.y.z>` vai no commit publicado. Versão nova de pacote, action ou
    Node só com 14 dias de publicada: `npm install <pacote>@<versão> --before=<data de 14 dias
    atrás>`; action pelo SHA do commit da etiqueta, com a versão num comentário (o GitHub exige SHA);
    Node pelo `.node-version`. Workflow que grava não instala nem roda pacotes; o token só no passo
    que grava (`scripts/workflows.test.ts`, `actionlint`).

## Pontos de validação jurídica

A seção 7 do design lista as convenções que ainda dependem de confirmação jurídica ou de gabaritos
da contadoria. Não as "resolva" sozinho: implemente o padrão decidido no design e pergunte ao
responsável quando a fase tocar em uma delas. Os pontos 3, 4, 5, 8, 9 e 12 foram decididos em
11/10/2026 na fase 2, os pontos 6, 7, 10 e 11 na fase 3 e a parte final do ponto 1 (pro rata no mês
final, confirmado como o motor já faz) em 13/10/2026, na fase 6 (notas ao fim da §7 do design): não
resta ponto aberto.

## Como registrar um caso de referência

Um caso é um arquivo JSON em `src/motor/casos/AAAA-MM-DD-<origem>-<tema>.json` no formato
`apura/caso-de-referencia@1` (tipo `CasoDeReferencia` em `src/compartilhado/tipos.ts`), com:

- `nome` e `fonte` (de onde vieram os valores: relatório do SAJ, Calculadora do Cidadão, contadoria);
- `calculo`: o `Calculo` completo de entrada (prestações sem `valorInformado` quando o caso prova
  a apuração pela base; a base é uma lista de períodos, `{"periodos": [{"de": null, "ate": null,
  "forma": {…}}]}` no caso comum);
- `indices`: a `TabelaIndices` congelada **como estava na data do cálculo** (só os meses que a
  fonte usou; incluir um mês posterior muda o resultado); quando a fonte usa um valor diferente do
  BCB (ex.: IGP-M de dez/2025 no SAJ), o caso congela o valor da fonte e explica em `observacoes`.
  Num caso com SELIC no mês da consulta, o `obtidoEm` do valor desse mês deve cair nesse mês (é ele
  que marca o mês parcial). `esperadoAte` é opcional. Sem ele, o mês que falta sai com o aviso
  genérico ("não disponível na tabela de índices"; no salário mínimo, "ainda não publicado na tabela
  de índices"). Com ele, o mês posterior ao esperado sai como "ainda sem divulgação na data da
  consulta (previsão: …)" (no reajuste com mais de um mês faltando, "(previsão para <último mês>:
  …)"; no salário mínimo, "ainda não publicado na data da consulta (previsão: …)"), e o mês já
  esperado que falta continua "não disponível na tabela de índices" (no salário mínimo, "não consta
  na tabela de índices", com o último anterior disponível). A previsão sai só nos avisos de cada
  lançamento: os resumos dos `avisos` do resultado não a trazem.
- `esperado`: por lançamento, `corrigido`, `jurosValor` e `atualizado` (e, quando a fonte os der,
  `fator` e `jurosPercentual`); opcionalmente `valorBase`, `memoriaBase`, `situacao`, `editado` e
  `avisos` do lançamento; os `totais`; e, opcionalmente, os `avisos` do resultado. Os campos
  opcionais só são comparados quando o caso os traz.

O teste `src/motor/casos.test.ts` executa todos os arquivos da pasta automaticamente. O PDF ou a
planilha de origem ficam fora do repositório; o número do processo é omitido. O Prettier ignora de
propósito `src/motor/casos/*.json` e `src/indices/testes/` (`.prettierignore`), para manter um
lançamento por linha.
