import { useRouter, useRouterState } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { useMaintenance } from "@/hooks/useMaintenance";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";

const ALLOWED_PATHS = ["/admin", "/auth"];

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { enabled, reason, loading } = useMaintenance();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  if (loading || adminLoading) return <>{children}</>;

  const pathAllowed = ALLOWED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  if (!enabled || isAdmin || pathAllowed) return <>{children}</>;

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-background/60 backdrop-blur-md">
          <Wrench className="h-7 w-7 text-primary" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
          We'll be right back
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Veritask is undergoing scheduled maintenance. Your account, balance, and
          tasks are safe.
        </p>
        {reason.trim() && (
          <div className="mt-5 rounded-xl border border-border/60 bg-muted/30 p-4 text-left text-sm text-foreground">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              From the team
            </div>
            <p className="mt-1.5 whitespace-pre-wrap">{reason}</p>
          </div>
        )}
        <div className="mt-6">
          <Button onClick={() => router.invalidate()}>Check again</Button>
        </div>
      </div>
    </div>
  );
}