import Link from "next/link";
import { storyPath } from "@/lib/slug";
import { getEdition, type EditionStory } from "@/lib/news";
import { SECTIONS } from "@/lib/sections";
import { SITE } from "@/lib/site";
import { dek, ArtFigure, SectionKicker, StoryMeta, clip } from "@/components/StoryBits";
import { Meter, MeterNote } from "@/components/Meter";
import { JsonLd } from "@/components/JsonLd";
import { ago } from "@/lib/format";

export const revalidate = 600;

function Package({ s, now, flip, lead }: { s: EditionStory; now: number; flip?: boolean; lead?: boolean }) {
  const related = s.reports.filter((r) => r.title !== s.headline).slice(0, lead ? 3 : 2);
  return (
    <article className={`package${flip ? " flip" : ""}`}>
      <div>
        <SectionKicker section={s.section} />
        <Link href={storyPath(s)}>
          <h2 className={lead ? "hl-xl" : "hl-l"}>{s.headline}</h2>
        </Link>
        {dek(s) && <p className={`summary${lead ? " summary-l" : ""}`}>{clip(dek(s), lead ? 300 : 200)}</p>}
        <StoryMeta story={s} now={now} />
        {related.length > 0 && (
          <ul className="related">
            {related.map((r) => (
              <li key={r.link}>
                <span className="src">{r.outlet}</span>
                <a href={r.link} target="_blank" rel="noopener noreferrer">{r.title}</a>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Link href={storyPath(s)} tabIndex={-1} aria-hidden="true">
        <ArtFigure art={s.art} caption priority={lead} />
      </Link>
    </article>
  );
}

function Small({ s, now, image = true }: { s: EditionStory; now: number; image?: boolean }) {
  return (
    <article>
      {image && <Link href={storyPath(s)} tabIndex={-1} aria-hidden="true"><ArtFigure art={s.art} /></Link>}
      <SectionKicker section={s.section} />
      <Link href={storyPath(s)}><h3 className="hl-m">{s.headline}</h3></Link>
      {dek(s) && <p className="summary">{clip(dek(s), 140)}</p>}
      <StoryMeta story={s} now={now} />
    </article>
  );
}

export default async function FrontPage() {
  const ed = await getEdition();
  const now = ed.generatedAt;
  const stories = ed.stories;
  const packages = stories.slice(0, 3);
  const row = stories.slice(3, 6);
  const shown = new Set([...packages, ...row].map((s) => s.id));
  const mostCorroborated = [...stories].sort((a, b) => b.outlets.length - a.outlets.length || b.lastUpdate - a.lastUpdate).slice(0, 5);
  const prev = ed.history.length > 1 ? ed.history[ed.history.length - 2] : undefined;
  const bands = SECTIONS.map((sec) => ({ sec, list: stories.filter((s) => s.section.slug === sec.slug && !shown.has(s.id)).slice(0, 4) })).filter((b) => b.list.length > 0);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE.name,
          url: SITE.url,
          description: SITE.description,
          publisher: { "@type": "NewsMediaOrganization", name: SITE.name, url: SITE.url, logo: `${SITE.url}/icon.png` },
        }}
      />
      <h1 className="sr-only">{SITE.name}: today&apos;s confirmed superintelligence news</h1>
      <div className="front">
        <div className="main">
          {packages.length === 0 ? (
            <div className="empty">
              <h2>The wire is quiet.</h2>
              <p>No story has passed verification in this edition yet. The desk re-checks every 10 minutes.</p>
            </div>
          ) : (
            <>
              {packages.map((s, i) => <Package key={s.id} s={s} now={now} lead={i === 0} flip={i === 2} />)}
              {row.length > 0 && (
                <div className="cols cols-3">
                  {row.map((s) => <Small key={s.id} s={s} now={now} />)}
                </div>
              )}
            </>
          )}
        </div>

        <aside className="rail" aria-label="Risk meters and highlights">
          <div>
            <h2 className="rail-h"><span>Today&apos;s Risk Meters</span><small>updated daily</small></h2>
            <Meter reading={ed.today.replacement} previous={prev?.replacement} history={ed.history.map((h) => h.replacement.index)} />
            <Meter reading={ed.today.extinction} previous={prev?.extinction} history={ed.history.map((h) => h.extinction.index)} drivers={false} />
            <MeterNote />
          </div>

          {mostCorroborated.length > 0 && (
            <div>
              <h2 className="rail-h"><span>Most Confirmed</span><small>by number of outlets</small></h2>
              <ol className="numbered">
                {mostCorroborated.map((s) => (
                  <li key={s.id}>
                    <div>
                      <Link href={storyPath(s)}><h3 className="hl-s">{s.headline}</h3></Link>
                      <div className="meta"><span>{s.outlets.length} outlets</span><span>{ago(s.lastUpdate, now)}</span></div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div>
            <h2 className="rail-h"><span>Awaiting Confirmation</span><small>{ed.queue.length} reports</small></h2>
            <p className="note">Single-source reports. They reach the front page only after an independent outlet confirms them.</p>
            <ul className="headlines">
              {ed.queue.slice(0, 4).map((q) => (
                <li key={q.id}>
                  <a href={q.reports[0].link} target="_blank" rel="noopener noreferrer" className="hl-s" style={{ display: "block" }}>{q.headline}</a>
                  <div className="meta"><span className="verified pending">◌ 1 source</span><span>{q.outlets[0]}</span></div>
                </li>
              ))}
            </ul>
            <Link href="/queue" className="btn" style={{ marginTop: 10 }}>See all reports awaiting confirmation</Link>
          </div>
        </aside>
      </div>

      {bands.map(({ sec, list }) => (
        <section className="band" key={sec.slug} aria-labelledby={`band-${sec.slug}`}>
          <div className="band-head">
            <h2 id={`band-${sec.slug}`}><Link href={`/section/${sec.slug}`}>{sec.name} ›</Link></h2>
            <span>{sec.blurb}</span>
          </div>
          <div className="cols cols-4">
            {list.map((s, i) => <Small key={s.id} s={s} now={now} image={i === 0 || list.length <= 2} />)}
          </div>
        </section>
      ))}
    </>
  );
}
