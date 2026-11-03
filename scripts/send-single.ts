/**
 * One-off transactional email sender.
 * Use this to send a single custom email to one address.
 *
 * Run with:
 *   npm run send-single -- --to recipient@email.com --template payment-failed-maldives
 *
 * Available templates:
 *   payment-failed-maldives  — BML transaction_not_allowed failure email
 */

import { Resend } from "resend";

// ── Config ────────────────────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM = process.env.RESEND_FROM_EMAIL ?? "notifications@texthumanica.com";
const REPLY_TO = process.env.RESEND_REPLY_TO_EMAIL ?? FROM;
const SITE_URL = "https://www.texthumanica.com/";

if (!RESEND_API_KEY) {
  console.error("❌ Missing RESEND_API_KEY. Make sure .env.local is present.");
  process.exit(1);
}

// ── Arg parsing ───────────────────────────────────────────────────────────────

function getArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? (process.argv[idx + 1] ?? null) : null;
}

const TO_EMAIL = getArg("--to");
const TEMPLATE = getArg("--template");

if (!TO_EMAIL || !TO_EMAIL.includes("@")) {
  console.error("❌ Usage: npm run send-single -- --to recipient@email.com --template <name>");
  process.exit(1);
}

if (!TEMPLATE) {
  console.error("❌ Missing --template. Available: payment-failed-maldives");
  process.exit(1);
}

// ── Templates ─────────────────────────────────────────────────────────────────

const TEMPLATES: Record<string, { subject: string; html: string }> = {

  "payment-failed-maldives": {
    subject: "Action needed: your Text Humanica subscription failed",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Action needed: subscription failed</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:24px;" align="center">
              <a href="${SITE_URL}" style="text-decoration:none;font-size:20px;font-weight:700;color:#0f172a;">
                Text <span style="color:#4f46e5;">Humanica</span>
              </a>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.05);">

              <!-- Top accent bar -->
              <div style="height:4px;background:linear-gradient(90deg,#f59e0b,#ef4444);"></div>

              <div style="padding:36px 40px;">

                <!-- Status badge -->
                <p style="margin:0 0 20px;">
                  <span style="display:inline-block;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:4px 12px;border-radius:999px;">
                    ⚠️ Payment failed
                  </span>
                </p>

                <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0f172a;line-height:1.3;">
                  Hi Ahmed Thaif, your recent subscription renewal failed
                </h1>

                <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#475569;">
                  We noticed your renewal was declined with a <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:13px;color:#0f172a;">transaction_not_allowed</code> code from your bank.
                </p>

                <p style="margin:0 0 24px;font-size:15px;line-height:1.75;color:#475569;">
                  Because you are located in the Maldives, this is usually caused by the recent foreign transaction limits and security filters placed on local cards (like BML) for international subscriptions. According to the Bank of Maldives, subscription payments are supposed to be exempt — but their automated systems regularly block them until you contact them directly.
                </p>

                <!-- Steps -->
                <p style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">
                  How to fix this
                </p>

                <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">

                  <!-- Step 1 -->
                  <tr>
                    <td style="padding:14px 0;border-bottom:1px solid #f1f5f9;vertical-align:top;">
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width:28px;vertical-align:top;padding-top:1px;">
                            <span style="display:inline-block;width:22px;height:22px;background:#4f46e5;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;color:#ffffff;">1</span>
                          </td>
                          <td style="padding-left:12px;">
                            <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0f172a;">Contact Bank of Maldives support directly</p>
                            <p style="margin:0;font-size:14px;line-height:1.65;color:#475569;">
                              Let them know your recurring subscription to Text Humanica via Polar.sh was falsely declined, and ask them to manually whitelist or approve the transaction.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Step 2 -->
                  <tr>
                    <td style="padding:14px 0;border-bottom:1px solid #f1f5f9;vertical-align:top;">
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width:28px;vertical-align:top;padding-top:1px;">
                            <span style="display:inline-block;width:22px;height:22px;background:#4f46e5;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;color:#ffffff;">2</span>
                          </td>
                          <td style="padding-left:12px;">
                            <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0f172a;">Link a USD account</p>
                            <p style="margin:0;font-size:14px;line-height:1.65;color:#475569;">
                              If you are using a standard MVR (Maldivian Rufiyaa) debit card, BML strongly recommends linking your card primarily to a USD account to bypass international e-commerce caps entirely.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Step 3 -->
                  <tr>
                    <td style="padding:14px 0;vertical-align:top;">
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width:28px;vertical-align:top;padding-top:1px;">
                            <span style="display:inline-block;width:22px;height:22px;background:#4f46e5;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;color:#ffffff;">3</span>
                          </td>
                          <td style="padding-left:12px;">
                            <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0f172a;">Update your payment method</p>
                            <p style="margin:0;font-size:14px;line-height:1.65;color:#475569;">
                              Alternatively, updating your subscription to a standard international credit card or a dedicated USD card will bypass this block immediately.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                </table>

                <!-- CTA -->
                <a href="${SITE_URL}account" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:12px;font-size:14px;font-weight:700;">
                  Update payment method →
                </a>

                <p style="margin:24px 0 0;font-size:13px;line-height:1.65;color:#94a3b8;">
                  If you have any trouble, just reply to this email and we'll sort it out for you personally.
                </p>

              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                You received this because you have an active subscription at
                <a href="${SITE_URL}" style="color:#6366f1;text-decoration:none;">Text Humanica</a>.
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#cbd5e1;">
                &copy; ${new Date().getFullYear()} Text Humanica. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },

};

// ── Send ──────────────────────────────────────────────────────────────────────

async function main() {
  const template = TEMPLATES[TEMPLATE!];
  if (!template) {
    console.error(`❌ Unknown template "${TEMPLATE}". Available: ${Object.keys(TEMPLATES).join(", ")}`);
    process.exit(1);
  }

  console.log(`📤 Sending "${TEMPLATE}" to ${TO_EMAIL}...`);

  const resend = new Resend(RESEND_API_KEY);
  await resend.emails.send({
    from: `Text Humanica <${FROM}>`,
    replyTo: REPLY_TO,
    to: TO_EMAIL!,
    subject: template.subject,
    html: template.html,
  });

  console.log(`✅ Done. Email sent to ${TO_EMAIL}.`);
}

void main();
