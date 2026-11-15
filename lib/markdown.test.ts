import { describe, expect, it } from "vitest";
import { markdownFilename, tiptapToMarkdown } from "./markdown";

const text = (t: string, ...marks: string[]) => ({
  type: "text",
  text: t,
  ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}),
});
const p = (...content: object[]) => ({ type: "paragraph", content });
const li = (...content: object[]) => ({ type: "listItem", content });

describe("tiptapToMarkdown", () => {
  it("converts headings, inline formatting, nested and numbered lists; underline stays plain", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [text("Title")] },
        p(text("Plain, "), text("bold", "bold"), text(", "), text("italic", "italic"), text(" and "), text("underlined", "underline"), text(".")),
        { type: "bulletList", content: [li(p(text("one")), { type: "bulletList", content: [li(p(text("nested")))] }), li(p(text("two", "bold")))] },
        { type: "orderedList", attrs: { start: 1 }, content: [li(p(text("first"))), li(p(text("second")))] },
        p(text("2 * 3 = 6 and # not a heading")),
        p(),
      ],
    };

    expect(tiptapToMarkdown(doc)).toBe(
      [
        "# Title",
        "",
        "Plain, **bold**, *italic* and underlined.",
        "",
        "- one",
        "  - nested",
        "- **two**",
        "",
        "1. first",
        "2. second",
        "",
        "2 \\* 3 = 6 and # not a heading",
        "",
      ].join("\n"),
    );
  });

  it("builds safe file names and returns an empty string for an empty document", () => {
    expect(markdownFilename("Plan: Q1/Q2?")).toBe("Plan- Q1-Q2-.md");
    expect(markdownFilename("  ...  ")).toBe("document.md");
    expect(tiptapToMarkdown({ type: "doc", content: [p()] })).toBe("");
  });
});
