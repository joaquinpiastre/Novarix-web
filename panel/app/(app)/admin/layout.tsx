import { requireAdmin } from "@/lib/auth/getSessionProfile";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
