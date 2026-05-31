import * as React from "react";
import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ShieldCheck,
  Menu,
  LayoutDashboard,
  ListChecks,
  User,
  Wallet,
  LogIn,
  UserPlus,
  LogOut,
  Shield,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  hash?: string;
}

const authNavItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/referrals", label: "Referrals", icon: Gift },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/withdrawal", label: "Withdrawal", icon: Wallet },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, loading } = useAuth();
  const { isAdmin } = useIsAdmin();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [streak, setStreak] = useState(0);

  React.useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem("vt_streak_v1");
      if (raw) {
        const d = JSON.parse(raw) as { streak: number };
        setStreak(d.streak || 0);
      }
    } catch {
      // ignore
    }
  }, [user, currentPath]);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    setOpen(false);
  }

  const isActive = (to: string, hash?: string) => {
    if (hash) return currentPath === to && routerState.location.hash === hash;
    return currentPath === to;
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link
          to="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-sm">
            <ShieldCheck className="h-4 w-4" />
          </span>
          VerifyTasks
        </Link>

        <div className="flex items-center gap-1">
          {user && streak > 0 && (
            <span
              className="hidden sm:inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success"
              title={`${streak}-day streak`}
            >
              🔥 {streak}
            </span>
          )}
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  VerifyTasks
                </SheetTitle>
              </SheetHeader>

              {loading ? (
                <div className="mt-6 flex items-center justify-center text-sm text-muted-foreground">
                  Loading…
                </div>
              ) : user ? (
                <nav
                  className="mt-6 flex flex-col gap-1"
                  role="navigation"
                  aria-label="Main navigation"
                >
                  {authNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.to, item.hash);
                    return (
                      <Link
                        key={item.label}
                        to={item.to}
                        hash={item.hash}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          active
                            ? "bg-accent text-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {item.label}
                      </Link>
                    );
                  })}

                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setOpen(false)}
                      aria-current={isActive("/admin") ? "page" : undefined}
                      className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isActive("/admin")
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <Shield className="h-4 w-4" aria-hidden="true" />
                      Admin
                    </Link>
                  )}

                  <Separator className="my-2" />

                  <div className="px-3 py-1 text-xs text-muted-foreground">
                    {user.email}
                  </div>
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                    onClick={signOut}
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign out
                  </Button>
                </nav>
              ) : (
                <nav
                  className="mt-6 flex flex-col gap-3"
                  role="navigation"
                  aria-label="Main navigation"
                >
                  <Link
                    to="/auth"
                    search={{ mode: "signin" }}
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                    Sign in
                  </Link>
                  <Link
                    to="/auth"
                    search={{ mode: "signup" }}
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <UserPlus className="h-4 w-4" aria-hidden="true" />
                    Get started
                  </Link>
                </nav>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
