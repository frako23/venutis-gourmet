import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ordenFinal } from "../../lib/catalog-order.ts";

describe("ordenFinal", () => {
  it("respeta el orden enviado", () => {
    assert.deepEqual(ordenFinal([3, 1, 2], [1, 2, 3]), [3, 1, 2]);
  });

  it("ignora los productos eliminados", () => {
    assert.deepEqual(ordenFinal([3, 9, 1, 2], [1, 2, 3]), [3, 1, 2]);
  });

  it("deja al final los productos creados mientras tanto", () => {
    assert.deepEqual(ordenFinal([2, 1], [1, 2, 4]), [2, 1, 4]);
  });

  it("conserva el orden actual si no se envió nada", () => {
    assert.deepEqual(ordenFinal([], [1, 2]), [1, 2]);
  });

  it("no repite ids enviados dos veces", () => {
    assert.deepEqual(ordenFinal([2, 2, 1], [1, 2]), [2, 1]);
  });
});
