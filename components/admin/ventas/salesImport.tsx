"use client";

import { confirmarCargaVentas, previsualizarCargaVentas } from "@/lib/actions/sales-import";
import type { ConfirmacionState, PrevisualizacionState, ResolucionesCarga, VistaPreviaCarga } from "@/lib/admin/types";
import { formatQuantity } from "@/lib/inventory";
import { FileSpreadsheet, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, startTransition } from "react";
import { toast } from "sonner";

type ClienteOpcion = { id: number; nombre: string; apellido: string; tipoCliente: string };
type EleccionCliente = ResolucionesCarga["clientes"][string] | null;

const situacionEtiqueta = { nueva: "Nueva", ya_registrada: "Ya registrada", conflicto: "Conflicto", con_error: "Con error" } as const;
const situacionColor = {
  nueva: "bg-[#e8eee5] text-[#4f6a47]",
  ya_registrada: "bg-[#ebe9e0] text-[#707970]",
  conflicto: "bg-[#f6e3de] text-[#b85f49]",
  con_error: "bg-[#f6e3de] text-[#b85f49]",
} as const;
const tipoEtiqueta = { detal: "Detal", mayor: "Mayor", promo: "Promo" } as const;

const usd = (valor: number) => `$${valor.toFixed(2)}`;
const fechaLegible = (iso: string) => iso.split("-").reverse().join("/");

export function SalesImport({ clientes }: { clientes: ClienteOpcion[] }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [previa, previsualizar, previsualizando] = useActionState<PrevisualizacionState | null, FormData>(previsualizarCargaVentas, null);
  const [confirmacion, confirmar, confirmando] = useActionState<ConfirmacionState | null, FormData>(confirmarCargaVentas, null);
  const [productos, setProductos] = useState<Record<string, number | "">>({});
  const [elecciones, setElecciones] = useState<Record<string, EleccionCliente>>({});
  const vista: VistaPreviaCarga | null = previa?.success ? previa.vista : null;

  // Al llegar una vista previa nueva se reinician las elecciones (patrón de React para derivar estado).
  const [previaAplicada, setPreviaAplicada] = useState<PrevisualizacionState | null>(null);
  if (previa !== previaAplicada) {
    setPreviaAplicada(previa);
    if (previa?.success) {
      const nuevosProductos: Record<string, number | ""> = {};
      for (const producto of previa.vista.productos) nuevosProductos[producto.clave] = producto.resolucion.tipo === "pendiente" ? "" : producto.resolucion.productoId;
      setProductos(nuevosProductos);
      const nuevasElecciones: Record<string, EleccionCliente> = {};
      for (const cliente of previa.vista.clientes) {
        if (cliente.resolucion.tipo !== "pendiente") nuevasElecciones[cliente.clave] = { accion: "vincular", clienteId: cliente.resolucion.clienteId };
        else nuevasElecciones[cliente.clave] = cliente.resolucion.coincidencias.length === 0 ? { accion: "crear", tipoCliente: cliente.tipoPropuesto } : null;
      }
      setElecciones(nuevasElecciones);
    }
  }

  useEffect(() => {
    if (previa && !previa.success) toast.error(previa.message);
  }, [previa]);

  useEffect(() => {
    if (!confirmacion) return;
    if (confirmacion.success) toast.success(confirmacion.message);
    else toast.error(confirmacion.message);
  }, [confirmacion]);

  const preciosArchivo = useMemo(() => {
    const mapa = new Map<string, Set<number>>();
    for (const nota of vista?.notas ?? []) for (const linea of nota.lineas) mapa.set(linea.claveProducto, (mapa.get(linea.claveProducto) ?? new Set()).add(linea.precioUnitarioUsd));
    return mapa;
  }, [vista]);

  const sinResolver = vista ? vista.productos.some((p) => productos[p.clave] === "" || productos[p.clave] === undefined) || vista.clientes.some((c) => !elecciones[c.clave]) : false;
  const puedeConfirmar = Boolean(vista && vista.puedeConfirmar && vista.resumen.notasNuevas > 0 && !sinResolver && !confirmando && !confirmacion?.success);

  function enviarConfirmacion() {
    if (!archivo || !vista) return;
    const resoluciones: ResolucionesCarga = { productos: {}, clientes: {} };
    for (const producto of vista.productos) resoluciones.productos[producto.clave] = Number(productos[producto.clave]);
    for (const cliente of vista.clientes) {
      const eleccion = elecciones[cliente.clave];
      if (eleccion) resoluciones.clientes[cliente.clave] = eleccion;
    }
    const datos = new FormData();
    datos.set("archivo", archivo);
    datos.set("resoluciones", JSON.stringify(resoluciones));
    startTransition(() => confirmar(datos));
  }

  const errores = vista?.problemas.filter((p) => p.nivel === "error") ?? [];
  const avisos = vista?.problemas.filter((p) => p.nivel === "advertencia") ?? [];

  return (
    <div className="space-y-6">
      <form action={previsualizar} className="admin-panel flex flex-wrap items-end gap-4 p-5">
        <label className="admin-label min-w-64 flex-1">
          Archivo de Excel (.xlsx)
          <input name="archivo" type="file" accept=".xlsx" className="admin-field" onChange={(event) => setArchivo(event.target.files?.[0] ?? null)} />
        </label>
        <button type="submit" disabled={!archivo || previsualizando} className="admin-button-primary admin-button-brass disabled:opacity-60">
          <FileSpreadsheet size={16} /> {previsualizando ? "Leyendo..." : "Previsualizar"}
        </button>
      </form>

      {vista && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Resumen etiqueta="Pedidos nuevos" valor={String(vista.resumen.notasNuevas)} />
            <Resumen etiqueta="Ya registrados" valor={String(vista.resumen.notasYaRegistradas)} />
            <Resumen etiqueta="Total a cargar" valor={usd(vista.resumen.totalUsd)} />
            <Resumen etiqueta="Por cobrar" valor={usd(vista.resumen.porCobrarUsd)} />
          </section>

          {(errores.length > 0 || avisos.length > 0) && (
            <section className="admin-panel p-5">
              <h2 className="flex items-center gap-2 font-bold text-[#18211d]"><TriangleAlert size={18} /> Problemas encontrados</h2>
              <ul className="mt-3 space-y-1 text-sm">
                {[...errores, ...avisos].map((problema, indice) => (
                  <li key={indice} className={problema.nivel === "error" ? "text-[#b85f49]" : "text-[#8c6a2c]"}>
                    <strong>{problema.nivel === "error" ? "Error" : "Aviso"}</strong>
                    {problema.fila ? ` · fila ${problema.fila}` : ""}
                    {problema.columna ? ` · ${problema.columna}` : ""}
                    {problema.nota ? ` · nota ${problema.nota}` : ""}: {problema.mensaje}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {vista.productos.length > 0 && (
            <section className="admin-panel p-5">
              <p className="admin-eyebrow">Conciliación</p>
              <h2 className="mt-1 font-bold text-[#18211d]">Productos</h2>
              <div className="mt-4 space-y-3">
                {vista.productos.map((producto) => {
                  const seleccionado = vista.catalogo.find((p) => p.id === productos[producto.clave]);
                  const precios = [...(preciosArchivo.get(producto.clave) ?? [])].map(usd).join(" · ");
                  return (
                    <div key={producto.clave} className="grid gap-2 rounded-lg border border-[#ebe9e0] p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                      <div>
                        <strong className="text-[#18211d]">{[producto.producto, producto.sabor, producto.gramos ? `${producto.gramos} g` : null].filter(Boolean).join(" ")}</strong>
                        <p className="text-xs text-[#707970]">{producto.lineas} línea(s) · precio en el archivo: {precios}{seleccionado ? ` · catálogo: detal ${usd(seleccionado.precioDetal)}, mayor ${usd(seleccionado.precioMayorista)}` : ""}</p>
                        {producto.resolucion.tipo === "sugerida" && <span className="mt-1 inline-block rounded-full bg-[#f5eddc] px-2 py-0.5 text-xs font-bold text-[#8c6a2c]">Sugerido: confirma o cambia</span>}
                        {producto.resolucion.tipo === "pendiente" && <span className="mt-1 inline-block rounded-full bg-[#f6e3de] px-2 py-0.5 text-xs font-bold text-[#b85f49]">Elige un producto</span>}
                      </div>
                      <select
                        aria-label={`Producto del catálogo para ${producto.producto} ${producto.sabor ?? ""}`}
                        className="admin-field"
                        value={productos[producto.clave] ?? ""}
                        onChange={(event) => setProductos((actual) => ({ ...actual, [producto.clave]: event.target.value ? Number(event.target.value) : "" }))}
                      >
                        <option value="">Elige un producto…</option>
                        {vista.catalogo.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {vista.clientes.length > 0 && (
            <section className="admin-panel p-5">
              <p className="admin-eyebrow">Conciliación</p>
              <h2 className="mt-1 font-bold text-[#18211d]">Clientes</h2>
              <div className="mt-4 space-y-3">
                {vista.clientes.map((cliente) => {
                  const eleccion = elecciones[cliente.clave];
                  const modo = eleccion?.accion ?? "";
                  const coincidencias = cliente.resolucion.tipo === "pendiente" ? cliente.resolucion.coincidencias.map((c) => c.clienteId) : [];
                  const ordenados = [...clientes].sort((a, b) => Number(coincidencias.includes(b.id)) - Number(coincidencias.includes(a.id)));
                  return (
                    <div key={cliente.clave} className="grid gap-2 rounded-lg border border-[#ebe9e0] p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                      <div>
                        <strong className="text-[#18211d]">{cliente.texto}</strong>
                        {!eleccion && <p className="text-xs font-bold text-[#b85f49]">Hay varios clientes con este nombre: elige uno o crea uno nuevo.</p>}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <select
                          aria-label={`Acción para el cliente ${cliente.texto}`}
                          className="admin-field"
                          value={modo}
                          onChange={(event) => {
                            const valor = event.target.value;
                            setElecciones((actual) => ({
                              ...actual,
                              [cliente.clave]: valor === "crear" ? { accion: "crear", tipoCliente: cliente.tipoPropuesto } : valor === "vincular" ? { accion: "vincular", clienteId: ordenados[0]?.id ?? 0 } : null,
                            }));
                          }}
                        >
                          <option value="">Elige…</option>
                          <option value="vincular">Vincular a un cliente existente</option>
                          <option value="crear">Crear cliente nuevo</option>
                        </select>
                        {eleccion?.accion === "vincular" && (
                          <select aria-label={`Cliente existente para ${cliente.texto}`} className="admin-field" value={eleccion.clienteId} onChange={(event) => setElecciones((actual) => ({ ...actual, [cliente.clave]: { accion: "vincular", clienteId: Number(event.target.value) } }))}>
                            {ordenados.map((c) => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
                          </select>
                        )}
                        {eleccion?.accion === "crear" && (
                          <select aria-label={`Tipo del cliente nuevo ${cliente.texto}`} className="admin-field" value={eleccion.tipoCliente} onChange={(event) => setElecciones((actual) => ({ ...actual, [cliente.clave]: { accion: "crear", tipoCliente: event.target.value as "mayorista" | "detal" } }))}>
                            <option value="detal">Consumidor</option>
                            <option value="mayorista">Mayorista</option>
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="admin-panel p-5">
            <p className="admin-eyebrow">Pedidos del archivo</p>
            <div className="mt-4 hidden overflow-x-auto md:block">
              <table className="admin-table w-full text-sm">
                <thead><tr><th>Nota</th><th>Fecha</th><th>Cliente</th><th>Líneas</th><th>Total</th><th>Saldo</th><th>Estado</th><th>Situación</th></tr></thead>
                <tbody>
                  {vista.notas.map((nota) => (
                    <tr key={nota.numero}>
                      <td className="admin-mono font-bold">{nota.numero}</td>
                      <td>{nota.fecha ? fechaLegible(nota.fecha) : "—"}</td>
                      <td>{nota.textoCliente || "—"}</td>
                      <td className="text-xs text-[#707970]">{nota.lineas.map((l) => `${l.descripcion} × ${formatQuantity(l.cantidad)}${l.tipoPrecio ? ` (${tipoEtiqueta[l.tipoPrecio]} ${usd(l.precioUnitarioUsd)})` : ""}`).join("; ")}</td>
                      <td className="admin-mono">{usd(nota.totalUsd)}</td>
                      <td className="admin-mono">{usd(nota.saldoUsd)}</td>
                      <td>{nota.estadoResultante === "pagado" ? "Pagado" : "Por cobrar"}</td>
                      <td><Situacion nota={nota} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 space-y-3 md:hidden">
              {vista.notas.map((nota) => (
                <article key={nota.numero} className="rounded-lg border border-[#ebe9e0] p-3 text-sm">
                  <div className="flex items-center justify-between gap-2"><strong className="admin-mono">#{nota.numero}</strong><Situacion nota={nota} /></div>
                  <p className="mt-1 text-[#18211d]">{nota.textoCliente || "—"} · {nota.fecha ? fechaLegible(nota.fecha) : "—"}</p>
                  <ul className="mt-2 space-y-1 text-xs text-[#707970]">{nota.lineas.map((l) => <li key={l.fila}>{l.descripcion} × {formatQuantity(l.cantidad)}{l.tipoPrecio ? ` · ${tipoEtiqueta[l.tipoPrecio]} ${usd(l.precioUnitarioUsd)}` : ""}</li>)}</ul>
                  <p className="admin-mono mt-2">{usd(nota.totalUsd)}{nota.saldoUsd > 0 ? ` · por cobrar ${usd(nota.saldoUsd)}` : ""}</p>
                </article>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-4">
            <button type="button" onClick={enviarConfirmacion} disabled={!puedeConfirmar} className="admin-button-primary admin-button-brass disabled:opacity-60">
              {confirmando ? "Guardando..." : "Confirmar carga"}
            </button>
            {vista.resumen.notasNuevas === 0 && vista.puedeConfirmar && <span className="text-sm text-[#707970]">Todas las notas del archivo ya estaban registradas.</span>}
            {sinResolver && <span className="text-sm text-[#b85f49]">Resuelve los productos y clientes pendientes para continuar.</span>}
            {confirmacion?.success && confirmacion.creados > 0 && (
              <Link className="admin-button-secondary" href={`/admin/transactions?desde=${confirmacion.desde}&hasta=${confirmacion.hasta}`}>Ver los pedidos cargados</Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Resumen({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return <div className="admin-panel-flat px-4 py-3"><p className="text-xs text-[#707970]">{etiqueta}</p><p className="admin-mono text-xl font-black text-[#18211d]">{valor}</p></div>;
}

function Situacion({ nota }: { nota: VistaPreviaCarga["notas"][number] }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${situacionColor[nota.situacion]}`} title={nota.pedidoExistente ? `Pedido existente: ${nota.pedidoExistente.cliente}, ${fechaLegible(nota.pedidoExistente.fecha)}, ${usd(nota.pedidoExistente.totalUsd)}` : undefined}>
      {situacionEtiqueta[nota.situacion]}
    </span>
  );
}
