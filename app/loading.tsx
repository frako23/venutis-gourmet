import { Utensils } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      {/* Contenedor del Logo Animado */}
      <div className="relative mb-8">
        {/* Círculos de pulsación decorativos (Color Ocre/Oro) */}
        <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping duration-[2000ms]"></div>

        {/* Icono Principal (Marrón Madera) */}
        <div className="relative size-24 bg-primary rounded-2xl shadow-2xl flex items-center justify-center border-2 border-gold/30 rotate-3">
          <Utensils className="text-gold size-12 animate-bounce" />
        </div>
      </div>

      {/* Texto de Marca (Fuente Caligráfica Artística) */}
      <div className="text-center space-y-2">
        <h1 className="font-artisan text-5xl text-gold leading-tight">
          Venuti's Gourmet
        </h1>
        <p className="font-display text-[10px] uppercase tracking-[0.4em] text-white font-black">
          Preparando la mesa
        </p>
      </div>

      {/* Barra de progreso minimalista (Gris y Ocre) */}
      <div className="mt-10 w-48 h-1 bg-border-soft rounded-full overflow-hidden">
        <div className="h-full bg-accent animate-[loading_1.5s_ease-in-out_infinite] w-1/3 rounded-full shadow-[0_0_8px_rgba(212,175,55,0.5)]"></div>
      </div>

      {/* Frase inspiracional aleatoria (Opcional) */}
      <p className="mt-6 font-display text-xs text-white italic font-medium">
        "La verdadera pasta se amasa con tiempo y pasión..."
      </p>
    </div>
  );
}
