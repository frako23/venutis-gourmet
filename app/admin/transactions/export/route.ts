import { getOrderStateLabel } from "@/lib/admin/status";
import { buildSalesWorkbook } from "@/lib/admin/sales-export";
import { buildSalesWhere } from "@/lib/admin/sales-query";
import { calcularSaldo } from "@/lib/admin/abonos";
import { requireAdmin } from "@/lib/admin/auth";
import { roundMoney } from "@/lib/admin/sales-calculations";
import { diaCaracas } from "@/lib/admin/sales-import-core";
import { buildSalesControlWorkbook, repartirDeudaPorLineas, type SalesControlLine } from "@/lib/admin/sales-export";
import { prisma } from "@/lib/prisma";

function currentCaracasDate() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export async function GET(request: Request) {
  await requireAdmin();
  const searchParams = new URL(request.url).searchParams;
  if (searchParams.get("formato") === "control") return exportControl(searchParams);
  const values = {
    desde: searchParams.get("desde") || undefined,
    hasta: searchParams.get("hasta") || undefined,
    estado: searchParams.get("estado") || undefined,
    cliente: searchParams.get("cliente") || undefined,
    orden: searchParams.get("orden") || undefined,
    saldo: searchParams.get("saldo") || undefined,
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

function validDay(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00-04:00`).getTime()) ? value : null;
}

/** Control de ventas con las columnas del Excel de la dueña: una fila por línea de pedido no cancelado. */
async function exportControl(searchParams: URLSearchParams) {
  const hoy = currentCaracasDate();
  const desde = validDay(searchParams.get("desde")) ?? `${hoy.slice(0, 8)}01`;
  const hasta = validDay(searchParams.get("hasta")) ?? hoy;
  const transactions = await prisma.transaccion.findMany({
    where: { estado: { not: "cancelado" }, fechaCompra: { gte: new Date(`${desde}T00:00:00-04:00`), lte: new Date(`${hasta}T23:59:59.999-04:00`) } },
    orderBy: [{ fechaCompra: "asc" }, { numeroOrden: "asc" }],
    include: {
      cliente: { select: { nombre: true, apellido: true } },
      detalles: {
        orderBy: { id: "asc" },
        include: { producto: { select: { nombre: true, categoria: true, equivalencias: { orderBy: { updatedAt: "desc" }, take: 1 } } } },
      },
      pagos: { select: { esAbono: true, montoUsd: true, anuladoEn: true } },
    },
  });

  const lines: SalesControlLine[] = [];
  for (const transaction of transactions) {
    const ventas = transaction.detalles.map((detail) => roundMoney(detail.cantidad * detail.precioUnitario));
    const saldo = calcularSaldo({ estado: transaction.estado, montoTotal: transaction.montoTotal, pagos: transaction.pagos });
    const { deuda, abono } = repartirDeudaPorLineas(ventas, transaction.estado, saldo);
    transaction.detalles.forEach((detail, index) => {
      const equivalencia = detail.producto.equivalencias[0];
      lines.push({
        fecha: diaCaracas(transaction.fechaCompra),
        nota: transaction.numeroOrden,
        cliente: `${transaction.cliente.nombre} ${transaction.cliente.apellido}`.trim(),
        grupo: equivalencia?.grupo ?? detail.producto.categoria,
        producto: equivalencia?.producto ?? detail.producto.nombre,
        sabor: equivalencia?.sabor ?? "",
        gramos: equivalencia?.gramos ?? null,
        cantidad: detail.cantidad,
        tipoPrecio: detail.tipoPrecio,
        precioUnitario: detail.precioUnitario,
        venta: ventas[index],
        abono: abono[index],
        deuda: deuda[index],
      });
    });
  }

  return new Response(buildSalesControlWorkbook(lines), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="control-ventas-${desde}-${hasta}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
