"use client";

import { eliminarPedido } from "@/lib/actions/admin-orders";
import { formatFecha, formatUsd } from "@/lib/format";
import type { SalesRow } from "@/lib/admin/types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";

export function DeleteOrderDialog({ pedido, onClose, ultimaFilaDeLaPagina, page }: { pedido: SalesRow; onClose: () => void; ultimaFilaDeLaPagina: boolean; page: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendiente, iniciar] = useTransition();
  const volverRef = useRef<HTMLButtonElement>(null);
  const muevenInventario = !pedido.importada && pedido.estado !== "cancelado";

  useEffect(() => {
    volverRef.current?.focus();
    function alPulsar(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [onClose]);

  function confirmar() {
    const datos = new FormData();
    datos.set("transaccionId", String(pedido.id));
    datos.set("estadoEsperado", pedido.estado);
    datos.set("totalEsperadoUsd", String(pedido.totalUsd));
    iniciar(async () => {
      const resultado = await eliminarPedido(datos);
      if (!resultado.success) {
        toast.error(resultado.message);
        router.refresh();
        return;
      }
      toast.success(resultado.message);
      onClose();
      if (ultimaFilaDeLaPagina && page > 1) {
        const parametros = new URLSearchParams(searchParams.toString());
        parametros.set("page", String(page - 1));
        router.replace(`${pathname}?${parametros.toString()}`);
      } else router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#18211d]/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pendiente) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="eliminar-pedido-titulo" className="admin-panel w-full max-w-md p-6">
        <h2 id="eliminar-pedido-titulo" className="text-lg font-bold text-[#18211d]">¿Eliminar el pedido {pedido.numeroOrden}?</h2>
        <dl className="mt-4 space-y-2 text-sm text-[#18211d]">
          <div className="flex justify-between gap-3"><dt className="text-[#707970]">Cliente</dt><dd>{pedido.cliente}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-[#707970]">Fecha</dt><dd>{formatFecha(pedido.fechaCompra)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-[#707970]">Total</dt><dd className="admin-mono font-bold">{formatUsd(pedido.totalUsd)}</dd></div>
        </dl>
        <p className="mt-4 text-sm font-bold text-[#a5452f]">Esta acción no se puede deshacer.</p>
        <p className="mt-1 text-xs text-[#707970]">{muevenInventario ? "Los productos vuelven al inventario." : "No mueve inventario."}{pedido.tienePagoDeclarado ? " También se eliminará el pago declarado por el cliente." : ""}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button ref={volverRef} type="button" className="admin-button-secondary" onClick={onClose} disabled={pendiente}>Volver</button>
          <button type="button" className="admin-button-primary bg-[#a5452f]" onClick={confirmar} disabled={pendiente}>{pendiente ? "Eliminando…" : "Eliminar pedido"}</button>
        </div>
      </section>
    </div>
  );
}
