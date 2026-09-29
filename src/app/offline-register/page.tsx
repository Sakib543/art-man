import { OfflineRegister } from "@/features/worksheet/components/offline-register";

export const metadata = { title: "Register (offline) | Art Men's Salon" };

/**
 * The register with no internet (backlog P2.2e).
 *
 * A static page outside the signed-in `(app)` layout, like offline billing
 * (P2.2d): the service worker keeps a copy of it (public/sw.js) and opens it
 * when the Daily report cannot be loaded, so it must not need the server to
 * render. It holds nothing of anyone's — the screen fills itself from this
 * browser's offline copies, which only a signed-in session can have fetched
 * and which sign-out clears. Online, the proxy still asks for a session cookie
 * first.
 */
export default function OfflineRegisterPage() {
  return <OfflineRegister />;
}
