import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { Sidebar } from "@/components/nav/Sidebar";
import { MobileNav } from "@/components/nav/MobileNav";
import { signOut } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getSessionProfile();

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} signOut={signOut} />
      <main className="flex-1 overflow-x-hidden px-4 pb-20 pt-6 sm:px-6 md:pb-6 lg:px-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
      <MobileNav role={profile.role} />
    </div>
  );
}
