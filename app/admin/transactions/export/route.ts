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
      cliente: { select: { nombre: true, apellido: true, tipoCliente: true, celular: true, email: true } },
      detalles: { include: { producto: { select: { nombre: true } } } },
      pagos: { orderBy: { createdAt: "desc" }, take: 1, select: { metodoPago: true, montoUsd: true, referencia: true } },
    },
  });
  const records = transactions.map((transaction) => ({
    numeroOrden: transaction.numeroOrden,
    fechaCompra: transaction.fechaCompra,
    cliente: `${transaction.cliente.nombre} ${transaction.cliente.apellido}`,
    tipoCliente: transaction.cliente.tipoCliente,
    celular: transaction.cliente.celular,
    email: transaction.cliente.email,
    subtotalUsd: transaction.montoSubtotal || transaction.montoTotal,
    descuentoUsd: transaction.montoDescuento,
    totalUsd: transaction.montoTotal,
    tasaCambio: transaction.tasaCambio,
    totalBs: transaction.tasaCambio ? Math.round(transaction.montoTotal * transaction.tasaCambio * 100) / 100 : null,
    estado: getOrderStateLabel(transaction.estado),
    tipoRetiro: transaction.tipodeRetiro === "envio" ? "Envío" : "Recogida",
    detalles: transaction.detalles.map((detail) => ({ producto: detail.producto.nombre, cantidad: detail.cantidad })),
    pago: transaction.pagos[0] ?? null,
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
