import PuntoDeVenta from "@/components/venta-rapida/puntoDeVenta";
import type { ProductoVentaRapida } from "@/components/venta-rapida/puntoDeVenta";
import { PrismaClient } from "@prisma/client";

export default async function VentaRapida({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>; // En Next 15, searchParams es una Promise
}) {
  // await new Promise((resolve) => setTimeout(resolve, 5000));
  const prisma = new PrismaClient();
  const params = await searchParams;
  const categoriaSeleccionada = params.categoria || "TODOS";
  const [products] = await Promise.all([
    prisma.producto.findMany({
      orderBy: { createdAt: "desc" },

      // AGREGAR ESTO:
      include: {
        imagenes: true, // Esto hace el "JOIN" con la tabla de imágenes
      },
    }),
  ]);

  const productos: ProductoVentaRapida[] = products.map((p) => ({
    id: String(p.id),
    nombre: p.nombre,
    precioUsd: p.precioDetal,
    categoria: p.categoria,
    imagenes: p.imagenes,
  }));

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.08),_transparent_30%),linear-gradient(to_bottom,_var(--background),_var(--background))] px-0 pb-6 pt-0">
      <div className="mx-auto w-full max-w-md">
        <PuntoDeVenta products={productos} />
      </div>
    </main>
  );
}
