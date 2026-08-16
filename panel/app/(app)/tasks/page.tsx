import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { query } from "@/lib/db";
import { TasksClient, type TaskRow } from "./TasksClient";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const { userId, profile } = await getSessionProfile();
  const isAdmin = profile.role === "admin";

  const [tasks, collaborators] = await Promise.all([
    isAdmin
      ? query<TaskRow>(
          `select t.id, t.title, t.description, t.assigned_to, t.status, t.due_date,
                  case when t.assigned_to is null then null else json_build_object('full_name', p.full_name) end as assignee
           from tasks t
           left join profiles p on p.id = t.assigned_to
           order by t.created_at desc`
        )
      : query<TaskRow>(
          `select t.id, t.title, t.description, t.assigned_to, t.status, t.due_date,
                  case when t.assigned_to is null then null else json_build_object('full_name', p.full_name) end as assignee
           from tasks t
           left join profiles p on p.id = t.assigned_to
           where t.assigned_to = $1 or t.assigned_to is null
           order by t.created_at desc`,
          [userId]
        ),
    isAdmin
      ? query<{ id: string; full_name: string; role: "admin" | "programmer" | "marketing" }>(
          "select id, full_name, role from profiles order by full_name"
        )
      : Promise.resolve([]),
  ]);

  return (
    <TasksClient tasks={tasks} collaborators={collaborators} isAdmin={isAdmin} currentUserId={userId} />
  );
}
