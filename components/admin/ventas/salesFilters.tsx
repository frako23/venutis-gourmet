export function SalesFilters({ values }: { values: { desde?: string; hasta?: string; estado?: string; cliente?: string; orden?: string } }) {
  return (
    <form method="get" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5 sm:grid-cols-2 lg:grid-cols-5">
      <label className="text-xs font-bold uppercase text-slate-500">Desde<input name="desde" type="date" defaultValue={values.desde} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm dark:border-white/10 dark:bg-slate-900" /></label>
      <label className="text-xs font-bold uppercase text-slate-500">Hasta<input name="hasta" type="date" defaultValue={values.hasta} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm dark:border-white/10 dark:bg-slate-900" /></label>
      <label className="text-xs font-bold uppercase text-slate-500">Estado<select name="estado" defaultValue={values.estado ?? ""} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm dark:border-white/10 dark:bg-slate-900"><option value="">Todos</option><option value="por_cobrar">Por cobrar</option><option value="en_pedido">En pedido</option><option value="pagado">Pagado</option><option value="pendiente">Histórico: pendiente</option><option value="cancelado">Cancelado</option></select></label>
      <label className="text-xs font-bold uppercase text-slate-500">Cliente<input name="cliente" defaultValue={values.cliente} placeholder="Nombre o apellido" className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm dark:border-white/10 dark:bg-slate-900" /></label>
      <label className="text-xs font-bold uppercase text-slate-500">Orden<input name="orden" defaultValue={values.orden} placeholder="VEN-..." className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm dark:border-white/10 dark:bg-slate-900" /></label>
      <div className="sm:col-span-2 lg:col-span-5"><button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-gold dark:text-charcoal">Aplicar filtros</button></div>
    </form>
  );
}

export type SalesFilterState = Parameters<typeof SalesFilters>[0]["values"];
