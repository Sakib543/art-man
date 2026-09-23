"use client";

import { Power, PowerOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormFeedback } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/components/use-form-action";
import { setMaintenanceAction } from "../actions";

/** One button. On means everyone but the developer sees the closed screen. */
export function MaintenanceToggle({ on }: { on: boolean }) {
  const router = useRouter();
  const { error, done, pending, run } = useFormAction();

  const flip = () =>
    run(
      () => setMaintenanceAction({ on: !on }),
      on ? "The site is open again." : "The site is closed to everyone but you.",
      () => router.refresh(),
    );

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant={on ? "default" : "destructive"}
        disabled={pending}
        onClick={flip}
      >
        {on ? <Power aria-hidden /> : <PowerOff aria-hidden />}
        {pending ? "Saving..." : on ? "Open the site" : "Close the site"}
      </Button>
      <FormFeedback error={error} done={done} />
    </div>
  );
}
