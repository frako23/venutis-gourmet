import { DELIVERY_ZONES } from "@/lib/constants/constants";
import { ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";

export const ZoneSelector = ({ newAddress, setNewAddress }: any) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Filtrado inteligente
  const filteredZones = useMemo(() => {
    return query === ""
      ? DELIVERY_ZONES
      : DELIVERY_ZONES.filter((zone) =>
          zone.name.toLowerCase().includes(query.toLowerCase()),
        );
  }, [query]);

  const handleSelect = (zone: { name: string; price: number }) => {
    setNewAddress({ ...newAddress, urbanizacion: zone.name });
    setQuery(zone.name);
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
          {filteredZones.length > 0 ? (
            // Agrupamos por precio en el filtro también
            [3, 4, 5, 6].map((price) => {
              const zonesInPrice = filteredZones.filter(
                (z) => z.price === price,
              );
              if (zonesInPrice.length === 0) return null;

              return (
                <div key={price}>
                  <div className="px-3 py-2 text-[10px] font-bold text-accent-gold bg-white/5 uppercase tracking-tighter">
                    Zona delivery ${price}
                  </div>
                  {zonesInPrice.map((zone) => (
                    <div
                      key={zone.name}
                      className="px-4 py-2 text-sm text-white hover:bg-accent-gold hover:text-black cursor-pointer transition-colors"
                      onClick={() => handleSelect(zone)}
                    >
                      {zone.name}
                    </div>
                  ))}
                </div>
              );
            })
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
