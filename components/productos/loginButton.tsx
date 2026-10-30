"use client";
import { useUser } from "@stackframe/stack";
import { UserCircle } from "lucide-react";
import Link from "next/link";

/** Acceso a "Mi cuenta": muestra el nombre de la sesión de Stack, o "Ingresar" si no hay sesión. */
export const LoginButton = () => {
  const usuario = useUser();
  const nombre = usuario ? (usuario.displayName ?? usuario.primaryEmail?.split("@")[0] ?? "Mi cuenta") : null;

  return nombre ? (
    <Link
      href="/mi-cuenta"
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gold transition-colors hover:bg-gold/10"
      aria-label="Ir a Mi cuenta"
    >
      <UserCircle size={20} />
      <span className="hidden max-w-32 truncate sm:inline">{nombre}</span>
    </Link>
  ) : (
    <Link
      href="/mi-cuenta"
      className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all group bg-gold text-primary shadow-lg shadow-gold/20 hover:font-bold cursor-pointer"
    >
      <UserCircle size={20} />
      <span className="hidden sm:inline">Ingresar</span>
    </Link>
  );
};
