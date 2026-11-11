import Link from "next/link";

import type { FilaPuntos } from "@/lib/admin/points-core";
import { clientTypeLabel } from "@/lib/client-rules";
import { formatFecha, formatPuntosConSigno } from "@/lib/format";

const numero = (valor: number) => valor.toLocaleString("es-VE");

export function PointsTable({ filas, total, q }: { filas: FilaPuntos[]; total: number; q: string }) {
  if (total === 0) {
    return <section className="admin-panel p-6 text-sm text-[#8f988f]">Todavía no hay movimientos de puntos. Aparecerán cuando un pedido de un consumidor quede pagado.</section>;
  }
  if (filas.length === 0) {
    return <section className="admin-panel p-6 text-sm text-[#8f988f]">No hay clientes con puntos que coincidan con «{q}».</section>;
  }
  return (
    <section className="admin-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="admin-table w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr><th>Cliente</th><th>Tipo</th><th className="text-right">Ganados</th><th className="text-right">Canjeados</th><th className="text-right">Ajustes</th><th className="text-right">Disponibles</th><th>Último movimiento</th></tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.clienteId}>
                <td>
                  <Link href={`/admin/clients/${fila.clienteId}`} className="font-bold text-[#18211d] hover:underline">{fila.nombre}</Link>
                  {fila.celular && <span className="block text-xs text-[#707970]">{fila.celular}</span>}
                </td>
                <td>{clientTypeLabel(fila.tipoCliente)}</td>
                <td className="admin-mono text-right">{numero(fila.ganados)}</td>
                <td className="admin-mono text-right">{numero(fila.canjeados)}</td>
                <td className="admin-mono text-right">{fila.ajustes === 0 ? "—" : formatPuntosConSigno(fila.ajustes)}</td>
                <td className="admin-mono text-right font-bold text-[#18211d]">{numero(fila.disponibles)}</td>
                <td>{formatFecha(fila.ultimoMovimiento)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-[#ebe9e0] p-4 text-xs text-[#707970]">{filas.length} de {total} clientes con movimientos de puntos</p>
    </section>
  );
}
