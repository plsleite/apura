// Tema fixado pelo usuário (preferência "tema" em apura.preferencias): marcado na raiz antes do
// CSS e do app, para a página não piscar no tema do sistema. O App mantém em dia. Fica num arquivo
// próprio, e não dentro do index.html, porque a política de conteúdo do site (public/_headers)
// só aceita scripts do próprio endereço. A função roda na hora e não deixa variáveis globais.
(function () {
  try {
    var preferencias = JSON.parse(localStorage.getItem("apura.preferencias") || "{}");
    if (preferencias.tema === "claro" || preferencias.tema === "escuro") {
      document.documentElement.setAttribute(
        "data-theme",
        preferencias.tema === "claro" ? "light" : "dark",
      );
    }
  } catch {
    // sem armazenamento (bloqueado ou ausente): vale o tema do sistema
  }
})();
