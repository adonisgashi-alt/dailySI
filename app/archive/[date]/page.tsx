import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArchiveDay, getArchiveDays } from "@/lib/archive";
import { SECTION_BY_SLUG } from "@/lib/sections";
import { dek, ArtFigure, clip } from "@/components/StoryBits";
import { STATIC, allArchiveDates } from "@/lib/static";

export const revalidate = 600;

export async function generateStaticParams() {
  return STATIC ? (await allArchiveDates()).map((date) => ({ date })) : [];
}

type Props = { params: Promise<{ date: string }> };

const fmt = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  return {
    title: `AI news for ${fmt(date)}`,
    description: `Confirmed superintelligence and frontier-AI stories first reported on ${fmt(date)}.`,
    alternates: { canonical: `/archive/${date}` },
  };
}

export default async function ArchiveDayPage({ params }: Props) {
  const { date } = await params;
  const day = await getArchiveDay(date);
  if (!day || day.stories.length === 0) notFound();
  const days = await getArchiveDays();
  const i = days.findIndex((d) => d.date === date);
  const newer = i > 0 ? days[i - 1] : undefined;
  const older = i >= 0 && i < days.length - 1 ? days[i + 1] : undefined;

  return (
    <div className="page-wide">
      <div className="section-intro">
        <p className="kicker"><Link href="/archive">Archive</Link></p>
        <h1>{fmt(date)}</h1>
        <p>{day.stories.length} confirmed {day.stories.length === 1 ? "story" : "stories"} first reported this day.</p>
      </div>
      {day.stories.map((s) => (
        <article className="list-row" key={s.id}>
          <div className="when">
            {SECTION_BY_SLUG.get(s.section)?.name ?? ""}
            <br />
            {new Date(s.firstSeen).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })} UTC
          </div>
          <div>
            <Link href={`/story/${s.id}`}><h2 className="hl-l" style={{ marginTop: 0 }}>{s.headline}</h2></Link>
            {dek(s) && <p className="summary">{clip(dek(s), 240)}</p>}
            <div className="meta">
              <span className="verified">✓ {s.outlets.length > 1 ? `Confirmed by ${s.outlets.length} outlets` : "Primary source"}</span>
              <span>{s.outlets.slice(0, 3).join(", ")}</span>
            </div>
          </div>
          <Link href={`/story/${s.id}`} tabIndex={-1} aria-hidden="true"><ArtFigure art={s.art} /></Link>
        </article>
      ))}
      <nav style={{ display: "flex", justifyContent: "space-between", marginTop: 20, fontFamily: "var(--sans)", fontSize: 14 }} aria-label="Archive days">
        {older ? <Link href={`/archive/${older.date}`} className="btn">← {fmt(older.date)}</Link> : <span />}
        {newer ? <Link href={`/archive/${newer.date}`} className="btn">{fmt(newer.date)} →</Link> : <span />}
      </nav>
    </div>
  );
}
