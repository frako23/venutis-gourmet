import { PrismaClient } from "@prisma/client";
import { CreditCard, Mail, MapPin, Package, Phone, User } from "lucide-react";
import { notFound } from "next/navigation";

export default async function DetalleTransaccion({
  params, // Los parámetros de [id] vienen aquí
}: {
  params: Promise<{ id: string }>; // En Next 15 es una Promise
}) {
  const prisma = new PrismaClient();
  const { id: rawId } = await params; // Esperamos a que resuelva

  const id = Number(rawId);
  if (!id) return notFound();
  const transaccion = await prisma.transaccion.findUnique({
    where: { id },
    include: {
      cliente: { include: { direcciones: true } },
      detalles: { include: { producto: true } },
      pagos: true,
    },
  });
  if (!transaccion) {
    return (
      <div className="flex items-center justify-center p-20 bg-background-dark">
        <p className="text-gold font-serif italic tracking-widest animate-pulse">
          Cargando detalles de la orden Venuti...
        </p>
      </div>
    );
  }

  const { cliente, detalles, pagos } = transaccion;
  const direccion = cliente.direcciones[0];
  const pago = pagos[0];

  return (
    <div className="bg-background-dark text-text-offwhite p-1 md:p-8 min-h-screen text-white">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* HEADER: Título y Estado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-background-dark/50 p-6 rounded-2xl border border-white backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gold uppercase tracking-[0.2em] text-[10px] font-bold">
                Orden de Venta
              </span>
            </div>
            <h1 className="text-3xl font-serif">{transaccion.numeroOrden}</h1>
          </div>

          <div className="flex flex-col items-end">
            <span
              className={`px-4 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest border ${
                transaccion.estado === "pagado"
                  ? "border-green-500/50 text-green-400 bg-green-500/10"
                  : "border-amber-500/50 text-amber-400 bg-amber-500/10"
              }`}
            >
              ● {transaccion.estado}
            </span>
            <p className="text-white/40 text-xs mt-2 font-mono italic">
              Procesado el{" "}
              {new Date(transaccion.createdAt).toLocaleDateString("es-VE")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMNA IZQUIERDA: CLIENTE Y LOGÍSTICA */}
          <div className="lg:col-span-1 space-y-6">
            {/* Info Cliente */}
            <section className="bg-background-dark/30 p-6 rounded-2xl border border-white/5">
              <h3 className="text-gold text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <User size={14} /> Cliente
              </h3>
              <div className="space-y-3">
                <p className="text-lg font-medium">
                  {cliente.nombre} {cliente.apellido}
                </p>
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <Phone size={14} className="text-gold" /> {cliente.celular}
                </div>
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <Mail size={14} className="text-gold" /> {cliente.email}
                </div>
                <div className="pt-2">
                  <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-gold/80 uppercase">
                    Cliente {cliente.tipoCliente}
                  </span>
                </div>
              </div>
            </section>

            {/* Dirección de Envío */}
            <section className="bg-surface-dark/30 p-6 rounded-2xl border border-white/5">
              <h3 className="text-gold text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <MapPin size={14} />{" "}
                {transaccion.tipodeRetiro === "envio"
                  ? "Dirección de Envío"
                  : "Retiro en Tienda"}
              </h3>
              {direccion ? (
                <div className="space-y-1">
                  <p className="text-sm font-bold">{direccion.urbanizacion}</p>
                  <p className="text-xs text-white/50 leading-relaxed italic">
                    "{direccion.direccion}"
                  </p>
                </div>
              ) : (
                <p className="text-xs text-white/40 italic">
                  No se especificó dirección.
                </p>
              )}
            </section>
          </div>

          {/* COLUMNA DERECHA: PRODUCTOS Y PAGO */}
          <div className="lg:col-span-2 space-y-6">
            {/* Detalle de Productos */}
            <section className="bg-surface-dark/30 rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <h3 className="text-gold text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <Package size={14} /> Artículos del Pedido
                </h3>
              </div>
              <div className="divide-y divide-white/5">
                {detalles.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-6 flex justify-between items-center hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex gap-4">
                      <div className="h-12 w-12 rounded-lg bg-gold/10 flex items-center justify-center text-gold border border-gold/20">
                        {item.cantidad}x
                      </div>
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wide">
                          {item.producto.nombre}
                        </p>
                        <p className="text-[10px] text-white/40 uppercase tracking-tighter">
                          {item.producto.categoria}
                        </p>
                      </div>
                    </div>
                    <p className="font-mono text-sm text-gold">
                      ${(item.precioUnitario * item.cantidad).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              {/* TOTALES */}
              <div className="p-6 bg-white/[0.03] flex justify-between items-center">
                <span className="text-xs uppercase tracking-widest font-bold">
                  Total Transacción
                </span>
                <span className="text-2xl font-serif text-gold">
                  ${transaccion.montoTotal.toFixed(2)}
                </span>
              </div>
            </section>

            {/* Información del Pago */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-dark/30 p-6 rounded-2xl border border-white/5">
                <h3 className="text-gold text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <CreditCard size={14} /> Método
                </h3>
                <p className="text-sm">{pago.metodoPago}</p>
                <div className="mt-4 flex items-center gap-2">
                  <div className="text-[10px] text-white/30 uppercase italic">
                    Referencia:
                  </div>
                  <div className="text-xs font-mono text-white/80">
                    {pago.referencia}
                  </div>
                </div>
              </div>

              <div className="bg-gold/5 p-6 rounded-2xl border border-gold/20 flex flex-col justify-center">
                <p className="text-[10px] text-gold uppercase font-bold tracking-[0.2em] mb-1">
                  Confirmación de Pago
                </p>
                <p className="text-xs text-white/60">
                  {pago?.fechaPago
                    ? `Registrado: ${new Date(pago.fechaPago).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}`
                    : "Fecha de pago no registrada"}
                </p>
                <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gold w-full opacity-50"></div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
