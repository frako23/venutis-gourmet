import {
  BadgePlus,
  BriefcaseMedical,
  Shirt,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

export type Producto = {
  id: string;
  nombre: string;
  precioUsd: number;
  icono: LucideIcon;
  categoria: string;
  inventario: number;
};

export type LineaCarrito = {
  producto: Producto;
  cantidad: number;
};

export type QuickSaleProduct = {
  id: string | number;
  nombre: string;
  precioUsd: number;
  categoria: string;
  imagenes?: { url: string }[];
  inventario?: number;
};

export type CheckoutCartItem = {
  id: number;
  nombre: string;
  precio: number;
  precioDetal: number;
  precioMayorista: number;
  contexto: "consumidor";
  inventario?: number;
  descripcion?: string;
  imagen: string;
  cantidad: number;
};

export function toCheckoutCartItems(
  lines: Array<{ producto: QuickSaleProduct; cantidad: number }>,
): CheckoutCartItem[] {
  return lines.map(({ producto, cantidad }) => ({
    id: Number(producto.id),
    nombre: producto.nombre,
    precio: producto.precioUsd,
    precioDetal: producto.precioUsd,
    precioMayorista: producto.precioUsd,
    contexto: "consumidor",
    inventario: producto.inventario,
    descripcion: producto.categoria,
    imagen: producto.imagenes?.[0]?.url ?? "/placeholder-image.jpg",
    cantidad,
  }));
}

export const ICONOS_POR_CATEGORIA = {
  Uniforme: Shirt,
  Bata: BriefcaseMedical,
  Chaqueta: Stethoscope,
  Suéter: BadgePlus,
} as const;

export function guardarProductos(_productos: Producto[]) {}

export const fmtUsd = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtRef = (n: number) =>
  `REF ${n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtBs = (n: number) =>
  `Bs ${n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export type DeliveryVentaRapida = {
  zona: string;
  costoUsd: number;
  recibe: { nombre: string; telefono: string; direccion: string };
};

export function mensajeWhatsapp(opts: {
  negocio: string;
  lineas: LineaCarrito[];
  tasa: number;
  /** Total de productos, sin delivery. */
  totalUsd: number;
  delivery?: DeliveryVentaRapida | null;
}) {
  const { negocio, lineas, tasa, totalUsd, delivery } = opts;
  const items = lineas
    .map((l) => {
      const sub = l.producto.precioUsd * l.cantidad;
      return [
        `• ${l.cantidad} x ${l.producto.nombre}`,
        `  ${fmtUsd(sub)} / ${fmtBs(sub * tasa)}`,
      ].join("\n");
    })
    .join("\n");

  if (delivery) {
    const total = Math.round((totalUsd + delivery.costoUsd) * 100) / 100;
    return [
      `Hola, quisiera realizar el siguiente pedido:`,
      "",
      `*${negocio}*`,
      `Fecha: ${new Date().toLocaleString("es-VE")}`,
      "",
      "*Detalle del pedido*",
      items,
      "",
      "*Delivery*",
      `Zona: ${delivery.zona}`,
      `Costo: ${fmtUsd(delivery.costoUsd)} / ${fmtBs(delivery.costoUsd * tasa)}`,
      `Recibe: ${delivery.recibe.nombre}`,
      `Teléfono: ${delivery.recibe.telefono}`,
      `Dirección: ${delivery.recibe.direccion}`,
      "",
      "*Total a pagar*",
      `Productos: ${fmtUsd(totalUsd)}`,
      `Delivery: ${fmtUsd(delivery.costoUsd)}`,
      `Total USD: *${fmtUsd(total)}*`,
      `Total Bs: *${fmtBs(total * tasa)}*`,
      "",
      `Tasa de referencia: *${fmtBs(tasa)} por 1 $*`,
      "",
    ].join("\n");
  }

  return [
    `Hola, quisiera realizar el siguiente pedido:`,
    "",
    `*${negocio}*`,
    `Fecha: ${new Date().toLocaleString("es-VE", { timeZone: "America/Caracas" })}`,
    "",
    "*Detalle del pedido*",
    items,
    "",
    "*Total a pagar*",
    `Total USD: *${fmtUsd(totalUsd)}*`,
    `Total Bs: *${fmtBs(totalUsd * tasa)}*`,
    "",
    `Tasa de referencia: *${fmtBs(tasa)} por 1 $*`,
    "",
    `*NO INCLUYE DELIVERY*`,
    "",
  ].join("\n");
}
