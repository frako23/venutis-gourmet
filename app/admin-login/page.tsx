import { stackServerApp } from "@/stack/server";
import { SignIn } from "@stackframe/stack";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminLogin() {
  const user = await stackServerApp.getUser();

  // Validar correo autorizado
  const allowedEmails = process.env.ALLOWED_EMAILS?.split(",");

  if (user && allowedEmails?.includes(user.primaryEmail!)) {
    redirect("/admin/inventory");
  }

  // Si está autenticado pero no autorizado
  if (user && !allowedEmails?.includes(user.primaryEmail!)) {
    redirect("/unauthorized");
  }

  return (
    <div className="bg-background-dark font-century-gothic text-white overflow-hidden h-screen flex flex-col relative">
      {/* Background Section con utilidades de Tailwind 4 */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 blur-bg bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAYLx5U8bIFkHZJFYzHoekqIhxm-sYalhCoePs9JG8kqtLIOiHchK__w-QIPRZDpV4P5NEFgUnc7zwNc5jus1K48QWgapL-ctbuc8eAQ1NaAUSiw-YI7xGHVWamLagJJXbymPGWQPGQrXZoMux1uWbtK1bFulCahnIfOkZHqvHz3VSTLPQydK4KhTzp2VugCMItXhkcyEommYzcec01sGMbXBmjXC-P_J4BUWiXCRjTwNImd_xB2PsknGoUd6z2F-VjZ6WcCdOxq9c")',
          }}
        />
        <div className="absolute inset-0 custom-gradient-overlay" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-charcoal/80 backdrop-blur-xl gold-border p-12 rounded-xl shadow-2xl flex flex-col items-center text-center">
            {/* Icono Central */}
            <div className="mb-6 p-4 bg-background-dark/50 rounded-full border border-gold/20 text-gold">
              <ShieldCheck size={40} strokeWidth={1.2} />
            </div>

            <h1 className="text-2xl font-bold mb-2 tracking-wide text-white uppercase">
              Portal Administrativo
            </h1>
            <p className="text-gold text-sm tracking-widest mb-10">
              Venuti's Gourmet
            </p>

            <div className="w-full space-y-6">
              {/* Botón Personalizado (Opcional si usas el componente SignIn) */}


              {/* Tu componente SignIn */}
              {/* <SignIn ... /> */}
              <SignIn
                // Esta es la clave para la redirección automática tras éxito
                fullPage={false}
                automaticRedirect={true}
                mockProject={{
                  config: {
                    signUpEnabled: false, // Nadie puede crearse cuenta solo
                    credentialEnabled: false,
                    passkeyEnabled: false,
                    magicLinkEnabled: false,
                    oauthProviders: [{ id: "google" }],
                  },
                }}
              />
            </div>
          </div>

          {/* Enlace de Regreso */}
          <Link
            className="mt-8 flex items-center justify-center gap-2 text-2xl uppercase tracking-widest text-gray-400 hover:text-gold transition-colors group"
            href="/"
          >
            <ArrowLeft
              size={24}
              className="group-hover:-translate-x-1 transition-transform"
            />
            Regresar
          </Link>
        </div>
      </main>
    </div>
  );
}
