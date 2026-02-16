import { prisma } from "@/lib/prisma"; // Ajusta la ruta a tu cliente de prisma
import {
  CreditCard,
  MapPin,
  MessageCircle,
  ShoppingBag,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ConfirmacionPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const id = Number(searchParams.id);
  if (!id) return notFound();

  const orden = await prisma.transaccion.findUnique({
    where: { id },
    include: {
      cliente: { include: { direcciones: true } },
      detalles: { include: { producto: true } },
      pagos: true,
    },
  });

  if (!orden) return notFound();

  // Datos del pago principal (tomamos el primero del array 'pagos')
  const infoPago = orden.pagos[0];

  // Datos de la dirección (tomamos la primera disponible)
  const infoDireccion = orden.cliente.direcciones[0];

  const whatsappNumber = "584121234567";
  const mensaje = `Hola Venuti's! Soy ${orden.cliente.nombre}. Pedido #${orden.numeroOrden}. Total: $${orden.montoTotal}.`;
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensaje)}`;

  return (
    <div className="bg-background-dark text-text-offwhite min-h-screen flex flex-col relative overflow-hidden">
      {/* ... (Fondo y Logo igual) */}

      <main className="flex-grow flex flex-col items-center justify-center p-6 z-10">
        <div className="max-w-3xl w-full bg-surface-dark/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <Link href="/">
            <Image
              src="/logo-venutis.avif"
              alt="logo Venuti's"
              width={50}
              height={50}
            />
          </Link>
          <Link className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors" href="/">
            <X />
          </Link>
          <h1 className="text-3xl  text-center mb-8">
            ¡Gracias por tu compra,{" "}
            <span className="text-accent-gold">{orden.cliente.nombre}</span>!
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Columna: Productos */}
            <div className="space-y-4">
              <h3 className="text-accent-gold text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" /> Detalle del pedido #
                {orden.numeroOrden}
              </h3>
              <div className="space-y-2">
                {orden.detalles.map((d) => (
                  <div
                    key={d.id}
                    className="flex justify-between text-sm border-b border-white/5 pb-2"
                  >
                    <span>
                      {d.producto.nombre}{" "}
                      <span className="text-accent-gold">x{d.cantidad}</span>
                    </span>
                    <span className="">
                      ${(d.precioUnitario * d.cantidad).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-accent-gold/20">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/40 uppercase">
                    Total Divisas
                  </span>
                  <span className="text-xl text-accent-gold font-bold">
                    ${orden.montoTotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-white/40 uppercase">
                    Total Bolívares
                  </span>
                  <span className="text-md text-white/80">
                    Bs. {infoPago?.montoBs?.toLocaleString("es-VE") || "0,00"}
                  </span>
                </div>
              </div>
            </div>

            {/* Columna: Logística y Pago */}
            <div className="space-y-6">
              {/* Sección de Entrega */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <h3 className="text-accent-gold text-[10px] font-bold uppercase mb-2 flex items-center gap-2">
                  <MapPin className="w-3 h-3" />{" "}
                  {orden.tipodeRetiro === "envio"
                    ? "Envío Personalizado"
                    : "Retiro en Venuti's"}
                </h3>
                {orden.tipodeRetiro === "envio" && infoDireccion ? (
                  <p className="text-xs text-white/70 leading-relaxed">
                    <span className="font-bold text-white">
                      {infoDireccion.urbanizacion}
                    </span>
                    <br />
                    {infoDireccion.direccion}
                  </p>
                ) : (
                  <p className="text-xs text-white/50 italic">
                    Retiro en oficina principal.
                  </p>
                )}
              </div>

              {/* Sección de Pago */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <h3 className="text-accent-gold text-[10px] font-bold uppercase mb-2 flex items-center gap-2">
                  <CreditCard className="w-3 h-3" /> Transacción{" "}
                  {infoPago?.metodoPago}
                </h3>
                <p className="text-xs text-white/70">
                  Ref: {infoPago?.referencia || "Pendiente"}
                </p>
                <p className="text-[10px] text-white/30 mt-1 uppercase">
                  Tasa: 1$ = {infoPago?.tasaCambio} Bs.
                </p>
              </div>
            </div>
          </div>

          <Link
            href={whatsappUrl}
            target="_blank"
            className="mt-8 flex items-center justify-center gap-3 bg-gold text-black font-bold py-4 rounded-full hover:scale-[1.02] transition-transform"
          >
            <MessageCircle className="w-5 h-5" />
            NOTIFICAR PAGO AHORA
          </Link>
        </div>
      </main>
    </div>
  );
}
