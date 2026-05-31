import { useEffect, useState, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { VerificationCard } from "@/components/dashboard/VerificationCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { ProgressRing } from "@/components/dashboard/ProgressRing";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Your Profile & Account Settings | Veritask" },
      { name: "description", content: "Manage your Veritask profile, display name, and account details for verified task payouts." },
      { property: "og:title", content: "Your Profile & Account Settings | Veritask" },
      { property: "og:description", content: "Manage your Veritask profile and account details." },
      { property: "og:url", content: "https://task-aura-vault.lovable.app/profile" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://task-aura-vault.lovable.app/profile" }],
  }),
});

type Form = {
  first_name: string;
  last_name: string;
  occupation: string;
  gender: string;
  age: string;
  display_name: string;
};

const empty: Form = {
  first_name: "", last_name: "", occupation: "", gender: "", age: "", display_name: "",
};

function ProfilePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<Form>(empty);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoadingProfile(true);
    const { data } = await supabase
      .from("profiles")
      .select("first_name,last_name,occupation,gender,age,display_name")
      .eq("id", user.id)
      .maybeSingle();
    if (data) {
      setForm({
        first_name: data.first_name ?? "",
        last_name: data.last_name ?? "",
        occupation: data.occupation ?? "",
        gender: data.gender ?? "",
        age: data.age != null ? String(data.age) : "",
        display_name: data.display_name ?? "",
      });
    }
    setLoadingProfile(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const ageNum = form.age.trim() === "" ? null : Number(form.age);
    if (ageNum != null && (!Number.isInteger(ageNum) || ageNum < 13 || ageNum > 120)) {
      toast.error("Age must be between 13 and 120");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? null,
          first_name: form.first_name.trim() || null,
          last_name: form.last_name.trim() || null,
          occupation: form.occupation.trim() || null,
          gender: form.gender || null,
          age: ageNum,
          display_name: form.display_name.trim() || null,
        },
        { onConflict: "id" },
      );
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
  }

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background page-backdrop aurora-bg">
      <SiteHeader />
      <main className="container mx-auto max-w-3xl px-4 py-10">
        {/* Profile hero */}
        <div className="glass-card rounded-3xl p-6 animate-rise-in">
          <div className="flex flex-wrap items-center gap-5">
            <div className="relative">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-success/30 to-primary/20 text-2xl font-semibold text-foreground ring-2 ring-success/40">
                {(form.display_name || form.first_name || user.email || "?").trim().charAt(0).toUpperCase()}
              </div>
              <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-success ring-2 ring-background" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {form.display_name || [form.first_name, form.last_name].filter(Boolean).join(" ") || "Your profile"}
              </h1>
              <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success">
                Verified earner
              </div>
            </div>
            <ProgressRing
              value={
                [form.first_name, form.last_name, form.display_name, form.occupation, form.gender, form.age]
                  .filter((v) => v && v.trim()).length / 6
              }
              size={88}
              stroke={8}
              sublabel="Complete"
            />
          </div>
        </div>

        <div className="mt-6 glass-card rounded-2xl p-6 overflow-hidden">
          <VerificationCard />
        </div>

        <form
          onSubmit={save}
          className="mt-6 glass-card rounded-2xl p-6 space-y-4"
        >
          <h2 className="text-lg font-medium">Account details</h2>

          {loadingProfile ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading profile…
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name">
                  <Input value={form.first_name} maxLength={60}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                </Field>
                <Field label="Last name">
                  <Input value={form.last_name} maxLength={60}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                </Field>
              </div>

              <Field label="Display name">
                <Input value={form.display_name} maxLength={80}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
              </Field>

              <Field label="Occupation">
                <Input value={form.occupation} maxLength={80}
                  placeholder="e.g. Software engineer"
                  onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Gender">
                  <Select value={form.gender || undefined}
                    onValueChange={(v) => setForm({ ...form, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Age">
                  <Input type="number" min={13} max={120} value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })} />
                </Field>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save changes
                </Button>
              </div>
            </>
          )}
        </form>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
