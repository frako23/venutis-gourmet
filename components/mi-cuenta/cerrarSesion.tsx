"use client";

import { useUser } from "@stackframe/stack";
import { LogOut } from "lucide-react";

export function CerrarSesion() {
  const usuario = useUser();
  if (!usuario) return null;
  return (
    <button type="button" onClick={() => void usuario.signOut({ redirectUrl: "/mi-cuenta" })} className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/70 transition hover:bg-gold/10 hover:text-gold">
      <LogOut size={15} /> Cerrar sesión
    </button>
  );
}
