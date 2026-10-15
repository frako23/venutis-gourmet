"use client";

import { crearClienteAdministrativo } from "@/lib/actions/admin-clients";
import type { ClientCreateState } from "@/lib/admin/types";
import { X } from "lucide-react";
import { FormEvent, useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const initialState: ClientCreateState = { success: false, message: "" };

export function ClientCreateModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(crearClienteAdministrativo, initialState);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!state.success) return;
    toast.success(state.message);
    router.refresh();
    onClose();
  }, [onClose, router, state]);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function close(event?: FormEvent) {
    event?.preventDefault();
    if (dirty && !window.confirm("Hay datos sin guardar. ¿Quieres cerrar la modal?")) return;
    onClose();
  }

  const issueMap = new Map((state.success ? [] : state.issues ?? []).map((issue) => [issue.field, issue.message]));
  const fieldError = (field: string) => issueMap.get(field);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#18211d]/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#dedfd6] bg-[#fffdf8] shadow-[0_24px_70px_rgba(24,33,29,0.28)]" role="dialog" aria-modal="true" aria-labelledby="new-client-title">
        <div className="flex items-start justify-between gap-4 border-b border-[#ebe9e0] bg-[#fffaf0] p-5 md:p-6">
          <div>
            <p className="admin-eyebrow">Alta administrativa</p>
            <h2 id="new-client-title" className="mt-1 text-xl font-black tracking-tight text-[#18211d]">Nuevo cliente</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#707970]">Registra un consumidor o mayorista sin salir del listado.</p>
          </div>
          <button type="button" onClick={() => close()} className="rounded-lg p-2 text-[#707970] hover:bg-[#f8e8e3] hover:text-[#a84f3b]" aria-label="Cerrar modal"><X size={20} /></button>
        </div>

        <form action={formAction} onChange={() => setDirty(true)} className="space-y-6 p-5 md:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo de cliente" error={fieldError("tipoCliente")}>
              <select name="tipoCliente" defaultValue="detal" className="admin-field" required>
                <option value="detal">Consumidor</option>
                <option value="mayorista">Mayorista</option>
              </select>
            </Field>
            <Field label="RIF" error={fieldError("rif")} hint="Obligatorio para mayoristas; acepta espacios y guiones. Ejemplo válido: J-12345678-4.">
              <input name="rif" className="admin-field admin-mono" placeholder="J-12345678-4" />
            </Field>
            <Field label="Nombre" error={fieldError("nombre")}>
              <input name="nombre" className="admin-field" required autoComplete="given-name" />
            </Field>
            <Field label="Apellido / razón complementaria" error={fieldError("apellido")}>
              <input name="apellido" className="admin-field" required autoComplete="family-name" />
            </Field>
            <Field label="Teléfono" error={fieldError("celular")}>
              <input name="celular" className="admin-field" required inputMode="tel" autoComplete="tel" />
            </Field>
            <Field label="Correo electrónico" error={fieldError("email")}>
              <input name="email" type="email" className="admin-field" autoComplete="email" />
            </Field>
          </div>

          <fieldset className="rounded-xl border border-[#dedfd6] p-4">
            <legend className="px-2 text-xs font-black uppercase tracking-[0.1em] text-[#66735f]">Dirección inicial opcional</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Tipo" error={fieldError("direccionInicial")}><input name="direccionTipo" className="admin-field" placeholder="Casa, oficina..." /></Field>
              <Field label="Urbanización"><input name="urbanizacion" className="admin-field" /></Field>
              <Field label="Dirección"><input name="direccion" className="admin-field" /></Field>
            </div>
          </fieldset>

          {!state.success && state.message && <p className="rounded-lg bg-[#f8e8e3] p-3 text-sm text-[#a84f3b]" role="alert">{state.message}</p>}
          <div className="flex flex-wrap justify-end gap-2 border-t border-[#ebe9e0] pt-5">
            <button type="button" onClick={() => close()} className="admin-button-secondary">Cancelar</button>
            <button type="submit" disabled={isPending} className="admin-button-primary admin-button-brass">{isPending ? "Guardando..." : "Crear cliente"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return <label className="admin-label">{label}{children}{hint && <span className="normal-case font-normal tracking-normal text-[#8f988f]">{hint}</span>}{error && <span className="normal-case font-semibold tracking-normal text-[#b85f49]" role="alert">{error}</span>}</label>;
}
