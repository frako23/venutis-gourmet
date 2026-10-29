import Link from "next/link";

import type { CuentasPorCobrar } from "@/lib/admin/abonos";

export function ReceivablesSummary({ cuentas }: { cuentas: CuentasPorCobrar }) {
  return (
    <section className="admin-panel p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="admin-eyebrow">Cuentas por cobrar</p>
          <h2 className="mt-1 font-bold text-[#18211d]">Lo que se debe, por cliente</h2>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#707970]">Total por cobrar</p>
          <p className="admin-mono text-2xl font-black text-[#8c6a2c]">${cuentas.totalUsd.toFixed(2)}</p>
        </div>
      </div>
      {cuentas.clientes.length === 0 ? (
        <p className="mt-4 text-sm text-[#707970]">No hay saldos pendientes.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[#ebe9e0] text-sm">
          {cuentas.clientes.map((cliente) => (
            <li key={cliente.clienteId} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <Link href={`/admin/transactions?saldo=pendiente&cliente=${encodeURIComponent(cliente.cliente)}`} className="font-bold text-[#18211d] hover:text-[#a57c2f]">{cliente.cliente}</Link>
              <span className="text-xs text-[#707970]">{cliente.pedidos} pedido(s) · desde {cliente.desde.toLocaleDateString("es-VE")}</span>
              <strong className="admin-mono text-[#8c6a2c]">${cliente.deudaUsd.toFixed(2)}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
