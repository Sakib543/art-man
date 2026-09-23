import { PageHeader } from "@/components/page-header";
import { Panel, PanelHeader } from "@/components/panel";
import { CreateUserForm } from "@/features/users/components/create-user-form";
import { UsersTable } from "@/features/users/components/users-table";
import { getUsers } from "@/features/users/queries";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Users | Art Men's Salon" };

/**
 * Who can sign in (backlog P1.2). Owner and developer only — `requireRole`
 * lets the developer through every owner check.
 *
 * What the Owner sees is narrowed in SQL, not here: a developer account never
 * reaches their browser at all, so the role stays invisible as the client
 * asked.
 */
export default async function UsersPage() {
  const user = await requireRole("owner");
  const data = await getUsers(user.role);

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Who can sign in. An account is closed, never deleted — the record has to keep making sense."
      />

      <div className="grid gap-4">
        {data.creatable.length > 0 ? (
          <Panel>
            <PanelHeader title="Add someone" description="They sign in with a username and the password you set here." />
            <div className="px-card py-4">
              <CreateUserForm creatable={data.creatable} />
            </div>
          </Panel>
        ) : null}

        <UsersTable rows={data.rows} viewer={{ id: user.id, role: user.role }} activeOwners={data.activeOwners} />
      </div>
    </>
  );
}
