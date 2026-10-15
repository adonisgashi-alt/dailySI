import Link from "next/link";

export default function NotFound() {
  return (
    <div className="story">
      <div className="kicker">404</div>
      <h1>This story has left the wire.</h1>
      <p className="dek">Stories rotate off the front page as newer confirmed reports arrive.</p>
      <p><Link href="/" style={{ textDecoration: "underline" }}>Return to today&apos;s edition →</Link></p>
    </div>
  );
}
