"use client";

import { useDolar } from "@/hooks/useDolar";

export const SinglePagePricetag = ({ precio }: { precio: number }) => {
  const { tasa } = useDolar();

  return (
    <p className="text-3xl font-bold text-gold mb-8">
      <span className="text-xl font-bold text-gold mb-8">$</span>
      {precio.toFixed(2)}
      <span className="text-lg font-normal text-white ml-2">
        Bs.{" "}
        {(precio * tasa).toLocaleString("es-VE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
    </p>
  );
};
