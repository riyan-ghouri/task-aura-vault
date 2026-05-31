import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RevealOnScroll } from "./RevealOnScroll";

export function CTA() {
  return (
    <section className="container mx-auto max-w-7xl px-4 py-20 md:py-28">
      <RevealOnScroll>
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-10 text-center shadow-elevated md:p-16">
          {/* animated gradient backdrop */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 animate-gradient bg-[radial-gradient(ellipse_at_top_left,oklch(0.72_0.17_155/0.25),transparent_60%),radial-gradient(ellipse_at_bottom_right,oklch(0.55_0.18_265/0.2),transparent_60%)]"
          />
          <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-30 mask-radial-fade" />

          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Join 21,000+ verified earners
          </div>

          <h3 className="mt-6 text-3xl font-bold tracking-tight text-balance md:text-5xl">
            Your first <span className="text-success">USDT payout</span> is one tap away.
          </h3>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            No deposit. No upgrade. No friend invites. Sign up, verify, withdraw.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-7 text-base shadow-elevated">
              <Link to="/auth" search={{ mode: "signup" }}>
                Create my free account <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-12 px-6 text-base">
              <Link to="/auth" search={{ mode: "signin" }}>I already have one</Link>
            </Button>
          </div>

          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {["No card required", "Withdraw from $1", "BEP20 USDT", "Cancel anytime"].map(
              (t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  {t}
                </li>
              )
            )}
          </ul>
        </div>
      </RevealOnScroll>
    </section>
  );
}
