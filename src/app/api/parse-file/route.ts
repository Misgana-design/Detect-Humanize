import mammoth from "mammoth";
import { NextResponse } from "next/server";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  MAX_UPLOAD_SIZE,
  getFileExtension,
  isSupportedFile,
  stripRtf,
} from "@/lib/uploads";

// Required for mammoth (DOCX) and pdfjs — both need Node.js APIs
export const runtime = "nodejs";

async function parsePdf(buffer: ArrayBuffer): Promise<string> {
  // Import the legacy pdfjs build (CommonJS-compatible, no browser APIs needed)
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // pdfjs v5 requires workerSrc to point to the actual worker file.
  // In a Node.js server environment we use a file:// URL so pdfjs can
  // dynamically import the worker module in-process (fake worker mode).
  const workerPath = path.resolve(
    process.cwd(),
    "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
  );
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

  // Point to the standard fonts bundled with pdfjs to suppress the font warning
  const standardFontDataUrl =
    pathToFileURL(
      path.resolve(process.cwd(), "node_modules/pdfjs-dist/standard_fonts/"),
    ).href + "/";

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    standardFontDataUrl,
  });

  const pdf = await loadingTask.promise;

  const pageTexts = await Promise.all(
    Array.from({ length: pdf.numPages }, async (_, i) => {
      const page = await pdf.getPage(i + 1);
      const content = await page.getTextContent();
      return content.items
        .map((item) => ("str" in item ? (item as { str: string }).str : ""))
        .join(" ");
    }),
  );

  return pageTexts.join("\n\n").trim();
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: "File exceeds the 10MB upload limit." },
        { status: 400 },
      );
    }

    if (!isSupportedFile(file.name)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use TXT, MD, RTF, DOCX, or PDF." },
        { status: 400 },
      );
    }

    const extension = getFileExtension(file.name);
    const buffer = await file.arrayBuffer();
    let text = "";

    if (extension === ".txt" || extension === ".md") {
      text = await file.text();
    } else if (extension === ".rtf") {
      text = stripRtf(await file.text());
    } else if (extension === ".docx") {
      const result = await mammoth.extractRawText({
        buffer: Buffer.from(buffer),
      });
      text = result.value.trim();
    } else if (extension === ".pdf") {
      text = await parsePdf(buffer);
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: "We could not extract readable text from that file." },
        { status: 400 },
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("FILE_PARSE_ERROR:", error);
    return NextResponse.json(
      { error: "Failed to parse the uploaded file." },
      { status: 500 },
    );
  }
}
