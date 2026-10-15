"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { normalizeRif, normalizeSearchName } from "@/lib/client-rules";
import { requireAdmin } from "@/lib/admin/auth";
import type { BulkClientsState, ClientCreateState, ClientPatch } from "@/lib/admin/types";
import { prisma } from "@/lib/prisma";

const clientTypeSchema = z.enum(["detal", "mayorista"]);
const textField = (label: string, max = 120) => z.string().trim().min(1, `${label} es obligatorio.`).max(max, `${label} es demasiado largo.`);
const nullableText = (max = 160) => z.string().trim().max(max).nullable().optional();

const createClientSchema = z.object({
  tipoCliente: clientTypeSchema,
  nombre: textField("El nombre", 80),
  apellido: textField("El apellido", 100),
  rif: z.string().trim().max(20, "El RIF es demasiado largo."),
  celular: z.string().trim().min(8, "El teléfono no es válido.").max(30, "El teléfono es demasiado largo."),
  email: z.string().trim().email("El correo no es válido.").or(z.literal("")),
  direccionTipo: z.string().trim().max(50),
  urbanizacion: z.string().trim().max(120),
  direccion: z.string().trim().max(240),
});

const patchChangesSchema = z.object({
  tipoCliente: clientTypeSchema.optional(),
  nombre: textField("El nombre", 80).optional(),
  apellido: textField("El apellido", 100).optional(),
  rif: nullableText(20),
  celular: z.string().trim().min(8, "El teléfono no es válido.").max(30, "El teléfono es demasiado largo.").optional(),
  email: nullableText(160).refine((value) => value === undefined || value === null || value === "" || z.string().email().safeParse(value).success, "El correo no es válido."),
}).strict().refine((value) => Object.keys(value).length > 0, "La fila no contiene cambios.");

const clientPatchSchema = z.object({
  id: z.number().int().positive(),
  updatedAt: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), "La versión de la fila no es válida."),
  changes: patchChangesSchema,
});

const bulkClientsSchema = z.object({
  clientes: z.array(clientPatchSchema).min(1, "No hay cambios para guardar.").max(100, "Solo puedes guardar hasta 100 clientes por tanda."),
});

type ClientValues = {
  tipoCliente: "detal" | "mayorista";
  nombre: string;
  apellido: string;
  rif: string | null;
  celular: string;
  email: string | null;
};

type ClientIssue = {
  rowId?: number;
  field?: string;
  code: "invalid" | "duplicate" | "stale" | "missing";
  message: string;
};

class ClientActionFailure extends Error {
  constructor(public readonly issues: ClientIssue[]) {
    super(issues.map((issue) => issue.message).join(" "));
  }
}
function fieldIssue(field: string, message: string): ClientActionStateError {
  return { field, message };
}

type ClientActionStateError = { field: string; message: string };

function issueFromZod(error: z.ZodError): ClientActionStateError[] {
  return error.issues.map((issue) => fieldIssue(issue.path.join(".") || "formulario", issue.message));
}

function readText(formData: FormData, name: string) {
  return formData.get(name)?.toString() ?? "";
}

function invalidCreate(message: string, field = "formulario"): ClientCreateState {
  return { success: false, message, issues: [{ field, message }] };
}

function normalizeCreateValues(input: z.infer<typeof createClientSchema>): { values: ClientValues; address: { tipo: string; urbanizacion: string; direccion: string } | null } | { error: ClientCreateState } {
  let rif: string | null;
  try {
    rif = normalizeRif(input.rif);
  } catch (error) {
    return { error: invalidCreate(error instanceof Error ? error.message : "El RIF no es válido.", "rif") };
  }

  if (input.tipoCliente === "mayorista" && !rif) return { error: invalidCreate("El RIF es obligatorio para un mayorista.", "rif") };

  const hasAddress = Boolean(input.direccionTipo || input.urbanizacion || input.direccion);
  if (hasAddress && (!input.direccionTipo || !input.urbanizacion || !input.direccion)) {
    return { error: invalidCreate("Completa tipo, urbanización y dirección inicial.", "direccionInicial") };
  }

  return {
    values: {
      tipoCliente: input.tipoCliente,
      nombre: input.nombre,
      apellido: input.apellido,
      rif,
      celular: input.celular,
      email: input.email || null,
    },
    address: hasAddress ? { tipo: input.direccionTipo, urbanizacion: input.urbanizacion, direccion: input.direccion } : null,
  };
}

function normalizeBulkValues(current: ClientValues, changes: z.infer<typeof patchChangesSchema>): { values: ClientValues; changedFields: string[] } | { issues: ClientIssue[] } {
  const values: ClientValues = {
    tipoCliente: changes.tipoCliente ?? current.tipoCliente,
    nombre: changes.nombre ?? current.nombre,
    apellido: changes.apellido ?? current.apellido,
    rif: current.rif,
    celular: changes.celular ?? current.celular,
    email: changes.email === undefined ? current.email : changes.email || null,
  };
  const issues: ClientIssue[] = [];

  try {
    values.rif = changes.rif === undefined ? current.rif : normalizeRif(changes.rif);
  } catch (error) {
    issues.push({ field: "rif", code: "invalid", message: error instanceof Error ? error.message : "El RIF no es válido." });
  }
  if (values.tipoCliente === "mayorista" && !values.rif) issues.push({ field: "rif", code: "invalid", message: "El RIF es obligatorio para un mayorista." });

  const changedFields = (Object.keys(changes) as Array<keyof ClientValues>).filter((field) => {
    const nextValue = values[field];
    return nextValue !== current[field];
  }).map(String);

  return issues.length > 0 ? { issues } : { values, changedFields };
}

function duplicateIssue(rowId: number, field: string, value: string) {
  return { rowId, field, code: "duplicate" as const, message: `El ${field} ${value} ya pertenece a otro cliente.` };
}

function publicIssues(issues: ClientIssue[]) {
  return issues.map((issue) => ({ ...issue, field: issue.field ?? "formulario" }));
}

function isPrismaUniqueError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function revalidateClientSurfaces() {
  revalidatePath("/admin/clients");
  revalidatePath("/admin/transactions");
  revalidatePath("/admin/add-transaction");
  revalidatePath("/admin/delivery-notes");
}

export async function crearClienteAdministrativo(_previous: ClientCreateState, formData: FormData): Promise<ClientCreateState> {
  const actor = await requireAdmin();
  const parsed = createClientSchema.safeParse({
    tipoCliente: readText(formData, "tipoCliente"),
    nombre: readText(formData, "nombre"),
    apellido: readText(formData, "apellido"),
    rif: readText(formData, "rif"),
    celular: readText(formData, "celular"),
    email: readText(formData, "email"),
    direccionTipo: readText(formData, "direccionTipo"),
    urbanizacion: readText(formData, "urbanizacion"),
    direccion: readText(formData, "direccion"),
  });
  if (!parsed.success) return { success: false, message: "Revisa los campos del cliente.", issues: issueFromZod(parsed.error) };

  const normalized = normalizeCreateValues(parsed.data);
  if ("error" in normalized) return normalized.error;

  try {
    const [phoneConflict, emailConflict, rifConflict] = await Promise.all([
      prisma.cliente.findUnique({ where: { celular: normalized.values.celular }, select: { id: true } }),
      normalized.values.email ? prisma.cliente.findUnique({ where: { email: normalized.values.email }, select: { id: true } }) : null,
      normalized.values.rif ? prisma.cliente.findUnique({ where: { rif: normalized.values.rif }, select: { id: true } }) : null,
    ]);
    if (phoneConflict) return invalidCreate("El teléfono ya pertenece a otro cliente.", "celular");
    if (emailConflict) return invalidCreate("El correo ya pertenece a otro cliente.", "email");
    if (rifConflict) return invalidCreate("El RIF ya pertenece a otro cliente.", "rif");

    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.cliente.create({
        data: {
          ...normalized.values,
          nombreBusqueda: normalizeSearchName(normalized.values.nombre, normalized.values.apellido),
          direcciones: normalized.address ? { create: normalized.address } : undefined,
        },
        select: { id: true },
      });
      await tx.historialCliente.create({
        data: {
          clienteId: client.id,
          actorId: actor.id,
          actorEmail: actor.email,
          accion: "creado",
          camposModificados: ["cliente", ...(normalized.address ? ["direccionInicial"] : [])],
        },
      });
      return client;
    });

    revalidateClientSurfaces();
    return { success: true, message: "Cliente creado correctamente.", clientId: result.id };
  } catch (error) {
    if (isPrismaUniqueError(error)) return invalidCreate("El teléfono, correo o RIF ya pertenece a otro cliente.");
    return { success: false, message: error instanceof Error ? error.message : "No se pudo crear el cliente." };
  }
}

function readBulkClients(formData: FormData) {
  const raw = formData.get("clientes")?.toString() ?? "";
  try {
    return bulkClientsSchema.safeParse(raw ? JSON.parse(raw) : null);
  } catch {
    return { success: false as const, error: { issues: [{ path: ["clientes"], message: "El formato de la edición masiva no es válido." }] } };
  }
}

export async function guardarEdicionMasivaClientes(_previous: BulkClientsState, formData: FormData): Promise<BulkClientsState> {
  const actor = await requireAdmin();
  const parsed = readBulkClients(formData);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => ({ field: issue.path.join(".") || "clientes", message: issue.message }));
    console.error("Payload inválido en edición masiva de clientes:", issues);
    return { success: false, message: "Revisa las filas antes de guardar.", issues };
  }

  const patches = parsed.data.clientes as ClientPatch[];
  const duplicateIds = new Set<number>();
  const duplicateIdIssues: ClientIssue[] = [];
  for (const patch of patches) {
    if (duplicateIds.has(patch.id)) duplicateIdIssues.push({ rowId: patch.id, code: "duplicate", message: "La fila está repetida en la tanda." });
    duplicateIds.add(patch.id);
  }
  if (duplicateIdIssues.length > 0) return { success: false, message: "Hay filas repetidas en la tanda.", issues: publicIssues(duplicateIdIssues) };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const ids = patches.map((patch) => patch.id);
      const currentRows = await tx.cliente.findMany({ where: { id: { in: ids } }, select: { id: true, tipoCliente: true, nombre: true, apellido: true, rif: true, celular: true, email: true, updatedAt: true } });
      const currentById = new Map(currentRows.map((row) => [row.id, row]));
      const issues: ClientIssue[] = [];

      for (const patch of patches) {
        const current = currentById.get(patch.id);
        if (!current) {
          issues.push({ rowId: patch.id, code: "missing", message: "El cliente ya no existe." });
          continue;
        }
        if (current.updatedAt.getTime() !== new Date(patch.updatedAt).getTime()) {
          issues.push({ rowId: patch.id, code: "stale", message: "El cliente cambió mientras editabas la tabla. Recarga la fila antes de guardar." });
        }
      }
      if (issues.length > 0) throw new ClientActionFailure(issues);

      const normalizedRows: Array<{ patch: ClientPatch; current: typeof currentRows[number]; values: ClientValues; changedFields: string[] }> = [];
      for (const patch of patches) {
        const current = currentById.get(patch.id)!;
        const normalized = normalizeBulkValues(current, patch.changes);
        if ("issues" in normalized) {
          issues.push(...normalized.issues.map((issue) => ({ ...issue, rowId: patch.id })));
          continue;
        }
        normalizedRows.push({ patch, current, values: normalized.values, changedFields: normalized.changedFields });
      }
      if (issues.length > 0) throw new ClientActionFailure(issues);

      const fields = ["rif", "celular", "email"] as const;
      for (const field of fields) {
        const finalValues = new Map<string, number>();
        for (const row of normalizedRows) {
          const value = row.values[field];
          if (!value) continue;
          const previous = finalValues.get(value);
          if (previous) issues.push(duplicateIssue(row.patch.id, field, value));
          else finalValues.set(value, row.patch.id);
        }

        const values = [...finalValues.keys()];
        if (values.length === 0) continue;
        const existing = await tx.cliente.findMany({ where: { [field]: { in: values } }, select: { id: true, rif: true, celular: true, email: true } });
        for (const candidate of existing) {
          const finalRow = normalizedRows.find((row) => row.patch.id === candidate.id);
          const candidateValue = candidate[field];
          if (!candidateValue) continue;
          const finalOwnerId = finalValues.get(candidateValue);
          if (finalOwnerId && finalOwnerId !== candidate.id) issues.push(duplicateIssue(finalOwnerId, field, candidateValue));
          if (!finalRow && finalOwnerId) issues.push(duplicateIssue(finalOwnerId, field, candidateValue));
        }
      }
      if (issues.length > 0) throw new ClientActionFailure(issues);

      let updated = 0;
      for (const row of normalizedRows) {
        if (row.changedFields.length === 0) continue;
        const result = await tx.cliente.updateMany({
          where: { id: row.patch.id, updatedAt: row.current.updatedAt },
          data: { ...row.values, nombreBusqueda: normalizeSearchName(row.values.nombre, row.values.apellido) },
        });
        if (result.count !== 1) throw new ClientActionFailure([{ rowId: row.patch.id, code: "stale", message: "El cliente cambió mientras se guardaba la tanda." }]);
        await tx.historialCliente.create({ data: { clienteId: row.patch.id, actorId: actor.id, actorEmail: actor.email, accion: "actualizado", camposModificados: row.changedFields } });
        updated += 1;
      }
      return { updated };
    });

    revalidateClientSurfaces();
    return { success: true, message: `${result.updated} cliente(s) actualizado(s).`, updated: result.updated };
  } catch (error) {
    console.error("Error al guardar edición masiva de clientes:", error);
    if (error instanceof ClientActionFailure) return { success: false, message: "No se guardó ninguna fila. Corrige los conflictos indicados.", issues: publicIssues(error.issues) };
    if (isPrismaUniqueError(error)) return { success: false, message: "No se guardó ninguna fila porque existe un identificador duplicado." };
    return { success: false, message: error instanceof Error ? error.message : "No se pudo guardar la edición masiva." };
  }
}
