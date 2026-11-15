// Tiptap JSON -> Markdown, used by "Export as Markdown". Pure and DOM-free so it can be unit-tested.
// Underline has no Markdown equivalent, so underlined text is exported as plain text.

type Mark = { type: string; attrs?: Record<string, unknown> };
type JSONNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: JSONNode[];
  text?: string;
  marks?: Mark[];
};

/** Escape characters that would otherwise be read as inline Markdown. */
const escapeText = (s: string) => s.replace(/([\\`*_[\]])/g, "\\$1");

/** Escape a line start that would otherwise become a heading, quote, list or rule. */
const escapeLineStart = (line: string) =>
  line
    .replace(/^(#{1,6}\s|>|[-+]\s|-{3,})/, "\\$1")
    .replace(/^(\d+)([.)]\s)/, "$1\\$2");

/** Wrap in a delimiter, keeping edge whitespace outside it ("**bold **" is not valid Markdown). */
function wrap(text: string, delimiter: string) {
  const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!m || !m[2]) return text;
  return `${m[1]}${delimiter}${m[2]}${delimiter}${m[3]}`;
}

function renderText(node: JSONNode): string {
  const types = new Set(node.marks?.map((m) => m.type));
  let out = node.text ?? "";
  if (!types.has("code")) out = escapeText(out);
  if (types.has("code")) out = wrap(out, "`");
  if (types.has("italic")) out = wrap(out, "*");
  if (types.has("bold")) out = wrap(out, "**");
  if (types.has("strike")) out = wrap(out, "~~");
  // "underline" is intentionally not handled: exported as plain text.
  const href = node.marks?.find((m) => m.type === "link")?.attrs?.href;
  if (typeof href === "string" && href) {
    out = `[${out}](${href.replace(/ /g, "%20").replace(/\)/g, "%29")})`;
  }
  return out;
}

function renderInline(nodes: JSONNode[] = []): string {
  return nodes
    .map((n) => (n.type === "text" ? renderText(n) : n.type === "hardBreak" ? "  \n" : ""))
    .join("");
}

const isList = (n: JSONNode) => n.type === "bulletList" || n.type === "orderedList";

/** One list item; continuation lines are indented to sit under the item text. */
function renderItem(item: JSONNode, marker: string): string {
  let body = "";
  for (const child of item.content ?? []) {
    const block = renderBlock(child);
    if (!block) continue;
    body += body ? (isList(child) ? "\n" : "\n\n") + block : block;
  }
  const [first = "", ...rest] = body.split("\n");
  const indent = " ".repeat(marker.length);
  return [marker + first, ...rest.map((l) => (l ? indent + l : l))].join("\n");
}

function renderBlock(node: JSONNode): string {
  const kids = node.content ?? [];
  switch (node.type) {
    case "paragraph":
      return renderInline(kids).split("\n").map(escapeLineStart).join("\n");
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 1));
      return `${"#".repeat(level)} ${renderInline(kids)}`;
    }
    case "bulletList":
      return kids.map((li) => renderItem(li, "- ")).join("\n");
    case "orderedList": {
      const start = Number(node.attrs?.start) || 1;
      return kids.map((li, i) => renderItem(li, `${start + i}. `)).join("\n");
    }
    case "blockquote":
      return renderBlocks(kids)
        .split("\n")
        .map((l) => (l ? `> ${l}` : ">"))
        .join("\n");
    case "codeBlock": {
      const code = kids.map((k) => k.text ?? "").join("");
      const language = typeof node.attrs?.language === "string" ? node.attrs.language : "";
      let fence = "```";
      while (code.includes(fence)) fence += "`";
      return `${fence}${language}\n${code}\n${fence}`;
    }
    case "horizontalRule":
      return "---";
    default:
      return renderInline(kids);
  }
}

function renderBlocks(nodes: JSONNode[]): string {
  return nodes.map(renderBlock).filter((s) => s !== "").join("\n\n");
}

export function tiptapToMarkdown(doc: unknown): string {
  const markdown = renderBlocks((doc as JSONNode | null)?.content ?? []);
  return markdown ? markdown + "\n" : "";
}

/** "<title>.md", with characters that are invalid in file names replaced. */
export function markdownFilename(title: string): string {
  const base = title
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .replace(/[. ]+$/, "")
    .slice(0, 100);
  return `${base || "document"}.md`;
}
