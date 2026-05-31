import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, RefreshCw, ShieldAlert, Ban, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { banDevice } from "@/lib/screenshot.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/integrations/supabase/types";

type Submission = Database["public"]["Tables"]["task_submissions"]["Row"] & {
  tasks?: { title: string | null; platform: string | null } | null;
  _profile?: { display_name: string | null; email: string | null } | null;
};

function scoreColor(score: number | null): string {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score >= 61) return "bg-destructive/15 text-destructive border-destructive/30";
  if (score >= 31) return "bg-amber-500/15 text-amber-600 border-amber-500/30";
  return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
}

export function SubmissionsTab() {
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ url: string; sub: Submission } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Submission | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const banDeviceFn = useServerFn(banDevice);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("task_submissions")
      .select("*, tasks(title, platform)")
      .eq("status", "pending")
      .order("fraud_score", { ascending: false, nullsFirst: false })
      .order("submitted_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    const list = (data ?? []) as unknown as Submission[];
    const ids = Array.from(new Set(list.map((s) => s.user_id)));
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      for (const r of list) {
        const p = map.get(r.user_id);
        r._profile = p ? { display_name: p.display_name, email: p.email } : null;
      }
    }
    setRows(list);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("admin-submissions")
      .on("postgres_changes", { event: "*", schema: "public", table: "task_submissions" }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [load]);

  async function openPreview(sub: Submission) {
    if (!sub.proof_screenshot_path) {
      toast.error("Screenshot already cleaned up");
      return;
    }
    const { data, error } = await supabase.storage
      .from("task-proofs")
      .createSignedUrl(sub.proof_screenshot_path, 300);
    if (error || !data) { toast.error(error?.message ?? "No preview"); return; }
    setPreview({ url: data.signedUrl, sub });
  }

  async function approve(sub: Submission) {
    const { error } = await supabase
      .from("task_submissions")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", sub.id);
    if (error) return toast.error(error.message);
    if (sub.proof_screenshot_path) {
      await supabase.storage.from("task-proofs").remove([sub.proof_screenshot_path]).catch(() => {});
      await supabase.from("task_submissions").update({ proof_screenshot_path: null }).eq("id", sub.id);
    }
    toast.success("Approved");
    void load();
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    const note = rejectNote.trim().slice(0, 500);
    const { error } = await supabase
      .from("task_submissions")
      .update({ status: "rejected", reviewer_notes: note || "Rejected by admin", reviewed_at: new Date().toISOString() })
      .eq("id", rejectTarget.id);
    if (error) return toast.error(error.message);
    if (rejectTarget.proof_screenshot_path) {
      await supabase.storage.from("task-proofs").remove([rejectTarget.proof_screenshot_path]).catch(() => {});
      await supabase.from("task_submissions").update({ proof_screenshot_path: null }).eq("id", rejectTarget.id);
    }
    toast.success("Rejected");
    setRejectTarget(null);
    setRejectNote("");
    void load();
  }

  async function banDeviceFor(sub: Submission) {
    const fp = (sub.client_meta as { device_fp_hash?: string } | null)?.device_fp_hash;
    if (!fp) return toast.error("No device fingerprint on this submission");
    try {
      await banDeviceFn({ data: { deviceFpHash: fp, reason: `From submission ${sub.id}` } });
      toast.success("Device banned");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to ban device");
    }
  }

  async function requestReupload(sub: Submission) {
    const { error } = await supabase
      .from("task_submissions")
      .update({ reviewer_notes: "Please re-upload a clearer screenshot." })
      .eq("id", sub.id);
    if (error) return toast.error(error.message);
    if (sub.proof_screenshot_path) {
      await supabase.storage.from("task-proofs").remove([sub.proof_screenshot_path]).catch(() => {});
      await supabase.from("task_submissions").update({ proof_screenshot_path: null }).eq("id", sub.id);
    }
    toast.success("Re-upload requested");
    void load();
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading submissions…</div>;
  if (rows.length === 0) return <div className="text-sm text-muted-foreground">No pending submissions.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{rows.length} pending · sorted by fraud score</p>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {rows.map((sub) => {
          const reasons = Array.isArray(sub.fraud_reasons) ? (sub.fraud_reasons as Array<{ code: string; detail: string }>) : [];
          const sim = (sub.client_meta as { best_phash_similarity?: number } | null)?.best_phash_similarity;
          return (
            <div key={sub.id} className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{sub.tasks?.title ?? "Unknown task"}</span>
                    {sub.tasks?.platform && <Badge variant="outline" className="text-[10px]">{sub.tasks.platform}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {sub._profile?.display_name ?? sub._profile?.email ?? sub.user_id.slice(0, 8)}
                    {" · "}
                    {new Date(sub.submitted_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={scoreColor(sub.fraud_score)}>
                    <ShieldAlert className="mr-1 h-3 w-3" /> Fraud {sub.fraud_score ?? 0}
                  </Badge>
                  {sub.auto_decision && <Badge variant="outline" className="text-[10px]">{sub.auto_decision}</Badge>}
                  {typeof sim === "number" && sim > 0 && (
                    <Badge variant="outline" className="text-[10px]">pHash sim {(sim * 100).toFixed(0)}%</Badge>
                  )}
                </div>
              </div>

              {reasons.length > 0 && (
                <ul className="ml-5 list-disc text-xs text-muted-foreground">
                  {reasons.map((r, i) => <li key={i}>{r.detail}</li>)}
                </ul>
              )}

              {sub.ocr_text && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">OCR text ({sub.ocr_text.length} chars)</summary>
                  <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-muted/40 p-2">{sub.ocr_text}</pre>
                </details>
              )}

              {sub.proof_text && (
                <p className="text-xs"><span className="text-muted-foreground">User note:</span> {sub.proof_text}</p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {sub.proof_screenshot_path && (
                  <Button size="sm" variant="outline" onClick={() => void openPreview(sub)}>
                    <ImageIcon className="mr-1.5 h-3.5 w-3.5" /> View
                  </Button>
                )}
                <Button size="sm" onClick={() => void approve(sub)}>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => { setRejectTarget(sub); setRejectNote(""); }}>
                  <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
                </Button>
                <Button size="sm" variant="outline" onClick={() => void requestReupload(sub)}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Request re-upload
                </Button>
                <Button size="sm" variant="outline" onClick={() => void banDeviceFor(sub)}>
                  <Ban className="mr-1.5 h-3.5 w-3.5" /> Ban device
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!preview} onOpenChange={(v) => { if (!v) setPreview(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Screenshot preview</DialogTitle></DialogHeader>
          {preview && <img src={preview.url} alt="Submission" className="max-h-[70vh] w-full object-contain rounded" />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={(v) => { if (!v) setRejectTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Reject submission</DialogTitle></DialogHeader>
          <Textarea
            placeholder="Reason (visible to the user)"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value.slice(0, 500))}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void confirmReject()}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}