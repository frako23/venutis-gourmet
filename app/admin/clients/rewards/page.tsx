import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { RewardsTable } from "@/components/admin/clientes/premios/rewardsTable";
import { requireAdmin } from "@/lib/admin/auth";
import { ORDEN_CATALOGO } from "@/lib/catalog-order";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  await requireAdmin();
  const [premios, canjes, productos] = await Promise.all([
    prisma.premio.findMany({ orderBy: [{ activo: "desc" }, { costoPuntos: "asc" }], include: { producto: { select: { nombre: true } } } }),
    prisma.fidelidad.groupBy({ by: ["premioId"], where: { tipoMovimiento: "redencion", premioId: { not: null } }, _count: { _all: true } }),
    prisma.producto.findMany({ orderBy: ORDEN_CATALOGO, select: { id: true, nombre: true } }),
  ]);
  const canjesPorPremio = new Map(canjes.map((fila) => [fila.premioId, fila._count._all]));

  return (
    <main className="admin-page">
      <div className="admin-content space-y-6">
        <div>
          <Link href="/admin/clients" className="inline-flex items-center gap-2 text-xs font-bold text-[#66735f] hover:underline"><ArrowLeft size={14} /> Clientes</Link>
          <p className="admin-eyebrow mt-4">Fidelización</p>
          <h1 className="admin-title mt-2">Premios</h1>
          <p className="admin-subtitle mt-3">Define qué pueden canjear los clientes con sus puntos y cuánto cuesta cada premio.</p>
        </div>
        <RewardsTable
          productos={productos}
          premios={premios.map((premio) => ({
            id: premio.id,
            nombre: premio.nombre,
            descripcion: premio.descripcion,
            tipo: premio.tipo,
            costoPuntos: premio.costoPuntos,
            montoDescuentoUsd: premio.montoDescuentoUsd,
            productoId: premio.productoId,
            productoNombre: premio.producto?.nombre ?? null,
            cantidad: premio.cantidad,
            activo: premio.activo,
            canjes: canjesPorPremio.get(premio.id) ?? 0,
          }))}
        />
      </div>
    </main>
  );
}
