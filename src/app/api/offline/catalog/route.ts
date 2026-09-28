import { getCatalogCopy } from "@/db/queries/catalog";
import { checkUser } from "@/lib/auth/session";

/**
 * The counter's offline copy of the catalog (backlog P2.2b), fetched by
 * `components/catalog-sync.tsx` and kept in IndexedDB.
 *
 * A Route Handler and not a Server Action, which is why the project now has a
 * second API route. Next dispatches Server Actions **one at a time per
 * client** (`node_modules/next/dist/docs/01-app/02-guides/server-actions.md`),
 * so a refresh running in the background would make "Save bill" wait behind
 * it — against Neon, for seconds. A GET waits for nobody.
 *
 * It answers with a status rather than redirecting: a `fetch` has no use for
 * the login page. (With no session cookie at all the proxy still redirects
 * before this runs; the browser side reads that as "signed out" too.) Any
 * signed-in role may have it, because any of them may ring up a bill. It holds
 * customers' numbers, so no cache may keep it.
 */
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const check = await checkUser();
  if (!check.ok) {
    return check.refused === "signed-out"
      ? Response.json({ error: "Not signed in" }, { status: 401, headers: NO_STORE })
      : Response.json({ error: "The system is under maintenance" }, { status: 503, headers: NO_STORE });
  }

  return Response.json(await getCatalogCopy(), { headers: NO_STORE });
}
