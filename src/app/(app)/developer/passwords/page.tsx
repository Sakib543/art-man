import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ROLE_LABEL } from "@/components/app-shell/nav-config";
import { ChangeUsernameForm } from "@/features/developer/components/change-username-form";
import { ResetPasswordForm } from "@/features/developer/components/reset-password-form";
import { ResetPinForm } from "@/features/developer/components/reset-pin-form";
import { listUsers } from "@/features/developer/queries";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Accounts | Art Men's Salon" };

export default async function PasswordsPage() {
  const dev = await requireRole("developer");
  const users = await listUsers();

  return (
    <>
      <PageHeader title="Accounts" subtitle="Set a password when someone is locked out, and name your own account" />

      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Passwords and PINs are stored as hashes, so nobody — not even you — can read one back. The
        only way to recover a forgotten one is to set a new one here and tell the person what it is.
        Since 2026-09-23 this screen is the only place any password is set: the Owner can no longer
        reset the Manager. Every reset is written to the audit log.
      </p>

      <div className="grid max-w-2xl gap-4">
        {users.map((account) => (
          <Card key={account.id}>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div>
                  <p className="text-md font-semibold">{account.name}</p>
                  <p className="text-sm text-muted-foreground">{account.username}</p>
                </div>
                <Badge variant="secondary">{ROLE_LABEL[account.role]}</Badge>
              </div>

              {/*
                The developer may set their own password here, which no other
                role may do on its own screen. Nobody stands above this
                account: the Owner and the Manager can always be rescued from
                this page, and a salon with one developer account cannot.
                Settings is not the answer either — it asks for the current
                password, so it only helps someone who already knows it.
              */}
              <ResetPasswordForm
                userId={account.id}
                username={account.username || account.name}
                self={account.id === dev.id}
              />

              {/*
                Only this account can be renamed, and only by itself. The
                Owner's and the Manager's usernames are the salon's — printed
                on whatever the counter staff were handed — and renaming one
                out from under them is a support call, not a feature.
              */}
              {account.id === dev.id ? (
                <div className="border-t pt-4">
                  <p className="mb-3 text-sm text-muted-foreground">
                    This account is yours, so its name is too. Changing it does not sign you out, but
                    the next sign-in needs the new one.
                  </p>
                  <ChangeUsernameForm current={account.username || ""} />
                </div>
              ) : null}

              {account.role === "owner" ? (
                <div className="border-t pt-4">
                  <p className="mb-3 text-sm text-muted-foreground">
                    The Owner also has a 4-digit PIN, used to confirm cash taken from or added to
                    the drawer. {account.hasPin ? "One is set." : "None is set yet."}
                  </p>
                  <ResetPinForm userId={account.id} />
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
