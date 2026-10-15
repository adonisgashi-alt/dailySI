import Link from "next/link";
import { getEdition, WIRE_REFRESH } from "@/lib/news";
import { editionDate, ago } from "@/lib/format";
import { ArtFigure, StoryMeta, VerifiedBadge } from "@/components/StoryBits";
import { RiskMeter } from "@/components/RiskMeter";
import { Ticker } from "@/components/Ticker";

export const revalidate = 600; // keep in sync with WIRE_REFRESH

export default async function FrontPage() {
  const ed = await getEdition();
  const now = ed.generatedAt;
  const [lead, ...rest] = ed.stories;
  const grid = rest.slice(0, 6);
  const more = rest.slice(6, 24);
  const online = ed.feeds.filter((f) => f.ok).length;

  return (
    <>
      <header className="masthead">
        <h1>
          <Link href="/">The Daily <span className="si">SI</span></Link>
        </h1>
        <p className="tagline">“All the Superintelligence News That&apos;s Confirmed to Print”</p>
        <div className="dateline">
          <span>{editionDate(now)}</span>
          <nav>
            <Link href="/">Front Page</Link>
            <Link href="/#wire">Verification Queue</Link>
            <Link href="/about">Standards</Link>
          </nav>
          <span>Edition updated {new Date(now).toISOString().slice(11, 16)} UTC · refreshes every {WIRE_REFRESH / 60} min</span>
        </div>
      </header>

      <Ticker stories={ed.stories} />

      <main className="front">
        <div>
          {!lead ? (
            <div className="empty">
              <h2 style={{ fontFamily: "var(--display)" }}>The wire is quiet.</h2>
              <p>No story has passed verification in this edition yet. The desk re-checks every {WIRE_REFRESH / 60} minutes.</p>
            </div>
          ) : (
            <>
              <article className="lead">
                <div>
                  <div className="kicker">
                    <span>Lead story</span>
                    <VerifiedBadge story={lead} />
                  </div>
                  <h2><Link href={`/story/${lead.id}`}>{lead.headline}</Link></h2>
                  {lead.summary && <p className="dek">{lead.summary}</p>}
                  <StoryMeta story={lead} now={now} />
                  <ul className="clean" style={{ marginTop: 14, fontFamily: "var(--sans)", fontSize: 14 }}>
                    {lead.reports.filter((r) => r.title !== lead.headline).slice(0, 3).map((r) => (
                      <li key={r.link} style={{ padding: "6px 0", borderTop: "1px solid var(--rule)" }}>
                        <a href={r.link} target="_blank" rel="noopener noreferrer">
                          <b style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)", textTransform: "uppercase" }}>{r.outlet}</b> {r.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                <ArtFigure art={lead.art} />
              </article>

              <h2 className="section-head" style={{ marginTop: 26 }}>
                <span>Top stories</span>
                <small>each confirmed by independent or primary sources</small>
              </h2>
              <div className="grid">
                {grid.map((s) => (
                  <article key={s.id}>
                    <Link href={`/story/${s.id}`}><ArtFigure art={s.art} caption={false} /></Link>
                    <div className="kicker" style={{ marginTop: 10 }}><VerifiedBadge story={s} /></div>
                    <h3><Link href={`/story/${s.id}`}>{s.headline}</Link></h3>
                    {s.summary && <p>{s.summary.length > 180 ? s.summary.slice(0, s.summary.lastIndexOf(" ", 180)) + "…" : s.summary}</p>}
                    <StoryMeta story={s} now={now} />
                  </article>
                ))}
              </div>

              {more.length > 0 && (
                <>
                  <h2 className="section-head" style={{ marginTop: 30 }}><span>More from the frontier</span><small>{more.length} stories</small></h2>
                  <div className="list">
                    {more.map((s) => (
                      <article key={s.id}>
                        <div>
                          <div className="kicker"><VerifiedBadge story={s} /></div>
                          <h3><Link href={`/story/${s.id}`}>{s.headline}</Link></h3>
                          <StoryMeta story={s} now={now} />
                        </div>
                        <Link href={`/story/${s.id}`}><ArtFigure art={s.art} caption={false} /></Link>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <aside>
          <RiskMeter initial={ed.risk} />

          <section className="module" id="wire">
            <h2 className="section-head"><span>Verification queue</span><small>not yet published</small></h2>
            <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "0 0 6px" }}>
              Single-source reports. They post to the front page only once an independent outlet or primary source confirms them.
            </p>
            {ed.queue.length === 0 ? (
              <p style={{ fontSize: 14 }}>Queue empty.</p>
            ) : (
              <ul className="clean queue">
                {ed.queue.slice(0, 8).map((q) => (
                  <li key={q.id}>
                    <a href={q.reports[0].link} target="_blank" rel="noopener noreferrer">{q.headline}</a>
                    <div className="meta">
                      <span className="badge pending">◌ 1 source</span>
                      <span>{q.outlets[0]}</span>
                      <span>{ago(q.lastUpdate, now)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="module">
            <h2 className="section-head"><span>SI Wire status</span><small>{online}/{ed.feeds.length} online</small></h2>
            <div className="console" role="status">
              <div className="row"><span>reports scanned</span><span>{ed.scanned}</span></div>
              <div className="row"><span>on-topic (SI/AGI/frontier)</span><span>{ed.relevant}</span></div>
              <div className="row"><span>stories confirmed</span><span style={{ color: "var(--ok)" }}>{ed.stories.length}</span></div>
              <div className="row"><span>held for verification</span><span style={{ color: "var(--warn)" }}>{ed.queue.length}</span></div>
              <div style={{ borderTop: "1px dashed var(--rule)", margin: "8px 0 6px" }} />
              {ed.feeds.map((f) => (
                <div className="row" key={f.outlet}>
                  <span><i className="dot" style={{ background: f.ok ? "var(--ok)" : "var(--danger)" }} />{f.outlet}</span>
                  <span>{f.ok ? f.items : "offline"}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </main>
    </>
  );
}
