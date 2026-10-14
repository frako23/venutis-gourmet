"use client";

import { SignIn } from "@stackframe/stack";
import { useSyncExternalStore } from "react";

const subscribeToClient = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function hasOAuthCryptoSupport() {
  return (
    window.isSecureContext &&
    typeof window.crypto?.subtle?.digest === "function"
  );
}

export function AdminSignIn() {
  const isClient = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot,
  );
  const canUseOAuth = isClient && hasOAuthCryptoSupport();

  if (!isClient) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-white/60">
        Preparando el acceso seguro...
      </div>
    );
  }

  if (!canUseOAuth) {
    return (
      <div
        className="rounded-lg border border-[#c8a45d]/35 bg-[#c8a45d]/10 p-4 text-left text-sm text-[#f4e8c7]"
        role="alert"
      >
        <p className="font-bold">El acceso con Google necesita una conexión segura.</p>
        <p className="mt-2">
          Esta página se abrió por HTTP usando una IP de red. Abre el proyecto
          con HTTPS o usa <code>http://localhost:3000</code> en el mismo equipo.
        </p>
        <p className="mt-2 text-[#e7d59f]/75">
          Para desarrollo, ejecuta <code>npm.cmd run dev:secure</code> y visita
          la dirección HTTPS que muestre Next.js.
        </p>
      </div>
    );
  }

  return (
    <SignIn
      fullPage={false}
      automaticRedirect={true}
      mockProject={{
        config: {
          signUpEnabled: false,
          credentialEnabled: false,
          passkeyEnabled: false,
          magicLinkEnabled: false,
          oauthProviders: [{ id: "google" }],
        },
      }}
    />
  );
}
