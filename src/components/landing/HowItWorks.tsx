import { ScanFace, MousePointerClick, Wallet } from "lucide-react";
import { RevealOnScroll } from "./RevealOnScroll";

const steps = [
  {
    n: "01",
    icon: ScanFace,
    t: "Verify you're real",
    d: "One-tap face verification with GoodDollar. Takes ~30 seconds. We never store the video.",
  },
  {
    n: "02",
    icon: MousePointerClick,
    t: "Complete simple tasks",
    d: "Watch a video, try an app, follow an account. Each task pays in USDT — no skill required.",
  },
  {
    n: "03",
    icon: Wallet,
    t: "Withdraw to your wallet",
    d: "Cash out BEP20 USDT to any BSC wallet — Trust, MetaMask, Binance. On-chain in seconds.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative container mx-auto max-w-7xl px-4 py-20 md:py-28">
      <RevealOnScroll className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-success">
          Three steps. No catch.
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
          From signup to paid in minutes
        </h2>
        <p className="mt-4 text-muted-foreground">
          We don't gate your earnings behind upgrades or invites. Sign up, verify, get paid.
        </p>
      </RevealOnScroll>

      <div className="relative mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* connector line */}
        <div className="pointer-events-none absolute left-0 right-0 top-10 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />

        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <RevealOnScroll key={s.n} delay={i * 120}>
              <div className="relative h-full rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-success/40 hover:shadow-elevated">
                <div className="relative z-10 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-success to-success/60 text-success-foreground shadow-elevated animate-pulse-ring">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="mt-5 font-mono text-xs text-muted-foreground">STEP {s.n}</div>
                <h3 className="mt-1 text-xl font-bold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            </RevealOnScroll>
          );
        })}
      </div>
    </section>
  );
}
