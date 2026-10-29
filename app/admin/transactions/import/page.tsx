import { SalesImport } from "@/components/admin/ventas/salesImport";
import { prisma } from "@/lib/prisma";

export default async function ImportSalesPage() {
  const clientes = await prisma.cliente.findMany({ orderBy: [{ apellido: "asc" }, { nombre: "asc" }], select: { id: true, nombre: true, apellido: true, tipoCliente: true } });
  return (
    <main className="admin-page">
      <div className="admin-content space-y-6">
        <div>
          <p className="admin-eyebrow">Registro operativo</p>
          <h1 className="admin-title mt-2">Cargar ventas desde Excel</h1>
          <p className="admin-subtitle mt-3">Sube el control de ventas, revisa la vista previa y confirma. La carga registra ventas ya realizadas: no descuenta inventario.</p>
        </div>
        <SalesImport clientes={clientes} />
      </div>
    </main>
  );
}
