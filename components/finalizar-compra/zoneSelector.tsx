import { agruparPorCosto, filtrarZonas, type ZonaDeliveryVista } from "@/lib/delivery-zone-rules";
import { ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";

type NuevaDireccion = { tipo: string; urbanizacion: string; direccion: string };

export const ZoneSelector = ({
  zonas,
  newAddress,
  setNewAddress,
}: {
  zonas: ZonaDeliveryVista[];
  newAddress: NuevaDireccion;
  setNewAddress: (value: NuevaDireccion) => void;
}) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Filtrado sin distinguir acentos ni mayúsculas, agrupado por costo
  const grupos = useMemo(
    () => agruparPorCosto(filtrarZonas(zonas, query)),
    [zonas, query],
  );

  const handleSelect = (zona: ZonaDeliveryVista) => {
    setNewAddress({ ...newAddress, urbanizacion: zona.nombre });
    setQuery(zona.nombre);
    setIsOpen(false);
  };

  return (
    <div className="space-y-1.5 relative">
      <label className="text-[10px] uppercase tracking-widest opacity-50 px-1">
        Sector / Zona
      </label>

      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40">
          <Search size={14} />
        </div>

        <input
          type="text"
          className="w-full p-3 pl-9 bg-white/5 border border-white/10 rounded-lg outline-none
                     focus:border-accent-gold transition-all text-white placeholder:text-white/20"
          placeholder="Escribe para buscar tu zona..."
          value={isOpen ? query : newAddress.urbanizacion || query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          // Cerramos con un pequeño delay para permitir el click en la opción
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          name="urbanizacion"
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none">
          <ChevronDown size={16} />
        </div>
      </div>

      {/* Menú Desplegable */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl backdrop-blur-md">
          {grupos.length > 0 ? (
            grupos.map((grupo) => (
              <div key={grupo.costoUsd}>
                <div className="px-3 py-2 text-[10px] font-bold text-accent-gold bg-white/5 uppercase tracking-tighter">
                  Zona delivery ${grupo.costoUsd.toFixed(2)}
                </div>
                {grupo.zonas.map((zona) => (
                  <div
                    key={zona.id}
                    className="px-4 py-2 text-sm text-white hover:bg-accent-gold hover:text-black cursor-pointer transition-colors"
                    onClick={() => handleSelect(zona)}
                  >
                    {zona.nombre}
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-xs opacity-40">
              No se encontraron zonas...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
