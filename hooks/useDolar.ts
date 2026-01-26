import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export function useDolar() {
  const { data, error, isLoading } = useSWR(
    "https://ve.dolarapi.com/v1/dolares", // Usaremos una ruta interna para mejor control
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      // Si el componente se monta, SWR verificará si el dato tiene más de 24h
      dedupingInterval: 3600000 * 12, // 12 horas de caché garantizado
    },
  );

  return {
    tasa: data?.[0]?.promedio || 0,
    error,
    isLoading,
  };
}
