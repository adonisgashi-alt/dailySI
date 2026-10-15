import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page">
      <p className="kicker">Page not found</p>
      <h1 className="title">This story has left the front page.</h1>
      <p className="dek">Stories rotate off as newer confirmed reports arrive.</p>
      <p style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/" className="btn">Today&apos;s front page</Link>
        <Link href="/latest" className="btn">Latest news</Link>
      </p>
    </div>
  );
}
