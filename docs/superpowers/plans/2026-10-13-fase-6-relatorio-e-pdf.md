# Apura · Fase 6 · Relatório e PDF — plano de implementação

> **Para agentes executores:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa a tarefa. Os passos usam caixas de seleção (`- [ ]`) para acompanhamento.

**Objetivo:** o relatório do cálculo (demonstrativo discriminado e atualizado do crédito) na tela e em PDF pela impressão do navegador, na identidade visual da DPE-MS, com "Metodologia e fundamentos" gerado do que foi aplicado; e as pendências da fase 5 marcadas para esta fase (tela de erro de reserva, região viva, ajustes visuais).

**Arquitetura:** um módulo novo, `src/relatorio/`, lê só o `Calculo` e o `Resultado`: módulos puros montam os textos (`metodologia.ts`), as linhas, notas, totais, indicadores, cabeçalho e rodapé (`tabelas.ts`), a matriz de índices (`matriz.ts`) e a regra que desliga o botão (`bloqueio.ts`); o componente `Relatorio.tsx` só os desenha, com o CSS de tela e de impressão em `relatorio.css`. O motor passa a devolver os reajustes do valor fixo de forma estruturada (`reajustes` em cada prestação), sem mudar nenhum número. Na tela, "Relatório / PDF" troca as duas colunas pelo relatório (que continuam montadas, escondidas), a impressão entra pelo `Ambiente`, e uma reserva (`Reserva.tsx`, `TelaDeErro.tsx`) impede que um defeito apague a página.

**Tecnologia:** TypeScript estrito, React 19, Vite, Vitest (Node e jsdom), Testing Library, decimal.js. Nenhuma dependência nova (as fontes novas vêm do pacote `@fontsource/source-sans-3`, já instalado).

**Especificação:** `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md`, seção 18 (fase 6), com a §10 (relatório e PDF), a §6 (motor), a §17.2 (base por períodos) e a §17.3 (metodologias) para o que ela não muda. Leia a §18 inteira antes de começar.

## Restrições globais (valem para todas as tarefas)

- As do `CLAUDE.md` (regras obrigatórias 1 a 9) e as "Restrições globais" do plano da fase 5 (`docs/superpowers/plans/2026-10-12-fase-5-interface.md`): TDD; dinheiro, percentuais e fatores em `Decimal` (só de `src/compartilhado/decimal.ts`) ou texto decimal com ponto; datas como texto ISO; motor puro (sem `Date`, `fetch`, DOM ou armazenamento); relógio, ids, armazenamento, download e, desde esta fase, impressão e recarga pelo `Ambiente`; nenhum teste com rede nem com os últimos meses de `dados/indices/` (os testes do relatório usam a tabela fixa de 2024–2026, `tabelaRegimeNovo()`); validação sem pop-up; a tela não menciona outros sistemas.
- **Regra 7 do `CLAUDE.md`, no relatório:** o texto de "Metodologia e fundamentos" descreve o que foi aplicado, nunca o nome da opção de metodologia (uma metodologia ajustada guarda o `id` e o `nome` da opção de origem, que o relatório ignora), versão, "ajuste" ou "personalização"; o nome Apura só aparece no rodapé. Há teste para isso (Task 4).
- Os textos aprovados da §10.4, da §17.2, da §17.3 e da §18.5 entram literalmente nos testes; não os reescreva.
- Imports relativos com `.ts`/`.tsx` e `import type` para tipos; testes de componente com `// @vitest-environment jsdom` na primeira linha.
- Commits em português, "módulo: o que muda", terminados com a linha de coautoria do modelo que de fato executa (`Co-Authored-By: <nome do modelo> <noreply@anthropic.com>`).
- Fora desta fase: publicação e versão 0.1.0 (fase 7); as duas sobras menores da revisão da fase 5b e as melhorias "sem fase" da fase 5; os limites aceitos na §18.7.

## Foco da revisão

Entradas que a especificação implica e que podem morder quem junta o relatório no processo; cada uma tem teste na tarefa dona do código.

1. **Texto que diz o que o motor não aplicou:** termos finais antes de 30/08/2024 (depósito judicial), vencimento em 31/08/2024, correção a partir do mês seguinte, juros de 0%, metodologia "sem correção monetária", SELIC única até o mês do cálculo, só pagamentos atualizados. O texto segue o resultado de cada lançamento, não só a metodologia (§18.7). → Task 2 (`metodologia.test.ts`, "o texto acompanha o que o motor aplicou").
2. **Encargos próprios que não dizem o que difere:** metodologia própria igual à do cálculo, só com o mês seguinte, só com outra deflação, com períodos que o lançamento não alcança. → Task 3 (`tabelas.test.ts`, "encargos próprios: só o que difere da metodologia do cálculo").
3. **Relatório de cálculo incompleto:** prestação sem valor (base incompleta, valor inválido ou zero), pagamento sem valor; e o pagamento posterior à data do cálculo, que não pode bloquear. → Task 3 (`bloqueio.test.ts`) e Task 5 (`RelatorioNaTela.test.tsx`).
4. **Tema escuro e tela de edição indo para o papel:** impressão com `data-theme="dark"`, Ctrl+P na tela de cálculo, a faixa de avisos e a barra no PDF, "Totais" repetido em cada página. O jsdom não imprime: → Task 5 (a frase só de impressão e a classe `vendo-relatorio`), Task 4 (totais sem `tfoot`) e Task 9 (PDF de verdade, com o tema escuro ligado).
5. **Defeito do programa ao montar a tela ou o relatório:** a página não pode sumir com o cálculo em andamento. → Task 6 (`TelaDeErro.test.tsx` e `RelatorioDefeito.test.tsx`, com defeitos simulados).

---

## Para o responsável: o que esta fase entrega, o que foi decidido e o que foi descoberto

Ao fim da fase 6, "Relatório / PDF" abre o demonstrativo no lugar das colunas: faixa verde com o logo da DPE-MS, os cinco indicadores, as tabelas de prestações e de amortizações (vencimento, valor, fator, corrigido, juros, atualizado e a barra), as notas de cada tabela, os totais, "Metodologia e fundamentos" escrito a partir do que foi aplicado, a matriz dos índices e o rodapé. "Imprimir / Salvar PDF" chama a impressão do navegador, que sai sempre clara, em A4, com o cabeçalho das tabelas repetido e o nome do arquivo sugerido ("Apura – <processo> – <data>"). Com algum lançamento sem valor, o botão fica desligado e diz por quê; os demais avisos aparecem numa faixa só na tela. Um defeito do programa não apaga mais a página (a reserva oferece salvar o cálculo), o leitor de tela é avisado do novo total, e o lápis e o ✕ das tabelas ficam sempre à vista. A contagem de testes vai de 861 passando e 10 pulados (871, em 46 arquivos) para `Tests  935 passed | 10 skipped (945)`, `Test Files  55 passed (55)`.

**Decisões suas, de 13/10/2026 (D1 a D6; §18 do design):**

- **D1 · Onde abre:** na mesma página, no lugar das duas colunas, com "← Voltar ao cálculo" e "Imprimir / Salvar PDF"; a tela volta como estava (Task 5).
- **D2 · Colunas:** só o vencimento, como a tela, sem a coluna de competência; a descrição vai ao lado da data (Task 3).
- **D3 · Marcas:** a palavra na linha ("vincenda", "valor informado", "encargos próprios", "não computado") e uma nota abaixo da tabela; o pagamento não computado fica na tabela, fora dos totais (Task 3).
- **D4 · Pendências:** o botão fica desligado com prestação ou pagamento sem valor, com a contagem e onde corrigir; o pagamento posterior à data do cálculo não bloqueia; os demais avisos aparecem numa faixa só na tela (Tasks 3 e 5).
- **D5 · Ponto 1 da §7 (pro rata no mês final) confirmado** como o motor já faz; o relatório descreve a regra quando ela ocorre (Task 2).
- **D6 · Ensaio antes do plano**, como na fase 5b (ver "Ensaio" abaixo).

**Decisões técnicas deste plano, com o efeito no papel ou na tela (reabra qualquer uma na revisão, se discordar):**

- **T1 · Reajustes estruturados no motor:** cada prestação apurada pelo valor fixo com índice traz `reajustes` (mês, índice, janela, percentual, situação, valor); nenhum número muda, e os casos de referência continuam idênticos (Task 1).
- **T2 · Textos pelo resultado:** "Encargos" descreve só os períodos que algum lançamento de fato alcançou, e "Termos" só fala de correção ou de juros se houve; os textos aprovados não mudam (Task 2; §18.7).
- **T3 · Encargos próprios só com o que difere** da metodologia do cálculo; metodologia própria igual à do cálculo e sem termos não leva a palavra (Task 3; §18.7).
- **T4 · Totais das tabelas:** cada total soma o que a coluna mostra (Corrigido e Juros só das linhas atualizadas; a vincenda mostra "—"); o Atualizado é o do indicador. O pagamento não computado mostra o valor informado na coluna Valor, com as demais colunas em "—" (Task 3).
- **T5 · Totais como última linha do corpo da tabela**, e não `tfoot`: o Chrome repete o `tfoot` em cada página impressa (Task 4).
- **T6 · Logo do relatório:** cópia recortada do `branca-horizontal-01.png` do manual, com 1105 × 264 px (o triplo da altura da barra), gerada pelo `sips`, como na fase 5 (Task 4).
- **T7 · Lápis e ✕ sempre à vista:** a coluna das ações fica presa à borda direita da tabela, e o espaço lateral das células cai de 6 para 5 px; o ponto das duas colunas continua em 1024 px. Isto substitui o "duas colunas a partir de 1200 px" que eu tinha proposto: medido no navegador, com valores na casa do milhar a tabela pede cerca de 737 px, e a coluna da direita tem 730 px em 1366 px (o ✕ já saía 7 px da vista no notebook), 682 px em 1280 px e 638 px em 1200 px; subir o ponto só resolveria a partir de cerca de 1380 px, empilhando as colunas justamente no notebook de 1366 px. Com 5 px, a tabela cabe inteira em 1366 px (Task 8; §18.6).
- **T8 · Região viva fora das colunas:** os anúncios do total e da quantidade de avisos ficam fora da parte que "Abrir" e "Novo cálculo" remontam, para avisar também depois de abrir um cálculo (Task 7).
- **T9 · Fontes:** entram o itálico 400 e o negrito 700 da Source Sans 3; o peso 600 já carregava: só não era pedido enquanto o botão "Relatório / PDF" estava desligado (Task 8).

**Limites registrados (não resolvidos nesta fase, por decisão; §18.7):** metodologia com buraco entre períodos (só com arquivo fora do padrão) não descreve no papel o intervalo sem encargos (o aviso aparece na faixa da tela); com dívida zero, as linhas de multa e honorários continuam, com 0,00; o motivo do botão desligado fica no `title`; a frase de abertura das tabelas vale para a regra comum (as exceções estão nas notas); a impressão foi conferida no Chrome; o PDF não numera páginas nem repete o rodapé (§10.3).

**Ensaio:** todo o código deste plano foi escrito e executado em 13/10/2026 numa cópia do repositório fora dele, no fluxo de cada tarefa (teste que falha, código, `npm run verificar` verde, commit), e conferido no navegador integrado e em PDFs gerados pelo próprio Chrome (sem janela, `--print-to-pdf`): relatório de um cálculo de 47 prestações (base dividida em 2025, valor fixo com reajuste pelo IPCA até 2024 e 30% do salário mínimo depois, 13º com valor informado, linha com encargos próprios, vincenda, onze pagamentos e um posterior à data do cálculo) na tela em 1366 px, no tema escuro e no celular (375 px, sem rolagem lateral da página); PDF com o tema escuro ligado (sai claro, 4 páginas A4, cabeçalho repetido, totais só no fim, nenhuma linha cortada); Ctrl+P na tela de cálculo (uma página só com a frase). A conferência achou e o ensaio corrigiu: a faixa do relatório empilhava o logo no papel (a regra de tela estreita valia na folha A4); o anel de foco do título ia para o PDF; o título "Índices aplicados" ficava sozinho no pé da página; as colunas dos meses da matriz não se alinhavam entre as séries; e o lápis e o ✕ fora da vista (T7). Depois, uma revisão adversarial do código ensaiado, feita por um agente independente (com testes-sonda), achou defeitos que foram corrigidos no ensaio, com teste, dentro das tarefas donas do código: o texto de "Encargos" descrevia períodos que nenhum lançamento usou (com termo final antes de 30/08/2024, afirmava IPCA e taxa legal); "Termos" falava em juros com juros de 0% e em correção sem correção; a nota de encargos próprios listava a metodologia inteira e não dizia "a partir do mês seguinte"; "Termos" falava do vencimento quando só pagamentos foram atualizados; concordância dos meses faltantes no plural; mês do reajuste inválido gerava frase quebrada; chave duplicada do React nas notas; fundo da célula fixa na linha nova; e o anúncio do total que calava depois de "Abrir". Os pontos que o revisor deixou para o responsável estão nos limites acima. Por fim, a fase foi reconstruída tarefa por tarefa numa segunda cópia, a partir do commit do design, aplicando só os patches deste plano (primeiro os testes, para registrar o que falha; depois o código): cada passo "ver falhar" deste plano traz a falha medida nessa reconstrução, cada tarefa termina com a contagem medida, o estado final é idêntico ao do ensaio (`diff -r` vazio) e `npm run build` gera `dist/`.

---

## Estrutura de arquivos

| Arquivo | Papel nesta fase | Tarefa |
|---|---|---|
| `src/compartilhado/tipos.ts` | `ReajusteDaBase`; `LancamentoCalculado.reajustes` | 1 |
| `src/motor/base.ts`, `src/motor/calcular.ts` | os reajustes do valor fixo, estruturados | 1 |
| `src/relatorio/texto.ts` (novo) | listas, percentuais, pares lançamento + resultado | 2 |
| `src/relatorio/metodologia.ts` (novo) | "Metodologia e fundamentos"; períodos alcançados; o que difere nos encargos próprios | 2 |
| `src/relatorio/testes/calculos.ts` (novo) | cálculos de exemplo dos testes do relatório | 2, 3 |
| `src/relatorio/tabelas.ts` (novo) | linhas, palavras, notas, totais, indicadores, cabeçalho, título da aba, rodapé | 3 |
| `src/relatorio/matriz.ts` (novo) | matriz "série · ano × meses" | 3 |
| `src/relatorio/bloqueio.ts` (novo) | por que o botão fica desligado | 3 |
| `src/relatorio/Relatorio.tsx`, `relatorio.css` (novos) | o relatório na tela e na impressão | 4, 5 |
| `public/logos/dpems-horizontal-branca-relatorio.png` (gerado) | logo da faixa, 1105 × 264 px | 4 |
| `src/ui/ambiente.ts`, `src/ui/testes/ambiente-de-teste.ts` | `imprimir` e `recarregar` | 5, 6 |
| `src/ui/BarraSuperior.tsx` | botão ligado, com o motivo no `title` | 5 |
| `src/ui/App.tsx` | relatório na mesma página; reserva; anúncios | 5, 6, 7 |
| `src/ui/componentes/Reserva.tsx`, `src/ui/TelaDeErro.tsx` (novos) | tela de erro de reserva | 6 |
| `src/ui/componentes/anuncio.ts`, `Anuncios.tsx` (novos) | região viva | 7 |
| `src/ui/tabelas/Indicadores.tsx` | `totalGeralExibido` | 7 |
| `src/ui/estilos.css` | relatório na tela, impressão da tela, tela de erro, coluna fixa das ações | 5, 6, 8 |
| `src/main.tsx` | fontes 400 itálico e 700 | 8 |

---

## Como executar este plano

- Todos os comandos rodam na raiz do repositório, na branch de trabalho da fase (a do plano, `claude/apura-fase-6-plan-55c423`, ou outra criada a partir dela, à escolha de quem executa). Antes de tudo: `npm install` (dependências já fixadas; nenhuma nova nesta fase).
- **Os passos de código são patches.** Cada tarefa traz dois blocos `diff`: os testes (e os dados de teste) e o código. Para aplicar um bloco: salve o conteúdo dele, exatamente como está, num arquivo **fora do repositório** (na pasta de rascunho da sessão; o hook de gravação pode recusar caminhos com acento, como a pasta "DEFENSORIA PÚBLICA": grave por heredoc no shell, por exemplo `cat > "$RASCUNHO/t1-testes.patch" <<'PATCH'` … `PATCH`) e rode `git apply --whitespace=nowarn "$RASCUNHO/t1-testes.patch"`. Os patches foram aplicados, um a um, numa cópia limpa a partir do commit do design (`72866f7`): aplicam-se sem conflito sobre o estado da tarefa anterior. Se `git apply` recusar, pare e relate (não edite à mão para "encaixar").
- Ciclo de cada tarefa: aplicar o patch dos testes → rodar `npx vitest run` e ver falhar exatamente o que o passo diz (se outra coisa falhar, ou se um teste novo passar sem o código, pare e relate) → aplicar o patch do código → `npm run format && npm run verificar` (o `format` não deve mudar nada) → conferir a contagem → commit. Só se commita com tudo verde.
- Leia o patch antes de aplicá-lo: ele é o código da tarefa, e o revisor de cada tarefa o confere contra a §18 do design.
- Nenhum teste acessa a rede, o armazenamento real do navegador ou a impressão de verdade: os testes de componente recebem `ambienteDeTeste()`.
- Relatórios de subagentes vão em `.txt`, fora do repositório (na pasta de rascunho da sessão), nunca na raiz do projeto.

---

### Task 1: Motor: reajustes do valor fixo estruturados no resultado

**Files:**
- Modify: `src/compartilhado/tipos.ts` (`ReajusteDaBase`; `LancamentoCalculado.reajustes`)
- Modify: `src/motor/base.ts` (`ValorBaseApurado.reajustes`, preenchido em `porIndiceAcumulado`)
- Modify: `src/motor/calcular.ts` (leva os reajustes da apuração para a linha do resultado)
- Test: `src/motor/base.test.ts`, `src/motor/calcular.test.ts`

**Interfaces:**
- Consumes: `apurarValorBase`, `apurarPelaBase` e `calcular` como estão.
- Produces: `interface ReajusteDaBase { em: Competencia; indice: NomeIndice; de: Competencia; ate: Competencia; situacao: "aplicado" | "mantido" | "naoAplicado"; percentual?: TextoDecimal; valor: TextoDecimal; faltantes?: Competencia[]; aindaNaoDivulgados?: boolean }` e `LancamentoCalculado.reajustes?: ReajusteDaBase[]` (presente só nas prestações apuradas pelo valor fixo com índice; vazio antes do primeiro reajuste), usados pela Task 2.

O relatório precisa dizer, no parágrafo "Base", quais reajustes o valor fixo teve, com o acumulado de cada um (§18.5). Hoje isso só existe na frase da memória (`memoriaBase`), e ler a frase quebraria com qualquer mudança de redação. O motor passa a devolver a lista estruturada; nenhum número muda.

- [ ] **Step 1: Aplicar o patch dos testes** (salvar em `$RASCUNHO/t1-testes.patch` e `git apply --whitespace=nowarn`)

```diff
diff --git a/src/motor/base.test.ts b/src/motor/base.test.ts
index c2a9c3f..dc05973 100644
--- a/src/motor/base.test.ts
+++ b/src/motor/base.test.ts
@@ -471,6 +471,70 @@ describe("base em valor fixo (§6.3)", () => {
       expect(r.indicesUsados).toHaveLength(12);
     });
 
+    it("devolve os reajustes estruturados, para o relatório descrever a base (§18.4)", () => {
+      expect(apurarValorBase(prestacao("2026-09-15"), base, tabela, 2).reajustes).toEqual([
+        {
+          em: "2025-03",
+          indice: "IPCA",
+          de: "2024-03",
+          ate: "2025-02",
+          situacao: "aplicado",
+          percentual: "5.0576",
+          valor: "525.29",
+        },
+        {
+          em: "2026-03",
+          indice: "IPCA",
+          de: "2025-03",
+          ate: "2026-02",
+          situacao: "aplicado",
+          percentual: "3.8125",
+          valor: "545.32",
+        },
+      ]);
+      // antes do primeiro reajuste: lista vazia
+      expect(apurarValorBase(prestacao("2025-02-15"), base, tabela, 2).reajustes).toEqual([]);
+      // acumulado não positivo: "mantido", com o percentual
+      const igpm: FormaDaBase = {
+        tipo: "valorFixo",
+        valor: "451.91",
+        dataFixacao: "2017-01-10",
+        indiceReajuste: "IGP-M",
+        mesReajuste: 1,
+      };
+      expect(apurarValorBase(prestacao("2018-01-10"), igpm, tabelaIgpm(), 2).reajustes).toEqual([
+        {
+          em: "2018-01",
+          indice: "IGP-M",
+          de: "2017-01",
+          ate: "2017-12",
+          situacao: "mantido",
+          percentual: "-0.5326",
+          valor: "451.91",
+        },
+      ]);
+      // índice faltante no meio da janela: "naoAplicado", com os meses que faltaram
+      const comLacuna = tabelaRegimeNovo();
+      delete comLacuna.series["433"]?.["2025-05"];
+      expect(apurarValorBase(prestacao("2026-09-15"), base, comLacuna, 2).reajustes?.[1]).toEqual({
+        em: "2026-03",
+        indice: "IPCA",
+        de: "2025-03",
+        ate: "2026-02",
+        situacao: "naoAplicado",
+        valor: "525.29",
+        faltantes: ["2025-05"],
+        aindaNaoDivulgados: false,
+      });
+      // as outras formas não têm reajustes por índice
+      const semReajuste: FormaDaBase = { ...base, indiceReajuste: "nenhum" };
+      expect(apurarValorBase(prestacao("2026-09-15"), semReajuste, tabela, 2).reajustes).toBe(
+        undefined,
+      );
+      const porSm: FormaDaBase = { tipo: "percentualSalarioMinimo", percentual: "30" };
+      expect(apurarValorBase(prestacao("2026-09-15"), porSm, tabela, 2).reajustes).toBe(undefined);
+    });
+
     it("mês do reajuste inválido: valor fixado, com aviso", () => {
       const r = apurarValorBase(prestacao("2026-09-15"), { ...base, mesReajuste: 13 }, tabela, 2);
       expect(r.valor?.toFixed(2)).toBe("500.00");
@@ -645,6 +709,21 @@ describe("base com calendário de divulgação (fase 4: esperadoAte)", () => {
       expect(r.indicesUsados).toEqual([]);
     });
 
+    it("reajuste não aplicado por mês ainda não divulgado: marcado nos reajustes estruturados", () => {
+      expect(apurarValorBase(prestacao("2026-11-15"), base, comCalendario(), 2).reajustes).toEqual([
+        {
+          em: "2026-11",
+          indice: "IPCA",
+          de: "2025-11",
+          ate: "2026-10",
+          situacao: "naoAplicado",
+          valor: "500.00",
+          faltantes: ["2026-10"],
+          aindaNaoDivulgados: true,
+        },
+      ]);
+    });
+
     it("dois meses ainda não divulgados saem listados na mesma frase", () => {
       const dezembro: FormaDaBase = { ...base, dataFixacao: "2025-12-15", mesReajuste: 12 };
       const r = apurarValorBase(prestacao("2026-12-15"), dezembro, comCalendario(), 2);
diff --git a/src/motor/calcular.test.ts b/src/motor/calcular.test.ts
index 0d15181..ca43955 100644
--- a/src/motor/calcular.test.ts
+++ b/src/motor/calcular.test.ts
@@ -585,6 +585,46 @@ describe("calcular (fase 3: situação dos lançamentos, base dos alimentos e pr
     base: baseUnica(forma),
   });
 
+  it("a prestação apurada pelo valor fixo com reajuste por índice traz os reajustes no resultado (§18.4); as demais não", () => {
+    const forma: FormaDaBase = {
+      tipo: "valorFixo",
+      valor: "500.00",
+      dataFixacao: "2024-03-15",
+      indiceReajuste: "IPCA",
+      mesReajuste: 3,
+    };
+    const r = calcular(
+      comBase(forma, [
+        semValorInformado("p-2025-04", "2025-04-15"),
+        semValorInformado("p-2024-04", "2024-04-15"),
+        semValorInformado("p-2025-05", "2025-05-15", { valorInformado: "600.00" }),
+      ]),
+      tabelaRegimeNovo(),
+    );
+    expect(r.lancamentos[0]?.reajustes).toEqual([
+      {
+        em: "2025-03",
+        indice: "IPCA",
+        de: "2024-03",
+        ate: "2025-02",
+        situacao: "aplicado",
+        percentual: "5.0576",
+        valor: "525.29",
+      },
+    ]);
+    expect(r.lancamentos[0]?.valorBase).toBe("525.29");
+    // antes do primeiro reajuste: lista vazia; valor informado à mão: sem o campo
+    expect(r.lancamentos[1]?.reajustes).toEqual([]);
+    expect(r.lancamentos[2]).not.toHaveProperty("reajustes");
+    const semIndice = calcular(
+      comBase({ tipo: "percentualSalarioMinimo", percentual: "30" }, [
+        semValorInformado("p-2025-04", "2025-04-15"),
+      ]),
+      tabelaRegimeNovo(),
+    );
+    expect(semIndice.lancamentos[0]).not.toHaveProperty("reajustes");
+  });
+
   it("pagamento posterior à data de elaboração fica fora dos totais, com aviso no lançamento e no resumo", () => {
     const futuro: Lancamento = { ...amortizacao, id: "a-2018-06", data: "2018-06-10" };
     const r = calcular(calculoCom([prestacao, futuro]), tabelaIgpm());
```

- [ ] **Step 2: Ver falhar**

Run: `npx vitest run`

Expected: FAIL, 3 testes (2 arquivos), cada um com `expected undefined to deeply equal [...]`:
- `base.test.ts` › "devolve os reajustes estruturados, para o relatório descrever a base (§18.4)"
- `base.test.ts` › "reajuste não aplicado por mês ainda não divulgado: marcado nos reajustes estruturados"
- `calcular.test.ts` › "a prestação apurada pelo valor fixo com reajuste por índice traz os reajustes no resultado (§18.4); as demais não"

Resumo: `Tests  3 failed | 861 passed | 10 skipped (874)`.

- [ ] **Step 3: Aplicar o patch do código** (salvar em `$RASCUNHO/t1-codigo.patch` e `git apply --whitespace=nowarn`)

```diff
diff --git a/src/compartilhado/tipos.ts b/src/compartilhado/tipos.ts
index ff12e64..4dae411 100644
--- a/src/compartilhado/tipos.ts
+++ b/src/compartilhado/tipos.ts
@@ -236,6 +236,29 @@ export interface DetalheJuros {
  */
 export type SituacaoLancamento = "atualizado" | "vincenda" | "ignorado";
 
+/**
+ * Um reajuste anual do valor fixo por índice (§6.3), como o motor o aplicou, para o relatório
+ * descrever a base sem depender da redação da memória (§18.4).
+ */
+export interface ReajusteDaBase {
+  /** mês do reajuste */
+  em: Competencia;
+  indice: NomeIndice;
+  /** janela do acumulado, inclusive */
+  de: Competencia;
+  ate: Competencia;
+  /** "aplicado"; "mantido" (acumulado não positivo); "naoAplicado" (faltou índice na janela) */
+  situacao: "aplicado" | "mantido" | "naoAplicado";
+  /** acumulado da janela em %, com 4 casas ("5.0576"); ausente quando não aplicado */
+  percentual?: TextoDecimal;
+  /** valor vigente depois do reajuste (o mesmo de antes quando mantido ou não aplicado) */
+  valor: TextoDecimal;
+  /** meses que faltaram na janela (só quando não aplicado) */
+  faltantes?: Competencia[];
+  /** todos os meses faltantes ainda sem divulgação na data da consulta (só quando não aplicado) */
+  aindaNaoDivulgados?: boolean;
+}
+
 export interface LancamentoCalculado {
   id: string;
   tipo: Lancamento["tipo"];
@@ -247,6 +270,11 @@ export interface LancamentoCalculado {
   /** prestação cujo valor foi informado à mão, em vez de apurado pela base dos alimentos (§6.3) */
   editado: boolean;
   situacao: SituacaoLancamento;
+  /**
+   * reajustes do valor fixo por índice até o vencimento (vazio antes do primeiro), só nas
+   * prestações apuradas por essa forma da base (§18.4)
+   */
+  reajustes?: ReajusteDaBase[];
   correcao: { fator: TextoDecimal; indices: IndiceAplicado[]; pisoAplicado: boolean };
   corrigido: TextoDecimal;
   juros: { percentual: TextoDecimal; detalhe: DetalheJuros[] };
diff --git a/src/motor/base.ts b/src/motor/base.ts
index 614a394..fbf12c8 100644
--- a/src/motor/base.ts
+++ b/src/motor/base.ts
@@ -11,6 +11,7 @@ import {
   CEM,
   decimal,
   decimalOuNulo,
+  paraTexto,
   UM,
   type Decimal,
 } from "../compartilhado/decimal.ts";
@@ -31,6 +32,7 @@ import type {
   Lancamento,
   NomeIndice,
   PeriodoDaBase,
+  ReajusteDaBase,
   TabelaIndices,
 } from "../compartilhado/tipos.ts";
 import { aindaNaoDivulgado, divulgacaoPrevista } from "../compartilhado/divulgacao.ts";
@@ -51,6 +53,8 @@ export interface ValorBaseApurado {
   /** meses que faltaram na tabela de índices (salário mínimo ainda não publicado, índice de reajuste ausente) */
   mesesSemIndice: MesSemIndice[];
   avisos: string[];
+  /** reajustes do valor fixo por índice (só nessa forma; vazio antes do primeiro), para o relatório */
+  reajustes?: ReajusteDaBase[];
 }
 
 const SALARIO_MINIMO = CODIGO_DA_SERIE.SM;
@@ -302,6 +306,7 @@ function porIndiceAcumulado(
   let inicioJanela = mesFixacao;
   let vigente = valorFixado;
   const aplicados: string[] = [];
+  const reajustes: ReajusteDaBase[] = [];
   const indicesUsados: IndiceUsado[] = [];
   const mesesSemIndice: MesSemIndice[] = [];
   const avisos: string[] = [];
@@ -335,6 +340,16 @@ function porIndiceAcumulado(
         );
       }
       mesesSemIndice.push(...faltantes.map((m) => ({ serie, competencia: m })));
+      reajustes.push({
+        em: reajuste,
+        indice: nome,
+        de: inicioJanela,
+        ate: fimJanela,
+        situacao: "naoAplicado",
+        valor: paraTexto(vigente, valorCasas),
+        faltantes,
+        aindaNaoDivulgados: faltantes.every((m) => aindaNaoDivulgado(tabela, serie, m)),
+      });
       naoAplicado = `reajuste de ${formatarCompetencia(reajuste)} não aplicado: ${nome} de ${lista} não disponível`;
       break;
     }
@@ -346,7 +361,8 @@ function porIndiceAcumulado(
       indicesUsados.push(usado);
     }
     const janela = `${nome} de ${formatarCompetencia(inicioJanela)} a ${formatarCompetencia(fimJanela)}: ${formatarPercentual(acumulado.minus(UM).times(CEM), 4)}`;
-    if (acumulado.lte(UM)) {
+    const mantido = acumulado.lte(UM);
+    if (mantido) {
       aplicados.push(
         `em ${formatarCompetencia(reajuste)} (${janela}, acumulado não positivo: valor mantido)`,
       );
@@ -354,6 +370,15 @@ function porIndiceAcumulado(
       vigente = arredondar(vigente.times(acumulado), valorCasas);
       aplicados.push(`em ${formatarCompetencia(reajuste)} (${janela})`);
     }
+    reajustes.push({
+      em: reajuste,
+      indice: nome,
+      de: inicioJanela,
+      ate: fimJanela,
+      situacao: mantido ? "mantido" : "aplicado",
+      percentual: paraTexto(acumulado.minus(UM).times(CEM), 4),
+      valor: paraTexto(vigente, valorCasas),
+    });
     inicioJanela = reajuste;
     reajuste = somarMeses(reajuste, 12);
   }
@@ -366,7 +391,7 @@ function porIndiceAcumulado(
     const nota = naoAplicado === null ? "" : `; ${naoAplicado}`;
     memoria = `${formatarMoeda(valorFixado)} fixados em ${fixacao}, reajustados ${aplicados.join(" e ")} = ${formatarMoeda(vigente)}${nota}`;
   }
-  return { valor: vigente, memoria, indicesUsados, mesesSemIndice, avisos };
+  return { valor: vigente, memoria, indicesUsados, mesesSemIndice, avisos, reajustes };
 }
 
 function porValorFixo(
diff --git a/src/motor/calcular.ts b/src/motor/calcular.ts
index 0a11562..d4b208c 100644
--- a/src/motor/calcular.ts
+++ b/src/motor/calcular.ts
@@ -19,6 +19,7 @@ import type {
   IndiceUsado,
   Lancamento,
   LancamentoCalculado,
+  ReajusteDaBase,
   Resultado,
   SituacaoLancamento,
   TabelaIndices,
@@ -80,6 +81,8 @@ interface Rastro {
   mesesSemTaxaLegal: Competencia[];
   indicesDaBase: IndiceUsado[];
   mesesSemIndiceNaBase: MesSemIndice[];
+  /** reajustes do valor fixo por índice da prestação apurada pela base (§18.4) */
+  reajustesDaBase?: ReajusteDaBase[];
 }
 
 interface ValorResolvido {
@@ -101,7 +104,7 @@ function resolverValor(
   indices: TabelaIndices,
   valorCasas: number,
   avisos: string[],
-  rastro: Pick<Rastro, "indicesDaBase" | "mesesSemIndiceNaBase">,
+  rastro: Pick<Rastro, "indicesDaBase" | "mesesSemIndiceNaBase" | "reajustesDaBase">,
 ): ValorResolvido {
   if (lancamento.valorInformado !== undefined) {
     const informado = decimalOuNulo(lancamento.valorInformado);
@@ -133,6 +136,7 @@ function resolverValor(
   avisos.push(...base.avisos);
   rastro.indicesDaBase = base.indicesUsados;
   rastro.mesesSemIndiceNaBase = base.mesesSemIndice;
+  if (base.reajustes !== undefined) rastro.reajustesDaBase = base.reajustes;
   if (base.valor === null) {
     return { valorBase: ZERO, memoriaBase: base.memoria, editado: false, semValor: true };
   }
@@ -207,7 +211,7 @@ function atualizarComRastro(
   if (lancamento.encargos?.metodologia !== undefined) {
     avisos.push(...validarMetodologia(lancamento.encargos.metodologia));
   }
-  const rastroDaBase: Pick<Rastro, "indicesDaBase" | "mesesSemIndiceNaBase"> = {
+  const rastroDaBase: Pick<Rastro, "indicesDaBase" | "mesesSemIndiceNaBase" | "reajustesDaBase"> = {
     indicesDaBase: [],
     mesesSemIndiceNaBase: [],
   };
@@ -223,6 +227,9 @@ function atualizarComRastro(
     memoriaBase: valor.memoriaBase,
     editado: valor.editado,
     situacao,
+    ...(rastroDaBase.reajustesDaBase === undefined
+      ? {}
+      : { reajustes: rastroDaBase.reajustesDaBase }),
   };
 
   // Vincenda e ignorado entram pelo valor nominal: sem correção e sem juros (§6.7).
```

- [ ] **Step 4: Formatar e verificar**

Run: `npm run format && npm run verificar`

Expected: o `format` não muda nada; tudo verde, com `Test Files  46 passed (46)`, `Tests  864 passed | 10 skipped (874)`. Os doze casos de referência continuam passando sem mudança (`src/motor/casos/` não é tocado).

- [ ] **Step 5: Commit**

```bash
git add src/compartilhado/tipos.ts src/motor/base.ts src/motor/calcular.ts src/motor/base.test.ts src/motor/calcular.test.ts
git commit -m 'motor: reajustes do valor fixo estruturados no resultado, para o relatório (fase 6)' -m 'Co-Authored-By: <modelo> <noreply@anthropic.com>'
```


### Task 2: Relatório: "Metodologia e fundamentos" gerado do que foi aplicado

**Files:**
- Create: `src/relatorio/texto.ts` (listas "a, b e c", percentual informado, maiúscula, sinal de menos, pares lançamento + resultado)
- Create: `src/relatorio/metodologia.ts` (`metodologiaEFundamentos` e os parágrafos; `periodosAlcancados`, `mesmasRegras`, `diferencasDosEncargos`, `regrasResumidas`)
- Create: `src/relatorio/testes/calculos.ts` (cálculos de exemplo, com a tabela fixa de 2024–2026)
- Test: `src/relatorio/metodologia.test.ts`

**Interfaces:**
- Consumes: `ReajusteDaBase` e `LancamentoCalculado.reajustes` (Task 1); `periodosDaBaseOrdenados`, `descreverPeriodoDaBase`, `baseUnica` (`src/motor/base.ts`); `periodosOrdenados`, `periodoVigenteEm` (`src/motor/periodos.ts`); `formatarDataHoraBrasilia` (`src/indices/relogio.ts`); `calcular`, `tabelaRegimeNovo`, `metodologiaDaOpcao` nos testes.
- Produces: `interface Paragrafo { titulo: string; texto: string }`; `metodologiaEFundamentos(calculo, resultado): Paragrafo[]`; `paragrafoBase`, `paragrafoTermos`, `paragrafoEncargos`, `paragrafoDeflacao` (`(calculo, resultado) => string | null`) e `paragrafoFontes` (`=> string`); `periodosAlcancados(m: Metodologia, lista: Par[]): PeriodoMetodologia[]`; `mesmasRegras(a, b): boolean`; `diferencasDosEncargos(par: Par, calculo: Calculo): string[]` (usada pela Task 3); `regrasResumidas(m, periodos?)`. De `texto.ts`: `interface Par { lancamento; calculado }`, `pares(calculo, resultado): Par[]`, `listar`, `percentualInformado`, `maiuscula`, `comSinalDeMenos`, `MESES_POR_EXTENSO`. De `testes/calculos.ts`: `DATA_DO_CALCULO`, `VALOR_FIXO_500`, `prestacao`, `pagamento`, `calculoDeTeste`, `resultadoDe`, `metodologiaDeTresPeriodos` (e `calculoCompleto`, na Task 3).

Os parágrafos de §10.4, §18.4, §18.5 e §18.7, cada um só quando há o que dizer, na ordem Base, Termos, Encargos, Amortizações, Multa e honorários, Deflação, Observações, Fontes e arredondamento. Os textos aprovados entram literalmente nos testes. O texto segue o resultado de cada lançamento (os períodos que a correção e os juros de fato alcançaram), não só a metodologia (§18.7).

- [ ] **Step 1: Aplicar o patch dos testes** (salvar em `$RASCUNHO/t2-testes.patch` e `git apply --whitespace=nowarn`)

```diff
diff --git a/src/relatorio/metodologia.test.ts b/src/relatorio/metodologia.test.ts
new file mode 100644
index 0000000..728cab7
--- /dev/null
+++ b/src/relatorio/metodologia.test.ts
@@ -0,0 +1,559 @@
+import { describe, expect, it } from "vitest";
+import type { Calculo, FormaDaBase, Metodologia, TabelaIndices } from "../compartilhado/tipos.ts";
+import { metodologiaDaOpcao } from "../metodologias/padrao.ts";
+import { baseUnica } from "../motor/base.ts";
+import { tabelaRegimeNovo } from "../motor/testes/regime-novo.ts";
+import {
+  metodologiaEFundamentos,
+  paragrafoBase,
+  paragrafoDeflacao,
+  paragrafoEncargos,
+  paragrafoFontes,
+  paragrafoTermos,
+} from "./metodologia.ts";
+import {
+  calculoDeTeste,
+  metodologiaDeTresPeriodos,
+  pagamento,
+  prestacao,
+  resultadoDe,
+} from "./testes/calculos.ts";
+
+const ENCARGOS_LEI_14905 =
+  "Até 29/08/2024, IGP-M e juros de 1% ao mês, simples, pro rata die; desde 30/08/2024, IPCA (art. 389, parágrafo único, do CC) e juros pela taxa legal (art. 406, §1º, do CC; Lei 14.905/2024; Resolução CMN 5.171/2024), série 29543 do BCB, acumulada por juros simples e pro rata por dias corridos, sobre o valor corrigido.";
+
+/** Os textos dos parágrafos de um cálculo, calculado com a tabela fixa de 2024–2026. */
+function textos(calculo: Calculo, tabela?: TabelaIndices) {
+  const resultado = resultadoDe(calculo, tabela);
+  return {
+    base: paragrafoBase(calculo, resultado),
+    termos: paragrafoTermos(calculo, resultado),
+    encargos: paragrafoEncargos(calculo, resultado),
+    deflacao: paragrafoDeflacao(calculo, resultado),
+    fontes: paragrafoFontes(calculo, resultado),
+  };
+}
+
+describe("Metodologia e fundamentos (§10.4, §18.4, §18.5)", () => {
+  it("cálculo completo: os parágrafos na ordem, com os títulos, e só os que têm o que dizer", () => {
+    const calculo = calculoDeTeste({
+      lancamentos: [
+        prestacao("2024-07-05"),
+        prestacao("2024-10-05"),
+        pagamento("2024-10-10", "200.00"),
+      ],
+      observacoes: "Conforme a sentença.\nValores do acordo.",
+    });
+    const paragrafos = metodologiaEFundamentos(calculo, resultadoDe(calculo));
+    expect(paragrafos.map((p) => p.titulo)).toEqual([
+      "Base.",
+      "Termos.",
+      "Encargos.",
+      "Amortizações.",
+      "Multa e honorários.",
+      "Observações.",
+      "Fontes e arredondamento.",
+    ]);
+    expect(paragrafos.map((p) => p.texto)).toEqual([
+      "Valor fixo de R$ 500,00, fixado em 01/07/2024, sem reajuste.",
+      "Encargos desde o vencimento de cada prestação (mora automática, art. 397 do CC). Correção pelo índice do mês do vencimento, proporcional aos dias restantes (pro rata), e pelos meses seguintes até set/2026, último índice divulgado; juros até a data do cálculo.",
+      ENCARGOS_LEI_14905,
+      "Cada pagamento é atualizado pelos mesmos critérios, da data do pagamento até a data do cálculo, e abatido do total atualizado.",
+      "Multa de 10% e honorários de 10% (art. 523, §1º, do CPC), cada um sobre o total devido atualizado, sem incidência dos honorários sobre a multa.",
+      "Conforme a sentença.\nValores do acordo.",
+      "Índices do Sistema Gerenciador de Séries Temporais do Banco Central (IGP-M, série 189; IPCA, série 433; taxa legal, série 29543), atualizados em 11/10/2026 09:00 (horário de Brasília). Arredondamento comercial: fator e percentual de juros com 6 casas, valores com 2 casas por lançamento. Mês sem índice divulgado na data da consulta, computado sem correção: IPCA de out/2026.",
+    ]);
+  });
+
+  it("sem pagamento computado, sem multa e honorários e sem observações: os parágrafos somem", () => {
+    const calculo = calculoDeTeste({
+      lancamentos: [prestacao("2024-10-05"), pagamento("2026-11-10", "200.00")],
+      acrescimos: { multaPercentual: "0", honorariosPercentual: "0" },
+      observacoes: "  ",
+    });
+    const titulos = metodologiaEFundamentos(calculo, resultadoDe(calculo)).map((p) => p.titulo);
+    expect(titulos).toEqual(["Base.", "Termos.", "Encargos.", "Fontes e arredondamento."]);
+  });
+
+  it("multa ou honorários sozinhos", () => {
+    const so = (multa: string, honorarios: string) => {
+      const calculo = calculoDeTeste({
+        acrescimos: { multaPercentual: multa, honorariosPercentual: honorarios },
+      });
+      return metodologiaEFundamentos(calculo, resultadoDe(calculo)).find(
+        (p) => p.titulo === "Multa e honorários.",
+      )?.texto;
+    };
+    expect(so("10", "0")).toBe(
+      "Multa de 10% (art. 523, §1º, do CPC), sobre o total devido atualizado.",
+    );
+    expect(so("0", "12.5")).toBe(
+      "Honorários de 12,5% (art. 523, §1º, do CPC), sobre o total devido atualizado.",
+    );
+  });
+});
+
+describe("Base (§18.5)", () => {
+  const com = (forma: FormaDaBase, lancamentos = calculoDeTeste().lancamentos) =>
+    textos(calculoDeTeste({ base: baseUnica(forma), lancamentos })).base;
+
+  it("valor fixo com reajuste pelo índice: os reajustes aplicados, com o acumulado de 4 casas", () => {
+    const forma: FormaDaBase = {
+      tipo: "valorFixo",
+      valor: "500.00",
+      dataFixacao: "2024-03-15",
+      indiceReajuste: "IPCA",
+      mesReajuste: 3,
+    };
+    expect(com(forma, [prestacao("2024-04-15"), prestacao("2026-09-15")])).toBe(
+      "Valor fixo de R$ 500,00, fixado em 15/03/2024, reajustado pelo IPCA acumulado desde o reajuste anterior: em mar/2025 (IPCA de mar/2024 a fev/2025: 5,0576%) e em mar/2026 (IPCA de mar/2025 a fev/2026: 3,8125%), chegando a R$ 545,32.",
+    );
+    // antes do primeiro reajuste
+    expect(
+      com({ ...forma, dataFixacao: "2026-03-15" }, [
+        prestacao("2026-04-15"),
+        prestacao("2026-09-15"),
+      ]),
+    ).toBe(
+      "Valor fixo de R$ 500,00, fixado em 15/03/2026, com reajuste anual pelo IPCA acumulado, em março; não houve reajuste até o último vencimento.",
+    );
+  });
+
+  it("reajuste não aplicado por falta de índice e acumulado não positivo", () => {
+    const novembro: FormaDaBase = {
+      tipo: "valorFixo",
+      valor: "500.00",
+      dataFixacao: "2025-11-15",
+      indiceReajuste: "IPCA",
+      mesReajuste: 11,
+    };
+    const comCalendario: TabelaIndices = {
+      ...tabelaRegimeNovo(),
+      esperadoAte: { "433": "2026-09", "189": "2026-09", "29543": "2026-10" },
+    };
+    const calculo = calculoDeTeste({
+      base: baseUnica(novembro),
+      lancamentos: [prestacao("2025-12-15"), prestacao("2026-11-15")],
+    });
+    expect(textos(calculo, comCalendario).base).toBe(
+      "Valor fixo de R$ 500,00, fixado em 15/11/2025, com reajuste anual pelo IPCA acumulado, em novembro; o reajuste de nov/2026 não foi aplicado (IPCA de out/2026 ainda não divulgado na data da consulta).",
+    );
+    const semCalendario = textos(calculo).base;
+    expect(semCalendario).toContain(
+      "o reajuste de nov/2026 não foi aplicado (IPCA de out/2026 não disponível na tabela de índices).",
+    );
+    // IGP-M de mai a ago/2025: acumulado negativo (0,9951 × 0,9833 × 0,9923 × 1,0036 = 0,974443)
+    const igpm: FormaDaBase = {
+      tipo: "valorFixo",
+      valor: "500.00",
+      dataFixacao: "2025-05-10",
+      indiceReajuste: "IGP-M",
+      mesReajuste: 9,
+    };
+    expect(com(igpm, [prestacao("2025-09-10")])).toBe(
+      "Valor fixo de R$ 500,00, fixado em 10/05/2025, reajustado pelo IGP-M acumulado desde o reajuste anterior: em set/2025 (IGP-M de mai/2025 a ago/2025: −2,5557%, acumulado não positivo: valor mantido), chegando a R$ 500,00.",
+    );
+  });
+
+  it("valor fixo sem reajuste e pelo salário mínimo; percentual do salário mínimo", () => {
+    expect(com({ ...calculoDeTeste().base.periodos[0]!.forma })).toBe(
+      "Valor fixo de R$ 500,00, fixado em 01/07/2024, sem reajuste.",
+    );
+    expect(
+      com({
+        tipo: "valorFixo",
+        valor: "500.00",
+        dataFixacao: "2024-03-10",
+        indiceReajuste: "SM",
+        mesReajuste: 3,
+      }),
+    ).toBe(
+      "Valor fixo de R$ 500,00, fixado em 10/03/2024, reajustado na proporção do salário mínimo vigente no mês de cada vencimento (salário mínimo de mar/2024: R$ 1.412,00).",
+    );
+    expect(com({ tipo: "percentualSalarioMinimo", percentual: "30" })).toBe(
+      "30% do salário mínimo vigente no mês de cada vencimento.",
+    );
+  });
+
+  it("percentual dos rendimentos, com os meses de rendimento próprio", () => {
+    const forma: FormaDaBase = {
+      tipo: "percentualRendimentos",
+      percentual: "30",
+      rendimentoPadrao: "2000.00",
+    };
+    expect(
+      com(forma, [
+        prestacao("2025-11-05"),
+        prestacao("2025-12-05", {
+          id: "p-13",
+          origem: "avulso",
+          descricao: "13º salário",
+          rendimento: "2000.00",
+        }),
+        prestacao("2026-01-05", {
+          id: "p-ferias",
+          origem: "avulso",
+          descricao: "férias",
+          rendimento: "2666.67",
+        }),
+      ]),
+    ).toBe(
+      "30% dos rendimentos do executado, sobre o rendimento mensal de R$ 2.000,00; nos meses com rendimento próprio, sobre ele: 05/12/2025 (13º salário), R$ 2.000,00; 05/01/2026 (férias), R$ 2.666,67.",
+    );
+  });
+
+  it("base dividida em períodos: uma frase por período (§17.2), só os períodos com prestação", () => {
+    const calculo = calculoDeTeste({
+      base: {
+        periodos: [
+          {
+            de: null,
+            ate: "2024-12-31",
+            forma: {
+              tipo: "valorFixo",
+              valor: "500.00",
+              dataFixacao: "2024-03-10",
+              indiceReajuste: "nenhum",
+              mesReajuste: 3,
+            },
+          },
+          {
+            de: "2025-01-01",
+            ate: "2025-12-31",
+            forma: { tipo: "percentualSalarioMinimo", percentual: "30" },
+          },
+          {
+            de: "2026-01-01",
+            ate: null,
+            forma: { tipo: "percentualSalarioMinimo", percentual: "" },
+          },
+        ],
+      },
+      lancamentos: [prestacao("2024-12-05"), prestacao("2025-01-05")],
+    });
+    expect(textos(calculo).base).toBe(
+      "Até 31/12/2024, valor fixo de R$ 500,00, fixado em 10/03/2024, sem reajuste; de 01/01/2025 a 31/12/2025, 30% do salário mínimo vigente no mês de cada vencimento.",
+    );
+  });
+
+  it("complementos: prestação anterior à fixação e valor informado à mão", () => {
+    const calculo = calculoDeTeste({
+      base: baseUnica({
+        tipo: "valorFixo",
+        valor: "500.00",
+        dataFixacao: "2024-08-10",
+        indiceReajuste: "nenhum",
+        mesReajuste: 8,
+      }),
+      lancamentos: [
+        prestacao("2024-07-05"),
+        prestacao("2024-10-05", { valorInformado: "600.00", editado: true }),
+      ],
+    });
+    expect(textos(calculo).base).toBe(
+      "Valor fixo de R$ 500,00, fixado em 10/08/2024, sem reajuste. As prestações vencidas antes da fixação entram pelo valor fixado, sem reajuste. Nas prestações marcadas “valor informado”, vale o valor indicado na tabela, em vez do apurado pela base.",
+    );
+  });
+
+  it("todas as prestações com valor informado: só a frase do valor informado", () => {
+    const calculo = calculoDeTeste({
+      lancamentos: [prestacao("2024-10-05", { valorInformado: "600.00" })],
+    });
+    expect(textos(calculo).base).toBe(
+      "Nas prestações marcadas “valor informado”, vale o valor indicado na tabela, em vez do apurado pela base.",
+    );
+  });
+});
+
+describe("Termos (§18.5)", () => {
+  const INICIO =
+    "Encargos desde o vencimento de cada prestação (mora automática, art. 397 do CC). ";
+
+  it("correção a partir do mês seguinte", () => {
+    const metodologia: Metodologia = {
+      ...metodologiaDaOpcao("lei14905"),
+      incidenciaMesInicial: "mesSeguinte",
+    };
+    expect(textos(calculoDeTeste({ metodologia })).termos).toBe(
+      `${INICIO}Correção a partir do mês seguinte ao do vencimento, pelos meses inteiros até set/2026, último índice divulgado; juros até a data do cálculo.`,
+    );
+  });
+
+  it("pro rata no mês final, quando a data do cálculo é passada e o índice do mês já saiu (§7, ponto 1)", () => {
+    const calculo = calculoDeTeste({
+      dataElaboracao: "2026-08-15",
+      lancamentos: [prestacao("2026-03-05")],
+    });
+    expect(textos(calculo).termos).toBe(
+      `${INICIO}Correção pelo índice do mês do vencimento, proporcional aos dias restantes (pro rata), e pelos meses seguintes até jul/2026 e, no mês do cálculo, pelo índice de ago/2026 proporcional aos 15 dias decorridos; juros até a data do cálculo.`,
+    );
+  });
+
+  it("lançamentos com encargos próprios: remissão às notas das tabelas", () => {
+    const calculo = calculoDeTeste({
+      lancamentos: [
+        prestacao("2024-10-05"),
+        prestacao("2024-11-05", { encargos: { termoInicialJuros: "2025-01-10" }, editado: true }),
+      ],
+    });
+    expect(textos(calculo).termos).toBe(
+      `${INICIO}Correção pelo índice do mês do vencimento, proporcional aos dias restantes (pro rata), e pelos meses seguintes até set/2026, último índice divulgado; juros até a data do cálculo. Os lançamentos marcados “encargos próprios” seguem os termos e as regras indicados nas notas das tabelas.`,
+    );
+  });
+
+  it("só vincendas: sem o parágrafo", () => {
+    const calculo = calculoDeTeste({ lancamentos: [prestacao("2026-11-05")] });
+    expect(textos(calculo).termos).toBe(null);
+    expect(textos(calculo).encargos).toBe(null);
+  });
+});
+
+describe("Encargos (§18.5)", () => {
+  it("Lei 14.905/2024 com lançamentos dos dois lados de 30/08/2024: o texto aprovado, na íntegra", () => {
+    expect(textos(calculoDeTeste()).encargos).toBe(ENCARGOS_LEI_14905);
+  });
+
+  it("Lei 14.905/2024 com tudo desde 30/08/2024: só o trecho aplicado, sem a data", () => {
+    const calculo = calculoDeTeste({
+      lancamentos: [prestacao("2024-10-05"), pagamento("2025-01-10", "100.00")],
+    });
+    expect(textos(calculo).encargos).toBe(
+      "IPCA (art. 389, parágrafo único, do CC) e juros pela taxa legal (art. 406, §1º, do CC; Lei 14.905/2024; Resolução CMN 5.171/2024), série 29543 do BCB, acumulada por juros simples e pro rata por dias corridos, sobre o valor corrigido.",
+    );
+  });
+
+  it("vencimento em 30/08/2024: o IGP-M de agosto entra na correção, e o período antigo é descrito", () => {
+    const calculo = calculoDeTeste({ lancamentos: [prestacao("2024-08-30")] });
+    expect(textos(calculo).encargos).toBe(ENCARGOS_LEI_14905);
+  });
+
+  it("IGP-M e juros de 1% ao mês (§17.3)", () => {
+    const calculo = calculoDeTeste({ metodologia: metodologiaDaOpcao("igpmJuros1") });
+    expect(textos(calculo).encargos).toBe(
+      "IGP-M e juros de 1% ao mês, simples, pro rata die, do vencimento até a data do cálculo, sobre o valor corrigido.",
+    );
+  });
+
+  it("metodologia ajustada com três períodos, SELIC única e 2% ao mês", () => {
+    const calculo = calculoDeTeste({
+      metodologia: metodologiaDeTresPeriodos(),
+      lancamentos: [prestacao("2024-12-05")],
+    });
+    expect(textos(calculo).encargos).toBe(
+      "Até 31/12/2024, INPC e juros de 2% ao mês, simples, pro rata die; de 01/01/2025 a 30/06/2025, SELIC (série 4390 do BCB) como índice único de correção e juros, capitalizada mês a mês; desde 01/07/2025, IPCA (art. 389, parágrafo único, do CC) e juros pela taxa legal (art. 406, §1º, do CC; Lei 14.905/2024; Resolução CMN 5.171/2024), série 29543 do BCB, acumulada por juros simples e pro rata por dias corridos, sobre o valor corrigido.",
+    );
+  });
+
+  it("SELIC única sozinha: sem “sobre o valor corrigido” e sem juros nos termos", () => {
+    const metodologia: Metodologia = {
+      ...metodologiaDaOpcao("lei14905"),
+      ajustada: true,
+      periodos: [
+        { de: null, ate: null, correcao: { indice: "nenhum" }, juros: { tipo: "selicUnica" } },
+      ],
+    };
+    const t = textos(calculoDeTeste({ metodologia }));
+    expect(t.encargos).toBe(
+      "SELIC (série 4390 do BCB) como índice único de correção e juros, capitalizada mês a mês, do vencimento até a data do cálculo.",
+    );
+    expect(t.termos).not.toContain("juros até a data do cálculo");
+  });
+
+  it("taxa com casas decimais e juros zero", () => {
+    const metodologia: Metodologia = {
+      ...metodologiaDaOpcao("igpmJuros1"),
+      ajustada: true,
+      periodos: [
+        {
+          de: null,
+          ate: "2024-12-31",
+          correcao: { indice: "IGP-M" },
+          juros: { tipo: "percentualMensal", taxaMensal: "0.5" },
+        },
+        {
+          de: "2025-01-01",
+          ate: null,
+          correcao: { indice: "INPC" },
+          juros: { tipo: "percentualMensal", taxaMensal: "0" },
+        },
+      ],
+    };
+    expect(textos(calculoDeTeste({ metodologia })).encargos).toBe(
+      "Até 31/12/2024, IGP-M e juros de 0,5% ao mês, simples, pro rata die, sobre o valor corrigido; desde 01/01/2025, INPC e sem juros.",
+    );
+  });
+});
+
+describe("Deflação (§18.5)", () => {
+  // IGP-M de mai a jul/2025 negativo: a prestação de 10/05/2025 calculada em 31/07/2025 fica com
+  // fator abaixo de 1
+  const comDeflacao = (deflacao: Metodologia["deflacao"]) =>
+    textos(
+      calculoDeTeste({
+        dataElaboracao: "2025-07-31",
+        metodologia: { ...metodologiaDaOpcao("igpmJuros1"), deflacao },
+        lancamentos: [prestacao("2025-05-10")],
+      }),
+    ).deflacao;
+
+  it("só quando um índice negativo entrou na conta (e, com piso, só se o piso atuou)", () => {
+    expect(comDeflacao("aplicarComPiso")).toBe(
+      "Índices negativos computados; o valor corrigido não fica inferior ao original.",
+    );
+    expect(comDeflacao("aplicarSemPiso")).toBe("Índices negativos computados, sem piso.");
+    expect(comDeflacao("zerarNegativos")).toBe(
+      "Índices negativos desconsiderados (tomados como zero).",
+    );
+    // índices negativos sem o piso atuar (fator final acima de 1): sem o parágrafo
+    expect(textos(calculoDeTeste()).deflacao).toBe(null);
+  });
+});
+
+describe("Fontes e arredondamento (§18.5)", () => {
+  it("as séries usadas em ordem numérica, com nome; os meses sem índice por série", () => {
+    const calculo = calculoDeTeste({
+      metodologia: metodologiaDaOpcao("igpmJuros1"),
+      base: baseUnica({ tipo: "percentualSalarioMinimo", percentual: "30" }),
+    });
+    const semSetembro = tabelaRegimeNovo({ "189": "2026-08" });
+    expect(textos(calculo, semSetembro).fontes).toBe(
+      "Índices do Sistema Gerenciador de Séries Temporais do Banco Central (IGP-M, série 189; salário mínimo, série 1619), atualizados em 11/10/2026 09:00 (horário de Brasília). Arredondamento comercial: fator e percentual de juros com 6 casas, valores com 2 casas por lançamento. Meses sem índice divulgado na data da consulta, computados sem correção: IGP-M de set/2026 e out/2026.",
+    );
+  });
+});
+
+describe("o texto acompanha o que o motor aplicou (revisão do ensaio)", () => {
+  const INICIO =
+    "Encargos desde o vencimento de cada prestação (mora automática, art. 397 do CC). ";
+  const TAXA_LEGAL =
+    "juros pela taxa legal (art. 406, §1º, do CC; Lei 14.905/2024; Resolução CMN 5.171/2024), série 29543 do BCB, acumulada por juros simples e pro rata por dias corridos";
+  const umPeriodo = (periodo: Metodologia["periodos"][number]): Metodologia => ({
+    ...metodologiaDaOpcao("igpmJuros1"),
+    ajustada: true,
+    periodos: [periodo],
+  });
+
+  it("Encargos: só os períodos que a correção (meses com fração) ou os juros de fato alcançaram", () => {
+    // termos finais antes de 30/08/2024 (depósito judicial): não houve IPCA nem taxa legal
+    const deposito = calculoDeTeste({
+      lancamentos: [
+        prestacao("2024-07-05", {
+          encargos: { termoFinalCorrecao: "2024-07-31", termoFinalJuros: "2024-07-31" },
+        }),
+      ],
+    });
+    expect(textos(deposito).encargos).toBe(
+      "IGP-M e juros de 1% ao mês, simples, pro rata die, sobre o valor corrigido.",
+    );
+    // vencimento em 31/08/2024: o IGP-M de agosto entra com fração 0/31 e os juros começam em 31/08
+    const ultimoDia = calculoDeTeste({ lancamentos: [prestacao("2024-08-31")] });
+    expect(textos(ultimoDia).encargos).toBe(
+      `IPCA (art. 389, parágrafo único, do CC) e ${TAXA_LEGAL}, sobre o valor corrigido.`,
+    );
+    // correção a partir do mês seguinte e vencimento em 30/08/2024
+    const seguinte = calculoDeTeste({
+      metodologia: { ...metodologiaDaOpcao("lei14905"), incidenciaMesInicial: "mesSeguinte" },
+      lancamentos: [prestacao("2024-08-30")],
+    });
+    expect(textos(seguinte).encargos).toBe(
+      `IPCA (art. 389, parágrafo único, do CC) e ${TAXA_LEGAL}, sobre o valor corrigido.`,
+    );
+  });
+
+  it("Encargos: “sobre o valor corrigido” logo depois do último período com juros separados", () => {
+    const metodologia: Metodologia = {
+      ...metodologiaDaOpcao("lei14905"),
+      ajustada: true,
+      periodos: [
+        { de: null, ate: "2024-12-31", correcao: { indice: "IPCA" }, juros: { tipo: "taxaLegal" } },
+        {
+          de: "2025-01-01",
+          ate: null,
+          correcao: { indice: "nenhum" },
+          juros: { tipo: "selicUnica" },
+        },
+      ],
+    };
+    expect(
+      textos(calculoDeTeste({ metodologia, lancamentos: [prestacao("2024-12-05")] })).encargos,
+    ).toBe(
+      `Até 31/12/2024, IPCA e ${TAXA_LEGAL}, sobre o valor corrigido; desde 01/01/2025, SELIC (série 4390 do BCB) como índice único de correção e juros, capitalizada mês a mês.`,
+    );
+  });
+
+  it("Termos: sem juros (taxa zero) não fala em juros; sem correção não fala em correção", () => {
+    const semJuros = calculoDeTeste({
+      metodologia: umPeriodo({
+        de: null,
+        ate: null,
+        correcao: { indice: "INPC" },
+        juros: { tipo: "percentualMensal", taxaMensal: "0" },
+      }),
+      lancamentos: [prestacao("2025-03-05")],
+    });
+    expect(textos(semJuros).termos).toBe(
+      `${INICIO}Correção pelo índice do mês do vencimento, proporcional aos dias restantes (pro rata), e pelos meses seguintes até set/2026, último índice divulgado.`,
+    );
+    const semCorrecao = calculoDeTeste({
+      metodologia: umPeriodo({
+        de: null,
+        ate: null,
+        correcao: { indice: "nenhum" },
+        juros: { tipo: "percentualMensal", taxaMensal: "1" },
+      }),
+      lancamentos: [prestacao("2025-03-05")],
+    });
+    expect(textos(semCorrecao).termos).toBe(`${INICIO}Juros até a data do cálculo.`);
+  });
+
+  it("Termos: só pagamentos atualizados (prestações vincendas) falam da data do pagamento", () => {
+    const calculo = calculoDeTeste({
+      lancamentos: [prestacao("2026-11-05"), pagamento("2025-01-10", "100.00")],
+    });
+    expect(textos(calculo).termos).toBe(
+      "Correção pelo índice do mês do pagamento, proporcional aos dias restantes (pro rata), e pelos meses seguintes até set/2026, último índice divulgado; juros até a data do cálculo.",
+    );
+  });
+
+  it("Termos com SELIC única: o mês do cálculo entra pelo valor parcial já divulgado", () => {
+    const calculo = calculoDeTeste({
+      metodologia: umPeriodo({
+        de: null,
+        ate: null,
+        correcao: { indice: "nenhum" },
+        juros: { tipo: "selicUnica" },
+      }),
+      lancamentos: [prestacao("2025-01-05")],
+    });
+    expect(textos(calculo).termos).toBe(
+      `${INICIO}Correção pelo índice do mês do vencimento, proporcional aos dias restantes (pro rata), e pelos meses seguintes até out/2026 (no mês do cálculo, o valor parcial já divulgado).`,
+    );
+  });
+
+  it("Base: vários meses faltantes no plural; mês do reajuste inválido fica “sem reajuste”, como o motor", () => {
+    const forma: FormaDaBase = {
+      tipo: "valorFixo",
+      valor: "500.00",
+      dataFixacao: "2024-03-15",
+      indiceReajuste: "IPCA",
+      mesReajuste: 3,
+    };
+    const tabela = tabelaRegimeNovo();
+    delete tabela.series["433"]?.["2025-05"];
+    delete tabela.series["433"]?.["2025-06"];
+    const faltando = calculoDeTeste({
+      base: baseUnica(forma),
+      lancamentos: [prestacao("2026-09-05")],
+    });
+    expect(textos(faltando, tabela).base).toContain(
+      "o reajuste de mar/2026 não foi aplicado (IPCA de mai/2025 e jun/2025 não disponíveis na tabela de índices).",
+    );
+    const invalido = calculoDeTeste({
+      base: baseUnica({ ...forma, mesReajuste: 13 }),
+      lancamentos: [prestacao("2025-04-05")],
+    });
+    expect(textos(invalido).base).toBe(
+      "Valor fixo de R$ 500,00, fixado em 15/03/2024, sem reajuste.",
+    );
+  });
+});
diff --git a/src/relatorio/testes/calculos.ts b/src/relatorio/testes/calculos.ts
new file mode 100644
index 0000000..ae4977c
--- /dev/null
+++ b/src/relatorio/testes/calculos.ts
@@ -0,0 +1,111 @@
+import type {
+  Calculo,
+  FormaDaBase,
+  Lancamento,
+  Metodologia,
+  Resultado,
+  TabelaIndices,
+} from "../../compartilhado/tipos.ts";
+import { metodologiaDaOpcao } from "../../metodologias/padrao.ts";
+import { baseUnica } from "../../motor/base.ts";
+import { calcular } from "../../motor/calcular.ts";
+import { tabelaRegimeNovo } from "../../motor/testes/regime-novo.ts";
+
+/**
+ * Cálculos de exemplo para os testes do relatório: a tabela fixa de 2024–2026 dos testes do
+ * motor (nunca a cópia publicada), data do cálculo 11/10/2026 e dados fictícios.
+ */
+
+export const DATA_DO_CALCULO = "2026-10-11";
+
+export const VALOR_FIXO_500: FormaDaBase = {
+  tipo: "valorFixo",
+  valor: "500.00",
+  dataFixacao: "2024-07-01",
+  indiceReajuste: "nenhum",
+  mesReajuste: 7,
+};
+
+export function prestacao(data: string, extra: Partial<Lancamento> = {}): Lancamento {
+  return {
+    id: `p-${data}`,
+    tipo: "prestacao",
+    data,
+    competencia: data.slice(0, 7),
+    origem: "lote",
+    editado: false,
+    ...extra,
+  };
+}
+
+export function pagamento(
+  data: string,
+  valor: string,
+  extra: Partial<Lancamento> = {},
+): Lancamento {
+  return {
+    id: `a-${data}`,
+    tipo: "amortizacao",
+    data,
+    descricao: "Pagamento parcial",
+    valorInformado: valor,
+    origem: "lote",
+    editado: false,
+    ...extra,
+  };
+}
+
+export function calculoDeTeste(mudancas: Partial<Calculo> = {}): Calculo {
+  return {
+    formato: "apura/calculo@1",
+    tipo: "alimentos",
+    id: "calculo-de-teste",
+    criadoEm: "2026-10-11T09:00:00-03:00",
+    atualizadoEm: "2026-10-11T09:00:00-03:00",
+    dataElaboracao: DATA_DO_CALCULO,
+    cabecalho: {
+      defensor: "Defensor(a) de teste",
+      orgao: "1ª Defensoria Pública de Teste",
+      processo: "0800000-46.2026.8.12.0001",
+      exequente: "A. B.",
+      executado: "C. D.",
+    },
+    base: baseUnica(VALOR_FIXO_500),
+    lotes: {},
+    lancamentos: [prestacao("2024-07-05"), prestacao("2024-10-05")],
+    metodologia: metodologiaDaOpcao("lei14905"),
+    acrescimos: { multaPercentual: "10", honorariosPercentual: "10" },
+    observacoes: "",
+    ...mudancas,
+  };
+}
+
+export function resultadoDe(
+  calculo: Calculo,
+  tabela: TabelaIndices = tabelaRegimeNovo(),
+): Resultado {
+  return calcular(calculo, tabela);
+}
+
+/** Uma metodologia de três períodos: INPC e 2% ao mês; SELIC única; IPCA e taxa legal. */
+export function metodologiaDeTresPeriodos(): Metodologia {
+  return {
+    ...metodologiaDaOpcao("lei14905"),
+    ajustada: true,
+    periodos: [
+      {
+        de: null,
+        ate: "2024-12-31",
+        correcao: { indice: "INPC" },
+        juros: { tipo: "percentualMensal", taxaMensal: "2" },
+      },
+      {
+        de: "2025-01-01",
+        ate: "2025-06-30",
+        correcao: { indice: "nenhum" },
+        juros: { tipo: "selicUnica" },
+      },
+      { de: "2025-07-01", ate: null, correcao: { indice: "IPCA" }, juros: { tipo: "taxaLegal" } },
+    ],
+  };
+}
```

- [ ] **Step 2: Ver falhar**

Run: `npx vitest run`

Expected: FAIL, o arquivo de teste inteiro, porque o módulo ainda não existe: `FAIL  src/relatorio/metodologia.test.ts` com `Error: Cannot find module './metodologia.ts'`.

Resumo: `Test Files  1 failed | 46 passed (47)`, `Tests  864 passed | 10 skipped (874)`.

- [ ] **Step 3: Aplicar o patch do código** (salvar em `$RASCUNHO/t2-codigo.patch` e `git apply --whitespace=nowarn`)

```diff
diff --git a/src/relatorio/metodologia.ts b/src/relatorio/metodologia.ts
new file mode 100644
index 0000000..e3d3b04
--- /dev/null
+++ b/src/relatorio/metodologia.ts
@@ -0,0 +1,566 @@
+import { competenciaDe, primeiroDiaDoMes } from "../compartilhado/datas.ts";
+import { decimal, decimalOuNulo } from "../compartilhado/decimal.ts";
+import {
+  formatarCompetencia,
+  formatarData,
+  formatarMoeda,
+  formatarPercentual,
+} from "../compartilhado/formatacao.ts";
+import { CODIGO_DA_SERIE, NOME_DA_SERIE } from "../compartilhado/tipos.ts";
+import type {
+  Calculo,
+  CodigoSerie,
+  Competencia,
+  DataISO,
+  FormaDaBase,
+  Metodologia,
+  PeriodoDaBase,
+  PeriodoMetodologia,
+  ReajusteDaBase,
+  Resultado,
+} from "../compartilhado/tipos.ts";
+import { formatarDataHoraBrasilia } from "../indices/relogio.ts";
+import { descreverPeriodoDaBase, periodosDaBaseOrdenados } from "../motor/base.ts";
+import { periodosOrdenados, periodoVigenteEm } from "../motor/periodos.ts";
+import {
+  comSinalDeMenos,
+  listar,
+  maiuscula,
+  MESES_POR_EXTENSO,
+  pares,
+  percentualInformado,
+  type Par,
+} from "./texto.ts";
+
+/**
+ * "Metodologia e fundamentos" (§10.4, §18.4 e §18.5): parágrafos gerados do que foi aplicado,
+ * nunca de parâmetros do sistema (nome da opção de metodologia, versão, "ajuste"). Cada parágrafo
+ * só aparece quando há o que dizer. Lê só o Cálculo e o Resultado. Módulo puro.
+ */
+
+export interface Paragrafo {
+  titulo: string;
+  texto: string;
+}
+
+const MORA = "Encargos desde o vencimento de cada prestação (mora automática, art. 397 do CC).";
+const TAXA_LEGAL =
+  "juros pela taxa legal (art. 406, §1º, do CC; Lei 14.905/2024; Resolução CMN 5.171/2024), série 29543 do BCB, acumulada por juros simples e pro rata por dias corridos";
+const SELIC_UNICA =
+  "SELIC (série 4390 do BCB) como índice único de correção e juros, capitalizada mês a mês";
+/** Primeiro dia do regime da Lei 14.905/2024: o IPCA a partir dele leva o art. 389 do CC. */
+const INICIO_LEI_14905: DataISO = "2024-08-30";
+
+export function metodologiaEFundamentos(calculo: Calculo, resultado: Resultado): Paragrafo[] {
+  const candidatos: Array<[string, string | null]> = [
+    ["Base.", paragrafoBase(calculo, resultado)],
+    ["Termos.", paragrafoTermos(calculo, resultado)],
+    ["Encargos.", paragrafoEncargos(calculo, resultado)],
+    ["Amortizações.", paragrafoAmortizacoes(calculo, resultado)],
+    ["Multa e honorários.", paragrafoMultaEHonorarios(calculo)],
+    ["Deflação.", paragrafoDeflacao(calculo, resultado)],
+    ["Observações.", calculo.observacoes.trim() === "" ? null : calculo.observacoes.trim()],
+    ["Fontes e arredondamento.", paragrafoFontes(calculo, resultado)],
+  ];
+  return candidatos.flatMap(([titulo, texto]) => (texto === null ? [] : [{ titulo, texto }]));
+}
+
+// ---------------------------------------------------------------------------------------------
+// Base
+// ---------------------------------------------------------------------------------------------
+
+/** Prestação apurada pela base (sem valor informado), que a frase da base descreve. */
+function pelaBase(p: Par): boolean {
+  return p.lancamento.tipo === "prestacao" && p.lancamento.valorInformado === undefined;
+}
+
+function noPeriodo(periodo: PeriodoDaBase, data: DataISO): boolean {
+  return (
+    (periodo.de === null || periodo.de <= data) && (periodo.ate === null || data <= periodo.ate)
+  );
+}
+
+function moedaDoTexto(texto: string): string | null {
+  const valor = decimalOuNulo(texto);
+  return valor === null ? null : formatarMoeda(valor);
+}
+
+/** "em mar/2025 (IPCA de mar/2024 a fev/2025: 5,0576%)" */
+function descreverReajuste(r: ReajusteDaBase): string {
+  const janela = `${r.indice} de ${formatarCompetencia(r.de)} a ${formatarCompetencia(r.ate)}: ${comSinalDeMenos(formatarPercentual(decimal(r.percentual ?? "0"), 4))}`;
+  const mantido = r.situacao === "mantido" ? ", acumulado não positivo: valor mantido" : "";
+  return `em ${formatarCompetencia(r.em)} (${janela}${mantido})`;
+}
+
+/** "; o reajuste de nov/2026 não foi aplicado (IPCA de out/2026 ainda não divulgado na data da consulta)" */
+function descreverNaoAplicado(r: ReajusteDaBase): string {
+  const faltantes = r.faltantes ?? [];
+  const meses = listar(faltantes.map(formatarCompetencia));
+  const varios = faltantes.length > 1;
+  const motivo = r.aindaNaoDivulgados
+    ? `ainda não ${varios ? "divulgados" : "divulgado"} na data da consulta`
+    : `não ${varios ? "disponíveis" : "disponível"} na tabela de índices`;
+  return `; o reajuste de ${formatarCompetencia(r.em)} não foi aplicado (${r.indice} de ${meses} ${motivo})`;
+}
+
+function fraseDoValorFixo(
+  forma: Extract<FormaDaBase, { tipo: "valorFixo" }>,
+  doPeriodo: Par[],
+  resultado: Resultado,
+): string | null {
+  const valor = moedaDoTexto(forma.valor);
+  if (valor === null) return null;
+  const inicio = `valor fixo de ${valor}, fixado em ${formatarData(forma.dataFixacao)}`;
+  if (forma.indiceReajuste === "nenhum") return `${inicio}, sem reajuste`;
+  if (forma.indiceReajuste === "SM") {
+    const mesFixacao = competenciaDe(forma.dataFixacao);
+    const salario = resultado.indicesUsados.find(
+      (i) => i.serie === CODIGO_DA_SERIE.SM && i.competencia === mesFixacao,
+    );
+    const nota =
+      salario === undefined
+        ? ""
+        : ` (salário mínimo de ${formatarCompetencia(mesFixacao)}: ${formatarMoeda(decimal(salario.valor))})`;
+    return `${inicio}, reajustado na proporção do salário mínimo vigente no mês de cada vencimento${nota}`;
+  }
+  // Mês do reajuste fora de 1 a 12 (só com arquivo fora do padrão): o motor não reajusta.
+  if (!Number.isInteger(forma.mesReajuste) || forma.mesReajuste < 1 || forma.mesReajuste > 12) {
+    return `${inicio}, sem reajuste`;
+  }
+  // Os reajustes da prestação de vencimento mais recente apurada pela base no período (§18.5).
+  const ultima = doPeriodo
+    .filter((p) => p.calculado.reajustes !== undefined)
+    .sort((a, b) => (a.lancamento.data < b.lancamento.data ? -1 : 1))
+    .at(-1);
+  const reajustes = ultima?.calculado.reajustes ?? [];
+  const feitos = reajustes.filter((r) => r.situacao !== "naoAplicado");
+  const naoAplicado = reajustes.find((r) => r.situacao === "naoAplicado");
+  const indice = forma.indiceReajuste;
+  let frase: string;
+  if (feitos.length > 0) {
+    const valorFinal = feitos.at(-1)?.valor ?? forma.valor;
+    frase = `${inicio}, reajustado pelo ${indice} acumulado desde o reajuste anterior: ${listar(feitos.map(descreverReajuste))}, chegando a ${formatarMoeda(decimal(valorFinal))}`;
+  } else {
+    const mes = MESES_POR_EXTENSO[forma.mesReajuste - 1] ?? "";
+    frase = `${inicio}, com reajuste anual pelo ${indice} acumulado, em ${mes}`;
+    if (naoAplicado === undefined && ultima !== undefined) {
+      frase += "; não houve reajuste até o último vencimento";
+    }
+  }
+  return naoAplicado === undefined ? frase : frase + descreverNaoAplicado(naoAplicado);
+}
+
+function fraseDosRendimentos(
+  forma: Extract<FormaDaBase, { tipo: "percentualRendimentos" }>,
+  doPeriodo: Par[],
+): string | null {
+  const percentual = percentualInformado(forma.percentual);
+  if (percentual === null) return null;
+  const proprios = doPeriodo
+    .filter((p) => p.lancamento.rendimento !== undefined)
+    .map((p) => {
+      const descricao = p.lancamento.descricao?.trim();
+      const quando = `${formatarData(p.lancamento.data)}${descricao ? ` (${descricao})` : ""}`;
+      return `${quando}, ${moedaDoTexto(p.lancamento.rendimento ?? "") ?? ""}`;
+    });
+  const padrao = moedaDoTexto(forma.rendimentoPadrao);
+  const inicio = `${percentual} dos rendimentos do executado`;
+  if (padrao === null) return `${inicio}, sobre o rendimento de cada mês: ${proprios.join("; ")}`;
+  const frase = `${inicio}, sobre o rendimento mensal de ${padrao}`;
+  return proprios.length === 0
+    ? frase
+    : `${frase}; nos meses com rendimento próprio, sobre ele: ${proprios.join("; ")}`;
+}
+
+function fraseDaForma(forma: FormaDaBase, doPeriodo: Par[], resultado: Resultado): string | null {
+  switch (forma.tipo) {
+    case "valorFixo":
+      return fraseDoValorFixo(forma, doPeriodo, resultado);
+    case "percentualSalarioMinimo": {
+      const percentual = percentualInformado(forma.percentual);
+      return percentual === null
+        ? null
+        : `${percentual} do salário mínimo vigente no mês de cada vencimento`;
+    }
+    case "percentualRendimentos":
+      return fraseDosRendimentos(forma, doPeriodo);
+  }
+}
+
+/**
+ * Base (§18.5): uma frase por período em que vence alguma prestação apurada pela base; com dois
+ * ou mais períodos na base, cada frase começa pelo intervalo (§17.2). Complementos: prestações
+ * anteriores à fixação e valores informados à mão.
+ */
+export function paragrafoBase(calculo: Calculo, resultado: Resultado): string | null {
+  const todos = pares(calculo, resultado);
+  const apuradas = todos.filter(pelaBase);
+  const periodos = periodosDaBaseOrdenados(calculo.base);
+  const frases: string[] = [];
+  let anteriorAFixacao = false;
+  for (const periodo of periodos) {
+    const doPeriodo = apuradas.filter((p) => noPeriodo(periodo, p.lancamento.data));
+    if (doPeriodo.length === 0) continue;
+    const frase = fraseDaForma(periodo.forma, doPeriodo, resultado);
+    if (frase === null) continue;
+    frases.push(periodos.length > 1 ? `${descreverPeriodoDaBase(periodo)}, ${frase}` : frase);
+    const forma = periodo.forma;
+    if (
+      forma.tipo === "valorFixo" &&
+      doPeriodo.some((p) => competenciaDe(p.lancamento.data) < competenciaDe(forma.dataFixacao))
+    ) {
+      anteriorAFixacao = true;
+    }
+  }
+  const textos: string[] = [];
+  if (frases.length > 0) textos.push(`${maiuscula(frases.join("; "))}.`);
+  if (anteriorAFixacao) {
+    textos.push("As prestações vencidas antes da fixação entram pelo valor fixado, sem reajuste.");
+  }
+  if (todos.some((p) => p.calculado.editado)) {
+    textos.push(
+      "Nas prestações marcadas “valor informado”, vale o valor indicado na tabela, em vez do apurado pela base.",
+    );
+  }
+  return textos.length === 0 ? null : textos.join(" ");
+}
+
+// ---------------------------------------------------------------------------------------------
+// Termos e encargos
+// ---------------------------------------------------------------------------------------------
+
+const atualizados = (calculo: Calculo, resultado: Resultado): Par[] =>
+  pares(calculo, resultado).filter((p) => p.calculado.situacao === "atualizado");
+
+function sobrepoe(p: PeriodoMetodologia, inicio: DataISO, fim: DataISO): boolean {
+  return (p.de === null || p.de <= fim) && (p.ate === null || inicio <= p.ate);
+}
+
+/**
+ * Os períodos da metodologia que os lançamentos de fato alcançaram, pelo resultado de cada um
+ * (§18.5): pela correção, o período do primeiro dia de cada mês que entrou com fração (o mês do
+ * vencimento com fração zero, ou fora pela incidência a partir do mês seguinte, não conta); pelos
+ * juros, os períodos que cada trecho de juros toca. Os termos próprios já estão no resultado.
+ */
+export function periodosAlcancados(m: Metodologia, lista: Par[]): PeriodoMetodologia[] {
+  const periodos = periodosOrdenados(m);
+  const alcancados = new Set<PeriodoMetodologia>();
+  for (const { calculado } of lista) {
+    for (const i of calculado.correcao.indices) {
+      if (i.fracao.startsWith("0/")) continue;
+      const periodo = periodoVigenteEm(m, primeiroDiaDoMes(i.competencia));
+      if (periodo !== undefined) alcancados.add(periodo);
+    }
+    for (const d of calculado.juros.detalhe) {
+      for (const periodo of periodos) if (sobrepoe(periodo, d.de, d.ate)) alcancados.add(periodo);
+    }
+  }
+  return periodos.filter((p) => alcancados.has(p));
+}
+
+/** Os períodos com os mesmos índices e juros (a taxa comparada como número). */
+export function mesmasRegras(a: Metodologia, b: Metodologia): boolean {
+  const regras = (m: Metodologia) =>
+    JSON.stringify(
+      periodosOrdenados(m).map((p) => [
+        p.de,
+        p.ate,
+        p.correcao.indice,
+        p.juros.tipo,
+        p.juros.tipo === "percentualMensal"
+          ? (decimalOuNulo(p.juros.taxaMensal)?.toString() ?? p.juros.taxaMensal)
+          : null,
+      ]),
+    );
+  return regras(a) === regras(b);
+}
+
+const DEFLACAO_CURTA: Record<Metodologia["deflacao"], string> = {
+  aplicarComPiso:
+    "índices negativos computados, sem que o valor corrigido fique inferior ao original",
+  aplicarSemPiso: "índices negativos computados, sem piso",
+  zerarNegativos: "índices negativos desconsiderados (tomados como zero)",
+};
+
+/** "correção desde 10/04/2025", "correção até 30/06/2026", "correção de 10/04/2025 a 30/06/2026". */
+function termo(nome: string, inicio?: string, fim?: string): string | null {
+  if (inicio !== undefined && fim !== undefined) {
+    return `${nome} de ${formatarData(inicio)} a ${formatarData(fim)}`;
+  }
+  if (inicio !== undefined) return `${nome} desde ${formatarData(inicio)}`;
+  if (fim !== undefined) return `${nome} até ${formatarData(fim)}`;
+  return null;
+}
+
+/**
+ * O que os encargos de um lançamento têm de diferente dos do cálculo (§18.3, nota "Encargos
+ * próprios"): os termos próprios; e, com metodologia própria, as regras dos períodos que o
+ * lançamento alcançou (quando não são as do cálculo), a incidência no mês inicial e a deflação
+ * (quando diferem). Lista vazia: nada difere, e a linha não leva a palavra "encargos próprios".
+ */
+export function diferencasDosEncargos(par: Par, calculo: Calculo): string[] {
+  const e = par.lancamento.encargos ?? {};
+  const partes = [
+    termo("correção", e.termoInicialCorrecao, e.termoFinalCorrecao),
+    termo("juros", e.termoInicialJuros, e.termoFinalJuros),
+  ].filter((p): p is string => p !== null);
+  const propria = e.metodologia;
+  if (propria === undefined) return partes;
+  const global = calculo.metodologia;
+  if (!mesmasRegras(propria, global)) {
+    partes.push(regrasResumidas(propria, periodosAlcancados(propria, [par])));
+  }
+  if (propria.incidenciaMesInicial !== global.incidenciaMesInicial) {
+    const data = par.lancamento.tipo === "prestacao" ? "vencimento" : "pagamento";
+    partes.push(
+      propria.incidenciaMesInicial === "mesSeguinte"
+        ? `correção a partir do mês seguinte ao do ${data}`
+        : `correção pelo índice do mês do ${data}, proporcional aos dias restantes (pro rata)`,
+    );
+  }
+  if (propria.deflacao !== global.deflacao) partes.push(DEFLACAO_CURTA[propria.deflacao]);
+  return partes;
+}
+
+/**
+ * Termos (§18.5): a regra comum, descrita a partir dos lançamentos atualizados sem encargos
+ * próprios e só com o que eles tiveram (correção, se algum mês entrou com índice; juros, se o
+ * percentual passou de zero; o último mês inteiro com índice; o pro rata no mês do cálculo; o
+ * valor parcial da SELIC no mês do cálculo); a mora fala das prestações, e, só com pagamentos, a
+ * correção fala da data do pagamento. Com lançamentos de encargos próprios, a remissão às notas.
+ */
+export function paragrafoTermos(calculo: Calculo, resultado: Resultado): string | null {
+  const lista = atualizados(calculo, resultado);
+  if (lista.length === 0) return null;
+  const comuns = lista.filter((p) => diferencasDosEncargos(p, calculo).length === 0);
+  const frases: string[] = [];
+  if (lista.some((p) => p.lancamento.tipo === "prestacao")) frases.push(MORA);
+
+  const mesDoCalculo = competenciaDe(calculo.dataElaboracao);
+  let comCorrecao = false;
+  let ultimoInteiro: Competencia | null = null;
+  let proRataFinal: { competencia: Competencia; dias: number } | null = null;
+  for (const { lancamento, calculado } of comuns) {
+    for (const i of calculado.correcao.indices) {
+      if (i.serie === null || i.fracao.startsWith("0/")) continue;
+      comCorrecao = true;
+      if (i.valor === null) continue;
+      if (i.fracao === "1") {
+        if (ultimoInteiro === null || i.competencia > ultimoInteiro) ultimoInteiro = i.competencia;
+      } else if (
+        i.competencia === mesDoCalculo &&
+        competenciaDe(lancamento.data) !== mesDoCalculo
+      ) {
+        proRataFinal = { competencia: i.competencia, dias: Number(i.fracao.split("/")[0]) };
+      }
+    }
+  }
+  const comJuros = comuns.some((p) => decimal(p.calculado.juros.percentual).gt(0));
+  const data = comuns.some((p) => p.lancamento.tipo === "prestacao") ? "vencimento" : "pagamento";
+  const mesSeguinte = calculo.metodologia.incidenciaMesInicial === "mesSeguinte";
+  let correcao: string | null = null;
+  if (comCorrecao) {
+    // o mês do cálculo com índice inteiro só ocorre com o valor parcial da SELIC (§6.4)
+    const ate =
+      ultimoInteiro === null
+        ? null
+        : ultimoInteiro === mesDoCalculo
+          ? `até ${formatarCompetencia(ultimoInteiro)} (no mês do cálculo, o valor parcial já divulgado)`
+          : `até ${formatarCompetencia(ultimoInteiro)}${proRataFinal === null ? ", último índice divulgado" : ""}`;
+    const inicio = mesSeguinte
+      ? `Correção a partir do mês seguinte ao do ${data}`
+      : `Correção pelo índice do mês do ${data}, proporcional aos dias restantes (pro rata)`;
+    const meses =
+      ate === null
+        ? ""
+        : mesSeguinte
+          ? `, pelos meses inteiros ${ate}`
+          : `, e pelos meses seguintes ${ate}`;
+    const final =
+      proRataFinal === null
+        ? ""
+        : ` e, no mês do cálculo, pelo índice de ${formatarCompetencia(proRataFinal.competencia)} proporcional aos ${proRataFinal.dias} dias decorridos`;
+    correcao = `${inicio}${meses}${final}`;
+  }
+  if (correcao !== null && comJuros) frases.push(`${correcao}; juros até a data do cálculo.`);
+  else if (correcao !== null) frases.push(`${correcao}.`);
+  else if (comJuros) frases.push("Juros até a data do cálculo.");
+  if (comuns.length < lista.length) {
+    frases.push(
+      "Os lançamentos marcados “encargos próprios” seguem os termos e as regras indicados nas notas das tabelas.",
+    );
+  }
+  return frases.length === 0 ? null : frases.join(" ");
+}
+
+function taxaInformada(texto: string): string {
+  return decimalOuNulo(texto)?.toFixed().replace(".", ",") ?? texto;
+}
+
+/** "IPCA (art. 389, parágrafo único, do CC) e juros pela taxa legal (…)": as regras de um período. */
+function regraDoPeriodo(p: PeriodoMetodologia): { texto: string; jurosSeparados: boolean } {
+  if (p.juros.tipo === "selicUnica") return { texto: SELIC_UNICA, jurosSeparados: false };
+  const indice = p.correcao.indice;
+  const correcao =
+    indice === "nenhum"
+      ? "sem correção monetária"
+      : indice === "IPCA" && p.de !== null && p.de >= INICIO_LEI_14905
+        ? "IPCA (art. 389, parágrafo único, do CC)"
+        : indice;
+  if (p.juros.tipo === "taxaLegal") {
+    return { texto: `${correcao} e ${TAXA_LEGAL}`, jurosSeparados: true };
+  }
+  const taxa = decimalOuNulo(p.juros.taxaMensal);
+  if (taxa === null || taxa.isZero()) {
+    return { texto: `${correcao} e sem juros`, jurosSeparados: false };
+  }
+  return {
+    texto: `${correcao} e juros de ${taxaInformada(p.juros.taxaMensal)}% ao mês, simples, pro rata die`,
+    jurosSeparados: true,
+  };
+}
+
+/**
+ * Encargos (§18.5): os períodos da metodologia do cálculo que os lançamentos atualizados com ela
+ * (sem metodologia própria, ou com uma de mesmas regras) de fato alcançaram; com um só, sem o
+ * intervalo. "sobre o valor corrigido" vem logo depois do último período com juros separados.
+ */
+export function paragrafoEncargos(calculo: Calculo, resultado: Resultado): string | null {
+  const global = calculo.metodologia;
+  const daGlobal = atualizados(calculo, resultado).filter((p) => {
+    const propria = p.lancamento.encargos?.metodologia;
+    return propria === undefined || mesmasRegras(propria, global);
+  });
+  if (daGlobal.length === 0) return null;
+  const alcancados = periodosAlcancados(global, daGlobal);
+  if (alcancados.length === 0) return null;
+  const regras = alcancados.map(regraDoPeriodo);
+  const ultimoComJuros = regras.map((r) => r.jurosSeparados).lastIndexOf(true);
+  const corrigido = (i: number) => (i === ultimoComJuros ? ", sobre o valor corrigido" : "");
+  if (alcancados.length === 1) {
+    const unico =
+      periodosOrdenados(global).length === 1 ? ", do vencimento até a data do cálculo" : "";
+    return `${maiuscula(regras[0]?.texto ?? "")}${unico}${corrigido(0)}.`;
+  }
+  const trechos = alcancados.map(
+    (p, i) => `${descreverPeriodoDaBase(p)}, ${regras[i]?.texto ?? ""}${corrigido(i)}`,
+  );
+  return `${maiuscula(trechos.join("; "))}.`;
+}
+
+/**
+ * As regras de uma metodologia em poucas palavras, para as notas de encargos próprios (§18.3): os
+ * `periodos` dados (os que o lançamento alcançou) ou, sem eles, todos; com um só, sem o intervalo.
+ */
+export function regrasResumidas(m: Metodologia, periodos: PeriodoMetodologia[] = []): string {
+  const lista = periodos.length > 0 ? periodos : periodosOrdenados(m);
+  const curta = (p: PeriodoMetodologia): string => {
+    if (p.juros.tipo === "selicUnica") return "SELIC como índice único de correção e juros";
+    const correcao = p.correcao.indice === "nenhum" ? "sem correção monetária" : p.correcao.indice;
+    if (p.juros.tipo === "taxaLegal") return `${correcao} e juros pela taxa legal`;
+    const taxa = decimalOuNulo(p.juros.taxaMensal);
+    if (taxa === null || taxa.isZero()) return `${correcao} e sem juros`;
+    return `${correcao} e juros de ${taxaInformada(p.juros.taxaMensal)}% ao mês`;
+  };
+  if (lista.length === 1 && lista[0] !== undefined) return curta(lista[0]);
+  return lista.map((p) => `${descreverPeriodoDaBase(p)}, ${curta(p)}`).join("; ");
+}
+
+// ---------------------------------------------------------------------------------------------
+// Amortizações, multa e honorários, deflação, fontes
+// ---------------------------------------------------------------------------------------------
+
+function paragrafoAmortizacoes(calculo: Calculo, resultado: Resultado): string | null {
+  const algum = atualizados(calculo, resultado).some((p) => p.lancamento.tipo === "amortizacao");
+  return algum
+    ? "Cada pagamento é atualizado pelos mesmos critérios, da data do pagamento até a data do cálculo, e abatido do total atualizado."
+    : null;
+}
+
+function positivo(texto: string): string | null {
+  const valor = decimalOuNulo(texto);
+  return valor === null || !valor.gt(0) ? null : percentualInformado(texto);
+}
+
+function paragrafoMultaEHonorarios(calculo: Calculo): string | null {
+  const multa = positivo(calculo.acrescimos.multaPercentual);
+  const honorarios = positivo(calculo.acrescimos.honorariosPercentual);
+  if (multa !== null && honorarios !== null) {
+    return `Multa de ${multa} e honorários de ${honorarios} (art. 523, §1º, do CPC), cada um sobre o total devido atualizado, sem incidência dos honorários sobre a multa.`;
+  }
+  if (multa !== null)
+    return `Multa de ${multa} (art. 523, §1º, do CPC), sobre o total devido atualizado.`;
+  if (honorarios !== null) {
+    return `Honorários de ${honorarios} (art. 523, §1º, do CPC), sobre o total devido atualizado.`;
+  }
+  return null;
+}
+
+/**
+ * Deflação (§18.5): só quando um índice negativo entrou na conta de algum lançamento; com piso,
+ * só quando o piso atuou. Cada lançamento segue a deflação da sua metodologia (a própria ou a do
+ * cálculo).
+ */
+export function paragrafoDeflacao(calculo: Calculo, resultado: Resultado): string | null {
+  const frases = new Set<string>();
+  for (const { lancamento, calculado } of atualizados(calculo, resultado)) {
+    const modo = (lancamento.encargos?.metodologia ?? calculo.metodologia).deflacao;
+    const negativo = calculado.correcao.indices.some(
+      (i) => i.valor !== null && !i.fracao.startsWith("0/") && decimal(i.valor).isNegative(),
+    );
+    if (!negativo) continue;
+    if (modo === "aplicarComPiso" && calculado.correcao.pisoAplicado) {
+      frases.add("Índices negativos computados; o valor corrigido não fica inferior ao original.");
+    } else if (modo === "aplicarSemPiso") {
+      frases.add("Índices negativos computados, sem piso.");
+    } else if (modo === "zerarNegativos") {
+      frases.add("Índices negativos desconsiderados (tomados como zero).");
+    }
+  }
+  return frases.size === 0 ? null : [...frases].join(" ");
+}
+
+/**
+ * Fontes e arredondamento (§18.5): as séries usadas, em ordem numérica, a data da consulta e o
+ * arredondamento; os meses sem índice na data da consulta, por série.
+ */
+export function paragrafoFontes(calculo: Calculo, resultado: Resultado): string {
+  const series = [...new Set(resultado.indicesUsados.map((i) => i.serie))].sort(
+    (a, b) => Number(a) - Number(b),
+  );
+  const { fatorCasas, percentualCasas, valorCasas } = calculo.metodologia.arredondamento;
+  const arredondamento = `Arredondamento comercial: fator e percentual de juros com ${fatorCasas === percentualCasas ? fatorCasas : `${fatorCasas} e ${percentualCasas}`} casas, valores com ${valorCasas} casas por lançamento.`;
+  const partes: string[] = [];
+  if (series.length > 0) {
+    const lista = series.map((s) => `${NOME_DA_SERIE[s]}, série ${s}`).join("; ");
+    partes.push(
+      `Índices do Sistema Gerenciador de Séries Temporais do Banco Central (${lista}), atualizados em ${formatarDataHoraBrasilia(resultado.consultaIndices.em)} (horário de Brasília).`,
+    );
+  }
+  partes.push(arredondamento);
+  const faltas = new Map<CodigoSerie, Set<Competencia>>();
+  for (const l of resultado.lancamentos) {
+    for (const i of l.correcao.indices) {
+      if (i.serie === null || i.valor !== null || i.fracao.startsWith("0/")) continue;
+      const meses = faltas.get(i.serie) ?? new Set<Competencia>();
+      meses.add(i.competencia);
+      faltas.set(i.serie, meses);
+    }
+  }
+  if (faltas.size > 0) {
+    const total = [...faltas.values()].reduce((n, m) => n + m.size, 0);
+    const descricao = [...faltas.entries()]
+      .sort(([a], [b]) => Number(a) - Number(b))
+      .map(
+        ([s, meses]) =>
+          `${NOME_DA_SERIE[s]} de ${listar([...meses].sort().map(formatarCompetencia))}`,
+      )
+      .join("; ");
+    partes.push(
+      total === 1
+        ? `Mês sem índice divulgado na data da consulta, computado sem correção: ${descricao}.`
+        : `Meses sem índice divulgado na data da consulta, computados sem correção: ${descricao}.`,
+    );
+  }
+  return partes.join(" ");
+}
diff --git a/src/relatorio/texto.ts b/src/relatorio/texto.ts
new file mode 100644
index 0000000..edb4e69
--- /dev/null
+++ b/src/relatorio/texto.ts
@@ -0,0 +1,59 @@
+import { decimalOuNulo } from "../compartilhado/decimal.ts";
+import type {
+  Calculo,
+  Lancamento,
+  LancamentoCalculado,
+  Resultado,
+} from "../compartilhado/tipos.ts";
+
+/** Utilitários de texto do relatório (§18): listas, percentuais, pares de lançamentos. Puro. */
+
+export const MESES_POR_EXTENSO = [
+  "janeiro",
+  "fevereiro",
+  "março",
+  "abril",
+  "maio",
+  "junho",
+  "julho",
+  "agosto",
+  "setembro",
+  "outubro",
+  "novembro",
+  "dezembro",
+] as const;
+
+/** "a", "a e b", "a, b e c". */
+export function listar(itens: readonly string[]): string {
+  if (itens.length <= 1) return itens[0] ?? "";
+  return `${itens.slice(0, -1).join(", ")} e ${itens.at(-1) ?? ""}`;
+}
+
+/** "30%", "12,5%": o percentual como foi informado, sem casas fixas; nulo se inválido. */
+export function percentualInformado(texto: string): string | null {
+  const valor = decimalOuNulo(texto);
+  return valor === null ? null : `${valor.toFixed().replace(".", ",")}%`;
+}
+
+/** Primeira letra maiúscula. */
+export function maiuscula(texto: string): string {
+  return texto.charAt(0).toUpperCase() + texto.slice(1);
+}
+
+/** Troca o hífen do sinal negativo pelo sinal de menos tipográfico: "-0,53%" → "−0,53%". */
+export function comSinalDeMenos(texto: string): string {
+  return texto.replace(/^-/, "−");
+}
+
+/** Um lançamento do cálculo com o seu resultado (o motor devolve na mesma ordem). */
+export interface Par {
+  lancamento: Lancamento;
+  calculado: LancamentoCalculado;
+}
+
+export function pares(calculo: Calculo, resultado: Resultado): Par[] {
+  return calculo.lancamentos.flatMap((lancamento, i) => {
+    const calculado = resultado.lancamentos[i];
+    return calculado === undefined ? [] : [{ lancamento, calculado }];
+  });
+}
```

- [ ] **Step 4: Formatar e verificar**

Run: `npm run format && npm run verificar`

Expected: o `format` não muda nada; tudo verde, com `Test Files  47 passed (47)`, `Tests  893 passed | 10 skipped (903)`.

- [ ] **Step 5: Commit**

```bash
git add src/relatorio/texto.ts src/relatorio/metodologia.ts src/relatorio/testes/calculos.ts src/relatorio/metodologia.test.ts
git commit -m 'relatorio: "Metodologia e fundamentos" gerado do que foi aplicado (fase 6)' -m 'Co-Authored-By: <modelo> <noreply@anthropic.com>'
```


### Task 3: Relatório: tabelas, notas, totais, indicadores, cabeçalho, matriz e bloqueio

**Files:**
- Create: `src/relatorio/tabelas.ts` (`tabelasDoRelatorio`, `indicadoresDoRelatorio`, `totaisDoRelatorio`, `cabecalhoDoRelatorio`, `tituloDoDocumento`, `rodapeDoRelatorio`, `numero`)
- Create: `src/relatorio/matriz.ts` (`matrizesDeIndices`)
- Create: `src/relatorio/bloqueio.ts` (`motivoDoBloqueio`)
- Modify: `src/relatorio/testes/calculos.ts` (`calculoCompleto`)
- Test: `src/relatorio/tabelas.test.ts`, `src/relatorio/matriz.test.ts`, `src/relatorio/bloqueio.test.ts`

**Interfaces:**
- Consumes: `pares`, `Par`, `percentualInformado`, `listar`, `comSinalDeMenos` (`texto.ts`) e `diferencasDosEncargos` (`metodologia.ts`), da Task 2.
- Produces: `interface LinhaDoRelatorio { id; data; descricao?; palavras: string[]; valor, fator, corrigido, jurosPercentual, jurosValor, atualizado: string | null; proporcao: number; computada: boolean }`; `interface NotaDaTabela { termo: string; texto?: string; itens?: string[] }`; `interface TabelaDoRelatorio { linhas; totais: { valor; corrigido; jurosValor; atualizado }; notas }`; `tabelasDoRelatorio(calculo, resultado): { prestacoes; amortizacoes }`; `interface Indicador { rotulo; valor; apoio; destaque? }` e `indicadoresDoRelatorio`; `interface LinhaDeTotal` e `totaisDoRelatorio(calculo, resultado): { titulo; linhas; nota: string | null }`; `cabecalhoDoRelatorio(calculo): { orgao: string | null; titulo; linhas: string[] }`; `tituloDoDocumento(calculo): string`; `rodapeDoRelatorio(calculo, versao, hoje): { esquerda; direita }`; `interface MatrizDeSerie { serie; nome; anos: Array<{ ano; meses: string[] }> }` e `matrizesDeIndices(resultado)`; `motivoDoBloqueio(calculo, resultado): string | null`. Usados nas Tasks 4 e 5.

O conteúdo do relatório, já formatado, em módulos puros (§18.3): só a coluna do vencimento (D2); as palavras na linha e as notas abaixo da tabela (D3); cada total soma o que a coluna mostra (T4); a nota de encargos próprios só com o que difere (T3); a matriz com o ponto só no mês sem índice; e por que o botão fica desligado (D4).

- [ ] **Step 1: Aplicar o patch dos testes** (salvar em `$RASCUNHO/t3-testes.patch` e `git apply --whitespace=nowarn`)

```diff
diff --git a/src/relatorio/bloqueio.test.ts b/src/relatorio/bloqueio.test.ts
new file mode 100644
index 0000000..d8e306d
--- /dev/null
+++ b/src/relatorio/bloqueio.test.ts
@@ -0,0 +1,60 @@
+import { describe, expect, it } from "vitest";
+import { baseUnica } from "../motor/base.ts";
+import { motivoDoBloqueio } from "./bloqueio.ts";
+import { calculoDeTeste, pagamento, prestacao, resultadoDe } from "./testes/calculos.ts";
+
+describe("quando o botão “Relatório / PDF” fica desligado (§18.1)", () => {
+  const motivo = (mudancas: Parameters<typeof calculoDeTeste>[0]) => {
+    const calculo = calculoDeTeste(mudancas);
+    return motivoDoBloqueio(calculo, resultadoDe(calculo));
+  };
+
+  it("sem prestação lançada", () => {
+    expect(motivo({ lancamentos: [] })).toBe(
+      "Lance ao menos uma prestação para gerar o relatório.",
+    );
+    expect(motivo({ lancamentos: [pagamento("2024-10-10", "10.00")] })).toBe(
+      "Lance ao menos uma prestação para gerar o relatório.",
+    );
+  });
+
+  it("com lançamento sem valor: a contagem e onde corrigir", () => {
+    const semBase = {
+      base: baseUnica({ tipo: "percentualSalarioMinimo" as const, percentual: "" }),
+    };
+    expect(
+      motivo({ ...semBase, lancamentos: [prestacao("2024-10-05"), prestacao("2024-11-05")] }),
+    ).toBe(
+      "2 prestações estão sem valor (veja a caixa de avisos): complete a base ou informe o valor para gerar o relatório.",
+    );
+    expect(
+      motivo({
+        lancamentos: [prestacao("2024-10-05", { valorInformado: "0" })],
+      }),
+    ).toBe(
+      "1 prestação está sem valor (veja a caixa de avisos): complete a base ou informe o valor para gerar o relatório.",
+    );
+    expect(
+      motivo({
+        lancamentos: [prestacao("2024-10-05"), pagamento("2024-10-10", "abc")],
+      }),
+    ).toBe(
+      "1 pagamento está sem valor (veja a caixa de avisos): informe o valor para gerar o relatório.",
+    );
+    expect(
+      motivo({
+        ...semBase,
+        lancamentos: [prestacao("2024-10-05"), pagamento("2024-10-10", "abc")],
+      }),
+    ).toBe(
+      "1 prestação e 1 pagamento estão sem valor (veja a caixa de avisos): complete a base ou informe o valor para gerar o relatório.",
+    );
+  });
+
+  it("pagamento posterior à data do cálculo não bloqueia; cálculo completo, ligado", () => {
+    expect(
+      motivo({ lancamentos: [prestacao("2024-10-05"), pagamento("2026-11-10", "10.00")] }),
+    ).toBe(null);
+    expect(motivo({})).toBe(null);
+  });
+});
diff --git a/src/relatorio/matriz.test.ts b/src/relatorio/matriz.test.ts
new file mode 100644
index 0000000..a657493
--- /dev/null
+++ b/src/relatorio/matriz.test.ts
@@ -0,0 +1,59 @@
+import { describe, expect, it } from "vitest";
+import { metodologiaDaOpcao } from "../metodologias/padrao.ts";
+import { baseUnica } from "../motor/base.ts";
+import { matrizesDeIndices } from "./matriz.ts";
+import { calculoCompleto, calculoDeTeste, prestacao, resultadoDe } from "./testes/calculos.ts";
+
+const vazio = (n: number): string[] => Array.from({ length: n }, () => "");
+
+describe("matriz de índices aplicados (§18.3, item 7)", () => {
+  it("uma tabela por série, na ordem de uso; o ponto só no mês que faltou; meses fora do uso vazios", () => {
+    const calculo = calculoCompleto();
+    const matrizes = matrizesDeIndices(resultadoDe(calculo));
+    expect(matrizes.map((m) => m.nome)).toEqual(["IGP-M", "IPCA", "taxa legal"]);
+    expect(matrizes[0]?.anos).toEqual([
+      { ano: 2024, meses: [...vazio(6), "0,61", "0,29", ...vazio(4)] },
+    ]);
+    const ipca = matrizes[1]?.anos;
+    expect(ipca?.map((a) => a.ano)).toEqual([2024, 2025, 2026]);
+    expect(ipca?.[0]?.meses).toEqual([...vazio(8), "0,44", "0,56", "0,39", "0,52"]);
+    expect(ipca?.[1]?.meses[7]).toBe("−0,11");
+    expect(ipca?.[2]?.meses).toEqual([
+      "0,33",
+      "0,70",
+      "0,88",
+      "0,67",
+      "0,58",
+      "0,16",
+      "0,07",
+      "−0,32",
+      "0,82",
+      "·",
+      "",
+      "",
+    ]);
+    const taxaLegal = matrizes[2]?.anos;
+    expect(taxaLegal?.[0]?.meses.slice(7)).toEqual([
+      "0,605306",
+      "0,676227",
+      "0,704241",
+      "0,385874",
+      "0,171924",
+    ]);
+    expect(taxaLegal?.[2]?.meses.slice(8)).toEqual(["1,499119", "0,379020", "", ""]);
+  });
+
+  it("salário mínimo em reais, por último", () => {
+    const calculo = calculoDeTeste({
+      base: baseUnica({ tipo: "percentualSalarioMinimo", percentual: "30" }),
+      metodologia: metodologiaDaOpcao("igpmJuros1"),
+      lancamentos: [prestacao("2025-12-05"), prestacao("2026-01-05")],
+    });
+    const matrizes = matrizesDeIndices(resultadoDe(calculo));
+    expect(matrizes.map((m) => m.nome)).toEqual(["IGP-M", "salário mínimo"]);
+    expect(matrizes[1]?.anos).toEqual([
+      { ano: 2025, meses: [...vazio(11), "1.518,00"] },
+      { ano: 2026, meses: ["1.621,00", ...vazio(11)] },
+    ]);
+  });
+});
diff --git a/src/relatorio/tabelas.test.ts b/src/relatorio/tabelas.test.ts
new file mode 100644
index 0000000..e071539
--- /dev/null
+++ b/src/relatorio/tabelas.test.ts
@@ -0,0 +1,453 @@
+import { describe, expect, it } from "vitest";
+import { decimal } from "../compartilhado/decimal.ts";
+import { formatarMoeda } from "../compartilhado/formatacao.ts";
+import {
+  cabecalhoDoRelatorio,
+  indicadoresDoRelatorio,
+  rodapeDoRelatorio,
+  tabelasDoRelatorio,
+  tituloDoDocumento,
+  totaisDoRelatorio,
+} from "./tabelas.ts";
+import { metodologiaDaOpcao } from "../metodologias/padrao.ts";
+import {
+  calculoCompleto,
+  calculoDeTeste,
+  metodologiaDeTresPeriodos,
+  pagamento,
+  prestacao,
+  resultadoDe,
+} from "./testes/calculos.ts";
+
+describe("tabelas do relatório (§18.3)", () => {
+  const calculo = calculoCompleto();
+  const { prestacoes, amortizacoes } = tabelasDoRelatorio(calculo, resultadoDe(calculo));
+
+  it("prestações: vencimento, palavras, valores com o fator e o percentual de 6 casas; vincenda com “—” (fora das somas de corrigido e juros)", () => {
+    expect(prestacoes.linhas).toEqual([
+      {
+        id: "p-2024-07-05",
+        data: "05/07/2024",
+        palavras: [],
+        valor: "500,00",
+        fator: "1,113560",
+        corrigido: "556,78",
+        jurosPercentual: "19,746781%",
+        jurosValor: "109,95",
+        atualizado: "666,73",
+        computada: true,
+        proporcao: expect.any(Number),
+      },
+      {
+        id: "p-2024-10-05",
+        data: "05/10/2024",
+        palavras: ["valor informado"],
+        valor: "600,00",
+        fator: "1,098862",
+        corrigido: "659,32",
+        jurosPercentual: "17,134181%",
+        jurosValor: "112,97",
+        atualizado: "772,29",
+        computada: true,
+        proporcao: expect.any(Number),
+      },
+      {
+        id: "p-2025-03-05",
+        data: "05/03/2025",
+        palavras: ["encargos próprios"],
+        valor: "500,00",
+        fator: "1,060652",
+        corrigido: "530,33",
+        jurosPercentual: "14,149407%",
+        jurosValor: "75,04",
+        atualizado: "605,37",
+        computada: true,
+        proporcao: expect.any(Number),
+      },
+      {
+        id: "p-2026-11-05",
+        data: "05/11/2026",
+        palavras: ["vincenda"],
+        valor: "500,00",
+        fator: null,
+        corrigido: null,
+        jurosPercentual: null,
+        jurosValor: null,
+        atualizado: "500,00",
+        computada: true,
+        proporcao: expect.any(Number),
+      },
+    ]);
+    expect(prestacoes.totais).toEqual({
+      valor: "2.100,00",
+      corrigido: "1.746,43",
+      jurosValor: "297,96",
+      atualizado: "2.544,39",
+    });
+  });
+
+  it("a barra é proporcional ao maior atualizado das duas tabelas", () => {
+    expect(prestacoes.linhas[1]?.proporcao).toBe(1);
+    expect(prestacoes.linhas[0]?.proporcao).toBeCloseTo(666.73 / 772.29, 6);
+    expect(amortizacoes.linhas[0]?.proporcao).toBeCloseTo(256.94 / 772.29, 6);
+    expect(amortizacoes.linhas[1]?.proporcao).toBe(0);
+  });
+
+  it("notas das prestações: só as que ocorrem, na ordem; encargos próprios com o que difere do padrão", () => {
+    expect(prestacoes.notas).toEqual([
+      {
+        termo: "Vincenda",
+        texto:
+          "vencimento posterior à data do cálculo; incluída pelo valor nominal, sem correção e sem juros (art. 323 do CPC).",
+      },
+      {
+        termo: "Valor informado",
+        texto: "valor indicado no cálculo, em vez do apurado pela base dos alimentos.",
+      },
+      {
+        termo: "Encargos próprios",
+        itens: ["05/03/2025: correção desde 10/04/2025; juros desde 01/05/2025."],
+      },
+    ]);
+  });
+
+  it("amortizações: “Data” com a descrição; pagamento posterior à data do cálculo “não computado”, fora dos totais", () => {
+    expect(amortizacoes.linhas).toEqual([
+      {
+        id: "a-2024-10-10",
+        data: "10/10/2024",
+        descricao: "Pagamento parcial",
+        palavras: [],
+        valor: "200,00",
+        fator: "1,097872",
+        corrigido: "219,57",
+        jurosPercentual: "17,020593%",
+        jurosValor: "37,37",
+        atualizado: "256,94",
+        computada: true,
+        proporcao: expect.any(Number),
+      },
+      {
+        id: "a-2026-11-10",
+        data: "10/11/2026",
+        descricao: "Pagamento parcial",
+        palavras: ["não computado"],
+        valor: "150,00",
+        fator: null,
+        corrigido: null,
+        jurosPercentual: null,
+        jurosValor: null,
+        atualizado: null,
+        computada: false,
+        proporcao: expect.any(Number),
+      },
+    ]);
+    expect(amortizacoes.totais).toEqual({
+      valor: "200,00",
+      corrigido: "219,57",
+      jurosValor: "37,37",
+      atualizado: "256,94",
+    });
+    expect(amortizacoes.notas).toEqual([
+      {
+        termo: "Não computado",
+        texto: "pagamento com data posterior à data do cálculo; não entra nos totais.",
+      },
+    ]);
+  });
+
+  it("linhas em ordem de data, mesmo fora de ordem no cálculo; descrição aparada", () => {
+    const fora = calculoDeTeste({
+      lancamentos: [
+        prestacao("2025-12-05", { id: "p-13", origem: "avulso", descricao: " 13º salário " }),
+        prestacao("2024-10-05"),
+      ],
+    });
+    const linhas = tabelasDoRelatorio(fora, resultadoDe(fora)).prestacoes.linhas;
+    expect(linhas.map((l) => [l.data, l.descricao])).toEqual([
+      ["05/10/2024", undefined],
+      ["05/12/2025", "13º salário"],
+    ]);
+  });
+
+  it("encargos próprios: termos finais, intervalos completos, metodologia própria resumida e a descrição da linha", () => {
+    const proprio = calculoDeTeste({
+      lancamentos: [
+        prestacao("2024-12-05", {
+          encargos: {
+            termoInicialCorrecao: "2025-01-10",
+            termoFinalCorrecao: "2026-06-30",
+            termoFinalJuros: "2026-06-30",
+            metodologia: metodologiaDeTresPeriodos(),
+          },
+        }),
+        pagamento("2025-02-10", "100.00", {
+          descricao: "Depósito",
+          encargos: {
+            metodologia: {
+              ...metodologiaDeTresPeriodos(),
+              periodos: [
+                {
+                  de: null,
+                  ate: null,
+                  correcao: { indice: "INPC" },
+                  juros: { tipo: "percentualMensal", taxaMensal: "1" },
+                },
+              ],
+            },
+          },
+        }),
+      ],
+    });
+    const t = tabelasDoRelatorio(proprio, resultadoDe(proprio));
+    expect(t.prestacoes.notas).toEqual([
+      {
+        termo: "Encargos próprios",
+        itens: [
+          "05/12/2024: correção de 10/01/2025 a 30/06/2026; juros até 30/06/2026; até 31/12/2024, INPC e juros de 2% ao mês; de 01/01/2025 a 30/06/2025, SELIC como índice único de correção e juros; desde 01/07/2025, IPCA e juros pela taxa legal.",
+        ],
+      },
+    ]);
+    expect(t.amortizacoes.notas).toEqual([
+      { termo: "Encargos próprios", itens: ["10/02/2025 (Depósito): INPC e juros de 1% ao mês."] },
+    ]);
+  });
+
+  it("sem pagamentos: tabela vazia, totais zerados e sem notas", () => {
+    const so = calculoDeTeste();
+    const { amortizacoes: vazia } = tabelasDoRelatorio(so, resultadoDe(so));
+    expect(vazia.linhas).toEqual([]);
+    expect(vazia.notas).toEqual([]);
+  });
+});
+
+describe("indicadores, totais, cabeçalho e rodapé (§18.3)", () => {
+  it("indicadores com a linha de apoio", () => {
+    const calculo = calculoCompleto();
+    expect(indicadoresDoRelatorio(calculo, resultadoDe(calculo))).toEqual([
+      {
+        rotulo: "Prestações atualizadas",
+        valor: "R$ 2.544,39",
+        apoio: "4 prestações, jul/2024 a nov/2026",
+      },
+      { rotulo: "Amortizações atualizadas", valor: "R$ 256,94", apoio: "1 pagamento" },
+      {
+        rotulo: "Total devido em 11/10/2026",
+        valor: "R$ 2.287,45",
+        apoio: "prestações menos amortizações",
+        destaque: true,
+      },
+      { rotulo: "Multa e honorários", valor: "R$ 457,50", apoio: "10% + 10% sobre o total devido" },
+      {
+        rotulo: "Total geral",
+        valor: "R$ 2.744,95",
+        apoio: "com multa e honorários",
+        destaque: true,
+      },
+    ]);
+  });
+
+  it("apoio dos indicadores: uma prestação, mesmo ano, nenhum pagamento, só multa, nada", () => {
+    const apoio = (mudancas: Parameters<typeof calculoDeTeste>[0]) => {
+      const calculo = calculoDeTeste(mudancas);
+      return indicadoresDoRelatorio(calculo, resultadoDe(calculo)).map((i) => i.apoio);
+    };
+    expect(
+      apoio({
+        lancamentos: [prestacao("2025-01-05"), prestacao("2025-12-05")],
+        acrescimos: { multaPercentual: "10", honorariosPercentual: "0" },
+      }),
+    ).toEqual([
+      "2 prestações, jan a dez/2025",
+      "nenhum pagamento",
+      "prestações menos amortizações",
+      "10% de multa sobre o total devido",
+      "com multa",
+    ]);
+    expect(
+      apoio({
+        lancamentos: [
+          prestacao("2025-01-05"),
+          pagamento("2025-02-10", "10.00"),
+          pagamento("2025-03-10", "10.00"),
+        ],
+        acrescimos: { multaPercentual: "0", honorariosPercentual: "0" },
+      }),
+    ).toEqual([
+      "1 prestação, jan/2025",
+      "2 pagamentos",
+      "prestações menos amortizações",
+      "sem multa e sem honorários",
+      "igual ao total devido",
+    ]);
+  });
+
+  it("totais com multa e honorários", () => {
+    const calculo = calculoCompleto();
+    expect(totaisDoRelatorio(calculo, resultadoDe(calculo))).toEqual({
+      titulo: "Totais em 11/10/2026",
+      linhas: [
+        { rotulo: "Prestações atualizadas", valor: "2.544,39" },
+        { rotulo: "Amortizações atualizadas", valor: "− 256,94" },
+        { rotulo: "Total devido", valor: "2.287,45" },
+        { rotulo: "Multa de 10% (art. 523, §1º, do CPC)", valor: "228,75" },
+        { rotulo: "Honorários de 10% (art. 523, §1º, do CPC)", valor: "228,75" },
+        { rotulo: "Total geral", valor: "2.744,95", destaque: true },
+      ],
+      nota: null,
+    });
+  });
+
+  it("total devido zero ou negativo: 0,00, a frase do saldo e nenhum valor devido nos indicadores", () => {
+    const calculo = calculoDeTeste({
+      lancamentos: [prestacao("2024-10-05"), pagamento("2024-10-10", "2000.00")],
+      acrescimos: { multaPercentual: "0", honorariosPercentual: "10" },
+    });
+    const resultado = resultadoDe(calculo);
+    const sobra = formatarMoeda(
+      decimal(resultado.totais.amortizacoes).minus(decimal(resultado.totais.prestacoes)),
+    );
+    const totais = totaisDoRelatorio(calculo, resultado);
+    expect(totais.linhas.map((l) => [l.rotulo, l.valor])).toEqual([
+      ["Prestações atualizadas", expect.any(String)],
+      ["Amortizações atualizadas", expect.stringMatching(/^− /)],
+      ["Total devido", "0,00"],
+      ["Honorários de 10% (art. 523, §1º, do CPC)", "0,00"],
+      ["Total geral", "0,00"],
+    ]);
+    expect(totais.nota).toBe(
+      `As amortizações atualizadas superam as prestações atualizadas em ${sobra}; não há saldo devedor.`,
+    );
+    const indicadores = indicadoresDoRelatorio(calculo, resultado);
+    expect(indicadores[2]?.valor).toBe("R$ 0,00");
+    expect(indicadores[4]?.valor).toBe("R$ 0,00");
+  });
+
+  it("cabeçalho: campos em branco somem com o rótulo", () => {
+    expect(cabecalhoDoRelatorio(calculoDeTeste())).toEqual({
+      orgao: "1ª Defensoria Pública de Teste",
+      titulo: "Demonstrativo discriminado e atualizado do crédito · 11/10/2026",
+      linhas: [
+        "Processo nº 0800000-46.2026.8.12.0001",
+        "Exequente: A. B. · Executado: C. D.",
+        "Defensor(a): Defensor(a) de teste",
+      ],
+    });
+    const embranco = calculoDeTeste({
+      cabecalho: { defensor: " ", orgao: "", processo: "", exequente: "A. B.", executado: "" },
+    });
+    expect(cabecalhoDoRelatorio(embranco)).toEqual({
+      orgao: null,
+      titulo: "Demonstrativo discriminado e atualizado do crédito · 11/10/2026",
+      linhas: ["Exequente: A. B."],
+    });
+  });
+
+  it("título da aba (nome sugerido do PDF) e rodapé", () => {
+    expect(tituloDoDocumento(calculoDeTeste())).toBe(
+      "Apura – 0800000-46.2026.8.12.0001 – 11-10-2026",
+    );
+    const semProcesso = calculoDeTeste({
+      cabecalho: { defensor: "", orgao: "", processo: "", exequente: "", executado: "" },
+    });
+    expect(tituloDoDocumento(semProcesso)).toBe("Apura – 11-10-2026");
+    expect(rodapeDoRelatorio(calculoDeTeste(), "0.1.0", "2026-10-13")).toEqual({
+      esquerda: "Defensoria Pública de Mato Grosso do Sul · 1ª Defensoria Pública de Teste",
+      direita: "Fonte dos índices: BCB/SGS · Gerado com Apura v0.1.0 em 13/10/2026",
+    });
+    expect(rodapeDoRelatorio(semProcesso, "0.1.0", "2026-10-13").esquerda).toBe(
+      "Defensoria Pública de Mato Grosso do Sul",
+    );
+  });
+});
+
+describe("encargos próprios: só o que difere da metodologia do cálculo (revisão do ensaio)", () => {
+  const nota = (mudancas: Parameters<typeof calculoDeTeste>[0]) => {
+    const calculo = calculoDeTeste(mudancas);
+    const t = tabelasDoRelatorio(calculo, resultadoDe(calculo));
+    return {
+      palavras: t.prestacoes.linhas[0]?.palavras,
+      itens: t.prestacoes.notas.find((n) => n.termo === "Encargos próprios")?.itens,
+    };
+  };
+
+  it("mesmas regras com a correção a partir do mês seguinte: só isso", () => {
+    expect(
+      nota({
+        lancamentos: [
+          prestacao("2025-03-05", {
+            encargos: {
+              metodologia: {
+                ...metodologiaDaOpcao("lei14905"),
+                incidenciaMesInicial: "mesSeguinte",
+              },
+            },
+          }),
+        ],
+      }).itens,
+    ).toEqual(["05/03/2025: correção a partir do mês seguinte ao do vencimento."]);
+  });
+
+  it("deflação diferente da do cálculo", () => {
+    expect(
+      nota({
+        lancamentos: [
+          prestacao("2025-03-05", {
+            encargos: {
+              metodologia: { ...metodologiaDaOpcao("lei14905"), deflacao: "aplicarSemPiso" },
+            },
+          }),
+        ],
+      }).itens,
+    ).toEqual(["05/03/2025: índices negativos computados, sem piso."]);
+  });
+
+  it("só os períodos da metodologia própria que o lançamento alcançou", () => {
+    expect(
+      nota({
+        lancamentos: [
+          prestacao("2025-03-05", {
+            encargos: {
+              metodologia: {
+                ...metodologiaDaOpcao("lei14905"),
+                ajustada: true,
+                periodos: [
+                  {
+                    de: null,
+                    ate: "2024-08-29",
+                    correcao: { indice: "IGP-M" },
+                    juros: { tipo: "percentualMensal", taxaMensal: "1" },
+                  },
+                  {
+                    de: "2024-08-30",
+                    ate: null,
+                    correcao: { indice: "INPC" },
+                    juros: { tipo: "percentualMensal", taxaMensal: "1" },
+                  },
+                ],
+              },
+            },
+          }),
+        ],
+      }).itens,
+    ).toEqual(["05/03/2025: INPC e juros de 1% ao mês."]);
+  });
+
+  it("metodologia própria igual à do cálculo e sem termos: nada difere, sem palavra e sem nota", () => {
+    const r = nota({
+      lancamentos: [
+        prestacao("2025-03-05", { encargos: { metodologia: metodologiaDaOpcao("lei14905") } }),
+      ],
+    });
+    expect(r.palavras).toEqual([]);
+    expect(r.itens).toBe(undefined);
+  });
+
+  it("sem pagamentos, “Amortizações atualizadas” sai 0,00, sem o sinal de menos", () => {
+    const calculo = calculoDeTeste();
+    expect(totaisDoRelatorio(calculo, resultadoDe(calculo)).linhas[1]).toEqual({
+      rotulo: "Amortizações atualizadas",
+      valor: "0,00",
+    });
+  });
+});
diff --git a/src/relatorio/testes/calculos.ts b/src/relatorio/testes/calculos.ts
index ae4977c..ba5418f 100644
--- a/src/relatorio/testes/calculos.ts
+++ b/src/relatorio/testes/calculos.ts
@@ -109,3 +109,24 @@ export function metodologiaDeTresPeriodos(): Metodologia {
     ],
   };
 }
+
+/**
+ * Um cálculo com uma linha de cada tipo: prestação comum, com valor informado, com encargos
+ * próprios e vincenda; pagamento computado e pagamento posterior à data do cálculo.
+ */
+export function calculoCompleto(mudancas: Partial<Calculo> = {}): Calculo {
+  return calculoDeTeste({
+    lancamentos: [
+      prestacao("2024-07-05"),
+      prestacao("2024-10-05", { valorInformado: "600.00", editado: true }),
+      prestacao("2025-03-05", {
+        encargos: { termoInicialCorrecao: "2025-04-10", termoInicialJuros: "2025-05-01" },
+        editado: true,
+      }),
+      prestacao("2026-11-05"),
+      pagamento("2024-10-10", "200.00"),
+      pagamento("2026-11-10", "150.00"),
+    ],
+    ...mudancas,
+  });
+}
```

- [ ] **Step 2: Ver falhar**

Run: `npx vitest run`

Expected: FAIL, os três arquivos de teste inteiros, porque os módulos ainda não existem: `bloqueio.test.ts` (`Cannot find module './bloqueio.ts'`), `matriz.test.ts` (`Cannot find module './matriz.ts'`) e `tabelas.test.ts` (`Cannot find module './tabelas.ts'`).

Resumo: `Test Files  3 failed | 47 passed (50)`, `Tests  893 passed | 10 skipped (903)`.

- [ ] **Step 3: Aplicar o patch do código** (salvar em `$RASCUNHO/t3-codigo.patch` e `git apply --whitespace=nowarn`)

```diff
diff --git a/src/relatorio/bloqueio.ts b/src/relatorio/bloqueio.ts
new file mode 100644
index 0000000..d86a4f3
--- /dev/null
+++ b/src/relatorio/bloqueio.ts
@@ -0,0 +1,29 @@
+import type { Calculo, Resultado } from "../compartilhado/tipos.ts";
+import { listar, pares } from "./texto.ts";
+
+/**
+ * Por que "Relatório / PDF" fica desligado (§18.1), ou `null` quando pode abrir: sem prestação
+ * lançada, ou com algum lançamento "não computado" por falta de valor ou por valor inválido. O
+ * pagamento com data posterior à data do cálculo não bloqueia. Módulo puro.
+ */
+export function motivoDoBloqueio(calculo: Calculo, resultado: Resultado): string | null {
+  const todos = pares(calculo, resultado);
+  if (!todos.some((p) => p.lancamento.tipo === "prestacao")) {
+    return "Lance ao menos uma prestação para gerar o relatório.";
+  }
+  const semValor = todos.filter(
+    (p) =>
+      p.calculado.situacao === "ignorado" &&
+      !(p.lancamento.tipo === "amortizacao" && p.lancamento.data > calculo.dataElaboracao),
+  );
+  if (semValor.length === 0) return null;
+  const n = semValor.filter((p) => p.lancamento.tipo === "prestacao").length;
+  const m = semValor.length - n;
+  const partes = [
+    ...(n === 0 ? [] : [`${n} ${n === 1 ? "prestação" : "prestações"}`]),
+    ...(m === 0 ? [] : [`${m} ${m === 1 ? "pagamento" : "pagamentos"}`]),
+  ];
+  const verbo = semValor.length === 1 ? "está" : "estão";
+  const correcao = n > 0 ? "complete a base ou informe o valor" : "informe o valor";
+  return `${listar(partes)} ${verbo} sem valor (veja a caixa de avisos): ${correcao} para gerar o relatório.`;
+}
diff --git a/src/relatorio/matriz.ts b/src/relatorio/matriz.ts
new file mode 100644
index 0000000..15d5767
--- /dev/null
+++ b/src/relatorio/matriz.ts
@@ -0,0 +1,71 @@
+import { decimal } from "../compartilhado/decimal.ts";
+import { CODIGO_DA_SERIE, NOME_DA_SERIE } from "../compartilhado/tipos.ts";
+import type { CodigoSerie, Competencia, Resultado } from "../compartilhado/tipos.ts";
+import { numero } from "./tabelas.ts";
+import { comSinalDeMenos } from "./texto.ts";
+
+/**
+ * Matriz "série · ano × meses" dos índices aplicados (§18.3, item 7): os valores de
+ * `resultado.indicesUsados`, como o BCB publica (salário mínimo em reais); "·" só no mês que o
+ * cálculo precisou e que não tinha índice na data da consulta; vazio nos meses fora do uso.
+ * Módulo puro.
+ */
+
+export interface MatrizDeSerie {
+  serie: CodigoSerie;
+  nome: string;
+  anos: Array<{ ano: number; meses: string[] }>;
+}
+
+const CORRECAO: readonly CodigoSerie[] = ["189", "188", "433"];
+const DEPOIS: readonly CodigoSerie[] = [
+  CODIGO_DA_SERIE.taxaLegal,
+  CODIGO_DA_SERIE.SELIC,
+  CODIGO_DA_SERIE.SM,
+];
+
+function formatar(serie: CodigoSerie, valor: string): string {
+  if (serie === CODIGO_DA_SERIE.SM) return numero(decimal(valor));
+  return comSinalDeMenos(valor.replace(".", ","));
+}
+
+export function matrizesDeIndices(resultado: Resultado): MatrizDeSerie[] {
+  const valores = new Map<CodigoSerie, Map<Competencia, string>>();
+  for (const i of resultado.indicesUsados) {
+    const mapa = valores.get(i.serie) ?? new Map<Competencia, string>();
+    mapa.set(i.competencia, formatar(i.serie, i.valor));
+    valores.set(i.serie, mapa);
+  }
+  for (const l of resultado.lancamentos) {
+    for (const i of l.correcao.indices) {
+      if (i.serie === null || i.valor !== null || i.fracao.startsWith("0/")) continue;
+      const mapa = valores.get(i.serie) ?? new Map<Competencia, string>();
+      if (!mapa.has(i.competencia)) mapa.set(i.competencia, "·");
+      valores.set(i.serie, mapa);
+    }
+  }
+  const primeiroMes = (s: CodigoSerie) => [...(valores.get(s)?.keys() ?? [])].sort()[0] ?? "";
+  const ordem = [
+    ...CORRECAO.filter((s) => valores.has(s)).sort((a, b) =>
+      primeiroMes(a) < primeiroMes(b) ? -1 : primeiroMes(a) > primeiroMes(b) ? 1 : 0,
+    ),
+    ...DEPOIS.filter((s) => valores.has(s)),
+  ];
+  return ordem.map((serie) => {
+    const mapa = valores.get(serie) ?? new Map<Competencia, string>();
+    const meses = [...mapa.keys()].sort();
+    const de = Number(meses[0]?.slice(0, 4));
+    const ate = Number(meses.at(-1)?.slice(0, 4));
+    const anos: MatrizDeSerie["anos"] = [];
+    for (let ano = de; ano <= ate; ano++) {
+      anos.push({
+        ano,
+        meses: Array.from(
+          { length: 12 },
+          (_, m) => mapa.get(`${ano}-${String(m + 1).padStart(2, "0")}`) ?? "",
+        ),
+      });
+    }
+    return { serie, nome: NOME_DA_SERIE[serie], anos };
+  });
+}
diff --git a/src/relatorio/tabelas.ts b/src/relatorio/tabelas.ts
new file mode 100644
index 0000000..3890965
--- /dev/null
+++ b/src/relatorio/tabelas.ts
@@ -0,0 +1,361 @@
+import { competenciaDe } from "../compartilhado/datas.ts";
+import { Decimal, decimal, decimalOuNulo, ZERO } from "../compartilhado/decimal.ts";
+import {
+  formatarCompetencia,
+  formatarData,
+  formatarFator,
+  formatarMoeda,
+  formatarPercentual,
+} from "../compartilhado/formatacao.ts";
+import type { Calculo, Resultado } from "../compartilhado/tipos.ts";
+import { diferencasDosEncargos } from "./metodologia.ts";
+import { pares, percentualInformado, type Par } from "./texto.ts";
+
+/**
+ * O conteúdo das tabelas, dos indicadores, dos totais, do cabeçalho e do rodapé do relatório
+ * (§18.3), já formatado para a impressão. Lê só o Cálculo e o Resultado. Módulo puro.
+ */
+
+/** Uma linha de tabela; `null` nas colunas sai como "—". */
+export interface LinhaDoRelatorio {
+  id: string;
+  /** vencimento (prestações) ou data do pagamento, dd/mm/aaaa */
+  data: string;
+  descricao?: string;
+  /** "vincenda", "não computado", "valor informado", "encargos próprios" */
+  palavras: string[];
+  valor: string | null;
+  fator: string | null;
+  corrigido: string | null;
+  jurosPercentual: string | null;
+  jurosValor: string | null;
+  atualizado: string | null;
+  /** fração do maior atualizado das duas tabelas, de 0 a 1, para a barra */
+  proporcao: number;
+  /** entra nos totais */
+  computada: boolean;
+}
+
+/** Nota abaixo da tabela: "Vincenda: …" ou "Encargos próprios:" com uma linha por lançamento. */
+export interface NotaDaTabela {
+  termo: string;
+  texto?: string;
+  itens?: string[];
+}
+
+export interface TabelaDoRelatorio {
+  linhas: LinhaDoRelatorio[];
+  totais: { valor: string; corrigido: string; jurosValor: string; atualizado: string };
+  notas: NotaDaTabela[];
+}
+
+/** "1.234,56": a moeda sem o "R$" (as tabelas dizem "valores em reais"). */
+export function numero(valor: Decimal): string {
+  return formatarMoeda(valor).replace("R$ ", "").replace(/^-/, "−");
+}
+
+const NOTA_VINCENDA: NotaDaTabela = {
+  termo: "Vincenda",
+  texto:
+    "vencimento posterior à data do cálculo; incluída pelo valor nominal, sem correção e sem juros (art. 323 do CPC).",
+};
+const NOTA_VALOR_INFORMADO: NotaDaTabela = {
+  termo: "Valor informado",
+  texto: "valor indicado no cálculo, em vez do apurado pela base dos alimentos.",
+};
+const NOTA_NAO_COMPUTADO: NotaDaTabela = {
+  termo: "Não computado",
+  texto: "pagamento com data posterior à data do cálculo; não entra nos totais.",
+};
+
+/**
+ * "05/03/2025: correção desde 10/04/2025; juros desde 01/05/2025." (§18.3): o que difere da
+ * metodologia do cálculo, com a descrição entre parênteses depois da data, quando há (duas linhas
+ * podem ter a mesma data).
+ */
+function encargosProprios(par: Par, calculo: Calculo): string {
+  const l = par.lancamento;
+  const descricao = l.descricao?.trim();
+  return `${formatarData(l.data)}${descricao ? ` (${descricao})` : ""}: ${diferencasDosEncargos(par, calculo).join("; ")}.`;
+}
+
+/** Linha atualizada com encargos diferentes dos do cálculo: a palavra "encargos próprios". */
+function comEncargosProprios(par: Par, calculo: Calculo): boolean {
+  return par.calculado.situacao === "atualizado" && diferencasDosEncargos(par, calculo).length > 0;
+}
+
+function linha(par: Par, maior: Decimal, calculo: Calculo): LinhaDoRelatorio {
+  const { lancamento, calculado } = par;
+  const prestacao = lancamento.tipo === "prestacao";
+  const palavras: string[] = [];
+  if (calculado.situacao === "ignorado")
+    palavras.push(prestacao ? "não computada" : "não computado");
+  if (calculado.situacao === "vincenda") palavras.push("vincenda");
+  if (calculado.editado) palavras.push("valor informado");
+  if (comEncargosProprios(par, calculo)) palavras.push("encargos próprios");
+  const descricao = lancamento.descricao?.trim();
+  const atualizada = calculado.situacao === "atualizado";
+  const computada = calculado.situacao !== "ignorado";
+  const atualizado = decimal(calculado.atualizado);
+  return {
+    id: lancamento.id,
+    data: formatarData(lancamento.data),
+    ...(descricao ? { descricao } : {}),
+    palavras,
+    valor: numero(decimal(calculado.valorBase)),
+    fator: atualizada ? formatarFator(decimal(calculado.correcao.fator)) : null,
+    corrigido: atualizada ? numero(decimal(calculado.corrigido)) : null,
+    jurosPercentual: atualizada ? formatarPercentual(decimal(calculado.juros.percentual), 6) : null,
+    jurosValor: atualizada ? numero(decimal(calculado.jurosValor)) : null,
+    atualizado: computada ? numero(atualizado) : null,
+    proporcao: computada && maior.gt(ZERO) ? atualizado.div(maior).toNumber() : 0,
+    computada,
+  };
+}
+
+function tabela(lista: Par[], maior: Decimal, calculo: Calculo): TabelaDoRelatorio {
+  const ordenada = [...lista].sort((a, b) =>
+    a.lancamento.data < b.lancamento.data ? -1 : a.lancamento.data > b.lancamento.data ? 1 : 0,
+  );
+  // Cada total soma o que a coluna mostra: valor e atualizado, das linhas computadas (vincendas pelo
+  // valor nominal); corrigido e juros, só das atualizadas (a vincenda mostra "—").
+  const computadas = ordenada.filter((p) => p.calculado.situacao !== "ignorado");
+  const atualizadas = ordenada.filter((p) => p.calculado.situacao === "atualizado");
+  const soma = (lista: Par[], campo: "valorBase" | "corrigido" | "jurosValor" | "atualizado") =>
+    numero(lista.reduce((s, p) => s.plus(decimal(p.calculado[campo])), ZERO));
+  const notas: NotaDaTabela[] = [];
+  if (
+    ordenada.some((p) => p.calculado.situacao === "ignorado" && p.lancamento.tipo === "amortizacao")
+  ) {
+    notas.push(NOTA_NAO_COMPUTADO);
+  }
+  if (ordenada.some((p) => p.calculado.situacao === "vincenda")) notas.push(NOTA_VINCENDA);
+  if (ordenada.some((p) => p.calculado.editado)) notas.push(NOTA_VALOR_INFORMADO);
+  const proprios = ordenada.filter((p) => comEncargosProprios(p, calculo));
+  if (proprios.length > 0) {
+    notas.push({
+      termo: "Encargos próprios",
+      itens: proprios.map((p) => encargosProprios(p, calculo)),
+    });
+  }
+  return {
+    linhas: ordenada.map((p) => linha(p, maior, calculo)),
+    totais: {
+      valor: soma(computadas, "valorBase"),
+      corrigido: soma(atualizadas, "corrigido"),
+      jurosValor: soma(atualizadas, "jurosValor"),
+      atualizado: soma(computadas, "atualizado"),
+    },
+    notas,
+  };
+}
+
+/** As tabelas de prestações e de amortizações, com a barra relativa ao maior atualizado das duas. */
+export function tabelasDoRelatorio(
+  calculo: Calculo,
+  resultado: Resultado,
+): { prestacoes: TabelaDoRelatorio; amortizacoes: TabelaDoRelatorio } {
+  const todos = pares(calculo, resultado);
+  const maior = todos
+    .filter((p) => p.calculado.situacao !== "ignorado")
+    .reduce((m, p) => Decimal.max(m, decimal(p.calculado.atualizado)), ZERO);
+  return {
+    prestacoes: tabela(
+      todos.filter((p) => p.lancamento.tipo === "prestacao"),
+      maior,
+      calculo,
+    ),
+    amortizacoes: tabela(
+      todos.filter((p) => p.lancamento.tipo === "amortizacao"),
+      maior,
+      calculo,
+    ),
+  };
+}
+
+// ---------------------------------------------------------------------------------------------
+// Indicadores e totais
+// ---------------------------------------------------------------------------------------------
+
+export interface Indicador {
+  rotulo: string;
+  valor: string;
+  apoio: string;
+  destaque?: boolean;
+}
+
+/** "jan a dez/2025", "jul/2024 a nov/2026", "out/2026". */
+function intervaloDeMeses(datas: string[]): string {
+  const meses = datas.map(competenciaDe).sort();
+  const primeiro = meses[0];
+  const ultimo = meses.at(-1);
+  if (primeiro === undefined || ultimo === undefined) return "";
+  if (primeiro === ultimo) return formatarCompetencia(primeiro);
+  if (primeiro.slice(0, 4) === ultimo.slice(0, 4)) {
+    return `${formatarCompetencia(primeiro).slice(0, 3)} a ${formatarCompetencia(ultimo)}`;
+  }
+  return `${formatarCompetencia(primeiro)} a ${formatarCompetencia(ultimo)}`;
+}
+
+function percentualPositivo(texto: string): string | null {
+  const valor = decimalOuNulo(texto);
+  return valor === null || !valor.gt(ZERO) ? null : percentualInformado(texto);
+}
+
+/** Os cinco indicadores (§18.3, item 2), com a linha de apoio; dívida negativa sai R$ 0,00. */
+export function indicadoresDoRelatorio(calculo: Calculo, resultado: Resultado): Indicador[] {
+  const computados = pares(calculo, resultado).filter((p) => p.calculado.situacao !== "ignorado");
+  const prestacoes = computados.filter((p) => p.lancamento.tipo === "prestacao");
+  const pagamentos = computados.filter((p) => p.lancamento.tipo === "amortizacao").length;
+  const t = resultado.totais;
+  const semDivida = !decimal(t.totalDevido).gt(ZERO);
+  const moeda = (texto: string) => formatarMoeda(semDivida ? ZERO : decimal(texto));
+  const multa = percentualPositivo(calculo.acrescimos.multaPercentual);
+  const honorarios = percentualPositivo(calculo.acrescimos.honorariosPercentual);
+  const apoioAcrescimos =
+    multa !== null && honorarios !== null
+      ? `${multa} + ${honorarios} sobre o total devido`
+      : multa !== null
+        ? `${multa} de multa sobre o total devido`
+        : honorarios !== null
+          ? `${honorarios} de honorários sobre o total devido`
+          : "sem multa e sem honorários";
+  const apoioGeral =
+    multa !== null && honorarios !== null
+      ? "com multa e honorários"
+      : multa !== null
+        ? "com multa"
+        : honorarios !== null
+          ? "com honorários"
+          : "igual ao total devido";
+  const n = prestacoes.length;
+  return [
+    {
+      rotulo: "Prestações atualizadas",
+      valor: formatarMoeda(decimal(t.prestacoes)),
+      apoio: `${n} ${n === 1 ? "prestação" : "prestações"}, ${intervaloDeMeses(prestacoes.map((p) => p.lancamento.data))}`,
+    },
+    {
+      rotulo: "Amortizações atualizadas",
+      valor: formatarMoeda(decimal(t.amortizacoes)),
+      apoio:
+        pagamentos === 0
+          ? "nenhum pagamento"
+          : `${pagamentos} ${pagamentos === 1 ? "pagamento" : "pagamentos"}`,
+    },
+    {
+      rotulo: `Total devido em ${formatarData(calculo.dataElaboracao)}`,
+      valor: moeda(t.totalDevido),
+      apoio: "prestações menos amortizações",
+      destaque: true,
+    },
+    {
+      rotulo: "Multa e honorários",
+      valor: formatarMoeda(decimal(t.multa).plus(decimal(t.honorarios))),
+      apoio: apoioAcrescimos,
+    },
+    { rotulo: "Total geral", valor: moeda(t.totalGeral), apoio: apoioGeral, destaque: true },
+  ];
+}
+
+export interface LinhaDeTotal {
+  rotulo: string;
+  valor: string;
+  destaque?: boolean;
+}
+
+/** "Totais em dd/mm/aaaa" (§18.3, item 5); total devido zero ou negativo sai 0,00, com a frase. */
+export function totaisDoRelatorio(
+  calculo: Calculo,
+  resultado: Resultado,
+): { titulo: string; linhas: LinhaDeTotal[]; nota: string | null } {
+  const t = resultado.totais;
+  const devido = decimal(t.totalDevido);
+  const semDivida = !devido.gt(ZERO);
+  const linhas: LinhaDeTotal[] = [
+    { rotulo: "Prestações atualizadas", valor: numero(decimal(t.prestacoes)) },
+    {
+      rotulo: "Amortizações atualizadas",
+      valor: decimal(t.amortizacoes).isZero() ? "0,00" : `− ${numero(decimal(t.amortizacoes))}`,
+    },
+    { rotulo: "Total devido", valor: numero(semDivida ? ZERO : devido) },
+  ];
+  const multa = percentualPositivo(calculo.acrescimos.multaPercentual);
+  const honorarios = percentualPositivo(calculo.acrescimos.honorariosPercentual);
+  if (multa !== null) {
+    linhas.push({
+      rotulo: `Multa de ${multa} (art. 523, §1º, do CPC)`,
+      valor: numero(decimal(t.multa)),
+    });
+  }
+  if (honorarios !== null) {
+    linhas.push({
+      rotulo: `Honorários de ${honorarios} (art. 523, §1º, do CPC)`,
+      valor: numero(decimal(t.honorarios)),
+    });
+  }
+  linhas.push({
+    rotulo: "Total geral",
+    valor: numero(semDivida ? ZERO : decimal(t.totalGeral)),
+    destaque: true,
+  });
+  const sobra = devido.negated();
+  const nota = !semDivida
+    ? null
+    : sobra.gt(ZERO)
+      ? `As amortizações atualizadas superam as prestações atualizadas em ${formatarMoeda(sobra)}; não há saldo devedor.`
+      : decimal(t.amortizacoes).gt(ZERO)
+        ? "As amortizações atualizadas igualam as prestações atualizadas; não há saldo devedor."
+        : null;
+  return { titulo: `Totais em ${formatarData(calculo.dataElaboracao)}`, linhas, nota };
+}
+
+// ---------------------------------------------------------------------------------------------
+// Cabeçalho, título da aba e rodapé
+// ---------------------------------------------------------------------------------------------
+
+const preenchido = (texto: string): string | null => (texto.trim() === "" ? null : texto.trim());
+
+/** A faixa verde (§18.3, item 1): campos em branco somem com o rótulo. */
+export function cabecalhoDoRelatorio(calculo: Calculo): {
+  orgao: string | null;
+  titulo: string;
+  linhas: string[];
+} {
+  const c = calculo.cabecalho;
+  const processo = preenchido(c.processo);
+  const partes = [
+    preenchido(c.exequente) === null ? null : `Exequente: ${c.exequente.trim()}`,
+    preenchido(c.executado) === null ? null : `Executado: ${c.executado.trim()}`,
+  ].filter((p): p is string => p !== null);
+  const defensor = preenchido(c.defensor);
+  return {
+    orgao: preenchido(c.orgao),
+    titulo: `Demonstrativo discriminado e atualizado do crédito · ${formatarData(calculo.dataElaboracao)}`,
+    linhas: [
+      ...(processo === null ? [] : [`Processo nº ${processo}`]),
+      ...(partes.length === 0 ? [] : [partes.join(" · ")]),
+      ...(defensor === null ? [] : [`Defensor(a): ${defensor}`]),
+    ],
+  };
+}
+
+/** Título da aba enquanto o relatório está aberto: o nome que o navegador sugere para o PDF (§18.1). */
+export function tituloDoDocumento(calculo: Calculo): string {
+  const data = formatarData(calculo.dataElaboracao).replaceAll("/", "-");
+  const processo = preenchido(calculo.cabecalho.processo);
+  return processo === null ? `Apura – ${data}` : `Apura – ${processo} – ${data}`;
+}
+
+/** Rodapé (§10.1, §18.3): o único lugar do relatório com o nome Apura. */
+export function rodapeDoRelatorio(
+  calculo: Calculo,
+  versao: string,
+  hoje: string,
+): { esquerda: string; direita: string } {
+  const orgao = preenchido(calculo.cabecalho.orgao);
+  return {
+    esquerda: `Defensoria Pública de Mato Grosso do Sul${orgao === null ? "" : ` · ${orgao}`}`,
+    direita: `Fonte dos índices: BCB/SGS · Gerado com Apura v${versao} em ${formatarData(hoje)}`,
+  };
+}
```

- [ ] **Step 4: Formatar e verificar**

Run: `npm run format && npm run verificar`

Expected: o `format` não muda nada; tudo verde, com `Test Files  50 passed (50)`, `Tests  916 passed | 10 skipped (926)`.

- [ ] **Step 5: Commit**

```bash
git add src/relatorio/tabelas.ts src/relatorio/matriz.ts src/relatorio/bloqueio.ts src/relatorio/testes/calculos.ts src/relatorio/tabelas.test.ts src/relatorio/matriz.test.ts src/relatorio/bloqueio.test.ts
git commit -m 'relatorio: tabelas, notas, totais, indicadores, cabeçalho, matriz de índices e bloqueio do botão (fase 6)' -m 'Co-Authored-By: <modelo> <noreply@anthropic.com>'
```


### Task 4: Relatório: componente, CSS de tela e de impressão e logo

**Files:**
- Create: `src/relatorio/Relatorio.tsx`
- Create: `src/relatorio/relatorio.css`
- Create (gerado pelo `sips`, no passo 3): `public/logos/dpems-horizontal-branca-relatorio.png`
- Test: `src/relatorio/Relatorio.test.tsx`

**Interfaces:**
- Consumes: tudo o que a Task 3 produz; `metodologiaEFundamentos` (Task 2).
- Produces: `Relatorio({ calculo, resultado, hoje, versao })` (a Task 5 acrescenta a prop `focar`); as classes `relatorio`, `relatorio-faixa`, `relatorio-corpo`, `relatorio-tabela`, `linha-total`, `relatorio-notas`, `relatorio-totais`, `relatorio-metodologia`, `relatorio-matriz`, `relatorio-rodape`; o logo em `public/logos/dpems-horizontal-branca-relatorio.png` (1105 × 264 px).

O componente só desenha o que os módulos da Task 3 montam (§10.1, §18.3). O CSS acompanha o tema na tela; na impressão, força o tema claro mesmo com `data-theme="dark"` (seletores `html:root…`, mais específicos que os do tema escuro de `estilos.css`), preserva as cores (`print-color-adjust: exact`), usa A4 e repete o cabeçalho das tabelas; os totais são a última linha do corpo, não `tfoot` (T5). A regra de tela estreita vale só na tela (`@media screen`), para a folha A4 não empilhar a faixa.

- [ ] **Step 1: Aplicar o patch dos testes** (salvar em `$RASCUNHO/t4-testes.patch` e `git apply --whitespace=nowarn`)

```diff
diff --git a/src/relatorio/Relatorio.test.tsx b/src/relatorio/Relatorio.test.tsx
new file mode 100644
index 0000000..bf861a6
--- /dev/null
+++ b/src/relatorio/Relatorio.test.tsx
@@ -0,0 +1,162 @@
+// @vitest-environment jsdom
+import { cleanup, render, screen, within } from "@testing-library/react";
+import { afterEach, describe, expect, it, vi } from "vitest";
+import { Relatorio } from "./Relatorio.tsx";
+import { calculoCompleto, calculoDeTeste, prestacao, resultadoDe } from "./testes/calculos.ts";
+
+afterEach(cleanup);
+
+function mostrar(calculo = calculoCompleto()) {
+  return render(
+    <Relatorio
+      calculo={calculo}
+      resultado={resultadoDe(calculo)}
+      hoje="2026-10-13"
+      versao="0.1.0"
+    />,
+  );
+}
+
+describe("Relatorio (§10.1, §18.3)", () => {
+  it("faixa verde: órgão, título com a data do cálculo, processo, partes, defensor(a) e o logo", () => {
+    mostrar();
+    const faixa = screen.getByRole("banner");
+    expect(within(faixa).getByRole("heading", { level: 1 }).textContent).toBe(
+      "Demonstrativo discriminado e atualizado do crédito · 11/10/2026",
+    );
+    expect(faixa.textContent).toContain("1ª Defensoria Pública de Teste");
+    expect(faixa.textContent).toContain("Processo nº 0800000-46.2026.8.12.0001");
+    expect(faixa.textContent).toContain("Exequente: A. B. · Executado: C. D.");
+    expect(faixa.textContent).toContain("Defensor(a): Defensor(a) de teste");
+    const logo = within(faixa).getByRole("img", {
+      name: "Defensoria Pública de Mato Grosso do Sul",
+    });
+    expect(logo.getAttribute("src")).toContain("logos/dpems-horizontal-branca-relatorio.png");
+  });
+
+  it("os cinco indicadores, na ordem, com a linha de apoio", () => {
+    mostrar();
+    const indicadores = screen.getByRole("list", { name: "Resumo do cálculo" });
+    const itens = within(indicadores)
+      .getAllByRole("listitem")
+      .map((i) => i.textContent);
+    expect(itens).toEqual([
+      "Prestações atualizadasR$ 2.544,394 prestações, jul/2024 a nov/2026",
+      "Amortizações atualizadasR$ 256,941 pagamento",
+      "Total devido em 11/10/2026R$ 2.287,45prestações menos amortizações",
+      "Multa e honoráriosR$ 457,5010% + 10% sobre o total devido",
+      "Total geralR$ 2.744,95com multa e honorários",
+    ]);
+  });
+
+  it("tabela de prestações: colunas, palavras na célula do vencimento, “—” na vincenda, totais na última linha do corpo e as notas", () => {
+    mostrar();
+    const tabela = screen.getByRole("table", { name: "Prestações" });
+    expect(
+      within(tabela)
+        .getAllByRole("columnheader")
+        .map((c) => c.textContent),
+    ).toEqual([
+      "Vencimento",
+      "Valor",
+      "Fator de correção",
+      "Corrigido",
+      "Juros %",
+      "Juros R$",
+      "Atualizado",
+    ]);
+    const linhas = within(tabela).getAllByRole("row").slice(1);
+    const celulas = (i: number) =>
+      within(linhas[i] as HTMLElement)
+        .getAllByRole("cell")
+        .map((c) => c.textContent);
+    expect(celulas(1)).toEqual([
+      "05/10/2024 · valor informado",
+      "600,00",
+      "1,098862",
+      "659,32",
+      "17,134181%",
+      "112,97",
+      "772,29",
+    ]);
+    expect(celulas(3)).toEqual(["05/11/2026 · vincenda", "500,00", "—", "—", "—", "—", "500,00"]);
+    expect(celulas(4)).toEqual(["Totais", "2.100,00", "", "1.746,43", "", "297,96", "2.544,39"]);
+    expect(tabela.querySelector("tfoot")).toBe(null);
+    const notas = screen.getByRole("list", { name: "Notas da tabela de prestações" });
+    // só os itens de primeiro nível (os de "Encargos próprios" ficam numa lista dentro do item)
+    expect(Array.from(notas.children).map((n) => n.textContent)).toEqual([
+      "Vincenda: vencimento posterior à data do cálculo; incluída pelo valor nominal, sem correção e sem juros (art. 323 do CPC).",
+      "Valor informado: valor indicado no cálculo, em vez do apurado pela base dos alimentos.",
+      "Encargos próprios:05/03/2025: correção desde 10/04/2025; juros desde 01/05/2025.",
+    ]);
+  });
+
+  it("tabela de amortizações: “Data” com a descrição e o pagamento não computado; sem pagamentos, a frase", () => {
+    mostrar();
+    const tabela = screen.getByRole("table", { name: "Amortizações" });
+    expect(within(tabela).getAllByRole("columnheader")[0]?.textContent).toBe("Data");
+    const linhas = within(tabela).getAllByRole("row");
+    expect(linhas[2]?.textContent).toBe(
+      "10/11/2026 · Pagamento parcial · não computado150,00—————",
+    );
+    cleanup();
+    mostrar(calculoDeTeste());
+    expect(screen.queryByRole("table", { name: "Amortizações" })).toBe(null);
+    expect(screen.getByText("Não há pagamentos a abater.")).toBeTruthy();
+  });
+
+  it("totais, metodologia e fundamentos, índices aplicados e rodapé", () => {
+    mostrar();
+    const totais = screen.getByRole("region", { name: "Totais em 11/10/2026" });
+    expect(totais.textContent).toContain("Amortizações atualizadas− 256,94");
+    expect(totais.textContent).toContain("Total geral2.744,95");
+    const metodologia = screen.getByRole("region", { name: "Metodologia e fundamentos" });
+    expect(
+      within(metodologia)
+        .getAllByRole("paragraph")
+        .map((p) => p.firstChild?.textContent),
+    ).toEqual([
+      "Base.",
+      "Termos.",
+      "Encargos.",
+      "Amortizações.",
+      "Multa e honorários.",
+      "Fontes e arredondamento.",
+    ]);
+    const indices = screen.getByRole("region", { name: "Índices aplicados" });
+    expect(indices.textContent).toContain(
+      "O ponto indica mês sem índice divulgado na data da consulta.",
+    );
+    expect(
+      within(indices)
+        .getAllByRole("table")
+        .map((t) => t.getAttribute("aria-label")),
+    ).toEqual(["IGP-M", "IPCA", "taxa legal"]);
+    const rodape = screen.getByRole("contentinfo");
+    expect(rodape.textContent).toBe(
+      "Defensoria Pública de Mato Grosso do Sul · 1ª Defensoria Pública de TesteFonte dos índices: BCB/SGS · Gerado com Apura v0.1.0 em 13/10/2026",
+    );
+  });
+
+  it("sem parâmetros de sistema: o nome Apura só no rodapé; nada de “ajuste”, “personalização”, “SAJ” ou o nome da opção", () => {
+    const { container } = mostrar();
+    const texto = container.textContent ?? "";
+    expect(texto.match(/Apura/g)).toHaveLength(1);
+    expect(texto).not.toMatch(/\bajust|personaliz|\bSAJ\b|igpm-juros|lei14905/i);
+  });
+
+  it("duas notas de encargos próprios iguais não repetem a chave do React", () => {
+    const erro = vi.spyOn(console, "error").mockImplementation(() => undefined);
+    const igual = { encargos: { termoInicialJuros: "2025-05-01" } };
+    mostrar(
+      calculoDeTeste({
+        lancamentos: [
+          prestacao("2025-03-05", { id: "a", ...igual }),
+          prestacao("2025-03-05", { id: "b", ...igual }),
+        ],
+      }),
+    );
+    expect(erro).not.toHaveBeenCalled();
+    erro.mockRestore();
+  });
+});
```

- [ ] **Step 2: Ver falhar**

Run: `npx vitest run`

Expected: FAIL, o arquivo de teste inteiro: `FAIL  src/relatorio/Relatorio.test.tsx` com `Failed to resolve import "./Relatorio.tsx"`.

Resumo: `Test Files  1 failed | 50 passed (51)`, `Tests  916 passed | 10 skipped (926)`.

- [ ] **Step 3: Aplicar o patch do código** (salvar em `$RASCUNHO/t4-codigo.patch` e `git apply --whitespace=nowarn`)

```diff
diff --git a/src/relatorio/Relatorio.tsx b/src/relatorio/Relatorio.tsx
new file mode 100644
index 0000000..5a462a9
--- /dev/null
+++ b/src/relatorio/Relatorio.tsx
@@ -0,0 +1,255 @@
+import { useId } from "react";
+import { formatarData } from "../compartilhado/formatacao.ts";
+import type { Calculo, Resultado } from "../compartilhado/tipos.ts";
+import { matrizesDeIndices } from "./matriz.ts";
+import { metodologiaEFundamentos } from "./metodologia.ts";
+import "./relatorio.css";
+import {
+  cabecalhoDoRelatorio,
+  indicadoresDoRelatorio,
+  rodapeDoRelatorio,
+  tabelasDoRelatorio,
+  totaisDoRelatorio,
+  type TabelaDoRelatorio,
+} from "./tabelas.ts";
+
+const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
+
+/**
+ * O relatório (§10.1 e §18.3): faixa verde, indicadores, prestações, amortizações, totais,
+ * "Metodologia e fundamentos", índices aplicados e rodapé. Lê só o Cálculo e o Resultado; `hoje`
+ * (a data em que o relatório é gerado) e `versao` vão para o rodapé. O mesmo HTML serve à tela e à
+ * impressão (`relatorio.css`).
+ */
+export function Relatorio({
+  calculo,
+  resultado,
+  hoje,
+  versao,
+}: {
+  calculo: Calculo;
+  resultado: Resultado;
+  hoje: string;
+  versao: string;
+}) {
+  const cabecalho = cabecalhoDoRelatorio(calculo);
+  const { prestacoes, amortizacoes } = tabelasDoRelatorio(calculo, resultado);
+  const totais = totaisDoRelatorio(calculo, resultado);
+  const rodape = rodapeDoRelatorio(calculo, versao, hoje);
+  const data = formatarData(calculo.dataElaboracao);
+  const id = useId();
+  return (
+    <article className="relatorio" aria-labelledby={`${id}-titulo`}>
+      <header className="relatorio-faixa">
+        <div className="relatorio-identificacao">
+          {cabecalho.orgao === null ? null : <p className="relatorio-orgao">{cabecalho.orgao}</p>}
+          <h1 id={`${id}-titulo`}>{cabecalho.titulo}</h1>
+          {cabecalho.linhas.map((linha) => (
+            <p key={linha} className="relatorio-sub">
+              {linha}
+            </p>
+          ))}
+        </div>
+        <img
+          className="relatorio-logo"
+          src={`${import.meta.env.BASE_URL}logos/dpems-horizontal-branca-relatorio.png`}
+          width={1105}
+          height={264}
+          alt="Defensoria Pública de Mato Grosso do Sul"
+        />
+      </header>
+      <div className="relatorio-corpo">
+        <ul className="relatorio-indicadores" aria-label="Resumo do cálculo">
+          {indicadoresDoRelatorio(calculo, resultado).map((i) => (
+            <li key={i.rotulo} className={i.destaque ? "destaque" : undefined}>
+              <span className="rotulo">{i.rotulo}</span>
+              <span className="valor">{i.valor}</span>
+              <span className="apoio">{i.apoio}</span>
+            </li>
+          ))}
+        </ul>
+
+        <section aria-labelledby={`${id}-prestacoes`}>
+          <h2 id={`${id}-prestacoes`}>Prestações</h2>
+          <p className="relatorio-lede">
+            Cada prestação é atualizada do vencimento até {data}; valores em reais.
+          </p>
+          <TabelaDeLancamentos
+            nome="Prestações"
+            primeira="Vencimento"
+            tabela={prestacoes}
+            notas="Notas da tabela de prestações"
+          />
+        </section>
+
+        <section aria-labelledby={`${id}-amortizacoes`}>
+          <h2 id={`${id}-amortizacoes`}>Amortizações</h2>
+          {amortizacoes.linhas.length === 0 ? (
+            <p className="relatorio-lede">Não há pagamentos a abater.</p>
+          ) : (
+            <>
+              <p className="relatorio-lede">
+                Cada pagamento é atualizado da data do pagamento até {data}; valores em reais.
+              </p>
+              <TabelaDeLancamentos
+                nome="Amortizações"
+                primeira="Data"
+                tabela={amortizacoes}
+                notas="Notas da tabela de amortizações"
+              />
+            </>
+          )}
+        </section>
+
+        <section className="relatorio-totais" aria-labelledby={`${id}-totais`}>
+          <h2 id={`${id}-totais`}>{totais.titulo}</h2>
+          <dl>
+            {totais.linhas.map((l) => (
+              <div key={l.rotulo} className={l.destaque ? "destaque" : undefined}>
+                <dt>{l.rotulo}</dt>
+                <dd>{l.valor}</dd>
+              </div>
+            ))}
+          </dl>
+          {totais.nota === null ? null : <p className="relatorio-nota">{totais.nota}</p>}
+        </section>
+
+        <section className="relatorio-metodologia" aria-labelledby={`${id}-metodologia`}>
+          <h2 id={`${id}-metodologia`}>Metodologia e fundamentos</h2>
+          {metodologiaEFundamentos(calculo, resultado).map((p) => (
+            <p key={p.titulo}>
+              <strong>{p.titulo}</strong> {p.texto}
+            </p>
+          ))}
+        </section>
+
+        <section className="relatorio-indices" aria-labelledby={`${id}-indices`}>
+          <h2 id={`${id}-indices`}>Índices aplicados</h2>
+          <p className="relatorio-lede">
+            Valores mensais publicados pelo Banco Central (em %; o salário mínimo em reais). O ponto
+            indica mês sem índice divulgado na data da consulta.
+          </p>
+          {matrizesDeIndices(resultado).map((m) => (
+            <table key={m.serie} className="relatorio-matriz" aria-label={m.nome}>
+              <thead>
+                <tr>
+                  <th scope="col">Série · ano</th>
+                  {MESES.map((mes) => (
+                    <th key={mes} scope="col">
+                      {mes}
+                    </th>
+                  ))}
+                </tr>
+              </thead>
+              <tbody>
+                {m.anos.map((a) => (
+                  <tr key={a.ano}>
+                    <th scope="row">
+                      {m.nome} · {a.ano}
+                    </th>
+                    {a.meses.map((valor, i) => (
+                      <td key={MESES[i]} className={valor === "·" ? "sem-indice" : undefined}>
+                        {valor}
+                      </td>
+                    ))}
+                  </tr>
+                ))}
+              </tbody>
+            </table>
+          ))}
+        </section>
+
+        <footer className="relatorio-rodape">
+          <span>{rodape.esquerda}</span>
+          <span>{rodape.direita}</span>
+        </footer>
+      </div>
+    </article>
+  );
+}
+
+function TabelaDeLancamentos({
+  nome,
+  primeira,
+  tabela,
+  notas,
+}: {
+  nome: string;
+  primeira: string;
+  tabela: TabelaDoRelatorio;
+  notas: string;
+}) {
+  const traco = (valor: string | null) => valor ?? "—";
+  return (
+    <>
+      <table className="relatorio-tabela" aria-label={nome}>
+        <thead>
+          <tr>
+            <th scope="col">{primeira}</th>
+            <th scope="col">Valor</th>
+            <th scope="col">Fator de correção</th>
+            <th scope="col">Corrigido</th>
+            <th scope="col">Juros %</th>
+            <th scope="col">Juros R$</th>
+            <th scope="col">Atualizado</th>
+            <th scope="col" aria-hidden="true"></th>
+          </tr>
+        </thead>
+        <tbody>
+          {tabela.linhas.map((l) => (
+            <tr key={l.id} className={l.computada ? undefined : "nao-computada"}>
+              <td>
+                {l.data}
+                {l.descricao === undefined ? null : ` · ${l.descricao}`}
+                {l.palavras.map((p) => (
+                  <span key={p} className="palavra">
+                    {` · ${p}`}
+                  </span>
+                ))}
+              </td>
+              <td>{traco(l.valor)}</td>
+              <td>{traco(l.fator)}</td>
+              <td>{traco(l.corrigido)}</td>
+              <td>{traco(l.jurosPercentual)}</td>
+              <td>{traco(l.jurosValor)}</td>
+              <td>{traco(l.atualizado)}</td>
+              <td className="barra-proporcional" aria-hidden="true">
+                <span style={{ width: `${Math.round(l.proporcao * 100)}%` }} />
+              </td>
+            </tr>
+          ))}
+          {/* os totais são a última linha do corpo, não um tfoot: o Chrome repetiria o tfoot em
+              cada página impressa (§18.2) */}
+          <tr className="linha-total">
+            <td>Totais</td>
+            <td>{tabela.totais.valor}</td>
+            <td></td>
+            <td>{tabela.totais.corrigido}</td>
+            <td></td>
+            <td>{tabela.totais.jurosValor}</td>
+            <td>{tabela.totais.atualizado}</td>
+            <td aria-hidden="true"></td>
+          </tr>
+        </tbody>
+      </table>
+      {tabela.notas.length === 0 ? null : (
+        <ul className="relatorio-notas" aria-label={notas}>
+          {tabela.notas.map((n) => (
+            <li key={n.termo}>
+              <strong>{n.termo}:</strong>
+              {n.texto === undefined ? null : ` ${n.texto}`}
+              {n.itens === undefined ? null : (
+                <ul>
+                  {/* duas linhas podem dar o mesmo texto: a chave leva a posição */}
+                  {n.itens.map((item, i) => (
+                    <li key={`${i}-${item}`}>{item}</li>
+                  ))}
+                </ul>
+              )}
+            </li>
+          ))}
+        </ul>
+      )}
+    </>
+  );
+}
diff --git a/src/relatorio/relatorio.css b/src/relatorio/relatorio.css
new file mode 100644
index 0000000..851e553
--- /dev/null
+++ b/src/relatorio/relatorio.css
@@ -0,0 +1,443 @@
+/* Relatório (§10 e §18): o mesmo HTML na tela e na impressão. Na tela, acompanha o tema (as
+   variáveis de src/ui/estilos.css); na impressão, sempre claro, em A4, com o cabeçalho das tabelas
+   repetido em cada página e sem linhas cortadas (§18.2). Estrutura e medidas do mockup v6
+   (docs/referencia/mockups/04-relatorio.html). */
+
+.relatorio {
+  width: 100%;
+  max-width: 1100px;
+  margin: 0 auto;
+  background: var(--superficie);
+  color: var(--texto);
+  border: 1px solid var(--linha);
+  border-radius: 8px;
+  overflow: hidden;
+  font-family: var(--corpo);
+  font-size: 13px;
+  line-height: 1.4;
+}
+
+/* ---- Faixa verde com a marca e a linha dourada ---- */
+
+.relatorio-faixa {
+  background: var(--cabecalho-fundo);
+  color: #fff;
+  border-bottom: 4px solid var(--ouro);
+  padding: 18px 22px;
+  display: flex;
+  justify-content: space-between;
+  align-items: center;
+  gap: 18px;
+}
+
+.relatorio-identificacao {
+  min-width: 0;
+}
+
+.relatorio-orgao {
+  margin: 0 0 4px;
+  font-family: var(--titulos);
+  font-size: 10.5px;
+  text-transform: uppercase;
+  letter-spacing: 0.12em;
+  opacity: 0.92;
+}
+
+.relatorio-faixa h1 {
+  font-size: 20px;
+  line-height: 1.2;
+  margin: 0 0 6px;
+}
+
+.relatorio-sub {
+  margin: 0 0 2px;
+  font-size: 12.5px;
+  opacity: 0.95;
+}
+
+/* logo horizontal branco, com respiro (área de proteção do manual) */
+.relatorio-logo {
+  height: 46px;
+  width: auto;
+  flex: none;
+}
+
+.relatorio-corpo {
+  padding: 14px 22px 16px;
+}
+
+.relatorio h2 {
+  font-size: 14.5px;
+  color: var(--verde);
+  margin: 18px 0 4px;
+}
+
+.relatorio-lede {
+  margin: 0 0 6px;
+  color: var(--discreto);
+  font-size: 12px;
+}
+
+/* ---- Indicadores ---- */
+
+.relatorio-indicadores {
+  list-style: none;
+  margin: 0;
+  padding: 0;
+  display: grid;
+  grid-template-columns: repeat(5, minmax(0, 1fr));
+  gap: 8px;
+}
+
+.relatorio-indicadores li {
+  border: 1px solid var(--linha);
+  border-radius: 6px;
+  padding: 7px 9px;
+  display: flex;
+  flex-direction: column;
+  gap: 2px;
+}
+
+.relatorio-indicadores .rotulo {
+  font-family: var(--titulos);
+  font-size: 9.5px;
+  text-transform: uppercase;
+  letter-spacing: 0.1em;
+  color: var(--discreto);
+  min-height: 2.3em;
+}
+
+.relatorio-indicadores .valor {
+  font-family: var(--titulos);
+  font-weight: 700;
+  font-size: 15px;
+  white-space: nowrap;
+  font-variant-numeric: tabular-nums;
+}
+
+.relatorio-indicadores .apoio {
+  font-size: 10.5px;
+  color: var(--discreto);
+}
+
+.relatorio-indicadores li.destaque {
+  border: 2px solid var(--verde);
+}
+
+.relatorio-indicadores li.destaque .valor {
+  color: var(--verde);
+}
+
+/* ---- Tabelas ---- */
+
+.relatorio table {
+  width: 100%;
+  border-collapse: collapse;
+  font-variant-numeric: tabular-nums;
+}
+
+.relatorio-tabela th {
+  font-family: var(--titulos);
+  font-weight: 500;
+  font-size: 9.5px;
+  text-transform: uppercase;
+  letter-spacing: 0.08em;
+  color: #fff;
+  background: var(--cabecalho-fundo);
+  padding: 5px 6px;
+  text-align: right;
+  white-space: nowrap;
+}
+
+.relatorio-tabela td {
+  padding: 4px 6px;
+  border-bottom: 1px solid var(--linha);
+  text-align: right;
+  white-space: nowrap;
+  font-size: 12px;
+}
+
+.relatorio-tabela th:first-child,
+.relatorio-tabela td:first-child {
+  text-align: left;
+  white-space: normal;
+}
+
+.relatorio-tabela tbody tr:nth-child(even) td {
+  background: var(--linha-alternada);
+}
+
+.relatorio-tabela .palavra {
+  font-style: italic;
+  color: var(--discreto);
+}
+
+.relatorio-tabela tr.nao-computada td {
+  color: var(--discreto);
+}
+
+.relatorio-tabela tr.linha-total td {
+  font-family: var(--titulos);
+  font-weight: 700;
+  border-top: 2px solid var(--verde);
+  border-bottom: 0;
+  background: transparent;
+}
+
+.barra-proporcional {
+  width: 72px;
+}
+
+.barra-proporcional span {
+  display: block;
+  height: 7px;
+  margin-left: auto;
+  background: var(--verde);
+  border-radius: 2px;
+}
+
+.relatorio-notas {
+  margin: 6px 0 0;
+  padding-left: 16px;
+  font-size: 11.5px;
+  color: var(--discreto);
+}
+
+.relatorio-notas li + li {
+  margin-top: 2px;
+}
+
+.relatorio-notas ul {
+  margin: 2px 0 0;
+  padding-left: 16px;
+}
+
+/* ---- Totais ---- */
+
+.relatorio-totais {
+  border-left: 3px solid var(--verde);
+  background: var(--linha-alternada);
+  padding: 2px 12px 10px;
+  margin-top: 16px;
+}
+
+.relatorio-totais h2 {
+  margin-top: 8px;
+}
+
+.relatorio-totais dl {
+  margin: 0;
+}
+
+.relatorio-totais dl div {
+  display: flex;
+  justify-content: space-between;
+  gap: 12px;
+  padding: 3px 0;
+  border-bottom: 1px dashed var(--linha);
+}
+
+.relatorio-totais dt {
+  margin: 0;
+}
+
+.relatorio-totais dd {
+  margin: 0;
+  font-variant-numeric: tabular-nums;
+  white-space: nowrap;
+}
+
+.relatorio-totais dl div.destaque {
+  border-top: 2px solid var(--verde);
+  border-bottom: 0;
+  font-family: var(--titulos);
+  font-weight: 700;
+  color: var(--verde);
+}
+
+.relatorio-nota {
+  margin: 6px 0 0;
+  font-size: 12px;
+}
+
+/* ---- Metodologia e fundamentos ---- */
+
+.relatorio-metodologia {
+  border-left: 3px solid var(--ouro);
+  background: var(--aviso-fundo);
+  padding: 2px 12px 8px;
+  margin-top: 16px;
+}
+
+.relatorio-metodologia h2 {
+  margin-top: 8px;
+}
+
+.relatorio-metodologia p {
+  margin: 0 0 6px;
+  white-space: pre-line;
+}
+
+/* ---- Índices aplicados ---- */
+
+/* largura fixa das colunas: os meses ficam alinhados de uma série para a outra */
+.relatorio-matriz {
+  margin-bottom: 8px;
+  table-layout: fixed;
+}
+
+.relatorio-matriz th:first-child {
+  width: 16%;
+}
+
+.relatorio-matriz th {
+  font-family: var(--titulos);
+  font-weight: 500;
+  font-size: 9.5px;
+  text-transform: uppercase;
+  letter-spacing: 0.06em;
+  color: var(--verde);
+  background: var(--linha-alternada);
+  padding: 4px 5px;
+  text-align: right;
+}
+
+.relatorio-matriz th:first-child,
+.relatorio-matriz tbody th {
+  text-align: left;
+  text-transform: none;
+  letter-spacing: 0;
+  white-space: nowrap;
+}
+
+.relatorio-matriz td {
+  padding: 3px 5px;
+  border-bottom: 1px solid var(--linha);
+  text-align: right;
+  font-size: 11px;
+  white-space: nowrap;
+}
+
+.relatorio-matriz td.sem-indice {
+  text-align: center;
+  color: var(--discreto);
+}
+
+.relatorio-rodape {
+  margin-top: 16px;
+  padding-top: 8px;
+  border-top: 1px solid var(--linha);
+  font-size: 10.5px;
+  color: var(--discreto);
+  display: flex;
+  justify-content: space-between;
+  flex-wrap: wrap;
+  gap: 4px 12px;
+}
+
+/* ---- Telas estreitas: indicadores em duas colunas, tabelas rolam sozinhas (só na tela: a folha
+   A4 também tem menos de 900 px e fica com o arranjo largo) ---- */
+
+@media screen and (max-width: 899px) {
+  .relatorio-faixa {
+    flex-direction: column-reverse;
+    align-items: flex-start;
+  }
+
+  .relatorio-indicadores {
+    grid-template-columns: repeat(2, minmax(0, 1fr));
+  }
+
+  .relatorio-corpo {
+    overflow-x: auto;
+  }
+}
+
+/* ---- Impressão (§18.2) ---- */
+
+@page {
+  size: A4;
+  margin: 12mm 11mm 14mm;
+}
+
+@media print {
+  /* tema claro forçado, mesmo com data-theme="dark" ou o sistema no escuro: a especificidade
+     (html:root…) passa a das regras do tema escuro de estilos.css */
+  html:root,
+  html:root[data-theme="dark"],
+  html:root:not([data-theme="light"]) {
+    --verde: #1d6b34;
+    --verde-claro: #1fa463;
+    --vermelho: #c8101a;
+    --fundo: #ffffff;
+    --superficie: #ffffff;
+    --texto: #373636;
+    --discreto: #5f625d;
+    --linha: #d3d6cf;
+    --linha-alternada: #f4f5f1;
+    --cabecalho-fundo: #1d6b34;
+    --cabecalho-texto: #ffffff;
+    --aviso-fundo: #fbf9f3;
+    --aviso-borda: #d8bb73;
+    color-scheme: light;
+  }
+
+  html,
+  body {
+    background: #fff;
+  }
+
+  .relatorio,
+  .relatorio * {
+    print-color-adjust: exact;
+    -webkit-print-color-adjust: exact;
+  }
+
+  .relatorio {
+    max-width: none;
+    border: 0;
+    border-radius: 0;
+    font-size: 9.5pt;
+  }
+
+  .relatorio-faixa {
+    padding: 12px 14px;
+  }
+
+  .relatorio-corpo {
+    padding: 10px 0 0;
+    overflow: visible;
+  }
+
+  .relatorio-indicadores {
+    grid-template-columns: repeat(5, minmax(0, 1fr));
+  }
+
+  .relatorio-tabela td {
+    font-size: 8.5pt;
+  }
+
+  .relatorio thead {
+    display: table-header-group;
+  }
+
+  .relatorio tr,
+  .relatorio-indicadores,
+  .relatorio-totais,
+  .relatorio-metodologia p,
+  .relatorio-notas li,
+  .relatorio-rodape {
+    break-inside: avoid;
+  }
+
+  /* o título e a frase de abertura ficam com o que vem depois (nunca sozinhos no pé da página) */
+  .relatorio h2,
+  .relatorio-lede {
+    break-after: avoid;
+  }
+
+  /* o título recebe o foco ao abrir o relatório: o anel de foco não vai para o papel */
+  .relatorio h1 {
+    outline: none !important;
+  }
+}
```

- [ ] **Step 4: Gerar o logo do relatório** (com o `sips`, que vem com o macOS: o mesmo recorte das margens transparentes do quadro de 8334 px usado na fase 5 para a barra, reduzido a 264 px de altura, o triplo da barra, para a impressão sair nítida)

```bash
sips -c 1825 7641 --cropOffset 3254 344 docs/identidade-visual/logos/branca-horizontal-01.png --out "${TMPDIR:-/tmp}/apura-logo-relatorio.png"
sips --resampleHeight 264 "${TMPDIR:-/tmp}/apura-logo-relatorio.png" --out public/logos/dpems-horizontal-branca-relatorio.png
sips -g pixelWidth -g pixelHeight public/logos/dpems-horizontal-branca-relatorio.png
shasum public/logos/dpems-horizontal-branca-relatorio.png
```

Expected: `pixelWidth: 1105`, `pixelHeight: 264`, 142.310 bytes; no ensaio e na reconstrução, `shasum` deu `9144ab2cb9eb68ff7806575ae7096f3ef9b0e860` (outra versão do macOS pode dar outro hash com as mesmas medidas; isso não é falha).

- [ ] **Step 5: Formatar e verificar**

Run: `npm run format && npm run verificar`

Expected: o `format` não muda nada; tudo verde, com `Test Files  51 passed (51)`, `Tests  923 passed | 10 skipped (933)`.

- [ ] **Step 6: Commit**

```bash
git add src/relatorio/Relatorio.tsx src/relatorio/relatorio.css src/relatorio/Relatorio.test.tsx public/logos/dpems-horizontal-branca-relatorio.png
git commit -m 'relatorio: componente, CSS de tela e de impressão e logo da faixa (fase 6)' -m 'Co-Authored-By: <modelo> <noreply@anthropic.com>'
```


### Task 5: Tela: "Relatório / PDF" ligado, relatório na mesma página e impressão

**Files:**
- Modify: `src/ui/ambiente.ts` (`imprimir`)
- Modify: `src/ui/BarraSuperior.tsx` (`aoRelatorio`, `bloqueioDoRelatorio`, `refDoRelatorio`)
- Modify: `src/relatorio/Relatorio.tsx` (prop `focar`: o foco vai ao título)
- Modify: `src/ui/App.tsx` (relatório no lugar das colunas, faixa de ações, faixa "Antes de juntar, confira:", título da aba, foco, frase só de impressão)
- Modify: `src/ui/estilos.css` (relatório na tela; impressão da tela)
- Modify: `src/ui/testes/ambiente-de-teste.ts` (`impressoes`)
- Test: `src/ui/RelatorioNaTela.test.tsx`, `src/ui/App.test.tsx`

**Interfaces:**
- Consumes: `Relatorio` (Task 4); `motivoDoBloqueio` e `tituloDoDocumento` (Task 3); `VERSAO` (`src/ui/versao.ts`).
- Produces: `Ambiente.imprimir: () => void`; `AmbienteDeTeste.impressoes(): number`; na `BarraSuperior`, as props `aoRelatorio?: () => void`, `bloqueioDoRelatorio?: string | null` e `refDoRelatorio?: Ref<HTMLButtonElement>`; no `App`, a constante `avisosDaTela` (usada pela Task 7), as classes `app vendo-relatorio`, `principal-relatorio`, `faixa-de-acoes` e `so-na-impressao`.

A sua escolha D1 (§18.1): o relatório no lugar das colunas, que ficam montadas e escondidas (`hidden`) para a tela voltar como estava; o foco vai ao título do relatório e volta ao botão; o título da aba vira o nome sugerido do PDF e volta ao anterior; "Novo cálculo" e "Abrir" fecham o relatório. Na impressão (§18.2), a barra, a faixa de ações, a faixa de avisos e o rodapé da tela somem; na tela de cálculo, Ctrl+P imprime só a frase que manda usar o botão.

- [ ] **Step 1: Aplicar o patch dos testes** (salvar em `$RASCUNHO/t5-testes.patch` e `git apply --whitespace=nowarn`)

```diff
diff --git a/src/ui/App.test.tsx b/src/ui/App.test.tsx
index da5c0f3..24dcfec 100644
--- a/src/ui/App.test.tsx
+++ b/src/ui/App.test.tsx
@@ -20,7 +20,9 @@ describe("App (fundação da tela)", () => {
       expect(screen.getByRole("button", { name: nome })).toBeDefined();
     }
     const relatorio = screen.getByRole("button", { name: "Relatório / PDF" }) as HTMLButtonElement;
+    // cálculo em branco: sem prestação, o relatório não abre (§18.1)
     expect(relatorio.disabled).toBe(true);
+    expect(relatorio.title).toBe("Lance ao menos uma prestação para gerar o relatório.");
     const rodape = screen.getByRole("contentinfo").textContent ?? "";
     expect(rodape).toContain(
       "Índices oficiais BCB/SGS · IPCA até set/2026 · atualizados em 11/10/2026 09:00 (horário de Brasília)",
diff --git a/src/ui/RelatorioNaTela.test.tsx b/src/ui/RelatorioNaTela.test.tsx
new file mode 100644
index 0000000..a81f24d
--- /dev/null
+++ b/src/ui/RelatorioNaTela.test.tsx
@@ -0,0 +1,107 @@
+// @vitest-environment jsdom
+import { cleanup, render, screen, within } from "@testing-library/react";
+import userEvent from "@testing-library/user-event";
+import { afterEach, describe, expect, it } from "vitest";
+import type { Calculo } from "../compartilhado/tipos.ts";
+import { calcular } from "../motor/calcular.ts";
+import { baseUnica } from "../motor/base.ts";
+import { calculoCompleto, prestacao } from "../relatorio/testes/calculos.ts";
+import App from "./App.tsx";
+import { montarArquivo, serializarArquivo } from "./arquivo.ts";
+import { ambienteDeTeste } from "./testes/ambiente-de-teste.ts";
+
+afterEach(cleanup);
+
+/** Abre o cálculo pelo painel "Abrir", como um arquivo salvo. */
+async function abrir(user: ReturnType<typeof userEvent.setup>, calculo: Calculo) {
+  const resultado = calcular(calculo, ambienteDeTeste().congelar().tabela);
+  const texto = serializarArquivo(montarArquivo(calculo, resultado));
+  await user.click(screen.getByRole("button", { name: "Abrir" }));
+  const painel = within(screen.getByRole("dialog", { name: "Abrir cálculo" }));
+  await user.upload(
+    painel.getByLabelText("Abrir arquivo do Apura (.json)"),
+    new File([texto], "calculo.json", { type: "application/json" }),
+  );
+}
+
+const botao = () => screen.getByRole("button", { name: "Relatório / PDF" }) as HTMLButtonElement;
+
+describe("Relatório na tela (§18.1)", () => {
+  it("com prestação sem valor, o botão fica desligado e o title diz quantas e onde corrigir", async () => {
+    const user = userEvent.setup();
+    render(<App ambiente={ambienteDeTeste()} />);
+    await abrir(
+      user,
+      calculoCompleto({
+        base: baseUnica({ tipo: "percentualSalarioMinimo", percentual: "" }),
+        lancamentos: [prestacao("2024-10-05"), prestacao("2024-11-05")],
+      }),
+    );
+    expect(botao().disabled).toBe(true);
+    expect(botao().title).toBe(
+      "2 prestações estão sem valor (veja a caixa de avisos): complete a base ou informe o valor para gerar o relatório.",
+    );
+  });
+
+  it("abre no lugar das colunas, com a faixa de ações e a faixa “Antes de juntar, confira:”; imprime; volta como estava", async () => {
+    const user = userEvent.setup();
+    const ambiente = ambienteDeTeste();
+    document.title = "Apura · Sistema de Cálculos Judiciais";
+    render(<App ambiente={ambiente} />);
+    await abrir(user, calculoCompleto());
+    await user.type(screen.getByLabelText("Observações para o relatório"), "Conforme o acordo.");
+    expect(botao().disabled).toBe(false);
+    expect(botao().title).toBe("");
+    await user.click(botao());
+
+    const relatorio = screen.getByRole("article", {
+      name: "Demonstrativo discriminado e atualizado do crédito · 11/10/2026",
+    });
+    // o foco vai para o título do relatório
+    expect(document.activeElement?.textContent).toBe(
+      "Demonstrativo discriminado e atualizado do crédito · 11/10/2026",
+    );
+    // as colunas do cálculo ficam escondidas (continuam montadas: o campo existe, fora da vista)
+    expect(screen.getByLabelText("Nº do processo").closest("main")?.hidden).toBe(true);
+    expect(screen.queryByRole("textbox", { name: "Nº do processo" })).toBeNull();
+    expect(document.title).toBe("Apura – 0800000-46.2026.8.12.0001 – 11-10-2026");
+    expect(relatorio.textContent).toContain("Observações. Conforme o acordo.");
+    const confira = screen.getByRole("region", { name: "Antes de juntar, confira:" });
+    expect(confira.textContent).toContain(
+      "Prestações vincendas, incluídas pelo valor nominal, sem correção e sem juros: nov/2026.",
+    );
+
+    await user.click(screen.getByRole("button", { name: "Imprimir / Salvar PDF" }));
+    expect(ambiente.impressoes()).toBe(1);
+
+    await user.click(screen.getByRole("button", { name: "← Voltar ao cálculo" }));
+    expect(screen.queryByRole("article")).toBeNull();
+    expect(
+      (screen.getByLabelText("Observações para o relatório") as HTMLTextAreaElement).value,
+    ).toBe("Conforme o acordo.");
+    expect(document.activeElement).toBe(botao());
+    expect(document.title).toBe("Apura · Sistema de Cálculos Judiciais");
+  });
+
+  it("“Novo cálculo” com o relatório aberto volta à tela de cálculo", async () => {
+    const user = userEvent.setup();
+    render(<App ambiente={ambienteDeTeste()} />);
+    await abrir(user, calculoCompleto());
+    await user.click(botao());
+    expect(screen.getByRole("article")).toBeDefined();
+    await user.click(screen.getByRole("button", { name: "Novo cálculo" }));
+    expect(screen.queryByRole("article")).toBeNull();
+    expect(screen.getByLabelText("Nº do processo")).toBeDefined();
+  });
+
+  it("na tela de cálculo, a impressão só leva a frase que manda usar o botão (§18.2)", async () => {
+    const user = userEvent.setup();
+    const { container } = render(<App ambiente={ambienteDeTeste()} />);
+    const frase = container.querySelector(".so-na-impressao");
+    expect(frase?.textContent).toBe("Para imprimir o demonstrativo, use o botão Relatório / PDF.");
+    await abrir(user, calculoCompleto());
+    await user.click(botao());
+    expect(container.querySelector(".so-na-impressao")).toBeNull();
+    expect(container.querySelector(".app")?.classList.contains("vendo-relatorio")).toBe(true);
+  });
+});
diff --git a/src/ui/testes/ambiente-de-teste.ts b/src/ui/testes/ambiente-de-teste.ts
index 4f563de..6557720 100644
--- a/src/ui/testes/ambiente-de-teste.ts
+++ b/src/ui/testes/ambiente-de-teste.ts
@@ -56,6 +56,8 @@ export interface AmbienteDeTeste extends Ambiente {
   armazenado: Storage | null;
   /** quantas vezes a tela congelou a tabela de índices */
   congelamentos: () => number;
+  /** quantas vezes a tela pediu a impressão do navegador */
+  impressoes: () => number;
 }
 
 export function ambienteDeTeste(
@@ -74,6 +76,7 @@ export function ambienteDeTeste(
   const baixados: AmbienteDeTeste["baixados"] = [];
   let contador = 0;
   let congelamentos = 0;
+  let impressoes = 0;
   return {
     congelar: () => {
       congelamentos++;
@@ -87,8 +90,12 @@ export function ambienteDeTeste(
     baixar: (nome, conteudo) => {
       baixados.push({ nome, conteudo });
     },
+    imprimir: () => {
+      impressoes++;
+    },
     baixados,
     armazenado,
     congelamentos: () => congelamentos,
+    impressoes: () => impressoes,
   };
 }
```

- [ ] **Step 2: Ver falhar**

Run: `npx vitest run`

Expected: FAIL, 5 testes (2 arquivos):
- `App.test.tsx` › "mostra o nome do sistema, as quatro ações da barra e o rodapé com a situação dos índices": `expected 'Em construção: o relatório em tela e …' to be 'Lance ao menos uma prestação para ger…'`
- `RelatorioNaTela.test.tsx` › "com prestação sem valor, o botão fica desligado e o title diz quantas e onde corrigir": `expected 'Em construção: o relatório em tela e …' to be '2 prestações estão sem valor (veja a …'`
- `RelatorioNaTela.test.tsx` › "abre no lugar das colunas, …; imprime; volta como estava": `expected true to be false` (o botão ainda está desligado)
- `RelatorioNaTela.test.tsx` › "“Novo cálculo” com o relatório aberto volta à tela de cálculo": `Unable to find an accessible element with the role "article"`
- `RelatorioNaTela.test.tsx` › "na tela de cálculo, a impressão só leva a frase que manda usar o botão (§18.2)": `expected undefined to be 'Para imprimir o demonstrativo, use o …'`

Resumo: `Tests  5 failed | 922 passed | 10 skipped (937)`.

- [ ] **Step 3: Aplicar o patch do código** (salvar em `$RASCUNHO/t5-codigo.patch` e `git apply --whitespace=nowarn`)

```diff
diff --git a/src/relatorio/Relatorio.tsx b/src/relatorio/Relatorio.tsx
index 5a462a9..74500ba 100644
--- a/src/relatorio/Relatorio.tsx
+++ b/src/relatorio/Relatorio.tsx
@@ -1,4 +1,4 @@
-import { useId } from "react";
+import { useEffect, useId, useRef } from "react";
 import { formatarData } from "../compartilhado/formatacao.ts";
 import type { Calculo, Resultado } from "../compartilhado/tipos.ts";
 import { matrizesDeIndices } from "./matriz.ts";
@@ -26,12 +26,19 @@ export function Relatorio({
   resultado,
   hoje,
   versao,
+  focar = false,
 }: {
   calculo: Calculo;
   resultado: Resultado;
   hoje: string;
   versao: string;
+  /** leva o foco ao título quando o relatório aparece (na tela, ao abrir pelo botão) */
+  focar?: boolean;
 }) {
+  const titulo = useRef<HTMLHeadingElement>(null);
+  useEffect(() => {
+    if (focar) titulo.current?.focus();
+  }, [focar]);
   const cabecalho = cabecalhoDoRelatorio(calculo);
   const { prestacoes, amortizacoes } = tabelasDoRelatorio(calculo, resultado);
   const totais = totaisDoRelatorio(calculo, resultado);
@@ -43,7 +50,9 @@ export function Relatorio({
       <header className="relatorio-faixa">
         <div className="relatorio-identificacao">
           {cabecalho.orgao === null ? null : <p className="relatorio-orgao">{cabecalho.orgao}</p>}
-          <h1 id={`${id}-titulo`}>{cabecalho.titulo}</h1>
+          <h1 id={`${id}-titulo`} ref={titulo} tabIndex={-1}>
+            {cabecalho.titulo}
+          </h1>
           {cabecalho.linhas.map((linha) => (
             <p key={linha} className="relatorio-sub">
               {linha}
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index 0ed8bf5..87ddcfd 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -3,6 +3,9 @@ import type { Lancamento, LancamentoCalculado } from "../compartilhado/tipos.ts"
 import { compararIndicesUsados } from "../indices/congelar.ts";
 import { metodologiaDaOpcao } from "../metodologias/padrao.ts";
 import { calcular } from "../motor/calcular.ts";
+import { motivoDoBloqueio } from "../relatorio/bloqueio.ts";
+import { Relatorio } from "../relatorio/Relatorio.tsx";
+import { tituloDoDocumento } from "../relatorio/tabelas.ts";
 import { Abrir } from "./Abrir.tsx";
 import { ambientePadrao, type Ambiente } from "./ambiente.ts";
 import {
@@ -39,6 +42,7 @@ import {
   type Recente,
 } from "./recentes.ts";
 import { Rodape } from "./Rodape.tsx";
+import { VERSAO } from "./versao.ts";
 import { Indicadores } from "./tabelas/Indicadores.tsx";
 import { Personalizar } from "./tabelas/Personalizar.tsx";
 import { TabelaLancamentos, type LinhaDaTabela } from "./tabelas/TabelaLancamentos.tsx";
@@ -100,12 +104,38 @@ export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambien
   const personalizar = (id: string) =>
     setPersonalizando(estado.calculo.lancamentos.find((l) => l.id === id) ?? null);
 
+  // Relatório (§18.1): na mesma página, no lugar das colunas, que continuam montadas (escondidas)
+  // para a tela voltar como estava; o título da aba vira o nome sugerido do PDF; ao voltar, o foco
+  // volta ao botão "Relatório / PDF".
+  const [vendoRelatorio, setVendoRelatorio] = useState(false);
+  const botaoRelatorio = useRef<HTMLButtonElement>(null);
+  const voltouDoRelatorio = useRef(false);
+  const bloqueioDoRelatorio = motivoDoBloqueio(estado.calculo, resultado);
+  const tituloDoRelatorio = tituloDoDocumento(estado.calculo);
+  useEffect(() => {
+    if (!vendoRelatorio) {
+      if (voltouDoRelatorio.current) botaoRelatorio.current?.focus();
+      voltouDoRelatorio.current = false;
+      return;
+    }
+    const anterior = document.title;
+    document.title = tituloDoRelatorio;
+    return () => {
+      document.title = anterior;
+    };
+  }, [vendoRelatorio, tituloDoRelatorio]);
+  const fecharRelatorio = () => {
+    voltouDoRelatorio.current = true;
+    setVendoRelatorio(false);
+  };
+
   // Cada "Novo cálculo" ou "Abrir" remonta as duas colunas: os formulários, a linha nova e as
   // células em edição recomeçam (nada digitado para um cálculo vai parar no outro).
   const [aberturas, setAberturas] = useState(0);
   const novo = () => {
     despachar({ tipo: "novo", calculo: calculoNovo(preferencias), ...ambiente.congelar() });
     setAberturas(aberturas + 1);
+    setVendoRelatorio(false);
   };
 
   // Salvar (§5.1): o arquivo leva o cálculo e o resultado, com o nome apura-<processo>-<data>.json.
@@ -148,6 +178,7 @@ export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambien
     }
     despachar({ tipo: "abrir", calculo: leitura.calculo, ...indices, avisos });
     setAberturas(aberturas + 1);
+    setVendoRelatorio(false);
     setErroDeAbertura(null);
     setAbrirAberto(false);
   };
@@ -182,8 +213,15 @@ export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambien
     gravarPreferencias(armazenamento, novas);
   };
 
+  const avisosDaTela = [
+    ...faltas.map((f) => f.aviso),
+    ...estado.situacao.avisos,
+    ...estado.avisosDaAbertura,
+    ...resultado.avisos,
+  ];
+
   return (
-    <div className="app">
+    <div className={vendoRelatorio ? "app vendo-relatorio" : "app"}>
       <BarraSuperior
         aoNovo={novo}
         aoAbrir={() => {
@@ -193,10 +231,37 @@ export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambien
           setAbrirAberto(true);
         }}
         aoSalvar={salvar}
+        aoRelatorio={() => setVendoRelatorio(true)}
+        bloqueioDoRelatorio={bloqueioDoRelatorio}
+        refDoRelatorio={botaoRelatorio}
         tema={preferencias.tema}
         aoMudarTema={(tema) => mudarPreferencias({ tema })}
       />
-      <main className="principal">
+      {vendoRelatorio ? (
+        <main className="principal-relatorio">
+          <nav className="faixa-de-acoes" aria-label="Ações do relatório">
+            <button type="button" className="botao secundario" onClick={fecharRelatorio}>
+              ← Voltar ao cálculo
+            </button>
+            <button type="button" className="botao" onClick={() => ambiente.imprimir()}>
+              Imprimir / Salvar PDF
+            </button>
+          </nav>
+          <Avisos avisos={avisosDaTela} titulo="Antes de juntar, confira:" />
+          <Relatorio
+            calculo={estado.calculo}
+            resultado={resultado}
+            hoje={ambiente.hoje()}
+            versao={VERSAO}
+            focar
+          />
+        </main>
+      ) : (
+        <p className="so-na-impressao">
+          Para imprimir o demonstrativo, use o botão Relatório / PDF.
+        </p>
+      )}
+      <main className="principal" hidden={vendoRelatorio}>
         <div className="coluna-esquerda" key={`esquerda-${estado.calculo.id}-${aberturas}`}>
           <Processo
             cabecalho={estado.calculo.cabecalho}
@@ -264,14 +329,7 @@ export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambien
             valorDaBase={valorDaBase}
             aoIncluir={incluir}
           />
-          <Avisos
-            avisos={[
-              ...faltas.map((f) => f.aviso),
-              ...estado.situacao.avisos,
-              ...estado.avisosDaAbertura,
-              ...resultado.avisos,
-            ]}
-          />
+          <Avisos avisos={avisosDaTela} />
         </div>
       </main>
       <Rodape situacaoDosIndices={estado.situacao.rodape} />
diff --git a/src/ui/BarraSuperior.tsx b/src/ui/BarraSuperior.tsx
index ba449db..6439ee1 100644
--- a/src/ui/BarraSuperior.tsx
+++ b/src/ui/BarraSuperior.tsx
@@ -1,3 +1,4 @@
+import type { Ref } from "react";
 import { TEMAS, type Tema } from "./preferencias.ts";
 
 /** O tema seguinte na volta do botão: do sistema → claro → escuro → do sistema. */
@@ -13,19 +14,26 @@ const NOME_DO_TEMA: Record<Tema, string> = {
 
 /**
  * Barra superior (§9.1): logo da DPE-MS, nome do sistema, as quatro ações e o botão de tema, que alterna a cada
- * clique entre "do sistema", "claro" e "escuro" (decisão de 13/10/2026). "Relatório / PDF" chega
- * na fase 6.
+ * clique entre "do sistema", "claro" e "escuro" (decisão de 13/10/2026). "Relatório / PDF" fica
+ * desligado, com o motivo no `title`, sem prestação ou com lançamento sem valor (§18.1).
  */
 export function BarraSuperior({
   aoNovo,
   aoAbrir,
   aoSalvar,
+  aoRelatorio,
+  bloqueioDoRelatorio = null,
+  refDoRelatorio,
   tema = "sistema",
   aoMudarTema,
 }: {
   aoNovo?: () => void;
   aoAbrir?: () => void;
   aoSalvar?: () => void;
+  aoRelatorio?: () => void;
+  /** por que o relatório não pode abrir (vai para o `title`), ou nulo */
+  bloqueioDoRelatorio?: string | null;
+  refDoRelatorio?: Ref<HTMLButtonElement>;
   tema?: Tema;
   aoMudarTema?: (tema: Tema) => void;
 }) {
@@ -57,10 +65,12 @@ export function BarraSuperior({
           Salvar
         </button>
         <button
+          ref={refDoRelatorio}
           type="button"
           className="botao-barra relatorio"
-          disabled
-          title="Em construção: o relatório em tela e PDF chega na fase 6 do MVP."
+          disabled={aoRelatorio === undefined || bloqueioDoRelatorio !== null}
+          title={bloqueioDoRelatorio ?? undefined}
+          onClick={aoRelatorio}
         >
           Relatório / PDF
         </button>
diff --git a/src/ui/ambiente.ts b/src/ui/ambiente.ts
index aab3724..fa9927b 100644
--- a/src/ui/ambiente.ts
+++ b/src/ui/ambiente.ts
@@ -6,7 +6,8 @@ import type { TabelaIndices } from "../compartilhado/tipos.ts";
 /**
  * Tudo o que a tela precisa do mundo exterior, num objeto só, para que os testes de componente
  * troquem cada peça por uma versão falsa: a cópia publicada dos índices (congelada por cálculo),
- * o relógio, a geração de ids, o armazenamento do navegador e o download de arquivos. A tela
+ * o relógio, a geração de ids, o armazenamento do navegador, o download de arquivos e a
+ * impressão. A tela
  * nunca acessa a rede (§14 do design).
  */
 export interface Ambiente {
@@ -25,6 +26,8 @@ export interface Ambiente {
   armazenamento: () => Storage | null;
   /** entrega ao usuário um arquivo de texto com o nome dado (download) */
   baixar: (nome: string, conteudo: string) => void;
+  /** abre a impressão do navegador ("Imprimir / Salvar PDF", §18.1) */
+  imprimir: () => void;
 }
 
 function armazenamentoDoNavegador(): Storage | null {
@@ -57,5 +60,6 @@ export function ambientePadrao(): Ambiente {
     novoId: () => crypto.randomUUID(),
     armazenamento: armazenamentoDoNavegador,
     baixar: baixarPeloNavegador,
+    imprimir: () => window.print(),
   };
 }
diff --git a/src/ui/estilos.css b/src/ui/estilos.css
index aa78d5d..5bd43ac 100644
--- a/src/ui/estilos.css
+++ b/src/ui/estilos.css
@@ -204,7 +204,8 @@ textarea {
   cursor: not-allowed;
 }
 
-/* "Relatório / PDF" desligado até a fase 6: contorno tracejado, sem o fundo branco de destaque */
+/* "Relatório / PDF" desligado (sem prestação ou com lançamento sem valor, §18.1): contorno
+   tracejado, sem o fundo branco de destaque */
 .botao-barra.relatorio:disabled {
   background: transparent;
   color: var(--cabecalho-texto);
@@ -1038,3 +1039,63 @@ td.dica {
 .resumo-metodologia {
   margin: 2px 0 0;
 }
+
+/* ---- Relatório na tela (§18.1) e impressão (§18.2) ---- */
+
+/* as colunas continuam montadas, escondidas, enquanto o relatório está aberto */
+.principal[hidden] {
+  display: none;
+}
+
+.principal-relatorio {
+  flex: 1;
+  width: 100%;
+  max-width: 1132px;
+  margin: 0 auto;
+  padding: 16px;
+  display: flex;
+  flex-direction: column;
+  gap: 12px;
+}
+
+.faixa-de-acoes {
+  display: flex;
+  flex-wrap: wrap;
+  justify-content: space-between;
+  gap: 8px;
+}
+
+.relatorio h1:focus {
+  outline: none;
+}
+
+.relatorio h1:focus-visible {
+  outline: 2px solid var(--ouro);
+  outline-offset: 3px;
+}
+
+.so-na-impressao {
+  display: none;
+}
+
+@media print {
+  .barra,
+  .rodape,
+  .faixa-de-acoes,
+  .avisos,
+  .dialogo-fundo,
+  .app:not(.vendo-relatorio) .principal {
+    display: none !important;
+  }
+
+  .app:not(.vendo-relatorio) .so-na-impressao {
+    display: block;
+    margin: 24px;
+    font-size: 14pt;
+  }
+
+  .principal-relatorio {
+    max-width: none;
+    padding: 0;
+  }
+}
```

- [ ] **Step 4: Formatar e verificar**

Run: `npm run format && npm run verificar`

Expected: o `format` não muda nada; tudo verde, com `Test Files  52 passed (52)`, `Tests  927 passed | 10 skipped (937)`.

- [ ] **Step 5: Commit**

```bash
git add src/ui/ambiente.ts src/ui/BarraSuperior.tsx src/relatorio/Relatorio.tsx src/ui/App.tsx src/ui/estilos.css src/ui/testes/ambiente-de-teste.ts src/ui/RelatorioNaTela.test.tsx src/ui/App.test.tsx
git commit -m 'ui: "Relatório / PDF" abre o relatório na mesma página, com impressão pelo navegador (fase 6)' -m 'Co-Authored-By: <modelo> <noreply@anthropic.com>'
```


### Task 6: Tela de erro de reserva

**Files:**
- Create: `src/ui/componentes/Reserva.tsx` (componente de classe: mostra a reserva se o conteúdo lançar erro)
- Create: `src/ui/TelaDeErro.tsx` ("Salvar o cálculo" e "Recarregar a página")
- Modify: `src/ui/ambiente.ts` (`recarregar`)
- Modify: `src/ui/App.tsx` (o `App` vira a reserva em volta da `Tela`, que lhe passa cada cálculo exibido; reserva própria em volta do relatório)
- Modify: `src/ui/estilos.css` (tela de erro e frase do relatório)
- Modify: `src/ui/testes/ambiente-de-teste.ts` (`recargas`)
- Test: `src/ui/TelaDeErro.test.tsx`, `src/ui/RelatorioDefeito.test.tsx`

**Interfaces:**
- Consumes: `nomeDoArquivo` (`src/ui/arquivo.ts`); o `App` da Task 5.
- Produces: `class Reserva` (props `children`, `reserva`); `TelaDeErro({ ambiente, calculo: () => Calculo | null })`; `Ambiente.recarregar: () => void`; `AmbienteDeTeste.recargas(): number`; a função interna `Tela({ ambiente, aoExibir })` no `App.tsx` (o `export default App` continua com a mesma assinatura).

Pendência da fase 5 (§18.6): um defeito do programa ao montar a tela troca a página por "Algo deu errado no Apura.", com "Salvar o cálculo" (o último cálculo exibido, sem o resultado; abre depois com o aviso de arquivo sem resultado) e "Recarregar a página"; um defeito só no relatório mostra "Não foi possível montar o relatório deste cálculo." na área dele, e "← Voltar ao cálculo" devolve a tela intacta. Os testes simulam os defeitos (um `hoje()` que passa a lançar; o módulo do relatório trocado por um que lança).

- [ ] **Step 1: Aplicar o patch dos testes** (salvar em `$RASCUNHO/t6-testes.patch` e `git apply --whitespace=nowarn`)

```diff
diff --git a/src/ui/RelatorioDefeito.test.tsx b/src/ui/RelatorioDefeito.test.tsx
new file mode 100644
index 0000000..69ef20e
--- /dev/null
+++ b/src/ui/RelatorioDefeito.test.tsx
@@ -0,0 +1,47 @@
+// @vitest-environment jsdom
+import { cleanup, render, screen, within } from "@testing-library/react";
+import userEvent from "@testing-library/user-event";
+import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
+import { calcular } from "../motor/calcular.ts";
+import { calculoCompleto } from "../relatorio/testes/calculos.ts";
+import App from "./App.tsx";
+import { montarArquivo, serializarArquivo } from "./arquivo.ts";
+import { ambienteDeTeste } from "./testes/ambiente-de-teste.ts";
+
+// Simula um defeito do próprio programa ao montar o relatório.
+vi.mock("../relatorio/Relatorio.tsx", () => ({
+  Relatorio: () => {
+    throw new Error("defeito simulado no relatório");
+  },
+}));
+
+afterEach(cleanup);
+beforeEach(() => {
+  vi.spyOn(console, "error").mockImplementation(() => undefined);
+  return () => vi.restoreAllMocks();
+});
+
+describe("defeito ao montar o relatório (§18.6)", () => {
+  it("só a área do relatório mostra a frase; “Voltar ao cálculo” devolve a tela intacta", async () => {
+    const user = userEvent.setup();
+    render(<App ambiente={ambienteDeTeste()} />);
+    const calculo = calculoCompleto();
+    const texto = serializarArquivo(
+      montarArquivo(calculo, calcular(calculo, ambienteDeTeste().congelar().tabela)),
+    );
+    await user.click(screen.getByRole("button", { name: "Abrir" }));
+    await user.upload(
+      within(screen.getByRole("dialog")).getByLabelText("Abrir arquivo do Apura (.json)"),
+      new File([texto], "calculo.json", { type: "application/json" }),
+    );
+    await user.click(screen.getByRole("button", { name: "Relatório / PDF" }));
+    expect(screen.getByRole("alert").textContent).toBe(
+      "Não foi possível montar o relatório deste cálculo.",
+    );
+    expect(screen.queryByText(/Algo deu errado no Apura/)).toBeNull();
+    await user.click(screen.getByRole("button", { name: "← Voltar ao cálculo" }));
+    expect((screen.getByLabelText("Nº do processo") as HTMLInputElement).value).toBe(
+      "0800000-46.2026.8.12.0001",
+    );
+  });
+});
diff --git a/src/ui/TelaDeErro.test.tsx b/src/ui/TelaDeErro.test.tsx
new file mode 100644
index 0000000..10c0568
--- /dev/null
+++ b/src/ui/TelaDeErro.test.tsx
@@ -0,0 +1,85 @@
+// @vitest-environment jsdom
+import { cleanup, render, screen } from "@testing-library/react";
+import userEvent from "@testing-library/user-event";
+import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
+import { calculoCompleto } from "../relatorio/testes/calculos.ts";
+import App from "./App.tsx";
+import { lerArquivo } from "./arquivo.ts";
+import { Reserva } from "./componentes/Reserva.tsx";
+import { TelaDeErro } from "./TelaDeErro.tsx";
+import { ambienteDeTeste } from "./testes/ambiente-de-teste.ts";
+
+afterEach(cleanup);
+// o React registra no console o erro que a reserva capturou: silenciado nestes testes
+beforeEach(() => {
+  vi.spyOn(console, "error").mockImplementation(() => undefined);
+  return () => vi.restoreAllMocks();
+});
+
+function Defeito(): never {
+  throw new Error("defeito simulado");
+}
+
+describe("tela de erro de reserva (§18.6)", () => {
+  it("Reserva mostra o conteúdo e, se ele lançar erro, a reserva no lugar", () => {
+    const { rerender } = render(
+      <Reserva reserva={<p>Reserva.</p>}>
+        <p>Conteúdo.</p>
+      </Reserva>,
+    );
+    expect(screen.getByText("Conteúdo.")).toBeDefined();
+    rerender(
+      <Reserva reserva={<p>Reserva.</p>}>
+        <Defeito />
+      </Reserva>,
+    );
+    expect(screen.getByText("Reserva.")).toBeDefined();
+  });
+
+  it("“Salvar o cálculo” baixa o último cálculo exibido, sem o resultado, e o arquivo abre com o aviso de sempre", async () => {
+    const user = userEvent.setup();
+    const ambiente = ambienteDeTeste();
+    const calculo = calculoCompleto();
+    render(<TelaDeErro ambiente={ambiente} calculo={() => calculo} />);
+    const alerta = screen.getByRole("alert");
+    expect(alerta.querySelector("h1")?.textContent).toBe("Algo deu errado no Apura.");
+    expect(alerta.querySelector("p")?.textContent).toBe(
+      "O cálculo em andamento pode ser salvo num arquivo antes de recomeçar.",
+    );
+    await user.click(screen.getByRole("button", { name: "Salvar o cálculo" }));
+    expect(ambiente.baixados[0]?.nome).toBe("apura-0800000-46.2026.8.12.0001-2026-10-11.json");
+    const conteudo = ambiente.baixados[0]?.conteudo ?? "";
+    expect(JSON.parse(conteudo)).not.toHaveProperty("resultado");
+    const leitura = lerArquivo(conteudo);
+    expect(leitura.ok).toBe(true);
+    await user.click(screen.getByRole("button", { name: "Recarregar a página" }));
+    expect(ambiente.recargas()).toBe(1);
+  });
+
+  it("sem cálculo exibido (o defeito veio antes), só “Recarregar a página”", () => {
+    render(<TelaDeErro ambiente={ambienteDeTeste()} calculo={() => null} />);
+    expect(screen.queryByRole("button", { name: "Salvar o cálculo" })).toBeNull();
+    expect(screen.getByRole("button", { name: "Recarregar a página" })).toBeDefined();
+  });
+
+  it("no App: um defeito no meio do uso troca a página pela reserva, que salva o cálculo que estava na tela", async () => {
+    const user = userEvent.setup();
+    const ambiente = ambienteDeTeste();
+    let quebrar = false;
+    const hoje = ambiente.hoje;
+    ambiente.hoje = () => {
+      if (quebrar) throw new Error("defeito simulado");
+      return hoje();
+    };
+    render(<App ambiente={ambiente} />);
+    await user.type(screen.getByLabelText("Exequente (alimentando)"), "A. B.");
+    quebrar = true;
+    await user.click(screen.getByRole("button", { name: "Tema do sistema" }));
+    expect(screen.getByRole("alert").textContent).toContain("Algo deu errado no Apura.");
+    await user.click(screen.getByRole("button", { name: "Salvar o cálculo" }));
+    const salvo = JSON.parse(ambiente.baixados[0]?.conteudo ?? "{}") as {
+      calculo?: { cabecalho?: { exequente?: string } };
+    };
+    expect(salvo.calculo?.cabecalho?.exequente).toBe("A. B.");
+  });
+});
diff --git a/src/ui/testes/ambiente-de-teste.ts b/src/ui/testes/ambiente-de-teste.ts
index 6557720..97c1260 100644
--- a/src/ui/testes/ambiente-de-teste.ts
+++ b/src/ui/testes/ambiente-de-teste.ts
@@ -58,6 +58,8 @@ export interface AmbienteDeTeste extends Ambiente {
   congelamentos: () => number;
   /** quantas vezes a tela pediu a impressão do navegador */
   impressoes: () => number;
+  /** quantas vezes a tela de erro pediu para recarregar a página */
+  recargas: () => number;
 }
 
 export function ambienteDeTeste(
@@ -77,6 +79,7 @@ export function ambienteDeTeste(
   let contador = 0;
   let congelamentos = 0;
   let impressoes = 0;
+  let recargas = 0;
   return {
     congelar: () => {
       congelamentos++;
@@ -93,9 +96,13 @@ export function ambienteDeTeste(
     imprimir: () => {
       impressoes++;
     },
+    recarregar: () => {
+      recargas++;
+    },
     baixados,
     armazenado,
     congelamentos: () => congelamentos,
     impressoes: () => impressoes,
+    recargas: () => recargas,
   };
 }
```

- [ ] **Step 2: Ver falhar**

Run: `npx vitest run`

Expected: FAIL:
- `TelaDeErro.test.tsx`, o arquivo inteiro: `Failed to resolve import "./componentes/Reserva.tsx"`
- `RelatorioDefeito.test.tsx` › "só a área do relatório mostra a frase; “Voltar ao cálculo” devolve a tela intacta": `Error: defeito simulado no relatório` (o erro ainda escapa)

Resumo: `Test Files  2 failed | 52 passed (54)`, `Tests  1 failed | 927 passed | 10 skipped (938)`.

- [ ] **Step 3: Aplicar o patch do código** (salvar em `$RASCUNHO/t6-codigo.patch` e `git apply --whitespace=nowarn`)

```diff
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index 87ddcfd..6d967af 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -1,5 +1,13 @@
-import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
-import type { Lancamento, LancamentoCalculado } from "../compartilhado/tipos.ts";
+import {
+  useCallback,
+  useEffect,
+  useLayoutEffect,
+  useMemo,
+  useReducer,
+  useRef,
+  useState,
+} from "react";
+import type { Calculo, Lancamento, LancamentoCalculado } from "../compartilhado/tipos.ts";
 import { compararIndicesUsados } from "../indices/congelar.ts";
 import { metodologiaDaOpcao } from "../metodologias/padrao.ts";
 import { calcular } from "../motor/calcular.ts";
@@ -19,6 +27,7 @@ import { CHAVE_RECENTES, removerChave } from "./armazenamento.ts";
 import { BarraSuperior } from "./BarraSuperior.tsx";
 import { Avisos } from "./componentes/Avisos.tsx";
 import { Dialogo } from "./componentes/Dialogo.tsx";
+import { Reserva } from "./componentes/Reserva.tsx";
 import {
   estadoInicial,
   novoCalculo,
@@ -42,6 +51,7 @@ import {
   type Recente,
 } from "./recentes.ts";
 import { Rodape } from "./Rodape.tsx";
+import { TelaDeErro } from "./TelaDeErro.tsx";
 import { VERSAO } from "./versao.ts";
 import { Indicadores } from "./tabelas/Indicadores.tsx";
 import { Personalizar } from "./tabelas/Personalizar.tsx";
@@ -53,12 +63,35 @@ import { LotePagamentosSecao } from "./secoes/LotePagamentos.tsx";
 import { LotePrestacoesSecao } from "./secoes/LotePrestacoes.tsx";
 import { Processo } from "./secoes/Processo.tsx";
 
+/**
+ * O Apura, com a tela de erro de reserva em volta (§18.6): um defeito do programa ao montar a tela
+ * troca a página pela reserva, que oferece salvar o último cálculo exibido. O `ambiente` é
+ * injetável para os testes de componente.
+ */
+export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambiente }) {
+  const ultimoCalculo = useRef<Calculo | null>(null);
+  const aoExibir = useCallback((calculo: Calculo) => {
+    ultimoCalculo.current = calculo;
+  }, []);
+  return (
+    <Reserva reserva={<TelaDeErro ambiente={ambiente} calculo={() => ultimoCalculo.current} />}>
+      <Tela ambiente={ambiente} aoExibir={aoExibir} />
+    </Reserva>
+  );
+}
+
 /**
  * Tela única em duas colunas (§9): esquerda, dados do caso e lançamentos em lote; direita,
  * resultado e lançamentos individuais. Recálculo a cada alteração, sem botão "Calcular" (§4.3).
- * O `ambiente` é injetável para os testes de componente.
  */
-export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambiente }) {
+function Tela({
+  ambiente,
+  aoExibir,
+}: {
+  ambiente: Ambiente;
+  /** recebe cada cálculo exibido (para a tela de erro de reserva salvá-lo) */
+  aoExibir: (calculo: Calculo) => void;
+}) {
   const armazenamento = ambiente.armazenamento();
   const [preferencias, setPreferencias] = useState(() => lerPreferencias(armazenamento));
   // Tema (decisão de 12/10/2026): "sistema" deixa o CSS seguir prefers-color-scheme; "claro" e
@@ -85,6 +118,8 @@ export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambien
     () => calcular(estado.calculo, estado.tabela),
     [estado.calculo, estado.tabela],
   );
+  // só depois de exibido: se o cálculo novo derrubar a tela, fica guardado o anterior
+  useEffect(() => aoExibir(estado.calculo), [aoExibir, estado.calculo]);
   const agora = () => ambiente.agora();
   // o que falta na base para apurar as prestações lançadas: aviso no topo e campo em vermelho
   const faltas = faltasDaBase(estado.calculo);
@@ -248,13 +283,21 @@ export default function App({ ambiente = ambientePadrao() }: { ambiente?: Ambien
             </button>
           </nav>
           <Avisos avisos={avisosDaTela} titulo="Antes de juntar, confira:" />
-          <Relatorio
-            calculo={estado.calculo}
-            resultado={resultado}
-            hoje={ambiente.hoje()}
-            versao={VERSAO}
-            focar
-          />
+          <Reserva
+            reserva={
+              <p className="relatorio-erro" role="alert">
+                Não foi possível montar o relatório deste cálculo.
+              </p>
+            }
+          >
+            <Relatorio
+              calculo={estado.calculo}
+              resultado={resultado}
+              hoje={ambiente.hoje()}
+              versao={VERSAO}
+              focar
+            />
+          </Reserva>
         </main>
       ) : (
         <p className="so-na-impressao">
diff --git a/src/ui/TelaDeErro.tsx b/src/ui/TelaDeErro.tsx
new file mode 100644
index 0000000..ed8abd2
--- /dev/null
+++ b/src/ui/TelaDeErro.tsx
@@ -0,0 +1,42 @@
+import type { Calculo } from "../compartilhado/tipos.ts";
+import type { Ambiente } from "./ambiente.ts";
+import { nomeDoArquivo } from "./arquivo.ts";
+
+/**
+ * O que aparece no lugar do Apura quando um defeito do programa impede a tela de ser montada
+ * (§18.6): a frase, "Salvar o cálculo" (o último cálculo exibido, sem o resultado; o arquivo abre
+ * depois com o aviso de arquivo sem resultado) e "Recarregar a página". Sem cálculo exibido (o
+ * defeito veio antes), só "Recarregar a página".
+ */
+export function TelaDeErro({
+  ambiente,
+  calculo,
+}: {
+  ambiente: Ambiente;
+  calculo: () => Calculo | null;
+}) {
+  const salvar = () => {
+    const atual = calculo();
+    if (atual === null) return;
+    ambiente.baixar(
+      nomeDoArquivo(atual),
+      JSON.stringify({ formato: "apura/calculo@1", calculo: atual }, null, 2),
+    );
+  };
+  return (
+    <main className="tela-de-erro" role="alert">
+      <h1>Algo deu errado no Apura.</h1>
+      <p>O cálculo em andamento pode ser salvo num arquivo antes de recomeçar.</p>
+      <div className="dialogo-acoes">
+        {calculo() === null ? null : (
+          <button type="button" className="botao" onClick={salvar}>
+            Salvar o cálculo
+          </button>
+        )}
+        <button type="button" className="botao secundario" onClick={() => ambiente.recarregar()}>
+          Recarregar a página
+        </button>
+      </div>
+    </main>
+  );
+}
diff --git a/src/ui/ambiente.ts b/src/ui/ambiente.ts
index fa9927b..970f0a0 100644
--- a/src/ui/ambiente.ts
+++ b/src/ui/ambiente.ts
@@ -28,6 +28,8 @@ export interface Ambiente {
   baixar: (nome: string, conteudo: string) => void;
   /** abre a impressão do navegador ("Imprimir / Salvar PDF", §18.1) */
   imprimir: () => void;
+  /** recarrega a página (tela de erro de reserva, §18.6) */
+  recarregar: () => void;
 }
 
 function armazenamentoDoNavegador(): Storage | null {
@@ -61,5 +63,6 @@ export function ambientePadrao(): Ambiente {
     armazenamento: armazenamentoDoNavegador,
     baixar: baixarPeloNavegador,
     imprimir: () => window.print(),
+    recarregar: () => window.location.reload(),
   };
 }
diff --git a/src/ui/componentes/Reserva.tsx b/src/ui/componentes/Reserva.tsx
new file mode 100644
index 0000000..553264f
--- /dev/null
+++ b/src/ui/componentes/Reserva.tsx
@@ -0,0 +1,21 @@
+import { Component, type ReactNode } from "react";
+
+/**
+ * Tela de erro de reserva (§18.6): se o conteúdo lançar um erro ao ser montado (defeito do
+ * programa, não dado do usuário, que o motor devolve como aviso), mostra a `reserva` no lugar, em
+ * vez de apagar a página. O React exige um componente de classe para isso.
+ */
+export class Reserva extends Component<
+  { children: ReactNode; reserva: ReactNode },
+  { erro: boolean }
+> {
+  override state = { erro: false };
+
+  static getDerivedStateFromError(): { erro: boolean } {
+    return { erro: true };
+  }
+
+  override render(): ReactNode {
+    return this.state.erro ? this.props.reserva : this.props.children;
+  }
+}
diff --git a/src/ui/estilos.css b/src/ui/estilos.css
index 5bd43ac..8f94e32 100644
--- a/src/ui/estilos.css
+++ b/src/ui/estilos.css
@@ -1099,3 +1099,29 @@ td.dica {
     padding: 0;
   }
 }
+
+/* ---- Tela de erro de reserva (§18.6) ---- */
+
+.tela-de-erro {
+  max-width: 640px;
+  margin: 48px auto;
+  padding: 20px 24px;
+  background: var(--superficie);
+  border: 1px solid var(--linha);
+  border-top: 4px solid var(--vermelho);
+  border-radius: 8px;
+}
+
+.tela-de-erro h1 {
+  font-size: 20px;
+  margin-bottom: 8px;
+}
+
+.relatorio-erro {
+  margin: 0;
+  padding: 16px;
+  background: var(--superficie);
+  border: 1px solid var(--linha);
+  border-left: 4px solid var(--vermelho);
+  border-radius: 8px;
+}
```

- [ ] **Step 4: Formatar e verificar**

Run: `npm run format && npm run verificar`

Expected: o `format` não muda nada; tudo verde, com `Test Files  54 passed (54)`, `Tests  932 passed | 10 skipped (942)`.

- [ ] **Step 5: Commit**

```bash
git add src/ui/componentes/Reserva.tsx src/ui/TelaDeErro.tsx src/ui/ambiente.ts src/ui/App.tsx src/ui/estilos.css src/ui/testes/ambiente-de-teste.ts src/ui/TelaDeErro.test.tsx src/ui/RelatorioDefeito.test.tsx
git commit -m 'ui: tela de erro de reserva no app e no relatório (pendência da fase 5)' -m 'Co-Authored-By: <modelo> <noreply@anthropic.com>'
```


### Task 7: Região viva: total geral e quantidade de avisos

**Files:**
- Create: `src/ui/componentes/anuncio.ts` (`useAnuncio`, `ESPERA_DO_ANUNCIO_MS`)
- Create: `src/ui/componentes/Anuncios.tsx`
- Modify: `src/ui/tabelas/Indicadores.tsx` (`totalGeralExibido`)
- Modify: `src/ui/App.tsx` (os anúncios fora das colunas)
- Test: `src/ui/RegiaoViva.test.tsx`

**Interfaces:**
- Consumes: `avisosDaTela` (Task 5) e a `Tela` (Task 6) no `App.tsx`.
- Produces: `useAnuncio(texto: string): string`; `Anuncios({ totalGeral: string; avisos: number })`; `totalGeralExibido(totais: Totais): string`; as classes `anuncio-do-total` e `anuncio-dos-avisos`.

Pendência da fase 5 (§18.6): cerca de um segundo depois da última mudança, o leitor de tela ouve "Total geral: R$ …" e, quando muda a quantidade de avisos, "2 avisos no cálculo"; ao carregar a página, nada. As regiões ficam fora das colunas, que "Abrir" e "Novo cálculo" remontam (T8). O anúncio compara com o último texto visto, e não conta renderizações, para ficar calado no modo estrito do React.

- [ ] **Step 1: Aplicar o patch dos testes** (salvar em `$RASCUNHO/t7-testes.patch` e `git apply --whitespace=nowarn`)

```diff
diff --git a/src/ui/RegiaoViva.test.tsx b/src/ui/RegiaoViva.test.tsx
new file mode 100644
index 0000000..dfa09ae
--- /dev/null
+++ b/src/ui/RegiaoViva.test.tsx
@@ -0,0 +1,57 @@
+// @vitest-environment jsdom
+import { act, cleanup, render, screen } from "@testing-library/react";
+import userEvent from "@testing-library/user-event";
+import { afterEach, describe, expect, it, vi } from "vitest";
+import App from "./App.tsx";
+import { Anuncios } from "./componentes/Anuncios.tsx";
+import { ambienteDeTeste } from "./testes/ambiente-de-teste.ts";
+
+afterEach(() => {
+  cleanup();
+  vi.useRealTimers();
+});
+
+describe("região viva (§18.6)", () => {
+  it("o total geral é anunciado cerca de um segundo depois da última mudança, nunca ao abrir", () => {
+    vi.useFakeTimers();
+    const { container, rerender } = render(<Anuncios totalGeral="R$ 100,00" avisos={1} />);
+    const total = () => container.querySelector(".anuncio-do-total");
+    expect(total()?.getAttribute("role")).toBe("status");
+    act(() => vi.advanceTimersByTime(2000));
+    expect(total()?.textContent).toBe("");
+    rerender(<Anuncios totalGeral="R$ 200,00" avisos={1} />);
+    act(() => vi.advanceTimersByTime(500));
+    rerender(<Anuncios totalGeral="R$ 2.497,35" avisos={1} />);
+    act(() => vi.advanceTimersByTime(900));
+    expect(total()?.textContent).toBe("");
+    act(() => vi.advanceTimersByTime(100));
+    expect(total()?.textContent).toBe("Total geral: R$ 2.497,35");
+  });
+
+  it("a quantidade de avisos é anunciada quando muda", () => {
+    vi.useFakeTimers();
+    const { container, rerender } = render(<Anuncios totalGeral="R$ 1,00" avisos={1} />);
+    const quantos = () => container.querySelector(".anuncio-dos-avisos");
+    act(() => vi.advanceTimersByTime(2000));
+    expect(quantos()?.textContent).toBe("");
+    rerender(<Anuncios totalGeral="R$ 1,00" avisos={2} />);
+    act(() => vi.advanceTimersByTime(1000));
+    expect(quantos()?.textContent).toBe("2 avisos no cálculo");
+    rerender(<Anuncios totalGeral="R$ 1,00" avisos={0} />);
+    act(() => vi.advanceTimersByTime(1000));
+    expect(quantos()?.textContent).toBe("Nenhum aviso no cálculo");
+    rerender(<Anuncios totalGeral="R$ 1,00" avisos={1} />);
+    act(() => vi.advanceTimersByTime(1000));
+    expect(quantos()?.textContent).toBe("1 aviso no cálculo");
+  });
+
+  it("no App, os anúncios ficam fora das colunas: “Novo cálculo” (que remonta as colunas) não os recria", async () => {
+    const user = userEvent.setup();
+    const { container } = render(<App ambiente={ambienteDeTeste()} />);
+    const antes = container.querySelector(".anuncio-do-total");
+    expect(antes?.closest(".principal")).toBeNull();
+    await user.click(screen.getByRole("button", { name: "Novo cálculo" }));
+    expect(container.querySelector(".anuncio-do-total")).toBe(antes);
+    expect(container.querySelectorAll(".anuncio-do-total")).toHaveLength(1);
+  });
+});
```

- [ ] **Step 2: Ver falhar**

Run: `npx vitest run`

Expected: FAIL, o arquivo de teste inteiro: `FAIL  src/ui/RegiaoViva.test.tsx` com `Failed to resolve import "./componentes/Anuncios.tsx"`.

Resumo: `Test Files  1 failed | 54 passed (55)`, `Tests  932 passed | 10 skipped (942)`.

- [ ] **Step 3: Aplicar o patch do código** (salvar em `$RASCUNHO/t7-codigo.patch` e `git apply --whitespace=nowarn`)

```diff
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index 6d967af..ca0c709 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -25,6 +25,7 @@ import {
 } from "./arquivo.ts";
 import { CHAVE_RECENTES, removerChave } from "./armazenamento.ts";
 import { BarraSuperior } from "./BarraSuperior.tsx";
+import { Anuncios } from "./componentes/Anuncios.tsx";
 import { Avisos } from "./componentes/Avisos.tsx";
 import { Dialogo } from "./componentes/Dialogo.tsx";
 import { Reserva } from "./componentes/Reserva.tsx";
@@ -53,7 +54,7 @@ import {
 import { Rodape } from "./Rodape.tsx";
 import { TelaDeErro } from "./TelaDeErro.tsx";
 import { VERSAO } from "./versao.ts";
-import { Indicadores } from "./tabelas/Indicadores.tsx";
+import { Indicadores, totalGeralExibido } from "./tabelas/Indicadores.tsx";
 import { Personalizar } from "./tabelas/Personalizar.tsx";
 import { TabelaLancamentos, type LinhaDaTabela } from "./tabelas/TabelaLancamentos.tsx";
 import { BaseDosAlimentos } from "./secoes/Base.tsx";
@@ -272,6 +273,7 @@ function Tela({
         tema={preferencias.tema}
         aoMudarTema={(tema) => mudarPreferencias({ tema })}
       />
+      <Anuncios totalGeral={totalGeralExibido(resultado.totais)} avisos={avisosDaTela.length} />
       {vendoRelatorio ? (
         <main className="principal-relatorio">
           <nav className="faixa-de-acoes" aria-label="Ações do relatório">
diff --git a/src/ui/componentes/Anuncios.tsx b/src/ui/componentes/Anuncios.tsx
new file mode 100644
index 0000000..ce8fcee
--- /dev/null
+++ b/src/ui/componentes/Anuncios.tsx
@@ -0,0 +1,28 @@
+import { useAnuncio } from "./anuncio.ts";
+
+/**
+ * Regiões vivas da tela (§18.6), fora das colunas (que "Abrir" e "Novo cálculo" remontam): cerca de
+ * um segundo depois da última mudança, o leitor de tela anuncia o total geral ("Total geral:
+ * R$ 2.497,35") e, quando muda a quantidade de avisos, quantos são ("2 avisos no cálculo"). Ao
+ * abrir a página, nada.
+ */
+export function Anuncios({ totalGeral, avisos }: { totalGeral: string; avisos: number }) {
+  const total = useAnuncio(`Total geral: ${totalGeral}`);
+  const quantos = useAnuncio(
+    avisos === 0
+      ? "Nenhum aviso no cálculo"
+      : avisos === 1
+        ? "1 aviso no cálculo"
+        : `${avisos} avisos no cálculo`,
+  );
+  return (
+    <>
+      <p className="oculto-acessivel anuncio-do-total" role="status">
+        {total}
+      </p>
+      <p className="oculto-acessivel anuncio-dos-avisos" role="status">
+        {quantos}
+      </p>
+    </>
+  );
+}
diff --git a/src/ui/componentes/anuncio.ts b/src/ui/componentes/anuncio.ts
new file mode 100644
index 0000000..cabe027
--- /dev/null
+++ b/src/ui/componentes/anuncio.ts
@@ -0,0 +1,22 @@
+import { useEffect, useRef, useState } from "react";
+
+/** Quanto o anúncio espera, depois da última mudança, para não falar a cada tecla (§18.6). */
+export const ESPERA_DO_ANUNCIO_MS = 1000;
+
+/**
+ * Texto para uma região viva (`role="status"`): fica vazio ao abrir e passa a `texto` quando ele
+ * muda e fica parado por `ESPERA_DO_ANUNCIO_MS`; o leitor de tela lê a mudança. Comparar com o
+ * último texto visto (e não contar renderizações) mantém o anúncio calado também no modo estrito
+ * do React, que roda os efeitos duas vezes ao montar.
+ */
+export function useAnuncio(texto: string): string {
+  const [anuncio, setAnuncio] = useState("");
+  const visto = useRef(texto);
+  useEffect(() => {
+    if (texto === visto.current) return;
+    visto.current = texto;
+    const espera = setTimeout(() => setAnuncio(texto), ESPERA_DO_ANUNCIO_MS);
+    return () => clearTimeout(espera);
+  }, [texto]);
+  return anuncio;
+}
diff --git a/src/ui/tabelas/Indicadores.tsx b/src/ui/tabelas/Indicadores.tsx
index 198cf21..4741a6b 100644
--- a/src/ui/tabelas/Indicadores.tsx
+++ b/src/ui/tabelas/Indicadores.tsx
@@ -3,6 +3,13 @@ import { decimal, ZERO } from "../../compartilhado/decimal.ts";
 import { formatarData, formatarMoeda } from "../../compartilhado/formatacao.ts";
 import type { DataISO, Totais } from "../../compartilhado/tipos.ts";
 
+/** O total geral como o indicador o mostra: R$ 0,00 quando não há dívida (§6.6). */
+export function totalGeralExibido(totais: Totais): string {
+  return decimal(totais.totalDevido).lte(ZERO)
+    ? formatarMoeda(ZERO)
+    : formatarMoeda(decimal(totais.totalGeral));
+}
+
 /**
  * Os cinco indicadores (§9.3), na ordem: prestações atualizadas · amortizações atualizadas ·
  * total devido na data (destaque) · multa e honorários · total geral (destaque). Dívida negativa
@@ -60,7 +67,7 @@ export function Indicadores({
       </div>
       <div className="indicador destaque">
         <dt>Total geral</dt>
-        <dd>{valor(semDivida ? formatarMoeda(ZERO) : moeda(totais.totalGeral))}</dd>
+        <dd>{valor(totalGeralExibido(totais))}</dd>
       </div>
     </dl>
   );
```

- [ ] **Step 4: Formatar e verificar**

Run: `npm run format && npm run verificar`

Expected: o `format` não muda nada; tudo verde, com `Test Files  55 passed (55)`, `Tests  935 passed | 10 skipped (945)`.

- [ ] **Step 5: Commit**

```bash
git add src/ui/componentes/anuncio.ts src/ui/componentes/Anuncios.tsx src/ui/tabelas/Indicadores.tsx src/ui/App.tsx src/ui/RegiaoViva.test.tsx
git commit -m 'ui: região viva com o total geral e a quantidade de avisos (pendência da fase 5)' -m 'Co-Authored-By: <modelo> <noreply@anthropic.com>'
```


### Task 8: Ajustes visuais: fontes e lápis/✕ sempre à vista

**Files:**
- Modify: `src/main.tsx` (Source Sans 3 400 itálico e 700)
- Modify: `src/ui/estilos.css` (espaço lateral das células de 6 para 5 px; coluna das ações presa à direita; o tom da linha nova na célula fixa)

**Interfaces:**
- Consumes: as classes `tabela-rolagem`, `acoes-linha` e `linha-nova` das tabelas da fase 5.
- Produces: nada que outra tarefa use.

Pendência da fase 5 (§18.6, T7 e T9 deste plano). Só CSS e importação de fontes: o jsdom não aplica a cascata nem mede larguras, e por isso esta tarefa não tem teste automatizado; a conferência é a Task 9 (Steps 2 e 5), com as medidas do ensaio: em 1366 px a tabela de prestações cabe inteira (730 de 730 px); em 1100 px os números rolam e o lápis e o ✕ ficam presos à direita.

- [ ] **Step 1: Aplicar o patch do código** (salvar em `$RASCUNHO/t8-codigo.patch` e `git apply --whitespace=nowarn`)

```diff
diff --git a/src/main.tsx b/src/main.tsx
index fd413c5..0e563b1 100644
--- a/src/main.tsx
+++ b/src/main.tsx
@@ -1,7 +1,11 @@
 // Fontes do manual de identidade da DPE-MS (§10.2), embutidas no site (sem carregar do Google):
-// Ubuntu para títulos e números de destaque; Source Sans 3 para o texto. Só o alfabeto latino.
+// Ubuntu para títulos e números de destaque; Source Sans 3 para o texto, com o itálico e o negrito
+// que o relatório usa (fase 6; sem eles o navegador inventa o itálico e troca o 700 pelo 600). Só o
+// alfabeto latino.
 import "@fontsource/source-sans-3/latin-400.css";
+import "@fontsource/source-sans-3/latin-400-italic.css";
 import "@fontsource/source-sans-3/latin-600.css";
+import "@fontsource/source-sans-3/latin-700.css";
 import "@fontsource/ubuntu/latin-500.css";
 import "@fontsource/ubuntu/latin-700.css";
 import { StrictMode } from "react";
diff --git a/src/ui/estilos.css b/src/ui/estilos.css
index 8f94e32..164e1c3 100644
--- a/src/ui/estilos.css
+++ b/src/ui/estilos.css
@@ -578,7 +578,7 @@ table {
 
 th,
 td {
-  padding: 5px 6px;
+  padding: 5px 5px;
   border-bottom: 1px solid var(--linha);
   text-align: right;
   white-space: nowrap;
@@ -838,6 +838,32 @@ td.dica {
   white-space: nowrap;
 }
 
+/* O lápis e o ✕ ficam sempre à vista (fase 6, §18.6): a coluna das ações fica presa à borda
+   direita da tabela, e só os números rolam por baixo dela quando a coluna da direita é estreita
+   (valores com milhar pedem cerca de 720 px; a coluna tem 730 px numa tela de 1366 px e 540 px
+   numa de 1024 px). */
+.tabela-rolagem thead th:last-child,
+.tabela-rolagem td.acoes-linha,
+.tabela-rolagem tfoot td:last-child {
+  position: sticky;
+  right: 0;
+  z-index: 1;
+  box-shadow: -6px 0 6px -6px rgba(0, 0, 0, 0.35);
+}
+
+.tabela-rolagem td.acoes-linha {
+  background: var(--superficie);
+}
+
+.tabela-rolagem tfoot td:last-child {
+  background: var(--linha-alternada);
+}
+
+/* a linha nova é tingida: a célula fixa do ✓/✕ acompanha o tom dela */
+.tabela-rolagem tr.linha-nova td.acoes-linha {
+  background: var(--linha-alternada);
+}
+
 .botao-icone {
   background: transparent;
   border: 1px solid transparent;
```

- [ ] **Step 2: Formatar e verificar**

Run: `npm run format && npm run verificar`

Expected: o `format` não muda nada; tudo verde, com `Test Files  55 passed (55)`, `Tests  935 passed | 10 skipped (945)` (nenhum teste novo).

- [ ] **Step 3: Commit**

```bash
git add src/main.tsx src/ui/estilos.css
git commit -m 'ui: fontes itálico e negrito embutidas; lápis e ✕ sempre à vista nas tabelas (pendência da fase 5)' -m 'Co-Authored-By: <modelo> <noreply@anthropic.com>'
```


### Task 9: Conferência no navegador e no PDF

**Files:** nenhum, salvo ajuste de CSS que a conferência exigir (relatado e commitado como "ui: …" ou "relatorio: …", com `npm run verificar` verde).

O jsdom não mede larguras nem imprime: esta tarefa confere no navegador integrado (`npm run dev`) e em PDF o que os testes não alcançam.

- [ ] **Step 1: Montar um cálculo de conferência.** No app, com o tema do sistema: nº do processo de teste, órgão e defensor(a) de teste; base em valor fixo de R$ 1.000,00 fixado em 10/01/2023 com reajuste pelo IPCA em janeiro, dividida em 01/01/2025 com 30% do salário mínimo; lote de prestações de 05/01/2023 até um mês depois da data do cálculo (a última vincenda); lote de pagamentos de R$ 400,00 de 10/02/2024 a 10/12/2024; um 13º em 20/12/2025 com valor informado e descrição longa; uma prestação avulsa com termo inicial dos juros próprio; um pagamento avulso posterior à data do cálculo; observações em duas linhas.
- [ ] **Step 2: Tela.** Em 1366 px: "Relatório / PDF" ligado; o relatório abre no lugar das colunas, com a faixa "Antes de juntar, confira:", o título da aba "Apura – <processo> – <data>" e o foco no título; as palavras nas linhas, as notas, os totais, os parágrafos de "Metodologia e fundamentos" (conferir o texto com a §18.5), a matriz e o rodapé; "← Voltar ao cálculo" devolve a tela como estava, com o foco no botão. Repetir no tema escuro (o relatório acompanha o tema) e a 375 px (a página não rola para o lado).
- [ ] **Step 3: Impressão.** Com o tema escuro ligado, "Imprimir / Salvar PDF" → "Salvar como PDF": o PDF sai claro, em A4, com a faixa verde e o cabeçalho das tabelas coloridos, o cabeçalho repetido em cada página, os totais só no fim da tabela, nenhuma linha cortada, o título "Índices aplicados" junto da primeira tabela, a barra, a faixa de ações e a faixa de avisos fora do papel, e o nome sugerido "Apura – <processo> – <data>". Na tela de cálculo, Ctrl+P mostra só "Para imprimir o demonstrativo, use o botão Relatório / PDF."
- [ ] **Step 4: Botão desligado.** Apagar o percentual do período da base que tem prestação: o botão fica desligado, com a contagem no `title`; devolver o percentual: ligado de novo.
- [ ] **Step 5: Tabelas da tela.** Em 1366 px, com o cálculo do Step 1, a tabela de prestações cabe inteira na coluna (sem rolagem lateral); em 1100 px, os números rolam e o lápis e o ✕ ficam presos à direita, com a sombra; "+ Prestação" abre a linha nova com a célula do ✓/✕ no mesmo tom da linha.
- [ ] **Step 6: Build.** `npm run build` gera `dist/` sem erro, com `dist/logos/dpems-horizontal-branca-relatorio.png`.

### Task 10: Fechamento da fase: roteiro, CLAUDE.md, design, plano e verificação final

**Files:**
- Modify: `docs/superpowers/roteiro.md` (linha da fase 6: "concluída em <data> · plano: `docs/superpowers/plans/2026-10-13-fase-6-relatorio-e-pdf.md`")
- Modify: `CLAUDE.md` (seção "Estado": fase 6 concluída, com um parágrafo do que ela entregou e a contagem final; "Próxima: fase 7 (publicação)"; mapa de pastas: `src/relatorio/` com `texto.ts · metodologia.ts · tabelas.ts · matriz.ts · bloqueio.ts · Relatorio.tsx · relatorio.css · testes/`; `src/ui/` com `TelaDeErro.tsx` e, em `componentes/`, `Reserva.tsx`, `anuncio.ts` e `Anuncios.tsx`; `public/logos/` com o logo do relatório; a frase "resta a parte do ponto 1 sobre o pro rata no mês final" passa a "todos os pontos foram decididos (o ponto 1 por inteiro em 13/10/2026, na fase 6)")
- Modify: `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md` (§18.9: plano executado, com a data; §12.2: a linha de `src/relatorio/` com os arquivos reais)
- Modify: `docs/superpowers/plans/2026-10-12-fase-5-interface.md` (nas pendências da fase 6, marcar como resolvidas na fase 6 a tela de erro de reserva, a região viva e a revisão visual, com a nota de que o logo fica em 48 px)
- Modify: este plano (seção "Estado", com o modo de execução, as contagens medidas e o que a revisão final achou)

- [ ] **Step 1:** Atualizar os cinco arquivos acima.
- [ ] **Step 2:** `npm run format && npm run verificar`: verde, com a contagem final do plano.
- [ ] **Step 3:** Commit: `docs: fechamento da fase 6 (roteiro, CLAUDE.md, design e plano)`.

## Estado

Plano escrito em 13/10/2026, a partir do ensaio e da reconstrução descritos em "Para o responsável". Executado no mesmo dia, por escolha do responsável, direto na sessão (superpowers:executing-plans, Claude Opus 5.5), na branch `claude/apura-fase-6-plan-55c423`, a partir de `a34a10a`. Em cada tarefa, o patch dos testes falhou como o passo previa (na Task 6, o Vite relatou `./TelaDeErro.tsx` em vez de `./componentes/Reserva.tsx`: os dois imports faltam, e ele relata um ou outro) e o do código deixou `npm run verificar` verde, com o `format` sem mudança e as contagens do plano: 1 → 864 passando e 10 pulados (874), 46 arquivos; 2 → 893 (903), 47; 3 → 916 (926), 50; 4 → 923 (933), 51 (logo com o mesmo `shasum` do ensaio); 5 → 927 (937), 52; 6 → 932 (942), 54; 7 → 935 (945), 55; 8 → 935 (945), 55. A Task 9 confirmou no navegador integrado e em PDF (Chrome sem janela) tudo o que o passo pedia, sem ajuste de CSS; o Step 4 foi conferido com um cálculo novo e a base em branco, porque apagar um campo da base não leva o vazio ao cálculo (o campo guarda o último valor válido, como desde a fase 5); `npm run build` gerou `dist/`. Revisão final da branch: ver o parágrafo seguinte.

## Notas para a fase 7

- A versão impressa no rodapé do relatório é `VERSAO` (`src/ui/versao.ts`, do `package.json`): com o `0.1.0` da fase 7, o relatório passa a dizer "Gerado com Apura v0.1.0".
- O `dist/` leva o logo do relatório (142 KB) e as fontes novas (Source Sans 3 400 itálico e 700); nada mais muda na publicação.
- A impressão foi conferida no Chrome; na fase 7, vale abrir o relatório publicado no navegador da rede da Defensoria e imprimir uma vez.

## Auto-revisão do plano

- **Cobertura da §18:** 18.1 → Tasks 3 (`motivoDoBloqueio`) e 5 (mesma página, faixa de ações, faixa de avisos, título da aba, foco); 18.2 → Tasks 4 (CSS de impressão, totais sem `tfoot`) e 5 (impressão da tela, frase só de impressão); 18.3 → Tasks 3 (conteúdo) e 4 (componente, logo); 18.4 e 18.5 → Tasks 1 (reajustes) e 2 (textos); 18.6 → Tasks 6 (reserva), 7 (região viva) e 8 (ajustes visuais); 18.7 → Tasks 2 e 3 (textos pelo resultado, encargos próprios, plural, mês inválido, totais) e 7 (anúncios fora das colunas); 18.8 → testes de cada tarefa e Task 9; 18.9 → Task 10. Ponto 1 da §7 (decidido): Task 2 (texto do pro rata final) e Task 10 (`CLAUDE.md`).
- **Placeholders:** nenhum "TBD" ou "implementar depois"; todo passo de código traz o patch inteiro, aplicado na reconstrução. Os únicos espaços a preencher na execução são a data (Task 10), o nome do modelo na linha de coautoria e a pasta de rascunho (`$RASCUNHO`).
- **Nomes entre tarefas (conferidos no código do ensaio):** `ReajusteDaBase`, `LancamentoCalculado.reajustes` (Task 1, usados na 2); `Par`, `pares`, `listar`, `percentualInformado`, `comSinalDeMenos`, `diferencasDosEncargos`, `periodosAlcancados`, `mesmasRegras`, `regrasResumidas`, `metodologiaEFundamentos` (Task 2, usados nas 3 e 4); `calculoDeTeste`, `calculoCompleto`, `prestacao`, `pagamento`, `resultadoDe`, `metodologiaDeTresPeriodos` (Tasks 2 e 3, usados nas 4 a 7); `tabelasDoRelatorio`, `indicadoresDoRelatorio`, `totaisDoRelatorio`, `cabecalhoDoRelatorio`, `tituloDoDocumento`, `rodapeDoRelatorio`, `matrizesDeIndices`, `motivoDoBloqueio` (Task 3, usados nas 4 e 5); `Relatorio` e a prop `focar` (Tasks 4 e 5); `Ambiente.imprimir`/`impressoes` (Task 5), `Ambiente.recarregar`/`recargas` (Task 6); `Reserva`, `TelaDeErro`, `Tela` (Task 6); `useAnuncio`, `Anuncios`, `totalGeralExibido` (Task 7).
- **Foco da revisão:** os cinco itens têm teste na tarefa dona (1: Task 2; 2: Task 3; 3: Tasks 3 e 5; 4: Tasks 4 e 5, mais a Task 9 no PDF; 5: Task 6).
- **Reconstrução:** contagens medidas ao fim de cada tarefa, a partir de 861 passando e 10 pulados (871), em 46 arquivos: 1 → 864 (874), 46; 2 → 893 (903), 47; 3 → 916 (926), 50; 4 → 923 (933), 51; 5 → 927 (937), 52; 6 → 932 (942), 54; 7 → 935 (945), 55; 8 → 935 (945), 55; sempre com 10 pulados. Os passos "ver falhar" trazem as falhas medidas. O estado final é idêntico ao do ensaio, e `npm run build` passa.
