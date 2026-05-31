import { useEffect, useState, useCallback } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { VerificationCard } from "@/components/dashboard/VerificationCard";
import { StatTile } from "@/components/dashboard/StatTile";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { StreakCard } from "@/components/dashboard/StreakCard";
import { ActivityHint } from "@/components/dashboard/ActivityHint";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Wallet, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard — Your USDT Earnings | Veritask" },
      { name: "description", content: "Track your verified task earnings, completed tasks, and USDT balance on your Veritask dashboard." },
      { property: "og:title", content: "Dashboard — Your USDT Earnings | Veritask" },
      { property: "og:description", content: "Track verified task earnings and USDT balance on your Veritask dashboard." },
      { property: "og:url", content: "https://task-aura-vault.lovable.app/dashboard" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://task-aura-vault.lovable.app/dashboard" }],
  }),
});

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [completed, setCompleted] = useState(0);

  const loadStats = useCallback(async () => {
    if (!user) return;
    const [{ data: subs }, { data: wds }] = await Promise.all([
      supabase.from("task_submissions").select("reward_cusd,status").eq("user_id", user.id),
      supabase.from("withdrawals").select("amount_cusd,status").eq("user_id", user.id),
    ]);
    const approved = (subs ?? []).filter((s) => s.status === "approved");
    const earned = approved.reduce((a, s) => a + Number(s.reward_cusd || 0), 0);
    const reserved = (wds ?? [])
      .filter((w) => w.status !== "rejected")
      .reduce((a, w) => a + Number(w.amount_cusd || 0), 0);
    setBalance(earned - reserved);
    setCompleted(approved.length);
  }, [user]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }

  // Next milestone: $1 → $5 → $10 → $25 → $50
  const tiers = [1, 5, 10, 25, 50];
  const nextTier = tiers.find((t) => balance < t) ?? tiers[tiers.length - 1];
  const prevTier = [...tiers].reverse().find((t) => balance >= t) ?? 0;
  const ringValue = nextTier === prevTier ? 1 : (balance - prevTier) / (nextTier - prevTier);

  return (
    <div className="min-h-screen bg-background page-backdrop aurora-bg">
      <SiteHeader />

      <main className="container mx-auto max-w-7xl px-4 py-10">
        <div className="flex items-end justify-between gap-4 animate-rise-in">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Welcome back</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{user.email}</p>
          </div>
          <ActivityHint />
        </div>

        {/* Hero balance — glass + neon-border + progress ring */}
        <div className="mt-6 neon-border shine glass-card rounded-3xl p-6 md:p-8 animate-rise-in">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-success">
                Available balance
              </div>
              <div className="mt-2 text-5xl font-semibold tracking-tight md:text-6xl">
                <AnimatedNumber value={balance} decimals={2} />
                <span className="ml-2 text-2xl font-medium text-muted-foreground md:text-3xl">
                  USDT
                </span>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                From {completed} approved task{completed === 1 ? "" : "s"} · BEP20 BNB Smart Chain
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild className="h-10">
                  <Link to="/withdrawal">
                    Withdraw <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-10">
                  <Link to="/tasks">Earn more</Link>
                </Button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ProgressRing
                value={ringValue}
                size={128}
                stroke={10}
                label={`${nextTier} USDT`}
                sublabel="Next tier"
              />
              <div className="text-[11px] text-muted-foreground">
                {Math.max(0, nextTier - balance).toFixed(2)} to go
              </div>
            </div>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatTile
            icon={Wallet}
            label="Available"
            value={balance}
            decimals={2}
            suffix="USDT"
            hint="Ready to withdraw"
          />
          <StatTile
            icon={CheckCircle2}
            label="Tasks completed"
            value={completed}
            hint="Approved submissions"
            accent="primary"
          />
          <StatTile
            icon={ShieldCheck}
            label="Verification"
            value="GoodDollar"
            hint="Face Verification required"
            accent="success"
          />
        </div>

        {/* Streak + Verification */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <StreakCard />
          <div className="glass-card rounded-2xl p-0 overflow-hidden">
            <VerificationCard />
          </div>
        </div>
      </main>
    </div>
  );
}

