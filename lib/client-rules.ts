export type ClientType = "detal" | "mayorista";

const RIF_PREFIX_VALUES: Record<string, number> = {
  V: 4,
  E: 8,
  J: 12,
  P: 16,
  G: 20,
};

const RIF_BODY_WEIGHTS = [3, 2, 7, 6, 5, 4, 3, 2] as const;

export function normalizeSearchName(...parts: string[]) {
  return parts
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}
export function normalizeRifInput(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase().replace(/[\s-]/g, "");
}

export function calculateRifCheckDigit(prefix: string, body: string) {
  const normalizedPrefix = prefix.trim().toUpperCase();
  const normalizedBody = body.trim();
  const prefixValue = RIF_PREFIX_VALUES[normalizedPrefix];

  if (!prefixValue || !/^\d{8}$/.test(normalizedBody)) {
    throw new Error("El RIF debe tener un prefijo válido y ocho dígitos base.");
  }

  const sum = prefixValue + normalizedBody.split("").reduce((total, digit, index) => total + Number(digit) * RIF_BODY_WEIGHTS[index], 0);
  const checkDigit = 11 - (sum % 11);
  return checkDigit === 10 || checkDigit === 11 ? 0 : checkDigit;
}

export function validateRif(value: string | null | undefined): string | null {
  const compact = normalizeRifInput(value);
  if (!compact) return null;

  const match = /^(V|E|J|G|P)(\d{8})(\d)$/.exec(compact);
  if (!match) return "Usa un RIF con prefijo y nueve dígitos, por ejemplo J123456789.";

  const expected = calculateRifCheckDigit(match[1], match[2]);
  if (Number(match[3]) !== expected) return "El dígito verificador del RIF no es válido.";
  return null;
}

export function normalizeRif(value: string | null | undefined) {
  const compact = normalizeRifInput(value);
  if (!compact) return null;
  const error = validateRif(compact);
  if (error) throw new Error(error);
  return compact;
}

export function formatRif(value: string | null | undefined) {
  const compact = normalizeRifInput(value);
  if (!compact) return "Sin RIF";
  if (!/^[VEJGP]\d{9}$/.test(compact)) return compact;
  return `${compact.slice(0, 1)}-${compact.slice(1, 9)}-${compact.slice(9)}`;
}

export function clientTypeLabel(type: ClientType) {
  return type === "mayorista" ? "Mayorista" : "Consumidor";
}
