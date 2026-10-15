import type { Metadata } from "next";
import Link from "next/link";
import { SOURCES } from "@/lib/sources";
import { RELEVANCE_THRESHOLD } from "@/lib/desk";

export const metadata: Metadata = {
  title: "Standards & Methods",
  description: "How Daily Super Intelligence chooses, verifies and illustrates the news, and how the risk meters work.",
  alternates: { canonical: "/about" },
};

export default function About() {
  const newsrooms = [...new Set(SOURCES.filter((s) => !s.primary).map((s) => s.outlet))];
  const primaries = [...new Set(SOURCES.filter((s) => s.primary).map((s) => s.outlet))];
  return (
    <article className="page prose">
      <h1 className="title">Standards &amp; Methods</h1>
      <p className="dek">
        Daily Super Intelligence is an automated newsroom that covers one beat: the road to superintelligence. Every story on the front
        page has passed the verification standard below.
      </p>

      <h2>The beat</h2>
      <p>
        The desk reads {SOURCES.length} feeds every ten minutes and keeps only reports about superintelligence, AGI, frontier
        AI labs and models, AI safety and alignment, compute, and AI&apos;s effect on human work. Each report is scored against a
        weighted vocabulary of the beat; anything scoring below {RELEVANCE_THRESHOLD} is dropped as off-topic, along with deals,
        reviews and sponsored posts.
      </p>

      <h2>Verification: confirmed before it prints</h2>
      <p>Reports of the same event are grouped by comparing their headlines, with rare words such as model names counting more than common ones. A story is published only when:</p>
      <ul>
        <li><b>Two or more independent outlets</b> report it. Two feeds from the same publisher count as one; or</li>
        <li>it comes from a <b>primary source</b>: the lab or company that made the news announcing it itself ({primaries.join(", ")}).</li>
      </ul>
      <p>
        Single-source reports wait on the <Link href="/queue">Awaiting Confirmation</Link> page and are never presented as confirmed. The
        confidence bar on each story rises with every additional independent outlet. Our headlines and summaries come from the
        original reporting, and every story links to and credits its sources.
      </p>
      <p>Newsrooms monitored: {newsrooms.join(", ")}.</p>

      <h2>The risk meters</h2>
      <p>
        Two daily gauges, <b>AI Replacing Humans Risk</b> and <b>AI Extinction Risk</b>, read the week&apos;s confirmed news and
        update once a day at midnight UTC. The <Link href="/risk">Risk Meters</Link> page explains the signals, shows what moved each
        meter, and keeps the daily history. They measure what the news says; they are not forecasts.
      </p>

      <h2>Images</h2>
      <p>
        We do not reuse publishers&apos; photos. When a story is about a person, company or place, we use a freely licensed photo
        of it from <a href="https://commons.wikimedia.org">Wikimedia Commons</a>. Otherwise we use illustrative photography from{" "}
        <a href="https://openverse.org">Openverse</a>, limited to licenses that allow reuse (CC0, CC BY, CC BY-SA, public domain).
        Every photo shows its creator and license. When no photo fits, we draw a simple illustration of our own.
      </p>

      <h2>Open data</h2>
      <p>The whole edition, including the risk reading, is available as JSON at <a href="/api/news" style={{ textDecoration: "underline" }}>/api/news</a>.</p>
    </article>
  );
}
