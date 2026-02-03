"use client";
import { useCheckout } from "@/context/checkout-context";
import { addAddress, getAddressesByClient } from "@/lib/actions/address";
import { initialState } from "@/lib/constants/constants";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

interface Address {
  id: number;
  tipo: string;
  urbanizacion: string;
  direccion: string;
}

export function AddressManager() {
  const [addresses, setAddresses] = useState<Address[] | null>([]);
  const { setCanContinue, clientId } = useCheckout();
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Estado para los campos del nuevo formulario
  const [newAddress, setNewAddress] = useState({
    tipo: "",
    urbanizacion: "",
    direccion: "",
  });

  // El botón de "Continuar" solo se habilita si hay al menos una dirección
  useEffect(() => {
    const hasAddresses = Array.isArray(addresses) && addresses.length > 0;
    setCanContinue(hasAddresses);
  }, [addresses, setCanContinue]);

  const [state, formAction, isPending] = useActionState(
    addAddress,
    initialState,
  );

  async function loadAddresses() {
    if (clientId) {
      const data = await getAddressesByClient(clientId);
      // Mapeamos los campos si los nombres en DB son diferentes a tu interfaz
      setAddresses(data as Address[]);

      // Seleccionar la primera automáticamente si existe
      if (data.length > 0) setSelectedAddress(data[0].id);
    }
  }
  useEffect(() => {
    loadAddresses();
  }, [clientId]);

  useEffect(() => {
    // Asumiendo que tu Server Action devuelve algo como { success: true }
    if (state?.status === "success") {
      toast.success("Dirección agregada con éxito");
      loadAddresses(); // Esta es la función que definimos antes con getAddressesByClient
      setIsAdding(false); // Cerramos el formulario
      setNewAddress({ tipo: "", urbanizacion: "", direccion: "" }); // Limpiamos campos
    }
  }, [state]);

  console.log(selectedAddress);
  return (
    <form action={formAction} className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm uppercase tracking-[3px] font-bold">
          Mis Direcciones
        </h3>
        {addresses && !isAdding && (
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
        {addresses &&
          addresses.map((addr) => (
            <div
              key={addr.id}
              className={`group relative p-4 bg-white/5 border  rounded-xl hover:border-accent-gold/50 transition-all cursor-pointer ${selectedAddress === addr.id ? "border-accent-gold" : "border-white/10"}`}
              onClick={() => setSelectedAddress(addr.id)}
            >
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-accent-gold mt-0.5" />
                <div>
                  <span className="text-[10px] font-black uppercase text-accent-gold">
                    {addr.tipo}
                  </span>
                  <p className="text-sm font-medium opacity-90">
                    {addr.urbanizacion.replace("-", " ")}
                  </p>
                  <p className="text-[12px] opacity-50 line-clamp-1">
                    {addr.direccion}
                  </p>
                </div>
              </div>
              <button
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-all cursor-pointer"
                // onClick={() => handleRemove(addr.id)}
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
            <input type="hidden" name="clienteId" value={clientId} />

            <div className=" space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest opacity-50 px-1">
                Alias (Ej: className)
              </label>
              <input
                name="tipo"
                type="text"
                value={newAddress.tipo}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, tipo: e.target.value })
                }
                className="w-full p-3 bg-white/5 border border-white/10 rounded-lg outline-none focus:border-accent-gold"
              />
            </div>

            <div className=" space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest opacity-50 px-1">
                Sector / Zona
              </label>
              <select
                className="w-full p-3 bg-white/5 border border-white/10 rounded-lg outline-none 
                 focus:border-accent-gold transition-all text-white appearance-none 
                 cursor-pointer hover:bg-white/[0.08]"
                value={newAddress.urbanizacion}
                name="urbanizacion"
                onChange={(e) =>
                  setNewAddress({ ...newAddress, urbanizacion: e.target.value })
                }
              >
                <option value="" className="bg-[#121212] text-white/40">
                  Selecciona tu zona en Caracas...
                </option>

                {/* ZONA CHACAO - Premium Core */}
                <optgroup
                  className="bg-[#1a1a1a] text-accent-gold font-bold italic"
                  label="Municipio Chacao"
                >
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="la-castellana"
                  >
                    La Castellana
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="altamira"
                  >
                    Altamira
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="los-palos-grandes"
                  >
                    Los Palos Grandes
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="campo-alegre"
                  >
                    Campo Alegre
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="el-rosal"
                  >
                    El Rosal
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="chacao"
                  >
                    Chacao Centro
                  </option>
                </optgroup>

                {/* ZONA BARUTA - Expansión Gourmet */}
                <optgroup
                  className="bg-[#1a1a1a] text-accent-gold font-bold italic"
                  label="Municipio Baruta"
                >
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="las-mercedes"
                  >
                    Las Mercedes
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="prados-del-este"
                  >
                    Prados del Este
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="cumbres-curumo"
                  >
                    Cumbres de Curumo
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="la-trinidad"
                  >
                    La Trinidad
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="el-cafetal"
                  >
                    El Cafetal
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="santa-fe"
                  >
                    Santa Fe
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="terrazas-club-hipico"
                  >
                    Terrazas del Club Hípico
                  </option>
                </optgroup>

                {/* ZONA EL HATILLO - Residencial */}
                <optgroup
                  className="bg-[#1a1a1a] text-accent-gold font-bold italic"
                  label="Municipio El Hatillo"
                >
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="la-lagunita"
                  >
                    La Lagunita
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="el-hatillo"
                  >
                    El Hatillo Pueblo
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="lomas-sol"
                  >
                    Lomas del Sol
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="los-naranjos"
                  >
                    Los Naranjos
                  </option>
                </optgroup>

                {/* ZONA SUCRE - Este */}
                <optgroup
                  className="bg-[#1a1a1a] text-accent-gold font-bold italic"
                  label="Municipio Sucre"
                >
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="los-chorros"
                  >
                    Los Chorros
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="santa-eduvigis"
                  >
                    Santa Eduvigis
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="sebucan"
                  >
                    Sebucán
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="la-urbina"
                  >
                    La Urbina
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="el-marques"
                  >
                    El Marqués
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="boleita"
                  >
                    Boleíta
                  </option>
                </optgroup>

                {/* ZONA LIBERTADOR - Centro/Oeste */}
                <optgroup
                  className="bg-[#1a1a1a] text-accent-gold font-bold italic"
                  label="Municipio Libertador"
                >
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="la-candelaria"
                  >
                    La Candelaria
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="san-bernardino"
                  >
                    San Bernardino
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="el-paraiso"
                  >
                    El Paraíso
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="montalban"
                  >
                    Montalbán
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="los-mancuitales"
                  >
                    Los Chaguaramos
                  </option>
                  <option
                    className="bg-[#121212] text-white font-normal not-italic"
                    value="santa-monica"
                  >
                    Santa Mónica
                  </option>
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
                value={newAddress.direccion}
                name="direccion"
                onChange={(e) =>
                  setNewAddress({ ...newAddress, direccion: e.target.value })
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
              type="submit"
              disabled={
                !newAddress.tipo ||
                !newAddress.urbanizacion ||
                !newAddress.direccion ||
                isPending
              }
              className={`flex-1 py-2 text-[10px] font-bold bg-accent-gold text-gold rounded-lg hover:bg-white hover:text-primary transition-colors  ${
                !newAddress.tipo ||
                !newAddress.urbanizacion ||
                !newAddress.direccion ||
                isPending
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
            >
              {isPending ? "GUARDANDO..." : "AGREGA DIRECCIÓN"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
