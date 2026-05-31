import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, ExternalLink, Loader2, RefreshCw, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMyVerification, refreshVerification, startVerification, getFaceVerificationLink } from "@/lib/verification.functions";
import { getOrCreateWallet, getMyWallet } from "@/lib/wallet.functions";

type Status = "pending" | "verified" | "rejected" | "expired";

const STATUS_META: Record<Status, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  pending: { label: "Pending", icon: Clock, className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  verified: { label: "Verified", icon: CheckCircle2, className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  rejected: { label: "Rejected", icon: XCircle, className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" },
  expired: { label: "Expired", icon: ShieldAlert, className: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30" },
};

export function VerificationCard() {
  const qc = useQueryClient();
  const getVerification = useServerFn(getMyVerification);
  const start = useServerFn(startVerification);
  const refresh = useServerFn(refreshVerification);
  const getFvLink = useServerFn(getFaceVerificationLink);
  const getWallet = useServerFn(getMyWallet);
  const ensureWallet = useServerFn(getOrCreateWallet);


  

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["wallet", "me"],
    queryFn: () => getWallet(),
  });

  const ensureWalletMut = useMutation({
    mutationFn: () => ensureWallet(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet", "me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Auto-provision wallet on first load if missing
  useEffect(() => {
    if (!walletLoading && !wallet?.address && !ensureWalletMut.isPending && !ensureWalletMut.isSuccess) {
      ensureWalletMut.mutate();
    }
  }, [walletLoading, wallet?.address]);

  const { data: verification, isLoading: verLoading } = useQuery({
    queryKey: ["verification", "me"],
    queryFn: () => getVerification(),
    enabled: !!wallet?.address,
  });

  const startMut = useMutation({
    mutationFn: () => start(),
    onSuccess: () => {
      toast.success("Verification started. Complete Face Verification on GoodDollar, then click Recheck.");
      qc.invalidateQueries({ queryKey: ["verification", "me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refreshMut = useMutation({
    mutationFn: () => refresh(),
    onSuccess: (row) => {
      const s = (row?.status ?? "pending") as Status;
      if (s === "verified") toast.success("Verification confirmed on-chain.");
      else if (s === "expired") toast.warning("Verification expired. Re-verify on GoodDollar.");
      else toast.info("Not verified yet. Complete Face Verification, then recheck.");
      qc.invalidateQueries({ queryKey: ["verification", "me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const walletAddress = wallet?.address ?? null;
  const status = (verification?.status ?? "pending") as Status;
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;

  const fvLinkMut = useMutation({
    mutationFn: () => getFvLink(),
    onSuccess: ({ url }) => {
      qc.invalidateQueries({ queryKey: ["verification", "me"] });
      // Pop in a new tab so the user can come back to recheck
      window.open(url, "_blank", "noopener,noreferrer");
    },
    onError: (e: Error) => toast.error(e.message),
  });




  const isBusy = walletLoading || ensureWalletMut.isPending || verLoading;

  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 p-6 backdrop-blur-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg border border-border/60 bg-background text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="font-medium">GoodDollar identity</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Sybil-resistant Face Verification. Re-verify every {verification?.expires_at ? "few" : "4"} days.
            </p>
          </div>
        </div>
        <Badge variant="outline" className={`gap-1.5 ${meta.className}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          {meta.label}
        </Badge>
      </div>

      {isBusy ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {ensureWalletMut.isPending ? "Provisioning your Celo wallet…" : "Loading…"}
        </div>
      ) : !walletAddress ? (
        <div className="mt-6 text-sm text-muted-foreground">
          Wallet provisioning failed. Please reload the page.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {verification?.expires_at && status === "verified" && (
            <div className="text-xs text-muted-foreground">
              Expires {new Date(verification.expires_at).toLocaleString()}
            </div>
          )}
          {verification?.last_checked_at && (
            <div className="text-xs text-muted-foreground">
              Last checked {new Date(verification.last_checked_at).toLocaleString()}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1"
              onClick={() => fvLinkMut.mutate()}
              disabled={fvLinkMut.isPending}
            >
              {fvLinkMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              {status === "verified" ? "Re-verify on GoodDollar" : "Verify with Face ID"}
            </Button>

            <Button
              type="button"
              className="h-11 flex-1"
              onClick={() => refreshMut.mutate()}
              disabled={refreshMut.isPending}
            >
              {refreshMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Recheck status
            </Button>
          </div>

          {/* Start verification button if no row exists yet */}
          {!verification && (
            <Button
              variant="secondary"
              className="h-11 w-full"
              onClick={() => startMut.mutate()}
              disabled={startMut.isPending}
            >
              {startMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Start verification
            </Button>
          )}
        </div>
      )}

    </div>
  );
}
