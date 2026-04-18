"use client";

/* ═══════════════════════════════════════════════════════════════
   SUNSET DIVIDER — "Only CSS: Sunset Bird" by Yusuke Nakaya
   Faithful React port of the CodePen.
   3D perspective birds flying toward horizon, animated waves,
   warm golden sunset gradients. Edges blend with navy sections.
   ═══════════════════════════════════════════════════════════════ */

function seeded(i: number, mul: number, off: number, mod: number) {
  return (i * mul + off) % mod;
}

const BIRD_COUNT = 20;
const BIRDS = Array.from({ length: BIRD_COUNT }, (_, i) => ({
  tx: seeded(i, 53, 17, 600) - 300,
  ty: seeded(i, 31, 11, 200) - 150,
  rot: seeded(i, 19, 7, 40) - 20,
  flyDur: `${seeded(i, 37, 13, 10000) + 5000}ms`,
  flyDelay: `${-seeded(i, 41, 3, 20000)}ms`,
  wingDelay: `${-seeded(i, 29, 5, 20000)}ms`,
}));

const WAVE_COUNT = 6;

export default function SunsetDivider() {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height: "clamp(300px, 45dvh, 550px)",
        background: "#0A192F",
      }}
    >
      {/* ── 3D world wrapper ── */}
      <div
        className="sd-world absolute inset-0 flex items-center justify-center"
        style={{ perspective: "600px", transformStyle: "preserve-3d" }}
      >
        {/* ── Sunset scene (centered card) ── */}
        <div
          className="sd-sunset relative overflow-hidden"
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          {/* Sky */}
          <div
            className="absolute"
            style={{
              top: 0,
              left: 0,
              width: "100%",
              height: "60%",
              background: "radial-gradient(ellipse at bottom, #ffee00 0%, khaki 15%, orange 100%)",
            }}
          />

          {/* Sea */}
          <div
            className="absolute"
            style={{
              bottom: 0,
              left: 0,
              width: "100%",
              height: "40%",
              background: "radial-gradient(ellipse at top, rgba(255,255,255,1) 0%, rgba(255,215,0,0.1) 10%, #d2691e 100%)",
            }}
          />

          {/* Sun (half-circle on horizon) */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              top: "calc(50% + 10px)",
              width: "clamp(70px, 12vw, 100px)",
              height: "clamp(35px, 6vw, 55px)",
              borderRadius: "200px 200px 0 0",
              background: "linear-gradient(0deg, rgba(255,255,255,0.3) 0%, #fff 100%)",
              zIndex: 999,
              filter: "blur(4px) contrast(2)",
            }}
          />

          {/* Glow bg behind sun */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: "100%",
              height: "100%",
              background: "yellow",
              filter: "blur(5px) contrast(100)",
              zIndex: 0,
            }}
          />

          {/* Horizon glow */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              top: "50%",
              width: "100%",
              height: "60%",
              borderRadius: "50%",
              background: "radial-gradient(ellipse at center, rgba(255,255,255,0.4) 0%, transparent 70%)",
              filter: "blur(10px)",
            }}
          />

          {/* Animated waves on the sea */}
          {Array.from({ length: WAVE_COUNT }, (_, i) => (
            <div
              key={`w-${i}`}
              className={i > 0 ? "sd-wave" : ""}
              style={{
                position: "absolute",
                top: "calc(55% + 12px)",
                left: "calc(50% - 60px)",
                width: "120px",
                height: "12px",
                background: "#fff",
                borderRadius: "50%",
                zIndex: 1000,
                ...(i > 0 ? {
                  animationDelay: `${-i * 500}ms`,
                } : {}),
              }}
            />
          ))}
        </div>

        {/* ── 3D Birds flying toward viewer ── */}
        {BIRDS.map((b, i) => (
          <div
            key={i}
            className="sd-birdpos pointer-events-none absolute"
            style={{
              top: "calc(50% + 60px)",
              left: "calc(50% - 40px)",
              transform: `translate(${b.tx}px, ${b.ty}px) rotateZ(${b.rot}deg)`,
            }}
          >
            <div
              className="sd-bird"
              style={{
                width: "80px",
                animationDuration: b.flyDur,
                animationDelay: b.flyDelay,
              }}
            >
              <div className="sd-wing sd-wing-l" style={{ animationDelay: b.wingDelay }} />
              <div className="sd-wing sd-wing-r" style={{ animationDelay: b.wingDelay }} />
            </div>
          </div>
        ))}
      </div>

      {/* Gradient fade edges — blend with navy sections */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20"
        style={{ height: "clamp(50px, 10dvh, 100px)", background: "linear-gradient(180deg, #0A192F 0%, transparent 100%)" }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20"
        style={{ height: "clamp(50px, 10dvh, 100px)", background: "linear-gradient(0deg, #0A192F 0%, transparent 100%)" }}
      />

      {/* Scoped keyframes */}
      <style>{`
        .sd-world { transform-style: preserve-3d; }
        .sd-world * { transform-style: preserve-3d; }

        .sd-bird {
          position: absolute;
          animation: sd-fly 8s linear infinite;
        }
        .sd-wing {
          position: absolute;
          width: 50%;
          height: 20px;
          border-top: 4px solid black;
          border-radius: 50%;
        }
        .sd-wing-l {
          transform-origin: 100% 50%;
          animation: sd-wingL 0.8s cubic-bezier(0.445,0.05,0.55,0.95) infinite alternate;
        }
        .sd-wing-r {
          right: 0;
          transform-origin: 0 50%;
          animation: sd-wingR 0.8s cubic-bezier(0.445,0.05,0.55,0.95) infinite alternate;
        }

        .sd-wave {
          animation: sd-wave 2s infinite linear;
        }

        @keyframes sd-fly {
          0%   { opacity: 0; transform: translateZ(500px); }
          20%  { opacity: 1; transform: translateZ(400px); }
          100% { opacity: 0; transform: translateZ(0px) scale(0); }
        }
        @keyframes sd-wave {
          0%   { transform: translateY(0) scale(1) rotateZ(0); }
          50%  { transform: translateY(40px) scale(0.5) rotateZ(5deg); }
          100% { transform: translateY(30px) scale(0) rotateZ(-40deg); }
        }
        @keyframes sd-wingL {
          0%   { transform: rotateZ(30deg); }
          100% { transform: rotateZ(-20deg); }
        }
        @keyframes sd-wingR {
          0%   { transform: rotateZ(-30deg); }
          100% { transform: rotateZ(20deg); }
        }
      `}</style>
    </div>
  );
}
