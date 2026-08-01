import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function useHistory() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select(
          `
          id,
          title,
          created_at
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}
