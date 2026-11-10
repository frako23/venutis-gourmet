import { ClipboardList, DollarSign, PackageSearch, Users } from "lucide-react";
import { Suspense } from "react";

import { ChartCard, SinDatos } from "@/components/admin/dashboard/chartCard";
import { ClientTypeChart } from "@/components/admin/dashboard/clientTypeChart";
import { DashboardCard } from "@/components/admin/dashboard/dashboardCard";
import { MonthlySalesChart } from "@/components/admin/dashboard/monthlySalesChart";
import { QuickActions } from "@/components/admin/dashboard/quickActions";
import { TopProductsChart } from "@/components/admin/dashboard/topProductsChart";
import { VisitsSection, VisitsSectionFallback } from "@/components/admin/dashboard/visitsSection";
import { ventanasResumen, type VentasMes } from "@/lib/admin/dashboard-core";
import { consultarResumen } from "@/lib/admin/dashboard";
import { consultarVisitasDiarias } from "@/lib/admin/website-visits";
import { formatUsd } from "@/lib/format";

function TablaVentasMes({ meses }: { meses: VentasMes[] }) {
  return (
    <table className="admin-table min-w-full text-left text-sm">
      <caption className="sr-only">Ventas por mes</caption>
      <thead><tr><th scope="col">Mes</th><th scope="col">Monto</th><th scope="col">Ventas</th><th scope="col">Ticket promedio</th></tr></thead>
      <tbody>
        {meses.map((m) => (
          <tr key={m.mes}>
            <th scope="row" className="capitalize">{m.etiqueta}</th>
            <td className="admin-mono">{formatUsd(m.totalUsd)}</td>
            <td className="admin-mono">{m.cantidadVentas}</td>
            <td className="admin-mono">{formatUsd(m.ticketPromedioUsd)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function AdminDashboardPage() {
  const ventanas = ventanasResumen(new Date());
  // Se inicia sin esperarla: una fuente lenta solo retrasa su propia tarjeta.
  const visitas = consultarVisitasDiarias({ period: ventanas.periodo30Dias });
  const resumen = await consultarResumen(ventanas);
  const { indicadores } = resumen;
  const sinVentas = resumen.ventasPorMes.every((m) => m.cantidadVentas === 0);

  return (
    <div className="admin-page">
      <div className="admin-content space-y-7">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="admin-eyebrow">Visión general</p>
            <h1 className="admin-title mt-2">Control de operación</h1>
            <p className="admin-subtitle mt-3 max-w-2xl">El pulso del negocio, los pedidos que necesitan seguimiento y las existencias que conviene revisar hoy.</p>
          </div>
          <QuickActions />
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principales">
          <DashboardCard icon={DollarSign} label="Ventas acumuladas" value={formatUsd(indicadores.ventasUsd)} hint={`${indicadores.ventasCantidad} ventas · últimos 30 días`} />
          <DashboardCard icon={ClipboardList} label="Pedidos abiertos" value={indicadores.pedidosAbiertos} hint="Por cobrar o en pedido" accent="blue" />
          <DashboardCard icon={PackageSearch} label="Alertas de inventario" value={indicadores.alertasInventario} hint="Productos con 5 unidades o menos" accent="red" />
          <DashboardCard icon={Users} label="Clientes mayoristas" value={indicadores.clientesMayoristas} hint={`${indicadores.notasEntrega} notas recientes`} accent="green" />
        </section>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="min-w-0 xl:col-span-2">
            <ChartCard
              eyebrow="Evolución"
              titulo="Ventas por mes"
              periodo="Últimos 12 meses · montos en USD"
              enlace={{ href: `/admin/analytics/sales?mes=${resumen.mesActual}`, texto: "Ver analíticas" }}
              cifras={sinVentas ? undefined : <TablaVentasMes meses={resumen.ventasPorMes} />}
            >
              {sinVentas ? <SinDatos mensaje="Aún no hay ventas registradas en los últimos 12 meses." /> : <MonthlySalesChart meses={resumen.ventasPorMes} />}
            </ChartCard>
          </div>
          <div className="min-w-0">
            <ChartCard eyebrow="Origen del ingreso" titulo="Ventas por tipo de cliente" periodo={resumen.periodo30Dias.label}>
              <ClientTypeChart grupos={resumen.ventasPorTipoCliente} />
            </ChartCard>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="min-w-0">
            <ChartCard
              eyebrow="Lo que más sale"
              titulo="Productos más vendidos"
              periodo={`${resumen.periodo30Dias.label} · por unidades`}
              enlace={{ href: "/admin/analytics/sales", texto: "Ver todos los productos" }}
            >
              <TopProductsChart productos={resumen.topProductos} />
            </ChartCard>
          </div>
          <div className="min-w-0">
            <Suspense fallback={<VisitsSectionFallback periodo={ventanas.periodo30Dias} />}>
              <VisitsSection visitas={visitas} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
