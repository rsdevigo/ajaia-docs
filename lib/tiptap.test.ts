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

describe("isTiptapDoc (structure, not just node names)", () => {
  // Every node/mark name below is individually allowed, but the nesting is not valid for the editor.
  it("rejects documents the editor schema cannot hold", () => {
    expect(isTiptapDoc({ type: "doc", content: [{ type: "listItem" }] })).toBe(false); // listItem outside a list
    expect(isTiptapDoc({ type: "doc", content: [{ type: "paragraph", content: [{ type: "paragraph" }] }] })).toBe(false); // block inside inline
    expect(isTiptapDoc({ type: "doc", content: [] })).toBe(false); // doc needs at least one block
  });
});
