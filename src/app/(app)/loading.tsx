/**
 * Shown while a signed-in screen loads. It is worth having: these pages run
 * 5–11 database queries each and took 1–5 seconds against Neon when the
 * customer lookup was measured (P3.8), and until now the counter saw the old
 * screen with no sign that anything was happening.
 *
 * Deliberately a plain shape, not a copy of any one screen: it stands in for
 * all fourteen of them.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="mb-5 space-y-2">
        <div className="h-6 w-48 animate-pulse rounded-md bg-secondary" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-secondary" />
      </div>
      <div className="space-y-3 rounded-[14px] border bg-card p-[18px]">
        <div className="h-4 w-full animate-pulse rounded-md bg-secondary" />
        <div className="h-4 w-11/12 animate-pulse rounded-md bg-secondary" />
        <div className="h-4 w-9/12 animate-pulse rounded-md bg-secondary" />
      </div>
    </div>
  );
}
