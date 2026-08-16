"use client";

import { useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDateTime, todayISO } from "@/lib/utils/dates";
import { createReminder, deleteReminder, toggleReminderDone, type ActionState } from "./actions";

export interface ReminderRow {
  id: string;
  title: string;
  remind_at: string;
  done: boolean;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-1">
      {pending ? "Guardando…" : "Agregar recordatorio"}
    </Button>
  );
}

function NewReminderForm() {
  const [state, formAction] = useFormState<ActionState, FormData>(createReminder, {});
  return (
    <Card>
      <CardTitle>Nuevo recordatorio</CardTitle>
      <form action={formAction} className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <Input label="Título" name="title" required />
        </div>
        <Input label="Fecha" name="date" type="date" defaultValue={todayISO()} required />
        <Input label="Hora" name="time" type="time" defaultValue="09:00" />
        {state.error && <p className="text-sm text-danger sm:col-span-3">{state.error}</p>}
        <div className="sm:col-span-3">
          <SubmitButton />
        </div>
      </form>
    </Card>
  );
}

function ReminderItem({ reminder }: { reminder: ReminderRow }) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={reminder.done}
          disabled={isPending}
          onChange={(e) =>
            startTransition(() => {
              toggleReminderDone(reminder.id, e.target.checked);
            })
          }
          className="h-4 w-4 accent-accent"
        />
        <div>
          <p className={reminder.done ? "text-sm text-text-muted line-through" : "text-sm text-text-primary"}>
            {reminder.title}
          </p>
          <p className="text-xs text-text-muted">{formatDateTime(reminder.remind_at)}</p>
        </div>
      </label>
      <form action={deleteReminder.bind(null, reminder.id)}>
        <button type="submit" className="text-text-muted hover:text-danger" aria-label="Eliminar recordatorio">
          <Trash2 size={16} />
        </button>
      </form>
    </li>
  );
}

export function RemindersClient({ reminders }: { reminders: ReminderRow[] }) {
  const pending = reminders.filter((r) => !r.done);
  const done = reminders.filter((r) => r.done);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Recordatorios</h1>
        <p className="text-sm text-text-muted">Notas y fechas que no querés olvidar.</p>
      </div>

      <NewReminderForm />

      <Card>
        <CardTitle>Pendientes</CardTitle>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">No tenés recordatorios pendientes.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {pending.map((r) => (
              <ReminderItem key={r.id} reminder={r} />
            ))}
          </ul>
        )}
      </Card>

      {done.length > 0 && (
        <Card>
          <CardTitle>Completados</CardTitle>
          <ul className="mt-3 divide-y divide-border">
            {done.map((r) => (
              <ReminderItem key={r.id} reminder={r} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
