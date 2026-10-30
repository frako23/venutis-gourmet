import { useCheckout } from "@/context/checkoutContext";
import { useDolar } from "@/hooks/useDolar";
import { CheckoutData, procesarCompra } from "@/lib/actions/checkout";
import {
  initialState,
  PAYMENT_DETAILS,
} from "@/lib/constants/constants";
import {
  SupportedPaymentMethod,
  validatePaymentInput,
} from "@/lib/checkout-rules";
import { useAppStore } from "@/store/appStore";
import { MetodoPago } from "@prisma/client";
import { Banknote, CreditCard, Landmark, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { toast } from "sonner";
import { CheckoutButton } from "../global/checkoutButton";
import { BeneficiosCliente, SIN_BENEFICIOS, type SeleccionBeneficios } from "./beneficiosCliente";
import { InputField } from "../global/input";
import { CopyButton } from "../productos/copyToClipboard";

interface PaymentDetails {
  fechaPago: Date | null;
  montoUsd: number;
  montoBs: number;
  referencia: string;
  metodoPago: SupportedPaymentMethod;
  tasaCambio: number;
}

function createPaymentRecord(
  metodoPago: SupportedPaymentMethod,
  totalUsd: number,
  tasaCambio: number,
): PaymentDetails {
  return {
    metodoPago,
    fechaPago: metodoPago === "EfectivoUsd" ? null : new Date(),
    montoUsd: Number(totalUsd.toFixed(2)),
    montoBs: Number((totalUsd * tasaCambio).toFixed(2)),
    referencia: "",
    tasaCambio,
  };
}

export const PaymentInformation = () => {
  const router = useRouter();
  const { tasa } = useDolar();
  const [paymentMethod, setPaymentMethod] = useState<SupportedPaymentMethod>("PagoMovil");
  const [paymentRecord, setPaymentRecord] = useState<PaymentDetails | null>(null);
  const idempotencyKey = useRef<string>("");
  const deliveryMethod = useAppStore((s) => s.deliveryMethod);
  const selectedAddressId = useAppStore((s) => s.selectedAddressId);
  const selectedProducts = useAppStore((s) => s.selectedProducts);
  const totalUSD = useAppStore((s) => s.totalUSD);
  const deliveryPrice = useAppStore((s) => s.deliveryPrice);
  const purchaseContext = useAppStore((s) => s.purchaseContext);
  const client = useAppStore((s) => s.client);
  const { setCanContinue, setIsSubmitting, isSubmitting } = useCheckout();
  // La selección de beneficios solo importa en este paso: vive en estado local y no en el store del checkout.
  const [beneficios, setBeneficios] = useState<SeleccionBeneficios>(SIN_BENEFICIOS);
  const [recargaBeneficios, setRecargaBeneficios] = useState(0);
  const totalPedidoUSD = totalUSD + deliveryPrice;
  // Lo que aún se debe pagar después de los premios y el saldo a favor.
  const finalTotalUSD = Math.max(0, Math.round((totalPedidoUSD - beneficios.descuentoPuntosUsd - beneficios.saldoAFavorUsd) * 100) / 100);
  const sinPago = finalTotalUSD <= 0;

  useEffect(() => {
    setPaymentRecord((previous) => {
      const next = createPaymentRecord(paymentMethod, finalTotalUSD, tasa);
      return previous && previous.metodoPago === paymentMethod
        ? { ...next, referencia: previous.referencia, fechaPago: previous.fechaPago }
        : next;
    });
  }, [paymentMethod, finalTotalUSD, tasa]);

  useEffect(() => {
    const valid = Boolean(
      (sinPago || (paymentRecord && validatePaymentInput(paymentRecord, finalTotalUSD).ok)) &&
        client?.id &&
        selectedProducts.length > 0 &&
        (deliveryMethod === "recogida" || selectedAddressId),
    );
    setCanContinue(valid);
  }, [
    client?.id,
    deliveryMethod,
    finalTotalUSD,
    paymentRecord,
    selectedAddressId,
    selectedProducts.length,
    setCanContinue,
    sinPago,
  ]);

  const updatePaymentRecord = (patch: Partial<PaymentDetails>) => {
    setPaymentRecord((previous) => ({
      ...(previous ?? createPaymentRecord(paymentMethod, finalTotalUSD, tasa)),
      ...patch,
    }));
  };

  const handleSubmit = async () => {
    if (!client?.id || !selectedProducts.length || (!sinPago && !paymentRecord)) return;
    if (deliveryMethod === "envio" && !selectedAddressId) {
      toast.error("Selecciona una dirección de delivery.");
      return;
    }
    if (!sinPago && paymentRecord) {
      const validation = validatePaymentInput(paymentRecord, finalTotalUSD);
      if (!validation.ok) {
        toast.error(validation.message);
        return;
      }
    }

    if (!idempotencyKey.current) {
      const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
      idempotencyKey.current = `quick-${Date.now()}-${random}`;
    }
    setIsSubmitting(true);
    const carrito = selectedProducts.map((item) => ({
      productoId: item.id,
      cantidad: item.cantidad,
      precio: item.precio,
    }));
    const datos: CheckoutData = {
      clientId: client.id,
      contexto: purchaseContext,
      tipodeRetiro: deliveryMethod,
      direccionId: deliveryMethod === "envio" ? selectedAddressId : null,
      claveIdempotencia: idempotencyKey.current,
      carrito,
      beneficios: beneficios.premioIds.length > 0 || beneficios.saldoAFavorUsd > 0 ? { premioIds: beneficios.premioIds, saldoAFavorUsd: beneficios.saldoAFavorUsd } : undefined,
      pago: sinPago || !paymentRecord
        ? null
        : {
            montoBs: paymentRecord.montoBs,
            montoUsd: paymentRecord.montoUsd,
            metodoPago: paymentRecord.metodoPago as MetodoPago,
            referencia: paymentRecord.metodoPago === "EfectivoUsd" ? null : paymentRecord.referencia,
            fechaPago: paymentRecord.metodoPago === "EfectivoUsd" ? null : paymentRecord.fechaPago,
            tasaCambio: paymentRecord.tasaCambio,
          },
    };

    try {
      const response = await procesarCompra(initialState, datos);
      if (response.success) {
        useAppStore.setState({
          selectedProducts: [],
          totalUSD: 0,
          clientId: null,
          client: null,
          selectedAddressId: null,
          deliveryPrice: 0,
          canContinue: false,
        });
        router.push(`/confirmacion?id=${response.transactionId}`);
      } else {
        idempotencyKey.current = "";
        toast.error(response.message);
        // Los puntos, el saldo o un premio cambiaron: se recargan los beneficios y se vuelve a elegir.
        if (response.code === "BENEFITS_CHANGED") {
          setBeneficios(SIN_BENEFICIOS);
          setRecargaBeneficios((veces) => veces + 1);
        }
      }
    } catch {
      idempotencyKey.current = "";
      toast.error("No pudimos registrar el pedido. Tu carrito sigue disponible.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateForInput = (date: Date | null | undefined) => {
    if (!date || Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  };

  const selectPaymentMethod = (method: SupportedPaymentMethod) => {
    setPaymentMethod(method);
    setPaymentRecord(createPaymentRecord(method, finalTotalUSD, tasa));
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <div className="flex items-center gap-3">
        <CreditCard className="text-accent-gold" size={24} />
        <h3 className="text-lg font-bold tracking-tight">Método de Pago</h3>
      </div>

      <BeneficiosCliente key={recargaBeneficios} subtotalUsd={totalUSD} totalUsd={totalPedidoUSD} onChange={setBeneficios} />

      {sinPago ? (
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 text-sm">
          <p className="text-accent-gold font-bold">Tus beneficios cubren todo el pedido.</p>
          <p className="mt-1 opacity-70">No hay nada que pagar: al confirmar, tu pedido queda pagado.</p>
        </div>
      ) : (
      <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PaymentOption id="PagoMovil" label="Pago Móvil" icon={Smartphone} selected={paymentMethod === "PagoMovil"} onClick={() => selectPaymentMethod("PagoMovil")} />
        <PaymentOption id="Zelle" label="Zelle" icon={Smartphone} selected={paymentMethod === "Zelle"} onClick={() => selectPaymentMethod("Zelle")} />
        <PaymentOption id="TransferenciaBs" label="Transferencia" icon={Landmark} selected={paymentMethod === "TransferenciaBs"} onClick={() => selectPaymentMethod("TransferenciaBs")} />
        <PaymentOption id="EfectivoUsd" label="Efectivo" icon={Banknote} selected={paymentMethod === "EfectivoUsd"} onClick={() => selectPaymentMethod("EfectivoUsd")} />
      </div>

      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
        <div className="flex justify-between items-center mb-4 gap-3">
          <h4 className="text-xs uppercase tracking-[2px] font-bold text-accent-gold">Instrucciones de Pago</h4>
          <span className="text-[10px] bg-white/10 px-2 py-1 rounded-md opacity-60">Moneda: {PAYMENT_DETAILS[paymentMethod].currency}</span>
        </div>
        <p className="text-sm text-accent-gold mb-4">Total a pagar: ${finalTotalUSD.toFixed(2)} / Bs. {(finalTotalUSD * tasa).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>

        {paymentMethod === "PagoMovil" && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="opacity-40 text-[10px] uppercase">Banco</p><p>{PAYMENT_DETAILS.PagoMovil.bank}</p><CopyButton text={`${PAYMENT_DETAILS.PagoMovil.phone}\n${PAYMENT_DETAILS.PagoMovil.id}\nBs ${(finalTotalUSD * tasa).toFixed(2)}`} /></div>
            <div><p className="opacity-40 text-[10px] uppercase">Teléfono</p><p>{PAYMENT_DETAILS.PagoMovil.phone}</p></div>
            <div><p className="opacity-40 text-[10px] uppercase">Cédula/RIF</p><p>{PAYMENT_DETAILS.PagoMovil.id}</p></div>
          </div>
        )}
        {paymentMethod === "Zelle" && (
          <div className="space-y-2 text-sm"><p className="opacity-40 text-[10px] uppercase">Correo Zelle</p><p className="text-lg">{PAYMENT_DETAILS.Zelle.email}</p><CopyButton text={`${PAYMENT_DETAILS.Zelle.email}\nMonto: $${finalTotalUSD.toFixed(2)}`} /><p className="opacity-40 text-[10px] uppercase pt-2">A nombre de</p><p>{PAYMENT_DETAILS.Zelle.name}</p></div>
        )}
        {paymentMethod === "TransferenciaBs" && (
          <div className="space-y-3 text-sm"><p className="opacity-40 text-[10px] uppercase">Cuenta corriente</p><p className="font-mono text-xs">{PAYMENT_DETAILS.TransferenciaBs.account}</p><CopyButton text={PAYMENT_DETAILS.TransferenciaBs.account} /><p>{PAYMENT_DETAILS.TransferenciaBs.bank} · {PAYMENT_DETAILS.TransferenciaBs.id}</p></div>
        )}
        {paymentMethod === "EfectivoUsd" && <p className="text-sm opacity-80">{PAYMENT_DETAILS.EfectivoUsd.instructions}</p>}
        <p className="mt-4 text-[11px] leading-relaxed opacity-50 border-t border-white/5 pt-4 italic">{PAYMENT_DETAILS[paymentMethod].instructions}</p>
      </div>

      {paymentMethod !== "EfectivoUsd" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <InputField label="Fecha del Pago" name="fechaPago" type="date" value={formatDateForInput(paymentRecord?.fechaPago)} onChange={(event: ChangeEvent<HTMLInputElement>) => updatePaymentRecord({ fechaPago: event.target.value ? new Date(`${event.target.value}T12:00:00`) : null })} required />
            <InputField label="Monto en $" name="montoUsd" type="number" value={paymentRecord?.montoUsd ?? 0} onChange={(event: ChangeEvent<HTMLInputElement>) => updatePaymentRecord({ montoUsd: Number(event.target.value) })} required />
            <InputField label="Monto en Bs" name="montoBs" type="number" value={paymentRecord?.montoBs ?? 0} onChange={(event: ChangeEvent<HTMLInputElement>) => updatePaymentRecord({ montoBs: Number(event.target.value) })} required />
          </div>
          <InputField label="Referencia del Pago" name="referencia" type="text" value={paymentRecord?.referencia ?? ""} onChange={(event: ChangeEvent<HTMLInputElement>) => updatePaymentRecord({ referencia: event.target.value })} required />
        </>
      )}

      <div className="text-xs opacity-60">Tasa utilizada: Bs. {tasa.toFixed(2)} por USD. El pago declarado no se considera cobrado hasta su confirmación operativa.</div>
      </>
      )}
      <CheckoutButton isPending={isSubmitting} type="submit" />
    </form>
  );
};

function PaymentOption({ id, label, icon: Icon, selected, onClick }: { id: string; label: string; icon: typeof Smartphone; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={selected} aria-label={`Elegir ${label}`} onClick={onClick} className={`cursor-pointer flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${selected ? "border-accent-gold bg-accent-gold/5" : "border-white/10 bg-input-dark"}`}>
      <Icon className={selected ? "text-accent-gold" : "text-white/40"} size={24} />
      <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
      <span className="sr-only">{id}</span>
    </button>
  );
}
