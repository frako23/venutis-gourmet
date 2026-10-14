export function Label({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={`admin-label ${className}`}
    >
      {children}
    </label>
  );
}
