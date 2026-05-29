import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, team_members(id, email, role, status, created_at)")
    .eq("owner_id", user.id)
    .maybeSingle();

  return NextResponse.json({ team });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { email?: string; name?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid teammate email." }, { status: 400 });
  }

  const { data: existingTeam, error: teamError } = await supabase
    .from("teams")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (teamError) return NextResponse.json({ error: teamError.message }, { status: 500 });

  let team = existingTeam;
  if (!team) {
    const created = await supabase
      .from("teams")
      .insert({ owner_id: user.id, name: body.name?.trim() || "My team" })
      .select("id")
      .single();
    if (created.error) return NextResponse.json({ error: created.error.message }, { status: 500 });
    team = created.data;
  }

  const { error } = await supabase.from("team_members").insert({
    team_id: team.id,
    email,
    role: "member",
    status: "invited",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
