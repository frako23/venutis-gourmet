"use client";

import { Download, ExternalLink, Eye, X } from "lucide-react";
import { useEffect, useState } from "react";

export function DeliveryNotePdfPreview({ noteId, numeroNota }: { noteId: number; numeroNota: string }) {
  const [open, setOpen] = useState(false);
  const pdfUrl = `/admin/delivery-notes/${noteId}/pdf`;
  const previewUrl = `${pdfUrl}?vista=1`;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="admin-button-secondary inline-flex items-center gap-2"><Eye size={16} /> Vista previa</button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={`Vista previa de la nota ${numeroNota}`} className="fixed inset-0 z-50 flex items-center justify-center bg-[#18211d]/60 p-3 sm:p-6" onClick={() => setOpen(false)}>
          <div className="admin-panel flex h-full max-h-[52rem] w-full max-w-3xl flex-col overflow-hidden" onClick={(event) => event.stopPropagation()}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dedfd6] p-4">
              <div><p className="admin-eyebrow">Vista previa</p><h2 className="admin-mono text-lg font-bold text-[#18211d]">{numeroNota}</h2></div>
              <div className="flex flex-wrap items-center gap-2">
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="admin-button-secondary inline-flex items-center gap-2"><ExternalLink size={16} /> Abrir</a>
                <a href={pdfUrl} className="admin-button-primary admin-button-brass"><Download size={16} /> Descargar PDF</a>
                <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar vista previa" className="admin-button-secondary"><X size={16} /></button>
              </div>
            </div>
            <iframe src={previewUrl} title={`Nota de entrega ${numeroNota}`} className="min-h-0 w-full flex-1 bg-white" />
          </div>
        </div>
      )}
    </>
  );
}
