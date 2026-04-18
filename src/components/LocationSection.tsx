"use client";

import { motion } from "framer-motion";
import { PinContainer } from "@/components/ui/3d-pin";

export default function LocationSection() {
  const MAPS_HREF =
    "https://www.google.com/maps/place/Rena+Bianca+beach+bar/@41.2443727,9.1873002,17z";

  const MAPS_EMBED =
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2999.9625941782574!2d9.187300176560825!3d41.24437270485302!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12dbdff7fdbdfccd%3A0xa5f00b556e3e9542!2sRena%20Bianca%20beach%20bar!5e0!3m2!1spl!2spl!4v1776225511084!5m2!1spl!2spl";

  return (
    <section
      className="relative overflow-hidden py-20 md:py-32"
      style={{ background: "#0A192F" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* ── Section label ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="mb-12 text-center md:mb-20"
        >
          <span className="mb-3 block font-body text-xs uppercase tracking-[0.3em] text-sand/40">
            Lokalizacja
          </span>
          <h2
            className="font-heading text-3xl text-sand sm:text-4xl md:text-6xl"
            style={{ fontWeight: 400 }}
          >
            Znajdź nas
          </h2>
        </motion.div>

        {/* ── Two-column: 3D Pin Map + Info ── */}
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-0">

          {/* ── LEFT: 3D Pin with full map ── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="flex items-center justify-center"
          >
            <PinContainer
              title="Tu jesteśmy — Rena Bianca"
              href={MAPS_HREF}
            >
              <div className="flex w-[280px] flex-col sm:w-[340px] md:w-[400px]">
                <div className="overflow-hidden rounded-xl" style={{ height: "clamp(200px, 28vw, 320px)" }}>
                  <iframe
                    src={MAPS_EMBED}
                    className="h-full w-full border-0"
                    style={{ filter: "grayscale(0.6) contrast(1.05) brightness(0.75) hue-rotate(190deg)", pointerEvents: "none" }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Rena Bianca – mapa"
                  />
                </div>
                <div className="px-1 pb-1 pt-3">
                  <h3 className="text-sm font-semibold text-sand sm:text-base">
                    Rena Bianca Beach Bar
                  </h3>
                  <p className="mt-1 text-xs text-sand/50 sm:text-sm">
                    Spiaggia di Rena Bianca, Santa Teresa Gallura
                  </p>
                </div>
              </div>
            </PinContainer>
          </motion.div>

          {/* ── RIGHT: Professional info ── */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            viewport={{ once: true }}
            className="flex flex-col md:pl-8 lg:pl-16"
          >
            <span className="mb-4 block font-body text-[10px] uppercase tracking-[0.3em] text-ocean/60 sm:text-xs">
              Odwiedź nas
            </span>
            <h3
              className="font-heading text-2xl text-sand sm:text-3xl md:text-4xl"
              style={{ fontWeight: 400 }}
            >
              Rena Bianca<br />
              <span className="text-sand/50">Beach Bar</span>
            </h3>

            <div className="mt-8 space-y-6 font-body text-sm leading-relaxed text-sand/60 sm:text-base">
              <div>
                <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.2em] text-sand/30 sm:text-xs">Adres</span>
                <p>
                  Spiaggia di Rena Bianca<br />
                  07028 Santa Teresa Gallura<br />
                  Sardynia, Włochy
                </p>
              </div>

              <div className="h-px w-16" style={{ background: "linear-gradient(90deg, rgba(59,130,196,0.3), transparent)" }} />

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.2em] text-sand/30 sm:text-xs">Godziny</span>
                  <p>Codziennie<br />10:00 – 01:00</p>
                </div>
                <div>
                  <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.2em] text-sand/30 sm:text-xs">Kontakt</span>
                  <p>
                    +39 0789 123 456<br />
                    info@renabiancabeachbar.com
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <a
              href={MAPS_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-10 inline-flex w-fit items-center gap-2.5 rounded-full border border-ocean/30 bg-ocean/10 px-6 py-3 font-body text-xs font-medium uppercase tracking-wider text-sand/80 transition-all duration-300 hover:border-ocean/50 hover:bg-ocean/20 hover:text-sand sm:text-sm"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1C4.79 1 3 2.79 3 5c0 3.5 4 8 4 8s4-4.5 4-8c0-2.21-1.79-4-4-4zm0 5.5A1.5 1.5 0 1 1 7 3.5a1.5 1.5 0 0 1 0 3z" fill="currentColor" />
              </svg>
              Nawiguj do nas
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
