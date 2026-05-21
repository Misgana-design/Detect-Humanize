/**
 * Email notification service using Resend.
 * Sends premium, psychologically-optimized transactional emails
 * after detection and humanization actions.
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || "notifications@texthumanica.com";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://texthumanica.com";

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 75) return "#ef4444"; // red
  if (score >= 45) return "#f59e0b"; // amber
  return "#10b981"; // green
}

function scoreLabel(score: number): string {
  if (score >= 75) return "Likely AI-Generated";
  if (score >= 45) return "Mixed Signals";
  return "Likely Human-Written";
}

function scoreEmoji(score: number): string {
  if (score >= 75) return "🔴";
  if (score >= 45) return "🟡";
  return "🟢";
}

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Text Humanica</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;" align="center">
              <a href="${SITE_URL}" style="text-decoration:none;display:inline-flex;align-items:center;gap:10px;">
                <img src="${SITE_URL}/logo-icon.png" alt="Text Humanica" width="36" height="36" style="border-radius:8px;display:block;" />
                <span style="font-size:18px;font-weight:700;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:-0.01em;">Text <span style="color:#4f46e5;">Humanica</span></span>
              </a>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                You received this because you used Text Humanica. 
                <a href="${SITE_URL}/account" style="color:#6366f1;text-decoration:none;">Manage preferences</a>
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#cbd5e1;">
                © ${new Date().getFullYear()} Text Humanica. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Detection email ───────────────────────────────────────────────────────────

interface DetectionEmailPayload {
  to: string;
  name: string;
  aiProbability: number;
  wordCount: number;
  planName: string;
  wordsRemaining: number | null;
  documentId: string | null;
}

export async function sendDetectionEmail(payload: DetectionEmailPayload): Promise<void> {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith("re_your")) return;

  const { to, name, aiProbability, wordCount, planName, wordsRemaining, documentId } = payload;
  const score = Math.round(aiProbability);
  const color = scoreColor(score);
  const label = scoreLabel(score);
  const emoji = scoreEmoji(score);
  const firstName = name.split(" ")[0] || "there";

  const needsHumanizing = score >= 50;
  const ctaUrl = documentId
    ? `${SITE_URL}/humanize?documentId=${documentId}`
    : `${SITE_URL}/humanize`;

  const psychTrigger = needsHumanizing
    ? `Your text scored <strong style="color:${color};">${score}% AI probability</strong>. One humanization pass could bring that below 10% — undetectable by GPTZero, Turnitin, and Originality.ai.`
    : `Your text scored <strong style="color:${color};">${score}% AI probability</strong>. It reads as natural human writing. You&apos;re good to submit.`;

  const content = `
    <!-- Top accent -->
    <div style="height:4px;background:linear-gradient(90deg,#4f46e5,#0ea5e9);"></div>

    <div style="padding:40px 40px 32px;">
      <!-- Greeting -->
      <p style="margin:0 0 8px;font-size:14px;color:#6366f1;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">Detection Result</p>
      <h1 style="margin:0 0 16px;font-size:26px;font-weight:800;color:#0f172a;line-height:1.2;">
        Hi ${firstName}, your scan is ready ${emoji}
      </h1>

      <!-- Score card -->
      <div style="background:#f8fafc;border-radius:16px;padding:24px;margin-bottom:24px;border:1px solid #e2e8f0;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div>
            <p style="margin:0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">AI Probability Score</p>
            <p style="margin:4px 0 0;font-size:52px;font-weight:900;color:${color};line-height:1;">${score}<span style="font-size:28px;">%</span></p>
          </div>
          <div style="text-align:right;">
            <span style="display:inline-block;background:${color}18;color:${color};border:1px solid ${color}40;border-radius:999px;padding:6px 14px;font-size:13px;font-weight:700;">${label}</span>
            <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">${wordCount.toLocaleString()} words analyzed</p>
          </div>
        </div>

        <!-- Progress bar -->
        <div style="margin-top:16px;height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden;">
          <div style="height:100%;width:${score}%;background:${color};border-radius:999px;"></div>
        </div>
      </div>

      <!-- Psychological trigger -->
      <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#475569;">${psychTrigger}</p>

      ${needsHumanizing ? `
      <!-- CTA -->
      <a href="${ctaUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:700;margin-bottom:24px;">
        ✨ Humanize this text now →
      </a>
      ` : `
      <!-- CTA -->
      <a href="${SITE_URL}/dashboard" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:700;margin-bottom:24px;">
        View in dashboard →
      </a>
      `}

      <!-- Stats row -->
      <div style="border-top:1px solid #f1f5f9;padding-top:20px;display:flex;gap:16px;flex-wrap:wrap;">
        <div style="flex:1;min-width:120px;">
          <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Plan</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0f172a;">${planName}</p>
        </div>
        ${wordsRemaining !== null ? `
        <div style="flex:1;min-width:120px;">
          <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Words Remaining</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:${wordsRemaining < 200 ? "#ef4444" : "#0f172a"};">${wordsRemaining.toLocaleString()}</p>
        </div>
        ` : `
        <div style="flex:1;min-width:120px;">
          <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Words Remaining</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#10b981;">Unlimited</p>
        </div>
        `}
      </div>
    </div>
  `;

  await resend.emails.send({
    from: `Text Humanica <${FROM}>`,
    to,
    subject: `${emoji} Your detection result: ${score}% AI probability`,
    html: baseTemplate(content),
  });
}

// ── Humanization email ────────────────────────────────────────────────────────

interface HumanizationEmailPayload {
  to: string;
  name: string;
  wordCount: number;
  tone: string;
  planName: string;
  wordsRemaining: number | null;
  changes: string[];
}

export async function sendHumanizationEmail(payload: HumanizationEmailPayload): Promise<void> {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith("re_your")) return;

  const { to, name, wordCount, tone, planName, wordsRemaining, changes } = payload;
  const firstName = name.split(" ")[0] || "there";
  const toneLabel = tone.charAt(0).toUpperCase() + tone.slice(1);

  const content = `
    <!-- Top accent -->
    <div style="height:4px;background:linear-gradient(90deg,#10b981,#0ea5e9);"></div>

    <div style="padding:40px 40px 32px;">
      <p style="margin:0 0 8px;font-size:14px;color:#10b981;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">Humanization Complete</p>
      <h1 style="margin:0 0 16px;font-size:26px;font-weight:800;color:#0f172a;line-height:1.2;">
        Your content is ready, ${firstName} ✅
      </h1>

      <!-- Hero message -->
      <div style="background:linear-gradient(135deg,#ecfdf5,#f0fdf4);border:1px solid #bbf7d0;border-radius:16px;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0;font-size:16px;font-weight:700;color:#065f46;">
          🎯 Your content is now engineered to bypass GPTZero, Turnitin, and Originality.ai.
        </p>
        <p style="margin:8px 0 0;font-size:14px;color:#047857;line-height:1.6;">
          ${wordCount.toLocaleString()} words rewritten in <strong>${toneLabel}</strong> tone using our ${planName === "Free" ? "single-pass" : "3-pass"} pipeline. Submit with confidence.
        </p>
      </div>

      <!-- What changed -->
      ${changes.length > 0 ? `
      <div style="margin-bottom:24px;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Improvements made</p>
        <ul style="margin:0;padding:0;list-style:none;">
          ${changes.slice(0, 3).map(change => `
          <li style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9;">
            <span style="color:#10b981;font-size:16px;line-height:1.4;">✓</span>
            <span style="font-size:14px;color:#475569;line-height:1.5;">${change}</span>
          </li>
          `).join("")}
        </ul>
      </div>
      ` : ""}

      <!-- CTA -->
      <a href="${SITE_URL}/dashboard/history" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:700;margin-bottom:24px;">
        View in history →
      </a>

      <!-- Stats row -->
      <div style="border-top:1px solid #f1f5f9;padding-top:20px;display:flex;gap:16px;flex-wrap:wrap;">
        <div style="flex:1;min-width:100px;">
          <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Words Processed</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0f172a;">${wordCount.toLocaleString()}</p>
        </div>
        <div style="flex:1;min-width:100px;">
          <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Tone</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0f172a;">${toneLabel}</p>
        </div>
        ${wordsRemaining !== null ? `
        <div style="flex:1;min-width:100px;">
          <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Words Left</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:${wordsRemaining < 200 ? "#ef4444" : "#0f172a"};">${wordsRemaining.toLocaleString()}</p>
        </div>
        ` : `
        <div style="flex:1;min-width:100px;">
          <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Words Left</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#10b981;">Unlimited</p>
        </div>
        `}
      </div>

      ${wordsRemaining !== null && wordsRemaining < 500 ? `
      <!-- Low quota nudge -->
      <div style="margin-top:20px;background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:14px 18px;">
        <p style="margin:0;font-size:13px;color:#92400e;">
          ⚡ You have <strong>${wordsRemaining.toLocaleString()} words</strong> left this month.
          <a href="${SITE_URL}/pricing" style="color:#d97706;font-weight:700;text-decoration:none;">Upgrade your plan →</a>
        </p>
      </div>
      ` : ""}
    </div>
  `;

  await resend.emails.send({
    from: `Text Humanica <${FROM}>`,
    to,
    subject: `✅ Your humanized content is ready — ${wordCount.toLocaleString()} words processed`,
    html: baseTemplate(content),
  });
}

// ── Contact notification email ────────────────────────────────────────────────

interface ContactNotificationPayload {
  fullName: string;
  email: string;
  message: string;
  submittedAt: string;
}

/**
 * Sends a notification to the site owner when someone submits the contact form.
 * Destination is controlled by the CONTACT_NOTIFY_EMAIL env var.
 * Falls back silently if Resend is not configured.
 */
export async function sendContactNotificationEmail(
  payload: ContactNotificationPayload,
): Promise<void> {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith("re_your")) return;

  const notifyTo = process.env.CONTACT_NOTIFY_EMAIL;
  if (!notifyTo) {
    console.warn("[contact] CONTACT_NOTIFY_EMAIL is not set — skipping notification email.");
    return;
  }

  const { fullName, email, message, submittedAt } = payload;

  const content = `
    <!-- Top accent -->
    <div style="height:4px;background:linear-gradient(90deg,#4f46e5,#0ea5e9);"></div>

    <div style="padding:36px 40px 32px;">
      <p style="margin:0 0 6px;font-size:13px;color:#6366f1;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">New Contact Message</p>
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f172a;line-height:1.3;">
        📬 Someone reached out via texthumanica.com
      </h1>

      <!-- Sender card -->
      <div style="background:#f8fafc;border-radius:14px;padding:20px 24px;margin-bottom:20px;border:1px solid #e2e8f0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom:12px;">
              <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">From</p>
              <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#0f172a;">${fullName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:12px;">
              <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Email</p>
              <a href="mailto:${email}" style="margin:4px 0 0;display:block;font-size:15px;font-weight:600;color:#4f46e5;text-decoration:none;">${email}</a>
            </td>
          </tr>
          <tr>
            <td>
              <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Submitted</p>
              <p style="margin:4px 0 0;font-size:13px;color:#64748b;">${submittedAt}</p>
            </td>
          </tr>
        </table>
      </div>

      <!-- Message -->
      <div style="margin-bottom:24px;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Message</p>
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #4f46e5;border-radius:0 12px 12px 0;padding:16px 20px;">
          <p style="margin:0;font-size:14px;line-height:1.8;color:#334155;white-space:pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        </div>
      </div>

      <!-- Reply CTA -->
      <a href="mailto:${email}?subject=Re: Your message to Text Humanica" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:12px;font-size:14px;font-weight:700;">
        Reply to ${fullName} →
      </a>

      <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;">
        This message was also saved to your Supabase <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">contact_messages</code> table.
      </p>
    </div>
  `;

  await resend.emails.send({
    from: `Text Humanica <${FROM}>`,
    to: notifyTo,
    replyTo: email,
    subject: `📬 New contact message from ${fullName}`,
    html: baseTemplate(content),
  });
}
