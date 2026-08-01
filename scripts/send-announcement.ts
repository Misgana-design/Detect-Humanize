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

const DAILY_LIMIT = 90; // Stay safely under Resend's 100/day free limit
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
  <title>A focused, faster Text Humanica</title>
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
            <td style="background:#ffffff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
              <div style="height:4px;background:linear-gradient(90deg,#4f46e5,#0ea5e9);"></div>
              <div style="padding:40px 40px 36px;">

                <p style="margin:0 0 8px;font-size:13px;color:#6366f1;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">Product Update</p>
                <h1 style="margin:0 0 20px;font-size:26px;font-weight:800;color:#0f172a;line-height:1.25;">
                  Hi ${firstName}, we&rsquo;ve made Text Humanica more focused ✨
                </h1>

                <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#475569;">
                  We&rsquo;ve removed the built-in AI detector feature from Text Humanica. After careful evaluation, we found it wasn&rsquo;t meeting the accuracy bar we hold ourselves to &mdash; and we&rsquo;d rather ship fewer things well than more things poorly.
                </p>

                <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#475569;">
                  Everything else is exactly as you left it:
                </p>

                <ul style="margin:0 0 24px;padding:0 0 0 20px;font-size:15px;line-height:2;color:#475569;">
                  <li>Your humanizer, document history, and comparison mode are all untouched</li>
                  <li>Your plan, quota, and billing are unchanged</li>
                  <li>Exports, tones, and all workflow features work as before</li>
                </ul>

                <p style="margin:0 0 28px;font-size:15px;line-height:1.75;color:#475569;">
                  We&rsquo;re now fully focused on making the humanizer the most reliable, natural-sounding rewriter available &mdash; with improvements shipping soon.
                </p>

                <a href="${SITE_URL}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:700;">
                  Open the humanizer &rarr;
                </a>

                <p style="margin:28px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
                  Questions? Just reply to this email or visit our
                  <a href="${SITE_URL}/contact" style="color:#6366f1;text-decoration:none;">contact page</a>.
                </p>
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
        subject: "A focused, faster Text Humanica",
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
