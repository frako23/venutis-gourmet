// 1. Definimos la unión de tipos para los métodos

interface PaymentMethodDetails {
  [key: string]: any;
  instructions: string;
  currency: string;
}

export const PAYMENT_DETAILS: Record<string, PaymentMethodDetails> = {
  PagoMovil: {
    bank: "Banco Mercantil",
    phone: "0412-1234567",
    id: "V-12.345.678",
    currency: "Bs.",
    instructions:
      "Recuerda capturar el comprobante con el número de referencia.",
  },
  Zelle: {
    email: "pagos@venutisgourmet.com",
    name: "Venuti's Gourmet LLC",
    currency: "USD",
    instructions: "Por favor, indica tu nombre en el motivo del pago.",
  },
  TransferenciaBs: {
    bank: "Banco Provincial",
    account: "0108-XXXX-XXXX-XXXXXXXXX",
    name: "Venuti's Gourmet C.A.",
    id: "J-12345678-9",
    currency: "Bs.",
    instructions:
      "La transferencia debe ser del mismo banco para despacho inmediato.",
  },
  EfectivoUsd: {
    instructions:
      "El pago en efectivo se realiza directamente al motorizado al recibir el pedido.",
    currency: "USD / Bs.",
    note: "Asegúrate de tener el monto exacto o indicar si necesitas cambio.",
  },
};

export const initialState = {
  message: "",
  status: "",
  clientId: null as number | null,
};
