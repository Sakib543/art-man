import { getDayCopy } from "@/db/queries/day-copy";
import { checkUser } from "@/lib/auth/session";

/**
 * The counter's copy of the open day (backlog P2.2e): its bills and folder
 * entries, fetched by `components/day-sync.tsx` and kept in IndexedDB so the
 * offline screens show the whole day, not only what was made offline.
 *
 * A Route Handler for the reason the catalog copy's is one: Next runs Server
 * Actions one at a time per client, and this is fetched after every save — it
 * must never make the next Save wait behind it. It answers with a status
 * rather than a redirect, like the catalog. It holds the day's money and
 * customers' names, so no cache may keep it.
 */
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const check = await checkUser();
  if (!check.ok) {
    return check.refused === "signed-out"
      ? Response.json({ error: "Not signed in" }, { status: 401, headers: NO_STORE })
      : Response.json({ error: "The system is under maintenance" }, { status: 503, headers: NO_STORE });
  }

  return Response.json(await getDayCopy(), { headers: NO_STORE });
}
