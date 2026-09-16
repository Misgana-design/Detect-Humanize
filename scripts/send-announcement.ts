/**
 * One-time announcement email script with multi-day support.
 * Tracks sent emails in scripts/sent-log.json so you can resume across days.
 *
 * Run with:
 *   npm run send-announcement
 *
 * Each run sends up to 90 emails (safe under Resend's 100/day free limit).
 * Re-run the next day to continue. Already-sent addresses are skipped.
 */

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import fs from "fs";
import path from "path";

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM = process.env.RESEND_FROM_EMAIL ?? "notifications@texthumanica.com";
const SITE_URL = "https://www.texthumanica.com/";

const DAILY_LIMIT = 97; // Stay safely under Resend's 100/day free limit
const LOG_FILE = path.join(import.meta.dirname, "sent-log.json");

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !RESEND_API_KEY) {
  console.error(
    "❌ Missing required env vars. Make sure .env.local is present.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const resend = new Resend(RESEND_API_KEY);

// ── Progress tracking ─────────────────────────────────────────────────────────

function loadSentLog(): Set<string> {
  if (!fs.existsSync(LOG_FILE)) return new Set();
  try {
    const data = JSON.parse(fs.readFileSync(LOG_FILE, "utf-8")) as string[];
    return new Set(data);
  } catch {
    return new Set();
  }
}

function saveSentLog(sent: Set<string>): void {
  fs.writeFileSync(LOG_FILE, JSON.stringify([...sent], null, 2), "utf-8");
}

// ── Email template ────────────────────────────────────────────────────────────

function buildEmail(firstName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>50% off — Back to School at Text Humanica</title>
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

          <!-- Hero card — dark -->
          <tr>
            <td style="background:#0d1a2d;border-radius:20px;overflow:hidden;">
              <!-- Top accent bar -->
              <div style="height:4px;background:linear-gradient(90deg,#f59e0b,#fbbf24);"></div>
              <div style="padding:40px 40px 36px;">

                <!-- Badge -->
                <p style="margin:0 0 16px;">
                  <span style="display:inline-block;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);color:#fbbf24;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;padding:4px 12px;border-radius:999px;">
                    🎓 Back to School Sale
                  </span>
                </p>

                <!-- Headline -->
                <h1 style="margin:0 0 16px;font-size:28px;font-weight:800;color:#ffffff;line-height:1.25;">
                  Hi ${firstName}, ace the semester with <span style="color:#fbbf24;">half off</span> every plan
                </h1>

                <p style="margin:0 0 24px;font-size:15px;line-height:1.75;color:#94a3b8;">
                  Fresh term, fresh deal &mdash; all Text Humanica plans are <strong style="color:#ffffff;">50% off</strong> for the next 15 days. No code needed: the discount applies automatically at checkout.
                </p>

                <!-- Discount callout -->
                <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;width:100%;">
                  <tr>
                    <td style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:20px 24px;">
                      <table cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="width:64px;vertical-align:middle;padding-right:16px;">
                            <div style="width:60px;height:60px;border-radius:50%;border:2px dashed #b8972a;background:rgba(184,151,42,0.1);text-align:center;line-height:60px;font-size:18px;font-weight:900;color:#ffffff;">
                              50%
                            </div>
                          </td>
                          <td style="vertical-align:middle;">
                            <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#ffffff;">50% off all plans</p>
                            <p style="margin:0;font-size:13px;color:#94a3b8;">Basic &bull; Pro &bull; Ultra &bull; Pro Weekly &mdash; all included</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- What's covered -->
                <p style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">What you get</p>
                <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                  <tr>
                    <td style="padding:4px 0;font-size:14px;color:#cbd5e1;">
                      <span style="color:#4ade80;margin-right:8px;">✓</span> Up to 45,000 words/month humanized
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:14px;color:#cbd5e1;">
                      <span style="color:#4ade80;margin-right:8px;">✓</span> Multi-pass humanizer engine for natural output
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:14px;color:#cbd5e1;">
                      <span style="color:#4ade80;margin-right:8px;">✓</span> All tones, PDF/DOC exports, and comparison mode
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:14px;color:#cbd5e1;">
                      <span style="color:#4ade80;margin-right:8px;">✓</span> Cancel anytime — no lock-in
                    </td>
                  </tr>
                </table>

                <!-- CTA -->
                <a href="${SITE_URL}pricing" style="display:inline-block;background:#f59e0b;color:#0f172a;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:800;">
                  Claim 50% off &rarr;
                </a>

                <p style="margin:20px 0 0;font-size:12px;color:#475569;line-height:1.6;">
                  ⏳ Offer ends September 30, 2026. Discount applied automatically &mdash; no code needed.
                </p>
              </div>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:16px;"></td></tr>

          <!-- Secondary card — light -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.05);">
              <div style="padding:28px 36px;">
                <p style="margin:0 0 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6366f1;">Already on a plan?</p>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">
                  If you&rsquo;re already subscribed, the best way to take advantage of this deal is to upgrade to a higher tier at the discounted rate before the sale ends.
                </p>
                <a href="${SITE_URL}pricing" style="font-size:14px;font-weight:700;color:#6366f1;text-decoration:none;">
                  View all plans &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                You received this because you have an account at Text Humanica.
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
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("📋 Fetching users from Supabase...");

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("email, full_name");

  if (error) {
    console.error("❌ Failed to fetch profiles:", error.message);
    process.exit(1);
  }

  const allUsers = (profiles ?? []).filter((p) => p.email) as {
    email: string;
    full_name: string | null;
  }[];

  const sentLog = loadSentLog();
  const remaining = allUsers.filter((u) => !sentLog.has(u.email));

  console.log(`📊 Total users: ${allUsers.length}`);
  console.log(`✅ Already sent: ${sentLog.size}`);
  console.log(`📬 Remaining:   ${remaining.length}`);

  if (remaining.length === 0) {
    console.log("\n🎉 All users have been emailed. Nothing left to send.");
    return;
  }

  const batch = remaining.slice(0, DAILY_LIMIT);
  const daysLeft = Math.ceil((remaining.length - batch.length) / DAILY_LIMIT);

  console.log(
    `\n📤 Sending to ${batch.length} users today (${DAILY_LIMIT}/day limit)...`,
  );
  if (daysLeft > 0) {
    console.log(`📅 After today, ~${daysLeft} more day(s) needed to finish.\n`);
  }

  let sent = 0;
  let failed = 0;

  for (const user of batch) {
    const firstName = user.full_name?.split(" ")[0] ?? "there";

    try {
      await resend.emails.send({
        from: `Text Humanica <${FROM}>`,
        to: user.email,
        subject: "🎓 50% off all plans — Back to School at Text Humanica",
        html: buildEmail(firstName),
      });
      sentLog.add(user.email);
      sent++;
      console.log(`  ✓ ${user.email}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${user.email}:`, err);
    }

    // Save progress after each email so a crash doesn't lose progress
    saveSentLog(sentLog);

    // ~3 emails/sec — safely under Resend's rate limit
    await new Promise((r) => setTimeout(r, 350));
  }

  const stillRemaining = allUsers.length - sentLog.size;
  console.log(`\n📬 Done for today. Sent: ${sent} | Failed: ${failed}`);
  if (stillRemaining > 0) {
    console.log(
      `⏳ ${stillRemaining} users still pending. Run again tomorrow.`,
    );
  } else {
    console.log("🎉 All users emailed!");
  }
}

void main();
