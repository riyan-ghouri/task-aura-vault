import type { LucideIcon } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

interface Props {
  icon: LucideIcon;
  label: string;
  value: number | string;
  hint?: string;
  decimals?: number;
  suffix?: string;
  accent?: "success" | "primary" | "muted";
}

export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  decimals = 0,
  suffix,
  accent = "success",
}: Props) {
  const tone =
    accent === "success"
      ? "text-success"
      : accent === "primary"
        ? "text-primary"
        : "text-muted-foreground";
  const ring =
    accent === "success"
      ? "group-hover:shadow-[0_0_0_1px_color-mix(in_oklch,var(--success)_45%,transparent),0_10px_40px_-20px_color-mix(in_oklch,var(--success)_55%,transparent)]"
      : "group-hover:shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_35%,transparent)]";
  return (
    <div className={`group glass-card shine relative overflow-hidden rounded-2xl p-5 transition-all ${ring}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={`grid h-8 w-8 place-items-center rounded-lg bg-success/10 ${tone}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">
        {typeof value === "number" ? (
          <AnimatedNumber value={value} decimals={decimals} suffix={suffix ? ` ${suffix}` : ""} />
        ) : (
          <span>
            {value}
            {suffix ? ` ${suffix}` : ""}
          </span>
        )}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}