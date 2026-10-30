import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FichaCredito } from "@/components/admin/clientes/ficha/fichaCredito";
import { FichaCuentaWeb } from "@/components/admin/clientes/ficha/fichaCuentaWeb";
import { FichaDatos } from "@/components/admin/clientes/ficha/fichaDatos";
import { FichaHistorial } from "@/components/admin/clientes/ficha/fichaHistorial";
import { FichaIndicadores } from "@/components/admin/clientes/ficha/fichaIndicadores";
import { FichaNotas } from "@/components/admin/clientes/ficha/fichaNotas";
import { FichaPedidos } from "@/components/admin/clientes/ficha/fichaPedidos";
import { FichaSaldoAFavor } from "@/components/admin/clientes/ficha/fichaSaldoAFavor";
import { FichaPuntos } from "@/components/admin/clientes/ficha/fichaPuntos";
import { FichaResumenFinanciero } from "@/components/admin/clientes/ficha/fichaResumenFinanciero";
import { requireAdmin } from "@/lib/admin/auth";
import { getClientProfile } from "@/lib/admin/client-profile";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const perfil = await getClientProfile(prisma, id);
  if (!perfil) notFound();

  return (
    <main className="admin-page">
      <div className="admin-content space-y-6">
        <div>
          <Link href="/admin/clients" className="inline-flex items-center gap-2 text-xs font-bold text-[#66735f] hover:underline"><ArrowLeft size={14} /> Clientes</Link>
          <p className="admin-eyebrow mt-4">Ficha del cliente</p>
          <h1 className="admin-title mt-2">{perfil.cliente.nombre} {perfil.cliente.apellido}</h1>
          <p className="admin-subtitle mt-3">Cliente #{perfil.cliente.id} · {perfil.cliente.tipoCliente === "mayorista" ? "Mayorista" : "Consumidor"}</p>
        </div>
        <FichaResumenFinanciero perfil={perfil} />
        <div className="grid gap-6 lg:grid-cols-2">
          <FichaDatos perfil={perfil} />
          <FichaIndicadores perfil={perfil} />
        </div>
        <FichaPedidos perfil={perfil} />
        <FichaSaldoAFavor perfil={perfil} />
        <FichaPuntos perfil={perfil} />
        <div className="grid gap-6 lg:grid-cols-2">
          <FichaCredito
            clienteId={perfil.cliente.id}
            habilitado={perfil.financiero.credito.habilitado}
            limiteUsd={perfil.financiero.credito.limiteUsd}
            deudaUsd={perfil.financiero.deudaUsd}
            disponibleUsd={perfil.financiero.credito.disponibleUsd}
          />
          <FichaNotas clienteId={perfil.cliente.id} notas={perfil.cliente.notasInternas} />
        </div>
        <FichaCuentaWeb perfil={perfil} />
        <FichaHistorial perfil={perfil} />
      </div>
    </main>
  );
}
