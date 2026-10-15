import type { Metadata } from "next";
import Link from "next/link";
import { getEdition } from "@/lib/news";
import { ago } from "@/lib/format";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Awaiting Confirmation",
  description: "Single-source AI reports that have not yet been confirmed by an independent outlet or primary source.",
  alternates: { canonical: "/queue" },
};

export default async function Queue() {
  const ed = await getEdition();
  return (
    <div className="page">
      <div className="section-intro">
        <h1>Awaiting Confirmation</h1>
        <p>
          These reports come from a single outlet. Daily Super Intelligence does not publish them as news until an independent outlet or the
          primary source confirms them. <Link href="/about" style={{ textDecoration: "underline" }}>How we verify</Link>
        </p>
      </div>
      {ed.queue.length === 0 ? (
        <p className="empty">Nothing is waiting for confirmation right now.</p>
      ) : (
        <ul className="headlines">
          {ed.queue.map((q) => (
            <li key={q.id}>
              <a href={q.reports[0].link} target="_blank" rel="noopener noreferrer nofollow">
                <h2 className="hl-m">{q.headline} ↗</h2>
              </a>
              <div className="meta">
                <span className="verified pending">◌ 1 source</span>
                <span>{q.outlets[0]}</span>
                <span>{ago(q.lastUpdate, ed.generatedAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
