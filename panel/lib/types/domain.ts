export type UserRole = "admin" | "programmer" | "marketing";
export type TaskStatus = "pending" | "in_progress" | "done";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
}

export interface RecurringAgreement {
  id: string;
  client_id: string;
  amount: number;
  billing_day: number;
  concept: string;
  active: boolean;
  created_at: string;
}

export interface PaymentIn {
  id: string;
  client_id: string;
  recurring_agreement_id: string | null;
  amount: number;
  concept: string;
  period_month: string | null;
  date_received: string | null;
  created_by: string;
  created_at: string;
}

export interface PaymentOut {
  id: string;
  recipient_id: string;
  amount: number;
  concept: string;
  period_month: string;
  paid_on: string;
  created_by: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: TaskStatus;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  owner_id: string;
  title: string;
  remind_at: string;
  done: boolean;
  created_at: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  programmer: "Programador",
  marketing: "Marketing",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pendiente",
  in_progress: "En curso",
  done: "Hecho",
};

export const TASK_STATUS_ORDER: TaskStatus[] = ["pending", "in_progress", "done"];
