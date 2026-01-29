import React from "react";

export function Input({
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border-2 border-slate-100 bg-slate-50 focus:ring-4 focus:ring-gold/10 focus:border-gold h-14 px-5 font-bold text-slate-700 outline-none transition-all placeholder:text-slate-300 placeholder:font-medium ${props.className}`}
    />
  );
}
