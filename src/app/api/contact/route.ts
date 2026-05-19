import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendContactNotificationEmail } from "@/services/email/emailService";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      fullName?: string;
      email?: string;
      message?: string;
    };

    const fullName = body.fullName?.trim() ?? "";
    const email = body.email?.trim() ?? "";
    const message = body.message?.trim() ?? "";

    if (!fullName || fullName.length < 2) {
      return NextResponse.json(
        { error: "Please enter your full name." },
        { status: 400 },
      );
    }

    if (!isEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    if (!message || message.length < 10) {
      return NextResponse.json(
        { error: "Please enter a message with at least 10 characters." },
        { status: 400 },
      );
    }

    // Persist to Supabase using the service-role client (bypasses RLS for insert)
    const supabase = await createServerSupabaseClient();

    const { error: dbError } = await supabase
      .from("contact_messages")
      .insert({ full_name: fullName, email, message });

    if (dbError) {
      console.error("[contact] db insert error:", dbError.message);
      return NextResponse.json(
        { error: "Failed to send your message. Please try again." },
        { status: 500 },
      );
    }

    console.log("[contact] message saved", { fullName, email, receivedAt: new Date().toISOString() });

    // Send notification email to site owner — fire-and-forget, never blocks the response
    sendContactNotificationEmail({
      fullName,
      email,
      message,
      submittedAt: new Date().toLocaleString("en-US", {
        timeZone: "UTC",
        dateStyle: "full",
        timeStyle: "short",
      }) + " UTC",
    }).catch((err: unknown) => {
      // Log but don't fail the request — DB insert already succeeded
      console.error("[contact] notification email failed:", err instanceof Error ? err.message : err);
    });

    return NextResponse.json({
      success: true,
      message: "Message received successfully.",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to send your message. Please try again." },
      { status: 500 },
    );
  }
}
