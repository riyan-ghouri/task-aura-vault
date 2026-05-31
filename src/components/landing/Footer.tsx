import { ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-success to-success/60 text-success-foreground">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="font-semibold text-foreground">VerifyTasks</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              The withdraw-only USDT rewards platform for verified humans. Built on BNB Smart Chain, verified by GoodDollar.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-border bg-card px-2.5 py-1 text-muted-foreground">21K+ USDT paid</span>
              <span className="rounded-full border border-border bg-card px-2.5 py-1 text-muted-foreground">Face verified</span>
              <span className="rounded-full border border-border bg-card px-2.5 py-1 text-muted-foreground">BEP20</span>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-foreground">Product</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="#how" className="hover:text-foreground">How it works</a></li>
              <li><a href="#trust" className="hover:text-foreground">Why trust us</a></li>
              <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
            </ul>
          </div>

          <div>
            <div className="text-sm font-semibold text-foreground">Legal</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Privacy</a></li>
              <li><a href="#" className="hover:text-foreground">Terms</a></li>
              <li><a href="#" className="hover:text-foreground">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row">
          <div>© {new Date().getFullYear()} VerifyTasks. All payouts settle on-chain.</div>
          <div>Crypto involves risk. Rewards are not guaranteed and depend on task availability.</div>
        </div>
      </div>
    </footer>
  );
}
