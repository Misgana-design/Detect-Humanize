type ApiErrorBody = {
  error?: unknown;
  message?: unknown;
};

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;

  const body = payload as ApiErrorBody;
  if (typeof body.error === "string" && body.error.trim()) return body.error;
  if (typeof body.message === "string" && body.message.trim()) return body.message;

  return fallback;
}

async function readResponsePayload(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (!text.trim()) return null;

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return {
        error: "The server returned an invalid response. Please try again.",
      };
    }
  }

  return {
    error:
      response.ok
        ? "The server returned an unexpected response. Please try again."
        : "The server could not complete the request. Please try again.",
  };
}

export async function readJsonResponse<T>(
  response: Response,
  fallbackError: string,
): Promise<T> {
  const payload = await readResponsePayload(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, fallbackError));
  }

  if (!payload) {
    throw new Error("The server returned an empty response. Please try again.");
  }

  return payload as T;
}

/**
 * Reads a newline-delimited JSON (NDJSON) stream and yields each record as it
 * arrives. Used by streaming endpoints (e.g. /api/humanize) so callers can
 * render progressive output instead of waiting for the whole response.
 *
 * Malformed lines are skipped — a partially flushed line is never yielded
 * because records are only parsed once their terminating newline has arrived.
 */
export async function* readNdjsonRecords(
  response: Response,
): AsyncGenerator<Record<string, unknown>, void, void> {
  if (!response.body) {
    throw new Error("The server returned an empty response. Please try again.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const parseCompleteLines = (flush: boolean): Record<string, unknown>[] => {
    const records: Record<string, unknown>[] = [];
    let newlineAt = buffer.indexOf("\n");

    while (newlineAt >= 0) {
      const line = buffer.slice(0, newlineAt).trim();
      buffer = buffer.slice(newlineAt + 1);
      if (line) {
        try {
          records.push(JSON.parse(line) as Record<string, unknown>);
        } catch {
          // Skip malformed lines rather than aborting the whole stream.
        }
      }
      newlineAt = buffer.indexOf("\n");
    }

    if (flush && buffer.trim()) {
      try {
        records.push(JSON.parse(buffer) as Record<string, unknown>);
      } catch {
        // Trailing garbage after the last newline — ignore.
      }
      buffer = "";
    }

    return records;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      for (const record of parseCompleteLines(false)) yield record;
    }

    buffer += decoder.decode();
    for (const record of parseCompleteLines(true)) yield record;
  } finally {
    // No-op when the stream already ended; releases the reader if the caller
    // stopped consuming early (e.g. after a "done" or "error" record).
    reader.cancel().catch(() => {});
  }
}

