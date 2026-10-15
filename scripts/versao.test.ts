// A versão do Apura (§19.6): a do package.json, que o rodapé da tela e o do relatório mostram, tem
// de ter a sua seção no CHANGELOG.md e ser a mesma no package-lock.json. Fica em scripts/ porque
// lê arquivos do repositório com o Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), "utf8");
const pacote = JSON.parse(ler("package.json")) as { version: string };
const trava = JSON.parse(ler("package-lock.json")) as {
  version: string;
  packages: Record<string, { version?: string }>;
};

describe("versão do Apura (§19.6)", () => {
  it("é uma versão semântica (0.1.0, 1.2.3)", () => {
    expect(pacote.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("o package-lock.json diz a mesma versão", () => {
    expect(trava.version).toBe(pacote.version);
    expect(trava.packages[""]?.version).toBe(pacote.version);
  });

  it("o CHANGELOG.md tem a seção da versão, com a data (## [0.1.0] · AAAA-MM-DD)", () => {
    const changelog = ler("CHANGELOG.md");
    const titulo = new RegExp(
      `^## \\[${pacote.version.replaceAll(".", "\\.")}\\] · \\d{4}-\\d{2}-\\d{2}$`,
      "m",
    );
    expect(changelog).toMatch(titulo);
  });
});
