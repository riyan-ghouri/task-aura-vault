import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const SAMPLES = [
  { addr: "0x4f…a12c", amount: "0.50", ago: "12s" },
  { addr: "0x8b…99e1", amount: "2.30", ago: "48s" },
  { addr: "0x21…3d04", amount: "1.00", ago: "1m" },
  { addr: "0xa9…bcde", amount: "0.05", ago: "2m" },
  { addr: "0x6c…77ab", amount: "5.00", ago: "3m" },
  { addr: "0x18…f021", amount: "0.75", ago: "4m" },
];

export function ActivityHint() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % SAMPLES.length), 3200);
    return () => clearInterval(id);
  }, []);
  const s = SAMPLES[i];
  return (
    <div className="flex items-center gap-2 rounded-full border border-success/20 bg-success/5 px-3 py-1.5 text-xs text-muted-foreground">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      <Sparkles className="h-3.5 w-3.5 text-success" />
      <span key={i} className="animate-rise-in">
        <strong className="text-foreground">{s.amount} USDT</strong> just paid to {s.addr} · {s.ago} ago
      </span>
    </div>
  );
}