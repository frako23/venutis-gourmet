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
      <div className="rounded-lg border border-gold/20 bg-background-dark/50 p-4 text-sm text-gray-300">
        Preparando el acceso seguro...
      </div>
    );
  }

  if (!canUseOAuth) {
    return (
      <div
        className="rounded-lg border border-amber-400/40 bg-amber-950/30 p-4 text-left text-sm text-amber-100"
        role="alert"
      >
        <p className="font-bold">El acceso con Google necesita una conexión segura.</p>
        <p className="mt-2">
          Esta página se abrió por HTTP usando una IP de red. Abre el proyecto
          con HTTPS o usa <code>http://localhost:3000</code> en el mismo equipo.
        </p>
        <p className="mt-2 text-amber-200/80">
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
