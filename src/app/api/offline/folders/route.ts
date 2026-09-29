import { revalidatePath } from "next/cache";
import { syncEntrySchema } from "@/features/folders/schemas";
import { recordOfflineEntryRefusal, syncOfflineEntry } from "@/features/folders/service";
import { checkUser, type SessionUser } from "@/lib/auth/session";
import { UserError } from "@/lib/errors";
import type { FolderSyncSaved, SyncRefused } from "@/lib/offline/outbox";
import { isSameOrigin } from "@/lib/same-origin";

/**
 * Where the counter's outbox sends a folder entry it made offline (backlog
 * P2.2e) — an expense or a staff advance — one per request, in the order it
 * was made (`components/outbox-sync.tsx`). The bill's twin is
 * `app/api/offline/sync`, and the contract is the same (`outcomeOf` in
 * `lib/offline/outbox.ts`):
 *
 * - 200 `{ alreadySaved }` — the server has it; it leaves the outbox.
 * - 422 `{ reason }` — looked at and refused, and the refusal recorded in the
 *   audit log; it waits for a person.
 * - 401 signed out, 503 maintenance, 500 anything unexpected, 403 another
 *   site — none says anything about the entry, which is kept and sent again.
 *
 * It goes through the same `addEntry` as the Daily folders screen, so it is
 * saved once however often it is sent, and refused unless its day is the open
 * day.
 */
const NO_STORE = { "Cache-Control": "no-store" };

async function refuse(user: SessionUser, body: unknown, reason: string) {
  const clientId = typeof body === "object" && body !== null ? (body as { clientId?: unknown }).clientId : null;
  await recordOfflineEntryRefusal(user, typeof clientId === "string" ? clientId.slice(0, 64) : null, reason, body);
  return Response.json({ reason } satisfies SyncRefused, { status: 422, headers: NO_STORE });
}

export async function POST(request: Request) {
  // Next makes this check for every Server Action; a Route Handler must make
  // it itself, or another site could post an entry with the counter's cookie.
  if (!isSameOrigin(request.headers)) {
    return Response.json({ error: "Cross-site request refused" }, { status: 403, headers: NO_STORE });
  }

  const check = await checkUser();
  if (!check.ok) {
    return check.refused === "signed-out"
      ? Response.json({ error: "Not signed in" }, { status: 401, headers: NO_STORE })
      : Response.json({ error: "The system is under maintenance" }, { status: 503, headers: NO_STORE });
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return await refuse(check.user, null, "The entry could not be read");
    }

    const parsed = syncEntrySchema.safeParse(body);
    if (!parsed.success) return await refuse(check.user, body, parsed.error.issues[0]?.message ?? "Invalid entry");

    try {
      const saved = await syncOfflineEntry(check.user, parsed.data);
      revalidatePath("/folders");
      return Response.json({ alreadySaved: saved.alreadySaved } satisfies FolderSyncSaved, { headers: NO_STORE });
    } catch (error) {
      // Already recorded by `syncOfflineEntry`.
      if (error instanceof UserError) {
        return Response.json({ reason: error.message } satisfies SyncRefused, { status: 422, headers: NO_STORE });
      }
      throw error;
    }
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Something went wrong" }, { status: 500, headers: NO_STORE });
  }
}
