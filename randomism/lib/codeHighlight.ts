import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";

let registered = false;

function ensureLanguages() {
  if (registered) return;
  hljs.registerLanguage("bash", bash);
  hljs.registerLanguage("css", css);
  hljs.registerLanguage("javascript", javascript);
  hljs.registerLanguage("json", json);
  hljs.registerLanguage("typescript", typescript);
  hljs.registerLanguage("xml", xml);
  hljs.registerAliases(["js", "jsx"], { languageName: "javascript" });
  hljs.registerAliases(["ts", "tsx"], { languageName: "typescript" });
  hljs.registerAliases(["html", "svg"], { languageName: "xml" });
  hljs.registerAliases(["sh", "shell", "zsh"], { languageName: "bash" });
  registered = true;
}

/** Highlight source to HTML spans (hljs token classes). Escapes when unhighlighted. */
export function highlightCode(code: string, language?: string): string {
  ensureLanguages();
  const lang = language?.trim().toLowerCase();
  if (lang && hljs.getLanguage(lang)) {
    return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
  }
  return escapeHtml(code);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Aliases for rehype-highlight (keys = highlight.js names). */
export const markdownHighlightAliases: Record<string, string | string[]> = {
  typescript: ["ts", "tsx"],
  javascript: ["js", "jsx"],
  xml: ["html", "svg"],
  bash: ["sh", "shell", "zsh"],
};
