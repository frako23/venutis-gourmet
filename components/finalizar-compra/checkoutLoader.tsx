import Image from "next/image";

export const CheckoutLoader = () => {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-surface-dark/60 backdrop-blur-[2px] rounded-2xl transition-all">
      {/* Spinner elegante con los colores de tu marca */}
      <div className="w-12 h-12 border-2 border-white/10 border-t-accent-gold rounded-full animate-spin">
        <Image
          src="/logo-venutis.avif"
          alt="Logo Venutis"
          width={100}
          height={100}
        />
      </div>
      <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-accent-gold animate-pulse">
        Procesando pedido...
      </p>
    </div>
  );
};
