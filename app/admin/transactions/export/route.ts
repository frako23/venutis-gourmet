import { getOrderStateLabel } from "@/lib/admin/status";
import { buildSalesWorkbook } from "@/lib/admin/sales-export";
import { buildSalesWhere } from "@/lib/admin/sales-query";
import { requireAdmin } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

function currentCaracasDate() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export async function GET(request: Request) {
  await requireAdmin();
  const searchParams = new URL(request.url).searchParams;
  const values = {
    desde: searchParams.get("desde") || undefined,
    hasta: searchParams.get("hasta") || undefined,
    estado: searchParams.get("estado") || undefined,
    cliente: searchParams.get("cliente") || undefined,
    orden: searchParams.get("orden") || undefined,
  };
  const transactions = await prisma.transaccion.findMany({
    where: buildSalesWhere(values),
    orderBy: { fechaCompra: "desc" },
    include: {
      cliente: { select: { nombre: true, apellido: true } },
      detalles: { include: { producto: { select: { nombre: true } } } },
      pagos: { orderBy: { createdAt: "desc" }, select: { metodoPago: true, montoBs: true, tasaCambio: true, referencia: true } },
    },
  });
  const records = transactions.map((transaction) => ({
    numeroOrden: transaction.numeroOrden,
    fechaCompra: transaction.fechaCompra,
    cliente: `${transaction.cliente.nombre} ${transaction.cliente.apellido}`,
    productos: transaction.detalles.map((detail) => ({ nombre: detail.producto.nombre, cantidad: detail.cantidad })),
    pagos: transaction.pagos.map((payment) => ({ metodoPago: payment.metodoPago, referencia: payment.referencia })),
    subtotalUsd: transaction.montoSubtotal || transaction.montoTotal,
    descuentoUsd: transaction.montoDescuento,
    totalUsd: transaction.montoTotal,
    tasaCambio: transaction.tasaCambio ?? transaction.pagos.find((payment) => payment.tasaCambio !== null)?.tasaCambio ?? null,
    montoBsPagado: Math.round(transaction.pagos.reduce((sum, payment) => sum + (payment.montoBs ?? 0), 0) * 100) / 100,
    estado: getOrderStateLabel(transaction.estado),
  }));
  const workbook = buildSalesWorkbook(records);
  const filename = `ventas-pedidos-${currentCaracasDate()}.xlsx`;
  return new Response(workbook, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
