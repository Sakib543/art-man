/**
 * The Daily report's two ways of showing a day (P6.4): the bill list, and the
 * register — a column per staff member, as the paper register draws it. The
 * register had a screen of its own, the Daily worksheet, until then.
 */
export type ReportView = "list" | "register";

/** Anything but "register" is the list, so an old or mistyped link still opens. */
export const readView = (value: string | undefined): ReportView => (value === "register" ? "register" : "list");

/** The report's URL. The list is the default and needs no parameter. */
export function reportHref(date: string, view: ReportView): string {
  const params = new URLSearchParams({ date });
  if (view === "register") params.set("view", "register");
  return `/daily-report?${params}`;
}
