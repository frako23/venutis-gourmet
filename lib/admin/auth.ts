import "server-only";

import { stackServerApp } from "@/stack/server";
import { redirect } from "next/navigation";

import { esCorreoAdministrador, leerCorreosAdministradores } from "./auth-rules";

export type AdminIdentity = {
  id: string;
  email: string | null;
};


export async function requireAdmin(): Promise<AdminIdentity> {
  if (process.env.NODE_ENV === "development") {
    return { id: "development", email: "development@local" };
  }

  const user = await stackServerApp.getUser();
  if (!user) {
    redirect("/admin-login");
  }

  const email = user.primaryEmail?.trim().toLowerCase() ?? null;

  if (!esCorreoAdministrador(email, leerCorreosAdministradores(process.env.ALLOWED_EMAILS))) {
    redirect("/unauthorized");
  }

  return {
    id: user.id,
    email,
  };
}
