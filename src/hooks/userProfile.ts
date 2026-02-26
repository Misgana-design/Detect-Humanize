import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const useProfile = () => {
  const supabase = createClient();

  return useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").single();
      return data;
    },
  });
};
