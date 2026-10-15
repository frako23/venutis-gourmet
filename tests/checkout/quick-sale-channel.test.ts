import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  mensajeWhatsapp,
  toCheckoutCartItems,
} from "../../lib/pos.js";

describe("canales de venta rápida", () => {
  const lines = [
    {
      producto: {
        id: "7",
        nombre: "Ravioli de carne",
        precioUsd: 6.5,
        categoria: "Pastas",
        imagenes: [{ url: "/ravioli.jpg" }],
        inventario: 9,
      },
      cantidad: 2,
    },
  ];

  it("conserva el detalle del carrito para WhatsApp", () => {
    const message = mensajeWhatsapp({
      negocio: "Venuti's Gourmet",
      lineas: lines as never,
      tasa: 35,
      totalUsd: 13,
    });
    assert.match(message, /2 x Ravioli de carne/);
    assert.match(message, /Total USD/);
    assert.match(message, /Total Bs/);
    assert.match(message, /35/);
  });

  it("convierte el carrito rápido al formato del checkout sin persistirlo", () => {
    const converted = toCheckoutCartItems(lines);
    assert.deepEqual(converted[0], {
      id: 7,
      nombre: "Ravioli de carne",
      precio: 6.5,
      precioDetal: 6.5,
      precioMayorista: 6.5,
      contexto: "consumidor",
      inventario: 9,
      descripcion: "Pastas",
      imagen: "/ravioli.jpg",
      cantidad: 2,
    });
  });
});
