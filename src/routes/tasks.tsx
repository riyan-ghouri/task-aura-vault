import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Camera,
  CheckCircle2,
  Clock,
  Clock3,
  Coins,
  Facebook,
  Globe,
  Instagram,
  Link as LinkIcon,
  LogOut,
  Music2,
  ShieldCheck,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SiteHeader } from "@/components/SiteHeader";
import { SubmitProofDialog } from "@/components/tasks/SubmitProofDialog";
import { SubmissionsList, type SubmissionWithTask } from "@/components/tasks/SubmissionsList";
import type { Database } from "@/integrations/supabase/types";
import { StatTile } from "@/components/dashboard/StatTile";
import { ListChecks, CheckCircle2 as CheckIcon, Hourglass } from "lucide-react";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
type Platform = Database["public"]["Enums"]["task_platform"];
type ProofType = Database["public"]["Enums"]["task_proof_type"];
type SubmissionStatus = Database["public"]["Enums"]["submission_status"];

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
  head: () => ({
    meta: [
      { title: "Task Center — Browse Paid Tasks | Veritask" },
      { name: "description", content: "Browse open social media tasks on Veritask and earn USDT. Pick a task, submit proof, get paid in BEP20 USDT." },
      { property: "og:title", content: "Task Center — Browse Paid Tasks | Veritask" },
      { property: "og:description", content: "Pick from open social tasks and earn USDT with instant BEP20 payouts." },
      { property: "og:url", content: "https://task-aura-vault.lovable.app/tasks" },
    ],
    links: [
      { rel: "canonical", href: "https://task-aura-vault.lovable.app/tasks" },
    ],
  }),
});

const PLATFORMS: { value: Platform | "all"; label: string; icon: typeof Instagram }[] = [
  { value: "all", label: "All", icon: Globe },
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "tiktok", label: "TikTok", icon: Music2 },
  { value: "facebook", label: "Facebook", icon: Facebook },
  { value: "youtube", label: "YouTube", icon: Youtube },
  { value: "website", label: "Website", icon: Globe },
];

const PLATFORM_META: Record<Platform, { label: string; icon: typeof Instagram; tone: string }> = {
  instagram: { label: "Instagram", icon: Instagram, tone: "text-pink-500" },
  tiktok: { label: "TikTok", icon: Music2, tone: "text-foreground" },
  facebook: { label: "Facebook", icon: Facebook, tone: "text-blue-500" },
  youtube: { label: "YouTube", icon: Youtube, tone: "text-red-500" },
  website: { label: "Website", icon: Globe, tone: "text-emerald-500" },
};

const PROOF_META: Record<ProofType, { label: string; icon: typeof Camera }> = {
  screenshot: { label: "Screenshot proof", icon: Camera },
  link: { label: "Link / username", icon: LinkIcon },
  auto: { label: "Auto-verified", icon: CheckCircle2 },
};

interface LatestByTask {
  status: SubmissionStatus;
  submitted_at: string;
}

function TasksPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithTask[] | null>(null);
  const [filter, setFilter] = useState<Platform | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Task | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const loadTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("is_active", true)
      .order("reward_cusd", { ascending: false });
    if (error) setError(error.message);
    else setTasks(data ?? []);
  }, []);

  const loadSubmissions = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("task_submissions")
      .select("id, status, proof_text, proof_screenshot_path, reviewer_notes, reward_cusd, submitted_at, reviewed_at, task_id, task:tasks(title, platform)")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false })
      .limit(50);
    if (!error) setSubmissions((data ?? []) as unknown as SubmissionWithTask[]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadTasks();
    loadSubmissions();
  }, [user, loadTasks, loadSubmissions]);

  const filtered = useMemo(() => {
    if (!tasks) return [];
    if (filter === "all") return tasks;
    return tasks.filter((t) => t.platform === filter);
  }, [tasks, filter]);

  const latestByTask = useMemo(() => {
    const map: Record<string, LatestByTask> = {};
    if (!submissions) return map;
    for (const s of submissions) {
      // submissions are sorted desc, so first hit per task wins
      const taskId = (s as any).task_id as string;
      if (taskId && !map[taskId]) {
        map[taskId] = { status: s.status, submitted_at: s.submitted_at };
      }
    }
    return map;
  }, [submissions]);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
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

      <main className="container mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Task Center</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Complete tasks across your favorite platforms to earn USDT.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {tasks ? `${filtered.length} of ${tasks.length} tasks` : "Loading tasks..."}
          </div>
        </div>

        {/* KPI strip */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile icon={ListChecks} label="Available" value={tasks?.length ?? 0} hint="Open tasks right now" />
          <StatTile
            icon={CheckIcon}
            label="Your approved"
            value={(submissions ?? []).filter((s) => s.status === "approved").length}
            hint="Counted toward payouts"
            accent="primary"
          />
          <StatTile
            icon={Hourglass}
            label="In review"
            value={(submissions ?? []).filter((s) => s.status === "pending").length}
            hint="Awaiting decision"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {PLATFORMS.map((p) => {
            const Icon = p.icon;
            const active = filter === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setFilter(p.value)}
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-all",
                  active
                    ? "border-success/50 bg-success/15 text-foreground shadow-[0_0_0_1px_color-mix(in_oklch,var(--success)_30%,transparent),0_8px_24px_-12px_color-mix(in_oklch,var(--success)_50%,transparent)]"
                    : "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground hover:border-success/30 backdrop-blur",
                ].join(" ")}
              >
                <Icon className="h-3.5 w-3.5" />
                {p.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            Failed to load tasks: {error}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {!tasks &&
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-56 animate-pulse rounded-2xl glass-card" />
              ))}

            {tasks && filtered.length === 0 && (
              <div className="md:col-span-2 glass-card rounded-2xl p-10 text-center text-sm text-muted-foreground">
                No tasks available for this platform yet.
              </div>
            )}

            {filtered.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                latest={latestByTask[task.id]}
                onSubmit={() => setSelected(task)}
              />
            ))}
          </div>

          <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight">Your submissions</h2>
              {submissions && (
                <span className="text-xs text-muted-foreground">{submissions.length}</span>
              )}
            </div>
            <SubmissionsList submissions={submissions} />
          </aside>
        </div>
      </main>

      {selected && (
        <SubmitProofDialog
          task={selected}
          userId={user.id}
          open={!!selected}
          onOpenChange={(v) => !v && setSelected(null)}
          onSubmitted={loadSubmissions}
        />
      )}
    </div>
  );
}

function TaskCard({
  task,
  latest,
  onSubmit,
}: {
  task: Task;
  latest?: LatestByTask;
  onSubmit: () => void;
}) {
  const meta = PLATFORM_META[task.platform];
  const Icon = meta.icon;
  const proof = PROOF_META[task.proof_type];
  const ProofIcon = proof.icon;

  const cooldownLeftHours = useMemo(() => {
    if (!latest || latest.status !== "approved") return 0;
    const ready = new Date(latest.submitted_at).getTime() + task.cooldown_hours * 3600_000;
    return Math.max(0, Math.ceil((ready - Date.now()) / 3600_000));
  }, [latest, task.cooldown_hours]);

  const submitDisabled = latest?.status === "pending" || cooldownLeftHours > 0;
  const submitLabel =
    latest?.status === "pending"
      ? "Pending review"
      : cooldownLeftHours > 0
        ? `Cooldown ${formatCooldown(cooldownLeftHours)}`
        : latest?.status === "approved"
          ? "Submit again"
          : latest?.status === "rejected"
            ? "Try again"
            : "Submit proof";

  return (
    <article className="group glass-card shine flex flex-col rounded-2xl p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-muted/30">
            <Icon className={`h-4 w-4 ${meta.tone}`} />
          </span>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {meta.label}
            </div>
            <Badge variant="secondary" className="mt-0.5">
              {task.action}
            </Badge>
          </div>
        </div>
        <div className="reward-pulse flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-sm font-semibold text-success">
          <Coins className="h-3.5 w-3.5" />
          {formatReward(task.reward_cusd)} USDT
        </div>
      </header>

      <h3 className="mt-4 font-semibold leading-snug">{task.title}</h3>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
          <dt className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" /> Cooldown
          </dt>
          <dd className="mt-0.5 font-medium text-foreground">
            {formatCooldown(task.cooldown_hours)}
          </dd>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
          <dt className="flex items-center gap-1 text-muted-foreground">
            <ProofIcon className="h-3 w-3" /> Proof
          </dt>
          <dd className="mt-0.5 font-medium text-foreground">{proof.label}</dd>
        </div>
      </dl>

      {latest && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock3 className="h-3 w-3" />
          Last submission: <span className="font-medium text-foreground capitalize">{latest.status}</span>
        </div>
      )}

      <div className="mt-5 flex items-center gap-2">
        <Button asChild variant="outline" size="sm" className="flex-1">
          <a href={task.target_url} target="_blank" rel="noopener noreferrer">
            Open <ArrowUpRight className="h-4 w-4" />
          </a>
        </Button>
        <Button size="sm" className="flex-1" onClick={onSubmit} disabled={submitDisabled}>
          {submitLabel}
        </Button>
      </div>
    </article>
  );
}

function formatReward(value: number | string) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return n.toFixed(n < 1 ? 3 : 2);
}

function formatCooldown(hours: number) {
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 day" : `${days} days`;
}
