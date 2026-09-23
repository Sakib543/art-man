import { Panel, PanelHeader } from "@/components/panel";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { ChangePasswordForm } from "@/features/account/components/change-password-form";
import { OwnerPinForm } from "@/features/account/components/owner-pin-form";
import { ResetManagerForm } from "@/features/account/components/reset-manager-form";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Settings | Art Men's Salon" };

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Panel>
      <PanelHeader title={title} description={description} />
      <div className="px-card py-4">{children}</div>
    </Panel>
  );
}

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader title="Settings" subtitle={`Signed in as ${user.name} (${user.username})`} />

      <div className="grid max-w-3xl gap-4">
        <Section title="Change your password" description="Use this to replace the password you were first given.">
          <ChangePasswordForm />
        </Section>

        {user.role === "owner" ? (
          <>
            <Section
              title="Your PIN"
              description="You confirm cash you take from or add to the drawer with this 4-digit PIN."
            >
              <OwnerPinForm />
            </Section>
            <Section title="Manager's password" description="Set a new password if the Manager forgot theirs. They are signed out everywhere.">
              <ResetManagerForm />
            </Section>
          </>
        ) : null}
      </div>
    </>
  );
}
