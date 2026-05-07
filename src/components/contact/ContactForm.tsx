"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";

export function ContactForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, message }),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Could not send your message.");
      }

      setFeedback({ ok: true, text: "Thanks! Your message has been sent." });
      setFullName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      setFeedback({
        ok: false,
        text: error instanceof Error ? error.message : "Could not send your message.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-100"
    >
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
        Send us a message
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        Fill out the form below and we will follow up soon.
      </p>

      <div className="mt-6 grid gap-4">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Full name</span>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            placeholder="Your full name"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Email address</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            placeholder="you@example.com"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Message</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            required
            rows={7}
            className="w-full resize-y rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            placeholder="Tell us how we can help..."
          />
        </label>
      </div>

      {feedback && (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            feedback.ok
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        {isSubmitting ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
