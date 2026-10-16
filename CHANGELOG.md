# Registro de mudanças

O que muda no Apura para quem o usa, versão por versão, da mais nova para a mais antiga. A
numeração segue o versionamento semântico (0.1.0, 0.1.1, 0.2.0…): o último número sobe nas
correções, e o do meio, nas novidades.

## [0.1.1] · 2026-10-15

Ajustes da tela depois do uso pelos testadores (§20 do design). Os números não mudam.

- A barra do topo fica presa ao rolar a página, um pouco mais baixa que antes; o campo que
  recebe o foco pelo teclado nunca fica escondido sob ela.
- As seções da esquerda mudam de ordem: processo, base dos alimentos, encargos e data do cálculo,
  prestações em atraso e pagamentos (os parâmetros vêm antes dos lançamentos).
- Tabela sempre à vista: em telas a partir de 1024 px de largura e 600 px de altura, a coluna da
  direita fica presa abaixo da barra, com rolagem própria; os cinco indicadores, o título de cada
  tabela e a linha de títulos das colunas ficam à vista enquanto as linhas rolam, e, depois de
  "Lançar em lote", a coluna rola até as linhas recém-lançadas. Em telas menores, tudo como antes.

## [0.1.0] · 2026-10-15

Primeira versão para os testadores: o cálculo da execução de alimentos (demonstrativo
discriminado e atualizado do crédito, art. 524 do CPC), que roda inteiro no navegador.

- Base dos alimentos em valor fixo (sem reajuste, reajustado por índice ou pelo salário mínimo),
  em percentual do salário mínimo ou em percentual dos rendimentos, dividida em períodos quando
  a base muda.
- Prestações e pagamentos em lote ou um a um, com 13º, férias e valores informados à mão;
  vencimento e valor editáveis na própria linha, e os ajustes finos pelo lápis.
- Encargos pela Lei 14.905/2024 (até 29/08/2024, IGP-M e juros de 1% ao mês; desde 30/08/2024,
  IPCA e taxa legal) ou por IGP-M e juros de 1% ao mês, com metodologia por períodos e encargos
  próprios por lançamento; multa e honorários do art. 523, §1º, do CPC.
- Índices oficiais do Banco Central (SGS), atualizados nos dias úteis por uma rotina central;
  avisos quando um índice ainda não foi divulgado ou não chegou ao Apura.
- Relatório na identidade visual da DPE-MS, na tela e em PDF pela impressão do navegador, com
  "Metodologia e fundamentos" escrito a partir do que foi aplicado e a matriz dos índices usados.
- Salvar e abrir o cálculo em arquivo; cinco cálculos recentes e as preferências guardados só no
  navegador, com "Esquecer"; tema claro ou escuro.
