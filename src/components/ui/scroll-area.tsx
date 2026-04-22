"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "overflow-auto [scrollbar-color:rgba(255,255,255,0.18)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-track]:bg-transparent",
        className,
      )}
      {...props}
    />
  );
});

ScrollArea.displayName = "ScrollArea";

export { ScrollArea };
