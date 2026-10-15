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
  estado: EstadoTransaccion;
  tipoDescuento: TipoDescuento | null;
  valorDescuento: number | null;
  tipodeRetiro: TipoRetiro;
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

export type AnalyticsResult = {
  periodo: AnalyticsPeriod;
  totalUsd: number;
  cantidadVentas: number;
  porProducto: AnalyticsProductRow[];
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
  celular: string;
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
  changes: Partial<Pick<ClientRow, "tipoCliente" | "nombre" | "apellido" | "rif" | "celular" | "email">>;
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
