import Link from "next/link";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { ColorModeToggle } from "@/components/theme/ColorModeToggle";
import { siteName } from "@/lib/site";

export function SiteHeader() {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="transparent"
      sx={{
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        color: "text.primary",
      }}
    >
      <Toolbar
        sx={{
          maxWidth: "42rem",
          width: "100%",
          mx: "auto",
          px: { xs: 2, sm: 3 },
          gap: 1,
          justifyContent: "space-between",
        }}
      >
        <Typography
          component={Link}
          href="/"
          variant="h6"
          sx={{
            textDecoration: "none",
            color: "inherit",
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          {siteName}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <ColorModeToggle />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
