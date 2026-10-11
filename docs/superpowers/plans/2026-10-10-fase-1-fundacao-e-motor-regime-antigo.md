# Apura · Fase 1 · Fundação e motor do regime antigo — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** deixar o repositório com o projeto inicializado (Vite, React, TypeScript estrito, Vitest, ESLint, Prettier, decimal.js), o `CLAUDE.md`, as primitivas do motor (decimal, datas, rateio, fator de correção, juros simples) e o motor do regime antigo reproduzindo, centavo a centavo, as 28 linhas e os totais do caso de referência SAJ/TJMS de 25/05/2018, mais a cópia embutida do IGP-M (série 189 do BCB) gerada por script.

**Arquitetura:** tudo em TypeScript. O motor (`src/motor/`) é um conjunto de funções puras que recebem o `Calculo` e uma `TabelaIndices` congelada e devolvem o `Resultado`; não usa rede, relógio nem tela. As primitivas ficam em `src/compartilhado/`. Os índices embutidos ficam em `dados/indices/` como JSON gerado por `scripts/atualizar-indices.ts`, que roda no Node sem compilação prévia. Casos de referência são arquivos JSON autossuficientes em `src/motor/casos/`, executados por um único teste genérico.

**Stack:** Node 22.22 · npm 10 · Vite 8.3 · React 19.3 · TypeScript 6.0 · Vitest 5.0 · decimal.js 10.6 · ESLint 10 + typescript-eslint 8 · Prettier 3.9. Versões exatas na Tarefa 1.

**Spec:** `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md` (design do MVP, fonte de verdade; Anexo A = caso de referência). Também: `docs/superpowers/roteiro.md` (fases) e `docs/superpowers/specs/2026-10-10-apura-visao-do-produto.md` (visão, que as decisões técnicas não podem inviabilizar).

## Restrições globais (valem para todas as tarefas)

- TypeScript estrito; Node 22 e npm (não há pnpm). O script de índices exige Node ≥ 22.18 (executa `.ts` direto).
- Dinheiro, percentuais e índices são sempre `Decimal` (decimal.js), nunca `number`; em arquivos e no `Resultado`, texto decimal com ponto: `"451.91"`, `"0.64"`, `"1.013020"`.
- Datas como texto `"AAAA-MM-DD"`; competências como `"AAAA-MM"`. O motor não usa objetos `Date`, `Date.now()`, `fetch` nem DOM.
- Arredondamento comercial (meio para cima) em todos os pontos: fator com 6 casas, percentual de juros com 6 casas, valores com 2 casas; o fator e o percentual são arredondados **antes** de multiplicar (`corrigido = arred2(valorBase × fator6)`; `jurosValor = arred2(corrigido × percentual6 ÷ 100)`; `atualizado = corrigido + jurosValor`).
- Termos do domínio em português no código, nos testes e nos dados (`prestacao`, `amortizacao`, `fatorCorrecao`, `metodologia`); infraestrutura técnica com nomes usuais em inglês.
- `Decimal` só é importado de `src/compartilhado/decimal.ts` (que configura precisão e arredondamento). Imports relativos sempre com a extensão `.ts`; tipos importados com `import type`.
- Nenhum índice inventado: só BCB/SGS (séries 433, 188, 189, 1619, 29543, 4390). URL: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados?formato=json&dataInicial=dd/mm/aaaa&dataFinal=dd/mm/aaaa`.
- Arquivo de cálculo com `formato: "apura/calculo@1"`. Metodologia padrão `id: "tjms-saj"`, `versao: 1`, `nome: "TJMS/SAJ"`: até 29/08/2024 IGP-M + 1% ao mês; desde 30/08/2024 IPCA + taxa legal.
- O motor nunca lança erro por dado do usuário: devolve avisos em frases completas, em português.
- Dados pessoais: nenhum número de processo real nem nome de parte em testes e casos de referência. O PDF do SAJ (guardado fora do repositório) fica fora do repositório e não é copiado.
- Commits em português no formato "módulo: o que muda", terminados com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `.superpowers/` e `node_modules/` ignorados.
- Fora desta fase (não implementar): regime novo (taxa legal, SELIC única), transição de 30/08/2024, apuração do valor-base, lotes, multa e honorários, casos-limite da §6.7, cliente ao vivo do BCB, interface, relatório. Onde o código desta fase encostar nesses pontos, ele devolve aviso ou valor neutro e deixa o gancho descrito na seção "Notas para as fases seguintes".

## Foco da revisão

Entradas que o design implica mas que nenhum teste cobriria por si; cada uma ganhou um teste na tarefa dona do código.

1. **Lançamento no mesmo mês da data de elaboração** (ex.: 10/05/2018 → 25/05/2018): a correção usa uma única fração (15/31) e nunca o produto das frações "inicial" e "final"; os juros contam 16 dias. → Tarefa 8 (`fatorCorrecao`, teste "usa uma única fração…") e Tarefa 9.
2. **Data do lançamento posterior à data de elaboração**: fator 1,000000, juros zero, aviso; nenhuma exceção. → Tarefas 8, 9 e 10.
3. **Fevereiro bissexto e meses de 30 dias** no rateio e no pro rata (29 dias no denominador em fev/2024). → Tarefa 4 (datas) e Tarefa 9 (juros).
4. **Índice faltante no meio do período** (não só no mês final), por exemplo out/2017 ausente da tabela: o mês entra com fator 1, a competência aparece no aviso e o cálculo continua. → Tarefa 8 e Tarefa 10.
5. **Resposta do BCB fora de ordem, com mês repetido, HTML com status 200 ou erro em JSON**: o leitor ordena, tolera repetição idêntica, recusa repetição divergente e recusa HTML, e o script não grava arquivo inválido. → Tarefa 12.

---

## Para o responsável: o que esta fase entrega e as escolhas técnicas

Ao fim da fase o Apura ainda não tem tela: é um projeto que roda testes. O que existe de concreto: o motor calcula qualquer lista de prestações e pagamentos pelo método do SAJ no regime antigo (IGP-M + 1% ao mês) e o teste de referência prova que ele chega aos mesmos centavos do relatório do TJMS de 2018, nas 28 linhas e nos totais. Tudo que vier depois (regime novo, bases, interface, relatório) se apoia nisso.

Escolhas feitas neste plano, dentro do que o design já decidiu:

1. **Versões exatas dos pacotes.** O `package.json` grava a versão exata de cada pacote (sem `^`) e o `package-lock.json` vai para o repositório. Prós: qualquer máquina instala exatamente o mesmo conjunto, hoje ou daqui a um ano; é o que o design chama de "versões fixadas". Contras: atualizar é um ato deliberado (`npm outdated` mostra o que há de novo). Alternativa descartada: faixas `^` (atualiza sozinho, mas duas instalações podem diferir).
2. **TypeScript 6.0, não 7.0.** A versão 7 é uma reescrita recente do compilador e as ferramentas de lint ainda não a aceitam; o template oficial do Vite também fixa a 6.0. Troca futura é só mudar a versão.
3. **ESLint em vez do oxlint do template.** O template atual do Vite vem com oxlint (mais novo e rápido). O design pede ESLint + Prettier, que são o padrão consolidado e mais configuráveis; mantido o design.
4. **Script de índices executado pelo Node direto.** O Node 22.22 lê TypeScript sem compilar (foi testado nesta máquina). Pró: nenhuma dependência extra (`tsx`, `ts-node`). Contra: exige Node ≥ 22.18, registrado em `engines`.
5. **Casos de referência como JSON autossuficiente.** Cada caso traz as entradas, a tabela de índices congelada como estava na data do cálculo e a saída esperada linha a linha; um único teste lê a pasta e confere todos. Registrar um novo gabarito (contadoria, Calculadora do Cidadão) é criar um arquivo, sem código.
6. **Tabela de índices indexada pelo código do BCB** ("189"), não pelo nome ("IGP-M"): o código é a identidade oficial da série; o nome é tradução para a tela. O mapa nome → código fica em `src/compartilhado/tipos.ts`.
7. **Deflação já com os três modos** (`aplicarComPiso`, padrão; `aplicarSemPiso`; `zerarNegativos`) na própria primitiva do fator: são três linhas na mesma função, cada uma com teste; a fase 2 só acrescenta o caso de referência de deflação.
8. **Juros: só "percentual mensal" nesta fase.** Se a metodologia mandar aplicar "taxa legal" ou "SELIC única" (regime novo), o motor devolve aviso e zero para aquele trecho, sem travar; a fase 2 substitui esse ramo. Como a metodologia padrão já traz os dois períodos, isso só acontece em cálculos com datas após 29/08/2024.
9. **Formatação pt-BR feita à mão** (`R$ 1.234,56`, `dd/mm/aaaa`, `mai/2018`) sem a API `Intl`, para nunca converter `Decimal` em número de ponto flutuante.
10. **Prettier formata só código**; documentos (`docs/`, `*.md`), dados (`dados/`) e arquivos gravados de teste ficam como escritos.
11. **Valor dos lançamentos nesta fase vem de `valorInformado`.** O caso SAJ usa os valores nominais do relatório (como diz o Anexo A); a apuração do valor-base a partir da base dos alimentos é a fase 3. Um lançamento sem valor informado entra com zero e aviso.

Dependem de internet: Tarefa 1 (`npm install`) e Tarefa 13 (`npm run indices:atualizar -- 189`). Todo o resto roda sem rede.

---

## Estrutura de arquivos desta fase

| Arquivo | Responsabilidade |
|---|---|
| `package.json`, `package-lock.json`, `.npmrc` | nome, scripts, dependências com versões exatas |
| `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | TypeScript estrito; `app` cobre `src/` (navegador e testes), `node` cobre `vite.config.ts` e `scripts/` |
| `vite.config.ts` | Vite + React + configuração do Vitest |
| `eslint.config.js`, `.prettierrc`, `.prettierignore` | lint e formatação |
| `index.html`, `src/main.tsx`, `src/App.tsx` | casca mínima do app (a interface é a fase 5) |
| `CLAUDE.md`, `README.md` | instruções permanentes (§12.3 do design) e apresentação |
| `src/compartilhado/decimal.ts` | `Decimal` configurado; `decimal`, `arredondar`, `paraTexto`, constantes |
| `src/compartilhado/datas.ts` | datas ISO como texto: dias do mês, validação, competências, dias entre datas, rateio por mês-calendário |
| `src/compartilhado/formatacao.ts` | moeda, data, competência e percentual em pt-BR |
| `src/compartilhado/tipos.ts` | `Calculo`, `Lancamento`, `Metodologia`, `TabelaIndices`, `Resultado`, `CasoDeReferencia`, `ArquivoSerie`, mapas nome↔código das séries |
| `src/metodologias/tjms-saj.v1.json`, `src/metodologias/padrao.ts` | metodologia padrão "TJMS/SAJ v1" e função que devolve uma cópia dela |
| `src/motor/periodos.ts` | qual período da metodologia vige em uma data; divisão de um intervalo pelos períodos |
| `src/motor/correcao.ts` | índice de cada mês segundo a metodologia; fator de correção (pro rata, meses inteiros, mês final, faltantes, deflação) |
| `src/motor/juros.ts` | juros simples por mês-calendário contando as duas pontas, por período |
| `src/motor/calcular.ts` | atualização de cada lançamento, totais, índices usados, avisos |
| `src/motor/testes/indices-igpm-2017-2018.ts` | tabela IGP-M 2017–2018 compartilhada pelos testes unitários |
| `src/motor/casos/2018-05-25-saj-tjms-alimentos.json`, `src/motor/casos.test.ts` | caso de referência e o teste genérico que executa todos os casos |
| `src/indices/series.ts` | catálogo das seis séries e montagem da URL do SGS |
| `src/indices/cliente-bcb.ts` | leitura e validação das respostas do SGS; montagem do arquivo de série |
| `src/indices/testes/sgs-189-2017-2018.json` | resposta real do BCB gravada (jan/2017 a mai/2018) |
| `src/indices/embutidos.ts` | tabela de índices montada só com a cópia embutida |
| `scripts/atualizar-indices.ts` | baixa as séries do BCB e grava `dados/indices/<codigo>.json` |
| `dados/indices/189.json` | cópia embutida do IGP-M (gerada pelo script) |
| `docs/superpowers/roteiro.md` | tabela de fases atualizada ao final |

Dependências entre módulos (§4.2 do design): `motor/` e `indices/` dependem só de `compartilhado/`; `metodologias/` é dado; `scripts/` usa `indices/`.

## Como executar este plano

- Todos os comandos rodam na raiz do repositório. Uma tarefa de cada vez, na ordem.
- Ciclo de cada regra: escrever o teste → rodar e vê-lo falhar → escrever o mínimo que passa → rodar e vê-lo passar → `npm run verificar` → commit. O passo "verificar" roda Prettier (conferência), ESLint, `tsc -b` e todos os testes; só se commita com tudo verde.
- Os valores esperados nos testes vêm do Anexo A do design e de contas conferidas com aritmética decimal; se uma implementação não bater, a implementação está errada, não o valor esperado. Não ajuste valores esperados para "fazer passar": pare e relate.
- Mensagens de commit no formato "módulo: o que muda", com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ao final (os comandos abaixo já a incluem).
- Se o `npm run format` alterar arquivos depois de escritos, isso é normal: o Prettier impõe o estilo; o conteúdo não muda.

---

### Tarefa 1: Projeto base (Vite, React, TypeScript estrito, Vitest, ESLint, Prettier, decimal.js)

**Arquivos:**
- Criar: `.npmrc`, `package.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `index.html`, `src/main.tsx`, `src/App.tsx`
- Criar (teste): `src/compartilhado/decimal.test.ts` (teste de fumaça; a Tarefa 3 o reescreve)
- Modificar: `.gitignore`
- Gerado: `package-lock.json` (commitado), `node_modules/` (ignorado)

**Interfaces:**
- Consome: nada.
- Produz: os scripts npm usados por todas as tarefas: `npm test`, `npm run test:watch`, `npm run lint`, `npm run tipos`, `npm run format`, `npm run format:check`, `npm run verificar`, `npm run build`, `npm run dev`, `npm run indices:atualizar`. Convenções: imports relativos com `.ts`, `strict` + `noUncheckedIndexedAccess`.

Esta configuração foi ensaiada em 10/10/2026 com estas versões exatas: Prettier, ESLint, `tsc -b`, Vitest (com JSON importado de `dados/`, `?raw` e `import.meta.glob`), script `.ts` rodando no Node e `vite build` passaram.

- [ ] **Passo 1: Confirmar que ainda não há projeto**

Execute: `npm test`
Esperado: falha ("Missing script" ou "no package.json"), porque o projeto não existe.

- [ ] **Passo 2: Criar `.npmrc` e `package.json`**

`.npmrc`:
```
save-exact=true
```

`package.json`:
```json
{
  "name": "apura",
  "private": true,
  "version": "0.0.0",
  "description": "Apura — Sistema de Cálculos Judiciais da Defensoria Pública de Mato Grosso do Sul",
  "type": "module",
  "engines": { "node": ">=22.18" },
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "tipos": "tsc -b",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "verificar": "prettier --check . && eslint . && tsc -b && vitest run",
    "indices:atualizar": "node scripts/atualizar-indices.ts"
  },
  "dependencies": {
    "decimal.js": "10.6.0",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "devDependencies": {
    "@eslint/js": "10.0.1",
    "@types/node": "22.20.5",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "@vitejs/plugin-react": "6.1.2",
    "eslint": "10.12.0",
    "eslint-config-prettier": "10.1.8",
    "eslint-plugin-react-hooks": "7.1.1",
    "globals": "17.13.0",
    "prettier": "3.9.10",
    "typescript": "6.0.3",
    "typescript-eslint": "8.71.1",
    "vite": "8.3.4",
    "vitest": "5.0.3"
  }
}
```

- [ ] **Passo 3: Instalar as dependências**

Execute: `npm install`
Esperado: "added N packages" sem erros; surgem `package-lock.json` e `node_modules/`. Precisa de internet.

- [ ] **Passo 4: Criar os três `tsconfig`**

`tsconfig.json`:
```json
{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
}
```

`tsconfig.app.json` (cobre `src/`, inclusive os testes):
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client"],
    "allowArbitraryExtensions": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

`tsconfig.node.json` (cobre `vite.config.ts` e `scripts/`, que rodam no Node):
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023"],
    "types": ["node"],
    "skipLibCheck": true,
    "module": "nodenext",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts", "scripts"]
}
```

Por que `erasableSyntaxOnly`: garante que o código use só a sintaxe que o Node consegue "apagar" ao executar `.ts` direto (sem `enum`, sem `namespace`, sem propriedades de parâmetro em construtores).

- [ ] **Passo 5: Criar `vite.config.ts`**

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
```

- [ ] **Passo 6: Criar `eslint.config.js`, `.prettierrc` e `.prettierignore`**

`eslint.config.js`:
```js
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["dist", "node_modules", "coverage", ".claude", ".superpowers"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  prettier,
);
```

`.prettierrc`:
```json
{ "printWidth": 100 }
```

`.prettierignore` (o Prettier formata só código; documentos, dados e arquivos gravados ficam como escritos):
```
node_modules
dist
coverage
.claude
.superpowers
package-lock.json
*.md
docs/
dados/
src/motor/casos/*.json
src/indices/testes/
```

- [ ] **Passo 7: Criar a casca do app**

`index.html`:
```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Apura</title>
  </head>
  <body>
    <div id="raiz"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

const raiz = document.getElementById("raiz");
if (raiz) {
  createRoot(raiz).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
```

`src/App.tsx`:
```tsx
export default function App() {
  return (
    <main>
      <h1>Apura</h1>
      <p>Sistema de Cálculos Judiciais · Defensoria Pública de Mato Grosso do Sul</p>
      <p>Interface em construção. O motor de cálculo está em desenvolvimento (fase 1).</p>
    </main>
  );
}
```

- [ ] **Passo 8: Escrever o teste de fumaça**

`src/compartilhado/decimal.test.ts` (mostra por que o Apura não usa `number` para dinheiro):
```ts
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

describe("ambiente de testes", () => {
  it("decimal.js soma 0,1 com 0,2 sem o erro do ponto flutuante", () => {
    expect(new Decimal("0.1").plus(new Decimal("0.2")).toString()).toBe("0.3");
    expect(0.1 + 0.2).not.toBe(0.3);
  });
});
```

- [ ] **Passo 9: Completar o `.gitignore`**

Acrescente ao final do `.gitignore` existente (mantendo o que já há):
```
# Registros e caches de ferramentas
*.log
.claude/worktrees/
```

- [ ] **Passo 10: Formatar e verificar tudo**

Execute: `npm run format`
Esperado: o Prettier reescreve alguns arquivos no estilo dele (sem erro).

Execute: `npm run verificar`
Esperado: "All matched files use Prettier code style!", ESLint sem saída (0 problemas), `tsc -b` sem saída, Vitest "1 passed".

Execute: `npm run build`
Esperado: "✓ built in …" e a pasta `dist/` (ignorada pelo git).

- [ ] **Passo 11: Commit**

```bash
git add -A && git commit -m "projeto: base Vite, React, TypeScript estrito, Vitest, ESLint, Prettier e decimal.js" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tarefa 2: `CLAUDE.md` e `README.md`

**Arquivos:**
- Criar: `CLAUDE.md`, `README.md`

**Interfaces:**
- Consome: os scripts npm da Tarefa 1.
- Produz: as instruções permanentes que todas as sessões e subagentes leem antes de trabalhar (§12.3 do design). A Tarefa 14 atualiza a seção "Estado".

- [ ] **Passo 1: Escrever `CLAUDE.md`**

````markdown
# Apura · instruções para o Claude Code

## O que é

Apura — Sistema de Cálculos Judiciais da Defensoria Pública de Mato Grosso do Sul. O MVP calcula a
execução de alimentos (demonstrativo discriminado e atualizado do crédito, art. 524 do CPC) num
aplicativo que roda inteiro no navegador, sem servidor, publicado como site estático, com relatório
em HTML e PDF na identidade visual da DPE-MS.

Leia, nesta ordem, antes de qualquer tarefa:

1. `docs/superpowers/roteiro.md` — fases, situação atual e como retomar.
2. `docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md` — design do MVP, fonte de
   verdade (escopo, arquitetura, modelo de dados, regras do motor, índices, interface, relatório,
   testes, convenções). O Anexo A é o caso de referência do SAJ/TJMS de 2018.
3. `docs/superpowers/specs/2026-10-10-apura-visao-do-produto.md` — visão além do MVP; nenhuma
   decisão técnica pode inviabilizá-la.
4. O plano da fase em andamento, em `docs/superpowers/plans/`.

Não reabra decisões já tomadas nesses documentos. Quem fala com você é um Defensor Público,
coordenador de TI, sem formação em programação: escreva em português, explique escolhas técnicas em
linguagem acessível com prós e contras, prefira a solução mais simples que atenda e pergunte antes
de decidir, uma pergunta por vez, em múltipla escolha com a opção recomendada marcada.

## Estado

Fase 1 (fundação e motor do regime antigo) em execução. A tabela de fases do roteiro é a
referência; atualize-a e esta seção ao concluir cada fase.

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
   `src/compartilhado/decimal.ts`; nunca `number`. Nos arquivos e no `Resultado`, texto decimal com
   ponto (`"451.91"`). Arredondamento comercial (meio para cima): fator e percentual com 6 casas,
   valores com 2, e o fator e o percentual são arredondados antes de multiplicar.
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
````

- [ ] **Passo 2: Escrever `README.md`**

````markdown
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
````

- [ ] **Passo 3: Verificar e commitar**

Execute: `npm run verificar`
Esperado: tudo verde (arquivos `.md` não são tocados pelo Prettier).

```bash
git add CLAUDE.md README.md && git commit -m "docs: CLAUDE.md com regras do projeto e README" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tarefa 3: Primitiva decimal e arredondamento comercial

**Arquivos:**
- Criar: `src/compartilhado/decimal.ts`
- Modificar (reescrever): `src/compartilhado/decimal.test.ts`

**Interfaces:**
- Consome: `decimal.js`.
- Produz (usado por todas as tarefas seguintes):
  - `export { Decimal }` — a classe, já configurada com precisão 40 e arredondamento meio para cima; é o único ponto de importação de `Decimal` no projeto.
  - `export type TextoDecimal = string` — texto decimal com ponto (`"451.91"`).
  - `decimal(valor: TextoDecimal | Decimal): Decimal` — constrói a partir de texto; devolve o próprio objeto se já for `Decimal`; lança erro para texto inválido (vírgula, vazio).
  - `arredondar(valor: Decimal, casas: number): Decimal` — arredondamento comercial.
  - `paraTexto(valor: Decimal, casas: number): TextoDecimal` — arredonda e fixa o número de casas (`"1.013020"`, `"188.30"`).
  - `ZERO`, `UM`, `CEM: Decimal`.

- [ ] **Passo 1: Escrever os testes (reescrevendo o teste de fumaça)**

`src/compartilhado/decimal.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { arredondar, decimal, Decimal, paraTexto, CEM, UM, ZERO } from "./decimal.ts";

describe("decimal", () => {
  it("soma 0,1 com 0,2 sem o erro do ponto flutuante", () => {
    expect(decimal("0.1").plus(decimal("0.2")).toString()).toBe("0.3");
    expect(0.1 + 0.2).not.toBe(0.3); // por isso o Apura não usa number para valores
  });

  it("aceita texto com ponto decimal e devolve o próprio objeto quando já é Decimal", () => {
    const valor = decimal("451.91");
    expect(valor).toBeInstanceOf(Decimal);
    expect(decimal(valor)).toBe(valor);
    expect(decimal("-1.10").isNegative()).toBe(true);
  });

  it("rejeita texto com vírgula ou vazio", () => {
    expect(() => decimal("451,91")).toThrow();
    expect(() => decimal("")).toThrow();
  });

  it("arredonda no modo comercial (meio para cima)", () => {
    expect(paraTexto(arredondar(decimal("2.675"), 2), 2)).toBe("2.68");
    expect(paraTexto(arredondar(decimal("0.125"), 2), 2)).toBe("0.13");
    expect(paraTexto(arredondar(decimal("0.124"), 2), 2)).toBe("0.12");
    expect(paraTexto(arredondar(decimal("1.0130195"), 6), 6)).toBe("1.013020");
    expect(paraTexto(arredondar(decimal("1.0130194"), 6), 6)).toBe("1.013019");
  });

  it("paraTexto fixa o número de casas, com zeros à direita", () => {
    expect(paraTexto(decimal("188.3"), 2)).toBe("188.30");
    expect(paraTexto(decimal("7145.725"), 2)).toBe("7145.73");
    expect(paraTexto(UM, 6)).toBe("1.000000");
    expect(paraTexto(ZERO, 2)).toBe("0.00");
  });

  it("calcula potência com expoente fracionário com precisão suficiente para 6 casas", () => {
    // mês de janeiro/2017 (0,64%) pro rata de 21 dias em 31: (1,0064)^(21/31)
    const fator = UM.plus(decimal("0.64").div(CEM)).pow(decimal("21").div(31));
    expect(paraTexto(fator, 6)).toBe("1.004331");
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Execute: `npm test`
Esperado: falha ao importar `./decimal.ts` (módulo inexistente) ou "arredondar is not a function".

- [ ] **Passo 3: Implementar `src/compartilhado/decimal.ts`**

```ts
import Decimal from "decimal.js";

// Precisão interna alta (40 dígitos significativos) para que o arredondamento final, a 2 ou a
// 6 casas, nunca seja afetado por erro acumulado nas contas. Modo comercial = meio para cima.
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

/** Texto decimal com ponto, como gravado em arquivos e no Resultado: "451.91", "0.64". */
export type TextoDecimal = string;

/** Constrói um Decimal a partir de texto; devolve o próprio objeto se já for Decimal. */
export function decimal(valor: TextoDecimal | Decimal): Decimal {
  return valor instanceof Decimal ? valor : new Decimal(valor);
}

/** Arredondamento comercial (meio para cima) a `casas` casas decimais. */
export function arredondar(valor: Decimal, casas: number): Decimal {
  return valor.toDecimalPlaces(casas, Decimal.ROUND_HALF_UP);
}

/** Arredonda e fixa o número de casas, com zeros à direita: paraTexto(1.01302, 6) = "1.013020". */
export function paraTexto(valor: Decimal, casas: number): TextoDecimal {
  return arredondar(valor, casas).toFixed(casas);
}

export const ZERO = new Decimal(0);
export const UM = new Decimal(1);
export const CEM = new Decimal(100);
```

- [ ] **Passo 4: Rodar e ver passar**

Execute: `npm test`
Esperado: "6 passed".

- [ ] **Passo 5: Verificar e commitar**

Execute: `npm run format && npm run verificar`
Esperado: tudo verde.

```bash
git add src/compartilhado/decimal.ts src/compartilhado/decimal.test.ts && git commit -m "compartilhado: decimal configurado e arredondamento comercial" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tarefa 4: Datas como texto: dias do mês, competências, dias entre datas e rateio por mês-calendário

**Arquivos:**
- Criar: `src/compartilhado/datas.ts`
- Teste: `src/compartilhado/datas.test.ts`

**Interfaces:**
- Consome: nada (aritmética inteira pura; sem `Date`).
- Produz:
  - `export type DataISO = string` (`"AAAA-MM-DD"`); `export type Competencia = string` (`"AAAA-MM"`).
  - `bissexto(ano: number): boolean`; `diasDoMes(ano: number, mes: number): number`.
  - `dataValida(texto: string): boolean`; `decompor(data: DataISO): { ano: number; mes: number; dia: number }` (lança erro se inválida); `compor(ano: number, mes: number, dia: number): DataISO`.
  - `competenciaValida(texto: string): boolean`; `competenciaDe(data: DataISO): Competencia`; `decomporCompetencia(c: Competencia): { ano: number; mes: number }`; `comporCompetencia(ano: number, mes: number): Competencia`; `mesSeguinte(c: Competencia): Competencia`; `competenciasEntre(de: Competencia, ate: Competencia): Competencia[]` (inclusive; vazio se `ate < de`); `primeiroDiaDoMes(c: Competencia): DataISO`; `ultimoDiaDoMes(c: Competencia): DataISO`.
  - `diasDesdeEpoca(data: DataISO): number` (dias desde 1970-01-01); `diasEntre(a: DataISO, b: DataISO): number` (b − a; o dia inicial não conta).
  - `interface TrechoMensal { competencia: Competencia; de: DataISO; ate: DataISO; dias: number; diasDoMes: number }`; `ratearPorMesCalendario(inicio: DataISO, fim: DataISO): TrechoMensal[]` — divide `[inicio, fim]` por mês, **contando as duas pontas** (10/01 a 31/01 = 22 dias); vazio se `fim < inicio`.

Como as datas ISO ordenam alfabeticamente igual à ordem cronológica, comparações entre datas são comparações de texto (`"2017-01-10" < "2018-05-25"`).

- [ ] **Passo 1: Escrever os testes**

`src/compartilhado/datas.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  competenciaDe,
  competenciasEntre,
  competenciaValida,
  compor,
  dataValida,
  decompor,
  diasDesdeEpoca,
  diasDoMes,
  diasEntre,
  mesSeguinte,
  primeiroDiaDoMes,
  ratearPorMesCalendario,
  ultimoDiaDoMes,
} from "./datas.ts";

describe("datas", () => {
  it("conhece os dias de cada mês, inclusive em ano bissexto", () => {
    expect(diasDoMes(2017, 1)).toBe(31);
    expect(diasDoMes(2017, 4)).toBe(30);
    expect(diasDoMes(2017, 2)).toBe(28);
    expect(diasDoMes(2024, 2)).toBe(29);
    expect(diasDoMes(1900, 2)).toBe(28);
    expect(diasDoMes(2000, 2)).toBe(29);
  });

  it("valida datas no formato AAAA-MM-DD", () => {
    expect(dataValida("2018-05-25")).toBe(true);
    expect(dataValida("2016-02-29")).toBe(true);
    expect(dataValida("2017-02-29")).toBe(false);
    expect(dataValida("2017-13-01")).toBe(false);
    expect(dataValida("2017-04-31")).toBe(false);
    expect(dataValida("25/05/2018")).toBe(false);
    expect(dataValida("2018-5-25")).toBe(false);
  });

  it("decompõe e compõe datas", () => {
    expect(decompor("2018-05-25")).toEqual({ ano: 2018, mes: 5, dia: 25 });
    expect(compor(2018, 5, 25)).toBe("2018-05-25");
    expect(() => decompor("2017-02-29")).toThrow();
  });

  it("extrai, valida e percorre competências", () => {
    expect(competenciaDe("2018-05-25")).toBe("2018-05");
    expect(competenciaValida("2018-05")).toBe(true);
    expect(competenciaValida("2018-13")).toBe(false);
    expect(competenciaValida("05/2018")).toBe(false);
    expect(mesSeguinte("2017-12")).toBe("2018-01");
    expect(mesSeguinte("2017-01")).toBe("2017-02");
    expect(competenciasEntre("2017-11", "2018-02")).toEqual(["2017-11", "2017-12", "2018-01", "2018-02"]);
    expect(competenciasEntre("2018-02", "2018-02")).toEqual(["2018-02"]);
    expect(competenciasEntre("2018-02", "2017-11")).toEqual([]);
    expect(primeiroDiaDoMes("2024-02")).toBe("2024-02-01");
    expect(ultimoDiaDoMes("2024-02")).toBe("2024-02-29");
    expect(ultimoDiaDoMes("2017-04")).toBe("2017-04-30");
  });

  it("conta dias sem objetos Date", () => {
    expect(diasDesdeEpoca("1970-01-01")).toBe(0);
    expect(diasDesdeEpoca("1970-01-02")).toBe(1);
    expect(diasDesdeEpoca("2000-03-01")).toBe(11017);
    expect(diasDesdeEpoca("2017-01-10")).toBe(17176);
    expect(diasDesdeEpoca("1900-03-01")).toBe(-25508);
    expect(diasEntre("2017-01-10", "2018-05-25")).toBe(500);
    expect(diasEntre("2024-02-28", "2024-03-01")).toBe(2);
    expect(diasEntre("2023-02-28", "2023-03-01")).toBe(1);
    expect(diasEntre("2018-05-25", "2017-01-10")).toBe(-500);
  });

  it("rateia por mês-calendário contando as duas pontas (convenção do SAJ)", () => {
    const trechos = ratearPorMesCalendario("2017-01-10", "2018-05-25");
    expect(trechos).toHaveLength(17);
    expect(trechos[0]).toEqual({ competencia: "2017-01", de: "2017-01-10", ate: "2017-01-31", dias: 22, diasDoMes: 31 });
    expect(trechos[1]).toEqual({ competencia: "2017-02", de: "2017-02-01", ate: "2017-02-28", dias: 28, diasDoMes: 28 });
    expect(trechos[16]).toEqual({ competencia: "2018-05", de: "2018-05-01", ate: "2018-05-25", dias: 25, diasDoMes: 31 });
  });

  it("rateia fevereiro bissexto, intervalos de um dia e intervalos invertidos", () => {
    expect(ratearPorMesCalendario("2024-02-10", "2024-03-05")).toEqual([
      { competencia: "2024-02", de: "2024-02-10", ate: "2024-02-29", dias: 20, diasDoMes: 29 },
      { competencia: "2024-03", de: "2024-03-01", ate: "2024-03-05", dias: 5, diasDoMes: 31 },
    ]);
    expect(ratearPorMesCalendario("2018-05-25", "2018-05-25")).toEqual([
      { competencia: "2018-05", de: "2018-05-25", ate: "2018-05-25", dias: 1, diasDoMes: 31 },
    ]);
    expect(ratearPorMesCalendario("2018-05-25", "2018-05-24")).toEqual([]);
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Execute: `npm test`
Esperado: falha ao importar `./datas.ts`.

- [ ] **Passo 3: Implementar `src/compartilhado/datas.ts`**

```ts
/** Data como texto "AAAA-MM-DD". Ordena alfabeticamente na ordem cronológica. */
export type DataISO = string;
/** Competência (mês de referência) como texto "AAAA-MM". */
export type Competencia = string;

const FORMATO_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
const FORMATO_COMPETENCIA = /^(\d{4})-(\d{2})$/;

export function bissexto(ano: number): boolean {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

export function diasDoMes(ano: number, mes: number): number {
  if (mes === 2) return bissexto(ano) ? 29 : 28;
  return mes === 4 || mes === 6 || mes === 9 || mes === 11 ? 30 : 31;
}

export function dataValida(texto: string): boolean {
  const partes = FORMATO_DATA.exec(texto);
  if (!partes) return false;
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  return ano >= 1900 && mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasDoMes(ano, mes);
}

/** Lança erro para data inválida: a tela valida antes, e o motor só recebe datas válidas. */
export function decompor(data: DataISO): { ano: number; mes: number; dia: number } {
  if (!dataValida(data)) throw new Error(`Data inválida: ${data}`);
  return { ano: Number(data.slice(0, 4)), mes: Number(data.slice(5, 7)), dia: Number(data.slice(8, 10)) };
}

export function compor(ano: number, mes: number, dia: number): DataISO {
  return `${comporCompetencia(ano, mes)}-${String(dia).padStart(2, "0")}`;
}

export function competenciaValida(texto: string): boolean {
  const partes = FORMATO_COMPETENCIA.exec(texto);
  if (!partes) return false;
  const mes = Number(partes[2]);
  return Number(partes[1]) >= 1900 && mes >= 1 && mes <= 12;
}

export function competenciaDe(data: DataISO): Competencia {
  return data.slice(0, 7);
}

export function decomporCompetencia(competencia: Competencia): { ano: number; mes: number } {
  if (!competenciaValida(competencia)) throw new Error(`Competência inválida: ${competencia}`);
  return { ano: Number(competencia.slice(0, 4)), mes: Number(competencia.slice(5, 7)) };
}

export function comporCompetencia(ano: number, mes: number): Competencia {
  return `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}`;
}

export function mesSeguinte(competencia: Competencia): Competencia {
  const { ano, mes } = decomporCompetencia(competencia);
  return mes === 12 ? comporCompetencia(ano + 1, 1) : comporCompetencia(ano, mes + 1);
}

/** Competências de `de` a `ate`, inclusive; vazio se `ate` é anterior a `de`. */
export function competenciasEntre(de: Competencia, ate: Competencia): Competencia[] {
  const lista: Competencia[] = [];
  for (let atual = de; atual <= ate; atual = mesSeguinte(atual)) lista.push(atual);
  return lista;
}

export function primeiroDiaDoMes(competencia: Competencia): DataISO {
  return `${competencia}-01`;
}

export function ultimoDiaDoMes(competencia: Competencia): DataISO {
  const { ano, mes } = decomporCompetencia(competencia);
  return compor(ano, mes, diasDoMes(ano, mes));
}

/**
 * Dias desde 1970-01-01 pelo algoritmo civil (Howard Hinnant), sem objetos Date e sem fuso
 * horário. Negativo para datas anteriores a 1970.
 */
export function diasDesdeEpoca(data: DataISO): number {
  const { ano, mes, dia } = decompor(data);
  const anoDeslocado = mes <= 2 ? ano - 1 : ano;
  const era = Math.floor(anoDeslocado / 400);
  const anoDaEra = anoDeslocado - era * 400;
  const mesDeslocado = mes > 2 ? mes - 3 : mes + 9;
  const diaDoAno = Math.floor((153 * mesDeslocado + 2) / 5) + dia - 1;
  const diaDaEra =
    anoDaEra * 365 + Math.floor(anoDaEra / 4) - Math.floor(anoDaEra / 100) + diaDoAno;
  return era * 146097 + diaDaEra - 719468;
}

/** Dias de `a` até `b` (b − a); o dia inicial não conta. Negativo se `b` é anterior. */
export function diasEntre(a: DataISO, b: DataISO): number {
  return diasDesdeEpoca(b) - diasDesdeEpoca(a);
}

export interface TrechoMensal {
  competencia: Competencia;
  de: DataISO;
  ate: DataISO;
  /** dias do trecho dentro do mês, contando as duas pontas */
  dias: number;
  diasDoMes: number;
}

/**
 * Divide o intervalo [inicio, fim] por mês-calendário, contando o dia inicial e o dia final
 * (10/01 a 31/01 = 22 dias), como o SAJ faz nos juros. Vazio se `fim` é anterior a `inicio`.
 */
export function ratearPorMesCalendario(inicio: DataISO, fim: DataISO): TrechoMensal[] {
  const trechos: TrechoMensal[] = [];
  if (fim < inicio) return trechos;
  const competenciaInicial = competenciaDe(inicio);
  const competenciaFinal = competenciaDe(fim);
  for (const competencia of competenciasEntre(competenciaInicial, competenciaFinal)) {
    const de = competencia === competenciaInicial ? inicio : primeiroDiaDoMes(competencia);
    const ate = competencia === competenciaFinal ? fim : ultimoDiaDoMes(competencia);
    const { ano, mes } = decomporCompetencia(competencia);
    trechos.push({ competencia, de, ate, dias: diasEntre(de, ate) + 1, diasDoMes: diasDoMes(ano, mes) });
  }
  return trechos;
}
```

- [ ] **Passo 4: Rodar e ver passar**

Execute: `npm test`
Esperado: todos os testes passam (decimal 6 + datas 7).

- [ ] **Passo 5: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add src/compartilhado/datas.ts src/compartilhado/datas.test.ts && git commit -m "compartilhado: datas ISO, dias entre datas e rateio por mês-calendário" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tarefa 5: Formatação pt-BR (moeda, data, competência, percentual)

**Arquivos:**
- Criar: `src/compartilhado/formatacao.ts`
- Teste: `src/compartilhado/formatacao.test.ts`

**Interfaces:**
- Consome: `Decimal` (Tarefa 3), `DataISO`/`Competencia` (Tarefa 4).
- Produz: `formatarMoeda(valor: Decimal): string` ("R$ 1.234,56"; negativo "-R$ 6.957,45"); `formatarData(data: DataISO): string` ("25/05/2018"); `formatarCompetencia(c: Competencia): string` ("mai/2018"); `formatarPercentual(valor: Decimal, casas: number): string` ("16,516129%"); `formatarFator(valor: Decimal): string` ("1,013020"). Usados nos avisos e na memória do motor (Tarefa 10) e, depois, na interface e no relatório.

Feito à mão, sem `Intl`, para não converter `Decimal` em número de ponto flutuante.

- [ ] **Passo 1: Escrever os testes**

`src/compartilhado/formatacao.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { decimal } from "./decimal.ts";
import {
  formatarCompetencia,
  formatarData,
  formatarFator,
  formatarMoeda,
  formatarPercentual,
} from "./formatacao.ts";

describe("formatação pt-BR", () => {
  it("formata moeda com separador de milhar e duas casas", () => {
    expect(formatarMoeda(decimal("1234.5"))).toBe("R$ 1.234,50");
    expect(formatarMoeda(decimal("0"))).toBe("R$ 0,00");
    expect(formatarMoeda(decimal("451.91"))).toBe("R$ 451,91");
    expect(formatarMoeda(decimal("1000000"))).toBe("R$ 1.000.000,00");
    expect(formatarMoeda(decimal("-6957.45"))).toBe("-R$ 6.957,45");
    expect(formatarMoeda(decimal("7145.725"))).toBe("R$ 7.145,73");
  });

  it("formata data e competência", () => {
    expect(formatarData("2018-05-25")).toBe("25/05/2018");
    expect(formatarCompetencia("2018-05")).toBe("mai/2018");
    expect(formatarCompetencia("2017-01")).toBe("jan/2017");
    expect(formatarCompetencia("2024-12")).toBe("dez/2024");
  });

  it("formata percentual e fator com vírgula e casas fixas", () => {
    expect(formatarPercentual(decimal("16.516129"), 6)).toBe("16,516129%");
    expect(formatarPercentual(decimal("1"), 2)).toBe("1,00%");
    expect(formatarFator(decimal("1.01302"))).toBe("1,013020");
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Execute: `npm test`
Esperado: falha ao importar `./formatacao.ts`.

- [ ] **Passo 3: Implementar `src/compartilhado/formatacao.ts`**

```ts
import type { Competencia, DataISO } from "./datas.ts";
import { paraTexto, type Decimal } from "./decimal.ts";

const MESES_ABREVIADOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "R$ 1.234,56"; valores negativos como "-R$ 6.957,45". */
export function formatarMoeda(valor: Decimal): string {
  const partes = paraTexto(valor.abs(), 2).split(".");
  const inteiro = (partes[0] ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const centavos = partes[1] ?? "00";
  return `${valor.isNegative() ? "-" : ""}R$ ${inteiro},${centavos}`;
}

/** "2018-05-25" → "25/05/2018". */
export function formatarData(data: DataISO): string {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`;
}

/** "2018-05" → "mai/2018". */
export function formatarCompetencia(competencia: Competencia): string {
  const mes = Number(competencia.slice(5, 7));
  return `${MESES_ABREVIADOS[mes - 1] ?? "?"}/${competencia.slice(0, 4)}`;
}

/** "16,516129%" */
export function formatarPercentual(valor: Decimal, casas: number): string {
  return `${paraTexto(valor, casas).replace(".", ",")}%`;
}

/** "1,013020" (sempre 6 casas) */
export function formatarFator(valor: Decimal): string {
  return paraTexto(valor, 6).replace(".", ",");
}
```

- [ ] **Passo 4: Rodar e ver passar**

Execute: `npm test`
Esperado: todos passam.

- [ ] **Passo 5: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add src/compartilhado/formatacao.ts src/compartilhado/formatacao.test.ts && git commit -m "compartilhado: formatação pt-BR de moeda, datas, percentuais e fatores" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tarefa 6: Tipos do domínio e metodologia padrão "TJMS/SAJ v1"

**Arquivos:**
- Criar: `src/compartilhado/tipos.ts`, `src/metodologias/tjms-saj.v1.json`, `src/metodologias/padrao.ts`
- Teste: `src/compartilhado/tipos.test.ts`, `src/metodologias/padrao.test.ts`

**Interfaces:**
- Consome: `DataISO`, `Competencia` (Tarefa 4), `TextoDecimal` (Tarefa 3).
- Produz: todos os tipos da §5 do design (`Calculo`, `Lancamento`, `EncargosProprios`, `Metodologia`, `PeriodoMetodologia`, `RegraJuros`, `Resultado`, `LancamentoCalculado`, `Totais`, `IndiceAplicado`, `DetalheJuros`), os tipos de índices (`CodigoSerie`, `ValorIndice`, `TabelaIndices`, `ArquivoSerie`), o tipo `CasoDeReferencia`, os mapas `CODIGO_DA_SERIE` (nome → código) e `NOME_DA_SERIE` (código → nome), e `metodologiaPadrao(): Metodologia` (cópia nova a cada chamada).

Os tipos são o contrato de todas as fases; definidos agora por inteiro para que as fases 2 a 6 não os reescrevam. Nesta fase o motor preenche só o que lhe cabe (multa e honorários ficam `"0.00"`, por exemplo).

- [ ] **Passo 1: Escrever os testes**

`src/compartilhado/tipos.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { CODIGO_DA_SERIE, NOME_DA_SERIE } from "./tipos.ts";

describe("séries do BCB", () => {
  it("mapeia nome de índice para código e volta", () => {
    expect(CODIGO_DA_SERIE["IGP-M"]).toBe("189");
    expect(CODIGO_DA_SERIE.INPC).toBe("188");
    expect(CODIGO_DA_SERIE.IPCA).toBe("433");
    expect(NOME_DA_SERIE["189"]).toBe("IGP-M");
    expect(NOME_DA_SERIE["1619"]).toBe("salário mínimo");
    expect(NOME_DA_SERIE["29543"]).toBe("taxa legal");
    expect(NOME_DA_SERIE["4390"]).toBe("SELIC");
  });
});
```

`src/metodologias/padrao.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { metodologiaPadrao } from "./padrao.ts";

describe("metodologia padrão TJMS/SAJ v1", () => {
  it("tem os dois períodos da Lei 14.905/2024 e os padrões do design", () => {
    const m = metodologiaPadrao();
    expect(m.id).toBe("tjms-saj");
    expect(m.versao).toBe(1);
    expect(m.nome).toBe("TJMS/SAJ");
    expect(m.ajustada).toBe(false);
    expect(m.periodos).toEqual([
      {
        de: null,
        ate: "2024-08-29",
        correcao: { indice: "IGP-M" },
        juros: { tipo: "percentualMensal", taxaMensal: "1" },
      },
      { de: "2024-08-30", ate: null, correcao: { indice: "IPCA" }, juros: { tipo: "taxaLegal" } },
    ]);
    expect(m.incidenciaMesInicial).toBe("proRata");
    expect(m.deflacao).toBe("aplicarComPiso");
    expect(m.arredondamento).toEqual({ fatorCasas: 6, percentualCasas: 6, valorCasas: 2, modo: "comercial" });
  });

  it("devolve uma cópia independente a cada chamada", () => {
    const a = metodologiaPadrao();
    const b = metodologiaPadrao();
    a.ajustada = true;
    a.periodos.pop();
    expect(b.ajustada).toBe(false);
    expect(b.periodos).toHaveLength(2);
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Execute: `npm test`
Esperado: falhas ao importar `./tipos.ts` e `./padrao.ts`.

- [ ] **Passo 3: Escrever `src/compartilhado/tipos.ts`**

```ts
import type { Competencia, DataISO } from "./datas.ts";
import type { TextoDecimal } from "./decimal.ts";

export type { Competencia, DataISO, TextoDecimal };

// ---------------------------------------------------------------------------------------------
// Séries do BCB/SGS
// ---------------------------------------------------------------------------------------------

/** Códigos das séries do SGS usadas pelo Apura (§8.1 do design). */
export type CodigoSerie = "433" | "188" | "189" | "1619" | "29543" | "4390";

export type NomeIndice = "IGP-M" | "INPC" | "IPCA";
export type IndiceCorrecao = NomeIndice | "nenhum";
export type IndiceReajuste = NomeIndice | "SM" | "nenhum";

export const CODIGO_DA_SERIE: Record<NomeIndice | "SM" | "taxaLegal" | "SELIC", CodigoSerie> = {
  "IGP-M": "189",
  INPC: "188",
  IPCA: "433",
  SM: "1619",
  taxaLegal: "29543",
  SELIC: "4390",
};

export const NOME_DA_SERIE: Record<CodigoSerie, string> = {
  "189": "IGP-M",
  "188": "INPC",
  "433": "IPCA",
  "1619": "salário mínimo",
  "29543": "taxa legal",
  "4390": "SELIC",
};

/** Um valor de índice com proveniência (§8.3). */
export interface ValorIndice {
  valor: TextoDecimal;
  fonte: "embutida" | "aoVivo";
  /** data-hora ISO em que o valor foi obtido do BCB (ou gravado na cópia embutida) */
  obtidoEm: string;
}

/** Tabela de índices congelada para um cálculo: por código de série, por competência. */
export interface TabelaIndices {
  /** data-hora ISO da consulta que originou a tabela */
  consultadoEm: string;
  series: Partial<Record<CodigoSerie, Record<Competencia, ValorIndice>>>;
}

/** Arquivo `dados/indices/<codigo>.json`, gerado por `scripts/atualizar-indices.ts`. */
export interface ArquivoSerie {
  formato: "apura/serie@1";
  codigo: CodigoSerie;
  nome: string;
  origem: string;
  obtidoEm: string;
  valores: Array<{ competencia: Competencia; valor: TextoDecimal }>;
}

// ---------------------------------------------------------------------------------------------
// Metodologia (§5.3)
// ---------------------------------------------------------------------------------------------

export type RegraJuros =
  | { tipo: "percentualMensal"; taxaMensal: TextoDecimal }
  | { tipo: "taxaLegal" }
  | { tipo: "selicUnica" };

export interface PeriodoMetodologia {
  de: DataISO | null;
  ate: DataISO | null;
  correcao: { indice: IndiceCorrecao };
  juros: RegraJuros;
}

export interface Metodologia {
  id: string;
  versao: number;
  nome: string;
  ajustada: boolean;
  periodos: PeriodoMetodologia[];
  incidenciaMesInicial: "proRata" | "mesSeguinte";
  deflacao: "aplicarComPiso" | "aplicarSemPiso" | "zerarNegativos";
  arredondamento: { fatorCasas: number; percentualCasas: number; valorCasas: number; modo: "comercial" };
}

// ---------------------------------------------------------------------------------------------
// Cálculo (§5.2)
// ---------------------------------------------------------------------------------------------

export interface Cabecalho {
  defensor: string;
  orgao: string;
  processo: string;
  exequente: string;
  executado: string;
}

export type Base =
  | {
      tipo: "valorFixo";
      valor: TextoDecimal;
      dataFixacao: DataISO;
      indiceReajuste: IndiceReajuste;
      /** mês do reajuste anual, 1 a 12 */
      mesReajuste: number;
    }
  | { tipo: "percentualSalarioMinimo"; percentual: TextoDecimal }
  | { tipo: "percentualRendimentos"; percentual: TextoDecimal; rendimentoPadrao: TextoDecimal };

export interface LotePrestacoes {
  diaVencimento: number;
  mesesEmAtraso?: number;
  de?: Competencia;
  ate?: Competencia;
}

export interface LoteAmortizacoes {
  valorMensal: TextoDecimal;
  diaPagamento: number;
  de: Competencia;
  ate: Competencia;
}

export interface EncargosProprios {
  termoInicialCorrecao?: DataISO;
  termoFinalCorrecao?: DataISO;
  termoInicialJuros?: DataISO;
  termoFinalJuros?: DataISO;
  metodologia?: Metodologia;
}

export interface Lancamento {
  id: string;
  tipo: "prestacao" | "amortizacao";
  /** vencimento (prestação) ou data do pagamento (amortização) */
  data: DataISO;
  competencia?: Competencia;
  descricao?: string;
  /** amortizações sempre; prestações só se editadas à mão ou avulsas */
  valorInformado?: TextoDecimal;
  rendimento?: TextoDecimal;
  encargos?: EncargosProprios;
  origem: "lote" | "avulso";
  editado: boolean;
}

export interface Calculo {
  formato: "apura/calculo@1";
  tipo: "alimentos";
  id: string;
  criadoEm: string;
  atualizadoEm: string;
  dataElaboracao: DataISO;
  cabecalho: Cabecalho;
  base: Base;
  lotes: { ultimoLotePrestacoes?: LotePrestacoes; ultimoLoteAmortizacoes?: LoteAmortizacoes };
  lancamentos: Lancamento[];
  /** cópia da metodologia aplicada */
  metodologia: Metodologia;
  acrescimos: { multaPercentual: TextoDecimal; honorariosPercentual: TextoDecimal };
  observacoes: string;
}

// ---------------------------------------------------------------------------------------------
// Resultado (§5.4)
// ---------------------------------------------------------------------------------------------

/** Um mês da memória de correção. `serie` nula = período sem correção; `valor` nulo = sem índice. */
export interface IndiceAplicado {
  serie: CodigoSerie | null;
  competencia: Competencia;
  valor: TextoDecimal | null;
  /** fração do mês aplicada: "1" (mês inteiro), "21/31" (pro rata) ou "0/31" (mês não entra) */
  fracao: string;
}

export interface DetalheJuros {
  regime: RegraJuros["tipo"];
  de: DataISO;
  ate: DataISO;
  dias: number;
  diasDoMes?: number;
  taxa: TextoDecimal;
  percentual: TextoDecimal;
}

export interface LancamentoCalculado {
  id: string;
  tipo: Lancamento["tipo"];
  data: DataISO;
  competencia?: Competencia;
  descricao?: string;
  valorBase: TextoDecimal;
  memoriaBase: string;
  correcao: { fator: TextoDecimal; indices: IndiceAplicado[]; pisoAplicado: boolean };
  corrigido: TextoDecimal;
  juros: { percentual: TextoDecimal; detalhe: DetalheJuros[] };
  jurosValor: TextoDecimal;
  atualizado: TextoDecimal;
  avisos: string[];
}

export interface Totais {
  prestacoes: TextoDecimal;
  amortizacoes: TextoDecimal;
  totalDevido: TextoDecimal;
  multa: TextoDecimal;
  honorarios: TextoDecimal;
  totalGeral: TextoDecimal;
}

export interface IndiceUsado {
  serie: CodigoSerie;
  competencia: Competencia;
  valor: TextoDecimal;
  fonte: ValorIndice["fonte"];
  obtidoEm: string;
}

export interface Resultado {
  lancamentos: LancamentoCalculado[];
  totais: Totais;
  indicesUsados: IndiceUsado[];
  consultaIndices: {
    em: string;
    series: CodigoSerie[];
    ultimoMesPorSerie: Partial<Record<CodigoSerie, Competencia>>;
  };
  avisos: string[];
}

// ---------------------------------------------------------------------------------------------
// Caso de referência (§11): arquivo em src/motor/casos/*.json
// ---------------------------------------------------------------------------------------------

export interface LancamentoEsperado {
  id: string;
  corrigido: TextoDecimal;
  jurosValor: TextoDecimal;
  atualizado: TextoDecimal;
  fator?: TextoDecimal;
  jurosPercentual?: TextoDecimal;
}

export interface CasoDeReferencia {
  formato: "apura/caso-de-referencia@1";
  nome: string;
  fonte: string;
  observacoes?: string;
  calculo: Calculo;
  indices: TabelaIndices;
  esperado: { lancamentos: LancamentoEsperado[]; totais: Totais };
}
```

- [ ] **Passo 4: Escrever `src/metodologias/tjms-saj.v1.json` e `src/metodologias/padrao.ts`**

`src/metodologias/tjms-saj.v1.json`:
```json
{
  "id": "tjms-saj",
  "versao": 1,
  "nome": "TJMS/SAJ",
  "ajustada": false,
  "periodos": [
    {
      "de": null,
      "ate": "2024-08-29",
      "correcao": { "indice": "IGP-M" },
      "juros": { "tipo": "percentualMensal", "taxaMensal": "1" }
    },
    {
      "de": "2024-08-30",
      "ate": null,
      "correcao": { "indice": "IPCA" },
      "juros": { "tipo": "taxaLegal" }
    }
  ],
  "incidenciaMesInicial": "proRata",
  "deflacao": "aplicarComPiso",
  "arredondamento": { "fatorCasas": 6, "percentualCasas": 6, "valorCasas": 2, "modo": "comercial" }
}
```

`src/metodologias/padrao.ts`:
```ts
import type { Metodologia } from "../compartilhado/tipos.ts";
import tjmsSajV1 from "./tjms-saj.v1.json";

/** Cópia nova da metodologia padrão "TJMS/SAJ v1": cada cálculo guarda e pode ajustar a sua. */
export function metodologiaPadrao(): Metodologia {
  return structuredClone(tjmsSajV1 as Metodologia);
}
```

- [ ] **Passo 5: Rodar e ver passar**

Execute: `npm test`
Esperado: todos passam.

- [ ] **Passo 6: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add src/compartilhado/tipos.ts src/compartilhado/tipos.test.ts src/metodologias && git commit -m "compartilhado: tipos do cálculo, resultado e índices; metodologia padrão TJMS/SAJ v1" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tarefa 7: Períodos da metodologia (qual regra vale em cada data)

**Arquivos:**
- Criar: `src/motor/periodos.ts`
- Teste: `src/motor/periodos.test.ts`

**Interfaces:**
- Consome: `Metodologia`, `PeriodoMetodologia`, `DataISO` (Tarefa 6); `metodologiaPadrao()` nos testes.
- Produz:
  - `periodoVigenteEm(metodologia: Metodologia, data: DataISO): PeriodoMetodologia | undefined` — o período cujo intervalo `[de, ate]` (nulos = aberto) contém a data.
  - `interface TrechoDePeriodo { periodo: PeriodoMetodologia; de: DataISO; ate: DataISO }`; `dividirPorPeriodos(metodologia: Metodologia, de: DataISO, ate: DataISO): TrechoDePeriodo[]` — recorta `[de, ate]` pelos períodos, em ordem cronológica; dias que nenhum período cobre ficam de fora; vazio se `ate < de`.

- [ ] **Passo 1: Escrever os testes**

`src/motor/periodos.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import type { Metodologia } from "../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../metodologias/padrao.ts";
import { dividirPorPeriodos, periodoVigenteEm } from "./periodos.ts";

describe("períodos da metodologia", () => {
  const padrao = metodologiaPadrao();

  it("encontra o período vigente em uma data (transição em 30/08/2024)", () => {
    expect(periodoVigenteEm(padrao, "2017-01-01")?.correcao.indice).toBe("IGP-M");
    expect(periodoVigenteEm(padrao, "2024-08-29")?.correcao.indice).toBe("IGP-M");
    expect(periodoVigenteEm(padrao, "2024-08-30")?.correcao.indice).toBe("IPCA");
    expect(periodoVigenteEm(padrao, "2026-10-10")?.juros.tipo).toBe("taxaLegal");
  });

  it("devolve undefined quando nenhum período cobre a data", () => {
    const comBuraco: Metodologia = {
      ...padrao,
      periodos: [
        {
          de: "2020-01-01",
          ate: "2020-12-31",
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "1" },
        },
      ],
    };
    expect(periodoVigenteEm(comBuraco, "2021-01-01")).toBeUndefined();
    expect(periodoVigenteEm(comBuraco, "2020-06-15")).toBeDefined();
  });

  it("divide um intervalo pelos períodos, em ordem cronológica", () => {
    const trechos = dividirPorPeriodos(padrao, "2024-08-01", "2024-09-30");
    expect(trechos.map((t) => [t.de, t.ate, t.periodo.correcao.indice])).toEqual([
      ["2024-08-01", "2024-08-29", "IGP-M"],
      ["2024-08-30", "2024-09-30", "IPCA"],
    ]);
  });

  it("intervalo dentro de um único período e intervalo invertido", () => {
    const unico = dividirPorPeriodos(padrao, "2017-01-10", "2018-05-25");
    expect(unico).toHaveLength(1);
    expect(unico[0]).toMatchObject({ de: "2017-01-10", ate: "2018-05-25" });
    expect(dividirPorPeriodos(padrao, "2018-05-25", "2017-01-10")).toEqual([]);
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Execute: `npm test`
Esperado: falha ao importar `./periodos.ts`.

- [ ] **Passo 3: Implementar `src/motor/periodos.ts`**

```ts
import type { DataISO, Metodologia, PeriodoMetodologia } from "../compartilhado/tipos.ts";

/** O período da metodologia cujo intervalo [de, ate] (nulos = aberto) contém a data. */
export function periodoVigenteEm(
  metodologia: Metodologia,
  data: DataISO,
): PeriodoMetodologia | undefined {
  return metodologia.periodos.find(
    (periodo) =>
      (periodo.de === null || periodo.de <= data) && (periodo.ate === null || data <= periodo.ate),
  );
}

export interface TrechoDePeriodo {
  periodo: PeriodoMetodologia;
  de: DataISO;
  ate: DataISO;
}

/**
 * Recorta o intervalo [de, ate] pelos períodos da metodologia, em ordem cronológica.
 * Dias que nenhum período cobre ficam de fora (quem chama avisa). Vazio se `ate` < `de`.
 */
export function dividirPorPeriodos(
  metodologia: Metodologia,
  de: DataISO,
  ate: DataISO,
): TrechoDePeriodo[] {
  const trechos: TrechoDePeriodo[] = [];
  if (ate < de) return trechos;
  for (const periodo of metodologia.periodos) {
    const inicio = periodo.de !== null && periodo.de > de ? periodo.de : de;
    const fim = periodo.ate !== null && periodo.ate < ate ? periodo.ate : ate;
    if (inicio <= fim) trechos.push({ periodo, de: inicio, ate: fim });
  }
  return trechos.sort((a, b) => (a.de < b.de ? -1 : a.de > b.de ? 1 : 0));
}
```

- [ ] **Passo 4: Rodar e ver passar**

Execute: `npm test`
Esperado: todos passam.

- [ ] **Passo 5: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add src/motor/periodos.ts src/motor/periodos.test.ts && git commit -m "motor: período da metodologia vigente em cada data" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tarefa 8: Fator de correção (pro rata geométrico, meses inteiros, mês final, meses faltantes, deflação)

**Arquivos:**
- Criar: `src/motor/correcao.ts`, `src/motor/testes/indices-igpm-2017-2018.ts` (tabela compartilhada pelos testes)
- Teste: `src/motor/correcao.test.ts`

**Interfaces:**
- Consome: `datas.ts` (Tarefa 4), `decimal.ts` (Tarefa 3), tipos (Tarefa 6), `periodoVigenteEm` (Tarefa 7).
- Produz:
  - `interface IndiceMensal { competencia: Competencia; serie: CodigoSerie | null; valor: TextoDecimal | null }` — `serie` nula = período sem correção; `valor` nulo = mês sem índice na tabela.
  - `resolverIndicesMensais(metodologia: Metodologia, tabela: TabelaIndices, de: Competencia, ate: Competencia): IndiceMensal[]` — um item por mês; a série vem do período vigente no dia 1 do mês.
  - `interface ParametrosCorrecao { termoInicial: DataISO; termoFinal: DataISO; indices: IndiceMensal[]; incidenciaMesInicial: Metodologia["incidenciaMesInicial"]; deflacao: Metodologia["deflacao"]; casas: number }`
  - `interface ResultadoCorrecao { fator: Decimal; indices: IndiceAplicado[]; pisoAplicado: boolean; mesesSemIndice: Competencia[] }` — `fator` já arredondado a `casas` e elevado a 1 se o piso atuou.
  - `fatorCorrecao(p: ParametrosCorrecao): ResultadoCorrecao`
  - Fixture de teste: `IGPM_2017_2018: Record<Competencia, string>` e `tabelaIgpm(ateCompetencia = "2018-04", excluir: Competencia[] = []): TabelaIndices` — a tabela congelada como estava em 25/05/2018 (até abr/2018), com opção de limitar o último mês e de excluir competências para simular lacunas.

Regras (§6.4 do design): mês do termo inicial com `proRata` → `(1 + i/100)^((diasDoMes − dia) ÷ diasDoMes)`; com `mesSeguinte` o mês não entra. Meses seguintes inteiros. Mês do termo final: se o índice existe, `(1 + i/100)^(dia ÷ diasDoMes)`; se não existe, fator 1 e o mês vai para `mesesSemIndice`. Meses intermediários sem índice: fator 1 e aviso. Termo inicial e final no mesmo mês: uma única fração `(diaFinal − diaInicial) ÷ diasDoMes`. Deflação: `aplicarComPiso` eleva a 1 se o fator arredondado ficar abaixo de 1 (e marca `pisoAplicado`); `aplicarSemPiso` aplica como está; `zerarNegativos` trata cada índice negativo como zero. O fator é arredondado a `casas` **antes** de ser usado.

- [ ] **Passo 1: Criar a tabela de teste `src/motor/testes/indices-igpm-2017-2018.ts`**

```ts
import type { Competencia, TabelaIndices, ValorIndice } from "../../compartilhado/tipos.ts";

/** IGP-M (série 189 do BCB), variação % mensal, jan/2017 a mai/2018 (Anexo A do design). */
export const IGPM_2017_2018: Record<Competencia, string> = {
  "2017-01": "0.64",
  "2017-02": "0.08",
  "2017-03": "0.01",
  "2017-04": "-1.10",
  "2017-05": "-0.93",
  "2017-06": "-0.67",
  "2017-07": "-0.72",
  "2017-08": "0.10",
  "2017-09": "0.47",
  "2017-10": "0.20",
  "2017-11": "0.52",
  "2017-12": "0.89",
  "2018-01": "0.76",
  "2018-02": "0.07",
  "2018-03": "0.64",
  "2018-04": "0.57",
  "2018-05": "1.38",
};

/**
 * Tabela congelada como estava em 25/05/2018 (até abr/2018, por padrão; maio ainda não
 * divulgado). `ateCompetencia` muda o último mês; `excluir` remove meses para simular lacunas.
 */
export function tabelaIgpm(
  ateCompetencia: Competencia = "2018-04",
  excluir: Competencia[] = [],
): TabelaIndices {
  const valores: Record<Competencia, ValorIndice> = {};
  for (const [competencia, valor] of Object.entries(IGPM_2017_2018)) {
    if (competencia <= ateCompetencia && !excluir.includes(competencia)) {
      valores[competencia] = { valor, fonte: "embutida", obtidoEm: "2026-10-10T00:00:00.000Z" };
    }
  }
  return { consultadoEm: "2018-05-25T00:00:00.000Z", series: { "189": valores } };
}
```

- [ ] **Passo 2: Escrever os testes**

`src/motor/correcao.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { paraTexto } from "../compartilhado/decimal.ts";
import type { Competencia, Metodologia, TabelaIndices } from "../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../metodologias/padrao.ts";
import { fatorCorrecao, resolverIndicesMensais } from "./correcao.ts";
import { tabelaIgpm } from "./testes/indices-igpm-2017-2018.ts";

describe("resolverIndicesMensais", () => {
  it("escolhe a série pelo período vigente no dia 1 de cada mês e marca os meses sem valor", () => {
    expect(resolverIndicesMensais(metodologiaPadrao(), tabelaIgpm(), "2018-03", "2018-05")).toEqual([
      { competencia: "2018-03", serie: "189", valor: "0.64" },
      { competencia: "2018-04", serie: "189", valor: "0.57" },
      { competencia: "2018-05", serie: "189", valor: null },
    ]);
  });

  it("devolve série nula quando o período não tem correção", () => {
    const semCorrecao: Metodologia = {
      ...metodologiaPadrao(),
      periodos: [
        {
          de: null,
          ate: null,
          correcao: { indice: "nenhum" },
          juros: { tipo: "percentualMensal", taxaMensal: "1" },
        },
      ],
    };
    expect(resolverIndicesMensais(semCorrecao, tabelaIgpm(), "2017-01", "2017-02")).toEqual([
      { competencia: "2017-01", serie: null, valor: null },
      { competencia: "2017-02", serie: null, valor: null },
    ]);
  });

  it("devolve lista vazia quando o intervalo de competências é invertido", () => {
    expect(resolverIndicesMensais(metodologiaPadrao(), tabelaIgpm(), "2018-05", "2017-01")).toEqual([]);
  });
});

describe("fatorCorrecao", () => {
  const opcoes = { incidenciaMesInicial: "proRata", deflacao: "aplicarComPiso", casas: 6 } as const;
  const indicesDe = (de: Competencia, ate: Competencia, tabela: TabelaIndices = tabelaIgpm()) =>
    resolverIndicesMensais(metodologiaPadrao(), tabela, de, ate);

  it("reproduz o fator do SAJ para 10/01/2017 → 25/05/2018: pro rata no mês inicial, meses inteiros, maio sem índice", () => {
    const r = fatorCorrecao({
      ...opcoes,
      termoInicial: "2017-01-10",
      termoFinal: "2018-05-25",
      indices: indicesDe("2017-01", "2018-05"),
    });
    expect(paraTexto(r.fator, 6)).toBe("1.013020");
    expect(r.indices).toHaveLength(17);
    expect(r.indices[0]).toEqual({ serie: "189", competencia: "2017-01", valor: "0.64", fracao: "21/31" });
    expect(r.indices[1]).toEqual({ serie: "189", competencia: "2017-02", valor: "0.08", fracao: "1" });
    expect(r.indices[16]).toEqual({ serie: "189", competencia: "2018-05", valor: null, fracao: "25/31" });
    expect(r.mesesSemIndice).toEqual(["2018-05"]);
    expect(r.pisoAplicado).toBe(false);
  });

  it("índices negativos entram com o sinal que têm (10/04/2017 → 25/05/2018 passa por quatro meses negativos)", () => {
    const r = fatorCorrecao({
      ...opcoes,
      termoInicial: "2017-04-10",
      termoFinal: "2018-05-25",
      indices: indicesDe("2017-04", "2018-05"),
    });
    expect(paraTexto(r.fator, 6)).toBe("1.011467");
    expect(r.pisoAplicado).toBe(false);
  });

  it("com incidência 'mesSeguinte' o mês do lançamento não entra", () => {
    const r = fatorCorrecao({
      ...opcoes,
      incidenciaMesInicial: "mesSeguinte",
      termoInicial: "2017-01-10",
      termoFinal: "2018-05-25",
      indices: indicesDe("2017-01", "2018-05"),
    });
    expect(paraTexto(r.fator, 6)).toBe("1.008652");
    expect(r.indices[0]).toEqual({ serie: "189", competencia: "2017-01", valor: "0.64", fracao: "0/31" });
  });

  it("aplica pro rata do mês final quando o índice dele existe", () => {
    const r = fatorCorrecao({
      ...opcoes,
      termoInicial: "2017-01-10",
      termoFinal: "2017-03-15",
      indices: indicesDe("2017-01", "2017-03"),
    });
    expect(paraTexto(r.fator, 6)).toBe("1.005183");
    expect(r.indices[2]).toEqual({ serie: "189", competencia: "2017-03", valor: "0.01", fracao: "15/31" });
  });

  it("usa uma única fração quando o lançamento e o termo final caem no mesmo mês", () => {
    const r = fatorCorrecao({
      ...opcoes,
      termoInicial: "2018-05-10",
      termoFinal: "2018-05-25",
      indices: indicesDe("2018-05", "2018-05", tabelaIgpm("2018-05")),
    });
    expect(paraTexto(r.fator, 6)).toBe("1.006654");
    expect(r.indices).toEqual([{ serie: "189", competencia: "2018-05", valor: "1.38", fracao: "15/31" }]);
  });

  it("lançamento no último dia do mês: o mês do lançamento tem fração zero", () => {
    const r = fatorCorrecao({
      ...opcoes,
      termoInicial: "2017-01-31",
      termoFinal: "2017-02-01",
      indices: indicesDe("2017-01", "2017-02"),
    });
    expect(paraTexto(r.fator, 6)).toBe("1.000029");
    expect(r.indices[0]?.fracao).toBe("0/31");
    expect(r.indices[1]?.fracao).toBe("1/28");
  });

  it("mês sem índice no meio do período entra com fator 1 e é listado", () => {
    const r = fatorCorrecao({
      ...opcoes,
      termoInicial: "2017-01-10",
      termoFinal: "2018-05-25",
      indices: indicesDe("2017-01", "2018-05", tabelaIgpm("2018-04", ["2017-10"])),
    });
    expect(paraTexto(r.fator, 6)).toBe("1.010998");
    expect(r.mesesSemIndice).toEqual(["2017-10", "2018-05"]);
    expect(r.indices[9]).toEqual({ serie: "189", competencia: "2017-10", valor: null, fracao: "1" });
  });

  it("trata a deflação conforme a opção: piso, sem piso ou zerar negativos", () => {
    const indices = indicesDe("2017-04", "2017-07");
    const termos = { termoInicial: "2017-04-01", termoFinal: "2017-07-31" } as const;
    const comPiso = fatorCorrecao({ ...opcoes, ...termos, indices });
    expect(paraTexto(comPiso.fator, 6)).toBe("1.000000");
    expect(comPiso.pisoAplicado).toBe(true);
    const semPiso = fatorCorrecao({ ...opcoes, ...termos, deflacao: "aplicarSemPiso", indices });
    expect(paraTexto(semPiso.fator, 6)).toBe("0.966587");
    expect(semPiso.pisoAplicado).toBe(false);
    const zerando = fatorCorrecao({ ...opcoes, ...termos, deflacao: "zerarNegativos", indices });
    expect(paraTexto(zerando.fator, 6)).toBe("1.000000");
    expect(zerando.pisoAplicado).toBe(false);
  });

  it("termo final anterior ao inicial: fator 1, sem índices e sem avisos", () => {
    const r = fatorCorrecao({ ...opcoes, termoInicial: "2018-06-10", termoFinal: "2018-05-25", indices: [] });
    expect(paraTexto(r.fator, 6)).toBe("1.000000");
    expect(r.indices).toEqual([]);
    expect(r.mesesSemIndice).toEqual([]);
  });

  it("período sem correção ('nenhum') dá fator 1 sem aviso", () => {
    const r = fatorCorrecao({
      ...opcoes,
      termoInicial: "2017-01-10",
      termoFinal: "2017-02-20",
      indices: [
        { competencia: "2017-01", serie: null, valor: null },
        { competencia: "2017-02", serie: null, valor: null },
      ],
    });
    expect(paraTexto(r.fator, 6)).toBe("1.000000");
    expect(r.mesesSemIndice).toEqual([]);
    expect(r.indices[0]).toEqual({ serie: null, competencia: "2017-01", valor: null, fracao: "21/31" });
  });
});
```

- [ ] **Passo 3: Rodar e ver falhar**

Execute: `npm test`
Esperado: falha ao importar `./correcao.ts`.

- [ ] **Passo 4: Implementar `src/motor/correcao.ts`**

```ts
import {
  competenciaDe,
  competenciasEntre,
  decompor,
  decomporCompetencia,
  diasDoMes,
  primeiroDiaDoMes,
} from "../compartilhado/datas.ts";
import { arredondar, CEM, decimal, UM, ZERO, type Decimal } from "../compartilhado/decimal.ts";
import { CODIGO_DA_SERIE } from "../compartilhado/tipos.ts";
import type {
  CodigoSerie,
  Competencia,
  DataISO,
  IndiceAplicado,
  Metodologia,
  TabelaIndices,
  TextoDecimal,
} from "../compartilhado/tipos.ts";
import { periodoVigenteEm } from "./periodos.ts";

export interface IndiceMensal {
  competencia: Competencia;
  /** nula quando o período vigente não tem correção ("nenhum") */
  serie: CodigoSerie | null;
  /** nulo quando a tabela não tem o mês (ainda não divulgado ou faltante) */
  valor: TextoDecimal | null;
}

/**
 * Para cada mês de `de` a `ate`, qual série e valor se aplicam: a série vem do período da
 * metodologia vigente no dia 1 do mês (§6.4, itens 4 e 8); o valor vem da tabela congelada.
 */
export function resolverIndicesMensais(
  metodologia: Metodologia,
  tabela: TabelaIndices,
  de: Competencia,
  ate: Competencia,
): IndiceMensal[] {
  return competenciasEntre(de, ate).map((competencia) => {
    const indice =
      periodoVigenteEm(metodologia, primeiroDiaDoMes(competencia))?.correcao.indice ?? "nenhum";
    if (indice === "nenhum") return { competencia, serie: null, valor: null };
    const serie = CODIGO_DA_SERIE[indice];
    return { competencia, serie, valor: tabela.series[serie]?.[competencia]?.valor ?? null };
  });
}

export interface ParametrosCorrecao {
  termoInicial: DataISO;
  termoFinal: DataISO;
  /** um item por mês, do mês do termo inicial ao mês do termo final */
  indices: IndiceMensal[];
  incidenciaMesInicial: Metodologia["incidenciaMesInicial"];
  deflacao: Metodologia["deflacao"];
  /** casas decimais do fator (6 na metodologia padrão) */
  casas: number;
}

export interface ResultadoCorrecao {
  /** já arredondado a `casas`; elevado a 1 quando o piso atua */
  fator: Decimal;
  indices: IndiceAplicado[];
  pisoAplicado: boolean;
  /** competências com série definida mas sem valor na tabela */
  mesesSemIndice: Competencia[];
}

/**
 * Fator de correção (§6.4): pro rata geométrico no mês do termo inicial, meses inteiros,
 * pro rata no mês do termo final quando o índice dele existe, meses sem índice com fator 1,
 * deflação conforme a opção. Fator 1 quando o termo final é anterior ao inicial.
 */
export function fatorCorrecao(p: ParametrosCorrecao): ResultadoCorrecao {
  const indices: IndiceAplicado[] = [];
  const mesesSemIndice: Competencia[] = [];
  if (p.termoFinal < p.termoInicial) {
    return { fator: arredondar(UM, p.casas), indices, pisoAplicado: false, mesesSemIndice };
  }
  const inicio = decompor(p.termoInicial);
  const fim = decompor(p.termoFinal);
  const competenciaInicial = competenciaDe(p.termoInicial);
  const competenciaFinal = competenciaDe(p.termoFinal);
  let fator = UM;

  for (const mes of p.indices) {
    if (mes.competencia < competenciaInicial || mes.competencia > competenciaFinal) continue;
    const { ano, mes: numeroDoMes } = decomporCompetencia(mes.competencia);
    const dias = diasDoMes(ano, numeroDoMes);
    const ehInicial = mes.competencia === competenciaInicial;
    const ehFinal = mes.competencia === competenciaFinal;

    // Quantos "dias do mês" entram na conta: a fração do mês é numerador ÷ dias.
    let numerador: number;
    if (ehInicial && p.incidenciaMesInicial === "mesSeguinte") numerador = 0;
    else if (ehInicial && ehFinal) numerador = fim.dia - inicio.dia;
    else if (ehInicial) numerador = dias - inicio.dia;
    else if (ehFinal) numerador = fim.dia;
    else numerador = dias;

    indices.push({
      serie: mes.serie,
      competencia: mes.competencia,
      valor: mes.valor,
      fracao: numerador === dias ? "1" : `${numerador}/${dias}`,
    });
    if (mes.serie !== null && mes.valor === null) mesesSemIndice.push(mes.competencia);
    if (mes.valor === null || numerador === 0) continue;

    let variacao = decimal(mes.valor);
    if (p.deflacao === "zerarNegativos" && variacao.isNegative()) variacao = ZERO;
    const fatorDoMes = UM.plus(variacao.div(CEM));
    fator = fator.times(
      numerador === dias ? fatorDoMes : fatorDoMes.pow(decimal(String(numerador)).div(dias)),
    );
  }

  let fatorArredondado = arredondar(fator, p.casas);
  let pisoAplicado = false;
  if (p.deflacao === "aplicarComPiso" && fatorArredondado.lt(UM)) {
    fatorArredondado = arredondar(UM, p.casas);
    pisoAplicado = true;
  }
  return { fator: fatorArredondado, indices, pisoAplicado, mesesSemIndice };
}
```

- [ ] **Passo 5: Rodar e ver passar**

Execute: `npm test`
Esperado: todos passam, inclusive "1.013020" para 10/01/2017.

- [ ] **Passo 6: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add src/motor/correcao.ts src/motor/correcao.test.ts src/motor/testes && git commit -m "motor: fator de correção pro rata com meses faltantes e deflação" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tarefa 9: Juros simples por mês-calendário contando as duas pontas

**Arquivos:**
- Criar: `src/motor/juros.ts`
- Teste: `src/motor/juros.test.ts`

**Interfaces:**
- Consome: `ratearPorMesCalendario` (Tarefa 4), `decimal.ts` (Tarefa 3), `formatarData` (Tarefa 5), tipos (Tarefa 6), `dividirPorPeriodos` (Tarefa 7).
- Produz:
  - `interface ParametrosJuros { termoInicial: DataISO; termoFinal: DataISO; metodologia: Metodologia; casas: number }`
  - `interface ResultadoJuros { percentual: Decimal; detalhe: DetalheJuros[]; avisos: string[] }` — `percentual` já arredondado a `casas`.
  - `jurosSimples(p: ParametrosJuros): ResultadoJuros` — regime antigo (`percentualMensal`): em cada mês tocado, `taxa × dias ÷ diasDoMes`, contando o dia do termo inicial e o dia do termo final; cada período da metodologia aplica a própria taxa aos dias que lhe cabem; os percentuais se somam. Regras `taxaLegal` e `selicUnica` (fase 2): aviso e zero para o trecho. Termo final anterior ao inicial: zero.

- [ ] **Passo 1: Escrever os testes**

`src/motor/juros.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { paraTexto } from "../compartilhado/decimal.ts";
import type { Metodologia } from "../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../metodologias/padrao.ts";
import { jurosSimples } from "./juros.ts";

describe("jurosSimples (regime antigo: percentual mensal rateado por mês-calendário)", () => {
  const padrao = metodologiaPadrao();

  it("reproduz o percentual do SAJ: 10/01/2017 → 25/05/2018 a 1% ao mês = 16,516129%", () => {
    const r = jurosSimples({ termoInicial: "2017-01-10", termoFinal: "2018-05-25", metodologia: padrao, casas: 6 });
    expect(paraTexto(r.percentual, 6)).toBe("16.516129");
    expect(r.detalhe).toHaveLength(17);
    expect(r.detalhe[0]).toEqual({
      regime: "percentualMensal",
      de: "2017-01-10",
      ate: "2017-01-31",
      dias: 22,
      diasDoMes: 31,
      taxa: "1",
      percentual: "0.709677",
    });
    expect(r.detalhe[1]).toMatchObject({ de: "2017-02-01", ate: "2017-02-28", dias: 28, percentual: "1.000000" });
    expect(r.detalhe[16]).toEqual({
      regime: "percentualMensal",
      de: "2018-05-01",
      ate: "2018-05-25",
      dias: 25,
      diasDoMes: 31,
      taxa: "1",
      percentual: "0.806452",
    });
    expect(r.avisos).toEqual([]);
  });

  it("aplica a taxa de cada período aos dias que lhe cabem", () => {
    const doisPeriodos: Metodologia = {
      ...padrao,
      periodos: [
        {
          de: null,
          ate: "2017-12-31",
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "1" },
        },
        {
          de: "2018-01-01",
          ate: null,
          correcao: { indice: "IGP-M" },
          juros: { tipo: "percentualMensal", taxaMensal: "2" },
        },
      ],
    };
    const r = jurosSimples({ termoInicial: "2017-12-10", termoFinal: "2018-01-20", metodologia: doisPeriodos, casas: 6 });
    expect(r.detalhe.map((d) => [d.de, d.ate, d.taxa, d.percentual])).toEqual([
      ["2017-12-10", "2017-12-31", "1", "0.709677"],
      ["2018-01-01", "2018-01-20", "2", "1.290323"],
    ]);
    expect(paraTexto(r.percentual, 6)).toBe("2.000000");
  });

  it("fevereiro bissexto conta 29 dias no denominador", () => {
    const r = jurosSimples({ termoInicial: "2024-02-10", termoFinal: "2024-03-05", metodologia: padrao, casas: 6 });
    expect(paraTexto(r.percentual, 6)).toBe("0.850945");
    expect(r.detalhe[0]).toMatchObject({ dias: 20, diasDoMes: 29, percentual: "0.689655" });
    expect(r.detalhe[1]).toMatchObject({ dias: 5, diasDoMes: 31, percentual: "0.161290" });
  });

  it("um único dia rende 1/diasDoMes da taxa; termo inicial posterior ao final rende zero", () => {
    const umDia = jurosSimples({ termoInicial: "2018-05-25", termoFinal: "2018-05-25", metodologia: padrao, casas: 6 });
    expect(paraTexto(umDia.percentual, 6)).toBe("0.032258");
    const invertido = jurosSimples({ termoInicial: "2018-06-01", termoFinal: "2018-05-25", metodologia: padrao, casas: 6 });
    expect(paraTexto(invertido.percentual, 6)).toBe("0.000000");
    expect(invertido.detalhe).toEqual([]);
    expect(invertido.avisos).toEqual([]);
  });

  it("regras ainda não implementadas (taxa legal, SELIC única) geram aviso e não somam", () => {
    const r = jurosSimples({ termoInicial: "2024-08-01", termoFinal: "2024-09-30", metodologia: padrao, casas: 6 });
    expect(paraTexto(r.percentual, 6)).toBe("0.935484"); // só 01 a 29/08/2024, a 1% ao mês
    expect(r.detalhe).toHaveLength(1);
    expect(r.avisos).toEqual([
      'Juros pela regra "taxaLegal" ainda não implementados: o período de 30/08/2024 a 30/09/2024 ficou sem juros.',
    ]);
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Execute: `npm test`
Esperado: falha ao importar `./juros.ts`.

- [ ] **Passo 3: Implementar `src/motor/juros.ts`**

```ts
import { ratearPorMesCalendario } from "../compartilhado/datas.ts";
import { arredondar, decimal, paraTexto, ZERO, type Decimal } from "../compartilhado/decimal.ts";
import { formatarData } from "../compartilhado/formatacao.ts";
import type { DataISO, DetalheJuros, Metodologia } from "../compartilhado/tipos.ts";
import { dividirPorPeriodos } from "./periodos.ts";

export interface ParametrosJuros {
  termoInicial: DataISO;
  termoFinal: DataISO;
  metodologia: Metodologia;
  /** casas decimais do percentual (6 na metodologia padrão) */
  casas: number;
}

export interface ResultadoJuros {
  /** percentual total, já arredondado a `casas` */
  percentual: Decimal;
  detalhe: DetalheJuros[];
  avisos: string[];
}

/**
 * Juros simples do termo inicial ao termo final (§6.4). Regime antigo (`percentualMensal`):
 * em cada mês tocado, taxa × dias ÷ diasDoMes, contando o dia inicial e o dia final, como o
 * SAJ. Cada período da metodologia aplica a própria taxa aos dias que lhe cabem.
 * Regras `taxaLegal` e `selicUnica` são da fase 2: aqui geram aviso e não somam.
 */
export function jurosSimples(p: ParametrosJuros): ResultadoJuros {
  const detalhe: DetalheJuros[] = [];
  const avisos: string[] = [];
  if (p.termoFinal < p.termoInicial) return { percentual: arredondar(ZERO, p.casas), detalhe, avisos };

  let percentual = ZERO;
  for (const trecho of dividirPorPeriodos(p.metodologia, p.termoInicial, p.termoFinal)) {
    const regra = trecho.periodo.juros;
    if (regra.tipo !== "percentualMensal") {
      avisos.push(
        `Juros pela regra "${regra.tipo}" ainda não implementados: o período de ${formatarData(trecho.de)} a ${formatarData(trecho.ate)} ficou sem juros.`,
      );
      continue;
    }
    const taxa = decimal(regra.taxaMensal);
    for (const mes of ratearPorMesCalendario(trecho.de, trecho.ate)) {
      const parcela = taxa.times(mes.dias).div(mes.diasDoMes);
      percentual = percentual.plus(parcela);
      detalhe.push({
        regime: "percentualMensal",
        de: mes.de,
        ate: mes.ate,
        dias: mes.dias,
        diasDoMes: mes.diasDoMes,
        taxa: regra.taxaMensal,
        percentual: paraTexto(parcela, p.casas),
      });
    }
  }
  return { percentual: arredondar(percentual, p.casas), detalhe, avisos };
}
```

- [ ] **Passo 4: Rodar e ver passar**

Execute: `npm test`
Esperado: todos passam, inclusive "16.516129".

- [ ] **Passo 5: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add src/motor/juros.ts src/motor/juros.test.ts && git commit -m "motor: juros simples por mês-calendário contando as duas pontas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tarefa 10: Atualização de cada lançamento, totais, índices usados e avisos

**Arquivos:**
- Criar: `src/motor/calcular.ts`
- Teste: `src/motor/calcular.test.ts`

**Interfaces:**
- Consome: Tarefas 3 a 9.
- Produz:
  - `atualizarLancamento(lancamento: Lancamento, calculo: Calculo, indices: TabelaIndices): LancamentoCalculado` — termos próprios e metodologia própria do lançamento quando informados; senão, os padrões (data do lançamento e data de elaboração; metodologia do cálculo).
  - `calcular(calculo: Calculo, indices: TabelaIndices): Resultado` — a função que a interface chamará a cada alteração (§4.3).

Regras: `valorBase` = `valorInformado` arredondado a 2 casas (sem valor: zero e aviso; a apuração pela base é a fase 3). `corrigido = arred2(valorBase × fator6)`; `jurosValor = arred2(corrigido × percentual6 ÷ 100)`; `atualizado = corrigido + jurosValor`. Totais: `prestacoes` = soma dos atualizados das prestações; `amortizacoes` = soma dos atualizados das amortizações; `totalDevido = prestacoes − amortizacoes`; `multa` e `honorarios` = `"0.00"` (fase 2); `totalGeral = totalDevido + multa + honorarios`. Avisos por lançamento (meses sem índice, piso, lançamento posterior à data de elaboração, valor não informado, regra de juros não implementada) e do resultado (nenhum lançamento; amortizações igualam ou superam prestações; resumo dos meses sem índice).

- [ ] **Passo 1: Escrever os testes**

`src/motor/calcular.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import type { Calculo, Lancamento } from "../compartilhado/tipos.ts";
import { metodologiaPadrao } from "../metodologias/padrao.ts";
import { calcular } from "./calcular.ts";
import { tabelaIgpm } from "./testes/indices-igpm-2017-2018.ts";

function calculoCom(lancamentos: Lancamento[], dataElaboracao = "2018-05-25"): Calculo {
  return {
    formato: "apura/calculo@1",
    tipo: "alimentos",
    id: "teste",
    criadoEm: "2026-10-10T00:00:00.000Z",
    atualizadoEm: "2026-10-10T00:00:00.000Z",
    dataElaboracao,
    cabecalho: { defensor: "", orgao: "", processo: "", exequente: "", executado: "" },
    base: { tipo: "valorFixo", valor: "451.91", dataFixacao: "2017-01-10", indiceReajuste: "nenhum", mesReajuste: 1 },
    lotes: {},
    lancamentos,
    metodologia: metodologiaPadrao(),
    acrescimos: { multaPercentual: "0", honorariosPercentual: "0" },
    observacoes: "",
  };
}

const prestacao: Lancamento = {
  id: "p-2017-01",
  tipo: "prestacao",
  data: "2017-01-10",
  competencia: "2017-01",
  valorInformado: "451.91",
  origem: "avulso",
  editado: false,
};

const amortizacao: Lancamento = {
  id: "a-2017-01",
  tipo: "amortizacao",
  data: "2017-01-10",
  descricao: "Pagamento parcial",
  valorInformado: "440.00",
  origem: "avulso",
  editado: false,
};

describe("calcular", () => {
  it("atualiza uma prestação e uma amortização como o SAJ e apura os totais", () => {
    const r = calcular(calculoCom([prestacao, amortizacao]), tabelaIgpm());
    expect(r.lancamentos[0]).toMatchObject({
      id: "p-2017-01",
      tipo: "prestacao",
      competencia: "2017-01",
      valorBase: "451.91",
      memoriaBase: "Valor informado: R$ 451,91",
      correcao: { fator: "1.013020", pisoAplicado: false },
      corrigido: "457.79",
      juros: { percentual: "16.516129" },
      jurosValor: "75.61",
      atualizado: "533.40",
    });
    expect(r.lancamentos[0]?.correcao.indices).toHaveLength(17);
    expect(r.lancamentos[0]?.juros.detalhe).toHaveLength(17);
    expect(r.lancamentos[1]).toMatchObject({
      id: "a-2017-01",
      tipo: "amortizacao",
      descricao: "Pagamento parcial",
      corrigido: "445.73",
      jurosValor: "73.62",
      atualizado: "519.35",
    });
    expect(r.totais).toEqual({
      prestacoes: "533.40",
      amortizacoes: "519.35",
      totalDevido: "14.05",
      multa: "0.00",
      honorarios: "0.00",
      totalGeral: "14.05",
    });
  });

  it("registra os índices efetivamente usados e a situação da consulta", () => {
    const r = calcular(calculoCom([prestacao, amortizacao]), tabelaIgpm());
    expect(r.indicesUsados).toHaveLength(16); // jan/2017 a abr/2018, sem repetição entre lançamentos
    expect(r.indicesUsados[0]).toEqual({
      serie: "189",
      competencia: "2017-01",
      valor: "0.64",
      fonte: "embutida",
      obtidoEm: "2026-10-10T00:00:00.000Z",
    });
    expect(r.consultaIndices).toEqual({
      em: "2018-05-25T00:00:00.000Z",
      series: ["189"],
      ultimoMesPorSerie: { "189": "2018-04" },
    });
  });

  it("avisa o mês sem índice no lançamento e no resumo", () => {
    const r = calcular(calculoCom([prestacao]), tabelaIgpm());
    expect(r.lancamentos[0]?.avisos).toEqual([
      "IGP-M de mai/2018 não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).",
    ]);
    expect(r.avisos).toEqual(["Meses sem índice na tabela (entraram sem correção): IGP-M de mai/2018."]);
  });

  it("usa os termos próprios do lançamento quando informados", () => {
    const comTermos: Lancamento = {
      ...prestacao,
      encargos: { termoFinalCorrecao: "2017-03-15", termoInicialJuros: "2018-05-25" },
    };
    const r = calcular(calculoCom([comTermos]), tabelaIgpm());
    expect(r.lancamentos[0]).toMatchObject({
      correcao: { fator: "1.005183" },
      corrigido: "454.25",
      juros: { percentual: "0.032258" },
      jurosValor: "0.15",
      atualizado: "454.40",
    });
  });

  it("usa a metodologia própria do lançamento quando informada", () => {
    const propria = metodologiaPadrao();
    propria.incidenciaMesInicial = "mesSeguinte";
    const r = calcular(calculoCom([{ ...prestacao, encargos: { metodologia: propria } }]), tabelaIgpm());
    expect(r.lancamentos[0]?.correcao.fator).toBe("1.008652");
  });

  it("lançamento posterior à data de elaboração entra pelo valor nominal, sem encargos, com aviso", () => {
    const futuro: Lancamento = { ...prestacao, id: "p-2018-06", data: "2018-06-10", competencia: "2018-06" };
    const r = calcular(calculoCom([futuro]), tabelaIgpm());
    expect(r.lancamentos[0]).toMatchObject({
      correcao: { fator: "1.000000" },
      corrigido: "451.91",
      juros: { percentual: "0.000000" },
      jurosValor: "0.00",
      atualizado: "451.91",
    });
    expect(r.lancamentos[0]?.avisos).toEqual([
      "Data do lançamento (10/06/2018) posterior à data de elaboração (25/05/2018): sem correção e sem juros.",
    ]);
  });

  it("lançamento sem valor informado entra com zero e aviso (a base será apurada na fase 3)", () => {
    const semValor: Lancamento = {
      id: "p-sem-valor",
      tipo: "prestacao",
      data: "2017-01-10",
      competencia: "2017-01",
      origem: "lote",
      editado: false,
    };
    const r = calcular(calculoCom([semValor]), tabelaIgpm());
    expect(r.lancamentos[0]).toMatchObject({ valorBase: "0.00", corrigido: "0.00", jurosValor: "0.00", atualizado: "0.00" });
    expect(r.lancamentos[0]?.avisos).toContain("Valor não informado: o lançamento entrou com R$ 0,00.");
  });

  it("avisa quando as amortizações igualam ou superam as prestações e quando não há lançamentos", () => {
    const r = calcular(calculoCom([amortizacao]), tabelaIgpm());
    expect(r.totais.totalDevido).toBe("-519.35");
    expect(r.avisos).toContain(
      "As amortizações atualizadas (R$ 519,35) igualam ou superam as prestações atualizadas (R$ 0,00): não há valor devido na data do cálculo.",
    );
    expect(calcular(calculoCom([]), tabelaIgpm()).avisos).toEqual(["Nenhum lançamento."]);
  });
});
```

Conferência dos valores do teste de termos próprios: `451,91 × 1,005183 = 454,2523 → 454,25`; `454,25 × 0,032258% = 0,1465 → 0,15`; `454,25 + 0,15 = 454,40`.

- [ ] **Passo 2: Rodar e ver falhar**

Execute: `npm test`
Esperado: falha ao importar `./calcular.ts`.

- [ ] **Passo 3: Implementar `src/motor/calcular.ts`**

```ts
import { competenciaDe } from "../compartilhado/datas.ts";
import { arredondar, CEM, decimal, paraTexto, ZERO, type Decimal } from "../compartilhado/decimal.ts";
import { formatarCompetencia, formatarData, formatarMoeda } from "../compartilhado/formatacao.ts";
import { NOME_DA_SERIE } from "../compartilhado/tipos.ts";
import type {
  Calculo,
  CodigoSerie,
  Competencia,
  IndiceUsado,
  Lancamento,
  LancamentoCalculado,
  Resultado,
  TabelaIndices,
  Totais,
} from "../compartilhado/tipos.ts";
import { fatorCorrecao, resolverIndicesMensais } from "./correcao.ts";
import { jurosSimples } from "./juros.ts";

/**
 * Atualiza um lançamento (prestação ou amortização) da sua data até a data de elaboração,
 * ou pelos termos próprios e metodologia própria quando informados (§6.4 e §6.5).
 */
export function atualizarLancamento(
  lancamento: Lancamento,
  calculo: Calculo,
  indices: TabelaIndices,
): LancamentoCalculado {
  const metodologia = lancamento.encargos?.metodologia ?? calculo.metodologia;
  const { fatorCasas, percentualCasas, valorCasas } = metodologia.arredondamento;
  const termoInicialCorrecao = lancamento.encargos?.termoInicialCorrecao ?? lancamento.data;
  const termoFinalCorrecao = lancamento.encargos?.termoFinalCorrecao ?? calculo.dataElaboracao;
  const termoInicialJuros = lancamento.encargos?.termoInicialJuros ?? lancamento.data;
  const termoFinalJuros = lancamento.encargos?.termoFinalJuros ?? calculo.dataElaboracao;
  const avisos: string[] = [];

  // Valor-base: nesta fase, só o valor informado (a apuração pela base dos alimentos é a fase 3).
  let valorBase = ZERO;
  let memoriaBase = "Valor não informado";
  if (lancamento.valorInformado !== undefined) {
    valorBase = arredondar(decimal(lancamento.valorInformado), valorCasas);
    memoriaBase = `Valor informado: ${formatarMoeda(valorBase)}`;
  } else {
    avisos.push("Valor não informado: o lançamento entrou com R$ 0,00.");
  }

  if (lancamento.data > calculo.dataElaboracao) {
    avisos.push(
      `Data do lançamento (${formatarData(lancamento.data)}) posterior à data de elaboração (${formatarData(calculo.dataElaboracao)}): sem correção e sem juros.`,
    );
  }

  const correcao = fatorCorrecao({
    termoInicial: termoInicialCorrecao,
    termoFinal: termoFinalCorrecao,
    indices: resolverIndicesMensais(
      metodologia,
      indices,
      competenciaDe(termoInicialCorrecao),
      competenciaDe(termoFinalCorrecao),
    ),
    incidenciaMesInicial: metodologia.incidenciaMesInicial,
    deflacao: metodologia.deflacao,
    casas: fatorCasas,
  });
  for (const competencia of correcao.mesesSemIndice) {
    const serie = correcao.indices.find((i) => i.competencia === competencia)?.serie ?? null;
    const nome = serie === null ? "Índice" : NOME_DA_SERIE[serie];
    avisos.push(
      `${nome} de ${formatarCompetencia(competencia)} não disponível na tabela de índices: o mês entrou sem correção (fator 1,000000).`,
    );
  }
  if (correcao.pisoAplicado) {
    avisos.push(
      "Índices negativos no período: o valor corrigido foi mantido igual ao valor original (fator 1,000000).",
    );
  }
  const corrigido = arredondar(valorBase.times(correcao.fator), valorCasas);

  const juros = jurosSimples({
    termoInicial: termoInicialJuros,
    termoFinal: termoFinalJuros,
    metodologia,
    casas: percentualCasas,
  });
  avisos.push(...juros.avisos);
  const jurosValor = arredondar(corrigido.times(juros.percentual).div(CEM), valorCasas);
  const atualizado = corrigido.plus(jurosValor);

  return {
    id: lancamento.id,
    tipo: lancamento.tipo,
    data: lancamento.data,
    competencia: lancamento.competencia,
    descricao: lancamento.descricao,
    valorBase: paraTexto(valorBase, valorCasas),
    memoriaBase,
    correcao: {
      fator: paraTexto(correcao.fator, fatorCasas),
      indices: correcao.indices,
      pisoAplicado: correcao.pisoAplicado,
    },
    corrigido: paraTexto(corrigido, valorCasas),
    juros: { percentual: paraTexto(juros.percentual, percentualCasas), detalhe: juros.detalhe },
    jurosValor: paraTexto(jurosValor, valorCasas),
    atualizado: paraTexto(atualizado, valorCasas),
    avisos,
  };
}

/** Calcula o Resultado completo de um Cálculo com uma tabela de índices congelada (§4.3). */
export function calcular(calculo: Calculo, indices: TabelaIndices): Resultado {
  const lancamentos = calculo.lancamentos.map((l) => atualizarLancamento(l, calculo, indices));
  const valorCasas = calculo.metodologia.arredondamento.valorCasas;

  const somar = (tipo: Lancamento["tipo"]): Decimal =>
    lancamentos
      .filter((l) => l.tipo === tipo)
      .reduce((soma, l) => soma.plus(decimal(l.atualizado)), ZERO);
  const prestacoes = somar("prestacao");
  const amortizacoes = somar("amortizacao");
  const totalDevido = prestacoes.minus(amortizacoes);
  // Multa e honorários do art. 523, §1º, do CPC entram na fase 2; aqui são zero.
  const multa = ZERO;
  const honorarios = ZERO;
  const totalGeral = totalDevido.plus(multa).plus(honorarios);
  const totais: Totais = {
    prestacoes: paraTexto(prestacoes, valorCasas),
    amortizacoes: paraTexto(amortizacoes, valorCasas),
    totalDevido: paraTexto(totalDevido, valorCasas),
    multa: paraTexto(multa, valorCasas),
    honorarios: paraTexto(honorarios, valorCasas),
    totalGeral: paraTexto(totalGeral, valorCasas),
  };

  const avisos: string[] = [];
  if (lancamentos.length === 0) {
    avisos.push("Nenhum lançamento.");
  } else if (totalDevido.lte(ZERO)) {
    avisos.push(
      `As amortizações atualizadas (${formatarMoeda(amortizacoes)}) igualam ou superam as prestações atualizadas (${formatarMoeda(prestacoes)}): não há valor devido na data do cálculo.`,
    );
  }

  // Índices efetivamente usados (sem repetição) e resumo dos meses sem índice.
  const usados = new Map<string, IndiceUsado>();
  const semIndice = new Map<CodigoSerie, Set<Competencia>>();
  for (const l of lancamentos) {
    for (const i of l.correcao.indices) {
      if (i.serie === null) continue;
      if (i.valor === null) {
        const meses = semIndice.get(i.serie) ?? new Set<Competencia>();
        meses.add(i.competencia);
        semIndice.set(i.serie, meses);
        continue;
      }
      const chave = `${i.serie}|${i.competencia}`;
      const registro = indices.series[i.serie]?.[i.competencia];
      if (!usados.has(chave) && registro) {
        usados.set(chave, {
          serie: i.serie,
          competencia: i.competencia,
          valor: registro.valor,
          fonte: registro.fonte,
          obtidoEm: registro.obtidoEm,
        });
      }
    }
  }
  const indicesUsados = [...usados.values()].sort((a, b) =>
    a.serie === b.serie ? (a.competencia < b.competencia ? -1 : 1) : a.serie < b.serie ? -1 : 1,
  );
  if (semIndice.size > 0) {
    const lista = [...semIndice.entries()]
      .map(([serie, meses]) => `${NOME_DA_SERIE[serie]} de ${[...meses].sort().map(formatarCompetencia).join(", ")}`)
      .join("; ");
    avisos.push(`Meses sem índice na tabela (entraram sem correção): ${lista}.`);
  }

  const series = (Object.keys(indices.series) as CodigoSerie[]).sort();
  const ultimoMesPorSerie: Partial<Record<CodigoSerie, Competencia>> = {};
  for (const serie of series) {
    const ultimo = Object.keys(indices.series[serie] ?? {}).sort().at(-1);
    if (ultimo !== undefined) ultimoMesPorSerie[serie] = ultimo;
  }

  return {
    lancamentos,
    totais,
    indicesUsados,
    consultaIndices: { em: indices.consultadoEm, series, ultimoMesPorSerie },
    avisos,
  };
}
```

- [ ] **Passo 4: Rodar e ver passar**

Execute: `npm test`
Esperado: todos passam.

- [ ] **Passo 5: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add src/motor/calcular.ts src/motor/calcular.test.ts && git commit -m "motor: atualização de lançamentos, totais, índices usados e avisos" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tarefa 11: Caso de referência SAJ TJMS 25/05/2018 e o teste genérico de casos

**Arquivos:**
- Criar: `src/motor/casos/2018-05-25-saj-tjms-alimentos.json`
- Teste: `src/motor/casos.test.ts`

**Interfaces:**
- Consome: `calcular` (Tarefa 10), `CasoDeReferencia` (Tarefa 6), `decimal.ts` (Tarefa 3).
- Produz: o formato `apura/caso-de-referencia@1` em uso e um teste que executa automaticamente **todos** os arquivos `src/motor/casos/*.json`; fases seguintes só acrescentam arquivos.

O arquivo transcreve o Anexo A do design: 14 prestações e 14 amortizações, com valor, corrigido, juros e total linha a linha, e os totais. Os campos `fator` e `jurosPercentual` são os valores conferidos com aritmética decimal (os mesmos que o motor imprime), para que quem pegue o relatório refaça a conta. A tabela de índices vai até abr/2018, como estava em 25/05/2018: incluir mai/2018 mudaria o resultado (pro rata do mês final).

- [ ] **Passo 1: Transcrever o caso em `src/motor/casos/2018-05-25-saj-tjms-alimentos.json`**

```json
{
  "formato": "apura/caso-de-referencia@1",
  "nome": "SAJ TJMS, execução de alimentos, cálculo de 25/05/2018",
  "fonte": "Relatório de Cálculo Processual – Sintético, TJMS/SAJ, emitido em 25/05/2018; transcrito no Anexo A de docs/superpowers/specs/2026-10-10-apura-mvp-alimentos-design.md. Número do processo omitido; PDF original fora do repositório.",
  "observacoes": "Parâmetros declarados no relatório: IGP-M (FGV) da data do lançamento até 30/04/2018 (pro rata); juro legal simples de 1,00% ao mês sobre o valor corrigido, da data do lançamento até 25/05/2018. A tabela de índices vai só até abr/2018, como na data do cálculo (mai/2018 ainda não divulgado). Valores nominais usados como informados; a hipótese de base em 48,23% do salário mínimo fica para teste separado na fase 3.",
  "calculo": {
    "formato": "apura/calculo@1",
    "tipo": "alimentos",
    "id": "caso-saj-tjms-2018-05-25",
    "criadoEm": "2026-10-10T00:00:00.000Z",
    "atualizadoEm": "2026-10-10T00:00:00.000Z",
    "dataElaboracao": "2018-05-25",
    "cabecalho": { "defensor": "", "orgao": "", "processo": "", "exequente": "", "executado": "" },
    "base": { "tipo": "valorFixo", "valor": "451.91", "dataFixacao": "2017-01-10", "indiceReajuste": "nenhum", "mesReajuste": 1 },
    "lotes": {},
    "lancamentos": [
      { "id": "p-2017-01", "tipo": "prestacao", "data": "2017-01-10", "competencia": "2017-01", "valorInformado": "451.91", "origem": "avulso", "editado": false },
      { "id": "p-2017-02", "tipo": "prestacao", "data": "2017-02-10", "competencia": "2017-02", "valorInformado": "451.91", "origem": "avulso", "editado": false },
      { "id": "p-2017-03", "tipo": "prestacao", "data": "2017-03-10", "competencia": "2017-03", "valorInformado": "451.91", "origem": "avulso", "editado": false },
      { "id": "p-2017-04", "tipo": "prestacao", "data": "2017-04-10", "competencia": "2017-04", "valorInformado": "451.91", "origem": "avulso", "editado": false },
      { "id": "p-2017-05", "tipo": "prestacao", "data": "2017-05-10", "competencia": "2017-05", "valorInformado": "451.91", "origem": "avulso", "editado": false },
      { "id": "p-2017-06", "tipo": "prestacao", "data": "2017-06-10", "competencia": "2017-06", "valorInformado": "451.91", "origem": "avulso", "editado": false },
      { "id": "p-2017-07", "tipo": "prestacao", "data": "2017-07-10", "competencia": "2017-07", "valorInformado": "451.91", "origem": "avulso", "editado": false },
      { "id": "p-2017-08", "tipo": "prestacao", "data": "2017-08-10", "competencia": "2017-08", "valorInformado": "451.91", "origem": "avulso", "editado": false },
      { "id": "p-2017-09", "tipo": "prestacao", "data": "2017-09-10", "competencia": "2017-09", "valorInformado": "451.91", "origem": "avulso", "editado": false },
      { "id": "p-2017-10", "tipo": "prestacao", "data": "2017-10-10", "competencia": "2017-10", "valorInformado": "451.91", "origem": "avulso", "editado": false },
      { "id": "p-2017-11", "tipo": "prestacao", "data": "2017-11-10", "competencia": "2017-11", "valorInformado": "451.91", "origem": "avulso", "editado": false },
      { "id": "p-2017-12", "tipo": "prestacao", "data": "2017-12-10", "competencia": "2017-12", "valorInformado": "451.91", "origem": "avulso", "editado": false },
      { "id": "p-2018-01", "tipo": "prestacao", "data": "2018-01-10", "competencia": "2018-01", "valorInformado": "460.11", "origem": "avulso", "editado": false },
      { "id": "p-2018-02", "tipo": "prestacao", "data": "2018-02-10", "competencia": "2018-02", "valorInformado": "460.11", "origem": "avulso", "editado": false },
      { "id": "a-2017-01", "tipo": "amortizacao", "data": "2017-01-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false },
      { "id": "a-2017-02", "tipo": "amortizacao", "data": "2017-02-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false },
      { "id": "a-2017-03", "tipo": "amortizacao", "data": "2017-03-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false },
      { "id": "a-2017-04", "tipo": "amortizacao", "data": "2017-04-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false },
      { "id": "a-2017-05", "tipo": "amortizacao", "data": "2017-05-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false },
      { "id": "a-2017-06", "tipo": "amortizacao", "data": "2017-06-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false },
      { "id": "a-2017-07", "tipo": "amortizacao", "data": "2017-07-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false },
      { "id": "a-2017-08", "tipo": "amortizacao", "data": "2017-08-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false },
      { "id": "a-2017-09", "tipo": "amortizacao", "data": "2017-09-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false },
      { "id": "a-2017-10", "tipo": "amortizacao", "data": "2017-10-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false },
      { "id": "a-2017-11", "tipo": "amortizacao", "data": "2017-11-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false },
      { "id": "a-2017-12", "tipo": "amortizacao", "data": "2017-12-10", "descricao": "Pagamento parcial", "valorInformado": "440.00", "origem": "avulso", "editado": false },
      { "id": "a-2018-01", "tipo": "amortizacao", "data": "2018-01-10", "descricao": "Pagamento parcial", "valorInformado": "448.00", "origem": "avulso", "editado": false },
      { "id": "a-2018-02", "tipo": "amortizacao", "data": "2018-02-10", "descricao": "Pagamento parcial", "valorInformado": "448.00", "origem": "avulso", "editado": false }
    ],
    "metodologia": {
      "id": "tjms-saj",
      "versao": 1,
      "nome": "TJMS/SAJ",
      "ajustada": false,
      "periodos": [
        { "de": null, "ate": "2024-08-29", "correcao": { "indice": "IGP-M" }, "juros": { "tipo": "percentualMensal", "taxaMensal": "1" } },
        { "de": "2024-08-30", "ate": null, "correcao": { "indice": "IPCA" }, "juros": { "tipo": "taxaLegal" } }
      ],
      "incidenciaMesInicial": "proRata",
      "deflacao": "aplicarComPiso",
      "arredondamento": { "fatorCasas": 6, "percentualCasas": 6, "valorCasas": 2, "modo": "comercial" }
    },
    "acrescimos": { "multaPercentual": "0", "honorariosPercentual": "0" },
    "observacoes": ""
  },
  "indices": {
    "consultadoEm": "2018-05-25T00:00:00.000Z",
    "series": {
      "189": {
        "2017-01": { "valor": "0.64", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z" },
        "2017-02": { "valor": "0.08", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z" },
        "2017-03": { "valor": "0.01", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z" },
        "2017-04": { "valor": "-1.10", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z" },
        "2017-05": { "valor": "-0.93", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z" },
        "2017-06": { "valor": "-0.67", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z" },
        "2017-07": { "valor": "-0.72", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z" },
        "2017-08": { "valor": "0.10", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z" },
        "2017-09": { "valor": "0.47", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z" },
        "2017-10": { "valor": "0.20", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z" },
        "2017-11": { "valor": "0.52", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z" },
        "2017-12": { "valor": "0.89", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z" },
        "2018-01": { "valor": "0.76", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z" },
        "2018-02": { "valor": "0.07", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z" },
        "2018-03": { "valor": "0.64", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z" },
        "2018-04": { "valor": "0.57", "fonte": "embutida", "obtidoEm": "2026-10-10T00:00:00.000Z" }
      }
    }
  },
  "esperado": {
    "lancamentos": [
      { "id": "p-2017-01", "fator": "1.013020", "corrigido": "457.79", "jurosPercentual": "16.516129", "jurosValor": "75.61", "atualizado": "533.40" },
      { "id": "p-2017-02", "fator": "1.008364", "corrigido": "455.69", "jurosPercentual": "15.485023", "jurosValor": "70.56", "atualizado": "526.25" },
      { "id": "p-2017-03", "fator": "1.007813", "corrigido": "455.44", "jurosPercentual": "14.516129", "jurosValor": "66.11", "atualizado": "521.55" },
      { "id": "p-2017-04", "fator": "1.011467", "corrigido": "457.09", "jurosPercentual": "13.506452", "jurosValor": "61.74", "atualizado": "518.83" },
      { "id": "p-2017-05", "fator": "1.022029", "corrigido": "461.87", "jurosPercentual": "12.516129", "jurosValor": "57.81", "atualizado": "519.68" },
      { "id": "p-2017-06", "fator": "1.030826", "corrigido": "465.84", "jurosPercentual": "11.506452", "jurosValor": "53.60", "atualizado": "519.44" },
      { "id": "p-2017-07", "fator": "1.037873", "corrigido": "469.03", "jurosPercentual": "10.516129", "jurosValor": "49.32", "atualizado": "518.35" },
      { "id": "p-2017-08", "fator": "1.042629", "corrigido": "471.17", "jurosPercentual": "9.516129", "jurosValor": "44.84", "atualizado": "516.01" },
      { "id": "p-2017-09", "fator": "1.040296", "corrigido": "470.12", "jurosPercentual": "8.506452", "jurosValor": "39.99", "atualizado": "510.11" },
      { "id": "p-2017-10", "fator": "1.036381", "corrigido": "468.35", "jurosPercentual": "7.516129", "jurosValor": "35.20", "atualizado": "503.55" },
      { "id": "p-2017-11", "fator": "1.033192", "corrigido": "466.91", "jurosPercentual": "6.506452", "jurosValor": "30.38", "atualizado": "497.29" },
      { "id": "p-2017-12", "fator": "1.026687", "corrigido": "463.97", "jurosPercentual": "5.516129", "jurosValor": "25.59", "atualizado": "489.56" },
      { "id": "p-2018-01", "fator": "1.018053", "corrigido": "468.42", "jurosPercentual": "4.516129", "jurosValor": "21.15", "atualizado": "489.57" },
      { "id": "p-2018-02", "fator": "1.012592", "corrigido": "465.90", "jurosPercentual": "3.485023", "jurosValor": "16.24", "atualizado": "482.14" },
      { "id": "a-2017-01", "fator": "1.013020", "corrigido": "445.73", "jurosPercentual": "16.516129", "jurosValor": "73.62", "atualizado": "519.35" },
      { "id": "a-2017-02", "fator": "1.008364", "corrigido": "443.68", "jurosPercentual": "15.485023", "jurosValor": "68.70", "atualizado": "512.38" },
      { "id": "a-2017-03", "fator": "1.007813", "corrigido": "443.44", "jurosPercentual": "14.516129", "jurosValor": "64.37", "atualizado": "507.81" },
      { "id": "a-2017-04", "fator": "1.011467", "corrigido": "445.05", "jurosPercentual": "13.506452", "jurosValor": "60.11", "atualizado": "505.16" },
      { "id": "a-2017-05", "fator": "1.022029", "corrigido": "449.69", "jurosPercentual": "12.516129", "jurosValor": "56.28", "atualizado": "505.97" },
      { "id": "a-2017-06", "fator": "1.030826", "corrigido": "453.56", "jurosPercentual": "11.506452", "jurosValor": "52.19", "atualizado": "505.75" },
      { "id": "a-2017-07", "fator": "1.037873", "corrigido": "456.66", "jurosPercentual": "10.516129", "jurosValor": "48.02", "atualizado": "504.68" },
      { "id": "a-2017-08", "fator": "1.042629", "corrigido": "458.76", "jurosPercentual": "9.516129", "jurosValor": "43.66", "atualizado": "502.42" },
      { "id": "a-2017-09", "fator": "1.040296", "corrigido": "457.73", "jurosPercentual": "8.506452", "jurosValor": "38.94", "atualizado": "496.67" },
      { "id": "a-2017-10", "fator": "1.036381", "corrigido": "456.01", "jurosPercentual": "7.516129", "jurosValor": "34.27", "atualizado": "490.28" },
      { "id": "a-2017-11", "fator": "1.033192", "corrigido": "454.60", "jurosPercentual": "6.506452", "jurosValor": "29.58", "atualizado": "484.18" },
      { "id": "a-2017-12", "fator": "1.026687", "corrigido": "451.74", "jurosPercentual": "5.516129", "jurosValor": "24.92", "atualizado": "476.66" },
      { "id": "a-2018-01", "fator": "1.018053", "corrigido": "456.09", "jurosPercentual": "4.516129", "jurosValor": "20.60", "atualizado": "476.69" },
      { "id": "a-2018-02", "fator": "1.012592", "corrigido": "453.64", "jurosPercentual": "3.485023", "jurosValor": "15.81", "atualizado": "469.45" }
    ],
    "totais": { "prestacoes": "7145.73", "amortizacoes": "6957.45", "totalDevido": "188.28", "multa": "0.00", "honorarios": "0.00", "totalGeral": "188.28" }
  }
}
```

Conferência contra o Anexo A: prestações corrigidas 6.497,59 + juros 648,14 = 7.145,73; amortizações corrigidas 6.326,38 + juros 631,07 = 6.957,45; total geral 188,28.

- [ ] **Passo 2: Escrever o teste genérico `src/motor/casos.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { arredondar, CEM, decimal, paraTexto } from "../compartilhado/decimal.ts";
import type { CasoDeReferencia } from "../compartilhado/tipos.ts";
import { calcular } from "./calcular.ts";

// Todos os arquivos src/motor/casos/*.json entram automaticamente.
const casos = Object.values(
  import.meta.glob<CasoDeReferencia>("./casos/*.json", { eager: true, import: "default" }),
);

describe("casos de referência", () => {
  it("há pelo menos um caso na pasta", () => {
    expect(casos.length).toBeGreaterThan(0);
  });

  describe.each(casos.map((caso) => [caso.nome, caso] as const))("%s", (_nome, caso) => {
    const resultado = calcular(caso.calculo, caso.indices);
    const valorCasas = caso.calculo.metodologia.arredondamento.valorCasas;

    it.each(caso.esperado.lancamentos.map((e) => [e.id, e] as const))(
      "lançamento %s bate centavo a centavo",
      (id, esperado) => {
        const obtido = resultado.lancamentos.find((l) => l.id === id);
        expect(obtido).toBeDefined();
        if (!obtido) return;
        const campos: Array<[string, string | undefined, string]> = [
          ["corrigido", esperado.corrigido, obtido.corrigido],
          ["jurosValor", esperado.jurosValor, obtido.jurosValor],
          ["atualizado", esperado.atualizado, obtido.atualizado],
          ["fator", esperado.fator, obtido.correcao.fator],
          ["jurosPercentual", esperado.jurosPercentual, obtido.juros.percentual],
        ];
        const esperados: Record<string, string> = {};
        const obtidos: Record<string, string> = {};
        for (const [campo, valorEsperado, valorObtido] of campos) {
          if (valorEsperado !== undefined) {
            esperados[campo] = valorEsperado;
            obtidos[campo] = valorObtido;
          }
        }
        expect(obtidos).toEqual(esperados);
      },
    );

    it("totais batem", () => {
      expect(resultado.totais).toEqual(caso.esperado.totais);
    });

    it("o fator e o percentual impressos reproduzem o centavo", () => {
      for (const l of resultado.lancamentos) {
        const corrigido = arredondar(decimal(l.valorBase).times(decimal(l.correcao.fator)), valorCasas);
        expect(paraTexto(corrigido, valorCasas)).toBe(l.corrigido);
        const juros = arredondar(decimal(l.corrigido).times(decimal(l.juros.percentual)).div(CEM), valorCasas);
        expect(paraTexto(juros, valorCasas)).toBe(l.jurosValor);
      }
    });

    it("a ordem dos lançamentos não altera os totais", () => {
      const invertido = { ...caso.calculo, lancamentos: [...caso.calculo.lancamentos].reverse() };
      expect(calcular(invertido, caso.indices).totais).toEqual(caso.esperado.totais);
    });
  });
});
```

- [ ] **Passo 3: Rodar e ver passar**

Execute: `npm test`
Esperado: o arquivo `casos.test.ts` mostra 28 testes de lançamento + 3 (totais, centavo, ordem) + 1 passando. Se alguma linha divergir, o Anexo A está certo (todas as 28 linhas foram conferidas em 10/10/2026 com aritmética decimal): procure o erro no motor, nas competências dos índices ou na transcrição do JSON.

- [ ] **Passo 4: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add src/motor/casos src/motor/casos.test.ts && git commit -m "motor: caso de referência SAJ TJMS 25/05/2018 reproduzido centavo a centavo" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tarefa 12: Catálogo de séries e leitura das respostas do SGS (sem rede)

**Arquivos:**
- Criar: `src/indices/series.ts`, `src/indices/cliente-bcb.ts`, `src/indices/testes/sgs-189-2017-2018.json` (resposta real gravada)
- Teste: `src/indices/cliente-bcb.test.ts`

**Interfaces:**
- Consome: `formatarData` (Tarefa 5), tipos `CodigoSerie`, `DataISO`, `Competencia`, `TextoDecimal`, `ArquivoSerie` (Tarefa 6).
- Produz:
  - `interface DescricaoSerie { codigo: CodigoSerie; nome: string; descricao: string; unidade: string; uso: string }`; `SERIES: Record<CodigoSerie, DescricaoSerie>` (as seis séries da §8.1); `URL_BASE_SGS`; `urlDaSerie(codigo: CodigoSerie, dataInicial?: DataISO, dataFinal?: DataISO): string`.
  - `interface ValorMensal { competencia: Competencia; valor: TextoDecimal }`; `class RespostaSgsInvalida extends Error`; `interpretarRespostaSgs(texto: string): ValorMensal[]` — exige lista JSON (recusa HTML e objetos de erro), datas `dd/mm/aaaa`, valores decimais em texto; devolve ordenado por competência, sem repetições (repetição idêntica tolerada, divergente recusada); lista vazia é devolvida vazia.
  - `montarArquivoSerie(codigo: CodigoSerie, valores: ValorMensal[], obtidoEm: string): ArquivoSerie`.

A fase 4 reutiliza `interpretarRespostaSgs` no cliente ao vivo do navegador; a Tarefa 13 a usa no script. Fatos da API verificados em 10/10/2026 (§8.1 do design): resposta `[{"data":"dd/mm/aaaa","valor":"0.82"}]` com valor em texto e ponto decimal; séries mensais datadas no dia 01; a série 4390 pode vir em ordem decrescente; série inexistente devolve HTML com status 200; erros 400/404/406 em JSON.

- [ ] **Passo 1: Gravar a resposta real em `src/indices/testes/sgs-189-2017-2018.json`**

Conteúdo exato da resposta de `https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados?formato=json&dataInicial=01/01/2017&dataFinal=31/05/2018`, obtida em 10/10/2026 (uma linha, sem quebra):

```json
[{"data":"01/01/2017","valor":"0.64"},{"data":"01/02/2017","valor":"0.08"},{"data":"01/03/2017","valor":"0.01"},{"data":"01/04/2017","valor":"-1.10"},{"data":"01/05/2017","valor":"-0.93"},{"data":"01/06/2017","valor":"-0.67"},{"data":"01/07/2017","valor":"-0.72"},{"data":"01/08/2017","valor":"0.10"},{"data":"01/09/2017","valor":"0.47"},{"data":"01/10/2017","valor":"0.20"},{"data":"01/11/2017","valor":"0.52"},{"data":"01/12/2017","valor":"0.89"},{"data":"01/01/2018","valor":"0.76"},{"data":"01/02/2018","valor":"0.07"},{"data":"01/03/2018","valor":"0.64"},{"data":"01/04/2018","valor":"0.57"},{"data":"01/05/2018","valor":"1.38"}]
```

- [ ] **Passo 2: Escrever os testes**

`src/indices/cliente-bcb.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { interpretarRespostaSgs, montarArquivoSerie, RespostaSgsInvalida } from "./cliente-bcb.ts";
import { SERIES, urlDaSerie } from "./series.ts";
import respostaGravada from "./testes/sgs-189-2017-2018.json?raw";

describe("catálogo de séries do BCB", () => {
  it("tem as seis séries do design", () => {
    expect(Object.keys(SERIES).sort()).toEqual(["1619", "188", "189", "29543", "433", "4390"]);
    expect(SERIES["189"].descricao).toBe("IGP-M (FGV), variação % mensal");
  });

  it("monta a URL do SGS com e sem intervalo de datas", () => {
    expect(urlDaSerie("189")).toBe(
      "https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados?formato=json",
    );
    expect(urlDaSerie("189", "2017-01-01", "2018-05-31")).toBe(
      "https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados?formato=json&dataInicial=01/01/2017&dataFinal=31/05/2018",
    );
  });
});

describe("interpretarRespostaSgs", () => {
  it("lê a resposta real gravada do BCB para o IGP-M (jan/2017 a mai/2018)", () => {
    const valores = interpretarRespostaSgs(respostaGravada);
    expect(valores).toHaveLength(17);
    expect(valores[0]).toEqual({ competencia: "2017-01", valor: "0.64" });
    expect(valores[3]).toEqual({ competencia: "2017-04", valor: "-1.10" });
    expect(valores[16]).toEqual({ competencia: "2018-05", valor: "1.38" });
  });

  it("ordena por competência quando a resposta vem invertida e tolera repetição idêntica", () => {
    const texto =
      '[{"data":"01/03/2026","valor":"0.50"},{"data":"01/02/2026","valor":"0.30"},{"data":"01/01/2026","valor":"0.10"},{"data":"01/02/2026","valor":"0.30"}]';
    expect(interpretarRespostaSgs(texto)).toEqual([
      { competencia: "2026-01", valor: "0.10" },
      { competencia: "2026-02", valor: "0.30" },
      { competencia: "2026-03", valor: "0.50" },
    ]);
  });

  it("recusa repetição com valores diferentes", () => {
    const texto = '[{"data":"01/02/2026","valor":"0.30"},{"data":"01/02/2026","valor":"0.31"}]';
    expect(() => interpretarRespostaSgs(texto)).toThrow(RespostaSgsInvalida);
  });

  it("recusa HTML (série inexistente responde HTML com status 200)", () => {
    expect(() => interpretarRespostaSgs("<!DOCTYPE html><html><body>Erro</body></html>")).toThrow(
      RespostaSgsInvalida,
    );
  });

  it("recusa erro em JSON, JSON inválido e data ou valor fora do formato", () => {
    expect(() => interpretarRespostaSgs('{"erro":"parâmetro inválido"}')).toThrow(RespostaSgsInvalida);
    expect(() => interpretarRespostaSgs("[{")).toThrow(RespostaSgsInvalida);
    expect(() => interpretarRespostaSgs('[{"data":"2017-01-01","valor":"0.64"}]')).toThrow(RespostaSgsInvalida);
    expect(() => interpretarRespostaSgs('[{"data":"01/01/2017","valor":"0,64"}]')).toThrow(RespostaSgsInvalida);
    expect(() => interpretarRespostaSgs('[{"data":"01/01/2017","valor":null}]')).toThrow(RespostaSgsInvalida);
    expect(() => interpretarRespostaSgs("[1, 2]")).toThrow(RespostaSgsInvalida);
  });

  it("devolve lista vazia para resposta vazia (quem chama decide o que fazer)", () => {
    expect(interpretarRespostaSgs("[]")).toEqual([]);
  });
});

describe("montarArquivoSerie", () => {
  it("monta o arquivo com formato, nome, origem e data de obtenção", () => {
    const arquivo = montarArquivoSerie(
      "189",
      [{ competencia: "2017-01", valor: "0.64" }],
      "2026-10-10T20:00:00.000Z",
    );
    expect(arquivo).toEqual({
      formato: "apura/serie@1",
      codigo: "189",
      nome: "IGP-M (FGV), variação % mensal",
      origem: "https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados?formato=json",
      obtidoEm: "2026-10-10T20:00:00.000Z",
      valores: [{ competencia: "2017-01", valor: "0.64" }],
    });
  });
});
```

- [ ] **Passo 3: Rodar e ver falhar**

Execute: `npm test`
Esperado: falhas ao importar `./cliente-bcb.ts` e `./series.ts`.

- [ ] **Passo 4: Implementar `src/indices/series.ts`**

```ts
import { formatarData } from "../compartilhado/formatacao.ts";
import type { CodigoSerie, DataISO } from "../compartilhado/tipos.ts";

export interface DescricaoSerie {
  codigo: CodigoSerie;
  nome: string;
  descricao: string;
  unidade: string;
  uso: string;
}

/** As seis séries do SGS usadas pelo Apura (§8.1 do design). */
export const SERIES: Record<CodigoSerie, DescricaoSerie> = {
  "433": {
    codigo: "433",
    nome: "IPCA",
    descricao: "IPCA (IBGE), variação % mensal",
    unidade: "% a.m.",
    uso: "correção do regime novo; alternativa no antigo; reajuste",
  },
  "188": {
    codigo: "188",
    nome: "INPC",
    descricao: "INPC (IBGE), variação % mensal",
    unidade: "% a.m.",
    uso: "alternativa de correção; reajuste",
  },
  "189": {
    codigo: "189",
    nome: "IGP-M",
    descricao: "IGP-M (FGV), variação % mensal",
    unidade: "% a.m.",
    uso: "padrão do regime antigo; reajuste",
  },
  "1619": {
    codigo: "1619",
    nome: "salário mínimo",
    descricao: "Salário mínimo, R$ por mês",
    unidade: "R$",
    uso: "base em % do salário mínimo; reajuste pelo salário mínimo",
  },
  "29543": {
    codigo: "29543",
    nome: "taxa legal",
    descricao: "Taxa legal (art. 406 do CC), % mensal, 6 casas, desde ago/2024",
    unidade: "% a.m.",
    uso: "juros do regime novo",
  },
  "4390": {
    codigo: "4390",
    nome: "SELIC",
    descricao: "SELIC acumulada no mês, % (mês corrente parcial)",
    unidade: "% a.m.",
    uso: "alternativa SELIC única",
  },
};

export const URL_BASE_SGS = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.";

/** URL do SGS para a série; sem datas, o BCB devolve o histórico completo das séries mensais. */
export function urlDaSerie(codigo: CodigoSerie, dataInicial?: DataISO, dataFinal?: DataISO): string {
  let url = `${URL_BASE_SGS}${codigo}/dados?formato=json`;
  if (dataInicial !== undefined) url += `&dataInicial=${formatarData(dataInicial)}`;
  if (dataFinal !== undefined) url += `&dataFinal=${formatarData(dataFinal)}`;
  return url;
}
```

- [ ] **Passo 5: Implementar `src/indices/cliente-bcb.ts`**

```ts
import type { ArquivoSerie, CodigoSerie, Competencia, TextoDecimal } from "../compartilhado/tipos.ts";
import { SERIES, urlDaSerie } from "./series.ts";

export interface ValorMensal {
  competencia: Competencia;
  valor: TextoDecimal;
}

export class RespostaSgsInvalida extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "RespostaSgsInvalida";
  }
}

const FORMATO_DATA_BCB = /^\d{2}\/\d{2}\/\d{4}$/;
const FORMATO_VALOR = /^-?\d+(\.\d+)?$/;

/**
 * Interpreta o texto de uma resposta do SGS: exige lista JSON de {data, valor} (recusa HTML e
 * objetos de erro), datas dd/mm/aaaa e valores decimais em texto. Devolve em ordem de competência,
 * sem repetições; repetição com valor diferente é recusada.
 */
export function interpretarRespostaSgs(texto: string): ValorMensal[] {
  const aparado = texto.trim();
  if (!aparado.startsWith("[")) {
    throw new RespostaSgsInvalida(
      "A resposta do BCB não é uma lista JSON (pode ser HTML de erro ou série inexistente).",
    );
  }
  let dados: unknown;
  try {
    dados = JSON.parse(aparado);
  } catch {
    throw new RespostaSgsInvalida("A resposta do BCB não é JSON válido.");
  }
  if (!Array.isArray(dados)) throw new RespostaSgsInvalida("A resposta do BCB não é uma lista.");

  const porCompetencia = new Map<Competencia, TextoDecimal>();
  for (const item of dados) {
    if (typeof item !== "object" || item === null) {
      throw new RespostaSgsInvalida("Registro inválido na resposta do BCB.");
    }
    const { data, valor } = item as { data?: unknown; valor?: unknown };
    if (typeof data !== "string" || !FORMATO_DATA_BCB.test(data)) {
      throw new RespostaSgsInvalida(`Data inválida na resposta do BCB: ${String(data)}`);
    }
    if (typeof valor !== "string" || !FORMATO_VALOR.test(valor)) {
      throw new RespostaSgsInvalida(`Valor inválido na resposta do BCB para ${data}: ${String(valor)}`);
    }
    const competencia = `${data.slice(6, 10)}-${data.slice(3, 5)}`;
    const existente = porCompetencia.get(competencia);
    if (existente !== undefined && existente !== valor) {
      throw new RespostaSgsInvalida(
        `Competência ${competencia} repetida com valores diferentes (${existente} e ${valor}).`,
      );
    }
    porCompetencia.set(competencia, valor);
  }
  return [...porCompetencia.entries()]
    .map(([competencia, valor]) => ({ competencia, valor }))
    .sort((a, b) => (a.competencia < b.competencia ? -1 : a.competencia > b.competencia ? 1 : 0));
}

/** Conteúdo de `dados/indices/<codigo>.json`. */
export function montarArquivoSerie(
  codigo: CodigoSerie,
  valores: ValorMensal[],
  obtidoEm: string,
): ArquivoSerie {
  return {
    formato: "apura/serie@1",
    codigo,
    nome: SERIES[codigo].descricao,
    origem: urlDaSerie(codigo),
    obtidoEm,
    valores,
  };
}
```

- [ ] **Passo 6: Rodar e ver passar**

Execute: `npm test`
Esperado: todos passam.

- [ ] **Passo 7: Verificar e commitar**

Execute: `npm run format && npm run verificar`

```bash
git add src/indices && git commit -m "indices: catálogo de séries do BCB e leitura das respostas do SGS" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tarefa 13: Script de atualização de índices, cópia embutida do IGP-M e tabela embutida

**Arquivos:**
- Criar: `scripts/atualizar-indices.ts`, `src/indices/embutidos.ts`
- Gerado pelo script e commitado: `dados/indices/189.json`
- Teste: `src/indices/embutidos.test.ts`

**Interfaces:**
- Consome: `interpretarRespostaSgs`, `montarArquivoSerie`, `SERIES`, `urlDaSerie` (Tarefa 12); `calcular` e o caso SAJ (Tarefas 10 e 11) no teste de integração.
- Produz:
  - `npm run indices:atualizar [-- codigo...]` — baixa do BCB (histórico completo, 3 tentativas, 30 s de limite) e grava `dados/indices/<codigo>.json` no formato `ArquivoSerie`; sem argumentos, todas as séries do catálogo; código desconhecido ou série vazia → erro, nada gravado.
  - `tabelaEmbutida(): TabelaIndices` — tabela montada só com os arquivos embutidos (nesta fase, só o 189), `fonte: "embutida"`, `consultadoEm` = data de obtenção mais recente entre os arquivos. A fase 4 parte dela para acrescentar cache e busca ao vivo.

Precisa de internet no Passo 3. O script roda no Node direto (`node scripts/atualizar-indices.ts`): por isso só usa sintaxe apagável e imports com `.ts`.

- [ ] **Passo 1: Escrever `scripts/atualizar-indices.ts`**

```ts
// Atualiza a cópia embutida das séries do BCB em dados/indices/.
//   npm run indices:atualizar             → todas as séries do catálogo
//   npm run indices:atualizar -- 189 433  → só as indicadas
// Roda no Node 22.18+ sem compilação; por isso os imports relativos têm a extensão .ts.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CodigoSerie } from "../src/compartilhado/tipos.ts";
import { interpretarRespostaSgs, montarArquivoSerie } from "../src/indices/cliente-bcb.ts";
import { SERIES, urlDaSerie } from "../src/indices/series.ts";

const PASTA = join(import.meta.dirname, "..", "dados", "indices");
const TEMPO_LIMITE_MS = 30_000;
const TENTATIVAS = 3;

function ehCodigo(texto: string): texto is CodigoSerie {
  return Object.hasOwn(SERIES, texto);
}

async function baixar(url: string): Promise<string> {
  let ultimoErro: unknown;
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    try {
      const resposta = await fetch(url, { signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      const tipo = resposta.headers.get("content-type") ?? "";
      if (!tipo.includes("application/json")) throw new Error(`conteúdo inesperado (${tipo})`);
      return await resposta.text();
    } catch (erro) {
      ultimoErro = erro;
      if (tentativa < TENTATIVAS) {
        await new Promise((resolver) => setTimeout(resolver, 2_000 * tentativa));
      }
    }
  }
  throw new Error(`Falha ao baixar ${url}: ${String(ultimoErro)}`);
}

async function main(): Promise<void> {
  const pedidos = process.argv.slice(2);
  const codigos =
    pedidos.length === 0
      ? (Object.keys(SERIES) as CodigoSerie[])
      : pedidos.map((pedido) => {
          if (!ehCodigo(pedido)) {
            throw new Error(
              `Série desconhecida: ${pedido}. Conhecidas: ${Object.keys(SERIES).join(", ")}.`,
            );
          }
          return pedido;
        });
  mkdirSync(PASTA, { recursive: true });
  for (const codigo of codigos) {
    const url = urlDaSerie(codigo);
    const valores = interpretarRespostaSgs(await baixar(url));
    if (valores.length === 0) throw new Error(`A série ${codigo} veio vazia; nada foi gravado.`);
    const arquivo = montarArquivoSerie(codigo, valores, new Date().toISOString());
    writeFileSync(join(PASTA, `${codigo}.json`), `${JSON.stringify(arquivo, null, 2)}\n`);
    const ultimo = valores.at(-1);
    console.log(
      `${codigo} (${SERIES[codigo].nome}): ${valores.length} meses, último ${ultimo?.competencia ?? "-"} = ${ultimo?.valor ?? "-"}`,
    );
  }
}

main().catch((erro: unknown) => {
  console.error(String(erro));
  process.exitCode = 1;
});
```

- [ ] **Passo 2: Conferir os tipos do script e o tratamento de código desconhecido**

Execute: `npm run tipos`
Esperado: sem erros (o `tsconfig.node.json` cobre `scripts/`).

Execute: `npm run indices:atualizar -- 999`
Esperado: mensagem "Série desconhecida: 999. Conhecidas: 433, 188, 189, 1619, 29543, 4390." e código de saída 1 (confira com `echo $?`). Nada é gravado.

- [ ] **Passo 3: Gerar a cópia embutida do IGP-M**

Execute: `npm run indices:atualizar -- 189`
Esperado: uma linha como `189 (IGP-M): 448 meses, último 2026-09 = 1.57` (o número de meses e o último mês crescem com o tempo) e o arquivo `dados/indices/189.json` criado.

Execute: `head -c 400 dados/indices/189.json`
Esperado: começa com `"formato": "apura/serie@1"`, `"codigo": "189"`, `"nome": "IGP-M (FGV), variação % mensal"`, `"origem": "https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados?formato=json"`, `"obtidoEm": "<data-hora de agora>"` e os primeiros valores a partir de `"competencia": "1989-06", "valor": "19.68"`.

- [ ] **Passo 4: Escrever o teste da tabela embutida**

`src/indices/embutidos.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import type { CasoDeReferencia } from "../compartilhado/tipos.ts";
import { calcular } from "../motor/calcular.ts";
import textoDoCaso from "../motor/casos/2018-05-25-saj-tjms-alimentos.json?raw";
import { tabelaEmbutida } from "./embutidos.ts";

describe("cópia embutida dos índices", () => {
  const tabela = tabelaEmbutida();
  const igpm = tabela.series["189"];

  it("traz o IGP-M desde jun/1989, com os valores usados no caso SAJ 2018", () => {
    expect(igpm?.["1989-06"]?.valor).toBe("19.68");
    expect(igpm?.["2017-01"]?.valor).toBe("0.64");
    expect(igpm?.["2017-04"]?.valor).toBe("-1.10");
    expect(igpm?.["2018-04"]?.valor).toBe("0.57");
    expect(igpm?.["2018-05"]?.valor).toBe("1.38");
    expect(Object.keys(igpm ?? {}).length).toBeGreaterThanOrEqual(440);
  });

  it("marca a proveniência de cada valor e a data da consulta", () => {
    expect(igpm?.["2017-01"]?.fonte).toBe("embutida");
    expect(igpm?.["2017-01"]?.obtidoEm).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(tabela.consultadoEm).toBe(igpm?.["2017-01"]?.obtidoEm);
    expect(tabela.series["433"]).toBeUndefined(); // IPCA só entra na fase 2
  });

  it("limitada a abr/2018, reproduz o total do caso SAJ 2018 (os dados embutidos batem com o relatório)", () => {
    const caso = JSON.parse(textoDoCaso) as CasoDeReferencia;
    const ateAbril = Object.fromEntries(
      Object.entries(igpm ?? {}).filter(([competencia]) => competencia <= "2018-04"),
    );
    const resultado = calcular(caso.calculo, { consultadoEm: tabela.consultadoEm, series: { "189": ateAbril } });
    expect(resultado.totais).toEqual(caso.esperado.totais);
  });
});
```

- [ ] **Passo 5: Rodar e ver falhar**

Execute: `npm test`
Esperado: falha ao importar `./embutidos.ts`.

- [ ] **Passo 6: Implementar `src/indices/embutidos.ts`**

```ts
import type {
  ArquivoSerie,
  CodigoSerie,
  Competencia,
  TabelaIndices,
  ValorIndice,
} from "../compartilhado/tipos.ts";
import igpm from "../../dados/indices/189.json";

/** Séries com cópia embutida; as demais entram quando o script as baixar (fases 2 e 3). */
const ARQUIVOS: Partial<Record<CodigoSerie, ArquivoSerie>> = {
  "189": igpm as ArquivoSerie,
};

/**
 * Tabela de índices montada só com a cópia embutida (sem rede). `consultadoEm` é a data de
 * obtenção mais recente entre os arquivos. A fase 4 parte daqui para cache e busca ao vivo.
 */
export function tabelaEmbutida(): TabelaIndices {
  const series: TabelaIndices["series"] = {};
  let consultadoEm = "";
  for (const arquivo of Object.values(ARQUIVOS)) {
    if (!arquivo) continue;
    const valores: Record<Competencia, ValorIndice> = {};
    for (const { competencia, valor } of arquivo.valores) {
      valores[competencia] = { valor, fonte: "embutida", obtidoEm: arquivo.obtidoEm };
    }
    series[arquivo.codigo] = valores;
    if (arquivo.obtidoEm > consultadoEm) consultadoEm = arquivo.obtidoEm;
  }
  return { consultadoEm, series };
}
```

- [ ] **Passo 7: Rodar e ver passar**

Execute: `npm test`
Esperado: todos passam, inclusive o total 188,28 com os dados embutidos.

- [ ] **Passo 8: Verificar e commitar (o JSON gerado vai junto)**

Execute: `npm run format && npm run verificar`

```bash
git add scripts/atualizar-indices.ts dados/indices/189.json src/indices/embutidos.ts src/indices/embutidos.test.ts && git commit -m "indices: script de atualização e cópia embutida do IGP-M (série 189)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tarefa 14: Fechamento da fase: roteiro, CLAUDE.md, verificação final

**Arquivos:**
- Modificar: `docs/superpowers/roteiro.md` (tabela de fases), `CLAUDE.md` (seção "Estado")

- [ ] **Passo 1: Rodar a verificação completa e a build**

Execute: `npm run verificar && npm run build`
Esperado: tudo verde; `dist/` gerado. Conte os testes: devem existir arquivos de teste para decimal, datas, formatação, tipos, metodologia padrão, períodos, correção, juros, calcular, casos, cliente-bcb e embutidos (12 arquivos).

- [ ] **Passo 2: Atualizar a tabela do roteiro**

Em `docs/superpowers/roteiro.md`, troque a linha da fase 1 por (use a data do dia):

```markdown
| 1 · Fundação e motor do regime antigo | projeto Vite/React/TS, Vitest, ESLint/Prettier, CLAUDE.md, primitivas (decimal, datas, rateio), caso SAJ 2018 reproduzido, cópia embutida do IGP-M e script de índices | concluída em AAAA-MM-DD · plano: `docs/superpowers/plans/2026-10-10-fase-1-fundacao-e-motor-regime-antigo.md` |
```

e a situação da fase 2 de "pendente" para "plano a escrever".

- [ ] **Passo 3: Atualizar a seção "Estado" do `CLAUDE.md`**

```markdown
## Estado

Fase 1 (fundação e motor do regime antigo) concluída em AAAA-MM-DD: projeto, primitivas, motor do
regime antigo reproduzindo o caso SAJ 2018 e cópia embutida do IGP-M. Próxima: fase 2 (regime novo
e transição), com plano a escrever. A tabela de fases do roteiro é a referência; atualize-a e esta
seção ao concluir cada fase.
```

- [ ] **Passo 4: Commit**

```bash
git add docs/superpowers/roteiro.md CLAUDE.md && git commit -m "docs: fase 1 concluída no roteiro e no CLAUDE.md" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Passo 5: Integrar o trabalho**

Use a skill `superpowers:finishing-a-development-branch`: o repositório ainda não está no GitHub, então a integração é local (merge da branch de trabalho na `main`), e a decisão é do responsável.

---

## Notas para as fases seguintes (ganchos deixados por esta fase)

- **Fase 2 (regime novo e transição).** Em `src/motor/juros.ts`, substituir o ramo `regra.tipo !== "percentualMensal"` por: `taxaLegal` (série 29543; nos meses parciais, dias = diferença entre as datas, sem contar o dia inicial, o que equivale a `ratearPorMesCalendario(diaSeguinte(de), ate)`; em 30 e 31/08/2024 vale a taxa de agosto/2024) e `selicUnica` (série 4390, sem correção, mês corrente parcial sem rateio). Em `src/motor/calcular.ts`, multa e honorários sobre `totalDevido` (zero se ≤ 0). Períodos de metodologia com dias descobertos: aviso. Encargos próprios (termos e metodologia própria) já funcionam em `atualizarLancamento`; faltam só os casos de referência. Deflação: caso de referência com piso. Rodar `npm run indices:atualizar -- 433 29543 4390` e registrar os arquivos em `ARQUIVOS` de `src/indices/embutidos.ts`.
- **Fase 3 (bases e lotes).** Em `atualizarLancamento`, o ramo `valorInformado === undefined` passa a apurar o valor-base pela `base` do cálculo (`src/motor/base.ts`, com `memoriaBase` explicando a conta); `src/motor/lote.ts` gera lançamentos; casos-limite da §6.7 (vincenda marcada, amortização posterior ignorada, valor ≤ 0 ignorado nos totais). Séries 1619 e 188.
- **Fase 4 (índices ao vivo).** `src/indices/cliente-bcb.ts` ganha a busca ao vivo no navegador (reutilizando `interpretarRespostaSgs` e `urlDaSerie` com `dataInicial` = mês seguinte ao último embutido), `cache.ts`, `congelar.ts` (parte de `tabelaEmbutida()`), `calendario.ts`; o workflow mensal roda `npm run indices:atualizar`.
- **Fases 5 e 6.** A interface chama `calcular(calculo, indices)` a cada alteração e lê `Resultado`; o relatório lê `Calculo` e `Resultado`. Os avisos já vêm em frases completas.

## Auto-revisão do plano

**Cobertura da fase 1 (§16 do design e tarefa desta sessão):**

| Item | Tarefa |
|---|---|
| projeto Vite/React/TS estrito, Vitest, ESLint/Prettier, decimal.js, `.gitignore` | 1 |
| `CLAUDE.md` conforme §12.3; README | 2 (estado atualizado na 14) |
| decimal e arredondamento comercial | 3 |
| datas: dias entre datas, dias do mês, rateio por mês-calendário | 4 |
| fator de correção: pro rata geométrico, meses inteiros, mês final, faltantes com fator 1, piso de deflação | 8 (usa 6 e 7) |
| juros simples por mês-calendário contando as duas pontas, sobre o valor corrigido | 9 e 10 |
| caso SAJ 2018 como arquivo de teste (sem número do processo), todas as linhas e totais | 11 |
| cópia embutida do IGP-M (série 189) em `dados/indices/` e script de atualização | 12 e 13 |
| atualização da tabela do roteiro | 14 |

**Convenções da §12:** domínio em português (nomes de funções, tipos e campos), `Decimal` para valores, datas ISO como texto, motor sem rede/relógio/DOM, imports com `.ts`, commits "módulo: o que muda". Verificadas tarefa a tarefa.

**Placeholders:** nenhum "TBD", "TODO" ou "implementar depois"; todo passo de código traz o código.

**Consistência de nomes entre tarefas:** `decimal`, `arredondar`, `paraTexto`, `ZERO`, `UM`, `CEM` (3) usados em 5, 8, 9, 10, 11; `ratearPorMesCalendario`, `competenciaDe`, `competenciasEntre`, `decompor`, `decomporCompetencia`, `diasDoMes`, `primeiroDiaDoMes` (4) usados em 8, 9, 10; `formatarMoeda`, `formatarData`, `formatarCompetencia` (5) usados em 10 e 12; `CODIGO_DA_SERIE`, `NOME_DA_SERIE`, `TabelaIndices`, `ValorIndice`, `IndiceAplicado`, `DetalheJuros`, `CasoDeReferencia`, `ArquivoSerie` (6) usados em 8 a 13; `periodoVigenteEm`, `dividirPorPeriodos` (7) usados em 8 e 9; `resolverIndicesMensais`, `fatorCorrecao`, `tabelaIgpm` (8) usados em 10; `jurosSimples` (9) usado em 10; `calcular` (10) usado em 11 e 13; `interpretarRespostaSgs`, `montarArquivoSerie`, `SERIES`, `urlDaSerie` (12) usados em 13.

**Foco da revisão:** os cinco itens têm teste na tarefa dona (8 e 9: mesmo mês; 8, 9 e 10: lançamento posterior à elaboração; 4 e 9: fevereiro bissexto; 8 e 10: índice faltante no meio; 12: respostas do BCB fora de ordem, repetidas, HTML e erro).
