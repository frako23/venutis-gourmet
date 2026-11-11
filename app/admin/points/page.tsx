import { Coins, Gift, TrendingUp, Users } from "lucide-react";
import Link from "next/link";

import { DashboardCard } from "@/components/admin/dashboard/dashboardCard";
import { PointsFilters } from "@/components/admin/puntos/pointsFilters";
import { PointsTable } from "@/components/admin/puntos/pointsTable";
import { requireAdmin } from "@/lib/admin/auth";
import { leerOrdenPuntos } from "@/lib/admin/points-core";
import { consultarPuntosClientes } from "@/lib/admin/points";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const primero = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor);
const numero = (valor: number) => valor.toLocaleString("es-VE");

export default async function PointsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await requireAdmin();
  const params = searchParams ? await searchParams : {};
  const q = (primero(params.q) ?? "").trim();
  const orden = leerOrdenPuntos(primero(params.orden));
  const { filas, total, indicadores } = await consultarPuntosClientes({ q, orden, ahora: new Date() });

  return (
    <main className="admin-page">
      <div className="admin-content space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="admin-eyebrow">Fidelización</p>
            <h1 className="admin-title mt-2">Puntos</h1>
            <p className="admin-subtitle mt-3">Lo que cada cliente ha ganado, canjeado y tiene disponible.</p>
          </div>
          <Link href="/admin/clients/rewards" className="admin-button-secondary">Premios</Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardCard icon={Coins} label="Puntos en circulación" value={numero(indicadores.enCirculacion)} hint="Disponibles entre todos los clientes" />
          <DashboardCard icon={Users} label="Clientes con puntos" value={indicadores.clientesConPuntos} hint="Con saldo mayor que cero" accent="green" />
          <DashboardCard icon={Gift} label="Ya pueden canjear" value={indicadores.puedenCanjear} hint="Alcanzan el premio más barato" accent="blue" />
          <DashboardCard icon={TrendingUp} label="Puntos del mes" value={`+${numero(indicadores.ganadosMes)}`} hint={`${numero(indicadores.canjeadosMes)} canjeados · mes en curso`} />
        </div>

        <PointsFilters q={q} orden={orden} />
        <PointsTable filas={filas} total={total} q={q} />
      </div>
    </main>
  );
}
