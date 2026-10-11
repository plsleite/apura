# Apura · Visão do produto (além do MVP)

**Produto:** Apura — Sistema de Cálculos Judiciais da Defensoria Pública de Mato Grosso do Sul
**Documento:** visão do produto e evoluções previstas, registradas em 10/10/2026 a partir do briefing inicial (`docs/referencia/briefing-inicial.md`) e do brainstorming do MVP
**Relação com o design do MVP:** o design de `2026-10-10-apura-mvp-alimentos-design.md` implementa a primeira fatia desta visão e foi construído para deixar o caminho aberto ao restante. Este documento não é um compromisso de prazo: é o mapa do que vem depois, para que as decisões do MVP não o inviabilizem.

---

## 1. Propósito

Plataforma web institucional em que as regras de cálculo judicial ficam parametrizadas, para que um usuário sem conhecimento jurídico aprofundado produza cálculos corretos e auditáveis em poucos passos. O usuário escolhe o tipo de cálculo, o sistema carrega os parâmetros adequados (termos iniciais e finais, índices de correção, juros de mora, juros remuneratórios), sempre alteráveis, e em qualquer tipo o usuário pode incluir lançamentos livremente, com data, termos e índices próprios.

Motivação: o SAJ Defensorias e o Solar não calculam; a calculadora do SAJ Tribunais não está disponível à Defensoria; o Dr. Calc exige conhecimento prévio, tem terminologia obscura, não lança em lote e não produz saída institucional. Em todos eles, um erro obriga a refazer o cálculo inteiro. A edição fácil de um cálculo já feito é objetivo central do Apura.

## 2. Princípios permanentes

- Automatizar ao máximo e deixar o usuário apenas ajustar o necessário; padrões sensatos pré-carregados.
- Rótulos em linguagem simples, com explicação curta ao lado de cada parâmetro; nenhum termo técnico sem explicação.
- Recálculo instantâneo; memória de cálculo visível e auditável (fator por lançamento, índices mês a mês, dias de juros).
- Relatório com identidade visual institucional, que descreve metodologia e fundamentos jurídicos, nunca parâmetros do sistema.
- Nenhum índice inventado: só fontes oficiais; proveniência registrada.
- Dados pessoais minimizados; o que não precisa ser guardado não é guardado.
- Motor de cálculo puro, testado por casos de referência validados contra a calculadora do SAJ Tribunais e cálculos manuais; toda regra nasce com teste e exemplo numérico.

## 3. Tipos de cálculo previstos

| Tipo | Situação | Particularidades |
|---|---|---|
| Execução de alimentos | MVP | Base em valor fixo com reajuste, % do salário mínimo ou % dos rendimentos; prestações e amortizações em lote; método do SAJ/TJMS. |
| Honorários devidos à Defensoria | futuro | Termos iniciais e índices variam com a natureza da condenação: valor fixo; percentual sobre o valor da causa; percentual sobre a condenação; sucumbência recursal. Cada natureza será uma metodologia pré-carregada (termos de correção e juros, índices), e o gerador de lançamentos partirá da sentença ou acórdão. |
| Indenização por danos morais | futuro | Correção desde o arbitramento (Súmula 362 do STJ) e juros desde o evento danoso na responsabilidade extracontratual (Súmula 54 do STJ) ou desde a citação na contratual; o modelo de termos iniciais separados para correção e juros, já presente no MVP, é a base. |
| Cálculo livre | futuro | Lançamentos positivos e negativos informados livremente, cada um com data, termos e metodologia próprios; é o motor do MVP sem o gerador de prestações de alimentos. |
| Outros | futuro | A acrescentar conforme a demanda dos órgãos de atuação. |

Em qualquer tipo, o usuário pode incluir lançamentos avulsos com data, termos iniciais e finais e índices próprios.

## 4. Evoluções de produto

### 4.1 Cálculos guardados por equipe
O defensor revisa e corrige o cálculo feito pelo assessor sem refazê-lo. Exige um servidor que guarde o objeto Cálculo (já serializável no MVP) com histórico de versões, autoria e situação (rascunho, revisado, juntado). No MVP, o mesmo fluxo existe de forma rudimentar pelo arquivo de cálculo e pelos cálculos recentes do navegador.

### 4.2 Usuários com cadastro e autenticação institucional
Cadastro de usuários com nome, cargo e órgão de atuação, preenchidos automaticamente no relatório (hoje lembrados no navegador). Autenticação com Microsoft 365 / Entra ID da instituição. Perfis: usuário comum e administrador de parâmetros.

### 4.3 Administração de parâmetros
Edição das metodologias de encargos (períodos, índices, taxas, incidência, deflação) com versionamento e vigência, sem alteração de código; inserção excepcional de índices com registro de autoria e motivo (fora do MVP por decisão de produto: o usuário comum nunca insere índice). Cada cálculo guarda a cópia da metodologia aplicada, por isso versões novas não alteram cálculos antigos.

### 4.4 Integrações
Importar número do processo, partes ou assistido do SAJ Defensorias, do Solar ou via MNI, preenchendo o bloco `cabecalho` do Cálculo. O bloco já é separado do restante do modelo para isso.

### 4.5 Relatório
- Aderência expressa ao art. 524 do CPC: parágrafos espelhando os incisos II a VI (índice de correção; juros e taxas; termos inicial e final de juros e correção, com datas expressas por lançamento quando houver termos próprios; capitalização: juros simples, sem capitalização; descontos obrigatórios: "nenhum" ou os informados), colunas "Correção até" e "Juros até" quando houver termos próprios, e campos opcionais de CPF/CNPJ das partes para o inciso I. Avaliado em 10/10/2026 e deixado para depois do MVP.
- Geração de PDF no servidor, com numeração de páginas e rodapé repetido.
- Modelos de relatório por tipo de cálculo.

### 4.6 Outros
- Tabela de índices recentes na tela inicial (acumulados no ano e em 3, 6 e 12 meses), como no Dr. Calc.
- Exportação para Excel não está prevista; o relatório em PDF e o arquivo de cálculo são as saídas.

## 5. Como o MVP deixa o caminho aberto

- O estado completo de um cálculo é um único objeto serializável (`Calculo` + `Resultado`), com versão de formato; guardar, reabrir e compartilhar é só armazenamento.
- O motor recebe a metodologia como dado: novos tipos de cálculo são novas metodologias e novos geradores de lançamentos; o motor de atualização não muda.
- Termos iniciais e finais separados para correção e juros, e metodologia por períodos, já existem por lançamento.
- O cabeçalho é um bloco isolado; integrações o preenchem.
- O relatório lê apenas Cálculo e Resultado; o texto de metodologia é gerado do que foi aplicado.
- Tudo em TypeScript: um servidor futuro reutiliza o motor e os tipos.

## 6. Ordem provável depois do MVP

1. Aderência expressa ao art. 524 no relatório.
2. Servidor com guarda de cálculos, usuários e Entra ID (fase que também traz o administrador de parâmetros).
3. Cálculo livre (reaproveita o motor com gerador mínimo).
4. Honorários devidos à Defensoria.
5. Danos morais.
6. Integrações SAJ Defensorias / Solar / MNI.

Esta ordem é uma hipótese para orientar decisões técnicas e será revista com os usuários.
