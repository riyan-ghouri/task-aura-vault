import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";

type Status = Database["public"]["Enums"]["submission_status"];

export interface SubmissionWithTask {
  id: string;
  status: Status;
  proof_text: string | null;
  proof_screenshot_path: string | null;
  reviewer_notes: string | null;
  reward_cusd: number | string;
  submitted_at: string;
  reviewed_at: string | null;
  task: { title: string; platform: string } | null;
}

const META: Record<Status, { label: string; icon: typeof Clock3; cls: string }> = {
  pending: { label: "Pending review", icon: Clock3, cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  approved: { label: "Approved", icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  rejected: { label: "Rejected", icon: XCircle, cls: "bg-destructive/10 text-destructive border-destructive/30" },
};

function fmt(ts: string) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SubmissionsList({ submissions }: { submissions: SubmissionWithTask[] | null }) {
  if (!submissions) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl border border-border/60 bg-muted/30" />
        ))}
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-background/40 p-6 text-center text-sm text-muted-foreground">
        No submissions yet. Pick a task above to get started.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {submissions.map((s) => {
        const m = META[s.status];
        const Icon = m.icon;
        return (
          <li
            key={s.id}
            className="rounded-xl border border-border/60 bg-background/60 p-4 backdrop-blur-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {s.task?.title ?? "Task"}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground capitalize">
                  {s.task?.platform} · {Number(s.reward_cusd).toFixed(3)} cUSD
                </div>
              </div>
              <Badge variant="outline" className={`shrink-0 ${m.cls}`}>
                <Icon className="mr-1 h-3 w-3" /> {m.label}
              </Badge>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <div>
                <dt className="uppercase tracking-wide">Submitted</dt>
                <dd className="mt-0.5 text-foreground">{fmt(s.submitted_at)}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wide">
                  {s.status === "pending" ? "Awaiting" : "Reviewed"}
                </dt>
                <dd className="mt-0.5 text-foreground">
                  {s.reviewed_at ? fmt(s.reviewed_at) : "—"}
                </dd>
              </div>
            </dl>

            {s.proof_text && (
              <p className="mt-3 truncate rounded-md bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                {s.proof_text}
              </p>
            )}
            {s.reviewer_notes && (
              <p className="mt-2 rounded-md border-l-2 border-primary/50 bg-muted/30 px-2 py-1 text-xs">
                <span className="font-medium">Reviewer:</span> {s.reviewer_notes}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
