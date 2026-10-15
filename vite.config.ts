import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import pacote from "./package.json" with { type: "json" };
import { seriesEmbutidas } from "./src/indices/embutidos.ts";
import { montarVersaoDoSite } from "./src/indices/publicacao.ts";

/**
 * Grava `versao.json` no site montado (§19.2): a versão do Apura e a data dos índices da cópia
 * publicada, que a rotina de índices lê para conferir a publicação.
 */
function versaoDoSite(): Plugin {
  return {
    name: "apura:versao-do-site",
    apply: "build",
    generateBundle() {
      const versao = montarVersaoDoSite(pacote.version, Object.values(seriesEmbutidas()));
      this.emitFile({
        type: "asset",
        fileName: "versao.json",
        source: `${JSON.stringify(versao, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), versaoDoSite()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.ts"],
  },
});
