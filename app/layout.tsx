import { WhatsAppButton } from "@/components/global/whatssappButton";
import { stackServerApp } from "@/stack/server";
import { StackProvider, StackTheme } from "@stackframe/stack";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";

const reklameScript = localFont({
  src: "./fonts/ReklameScript-Regular_DEMO.otf",
  variable: "--font-reklame",
});

const goodBrush = localFont({
  src: "./fonts/GoodBrush.ttf",
  variable: "--font-good-brush",
});

const dkCoalBrushed = localFont({
  src: "./fonts/DKCoalBrush.otf",
  variable: "--font-dk-coal-brush",
});

const centuryGothic = localFont({
  src: "./fonts/CenturyGothic.otf",
  variable: "--font-century-gothic",
});

const cascadiaCode = localFont({
  src: "./fonts/cascadia-code-latin-ext-400-normal.ttf",
  variable: "--font-cascadia-code",
});

export const metadata: Metadata = {
  title: "Venuti's Gourmet | Tienda de Pastas y Productos Artesanales",
  icons: {
    icon: [
      {
        url: "/icon.avif",
        type: "image/avif", // Es vital declarar el MIME type
      },
      {
        url: "/icon.png", // Respaldo para navegadores que no lean AVIF
        type: "image/png",
      },
    ],
  },
  description:
    "Tu destino para adquirir pastas frescas, salsas de autor y productos gourmet. Calidad artesanal garantizada con entrega a domicilio. ¡Vive la experiencia Venuti!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      // Inyectamos las variables en el HTML para que Tailwind 4 las reconozca
      className={`
        ${reklameScript.variable} 
        ${goodBrush.variable} 
        ${dkCoalBrushed.variable} 
        ${centuryGothic.variable}
        ${cascadiaCode.variable}
      `}
    >
      <body
        // 1. Quitamos las variables del body (ya están en el html)
        // 2. Aplicamos la fuente base (Century Gothic) para que todo el texto sea legible por defecto
        className="font-century-gothic antialiased bg-background-dark text-cream"
      >
        <StackProvider app={stackServerApp}>
          <StackTheme>
            {children}

            <WhatsAppButton />
            <Toaster
              position="top-right"
              expand={false}
              richColors
              theme="dark" // Cambiado a dark para combinar con Venuti's
              toastOptions={{
                style: {
                  borderRadius: "1.2rem",
                  // Usamos una variable que ya existe en tu @theme
                  fontFamily: "var(--font-century-gothic)",
                },
              }}
            />
          </StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
