import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldAlert, Wallet, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getAdminWalletInfo, setAdminWallet } from "@/lib/admin-wallet.functions";
import { retryPendingAutoWithdrawals } from "@/lib/withdrawals.functions";

const SETTING_KEYS = [
  { key: "signup_bonus_usdt", label: "Verification bonus (USDT)", help: "Credited once when a user first becomes verified." },
  { key: "first_withdrawal_amount_usdt", label: "First auto-withdrawal amount (USDT)", help: "The one-time instant payout amount." },
  { key: "min_withdrawal_usdt", label: "Minimum withdrawal (USDT)", help: "After the first auto-payout." },
  { key: "min_tasks_for_withdrawal", label: "Minimum approved tasks", help: "Required for normal withdrawals." },
] as const;

export function PayoutsTab() {
  const fetchInfo = useServerFn(getAdminWalletInfo);
  const saveKey = useServerFn(setAdminWallet);
  const retryQueued = useServerFn(retryPendingAutoWithdrawals);

  const { data: info, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "wallet-info"],
    queryFn: () => fetchInfo(),
  });

  // Best-effort: whenever the admin loads/refreshes this tab and the wallet
  // has any USDT, try to drain queued auto-payouts in the background.
  useEffect(() => {
    if (!info?.hasKey) return;
    if (Number(info.usdt) <= 0) return;
    retryQueued().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info?.address, info?.usdt]);

  const [pk, setPk] = useState("");
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", SETTING_KEYS.map((s) => s.key));
      const m: Record<string, string> = {};
      for (const row of data ?? []) {
        const v = row.value as unknown;
        m[row.key] = typeof v === "number" ? String(v) : typeof v === "string" ? v : JSON.stringify(v);
      }
      setSettings(m);
      setSettingsLoading(false);
    })();
  }, []);

  async function saveSetting(key: string) {
    const raw = settings[key];
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Enter a valid number");
      return;
    }
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { key, value: n as unknown as never, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) toast.error(error.message);
    else toast.success("Saved");
  }

  async function onSaveKey() {
    const trimmed = pk.trim().replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]{64}$/.test(trimmed)) {
      toast.error("Private key must be 64 hex characters");
      return;
    }
    setSaving(true);
    try {
      const res = await saveKey({ data: { privateKey: trimmed } });
      toast.success(`Hot wallet set: ${res.address.slice(0, 6)}...${res.address.slice(-4)}`);
      setPk("");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onProcessQueue() {
    try {
      const res = await retryQueued();
      if (res.processed > 0) {
        toast.success(`Processed ${res.processed} queued payout(s)`);
      } else if ((res.queued ?? 0) > 0) {
        toast.message("Still queued — fund the hot wallet (USDT + a little BNB for gas).");
      } else {
        toast.message("No queued auto-payouts.");
      }
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to process queue");
    }
  }

  return (
    <div className="space-y-6">
      {/* Hot wallet */}
      <section className="rounded-2xl border border-border/60 bg-background/60 p-4 sm:p-6 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Hot Wallet (BEP20 USDT auto-payouts)</h2>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            This 64-hex private key controls real funds. Anyone with it can drain the wallet. The key is encrypted at rest and only ever decrypted server-side during a payout. Fund this address with USDT (BEP20) for payouts and a small amount of BNB for gas.
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-3 text-sm">
          {isLoading ? (
            <div className="text-muted-foreground">Loading wallet info...</div>
          ) : info?.address ? (
            <div className="space-y-1">
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Address: </span>
                <code className="font-mono text-xs break-all">{info.address}</code>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span>BNB: <strong>{Number(info.bnb).toFixed(6)}</strong></span>
                <span>USDT: <strong>{Number(info.usdt).toFixed(2)}</strong></span>
                <span className={info.hasKey ? "text-emerald-600" : "text-amber-600"}>
                  {info.hasKey ? "Key stored" : "No key stored"}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-xs">No hot wallet configured yet.</div>
          )}
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> {isFetching ? "Refreshing..." : "Refresh balances"}
          </Button>
          <Button variant="outline" size="sm" className="mt-2 ml-2" onClick={onProcessQueue}>
            Process queued payouts
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-pk">{info?.hasKey ? "Replace private key" : "Private key"} (64 hex)</Label>
          <Input
            id="admin-pk"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={pk}
            onChange={(e) => setPk(e.target.value)}
            placeholder="0x... or just 64 hex chars"
            className="font-mono"
          />
          <Button onClick={onSaveKey} disabled={saving || !pk.trim()}>
            <Save className="mr-1 h-4 w-4" /> {saving ? "Saving..." : "Save key"}
          </Button>
        </div>
      </section>

      {/* Payout rules */}
      <section className="rounded-2xl border border-border/60 bg-background/60 p-4 sm:p-6 backdrop-blur-md space-y-4">
        <h2 className="font-semibold">Payout rules</h2>
        {settingsLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {SETTING_KEYS.map(({ key, label, help }) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`set-${key}`}>{label}</Label>
                <div className="flex gap-2">
                  <Input
                    id={`set-${key}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings[key] ?? ""}
                    onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
                  />
                  <Button variant="outline" onClick={() => saveSetting(key)}>Save</Button>
                </div>
                <p className="text-[11px] text-muted-foreground">{help}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}