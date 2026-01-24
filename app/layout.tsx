import type { Metadata } from "next";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackClientApp } from "../stack/client";
import { Geist, Geist_Mono } from "next/font/google";
import {
  Inter,
  JetBrains_Mono,
  Noto_Serif,
  Pinyon_Script,
} from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter", // Esto crea una variable CSS
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Venuti's Gourmet | Tienda de Pastas y Productos Artesanales",
  description:
    "Tu destino para adquirir pastas frescas, salsas de autor y productos gourmet. Calidad artesanal garantizada con entrega a domicilio. ¡Vive la experiencia Venuti!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}

        <Toaster
          position="top-right"
          expand={false}
          richColors
          theme="light"
          toastOptions={{
            style: {
              borderRadius: "1.2rem",
              fontFamily: "var(--font-inter)",
            },
          }}
        />
      </body>
    </html>
  );
}
