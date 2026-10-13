import pacote from "../../package.json" with { type: "json" };

/** Versão do Apura, a do `package.json` (0.1.0 a partir da fase 7), para o rodapé da tela. */
export const VERSAO: string = pacote.version;
