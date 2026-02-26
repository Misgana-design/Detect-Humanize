import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { UserService } from "@/services/userService";

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Server-side auth guard
  if (!session) {
    redirect("/login");
  }

  const profile = await UserService.getProfile();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Welcome back, {profile?.full_name}</h1>
      <div className="p-6 bg-white border rounded-xl shadow-sm">
        <p className="text-gray-600">This is your protected dashboard.</p>
      </div>
    </div>
  );
}
