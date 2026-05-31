import { Star, BadgeCheck } from "lucide-react";
import { useRef, useState } from "react";
import { RevealOnScroll } from "./RevealOnScroll";

const items = [
  {
    q: "Cashed out my first $12 USDT in three days. Showed up in my Trust Wallet — proof on BscScan and everything.",
    a: "Amara O.",
    r: "Lagos, Nigeria",
    paid: "$48.20",
    avatar: "https://i.pravatar.cc/120?img=47",
  },
  {
    q: "I was sure it was another scam. Did the face check, did a few tasks, withdrew $5 to test. It just worked.",
    a: "Rafael M.",
    r: "São Paulo, Brazil",
    paid: "$127.80",
    avatar: "https://i.pravatar.cc/120?img=12",
  },
  {
    q: "Finally a rewards app that doesn't ask me to invite ten friends before I can withdraw anything.",
    a: "Priya S.",
    r: "Mumbai, India",
    paid: "$31.40",
    avatar: "https://i.pravatar.cc/120?img=45",
  },
];

export function Testimonials() {
  return (
    <section className="container mx-auto max-w-7xl px-4 py-20 md:py-28">
      <RevealOnScroll className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-success">
          Real users · real payouts
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
          People who actually got paid
        </h2>
      </RevealOnScroll>

      <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
        {items.map((t, i) => (
          <RevealOnScroll key={t.a} delay={i * 120}>
            <TiltCard>
              <div className="flex h-full flex-col justify-between rounded-3xl border border-border bg-card p-6 transition-all hover:border-success/40 hover:shadow-elevated">
                <div>
                  <div className="flex items-center gap-1 text-success">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <blockquote className="mt-4 text-[15px] leading-relaxed text-foreground">
                    "{t.q}"
                  </blockquote>
                </div>
                <figcaption className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={t.avatar}
                      alt={t.a}
                      loading="lazy"
                      className="h-10 w-10 rounded-full border border-border object-cover"
                    />
                    <div className="leading-tight">
                      <div className="flex items-center gap-1 text-sm font-semibold">
                        {t.a}
                        <BadgeCheck className="h-3.5 w-3.5 text-success" />
                      </div>
                      <div className="text-xs text-muted-foreground">{t.r}</div>
                    </div>
                  </div>
                  <div className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                    {t.paid}
                  </div>
                </figcaption>
              </div>
            </TiltCard>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}

function TiltCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ x: 0, y: 0 });
  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        const x = ((e.clientX - r.left) / r.width - 0.5) * 8;
        const y = ((e.clientY - r.top) / r.height - 0.5) * 8;
        setT({ x, y });
      }}
      onMouseLeave={() => setT({ x: 0, y: 0 })}
      style={{
        transform: `perspective(1000px) rotateX(${-t.y}deg) rotateY(${t.x}deg)`,
        transition: "transform 0.2s ease-out",
      }}
      className="h-full"
    >
      {children}
    </div>
  );
}
