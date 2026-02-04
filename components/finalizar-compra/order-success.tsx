import { CartItem } from "@/store/appStore";
import { MetodoPago, TipoRetiro } from "@prisma/client";
import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  MapPin,
  Package,
} from "lucide-react";

export interface OrderSuccessProps {
  orderId: number;
  message?: string;
  resumen: {
    montoTotal: number;
    montoBs: number;
    items: CartItem[];
    metodoPago: MetodoPago;
    tipoRetiro: TipoRetiro;
    puntosGanados: number; 
  };
}

export const OrderSuccess = ({ orderId, resumen }: OrderSuccessProps) => {
  return (
    <div className="max-w-2xl mx-auto py-10 px-4 animate-in fade-in zoom-in duration-500">
      <div className="bg-surface-dark border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header con Gradiente */}
        <div className="bg-gradient-to-b from-accent-gold/20 to-transparent p-10 text-center border-b border-white/5">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-accent-gold rounded-full mb-6 shadow-[0_0_30px_rgba(212,175,55,0.3)]">
            <CheckCircle2 className="text-black w-10 h-10" />
          </div>
          <h2 className="text-3xl font-light tracking-tighter text-white mb-2">
            ¡PEDIDO RECIBIDO!
          </h2>
          <p className="text-accent-gold font-mono tracking-widest text-sm uppercase">
            Orden #{orderId}
          </p>
        </div>

        <div className="p-8 space-y-8">
          {/* Detalles de Entrega y Pago */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase tracking-widest">
                <MapPin size={14} /> Entrega en
              </div>
              <p className="text-white text-sm leading-relaxed">
                {/* {resumen.direccion} */}
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase tracking-widest">
                <CreditCard size={14} /> Método de Pago
              </div>
              <p className="text-white text-sm uppercase tracking-wider">
                {resumen.metodoPago.replace("_", " ")}
              </p>
            </div>
          </div>

          <hr className="border-white/5" />

          {/* Resumen de Productos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase tracking-widest mb-4">
              <Package size={14} /> Resumen de Artículos
            </div>
            {resumen.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-white/70">
                  <span className="text-accent-gold font-bold">
                    {item.cantidad}x
                  </span>{" "}
                  {item.nombre || "Producto"}
                </span>
                <span className="text-white font-mono">
                  ${(item.precio * item.cantidad).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <hr className="border-white/5" />

          {/* Total Final */}
          <div className="flex justify-between items-end pt-2">
            <div>
              <p className="text-white/40 text-[10px] uppercase tracking-[0.2em]">
                Total Pagado
              </p>
              <p className="text-3xl text-accent-gold font-light tracking-tighter">
                ${resumen.montoTotal.toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 text-[10px] text-white/30 hover:text-white transition-colors uppercase tracking-widest"
            >
              Descargar Recibo <ExternalLink size={12} />
            </button>
          </div>
        </div>

        {/* Footer Informativo */}
        <div className="bg-white/[0.02] p-6 text-center">
          <p className="text-white/40 text-xs italic">
            Hemos enviado los detalles de tu compra y el seguimiento a tu
            WhatsApp registrado.
          </p>
        </div>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => (window.location.href = "/")}
          className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-full text-[11px] uppercase tracking-[0.3em] border border-white/10 transition-all"
        >
          Volver a la Boutique
        </button>
      </div>
    </div>
  );
};
