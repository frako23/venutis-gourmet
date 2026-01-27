"use client";
import { Plus, MapPin, Trash2 } from "lucide-react";
import { useState } from "react";

export function AddressManager() {
  const [addresses, setAddresses] = useState([
    {
      id: "1",
      alias: "Casa",
      sector: "la-castellana",
      detail: "Edif. Altamira, Apto 4B",
    },
  ]);
  const [isAdding, setIsAdding] = useState(false);

  // Estado para los campos del nuevo formulario
  const [newAddress, setNewAddress] = useState({
    alias: "",
    sector: "",
    detail: "",
  });

  const handleSave = () => {
    // Validación básica: evitar campos vacíos
    if (!newAddress.alias || !newAddress.sector || !newAddress.detail) {
      alert("Por favor, completa todos los campos de la dirección.");
      return;
    }

    const addressToSave = {
      id: Date.now().toString(), // ID único temporal
      ...newAddress,
    };

    setAddresses([...addresses, addressToSave]);

    // Limpiar y cerrar
    setNewAddress({ alias: "", sector: "", detail: "" });
    setIsAdding(false);
  };

  const handleRemove = (id: string) => {
    setAddresses(addresses.filter((addr) => addr.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm uppercase tracking-[3px] font-bold">
          Mis Direcciones
        </h3>
        {addresses.length < 3 && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 text-[10px] text-accent-gold hover:opacity-80 transition-all font-black cursor-pointer"
          >
            <Plus size={14} /> AGREGAR OTRA
          </button>
        )}
      </div>

      {/* Lista de Direcciones Guardadas */}
      <div className="grid grid-cols-1 gap-3">
        {addresses.map((addr) => (
          <div
            key={addr.id}
            className="group relative p-4 bg-white/5 border border-white/10 rounded-xl hover:border-accent-gold/50 transition-all cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-accent-gold mt-0.5" />
              <div>
                <span className="text-[10px] font-black uppercase text-accent-gold">
                  {addr.alias}
                </span>
                <p className="text-sm font-medium opacity-90">
                  {addr.sector.replace("-", " ")}
                </p>
                <p className="text-[12px] opacity-50 line-clamp-1">
                  {addr.detail}
                </p>
              </div>
            </div>
            <button
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-all cursor-pointer"
              onClick={() => handleRemove(addr.id)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Formulario para nueva dirección */}
      {isAdding && (
        <div className="p-6 bg-white/[0.02] border border-dashed border-white/20 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest opacity-50 px-1">
                Alias (Ej: Oficina)
              </label>
              <input
                type="text"
                value={newAddress.alias}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, alias: e.target.value })
                }
                className="w-full p-3 bg-white/5 border border-white/10 rounded-lg outline-none focus:border-accent-gold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest opacity-50 px-1">
                Sector / Zona
              </label>
              <select
                className="w-full p-3 bg-white/5 border border-white/10 rounded-lg outline-none focus:border-accent-gold transition-colors"
                value={newAddress.sector}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, sector: e.target.value })
                }
              >
                <option value="">Selecciona tu zona en Caracas...</option>

                {/* ZONA CHACAO - Premium Core */}
                <optgroup label="Municipio Chacao">
                  <option value="la-castellana">La Castellana</option>
                  <option value="altamira">Altamira</option>
                  <option value="los-palos-grandes">Los Palos Grandes</option>
                  <option value="campo-alegre">Campo Alegre</option>
                  <option value="el-rosal">El Rosal</option>
                  <option value="chacao">Chacao Centro</option>
                </optgroup>

                {/* ZONA BARUTA - Expansión Gourmet */}
                <optgroup label="Municipio Baruta">
                  <option value="las-mercedes">Las Mercedes</option>
                  <option value="prados-del-este">Prados del Este</option>
                  <option value="cumbres-curumo">Cumbres de Curumo</option>
                  <option value="la-trinidad">La Trinidad</option>
                  <option value="el-cafetal">El Cafetal</option>
                  <option value="santa-fe">Santa Fe</option>
                  <option value="terrazas-club-hipico">
                    Terrazas del Club Hípico
                  </option>
                </optgroup>

                {/* ZONA EL HATILLO - Residencial */}
                <optgroup label="Municipio El Hatillo">
                  <option value="la-lagunita">La Lagunita</option>
                  <option value="el-hatillo">El Hatillo Pueblo</option>
                  <option value="lomas-sol">Lomas del Sol</option>
                  <option value="los-naranjos">Los Naranjos</option>
                </optgroup>

                {/* ZONA SUCRE - Este */}
                <optgroup label="Municipio Sucre">
                  <option value="los-chorros">Los Chorros</option>
                  <option value="santa-eduvigis">Santa Eduvigis</option>
                  <option value="sebucan">Sebucán</option>
                  <option value="la-urbina">La Urbina</option>
                  <option value="el-marques">El Marqués</option>
                  <option value="boleita">Boleíta</option>
                </optgroup>

                {/* ZONA LIBERTADOR - Centro/Oeste */}
                <optgroup label="Municipio Libertador">
                  <option value="la-candelaria">La Candelaria</option>
                  <option value="san-bernardino">San Bernardino</option>
                  <option value="el-paraiso">El Paraíso</option>
                  <option value="montalban">Montalbán</option>
                  <option value="los-mancuitales">Los Chaguaramos</option>
                  <option value="santa-monica">Santa Mónica</option>
                </optgroup>
              </select>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest opacity-50 px-1">
                Dirección Detallada
              </label>
              <textarea
                className="w-full p-3 bg-white/5 border border-white/10 rounded-lg outline-none focus:border-accent-gold"
                rows={2}
                value={newAddress.detail}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, detail: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setIsAdding(false)}
              className="flex-1 py-2 text-[10px] font-bold border border-white/10 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              CANCELAR
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2 text-[10px] font-bold bg-accent-gold text-primary rounded-lg hover:bg-white transition-colors cursor-pointer"
            >
              GUARDAR DIRECCIÓN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
