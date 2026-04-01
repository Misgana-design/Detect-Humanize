"use server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function humanizeTextAction(content: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Logic: In a real app, you'd call an LLM (OpenAI/Claude) here
  // For now, we simulate the "Humanization" process
  const humanizedText = content
    .replace(/However/g, "But honestly")
    .replace(/Furthermore/g, "Also")
    .replace(/In conclusion/g, "So, basically");

  // Save to database
  const { data, error } = await supabase
    .from("humanization_results")
    .insert({
      user_id: user.id,
      original_content: content,
      humanized_content: humanizedText,
    })
    .select()
    .single();

  if (error) throw error;
  return { text: humanizedText };
}
