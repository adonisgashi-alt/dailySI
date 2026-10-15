import Link from "next/link";
import { SECTIONS } from "@/lib/sections";
import { SITE } from "@/lib/site";

export function Footer() {
  return (
    <footer className="site">
      <div className="wrap">
        <Link href="/" className="brand">Daily Super Intelligence</Link>
        <div className="site-index">
          <div>
            <h4>News</h4>
            <ul>
              <li><Link href="/">Front Page</Link></li>
              <li><Link href="/latest">Latest News</Link></li>
              <li><Link href="/queue">Awaiting Confirmation</Link></li>
            </ul>
          </div>
          <div>
            <h4>Sections</h4>
            <ul>
              {SECTIONS.slice(0, 4).map((s) => <li key={s.slug}><Link href={`/section/${s.slug}`}>{s.name}</Link></li>)}
            </ul>
          </div>
          <div>
            <h4>&nbsp;</h4>
            <ul>
              {SECTIONS.slice(4).map((s) => <li key={s.slug}><Link href={`/section/${s.slug}`}>{s.name}</Link></li>)}
            </ul>
          </div>
          <div>
            <h4>About</h4>
            <ul>
              <li><Link href="/risk">Risk Meters</Link></li>
              <li><Link href="/about">Standards &amp; Methods</Link></li>
              <li><a href="/feed.xml">RSS Feed</a></li>
              <li><a href="/api/news">Open Data (JSON)</a></li>
              <li><a href="/llms.txt">For AI Assistants</a></li>
            </ul>
          </div>
        </div>
        <div className="fine">
          <span>© {new Date().getFullYear()} {SITE.name}. Headlines link to and credit their original publishers.</span>
          <span>Updated automatically every 10 minutes.</span>
        </div>
      </div>
    </footer>
  );
}
