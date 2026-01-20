import { PrismaClient } from "@prisma/client";
import type { Estado, Ciudad } from "@prisma/client";
import AddClientPublicForm from "@/components/add-client-public-form";

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
    <div className="min-h-screen bg-[#FFE2D1]">
      <main className="p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Formulario de Envío DAGO TIENDA
              </h1>
              <p className="text-sm text-gray-500">Llena aqui tus datos.</p>
            </div>
          </div>
        </div>

        <div className="">
          <div className="bg-white border border-gray-200 p-6">
            <AddClientPublicForm estados={estados} ciudades={ciudades} />
          </div>
        </div>
      </main>
    </div>
  );
}
