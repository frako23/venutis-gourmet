import Sidebar from "@/components/sidebar";
import { PrismaClient } from "@prisma/client";
import type { Estado, Ciudad } from "@prisma/client";
import AddClientForm from "@/components/add-client-form";

export default async function AddClientPage() {
  const prisma = new PrismaClient();

  const [estados, ciudades]: [Estado[], Ciudad[]] = await Promise.all([
    prisma.estado.findMany({
      orderBy: { estado: "asc" }, // ajusta al campo real
    }),
    prisma.ciudad.findMany({
      orderBy: { ciudad: "asc" },
      include: { estado: true }, // si quieres mostrar también el estado
    }),
  ]);
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPath="/add-client" />

      <main className="ml-64 p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Agregar Clientes
              </h1>
              <p className="text-sm text-gray-500">Agrega aquí tus clientes.</p>
            </div>
          </div>
        </div>

        <div className="">
          <div className="bg-white border border-gray-200 p-6">
            <AddClientForm estados={estados} ciudades={ciudades} />
          </div>
        </div>
      </main>
    </div>
  );
}
