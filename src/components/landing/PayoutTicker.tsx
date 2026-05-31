import { Wallet } from "lucide-react";

const PAYOUTS = [
  { user: "ng****a3", amount: "4.20", country: "🇳🇬" },
  { user: "in****x9", amount: "12.50", country: "🇮🇳" },
  { user: "pk****k2", amount: "1.80", country: "🇵🇰" },
  { user: "ph****m7", amount: "8.00", country: "🇵🇭" },
  { user: "id****q4", amount: "3.15", country: "🇮🇩" },
  { user: "br****v1", amount: "22.40", country: "🇧🇷" },
  { user: "bd****t6", amount: "0.95", country: "🇧🇩" },
  { user: "ke****p8", amount: "6.75", country: "🇰🇪" },
  { user: "vn****c5", amount: "5.50", country: "🇻🇳" },
  { user: "mx****w0", amount: "9.30", country: "🇲🇽" },
  { user: "tr****j2", amount: "14.10", country: "🇹🇷" },
  { user: "eg****r3", amount: "2.45", country: "🇪🇬" },
];

export function PayoutTicker() {
  const doubled = [...PAYOUTS, ...PAYOUTS];
  return (
    <section
      aria-label="Recent payouts"
      className="relative border-y border-border/60 bg-muted/30 py-4"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />

      <div className="flex items-center gap-3 overflow-hidden">
        <div className="ml-4 flex shrink-0 items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          LIVE
        </div>

        <div className="flex w-full overflow-hidden">
          <div className="flex shrink-0 animate-marquee items-center gap-8 pr-8">
            {doubled.map((p, i) => (
              <div
                key={i}
                className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm text-muted-foreground"
              >
                <Wallet className="h-3.5 w-3.5 text-success" />
                <span className="text-base">{p.country}</span>
                <span className="font-medium text-foreground">{p.user}</span>
                <span>withdrew</span>
                <span className="font-semibold text-success">${p.amount} USDT</span>
                <span className="text-muted-foreground/60">· BEP20</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}