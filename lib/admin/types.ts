import type {
  EstadoTransaccion,
  TipoDescuento,
  TipoRetiro,
} from "@prisma/client";

import type { SaleTotals } from "./sales-calculations";
import type { ActiveOrderState } from "./status";

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
  periodo: {
    desde: Date;
    hasta: Date;
    granularidad: "semana" | "mes";
  };
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
