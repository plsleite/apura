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
- Índices oficiais do BCB/SGS publicados com o site e atualizados por uma rotina central diária no repositório, com congelamento por cálculo.
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

Verificação feita em 10/10/2026: a API SGS do BCB responde a chamadas feitas pelo navegador (CORS liberado para GET simples, sem cabeçalhos personalizados), o que dispensa servidor intermediário para buscar índices. Desde a fase 4 (decisão de 12/10/2026), o app não chama o BCB: uma rotina central no repositório baixa os índices e o site é republicado.

### 4.2 Módulos (pastas de `src/`)

| Módulo | Responsabilidade | Depende de |
|---|---|---|
| `motor/` | Funções puras: gerar lançamentos em lote, apurar valor-base, atualizar cada lançamento, totais, avisos. Recebe Cálculo + tabela de índices, devolve Resultado. Sem rede, relógio ou tela. | `compartilhado/` |
| `indices/` | Cópia embutida das séries (publicada com o site), congelamento por cálculo e calendário de divulgação, que entregam uma tabela de índices ao motor; fora do app, a rotina central (cliente da API do BCB, script e workflow) e o relatório mensal da rotina. | `compartilhado/` |
| `metodologias/` | Metodologias de encargos em JSON versionado (padrão "Lei 14.905/2024", `lei-14905-2024.v1.json`; alternativa "IGP-M e juros de 1% ao mês", `igpm-juros-1.v1.json`; §17.3). | — |
| `ui/` | Tela única em duas colunas; edita o Cálculo; chama o motor a cada alteração; recentes e preferências. | `motor/`, `indices/`, `metodologias/`, `relatorio/` |
| `relatorio/` | Componente do relatório (tela e impressão), texto de metodologia gerado, matriz de índices, marca e CSS de impressão. | `motor/` (tipos) |
| `compartilhado/` | Tipos básicos, datas, decimal, formatação pt-BR. | — |

### 4.3 Fluxo de dados

1. Ao abrir o app ou iniciar um novo cálculo, `indices/` congela a tabela de índices da cópia publicada com o site (§8), sem nenhuma consulta externa.
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
- O arquivo salvo contém `calculo` (entradas) e `resultado` (derivado, para auditoria). Ao reabrir, o Apura recalcula com os índices atuais e avisa, por série e mês, qual índice usado mudou, qual passou a entrar e qual deixou de constar, comparando `resultado.indicesUsados` do arquivo com o do recálculo (decisão de 11/10/2026, fase 4); o arquivo não guarda a tabela inteira.
- Todo arquivo traz `formato: "apura/calculo@1"` para permitir migrações futuras.

### 5.2 Cálculo (entradas)

```ts
Calculo {
  formato: "apura/calculo@1"
  tipo: "alimentos"                       // outros tipos no futuro
  id: string; criadoEm: string; atualizadoEm: string
  dataElaboracao: "AAAA-MM-DD"            // padrão: hoje; editável
  cabecalho: { defensor; orgao; processo; exequente; executado }   // texto livre
  base:                                   // desde a fase 5b: { periodos: PeriodoDaBase[] } (§17.2)
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
  id: "lei-14905-2024"; versao: 1; nome: "Lei 14.905/2024"; ajustada: boolean   // ids e nomes desde a fase 5b (§17.3)
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

Metodologia padrão "Lei 14.905/2024" (até a fase 5, "TJMS/SAJ v1"; renomeada na fase 5b, §17.3): período até 29/08/2024 com IGP-M e 1% ao mês; período desde 30/08/2024 com IPCA e taxa legal. Desde a fase 5b, a pessoa escolhe entre ela e "IGP-M e juros de 1% ao mês" em todo o período, e a escolha fica nas preferências do navegador (§17.3). O nome e a versão ficam só no arquivo; a tela mostra as regras e o relatório descreve apenas o que foi aplicado (§10.4).

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

Desde a fase 4, `consultaIndices.em` é a data de obtenção mais recente entre os arquivos da cópia
publicada, comparada pelo instante (no horário de Brasília nas gravações da rotina; os arquivos
anteriores à fase 4 trazem UTC), e o `fonte` de cada item de `indicesUsados` é sempre `"embutida"`
(o valor `"aoVivo"` fica reservado no tipo).

### 5.5 Armazenamento no navegador

- **Preferências**: defensor e órgão, com "Lembrar neste navegador" (ligado por padrão) e "Esquecer".
- **Cálculos recentes**: os cinco últimos, salvos a cada alteração, listados em "Abrir…" por data, processo e partes; "Remover" por item e "Limpar recentes"; opção "Guardar cálculos recentes neste navegador" em "1 · Processo", ligada por padrão, para desligar em computador compartilhado; "Esquecer" apaga preferências e recentes.
- Nada mais é gravado; nada é transmitido.

**Decisões registradas em 12/10/2026 (fase 5).** Os recentes guardam só o necessário para reabrir (decisão de 13/10/2026): o cálculo e, do resultado, só os índices usados e a data da consulta (o que a abertura usa para avisar dos índices que mudaram), em JSON compacto, sem a memória do cálculo (o arquivo salvo continua completo; recentes antigos, com o envelope inteiro, continuam abrindo); se a gravação falhar (armazenamento cheio ou bloqueado), o painel "Abrir" avisa que o cálculo atual não pôde ser guardado nos recentes e que convém salvar o arquivo. Os recentes entram a partir da primeira edição (o cálculo em branco não); desligar "Guardar cálculos recentes" apaga os já guardados; "Esquecer" apaga nomes e recentes e desliga "Lembrar neste navegador"; as duas opções continuam gravadas mesmo desligadas; toda leitura e gravação é protegida (armazenamento ausente, bloqueado ou cheio não quebra a tela); as preferências incluem o tema da tela (do sistema, claro ou escuro), que "Esquecer" não apaga. "Novo cálculo" não pede confirmação: com os recentes ligados, o cálculo anterior fica em "Abrir"; com eles desligados, a ajuda da seção 1 avisa que convém salvar antes.

---

## 6. Motor de cálculo

Todas as regras abaixo nascem com teste e exemplo numérico (§11). O motor nunca lança erro por dado do usuário: devolve avisos.

### 6.1 Geração em lote de prestações

- Entrada: dia do vencimento (1–31) e, ou "N meses em atraso", ou intervalo de competências (de/até, inclusive).
- "N meses em atraso": a última prestação é a do vencimento mais recente que não ultrapassa a data de elaboração; as demais vêm para trás, mês a mês. Exemplo de referência: dia 5, 3 meses, elaboração em 10/10/2026 → 05/08, 05/09 e 05/10/2026. Elaboração em 03/10/2026 → 05/07, 05/08 e 05/09/2026.
- Dia 31 (ou 29/30) em mês mais curto → último dia do mês.
- Lotes são cumulativos: cada "Lançar em lote" acrescenta à lista. Competência já existente não é duplicada; o aviso diz quais foram puladas. Ocupam a competência as prestações de lote (mesmo que ganhem descrição depois) e as avulsas sem descrição: um 13º ou férias avulsos, com descrição, não impedem o lote de lançar a prestação do mês (decisão de 12/10/2026, fase 5). Na tela, a competência não aparece: o vencimento é a referência de cada linha, e os avisos do lote falam em mês de vencimento (decisão de 13/10/2026).
- A competência de cada prestação é o mês do vencimento, e a base (§6.3) usa sempre o mês da data do vencimento (decisão de 11/10/2026). As prestações do lote nascem sem valor informado (o motor as apura pela base), com origem "lote" e id `p-AAAA-MM` (`p-AAAA-MM-2`, `-3`… se o id já existir).
- Vencimento em fim de semana ou feriado: mantido como está (mora automática, art. 397 do CC); o usuário pode editar datas individualmente.

### 6.2 Geração em lote de amortizações

- Entrada: valor por mês, dia do pagamento (a tela o preenche com o dia do vencimento; o motor recebe sempre o dia) e intervalo de meses. Gera um lançamento `amortizacao` por mês, descrição "Pagamento parcial", editável, com id `a-AAAA-MM`. Meses que já têm pagamento lançado são pulados, com aviso (decisão de 11/10/2026); um segundo pagamento no mesmo mês entra como pagamento avulso. Amortizações avulsas são lançadas na tabela de resultado.

### 6.3 Valor-base de cada prestação

- Desde a fase 5b, a base é uma lista de períodos, e cada prestação usa a forma do período em que cai o vencimento (§17.2); as regras abaixo valem dentro de cada período.
- A base usa sempre o mês da data do vencimento da prestação (a competência é o rótulo da linha e, no lote, é igual ao mês do vencimento). Toda prestação sem valor informado, de lote ou avulsa, é apurada pela base (decisões de 11/10/2026, fase 3).
- Valor fixo com reajuste por índice (IGP-M, INPC ou IPCA): no mês do reajuste (padrão: mês da fixação; editável), o valor vigente é multiplicado pelo índice acumulado dos 12 meses anteriores ao mês do reajuste; a partir daí, a cada 12 meses. O primeiro reajuste cai 12 meses após a fixação quando o mês do reajuste é o próprio mês da fixação (fixado em 15/03/2024, reajuste em março: mar/2025, com o acumulado de mar/2024 a fev/2025); com outro mês escolhido, cai na primeira ocorrência dele depois do mês da fixação, com o acumulado desde o mês da fixação até o mês anterior ao reajuste (pode ter menos de 12 meses). O acumulado (produto dos fatores mensais) multiplica com precisão integral e aparece na memória com 4 casas; o valor reajustado é arredondado a 2 casas a cada reajuste, e o seguinte parte dele. Acumulado negativo ou zero não reduz o valor: o valor vigente é mantido e a memória registra. Se faltar na tabela algum mês do acumulado, o reajuste não é aplicado, o valor vigente anterior é mantido e o aviso diz até que mês o índice está disponível. Com o calendário na tabela (fase 4), quando todos os meses que faltam ainda não saíram, o aviso diz que estão "ainda sem divulgação na data da consulta", com a previsão ("previsão: …" quando falta um mês; "previsão para <último mês>: …" quando falta mais de um), e não o último mês disponível.
- Reajuste "pelo salário mínimo": valor × (salário mínimo do mês do vencimento ÷ salário mínimo do mês da fixação), sem usar o mês de reajuste (o valor acompanha o salário mínimo no mês em que ele muda). "Nenhum": valor constante.
- Prestação anterior ao mês da fixação: entra com o valor fixado, sem reajuste, com aviso.
- Percentual do salário mínimo: percentual × salário mínimo do mês do vencimento (série 1619). Mês ainda sem salário mínimo publicado: usa-se o último publicado, que vigora até o novo decreto, com aviso; a proveniência registra o mês realmente usado. Com o calendário na tabela (fase 4), o mês posterior ao esperado sai como "ainda não publicado na data da consulta", com a previsão, e o mês já esperado que falta (buraco de dados) sai como "não consta na tabela de índices", com o último anterior disponível.
- Percentual dos rendimentos: percentual × rendimento do mês (o do lançamento, se informado; senão o padrão). Não há reajuste automático: quando o rendimento muda, o usuário informa o novo rendimento nos meses afetados ou altera o padrão (desde a fase 5b, "Aplicar este rendimento daqui em diante" divide a base, §17.2).
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

- Regime antigo (`percentualMensal`, 1% ao mês por padrão): rateio por mês-calendário, `taxa × dias ÷ diasDoMes` em cada mês tocado, contando o dia do termo inicial e o dia final (ambas as pontas), como o SAJ. Período: do termo inicial dos juros (padrão: data do lançamento) até o termo final dos juros (padrão: data de elaboração); dentro dele, cada período da metodologia aplica a própria taxa aos dias que lhe cabem (ex.: 1% ao mês de 2020 a 2022 e 2% ao mês de 2023 em diante), e os percentuais se somam. Taxa mensal com texto inválido deixa o trecho sem juros, com aviso (fase 5).
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
- Percentual de multa ou de honorários com texto inválido ou negativo vale zero, com aviso (fase 5); a tela não deixa o inválido chegar ao motor.

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

Fatos verificados em 10/10/2026: resposta JSON `[{"data":"dd/mm/aaaa","valor":"0.82"}]` com valor em texto e ponto decimal; séries mensais datadas no dia 01; a 4390 vem em ordem decrescente no endpoint `ultimos/N` (sempre ordenar por data); séries mensais aceitam o histórico completo numa chamada; erros 400/404/406 em JSON; série inexistente devolve HTML com status 200 (decidir pelo corpo da resposta, não pelo tipo de conteúdo); cache do BCB de 15 minutos; sem limite de taxa observado; lentidão ocasional (na rotina: 30 s, até três tentativas, 2 s de espera). Reverificados em 11 e 12/10/2026: intervalo sem dados devolve `{"erro":{"statusCode":404,"detail":"…Value(s) not found"}}` (não lista vazia), às vezes com status 200; data inválida devolve 400 em JSON; o 406 não se reproduziu e é tratado como qualquer objeto de erro do SGS; série inexistente e bloqueio devolvem HTML com status 200; houve um 502 em HTML e uma resposta de 9,8 s; a API não informa quando carregou cada valor. O cliente decide pelo corpo da resposta, nunca pelo cabeçalho `content-type` nem só pelo status.

### 8.2 Rotina central, sem botão para o usuário e sem inserção manual

1. **Cópia publicada com o site**: um arquivo JSON por série em `dados/indices/`, com `obtidoEm` (horário de Brasília) e endereço de origem, gravado pela rotina central: o workflow `atualizar-indices.yml` roda de segunda a sexta às 10h47, 14h17 e 22h47 de Brasília (e pelo botão "Run workflow"), baixa o histórico de cada série pelo script `scripts/atualizar-indices.ts`, confere, grava só as séries que mudaram (uma série com problema não trava as outras), roda as conferências automáticas, faz commit descritivo na `main`, e o site é republicado. O próprio repositório é o registro histórico das atualizações.
2. **O app não consulta o BCB**: lê só a cópia publicada, sem rede e sem armazenamento no navegador (decisão de 12/10/2026, que substituiu a busca ao vivo e o cache no navegador previstos antes).
3. **Congelamento por cálculo**: a tabela de índices usada por um cálculo é fixada quando ele começa: é a cópia publicada lida nesse momento, com o calendário do dia. Os números não mudam enquanto o usuário digita, e a data-hora impressa no relatório é a da obtenção dos índices, no horário de Brasília. Cálculo novo pega a cópia mais recente; cálculo reaberto é recalculado com os índices atuais, com aviso se algum mudou.

Não há inserção manual de índices no MVP (§3.2).

### 8.3 Proveniência e sinalização

- Cada valor carrega série, competência, valor, fonte (cópia publicada) e data de obtenção; o Resultado lista os efetivamente usados.
- Único sinal na tela, no rodapé, sem botão: "Índices oficiais BCB/SGS · IPCA até set/2026 · atualizados em 09/10/2026 14:17 (horário de Brasília)", com a data da obtenção mais recente da cópia publicada. A caixa de avisos recebe os avisos do calendário, por exemplo em 16/11/2026, com a cópia ainda de 09/10/2026: "IPCA de out/2026, divulgado por volta de 10/11/2026, ainda não chegou ao Apura: o cálculo usa os índices disponíveis em 09/10/2026."
- Calendário de divulgação conhecido pelo app, para avisos em português claro e só para avisos: IPCA e INPC esperados a partir do dia 15 do mês seguinte (divulgação por volta do dia 10); IGP-M a partir do dia 5 do mês seguinte (divulgação no fim do próprio mês); taxa legal e SELIC parcial a partir do dia 5 do próprio mês; salário mínimo do ano inteiro a partir de fevereiro. A tabela congelada leva ao motor o último mês esperado de cada série (`esperadoAte`), e os avisos distinguem o mês posterior ao esperado, "ainda sem divulgação na data da consulta", com a previsão (no salário mínimo, "ainda não publicado na data da consulta"), do mês já esperado que falta, "não disponível na tabela de índices" (no salário mínimo, "não consta na tabela de índices"), que indica buraco de dados ou cópia desatualizada.

**Decisões registradas em 11 e 12/10/2026 (fase 4).** Rotina central no lugar da busca no navegador (12/10/2026), seguindo a prática dos tribunais e da Justiça do Trabalho e Federal, que mantêm os índices de forma central: o app só lê a cópia publicada; a rotina roda de segunda a sexta às 10h47, 14h17 e 22h47 de Brasília (minutos "quebrados", porque o início de cada hora é o pico em que o GitHub atrasa ou descarta execuções), alinhada à publicação do IGP-M (8h), do IPCA e INPC (9h), da taxa legal (entre 8h30 e o início da tarde do 1º dia útil) e da SELIC (até 19h). Gravação série por série, conferências automáticas antes de gravar, commit descritivo como registro histórico, série sem mudança não regravada. Na SELIC, a mudança do mês corrente ou do seu fechamento é informativa; só a mudança de mês fechado é revisão ("Atenção"). Monitoramento gratuito: resumo de cada execução, alarme de silêncio no Healthchecks.io (e-mail se um dia útil passar sem rodada bem-sucedida), relatório mensal em `docs/monitoramento/`; ajustes de horário ou de agendador só com o responsável, após revisão com os relatórios. Revogadas: o cache no navegador e a busca ao vivo (D1, D2 e D8 de 11/10/2026, na tabela de decisões do plano da fase 4). Mantidas: horário de Brasília para datas de obtenção e consulta (texto com "-03:00", exibido como "(horário de Brasília)"); tabela congelada na memória e arquivo guardando o `Resultado`; aviso de índice mudado por série e mês, com o salário mínimo nomeado; calendário com dia aproximado, só para avisos. Mudanças no motor: o mês parcial da SELIC é o mês de `obtidoEm` do próprio valor, e os avisos dizem "ainda sem divulgação na data da consulta (previsão: …)" quando a tabela traz `esperadoAte`. Limites aceitos: a SELIC parcial continua entrando inteira (ou rateada, se o lançamento começou no mesmo mês) quando um termo final próprio cai antes do dia da consulta no mesmo mês; o mês corrente da SELIC é tratado como parcial até a primeira atualização gravada no mês seguinte (os dois só alcançam metodologias personalizadas com SELIC única até o mês corrente); os dias do calendário são aproximados; o agendador do GitHub pode atrasar horas, e por isso é medido.

---

## 9. Interface

### 9.1 Layout

Página única em duas colunas (em telas estreitas, as colunas empilham com o resumo no topo). **Esquerda: dados do caso e lançamentos em lote. Direita: resultado e lançamentos individuais.** Recálculo a cada alteração, sem botão "Calcular".

Barra superior: nome do sistema ("Apura · Sistema de Cálculos Judiciais · DPE-MS"), "Novo cálculo", "Abrir…" (recentes e arquivo), "Salvar" (arquivo `apura-<processo>-<data>.json`), "Relatório / PDF".

### 9.2 Seções da esquerda

1. **Processo**: defensor(a) e órgão (lembrados no navegador, com "Lembrar neste navegador" e "Esquecer"), nº do processo, exequente (alimentando), executado (alimentante); opção "Guardar cálculos recentes neste navegador". Ajuda: partes e processo não são gravados em servidor algum.
2. **Base dos alimentos**: três opções; só os campos da opção escolhida aparecem; ajuda sobre reajuste e salário mínimo. Desde a fase 5b, "Dividir em" cria períodos com formas diferentes (§17.2).
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

**Decisões registradas em 12 e 13/10/2026 (fase 5).** Ajuda: em vez de textos sempre visíveis, balões ⓘ ao lado dos títulos e dos campos, abertos sob demanda (clique, toque, Enter ou Espaço; Esc, novo clique ou clique fora fecham; no celular, uma faixa no pé da tela); sempre visíveis ficam só os erros, os avisos e os exemplos dentro dos campos (decisão de 13/10/2026). A tela não menciona outros sistemas (a metodologia padrão aparece como "padrão"). Nº do processo no padrão do CNJ, com máscara e conferência dos dígitos verificadores (vazio é aceito); com prestação lançada e o campo da base que a alimenta em branco, a caixa de avisos diz o que falta e onde, e o campo fica em vermelho; os exemplos dentro dos campos começam por "ex.:"; na seção 1, os campos ficam lado a lado, em duas colunas. Entrada de números: vírgula nos centavos, ponto só como separador de milhar, "1.5" recusado com a frase de ajuda; cada tecla válida recalcula e o inválido fica no campo, com o estado guardando o último valor válido; o erro de formato (campo em vermelho e a frase embaixo) aparece só quando a pessoa sai do campo com texto inválido, nunca enquanto digita, e some assim que o texto volta a ser válido (decisão de 13/10/2026; os avisos do que falta na base continuam imediatos); datas pelo campo de data do navegador, inclusive nos intervalos dos lotes, de 1900 a 2199 (na tela e no arquivo aberto; data posterior a 31/12/2199 é recusada). Painéis (editor de períodos, "Personalizar", "Abrir") são um componente próprio com papel `dialog` (o `<dialog>` nativo não existe no jsdom dos testes). O cálculo novo nasce em valor fixo, sem reajuste, fixado hoje, com o valor em branco e multa e honorários de 10% cada (decisão de 13/10/2026). Lotes de até 600 meses; o lote de prestações pede, por padrão, o primeiro e o último vencimento (datas), e o dia do vencimento só em "meses em atraso"; o lote de pagamentos pede o primeiro e o último pagamento (datas); os avisos do lote saem embaixo do formulário que o lançou. Linhas das tabelas com o vencimento como referência (a competência não aparece; por dentro, é o mês do vencimento), etiquetas "vincenda", "não computada", "valor informado" e "ajustada" (desde a fase 5b, uma só na linha, com "+N" e balão, §17.4), e vencimento e valor editáveis na própria célula (Enter grava, Esc desiste; valor digitado vira "valor informado", apagado volta à base); o ✕ exclui em dois cliques, sem janela pop-up: no primeiro, ele fica vermelho, sem mexer na linha (decisão de 13/10/2026); editar na célula não muda a tabela (o campo tem o tamanho do texto, e a data é digitada como dd/mm/aaaa); dívida negativa sai como R$ 0,00 nos indicadores, cujos valores nunca quebram entre "R$" e o número, com os cartões em 5, 3 + 2, 2 + 2 + 1 ou um por linha. "+ Prestação" e "+ Pagamento" acrescentam uma linha nova no fim da tabela, já sugerida (prestação: vencimento no mês seguinte ao da última e o valor informado da última ou o da base; pagamento: data de hoje e o valor do anterior; desde a fase 5b, o mês seguinte ao do último pagamento, §17.1), que herda as regras próprias de correção e juros da última, mas não os termos; o lápis ("Personalizar") fica para os ajustes finos; em "% dos rendimentos" o painel traz o rendimento do mês e "Aplicar este rendimento daqui em diante". Termo final posterior à data de elaboração e termo inicial posterior ao final são recusados no painel. "SELIC única" é uma escolha só no editor (juros `selicUnica` e correção "nenhum"). Tema: em vez de só "conforme o sistema", um botão na barra que alterna "do sistema", "claro" e "escuro" a cada clique (padrão "do sistema"), guardado nas preferências; "claro" e "escuro" marcam `data-theme` na raiz, e a impressão continua sempre clara (fase 6). "Relatório / PDF" fica na barra, desligado, até a fase 6. Identidade visual na tela já nesta fase (decisão de 13/10/2026): logo horizontal branco da DPE-MS na barra (`public/logos/dpems-horizontal-branca.png`, gerado do PNG do manual), faixa verde com linha dourada e fontes Ubuntu e Source Sans 3 embutidas pelos pacotes `@fontsource` (no lugar de `.woff2` copiados para `public/fontes/`), sem carregar do Google. Na tela, o texto discreto usa o cinza `#6E716C` e o vermelho `#C8101A`, por contraste (o cinza e o vermelho do manual ficam para elementos não textuais); os campos de data mostram o formato do idioma do navegador. Arquivo salvo: `{ formato, calculo, resultado }`, nome `apura-<processo>-<data de elaboração>.json`, validado campo a campo ao abrir; o `resultado` é opcional (sem ele, abre com aviso e sem a comparação de índices).

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

- **Base.** Como o valor de cada prestação foi apurado (valor fixo e reajustes aplicados, com percentuais; ou percentual do salário mínimo; ou percentual dos rendimentos), e menção a valores editados à mão. Com a base dividida em períodos (fase 5b), um trecho por período (§17.2).
- **Termos.** "Encargos desde o vencimento de cada prestação (mora automática, art. 397 do CC). Correção pelo índice do mês do vencimento, proporcional aos dias restantes (pro rata), e pelos meses seguintes até {último mês divulgado}; juros até a data do cálculo." Lançamentos com termos iniciais ou finais próprios são descritos aqui, com suas datas.
- **Encargos.** Texto fixo aprovado: "Até 29/08/2024, IGP-M e juros de 1% ao mês, simples, pro rata die; desde 30/08/2024, IPCA (art. 389, parágrafo único, do CC) e juros pela taxa legal (art. 406, §1º, do CC; Lei 14.905/2024; Resolução CMN 5.171/2024), série 29543 do BCB, acumulada por juros simples e pro rata por dias corridos, sobre o valor corrigido." Adaptado automaticamente quando a metodologia for outra (INPC, IPCA, SELIC única).
- **Amortizações.** "Cada pagamento é atualizado pelos mesmos critérios, da data do pagamento até a data do cálculo, e abatido do total atualizado."
- **Multa e honorários.** Quando houver: percentuais, base e não cumulação.
- **Deflação.** Só quando o piso atuar: "índices negativos computados; o valor corrigido não fica inferior ao original".
- **Observações.** Texto livre do usuário.
- **Fontes e arredondamento.** "Índices do Sistema Gerenciador de Séries Temporais do Banco Central (séries …), atualizados em dd/mm/aaaa hh:mm (horário de Brasília). Arredondamento comercial: fator e percentual de juros com 6 casas, valores com 2 casas por lançamento." Meses sem índice listados.

---

## 11. Testes e qualidade

- **TDD**: toda regra começa com um teste que falha e um exemplo numérico; o motor é testado sem interface e sem rede.
- **Casos de referência** em `src/motor/casos/*.json`: Cálculo de entrada, índices congelados (valores da época) e saída esperada linha a linha, com fonte. Primeiro caso: SAJ TJMS 25/05/2018 (Anexo A). Seguintes: regime novo conferido na Calculadora do Cidadão do BCB; transição em 30/08/2024; um por tipo de base; deflação com piso; encargos próprios; multa e honorários; gabaritos da contadoria quando chegarem.
- **Unitários**: datas (dias entre datas, dias do mês, rateio por mês-calendário), arredondamento comercial, fator de correção (pro rata geométrico, meses inteiros, mês final, meses faltantes, piso), juros por regime, taxa legal, SELIC única, metodologia com três ou mais períodos e taxas distintas, termos finais anteriores à data de elaboração, geração em lote (cumulativa, sem duplicar, dia 31), valor-base, multa e honorários, serialização.
- **Propriedades**: ordem dos lançamentos não altera totais; salvar e reabrir devolve o mesmo Resultado com os mesmos índices; refeita a conta com o fator e o percentual impressos, o valor difere do calculado em no máximo R$ 0,01 (§6.8).
- **Índices**: cliente, rotina central e relatório mensal testados sem rede, com respostas gravadas do BCB (ordem invertida, mês corrente parcial, HTML em vez de JSON, página 502, erros 400 e 404 em JSON; o 406, que não se reproduziu em 2026, com corpo sintético) e uma lista sintética de execuções no formato da API do GitHub; propriedade: a mesma tabela não gera aviso de índice mudado.
- **Interface**: testes de componente (Testing Library + jsdom, só nos arquivos marcados `// @vitest-environment jsdom`) para a fundação, processo e preferências, base, encargos e editor de períodos, lotes, tabelas e memória, personalizar, salvar e abrir; testes puros do redutor, da leitura de entrada, da edição da metodologia, do arquivo e dos recentes; todos sem rede, sem relógio real e sem a cópia publicada dos índices (ambiente de teste com a tabela fixa de 2024–2026). Layout, cores, rolagem e foco: conferência manual no navegador. Impressão: roteiro de conferência manual (fase 6).
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
  .github/workflows/        testes.yml · publicar.yml · atualizar-indices.yml · relatorio-indices.yml
  dados/indices/            433.json · 188.json · 189.json · 1619.json · 29543.json · 4390.json
  docs/identidade-visual/   manual e logos
  docs/referencia/          relatório de exemplo (HTML e PDF), casos de referência transcritos
  docs/superpowers/specs/   este documento
  docs/superpowers/plans/   planos de implementação
  docs/monitoramento/       relatórios mensais da rotina de índices
  public/                   fontes (woff2), logos otimizados
  scripts/                  atualizar-indices.ts · relatorio-indices.ts
  src/compartilhado/        decimal.ts · datas.ts · formatacao.ts · tipos.ts · divulgacao.ts
  src/motor/                lote.ts · base.ts · correcao.ts · juros.ts · calcular.ts · casos/
  src/indices/              series.ts · cliente-bcb.ts · arquivo-serie.ts · embutidos.ts · calendario.ts · relogio.ts · congelar.ts · atualizacao.ts · relatorio.ts
  src/metodologias/         lei-14905-2024.v1.json · igpm-juros-1.v1.json · padrao.ts
  src/ui/                   App.tsx · BarraSuperior.tsx · Rodape.tsx · Abrir.tsx · ambiente.ts · entrada.ts · arquivo.ts · recentes.ts · preferencias.ts · armazenamento.ts · versao.ts · estilos.css · estado/ · secoes/ · tabelas/ · componentes/ · testes/
  src/relatorio/            Relatorio.tsx · metodologia.ts · matriz-indices.tsx · impressao.css
```

### 12.3 CLAUDE.md

Conteúdo: o que é o Apura e o estado do MVP; comandos (`npm install`, `npm run dev`, `npm test`, `npm run lint`, `npm run indices:atualizar`, `npm run indices:relatorio`); mapa de pastas; regras obrigatórias (TDD, decimal, português no domínio, motor puro, nenhum índice inventado, relatório sem parâmetros de sistema); apontadores para este design, para os planos e para a lista de pontos de validação jurídica; como registrar um novo caso de referência.

---

## 13. Publicação e operação

- Repositório privado no GitHub (conta do responsável ou organização da Defensoria, a definir na criação). `.superpowers/` e `node_modules/` ignorados.
- Cloudflare Pages (ou Netlify) conectado ao repositório: a branch principal publica o endereço dos testadores; cada branch de trabalho ganha pré-visualização.
- Rotina central de índices (GitHub Actions), de segunda a sexta às 10h47, 14h17 e 22h47 de Brasília: executa o script, grava na `main` as séries que mudaram (depois das conferências automáticas), e o site é republicado. Monitoramento gratuito: resumo de cada execução; alarme de silêncio no Healthchecks.io (e-mail se um dia útil passar sem rodada bem-sucedida); relatório mensal em `docs/monitoramento/` (workflow `relatorio-indices.yml`, dia 2); ajustes de horário ou de agendador só com o responsável.
- Versão semântica a partir de 0.1.0, exibida no rodapé da tela e do relatório; `CHANGELOG.md`.
- Local: `npm install`, `npm run dev`, `npm test`.

---

## 14. LGPD e segurança

- Dados de partes e processo são pessoais: existem só na memória do navegador, no arquivo salvo pelo usuário e nos cinco recentes do navegador (desligáveis). Nunca são enviados a servidor algum; o app não tem telemetria.
- Preferências (defensor e órgão) são dados funcionais do próprio usuário.
- O app não faz nenhuma comunicação de rede além de carregar o próprio site; quem consulta a API pública do BCB é a rotina central no repositório (decisão de 12/10/2026). A rotina também envia um sinal sem conteúdo ao Healthchecks.io e, se configurado, aciona o deploy hook do Cloudflare; os endereços ficam em segredos do repositório e só entram nos passos que os usam.
- Sem dependências de execução além das listadas; versões fixadas; auditoria de dependências na integração contínua.

---

## 15. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| API do BCB lenta, fora do ar ou inacessível para o GitHub | três rodadas por dia útil; gravação série por série; o app segue com a cópia publicada; alarme de silêncio; script executável à mão |
| BCB mudar o formato da API | decisão pelo corpo da resposta, validada por testes com respostas gravadas; a cópia publicada garante a operação; o script isola a mudança |
| Agendador do GitHub atrasado ou que descarta execuções | minutos "quebrados", três rodadas, alarme de silêncio e relatório mensal; se preciso, disparo por outro agendador (decisão com o responsável) |
| Convenções do SAJ no regime novo desconhecidas | seguir a metodologia oficial do BCB; obter relatório SAJ pós-2024 (gabarito) e ajustar a metodologia como dado, sem mudar código |
| Divergência jurídica sobre alguma convenção | pontos de validação (§7) explícitos; metodologia parametrizada e versionada; relatório descreve o que foi aplicado |
| Limitações do PDF por impressão (sem numeração de páginas) | aceita no MVP; geração no servidor prevista |
| Computador compartilhado expõe recentes | opção para desligar, "Esquecer", aviso na tela |

---

## 16. Fases de implementação (um plano por fase)

1. **Fundação e motor do regime antigo**: repositório, projeto Vite/React/TS, Vitest, ESLint/Prettier, CLAUDE.md, `.gitignore`; primitivas (`Decimal`, datas, arredondamento, rateio); transcrição do caso SAJ 2018; correção pro rata e juros por mês-calendário; cálculo de lançamentos e totais reproduzindo o caso centavo a centavo; cópia embutida do IGP-M e script de atualização.
2. **Regime novo e transição**: taxa legal, IPCA, transição em 30/08/2024, SELIC única, deflação com piso, encargos próprios, multa e honorários; casos conferidos na Calculadora do Cidadão.
3. **Bases e lotes**: valor fixo com reajuste, % do salário mínimo, % dos rendimentos; lotes cumulativos de prestações e amortizações; casos-limite.
4. **Índices: rotina central e monitoramento**: rotina central diária no repositório, congelamento por cálculo, calendário de divulgação, monitoramento.
5. **Interface**: layout, seções, tabelas, personalização, recentes, preferências, salvar/abrir, temas.
   5b. **Ajustes da interface depois do uso** (§17): pagamento sugerido, base por períodos, escolha da metodologia padrão, etiquetas numa linha.
6. **Relatório e PDF**: componente, metodologia gerada, matriz, marca, fontes, impressão.
7. **Publicação**: GitHub Actions, Cloudflare Pages, versão 0.1.0 para os testadores.

---

## 17. Ajustes depois do uso da fase 5 (fase 5b)

Decididos pelo responsável em 13/10/2026, depois de usar a interface da fase 5. Quatro ajustes; os itens 17.1 e o princípio de 17.2 vieram decididos, o restante foi fechado no brainstorming da fase 5b. Onde esta seção e as anteriores divergirem, vale esta.

### 17.1 Pagamento sugerido em "+ Pagamento"

A linha nova de "+ Pagamento" (D20 da fase 5) sugere a data no **mês seguinte ao do último pagamento** (o mais recente pela data), no mesmo dia (último dia do mês quando ele for mais curto, como na prestação), e o valor do último pagamento; sem pagamento anterior, a data de elaboração e o valor em branco, como antes. Continua herdando as regras próprias de correção e juros do último pagamento, sem os termos. "+ Prestação" não muda (mês seguinte ao da última prestação comum): a tabela é ordenada por data, a linha nova fica embaixo, e o uso principal é acrescentar as prestações vencidas no curso do processo; o histórico longo se lança pelo lote.

Exemplos: último pagamento em 10/09/2026 → sugere 10/10/2026; em 31/01/2026 → 28/02/2026. A data sugerida pode cair depois da data do cálculo (último pagamento em 05/10/2026, cálculo em 13/10/2026 → 05/11/2026, que sairia "não computado"); a pessoa corrige a data na linha antes de incluí-la, como já ocorre com a prestação vincenda.

### 17.2 Base dos alimentos por períodos

**Problema.** Até a fase 5, o cálculo tinha uma única base, e mudar a base recalculava todas as prestações; não dava para fazer, por exemplo, 2024 em valor fixo e 2025 em % do salário mínimo. **Decisão:** a base vira uma lista de períodos seguidos, cada um com a sua forma e os seus campos; a coluna da esquerda continua sendo a regra e a tabela, o resultado.

**Modelo.**

```ts
Calculo.base: { periodos: PeriodoDaBase[] }
PeriodoDaBase { de: "AAAA-MM-DD" | null; ate: "AAAA-MM-DD" | null; forma: FormaDaBase }
FormaDaBase =                                  // as três formas de §5.2, com os mesmos campos
  | { tipo: "valorFixo"; valor; dataFixacao; indiceReajuste; mesReajuste }
  | { tipo: "percentualSalarioMinimo"; percentual }
  | { tipo: "percentualRendimentos"; percentual; rendimentoPadrao }
```

- Os períodos são seguidos, sem buraco nem sobreposição: cada um começa no dia seguinte ao fim do anterior. O primeiro não tem começo (`de: null`) e vale para qualquer vencimento anterior à primeira divisão; o último não tem fim (`ate: null`) e vale para qualquer vencimento posterior à última, inclusive vincendas. A pessoa não digita "de" e "até": informa só a data em que a base muda ("Dividir em"), e o Apura fecha o período anterior na véspera.
- O cálculo novo nasce com um período só, de `null` a `null`, com a base de antes (valor fixo, sem reajuste, fixado hoje, valor em branco; D7 da fase 5). Quem nunca divide não vê diferença.
- **Sem retrocompatibilidade** (decisão do responsável: o Apura ainda não foi publicado e só ele o usou): o formato continua `apura/calculo@1`, já com a base por períodos; arquivo ou recente com a base antiga é recusado na abertura com a frase de campo inválido (os recentes dos testes do responsável saem por "Limpar recentes"). Os doze casos de referência têm só o campo `calculo.base` reescrito como um período de `null` a `null` com a mesma forma (e o id e o nome da metodologia, §17.3), por script; o `esperado` de cada um fica intocado, e os resultados continuam idênticos.

**Regra do motor.** A prestação sem valor informado usa o período em que cai o **vencimento** (`de ≤ vencimento ≤ ate`). Dentro do período, a conta é a de §6.3, sem mudança: o reajuste do valor fixo conta da data de fixação do próprio período (que pode ser anterior ao início do período), e a prestação anterior à fixação entra pelo valor fixado, com o aviso de sempre. O valor informado à mão (célula ou lápis) prevalece e nunca é tocado pela base. O motor nunca lança erro: um vencimento que nenhum período cobre (só possível com dado fora do padrão) fica `ignorado`, com o aviso "Nenhum período da base cobre o vencimento de dd/mm/aaaa: a prestação ficou sem valor; informe o valor à mão."; base sem períodos, o mesmo aviso em cada prestação; períodos sobrepostos, vale o primeiro, em ordem cronológica, que contém o vencimento. A abertura de arquivo recusa base sem períodos, com buraco, com sobreposição, com o primeiro `de` ou o último `ate` preenchidos, ou fora de ordem.

**Memória da linha.** Com um período só, a frase de §6.3, sem mudança. Com dois ou mais, ela começa dizendo qual período valeu: "Base até 31/12/2024: …", "Base de 01/01/2025 a 30/06/2025: …", "Base desde 01/07/2025: …".

**Exemplo numérico** (salário mínimo de R$ 1.412,00 em 2024 e R$ 1.518,00 em 2025). Base "até 31/12/2024: R$ 500,00 fixados em 10/03/2024, sem reajuste" e "desde 01/01/2025: 30% do salário mínimo":

| Vencimento | Período | Valor-base | Memória |
|---|---|---|---|
| 05/02/2024 | 1º | R$ 500,00 | "Base até 31/12/2024: Valor fixado em 10/03/2024: R$ 500,00 (prestação anterior à fixação, sem reajuste)", com o aviso de prestação anterior à fixação |
| 05/12/2024 | 1º | R$ 500,00 | "Base até 31/12/2024: Valor fixado em 10/03/2024: R$ 500,00 (sem reajuste)" |
| 31/12/2024 | 1º | R$ 500,00 | último dia do 1º período |
| 01/01/2025 | 2º | R$ 455,40 | "Base desde 01/01/2025: 30% do salário mínimo de jan/2025 (R$ 1.518,00) = R$ 455,40" |
| 05/01/2025, com R$ 600,00 digitado | — | R$ 600,00 | "Valor informado: R$ 600,00" (a base não o toca) |

Corrigido o percentual do 2º período para 35%, só as prestações de 2025 em diante mudam: 35% × 1.518,00 = R$ 531,30; as de 2024 continuam em R$ 500,00.

**Seção 2 na tela.**

- Com um período, igual à da fase 5, mais uma linha no pé: "A base mudou ao longo do tempo?", o campo de data "Dividir em" e o botão "Dividir", com o balão ⓘ: "A data informada passa a iniciar um período novo da base, com as mesmas regras do anterior; depois ajuste a forma e os valores de cada um. Ex.: valor fixo até 2024 e % do salário mínimo desde 2025."
- Com dois ou mais, um bloco por período, na própria seção (não num painel), com o título "Até 31/12/2024", "De 01/01/2025 a 30/06/2025" ou "Desde 01/07/2025", a escolha da forma e os campos dela; todos, menos o primeiro, com "Remover divisão". O padrão é o do editor de períodos dos encargos, para a pessoa o reconhecer.
- Dividir: o período novo nasce como cópia do dividido. Data que já é início de período não divide ("Já existe uma divisão em 01/01/2025.", embaixo do campo); data inválida mostra o erro de data de sempre. Trocar a forma de um período e voltar recupera o que foi digitado naquele período. Ao passar para "valor fixo" um período que não é o primeiro, "Fixado em" vem com a data de início do período.
- Remover divisão: o período some, e o anterior se estende até o fim dele, com as regras do anterior; não há "desfazer" (como no editor dos encargos).

**Base incompleta (D29), por período.** Com um período, o texto da fase 5. Com dois ou mais, o aviso diz qual: "Falta o percentual do salário mínimo no período desde 01/01/2025 (seção 2 · Base dos alimentos): as prestações desse período ficam sem valor até ele ser informado." Só avisa o período em que vence alguma prestação pela base; o campo fica em vermelho no bloco daquele período. No rendimento padrão, como antes, só conta a prestação do período sem rendimento próprio ("as prestações desse período sem rendimento próprio").

**Lápis e linha nova.**

- "Rendimento deste mês" aparece no lápis quando o período da prestação é "% dos rendimentos".
- "Aplicar este rendimento daqui em diante" passa a **dividir a base** no vencimento da linha: o período novo copia o período da linha, com o rendimento informado como rendimento padrão; se o vencimento já é início de período, só o rendimento padrão dele muda. O efeito vai até o fim daquele período (uma divisão posterior fica com a regra dela). A linha de onde se aplicou perde o rendimento próprio e passa a seguir a regra; as demais linhas com rendimento próprio (13º, férias, um mês específico) ficam como estão; nenhuma linha ganha a marca "ajustada" por isso. Exemplo: 30% dos rendimentos, padrão R$ 2.000,00; no lápis da prestação de 05/03/2025, R$ 2.500,00 e "Aplicar este rendimento daqui em diante" → seção 2 com "Até 04/03/2025: 30% dos rendimentos, padrão R$ 2.000,00" e "Desde 05/03/2025: 30% dos rendimentos, padrão R$ 2.500,00"; as prestações de março/2025 em diante dão 30% × 2.500,00 = R$ 750,00.
- "+ Prestação" sugere o valor da base pelo período do vencimento sugerido.

**Relatório (fase 6).** O parágrafo "Base" (§10.4) descreve cada período, sem nomes de sistema (regra 7 do CLAUDE.md): "Até 31/12/2024, valor fixo de R$ 500,00, fixado em 10/03/2024, sem reajuste; desde 01/01/2025, 30% do salário mínimo vigente no mês de cada vencimento." Com um período só, a frase não leva "até/desde".

### 17.3 Escolha da metodologia padrão de encargos

**Duas metodologias.** `src/metodologias/tjms-saj.v1.json` passa a `lei-14905-2024.v1.json` (id `lei-14905-2024`, nome "Lei 14.905/2024"): o nome diz de onde vem a regra (a lei que deu ao art. 406 do CC a sistemática atual), e não de que sistema ela foi copiada. Conteúdo sem mudança: até 29/08/2024, IGP-M e juros de 1% ao mês; desde 30/08/2024, IPCA e taxa legal. Entra `igpm-juros-1.v1.json` (id `igpm-juros-1`, nome "IGP-M e juros de 1% ao mês"): um período só, de `null` a `null`, IGP-M e juros de 1% ao mês, pro rata no mês inicial, deflação com piso e as mesmas casas de arredondamento. Os nomes ficam só no arquivo (a tela não menciona outros sistemas, D22).

**Seção 5.**

```
Metodologia de encargos ⓘ
 (•) Até 29/08/2024: IGP-M e juros de 1% ao mês. Desde 30/08/2024: IPCA e taxa legal.
 ( ) IGP-M e juros de 1% ao mês em todo o período. ⓘ
 [Ajustar]
```

- Clicar numa opção aplica-a ao cálculo atual e a grava como a opção padrão nas preferências do navegador (`apura.preferencias`); "Novo cálculo" nasce com ela. Abrir um arquivo com a outra opção a mostra marcada, sem mudar a preferência.
- Balão ⓘ da segunda opção, **sem aviso** na caixa nem no motor (decisão do responsável: escolha deliberada; um aviso em todo cálculo vira ruído, e o relatório descreve só o que foi aplicado): "IGP-M e juros de 1% ao mês do vencimento até a data do cálculo, sem a mudança de 30/08/2024. Use quando a decisão ou o acordo fixou esses critérios, ou quando o juízo mantém o critério anterior à Lei 14.905/2024. Sem isso, a regra legal desde 30/08/2024 é IPCA e taxa legal (arts. 389 e 406 do CC)."
- Metodologia igual a nenhuma das duas (depois de "Ajustar"): nenhuma opção marcada, o título "Metodologia de encargos (ajustada)" e, embaixo, "Ajustada:" com o resumo em uma frase. Clicar numa opção troca os ajustes por ela.
- O reconhecimento é **pelo conteúdo** (períodos, índices, taxas comparadas como número, mês inicial, deflação, arredondamento), não pelo id nem pelo nome: "1.0" vale "1", e uma metodologia ajustada até ficar igual à segunda opção a acende. `ehPadrao` dá lugar a uma função que diz qual opção a metodologia é (ou nenhuma); `normalizar` grava o id e o nome da opção reconhecida e recalcula `ajustada`; a abertura de arquivo normaliza a metodologia global e as próprias em vez de confiar no `ajustada` gravado (duas pendências da fase 5 resolvidas).

**Preferências.** Um campo novo guarda a opção (padrão de fábrica: Lei 14.905/2024). Sobrevive a "Esquecer" e a desligar "Lembrar neste navegador", como o tema (não é dado pessoal); valor estranho no armazenamento vale o padrão de fábrica.

**"Restaurar a metodologia padrão"** (editor de períodos, no "Ajustar" e nas regras próprias do lápis) volta à opção guardada nas preferências; continua aparecendo só quando a metodologia está ajustada.

**Motor e relatório.** O motor não muda. A fase 6 descreve o que foi aplicado; na segunda opção, sem a frase da transição: "IGP-M e juros de 1% ao mês, simples, pro rata die, do vencimento até a data do cálculo".

**Exemplo numérico.** Prestação de R$ 1.000,00 vencida em 10/01/2025, cálculo em 10/10/2026, pela segunda opção: correção pelo IGP-M (pro rata de jan/2025 e meses seguintes até o último divulgado) e juros de 1% ao mês rateados por mês-calendário contando as duas pontas: 22/31 + 20 meses inteiros (fev/2025 a set/2026) + 10/31 = 21,032258%. Pela primeira opção, a mesma prestação recebe IPCA e taxa legal (vencimento posterior a 30/08/2024). Os valores exatos ficam nos testes, com a tabela fixa de 2024–2026.

### 17.4 Etiquetas das linhas numa linha só

A linha das tabelas nunca quebra. A célula do vencimento mostra a data, a descrição (13º, férias) e **uma etiqueta só**, a mais importante, na ordem "não computada"/"não computado" → "vincenda" → "valor informado" → "ajustada"/"ajustado", seguida de "+N" quando houver mais (ex.: "vincenda +2").

- **A descrição encolhe até caber** (decisão de 13/10/2026, tomada depois da conferência no navegador): a coluna da direita tem cerca de 730 px numa tela de 1366 px, e as colunas de números ocupam quase tudo; com a descrição em largura fixa, a tabela passava 49 px da coluna e o lápis e o ✕ saíam da vista. A descrição fica com o espaço que sobra (de 1,5 a 9 letras de largura; com uma descrição na tabela, a primeira coluna prefere 18em, o que dá cerca de "13º salári…" em 1366 px), cortada com reticências e inteira no `title`; com as colunas empilhadas (abaixo de 1024 px), mostra o tamanho cheio, porque a tabela já rola sozinha no celular. O lápis e o ✕ nunca saem da vista por causa dela.
- **A descrição e a etiqueta formam um botão só**, que abre o balão de `componentes/Ajuda.tsx` (clique, toque, Enter ou Espaço; Esc, clique fora ou rolar a página fecham; no celular, faixa no pé da tela), com a descrição inteira e todas as etiquetas, cada uma com a sua explicação (os textos das explicações da fase 5). O balão flutua em posição fixa junto do botão, para não ficar preso na rolagem da tabela. O componente ganha a opção de outro conteúdo e outro nome no botão e o modo flutuante.
- Nome acessível do botão: "Situação da prestação de 05/09/2026: vincenda, valor informado, ajustada" ("Situação do pagamento de …" nos pagamentos); numa linha só com descrição, sem etiqueta, o botão é a própria descrição: "Descrição da prestação de 20/07/2026: Férias de 2026, conforme o acordo homologado". Linha sem descrição e sem etiqueta: sem botão.
- Sem rolagem dentro da célula, sem dependência nova e sem `popover` ou `<dialog>` nativos (o jsdom não os implementa).
- Na memória da linha, quando a frase do motor já começa por "Base até/desde …" (base por períodos), a tela não repete o rótulo "Base:".
- Testes: os que procuravam as etiquetas pelo texto passam a procurar o botão pelo nome; testes novos para a ordem, o "+N", o balão com tudo, o `title` da descrição e a linha só com descrição. "Uma linha só" e a largura da tabela são conferidas no navegador (o jsdom não mede).

### 17.5 Registro

Fase "5b · Ajustes da interface depois do uso" na tabela do roteiro, entre a 5 e a 6, com plano próprio em `docs/superpowers/plans/2026-10-13-fase-5b-ajustes-da-interface.md`. A fase 5 continua concluída; a 6 continua com plano a escrever.

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
