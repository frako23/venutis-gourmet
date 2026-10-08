import { redirect } from "next/navigation";

export default function MayoristaPage() {
  redirect("/productos/consumidores?contexto=mayorista");
}
