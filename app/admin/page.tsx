import { BarChart3, ClipboardList, DollarSign, FileText, PackageSearch, Users } from "lucide-react";

import { DashboardCard } from "@/components/admin/dashboard/dashboardCard";
import { QuickActions } from "@/components/admin/dashboard/quickActions";
import { getDashboardSummary } from "@/lib/admin/dashboard";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <div className="min-h-full bg-slate-50 p-4 dark:bg-background-dark md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <p className="text-sm font-semibold text-gold">Visión general · últimos 30 días</p>
          <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">Control de operación</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Consulta el movimiento comercial, pedidos que requieren seguimiento y alertas que necesitan atención.</p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principales">
          <DashboardCard icon={DollarSign} label="Ventas acumuladas" value={`$${summary.ventasPeriodoUsd.toFixed(2)}`} hint={`${summary.ventasPeriodoCantidad} ventas registradas`} />
          <DashboardCard icon={ClipboardList} label="Pedidos abiertos" value={summary.pedidosAbiertos} hint="Por cobrar o en pedido" accent="blue" />
          <DashboardCard icon={PackageSearch} label="Alertas de inventario" value={summary.alertasInventario} hint="Productos con 5 unidades o menos" accent="red" />
          <DashboardCard icon={Users} label="Clientes mayoristas" value={summary.clientesMayoristas} hint={`${summary.notasEntrega} notas recientes`} accent="green" />
        </section>

        <QuickActions />

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-3"><BarChart3 className="text-gold" size={20} /><h2 className="font-bold text-slate-900 dark:text-white">Analítica de ventas</h2></div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Compara semanas, meses y productos para tomar decisiones con el histórico real.</p>
            <Link href="/admin/analytics" className="mt-4 inline-block text-sm font-bold text-gold hover:underline">Abrir analíticas →</Link>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-3"><FileText className="text-gold" size={20} /><h2 className="font-bold text-slate-900 dark:text-white">Documentos mayoristas</h2></div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Genera notas de entrega con una presentación lista para descargar e imprimir.</p>
            <Link href="/admin/delivery-notes" className="mt-4 inline-block text-sm font-bold text-gold hover:underline">Gestionar notas →</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
