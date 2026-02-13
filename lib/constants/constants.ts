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

export const DELIVERY_ZONES = [
  // ZONA $3
  { name: "Altamira", price: 3 },
  { name: "Alto Prado", price: 3 },
  { name: "Av. Andrés Bello", price: 3 },
  { name: "Av. Lecuna (Centro)", price: 3 },
  { name: "Av. Libertador", price: 3 },
  { name: "Av. Panteón", price: 3 },
  { name: "Av. Victoria (Presidente Medina)", price: 3 },
  { name: "Bellas Artes", price: 3 },
  { name: "Bello Monte", price: 3 },
  { name: "Catia", price: 3 },
  { name: "Cautimare", price: 3 },
  { name: "Cerro Verde", price: 3 },
  { name: "Chacao", price: 3 },
  { name: "Chacaito", price: 3 },
  { name: "Chuao", price: 3 },
  { name: "Chulavista", price: 3 },
  { name: "Club Hípico", price: 3 },
  { name: "Colinas del Tamanaco", price: 3 },
  { name: "Colinas de Vista Alegre", price: 3 },
  { name: "Colina de Los Ruices", price: 3 },
  { name: "Concresa", price: 3 },
  { name: "Cumbres de Curumo", price: 3 },
  { name: "El Cafetal", price: 3 },
  { name: "El Llanito", price: 3 },
  { name: "El Marqués", price: 3 },
  { name: "El Paraiso", price: 3 },
  { name: "El Rosal", price: 3 },
  { name: "El Valle", price: 3 },
  { name: "Fuerte Tiuna", price: 3 },
  { name: "La Castellana", price: 3 },
  { name: "La Candelaria", price: 3 },
  { name: "La Floresta", price: 3 },
  { name: "La Pastora", price: 3 },
  { name: "Las Mercedes", price: 3 },
  { name: "Las Palmas", price: 3 },
  { name: "Los Campitos", price: 3 },
  { name: "Los Caobos", price: 3 },
  { name: "Los Dos Caminos", price: 3 },
  { name: "Plaza Venezuela", price: 3 },
  { name: "Los Chaguaramos", price: 3 },
  { name: "Los Chorros", price: 3 },
  { name: "Los Naranjos", price: 3 },
  { name: "Los Palos Grandes", price: 3 },
  { name: "Los Símbolos", price: 3 },
  { name: "Montalban I", price: 3 },
  { name: "Montalban II", price: 3 },
  { name: "Montalban III", price: 3 },
  { name: "Prados del Este", price: 3 },
  { name: "Parque Central", price: 3 },
  { name: "Sabana Grande", price: 3 },
  { name: "San Bernardino", price: 3 },
  { name: "San Luis", price: 3 },
  { name: "San Martín", price: 3 },
  { name: "Santa Inés", price: 3 },
  { name: "Santa Fe", price: 3 },
  { name: "Santa Monica", price: 3 },
  { name: "Santa Paula", price: 3 },
  { name: "Santa Rosa de Lima", price: 3 },
  { name: "Sebucan", price: 3 },
  { name: "Terrazas de las Acacias", price: 3 },
  { name: "Terrazas del Club Hípico", price: 3 },
  { name: "Valle Abajo", price: 3 },
  { name: "Vista Alegre", price: 3 },
  { name: "Vizcaya", price: 3 },

  // ZONA $4
  { name: "Artigas", price: 4 },
  { name: "Av. Baralt", price: 4 },
  { name: "Baruta", price: 4 },
  { name: "Boleita Norte", price: 4 },
  { name: "Boleita Sur", price: 4 },
  { name: "Colinas de Bello Monte", price: 4 },
  { name: "Colinas de Valle Arriba", price: 4 },
  { name: "La Alameda", price: 4 },
  { name: "La Bonita", price: 4 },
  { name: "La Tahona", price: 4 },
  { name: "La Trinidad", price: 4 },
  { name: "Lomas Prados del Este", price: 4 },
  { name: "Los Samanes", price: 4 },
  { name: "Terrazas de Santa Inés", price: 4 },
  { name: "Terrazas del Ávila", price: 4 },
  { name: "Valle Arriba", price: 4 },

  // ZONA $5
  { name: "El Hatillo", price: 5 },
  { name: "Macaracuay", price: 5 },
  { name: "La Boyera", price: 5 },
  { name: "La Urbina", price: 5 },
  { name: "La Lagunita", price: 5 },
  { name: "Urb. Miranda", price: 5 },

  // ZONA $6
  { name: "Alto Hatillo", price: 6 },
  { name: "Caricuao", price: 6 },
  { name: "El Encantado", price: 6 },
  { name: "Oripoto", price: 6 },
];

export const PRODUCT_ORDER: Record<string, number> = {
  // PASTAS
  "RAVIOLI DE CARNE": 1, // Nota: Si el nombre cambia, ajústalo aquí
  "RAVIOLI DE RICOTTA Y ESPINACA": 2,
  "RAVIOLI DE RICOTTA Y AJOPORRO": 3,
  "RAVIOLI DE RICOTTA Y CHAMPIÑONES": 4,
  "RAVIOLI DE RICOTTA Y TOCINETA AHUMADA": 5,
  "TORTELLONI DE RICOTTA Y ESPINACA": 6,
  "TORTELLINI DE CARNE": 7,
  "GNOCCHI DE PAPAS": 8,
  "GNOCCHI DE AUYAMA": 9,
  "MEZZALUNA DE CAMARONES": 10,
  FUSILLI: 11,
  CAVATELLI: 12,
  TAGLIATELLE: 13,
  "TAGLIATELLE DI SEPPIA": 14,

  // PASTICHOS
  "PASTICHO TRADICIONAL": 15,
  "PASTICHO FAMILIAR": 16,
  "LASAGNA MINI ALBONDIGAS": 17,
  "BERENJENA A LA PARMESSANA": 18,

  // SALSAS
  "SALSA NAPOLI": 19,
  "SALSA BOLOGNA": 20,
  "SALSA ATÚN": 21,
  "SALSA CREMA DE CHAMPIÑÓN": 22,
  "SALSA CUATRO QUESOS": 23,
  "SALSA PESTO DE ALBAHACA": 24,

  // POSTRES
  "TRUFAS DE CHOCOLATE": 25,
  "PANQUÉ DE LIMÓN": 26,

  // BAKERY
  "PAN DE JAMÓN": 27,
};

export const CATEGORIAS = [
  { id: "TODOS", label: "Todos", icon: LayoutGrid },
  { id: "PASTAS", label: "Pastas", icon: CookingPot },
  { id: "SALSAS", label: "Salsas", icon: Soup },
  { id: "PASTICHOS", label: "Pastichos", icon: SquareStack },
  { id: "POSTRES", label: "Postres", icon: CakeSlice },
  { id: "BAKERY", label: "Bakery", icon: Wheat },
];
