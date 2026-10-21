import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "18vh 24px 48px" }}>
      <h1 style={{ fontFamily: "var(--serif)", fontWeight: 400, fontSize: 40, lineHeight: 1.15, margin: "0 0 12px" }}>Page not found</h1>
      <p style={{ color: "var(--muted)", margin: "0 0 24px" }}>This estimator link does not exist.</p>
      <Link href="/" style={{ color: "var(--text)" }}>Back to the estimator</Link>
    </main>
  );
}
