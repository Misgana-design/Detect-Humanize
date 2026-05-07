export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".rtf", ".docx", ".pdf"];

export const SUPPORTED_UPLOAD_LABEL =
  "Supported: TXT, MD, RTF, DOCX, PDF | Max 10MB";

export function getFileExtension(filename: string) {
  const index = filename.lastIndexOf(".");
  return index === -1 ? "" : filename.slice(index).toLowerCase();
}

export function isSupportedFile(filename: string) {
  return SUPPORTED_EXTENSIONS.includes(getFileExtension(filename));
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function stripRtf(text: string) {
  return text
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\'[0-9a-fA-F]{2}/g, "")
    .replace(/\\[a-z]+-?\d* ?/g, "")
    .replace(/[{}]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
