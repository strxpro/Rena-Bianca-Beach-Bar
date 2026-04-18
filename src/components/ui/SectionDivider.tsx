"use client";

/* ═══════════════════════════════════════════════════════════════
   SECTION DIVIDER — Decorative breathing space between sections
   Variants: wave, line, gradient, dots
   ═══════════════════════════════════════════════════════════════ */

type Variant = "wave" | "line" | "dots" | "gradient";

interface Props {
  variant?: Variant;
  flip?: boolean;
  className?: string;
}

export default function SectionDivider({ variant = "wave", flip = false, className = "" }: Props) {
  const flipClass = flip ? "rotate-180" : "";

  if (variant === "wave") {
    return (
      <div className={`relative w-full overflow-hidden ${className}`} style={{ height: "clamp(80px, 12dvh, 160px)", background: "#0A192F" }}>
        <svg
          className={`absolute inset-0 h-full w-full ${flipClass}`}
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0 60 C240 20, 480 100, 720 60 C960 20, 1200 100, 1440 60 L1440 120 L0 120Z"
            fill="rgba(59,130,196,0.06)"
          />
          <path
            d="M0 70 C200 40, 500 90, 720 65 C940 40, 1240 95, 1440 70"
            stroke="rgba(59,130,196,0.12)"
            strokeWidth="1"
            fill="none"
          />
          <path
            d="M0 80 C320 50, 640 110, 960 70 C1120 50, 1280 90, 1440 80"
            stroke="rgba(253,251,247,0.05)"
            strokeWidth="0.5"
            fill="none"
          />
        </svg>
        {/* Center dot accent */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-1.5 w-1.5 rounded-full bg-ocean/20" />
        </div>
      </div>
    );
  }

  if (variant === "line") {
    return (
      <div className={`relative flex w-full items-center justify-center ${className}`} style={{ height: "clamp(60px, 8dvh, 100px)", background: "#0A192F" }}>
        <div className="flex items-center gap-3">
          <div className="h-px w-16 md:w-24" style={{ background: "linear-gradient(90deg, transparent, rgba(59,130,196,0.3))" }} />
          <div className="h-1.5 w-1.5 rotate-45 border border-ocean/30" />
          <div className="h-px w-16 md:w-24" style={{ background: "linear-gradient(90deg, rgba(59,130,196,0.3), transparent)" }} />
        </div>
      </div>
    );
  }

  if (variant === "dots") {
    return (
      <div className={`relative flex w-full items-center justify-center gap-3 ${className}`} style={{ height: "clamp(60px, 8dvh, 100px)", background: "#0A192F" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-1 w-1 rounded-full bg-sand/15" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
    );
  }

  // gradient
  return (
    <div
      className={`relative w-full ${className}`}
      style={{
        height: "clamp(80px, 10dvh, 140px)",
        background: "linear-gradient(180deg, #0A192F 0%, #0d2240 50%, #0A192F 100%)",
      }}
    />
  );
}
