import { redirect } from "next/navigation";

export default function StorefrontEntry() {
  redirect("/productos/consumidores?contexto=consumidor");
}
