"use client";

import { Search, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

type FilterType = "todos" | "consumidor" | "mayorista";

export function ClientsFilters({ q = "", tipo = "todos" }: { q?: string; tipo?: FilterType }) {
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const pendingRef = useRef(false);

  useEffect(() => {
    function onDirty(event: Event) {
      const dirty = (event as CustomEvent<{ dirty: boolean }>).detail?.dirty ?? false;
      pendingRef.current = dirty;
      setHasPendingChanges(dirty);
    }
    window.addEventListener("venoutis:clients-dirty", onDirty);
    return () => window.removeEventListener("venoutis:clients-dirty", onDirty);
  }, []);

  function confirmNavigation(event: FormEvent<HTMLFormElement>) {
    if (pendingRef.current && !window.confirm("Hay cambios de clientes sin guardar. ¿Quieres cambiar los filtros y descartarlos?")) {
      event.preventDefault();
      return;
    }
    pendingRef.current = false;
    setHasPendingChanges(false);
  }

  return (
    <form action="/admin/clients" method="get" onSubmit={confirmNavigation} className="admin-panel flex flex-col gap-3 p-4 md:flex-row md:items-end md:p-5">
      <label className="admin-label min-w-0 flex-1">
        Buscar por nombre o RIF
        <span className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8f988f]" size={17} aria-hidden="true" />
          <input name="q" defaultValue={q} className="admin-field pl-10" placeholder="Ej. María, Central o J-12345678-9" autoComplete="off" />
        </span>
      </label>
      <label className="admin-label w-full md:w-52">
        Tipo de cliente
        <select name="tipo" defaultValue={tipo} className="admin-field">
          <option value="todos">Todos</option>
          <option value="consumidor">Consumidor</option>
          <option value="mayorista">Mayorista</option>
        </select>
      </label>
      <input type="hidden" name="page" value="1" />
      <div className="flex gap-2">
        <button type="submit" className="admin-button-primary admin-button-brass"><Search size={16} aria-hidden="true" /> Filtrar</button>
        <a href="/admin/clients" onClick={(event) => { if (pendingRef.current && !window.confirm("Hay cambios de clientes sin guardar. ¿Quieres limpiar los filtros y descartarlos?")) event.preventDefault(); }} className={`admin-button-secondary ${hasPendingChanges ? "border-[#c8a45d]" : ""}`}><X size={16} aria-hidden="true" /> Limpiar</a>
      </div>
    </form>
  );
}
