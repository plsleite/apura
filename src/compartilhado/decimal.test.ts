import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";

describe("ambiente de testes", () => {
  it("decimal.js soma 0,1 com 0,2 sem o erro do ponto flutuante", () => {
    expect(new Decimal("0.1").plus(new Decimal("0.2")).toString()).toBe("0.3");
    expect(0.1 + 0.2).not.toBe(0.3);
  });
});
