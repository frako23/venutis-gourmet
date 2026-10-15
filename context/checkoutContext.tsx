"use client";
import { OrderSuccessProps } from "@/components/finalizar-compra/orderSuccess";
import { createContext, useContext, useState } from "react";

export type CheckoutProgressStep =
  | "client-details"
  | "delivery-method"
  | "payment-method"
  | "confirmation";

type CheckoutContextValue = {
  progressStep: CheckoutProgressStep;
  setProgressStep: (step: CheckoutProgressStep) => void;
  nextStep: () => void;
  clientId: number | null;
  setClientId: (id: number | null) => void;
  canContinue: boolean;
  setCanContinue: (value: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  orderFinished: OrderSuccessProps | null;
  setOrderFinished: (value: OrderSuccessProps | null) => void;
};

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

export function CheckoutProvider({
  children,
  metodoDePago,
}: {
  children: React.ReactNode;
  metodoDePago: boolean;
}) {
  const [progressStep, setProgressStep] =
    useState<CheckoutProgressStep>("client-details");
  const [clientId, setClientId] = useState<number | null>(null);
  const [canContinue, setCanContinue] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderFinished, setOrderFinished] = useState<OrderSuccessProps | null>(
    null,
  );

  const nextStep = () => {
    if (!canContinue) return;
    if (progressStep === "client-details") setProgressStep("delivery-method");
    else if (progressStep === "delivery-method")
      setProgressStep(metodoDePago ? "payment-method" : "confirmation");
    else if (progressStep === "payment-method") setProgressStep("confirmation");
  };

  return (
    <CheckoutContext.Provider
      value={{
        progressStep,
        setProgressStep,
        nextStep,
        clientId,
        setClientId,
        canContinue,
        setCanContinue,
        isSubmitting,
        setIsSubmitting,
        orderFinished,
        setOrderFinished,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}

export const useCheckout = () => {
  const context = useContext(CheckoutContext);
  if (!context) throw new Error("useCheckout debe usarse dentro de CheckoutProvider");
  return context;
};
