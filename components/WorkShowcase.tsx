"use client";

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ProjectMockup } from "@/components/ProjectMockup";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  PROJECTS,
  type Accent,
  type Category,
  type Project,
} from "@/lib/projects";

type Filter = Category | "all";

const ACCENTS: Record<Accent, { surface: string; glow: string }> = {
  purple: {
    surface: "linear-gradient(135deg, rgba(45,10,94,0.8) 0%, #12022a 100%)",
    glow: "rgba(123,47,247,0.5)",
  },
  magenta: {
    surface: "linear-gradient(135deg, rgba(120,20,140,0.45) 0%, #12022a 100%)",
    glow: "rgba(192,38,211,0.45)",
  },
  violet: {
    surface: "linear-gradient(135deg, rgba(74,26,158,0.6) 0%, #12022a 100%)",
    glow: "rgba(168,85,247,0.4)",
  },
};

const STATS = [
  { value: PROJECTS.length, label: "Proyectos destacados" },
  {
    value: CATEGORIES.filter((c) => PROJECTS.some((p) => p.categories.includes(c))).length,
    label: "Áreas de trabajo",
  },
  {
    value: PROJECTS.filter((p) => p.categories.includes("software")).length,
    label: "Sistemas a medida",
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;

const chipStyle = { background: "rgba(10,1,24,0.55)" };

const ProjectCard = forwardRef<
  HTMLElement,
  { project: Project; onOpen: (project: Project, trigger: HTMLElement) => void }
>(function ProjectCard({ project, onOpen }, ref) {
  const accent = ACCENTS[project.accent];

  const handleMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  return (
    <motion.article
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.35, ease: EASE }}
      onMouseMove={handleMove}
      className="glass group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl transition-shadow duration-300 focus-within:shadow-glow-sm hover:shadow-glow-sm"
    >
      <div
        className="relative aspect-[16/10] overflow-hidden border-b border-border-subtle"
        style={{ background: accent.surface }}
      >
        <div className="pointer-events-none absolute inset-0 grid-bg" style={{ opacity: 0.4 }} aria-hidden />
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl"
          style={{ background: accent.glow }}
          aria-hidden
        />
        <ProjectMockup
          kind={project.mockup}
          className="relative h-full w-full p-4 transition-transform duration-500 ease-out group-hover:scale-[1.07]"
        />
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-purple-bright">
          {project.sector}
        </p>
        <h2 className="mt-2 font-display text-xl font-bold leading-snug sm:text-2xl">
          {project.title}
        </h2>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-text-secondary">{project.summary}</p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {project.categories.map((c) => (
            <li
              key={c}
              className="rounded-full border border-border-subtle px-3 py-1 text-xs font-medium text-text-secondary"
              style={chipStyle}
            >
              {CATEGORY_LABELS[c]}
            </li>
          ))}
        </ul>
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={(e) => onOpen(project, e.currentTarget)}
          className="focus-ring mt-6 inline-flex items-center gap-2 self-start rounded text-sm font-semibold text-purple-bright after:absolute after:inset-0"
        >
          Ver caso
          <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
          <span className="sr-only">: {project.title}</span>
        </button>
      </div>

      <div
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(360px circle at var(--mx, 50%) var(--my, 50%), rgba(168,85,247,0.18), transparent 60%)",
        }}
        aria-hidden
      />
    </motion.article>
  );
});

function ProjectModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const accent = ACCENTS[project.accent];
  const titleId = `project-title-${project.id}`;

  useEffect(() => {
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const outside = !panelRef.current.contains(active);
      if (e.shiftKey && (active === first || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || outside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
    };
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex justify-center overflow-y-auto p-4 sm:p-6"
      style={{ background: "rgba(5,0,14,0.78)", backdropFilter: "blur(6px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="relative my-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-border-subtle shadow-glow"
        style={{ background: "#12022a" }}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle del proyecto"
          className="focus-ring absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle text-text-primary transition-colors hover:text-purple-bright"
          style={{ background: "rgba(10,1,24,0.75)" }}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className="grid lg:grid-cols-5">
          <div
            className="relative flex flex-col justify-center overflow-hidden border-b border-border-subtle p-6 sm:p-8 lg:col-span-2 lg:border-b-0 lg:border-r"
            style={{ background: accent.surface }}
          >
            <div className="pointer-events-none absolute inset-0 grid-bg" style={{ opacity: 0.4 }} aria-hidden />
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl"
              style={{ background: accent.glow }}
              aria-hidden
            />
            <ProjectMockup
              kind={project.mockup}
              className="relative mx-auto mt-6 w-full max-w-xs motion-safe:animate-float lg:mt-0"
            />
            <ul className="relative mt-8 flex flex-wrap gap-2">
              {project.categories.map((c) => (
                <li
                  key={c}
                  className="rounded-full border border-border-subtle px-3 py-1 text-xs font-medium text-text-primary"
                  style={chipStyle}
                >
                  {CATEGORY_LABELS[c]}
                </li>
              ))}
            </ul>
            {project.link && (
              <p className="relative mt-5">
                <a
                  href={project.link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring rounded text-sm font-medium text-purple-bright underline underline-offset-4"
                >
                  {project.link.label} ↗
                </a>
              </p>
            )}
          </div>

          <div className="p-6 sm:p-8 lg:col-span-3">
            <p className="pr-12 text-sm font-medium text-purple-bright">{project.type}</p>
            <h2
              id={titleId}
              className="mt-2 font-display text-2xl font-bold leading-snug sm:text-3xl"
            >
              {project.title}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">{project.sector}</p>

            <dl className="mt-6 space-y-5">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Desafío
                </dt>
                <dd className="mt-1.5 leading-relaxed text-text-primary">{project.challenge}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Solución
                </dt>
                <dd className="mt-1.5 leading-relaxed text-text-primary">{project.solution}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-purple-bright">
                  Resultado
                </dt>
                <dd className="mt-1.5 font-medium leading-relaxed text-text-primary">
                  {project.result}
                </dd>
              </div>
            </dl>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Qué hicimos
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {project.services.map((s) => (
                  <li
                    key={s}
                    className="rounded-full border border-border-subtle px-3 py-1 text-xs font-medium text-text-primary"
                    style={chipStyle}
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/contacto"
              className="glow-btn focus-ring mt-8 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-mid to-purple px-7 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
            >
              Quiero algo así
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function WorkShowcase() {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Project | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);

  const visible = useMemo(
    () => (filter === "all" ? PROJECTS : PROJECTS.filter((p) => p.categories.includes(filter))),
    [filter]
  );

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: PROJECTS.length },
    ...CATEGORIES.map((c) => ({
      key: c,
      label: CATEGORY_LABELS[c],
      count: PROJECTS.filter((p) => p.categories.includes(c)).length,
    })),
  ];

  const open = useCallback((project: Project, trigger: HTMLElement) => {
    triggerRef.current = trigger;
    setSelected(project);
  }, []);

  const close = useCallback(() => {
    setSelected(null);
    triggerRef.current?.focus();
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        {STATS.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-4 text-center sm:p-6">
            <p className="gradient-text font-display text-3xl font-bold sm:text-5xl">{s.value}</p>
            <p className="mt-1 text-xs text-text-secondary sm:text-sm">{s.label}</p>
          </div>
        ))}
      </div>

      <div
        role="group"
        aria-label="Filtrar proyectos por categoría"
        className="-mx-4 mt-10 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f.key)}
              className={`focus-ring relative shrink-0 rounded-full border border-border-subtle px-5 py-2.5 text-sm font-medium transition-colors ${
                active ? "text-white" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="work-filter-pill"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-mid to-purple shadow-glow-sm"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative">
                {f.label}
                <span className="ml-1.5 text-xs opacity-70">{f.count}</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="sr-only" role="status">
        {visible.length === 1 ? "1 proyecto" : `${visible.length} proyectos`}
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((p) => (
            <ProjectCard key={p.id} project={p} onOpen={open} />
          ))}
        </AnimatePresence>
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {selected && <ProjectModal key={selected.id} project={selected} onClose={close} />}
          </AnimatePresence>,
          document.body
        )}
    </MotionConfig>
  );
}
