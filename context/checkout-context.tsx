"use client";
import { createContext, useContext, useState } from "react";

const CheckoutContext = createContext<any>(null);

export function CheckoutProvider({
  children,
  metodoDePago,
}: {
  children: React.ReactNode;
  metodoDePago: boolean;
}) {
  const [progressStep, setProgressStep] = useState("client-details");
  const [clientId, setClientId] = useState<number | null>(null);
  const [canContinue, setCanContinue] = useState(false);

  const nextStep = () => {
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
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}

export const useCheckout = () => useContext(CheckoutContext);
