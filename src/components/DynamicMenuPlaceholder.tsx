"use client";

import { motion } from "framer-motion";

export default function DynamicMenuPlaceholder() {
  return (
    <section className="section-padding bg-sand-warm">
      <div className="container-wide">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center"
        >
          <span className="font-body text-xs tracking-[0.3em] uppercase text-ocean mb-6 block">
            Coming Soon
          </span>
          <h2 className="font-heading text-5xl md:text-7xl text-navy mb-8">
            Menu
          </h2>
          <p className="font-body text-lg text-stone max-w-xl mx-auto leading-relaxed">
            This section is prepared for a dynamic CodePen inject. Drop your
            interactive menu component here.
          </p>

          {/* ── Slot marker for CodePen injection ── */}
          <div className="mt-20 border border-dashed border-stone-light/50 rounded-sm p-20 text-stone/40 font-body text-sm">
            &lt;CodePen Inject Slot /&gt;
          </div>
        </motion.div>
      </div>
    </section>
  );
}
