import { DeliveryNoteForm } from "@/components/admin/notas-entrega/deliveryNoteForm";
import { prisma } from "@/lib/prisma";

export default async function NewDeliveryNotePage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = searchParams ? await searchParams : {};
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const [clients, products] = await Promise.all([prisma.cliente.findMany({ where: { tipoCliente: "mayorista" }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true, apellido: true } }), prisma.producto.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, precioMayorista: true } })]);
  return <main className="admin-page"><div className="admin-content space-y-6"><div><p className="admin-eyebrow">Documentos mayoristas</p><h1 className="admin-title mt-2">Nueva nota de entrega</h1><p className="admin-subtitle mt-3">Completa los datos y revisa la vista previa antes de guardar.</p></div><DeliveryNoteForm clients={clients} products={products} defaultClientId={Number(first(params.clienteId) || 0) || undefined} defaultTransactionId={Number(first(params.transaccionId) || 0) || undefined} /></div></main>;
}
