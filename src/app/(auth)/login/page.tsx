import { Scissors } from "lucide-react";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "@/features/account/components/login-form";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = { title: "Sign in | Art Men's Salon" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/billing");

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-primary text-[#e6c58f]">
            <Scissors className="size-6" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Art Men&apos;s Salon</h1>
            <p className="text-[13.5px] text-muted-foreground">Sign in to the counter</p>
          </div>
        </div>
        <Card>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
