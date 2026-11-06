import { notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { can } from "@/lib/auth/permissions";
import { query, queryOne } from "@/lib/db";
import type { Client, ClientService, ClientTeamMember, Profile, ServiceCatalogItem } from "@/lib/types/domain";
import { ClientDetailTabs } from "./ClientDetailTabs";

export const dynamic = "force-dynamic";

export interface ClientServiceRow extends ClientService {
  service_name: string;
  service_category: string;
}

export interface ClientTeamRow extends ClientTeamMember {
  full_name: string;
  role: string;
}

export interface AgreementRow {
  id: string;
  amount: number;
  billing_day: number;
  concept: string;
  active: boolean;
}

export interface PaymentHistoryRow {
  id: string;
  amount: number;
  concept: string;
  date_received: string | null;
  period_month: string | null;
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const { profile } = await getSessionProfile();
  const canSeeFinance = can(profile, "payments_in.manage");

  const client = await queryOne<Client>("select * from clients where id = $1", [params.id]);
  if (!client) notFound();

  const [services, team, allServices, allProfiles, agreements, payments] = await Promise.all([
    query<ClientServiceRow>(
      `select cs.*, sc.name as service_name, sc.category as service_category
       from client_services cs
       join services_catalog sc on sc.id = cs.service_id
       where cs.client_id = $1
       order by cs.status = 'active' desc, cs.started_at desc`,
      [params.id]
    ),
    query<ClientTeamRow>(
      `select ct.*, p.full_name, p.role::text as role
       from client_team ct
       join profiles p on p.id = ct.profile_id
       where ct.client_id = $1
       order by p.full_name`,
      [params.id]
    ),
    query<ServiceCatalogItem>(
      "select * from services_catalog where active = true order by category, name"
    ),
    query<Pick<Profile, "id" | "full_name" | "role">>(
      "select id, full_name, role from profiles order by full_name"
    ),
    canSeeFinance
      ? query<AgreementRow>(
          "select id, amount, billing_day, concept, active from recurring_agreements where client_id = $1 order by active desc, billing_day",
          [params.id]
        )
      : Promise.resolve([]),
    canSeeFinance
      ? query<PaymentHistoryRow>(
          `select id, amount, concept, date_received, period_month from payments_in
           where client_id = $1 order by coalesce(date_received, created_at) desc limit 20`,
          [params.id]
        )
      : Promise.resolve([]),
  ]);

  return (
    <ClientDetailTabs
      client={client}
      services={services}
      team={team}
      allServices={allServices}
      allProfiles={allProfiles}
      agreements={agreements}
      payments={payments}
      canSeeFinance={canSeeFinance}
    />
  );
}
