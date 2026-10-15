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
  {
    // Scripts servidos como estão, sem passar pelo Vite (public/): rodam no navegador.
    files: ["public/**/*.js"],
    languageOptions: { globals: globals.browser, sourceType: "script" },
  },
  {
    // O motor é puro (regra 4 do CLAUDE.md): sem relógio, sem rede, sem DOM, sem armazenamento.
    files: ["src/motor/**/*.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "Date", message: "O motor não usa relógio: datas chegam como texto ISO." },
        {
          name: "fetch",
          message: "O motor não acessa a rede: os índices chegam na TabelaIndices.",
        },
        { name: "document", message: "O motor não usa o DOM." },
        { name: "window", message: "O motor não usa o DOM." },
        { name: "localStorage", message: "O motor não usa armazenamento." },
        { name: "sessionStorage", message: "O motor não usa armazenamento." },
      ],
    },
  },
  prettier,
);
