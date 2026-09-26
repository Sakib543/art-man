import type { MetadataRoute } from "next";

/**
 * The web app manifest (P2.2a): what lets the counter install the app and
 * open it in its own window. Served at `/manifest.webmanifest`, which the
 * proxy lets through without a session because the path has a dot in it.
 *
 * It doubles as the connectivity probe (`src/lib/connectivity.ts`), so it
 * must stay a small static file.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Art Men's Salon",
    short_name: "Art Salon",
    description: "POS and accounts for Art Men's Salon",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f5f7",
    theme_color: "#15263d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
