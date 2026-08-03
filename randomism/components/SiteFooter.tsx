import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { siteName } from "@/lib/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        mt: "auto",
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        color: "text.secondary",
      }}
    >
      <Box
        sx={{
          maxWidth: "42rem",
          width: "100%",
          mx: "auto",
          px: { xs: 2, sm: 3 },
          py: 2.5,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Typography variant="body2" component="p" sx={{ m: 0 }}>
          © {year} {siteName}
        </Typography>
        <Typography variant="body2" component="p" sx={{ m: 0 }}>
          JSON-driven articles
        </Typography>
      </Box>
    </Box>
  );
}
