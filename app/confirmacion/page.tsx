import { WHATSAPP_PHONE_NUMBER } from "@/lib/constants/constants";
import { getOrderStateLabel } from "@/lib/admin/status";
import { calcularPuntosGanados, participaEnFidelidad } from "@/lib/fidelidad";
import { prisma } from "@/lib/prisma";
import { CreditCard, MapPin, MessageCircleMore, Package, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ConfirmacionPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const id = Number((await searchParams).id);
  if (!Number.isInteger(id) || id <= 0) return notFound();

  const orden = await prisma.transaccion.findUnique({
    where: { id },
    include: { cliente: true, detalles: { include: { producto: true } }, pagos: { orderBy: { createdAt: "desc" } }, fidelidades: { where: { tipoMovimiento: { in: ["acumulacion", "redencion"] } } } },
  });
  if (!orden) return notFound();

  // El pago declarado es el que no es un abono; el saldo a favor aplicado se muestra aparte.
  const infoPago = orden.pagos.find((pago) => !pago.esAbono) ?? null;
  const saldoAplicadoUsd = orden.pagos.filter((pago) => pago.esAbono && pago.metodoPago === "SaldoAFavor" && !pago.anuladoEn).reduce((suma, pago) => suma + (pago.montoUsd ?? 0), 0);
  const premiosCanjeados = orden.fidelidades.filter((m) => m.tipoMovimiento === "redencion").map((m) => m.descripcion ?? "Premio");
  const hayBeneficios = saldoAplicadoUsd > 0 || premiosCanjeados.length > 0;
  const lineasBeneficios = [saldoAplicadoUsd > 0 ? `- Saldo a favor: $${saldoAplicadoUsd.toFixed(2)}` : null, premiosCanjeados.length > 0 ? `- Premios canjeados: ${premiosCanjeados.join(", ")}` : null].filter(Boolean).join("\n");
  const participa = participaEnFidelidad({ tipoCliente: orden.cliente.tipoCliente, importada: orden.importada });
  const puntosPorGanar = calcularPuntosGanados({ montoSubtotal: orden.montoSubtotal, montoDescuento: orden.montoDescuento, montoDescuentoPuntos: orden.montoDescuentoPuntos });
  const mensajePuntos = !participa || orden.estado === "cancelado"
    ? null
    : orden.estado === "pagado"
      ? (orden.fidelidades[0] ? `Ganaste ${orden.fidelidades[0].puntos} puntos con este pedido.` : null)
      : puntosPorGanar > 0 ? `Ganarás ${puntosPorGanar} puntos cuando confirmemos tu pago.` : null;
  const nombreCompleto = `${orden.cliente.nombre} ${orden.cliente.apellido}`;
  const direccionTexto = orden.tipodeRetiro === "envio"
    ? `${orden.aliasEntrega ?? "Dirección"}: ${orden.zonaEntrega ?? "Sin zona"}, ${orden.direccionEntrega ?? "Sin detalle"}`
    : "Retiro en tienda";
  const detallesPedido = orden.detalles.map((detail) => `- ${detail.cantidad}x ${detail.producto.nombre}`).join("\n");
  const mensaje = `*ID de Orden:* ${orden.numeroOrden}\n\n*CLIENTE:* ${nombreCompleto}\n*TELÉFONO:* ${orden.cliente.celular}\n*ENTREGA:* ${direccionTexto}\n\n*PEDIDO:*\n${detallesPedido}${hayBeneficios ? `\n\n*BENEFICIOS:*\n${lineasBeneficios}` : ""}\n\n*PAGO DECLARADO:*\n- Método: ${infoPago?.metodoPago ?? "No especificado"}\n- Referencia: ${infoPago?.referencia ?? "No aplica / pendiente"}\n- Total: $${orden.montoTotal.toFixed(2)} / Bs. ${(infoPago?.montoBs ?? 0).toFixed(2)}`;
  const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${encodeURIComponent(mensaje)}`;

  return (
    <div className="bg-background-dark text-text-offwhite min-h-screen flex flex-col">
      <main className="flex-grow flex flex-col items-center justify-center p-6">
        <div className="max-w-3xl w-full bg-surface-dark/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <Link href="/"><Image src="/logo-venutis.avif" alt="logo Venuti's" width={50} height={50} /></Link>
          <Link className="float-right text-white/60 hover:text-white" href="/"><X /></Link>
          <div className="text-center mb-8">
            <p className="text-accent-gold text-xs uppercase tracking-[0.3em]">Pedido recibido</p>
            <h1 className="text-3xl mt-2">{orden.numeroOrden}</h1>
            <p className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-widest">{getOrderStateLabel(orden.estado)}</p>
            <p className="text-sm text-white/70 mt-4">Conservamos tu pedido y validaremos el pago declarado según corresponda.</p>
            {mensajePuntos && <p className="text-sm text-accent-gold mt-2">{mensajePuntos}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="space-y-4">
              <h2 className="text-gold text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Package className="w-4 h-4" /> Productos</h2>
              {orden.detalles.map((detail) => <div key={detail.id} className="flex justify-between text-sm border-b border-white/5 pb-2"><span>{detail.producto.nombre} <span className="text-accent-gold">x{detail.cantidad}</span></span><span>${(detail.precioUnitario * detail.cantidad).toFixed(2)}</span></div>)}
              <div className="pt-3 border-t border-accent-gold/20 space-y-1 text-sm"><div className="flex justify-between"><span className="text-white/50">Subtotal</span><span>${orden.montoSubtotal.toFixed(2)}</span></div><div className="flex justify-between"><span className="text-white/50">Delivery</span><span>${orden.montoDelivery.toFixed(2)}</span></div><div className="flex justify-between text-lg pt-2"><span>Total</span><strong className="text-accent-gold">${orden.montoTotal.toFixed(2)}</strong></div></div>
            </section>

            <section className="space-y-5">
              <div className="bg-white/5 p-4 rounded-xl border border-white/10"><h2 className="text-accent-gold text-[10px] font-bold uppercase mb-2 flex items-center gap-2"><MapPin className="w-3 h-3" /> Entrega</h2><p className="text-xs text-white/70 leading-relaxed">{direccionTexto}</p><p className="text-xs text-white/50 mt-2">Cliente: {nombreCompleto}<br />Teléfono: {orden.cliente.celular}</p></div>
              {hayBeneficios && <div className="bg-white/5 p-4 rounded-xl border border-white/10"><h2 className="text-accent-gold text-[10px] font-bold uppercase mb-2">Beneficios aplicados</h2>{saldoAplicadoUsd > 0 && <p className="text-sm">Saldo a favor: ${saldoAplicadoUsd.toFixed(2)}</p>}{premiosCanjeados.length > 0 && <p className="text-sm">Premios canjeados: {premiosCanjeados.join(", ")}</p>}</div>}
              <div className="bg-white/5 p-4 rounded-xl border border-white/10"><h2 className="text-accent-gold text-[10px] font-bold uppercase mb-2 flex items-center gap-2"><CreditCard className="w-3 h-3" /> Pago declarado</h2><p className="text-xs text-white/70">Método: {infoPago?.metodoPago ?? "Pendiente"}</p><p className="text-xs text-white/70">USD: ${infoPago?.montoUsd?.toFixed(2) ?? "0.00"} · Bs. {infoPago?.montoBs?.toFixed(2) ?? "0.00"}</p><p className="text-xs text-white/50 mt-1">Tasa: Bs. {infoPago?.tasaCambio?.toFixed(2) ?? orden.tasaCambio?.toFixed(2) ?? "—"}</p><p className="text-xs text-white/50 mt-1">Referencia: {infoPago?.referencia ?? "No aplica / pendiente"}</p></div>
            </section>
          </div>

          <Link href={whatsappUrl} target="_blank" className="mt-8 flex items-center justify-center gap-3 bg-gold font-bold py-4 rounded-full hover:scale-[1.02] transition-transform"><MessageCircleMore className="w-5 h-5" /> NOTIFICAR PEDIDO AHORA</Link>
        </div>
      </main>
    </div>
  );
}
