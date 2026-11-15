import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ImportError, docxToHtml, importToHtml, mdToHtml, txtToHtml } from "./import";
import { detectKind, titleFromFilename } from "./import-rules";

describe("detectKind / titleFromFilename", () => {
  it("accepts only .txt, .md, .docx (case-insensitive)", () => {
    expect(detectKind("notes.txt")).toBe("txt");
    expect(detectKind("README.MD")).toBe("md");
    expect(detectKind("Report.DocX")).toBe("docx");
    for (const bad of ["a.pdf", "a.doc", "a.exe", "noext", "a.txt.exe"]) {
      expect(detectKind(bad)).toBeNull();
    }
  });

  it("uses the file name without extension as the title", () => {
    expect(titleFromFilename("Meeting notes.txt")).toBe("Meeting notes");
    expect(titleFromFilename("a.b.c.md")).toBe("a.b.c");
    expect(titleFromFilename("C:\\fakepath\\plan.docx")).toBe("plan");
    expect(titleFromFilename(".txt")).toBe("Imported document");
    expect(titleFromFilename("x".repeat(300) + ".txt")).toHaveLength(200);
  });
});

describe("txtToHtml", () => {
  it("splits on blank lines into paragraphs", () => {
    expect(txtToHtml("one\n\ntwo\r\n\r\nthree")).toBe("<p>one</p><p>two</p><p>three</p>");
  });

  it("keeps single newlines as <br> and ignores extra blank lines", () => {
    expect(txtToHtml("a\nb\n\n\n\nc\n")).toBe("<p>a<br>b</p><p>c</p>");
  });

  it("escapes HTML so text can never become markup", () => {
    expect(txtToHtml(`<script>alert("x")</script> & 'q'`)).toBe(
      "<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;q&#39;</p>",
    );
  });

  it("returns an empty string for empty/whitespace input", () => {
    expect(txtToHtml("")).toBe("");
    expect(txtToHtml("  \n\n \n")).toBe("");
  });
});

describe("mdToHtml", () => {
  it("converts headings, emphasis and lists", () => {
    const html = mdToHtml("# Title\n\nSome **bold** and *italic*.\n\n- a\n- b\n\n1. one\n2. two");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toMatch(/<ul>\s*<li>a<\/li>\s*<li>b<\/li>\s*<\/ul>/);
    expect(html).toMatch(/<ol>\s*<li>one<\/li>\s*<li>two<\/li>\s*<\/ol>/);
  });

  it("strips scripts, event handlers, images and javascript: links", () => {
    const html = mdToHtml(
      [
        "<script>alert(1)</script>",
        '<img src=x onerror="alert(1)">',
        '<p onclick="evil()">hi</p>',
        "[bad](javascript:alert(1)) and [ok](https://example.com)",
      ].join("\n\n"),
    );
    expect(html).not.toMatch(/script|onerror|onclick|<img|javascript:/i);
    expect(html).toContain("hi");
    expect(html).toContain('<a href="https://example.com">ok</a>');
  });
});

describe("docxToHtml", () => {
  it("preserves headings, inline formatting and lists from a real .docx", async () => {
    const buffer = readFileSync(join(__dirname, "../tests/fixtures/sample.docx"));
    const html = await docxToHtml(buffer);
    expect(html).toContain("<h1>Project Plan</h1>");
    expect(html).toContain("<h2>Goals</h2>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<u>underlined</u>");
    expect(html).toMatch(/<ul>\s*<li>First bullet<\/li>\s*<li>Second bullet<\/li>\s*<\/ul>/);
    expect(html).toMatch(/<ol>\s*<li>Step one<\/li>\s*<li>Step two<\/li>\s*<\/ol>/);
  });

  it("rejects content that is not a valid .docx", async () => {
    await expect(docxToHtml(Buffer.from("this is not a zip file"))).rejects.toThrow();
  });
});

describe("importToHtml (content validation)", () => {
  const buf = (s: string | number[]) => Buffer.from(s as string);

  it("converts valid text and markdown", async () => {
    expect(await importToHtml("txt", buf("hello"))).toBe("<p>hello</p>");
    expect(await importToHtml("md", buf("# Hi"))).toContain("<h1>Hi</h1>");
  });

  it("rejects binary content, invalid UTF-8 and empty results", async () => {
    await expect(importToHtml("txt", buf("a\0b"))).rejects.toThrow(ImportError);
    await expect(importToHtml("txt", Buffer.from([0xff, 0xfe, 0xfd, 0x80]))).rejects.toThrow(/UTF-8/);
    await expect(importToHtml("txt", buf("   \n\n  "))).rejects.toThrow(/No readable text/);
    await expect(importToHtml("md", buf("<script>alert(1)</script>"))).rejects.toThrow(/No readable text/);
  });

  it("rejects a .docx that isn't a zip, or is a corrupted zip", async () => {
    await expect(importToHtml("docx", buf("plain text renamed to .docx"))).rejects.toThrow(/not a valid \.docx/);
    await expect(importToHtml("docx", Buffer.from("504b0304deadbeef", "hex"))).rejects.toThrow(/could not be read/);
  });

  it("converts the sample .docx", async () => {
    const html = await importToHtml("docx", readFileSync(join(__dirname, "../tests/fixtures/sample.docx")));
    expect(html).toContain("<h1>Project Plan</h1>");
  });
});
