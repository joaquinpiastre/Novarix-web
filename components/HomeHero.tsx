"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const particles = [
  { className: "left-[8%] top-[22%] h-1 w-1 animate-float opacity-40" },
  { className: "left-[18%] top-[60%] h-1.5 w-1.5 animate-float-delayed opacity-30" },
  { className: "right-[12%] top-[30%] h-1 w-1 animate-pulse-slow opacity-50" },
  { className: "right-[22%] top-[70%] h-1 w-1 animate-float opacity-35" },
  { className: "left-1/2 top-[18%] h-1 w-1 animate-float-delayed opacity-25" },
  { className: "left-[40%] bottom-[28%] h-1.5 w-1.5 animate-float opacity-30" },
];

export function HomeHero() {
  return (
    <section className="relative overflow-hidden px-4 pb-24 pt-10 sm:px-6 lg:px-8 lg:pb-32 lg:pt-14">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.35]" aria-hidden />
      <div
        className="pointer-events-none absolute -left-32 top-20 h-[420px] w-[420px] rounded-full bg-purple/25 blur-[120px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[-120px] top-40 h-[360px] w-[360px] rounded-full bg-accent-magenta/20 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/3 h-[280px] w-[280px] rounded-full bg-violet-mid/20 blur-[90px]"
        aria-hidden
      />

      {particles.map((p, i) => (
        <span
          key={i}
          className={`pointer-events-none absolute rounded-full bg-purple-bright ${p.className}`}
          aria-hidden
        />
      ))}

      <div className="relative mx-auto max-w-7xl">
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-4xl text-center"
        >
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-secondary/60 px-4 py-1.5 text-sm text-text-secondary backdrop-blur-sm">
              <span className="text-purple-bright" aria-hidden>
                ✦
              </span>
              Agencia Digital · Argentina
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-8 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-[6rem]"
          >
            Transformamos negocios con{" "}
            <span className="gradient-text">tecnología que escala</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto mt-6 max-w-2xl text-lg text-text-secondary sm:text-xl"
          >
            Desarrollo de software, marketing digital e inteligencia artificial
            integrados en una sola agencia. Sin fricciones. Sin límites.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/contacto"
              className="glow-btn inline-flex min-w-[200px] items-center justify-center rounded-full bg-gradient-to-r from-violet-mid via-purple to-purple-bright px-8 py-4 text-base font-semibold text-white transition-transform hover:scale-[1.03] focus-ring"
            >
              Empezá tu proyecto
            </Link>
            <Link
              href="/trabajo"
              className="inline-flex min-w-[200px] items-center justify-center rounded-full border border-border-subtle bg-bg-secondary/50 px-8 py-4 text-base font-semibold text-text-primary backdrop-blur-sm transition-all hover:border-purple-bright/40 hover:bg-bg-secondary/80 focus-ring"
            >
              Ver nuestro trabajo
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
