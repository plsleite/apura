# Apura · Design do MVP: execução de alimentos

**Produto:** Apura — Sistema de Cálculos Judiciais da Defensoria Pública de Mato Grosso do Sul
**Documento:** especificação de design do MVP (brainstorming concluído em 10/10/2026)
**Situação:** aprovado pelo responsável em 10/10/2026
**Documentos relacionados:** `docs/superpowers/specs/2026-10-10-apura-visao-do-produto.md` (visão além do MVP) · `docs/referencia/briefing-inicial.md` (briefing original)

---

## 1. Resumo

O Apura é uma plataforma web institucional em que as regras de cálculo judicial ficam parametrizadas, para que um usuário sem conhecimento jurídico aprofundado produza cálculos corretos e auditáveis em poucos passos. Este documento especifica o **MVP**: o cálculo de **execução de alimentos** (demonstrativo discriminado e atualizado do crédito, art. 524 do CPC), sem login, sem servidor e sem banco de dados, publicado como site estático, com relatório em HTML e PDF na identidade visual da DPE-MS.

Objetivos do MVP:

1. Produzir um demonstrativo correto e auditável reproduzindo, centavo a centavo, as convenções da calculadora do SAJ Tribunais usada pelo TJMS (ver §2.3 e Anexo A).
2. Edição fácil: qualquer dado pode ser alterado a qualquer momento, e o resultado é recalculado na hora. Esse é o problema central do Dr. Calc e do próprio SAJ, em que um erro obriga a refazer tudo.
3. Memória de cálculo completa e bloco de metodologia e fundamentos gerado automaticamente a partir do que foi aplicado.
4. Índices exclusivamente oficiais (Banco Central, SGS), atualizados de forma automática e silenciosa.

Princípios de UX: automatizar ao máximo e deixar o usuário apenas ajustar o necessário; padrões sensatos pré-carregados; rótulos em linguagem simples com explicação curta ao lado; recálculo instantâneo; memória visível e auditável; saída com identidade institucional.

Princípios técnicos: uma única linguagem (TypeScript); motor de cálculo em funções puras, isolado da interface; aritmética decimal exata com arredondamento definido; toda regra nasce com teste e exemplo numérico; nenhum índice inventado; dados pessoais minimizados e nunca transmitidos.

---

## 2. Contexto e benchmark

### 2.1 Situação atual

A Defensoria usa o SAJ Defensorias (gestão processual) e o Solar (gestão de atendimentos). Nenhum calcula. O SAJ Tribunais, do TJMS, tem calculadora completa, indisponível à Defensoria. Defensores e servidores recorrem ao Dr. Calc.

### 2.2 Dr. Calc (drcalc.net) como benchmark

Analisado em 10/10/2026 (página inicial, correção monetária, planilha judicial antiga e nova, consulta de índices, termos de uso e impressões públicas de resultados).

**Aproveitar**

- Tabela de índices recentes na entrada (índice, últimos meses, acumulados no ano e em 3, 6 e 12 meses).
- Período disponível declarado junto de cada índice (o usuário vê até que mês existe).
- Geração em lote de parcelas (quantidade, data inicial, periodicidade).
- Pagamentos tratados como lançamentos negativos atualizados pelas mesmas regras (é também o método do SAJ, §2.3).
- Relatório em blocos: dados informados, dados calculados (fator do período, percentual correspondente) e memória analítica; cabeçalho em prosa descrevendo índice, juros e datas.
- Pro rata geométrico no mês parcial (coincide com o SAJ).

**Evitar**

- Terminologia sem explicação: "atualização reversa", "inclui o termo inicial", "exclui termo final", "pro rata", "juros de contagem" vs "juros especiais", "valor singelo", "indexador", "mês cheio". No Apura cada regra é dita em uma frase de ajuda, nunca em rótulo técnico.
- Exigir que o usuário conheça de antemão índice, categoria e termos.
- Nada específico para alimentos; sem tabela do TJMS.
- Pagamento parcial sem orientação ("informe somente o saldo") na planilha antiga.
- Saída como página HTML do site, sem PDF, sem identidade visual, com menu e rodapé do próprio site; "salvar planilha" gera .htm dependente do site.
- Memória por parcela ausente na planilha judicial (só colunas item, data, valor singelo, atualizado, juros, total).
- Formulário sem endereço reproduzível: errou, refaz tudo.
- Fonte dos índices apenas no nome do índice, sem data de obtenção nem metodologia.

### 2.3 Calculadora do SAJ Tribunais: o modelo de referência

Um "Relatório de Cálculo Processual – Sintético" do TJMS, emitido em 25/05/2018 para uma execução de alimentos (Anexo A), mostra a metodologia que o Apura reproduz por padrão:

- **Parâmetros declarados em prosa**: "IGP-M (FGV), da data do lançamento até 30/04/2018 (pro rata)"; "Juro legal simples de 1,00% ao mês sobre o valor corrigido, da data do lançamento até 25/05/2018".
- **Duas tabelas com as mesmas colunas**: "Atualização monetária" (as prestações) e "Amortização" (os pagamentos, como "PAGAMENTO PARCIAL" com valor negativo). Colunas: data, valor original, valor corrigido, juro legal (data e valor), juro compensatório, multa, encargos, taxa administrativa, total.
- **Totais**: atualização monetária, amortização e total geral (diferença).
- **Convenções decodificadas e verificadas** com a série oficial do IGP-M (cinco linhas reproduzidas exatamente, as demais serão verificadas pelo teste de referência):
  - correção: índice do próprio mês do lançamento aplicado **pro rata geométrico** aos dias restantes do mês (fator do mês elevado a (dias do mês − dia) ÷ dias do mês), depois os meses inteiros seguintes, até o último índice divulgado na data do cálculo (abril/2018 para cálculo em 25/05/2018);
  - juros: 1% ao mês, simples, **rateados por mês-calendário** (dias no mês ÷ dias do mês), **contando o dia do lançamento e o dia do cálculo**, sobre o valor corrigido;
  - amortizações: cada pagamento atualizado pelas mesmas regras, da data do pagamento até a data do cálculo, e subtraído do total; não há imputação a prestações específicas nem "saldo em bloco";
  - índices negativos (IGP-M de abril a julho de 2017) aplicados com o sinal que têm;
  - valores arredondados a duas casas por lançamento (corrigido e juros).

---

## 3. Escopo

### 3.1 Dentro do MVP

- Tipo de cálculo único: execução de alimentos.
- Base dos alimentos em três formas: valor fixo com reajuste anual (IGP-M, INPC, IPCA ou salário mínimo); percentual do salário mínimo; percentual dos rendimentos do alimentante (rendimento padrão com edição mês a mês).
- Prestações lançadas em lote (dia de vencimento; "N meses em atraso" ou intervalo de competências), lotes cumulativos, edição, exclusão e inclusão avulsa.
- Pagamentos (amortizações) lançados em lote ("pagou R$ X todo mês") ou avulsos.
- Encargos com dois regimes e transição automática em 30/08/2024 (Lei 14.905/2024), pré-carregados e ajustáveis; alternativas INPC, IPCA e SELIC única para o período antigo.
- Encargos próprios por lançamento: termos iniciais separados para correção e juros, e índices próprios.
- Multa e honorários do art. 523, §1º, do CPC como percentuais opcionais sobre o total devido.
- Índices oficiais do BCB/SGS com cópia embutida, atualização silenciosa e congelamento por cálculo.
- Relatório em tela e PDF (impressão do navegador) com a identidade da DPE-MS.
- Salvar e abrir o cálculo como arquivo; cinco cálculos recentes e preferências (defensor e órgão) guardados no navegador.
- Tema claro e escuro na tela; impressão sempre clara.

### 3.2 Fora do MVP (o design deixa o caminho aberto)

- Login, cadastro de usuários, autenticação institucional (Microsoft 365 / Entra ID), perfis de acesso, administrador de parâmetros.
- Guarda de cálculos por equipe em servidor.
- Integração com SAJ Defensorias, Solar ou MNI.
- Outros tipos de cálculo: honorários devidos à Defensoria, danos morais, cálculo livre.
- Inserção manual de índices (quando existir, será função de administrador, com registro de autoria).
- Geração de PDF no servidor, numeração de páginas e rodapé repetido.
- Exportação para Excel.

Como o caminho fica aberto: o estado completo de um cálculo é um único objeto serializável (§5); o motor é puro e recebe a metodologia como dado (§6), de modo que novos tipos de cálculo são novas metodologias e novas formas de gerar lançamentos; o cabeçalho é um bloco separado que integrações futuras preenchem; o relatório lê apenas Cálculo e Resultado.

### 3.3 Usuários e implantação

- MVP usado pelo responsável e por alguns colegas testadores, cada um no próprio computador, pelo navegador.
- Código em repositório privado no GitHub; aplicativo publicado automaticamente em hospedagem estática gratuita ligada ao repositório (Cloudflare Pages, alternativamente Netlify). Também roda localmente com um comando.

---

## 4. Arquitetura

### 4.1 Decisão: aplicativo que roda inteiro no navegador, em TypeScript

Alternativas consideradas: (1) site estático em TypeScript; (2) servidor em Python (FastAPI) com páginas geradas no servidor e PDF por WeasyPrint ou Playwright; (3) TypeScript completo com servidor (Next.js ou SvelteKit). Escolhida a (1): uma linguagem só, recálculo instantâneo na máquina do usuário, nada gravado em servidor, hospedagem estática gratuita, sem dependências pesadas, e o motor isolado permite acrescentar um servidor (opção 3) depois sem alterá-lo. A (2) exigiria duas linguagens na prática, servidor sempre ligado e dependências pesadas para PDF; a (3) traz peças que o MVP não usa.

Ferramentas: Vite (empacotador), React (interface), TypeScript estrito, Vitest (testes), decimal.js (aritmética decimal), ESLint e Prettier. Node 22 e git já disponíveis na máquina de desenvolvimento.

Verificação feita em 10/10/2026: a API SGS do BCB responde a chamadas feitas pelo navegador (CORS liberado para GET simples, sem cabeçalhos personalizados), o que dispensa servidor intermediário para buscar índices.

### 4.2 Módulos (pastas de `src/`)

| Módulo | Responsabilidade | Depende de |
|---|---|---|
| `motor/` | Funções puras: gerar lançamentos em lote, apurar valor-base, atualizar cada lançamento, totais, avisos. Recebe Cálculo + tabela de índices, devolve Resultado. Sem rede, relógio ou tela. | `compartilhado/` |
| `indices/` | Cópia embutida das séries, cliente da API do BCB, cache no navegador, congelamento por cálculo, calendário de divulgação. Entrega uma tabela de índices ao motor. | `compartilhado/` |
| `metodologias/` | Metodologias de encargos em JSON versionado (padrão "TJMS/SAJ v1"). | — |
| `ui/` | Tela única em duas colunas; edita o Cálculo; chama o motor a cada alteração; recentes e preferências. | `motor/`, `indices/`, `metodologias/`, `relatorio/` |
| `relatorio/` | Componente do relatório (tela e impressão), texto de metodologia gerado, matriz de índices, marca e CSS de impressão. | `motor/` (tipos) |
| `compartilhado/` | Tipos básicos, datas, decimal, formatação pt-BR. | — |

### 4.3 Fluxo de dados

1. Ao abrir o app ou iniciar um novo cálculo, `indices/` atualiza silenciosamente as séries (§8) e congela uma tabela de índices para o cálculo.
2. O usuário edita o Cálculo pela interface (lotes, lançamentos, encargos, cabeçalho).
3. A cada alteração, `ui/` chama `motor.calcular(calculo, indices)` e recebe o Resultado.
4. `relatorio/` renderiza Cálculo + Resultado na tela e, por impressão, em PDF.
5. "Salvar" grava Cálculo + Resultado em arquivo JSON; "recentes" guarda os cinco últimos no navegador.

### 4.4 Evoluções previstas e como se encaixam

- Servidor com login e guarda por equipe: armazena o mesmo JSON do Cálculo; o motor pode rodar no navegador ou no servidor (mesma linguagem).
- Integrações SAJ/Solar/MNI: preenchem o bloco `cabecalho`.
- Novos tipos de cálculo: novas metodologias em `metodologias/` e novos geradores de lançamentos; o motor de atualização é o mesmo.
- Administrador de parâmetros: edição das metodologias com versionamento.

---

## 5. Modelo de dados

### 5.1 Regras de representação

- Valores monetários, percentuais e índices são guardados como texto decimal (ex.: `"451.91"`, `"0.64"`), nunca como número de ponto flutuante. No motor, são `Decimal` (decimal.js).
- Datas como `"AAAA-MM-DD"`; competências como `"AAAA-MM"`. O motor não usa objetos `Date` nem o relógio; a data de elaboração vem no Cálculo.
- O arquivo salvo contém `calculo` (entradas) e `resultado` (derivado, para auditoria). Ao reabrir, o Apura recalcula com os índices atuais e avisa se algum índice usado mudou.
- Todo arquivo traz `formato: "apura/calculo@1"` para permitir migrações futuras.

### 5.2 Cálculo (entradas)

```ts
Calculo {
  formato: "apura/calculo@1"
  tipo: "alimentos"                       // outros tipos no futuro
  id: string; criadoEm: string; atualizadoEm: string
  dataElaboracao: "AAAA-MM-DD"            // padrão: hoje; editável
  cabecalho: { defensor; orgao; processo; exequente; executado }   // texto livre
  base:
    | { tipo: "valorFixo"; valor; dataFixacao; indiceReajuste: "IPCA"|"INPC"|"IGP-M"|"SM"|"nenhum"; mesReajuste: 1..12 }
    | { tipo: "percentualSalarioMinimo"; percentual }
    | { tipo: "percentualRendimentos"; percentual; rendimentoPadrao }
  lotes: { ultimoLotePrestacoes?; ultimoLoteAmortizacoes? }   // só conveniência de tela
  lancamentos: Lancamento[]
  metodologia: Metodologia                // cópia da metodologia aplicada (§5.3), com flag `ajustada`
  acrescimos: { multaPercentual: "0"; honorariosPercentual: "0" }   // sugestão na tela: 10 e 10
  observacoes: string                      // vai para "Metodologia e fundamentos"
}

Lancamento {
  id: string
  tipo: "prestacao" | "amortizacao"
  data: "AAAA-MM-DD"                       // vencimento ou data do pagamento
  competencia?: "AAAA-MM"                  // prestações
  descricao?: string                       // ex.: "13º salário 2025", "Pagamento parcial"
  valorInformado?: string                  // amortizações sempre; prestações só quando o valor foi informado à mão (as demais, pela base, §6.3)
  rendimento?: string                      // base em % dos rendimentos: rendimento daquele mês
  encargos?: EncargosProprios              // §6.5
  origem: "lote" | "avulso"
  editado: boolean                         // marca da tela (lápis; não sobrescrever ao relançar lote); o motor não o lê
}

EncargosProprios {
  termoInicialCorrecao?: "AAAA-MM-DD"      // padrão: data do lançamento
  termoFinalCorrecao?: "AAAA-MM-DD"        // padrão: data de elaboração
  termoInicialJuros?: "AAAA-MM-DD"         // padrão: data do lançamento
  termoFinalJuros?: "AAAA-MM-DD"           // padrão: data de elaboração
  metodologia?: Metodologia                // substitui a metodologia global só neste lançamento,
                                           // com seus próprios períodos (de/até), índices e taxas
}
```

### 5.3 Metodologia (regras de encargos aplicadas)

```ts
Metodologia {
  id: "tjms-saj"; versao: 1; nome: "TJMS/SAJ"; ajustada: boolean
  periodos: Array<{
    de: "AAAA-MM-DD" | null; ate: "AAAA-MM-DD" | null
    correcao: { indice: "IGP-M"|"INPC"|"IPCA"|"nenhum" }
    juros: { tipo: "percentualMensal"; taxaMensal: "1" }
         | { tipo: "taxaLegal" }           // série 29543 do BCB
         | { tipo: "selicUnica" }          // série 4390, sem correção
  }>
  incidenciaMesInicial: "proRata" | "mesSeguinte"      // padrão: proRata (SAJ)
  deflacao: "aplicarComPiso" | "aplicarSemPiso" | "zerarNegativos"   // padrão: aplicarComPiso
  arredondamento: { fatorCasas: 6; percentualCasas: 6; valorCasas: 2; modo: "comercial" }
}
```

Metodologia padrão "TJMS/SAJ v1": período até 29/08/2024 com IGP-M e 1% ao mês; período desde 30/08/2024 com IPCA e taxa legal. O nome e a versão aparecem só na tela e no arquivo; o relatório descreve apenas o que foi aplicado (§10.4).

### 5.4 Resultado (derivado pelo motor)

```ts
Resultado {
  lancamentos: Array<{
    id; tipo; data; competencia?; descricao?
    valorBase: string; memoriaBase: string          // ex.: "30% do salário mínimo de mar/2024 (R$ 1.412,00) = R$ 423,60"
    editado: boolean                                 // valor informado à mão, não apurado pela base (§6.3)
    situacao: "atualizado" | "vincenda" | "ignorado" // §6.7 (fase 3)
    correcao: { fator: string; indices: Array<{ serie; competencia; valor; fracao }>; pisoAplicado: boolean }
    corrigido: string
    juros: { percentual: string; detalhe: Array<{ regime; de; ate; dias; diasDoMes?; taxa; percentual }> }
    jurosValor: string
    atualizado: string
    avisos: string[]
  }>
  totais: { prestacoes; amortizacoes; totalDevido; multa; honorarios; totalGeral }
  indicesUsados: Array<{ serie; competencia; valor; fonte; obtidoEm }>
  consultaIndices: { em: string; series: string[]; ultimoMesPorSerie: Record<string, string> }
  avisos: string[]     // meses sem índice, lançamentos vincendos, valores editados à mão, total devido não positivo etc.
}
```

### 5.5 Armazenamento no navegador

- **Preferências**: defensor e órgão, com "Lembrar neste navegador" (ligado por padrão) e "Esquecer".
- **Cálculos recentes**: os cinco últimos, salvos a cada alteração, listados em "Abrir…" por data, processo e partes; "Remover" por item e "Limpar recentes"; opção "Guardar cálculos recentes neste navegador" em "1 · Processo", ligada por padrão, para desligar em computador compartilhado; "Esquecer" apaga preferências e recentes.
- **Cache de índices** (§8).
- Nada mais é gravado; nada é transmitido.

---

## 6. Motor de cálculo

Todas as regras abaixo nascem com teste e exemplo numérico (§11). O motor nunca lança erro por dado do usuário: devolve avisos.

### 6.1 Geração em lote de prestações

- Entrada: dia do vencimento (1–31) e, ou "N meses em atraso", ou intervalo de competências (de/até, inclusive).
- "N meses em atraso": a última prestação é a do vencimento mais recente que não ultrapassa a data de elaboração; as demais vêm para trás, mês a mês. Exemplo de referência: dia 5, 3 meses, elaboração em 10/10/2026 → 05/08, 05/09 e 05/10/2026. Elaboração em 03/10/2026 → 05/07, 05/08 e 05/09/2026.
- Dia 31 (ou 29/30) em mês mais curto → último dia do mês.
- Lotes são cumulativos: cada "Lançar em lote" acrescenta à lista. Competência já existente não é duplicada; o aviso diz quais foram puladas.
- A competência de cada prestação é o mês do vencimento, e a base (§6.3) usa sempre o mês da data do vencimento (decisão de 11/10/2026). As prestações do lote nascem sem valor informado (o motor as apura pela base), com origem "lote" e id `p-AAAA-MM` (`p-AAAA-MM-2`, `-3`… se o id já existir).
- Vencimento em fim de semana ou feriado: mantido como está (mora automática, art. 397 do CC); o usuário pode editar datas individualmente.

### 6.2 Geração em lote de amortizações

- Entrada: valor por mês, dia do pagamento (a tela o preenche com o dia do vencimento; o motor recebe sempre o dia) e intervalo de meses. Gera um lançamento `amortizacao` por mês, descrição "Pagamento parcial", editável, com id `a-AAAA-MM`. Meses que já têm pagamento lançado são pulados, com aviso (decisão de 11/10/2026); um segundo pagamento no mesmo mês entra como pagamento avulso. Amortizações avulsas são lançadas na tabela de resultado.

### 6.3 Valor-base de cada prestação

- A base usa sempre o mês da data do vencimento da prestação (a competência é o rótulo da linha e, no lote, é igual ao mês do vencimento). Toda prestação sem valor informado, de lote ou avulsa, é apurada pela base (decisões de 11/10/2026, fase 3).
- Valor fixo com reajuste por índice (IGP-M, INPC ou IPCA): no mês do reajuste (padrão: mês da fixação; editável), o valor vigente é multiplicado pelo índice acumulado dos 12 meses anteriores ao mês do reajuste; a partir daí, a cada 12 meses. O primeiro reajuste cai 12 meses após a fixação quando o mês do reajuste é o próprio mês da fixação (fixado em 15/03/2024, reajuste em março: mar/2025, com o acumulado de mar/2024 a fev/2025); com outro mês escolhido, cai na primeira ocorrência dele depois do mês da fixação, com o acumulado desde o mês da fixação até o mês anterior ao reajuste (pode ter menos de 12 meses). O acumulado (produto dos fatores mensais) multiplica com precisão integral e aparece na memória com 4 casas; o valor reajustado é arredondado a 2 casas a cada reajuste, e o seguinte parte dele. Acumulado negativo ou zero não reduz o valor: o valor vigente é mantido e a memória registra. Se faltar na tabela algum mês do acumulado, o reajuste não é aplicado, o valor vigente anterior é mantido e o aviso diz até que mês o índice está disponível.
- Reajuste "pelo salário mínimo": valor × (salário mínimo do mês do vencimento ÷ salário mínimo do mês da fixação), sem usar o mês de reajuste (o valor acompanha o salário mínimo no mês em que ele muda). "Nenhum": valor constante.
- Prestação anterior ao mês da fixação: entra com o valor fixado, sem reajuste, com aviso.
- Percentual do salário mínimo: percentual × salário mínimo do mês do vencimento (série 1619). Mês ainda sem salário mínimo publicado: usa-se o último publicado, que vigora até o novo decreto, com aviso; a proveniência registra o mês realmente usado.
- Percentual dos rendimentos: percentual × rendimento do mês (o do lançamento, se informado; senão o padrão). Não há reajuste automático: quando o rendimento muda, o usuário informa o novo rendimento nos meses afetados ou altera o padrão.
- Valor informado à mão prevalece: a linha do resultado traz `editado = true`, aviso no lançamento e resumo no resultado; o relatório menciona esses valores. Amortizações têm o valor sempre informado e não recebem a marca.
- Valor-base arredondado a 2 casas. `memoriaBase` explica a conta em uma frase (ex.: "30% do salário mínimo de mar/2024 (R$ 1.412,00) = R$ 423,60"; "R$ 500,00 fixados em 15/03/2024, reajustados em mar/2025 (IPCA de mar/2024 a fev/2025: 5,0576%) = R$ 525,29").
- 13º salário e férias, quando a base for percentual dos rendimentos, entram como prestação avulsa com descrição e com o rendimento do evento informado no lançamento; o motor aplica o percentual (ponto de validação 11, decidido em 11/10/2026).

### 6.4 Atualização de cada lançamento (método SAJ)

Cada lançamento, prestação ou amortização, é atualizado independentemente, da sua data até a data de elaboração. Não há imputação de pagamentos a prestações nem saldo em bloco; a ordem dos lançamentos não altera o resultado.

**Correção monetária** (fator multiplicativo)

1. Mês da data do lançamento: com `incidenciaMesInicial = "proRata"` (padrão), o fator do mês é `(1 + i/100) ^ ((diasDoMes − dia) ÷ diasDoMes)`; com `"mesSeguinte"`, o mês não entra.
2. Meses seguintes inteiros, até o último mês com índice divulgado que não ultrapasse o mês do termo final da correção (padrão: data de elaboração).
3. Mês da data de elaboração: se o índice desse mês já existir (só ocorre em cálculos com data de elaboração no passado), aplica-se pro rata geométrico de `dia ÷ diasDoMes`; se não existir, o mês entra com fator 1,000000 e o relatório lista o mês como "ainda não divulgado". Meses intermediários sem índice também entram com 1,000000 e aviso (nunca há estimativa).
4. O índice de cada mês é o da metodologia vigente no primeiro dia daquele mês: até agosto/2024 o índice do período antigo (IGP-M por padrão), de setembro/2024 em diante o IPCA.
5. Deflação: índices negativos entram com o sinal que têm; com `deflacao = "aplicarComPiso"` (padrão), se o fator acumulado ficar abaixo de 1,000000 ele é elevado a 1,000000 e o relatório registra o piso. Alternativas: `"aplicarSemPiso"` e `"zerarNegativos"`.
6. O fator multiplica com precisão integral e é impresso com 6 casas (decisão de 11/10/2026, ponto 9): `corrigido = arred2(valorBase × fator)`.
7. Termos próprios (§6.5): o passo 1 usa o termo inicial da correção e o passo 3 usa o termo final da correção, quando informados.
8. Períodos da metodologia: o índice de cada mês é o do período em que cai o primeiro dia do mês. Uma metodologia pode ter quantos períodos forem necessários (ex.: IGP-M de 2020 a 2022, IPCA de 2023 em diante).

**Juros de mora** (percentual aditivo, simples, sobre o valor corrigido)

- Regime antigo (`percentualMensal`, 1% ao mês por padrão): rateio por mês-calendário, `taxa × dias ÷ diasDoMes` em cada mês tocado, contando o dia do termo inicial e o dia final (ambas as pontas), como o SAJ. Período: do termo inicial dos juros (padrão: data do lançamento) até o termo final dos juros (padrão: data de elaboração); dentro dele, cada período da metodologia aplica a própria taxa aos dias que lhe cabem (ex.: 1% ao mês de 2020 a 2022 e 2% ao mês de 2023 em diante), e os percentuais se somam.
- Regime novo (`taxaLegal`): taxa legal mensal da série 29543 do BCB, acumulada por juros simples; nos meses parciais, `TL_m × dias ÷ diasCorridosDoMes`, com dias contados como diferença entre as datas (conta-se o dia inicial e não se conta o dia do termo final, como a Calculadora do Cidadão; decisão de 11/10/2026), conforme a metodologia e o exemplo oficial do BCB (Resolução CMN 5.171/2024, art. 6º). Em 30 e 31/08/2024 vale a taxa de agosto/2024 (art. 8º, parágrafo único). A taxa do mês corrente é publicada no 1º dia útil do próprio mês, portanto não há lacuna. Piso zero já embutido na série.
- Transição: para lançamento anterior a 30/08/2024, juros do regime antigo até 29/08/2024 (inclusive) e taxa legal de 30/08/2024 até a data de elaboração; os dois percentuais se somam (juros simples de ponta a ponta) e incidem uma única vez sobre o valor corrigido.
- SELIC única (`selicUnica`, alternativa para o período antigo, Tema 1.368 do STJ): a SELIC (série 4390) entra como índice de correção capitalizado mês a mês, com pro rata geométrico no mês inicial, como o SAJ; não há juros separados; no mês corrente, o valor parcial já publicado pelo BCB entra inteiro, sem rateio (decisão de 11/10/2026); quando o lançamento cai no próprio mês do cálculo, o valor parcial é rateado pelos dias decorridos, (dia do cálculo − dia do lançamento) ÷ dia do cálculo (regra adotada na execução da fase 2 e confirmada pelo responsável em 11/10/2026).
- O percentual total multiplica com precisão integral, é impresso com 6 casas e incide sobre o valor corrigido sem arredondar, como o SAJ (decisão de 11/10/2026, fase 3): `jurosValor = arred2(valorBase × fator × percentual ÷ 100)`. `atualizado = corrigido + jurosValor`.
- Termo inicial dos juros posterior à data de elaboração, ou período de zero dias: juros zero, sem erro.

### 6.5 Encargos próprios por lançamento e metodologia por períodos

**Metodologia por períodos.** Tanto a metodologia global quanto a de um lançamento são listas de períodos (de/até), cada um com seu índice de correção e sua regra de juros (percentual mensal com a taxa que o usuário informar, taxa legal ou SELIC única). O usuário pode dividir um período em uma data e remover divisões, pela tela. Exemplo: juros de 1% ao mês e IGP-M de 2020 a 2022; juros de 2% ao mês e IPCA de 2023 em diante. A transição legal de 30/08/2024 é apenas a divisão que já vem pré-carregada.

**Termos próprios.** Qualquer lançamento pode ter, para a correção e para os juros separadamente, termo inicial (padrão: data do lançamento) e termo final (padrão: data de elaboração). Exemplos: danos morais com correção desde o arbitramento e juros desde o evento danoso; repetição de indébito com correção do desembolso e juros da citação; sentença de alimentos que fixe termo diverso; encargos que cessam em uma data (depósito judicial) anterior à data de elaboração.

**Metodologia própria.** Um lançamento pode ainda substituir a metodologia global pela sua, com períodos, índices e taxas próprios, editada no mesmo painel da metodologia global.

A metodologia global é o padrão; a personalização é a exceção e aparece descrita no relatório sem a palavra "personalização": o texto diz os termos, índices e taxas daquele lançamento.

### 6.6 Totais, multa e honorários

- `prestacoes` = soma dos atualizados das prestações; `amortizacoes` = soma dos atualizados das amortizações; `totalDevido = prestacoes − amortizacoes`.
- Multa e honorários (art. 523, §1º, do CPC): cada percentual aplicado separadamente sobre `totalDevido` (honorários não incidem sobre a multa), arredondados a 2 casas; zero se `totalDevido ≤ 0`. `totalGeral = totalDevido + multa + honorarios`.
- `totalDevido` negativo ou zero: aviso "as amortizações atualizadas superam as prestações"; nunca se exibe dívida negativa como devida.

### 6.7 Casos-limite (com aviso, sem travar)

- Prestação com data posterior à data de elaboração: entra pelo valor nominal, sem correção e sem juros, mesmo com termos próprios, com `situacao = "vincenda"` (art. 323 do CPC) e aviso; soma nos totais; pode ser excluída.
- Amortização posterior à data de elaboração: `situacao = "ignorado"`, fora dos totais, com aviso; a linha permanece no resultado pelo valor nominal.
- Mês sem salário mínimo publicado: usa-se o último publicado, com aviso (§6.3). Mês sem índice de reajuste: o reajuste não é aplicado e o valor vigente anterior é mantido, com aviso. Sem nenhum salário mínimo anterior, sem rendimento válido ou com texto decimal inválido na base: a prestação fica sem valor (`ignorado`), com aviso pedindo o valor à mão.
- Valor zero ou negativo, texto decimal inválido (`"1,5"`, vazio, `"NaN"`, `"Infinity"`) ou pagamento sem valor: aviso; lançamento `ignorado` nos totais. Amortizações são informadas como valores positivos (o SAJ as imprime negativas).
- Datas inválidas: validação na tela; o motor recebe só datas válidas.

### 6.8 Arredondamento

Modo comercial (meio para cima) nos valores: valor-base (2 casas), corrigido (2), juros (2), multa e honorários (2). O fator e o percentual de juros são impressos com 6 casas, mas multiplicam com precisão integral (como o SAJ): quem refizer a conta com os números impressos pode encontrar diferença de até R$ 0,01 (decisão de 11/10/2026). Os juros incidem sobre o corrigido sem arredondar (`valorBase × fator × percentual`), como o SAJ (decisão de 11/10/2026, fase 3).

---

## 7. Pontos de validação jurídica

Confirmar com colegas ou com a contadoria do TJMS antes de implementar a regra correspondente, ou com gabaritos do SAJ quando chegarem. Os padrões atuais são os decididos neste documento.

1. Correção pro rata geométrica no mês do lançamento e meses inteiros até o último índice divulgado (confirmado no SAJ 2018); pro rata no mês final quando o índice existir (a confirmar).
2. Juros de 1% ao mês rateados por mês-calendário contando as duas pontas, sobre o valor corrigido (confirmado no SAJ 2018).
3. Transição em 30/08/2024: índice de agosto/2024 pelo regime antigo; juros antigos até 29/08; taxa legal de agosto em 30 e 31/08. Contagem de dias da taxa legal pela metodologia do BCB, diferente da contagem do SAJ no regime antigo (decidido em 11/10/2026; ver nota abaixo).
4. Taxa legal: série 29543, soma simples, pro rata por dias corridos, sobre o valor corrigido pelo IPCA, conferida na Calculadora do Cidadão do BCB (decidido em 11/10/2026; ver nota abaixo).
5. SELIC única (Tema 1.368): rateio mensal e tratamento do mês corrente parcial (decidido em 11/10/2026; ver nota abaixo).
6. Reajuste anual do valor fixo: momento do primeiro reajuste e janela de 12 meses; reajuste pelo salário mínimo como proporção (decidido em 11/10/2026; ver nota da fase 3).
7. Método de amortização do SAJ (lançamentos negativos atualizados até a data do cálculo) como padrão único do MVP (decidido em 11/10/2026; ver nota da fase 3).
8. Multa e honorários: base (total devido) e não cumulação; só no rito da penhora (decidido em 11/10/2026; ver notas abaixo).
9. Arredondamento: fator e percentual impressos com 6 casas e multiplicados com precisão integral, juros sobre o corrigido sem arredondar, valores com 2 casas por lançamento, confrontados com os gabaritos do SAJ (decidido em 11/10/2026; ver notas abaixo).
10. IGP-M como índice padrão do período antigo em MS, com INPC, IPCA e SELIC única como alternativas (decidido em 11/10/2026; ver nota da fase 3).
11. 13º e férias quando a base é percentual dos rendimentos (decidido em 11/10/2026; ver nota da fase 3).
12. Deflação: índices negativos aplicados com piso no valor original (decidido em 11/10/2026; ver nota abaixo).

**Decisões registradas em 11/10/2026 (fase 2).** Pontos 3 e 4: o SAJ Tribunais não calcula a taxa legal (segue IGP-M e 1% ao mês); o gabarito do regime novo é a Calculadora do Cidadão do BCB, que conta o dia inicial e não conta o dia final; na transição, 30/08/2024 conta. Ponto 5: SELIC única capitalizada mês a mês como índice de correção, sem juros, como o SAJ. Para lançamento no próprio mês do cálculo, a execução adotou ratear o valor parcial da SELIC pelos dias decorridos, (dia do cálculo − dia do lançamento) ÷ dia do cálculo, regra confirmada pelo responsável em 11/10/2026. Ponto 8: confirmado. Ponto 9: fator e percentual multiplicam com precisão integral e são impressos com 6 casas, como o SAJ. Ponto 12: piso mantido (STJ, REsp 1.265.580/RS), decidido sobre o fator bruto; o SAJ não aplica piso. Observação: a tabela do SAJ traz IGP-M de dez/2025 = −0,02 (BCB: −0,01).

**Decisões registradas em 11/10/2026 (fase 3).** Ponto 6: regra da §6.3 confirmada e completada: primeiro reajuste 12 meses após a fixação (ou na primeira ocorrência do mês escolhido, com o acumulado desde a fixação), acumulado com precisão integral impresso com 4 casas, valor arredondado a 2 casas a cada reajuste, acumulado negativo não reduz, reajuste pelo salário mínimo pela proporção do mês do vencimento sem usar o mês de reajuste, prestação anterior à fixação pelo valor fixado com aviso. Ponto 7: método do SAJ confirmado como padrão único. Ponto 9 (complemento): os juros incidem sobre o corrigido sem arredondar, como o SAJ (relatório de 11/10/2026 com 22 prestações, duas delas na fronteira do centavo). Ponto 10: IGP-M confirmado como padrão do período antigo, com INPC, IPCA e SELIC única como alternativas; a SELIC já inclui correção e juros, e o motor avisa quando um período a combina com índice de correção (um relatório do SAJ de 11/10/2026 que usa a SELIC como indexador e como juros conta a SELIC dos meses intermediários duas vezes, combinação que o Apura não oferece; a coluna de correção dele coincide com a SELIC única do Apura). Ponto 8 (confirmação adicional): no mesmo relatório, os honorários do SAJ incidem sobre atualização menos amortização, a base do Apura. Ponto 11: 13º e férias como prestação avulsa com o rendimento do evento informado; o rendimento é sempre informado (padrão ou do mês), sem reajuste automático. Lacunas fechadas: competência = mês do vencimento; lote de pagamentos pula meses já lançados; salário mínimo ainda não publicado → último publicado; a marca "editado" vale só para prestações com valor informado; o resultado traz `situacao` e `editado` em cada linha. Gabaritos: dois relatórios do SAJ de 11/10/2026 reproduzidos centavo a centavo, um com base "valor informado" (R$ 1.500,00 × 0,30, sem reajuste, como caso de % dos rendimentos) e outro com INPC, base "salário mínimo do período" e pagamentos mensais (tabela de INPC igual à do BCB); o SAJ não tem valor fixo com reajuste por índice, cujo caso é conferido na Calculadora do Cidadão e por aritmética independente.

---

## 8. Índices

### 8.1 Séries (API SGS do BCB, `https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados?formato=json&dataInicial=dd/mm/aaaa&dataFinal=dd/mm/aaaa`)

| Código | Série | Uso |
|---|---|---|
| 433 | IPCA, variação % mensal | correção do regime novo; alternativa no antigo; reajuste |
| 188 | INPC, variação % mensal | alternativa; reajuste |
| 189 | IGP-M, variação % mensal | padrão do regime antigo; reajuste |
| 1619 | salário mínimo, R$ por mês (meses futuros do ano já publicados) | base em % do salário mínimo; reajuste pelo salário mínimo |
| 29543 | taxa legal (art. 406 do CC), % mensal, 6 casas, desde ago/2024 | juros do regime novo |
| 4390 | SELIC acumulada no mês, % (mês corrente parcial) | alternativa SELIC única |

Fora do MVP: SELIC diária (11), IPCA-15 (7478), fatores auxiliares da taxa legal (29541, 29542).

Fatos verificados em 10/10/2026: resposta JSON `[{"data":"dd/mm/aaaa","valor":"0.82"}]` com valor em texto e ponto decimal; séries mensais datadas no dia 01; a 4390 vem em ordem decrescente no endpoint `ultimos/N` (sempre ordenar por data); séries mensais aceitam o histórico completo numa chamada; erros 400/404/406 em JSON; série inexistente devolve HTML com status 200 (validar o tipo de conteúdo); cache do BCB de 15 minutos; sem limite de taxa observado; lentidão ocasional (tempo-limite de 30 s e nova tentativa com espera crescente).

### 8.2 Três camadas, sem botão e sem inserção manual

1. **Cópia embutida**: um arquivo JSON por série em `dados/indices/`, gerado pelo script `scripts/atualizar-indices.ts`, com `obtidoEm` e endereço de origem. Atualizada mensalmente por rotina do GitHub (por volta do dia 12, após a divulgação do IPCA), que grava no repositório e republica o site; também pode ser executada à mão.
2. **Busca ao vivo, silenciosa**: ao abrir o app e ao iniciar um novo cálculo, o navegador pede ao BCB apenas os meses posteriores aos que já tem (GET simples, sem cabeçalhos personalizados), valida e ordena a resposta e guarda no cache do navegador com a data de obtenção. Falhas são silenciosas: o app segue com o que tem.
3. **Congelamento por cálculo**: a tabela de índices usada por um cálculo é fixada quando ele começa. Os números não mudam enquanto o usuário digita, e a data de consulta impressa no relatório é verdadeira. Cálculo novo pega o mais recente; cálculo reaberto é recalculado com os índices atuais, com aviso se algum mudou.

Não há inserção manual de índices no MVP (§3.2).

### 8.3 Proveniência e sinalização

- Cada valor carrega série, competência, valor, fonte (cópia embutida ou ao vivo) e data de obtenção; o Resultado lista os efetivamente usados.
- Único sinal na tela, no rodapé, sem botão: "Índices oficiais BCB/SGS · IPCA até set/2026 · consultados em 10/10/2026 14:02"; em falha: "usando índices de 12/09/2026".
- Calendário de divulgação conhecido pelo app, para avisos em português claro: IPCA e INPC por volta do dia 10 do mês seguinte; IGP-M no fim do próprio mês; taxa legal no 1º dia útil do mês de referência; salário mínimo com antecedência.

---

## 9. Interface

### 9.1 Layout

Página única em duas colunas (em telas estreitas, as colunas empilham com o resumo no topo). **Esquerda: dados do caso e lançamentos em lote. Direita: resultado e lançamentos individuais.** Recálculo a cada alteração, sem botão "Calcular".

Barra superior: nome do sistema ("Apura · Sistema de Cálculos Judiciais · DPE-MS"), "Novo cálculo", "Abrir…" (recentes e arquivo), "Salvar" (arquivo `apura-<processo>-<data>.json`), "Relatório / PDF".

### 9.2 Seções da esquerda

1. **Processo**: defensor(a) e órgão (lembrados no navegador, com "Lembrar neste navegador" e "Esquecer"), nº do processo, exequente (alimentando), executado (alimentante); opção "Guardar cálculos recentes neste navegador". Ajuda: partes e processo não são gravados em servidor algum.
2. **Base dos alimentos**: três opções; só os campos da opção escolhida aparecem; ajuda sobre reajuste e salário mínimo.
3. **Prestações em atraso**: dia do vencimento; "Meses em atraso" ou "De / até"; botão "Lançar em lote" (cumulativo).
4. **Pagamentos**: valor por mês, dia do pagamento, de / até; botão "Lançar em lote".
5. **Encargos e data do cálculo**: metodologia com resumo em uma frase e "Ajustar…", que abre o editor de períodos: lista de períodos (de/até) com índice de correção e regra de juros (tipo e taxa) em cada um, "Dividir em uma data" e "Remover divisão", incidência no mês inicial e tratamento da deflação; multa e honorários (padrão 0, sugestão 10); data de elaboração; observações para o relatório.

### 9.3 Lado direito

- Cinco indicadores, na ordem: prestações atualizadas · amortizações atualizadas · total devido na data (destaque) · multa e honorários · total geral (destaque).
- Tabela de prestações: competência, vencimento, valor, fator, corrigido, juros (% e R$), atualizado; clique na competência expande a memória (índices mês a mês, dias de juros por mês e regime); lápis abre "Personalizar" (valor, vencimento, descrição, termos inicial e final da correção e dos juros, e metodologia própria no mesmo editor de períodos); ✕ exclui; "+ Prestação" inclui avulsa.
- Tabela de amortizações com as mesmas colunas; "+ Pagamento" inclui avulsa.
- Caixa de avisos em frases completas, só quando houver.
- Rodapé: situação dos índices (sem botão) e versão do Apura.

### 9.4 Regras gerais

- Texto de ajuda curto, sempre visível, embaixo de cada grupo de campos; nenhum rótulo técnico sem explicação.
- Validação inline (datas, percentuais, valores), sem janelas pop-up.
- Formatação pt-BR (R$ 1.234,56; dd/mm/aaaa); entrada de valores aceita vírgula.
- Tema claro e escuro conforme o sistema; impressão sempre clara.
- Acessibilidade básica: rótulos associados, navegação por teclado, contraste das cores da marca.

---

## 10. Relatório e PDF

### 10.1 Estrutura (mockup v6 aprovado)

1. **Faixa verde** com a marca (logo horizontal branco da DPE-MS à direita). À esquerda, em linhas separadas: órgão de atuação (pequeno, caixa alta); título "Demonstrativo discriminado e atualizado do crédito · dd/mm/aaaa"; "Processo nº …"; "Exequente: … · Executado: …"; "Defensor(a): …". Linha dourada abaixo.
2. **Indicadores**: prestações atualizadas · amortizações atualizadas · total devido na data (destaque) · multa e honorários · total geral (destaque).
3. **Prestações**: tabela com competência, vencimento, valor, fator de correção (6 casas), corrigido, juros (% com 6 casas e R$), atualizado, barra proporcional; linha de totais. Lançamentos com termos ou índices próprios ganham o detalhamento logo abaixo da tabela.
4. **Amortizações**: mesma estrutura de colunas; linha de totais.
5. **Totais**: prestações atualizadas; amortizações atualizadas (negativo); total devido; multa; honorários; total geral.
6. **Metodologia e fundamentos** (§10.4).
7. **Índices aplicados**: matriz ano × mês por série usada (IPCA, IGP-M, INPC, taxa legal, salário mínimo), ponto nos meses não divulgados.
8. **Rodapé**: "Defensoria Pública de Mato Grosso do Sul · {órgão}" à esquerda; "Fonte dos índices: BCB/SGS · Gerado com Apura v{versão} em dd/mm/aaaa" à direita, discreto. O nome Apura não aparece em nenhum outro lugar do relatório.

Não há linha de "competências em aberto" nem qualquer referência à Súmula 309.

### 10.2 Identidade visual

- Cores do manual: verde #1D6B34, amarelo-ouro #D8BB73, preto #373636, cinza #868686, vermelho #ED1C24, branco; fundo claro #F3F4F1 e tema escuro como no exemplo de referência (`docs/referencia/relatorio-exemplo.html`).
- Tipografia: Ubuntu (títulos e números de destaque, como pede o manual para a marca) e Source Sans 3 (texto), ambas embutidas no app (woff2 em `public/fontes/`), sem carregar do Google. Whitney não tem licença livre.
- Logos de `docs/identidade-visual/logos/` convertidos para o app (horizontal branco na faixa; versões preta/colorida disponíveis). Proporções e áreas de respiro conforme o manual; nunca alterar cores ou tipografia da marca.

### 10.3 Tela e PDF

- O mesmo HTML serve à tela e à impressão. "Relatório / PDF" abre o relatório; "Imprimir / Salvar PDF" chama a impressão do navegador. Título do documento sugere o nome do arquivo ("Apura – <processo> – <data>").
- CSS de impressão: tema claro forçado, cores da faixa preservadas (`print-color-adjust: exact`), A4 com margens, linhas de tabela e blocos sem quebra interna, cabeçalho de tabela repetido por página, tamanhos de fonte reduzidos.
- Limitação aceita: PDFs gerados por impressão no Chrome não numeram páginas nem repetem rodapé; o rodapé aparece no fim. Geração no servidor fica para o futuro.

### 10.4 Bloco "Metodologia e fundamentos"

Gerado a partir do que foi aplicado, nunca de parâmetros do sistema: não cita nome ou versão de perfil, nem "personalização". Parágrafos:

- **Base.** Como o valor de cada prestação foi apurado (valor fixo e reajustes aplicados, com percentuais; ou percentual do salário mínimo; ou percentual dos rendimentos), e menção a valores editados à mão.
- **Termos.** "Encargos desde o vencimento de cada prestação (mora automática, art. 397 do CC). Correção pelo índice do mês do vencimento, proporcional aos dias restantes (pro rata), e pelos meses seguintes até {último mês divulgado}; juros até a data do cálculo." Lançamentos com termos iniciais ou finais próprios são descritos aqui, com suas datas.
- **Encargos.** Texto fixo aprovado: "Até 29/08/2024, IGP-M e juros de 1% ao mês, simples, pro rata die; desde 30/08/2024, IPCA (art. 389, parágrafo único, do CC) e juros pela taxa legal (art. 406, §1º, do CC; Lei 14.905/2024; Resolução CMN 5.171/2024), série 29543 do BCB, acumulada por juros simples e pro rata por dias corridos, sobre o valor corrigido." Adaptado automaticamente quando a metodologia for outra (INPC, IPCA, SELIC única).
- **Amortizações.** "Cada pagamento é atualizado pelos mesmos critérios, da data do pagamento até a data do cálculo, e abatido do total atualizado."
- **Multa e honorários.** Quando houver: percentuais, base e não cumulação.
- **Deflação.** Só quando o piso atuar: "índices negativos computados; o valor corrigido não fica inferior ao original".
- **Observações.** Texto livre do usuário.
- **Fontes e arredondamento.** "Índices consultados em dd/mm/aaaa no Sistema Gerenciador de Séries Temporais do Banco Central (séries …). Arredondamento comercial: fator e percentual de juros com 6 casas, valores com 2 casas por lançamento." Meses sem índice listados.

---

## 11. Testes e qualidade

- **TDD**: toda regra começa com um teste que falha e um exemplo numérico; o motor é testado sem interface e sem rede.
- **Casos de referência** em `src/motor/casos/*.json`: Cálculo de entrada, índices congelados (valores da época) e saída esperada linha a linha, com fonte. Primeiro caso: SAJ TJMS 25/05/2018 (Anexo A). Seguintes: regime novo conferido na Calculadora do Cidadão do BCB; transição em 30/08/2024; um por tipo de base; deflação com piso; encargos próprios; multa e honorários; gabaritos da contadoria quando chegarem.
- **Unitários**: datas (dias entre datas, dias do mês, rateio por mês-calendário), arredondamento comercial, fator de correção (pro rata geométrico, meses inteiros, mês final, meses faltantes, piso), juros por regime, taxa legal, SELIC única, metodologia com três ou mais períodos e taxas distintas, termos finais anteriores à data de elaboração, geração em lote (cumulativa, sem duplicar, dia 31), valor-base, multa e honorários, serialização.
- **Propriedades**: ordem dos lançamentos não altera totais; salvar e reabrir devolve o mesmo Resultado com os mesmos índices; refeita a conta com o fator e o percentual impressos, o valor difere do calculado em no máximo R$ 0,01 (§6.8).
- **Índices**: parser e cliente testados com respostas gravadas do BCB (ordem invertida, mês corrente parcial, HTML em vez de JSON, erros 400/404/406), sem rede.
- **Interface**: testes de componente (Testing Library) para lote cumulativo, edição e recálculo, recentes e preferências. Impressão: roteiro de conferência manual.
- **Integração contínua**: GitHub Actions roda lint, tipos e testes a cada envio; publicação só com testes verdes.

---

## 12. Convenções e repositório

### 12.1 Convenções

- TypeScript estrito. Termos do domínio em português no código, nos testes e nos dados (`prestacao`, `amortizacao`, `vencimento`, `fatorCorrecao`, `metodologia`); infraestrutura técnica com nomes usuais em inglês.
- Dinheiro, percentuais e índices sempre `Decimal`; nunca `number` para valores. Datas como texto ISO; utilitários próprios em `compartilhado/datas.ts`.
- Motor puro: sem `Date.now()`, sem `fetch`, sem DOM.
- Nenhum índice inventado: só BCB/SGS.
- Commits e documentação em português; mensagens no formato "módulo: o que muda" (ex.: "motor: juros por mês-calendário com as duas pontas").
- Documentos de design em `docs/superpowers/specs/`, planos em `docs/superpowers/plans/`.

### 12.2 Estrutura

```
apura/
  CLAUDE.md  README.md  package.json  vite.config.ts  tsconfig.json  .gitignore
  .github/workflows/        testes.yml · publicar.yml · atualizar-indices.yml
  dados/indices/            433.json · 188.json · 189.json · 1619.json · 29543.json · 4390.json
  docs/identidade-visual/   manual e logos
  docs/referencia/          relatório de exemplo (HTML e PDF), casos de referência transcritos
  docs/superpowers/specs/   este documento
  docs/superpowers/plans/   planos de implementação
  public/                   fontes (woff2), logos otimizados
  scripts/                  atualizar-indices.ts
  src/compartilhado/        decimal.ts · datas.ts · formatacao.ts · tipos.ts
  src/motor/                lote.ts · base.ts · correcao.ts · juros.ts · calcular.ts · casos/
  src/indices/              series.ts · cliente-bcb.ts · cache.ts · congelar.ts · calendario.ts
  src/metodologias/         tjms-saj.v1.json
  src/ui/                   App.tsx · secoes/ · tabelas/ · estado/ · recentes.ts · preferencias.ts
  src/relatorio/            Relatorio.tsx · metodologia.ts · matriz-indices.tsx · impressao.css
```

### 12.3 CLAUDE.md

Conteúdo: o que é o Apura e o estado do MVP; comandos (`npm install`, `npm run dev`, `npm test`, `npm run lint`, `npm run indices:atualizar`); mapa de pastas; regras obrigatórias (TDD, decimal, português no domínio, motor puro, nenhum índice inventado, relatório sem parâmetros de sistema); apontadores para este design, para os planos e para a lista de pontos de validação jurídica; como registrar um novo caso de referência.

---

## 13. Publicação e operação

- Repositório privado no GitHub (conta do responsável ou organização da Defensoria, a definir na criação). `.superpowers/` e `node_modules/` ignorados.
- Cloudflare Pages (ou Netlify) conectado ao repositório: a branch principal publica o endereço dos testadores; cada branch de trabalho ganha pré-visualização.
- Rotina mensal de índices (GitHub Actions): executa o script, abre commit com os JSON atualizados e dispara a publicação.
- Versão semântica a partir de 0.1.0, exibida no rodapé da tela e do relatório; `CHANGELOG.md`.
- Local: `npm install`, `npm run dev`, `npm test`.

---

## 14. LGPD e segurança

- Dados de partes e processo são pessoais: existem só na memória do navegador, no arquivo salvo pelo usuário e nos cinco recentes do navegador (desligáveis). Nunca são enviados a servidor algum; o app não tem telemetria.
- Preferências (defensor e órgão) são dados funcionais do próprio usuário.
- Única comunicação de rede: GET à API pública do BCB, sem dados do cálculo na requisição.
- Sem dependências de execução além das listadas; versões fixadas; auditoria de dependências na integração contínua.

---

## 15. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| API do BCB lenta, fora do ar ou bloqueada na rede institucional | cópia embutida atualizada mensalmente; cache no navegador; falha silenciosa |
| BCB mudar o formato ou o CORS da API | parser tolerante e validado por testes com respostas gravadas; cópia embutida garante operação; script de atualização isola a mudança |
| Convenções do SAJ no regime novo desconhecidas | seguir a metodologia oficial do BCB; obter relatório SAJ pós-2024 (gabarito) e ajustar a metodologia como dado, sem mudar código |
| Divergência jurídica sobre alguma convenção | pontos de validação (§7) explícitos; metodologia parametrizada e versionada; relatório descreve o que foi aplicado |
| Limitações do PDF por impressão (sem numeração de páginas) | aceita no MVP; geração no servidor prevista |
| Computador compartilhado expõe recentes | opção para desligar, "Esquecer", aviso na tela |

---

## 16. Fases de implementação (um plano por fase)

1. **Fundação e motor do regime antigo**: repositório, projeto Vite/React/TS, Vitest, ESLint/Prettier, CLAUDE.md, `.gitignore`; primitivas (`Decimal`, datas, arredondamento, rateio); transcrição do caso SAJ 2018; correção pro rata e juros por mês-calendário; cálculo de lançamentos e totais reproduzindo o caso centavo a centavo; cópia embutida do IGP-M e script de atualização.
2. **Regime novo e transição**: taxa legal, IPCA, transição em 30/08/2024, SELIC única, deflação com piso, encargos próprios, multa e honorários; casos conferidos na Calculadora do Cidadão.
3. **Bases e lotes**: valor fixo com reajuste, % do salário mínimo, % dos rendimentos; lotes cumulativos de prestações e amortizações; casos-limite.
4. **Índices ao vivo**: cliente BCB, cache, congelamento por cálculo, calendário, rotina mensal.
5. **Interface**: layout, seções, tabelas, personalização, recentes, preferências, salvar/abrir, temas.
6. **Relatório e PDF**: componente, metodologia gerada, matriz, marca, fontes, impressão.
7. **Publicação**: GitHub Actions, Cloudflare Pages, versão 0.1.0 para os testadores.

---

## Anexo A · Caso de referência: SAJ TJMS, cálculo de 25/05/2018

Fonte: "Relatório de Cálculo Processual – Sintético", TJMS/SAJ, emitido em 25/05/2018 (execução de alimentos; número do processo omitido por minimização de dados; o PDF original fica fora do repositório).

**Parâmetros declarados**: IGP-M (FGV), da data do lançamento até 30/04/2018 (pro rata); juro legal simples de 1,00% ao mês sobre o valor corrigido, da data do lançamento até 25/05/2018. Data do cálculo: 25/05/2018.

**IGP-M (série 189) utilizado**, variação % mensal: 2017: jan 0,64 · fev 0,08 · mar 0,01 · abr −1,10 · mai −0,93 · jun −0,67 · jul −0,72 · ago 0,10 · set 0,47 · out 0,20 · nov 0,52 · dez 0,89; 2018: jan 0,76 · fev 0,07 · mar 0,64 · abr 0,57 (maio/2018, 1,38, ainda não divulgado em 25/05/2018).

**Atualização monetária (prestações)** — data · valor original · corrigido · juros · total

| Data | Valor | Corrigido | Juros | Total |
|---|---|---|---|---|
| 10/01/2017 | 451,91 | 457,79 | 75,61 | 533,40 |
| 10/02/2017 | 451,91 | 455,69 | 70,56 | 526,25 |
| 10/03/2017 | 451,91 | 455,44 | 66,11 | 521,55 |
| 10/04/2017 | 451,91 | 457,09 | 61,74 | 518,83 |
| 10/05/2017 | 451,91 | 461,87 | 57,81 | 519,68 |
| 10/06/2017 | 451,91 | 465,84 | 53,60 | 519,44 |
| 10/07/2017 | 451,91 | 469,03 | 49,32 | 518,35 |
| 10/08/2017 | 451,91 | 471,17 | 44,84 | 516,01 |
| 10/09/2017 | 451,91 | 470,12 | 39,99 | 510,11 |
| 10/10/2017 | 451,91 | 468,35 | 35,20 | 503,55 |
| 10/11/2017 | 451,91 | 466,91 | 30,38 | 497,29 |
| 10/12/2017 | 451,91 | 463,97 | 25,59 | 489,56 |
| 10/01/2018 | 460,11 | 468,42 | 21,15 | 489,57 |
| 10/02/2018 | 460,11 | 465,90 | 16,24 | 482,14 |
| **Total** | **6.343,14** | **6.497,59** | **648,14** | **7.145,73** |

**Amortização (pagamentos parciais)** — valores negativos no SAJ

| Data | Valor | Corrigido | Juros | Total |
|---|---|---|---|---|
| 10/01/2017 | 440,00 | 445,73 | 73,62 | 519,35 |
| 10/02/2017 | 440,00 | 443,68 | 68,70 | 512,38 |
| 10/03/2017 | 440,00 | 443,44 | 64,37 | 507,81 |
| 10/04/2017 | 440,00 | 445,05 | 60,11 | 505,16 |
| 10/05/2017 | 440,00 | 449,69 | 56,28 | 505,97 |
| 10/06/2017 | 440,00 | 453,56 | 52,19 | 505,75 |
| 10/07/2017 | 440,00 | 456,66 | 48,02 | 504,68 |
| 10/08/2017 | 440,00 | 458,76 | 43,66 | 502,42 |
| 10/09/2017 | 440,00 | 457,73 | 38,94 | 496,67 |
| 10/10/2017 | 440,00 | 456,01 | 34,27 | 490,28 |
| 10/11/2017 | 440,00 | 454,60 | 29,58 | 484,18 |
| 10/12/2017 | 440,00 | 451,74 | 24,92 | 476,66 |
| 10/01/2018 | 448,00 | 456,09 | 20,60 | 476,69 |
| 10/02/2018 | 448,00 | 453,64 | 15,81 | 469,45 |
| **Total** | **6.176,00** | **6.326,38** | **631,07** | **6.957,45** |

**Totais**: atualização monetária 7.145,73 · amortização −6.957,45 · total geral **188,28**.

**Convenções que reproduzem as linhas verificadas** (10/01/2017, 10/02/2017, 10/04/2017 e 10/02/2018 das prestações; 10/01/2017 das amortizações):

- fator de correção = (1 + i_mês/100)^((diasDoMes − dia) ÷ diasDoMes) para o mês do lançamento × Π(1 + i/100) dos meses seguintes até abril/2018; ex.: 10/01/2017 → 1,013020 → 451,91 × 1,013020 = 457,79;
- juros = Σ por mês-calendário de 1% × dias ÷ diasDoMes, contando o dia do lançamento e o dia 25/05/2018; ex.: 10/01/2017 → 22/31 + 15 meses + 25/31 = 16,516129% → 457,79 × 16,516129% = 75,61;
- juros sobre o valor corrigido sem arredondar (§6.4; nas linhas verificadas as duas formas coincidem); corrigido e juros arredondados a 2 casas.

Base confirmada na fase 3 (11/10/2026): valor fixo de R$ 451,91 fixado em 10/01/2017 e reajustado pela proporção do salário mínimo (937,00 em 2017; 954,00 em 2018): 451,91 × 954 ÷ 937 = 460,109… = R$ 460,11, exatamente o valor de 2018. A hipótese de 48,23% do salário mínimo não confere (937 × 48,23% = 451,9151 → 451,92). O caso de referência original usa os valores nominais como informados; o caso `2018-05-25-saj-tjms-base-valor-fixo-reajuste-sm.json` recalcula as mesmas 28 linhas pela base.

## Anexo B · Glossário

- **Lançamento**: uma prestação (crédito) ou uma amortização (pagamento) com data e valor.
- **Prestação**: parcela mensal dos alimentos, identificada pela competência (mês/ano) e pelo vencimento.
- **Amortização**: pagamento feito pelo alimentante, atualizado pelos mesmos critérios e abatido do total.
- **Fator de correção**: número que multiplica o valor original para trazê-lo à data do cálculo (6 casas).
- **Pro rata**: aplicação proporcional aos dias quando o período não cobre o mês inteiro.
- **Taxa legal**: juros do art. 406 do CC desde 30/08/2024, calculados pelo BCB como SELIC menos IPCA, com piso zero (série 29543).
- **Metodologia**: conjunto de regras de correção e juros por período; na tela, pode ser escolhida e ajustada; no relatório, aparece só como texto de fundamentos.
- **Competência**: mês/ano a que a prestação se refere.
