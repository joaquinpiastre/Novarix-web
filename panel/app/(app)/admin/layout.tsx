import { requirePermission } from "@/lib/auth/requirePermission";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("users.manage");
  return <>{children}</>;
}
