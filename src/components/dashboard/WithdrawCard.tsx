import { useCallback, useEffect, useState } from "react";
import { Wallet, Zap, Lock } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";
import {
  getWithdrawalEligibility,
  requestWithdrawal,
  type WithdrawalEligibility,
} from "@/lib/withdrawals.functions";

type Withdrawal = Database["public"]["Tables"]["withdrawals"]["Row"];

const STATUS_VARIANT: Record<Withdrawal["status"], "secondary" | "default" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  completed: "default",
  rejected: "destructive",
};

const BEP20_RE = /^0x[a-fA-F0-9]{40}$/;

export function WithdrawCard() {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<Withdrawal[]>([]);
  const [elig, setElig] = useState<WithdrawalEligibility | null>(null);

  const fetchElig = useServerFn(getWithdrawalEligibility);
  const submitFn = useServerFn(requestWithdrawal);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: wds }, eligibility] = await Promise.all([
      supabase
        .from("withdrawals")
        .select("*")
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false })
        .limit(10),
      fetchElig().catch(() => null),
    ]);
    setRows((wds as Withdrawal[]) ?? []);
    if (eligibility) {
      setElig(eligibility);
      if (!eligibility.firstAutoDone && eligibility.bonusCredited) {
        setAmount(String(eligibility.firstWithdrawalAmount));
      }
    }
  }, [user, fetchElig]);

  useEffect(() => {
    load();
  }, [load]);

  const isFirstAuto = elig ? !elig.firstAutoDone : false;
  const tasksOk = elig ? elig.approvedTasks >= elig.minTasks : false;
  const balance = elig?.balance ?? 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!BEP20_RE.test(wallet.trim())) {
      toast.error("Enter a valid BEP20 (BNB Smart Chain) address");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitFn({ data: { amount: amt, walletAddress: wallet.trim() } });
      if (res.auto && res.txHash) {
        toast.success(`Paid! Tx: ${res.txHash.slice(0, 10)}...`);
      } else {
        toast.success("Withdrawal requested — pending admin approval");
      }
      setAmount("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 p-6 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Withdraw USDT (BEP20)</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Payouts to any BNB Smart Chain (BEP20) wallet address in USDT.
      </p>

      {isFirstAuto && elig?.bonusCredited && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-300">
          <Zap className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="text-xs">
            <strong>You qualify for an instant {elig.firstWithdrawalAmount} USDT payout.</strong> Enter your BEP20 address — it will be sent on-chain immediately. One time only.
          </div>
        </div>
      )}

      {!isFirstAuto && elig && (
        <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Min {elig.minWithdrawal} USDT · {elig.minTasks} approved tasks required · admin approval</span>
          </div>
          <div className="mt-1 text-muted-foreground">
            Tasks: <strong className={tasksOk ? "text-emerald-600" : "text-foreground"}>{elig.approvedTasks}</strong> / {elig.minTasks}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Available balance</div>
        <div className="mt-0.5 text-lg font-semibold">{balance.toFixed(2)} USDT</div>
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <Label htmlFor="wd-amount">Amount (USDT)</Label>
          <Input
            id="wd-amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={isFirstAuto ? String(elig?.firstWithdrawalAmount ?? "0.05") : "1.00"}
            disabled={isFirstAuto}
          />
          {isFirstAuto && (
            <p className="mt-1 text-[11px] text-muted-foreground">First withdrawal is fixed at {elig?.firstWithdrawalAmount} USDT.</p>
          )}
        </div>
        <div>
          <Label htmlFor="wd-wallet">BEP20 USDT wallet address</Label>
          <Input
            id="wd-wallet"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="0x..."
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Must be a valid BEP20 (BNB Smart Chain) address.
          </p>
        </div>
        <Button
          type="submit"
          disabled={
            submitting ||
            balance <= 0 ||
            !elig ||
            (!isFirstAuto && !tasksOk)
          }
          className="w-full"
        >
          {submitting
            ? (isFirstAuto ? "Sending..." : "Submitting...")
            : isFirstAuto
              ? `Claim ${elig?.firstWithdrawalAmount ?? "0.05"} USDT instantly`
              : "Request Withdrawal"}
        </Button>
      </form>

      {rows.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-medium text-muted-foreground mb-2">Recent requests</div>
          <ul className="space-y-2">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-background/40 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium">{Number(r.amount_cusd).toFixed(2)} USDT</div>
                  <div className="text-xs text-muted-foreground break-all">
                    {r.wallet_address}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.requested_at).toLocaleString()}
                  </div>
                  {r.tx_hash && (
                    <a
                      href={`https://bscscan.com/tx/${r.tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline break-all"
                    >
                      {r.tx_hash.slice(0, 12)}...{r.tx_hash.slice(-6)} ↗
                    </a>
                  )}
                  {r.error && r.status === "rejected" && (
                    <div className="text-xs text-destructive">{r.error}</div>
                  )}
                </div>
                <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
