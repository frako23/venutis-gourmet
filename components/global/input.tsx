export function InputField({
  label,
  placeholder,
  type = "text",
  name,
  value,
  onChange,
  disabled,
}: any) {
  return (
    <div
      className={`space-y-1.5 transition-opacity duration-300 ${disabled ? "opacity-30" : "opacity-100"}`}
    >
      <label className="text-[11px] uppercase tracking-widest opacity-50 px-1">
        {label}
      </label>
      <input
        name={name}
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        className={`w-full bg-input-dark border border-white/10 rounded-lg py-3 px-4 outline-none transition-all 
          ${disabled ? "cursor-not-allowed" : "focus:border-gold focus:ring-1 focus:ring-gold text-white"}
        `}
        placeholder={disabled ? "Escribe el teléfono primero..." : placeholder}
        type={type}
      />
    </div>
  );
}
