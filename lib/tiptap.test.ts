import { describe, expect, it } from "vitest";
import { EMPTY_DOC, isTiptapDoc } from "./tiptap";

describe("isTiptapDoc", () => {
  it("accepts the empty doc and formatted content", () => {
    expect(isTiptapDoc(EMPTY_DOC)).toBe(true);
    expect(
      isTiptapDoc({
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Hi" }] },
          {
            type: "paragraph",
            content: [{ type: "text", text: "x", marks: [{ type: "bold" }, { type: "underline" }] }],
          },
          {
            type: "bulletList",
            content: [{ type: "listItem", content: [{ type: "paragraph" }] }],
          },
        ],
      }),
    ).toBe(true);
  });

  it("rejects non-doc roots and non-objects", () => {
    for (const v of [null, "doc", 42, [], {}, { type: "paragraph" }]) {
      expect(isTiptapDoc(v)).toBe(false);
    }
  });

  it("rejects unknown node or mark types and malformed fields", () => {
    expect(isTiptapDoc({ type: "doc", content: [{ type: "script" }] })).toBe(false);
    expect(
      isTiptapDoc({ type: "doc", content: [{ type: "text", text: "x", marks: [{ type: "evil" }] }] }),
    ).toBe(false);
    expect(isTiptapDoc({ type: "doc", content: [{ type: "text" }] })).toBe(false);
    expect(isTiptapDoc({ type: "doc", content: "nope" })).toBe(false);
  });

  it("rejects absurdly deep nesting", () => {
    let node: Record<string, unknown> = { type: "paragraph" };
    for (let i = 0; i < 100; i++) node = { type: "blockquote", content: [node] };
    expect(isTiptapDoc({ type: "doc", content: [node] })).toBe(false);
  });
});
