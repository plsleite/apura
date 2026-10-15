# Apura · Fase 7 · Publicação — plano de implementação

> **Para agentes executores:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa a tarefa. Os passos usam caixas de seleção (`- [ ]`) para acompanhamento. As Tasks 10 a 15 têm passos do responsável (nos painéis do GitHub, do Cloudflare e do Healthchecks) e ações para fora (criar o repositório, enviar, desligar e religar workflows, disparar a rotina, pôr a etiqueta): **cada ação para fora só depois da confirmação do responsável no chat, uma de cada vez**, e nenhum segredo passa pelo chat.

**Objetivo:** o Apura 0.1.0 publicado em `https://apura-dpems.pages.dev` para os testadores, a partir do repositório privado `plsleite/apura`, com integração contínua, a rotina de índices ligada e vigiada, a conferência automática de que o site tem os índices da `main`, e os acertos adiados do relatório e da interface.

**Arquitetura:** o código muda pouco e em pontos isolados: frases do relatório (`src/relatorio/`), um campo estruturado novo no motor (`salarioMinimoAnterior`, sem mudar números), o download do "Salvar", a versão. O que é novo fica nas bordas: o site montado ganha cabeçalhos de segurança (`public/_headers`), o script do tema sai do `index.html` (`public/tema.js`) e um `versao.json` gerado pela montagem (`vite.config.ts`, com a função pura de `src/indices/publicacao.ts`); a rotina ganha a conferência da publicação (função pura testada sem rede + `scripts/conferir-publicacao.ts`); os workflows são endurecidos e conferidos por testes de leitura (`scripts/workflows.test.ts`) e pelo `actionlint`; o `testes.yml` é novo. A publicação é a integração Git do Cloudflare Pages, configurada no painel; nenhum workflow publica.

**Tecnologia:** TypeScript estrito, React 19, Vite 8, Vitest (Node e jsdom), decimal.js; GitHub Actions (`actions/checkout` 7.0.1 e `actions/setup-node` 7.0.0, fixadas por SHA); Cloudflare Pages (integração Git); Healthchecks.io; `gh` (já autenticado na máquina, conta `plsleite`); `actionlint` 1.7.12 (Homebrew, já instalado no ensaio). Nenhuma dependência npm nova.

**Especificação:** `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md`, seção 19 (fase 7), com a §13 (publicação), a §14 (LGPD e segurança), a §8.2 (rotina) e a §18 (relatório) para o que ela não muda. Leia a §19 inteira antes de começar; a §19.7 traz as frases aprovadas, que entram nos testes literalmente.

## Restrições globais (valem para todas as tarefas)

- As do `CLAUDE.md` (regras obrigatórias 1 a 9): TDD; dinheiro, percentuais e fatores em `Decimal` (só de `src/compartilhado/decimal.ts`) ou texto decimal com ponto; datas como texto ISO; motor puro; `new Date()` só em `src/indices/relogio.ts`; rede, relógio e disco injetáveis em `src/indices/` (os scripts de `scripts/` são os únicos com os tipos do Node); nenhum teste com rede nem com os últimos meses de `dados/indices/`; imports relativos com `.ts`/`.tsx` e `import type`.
- Os textos aprovados da §10.4, da §17.2, da §17.3, da §18.5 e da §19.7 entram literalmente nos testes; não os reescreva. O relatório não fala de versões, ajustes nem personalização (regra 7).
- **Nenhum segredo no chat, nos arquivos ou nos registros.** `HC_URL` e `CF_DEPLOY_HOOK` são colados pelo responsável direto no painel do GitHub. O Claude nunca digita senha, token ou cartão em painel algum; se um serviço pedir cartão ou pagamento, para e pergunta ao responsável.
- **Ações para fora só com confirmação, uma de cada vez:** criar o repositório, enviar (`git push`), desligar ou religar workflows, disparar a rotina, criar a etiqueta. Antes de cada uma, dizer em uma frase o que vai acontecer e esperar o "sim".
- Versões novas de qualquer coisa (pacote npm, action, Node) só com 14 dias de publicadas (§19.6). Nenhuma dependência npm nova nesta fase.
- Commits em português, "módulo: o que muda", terminados com a linha de coautoria do modelo que de fato executa (`Co-Authored-By: <nome do modelo> <noreply@anthropic.com>`).
- Fora desta fase: o subdomínio da Defensoria (só se a rede bloquear `*.pages.dev`, §19.2); a restrição de acesso por e-mail; o robô de atualização de dependências; as melhorias "sem fase" das fases 4 e 5; os limites aceitos na §18.7.

## Foco da revisão

Entradas e situações que a especificação implica e que podem morder quem usa o Apura ou quem o mantém; cada uma tem teste (ou conferência) na tarefa dona.

1. **Frase do relatório que afirma o que não houve:** prestações todas com termo inicial próprio; só pagamentos atualizados numa metodologia de um período; nenhum índice divulgado no período; deflação própria sem índice negativo; salário mínimo de outro mês usado no lugar do que faltou. → Tasks 1 e 2 (`metodologia.test.ts`, `tabelas.test.ts`).
2. **Política de conteúdo que quebra o site publicado:** script embutido no `index.html`, fonte ou imagem em `data:`, download do "Salvar", impressão, tema lembrado. → Task 6 (`scripts/site.test.ts`: nenhum script embutido; cabeçalhos exatos) e Task 9 (site montado servido com os mesmos cabeçalhos, usado no navegador integrado, com escuta de violações).
3. **Alarme falso ou silêncio na conferência da publicação:** o mesmo instante escrito em fusos diferentes, a publicação de um commit de minutos atrás ainda em andamento, site fora do ar por instantes, `versao.json` ausente ou trocado por uma página HTML, site adiantado em relação à `main`. → Task 7 (`publicacao.test.ts`, com a rede simulada) e Task 13 (primeira rodada real).
4. **Credencial de escrita ao alcance de código de terceiros, ou action trocada por baixo:** token persistido pelo checkout; token (em qualquer grafia) em etapa que roda `npm ci` ou os testes; gancho do git deixado por um pacote adulterado na máquina que grava; action por etiqueta móvel ou de terceiros na etapa que grava. → Task 8 (rotina em etapas, `scripts/workflows.test.ts` e `actionlint`).
5. **Rotina travada ou muda depois da ligação:** primeira rodada antes de o site existir, resumo sem desfecho quando a gravação falha, aviso de série com problema que some, e-mail de falha que não chega. → Task 8 (desfecho e sinais com `always()`), Task 10 (workflows desligados até o site existir) e Tasks 12 e 13 (avisos ligados e primeira rodada conferida).

---

## Para o responsável: o que esta fase entrega, quem faz o quê e quando

Ao fim da fase 7, os testadores abrem `https://apura-dpems.pages.dev` em qualquer computador, sem cadastro; o rodapé e o relatório dizem "v0.1.0". O código fica no repositório privado `plsleite/apura`. A cada envio, o GitHub roda as conferências e os testes; a cada mudança na `main` (inclusive as do robô dos índices), o Cloudflare roda os testes de novo e publica, e com teste quebrado o site fica na versão anterior. A rotina de índices roda nos dias úteis, confere se o site está com os índices da `main`, e você recebe e-mail se algo parar (tabela da §19.5). A contagem de testes vai de 939 passando e 10 pulados (949, em 55 arquivos) para `Tests  1001 passed | 10 skipped (1011)`.

**Decisões suas, de 14/10/2026 (§19 do design):**

- **D1 · Repositório** na sua conta pessoal (`plsleite/apura`), privado (§19.1).
- **D2 · Publicação** pelo Cloudflare Pages com integração Git, código privado; GitHub Pages descartado (exigiria código público) (§19.2).
- **D3 · Acesso** aberto a quem tiver o endereço, sem aparecer em buscadores; pré-visualizações restritas a você (§19.2).
- **D4 · Endereço** `https://apura-dpems.pages.dev`; subdomínio da Defensoria só se a rede bloquear (§19.2).
- **D5 · Conferência automática da publicação** a cada rodada da rotina (§19.4).
- **D6 · Dependências** sem robô de atualização; alertas de segurança ligados; idade mínima de 14 dias (§19.6).
- **D7 · Os oito acertos adiados** (seis do relatório, dois da 5b) nesta fase, com as frases da §19.7 aprovadas.
- **D8 · Ensaio** antes do plano, com o `actionlint`; o que depende do GitHub e do Cloudflare de verdade fica para a execução (§19.9).
- **D9 · Rotina em etapas** (depois da primeira revisão): a etapa que instala pacotes e roda os testes não pode gravar; a que grava roda numa máquina limpa, sem pacote algum (§19.4).
- **D10 · Frases revistas** (depois das duas revisões): "Encargos" sem o trecho das datas quando nenhum lançamento começa na própria data; deflação própria na nota e no parágrafo "Deflação" só quando mudou a conta da linha (§19.7, itens 2 e 4).

**Decisões técnicas deste plano (reabra qualquer uma na revisão, se discordar):**

- **T1 · Salário mínimo estruturado no motor:** como os reajustes da fase 6, o motor passa a devolver em cada prestação que usou o salário mínimo de outro mês qual foi (`salarioMinimoAnterior`); o relatório escreve a frase da §19.7 a partir disso, e não da memória. Nenhum número muda (Task 2).
- **T2 · Script do tema num arquivo próprio** (`public/tema.js`): a política de conteúdo recusa script embutido no `index.html`; o comportamento é o mesmo (Task 6).
- **T3 · Sem cache de pacotes nos workflows:** as notas do `setup-node` 7 recomendam não usar o cache em workflows que gravam (risco de "envenenamento"); para ficar simples, nenhum dos três usa, e o `package-manager-cache: false` fica explícito; a instalação leva alguns segundos a mais (Task 8).
- **T4 · Token só no passo de gravação, com `trap`:** o checkout não guarda a credencial; o passo "Gravar na main", na etapa sem pacotes, põe o token no endereço do remoto e o tira ao sair, aconteça o que acontecer (Task 8).
- **T8 · Passagem entre etapas por artefato** (`actions/upload-artifact` 7.0.1 e `actions/download-artifact` 8.0.1, oficiais, fixadas por SHA, guardado por 1 dia); a etapa "gravar" só aceita `<código>.json` que seja JSON válido (Task 8).
- **T9 · Deploy hook na etapa "fechar"**, depois do sinal ao Healthchecks: a falha dele deixa a execução vermelha sem apagar o "gravado" (Task 8).
- **T10 · Reexecução segura:** a etapa "gravar" recusa gravar se outra gravação dos índices entrou na `main` depois do ponto de partida da rodada (Task 8).
- **T5 · Conferência da publicação:** até três tentativas com 10 s de espera; tolerância de 30 minutos para um commit recente; endereço fixo no workflow (`SITE_URL`); `http://` só para `localhost` (para conferir um site montado na máquina) (Task 7).
- **T6 · `versao.json` com `formato`** (`apura/versao-do-site@1`), como os demais arquivos do Apura, para a leitura recusar uma página qualquer (Tasks 6 e 7).
- **T7 · O "Salvar" revoga o endereço provisório depois de 60 s** (Task 4).

**Você faz (nos painéis, quando o plano pedir; nenhum segredo no chat):**

| Quando | O quê | Onde |
|---|---|---|
| Antes da Task 11 | criar a conta gratuita do Cloudflare (com o e-mail que você lê) | cloudflare.com |
| Antes da Task 12 | criar a conta gratuita do Healthchecks.io | healthchecks.io |
| Task 10 | dizer "sim" a cada ação para fora (merge, criar o repositório, enviar, desligar os workflows) | chat |
| Task 11 | ligar o Cloudflare Pages ao repositório, com as configurações do plano; restringir as pré-visualizações; ligar o aviso de montagem com falha | painel do Cloudflare |
| Task 12 | criar a verificação no Healthchecks; criar o segredo `HC_URL`; ligar os alertas de segurança; ampliar a guarda para 400 dias; conferir os e-mails de falha | painéis do Healthchecks e do GitHub |
| Task 13 | dizer "sim" para religar os workflows e para a primeira rodada manual | chat |
| Task 14 | abrir o Apura num computador da Defensoria, imprimir um relatório pelo botão e testar o "Salvar" no Safari | Defensoria e seu Mac |
| Task 15 | revisar e autorizar o merge do fechamento, o envio e a etiqueta `v0.1.0`; só então passar o endereço aos testadores | chat |

**Ensaio:** todo o código das Tasks 1 a 8 foi escrito e executado em 14/10/2026 numa cópia do repositório fora dele, tarefa a tarefa (teste que falha, código, `npm run verificar` verde, commit), e conferido: o `actionlint` aceita os três workflows (e acusa erros plantados de propósito, inclusive uma chave `timezone` com erro de digitação, o que confirma que a chave existe); o site montado foi servido na máquina com os mesmos cabeçalhos do `_headers` e usado no navegador integrado: abrir, lançar 33 prestações em lote, salvar, trocar o tema, abrir o relatório (logo, fontes, rodapé "Gerado com Apura v0.1.0") e recarregar com o tema lembrado, sem nenhuma violação da política; a mesma política recusou um script embutido injetado de propósito e uma chamada ao BCB feita pela página; e `SITE_URL=http://localhost:4173 npm run indices:conferir-publicacao` respondeu "O site publicado está em dia…". Depois, duas revisões adversárias independentes (agentes que não escreveram o código, com testes-sonda). A primeira achou quatro problemas importantes e oito menores, entre eles o token de escrita ao alcance de um pacote adulterado (demonstrado num repositório descartável), o que levou à rotina em etapas (D9), e duas frases que você reviu (D10). A segunda, só das mudanças, achou três importantes e seis menores: o deploy hook dentro da etapa de gravação (T9), brechas no teste dos workflows (fechadas, e cada sonda dela agora reprova o teste) e as duas frases do D10. Dois menores ficam como notas para a revisão de um mês da rotina (Pendências com data). Tudo o mais foi corrigido no ensaio, com teste. Por fim, a fase foi reconstruída tarefa por tarefa numa segunda cópia, a partir do commit do design (`298026e`), aplicando só os patches deste plano (primeiro os testes, para registrar o que falha; depois o código): cada passo "ver falhar" traz a falha medida nessa reconstrução, cada tarefa termina com a contagem medida, e o estado final é idêntico ao do ensaio.

---

## Estrutura de arquivos

| Arquivo | Papel nesta fase | Tarefa |
|---|---|---|
| `src/relatorio/metodologia.ts` | frases da §19.7: mora, Encargos de um período só, correção só com índice, deflação própria, salário mínimo usado no lugar do que faltou | 1, 2 |
| `src/compartilhado/tipos.ts`, `src/motor/base.ts`, `src/motor/calcular.ts` | `SalarioMinimoAnterior` e o campo `salarioMinimoAnterior` (sem mudar números) | 2 |
| `src/relatorio/bloqueio.ts` | pagamento posterior sem valor bloqueia | 3 |
| `src/ui/ambiente.ts`; sete arquivos de `src/ui/secoes/` e `src/ui/tabelas/`; `src/ui/preferencias.ts` | "Salvar" no Safari; `DATA_MINIMA`; comentário | 4 |
| `package.json`, `package-lock.json`, `CHANGELOG.md` (novo) | versão 0.1.0 e registro de mudanças | 5 |
| `.node-version`, `.npmrc`, `public/_headers`, `public/tema.js` (novos ou mudados), `index.html`, `eslint.config.js`, `vite.config.ts`, `src/indices/publicacao.ts` (novo) | Node fixado, travas da instalação, cabeçalhos, tema fora do `index.html`, `versao.json` | 6 |
| `src/indices/publicacao.ts`, `src/indices/relogio.ts`, `src/indices/cliente-bcb.ts`, `scripts/conferir-publicacao.ts` (novo), `package.json` | conferência da publicação | 7 |
| `.github/workflows/testes.yml` (novo), `atualizar-indices.yml`, `relatorio-indices.yml` | integração contínua; rotina em etapas; conferência da publicação | 8 |
| `scripts/versao.test.ts`, `scripts/site.test.ts`, `scripts/workflows.test.ts` (novos) | testes que leem arquivos do repositório | 5, 6, 8 |
| `docs/…`, `CLAUDE.md`, `README.md`, `CHANGELOG.md` | fechamento | 15 |

---

## Como executar este plano

- **Tasks 1 a 9** rodam na branch de trabalho da fase (a do plano, `claude/apura-fase-7-publicacao-7dc98b`, ou outra criada a partir dela). Antes de tudo: `npm install` (nenhuma dependência nova). **Tasks 10 a 15** dependem do GitHub, do Cloudflare e do responsável, nessa ordem (§19.8): não as adiante.
- **Os passos de código são patches.** Cada tarefa traz dois blocos `diff`: os testes e o código. Para aplicar um bloco: salve o conteúdo dele, exatamente como está, num arquivo **fora do repositório** (na pasta de rascunho da sessão, `$RASCUNHO`; o gancho de gravação pode recusar caminhos com acento, como a pasta "DEFENSORIA PÚBLICA": grave por heredoc no shell, por exemplo `cat > "$RASCUNHO/t1-testes.patch" <<'PATCH'` … `PATCH`) e rode `git apply --whitespace=nowarn "$RASCUNHO/t1-testes.patch"`. Os patches foram aplicados, um a um, numa cópia limpa a partir do commit do design (`197fdd3`): aplicam-se sem conflito sobre o estado da tarefa anterior. Se `git apply` recusar, pare e relate (não edite à mão para "encaixar").
- Ciclo de cada tarefa: aplicar o patch dos testes → `npx vitest run` e ver falhar exatamente o que o passo diz (se outra coisa falhar, ou se um teste listado passar sem o código, pare e relate) → aplicar o patch do código → `npm run format && npm run verificar` (o `format` não deve mudar nada) → conferir a contagem → commit com a mensagem do passo. Só se commita com tudo verde.
- Leia o patch antes de aplicá-lo: ele é o código da tarefa, e o revisor de cada tarefa o confere contra a §19 do design.
- Nenhum teste acessa a rede; a conferência da publicação é testada com a rede simulada (Task 7).
- Relatórios de subagentes vão em `.txt`, fora do repositório (na pasta de rascunho da sessão), nunca na raiz do projeto.

---

### Task 1: Relatório: mora, Encargos, correção sem índice e deflação própria só com o que houve

**Files:**
- Test: `src/relatorio/metodologia.test.ts`
- Modify: `src/relatorio/metodologia.ts`
- Test: `src/relatorio/tabelas.test.ts`

**Interfaces:**
- Consumes: `pares`, `Par` (`src/relatorio/texto.ts`), `paragrafoTermos`, `paragrafoEncargos`, `diferencasDosEncargos`, `paragrafoDeflacao` como estão.
- Produces: nada exportado de novo. Internas de `metodologia.ts`: `comecaNoVencimento(p: Par): boolean`, `negativoNaConta(par: Par): boolean`, `deflacaoPropriaMudouAConta(par, propria, global): boolean`; `deflacaoAtuou` passa a usar `negativoNaConta`.

§19.7, itens 1 a 4 (os itens 2 e 4 na redação revista em 14/10/2026, depois das duas revisões). Quatro frases do relatório afirmavam o que o motor não aplicou: a mora "desde o vencimento" com todas as prestações com termo inicial próprio; "do vencimento até a data do cálculo" sem prestação que comece no vencimento; "Correção pelo índice do mês do vencimento…" sem índice divulgado; e a deflação própria anotada (ou escondida) sem relação com o que mudou na conta, também no parágrafo "Deflação". O teste da fase 6 "deflação diferente da do cálculo" muda de propósito: com a regra revista, a própria "sem piso" contra a do cálculo "com piso", com o acumulado acima do original, não difere; o teste passa a usar "desconsiderados", que difere.

- [ ] **Step 1: Aplicar o patch dos testes** (salvar em `$RASCUNHO/t1-testes.patch` e `git apply --whitespace=nowarn`)

```diff
diff --git a/src/relatorio/metodologia.test.ts b/src/relatorio/metodologia.test.ts
index 890740c..f973eb1 100644
--- a/src/relatorio/metodologia.test.ts
+++ b/src/relatorio/metodologia.test.ts
@@ -593,3 +593,145 @@ describe("revisão final da fase 6", () => {
     );
   });
 });
+
+describe("acertos da fase 7 (§19.7)", () => {
+  it("1. todas as prestações com termo inicial próprio: sem a frase da mora, só a remissão às notas", () => {
+    const desde2025 = { termoInicialCorrecao: "2025-01-10", termoInicialJuros: "2025-01-10" };
+    const calculo = calculoDeTeste({
+      lancamentos: [
+        prestacao("2024-07-05", { encargos: desde2025 }),
+        prestacao("2024-10-05", { encargos: desde2025 }),
+      ],
+    });
+    expect(textos(calculo).termos).toBe(
+      "Os lançamentos marcados “encargos próprios” seguem os termos e as regras indicados nas notas das tabelas.",
+    );
+  });
+
+  it("1. a mora continua quando alguma prestação começa no vencimento, ou só tem termo final ou metodologia própria", () => {
+    const mora = "Encargos desde o vencimento de cada prestação (mora automática, art. 397 do CC).";
+    const umaComum = calculoDeTeste({
+      lancamentos: [
+        prestacao("2024-07-05", { encargos: { termoInicialJuros: "2025-01-10" } }),
+        prestacao("2024-10-05"),
+      ],
+    });
+    expect(textos(umaComum).termos?.startsWith(mora)).toBe(true);
+    const soTermoFinal = calculoDeTeste({
+      lancamentos: [prestacao("2024-07-05", { encargos: { termoFinalJuros: "2025-12-31" } })],
+    });
+    expect(textos(soTermoFinal).termos?.startsWith(mora)).toBe(true);
+    const soMetodologia = calculoDeTeste({
+      lancamentos: [
+        prestacao("2025-03-05", {
+          encargos: { metodologia: metodologiaDaOpcao("igpmJuros1") },
+        }),
+      ],
+    });
+    expect(textos(soMetodologia).termos?.startsWith(mora)).toBe(true);
+  });
+
+  it("2. metodologia de um período só, só pagamentos atualizados: “da data do pagamento até a data do cálculo”", () => {
+    const calculo = calculoDeTeste({
+      metodologia: metodologiaDaOpcao("igpmJuros1"),
+      lancamentos: [prestacao("2026-11-05"), pagamento("2025-03-10", "200.00")],
+    });
+    expect(textos(calculo).encargos).toBe(
+      "IGP-M e juros de 1% ao mês, simples, pro rata die, da data do pagamento até a data do cálculo, sobre o valor corrigido.",
+    );
+  });
+
+  it("3. nenhum mês com índice divulgado: sem a frase da correção; “Fontes” diz o mês", () => {
+    const calculo = calculoDeTeste({ lancamentos: [prestacao("2026-10-05")] });
+    const t = textos(calculo);
+    expect(t.termos).toBe(
+      "Encargos desde o vencimento de cada prestação (mora automática, art. 397 do CC). Juros até a data do cálculo.",
+    );
+    expect(t.fontes).toContain(
+      "Mês sem índice divulgado na data da consulta, computado sem correção: IPCA de out/2026.",
+    );
+  });
+});
+
+describe("revisão do ensaio da fase 7 (§19.7, itens 2 e 4, revistos em 14/10/2026)", () => {
+  const desde2025 = { termoInicialCorrecao: "2025-01-10", termoInicialJuros: "2025-01-10" };
+
+  it("Encargos de um período só, nenhuma prestação começando no vencimento: sem o trecho das datas", () => {
+    const soComTermos = calculoDeTeste({
+      metodologia: metodologiaDaOpcao("igpmJuros1"),
+      lancamentos: [
+        prestacao("2024-07-05", { encargos: desde2025 }),
+        prestacao("2024-10-05", { encargos: desde2025 }),
+      ],
+    });
+    expect(textos(soComTermos).encargos).toBe(
+      "IGP-M e juros de 1% ao mês, simples, pro rata die, sobre o valor corrigido.",
+    );
+    const comPagamento = calculoDeTeste({
+      metodologia: metodologiaDaOpcao("igpmJuros1"),
+      lancamentos: [
+        prestacao("2024-07-05", { encargos: desde2025 }),
+        pagamento("2025-03-10", "200.00"),
+      ],
+    });
+    expect(textos(comPagamento).encargos).toBe(
+      "IGP-M e juros de 1% ao mês, simples, pro rata die, sobre o valor corrigido.",
+    );
+  });
+
+  it("Encargos de um período só: uma prestação começando no vencimento basta para “do vencimento”", () => {
+    const calculo = calculoDeTeste({
+      metodologia: metodologiaDaOpcao("igpmJuros1"),
+      lancamentos: [prestacao("2024-07-05", { encargos: desde2025 }), prestacao("2024-10-05")],
+    });
+    expect(textos(calculo).encargos).toBe(
+      "IGP-M e juros de 1% ao mês, simples, pro rata die, do vencimento até a data do cálculo, sobre o valor corrigido.",
+    );
+  });
+});
+
+describe("segunda revisão do ensaio da fase 7 (§19.7, itens 2 e 4)", () => {
+  const igpm = metodologiaDaOpcao("igpmJuros1");
+
+  it("Deflação: linha cuja deflação própria não mudou a conta conta pela regra do cálculo", () => {
+    // cálculo "com piso"; a de 05/01/2024 é "sem piso" com o acumulado acima do original (nada
+    // difere); a de 05/06/2026 segue a regra do cálculo, e o piso atuou
+    const semPisoInocua = calculoDeTeste({
+      metodologia: igpm,
+      lancamentos: [
+        prestacao("2024-01-05", {
+          encargos: { metodologia: { ...igpm, deflacao: "aplicarSemPiso" } },
+        }),
+        prestacao("2026-06-05"),
+      ],
+    });
+    expect(textos(semPisoInocua).deflacao).toBe(
+      "Índices negativos computados; o valor corrigido não fica inferior ao original.",
+    );
+    // cálculo "sem piso"; a única linha é "com piso", e o piso não atuou: vale a regra do cálculo
+    const comPisoInocua = calculoDeTeste({
+      metodologia: { ...igpm, deflacao: "aplicarSemPiso" },
+      lancamentos: [
+        prestacao("2024-01-05", {
+          encargos: { metodologia: { ...igpm, deflacao: "aplicarComPiso" } },
+        }),
+      ],
+    });
+    expect(textos(comPisoInocua).deflacao).toBe("Índices negativos computados, sem piso.");
+  });
+
+  it("Encargos de um período só: pagamento com termo inicial próprio não começa na data do pagamento", () => {
+    const calculo = calculoDeTeste({
+      metodologia: igpm,
+      lancamentos: [
+        prestacao("2026-11-05"),
+        pagamento("2025-03-10", "200.00", {
+          encargos: { termoInicialCorrecao: "2025-06-01", termoInicialJuros: "2025-06-01" },
+        }),
+      ],
+    });
+    expect(textos(calculo).encargos).toBe(
+      "IGP-M e juros de 1% ao mês, simples, pro rata die, sobre o valor corrigido.",
+    );
+  });
+});
diff --git a/src/relatorio/tabelas.test.ts b/src/relatorio/tabelas.test.ts
index 48b15e7..8235afa 100644
--- a/src/relatorio/tabelas.test.ts
+++ b/src/relatorio/tabelas.test.ts
@@ -388,18 +388,18 @@ describe("encargos próprios: só o que difere da metodologia do cálculo (revis
     ).toEqual(["05/03/2025: correção a partir do mês seguinte ao do vencimento."]);
   });
 
-  it("deflação diferente da do cálculo", () => {
+  it("deflação diferente da do cálculo, com índice negativo na conta (§19.7, item 4)", () => {
     expect(
       nota({
         lancamentos: [
           prestacao("2025-03-05", {
             encargos: {
-              metodologia: { ...metodologiaDaOpcao("lei14905"), deflacao: "aplicarSemPiso" },
+              metodologia: { ...metodologiaDaOpcao("lei14905"), deflacao: "zerarNegativos" },
             },
           }),
         ],
       }).itens,
-    ).toEqual(["05/03/2025: índices negativos computados, sem piso."]);
+    ).toEqual(["05/03/2025: índices negativos desconsiderados (tomados como zero)."]);
   });
 
   it("só os períodos da metodologia própria que o lançamento alcançou", () => {
@@ -485,3 +485,92 @@ describe("encargos próprios: só diferença no trecho alcançado (revisão fina
     expect(t.prestacoes.notas).toEqual([]);
   });
 });
+
+describe("deflação própria só com índice negativo na conta (§19.7, item 4)", () => {
+  const linha = (data: string, deflacao: "aplicarSemPiso" | "zerarNegativos") => {
+    const calculo = calculoDeTeste({
+      lancamentos: [
+        prestacao(data, {
+          encargos: { metodologia: { ...metodologiaDaOpcao("lei14905"), deflacao } },
+        }),
+      ],
+    });
+    const t = tabelasDoRelatorio(calculo, resultadoDe(calculo));
+    return {
+      palavras: t.prestacoes.linhas[0]?.palavras,
+      itens: t.prestacoes.notas.find((n) => n.termo === "Encargos próprios")?.itens,
+    };
+  };
+
+  it("sem índice negativo na conta (set/2026 e out/2026): sem palavra e sem nota", () => {
+    expect(linha("2026-09-05", "aplicarSemPiso")).toEqual({ palavras: [], itens: undefined });
+    expect(linha("2026-09-05", "zerarNegativos")).toEqual({ palavras: [], itens: undefined });
+  });
+
+  it("com índice negativo na conta (ago/2026, −0,32%): a deflação própria entra na nota", () => {
+    expect(linha("2026-08-05", "zerarNegativos")).toEqual({
+      palavras: ["encargos próprios"],
+      itens: ["05/08/2026: índices negativos desconsiderados (tomados como zero)."],
+    });
+  });
+
+  it("própria com piso, cálculo sem piso: só entra se o piso atuou", () => {
+    const comPiso = (data: string) => {
+      const calculo = calculoDeTeste({
+        metodologia: { ...metodologiaDaOpcao("lei14905"), deflacao: "aplicarSemPiso" },
+        lancamentos: [
+          prestacao(data, {
+            encargos: {
+              metodologia: { ...metodologiaDaOpcao("lei14905"), deflacao: "aplicarComPiso" },
+            },
+          }),
+        ],
+      });
+      return tabelasDoRelatorio(calculo, resultadoDe(calculo)).prestacoes.notas.find(
+        (n) => n.termo === "Encargos próprios",
+      )?.itens;
+    };
+    // ago/2026 (−0,32%) e set/2026 (+0,82%): o acumulado fica positivo, o piso não atua
+    expect(comPiso("2026-08-05")).toBe(undefined);
+  });
+});
+
+describe("deflação própria × deflação do cálculo (§19.7, item 4, revisto em 14/10/2026)", () => {
+  const linhaDe = (
+    data: string,
+    doCalculo: "aplicarComPiso" | "aplicarSemPiso" | "zerarNegativos",
+    propria: "aplicarComPiso" | "aplicarSemPiso" | "zerarNegativos",
+  ) => {
+    const calculo = calculoDeTeste({
+      metodologia: { ...metodologiaDaOpcao("igpmJuros1"), deflacao: doCalculo },
+      lancamentos: [
+        prestacao(data, {
+          encargos: {
+            metodologia: { ...metodologiaDaOpcao("igpmJuros1"), deflacao: propria },
+          },
+        }),
+      ],
+    });
+    const t = tabelasDoRelatorio(calculo, resultadoDe(calculo));
+    return {
+      palavras: t.prestacoes.linhas[0]?.palavras,
+      itens: t.prestacoes.notas.find((n) => n.termo === "Encargos próprios")?.itens,
+    };
+  };
+
+  it("cálculo “desconsiderados”, linha “com piso”: negativos na conta mudam o valor, mesmo sem o piso atuar", () => {
+    expect(linhaDe("2024-01-05", "zerarNegativos", "aplicarComPiso")).toEqual({
+      palavras: ["encargos próprios"],
+      itens: [
+        "05/01/2024: índices negativos computados, sem que o valor corrigido fique inferior ao original.",
+      ],
+    });
+  });
+
+  it("cálculo “com piso”, linha “sem piso”, acumulado acima do original: o piso não teria atuado, nada difere", () => {
+    expect(linhaDe("2024-01-05", "aplicarComPiso", "aplicarSemPiso")).toEqual({
+      palavras: [],
+      itens: undefined,
+    });
+  });
+});
```

- [ ] **Step 2: Ver falhar.** `npx vitest run`. Esperado (medido na reconstrução): 9 testes falham, e só eles:

  - `sem índice negativo na conta (set/2026 e out/2026): sem palavra e sem nota`
  - `própria com piso, cálculo sem piso: só entra se o piso atuou`
  - `cálculo “com piso”, linha “sem piso”, acumulado acima do original: o piso não teria atuado, nada difere`
  - `1. todas as prestações com termo inicial próprio: sem a frase da mora, só a remissão às notas`
  - `2. metodologia de um período só, só pagamentos atualizados: “da data do pagamento até a data do cálculo”`
  - `3. nenhum mês com índice divulgado: sem a frase da correção; “Fontes” diz o mês`
  - `Encargos de um período só, nenhuma prestação começando no vencimento: sem o trecho das datas`
  - `Deflação: linha cuja deflação própria não mudou a conta conta pela regra do cálculo`
  - `Encargos de um período só: pagamento com termo inicial próprio não começa na data do pagamento`

  com mensagens como:

  - `AssertionError: expected 'Encargos desde o vencimento de cada p…' to be 'Os lançamentos marcados “encargos pró…' // Object.is equality`
  - `AssertionError: expected 'IGP-M e juros de 1% ao mês, simples, …' to be 'IGP-M e juros de 1% ao mês, simples, …' // Object.is equality`
  - `AssertionError: expected 'Encargos desde o vencimento de cada p…' to be 'Encargos desde o vencimento de cada p…' // Object.is equality`
  - `AssertionError: expected 'Índices negativos computados, sem pis…' to be 'Índices negativos computados; o valor…' // Object.is equality`
  - `AssertionError: expected { …(2) } to deeply equal { palavras: [], itens: undefined }`
  - `AssertionError: expected [ Array(1) ] to be undefined // Object.is equality`

  Resumo: `Test Files  2 failed | 53 passed (55) · Tests  9 failed | 943 passed | 10 skipped (962)`.

- [ ] **Step 3: Aplicar o patch do código** (`$RASCUNHO/t1-codigo.patch`)

```diff
diff --git a/src/relatorio/metodologia.ts b/src/relatorio/metodologia.ts
index 536d57c..d32ee68 100644
--- a/src/relatorio/metodologia.ts
+++ b/src/relatorio/metodologia.ts
@@ -232,6 +232,17 @@ export function paragrafoBase(calculo: Calculo, resultado: Resultado): string |
 const atualizados = (calculo: Calculo, resultado: Resultado): Par[] =>
   pares(calculo, resultado).filter((p) => p.calculado.situacao === "atualizado");
 
+/** Prestação que começa os encargos no vencimento: sem termo inicial próprio (§19.7, item 1). */
+function comecaNoVencimento(p: Par): boolean {
+  return p.lancamento.tipo === "prestacao" && semTermoInicialProprio(p);
+}
+
+/** Lançamento que começa os encargos na própria data: sem termo inicial próprio (§19.7). */
+function semTermoInicialProprio(p: Par): boolean {
+  const e = p.lancamento.encargos;
+  return e?.termoInicialCorrecao === undefined && e?.termoInicialJuros === undefined;
+}
+
 function sobrepoe(p: PeriodoMetodologia, inicio: DataISO, fim: DataISO): boolean {
   return (p.de === null || p.de <= fim) && (p.ate === null || inicio <= p.ate);
 }
@@ -289,6 +300,41 @@ export function mesmasRegrasNoAlcance(
   return datas.every((data) => regraEm(propria, data) === regraEm(global, data));
 }
 
+/** Um índice negativo entrou na correção do lançamento, com fração e com valor. */
+function negativoNaConta(par: Par): boolean {
+  return par.calculado.correcao.indices.some(
+    (i) => i.valor !== null && !i.fracao.startsWith("0/") && decimal(i.valor).isNegative(),
+  );
+}
+
+/**
+ * A deflação da metodologia mudou a conta do lançamento: um índice negativo entrou; com piso, só
+ * quando o piso atuou (§18.5, parágrafo "Deflação").
+ */
+function deflacaoAtuou(par: Par, modo: Metodologia["deflacao"]): boolean {
+  return negativoNaConta(par) && (modo !== "aplicarComPiso" || par.calculado.correcao.pisoAplicado);
+}
+
+/**
+ * A deflação própria deu à linha um valor diferente do que a deflação do cálculo daria (§19.7,
+ * item 4, revisto em 14/10/2026): basta um índice negativo na conta, salvo entre "com piso" e "sem
+ * piso", que só diferem quando o piso atua (o da própria, ou o do cálculo, que atuaria com o
+ * acumulado abaixo de 1).
+ */
+function deflacaoPropriaMudouAConta(
+  par: Par,
+  propria: Metodologia["deflacao"],
+  global: Metodologia["deflacao"],
+): boolean {
+  if (propria === global || !negativoNaConta(par)) return false;
+  const { correcao } = par.calculado;
+  if (propria === "aplicarComPiso" && global === "aplicarSemPiso") return correcao.pisoAplicado;
+  if (propria === "aplicarSemPiso" && global === "aplicarComPiso") {
+    return decimal(correcao.fator).lt(1);
+  }
+  return true;
+}
+
 const DEFLACAO_CURTA: Record<Metodologia["deflacao"], string> = {
   aplicarComPiso:
     "índices negativos computados, sem que o valor corrigido fique inferior ao original",
@@ -310,7 +356,8 @@ function termo(nome: string, inicio?: string, fim?: string): string | null {
  * O que os encargos de um lançamento têm de diferente dos do cálculo (§18.3, nota "Encargos
  * próprios"): os termos próprios; e, com metodologia própria, as regras dos períodos que o
  * lançamento alcançou (quando não são as do cálculo), a incidência no mês inicial e a deflação
- * (quando diferem). Lista vazia: nada difere, e a linha não leva a palavra "encargos próprios".
+ * (quando muda a conta do lançamento). Lista vazia: nada difere, e a linha não leva a palavra
+ * "encargos próprios".
  */
 export function diferencasDosEncargos(par: Par, calculo: Calculo): string[] {
   const e = par.lancamento.encargos ?? {};
@@ -332,7 +379,9 @@ export function diferencasDosEncargos(par: Par, calculo: Calculo): string[] {
         : `correção pelo índice do mês do ${data}, proporcional aos dias restantes (pro rata)`,
     );
   }
-  if (propria.deflacao !== global.deflacao) partes.push(DEFLACAO_CURTA[propria.deflacao]);
+  if (deflacaoPropriaMudouAConta(par, propria.deflacao, global.deflacao)) {
+    partes.push(DEFLACAO_CURTA[propria.deflacao]);
+  }
   return partes;
 }
 
@@ -340,15 +389,16 @@ export function diferencasDosEncargos(par: Par, calculo: Calculo): string[] {
  * Termos (§18.5): a regra comum, descrita a partir dos lançamentos atualizados sem encargos
  * próprios e só com o que eles tiveram (correção, se algum mês entrou com índice; juros, se o
  * percentual passou de zero; o último mês inteiro com índice; o pro rata no mês do cálculo; o
- * valor parcial da SELIC no mês do cálculo); a mora fala das prestações, e, só com pagamentos, a
- * correção fala da data do pagamento. Com lançamentos de encargos próprios, a remissão às notas.
+ * valor parcial da SELIC no mês do cálculo); a mora, só quando alguma prestação começa os encargos
+ * no vencimento, e, só com pagamentos, a correção fala da data do pagamento. Com lançamentos de
+ * encargos próprios, a remissão às notas.
  */
 export function paragrafoTermos(calculo: Calculo, resultado: Resultado): string | null {
   const lista = atualizados(calculo, resultado);
   if (lista.length === 0) return null;
   const comuns = lista.filter((p) => diferencasDosEncargos(p, calculo).length === 0);
   const frases: string[] = [];
-  if (lista.some((p) => p.lancamento.tipo === "prestacao")) frases.push(MORA);
+  if (lista.some(comecaNoVencimento)) frases.push(MORA);
 
   const mesDoCalculo = competenciaDe(calculo.dataElaboracao);
   let comCorrecao = false;
@@ -357,9 +407,9 @@ export function paragrafoTermos(calculo: Calculo, resultado: Resultado): string
   let proRataFinal: { competencia: Competencia; dias: number } | null = null;
   for (const { lancamento, calculado } of comuns) {
     for (const i of calculado.correcao.indices) {
-      if (i.serie === null || i.fracao.startsWith("0/")) continue;
+      // só o mês que entrou com fração e com índice divulgado conta como correção (§19.7, item 3)
+      if (i.serie === null || i.fracao.startsWith("0/") || i.valor === null) continue;
       comCorrecao = true;
-      if (i.valor === null) continue;
       if (i.fracao === "1") {
         if (ultimoInteiro === null || i.competencia > ultimoInteiro) ultimoInteiro = i.competencia;
         if (i.competencia === mesDoCalculo && i.serie === CODIGO_DA_SERIE.SELIC)
@@ -456,8 +506,19 @@ export function paragrafoEncargos(calculo: Calculo, resultado: Resultado): strin
   const ultimoComJuros = regras.map((r) => r.jurosSeparados).lastIndexOf(true);
   const corrigido = (i: number) => (i === ultimoComJuros ? ", sobre o valor corrigido" : "");
   if (alcancados.length === 1) {
+    // o termo inicial comum (§19.7, item 2, revisto em 14/10/2026): o vencimento, se alguma
+    // prestação começa nele; a data do pagamento, se só há pagamentos; senão, nenhum (as notas
+    // das tabelas dizem os termos próprios de cada linha)
+    const soPagamentos = !daGlobal.some((p) => p.lancamento.tipo === "prestacao");
+    const desde = daGlobal.some(comecaNoVencimento)
+      ? "do vencimento"
+      : soPagamentos && daGlobal.some(semTermoInicialProprio)
+        ? "da data do pagamento"
+        : null;
     const unico =
-      periodosOrdenados(global).length === 1 ? ", do vencimento até a data do cálculo" : "";
+      periodosOrdenados(global).length === 1 && desde !== null
+        ? `, ${desde} até a data do cálculo`
+        : "";
     return `${maiuscula(regras[0]?.texto ?? "")}${unico}${corrigido(0)}.`;
   }
   const trechos = alcancados.map(
@@ -516,18 +577,19 @@ function paragrafoMultaEHonorarios(calculo: Calculo): string | null {
 
 /**
  * Deflação (§18.5): só quando um índice negativo entrou na conta de algum lançamento; com piso,
- * só quando o piso atuou. Cada lançamento segue a deflação da sua metodologia (a própria ou a do
- * cálculo).
+ * só quando o piso atuou. Cada lançamento segue a deflação da sua metodologia: a própria, quando
+ * ela mudou a conta da linha (§19.7, item 4); senão, a do cálculo.
  */
 export function paragrafoDeflacao(calculo: Calculo, resultado: Resultado): string | null {
   const frases = new Set<string>();
-  for (const { lancamento, calculado } of atualizados(calculo, resultado)) {
-    const modo = (lancamento.encargos?.metodologia ?? calculo.metodologia).deflacao;
-    const negativo = calculado.correcao.indices.some(
-      (i) => i.valor !== null && !i.fracao.startsWith("0/") && decimal(i.valor).isNegative(),
-    );
-    if (!negativo) continue;
-    if (modo === "aplicarComPiso" && calculado.correcao.pisoAplicado) {
+  const global = calculo.metodologia.deflacao;
+  for (const par of atualizados(calculo, resultado)) {
+    // a deflação própria só conta quando mudou a conta da linha; senão, vale a do cálculo (§19.7)
+    const propria = par.lancamento.encargos?.metodologia?.deflacao;
+    const modo =
+      propria !== undefined && deflacaoPropriaMudouAConta(par, propria, global) ? propria : global;
+    if (!deflacaoAtuou(par, modo)) continue;
+    if (modo === "aplicarComPiso") {
       frases.add("Índices negativos computados; o valor corrigido não fica inferior ao original.");
     } else if (modo === "aplicarSemPiso") {
       frases.add("Índices negativos computados, sem piso.");
```

- [ ] **Step 4: Verificar.** `npm run format && npm run verificar`: verde, sem mudança do `format`; `Tests  952 passed | 10 skipped (962)`, `Test Files  55 passed (55)`.

- [ ] **Step 5: Commit:** `relatorio: mora, pagamentos, correção sem índice e deflação própria só com o que houve (§19.7, itens 1 a 4)`.

### Task 2: Motor e relatório: salário mínimo usado no lugar do que faltou

**Files:**
- Modify: `src/compartilhado/tipos.ts`
- Test: `src/motor/base.test.ts`
- Modify: `src/motor/base.ts`
- Test: `src/motor/calcular.test.ts`
- Modify: `src/motor/calcular.ts`
- Test: `src/relatorio/metodologia.test.ts`
- Modify: `src/relatorio/metodologia.ts`

**Interfaces:**
- Consumes: `salarioMinimoVigente`, `descreverSalarioAnterior` (`base.ts`) e o rastro da base em `calcular.ts` como estão; `listar` (`texto.ts`).
- Produces: `interface SalarioMinimoAnterior { competencia: Competencia; usado: Competencia; valor: TextoDecimal }` (`tipos.ts`); `LancamentoCalculado.salarioMinimoAnterior?: SalarioMinimoAnterior` e `ValorBaseApurado.salarioMinimoAnterior?` (presentes só quando a prestação apurada pela base usou o salário mínimo de um mês anterior); em `metodologia.ts`, a interna `frasesDoSalarioAnterior(apuradas: Par[]): string[]`.

§19.7, item 6. Como os reajustes da fase 6 (T1 da fase 6), o motor passa a devolver de forma estruturada qual salário mínimo entrou no lugar do que faltou no mês do vencimento (ainda não publicado ou ausente da tabela); o relatório escreve a frase a partir disso, e não da memória da linha. Nenhum número muda, e os casos de referência continuam idênticos. Duas prestações no mesmo vencimento (a mensal e um 13º) põem a data uma vez só.

- [ ] **Step 1: Aplicar o patch dos testes** (`$RASCUNHO/t2-testes.patch`)

```diff
diff --git a/src/motor/base.test.ts b/src/motor/base.test.ts
index dc05973..6b856f1 100644
--- a/src/motor/base.test.ts
+++ b/src/motor/base.test.ts
@@ -75,6 +75,15 @@ describe("base em percentual do salário mínimo (§6.3)", () => {
     expect(r.mesesSemIndice).toEqual([{ serie: "1619", competencia: "2027-01" }]);
   });
 
+  it("o salário mínimo anterior usado no lugar do que faltou sai estruturado, para o relatório (§19.7, item 6)", () => {
+    expect(
+      apurarValorBase(prestacao("2027-01-05"), base, tabelaRegimeNovo(), 2).salarioMinimoAnterior,
+    ).toEqual({ competencia: "2027-01", usado: "2026-12", valor: "1621.00" });
+    expect(
+      apurarValorBase(prestacao("2026-12-05"), base, tabelaRegimeNovo(), 2),
+    ).not.toHaveProperty("salarioMinimoAnterior");
+  });
+
   it("sem nenhum salário mínimo anterior na tabela: fica sem valor, com aviso", () => {
     const r = apurarValorBase(prestacao("2023-06-10"), base, tabelaRegimeNovo(), 2);
     expect(r.valor).toBeNull();
@@ -675,6 +684,11 @@ describe("base com calendário de divulgação (fase 4: esperadoAte)", () => {
       );
       expect(r.mesesSemIndice).toEqual([{ serie: "1619", competencia: "2018-03" }]);
       expect(r.indicesUsados.map((i) => i.competencia)).toEqual(["2017-01", "2018-02"]);
+      expect(r.salarioMinimoAnterior).toEqual({
+        competencia: "2018-03",
+        usado: "2018-02",
+        valor: "954.00",
+      });
     });
 
     it("mês presente na tabela: sem aviso, com ou sem calendário", () => {
diff --git a/src/motor/calcular.test.ts b/src/motor/calcular.test.ts
index ca43955..a260b3b 100644
--- a/src/motor/calcular.test.ts
+++ b/src/motor/calcular.test.ts
@@ -625,6 +625,24 @@ describe("calcular (fase 3: situação dos lançamentos, base dos alimentos e pr
     expect(semIndice.lancamentos[0]).not.toHaveProperty("reajustes");
   });
 
+  it("a prestação que usou o salário mínimo de um mês anterior traz qual foi (§19.7, item 6); as demais não", () => {
+    const r = calcular(
+      comBase({ tipo: "percentualSalarioMinimo", percentual: "30" }, [
+        semValorInformado("p-2026-12", "2026-12-05"),
+        semValorInformado("p-2027-01", "2027-01-05"),
+        semValorInformado("p-2027-02", "2027-02-05", { valorInformado: "600.00" }),
+      ]),
+      tabelaRegimeNovo(),
+    );
+    expect(r.lancamentos[0]).not.toHaveProperty("salarioMinimoAnterior");
+    expect(r.lancamentos[1]?.salarioMinimoAnterior).toEqual({
+      competencia: "2027-01",
+      usado: "2026-12",
+      valor: "1621.00",
+    });
+    expect(r.lancamentos[2]).not.toHaveProperty("salarioMinimoAnterior");
+  });
+
   it("pagamento posterior à data de elaboração fica fora dos totais, com aviso no lançamento e no resumo", () => {
     const futuro: Lancamento = { ...amortizacao, id: "a-2018-06", data: "2018-06-10" };
     const r = calcular(calculoCom([prestacao, futuro]), tabelaIgpm());
diff --git a/src/relatorio/metodologia.test.ts b/src/relatorio/metodologia.test.ts
index f973eb1..74bc159 100644
--- a/src/relatorio/metodologia.test.ts
+++ b/src/relatorio/metodologia.test.ts
@@ -651,6 +651,57 @@ describe("acertos da fase 7 (§19.7)", () => {
       "Mês sem índice divulgado na data da consulta, computado sem correção: IPCA de out/2026.",
     );
   });
+
+  it("6. salário mínimo que faltou no mês do vencimento: uma frase por mês usado no lugar", () => {
+    const porSm = baseUnica({ tipo: "percentualSalarioMinimo", percentual: "30" });
+    const varias = calculoDeTeste({
+      base: porSm,
+      lancamentos: [
+        prestacao("2026-09-05"),
+        prestacao("2027-01-05"),
+        prestacao("2027-02-05"),
+        prestacao("2027-03-05", { valorInformado: "500.00", editado: true }),
+      ],
+    });
+    expect(textos(varias).base).toBe(
+      "30% do salário mínimo vigente no mês de cada vencimento. Nas prestações de 05/01/2027 e 05/02/2027, sem o salário mínimo do mês na data da consulta, foi usado o último disponível, de dez/2026 (R$ 1.621,00). Nas prestações marcadas “valor informado”, vale o valor indicado na tabela, em vez do apurado pela base.",
+    );
+    const uma = calculoDeTeste({ base: porSm, lancamentos: [prestacao("2027-01-05")] });
+    expect(textos(uma).base).toBe(
+      "30% do salário mínimo vigente no mês de cada vencimento. Na prestação de 05/01/2027, sem o salário mínimo do mês na data da consulta, foi usado o último disponível, de dez/2026 (R$ 1.621,00).",
+    );
+  });
+
+  it("6. duas prestações no mesmo vencimento (a mensal e um 13º): a data sai uma vez só", () => {
+    const calculo = calculoDeTeste({
+      base: baseUnica({ tipo: "percentualSalarioMinimo", percentual: "30" }),
+      lancamentos: [
+        prestacao("2027-01-05"),
+        prestacao("2027-01-05", { id: "p-13", descricao: "13º salário", origem: "avulso" }),
+      ],
+    });
+    expect(textos(calculo).base).toBe(
+      "30% do salário mínimo vigente no mês de cada vencimento. Nas prestações de 05/01/2027, sem o salário mínimo do mês na data da consulta, foi usado o último disponível, de dez/2026 (R$ 1.621,00).",
+    );
+  });
+
+  it("6. valor fixo pelo salário mínimo, com um mês que falta na tabela", () => {
+    const tabela = tabelaRegimeNovo();
+    delete tabela.series["1619"]?.["2026-06"];
+    const calculo = calculoDeTeste({
+      base: baseUnica({
+        tipo: "valorFixo",
+        valor: "500.00",
+        dataFixacao: "2024-07-01",
+        indiceReajuste: "SM",
+        mesReajuste: 7,
+      }),
+      lancamentos: [prestacao("2026-05-05"), prestacao("2026-06-05")],
+    });
+    expect(textos(calculo, tabela).base).toBe(
+      "Valor fixo de R$ 500,00, fixado em 01/07/2024, reajustado na proporção do salário mínimo vigente no mês de cada vencimento (salário mínimo de jul/2024: R$ 1.412,00). Na prestação de 05/06/2026, sem o salário mínimo do mês na data da consulta, foi usado o último disponível, de mai/2026 (R$ 1.621,00).",
+    );
+  });
 });
 
 describe("revisão do ensaio da fase 7 (§19.7, itens 2 e 4, revistos em 14/10/2026)", () => {
```

- [ ] **Step 2: Ver falhar.** `npx vitest run`. Esperado (medido na reconstrução): 6 testes falham, e só eles:

  - `6. salário mínimo que faltou no mês do vencimento: uma frase por mês usado no lugar`
  - `6. duas prestações no mesmo vencimento (a mensal e um 13º): a data sai uma vez só`
  - `6. valor fixo pelo salário mínimo, com um mês que falta na tabela`
  - `a prestação que usou o salário mínimo de um mês anterior traz qual foi (§19.7, item 6); as demais não`
  - `o salário mínimo anterior usado no lugar do que faltou sai estruturado, para o relatório (§19.7, item 6)`
  - `mês já esperado mas ausente: 'não consta' e memória com 'último anterior disponível'`

  com mensagens como:

  - `AssertionError: expected '30% do salário mínimo vigente no mês …' to be '30% do salário mínimo vigente no mês …' // Object.is equality`
  - `AssertionError: expected 'Valor fixo de R$ 500,00, fixado em 01…' to be 'Valor fixo de R$ 500,00, fixado em 01…' // Object.is equality`
  - `AssertionError: expected undefined to deeply equal { competencia: '2027-01', …(2) }`
  - `AssertionError: expected undefined to deeply equal { competencia: '2018-03', …(2) }`

  Resumo: `Test Files  3 failed | 52 passed (55) · Tests  6 failed | 951 passed | 10 skipped (967)`.

- [ ] **Step 3: Aplicar o patch do código** (`$RASCUNHO/t2-codigo.patch`)

```diff
diff --git a/src/compartilhado/tipos.ts b/src/compartilhado/tipos.ts
index 4dae411..6c10505 100644
--- a/src/compartilhado/tipos.ts
+++ b/src/compartilhado/tipos.ts
@@ -259,6 +259,19 @@ export interface ReajusteDaBase {
   aindaNaoDivulgados?: boolean;
 }
 
+/**
+ * O salário mínimo de um mês anterior usado no lugar do que faltou no mês do vencimento (ainda não
+ * publicado ou fora da tabela), para o relatório dizer qual entrou (§19.7, item 6).
+ */
+export interface SalarioMinimoAnterior {
+  /** mês do vencimento, sem salário mínimo na tabela */
+  competencia: Competencia;
+  /** mês do salário mínimo usado no lugar */
+  usado: Competencia;
+  /** valor do salário mínimo usado, em reais */
+  valor: TextoDecimal;
+}
+
 export interface LancamentoCalculado {
   id: string;
   tipo: Lancamento["tipo"];
@@ -275,6 +288,11 @@ export interface LancamentoCalculado {
    * prestações apuradas por essa forma da base (§18.4)
    */
   reajustes?: ReajusteDaBase[];
+  /**
+   * salário mínimo de um mês anterior usado no lugar do que faltou no mês do vencimento, só nas
+   * prestações apuradas pela base que precisaram dele (§19.7, item 6)
+   */
+  salarioMinimoAnterior?: SalarioMinimoAnterior;
   correcao: { fator: TextoDecimal; indices: IndiceAplicado[]; pisoAplicado: boolean };
   corrigido: TextoDecimal;
   juros: { percentual: TextoDecimal; detalhe: DetalheJuros[] };
diff --git a/src/motor/base.ts b/src/motor/base.ts
index fbf12c8..fa64ebe 100644
--- a/src/motor/base.ts
+++ b/src/motor/base.ts
@@ -33,6 +33,7 @@ import type {
   NomeIndice,
   PeriodoDaBase,
   ReajusteDaBase,
+  SalarioMinimoAnterior,
   TabelaIndices,
 } from "../compartilhado/tipos.ts";
 import { aindaNaoDivulgado, divulgacaoPrevista } from "../compartilhado/divulgacao.ts";
@@ -55,6 +56,8 @@ export interface ValorBaseApurado {
   avisos: string[];
   /** reajustes do valor fixo por índice (só nessa forma; vazio antes do primeiro), para o relatório */
   reajustes?: ReajusteDaBase[];
+  /** salário mínimo de um mês anterior usado no lugar do que faltou, para o relatório (§19.7) */
+  salarioMinimoAnterior?: SalarioMinimoAnterior;
 }
 
 const SALARIO_MINIMO = CODIGO_DA_SERIE.SM;
@@ -92,6 +95,11 @@ function registro(
   return { serie, competencia, valor: valor.valor, fonte: valor.fonte, obtidoEm: valor.obtidoEm };
 }
 
+/** O salário mínimo de um mês anterior usado no lugar do que faltou, para o relatório (§19.7). */
+function anteriorUsado(competencia: Competencia, usado: IndiceUsado): SalarioMinimoAnterior {
+  return { competencia, usado: usado.competencia, valor: usado.valor };
+}
+
 /**
  * Salário mínimo vigente na competência: o do próprio mês ou, quando a tabela ainda não o traz, o
  * último anterior, que vigora até a publicação do novo. Nulo se não houver nenhum anterior.
@@ -186,6 +194,7 @@ function porSalarioMinimo(
     indicesUsados: [salario.usado],
     mesesSemIndice: [{ serie: SALARIO_MINIMO, competencia }],
     avisos: [anterior.aviso],
+    salarioMinimoAnterior: anteriorUsado(competencia, salario.usado),
   };
 }
 
@@ -271,6 +280,7 @@ function porSalarioMinimoProporcional(
     indicesUsados,
     mesesSemIndice: [{ serie: SALARIO_MINIMO, competencia }],
     avisos: [anterior.aviso],
+    salarioMinimoAnterior: anteriorUsado(competencia, noVencimento.usado),
   };
 }
 
diff --git a/src/motor/calcular.ts b/src/motor/calcular.ts
index d4b208c..70a6344 100644
--- a/src/motor/calcular.ts
+++ b/src/motor/calcular.ts
@@ -20,6 +20,7 @@ import type {
   Lancamento,
   LancamentoCalculado,
   ReajusteDaBase,
+  SalarioMinimoAnterior,
   Resultado,
   SituacaoLancamento,
   TabelaIndices,
@@ -83,8 +84,15 @@ interface Rastro {
   mesesSemIndiceNaBase: MesSemIndice[];
   /** reajustes do valor fixo por índice da prestação apurada pela base (§18.4) */
   reajustesDaBase?: ReajusteDaBase[];
+  /** salário mínimo anterior usado no lugar do que faltou (§19.7, item 6) */
+  salarioMinimoAnteriorDaBase?: SalarioMinimoAnterior;
 }
 
+type RastroDaBase = Pick<
+  Rastro,
+  "indicesDaBase" | "mesesSemIndiceNaBase" | "reajustesDaBase" | "salarioMinimoAnteriorDaBase"
+>;
+
 interface ValorResolvido {
   valorBase: Decimal;
   memoriaBase: string;
@@ -104,7 +112,7 @@ function resolverValor(
   indices: TabelaIndices,
   valorCasas: number,
   avisos: string[],
-  rastro: Pick<Rastro, "indicesDaBase" | "mesesSemIndiceNaBase" | "reajustesDaBase">,
+  rastro: RastroDaBase,
 ): ValorResolvido {
   if (lancamento.valorInformado !== undefined) {
     const informado = decimalOuNulo(lancamento.valorInformado);
@@ -137,6 +145,9 @@ function resolverValor(
   rastro.indicesDaBase = base.indicesUsados;
   rastro.mesesSemIndiceNaBase = base.mesesSemIndice;
   if (base.reajustes !== undefined) rastro.reajustesDaBase = base.reajustes;
+  if (base.salarioMinimoAnterior !== undefined) {
+    rastro.salarioMinimoAnteriorDaBase = base.salarioMinimoAnterior;
+  }
   if (base.valor === null) {
     return { valorBase: ZERO, memoriaBase: base.memoria, editado: false, semValor: true };
   }
@@ -211,10 +222,7 @@ function atualizarComRastro(
   if (lancamento.encargos?.metodologia !== undefined) {
     avisos.push(...validarMetodologia(lancamento.encargos.metodologia));
   }
-  const rastroDaBase: Pick<Rastro, "indicesDaBase" | "mesesSemIndiceNaBase" | "reajustesDaBase"> = {
-    indicesDaBase: [],
-    mesesSemIndiceNaBase: [],
-  };
+  const rastroDaBase: RastroDaBase = { indicesDaBase: [], mesesSemIndiceNaBase: [] };
   const valor = resolverValor(lancamento, calculo, indices, valorCasas, avisos, rastroDaBase);
   const situacao = decidirSituacao(lancamento, calculo, valor, avisos);
   const comum = {
@@ -230,6 +238,9 @@ function atualizarComRastro(
     ...(rastroDaBase.reajustesDaBase === undefined
       ? {}
       : { reajustes: rastroDaBase.reajustesDaBase }),
+    ...(rastroDaBase.salarioMinimoAnteriorDaBase === undefined
+      ? {}
+      : { salarioMinimoAnterior: rastroDaBase.salarioMinimoAnteriorDaBase }),
   };
 
   // Vincenda e ignorado entram pelo valor nominal: sem correção e sem juros (§6.7).
diff --git a/src/relatorio/metodologia.ts b/src/relatorio/metodologia.ts
index d32ee68..05d4946 100644
--- a/src/relatorio/metodologia.ts
+++ b/src/relatorio/metodologia.ts
@@ -187,10 +187,34 @@ function fraseDaForma(forma: FormaDaBase, doPeriodo: Par[], resultado: Resultado
   }
 }
 
+/**
+ * "Nas prestações de 05/01/2027 e 05/02/2027, sem o salário mínimo do mês na data da consulta, foi
+ * usado o último disponível, de dez/2026 (R$ 1.621,00).": uma frase por mês de salário mínimo usado
+ * no lugar do que faltou, nas prestações apuradas pela base (§19.7, item 6).
+ */
+function frasesDoSalarioAnterior(apuradas: Par[]): string[] {
+  const porMesUsado = new Map<Competencia, Par[]>();
+  for (const par of apuradas) {
+    const anterior = par.calculado.salarioMinimoAnterior;
+    if (anterior === undefined) continue;
+    porMesUsado.set(anterior.usado, [...(porMesUsado.get(anterior.usado) ?? []), par]);
+  }
+  return [...porMesUsado.entries()]
+    .sort(([a], [b]) => (a < b ? -1 : 1))
+    .map(([usado, lista]) => {
+      // a mensal e um 13º podem vencer no mesmo dia: a data sai uma vez só
+      const datas = [...new Set(lista.map((p) => p.lancamento.data))].sort();
+      const valor = lista[0]?.calculado.salarioMinimoAnterior?.valor ?? "0";
+      const quais = `${lista.length === 1 ? "Na prestação" : "Nas prestações"} de ${listar(datas.map(formatarData))}`;
+      return `${quais}, sem o salário mínimo do mês na data da consulta, foi usado o último disponível, de ${formatarCompetencia(usado)} (${formatarMoeda(decimal(valor))}).`;
+    });
+}
+
 /**
  * Base (§18.5): uma frase por período em que vence alguma prestação apurada pela base; com dois
- * ou mais períodos na base, cada frase começa pelo intervalo (§17.2). Complementos: prestações
- * anteriores à fixação e valores informados à mão.
+ * ou mais períodos na base, cada frase começa pelo intervalo (§17.2). Complementos: o salário
+ * mínimo usado no lugar do que faltou (§19.7), prestações anteriores à fixação e valores
+ * informados à mão.
  */
 export function paragrafoBase(calculo: Calculo, resultado: Resultado): string | null {
   const todos = pares(calculo, resultado);
@@ -214,6 +238,7 @@ export function paragrafoBase(calculo: Calculo, resultado: Resultado): string |
   }
   const textos: string[] = [];
   if (frases.length > 0) textos.push(`${maiuscula(frases.join("; "))}.`);
+  textos.push(...frasesDoSalarioAnterior(apuradas));
   if (anteriorAFixacao) {
     textos.push("As prestações vencidas antes da fixação entram pelo valor fixado, sem reajuste.");
   }
```

- [ ] **Step 4: Verificar.** `npm run format && npm run verificar`: verde, sem mudança do `format`; `Tests  957 passed | 10 skipped (967)`, `Test Files  55 passed (55)`.

- [ ] **Step 5: Commit:** `motor, relatorio: salário mínimo usado no lugar do que faltou no mês do vencimento (§19.7, item 6)`.

### Task 3: Relatório: pagamento posterior à data do cálculo e sem valor desliga o botão

**Files:**
- Test: `src/relatorio/bloqueio.test.ts`
- Modify: `src/relatorio/bloqueio.ts`

**Interfaces:**
- Consumes: `motivoDoBloqueio(calculo, resultado)` (mesma assinatura), `decimalOuNulo`.
- Produces: nada exportado de novo (interna `posteriorComValor(p: Par, calculo: Calculo): boolean`).

§19.7, item 5. O pagamento com data posterior à data do cálculo só deixa de desligar "Relatório / PDF" quando tem valor válido e positivo; sem valor (ou com zero, negativo ou inválido), conta como os demais lançamentos sem valor, com a frase que já existe.

- [ ] **Step 1: Aplicar o patch dos testes** (`$RASCUNHO/t3-testes.patch`)

```diff
diff --git a/src/relatorio/bloqueio.test.ts b/src/relatorio/bloqueio.test.ts
index d8e306d..579ecd4 100644
--- a/src/relatorio/bloqueio.test.ts
+++ b/src/relatorio/bloqueio.test.ts
@@ -57,4 +57,21 @@ describe("quando o botão “Relatório / PDF” fica desligado (§18.1)", () =>
     ).toBe(null);
     expect(motivo({})).toBe(null);
   });
+
+  it("pagamento posterior à data do cálculo sem valor válido bloqueia como os demais (§19.7, item 5)", () => {
+    const frase =
+      "1 pagamento está sem valor (veja a caixa de avisos): informe o valor para gerar o relatório.";
+    const posterior = (valorInformado: string | undefined) =>
+      motivo({
+        lancamentos: [
+          prestacao("2024-10-05"),
+          { ...pagamento("2026-11-10", "1.00"), valorInformado },
+        ],
+      });
+    expect(posterior(undefined)).toBe(frase);
+    expect(posterior("0")).toBe(frase);
+    expect(posterior("-5.00")).toBe(frase);
+    expect(posterior("abc")).toBe(frase);
+    expect(posterior("10.00")).toBe(null);
+  });
 });
```

- [ ] **Step 2: Ver falhar.** `npx vitest run`. Esperado (medido na reconstrução): 1 teste falha, e só eles:

  - `pagamento posterior à data do cálculo sem valor válido bloqueia como os demais (§19.7, item 5)`

  com mensagens como:

  - `AssertionError: expected null to be '1 pagamento está sem valor (veja a ca…' // Object.is equality`

  Resumo: `Test Files  1 failed | 54 passed (55) · Tests  1 failed | 957 passed | 10 skipped (968)`.

- [ ] **Step 3: Aplicar o patch do código** (`$RASCUNHO/t3-codigo.patch`)

```diff
diff --git a/src/relatorio/bloqueio.ts b/src/relatorio/bloqueio.ts
index d86a4f3..672d378 100644
--- a/src/relatorio/bloqueio.ts
+++ b/src/relatorio/bloqueio.ts
@@ -1,10 +1,24 @@
+import { decimalOuNulo } from "../compartilhado/decimal.ts";
 import type { Calculo, Resultado } from "../compartilhado/tipos.ts";
-import { listar, pares } from "./texto.ts";
+import { listar, pares, type Par } from "./texto.ts";
+
+/**
+ * O pagamento com data posterior à data do cálculo e com valor válido e positivo: o único
+ * "não computado" que pode chegar ao relatório (§18.1). Sem valor, ou com valor zero, negativo
+ * ou inválido, ele conta como os demais lançamentos sem valor (§19.7, item 5).
+ */
+function posteriorComValor(p: Par, calculo: Calculo): boolean {
+  if (p.lancamento.tipo !== "amortizacao" || p.lancamento.data <= calculo.dataElaboracao) {
+    return false;
+  }
+  const valor = decimalOuNulo(p.lancamento.valorInformado);
+  return valor !== null && valor.gt(0);
+}
 
 /**
  * Por que "Relatório / PDF" fica desligado (§18.1), ou `null` quando pode abrir: sem prestação
  * lançada, ou com algum lançamento "não computado" por falta de valor ou por valor inválido. O
- * pagamento com data posterior à data do cálculo não bloqueia. Módulo puro.
+ * pagamento com data posterior à data do cálculo e com valor não bloqueia. Módulo puro.
  */
 export function motivoDoBloqueio(calculo: Calculo, resultado: Resultado): string | null {
   const todos = pares(calculo, resultado);
@@ -12,9 +26,7 @@ export function motivoDoBloqueio(calculo: Calculo, resultado: Resultado): string
     return "Lance ao menos uma prestação para gerar o relatório.";
   }
   const semValor = todos.filter(
-    (p) =>
-      p.calculado.situacao === "ignorado" &&
-      !(p.lancamento.tipo === "amortizacao" && p.lancamento.data > calculo.dataElaboracao),
+    (p) => p.calculado.situacao === "ignorado" && !posteriorComValor(p, calculo),
   );
   if (semValor.length === 0) return null;
   const n = semValor.filter((p) => p.lancamento.tipo === "prestacao").length;
```

- [ ] **Step 4: Verificar.** `npm run format && npm run verificar`: verde, sem mudança do `format`; `Tests  958 passed | 10 skipped (968)`, `Test Files  55 passed (55)`.

- [ ] **Step 5: Commit:** `relatorio: pagamento posterior à data do cálculo e sem valor desliga o relatório (§19.7, item 5)`.

### Task 4: Interface: "Salvar" no Safari, limite de 1900 pela constante e comentário

**Files:**
- Test: `src/ui/ambiente.test.ts`
- Modify: `src/ui/ambiente.ts`
- Modify: `src/ui/preferencias.ts`
- Modify: `src/ui/secoes/Base.tsx`
- Modify: `src/ui/secoes/EditorDePeriodos.tsx`
- Modify: `src/ui/secoes/Encargos.tsx`
- Modify: `src/ui/secoes/LotePagamentos.tsx`
- Modify: `src/ui/secoes/LotePrestacoes.tsx`
- Modify: `src/ui/tabelas/Personalizar.tsx`
- Modify: `src/ui/tabelas/TabelaLancamentos.tsx`

**Interfaces:**
- Consumes: `DATA_MINIMA`, `DATA_MAXIMA` (`src/ui/entrada.ts`).
- Produces: `export function baixarPeloNavegador(nome: string, conteudo: string): void` (`src/ui/ambiente.ts`, antes interna), que revoga o endereço provisório 60 s depois do clique.

§19.7, itens 7 a 9. O teste novo falha por `baixarPeloNavegador` ainda não ser exportada; no ensaio, com a função exportada e a revogação ainda imediata, ele falhou em `expect(revogar).not.toHaveBeenCalled()`, o que prova que ele pega o defeito. A troca de `min="1900-01-01"` por `min={DATA_MINIMA}` (sete arquivos, onze campos) e o comentário quebrado não mudam comportamento: os testes existentes cobrem; depois do patch, `grep -rn '1900-01-01' src/ui | grep -v test` só acha `entrada.ts`.

- [ ] **Step 1: Aplicar o patch dos testes** (`$RASCUNHO/t4-testes.patch`)

```diff
diff --git a/src/ui/ambiente.test.ts b/src/ui/ambiente.test.ts
new file mode 100644
index 0000000..6e63ad3
--- /dev/null
+++ b/src/ui/ambiente.test.ts
@@ -0,0 +1,36 @@
+// @vitest-environment jsdom
+import { afterEach, describe, expect, it, vi } from "vitest";
+import { baixarPeloNavegador } from "./ambiente.ts";
+
+describe("download do arquivo pelo navegador (§19.7, item 9)", () => {
+  afterEach(() => {
+    vi.useRealTimers();
+    vi.restoreAllMocks();
+    vi.unstubAllGlobals();
+  });
+
+  it("revoga o endereço provisório só um minuto depois do clique (o Safari perde o download se ele some antes)", () => {
+    vi.useFakeTimers();
+    const criar = vi.fn(() => "blob:apura/1");
+    const revogar = vi.fn();
+    vi.stubGlobal(
+      "URL",
+      Object.assign(class extends URL {}, { createObjectURL: criar, revokeObjectURL: revogar }),
+    );
+    const clique = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
+
+    baixarPeloNavegador("Apura – teste.json", "{}");
+
+    expect(criar).toHaveBeenCalledTimes(1);
+    expect(clique).toHaveBeenCalledTimes(1);
+    const ancora = clique.mock.contexts[0] as HTMLAnchorElement;
+    expect(ancora.download).toBe("Apura – teste.json");
+    expect(ancora.getAttribute("href")).toBe("blob:apura/1");
+    expect(document.body.contains(ancora)).toBe(false);
+    expect(revogar).not.toHaveBeenCalled();
+    vi.advanceTimersByTime(59_999);
+    expect(revogar).not.toHaveBeenCalled();
+    vi.advanceTimersByTime(1);
+    expect(revogar).toHaveBeenCalledWith("blob:apura/1");
+  });
+});
```

- [ ] **Step 2: Ver falhar.** `npx vitest run`. Esperado (medido na reconstrução): 1 teste falha, e só eles:

  - `revoga o endereço provisório só um minuto depois do clique (o Safari perde o download se ele some antes)`

  com mensagens como:

  - `TypeError: baixarPeloNavegador is not a function`

  Resumo: `Test Files  1 failed | 55 passed (56) · Tests  1 failed | 958 passed | 10 skipped (969)`.

- [ ] **Step 3: Aplicar o patch do código** (`$RASCUNHO/t4-codigo.patch`)

```diff
diff --git a/src/ui/ambiente.ts b/src/ui/ambiente.ts
index 970f0a0..06ad6eb 100644
--- a/src/ui/ambiente.ts
+++ b/src/ui/ambiente.ts
@@ -42,7 +42,14 @@ function armazenamentoDoNavegador(): Storage | null {
   }
 }
 
-function baixarPeloNavegador(nome: string, conteudo: string): void {
+/** Espera antes de revogar o endereço provisório do arquivo baixado (§19.7, item 9). */
+const ESPERA_PARA_REVOGAR_MS = 60_000;
+
+/**
+ * Entrega o arquivo pelo download do navegador. O endereço provisório (`blob:`) só é revogado um
+ * minuto depois do clique: o Safari às vezes perde o download quando ele some antes de começar.
+ */
+export function baixarPeloNavegador(nome: string, conteudo: string): void {
   const url = URL.createObjectURL(new Blob([conteudo], { type: "application/json" }));
   const ancora = document.createElement("a");
   ancora.href = url;
@@ -50,7 +57,7 @@ function baixarPeloNavegador(nome: string, conteudo: string): void {
   document.body.append(ancora);
   ancora.click();
   ancora.remove();
-  URL.revokeObjectURL(url);
+  setTimeout(() => URL.revokeObjectURL(url), ESPERA_PARA_REVOGAR_MS);
 }
 
 /** O ambiente real do navegador. */
diff --git a/src/ui/preferencias.ts b/src/ui/preferencias.ts
index 8ae7480..3efd3f0 100644
--- a/src/ui/preferencias.ts
+++ b/src/ui/preferencias.ts
@@ -58,7 +58,9 @@ function metodologia(valor: unknown): OpcaoDeMetodologia {
     : PREFERENCIAS_PADRAO.metodologia;
 }
 
-/** As preferências gravadas, campo a campo conferido; o padrão para o que falta ou está estranho. */
+/**
+ * As preferências gravadas, campo a campo conferido; o padrão para o que falta ou está estranho.
+ */
 export function lerPreferencias(armazenamento: Storage | null): Preferencias {
   const lido = lerJson(armazenamento, CHAVE_PREFERENCIAS);
   if (typeof lido !== "object" || lido === null) return { ...PREFERENCIAS_PADRAO };
@@ -76,8 +78,8 @@ export function lerPreferencias(armazenamento: Storage | null): Preferencias {
 
 /**
  * Grava as preferências. Com "Lembrar" desligado, defensor e órgão são gravados vazios (as duas
- * opções, o tema e a metodologia continuam gravados, para valerem na próxima visita). Devolve false se não deu
- * para gravar.
+ * opções, o tema e a metodologia continuam gravados, para valerem na próxima visita). Devolve
+ * false se não deu para gravar.
  */
 export function gravarPreferencias(armazenamento: Storage | null, p: Preferencias): boolean {
   const gravadas: Preferencias = p.lembrar ? p : { ...p, defensor: "", orgao: "" };
diff --git a/src/ui/secoes/Base.tsx b/src/ui/secoes/Base.tsx
index 1b19841..748d97a 100644
--- a/src/ui/secoes/Base.tsx
+++ b/src/ui/secoes/Base.tsx
@@ -11,6 +11,7 @@ import { periodosDaBaseOrdenados } from "../../motor/base.ts";
 import { CampoSelecao, CampoTexto, Opcao, useCampoValidado } from "../componentes/Campo.tsx";
 import {
   DATA_MAXIMA,
+  DATA_MINIMA,
   formatarMoedaParaCampo,
   formatarNumeroParaCampo,
   lerData,
@@ -178,7 +179,7 @@ export function BaseDosAlimentos({
             setAvisoDaDivisao(null);
           }}
           erro={avisoDaDivisao}
-          min="1900-01-01"
+          min={DATA_MINIMA}
           max={DATA_MAXIMA}
         />
         <button type="button" className="botao secundario" onClick={dividir}>
@@ -314,7 +315,7 @@ function ValorFixo({
           aoMudar={data.aoMudar}
           aoSair={data.aoSair}
           erro={data.erro}
-          min="1900-01-01"
+          min={DATA_MINIMA}
           max={DATA_MAXIMA}
         />
         <CampoSelecao
diff --git a/src/ui/secoes/EditorDePeriodos.tsx b/src/ui/secoes/EditorDePeriodos.tsx
index 632a022..2af4e85 100644
--- a/src/ui/secoes/EditorDePeriodos.tsx
+++ b/src/ui/secoes/EditorDePeriodos.tsx
@@ -4,7 +4,13 @@ import type { OpcaoDeMetodologia } from "../../metodologias/padrao.ts";
 import { periodosOrdenados, validarMetodologia } from "../../motor/periodos.ts";
 import { Avisos } from "../componentes/Avisos.tsx";
 import { CampoSelecao, CampoTexto, Opcao, useCampoValidado } from "../componentes/Campo.tsx";
-import { DATA_MAXIMA, formatarNumeroParaCampo, lerData, lerPercentual } from "../entrada.ts";
+import {
+  DATA_MAXIMA,
+  DATA_MINIMA,
+  formatarNumeroParaCampo,
+  lerData,
+  lerPercentual,
+} from "../entrada.ts";
 import {
   descreverIntervalo,
   dividirPeriodo,
@@ -90,7 +96,7 @@ export function EditorDePeriodos({
             setAvisoDaDivisao(null);
           }}
           erro={avisoDaDivisao}
-          min="1900-01-01"
+          min={DATA_MINIMA}
           max={DATA_MAXIMA}
         />
         <button type="button" className="botao secundario" onClick={dividir}>
diff --git a/src/ui/secoes/Encargos.tsx b/src/ui/secoes/Encargos.tsx
index 3ab6510..dbae996 100644
--- a/src/ui/secoes/Encargos.tsx
+++ b/src/ui/secoes/Encargos.tsx
@@ -2,7 +2,13 @@ import type { Calculo } from "../../compartilhado/tipos.ts";
 import type { OpcaoDeMetodologia } from "../../metodologias/padrao.ts";
 import { Ajuda } from "../componentes/Ajuda.tsx";
 import { CampoArea, CampoTexto, Opcao, useCampoValidado } from "../componentes/Campo.tsx";
-import { DATA_MAXIMA, formatarNumeroParaCampo, lerData, lerPercentual } from "../entrada.ts";
+import {
+  DATA_MAXIMA,
+  DATA_MINIMA,
+  formatarNumeroParaCampo,
+  lerData,
+  lerPercentual,
+} from "../entrada.ts";
 import { opcaoDaMetodologia, resumirMetodologia } from "../estado/metodologia.ts";
 
 /**
@@ -130,7 +136,7 @@ export function Encargos({
           aoMudar={data.aoMudar}
           aoSair={data.aoSair}
           erro={data.erro}
-          min="1900-01-01"
+          min={DATA_MINIMA}
           max={DATA_MAXIMA}
         />
       </div>
diff --git a/src/ui/secoes/LotePagamentos.tsx b/src/ui/secoes/LotePagamentos.tsx
index 303d181..cf23ea2 100644
--- a/src/ui/secoes/LotePagamentos.tsx
+++ b/src/ui/secoes/LotePagamentos.tsx
@@ -4,7 +4,13 @@ import type { LoteAmortizacoes } from "../../compartilhado/tipos.ts";
 import { Ajuda } from "../componentes/Ajuda.tsx";
 import { Avisos } from "../componentes/Avisos.tsx";
 import { CampoTexto } from "../componentes/Campo.tsx";
-import { DATA_MAXIMA, formatarMoedaParaCampo, lerData, lerValorPositivo } from "../entrada.ts";
+import {
+  DATA_MAXIMA,
+  DATA_MINIMA,
+  formatarMoedaParaCampo,
+  lerData,
+  lerValorPositivo,
+} from "../entrada.ts";
 import { intervaloDoLote, MAXIMO_DE_MESES } from "./LotePrestacoes.tsx";
 
 /**
@@ -93,7 +99,7 @@ export function LotePagamentosSecao({
             valor={primeiro}
             aoMudar={setPrimeiro}
             erro={erros.primeiro}
-            min="1900-01-01"
+            min={DATA_MINIMA}
             max={DATA_MAXIMA}
           />
           <CampoTexto
@@ -103,7 +109,7 @@ export function LotePagamentosSecao({
             valor={ultimo}
             aoMudar={setUltimo}
             erro={erros.ultimo}
-            min="1900-01-01"
+            min={DATA_MINIMA}
             max={DATA_MAXIMA}
           />
           <button type="submit" className="botao">
diff --git a/src/ui/secoes/LotePrestacoes.tsx b/src/ui/secoes/LotePrestacoes.tsx
index f136073..6a6b32f 100644
--- a/src/ui/secoes/LotePrestacoes.tsx
+++ b/src/ui/secoes/LotePrestacoes.tsx
@@ -10,7 +10,7 @@ import type { Competencia, DataISO, LotePrestacoes } from "../../compartilhado/t
 import { Ajuda } from "../componentes/Ajuda.tsx";
 import { Avisos } from "../componentes/Avisos.tsx";
 import { CampoTexto, Opcao } from "../componentes/Campo.tsx";
-import { DATA_MAXIMA, lerData, lerInteiro } from "../entrada.ts";
+import { DATA_MAXIMA, DATA_MINIMA, lerData, lerInteiro } from "../entrada.ts";
 
 /** Limite de meses por lote: 600 (50 anos), para a tela nunca pedir milhares de prestações. */
 export const MAXIMO_DE_MESES = 600;
@@ -147,7 +147,7 @@ export function LotePrestacoesSecao({
                 valor={primeiro}
                 aoMudar={setPrimeiro}
                 erro={erros.primeiro}
-                min="1900-01-01"
+                min={DATA_MINIMA}
                 max={DATA_MAXIMA}
               />
               <CampoTexto
@@ -157,7 +157,7 @@ export function LotePrestacoesSecao({
                 valor={ultimo}
                 aoMudar={setUltimo}
                 erro={erros.ultimo}
-                min="1900-01-01"
+                min={DATA_MINIMA}
                 max={DATA_MAXIMA}
               />
             </>
diff --git a/src/ui/tabelas/Personalizar.tsx b/src/ui/tabelas/Personalizar.tsx
index 8f1591d..81c2b76 100644
--- a/src/ui/tabelas/Personalizar.tsx
+++ b/src/ui/tabelas/Personalizar.tsx
@@ -13,6 +13,7 @@ import { Ajuda } from "../componentes/Ajuda.tsx";
 import { CampoTexto, Opcao } from "../componentes/Campo.tsx";
 import {
   DATA_MAXIMA,
+  DATA_MINIMA,
   formatarMoedaParaCampo,
   lerData,
   lerValorPositivo,
@@ -147,7 +148,7 @@ export function Personalizar({
       valor={termos[campo]}
       aoMudar={(v) => setTermos({ ...termos, [campo]: v })}
       erro={erros[campo]}
-      min="1900-01-01"
+      min={DATA_MINIMA}
       max={DATA_MAXIMA}
     />
   );
@@ -162,7 +163,7 @@ export function Personalizar({
           valor={data}
           aoMudar={setData}
           erro={erros.data}
-          min="1900-01-01"
+          min={DATA_MINIMA}
           max={DATA_MAXIMA}
         />
         <CampoTexto
diff --git a/src/ui/tabelas/TabelaLancamentos.tsx b/src/ui/tabelas/TabelaLancamentos.tsx
index 76395b3..44b06ca 100644
--- a/src/ui/tabelas/TabelaLancamentos.tsx
+++ b/src/ui/tabelas/TabelaLancamentos.tsx
@@ -26,6 +26,7 @@ import type {
 import { Ajuda } from "../componentes/Ajuda.tsx";
 import {
   DATA_MAXIMA,
+  DATA_MINIMA,
   formatarDataParaCampo,
   formatarMoedaParaCampo,
   lerData,
@@ -284,7 +285,7 @@ export function TabelaLancamentos({
                     <input
                       ref={campoDaDataNova}
                       type="date"
-                      min="1900-01-01"
+                      min={DATA_MINIMA}
                       max={DATA_MAXIMA}
                       value={rascunho.data}
                       onChange={(e) => mudarDataNova(e.target.value)}
```

- [ ] **Step 4: Verificar.** `npm run format && npm run verificar`: verde, sem mudança do `format`; `Tests  959 passed | 10 skipped (969)`, `Test Files  56 passed (56)`. `grep -rn '1900-01-01' src/ui | grep -v test` → só `src/ui/entrada.ts`.

- [ ] **Step 5: Commit:** `ui: "Salvar" no Safari, limite de 1900 pela constante e comentário quebrado (§19.7, itens 7 a 9)`.

### Task 5: Versão 0.1.0 e `CHANGELOG.md`

**Files:**
- Create: `CHANGELOG.md`
- Modify: `package-lock.json`
- Modify: `package.json`
- Test: `scripts/versao.test.ts`

**Interfaces:**
- Consumes: `VERSAO` (`src/ui/versao.ts`), que lê o `package.json`: o rodapé da tela e o do relatório passam a dizer "v0.1.0" sem mudança de código.
- Produces: `package.json` e `package-lock.json` em `0.1.0`; `CHANGELOG.md` com a seção `## [0.1.0] · 2026-10-14`.

§19.6. O patch traz a data do ensaio (14/10/2026); a Task 15 a troca pela data da publicação, se for outra (o teste só confere o formato). O patch do código foi gerado com `npm version 0.1.0 --no-git-tag-version --ignore-scripts`, que muda as duas linhas de versão do `package-lock.json`.

- [ ] **Step 1: Aplicar o patch dos testes** (`$RASCUNHO/t5-testes.patch`)

```diff
diff --git a/scripts/versao.test.ts b/scripts/versao.test.ts
new file mode 100644
index 0000000..7f929c8
--- /dev/null
+++ b/scripts/versao.test.ts
@@ -0,0 +1,32 @@
+// A versão do Apura (§19.6): a do package.json, que o rodapé da tela e o do relatório mostram, tem
+// de ter a sua seção no CHANGELOG.md e ser a mesma no package-lock.json. Fica em scripts/ porque
+// lê arquivos do repositório com o Node.
+import { readFileSync } from "node:fs";
+import { describe, expect, it } from "vitest";
+
+const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), "utf8");
+const pacote = JSON.parse(ler("package.json")) as { version: string };
+const trava = JSON.parse(ler("package-lock.json")) as {
+  version: string;
+  packages: Record<string, { version?: string }>;
+};
+
+describe("versão do Apura (§19.6)", () => {
+  it("é uma versão semântica (0.1.0, 1.2.3)", () => {
+    expect(pacote.version).toMatch(/^\d+\.\d+\.\d+$/);
+  });
+
+  it("o package-lock.json diz a mesma versão", () => {
+    expect(trava.version).toBe(pacote.version);
+    expect(trava.packages[""]?.version).toBe(pacote.version);
+  });
+
+  it("o CHANGELOG.md tem a seção da versão, com a data (## [0.1.0] · AAAA-MM-DD)", () => {
+    const changelog = ler("CHANGELOG.md");
+    const titulo = new RegExp(
+      `^## \\[${pacote.version.replaceAll(".", "\\.")}\\] · \\d{4}-\\d{2}-\\d{2}$`,
+      "m",
+    );
+    expect(changelog).toMatch(titulo);
+  });
+});
```

- [ ] **Step 2: Ver falhar.** `npx vitest run`. Esperado (medido na reconstrução): 1 teste falha, e só eles:

  - `o CHANGELOG.md tem a seção da versão, com a data (## [0.1.0] · AAAA-MM-DD)`

  com mensagens como:

  - `Error: ENOENT: no such file or directory, open 'CHANGELOG.md'`

  Resumo: `Test Files  1 failed | 56 passed (57) · Tests  1 failed | 961 passed | 10 skipped (972)`.

- [ ] **Step 3: Aplicar o patch do código** (`$RASCUNHO/t5-codigo.patch`)

```diff
diff --git a/CHANGELOG.md b/CHANGELOG.md
new file mode 100644
index 0000000..c9b4839
--- /dev/null
+++ b/CHANGELOG.md
@@ -0,0 +1,25 @@
+# Registro de mudanças
+
+O que muda no Apura para quem o usa, versão por versão, da mais nova para a mais antiga. A
+numeração segue o versionamento semântico (0.1.0, 0.1.1, 0.2.0…): o último número sobe nas
+correções, e o do meio, nas novidades.
+
+## [0.1.0] · 2026-10-14
+
+Primeira versão para os testadores: o cálculo da execução de alimentos (demonstrativo
+discriminado e atualizado do crédito, art. 524 do CPC), que roda inteiro no navegador.
+
+- Base dos alimentos em valor fixo (sem reajuste, reajustado por índice ou pelo salário mínimo),
+  em percentual do salário mínimo ou em percentual dos rendimentos, dividida em períodos quando
+  a base muda.
+- Prestações e pagamentos em lote ou um a um, com 13º, férias e valores informados à mão;
+  vencimento e valor editáveis na própria linha, e os ajustes finos pelo lápis.
+- Encargos pela Lei 14.905/2024 (até 29/08/2024, IGP-M e juros de 1% ao mês; desde 30/08/2024,
+  IPCA e taxa legal) ou por IGP-M e juros de 1% ao mês, com metodologia por períodos e encargos
+  próprios por lançamento; multa e honorários do art. 523, §1º, do CPC.
+- Índices oficiais do Banco Central (SGS), atualizados nos dias úteis por uma rotina central;
+  avisos quando um índice ainda não foi divulgado ou não chegou ao Apura.
+- Relatório na identidade visual da DPE-MS, na tela e em PDF pela impressão do navegador, com
+  "Metodologia e fundamentos" escrito a partir do que foi aplicado e a matriz dos índices usados.
+- Salvar e abrir o cálculo em arquivo; cinco cálculos recentes e as preferências guardados só no
+  navegador, com "Esquecer"; tema claro ou escuro.
diff --git a/package-lock.json b/package-lock.json
index c7ab37d..7a39591 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,12 +1,12 @@
 {
   "name": "apura",
-  "version": "0.0.0",
+  "version": "0.1.0",
   "lockfileVersion": 3,
   "requires": true,
   "packages": {
     "": {
       "name": "apura",
-      "version": "0.0.0",
+      "version": "0.1.0",
       "dependencies": {
         "@fontsource/source-sans-3": "5.3.0",
         "@fontsource/ubuntu": "5.3.0",
diff --git a/package.json b/package.json
index 5b21a19..4fe81a7 100644
--- a/package.json
+++ b/package.json
@@ -1,7 +1,7 @@
 {
   "name": "apura",
   "private": true,
-  "version": "0.0.0",
+  "version": "0.1.0",
   "description": "Apura — Sistema de Cálculos Judiciais da Defensoria Pública de Mato Grosso do Sul",
   "type": "module",
   "engines": {
```

- [ ] **Step 4: Verificar.** `npm run format && npm run verificar`: verde, sem mudança do `format`; `Tests  962 passed | 10 skipped (972)`, `Test Files  57 passed (57)`.

- [ ] **Step 5: Commit:** `versao: 0.1.0, CHANGELOG.md e teste que exige a seção de cada versão (§19.6)`.

### Task 6: Site: Node fixado, travas da instalação, cabeçalhos, tema fora do `index.html` e `versao.json`

**Files:**
- Create: `.node-version`
- Modify: `.npmrc`
- Modify: `eslint.config.js`
- Modify: `index.html`
- Create: `public/_headers`
- Create: `public/tema.js`
- Test: `scripts/site.test.ts`
- Test: `src/indices/publicacao.test.ts`
- Create: `src/indices/publicacao.ts`
- Modify: `vite.config.ts`

**Interfaces:**
- Consumes: `seriesEmbutidas()` (`src/indices/embutidos.ts`), `compararInstantes` (`relogio.ts`).
- Produces: `interface VersaoDoSite { formato: "apura/versao-do-site@1"; versao: string; indicesAtualizadosEm: string }` e `montarVersaoDoSite(versao: string, arquivos: readonly ArquivoSerie[]): VersaoDoSite` (`src/indices/publicacao.ts`, novo), usados pela Task 7; o plugin `apura:versao-do-site` do `vite.config.ts`, que grava `dist/versao.json` na montagem.

§19.2. O `.node-version` (22.23.3) é lido pelo Cloudflare e pelos workflows; o `.npmrc` ganha `ignore-scripts=true` e `engine-strict=true` (nenhum pacote do lock tem programa de instalação nem `engines` incompatível com 22.23.3); o `public/_headers` traz os seis cabeçalhos; o script do tema sai do `index.html` para `public/tema.js` (uma função que roda na hora, sem variável global), porque a política de conteúdo recusa script embutido; o ESLint passa a conhecer os scripts de `public/` como scripts do navegador.

- [ ] **Step 1: Aplicar o patch dos testes** (`$RASCUNHO/t6-testes.patch`)

```diff
diff --git a/scripts/site.test.ts b/scripts/site.test.ts
new file mode 100644
index 0000000..1bb5185
--- /dev/null
+++ b/scripts/site.test.ts
@@ -0,0 +1,88 @@
+// O que vai para o site publicado no Cloudflare Pages e o ambiente da montagem (§19.2): o Node
+// fixado, as travas da instalação, os cabeçalhos de segurança e o index.html sem script embutido
+// (que a política de conteúdo bloquearia). Fica em scripts/ porque lê arquivos do repositório.
+import { existsSync, readFileSync } from "node:fs";
+import { describe, expect, it } from "vitest";
+
+const caminho = (relativo: string) => new URL(`../${relativo}`, import.meta.url);
+const ler = (relativo: string) => readFileSync(caminho(relativo), "utf8");
+
+/** "22.23.3" → [22, 23, 3]; compara versões X.Y.Z número a número. */
+const partes = (versao: string) => versao.split(".").map(Number);
+function naoMenor(versao: string, minima: string): boolean {
+  const [a, b] = [partes(versao), partes(minima)];
+  for (let i = 0; i < 3; i++) {
+    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
+  }
+  return true;
+}
+
+/** Os cabeçalhos do bloco "/*" do public/_headers, por nome. */
+function cabecalhosDeTodasAsPaginas(): Map<string, string> {
+  const linhas = ler("public/_headers").split("\n");
+  const inicio = linhas.findIndex((l) => l.trim() === "/*");
+  const mapa = new Map<string, string>();
+  for (const linha of linhas.slice(inicio + 1)) {
+    if (!/^\s+\S/.test(linha)) break;
+    const [nome = "", ...valor] = linha.trim().split(":");
+    mapa.set(nome.trim(), valor.join(":").trim());
+  }
+  return mapa;
+}
+
+describe("ambiente da montagem (§19.2)", () => {
+  it(".node-version fixa uma versão exata do Node que satisfaz o engines do package.json", () => {
+    const versao = ler(".node-version").trim();
+    expect(versao).toMatch(/^\d+\.\d+\.\d+$/);
+    const minima = (JSON.parse(ler("package.json")) as { engines: { node: string } }).engines.node;
+    expect(minima).toMatch(/^>=\d+\.\d+\.\d+$/);
+    expect(naoMenor(versao, minima.slice(2))).toBe(true);
+  });
+
+  it(".npmrc: nenhum pacote roda programa na instalação, e Node fora do engines para a instalação", () => {
+    const linhas = ler(".npmrc")
+      .split("\n")
+      .map((l) => l.trim());
+    expect(linhas).toContain("ignore-scripts=true");
+    expect(linhas).toContain("engine-strict=true");
+  });
+});
+
+describe("o site publicado (§19.2)", () => {
+  it("cabeçalhos em todas as páginas: não indexar, política de conteúdo e proteções usuais", () => {
+    const h = cabecalhosDeTodasAsPaginas();
+    expect(h.get("X-Robots-Tag")).toBe("noindex");
+    expect(h.get("X-Frame-Options")).toBe("DENY");
+    expect(h.get("X-Content-Type-Options")).toBe("nosniff");
+    expect(h.get("Referrer-Policy")).toBe("no-referrer");
+    expect(h.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
+    const politica = new Map(
+      (h.get("Content-Security-Policy") ?? "").split(";").map((diretiva) => {
+        const [nome = "", ...valores] = diretiva.trim().split(/\s+/);
+        return [nome, valores.join(" ")] as const;
+      }),
+    );
+    expect(politica.get("default-src")).toBe("'self'");
+    expect(politica.get("script-src")).toBe("'self'");
+    expect(politica.get("connect-src")).toBe("'self'");
+    expect(politica.get("object-src")).toBe("'none'");
+    expect(politica.get("base-uri")).toBe("'none'");
+    expect(politica.get("form-action")).toBe("'none'");
+    expect(politica.get("frame-ancestors")).toBe("'none'");
+  });
+
+  it("index.html: marca de não indexar e nenhum script embutido (só arquivos do próprio site)", () => {
+    const html = ler("index.html");
+    expect(html).toContain('<meta name="robots" content="noindex" />');
+    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
+    expect(scripts.length).toBeGreaterThan(0);
+    for (const [, atributos = "", corpo = ""] of scripts) {
+      expect(corpo.trim()).toBe("");
+      const src = /\bsrc="\/([^"]+)"/.exec(atributos)?.[1];
+      expect(src).toBeDefined();
+      expect(existsSync(caminho(src ?? "")) || existsSync(caminho(`public/${src ?? ""}`))).toBe(
+        true,
+      );
+    }
+  });
+});
diff --git a/src/indices/publicacao.test.ts b/src/indices/publicacao.test.ts
new file mode 100644
index 0000000..c0761c2
--- /dev/null
+++ b/src/indices/publicacao.test.ts
@@ -0,0 +1,35 @@
+import { describe, expect, it } from "vitest";
+import type { ArquivoSerie, CodigoSerie } from "../compartilhado/tipos.ts";
+import { montarVersaoDoSite } from "./publicacao.ts";
+
+function arquivo(codigo: CodigoSerie, obtidoEm: string): ArquivoSerie {
+  return {
+    formato: "apura/serie@1",
+    codigo,
+    nome: `série ${codigo}`,
+    origem: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados?formato=json`,
+    obtidoEm,
+    valores: [{ competencia: "2026-09", valor: "0.48" }],
+  };
+}
+
+describe("versao.json do site (§19.2)", () => {
+  it("leva a versão e a obtenção mais recente entre as séries, comparada pelo instante", () => {
+    // 23:11 em UTC são 20:11 em Brasília: anterior às 20:30 de Brasília, embora venha depois na ordem alfabética
+    expect(
+      montarVersaoDoSite("0.1.0", [
+        arquivo("433", "2026-10-11T23:11:55.140Z"),
+        arquivo("4390", "2026-10-11T20:30:00-03:00"),
+        arquivo("189", "2026-10-10T10:47:00-03:00"),
+      ]),
+    ).toEqual({
+      formato: "apura/versao-do-site@1",
+      versao: "0.1.0",
+      indicesAtualizadosEm: "2026-10-11T20:30:00-03:00",
+    });
+  });
+
+  it("sem séries, a data fica vazia", () => {
+    expect(montarVersaoDoSite("0.1.0", []).indicesAtualizadosEm).toBe("");
+  });
+});
```

- [ ] **Step 2: Ver falhar.** `npx vitest run`. Esperado (medido na reconstrução): 4 testes falham, e só eles:

  - `.node-version fixa uma versão exata do Node que satisfaz o engines do package.json`
  - `.npmrc: nenhum pacote roda programa na instalação, e Node fora do engines para a instalação`
  - `cabeçalhos em todas as páginas: não indexar, política de conteúdo e proteções usuais`
  - `index.html: marca de não indexar e nenhum script embutido (só arquivos do próprio site)`

  com mensagens como:

  - `Error: Cannot find module './publicacao.ts' imported from src/indices/publicacao.test.ts`
  - `Error: ENOENT: no such file or directory, open '.node-version'`
  - `AssertionError: expected [ 'save-exact=true', '' ] to include 'ignore-scripts=true'`
  - `Error: ENOENT: no such file or directory, open 'public/_headers'`
  - `AssertionError: expected '<!doctype html>\n<html lang="pt-BR">\…' to contain '<meta name="robots" content="noindex"…'`

  Resumo: `Test Files  2 failed | 57 passed (59) · Tests  4 failed | 962 passed | 10 skipped (976)`.

- [ ] **Step 3: Aplicar o patch do código** (`$RASCUNHO/t6-codigo.patch`)

```diff
diff --git a/.node-version b/.node-version
new file mode 100644
index 0000000..de889f8
--- /dev/null
+++ b/.node-version
@@ -0,0 +1 @@
+22.23.3
diff --git a/.npmrc b/.npmrc
index cffe8cd..2104ca9 100644
--- a/.npmrc
+++ b/.npmrc
@@ -1 +1,3 @@
 save-exact=true
+ignore-scripts=true
+engine-strict=true
diff --git a/eslint.config.js b/eslint.config.js
index 424e7b0..77e7837 100644
--- a/eslint.config.js
+++ b/eslint.config.js
@@ -14,6 +14,11 @@ export default defineConfig(
     files: ["**/*.{ts,tsx}"],
     languageOptions: { globals: { ...globals.browser, ...globals.node } },
   },
+  {
+    // Scripts servidos como estão, sem passar pelo Vite (public/): rodam no navegador.
+    files: ["public/**/*.js"],
+    languageOptions: { globals: globals.browser, sourceType: "script" },
+  },
   {
     // O motor é puro (regra 4 do CLAUDE.md): sem relógio, sem rede, sem DOM, sem armazenamento.
     files: ["src/motor/**/*.ts"],
diff --git a/index.html b/index.html
index 2b3a940..33c5f22 100644
--- a/index.html
+++ b/index.html
@@ -4,22 +4,9 @@
     <meta charset="UTF-8" />
     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
     <meta name="color-scheme" content="light dark" />
+    <meta name="robots" content="noindex" />
     <title>Apura · Sistema de Cálculos Judiciais</title>
-    <script>
-      // Tema fixado pelo usuário (preferência "tema" em apura.preferencias): marcado na raiz
-      // antes do CSS e do app, para a página não piscar no tema do sistema. O App mantém em dia.
-      try {
-        var preferencias = JSON.parse(localStorage.getItem("apura.preferencias") || "{}");
-        if (preferencias.tema === "claro" || preferencias.tema === "escuro") {
-          document.documentElement.setAttribute(
-            "data-theme",
-            preferencias.tema === "claro" ? "light" : "dark",
-          );
-        }
-      } catch (erro) {
-        // sem armazenamento (bloqueado ou ausente): vale o tema do sistema
-      }
-    </script>
+    <script src="/tema.js"></script>
   </head>
   <body>
     <div id="raiz"></div>
diff --git a/public/_headers b/public/_headers
new file mode 100644
index 0000000..2d663a8
--- /dev/null
+++ b/public/_headers
@@ -0,0 +1,8 @@
+# Cabeçalhos que o Cloudflare Pages envia com cada resposta do site (§19.2 do design).
+/*
+  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
+  X-Frame-Options: DENY
+  X-Content-Type-Options: nosniff
+  Referrer-Policy: no-referrer
+  Permissions-Policy: camera=(), microphone=(), geolocation=()
+  X-Robots-Tag: noindex
diff --git a/public/tema.js b/public/tema.js
new file mode 100644
index 0000000..9b26da4
--- /dev/null
+++ b/public/tema.js
@@ -0,0 +1,17 @@
+// Tema fixado pelo usuário (preferência "tema" em apura.preferencias): marcado na raiz antes do
+// CSS e do app, para a página não piscar no tema do sistema. O App mantém em dia. Fica num arquivo
+// próprio, e não dentro do index.html, porque a política de conteúdo do site (public/_headers)
+// só aceita scripts do próprio endereço. A função roda na hora e não deixa variáveis globais.
+(function () {
+  try {
+    var preferencias = JSON.parse(localStorage.getItem("apura.preferencias") || "{}");
+    if (preferencias.tema === "claro" || preferencias.tema === "escuro") {
+      document.documentElement.setAttribute(
+        "data-theme",
+        preferencias.tema === "claro" ? "light" : "dark",
+      );
+    }
+  } catch {
+    // sem armazenamento (bloqueado ou ausente): vale o tema do sistema
+  }
+})();
diff --git a/src/indices/publicacao.ts b/src/indices/publicacao.ts
new file mode 100644
index 0000000..586501a
--- /dev/null
+++ b/src/indices/publicacao.ts
@@ -0,0 +1,29 @@
+import type { ArquivoSerie } from "../compartilhado/tipos.ts";
+import { compararInstantes } from "./relogio.ts";
+
+/**
+ * O arquivo `versao.json` do site publicado (§19.2): a versão do Apura e a data de obtenção mais
+ * recente da cópia dos índices (a mesma que o rodapé da tela mostra). A montagem do site o grava
+ * (`vite.config.ts`), e a rotina de índices o lê para conferir que o site tem a cópia da `main`.
+ * Módulo puro.
+ */
+export interface VersaoDoSite {
+  formato: "apura/versao-do-site@1";
+  /** a do package.json */
+  versao: string;
+  /** data-hora ISO da obtenção mais recente entre as séries, comparada pelo instante */
+  indicesAtualizadosEm: string;
+}
+
+export function montarVersaoDoSite(
+  versao: string,
+  arquivos: readonly ArquivoSerie[],
+): VersaoDoSite {
+  let indicesAtualizadosEm = "";
+  for (const { obtidoEm } of arquivos) {
+    if (indicesAtualizadosEm === "" || compararInstantes(obtidoEm, indicesAtualizadosEm) > 0) {
+      indicesAtualizadosEm = obtidoEm;
+    }
+  }
+  return { formato: "apura/versao-do-site@1", versao, indicesAtualizadosEm };
+}
diff --git a/vite.config.ts b/vite.config.ts
index df46ea0..cd4cb52 100644
--- a/vite.config.ts
+++ b/vite.config.ts
@@ -1,8 +1,31 @@
 import react from "@vitejs/plugin-react";
+import type { Plugin } from "vite";
 import { defineConfig } from "vitest/config";
+import pacote from "./package.json" with { type: "json" };
+import { seriesEmbutidas } from "./src/indices/embutidos.ts";
+import { montarVersaoDoSite } from "./src/indices/publicacao.ts";
+
+/**
+ * Grava `versao.json` no site montado (§19.2): a versão do Apura e a data dos índices da cópia
+ * publicada, que a rotina de índices lê para conferir a publicação.
+ */
+function versaoDoSite(): Plugin {
+  return {
+    name: "apura:versao-do-site",
+    apply: "build",
+    generateBundle() {
+      const versao = montarVersaoDoSite(pacote.version, Object.values(seriesEmbutidas()));
+      this.emitFile({
+        type: "asset",
+        fileName: "versao.json",
+        source: `${JSON.stringify(versao, null, 2)}\n`,
+      });
+    },
+  };
+}
 
 export default defineConfig({
-  plugins: [react()],
+  plugins: [react(), versaoDoSite()],
   test: {
     environment: "node",
     include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.ts"],
```

- [ ] **Step 4: Verificar.** `npm ci` (passa com as duas travas novas, sem aviso de `engines`); `npm run format && npm run verificar`: verde, sem mudança do `format`; `Tests  968 passed | 10 skipped (978)`, `Test Files  59 passed (59)`. `npm run build`: `dist/` com `_headers`, `tema.js` e `versao.json` (`"formato": "apura/versao-do-site@1"`, `"versao": "0.1.0"` e a data de obtenção mais recente de `dados/indices/`), e `grep -o '<script[^>]*>' dist/index.html` mostra só `<script src="/tema.js">` e o `<script type="module" crossorigin src="/assets/…">`.

- [ ] **Step 5: Commit:** `site: Node fixado, travas da instalação, cabeçalhos de segurança, tema fora do index.html e versao.json (§19.2)`.

### Task 7: Índices: conferência da publicação

**Files:**
- Modify: `package.json`
- Create: `scripts/conferir-publicacao.ts`
- Modify: `src/indices/cliente-bcb.ts`
- Test: `src/indices/publicacao.test.ts`
- Modify: `src/indices/publicacao.ts`
- Test: `src/indices/relogio.test.ts`
- Modify: `src/indices/relogio.ts`

**Interfaces:**
- Consumes: `VersaoDoSite`, `montarVersaoDoSite` (Task 6); `lerArquivoSerie`, `SERIES_EM_ORDEM_NUMERICA`, `agoraEmBrasilia`, `dataHoraEmBrasilia`, `formatarDataHoraBrasilia`, `compararInstantes`.
- Produces: em `src/indices/publicacao.ts`: `lerVersaoDoSite(texto: string): VersaoDoSite | null`; `interface ConferenciaDaPublicacao { ok: boolean; mensagem: string }`; `TOLERANCIA_DA_PUBLICACAO_MINUTOS = 30`; `conferirPublicacao(main: VersaoDoSite, site: VersaoDoSite, agora: string): ConferenciaDaPublicacao`; `interface OpcoesDaConferencia { fetch?: typeof globalThis.fetch; dormir?: (ms: number) => Promise<void> }`; `conferirSitePublicado(endereco: string, main: VersaoDoSite, agora: string, opcoes?: OpcoesDaConferencia): Promise<ConferenciaDaPublicacao>`. Em `relogio.ts`: `minutosEntre(antes: string, depois: string): number | null`. Em `cliente-bcb.ts`: `nomeDoErro` e `causaDoErro` passam a ser exportadas. O script `npm run indices:conferir-publicacao` (`scripts/conferir-publicacao.ts`, que lê `SITE_URL`), usado pela Task 8.

§19.4. A comparação é pura e testada com a rede simulada; o script só lê o disco (`package.json` e `dados/indices/`), o ambiente e escreve a frase. `SITE_URL` aceita `https://` e, para conferir um site montado na máquina, `http://localhost`.

- [ ] **Step 1: Aplicar o patch dos testes** (`$RASCUNHO/t7-testes.patch`)

```diff
diff --git a/src/indices/publicacao.test.ts b/src/indices/publicacao.test.ts
index c0761c2..da11193 100644
--- a/src/indices/publicacao.test.ts
+++ b/src/indices/publicacao.test.ts
@@ -1,6 +1,12 @@
 import { describe, expect, it } from "vitest";
 import type { ArquivoSerie, CodigoSerie } from "../compartilhado/tipos.ts";
-import { montarVersaoDoSite } from "./publicacao.ts";
+import {
+  conferirPublicacao,
+  conferirSitePublicado,
+  lerVersaoDoSite,
+  montarVersaoDoSite,
+  type VersaoDoSite,
+} from "./publicacao.ts";
 
 function arquivo(codigo: CodigoSerie, obtidoEm: string): ArquivoSerie {
   return {
@@ -33,3 +39,152 @@ describe("versao.json do site (§19.2)", () => {
     expect(montarVersaoDoSite("0.1.0", []).indicesAtualizadosEm).toBe("");
   });
 });
+
+const versao = (indicesAtualizadosEm: string): VersaoDoSite => ({
+  formato: "apura/versao-do-site@1",
+  versao: "0.1.0",
+  indicesAtualizadosEm,
+});
+const MAIN = versao("2026-11-20T10:47:12-03:00");
+const ANTERIOR = versao("2026-11-19T22:47:05-03:00");
+
+describe("lerVersaoDoSite", () => {
+  it("lê o arquivo no formato; recusa o resto", () => {
+    expect(lerVersaoDoSite(JSON.stringify(MAIN))).toEqual(MAIN);
+    expect(lerVersaoDoSite("<!doctype html><title>404</title>")).toBeNull();
+    expect(lerVersaoDoSite(JSON.stringify({ ...MAIN, formato: "outro" }))).toBeNull();
+    expect(lerVersaoDoSite(JSON.stringify({ ...MAIN, indicesAtualizadosEm: 3 }))).toBeNull();
+    expect(lerVersaoDoSite(JSON.stringify({ ...MAIN, versao: undefined }))).toBeNull();
+    expect(lerVersaoDoSite("null")).toBeNull();
+  });
+
+  it("recusa data que não seja data-hora com fuso (vazia, sem fuso, com quebra de linha)", () => {
+    for (const data of ["", "2026-10-14T10:48:00", "2026-10-14T10:48:00-03:00\n::error::x"]) {
+      expect(lerVersaoDoSite(JSON.stringify({ ...MAIN, indicesAtualizadosEm: data }))).toBeNull();
+    }
+  });
+});
+
+describe("conferirPublicacao (§19.4)", () => {
+  it("em dia: os mesmos índices da main", () => {
+    expect(conferirPublicacao(MAIN, MAIN, "2026-11-20T14:17:30-03:00")).toEqual({
+      ok: true,
+      mensagem:
+        "O site publicado está em dia: índices de 20/11/2026 10:47 (horário de Brasília), os mesmos da main.",
+    });
+  });
+
+  it("main mais nova há menos de 30 minutos: a publicação pode estar em andamento", () => {
+    expect(conferirPublicacao(MAIN, ANTERIOR, "2026-11-20T11:16:59-03:00")).toEqual({
+      ok: true,
+      mensagem:
+        "A main tem os índices de 20/11/2026 10:47, gravados há menos de 30 minutos; o site publicado ainda tem os de 19/11/2026 22:47 (horário de Brasília): a publicação pode estar em andamento.",
+    });
+  });
+
+  it("site atrasado: a frase do design, com o que fazer", () => {
+    expect(conferirPublicacao(MAIN, ANTERIOR, "2026-11-20T14:17:30-03:00")).toEqual({
+      ok: false,
+      mensagem:
+        "O site publicado tem os índices de 19/11/2026 22:47; a main tem os de 20/11/2026 10:47 (horário de Brasília). Confira a última publicação no painel do Cloudflare Pages.",
+    });
+  });
+
+  it("site com índices mais novos que a main: também é problema", () => {
+    expect(conferirPublicacao(ANTERIOR, MAIN, "2026-11-20T14:17:30-03:00")).toEqual({
+      ok: false,
+      mensagem:
+        "O site publicado tem índices mais novos (20/11/2026 10:47) que a main (19/11/2026 22:47, horário de Brasília): confira se a main recuou ou se outra versão foi publicada.",
+    });
+  });
+
+  it("a mesma obtenção escrita em outro fuso está em dia", () => {
+    expect(
+      conferirPublicacao(MAIN, versao("2026-11-20T13:47:12Z"), "2026-11-20T14:17:30-03:00").ok,
+    ).toBe(true);
+  });
+});
+
+describe("conferirSitePublicado: lê o versao.json do site e confere (§19.4)", () => {
+  const ENDERECO = "https://apura-dpems.pages.dev";
+  const AGORA = "2026-11-20T14:17:30-03:00";
+
+  function respostas(...lista: Array<Response | Error>) {
+    const pedidos: string[] = [];
+    const esperas: number[] = [];
+    const fazerPedido = ((url: string) => {
+      pedidos.push(url);
+      const proxima = lista.shift();
+      if (proxima === undefined) throw new Error("pedido a mais");
+      return proxima instanceof Error ? Promise.reject(proxima) : Promise.resolve(proxima);
+    }) as unknown as typeof fetch;
+    const dormir = (ms: number) => {
+      esperas.push(ms);
+      return Promise.resolve();
+    };
+    return { pedidos, esperas, opcoes: { fetch: fazerPedido, dormir } };
+  }
+
+  it("lê <endereço>/versao.json uma vez e confere", async () => {
+    const r = respostas(new Response(JSON.stringify(MAIN), { status: 200 }));
+    expect(await conferirSitePublicado(`${ENDERECO}/`, MAIN, AGORA, r.opcoes)).toEqual({
+      ok: true,
+      mensagem:
+        "O site publicado está em dia: índices de 20/11/2026 10:47 (horário de Brasília), os mesmos da main.",
+    });
+    expect(r.pedidos).toEqual([`${ENDERECO}/versao.json`]);
+    expect(r.esperas).toEqual([]);
+  });
+
+  it("falha passageira: tenta de novo, até três vezes, com 10 s de espera", async () => {
+    const semRede = Object.assign(new TypeError("fetch failed"), {
+      cause: { code: "ENOTFOUND" },
+    });
+    const r = respostas(
+      semRede,
+      new Response("erro", { status: 503 }),
+      new Response(JSON.stringify(MAIN), { status: 200 }),
+    );
+    expect((await conferirSitePublicado(ENDERECO, MAIN, AGORA, r.opcoes)).ok).toBe(true);
+    expect(r.pedidos).toHaveLength(3);
+    expect(r.esperas).toEqual([10_000, 10_000]);
+  });
+
+  it("fora do ar nas três tentativas: o motivo da última", async () => {
+    const semRede = Object.assign(new TypeError("fetch failed"), {
+      cause: { code: "ENOTFOUND" },
+    });
+    const r = respostas(semRede, new Response("x", { status: 404 }), semRede);
+    expect(await conferirSitePublicado(ENDERECO, MAIN, AGORA, r.opcoes)).toEqual({
+      ok: false,
+      mensagem: `Não foi possível ler ${ENDERECO}/versao.json depois de 3 tentativas: sem resposta do site: TypeError (ENOTFOUND).`,
+    });
+  });
+
+  it("HTTP de erro na última tentativa: o status", async () => {
+    const r = respostas(
+      new Response("x", { status: 404 }),
+      new Response("x", { status: 404 }),
+      new Response("x", { status: 404 }),
+    );
+    expect((await conferirSitePublicado(ENDERECO, MAIN, AGORA, r.opcoes)).mensagem).toBe(
+      `Não foi possível ler ${ENDERECO}/versao.json depois de 3 tentativas: o site respondeu HTTP 404.`,
+    );
+  });
+
+  it("arquivo fora do formato: não repete", async () => {
+    const r = respostas(new Response("<!doctype html>", { status: 200 }));
+    expect(await conferirSitePublicado(ENDERECO, MAIN, AGORA, r.opcoes)).toEqual({
+      ok: false,
+      mensagem: `O arquivo ${ENDERECO}/versao.json não está no formato esperado (apura/versao-do-site@1).`,
+    });
+    expect(r.pedidos).toHaveLength(1);
+  });
+
+  it("erro sem causa anexada: a mensagem do erro entra no motivo", async () => {
+    const r = respostas(new Error("boom"), new Error("boom"), new Error("boom"));
+    expect((await conferirSitePublicado(ENDERECO, MAIN, AGORA, r.opcoes)).mensagem).toBe(
+      `Não foi possível ler ${ENDERECO}/versao.json depois de 3 tentativas: sem resposta do site: Error (boom).`,
+    );
+  });
+});
diff --git a/src/indices/relogio.test.ts b/src/indices/relogio.test.ts
index c3c50f3..3cb469c 100644
--- a/src/indices/relogio.test.ts
+++ b/src/indices/relogio.test.ts
@@ -6,6 +6,7 @@ import {
   formatarDataHoraBrasilia,
   hojeEmBrasilia,
   compararInstantes,
+  minutosEntre,
 } from "./relogio.ts";
 
 const FORMATO_ISO_COM_DESLOCAMENTO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
@@ -195,3 +196,16 @@ describe("compararInstantes", () => {
     expect(compararInstantes("", "")).toBe(0);
   });
 });
+
+describe("minutosEntre", () => {
+  it("conta os minutos entre dois instantes, em fusos diferentes", () => {
+    expect(minutosEntre("2026-10-11T10:47:00-03:00", "2026-10-11T14:17:00-03:00")).toBe(210);
+    expect(minutosEntre("2026-10-11T13:47:00Z", "2026-10-11T10:57:30-03:00")).toBe(10.5);
+    expect(minutosEntre("2026-10-11T14:17:00-03:00", "2026-10-11T10:47:00-03:00")).toBe(-210);
+  });
+
+  it("texto que não é data-hora com fuso: nulo", () => {
+    expect(minutosEntre("", "2026-10-11T10:47:00-03:00")).toBeNull();
+    expect(minutosEntre("2026-10-11", "2026-10-11T10:47:00-03:00")).toBeNull();
+  });
+});
```

- [ ] **Step 2: Ver falhar.** `npx vitest run`. Esperado (medido na reconstrução): 15 testes falham, e só eles:

  - `conta os minutos entre dois instantes, em fusos diferentes`
  - `texto que não é data-hora com fuso: nulo`
  - `lê o arquivo no formato; recusa o resto`
  - `recusa data que não seja data-hora com fuso (vazia, sem fuso, com quebra de linha)`
  - `em dia: os mesmos índices da main`
  - `main mais nova há menos de 30 minutos: a publicação pode estar em andamento`
  - `site atrasado: a frase do design, com o que fazer`
  - `site com índices mais novos que a main: também é problema`
  - `a mesma obtenção escrita em outro fuso está em dia`
  - `lê <endereço>/versao.json uma vez e confere`
  - `falha passageira: tenta de novo, até três vezes, com 10 s de espera`
  - `fora do ar nas três tentativas: o motivo da última`
  - `HTTP de erro na última tentativa: o status`
  - `arquivo fora do formato: não repete`
  - `erro sem causa anexada: a mensagem do erro entra no motivo`

  com mensagens como:

  - `TypeError: lerVersaoDoSite is not a function`
  - `TypeError: conferirPublicacao is not a function`
  - `TypeError: conferirSitePublicado is not a function`
  - `TypeError: minutosEntre is not a function`

  Resumo: `Test Files  2 failed | 57 passed (59) · Tests  15 failed | 968 passed | 10 skipped (993)`.

- [ ] **Step 3: Aplicar o patch do código** (`$RASCUNHO/t7-codigo.patch`)

```diff
diff --git a/package.json b/package.json
index 4fe81a7..ab9c541 100644
--- a/package.json
+++ b/package.json
@@ -19,7 +19,8 @@
     "format:check": "prettier --check .",
     "verificar": "prettier --check . && eslint . && tsc -b && vitest run",
     "indices:atualizar": "node scripts/atualizar-indices.ts",
-    "indices:relatorio": "node scripts/relatorio-indices.ts"
+    "indices:relatorio": "node scripts/relatorio-indices.ts",
+    "indices:conferir-publicacao": "node scripts/conferir-publicacao.ts"
   },
   "dependencies": {
     "@fontsource/source-sans-3": "5.3.0",
diff --git a/scripts/conferir-publicacao.ts b/scripts/conferir-publicacao.ts
new file mode 100644
index 0000000..4b4edfd
--- /dev/null
+++ b/scripts/conferir-publicacao.ts
@@ -0,0 +1,55 @@
+// Confere se o site publicado tem a cópia dos índices da main (§19.4 do design): lê o versao.json
+// do site e compara a data dos índices com a da pasta dados/indices/. É o primeiro passo de cada
+// rodada da rotina (.github/workflows/atualizar-indices.yml, que passa o endereço em SITE_URL);
+// também serve à mão:
+//   SITE_URL=https://apura-dpems.pages.dev npm run indices:conferir-publicacao
+// Saída: uma frase na saída padrão. Código 0 com o site em dia (ou com a publicação de um commit
+// recente em andamento); 1 com o site atrasado, adiantado, fora do ar ou com o arquivo ilegível.
+// A conferência (rede injetável, tentativas, frases) está em src/indices/publicacao.ts, testada
+// sem rede; aqui ficam só o disco, a variável de ambiente e o console.
+import { readFileSync } from "node:fs";
+import { join } from "node:path";
+import { lerArquivoSerie } from "../src/indices/arquivo-serie.ts";
+import { SERIES_EM_ORDEM_NUMERICA } from "../src/indices/calendario.ts";
+import { conferirSitePublicado, montarVersaoDoSite } from "../src/indices/publicacao.ts";
+import { agoraEmBrasilia } from "../src/indices/relogio.ts";
+
+const RAIZ = join(import.meta.dirname, "..");
+
+/** O que o site deveria ter: a versão do package.json e a data dos índices de dados/indices/. */
+function versaoDaMain() {
+  const pacote = JSON.parse(readFileSync(join(RAIZ, "package.json"), "utf8")) as {
+    version: string;
+  };
+  const arquivos = SERIES_EM_ORDEM_NUMERICA.map((codigo) =>
+    lerArquivoSerie(
+      JSON.parse(readFileSync(join(RAIZ, "dados", "indices", `${codigo}.json`), "utf8")),
+      codigo,
+    ),
+  );
+  return montarVersaoDoSite(pacote.version, arquivos);
+}
+
+async function main(): Promise<number> {
+  const endereco = process.env.SITE_URL ?? "";
+  // https sempre; http só na própria máquina (para conferir um site montado localmente)
+  if (!/^(https:\/\/\S+|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?)$/.test(endereco)) {
+    console.error(
+      "Informe o endereço do site em SITE_URL, com https:// (por exemplo, SITE_URL=https://apura-dpems.pages.dev).",
+    );
+    return 1;
+  }
+  const conferencia = await conferirSitePublicado(endereco, versaoDaMain(), agoraEmBrasilia());
+  console.log(conferencia.mensagem);
+  return conferencia.ok ? 0 : 1;
+}
+
+main().then(
+  (codigo) => {
+    process.exitCode = codigo;
+  },
+  (erro: unknown) => {
+    console.error(erro instanceof Error ? erro.message : String(erro));
+    process.exitCode = 1;
+  },
+);
diff --git a/src/indices/cliente-bcb.ts b/src/indices/cliente-bcb.ts
index c219d8b..4a9b233 100644
--- a/src/indices/cliente-bcb.ts
+++ b/src/indices/cliente-bcb.ts
@@ -163,7 +163,7 @@ type ResultadoDoPedido =
   { ok: true; valores: ValorMensal[] } | { ok: false; motivo: string; repetir: boolean };
 
 /** Nome do que o fetch lançou ("TypeError", "TimeoutError", "AbortError"); texto cru se não tiver nome. */
-function nomeDoErro(erro: unknown): string {
+export function nomeDoErro(erro: unknown): string {
   if (typeof erro === "object" && erro !== null && "name" in erro) {
     const { name } = erro as { name?: unknown };
     if (typeof name === "string" && name !== "") return name;
@@ -172,7 +172,7 @@ function nomeDoErro(erro: unknown): string {
 }
 
 /** " (ECONNRESET)": código (ou, sem ele, a mensagem) da causa que o fetch do Node anexa ao TypeError "fetch failed"; vazio sem causa. */
-function causaDoErro(erro: unknown): string {
+export function causaDoErro(erro: unknown): string {
   if (typeof erro !== "object" || erro === null || !("cause" in erro)) return "";
   const { cause } = erro as { cause?: unknown };
   if (typeof cause !== "object" || cause === null) return "";
diff --git a/src/indices/publicacao.ts b/src/indices/publicacao.ts
index 586501a..daab10b 100644
--- a/src/indices/publicacao.ts
+++ b/src/indices/publicacao.ts
@@ -1,11 +1,17 @@
 import type { ArquivoSerie } from "../compartilhado/tipos.ts";
-import { compararInstantes } from "./relogio.ts";
+import { causaDoErro, nomeDoErro } from "./cliente-bcb.ts";
+import {
+  compararInstantes,
+  dataHoraEmBrasilia,
+  formatarDataHoraBrasilia,
+  minutosEntre,
+} from "./relogio.ts";
 
 /**
  * O arquivo `versao.json` do site publicado (§19.2): a versão do Apura e a data de obtenção mais
  * recente da cópia dos índices (a mesma que o rodapé da tela mostra). A montagem do site o grava
- * (`vite.config.ts`), e a rotina de índices o lê para conferir que o site tem a cópia da `main`.
- * Módulo puro.
+ * (`vite.config.ts`), e a rotina de índices o lê para conferir que o site tem a cópia da `main`
+ * (§19.4). Módulo puro: a rede entra por parâmetro.
  */
 export interface VersaoDoSite {
   formato: "apura/versao-do-site@1";
@@ -27,3 +33,142 @@ export function montarVersaoDoSite(
   }
   return { formato: "apura/versao-do-site@1", versao, indicesAtualizadosEm };
 }
+
+/**
+ * O `versao.json` lido do site, conferido campo a campo (a data, como data-hora ISO com fuso);
+ * nulo se não estiver no formato.
+ */
+export function lerVersaoDoSite(texto: string): VersaoDoSite | null {
+  let dado: unknown;
+  try {
+    dado = JSON.parse(texto);
+  } catch {
+    return null;
+  }
+  if (typeof dado !== "object" || dado === null) return null;
+  const { formato, versao, indicesAtualizadosEm } = dado as Partial<VersaoDoSite>;
+  if (
+    formato !== "apura/versao-do-site@1" ||
+    typeof versao !== "string" ||
+    typeof indicesAtualizadosEm !== "string" ||
+    dataHoraEmBrasilia(indicesAtualizadosEm) === null
+  ) {
+    return null;
+  }
+  return { formato, versao, indicesAtualizadosEm };
+}
+
+export interface ConferenciaDaPublicacao {
+  /** falso quando o site precisa de atenção: a rotina termina com falha (vermelha) */
+  ok: boolean;
+  /** uma frase completa, para a saída da rotina, o resumo e o e-mail do GitHub */
+  mensagem: string;
+}
+
+/** Tempo para a publicação de um commit novo da `main` chegar ao site (a montagem leva minutos). */
+export const TOLERANCIA_DA_PUBLICACAO_MINUTOS = 30;
+
+/**
+ * Compara a data dos índices do site com a da `main` (§19.4): em dia quando são o mesmo instante;
+ * com a `main` mais nova há menos de `TOLERANCIA_DA_PUBLICACAO_MINUTOS`, a publicação pode estar em
+ * andamento; qualquer outra diferença (site atrasado ou adiantado) pede atenção.
+ */
+export function conferirPublicacao(
+  main: VersaoDoSite,
+  site: VersaoDoSite,
+  agora: string,
+): ConferenciaDaPublicacao {
+  const daMain = formatarDataHoraBrasilia(main.indicesAtualizadosEm);
+  const doSite = formatarDataHoraBrasilia(site.indicesAtualizadosEm);
+  const ordem = compararInstantes(site.indicesAtualizadosEm, main.indicesAtualizadosEm);
+  if (ordem === 0) {
+    return {
+      ok: true,
+      mensagem: `O site publicado está em dia: índices de ${daMain} (horário de Brasília), os mesmos da main.`,
+    };
+  }
+  if (ordem > 0) {
+    return {
+      ok: false,
+      mensagem: `O site publicado tem índices mais novos (${doSite}) que a main (${daMain}, horário de Brasília): confira se a main recuou ou se outra versão foi publicada.`,
+    };
+  }
+  const idade = minutosEntre(main.indicesAtualizadosEm, agora);
+  if (idade !== null && idade < TOLERANCIA_DA_PUBLICACAO_MINUTOS) {
+    return {
+      ok: true,
+      mensagem: `A main tem os índices de ${daMain}, gravados há menos de ${TOLERANCIA_DA_PUBLICACAO_MINUTOS} minutos; o site publicado ainda tem os de ${doSite} (horário de Brasília): a publicação pode estar em andamento.`,
+    };
+  }
+  return {
+    ok: false,
+    mensagem: `O site publicado tem os índices de ${doSite}; a main tem os de ${daMain} (horário de Brasília). Confira a última publicação no painel do Cloudflare Pages.`,
+  };
+}
+
+export interface OpcoesDaConferencia {
+  /** Função de rede; padrão `globalThis.fetch`. */
+  fetch?: typeof globalThis.fetch;
+  /** Como esperar entre as tentativas; padrão `setTimeout`. Os testes injetam uma que só registra. */
+  dormir?: (ms: number) => Promise<void>;
+}
+
+const TENTATIVAS = 3;
+const ESPERA_MS = 10_000;
+const TEMPO_LIMITE_MS = 20_000;
+
+/** " (ENOTFOUND)": a causa que o fetch do Node anexa; sem ela, a mensagem do erro, numa linha. */
+function detalheDoErro(erro: unknown): string {
+  const causa = causaDoErro(erro);
+  if (causa !== "") return causa;
+  const mensagem = erro instanceof Error ? erro.message.replace(/\s+/g, " ").trim() : "";
+  return mensagem === "" ? "" : ` (${mensagem})`;
+}
+
+function dormirPadrao(ms: number): Promise<void> {
+  return new Promise((resolver) => setTimeout(resolver, ms));
+}
+
+/**
+ * Lê `<endereço>/versao.json` e confere com a `main` (§19.4). Até três tentativas, com 10 s de
+ * espera, quando o site não responde ou responde com erro; arquivo fora do formato não repete.
+ * Nunca lança: a falha vira a frase de `ConferenciaDaPublicacao`.
+ */
+export async function conferirSitePublicado(
+  endereco: string,
+  main: VersaoDoSite,
+  agora: string,
+  opcoes: OpcoesDaConferencia = {},
+): Promise<ConferenciaDaPublicacao> {
+  const fazerPedido = opcoes.fetch ?? globalThis.fetch;
+  const dormir = opcoes.dormir ?? dormirPadrao;
+  const url = `${endereco.replace(/\/+$/, "")}/versao.json`;
+  let motivo = "";
+  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
+    if (tentativa > 1) await dormir(ESPERA_MS);
+    let texto: string;
+    try {
+      const resposta = await fazerPedido(url, { signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
+      texto = await resposta.text();
+      if (!resposta.ok) {
+        motivo = `o site respondeu HTTP ${resposta.status}`;
+        continue;
+      }
+    } catch (erro) {
+      motivo = `sem resposta do site: ${nomeDoErro(erro)}${detalheDoErro(erro)}`;
+      continue;
+    }
+    const site = lerVersaoDoSite(texto);
+    if (site === null) {
+      return {
+        ok: false,
+        mensagem: `O arquivo ${url} não está no formato esperado (apura/versao-do-site@1).`,
+      };
+    }
+    return conferirPublicacao(main, site, agora);
+  }
+  return {
+    ok: false,
+    mensagem: `Não foi possível ler ${url} depois de ${TENTATIVAS} tentativas: ${motivo}.`,
+  };
+}
diff --git a/src/indices/relogio.ts b/src/indices/relogio.ts
index dfa86a3..8fa00da 100644
--- a/src/indices/relogio.ts
+++ b/src/indices/relogio.ts
@@ -122,6 +122,16 @@ export function compararInstantes(a: string, b: string): number {
   return a < b ? -1 : a > b ? 1 : 0;
 }
 
+/**
+ * Minutos de `antes` até `depois` (negativo se `depois` for anterior), pelos instantes que as duas
+ * datas-hora ISO com fuso designam; nulo se alguma não for data-hora com fuso.
+ */
+export function minutosEntre(antes: string, depois: string): number | null {
+  const a = instanteDe(antes);
+  const b = instanteDe(depois);
+  return a === null || b === null ? null : (b - a) / 60_000;
+}
+
 /**
  * Data ("2026-10-31") e hora ("22:30") em Brasília de qualquer ISO de data-hora com "Z" ou
  * deslocamento; null para texto que não seja ISO válido (ou sem fuso). É a base de quem precisa
```

- [ ] **Step 4: Verificar.** `npm run format && npm run verificar`: verde, sem mudança do `format`; `Tests  983 passed | 10 skipped (993)`, `Test Files  59 passed (59)`. `SITE_URL=http://x npm run --silent indices:conferir-publicacao; echo $?` → a frase "Informe o endereço do site em SITE_URL…" e `1`.

- [ ] **Step 5: Commit:** `indices: conferência da publicação, que compara o versao.json do site com a cópia da main (§19.4)`.

### Task 8: Integração contínua e rotina em etapas

**Files:**
- Modify: `.github/workflows/atualizar-indices.yml`
- Modify: `.github/workflows/relatorio-indices.yml`
- Create: `.github/workflows/testes.yml`
- Test: `scripts/workflows.test.ts`

**Interfaces:**
- Consumes: `npm run verificar`, `npm run build`, `npm run indices:atualizar`, `npm run indices:conferir-publicacao` (Task 7), `npm run indices:relatorio`; o `.node-version` (Task 6); o `case` de rodadas e `RODADAS` (o `scripts/relatorio-indices.test.ts` continua conferindo).
- Produces: `.github/workflows/testes.yml`; `atualizar-indices.yml` com as etapas `baixar` → `gravar` → `fechar`; `relatorio-indices.yml` com `montar` → `gravar`; o teste `scripts/workflows.test.ts`.

§19.3 e §19.4 (a rotina em etapas, decisão de 14/10/2026). As actions ficam fixadas pelo SHA do commit: `actions/checkout` 7.0.1 (`3d3c42e5aac5ba805825da76410c181273ba90b1`), `actions/setup-node` 7.0.0 (`820762786026740c76f36085b0efc47a31fe5020`), `actions/upload-artifact` 7.0.1 (`043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`), `actions/download-artifact` 8.0.1 (`3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c`); conferidos em 14/10/2026 com `gh api repos/<action>/git/matching-refs/tags/<versão>`. As etapas que gravam não instalam nem rodam pacotes (só `actions/checkout` e `actions/download-artifact`, e o git); o token de escrita só aparece nos passos "Gravar na main" (e, no relatório mensal, no que lê as execuções, com token só de leitura); a etapa "gravar" recusa voltar séries que outra rodada já gravou; o deploy hook vem na etapa "fechar", depois do sinal ao Healthchecks, que não depende da conferência da publicação. O `scripts/workflows.test.ts` pega também as formas disfarçadas que as revisões tentaram (`write-all`, `"write"`, `secrets.github_token`, `toJSON(github)`, comentário escondendo uma etapa, `node_modules/.bin`).

- [ ] **Step 1: Aplicar o patch dos testes** (`$RASCUNHO/t8-testes.patch`)

```diff
diff --git a/scripts/workflows.test.ts b/scripts/workflows.test.ts
new file mode 100644
index 0000000..9ce9bbd
--- /dev/null
+++ b/scripts/workflows.test.ts
@@ -0,0 +1,247 @@
+// Regras de segurança dos workflows do GitHub Actions (§19.3 e §19.4 do design), conferidas pela
+// leitura dos arquivos: cada action fixada pelo SHA do commit da versão; checkout sem guardar a
+// credencial; o Node do .node-version, sem cache de pacotes; a credencial de escrita só nos passos
+// que gravam, em etapas (jobs) que não instalam nem rodam pacotes de terceiros; o testes.yml só com
+// leitura; a conferência da publicação antes de baixar as séries. O actionlint (CLAUDE.md) confere
+// a sintaxe; aqui ficam as regras do projeto.
+import { readdirSync, readFileSync } from "node:fs";
+import { describe, expect, it } from "vitest";
+
+const PASTA = new URL("../.github/workflows/", import.meta.url);
+const WORKFLOWS = readdirSync(PASTA)
+  .filter((nome) => nome.endsWith(".yml"))
+  .sort();
+const ler = (nome: string) => readFileSync(new URL(nome, PASTA), "utf8");
+
+/** As etapas (jobs) do workflow, por nome, cada uma com o seu texto. */
+function etapas(texto: string): Map<string, string> {
+  const mapa = new Map<string, string>();
+  const linhas = texto.split("\n");
+  let atual: string | null = null;
+  let dentro = false;
+  for (const linha of linhas) {
+    if (/^jobs:\s*$/.test(linha)) {
+      dentro = true;
+      continue;
+    }
+    if (!dentro || /^\s*(#.*)?$/.test(linha)) continue; // comentários e linhas vazias: de nenhuma etapa
+    if (/^\S/.test(linha)) break;
+    const nome = /^ {2}([\w-]+):\s*$/.exec(linha)?.[1];
+    if (nome !== undefined) {
+      atual = nome;
+      mapa.set(nome, "");
+      continue;
+    }
+    if (atual !== null) mapa.set(atual, `${mapa.get(atual) ?? ""}${linha}\n`);
+  }
+  return mapa;
+}
+
+interface Passo {
+  nome: string;
+  texto: string;
+}
+
+/** Os passos (itens de `steps:`, com 6 espaços antes do "-"), cada um com o seu nome. */
+function passos(texto: string): Passo[] {
+  const lista: Passo[] = [];
+  let atual: Passo | undefined;
+  for (const linha of texto.split("\n")) {
+    if (/^ {6}#/.test(linha)) continue; // comentário entre passos: não é de nenhum
+    if (/^ {6}- /.test(linha)) {
+      atual = { nome: "", texto: "" };
+      lista.push(atual);
+    } else if (/^ {0,5}\S/.test(linha) || /^ {6}\S/.test(linha)) {
+      atual = undefined; // fim da lista de passos (outra chave da etapa, outra etapa)
+    }
+    if (atual === undefined) continue;
+    atual.texto += `${linha}\n`;
+    const nome = /^ {6}(?:- | {2})name: (.+)$/.exec(linha)?.[1];
+    if (nome !== undefined && atual.nome === "") atual.nome = nome.replace(/^"|"$/g, "");
+  }
+  return lista;
+}
+
+/** As expressões `${{ … }}` do texto. */
+const expressoes = (texto: string) => texto.match(/\$\{\{[\s\S]*?\}\}/g) ?? [];
+
+/**
+ * Expressão que alcança a credencial do GitHub, em qualquer grafia (os contextos não diferenciam
+ * maiúsculas): `github.token`, `github['token']`, `secrets.GITHUB_TOKEN`, `toJSON(github)`…
+ */
+const alcancaToken = (e: string) =>
+  /github\s*(\.\s*token|\[)|secrets\s*(\.\s*github_token|\[)|tojson\s*\(\s*(github|secrets)\s*\)/i.test(
+    e,
+  );
+
+/** A única forma aceita de pedir a credencial, e só nos passos permitidos. */
+const TOKEN = "${{ github.token }}";
+const usosDoToken = (texto: string) => expressoes(texto).filter((e) => e === TOKEN).length;
+
+/** Os únicos segredos dos workflows (§19.5): o sinal ao Healthchecks e o deploy hook. */
+const SEGREDOS_PERMITIDOS = new Set([
+  "${{ secrets.HC_URL != '' }}",
+  "${{ secrets.HC_URL }}",
+  "${{ secrets.CF_DEPLOY_HOOK != '' }}",
+  "${{ secrets.CF_DEPLOY_HOOK }}",
+]);
+
+/** A etapa pede alguma permissão de escrita (`contents: write`, `"write"`, `write-all`…). */
+const pedeEscrita = (texto: string) => /\bwrite-all\b|[\w-]+:\s*["']?write\b/.test(texto);
+
+/** A etapa instala ou roda pacotes de terceiros. */
+const rodaPacotes = (texto: string) =>
+  /\b(npm|npx|pnpm|yarn|bun|bunx|node|tsx|deno)\b|node_modules|setup-node/.test(texto);
+
+describe("workflows do GitHub Actions (§19.3, §19.4)", () => {
+  it("são os três previstos, com as etapas previstas", () => {
+    expect(WORKFLOWS).toEqual(["atualizar-indices.yml", "relatorio-indices.yml", "testes.yml"]);
+    expect([...etapas(ler("atualizar-indices.yml")).keys()]).toEqual([
+      "baixar",
+      "gravar",
+      "fechar",
+    ]);
+    expect([...etapas(ler("relatorio-indices.yml")).keys()]).toEqual(["montar", "gravar"]);
+    expect([...etapas(ler("testes.yml")).keys()]).toEqual(["testes"]);
+  });
+
+  it.each(WORKFLOWS)(
+    "%s: toda action fixada pelo SHA do commit, com a versão num comentário",
+    (nome) => {
+      const usos = [...ler(nome).matchAll(/^\s*(?:- )?uses: (.+)$/gm)].map((m) => m[1] ?? "");
+      expect(usos.length).toBeGreaterThan(0);
+      for (const uso of usos) {
+        expect(uso).toMatch(/^[\w-]+\/[\w-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/);
+      }
+    },
+  );
+
+  it.each(WORKFLOWS)("%s: checkout sem guardar a credencial", (nome) => {
+    const checkouts = passos(ler(nome)).filter((p) => p.texto.includes("actions/checkout@"));
+    expect(checkouts.length).toBeGreaterThan(0);
+    for (const passo of checkouts) expect(passo.texto).toContain("persist-credentials: false");
+  });
+
+  it.each(WORKFLOWS)(
+    "%s: Node do .node-version, sem cache de pacotes, permissões declaradas",
+    (nome) => {
+      const texto = ler(nome);
+      expect(texto).toMatch(/^permissions:/m);
+      const setup = passos(texto).filter((p) => p.texto.includes("actions/setup-node@"));
+      expect(setup).toHaveLength(1);
+      expect(setup[0]?.texto).toContain("node-version-file: .node-version");
+      expect(setup[0]?.texto).toContain("package-manager-cache: false");
+      expect(texto).not.toMatch(/node-version: /);
+      expect(texto).not.toMatch(/^\s+cache: /m);
+    },
+  );
+
+  it.each([
+    ["atualizar-indices.yml", [["gravar", "Gravar na main"]]],
+    [
+      "relatorio-indices.yml",
+      [
+        ["montar", "Ler as execuções da rotina"],
+        ["gravar", "Gravar na main"],
+      ],
+    ],
+    ["testes.yml", []],
+  ] as const)(
+    "%s: a credencial só nos passos %j, em nenhum outro lugar do arquivo",
+    (nome, permitidos) => {
+      const texto = ler(nome);
+      let nosPermitidos = 0;
+      for (const [etapa, passo] of permitidos) {
+        const p = passos(etapas(texto).get(etapa) ?? "").find((x) => x.nome === passo);
+        expect(p, `${etapa} › ${passo}`).toBeDefined();
+        expect(usosDoToken(p?.texto ?? "")).toBeGreaterThan(0);
+        nosPermitidos += usosDoToken(p?.texto ?? "");
+      }
+      expect(usosDoToken(texto)).toBe(nosPermitidos);
+      // nenhuma outra forma de alcançar a credencial, e só os segredos previstos
+      for (const e of expressoes(texto)) {
+        if (alcancaToken(e)) expect(e).toBe(TOKEN);
+        if (/secrets/i.test(e)) expect(SEGREDOS_PERMITIDOS.has(e), e).toBe(true);
+      }
+    },
+  );
+
+  it.each(WORKFLOWS)(
+    "%s: o topo não dá escrita; toda etapa declara permissões; etapa com escrita só usa checkout e download-artifact e não roda pacotes",
+    (nome) => {
+      const texto = ler(nome);
+      const topo = texto.slice(0, texto.search(/^jobs:/m));
+      expect(topo).toMatch(/^permissions:/m);
+      expect(pedeEscrita(topo)).toBe(false);
+      for (const [etapa, corpo] of etapas(texto)) {
+        expect(corpo, `etapa ${etapa}`).toMatch(/^ {4}permissions:/m);
+        if (!pedeEscrita(corpo)) continue;
+        expect(rodaPacotes(corpo), `etapa ${etapa}`).toBe(false);
+        for (const uso of corpo.match(/uses: \S+/g) ?? []) {
+          expect(uso, `etapa ${etapa}`).toMatch(/^uses: actions\/(checkout|download-artifact)@/);
+        }
+      }
+    },
+  );
+
+  it("testes.yml: só leitura, a cada envio e pull request, com verificar, build e auditoria", () => {
+    const texto = ler("testes.yml");
+    expect(texto).toMatch(/^on: \[push, pull_request\]$/m);
+    expect(texto).toMatch(/^permissions:\n {2}contents: read$/m);
+    expect(texto).not.toContain("write");
+    const comandos = passos(texto).map((p) => /run: (.+)$/m.exec(p.texto)?.[1]);
+    expect(comandos).toEqual([
+      undefined,
+      undefined,
+      "npm ci",
+      "npm run verificar",
+      "npm run build",
+      "npm audit --audit-level=high",
+      "npm audit signatures",
+    ]);
+  });
+
+  it("atualizar-indices.yml: baixar (só leitura) → gravar (escrita, máquina limpa) → fechar", () => {
+    const texto = ler("atualizar-indices.yml");
+    expect([...etapas(texto).keys()]).toEqual(["baixar", "gravar", "fechar"]);
+    expect(texto).toContain("SITE_URL: https://apura-dpems.pages.dev");
+    const baixar = passos(etapas(texto).get("baixar") ?? "");
+    const nomes = baixar.map((p) => p.nome);
+    expect(nomes.indexOf("Conferir a publicação do site")).toBeGreaterThan(-1);
+    expect(nomes.indexOf("Conferir a publicação do site")).toBeLessThan(
+      nomes.indexOf("Baixar as séries do BCB"),
+    );
+    expect(baixar.find((p) => p.nome === "Conferir a publicação do site")?.texto).toContain(
+      "continue-on-error: true",
+    );
+    const fechar = passos(etapas(texto).get("fechar") ?? "");
+    const passo = (nome: string) => fechar.find((p) => p.nome === nome)?.texto ?? "";
+    expect(etapas(texto).get("fechar")).toContain(
+      "if: always() && needs.baixar.result != 'skipped'",
+    );
+    expect(passo("Desfecho no resumo")).not.toBe("");
+    const sinal = /if: (.+)$/m.exec(passo("Sinal de vida ao Healthchecks"))?.[1] ?? "";
+    expect(sinal).toContain("needs.baixar.outputs.baixar == 'success'");
+    expect(sinal).toContain("github.event_name == 'schedule'");
+    expect(sinal).not.toContain("publicacao");
+    expect(passo("Sinalizar problema nas séries")).toContain(
+      "if: always() && needs.baixar.outputs.baixar == 'failure'",
+    );
+    expect(passo("Sinalizar problema na publicação do site")).toContain(
+      "if: always() && needs.baixar.outputs.publicacao == 'failure'",
+    );
+    expect(passo("Sinalizar problema nas conferências")).toContain(
+      "if: always() && needs.baixar.outputs.conferir == 'failure'",
+    );
+    // o deploy hook vem depois do sinal, e a falha dele não apaga o "gravado"
+    expect(passo("Publicar pelo deploy hook")).toContain("needs.gravar.outputs.commit != ''");
+    expect(fechar.map((p) => p.nome).indexOf("Publicar pelo deploy hook")).toBeGreaterThan(
+      fechar.map((p) => p.nome).indexOf("Sinal de vida ao Healthchecks"),
+    );
+    // a etapa "gravar" não volta séries que outra rodada já gravou (reexecução de etapa)
+    const gravar = passos(etapas(texto).get("gravar") ?? "").find(
+      (p) => p.nome === "Gravar na main",
+    );
+    expect(gravar?.texto).toContain('git diff --quiet "$BASE" HEAD -- dados/indices');
+  });
+});
```

- [ ] **Step 2: Ver falhar.** `npx vitest run`. Esperado (medido na reconstrução): 14 testes falham, e só eles:

  - `são os três previstos, com as etapas previstas`
  - `atualizar-indices.yml: toda action fixada pelo SHA do commit, com a versão num comentário`
  - `relatorio-indices.yml: toda action fixada pelo SHA do commit, com a versão num comentário`
  - `atualizar-indices.yml: checkout sem guardar a credencial`
  - `relatorio-indices.yml: checkout sem guardar a credencial`
  - `atualizar-indices.yml: Node do .node-version, sem cache de pacotes, permissões declaradas`
  - `relatorio-indices.yml: Node do .node-version, sem cache de pacotes, permissões declaradas`
  - `atualizar-indices.yml: a credencial só nos passos [["gravar","Gravar na main"]], em nenhum outro lugar do arquivo`
  - `relatorio-indices.yml: a credencial só nos passos [["montar","Ler as execuções da rotina"],["gravar","Gravar na main"]], em nenhum outro lugar do arquivo`
  - `testes.yml: a credencial só nos passos [], em nenhum outro lugar do arquivo`
  - `atualizar-indices.yml: o topo não dá escrita; toda etapa declara permissões; etapa com escrita só usa checkout e download-artifact e não roda pacotes`
  - `relatorio-indices.yml: o topo não dá escrita; toda etapa declara permissões; etapa com escrita só usa checkout e download-artifact e não roda pacotes`
  - `testes.yml: só leitura, a cada envio e pull request, com verificar, build e auditoria`
  - `atualizar-indices.yml: baixar (só leitura) → gravar (escrita, máquina limpa) → fechar`

  com mensagens como:

  - `AssertionError: expected [ 'atualizar-indices.yml', …(1) ] to deeply equal [ 'atualizar-indices.yml', …(2) ]`
  - `AssertionError: expected 'actions/checkout@v6' to match /…/[\w-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$`
  - `AssertionError: expected '      - uses: actions/checkout@v6\n  …' to contain 'persist-credentials: false'`
  - `AssertionError: expected '      - uses: actions/setup-node@v6\n…' to contain 'node-version-file: .node-version'`
  - `AssertionError: gravar › Gravar na main: expected undefined to be defined`
  - `AssertionError: montar › Ler as execuções da rotina: expected undefined to be defined`

  Resumo: `Test Files  1 failed | 59 passed (60) · Tests  14 failed | 983 passed | 10 skipped (1007)`.

- [ ] **Step 3: Aplicar o patch do código** (`$RASCUNHO/t8-codigo.patch`)

```diff
diff --git a/.github/workflows/atualizar-indices.yml b/.github/workflows/atualizar-indices.yml
index e96eceb..4a1f2c8 100644
--- a/.github/workflows/atualizar-indices.yml
+++ b/.github/workflows/atualizar-indices.yml
@@ -1,10 +1,20 @@
-# Rotina central de índices (fase 4, decisão de 12/10/2026).
+# Rotina central de índices (fase 4, decisão de 12/10/2026; segurança e conferência da publicação
+# na fase 7, §19.4 do design).
 #
-# O que faz: baixa as seis séries do BCB com o mesmo script usado à mão (npm run
-# indices:atualizar), grava série por série as que vieram boas e mudaram (uma série com problema não
-# impede as outras), confere formatação, lint, tipos e testes e, se algum arquivo de dados/ mudou,
-# grava na main com um commit que traz a rodada, a saída do script e o endereço desta execução. O
-# app não consulta o BCB: lê só a cópia publicada em dados/indices/.
+# O que faz, em três etapas (jobs):
+# 1. "baixar", sem poder de gravação: confere se o site publicado tem a cópia de índices da main;
+#    baixa as seis séries do BCB com o mesmo script usado à mão (npm run indices:atualizar), que
+#    grava série por série as que vieram boas e mudaram (uma série com problema não impede as
+#    outras); confere formatação, lint, tipos e testes; e entrega os arquivos de dados/indices/ à
+#    etapa seguinte.
+# 2. "gravar", numa máquina limpa, sem instalar nem rodar pacotes de terceiros (só o git): se
+#    algum arquivo mudou e as conferências passaram, grava na main com um commit que traz a
+#    rodada, a saída do script e o endereço desta execução. Se outra gravação dos índices entrou
+#    na main depois do início da rodada (por exemplo, numa reexecução só desta etapa), não grava,
+#    para não voltar séries mais novas.
+# 3. "fechar": completa o resumo com o desfecho, manda o sinal de vida ao Healthchecks, aciona o
+#    deploy hook (se houver) e devolve as falhas (séries, conferências ou publicação do site).
+# O app não consulta o BCB: lê só a cópia publicada em dados/indices/.
 #
 # Quando roda: de segunda a sexta às 10h47, 14h17 e 22h47 de Brasília (três agendamentos, cada um
 # com o fuso America/Sao_Paulo) e à mão, em "Actions" (workflow_dispatch). O título de cada
@@ -12,22 +22,28 @@
 # Ao mudar um horário, mude também o case do passo Baixar e RODADAS em src/indices/relatorio.ts
 # (scripts/relatorio-indices.test.ts confere).
 #
-# Monitoramento: cada execução deixa um resumo com a saída do script; problema numa série faz a
-# execução terminar com falha (vermelha no GitHub); nas execuções agendadas sem problema, um sinal de vida vai
-# ao Healthchecks.io (só se o segredo HC_URL existir), que avisa quando os sinais param. Uma falha
-# nas conferências ou na gravação também suprime o sinal; a do deploy hook, que vem depois, não.
+# Monitoramento: cada execução deixa um resumo com a conferência da publicação, a saída do script
+# e o desfecho; problema numa série ou na publicação do site faz a execução terminar com falha
+# (vermelha no GitHub, com e-mail); nas execuções agendadas sem problema nas séries, um sinal de
+# vida vai ao Healthchecks.io (só se o segredo HC_URL existir), que avisa quando os sinais param.
+# Uma falha nas conferências ou na gravação também suprime o sinal; a da publicação do site e a do
+# deploy hook, não.
 #
-# Só grava a partir da main: disparado à mão em outro ramo, o job não roda. O checkout pega sempre
-# a ponta da main, para que uma reexecução ou uma execução que esperou na fila não parta de um
-# commit antigo (o rebase entraria em conflito com a gravação anterior).
+# Segurança (§19.4): actions fixadas pelo SHA do commit da versão; o checkout não guarda a
+# credencial; a etapa que instala pacotes e roda os testes só lê o repositório, e o token de
+# escrita só entra no passo "Gravar na main", numa máquina que nunca rodou código de terceiros
+# (nada que um pacote adulterado deixasse para trás alcança o token); a instalação não roda
+# programas de pacote (.npmrc); sem cache de pacotes, como recomenda o setup-node para workflows
+# que gravam. scripts/workflows.test.ts confere essas regras; o actionlint, a sintaxe (CLAUDE.md).
 #
-# Só pode ser executado e testado quando o repositório estiver no GitHub (fase 7): até lá, é apenas
-# conferido por leitura e pelo Prettier.
+# Só grava a partir da main: disparado à mão em outro ramo, nada roda. O checkout pega sempre a
+# ponta da main, para que uma execução que esperou na fila não parta de um commit antigo; a etapa
+# "gravar" confere que nenhuma gravação dos índices entrou depois do ponto de partida da rodada.
 #
-# Atenção: o commit feito com o GITHUB_TOKEN não dispara outros workflows; a publicação do site
-# reage pela integração Git do Cloudflare Pages ou pelo deploy hook (só se o segredo CF_DEPLOY_HOOK
-# existir). E a main recebe commits deste robô quase todo dia útil: atualize a sua cópia (git pull)
-# antes de enviar alterações.
+# Atenção: o commit feito com o token padrão do GitHub não dispara outros workflows; a publicação
+# do site reage pela integração Git do Cloudflare Pages ou pelo deploy hook (só se o segredo
+# CF_DEPLOY_HOOK existir). E a main recebe commits deste robô quase todo dia útil: atualize a sua
+# cópia (git pull) antes de enviar alterações.
 name: Atualizar índices do BCB
 run-name: "Atualizar índices · ${{ github.event_name == 'schedule' && github.event.schedule || 'manual' }}"
 
@@ -41,38 +57,57 @@ on:
       timezone: "America/Sao_Paulo"
   workflow_dispatch:
 
-permissions:
-  contents: write
+permissions: {}
 
 concurrency:
   group: atualizar-indices
   cancel-in-progress: false
 
 jobs:
-  atualizar:
+  baixar:
     if: github.ref == 'refs/heads/main'
     runs-on: ubuntu-latest
     timeout-minutes: 15
-    # Os segredos só entram nos passos que os usam; aqui ficam apenas os indicadores de que existem.
+    permissions:
+      contents: read
     env:
-      TEM_HC: ${{ secrets.HC_URL != '' }}
-      TEM_CF: ${{ secrets.CF_DEPLOY_HOOK != '' }}
       AGENDAMENTO: ${{ github.event.schedule }}
+      SITE_URL: https://apura-dpems.pages.dev
+    outputs:
+      base: ${{ steps.baixar.outputs.base }}
+      rodada: ${{ steps.baixar.outputs.rodada }}
+      baixar: ${{ steps.baixar.outcome }}
+      publicacao: ${{ steps.publicacao.outcome }}
+      mensagem-publicacao: ${{ steps.publicacao.outputs.mensagem }}
+      houve: ${{ steps.mudancas.outputs.houve }}
+      conferir: ${{ steps.conferir.outcome }}
     steps:
-      - uses: actions/checkout@v6
+      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
         with:
           ref: main
+          persist-credentials: false
 
-      - uses: actions/setup-node@v6
+      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
         with:
-          node-version: 22
-          cache: npm
+          node-version-file: .node-version
+          package-manager-cache: false
 
+      # Sem programas de pacote na instalação, e Node fora do engines para a instalação (.npmrc).
       - run: npm ci
 
+      # Antes de baixar: o site deve ter os índices que a rodada anterior gravou (§19.4). Uma falha
+      # aqui não impede a rodada; a etapa "fechar" devolve a falha, com a frase (numa linha só).
+      - name: Conferir a publicação do site
+        id: publicacao
+        continue-on-error: true
+        shell: bash
+        run: |
+          trap 'echo "mensagem=$(tr "\n" " " < "$RUNNER_TEMP/publicacao.txt" | head -c 500)" >> "$GITHUB_OUTPUT"' EXIT
+          npm run --silent indices:conferir-publicacao 2>&1 | tee "$RUNNER_TEMP/publicacao.txt"
+
       # Com "shell: bash", o GitHub usa "set -eo pipefail": o código de saída do script atravessa o
-      # tee. "continue-on-error" deixa a execução seguir para gravar as séries boas; o último passo
-      # devolve a falha.
+      # tee. "continue-on-error" deixa a execução seguir para gravar as séries boas; a etapa
+      # "fechar" devolve a falha.
       - name: Baixar as séries do BCB
         id: baixar
         continue-on-error: true
@@ -86,6 +121,8 @@ jobs:
             *) RODADA="$AGENDAMENTO" ;;
           esac
           echo "RODADA=$RODADA" >> "$GITHUB_ENV"
+          echo "rodada=$RODADA" >> "$GITHUB_OUTPUT"
+          echo "base=$(git rev-parse HEAD)" >> "$GITHUB_OUTPUT"
           npm run --silent indices:atualizar 2>&1 | tee "$RUNNER_TEMP/saida.txt"
 
       - name: Resumo da execução
@@ -95,6 +132,10 @@ jobs:
           {
             echo "## Atualização dos índices do BCB · rodada ${RODADA:-não identificada}"
             echo
+            if [ -f "$RUNNER_TEMP/publicacao.txt" ]; then
+              echo "**Publicação do site:** $(cat "$RUNNER_TEMP/publicacao.txt")"
+              echo
+            fi
             if [ -f "$RUNNER_TEMP/saida.txt" ]; then
               echo '```'
               cat "$RUNNER_TEMP/saida.txt"
@@ -116,53 +157,173 @@ jobs:
             git status --short -- dados
           fi
 
+      # "continue-on-error": a etapa "fechar" diz que as conferências falharam e devolve a falha.
       - name: Conferir formatação, lint, tipos e testes
+        id: conferir
         if: steps.mudancas.outputs.houve == 'true'
+        continue-on-error: true
         run: npm run verificar
 
-      # TZ: a data do commit (e a da reaplicação pelo rebase) fica no horário de Brasília.
+      # Para a etapa "gravar": as séries (dados/indices/*.json) e a saída do script, que vai no
+      # commit.
+      - name: Separar os arquivos para a gravação
+        if: steps.conferir.outcome == 'success'
+        shell: bash
+        run: |
+          mkdir -p "$RUNNER_TEMP/transporte/indices"
+          cp dados/indices/*.json "$RUNNER_TEMP/transporte/indices/"
+          cp "$RUNNER_TEMP/saida.txt" "$RUNNER_TEMP/transporte/saida.txt"
+
+      - name: Entregar os arquivos à etapa de gravação
+        if: steps.conferir.outcome == 'success'
+        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
+        with:
+          name: indices
+          path: ${{ runner.temp }}/transporte
+          if-no-files-found: error
+          retention-days: 1
+
+  gravar:
+    needs: baixar
+    if: needs.baixar.outputs.houve == 'true' && needs.baixar.outputs.conferir == 'success'
+    runs-on: ubuntu-latest
+    timeout-minutes: 10
+    permissions:
+      contents: write
+    outputs:
+      commit: ${{ steps.gravar.outputs.commit }}
+    steps:
+      # Histórico completo, para comparar com o ponto de partida da rodada.
+      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
+        with:
+          ref: main
+          fetch-depth: 0
+          persist-credentials: false
+
+      - name: Receber os arquivos da etapa "baixar"
+        uses: actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8.0.1
+        with:
+          name: indices
+          path: ${{ runner.temp }}/transporte
+
+      # Só arquivos <código>.json, conferidos como JSON (o jq vem na máquina do GitHub). TZ: a data
+      # do commit (e a da reaplicação pelo rebase) fica no horário de Brasília. O token de escrita
+      # entra só aqui, no endereço do remoto, e sai dele ao fim do passo (trap).
       - name: Gravar na main
         id: gravar
-        if: steps.mudancas.outputs.houve == 'true'
         shell: bash
         env:
           TZ: America/Sao_Paulo
+          GH_TOKEN: ${{ github.token }}
+          RODADA: ${{ needs.baixar.outputs.rodada }}
+          BASE: ${{ needs.baixar.outputs.base }}
         run: |
+          trap 'git remote set-url origin "https://github.com/$GITHUB_REPOSITORY.git"' EXIT
+          if ! [[ "$BASE" =~ ^[0-9a-f]{40}$ ]]; then
+            echo "::error::A etapa \"baixar\" não informou o ponto de partida da rodada; nada foi gravado."
+            exit 1
+          fi
+          if ! git diff --quiet "$BASE" HEAD -- dados/indices; then
+            echo "::error::Outra gravação dos índices entrou na main depois do início desta rodada; nada foi gravado, para não voltar séries mais novas. Rode a rotina de novo."
+            exit 1
+          fi
+          for arquivo in "$RUNNER_TEMP/transporte/indices/"*; do
+            nome="$(basename "$arquivo")"
+            if ! [[ "$nome" =~ ^[0-9]+\.json$ ]]; then
+              echo "::error::Arquivo inesperado entre as séries: $nome."
+              exit 1
+            fi
+            jq empty "$arquivo"
+            cp "$arquivo" "dados/indices/$nome"
+          done
+          git remote set-url origin "https://x-access-token:$GH_TOKEN@github.com/$GITHUB_REPOSITORY.git"
           git config user.name "github-actions[bot]"
           git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
           MENSAGEM="$RUNNER_TEMP/mensagem.txt"
           {
             echo "indices: séries do BCB em $(TZ=America/Sao_Paulo date '+%d/%m/%Y %H:%M') (rodada $RODADA)"
             echo
-            cat "$RUNNER_TEMP/saida.txt"
+            cat "$RUNNER_TEMP/transporte/saida.txt"
             echo
             echo "Execução: $GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID"
           } > "$MENSAGEM"
-          git add dados
+          git add dados/indices
           git commit -F "$MENSAGEM"
           # Outro envio pode entrar entre o pull e o push: tenta de novo, até três vezes.
           for tentativa in 1 2 3; do
-            if git pull --rebase origin main && git push origin HEAD:main; then exit 0; fi
+            if git pull --rebase origin main && git push origin HEAD:main; then
+              echo "commit=$(git rev-parse --short HEAD)" >> "$GITHUB_OUTPUT"
+              exit 0
+            fi
             git rebase --abort 2>/dev/null || true
             sleep $((tentativa * 10))
           done
           echo "::error::Não foi possível gravar na main depois de 3 tentativas."
           exit 1
 
+  fechar:
+    needs: [baixar, gravar]
+    if: always() && needs.baixar.result != 'skipped'
+    runs-on: ubuntu-latest
+    timeout-minutes: 5
+    permissions: {}
+    env:
+      TEM_HC: ${{ secrets.HC_URL != '' }}
+      TEM_CF: ${{ secrets.CF_DEPLOY_HOOK != '' }}
+    steps:
+      # O desfecho completa o resumo da etapa "baixar" (escrito antes das conferências e da
+      # gravação).
+      - name: Desfecho no resumo
+        shell: bash
+        env:
+          ETAPA_BAIXAR: ${{ needs.baixar.result }}
+          MUDOU: ${{ needs.baixar.outputs.houve }}
+          CONFERIR: ${{ needs.baixar.outputs.conferir }}
+          COMMIT: ${{ needs.gravar.outputs.commit }}
+        run: |
+          if [ "$ETAPA_BAIXAR" != "success" ]; then
+            DESFECHO="Nada foi gravado: a execução parou antes (veja a etapa \"baixar\")."
+          elif [ "$MUDOU" = "false" ]; then
+            DESFECHO="Nenhum arquivo de dados/ mudou; nada foi gravado."
+          elif [ "$CONFERIR" = "failure" ]; then
+            DESFECHO="Nada foi gravado: as conferências falharam (veja o passo \"Conferir formatação, lint, tipos e testes\")."
+          elif [ -n "$COMMIT" ]; then
+            DESFECHO="Gravado na main: $COMMIT."
+          else
+            DESFECHO="Nada foi gravado: o envio à main falhou (veja a etapa \"gravar\")."
+          fi
+          echo "**Desfecho:** $DESFECHO" >> "$GITHUB_STEP_SUMMARY"
+          echo "$DESFECHO"
+
       - name: Sinal de vida ao Healthchecks
-        if: steps.baixar.outcome == 'success' && github.event_name == 'schedule' && env.TEM_HC == 'true'
+        if: needs.baixar.result == 'success' && needs.baixar.outputs.baixar == 'success' && needs.baixar.outputs.conferir != 'failure' && needs.gravar.result != 'failure' && github.event_name == 'schedule' && env.TEM_HC == 'true'
         env:
           HC_URL: ${{ secrets.HC_URL }}
         run: curl -fsS -m 10 --retry 5 "$HC_URL" || true
 
+      # Depois do sinal: uma falha aqui deixa a execução vermelha, mas não apaga o "gravado".
       - name: Publicar pelo deploy hook
-        if: steps.gravar.outcome == 'success' && env.TEM_CF == 'true'
+        if: needs.gravar.outputs.commit != '' && env.TEM_CF == 'true'
         env:
           CF_DEPLOY_HOOK: ${{ secrets.CF_DEPLOY_HOOK }}
         run: curl -fsS -m 30 --retry 3 --retry-all-errors -X POST "$CF_DEPLOY_HOOK"
 
       - name: Sinalizar problema nas séries
-        if: steps.baixar.outcome == 'failure'
+        if: always() && needs.baixar.outputs.baixar == 'failure'
         run: |
           echo "::error::Alguma série do BCB não foi atualizada (veja o resumo da execução e a saída do passo \"Baixar as séries do BCB\"); as demais, se mudaram, foram gravadas."
           exit 1
+
+      - name: Sinalizar problema nas conferências
+        if: always() && needs.baixar.outputs.conferir == 'failure'
+        run: |
+          echo "::error::As conferências (formatação, lint, tipos e testes) falharam com as séries novas; nada foi gravado (veja o passo \"Conferir formatação, lint, tipos e testes\" da etapa \"baixar\")."
+          exit 1
+
+      - name: Sinalizar problema na publicação do site
+        if: always() && needs.baixar.outputs.publicacao == 'failure'
+        env:
+          MENSAGEM: ${{ needs.baixar.outputs.mensagem-publicacao }}
+        run: |
+          echo "::error::${MENSAGEM:-A conferência da publicação do site falhou; veja o passo \"Conferir a publicação do site\".}"
+          exit 1
diff --git a/.github/workflows/relatorio-indices.yml b/.github/workflows/relatorio-indices.yml
index fc927a2..ca75d0a 100644
--- a/.github/workflows/relatorio-indices.yml
+++ b/.github/workflows/relatorio-indices.yml
@@ -2,11 +2,14 @@
 # de Brasília, lê pela API do GitHub as execuções do workflow "Atualizar índices do BCB" do mês
 # anterior, junta os commits da rotina em dados/indices (git log, por isso o histórico completo) e
 # grava o relatório em docs/monitoramento/AAAA-MM.md, sem e-mail. Também pode ser disparado à mão em
-# "Actions", com um mês opcional (AAAA-MM, já encerrado; vazio = mês anterior). Só pode ser
-# executado e testado quando o repositório estiver no GitHub (fase 7): até lá, é só conferido por
-# leitura.
+# "Actions", com um mês opcional (AAAA-MM, já encerrado; vazio = mês anterior).
 # O commit começa com "[CF-Pages-Skip]" para o Cloudflare Pages não publicar o site por causa dele;
 # a pasta docs/ é ignorada pelo Prettier, por isso não há "npm run verificar" antes de gravar.
+# Segurança (§19.4 do design), como em atualizar-indices.yml: duas etapas (jobs). "montar", sem
+# poder de gravação (o token só lê as execuções), instala os pacotes e monta o relatório; "gravar",
+# numa máquina limpa, sem instalar nem rodar pacotes de terceiros, recebe o arquivo e grava na main,
+# com o token de escrita só no passo de gravação. Actions fixadas pelo SHA do commit da versão; o
+# checkout não guarda a credencial; instalação sem programas de pacote e sem cache.
 name: Relatório da rotina de índices
 
 on:
@@ -20,30 +23,36 @@ on:
         required: false
         type: string
 
-permissions:
-  actions: read
-  contents: write
+permissions: {}
 
 jobs:
-  relatorio:
+  montar:
     # Só a partir da main, e sempre a ponta dela (histórico completo para o git log).
     if: github.ref == 'refs/heads/main'
     runs-on: ubuntu-latest
     timeout-minutes: 10
+    permissions:
+      actions: read
+      contents: read
+    outputs:
+      mes: ${{ steps.mes.outputs.mes }}
     steps:
-      - uses: actions/checkout@v6
+      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
         with:
           ref: main
           fetch-depth: 0
+          persist-credentials: false
 
-      - uses: actions/setup-node@v6
+      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
         with:
-          node-version: 22
-          cache: npm
+          node-version-file: .node-version
+          package-manager-cache: false
 
+      # Sem programas de pacote na instalação, e Node fora do engines para a instalação (.npmrc).
       - run: npm ci
 
       - name: Escolher o mês
+        id: mes
         shell: bash
         env:
           MES_PEDIDO: ${{ inputs.mes }}
@@ -64,8 +73,10 @@ jobs:
             exit 1
           fi
           echo "MES=$MES" >> "$GITHUB_ENV"
+          echo "mes=$MES" >> "$GITHUB_OUTPUT"
           echo "Relatório de $MES."
 
+      # O token desta etapa só lê (actions: read, contents: read).
       - name: Ler as execuções da rotina
         shell: bash
         env:
@@ -80,14 +91,53 @@ jobs:
       - name: Montar o relatório
         run: npm run --silent indices:relatorio -- "$MES" "$RUNNER_TEMP/execucoes.json"
 
+      - name: Entregar o relatório à etapa de gravação
+        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
+        with:
+          name: relatorio
+          path: docs/monitoramento/${{ steps.mes.outputs.mes }}.md
+          if-no-files-found: error
+          retention-days: 1
+
+  gravar:
+    needs: montar
+    runs-on: ubuntu-latest
+    timeout-minutes: 10
+    permissions:
+      contents: write
+    steps:
+      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
+        with:
+          ref: main
+          persist-credentials: false
+
+      - name: Receber o relatório da etapa "montar"
+        uses: actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8.0.1
+        with:
+          name: relatorio
+          path: ${{ runner.temp }}/transporte
+
+      # Só o arquivo AAAA-MM.md do mês pedido. O token de escrita entra só aqui, no endereço do
+      # remoto, e sai dele ao fim do passo (trap).
       - name: Gravar na main
         shell: bash
+        env:
+          GH_TOKEN: ${{ github.token }}
+          MES: ${{ needs.montar.outputs.mes }}
         run: |
+          trap 'git remote set-url origin "https://github.com/$GITHUB_REPOSITORY.git"' EXIT
+          if ! [[ "$MES" =~ ^[0-9]{4}-(0[1-9]|1[0-2])$ ]] || [ ! -f "$RUNNER_TEMP/transporte/$MES.md" ]; then
+            echo "::error::O relatório do mês ($MES) não chegou da etapa \"montar\"."
+            exit 1
+          fi
+          mkdir -p docs/monitoramento
+          cp "$RUNNER_TEMP/transporte/$MES.md" "docs/monitoramento/$MES.md"
           git add docs/monitoramento
           if git diff --cached --quiet; then
             echo "O relatório de $MES não mudou; nada a gravar."
             exit 0
           fi
+          git remote set-url origin "https://x-access-token:$GH_TOKEN@github.com/$GITHUB_REPOSITORY.git"
           git config user.name "github-actions[bot]"
           git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
           git commit -m "[CF-Pages-Skip] monitoramento: relatório da rotina de índices de $MES"
diff --git a/.github/workflows/testes.yml b/.github/workflows/testes.yml
new file mode 100644
index 0000000..ab4fda2
--- /dev/null
+++ b/.github/workflows/testes.yml
@@ -0,0 +1,49 @@
+# Integração contínua (§19.3 do design): a cada envio, em qualquer branch, e a cada pull request,
+# confere formatação, lint, tipos e testes (npm run verificar), monta o site e audita as
+# dependências (vulnerabilidades conhecidas e assinaturas de origem dos pacotes). Só lê o
+# repositório. Os commits do robô dos índices não o disparam (são feitos com o token padrão do
+# GitHub), e a rotina já roda as mesmas conferências antes de gravar.
+#
+# As actions ficam fixadas pelo SHA do commit da versão (comentário ao lado); para trocar de versão,
+# use uma publicada há pelo menos 14 dias (§19.6) e confira com o actionlint (CLAUDE.md).
+name: Testes
+
+on: [push, pull_request]
+
+permissions:
+  contents: read
+
+concurrency:
+  group: testes-${{ github.ref }}
+  cancel-in-progress: true
+
+jobs:
+  testes:
+    runs-on: ubuntu-latest
+    timeout-minutes: 15
+    permissions:
+      contents: read
+    steps:
+      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
+        with:
+          persist-credentials: false
+
+      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
+        with:
+          node-version-file: .node-version
+          package-manager-cache: false
+
+      # Sem programas de pacote na instalação, e Node fora do engines para a instalação (.npmrc).
+      - run: npm ci
+
+      - name: Conferir formatação, lint, tipos e testes
+        run: npm run verificar
+
+      - name: Montar o site
+        run: npm run build
+
+      - name: Auditar as dependências
+        run: npm audit --audit-level=high
+
+      - name: Conferir as assinaturas dos pacotes
+        run: npm audit signatures
```

- [ ] **Step 4: Verificar.** `npm run format && npm run verificar`: verde, sem mudança do `format`; `Tests  1001 passed | 10 skipped (1011)`, `Test Files  60 passed (60)`. `actionlint .github/workflows/*.yml`: nenhuma saída.

- [ ] **Step 5: Commit:** `ci: testes.yml e rotina em etapas (baixar sem escrita, gravar em máquina limpa), com a conferência da publicação e testes de leitura (§19.3, §19.4)`.

### Task 9: Conferência local: actionlint e o site montado com os cabeçalhos

**Files:** nenhum, salvo ajuste que a conferência exigir (relatado e commitado como "site: …" ou "ci: …", com `npm run verificar` verde e o teste que pega o defeito).

Os testes não rodam os workflows nem um navegador com a política de conteúdo: esta tarefa confere os dois na máquina, antes de qualquer coisa ir para fora.

- [ ] **Step 1: actionlint.** `actionlint .github/workflows/*.yml` (instalado pelo Homebrew; se faltar, `brew install actionlint`, com o "sim" do responsável): nenhuma saída, código 0.
- [ ] **Step 2: Montar.** `npm run build`: `dist/` com `_headers`, `tema.js`, `versao.json` (com `"versao": "0.1.0"` e a data mais recente de `dados/indices/`) e `index.html` só com `<script src="/tema.js">` e o `<script type="module" … src="/assets/…">`.
- [ ] **Step 3: Servir com os cabeçalhos.** Salvar fora do repositório (pasta de rascunho, por heredoc) o servidor abaixo e rodá-lo em segundo plano com `node "$RASCUNHO/servidor-com-cabecalhos.mjs" dist 4173`. `curl -sSI http://localhost:4173/` mostra os seis cabeçalhos do `_headers`.

```js
// Servidor estático de conferência: serve dist/ aplicando o bloco "/*" do dist/_headers, como o
// Cloudflare Pages. Uso: node servidor-com-cabecalhos.mjs <pasta-dist> <porta>
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, normalize } from "node:path";

const [pasta, porta = "4173"] = process.argv.slice(2);
const tipos = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".woff2": "font/woff2", ".woff": "font/woff", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
const cabecalhos = {};
const linhas = readFileSync(join(pasta, "_headers"), "utf8").split("\n");
const inicio = linhas.findIndex((l) => l.trim() === "/*");
for (const l of linhas.slice(inicio + 1)) {
  if (!/^\s+\S/.test(l)) break;
  const i = l.indexOf(":");
  cabecalhos[l.slice(0, i).trim()] = l.slice(i + 1).trim();
}
createServer((req, res) => {
  const caminho = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  let arquivo = join(pasta, caminho);
  if (!existsSync(arquivo) || statSync(arquivo).isDirectory()) arquivo = join(pasta, "index.html");
  for (const [k, v] of Object.entries(cabecalhos)) res.setHeader(k, v);
  res.setHeader("Content-Type", tipos[extname(arquivo)] ?? "application/octet-stream");
  res.end(readFileSync(arquivo));
}).listen(Number(porta), "127.0.0.1", () => console.log(`servindo ${pasta} em http://localhost:${porta}`));
```

- [ ] **Step 4: Usar no navegador integrado** (`http://localhost:4173`), com a escuta de violações instalada pelo console da página (`document.addEventListener("securitypolicyviolation", e => (window.__violacoes ??= []).push(e.violatedDirective + " " + e.blockedURI))`): fontes Ubuntu e Source Sans 3 carregadas (`document.fonts`), logo da barra; valor fixo de 1.000,00 e lote de 05/01/2024 a 05/09/2026; "Salvar" (o arquivo `apura-<data>.json` é oferecido); "Tema" (claro/escuro); "Relatório / PDF" (logo do relatório, fontes 600 e 700, rodapé "Gerado com Apura v0.1.0"); recarregar a página (o tema escolhido volta antes do app, pelo `tema.js`). `window.__violacoes` continua vazio e o console sem erros. Conferência de que a política vale: um `<script>` embutido criado pelo console não roda, e um `fetch` ao `api.bcb.gov.br` pela página é bloqueado (`connect-src`).
- [ ] **Step 5: Conferência da publicação contra o site local.** `SITE_URL=http://localhost:4173 npm run --silent indices:conferir-publicacao` → "O site publicado está em dia: índices de … (horário de Brasília), os mesmos da main." e código 0. Parar o servidor.

### Task 10: Integração na `main` local, criação do repositório, envio e workflows desligados

**Files:** nenhum no código. **Quem faz:** o Claude, com o "sim" do responsável antes de cada ação marcada com ⚑.

`$RAIZ` é a pasta principal do repositório (a que tem a `main`): `git rev-parse --path-format=absolute --git-common-dir` menos o `/.git` final.

- [ ] **Step 1: Conferir a branch.** Na branch da fase: `npm run verificar` verde com a contagem da Task 8; `npm run build`; `actionlint .github/workflows/*.yml` sem saída.
- [ ] **Step 2 ⚑: Merge na `main` local.** `git -C "$RAIZ" merge --no-ff <branch da fase> -m "Merge da fase 7: publicação (código)"`; em `$RAIZ`: `npm run verificar` verde e `npm run build`.
- [ ] **Step 3 ⚑: Criar o repositório privado.** `gh repo create plsleite/apura --private --description "Apura — Sistema de Cálculos Judiciais da DPE-MS" --source "$RAIZ" --remote origin` (sem `--push`). Conferir: `gh repo view plsleite/apura --json visibility,defaultBranchRef` → `"visibility":"PRIVATE"`.
- [ ] **Step 4 ⚑: Enviar a `main`.** `git -C "$RAIZ" push -u origin main`. De preferência longe dos horários da rotina (10h47, 14h17, 22h47): uma rodada agendada antes do passo 5 só daria uma execução vermelha à toa (o site ainda não existe).
- [ ] **Step 5 ⚑: Desligar os dois workflows agendados** até o site existir (§19.8): `gh workflow disable atualizar-indices.yml -R plsleite/apura` e `gh workflow disable relatorio-indices.yml -R plsleite/apura`; `gh workflow list -R plsleite/apura --all` mostra os dois "disabled_manually" e "Testes" ativo.
- [ ] **Step 6: Primeira integração contínua.** `gh run list -R plsleite/apura --workflow testes.yml --limit 1` e `gh run watch <id> -R plsleite/apura --exit-status`: verde (instalação, verificar, build, auditoria, assinaturas). Se vermelho, ler o registro (`gh run view <id> --log-failed`), relatar e corrigir na branch, com teste, antes de seguir.

### Task 11: Cloudflare Pages ligado ao repositório

**Files:** nenhum. **Quem faz:** o responsável, no painel do Cloudflare (os nomes dos botões podem variar um pouco; se o painel mostrar outra coisa, descreva o que vê no chat); o Claude confere de fora.

- [ ] **Step 1 (responsável): Criar o projeto.** Em dash.cloudflare.com, com a conta nova: "Workers e Pages" → "Criar" → aba "Pages" → "Conectar ao Git" (em inglês: "Import an existing Git repository").
- [ ] **Step 2 (responsável): Dar acesso só ao `apura`.** Na janela do GitHub que abrir, instalar o aplicativo do Cloudflare na conta `plsleite` escolhendo **"Only select repositories" → `apura`** (não "All repositories"). Voltar ao Cloudflare e escolher `plsleite/apura` → "Begin setup".
- [ ] **Step 3 (responsável): Configurar a montagem.**
  - Project name: `apura-dpems` (o endereço fica `apura-dpems.pages.dev`; se o nome estiver tomado, pare e avise);
  - Production branch: `main`;
  - Framework preset: `None`;
  - Build command: `npm run verificar && npm run build`;
  - Build output directory: `dist`;
  - Root directory: em branco; Environment variables: nenhuma (o Node vem do `.node-version`).
  - "Save and Deploy". A primeira montagem leva uns 3 minutos e deve terminar em "Success".
- [ ] **Step 4 (responsável): Conferir o registro da montagem.** No registro ("View build log"), procurar a linha da versão do Node (22.23.3) e a do Vitest (`Tests  1001 passed | 10 skipped (1011)`); dizer no chat o que viu. Se falhar, copiar para o chat as últimas 30 linhas do registro (não contêm segredo).
- [ ] **Step 5 (Claude): Conferir de fora.**
  - `curl -sSI https://apura-dpems.pages.dev/` → 200, com os seis cabeçalhos do `public/_headers`;
  - `curl -sSI http://apura-dpems.pages.dev/` → redirecionamento (301 ou 308) para `https://`;
  - `curl -sS https://apura-dpems.pages.dev/versao.json` → `"versao": "0.1.0"`;
  - `SITE_URL=https://apura-dpems.pages.dev npm run --silent indices:conferir-publicacao` (em `$RAIZ`) → "O site publicado está em dia…", código 0.
- [ ] **Step 6 (responsável): Pré-visualizações só para você.** No projeto: Settings → General (ou "Preview deployments") → "Access policy" → "Enable access policy" para as pré-visualizações. Se o Cloudflare pedir para configurar o Zero Trust com cartão de crédito, **pare e avise**: decide-se no chat (as pré-visualizações também têm "não indexar"; a alternativa é desligar as pré-visualizações de branches).
- [ ] **Step 7 (responsável): Aviso de montagem com falha.** Notifications (Notificações) → Add → produto "Pages" → evento de montagem com falha ("Deployment failed") no projeto `apura-dpems` → e-mail. Salvar.

### Task 12: Healthchecks, segredo `HC_URL` e configurações do GitHub

**Files:** nenhum. **Quem faz:** o responsável, nos painéis; o Claude confere pelo `gh` (só nomes e situações; nunca o valor de um segredo).

- [ ] **Step 1 (responsável): Verificação no Healthchecks.io.** Com a conta gratuita: "Add Check" →
  - Name: `Apura · rotina de índices`;
  - Schedule: "Cron", expressão `0 7 * * 1-5`, Time Zone `America/Sao_Paulo`, Grace Time `1 day` (decisão da fase 4);
  - Integrations: o e-mail da conta (já vem ligado).
  - Copiar o "Ping URL" (`https://hc-ping.com/…`). **Não colar no chat.**
- [ ] **Step 2 (responsável): Segredo `HC_URL`.** GitHub → `plsleite/apura` → Settings → Secrets and variables → Actions → "New repository secret": Name `HC_URL`, Secret: o endereço copiado → "Add secret".
- [ ] **Step 3 (responsável): Alertas de segurança das dependências.** Settings → "Advanced Security" (ou "Code security") → "Dependabot alerts" → Enable. Não ligar "Dependabot security updates" nem "version updates" (§19.6).
- [ ] **Step 4 (responsável): Guarda do histórico.** Settings → Actions → General → "Artifact and log retention" → 400 → Save.
- [ ] **Step 5 (responsável): E-mails de falha.** github.com/settings/notifications → "Actions": "Notify me for failed workflows only", com "Email" marcado.
- [ ] **Step 6 (Claude): Conferir.** `gh secret list -R plsleite/apura` → `HC_URL` (só o nome); `gh api repos/plsleite/apura/vulnerability-alerts --silent && echo ligados` → "ligados"; `gh api repos/plsleite/apura/actions/permissions/artifact-and-log-retention` → `"days":400` (se o comando não existir, o responsável confirma pelo painel).

### Task 13: Rotina religada e primeira rodada manual

**Files:** nenhum, salvo correção que a rodada exigir (na branch, com teste, e pelo caminho da Task 10). **Quem faz:** o Claude, com o "sim" do responsável antes de cada ⚑.

- [ ] **Step 1 ⚑: Religar.** `gh workflow enable atualizar-indices.yml -R plsleite/apura` e `gh workflow enable relatorio-indices.yml -R plsleite/apura`.
- [ ] **Step 2 ⚑: Rodada manual.** `gh workflow run atualizar-indices.yml -R plsleite/apura --ref main`; `gh run list -R plsleite/apura --workflow atualizar-indices.yml --limit 1`; `gh run watch <id> -R plsleite/apura --exit-status`.
- [ ] **Step 3: Conferir as etapas e o resumo** (`gh run view <id> -R plsleite/apura`, ou a página da execução):
  - o título "Atualizar índices · manual" e as etapas `baixar` → `gravar` (ou "skipped", sem mudança) → `fechar`, todas verdes;
  - no resumo da etapa `baixar`: "Publicação do site: O site publicado está em dia…" e a saída do script com as seis séries (os executores do GitHub alcançam o BCB);
  - no resumo da etapa `fechar`: "Desfecho: Gravado na main: <commit>." ou "Desfecho: Nenhum arquivo de dados/ mudou; nada foi gravado.";
  - na etapa `gravar` (se rodou): o artefato recebido, o commit e o envio; nenhum `npm` no registro dela.
- [ ] **Step 4: Se gravou.** `git -C "$RAIZ" pull --ff-only` (o commit "indices: séries do BCB em … (rodada manual)", com a saída e o endereço da execução); em até 15 minutos, `SITE_URL=https://apura-dpems.pages.dev npm run --silent indices:conferir-publicacao` em `$RAIZ` → "em dia" com a data nova (o commit do robô publicou sem deploy hook). Se não publicar em 15 minutos: o responsável cria o deploy hook (Cloudflare → projeto → Settings → Builds → Deploy hooks → nome `rotina`, branch `main`), guarda-o no segredo `CF_DEPLOY_HOOK` (como o `HC_URL`) e o Claude repete o Step 2.
- [ ] **Step 5: Se nada mudou** (as seis séries "sem mudança"), repetir os Steps 2 a 4 depois das 19h de um dia útil, quando a SELIC do dia já saiu (roteiro).

### Task 14: Conferência do site publicado

**Files:** nenhum, salvo correção (pelo caminho da Task 10).

- [ ] **Step 1 (Claude, navegador integrado em `https://apura-dpems.pages.dev`):** com a escuta de violações da Task 9: o rodapé diz "atualizados em <data>" igual à do `versao.json` e "v0.1.0"; um cálculo como o da Task 9, com um pagamento; relatório, com "Metodologia e fundamentos" e a matriz; "Salvar" oferece o arquivo; o cálculo aparece nos recentes; `window.isSecureContext` é `true` e `crypto.randomUUID` funciona (a linha nova da tabela ganha id); nenhuma violação, console sem erros.
- [ ] **Step 2 (responsável, num computador da Defensoria, na rede institucional):** abrir o endereço. Se não abrir, anotar a mensagem e avisar no chat (o remédio é o subdomínio, §19.2). Abrindo: um cálculo pequeno, "Relatório / PDF" → "Imprimir / Salvar PDF" → salvar o PDF: sai claro, em A4, com a faixa verde, o cabeçalho das tabelas repetido e o nome sugerido "Apura – <processo> – <data>".
- [ ] **Step 3 (responsável, no Safari do Mac):** "Salvar" baixa o arquivo `.json`; "Abrir" o reabre com o mesmo total.

### Task 15: Fechamento: documentos, pré-visualização, envio e etiqueta `v0.1.0`

**Files:**
- Modify: `docs/superpowers/roteiro.md` (fase 7 "concluída em <data> · plano: `docs/superpowers/plans/2026-10-14-fase-7-publicacao.md`"; "Insumos que dependem do responsável": o que foi feito nesta fase sai da lista; ficam as pendências com data da §19.8 e as revisões de um e três meses; o teste da rede da Defensoria com o resultado)
- Modify: `CLAUDE.md` (seção "Estado": fase 7 concluída, com o endereço, o repositório e a contagem final; "Comandos": `npm run indices:conferir-publicacao` e `actionlint .github/workflows/*.yml` (sempre que um workflow mudar); "Mapa de pastas": `testes.yml`, `public/_headers` e `public/tema.js`, `scripts/conferir-publicacao.ts` e os testes `versao`, `site` e `workflows`, `src/indices/publicacao.ts`; nova regra das dependências: "versão nova de pacote, action ou Node só com 14 dias de publicada; instalar com `npm install <pacote>@<versão> --before=<data de 14 dias atrás>`"; a nota dos commits do robô passa a "a main do GitHub recebe…", já valendo)
- Modify: `README.md` (endereço do site; o `testes.yml`; `npm run indices:conferir-publicacao`)
- Modify: `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md` (§12.2: `.github/workflows/` com `testes.yml · atualizar-indices.yml · relatorio-indices.yml`, sem o `publicar.yml`; `public/` com `_headers`, `tema.js` e os logos; `scripts/` com `conferir-publicacao.ts`; `src/indices/` com `publicacao.ts`; §19.9: plano executado, com a data)
- Modify: `CHANGELOG.md` (a data da seção 0.1.0 passa a ser a da publicação, se for outra)
- Modify: este plano (seção "Estado", com o modo de execução, as contagens medidas, o que as conferências acharam e as pendências com data)

- [ ] **Step 1: Trazer a `main` do GitHub.** Pela ferramenta do app de sincronizar a branch com a base (ou `git -C "$RAIZ" pull --ff-only` e `git merge main` na branch, fora de um worktree do app): os commits do robô entram na branch.
- [ ] **Step 2: Atualizar os seis arquivos acima.** `npm run format && npm run verificar`: verde.
- [ ] **Step 3: Commit:** `docs: fechamento da fase 7 (roteiro, CLAUDE.md, README, design e plano)`.
- [ ] **Step 4 ⚑: Enviar a branch.** `git push -u origin <branch da fase>`: o `testes.yml` roda fora da `main` (`gh run watch … --exit-status`: verde) e o Cloudflare monta a pré-visualização; `curl -sSI https://<branch>.apura-dpems.pages.dev/` não devolve o site sem login (redireciona para o login do Cloudflare Access), se o Step 6 da Task 11 foi possível.
- [ ] **Step 5 ⚑: Merge e envio.** `git -C "$RAIZ" pull --ff-only`; `git -C "$RAIZ" merge --no-ff <branch da fase> -m "Merge da fase 7: publicação (fechamento)"`; `npm run verificar` em `$RAIZ`; `git -C "$RAIZ" push origin main`. O Cloudflare publica; a conferência da publicação continua "em dia".
- [ ] **Step 6 ⚑: Etiqueta.** `git -C "$RAIZ" tag -a v0.1.0 -m "Apura 0.1.0: primeira versão para os testadores"` no commit enviado; `git -C "$RAIZ" push origin v0.1.0`.
- [ ] **Step 7 ⚑ (opcional): Apagar a branch remota** (`git push origin --delete <branch da fase>`), para a pré-visualização dela sair.
- [ ] **Step 8:** O responsável passa o endereço aos testadores.

## Pendências com data (vão para o roteiro na Task 15)

- **Dia útil seguinte à ligação, depois das 10h47:** `gh run list -R plsleite/apura --workflow atualizar-indices.yml --limit 3`: a primeira execução agendada se chama "Atualizar índices · 47 10 * * 1-5" e começou perto das 10h47 de Brasília (a chave `timezone`); o Healthchecks mostra o primeiro sinal ("up").
- **02/11/2026, depois das 12h17:** a execução "Relatório da rotina de índices" gravou `docs/monitoramento/2026-10.md` com o commit "[CF-Pages-Skip] monitoramento: …", e o Cloudflare não publicou por causa dele. Conferir os números contra a lista de execuções de outubro.
- **Um e três meses depois da ligação:** revisar com o responsável os relatórios de `docs/monitoramento/` (roteiro). Na de um mês, ajustar duas notas do relatório mensal (`src/indices/relatorio.ts`) que a rotina em etapas desatualizou: a estimativa de minutos, que conta o tempo da execução inteira, e não o de cada etapa (o GitHub cobra por etapa, cada uma arredondada para cima); e a frase que diz que os dias sem execução bem-sucedida são, aproximadamente, os que o Healthchecks acusa (nos dias de site atrasado a execução fica vermelha, mas o sinal vai).

## Estado

Plano escrito em 14/10/2026, a partir do ensaio, das duas revisões independentes e da reconstrução descritos em "Para o responsável". Executado em 14–15/10/2026, por escolha do responsável, direto na sessão (superpowers:executing-plans, Claude Opus 5.5), na branch `claude/apura-fase-7-publicacao-7dc98b`, a partir de `564691b`; registro em `.superpowers/sdd/2026-10-14-fase-7-publicacao/progress.md` (não versionado).

- **Tasks 1 a 8:** cada patch tirado do próprio plano; em todas, os testes listados falharam antes do código (a mesma lista, só em outra ordem na Task 1, porque o Vitest roda os arquivos em paralelo) e as contagens bateram: 952, 957, 958, 959, 962, 968, 983 e 1001 passando, sempre com 10 pulados; o `format` não mudou nada. Conferências extras: `1900-01-01` só em `entrada.ts`; `npm ci` com as travas novas; `dist/` com `_headers`, `tema.js` e `versao.json`; `SITE_URL` inválido recusado; `actionlint` limpo.
- **Task 9:** site montado servido com os cabeçalhos e usado no navegador integrado (lote, "Salvar", tema, relatório "v0.1.0", recarga com o tema), sem nenhuma violação da política; script embutido e chamada externa recusados; conferência local "em dia".
- **Revisão final da branch** (agente independente, Claude Opus 5.5): nenhum problema crítico ou importante; quatro menores. Dois foram reclassificados como importantes, por contrariarem a §19 (etapa "gravar" cancelada por tempo esgotado deixava a rodada muda e mandava o sinal ao Healthchecks; o teste dos workflows não pegava `github.*`), e corrigidos com teste em `f55ca4d` (1002 passando, 10 pulados). Ficaram registrados: a tolerância de 30 minutos conta da obtenção dos índices (alarme falso só numa reexecução tardia rara) e as recusas da etapa "gravar" aparecem no desfecho como "o envio à main falhou" (o motivo fica no registro da etapa).
- **Task 10:** merge na `main` local (`d30a35e`); repositório privado `plsleite/apura`; envio; os dois workflows agendados desligados até o site existir; primeiro `testes.yml` verde (Node 22.23.3, 60 arquivos, auditoria sem vulnerabilidades, 232 assinaturas conferidas).
- **Task 11:** o painel do Cloudflare chama o Pages de "legacy" e oferece primeiro os Workers; seguiu-se pelo Pages, como no design (o responsável foi avisado). Projeto `apura-dpems`, aplicativo do Cloudflare só no `apura`; a primeira montagem rodou `npm run verificar` (1002 passando) com o Node 22.23.3 e leu o `_headers`; de fora, os seis cabeçalhos, HTTP→HTTPS (301) e o `versao.json` 0.1.0; pré-visualizações restritas; alerta de montagem com falha. O registro avisou que o Node 22 chega ao fim da vida útil em abril de 2027 (pendência).
- **Task 12:** Healthchecks e `HC_URL`; alertas de segurança (e o grafo de dependências); guarda de 400 dias; por sugestão aceita, o GitHub passou a exigir actions fixadas por SHA; e-mail só de workflow com falha.
- **Task 13:** workflows religados; rodada manual `38685667284`, verde nas três etapas: o site estava "em dia", os executores alcançam o BCB, a SELIC de out/2026 foi de 0,36 para 0,46, o robô gravou `c17a68f` numa máquina limpa e o Cloudflare publicou sozinho em ~90 s (sem deploy hook); a conferência passou a "em dia" com 15/10/2026 02:14.
- **Task 14:** site publicado no navegador integrado (rodapé e relatório com 15/10/2026 02:14 e "v0.1.0", ambiente seguro, lote, pagamentos, "Salvar", recentes, nenhuma violação); o responsável conferiu a rede da Defensoria, a impressão em PDF por lá e o "Salvar" no Safari.
- **Agendador do GitHub:** nenhuma rodada agendada foi criada em 15/10/2026 (10h47 e 14h17), com o GitHub sem incidente, como em vários relatos recentes de repositórios privados do plano gratuito. Decisão do responsável: esperar até 16/10/2026, 11h; sem rodada, decidir o disparo externo (§15). Registrado no roteiro, com as demais pendências com data.
- **Task 15:** documentos atualizados; a data do `CHANGELOG.md` passou a 15/10/2026, a da publicação.

## Notas para as fases seguintes

- **A `main` do GitHub recebe commits do robô quase todo dia útil** (`dados/indices/`) e, no dia 2 de cada mês, o relatório da rotina (`docs/monitoramento/`): antes de integrar uma branch, trazer essas atualizações para a `main` local (`git pull --ff-only`) e só então fazer o merge; não rodar `npm run indices:atualizar` em branches de trabalho.
- **Versão:** cada fase que mude algo para quem usa sobe a versão (`npm version <x.y.z> --no-git-tag-version --ignore-scripts`) e acrescenta a seção no `CHANGELOG.md` (o teste `scripts/versao.test.ts` exige); a etiqueta `v<x.y.z>` vai no commit publicado. O retorno dos testadores entra numa 0.1.1.
- **Dependências, actions e Node:** versão nova só com 14 dias de publicada; pacote npm com `npm install <pacote>@<versão> --before=<data de 14 dias atrás>`; action pelo SHA do commit da etiqueta (`gh api repos/<action>/git/matching-refs/tags/<versão>`), com a versão num comentário e as notas lidas; Node pelo `.node-version`. Os alertas de segurança do GitHub chegam por e-mail; a auditoria roda no `testes.yml`.
- **Workflows:** qualquer mudança passa pelo `scripts/workflows.test.ts` e pelo `actionlint .github/workflows/*.yml`. Etapa que grava não instala nem roda pacotes; o token só no passo que grava.
- **Política de conteúdo:** o app não pode ganhar script embutido no `index.html`, chamada de rede a outro endereço, nem fonte ou imagem de fora; se precisar, a mudança passa pelo `public/_headers` (com o `scripts/site.test.ts`) e pela conferência da Task 9 (site montado servido com os cabeçalhos).
- **Subdomínio da Defensoria:** se vier, entra no painel do Cloudflare (domínio personalizado do projeto `apura-dpems`) mais um registro CNAME no DNS da instituição; liga-se o "Always Use HTTPS"; troca-se o `SITE_URL` do `atualizar-indices.yml` (o `scripts/workflows.test.ts` confere o endereço) e o README.
- **Novas séries** (nota da fase 4): a etapa "gravar" aceita qualquer `<código>.json`; nada a mudar nela.

## Auto-revisão do plano

- **Cobertura da §19:** 19.1 → Tasks 10 e 12; 19.2 → Tasks 6, 9 e 11; 19.3 → Task 8 (e a primeira rodada na Task 10); 19.4 → Tasks 7 e 8 (e a primeira rodada na Task 13); 19.5 → Tasks 11 a 13; 19.6 → Task 5 (e a etiqueta e a regra no `CLAUDE.md` na Task 15); 19.7 → Tasks 1 a 4; 19.8 → Tasks 10 a 15 e "Pendências com data"; 19.9 → "Para o responsável" e Task 15. Pendências da fase 4 (segurança dos workflows, `testes.yml`, conferência da publicação, primeira rodada, alcance do BCB, `timezone`), da fase 5 (0.1.0, Node do `engines`, Safari, HTTPS) e da fase 6 (versão no rodapé do relatório, impressão em outro navegador, os seis menores) e as duas sobras da 5b: todas com tarefa.
- **Placeholders:** nenhum "TBD" ou "implementar depois"; todo passo de código traz o patch inteiro, aplicado na reconstrução. Os espaços a preencher na execução são a data (Tasks 5 e 15), o nome do modelo na linha de coautoria, a pasta de rascunho (`$RASCUNHO`), a raiz do repositório (`$RAIZ`), os ids das execuções do GitHub e o nome da branch da fase.
- **Nomes entre tarefas (conferidos no código do ensaio):** `SalarioMinimoAnterior`, `salarioMinimoAnterior` (Task 2); `baixarPeloNavegador` (Task 4); `VersaoDoSite`, `montarVersaoDoSite` (Task 6, usados na 7); `lerVersaoDoSite`, `conferirPublicacao`, `conferirSitePublicado`, `ConferenciaDaPublicacao`, `OpcoesDaConferencia`, `TOLERANCIA_DA_PUBLICACAO_MINUTOS`, `minutosEntre`, `nomeDoErro`, `causaDoErro`, `indices:conferir-publicacao` (Task 7, usados na 8); as etapas `baixar`, `gravar`, `fechar` e `montar` e os passos "Gravar na main", "Conferir a publicação do site", "Desfecho no resumo", "Sinal de vida ao Healthchecks" (Task 8, conferidos pelo `scripts/workflows.test.ts` e citados nas Tasks 10 a 13).
- **Foco da revisão:** os cinco itens têm teste ou conferência na tarefa dona (1: Tasks 1 e 2; 2: Tasks 6 e 9; 3: Task 7; 4: Task 8; 5: Tasks 8, 10, 12 e 13).
- **Reconstrução:** contagens medidas ao fim de cada tarefa, a partir de 939 passando e 10 pulados (949), em 55 arquivos: 1 → 952 (962), 55; 2 → 957 (967), 55; 3 → 958 (968), 55; 4 → 959 (969), 56; 5 → 962 (972), 57; 6 → 968 (978), 59; 7 → 983 (993), 59; 8 → 1001 (1011), 60; sempre com 10 pulados. Os passos "ver falhar" trazem as falhas medidas; em todas as tarefas o `format` não mudou nada; o estado final é idêntico ao do ensaio (diferença vazia).
