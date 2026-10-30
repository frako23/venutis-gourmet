import type { ClientProfile } from "@/lib/admin/client-profile";
import { formatRif } from "@/lib/client-rules";
import { formatFecha } from "@/lib/format";

export function FichaDatos({ perfil }: { perfil: ClientProfile }) {
  const { cliente, direcciones } = perfil;
  const dato = (etiqueta: string, valor: React.ReactNode) => (
    <div><dt className="admin-eyebrow">{etiqueta}</dt><dd className="mt-1 break-words text-sm text-[#18211d]">{valor}</dd></div>
  );
  return (
    <section className="admin-panel p-4 md:p-5">
      <h2 className="text-lg font-bold text-[#18211d]">Datos del cliente</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dato("Tipo", cliente.tipoCliente === "mayorista" ? "Mayorista" : "Consumidor")}
        {dato("RIF", formatRif(cliente.rif))}
        {dato("Teléfono", cliente.celular ?? "Sin teléfono")}
        {dato("Correo", cliente.email ?? "Sin correo")}
        {dato("Alta", formatFecha(cliente.createdAt))}
        {dato("Última actualización", formatFecha(cliente.updatedAt))}
      </dl>
      <h3 className="admin-eyebrow mt-6">Direcciones</h3>
      {direcciones.length === 0 ? (
        <p className="mt-2 text-sm text-[#8f988f]">Sin direcciones registradas.</p>
      ) : (
        <ul className="mt-2 grid gap-2 md:grid-cols-2">
          {direcciones.map((d) => (
            <li key={d.id} className="rounded-lg border border-[#ebe9e0] bg-[#fffaf0] px-3 py-2 text-sm"><strong className="text-[#66735f]">{d.tipo} · {d.urbanizacion}</strong><p className="mt-1 text-[#707970]">{d.direccion}</p></li>
          ))}
        </ul>
      )}
    </section>
  );
}
