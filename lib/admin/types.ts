import type {
  AccionHistorialCliente,
  TipoCliente,
  EstadoTransaccion,
  TipoDescuento,
  TipoRetiro,
} from "@prisma/client";

import type { SaleTotals } from "./sales-calculations";
import type { ActiveOrderState } from "./status";
import type { AnalyticsPeriod } from "./periods";

export type ValidationIssue = {
  field: string;
  message: string;
};

export type ActionError = {
  success: false;
  message: string;
  issues?: ValidationIssue[];
};

export type ActionSuccess<T extends object = Record<string, never>> = {
  success: true;
  message: string;
} & T;

export type ActionResult<T extends object = Record<string, never>> =
  | ActionSuccess<T>
  | ActionError;

export type MoneyFields = {
  subtotalUsd: number;
  descuentoUsd: number;
  totalUsd: number;
  tasaCambio: number | null;
  totalBs: number | null;
};

export type OperationalState = ActiveOrderState;

export type SalesRow = MoneyFields & {
  id: number;
  numeroOrden: string;
  fechaCompra: Date;
  clienteId: number;
  cliente: string;
  productos: Array<{ nombre: string; cantidad: number }>;
  pagos: Array<{ metodoPago: string; referencia: string | null }>;
  montoBsPagado: number;
  abonadoUsd: number;
  saldoUsd: number;
  estado: EstadoTransaccion;
  tipoDescuento: TipoDescuento | null;
  valorDescuento: number | null;
  tipodeRetiro: TipoRetiro;
  montoDeliveryUsd: number;
  zonaEntrega: string | null;
  aliasEntrega: string | null;
  direccionEntrega: string | null;
};

export type PaginatedRows<T> = {
  rows: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AnalyticsProductRow = {
  productoId: number;
  nombre: string;
  cantidadVendida: number;
  totalUsd: number;
  porcentajeDelTotal: number;
};

export type AnalyticsPriceTypeRow = {
  tipoPrecio: "detal" | "mayor" | "promo" | null;
  etiqueta: string;
  cantidadVendida: number;
  totalUsd: number;
  porcentajeDelTotal: number;
};

export type AnalyticsResult = {
  periodo: AnalyticsPeriod;
  totalUsd: number;
  cantidadVentas: number;
  porProducto: AnalyticsProductRow[];
  porTipoPrecio: AnalyticsPriceTypeRow[];
  predictor: {
    valorUsd: number;
    periodoObjetivo: string;
    historialUsado: string;
    estado: "disponible" | "datos_insuficientes";
  } | null;
};

export type ManualSaleResult = ActionSuccess<{
  transactionId: number;
  numeroOrden: string;
  estado: OperationalState;
} & Pick<SaleTotals, "subtotalUsd" | "descuentoUsd" | "totalUsd">>;

export type ManualSaleState = ActionResult<{
  transactionId: number;
  numeroOrden: string;
  estado: OperationalState;
  subtotalUsd: number;
  descuentoUsd: number;
  totalUsd: number;
}>;

export type BulkSalesState = ActionResult<{
  updated: number;
  created: number;
}>;

export type ClientAddressRow = {
  id: number;
  tipo: string;
  urbanizacion: string;
  direccion: string;
};

export type ClientRow = {
  id: number;
  tipoCliente: TipoCliente;
  tipoLabel: "Consumidor" | "Mayorista";
  nombre: string;
  apellido: string;
  rif: string | null;
  celular: string | null;
  email: string | null;
  direcciones: ClientAddressRow[];
  cantidadTransacciones: number;
  ultimaCompra: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientPatch = {
  id: number;
  updatedAt: string;
  changes: Partial<Pick<ClientRow, "tipoCliente" | "nombre" | "apellido" | "rif" | "email">> & { celular?: string };
};

export type BulkClientsState =
  | { success: true; message: string; updated: number }
  | { success: false; message: string; issues?: ClientValidationIssue[] };

export type ClientHistoryAction = AccionHistorialCliente;

export type ClientCreateState = ActionResult<{
  clientId: number;
}>;

export type ClientValidationIssue = ValidationIssue & {
  rowId?: number;
  code?: "invalid" | "duplicate" | "stale" | "missing";
};

export type VisitPreset = "7d" | "30d" | "90d" | "custom";

export type VisitPeriod = {
  preset: VisitPreset;
  since: string;
  until: string;
  label: string;
  isValid: boolean;
  validationMessage?: string;
};

export type VisitMetric = {
  pageviews: number;
  visitors: number;
};

export type VisitBreakdownRow = VisitMetric & {
  label: string;
  isOthers: boolean;
};

export type WebsiteVisitsStatus =
  | "ready"
  | "no_data"
  | "not_configured"
  | "unavailable"
  | "unauthorized"
  | "invalid";

export type WebsiteVisitsResult = {
  period: VisitPeriod;
  environment: "production";
  queriedAt: string;
  status: WebsiteVisitsStatus;
  summary: VisitMetric | null;
  breakdowns: {
    paths: VisitBreakdownRow[];
    referrers: VisitBreakdownRow[];
    countries: VisitBreakdownRow[];
    devices: VisitBreakdownRow[];
  };
  message: string;
};

export type ProblemaCarga = {
  fila: number | null;
  columna: string | null;
  nivel: "error" | "advertencia";
  mensaje: string;
  nota: string | null;
};

export type VistaPreviaCarga = {
  archivo: { nombre: string; hoja: string; filaEncabezados: number };
  resumen: {
    notasNuevas: number;
    notasYaRegistradas: number;
    notasConError: number;
    lineas: number;
    totalUsd: number;
    porCobrarUsd: number;
  };
  notas: Array<{
    numero: string;
    fecha: string;
    claveCliente: string;
    textoCliente: string;
    totalUsd: number;
    abonadoUsd: number;
    saldoUsd: number;
    estadoResultante: "pagado" | "por_cobrar";
    situacion: "nueva" | "ya_registrada" | "conflicto" | "con_error";
    pedidoExistente: { id: number; cliente: string; fecha: string; totalUsd: number } | null;
    lineas: Array<{
      fila: number;
      claveProducto: string;
      descripcion: string;
      cantidad: number;
      tipoPrecio: "detal" | "mayor" | "promo" | null;
      precioUnitarioUsd: number;
      importeUsd: number;
      abonadoUsd: number;
    }>;
  }>;
  productos: Array<{
    clave: string;
    grupo: string | null;
    producto: string;
    sabor: string | null;
    gramos: number | null;
    lineas: number;
    resolucion:
      | { tipo: "equivalencia" | "exacta"; productoId: number; nombre: string }
      | { tipo: "sugerida"; productoId: number; nombre: string }
      | { tipo: "pendiente" };
    preciosCatalogo: { detal: number; mayor: number } | null;
  }>;
  clientes: Array<{
    clave: string;
    texto: string;
    tipoPropuesto: "mayorista" | "detal";
    resolucion:
      | { tipo: "equivalencia" | "exacta"; clienteId: number; nombre: string }
      | { tipo: "pendiente"; coincidencias: Array<{ clienteId: number; nombre: string }> };
  }>;
  catalogo: Array<{ id: number; nombre: string; categoria: string; precioDetal: number; precioMayorista: number }>;
  problemas: ProblemaCarga[];
  puedeConfirmar: boolean;
};

export type ResolucionesCarga = {
  productos: Record<string, number>;
  clientes: Record<string, { accion: "vincular"; clienteId: number } | { accion: "crear"; tipoCliente: "mayorista" | "detal" }>;
};

export type PrevisualizacionState =
  | { success: true; message: string; vista: VistaPreviaCarga }
  | { success: false; message: string };

export type ConfirmacionState =
  | { success: true; message: string; creados: number; omitidos: number; totalUsd: number; desde: string; hasta: string }
  | { success: false; message: string; problemas?: ProblemaCarga[] };
