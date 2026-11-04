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

