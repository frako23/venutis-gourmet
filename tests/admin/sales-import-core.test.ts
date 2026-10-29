import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CargaInvalidaError,
  claveProducto,
  clavesDeClientes,
  clavesDeProductos,
  coincidenciaExactaProducto,
  construirCarga,
  evaluarCarga,
  interpretarFecha,
  normalizarTexto,
  resolverClientes,
  resolverProductos,
  sugerirProducto,
  type PedidoExistente,
} from "../../lib/admin/sales-import-core.js";
import { leerLibroXlsx } from "../../lib/admin/xlsx-reader.js";
import { crearLibroControlVentas, type Valor } from "./xlsx-fixture.js";

const HOY = "2026-10-29";
const cargar = (sobrescribir: Record<string, Valor> = {}) => construirCarga(leerLibroXlsx(crearLibroControlVentas({ sobrescribir })), HOY);
const mensajes = (carga: ReturnType<typeof cargar>, nivel: "error" | "advertencia") => carga.problemas.filter((p) => p.nivel === nivel).map((p) => p.mensaje);

describe("lectura y validación de la carga", () => {
  it("localiza la tabla en VENTAS e ignora la fila final con solo fórmulas", () => {
    const carga = cargar();
    assert.equal(carga.hoja, "VENTAS");
    assert.equal(carga.filaEncabezados, 2);
    assert.equal(carga.totalLineas, 5);
    assert.deepEqual(carga.problemas, []);
  });

  it("informa las columnas obligatorias que faltan", () => {
    assert.throws(() => cargar({ L2: "OTRO" }), (error) => error instanceof CargaInvalidaError && /No se encontraron las columnas obligatorias: PVP UND\./.test(error.message));
  });

  it("normaliza textos, incluidos saltos de línea de Windows", () => {
    assert.equal(normalizarTexto("  Champiñon "), "CHAMPINON");
    assert.equal(normalizarTexto("CANT\r\nX PAQ."), "CANT X PAQ");
  });

  it("interpreta fechas de Excel y texto d/m/aaaa", () => {
    assert.equal(interpretarFecha(46235, false), "2026-08-01");
    assert.equal(interpretarFecha("1/8/2026", false), "2026-08-01");
    assert.equal(interpretarFecha("31/2/2026", false), null);
    assert.equal(interpretarFecha("hola", false), null);
    assert.equal(interpretarFecha(46235 - 1462, true), "2026-08-01");
  });

  it("rechaza una fecha posterior a hoy", () => {
    assert.ok(mensajes(cargar({ B3: 46400 }), "error").includes("La fecha es posterior a hoy."));
  });

  it("valida la cantidad: 16,5 es válida; 1,005 y texto no", () => {
    assert.deepEqual(mensajes(cargar(), "error"), []);
    const esperado = "La cantidad debe ser mayor que cero y tener como máximo 2 decimales.";
    assert.ok(mensajes(cargar({ I3: 1.005 }), "error").includes(esperado));
    assert.ok(mensajes(cargar({ I3: "abc" }), "error").includes(esperado));
  });

  it("valida el tipo de precio", () => {
    const carga = cargar({ J3: "oferta" });
    assert.ok(mensajes(carga, "error").includes("El tipo debe ser DETAL, MAYOR o PROMO."));
    assert.equal(carga.problemas[0].fila, 3);
    assert.equal(carga.problemas[0].columna, "TIPO");
  });

  it("reconoce PAGADO con acentos y espacios; vacío es NO con advertencia", () => {
    assert.deepEqual(cargar({ N5: "Sí " }).problemas, []);
    assert.ok(mensajes(cargar({ N5: null }), "advertencia").includes("PAGADO está vacío; se toma como NO."));
    assert.ok(mensajes(cargar({ N5: "quizás" }), "error").includes("PAGADO debe ser SI o NO."));
  });

  it("toma lo cobrado del ABONO numérico antes que de PAGADO", () => {
    const parcial = cargar({ O3: 10 });
    const nota = parcial.notas.find((n) => n.numero === "5001")!;
    assert.equal(nota.abonadoUsd, 92.5);
    assert.equal(nota.saldoUsd, 22);
    assert.equal(nota.estadoResultante, "por_cobrar");
    assert.ok(mensajes(cargar({ O3: 40 }), "error").includes("El abono no puede ser negativo ni mayor que la venta de la línea."));
    assert.ok(mensajes(cargar({ O3: 0 }), "advertencia").some((m) => m.startsWith("PAGADO y ABONO no coinciden")));
  });

  it("advierte cuando VENTA no coincide con CANT × PVP y usa el cálculo", () => {
    const carga = cargar({ M3: 31 });
    assert.ok(mensajes(carga, "advertencia").some((m) => m.includes("La VENTA del archivo (31.00) no coincide con CANT × PVP (32.00); se usa 32.00.")));
    assert.equal(carga.notas[0].lineas[0].importeUsd, 32);
  });

  it("toma el número de GR y avisa si no hay número", () => {
    assert.equal(cargar({ K3: "500 g" }).notas[0].lineas[0].gramos, 500);
    const sinNumero = cargar({ K3: "n/a" });
    assert.equal(sinNumero.notas[0].lineas[0].gramos, null);
    assert.ok(mensajes(sinNumero, "advertencia").includes("GR no tiene un número; se ignora."));
  });

  it("agrupa por nota, conserva líneas repetidas y calcula estado y totales", () => {
    const carga = cargar();
    assert.deepEqual(carga.notas.map((n) => [n.numero, n.lineas.length, n.totalUsd, n.estadoResultante]), [
      ["5001", 2, 114.5, "pagado"],
      ["5002", 2, 31, "pagado"],
      ["5003", 1, 21, "por_cobrar"],
    ]);
    assert.equal(carga.notas[2].saldoUsd, 21);
    assert.equal(carga.notas[1].lineas[0].precioUnitarioUsd, 10.5);
    assert.equal(carga.notas[1].lineas[1].precioUnitarioUsd, 10);
    assert.equal(carga.notas[0].lineas[0].tipoPrecio, "mayor");
    assert.equal(carga.notas[2].lineas[0].tipoPrecio, "promo");
  });

  it("marca como error una nota con líneas de distinto cliente", () => {
    const carga = cargar({ E4: "OTRO CLIENTE" });
    assert.ok(mensajes(carga, "error").includes("La nota 5001 tiene líneas con distinta fecha o cliente."));
    assert.equal(carga.notas.find((n) => n.numero === "5001")!.identificable, false);
  });
});

const catalogo = [
  { id: 1, nombre: "RAVIOLI DE CARNE" },
  { id: 2, nombre: "RAVIOLI DE RICOTTA Y ESPINACA" },
  { id: 3, nombre: "RAVIOLI DE RICOTTA Y CHAMPIÑONES" },
  { id: 4, nombre: "GNOCCHI DE PAPAS" },
  { id: 5, nombre: "TORTELLONI DE RICOTTA Y ESPINACA" },
  { id: 6, nombre: "TORTELLINI DE CARNE" },
  { id: 7, nombre: "BERENJENA A LA PARMESSANA" },
];

describe("conciliación de productos y clientes", () => {
  it("arma la clave del producto con grupo, producto, sabor y gramaje", () => {
    assert.equal(claveProducto({ grupo: "PASTA", producto: "RAVIOLI ", sabor: "ESPINACA", gramos: 500 }), "PASTA|RAVIOLI|ESPINACA|500");
    assert.equal(claveProducto({ producto: "Tomate", sabor: "Napoli", gramos: null }), "|TOMATE|NAPOLI|");
  });

  it("reconoce coincidencias exactas ignorando palabras vacías", () => {
    assert.equal(coincidenciaExactaProducto({ producto: "GNOCCHI", sabor: "PAPAS" }, catalogo), 4);
    assert.equal(coincidenciaExactaProducto({ producto: "RAVIOLI", sabor: "ESPINACA" }, catalogo), null);
  });

  it("sugiere un único producto cuando hay uno claramente mejor", () => {
    assert.equal(sugerirProducto({ producto: "RAVIOLI", sabor: "ESPINACA" }, catalogo), 2);
    assert.equal(sugerirProducto({ producto: "RAVIOLI", sabor: "CHAMPIÑON" }, catalogo), 3);
    assert.equal(sugerirProducto({ producto: "PARMEGGIANA", sabor: "BERENJENA" }, catalogo), 7);
    assert.equal(sugerirProducto({ producto: "TORTELLONI", sabor: "ESPINACA" }, catalogo), 5);
  });

  it("no sugiere ante un empate o sin coincidencias", () => {
    assert.equal(sugerirProducto({ producto: "RAVIOLI", sabor: null }, catalogo), null);
    assert.equal(sugerirProducto({ producto: "POSTRE", sabor: "FRESA" }, catalogo), null);
  });

  it("aplica primero la equivalencia guardada", () => {
    const claves = clavesDeProductos(cargar().notas);
    const resueltas = resolverProductos(claves, catalogo, new Map([["PASTA|PASTICHO|CARNE|450", 6]]));
    const pasticho = resueltas.find((r) => r.producto === "PASTICHO")!;
    assert.deepEqual(pasticho.resolucion, { tipo: "equivalencia", productoId: 6, nombre: "TORTELLINI DE CARNE" });
    assert.equal(resueltas.find((r) => r.producto === "GNOCCHI")!.resolucion.tipo, "exacta");
    assert.equal(resueltas.find((r) => r.sabor === "ESPINACA")!.resolucion.tipo, "sugerida");
  });

  it("cuenta las líneas por clave de producto", () => {
    const claves = clavesDeProductos(cargar().notas);
    assert.equal(claves.find((c) => c.sabor === "CHAMPIÑON")!.lineas, 2);
  });

  it("reconoce clientes por nombre normalizado y deja pendientes los ambiguos", () => {
    const clientes = [
      { id: 10, nombre: "Cliente", apellido: "Uno", nombreBusqueda: "cliente uno" },
      { id: 11, nombre: "Ana", apellido: "Gómez", nombreBusqueda: "ana gomez" },
      { id: 12, nombre: "Ana", apellido: "Gomez", nombreBusqueda: "ana gomez" },
    ];
    const claves = [
      { clave: "cliente uno", texto: "CLIENTE UNO", tipoPropuesto: "detal" as const },
      { clave: "ana gomez", texto: "ANA GOMEZ", tipoPropuesto: "detal" as const },
      { clave: "nuevo", texto: "NUEVO", tipoPropuesto: "detal" as const },
      { clave: "alias", texto: "ALIAS", tipoPropuesto: "detal" as const },
    ];
    const resueltos = resolverClientes(claves, clientes, new Map([["alias", 11]]));
    assert.deepEqual(resueltos[0].resolucion, { tipo: "exacta", clienteId: 10, nombre: "Cliente Uno" });
    assert.equal(resueltos[1].resolucion.tipo, "pendiente");
    assert.deepEqual(resueltos[2].resolucion, { tipo: "pendiente", coincidencias: [] });
    assert.equal(resueltos[3].resolucion.tipo, "equivalencia");
  });

  it("propone mayorista si alguna línea del cliente es MAYOR", () => {
    const claves = clavesDeClientes(cargar().notas);
    assert.equal(claves.find((c) => c.clave === "cliente uno")!.tipoPropuesto, "mayorista");
    assert.equal(claves.find((c) => c.texto === "CLÍNICA DEMO")!.tipoPropuesto, "detal");
  });
});

describe("situación de cada nota", () => {
  const existente = (cambios: Partial<PedidoExistente> = {}): PedidoExistente => ({
    id: 1, numeroOrden: "5001", clienteId: 10, clienteNombre: "Cliente Uno", clienteClave: "cliente uno", dia: "2026-08-01", importeUsd: 114.5, totalUsd: 114.5, ...cambios,
  });
  const evaluar = (existentes: PedidoExistente[], sobrescribir: Record<string, Valor> = {}) =>
    evaluarCarga(cargar(sobrescribir), new Map(existentes.map((e) => [e.numeroOrden, e])), new Map([["cliente uno", 10]]));
  const situacion = (resultado: ReturnType<typeof evaluar>, numero: string) => resultado.notas.find((n) => n.numero === numero)!.situacion;

  it("sin pedidos existentes todas son nuevas y se puede confirmar", () => {
    const resultado = evaluar([]);
    assert.deepEqual(resultado.notas.map((n) => n.situacion), ["nueva", "nueva", "nueva"]);
    assert.equal(resultado.puedeConfirmar, true);
  });

  it("mismo cliente, día e importe es ya registrada; con ±0,01 de diferencia también", () => {
    assert.equal(situacion(evaluar([existente()]), "5001"), "ya_registrada");
    assert.equal(situacion(evaluar([existente({ importeUsd: 114.51 })]), "5001"), "ya_registrada");
  });

  it("otro cliente, día o importe es conflicto y bloquea con el pedido existente", () => {
    const resultado = evaluar([existente({ clienteId: 99, clienteClave: "otro" })]);
    assert.equal(situacion(resultado, "5001"), "conflicto");
    assert.equal(resultado.puedeConfirmar, false);
    assert.ok(resultado.problemas.some((p) => p.mensaje === "El número 5001 ya pertenece al pedido de Cliente Uno del 01/08/2026 por USD 114.50."));
    assert.equal(situacion(evaluar([existente({ importeUsd: 100 })]), "5001"), "conflicto");
    assert.equal(situacion(evaluar([existente({ dia: "2026-08-05" })]), "5001"), "conflicto");
  });

  it("los problemas de una nota ya registrada no bloquean", () => {
    const resultado = evaluar([existente()], { J3: "oferta" });
    assert.equal(situacion(resultado, "5001"), "ya_registrada");
    assert.equal(resultado.puedeConfirmar, true);
  });

  it("un error en una nota nueva bloquea", () => {
    const resultado = evaluar([], { J3: "oferta" });
    assert.equal(situacion(resultado, "5001"), "con_error");
    assert.equal(resultado.puedeConfirmar, false);
  });
});
