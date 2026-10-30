import { ORDEN_CATALOGO } from "@/lib/catalog-order";
import { ManualSaleForm } from "@/components/admin/ventas/manualSaleForm";
import { prisma } from "@/lib/prisma";

export default async function AddTransactionPage() {
  const [clients, products, saldosRaw, puntosRaw, premiosRaw] = await Promise.all([
    prisma.cliente.findMany({ orderBy: [{ nombre: "asc" }, { apellido: "asc" }], select: { id: true, nombre: true, apellido: true, tipoCliente: true } }),
    prisma.producto.findMany({ where: { inventario: { gt: 0 } }, orderBy: ORDEN_CATALOGO, select: { id: true, nombre: true, precioDetal: true, precioMayorista: true, inventario: true } }),
    prisma.movimientoSaldo.groupBy({ by: ["clienteId"], _sum: { montoUsd: true } }),
    prisma.fidelidad.groupBy({ by: ["clienteId"], _sum: { puntos: true } }),
    prisma.premio.findMany({ where: { activo: true }, orderBy: { costoPuntos: "asc" }, include: { producto: { select: { nombre: true } } } }),
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

  return <main className="admin-page"><div className="admin-content"><div className="mb-6"><p className="admin-eyebrow">Ventas y pedidos</p><h1 className="admin-title mt-2">Registrar venta manual</h1><p className="admin-subtitle mt-3">Carga la operación, aplica descuentos y confirma el estado inicial.</p></div><ManualSaleForm clients={clients} products={products} saldos={saldos} puntos={puntos} premios={premios} /></div></main>;
}
