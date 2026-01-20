import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal";
import Pagination from "@/components/pagination";
import { ShippingGuideButton } from "@/components/shipping-guide-button";
import Sidebar from "@/components/sidebar";
import { ClientWithRelations } from "@/prisma/types";
import { PrismaClient } from "@prisma/client";
import { EditIcon } from "lucide-react";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const pageSize = 20;
  const q = (params.q ?? "").trim();

  const page = Math.max(1, Number(params.page ?? "1"));
  const where: any = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { lastname: { contains: q, mode: "insensitive" as const } },
            // { cedula: { contains: q, mode: "insensitive" as const } },
            // { phone: { contains: q, mode: "insensitive" as const } },
            { clientCode: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const prisma = new PrismaClient();

  const [totalCount, clients]: [number, ClientWithRelations[]] =
    await Promise.all([
      prisma.client.count(),
      prisma.client.findMany({
        where,
        include: {
          stateName: true,
          cityName: {
            include: { estado: true }, // porque en Ciudad la relación se llama "estado"
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

  const total = totalCount;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPath="/clients" />
      <main className="ml-64 p-8 print:hidden">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Clientes ({totalCount})
              </h1>
              <p className="text-sm text-gray-500">
                Gestiona tus clientes aquí.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <form action="/clients" method="GET" className="flex gap-2">
              <input
                type="text"
                name="q"
                placeholder="Coloca aqui el codigo de la clienta..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:border-transparent"
              />
              <button className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer">
                Buscar
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-auto max-h-[600px]">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Codigo de cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tipo de retiro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Agencia de envío
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Apellido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cédula
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Celular
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ciudad
                  </th> */}
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clients.map((client, key) => (
                  <tr key={key} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {client.clientCode}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {client.pickupType}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {client.mailAgency}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {client.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {client.lastname}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {client.cedula}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {client.phone}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {client.stateName?.estado}
                    </td>
                    {/* <td className="px-6 py-4 text-sm text-gray-500">
                      {client.cityName?.ciudad}
                    </td> */}
                    <td className="px-6 py-4 text-sm text-gray-500 flex gap-2">
                      {/* <form
                        action={async (formData: FormData) => {
                          "use server";
                          await deleteClient(formData);
                        }}
                      >
                        <input type="hidden" name="id" value={client.id} />

                        <button
                          type="submit"
                          aria-label="Eliminar cliente"
                          className="p-2 rounded-md text-red-600 hover:text-white hover:bg-red-600 transition-colors duration-200 cursor-pointer"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </form> */}
                      <DeleteConfirmationModal
                        clientId={client.id}
                        clientName={client.name}
                      />
                      <a
                        href={`/edit-client?q=${client.clientCode}`}
                        aria-label="Editar cliente"
                        className="inline-flex items-center justify-center p-2 rounded-md border border-transparent text-blue-600 hover:text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                      >
                        <EditIcon className="w-5 h-5" />
                      </a>

                      <ShippingGuideButton client={client} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                baseUrl="/clients"
                searchParams={{ q, pageSize: String(pageSize) }}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
