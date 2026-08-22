import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  size?: "icon" | "default";
  variant?: "ghost" | "outline" | "default";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      asChild: _asChild,
      size = "default",
      variant = "default",
      type = "button",
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center cursor-pointer gap-2 rounded-lg transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50",
          size === "icon" && "size-10 p-0",
          size === "default" && "px-4 py-3",
          variant === "ghost" && "bg-transparent",
          variant === "outline" && "border border-border bg-background",
          variant === "default" && "bg-gold text-primary hover:bg-gold/90",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
