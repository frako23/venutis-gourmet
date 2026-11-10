// 1. Definimos la unión de tipos para los métodos

import { Cliente } from "@prisma/client";
import {
  CakeSlice,
  CookingPot,
  LayoutGrid,
  Soup,
  SquareStack,
  Wheat,
} from "lucide-react";

interface PaymentMethodDetails {
  [key: string]: any;
  instructions: string;
  currency: string;
}

export const PAYMENT_DETAILS: Record<string, PaymentMethodDetails> = {
  PagoMovil: {
    bank: "Banco Mercantil",
    phone: "0424-2507784",
    id: "V-12.749.042",
    currency: "Bs.",
    instructions:
      "Recuerda capturar el comprobante con el número de referencia.",
  },
  Zelle: {
    email: "venutiss@gmail.com",
    name: "Antonieta Di Domenico Venuti",
    currency: "USD",
    instructions: "Por favor, indica tu nombre en el motivo del pago.",
  },
  TransferenciaBs: {
    bank: "Banco Mercantil",
    account: "01050242011242029354",
    name: "Antonieta Di Domenico Venuti",
    id: "V-12.749.042",
    currency: "Bs.",
    instructions:
      "Envía el comprobante con el número de referencia al confirmar tu pedido.",
  },
  EfectivoUsd: {
    instructions:
      "El pago en efectivo se realiza directamente al delivery al recibir el pedido.",
    currency: "USD / Bs.",
    note: "Asegúrate de tener el monto exacto o indicar si necesitas cambio.",
  },
};

export const initialState = {
  message: "",
  status: "",
  clientId: null as number | null,
};

export const initialStateClient = {
  message: "",
  status: "",
  client: null as Cliente | null,
};

export const CATEGORIAS = [
  { id: "TODOS", label: "Todos", icon: LayoutGrid },
  { id: "PASTAS", label: "Pastas", icon: CookingPot },
  { id: "SALSAS", label: "Salsas", icon: Soup },
  { id: "PASTICHOS", label: "Pastichos", icon: SquareStack },
  { id: "POSTRES", label: "Postres", icon: CakeSlice },
  { id: "BAKERY", label: "Bakery", icon: Wheat },
];

export const WHATSAPP_PHONE_NUMBER = "+584141713932";

export const VENUTIS_EMAIL = "venutiss@gmail.com";
