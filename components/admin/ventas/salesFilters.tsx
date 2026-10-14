export function SalesFilters({ values }: { values: { desde?: string; hasta?: string; estado?: string; cliente?: string; orden?: string } }) {
  return (
    <form method="get" className="admin-panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
      <label className="admin-label">Desde<input name="desde" type="date" defaultValue={values.desde} className="admin-field" /></label>
      <label className="admin-label">Hasta<input name="hasta" type="date" defaultValue={values.hasta} className="admin-field" /></label>
      <label className="admin-label">Estado<select name="estado" defaultValue={values.estado ?? ""} className="admin-field"><option value="">Todos</option><option value="por_cobrar">Por cobrar</option><option value="en_pedido">En pedido</option><option value="pagado">Pagado</option><option value="pendiente">Histórico: pendiente</option><option value="cancelado">Cancelado</option></select></label>
      <label className="admin-label">Cliente<input name="cliente" defaultValue={values.cliente} placeholder="Nombre o apellido" className="admin-field" /></label>
      <label className="admin-label">Orden<input name="orden" defaultValue={values.orden} placeholder="VEN-..." className="admin-field" /></label>
      <div className="flex items-end sm:col-span-2 lg:col-span-5"><button type="submit" className="admin-button-primary admin-button-brass">Aplicar filtros</button></div>
    </form>
  );
}

export type SalesFilterState = Parameters<typeof SalesFilters>[0]["values"];
