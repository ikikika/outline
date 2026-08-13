import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { AppThemeProvider } from "@/components/theme/AppThemeProvider";
import {
  COLOR_MODE_ATTR,
  COLOR_MODE_STORAGE_KEY,
  COLOR_SCHEME_STORAGE_KEY,
} from "@/components/theme/colorModeStorage";
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
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <InitColorSchemeScript
          attribute={COLOR_MODE_ATTR}
          modeStorageKey={COLOR_MODE_STORAGE_KEY}
          colorSchemeStorageKey={COLOR_SCHEME_STORAGE_KEY}
          defaultMode="system"
        />
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
            <SiteFooter />
          </Box>
        </AppThemeProvider>
      </body>
    </html>
  );
}
