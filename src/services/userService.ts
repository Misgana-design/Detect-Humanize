import { createServerSupabaseClient } from "@/lib/supabase/server";
import { UserProfile } from "@/types/UserProfile";

/**
 * Service to handle user-related data operations.
 */
export const UserService = {
  async getProfile(): Promise<UserProfile | null> {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) throw new Error("Failed to fetch profile");
    return data;
  },
};
