"use client";
import { getClientByPhone } from "@/lib/actions/clients";
import { useAppStore } from "@/store/appStore";
import { UserCircle } from "lucide-react";
import { useState } from "react";

export const LoginButton = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const client = useAppStore((s) => s.client);
  const setClient = useAppStore((s) => s.setClient);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");

  const handleLogin = async (phone: string) => {
    setLoading(true);
    try {
      const cliente = await getClientByPhone(phone);
      setClient(cliente!);
      setPhone("");
      setIsLoginOpen(false);
    } catch {
      setLoading(false);
      setPhone("");
      setIsLoginOpen(false);
    } finally {
      setLoading(false);
      setPhone("");
      setIsLoginOpen(false);
    }
  };

  console.log(client);
  return (
    <div className="relative">
      {client ? (
        <span className="px-4 py-3  text-gold ">
          {client.nombre} {client.apellido}
        </span>
      ) : (
        <button
          onClick={() => setIsLoginOpen(!isLoginOpen)}
          className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all group bg-gold text-primary shadow-lg shadow-gold/20 hover:font-bold cursor-pointer"
        >
          <UserCircle size={20} />
          <span className="hidden sm:inline">Ingresar</span>
        </button>
      )}

      {isLoginOpen && loading ? (
        <div className="flex items-center gap-2 text-gold font-century-gothic text-xs tracking-widest uppercase">
          <div className="size-1.5 bg-gold rounded-full animate-pulse" />
          Cargando...
        </div>
      ) : (
        isLoginOpen && (
          <div className="absolute right-0 mt-4 w-72 bg-zinc-900 shadow-2xl rounded-xl p-6 border border-primary/10 z-[60]">
            <button
              onClick={() => setIsLoginOpen(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-300 cursor-pointer"
            >
              X
            </button>
            <h3 className="text-lg mb-4">Bienvenido</h3>
            <input
              type="tel"
              placeholder="Tu Celular (Ej: 0412...)"
              className="w-full p-2 bg-transparent border-b border-primary/20 focus:border-gold outline-none text-sm mb-4"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button
              onClick={() => handleLogin(phone)}
              type="button"
              className="w-full bg-primary text-white py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-gold transition-colors"
            >
              Continuar
            </button>
            <p className="text-[10px] text-center mt-4 opacity-60">
              ¿No tienes cuenta?{" "}
              <span className="text-gold cursor-pointer font-bold">
                Regístrate aquí
              </span>
            </p>
          </div>
        )
      )}
    </div>
  );
};
