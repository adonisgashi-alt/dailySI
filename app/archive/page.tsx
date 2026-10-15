import type { Metadata } from "next";
import Link from "next/link";
import { getArchiveDays } from "@/lib/archive";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Archive",
  description: "Every confirmed superintelligence and frontier-AI story Daily Super Intelligence has published, day by day.",
  alternates: { canonical: "/archive" },
};

const fmt = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export default async function Archive() {
  const days = await getArchiveDays();
  const byMonth = new Map<string, typeof days>();
  for (const d of days) byMonth.set(d.date.slice(0, 7), [...(byMonth.get(d.date.slice(0, 7)) ?? []), d]);
  return (
    <div className="page">
      <div className="section-intro">
        <h1>Archive</h1>
        <p>Every confirmed story we have published, filed by the day it was first reported.</p>
      </div>
      {days.length === 0 && <p className="empty">The archive starts filling within the hour.</p>}
      {[...byMonth.entries()].map(([month, list]) => (
        <section key={month} style={{ marginBottom: 28 }}>
          <h2 className="rail-h"><span>{new Date(month + "-15T12:00:00Z").toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</span></h2>
          <ul className="headlines">
            {list.map((d) => (
              <li key={d.date} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <Link href={`/archive/${d.date}`} className="hl-s link">{fmt(d.date)}</Link>
                <span className="meta">{d.count} {d.count === 1 ? "story" : "stories"}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
