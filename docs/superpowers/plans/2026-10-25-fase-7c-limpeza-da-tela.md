# Apura · Fase 7c · Limpeza da tela — plano de implementação

> **Para agentes executores:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa a tarefa. Os passos usam caixas de seleção (`- [ ]`) para acompanhamento. A Task 12 tem ações para fora (merge na `main`, envio ao GitHub, que publica o site, e a etiqueta `v0.1.3`): **cada uma só depois da confirmação do responsável no chat, uma de cada vez** (passos marcados com ⚑).

**Objetivo:** menos informação visual na tela de cálculo, com as nove decisões (A a I) aprovadas pelo responsável em 24 e 25/10/2026, depois de uma avaliação de design (28/40 nas heurísticas de Nielsen; o ponto fraco era "estética e minimalismo"). Versão 0.1.3.

**Arquitetura:** quase tudo na interface (`src/ui/` e `src/ui/estilos.css`). O motor muda em duas linhas: o lote de pagamentos deixa de pôr a descrição "Pagamento parcial" (H) e o cálculo vazio deixa de avisar "Nenhum lançamento." (B); nenhum número muda, e os casos de referência continuam idênticos. As preferências do navegador perdem as duas opções ("Lembrar", "Guardar recentes"); o tema e a metodologia padrão ficam. O relatório (`src/relatorio/`) e a impressão não mudam. O jsdom não calcula leiaute: os testes de componente conferem textos, nomes, foco e atributos; `scripts/estilos.test.ts` prende as declarações da folha de estilos (tamanhos de letra, nada em maiúsculas, data vazia mais clara, botão de tema); o efeito visual é conferido no navegador integrado (Task 10).

**Tecnologia:** TypeScript estrito, React 19, Vite, Vitest (Node e jsdom), CSS sem pré-processador. Nenhuma dependência nova (os três ícones do tema são SVG escritos no próprio componente).

**Especificação:** o prompt da fase (decisões A a I, reproduzidas abaixo em "Decisões do responsável") e o design `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md` (§5.5, §9.2, §9.4, §17.2, §20.3 e §20.5, que esta fase revoga em parte). A §21 nova é escrita pela Task 11.

## Restrições globais (valem para todas as tarefas)

- As do `CLAUDE.md` (regras 1 a 10): TDD (o teste falha antes do código); `Decimal` e datas ISO no motor; motor puro; imports relativos com `.ts`/`.tsx` e `import type`; nenhum número de processo real nem nome de parte em teste ou documento (os números de processo dos testes são os fictícios que já estão lá, como `0800000-46.2026.8.12.0001`).
- `npm run verificar` verde antes de cada commit (Prettier, ESLint, tipos e testes).
- O relatório (`src/relatorio/`, `relatorio.css`) e a impressão não mudam; os testes de `src/relatorio/` não mudam (as descrições "Pagamento parcial" das fixtures de relatório e de `src/motor/casos/` são dado salvo e ficam).
- Arquivos e recentes já gravados continuam com o que têm (descrições, observações); não há migração de dado.
- A política de conteúdo do site (`public/_headers`) não muda: nada de recurso de fora, nada de script embutido (`scripts/site.test.ts` continua passando). `public/tema.js` não muda (os valores guardados do tema continuam `"sistema"`, `"claro"` e `"escuro"`).
- Não rodar `npm run indices:atualizar` na branch.
- Versão 0.1.3 (`npm version 0.1.3 --no-git-tag-version --ignore-scripts`) e a seção no `CHANGELOG.md` (Task 11).
- Commits em português, "módulo: o que muda", terminados com a linha `Co-Authored-By:` do modelo que de fato executa.
- Textos de tela entre aspas retas, como os balões vizinhos (ex.: `"+ Prestação"`).

## Foco da revisão

Situações que a especificação implica e que podem morder quem usa; cada uma tem teste na tarefa dona.

1. **Quem tinha desligado "Lembrar" ou "Guardar cálculos recentes"** (valores antigos no navegador): volta a ter tudo guardado, sem erro, e a próxima gravação limpa as chaves velhas. → Task 3 (preferências antigas `lembrar: false`, `guardarRecentes: false`: os nomes abrem, os recentes passam a ser guardados, e a gravação seguinte não traz as duas chaves).
2. **Arquivo aberto com observações, e "Novo cálculo" depois dele**: a caixa precisa vir aberta com o texto no primeiro caso e recolhida no segundo (a seção é remontada a cada "Abrir" e "Novo cálculo"). → Task 6 (teste no App: digitar, "Novo cálculo", abrir o recente).
3. **Divisão da base com data inválida ou que já é início de período**: o campo continua aberto com o erro, e o foco não se perde ao dividir com sucesso. → Task 5.
4. **Navegador que não permite guardar nada**: o aviso da seção 1 sem as opções que saíram, e o painel "Abrir" sem a frase dos cinco recentes (que seria falsa ali). → Task 3.
5. **Tabela vazia com a linha nova aberta** ("+ Prestação" numa tabela sem linhas): a linha de títulos aparece com a linha nova e some ao descartá-la. → Task 1.

---

## Para o responsável: o que esta fase entrega e o que foi decidido

Ao fim da fase 7c, a tela do Apura fica mais limpa: os campos vêm vazios (sem "ex.: 1.000,00" dentro), as tabelas vazias mostram só o título e o botão, os rótulos saem das letras miúdas em maiúsculas, a seção 1 fica só com os campos (defensor, órgão e os cinco recentes passam a ser sempre guardados neste navegador), a divisão da base e as observações ficam atrás de um botão discreto, o tema vira um ícone (☀ ☾ ◐), os pagamentos em lote deixam de ter a descrição "Pagamento parcial" e a tela principal passa de 16 para 8 balões ⓘ. Nenhum número muda. O rodapé e o relatório passam a dizer "v0.1.3". A contagem de testes parte de `1022 passando | 10 pulados (1032)`, em 61 arquivos; a final é medida na Task 11.

**Decisões suas, de 24 e 25/10/2026 (vão para a §21 do design na Task 11):**

- **A · Sem exemplos dentro dos campos** (revoga a decisão de 13/10/2026 da §9.4 sobre os exemplos dentro dos campos). Saem: `0000000-00.0000.0.00.0000`, `ex.: 1.000,00`, `ex.: 30` (dois campos), `ex.: 1.500,00`, `ex.: 5`, `ex.: 3`, `ex.: 400,00` (lote e Personalizar), `ex.: 13º salário 2025`, `ex.: pagamento em espécie`, `0,00` (linha nova de pagamento) e `dd/mm/aaaa` (data editada na própria célula). Ficam: `pela base`, `apurado pela base` e `usa o rendimento padrão`. O `dd/mm/aaaa` dos campos de data é do navegador: fica, mais claro enquanto o campo está vazio (T5).
- **B · Tela vazia sem repetição.** Saem as frases "Nenhuma prestação lançada: …" e "Nenhum pagamento lançado: …"; a tabela sem linhas (e sem linha nova) mostra só o título, o ⓘ e o botão, sem a linha de títulos. O aviso "Nenhum lançamento." não aparece mais (T1). Os cinco indicadores ficam (inclusive com R$ 0,00).
- **C · Tipografia sem texto miúdo em maiúsculas.** Rótulos e legendas em caixa normal, 13 a 14 px; títulos das seções em caixa normal, 16 a 17 px, verdes e numerados; cabeçalhos das tabelas e rótulos dos indicadores em caixa normal, 12 a 13 px; no máximo cinco ou seis tamanhos, com degraus perceptíveis; fontes e cores da identidade ficam; relatório e impressão não mudam (T3, T4).
- **D · Defensor(a), órgão e recentes sempre guardados** (revoga as opções da §5.5 e da §9.2, de 12/10/2026). Saem "Lembrar neste navegador", "Esquecer", "Guardar cálculos recentes neste navegador" e os dois balões ⓘ da seção 1. Valores antigos dessas opções são ignorados, sem migração. Tema e metodologia padrão continuam nas preferências. No "Abrir" ficam "Remover" e "Limpar recentes", com a frase "Os cinco últimos cálculos ficam guardados só neste navegador (nada vai para servidor algum). Em computador compartilhado, limpe ao terminar." "Novo cálculo" continua sem confirmação, e o aviso de gravação que falhou continua no "Abrir". O aviso da seção 1 para navegador sem armazenamento continua, com o texto ajustado (T7, T8; texto para confirmar abaixo).
- **E · Divisão da base recolhida:** um botão discreto "Dividir a base em períodos"; ao clicar, aparecem "Dividir em" (com o ⓘ atual) e "Dividir", com o foco na data. "Remover divisão" não muda (T6).
- **F · Observações recolhidas, na mesma seção 3:** um botão discreto "+ Observações para o relatório" abre a caixa com o foco nela; cálculo que já tem observações mostra a caixa aberta; o ⓘ das observações sai (T6).
- **G · Botão de tema como ícone,** no mesmo lugar, sem borda e sem texto: ☀ (claro), ☾ (escuro) e ◐ (igual ao computador), em SVG no código; o ciclo continua o mesmo; "do sistema" passa a se chamar "igual ao computador"; o nome e a dica dizem o tema atual e o próximo ("Tema: igual ao computador. Clique para claro.") (T9). O aviso de navegador sem armazenamento não cita o nome antigo (diz "o tema escolhido"), e o texto ajustado de D também não.
- **H · Sem "Pagamento parcial":** o lote de pagamentos deixa de pôr a descrição; arquivos e recentes já gravados ficam com a que têm; o "R$" continua nas células (T10).
- **I · Balões ⓘ.** Saem: Nº do processo, Fixado em, Honorários, Data de elaboração e, no Personalizar do pagamento, Valor e Descrição (além dos de D e F). Ficam reduzidos: Reajuste anual (opção "nenhum"), Multa (passa a cobrir os honorários), 4 · Prestações em atraso, 5 · Pagamentos e, no Personalizar da prestação, Descrição. Os textos são os do prompt, transcritos na Task 8. Os demais ficam como estão. Na tela principal em valor fixo, de 16 para 8 balões.

**Fica de fora (decidido):** o "R$" nas células; os dois indicadores destacados; as observações em outra seção; juros com 6 casas, ordem e numeração das seções e cores; botão ou menu de preferências.

**Textos confirmados pelo responsável em 25/10/2026, antes da execução:**

1. Balão do "Reajuste anual" com a opção "nenhum" (o proposto no prompt): "Com índice (IPCA, INPC ou IGP-M), o valor é reajustado a cada 12 meses pelo acumulado dos 12 meses anteriores ao mês do reajuste, que por padrão é o da fixação. Com salário mínimo, acompanha a proporção entre o salário mínimo do mês do vencimento e o do mês da fixação."
2. Aviso da seção 1 quando o navegador não permite guardar nada (hoje cita "Lembrar" e "Guardar cálculos recentes"): "Este navegador não permite guardar nada: os cálculos recentes não ficam guardados, e defensor(a), órgão e tema valem só até recarregar ou fechar a página."

**Decisões técnicas deste plano (reabra qualquer uma na revisão, se discordar):**

- **T1 · "Nenhum lançamento." sai do motor**, não só da tela: o aviso não diz nada que a tela vazia já não mostre, o relatório já fica bloqueado sem prestação (`src/relatorio/bloqueio.ts`), e o arquivo salvo de um cálculo vazio deixa de trazê-lo. Filtrar na tela deixaria uma frase no `Resultado` que nenhum lugar mostra (Task 1).
- **T2 · Tabela vazia sem a linha de títulos:** some o `<thead>`, não a tabela, porque a medida de largura (`ResizeObserver`, §20.3) observa sempre o mesmo elemento `<table>` (Task 1).
- **T3 · Escala de cinco tamanhos: 12 · 13 · 15 · 17 · 22 px.** 13 px para todo o texto secundário (rótulos, legendas, cabeçalhos das tabelas, rótulos dos indicadores, números das tabelas, notas, erros, balões, avisos, memória, rodapé); 15 px para o texto de base (campos, botões, opções; já é hoje); 17 px para os títulos (seções, tabelas, painéis) e os valores dos indicadores (hoje 18); 22 px para o nome "Apura" na barra (já é hoje; o de telas estreitas, hoje 20, sobe para 22, e o título da tela de erro, hoje 20, também); 12 px só para as etiquetas das linhas ("vincenda", hoje 11) e o subtítulo da marca na barra (hoje 12,5). Os títulos dentro dos painéis e dos blocos de período ("Até 31/12/2024", "Cálculos recentes neste navegador") e o título da caixa de avisos ficam em 15 px, em negrito. Por que não exatamente 1,2 entre todos: os números das tabelas não podem passar de 13 px (a tabela de prestações cabe justa na coluna de 1366 px, §18.6), e os rótulos (13 a 14) e o texto dos campos (15) ficam a só um degrau; os degraus ficam entre 1,13 e 1,29, e o de 12 para 13 só separa as etiquetas (marcas com fundo colorido) e o subtítulo da marca (branco sobre verde), não texto corrido. Os valores dos indicadores descem de 18 para 17 px porque 18 ficaria a um passo dos títulos; o efeito é um pouco mais de folga na arrumação dos cinco cartões (Task 9).
- **T4 · Altura do título das tabelas:** com 17 px, o título passaria dos 35 px fixados para ele (`--titulo-da-tabela`, §20.3); o espaço interno cai de `10px 12px 4px` para `8px 12px 2px`, e ele continua em 35 px. A linha de títulos das colunas cresce com os 13 px (de 25,7 para cerca de 29,9 px), e `--cabecalhos-da-tabela` passa de 62 para 66 px (35 + 29,9, com 1 px de folga), medidos de novo no navegador na Task 10 (Task 9).
- **T5 · Data vazia mais clara:** o campo de data em branco ganha o atributo `data-vazio`, e o CSS o pinta com a cor discreta e em itálico, como "pela base" (`color` vale para o texto do campo de data no Chrome, no Edge, no Safari e no Firefox). Efeito colateral aceito: enquanto a data é digitada pela metade, o navegador ainda a trata como vazia, e os números digitados ficam claros até a data se completar. Conferido só no Chromium do navegador integrado; Safari e Firefox ficam registrados como não conferidos, como nas fases 7b e 0.1.2 (Task 7).
- **T6 · Foco nos botões recolhidos:** "Dividir a base em períodos" abre o campo com o foco na data; depois de uma divisão bem-sucedida, o campo recolhe e o foco volta ao botão (quem usa o teclado não se perde); com erro, o campo fica aberto. "+ Observações para o relatório" abre a caixa com o foco nela; a caixa aberta de saída (cálculo com observações) não toma o foco. Os campos ganham a propriedade `autoFocus`, que o React aplica ao montar (Tasks 5 e 6).
- **T7 · Preferências:** `lembrar` e `guardarRecentes` saem do tipo `Preferencias`; a leitura ignora o que estiver gravado nelas e lê defensor e órgão sempre; como a gravação grava o objeto inteiro, a primeira gravação depois da atualização apaga as duas chaves velhas. A função `esquecer` sai (Task 3).
- **T8 · Painel "Abrir":** a frase nova fica logo abaixo do título "Cálculos recentes neste navegador", só quando o navegador permite guardar (sem armazenamento, fica o aviso de hoje); a lista vazia passa a dizer só "Nenhum cálculo recente ainda." (a segunda frase de hoje, "Os cinco últimos aparecem aqui.", repetiria a nova) (Task 3).
- **T9 · Ícones do tema:** desenhados no próprio componente (`IconeDoTema`, em `BarraSuperior.tsx`), em 20 × 20 px, na cor do texto da barra (`currentColor`), escondidos do leitor de tela (`aria-hidden`); o nome do botão (`aria-label`) e a dica (`title`) têm o mesmo texto. Cada ícone leva `data-icone` (`sol`, `lua`, `meio`), que os testes leem (Task 4).
- **T10 · "Pagamento parcial":** só o lote muda; o motor não lê a descrição, então nenhum total muda (Task 2).

**Você faz:** escolher a forma de execução; na Task 12, autorizar o merge, o envio ao GitHub (que publica o site) e a etiqueta `v0.1.3`, um de cada vez.

---

## Estrutura de arquivos

| Arquivo | O que muda | Tarefa |
|---|---|---|
| `src/motor/calcular.ts` · `calcular.test.ts` | sem o aviso "Nenhum lançamento." | 1 |
| `src/motor/lote.ts` · `lote.test.ts` | lote de pagamentos sem descrição | 2 |
| `src/ui/tabelas/TabelaLancamentos.tsx` | tabela vazia sem frase e sem `<thead>`; sem `0,00` e `dd/mm/aaaa` nos campos | 1, 7 |
| `src/ui/preferencias.ts` · `preferencias.test.ts` | sem `lembrar`, `guardarRecentes` e `esquecer` | 3 |
| `src/ui/App.tsx` | defensor, órgão e recentes sempre guardados; props novas de `Processo` e `Abrir` | 3 |
| `src/ui/secoes/Processo.tsx` · `Processo.test.tsx` | sem as opções, sem balões, sem exemplo; aviso ajustado; testes do tema | 3, 4, 7, 8 |
| `src/ui/Abrir.tsx` · `Abrir.test.tsx` | frase dos recentes; sem a nota da opção desligada | 3 |
| `src/ui/BarraSuperior.tsx` · `TelaDeErro.test.tsx` | botão de tema como ícone | 4 |
| `src/ui/componentes/Campo.tsx` · `Campo.test.tsx` | `autoFocus` em `CampoTexto` e `CampoArea`; `data-vazio` na data em branco | 5, 7 |
| `src/ui/secoes/Base.tsx` · `Base.test.tsx` | divisão recolhida; sem exemplos; balões de Fixado em e Reajuste anual | 5, 7, 8 |
| `src/ui/secoes/Encargos.tsx` · `Encargos.test.tsx` | observações recolhidas; balões de multa, honorários e data | 3, 6, 8 |
| `src/ui/RelatorioNaTela.test.tsx` | abre as observações pelo botão antes de digitar | 6 |
| `src/ui/secoes/LotePrestacoes.tsx` · `LotePagamentos.tsx` · `Lotes.test.tsx` | sem exemplos; textos dos balões | 1, 7, 8 |
| `src/ui/tabelas/Personalizar.tsx` · `Personalizar.test.tsx` | sem exemplos; balões | 7, 8 |
| `src/ui/tabelas/Tabelas.test.tsx` · `src/ui/estado/calculo.test.ts` · `src/ui/App.test.tsx` | expectativas das tarefas acima; contagem de balões | 1, 2, 7, 8 |
| `src/ui/estilos.css` · `scripts/estilos.test.ts` | botão de tema; divisão da base; data vazia; tipografia | 4, 5, 7, 9 |
| `package.json` · `package-lock.json` · `CHANGELOG.md` · design · roteiro · `CLAUDE.md` · este plano | versão 0.1.3 e registro | 11 |

---

## Como executar este plano

As Tasks 1 a 9 são independentes no conteúdo, mas tocam arquivos em comum (`Processo.tsx`, `Base.tsx`, `Encargos.tsx`, `Personalizar.tsx`, `estilos.css` e seus testes): rodam em sequência, na ordem numérica, na mesma branch (`claude/apura-fase-7c-limpeza-e4e45e`). A Task 10 confere tudo no navegador; a 11 registra; a 12 integra. Cada tarefa termina com `npm run verificar` verde e um commit. As linhas citadas ("`Base.tsx:307`") são as da `main` em `9c4fbb6`; depois das primeiras tarefas, elas andam, e vale o trecho descrito.

---

### Task 1: Tela vazia sem repetição (B)

**Arquivos:**
- Modificar: `src/motor/calcular.ts:415-417` (o ramo `if (lancamentos.length === 0) avisos.push("Nenhum lançamento.")`; o `else if` seguinte vira `if`)
- Modificar: `src/ui/tabelas/TabelaLancamentos.tsx:301-324` (o `<thead>` só com linha ou linha nova; sai a linha da frase)
- Testes: `src/motor/calcular.test.ts`, `src/ui/tabelas/Tabelas.test.tsx`, `src/ui/App.test.tsx`, `src/ui/secoes/Lotes.test.tsx`

**Interfaces:** nenhuma nova.

- [ ] **Passo 1: Escrever os testes que falham**

Em `src/motor/calcular.test.ts`, tirar a linha `expect(calcular(calculoCom([]), tabelaIgpm()).avisos).toEqual(["Nenhum lançamento."]);` do teste "avisa quando as amortizações igualam ou superam…" (o nome perde "e quando não há lançamentos") e acrescentar:

```ts
it("cálculo sem lançamentos não tem aviso: a tela vazia já mostra isso (§21.2)", () => {
  expect(calcular(calculoCom([]), tabelaIgpm()).avisos).toEqual([]);
});
```

Em `src/ui/tabelas/Tabelas.test.tsx`, no `describe` da tabela no App (onde está o teste do balão flutuante do título), acrescentar:

```tsx
it("tabela vazia: só o título, o ⓘ e o botão, sem a linha de títulos e sem frase (§21.2)", async () => {
  const user = userEvent.setup();
  render(<App ambiente={ambienteDeTeste()} />);
  for (const [nome, botao] of [
    ["Prestações", "+ Prestação"],
    ["Amortizações (pagamentos)", "+ Pagamento"],
  ] as const) {
    const tabela = within(screen.getByRole("region", { name: nome }));
    expect(tabela.queryAllByRole("columnheader")).toHaveLength(0);
    expect(tabela.queryByText(/Nenhuma prestação|Nenhum pagamento/)).toBeNull();
    expect(tabela.getByRole("button", { name: `Ajuda: ${nome}` })).toBeDefined();
    expect(tabela.getByRole("button", { name: botao })).toBeDefined();
  }
  // a linha nova traz a linha de títulos; descartada, ela some de novo
  const prestacoes = within(screen.getByRole("region", { name: "Prestações" }));
  await user.click(prestacoes.getByRole("button", { name: "+ Prestação" }));
  expect(prestacoes.getAllByRole("columnheader")).toHaveLength(8);
  await user.keyboard("{Escape}");
  expect(prestacoes.queryAllByRole("columnheader")).toHaveLength(0);
});
```

No teste do mesmo arquivo que procura `/Nenhum pagamento lançado/` (perto da linha 113), trocar a expectativa por `expect(within(screen.getByRole("region", { name: "Amortizações (pagamentos)" })).queryAllByRole("columnheader")).toHaveLength(0)`.

Em `src/ui/App.test.tsx`: no teste da ordem das seções, trocar as duas expectativas das frases (linhas 50 a 55) por `expect(screen.queryByText(/Nenhuma prestação lançada|Nenhum pagamento lançado/)).toBeNull();`; o teste "congela a tabela ao abrir e de novo em 'Novo cálculo'; o cálculo em branco mostra 'Nenhum lançamento.'" passa a se chamar "…; o cálculo em branco não mostra 'Nenhum lançamento.' (§21.2)" e troca a expectativa da região "Avisos" por `expect(screen.queryByText("Nenhum lançamento.")).toBeNull();`.

Em `src/ui/secoes/Lotes.test.tsx`, tirar as três expectativas sobre "Nenhum lançamento." (linhas 51 a 53, 86 a 88 e 104 a 106 hoje); elas guardavam o aviso que sai.

- [ ] **Passo 2: Ver falhar**

Rodar: `npx vitest run src/motor/calcular.test.ts src/ui/tabelas/Tabelas.test.tsx src/ui/App.test.tsx`
Esperado: FALHA no teste novo do motor (recebe `["Nenhum lançamento."]`), no da tabela vazia (8 `columnheader` e a frase presentes) e no do App ("Nenhum lançamento." encontrado).

- [ ] **Passo 3: Implementar**

Motor: tirar o ramo do aviso (o comentário do aviso de amortizações continua). Tabela: `<thead>` só quando `linhas.length > 0 || rascunho !== null`; sai a `<tr>` da frase (o `tbody` fica vazio). O comentário do topo de `TabelaLancamentos.tsx` ganha "Tabela vazia: só o título, o ⓘ e o botão (§21.2)."

- [ ] **Passo 4: Ver passar e verificar**

Rodar: `npm run verificar`
Esperado: tudo verde; os casos de referência (`src/motor/casos.test.ts`) idênticos.

- [ ] **Passo 5: Commit**

```bash
git add src/motor/calcular.ts src/motor/calcular.test.ts src/ui/tabelas/TabelaLancamentos.tsx src/ui/tabelas/Tabelas.test.tsx src/ui/App.test.tsx src/ui/secoes/Lotes.test.tsx
git commit -m "ui: tabela vazia só com título e botão, e o cálculo vazio sem aviso (§21.2)"
```

---

### Task 2: Lote de pagamentos sem "Pagamento parcial" (H)

**Arquivos:**
- Modificar: `src/motor/lote.ts:163-166` (comentário) e `:220` (a linha `descricao: "Pagamento parcial",`)
- Testes: `src/motor/lote.test.ts:235-270`, `src/ui/estado/calculo.test.ts:160-170`, `src/ui/tabelas/Tabelas.test.tsx` (linhas 350, 369, 569 e 572 hoje)

**Interfaces:** `gerarLoteAmortizacoes` devolve lançamentos sem a propriedade `descricao`.

- [ ] **Passo 1: Escrever os testes que falham**

`src/motor/lote.test.ts`: nos três objetos esperados do teste do lote de pagamentos com mês pulado, tirar `descricao: "Pagamento parcial",` e acrescentar, depois do `toEqual`:

```ts
// sem descrição (§21.8): a tabela e o relatório mostram só a data
expect(r.lancamentos.some((l) => Object.hasOwn(l, "descricao"))).toBe(false);
```

`src/ui/estado/calculo.test.ts`, "lança pagamentos em lote e guarda o lote": as tuplas esperadas passam a `["a-2026-08", "400.00", undefined]` e `["a-2026-09", "400.00", undefined]`.

`src/ui/tabelas/Tabelas.test.tsx`: `"▸05/09/2026Pagamento parcial"` → `"▸05/09/2026"`; `"Clique de novo para excluir o pagamento de 05/09/2026 (Pagamento parcial)"` → `"Clique de novo para excluir o pagamento de 05/09/2026"`; `"Editar valor do pagamento de 05/09/2026 (Pagamento parcial) (R$ 400,00)"` → `"Editar valor do pagamento de 05/09/2026 (R$ 400,00)"`; `"Valor do pagamento de 05/09/2026 (Pagamento parcial)"` → `"Valor do pagamento de 05/09/2026"`.

- [ ] **Passo 2: Ver falhar**

Rodar: `npx vitest run src/motor/lote.test.ts src/ui/estado/calculo.test.ts src/ui/tabelas/Tabelas.test.tsx`
Esperado: FALHA nos três arquivos (a descrição "Pagamento parcial" ainda vem do lote).

- [ ] **Passo 3: Implementar**

Tirar a linha da descrição em `gerarLoteAmortizacoes`; o comentário passa a "Gera um pagamento por mês do intervalo, com o valor mensal e o dia do pagamento (§6.2), sem descrição (§21.8), pulando os meses que já têm pagamento na lista. Um segundo pagamento no mesmo mês entra como pagamento avulso."

- [ ] **Passo 4: Ver passar e verificar**

Rodar: `npm run verificar`
Esperado: verde; os casos de referência idênticos (o motor não lê a descrição); os testes de `src/relatorio/` e `src/ui/arquivo.test.ts` sem mudança.

- [ ] **Passo 5: Commit**

```bash
git add src/motor/lote.ts src/motor/lote.test.ts src/ui/estado/calculo.test.ts src/ui/tabelas/Tabelas.test.tsx
git commit -m "motor: o lote de pagamentos não põe mais a descrição \"Pagamento parcial\" (§21.8)"
```

---

### Task 3: Defensor(a), órgão e recentes sempre guardados (D)

**Arquivos:**
- Modificar: `src/ui/preferencias.ts` (tipo, padrão, leitura, gravação; sai `esquecer`)
- Modificar: `src/ui/App.tsx:111-118, 227-255, 316-323, 411-425`
- Modificar: `src/ui/secoes/Processo.tsx` (sai a linha "Lembrar"/"Esquecer", a linha "Guardar cálculos recentes" e o ⓘ "Processo"; aviso ajustado)
- Modificar: `src/ui/Abrir.tsx:12-73` (sai `recentesLigados`; frase nova; lista vazia)
- Testes: `src/ui/preferencias.test.ts`, `src/ui/secoes/Processo.test.tsx`, `src/ui/Abrir.test.tsx`, `src/ui/secoes/Encargos.test.tsx:125-150`

**Interfaces:**
- Produz: `interface Preferencias { defensor: string; orgao: string; tema: Tema; metodologia: OpcaoDeMetodologia }`; `PREFERENCIAS_PADRAO = { defensor: "", orgao: "", tema: "sistema", metodologia: "lei14905" }`; `lerPreferencias(armazenamento): Preferencias` e `gravarPreferencias(armazenamento, p): boolean` com as mesmas assinaturas; `esquecer` deixa de existir.
- Produz: `Processo({ cabecalho, aoMudar, armazenamentoDisponivel })`; `Abrir({ recentes, armazenamentoDisponivel, erro, naoGuardado, aoAbrirRecente, aoRemoverRecente, aoLimparRecentes, aoAbrirTexto, aoFalharLeitura })`.

- [ ] **Passo 1: Escrever os testes que falham**

`src/ui/preferencias.test.ts`, reescrito com quatro testes:

```ts
it("sem nada gravado, valem os padrões: nomes vazios, tema igual ao computador, metodologia da Lei 14.905/2024", () => {
  expect(lerPreferencias(armazenamentoEmMemoria())).toEqual({
    defensor: "", orgao: "", tema: "sistema", metodologia: "lei14905",
  });
});

it("grava e lê de volta os quatro campos", () => {
  const armazenamento = armazenamentoEmMemoria();
  const p: Preferencias = { defensor: "Defensor(a) de teste", orgao: "Órgão de teste", tema: "escuro", metodologia: "igpmJuros1" };
  expect(gravarPreferencias(armazenamento, p)).toBe(true);
  expect(lerPreferencias(armazenamento)).toEqual(p);
});

it("as opções antigas ('Lembrar', 'Guardar recentes') são ignoradas, e a gravação seguinte as apaga (§21.4)", () => {
  const armazenamento = armazenamentoEmMemoria({
    [CHAVE_PREFERENCIAS]: JSON.stringify({
      defensor: "Nome antigo", orgao: "Órgão antigo", lembrar: false, guardarRecentes: false, tema: "claro",
    }),
  });
  const lidas = lerPreferencias(armazenamento);
  expect(lidas).toEqual({ defensor: "Nome antigo", orgao: "Órgão antigo", tema: "claro", metodologia: "lei14905" });
  gravarPreferencias(armazenamento, lidas);
  expect(Object.keys(JSON.parse(armazenamento.getItem(CHAVE_PREFERENCIAS) ?? "{}")).sort()).toEqual(
    ["defensor", "metodologia", "orgao", "tema"],
  );
});
```

O quarto é o teste de conteúdo corrompido de hoje, com o objeto esperado sem `lembrar` e `guardarRecentes` (`{ defensor: "", orgao: "Órgão", tema: "sistema", metodologia: "lei14905" }`) e o resto igual.

`src/ui/secoes/Processo.test.tsx`:
- O teste "as explicações ficam nos balões ⓘ" é trocado por "a seção 1 não tem 'Lembrar', 'Esquecer' nem 'Guardar cálculos recentes', nem os balões 'Processo' e 'cálculos recentes' (§21.4)": `queryByLabelText("Lembrar neste navegador")`, `queryByRole("button", { name: "Esquecer" })`, `queryByLabelText(/Guardar cálculos recentes/)`, `queryByRole("button", { name: "Ajuda: Processo" })` e `queryByRole("button", { name: "Ajuda: cálculos recentes" })`, todos `null`.
- "lembra defensor(a) e órgão enquanto digita…": o objeto gravado esperado passa a `{ defensor: "Defensor(a) de teste", orgao: "1ª Defensoria de teste", tema: "sistema", metodologia: "lei14905" }`.
- "abre com os nomes gravados antes; desligar 'Lembrar'…" passa a "abre com os nomes gravados antes, mesmo de quem tinha desligado 'Lembrar', e continua gravando (§21.4)": o gravado inicial traz `lembrar: false, guardarRecentes: false` com `defensor: "Quem ficou gravado"` e `orgao: "Órgão gravado"`; o campo abre com "Quem ficou gravado"; depois de `user.type(defensor, " e mais")`, o gravado é `{ defensor: "Quem ficou gravado e mais", orgao: "Órgão gravado", tema: "sistema", metodologia: "lei14905" }`.
- Os testes "'Esquecer' apaga…" e "desligar 'Guardar cálculos recentes'…" saem; entra "os recentes são sempre guardados, mesmo com a opção antiga desligada (§21.4)": gravado `{ guardarRecentes: false }`; depois de digitar `08000004620268120001` no Nº do processo, `JSON.parse(armazenamento.getItem(CHAVE_RECENTES) ?? "[]")` tem 1 item.
- "sem armazenamento…": a frase esperada é a exata `"Este navegador não permite guardar nada: os cálculos recentes não ficam guardados, e defensor(a), órgão e tema valem só até recarregar ou fechar a página."` (texto 2, como confirmado pelo responsável); sai o clique em "Esquecer"; os cliques no tema continuam com os nomes de hoje (a Task 4 os troca).
- "abre com o tema guardado; Esquecer e desligar Lembrar não apagam o tema" passa a "abre com o tema guardado, e digitar o defensor não o apaga": sem os cliques em "Esquecer" e "Lembrar"; depois de digitar "Alguém" no defensor, o gravado é `{ defensor: "Alguém", orgao: "", tema: "escuro", metodologia: "lei14905" }`, e `data-theme` continua `"dark"`.

`src/ui/Abrir.test.tsx`:
- O teste "com a guarda de recentes desligada nada é guardado e o painel explica; recente corrompido mostra erro" passa a "o painel mostra a frase dos recentes guardados neste navegador; recente corrompido mostra erro": sem os cliques na opção; ao abrir o painel, `within(dialog).getByText("Os cinco últimos cálculos ficam guardados só neste navegador (nada vai para servidor algum). Em computador compartilhado, limpe ao terminar.")`; a parte do recente corrompido fica igual.
- No teste de navegador sem armazenamento (perto da linha 320), trocar `painel.queryByText(/está desligada/)` por `painel.queryByText(/Os cinco últimos cálculos ficam guardados/)` (`null`: ali a frase seria falsa).
- Onde algum teste esperar "Nenhum cálculo recente ainda. Os cinco últimos aparecem aqui.", passa a "Nenhum cálculo recente ainda." (`grep -rn "Nenhum cálculo recente" src/ui`).

`src/ui/secoes/Encargos.test.tsx`, teste "no App: a opção escolhida… sobrevive a 'Esquecer'…": sai "sobrevive a 'Esquecer'" do nome e saem as duas linhas do clique em "Esquecer" e da conferência seguinte.

- [ ] **Passo 2: Ver falhar**

Rodar: `npx vitest run src/ui/preferencias.test.ts src/ui/secoes/Processo.test.tsx src/ui/Abrir.test.tsx src/ui/secoes/Encargos.test.tsx`
Esperado: FALHA nos testes novos e alterados (as opções ainda existem; o gravado traz `lembrar` e `guardarRecentes`; a frase do painel não existe; com `guardarRecentes: false` gravado, nada vai para os recentes).

- [ ] **Passo 3: Implementar**

- `preferencias.ts`: o tipo, o padrão e a leitura sem as duas opções (sai o `booleano`); `gravarPreferencias` grava `p` como vem; sai `esquecer` e os imports que só ele usava; o comentário do topo diz o que se guarda e cita a §21.4.
- `App.tsx`: `calculoNovo` passa `cabecalho: { defensor: p.defensor, orgao: p.orgao }`; o efeito dos recentes guarda quando `armazenamento !== null && estado.tocado`; `mudarPreferencias` sem a remoção dos recentes; `mudarCabecalho` grava defensor e órgão sempre; sai `esquecerTudo`; `Processo` e `Abrir` com as props novas; saem os imports de `esquecer`, `CHAVE_RECENTES` e `removerChave` que ficarem sem uso.
- `Processo.tsx`: saem as duas `<div className="linha">` com `Opcao`, o `<Ajuda assunto="Processo">` (fica o `<div className="titulo-secao">` só com o `h2`) e as props que sobram; o aviso ganha o texto 2; o comentário do topo cita a §21.4 (o ⓘ do Nº do processo sai na Task 8, o exemplo na Task 7).
- `Abrir.tsx`: com armazenamento, `<p className="nota">` com a frase nova logo depois do `<h3>`; sai o ramo `!recentesLigados`; a lista vazia diz "Nenhum cálculo recente ainda."; "Remover", "Limpar recentes" e o aviso de gravação que falhou ficam como estão.

- [ ] **Passo 4: Ver passar e verificar**

Rodar: `npm run verificar`
Esperado: verde.

- [ ] **Passo 5: Commit**

```bash
git add src/ui/preferencias.ts src/ui/preferencias.test.ts src/ui/App.tsx src/ui/secoes/Processo.tsx src/ui/secoes/Processo.test.tsx src/ui/Abrir.tsx src/ui/Abrir.test.tsx src/ui/secoes/Encargos.test.tsx
git commit -m "ui: defensor(a), órgão e os cinco recentes sempre guardados neste navegador (§21.4)"
```

---

### Task 4: Botão de tema como ícone (G)

**Arquivos:**
- Modificar: `src/ui/BarraSuperior.tsx:9-13, 78-85` (nome "igual ao computador", `aria-label` e `title`, ícone)
- Modificar: `src/ui/estilos.css:240-242` (`.botao-tema`)
- Testes: `src/ui/secoes/Processo.test.tsx` (testes do tema), `src/ui/TelaDeErro.test.tsx:77`, `scripts/estilos.test.ts`

**Interfaces:**
- Produz: em `BarraSuperior.tsx`, `function IconeDoTema({ tema }: { tema: Tema })`, que desenha um `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-icone=…>`: `sol` (claro: círculo de raio 4,5 e oito raios, traço `currentColor` de 2 px), `lua` (escuro: crescente preenchido com `currentColor`) e `meio` (igual ao computador: círculo de raio 9 com traço e a metade esquerda preenchida, como ◐).
- `proximoTema` não muda.

- [ ] **Passo 1: Escrever os testes que falham**

`src/ui/secoes/Processo.test.tsx`, teste do ciclo do tema, reescrito:

```tsx
it("o botão de tema é um ícone: igual ao computador → claro → escuro → igual ao computador, com o nome e a dica dizendo o atual e o próximo (§21.7)", async () => {
  const user = userEvent.setup();
  const armazenamento = armazenamentoEmMemoria();
  render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
  const botao = screen.getByRole("button", { name: "Tema: igual ao computador. Clique para claro." });
  const icone = () => botao.querySelector("svg")?.getAttribute("data-icone");
  expect(botao.textContent).toBe("");
  expect(botao.getAttribute("title")).toBe("Tema: igual ao computador. Clique para claro.");
  expect(icone()).toBe("meio");
  expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  await user.click(botao);
  expect(botao.getAttribute("aria-label")).toBe("Tema: claro. Clique para escuro.");
  expect(botao.getAttribute("title")).toBe("Tema: claro. Clique para escuro.");
  expect(icone()).toBe("sol");
  expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  expect((preferenciasGravadas(armazenamento) as { tema: string }).tema).toBe("claro");
  await user.click(botao);
  expect(botao.getAttribute("aria-label")).toBe("Tema: escuro. Clique para igual ao computador.");
  expect(icone()).toBe("lua");
  expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  botao.focus();
  await user.keyboard("{Enter}");
  expect(botao.getAttribute("aria-label")).toBe("Tema: igual ao computador. Clique para claro.");
  expect(icone()).toBe("meio");
  expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  expect((preferenciasGravadas(armazenamento) as { tema: string }).tema).toBe("sistema");
});
```

Nos outros testes do arquivo, os nomes do botão passam a `"Tema: igual ao computador. Clique para claro."` e `"Tema: claro. Clique para escuro."`; no "abre com o tema guardado", `getByRole("button", { name: /^Tema: escuro\./ })`. Em `src/ui/TelaDeErro.test.tsx:77`, `{ name: "Tema do sistema" }` → `{ name: /^Tema: igual ao computador\./ }`.

`scripts/estilos.test.ts`:

```ts
describe("botão de tema como ícone (§21.7)", () => {
  it("o botão de tema não tem borda nem a largura mínima do texto de antes", () => {
    const tema = declaracoes(bloco(css, ".botao-tema"));
    expect(tema.get("border-color")).toBe("transparent");
    expect(tema.has("min-width")).toBe(false);
  });
});
```

- [ ] **Passo 2: Ver falhar**

Rodar: `npx vitest run src/ui/secoes/Processo.test.tsx src/ui/TelaDeErro.test.tsx scripts/estilos.test.ts`
Esperado: FALHA (o botão ainda se chama "Tema do sistema" e tem texto; o CSS tem `min-width: 10.5em`).

- [ ] **Passo 3: Implementar**

`NOME_DO_TEMA.sistema = "igual ao computador"`; o botão com `aria-label` e `title` iguais a `` `Tema: ${NOME_DO_TEMA[tema]}. Clique para ${NOME_DO_TEMA[proximoTema(tema)]}.` `` e, dentro, só `<IconeDoTema tema={tema} />`; o comentário do componente cita a §21.7. CSS: `.botao-tema { border-color: transparent; padding: 6px; line-height: 0; }` (sai o `min-width`); o fundo ao passar o mouse e o anel de foco vêm de `.botao-barra` e de `.barra :focus-visible`.

- [ ] **Passo 4: Ver passar e verificar**

Rodar: `npm run verificar`
Esperado: verde.

- [ ] **Passo 5: Commit**

```bash
git add src/ui/BarraSuperior.tsx src/ui/estilos.css src/ui/secoes/Processo.test.tsx src/ui/TelaDeErro.test.tsx scripts/estilos.test.ts
git commit -m "ui: botão de tema como ícone (☀ ☾ ◐), com \"igual ao computador\" (§21.7)"
```

---

### Task 5: Divisão da base recolhida (E)

**Arquivos:**
- Modificar: `src/ui/componentes/Campo.tsx:129-146, 167-190` (`autoFocus?: boolean` em `CampoTexto` e `CampoArea`)
- Modificar: `src/ui/secoes/Base.tsx:112-128, 169-188` (estado `dividindo`; botão discreto; foco)
- Modificar: `src/ui/estilos.css:1067-1070` (sai a regra `.dividir-base > .nota`)
- Testes: `src/ui/secoes/Base.test.tsx`

**Interfaces:**
- Produz: `CampoTexto` e `CampoArea` aceitam `autoFocus?: boolean`, repassado ao `<input>`/`<textarea>` (a Task 6 usa).

- [ ] **Passo 1: Escrever os testes que falham**

Em `src/ui/secoes/Base.test.tsx`, o teste 'com um período, a seção é a de antes, mais "Dividir em" no pé (§17.2)' é trocado por estes dois:

```tsx
it('a divisão fica recolhida num botão discreto, que abre "Dividir em" com o foco na data (§21.5)', async () => {
  const user = userEvent.setup();
  render(<Harness inicial={fixa} espiao={vi.fn()} />);
  expect(screen.queryByText("A base mudou ao longo do tempo?")).toBeNull();
  expect(screen.queryByLabelText("Dividir em")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Dividir a base em períodos" }));
  expect(document.activeElement).toBe(screen.getByLabelText("Dividir em"));
  expect(screen.getByRole("button", { name: "Dividir" })).toBeDefined();
  expect(screen.queryByRole("button", { name: "Dividir a base em períodos" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Ajuda: Dividir em" }));
  expect(screen.getByText(/A data informada passa a iniciar um período novo da base/)).toBeDefined();
});

it("depois de dividir, o campo recolhe e o foco volta ao botão; com erro, o campo fica aberto (§21.5)", async () => {
  const user = userEvent.setup();
  render(<Harness inicial={{ ...fixa, valor: "500.00" }} espiao={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "Dividir a base em períodos" }));
  fireEvent.change(screen.getByLabelText("Dividir em"), { target: { value: "2025-01-01" } });
  await user.click(screen.getByRole("button", { name: "Dividir" }));
  expect(screen.queryByLabelText("Dividir em")).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Dividir a base em períodos" }));
  // a mesma data de novo: o aviso embaixo do campo, que continua aberto
  await user.click(screen.getByRole("button", { name: "Dividir a base em períodos" }));
  fireEvent.change(screen.getByLabelText("Dividir em"), { target: { value: "2025-01-01" } });
  await user.click(screen.getByRole("button", { name: "Dividir" }));
  expect(screen.getByRole("alert").textContent).toBe("Já existe uma divisão em 01/01/2025.");
  expect(screen.getByLabelText("Dividir em")).toBeDefined();
});
```

Nos demais testes do arquivo que usam `getByLabelText("Dividir em")`, acrescentar antes `await user.click(screen.getByRole("button", { name: "Dividir a base em períodos" }));` (`grep -n '"Dividir em"' src/ui/secoes/Base.test.tsx`); a expectativa `queryByText("A base mudou ao longo do tempo?")` do teste "dividir: um bloco por período…" sai (o texto não existe mais em caso algum).

- [ ] **Passo 2: Ver falhar**

Rodar: `npx vitest run src/ui/secoes/Base.test.tsx`
Esperado: FALHA (não há o botão "Dividir a base em períodos"; o campo "Dividir em" está sempre à vista).

- [ ] **Passo 3: Implementar**

`Campo.tsx`: `autoFocus?: boolean` no tipo das props de `CampoTexto` (vai pelo `...resto`) e de `CampoArea` (passado ao `<textarea>`). `Base.tsx`: `const [dividindo, setDividindo] = useState(false)`; recolhido, `<div className="linha dividir-base">` com `<button type="button" className="botao discreto">Dividir a base em períodos</button>`; aberto, o `CampoTexto` "Dividir em" de hoje, com `autoFocus`, e o botão "Dividir"; na divisão bem-sucedida, `setDividindo(false)` e o foco volta ao botão discreto (um `useRef` marca que deve focar, e um `useEffect` em `dividindo` foca o botão ao recolher, como `focarIncluir` em `TabelaLancamentos.tsx`); sai a nota "A base mudou ao longo do tempo?" e a regra CSS dela; o comentário do topo do arquivo cita a §21.5.

- [ ] **Passo 4: Ver passar e verificar**

Rodar: `npm run verificar`
Esperado: verde.

- [ ] **Passo 5: Commit**

```bash
git add src/ui/componentes/Campo.tsx src/ui/secoes/Base.tsx src/ui/secoes/Base.test.tsx src/ui/estilos.css
git commit -m "ui: divisão da base recolhida no botão \"Dividir a base em períodos\" (§21.5)"
```

---

### Task 6: Observações recolhidas (F)

**Arquivos:**
- Modificar: `src/ui/secoes/Encargos.tsx:143-150` (botão discreto; caixa sem ⓘ; foco)
- Testes: `src/ui/secoes/Encargos.test.tsx`, `src/ui/RelatorioNaTela.test.tsx:52`

**Interfaces:**
- Consome: `CampoArea` com `autoFocus` (Task 5).

- [ ] **Passo 1: Escrever os testes que falham**

Em `src/ui/secoes/Encargos.test.tsx`:

```tsx
it("as observações ficam recolhidas: o botão abre a caixa, com o foco nela e sem balão ⓘ (§21.6)", async () => {
  const user = userEvent.setup();
  const espiao = vi.fn();
  render(<Harness inicial={inicial} espiao={espiao} />);
  expect(screen.queryByLabelText("Observações para o relatório")).toBeNull();
  await user.click(screen.getByRole("button", { name: "+ Observações para o relatório" }));
  const caixa = screen.getByLabelText("Observações para o relatório");
  expect(document.activeElement).toBe(caixa);
  expect(screen.queryByRole("button", { name: "+ Observações para o relatório" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Ajuda: Observações para o relatório" })).toBeNull();
  await user.type(caixa, "Conforme a sentença.");
  expect(espiao.mock.lastCall?.[0].observacoes).toBe("Conforme a sentença.");
});

it("com observações, a caixa já vem aberta, sem tomar o foco (§21.6)", () => {
  render(<Harness inicial={{ ...inicial, observacoes: "Conforme o acordo." }} espiao={vi.fn()} />);
  const caixa = screen.getByLabelText("Observações para o relatório") as HTMLTextAreaElement;
  expect(caixa.value).toBe("Conforme o acordo.");
  expect(document.activeElement).not.toBe(caixa);
  expect(screen.queryByRole("button", { name: "+ Observações para o relatório" })).toBeNull();
});

it("no App: 'Novo cálculo' recolhe as observações, e abrir o cálculo que as tem mostra a caixa aberta (§21.6)", async () => {
  const user = userEvent.setup();
  render(<App ambiente={ambienteDeTeste({ armazenamento: armazenamentoEmMemoria() })} />);
  await user.type(screen.getByLabelText("Nº do processo"), "08000004620268120001");
  await user.click(screen.getByRole("button", { name: "+ Observações para o relatório" }));
  await user.type(screen.getByLabelText("Observações para o relatório"), "Conforme o acordo.");
  await user.click(screen.getByRole("button", { name: "Novo cálculo" }));
  expect(screen.queryByLabelText("Observações para o relatório")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Abrir" }));
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^Abrir 0800000-46/ }));
  expect((screen.getByLabelText("Observações para o relatório") as HTMLTextAreaElement).value).toBe("Conforme o acordo.");
});
```

No teste de hoje que digita nas observações (perto da linha 119), clicar antes em "+ Observações para o relatório". Em `src/ui/RelatorioNaTela.test.tsx:52`, o mesmo clique antes do `user.type`.

- [ ] **Passo 2: Ver falhar**

Rodar: `npx vitest run src/ui/secoes/Encargos.test.tsx src/ui/RelatorioNaTela.test.tsx`
Esperado: FALHA (a caixa está sempre aberta e tem ⓘ; não há o botão).

- [ ] **Passo 3: Implementar**

Em `Encargos.tsx`, um estado que nasce aberto quando `calculo.observacoes !== ""` e marca se foi aberto pelo botão; recolhido, `<div className="linha"><button type="button" className="botao discreto">+ Observações para o relatório</button></div>`; aberto, o `CampoArea` de hoje sem `ajuda` e com `autoFocus` só quando aberto pelo botão (a seção é remontada a cada "Novo cálculo" e "Abrir", e o estado recomeça dali); o comentário do topo cita a §21.6.

- [ ] **Passo 4: Ver passar e verificar**

Rodar: `npm run verificar`
Esperado: verde.

- [ ] **Passo 5: Commit**

```bash
git add src/ui/secoes/Encargos.tsx src/ui/secoes/Encargos.test.tsx src/ui/RelatorioNaTela.test.tsx
git commit -m "ui: observações recolhidas no botão \"+ Observações para o relatório\" (§21.6)"
```

---

### Task 7: Sem exemplos dentro dos campos; data vazia mais clara (A)

**Arquivos:**
- Modificar: `src/ui/secoes/Processo.tsx:89`, `src/ui/secoes/Base.tsx:307, 379, 421, 433`, `src/ui/secoes/LotePrestacoes.tsx:128, 138`, `src/ui/secoes/LotePagamentos.tsx:93` (saem os `placeholder`)
- Modificar: `src/ui/tabelas/TabelaLancamentos.tsx:389` (`prestacoes ? "pela base" : undefined`) e `:575` (sai)
- Modificar: `src/ui/tabelas/Personalizar.tsx:177` (`prestacao ? "apurado pela base" : undefined`) e `:190` (sai)
- Modificar: `src/ui/componentes/Campo.tsx:152-162` (`data-vazio` no `<input type="date">` em branco)
- Modificar: `src/ui/estilos.css:358-363` (comentário dos `::placeholder`; regra nova da data vazia)
- Testes: `src/ui/App.test.tsx`, `src/ui/componentes/Campo.test.tsx`, `scripts/estilos.test.ts`

**Interfaces:**
- Produz: `CampoTexto` com `tipo="date"` e `valor === ""` põe `data-vazio=""` no `<input>`; com valor, sem o atributo.

- [ ] **Passo 1: Escrever os testes que falham**

`src/ui/App.test.tsx`, `describe("sem exemplos dentro dos campos (§21.1)")`, com um ajudante `exemplos = (raiz: ParentNode = document) => [...raiz.querySelectorAll("[placeholder]")].map((c) => c.getAttribute("placeholder"))`:

1. "na tela, nenhum campo traz exemplo, em qualquer forma da base e nos dois modos do lote": App novo → `exemplos()` é `[]`; marcar "% do salário mínimo" → `[]`; "% dos rendimentos" → `[]`; na seção 4, "Meses em atraso" → `[]`.
2. "nas tabelas ficam só os textos que dizem o que acontece com o campo vazio": com "Valor fixado" 1.000,00, um lote de prestações de 05/08/2026 a 05/09/2026 e um de pagamentos de 400,00 em 05/09/2026: "+ Pagamento" → `exemplos()` é `[]` (Esc); "+ Prestação" → `["pela base"]` (Esc); clicar em "Editar vencimento da prestação de 05/09/2026 (05/09/2026)" → `[]` (Esc); "Editar valor da prestação de 05/09/2026 (R$ 1.000,00)" → `["pela base"]` (Esc); "Editar valor do pagamento de 05/09/2026 (R$ 400,00)" → `[]` (Esc).
3. "no Personalizar, só 'apurado pela base' e 'usa o rendimento padrão'": o lápis do pagamento → `exemplos(painel)` é `[]`; o da prestação → `["apurado pela base"]`; com a base em "% dos rendimentos" (30 e 2.000,00), o lápis da prestação → `["apurado pela base", "usa o rendimento padrão"]`.

(Os nomes exatos dos botões das células seguem o padrão "Editar <nome> (<texto exibido>)" que `Tabelas.test.tsx` já usa; confira com `grep -n "Editar " src/ui/tabelas/Tabelas.test.tsx`.)

`src/ui/componentes/Campo.test.tsx`:

```tsx
it("o campo de data em branco fica marcado (data-vazio), para o formato do navegador aparecer mais claro (§21.1)", () => {
  const { rerender } = render(<CampoTexto id="d" rotulo="Data" tipo="date" valor="" aoMudar={() => {}} />);
  expect(screen.getByLabelText("Data").hasAttribute("data-vazio")).toBe(true);
  rerender(<CampoTexto id="d" rotulo="Data" tipo="date" valor="2026-10-11" aoMudar={() => {}} />);
  expect(screen.getByLabelText("Data").hasAttribute("data-vazio")).toBe(false);
  rerender(<CampoTexto id="d" rotulo="Data" valor="" aoMudar={() => {}} />);
  expect(screen.getByLabelText("Data").hasAttribute("data-vazio")).toBe(false);
});
```

`scripts/estilos.test.ts`:

```ts
describe("sem exemplos dentro dos campos (§21.1)", () => {
  it("o campo de data em branco tem a cor discreta e o itálico dos textos dentro dos campos", () => {
    const vazio = declaracoes(bloco(css, '.campo input[type="date"][data-vazio]'));
    expect(vazio.get("color")).toBe("var(--discreto)");
    expect(vazio.get("font-style")).toBe("italic");
  });
});
```

- [ ] **Passo 2: Ver falhar**

Rodar: `npx vitest run src/ui/App.test.tsx src/ui/componentes/Campo.test.tsx scripts/estilos.test.ts`
Esperado: FALHA (os exemplos ainda estão nos campos; não há `data-vazio` nem a regra CSS).

- [ ] **Passo 3: Implementar**

Tirar os `placeholder` listados; `data-vazio={tipo === "date" && valor === "" ? "" : undefined}` no `<input>` de `CampoTexto`; no CSS, o comentário de `::placeholder` passa a "o que acontece com o campo vazio ("pela base"): mais claro e em itálico, para não parecer um valor digitado", e logo abaixo a regra `.campo input[type="date"][data-vazio] { color: var(--discreto); font-style: italic; }`, com um comentário de uma linha (o formato do navegador, "dd/mm/aaaa", fica claro enquanto a data está em branco ou pela metade, §21.1).

- [ ] **Passo 4: Ver passar e verificar**

Rodar: `npm run verificar`
Esperado: verde.

- [ ] **Passo 5: Commit**

```bash
git add src/ui/secoes/Processo.tsx src/ui/secoes/Base.tsx src/ui/secoes/LotePrestacoes.tsx src/ui/secoes/LotePagamentos.tsx src/ui/tabelas/TabelaLancamentos.tsx src/ui/tabelas/Personalizar.tsx src/ui/componentes/Campo.tsx src/ui/estilos.css src/ui/App.test.tsx src/ui/componentes/Campo.test.tsx scripts/estilos.test.ts
git commit -m "ui: campos sem exemplos dentro e a data em branco mais clara (§21.1)"
```

---

### Task 8: Balões ⓘ: menos e mais curtos (I)

**Arquivos:**
- Modificar: `src/ui/secoes/Processo.tsx:91` (sai a `ajuda` do Nº do processo; sai o import de `Ajuda` se ficar sem uso)
- Modificar: `src/ui/secoes/Base.tsx:312` (sai a `ajuda` de "Fixado em") e `:326` (texto da opção "nenhum")
- Modificar: `src/ui/secoes/Encargos.tsx:111, 122, 133` (texto da multa; saem as `ajuda` de honorários e de data de elaboração)
- Modificar: `src/ui/secoes/LotePrestacoes.tsx:89-97`, `src/ui/secoes/LotePagamentos.tsx:76-81` (textos)
- Modificar: `src/ui/tabelas/Personalizar.tsx:178-195` (a `ajuda` do pagamento sai do Valor e da Descrição; a Descrição da prestação ganha o texto novo)
- Testes: `src/ui/App.test.tsx`, `src/ui/secoes/Base.test.tsx:61-62`, `src/ui/secoes/Encargos.test.tsx`, `src/ui/secoes/Lotes.test.tsx`, `src/ui/tabelas/Personalizar.test.tsx`, `src/ui/secoes/Processo.test.tsx`

**Interfaces:** nenhuma nova.

Textos (literais, aspas retas):

- Reajuste anual, opção "nenhum": o texto 1, como confirmado pelo responsável ("Com índice (IPCA, INPC ou IGP-M), o valor é reajustado a cada 12 meses pelo acumulado dos 12 meses anteriores ao mês do reajuste, que por padrão é o da fixação. Com salário mínimo, acompanha a proporção entre o salário mínimo do mês do vencimento e o do mês da fixação."). Os textos das opções com índice e com salário mínimo não mudam.
- Multa: `Art. 523, §1º, do CPC (rito da penhora): 10% de multa e 10% de honorários sobre o total devido, um sem incidir sobre o outro. No rito da prisão, ponha 0 nos dois.`
- 4 · Prestações em atraso: `Cada lançamento se soma aos anteriores, e um mês já lançado não se repete. No intervalo, as prestações vencem todo mês no dia do primeiro vencimento (no último dia, nos meses mais curtos). "Meses em atraso" conta para trás a partir da data de elaboração: dia 5 e 3 meses, em 10/10/2026, lança ago, set e out/2026. 13º e férias: "+ Prestação", na tabela.`
- 5 · Pagamentos: `Lança um pagamento por mês, do primeiro ao último pagamento, no dia do primeiro (no último dia do mês, quando ele é mais curto). Mês que já tem pagamento não é repetido: um segundo pagamento no mesmo mês entra pelo "+ Pagamento", na tabela ao lado.`
- Personalizar prestação, Descrição: `13º e férias: lance por "+ Prestação" e descreva aqui.`

- [ ] **Passo 1: Escrever os testes que falham**

`src/ui/App.test.tsx`:

```tsx
it("a tela principal em valor fixo tem 8 balões ⓘ, na ordem da tela (§21.9)", () => {
  render(<App ambiente={ambienteDeTeste()} />);
  expect(screen.getAllByRole("button", { name: /^Ajuda: / }).map((b) => b.getAttribute("aria-label"))).toEqual([
    "Ajuda: Reajuste anual",
    "Ajuda: Metodologia de encargos",
    "Ajuda: IGP-M e juros de 1% ao mês em todo o período",
    "Ajuda: Multa (art. 523, %)",
    "Ajuda: Prestações em atraso",
    "Ajuda: Pagamentos",
    "Ajuda: Prestações",
    "Ajuda: Amortizações (pagamentos)",
  ]);
});
```

Cada texto novo, conferido inteiro ao abrir o balão (`expect(screen.getByRole("status").textContent).toBe(…)`, como em `Ajuda.test.tsx`): o do Reajuste anual em `Base.test.tsx` (troca a expectativa `/Sem reajuste, o valor fixado vale igual/` de hoje), o da multa em `Encargos.test.tsx`, os das seções 4 e 5 em `Lotes.test.tsx` e o da Descrição da prestação em `Personalizar.test.tsx`. E as ausências: em `Processo.test.tsx`, a região "1 · Processo" sem nenhum botão `/^Ajuda: /`; em `Base.test.tsx`, sem "Ajuda: Fixado em"; em `Encargos.test.tsx`, sem "Ajuda: Honorários (%)" e sem "Ajuda: Data de elaboração"; em `Personalizar.test.tsx`, o painel do pagamento sem "Ajuda: Valor pago" e sem "Ajuda: Descrição (opcional)", e o da prestação ainda com "Ajuda: Valor informado à mão (opcional)".

- [ ] **Passo 2: Ver falhar**

Rodar: `npx vitest run src/ui/App.test.tsx src/ui/secoes src/ui/tabelas/Personalizar.test.tsx`
Esperado: FALHA (depois das Tasks 3, 5 e 6, a tela ainda tem 12 balões: os oito da lista mais "Nº do processo", "Fixado em", "Honorários (%)" e "Data de elaboração"; os textos são os de hoje).

- [ ] **Passo 3: Implementar**

Trocar e tirar as `ajuda` listadas; os comentários dos componentes que falam dos balões citam a §21.9.

- [ ] **Passo 4: Ver passar e verificar**

Rodar: `npm run verificar`
Esperado: verde.

- [ ] **Passo 5: Commit**

```bash
git add src/ui/secoes src/ui/tabelas/Personalizar.tsx src/ui/tabelas/Personalizar.test.tsx src/ui/App.test.tsx
git commit -m "ui: balões ⓘ podados e encurtados: 8 na tela principal (§21.9)"
```

---

### Task 9: Tipografia: cinco tamanhos, nada em maiúsculas (C)

**Arquivos:**
- Modificar: `src/ui/estilos.css` (só `font-size`, `text-transform`, `letter-spacing`, o espaço interno do título das tabelas, uma regra nova para `.dialogo h3` e `--cabecalhos-da-tabela`)
- Testes: `scripts/estilos.test.ts`

**Interfaces:** nenhuma. `colunasQueCabem` (`Indicadores.tsx`) mede o maior valor (`.valor`) com o tamanho que o CSS der; não muda.

Tamanhos (T3), seletor a seletor; `text-transform: uppercase` e o `letter-spacing` que o acompanha saem de todos:

| Seletor | Hoje | Novo |
|---|---|---|
| `.rotulo-do-campo, .grupo > legend` · `.rotulo-estatico` | 11,5 px, maiúsculas | 13 px |
| `.secao > h2, .secao > .titulo-secao > h2` | 12 px, maiúsculas | 17 px (verde, como hoje) |
| `.tabela-rolagem > .titulo-secao > h2` | 14 px | 17 px; o espaço interno de `.tabela-rolagem > .titulo-secao` passa a `8px 12px 2px` (T4) |
| `.dialogo > h2` | 16 px | 17 px |
| `th` | 10,5 px, maiúsculas | 13 px |
| `.indicador dt` | 10,5 px, maiúsculas | 13 px (o `min-height: 2.4em` fica) |
| `.indicador dd` | 18 px | 17 px |
| `.avisos h2` | 13 px, maiúsculas | 15 px, negrito |
| `.periodo > h3, .titulo-do-periodo > h3` | 13 px | 15 px |
| `.dialogo h3` (regra nova; hoje vale o tamanho padrão do navegador, cerca de 17,5 px) | — | 15 px |
| `td.dica` · `.celula-em-edicao .erro` · `.campo-linha-nova .erro` | 12 px | 13 px |
| `.rodape` | 12,5 px | 13 px |
| `.etiqueta` | 11 px | 12 px |
| `.marca small` | 12,5 px | 12 px |
| `.marca` em `@media (max-width: 1023px)` | 20 px | sai a declaração de tamanho (fica 22 px) |
| `.tela-de-erro h1` | 20 px | 22 px |
| `--cabecalhos-da-tabela` (`:root`) | 62px | 66px (T4; a Task 10 mede) |

- [ ] **Passo 1: Escrever os testes que falham**

`scripts/estilos.test.ts` (o `@media print` fica de fora: é a impressão, que não muda):

```ts
describe("tipografia da tela (§21.3)", () => {
  const tela = regras(css)
    .filter((r) => r.cabecalho !== "@media print")
    .map((r) => `${r.cabecalho} { ${r.corpo} }`)
    .join(" ");

  it("a tela usa só cinco tamanhos de letra: 12, 13, 15, 17 e 22 px", () => {
    const tamanhos = new Set([...tela.matchAll(/font-size:\s*([^;}]+)/g)].map((m) => m[1]?.trim()));
    expect([...tamanhos].sort()).toEqual(["12px", "13px", "15px", "17px", "22px"]);
  });

  it("nenhum texto da tela em maiúsculas forçadas", () => {
    expect(tela).not.toMatch(/text-transform:\s*uppercase/);
  });

  it("rótulos e legendas em 13 px; títulos das seções e das tabelas em 17 px; cabeçalhos das tabelas e rótulos dos indicadores em 13 px", () => {
    expect(declaracoes(bloco(css, ".rotulo-do-campo, .grupo > legend")).get("font-size")).toBe("13px");
    const titulo = declaracoes(bloco(css, ".secao > h2, .secao > .titulo-secao > h2"));
    expect(titulo.get("font-size")).toBe("17px");
    expect(titulo.get("color")).toBe("var(--verde)");
    expect(declaracoes(bloco(css, ".tabela-rolagem > .titulo-secao > h2")).get("font-size")).toBe("17px");
    expect(declaracoes(bloco(css, "th")).get("font-size")).toBe("13px");
    expect(declaracoes(bloco(css, ".indicador dt")).get("font-size")).toBe("13px");
  });

  it("o título da tabela continua em 35 px, e a reserva dos cabeçalhos presos acompanha a linha de títulos maior (§20.3)", () => {
    const raiz = declaracoes(bloco(css, ":root"));
    expect(raiz.get("--titulo-da-tabela")).toBe("35px");
    expect(raiz.get("--cabecalhos-da-tabela")).toBe("66px");
    expect(declaracoes(bloco(css, ".tabela-rolagem > .titulo-secao")).get("padding")).toBe("8px 12px 2px");
  });
});
```

(`bloco` junta as regras de mesmo cabeçalho; `th` aparece sozinho e também em `th, td`: o teste lê a regra `th` sozinha, que define o tamanho dos cabeçalhos. `.tabela-rolagem > .titulo-secao` tem uma regra na base e outra dentro do `@media` da coluna presa; `bloco(css, …)` lê só a de primeiro nível, a do espaço interno.)

- [ ] **Passo 2: Ver falhar**

Rodar: `npx vitest run scripts/estilos.test.ts`
Esperado: FALHA (hoje há 10,5, 11, 11,5, 12, 12,5, 13, 14, 15, 16, 18, 20 e 22 px, e seis regras com maiúsculas).

- [ ] **Passo 3: Implementar**

Aplicar a tabela acima. Os comentários do CSS que falarem de tamanho citam a §21.3; o do `:root` sobre `--cabecalhos-da-tabela` passa a dizer "35 px do título mais a linha de títulos de cerca de 29,9 px (13 px), com 1 px de folga".

- [ ] **Passo 4: Ver passar e verificar**

Rodar: `npm run verificar`
Esperado: verde. A conferência visual (cabem os cartões? o título da tabela não corta? a barra cabe numa linha em 1024 px?) é da Task 10.

- [ ] **Passo 5: Commit**

```bash
git add src/ui/estilos.css scripts/estilos.test.ts
git commit -m "ui: tipografia da tela em cinco tamanhos, sem maiúsculas miúdas (§21.3)"
```

---

### Task 10: Conferência no navegador integrado

**Arquivos:** nenhum, salvo correção (com teste) do que a conferência achar.

- [ ] **Passo 1:** subir o app pelo preview do app (`.claude/launch.json` com `npm run dev`; criar se não existir) e montar o caso fictício: base em valor fixo de R$ 1.000,00 fixada em 10/01/2025, sem reajuste; lote de prestações de 05/01/2025 a 05/09/2026; lote de pagamentos de R$ 400,00 de 10/03/2025 a 10/08/2026; defensor(a) "Defensor(a) de teste" e órgão "Defensoria de teste".
- [ ] **Passo 2:** em 1440×900, 1024×600 e 375 px, nos temas claro e escuro (pelo botão de tema, nas três posições), conferir e anotar: tela vazia (antes dos lotes) sem frases nas tabelas e sem caixa de avisos; campos sem exemplos, datas em branco mais claras; rótulos, títulos e cabeçalhos em caixa normal nos tamanhos da T3; os cinco cartões dos indicadores com o valor inteiro numa linha (com "R$ 12.345,67" ou mais no total devido) e a arrumação de `colunasQueCabem` certa (5, 3 + 2, 2 + 2 + 1 ou 1); o título das tabelas sem corte em 35 px e a linha de títulos presa logo abaixo, sem sobrar nem faltar espaço (medir a altura real de `.tabela-rolagem > .titulo-secao` e da linha de títulos com `getBoundingClientRect`; se `--cabecalhos-da-tabela` não bater com a soma arredondada para cima mais 1 px, corrigir o valor e o teste da Task 9); em 1024 px, a barra numa linha só; o ícone do tema nítido, sem borda, com o anel de foco ao navegar com Tab; "Dividir a base em períodos" e "+ Observações para o relatório" discretos, abrindo com o foco no campo; a seção 1 só com os campos; o painel "Abrir" com a frase dos recentes; 8 balões ⓘ na tela principal; pagamentos sem "Pagamento parcial"; relatório e impressão como antes (abrir "Relatório / PDF" e conferir que nada mudou de tamanho).
- [ ] **Passo 3:** se algo precisar de ajuste, teste primeiro (jsdom ou `scripts/estilos.test.ts`), depois o código, `npm run verificar` e commit "ui: …".
- [ ] **Passo 4 (opcional, se o responsável quiser):** a skill `impeccable` (critique) sobre `src/ui/App.tsx`, para comparar com a nota de 24/10/2026 (28/40); o resultado vai ao responsável, sem mudança de código nesta fase.

---

### Task 11: Registro: versão 0.1.3, CHANGELOG, design, roteiro e CLAUDE.md

**Arquivos:**
- Modificar: `package.json`, `package-lock.json` (`npm version 0.1.3 --no-git-tag-version --ignore-scripts`)
- Modificar: `CHANGELOG.md` (seção `## [0.1.3] · AAAA-MM-DD`, com a data da integração)
- Modificar: `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md` (§21 nova e apontadores)
- Modificar: `docs/superpowers/roteiro.md`, `CLAUDE.md`, este plano (seção "Estado")

- [ ] **Passo 1: Versão.** Rodar `npm version 0.1.3 --no-git-tag-version --ignore-scripts`; `npx vitest run scripts/versao.test.ts` deve FALHAR (sem a seção do CHANGELOG).
- [ ] **Passo 2: CHANGELOG.** Seção 0.1.3, "Limpeza da tela (§21 do design). Os números não mudam.", em linguagem de quem usa, um item por decisão: campos sem exemplos; tabelas vazias só com título e botão; letras maiores e sem maiúsculas miúdas; defensor(a), órgão e os cinco últimos cálculos sempre guardados neste navegador (o "Abrir" lembra de limpar em computador compartilhado); divisão da base e observações atrás de um botão; tema num ícone (☀ ☾ ◐), com "igual ao computador"; pagamentos em lote sem a descrição "Pagamento parcial"; menos balões ⓘ, mais curtos. `npx vitest run scripts/versao.test.ts` passa.
- [ ] **Passo 3: Design.** Nova "## 21. Limpeza da tela (fase 7c)", no modelo da §20: abertura (decidida pelo responsável em 24 e 25/10/2026, depois de uma avaliação de design; onde divergir das anteriores, vale esta; motor só nas duas linhas da §21.2 e da §21.8; relatório e impressão sem mudança; versão 0.1.3) e uma subseção por decisão, com o que ela revoga: §21.1 Sem exemplos dentro dos campos (A e T5; revoga a parte da §9.4 sobre os exemplos); §21.2 Tela vazia (B, T1, T2); §21.3 Tipografia (C, T3, T4, com a tabela de tamanhos); §21.4 Defensor(a), órgão e recentes (D, T7, T8, com os dois textos; revoga as opções da §5.5 e da §9.2); §21.5 Divisão da base recolhida (E, T6; revoga a linha "A base mudou ao longo do tempo?" da §17.2); §21.6 Observações recolhidas (F, T6); §21.7 Botão de tema (G, T9; revoga o nome "do sistema" da §9.4); §21.8 Sem "Pagamento parcial" (H, T10; muda a §6.2); §21.9 Balões ⓘ (I, com os textos novos e a lista dos que ficam; 16 → 8); §21.10 Testes e conferência (o que o jsdom prova, o que o navegador conferiu, Safari e Firefox não conferidos); §21.11 Registro. Apontadores "(revisto na fase 7c, §21.x)" nas passagens que ficaram desatualizadas: §5.2 (o exemplo de descrição "Pagamento parcial"), §5.5, §6.2, §9.2 (item 1), §9.4 (exemplos dentro dos campos; nome do tema), §14 ("desligáveis"), §15 (linha "Computador compartilhado expõe recentes": "Limpar recentes" e a frase no "Abrir"), §17.2 ("A base mudou ao longo do tempo?"), §17.3 ("Sobrevive a 'Esquecer'…"), §18.3 item 4 (o exemplo "10/02/2025 · Pagamento parcial" continua válido para arquivo antigo; o lote novo não põe descrição) e §20.2 (as frases das tabelas vazias). Na §16, o item "7c · Limpeza da tela (§21); versão 0.1.3".
- [ ] **Passo 4: Roteiro e CLAUDE.md.** No roteiro, a linha "7c · Limpeza da tela | sem exemplos nos campos, tela vazia sem repetição, tipografia sem maiúsculas miúdas, defensor(a), órgão e recentes sempre guardados, divisão da base e observações recolhidas, tema em ícone, lote de pagamentos sem descrição, balões ⓘ podados; versão 0.1.3 (§21 do design) | concluída em AAAA-MM-DD · plano: `docs/superpowers/plans/2026-10-25-fase-7c-limpeza-da-tela.md`". No `CLAUDE.md`, seção "Estado": um parágrafo da fase 7c, no estilo dos anteriores, com a contagem de testes medida (`npx vitest run | grep Tests`); e corrigir as menções que ficaram falsas ("com \"Esquecer\"", "tema do sistema", "sobrevive a \"Esquecer\""). Neste plano, a seção "Estado" com o que foi feito, a contagem e o que ficou de fora.
- [ ] **Passo 5: Verificar e commit.** `npm run verificar` verde; commit `docs: fase 7c (limpeza da tela) no design (§21), no roteiro e no CLAUDE.md; versão 0.1.3`.

---

### Task 12: Integração (superpowers:finishing-a-development-branch)

- [ ] **Passo 1:** trazer para a branch os commits do robô da `main` do GitHub (`dados/indices/` e `docs/monitoramento/`), pelo `sync_with_base_branch` do app (a sessão está numa worktree do app); `npm run verificar` verde de novo. Não rodar `npm run indices:atualizar`.
- [ ] **Passo 2:** revisão independente da branch inteira (superpowers:requesting-code-review), contra este plano e a §21; o que ela achar de importante é corrigido com teste antes do merge, e o que mudar texto ou regra aprovada vai ao responsável.
- [ ] **Passo 3 ⚑:** perguntar ao responsável se pode mesclar na `main` local; só com o sim, atualizar antes a `main` local com a `origin/main` (avanço simples, só os commits do robô) e então mesclar a branch.
- [ ] **Passo 4 ⚑:** perguntar se pode enviar a `main` ao GitHub (o Cloudflare publica o site em seguida); só com o sim. Depois do envio, conferir o `testes.yml` verde e o `https://apura-dpems.pages.dev/versao.json` com a versão 0.1.3.
- [ ] **Passo 5 ⚑:** perguntar se pode pôr a etiqueta `v0.1.3` no commit publicado e enviá-la; só com o sim.

---

## Estado

Plano escrito em 25/10/2026, a partir da `main` do GitHub em `9c4fbb6` (índices de 24/10/2026), com 1022 testes passando e 10 pulados em 61 arquivos. Sem ensaio do código numa cópia fora do repositório (as fases 5b a 7b tiveram um): as decisões vieram fechadas, e o que depende de medida (T4) é medido na Task 10. Os dois textos novos (balão do reajuste "nenhum" e aviso da seção 1 sem armazenamento) foram aprovados como estão pelo responsável em 25/10/2026. Execução por subagentes (escolha do responsável), tarefa a tarefa, orquestrada por workflow, com uma revisão independente por tarefa.

Tasks 1 a 9 executadas em 25/10/2026 na branch `claude/apura-fase-7c-limpeza-e4e45e`, a partir de `03d27f2` (commits `f27bb8f`, `5a3ed8e`, `0d59361`, `747362c`, `4c96ee7`, `4781a70`, `6464af8` e `2dbd103`, `cf5423b`, `b524e67` e `ff64a43`): cada uma com o teste falhando antes do código, `npm run verificar` verde e a revisão sem achado crítico nem importante. Desvios do plano, aceitos: a Task 1 ajustou também `Abrir.test.tsx` e dois testes do `App.test.tsx` que liam a caixa "Avisos" do cálculo em branco, que deixou de existir; a Task 2 tirou `"descricao": "Pagamento parcial"` dos quatro pagamentos de origem "lote" do caso `src/motor/casos/2026-10-11-saj-tjms-inpc-salario-minimo-lotes.json`, porque `src/motor/casos-pela-base.test.ts` compara com `toEqual` o lote gerado com o caso (nenhum número mudou; os pagamentos avulsos e os demais casos mantêm a descrição; registrado na §21.8 do design); a Task 3 tirou de `Processo.tsx` os imports de `Ajuda` e `Opcao` que ficaram sem uso (o plano supunha o de `Ajuda` vivo até a Task 8); a Task 8 foi interrompida uma vez por falha do classificador do modo automático, não por defeito, recomeçou do zero e criou o ajudante `src/ui/testes/texto-do-balao.ts`; as Tasks 7 e 9 tiveram um segundo commit, só de testes (a abertura dos campos conferida; os tamanhos regra a regra). O aviso da seção 1 sem armazenamento e o balão do reajuste "nenhum" ficaram como o responsável aprovou.

Task 10 (conferência no navegador integrado, 25/10/2026), sem mudança de código, com o caso fictício do passo 1 (detalhes na §21.10 do design): em 1440×900, tela vazia sem frases nas tabelas e sem caixa de avisos, cinco tamanhos de letra em uso (12, 13, 15, 17 e 22 px) e nada em maiúsculas, 8 balões, nenhum texto dentro dos campos, datas em branco claras e em itálico, pagamentos sem descrição, cinco cartões numa linha, título das tabelas com 35 px sem corte e linha de títulos de 29,34 px (o que confirma os 66 px de `--cabecalhos-da-tabela`: 35 + 29,34, arredondado para cima, mais 1 px), painel "Abrir" com a frase dos recentes, preferências gravadas só com defensor, órgão, tema e metodologia, temas claro e escuro vistos; em 1024×600, no escuro, barra numa linha (64 px), cartões em 3 + 2, tabelas rolando de lado (como na 7b), títulos sem corte; em 375 px, medido por script (o painel do navegador foi escondido no app e deixou de pintar), página sem rolagem lateral, barra solta, subtítulo da marca numa linha, tabelas rolando de lado, e o cálculo de `colunasQueCabem` com as medidas reais dá 2 colunas (2 + 2 + 1); o relatório aberto não herdou nenhum estilo da tela (cabeçalhos com os 9,5 px e as maiúsculas próprios). Não conferidos: o tema claro em 1024×600, o celular em imagem, e o Safari e o Firefox (data vazia e ícones). Botão do tema com 34 × 34 px; os vizinhos têm 36 px de altura.

Task 11 (registro, 25/10/2026): versão 0.1.3 (`package.json` e `package-lock.json`) com a seção no `CHANGELOG.md`; §21 do design, com os apontadores "(revisto na fase 7c, §21.x)" nas passagens antigas (§5.2, §5.5, §6.2, §9.2, §9.4, §14, §15, §17.2, §17.3, §18.3 e §20.2) e o item da 7c na §16; a linha da fase no roteiro e o `CLAUDE.md` (o parágrafo da 7c, o ajudante novo no mapa de pastas e as menções que tinham ficado falsas: "Esquecer", "tema do sistema"). Contagem: `Tests  1046 passed | 10 skipped (1056)`, 61 arquivos (eram 1022 passando e 10 pulados, nos mesmos 61 arquivos).

Ficou de fora, como decidido: o "R$" nas células; os dois indicadores destacados; as observações em outra seção; os juros com 6 casas, a ordem e a numeração das seções e as cores; um botão ou menu de preferências. Os achados menores das revisões das tarefas, adiados, ficam para a revisão da branch na Task 12 (entre eles: aberto, "Dividir em" só recolhe com uma divisão bem-sucedida, e a caixa das observações não recolhe mais; o botão do tema 2 px mais baixo que os vizinhos; o comentário de `--cabecalhos-da-tabela` em `estilos.css`, que fala na linha de títulos de "cerca de 29,9 px", medida em 29,34). Falta a Task 12: trazer os commits do robô da `main`, a revisão independente da branch e, cada um com o sim do responsável, o merge, o envio ao GitHub e a etiqueta `v0.1.3`.

## Auto-revisão do plano

- **Cobertura:** A → Task 7 (e a data vazia, T5); B → Task 1; C → Task 9; D → Task 3; E → Task 5; F → Task 6; G → Task 4 (o aviso sem armazenamento não cita o nome antigo, conferido); H → Task 2; I → Task 8 (a contagem de 8 depende das Tasks 3, 5 e 6, que vêm antes); registro → Task 11; conferência visual → Task 10; integração e perguntas → Task 12; "fica de fora" → nenhuma tarefa toca o "R$", os destaques, a seção das observações, as casas dos juros, a ordem ou as cores.
- **Tipos e nomes:** `Preferencias` sem `lembrar`/`guardarRecentes` (Task 3) é usado por `App.tsx` nas Tasks 3 e 4; `autoFocus` (Task 5) é usado na Task 6; `data-vazio` (Task 7) é lido pelo CSS e pelo teste da mesma tarefa; `IconeDoTema` e `data-icone` (Task 4) só nela.
- **Riscos que a revisão deve olhar:** a lista dos 8 balões (Task 8) depende da ordem da tela; o `--cabecalhos-da-tabela` de 66 px é estimado e medido na Task 10; o efeito colateral da data digitada pela metade (T5); a tabela de prestações em 1366 px com os cabeçalhos em 13 px (os números não mudam de tamanho, mas um cabeçalho mais largo que a coluna de números alargaria a tabela; Task 10).
