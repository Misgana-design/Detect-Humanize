"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Trash2, UploadCloud } from "lucide-react";
import {
  MAX_UPLOAD_SIZE,
  SUPPORTED_EXTENSIONS,
  SUPPORTED_UPLOAD_LABEL,
  formatBytes,
  isSupportedFile,
} from "@/lib/uploads";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minHeightClassName?: string;
  description?: string;
};

export function TextUploadField({
  value,
  onChange,
  placeholder,
  minHeightClassName = "min-h-[320px]",
  description = SUPPORTED_UPLOAD_LABEL,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string } | null>(
    null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  const parseFile = async (file: File) => {
    setUploadError(null);

    if (file.size > MAX_UPLOAD_SIZE) {
      setFileInfo(null);
      setUploadError("File exceeds the 10MB upload limit.");
      return;
    }

    if (!isSupportedFile(file.name)) {
      setFileInfo(null);
      setUploadError(
        `Unsupported file type. Use ${SUPPORTED_EXTENSIONS.map((ext) => ext.replace(".", "").toUpperCase()).join(", ")}.`,
      );
      return;
    }

    setIsParsing(true);

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/parse-file", {
        method: "POST",
        body,
      });

      const payload = (await response.json()) as {
        text?: string;
        error?: string;
      };

      if (!response.ok || !payload.text) {
        throw new Error(payload.error || "Failed to parse uploaded file.");
      }

      onChange(payload.text);
      setFileInfo({
        name: file.name,
        size: formatBytes(file.size),
      });
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Failed to parse uploaded file.",
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileList = (files: FileList | null) => {
    const file = files?.[0];
    if (file) void parseFile(file);
  };
  const charCount = value.length;
  const lineCount = value ? value.split(/\r\n|\r|\n/).length : 0;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFileList(e.dataTransfer.files);
        }}
        className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
          isDragging
            ? "border-indigo-400 ring-4 ring-indigo-100"
            : "border-slate-200"
        }`}
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Paste or upload text
            </p>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".txt,.md,.rtf,.docx,.pdf"
              className="hidden"
              onChange={(e) => handleFileList(e.target.files)}
            />
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setFileInfo(null);
                  setUploadError(null);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-rose-600"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <UploadCloud className="h-4 w-4" />
              Click to browse
            </button>
          </div>
        </div>

        <label className="block p-3">
          <span className="sr-only">Text input</span>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            spellCheck
            className={`w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-4 text-base leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 ${minHeightClassName}`}
          />
        </label>

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-white px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>{SUPPORTED_UPLOAD_LABEL}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-slate-400 sm:inline">
              {charCount.toLocaleString()} chars · {lineCount.toLocaleString()} lines
            </span>
            {isParsing && (
              <span className="inline-flex items-center gap-2 text-indigo-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Parsing file...
              </span>
            )}
            {fileInfo && !isParsing && (
              <span className="text-slate-600">
                {fileInfo.name} • {fileInfo.size}
              </span>
            )}
          </div>
        </div>
      </div>

      {uploadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {uploadError}
        </div>
      )}
    </div>
  );
}
