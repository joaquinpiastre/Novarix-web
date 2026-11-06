import { requireAnyPermission } from "@/lib/auth/requirePermission";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAnyPermission(["users.manage", "users.create_marketing"]);
  return <>{children}</>;
}
