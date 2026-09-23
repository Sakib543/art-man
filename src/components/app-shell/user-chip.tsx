import { cn } from "@/lib/utils";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** The round initials beside a name. Brass on navy, or brass on white. */
export function UserChip({ name, onLight = false }: { name: string; onLight?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold",
        onLight ? "bg-brass-soft text-brass-strong" : "bg-sidebar-active text-brass-bright",
      )}
    >
      {initials(name)}
    </span>
  );
}
