"use client";
import { useState } from "react";
import { UserCircle } from "lucide-react";

export const LoginButton = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setIsLoginOpen(!isLoginOpen)}
        className="flex items-center gap-2 text-sm font-bold uppercase tracking-tighter hover:text-gold transition-colors cursor-pointer"
      >
        <UserCircle size={20} />
        <span className="hidden sm:inline">Ingresar</span>
      </button>

      {isLoginOpen && (
        <div className="absolute right-0 mt-4 w-72 bg-zinc-900 shadow-2xl rounded-xl p-6 border border-primary/10 z-[60]">
          <button
            onClick={() => setIsLoginOpen(false)}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-300 cursor-pointer"
          >
            X
          </button>
          <h3 className="text-lg font-serif italic mb-4">Bienvenido</h3>
          <input
            type="tel"
            placeholder="Tu Celular (Ej: 0412...)"
            className="w-full p-2 bg-transparent border-b border-primary/20 focus:border-gold outline-none text-sm mb-4"
          />
          <button className="w-full bg-primary text-white py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-gold transition-colors">
            Continuar
          </button>
          <p className="text-[10px] text-center mt-4 opacity-60">
            ¿No tienes cuenta?{" "}
            <span className="text-gold cursor-pointer font-bold">
              Regístrate aquí
            </span>
          </p>
        </div>
      )}
    </div>
  );
};
