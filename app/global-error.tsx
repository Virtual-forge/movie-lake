"use client";

/**
 * Last-resort boundary: when the error bubbles past the root layout, this
 * renders its own minimal html/body (Next requirement). In practice this
 * only fires when the layout/providers themselves crash.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[global error]", error.digest ?? error.message);

  return (
    <html lang="en">
      <body
        style={{
          background: "#0b0a09",
          color: "#e7e2da",
          fontFamily: "system-ui, sans-serif",
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          margin: 0,
          padding: "24px",
        }}
      >
        <div style={{ display: "grid", gap: "12px", justifyItems: "center", textAlign: "center" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 600 }}>
            Movie Lake hit a wall
          </h1>
          <p style={{ color: "#8f8a82", fontSize: "14px", maxWidth: "420px" }}>
            The application shell failed to start. Retry the page, or come
            back once the source is reachable again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              border: "1px solid #3a3733",
              borderRadius: "9999px",
              padding: "8px 18px",
              fontSize: "13px",
              background: "transparent",
              color: "#e7e2da",
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
