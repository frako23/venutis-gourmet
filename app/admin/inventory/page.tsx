import { InventoryTable } from "@/components/admin/inventario/inventoryTable";
import { prisma } from "@/lib/prisma";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InventoryManager({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const selectedType = first(params.tipo)?.trim() ?? "";
  const where = selectedType ? { categoria: selectedType } : undefined;

  const [products, typeRows] = await Promise.all([
    prisma.producto.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { imagenes: true },
    }),
    prisma.producto.findMany({
      select: { categoria: true },
      distinct: ["categoria"],
    }),
  ]);

  const productTypes = Array.from(
    new Set(typeRows.map((row) => row.categoria.trim()).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" }));

  return <InventoryTable products={products} productTypes={productTypes} selectedType={selectedType} />;
}
