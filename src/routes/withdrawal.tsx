import { useEffect, useState, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { WithdrawCard } from "@/components/dashboard/WithdrawCard";
import { StatTile } from "@/components/dashboard/StatTile";
import { Wallet, Clock, Trophy, ScanFace, Send, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/withdrawal")({
  component: WithdrawalPage,
  head: () => ({
    meta: [
      { title: "Withdraw USDT to Your BEP20 Wallet | Veritask" },
      { name: "description", content: "Withdraw your approved Veritask task rewards as USDT on BNB Smart Chain (BEP20). Fast on-chain payouts, $1 minimum." },
      { property: "og:title", content: "Withdraw USDT to Your BEP20 Wallet | Veritask" },
      { property: "og:description", content: "Cash out task rewards as BEP20 USDT — $1 minimum, settles in seconds." },
      { property: "og:url", content: "https://task-aura-vault.lovable.app/withdrawal" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://task-aura-vault.lovable.app/withdrawal" }],
  }),
});

function WithdrawalPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ available: 0, pending: 0, lifetime: 0 });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const loadStats = useCallback(async () => {
    if (!user) return;
    const [{ data: subs }, { data: wds }] = await Promise.all([
      supabase.from("task_submissions").select("reward_cusd,status").eq("user_id", user.id),
      supabase.from("withdrawals").select("amount_cusd,status").eq("user_id", user.id),
    ]);
    const earned = (subs ?? [])
      .filter((s) => s.status === "approved")
      .reduce((a, s) => a + Number(s.reward_cusd || 0), 0);
    const lifetime = (wds ?? [])
      .filter((w) => w.status === "completed")
      .reduce((a, w) => a + Number(w.amount_cusd || 0), 0);
    const pending = (wds ?? [])
      .filter((w) => w.status === "pending" || w.status === "approved")
      .reduce((a, w) => a + Number(w.amount_cusd || 0), 0);
    const reserved = (wds ?? [])
      .filter((w) => w.status !== "rejected")
      .reduce((a, w) => a + Number(w.amount_cusd || 0), 0);
    setStats({ available: Math.max(0, earned - reserved), pending, lifetime });
  }, [user]);

  useEffect(() => { loadStats(); }, [loadStats]);

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
      <main className="container mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Withdraw your USDT</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Cash out approved task rewards as USDT on BNB Smart Chain (BEP20). Settles in seconds.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile icon={Wallet} label="Available" value={stats.available} decimals={2} suffix="USDT" />
          <StatTile icon={Clock} label="Pending" value={stats.pending} decimals={2} suffix="USDT" accent="primary" />
          <StatTile icon={Trophy} label="Lifetime paid" value={stats.lifetime} decimals={2} suffix="USDT" />
        </div>

        <div className="mt-6 neon-border glass-card rounded-3xl p-1">
          <WithdrawCard />
        </div>

        <div className="mt-8 glass-card rounded-2xl p-6">
          <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            How payouts work
          </div>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            <Step icon={ScanFace} title="Verify" body="Complete Face Verification once with GoodDollar." />
            <Step icon={Send} title="Request" body="Enter amount + BEP20 wallet, submit instantly." />
            <Step icon={CheckCircle2} title="Settle" body="USDT lands on-chain. Track via BscScan." />
          </ol>
        </div>
      </main>
    </div>
  );
}

function Step({ icon: Icon, title, body }: { icon: typeof Wallet; title: string; body: string }) {
  return (
    <li className="rounded-xl border border-border/60 bg-background/40 p-4">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-success/15 text-success">
        <Icon className="h-4 w-4" />
      </span>
      <div className="mt-3 font-semibold">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{body}</div>
    </li>
  );
}
