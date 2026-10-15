import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE.name} handles data, cookies and advertising.`,
  alternates: { canonical: "/privacy" },
};

export default function Privacy() {
  return (
    <article className="page prose">
      <h1 className="title">Privacy Policy</h1>
      <p className="dek">Last updated October 15, 2026.</p>

      <h2>What we collect</h2>
      <p>
        {SITE.name} has no accounts, sign-ups or comment forms, and we do not ask for personal information. Our hosting provider
        (Vercel) processes standard request data such as IP addresses and browser type to deliver and secure the site.
      </p>

      <h2>Analytics</h2>
      <p>
        We use Google Analytics to understand how many people visit and which pages they read. It sets cookies and collects data such as
        pages viewed, approximate location, and device and browser type. We do not use it to identify you. Learn more in{" "}
        <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">how Google uses information from sites that use its services</a>,
        or opt out with the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google Analytics opt-out add-on</a>.
      </p>

      <h2>Advertising and cookies</h2>
      <p>
        We use Google AdSense to show ads. Google and its partners use cookies to serve ads based on your visits to this and other
        websites. Google&apos;s use of advertising cookies enables it and its partners to serve ads based on your visits to our site
        and/or other sites on the Internet.
      </p>
      <p>
        You can opt out of personalized advertising in <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>,
        or opt out of third-party vendors&apos; use of cookies for personalized advertising at{" "}
        <a href="https://www.aboutads.info/choices" target="_blank" rel="noopener noreferrer">aboutads.info</a>. Learn more in{" "}
        <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">how Google uses information from sites that use its services</a>.
      </p>

      <h2>Third-party content</h2>
      <p>
        Headlines link to the original publishers, and photos load from Wikimedia Commons and Openverse. Those sites have their own
        privacy policies.
      </p>

      <h2>Contact</h2>
      <p>Questions about this policy can be raised through the site&apos;s GitHub repository.</p>
    </article>
  );
}
