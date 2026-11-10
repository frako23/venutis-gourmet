import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  agruparPorCosto,
  buscarZona,
  claveZona,
  filtrarZonas,
  ordenarZonas,
  validarCostoZona,
  validarDatosEntrega,
  validarNombreZona,
} from "../../lib/delivery-zone-rules.ts";

const z = (id: number, nombre: string, costoUsd: number) => ({ id, nombre, costoUsd });

describe("claveZona", () => {
  it("quita acentos, mayúsculas y signos", () => {
    assert.equal(claveZona("Club Hípico"), "club hipico");
    assert.equal(claveZona("  Chacaíto "), "chacaito");
    assert.equal(claveZona("Av. Victoria (Presidente Medina)"), "av victoria presidente medina");
    assert.equal(claveZona("Montalban  II"), "montalban ii");
    assert.equal(claveZona("..."), "");
  });
});

describe("validarNombreZona", () => {
  it("normaliza espacios y calcula la clave", () => {
    assert.deepEqual(validarNombreZona("  Santa   Sofía "), {
      ok: true,
      value: { nombre: "Santa Sofía", clave: "santa sofia" },
    });
  });

  it("rechaza vacío, demasiado largo y sin letras", () => {
    const vacio = validarNombreZona("   ");
    assert.equal(vacio.ok === false && vacio.message, "Escribe el nombre de la zona.");
    const largo = validarNombreZona("a".repeat(81));
    assert.equal(largo.ok === false && largo.message, "El nombre de la zona admite hasta 80 caracteres.");
    assert.equal(validarNombreZona("a".repeat(80)).ok, true);
    const signos = validarNombreZona("...");
    assert.equal(signos.ok === false && signos.message, "El nombre de la zona debe tener letras o números.");
  });
});

describe("validarCostoZona", () => {
  it("acepta costos con hasta 2 decimales", () => {
    assert.deepEqual(validarCostoZona(3.5), { ok: true, value: 3.5 });
    assert.deepEqual(validarCostoZona(4), { ok: true, value: 4 });
  });

  it("rechaza no finitos, cero, negativos y más de 2 decimales", () => {
    for (const costo of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const r = validarCostoZona(costo);
      assert.equal(r.ok === false && r.message, "Escribe un costo válido en dólares.");
    }
    for (const costo of [0, -1]) {
      const r = validarCostoZona(costo);
      assert.equal(r.ok === false && r.message, "El costo del delivery debe ser mayor que cero.");
    }
    const r = validarCostoZona(3.555);
    assert.equal(r.ok === false && r.message, "El costo admite hasta 2 decimales.");
  });
});

describe("ordenarZonas", () => {
  it("ordena por costo y luego por nombre, sin que el acento mande", () => {
    const orden = ordenarZonas([
      z(1, "Baruta", 4),
      z(2, "Zulia", 3),
      z(3, "Ávila", 3),
      z(4, "Altamira", 3),
    ]).map((zona) => zona.nombre);
    assert.deepEqual(orden, ["Altamira", "Ávila", "Zulia", "Baruta"]);
  });

  it("el costo manda sobre el nombre y no muta la entrada", () => {
    const entrada = [z(1, "Alfa", 5), z(2, "Zeta", 3)];
    assert.deepEqual(ordenarZonas(entrada).map((x) => x.nombre), ["Zeta", "Alfa"]);
    assert.equal(entrada[0].nombre, "Alfa");
  });
});

describe("filtrarZonas", () => {
  const zonas = [
    z(1, "Club Hípico", 3),
    z(2, "Terrazas del Club Hípico", 3),
    z(3, "Av. Libertador", 3),
    z(4, "Altamira", 3),
  ];

  it("busca sin distinguir acentos ni mayúsculas", () => {
    assert.deepEqual(filtrarZonas(zonas, "hipico").map((x) => x.nombre), ["Club Hípico", "Terrazas del Club Hípico"]);
  });

  it("ignora signos y espacios repetidos", () => {
    assert.deepEqual(filtrarZonas(zonas, "AV.  lib").map((x) => x.nombre), ["Av. Libertador"]);
  });

  it("sin coincidencias devuelve vacío y con texto vacío devuelve todas", () => {
    assert.deepEqual(filtrarZonas(zonas, "zzz"), []);
    assert.equal(filtrarZonas(zonas, "").length, 4);
  });
});

describe("agruparPorCosto", () => {
  it("forma un grupo por costo, también con decimales", () => {
    const grupos = agruparPorCosto([z(1, "A", 3), z(2, "B", 3), z(3, "C", 3.5), z(4, "D", 4)]);
    assert.deepEqual(grupos.map((g) => [g.costoUsd, g.zonas.length]), [[3, 2], [3.5, 1], [4, 1]]);
  });

  it("no devuelve grupos vacíos", () => {
    assert.deepEqual(agruparPorCosto([]), []);
  });
});

describe("buscarZona", () => {
  const zonas = [z(1, "Chacaíto", 3), z(2, "Altamira", 3)];

  it("resuelve por clave", () => {
    assert.equal(buscarZona(zonas, "Chacaito")?.id, 1);
    assert.equal(buscarZona(zonas, "ALTAMIRA")?.id, 2);
  });

  it("devuelve null si no existe o la entrada no tiene clave", () => {
    assert.equal(buscarZona(zonas, "Zona desconocida"), null);
    assert.equal(buscarZona(zonas, "..."), null);
  });
});

describe("validarDatosEntrega", () => {
  const base = { nombre: "María Pérez", telefono: "0414-123-4567", direccion: "Calle 2, casa 5" };

  it("acepta teléfonos con +, espacios y guiones y recorta los valores", () => {
    assert.equal(validarDatosEntrega(base).ok, true);
    assert.equal(validarDatosEntrega({ ...base, telefono: "+58 414 1234567" }).ok, true);
    const r = validarDatosEntrega({ nombre: "  Ana ", telefono: " 04141234567 ", direccion: " Calle 1 " });
    assert.deepEqual(r, { ok: true, value: { nombre: "Ana", telefono: "04141234567", direccion: "Calle 1" } });
  });

  it("rechaza campos vacíos con su campo y mensaje", () => {
    assert.deepEqual(validarDatosEntrega({ ...base, nombre: " " }), {
      ok: false,
      campo: "nombre",
      message: "Escribe el nombre de quien recibe.",
    });
    assert.deepEqual(validarDatosEntrega({ ...base, telefono: "" }), {
      ok: false,
      campo: "telefono",
      message: "Escribe el teléfono de quien recibe.",
    });
    assert.deepEqual(validarDatosEntrega({ ...base, direccion: "" }), {
      ok: false,
      campo: "direccion",
      message: "Escribe la dirección de entrega.",
    });
  });

  it("rechaza teléfonos fuera de rango o con caracteres no admitidos", () => {
    for (const telefono of ["414123456", "+58 4141 2345 678901"]) {
      assert.deepEqual(validarDatosEntrega({ ...base, telefono }), {
        ok: false,
        campo: "telefono",
        message: "El teléfono debe tener entre 10 y 15 dígitos.",
      });
    }
    assert.deepEqual(validarDatosEntrega({ ...base, telefono: "0414/1234567" }), {
      ok: false,
      campo: "telefono",
      message: "El teléfono solo admite números, +, espacios y guiones.",
    });
  });
});
