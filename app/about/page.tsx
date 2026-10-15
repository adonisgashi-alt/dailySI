import type { Metadata } from "next";
import Link from "next/link";
import { SOURCES } from "@/lib/sources";
import { RELEVANCE_THRESHOLD } from "@/lib/desk";

export const metadata: Metadata = { title: "Standards & Methodology" };

export default function About() {
  const newsrooms = [...new Set(SOURCES.filter((s) => !s.primary).map((s) => s.outlet))];
  const primaries = [...new Set(SOURCES.filter((s) => s.primary).map((s) => s.outlet))];
  return (
    <article className="story prose">
      <div className="kicker"><Link href="/">← Front page</Link></div>
      <h1>Standards &amp; Methodology</h1>
      <p className="dek">
        Daily Super Intelligence is an automated newsroom that covers one beat: the road to superintelligence. Every story on the front
        page has passed the verification standard below.
      </p>

      <h2 id="beat">The beat</h2>
      <p>
        The desk reads {SOURCES.length} feeds every ten minutes and keeps only reports about superintelligence, AGI, frontier
        AI labs and models, AI safety and alignment, compute, and AI&apos;s effect on human work. Each report is scored against a
        weighted vocabulary of the beat; anything scoring below {RELEVANCE_THRESHOLD} is dropped as off-topic, along with deals,
        reviews and sponsored posts.
      </p>

      <h2 id="verification">Verification: confirmed before it prints</h2>
      <p>Reports of the same event are grouped by comparing their headlines, with rare words such as model names counting more than common ones. A story is published only when:</p>
      <ul>
        <li><b>Two or more independent outlets</b> report it. Two feeds from the same publisher count as one; or</li>
        <li>it comes from a <b>primary source</b>: the lab or company that made the news announcing it itself ({primaries.join(", ")}).</li>
      </ul>
      <p>
        Single-source reports wait in the <Link href="/#wire">verification queue</Link> and are never presented as confirmed. The
        confidence bar on each story rises with every additional independent outlet. Our headlines and summaries come from the
        original reporting, and every story links to and credits its sources.
      </p>
      <p>Newsrooms monitored: {newsrooms.join(", ")}.</p>

      <h2 id="risk">The AI Replacing Humans Risk meter</h2>
      <p>
        A 0–100 gauge of how strongly the week&apos;s <i>confirmed</i> news points toward AI replacing human work. Each story is
        checked for <b>pressure signals</b> (replacement of workers, AI-linked layoffs, automation, autonomous agents, superhuman
        benchmark results, self-improving systems, humanoid robots) and <b>relief signals</b> (regulation and oversight, safety
        measures, job creation and augmentation, documented capability limits, worker pushback).
      </p>
      <p>
        A story&apos;s weight decays with age (it fades over roughly three days) and grows with the number of outlets confirming it. The net
        signal moves the index away from a baseline of 52 along a smooth curve, so no single headline can pin the needle. Bands:
        Low (&lt;25), Guarded (25–44), Elevated (45–61), High (62–79), Severe (80+). The top drivers are listed under the gauge.
      </p>
      <p><i>The index reads the news. It does not forecast the labor market.</i></p>

      <h2 id="images">Images</h2>
      <p>
        We do not reuse publishers&apos; photos. Illustrative photography comes from <a href="https://openverse.org" style={{ textDecoration: "underline" }}>Openverse</a>,
        limited to licenses that allow reuse (CC0, CC BY, CC BY-SA, public domain), and always shows its creator and license.
        When no photo fits, Daily Super Intelligence generates an original thumbnail, labelled <span className="badge">◇ Generated</span>.
      </p>

      <h2 id="data">Open data</h2>
      <p>The whole edition, including the risk reading, is available as JSON at <a href="/api/news" style={{ textDecoration: "underline" }}>/api/news</a>.</p>
    </article>
  );
}
