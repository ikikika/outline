import Link from "next/link";
import { siteName } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="site-header">
      <p className="site-brand">
        <Link href="/">{siteName}</Link>
      </p>
      <nav aria-label="Primary">
        <Link href="/">Articles</Link>
      </nav>
    </header>
  );
}
