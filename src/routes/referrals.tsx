import { useEffect, useState, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Copy, Users, Gift, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";

export const Route = createFileRoute("/referrals")({
  component: ReferralsPage,
  head: () => ({
    meta: [
      { title: "Referrals — Invite Friends, Earn USDT | Veritask" },
      { name: "description", content: "Share your Veritask referral link and earn USDT every time invited friends complete their first verified task." },
      { property: "og:title", content: "Referrals — Invite Friends, Earn USDT | Veritask" },
      { property: "og:description", content: "Share your referral link and earn USDT when friends complete verified tasks." },
      { property: "og:url", content: "https://task-aura-vault.lovable.app/referrals" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://task-aura-vault.lovable.app/referrals" }],
  }),
});

type Row = {
  id: string;
  reward_cusd: number;
  created_at: string;
  referred_user_id: string;
  email: string | null;
  display_name: string | null;
};

function ReferralsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [reward, setReward] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: prof }, { data: refs }, { data: setting }] = await Promise.all([
      supabase.from("profiles").select("referral_code").eq("id", user.id).maybeSingle(),
      supabase
        .from("referrals")
        .select("id, reward_cusd, created_at, referred_user_id")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("app_settings").select("value").eq("key", "referral_reward_cusd").maybeSingle(),
    ]);
    let userCode = prof?.referral_code ?? null;
    if (!userCode) {
      userCode = user.id.replace(/-/g, "").slice(0, 8).toUpperCase();
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ referral_code: userCode })
        .eq("id", user.id);
      if (updErr) userCode = null;
    }
    setCode(userCode);
    setReward(Number(setting?.value ?? 0));

    const list = refs ?? [];
    const ids = list.map((r) => r.referred_user_id);
    let profMap = new Map<string, { email: string | null; display_name: string | null }>();
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, email, display_name")
        .in("id", ids);
      (profs ?? []).forEach((p) => profMap.set(p.id, { email: p.email, display_name: p.display_name }));
    }
    setRows(
      list.map((r) => ({
        id: r.id,
        reward_cusd: Number(r.reward_cusd),
        created_at: r.created_at,
        referred_user_id: r.referred_user_id,
        email: profMap.get(r.referred_user_id)?.email ?? null,
        display_name: profMap.get(r.referred_user_id)?.display_name ?? null,
      })),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const link = code ? `${window.location.origin}/auth?ref=${code}` : "";
  const totalEarned = rows.reduce((s, r) => s + r.reward_cusd, 0);

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  }

  if (authLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background page-backdrop">
      <SiteHeader />
      <main className="container mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Referrals</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Earn {reward.toFixed(2)} cUSD for every friend who signs up with your code.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Stat icon={Users} label="Total referrals" value={String(rows.length)} />
          <Stat icon={Gift} label="Total earned" value={`${totalEarned.toFixed(2)} cUSD`} />
          <Stat icon={Share2} label="Per referral" value={`${reward.toFixed(2)} cUSD`} />
        </div>

        <div className="mt-8 rounded-2xl border border-border/60 bg-background/60 p-6 backdrop-blur-md">
          <h2 className="text-base font-semibold">Your referral code</h2>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input value={code ?? ""} readOnly className="font-mono uppercase" />
            <Button variant="outline" onClick={() => copy(code ?? "", "Code")}>
              <Copy className="mr-1.5 h-4 w-4" /> Copy code
            </Button>
          </div>
          <h2 className="mt-6 text-base font-semibold">Share link</h2>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input value={link} readOnly className="font-mono text-xs" />
            <Button onClick={() => copy(link, "Link")}>
              <Copy className="mr-1.5 h-4 w-4" /> Copy link
            </Button>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-border/60 bg-background/60 backdrop-blur-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Reward (cUSD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No referrals yet. Share your code to start earning.</TableCell></TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.display_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">{r.reward_cusd.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 p-5 backdrop-blur-md">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
