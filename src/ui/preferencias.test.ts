import { describe, expect, it } from "vitest";
import { CHAVE_PREFERENCIAS, CHAVE_RECENTES } from "./armazenamento.ts";
import {
  esquecer,
  gravarPreferencias,
  lerPreferencias,
  PREFERENCIAS_PADRAO,
} from "./preferencias.ts";
import { armazenamentoEmMemoria, armazenamentoQueFalha } from "./testes/ambiente-de-teste.ts";

describe("preferências no navegador (§5.5)", () => {
  it("sem nada gravado, valem os padrões: lembrar e guardar recentes ligados, nomes vazios", () => {
    expect(lerPreferencias(armazenamentoEmMemoria())).toEqual(PREFERENCIAS_PADRAO);
    expect(lerPreferencias(null)).toEqual(PREFERENCIAS_PADRAO);
  });

  it("grava e lê de volta; com 'lembrar' desligado, grava os nomes vazios mas mantém as duas opções", () => {
    const armazenamento = armazenamentoEmMemoria();
    const p = {
      defensor: "Defensor(a) de teste",
      orgao: "Órgão de teste",
      lembrar: true,
      guardarRecentes: false,
    };
    expect(gravarPreferencias(armazenamento, p)).toBe(true);
    expect(lerPreferencias(armazenamento)).toEqual(p);
    expect(gravarPreferencias(armazenamento, { ...p, lembrar: false })).toBe(true);
    expect(JSON.parse(armazenamento.getItem(CHAVE_PREFERENCIAS) ?? "")).toEqual({
      defensor: "",
      orgao: "",
      lembrar: false,
      guardarRecentes: false,
    });
    expect(lerPreferencias(armazenamento)).toEqual({
      defensor: "",
      orgao: "",
      lembrar: false,
      guardarRecentes: false,
    });
  });

  it("conteúdo corrompido ou de outro formato volta aos padrões campo a campo", () => {
    expect(lerPreferencias(armazenamentoEmMemoria({ [CHAVE_PREFERENCIAS]: "{nada" }))).toEqual(
      PREFERENCIAS_PADRAO,
    );
    expect(lerPreferencias(armazenamentoEmMemoria({ [CHAVE_PREFERENCIAS]: "[1,2]" }))).toEqual(
      PREFERENCIAS_PADRAO,
    );
    const parcial = armazenamentoEmMemoria({
      [CHAVE_PREFERENCIAS]: JSON.stringify({ defensor: 7, orgao: "Órgão", guardarRecentes: "sim" }),
    });
    expect(lerPreferencias(parcial)).toEqual({
      defensor: "",
      orgao: "Órgão",
      lembrar: true,
      guardarRecentes: true,
    });
  });

  it("armazenamento bloqueado: ler devolve os padrões, gravar devolve false, esquecer não lança", () => {
    const bloqueado = armazenamentoQueFalha();
    expect(lerPreferencias(bloqueado)).toEqual(PREFERENCIAS_PADRAO);
    expect(gravarPreferencias(bloqueado, PREFERENCIAS_PADRAO)).toBe(false);
    expect(() => esquecer(bloqueado)).not.toThrow();
    expect(gravarPreferencias(null, PREFERENCIAS_PADRAO)).toBe(false);
  });

  it("esquecer apaga preferências e recentes e deixa o resto do armazenamento em paz", () => {
    const armazenamento = armazenamentoEmMemoria({
      [CHAVE_PREFERENCIAS]: "{}",
      [CHAVE_RECENTES]: "[]",
      "outra.chave": "fica",
    });
    esquecer(armazenamento);
    expect(armazenamento.getItem(CHAVE_PREFERENCIAS)).toBeNull();
    expect(armazenamento.getItem(CHAVE_RECENTES)).toBeNull();
    expect(armazenamento.getItem("outra.chave")).toBe("fica");
  });
});
