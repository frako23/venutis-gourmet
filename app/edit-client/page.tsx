import Sidebar from "@/components/sidebar";
import { PrismaClient } from "@prisma/client";
import { Search } from "lucide-react";
import { EditClientForm } from "@/components/edit-client-form";
import { editClient } from "@/lib/actions/clients";
import { ClientWithRelations } from "@/prisma/types";
import type { Estado, Ciudad } from "@prisma/client";

export default async function EditClientPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  // const where: any = {
  //   ...(q
  //     ? {
  //         OR: [
  //           { name: { contains: q, mode: "insensitive" as const } },
  //           { lastname: { contains: q, mode: "insensitive" as const } },
  //           { cedula: { contains: q, mode: "insensitive" as const } },
  //           { phone: { contains: q, mode: "insensitive" as const } },
  //           { clientCode: { contains: q, mode: "insensitive" as const } },
  //         ],
  //       }
  //     : {}),
  // };
  const prisma = new PrismaClient();
  const client: ClientWithRelations | null = await prisma.client.findUnique({
    where: {
      clientCode: q,
    },
    include: {
      stateName: true,
      cityName: {
        include: { estado: true }, // porque en Ciudad la relación se llama "estado"
      },
    },
  });
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
      <Sidebar currentPath="/edit-client" />

      <main className="ml-64 p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Editar Clientes
              </h1>
              <p className="text-sm text-gray-500">Edita aquí tus clientes.</p>
            </div>
          </div>
        </div>

        <div className="mb-5 bg-white border border-gray-200 p-6">
          <form action="/edit-client" method="GET" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* <div>
                <label
                  htmlFor="cedula"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Cédula
                </label>
                <input
                  type="text"
                  name="q"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Ej. V-12345678"
                />
              </div> */}
              <div>
                <label
                  htmlFor="clientCode"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Código de clienta
                </label>
                <input
                  type="text"
                  id="clientCode"
                  name="q"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Coloca aqui el codigo de la clienta..."
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors duration-200 cursor-pointer"
                >
                  <Search className="w-5 h-5 inline-block mr-2" /> Buscar
                  Clienta
                </button>
              </div>
            </div>
          </form>
        </div>
        <EditClientForm
          client={{
            name: client?.name,
            lastname: client?.lastname,
            cedula: client?.cedula,
            mailAgency: client?.mailAgency,
            clientCode: client?.clientCode,
            pickupType: client?.pickupType,
            phone: client?.phone,
            state: client?.state,
            city: client?.city,
            address: client?.address,
            stateName: client?.stateName?.estado,
            cityName: client?.cityName?.ciudad,
          }}
          clientId={client?.id}
          serverAction={editClient}
          estados={estados}
          ciudades={ciudades}
        />
      </main>
    </div>
  );
}
