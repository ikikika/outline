import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { SiteHeader } from "@/components/SiteHeader";
import { AppThemeProvider } from "@/components/theme/AppThemeProvider";
import {
  defaultDescription,
  defaultTitle,
  getSiteUrl,
  siteName,
} from "@/lib/site";
import "./globals.css";
import "./highlight.css";

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
    <html lang="en" data-color-mode="light" suppressHydrationWarning>
      <body>
        <AppThemeProvider>
          <Box
            sx={{
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
              bgcolor: "background.default",
            }}
          >
            <SiteHeader />
            <Container
              component="main"
              maxWidth="md"
              sx={{
                flex: 1,
                py: { xs: 3, sm: 4 },
                px: { xs: 2, sm: 3 },
                maxWidth: "42rem !important",
              }}
            >
              {children}
            </Container>
          </Box>
        </AppThemeProvider>
      </body>
    </html>
  );
}
