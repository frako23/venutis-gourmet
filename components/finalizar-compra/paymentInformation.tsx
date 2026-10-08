import { useCheckout } from "@/context/checkoutContext";
import { useDolar } from "@/hooks/useDolar";
import { CheckoutData, procesarCompra } from "@/lib/actions/checkout";
import { initialState, PAYMENT_DETAILS } from "@/lib/constants/constants";
import { useAppStore } from "@/store/appStore";
import { MetodoPago } from "@prisma/client";
import { Banknote, CreditCard, Landmark, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckoutButton } from "../global/checkoutButton";
import { InputField } from "../global/input";
import { CopyButton } from "../productos/copyToClipboard";

interface PaymentDetails {
  fechaPago: Date;
  montoUsd: number;
  montoBs: number;
  referencia: string;
  metodoPago: MetodoPago;
  tasaCambio: number;
}

type CheckoutResponse =
  | { success: true; id: number; message?: string }
  | { success: false; message: string; status: string };

export const PaymentInformation = () => {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState("PagoMovil");
  const deliveryMethod = useAppStore((s) => s.deliveryMethod);
  const selectedProducts = useAppStore((s) => s.selectedProducts);
  const { tasa } = useDolar();
  const totalUSD = useAppStore((s) => s.totalUSD);
  const purchaseContext = useAppStore((s) => s.purchaseContext);
  const client = useAppStore((s) => s.client);
  const { setCanContinue, setIsSubmitting, isSubmitting, setOrderFinished } =
    useCheckout();

  const [paymentRecord, setPaymentRecord] = useState<PaymentDetails | null>(
    null,
  );
  const deliveryPrice = useAppStore((s) => s.deliveryPrice);

  const handlePaymentRecordChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    setPaymentRecord((prev) => {
      // 1. Definimos los valores por defecto para un registro nuevo
      const initialValues: PaymentDetails = {
        metodoPago: "PagoMovil" as MetodoPago,
        fechaPago: new Date(),
        montoUsd: 0,
        montoBs: 0,
        referencia: "",
        tasaCambio: 0,
      };

      // 2. Usamos el estado previo o los valores iniciales
      const current = prev || initialValues;

      let processedValue: string | number | Date | null = value;

      // 1. Convertir montos a números
      if (name === "montoUsd" || name === "montoBs" || name === "tasaCambio") {
        processedValue = value === "" ? 0 : parseFloat(value);
      }

      // 2. Convertir string de fecha a objeto Date (DateTime)
      if (name === "fechaPago") {
        processedValue = value ? new Date(value) : new Date();
      }

      return {
        ...current,
        [name]: processedValue,
      };
    });
  };

  const formatDateForInput = (date: Date | string | undefined | null) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";

    // Esto devuelve YYYY-MM-DD, que es lo que el input "entiende" para mostrar
    // luego el formato visual según el calendario del sistema (Venezuela).
    return d.toISOString().split("T")[0];
  };

  const handleSubmit = async () => {
    if (!client?.id || !paymentRecord) return;

    setIsSubmitting(true);

    try {
      const totalPago = deliveryPrice + totalUSD;

      const itemsParaOrden = selectedProducts.map((item) => ({
        productoId: item.id,
        cantidad: item.cantidad,
        precio: item.precio,
      }));

      const datos: CheckoutData = {
        clientId: client.id,
        contexto: purchaseContext,
        montoTotal: totalPago,
        tipodeRetiro: deliveryMethod,
        total: itemsParaOrden.length,
        carrito: itemsParaOrden,
        pago: paymentRecord,
      };

      // 1. Llamada a la acción
      const response = (await procesarCompra(
        initialState,
        datos,
      )) as CheckoutResponse;

      // 2. Uso de "in" o validación de tipo para que TS no se queje de 'success'
      if ("success" in response && response.success === true) {
        // 1. LIMPIEZA TOTAL DEL STORE (Fuerza la persistencia a vaciarse)
        useAppStore.setState({
          selectedProducts: [],
          totalUSD: 0,
          clientId: null,
          canContinue: false,
        });

        // 2. Notificar al sistema que la orden terminó
        setOrderFinished({
          orderId: response.id,
          message: "¡Compra realizada con éxito!",
          data: datos,
        });

        // 3. Limpiar estado local del componente de pago
        setPaymentRecord(null);

        console.log("LocalStorage debería estar limpio ahora");

        // 3. SI necesitas redirigir, hazlo manualmente aquí
        router.push(`/confirmacion?id=${response.id}`);
      } else {
        // Manejo de errores devueltos por la acción
        console.error("Error devuelto:", (response as any).message);
        alert((response as any).message || "Error al procesar la compra");
      }
    } catch (error) {
      console.error("Error crítico en checkout:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const finalUSD = totalUSD + (deliveryPrice || 0);
    const finalBS = Number((finalUSD * tasa).toFixed(2));

    setPaymentRecord((prev) => {
      // Si ya hay valores manuales, no los pises, a menos que sea la primera vez
      if (prev && prev.montoUsd !== 0) return prev;

      return {
        ...prev,
        montoUsd: finalUSD,
        montoBs: finalBS,
        tasaCambio: tasa,
        metodoPago: (prev?.metodoPago || paymentMethod) as MetodoPago,
        fechaPago: prev?.fechaPago || new Date(),
        referencia: prev?.referencia || "",
      };
    });
  }, [totalUSD, deliveryPrice, tasa, paymentMethod]);

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="flex items-center gap-3">
        <CreditCard className="text-accent-gold" size={24} />
        <h3 className="text-lg font-bold tracking-tight">Método de Pago</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <PaymentOption
          id="PagoMovil"
          label="Pago Móvil"
          icon={Smartphone}
          selected={paymentMethod === "PagoMovil"}
          onClick={() => setPaymentMethod("PagoMovil")}
        />
        <PaymentOption
          id="Zelle"
          label="Zelle"
          icon={Smartphone}
          selected={paymentMethod === "Zelle"}
          onClick={() => setPaymentMethod("Zelle")}
        />
        <PaymentOption
          id="TransferenciaBs"
          label="Transferencia"
          icon={Landmark}
          selected={paymentMethod === "TransferenciaBs"}
          onClick={() => setPaymentMethod("TransferenciaBs")}
        />
        <PaymentOption
          id="EfectivoUsd"
          label="Efectivo"
          icon={Banknote}
          selected={paymentMethod === "EfectivoUsd"}
          onClick={() => setPaymentMethod("EfectivoUsd")}
        />
      </div>

      {/* Detalles del Pago Dinámicos */}
      <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-500">
        {paymentMethod ? (
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs uppercase tracking-[2px] font-bold text-accent-gold">
                Instrucciones de Pago
              </h4>
              <span className="text-[10px] bg-white/10 px-2 py-1 rounded-md opacity-60">
                Moneda: {PAYMENT_DETAILS[paymentMethod].currency}
              </span>
            </div>

            <div className="space-y-3">
              {/* Renderizado condicional según el método */}
              {paymentMethod === "PagoMovil" && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="opacity-40 text-[10px] uppercase">Banco</p>
                    <p className="font-medium">
                      {PAYMENT_DETAILS["PagoMovil"].bank}
                    </p>
                    <CopyButton
                      text={`0412123456
1234567
0134
Bs ${(totalUSD * tasa).toLocaleString("es-VE")}`}
                    />
                  </div>
                  <div>
                    <p className="opacity-40 text-[10px] uppercase">Teléfono</p>
                    <p className="font-medium">
                      {PAYMENT_DETAILS["PagoMovil"].phone}
                    </p>
                  </div>
                  <div>
                    <p className="opacity-40 text-[10px] uppercase">
                      Cédula/RIF
                    </p>
                    <p className="font-medium">
                      {PAYMENT_DETAILS["PagoMovil"].id}
                    </p>
                  </div>
                </div>
              )}

              {paymentMethod === "Zelle" && (
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="opacity-40 text-[10px] uppercase">
                      Correo Zelle
                    </p>
                    <p className="text-lg text-white">
                      {PAYMENT_DETAILS["Zelle"].email}
                    </p>
                    <CopyButton
                      text={`${PAYMENT_DETAILS["Zelle"].email}
Monto: $ ${totalUSD.toFixed(2)} `}
                    />
                  </div>
                  <div>
                    <p className="opacity-40 text-[10px] uppercase">
                      A nombre de
                    </p>
                    <p className="font-medium">
                      {PAYMENT_DETAILS["Zelle"].name}
                    </p>
                  </div>
                </div>
              )}

              {paymentMethod === "TransferenciaBs" && (
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <p className="opacity-40 text-[10px] uppercase">
                      Cuenta Corriente
                    </p>
                    <p className="font-mono text-xs tracking-wider">
                      {PAYMENT_DETAILS["TransferenciaBs"].account}
                    </p>
                    <CopyButton
                      text={PAYMENT_DETAILS["TransferenciaBs"].account}
                    />
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <p className="opacity-40 text-[10px] uppercase">Banco</p>
                      <p className="font-medium">
                        {PAYMENT_DETAILS["TransferenciaBs"].bank}
                      </p>
                    </div>
                    <div>
                      <p className="opacity-40 text-[10px] uppercase">RIF</p>
                      <p className="font-medium">
                        {PAYMENT_DETAILS["TransferenciaBs"].id}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === "EfectivoUsd" && (
                <div className="flex items-center gap-3 p-3 bg-accent-gold/5 border border-accent-gold/20 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-accent-gold animate-pulse" />
                  <p className="text-xs opacity-80">
                    {PAYMENT_DETAILS["EfectivoUsd"].instructions}
                  </p>
                </div>
              )}

              {/* Nota común para todos los métodos excepto efectivo */}
              {paymentMethod !== "EfectivoUsd" && (
                <p className="mt-4 text-[11px] leading-relaxed opacity-50 border-t border-white/5 pt-4 italic">
                  {PAYMENT_DETAILS[paymentMethod].instructions}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 border-2 border-dashed border-white/5 rounded-2xl text-center opacity-30">
            <p className="text-xs uppercase tracking-widest font-medium italic">
              Selecciona un método para ver los detalles de pago
            </p>
          </div>
        )}
      </div>

      {paymentMethod === "EfectivoUsd" ? null : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input type="hidden" name="tasaCambio" value={tasa} />{" "}
            <InputField
              label="Fecha del Pago"
              name="fechaPago"
              type="date"
              value={
                formatDateForInput(paymentRecord?.fechaPago) ||
                formatDateForInput(new Date())
              }
              onChange={handlePaymentRecordChange}
              required
            />
            <InputField
              label="Monto en $"
              name="montoUsd" // Asegúrate que el name coincida con la propiedad del objeto
              type="number"
              value={Number(paymentRecord?.montoUsd.toFixed(2)) || 0}
              onChange={handlePaymentRecordChange}
              required
            />
            <InputField
              label="Monto en Bs"
              name="montoBs"
              type="number"
              value={paymentRecord?.montoBs || 0}
              onChange={handlePaymentRecordChange}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {" "}
            <InputField
              label="Referencia del Pago"
              name="referencia"
              type="text"
              value={paymentRecord?.referencia || ""}
              onChange={handlePaymentRecordChange}
              required
            />{" "}
            <div>
              <label className="text-[10px] uppercase tracking-widest opacity-50 px-1 block mb-1.5">
                Método de Pago
              </label>
              <div className="relative">
                <select
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-lg outline-none focus:border-accent-gold transition-colors text-white appearance-none cursor-pointer"
                  name="metodoPago"
                  value={paymentRecord?.metodoPago || paymentMethod}
                  onChange={(e) => {
                    setPaymentRecord((prev) => {
                      // 1. Si el estado anterior es null, creamos el objeto base
                      if (!prev) {
                        return {
                          metodoPago: e.target.value as MetodoPago, // Usamos el valor del evento
                          fechaPago: new Date(),
                          montoUsd: 0,
                          montoBs: 0,
                          referencia: "",
                          tasaCambio: 0,
                        };
                      }

                      // 2. Si ya existe, actualizamos solo el campo necesario
                      return {
                        ...prev,
                        metodoPago: e.target.value as MetodoPago,
                        fechaPago: prev.fechaPago || new Date(),
                      };
                    });
                  }}
                  required
                >
                  <option
                    value=""
                    disabled
                    className="bg-[#121212] text-white/50"
                  >
                    Selecciona un método
                  </option>
                  <option value="PagoMovil" className="bg-[#121212] text-white">
                    Pago Móvil
                  </option>
                  <option
                    value="TransferenciaBs"
                    className="bg-[#121212] text-white"
                  >
                    Transferencia Bs
                  </option>
                  <option
                    value="EfectivoUsd"
                    className="bg-[#121212] text-white"
                  >
                    Efectivo USD
                  </option>
                  <option value="Zelle" className="bg-[#121212] text-white">
                    Zelle
                  </option>
                </select>

                {/* Icono de flecha personalizado (opcional pero recomendado) */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                  <svg
                    width="10"
                    height="6"
                    viewBox="0 0 10 6"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1 1L5 5L9 1"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <CheckoutButton
        isPending={isSubmitting}
        type="button"
        onClick={handleSubmit}
      />
    </form>
  );
};

function PaymentOption({ label, icon: Icon, selected, onClick }: any) {
  return (
    <label className="cursor-pointer group block" onClick={onClick}>
      <div
        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${selected ? "border-accent-gold bg-accent-gold/5" : "border-white/10 bg-input-dark"}`}
      >
        <Icon
          className={selected ? "text-accent-gold" : "text-white/40"}
          size={24}
        />
        <span className="text-xs font-bold uppercase tracking-widest">
          {label}
        </span>
      </div>
    </label>
  );
}
