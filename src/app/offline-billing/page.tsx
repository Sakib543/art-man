import { OfflineBilling } from "@/features/billing/components/offline-billing";

export const metadata = { title: "Billing (offline) | Art Men's Salon" };

/**
 * The counter's billing with no internet (backlog P2.2d).
 *
 * Deliberately a static page, outside the signed-in `(app)` layout: the
 * service worker keeps a copy of it (public/sw.js) and opens it when Billing
 * cannot be loaded, so it must not need the server to render. It holds
 * nothing of anyone's — the screen fills itself from this browser's own
 * offline copy, which only a signed-in session can have fetched and which
 * sign-out clears. Online, the proxy still asks for a session cookie first.
 */
export default function OfflineBillingPage() {
  return <OfflineBilling />;
}
