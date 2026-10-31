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
const REPLY_TO = process.env.RESEND_REPLY_TO_EMAIL ?? FROM;
const SITE_URL = "https://www.texthumanica.com/";

const DAILY_LIMIT = 97; // Stay safely under Resend's 100/day free limit
const LOG_FILE = path.join(import.meta.dirname, "sent-log.json");

// ── Test mode ─────────────────────────────────────────────────────────────────
// Run with:  npm run send-announcement -- --test your@email.com
// Sends a single email to the given address and exits. Does NOT touch the log.
const TEST_FLAG_IDX = process.argv.indexOf("--test");
const TEST_EMAIL = TEST_FLAG_IDX !== -1 ? process.argv[TEST_FLAG_IDX + 1] : null;

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
  <title>Quick question about Text Humanica (2 min)</title>
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

          <!-- Main card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 2px 12px rgba(0,0,0,0.05);">
              <div style="padding:36px 40px;">

                <!-- Greeting -->
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#1e293b;">
                  Hi ${firstName},
                </p>

                <!-- Intro -->
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#334155;">
                  Thanks for trying Text Humanica. I&rsquo;m the founder, and I&rsquo;m trying to make it actually useful.
                </p>

                <!-- Question -->
                <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#334155;">
                  Could you reply with one line: <strong>what were you trying to humanize, and what stopped you from upgrading?</strong> (Price, output quality, word limits, something else?)
                </p>

                <!-- Incentive callout -->
                <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;width:100%;">
                  <tr>
                    <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;">
                      <p style="margin:0;font-size:15px;line-height:1.6;color:#166534;">
                        🎁 <strong>Everyone who replies gets a free 2,000-word credit</strong> as a thank you.
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- Sign-off -->
                <p style="margin:0 0 4px;font-size:16px;line-height:1.7;color:#334155;">
                  Thanks,
                </p>
                <!-- TODO: Replace "Your name" with your actual name before running the script -->
                <p style="margin:0;font-size:16px;line-height:1.7;color:#334155;">
                  Misgana Woldeselassie
                </p>

              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                You received this because you have an account at
                <a href="${SITE_URL}" style="color:#94a3b8;">Text Humanica</a>.
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
  // ── Test mode: send to one address and exit ──────────────────────────────
  if (TEST_EMAIL) {
    if (!TEST_EMAIL.includes("@")) {
      console.error("❌ Usage: npm run send-announcement -- --test your@email.com");
      process.exit(1);
    }
    console.log(`🧪 Test mode — sending to ${TEST_EMAIL} only...`);
    await resend.emails.send({
      from: `Text Humanica <${FROM}>`,
      replyTo: REPLY_TO,
      to: TEST_EMAIL,
      subject: "Quick question about Text Humanica (2 min)",
      html: buildEmail("there"),
    });
    console.log(`✅ Test email sent to ${TEST_EMAIL}. Check your inbox.`);
    return;
  }

  console.log("📋 Fetching users from Supabase...");

  // Supabase's PostgREST caps results at 1,000 rows by default.
  // Paginate in batches of 1,000 until we've fetched everything.
  const PAGE_SIZE = 1000;
  const profiles: { email: string; full_name: string | null }[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("profiles")
      .select("email, full_name")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("❌ Failed to fetch profiles:", error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    profiles.push(...(data as { email: string; full_name: string | null }[]));
    if (data.length < PAGE_SIZE) break; // last page
    from += PAGE_SIZE;
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
        replyTo: REPLY_TO,
        to: user.email,
        subject: "Quick question about Text Humanica (2 min)",
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
