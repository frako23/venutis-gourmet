import { useCheckout } from "@/context/checkoutContext";
import { addClient, getClientByPhone } from "@/lib/actions/clients";
import { obtenerClienteCheckout } from "@/lib/actions/cuenta-cliente";
import { initialStateClient } from "@/lib/constants/constants";
import { useAppStore } from "@/store/appStore";
import { UserCircle } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckoutButton } from "../global/checkoutButton";
import { InputField } from "../global/input";

export const PersonalInformation = () => {
  // Estado para los campos del formulario
  const { setCanContinue, nextStep, setClientId } = useCheckout();
  const [isExistingClient, setIsExistingClient] = useState(false);
  const [userData, setUserData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    celular: "",
    tipoCliente: "detal",
  });
  const [isSearching, setIsSearching] = useState(false);
  const [sesionVinculada, setSesionVinculada] = useState(false);
  const setClient = useAppStore((s) => s.setClient);
  const setStoreClientId = useAppStore((s) => s.setClientId);

  useEffect(() => {
    // Definimos qué hace que este paso sea válido
    const isValid =
      userData.nombre.trim().length > 0 &&
      userData.apellido.trim().length > 0 &&
      userData.celular.trim().length >= 10 &&
      !isSearching;

    setCanContinue(isValid);
  }, [userData, isSearching, setCanContinue]);
  const [state, formAction, isPending] = useActionState(
    addClient,
    initialStateClient,
  );

  // Efecto para manejar la respuesta exitosa de la creación de un cliente nuevo
  useEffect(() => {
    if (state.status === "success" && state.client) {
      toast.success("¡Bienvenido!");
      setClient(state.client);
      setClientId(state.client.id);
      setStoreClientId(state.client.id);
      nextStep();
    }
    if (state.status === "error") {
      toast.error(state.message || "No se pudieron guardar tus datos.");
    }
  }, [setClient, setClientId, setStoreClientId, state, nextStep]);

  // Con una cuenta vinculada, los datos salen de la sesión y no de lo que se escriba.
  useEffect(() => {
    let activo = true;
    void obtenerClienteCheckout().then((cliente) => {
      if (!activo || !cliente) return;
      setSesionVinculada(true);
      setIsExistingClient(true);
      setClientId(cliente.id);
      setStoreClientId(cliente.id);
      setClient(cliente);
      setUserData({ nombre: cliente.nombre, apellido: cliente.apellido, email: cliente.email ?? "", celular: cliente.celular ?? "", tipoCliente: cliente.tipoCliente });
    });
    return () => {
      activo = false;
    };
  }, [setClient, setClientId, setStoreClientId]);

  // Verificamos si el teléfono tiene al menos una longitud mínima para habilitar el resto
  const isPhoneEmpty = userData.celular.trim().length < 10;

  // Función para buscar cliente
  const handlePhoneBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const phone = e.target.value;
    if (!sesionVinculada && phone.trim().length >= 10) {
      // Longitud mínima para buscar
      setIsSearching(true);
      const cliente = await getClientByPhone(phone);

      if (cliente) {
        toast.success("¡Bienvenido de nuevo!");
        setIsExistingClient(true);
        setClientId(cliente.id);
        setStoreClientId(cliente.id);
        setUserData({
          nombre: cliente.nombre || "",
          apellido: cliente.apellido || "",
          email: cliente.email || "",
          celular: phone,
          tipoCliente: cliente.tipoCliente || "detal",
        });
        setClient(cliente);
      } else {
        setIsExistingClient(false);
        setClient(null);
        setClientId(null);
        setStoreClientId(null);
        // Si no existe, solo actualizamos el celular pero dejamos el resto vacío
        setUserData((prev) => ({
          ...prev,
          nombre: "",
          apellido: "",
          email: "",
          celular: phone,
          tipoCliente: "detal",
        }));
      }
      setIsSearching(false);
    }
  };

  // Manejar cambios manuales en los inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (sesionVinculada) return;
    if (name === "celular") {
      setIsExistingClient(false);
      setClient(null);
      setClientId(null);
      setStoreClientId(null);
    }
    setUserData((prev) => ({ ...prev, [name]: value }));
  };
  return (
    <form className="space-y-6" action={formAction}>
      <div className="flex items-center gap-3">
        <UserCircle className="text-accent-gold" size={24} />
        <h3 className="text-lg font-bold tracking-tight">
          Información Personal
        </h3>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {/* Campo oculto para que la Server Action reciba el tipoCliente */}
        <input type="hidden" name="tipoCliente" value={userData.tipoCliente} />
        {/* EL TELÉFONO PRIMERO */}
        <div className="space-y-1.5 relative">
          <label className="text-[11px] uppercase tracking-widest opacity-50 px-1">
            Teléfono
          </label>
          <input
            className={`w-full bg-input-dark border ${isSearching ? "border-gold/50" : "border-white/10"} rounded-lg py-3 px-4 outline-none transition-all`}
            placeholder="0412-1234567"
            type="tel"
            name="celular"
            value={userData.celular}
            onChange={handleChange}
            onBlur={handlePhoneBlur} // Se dispara al salir del campo
            readOnly={sesionVinculada}
            required
          />
          {isSearching && (
            <span className="absolute right-3 top-9 text-[10px] text-gold animate-pulse">
              Buscando...
            </span>
          )}
        </div>

        <InputField
          label="Nombre"
          name="nombre"
          value={userData.nombre}
          onChange={handleChange}
          disabled={isPhoneEmpty || isExistingClient} // Bloqueado si no hay teléfono o es cliente existente
          required
        />

        <InputField
          label="Apellido"
          name="apellido"
          value={userData.apellido}
          onChange={handleChange}
          disabled={isPhoneEmpty || isExistingClient} // Bloqueado si no hay teléfono o es cliente existente
          required
        />

        <InputField
          label="Email (Opcional)"
          name="email"
          type="email"
          value={userData.email}
          onChange={handleChange}
          disabled={isPhoneEmpty || isExistingClient} // Bloqueado si no hay teléfono o es cliente existente
        />
      </div>
      <CheckoutButton
        isPending={isPending}
        type={isExistingClient ? "button" : "submit"}
        onClick={isExistingClient ? nextStep : undefined}
      />
    </form>
  );
};
