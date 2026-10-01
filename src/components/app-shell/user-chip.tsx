const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** The round initials beside a name, brass on the navy sidebar and drawer. */
export function UserChip({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="grid size-9 shrink-0 place-items-center rounded-full bg-sidebar-active text-xs font-semibold text-brass-bright"
    >
      {initials(name)}
    </span>
  );
}
