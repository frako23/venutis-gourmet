import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PDFDocument } from "pdf-lib";

import { isWholesaleClient, motivoSinNota, normalizarNumeroFactura, numeroNotaDePedido, snapshotDeliveryLines, validateDeliveryLines } from "../../lib/admin/delivery-note-rules.js";
import { buildDeliveryNotePdf } from "../../lib/admin/delivery-note-pdf.js";

describe("reglas de notas de entrega", () => {
  it("permite solo clientes mayoristas", () => {
    assert.equal(isWholesaleClient("mayorista"), true);
    assert.equal(isWholesaleClient("detal"), false);
  });

  it("exige líneas válidas y conserva un snapshot independiente", () => {
    const lines = [{ productoId: 1, productoNombre: "  Caja gourmet ", cantidad: 2, precioUnitarioUsd: 12 }];
    assert.equal(validateDeliveryLines(lines), true);
    assert.equal(validateDeliveryLines([{ productoNombre: "", cantidad: 1 }]), false);
    const snapshot = snapshotDeliveryLines(lines);
    assert.equal(snapshot[0].productoNombre, "Caja gourmet");
    assert.notEqual(snapshot, lines);
  });

  it("admite una nota sin precio sin inventar totales", () => {
    const lines = snapshotDeliveryLines([{ productoNombre: "Muestra", cantidad: 1, precioUnitarioUsd: null }]);
    assert.equal(validateDeliveryLines(lines), true);
    assert.equal(lines[0].precioUnitarioUsd, null);
  });

  it("el número de nota es el de la orden", () => {
    assert.equal(numeroNotaDePedido(" 20261110-001 "), "20261110-001");
  });

  it("el número de factura es opcional y se normaliza", () => {
    assert.equal(normalizarNumeroFactura(undefined), null);
    assert.equal(normalizarNumeroFactura("   "), null);
    assert.equal(normalizarNumeroFactura("  00-123   456 "), "00-123 456");
  });

  it("solo admite nota un pedido mayorista, no cancelado y sin nota previa", () => {
    const base = { estado: "por_cobrar", cliente: { tipoCliente: "mayorista" }, notasEntrega: 0 };
    assert.equal(motivoSinNota(base), null);
    assert.match(motivoSinNota({ ...base, cliente: { tipoCliente: "detal" } }) ?? "", /mayoristas/);
    assert.match(motivoSinNota({ ...base, estado: "cancelado" }) ?? "", /cancelado/);
    assert.match(motivoSinNota({ ...base, notasEntrega: 1 }) ?? "", /ya tiene/);
  });

  it("acepta cantidades con decimales copiadas del pedido", () => {
    assert.equal(validateDeliveryLines([{ productoNombre: "Pasta", cantidad: 1.5, precioUnitarioUsd: 4 }]), true);
    assert.equal(validateDeliveryLines([{ productoNombre: "Pasta", cantidad: 0 }]), false);
  });

  it("genera un PDF descargable y agrega páginas cuando hay muchas líneas", async () => {
    const bytes = await buildDeliveryNotePdf({ numeroNota: "NE-TEST", numeroFactura: "00-123456", fechaEntrega: new Date("2026-01-01"), direccionEntrega: "Caracas", personaRecibe: "Ana", observaciones: "Entrega de prueba", cliente: { nombre: "Mercado", apellido: "Central", celular: "04140000002", email: null }, detalles: Array.from({ length: 45 }, (_, index) => ({ productoNombre: `Producto mayorista ${index + 1}`, cantidad: 2, precioUnitarioUsd: 3.5, subtotalUsd: 7 })) });
    const pdf = await PDFDocument.load(bytes);
    assert.ok(pdf.getPageCount() >= 2);
    assert.equal(bytes.slice(0, 4).toString(), "37,80,68,70");
  });
});
