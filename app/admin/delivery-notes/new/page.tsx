import Link from "next/link";
import { redirect } from "next/navigation";

import { DeliveryNoteForm } from "@/components/admin/notas-entrega/deliveryNoteForm";
import { motivoSinNota } from "@/lib/admin/delivery-note-rules";
import { prisma } from "@/lib/prisma";

// La nota de entrega siempre sale de un pedido: se llega aquí desde Ventas y pedidos (o el detalle del pedido).
export default async function NewDeliveryNotePage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = searchParams ? await searchParams : {};
  const raw = Array.isArray(params.transaccionId) ? params.transaccionId[0] : params.transaccionId;
  const id = Number(raw);
  const pedido = Number.isInteger(id) && id > 0 ? await prisma.transaccion.findUnique({
    where: { id },
    select: { id: true, numeroOrden: true, estado: true, tipodeRetiro: true, direccionEntrega: true, cliente: { select: { nombre: true, apellido: true, tipoCliente: true } }, notasEntrega: { select: { id: true }, take: 1 }, detalles: { orderBy: { id: "asc" }, select: { cantidad: true, precioUnitario: true, producto: { select: { nombre: true } } } } },
  }) : null;

  if (pedido?.notasEntrega[0]) redirect(`/admin/delivery-notes/${pedido.notasEntrega[0].id}`);
  const motivo = pedido ? motivoSinNota({ estado: pedido.estado, cliente: pedido.cliente, notasEntrega: 0 }) : "Elige un pedido desde Ventas y pedidos para generar su nota de entrega.";

  return (
    <main className="admin-page">
      <div className="admin-content space-y-6">
        <div>
          <p className="admin-eyebrow">Documentos mayoristas</p>
          <h1 className="admin-title mt-2">Nota de entrega{pedido ? ` · ${pedido.numeroOrden}` : ""}</h1>
          <p className="admin-subtitle mt-3">Se genera a partir del pedido: el número de nota es el número de orden y los productos se copian del pedido.</p>
        </div>
        {motivo || !pedido ? (
          <div className="admin-panel-flat p-8 text-center">
            <p className="font-bold text-[#18211d]">{motivo}</p>
            <Link href="/admin/transactions" className="admin-button-secondary mt-4 inline-flex">Ir a Ventas y pedidos</Link>
          </div>
        ) : (
          <DeliveryNoteForm pedido={{ id: pedido.id, numeroOrden: pedido.numeroOrden, cliente: `${pedido.cliente.nombre} ${pedido.cliente.apellido}`, direccionEntrega: pedido.tipodeRetiro === "envio" ? pedido.direccionEntrega : null, lineas: pedido.detalles.map((d) => ({ productoNombre: d.producto.nombre, cantidad: d.cantidad, precioUnitarioUsd: d.precioUnitario })) }} />
        )}
      </div>
    </main>
  );
}
