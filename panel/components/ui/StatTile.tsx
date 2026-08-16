import clsx from "clsx";
import { Card } from "./Card";

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "danger";
}

const toneClasses = {
  default: "text-text-primary",
  success: "text-success",
  danger: "text-danger",
};

export function StatTile({ label, value, hint, tone = "default" }: StatTileProps) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wider text-text-muted">{label}</span>
      <span className={clsx("text-2xl font-semibold tabular-nums", toneClasses[tone])}>{value}</span>
      {hint && <span className="text-xs text-text-muted">{hint}</span>}
    </Card>
  );
}
