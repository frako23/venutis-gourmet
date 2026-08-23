import type { ProductoVentaRapida } from "@/components/venta-rapida/puntoDeVenta";
import PuntoDeVenta from "@/components/venta-rapida/puntoDeVenta";
import { PrismaClient } from "@prisma/client";

const normalizeProductName = (name: string) =>
  name
    .replace(/&#x20;/gi, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const PRODUCT_ORDER: Record<string, number> = {
  "RAVIOLI DE CARNE": 1,
  "RAVIOLI CARNE": 1,
  "RAVIOLI RICOTTA Y ESPINACA": 2,
  "RAVIOLI RICOTTA Y AJOPORRO": 3,
  "RAVIOLI RICOTTA Y CHAMPINON": 4,
  "RAVIOLI RICOTTA Y TOCINETA": 5,
  "MEZZALUNA DE CAMARONES": 6,
  "MEZZALUNA CAMARONES": 6,
  "TORTELLONI RICOTTA Y ESPINACA": 7,
  "TORTELLONI BERENJENAS AHUMADAS": 8,
  "TORTELLINI DE CARNE": 9,
  "TORTELLINI CARNE": 9,
  "GNOCCHI DE PAPAS": 10,
  "GNOCCHI DE AUYAMA": 11,
  FUSILLI: 12,
  CAVATELLI: 13,
  "TAGLIATELLE SEMOLA": 14,
  "TAGLIATELLE DE SEMOLA": 14,
  "TAGLIATELLE SEPPIA": 15,
  "TAGLIATELLE DI SEPPIA": 15,
  "TAGLIATELLE ESPINACA": 16,
  "LAMINAS PASTICHO": 17,
  "LASANA MINI": 18,
  ALBONDIGAS: 19,
  PASTICHO: 20,
  "PARMEGGIANA BERENJENA": 21,
  "PAN DE JAMON": 22,
  NAPOLI: 23,
  BOLOGNA: 24,
  ATUN: 25,
  "CREMA CHAMPINON": 26,
  "4 QUESOS": 27,
  PESTO: 28,
  "TRUFAS CHOCOLATE": 29,
  "PANQUE LIMON": 30,
};

export default async function VentaRapida({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>; // En Next 15, searchParams es una Promise
}) {
  // await new Promise((resolve) => setTimeout(resolve, 5000));
  const prisma = new PrismaClient();
  const [products] = await Promise.all([
    prisma.producto.findMany({
      orderBy: { createdAt: "desc" },

      // AGREGAR ESTO:
      include: {
        imagenes: true, // Esto hace el "JOIN" con la tabla de imágenes
      },
    }),
  ]);

  const sortedProducts = [...products].sort((a, b) => {
    const orderA = PRODUCT_ORDER[normalizeProductName(a.nombre)] ?? 999;
    const orderB = PRODUCT_ORDER[normalizeProductName(b.nombre)] ?? 999;
    return orderA - orderB;
  });

  const availableProducts = sortedProducts.filter((p) => p.inventario > 0);

  const productos: ProductoVentaRapida[] = availableProducts.map((p) => ({
    id: String(p.id),
    nombre: p.nombre,
    precioUsd: p.precioDetal,
    categoria: p.categoria,
    imagenes: p.imagenes,
    inventario: p.inventario,
  }));

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.08),_transparent_30%),linear-gradient(to_bottom,_var(--background),_var(--background))] px-0 pb-6 pt-0">
      <div className="mx-auto w-full max-w-md">
        <PuntoDeVenta products={productos} />
      </div>
    </main>
  );
}
