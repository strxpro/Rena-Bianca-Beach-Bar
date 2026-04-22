import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "outline" | "success" | "warning" | "destructive";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "border border-ocean/20 bg-ocean/15 text-ocean-light",
  secondary: "border border-white/10 bg-white/[0.05] text-sand/70",
  outline: "border border-white/12 bg-transparent text-sand/70",
  success: "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  warning: "border border-amber-400/20 bg-amber-400/10 text-amber-200",
  destructive: "border border-rose-400/20 bg-rose-500/10 text-rose-200",
};

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 font-body text-[11px] font-medium uppercase tracking-[0.18em] backdrop-blur-md",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
