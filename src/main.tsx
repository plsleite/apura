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
