export function Label({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={`text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1 ${className}`}
    >
      {children}
    </label>
  );
}
