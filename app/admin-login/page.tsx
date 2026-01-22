import { stackServerApp } from "@/stack/server";
import { SignIn } from "@stackframe/stack";
import { redirect } from "next/navigation";
import { Diamond, ShieldCheck, ArrowLeft } from "lucide-react";

export default async function AdminLogin() {
  // const user = await stackServerApp.getUser();

  // // Validar correo autorizado
  // const allowedEmails = process.env.ALLOWED_EMAILS?.split(",");

  // if (user && allowedEmails?.includes(user.primaryEmail!)) {
  //   redirect("/clients");
  // }

  // // Si está autenticado pero no autorizado
  // if (user && !allowedEmails?.includes(user.primaryEmail!)) {
  //   redirect("/unauthorized");
  // }

  return (
    <div className="bg-background-dark font-display text-white overflow-hidden h-screen flex flex-col relative">
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

      {/* Header */}
      <header className="relative z-10 w-full px-6 lg:px-20 py-8 flex justify-center items-center">
        <a href="/" className="flex items-center gap-3">
          <div className="size-8 text-gold">
            <svg
              fill="none"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                clipRule="evenodd"
                d="M24 0.757355L47.2426 24L24 47.2426L0.757355 24L24 0.757355ZM21 35.7574V12.2426L9.24264 24L21 35.7574Z"
                fill="currentColor"
                fillRule="evenodd"
              ></path>
            </svg>
          </div>
          <h1 className="text-white text-xl font-bold tracking-widest uppercase">
            Venuti's
          </h1>
        </a>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-charcoal/80 backdrop-blur-xl gold-border p-12 rounded-xl shadow-2xl flex flex-col items-center text-center">
            {/* Icono Central */}
            <div className="mb-6 p-4 bg-background-dark/50 rounded-full border border-gold/20 text-gold">
              <ShieldCheck size={40} strokeWidth={1.2} />
            </div>

            <h1 className="text-2xl font-bold mb-2 tracking-wide text-white uppercase">
              Admin Portal
            </h1>
            <p className="text-gold text-sm tracking-widest italic mb-10">
              Venuti's Gourmet
            </p>

            <div className="w-full space-y-6">
              {/* Botón Personalizado (Opcional si usas el componente SignIn) */}
              <a
                href="/admin/inventory"
                className="w-full flex items-center justify-center gap-3 bg-transparent border border-gold/60 py-3.5 rounded-lg font-bold tracking-widest uppercase text-white hover:bg-gold hover:text-charcoal transition-all duration-300 group"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </a>

              {/* Tu componente SignIn */}
              {/* <SignIn ... /> */}
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
              {/* Divisor de Seguridad */}
              <div className="flex items-center gap-4 py-2">
                <div className="flex-1 h-px bg-gold/20"></div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-gray-500">
                  Security Encrypted
                </span>
                <div className="flex-1 h-px bg-gold/20"></div>
              </div>

              <p className="text-[10px] text-gray-400 leading-relaxed max-w-[240px] mx-auto italic">
                Access is restricted to authorized administrative personnel
                only.
              </p>
            </div>
          </div>

          {/* Enlace de Regreso */}
          <a
            className="mt-8 flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-gray-400 hover:text-gold transition-colors group"
            href="/"
          >
            <ArrowLeft
              size={14}
              className="group-hover:-translate-x-1 transition-transform"
            />
            Back to Storefront
          </a>
        </div>
      </main>
    </div>
  );
}
