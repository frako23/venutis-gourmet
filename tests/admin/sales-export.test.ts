import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildSalesControlWorkbook, buildSalesWorkbook, repartirDeudaPorLineas, type SalesControlLine } from "../../lib/admin/sales-export.js";
import { construirCarga } from "../../lib/admin/sales-import-core.js";
import { leerLibroXlsx } from "../../lib/admin/xlsx-reader.js";

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

describe("control de ventas con el formato del Excel", () => {
  it("reparte la deuda desde la última línea y calcula el abono", () => {
    assert.deepEqual(repartirDeudaPorLineas([10, 20, 5], "por_cobrar", 12), { deuda: [0, 7, 5], abono: [10, 13, 0] });
    assert.deepEqual(repartirDeudaPorLineas([10, 20], "pagado", 30).deuda, [0, 0]);
    assert.deepEqual(repartirDeudaPorLineas([10, 20], "por_cobrar", 99).deuda, [10, 20]);
  });

  const linea = (cambios: Partial<SalesControlLine>): SalesControlLine => ({
    fecha: "2026-08-01", nota: "6001", cliente: "Cliente Uno", grupo: "PASTA", producto: "RAVIOLI", sabor: "ESPINACA", gramos: 500,
    cantidad: 4, tipoPrecio: "mayor", precioUnitario: 8, venta: 32, abono: 32, deuda: 0, ...cambios,
  });
  const lineas = [
    linea({}),
    linea({ producto: "GNOCCHI", sabor: "PAPAS", cantidad: 16.5, precioUnitario: 5, venta: 82.5, abono: 82.5 }),
    linea({ nota: "6002", fecha: "2026-08-03", producto: "PASTICHO", sabor: "CARNE", gramos: 450, cantidad: 3, tipoPrecio: "promo", precioUnitario: 7, venta: 21, abono: 0, deuda: 21 }),
  ];

  it("escribe el título, los encabezados del formato y las columnas calculadas", () => {
    const libro = leerLibroXlsx(buildSalesControlWorkbook(lineas));
    const hoja = libro.hojas[0];
    assert.equal(hoja.nombre, "VENTAS");
    assert.equal(hoja.filas[0][1], "CONTROL DE VENTAS");
    assert.equal(hoja.filas[1][1], "FECHA");
    assert.equal(hoja.filas[1][2], "NOTA DE ENTREGA");
    assert.equal(hoja.filas[1][8], "CANT\nX PAQ.");
    assert.equal(hoja.filas[2][1], 46235);
    assert.equal(hoja.filas[2][2], 6001);
    assert.equal(hoja.filas[2][9], "MAYOR");
    assert.equal(hoja.filas[3][8], 16.5);
    assert.equal(hoja.filas[2][13], "SI");
    assert.equal(hoja.filas[2][16], "-");
    assert.equal(hoja.filas[4][13], "NO");
    assert.equal(hoja.filas[4][15], 21);
    assert.equal(hoja.filas[4][16], "x");
  });

  it("deja vacío el tipo de las líneas sin tipo", () => {
    const hoja = leerLibroXlsx(buildSalesControlWorkbook([linea({ tipoPrecio: null })])).hojas[0];
    assert.equal(hoja.filas[2][9] ?? null, null);
  });

  it("se puede volver a cargar: mismas notas, clientes e importes", () => {
    const carga = construirCarga(leerLibroXlsx(buildSalesControlWorkbook(lineas)), "2026-10-29");
    assert.deepEqual(carga.problemas, []);
    assert.deepEqual(carga.notas.map((n) => [n.numero, n.textoCliente, n.totalUsd, n.estadoResultante, n.saldoUsd]), [
      ["6001", "Cliente Uno", 114.5, "pagado", 0],
      ["6002", "Cliente Uno", 21, "por_cobrar", 21],
    ]);
    assert.equal(carga.notas[0].fecha, "2026-08-01");
  });
});
