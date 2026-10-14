import { BarChart3, ClipboardList, DollarSign, FileText, PackageSearch, Users } from "lucide-react";

import { DashboardCard } from "@/components/admin/dashboard/dashboardCard";
import { QuickActions } from "@/components/admin/dashboard/quickActions";
import { getDashboardSummary } from "@/lib/admin/dashboard";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <div className="admin-page">
      <div className="admin-content space-y-7">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="admin-eyebrow">Visión general · últimos 30 días</p>
            <h1 className="admin-title mt-2">Control de operación</h1>
            <p className="admin-subtitle mt-3 max-w-2xl">El pulso del negocio, los pedidos que necesitan seguimiento y las existencias que conviene revisar hoy.</p>
          </div>
          <div className="flex items-center gap-2 border-l-2 border-[#c8a45d] pl-3 text-xs text-[#707970]">
            <span className="size-2 rounded-full bg-[#66735f]" />
            Datos del sistema actualizados
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principales">
          <DashboardCard icon={DollarSign} label="Ventas acumuladas" value={`$${summary.ventasPeriodoUsd.toFixed(2)}`} hint={`${summary.ventasPeriodoCantidad} ventas registradas`} />
          <DashboardCard icon={ClipboardList} label="Pedidos abiertos" value={summary.pedidosAbiertos} hint="Por cobrar o en pedido" accent="blue" />
          <DashboardCard icon={PackageSearch} label="Alertas de inventario" value={summary.alertasInventario} hint="Productos con 5 unidades o menos" accent="red" />
          <DashboardCard icon={Users} label="Clientes mayoristas" value={summary.clientesMayoristas} hint={`${summary.notasEntrega} notas recientes`} accent="green" />
        </section>

        <QuickActions />

        <section className="grid gap-4 md:grid-cols-2">
          <div className="admin-panel relative overflow-hidden p-6">
            <div className="absolute -right-8 -top-10 font-serif text-[9rem] leading-none text-[#66735f]/[0.07]">Σ</div>
            <div className="relative">
              <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-[#e8eee5] text-[#66735f]"><BarChart3 size={18} /></span><h2 className="font-bold text-[#18211d]">Analítica de ventas</h2></div>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[#707970]">Compara semanas, meses y productos para tomar decisiones con el histórico real.</p>
              <Link href="/admin/analytics" className="mt-5 inline-flex items-center text-sm font-bold text-[#66735f] hover:text-[#18211d]">Abrir analíticas <span className="ml-2" aria-hidden="true">↗</span></Link>
            </div>
          </div>
          <div className="admin-panel relative overflow-hidden p-6">
            <div className="absolute -right-4 -top-6 rotate-12 font-serif text-[8rem] leading-none text-[#c8a45d]/[0.12]">N</div>
            <div className="relative">
              <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-[#f5eddc] text-[#a57c2f]"><FileText size={18} /></span><h2 className="font-bold text-[#18211d]">Documentos mayoristas</h2></div>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[#707970]">Genera notas de entrega con una presentación lista para descargar e imprimir.</p>
              <Link href="/admin/delivery-notes" className="mt-5 inline-flex items-center text-sm font-bold text-[#66735f] hover:text-[#18211d]">Gestionar notas <span className="ml-2" aria-hidden="true">↗</span></Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
