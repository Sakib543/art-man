import { redirect } from "next/navigation";

/**
 * The Daily worksheet is now the Daily report's Register view (P6.4). This
 * route stays so a bookmark or a habit still lands somewhere useful.
 */
export default function WorksheetPage() {
  redirect("/daily-report?view=register");
}
