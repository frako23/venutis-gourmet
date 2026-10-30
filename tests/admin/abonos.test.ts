import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  agruparCuentasPorCobrar,
  calcularAbonado,
  calcularSaldo,
  convertirAbonoAUsd,
  puedeAnularAbono,
  puedeRecibirAbono,
  validarMontoAbono,
  validarTotalContraAbonado,
  evaluarCredito,
} from "../../lib/admin/abonos.js";

const abono = (montoUsd: number, anuladoEn: Date | null = null) => ({ esAbono: true, montoUsd, anuladoEn });

describe("abonos y saldo", () => {
  it("suma solo abonos vigentes", () => {
    const pagos = [abono(20), abono(5, new Date()), { esAbono: false, montoUsd: 33, anuladoEn: null }];
    assert.equal(calcularAbonado(pagos), 20);
  });

  it("calcula el saldo según estado y abonos", () => {
    assert.equal(calcularSaldo({ estado: "pagado", montoTotal: 33, pagos: [] }), 0);
    assert.equal(calcularSaldo({ estado: "por_cobrar", montoTotal: 33, pagos: [abono(20)] }), 13);
    assert.equal(calcularSaldo({ estado: "por_cobrar", montoTotal: 33, pagos: [{ esAbono: false, montoUsd: 33, anuladoEn: null }] }), 33);
  });

  it("limita abonos y anulaciones por estado", () => {
    for (const estado of ["por_cobrar", "pendiente", "en_pedido"] as const) assert.equal(puedeRecibirAbono(estado), true);
    for (const estado of ["pagado", "cancelado"] as const) {
      assert.equal(puedeRecibirAbono(estado), false);
      assert.equal(puedeAnularAbono(estado), false);
    }
    assert.equal(puedeAnularAbono("por_cobrar"), true);
  });

  it("convierte abonos en bolívares a USD", () => {
    assert.equal(convertirAbonoAUsd({ moneda: "bs", monto: 3650, tasaCambio: 182.5 }), 20);
    assert.equal(convertirAbonoAUsd({ moneda: "usd", monto: 20.004, tasaCambio: null }), 20);
    assert.throws(() => convertirAbonoAUsd({ moneda: "bs", monto: 100, tasaCambio: null }));
  });

  it("valida el monto contra el saldo", () => {
    assert.throws(() => validarMontoAbono(0, 13));
    assert.throws(() => validarMontoAbono(13.01, 13), /USD 13\.00/);
    assert.doesNotThrow(() => validarMontoAbono(13, 13));
  });

  it("rechaza un total menor que lo abonado", () => {
    assert.throws(() => validarTotalContraAbonado(10, 20), /USD 20\.00/);
    assert.doesNotThrow(() => validarTotalContraAbonado(20, 20));
  });

  it("agrupa cuentas por cobrar por cliente, de mayor a menor deuda", () => {
    const pedido = (clienteId: number, cliente: string, dia: number, montoTotal: number, pagos = [] as ReturnType<typeof abono>[]) => ({
      clienteId, cliente, fechaCompra: new Date(`2026-08-${String(dia).padStart(2, "0")}T16:00:00Z`), estado: "por_cobrar" as const, montoTotal, pagos,
    });
    const resultado = agruparCuentasPorCobrar([
      pedido(1, "Ana", 20, 10),
      pedido(2, "Beto", 27, 33, [abono(20)]),
      pedido(1, "Ana", 5, 15),
      pedido(3, "Cora", 9, 8, [abono(8)]),
    ]);
    assert.equal(resultado.totalUsd, 38);
    assert.deepEqual(resultado.clientes.map((c) => [c.clienteId, c.deudaUsd, c.pedidos]), [[1, 25, 2], [2, 13, 1]]);
    assert.equal(resultado.clientes[0].desde.toISOString(), "2026-08-05T16:00:00.000Z");
  });
});

describe("evaluarCredito", () => {
  const base = { habilitado: true, limiteUsd: 60, deudaUsd: 50 };

  it("sin crédito toda venta sin cobrar requiere autorización", () => {
    const r = evaluarCredito({ habilitado: false, limiteUsd: null, deudaUsd: 0, montoSinCobrarUsd: 10 });
    assert.deepEqual(r, { disponibleUsd: 0, requiereAutorizacion: true, excesoUsd: 10 });
  });

  it("no requiere autorización si cabe en el disponible", () => {
    const r = evaluarCredito({ ...base, montoSinCobrarUsd: 10 });
    assert.deepEqual(r, { disponibleUsd: 10, requiereAutorizacion: false, excesoUsd: 0 });
  });

  it("un centavo por encima del disponible ya requiere autorización", () => {
    const r = evaluarCredito({ ...base, montoSinCobrarUsd: 10.01 });
    assert.equal(r.requiereAutorizacion, true);
    assert.equal(r.excesoUsd, 0.01);
  });

  it("con el límite por debajo de la deuda el disponible es cero", () => {
    const r = evaluarCredito({ habilitado: true, limiteUsd: 30, deudaUsd: 50, montoSinCobrarUsd: 5 });
    assert.deepEqual(r, { disponibleUsd: 0, requiereAutorizacion: true, excesoUsd: 5 });
  });

  it("un monto sin cobrar de cero nunca requiere autorización", () => {
    assert.equal(evaluarCredito({ habilitado: false, limiteUsd: null, deudaUsd: 99, montoSinCobrarUsd: 0 }).requiereAutorizacion, false);
  });
});
