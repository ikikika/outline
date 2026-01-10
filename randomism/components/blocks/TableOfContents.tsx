import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Typography from "@mui/material/Typography";
import type { Block } from "@/lib/schema/article";

type TocBlock = Extract<Block, { componentType: "TableOfContents" }>;

/**
 * Server Component: native hash links update the URL fragment.
 * Smooth / reduced-motion scrolling comes from `app/globals.css` (no scroll-spy).
 */
export function TableOfContents({ block }: { block: TocBlock }) {
  return (
    <Box
      component="nav"
      aria-label="On this page"
      sx={{
        py: 1.5,
        px: 2,
        borderLeft: 3,
        borderColor: "primary.main",
        bgcolor: "action.hover",
        borderRadius: 1,
      }}
    >
      <Typography
        component="p"
        variant="subtitle2"
        sx={{ mb: 0.5, fontWeight: 700, color: "text.secondary" }}
      >
        On this page
      </Typography>
      <List dense disablePadding sx={{ listStyleType: "disc", pl: 2.5 }}>
        {block.items.map((item) => (
          <ListItem
            key={`${item.href}-${item.label}`}
            disableGutters
            sx={{ display: "list-item", py: 0.25 }}
          >
            <Link href={`#${item.href}`} underline="hover" color="primary">
              {item.label}
            </Link>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
