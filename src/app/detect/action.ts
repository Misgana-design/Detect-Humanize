"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function analyzeTextAction(
  content: string,
  title: string = "Untitled Scan",
) {
  const supabase = await createServerSupabaseClient();

  // 1. Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 2. Save the document first
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      content: content,
      title: title,
    })
    .select()
    .single();

  if (docError) throw new Error(docError.message);

  // 3. Simulate AI Detection (Logic would go here)
  // For now, let's generate a random score to test the schema
  const mockAiScore = Math.random();

  // 4. Save the result
  const { error: resultError } = await supabase
    .from("detection_results")
    .insert({
      document_id: doc.id,
      user_id: user.id,
      ai_score: mockAiScore,
      details: { model: "AIGuard-v1", word_count: content.split(" ").length },
    });

  if (resultError) throw new Error(resultError.message);

  // 5. Update the UI cache
  revalidatePath("/dashboard");

  return { success: true, score: mockAiScore };
}
