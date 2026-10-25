# Registro de mudanças

O que muda no Apura para quem o usa, versão por versão, da mais nova para a mais antiga. A
numeração segue o versionamento semântico (0.1.0, 0.1.1, 0.2.0…): o último número sobe nas
correções, e o do meio, nas novidades.

## [0.1.3] · 2026-10-25

Limpeza da tela (§21 do design). Os números não mudam.

- Os campos vêm vazios, sem exemplos dentro (como "ex.: 1.000,00"); ficam só os textos que dizem
  o que acontece com o campo em branco, como "pela base". A data em branco aparece mais clara, em
  itálico.
- As tabelas vazias mostram só o título, o ⓘ e o botão ("+ Prestação", "+ Pagamento"), sem frase
  e sem a linha de títulos das colunas. O cálculo em branco não traz mais o aviso "Nenhum
  lançamento.", e a caixa de avisos só aparece quando há o que avisar (por exemplo, um índice que
  ainda não chegou ao Apura).
- Letras maiores e sem maiúsculas miúdas: rótulos, cabeçalhos das tabelas e nomes dos indicadores
  em letras maiores e em caixa normal, com menos tamanhos diferentes na tela. Os títulos das seções
  e das tabelas ficam em maiúsculas espaçadas, como a marca da Defensoria. O relatório e a
  impressão não mudam.
- Defensor(a), órgão e os cinco últimos cálculos ficam sempre guardados neste navegador: saem
  "Lembrar neste navegador", "Esquecer" e "Guardar cálculos recentes neste navegador". O "Abrir"
  lembra que, em computador compartilhado, convém limpar os recentes ao terminar ("Remover" e
  "Limpar recentes" continuam lá).
- A divisão da base em períodos e as observações para o relatório ficam atrás de um botão
  discreto ("Dividir a base em períodos" e "+ Observações para o relatório"), que abre o campo já
  com o cursor nele; o cálculo que já tem observações mostra a caixa aberta.
- O botão de tema vira um ícone: ☀ (claro), ☾ (escuro) e ◐ (igual ao computador, o antigo "do
  sistema"); o nome e a dica dizem o tema de agora e o próximo.
- Os pagamentos lançados em lote não levam mais a descrição "Pagamento parcial"; arquivos e
  recentes já guardados ficam com a que têm.
- Menos balões ⓘ, e mais curtos: na tela principal, de 16 para 8.

## [0.1.2] · 2026-10-15

Ajuste da tela (§20.5 do design). Os números não mudam.

- Depois de "Lançar em lote", as linhas recém-lançadas ganham um fundo verde-claro (no tema
  escuro, um verde escuro discreto), que fica parado meio segundo e se apaga em um e meio. Quem
  pediu ao sistema menos movimento vê o verde cheio pelos mesmos dois segundos, sem esmaecer.
  Um lote que não acrescenta linha nenhuma não destaca nada.

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
