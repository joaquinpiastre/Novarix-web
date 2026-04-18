"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type FormState = {
  name: string;
  email: string;
  company: string;
  service: string;
  budget: string;
  message: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const initial: FormState = {
  name: "",
  email: "",
  company: "",
  service: "",
  budget: "",
  message: "",
};

function validate(values: FormState): FieldErrors {
  const e: FieldErrors = {};
  if (!values.name.trim()) e.name = "Ingresá tu nombre completo.";
  if (!values.email.trim()) {
    e.email = "El email es obligatorio.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    e.email = "Ingresá un email válido.";
  }
  if (!values.service) e.service = "Elegí un servicio de interés.";
  if (!values.budget) e.budget = "Indicá un rango de presupuesto.";
  if (!values.message.trim()) e.message = "Contanos en pocas líneas qué necesitás.";
  return e;
}

export function ContactForm() {
  const [values, setValues] = useState<FormState>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const runValidate = (next: FormState) => {
    setErrors(validate(next));
  };

  const handleChange = (
    field: keyof FormState,
    value: string
  ) => {
    const next = { ...values, [field]: value };
    setValues(next);
    if (touched[field]) runValidate(next);
  };

  const handleBlur = (field: keyof FormState) => {
    setTouched((t) => ({ ...t, [field]: true }));
    runValidate({ ...values, [field]: values[field] });
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const allTouched: Partial<Record<keyof FormState, boolean>> = {
      name: true,
      email: true,
      company: true,
      service: true,
      budget: true,
      message: true,
    };
    setTouched(allTouched);
    const e = validate(values);
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setLoading(true);
    await new Promise((r) => setTimeout(r, 1400));
    setLoading(false);
    setSuccess(true);
    setValues(initial);
    setTouched({});
    setErrors({});
  };

  const inputClass =
    "mt-1.5 w-full rounded-xl border bg-bg-secondary/60 px-4 py-3 text-text-primary placeholder:text-text-secondary/50 outline-none transition-colors focus:border-purple-bright/60 focus:ring-2 focus:ring-[rgba(123,47,247,0.45)]";

  return (
    <div className="glass rounded-2xl p-6 sm:p-8">
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="ok"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple/20 text-3xl text-purple-bright">
              ✓
            </div>
            <h3 className="mt-6 font-display text-2xl font-semibold text-text-primary">
              ¡Mensaje enviado!
            </h3>
            <p className="mt-2 max-w-sm text-text-secondary">
              Te vamos a responder en menos de 24 horas hábiles. Revisá tu bandeja
              (y el spam, por las dudas).
            </p>
            <button
              type="button"
              onClick={() => setSuccess(false)}
              className="mt-8 rounded-full border border-border-subtle px-6 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-purple-bright/50 focus-ring"
            >
              Enviar otro mensaje
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="space-y-5"
            noValidate
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="name" className="text-sm font-medium text-text-secondary">
                  Nombre completo <span className="text-purple-bright">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  autoComplete="name"
                  value={values.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  onBlur={() => handleBlur("name")}
                  className={`${inputClass} ${
                    errors.name && touched.name
                      ? "border-[var(--error-soft)]/60 bg-[var(--error-bg)]"
                      : "border-border-subtle"
                  }`}
                  placeholder="Tu nombre"
                />
                {errors.name && touched.name && (
                  <p className="mt-1.5 text-sm text-[var(--error-soft)]">{errors.name}</p>
                )}
              </div>
              <div>
                <label htmlFor="email" className="text-sm font-medium text-text-secondary">
                  Email <span className="text-purple-bright">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={values.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  onBlur={() => handleBlur("email")}
                  className={`${inputClass} ${
                    errors.email && touched.email
                      ? "border-[var(--error-soft)]/60 bg-[var(--error-bg)]"
                      : "border-border-subtle"
                  }`}
                  placeholder="vos@empresa.com"
                />
                {errors.email && touched.email && (
                  <p className="mt-1.5 text-sm text-[var(--error-soft)]">{errors.email}</p>
                )}
              </div>
              <div>
                <label htmlFor="company" className="text-sm font-medium text-text-secondary">
                  Empresa <span className="text-text-secondary/60">(opcional)</span>
                </label>
                <input
                  id="company"
                  name="company"
                  value={values.company}
                  onChange={(e) => handleChange("company", e.target.value)}
                  className={`${inputClass} border-border-subtle`}
                  placeholder="Nombre de tu empresa"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="service" className="text-sm font-medium text-text-secondary">
                  Servicio de interés <span className="text-purple-bright">*</span>
                </label>
                <select
                  id="service"
                  name="service"
                  value={values.service}
                  onChange={(e) => handleChange("service", e.target.value)}
                  onBlur={() => handleBlur("service")}
                  className={`${inputClass} ${
                    errors.service && touched.service
                      ? "border-[var(--error-soft)]/60 bg-[var(--error-bg)]"
                      : "border-border-subtle"
                  }`}
                >
                  <option value="">Seleccioná una opción</option>
                  <option value="dev">Desarrollo web / software</option>
                  <option value="marketing">Marketing digital</option>
                  <option value="consultoria">Consultoría IT</option>
                  <option value="ia">Automatización con IA</option>
                  <option value="orientacion">No sé, necesito orientación</option>
                </select>
                {errors.service && touched.service && (
                  <p className="mt-1.5 text-sm text-[var(--error-soft)]">{errors.service}</p>
                )}
              </div>
              <div>
                <label htmlFor="budget" className="text-sm font-medium text-text-secondary">
                  Presupuesto estimado <span className="text-purple-bright">*</span>
                </label>
                <select
                  id="budget"
                  name="budget"
                  value={values.budget}
                  onChange={(e) => handleChange("budget", e.target.value)}
                  onBlur={() => handleBlur("budget")}
                  className={`${inputClass} ${
                    errors.budget && touched.budget
                      ? "border-[var(--error-soft)]/60 bg-[var(--error-bg)]"
                      : "border-border-subtle"
                  }`}
                >
                  <option value="">Seleccioná un rango</option>
                  <option value="lt500">Menos de $500 USD</option>
                  <option value="500-2000">$500 - $2000 USD</option>
                  <option value="2000-5000">$2000 - $5000 USD</option>
                  <option value="gt5000">+$5000 USD</option>
                  <option value="tbd">Por definir</option>
                </select>
                {errors.budget && touched.budget && (
                  <p className="mt-1.5 text-sm text-[var(--error-soft)]">{errors.budget}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="message" className="text-sm font-medium text-text-secondary">
                Mensaje / descripción del proyecto{" "}
                <span className="text-purple-bright">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                value={values.message}
                onChange={(e) => handleChange("message", e.target.value)}
                onBlur={() => handleBlur("message")}
                className={`${inputClass} resize-y min-h-[120px] ${
                  errors.message && touched.message
                    ? "border-[var(--error-soft)]/60 bg-[var(--error-bg)]"
                    : "border-border-subtle"
                }`}
                placeholder="Contanos objetivos, plazos y lo que ya probaste."
              />
              {errors.message && touched.message && (
                <p className="mt-1.5 text-sm text-[var(--error-soft)]">{errors.message}</p>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="glow-btn flex w-full items-center justify-center rounded-full bg-gradient-to-r from-violet-mid to-purple px-8 py-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70 focus-ring"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Enviando…
                </span>
              ) : (
                "Enviar mensaje"
              )}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
