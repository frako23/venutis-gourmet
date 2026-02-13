"use client";
import { useCheckout } from "@/context/checkoutContext";
import { useDolar } from "@/hooks/useDolar";
import {
  addAddress,
  deleteAddress,
  getAddressesByClient,
} from "@/lib/actions/address";
import { DELIVERY_ZONES, initialState } from "@/lib/constants/constants";
import { useAppStore } from "@/store/appStore";
import { MapPin, MessageCircle, Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { ZoneSelector } from "./zoneSelector";

interface Address {
  id: number;
  tipo: string;
  urbanizacion: string;
  direccion: string;
}

export function AddressManager() {
  const [addresses, setAddresses] = useState<Address[] | null>([]);
  const { setCanContinue } = useCheckout();
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const setDeliveyPrice = useAppStore((s) => s.setDeliveryPrice);
  const client = useAppStore((s) => s.client);
  const selectedProducts = useAppStore((s) => s.selectedProducts);
  const { tasa } = useDolar();

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
    if (client?.id) {
      const data = await getAddressesByClient(client?.id);
      // Mapeamos los campos si los nombres en DB son diferentes a tu interfaz
      setAddresses(data as Address[]);
      console.log("paso por aqui");
      // Seleccionar la primera automáticamente si existe
      if (data.length > 0) setSelectedAddress(data[0].id);
    }
  }
  console.log("addresses", addresses);
  console.log("selectedAddress", selectedAddress);
  console.log("cliente", client);
  useEffect(() => {
    loadAddresses();
  }, [client?.id]);

  useEffect(() => {
    // Asumiendo que tu Server Action devuelve algo como { success: true }
    if (state?.status === "success") {
      toast.success("Dirección agregada con éxito");
      loadAddresses(); // Esta es la función que definimos antes con getAddressesByClient
      setIsAdding(false); // Cerramos el formulario
      setNewAddress({ tipo: "", urbanizacion: "", direccion: "" }); // Limpiamos campos
    }
  }, [state]);

  console.log("selectedProduct", selectedProducts);

  const handleWhatsAppCheckout = () => {
    const phone = "584123456789"; // Tu número de Venuti's

    // 1. Formateamos la lista de productos con su cantidad
    const listaProductos = selectedProducts
      .map(
        (p) =>
          `- ${p.cantidad}x ${p.nombre} ($${(p.precio * p.cantidad).toFixed(2)} / Bs${(p.precio * p.cantidad * tasa).toFixed(2)})`,
      )
      .join("\n");

    // 2. Calculamos el total general
    const totalPedido = selectedProducts.reduce(
      (acc, p) => acc + p.precio * p.cantidad,
      0,
    );

    // 3. Construimos el mensaje con saltos de línea claros
    const mensaje = `Hola Venuti's! 🍝
Soy *${client?.nombre && client?.apellido ? `${client.nombre} ${client.apellido}` : "un cliente"}*.

Mi sector no aparece en la página y deseo terminar mi pedido:
${listaProductos}

*Total Estimado: $${totalPedido.toFixed(2)} / Bs${(totalPedido * tasa).toFixed(2)}


Quedo atento para coordinar la entrega.`;

    // 4. Generamos y abrimos la URL
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

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
              onClick={() => {
                setSelectedAddress(addr.id);
                setDeliveyPrice(
                  DELIVERY_ZONES.find((z) => z.name === addr.urbanizacion)
                    ?.price!,
                );
              }}
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
                type="button"
                onClick={() => {
                  deleteAddress(initialState, addr.id);
                  toast.success("Dirección eliminada con éxito");
                  loadAddresses();
                }}
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
            <input type="hidden" name="clienteId" value={client?.id} />

            <div className=" space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest opacity-50 px-1">
                Alias (Ej: Casa)
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

            <ZoneSelector
              newAddress={newAddress}
              setNewAddress={setNewAddress}
            />
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

          <div className="mt-4 p-2 border-2 border-dashed border-white/5 rounded-2xl text-center ">
            <p className="text-xs uppercase tracking-widest font-medium ">
              Si tu sector no está en la lista, puedes terminar tu pedido por
              WhatsApp.
            </p>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="flex-1 py-2 text-[10px] font-bold border border-white/10 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              CANCELAR
            </button>

            {!newAddress.urbanizacion ? (
              /* BOTÓN WHATSAPP: Solo aparece si no hay urbanización/zona seleccionada */
              <button
                type="button"
                onClick={handleWhatsAppCheckout}
                className="flex-1 cursor-pointer py-2 text-[10px] font-bold bg-[#128C7E] text-white rounded-lg hover:bg-[#25D366] transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle size={14} />
                TERMINAR PEDIDO EN WHATSAPP
              </button>
            ) : (
              /* BOTÓN GUARDAR: Solo aparece si los datos están completos */
              <button
                type="submit"
                disabled={
                  !newAddress.tipo || !newAddress.direccion || isPending
                }
                className={`flex-1 py-2 text-[10px] font-bold bg-accent-gold text-gold rounded-lg hover:bg-white hover:text-primary transition-colors ${
                  !newAddress.tipo || !newAddress.direccion || isPending
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
              >
                {isPending ? "GUARDANDO..." : "GUARDAR DIRECCIÓN"}
              </button>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
