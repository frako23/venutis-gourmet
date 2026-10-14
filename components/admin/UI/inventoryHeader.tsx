"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export const InventoryHeader = ({
  productTypes,
  selectedType,
}: {
  productTypes: string[];
  selectedType: string;
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function changeType(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("tipo", value);
    else params.delete("tipo");
    params.delete("page");
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  return <label className="flex min-w-0 items-center gap-3 text-xs font-bold text-[#707970]">
    <span className="whitespace-nowrap">Tipo de producto</span>
    <select aria-label="Filtrar por tipo de producto" value={selectedType} onChange={(event) => changeType(event.target.value)} disabled={isPending} className="admin-field min-w-44 py-2 text-xs normal-case tracking-normal">
      <option value="">Todos los tipos</option>
      {productTypes.map((type) => <option key={type} value={type}>{type}</option>)}
    </select>
  </label>;
};
