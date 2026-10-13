import { DeliveryNoteForm } from "@/components/admin/notas-entrega/deliveryNoteForm";
import { prisma } from "@/lib/prisma";

export default async function NewDeliveryNotePage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = searchParams ? await searchParams : {};
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const [clients, products] = await Promise.all([prisma.cliente.findMany({ where: { tipoCliente: "mayorista" }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true, apellido: true } }), prisma.producto.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, precioMayorista: true } })]);
  return <main className="min-h-full bg-slate-50 p-4 dark:bg-background-dark md:p-8"><div className="mx-auto max-w-7xl space-y-5"><div><p className="text-sm font-semibold text-gold">Documentos mayoristas</p><h1 className="mt-1 text-3xl font-black">Nueva nota de entrega</h1><p className="mt-2 text-sm text-slate-500">Completa los datos y revisa la vista previa antes de guardar.</p></div><DeliveryNoteForm clients={clients} products={products} defaultClientId={Number(first(params.clienteId) || 0) || undefined} defaultTransactionId={Number(first(params.transaccionId) || 0) || undefined} /></div></main>;
}
