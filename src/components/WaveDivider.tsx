"use client";

/* ═══════════════════════════════════════════════════════════════
   WAVE DIVIDER — animated SVG wave transition between sections
   ═══════════════════════════════════════════════════════════════ */

export default function WaveDivider({
  topColor = "#2a6a9e",
  bottomColor = "#0A192F",
}: {
  topColor?: string;
  bottomColor?: string;
}) {
  return (
    <div style={{ background: topColor, marginTop: -1, marginBottom: -1 }}>
      <svg
        className="relative block w-full"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        viewBox="0 24 150 28"
        preserveAspectRatio="none"
        shapeRendering="auto"
        style={{ height: "clamp(40px, 12dvh, 120px)" }}
      >
        <defs>
          <path
            id="wd-wave"
            d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
          />
        </defs>
        <g className="wd-parallax">
          <use xlinkHref="#wd-wave" x="48" y="0" fill={`${bottomColor}40`} />
          <use xlinkHref="#wd-wave" x="48" y="3" fill={`${bottomColor}66`} />
          <use xlinkHref="#wd-wave" x="48" y="5" fill={`${bottomColor}99`} />
          <use xlinkHref="#wd-wave" x="48" y="7" fill={bottomColor} />
        </g>
      </svg>

      <style>{`
        .wd-parallax > use {
          animation: wd-move 25s cubic-bezier(.55,.5,.45,.5) infinite;
        }
        .wd-parallax > use:nth-child(1) { animation-delay: -2s; animation-duration: 5s; }
        .wd-parallax > use:nth-child(2) { animation-delay: -3s; animation-duration: 7s; }
        .wd-parallax > use:nth-child(3) { animation-delay: -4s; animation-duration: 10s; }
        .wd-parallax > use:nth-child(4) { animation-delay: -5s; animation-duration: 14s; }
        @keyframes wd-move {
          0%   { transform: translate3d(-120px, 0, 0); }
          100% { transform: translate3d(120px, 0, 0); }
        }
      `}</style>
    </div>
  );
}
