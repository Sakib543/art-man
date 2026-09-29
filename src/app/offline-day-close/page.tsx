import { OfflineDayClose } from "@/features/day-close/components/offline-day-close";

export const metadata = { title: "Day close (offline) | Art Men's Salon" };

/**
 * Day close with no internet (backlog P2.2f).
 *
 * A static page outside the signed-in `(app)` layout, like offline billing
 * (P2.2d): the service worker keeps a copy of it (public/sw.js) and opens it
 * when Day close cannot be loaded, so it must not need the server to render.
 * It holds nothing of anyone's — the screen fills itself from this browser's
 * offline copies, which only a signed-in session can have fetched and which
 * sign-out clears. Online, the proxy still asks for a session cookie first.
 */
export default function OfflineDayClosePage() {
  return <OfflineDayClose />;
}
