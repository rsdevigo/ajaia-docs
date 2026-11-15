// Small, dependency-free import rules shared by the server route and the browser UI.

export const IMPORT_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const IMPORT_EXTENSIONS = [".txt", ".md", ".docx"] as const;
export type ImportKind = "txt" | "md" | "docx";

/** The upload type for a file name, or null if unsupported. */
export function detectKind(filename: string): ImportKind | null {
  const ext = filename.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
  switch (ext) {
    case ".txt":
      return "txt";
    case ".md":
      return "md";
    case ".docx":
      return "docx";
    default:
      return null;
  }
}

/** File name without its extension, trimmed to the 200-char title limit. */
export function titleFromFilename(filename: string): string {
  const name = filename.replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "").trim();
  return (name || "Imported document").slice(0, 200);
}
