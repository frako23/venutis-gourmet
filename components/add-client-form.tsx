"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Estado, Ciudad } from "@prisma/client";
import { useActionState } from "react";
import { addClient } from "@/lib/actions/clients";

const initialState = { message: "" };

export default function AddClientForm({
  estados,
  ciudades,
}: {
  estados: Estado[];
  ciudades: Ciudad[];
}) {
  const [selectedState, setSelectedState] = useState<number | "">("");
  const [pickupType, setPickupType] = useState("Delivery");

  const isEnvio = pickupType === "Envío";

  const [state, formAction] = useActionState(addClient, initialState);

  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    if (state.message) {
      setShowAlert(true);
    }
  }, [state.message]);

  // Filtrar ciudades según el estado seleccionado
  // const filteredCities = selectedState
  //   ? ciudades.filter((c) => c.id_estado === selectedState)
  //   : [];

  return (
    <>
      {/* Overlay modal */}
      {showAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full text-center">
            <h2 className="text-lg font-bold text-red-600 mb-4">Atención</h2>
            <p className="text-gray-800 mb-6">{state.message}</p>
            <button
              onClick={() => setShowAlert(false)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
      <form action={formAction} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Nombre */}
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
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-transparent"
              placeholder="Ej. Juan"
            />
          </div>

          {/* Apellido */}
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-transparent"
              placeholder="Ej. Pérez"
            />
          </div>

          {/* Cédula */}
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-transparent"
              placeholder="Ej. V-12345678"
            />
          </div>

          {/* Teléfono */}
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
              value={pickupType}
              onChange={(e) => setPickupType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-transparent"
            >
              <option value="Delivery">Delivery</option>
              <option value="En Tienda">En Tienda</option>
              <option value="Envío">Envío</option>
            </select>
          </div>
        </div>

        {/* Agencia, Estado, Ciudad, Dirección */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
              disabled={!isEnvio}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-transparent 
    ${!isEnvio ? "bg-gray-100 cursor-not-allowed opacity-50" : ""}`}
            >
              <option value="">Selecciona una agencia</option>
              <option value="MRW">MRW</option>
              <option value="Zoom">Zoom</option>
              <option value="Domesa">Domesa</option>
              <option value="Tealca">Tealca</option>
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
              value={selectedState}
              onChange={(e) =>
                setSelectedState(e.target.value ? Number(e.target.value) : "")
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
          {/* <div>
          <label
            htmlFor="city"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Ciudad *
          </label>
          <select
            id="city"
            name="city"
            disabled={!isEnvio || !selectedState}
            className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-transparent 
            ${
              !isEnvio || !selectedState
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
        </div> */}

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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-transparent"
              placeholder="Ej. 321"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
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
              disabled={!isEnvio}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-transparent 
    ${!isEnvio ? "bg-gray-100 cursor-not-allowed opacity-50" : ""}`}
              placeholder="Ej. Av. Principal, Edif. X"
            />
          </div>
        </div>

        <div className="flex gap-5">
          <button
            type="submit"
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer"
          >
            Agregar Cliente
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 cursor-pointer"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </>
  );
}
