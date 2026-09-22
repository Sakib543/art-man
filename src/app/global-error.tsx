"use client";

/**
 * The last resort: a failure in the root layout, which replaces the whole
 * document when it fires. Next does not load `globals.css` here, so there is
 * no Tailwind and no theme — every style below is inline on purpose, and
 * changing the app's look will not change this screen.
 *
 * Metadata exports are not allowed in a Client Component, so the tab title is
 * React's own <title>.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "1rem",
          background: "#f4f5f7",
          color: "#1b1f24",
          fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}
      >
        <title>Something went wrong | Art Men&apos;s Salon</title>
        <div style={{ maxWidth: "28rem", background: "#fff", borderRadius: 14, padding: "1.5rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.125rem" }}>The system could not start</h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", lineHeight: 1.6 }}>
            This is a fault in the system, not something you did. Nothing you have already entered
            has been lost. Try again, and use the paper bill book while this screen is showing.
          </p>
          {error.digest ? (
            <p style={{ marginTop: "0.75rem", fontSize: "0.8125rem", fontFamily: "monospace", color: "#5b6572" }}>
              Reference {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: "1.25rem",
              width: "100%",
              height: "2.5rem",
              border: 0,
              borderRadius: 8,
              background: "#1b1f24",
              color: "#fff",
              fontSize: "0.9375rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
