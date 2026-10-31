/**
 * One-time resend script for users who received the broken email
 * (the one where replies weren't reaching the inbox).
 *
 * Reads scripts/sent-log.json for the list of addresses to contact.
 * Does NOT modify sent-log.json — the main send-announcement script
 * stays untouched so new users can still be reached normally.
 *
 * Run with:
 *   npm run resend-correction
 *
 * Test first with:
 *   npm run resend-correction -- --test your@email.com
 *
 * Each run sends up to 90 emails (safe under Resend's 100/day free limit).
 * Re-run the next day to continue. Progress is tracked in resend-correction-log.json.
 */

import { Resend } from "resend";
import fs from "fs";
import path from "path";

// ── Config ────────────────────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM = process.env.RESEND_FROM_EMAIL ?? "notifications@texthumanica.com";
const REPLY_TO = process.env.RESEND_REPLY_TO_EMAIL ?? FROM;
const SITE_URL = "https://www.texthumanica.com/";

const DAILY_LIMIT = 97;
const SENT_LOG_FILE    = path.join(import.meta.dirname, "sent-log.json");
const PROGRESS_FILE    = path.join(import.meta.dirname, "resend-correction-log.json");

// ── Test mode ─────────────────────────────────────────────────────────────────
// npm run resend-correction -- --test your@email.com
const TEST_FLAG_IDX = process.argv.indexOf("--test");
const TEST_EMAIL = TEST_FLAG_IDX !== -1 ? process.argv[TEST_FLAG_IDX + 1] : null;

if (!RESEND_API_KEY) {
  console.error("❌ Missing RESEND_API_KEY. Make sure .env.local is present.");
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

// ── Progress tracking ─────────────────────────────────────────────────────────

function loadProgress(): Set<string> {
  if (!fs.existsSync(PROGRESS_FILE)) return new Set();
  try {
    const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8")) as string[];
    return new Set(data);
  } catch {
    return new Set();
  }
}

function saveProgress(done: Set<string>): void {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify([...done], null, 2), "utf-8");
}

// ── Email template ────────────────────────────────────────────────────────────

function buildEmail(): string {
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

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;border:1px solid #e2e8f0;padding:36px 40px;box-shadow:0 4px 24px rgba(0,0,0,0.05);">

              <p style="margin:0 0 20px;font-size:15px;line-height:1.75;color:#475569;">
                Hi, I sent you a message a few days ago but had a technical issue &mdash;
                replies weren&rsquo;t reaching my inbox. Resending in case you wanted to respond.
              </p>

              <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#0f172a;">
                I&rsquo;m the founder of Text Humanica, and we are trying to make it
                actually useful.
              </p>

              <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#0f172a;">
                Could you reply with one line: <strong>what were you trying to humanize,
                and what stopped you from upgrading?</strong> (Price, output quality,
                word limits, something else?)
              </p>

              <!-- Incentive callout -->
              <table cellpadding="0" cellspacing="0" style="margin:24px 0;width:100%;">
                <tr>
                  <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;">
                    <p style="margin:0;font-size:14px;color:#166534;line-height:1.6;">
                      🎁 <strong>Everyone who replies gets a free 2,000-word credit</strong>
                      added to their account as a thank you.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 4px;font-size:15px;color:#0f172a;">Thanks,</p>
              <!-- TODO: Replace "Your name" with your actual name before running -->
              <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">Misgana Woldeselassie</p>
              <p style="margin:4px 0 0;font-size:13px;color:#94a3b8;">Founder, Text Humanica</p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                You received this because you have an account at
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
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // ── Test mode ──────────────────────────────────────────────────────────────
  if (TEST_EMAIL) {
    if (!TEST_EMAIL.includes("@")) {
      console.error("❌ Usage: npm run resend-correction -- --test your@email.com");
      process.exit(1);
    }
    console.log(`🧪 Test mode — sending to ${TEST_EMAIL} only...`);
    await resend.emails.send({
      from: `Text Humanica <${FROM}>`,
      replyTo: REPLY_TO,
      to: TEST_EMAIL,
      subject: "Quick question about Text Humanica (2 min)",
      html: buildEmail(),
    });
    console.log(`✅ Test email sent to ${TEST_EMAIL}. Check your inbox and try replying.`);
    return;
  }

  // ── Load the list of already-contacted users from the main sent log ────────
  if (!fs.existsSync(SENT_LOG_FILE)) {
    console.error("❌ scripts/sent-log.json not found. Nothing to resend.");
    process.exit(1);
  }

  const allAddresses = JSON.parse(
    fs.readFileSync(SENT_LOG_FILE, "utf-8"),
  ) as string[];

  const progress = loadProgress();
  const remaining = allAddresses.filter((email) => !progress.has(email));

  console.log(`📊 Total in sent log: ${allAddresses.length}`);
  console.log(`✅ Already re-sent:   ${progress.size}`);
  console.log(`📬 Remaining:         ${remaining.length}`);

  if (remaining.length === 0) {
    console.log("\n🎉 All previously-sent users have been re-contacted.");
    return;
  }

  const batch = remaining.slice(0, DAILY_LIMIT);
  const daysLeft = Math.ceil((remaining.length - batch.length) / DAILY_LIMIT);

  console.log(`\n📤 Sending to ${batch.length} users today...`);
  if (daysLeft > 0) {
    console.log(`📅 After today, ~${daysLeft} more day(s) needed to finish.\n`);
  }

  let sent = 0;
  let failed = 0;

  for (const email of batch) {
    try {
      await resend.emails.send({
        from: `Text Humanica <${FROM}>`,
        replyTo: REPLY_TO,
        to: email,
        subject: "Quick question about Text Humanica (2 min)",
        html: buildEmail(),
      });
      progress.add(email);
      sent++;
      console.log(`  ✓ ${email}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${email}:`, err);
    }

    // Save after every email so a crash doesn't lose progress
    saveProgress(progress);

    // ~3 emails/sec — safely under Resend's rate limit
    await new Promise((r) => setTimeout(r, 350));
  }

  const stillRemaining = allAddresses.length - progress.size;
  console.log(`\n📬 Done for today. Sent: ${sent} | Failed: ${failed}`);
  if (stillRemaining > 0) {
    console.log(`⏳ ${stillRemaining} users still pending. Run again tomorrow.`);
  } else {
    console.log("🎉 All previously-sent users re-contacted!");
  }
}

void main();
