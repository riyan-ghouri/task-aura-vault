import { ShieldCheck, ScanFace, Link2, BadgeDollarSign, Zap } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";
import { RevealOnScroll } from "./RevealOnScroll";

export function TrustBento() {
  return (
    <section id="trust" className="container mx-auto max-w-7xl px-4 py-20 md:py-28">
      <RevealOnScroll className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-success">
          Built for trust
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
          Why earners actually get paid here
        </h2>
        <p className="mt-4 text-muted-foreground">
          No deposits. No keys. No empty promises. Every payout settles on-chain so you can verify it yourself.
        </p>
      </RevealOnScroll>

      <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-2">
        {/* Big card */}
        <RevealOnScroll delay={50} className="md:col-span-2 md:row-span-2">
          <div className="group relative h-full overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-elevated">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-success/20 blur-3xl transition-opacity duration-500 group-hover:opacity-80" />
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-success/15 text-success">
                  <ScanFace className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Face-verified humans only</h3>
                  <p className="mt-2 text-muted-foreground">
                    GoodDollar liveness check filters bots and farm accounts. One real person, one account — that's why advertisers actually pay.
                  </p>
                </div>
              </div>
              <div>
                <div className="text-5xl font-bold text-foreground md:text-6xl">
                  <AnimatedCounter to={21000} suffix="+" /> <span className="text-success">USDT</span>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">Paid out to verified users — and counting.</div>
              </div>
            </div>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={120}>
          <BentoCard
            icon={<Link2 className="h-5 w-5" />}
            title="On-chain proof"
            body="Every withdrawal has a public transaction hash. Verify on BscScan in one click."
          />
        </RevealOnScroll>

        <RevealOnScroll delay={180}>
          <BentoCard
            icon={<BadgeDollarSign className="h-5 w-5" />}
            title="BEP20 USDT"
            body="Withdraw to any BNB Smart Chain wallet — Trust, MetaMask, Binance, Bybit."
          />
        </RevealOnScroll>

        <RevealOnScroll delay={240}>
          <BentoCard
            icon={<Zap className="h-5 w-5" />}
            title="No deposit. Ever."
            body="You never send us money. You only receive. That's the whole rule."
          />
        </RevealOnScroll>

        <RevealOnScroll delay={300}>
          <BentoCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Keys stay yours"
            body="We never custody your withdrawal wallet. You control where your USDT lands."
          />
        </RevealOnScroll>
      </div>
    </section>
  );
}

function BentoCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="group relative h-full overflow-hidden rounded-3xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-success/40 hover:shadow-elevated">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-foreground transition-colors group-hover:bg-success/15 group-hover:text-success">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}