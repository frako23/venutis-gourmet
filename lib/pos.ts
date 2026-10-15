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

export function mensajeWhatsapp(opts: {
  negocio: string;
  lineas: LineaCarrito[];
  tasa: number;
  totalUsd: number;
}) {
  const { negocio, lineas, tasa, totalUsd } = opts;
  const items = lineas
    .map((l) => {
      const sub = l.producto.precioUsd * l.cantidad;
      return [
        `• ${l.cantidad} x ${l.producto.nombre}`,
        `  ${fmtUsd(sub)} / ${fmtBs(sub * tasa)}`,
      ].join("\n");
    })
    .join("\n");

  return [
    `Hola, quisiera realizar el siguiente pedido:`,
    "",
    `*${negocio}*`,
    `Fecha: ${new Date().toLocaleString("es-VE")}`,
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
