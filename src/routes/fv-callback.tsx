import { useEffect, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshVerification } from "@/lib/verification.functions";

export const Route = createFileRoute("/fv-callback")({
  component: FaceVerificationCallback,
  head: () => ({
    meta: [
      { title: "Face Verification Result | Veritask" },
      { name: "description", content: "Veritask face verification callback page — completes the GoodDollar identity check that unlocks payouts." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function FaceVerificationCallback() {
  const navigate = useNavigate();
  const refresh = useServerFn(refreshVerification);

  const { verified, address, error } = useMemo(() => {
    if (typeof window === "undefined") return { verified: null as boolean | null, address: null, error: null };
    const params = new URLSearchParams(window.location.search);
    const v = params.get("verified");
    return {
      verified: v === null ? null : v === "true",
      address: params.get("address"),
      error: params.get("error"),
    };
  }, []);

  const refreshMut = useMutation({
    mutationFn: () => refresh(),
  });

  useEffect(() => {
    // Always pull on-chain truth once we land here
    refreshMut.mutate();
  }, []);

  const success = verified === true || refreshMut.data?.status === "verified";

  return (
    <div className="min-h-screen bg-background page-backdrop">
      <main className="container mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
        <div
          className={[
            "grid h-16 w-16 place-items-center rounded-2xl border",
            success
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
              : verified === false
                ? "border-red-500/30 bg-red-500/10 text-red-600"
                : "border-border/60 bg-muted/30 text-muted-foreground",
          ].join(" ")}
        >
          {refreshMut.isPending ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : success ? (
            <CheckCircle2 className="h-7 w-7" />
          ) : verified === false ? (
            <ShieldAlert className="h-7 w-7" />
          ) : (
            <ShieldCheck className="h-7 w-7" />
          )}
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          {refreshMut.isPending
            ? "Confirming your verification…"
            : success
              ? "You're verified"
              : verified === false
                ? "Verification didn't complete"
                : "Verification status"}
        </h1>

        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {success ? (
            "Your GoodDollar Face Verification is confirmed on-chain. You can now claim rewards and complete tasks."
          ) : verified === false ? (
            <>We couldn't confirm your verification{error ? <>: <span className="font-mono">{error}</span></> : "."}{" "}Please try again from your dashboard.</>
          ) : (
            "We're checking the Celo network for your latest verification status."
          )}
        </p>

        {address && (
          <p className="mt-3 break-all font-mono text-xs text-muted-foreground">{address}</p>
        )}

        <div className="mt-8 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild className="flex-1">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
          {!success && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => refreshMut.mutate()}
              disabled={refreshMut.isPending}
            >
              {refreshMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Recheck status
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
