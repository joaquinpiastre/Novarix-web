"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const steps = [
  { n: "01", title: "Diagnóstico", desc: "Entendemos tu negocio y el problema real." },
  { n: "02", title: "Estrategia", desc: "Roadmap claro, prioridades y entregables." },
  { n: "03", title: "Ejecución", desc: "Ciclos cortos, visibilidad total del avance." },
  { n: "04", title: "Resultados", desc: "Medimos, iteramos y optimizamos." },
];

export function HomeProcess() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <div ref={ref} className="relative">
      <div className="hidden lg:block">
        <div className="relative mx-auto max-w-5xl px-2">
          <div className="absolute left-[12%] right-[12%] top-[2.25rem] h-px overflow-hidden rounded-full bg-border-subtle">
            <motion.div
              className="h-full bg-gradient-to-r from-transparent via-purple-bright to-transparent"
              initial={{ scaleX: 0, originX: 0 }}
              animate={inView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {steps.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: 0.12 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4 }}
            className="glass group relative rounded-2xl p-6 transition-shadow duration-300 hover:shadow-glow-sm"
          >
            <span className="font-display text-sm font-bold text-purple-bright">{s.n}</span>
            <h3 className="mt-3 font-display text-xl font-semibold text-text-primary">
              {s.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
