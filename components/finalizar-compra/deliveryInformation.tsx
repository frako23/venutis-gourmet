import { useCheckout } from "@/context/checkoutContext";
import { useAppStore } from "@/store/appStore";
import { Store, Truck } from "lucide-react";
import { CheckoutButton } from "../global/checkoutButton";
import { AddressManager } from "./addressManager";

export const DeliveryInformation = () => {
  const deliveryMethod = useAppStore((s) => s.deliveryMethod);
  const deliveryPrice = useAppStore((s) => s.deliveryPrice);
  const selectedAddressId = useAppStore((s) => s.selectedAddressId);
  const setDeliveryMethod = useAppStore((s) => s.setDeliveryMethod);
  const setDeliveryPrice = useAppStore((s) => s.setDeliveryPrice);
  const setSelectedAddressId = useAppStore((s) => s.setSelectedAddressId);

  const { nextStep, canContinue, setCanContinue } = useCheckout();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Truck className="text-accent-gold" size={24} />
        <h3 className="text-lg font-bold tracking-tight">Método de Entrega</h3>
      </div>
      <div className="grid grid-cols-2 gap-4 p-1 bg-input-dark rounded-xl border border-white/5">
        <button
          type="button"
          onClick={() => {
            setDeliveryMethod("envio");
            setCanContinue(false);
          }}
          className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${deliveryMethod === "envio" ? "bg-gold text-primary shadow-lg" : "opacity-60 hover:bg-white/5"}`}
        >
          <Truck size={16} /> Domicilio
        </button>
        <button
          type="button"
          onClick={() => {
            setDeliveryMethod("recogida");
            setDeliveryPrice(0);
            setSelectedAddressId(null);
            setCanContinue(true);
          }}
          className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${deliveryMethod === "recogida" ? "bg-gold text-primary shadow-lg" : "opacity-60 hover:bg-white/5"}`}
        >
          <Store size={16} /> Retiro en Tienda
        </button>
      </div>

      {deliveryMethod === "envio" ? <AddressManager /> : null}
      <CheckoutButton
        isPending={false}
        type="button"
        onClick={() => nextStep()}
      />

      <p className="text-center text-[11px] opacity-50">
        {deliveryMethod === "envio"
          ? selectedAddressId && deliveryPrice > 0
            ? `Cargo de delivery: $${deliveryPrice.toFixed(2)}`
            : "Selecciona una dirección válida para continuar."
          : canContinue
            ? "Retiro en tienda sin cargo de delivery."
            : "Selecciona una modalidad de entrega."}
      </p>
    </div>
  );
};
