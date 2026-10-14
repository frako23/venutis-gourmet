import { ManualSaleForm } from "@/components/admin/ventas/manualSaleForm";
import { prisma } from "@/lib/prisma";

export default async function AddTransactionPage() {
  const [clients, products] = await Promise.all([
    prisma.cliente.findMany({ orderBy: [{ nombre: "asc" }, { apellido: "asc" }], select: { id: true, nombre: true, apellido: true, tipoCliente: true } }),
    prisma.producto.findMany({ where: { inventario: { gt: 0 } }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true, precioDetal: true, precioMayorista: true, inventario: true } }),
  ]);

  return <main className="admin-page"><div className="admin-content"><div className="mb-6"><p className="admin-eyebrow">Ventas y pedidos</p><h1 className="admin-title mt-2">Registrar venta manual</h1><p className="admin-subtitle mt-3">Carga la operación, aplica descuentos y confirma el estado inicial.</p></div><ManualSaleForm clients={clients} products={products} /></div></main>;
}
