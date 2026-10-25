import { describe, expect, it } from "vitest";
import { CHAVE_PREFERENCIAS } from "./armazenamento.ts";
import {
  gravarPreferencias,
  lerPreferencias,
  PREFERENCIAS_PADRAO,
  type Preferencias,
} from "./preferencias.ts";
import { armazenamentoEmMemoria, armazenamentoQueFalha } from "./testes/ambiente-de-teste.ts";

describe("preferências no navegador (§5.5, §21.4)", () => {
  it("sem nada gravado, valem os padrões: nomes vazios, tema igual ao computador, metodologia da Lei 14.905/2024", () => {
    expect(lerPreferencias(armazenamentoEmMemoria())).toEqual({
      defensor: "",
      orgao: "",
      tema: "sistema",
      metodologia: "lei14905",
    });
    expect(lerPreferencias(null)).toEqual(PREFERENCIAS_PADRAO);
  });

  it("grava e lê de volta os quatro campos", () => {
    const armazenamento = armazenamentoEmMemoria();
    const p: Preferencias = {
      defensor: "Defensor(a) de teste",
      orgao: "Órgão de teste",
      tema: "escuro",
      metodologia: "igpmJuros1",
    };
    expect(gravarPreferencias(armazenamento, p)).toBe(true);
    expect(lerPreferencias(armazenamento)).toEqual(p);
  });

  it("as opções antigas ('Lembrar', 'Guardar recentes') são ignoradas, e a gravação seguinte as apaga (§21.4)", () => {
    const armazenamento = armazenamentoEmMemoria({
      [CHAVE_PREFERENCIAS]: JSON.stringify({
        defensor: "Nome antigo",
        orgao: "Órgão antigo",
        lembrar: false,
        guardarRecentes: false,
        tema: "claro",
      }),
    });
    const lidas = lerPreferencias(armazenamento);
    expect(lidas).toEqual({
      defensor: "Nome antigo",
      orgao: "Órgão antigo",
      tema: "claro",
      metodologia: "lei14905",
    });
    gravarPreferencias(armazenamento, lidas);
    expect(
      Object.keys(JSON.parse(armazenamento.getItem(CHAVE_PREFERENCIAS) ?? "{}")).sort(),
    ).toEqual(["defensor", "metodologia", "orgao", "tema"]);
  });

  it("conteúdo corrompido ou de outro formato volta aos padrões campo a campo (tema desconhecido vira 'sistema'; metodologia desconhecida, a da Lei 14.905/2024)", () => {
    expect(lerPreferencias(armazenamentoEmMemoria({ [CHAVE_PREFERENCIAS]: "{nada" }))).toEqual(
      PREFERENCIAS_PADRAO,
    );
    expect(lerPreferencias(armazenamentoEmMemoria({ [CHAVE_PREFERENCIAS]: "[1,2]" }))).toEqual(
      PREFERENCIAS_PADRAO,
    );
    const parcial = armazenamentoEmMemoria({
      [CHAVE_PREFERENCIAS]: JSON.stringify({
        defensor: 7,
        orgao: "Órgão",
        tema: "roxo",
        metodologia: "tjms-saj",
      }),
    });
    expect(lerPreferencias(parcial)).toEqual({
      defensor: "",
      orgao: "Órgão",
      tema: "sistema",
      metodologia: "lei14905",
    });
    expect(
      lerPreferencias(armazenamentoEmMemoria({ [CHAVE_PREFERENCIAS]: '{"tema":"claro"}' })).tema,
    ).toBe("claro");
    expect(
      lerPreferencias(
        armazenamentoEmMemoria({ [CHAVE_PREFERENCIAS]: '{"metodologia":"igpmJuros1"}' }),
      ).metodologia,
    ).toBe("igpmJuros1");
  });

  it("armazenamento bloqueado: ler devolve os padrões e gravar devolve false", () => {
    const bloqueado = armazenamentoQueFalha();
    expect(lerPreferencias(bloqueado)).toEqual(PREFERENCIAS_PADRAO);
    expect(gravarPreferencias(bloqueado, PREFERENCIAS_PADRAO)).toBe(false);
    expect(gravarPreferencias(null, PREFERENCIAS_PADRAO)).toBe(false);
  });
});
