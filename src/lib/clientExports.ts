export type TextExportPayload = {
  title: string;
  body: string;
  metadata?: Record<string, string | number | null | undefined>;
};

function safeFilename(name: string) {
  return name
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "document";
}

function download(filename: string, type: string, content: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function metadataBlock(metadata?: TextExportPayload["metadata"]) {
  if (!metadata) return "";
  const rows = Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `${key}: ${value}`);
  return rows.length ? `${rows.join("\n")}\n\n` : "";
}

export function exportPlainText(payload: TextExportPayload) {
  download(
    `${safeFilename(payload.title)}.txt`,
    "text/plain;charset=utf-8",
    `${metadataBlock(payload.metadata)}${payload.body}`,
  );
}

export function exportMarkdown(payload: TextExportPayload) {
  download(
    `${safeFilename(payload.title)}.md`,
    "text/markdown;charset=utf-8",
    `# ${payload.title}\n\n${metadataBlock(payload.metadata)}${payload.body}`,
  );
}

export function exportJson(filename: string, value: unknown) {
  download(
    `${safeFilename(filename)}.json`,
    "application/json;charset=utf-8",
    JSON.stringify(value, null, 2),
  );
}

export function exportHtmlDoc(payload: TextExportPayload) {
  const meta = metadataBlock(payload.metadata)
    .split("\n")
    .filter(Boolean)
    .map((line) => `<p><strong>${line.split(":")[0]}:</strong>${line.slice(line.indexOf(":") + 1)}</p>`)
    .join("");
  const body = payload.body
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");

  download(
    `${safeFilename(payload.title)}.doc`,
    "application/msword;charset=utf-8",
    `<!doctype html><html><head><meta charset="utf-8"><title>${payload.title}</title></head><body><h1>${payload.title}</h1>${meta}${body}</body></html>`,
  );
}
