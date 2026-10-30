import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calcularSaldoAFavor, dividirAbono, repartirBs, validarAplicacionSaldo } from "../../lib/saldo-a-favor.ts";

describe("dividirAbono", () => {
  it("separa lo que salda el pedido del excedente", () => {
    assert.deepEqual(dividirAbono(20, 18), { aplicadoUsd: 18, excedenteUsd: 2 });
  });

  it("un abono igual al saldo no deja excedente", () => {
    assert.deepEqual(dividirAbono(18, 18), { aplicadoUsd: 18, excedenteUsd: 0 });
  });

  it("un abono menor que el saldo se aplica completo", () => {
    assert.deepEqual(dividirAbono(5, 18), { aplicadoUsd: 5, excedenteUsd: 0 });
  });

  it("compara en centavos y evita errores de coma flotante", () => {
    assert.deepEqual(dividirAbono(0.3, 0.1 + 0.2), { aplicadoUsd: 0.3, excedenteUsd: 0 });
    assert.deepEqual(dividirAbono(0.31, 0.1 + 0.2), { aplicadoUsd: 0.3, excedenteUsd: 0.01 });
  });
});

describe("repartirBs", () => {
  it("la suma de las partes es exacta y el último centavo va al excedente", () => {
    const { pagoBs, excedenteBs } = repartirBs(100, 1, 3);
    assert.equal(pagoBs, 33.33);
    assert.equal(excedenteBs, 66.67);
    assert.equal(Math.round((pagoBs + excedenteBs) * 100), 10000);
  });
});

describe("calcularSaldoAFavor", () => {
  it("suma créditos y usos", () => {
    assert.equal(calcularSaldoAFavor([{ montoUsd: 50 }, { montoUsd: -35 }, { montoUsd: 0.1 }, { montoUsd: 0.2 }]), 15.3);
  });

  it("sin movimientos es cero", () => {
    assert.equal(calcularSaldoAFavor([]), 0);
  });
});

describe("validarAplicacionSaldo", () => {
  it("rechaza montos no positivos", () => {
    assert.throws(() => validarAplicacionSaldo({ montoUsd: 0, disponibleUsd: 10, saldoPedidoUsd: 10 }), /mayor que cero/);
    assert.throws(() => validarAplicacionSaldo({ montoUsd: -1, disponibleUsd: 10, saldoPedidoUsd: 10 }), /mayor que cero/);
  });

  it("rechaza más de lo que el cliente tiene a favor", () => {
    assert.throws(() => validarAplicacionSaldo({ montoUsd: 11, disponibleUsd: 10, saldoPedidoUsd: 50 }), /Solo tienes USD 10\.00 a favor\./);
  });

  it("rechaza más de lo que el pedido debe", () => {
    assert.throws(() => validarAplicacionSaldo({ montoUsd: 11, disponibleUsd: 50, saldoPedidoUsd: 10 }), /El pedido solo debe USD 10\.00\./);
  });

  it("acepta el caso válido", () => {
    assert.doesNotThrow(() => validarAplicacionSaldo({ montoUsd: 10, disponibleUsd: 10, saldoPedidoUsd: 10 }));
  });
});
