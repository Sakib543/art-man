import { revalidatePath } from "next/cache";
import { syncCloseSchema } from "@/features/day-close/schemas";
import { recordOfflineCloseRefusal, syncOfflineClose } from "@/features/day-close/service";
import { checkUser, type SessionUser } from "@/lib/auth/session";
import { UserError } from "@/lib/errors";
import type { CloseSyncSaved, SyncRefused } from "@/lib/offline/outbox";
import { isSameOrigin } from "@/lib/same-origin";

/**
 * Where the counter's outbox sends a day it closed offline (backlog P2.2f) —
 * only once the day's bills and entries have gone before it (`heldBack` in
 * `lib/offline/outbox.ts`). The twin of the bill and folder routes, with the
 * same contract (`outcomeOf`):
 *
 * - 200 `{ securityCode, alreadySaved }` — the day is closed, and the code is
 *   the server's own; the close leaves the outbox.
 * - 422 `{ reason }` — looked at and refused, and the refusal recorded in the
 *   audit log; it waits for a person on the Day close screen.
 * - 401 signed out, 503 maintenance, 500 anything unexpected, 403 another
 *   site — none says anything about the close, which is kept and sent again.
 *
 * It goes through the same `closeDay` as the Day close screen, so it closes a
 * day once however often it is sent, and closes nothing unless the day is
 * still open and its expected cash is what the count was compared with.
 */
const NO_STORE = { "Cache-Control": "no-store" };

async function refuse(user: SessionUser, body: unknown, reason: string) {
  const clientId = typeof body === "object" && body !== null ? (body as { clientId?: unknown }).clientId : null;
  await recordOfflineCloseRefusal(user, typeof clientId === "string" ? clientId.slice(0, 64) : null, reason, body);
  return Response.json({ reason } satisfies SyncRefused, { status: 422, headers: NO_STORE });
}

export async function POST(request: Request) {
  // Next makes this check for every Server Action; a Route Handler must make
  // it itself, or another site could close the day with the counter's cookie.
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
      return await refuse(check.user, null, "The close could not be read");
    }

    const parsed = syncCloseSchema.safeParse(body);
    if (!parsed.success) return await refuse(check.user, body, parsed.error.issues[0]?.message ?? "Invalid close");

    try {
      const closed = await syncOfflineClose(check.user, parsed.data);
      // The open/closed state of the day changes what these screens show.
      for (const path of ["/day-close", "/billing", "/folders"]) revalidatePath(path);
      return Response.json(
        { securityCode: closed.securityCode, alreadySaved: closed.alreadySaved } satisfies CloseSyncSaved,
        { headers: NO_STORE },
      );
    } catch (error) {
      // Already recorded by `syncOfflineClose`.
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
