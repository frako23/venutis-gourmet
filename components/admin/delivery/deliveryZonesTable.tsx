"use client";

import { actualizarZonaDelivery, crearZonaDelivery, type ResultadoZona } from "@/lib/actions/delivery-zones";
import {
  ordenarZonas,
  validarCostoZona,
  validarNombreZona,
  type ZonaDeliveryPanel,
} from "@/lib/delivery-zone-rules";
import { Plus, Power, Save, X } from "lucide-react";
import { useRef, useState, useTransition, type KeyboardEvent } from "react";
import { toast } from "sonner";

type Campo = "nombre" | "costoUsd";

const celda = (id: number, campo: Campo) => `${id}:${campo}`;

export function DeliveryZonesTable({ zonas: iniciales }: { zonas: ZonaDeliveryPanel[] }) {
  const [zonas, setZonas] = useState(iniciales);
  const [borradores, setBorradores] = useState<Record<string, string>>({});
  const [errores, setErrores] = useState<Record<string, boolean>>({});
  const [guardando, setGuardando] = useState<number | null>(null);
  const [nueva, setNueva] = useState<{ nombre: string; costo: string } | null>(null);
  const [errorNueva, setErrorNueva] = useState<Campo | null>(null);
  const [pendiente, startTransition] = useTransition();
  // Evita guardar dos veces cuando Enter confirma y el campo pierde el foco justo después.
  const confirmando = useRef(false);

  const activas = zonas.filter((zona) => zona.activa).length;

  function marcarError(clave: string, hay: boolean) {
    setErrores((actual) => ({ ...actual, [clave]: hay }));
  }

  function limpiarBorrador(clave: string) {
    setBorradores((actual) => {
      const resto = { ...actual };
      delete resto[clave];
      return resto;
    });
    marcarError(clave, false);
  }

  function aplicar(resultado: ResultadoZona) {
    if (!resultado.success) return;
    const guardada = resultado.zona;
    setZonas((actual) => ordenarZonas([...actual.filter((zona) => zona.id !== guardada.id), guardada]));
  }

  function guardarCelda(zona: ZonaDeliveryPanel, campo: Campo) {
    const clave = celda(zona.id, campo);
    const texto = borradores[clave];
    if (texto === undefined) return;

    const valorGuardado = campo === "nombre" ? zona.nombre : String(zona.costoUsd);
    if (texto === valorGuardado) return limpiarBorrador(clave);

    const validacion = campo === "nombre" ? validarNombreZona(texto) : validarCostoZona(Number(texto));
    if (texto.trim() === "" || !validacion.ok) {
      marcarError(clave, true);
      toast.error(
        validacion.ok ? "Completa este campo." : validacion.message,
      );
      return;
    }

    const cambios = campo === "nombre" ? { nombre: texto } : { costoUsd: Number(texto) };
    setGuardando(zona.id);
    startTransition(async () => {
      const resultado = await actualizarZonaDelivery(zona.id, cambios);
      setGuardando(null);
      if (resultado.success) {
        toast.success(resultado.message);
        limpiarBorrador(clave);
        aplicar(resultado);
      } else {
        marcarError(clave, true);
        toast.error(resultado.message);
      }
    });
  }

  function alternarActiva(zona: ZonaDeliveryPanel) {
    setGuardando(zona.id);
    startTransition(async () => {
      const resultado = await actualizarZonaDelivery(zona.id, { activa: !zona.activa });
      setGuardando(null);
      if (resultado.success) {
        toast.success(resultado.message);
        aplicar(resultado);
      } else {
        toast.error(resultado.message);
      }
    });
  }

  function teclaCelda(evento: KeyboardEvent<HTMLInputElement>, zona: ZonaDeliveryPanel, campo: Campo) {
    if (evento.key === "Enter") {
      evento.preventDefault();
      confirmando.current = true;
      guardarCelda(zona, campo);
      evento.currentTarget.blur();
    } else if (evento.key === "Escape") {
      evento.preventDefault();
      confirmando.current = true;
      limpiarBorrador(celda(zona.id, campo));
      evento.currentTarget.blur();
    }
  }

  function alSalir(zona: ZonaDeliveryPanel, campo: Campo) {
    if (confirmando.current) {
      confirmando.current = false;
      return;
    }
    guardarCelda(zona, campo);
  }

  function crear() {
    if (!nueva) return;
    const nombre = validarNombreZona(nueva.nombre);
    if (!nombre.ok) {
      setErrorNueva("nombre");
      return void toast.error(nombre.message);
    }
    const costo = validarCostoZona(Number(nueva.costo));
    if (nueva.costo.trim() === "" || !costo.ok) {
      setErrorNueva("costoUsd");
      return void toast.error(costo.ok ? "Escribe el costo en dólares." : costo.message);
    }
    startTransition(async () => {
      const resultado = await crearZonaDelivery({ nombre: nueva.nombre, costoUsd: Number(nueva.costo) });
      if (resultado.success) {
        toast.success(resultado.message);
        aplicar(resultado);
        setNueva(null);
        setErrorNueva(null);
      } else {
        setErrorNueva(resultado.campo ?? "nombre");
        toast.error(resultado.message);
      }
    });
  }

  function teclaNueva(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Enter") {
      evento.preventDefault();
      crear();
    } else if (evento.key === "Escape") {
      evento.preventDefault();
      setNueva(null);
      setErrorNueva(null);
    }
  }

  const clasesCampo = (error: boolean) =>
    `admin-sheet-input ${error ? "border-[#b85f49] ring-1 ring-[#b85f49]" : ""}`;

  return (
    <section className="admin-panel overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ebe9e0] bg-[#fffaf0] p-4 md:p-5">
        <div>
          <p className="admin-eyebrow">Tarifas de envío</p>
          <h2 className="mt-1 text-lg font-bold text-[#18211d]">Zonas de delivery</h2>
          <p className="mt-1 text-xs font-semibold text-[#707970]">
            {zonas.length} zonas · {activas} activas
          </p>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#707970]">
            Los cambios se guardan con Enter o al salir de la celda. Escape deshace.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNueva({ nombre: "", costo: "" })}
          disabled={nueva !== null}
          className="admin-button-primary"
        >
          <Plus size={16} /> Agregar zona
        </button>
      </div>

      <div
        aria-label="Tabla de zonas de delivery"
        className="admin-horizontal-scroll w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain"
        role="region"
        tabIndex={0}
      >
        <table className="admin-table admin-sheet w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr>
              <th>Zona</th>
              <th>Costo (USD)</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {nueva && (
              <tr className="bg-[#fffaf0]">
                <td>
                  <input
                    autoFocus
                    aria-label="Nombre de la zona nueva"
                    aria-invalid={errorNueva === "nombre"}
                    placeholder="Nombre de la zona"
                    maxLength={200}
                    value={nueva.nombre}
                    onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
                    onKeyDown={teclaNueva}
                    className={`${clasesCampo(errorNueva === "nombre")} w-full`}
                  />
                </td>
                <td>
                  <input
                    aria-label="Costo de la zona nueva en dólares"
                    aria-invalid={errorNueva === "costoUsd"}
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={nueva.costo}
                    onChange={(e) => setNueva({ ...nueva, costo: e.target.value })}
                    onKeyDown={teclaNueva}
                    className={`${clasesCampo(errorNueva === "costoUsd")} w-28 admin-mono`}
                  />
                </td>
                <td className="px-2 text-xs font-bold text-[#8c6a2c]">Nueva</td>
                <td>
                  <div className="flex gap-2 px-2">
                    <button type="button" onClick={crear} disabled={pendiente} className="admin-button-primary admin-button-brass">
                      <Save size={14} /> Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNueva(null);
                        setErrorNueva(null);
                      }}
                      className="admin-button-secondary"
                    >
                      <X size={14} /> Descartar
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {zonas.map((zona) => {
              const claveNombre = celda(zona.id, "nombre");
              const claveCosto = celda(zona.id, "costoUsd");
              const ocupada = guardando === zona.id;
              return (
                <tr key={zona.id} className={zona.activa ? "" : "opacity-60"}>
                  <td>
                    <input
                      aria-label={`Nombre de ${zona.nombre}`}
                      aria-invalid={errores[claveNombre] ? true : undefined}
                      maxLength={200}
                      disabled={ocupada}
                      value={borradores[claveNombre] ?? zona.nombre}
                      onChange={(e) => setBorradores({ ...borradores, [claveNombre]: e.target.value })}
                      onKeyDown={(e) => teclaCelda(e, zona, "nombre")}
                      onBlur={() => alSalir(zona, "nombre")}
                      className={`${clasesCampo(Boolean(errores[claveNombre]))} w-full`}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`Costo en dólares de ${zona.nombre}`}
                      aria-invalid={errores[claveCosto] ? true : undefined}
                      type="number"
                      min="0.01"
                      step="0.01"
                      disabled={ocupada}
                      value={borradores[claveCosto] ?? String(zona.costoUsd)}
                      onChange={(e) => setBorradores({ ...borradores, [claveCosto]: e.target.value })}
                      onKeyDown={(e) => teclaCelda(e, zona, "costoUsd")}
                      onBlur={() => alSalir(zona, "costoUsd")}
                      className={`${clasesCampo(Boolean(errores[claveCosto]))} w-28 admin-mono`}
                    />
                  </td>
                  <td className="px-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                        zona.activa ? "bg-[#e8eee5] text-[#55704d]" : "bg-[#f1ece4] text-[#8f988f]"
                      }`}
                    >
                      {zona.activa ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td>
                    <div className="px-2">
                      <button
                        type="button"
                        disabled={ocupada}
                        onClick={() => alternarActiva(zona)}
                        className="admin-button-secondary"
                      >
                        <Power size={14} /> {zona.activa ? "Desactivar" : "Reactivar"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {zonas.length === 0 && !nueva && (
              <tr>
                <td colSpan={4} className="p-10 text-center text-sm text-[#707970]">
                  No hay zonas de delivery. Agrega la primera con «Agregar zona».
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
