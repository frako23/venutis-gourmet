import { CheckoutProvider, useCheckout } from "@/context/checkout-context";
import { addClient } from "@/lib/actions/clients";
import { initialState } from "@/lib/constants/constants";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { CheckoutLoader } from "./checkout-loader";
import { DeliveryInformation } from "./delivery-information";
import { OrderSuccess } from "./order-success";
import { PaymentInformation } from "./payment-information";
import { PersonalInformation } from "./personal-information";

export const CheckoutForm = ({ metodoDePago }: { metodoDePago: boolean }) => {
  const [state] = useActionState(addClient, initialState);
  useEffect(() => {
    if (state.status === "error") {
      toast.error(state.message || "Ocurrió un error inesperado");
    }

    if (state.status === "success") {
      toast.success(
        state.message || "¡Datos del cliente guardados correctamente!",
      );
    }
  }, [state]); // Escuchamos el objeto de estado completo

  return (
    <CheckoutProvider metodoDePago={metodoDePago}>
      <CheckoutContent metodoDePago={metodoDePago} />
    </CheckoutProvider>
  );
};

const CheckoutContent = ({ metodoDePago }: { metodoDePago: boolean }) => {
  const { progressStep, isSubmitting, orderFinished } = useCheckout();

  return (
    <div className="lg:col-span-7">
      <div className="bg-surface-dark rounded-2xl p-8 border border-white/5 shadow-2xl space-y-10">
        {/* Progress Stepper */}

        {isSubmitting && <CheckoutLoader />}

        <div className="flex justify-between items-center px-4 relative">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10 -z-0"></div>
          <Step
            number={1}
            label="Detalles del cliente"
            active={progressStep === "client-details"}
          />
          <Step
            number={2}
            label="Entrega"
            active={progressStep === "delivery-method"}
          />
          {metodoDePago && (
            <>
              <Step
                number={3}
                label="Pago"
                active={progressStep === "payment-method"}
              />
              <Step
                number={4}
                label="Confirmar"
                active={progressStep === "confirmation"}
              />
            </>
          )}
        </div>

        {progressStep === "client-details" ? (
          <PersonalInformation />
        ) : progressStep === "delivery-method" ? (
          <DeliveryInformation />
        ) : progressStep === "payment-method" ? (
          <PaymentInformation />
        ) : (
          <OrderSuccess
            orderId={orderFinished?.orderId || 0}
            resumen={orderFinished?.resumen || {}}
          />
        )}
      </div>
    </div>
  );
};

function Step({ number, label, active = false }: any) {
  return (
    <div className="relative z-10 flex flex-col items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-surface-dark ${active ? "bg-primary text-white" : "bg-input-dark border border-white/10 opacity-60"}`}
      >
        {number}
      </div>
      <span
        className={`text-[10px] uppercase font-bold tracking-tighter ${!active && "opacity-40"}`}
      >
        {label}
      </span>
    </div>
  );
}
