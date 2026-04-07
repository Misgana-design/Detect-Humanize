"use client";

import { createClient } from "@/lib/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, AtSign, Save, ShieldCheck } from "lucide-react";

export default function SettingsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Fetch current profile
  const { data: profile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();
      return data;
    },
  });

  // Mutation to update profile
  const { mutate: updateProfile, isPending } = useMutation({
    mutationFn: async (formData: any) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("profiles")
        .update(formData)
        .eq("id", user?.id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["user-profile"] }),
  });

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateProfile({
      full_name: formData.get("full_name"),
      handle: formData.get("handle"),
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-10">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-slate-500">
          Manage your profile and account preferences.
        </p>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-6 mb-10 bg-slate-50 p-6 rounded-3xl border border-slate-100">
          {/* PROFILE PICTURE SECTION */}
          <div className="relative group">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                className="w-20 h-20 rounded-2xl object-cover shadow-md border-2 border-white"
                alt="Profile"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md border-2 border-white">
                {profile?.full_name?.charAt(0) || "U"}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
              <span className="text-[10px] text-white font-bold">CHANGE</span>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {profile?.full_name || "New User"}
            </h2>
            <p className="text-sm text-slate-500">
              {profile?.handle ? `@${profile.handle}` : "No handle set"}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <User size={14} /> Personal Information
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 ml-1">
                Full Name
              </label>
              <input
                name="full_name"
                defaultValue={profile?.full_name}
                className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-black"
                placeholder="Misgana Design"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 ml-1">
                Handle
              </label>
              <div className="relative">
                <AtSign
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={14}
                />
                <input
                  name="handle"
                  defaultValue={profile?.handle}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-black"
                  placeholder="misgana_dev"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          disabled={isPending}
          className="bg-black text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50"
        >
          <Save size={16} />
          {isPending ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
