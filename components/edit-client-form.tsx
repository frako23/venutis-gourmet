"use client";
import type { Estado, Ciudad } from "@prisma/client";
import { useEffect, useState } from "react";

interface SelectedClient {
  name: string | undefined;
  lastname: string | undefined;
  cedula: string | undefined;
  phone: string | undefined;
  mailAgency: string | undefined;
  state: number | undefined;
  pickupType: string | undefined;
  city: number | undefined;
  address: string | undefined;
  clientCode: string | undefined;
  stateName?: Estado;
  cityName?: Ciudad;
}

interface EditClientFormProps {
  client: SelectedClient;
  serverAction?: (formData: FormData, clientId: number) => Promise<void>;
  clientId?: number;
  estados: Estado[];
  ciudades: Ciudad[];
}

export const EditClientForm = ({
  client,
  serverAction,
  clientId,
  estados,
  ciudades,
}: EditClientFormProps) => {
  const [selectedClient, setSelectedClient] = useState<SelectedClient>({
    name: "",
    lastname: "",
    cedula: "",
    phone: "",
    mailAgency: "",
    pickupType: "",
    state: 0,
    city: 0,
    address: "",
    clientCode: "",
  });
  useEffect(() => {
    setSelectedClient({
      name: client.name ?? "",
      lastname: client.lastname ?? "",
      cedula: client.cedula ?? "",
      phone: client.phone ?? "",
      mailAgency: client.mailAgency ?? "",
      pickupType: client.pickupType ?? "",
      state: client.state ?? 0,
      city: client.city ?? 0,
      address: client.address ?? "",
      clientCode: client.clientCode ?? "",
    });
  }, [client]);

  const handleSubmit = async (formData: FormData) => {
    if (serverAction && clientId) {
      await serverAction(formData, clientId);
    }
  };

  const isEnvio = selectedClient.pickupType === "Envío";

  // Filtrar ciudades según el estado seleccionado
  const filteredCities = selectedClient.state
    ? ciudades.filter((c) => c.id_estado === selectedClient.state)
    : [];
  return (
    <div className="">
      <div className="bg-white border border-gray-200 p-6">
        <form action={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nombre *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={selectedClient?.name}
                onChange={(e) =>
                  setSelectedClient({ ...selectedClient, name: e.target.value })
                }
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-transparent"
                placeholder="Ej. Juan"
              />
            </div>

            <div>
              <label
                htmlFor="lastname"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Apellido *
              </label>
              <input
                type="text"
                id="lastname"
                name="lastname"
                required
                value={selectedClient?.lastname}
                onChange={(e) =>
                  setSelectedClient({
                    ...selectedClient,
                    lastname: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-transparent"
                placeholder="Ej. Pérez"
              />
            </div>
            <div>
              <label
                htmlFor="cedula"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Cédula *
              </label>
              <input
                type="text"
                id="cedula"
                name="cedula"
                required
                value={selectedClient?.cedula}
                onChange={(e) =>
                  setSelectedClient({
                    ...selectedClient,
                    cedula: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-transparent"
                placeholder="Ej. V-12345678"
              />
            </div>
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Celular *
              </label>
              <input
                type="text"
                id="phone"
                name="phone"
                required
                value={selectedClient?.phone}
                onChange={(e) =>
                  setSelectedClient({
                    ...selectedClient,
                    phone: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-transparent"
                placeholder="Ej. 0414-1234567"
              />
            </div>

            {/* Tipo de retiro */}
            <div>
              <label
                htmlFor="pickupType"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Tipo de retiro *
              </label>
              <select
                id="pickupType"
                name="pickupType"
                required
                value={selectedClient?.pickupType}
                onChange={(e) =>
                  setSelectedClient({
                    ...selectedClient,
                    pickupType: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-transparent"
              >
                <option value="Delivery">Delivery</option>
                <option value="En Tienda">En Tienda</option>
                <option value="Envío">Envío</option>
              </select>
            </div>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-4
               gap-6"
          >
            <div>
              <label
                htmlFor="mailAgency"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Agencia de correo *
              </label>
              <select
                id="mailAgency"
                name="mailAgency"
                required
                value={selectedClient?.mailAgency}
                onChange={(e) =>
                  setSelectedClient({
                    ...selectedClient,
                    mailAgency: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-transparent"
              >
                <option value="">Selecciona una agencia</option>
                <option value="MRW">MRW</option>
                <option value="Zoom">Zoom</option>
                <option value="Domesa">Domesa</option>
                <option value="Tealca">Tealca</option>
                <option value="No Definido">No Definido</option>
              </select>
            </div>

            {/* Estado */}
            <div>
              <label
                htmlFor="state"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Estado *
              </label>
              <select
                id="state"
                name="state"
                value={selectedClient?.state}
                onChange={(e) =>
                  setSelectedClient({
                    ...selectedClient,
                    state: Number(e.target.value),
                  })
                }
                disabled={!isEnvio}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-transparent 
            ${!isEnvio ? "bg-gray-100 cursor-not-allowed opacity-50" : ""}`}
              >
                <option value="">Seleccione un estado</option>
                {estados.map((estado) => (
                  <option key={estado.id_estado} value={estado.id_estado}>
                    {estado.estado}
                  </option>
                ))}
              </select>
            </div>

            {/* Ciudad */}
            <div>
              <label
                htmlFor="city"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Ciudad *
              </label>
              <select
                id="city"
                name="city"
                disabled={!isEnvio || !selectedClient.state}
                value={selectedClient?.city}
                onChange={(e) =>
                  setSelectedClient({
                    ...selectedClient,
                    city: Number(e.target.value),
                  })
                }
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-transparent 
            ${
              !isEnvio || !selectedClient.state
                ? "bg-gray-100 cursor-not-allowed opacity-50"
                : ""
            }`}
              >
                <option value="">Seleccione una ciudad</option>
                {filteredCities.map((ciudad) => (
                  <option key={ciudad.id_ciudad} value={ciudad.id_ciudad}>
                    {ciudad.ciudad}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="clientCode"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Código de cliente *
              </label>
              <input
                type="text"
                id="clientCode"
                name="clientCode"
                required
                value={selectedClient?.clientCode}
                onChange={(e) =>
                  setSelectedClient({
                    ...selectedClient,
                    clientCode: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-transparent"
                placeholder="Ej. 321"
              />
            </div>
          </div>

          <div className="grid grid-cols-1  gap-6">
            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Dirección *
              </label>
              <input
                type="text"
                id="address"
                name="address"
                required
                value={selectedClient?.address}
                onChange={(e) =>
                  setSelectedClient({
                    ...selectedClient,
                    address: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-transparent"
                placeholder="Ej. Av. Principal, Edif. X"
              />
            </div>
          </div>

          <div className="flex gap-5">
            <button
              type="submit"
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer"
            >
              Editar Cliente
            </button>
            <button
              type="button"
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 cursor-pointer"
              onClick={() =>
                setSelectedClient({
                  name: "",
                  lastname: "",
                  cedula: "",
                  phone: "",
                  mailAgency: "",
                  pickupType: "",
                  state: 0,
                  city: 0,
                  address: "",
                  clientCode: "",
                })
              }
            >
              Limpiar formulario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
