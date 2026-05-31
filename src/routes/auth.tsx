import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ShieldCheck, Loader2, ArrowLeft, Timer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useServerFn } from "@tanstack/react-start";
import { requestSignupOtp, verifySignupOtpAndSignup } from "@/lib/signup-otp.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ThemeToggle } from "@/components/ThemeToggle";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  ref: z.string().trim().min(1).max(32).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in or Create Account | Veritask" },
      { name: "description", content: "Sign in to Veritask or create a free account to start earning USDT for completing verified social tasks." },
      { property: "og:title", content: "Sign in or Create Account | Veritask" },
      { property: "og:description", content: "Create a free account to start earning USDT for verified social tasks." },
      { property: "og:url", content: "https://task-aura-vault.lovable.app/auth" },
    ],
    links: [{ rel: "canonical", href: "https://task-aura-vault.lovable.app/auth" }],
  }),
});

const credSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [step, setStep] = useState<"creds" | "otp">("creds");
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [expiryLeft, setExpiryLeft] = useState(0);
  const reqOtp = useServerFn(requestSignupOtp);
  const verifyOtp = useServerFn(verifySignupOtpAndSignup);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const ms = expiresAt.getTime() - Date.now();
      setExpiryLeft(Math.max(0, Math.ceil(ms / 1000)));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setStep("creds");
    setOtp("");
    setExpiresAt(null);
    setExpiryLeft(0);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = credSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const result = await reqOtp({ data: { email: parsed.data.email, password: parsed.data.password } });
        toast.success("Verification code sent to your email.");
        setStep("otp");
        setResendIn(60);
        if (result.expires_at) {
          setExpiresAt(new Date(result.expires_at));
        } else {
          setExpiresAt(new Date(Date.now() + 5 * 60_000));
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        toast.success("Welcome back.");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    if (expiresAt && Date.now() > expiresAt.getTime()) {
      toast.error("Code expired. Please request a new one.");
      return;
    }
    setLoading(true);
    try {
      await verifyOtp({
        data: {
          email: email.trim().toLowerCase(),
          password,
          code: otp,
          referralCode: search.ref?.toUpperCase(),
        },
      });
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInErr) throw signInErr;
      toast.success("Account created.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function onResendOtp() {
    if (resendIn > 0) return;
    setLoading(true);
    try {
      const result = await reqOtp({ data: { email: email.trim().toLowerCase(), password } });
      toast.success("New code sent.");
      setResendIn(60);
      setOtp("");
      if (result.expires_at) {
        setExpiresAt(new Date(result.expires_at));
      } else {
        setExpiresAt(new Date(Date.now() + 5 * 60_000));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/dashboard`,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Google sign-in failed");
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/dashboard" });
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-20%] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      </div>
      <header className="relative z-10 flex items-center justify-between px-4 py-5">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
            <ShieldCheck className="h-4 w-4" />
          </span>
          VerifyTasks
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-col px-4 py-10">
        <div className="rounded-2xl border border-border/60 bg-background/70 p-6 shadow-xl backdrop-blur-xl md:p-8">
          {step === "otp" ? (
            <>
              <button
                type="button"
                onClick={() => { setStep("creds"); setOtp(""); setExpiresAt(null); setExpiryLeft(0); }}
                className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <h1 className="text-2xl font-semibold tracking-tight">Verify your email</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Enter the 6-digit code we sent to <span className="font-medium text-foreground">{email}</span>.
              </p>
              <form className="mt-6 space-y-4" onSubmit={onVerifyOtp}>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    autoFocus
                    disabled={expiryLeft <= 0 && !!expiresAt}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                      <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                      <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
                      <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
                      <InputOTPSlot index={4} className="h-12 w-12 text-lg" />
                      <InputOTPSlot index={5} className="h-12 w-12 text-lg" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {expiryLeft > 0 ? (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Code expires in</span>
                    <span className={`font-mono font-semibold tabular-nums ${expiryLeft <= 30 ? "text-destructive animate-pulse" : "text-foreground"}`}>
                      {Math.floor(expiryLeft / 60).toString().padStart(2, "0")}:{(expiryLeft % 60).toString().padStart(2, "0")}
                    </span>
                  </div>
                ) : expiresAt ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-center text-sm text-destructive">
                    Code expired. Please request a new one.
                  </div>
                ) : null}

                <Button
                  type="submit"
                  className="h-11 w-full"
                  disabled={loading || otp.length !== 6 || (expiryLeft <= 0 && !!expiresAt)}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Verify and create account
                </Button>
                <button
                  type="button"
                  onClick={onResendOtp}
                  disabled={resendIn > 0 || loading}
                  className="block w-full text-center text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {mode === "signin"
                  ? "Sign in to continue earning."
                  : "We'll email you a 6-digit code to verify."}
              </p>

          <Button
            type="button"
            variant="outline"
            className="mt-6 h-11 w-full"
            onClick={onGoogle}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="h-11"
                required
              />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Send verification code"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to VerifyTasks?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1S8.7 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.7 2.5 2.5 6.8 2.5 12s4.2 9.5 9.5 9.5c5.5 0 9.1-3.8 9.1-9.3 0-.6-.1-1.1-.2-1.5H12z"/>
    </svg>
  );
}
