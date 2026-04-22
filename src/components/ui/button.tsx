"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive" | "glow";
type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "border border-ocean/30 bg-ocean text-sand shadow-[0_12px_40px_-18px_rgba(59,130,196,0.8)] hover:bg-ocean-light hover:border-ocean-light",
  secondary:
    "border border-white/10 bg-white/[0.06] text-sand hover:border-white/15 hover:bg-white/[0.1]",
  outline:
    "border border-white/12 bg-transparent text-sand hover:border-ocean/35 hover:bg-ocean/10",
  ghost:
    "border border-transparent bg-transparent text-sand/70 hover:text-sand hover:bg-white/[0.06]",
  destructive:
    "border border-rose-400/20 bg-rose-500/12 text-rose-100 hover:border-rose-400/35 hover:bg-rose-500/18",
  glow:
    "border border-cyan-300/20 bg-gradient-to-r from-ocean via-cyan-400 to-ocean-light text-navy shadow-[0_18px_50px_-18px_rgba(125,211,252,0.95)] hover:brightness-105",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-11 px-4 py-2 text-sm",
  sm: "h-9 rounded-lg px-3 text-xs",
  lg: "h-12 rounded-xl px-6 text-sm",
  icon: "h-10 w-10 rounded-xl p-0",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-body font-medium tracking-[0.01em] transition-all duration-300 ease-out outline-none focus-visible:ring-2 focus-visible:ring-ocean/40 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button };
