import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import {
  defaultDescription,
  defaultTitle,
  getSiteUrl,
  siteName,
} from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: defaultTitle,
    template: `%s · ${siteName}`,
  },
  description: defaultDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="site-shell">
          <SiteHeader />
          <main className="site-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
