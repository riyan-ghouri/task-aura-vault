import { ScanFace, Link2, ShieldCheck, Lock, Globe } from "lucide-react";
import { RevealOnScroll } from "./RevealOnScroll";

const BADGES = [
  { icon: ScanFace, label: "Face verified", sub: "by GoodDollar" },
  { icon: Link2, label: "On-chain proof", sub: "BscScan verifiable" },
  { icon: Globe, label: "BEP20 / BSC", sub: "BNB Smart Chain" },
  { icon: Lock, label: "No keys stored", sub: "non-custodial payout" },
  { icon: ShieldCheck, label: "No deposit", sub: "withdraw-only" },
];

export function TrustBadges() {
  return (
    <section className="border-y border-border/60 bg-muted/30 py-10">
      <div className="container mx-auto max-w-7xl px-4">
        <RevealOnScroll>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Security & verification
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:gap-4">
            {BADGES.map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-success/40"
              >
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-success/10 text-success">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="text-xs text-muted-foreground">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}