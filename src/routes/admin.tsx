import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LogOut, ShieldCheck, Ban, CheckCircle2, XCircle, Users as UsersIcon, Wallet, Settings as SettingsIcon, Gift, Wrench, FileCheck2, ListChecks, KeyRound, Coins } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SiteHeader } from "@/components/SiteHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SubmissionsTab } from "@/components/admin/SubmissionsTab";
import { TasksTab } from "@/components/admin/TasksTab";
import { KeysTab } from "@/components/admin/KeysTab";
import { PayoutsTab } from "@/components/admin/PayoutsTab";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Withdrawal = Database["public"]["Tables"]["withdrawals"]["Row"];
type WStatus = Database["public"]["Enums"]["withdrawal_status"];

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin Console | Veritask" },
      { name: "description", content: "Internal Veritask admin console for managing users, tasks, and withdrawals." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && user && !isAdmin) {
      toast.error("Admin access required");
      navigate({ to: "/dashboard" });
    }
  }, [isAdmin, adminLoading, user, navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (authLoading || adminLoading || !user || !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background page-backdrop">
      <SiteHeader />

      <main className="container mx-auto max-w-7xl px-4 py-6 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Admin Panel</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Manage tasks, users, submissions and withdrawals</p>

        <Tabs defaultValue="tasks" className="mt-6 sm:mt-8">
          <div className="-mx-4 overflow-x-auto px-4 pb-1">
            <TabsList className="inline-flex w-max">
              <TabsTrigger value="tasks">
                <ListChecks className="mr-2 h-4 w-4" /> Tasks
              </TabsTrigger>
              <TabsTrigger value="submissions">
                <FileCheck2 className="mr-2 h-4 w-4" /> Submissions
              </TabsTrigger>
              <TabsTrigger value="users">
                <UsersIcon className="mr-2 h-4 w-4" /> Users
              </TabsTrigger>
              <TabsTrigger value="withdrawals">
                <Wallet className="mr-2 h-4 w-4" /> Withdrawals
              </TabsTrigger>
              <TabsTrigger value="keys">
                <KeyRound className="mr-2 h-4 w-4" /> Keys
              </TabsTrigger>
              <TabsTrigger value="payouts">
                <Coins className="mr-2 h-4 w-4" /> Payouts
              </TabsTrigger>
              <TabsTrigger value="settings">
                <SettingsIcon className="mr-2 h-4 w-4" /> Settings
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="tasks" className="mt-6">
            <TasksTab />
          </TabsContent>
          <TabsContent value="submissions" className="mt-6">
            <SubmissionsTab />
          </TabsContent>
          <TabsContent value="users" className="mt-6">
            <UsersTab />
          </TabsContent>
          <TabsContent value="withdrawals" className="mt-6">
            <WithdrawalsTab />
          </TabsContent>
          <TabsContent value="keys" className="mt-6">
            <KeysTab />
          </TabsContent>
          <TabsContent value="payouts" className="mt-6">
            <PayoutsTab />
          </TabsContent>
          <TabsContent value="settings" className="mt-6">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ---------- USERS ---------- */

type UserRow = Profile & {
  approved_count: number;
  approved_total: number;
  verified: boolean;
};

function UsersTab() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [banTarget, setBanTarget] = useState<UserRow | null>(null);
  const [banReason, setBanReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: profiles }, { data: subs }, { data: vers }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("task_submissions").select("user_id, status, reward_cusd"),
      supabase.from("verifications").select("user_id, status, expires_at"),
    ]);

    const totals = new Map<string, { count: number; total: number }>();
    (subs ?? []).forEach((s) => {
      if (s.status !== "approved") return;
      const cur = totals.get(s.user_id) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += Number(s.reward_cusd);
      totals.set(s.user_id, cur);
    });

    const verifiedSet = new Set<string>();
    (vers ?? []).forEach((v) => {
      if (v.status === "verified" && (!v.expires_at || new Date(v.expires_at) > new Date())) {
        verifiedSet.add(v.user_id);
      }
    });

    setRows(
      (profiles ?? []).map((p) => ({
        ...p,
        approved_count: totals.get(p.id)?.count ?? 0,
        approved_total: totals.get(p.id)?.total ?? 0,
        verified: verifiedSet.has(p.id),
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setBanned(userId: string, banned: boolean, reason: string | null) {
    const { error } = await supabase
      .from("profiles")
      .update({
        is_banned: banned,
        banned_at: banned ? new Date().toISOString() : null,
        banned_reason: banned ? reason : null,
      })
      .eq("id", userId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(banned ? "User banned" : "User unbanned");
    setBanTarget(null);
    setBanReason("");
    load();
  }

  const fullName = (u: UserRow) =>
    [u.first_name, u.last_name].filter(Boolean).join(" ") || u.display_name || "—";

  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 backdrop-blur-md">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Occupation</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead className="text-right">Age</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead className="text-right">Approved</TableHead>
              <TableHead className="text-right">Earned</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No users</TableCell></TableRow>
            ) : (
              rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{fullName(u)}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.occupation ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.gender ?? "—"}</TableCell>
                  <TableCell className="text-right">{u.age ?? "—"}</TableCell>
                  <TableCell>
                    {u.verified ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30" variant="outline">Verified</Badge>
                    ) : (
                      <Badge variant="outline">No</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{u.approved_count}</TableCell>
                  <TableCell className="text-right">{u.approved_total.toFixed(2)}</TableCell>
                  <TableCell>
                    {u.is_banned ? (
                      <Badge variant="destructive">Banned</Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {u.is_banned ? (
                      <Button size="sm" variant="outline" onClick={() => setBanned(u.id, false, null)}>
                        Unban
                      </Button>
                    ) : (
                      <Button size="sm" variant="destructive" onClick={() => setBanTarget(u)}>
                        <Ban className="mr-1 h-3.5 w-3.5" /> Ban
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>


      <Dialog open={!!banTarget} onOpenChange={(o) => !o && setBanTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban {banTarget?.display_name ?? banTarget?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ban-reason">Reason (optional)</Label>
            <Textarea
              id="ban-reason"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Violated terms..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => banTarget && setBanned(banTarget.id, true, banReason.trim() || null)}
            >
              Confirm Ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- WITHDRAWALS ---------- */

type WithdrawalRow = Withdrawal & { profile_email?: string | null; profile_name?: string | null };

const STATUS_VARIANT: Record<WStatus, "secondary" | "default" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  completed: "default",
  rejected: "destructive",
};

function WithdrawalsTab() {
  const { user } = useAuth();
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<WStatus | "all">("pending");
  const [actionTarget, setActionTarget] = useState<{ row: WithdrawalRow; action: "complete" | "reject" } | null>(null);
  const [notes, setNotes] = useState("");
  const [txHash, setTxHash] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("withdrawals").select("*").order("requested_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    const list = (data as Withdrawal[]) ?? [];
    const userIds = [...new Set(list.map((w) => w.user_id))];
    let profMap = new Map<string, { email: string | null; display_name: string | null }>();
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, email, display_name")
        .in("id", userIds);
      (profs ?? []).forEach((p) =>
        profMap.set(p.id, { email: p.email, display_name: p.display_name }),
      );
    }
    setRows(
      list.map((w) => ({
        ...w,
        profile_email: profMap.get(w.user_id)?.email ?? null,
        profile_name: profMap.get(w.user_id)?.display_name ?? null,
      })),
    );
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function applyAction() {
    if (!actionTarget || !user) return;
    const newStatus: WStatus = actionTarget.action === "complete" ? "completed" : "rejected";
    const { error } = await supabase
      .from("withdrawals")
      .update({
        status: newStatus,
        admin_notes: notes.trim() || null,
        tx_hash: actionTarget.action === "complete" ? txHash.trim() || null : null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", actionTarget.row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(newStatus === "completed" ? "Marked completed" : "Rejected");
    setActionTarget(null);
    setNotes("");
    setTxHash("");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={filter} onValueChange={(v) => setFilter(v as WStatus | "all")}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
      </div>

      <div className="rounded-2xl border border-border/60 bg-background/60 backdrop-blur-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Wallet</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tx hash</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No withdrawals</TableCell></TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.profile_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.profile_email}</div>
                  </TableCell>
                  <TableCell className="font-medium">{Number(r.amount_cusd).toFixed(2)} cUSD</TableCell>
                  <TableCell className="font-mono text-xs">
                    {r.wallet_address.slice(0, 6)}...{r.wallet_address.slice(-4)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.requested_at).toLocaleString()}
                  </TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">
                    {r.tx_hash ? `${r.tx_hash.slice(0, 8)}...` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "pending" ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => setActionTarget({ row: r, action: "complete" })}>
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Complete
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setActionTarget({ row: r, action: "reject" })}>
                          <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : "—"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!actionTarget} onOpenChange={(o) => !o && setActionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionTarget?.action === "complete" ? "Mark as Completed" : "Reject Withdrawal"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-border/40 bg-muted/30 p-3 text-sm">
              <div>{actionTarget?.row.profile_email}</div>
              <div className="font-medium">{Number(actionTarget?.row.amount_cusd ?? 0).toFixed(2)} cUSD</div>
              <div className="font-mono text-xs text-muted-foreground break-all">{actionTarget?.row.wallet_address}</div>
            </div>
            {actionTarget?.action === "complete" && (
              <div>
                <Label htmlFor="tx">Transaction hash (optional)</Label>
                <Input id="tx" value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x..." />
              </div>
            )}
            <div>
              <Label htmlFor="notes">Admin notes (optional)</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionTarget(null)}>Cancel</Button>
            <Button
              variant={actionTarget?.action === "complete" ? "default" : "destructive"}
              onClick={applyAction}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- SETTINGS ---------- */

function SettingsTab() {
  const [reward, setReward] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [maintEnabled, setMaintEnabled] = useState(false);
  const [maintReason, setMaintReason] = useState("");
  const [savingMaint, setSavingMaint] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: setting }, { data: refs }, { data: maintRows }] = await Promise.all([
      supabase.from("app_settings").select("value").eq("key", "referral_reward_cusd").maybeSingle(),
      supabase.from("referrals").select("reward_cusd"),
      supabase.from("app_settings").select("key,value").in("key", ["maintenance_mode", "maintenance_reason"]),
    ]);
    setReward(String(setting?.value ?? "0"));
    const list = refs ?? [];
    setTotalReferrals(list.length);
    setTotalPaid(list.reduce((s, r) => s + Number(r.reward_cusd), 0));
    const map = new Map((maintRows ?? []).map((r) => [r.key, r.value]));
    setMaintEnabled(map.get("maintenance_mode") === true);
    const reason = map.get("maintenance_reason");
    setMaintReason(typeof reason === "string" ? reason : "");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    const n = Number(reward);
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Enter a valid non-negative number");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { key: "referral_reward_cusd", value: n as unknown as never, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Referral reward updated");
    load();
  }

  async function saveMaintenance() {
    setSavingMaint(true);
    const now = new Date().toISOString();
    const [a, b] = await Promise.all([
      supabase
        .from("app_settings")
        .upsert({ key: "maintenance_mode", value: maintEnabled as unknown as never, updated_at: now }, { onConflict: "key" }),
      supabase
        .from("app_settings")
        .upsert({ key: "maintenance_reason", value: maintReason as unknown as never, updated_at: now }, { onConflict: "key" }),
    ]);
    setSavingMaint(false);
    const err = a.error || b.error;
    if (err) { toast.error(err.message); return; }
    toast.success(maintEnabled ? "Maintenance mode ON — non-admins are locked out" : "Maintenance mode OFF");
    load();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-background/60 p-5 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Gift className="h-3.5 w-3.5" /> Total referrals
          </div>
          <div className="mt-2 text-2xl font-semibold">{totalReferrals}</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/60 p-5 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" /> Total credited
          </div>
          <div className="mt-2 text-2xl font-semibold">{totalPaid.toFixed(2)} cUSD</div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-background/60 p-6 backdrop-blur-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Wrench className="h-4 w-4 text-primary" /> Maintenance mode
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Locks the site for everyone except admins. They'll see the reason below.
            </p>
          </div>
          <Switch
            checked={maintEnabled}
            disabled={loading || savingMaint}
            onCheckedChange={setMaintEnabled}
            aria-label="Toggle maintenance mode"
          />
        </div>

        {maintEnabled && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
            Toggle is ON. Click Save to lock the site for non-admins.
          </div>
        )}

        <div className="mt-4">
          <Label htmlFor="maint-reason">Message shown to users</Label>
          <Textarea
            id="maint-reason"
            value={maintReason}
            onChange={(e) => setMaintReason(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="We're upgrading payouts — back in ~30 minutes."
            disabled={loading || savingMaint}
          />
          <p className="mt-1 text-xs text-muted-foreground">{maintReason.length}/500</p>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={saveMaintenance} disabled={savingMaint || loading}>
            {savingMaint ? "Saving..." : "Save maintenance settings"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-background/60 p-6 backdrop-blur-md">
        <h2 className="text-base font-semibold">Referral reward</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Amount (cUSD) credited to the referrer for each new signup using their code. Applies to future signups only.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="reward">Reward per referral (cUSD)</Label>
            <Input
              id="reward"
              type="number"
              step="0.01"
              min="0"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
