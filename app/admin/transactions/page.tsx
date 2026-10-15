import { SalesFilters } from "@/components/admin/ventas/salesFilters";
import { SalesTable } from "@/components/admin/ventas/salesTable";
import { buildSalesWhere } from "@/lib/admin/sales-query";
import { getOrderStateLabel } from "@/lib/admin/status";
import type { PaginatedRows, SalesRow } from "@/lib/admin/types";
import { prisma } from "@/lib/prisma";

type SearchParams = Record<string, string | string[] | undefined>;
const PAGE_SIZE = 20;
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function TransactionsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const page = Math.max(1, Number(first(params.page) || 1) || 1);
  const estado = first(params.estado);
  const cliente = first(params.cliente)?.trim();
  const orden = first(params.orden)?.trim();
  const desde = first(params.desde);
  const hasta = first(params.hasta);
  const where = buildSalesWhere({ desde, hasta, estado, cliente, orden });
  const [total, transactions, clients, products] = await Promise.all([
    prisma.transaccion.count({ where }),
    prisma.transaccion.findMany({ where, orderBy: { fechaCompra: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { cliente: true, detalles: { include: { producto: { select: { nombre: true } } } }, pagos: { orderBy: { createdAt: "desc" }, select: { metodoPago: true, referencia: true, montoBs: true, tasaCambio: true } } } }),
    prisma.cliente.findMany({ orderBy: [{ apellido: "asc" }, { nombre: "asc" }], select: { id: true, nombre: true, apellido: true, tipoCliente: true } }),
    prisma.producto.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, precioDetal: true, precioMayorista: true, inventario: true } }),
  ]);
  const rows: SalesRow[] = transactions.map((transaction) => ({
    ...(() => {
      const tasaCambio = transaction.tasaCambio ?? transaction.pagos.find((payment) => payment.tasaCambio !== null)?.tasaCambio ?? null;
      return {
        tasaCambio,
        totalBs: tasaCambio ? Math.round(transaction.montoTotal * tasaCambio * 100) / 100 : null,
      };
    })(),
    id: transaction.id,
    numeroOrden: transaction.numeroOrden,
    fechaCompra: transaction.fechaCompra,
    clienteId: transaction.clienteId,
    cliente: `${transaction.cliente.nombre} ${transaction.cliente.apellido}`,
    productos: transaction.detalles.map((detail) => ({ nombre: detail.producto.nombre, cantidad: detail.cantidad })),
    pagos: transaction.pagos.map((payment) => ({ metodoPago: payment.metodoPago, referencia: payment.referencia })),
    montoBsPagado: Math.round(transaction.pagos.reduce((sum, payment) => sum + (payment.montoBs ?? 0), 0) * 100) / 100,
    estado: transaction.estado,
    subtotalUsd: transaction.montoSubtotal || transaction.montoTotal,
    descuentoUsd: transaction.montoDescuento,
    totalUsd: transaction.montoTotal,
    tipoDescuento: transaction.tipoDescuento,
    valorDescuento: transaction.valorDescuento,
    tipodeRetiro: transaction.tipodeRetiro,
    montoDeliveryUsd: transaction.montoDelivery,
    zonaEntrega: transaction.zonaEntrega,
    aliasEntrega: transaction.aliasEntrega,
    direccionEntrega: transaction.direccionEntrega,
  }));
  const result: PaginatedRows<SalesRow> = { rows, page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };

  const paginationQuery = new URLSearchParams(Object.entries({ desde, hasta, estado, cliente, orden }).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString();
  return <main className="admin-page"><div className="admin-content space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="admin-eyebrow">Registro operativo</p><h1 className="admin-title mt-2">Ventas y pedidos</h1><p className="admin-subtitle mt-3">Consulta, filtra y da seguimiento a cada operación.</p></div><div className="admin-panel-flat px-4 py-3 text-sm"><span className="text-[#707970]">Estado visible</span><strong className="ml-2 text-[#18211d]">{estado ? getOrderStateLabel(estado as SalesRow["estado"]) : "Todos"}</strong></div></div><SalesFilters values={{ desde, hasta, estado, cliente, orden }} /><SalesTable result={result} paginationQuery={paginationQuery} clients={clients} products={products} /></div></main>;
}
