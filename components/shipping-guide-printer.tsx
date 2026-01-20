"use client";
import { useAppStore } from "@/store/appStore";
import { Printer, TrashIcon } from "lucide-react";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

export const ShippingGuidePrinter = () => {
  const selectedClients = useAppStore((s) => s.selectedClients);
  const setSelectedClients = useAppStore((s) => s.setSelectedClients);

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef, // 👈 ahora se pasa el ref directamente
    documentTitle: "Guías de envío",
  });
  return (
    <div className="flex gap-4 items-center ">
      {/* Botón imprimir */}
      <div
        onClick={handlePrint}
        className="relative bg-blue-600 text-sm text-white p-2 rounded flex gap-2 hover:bg-blue-700 print:hidden cursor-pointer w-max"
      >
        <Printer className="w-5 h-5" /> Imprimir guías
        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {selectedClients.length}
        </span>
      </div>

      {/* Botón limpiar */}
      <div
        onClick={() => setSelectedClients([])}
        className="relative items-center bg-red-600 text-sm text-white p-1 rounded flex hover:bg-red-700 justify-center cursor-pointer"
      >
        <TrashIcon className="w-5 h-5" />
      </div>

      {/* Contenido imprimible */}
      <div ref={printRef} className=" print-container w-[500px]">
        {selectedClients.map((client) => (
          <div
            key={client.id}
            className="print-card border border-black p-2 text-[10px] box-border bg-white text-black shadow-none"
          >
            <h2 className="text-sm font-bold mb-1">Guía de Envío</h2>
            <p>
              <span className="font-semibold">Cliente:</span> {client.name}{" "}
              {client.lastname}
            </p>
            <p>
              <span className="font-semibold">Cédula:</span> {client.cedula}
            </p>
            <p>
              <span className="font-semibold">Teléfono:</span> {client.phone}
            </p>
            <p>
              <span className="font-semibold">Estado:</span>{" "}
              {client.stateName?.estado ?? ""}
            </p>
            <p>
              <span className="font-semibold">Ciudad:</span>{" "}
              {client.cityName?.ciudad ?? ""}
            </p>
            <p>
              <span className="font-semibold">Dirección:</span> {client.address}
            </p>
            <p>
              <span className="font-semibold">Agencia:</span>{" "}
              {client.mailAgency}
            </p>
            <p className="">
              <span className="font-semibold">Código de cliente:</span>{" "}
              <span className="text-lg">{client.clientCode}</span>
            </p>
          </div>
        ))}

        {/* Segunda hoja */}
        <div className=" page-break mt-8">
          <h2 className="text-base font-bold mb-4 text-black">
            Tabla de Verificación
          </h2>
          <table className="w-full border-collapse border border-black text-[12px]">
            <thead>
              <tr>
                <th className="border border-black p-2 text-black">✔</th>
                <th className="border border-black p-2 text-black">CODIGO</th>
                <th className="border border-black p-2 text-black">AGENCIA</th>
                <th className="border border-black p-2 text-black">
                  NOMBRE Y APELLIDO
                </th>
                <th className="border border-black p-2 text-black">CÉDULA</th>
              </tr>
            </thead>
            <tbody>
              {selectedClients
                .slice() // copiamos el array para no mutar el store
                .sort((a, b) => a.clientCode - b.clientCode) // orden numérico ascendente
                .map((client) => (
                  <tr key={client.id}>
                    <td className="border border-black p-2 text-center text-black">
                      <input type="checkbox" />
                    </td>
                    <td className="border border-black p-2 text-black">
                      {client.clientCode}
                    </td>
                    <td className="border border-black p-2 text-black">
                      {client.mailAgency}
                    </td>
                    <td className="border border-black p-2 text-black">
                      {client.name} {client.lastname}
                    </td>
                    <td className="border border-black p-2 text-black">
                      {client.cedula}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
