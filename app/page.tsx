import { stackServerApp } from "@/stack/server";
import { SignIn } from "@stackframe/stack";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await stackServerApp.getUser();

  // Validar correo autorizado
  const allowedEmails = process.env.ALLOWED_EMAILS?.split(",");

  if (user && allowedEmails?.includes(user.primaryEmail!)) {
    redirect("/clients");
  }

  // Si está autenticado pero no autorizado
  if (user && !allowedEmails?.includes(user.primaryEmail!)) {
    redirect("/unauthorized");
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Gestion de clientes tienda DAGO
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Bienvenido al login de Tienda DAGO
          </p>
          <div className="flex gap-4 justify-center">
            <SignIn
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
          </div>
        </div>
      </div>
    </div>
  );
}
