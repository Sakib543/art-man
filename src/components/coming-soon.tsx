import { Hammer } from "lucide-react";
import { PageHeader } from "./page-header";

/** Placeholder for a screen that is not built yet. Delete its use when the real screen lands. */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <>
      <PageHeader title={title} subtitle={description} />
      <div className="rounded-[14px] border bg-card px-6 py-16 text-center text-muted-foreground">
        <Hammer className="mx-auto mb-2 size-7 text-[#b7bec9]" aria-hidden />
        <p>This screen is not built yet.</p>
      </div>
    </>
  );
}
