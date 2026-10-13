# Apura · Fase 5b · Ajustes da interface depois do uso — plano de implementação

> **Para agentes executores:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa a tarefa. Os passos usam caixas de seleção (`- [ ]`) para acompanhamento.

**Objetivo:** quatro ajustes pedidos pelo responsável depois de usar a interface da fase 5: o pagamento sugerido no mês seguinte ao do último, a base dos alimentos por períodos, a escolha da metodologia padrão de encargos guardada no navegador e as etiquetas das linhas numa linha só.

**Arquitetura:** a base do `Calculo` deixa de ser uma forma só e vira uma lista de períodos seguidos (`base: { periodos: [{ de, ate, forma }] }`); o motor escolhe o período pelo vencimento e faz, dentro dele, a mesma conta de antes (`apurarPelaBase` em `src/motor/base.ts`). A tela edita os períodos por um módulo puro novo (`src/ui/estado/base.ts`), no padrão do editor de períodos dos encargos. As metodologias pré-carregadas viram duas (`lei-14905-2024.v1.json` e `igpm-juros-1.v1.json`), reconhecidas pelo conteúdo; a escolha fica nas preferências do navegador. As etiquetas saem de um módulo puro (`src/ui/tabelas/etiquetas.ts`) e abrem o balão de `Ajuda.tsx`, que ganha um modo flutuante.

**Tecnologia:** TypeScript estrito, React 19, Vite, Vitest (Node e jsdom), Testing Library, decimal.js. Nenhuma dependência nova.

**Especificação:** `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md`, seção 17 (fase 5b), com as seções anteriores para o que ela não muda. Leia a §17 inteira antes de começar.

## Restrições globais (valem para todas as tarefas)

- As do `CLAUDE.md` (regras obrigatórias 1 a 9) e as "Restrições globais" do plano da fase 5 (`docs/superpowers/plans/2026-10-12-fase-5-interface.md`): TDD; dinheiro, percentuais e fatores em `Decimal` (só de `src/compartilhado/decimal.ts`) ou texto decimal com ponto; datas como texto ISO; motor puro (sem `Date`, `fetch`, DOM ou armazenamento); relógio, ids e armazenamento pelo `Ambiente`; nenhum teste com rede nem com os últimos meses de `dados/indices/`; rótulos exatos (os testes os procuram por texto); ajuda nos balões ⓘ; validação sem pop-up; a tela não menciona outros sistemas (nada de "SAJ" nos textos).
- **Sem retrocompatibilidade** (decisão do responsável, §17.2): o formato do arquivo continua `apura/calculo@1`, já com a base por períodos; arquivo ou recente com a base antiga é recusado na abertura. Não escreva conversão de formato antigo.
- Os casos de referência (`src/motor/casos/*.json`) só têm reescritos o campo `calculo.base` (Task 2) e o id e o nome da metodologia (Task 5); o `esperado` de cada caso não muda, e os números continuam idênticos. O Prettier ignora essa pasta de propósito.
- Imports relativos com `.ts`/`.tsx` e `import type` para tipos; testes de componente com `// @vitest-environment jsdom` na primeira linha.
- Commits em português, "módulo: o que muda", terminados com a linha de coautoria do modelo que de fato executa (`Co-Authored-By: <nome do modelo> <noreply@anthropic.com>`).
- Fora desta fase: relatório e PDF (fase 6; a §17 registra o que a fase 6 deve descrever), publicação (fase 7).

## Foco da revisão

Entradas que a especificação implica e que podem morder quem usa o Apura; cada uma tem teste na tarefa dona do código.

1. **Arquivo com a base fora do padrão** (base antiga de um item só, lista vazia, buraco ou sobreposição entre períodos, primeiro período com começo, último com fim): a abertura recusa com o nome do campo, e o motor, se receber algo assim, não trava (vencimento sem período fica "não computado", com aviso). → Task 2 (`arquivo.test.ts`, oito casos de base inválida; `base.test.ts`, "vencimento sem período" e "períodos sobrepostos").
2. **Dividir, juntar e trocar a forma em vários períodos** sem perder o que foi digitado nem misturar campos de um bloco com os de outro (rádios com o mesmo nome, ids repetidos, rascunho do bloco errado depois de remover a divisão do meio). → Task 3 (`Base.test.tsx`, "remover a divisão…", "dividir…", "o campo que falta fica em vermelho só no bloco do período apontado").
3. **"Aplicar este rendimento daqui em diante" fora de "% dos rendimentos"** ou numa linha que não existe mais: nada muda (nem a base, nem as linhas). → Task 4 (`calculo.test.ts`, final do teste do redutor).
4. **Preferências corrompidas ou de versão anterior** no navegador (metodologia "tjms-saj", texto estranho): vale a metodologia da Lei 14.905/2024, sem quebrar a tela; e um arquivo antigo com a metodologia marcada "ajustada" sem estar é lido como a opção certa. → Task 6 (`preferencias.test.ts`) e Task 5 (`arquivo.test.ts`).
5. **Datas no limite e telas baixas:** "Dividir em" 01/01/1900 (a base ou a metodologia) deixaria um período terminando em 1899, que o arquivo não reabre: a divisão é recusada com frase (Tasks 3 e 5, `base.test.ts` e `metodologia.test.ts`); o balão das etiquetas numa linha perto do pé da janela abre para cima (Task 7, `Ajuda.test.tsx`, e Task 8 no navegador).
6. **Descrição longa numa tela de notebook** (13º com observação comprida): a linha não quebra, e o lápis e o ✕ não saem da vista. O jsdom não mede larguras: → Task 8 (conferência no navegador, com a medida da tabela) e Task 7 (teste do `title` e do balão com a descrição inteira).

---

## Para o responsável: o que esta fase entrega, o que foi decidido e o que foi descoberto

Ao fim da fase 5b: "+ Pagamento" sugere o mês seguinte ao do último pagamento; a base dos alimentos pode mudar ao longo do tempo (por exemplo, valor fixo até 2024 e 30% do salário mínimo desde 2025), com cada prestação calculada pela regra da época do vencimento e a memória da linha dizendo qual período valeu; a metodologia de encargos se escolhe entre duas opções na seção 5, e a escolha fica guardada para os próximos cálculos; e as linhas das tabelas ficam sempre numa linha só, com a etiqueta mais importante e um balão com o resto. A contagem de testes vai de 809 passando e 9 pulados (818, em 44 arquivos) para `Tests  859 passed | 10 skipped (869)`, `Test Files  46 passed (46)`. O décimo teste pulado é o do caso de referência novo, que não traz avisos do resultado (os outros nove são, desde a fase 3, os casos sem `esperado.avisos`).

**Decisões suas, de 13/10/2026 (D1 a D11):**

- **D1 · Registro:** linha nova "5b · Ajustes da interface depois do uso" no roteiro, entre a 5 e a 6, com este plano.
- **D2 · "+ Pagamento"** (decidido antes do brainstorming): mês seguinte ao do último pagamento, no mesmo dia (último dia do mês quando ele é mais curto), com o valor dele; sem pagamento anterior, a data de elaboração. "+ Prestação" não muda. A data pode passar da data do cálculo; a pessoa a corrige na linha (Task 1).
- **D3 · Base por períodos** (o princípio foi decidido antes): os períodos são seguidos, o primeiro sem começo e o último sem fim; a pessoa só informa a data em que a base muda ("Dividir em"); cada prestação usa o período do vencimento; o valor informado à mão nunca é tocado (Task 2).
- **D4 · Seção 2:** os períodos se editam na própria seção; com um período só, ela é a de antes, mais "A base mudou ao longo do tempo? Dividir em" no pé; com dois ou mais, um bloco por período, com "Remover divisão" (Task 3).
- **D5 · "Aplicar este rendimento daqui em diante" divide a base** no vencimento da linha, com o novo rendimento padrão; as linhas seguem a regra, sem a marca "ajustada" (Task 4).
- **D6 · Sem retrocompatibilidade:** só você usou o Apura; o formato novo é o único (os seus recentes de teste não abrem: use "Limpar recentes" em "Abrir"). Os casos de referência têm só a base e o nome da metodologia reescritos (Tasks 2 e 5).
- **D7 · Duas metodologias**, com o arquivo da padrão renomeado de `tjms-saj.v1.json` para `lei-14905-2024.v1.json` (o nome diz de onde vem a regra); a segunda, "IGP-M e juros de 1% ao mês" em todo o período; **sem aviso** sobre 1% depois de 30/08/2024, só o balão ⓘ da opção (Tasks 5 e 6).
- **D8 · "Esquecer" não apaga a escolha da metodologia** (como o tema) (Task 6).
- **D9 · "Restaurar a metodologia padrão" volta à opção guardada** (Task 6).
- **D10 · Etiquetas:** uma só na linha, na ordem não computada → vincenda → valor informado → ajustada, com "+N"; todas no balão (Task 7).
- **D11 · A descrição encolhe até caber e abre o balão** (decidida depois da conferência no navegador do ensaio): na tela de 1366 px a coluna da direita tem cerca de 730 px; com a descrição em largura fixa, o lápis e o ✕ saíam da vista. A descrição fica com o espaço que sobra (cerca de "13º salári…" em 1366 px; inteira no celular, onde a tabela já rola), e a descrição e a etiqueta formam um botão só, que abre o balão com tudo, inclusive numa linha que só tem descrição (Task 7).

**Decisões técnicas deste plano, com o efeito na tela (reabra qualquer uma na revisão, se discordar):**

- **T1 · Nomes por dentro:** a união das três formas passa a se chamar `FormaDaBase`; `Base` passa a ser a lista de períodos; `Calculo.base` mantém o nome. Função nova do motor: `apurarPelaBase` (escolhe o período e chama a `apurarValorBase` de antes, que não muda).
- **T2 · Memória da linha:** com dois ou mais períodos, a frase do motor começa por "Base até 31/12/2024:", "Base de 01/01/2025 a 30/06/2025:" ou "Base desde 01/07/2025:"; a tela, nesse caso, não repete o rótulo "Base:" (Tasks 2 e 3).
- **T3 · Base incompleta (D29 da fase 5) por período:** o aviso diz o período ("Falta o percentual do salário mínimo no período desde 01/01/2025 (seção 2 · Base dos alimentos): as prestações desse período ficam sem valor até ele ser informado.") e só sai para o período em que vence alguma prestação pela base (Task 2).
- **T4 · Reconhecimento da metodologia pelo conteúdo:** períodos, índices, taxas (como número: "1.0" vale "1"), mês inicial, deflação e arredondamento; id e nome não contam. A abertura de arquivo normaliza a metodologia global e as próprias (recalcula "ajustada" e põe o nome da opção reconhecida). Isso resolve duas pendências da fase 5 (`ehPadrao` comparava a taxa como texto; o arquivo ditava `ajustada`) (Task 5).
- **T5 · Seção 5:** dois botões de opção com o texto das regras; ajustada, nenhum fica marcado, o título vira "Metodologia de encargos (ajustada)" e aparece "Ajustada: <resumo>"; clicar numa opção troca os ajustes por ela (como o "Restaurar" de antes) (Task 6).
- **T6 · Balão das etiquetas flutuante:** a tabela tem rolagem lateral própria, que cortaria um balão comum nas últimas linhas; o das etiquetas fica em posição fixa junto do botão (embaixo ou, se não couber, em cima), com altura máxima, e fecha ao rolar a página (ou a tabela) (Task 7).
- **T7 · Divisão em 01/01/1900 recusada** (base e metodologia), com "A data precisa ser posterior a 01/01/1900.": o período anterior acabaria em 1899, antes da primeira data que o arquivo aceita (Tasks 3 e 5).

**Limites registrados (não resolvidos nesta fase, por decisão):**

- Remover uma divisão da base não tem "desfazer" (como no editor dos encargos); o período removido some com o que tinha.
- Em telas de notebook a descrição mostra só o começo (D11); a inteira fica no balão, no `title` e no lápis.
- O balão das etiquetas fecha quando a página ou a tabela rolam.
- A fase 6 precisa descrever cada período da base no parágrafo "Base" e a metodologia escolhida sem a frase da transição quando for a segunda opção (§17.2 e §17.3).

**Ensaio:** todo o código deste plano foi escrito e executado em 13/10/2026 numa cópia do repositório fora dele, no fluxo de cada tarefa (teste que falha, código, `npm run verificar` verde, commit), e conferido no navegador integrado: base dividida em 01/01/2025 com R$ 500,00 até 2024 e 30% do salário mínimo desde 2025 (R$ 455,40), aviso do percentual em branco no período, memória com "Base desde 01/01/2025: …"; linha vincenda com valor informado, ajustada e descrição longa numa linha só, com "vincenda +2" e o balão flutuante com a descrição inteira e as três etiquetas (clique, Enter e Esc), em 1366 px (tabela de 730 px sem rolagem lateral, todas as linhas com a mesma altura), em 375 px (página sem rolagem lateral, descrição com o tamanho cheio, balão como faixa no pé da tela) e no tema escuro; seção 5 com as duas opções. Essa conferência achou o problema da descrição larga (D11), corrigido e conferido de novo. Depois, a fase foi reconstruída tarefa por tarefa numa segunda cópia, a partir de `24aba5d`, aplicando só os patches deste plano (primeiro os testes, para registrar o que falha; depois o código): os sete estados passam em `npm run verificar` com as contagens de cada tarefa, o estado final é idêntico ao do ensaio (`diff -r` vazio) e `npm run build` gera `dist/`. Uma revisão adversarial do código ensaiado, feita por um agente independente (com testes-sonda e conferência no navegador), achou três defeitos e uma suspeita, todos corrigidos no ensaio, com teste, dentro das tarefas donas do código: dividir a base (ou a metodologia, defeito anterior a esta fase) em 01/01/1900 deixava o período anterior terminando em 1899, e o cálculo salvo não reabria (agora a divisão é recusada com "A data precisa ser posterior a 01/01/1900."; Tasks 3 e 5); a primeira divisão da base e a remoção da última perdiam o que estava digitado nas outras formas do primeiro período, porque a seção mudava de estrutura (agora a estrutura é a mesma com um ou vários períodos; Task 3); uma mudança vinda de fora (o rendimento aplicado pelo lápis) podia ser desfeita pelo rascunho guardado do bloco ao trocar a forma e voltar (agora a forma atual entra no rascunho antes da troca; Task 3); e, nas linhas perto do pé da janela, o balão das etiquetas abria para fora da tela (agora ele sobe para cima do botão quando não cabe embaixo, e tem altura máxima com rolagem própria; Task 7, conferido no navegador numa janela de 460 px de altura). Ficou registrado, sem mudança (a especificação não pede): a linha de onde se aplicou o rendimento mantém a marca "ajustada" se já a tinha.

---

## Estrutura de arquivos

| Arquivo | Papel nesta fase | Tarefa |
|---|---|---|
| `src/ui/estado/novaLinha.ts` | sugestão do pagamento no mês seguinte; valor da base pelo período | 1, 2 |
| `src/compartilhado/tipos.ts` | `FormaDaBase`, `PeriodoDaBase`, `Base` (lista de períodos) | 2 |
| `src/motor/base.ts` | `baseUnica`, `periodosDaBaseOrdenados`, `periodoDaData`, `descreverPeriodoDaBase`, `apurarPelaBase` | 2 |
| `src/motor/calcular.ts` | usa `apurarPelaBase` | 2 |
| `src/motor/casos/*.json` | base reescrita como período único (Task 2); id e nome da metodologia (Task 5); caso novo `2026-10-13-base-por-periodos.json` | 2, 5 |
| `src/ui/arquivo.ts` | lê e confere a base por períodos; normaliza as metodologias | 2, 5 |
| `src/ui/estado/faltas.ts` | o que falta na base, por período | 2 |
| `src/ui/estado/base.ts` (novo) | dividir, remover divisão, trocar a forma, título do bloco, aplicar rendimento na base | 3, 4 |
| `src/ui/secoes/Base.tsx` | seção 2 com períodos | 2, 3 |
| `src/ui/estado/calculo.ts` | cálculo novo com a base de um período e a metodologia das preferências; "aplicar rendimento" divide a base | 2, 4, 6 |
| `src/ui/tabelas/Personalizar.tsx` | rendimento pelo período da linha; `opcaoPadrao` | 2, 4, 6 |
| `src/metodologias/lei-14905-2024.v1.json` (renomeado), `igpm-juros-1.v1.json` (novo), `padrao.ts` | as duas opções | 5 |
| `src/ui/estado/metodologia.ts` | `opcaoDaMetodologia`, `normalizar`, `restaurarPadrao(opcao)` | 5, 6 |
| `src/ui/preferencias.ts` | campo `metodologia` | 6 |
| `src/ui/secoes/Encargos.tsx`, `EditorDePeriodos.tsx`, `App.tsx` | escolha da metodologia; "Restaurar" pela preferência | 6 |
| `src/ui/tabelas/etiquetas.ts` (novo) | etiquetas da linha e nome do botão | 7 |
| `src/ui/componentes/Ajuda.tsx` | conteúdo e nome do botão; modo flutuante | 7 |
| `src/ui/tabelas/TabelaLancamentos.tsx` | célula do vencimento numa linha só; memória sem "Base: Base" | 3, 7 |
| `src/ui/estilos.css` | blocos de período, opções da metodologia, célula do vencimento, balão flutuante | 3, 6, 7 |

---

## Como executar este plano

- Todos os comandos rodam na raiz do repositório, na branch de trabalho da fase (`claude/apura-interface-adjustments-5f4501`, já criada a partir da `main` em `d8f97b2`). Antes de tudo: `npm install` (dependências já fixadas; nenhuma nova nesta fase).
- **Os passos de código são patches.** Cada tarefa traz dois blocos `diff`: os testes (e os dados de teste) e o código. Para aplicar um bloco: salve o conteúdo dele, exatamente como está, num arquivo **fora do repositório** (na pasta de rascunho da sessão; o hook de gravação pode recusar caminhos com acento, como a pasta "DEFENSORIA PÚBLICA": grave por heredoc no shell, por exemplo `cat > "$RASCUNHO/t1-testes.patch" <<'PATCH'` … `PATCH`) e rode `git apply --whitespace=nowarn "$RASCUNHO/t1-testes.patch"`. Os patches foram gerados no ensaio e aplicados, um a um, numa cópia limpa a partir de `24aba5d` (o commit do desenho, anterior a este plano): aplicam-se sem conflito sobre o estado da tarefa anterior. Se `git apply` recusar, pare e relate (não edite à mão para "encaixar").
- Ciclo de cada tarefa: aplicar o patch dos testes → rodar `npx vitest run` e ver falhar exatamente o que o passo diz (se outra coisa falhar, ou se um teste novo passar sem o código, pare e relate) → aplicar o patch do código → `npm run format && npm run verificar` (o `format` não deve mudar nada) → conferir a contagem → commit. Só se commita com tudo verde.
- Leia o patch antes de aplicá-lo: ele é o código da tarefa, e o revisor de cada tarefa o confere contra a §17 do design.
- Nenhum teste acessa a rede nem o armazenamento real do navegador: os testes de componente recebem `ambienteDeTeste()`.
- Relatórios de subagentes vão em `.txt`, fora do repositório (na pasta de rascunho da sessão), nunca na raiz do projeto.

---

### Task 1: "+ Pagamento" sugere o mês seguinte ao do último pagamento

§17.1 (D2). Muda só `sugerirPagamento`; "+ Prestação" fica como está.

**Files:**
- Modify: `src/ui/estado/novaLinha.ts` (`ultimoDoTipo` dá lugar a `ultimoPagamento`, o mais recente pela data; `sugerirPagamento` com a data no mês seguinte)
- Test: `src/ui/estado/novaLinha.test.ts` (o teste "pagamento: data de hoje…" vira dois: mês seguinte, com fora de ordem, dia 31 e data depois da do cálculo; e sem pagamento anterior)

**Interfaces:**
- Consumes: `dataNoMes`, `mesSeguinte`, `competenciaDe`, `decompor` (`src/compartilhado/datas.ts`, já importados no módulo).
- Produces: `sugerirPagamento(calculo)` com a mesma assinatura; a data passa a ser `dataNoMes(mesSeguinte(competenciaDe(ultimo.data)), decompor(ultimo.data).dia)`, e a data de elaboração só sem pagamento anterior.

- [ ] **Step 1: Aplicar o patch dos testes**

````diff
diff --git a/src/ui/estado/novaLinha.test.ts b/src/ui/estado/novaLinha.test.ts
index a805173..4a5d9b4 100644
--- a/src/ui/estado/novaLinha.test.ts
+++ b/src/ui/estado/novaLinha.test.ts
@@ -108,21 +108,39 @@ describe("sugestões da linha nova (decisões de 13/10/2026)", () => {
     expect(sugestao.encargos?.metodologia).not.toBe(regras);
   });
 
-  it("pagamento: data de hoje e o valor do último pagamento; sem pagamento anterior, valor em branco", () => {
-    const pagamento: Lancamento = {
-      id: "a-2026-09",
+  it("pagamento: mês seguinte ao do último pagamento, no mesmo dia, com o valor dele (decisão de 13/10/2026, fase 5b)", () => {
+    const pagamento = (id: string, data: string, valorInformado: string): Lancamento => ({
+      id,
       tipo: "amortizacao",
-      data: "2026-09-05",
-      valorInformado: "400.00",
+      data,
+      valorInformado,
       origem: "lote",
       editado: false,
-    };
-    expect(sugerirPagamento(calculoCom([pagamento]))).toEqual({
-      tipo: "amortizacao",
-      data: HOJE,
-      valor: "400.00",
-      pelaBase: false,
     });
+    expect(
+      sugerirPagamento(
+        calculoCom([
+          pagamento("a-2026-08", "2026-08-10", "350.00"),
+          pagamento("a-2026-09", "2026-09-10", "400.00"),
+        ]),
+      ),
+    ).toEqual({ tipo: "amortizacao", data: "2026-10-10", valor: "400.00", pelaBase: false });
+    // o último é o mais recente pela data, não o último incluído
+    const foraDeOrdem = calculoCom([
+      pagamento("a-2026-09", "2026-09-10", "400.00"),
+      pagamento("a-2026-07", "2026-07-20", "300.00"),
+    ]);
+    expect(sugerirPagamento(foraDeOrdem)).toMatchObject({ data: "2026-10-10", valor: "400.00" });
+    // dia 31 em mês curto cai no último dia; a data pode passar da data do cálculo
+    expect(
+      sugerirPagamento(calculoCom([pagamento("a-2026-01", "2026-01-31", "400.00")])).data,
+    ).toBe("2026-02-28");
+    expect(
+      sugerirPagamento(calculoCom([pagamento("a-2026-10", "2026-10-05", "400.00")])).data,
+    ).toBe("2026-11-05");
+  });
+
+  it("pagamento: sem pagamento anterior, a data de elaboração e o valor em branco", () => {
     expect(sugerirPagamento(calculoCom([]))).toEqual({
       tipo: "amortizacao",
       data: HOJE,
````

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run`
Expected: `Tests  1 failed | 809 passed | 9 skipped (819)` (arquivos: `1 failed | 43 passed (44)`). Falham:
  - `src/ui/estado/novaLinha.test.ts`: "pagamento: mês seguinte ao do último pagamento, no mesmo dia, com o valor dele (decisão de 13/10/2026, fase 5b)".
  Motivo: o pagamento ainda sai com a data de elaboração. Nenhum outro arquivo pode falhar.

- [ ] **Step 3: Aplicar o patch do código**

````diff
diff --git a/src/ui/estado/novaLinha.ts b/src/ui/estado/novaLinha.ts
index 0f54b4b..a55eaaa 100644
--- a/src/ui/estado/novaLinha.ts
+++ b/src/ui/estado/novaLinha.ts
@@ -48,8 +48,14 @@ export function valorPelaBase(
   return apurado.valor === null ? "" : paraTexto(apurado.valor, casas);
 }
 
-function ultimoDoTipo(calculo: Calculo, tipo: Lancamento["tipo"]): Lancamento | undefined {
-  return calculo.lancamentos.filter((l) => l.tipo === tipo).at(-1);
+/** O pagamento mais recente pela data (o último incluído, entre os do mesmo dia). */
+function ultimoPagamento(calculo: Calculo): Lancamento | undefined {
+  return calculo.lancamentos
+    .filter((l) => l.tipo === "amortizacao")
+    .reduce<Lancamento | undefined>(
+      (ultimo, l) => (ultimo && ultimo.data > l.data ? ultimo : l),
+      undefined,
+    );
 }
 
 /**
@@ -87,13 +93,21 @@ export function sugerirPrestacao(calculo: Calculo, tabela: TabelaIndices): Rascu
   return { ...comum, valor: valorPelaBase(calculo, tabela, data), pelaBase: true };
 }
 
-/** Pagamento novo: data de hoje (a data de elaboração) e o valor do último pagamento. */
+/**
+ * Pagamento novo (decisão de 13/10/2026, fase 5b): no mês seguinte ao do último pagamento, no
+ * mesmo dia (último dia do mês quando ele é mais curto), com o valor dele; sem pagamento anterior,
+ * a data de elaboração e o valor em branco. A data pode passar da data do cálculo: a pessoa a
+ * corrige na linha antes de incluí-la.
+ */
 export function sugerirPagamento(calculo: Calculo): RascunhoDeLancamento {
-  const anterior = ultimoDoTipo(calculo, "amortizacao");
+  const anterior = ultimoPagamento(calculo);
   const encargos = herdarRegras(anterior);
   return {
     tipo: "amortizacao",
-    data: calculo.dataElaboracao,
+    data:
+      anterior === undefined
+        ? calculo.dataElaboracao
+        : dataNoMes(mesSeguinte(competenciaDe(anterior.data)), decompor(anterior.data).dia),
     valor: anterior?.valorInformado ?? "",
     pelaBase: false,
     ...(encargos ? { encargos } : {}),
````

- [ ] **Step 4: Formatar, verificar e conferir a contagem**

Run: `npm run format && npm run verificar`
Expected: tudo verde; `Tests  810 passed | 9 skipped (819)`, `Test Files  44 passed (44)`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "ui: + Pagamento sugere o mês seguinte ao do último pagamento

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 2: Motor: base dos alimentos por períodos (tipos, apuração pelo vencimento, arquivo, casos)

§17.2 (D3, D6, T1, T2, T3). A troca de formato atravessa o motor e a tela: o tipo, a apuração, a leitura do arquivo, o cálculo novo, o que falta na base, a sugestão da linha nova, o lápis e os doze casos de referência. A seção 2 continua editando uma forma só nesta tarefa, ligada provisoriamente ao único período (a Task 3 a troca); com isso, a tela funciona igual à de antes.

**Files:**
- Modify: `src/compartilhado/tipos.ts` (a união `Base` vira `FormaDaBase`; novos `PeriodoDaBase` e `Base`)
- Modify: `src/motor/base.ts` (tipo renomeado; funções novas no fim do arquivo)
- Modify: `src/motor/calcular.ts` (`apurarPelaBase` no lugar de `apurarValorBase`)
- Modify: `src/ui/arquivo.ts` (`lerForma` e `lerBase` por períodos, com as conferências de §17.2)
- Modify: `src/ui/estado/calculo.ts` (cálculo novo com `baseUnica`)
- Modify: `src/ui/estado/faltas.ts` (reescrito: faltas por período, com o campo `periodo`)
- Modify: `src/ui/estado/novaLinha.ts` (`valorPelaBase` com `apurarPelaBase`)
- Modify: `src/ui/tabelas/Personalizar.tsx` ("Rendimento deste mês" pelo período da prestação)
- Modify: `src/ui/secoes/Base.tsx` (só o tipo renomeado)
- Modify: `src/ui/App.tsx` (ligação provisória da seção 2 ao único período)
- Test: `src/motor/base.test.ts` (tipo renomeado e oito testes da base por períodos), `src/motor/calcular.test.ts` (`baseUnica` nos cálculos de teste), `src/motor/casos/*.json` (base dos doze casos como período único; caso novo `2026-10-13-base-por-periodos.json`), `src/ui/arquivo.test.ts` (base em dois períodos; oito casos novos de base inválida, com o caminho exato), `src/ui/estado/faltas.test.ts` (reescrito: com `periodo` e o teste por período), `src/ui/estado/novaLinha.test.ts` (`baseUnica`; valor pelo período do vencimento), `src/ui/estado/calculo.test.ts`, `src/ui/recentes.test.ts`, `src/ui/Abrir.test.tsx`, `src/ui/tabelas/Tabelas.test.tsx` e `src/ui/secoes/Base.test.tsx` (só a base de teste no formato novo ou o tipo renomeado)

**Interfaces:**
- Produces (em `src/compartilhado/tipos.ts`):
  - `type FormaDaBase` = a antiga `Base` (valor fixo, % do salário mínimo, % dos rendimentos), sem mudança de campos;
  - `interface PeriodoDaBase { de: DataISO | null; ate: DataISO | null; forma: FormaDaBase }`;
  - `interface Base { periodos: PeriodoDaBase[] }` (`Calculo.base: Base`).
- Produces (em `src/motor/base.ts`):
  - `baseUnica(forma: FormaDaBase): Base` (um período de `null` a `null`);
  - `periodosDaBaseOrdenados(base: Base): PeriodoDaBase[]`;
  - `periodoDaData(base: Base, data: DataISO): PeriodoDaBase | undefined` (o primeiro, em ordem cronológica, que contém a data);
  - `descreverPeriodoDaBase(p: Pick<PeriodoDaBase, "de" | "ate">): string` ("até 31/12/2024", "de 01/01/2025 a 30/06/2025", "desde 01/07/2025", "em todo o período");
  - `apurarPelaBase(lancamento, base: Base, tabela, valorCasas): ValorBaseApurado` (com dois ou mais períodos, a memória começa por `Base <período>: `; sem período, `valor` nulo, memória "Nenhum período da base cobre o vencimento" e o aviso "Nenhum período da base cobre o vencimento de dd/mm/aaaa: a prestação ficou sem valor; informe o valor à mão.");
  - `apurarValorBase(lancamento, forma: FormaDaBase, …)` continua igual (só o tipo do parâmetro se chama `FormaDaBase`).
- Produces (em `src/ui/estado/faltas.ts`): `FaltaDaBase` ganha `periodo: number` (posição do período em ordem cronológica); com dois ou mais períodos, o aviso diz "no período <descrição>" e "as prestações desse período".
- Produces (em `src/ui/arquivo.ts`): erros de base com os caminhos `base.periodos`, `base.periodos[i].de`, `base.periodos[i].ate`, `base.periodos[i]` e `base.periodos[i].forma.<campo>`.

- [ ] **Step 1: Aplicar o patch dos testes e dos dados de teste**

O patch reescreve só o campo `calculo.base` dos doze casos de referência (o `esperado` fica intocado) e cria o caso `2026-10-13-base-por-periodos.json`, que prova a escolha do período com uma metodologia sem correção e sem juros: R$ 500,00 fixados em 10/03/2024 até 31/12/2024 e 30% × R$ 1.518,00 = R$ 455,40 desde 01/01/2025, com o último dia do primeiro período, o primeiro do segundo, a prestação anterior à fixação e um valor informado à mão (total R$ 3.010,80).

````diff
diff --git a/src/motor/base.test.ts b/src/motor/base.test.ts
index f3aff34..044cfa5 100644
--- a/src/motor/base.test.ts
+++ b/src/motor/base.test.ts
@@ -1,6 +1,18 @@
 import { describe, expect, it } from "vitest";
-import type { Base, Competencia, Lancamento, TabelaIndices } from "../compartilhado/tipos.ts";
-import { apurarValorBase } from "./base.ts";
+import type {
+  Base,
+  Competencia,
+  FormaDaBase,
+  Lancamento,
+  TabelaIndices,
+} from "../compartilhado/tipos.ts";
+import {
+  apurarPelaBase,
+  apurarValorBase,
+  baseUnica,
+  descreverPeriodoDaBase,
+  periodoDaData,
+} from "./base.ts";
 import { tabelaIgpm } from "./testes/indices-igpm-2017-2018.ts";
 import { tabelaRegimeNovo } from "./testes/regime-novo.ts";
 
@@ -19,7 +31,7 @@ function prestacao(data: string, extra: Partial<Lancamento> = {}): Lancamento {
 const obtidoEm = "2026-10-11T12:00:00.000Z";
 
 describe("base em percentual do salário mínimo (§6.3)", () => {
-  const base: Base = { tipo: "percentualSalarioMinimo", percentual: "30" };
+  const base: FormaDaBase = { tipo: "percentualSalarioMinimo", percentual: "30" };
 
   it("percentual × salário mínimo do mês do vencimento, com proveniência (série 1619)", () => {
     const tabela = tabelaRegimeNovo();
@@ -121,7 +133,7 @@ describe("base em percentual do salário mínimo (§6.3)", () => {
 });
 
 describe("base em percentual dos rendimentos (§6.3)", () => {
-  const base: Base = {
+  const base: FormaDaBase = {
     tipo: "percentualRendimentos",
     percentual: "30",
     rendimentoPadrao: "1500.00",
@@ -209,7 +221,7 @@ describe("base em valor fixo (§6.3)", () => {
   const tabela = tabelaRegimeNovo();
 
   it("sem reajuste: o valor fixado, com arredondamento a 2 casas", () => {
-    const base: Base = {
+    const base: FormaDaBase = {
       tipo: "valorFixo",
       valor: "451.91",
       dataFixacao: "2017-01-10",
@@ -240,7 +252,7 @@ describe("base em valor fixo (§6.3)", () => {
   });
 
   it("prestação anterior à data de fixação: valor fixado, sem reajuste, com aviso", () => {
-    const base: Base = {
+    const base: FormaDaBase = {
       tipo: "valorFixo",
       valor: "500.00",
       dataFixacao: "2024-03-15",
@@ -260,7 +272,7 @@ describe("base em valor fixo (§6.3)", () => {
   });
 
   it("valor fixado inválido: sem valor, com aviso", () => {
-    const base: Base = {
+    const base: FormaDaBase = {
       tipo: "valorFixo",
       valor: "1.500,00",
       dataFixacao: "2024-03-15",
@@ -278,7 +290,7 @@ describe("base em valor fixo (§6.3)", () => {
   });
 
   describe("reajuste pelo salário mínimo (proporção entre o SM do vencimento e o da fixação)", () => {
-    const base: Base = {
+    const base: FormaDaBase = {
       tipo: "valorFixo",
       valor: "451.91",
       dataFixacao: "2017-01-10",
@@ -342,7 +354,7 @@ describe("base em valor fixo (§6.3)", () => {
   });
 
   describe("reajuste anual pelo índice acumulado (IGP-M, INPC ou IPCA)", () => {
-    const base: Base = {
+    const base: FormaDaBase = {
       tipo: "valorFixo",
       valor: "500.00",
       dataFixacao: "2024-03-15",
@@ -391,7 +403,7 @@ describe("base em valor fixo (§6.3)", () => {
     });
 
     it("mês de reajuste diferente do mês da fixação: o primeiro reajuste usa o acumulado desde a fixação até o mês anterior, depois janelas de 12 meses", () => {
-      const janeiro: Base = { ...base, mesReajuste: 1 };
+      const janeiro: FormaDaBase = { ...base, mesReajuste: 1 };
       expect(apurarValorBase(prestacao("2024-12-15"), janeiro, tabela, 2).valor?.toFixed(2)).toBe(
         "500.00",
       );
@@ -406,7 +418,7 @@ describe("base em valor fixo (§6.3)", () => {
         "e em jan/2026 (IPCA de jan/2025 a dez/2025: 4,2644%) = R$ 539,75",
       );
       // mês de reajuste logo depois da fixação: janela curta, de um mês
-      const junho: Base = { ...base, dataFixacao: "2024-05-20", mesReajuste: 6 };
+      const junho: FormaDaBase = { ...base, dataFixacao: "2024-05-20", mesReajuste: 6 };
       const curto = apurarValorBase(prestacao("2024-06-20"), junho, tabela, 2);
       expect(curto.valor?.toFixed(2)).toBe("502.30");
       expect(curto.memoria).toBe(
@@ -415,7 +427,7 @@ describe("base em valor fixo (§6.3)", () => {
     });
 
     it("acumulado negativo não reduz o valor: IGP-M de 2017 (−0,53%) mantém R$ 451,91 em 2018", () => {
-      const igpm: Base = {
+      const igpm: FormaDaBase = {
         tipo: "valorFixo",
         valor: "451.91",
         dataFixacao: "2017-01-10",
@@ -432,7 +444,7 @@ describe("base em valor fixo (§6.3)", () => {
     });
 
     it("índice do reajuste ainda não divulgado: reajuste não aplicado, valor vigente mantido, aviso e mês sinalizado", () => {
-      const novembro: Base = { ...base, dataFixacao: "2025-11-15", mesReajuste: 11 };
+      const novembro: FormaDaBase = { ...base, dataFixacao: "2025-11-15", mesReajuste: 11 };
       const r = apurarValorBase(prestacao("2026-11-15"), novembro, tabela, 2);
       expect(r.valor?.toFixed(2)).toBe("500.00");
       expect(r.avisos).toEqual([
@@ -468,7 +480,7 @@ describe("base em valor fixo (§6.3)", () => {
     });
 
     it("INPC como índice de reajuste usa a série 188", () => {
-      const inpc: Base = { ...base, indiceReajuste: "INPC" };
+      const inpc: FormaDaBase = { ...base, indiceReajuste: "INPC" };
       const r = apurarValorBase(prestacao("2025-03-15"), inpc, tabela, 2);
       expect(r.indicesUsados.every((i) => i.serie === "188")).toBe(true);
       expect(r.indicesUsados).toHaveLength(12);
@@ -479,7 +491,7 @@ describe("base em valor fixo (§6.3)", () => {
 
 describe("base de tipo desconhecido", () => {
   it("tipo de base desconhecido (arquivo editado à mão) fica sem valor, com aviso, sem erro", () => {
-    const estranha = { tipo: "desconhecida" } as unknown as Base;
+    const estranha = { tipo: "desconhecida" } as unknown as FormaDaBase;
     const r = apurarValorBase(prestacao("2024-03-10"), estranha, tabelaRegimeNovo(), 2);
     expect(r.valor).toBeNull();
     expect(r.avisos).toEqual([
@@ -500,7 +512,7 @@ describe("base com calendário de divulgação (fase 4: esperadoAte)", () => {
   const comCalendario = (): TabelaIndices => ({ ...tabelaRegimeNovo(), esperadoAte: ESPERADO_ATE });
 
   describe("percentual do salário mínimo", () => {
-    const base: Base = { tipo: "percentualSalarioMinimo", percentual: "30" };
+    const base: FormaDaBase = { tipo: "percentualSalarioMinimo", percentual: "30" };
 
     it("mês posterior ao esperado: 'ainda não publicado', o último publicado vale até o novo decreto", () => {
       const r = apurarValorBase(prestacao("2027-01-05"), base, comCalendario(), 2);
@@ -564,7 +576,7 @@ describe("base com calendário de divulgação (fase 4: esperadoAte)", () => {
   });
 
   describe("valor fixo reajustado pelo salário mínimo", () => {
-    const base: Base = {
+    const base: FormaDaBase = {
       tipo: "valorFixo",
       valor: "451.91",
       dataFixacao: "2017-01-10",
@@ -612,7 +624,7 @@ describe("base com calendário de divulgação (fase 4: esperadoAte)", () => {
   });
 
   describe("valor fixo reajustado por índice", () => {
-    const base: Base = {
+    const base: FormaDaBase = {
       tipo: "valorFixo",
       valor: "500.00",
       dataFixacao: "2025-11-15",
@@ -634,7 +646,7 @@ describe("base com calendário de divulgação (fase 4: esperadoAte)", () => {
     });
 
     it("dois meses ainda não divulgados saem listados na mesma frase", () => {
-      const dezembro: Base = { ...base, dataFixacao: "2025-12-15", mesReajuste: 12 };
+      const dezembro: FormaDaBase = { ...base, dataFixacao: "2025-12-15", mesReajuste: 12 };
       const r = apurarValorBase(prestacao("2026-12-15"), dezembro, comCalendario(), 2);
       expect(r.avisos).toEqual([
         "IPCA de out/2026, nov/2026 ainda sem divulgação na data da consulta (previsão para nov/2026: por volta de 10/12/2026): o reajuste de dez/2026 não foi aplicado; a prestação mantém R$ 500,00.",
@@ -646,7 +658,7 @@ describe("base com calendário de divulgação (fase 4: esperadoAte)", () => {
     });
 
     it("segundo reajuste com meses ainda não divulgados: a frase mantém o valor já reajustado", () => {
-      const marco: Base = { ...base, dataFixacao: "2024-11-15", mesReajuste: 11 };
+      const marco: FormaDaBase = { ...base, dataFixacao: "2024-11-15", mesReajuste: 11 };
       const r = apurarValorBase(prestacao("2026-11-15"), marco, comCalendario(), 2);
       expect(r.avisos).toEqual([
         "IPCA de out/2026 ainda sem divulgação na data da consulta (previsão: por volta de 10/11/2026): o reajuste de nov/2026 não foi aplicado; a prestação mantém R$ 523,40.",
@@ -671,7 +683,7 @@ describe("base com calendário de divulgação (fase 4: esperadoAte)", () => {
     it("buraco só, num mês já esperado: texto genérico", () => {
       const tabela = comCalendario();
       delete tabela.series["433"]?.["2025-05"];
-      const marco: Base = { ...base, dataFixacao: "2024-03-15", mesReajuste: 3 };
+      const marco: FormaDaBase = { ...base, dataFixacao: "2024-03-15", mesReajuste: 3 };
       const r = apurarValorBase(prestacao("2026-09-15"), marco, tabela, 2);
       expect(r.avisos).toEqual([
         "IPCA de mai/2025 não disponível na tabela de índices (último mês disponível: set/2026): o reajuste de mar/2026 não foi aplicado; a prestação mantém R$ 525,29.",
@@ -709,3 +721,143 @@ describe("base com calendário de divulgação (fase 4: esperadoAte)", () => {
     });
   });
 });
+
+describe("base por períodos (§17.2, fase 5b)", () => {
+  const fixo: FormaDaBase = {
+    tipo: "valorFixo",
+    valor: "500.00",
+    dataFixacao: "2024-03-10",
+    indiceReajuste: "nenhum",
+    mesReajuste: 3,
+  };
+  const sm: FormaDaBase = { tipo: "percentualSalarioMinimo", percentual: "30" };
+  // até 31/12/2024: R$ 500,00 fixados em 10/03/2024, sem reajuste; desde 01/01/2025: 30% do SM
+  const dividida: Base = {
+    periodos: [
+      { de: null, ate: "2024-12-31", forma: fixo },
+      { de: "2025-01-01", ate: null, forma: sm },
+    ],
+  };
+  const tabela = tabelaRegimeNovo();
+
+  it("um período só, de null a null: a conta e a memória de sempre, sem prefixo", () => {
+    expect(baseUnica(sm)).toEqual({ periodos: [{ de: null, ate: null, forma: sm }] });
+    const unica = apurarPelaBase(prestacao("2025-01-05"), baseUnica(sm), tabela, 2);
+    expect(unica).toEqual(apurarValorBase(prestacao("2025-01-05"), sm, tabela, 2));
+    expect(unica.memoria).toBe("30% do salário mínimo de jan/2025 (R$ 1.518,00) = R$ 455,40");
+  });
+
+  it("cada prestação usa o período em que cai o vencimento; a memória diz qual período valeu", () => {
+    const antesDaFixacao = apurarPelaBase(prestacao("2024-02-05"), dividida, tabela, 2);
+    expect(antesDaFixacao.valor?.toFixed(2)).toBe("500.00");
+    expect(antesDaFixacao.memoria).toBe(
+      "Base até 31/12/2024: Valor fixado em 10/03/2024: R$ 500,00 (prestação anterior à fixação, sem reajuste)",
+    );
+    expect(antesDaFixacao.avisos).toEqual([
+      "Prestação de fev/2024 anterior à data de fixação (10/03/2024): usado o valor fixado, sem reajuste.",
+    ]);
+    const dezembro = apurarPelaBase(prestacao("2024-12-05"), dividida, tabela, 2);
+    expect(dezembro.memoria).toBe(
+      "Base até 31/12/2024: Valor fixado em 10/03/2024: R$ 500,00 (sem reajuste)",
+    );
+    // último dia do 1º período e primeiro dia do 2º
+    expect(apurarPelaBase(prestacao("2024-12-31"), dividida, tabela, 2).valor?.toFixed(2)).toBe(
+      "500.00",
+    );
+    const janeiro = apurarPelaBase(prestacao("2025-01-01"), dividida, tabela, 2);
+    expect(janeiro.valor?.toFixed(2)).toBe("455.40");
+    expect(janeiro.memoria).toBe(
+      "Base desde 01/01/2025: 30% do salário mínimo de jan/2025 (R$ 1.518,00) = R$ 455,40",
+    );
+    expect(janeiro.indicesUsados.map((i) => i.competencia)).toEqual(["2025-01"]);
+  });
+
+  it("corrigir a base de um período muda só as prestações daquele período (35% × 1.518,00 = 531,30)", () => {
+    const corrigida: Base = {
+      periodos: [
+        { de: null, ate: "2024-12-31", forma: fixo },
+        { de: "2025-01-01", ate: null, forma: { ...sm, percentual: "35" } },
+      ],
+    };
+    expect(apurarPelaBase(prestacao("2024-12-05"), corrigida, tabela, 2).valor?.toFixed(2)).toBe(
+      "500.00",
+    );
+    expect(apurarPelaBase(prestacao("2025-03-05"), corrigida, tabela, 2).valor?.toFixed(2)).toBe(
+      "531.30",
+    );
+  });
+
+  it('período do meio: "de … a …"; a ordem da lista não importa', () => {
+    const tres: Base = {
+      periodos: [
+        { de: "2025-07-01", ate: null, forma: sm },
+        { de: null, ate: "2024-12-31", forma: fixo },
+        { de: "2025-01-01", ate: "2025-06-30", forma: { ...fixo, valor: "600.00" } },
+      ],
+    };
+    const r = apurarPelaBase(prestacao("2025-06-30"), tres, tabela, 2);
+    expect(r.valor?.toFixed(2)).toBe("600.00");
+    expect(r.memoria).toBe(
+      "Base de 01/01/2025 a 30/06/2025: Valor fixado em 10/03/2024: R$ 600,00 (sem reajuste)",
+    );
+    expect(periodoDaData(tres, "2025-07-01")?.forma).toBe(sm);
+  });
+
+  it("valor fixo num período posterior: o reajuste conta da data de fixação do próprio período", () => {
+    const ipca: FormaDaBase = {
+      tipo: "valorFixo",
+      valor: "500.00",
+      dataFixacao: "2024-03-15",
+      indiceReajuste: "IPCA",
+      mesReajuste: 3,
+    };
+    const comReajuste: Base = {
+      periodos: [
+        { de: null, ate: "2024-12-31", forma: sm },
+        { de: "2025-01-01", ate: null, forma: ipca },
+      ],
+    };
+    const sozinha = apurarValorBase(prestacao("2025-04-10"), ipca, tabela, 2);
+    const r = apurarPelaBase(prestacao("2025-04-10"), comReajuste, tabela, 2);
+    expect(r.valor?.toFixed(2)).toBe(sozinha.valor?.toFixed(2));
+    expect(r.memoria).toBe(`Base desde 01/01/2025: ${sozinha.memoria}`);
+    expect(r.memoria).toContain("reajustados em mar/2025");
+  });
+
+  it("vencimento sem período (base fora do padrão, vinda de arquivo): sem valor, com aviso, sem erro", () => {
+    const comBuraco: Base = {
+      periodos: [
+        { de: null, ate: "2024-12-31", forma: fixo },
+        { de: "2025-02-01", ate: null, forma: sm },
+      ],
+    };
+    const r = apurarPelaBase(prestacao("2025-01-10"), comBuraco, tabela, 2);
+    expect(r.valor).toBeNull();
+    expect(r.memoria).toBe("Nenhum período da base cobre o vencimento");
+    expect(r.avisos).toEqual([
+      "Nenhum período da base cobre o vencimento de 10/01/2025: a prestação ficou sem valor; informe o valor à mão.",
+    ]);
+    expect(apurarPelaBase(prestacao("2025-01-10"), { periodos: [] }, tabela, 2).avisos).toEqual(
+      r.avisos,
+    );
+  });
+
+  it("períodos sobrepostos (arquivo fora do padrão): vale o primeiro, em ordem cronológica, que contém o vencimento", () => {
+    const sobrepostos: Base = {
+      periodos: [
+        { de: "2025-01-01", ate: null, forma: sm },
+        { de: null, ate: "2025-06-30", forma: fixo },
+      ],
+    };
+    expect(periodoDaData(sobrepostos, "2025-03-10")?.forma).toBe(fixo);
+  });
+
+  it("descreve o período como o título dos blocos da seção 2, em minúsculas", () => {
+    expect(descreverPeriodoDaBase({ de: null, ate: "2024-12-31" })).toBe("até 31/12/2024");
+    expect(descreverPeriodoDaBase({ de: "2025-01-01", ate: "2025-06-30" })).toBe(
+      "de 01/01/2025 a 30/06/2025",
+    );
+    expect(descreverPeriodoDaBase({ de: "2025-07-01", ate: null })).toBe("desde 01/07/2025");
+    expect(descreverPeriodoDaBase({ de: null, ate: null })).toBe("em todo o período");
+  });
+});
diff --git a/src/motor/calcular.test.ts b/src/motor/calcular.test.ts
index fd055de..c9c3af1 100644
--- a/src/motor/calcular.test.ts
+++ b/src/motor/calcular.test.ts
@@ -1,14 +1,15 @@
 import { describe, expect, it } from "vitest";
 import { competenciasEntre } from "../compartilhado/datas.ts";
 import type {
-  Base,
   Calculo,
   CodigoSerie,
   Competencia,
+  FormaDaBase,
   Lancamento,
   TabelaIndices,
 } from "../compartilhado/tipos.ts";
 import { metodologiaPadrao } from "../metodologias/padrao.ts";
+import { baseUnica } from "./base.ts";
 import { calcular } from "./calcular.ts";
 import { tabelaIgpm } from "./testes/indices-igpm-2017-2018.ts";
 import { metodologiaSelicUnica, tabelaRegimeNovo } from "./testes/regime-novo.ts";
@@ -22,13 +23,13 @@ function calculoCom(lancamentos: Lancamento[], dataElaboracao = "2018-05-25"): C
     atualizadoEm: "2026-10-10T00:00:00.000Z",
     dataElaboracao,
     cabecalho: { defensor: "", orgao: "", processo: "", exequente: "", executado: "" },
-    base: {
+    base: baseUnica({
       tipo: "valorFixo",
       valor: "451.91",
       dataFixacao: "2017-01-10",
       indiceReajuste: "nenhum",
       mesReajuste: 1,
-    },
+    }),
     lotes: {},
     lancamentos,
     metodologia: metodologiaPadrao(),
@@ -547,9 +548,13 @@ describe("calcular (fase 3: situação dos lançamentos, base dos alimentos e pr
     editado: false,
     ...extra,
   });
-  const comBase = (base: Base, lancamentos: Lancamento[], dataElaboracao = hoje): Calculo => ({
+  const comBase = (
+    forma: FormaDaBase,
+    lancamentos: Lancamento[],
+    dataElaboracao = hoje,
+  ): Calculo => ({
     ...calculoCom(lancamentos, dataElaboracao),
-    base,
+    base: baseUnica(forma),
   });
 
   it("pagamento posterior à data de elaboração fica fora dos totais, com aviso no lançamento e no resumo", () => {
@@ -690,7 +695,7 @@ describe("calcular (fase 3: situação dos lançamentos, base dos alimentos e pr
   });
 
   it("base em % do salário mínimo: valor apurado, salário mínimo em indicesUsados e séries em ordem numérica", () => {
-    const base: Base = { tipo: "percentualSalarioMinimo", percentual: "30" };
+    const base: FormaDaBase = { tipo: "percentualSalarioMinimo", percentual: "30" };
     const r = calcular(
       comBase(base, [
         semValorInformado("p-2025-01", "2025-01-10"),
@@ -724,7 +729,7 @@ describe("calcular (fase 3: situação dos lançamentos, base dos alimentos e pr
   });
 
   it("prestação vincenda em % do salário mínimo de mês ainda sem salário mínimo publicado: último publicado, nominal, avisos e resumos", () => {
-    const base: Base = { tipo: "percentualSalarioMinimo", percentual: "30" };
+    const base: FormaDaBase = { tipo: "percentualSalarioMinimo", percentual: "30" };
     const r = calcular(
       comBase(base, [semValorInformado("p-2027-01", "2027-01-10")]),
       tabelaRegimeNovo(),
@@ -756,7 +761,7 @@ describe("calcular (fase 3: situação dos lançamentos, base dos alimentos e pr
   });
 
   it("valor fixo reajustado pelo IPCA: os 12 meses do acumulado entram em indicesUsados mesmo fora do período de correção", () => {
-    const base: Base = {
+    const base: FormaDaBase = {
       tipo: "valorFixo",
       valor: "500.00",
       dataFixacao: "2024-03-15",
@@ -818,9 +823,13 @@ describe("calcular (fase 4: meses ainda não divulgados na data da consulta)", (
     origem: "lote",
     editado: false,
   });
-  const comBase = (base: Base, lancamentos: Lancamento[], dataElaboracao = hoje): Calculo => ({
+  const comBase = (
+    forma: FormaDaBase,
+    lancamentos: Lancamento[],
+    dataElaboracao = hoje,
+  ): Calculo => ({
     ...calculoCom(lancamentos, dataElaboracao),
-    base,
+    base: baseUnica(forma),
   });
 
   it("IPCA do mês da consulta ainda não divulgado: aviso próprio no lançamento e resumo próprio, sem o genérico; valores inalterados", () => {
@@ -1005,7 +1014,7 @@ describe("calcular (fase 4: meses ainda não divulgados na data da consulta)", (
   });
 
   it("reajuste pelo IPCA ainda não divulgado: aviso próprio no lançamento e resumo próprio da base", () => {
-    const base: Base = {
+    const base: FormaDaBase = {
       tipo: "valorFixo",
       valor: "500.00",
       dataFixacao: "2025-11-15",
diff --git a/src/motor/casos/2018-05-25-saj-tjms-alimentos.json b/src/motor/casos/2018-05-25-saj-tjms-alimentos.json
index 0da9b41..64c8eaa 100644
--- a/src/motor/casos/2018-05-25-saj-tjms-alimentos.json
+++ b/src/motor/casos/2018-05-25-saj-tjms-alimentos.json
@@ -11,7 +11,7 @@
     "atualizadoEm": "2026-10-10T00:00:00.000Z",
     "dataElaboracao": "2018-05-25",
     "cabecalho": { "defensor": "", "orgao": "", "processo": "", "exequente": "", "executado": "" },
-    "base": { "tipo": "valorFixo", "valor": "451.91", "dataFixacao": "2017-01-10", "indiceReajuste": "nenhum", "mesReajuste": 1 },
+    "base": {"periodos": [{"de": null, "ate": null, "forma": { "tipo": "valorFixo", "valor": "451.91", "dataFixacao": "2017-01-10", "indiceReajuste": "nenhum", "mesReajuste": 1 }}]},
     "lotes": {},
     "lancamentos": [
       { "id": "p-2017-01", "tipo": "prestacao", "data": "2017-01-10", "competencia": "2017-01", "valorInformado": "451.91", "origem": "avulso", "editado": true },
diff --git a/src/motor/casos/2018-05-25-saj-tjms-base-valor-fixo-reajuste-sm.json b/src/motor/casos/2018-05-25-saj-tjms-base-valor-fixo-reajuste-sm.json
index c630a75..885afbb 100644
--- a/src/motor/casos/2018-05-25-saj-tjms-base-valor-fixo-reajuste-sm.json
+++ b/src/motor/casos/2018-05-25-saj-tjms-base-valor-fixo-reajuste-sm.json
@@ -17,13 +17,13 @@
       "exequente": "",
       "executado": ""
     },
-    "base": {
+    "base": {"periodos": [{"de": null, "ate": null, "forma": {
       "tipo": "valorFixo",
       "valor": "451.91",
       "dataFixacao": "2017-01-10",
       "indiceReajuste": "SM",
       "mesReajuste": 1
-    },
+    }}]},
     "lotes": {
       "ultimoLotePrestacoes": {
         "diaVencimento": 10,
diff --git a/src/motor/casos/2026-09-15-deflacao-com-piso.json b/src/motor/casos/2026-09-15-deflacao-com-piso.json
index c9e07c4..6a13919 100644
--- a/src/motor/casos/2026-09-15-deflacao-com-piso.json
+++ b/src/motor/casos/2026-09-15-deflacao-com-piso.json
@@ -11,7 +11,7 @@
     "atualizadoEm": "2026-10-11T00:00:00.000Z",
     "dataElaboracao": "2026-09-15",
     "cabecalho": {"defensor": "", "orgao": "", "processo": "", "exequente": "", "executado": ""},
-    "base": {"tipo": "valorFixo", "valor": "1000.00", "dataFixacao": "2026-09-15", "indiceReajuste": "nenhum", "mesReajuste": 1},
+    "base": {"periodos": [{"de": null, "ate": null, "forma": {"tipo": "valorFixo", "valor": "1000.00", "dataFixacao": "2026-09-15", "indiceReajuste": "nenhum", "mesReajuste": 1}}]},
     "lotes": {},
     "lancamentos": [
       {"id": "p-2026-07-31", "tipo": "prestacao", "data": "2026-07-31", "competencia": "2026-07", "valorInformado": "1000.00", "origem": "avulso", "editado": true},
diff --git a/src/motor/casos/2026-10-11-calculadora-bcb-regime-novo.json b/src/motor/casos/2026-10-11-calculadora-bcb-regime-novo.json
index 1de0a4d..91f3f54 100644
--- a/src/motor/casos/2026-10-11-calculadora-bcb-regime-novo.json
+++ b/src/motor/casos/2026-10-11-calculadora-bcb-regime-novo.json
@@ -11,7 +11,7 @@
     "atualizadoEm": "2026-10-11T00:00:00.000Z",
     "dataElaboracao": "2026-10-11",
     "cabecalho": {"defensor": "", "orgao": "", "processo": "", "exequente": "", "executado": ""},
-    "base": {"tipo": "valorFixo", "valor": "1000.00", "dataFixacao": "2026-10-11", "indiceReajuste": "nenhum", "mesReajuste": 1},
+    "base": {"periodos": [{"de": null, "ate": null, "forma": {"tipo": "valorFixo", "valor": "1000.00", "dataFixacao": "2026-10-11", "indiceReajuste": "nenhum", "mesReajuste": 1}}]},
     "lotes": {},
     "lancamentos": [
       {"id": "p-2024-09-30", "tipo": "prestacao", "data": "2024-09-30", "competencia": "2024-09", "valorInformado": "1000.00", "origem": "avulso", "editado": true},
diff --git a/src/motor/casos/2026-10-11-encargos-proprios.json b/src/motor/casos/2026-10-11-encargos-proprios.json
index b22b0de..53b36d9 100644
--- a/src/motor/casos/2026-10-11-encargos-proprios.json
+++ b/src/motor/casos/2026-10-11-encargos-proprios.json
@@ -11,7 +11,7 @@
     "atualizadoEm": "2026-10-11T00:00:00.000Z",
     "dataElaboracao": "2026-10-11",
     "cabecalho": {"defensor": "", "orgao": "", "processo": "", "exequente": "", "executado": ""},
-    "base": {"tipo": "valorFixo", "valor": "1000.00", "dataFixacao": "2026-10-11", "indiceReajuste": "nenhum", "mesReajuste": 1},
+    "base": {"periodos": [{"de": null, "ate": null, "forma": {"tipo": "valorFixo", "valor": "1000.00", "dataFixacao": "2026-10-11", "indiceReajuste": "nenhum", "mesReajuste": 1}}]},
     "lotes": {},
     "lancamentos": [
       {"id": "p-2025-01-15", "tipo": "prestacao", "data": "2025-01-15", "competencia": "2025-01", "valorInformado": "1000.00", "encargos": {"termoInicialJuros": "2025-06-01", "termoFinalJuros": "2026-03-31"}, "origem": "avulso", "editado": true},
diff --git a/src/motor/casos/2026-10-11-multa-e-honorarios-art-523.json b/src/motor/casos/2026-10-11-multa-e-honorarios-art-523.json
index d63ed59..04d87d3 100644
--- a/src/motor/casos/2026-10-11-multa-e-honorarios-art-523.json
+++ b/src/motor/casos/2026-10-11-multa-e-honorarios-art-523.json
@@ -11,7 +11,7 @@
     "atualizadoEm": "2026-10-11T00:00:00.000Z",
     "dataElaboracao": "2026-10-11",
     "cabecalho": {"defensor": "", "orgao": "", "processo": "", "exequente": "", "executado": ""},
-    "base": {"tipo": "valorFixo", "valor": "1000.00", "dataFixacao": "2026-10-11", "indiceReajuste": "nenhum", "mesReajuste": 1},
+    "base": {"periodos": [{"de": null, "ate": null, "forma": {"tipo": "valorFixo", "valor": "1000.00", "dataFixacao": "2026-10-11", "indiceReajuste": "nenhum", "mesReajuste": 1}}]},
     "lotes": {},
     "lancamentos": [
       {"id": "p-2026-01-10", "tipo": "prestacao", "data": "2026-01-10", "competencia": "2026-01", "valorInformado": "1000.00", "origem": "avulso", "editado": true},
diff --git a/src/motor/casos/2026-10-11-saj-tjms-alimentos-igpm-2024-2026.json b/src/motor/casos/2026-10-11-saj-tjms-alimentos-igpm-2024-2026.json
index aa32921..189e8de 100644
--- a/src/motor/casos/2026-10-11-saj-tjms-alimentos-igpm-2024-2026.json
+++ b/src/motor/casos/2026-10-11-saj-tjms-alimentos-igpm-2024-2026.json
@@ -11,7 +11,7 @@
     "atualizadoEm": "2026-10-11T00:00:00.000Z",
     "dataElaboracao": "2026-10-11",
     "cabecalho": {"defensor": "", "orgao": "", "processo": "", "exequente": "", "executado": ""},
-    "base": {"tipo": "percentualSalarioMinimo", "percentual": "30"},
+    "base": {"periodos": [{"de": null, "ate": null, "forma": {"tipo": "percentualSalarioMinimo", "percentual": "30"}}]},
     "lotes": {},
     "lancamentos": [
       {"id": "p-2024-03", "tipo": "prestacao", "data": "2024-03-10", "competencia": "2024-03", "valorInformado": "423.60", "origem": "avulso", "editado": true},
diff --git a/src/motor/casos/2026-10-11-saj-tjms-inpc-salario-minimo-lotes.json b/src/motor/casos/2026-10-11-saj-tjms-inpc-salario-minimo-lotes.json
index 0df7996..adf41fb 100644
--- a/src/motor/casos/2026-10-11-saj-tjms-inpc-salario-minimo-lotes.json
+++ b/src/motor/casos/2026-10-11-saj-tjms-inpc-salario-minimo-lotes.json
@@ -17,10 +17,10 @@
       "exequente": "",
       "executado": ""
     },
-    "base": {
+    "base": {"periodos": [{"de": null, "ate": null, "forma": {
       "tipo": "percentualSalarioMinimo",
       "percentual": "30"
-    },
+    }}]},
     "lotes": {
       "ultimoLotePrestacoes": {
         "diaVencimento": 1,
diff --git a/src/motor/casos/2026-10-11-saj-tjms-percentual-rendimentos-lote.json b/src/motor/casos/2026-10-11-saj-tjms-percentual-rendimentos-lote.json
index 0ffda00..106af73 100644
--- a/src/motor/casos/2026-10-11-saj-tjms-percentual-rendimentos-lote.json
+++ b/src/motor/casos/2026-10-11-saj-tjms-percentual-rendimentos-lote.json
@@ -17,11 +17,11 @@
       "exequente": "",
       "executado": ""
     },
-    "base": {
+    "base": {"periodos": [{"de": null, "ate": null, "forma": {
       "tipo": "percentualRendimentos",
       "percentual": "30",
       "rendimentoPadrao": "1500.00"
-    },
+    }}]},
     "lotes": {
       "ultimoLotePrestacoes": {
         "diaVencimento": 1,
diff --git a/src/motor/casos/2026-10-11-saj-tjms-selic-capitalizada.json b/src/motor/casos/2026-10-11-saj-tjms-selic-capitalizada.json
index b046e71..4be31b3 100644
--- a/src/motor/casos/2026-10-11-saj-tjms-selic-capitalizada.json
+++ b/src/motor/casos/2026-10-11-saj-tjms-selic-capitalizada.json
@@ -11,7 +11,7 @@
     "atualizadoEm": "2026-10-11T00:00:00.000Z",
     "dataElaboracao": "2026-10-11",
     "cabecalho": {"defensor": "", "orgao": "", "processo": "", "exequente": "", "executado": ""},
-    "base": {"tipo": "valorFixo", "valor": "10000.00", "dataFixacao": "2026-10-11", "indiceReajuste": "nenhum", "mesReajuste": 1},
+    "base": {"periodos": [{"de": null, "ate": null, "forma": {"tipo": "valorFixo", "valor": "10000.00", "dataFixacao": "2026-10-11", "indiceReajuste": "nenhum", "mesReajuste": 1}}]},
     "lotes": {},
     "lancamentos": [
       {"id": "p-2024-03", "tipo": "prestacao", "data": "2024-03-10", "competencia": "2024-03", "valorInformado": "10000.00", "origem": "avulso", "editado": true},
diff --git a/src/motor/casos/2026-10-11-transicao-lei-14905.json b/src/motor/casos/2026-10-11-transicao-lei-14905.json
index f7d2fe7..8cdfede 100644
--- a/src/motor/casos/2026-10-11-transicao-lei-14905.json
+++ b/src/motor/casos/2026-10-11-transicao-lei-14905.json
@@ -11,7 +11,7 @@
     "atualizadoEm": "2026-10-11T00:00:00.000Z",
     "dataElaboracao": "2026-10-11",
     "cabecalho": {"defensor": "", "orgao": "", "processo": "", "exequente": "", "executado": ""},
-    "base": {"tipo": "valorFixo", "valor": "10000.00", "dataFixacao": "2026-10-11", "indiceReajuste": "nenhum", "mesReajuste": 1},
+    "base": {"periodos": [{"de": null, "ate": null, "forma": {"tipo": "valorFixo", "valor": "10000.00", "dataFixacao": "2026-10-11", "indiceReajuste": "nenhum", "mesReajuste": 1}}]},
     "lotes": {},
     "lancamentos": [
       {"id": "p-2024-03-10", "tipo": "prestacao", "data": "2024-03-10", "competencia": "2024-03", "valorInformado": "10000.00", "origem": "avulso", "editado": true},
diff --git a/src/motor/casos/2026-10-11-valor-fixo-reajuste-ipca.json b/src/motor/casos/2026-10-11-valor-fixo-reajuste-ipca.json
index a1ab49e..d75de20 100644
--- a/src/motor/casos/2026-10-11-valor-fixo-reajuste-ipca.json
+++ b/src/motor/casos/2026-10-11-valor-fixo-reajuste-ipca.json
@@ -17,13 +17,13 @@
       "exequente": "",
       "executado": ""
     },
-    "base": {
+    "base": {"periodos": [{"de": null, "ate": null, "forma": {
       "tipo": "valorFixo",
       "valor": "500.00",
       "dataFixacao": "2024-03-15",
       "indiceReajuste": "IPCA",
       "mesReajuste": 3
-    },
+    }}]},
     "lotes": {},
     "lancamentos": [
       {"id": "p-2024-01", "tipo": "prestacao", "data": "2024-01-15", "competencia": "2024-01", "descricao": "Anterior à fixação", "origem": "avulso", "editado": false},
diff --git a/src/motor/casos/2026-10-13-base-por-periodos.json b/src/motor/casos/2026-10-13-base-por-periodos.json
new file mode 100644
index 0000000..aadbc48
--- /dev/null
+++ b/src/motor/casos/2026-10-13-base-por-periodos.json
@@ -0,0 +1,56 @@
+{
+  "formato": "apura/caso-de-referencia@1",
+  "nome": "Base dos alimentos por períodos: valor fixo até 31/12/2024 e 30% do salário mínimo desde 01/01/2025, cálculo de 11/10/2026",
+  "fonte": "Aritmética decimal independente (§17.2 do design): R$ 500,00 fixados em 10/03/2024, sem reajuste; 30% × R$ 1.518,00 (salário mínimo de 2025, série 1619 do BCB) = R$ 455,40.",
+  "observacoes": "Metodologia sem correção e sem juros, para o caso provar só a escolha do período pela data do vencimento: o último dia do 1º período (31/12/2024) e o primeiro do 2º (01/01/2025), a prestação anterior à fixação (aviso de sempre, com o prefixo do período na memória) e o valor informado à mão, que a base não toca.",
+  "calculo": {
+    "formato": "apura/calculo@1",
+    "tipo": "alimentos",
+    "id": "caso-base-por-periodos",
+    "criadoEm": "2026-10-13T00:00:00.000Z",
+    "atualizadoEm": "2026-10-13T00:00:00.000Z",
+    "dataElaboracao": "2026-10-11",
+    "cabecalho": {"defensor": "", "orgao": "", "processo": "", "exequente": "", "executado": ""},
+    "base": {"periodos": [
+      {"de": null, "ate": "2024-12-31", "forma": {"tipo": "valorFixo", "valor": "500.00", "dataFixacao": "2024-03-10", "indiceReajuste": "nenhum", "mesReajuste": 3}},
+      {"de": "2025-01-01", "ate": null, "forma": {"tipo": "percentualSalarioMinimo", "percentual": "30"}}
+    ]},
+    "lotes": {},
+    "lancamentos": [
+      {"id": "p-2024-02", "tipo": "prestacao", "data": "2024-02-05", "competencia": "2024-02", "origem": "lote", "editado": false},
+      {"id": "p-2024-12", "tipo": "prestacao", "data": "2024-12-05", "competencia": "2024-12", "origem": "lote", "editado": false},
+      {"id": "p-2024-12-2", "tipo": "prestacao", "data": "2024-12-31", "competencia": "2024-12", "origem": "avulso", "editado": false},
+      {"id": "p-2025-01", "tipo": "prestacao", "data": "2025-01-01", "competencia": "2025-01", "origem": "lote", "editado": false},
+      {"id": "p-2025-01-2", "tipo": "prestacao", "data": "2025-01-05", "competencia": "2025-01", "descricao": "Valor informado à mão", "valorInformado": "600.00", "origem": "avulso", "editado": true},
+      {"id": "p-2025-03", "tipo": "prestacao", "data": "2025-03-05", "competencia": "2025-03", "origem": "lote", "editado": false}
+    ],
+    "metodologia": {
+      "id": "sem-encargos", "versao": 1, "nome": "Sem correção e sem juros", "ajustada": true,
+      "periodos": [{"de": null, "ate": null, "correcao": {"indice": "nenhum"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "0"}}],
+      "incidenciaMesInicial": "proRata", "deflacao": "aplicarComPiso",
+      "arredondamento": {"fatorCasas": 6, "percentualCasas": 6, "valorCasas": 2, "modo": "comercial"}
+    },
+    "acrescimos": {"multaPercentual": "0", "honorariosPercentual": "0"},
+    "observacoes": ""
+  },
+  "indices": {
+    "consultadoEm": "2026-10-11T13:00:00.000Z",
+    "series": {
+      "1619": {
+        "2025-01": {"valor": "1518.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"},
+        "2025-03": {"valor": "1518.00", "fonte": "embutida", "obtidoEm": "2026-10-11T00:00:00.000Z"}
+      }
+    }
+  },
+  "esperado": {
+    "lancamentos": [
+      {"id": "p-2024-02", "valorBase": "500.00", "memoriaBase": "Base até 31/12/2024: Valor fixado em 10/03/2024: R$ 500,00 (prestação anterior à fixação, sem reajuste)", "editado": false, "situacao": "atualizado", "fator": "1.000000", "corrigido": "500.00", "jurosValor": "0.00", "atualizado": "500.00", "avisos": ["Prestação de fev/2024 anterior à data de fixação (10/03/2024): usado o valor fixado, sem reajuste."]},
+      {"id": "p-2024-12", "valorBase": "500.00", "memoriaBase": "Base até 31/12/2024: Valor fixado em 10/03/2024: R$ 500,00 (sem reajuste)", "corrigido": "500.00", "jurosValor": "0.00", "atualizado": "500.00", "avisos": []},
+      {"id": "p-2024-12-2", "valorBase": "500.00", "memoriaBase": "Base até 31/12/2024: Valor fixado em 10/03/2024: R$ 500,00 (sem reajuste)", "corrigido": "500.00", "jurosValor": "0.00", "atualizado": "500.00"},
+      {"id": "p-2025-01", "valorBase": "455.40", "memoriaBase": "Base desde 01/01/2025: 30% do salário mínimo de jan/2025 (R$ 1.518,00) = R$ 455,40", "editado": false, "corrigido": "455.40", "jurosValor": "0.00", "atualizado": "455.40", "avisos": []},
+      {"id": "p-2025-01-2", "valorBase": "600.00", "memoriaBase": "Valor informado: R$ 600,00", "editado": true, "corrigido": "600.00", "jurosValor": "0.00", "atualizado": "600.00"},
+      {"id": "p-2025-03", "valorBase": "455.40", "memoriaBase": "Base desde 01/01/2025: 30% do salário mínimo de mar/2025 (R$ 1.518,00) = R$ 455,40", "corrigido": "455.40", "jurosValor": "0.00", "atualizado": "455.40"}
+    ],
+    "totais": {"prestacoes": "3010.80", "amortizacoes": "0.00", "totalDevido": "3010.80", "multa": "0.00", "honorarios": "0.00", "totalGeral": "3010.80"}
+  }
+}
diff --git a/src/ui/Abrir.test.tsx b/src/ui/Abrir.test.tsx
index 3094511..0ce5c66 100644
--- a/src/ui/Abrir.test.tsx
+++ b/src/ui/Abrir.test.tsx
@@ -3,6 +3,7 @@ import { cleanup, render, screen, within } from "@testing-library/react";
 import userEvent from "@testing-library/user-event";
 import { afterEach, describe, expect, it } from "vitest";
 import type { ArquivoCalculo } from "../compartilhado/tipos.ts";
+import { baseUnica } from "../motor/base.ts";
 import { calcular } from "../motor/calcular.ts";
 import { gerarLotePrestacoes } from "../motor/lote.ts";
 import App from "./App.tsx";
@@ -31,13 +32,13 @@ function arquivoSalvo(): ArquivoCalculo {
   calculo.cabecalho.exequente = "A. B.";
   calculo.cabecalho.executado = "C. D.";
   calculo.dataElaboracao = HOJE_DE_TESTE;
-  calculo.base = {
+  calculo.base = baseUnica({
     tipo: "valorFixo",
     valor: "1000.00",
     dataFixacao: "2026-01-10",
     indiceReajuste: "nenhum",
     mesReajuste: 1,
-  };
+  });
   calculo.lancamentos = gerarLotePrestacoes(
     { diaVencimento: 5, mesesEmAtraso: 2 },
     HOJE_DE_TESTE,
diff --git a/src/ui/arquivo.test.ts b/src/ui/arquivo.test.ts
index e13de57..de12c0d 100644
--- a/src/ui/arquivo.test.ts
+++ b/src/ui/arquivo.test.ts
@@ -21,11 +21,20 @@ function calculoCompleto(): Calculo {
   calculo.cabecalho.exequente = "A. B. C.";
   calculo.cabecalho.executado = "D. E. F.";
   calculo.base = {
-    tipo: "valorFixo",
-    valor: "1000.00",
-    dataFixacao: "2024-03-15",
-    indiceReajuste: "IPCA",
-    mesReajuste: 3,
+    periodos: [
+      {
+        de: null,
+        ate: "2025-12-31",
+        forma: {
+          tipo: "valorFixo",
+          valor: "1000.00",
+          dataFixacao: "2024-03-15",
+          indiceReajuste: "IPCA",
+          mesReajuste: 3,
+        },
+      },
+      { de: "2026-01-01", ate: null, forma: { tipo: "percentualSalarioMinimo", percentual: "30" } },
+    ],
   };
   calculo.lotes = { ultimoLotePrestacoes: { diaVencimento: 5, mesesEmAtraso: 2 } };
   calculo.lancamentos = gerarLotePrestacoes(
@@ -118,6 +127,10 @@ describe("lerArquivo (validação do arquivo aberto, §5.1)", () => {
   it("recusa dados inválidos no cálculo, dizendo onde", () => {
     const calculo = calculoCompleto();
     const resultado = calcular(calculo, tabelaRegimeNovo());
+    const periodo = (c: Record<string, unknown>, i: number) =>
+      (c.base as { periodos: Array<Record<string, unknown>> }).periodos[i]!;
+    const forma = (c: Record<string, unknown>, i: number) =>
+      periodo(c, i).forma as Record<string, unknown>;
     const com = (mexer: (c: Record<string, unknown>) => void): string => {
       const copia = structuredClone(calculo) as unknown as Record<string, unknown>;
       mexer(copia);
@@ -126,13 +139,21 @@ describe("lerArquivo (validação do arquivo aberto, §5.1)", () => {
     const casos: Array<[string, (c: Record<string, unknown>) => void]> = [
       ["dataElaboracao", (c) => (c.dataElaboracao = "11/10/2026")],
       ["dataElaboracao", (c) => (c.dataElaboracao = "2026-02-30")],
-      ["base.tipo", (c) => ((c.base as Record<string, unknown>).tipo = "outra")],
-      ["base.dataFixacao", (c) => ((c.base as Record<string, unknown>).dataFixacao = "")],
-      ["base.mesReajuste", (c) => ((c.base as Record<string, unknown>).mesReajuste = 13)],
-      [
-        "base.indiceReajuste",
-        (c) => ((c.base as Record<string, unknown>).indiceReajuste = "SELIC"),
-      ],
+      ["base.periodos[0].forma.tipo", (c) => (forma(c, 0).tipo = "outra")],
+      ["base.periodos[0].forma.dataFixacao", (c) => (forma(c, 0).dataFixacao = "")],
+      ["base.periodos[0].forma.mesReajuste", (c) => (forma(c, 0).mesReajuste = 13)],
+      ["base.periodos[0].forma.indiceReajuste", (c) => (forma(c, 0).indiceReajuste = "SELIC")],
+      ["base.periodos[1].forma.percentual", (c) => (forma(c, 1).percentual = 30)],
+      // a base antiga, de um item só, não abre (sem retrocompatibilidade, §17.2)
+      ["base.periodos", (c) => (c.base = forma(c, 0))],
+      ["base.periodos", (c) => (c.base = { periodos: [] })],
+      // o primeiro sem começo, o último sem fim, seguidos, sem buraco nem sobreposição
+      ["base.periodos[0].de", (c) => (periodo(c, 0).de = "2020-01-01")],
+      ["base.periodos[1].ate", (c) => (periodo(c, 1).ate = "2030-12-31")],
+      ["base.periodos[1].de", (c) => (periodo(c, 1).de = "2026-02-01")],
+      ["base.periodos[1].de", (c) => (periodo(c, 1).de = "2025-12-31")],
+      ["base.periodos[0].ate", (c) => (periodo(c, 0).ate = null)],
+      ["base.periodos[0].ate", (c) => (periodo(c, 0).ate = "2025-13-01")],
       [
         "lancamentos[0].data",
         (c) => ((c.lancamentos as Array<Record<string, unknown>>)[0]!.data = 20260905),
@@ -205,6 +226,8 @@ describe("lerArquivo (validação do arquivo aberto, §5.1)", () => {
       expect(leitura.ok, caminho).toBe(false);
       if (leitura.ok) continue;
       expect(leitura.erro, caminho).toMatch(/^O arquivo traz um dado inválido em "/);
+      // na base, a frase aponta o campo exato
+      if (caminho.startsWith("base")) expect(leitura.erro, caminho).toContain(`"${caminho}"`);
     }
     expect(lerArquivo(com((c) => (c.dataElaboracao = "2026-02-30")))).toEqual({
       ok: false,
@@ -222,7 +245,7 @@ describe("lerArquivo (validação do arquivo aberto, §5.1)", () => {
     ).toMatchObject({ ok: false, erro: expect.stringContaining('"lancamentos[0].data"') });
     expect(lerArquivo(com((c) => (c.dataElaboracao = "2199-12-31"))).ok).toBe(true);
     // textos decimais da base e dos acréscimos são aceitos como texto (o motor avisa se inválidos)
-    const leitura = lerArquivo(com((c) => ((c.base as Record<string, unknown>).valor = "1,5")));
+    const leitura = lerArquivo(com((c) => (forma(c, 0).valor = "1,5")));
     expect(leitura.ok).toBe(true);
   });
 
diff --git a/src/ui/estado/calculo.test.ts b/src/ui/estado/calculo.test.ts
index d5dc75f..e115d56 100644
--- a/src/ui/estado/calculo.test.ts
+++ b/src/ui/estado/calculo.test.ts
@@ -2,6 +2,7 @@ import { describe, expect, it } from "vitest";
 import type { Lancamento } from "../../compartilhado/tipos.ts";
 import { descreverSituacao } from "../../indices/congelar.ts";
 import { metodologiaPadrao } from "../../metodologias/padrao.ts";
+import { baseUnica } from "../../motor/base.ts";
 import { tabelaRegimeNovo } from "../../motor/testes/regime-novo.ts";
 import { estadoInicial, novoCalculo, reduzir, type Estado } from "./calculo.ts";
 
@@ -41,11 +42,19 @@ describe("novoCalculo", () => {
         executado: "",
       },
       base: {
-        tipo: "valorFixo",
-        valor: "",
-        dataFixacao: HOJE,
-        indiceReajuste: "nenhum",
-        mesReajuste: 10,
+        periodos: [
+          {
+            de: null,
+            ate: null,
+            forma: {
+              tipo: "valorFixo",
+              valor: "",
+              dataFixacao: HOJE,
+              indiceReajuste: "nenhum",
+              mesReajuste: 10,
+            },
+          },
+        ],
       },
       lotes: {},
       lancamentos: [],
@@ -72,10 +81,12 @@ describe("reduzir: campos simples", () => {
     expect(estado.tocado).toBe(true);
     estado = reduzir(estado, {
       tipo: "base",
-      base: { tipo: "percentualSalarioMinimo", percentual: "30" },
+      base: baseUnica({ tipo: "percentualSalarioMinimo", percentual: "30" }),
       em: DEPOIS,
     });
-    expect(estado.calculo.base).toEqual({ tipo: "percentualSalarioMinimo", percentual: "30" });
+    expect(estado.calculo.base).toEqual(
+      baseUnica({ tipo: "percentualSalarioMinimo", percentual: "30" }),
+    );
     estado = reduzir(estado, { tipo: "dataElaboracao", data: "2026-09-30", em: DEPOIS });
     expect(estado.calculo.dataElaboracao).toBe("2026-09-30");
     estado = reduzir(estado, {
diff --git a/src/ui/estado/faltas.test.ts b/src/ui/estado/faltas.test.ts
index 4666ea8..9b9ecc3 100644
--- a/src/ui/estado/faltas.test.ts
+++ b/src/ui/estado/faltas.test.ts
@@ -1,5 +1,6 @@
 import { describe, expect, it } from "vitest";
 import type { Lancamento } from "../../compartilhado/tipos.ts";
+import { baseUnica } from "../../motor/base.ts";
 import { novoCalculo } from "./calculo.ts";
 import { faltasDaBase } from "./faltas.ts";
 
@@ -25,6 +26,7 @@ describe("o que falta na base dos alimentos (decisão de 13/10/2026)", () => {
     expect(faltasDaBase(calculo([prestacao({ valorInformado: "500.00" })]))).toEqual([]);
     expect(faltasDaBase(calculo([prestacao()]))).toEqual([
       {
+        periodo: 0,
         campo: "valor",
         erro: "Informe o valor fixado.",
         aviso:
@@ -35,14 +37,14 @@ describe("o que falta na base dos alimentos (decisão de 13/10/2026)", () => {
 
   it("percentual do salário mínimo; percentual e rendimento padrão dos rendimentos", () => {
     const sm = calculo([prestacao()]);
-    sm.base = { tipo: "percentualSalarioMinimo", percentual: "" };
+    sm.base = baseUnica({ tipo: "percentualSalarioMinimo", percentual: "" });
     expect(faltasDaBase(sm).map((f) => f.aviso)).toEqual([
       "Falta o percentual do salário mínimo (seção 2 · Base dos alimentos): as prestações ficam sem valor até ele ser informado.",
     ]);
-    sm.base = { tipo: "percentualSalarioMinimo", percentual: "30" };
+    sm.base = baseUnica({ tipo: "percentualSalarioMinimo", percentual: "30" });
     expect(faltasDaBase(sm)).toEqual([]);
     const rend = calculo([prestacao()]);
-    rend.base = { tipo: "percentualRendimentos", percentual: "", rendimentoPadrao: "" };
+    rend.base = baseUnica({ tipo: "percentualRendimentos", percentual: "", rendimentoPadrao: "" });
     expect(faltasDaBase(rend).map((f) => [f.campo, f.erro])).toEqual([
       ["percentual", "Informe o percentual."],
       ["rendimentoPadrao", "Informe o rendimento padrão."],
@@ -51,4 +53,53 @@ describe("o que falta na base dos alimentos (decisão de 13/10/2026)", () => {
     rend.lancamentos = [prestacao({ rendimento: "2000.00" })];
     expect(faltasDaBase(rend).map((f) => f.campo)).toEqual(["percentual"]);
   });
+
+  it("base por períodos: o aviso diz qual período, e só avisa o período em que vence alguma prestação pela base (§17.2)", () => {
+    const c = calculo([prestacao({ id: "p-2026-09", data: "2026-09-05" })]);
+    c.base = {
+      periodos: [
+        {
+          de: null,
+          ate: "2024-12-31",
+          forma: {
+            tipo: "valorFixo",
+            valor: "",
+            dataFixacao: "2024-03-10",
+            indiceReajuste: "nenhum",
+            mesReajuste: 3,
+          },
+        },
+        {
+          de: "2025-01-01",
+          ate: null,
+          forma: { tipo: "percentualRendimentos", percentual: "", rendimentoPadrao: "" },
+        },
+      ],
+    };
+    // nenhuma prestação vence no 1º período: o valor em branco não é apontado
+    expect(faltasDaBase(c)).toEqual([
+      {
+        periodo: 1,
+        campo: "percentual",
+        erro: "Informe o percentual.",
+        aviso:
+          "Falta o percentual dos rendimentos no período desde 01/01/2025 (seção 2 · Base dos alimentos): as prestações desse período ficam sem valor até ele ser informado.",
+      },
+      {
+        periodo: 1,
+        campo: "rendimentoPadrao",
+        erro: "Informe o rendimento padrão.",
+        aviso:
+          "Falta o rendimento mensal padrão no período desde 01/01/2025 (seção 2 · Base dos alimentos): as prestações desse período sem rendimento próprio ficam sem valor até ele ser informado.",
+      },
+    ]);
+    c.lancamentos.push(prestacao({ id: "p-2024-05", data: "2024-05-05" }));
+    expect(faltasDaBase(c)[0]).toEqual({
+      periodo: 0,
+      campo: "valor",
+      erro: "Informe o valor fixado.",
+      aviso:
+        "Falta o valor fixado no período até 31/12/2024 (seção 2 · Base dos alimentos): as prestações desse período ficam sem valor até ele ser informado.",
+    });
+  });
 });
diff --git a/src/ui/estado/novaLinha.test.ts b/src/ui/estado/novaLinha.test.ts
index 4a5d9b4..23f9bd3 100644
--- a/src/ui/estado/novaLinha.test.ts
+++ b/src/ui/estado/novaLinha.test.ts
@@ -1,5 +1,6 @@
 import { describe, expect, it } from "vitest";
-import type { Calculo, Lancamento } from "../../compartilhado/tipos.ts";
+import type { Calculo, FormaDaBase, Lancamento } from "../../compartilhado/tipos.ts";
+import { baseUnica } from "../../motor/base.ts";
 import { tabelaRegimeNovo } from "../../motor/testes/regime-novo.ts";
 import { novoCalculo } from "./calculo.ts";
 import { dividirPeriodo } from "./metodologia.ts";
@@ -7,15 +8,17 @@ import { sugerirPagamento, sugerirPrestacao, valorPelaBase } from "./novaLinha.t
 
 const HOJE = "2026-10-11";
 
-function calculoCom(lancamentos: Lancamento[], base?: Calculo["base"]): Calculo {
+function calculoCom(lancamentos: Lancamento[], forma?: FormaDaBase): Calculo {
   const calculo = novoCalculo({ id: "c", agora: "2026-10-11T15:00:00-03:00", hoje: HOJE });
-  calculo.base = base ?? {
-    tipo: "valorFixo",
-    valor: "1000.00",
-    dataFixacao: "2024-01-10",
-    indiceReajuste: "nenhum",
-    mesReajuste: 1,
-  };
+  calculo.base = baseUnica(
+    forma ?? {
+      tipo: "valorFixo",
+      valor: "1000.00",
+      dataFixacao: "2024-01-10",
+      indiceReajuste: "nenhum",
+      mesReajuste: 1,
+    },
+  );
   calculo.lancamentos = lancamentos;
   return calculo;
 }
@@ -58,7 +61,6 @@ describe("sugestões da linha nova (decisões de 13/10/2026)", () => {
     expect(valorPelaBase(calculo, tabelaRegimeNovo(), "2025-03-10")).toBe("455.40");
     // base sem como apurar (valor fixo em branco): sem sugestão
     const embranco = calculoCom([], {
-      ...calculo.base,
       tipo: "valorFixo",
       valor: "",
       dataFixacao: HOJE,
@@ -68,6 +70,27 @@ describe("sugestões da linha nova (decisões de 13/10/2026)", () => {
     expect(valorPelaBase(embranco, tabelaRegimeNovo(), HOJE)).toBe("");
   });
 
+  it("prestação: com a base por períodos, o valor vem do período do vencimento sugerido (§17.2)", () => {
+    const calculo = calculoCom([prestacao("p-2024-12", "2024-12-05")]);
+    calculo.base = {
+      periodos: [
+        { de: null, ate: "2024-12-31", forma: calculo.base.periodos[0]!.forma },
+        {
+          de: "2025-01-01",
+          ate: null,
+          forma: { tipo: "percentualSalarioMinimo", percentual: "30" },
+        },
+      ],
+    };
+    expect(sugerirPrestacao(calculo, tabelaRegimeNovo())).toEqual({
+      tipo: "prestacao",
+      data: "2025-01-05",
+      valor: "455.40",
+      pelaBase: true,
+    });
+    expect(valorPelaBase(calculo, tabelaRegimeNovo(), "2024-11-05")).toBe("1000.00");
+  });
+
   it("prestação: a última tinha valor informado à mão, a nova vem com o mesmo valor, também informado", () => {
     const calculo = calculoCom([
       prestacao("p-2026-09", "2026-09-05", { valorInformado: "1200.00" }),
diff --git a/src/ui/recentes.test.ts b/src/ui/recentes.test.ts
index d906619..e46a9e9 100644
--- a/src/ui/recentes.test.ts
+++ b/src/ui/recentes.test.ts
@@ -1,4 +1,5 @@
 import { describe, expect, it } from "vitest";
+import { baseUnica } from "../motor/base.ts";
 import { calcular } from "../motor/calcular.ts";
 import { tabelaRegimeNovo } from "../motor/testes/regime-novo.ts";
 import { lerArquivo, montarArquivo, serializarArquivo } from "./arquivo.ts";
@@ -85,13 +86,13 @@ describe("cálculos recentes no navegador (§5.5)", () => {
   it("cada recente guarda só o cálculo e, do resultado, os índices usados e a data da consulta, em JSON compacto (D5 revisto)", () => {
     const armazenamento = armazenamentoEmMemoria();
     const calculo = calculoDe("c-1", "2026-10-11T10:00:00-03:00", "processo-1");
-    calculo.base = {
+    calculo.base = baseUnica({
       tipo: "valorFixo",
       valor: "1000.00",
       dataFixacao: "2024-01-10",
       indiceReajuste: "nenhum",
       mesReajuste: 1,
-    };
+    });
     calculo.lancamentos = gerarLotePrestacoes(
       { diaVencimento: 5, mesesEmAtraso: 24 },
       HOJE,
diff --git a/src/ui/secoes/Base.test.tsx b/src/ui/secoes/Base.test.tsx
index 1e1aade..fba777a 100644
--- a/src/ui/secoes/Base.test.tsx
+++ b/src/ui/secoes/Base.test.tsx
@@ -3,13 +3,13 @@ import { cleanup, fireEvent, render, screen } from "@testing-library/react";
 import userEvent from "@testing-library/user-event";
 import { useState } from "react";
 import { afterEach, describe, expect, it, vi } from "vitest";
-import type { Base } from "../../compartilhado/tipos.ts";
+import type { FormaDaBase } from "../../compartilhado/tipos.ts";
 import { BaseDosAlimentos } from "./Base.tsx";
 
 afterEach(cleanup);
 
 const HOJE = "2026-10-11";
-const fixa: Base = {
+const fixa: FormaDaBase = {
   tipo: "valorFixo",
   valor: "",
   dataFixacao: HOJE,
@@ -18,7 +18,13 @@ const fixa: Base = {
 };
 
 /** A seção dentro de um estado de verdade (como no App): cada mudança válida volta como `base`. */
-function Harness({ inicial, espiao }: { inicial: Base; espiao: (base: Base) => void }) {
+function Harness({
+  inicial,
+  espiao,
+}: {
+  inicial: FormaDaBase;
+  espiao: (base: FormaDaBase) => void;
+}) {
   const [base, setBase] = useState(inicial);
   return (
     <BaseDosAlimentos
diff --git a/src/ui/tabelas/Tabelas.test.tsx b/src/ui/tabelas/Tabelas.test.tsx
index 827b78a..890aa8b 100644
--- a/src/ui/tabelas/Tabelas.test.tsx
+++ b/src/ui/tabelas/Tabelas.test.tsx
@@ -4,6 +4,7 @@ import userEvent from "@testing-library/user-event";
 import { afterEach, describe, expect, it, vi } from "vitest";
 import { decimal } from "../../compartilhado/decimal.ts";
 import { formatarMoeda } from "../../compartilhado/formatacao.ts";
+import { baseUnica } from "../../motor/base.ts";
 import { calcular } from "../../motor/calcular.ts";
 import { gerarLoteAmortizacoes, gerarLotePrestacoes } from "../../motor/lote.ts";
 import App from "../App.tsx";
@@ -20,13 +21,13 @@ const multaEHonorarios = (r: ReturnType<typeof calcular>) =>
 /** O que o motor devolve para o mesmo caso montado na tela: valor fixo R$ 1.000,00, dia 5, 2 meses. */
 function esperado() {
   const calculo = novoCalculo({ id: "x", agora: AGORA_DE_TESTE, hoje: HOJE_DE_TESTE });
-  calculo.base = {
+  calculo.base = baseUnica({
     tipo: "valorFixo",
     valor: "1000.00",
     dataFixacao: HOJE_DE_TESTE,
     indiceReajuste: "nenhum",
     mesReajuste: 10,
-  };
+  });
   calculo.lancamentos = gerarLotePrestacoes(
     { diaVencimento: 5, mesesEmAtraso: 2 },
     HOJE_DE_TESTE,
````

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run`
Expected: `Tests  161 failed | 669 passed | 10 skipped (840)` (arquivos: `11 failed | 33 passed (44)`). Falham:
  - `src/motor/base.test.ts`: 8 testes;
  - `src/motor/calcular.test.ts`: 39 testes;
  - `src/motor/casos-pela-base.test.ts`: "SAJ 2026: 30% do salário mínimo do período (1.412,00, 1.518,00 e 1.621,00) reproduz as 32 prestações e os totais"; "SELIC única com base em 30% do salário mínimo reproduz os 22 valores corrigidos do relatório do SAJ de 11/10/2026 (tabela até ago/2026)"; "lote de prestações e lote de pagamentos geram exatamente os lançamentos do caso INPC do SAJ"; "lote → base → cálculo: o lote do caso de 30% × R$ 1.500,00 gera exatamente as 22 prestações do caso";
  - `src/motor/casos.test.ts`: 84 testes;
  - `src/ui/Abrir.test.tsx`: "abre um arquivo salvo, recalcula com os índices de hoje e avisa qual índice usado mudou"; "arquivo inválido: o painel fica aberto com a frase do erro e o cálculo atual não muda"; "falha ao ler o arquivo ou ao recalculá-lo: o painel fica aberto com a frase do erro e o cálculo atual não muda"; "recente enxuto (só o cálculo e os índices usados) abre, recalcula e avisa do índice que mudou; recente antigo, com o envelope inteiro, também abre"; "se o cálculo atual não pôde ser guardado nos recentes (cota cheia, armazenamento bloqueado), o painel 'Abrir' avisa";
  - `src/ui/arquivo.test.ts`: "descarta campos desconhecidos e aceita cálculo sem lotes"; "lê de volta o que foi salvo, com os índices usados e a data da consulta, sem avisos"; "recusa dados inválidos no cálculo, dizendo onde"; "resultado ausente ou estranho: abre com aviso e sem comparação; série desconhecida sai com aviso";
  - `src/ui/estado/calculo.test.ts`: "nasce em branco, com a data de hoje, valor fixo sem reajuste fixado hoje e a metodologia padrão"; "altera cabeçalho, base, data de elaboração, acréscimos, observações e metodologia, marcando atualizadoEm";
  - `src/ui/estado/faltas.test.ts`: "base por períodos: o aviso diz qual período, e só avisa o período em que vence alguma prestação pela base (§17.2)"; "percentual do salário mínimo; percentual e rendimento padrão dos rendimentos"; "sem prestação pela base, nada falta; com ela, o campo em branco é apontado";
  - `src/ui/estado/novaLinha.test.ts`: 8 testes;
  - `src/ui/recentes.test.ts`: "cada recente guarda só o cálculo e, do resultado, os índices usados e a data da consulta, em JSON compacto (D5 revisto)";
  - `src/ui/tabelas/Tabelas.test.tsx`: "mostra as prestações do lote com os valores do motor, os totais e os cinco indicadores"; "um pagamento entra na tabela de amortizações com as mesmas colunas e abate do total; excluir recalcula"; "▸ expande a memória (base, índices, juros e avisos) e volta a esconder".
  Motivo: os testes novos de `base.test.ts` não acham as funções novas; os cálculos de teste, os casos de referência e a leitura do arquivo já estão no formato novo, que o código ainda não entende. Nenhum outro arquivo pode falhar.

- [ ] **Step 3: Aplicar o patch do código**

````diff
diff --git a/src/compartilhado/tipos.ts b/src/compartilhado/tipos.ts
index 21ebb2c..ff12e64 100644
--- a/src/compartilhado/tipos.ts
+++ b/src/compartilhado/tipos.ts
@@ -120,7 +120,8 @@ export interface Cabecalho {
   executado: string;
 }
 
-export type Base =
+/** Uma das três formas da base dos alimentos (§5.2, §6.3), com os seus campos. */
+export type FormaDaBase =
   | {
       tipo: "valorFixo";
       valor: TextoDecimal;
@@ -132,6 +133,24 @@ export type Base =
   | { tipo: "percentualSalarioMinimo"; percentual: TextoDecimal }
   | { tipo: "percentualRendimentos"; percentual: TextoDecimal; rendimentoPadrao: TextoDecimal };
 
+/**
+ * Um período da base (§17.2): vale para as prestações cujo vencimento cai de `de` a `ate`,
+ * inclusive. `de` nulo: sem começo (o primeiro período); `ate` nulo: sem fim (o último).
+ */
+export interface PeriodoDaBase {
+  de: DataISO | null;
+  ate: DataISO | null;
+  forma: FormaDaBase;
+}
+
+/**
+ * Base dos alimentos por períodos (§17.2, fase 5b): seguidos, sem buraco nem sobreposição, o
+ * primeiro sem começo e o último sem fim. O cálculo comum tem um período só, de `null` a `null`.
+ */
+export interface Base {
+  periodos: PeriodoDaBase[];
+}
+
 export interface LotePrestacoes {
   diaVencimento: number;
   mesesEmAtraso?: number;
diff --git a/src/motor/base.ts b/src/motor/base.ts
index 8cc4be9..2ee5b46 100644
--- a/src/motor/base.ts
+++ b/src/motor/base.ts
@@ -25,9 +25,12 @@ import type {
   Base,
   CodigoSerie,
   Competencia,
+  DataISO,
+  FormaDaBase,
   IndiceUsado,
   Lancamento,
   NomeIndice,
+  PeriodoDaBase,
   TabelaIndices,
 } from "../compartilhado/tipos.ts";
 import { aindaNaoDivulgado, divulgacaoPrevista } from "../compartilhado/divulgacao.ts";
@@ -52,7 +55,7 @@ export interface ValorBaseApurado {
 
 const SALARIO_MINIMO = CODIGO_DA_SERIE.SM;
 
-type BaseValorFixo = Extract<Base, { tipo: "valorFixo" }>;
+type BaseValorFixo = Extract<FormaDaBase, { tipo: "valorFixo" }>;
 
 /** "30%", "48,23%": o percentual da base como foi informado, sem casas fixas. */
 function percentualInformado(valor: Decimal): string {
@@ -183,7 +186,7 @@ function porSalarioMinimo(
 }
 
 function porRendimentos(
-  base: Extract<Base, { tipo: "percentualRendimentos" }>,
+  base: Extract<FormaDaBase, { tipo: "percentualRendimentos" }>,
   lancamento: Lancamento,
   competencia: Competencia,
   valorCasas: number,
@@ -434,7 +437,7 @@ function porValorFixo(
  */
 export function apurarValorBase(
   lancamento: Lancamento,
-  base: Base,
+  base: FormaDaBase,
   tabela: TabelaIndices,
   valorCasas: number,
 ): ValorBaseApurado {
@@ -447,11 +450,68 @@ export function apurarValorBase(
     case "valorFixo":
       return porValorFixo(base, competencia, tabela, valorCasas);
     default:
-      // Checagem de exaustividade: uma forma nova de Base esquecida aqui falha na compilação.
+      // Checagem de exaustividade: uma forma nova da base esquecida aqui falha na compilação.
       base satisfies never;
       return semValor(
-        "Base desconhecida",
+        "FormaDaBase desconhecida",
         "Tipo de base não reconhecido: a prestação ficou sem valor; informe o valor à mão.",
       );
   }
 }
+
+/** Base de um período só, de `null` a `null`: o cálculo comum (§17.2). */
+export function baseUnica(forma: FormaDaBase): Base {
+  return { periodos: [{ de: null, ate: null, forma }] };
+}
+
+/** Os períodos da base em ordem cronológica (o sem começo primeiro). */
+export function periodosDaBaseOrdenados(base: Base): PeriodoDaBase[] {
+  return [...base.periodos].sort((a, b) => {
+    if (a.de === b.de) return 0;
+    if (a.de === null) return -1;
+    if (b.de === null) return 1;
+    return a.de < b.de ? -1 : 1;
+  });
+}
+
+/**
+ * O período da base em que cai a data: o primeiro, em ordem cronológica, cujo intervalo [de, ate]
+ * (nulos = aberto) a contém; `undefined` se nenhum a cobre (só com base fora do padrão).
+ */
+export function periodoDaData(base: Base, data: DataISO): PeriodoDaBase | undefined {
+  return periodosDaBaseOrdenados(base).find(
+    (p) => (p.de === null || p.de <= data) && (p.ate === null || data <= p.ate),
+  );
+}
+
+/** "até 31/12/2024", "de 01/01/2025 a 30/06/2025", "desde 01/07/2025" ou "em todo o período". */
+export function descreverPeriodoDaBase(p: Pick<PeriodoDaBase, "de" | "ate">): string {
+  if (p.de !== null && p.ate !== null) return `de ${formatarData(p.de)} a ${formatarData(p.ate)}`;
+  if (p.de !== null) return `desde ${formatarData(p.de)}`;
+  if (p.ate !== null) return `até ${formatarData(p.ate)}`;
+  return "em todo o período";
+}
+
+/**
+ * Valor-base de uma prestação pela base por períodos (§17.2): a forma do período em que cai o
+ * vencimento, com a conta de `apurarValorBase`. Com dois ou mais períodos, a memória começa
+ * dizendo qual valeu ("Base desde 01/01/2025: …"). Vencimento que nenhum período cobre fica sem
+ * valor, com aviso; nunca lança erro.
+ */
+export function apurarPelaBase(
+  lancamento: Lancamento,
+  base: Base,
+  tabela: TabelaIndices,
+  valorCasas: number,
+): ValorBaseApurado {
+  const periodo = periodoDaData(base, lancamento.data);
+  if (periodo === undefined) {
+    return semValor(
+      "Nenhum período da base cobre o vencimento",
+      `Nenhum período da base cobre o vencimento de ${formatarData(lancamento.data)}: a prestação ficou sem valor; informe o valor à mão.`,
+    );
+  }
+  const apurado = apurarValorBase(lancamento, periodo.forma, tabela, valorCasas);
+  if (base.periodos.length <= 1) return apurado;
+  return { ...apurado, memoria: `Base ${descreverPeriodoDaBase(periodo)}: ${apurado.memoria}` };
+}
diff --git a/src/motor/calcular.ts b/src/motor/calcular.ts
index e3fd048..0a11562 100644
--- a/src/motor/calcular.ts
+++ b/src/motor/calcular.ts
@@ -25,7 +25,7 @@ import type {
   TextoDecimal,
   Totais,
 } from "../compartilhado/tipos.ts";
-import { apurarValorBase, type MesSemIndice } from "./base.ts";
+import { apurarPelaBase, type MesSemIndice } from "./base.ts";
 import { fatorCorrecao, resolverIndicesMensais } from "./correcao.ts";
 import { aindaNaoDivulgado, divulgacaoPrevista } from "../compartilhado/divulgacao.ts";
 import { jurosSimples } from "./juros.ts";
@@ -129,7 +129,7 @@ function resolverValor(
     avisos.push("Pagamento sem valor informado: não computado nos totais.");
     return { valorBase: ZERO, memoriaBase: "Valor não informado", editado: false, semValor: true };
   }
-  const base = apurarValorBase(lancamento, calculo.base, indices, valorCasas);
+  const base = apurarPelaBase(lancamento, calculo.base, indices, valorCasas);
   avisos.push(...base.avisos);
   rastro.indicesDaBase = base.indicesUsados;
   rastro.mesesSemIndiceNaBase = base.mesesSemIndice;
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index b548ca1..7b59133 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -204,11 +204,19 @@ export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambien
             aoEsquecer={esquecerTudo}
             armazenamentoDisponivel={armazenamento !== null}
           />
+          {/* provisório (fase 5b, Task 2): a seção edita o único período; a Task 4 a troca pela
+              seção com períodos */}
           <BaseDosAlimentos
-            base={estado.calculo.base}
+            base={estado.calculo.base.periodos[0]!.forma}
             hoje={ambiente.hoje()}
-            faltas={faltas}
-            aoMudar={(base) => despachar({ tipo: "base", base, em: agora() })}
+            faltas={faltas.filter((f) => f.periodo === 0)}
+            aoMudar={(forma) =>
+              despachar({
+                tipo: "base",
+                base: { periodos: [{ ...estado.calculo.base.periodos[0]!, forma }] },
+                em: agora(),
+              })
+            }
           />
           <LotePrestacoesSecao
             ultimoLote={estado.calculo.lotes.ultimoLotePrestacoes}
diff --git a/src/ui/arquivo.ts b/src/ui/arquivo.ts
index b1bc3ee..198450c 100644
--- a/src/ui/arquivo.ts
+++ b/src/ui/arquivo.ts
@@ -1,4 +1,4 @@
-import { competenciaValida, dataValida } from "../compartilhado/datas.ts";
+import { competenciaValida, dataValida, diaSeguinte } from "../compartilhado/datas.ts";
 import { textoDecimalValido } from "../compartilhado/decimal.ts";
 import { NOME_DA_SERIE } from "../compartilhado/tipos.ts";
 import type {
@@ -8,11 +8,13 @@ import type {
   Calculo,
   CodigoSerie,
   EncargosProprios,
+  FormaDaBase,
   IndiceUsado,
   Lancamento,
   LoteAmortizacoes,
   LotePrestacoes,
   Metodologia,
+  PeriodoDaBase,
   PeriodoMetodologia,
   RegraJuros,
   Resultado,
@@ -190,33 +192,62 @@ function lerMetodologia(valor: unknown, caminho: string): Metodologia {
   };
 }
 
-function lerBase(valor: unknown): Base {
-  const b = objeto(valor, "base");
+function lerForma(valor: unknown, caminho: string): FormaDaBase {
+  const b = objeto(valor, caminho);
   const tipo = umDe(
     b.tipo,
     ["valorFixo", "percentualSalarioMinimo", "percentualRendimentos"] as const,
-    "base.tipo",
+    `${caminho}.tipo`,
   );
   switch (tipo) {
     case "valorFixo":
       return {
         tipo,
-        valor: texto(b.valor, "base.valor"),
-        dataFixacao: data(b.dataFixacao, "base.dataFixacao"),
-        indiceReajuste: umDe(b.indiceReajuste, INDICES_DE_REAJUSTE, "base.indiceReajuste"),
-        mesReajuste: inteiro(b.mesReajuste, "base.mesReajuste", 1, 12),
+        valor: texto(b.valor, `${caminho}.valor`),
+        dataFixacao: data(b.dataFixacao, `${caminho}.dataFixacao`),
+        indiceReajuste: umDe(b.indiceReajuste, INDICES_DE_REAJUSTE, `${caminho}.indiceReajuste`),
+        mesReajuste: inteiro(b.mesReajuste, `${caminho}.mesReajuste`, 1, 12),
       };
     case "percentualSalarioMinimo":
-      return { tipo, percentual: texto(b.percentual, "base.percentual") };
+      return { tipo, percentual: texto(b.percentual, `${caminho}.percentual`) };
     case "percentualRendimentos":
       return {
         tipo,
-        percentual: texto(b.percentual, "base.percentual"),
-        rendimentoPadrao: texto(b.rendimentoPadrao, "base.rendimentoPadrao"),
+        percentual: texto(b.percentual, `${caminho}.percentual`),
+        rendimentoPadrao: texto(b.rendimentoPadrao, `${caminho}.rendimentoPadrao`),
       };
   }
 }
 
+/**
+ * Base por períodos (§17.2): ao menos um período, em ordem; o primeiro sem começo, o último sem
+ * fim, cada um começando no dia seguinte ao fim do anterior (sem buraco nem sobreposição). A base
+ * antiga, de um item só, não é aceita (sem retrocompatibilidade, decisão de 13/10/2026).
+ */
+function lerBase(valor: unknown): Base {
+  const b = objeto(valor, "base");
+  const brutos = lista(b.periodos, "base.periodos");
+  if (brutos.length === 0) falhar("base.periodos");
+  const periodos = brutos.map((p, i): PeriodoDaBase => {
+    const caminho = `base.periodos[${i}]`;
+    const periodo = objeto(p, caminho);
+    const de = dataOuNula(periodo.de, `${caminho}.de`);
+    const ate = dataOuNula(periodo.ate, `${caminho}.ate`);
+    if (i === 0 && de !== null) falhar(`${caminho}.de`);
+    if (i === brutos.length - 1 && ate !== null) falhar(`${caminho}.ate`);
+    if (i < brutos.length - 1 && ate === null) falhar(`${caminho}.ate`);
+    if (de !== null && ate !== null && de > ate) falhar(caminho);
+    return { de, ate, forma: lerForma(periodo.forma, `${caminho}.forma`) };
+  });
+  periodos.forEach((p, i) => {
+    const anterior = periodos[i - 1];
+    if (anterior?.ate != null && p.de !== diaSeguinte(anterior.ate)) {
+      falhar(`base.periodos[${i}].de`);
+    }
+  });
+  return { periodos };
+}
+
 function lerEncargos(valor: unknown, caminho: string): EncargosProprios {
   const e = objeto(valor, caminho);
   const encargos: EncargosProprios = {};
diff --git a/src/ui/estado/calculo.ts b/src/ui/estado/calculo.ts
index afb08dc..67fa927 100644
--- a/src/ui/estado/calculo.ts
+++ b/src/ui/estado/calculo.ts
@@ -13,6 +13,7 @@ import type {
 } from "../../compartilhado/tipos.ts";
 import type { SituacaoIndices } from "../../indices/congelar.ts";
 import { metodologiaPadrao } from "../../metodologias/padrao.ts";
+import { baseUnica } from "../../motor/base.ts";
 import { gerarLoteAmortizacoes, gerarLotePrestacoes, idLivre } from "../../motor/lote.ts";
 
 /**
@@ -76,8 +77,8 @@ export type Acao =
   | { tipo: "excluirLancamento"; id: string; em: string };
 
 /**
- * Cálculo novo em branco (§5.2): data de elaboração de hoje, base em valor fixo sem reajuste com a
- * data de fixação de hoje (o único campo da base que o motor exige válido) e o valor a preencher,
+ * Cálculo novo em branco (§5.2): data de elaboração de hoje, base de um período só (§17.2) em
+ * valor fixo sem reajuste com a data de fixação de hoje (o único campo da base que o motor exige válido) e o valor a preencher,
  * metodologia padrão, multa e honorários de 10% cada (decisão de 13/10/2026, D26). Defensor e
  * órgão vêm das preferências.
  */
@@ -102,13 +103,13 @@ export function novoCalculo(p: {
       executado: "",
       ...p.cabecalho,
     },
-    base: {
+    base: baseUnica({
       tipo: "valorFixo",
       valor: "",
       dataFixacao: p.hoje,
       indiceReajuste: "nenhum",
       mesReajuste: decompor(p.hoje).mes,
-    },
+    }),
     lotes: {},
     lancamentos: [],
     metodologia: metodologiaPadrao(),
diff --git a/src/ui/estado/faltas.ts b/src/ui/estado/faltas.ts
index a0664f9..98f754e 100644
--- a/src/ui/estado/faltas.ts
+++ b/src/ui/estado/faltas.ts
@@ -1,13 +1,21 @@
-import type { Base, Calculo } from "../../compartilhado/tipos.ts";
+import type { Calculo, FormaDaBase, Lancamento } from "../../compartilhado/tipos.ts";
+import {
+  descreverPeriodoDaBase,
+  periodoDaData,
+  periodosDaBaseOrdenados,
+} from "../../motor/base.ts";
 
 /**
  * Campos da base dos alimentos que faltam para apurar as prestações (decisão de 13/10/2026): com
  * prestação lançada pela base e o campo em branco, a caixa de avisos diz o que falta e onde, e o
- * campo fica em vermelho na seção 2. Módulo puro.
+ * campo fica em vermelho na seção 2. Com a base por períodos (§17.2), cada período é conferido
+ * pelas prestações que vencem nele, e o aviso diz qual período. Módulo puro.
  */
 export type CampoDaBase = "valor" | "percentual" | "rendimentoPadrao";
 
 export interface FaltaDaBase {
+  /** posição do período na base, em ordem cronológica (0 = o primeiro) */
+  periodo: number;
   campo: CampoDaBase;
   /** erro embaixo do campo */
   erro: string;
@@ -17,48 +25,57 @@ export interface FaltaDaBase {
 
 const ONDE = "(seção 2 · Base dos alimentos)";
 
-function falta(
-  campo: CampoDaBase,
-  nome: string,
-  erro: string,
-  quais = "as prestações",
-): FaltaDaBase {
-  return {
-    campo,
-    erro,
-    aviso: `Falta ${nome} ${ONDE}: ${quais} ficam sem valor até ele ser informado.`,
-  };
-}
-
 const vazio = (texto: string) => texto.trim() === "";
 
-export function faltasDaBase(calculo: Calculo): FaltaDaBase[] {
-  const pelaBase = calculo.lancamentos.filter(
-    (l) => l.tipo === "prestacao" && l.valorInformado === undefined,
-  );
-  if (pelaBase.length === 0) return [];
-  const base: Base = calculo.base;
-  if (base.tipo === "valorFixo") {
-    return vazio(base.valor) ? [falta("valor", "o valor fixado", "Informe o valor fixado.")] : [];
+/** O que falta numa forma, dadas as prestações pela base que vencem no período dela. */
+function faltasDaForma(
+  forma: FormaDaBase,
+  prestacoes: Lancamento[],
+): Array<[CampoDaBase, string, string, boolean]> {
+  // [campo, nome no aviso, erro do campo, só as prestações sem rendimento próprio]
+  if (forma.tipo === "valorFixo") {
+    return vazio(forma.valor)
+      ? [["valor", "o valor fixado", "Informe o valor fixado.", false]]
+      : [];
   }
-  if (base.tipo === "percentualSalarioMinimo") {
-    return vazio(base.percentual)
-      ? [falta("percentual", "o percentual do salário mínimo", "Informe o percentual.")]
+  if (forma.tipo === "percentualSalarioMinimo") {
+    return vazio(forma.percentual)
+      ? [["percentual", "o percentual do salário mínimo", "Informe o percentual.", false]]
       : [];
   }
-  const faltas: FaltaDaBase[] = [];
-  if (vazio(base.percentual)) {
-    faltas.push(falta("percentual", "o percentual dos rendimentos", "Informe o percentual."));
+  const faltas: Array<[CampoDaBase, string, string, boolean]> = [];
+  if (vazio(forma.percentual)) {
+    faltas.push(["percentual", "o percentual dos rendimentos", "Informe o percentual.", false]);
   }
-  if (vazio(base.rendimentoPadrao) && pelaBase.some((l) => l.rendimento === undefined)) {
-    faltas.push(
-      falta(
-        "rendimentoPadrao",
-        "o rendimento mensal padrão",
-        "Informe o rendimento padrão.",
-        "as prestações sem rendimento próprio",
-      ),
-    );
+  if (vazio(forma.rendimentoPadrao) && prestacoes.some((l) => l.rendimento === undefined)) {
+    faltas.push([
+      "rendimentoPadrao",
+      "o rendimento mensal padrão",
+      "Informe o rendimento padrão.",
+      true,
+    ]);
   }
   return faltas;
 }
+
+export function faltasDaBase(calculo: Calculo): FaltaDaBase[] {
+  const pelaBase = calculo.lancamentos.filter(
+    (l) => l.tipo === "prestacao" && l.valorInformado === undefined,
+  );
+  const periodos = periodosDaBaseOrdenados(calculo.base);
+  const varios = periodos.length > 1;
+  return periodos.flatMap((periodo, indice) => {
+    const prestacoes = pelaBase.filter((l) => periodoDaData(calculo.base, l.data) === periodo);
+    if (prestacoes.length === 0) return [];
+    const onde = varios ? ` no período ${descreverPeriodoDaBase(periodo)} ${ONDE}` : ` ${ONDE}`;
+    const quais = varios ? "as prestações desse período" : "as prestações";
+    return faltasDaForma(periodo.forma, prestacoes).map(
+      ([campo, nome, erro, semRendimento]): FaltaDaBase => ({
+        periodo: indice,
+        campo,
+        erro,
+        aviso: `Falta ${nome}${onde}: ${quais}${semRendimento ? " sem rendimento próprio" : ""} ficam sem valor até ele ser informado.`,
+      }),
+    );
+  });
+}
diff --git a/src/ui/estado/novaLinha.ts b/src/ui/estado/novaLinha.ts
index a55eaaa..697acab 100644
--- a/src/ui/estado/novaLinha.ts
+++ b/src/ui/estado/novaLinha.ts
@@ -8,7 +8,7 @@ import type {
   TabelaIndices,
   TextoDecimal,
 } from "../../compartilhado/tipos.ts";
-import { apurarValorBase } from "../../motor/base.ts";
+import { apurarPelaBase } from "../../motor/base.ts";
 
 /**
  * Sugestões da linha nova de "+ Prestação" e "+ Pagamento" (decisões de 13/10/2026): a linha
@@ -29,7 +29,10 @@ export interface RascunhoDeLancamento {
   encargos?: EncargosProprios;
 }
 
-/** Valor que a base dos alimentos dá para uma prestação com este vencimento, ou "" se não dá. */
+/**
+ * Valor que a base dos alimentos dá para uma prestação com este vencimento (pelo período em que
+ * ele cai, §17.2), ou "" se não dá.
+ */
 export function valorPelaBase(
   calculo: Calculo,
   tabela: TabelaIndices,
@@ -44,7 +47,7 @@ export function valorPelaBase(
     origem: "avulso",
     editado: false,
   };
-  const apurado = apurarValorBase(prestacao, calculo.base, tabela, casas);
+  const apurado = apurarPelaBase(prestacao, calculo.base, tabela, casas);
   return apurado.valor === null ? "" : paraTexto(apurado.valor, casas);
 }
 
diff --git a/src/ui/secoes/Base.tsx b/src/ui/secoes/Base.tsx
index ba9f470..3c4ddd3 100644
--- a/src/ui/secoes/Base.tsx
+++ b/src/ui/secoes/Base.tsx
@@ -1,6 +1,6 @@
 import { useState } from "react";
 import { decompor } from "../../compartilhado/datas.ts";
-import type { Base, IndiceReajuste } from "../../compartilhado/tipos.ts";
+import type { FormaDaBase, IndiceReajuste } from "../../compartilhado/tipos.ts";
 import { CampoSelecao, CampoTexto, Opcao, useCampoValidado } from "../componentes/Campo.tsx";
 import {
   DATA_MAXIMA,
@@ -47,9 +47,9 @@ export const NOMES_DOS_MESES = [
   "dezembro",
 ] as const;
 
-type BaseValorFixo = Extract<Base, { tipo: "valorFixo" }>;
-type BasePercentualSM = Extract<Base, { tipo: "percentualSalarioMinimo" }>;
-type BasePercentualRendimentos = Extract<Base, { tipo: "percentualRendimentos" }>;
+type BaseValorFixo = Extract<FormaDaBase, { tipo: "valorFixo" }>;
+type BasePercentualSM = Extract<FormaDaBase, { tipo: "percentualSalarioMinimo" }>;
+type BasePercentualRendimentos = Extract<FormaDaBase, { tipo: "percentualRendimentos" }>;
 
 interface Rascunhos {
   valorFixo: BaseValorFixo;
@@ -67,7 +67,7 @@ const OPCOES_DE_REAJUSTE: ReadonlyArray<{ valor: IndiceReajuste; rotulo: string
 
 const OPCOES_DE_MES = NOMES_DOS_MESES.map((nome, i) => ({ valor: String(i + 1), rotulo: nome }));
 
-function rascunhosIniciais(base: Base, hoje: string): Rascunhos {
+function rascunhosIniciais(base: FormaDaBase, hoje: string): Rascunhos {
   const mes = decompor(hoje).mes;
   return {
     valorFixo: {
@@ -89,16 +89,16 @@ export function BaseDosAlimentos({
   faltas = [],
   aoMudar,
 }: {
-  base: Base;
+  base: FormaDaBase;
   /** data de hoje, para o rascunho do valor fixo */
   hoje: string;
   /** campos que faltam para apurar as prestações lançadas (`faltasDaBase`) */
   faltas?: FaltaDaBase[];
-  aoMudar: (base: Base) => void;
+  aoMudar: (base: FormaDaBase) => void;
 }) {
   const [rascunhos, setRascunhos] = useState(() => rascunhosIniciais(base, hoje));
-  const escolher = (tipo: Base["tipo"]) => aoMudar(rascunhos[tipo]);
-  const atualizar = <T extends Base>(nova: T) => {
+  const escolher = (tipo: FormaDaBase["tipo"]) => aoMudar(rascunhos[tipo]);
+  const atualizar = <T extends FormaDaBase>(nova: T) => {
     setRascunhos({ ...rascunhos, [nova.tipo]: nova });
     aoMudar(nova);
   };
diff --git a/src/ui/tabelas/Personalizar.tsx b/src/ui/tabelas/Personalizar.tsx
index 4547295..ecb1492 100644
--- a/src/ui/tabelas/Personalizar.tsx
+++ b/src/ui/tabelas/Personalizar.tsx
@@ -7,6 +7,7 @@ import type {
   Lancamento,
   Metodologia,
 } from "../../compartilhado/tipos.ts";
+import { periodoDaData } from "../../motor/base.ts";
 import { Ajuda } from "../componentes/Ajuda.tsx";
 import { CampoTexto, Opcao } from "../componentes/Campo.tsx";
 import {
@@ -76,7 +77,11 @@ export function Personalizar({
     lancamento.encargos?.metodologia ?? null,
   );
   const [erros, setErros] = useState<Partial<Record<Campo, string>>>({});
-  const comRendimento = calculo.base.tipo === "percentualRendimentos" && prestacao;
+  // o rendimento do mês aparece quando o período da base em que a prestação vence é "% dos
+  // rendimentos" (§17.2)
+  const comRendimento =
+    prestacao &&
+    periodoDaData(calculo.base, lancamento.data)?.forma.tipo === "percentualRendimentos";
 
   const aplicar = (evento: FormEvent) => {
     evento.preventDefault();
````

- [ ] **Step 4: Formatar, verificar e conferir a contagem**

Run: `npm run format && npm run verificar`
Expected: tudo verde; `Tests  830 passed | 10 skipped (840)`, `Test Files  44 passed (44)`. O teste pulado a mais é o "avisos do resultado batem" do caso novo, que não traz `esperado.avisos` (como os nove de antes).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "motor: base dos alimentos por períodos (tipos, apuração pelo vencimento, arquivo, casos)

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 3: Seção 2 com a base por períodos (dividir, remover divisão, forma por período)

§17.2, seção 2 na tela (D4, T2). Módulo puro novo para editar os períodos e a seção que mostra um bloco por período; a ligação provisória da Task 2 no `App.tsx` sai.

**Files:**
- Create: `src/ui/estado/base.ts` (`tituloDoPeriodo`, `dividirBase`, `removerDivisaoDaBase`, `trocarForma`)
- Modify: `src/ui/entrada.ts` (constante `DATA_MINIMA`)
- Modify: `src/ui/secoes/Base.tsx` (a seção recebe a `Base` inteira; `FormaDoPeriodo` com os campos de uma forma; "Dividir em"; blocos com título e "Remover divisão"; ids e nomes por período; a mesma estrutura com um ou vários períodos, para não perder os rascunhos; a forma atual entra no rascunho antes da troca)
- Modify: `src/ui/App.tsx` (a seção recebe `estado.calculo.base` e todas as faltas)
- Modify: `src/ui/tabelas/TabelaLancamentos.tsx` (memória sem "Base: Base")
- Modify: `src/ui/estilos.css` (título do bloco com "Remover divisão"; nota "A base mudou ao longo do tempo?")
- Test: `src/ui/estado/base.test.ts` (novo), `src/ui/secoes/Base.test.tsx` (o `Harness` passa a lidar com a base inteira; oito testes novos, um deles no App)

**Interfaces:**
- Consumes: `periodosDaBaseOrdenados`, `descreverPeriodoDaBase` (Task 2); `FaltaDaBase.periodo` (Task 2).
- Produces (em `src/ui/estado/base.ts`):
  - `tituloDoPeriodo(p: Pick<PeriodoDaBase, "de" | "ate">): string` ("Até 31/12/2024", "De … a …", "Desde …");
  - `dividirBase(base: Base, data: DataISO): { base: Base; aviso?: string }` (aviso "Já existe uma divisão em dd/mm/aaaa.", "Nenhum período cobre dd/mm/aaaa: nada foi dividido." ou, em 01/01/1900, "A data precisa ser posterior a 01/01/1900.");
  - `removerDivisaoDaBase(base: Base, indice: number): Base` (índice 0 ou inexistente devolve a mesma base);
  - `trocarForma(base: Base, indice: number, forma: FormaDaBase): Base`.
- Produces (em `src/ui/entrada.ts`): `DATA_MINIMA: DataISO = "1900-01-01"` (usada também pela Task 5).
- Produces (em `src/ui/secoes/Base.tsx`): `BaseDosAlimentos({ base: Base, hoje, faltas?, aoMudar: (base: Base) => void })`. Rótulos novos: "A base mudou ao longo do tempo?" (só com um período), "Dividir em" (campo de data, com ⓘ), "Dividir" (botão), títulos dos blocos ("Até 31/12/2024" etc., com papel `group`) e "Remover divisão" (nome acessível "Remover a divisão de dd/mm/aaaa"). O primeiro período mantém os ids de antes (`base-valor` etc.); os outros, `base-<i>-…`; os rádios, `tipo-da-base` e `tipo-da-base-<i>`.

- [ ] **Step 1: Aplicar o patch dos testes**

````diff
diff --git a/src/ui/estado/base.test.ts b/src/ui/estado/base.test.ts
new file mode 100644
index 0000000..4a402ec
--- /dev/null
+++ b/src/ui/estado/base.test.ts
@@ -0,0 +1,99 @@
+import { describe, expect, it } from "vitest";
+import type { Base, FormaDaBase } from "../../compartilhado/tipos.ts";
+import { baseUnica } from "../../motor/base.ts";
+import { dividirBase, removerDivisaoDaBase, tituloDoPeriodo, trocarForma } from "./base.ts";
+
+const fixo: FormaDaBase = {
+  tipo: "valorFixo",
+  valor: "500.00",
+  dataFixacao: "2024-03-10",
+  indiceReajuste: "nenhum",
+  mesReajuste: 3,
+};
+const sm: FormaDaBase = { tipo: "percentualSalarioMinimo", percentual: "30" };
+const rendimentos: FormaDaBase = {
+  tipo: "percentualRendimentos",
+  percentual: "30",
+  rendimentoPadrao: "2000.00",
+};
+
+describe("edição da base por períodos (§17.2, fase 5b)", () => {
+  it("dividir numa data: o período que a contém vira dois, o novo como cópia do dividido", () => {
+    const { base, aviso } = dividirBase(baseUnica(fixo), "2025-01-01");
+    expect(aviso).toBeUndefined();
+    expect(base).toEqual({
+      periodos: [
+        { de: null, ate: "2024-12-31", forma: fixo },
+        { de: "2025-01-01", ate: null, forma: fixo },
+      ],
+    });
+    // a cópia é independente
+    expect(base.periodos[1]!.forma).not.toBe(base.periodos[0]!.forma);
+    // dividir de novo no meio do segundo: três períodos, em ordem
+    const tres = dividirBase(base, "2025-07-01").base;
+    expect(tres.periodos.map((p) => [p.de, p.ate])).toEqual([
+      [null, "2024-12-31"],
+      ["2025-01-01", "2025-06-30"],
+      ["2025-07-01", null],
+    ]);
+  });
+
+  it("data que já é início de período não divide, com a frase de aviso", () => {
+    const dividida = dividirBase(baseUnica(fixo), "2025-01-01").base;
+    expect(dividirBase(dividida, "2025-01-01")).toEqual({
+      base: dividida,
+      aviso: "Já existe uma divisão em 01/01/2025.",
+    });
+  });
+
+  it("dividir em 01/01/1900 não divide: o período anterior acabaria em 1899, e o arquivo não reabriria", () => {
+    const unica = baseUnica(fixo);
+    expect(dividirBase(unica, "1900-01-01")).toEqual({
+      base: unica,
+      aviso: "A data precisa ser posterior a 01/01/1900.",
+    });
+    expect(dividirBase(unica, "1900-01-02").base.periodos[0]?.ate).toBe("1900-01-01");
+  });
+
+  it("remover a divisão: o período some, e o anterior se estende até o fim dele, com as regras do anterior", () => {
+    const tres: Base = {
+      periodos: [
+        { de: null, ate: "2024-12-31", forma: fixo },
+        { de: "2025-01-01", ate: "2025-06-30", forma: sm },
+        { de: "2025-07-01", ate: null, forma: rendimentos },
+      ],
+    };
+    expect(removerDivisaoDaBase(tres, 2)).toEqual({
+      periodos: [
+        { de: null, ate: "2024-12-31", forma: fixo },
+        { de: "2025-01-01", ate: null, forma: sm },
+      ],
+    });
+    expect(removerDivisaoDaBase(tres, 1)).toEqual({
+      periodos: [
+        { de: null, ate: "2025-06-30", forma: fixo },
+        { de: "2025-07-01", ate: null, forma: rendimentos },
+      ],
+    });
+    // o primeiro período não tem divisão a remover
+    expect(removerDivisaoDaBase(tres, 0)).toBe(tres);
+  });
+
+  it("trocar a forma de um período não mexe nos outros", () => {
+    const dividida = dividirBase(baseUnica(fixo), "2025-01-01").base;
+    expect(trocarForma(dividida, 1, sm)).toEqual({
+      periodos: [
+        { de: null, ate: "2024-12-31", forma: fixo },
+        { de: "2025-01-01", ate: null, forma: sm },
+      ],
+    });
+  });
+
+  it('título do bloco: "Até …", "De … a …", "Desde …"', () => {
+    expect(tituloDoPeriodo({ de: null, ate: "2024-12-31" })).toBe("Até 31/12/2024");
+    expect(tituloDoPeriodo({ de: "2025-01-01", ate: "2025-06-30" })).toBe(
+      "De 01/01/2025 a 30/06/2025",
+    );
+    expect(tituloDoPeriodo({ de: "2025-07-01", ate: null })).toBe("Desde 01/07/2025");
+  });
+});
diff --git a/src/ui/secoes/Base.test.tsx b/src/ui/secoes/Base.test.tsx
index fba777a..18ba66b 100644
--- a/src/ui/secoes/Base.test.tsx
+++ b/src/ui/secoes/Base.test.tsx
@@ -1,9 +1,13 @@
 // @vitest-environment jsdom
-import { cleanup, fireEvent, render, screen } from "@testing-library/react";
+import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
 import userEvent from "@testing-library/user-event";
 import { useState } from "react";
 import { afterEach, describe, expect, it, vi } from "vitest";
-import type { FormaDaBase } from "../../compartilhado/tipos.ts";
+import type { Base, FormaDaBase } from "../../compartilhado/tipos.ts";
+import { baseUnica } from "../../motor/base.ts";
+import type { FaltaDaBase } from "../estado/faltas.ts";
+import App from "../App.tsx";
+import { ambienteDeTeste } from "../testes/ambiente-de-teste.ts";
 import { BaseDosAlimentos } from "./Base.tsx";
 
 afterEach(cleanup);
@@ -21,15 +25,18 @@ const fixa: FormaDaBase = {
 function Harness({
   inicial,
   espiao,
+  faltas,
 }: {
-  inicial: FormaDaBase;
-  espiao: (base: FormaDaBase) => void;
+  inicial: Base | FormaDaBase;
+  espiao: (base: Base) => void;
+  faltas?: FaltaDaBase[];
 }) {
-  const [base, setBase] = useState(inicial);
+  const [base, setBase] = useState<Base>("periodos" in inicial ? inicial : baseUnica(inicial));
   return (
     <BaseDosAlimentos
       base={base}
       hoje={HOJE}
+      faltas={faltas}
       aoMudar={(nova) => {
         setBase(nova);
         espiao(nova);
@@ -38,6 +45,12 @@ function Harness({
   );
 }
 
+/** A forma que a última mudança gravou no período `indice`. */
+function ultimaForma(espiao: ReturnType<typeof vi.fn>, indice = 0): FormaDaBase | undefined {
+  const base = espiao.mock.lastCall?.[0] as Base | undefined;
+  return base?.periodos[indice]?.forma;
+}
+
 describe("2 · Base dos alimentos (§6.3, §9.2)", () => {
   it("valor fixo: mostra o mês do reajuste só com índice (IPCA, INPC, IGP-M), com o mês da fixação como padrão", async () => {
     const user = userEvent.setup();
@@ -48,12 +61,12 @@ describe("2 · Base dos alimentos (§6.3, §9.2)", () => {
     await user.click(screen.getByRole("button", { name: "Ajuda: Reajuste anual" }));
     expect(screen.getByText(/Sem reajuste, o valor fixado vale igual/)).toBeDefined();
     await user.selectOptions(screen.getByLabelText("Reajuste anual"), "IPCA");
-    expect(espiao).toHaveBeenLastCalledWith({ ...fixa, indiceReajuste: "IPCA" });
+    expect(ultimaForma(espiao)).toEqual({ ...fixa, indiceReajuste: "IPCA" });
     expect((screen.getByLabelText("Mês do reajuste") as HTMLSelectElement).value).toBe("10");
     await user.click(screen.getByRole("button", { name: "Ajuda: Reajuste anual" }));
     expect(screen.getByText(/reajustado a cada 12 meses/)).toBeDefined();
     await user.selectOptions(screen.getByLabelText("Mês do reajuste"), "3");
-    expect(espiao).toHaveBeenLastCalledWith({ ...fixa, indiceReajuste: "IPCA", mesReajuste: 3 });
+    expect(ultimaForma(espiao)).toEqual({ ...fixa, indiceReajuste: "IPCA", mesReajuste: 3 });
     await user.selectOptions(screen.getByLabelText("Reajuste anual"), "SM");
     expect(screen.queryByLabelText("Mês do reajuste")).toBeNull();
     await user.click(screen.getByRole("button", { name: "Ajuda: Reajuste anual" }));
@@ -65,7 +78,7 @@ describe("2 · Base dos alimentos (§6.3, §9.2)", () => {
     const espiao = vi.fn();
     render(<Harness inicial={fixa} espiao={espiao} />);
     await user.type(screen.getByLabelText("Valor fixado"), "1.000,00");
-    expect(espiao).toHaveBeenLastCalledWith({ ...fixa, valor: "1000.00" });
+    expect(ultimaForma(espiao)).toEqual({ ...fixa, valor: "1000.00" });
     espiao.mockClear();
     await user.type(screen.getByLabelText("Valor fixado"), ",");
     expect(espiao).not.toHaveBeenCalled();
@@ -74,7 +87,7 @@ describe("2 · Base dos alimentos (§6.3, §9.2)", () => {
     await user.tab();
     expect(screen.getByRole("alert").textContent).toContain("Use vírgula para os centavos");
     fireEvent.change(screen.getByLabelText("Fixado em"), { target: { value: "2024-03-15" } });
-    expect(espiao).toHaveBeenLastCalledWith({
+    expect(ultimaForma(espiao)).toEqual({
       ...fixa,
       valor: "1000.00",
       dataFixacao: "2024-03-15",
@@ -97,7 +110,7 @@ describe("2 · Base dos alimentos (§6.3, §9.2)", () => {
     expect((screen.getByLabelText("Mês do reajuste") as HTMLSelectElement).value).toBe("3");
     await user.selectOptions(screen.getByLabelText("Mês do reajuste"), "6");
     fireEvent.change(screen.getByLabelText("Fixado em"), { target: { value: "2024-04-10" } });
-    expect(espiao).toHaveBeenLastCalledWith({
+    expect(ultimaForma(espiao)).toEqual({
       ...fixa,
       indiceReajuste: "IPCA",
       dataFixacao: "2024-04-10",
@@ -112,7 +125,7 @@ describe("2 · Base dos alimentos (§6.3, §9.2)", () => {
     render(<Harness inicial={fixa} espiao={espiao} />);
     await user.type(screen.getByLabelText("Valor fixado"), "500");
     await user.click(screen.getByLabelText("% dos rendimentos"));
-    expect(espiao).toHaveBeenLastCalledWith({
+    expect(ultimaForma(espiao)).toEqual({
       tipo: "percentualRendimentos",
       percentual: "",
       rendimentoPadrao: "",
@@ -120,7 +133,7 @@ describe("2 · Base dos alimentos (§6.3, §9.2)", () => {
     expect(screen.queryByLabelText("Valor fixado")).toBeNull();
     await user.type(screen.getByLabelText("Percentual dos rendimentos"), "30");
     await user.type(screen.getByLabelText("Rendimento mensal padrão (obrigatório)"), "1500");
-    expect(espiao).toHaveBeenLastCalledWith({
+    expect(ultimaForma(espiao)).toEqual({
       tipo: "percentualRendimentos",
       percentual: "30",
       rendimentoPadrao: "1500",
@@ -129,13 +142,246 @@ describe("2 · Base dos alimentos (§6.3, §9.2)", () => {
     await user.tab();
     expect(screen.getByRole("alert").textContent).toBe("Informe um número.");
     await user.click(screen.getByLabelText("% do salário mínimo"));
-    expect(espiao).toHaveBeenLastCalledWith({ tipo: "percentualSalarioMinimo", percentual: "" });
+    expect(ultimaForma(espiao)).toEqual({ tipo: "percentualSalarioMinimo", percentual: "" });
     expect(screen.queryByLabelText("Percentual dos rendimentos")).toBeNull();
     await user.type(screen.getByLabelText("Percentual do salário mínimo"), "-1");
     await user.tab();
     expect(screen.getByRole("alert").textContent).toBe("O percentual não pode ser negativo.");
     await user.click(screen.getByLabelText("Valor fixo em reais"));
-    expect(espiao).toHaveBeenLastCalledWith({ ...fixa, valor: "500" });
+    expect(ultimaForma(espiao)).toEqual({ ...fixa, valor: "500" });
+    expect((screen.getByLabelText("Valor fixado") as HTMLInputElement).value).toBe("500,00");
+  });
+
+  it('com um período, a seção é a de antes, mais "Dividir em" no pé (§17.2)', async () => {
+    const user = userEvent.setup();
+    render(<Harness inicial={fixa} espiao={vi.fn()} />);
+    expect(screen.queryByRole("group", { name: /^(Até|Desde|De) / })).toBeNull();
+    expect(screen.getByText("A base mudou ao longo do tempo?")).toBeDefined();
+    expect(screen.getByLabelText("Dividir em")).toBeDefined();
+    await user.click(screen.getByRole("button", { name: "Ajuda: Dividir em" }));
+    expect(
+      screen.getByText(/A data informada passa a iniciar um período novo da base/),
+    ).toBeDefined();
+  });
+
+  it("dividir: um bloco por período, com título; o novo nasce como cópia; trocar a forma de um não mexe no outro", async () => {
+    const user = userEvent.setup();
+    const espiao = vi.fn();
+    render(
+      <Harness
+        inicial={{ ...fixa, valor: "500.00", dataFixacao: "2024-03-10", mesReajuste: 3 }}
+        espiao={espiao}
+      />,
+    );
+    fireEvent.change(screen.getByLabelText("Dividir em"), { target: { value: "2025-01-01" } });
+    await user.click(screen.getByRole("button", { name: "Dividir" }));
+    const primeiro = within(screen.getByRole("group", { name: "Até 31/12/2024" }));
+    const segundo = within(screen.getByRole("group", { name: "Desde 01/01/2025" }));
+    expect((primeiro.getByLabelText("Valor fixado") as HTMLInputElement).value).toBe("500,00");
+    expect((segundo.getByLabelText("Valor fixado") as HTMLInputElement).value).toBe("500,00");
+    expect(screen.queryByText("A base mudou ao longo do tempo?")).toBeNull();
+    expect(primeiro.queryByRole("button", { name: /Remover/ })).toBeNull();
+    await user.click(segundo.getByLabelText("% do salário mínimo"));
+    await user.type(segundo.getByLabelText("Percentual do salário mínimo"), "30");
+    expect(espiao.mock.lastCall?.[0]).toEqual({
+      periodos: [
+        {
+          de: null,
+          ate: "2024-12-31",
+          forma: { ...fixa, valor: "500.00", dataFixacao: "2024-03-10", mesReajuste: 3 },
+        },
+        {
+          de: "2025-01-01",
+          ate: null,
+          forma: { tipo: "percentualSalarioMinimo", percentual: "30" },
+        },
+      ],
+    });
+    expect((primeiro.getByLabelText("Valor fixo em reais") as HTMLInputElement).checked).toBe(true);
+    // a mesma data de novo não divide
+    fireEvent.change(screen.getByLabelText("Dividir em"), { target: { value: "2025-01-01" } });
+    await user.click(screen.getByRole("button", { name: "Dividir" }));
+    expect(screen.getByRole("alert").textContent).toBe("Já existe uma divisão em 01/01/2025.");
+    expect(screen.getAllByRole("group", { name: /^(Até|Desde|De) / })).toHaveLength(2);
+  });
+
+  it('período que não é o primeiro passado a valor fixo: "Fixado em" vem com a data de início do período', async () => {
+    const user = userEvent.setup();
+    const espiao = vi.fn();
+    const inicial: Base = {
+      periodos: [
+        {
+          de: null,
+          ate: "2024-12-31",
+          forma: { tipo: "percentualSalarioMinimo", percentual: "30" },
+        },
+        {
+          de: "2025-01-01",
+          ate: null,
+          forma: { tipo: "percentualSalarioMinimo", percentual: "30" },
+        },
+      ],
+    };
+    render(<Harness inicial={inicial} espiao={espiao} />);
+    const segundo = within(screen.getByRole("group", { name: "Desde 01/01/2025" }));
+    await user.click(segundo.getByLabelText("Valor fixo em reais"));
+    expect((segundo.getByLabelText("Fixado em") as HTMLInputElement).value).toBe("2025-01-01");
+    expect(ultimaForma(espiao, 1)).toEqual({
+      tipo: "valorFixo",
+      valor: "",
+      dataFixacao: "2025-01-01",
+      indiceReajuste: "nenhum",
+      mesReajuste: 1,
+    });
+  });
+
+  it("remover a divisão: o período some, e o anterior se estende até o fim dele, com as regras dele", async () => {
+    const user = userEvent.setup();
+    const espiao = vi.fn();
+    const inicial: Base = {
+      periodos: [
+        {
+          de: null,
+          ate: "2024-12-31",
+          forma: { tipo: "percentualSalarioMinimo", percentual: "25" },
+        },
+        {
+          de: "2025-01-01",
+          ate: "2025-06-30",
+          forma: { tipo: "percentualSalarioMinimo", percentual: "30" },
+        },
+        {
+          de: "2025-07-01",
+          ate: null,
+          forma: { tipo: "percentualSalarioMinimo", percentual: "35" },
+        },
+      ],
+    };
+    render(<Harness inicial={inicial} espiao={espiao} />);
+    await user.click(screen.getByRole("button", { name: "Remover a divisão de 01/07/2025" }));
+    expect(espiao.mock.lastCall?.[0]).toEqual({
+      periodos: [
+        {
+          de: null,
+          ate: "2024-12-31",
+          forma: { tipo: "percentualSalarioMinimo", percentual: "25" },
+        },
+        {
+          de: "2025-01-01",
+          ate: null,
+          forma: { tipo: "percentualSalarioMinimo", percentual: "30" },
+        },
+      ],
+    });
+    const segundo = within(screen.getByRole("group", { name: "Desde 01/01/2025" }));
+    expect((segundo.getByLabelText("Percentual do salário mínimo") as HTMLInputElement).value).toBe(
+      "30",
+    );
+    await user.click(screen.getByRole("button", { name: "Remover a divisão de 01/01/2025" }));
+    expect(screen.queryByRole("group", { name: /^(Até|Desde|De) / })).toBeNull();
+    expect((screen.getByLabelText("Percentual do salário mínimo") as HTMLInputElement).value).toBe(
+      "25",
+    );
+  });
+
+  it("a primeira divisão e a remoção da última não perdem o que foi digitado nas outras formas do primeiro período", async () => {
+    const user = userEvent.setup();
+    const espiao = vi.fn();
+    render(<Harness inicial={fixa} espiao={espiao} />);
+    await user.type(screen.getByLabelText("Valor fixado"), "500");
+    await user.click(screen.getByLabelText("% do salário mínimo"));
+    await user.type(screen.getByLabelText("Percentual do salário mínimo"), "30");
+    fireEvent.change(screen.getByLabelText("Dividir em"), { target: { value: "2025-01-01" } });
+    await user.click(screen.getByRole("button", { name: "Dividir" }));
+    const primeiro = within(screen.getByRole("group", { name: "Até 31/12/2024" }));
+    await user.click(primeiro.getByLabelText("Valor fixo em reais"));
+    expect((primeiro.getByLabelText("Valor fixado") as HTMLInputElement).value).toBe("500,00");
+    expect(ultimaForma(espiao)).toEqual({ ...fixa, valor: "500" });
+    await user.click(primeiro.getByLabelText("% do salário mínimo"));
+    await user.click(screen.getByRole("button", { name: "Remover a divisão de 01/01/2025" }));
+    await user.click(screen.getByLabelText("Valor fixo em reais"));
     expect((screen.getByLabelText("Valor fixado") as HTMLInputElement).value).toBe("500,00");
   });
+
+  it("uma mudança vinda de fora (o rendimento aplicado pelo lápis) não é desfeita ao trocar a forma e voltar", async () => {
+    const user = userEvent.setup();
+    const espiao = vi.fn();
+    const rendimentos = (padrao: string): Base =>
+      baseUnica({ tipo: "percentualRendimentos", percentual: "30", rendimentoPadrao: padrao });
+    const { rerender } = render(
+      <BaseDosAlimentos base={rendimentos("2000.00")} hoje={HOJE} aoMudar={espiao} />,
+    );
+    rerender(<BaseDosAlimentos base={rendimentos("2500.00")} hoje={HOJE} aoMudar={espiao} />);
+    await user.click(screen.getByLabelText("% do salário mínimo"));
+    rerender(
+      <BaseDosAlimentos
+        base={baseUnica({ tipo: "percentualSalarioMinimo", percentual: "" })}
+        hoje={HOJE}
+        aoMudar={espiao}
+      />,
+    );
+    await user.click(screen.getByLabelText("% dos rendimentos"));
+    expect(ultimaForma(espiao)).toEqual({
+      tipo: "percentualRendimentos",
+      percentual: "30",
+      rendimentoPadrao: "2500.00",
+    });
+  });
+
+  it("o campo que falta fica em vermelho só no bloco do período apontado", () => {
+    const inicial: Base = {
+      periodos: [
+        { de: null, ate: "2024-12-31", forma: { tipo: "percentualSalarioMinimo", percentual: "" } },
+        { de: "2025-01-01", ate: null, forma: { tipo: "percentualSalarioMinimo", percentual: "" } },
+      ],
+    };
+    const falta: FaltaDaBase = {
+      periodo: 1,
+      campo: "percentual",
+      erro: "Informe o percentual.",
+      aviso: "",
+    };
+    render(<Harness inicial={inicial} espiao={vi.fn()} faltas={[falta]} />);
+    const primeiro = within(screen.getByRole("group", { name: "Até 31/12/2024" }));
+    const segundo = within(screen.getByRole("group", { name: "Desde 01/01/2025" }));
+    expect(primeiro.queryByRole("alert")).toBeNull();
+    expect(segundo.getByRole("alert").textContent).toBe("Informe o percentual.");
+  });
+
+  it("no App: dividir a base muda só as prestações do período novo, e a memória diz qual período valeu", async () => {
+    const user = userEvent.setup();
+    render(<App ambiente={ambienteDeTeste()} />);
+    await user.type(screen.getByLabelText("Valor fixado"), "500");
+    fireEvent.change(screen.getByLabelText("Fixado em"), { target: { value: "2024-03-10" } });
+    const lote = within(screen.getByRole("region", { name: /3 · Prestações em atraso/ }));
+    fireEvent.change(lote.getByLabelText("Primeiro vencimento"), {
+      target: { value: "2024-11-05" },
+    });
+    fireEvent.change(lote.getByLabelText("Último vencimento"), { target: { value: "2025-02-05" } });
+    await user.click(lote.getByRole("button", { name: "Lançar em lote" }));
+    const valores = () =>
+      within(screen.getByRole("region", { name: "Prestações" }))
+        .getAllByRole("row")
+        .slice(1, 5)
+        .map((r) => within(r).getAllByRole("cell")[1]?.textContent);
+    expect(valores()).toEqual(["R$ 500,00", "R$ 500,00", "R$ 500,00", "R$ 500,00"]);
+    fireEvent.change(screen.getByLabelText("Dividir em"), { target: { value: "2025-01-01" } });
+    await user.click(screen.getByRole("button", { name: "Dividir" }));
+    const segundo = within(screen.getByRole("group", { name: "Desde 01/01/2025" }));
+    await user.click(segundo.getByLabelText("% do salário mínimo"));
+    // percentual em branco: o aviso diz qual período
+    expect(screen.getByRole("region", { name: "Avisos" }).textContent).toContain(
+      "Falta o percentual do salário mínimo no período desde 01/01/2025 (seção 2 · Base dos alimentos)",
+    );
+    await user.type(segundo.getByLabelText("Percentual do salário mínimo"), "30");
+    expect(valores()).toEqual(["R$ 500,00", "R$ 500,00", "R$ 455,40", "R$ 455,40"]);
+    await user.click(screen.getByRole("button", { name: "Memória da prestação de 05/01/2025" }));
+    const memoria = (
+      screen.getByText("Memória · prestação de 05/01/2025").closest("tr") as HTMLElement
+    ).textContent;
+    expect(memoria).toContain(
+      "Base desde 01/01/2025: 30% do salário mínimo de jan/2025 (R$ 1.518,00) = R$ 455,40",
+    );
+    expect(memoria).not.toContain("Base: Base");
+  });
 });
````

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run`
Expected: `Tests  12 failed | 826 passed | 10 skipped (848)` (arquivos: `2 failed | 43 passed (45)`). Falham:
  - `src/ui/estado/base.test.ts` inteiro (não carrega: importa o que ainda não existe);
  - `src/ui/secoes/Base.test.tsx`: 12 testes.
  Motivo: o módulo `src/ui/estado/base.ts` ainda não existe, e a seção 2 ainda recebe uma forma só. Nenhum outro arquivo pode falhar.

- [ ] **Step 3: Aplicar o patch do código**

````diff
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index 7b59133..b548ca1 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -204,19 +204,11 @@ export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambien
             aoEsquecer={esquecerTudo}
             armazenamentoDisponivel={armazenamento !== null}
           />
-          {/* provisório (fase 5b, Task 2): a seção edita o único período; a Task 4 a troca pela
-              seção com períodos */}
           <BaseDosAlimentos
-            base={estado.calculo.base.periodos[0]!.forma}
+            base={estado.calculo.base}
             hoje={ambiente.hoje()}
-            faltas={faltas.filter((f) => f.periodo === 0)}
-            aoMudar={(forma) =>
-              despachar({
-                tipo: "base",
-                base: { periodos: [{ ...estado.calculo.base.periodos[0]!, forma }] },
-                em: agora(),
-              })
-            }
+            faltas={faltas}
+            aoMudar={(base) => despachar({ tipo: "base", base, em: agora() })}
           />
           <LotePrestacoesSecao
             ultimoLote={estado.calculo.lotes.ultimoLotePrestacoes}
diff --git a/src/ui/entrada.ts b/src/ui/entrada.ts
index 5853220..22edf58 100644
--- a/src/ui/entrada.ts
+++ b/src/ui/entrada.ts
@@ -102,6 +102,9 @@ export function formatarNumeroParaCampo(texto: TextoDecimal): string {
  * 9999, faria o cálculo percorrer milhares de meses. Os campos de data levam `max` com este valor.
  */
 export const DATA_MAXIMA: DataISO = "2199-12-31";
+
+/** Primeira data aceita na tela e nos arquivos (o motor começa em jan/1900). */
+export const DATA_MINIMA: DataISO = "1900-01-01";
 const DEPOIS_DO_TETO: Leitura<never> = {
   ok: false,
   erro: "A data não pode ser posterior a 31/12/2199.",
diff --git a/src/ui/estado/base.ts b/src/ui/estado/base.ts
new file mode 100644
index 0000000..91bf617
--- /dev/null
+++ b/src/ui/estado/base.ts
@@ -0,0 +1,65 @@
+import { diaAnterior } from "../../compartilhado/datas.ts";
+import { formatarData } from "../../compartilhado/formatacao.ts";
+import type { Base, DataISO, FormaDaBase, PeriodoDaBase } from "../../compartilhado/tipos.ts";
+import { descreverPeriodoDaBase, periodosDaBaseOrdenados } from "../../motor/base.ts";
+import { DATA_MINIMA } from "../entrada.ts";
+
+/**
+ * Edição da base dos alimentos por períodos (§17.2, fase 5b), no padrão do editor de períodos da
+ * metodologia: dividir numa data (o período novo nasce como cópia do dividido), remover uma
+ * divisão (o período é absorvido pelo anterior, que mantém a própria forma), trocar a forma de um
+ * período.
+ * Toda função devolve uma base nova, com os períodos em ordem cronológica. Módulo puro.
+ */
+
+/** "Até 31/12/2024", "De 01/01/2025 a 30/06/2025", "Desde 01/07/2025": o título do bloco na seção 2. */
+export function tituloDoPeriodo(p: Pick<PeriodoDaBase, "de" | "ate">): string {
+  const texto = descreverPeriodoDaBase(p);
+  return texto.charAt(0).toUpperCase() + texto.slice(1);
+}
+
+/** Divide na data o período que a contém; data que já é início de período não divide (aviso). */
+export function dividirBase(base: Base, data: DataISO): { base: Base; aviso?: string } {
+  // o período anterior acabaria em 1899, antes da primeira data que o arquivo aceita
+  if (data <= DATA_MINIMA) {
+    return { base, aviso: `A data precisa ser posterior a ${formatarData(DATA_MINIMA)}.` };
+  }
+  const periodos = periodosDaBaseOrdenados(base);
+  const indice = periodos.findIndex(
+    (p) => (p.de === null || p.de <= data) && (p.ate === null || data <= p.ate),
+  );
+  const alvo = periodos[indice];
+  if (alvo === undefined) {
+    return { base, aviso: `Nenhum período cobre ${formatarData(data)}: nada foi dividido.` };
+  }
+  if (alvo.de === data) {
+    return { base, aviso: `Já existe uma divisão em ${formatarData(data)}.` };
+  }
+  const antes: PeriodoDaBase = { ...structuredClone(alvo), ate: diaAnterior(data) };
+  const depois: PeriodoDaBase = { ...structuredClone(alvo), de: data };
+  return {
+    base: {
+      periodos: [...periodos.slice(0, indice), antes, depois, ...periodos.slice(indice + 1)],
+    },
+  };
+}
+
+/** Remove a divisão que começa o período `indice` (≥ 1): o anterior se estende até o fim dele. */
+export function removerDivisaoDaBase(base: Base, indice: number): Base {
+  const periodos = periodosDaBaseOrdenados(base);
+  const anterior = periodos[indice - 1];
+  const removido = periodos[indice];
+  if (indice < 1 || anterior === undefined || removido === undefined) return base;
+  const fundido: PeriodoDaBase = { ...structuredClone(anterior), ate: removido.ate };
+  return {
+    periodos: [...periodos.slice(0, indice - 1), fundido, ...periodos.slice(indice + 1)],
+  };
+}
+
+/** Troca a forma (e os campos) do período `indice`. */
+export function trocarForma(base: Base, indice: number, forma: FormaDaBase): Base {
+  const periodos = periodosDaBaseOrdenados(base);
+  const alvo = periodos[indice];
+  if (alvo === undefined) return base;
+  return { periodos: periodos.with(indice, { ...alvo, forma }) };
+}
diff --git a/src/ui/estilos.css b/src/ui/estilos.css
index 9e64ad8..348626a 100644
--- a/src/ui/estilos.css
+++ b/src/ui/estilos.css
@@ -855,11 +855,25 @@ td.dica {
   margin-bottom: 8px;
 }
 
-.periodo > h3 {
+.periodo > h3,
+.titulo-do-periodo > h3 {
   font-size: 13px;
   margin-bottom: 6px;
 }
 
+/* base dos alimentos por períodos (§17.2): título do bloco e "Remover divisão" na mesma linha */
+.titulo-do-periodo {
+  display: flex;
+  justify-content: space-between;
+  align-items: baseline;
+  gap: 8px;
+}
+
+.dividir-base > .nota {
+  flex-basis: 100%;
+  margin: 0;
+}
+
 /* ---- Celular: campos lado a lado empilham; o balão da ajuda vira uma faixa no pé da tela ---- */
 
 @media (max-width: 599px) {
diff --git a/src/ui/secoes/Base.tsx b/src/ui/secoes/Base.tsx
index 3c4ddd3..1b19841 100644
--- a/src/ui/secoes/Base.tsx
+++ b/src/ui/secoes/Base.tsx
@@ -1,6 +1,13 @@
 import { useState } from "react";
+import { formatarData } from "../../compartilhado/formatacao.ts";
 import { decompor } from "../../compartilhado/datas.ts";
-import type { FormaDaBase, IndiceReajuste } from "../../compartilhado/tipos.ts";
+import type {
+  Base,
+  FormaDaBase,
+  IndiceReajuste,
+  PeriodoDaBase,
+} from "../../compartilhado/tipos.ts";
+import { periodosDaBaseOrdenados } from "../../motor/base.ts";
 import { CampoSelecao, CampoTexto, Opcao, useCampoValidado } from "../componentes/Campo.tsx";
 import {
   DATA_MAXIMA,
@@ -10,15 +17,19 @@ import {
   lerPercentual,
   lerValorPositivo,
 } from "../entrada.ts";
+import { dividirBase, removerDivisaoDaBase, tituloDoPeriodo, trocarForma } from "../estado/base.ts";
 import type { CampoDaBase, FaltaDaBase } from "../estado/faltas.ts";
 
 /**
- * Seção "2 · Base dos alimentos" (§9.2, §6.3): três formas, e só os campos da forma escolhida
- * aparecem. O mês do reajuste some quando o reajuste é pelo salário mínimo ou "nenhum"; em "% dos
- * rendimentos" o rendimento padrão é exigido. Cada forma guarda um rascunho, para que trocar de
- * forma e voltar não perca o que foi digitado. Explicações nos balões ⓘ dos campos. Com prestação
- * lançada pela base, o campo que falta fica em vermelho ("Informe o percentual."; decisão de
- * 13/10/2026).
+ * Seção "2 · Base dos alimentos" (§9.2, §6.3, §17.2): a base é uma lista de períodos seguidos.
+ * Com um período só, a seção é a de antes (três formas, e só os campos da forma escolhida
+ * aparecem), mais "Dividir em" no pé; com dois ou mais, um bloco por período, com o título ("Até
+ * 31/12/2024", "Desde 01/01/2025"), a forma e os campos dele e, menos no primeiro, "Remover
+ * divisão". O mês do reajuste some quando o reajuste é pelo salário mínimo ou "nenhum"; em "% dos
+ * rendimentos" o rendimento padrão é exigido. Cada período guarda um rascunho por forma, para que
+ * trocar de forma e voltar não perca o que foi digitado. Explicações nos balões ⓘ dos campos. Com
+ * prestação lançada pela base, o campo que falta fica em vermelho no bloco do período
+ * ("Informe o percentual."; decisões de 13/10/2026).
  */
 
 /** Erro do campo: o da leitura (texto inválido) ou, com o campo em branco, o de campo que falta. */
@@ -67,13 +78,14 @@ const OPCOES_DE_REAJUSTE: ReadonlyArray<{ valor: IndiceReajuste; rotulo: string
 
 const OPCOES_DE_MES = NOMES_DOS_MESES.map((nome, i) => ({ valor: String(i + 1), rotulo: nome }));
 
-function rascunhosIniciais(base: FormaDaBase, hoje: string): Rascunhos {
-  const mes = decompor(hoje).mes;
+/** Rascunhos de um período; o valor fixo nasce fixado no início do período (o primeiro, hoje). */
+function rascunhosIniciais(base: FormaDaBase, fixacao: string): Rascunhos {
+  const mes = decompor(fixacao).mes;
   return {
     valorFixo: {
       tipo: "valorFixo",
       valor: "",
-      dataFixacao: hoje,
+      dataFixacao: fixacao,
       indiceReajuste: "nenhum",
       mesReajuste: mes,
     },
@@ -89,62 +101,171 @@ export function BaseDosAlimentos({
   faltas = [],
   aoMudar,
 }: {
-  base: FormaDaBase;
-  /** data de hoje, para o rascunho do valor fixo */
+  base: Base;
+  /** data de hoje, para o rascunho do valor fixo do primeiro período */
   hoje: string;
   /** campos que faltam para apurar as prestações lançadas (`faltasDaBase`) */
   faltas?: FaltaDaBase[];
-  aoMudar: (base: FormaDaBase) => void;
+  aoMudar: (base: Base) => void;
 }) {
-  const [rascunhos, setRascunhos] = useState(() => rascunhosIniciais(base, hoje));
-  const escolher = (tipo: FormaDaBase["tipo"]) => aoMudar(rascunhos[tipo]);
+  const periodos = periodosDaBaseOrdenados(base);
+  const varios = periodos.length > 1;
+  const [dataDaDivisao, setDataDaDivisao] = useState("");
+  const [avisoDaDivisao, setAvisoDaDivisao] = useState<string | null>(null);
+  const dividir = () => {
+    const leitura = lerData(dataDaDivisao);
+    if (!leitura.ok) {
+      setAvisoDaDivisao(leitura.erro);
+      return;
+    }
+    const { base: nova, aviso } = dividirBase(base, leitura.valor);
+    setAvisoDaDivisao(aviso ?? null);
+    if (aviso === undefined) {
+      setDataDaDivisao("");
+      aoMudar(nova);
+    }
+  };
+  const forma = (periodo: PeriodoDaBase, i: number) => (
+    <FormaDoPeriodo
+      forma={periodo.forma}
+      prefixo={i === 0 ? "base" : `base-${i}`}
+      fixacao={periodo.de ?? hoje}
+      faltas={faltas.filter((f) => f.periodo === i)}
+      aoMudar={(nova) => aoMudar(trocarForma(base, i, nova))}
+    />
+  );
+  return (
+    <section className="secao" aria-labelledby="titulo-base">
+      <h2 id="titulo-base">2 · Base dos alimentos</h2>
+      {periodos.map((periodo, i) => (
+        // a mesma estrutura com um ou com vários períodos (só o título e o papel de grupo
+        // mudam), e a chave é o início do período: dividir ou juntar não remonta os blocos que
+        // ficam, nem o primeiro, que guarda os rascunhos do que foi digitado em cada forma
+        <div
+          key={periodo.de ?? "inicio"}
+          className={varios ? "periodo" : undefined}
+          role={varios ? "group" : undefined}
+          aria-labelledby={varios ? `titulo-periodo-base-${i}` : undefined}
+        >
+          {varios ? (
+            <div className="titulo-do-periodo">
+              <h3 id={`titulo-periodo-base-${i}`}>{tituloDoPeriodo(periodo)}</h3>
+              {i > 0 && periodo.de !== null ? (
+                <button
+                  type="button"
+                  className="botao discreto"
+                  onClick={() => aoMudar(removerDivisaoDaBase(base, i))}
+                  aria-label={`Remover a divisão de ${formatarData(periodo.de)}`}
+                >
+                  Remover divisão
+                </button>
+              ) : null}
+            </div>
+          ) : null}
+          {forma(periodo, i)}
+        </div>
+      ))}
+      <div className="linha dividir-base">
+        {varios ? null : <p className="nota">A base mudou ao longo do tempo?</p>}
+        <CampoTexto
+          id="base-dividir-em"
+          rotulo="Dividir em"
+          ajuda="A data informada passa a iniciar um período novo da base, com as mesmas regras do anterior; depois ajuste a forma e os valores de cada um. Ex.: valor fixo até 2024 e % do salário mínimo desde 2025."
+          tipo="date"
+          valor={dataDaDivisao}
+          aoMudar={(v) => {
+            setDataDaDivisao(v);
+            setAvisoDaDivisao(null);
+          }}
+          erro={avisoDaDivisao}
+          min="1900-01-01"
+          max={DATA_MAXIMA}
+        />
+        <button type="button" className="botao secundario" onClick={dividir}>
+          Dividir
+        </button>
+      </div>
+    </section>
+  );
+}
+
+/** A escolha da forma e os campos dela, num período (`prefixo` distingue os ids de cada bloco). */
+function FormaDoPeriodo({
+  forma,
+  prefixo,
+  fixacao,
+  faltas,
+  aoMudar,
+}: {
+  forma: FormaDaBase;
+  prefixo: string;
+  /** data de fixação do rascunho do valor fixo: o início do período (o primeiro, hoje) */
+  fixacao: string;
+  faltas: FaltaDaBase[];
+  aoMudar: (forma: FormaDaBase) => void;
+}) {
+  const [rascunhos, setRascunhos] = useState(() => rascunhosIniciais(forma, fixacao));
+  const escolher = (tipo: FormaDaBase["tipo"]) => {
+    // a forma atual entra nos rascunhos antes da troca: ela pode ter mudado por fora (o
+    // rendimento aplicado pelo lápis, um arquivo aberto) sem passar por este bloco
+    const atuais = { ...rascunhos, [forma.tipo]: forma };
+    setRascunhos(atuais);
+    aoMudar(atuais[tipo]);
+  };
   const atualizar = <T extends FormaDaBase>(nova: T) => {
     setRascunhos({ ...rascunhos, [nova.tipo]: nova });
     aoMudar(nova);
   };
+  const nome = prefixo === "base" ? "tipo-da-base" : `tipo-da-${prefixo}`;
   return (
-    <section className="secao" aria-labelledby="titulo-base">
-      <h2 id="titulo-base">2 · Base dos alimentos</h2>
+    <>
       <fieldset className="grupo">
         <legend>Como os alimentos foram fixados</legend>
         <Opcao
           tipo="radio"
-          nome="tipo-da-base"
+          nome={nome}
           rotulo="Valor fixo em reais"
-          marcado={base.tipo === "valorFixo"}
+          marcado={forma.tipo === "valorFixo"}
           aoMudar={() => escolher("valorFixo")}
         />
         <Opcao
           tipo="radio"
-          nome="tipo-da-base"
+          nome={nome}
           rotulo="% do salário mínimo"
-          marcado={base.tipo === "percentualSalarioMinimo"}
+          marcado={forma.tipo === "percentualSalarioMinimo"}
           aoMudar={() => escolher("percentualSalarioMinimo")}
         />
         <Opcao
           tipo="radio"
-          nome="tipo-da-base"
+          nome={nome}
           rotulo="% dos rendimentos"
-          marcado={base.tipo === "percentualRendimentos"}
+          marcado={forma.tipo === "percentualRendimentos"}
           aoMudar={() => escolher("percentualRendimentos")}
         />
       </fieldset>
-      {base.tipo === "valorFixo" ? (
-        <ValorFixo base={base} faltas={faltas} aoMudar={atualizar} />
-      ) : base.tipo === "percentualSalarioMinimo" ? (
-        <PercentualSalarioMinimo base={base} faltas={faltas} aoMudar={atualizar} />
+      {forma.tipo === "valorFixo" ? (
+        <ValorFixo base={forma} prefixo={prefixo} faltas={faltas} aoMudar={atualizar} />
+      ) : forma.tipo === "percentualSalarioMinimo" ? (
+        <PercentualSalarioMinimo
+          base={forma}
+          prefixo={prefixo}
+          faltas={faltas}
+          aoMudar={atualizar}
+        />
       ) : (
-        <PercentualRendimentos base={base} faltas={faltas} aoMudar={atualizar} />
+        <PercentualRendimentos base={forma} prefixo={prefixo} faltas={faltas} aoMudar={atualizar} />
       )}
-    </section>
+    </>
   );
 }
 
 function ValorFixo({
   base,
+  prefixo,
   faltas,
   aoMudar,
 }: {
+  prefixo: string;
   base: BaseValorFixo;
   faltas: FaltaDaBase[];
   aoMudar: (base: BaseValorFixo) => void;
@@ -174,7 +295,7 @@ function ValorFixo({
     <>
       <div className="linha">
         <CampoTexto
-          id="base-valor"
+          id={`${prefixo}-valor`}
           rotulo="Valor fixado"
           valor={valor.texto}
           aoMudar={valor.aoMudar}
@@ -185,7 +306,7 @@ function ValorFixo({
           placeholder="ex.: 1.000,00"
         />
         <CampoTexto
-          id="base-fixacao"
+          id={`${prefixo}-fixacao`}
           rotulo="Fixado em"
           ajuda="Data da sentença ou do acordo que fixou o valor. O mês do reajuste acompanha esta data, salvo se você escolher outro."
           tipo="date"
@@ -197,7 +318,7 @@ function ValorFixo({
           max={DATA_MAXIMA}
         />
         <CampoSelecao
-          id="base-reajuste"
+          id={`${prefixo}-reajuste`}
           rotulo="Reajuste anual"
           ajuda={
             base.indiceReajuste === "nenhum"
@@ -212,7 +333,7 @@ function ValorFixo({
         />
         {comMes ? (
           <CampoSelecao
-            id="base-mes-reajuste"
+            id={`${prefixo}-mes-reajuste`}
             rotulo="Mês do reajuste"
             valor={String(base.mesReajuste)}
             opcoes={OPCOES_DE_MES}
@@ -226,9 +347,11 @@ function ValorFixo({
 
 function PercentualSalarioMinimo({
   base,
+  prefixo,
   faltas,
   aoMudar,
 }: {
+  prefixo: string;
   base: BasePercentualSM;
   faltas: FaltaDaBase[];
   aoMudar: (base: BasePercentualSM) => void;
@@ -243,7 +366,7 @@ function PercentualSalarioMinimo({
     <>
       <div className="linha">
         <CampoTexto
-          id="base-percentual-sm"
+          id={`${prefixo}-percentual-sm`}
           rotulo="Percentual do salário mínimo"
           ajuda="Percentual × salário mínimo oficial do mês de cada vencimento (valor publicado pelo Banco Central). Mês ainda sem salário mínimo publicado usa o último publicado, com aviso."
           valor={percentual.texto}
@@ -261,9 +384,11 @@ function PercentualSalarioMinimo({
 
 function PercentualRendimentos({
   base,
+  prefixo,
   faltas,
   aoMudar,
 }: {
+  prefixo: string;
   base: BasePercentualRendimentos;
   faltas: FaltaDaBase[];
   aoMudar: (base: BasePercentualRendimentos) => void;
@@ -284,7 +409,7 @@ function PercentualRendimentos({
     <>
       <div className="linha">
         <CampoTexto
-          id="base-percentual-rendimentos"
+          id={`${prefixo}-percentual-rendimentos`}
           rotulo="Percentual dos rendimentos"
           valor={percentual.texto}
           aoMudar={percentual.aoMudar}
@@ -295,7 +420,7 @@ function PercentualRendimentos({
           placeholder="ex.: 30"
         />
         <CampoTexto
-          id="base-rendimento-padrao"
+          id={`${prefixo}-rendimento-padrao`}
           rotulo="Rendimento mensal padrão (obrigatório)"
           ajuda="Percentual × rendimento do mês. O rendimento padrão vale para todas as prestações; quando o rendimento mudar, ou para 13º e férias, informe o rendimento daquele mês na própria prestação (lápis na tabela)."
           valor={rendimento.texto}
diff --git a/src/ui/tabelas/TabelaLancamentos.tsx b/src/ui/tabelas/TabelaLancamentos.tsx
index 289d46f..24606d8 100644
--- a/src/ui/tabelas/TabelaLancamentos.tsx
+++ b/src/ui/tabelas/TabelaLancamentos.tsx
@@ -600,7 +600,12 @@ function Memoria({ linha }: { linha: LinhaDaTabela }) {
         <p>
           <strong>Memória · {nomeDoLancamento(linha.lancamento)}</strong>
         </p>
-        <p>Base: {calculado.memoriaBase}</p>
+        {/* com a base por períodos, a frase do motor já começa por "Base até/desde …" (§17.2) */}
+        <p>
+          {calculado.memoriaBase.startsWith("Base ")
+            ? calculado.memoriaBase
+            : `Base: ${calculado.memoriaBase}`}
+        </p>
         <p>
           Correção (fator {formatarFator(decimal(calculado.correcao.fator))}
           {calculado.correcao.pisoAplicado ? ", com piso no valor original" : ""}):
````

- [ ] **Step 4: Formatar, verificar e conferir a contagem**

Run: `npm run format && npm run verificar`
Expected: tudo verde; `Tests  844 passed | 10 skipped (854)`, `Test Files  45 passed (45)`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "ui: seção 2 com a base por períodos (dividir, remover divisão, forma por período)

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 4: "Aplicar este rendimento daqui em diante" divide a base no vencimento

§17.2, lápis (D5). O redutor deixa de gravar o rendimento em cada prestação: divide o período de "% dos rendimentos" no vencimento da linha, com o novo rendimento padrão; a linha de onde se aplicou perde o rendimento próprio; nenhuma linha ganha "ajustada" por isso.

**Files:**
- Modify: `src/ui/estado/base.ts` (`aplicarRendimentoNaBase`)
- Modify: `src/ui/estado/calculo.ts` (ação `aplicarRendimentoDaquiEmDiante`)
- Modify: `src/ui/tabelas/Personalizar.tsx` (balão do rendimento e comentário do módulo)
- Test: `src/ui/estado/base.test.ts` (dois testes), `src/ui/estado/calculo.test.ts` (os dois testes antigos da ação viram um), `src/ui/tabelas/Personalizar.test.tsx` (o teste do rendimento, no App, com a base dividida)

**Interfaces:**
- Consumes: `periodoDaData` (Task 2); `dividirBase`, `trocarForma` (Task 3).
- Produces: `aplicarRendimentoNaBase(base: Base, data: DataISO, rendimento: TextoDecimal): Base` (período de outra forma: devolve a mesma base, e o redutor devolve o mesmo estado). A ação `aplicarRendimentoDaquiEmDiante` mantém a forma `{ id, rendimento, em }`.

- [ ] **Step 1: Aplicar o patch dos testes**

````diff
diff --git a/src/ui/estado/base.test.ts b/src/ui/estado/base.test.ts
index 4a402ec..3225055 100644
--- a/src/ui/estado/base.test.ts
+++ b/src/ui/estado/base.test.ts
@@ -1,7 +1,13 @@
 import { describe, expect, it } from "vitest";
 import type { Base, FormaDaBase } from "../../compartilhado/tipos.ts";
 import { baseUnica } from "../../motor/base.ts";
-import { dividirBase, removerDivisaoDaBase, tituloDoPeriodo, trocarForma } from "./base.ts";
+import {
+  aplicarRendimentoNaBase,
+  dividirBase,
+  removerDivisaoDaBase,
+  tituloDoPeriodo,
+  trocarForma,
+} from "./base.ts";
 
 const fixo: FormaDaBase = {
   tipo: "valorFixo",
@@ -96,4 +102,46 @@ describe("edição da base por períodos (§17.2, fase 5b)", () => {
     );
     expect(tituloDoPeriodo({ de: "2025-07-01", ate: null })).toBe("Desde 01/07/2025");
   });
+
+  it('aplicar um rendimento daqui em diante divide o período de "% dos rendimentos" na data, com o novo rendimento padrão', () => {
+    // 30% dos rendimentos, padrão R$ 2.000,00; em 05/03/2025, R$ 2.500,00
+    expect(aplicarRendimentoNaBase(baseUnica(rendimentos), "2025-03-05", "2500.00")).toEqual({
+      periodos: [
+        { de: null, ate: "2025-03-04", forma: rendimentos },
+        { de: "2025-03-05", ate: null, forma: { ...rendimentos, rendimentoPadrao: "2500.00" } },
+      ],
+    });
+    // vai só até o fim daquele período: a divisão posterior fica com a regra dela
+    const comDepois: Base = {
+      periodos: [
+        { de: null, ate: "2025-12-31", forma: rendimentos },
+        { de: "2026-01-01", ate: null, forma: sm },
+      ],
+    };
+    expect(aplicarRendimentoNaBase(comDepois, "2025-03-05", "2500.00").periodos).toEqual([
+      { de: null, ate: "2025-03-04", forma: rendimentos },
+      {
+        de: "2025-03-05",
+        ate: "2025-12-31",
+        forma: { ...rendimentos, rendimentoPadrao: "2500.00" },
+      },
+      { de: "2026-01-01", ate: null, forma: sm },
+    ]);
+  });
+
+  it("aplicar no início de um período só troca o rendimento padrão dele; em período de outra forma, nada muda", () => {
+    const dividida: Base = {
+      periodos: [
+        { de: null, ate: "2025-03-04", forma: rendimentos },
+        { de: "2025-03-05", ate: null, forma: rendimentos },
+      ],
+    };
+    expect(aplicarRendimentoNaBase(dividida, "2025-03-05", "2600.00").periodos[1]).toEqual({
+      de: "2025-03-05",
+      ate: null,
+      forma: { ...rendimentos, rendimentoPadrao: "2600.00" },
+    });
+    const outra = baseUnica(sm);
+    expect(aplicarRendimentoNaBase(outra, "2025-03-05", "2500.00")).toBe(outra);
+  });
 });
diff --git a/src/ui/estado/calculo.test.ts b/src/ui/estado/calculo.test.ts
index e115d56..01122f3 100644
--- a/src/ui/estado/calculo.test.ts
+++ b/src/ui/estado/calculo.test.ts
@@ -269,41 +269,17 @@ describe("reduzir: lotes cumulativos e lançamentos", () => {
     ).toBe(false);
   });
 
-  it("aplica o rendimento daqui em diante só às prestações da data em diante", () => {
+  it("aplicar o rendimento daqui em diante divide a base no vencimento da linha (§17.2): as linhas seguem a regra, sem a marca de ajustada", () => {
     let estado = reduzir(estadoNovo(), {
-      tipo: "lancarPrestacoes",
-      lote: { diaVencimento: 5, de: "2026-07", ate: "2026-09" },
-      em: DEPOIS,
-    });
-    estado = reduzir(estado, {
-      tipo: "lancarPagamentos",
-      lote: { valorMensal: "100.00", diaPagamento: 5, de: "2026-08", ate: "2026-08" },
+      tipo: "base",
+      base: baseUnica({
+        tipo: "percentualRendimentos",
+        percentual: "30",
+        rendimentoPadrao: "2000.00",
+      }),
       em: DEPOIS,
     });
     estado = reduzir(estado, {
-      tipo: "aplicarRendimentoDaquiEmDiante",
-      id: "p-2026-08",
-      rendimento: "2500.00",
-      em: DEPOIS,
-    });
-    expect(estado.calculo.lancamentos.map((l) => [l.id, l.rendimento ?? null, l.editado])).toEqual([
-      ["p-2026-07", null, false],
-      ["a-2026-08", null, false],
-      ["p-2026-08", "2500.00", true],
-      ["p-2026-09", "2500.00", true],
-    ]);
-    expect(
-      reduzir(estado, {
-        tipo: "aplicarRendimentoDaquiEmDiante",
-        id: "x",
-        rendimento: "1",
-        em: DEPOIS,
-      }),
-    ).toBe(estado);
-  });
-
-  it("aplicar o rendimento daqui em diante não mexe nas prestações com descrição (13º, férias), como no lote (D1)", () => {
-    let estado = reduzir(estadoNovo(), {
       tipo: "lancarPrestacoes",
       lote: { diaVencimento: 5, de: "2026-07", ate: "2026-09" },
       em: DEPOIS,
@@ -318,9 +294,11 @@ describe("reduzir: lotes cumulativos e lançamentos", () => {
       },
       em: DEPOIS,
     });
+    // a linha de onde se aplica tinha um rendimento próprio digitado antes
     estado = reduzir(estado, {
-      tipo: "incluirLancamento",
-      lancamento: { tipo: "prestacao", data: "2026-09-25", descricao: "   " },
+      tipo: "editarLancamento",
+      id: "p-2026-08",
+      mudancas: { rendimento: "2400.00" },
       em: DEPOIS,
     });
     estado = reduzir(estado, {
@@ -329,30 +307,52 @@ describe("reduzir: lotes cumulativos e lançamentos", () => {
       rendimento: "2500.00",
       em: DEPOIS,
     });
+    expect(estado.calculo.base).toEqual({
+      periodos: [
+        {
+          de: null,
+          ate: "2026-08-04",
+          forma: { tipo: "percentualRendimentos", percentual: "30", rendimentoPadrao: "2000.00" },
+        },
+        {
+          de: "2026-08-05",
+          ate: null,
+          forma: { tipo: "percentualRendimentos", percentual: "30", rendimentoPadrao: "2500.00" },
+        },
+      ],
+    });
+    // a linha de onde se aplicou perde o rendimento próprio; as outras ficam como estão
     expect(
       estado.calculo.lancamentos.map((l) => [l.data, l.rendimento ?? null, l.editado]),
     ).toEqual([
       ["2026-07-05", null, false],
-      ["2026-08-05", "2500.00", true],
-      ["2026-09-05", "2500.00", true],
+      ["2026-08-05", null, true],
+      ["2026-09-05", null, false],
       ["2026-09-20", "3000.00", false],
-      ["2026-09-25", "2500.00", true],
     ]);
-    // aplicado a partir do próprio 13º, ele entra (e as comuns depois dele também)
-    const decimoTerceiro = estado.calculo.lancamentos.find((l) => l.descricao === "13º salário");
-    estado = reduzir(estado, {
-      tipo: "aplicarRendimentoDaquiEmDiante",
-      id: decimoTerceiro?.id ?? "",
-      rendimento: "3100.00",
+    expect(estado.calculo.atualizadoEm).toBe(DEPOIS);
+    // linha inexistente ou período de outra forma: nada muda
+    expect(
+      reduzir(estado, {
+        tipo: "aplicarRendimentoDaquiEmDiante",
+        id: "x",
+        rendimento: "1",
+        em: DEPOIS,
+      }),
+    ).toBe(estado);
+    const fixo = reduzir(estadoNovo(), {
+      tipo: "lancarPrestacoes",
+      lote: { diaVencimento: 5, de: "2026-07", ate: "2026-07" },
       em: DEPOIS,
     });
-    expect(estado.calculo.lancamentos.map((l) => [l.data, l.rendimento ?? null])).toEqual([
-      ["2026-07-05", null],
-      ["2026-08-05", "2500.00"],
-      ["2026-09-05", "2500.00"],
-      ["2026-09-20", "3100.00"],
-      ["2026-09-25", "3100.00"],
-    ]);
+    expect(
+      reduzir(fixo, {
+        tipo: "aplicarRendimentoDaquiEmDiante",
+        id: "p-2026-07",
+        rendimento: "1",
+        em: DEPOIS,
+      }),
+    ).toBe(fixo);
   });
 
   it("exclui pelo id", () => {
diff --git a/src/ui/tabelas/Personalizar.test.tsx b/src/ui/tabelas/Personalizar.test.tsx
index 4c444b1..cd6bc6a 100644
--- a/src/ui/tabelas/Personalizar.test.tsx
+++ b/src/ui/tabelas/Personalizar.test.tsx
@@ -151,7 +151,7 @@ describe("Personalizar, o lápis da linha (§9.3)", () => {
     expect(memoria.textContent).toContain("juros de 1% de 07/10/2026 a 11/10/2026");
   });
 
-  it("base em % dos rendimentos: rendimento do mês e 'aplicar daqui em diante'", async () => {
+  it("base em % dos rendimentos: rendimento do mês e 'aplicar daqui em diante', que divide a base (§17.2)", async () => {
     const user = userEvent.setup();
     render(<App ambiente={ambienteDeTeste()} />);
     await user.click(screen.getByLabelText("% dos rendimentos"));
@@ -168,22 +168,46 @@ describe("Personalizar, o lápis da linha (§9.3)", () => {
         .slice(1, 4)
         .map((r) => within(r).getAllByRole("cell")[1]?.textContent);
     expect(valores()).toEqual(["R$ 300,00", "R$ 300,00", "R$ 300,00"]);
+    // rendimento só deste mês: a linha fica com o rendimento próprio
+    await user.click(screen.getByRole("button", { name: "Personalizar prestação de 05/08/2026" }));
+    let painel = within(screen.getByRole("dialog", { name: "Personalizar prestação" }));
+    await user.type(painel.getByLabelText("Rendimento deste mês (opcional)"), "1.500,00");
+    await user.click(painel.getByRole("button", { name: "Aplicar" }));
+    expect(valores()).toEqual(["R$ 450,00", "R$ 300,00", "R$ 300,00"]);
+    // daqui em diante: a base se divide no vencimento, com o novo rendimento padrão
     await user.click(screen.getByRole("button", { name: "Personalizar prestação de 05/09/2026" }));
-    const painel = within(screen.getByRole("dialog", { name: "Personalizar prestação" }));
+    painel = within(screen.getByRole("dialog", { name: "Personalizar prestação" }));
     await user.type(painel.getByLabelText("Rendimento deste mês (opcional)"), "2.000,00");
     await user.click(
       painel.getByRole("button", { name: "Aplicar este rendimento daqui em diante" }),
     );
     expect(screen.queryByRole("dialog")).toBeNull();
-    expect(valores()).toEqual(["R$ 300,00", "R$ 600,00", "R$ 600,00"]);
+    expect(valores()).toEqual(["R$ 450,00", "R$ 600,00", "R$ 600,00"]);
+    const antes = within(screen.getByRole("group", { name: "Até 04/09/2026" }));
+    const depois = within(screen.getByRole("group", { name: "Desde 05/09/2026" }));
+    expect(
+      (antes.getByLabelText("Rendimento mensal padrão (obrigatório)") as HTMLInputElement).value,
+    ).toBe("1.000,00");
+    expect(
+      (depois.getByLabelText("Rendimento mensal padrão (obrigatório)") as HTMLInputElement).value,
+    ).toBe("2.000,00");
+    // as linhas seguem a regra: nenhuma ganha a marca de ajustada por isso
+    const outubro = screen
+      .getByRole("button", { name: "Memória da prestação de 05/10/2026" })
+      .closest("tr") as HTMLElement;
+    expect(outubro.textContent).not.toContain("ajustada");
     // em outra forma de base, o painel não mostra o rendimento, e "Aplicar" não o apaga
-    await user.click(screen.getByLabelText("Valor fixo em reais"));
-    await user.click(screen.getByRole("button", { name: "Personalizar prestação de 05/09/2026" }));
+    await user.click(antes.getByLabelText("Valor fixo em reais"));
+    await user.click(screen.getByRole("button", { name: "Personalizar prestação de 05/08/2026" }));
     const outroPainel = within(screen.getByRole("dialog", { name: "Personalizar prestação" }));
     expect(outroPainel.queryByLabelText("Rendimento deste mês (opcional)")).toBeNull();
     await user.click(outroPainel.getByRole("button", { name: "Aplicar" }));
-    await user.click(screen.getByLabelText("% dos rendimentos"));
-    expect(valores()).toEqual(["R$ 300,00", "R$ 600,00", "R$ 600,00"]);
+    await user.click(
+      within(screen.getByRole("group", { name: "Até 04/09/2026" })).getByLabelText(
+        "% dos rendimentos",
+      ),
+    );
+    expect(valores()).toEqual(["R$ 450,00", "R$ 600,00", "R$ 600,00"]);
     cleanup();
     render(<App ambiente={ambienteDeTeste()} />);
     expect(screen.queryByLabelText("Rendimento deste mês (opcional)")).toBeNull();
````

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run`
Expected: `Tests  4 failed | 841 passed | 10 skipped (855)` (arquivos: `3 failed | 42 passed (45)`). Falham:
  - `src/ui/estado/base.test.ts`: "aplicar no início de um período só troca o rendimento padrão dele; em período de outra forma, nada muda"; "aplicar um rendimento daqui em diante divide o período de "% dos rendimentos" na data, com o novo rendimento padrão";
  - `src/ui/estado/calculo.test.ts`: "aplicar o rendimento daqui em diante divide a base no vencimento da linha (§17.2): as linhas seguem a regra, sem a marca de ajustada";
  - `src/ui/tabelas/Personalizar.test.tsx`: "base em % dos rendimentos: rendimento do mês e 'aplicar daqui em diante', que divide a base (§17.2)".
  Motivo: `aplicarRendimentoNaBase` ainda não existe, e o redutor ainda grava o rendimento em cada prestação. Nenhum outro arquivo pode falhar.

- [ ] **Step 3: Aplicar o patch do código**

````diff
diff --git a/src/ui/estado/base.ts b/src/ui/estado/base.ts
index 91bf617..5a405b6 100644
--- a/src/ui/estado/base.ts
+++ b/src/ui/estado/base.ts
@@ -1,14 +1,24 @@
 import { diaAnterior } from "../../compartilhado/datas.ts";
 import { formatarData } from "../../compartilhado/formatacao.ts";
-import type { Base, DataISO, FormaDaBase, PeriodoDaBase } from "../../compartilhado/tipos.ts";
-import { descreverPeriodoDaBase, periodosDaBaseOrdenados } from "../../motor/base.ts";
+import type {
+  Base,
+  DataISO,
+  FormaDaBase,
+  PeriodoDaBase,
+  TextoDecimal,
+} from "../../compartilhado/tipos.ts";
+import {
+  descreverPeriodoDaBase,
+  periodoDaData,
+  periodosDaBaseOrdenados,
+} from "../../motor/base.ts";
 import { DATA_MINIMA } from "../entrada.ts";
 
 /**
  * Edição da base dos alimentos por períodos (§17.2, fase 5b), no padrão do editor de períodos da
  * metodologia: dividir numa data (o período novo nasce como cópia do dividido), remover uma
  * divisão (o período é absorvido pelo anterior, que mantém a própria forma), trocar a forma de um
- * período.
+ * período e aplicar um rendimento "daqui em diante" (divide o período de "% dos rendimentos").
  * Toda função devolve uma base nova, com os períodos em ordem cronológica. Módulo puro.
  */
 
@@ -63,3 +73,18 @@ export function trocarForma(base: Base, indice: number, forma: FormaDaBase): Bas
   if (alvo === undefined) return base;
   return { periodos: periodos.with(indice, { ...alvo, forma }) };
 }
+
+/**
+ * "Aplicar este rendimento daqui em diante" (§17.2): divide na data o período de "% dos
+ * rendimentos" que a contém e põe o rendimento como rendimento padrão do período novo; se a data
+ * já é início de período, só troca o rendimento padrão dele. O efeito vai até o fim daquele
+ * período. Período de outra forma: nada muda.
+ */
+export function aplicarRendimentoNaBase(base: Base, data: DataISO, rendimento: TextoDecimal): Base {
+  const alvo = periodoDaData(base, data);
+  if (alvo === undefined || alvo.forma.tipo !== "percentualRendimentos") return base;
+  // depois de dividir, o período que contém a data é o que começa nela
+  const dividida = dividirBase(base, data).base;
+  const indice = periodosDaBaseOrdenados(dividida).findIndex((p) => p.de === data);
+  return trocarForma(dividida, indice, { ...alvo.forma, rendimentoPadrao: rendimento });
+}
diff --git a/src/ui/estado/calculo.ts b/src/ui/estado/calculo.ts
index 67fa927..c25167f 100644
--- a/src/ui/estado/calculo.ts
+++ b/src/ui/estado/calculo.ts
@@ -14,6 +14,7 @@ import type {
 import type { SituacaoIndices } from "../../indices/congelar.ts";
 import { metodologiaPadrao } from "../../metodologias/padrao.ts";
 import { baseUnica } from "../../motor/base.ts";
+import { aplicarRendimentoNaBase } from "./base.ts";
 import { gerarLoteAmortizacoes, gerarLotePrestacoes, idLivre } from "../../motor/lote.ts";
 
 /**
@@ -252,21 +253,19 @@ export function reduzir(estado: Estado, acao: Acao): Estado {
         acao.em,
       );
     case "aplicarRendimentoDaquiEmDiante": {
+      // divide a base no vencimento da linha, com o novo rendimento padrão (§17.2); a linha de
+      // onde se aplicou passa a seguir a regra, e as demais ficam como estão
       const origem = estado.calculo.lancamentos.find((l) => l.id === acao.id);
       if (origem === undefined) return estado;
-      return comLancamentos(
-        estado,
-        // as prestações com descrição (13º, férias) não entram, como no lote (D1); a própria
-        // linha de onde se aplicou entra sempre
-        estado.calculo.lancamentos.map((l) =>
-          l.tipo === "prestacao" &&
-          l.data >= origem.data &&
-          (l.id === origem.id || !l.descricao?.trim())
-            ? { ...l, rendimento: acao.rendimento, editado: true }
-            : l,
-        ),
-        acao.em,
-      );
+      const base = aplicarRendimentoNaBase(estado.calculo.base, origem.data, acao.rendimento);
+      if (base === estado.calculo.base) return estado;
+      const lancamentos = estado.calculo.lancamentos.map((l) => {
+        if (l.id !== origem.id) return l;
+        const semRendimento = { ...l };
+        delete semRendimento.rendimento;
+        return semRendimento;
+      });
+      return comCalculo(estado, { base, lancamentos }, acao.em);
     }
     case "excluirLancamento":
       return comLancamentos(
diff --git a/src/ui/tabelas/Personalizar.tsx b/src/ui/tabelas/Personalizar.tsx
index ecb1492..569c075 100644
--- a/src/ui/tabelas/Personalizar.tsx
+++ b/src/ui/tabelas/Personalizar.tsx
@@ -22,8 +22,8 @@ import { EditorDePeriodos } from "../secoes/EditorDePeriodos.tsx";
 
 /**
  * "Personalizar" (§9.3, §6.5), o lápis da linha, para os ajustes finos: valor, data (vencimento
- * ou pagamento) e descrição; rendimento do mês (base em % dos rendimentos), com "aplicar daqui em
- * diante"; termos inicial e final da correção e dos juros; metodologia própria no mesmo editor de
+ * ou pagamento) e descrição; rendimento do mês (período da base em % dos rendimentos), com
+ * "aplicar daqui em diante", que divide a base no vencimento (§17.2); termos inicial e final da correção e dos juros; metodologia própria no mesmo editor de
  * períodos. Vencimento e valor também se corrigem na própria tabela, e a linha nova de
  * "+ Prestação"/"+ Pagamento" nasce na tabela (decisões de 13/10/2026). Validação ao aplicar,
  * erro embaixo de cada campo; termo final posterior à data de elaboração é recusado aqui (o motor
@@ -201,7 +201,7 @@ export function Personalizar({
             inputMode="decimal"
             classe="medio"
             placeholder="usa o rendimento padrão"
-            ajuda="Para 13º ou férias, informe o rendimento do evento; quando o salário mudou, informe o novo rendimento e aplique às prestações seguintes."
+            ajuda="Para 13º ou férias, informe o rendimento do evento. Quando o salário mudou, informe o novo rendimento e use “Aplicar este rendimento daqui em diante”: a base ganha um período novo, desde este vencimento, com esse rendimento padrão (seção 2)."
           />
           <button
             type="button"
````

- [ ] **Step 4: Formatar, verificar e conferir a contagem**

Run: `npm run format && npm run verificar`
Expected: tudo verde; `Tests  845 passed | 10 skipped (855)`, `Test Files  45 passed (45)`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "ui: aplicar o rendimento daqui em diante divide a base no vencimento

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 5: Metodologias: Lei 14.905/2024 (renomeada) e IGP-M com juros de 1%, reconhecidas pelo conteúdo

§17.3, dados e reconhecimento (D7, T4). O arquivo da metodologia padrão muda de nome e de id (o conteúdo, não); entra a segunda opção; `ehPadrao` dá lugar a `opcaoDaMetodologia`; a abertura de arquivo normaliza as metodologias. Os casos de referência trocam só o id e o nome da metodologia.

**Files:**
- Rename + Modify: `src/metodologias/tjms-saj.v1.json` → `src/metodologias/lei-14905-2024.v1.json` (id `lei-14905-2024`, nome "Lei 14.905/2024")
- Create: `src/metodologias/igpm-juros-1.v1.json`
- Modify: `src/metodologias/padrao.ts` (reescrito: `OpcaoDeMetodologia`, `OPCOES_DE_METODOLOGIA`, `metodologiaDaOpcao`, `metodologiaPadrao`)
- Modify: `src/ui/estado/metodologia.ts` (`canonico` sem id, versão e nome, com a taxa como número; `opcaoDaMetodologia`; `normalizar` com o id e o nome da opção reconhecida; `dividirPeriodo` recusa 01/01/1900, achado da revisão do ensaio)
- Modify: `src/ui/arquivo.ts` (`lerMetodologia` devolve a metodologia normalizada)
- Test: `src/metodologias/padrao.test.ts` (reescrito), `src/ui/estado/metodologia.test.ts`, `src/ui/arquivo.test.ts`, `src/motor/casos/*.json` (id e nome da metodologia)

**Interfaces:**
- Produces (em `src/metodologias/padrao.ts`): `type OpcaoDeMetodologia = "lei14905" | "igpmJuros1"`; `OPCOES_DE_METODOLOGIA: readonly OpcaoDeMetodologia[]` (nessa ordem); `metodologiaDaOpcao(opcao): Metodologia` (cópia nova); `metodologiaPadrao(): Metodologia` (= `metodologiaDaOpcao("lei14905")`).
- Consumes: `DATA_MINIMA` (Task 3).
- Produces (em `src/ui/estado/metodologia.ts`): `opcaoDaMetodologia(m: Metodologia): OpcaoDeMetodologia | null`; `normalizar(m)` (períodos em ordem, `ajustada` recalculada; reconhecida, leva id, versão e nome da opção); `ehPadrao` deixa de existir; `dividirPeriodo(m, "1900-01-01")` devolve a mesma metodologia com o aviso "A data precisa ser posterior a 01/01/1900.".

- [ ] **Step 1: Aplicar o patch dos testes e dos dados de teste**

````diff
diff --git a/src/metodologias/padrao.test.ts b/src/metodologias/padrao.test.ts
index 8dc00d0..c18ad50 100644
--- a/src/metodologias/padrao.test.ts
+++ b/src/metodologias/padrao.test.ts
@@ -1,12 +1,14 @@
 import { describe, expect, it } from "vitest";
-import { metodologiaPadrao } from "./padrao.ts";
+import { metodologiaDaOpcao, metodologiaPadrao, OPCOES_DE_METODOLOGIA } from "./padrao.ts";
 
-describe("metodologia padrão TJMS/SAJ v1", () => {
-  it("tem os dois períodos da Lei 14.905/2024 e os padrões do design", () => {
-    const m = metodologiaPadrao();
-    expect(m.id).toBe("tjms-saj");
+const ARREDONDAMENTO = { fatorCasas: 6, percentualCasas: 6, valorCasas: 2, modo: "comercial" };
+
+describe("metodologias de encargos pré-carregadas (§5.3, §17.3)", () => {
+  it("Lei 14.905/2024: os dois períodos da transição de 30/08/2024 e os padrões do design", () => {
+    const m = metodologiaDaOpcao("lei14905");
+    expect(m.id).toBe("lei-14905-2024");
     expect(m.versao).toBe(1);
-    expect(m.nome).toBe("TJMS/SAJ");
+    expect(m.nome).toBe("Lei 14.905/2024");
     expect(m.ajustada).toBe(false);
     expect(m.periodos).toEqual([
       {
@@ -19,12 +21,31 @@ describe("metodologia padrão TJMS/SAJ v1", () => {
     ]);
     expect(m.incidenciaMesInicial).toBe("proRata");
     expect(m.deflacao).toBe("aplicarComPiso");
-    expect(m.arredondamento).toEqual({
-      fatorCasas: 6,
-      percentualCasas: 6,
-      valorCasas: 2,
-      modo: "comercial",
+    expect(m.arredondamento).toEqual(ARREDONDAMENTO);
+    // a padrão de fábrica continua sendo esta
+    expect(metodologiaPadrao()).toEqual(m);
+  });
+
+  it("IGP-M e juros de 1% ao mês em todo o período, sem a mudança de 30/08/2024", () => {
+    const m = metodologiaDaOpcao("igpmJuros1");
+    expect(m).toEqual({
+      id: "igpm-juros-1",
+      versao: 1,
+      nome: "IGP-M e juros de 1% ao mês",
+      ajustada: false,
+      periodos: [
+        {
+          de: null,
+          ate: null,
+          correcao: { indice: "IGP-M" },
+          juros: { tipo: "percentualMensal", taxaMensal: "1" },
+        },
+      ],
+      incidenciaMesInicial: "proRata",
+      deflacao: "aplicarComPiso",
+      arredondamento: ARREDONDAMENTO,
     });
+    expect(OPCOES_DE_METODOLOGIA).toEqual(["lei14905", "igpmJuros1"]);
   });
 
   it("devolve uma cópia independente a cada chamada", () => {
@@ -34,5 +55,6 @@ describe("metodologia padrão TJMS/SAJ v1", () => {
     a.periodos.pop();
     expect(b.ajustada).toBe(false);
     expect(b.periodos).toHaveLength(2);
+    expect(metodologiaDaOpcao("igpmJuros1")).not.toBe(metodologiaDaOpcao("igpmJuros1"));
   });
 });
diff --git a/src/motor/casos/2018-05-25-saj-tjms-alimentos.json b/src/motor/casos/2018-05-25-saj-tjms-alimentos.json
index 64c8eaa..f12c960 100644
--- a/src/motor/casos/2018-05-25-saj-tjms-alimentos.json
+++ b/src/motor/casos/2018-05-25-saj-tjms-alimentos.json
@@ -44,9 +44,9 @@
       { "id": "a-2018-02", "tipo": "amortizacao", "data": "2018-02-10", "descricao": "Pagamento parcial", "valorInformado": "448.00", "origem": "avulso", "editado": false }
     ],
     "metodologia": {
-      "id": "tjms-saj",
+      "id": "lei-14905-2024",
       "versao": 1,
-      "nome": "TJMS/SAJ",
+      "nome": "Lei 14.905/2024",
       "ajustada": false,
       "periodos": [
         { "de": null, "ate": "2024-08-29", "correcao": { "indice": "IGP-M" }, "juros": { "tipo": "percentualMensal", "taxaMensal": "1" } },
diff --git a/src/motor/casos/2018-05-25-saj-tjms-base-valor-fixo-reajuste-sm.json b/src/motor/casos/2018-05-25-saj-tjms-base-valor-fixo-reajuste-sm.json
index 885afbb..61da016 100644
--- a/src/motor/casos/2018-05-25-saj-tjms-base-valor-fixo-reajuste-sm.json
+++ b/src/motor/casos/2018-05-25-saj-tjms-base-valor-fixo-reajuste-sm.json
@@ -62,9 +62,9 @@
       {"id": "a-2018-02", "tipo": "amortizacao", "data": "2018-02-10", "descricao": "Pagamento parcial", "valorInformado": "448.00", "origem": "avulso", "editado": false}
     ],
     "metodologia": {
-      "id": "tjms-saj",
+      "id": "lei-14905-2024",
       "versao": 1,
-      "nome": "TJMS/SAJ",
+      "nome": "Lei 14.905/2024",
       "ajustada": false,
       "periodos": [
         {"de": null, "ate": "2024-08-29", "correcao": {"indice": "IGP-M"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "1"}},
diff --git a/src/motor/casos/2026-09-15-deflacao-com-piso.json b/src/motor/casos/2026-09-15-deflacao-com-piso.json
index 6a13919..f50bfa8 100644
--- a/src/motor/casos/2026-09-15-deflacao-com-piso.json
+++ b/src/motor/casos/2026-09-15-deflacao-com-piso.json
@@ -19,9 +19,9 @@
       {"id": "a-2026-07-31", "tipo": "amortizacao", "data": "2026-07-31", "descricao": "Pagamento parcial", "valorInformado": "300.00", "origem": "avulso", "editado": false}
     ],
     "metodologia": {
-      "id": "tjms-saj",
+      "id": "lei-14905-2024",
       "versao": 1,
-      "nome": "TJMS/SAJ",
+      "nome": "Lei 14.905/2024",
       "ajustada": false,
       "periodos": [
         {"de": null, "ate": "2024-08-29", "correcao": {"indice": "IGP-M"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "1"}},
diff --git a/src/motor/casos/2026-10-11-calculadora-bcb-regime-novo.json b/src/motor/casos/2026-10-11-calculadora-bcb-regime-novo.json
index 91f3f54..545919a 100644
--- a/src/motor/casos/2026-10-11-calculadora-bcb-regime-novo.json
+++ b/src/motor/casos/2026-10-11-calculadora-bcb-regime-novo.json
@@ -23,9 +23,9 @@
       {"id": "a-2025-06-30", "tipo": "amortizacao", "data": "2025-06-30", "descricao": "Pagamento parcial", "valorInformado": "500.00", "origem": "avulso", "editado": false}
     ],
     "metodologia": {
-      "id": "tjms-saj",
+      "id": "lei-14905-2024",
       "versao": 1,
-      "nome": "TJMS/SAJ",
+      "nome": "Lei 14.905/2024",
       "ajustada": false,
       "periodos": [
         {"de": null, "ate": "2024-08-29", "correcao": {"indice": "IGP-M"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "1"}},
diff --git a/src/motor/casos/2026-10-11-encargos-proprios.json b/src/motor/casos/2026-10-11-encargos-proprios.json
index 53b36d9..7ffc3d6 100644
--- a/src/motor/casos/2026-10-11-encargos-proprios.json
+++ b/src/motor/casos/2026-10-11-encargos-proprios.json
@@ -15,14 +15,14 @@
     "lotes": {},
     "lancamentos": [
       {"id": "p-2025-01-15", "tipo": "prestacao", "data": "2025-01-15", "competencia": "2025-01", "valorInformado": "1000.00", "encargos": {"termoInicialJuros": "2025-06-01", "termoFinalJuros": "2026-03-31"}, "origem": "avulso", "editado": true},
-      {"id": "p-2024-01-10", "tipo": "prestacao", "data": "2024-01-10", "competencia": "2024-01", "valorInformado": "1000.00", "encargos": {"metodologia": {"id": "tjms-saj", "versao": 1, "nome": "TJMS/SAJ", "ajustada": true, "periodos": [{"de": null, "ate": "2024-06-30", "correcao": {"indice": "IGP-M"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "1"}}, {"de": "2024-07-01", "ate": "2024-08-29", "correcao": {"indice": "IGP-M"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "2"}}, {"de": "2024-08-30", "ate": null, "correcao": {"indice": "IPCA"}, "juros": {"tipo": "taxaLegal"}}], "incidenciaMesInicial": "proRata", "deflacao": "aplicarComPiso", "arredondamento": {"fatorCasas": 6, "percentualCasas": 6, "valorCasas": 2, "modo": "comercial"}}}, "origem": "avulso", "editado": true},
+      {"id": "p-2024-01-10", "tipo": "prestacao", "data": "2024-01-10", "competencia": "2024-01", "valorInformado": "1000.00", "encargos": {"metodologia": {"id": "lei-14905-2024", "versao": 1, "nome": "Lei 14.905/2024", "ajustada": true, "periodos": [{"de": null, "ate": "2024-06-30", "correcao": {"indice": "IGP-M"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "1"}}, {"de": "2024-07-01", "ate": "2024-08-29", "correcao": {"indice": "IGP-M"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "2"}}, {"de": "2024-08-30", "ate": null, "correcao": {"indice": "IPCA"}, "juros": {"tipo": "taxaLegal"}}], "incidenciaMesInicial": "proRata", "deflacao": "aplicarComPiso", "arredondamento": {"fatorCasas": 6, "percentualCasas": 6, "valorCasas": 2, "modo": "comercial"}}}, "origem": "avulso", "editado": true},
       {"id": "p-2026-05-20", "tipo": "prestacao", "data": "2026-05-20", "competencia": "2026-05", "valorInformado": "1000.00", "encargos": {"termoFinalCorrecao": "2026-07-31", "termoFinalJuros": "2026-07-31"}, "origem": "avulso", "editado": true},
       {"id": "a-2025-12-31", "tipo": "amortizacao", "data": "2025-12-31", "descricao": "Pagamento parcial", "valorInformado": "200.00", "encargos": {"termoInicialJuros": "2026-02-01"}, "origem": "avulso", "editado": false}
     ],
     "metodologia": {
-      "id": "tjms-saj",
+      "id": "lei-14905-2024",
       "versao": 1,
-      "nome": "TJMS/SAJ",
+      "nome": "Lei 14.905/2024",
       "ajustada": false,
       "periodos": [
         {"de": null, "ate": "2024-08-29", "correcao": {"indice": "IGP-M"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "1"}},
diff --git a/src/motor/casos/2026-10-11-multa-e-honorarios-art-523.json b/src/motor/casos/2026-10-11-multa-e-honorarios-art-523.json
index 04d87d3..1ae749f 100644
--- a/src/motor/casos/2026-10-11-multa-e-honorarios-art-523.json
+++ b/src/motor/casos/2026-10-11-multa-e-honorarios-art-523.json
@@ -19,9 +19,9 @@
       {"id": "a-2026-03-10", "tipo": "amortizacao", "data": "2026-03-10", "descricao": "Pagamento parcial", "valorInformado": "500.00", "origem": "avulso", "editado": false}
     ],
     "metodologia": {
-      "id": "tjms-saj",
+      "id": "lei-14905-2024",
       "versao": 1,
-      "nome": "TJMS/SAJ",
+      "nome": "Lei 14.905/2024",
       "ajustada": false,
       "periodos": [
         {"de": null, "ate": "2024-08-29", "correcao": {"indice": "IGP-M"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "1"}},
diff --git a/src/motor/casos/2026-10-11-saj-tjms-alimentos-igpm-2024-2026.json b/src/motor/casos/2026-10-11-saj-tjms-alimentos-igpm-2024-2026.json
index 189e8de..6142f27 100644
--- a/src/motor/casos/2026-10-11-saj-tjms-alimentos-igpm-2024-2026.json
+++ b/src/motor/casos/2026-10-11-saj-tjms-alimentos-igpm-2024-2026.json
@@ -50,9 +50,9 @@
       {"id": "a-2024-09", "tipo": "amortizacao", "data": "2024-09-10", "descricao": "Pagamento", "valorInformado": "5000.00", "origem": "avulso", "editado": false}
     ],
     "metodologia": {
-      "id": "tjms-saj",
+      "id": "lei-14905-2024",
       "versao": 1,
-      "nome": "TJMS/SAJ",
+      "nome": "Lei 14.905/2024",
       "ajustada": true,
       "periodos": [
         {"de": null, "ate": null, "correcao": {"indice": "IGP-M"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "1"}}
diff --git a/src/motor/casos/2026-10-11-saj-tjms-inpc-salario-minimo-lotes.json b/src/motor/casos/2026-10-11-saj-tjms-inpc-salario-minimo-lotes.json
index adf41fb..384345a 100644
--- a/src/motor/casos/2026-10-11-saj-tjms-inpc-salario-minimo-lotes.json
+++ b/src/motor/casos/2026-10-11-saj-tjms-inpc-salario-minimo-lotes.json
@@ -63,9 +63,9 @@
       {"id": "a-2026-04", "tipo": "amortizacao", "data": "2026-04-10", "descricao": "Pagamento parcial", "valorInformado": "300.00", "origem": "lote", "editado": false}
     ],
     "metodologia": {
-      "id": "tjms-saj",
+      "id": "lei-14905-2024",
       "versao": 1,
-      "nome": "TJMS/SAJ",
+      "nome": "Lei 14.905/2024",
       "ajustada": true,
       "periodos": [
         {"de": null, "ate": null, "correcao": {"indice": "INPC"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "1"}}
diff --git a/src/motor/casos/2026-10-11-saj-tjms-percentual-rendimentos-lote.json b/src/motor/casos/2026-10-11-saj-tjms-percentual-rendimentos-lote.json
index 106af73..7739f8f 100644
--- a/src/motor/casos/2026-10-11-saj-tjms-percentual-rendimentos-lote.json
+++ b/src/motor/casos/2026-10-11-saj-tjms-percentual-rendimentos-lote.json
@@ -54,9 +54,9 @@
       {"id": "p-2026-10", "tipo": "prestacao", "data": "2026-10-01", "competencia": "2026-10", "origem": "lote", "editado": false}
     ],
     "metodologia": {
-      "id": "tjms-saj",
+      "id": "lei-14905-2024",
       "versao": 1,
-      "nome": "TJMS/SAJ",
+      "nome": "Lei 14.905/2024",
       "ajustada": true,
       "periodos": [
         {"de": null, "ate": null, "correcao": {"indice": "IGP-M"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "1"}}
diff --git a/src/motor/casos/2026-10-11-saj-tjms-selic-capitalizada.json b/src/motor/casos/2026-10-11-saj-tjms-selic-capitalizada.json
index 4be31b3..1462ffc 100644
--- a/src/motor/casos/2026-10-11-saj-tjms-selic-capitalizada.json
+++ b/src/motor/casos/2026-10-11-saj-tjms-selic-capitalizada.json
@@ -23,9 +23,9 @@
       {"id": "p-2024-09", "tipo": "prestacao", "data": "2024-09-01", "competencia": "2024-09", "valorInformado": "10000.00", "origem": "avulso", "editado": true}
     ],
     "metodologia": {
-      "id": "tjms-saj",
+      "id": "lei-14905-2024",
       "versao": 1,
-      "nome": "TJMS/SAJ",
+      "nome": "Lei 14.905/2024",
       "ajustada": true,
       "periodos": [
         {"de": null, "ate": null, "correcao": {"indice": "nenhum"}, "juros": {"tipo": "selicUnica"}}
diff --git a/src/motor/casos/2026-10-11-transicao-lei-14905.json b/src/motor/casos/2026-10-11-transicao-lei-14905.json
index 8cdfede..207fc5f 100644
--- a/src/motor/casos/2026-10-11-transicao-lei-14905.json
+++ b/src/motor/casos/2026-10-11-transicao-lei-14905.json
@@ -22,9 +22,9 @@
       {"id": "a-2024-05-10", "tipo": "amortizacao", "data": "2024-05-10", "descricao": "Pagamento parcial", "valorInformado": "5000.00", "origem": "avulso", "editado": false}
     ],
     "metodologia": {
-      "id": "tjms-saj",
+      "id": "lei-14905-2024",
       "versao": 1,
-      "nome": "TJMS/SAJ",
+      "nome": "Lei 14.905/2024",
       "ajustada": false,
       "periodos": [
         {"de": null, "ate": "2024-08-29", "correcao": {"indice": "IGP-M"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "1"}},
diff --git a/src/motor/casos/2026-10-11-valor-fixo-reajuste-ipca.json b/src/motor/casos/2026-10-11-valor-fixo-reajuste-ipca.json
index d75de20..51e583e 100644
--- a/src/motor/casos/2026-10-11-valor-fixo-reajuste-ipca.json
+++ b/src/motor/casos/2026-10-11-valor-fixo-reajuste-ipca.json
@@ -38,9 +38,9 @@
       {"id": "a-2026-10-20", "tipo": "amortizacao", "data": "2026-10-20", "descricao": "Pagamento posterior ao cálculo", "valorInformado": "100.00", "origem": "avulso", "editado": false}
     ],
     "metodologia": {
-      "id": "tjms-saj",
+      "id": "lei-14905-2024",
       "versao": 1,
-      "nome": "TJMS/SAJ",
+      "nome": "Lei 14.905/2024",
       "ajustada": false,
       "periodos": [
         {"de": null, "ate": "2024-08-29", "correcao": {"indice": "IGP-M"}, "juros": {"tipo": "percentualMensal", "taxaMensal": "1"}},
diff --git a/src/ui/arquivo.test.ts b/src/ui/arquivo.test.ts
index de12c0d..58cc999 100644
--- a/src/ui/arquivo.test.ts
+++ b/src/ui/arquivo.test.ts
@@ -3,6 +3,7 @@ import type { Calculo } from "../compartilhado/tipos.ts";
 import { calcular } from "../motor/calcular.ts";
 import { gerarLotePrestacoes } from "../motor/lote.ts";
 import { tabelaRegimeNovo } from "../motor/testes/regime-novo.ts";
+import { metodologiaDaOpcao, metodologiaPadrao } from "../metodologias/padrao.ts";
 import { lerArquivo, montarArquivo, nomeDoArquivo, serializarArquivo } from "./arquivo.ts";
 import { novoCalculo } from "./estado/calculo.ts";
 import { dividirPeriodo } from "./estado/metodologia.ts";
@@ -107,6 +108,27 @@ describe("lerArquivo (validação do arquivo aberto, §5.1)", () => {
     expect(leitura.ok).toBe(true);
     if (!leitura.ok) return;
     expect(leitura.calculo).toEqual({ ...calculo, lotes: {} });
+  });
+
+  it("recalcula a marca de metodologia ajustada em vez de confiar no arquivo, e põe o nome da opção reconhecida (§17.3)", () => {
+    const calculo = calculoCompleto();
+    const resultado = calcular(calculo, tabelaRegimeNovo());
+    const arquivo = structuredClone({ formato: "apura/calculo@1", calculo, resultado });
+    // a global com o nome de antes e marcada "ajustada" sem estar; a própria, igual à segunda opção
+    Object.assign(arquivo.calculo.metodologia, {
+      id: "tjms-saj",
+      nome: "TJMS/SAJ",
+      ajustada: true,
+    });
+    const pagamento = arquivo.calculo.lancamentos[2]!;
+    pagamento.encargos = { metodologia: { ...metodologiaDaOpcao("igpmJuros1"), ajustada: true } };
+    const leitura = lerArquivo(JSON.stringify(arquivo));
+    expect(leitura.ok).toBe(true);
+    if (!leitura.ok) return;
+    expect(leitura.calculo.metodologia).toEqual(metodologiaPadrao());
+    expect(leitura.calculo.lancamentos[2]?.encargos?.metodologia).toEqual(
+      metodologiaDaOpcao("igpmJuros1"),
+    );
     expect("cpf" in leitura.calculo.cabecalho).toBe(false);
   });
 
diff --git a/src/ui/estado/metodologia.test.ts b/src/ui/estado/metodologia.test.ts
index 34259d9..a0e6f3d 100644
--- a/src/ui/estado/metodologia.test.ts
+++ b/src/ui/estado/metodologia.test.ts
@@ -1,25 +1,29 @@
 import { describe, expect, it } from "vitest";
 import type { Metodologia } from "../../compartilhado/tipos.ts";
-import { metodologiaPadrao } from "../../metodologias/padrao.ts";
+import { metodologiaDaOpcao, metodologiaPadrao } from "../../metodologias/padrao.ts";
 import { validarMetodologia } from "../../motor/periodos.ts";
 import { metodologiaSelicUnica } from "../../motor/testes/regime-novo.ts";
 import {
   dividirPeriodo,
-  ehPadrao,
   escolherIndice,
   escolherJuros,
   escolherOpcoes,
   escolherTaxa,
+  normalizar,
+  opcaoDaMetodologia,
   removerDivisao,
   restaurarPadrao,
   resumirMetodologia,
 } from "./metodologia.ts";
 
 describe("resumirMetodologia (resumo em uma frase, §9.2)", () => {
-  it("descreve a padrão TJMS/SAJ v1 e a SELIC única", () => {
+  it("descreve as duas opções pré-carregadas e a SELIC única", () => {
     expect(resumirMetodologia(metodologiaPadrao())).toBe(
       "Até 29/08/2024: IGP-M e juros de 1% ao mês. Desde 30/08/2024: IPCA e taxa legal.",
     );
+    expect(resumirMetodologia(metodologiaDaOpcao("igpmJuros1"))).toBe(
+      "Sempre: IGP-M e juros de 1% ao mês.",
+    );
     expect(resumirMetodologia(metodologiaSelicUnica())).toBe(
       "Sempre: SELIC única (correção e juros juntos).",
     );
@@ -86,6 +90,11 @@ describe("dividir e remover divisões", () => {
     expect(dividirPeriodo(semPeriodo, "2019-05-05").aviso).toBe(
       "Nenhum período cobre 05/05/2019: nada foi dividido.",
     );
+    // em 01/01/1900, o período anterior acabaria em 1899, e o arquivo não reabriria
+    expect(dividirPeriodo(metodologiaPadrao(), "1900-01-01")).toEqual({
+      metodologia: metodologiaPadrao(),
+      aviso: "A data precisa ser posterior a 01/01/1900.",
+    });
   });
 
   it("remover a divisão funde o período no anterior, que mantém as regras; a padrão volta a ser padrão", () => {
@@ -96,17 +105,11 @@ describe("dividir e remover divisões", () => {
     // remover a primeira "divisão" (índice 0) ou um índice inexistente não muda nada
     expect(removerDivisao(dividida, 0)).toBe(dividida);
     expect(removerDivisao(dividida, 9)).toBe(dividida);
-    // remover a transição legal: um período só, com as regras antigas
+    // remover a transição legal: um período só, com as regras antigas, que é a segunda opção
+    // pré-carregada (reconhecida pelo conteúdo, §17.3)
     const semTransicao = removerDivisao(metodologiaPadrao(), 1);
-    expect(semTransicao.periodos).toEqual([
-      {
-        de: null,
-        ate: null,
-        correcao: { indice: "IGP-M" },
-        juros: { tipo: "percentualMensal", taxaMensal: "1" },
-      },
-    ]);
-    expect(semTransicao.ajustada).toBe(true);
+    expect(semTransicao).toEqual(metodologiaDaOpcao("igpmJuros1"));
+    expect(semTransicao.ajustada).toBe(false);
   });
 });
 
@@ -155,12 +158,43 @@ describe("índice, juros, taxa e opções de cada período", () => {
       deflacao: "zerarNegativos",
       ajustada: true,
     });
-    expect(ehPadrao(opcoes)).toBe(false);
+    expect(opcaoDaMetodologia(opcoes)).toBeNull();
     expect(
       escolherOpcoes(opcoes, { incidenciaMesInicial: "proRata", deflacao: "aplicarComPiso" })
         .ajustada,
     ).toBe(false);
     expect(restaurarPadrao()).toEqual(metodologiaPadrao());
-    expect(ehPadrao({ ...metodologiaPadrao(), ajustada: true })).toBe(true);
+    expect(opcaoDaMetodologia({ ...metodologiaPadrao(), ajustada: true })).toBe("lei14905");
+  });
+});
+
+describe("reconhecimento das opções pré-carregadas pelo conteúdo (§17.3)", () => {
+  it("diz qual opção a metodologia é, ou nenhuma; id e nome não contam, a taxa vale como número", () => {
+    expect(opcaoDaMetodologia(metodologiaPadrao())).toBe("lei14905");
+    expect(opcaoDaMetodologia(metodologiaDaOpcao("igpmJuros1"))).toBe("igpmJuros1");
+    // um arquivo antigo, com o nome de antes e a taxa escrita "1.0", é a mesma metodologia
+    const antiga: Metodologia = {
+      ...metodologiaPadrao(),
+      id: "tjms-saj",
+      nome: "TJMS/SAJ",
+      ajustada: true,
+      periodos: metodologiaPadrao().periodos.map((p) =>
+        p.juros.tipo === "percentualMensal"
+          ? { ...p, juros: { tipo: "percentualMensal", taxaMensal: "1.0" } }
+          : p,
+      ),
+    };
+    expect(opcaoDaMetodologia(antiga)).toBe("lei14905");
+    expect(normalizar(antiga)).toMatchObject({
+      id: "lei-14905-2024",
+      nome: "Lei 14.905/2024",
+      ajustada: false,
+    });
+    // taxa de 2% ao mês: nenhuma das duas; o id e o nome ficam como estavam
+    const dois = escolherTaxa(metodologiaDaOpcao("igpmJuros1"), 0, "2");
+    expect(opcaoDaMetodologia(dois)).toBeNull();
+    expect(dois).toMatchObject({ id: "igpm-juros-1", ajustada: true });
+    // taxa inválida não quebra a comparação
+    expect(opcaoDaMetodologia(escolherTaxa(metodologiaPadrao(), 0, "x"))).toBeNull();
   });
 });
````

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run`
Expected: `Tests  9 failed | 839 passed | 10 skipped (858)` (arquivos: `3 failed | 42 passed (45)`). Falham:
  - `src/metodologias/padrao.test.ts`: "IGP-M e juros de 1% ao mês em todo o período, sem a mudança de 30/08/2024"; "Lei 14.905/2024: os dois períodos da transição de 30/08/2024 e os padrões do design"; "devolve uma cópia independente a cada chamada";
  - `src/ui/arquivo.test.ts`: "recalcula a marca de metodologia ajustada em vez de confiar no arquivo, e põe o nome da opção reconhecida (§17.3)";
  - `src/ui/estado/metodologia.test.ts`: "não divide numa data que já inicia um período nem fora dos períodos; avisa"; "remover a divisão funde o período no anterior, que mantém as regras; a padrão volta a ser padrão"; "diz qual opção a metodologia é, ou nenhuma; id e nome não contam, a taxa vale como número"; "descreve as duas opções pré-carregadas e a SELIC única"; "incidência no mês inicial e deflação; restaurar o padrão zera tudo".
  Motivo: as funções e os arquivos das duas opções ainda não existem, o reconhecimento ainda compara id e nome, e `dividirPeriodo` ainda aceita 01/01/1900. Nenhum outro arquivo pode falhar.

- [ ] **Step 3: Aplicar o patch do código** (inclui a renomeação do arquivo da metodologia; `git apply` a faz sozinho)

````diff
diff --git a/src/metodologias/igpm-juros-1.v1.json b/src/metodologias/igpm-juros-1.v1.json
new file mode 100644
index 0000000..f8c0a32
--- /dev/null
+++ b/src/metodologias/igpm-juros-1.v1.json
@@ -0,0 +1,17 @@
+{
+  "id": "igpm-juros-1",
+  "versao": 1,
+  "nome": "IGP-M e juros de 1% ao mês",
+  "ajustada": false,
+  "periodos": [
+    {
+      "de": null,
+      "ate": null,
+      "correcao": { "indice": "IGP-M" },
+      "juros": { "tipo": "percentualMensal", "taxaMensal": "1" }
+    }
+  ],
+  "incidenciaMesInicial": "proRata",
+  "deflacao": "aplicarComPiso",
+  "arredondamento": { "fatorCasas": 6, "percentualCasas": 6, "valorCasas": 2, "modo": "comercial" }
+}
diff --git a/src/metodologias/tjms-saj.v1.json b/src/metodologias/lei-14905-2024.v1.json
similarity index 90%
rename from src/metodologias/tjms-saj.v1.json
rename to src/metodologias/lei-14905-2024.v1.json
index c1c06fd..1ac6a38 100644
--- a/src/metodologias/tjms-saj.v1.json
+++ b/src/metodologias/lei-14905-2024.v1.json
@@ -1,7 +1,7 @@
 {
-  "id": "tjms-saj",
+  "id": "lei-14905-2024",
   "versao": 1,
-  "nome": "TJMS/SAJ",
+  "nome": "Lei 14.905/2024",
   "ajustada": false,
   "periodos": [
     {
diff --git a/src/metodologias/padrao.ts b/src/metodologias/padrao.ts
index 7cc226a..b532bf3 100644
--- a/src/metodologias/padrao.ts
+++ b/src/metodologias/padrao.ts
@@ -1,7 +1,27 @@
 import type { Metodologia } from "../compartilhado/tipos.ts";
-import tjmsSajV1 from "./tjms-saj.v1.json" with { type: "json" };
+import igpmJuros1V1 from "./igpm-juros-1.v1.json" with { type: "json" };
+import lei14905V1 from "./lei-14905-2024.v1.json" with { type: "json" };
 
-/** Cópia nova da metodologia padrão "TJMS/SAJ v1": cada cálculo guarda e pode ajustar a sua. */
+/**
+ * As metodologias de encargos pré-carregadas, que a pessoa escolhe na seção 5 (§17.3):
+ * "lei14905" (até 29/08/2024, IGP-M e juros de 1% ao mês; desde 30/08/2024, IPCA e taxa legal,
+ * Lei 14.905/2024) e "igpmJuros1" (IGP-M e juros de 1% ao mês em todo o período).
+ */
+export type OpcaoDeMetodologia = "lei14905" | "igpmJuros1";
+
+export const OPCOES_DE_METODOLOGIA: readonly OpcaoDeMetodologia[] = ["lei14905", "igpmJuros1"];
+
+const METODOLOGIAS: Record<OpcaoDeMetodologia, Metodologia> = {
+  lei14905: lei14905V1 as Metodologia,
+  igpmJuros1: igpmJuros1V1 as Metodologia,
+};
+
+/** Cópia nova da metodologia da opção: cada cálculo guarda e pode ajustar a sua. */
+export function metodologiaDaOpcao(opcao: OpcaoDeMetodologia): Metodologia {
+  return structuredClone(METODOLOGIAS[opcao]);
+}
+
+/** Cópia nova da metodologia padrão de fábrica, a da Lei 14.905/2024. */
 export function metodologiaPadrao(): Metodologia {
-  return structuredClone(tjmsSajV1 as Metodologia);
+  return metodologiaDaOpcao("lei14905");
 }
diff --git a/src/ui/arquivo.ts b/src/ui/arquivo.ts
index 198450c..d550c5a 100644
--- a/src/ui/arquivo.ts
+++ b/src/ui/arquivo.ts
@@ -20,6 +20,7 @@ import type {
   Resultado,
 } from "../compartilhado/tipos.ts";
 import { DATA_MAXIMA } from "./entrada.ts";
+import { normalizar } from "./estado/metodologia.ts";
 
 /**
  * Salvar e abrir o cálculo como arquivo (§5.1, §9.1). A leitura trata o conteúdo como `unknown` e
@@ -140,10 +141,14 @@ function lerJuros(valor: unknown, caminho: string): RegraJuros {
   return { tipo };
 }
 
+/**
+ * A metodologia do arquivo, conferida campo a campo e normalizada: a marca `ajustada` (e o id e o
+ * nome, quando as regras são as de uma opção pré-carregada) é recalculada, não lida (§17.3).
+ */
 function lerMetodologia(valor: unknown, caminho: string): Metodologia {
   const m = objeto(valor, caminho);
   const arredondamento = objeto(m.arredondamento, `${caminho}.arredondamento`);
-  return {
+  return normalizar({
     id: texto(m.id, `${caminho}.id`),
     versao: inteiro(m.versao, `${caminho}.versao`, 0, 1_000_000),
     nome: texto(m.nome, `${caminho}.nome`),
@@ -189,7 +194,7 @@ function lerMetodologia(valor: unknown, caminho: string): Metodologia {
       valorCasas: inteiro(arredondamento.valorCasas, `${caminho}.arredondamento.valorCasas`, 0, 20),
       modo: umDe(arredondamento.modo, ["comercial"] as const, `${caminho}.arredondamento.modo`),
     },
-  };
+  });
 }
 
 function lerForma(valor: unknown, caminho: string): FormaDaBase {
diff --git a/src/ui/estado/metodologia.ts b/src/ui/estado/metodologia.ts
index 1f6dedd..6ddbd9e 100644
--- a/src/ui/estado/metodologia.ts
+++ b/src/ui/estado/metodologia.ts
@@ -8,31 +8,40 @@ import type {
   PeriodoMetodologia,
   RegraJuros,
 } from "../../compartilhado/tipos.ts";
-import { metodologiaPadrao } from "../../metodologias/padrao.ts";
+import {
+  metodologiaDaOpcao,
+  metodologiaPadrao,
+  OPCOES_DE_METODOLOGIA,
+  type OpcaoDeMetodologia,
+} from "../../metodologias/padrao.ts";
 import { periodosOrdenados } from "../../motor/periodos.ts";
+import { DATA_MINIMA } from "../entrada.ts";
 
 /**
  * Edição da metodologia por períodos (§6.5, §9.2): resumo em uma frase para a tela, divisão de um
  * período numa data, remoção de uma divisão, troca de índice e de regra de juros em cada período
  * ("SELIC única" é uma escolha só: juros `selicUnica` e correção "nenhum"), incidência no mês
  * inicial e deflação. Toda função devolve uma cópia nova com `ajustada` recalculada (true quando
- * difere da metodologia padrão). Módulo puro.
+ * as regras não são as de nenhuma opção pré-carregada, §17.3). Módulo puro.
  */
 
 export type EscolhaDeJuros = "percentualMensal" | "taxaLegal" | "selicUnica";
 
-/** Forma canônica (campos conhecidos, em ordem fixa, sem `ajustada`), para comparar metodologias. */
+/**
+ * Forma canônica das regras (períodos, índices, taxas, mês inicial, deflação, arredondamento),
+ * para comparar metodologias pelo conteúdo: id, versão, nome e `ajustada` não contam, e a taxa
+ * mensal vale como número ("1.0" = "1"; texto inválido fica como está).
+ */
 function canonico(m: Metodologia): string {
   return JSON.stringify({
-    id: m.id,
-    versao: m.versao,
-    nome: m.nome,
     periodos: periodosOrdenados(m).map((p) => [
       p.de,
       p.ate,
       p.correcao.indice,
       p.juros.tipo,
-      p.juros.tipo === "percentualMensal" ? p.juros.taxaMensal : null,
+      p.juros.tipo === "percentualMensal"
+        ? (decimalOuNulo(p.juros.taxaMensal)?.toString() ?? p.juros.taxaMensal)
+        : null,
     ]),
     incidenciaMesInicial: m.incidenciaMesInicial,
     deflacao: m.deflacao,
@@ -45,15 +54,22 @@ function canonico(m: Metodologia): string {
   });
 }
 
-/** True quando a metodologia é, campo a campo, a padrão "TJMS/SAJ v1" (a ordem das chaves não importa). */
-export function ehPadrao(m: Metodologia): boolean {
-  return canonico(m) === canonico(metodologiaPadrao());
+/** Qual opção pré-carregada a metodologia é, pelo conteúdo (§17.3), ou `null` (ajustada). */
+export function opcaoDaMetodologia(m: Metodologia): OpcaoDeMetodologia | null {
+  const regras = canonico(m);
+  return OPCOES_DE_METODOLOGIA.find((o) => canonico(metodologiaDaOpcao(o)) === regras) ?? null;
 }
 
-/** Cópia com `ajustada` recalculada e os períodos em ordem cronológica. */
+/**
+ * Cópia com os períodos em ordem cronológica e `ajustada` recalculada; quando as regras são as de
+ * uma opção pré-carregada, a cópia leva o id, a versão e o nome dela.
+ */
 export function normalizar(m: Metodologia): Metodologia {
   const ordenada: Metodologia = { ...structuredClone(m), periodos: periodosOrdenados(m) };
-  return { ...ordenada, ajustada: !ehPadrao(ordenada) };
+  const opcao = opcaoDaMetodologia(ordenada);
+  if (opcao === null) return { ...ordenada, ajustada: true };
+  const { id, versao, nome } = metodologiaDaOpcao(opcao);
+  return { ...ordenada, id, versao, nome, ajustada: false };
 }
 
 /** "Até 29/08/2024", "Desde 30/08/2024", "De 01/01/2020 a 31/12/2022" ou "Sempre". */
@@ -94,6 +110,13 @@ export function dividirPeriodo(
   m: Metodologia,
   data: DataISO,
 ): { metodologia: Metodologia; aviso?: string } {
+  // o período anterior acabaria em 1899, antes da primeira data que o arquivo aceita
+  if (data <= DATA_MINIMA) {
+    return {
+      metodologia: m,
+      aviso: `A data precisa ser posterior a ${formatarData(DATA_MINIMA)}.`,
+    };
+  }
   const periodos = periodosOrdenados(m);
   const indice = periodos.findIndex(
     (p) => (p.de === null || p.de <= data) && (p.ate === null || data <= p.ate),
@@ -193,7 +216,7 @@ export function escolherOpcoes(
   return normalizar({ ...m, ...opcoes });
 }
 
-/** De volta à metodologia padrão "TJMS/SAJ v1". */
+/** De volta à metodologia padrão de fábrica, a da Lei 14.905/2024. */
 export function restaurarPadrao(): Metodologia {
   return metodologiaPadrao();
 }
````

- [ ] **Step 4: Formatar, verificar e conferir a contagem**

Run: `npm run format && npm run verificar`
Expected: tudo verde; `Tests  848 passed | 10 skipped (858)`, `Test Files  45 passed (45)`. Conferir que não sobrou o nome antigo fora dos testes que o usam de propósito: `grep -rn "tjms-saj\|TJMS/SAJ" src` só deve achar `src/ui/arquivo.test.ts`, `src/ui/estado/metodologia.test.ts` (metodologia "de antes", lida e normalizada) e a `fonte` dos dois casos de 2018 ("Relatório de Cálculo Processual – Sintético, TJMS/SAJ").

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "metodologias: Lei 14.905/2024 (renomeada) e IGP-M com juros de 1%, reconhecidas pelo conteúdo

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 6: Escolha da metodologia padrão na seção 5, guardada nas preferências

§17.3, tela e preferência (D7, D8, D9, T5). A seção 5 ganha as duas opções; a escolha vai para `apura.preferencias` e vale para os cálculos novos; "Esquecer" a mantém; "Restaurar a metodologia padrão" volta a ela (no "Ajustar" e nas regras próprias do lápis).

**Files:**
- Modify: `src/ui/preferencias.ts` (campo `metodologia`, padrão "lei14905", leitura conferida)
- Modify: `src/ui/estado/calculo.ts` (`novoCalculo` com `metodologia?: OpcaoDeMetodologia`; comentário rearrumado)
- Modify: `src/ui/estado/metodologia.ts` (`restaurarPadrao(opcao = "lei14905")`)
- Modify: `src/ui/secoes/Encargos.tsx` (opções, título com "(ajustada)", "Ajustada: …", balões; prop `aoEscolherMetodologia`)
- Modify: `src/ui/secoes/EditorDePeriodos.tsx` (prop `opcaoPadrao`)
- Modify: `src/ui/tabelas/Personalizar.tsx` (prop `opcaoPadrao`, repassada ao editor das regras próprias)
- Modify: `src/ui/App.tsx` (metodologia das preferências no cálculo novo; escolher aplica e grava; `opcaoPadrao` no editor e no lápis)
- Modify: `src/ui/estilos.css` (opções da metodologia, uma por linha)
- Test: `src/ui/preferencias.test.ts`, `src/ui/estado/calculo.test.ts`, `src/ui/estado/metodologia.test.ts`, `src/ui/secoes/EditorDePeriodos.test.tsx`, `src/ui/secoes/Encargos.test.tsx` (o primeiro teste reescrito; um teste no App), `src/ui/secoes/Processo.test.tsx` (as preferências gravadas passam a ter `metodologia`), `src/ui/App.test.tsx` (o resumo da ajustada sai em "Ajustada: …")

**Interfaces:**
- Consumes: `OpcaoDeMetodologia`, `metodologiaDaOpcao` (Task 5); `opcaoDaMetodologia`, `resumirMetodologia` (Task 5 e fase 5).
- Produces: `Preferencias.metodologia: OpcaoDeMetodologia`; `novoCalculo({ …, metodologia? })`; `restaurarPadrao(opcao?)`; props `Encargos.aoEscolherMetodologia(opcao)`, `EditorDePeriodos.opcaoPadrao?`, `Personalizar.opcaoPadrao?`. Rótulos exatos das opções: "Até 29/08/2024: IGP-M e juros de 1% ao mês. Desde 30/08/2024: IPCA e taxa legal." e "IGP-M e juros de 1% ao mês em todo o período."; balão da segunda: "IGP-M e juros de 1% ao mês do vencimento até a data do cálculo, sem a mudança de 30/08/2024. Use quando a decisão ou o acordo fixou esses critérios, ou quando o juízo mantém o critério anterior à Lei 14.905/2024. Sem isso, a regra legal desde 30/08/2024 é IPCA e taxa legal (arts. 389 e 406 do CC)."

- [ ] **Step 1: Aplicar o patch dos testes**

````diff
diff --git a/src/ui/App.test.tsx b/src/ui/App.test.tsx
index c2c5839..da5c0f3 100644
--- a/src/ui/App.test.tsx
+++ b/src/ui/App.test.tsx
@@ -63,10 +63,10 @@ describe("App (fundação da tela)", () => {
     );
     await user.keyboard("{Escape}");
     expect(screen.queryByRole("dialog")).toBeNull();
-    expect(screen.getByText(/Até 29\/08\/2024/).textContent).toBe(
-      "Até 29/08/2024: INPC e juros de 1% ao mês. Desde 30/08/2024: IPCA e taxa legal.",
+    expect(screen.getByText(/^Ajustada:/).textContent).toBe(
+      "Ajustada: Até 29/08/2024: INPC e juros de 1% ao mês. Desde 30/08/2024: IPCA e taxa legal.",
     );
-    expect(screen.getByText(/Metodologia de encargos/).textContent).toBe(
+    expect(screen.getByText(/^Metodologia de encargos/).textContent).toBe(
       "Metodologia de encargos (ajustada)",
     );
   });
diff --git a/src/ui/estado/calculo.test.ts b/src/ui/estado/calculo.test.ts
index 01122f3..db05aaf 100644
--- a/src/ui/estado/calculo.test.ts
+++ b/src/ui/estado/calculo.test.ts
@@ -1,7 +1,7 @@
 import { describe, expect, it } from "vitest";
 import type { Lancamento } from "../../compartilhado/tipos.ts";
 import { descreverSituacao } from "../../indices/congelar.ts";
-import { metodologiaPadrao } from "../../metodologias/padrao.ts";
+import { metodologiaDaOpcao, metodologiaPadrao } from "../../metodologias/padrao.ts";
 import { baseUnica } from "../../motor/base.ts";
 import { tabelaRegimeNovo } from "../../motor/testes/regime-novo.ts";
 import { estadoInicial, novoCalculo, reduzir, type Estado } from "./calculo.ts";
@@ -20,6 +20,15 @@ function estadoNovo(): Estado {
 }
 
 describe("novoCalculo", () => {
+  it("nasce com a metodologia escolhida como padrão nas preferências (§17.3)", () => {
+    expect(novoCalculo({ id: "c", agora: AGORA, hoje: HOJE }).metodologia).toEqual(
+      metodologiaPadrao(),
+    );
+    expect(
+      novoCalculo({ id: "c", agora: AGORA, hoje: HOJE, metodologia: "igpmJuros1" }).metodologia,
+    ).toEqual(metodologiaDaOpcao("igpmJuros1"));
+  });
+
   it("nasce em branco, com a data de hoje, valor fixo sem reajuste fixado hoje e a metodologia padrão", () => {
     const calculo = novoCalculo({
       id: "c-1",
diff --git a/src/ui/estado/metodologia.test.ts b/src/ui/estado/metodologia.test.ts
index a0e6f3d..e047dbd 100644
--- a/src/ui/estado/metodologia.test.ts
+++ b/src/ui/estado/metodologia.test.ts
@@ -164,6 +164,7 @@ describe("índice, juros, taxa e opções de cada período", () => {
         .ajustada,
     ).toBe(false);
     expect(restaurarPadrao()).toEqual(metodologiaPadrao());
+    expect(restaurarPadrao("igpmJuros1")).toEqual(metodologiaDaOpcao("igpmJuros1"));
     expect(opcaoDaMetodologia({ ...metodologiaPadrao(), ajustada: true })).toBe("lei14905");
   });
 });
diff --git a/src/ui/preferencias.test.ts b/src/ui/preferencias.test.ts
index dcbf5be..b8ec227 100644
--- a/src/ui/preferencias.test.ts
+++ b/src/ui/preferencias.test.ts
@@ -13,6 +13,7 @@ describe("preferências no navegador (§5.5)", () => {
     expect(lerPreferencias(armazenamentoEmMemoria())).toEqual(PREFERENCIAS_PADRAO);
     expect(lerPreferencias(null)).toEqual(PREFERENCIAS_PADRAO);
     expect(PREFERENCIAS_PADRAO.tema).toBe("sistema");
+    expect(PREFERENCIAS_PADRAO.metodologia).toBe("lei14905");
   });
 
   it("grava e lê de volta; com 'lembrar' desligado, grava os nomes vazios mas mantém as opções e o tema", () => {
@@ -23,6 +24,7 @@ describe("preferências no navegador (§5.5)", () => {
       lembrar: true,
       guardarRecentes: false,
       tema: "escuro" as const,
+      metodologia: "igpmJuros1" as const,
     };
     expect(gravarPreferencias(armazenamento, p)).toBe(true);
     expect(lerPreferencias(armazenamento)).toEqual(p);
@@ -33,6 +35,7 @@ describe("preferências no navegador (§5.5)", () => {
       lembrar: false,
       guardarRecentes: false,
       tema: "escuro",
+      metodologia: "igpmJuros1",
     });
     expect(lerPreferencias(armazenamento)).toEqual({
       defensor: "",
@@ -40,10 +43,11 @@ describe("preferências no navegador (§5.5)", () => {
       lembrar: false,
       guardarRecentes: false,
       tema: "escuro",
+      metodologia: "igpmJuros1",
     });
   });
 
-  it("conteúdo corrompido ou de outro formato volta aos padrões campo a campo (tema desconhecido vira 'sistema')", () => {
+  it("conteúdo corrompido ou de outro formato volta aos padrões campo a campo (tema desconhecido vira 'sistema'; metodologia desconhecida, a da Lei 14.905/2024)", () => {
     expect(lerPreferencias(armazenamentoEmMemoria({ [CHAVE_PREFERENCIAS]: "{nada" }))).toEqual(
       PREFERENCIAS_PADRAO,
     );
@@ -56,6 +60,7 @@ describe("preferências no navegador (§5.5)", () => {
         orgao: "Órgão",
         guardarRecentes: "sim",
         tema: "roxo",
+        metodologia: "tjms-saj",
       }),
     });
     expect(lerPreferencias(parcial)).toEqual({
@@ -64,10 +69,16 @@ describe("preferências no navegador (§5.5)", () => {
       lembrar: true,
       guardarRecentes: true,
       tema: "sistema",
+      metodologia: "lei14905",
     });
     expect(
       lerPreferencias(armazenamentoEmMemoria({ [CHAVE_PREFERENCIAS]: '{"tema":"claro"}' })).tema,
     ).toBe("claro");
+    expect(
+      lerPreferencias(
+        armazenamentoEmMemoria({ [CHAVE_PREFERENCIAS]: '{"metodologia":"igpmJuros1"}' }),
+      ).metodologia,
+    ).toBe("igpmJuros1");
   });
 
   it("armazenamento bloqueado: ler devolve os padrões, gravar devolve false, esquecer não lança", () => {
diff --git a/src/ui/secoes/EditorDePeriodos.test.tsx b/src/ui/secoes/EditorDePeriodos.test.tsx
index 23676dc..f9b2940 100644
--- a/src/ui/secoes/EditorDePeriodos.test.tsx
+++ b/src/ui/secoes/EditorDePeriodos.test.tsx
@@ -4,17 +4,30 @@ import userEvent from "@testing-library/user-event";
 import { useState } from "react";
 import { afterEach, describe, expect, it, vi } from "vitest";
 import type { Metodologia } from "../../compartilhado/tipos.ts";
-import { metodologiaPadrao } from "../../metodologias/padrao.ts";
+import {
+  metodologiaDaOpcao,
+  metodologiaPadrao,
+  type OpcaoDeMetodologia,
+} from "../../metodologias/padrao.ts";
 import { Dialogo } from "../componentes/Dialogo.tsx";
 import { EditorDePeriodos } from "./EditorDePeriodos.tsx";
 
 afterEach(cleanup);
 
-function Harness({ inicial, espiao }: { inicial: Metodologia; espiao: (m: Metodologia) => void }) {
+function Harness({
+  inicial,
+  espiao,
+  opcaoPadrao,
+}: {
+  inicial: Metodologia;
+  espiao: (m: Metodologia) => void;
+  opcaoPadrao?: OpcaoDeMetodologia;
+}) {
   const [metodologia, setMetodologia] = useState(inicial);
   return (
     <EditorDePeriodos
       metodologia={metodologia}
+      opcaoPadrao={opcaoPadrao}
       aoMudar={(m) => {
         setMetodologia(m);
         espiao(m);
@@ -93,6 +106,18 @@ describe("Editor de períodos (§6.5)", () => {
     expect(espiao.mock.lastCall?.[0]).toEqual(metodologiaPadrao());
   });
 
+  it("'Restaurar a metodologia padrão' volta à opção escolhida como padrão nas preferências (§17.3)", async () => {
+    const user = userEvent.setup();
+    const espiao = vi.fn();
+    render(<Harness inicial={metodologiaPadrao()} espiao={espiao} opcaoPadrao="igpmJuros1" />);
+    await user.selectOptions(
+      screen.getAllByLabelText("Índice de correção")[0] as HTMLElement,
+      "INPC",
+    );
+    await user.click(screen.getByRole("button", { name: "Restaurar a metodologia padrão" }));
+    expect(espiao.mock.lastCall?.[0]).toEqual(metodologiaDaOpcao("igpmJuros1"));
+  });
+
   it("'SELIC única' é uma escolha só: zera o índice, trava o seletor e explica", async () => {
     const user = userEvent.setup();
     const espiao = vi.fn();
diff --git a/src/ui/secoes/Encargos.test.tsx b/src/ui/secoes/Encargos.test.tsx
index 7688353..a52335c 100644
--- a/src/ui/secoes/Encargos.test.tsx
+++ b/src/ui/secoes/Encargos.test.tsx
@@ -1,11 +1,15 @@
 // @vitest-environment jsdom
-import { cleanup, fireEvent, render, screen } from "@testing-library/react";
+import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
 import userEvent from "@testing-library/user-event";
 import { useState } from "react";
 import { afterEach, describe, expect, it, vi } from "vitest";
 import type { Calculo } from "../../compartilhado/tipos.ts";
 import { novoCalculo } from "../estado/calculo.ts";
+import { metodologiaDaOpcao } from "../../metodologias/padrao.ts";
 import { dividirPeriodo } from "../estado/metodologia.ts";
+import App from "../App.tsx";
+import { CHAVE_PREFERENCIAS } from "../armazenamento.ts";
+import { ambienteDeTeste, armazenamentoEmMemoria } from "../testes/ambiente-de-teste.ts";
 import { Encargos } from "./Encargos.tsx";
 
 afterEach(cleanup);
@@ -25,6 +29,9 @@ function Harness({ inicial, espiao }: { inicial: Calculo; espiao: (c: Calculo) =
       aoMudarDataElaboracao={(data) => mudar({ ...calculo, dataElaboracao: data })}
       aoMudarObservacoes={(texto) => mudar({ ...calculo, observacoes: texto })}
       aoAjustar={() => espiao({ ...calculo, observacoes: "ajustar!" })}
+      aoEscolherMetodologia={(opcao) =>
+        mudar({ ...calculo, metodologia: metodologiaDaOpcao(opcao) })
+      }
     />
   );
 }
@@ -32,24 +39,50 @@ function Harness({ inicial, espiao }: { inicial: Calculo; espiao: (c: Calculo) =
 const inicial = novoCalculo({ id: "c", agora: "2026-10-11T15:00:00-03:00", hoje: "2026-10-11" });
 
 describe("5 · Encargos e data do cálculo (§9.2)", () => {
-  it("resume a metodologia em uma frase, com '(padrão)' quando é a padrão (sem citar outro sistema) e 'ajustada' quando não é", () => {
-    render(<Harness inicial={inicial} espiao={vi.fn()} />);
-    expect(screen.getByText(/Metodologia de encargos/).textContent).toBe(
-      "Metodologia de encargos (padrão)",
+  it("a metodologia se escolhe entre as duas opções; ajustada, nenhuma fica marcada e o resumo aparece (§17.3, sem citar outro sistema)", async () => {
+    const user = userEvent.setup();
+    const espiao = vi.fn();
+    render(<Harness inicial={inicial} espiao={espiao} />);
+    expect(screen.getByText(/^Metodologia de encargos/).textContent).toBe(
+      "Metodologia de encargos",
     );
-    expect(screen.getByText(/Até 29\/08\/2024/).textContent).toBe(
+    const transicao = screen.getByLabelText(
       "Até 29/08/2024: IGP-M e juros de 1% ao mês. Desde 30/08/2024: IPCA e taxa legal.",
+    ) as HTMLInputElement;
+    const semTransicao = screen.getByLabelText(
+      "IGP-M e juros de 1% ao mês em todo o período.",
+    ) as HTMLInputElement;
+    expect([transicao.checked, semTransicao.checked]).toEqual([true, false]);
+    expect(screen.queryByText(/^Ajustada:/)).toBeNull();
+    await user.click(
+      screen.getByRole("button", { name: "Ajuda: IGP-M e juros de 1% ao mês em todo o período" }),
     );
+    expect(
+      screen.getByText(/Use quando a decisão ou o acordo fixou esses critérios/).textContent,
+    ).toBe(
+      "IGP-M e juros de 1% ao mês do vencimento até a data do cálculo, sem a mudança de 30/08/2024. Use quando a decisão ou o acordo fixou esses critérios, ou quando o juízo mantém o critério anterior à Lei 14.905/2024. Sem isso, a regra legal desde 30/08/2024 é IPCA e taxa legal (arts. 389 e 406 do CC).",
+    );
+    await user.click(semTransicao);
+    expect(espiao.mock.lastCall?.[0].metodologia).toEqual(metodologiaDaOpcao("igpmJuros1"));
+    expect([transicao.checked, semTransicao.checked]).toEqual([false, true]);
     cleanup();
     const ajustada = {
       ...inicial,
       metodologia: dividirPeriodo(inicial.metodologia, "2023-01-01").metodologia,
     };
     render(<Harness inicial={ajustada} espiao={vi.fn()} />);
-    expect(screen.getByText(/Metodologia de encargos/).textContent).toBe(
+    expect(screen.getByText(/^Metodologia de encargos/).textContent).toBe(
       "Metodologia de encargos (ajustada)",
     );
-    expect(screen.getByText(/Até 31\/12\/2022/)).toBeDefined();
+    expect(
+      screen
+        .getAllByRole("radio")
+        .filter((r) => (r as HTMLInputElement).name === "metodologia")
+        .map((r) => (r as HTMLInputElement).checked),
+    ).toEqual([false, false]);
+    expect(screen.getByText(/^Ajustada:/).textContent).toBe(
+      "Ajustada: Até 31/12/2022: IGP-M e juros de 1% ao mês. De 01/01/2023 a 29/08/2024: IGP-M e juros de 1% ao mês. Desde 30/08/2024: IPCA e taxa legal.",
+    );
   });
 
   it("multa e honorários vêm com 10% cada (decisão de 13/10/2026), aceitam vírgula e recusam negativos; a data de elaboração é validada; observações livres", async () => {
@@ -88,4 +121,36 @@ describe("5 · Encargos e data do cálculo (§9.2)", () => {
     await user.click(screen.getByRole("button", { name: "Ajustar" }));
     expect(espiao.mock.lastCall?.[0].observacoes).toBe("ajustar!");
   });
+
+  it("no App: a opção escolhida vale para o cálculo, fica guardada, vem nos cálculos novos, sobrevive a 'Esquecer' e é o que 'Restaurar' restaura", async () => {
+    const user = userEvent.setup();
+    const armazenamento = armazenamentoEmMemoria();
+    render(<App ambiente={ambienteDeTeste({ armazenamento })} />);
+    const opcao = (rotulo: RegExp) => screen.getByLabelText(rotulo) as HTMLInputElement;
+    const semTransicao = /^IGP-M e juros de 1% ao mês em todo o período/;
+    const guardada = () =>
+      (JSON.parse(armazenamento.getItem(CHAVE_PREFERENCIAS) ?? "{}") as { metodologia?: string })
+        .metodologia;
+    await user.click(opcao(semTransicao));
+    expect(guardada()).toBe("igpmJuros1");
+    await user.click(screen.getByRole("button", { name: "Novo cálculo" }));
+    expect(opcao(semTransicao).checked).toBe(true);
+    await user.click(screen.getByRole("button", { name: "Esquecer" }));
+    expect(guardada()).toBe("igpmJuros1");
+    // ajustada no editor, "Restaurar" volta à opção guardada
+    await user.click(screen.getByRole("button", { name: "Ajustar" }));
+    const painel = within(
+      screen.getByRole("dialog", { name: "Ajustar a metodologia de encargos" }),
+    );
+    await user.selectOptions(painel.getByLabelText("Índice de correção"), "INPC");
+    expect(screen.getByText(/^Metodologia de encargos/).textContent).toBe(
+      "Metodologia de encargos (ajustada)",
+    );
+    await user.click(painel.getByRole("button", { name: "Restaurar a metodologia padrão" }));
+    await user.keyboard("{Escape}");
+    expect(opcao(semTransicao).checked).toBe(true);
+    // a outra opção também se guarda
+    await user.click(opcao(/^Até 29\/08\/2024: IGP-M/));
+    expect(guardada()).toBe("lei14905");
+  });
 });
diff --git a/src/ui/secoes/Processo.test.tsx b/src/ui/secoes/Processo.test.tsx
index 0829a90..60bd291 100644
--- a/src/ui/secoes/Processo.test.tsx
+++ b/src/ui/secoes/Processo.test.tsx
@@ -86,6 +86,7 @@ describe("1 · Processo: preferências e recentes no navegador (§5.5)", () => {
       lembrar: true,
       guardarRecentes: true,
       tema: "sistema",
+      metodologia: "lei14905",
     });
     await user.type(screen.getByLabelText("Nº do processo"), "08000004620268120001");
     await user.click(screen.getByRole("button", { name: "Novo cálculo" }));
@@ -118,6 +119,7 @@ describe("1 · Processo: preferências e recentes no navegador (§5.5)", () => {
       lembrar: false,
       guardarRecentes: true,
       tema: "sistema",
+      metodologia: "lei14905",
     });
     await user.type(defensor, " e mais");
     expect(defensor.value).toBe("Quem ficou gravado e mais");
@@ -138,6 +140,7 @@ describe("1 · Processo: preferências e recentes no navegador (§5.5)", () => {
       lembrar: false,
       guardarRecentes: true,
       tema: "sistema",
+      metodologia: "lei14905",
     });
     expect((screen.getByLabelText("Lembrar neste navegador") as HTMLInputElement).checked).toBe(
       false,
@@ -218,6 +221,7 @@ describe("1 · Processo: preferências e recentes no navegador (§5.5)", () => {
       lembrar: true,
       guardarRecentes: true,
       tema: "escuro",
+      metodologia: "lei14905",
     });
     expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
   });
````

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run`
Expected: `Tests  13 failed | 838 passed | 10 skipped (861)` (arquivos: `7 failed | 38 passed (45)`). Falham:
  - `src/ui/App.test.tsx`: "'Ajustar' abre o editor de períodos num painel; a mudança reflete no resumo; Esc fecha";
  - `src/ui/estado/calculo.test.ts`: "nasce com a metodologia escolhida como padrão nas preferências (§17.3)";
  - `src/ui/estado/metodologia.test.ts`: "incidência no mês inicial e deflação; restaurar o padrão zera tudo";
  - `src/ui/preferencias.test.ts`: "conteúdo corrompido ou de outro formato volta aos padrões campo a campo (tema desconhecido vira 'sistema'; metodologia desconhecida, a da Lei 14.905/2024)"; "grava e lê de volta; com 'lembrar' desligado, grava os nomes vazios mas mantém as opções e o tema"; "sem nada gravado, valem os padrões: lembrar e guardar recentes ligados, nomes vazios, tema do sistema";
  - `src/ui/secoes/EditorDePeriodos.test.tsx`: "'Restaurar a metodologia padrão' volta à opção escolhida como padrão nas preferências (§17.3)";
  - `src/ui/secoes/Encargos.test.tsx`: "a metodologia se escolhe entre as duas opções; ajustada, nenhuma fica marcada e o resumo aparece (§17.3, sem citar outro sistema)"; "no App: a opção escolhida vale para o cálculo, fica guardada, vem nos cálculos novos, sobrevive a 'Esquecer' e é o que 'Restaurar' restaura";
  - `src/ui/secoes/Processo.test.tsx`: "'Esquecer' apaga preferências e recentes, desliga 'Lembrar' e mantém o cálculo na tela"; "abre com o tema guardado; Esquecer e desligar Lembrar não apagam o tema"; "abre com os nomes gravados antes; desligar 'Lembrar' apaga os nomes gravados e para de gravar"; "lembra defensor(a) e órgão enquanto digita e os preenche no próximo cálculo".
  Motivo: as preferências, o cálculo novo e a seção 5 ainda não conhecem a metodologia escolhida. Nenhum outro arquivo pode falhar.

- [ ] **Step 3: Aplicar o patch do código**

````diff
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index b548ca1..0ed8bf5 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -1,6 +1,7 @@
 import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
 import type { Lancamento, LancamentoCalculado } from "../compartilhado/tipos.ts";
 import { compararIndicesUsados } from "../indices/congelar.ts";
+import { metodologiaDaOpcao } from "../metodologias/padrao.ts";
 import { calcular } from "../motor/calcular.ts";
 import { Abrir } from "./Abrir.tsx";
 import { ambientePadrao, type Ambiente } from "./ambiente.ts";
@@ -70,6 +71,7 @@ export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambien
       agora: ambiente.agora(),
       hoje: ambiente.hoje(),
       cabecalho: p.lembrar ? { defensor: p.defensor, orgao: p.orgao } : {},
+      metodologia: p.metodologia,
     });
   // A tabela de índices é congelada quando o app abre (§8.2); "Novo cálculo" congela outra.
   const [estado, despachar] = useReducer(reduzir, undefined, () =>
@@ -230,6 +232,14 @@ export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambien
             }
             aoMudarObservacoes={(texto) => despachar({ tipo: "observacoes", texto, em: agora() })}
             aoAjustar={() => setEditorAberto(true)}
+            aoEscolherMetodologia={(opcao) => {
+              despachar({
+                tipo: "metodologia",
+                metodologia: metodologiaDaOpcao(opcao),
+                em: agora(),
+              });
+              mudarPreferencias({ metodologia: opcao });
+            }}
           />
         </div>
         <div className="coluna-direita" key={`direita-${estado.calculo.id}-${aberturas}`}>
@@ -272,6 +282,7 @@ export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambien
       >
         <EditorDePeriodos
           metodologia={estado.calculo.metodologia}
+          opcaoPadrao={preferencias.metodologia}
           aoMudar={(metodologia) => despachar({ tipo: "metodologia", metodologia, em: agora() })}
         />
         <div className="dialogo-acoes">
@@ -315,6 +326,7 @@ export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambien
           <Personalizar
             lancamento={personalizando}
             calculo={estado.calculo}
+            opcaoPadrao={preferencias.metodologia}
             aoEditar={editar}
             aoAplicarRendimento={(id, rendimento) =>
               despachar({ tipo: "aplicarRendimentoDaquiEmDiante", id, rendimento, em: agora() })
diff --git a/src/ui/estado/calculo.ts b/src/ui/estado/calculo.ts
index c25167f..eaf7476 100644
--- a/src/ui/estado/calculo.ts
+++ b/src/ui/estado/calculo.ts
@@ -12,7 +12,7 @@ import type {
   TextoDecimal,
 } from "../../compartilhado/tipos.ts";
 import type { SituacaoIndices } from "../../indices/congelar.ts";
-import { metodologiaPadrao } from "../../metodologias/padrao.ts";
+import { metodologiaDaOpcao, type OpcaoDeMetodologia } from "../../metodologias/padrao.ts";
 import { baseUnica } from "../../motor/base.ts";
 import { aplicarRendimentoNaBase } from "./base.ts";
 import { gerarLoteAmortizacoes, gerarLotePrestacoes, idLivre } from "../../motor/lote.ts";
@@ -79,15 +79,18 @@ export type Acao =
 
 /**
  * Cálculo novo em branco (§5.2): data de elaboração de hoje, base de um período só (§17.2) em
- * valor fixo sem reajuste com a data de fixação de hoje (o único campo da base que o motor exige válido) e o valor a preencher,
- * metodologia padrão, multa e honorários de 10% cada (decisão de 13/10/2026, D26). Defensor e
- * órgão vêm das preferências.
+ * valor fixo sem reajuste com a data de fixação de hoje (o único campo da base que o motor exige
+ * válido) e o valor a preencher, a metodologia escolhida como padrão nas preferências (§17.3),
+ * multa e honorários de 10% cada (decisão de 13/10/2026, D26). Defensor e órgão vêm das
+ * preferências.
  */
 export function novoCalculo(p: {
   id: string;
   agora: string;
   hoje: DataISO;
   cabecalho?: Partial<Cabecalho>;
+  /** a metodologia padrão escolhida nas preferências (§17.3); sem ela, a da Lei 14.905/2024 */
+  metodologia?: OpcaoDeMetodologia;
 }): Calculo {
   return {
     formato: "apura/calculo@1",
@@ -113,7 +116,7 @@ export function novoCalculo(p: {
     }),
     lotes: {},
     lancamentos: [],
-    metodologia: metodologiaPadrao(),
+    metodologia: metodologiaDaOpcao(p.metodologia ?? "lei14905"),
     acrescimos: { multaPercentual: "10", honorariosPercentual: "10" },
     observacoes: "",
   };
diff --git a/src/ui/estado/metodologia.ts b/src/ui/estado/metodologia.ts
index 6ddbd9e..d2aeabe 100644
--- a/src/ui/estado/metodologia.ts
+++ b/src/ui/estado/metodologia.ts
@@ -10,7 +10,6 @@ import type {
 } from "../../compartilhado/tipos.ts";
 import {
   metodologiaDaOpcao,
-  metodologiaPadrao,
   OPCOES_DE_METODOLOGIA,
   type OpcaoDeMetodologia,
 } from "../../metodologias/padrao.ts";
@@ -216,7 +215,7 @@ export function escolherOpcoes(
   return normalizar({ ...m, ...opcoes });
 }
 
-/** De volta à metodologia padrão de fábrica, a da Lei 14.905/2024. */
-export function restaurarPadrao(): Metodologia {
-  return metodologiaPadrao();
+/** De volta à opção escolhida como padrão nas preferências (§17.3); sem ela, a da Lei 14.905/2024. */
+export function restaurarPadrao(opcao: OpcaoDeMetodologia = "lei14905"): Metodologia {
+  return metodologiaDaOpcao(opcao);
 }
diff --git a/src/ui/estilos.css b/src/ui/estilos.css
index 348626a..c9416af 100644
--- a/src/ui/estilos.css
+++ b/src/ui/estilos.css
@@ -434,6 +434,30 @@ textarea {
   align-items: center;
 }
 
+/* metodologia de encargos (§17.3): cada opção numa linha, o balão ⓘ ao lado da segunda */
+.metodologia-de-encargos {
+  flex-direction: column;
+  flex-wrap: nowrap;
+}
+
+.metodologia-de-encargos label {
+  align-items: flex-start;
+}
+
+.metodologia-de-encargos label input {
+  margin-top: 3px;
+}
+
+.opcao-com-ajuda {
+  display: inline-flex;
+  gap: 4px;
+  align-items: flex-start;
+}
+
+.metodologia-de-encargos > .linha {
+  margin: 4px 0 0;
+}
+
 .nota {
   font-size: 13px;
   color: var(--discreto);
diff --git a/src/ui/preferencias.ts b/src/ui/preferencias.ts
index 4ee772f..8ae7480 100644
--- a/src/ui/preferencias.ts
+++ b/src/ui/preferencias.ts
@@ -1,3 +1,4 @@
+import { OPCOES_DE_METODOLOGIA, type OpcaoDeMetodologia } from "../metodologias/padrao.ts";
 import {
   CHAVE_PREFERENCIAS,
   CHAVE_RECENTES,
@@ -9,9 +10,11 @@ import {
 /**
  * Preferências do usuário neste navegador (§5.5): defensor(a) e órgão, com "Lembrar neste
  * navegador" (ligado por padrão); a opção "Guardar cálculos recentes neste navegador" (ligada
- * por padrão; para desligar em computador compartilhado); e o tema da tela (do sistema, claro ou
- * escuro; padrão: do sistema; decisão de 12/10/2026). "Esquecer" apaga preferências e recentes;
- * o App regrava em seguida as opções e o tema, que não são dados pessoais. Nada é transmitido.
+ * por padrão; para desligar em computador compartilhado); o tema da tela (do sistema, claro ou
+ * escuro; padrão: do sistema; decisão de 12/10/2026); e a metodologia de encargos padrão dos
+ * cálculos novos (padrão: a da Lei 14.905/2024; §17.3). "Esquecer" apaga preferências e recentes;
+ * o App regrava em seguida as opções, o tema e a metodologia, que não são dados pessoais. Nada é
+ * transmitido.
  */
 export type Tema = "sistema" | "claro" | "escuro";
 
@@ -23,6 +26,7 @@ export interface Preferencias {
   lembrar: boolean;
   guardarRecentes: boolean;
   tema: Tema;
+  metodologia: OpcaoDeMetodologia;
 }
 
 export const PREFERENCIAS_PADRAO: Preferencias = {
@@ -31,6 +35,7 @@ export const PREFERENCIAS_PADRAO: Preferencias = {
   lembrar: true,
   guardarRecentes: true,
   tema: "sistema",
+  metodologia: "lei14905",
 };
 
 function texto(valor: unknown): string {
@@ -47,6 +52,12 @@ function tema(valor: unknown): Tema {
     : PREFERENCIAS_PADRAO.tema;
 }
 
+function metodologia(valor: unknown): OpcaoDeMetodologia {
+  return typeof valor === "string" && (OPCOES_DE_METODOLOGIA as string[]).includes(valor)
+    ? (valor as OpcaoDeMetodologia)
+    : PREFERENCIAS_PADRAO.metodologia;
+}
+
 /** As preferências gravadas, campo a campo conferido; o padrão para o que falta ou está estranho. */
 export function lerPreferencias(armazenamento: Storage | null): Preferencias {
   const lido = lerJson(armazenamento, CHAVE_PREFERENCIAS);
@@ -59,12 +70,13 @@ export function lerPreferencias(armazenamento: Storage | null): Preferencias {
     lembrar,
     guardarRecentes: booleano(dados.guardarRecentes, PREFERENCIAS_PADRAO.guardarRecentes),
     tema: tema(dados.tema),
+    metodologia: metodologia(dados.metodologia),
   };
 }
 
 /**
  * Grava as preferências. Com "Lembrar" desligado, defensor e órgão são gravados vazios (as duas
- * opções e o tema continuam gravados, para valerem na próxima visita). Devolve false se não deu
+ * opções, o tema e a metodologia continuam gravados, para valerem na próxima visita). Devolve false se não deu
  * para gravar.
  */
 export function gravarPreferencias(armazenamento: Storage | null, p: Preferencias): boolean {
diff --git a/src/ui/secoes/EditorDePeriodos.tsx b/src/ui/secoes/EditorDePeriodos.tsx
index c182dd9..632a022 100644
--- a/src/ui/secoes/EditorDePeriodos.tsx
+++ b/src/ui/secoes/EditorDePeriodos.tsx
@@ -1,5 +1,6 @@
 import { useState } from "react";
 import type { IndiceCorrecao, Metodologia, PeriodoMetodologia } from "../../compartilhado/tipos.ts";
+import type { OpcaoDeMetodologia } from "../../metodologias/padrao.ts";
 import { periodosOrdenados, validarMetodologia } from "../../motor/periodos.ts";
 import { Avisos } from "../componentes/Avisos.tsx";
 import { CampoSelecao, CampoTexto, Opcao, useCampoValidado } from "../componentes/Campo.tsx";
@@ -41,9 +42,12 @@ export function EditorDePeriodos({
   metodologia,
   aoMudar,
   prefixoDosIds = "periodo",
+  opcaoPadrao = "lei14905",
 }: {
   metodologia: Metodologia;
   aoMudar: (metodologia: Metodologia) => void;
+  /** a opção escolhida como padrão nas preferências: o que "Restaurar" restaura (§17.3) */
+  opcaoPadrao?: OpcaoDeMetodologia;
   /** prefixo dos ids dos campos, para dois editores não colidirem */
   prefixoDosIds?: string;
 }) {
@@ -142,7 +146,7 @@ export function EditorDePeriodos({
           <button
             type="button"
             className="botao discreto"
-            onClick={() => aoMudar(restaurarPadrao())}
+            onClick={() => aoMudar(restaurarPadrao(opcaoPadrao))}
           >
             Restaurar a metodologia padrão
           </button>
diff --git a/src/ui/secoes/Encargos.tsx b/src/ui/secoes/Encargos.tsx
index 633353b..3ab6510 100644
--- a/src/ui/secoes/Encargos.tsx
+++ b/src/ui/secoes/Encargos.tsx
@@ -1,12 +1,14 @@
 import type { Calculo } from "../../compartilhado/tipos.ts";
+import type { OpcaoDeMetodologia } from "../../metodologias/padrao.ts";
 import { Ajuda } from "../componentes/Ajuda.tsx";
-import { CampoArea, CampoTexto, useCampoValidado } from "../componentes/Campo.tsx";
+import { CampoArea, CampoTexto, Opcao, useCampoValidado } from "../componentes/Campo.tsx";
 import { DATA_MAXIMA, formatarNumeroParaCampo, lerData, lerPercentual } from "../entrada.ts";
-import { resumirMetodologia } from "../estado/metodologia.ts";
+import { opcaoDaMetodologia, resumirMetodologia } from "../estado/metodologia.ts";
 
 /**
- * Seção "5 · Encargos e data do cálculo" (§9.2; explicações nos balões ⓘ): metodologia com
- * resumo em uma frase e "Ajustar" (abre o editor de períodos), multa e honorários do art. 523,
+ * Seção "5 · Encargos e data do cálculo" (§9.2; explicações nos balões ⓘ): metodologia escolhida
+ * entre as duas opções pré-carregadas (§17.3; ajustada, nenhuma fica marcada e o resumo em uma
+ * frase aparece) e "Ajustar" (abre o editor de períodos), multa e honorários do art. 523,
  * §1º, do CPC (10% cada por padrão, decisão de 13/10/2026), data de elaboração e observações para
  * o relatório.
  */
@@ -16,12 +18,15 @@ export function Encargos({
   aoMudarDataElaboracao,
   aoMudarObservacoes,
   aoAjustar,
+  aoEscolherMetodologia,
 }: {
   calculo: Calculo;
   aoMudarAcrescimo: (campo: "multaPercentual" | "honorariosPercentual", valor: string) => void;
   aoMudarDataElaboracao: (data: string) => void;
   aoMudarObservacoes: (texto: string) => void;
   aoAjustar: () => void;
+  /** aplica a opção ao cálculo e a guarda como padrão dos cálculos novos (§17.3) */
+  aoEscolherMetodologia: (opcao: OpcaoDeMetodologia) => void;
 }) {
   const multa = useCampoValidado({
     valorGuardado: calculo.acrescimos.multaPercentual,
@@ -41,34 +46,58 @@ export function Encargos({
     ler: lerData,
     aoValidar: aoMudarDataElaboracao,
   });
-  const ajustada = calculo.metodologia.ajustada;
+  const opcao = opcaoDaMetodologia(calculo.metodologia);
   return (
     <section className="secao" aria-labelledby="titulo-encargos">
       <div className="titulo-secao">
         <h2 id="titulo-encargos">5 · Encargos e data do cálculo</h2>
       </div>
-      <div className="linha">
-        <div className="campo largo">
+      <fieldset className="grupo metodologia-de-encargos">
+        <legend>
           <span className="rotulo-do-campo">
-            <span className="rotulo-estatico" id="rotulo-metodologia">
-              Metodologia de encargos{ajustada ? " (ajustada)" : " (padrão)"}
+            <span className="rotulo-estatico">
+              Metodologia de encargos{opcao === null ? " (ajustada)" : ""}
             </span>
             <Ajuda assunto="Metodologia de encargos">
               Correção pelo índice de cada período, proporcional aos dias restantes do mês do
-              vencimento ou do pagamento (pro rata); juros simples sobre o valor corrigido; a
-              transição de 30/08/2024 (Lei 14.905/2024) já vem pronta. Em "Ajustar" dá para dividir
-              períodos, trocar índices e taxas e escolher SELIC única, incidência no mês inicial e
-              tratamento de índices negativos.
+              vencimento ou do pagamento (pro rata); juros simples sobre o valor corrigido. A opção
+              escolhida vale para este cálculo e para os próximos (fica guardada neste navegador).
+              Em "Ajustar" dá para dividir períodos, trocar índices e taxas e escolher SELIC única,
+              incidência no mês inicial e tratamento de índices negativos.
             </Ajuda>
           </span>
-          <p className="resumo-metodologia" aria-labelledby="rotulo-metodologia">
-            {resumirMetodologia(calculo.metodologia)}
-          </p>
+        </legend>
+        <Opcao
+          tipo="radio"
+          nome="metodologia"
+          rotulo="Até 29/08/2024: IGP-M e juros de 1% ao mês. Desde 30/08/2024: IPCA e taxa legal."
+          marcado={opcao === "lei14905"}
+          aoMudar={() => aoEscolherMetodologia("lei14905")}
+        />
+        <span className="opcao-com-ajuda">
+          <Opcao
+            tipo="radio"
+            nome="metodologia"
+            rotulo="IGP-M e juros de 1% ao mês em todo o período."
+            marcado={opcao === "igpmJuros1"}
+            aoMudar={() => aoEscolherMetodologia("igpmJuros1")}
+          />
+          <Ajuda assunto="IGP-M e juros de 1% ao mês em todo o período">
+            IGP-M e juros de 1% ao mês do vencimento até a data do cálculo, sem a mudança de
+            30/08/2024. Use quando a decisão ou o acordo fixou esses critérios, ou quando o juízo
+            mantém o critério anterior à Lei 14.905/2024. Sem isso, a regra legal desde 30/08/2024 é
+            IPCA e taxa legal (arts. 389 e 406 do CC).
+          </Ajuda>
+        </span>
+        {opcao === null ? (
+          <p className="resumo-metodologia">Ajustada: {resumirMetodologia(calculo.metodologia)}</p>
+        ) : null}
+        <div className="linha">
+          <button type="button" className="botao secundario" onClick={aoAjustar}>
+            Ajustar
+          </button>
         </div>
-        <button type="button" className="botao secundario" onClick={aoAjustar}>
-          Ajustar
-        </button>
-      </div>
+      </fieldset>
       <div className="linha">
         <CampoTexto
           id="multa"
diff --git a/src/ui/tabelas/Personalizar.tsx b/src/ui/tabelas/Personalizar.tsx
index 569c075..8f1591d 100644
--- a/src/ui/tabelas/Personalizar.tsx
+++ b/src/ui/tabelas/Personalizar.tsx
@@ -7,6 +7,7 @@ import type {
   Lancamento,
   Metodologia,
 } from "../../compartilhado/tipos.ts";
+import type { OpcaoDeMetodologia } from "../../metodologias/padrao.ts";
 import { periodoDaData } from "../../motor/base.ts";
 import { Ajuda } from "../componentes/Ajuda.tsx";
 import { CampoTexto, Opcao } from "../componentes/Campo.tsx";
@@ -46,12 +47,15 @@ function lerOpcional<T>(texto: string, ler: (t: string) => Leitura<T>): Leitura<
 export function Personalizar({
   lancamento,
   calculo,
+  opcaoPadrao,
   aoEditar,
   aoAplicarRendimento,
   aoFechar,
 }: {
   lancamento: Lancamento;
   calculo: Calculo;
+  /** a opção de metodologia escolhida como padrão: o "Restaurar" das regras próprias (§17.3) */
+  opcaoPadrao?: OpcaoDeMetodologia;
   aoEditar: (id: string, mudancas: MudancasDoLancamento) => void;
   aoAplicarRendimento: (id: string, rendimento: string) => void;
   aoFechar: () => void;
@@ -253,6 +257,7 @@ export function Personalizar({
           metodologia={metodologiaPropria}
           aoMudar={setMetodologiaPropria}
           prefixoDosIds="proprio"
+          opcaoPadrao={opcaoPadrao}
         />
       ) : null}
       <div className="dialogo-acoes">
````

- [ ] **Step 4: Formatar, verificar e conferir a contagem**

Run: `npm run format && npm run verificar`
Expected: tudo verde; `Tests  851 passed | 10 skipped (861)`, `Test Files  45 passed (45)`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "ui: escolha da metodologia padrão de encargos na seção 5, guardada nas preferências

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 7: Etiquetas das linhas numa linha só, com "+N" e balão; a descrição encolhe até caber

§17.4 (D10, D11, T6). As etiquetas saem para um módulo puro; o balão `Ajuda` ganha conteúdo e nome configuráveis e o modo flutuante; a célula do vencimento vira uma linha flexível em que a descrição e a etiqueta formam um botão só; o CSS impede a quebra e dá à descrição só o espaço que sobra.

**Files:**
- Create: `src/ui/tabelas/etiquetas.ts` (`Etiqueta`, `etiquetasDaLinha`, `nomeDaSituacao`)
- Modify: `src/ui/componentes/Ajuda.tsx` (props `nome`, `conteudoDoBotao`, `classe`, `flutuante`; posição fixa calculada no clique, embaixo ou, se não couber, em cima do botão; fecha ao rolar)
- Modify: `src/ui/tabelas/TabelaLancamentos.tsx` (célula do vencimento em `div.celula-vencimento`; botão da situação; classe `com-descricao` na tabela)
- Modify: `src/ui/estilos.css` (célula do vencimento, botão `.situacao`, descrição com `contain: inline-size`, `table.com-descricao`, balão flutuante, regras do celular)
- Test: `src/ui/tabelas/etiquetas.test.ts` (novo), `src/ui/componentes/Ajuda.test.tsx` (dois testes), `src/ui/tabelas/Tabelas.test.tsx` (função `situacao`; três testes revistos e dois novos), `src/ui/tabelas/Personalizar.test.tsx` (a etiqueta pelo nome do botão)

**Interfaces:**
- Produces (em `src/ui/tabelas/etiquetas.ts`): `interface Etiqueta { texto: string; explicacao: string }`; `etiquetasDaLinha(lancamento, calculado): Etiqueta[]` (na ordem de importância); `nomeDaSituacao(lancamento, etiquetas): string` ("Situação da prestação de dd/mm/aaaa: …"; sem etiquetas, "Descrição da prestação de dd/mm/aaaa: <descrição>").
- Produces (em `src/ui/componentes/Ajuda.tsx`): `Ajuda({ assunto, children, nome?, conteudoDoBotao? = "ⓘ", classe? = "botao-ajuda", flutuante? = false })`; com `flutuante`, o balão leva a classe `balao flutuante` e as variáveis CSS `--balao-topo` e `--balao-esquerda` (pixels, a partir do retângulo do botão; medido o balão antes de pintar a tela, ele sobe para cima do botão quando não cabe embaixo e cabe em cima), e qualquer rolagem fecha o balão.

- [ ] **Step 1: Aplicar o patch dos testes**

````diff
diff --git a/src/ui/componentes/Ajuda.test.tsx b/src/ui/componentes/Ajuda.test.tsx
index 1997f52..8a065fa 100644
--- a/src/ui/componentes/Ajuda.test.tsx
+++ b/src/ui/componentes/Ajuda.test.tsx
@@ -1,7 +1,7 @@
 // @vitest-environment jsdom
-import { cleanup, render, screen } from "@testing-library/react";
+import { cleanup, fireEvent, render, screen } from "@testing-library/react";
 import userEvent from "@testing-library/user-event";
-import { afterEach, describe, expect, it } from "vitest";
+import { afterEach, describe, expect, it, vi } from "vitest";
 import { Ajuda } from "./Ajuda.tsx";
 
 afterEach(cleanup);
@@ -49,4 +49,55 @@ describe("Ajuda (toggletip: ajuda sob demanda)", () => {
     expect(document.activeElement).toBe(screen.getByRole("button", { name: "Outro botão" }));
     expect(screen.queryByText("Texto da ajuda.")).toBeNull();
   });
+
+  it("com outro conteúdo no botão e outro nome (as etiquetas da tabela, §17.4), e flutuante: fecha ao rolar a página", async () => {
+    const user = userEvent.setup();
+    render(
+      <Ajuda
+        assunto="situação"
+        nome="Situação da prestação de 05/09/2026: vincenda, ajustada"
+        conteudoDoBotao={<>vincenda +1</>}
+        classe="etiqueta"
+        flutuante
+      >
+        Tudo sobre a linha.
+      </Ajuda>,
+    );
+    const botao = screen.getByRole("button", {
+      name: "Situação da prestação de 05/09/2026: vincenda, ajustada",
+    });
+    expect(botao.textContent).toBe("vincenda +1");
+    expect(botao.className).toBe("etiqueta");
+    await user.click(botao);
+    const balao = screen.getByText("Tudo sobre a linha.");
+    expect(balao.className).toBe("balao flutuante");
+    // posição fixa, junto do botão, para não ficar presa na rolagem da tabela
+    expect(balao.style.getPropertyValue("--balao-topo")).toMatch(/px$/);
+    fireEvent.scroll(window);
+    expect(screen.queryByText("Tudo sobre a linha.")).toBeNull();
+  });
+
+  it("flutuante perto do pé da janela: o balão abre para cima do botão, em vez de sair da tela", async () => {
+    const user = userEvent.setup();
+    // botão de 700 a 720 px numa janela de 768 px; o balão tem 120 px de altura
+    const medidas = vi
+      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
+      .mockImplementation(function (this: HTMLElement) {
+        const caixa = this.classList.contains("balao")
+          ? { top: 0, bottom: 120, left: 0, right: 300, height: 120, width: 300 }
+          : { top: 700, bottom: 720, left: 100, right: 160, height: 20, width: 60 };
+        return { ...caixa, x: caixa.left, y: caixa.top, toJSON: () => caixa } as DOMRect;
+      });
+    render(
+      <Ajuda assunto="pé" nome="Situação no pé" conteudoDoBotao="vincenda" flutuante>
+        Tudo sobre a linha.
+      </Ajuda>,
+    );
+    await user.click(screen.getByRole("button", { name: "Situação no pé" }));
+    const balao = screen.getByText("Tudo sobre a linha.");
+    expect(window.innerHeight).toBe(768);
+    // 700 (topo do botão) − 6 − 120 (altura do balão) = 574
+    expect(balao.style.getPropertyValue("--balao-topo")).toBe("574px");
+    medidas.mockRestore();
+  });
 });
diff --git a/src/ui/tabelas/Personalizar.test.tsx b/src/ui/tabelas/Personalizar.test.tsx
index cd6bc6a..850bc59 100644
--- a/src/ui/tabelas/Personalizar.test.tsx
+++ b/src/ui/tabelas/Personalizar.test.tsx
@@ -42,8 +42,12 @@ describe("Personalizar, o lápis da linha (§9.3)", () => {
       .getAllByRole("cell")
       .map((c) => c.textContent);
     expect(celulas[1]).toBe("R$ 1.200,00");
-    expect(celulas[0]).toContain("valor informado");
-    expect(celulas[0]).toContain("ajustada");
+    expect(celulas[0]).toContain("valor informado +1");
+    expect(
+      within(linha).getByRole("button", {
+        name: "Situação da prestação de 05/09/2026: valor informado, ajustada",
+      }),
+    ).toBeDefined();
     expect(screen.getByRole("region", { name: "Avisos" }).textContent).toContain(
       "Prestações com valor informado à mão, não apurado pela base dos alimentos: set/2026.",
     );
diff --git a/src/ui/tabelas/Tabelas.test.tsx b/src/ui/tabelas/Tabelas.test.tsx
index 890aa8b..e7c8d62 100644
--- a/src/ui/tabelas/Tabelas.test.tsx
+++ b/src/ui/tabelas/Tabelas.test.tsx
@@ -9,6 +9,7 @@ import { calcular } from "../../motor/calcular.ts";
 import { gerarLoteAmortizacoes, gerarLotePrestacoes } from "../../motor/lote.ts";
 import App from "../App.tsx";
 import { novoCalculo } from "../estado/calculo.ts";
+import { TabelaLancamentos } from "./TabelaLancamentos.tsx";
 import { ambienteDeTeste, AGORA_DE_TESTE, HOJE_DE_TESTE } from "../testes/ambiente-de-teste.ts";
 
 afterEach(cleanup);
@@ -57,6 +58,13 @@ async function montarCaso(user: ReturnType<typeof userEvent.setup>) {
   await user.click(prestacoes.getByRole("button", { name: "Lançar em lote" }));
 }
 
+/** O nome do botão das etiquetas da linha ("Situação da prestação de …: …"; §17.4). */
+function situacao(linha: HTMLElement): string | null {
+  return within(linha)
+    .getByRole("button", { name: /^Situação / })
+    .getAttribute("aria-label");
+}
+
 describe("lado direito: indicadores, tabelas e memória (§9.3)", () => {
   it("mostra as prestações do lote com os valores do motor, os totais e os cinco indicadores", async () => {
     const user = userEvent.setup();
@@ -290,8 +298,11 @@ describe("lado direito: indicadores, tabelas e memória (§9.3)", () => {
     await user.clear(screen.getByLabelText("Valor da prestação de 05/09/2026"));
     await user.type(screen.getByLabelText("Valor da prestação de 05/09/2026"), "1.200,00{Enter}");
     expect(within(primeira()).getAllByRole("cell")[1]?.textContent).toBe("R$ 1.200,00");
-    expect(primeira().textContent).toContain("valor informado");
-    expect(primeira().textContent).toContain("ajustada");
+    // uma etiqueta só na linha, a mais importante, e "+N"; todas no nome do botão (§17.4)
+    expect(primeira().textContent).toContain("valor informado +1");
+    expect(situacao(primeira())).toBe(
+      "Situação da prestação de 05/09/2026: valor informado, ajustada",
+    );
     // texto inválido fica no campo, em vermelho, e não é gravado; Esc desiste
     await user.click(
       screen.getByRole("button", { name: "Editar valor da prestação de 05/09/2026 (R$ 1.200,00)" }),
@@ -506,8 +517,12 @@ describe("lado direito: indicadores, tabelas e memória (§9.3)", () => {
     const setembro = screen
       .getByRole("button", { name: "Memória da prestação de 05/09/2026" })
       .closest("tr") as HTMLElement;
-    expect(within(setembro).getByText("não computada").getAttribute("title")).toBe(
-      "Fora dos totais: abra a memória da linha (▸) para ver o motivo.",
+    const etiqueta = within(setembro).getByRole("button", {
+      name: "Situação da prestação de 05/09/2026: não computada",
+    });
+    await user.click(etiqueta);
+    expect(etiqueta.nextElementSibling?.textContent).toBe(
+      "não computada: Fora dos totais: abra a memória da linha (▸) para ver o motivo.",
     );
     await user.click(screen.getByRole("button", { name: "Memória da prestação de 05/09/2026" }));
     expect(
@@ -539,4 +554,89 @@ describe("lado direito: indicadores, tabelas e memória (§9.3)", () => {
       "igualam ou superam as prestações atualizadas",
     );
   });
+
+  it('etiquetas numa linha só: a mais importante e "+N"; o balão traz a descrição inteira e todas as etiquetas, com a explicação (§17.4)', async () => {
+    const user = userEvent.setup();
+    await montarCaso(user);
+    await user.click(screen.getByRole("button", { name: "Personalizar prestação de 05/10/2026" }));
+    const painel = within(screen.getByRole("dialog", { name: "Personalizar prestação" }));
+    fireEvent.change(painel.getByLabelText("Vencimento"), { target: { value: "2026-11-05" } });
+    await user.type(painel.getByLabelText("Valor informado à mão (opcional)"), "1.200,00");
+    const descricao = "13º salário 2026, pago em dobro conforme o acordo homologado";
+    await user.type(painel.getByLabelText("Descrição (opcional)"), descricao);
+    await user.click(painel.getByRole("button", { name: "Aplicar" }));
+    const linha = screen
+      .getByRole("button", { name: `Memória da prestação de 05/11/2026 (${descricao})` })
+      .closest("tr") as HTMLElement;
+    const celula = within(linha).getAllByRole("cell")[0] as HTMLElement;
+    const botao = within(celula).getByRole("button", {
+      name: "Situação da prestação de 05/11/2026: vincenda, valor informado, ajustada",
+    });
+    // o botão leva a descrição (que encolhe até caber, inteira no title) e a etiqueta mais
+    // importante, com "+N" (decisão de 13/10/2026)
+    expect(within(botao).getByText("vincenda +2").className).toBe("etiqueta");
+    expect(within(botao).getByText(descricao).getAttribute("title")).toBe(descricao);
+    expect(celula.textContent).not.toContain("ajustada");
+    await user.click(botao);
+    // o balão (a região de status ao lado do botão)
+    const balao = botao.nextElementSibling?.textContent ?? "";
+    for (const trecho of [
+      descricao,
+      "vincenda: Vence depois da data de elaboração",
+      "valor informado: Valor digitado à mão",
+      "ajustada: Alterada depois de lançada",
+    ]) {
+      expect(balao).toContain(trecho);
+    }
+    await user.keyboard("{Escape}");
+    expect(screen.queryByText(/Vence depois da data de elaboração/)).toBeNull();
+    // linha sem etiqueta e sem descrição não tem o botão
+    const setembro = screen
+      .getByRole("button", { name: "Memória da prestação de 05/09/2026" })
+      .closest("tr") as HTMLElement;
+    expect(within(setembro).queryByRole("button", { name: /^(Situação|Descrição) / })).toBeNull();
+  });
+
+  it("linha só com descrição, sem etiqueta: a descrição é o botão e abre o balão com ela inteira (decisão de 13/10/2026)", async () => {
+    const user = userEvent.setup();
+    const calculo = novoCalculo({ id: "x", agora: AGORA_DE_TESTE, hoje: HOJE_DE_TESTE });
+    calculo.base = baseUnica({
+      tipo: "valorFixo",
+      valor: "1000.00",
+      dataFixacao: "2026-01-10",
+      indiceReajuste: "nenhum",
+      mesReajuste: 1,
+    });
+    const descricao = "Férias de 2026, conforme o acordo homologado";
+    calculo.lancamentos = [
+      {
+        id: "p-2026-07",
+        tipo: "prestacao",
+        data: "2026-07-20",
+        competencia: "2026-07",
+        descricao,
+        origem: "lote",
+        editado: false,
+      },
+    ];
+    const resultado = calcular(calculo, ambienteDeTeste().congelar().tabela);
+    render(
+      <TabelaLancamentos
+        tipo="prestacao"
+        linhas={[{ lancamento: calculo.lancamentos[0]!, calculado: resultado.lancamentos[0]! }]}
+        aoPersonalizar={vi.fn()}
+        aoExcluir={vi.fn()}
+        aoEditar={vi.fn()}
+        aoSugerir={vi.fn()}
+        valorDaBase={() => ""}
+        aoIncluir={vi.fn()}
+      />,
+    );
+    const botao = screen.getByRole("button", {
+      name: `Descrição da prestação de 20/07/2026: ${descricao}`,
+    });
+    expect(botao.textContent).toBe(descricao);
+    await user.click(botao);
+    expect(botao.nextElementSibling?.textContent).toBe(descricao);
+  });
 });
diff --git a/src/ui/tabelas/etiquetas.test.ts b/src/ui/tabelas/etiquetas.test.ts
new file mode 100644
index 0000000..cfdd976
--- /dev/null
+++ b/src/ui/tabelas/etiquetas.test.ts
@@ -0,0 +1,86 @@
+import { describe, expect, it } from "vitest";
+import type { Lancamento, LancamentoCalculado } from "../../compartilhado/tipos.ts";
+import { etiquetasDaLinha, nomeDaSituacao } from "./etiquetas.ts";
+
+const lancamento = (extra: Partial<Lancamento> = {}): Lancamento => ({
+  id: "p",
+  tipo: "prestacao",
+  data: "2026-09-05",
+  origem: "lote",
+  editado: false,
+  ...extra,
+});
+
+const calculado = (extra: Partial<LancamentoCalculado> = {}) =>
+  ({ situacao: "atualizado", editado: false, ...extra }) as LancamentoCalculado;
+
+describe("etiquetas da linha (§17.4)", () => {
+  it("sem nada a marcar, nenhuma etiqueta", () => {
+    expect(etiquetasDaLinha(lancamento(), calculado())).toEqual([]);
+  });
+
+  it("em ordem de importância: não computada, vincenda, valor informado, ajustada", () => {
+    const todas = etiquetasDaLinha(
+      lancamento({ editado: true }),
+      calculado({ situacao: "vincenda", editado: true }),
+    );
+    expect(todas.map((e) => e.texto)).toEqual(["vincenda", "valor informado", "ajustada"]);
+    expect(
+      etiquetasDaLinha(
+        lancamento({ editado: true }),
+        calculado({ situacao: "ignorado", editado: true }),
+      ).map((e) => e.texto),
+    ).toEqual(["não computada", "valor informado", "ajustada"]);
+  });
+
+  it("no pagamento, no masculino; cada etiqueta com a sua explicação", () => {
+    const pagamento = etiquetasDaLinha(
+      lancamento({ tipo: "amortizacao", editado: true }),
+      calculado({ situacao: "ignorado" }),
+    );
+    expect(pagamento).toEqual([
+      {
+        texto: "não computado",
+        explicacao: "Fora dos totais: abra a memória da linha (▸) para ver o motivo.",
+      },
+      {
+        texto: "ajustado",
+        explicacao:
+          "Alterado depois de lançado (data, valor, descrição, rendimento, termos ou regras próprias).",
+      },
+    ]);
+    expect(
+      etiquetasDaLinha(lancamento(), calculado({ situacao: "vincenda", editado: true })),
+    ).toEqual([
+      {
+        texto: "vincenda",
+        explicacao:
+          "Vence depois da data de elaboração: entra pelo valor nominal, sem correção e sem juros.",
+      },
+      {
+        texto: "valor informado",
+        explicacao:
+          "Valor digitado à mão, não apurado pela base dos alimentos; apagado, volta à base.",
+      },
+    ]);
+  });
+
+  it("o nome do botão diz o que ele contém: as etiquetas ou, sem elas, a descrição", () => {
+    const etiquetas = etiquetasDaLinha(
+      lancamento({ editado: true, descricao: "13º salário 2026" }),
+      calculado({ situacao: "vincenda", editado: true }),
+    );
+    expect(nomeDaSituacao(lancamento({ descricao: "13º salário 2026" }), etiquetas)).toBe(
+      "Situação da prestação de 05/09/2026: vincenda, valor informado, ajustada",
+    );
+    expect(
+      nomeDaSituacao(lancamento({ tipo: "amortizacao" }), [
+        { texto: "não computado", explicacao: "" },
+      ]),
+    ).toBe("Situação do pagamento de 05/09/2026: não computado");
+    // linha só com descrição (decisão de 13/10/2026): o botão é a própria descrição
+    expect(nomeDaSituacao(lancamento({ descricao: " 13º salário 2026 " }), [])).toBe(
+      "Descrição da prestação de 05/09/2026: 13º salário 2026",
+    );
+  });
+});
````

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run`
Expected: `Tests  7 failed | 848 passed | 10 skipped (865)` (arquivos: `4 failed | 42 passed (46)`). Falham:
  - `src/ui/componentes/Ajuda.test.tsx`: "com outro conteúdo no botão e outro nome (as etiquetas da tabela, §17.4), e flutuante: fecha ao rolar a página"; "flutuante perto do pé da janela: o balão abre para cima do botão, em vez de sair da tela";
  - `src/ui/tabelas/Personalizar.test.tsx`: "o lápis abre o painel com os dados da prestação; valor informado à mão marca a linha e muda o cálculo";
  - `src/ui/tabelas/Tabelas.test.tsx`: "base incompleta: o aviso diz o que falta e onde, e o campo fica em vermelho até ser preenchido (decisão de 13/10/2026)"; "etiquetas numa linha só: a mais importante e "+N"; o balão traz a descrição inteira e todas as etiquetas, com a explicação (§17.4)"; "linha só com descrição, sem etiqueta: a descrição é o botão e abre o balão com ela inteira (decisão de 13/10/2026)"; "vencimento e valor se corrigem na própria célula: Enter ou sair grava, Esc desiste, inválido não grava (decisão de 13/10/2026)";
  - `src/ui/tabelas/etiquetas.test.ts` inteiro (não carrega: importa o que ainda não existe).
  Motivo: o módulo `etiquetas.ts` ainda não existe, a linha ainda mostra todas as etiquetas, sem botão, e o `Ajuda` ainda não tem as props novas nem o modo flutuante. Nenhum outro arquivo pode falhar.

- [ ] **Step 3: Aplicar o patch do código**

````diff
diff --git a/src/ui/componentes/Ajuda.tsx b/src/ui/componentes/Ajuda.tsx
index 31d994c..181621c 100644
--- a/src/ui/componentes/Ajuda.tsx
+++ b/src/ui/componentes/Ajuda.tsx
@@ -1,4 +1,12 @@
-import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
+import {
+  useEffect,
+  useLayoutEffect,
+  useRef,
+  useState,
+  type CSSProperties,
+  type KeyboardEvent,
+  type ReactNode,
+} from "react";
 
 /**
  * Ajuda sob demanda (decisão de 13/10/2026, no lugar dos textos sempre visíveis da §9.4): o
@@ -6,24 +14,77 @@ import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from
  * um balão curto com clique, toque, Enter ou Espaço; Esc, um novo clique ou qualquer clique ou
  * foco fora o fecham. O conteúdo entra numa região `role="status"`, para o leitor de tela ler o
  * balão quando ele abre. Funciona sem mouse (o balão que só aparece ao passar o mouse não serve
- * no celular nem para quem usa teclado).
+ * no celular nem para quem usa teclado). O botão pode mostrar outro conteúdo no lugar do ⓘ e ter
+ * outro nome (as etiquetas da tabela, §17.4), e o balão pode flutuar em posição fixa, para não
+ * ficar preso na rolagem da tabela.
  */
-export function Ajuda({ assunto, children }: { assunto: string; children: ReactNode }) {
+export function Ajuda({
+  assunto,
+  children,
+  nome,
+  conteudoDoBotao = "ⓘ",
+  classe = "botao-ajuda",
+  flutuante = false,
+}: {
+  assunto: string;
+  children: ReactNode;
+  /** nome do botão para o leitor de tela; padrão: "Ajuda: <assunto>" */
+  nome?: string;
+  /** o que o botão mostra; padrão: ⓘ (as etiquetas da tabela mostram a etiqueta, §17.4) */
+  conteudoDoBotao?: ReactNode;
+  classe?: string;
+  /**
+   * balão em posição fixa, junto do botão (embaixo ou, se não couber, em cima), para não ficar
+   * preso numa área com rolagem própria (a tabela); fecha ao rolar a página
+   */
+  flutuante?: boolean;
+}) {
   const [aberta, setAberta] = useState(false);
+  // posição do balão flutuante: abaixo do botão ou, se não couber, acima dele
+  const [posicao, setPosicao] = useState<{
+    topo: number;
+    acima: number;
+    esquerda: number;
+  } | null>(null);
   const raiz = useRef<HTMLSpanElement>(null);
+  const botao = useRef<HTMLButtonElement>(null);
+  const balao = useRef<HTMLSpanElement>(null);
+  // medido o balão (antes de a tela ser pintada), ele sobe para cima do botão quando não cabe
+  // embaixo e cabe em cima
+  useLayoutEffect(() => {
+    if (!aberta || posicao === null || balao.current === null) return;
+    const altura = balao.current.getBoundingClientRect().height;
+    const naoCabeEmbaixo = posicao.topo + altura > window.innerHeight - 8;
+    const cabeEmCima = posicao.acima - altura >= 8;
+    if (naoCabeEmbaixo && cabeEmCima && posicao.topo !== posicao.acima - altura) {
+      setPosicao({ ...posicao, topo: posicao.acima - altura });
+    }
+  }, [aberta, posicao]);
   useEffect(() => {
     if (!aberta) return;
     const fora = (evento: Event) => {
       if (evento.target instanceof Node && raiz.current?.contains(evento.target)) return;
       setAberta(false);
     };
+    const rolou = () => setAberta(false);
     document.addEventListener("pointerdown", fora, true);
     document.addEventListener("focusin", fora);
+    if (flutuante) window.addEventListener("scroll", rolou, true);
     return () => {
       document.removeEventListener("pointerdown", fora, true);
       document.removeEventListener("focusin", fora);
+      window.removeEventListener("scroll", rolou, true);
     };
-  }, [aberta]);
+  }, [aberta, flutuante]);
+  const alternar = () => {
+    if (!aberta && flutuante && botao.current !== null) {
+      const caixa = botao.current.getBoundingClientRect();
+      // 356 = largura máxima do balão (340) + margem de 16 px até a borda da janela
+      const esquerda = Math.max(16, Math.min(caixa.left - 10, window.innerWidth - 356));
+      setPosicao({ topo: caixa.bottom + 6, acima: caixa.top - 6, esquerda });
+    }
+    setAberta(!aberta);
+  };
   const tecla = (evento: KeyboardEvent<HTMLSpanElement>) => {
     if (evento.key === "Escape" && aberta) {
       // não fecha o painel em volta (Dialogo), só o balão
@@ -34,15 +95,35 @@ export function Ajuda({ assunto, children }: { assunto: string; children: ReactN
   return (
     <span className="ajuda-balao" ref={raiz} onKeyDown={tecla}>
       <button
+        ref={botao}
         type="button"
-        className="botao-ajuda"
+        className={classe}
         aria-expanded={aberta}
-        aria-label={`Ajuda: ${assunto}`}
-        onClick={() => setAberta(!aberta)}
+        aria-label={nome ?? `Ajuda: ${assunto}`}
+        onClick={alternar}
       >
-        ⓘ
+        {conteudoDoBotao}
       </button>
-      <span role="status">{aberta ? <span className="balao">{children}</span> : null}</span>
+      <span role="status">
+        {aberta ? (
+          flutuante && posicao !== null ? (
+            <span
+              ref={balao}
+              className="balao flutuante"
+              style={
+                {
+                  "--balao-topo": `${posicao.topo}px`,
+                  "--balao-esquerda": `${posicao.esquerda}px`,
+                } as CSSProperties
+              }
+            >
+              {children}
+            </span>
+          ) : (
+            <span className="balao">{children}</span>
+          )
+        ) : null}
+      </span>
     </span>
   );
 }
diff --git a/src/ui/estilos.css b/src/ui/estilos.css
index c9416af..aa78d5d 100644
--- a/src/ui/estilos.css
+++ b/src/ui/estilos.css
@@ -729,15 +729,58 @@ td:first-child .celula-em-edicao .erro {
   font-size: 12px;
 }
 
-/* a primeira coluna quebra a linha: descrição e etiquetas descem para baixo do vencimento
-   quando falta espaço, sem empurrar os botões da linha para fora da tabela */
-tbody td:first-child {
-  white-space: normal;
-  min-width: 8.5em;
+/* a linha nunca quebra (§17.4): a descrição encolhe até caber, com reticências (inteira no
+   title e no balão), sem empurrar o lápis e o ✕ para fora da tabela; só a etiqueta mais
+   importante aparece, com "+N" (decisão de 13/10/2026) */
+.celula-vencimento {
+  display: flex;
+  align-items: center;
+  white-space: nowrap;
+}
+
+.celula-vencimento > * {
+  flex: none;
+}
+
+.celula-vencimento > .ajuda-balao {
+  flex: 1 1 auto;
+  min-width: 0;
+}
+
+.ajuda-balao > .situacao {
+  flex: 1 1 auto;
+}
+
+/* com descrição na tabela, a primeira coluna prefere 18em: a sobra vai para a descrição, e,
+   sem espaço, ela encolhe até o mínimo, sem a tabela passar da coluna */
+table.com-descricao tbody td:first-child {
+  width: 18em;
 }
 
-td .descricao {
+.situacao {
+  display: flex;
+  align-items: center;
+  min-width: 0;
+  max-width: 100%;
+  background: transparent;
+  border: 0;
+  padding: 0;
+  font: inherit;
+  color: inherit;
+  cursor: pointer;
+}
+
+/* contain: o tamanho do texto não conta na largura da coluna, e a descrição ocupa só o que
+   sobra (de 1,5 a 9 letras de largura) */
+.situacao > .descricao {
+  contain: inline-size;
+  flex: 1 1 9em;
+  min-width: 1.5em;
+  max-width: 9em;
   margin-left: 6px;
+  overflow: hidden;
+  text-overflow: ellipsis;
+  text-align: left;
   color: var(--discreto);
 }
 
@@ -755,12 +798,39 @@ td.dica {
   display: inline-block;
   border-radius: 3px;
   padding: 0 5px;
+  font-family: var(--corpo);
   font-size: 11px;
+  line-height: 1.5;
   margin: 1px 0 1px 4px;
   white-space: nowrap;
   background: var(--aviso-fundo);
   border: 1px solid var(--aviso-borda);
   color: var(--texto);
+  flex: none;
+}
+
+.situacao[aria-expanded="true"] > .etiqueta {
+  border-color: var(--verde);
+}
+
+/* balão das etiquetas: em posição fixa, junto do botão (não fica preso na rolagem da tabela) */
+.balao.flutuante {
+  position: fixed;
+  top: var(--balao-topo);
+  left: var(--balao-esquerda);
+  z-index: 20;
+  max-height: calc(100vh - 32px);
+  overflow-y: auto;
+}
+
+.balao-descricao,
+.balao-etiqueta {
+  display: block;
+}
+
+.balao-descricao {
+  margin-bottom: 4px;
+  color: var(--discreto);
 }
 
 .acoes-linha {
@@ -905,7 +975,8 @@ td.dica {
     grid-template-columns: minmax(0, 1fr);
   }
 
-  .balao {
+  .balao,
+  .balao.flutuante {
     position: fixed;
     top: auto;
     left: 16px;
@@ -924,6 +995,12 @@ td.dica {
     grid-template-columns: minmax(0, 1fr);
   }
 
+  /* empilhadas, a tabela tem a largura da tela (e rola sozinha no celular): a descrição mostra
+     o tamanho cheio (§17.4) */
+  .situacao > .descricao {
+    contain: none;
+  }
+
   .coluna-direita {
     display: contents;
   }
diff --git a/src/ui/tabelas/TabelaLancamentos.tsx b/src/ui/tabelas/TabelaLancamentos.tsx
index 24606d8..76395b3 100644
--- a/src/ui/tabelas/TabelaLancamentos.tsx
+++ b/src/ui/tabelas/TabelaLancamentos.tsx
@@ -36,6 +36,7 @@ import {
 import type { MudancasDoLancamento } from "../estado/calculo.ts";
 import type { RascunhoDeLancamento } from "../estado/novaLinha.ts";
 import { CelulaEditavel } from "./CelulaEditavel.tsx";
+import { etiquetasDaLinha, nomeDaSituacao } from "./etiquetas.ts";
 
 /**
  * Tabelas de prestações e de amortizações (§9.3), com as mesmas colunas: vencimento (ou data do
@@ -225,7 +226,13 @@ export function TabelaLancamentos({
         </Ajuda>
       </div>
       <div className="rolagem">
-        <table>
+        {/* com alguma descrição (13º, férias), a primeira coluna prefere ser mais larga, para a
+            descrição aparecer, sem empurrar o lápis e o ✕ para fora (§17.4) */}
+        <table
+          className={
+            linhas.some((l) => l.lancamento.descricao?.trim()) ? "com-descricao" : undefined
+          }
+        >
           <thead>
             <tr>
               <th scope="col">{prestacoes ? "Vencimento" : "Data"}</th>
@@ -448,35 +455,10 @@ function Linha({
   const feminino = lancamento.tipo === "prestacao";
   const nome = nomeDoLancamento(lancamento);
   const artigo = feminino ? "da" : "do";
-  // Etiquetas com a explicação no `title` (§9.4: nenhum rótulo sem explicação).
-  const etiquetas: Array<{ texto: string; explicacao: string }> = [];
-  if (calculado.situacao === "vincenda") {
-    etiquetas.push({
-      texto: "vincenda",
-      explicacao:
-        "Vence depois da data de elaboração: entra pelo valor nominal, sem correção e sem juros.",
-    });
-  }
-  if (calculado.situacao === "ignorado") {
-    etiquetas.push({
-      texto: feminino ? "não computada" : "não computado",
-      explicacao: "Fora dos totais: abra a memória da linha (▸) para ver o motivo.",
-    });
-  }
-  if (calculado.editado) {
-    etiquetas.push({
-      texto: "valor informado",
-      explicacao: feminino
-        ? "Valor digitado à mão, não apurado pela base dos alimentos; apagado, volta à base."
-        : "Valor digitado à mão.",
-    });
-  }
-  if (lancamento.editado) {
-    etiquetas.push({
-      texto: feminino ? "ajustada" : "ajustado",
-      explicacao: `${feminino ? "Alterada" : "Alterado"} depois de ${feminino ? "lançada" : "lançado"} (${feminino ? "vencimento" : "data"}, valor, descrição, rendimento, termos ou regras próprias).`,
-    });
-  }
+  // Etiquetas (§17.4): a linha mostra só a mais importante e "+N"; o balão, todas, com a
+  // explicação de cada uma (§9.4: nenhum rótulo sem explicação), e a descrição inteira.
+  const etiquetas = etiquetasDaLinha(lancamento, calculado);
+  const descricao = lancamento.descricao?.trim() ?? "";
   const moeda = (texto: string) => formatarMoeda(decimal(texto));
   // o campo do valor abre com o valor informado à mão ou, na prestação pela base, com o valor
   // apurado (gravá-lo sem mudar nada não o transforma em informado)
@@ -489,38 +471,64 @@ function Linha({
   return (
     <tr>
       <td className="texto">
-        <button
-          type="button"
-          className="botao-expandir"
-          aria-expanded={expandida}
-          aria-label={`Memória ${artigo} ${nome}`}
-          title="Memória do cálculo"
-          onClick={aoAlternar}
-        >
-          {expandida ? "▾" : "▸"}
-        </button>
-        <CelulaEditavel
-          nome={feminino ? `Vencimento da ${nome}` : `Data do ${nome}`}
-          exibido={formatarData(lancamento.data)}
-          textoInicial={formatarDataParaCampo(lancamento.data)}
-          inputMode="numeric"
-          placeholder="dd/mm/aaaa"
-          mascara={mascaraData}
-          aoGravar={(texto) => {
-            const data = lerDataTexto(texto);
-            if (!data.ok) return data.erro;
-            aoEditar({ data: data.valor });
-            return null;
-          }}
-        />
-        {lancamento.descricao?.trim() ? (
-          <span className="descricao">{lancamento.descricao.trim()}</span>
-        ) : null}
-        {etiquetas.map((etiqueta) => (
-          <span key={etiqueta.texto} className="etiqueta" title={etiqueta.explicacao}>
-            {etiqueta.texto}
-          </span>
-        ))}
+        <div className="celula-vencimento">
+          <button
+            type="button"
+            className="botao-expandir"
+            aria-expanded={expandida}
+            aria-label={`Memória ${artigo} ${nome}`}
+            title="Memória do cálculo"
+            onClick={aoAlternar}
+          >
+            {expandida ? "▾" : "▸"}
+          </button>
+          <CelulaEditavel
+            nome={feminino ? `Vencimento da ${nome}` : `Data do ${nome}`}
+            exibido={formatarData(lancamento.data)}
+            textoInicial={formatarDataParaCampo(lancamento.data)}
+            inputMode="numeric"
+            placeholder="dd/mm/aaaa"
+            mascara={mascaraData}
+            aoGravar={(texto) => {
+              const data = lerDataTexto(texto);
+              if (!data.ok) return data.erro;
+              aoEditar({ data: data.valor });
+              return null;
+            }}
+          />
+          {descricao !== "" || etiquetas.length > 0 ? (
+            // a descrição (que encolhe até caber) e a etiqueta mais importante, com "+N", formam um
+            // botão só, que abre o balão com a descrição inteira e todas as etiquetas (§17.4)
+            <Ajuda
+              assunto={`situação ${artigo} ${nome}`}
+              nome={nomeDaSituacao(lancamento, etiquetas)}
+              classe="situacao"
+              flutuante
+              conteudoDoBotao={
+                <>
+                  {descricao !== "" ? (
+                    <span className="descricao" title={descricao}>
+                      {descricao}
+                    </span>
+                  ) : null}
+                  {etiquetas.length > 0 ? (
+                    <span className="etiqueta">
+                      {etiquetas[0]?.texto}
+                      {etiquetas.length > 1 ? ` +${etiquetas.length - 1}` : ""}
+                    </span>
+                  ) : null}
+                </>
+              }
+            >
+              {descricao !== "" ? <span className="balao-descricao">{descricao}</span> : null}
+              {etiquetas.map((etiqueta) => (
+                <span key={etiqueta.texto} className="balao-etiqueta">
+                  <strong>{etiqueta.texto}</strong>: {etiqueta.explicacao}
+                </span>
+              ))}
+            </Ajuda>
+          ) : null}
+        </div>
       </td>
       <td>
         <CelulaEditavel
diff --git a/src/ui/tabelas/etiquetas.ts b/src/ui/tabelas/etiquetas.ts
new file mode 100644
index 0000000..b50813f
--- /dev/null
+++ b/src/ui/tabelas/etiquetas.ts
@@ -0,0 +1,61 @@
+import { formatarData } from "../../compartilhado/formatacao.ts";
+import type { Lancamento, LancamentoCalculado } from "../../compartilhado/tipos.ts";
+
+/**
+ * Etiquetas da linha das tabelas (§17.4, fase 5b): "não computada", "vincenda", "valor
+ * informado" e "ajustada" (no masculino nos pagamentos), em ordem de importância, cada uma com a
+ * sua explicação (§9.4: nenhum rótulo sem explicação). A linha mostra só a primeira e "+N", ao
+ * lado da descrição, que encolhe até caber; o balão mostra a descrição inteira e todas as
+ * etiquetas. Módulo puro.
+ */
+export interface Etiqueta {
+  texto: string;
+  explicacao: string;
+}
+
+export function etiquetasDaLinha(
+  lancamento: Lancamento,
+  calculado: LancamentoCalculado,
+): Etiqueta[] {
+  const feminino = lancamento.tipo === "prestacao";
+  const etiquetas: Etiqueta[] = [];
+  if (calculado.situacao === "ignorado") {
+    etiquetas.push({
+      texto: feminino ? "não computada" : "não computado",
+      explicacao: "Fora dos totais: abra a memória da linha (▸) para ver o motivo.",
+    });
+  }
+  if (calculado.situacao === "vincenda") {
+    etiquetas.push({
+      texto: "vincenda",
+      explicacao:
+        "Vence depois da data de elaboração: entra pelo valor nominal, sem correção e sem juros.",
+    });
+  }
+  if (calculado.editado) {
+    etiquetas.push({
+      texto: "valor informado",
+      explicacao: feminino
+        ? "Valor digitado à mão, não apurado pela base dos alimentos; apagado, volta à base."
+        : "Valor digitado à mão.",
+    });
+  }
+  if (lancamento.editado) {
+    etiquetas.push({
+      texto: feminino ? "ajustada" : "ajustado",
+      explicacao: `${feminino ? "Alterada" : "Alterado"} depois de ${feminino ? "lançada" : "lançado"} (${feminino ? "vencimento" : "data"}, valor, descrição, rendimento, termos ou regras próprias).`,
+    });
+  }
+  return etiquetas;
+}
+
+/**
+ * Nome do botão da linha: "Situação da prestação de 05/09/2026: vincenda, valor informado,
+ * ajustada"; sem etiquetas, o botão é a descrição: "Descrição da prestação de 05/09/2026: 13º
+ * salário 2026" (decisão de 13/10/2026).
+ */
+export function nomeDaSituacao(lancamento: Lancamento, etiquetas: Etiqueta[]): string {
+  const qual = `${lancamento.tipo === "prestacao" ? "da prestação" : "do pagamento"} de ${formatarData(lancamento.data)}`;
+  if (etiquetas.length === 0) return `Descrição ${qual}: ${lancamento.descricao?.trim() ?? ""}`;
+  return `Situação ${qual}: ${etiquetas.map((e) => e.texto).join(", ")}`;
+}
````

- [ ] **Step 4: Formatar, verificar e conferir a contagem**

Run: `npm run format && npm run verificar`
Expected: tudo verde; `Tests  859 passed | 10 skipped (869)`, `Test Files  46 passed (46)`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "ui: etiquetas das linhas numa linha só, com +N e balão; a descrição encolhe até caber

Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---


### Task 8: Conferência no navegador (duas colunas, celular, temas, teclado) e build

Sem código novo, salvo correção de CSS que a conferência exija (nesse caso, com a medida antes e depois, e commit próprio). Registre o que viu no relatório da tarefa.

- [ ] **Step 1:** `npm run dev` e abrir o app no navegador integrado (ou outro), em 1366 × 900.
- [ ] **Step 2 (base por períodos):** valor fixo R$ 500,00, "Fixado em" 10/03/2024; lote de prestações de 05/11/2024 a 05/02/2025; "Dividir em" 01/01/2025 → dois blocos ("Até 31/12/2024", "Desde 01/01/2025"); no segundo, "% do salário mínimo" → a caixa de avisos diz "Falta o percentual do salário mínimo no período desde 01/01/2025 …" e o campo fica em vermelho no segundo bloco; 30 → prestações de 2025 com R$ 455,40, as de 2024 com R$ 500,00; memória de 05/01/2025 com "Base desde 01/01/2025: 30% do salário mínimo de jan/2025 (R$ 1.518,00) = R$ 455,40" (sem "Base: Base"); "Remover divisão" volta a um bloco só, com valor fixo; "Dividir em" 01/01/1900 é recusado com "A data precisa ser posterior a 01/01/1900.".
- [ ] **Step 3 (etiquetas):** no lápis da última prestação, vencimento 05/11/2026, valor 1.200,00 e a descrição "13º salário 2026, pago em dobro conforme o acordo homologado" → a linha fica numa linha só, com o começo da descrição e "vincenda +2"; medir no console `document.querySelector('.tabela-rolagem > .rolagem')` (`clientWidth` igual a `scrollWidth`: a tabela não rola de lado) e a altura das linhas do `tbody` (todas iguais); clicar na descrição ou na etiqueta abre o balão flutuante com a descrição inteira e as três etiquetas explicadas; Enter abre, Esc fecha com o foco de volta no botão; com a janela baixa (1440 × 460) e a linha rolada até perto do pé, o balão abre para cima do botão, inteiro na tela.
- [ ] **Step 4 (metodologia):** seção 5 com as duas opções, cada uma numa linha, e o ⓘ ao lado da segunda; marcar a segunda → resumo das tabelas recalculado; "Novo cálculo" → a segunda continua marcada; "Ajustar" → mudar um índice → título "(ajustada)", nenhuma opção marcada e "Ajustada: …"; "Restaurar a metodologia padrão" → a segunda opção de volta.
- [ ] **Step 5 (celular e tema):** 375 × 812: página sem rolagem lateral (`document.documentElement.scrollWidth` igual a 375), blocos da base um embaixo do outro, descrição com o tamanho cheio dentro da tabela (que rola sozinha), balão como faixa no pé da tela; tema escuro (botão da barra) em 1366 px: blocos, etiqueta e balão legíveis.
- [ ] **Step 6:** `npm run build` gera `dist/` sem erro.

### Task 9: Fechamento da fase: roteiro, CLAUDE.md, design, plano e verificação final

**Files:**
- Modify: `docs/superpowers/roteiro.md` (linha da fase 5b: "concluída em AAAA-MM-DD · plano: `docs/superpowers/plans/2026-10-13-fase-5b-ajustes-da-interface.md`")
- Modify: `CLAUDE.md` (seção "Estado": a fase 5b concluída, em uma frase por ajuste, com a contagem final de testes; "Próxima: fase 6"; no mapa de pastas, `src/metodologias/` com `lei-14905-2024.v1.json · igpm-juros-1.v1.json · padrao.ts` e `src/ui/estado/` com `base.ts`; em "Como registrar um caso de referência", a base do `calculo` como lista de períodos)
- Modify: `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md` (§9.4, decisões da fase 5: onde diz "pagamento: data de hoje e o valor do anterior", acrescentar "(desde a fase 5b, o mês seguinte ao do último pagamento, §17.1)"; onde lista as etiquetas, acrescentar "(desde a fase 5b, uma só na linha, §17.4)")
- Modify: este plano (seção "Estado", com quem executou, como e as contagens medidas; pendências achadas na execução)

- [ ] **Step 1:** fazer as edições acima.
- [ ] **Step 2:** `npm run format && npm run verificar` → `Tests  859 passed | 10 skipped (869)`, `Test Files  46 passed (46)`.
- [ ] **Step 3:** commit "docs: fechamento da fase 5b (roteiro, CLAUDE.md, design e plano)".
- [ ] **Step 4:** não fazer merge na `main` (decisão do responsável).

---

## Estado

Plano escrito em 13/10/2026, a partir do ensaio e da reconstrução descritos em "Para o responsável". Executado no mesmo dia, por decisão do responsável, direto na sessão (superpowers:executing-plans, Claude Opus 5.5), na branch `claude/apura-interface-adjustments-5f4501`, a partir de `bf36ce8`. Em cada tarefa, o patch dos testes falhou exatamente como o passo previa e o do código deixou `npm run verificar` verde, com as contagens do plano: 1 → 810 passando e 9 pulados (819), 44 arquivos; 2 → 830 (840), 44; 3 → 844 (854), 45; 4 → 845 (855), 45; 5 → 848 (858), 45; 6 → 851 (861), 45; 7 → 859 (869), 46. A Task 8 (conferência no navegador integrado) confirmou tudo o que o passo pedia, sem ajuste de CSS; `npm run build` gerou `dist/`.

**Revisão final da branch** (agente independente, Claude Opus 5.5, antes desta Task 9): nenhum problema crítico; um importante e quatro menores. Corrigidos com teste (commit "motor, ui: correções da revisão final da fase 5b"): faltava o exemplo numérico da §17.3 no motor (teste novo em `calcular.test.ts`: R$ 1.000,00 de 10/01/2025 até 10/10/2026, pela segunda opção fator 1,022857, juros 21,032258% e R$ 1.237,99; pela primeira, fator 1,083283, taxa legal 15,779661% e R$ 1.254,22); o balão flutuante fechava quando se rolava dentro dele (subido a importante: a altura máxima com rolagem própria prometida não funcionava); e o motor lançava erro com uma base fora do formato, sem a lista de períodos (subido a importante: regra 4 do `CLAUDE.md`; agora as prestações ficam sem valor, com o aviso). Ao fim: 861 passando e 10 pulados (871), em 46 arquivos. Ficaram para depois dois menores: o limite de 1900 ainda escrito à mão (`min="1900-01-01"`) em `Base.tsx` e `Personalizar.tsx`, apesar de `DATA_MINIMA`; e um comentário de `src/ui/preferencias.ts` com mais de 100 colunas. Os pontos que o revisor deixou de julgar (nome acessível do botão das etiquetas sem o texto visível inteiro, fixado pela §17.4; troca da metodologia pelas setas do teclado sem confirmação, decidida na §17.3; metodologia dividida sem mudar regras aparecendo como ajustada; rendimento do lápis pelo período da data original da linha; "+ Pagamento" depois de dez/2199) ficaram como estão, por decisão do executor, registrada no ledger da execução.

## Notas para a fase 6

- O parágrafo "Base" do relatório descreve cada período da base (§17.2), e o de encargos descreve a metodologia aplicada, sem a frase da transição quando for "IGP-M e juros de 1% ao mês" (§17.3).
- Uma metodologia ajustada continua com o `id` e o `nome` da opção de onde partiu (por exemplo, "Lei 14.905/2024" com `ajustada: true`): o relatório não pode usar esse nome (regra 7 do `CLAUDE.md`); descreve as regras.
- A memória de cada linha com a base dividida começa por "Base até/de/desde …" (§17.2), o que já serve ao relatório.

## Auto-revisão do plano

- Cobertura da §17: 17.1 → Task 1; 17.2 → Tasks 2 (modelo, motor, arquivo, casos, faltas, linha nova, lápis), 3 (seção 2) e 4 (rendimento); 17.3 → Tasks 5 (metodologias, reconhecimento, arquivo) e 6 (preferência, seção 5, "Restaurar", "Esquecer"); 17.4 → Task 7; 17.5 → Task 9; conferência visual → Task 8.
- Nomes usados entre tarefas (conferidos no código do ensaio): `FormaDaBase`, `PeriodoDaBase`, `Base`, `baseUnica`, `periodosDaBaseOrdenados`, `periodoDaData`, `descreverPeriodoDaBase`, `apurarPelaBase` (Task 2, usados nas 3, 4 e 7); `FaltaDaBase.periodo` (Task 2, usado na 3); `dividirBase`, `removerDivisaoDaBase`, `trocarForma`, `tituloDoPeriodo` (Task 3), `aplicarRendimentoNaBase` (Task 4); `OpcaoDeMetodologia`, `OPCOES_DE_METODOLOGIA`, `metodologiaDaOpcao` (Task 5, usados na 6); `opcaoDaMetodologia`, `normalizar` (Task 5, usados na 6); `restaurarPadrao(opcao)` e a prop `opcaoPadrao` (Task 6); `etiquetasDaLinha`, `nomeDaSituacao` e as props `nome`, `conteudoDoBotao`, `classe`, `flutuante` de `Ajuda` (Task 7).
- Sem marcadores pendentes: todo passo de código é um patch aplicado e conferido na reconstrução.
- Provisório entre tarefas: a Task 2 liga a seção 2 ao único período no `App.tsx` (comentário "provisório (fase 5b, Task 2)"); a Task 3 troca essa ligação pela seção com períodos. A Task 2 deixa um comentário de `novoCalculo` com uma linha longa, que a Task 6 rearruma.
