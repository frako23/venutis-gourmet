"use client";

import { filtrarClientes } from "@/lib/client-rules";
import type { ClienteBusqueda } from "@/lib/admin/types";
import { UserPlus } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";

type Props = {
  clientes: ClienteBusqueda[];
  value: number | null;
  onChange: (id: number | null) => void;
  onCrear: (textoBuscado: string) => void;
  disabled?: boolean;
};

export function ClientSearch({ clientes, value, onChange, onCrear, disabled = false }: Props) {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaId = useId();
  const resultados = useMemo(() => filtrarClientes(clientes, texto, 20), [clientes, texto]);
  const elegido = value ? clientes.find((cliente) => cliente.id === value) ?? null : null;
  const textoLimpio = texto.trim();

  function elegir(cliente: ClienteBusqueda) {
    onChange(cliente.id);
    setTexto("");
    setAbierto(false);
  }

  function teclado(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); setAbierto(true); setActivo((actual) => Math.min(actual + 1, resultados.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActivo((actual) => Math.max(actual - 1, 0)); }
    else if (event.key === "Enter" && abierto && resultados[activo]) { event.preventDefault(); elegir(resultados[activo]); }
    else if (event.key === "Escape") setAbierto(false);
  }

  if (elegido) {
    return (
      <div className="admin-label">
        Cliente
        <div className="admin-field flex flex-wrap items-center justify-between gap-2 normal-case tracking-normal">
          <span className="font-bold text-[#18211d]">{elegido.nombre} {elegido.apellido} <span className="font-normal text-[#707970]">· {elegido.tipoCliente === "mayorista" ? "Mayorista" : "Consumidor"}</span></span>
          {!disabled && <button type="button" className="text-xs font-bold text-[#66735f] hover:text-[#18211d]" onClick={() => { onChange(null); setTimeout(() => inputRef.current?.focus(), 0); }}>Cambiar</button>}
        </div>
        {disabled && <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-[#707970]">No se puede cambiar: el pedido tiene puntos o saldo a favor de este cliente.</span>}
      </div>
    );
  }

  return (
    <div className="admin-label relative">
      Cliente
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={texto}
          onChange={(event) => { setTexto(event.target.value); setAbierto(true); setActivo(0); }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 120)}
          onKeyDown={teclado}
          placeholder="Busca por nombre o apellido"
          role="combobox"
          aria-expanded={abierto}
          aria-controls={listaId}
          aria-activedescendant={abierto && resultados[activo] ? `${listaId}-${resultados[activo].id}` : undefined}
          autoComplete="off"
          className="admin-field min-w-0 flex-1 normal-case tracking-normal"
        />
        <button type="button" className="admin-button-secondary shrink-0" onClick={() => onCrear("")}><UserPlus size={16} /><span className="hidden sm:inline"> Registrar cliente nuevo</span></button>
      </div>
      {abierto && (
        <ul id={listaId} role="listbox" className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-[#dedfd6] bg-[#fffdf8] p-1 shadow-lg">
          {resultados.map((cliente, indice) => (
            <li key={cliente.id} id={`${listaId}-${cliente.id}`} role="option" aria-selected={indice === activo} onMouseDown={(event) => { event.preventDefault(); elegir(cliente); }} className={`cursor-pointer rounded-md px-3 py-2 text-sm normal-case tracking-normal ${indice === activo ? "bg-[#e8eee5]" : ""}`}>
              <span className="font-bold text-[#18211d]">{cliente.nombre} {cliente.apellido}</span>
              <span className="ml-2 rounded-full bg-[#f5eddc] px-2 py-0.5 text-[0.65rem] font-bold text-[#8c6a2c]">{cliente.tipoCliente === "mayorista" ? "Mayorista" : "Consumidor"}</span>
              <span className="ml-2 text-xs text-[#707970]">{cliente.celular ?? cliente.rif ?? ""}</span>
            </li>
          ))}
          {resultados.length === 0 && (
            <li className="px-3 py-2 text-sm normal-case tracking-normal text-[#707970]">
              No hay clientes con «{textoLimpio}»
              {textoLimpio && <button type="button" className="mt-2 block font-bold text-[#66735f] hover:text-[#18211d]" onMouseDown={(event) => { event.preventDefault(); setAbierto(false); onCrear(textoLimpio); }}>Registrar «{textoLimpio}» como cliente nuevo</button>}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
