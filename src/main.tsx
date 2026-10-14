// Fontes do manual de identidade da DPE-MS (§10.2), embutidas no site (sem carregar do Google):
// Ubuntu para títulos e números de destaque; Source Sans 3 para o texto, com o itálico e o negrito
// que o relatório usa (fase 6; sem eles o navegador inventa o itálico e troca o 700 pelo 600). Só o
// alfabeto latino.
import "@fontsource/source-sans-3/latin-400.css";
import "@fontsource/source-sans-3/latin-400-italic.css";
import "@fontsource/source-sans-3/latin-600.css";
import "@fontsource/source-sans-3/latin-700.css";
import "@fontsource/ubuntu/latin-500.css";
import "@fontsource/ubuntu/latin-700.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./ui/App.tsx";

const raiz = document.getElementById("raiz");
if (raiz) {
  createRoot(raiz).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
