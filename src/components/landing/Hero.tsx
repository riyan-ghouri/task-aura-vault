import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, CheckCircle2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "./AnimatedCounter";

const HEADLINE = ["Get", "paid", "in", "USDT", "for", "tasks", "you", "already", "do."];

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * 18;
      const y = ((e.clientY - r.top) / r.height - 0.5) * 18;
      setParallax({ x, y });
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <section ref={ref} className="relative overflow-hidden">
      {/* Animated grid + glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid mask-radial-fade opacity-60" />
        <div className="absolute left-1/2 top-[-20%] h-[700px] w-[900px] -translate-x-1/2 rounded-full bg-success/15 blur-[140px]" />
        <div className="absolute bottom-[-30%] right-[-10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[140px]" />
      </div>

      <div className="container mx-auto grid max-w-7xl items-center gap-12 px-4 pt-16 pb-20 md:grid-cols-2 md:pt-24 md:pb-28">
        {/* Left */}
        <div>
          <div
            className="inline-flex animate-rise-in items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-foreground"
            style={{ animationDelay: "0ms" }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            21,000+ USDT already paid to real users
          </div>

          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-balance text-foreground md:text-6xl lg:text-7xl">
            {HEADLINE.map((w, i) => (
              <span
                key={i}
                className="mr-[0.25em] inline-block animate-rise-in"
                style={{ animationDelay: `${80 + i * 70}ms` }}
              >
                {w === "USDT" ? (
                  <span className="bg-gradient-to-r from-success via-success to-primary bg-clip-text text-transparent">
                    {w}
                  </span>
                ) : (
                  w
                )}
              </span>
            ))}
          </h1>

          <p
            className="mt-6 max-w-lg animate-rise-in text-base text-muted-foreground md:text-lg"
            style={{ animationDelay: "800ms" }}
          >
            Watch ads, try apps, follow accounts — verified humans earn real BEP20 USDT,
            withdrawn straight to your wallet. No deposits, no upgrades, no nonsense.
          </p>

          <div
            className="mt-8 flex animate-rise-in flex-col items-start gap-3 sm:flex-row sm:items-center"
            style={{ animationDelay: "900ms" }}
          >
            <Button asChild size="lg" className="h-12 px-6 text-base shadow-elevated">
              <Link to="/auth" search={{ mode: "signup" }}>
                Start earning free <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-6 text-base">
              <a href="#how">How it works</a>
            </Button>
          </div>

          <ul
            className="mt-8 flex animate-rise-in flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"
            style={{ animationDelay: "1000ms" }}
          >
            {["No deposit", "Withdraw to BEP20", "Face-verified", "On-chain proof"].map(
              (t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {t}
                </li>
              )
            )}
          </ul>
        </div>

        {/* Right — payout card */}
        <div className="relative mx-auto w-full max-w-md md:mx-0 md:ml-auto">
          <div
            className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-success/20 via-primary/10 to-transparent blur-2xl"
            style={{
              transform: `translate(${parallax.x * 0.4}px, ${parallax.y * 0.4}px)`,
            }}
          />

          <div
            className="relative rounded-3xl border border-border bg-card/80 p-6 shadow-elevated backdrop-blur-xl"
            style={{
              transform: `translate(${parallax.x * 0.2}px, ${parallax.y * 0.2}px) perspective(1000px) rotateX(${parallax.y * -0.15}deg) rotateY(${parallax.x * 0.15}deg)`,
              transition: "transform 0.15s ease-out",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-success/15 text-success">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="leading-tight">
                  <div className="text-xs text-muted-foreground">Verified earnings</div>
                  <div className="text-sm font-semibold">Total paid out</div>
                </div>
              </div>
              <div className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
                Live
              </div>
            </div>

            <div className="mt-6">
              <div className="text-5xl font-bold tracking-tight text-foreground md:text-6xl">
                $<AnimatedCounter to={21432} duration={2200} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">USDT paid to verified earners</div>
            </div>

            <div className="mt-6 space-y-2">
              {[
                { u: "ng****a3", a: "4.20" },
                { u: "id****q4", a: "3.15" },
                { u: "br****v1", a: "22.40" },
              ].map((p, i) => (
                <div
                  key={i}
                  className="flex animate-rise-in items-center justify-between rounded-xl bg-muted/60 px-3 py-2.5 text-sm"
                  style={{ animationDelay: `${1100 + i * 120}ms` }}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary/40 to-success/40" />
                    <span className="font-medium">{p.u}</span>
                    <span className="text-xs text-muted-foreground">just withdrew</span>
                  </div>
                  <div className="inline-flex items-center gap-1 font-semibold text-success">
                    +${p.a} <ArrowUpRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
              <span>Settled on BNB Smart Chain</span>
              <span className="font-mono text-foreground/80">0xa1…f8c</span>
            </div>
          </div>

          {/* Floating USDT badge */}
          <div
            className="absolute -right-3 -top-3 grid h-16 w-16 animate-float-slow place-items-center rounded-2xl bg-gradient-to-br from-success to-success/70 text-success-foreground shadow-elevated"
            style={{ transform: `translate(${parallax.x * 0.6}px, ${parallax.y * 0.6}px)` }}
          >
            <div className="text-center leading-tight">
              <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">USDT</div>
              <div className="text-xs font-bold">BEP20</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
