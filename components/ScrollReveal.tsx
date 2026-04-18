"use client";

import { motion, type Variants } from "framer-motion";
import { useRef } from "react";

export type ScrollRevealVariant = "fadeUp" | "fadeIn" | "slideLeft" | "slideRight";

const variants: Record<ScrollRevealVariant, Variants> = {
  fadeUp: {
    hidden: { opacity: 0, y: 36 },
    visible: { opacity: 1, y: 0 },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  slideLeft: {
    hidden: { opacity: 0, x: 48 },
    visible: { opacity: 1, x: 0 },
  },
  slideRight: {
    hidden: { opacity: 0, x: -48 },
    visible: { opacity: 1, x: 0 },
  },
};

type ScrollRevealProps = {
  children: React.ReactNode;
  variant?: ScrollRevealVariant;
  delay?: number;
  className?: string;
  once?: boolean;
};

export function ScrollReveal({
  children,
  variant = "fadeUp",
  delay = 0,
  className = "",
  once = true,
}: ScrollRevealProps) {
  const ref = useRef(null);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-60px", amount: 0.2 }}
      transition={{
        duration: 0.55,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      variants={variants[variant]}
    >
      {children}
    </motion.div>
  );
}
