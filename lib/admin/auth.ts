import "server-only";

import { stackServerApp } from "@/stack/server";
import { redirect } from "next/navigation";

export type AdminIdentity = {
  id: string;
  email: string | null;
};

function allowedEmails() {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin(): Promise<AdminIdentity> {
  if (process.env.NODE_ENV === "development") {
    return { id: "development", email: "development@local" };
  }

  const user = await stackServerApp.getUser();
  if (!user) {
    redirect("/admin-login");
  }

  const email = user.primaryEmail?.trim().toLowerCase() ?? null;
  const configuredEmails = allowedEmails();

  if (configuredEmails.length > 0 && (!email || !configuredEmails.includes(email))) {
    redirect("/unauthorized");
  }

  return {
    id: user.id,
    email,
  };
}
