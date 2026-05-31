import { useRef, useState } from "react";
import { Loader2, Upload, CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { submitVerifiedProof } from "@/lib/screenshot.functions";
import { preprocessScreenshot, type PreprocessStep } from "@/lib/screenshot/preprocess";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/integrations/supabase/types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];

const STEP_LABELS: Record<PreprocessStep, string> = {
  reading: "Reading file",
  decoding: "Decoding image",
  compressing: "Compressing",
  hashing: "Computing fingerprint",
  ocr: "Reading screenshot text",
  fingerprint: "Capturing device info",
  done: "Pre-checks complete",
};
const STEP_ORDER: PreprocessStep[] = ["reading", "decoding", "compressing", "hashing", "ocr", "fingerprint", "done"];

interface Props {
  task: Task;
  userId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmitted: () => void;
}

export function SubmitProofDialog({ task, userId, open, onOpenChange, onSubmitted }: Props) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<PreprocessStep | null>(null);
  const [stepPct, setStepPct] = useState(0);
  const [rejection, setRejection] = useState<{ reasons: string[]; score: number } | null>(null);
  const [success, setSuccess] = useState<{ decision: string; score: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const submitProof = useServerFn(submitVerifiedProof);

  function reset() {
    setText("");
    setFile(null);
    setStep(null);
    setStepPct(0);
    setRejection(null);
    setSuccess(null);
  }

  function handleFile(f: File | null) {
    if (!f) return setFile(null);
    if (!ALLOWED_MIME.includes(f.type)) {
      toast.error("Only PNG, JPG, or WebP images allowed");
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      toast.error("Screenshot must be 5 MB or less");
      return;
    }
    setRejection(null);
    setSuccess(null);
    setFile(f);
  }

  async function submit() {
    setRejection(null);
    setSuccess(null);
    setBusy(true);
    abortRef.current = new AbortController();
    try {
      if (task.proof_type === "screenshot") {
        if (!file) {
          toast.error("Please attach a screenshot");
          setBusy(false);
          return;
        }

        // 1. Browser-side preprocessing (hash, pHash, OCR, fingerprint)
        const report = await preprocessScreenshot(
          file,
          (s, pct) => { setStep(s); setStepPct(pct); },
          { signal: abortRef.current.signal },
        );

        // 2. Upload the re-encoded WebP
        const path = `${userId}/${task.id}/${Date.now()}.webp`;
        const { error: upErr } = await supabase.storage
          .from("task-proofs")
          .upload(path, report.blob, { contentType: "image/webp", upsert: false });
        if (upErr) throw upErr;

        // 3. Server verification + insert
        setStep("done");
        setStepPct(1);
        const verdict = await submitProof({
          data: {
            taskId: task.id,
            storagePath: path,
            proofText: text.trim() || "",
            clientReport: {
              sha256: report.sha256,
              phashHex: report.phashHex,
              width: report.width,
              height: report.height,
              bytes: report.bytes,
              mime: "image/webp",
              ocrText: report.ocrText,
              ocrConfidence: report.ocrConfidence,
              clientMeta: report.clientMeta,
            },
          },
        });

        if (verdict.decision === "rejected") {
          setRejection({ reasons: verdict.reasons.map((r) => r.detail), score: verdict.score });
          setBusy(false);
          // Allow user to re-upload
          setFile(null);
          onSubmitted();
          return;
        }

        setSuccess({ decision: verdict.decision, score: verdict.score });
        toast.success("Proof submitted — pending review");
        reset();
        onOpenChange(false);
        onSubmitted();
        return;
      }

      if (task.proof_type === "link") {
        const trimmed = text.trim();
        if (!trimmed) {
          toast.error("Please enter your username or link");
          setBusy(false);
          return;
        }
        if (trimmed.length > 500) {
          toast.error("Proof text must be 500 characters or less");
          setBusy(false);
          return;
        }
      }

      const { error } = await supabase.from("task_submissions").insert({
        user_id: userId,
        task_id: task.id,
        status: "pending",
        proof_text: text.trim() || null,
        proof_screenshot_path: null,
        reward_cusd: task.reward_cusd,
      });
      if (error) throw error;

      toast.success("Proof submitted — pending review");
      reset();
      onOpenChange(false);
      onSubmitted();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit proof");
    } finally {
      setBusy(false);
      setStep(null);
      setStepPct(0);
      abortRef.current = null;
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (busy) { abortRef.current?.abort(); return; }
      onOpenChange(v);
      if (!v) reset();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit proof</DialogTitle>
          <DialogDescription className="text-xs">
            {task.title} · Reward {Number(task.reward_cusd).toFixed(3)} cUSD
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {task.proof_instructions && (
            <p className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
              {task.proof_instructions}
            </p>
          )}

          {task.proof_type === "screenshot" && task.verification_code && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
              <p className="font-medium text-foreground">Required verification code</p>
              <p className="mt-0.5 font-mono text-sm text-primary">{task.verification_code}</p>
              <p className="mt-1 text-muted-foreground">This text must be visible in your screenshot.</p>
            </div>
          )}

          {task.proof_type === "screenshot" && (
            <div className="space-y-2">
              <Label htmlFor="proof-file">Screenshot (PNG, JPG, WebP · max 5 MB)</Label>
              <Input
                id="proof-file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                disabled={busy}
              />
              {file && (
                <p className="text-xs text-muted-foreground">
                  {file.name} · {(file.size / 1024).toFixed(0)} KB
                </p>
              )}
              <Label htmlFor="proof-note" className="pt-2">Notes (optional)</Label>
              <Textarea
                id="proof-note"
                placeholder="Anything the reviewer should know..."
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 500))}
                rows={2}
                disabled={busy}
              />
            </div>
          )}

          {task.proof_type === "link" && (
            <div className="space-y-2">
              <Label htmlFor="proof-text">Your username / profile link / comment URL</Label>
              <Textarea
                id="proof-text"
                placeholder="e.g. @myhandle or https://..."
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 500))}
                rows={3}
                disabled={busy}
              />
              <p className="text-xs text-muted-foreground">{text.length}/500</p>
            </div>
          )}

          {task.proof_type === "auto" && (
            <p className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
              This task is auto-verified. Click submit to record your completion — our tracker will confirm shortly.
            </p>
          )}

          {busy && step && task.proof_type === "screenshot" && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Anti-fraud verification
              </div>
              <ol className="space-y-1 text-xs">
                {STEP_ORDER.map((s) => {
                  const idx = STEP_ORDER.indexOf(s);
                  const cur = STEP_ORDER.indexOf(step);
                  const state = idx < cur ? "done" : idx === cur ? "active" : "pending";
                  return (
                    <li key={s} className="flex items-center gap-2">
                      {state === "done" && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                      {state === "active" && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                      {state === "pending" && <span className="h-3 w-3 rounded-full border border-border" />}
                      <span className={state === "pending" ? "text-muted-foreground" : ""}>
                        {STEP_LABELS[s]}{state === "active" && s === "ocr" && stepPct > 0 ? ` · ${Math.round(stepPct * 100)}%` : ""}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {rejection && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-destructive">
                <XCircle className="h-4 w-4" />
                Submission rejected (fraud score {rejection.score})
              </div>
              <ul className="ml-5 list-disc text-xs text-destructive/90">
                {rejection.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
              <p className="pt-1 text-xs text-muted-foreground">
                Please attach a different screenshot and try again.
              </p>
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs">
              <div className="flex items-center gap-2 font-medium text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Submitted for review
              </div>
              {success.decision === "review" && (
                <p className="mt-1 flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="h-3 w-3" /> Score {success.score} — flagged for closer admin review.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Submit proof
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
