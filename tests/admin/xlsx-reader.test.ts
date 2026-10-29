import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ArchivoExcelError, leerLibroXlsx } from "../../lib/admin/xlsx-reader.js";
import { crearLibroControlVentas, empaquetarZip } from "./xlsx-fixture.js";

describe("lector de .xlsx", () => {
  const libro = leerLibroXlsx(crearLibroControlVentas());
  const ventas = libro.hojas[0];

  it("devuelve las hojas en orden", () => {
    assert.deepEqual(libro.hojas.map((hoja) => hoja.nombre), ["VENTAS", "Hoja1"]);
    assert.equal(libro.date1904, false);
    assert.deepEqual(libro.hojas[1].filas, []);
  });

  it("lee título, encabezados con salto de línea y texto enriquecido", () => {
    assert.equal(ventas.filas[0][1], "CONTROL DE VENTAS");
    assert.equal(ventas.filas[1][8], "CANT\nX PAQ.");
    assert.equal(ventas.filas[4][4], "CLÍNICA DEMO");
  });

  it("lee números, fórmulas con valor guardado, booleanos y celdas vacías", () => {
    const fila = ventas.filas[2];
    assert.equal(fila[1], 46235);
    assert.equal(fila[2], 5001);
    assert.equal(fila[3], null);
    assert.equal(fila[12], 32);
    assert.equal(ventas.filas[3][8], 16.5);
    assert.equal(fila[16], "-");
    assert.equal(ventas.filas[7][16], "-");
    assert.equal(fila[18], true);
    assert.equal(fila[19], "nota");
    assert.equal(fila[0], null);
  });

  it("conserva espacios y acentos del texto", () => {
    assert.equal(ventas.filas[2][4], "CLIENTE UNO ");
    assert.equal(ventas.filas[4][7], "CHAMPIÑON");
  });

  it("rechaza archivos con contraseña, cifrados, de método desconocido o que no son zip", () => {
    const cabeceraOle = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    assert.throws(() => leerLibroXlsx(cabeceraOle), /protegido con contraseña o es un Excel antiguo/);
    const entradas = [{ nombre: "a.txt", metodo: 0 as const, datos: new TextEncoder().encode("hola") }];
    assert.throws(() => leerLibroXlsx(empaquetarZip(entradas, { bitCifrado: true })), /protegido o no es un Excel válido/);
    assert.throws(() => leerLibroXlsx(empaquetarZip(entradas, { metodoForzado: 14 })), /protegido o no es un Excel válido/);
    assert.throws(() => leerLibroXlsx(new TextEncoder().encode("esto no es un excel, solo texto plano largo")), /no es un Excel \(\.xlsx\) válido/);
    assert.throws(() => leerLibroXlsx(empaquetarZip(entradas)), ArchivoExcelError);
  });

  it("aplica el límite de contenido descomprimido", () => {
    assert.throws(() => leerLibroXlsx(crearLibroControlVentas(), { maxEntradas: 2000, maxDescomprimido: 200 }), /demasiado grande o está dañado/);
    assert.throws(() => leerLibroXlsx(crearLibroControlVentas(), { maxEntradas: 2, maxDescomprimido: 50 * 1024 * 1024 }), /demasiado grande o está dañado/);
  });
});
