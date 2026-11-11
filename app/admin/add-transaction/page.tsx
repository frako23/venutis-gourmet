import { ORDEN_CATALOGO } from "@/lib/catalog-order";
import { ManualSaleForm } from "@/components/admin/ventas/manualSaleForm";
import { cargarPedidoEditable } from "@/lib/admin/order-edit";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AddTransactionPage({ searchParams }: { searchParams?: Promise<{ editar?: string }> }) {
  const editarId = Number((searchParams ? await searchParams : {}).editar ?? 0);
  const pedido = editarId > 0 && Number.isInteger(editarId) ? await cargarPedidoEditable(prisma, editarId) : null;
  if (searchParams && (await searchParams).editar && !pedido) return notFound();
  const idsDelPedido = pedido?.lineas.map((linea) => linea.productoId) ?? [];
  const [clients, products, saldosRaw, puntosRaw, premiosRaw] = await Promise.all([
    prisma.cliente.findMany({ orderBy: [{ nombre: "asc" }, { apellido: "asc" }], select: { id: true, nombre: true, apellido: true, tipoCliente: true, nombreBusqueda: true, celular: true, rif: true } }),
    prisma.producto.findMany({ where: { OR: [{ inventario: { gt: 0 } }, { id: { in: idsDelPedido } }] }, orderBy: ORDEN_CATALOGO, select: { id: true, nombre: true, precioDetal: true, precioMayorista: true, inventario: true } }),
    prisma.movimientoSaldo.groupBy({ by: ["clienteId"], _sum: { montoUsd: true } }),
    prisma.fidelidad.groupBy({ by: ["clienteId"], _sum: { puntos: true } }),
    prisma.premio.findMany({ where: { activo: true, tipo: { not: "delivery" } }, orderBy: { costoPuntos: "asc" }, include: { producto: { select: { nombre: true } } } }),
  ]);
  const puntos: Record<number, number> = {};
  for (const fila of puntosRaw) if ((fila._sum.puntos ?? 0) > 0) puntos[fila.clienteId] = fila._sum.puntos ?? 0;
  const premios = premiosRaw.map((premio) => ({
    id: premio.id,
    nombre: premio.nombre,
    tipo: premio.tipo,
    costoPuntos: premio.costoPuntos,
    montoDescuentoUsd: premio.montoDescuentoUsd,
    detalle: premio.tipo === "producto" ? `${premio.cantidad} × ${premio.producto?.nombre ?? "producto"}` : null,
  }));
  const saldos: Record<number, number> = {};
  for (const fila of saldosRaw) {
    const saldo = Math.round((fila._sum.montoUsd ?? 0) * 100) / 100;
    if (saldo > 0) saldos[fila.clienteId] = saldo;
  }

  return <main className="admin-page"><div className="admin-content"><div className="mb-6">{pedido && <Link href={`/admin/transactions/${pedido.id}`} className="text-xs font-bold text-[#66735f] hover:text-[#18211d]">← Volver al pedido</Link>}<p className="admin-eyebrow mt-2">Ventas y pedidos</p><h1 className="admin-title mt-2">{pedido ? `Editar pedido ${pedido.numeroOrden}` : "Registrar venta manual"}</h1><p className="admin-subtitle mt-3">{pedido ? "Corrige los datos del pedido. Se actualiza el mismo pedido y el inventario se ajusta por la diferencia." : "Carga la operación, aplica descuentos y confirma el estado inicial."}</p></div><ManualSaleForm clients={clients} products={products} saldos={saldos} puntos={puntos} premios={premios} pedido={pedido ?? undefined} /></div></main>;
}
