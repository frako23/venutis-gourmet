"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { confirmarVinculacionCuenta, desvincularCuenta } from "@/lib/actions/admin-clients";
import type { ClientProfile } from "@/lib/admin/client-profile";
import { formatFechaHora } from "@/lib/format";

export function FichaCuentaWeb({ perfil }: { perfil: ClientProfile }) {
  const router = useRouter();
  const { cuenta } = perfil;
  const [pendiente, iniciar] = useTransition();
  const [confirmando, setConfirmando] = useState(false);

  function ejecutar(accion: typeof confirmarVinculacionCuenta) {
    if (!cuenta) return;
    const datos = new FormData();
    datos.set("cuentaId", String(cuenta.id));
    iniciar(async () => {
      const resultado = await accion(datos);
      if (resultado.success) {
        toast.success(resultado.message);
        setConfirmando(false);
        router.refresh();
      } else {
        toast.error(resultado.message);
      }
    });
  }

  return (
    <section className="admin-panel p-4 md:p-5">
      <h2 className="text-lg font-bold text-[#18211d]">Cuenta web</h2>
      {!cuenta ? (
        <p className="mt-2 text-sm text-[#8f988f]">Sin cuenta: el cliente aún no se ha registrado en la tienda.</p>
      ) : (
        <div className="mt-2 text-sm text-[#18211d]">
          <p><strong>{cuenta.estado === "vinculada" ? "Vinculada" : "Pendiente de confirmación"}</strong> · {cuenta.email}</p>
          {cuenta.confirmadaEn && <p className="mt-1 text-xs text-[#707970]">Confirmada por {cuenta.confirmadaPorEmail ?? "—"} el {formatFechaHora(cuenta.confirmadaEn)}</p>}
          {cuenta.estado === "pendiente" && <p className="mt-2 text-xs text-[#707970]">La persona se registró con el teléfono de este cliente, pero con otro correo. Confirma solo si es la misma persona.</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {cuenta.estado === "pendiente" && <button type="button" disabled={pendiente} onClick={() => ejecutar(confirmarVinculacionCuenta)} className="admin-button-primary admin-button-brass">Confirmar vinculación</button>}
            <button type="button" disabled={pendiente} onClick={() => setConfirmando(true)} className="admin-button-secondary">Desvincular</button>
          </div>
        </div>
      )}
      {confirmando && cuenta && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => !pendiente && setConfirmando(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="desvincular-titulo" className="admin-panel w-full max-w-md p-6" onClick={(evento) => evento.stopPropagation()}>
            <h3 id="desvincular-titulo" className="text-lg font-bold text-[#18211d]">¿Desvincular esta cuenta?</h3>
            <p className="mt-2 text-sm text-[#707970]">{cuenta.email} dejará de ver los datos de este cliente de inmediato. Los pedidos, puntos y saldos del cliente no cambian.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={pendiente} onClick={() => setConfirmando(false)} className="admin-button-secondary">Volver</button>
              <button type="button" disabled={pendiente} onClick={() => ejecutar(desvincularCuenta)} className="admin-button-primary admin-button-brass">{pendiente ? "Desvinculando…" : "Desvincular"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
