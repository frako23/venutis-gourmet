import { useCheckout } from "@/context/checkout-context";
import { ArrowRight } from "lucide-react";

export const CheckoutButton = ({
  type,
  onClick,
}: {
  isPending: boolean;
  type: "submit" | "button";
  onClick?: () => void;
}) => {
  const { progressStep, canContinue } = useCheckout();
  let message = "Continuar";
  if (progressStep === "client-details") message = "Continuar a Entrega";
  else if (progressStep === "delivery-method") message = "Continuar a Pago";
  else if (progressStep === "payment-method") message = "Confirmar Pedido";
  else if (progressStep === "confirmation") message = "Finalizar Compra";

  return (
    <div className="pt-6">
      <button
        disabled={!canContinue}
        className={`w-full py-5 rounded-xl font-bold text-lg transition-all transform flex items-center justify-center gap-3
          ${
            !canContinue
              ? "bg-white/5 text-white/20 cursor-not-allowed shadow-none"
              : "bg-gold hover:bg-gold/90 text-primary shadow-[0_10px_30px_rgba(128,0,32,0.3)] active:scale-[0.98] cursor-pointer"
          }`}
        onClick={onClick}
        type={type}
      >
        {message}
        <ArrowRight size={20} />
      </button>
    </div>
  );
};
