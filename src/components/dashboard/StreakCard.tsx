import { useEffect, useState } from "react";
import { Flame, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const KEY = "vt_streak_v1";

interface StreakData {
  streak: number;
  lastDay: string; // YYYY-MM-DD (UTC)
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayUTC() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function read(): StreakData {
  if (typeof window === "undefined") return { streak: 0, lastDay: "" };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { streak: 0, lastDay: "" };
    return JSON.parse(raw) as StreakData;
  } catch {
    return { streak: 0, lastDay: "" };
  }
}

export function StreakCard() {
  const [data, setData] = useState<StreakData>({ streak: 0, lastDay: "" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setData(read());
    setMounted(true);
  }, []);

  const today = todayUTC();
  const claimed = data.lastDay === today;

  function claim() {
    const yest = yesterdayUTC();
    const next: StreakData = {
      streak: data.lastDay === yest ? data.streak + 1 : 1,
      lastDay: today,
    };
    setData(next);
    localStorage.setItem(KEY, JSON.stringify(next));
    toast.success(`Day ${next.streak} streak! Keep it going tomorrow 🔥`);
  }

  const days = Array.from({ length: 7 }, (_, i) => i);

  return (
    <div className="glass-card relative overflow-hidden rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-success/15 text-success">
            <Flame className="h-5 w-5" />
            {mounted && data.streak > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-success px-1 text-[10px] font-bold text-success-foreground">
                {data.streak}
              </span>
            )}
          </span>
          <div>
            <div className="font-semibold">Daily check-in</div>
            <div className="text-xs text-muted-foreground">
              {mounted
                ? claimed
                  ? `Locked in for today. ${data.streak}-day streak.`
                  : "Tap to start (or extend) your streak."
                : "Loading…"}
            </div>
          </div>
        </div>
        <Button size="sm" onClick={claim} disabled={!mounted || claimed} className="shrink-0">
          {claimed ? (
            <>
              <Check className="h-4 w-4" /> Done
            </>
          ) : (
            "Check in"
          )}
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {days.map((i) => {
          const filled = mounted && i < (data.streak % 7 || (claimed ? 7 : 0));
          const isToday = i === ((data.streak - 1 + 7) % 7) && claimed;
          return (
            <div
              key={i}
              className={`relative h-9 rounded-md border text-[10px] font-semibold uppercase grid place-items-center transition-all ${
                filled
                  ? "border-success/40 bg-success/15 text-success"
                  : "border-border/60 bg-muted/30 text-muted-foreground"
              } ${isToday ? "ring-2 ring-success/60" : ""}`}
            >
              D{i + 1}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Streaks unlock priority review on your task submissions.
      </p>
    </div>
  );
}