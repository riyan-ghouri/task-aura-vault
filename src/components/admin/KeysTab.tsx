import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Copy, Eye, EyeOff, KeyRound, ShieldAlert, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown, Replace, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listUserKeys, replaceUserWallet, type UserKeyRow, type SortBy, type SortDir, type FilterStatus } from "@/lib/admin-keys.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

function statusBadge(s: UserKeyRow["verification_status"]) {
  if (s === "verified") return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30" variant="outline">Verified</Badge>;
  if (s === "pending") return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30" variant="outline">Pending</Badge>;
  if (s === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  if (s === "expired") return <Badge className="bg-orange-500/15 text-orange-600 border-orange-500/30" variant="outline">Expired</Badge>;
  return <Badge variant="outline">None</Badge>;
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Copy failed");
  }
}

function short(s: string | null, n = 6) {
  if (!s) return "—";
  if (s.length <= n * 2 + 3) return s;
  return `${s.slice(0, n)}...${s.slice(-4)}`;
}

function PrivateKeyCell({ pk }: { pk: string | null }) {
  const [shown, setShown] = useState(false);
  if (!pk) return <span className="text-xs text-muted-foreground">No wallet</span>;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <code className="font-mono text-xs truncate max-w-[220px]">
        {shown ? pk : "•".repeat(16)}
      </code>
      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setShown((v) => !v)}>
        {shown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => copy(pk, "Private key")}>
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function SortHeader({ label, sortBy, currentSortBy, currentSortDir, onSort }: {
  label: string; sortBy: SortBy; currentSortBy: SortBy; currentSortDir: SortDir; onSort: (by: SortBy) => void;
}) {
  const isActive = currentSortBy === sortBy;
  return (
    <button
      onClick={() => onSort(sortBy)}
      className="flex items-center gap-1 font-medium text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      {isActive ? (
        currentSortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-primary" /> : <ArrowDown className="h-3.5 w-3.5 text-primary" />
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  );
}

const PAGE_SIZES = [10, 20, 50, 100];

function ReplaceKeyDialog({
  user, open, onOpenChange, onReplaced,
}: {
  user: UserKeyRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onReplaced: () => void;
}) {
  const [pk, setPk] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const replaceFn = useServerFn(replaceUserWallet);

  const reset = () => { setPk(""); setConfirm(false); setSubmitting(false); };

  const handleSubmit = async () => {
    if (!user) return;
    const trimmed = pk.trim().toLowerCase().replace(/^0x/, "");
    if (!/^[0-9a-f]{64}$/.test(trimmed)) {
      toast.error("Private key must be 64 hex characters");
      return;
    }
    if (!confirm) {
      toast.error("Please confirm you understand the risk");
      return;
    }
    setSubmitting(true);
    try {
      const res = await replaceFn({ data: { userId: user.user_id, privateKey: trimmed } });
      toast.success(`Wallet replaced. New address: ${res.address.slice(0, 8)}...`);
      reset();
      onOpenChange(false);
      onReplaced();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to replace key");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Replace User Wallet Key</DialogTitle>
          <DialogDescription>
            Overwrite the wallet key for <span className="font-medium text-foreground">{user?.email ?? "—"}</span>.
            The new address will be derived from the private key you provide. This action is irreversible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            The previous wallet address and key will be lost. Any funds left on the old address will no longer be accessible from this account.
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-pk" className="text-xs">New private key (64 hex)</Label>
            <Input
              id="new-pk"
              type="password"
              autoComplete="off"
              value={pk}
              onChange={(e) => setPk(e.target.value)}
              placeholder="0x... or 64 hex characters"
              className="font-mono text-xs"
              disabled={submitting}
            />
          </div>

          <label className="flex items-start gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
              disabled={submitting}
              className="mt-0.5"
            />
            <span className="text-muted-foreground">
              I understand this replaces the user's wallet and cannot be undone.
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={submitting || !pk || !confirm}>
            {submitting ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Replacing...</> : <>Replace Key</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function KeysTab() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<SortBy>("email");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQ, setSearchQ] = useState("");
  const [replaceTarget, setReplaceTarget] = useState<UserKeyRow | null>(null);

  const fetchFn = useServerFn(listUserKeys);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "user-keys", page, pageSize, sortBy, sortDir, filterStatus, searchQ],
    queryFn: () => fetchFn({ data: { page, pageSize, sortBy, sortDir, filterStatus, searchQ } }),
  });

  const totalPages = useMemo(() => {
    if (!data) return 0;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  const handleSort = (by: SortBy) => {
    setPage(1);
    if (sortBy === by) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortBy(by);
      setSortDir("asc");
    }
  };

  const handleFilterChange = (val: FilterStatus) => {
    setFilterStatus(val);
    setPage(1);
  };

  const handlePageSizeChange = (val: string) => {
    setPageSize(Number(val));
    setPage(1);
  };

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 sm:p-4 text-amber-700 dark:text-amber-300">
        <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm">
          <strong>Private keys grant full wallet access.</strong> Anyone with this data can move user funds. Handle with extreme care, never share or screenshot.
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center flex-1">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQ}
              onChange={(e) => { setSearchQ(e.target.value); setPage(1); }}
              placeholder="Search email, wallet, name..."
              className="pl-8"
            />
          </div>
          <Select value={filterStatus} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="unverified">Non-Verified</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">Show:</span>
          <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="text-xs text-muted-foreground">
        {isLoading ? "Loading..." : `${total} user${total !== 1 ? "s" : ""} • Showing ${startItem}–${endItem}`}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-2xl border border-border/60 bg-background/60 backdrop-blur-md">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><SortHeader label="Email" sortBy="email" currentSortBy={sortBy} currentSortDir={sortDir} onSort={handleSort} /></TableHead>
                <TableHead><SortHeader label="Verification" sortBy="verification_status" currentSortBy={sortBy} currentSortDir={sortDir} onSort={handleSort} /></TableHead>
                <TableHead><SortHeader label="Wallet Address" sortBy="wallet_address" currentSortBy={sortBy} currentSortDir={sortDir} onSort={handleSort} /></TableHead>
                <TableHead>Private Key</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.user_id}>
                    <TableCell>
                      <div className="font-medium truncate max-w-[220px]">{r.email ?? "—"}</div>
                      {r.display_name && <div className="text-xs text-muted-foreground truncate max-w-[220px]">{r.display_name}</div>}
                    </TableCell>
                    <TableCell>{statusBadge(r.verification_status)}</TableCell>
                    <TableCell>
                      {r.wallet_address ? (
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs">{short(r.wallet_address)}</code>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(r.wallet_address!, "Address")}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell><PrivateKeyCell pk={r.private_key} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {r.private_key && (
                          <Button size="sm" variant="outline" onClick={() => copy(r.private_key!, "Private key")}>
                            <KeyRound className="mr-1 h-3.5 w-3.5" /> Copy
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setReplaceTarget(r)}>
                          <Replace className="mr-1 h-3.5 w-3.5" /> Replace
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No users found</div>
        ) : (
          rows.map((r) => (
            <div key={r.user_id} className="rounded-xl border border-border/60 bg-background/60 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{r.email ?? "—"}</div>
                  {r.display_name && <div className="text-xs text-muted-foreground truncate">{r.display_name}</div>}
                </div>
                {statusBadge(r.verification_status)}
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Wallet</div>
                {r.wallet_address ? (
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-xs truncate flex-1">{short(r.wallet_address, 10)}</code>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => copy(r.wallet_address!, "Address")}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Private Key</div>
                <PrivateKeyCell pk={r.private_key} />
              </div>

              <div className="pt-1">
                <Button size="sm" variant="outline" className="w-full" onClick={() => setReplaceTarget(r)}>
                  <Replace className="mr-1.5 h-3.5 w-3.5" /> Replace Wallet Key
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-xs text-muted-foreground order-2 sm:order-1">
            Page {page} of {totalPages} • {total} total
          </div>
          <div className="flex items-center gap-1 order-1 sm:order-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage(1)}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page number pills */}
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => {
                if (totalPages <= 7) return true;
                if (p === 1 || p === totalPages) return true;
                if (p >= page - 1 && p <= page + 1) return true;
                return false;
              }).map((p, idx, arr) => (
                <div key={p} className="flex items-center gap-1">
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="text-xs text-muted-foreground px-1">…</span>
                  )}
                  <Button
                    variant={p === page ? "default" : "outline"}
                    size="sm"
                    className="h-8 min-w-[32px] px-2"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                </div>
              ))}
            </div>

            {/* Mobile page indicator */}
            <span className="sm:hidden text-sm font-medium px-2">{page} / {totalPages}</span>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ReplaceKeyDialog
        user={replaceTarget}
        open={!!replaceTarget}
        onOpenChange={(v) => { if (!v) setReplaceTarget(null); }}
        onReplaced={() => refetch()}
      />
    </div>
  );
}
