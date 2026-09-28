import { revalidatePath } from "next/cache";
import { syncBillSchema } from "@/features/billing/schemas";
import { recordOfflineRefusal, syncOfflineBill } from "@/features/billing/service";
import { checkUser, type SessionUser } from "@/lib/auth/session";
import { UserError } from "@/lib/errors";
import type { SyncRefused, SyncSaved } from "@/lib/offline/outbox";
import { isSameOrigin } from "@/lib/same-origin";

/**
 * Where the counter's outbox sends a bill it made offline (backlog P2.2c),
 * one bill per request, oldest first (`components/outbox-sync.tsx`).
 *
 * A Route Handler, not a Server Action, for the reason the catalog copy's is
 * one: Next runs Server Actions one at a time per client, so a sync running in
 * the background would make "Save bill" wait behind it.
 *
 * The bill goes through the same `createBill` as a Save from the screen, so
 * it is priced by the server, saved once however often it is sent (P3.15), and
 * refused unless its day is the open day. The answers are the whole contract
 * with the browser (`outcomeOf` in `lib/offline/outbox.ts`):
 *
 * - 200 `{ billNo, alreadySaved }` — the server has it; it leaves the outbox.
 * - 422 `{ reason }` — looked at and refused, and the refusal recorded in the
 *   audit log; it waits for a person.
 * - 401 signed out, 503 maintenance, 500 anything unexpected, 403 another
 *   site — none says anything about the bill, which is kept and sent again.
 */
const NO_STORE = { "Cache-Control": "no-store" };

async function refuse(user: SessionUser, body: unknown, reason: string) {
  const clientId = typeof body === "object" && body !== null ? (body as { clientId?: unknown }).clientId : null;
  await recordOfflineRefusal(user, typeof clientId === "string" ? clientId.slice(0, 64) : null, reason, body);
  return Response.json({ reason } satisfies SyncRefused, { status: 422, headers: NO_STORE });
}

export async function POST(request: Request) {
  // Next makes this check for every Server Action; a Route Handler must make
  // it itself, or another site could post a bill with the counter's cookie.
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
      return await refuse(check.user, null, "The bill could not be read");
    }

    const parsed = syncBillSchema.safeParse(body);
    if (!parsed.success) return await refuse(check.user, body, parsed.error.issues[0]?.message ?? "Invalid bill");

    try {
      const saved = await syncOfflineBill(check.user, parsed.data);
      revalidatePath("/billing");
      return Response.json(
        { billNo: saved.receipt.billNo, alreadySaved: saved.alreadySaved } satisfies SyncSaved,
        { headers: NO_STORE },
      );
    } catch (error) {
      // Already recorded by `syncOfflineBill`.
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
