import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildSalesWorkbook } from "../../lib/admin/sales-export.js";

describe("exportación de ventas a Excel", () => {
  it("genera un libro XLSX con encabezados, datos numéricos y texto escapado", () => {
    const workbook = buildSalesWorkbook([{
      numeroOrden: "VEN-1",
      fechaCompra: new Date("2026-10-14T12:00:00Z"),
      cliente: "Ana & José",
      productos: [{ nombre: "Miel", cantidad: 2 }],
      pagos: [
        { metodoPago: "PagoMovil", referencia: "123&456" },
        { metodoPago: "EfectivoUsd", referencia: null },
      ],
      subtotalUsd: 12.5,
      descuentoUsd: 1,
      totalUsd: 11.5,
      tasaCambio: 100,
      montoBsPagado: 1150,
      estado: "Pagado",
    }]);
    const archive = new TextDecoder().decode(workbook);

    assert.deepEqual(Array.from(workbook.slice(0, 4)), [0x50, 0x4b, 0x03, 0x04]);
    assert.match(archive, /xl\/worksheets\/sheet1\.xml/);
    assert.match(archive, /Ana &amp; José/);
    assert.match(archive, /Productos y cantidades/);
    assert.match(archive, /Pago móvil/);
    assert.match(archive, /123&amp;456/);
    assert.match(archive, /Efectivo USD/);
    assert.doesNotMatch(archive, /Tipo de cliente|Celular|Correo|Tipo de retiro|Último pago/);
    assert.match(archive, /<c s="2"><v>12\.5<\/v><\/c>/);
    assert.match(archive, /<font><b\/><sz val="11"\/><color rgb="FF000000"\/>/);
    assert.match(archive, /<xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyFont="1"\/>/);
    assert.doesNotMatch(archive, /patternType="solid"|<fgColor/);
    assert.match(archive, /autoFilter ref="A1:L2"/);
  });
});
