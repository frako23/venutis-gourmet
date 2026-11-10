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

  it("sin delivery conserva el aviso de que no incluye delivery", () => {
    const message = mensajeWhatsapp({ negocio: "Venuti's Gourmet", lineas: lines as never, tasa: 35, totalUsd: 13 });
    assert.ok(message.includes("*NO INCLUYE DELIVERY*"));
    assert.ok(!message.includes("*Delivery*"));
  });

  it("con delivery incluye zona, costo, total con delivery y los datos de quien recibe", () => {
    const message = mensajeWhatsapp({
      negocio: "Venuti's Gourmet",
      lineas: lines as never,
      tasa: 35,
      totalUsd: 13,
      delivery: {
        zona: "Club Hípico",
        costoUsd: 3,
        recibe: { nombre: "María Pérez", telefono: "0414-123-4567", direccion: "Calle 2, casa 5" },
      },
    });
    for (const texto of [
      "*Delivery*",
      "Zona: Club Hípico",
      "Costo: $3.00",
      "Recibe: María Pérez",
      "Teléfono: 0414-123-4567",
      "Dirección: Calle 2, casa 5",
      "Productos: $13.00",
      "Delivery: $3.00",
      "Total USD: *$16.00*",
    ]) {
      assert.ok(message.includes(texto), `falta «${texto}» en el mensaje`);
    }
    assert.ok(!message.includes("NO INCLUYE DELIVERY"));
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
