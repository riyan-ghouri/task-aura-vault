import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import type { Database } from "@/integrations/supabase/types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
type Platform = Database["public"]["Enums"]["task_platform"];
type ProofType = Database["public"]["Enums"]["task_proof_type"];

const PLATFORMS: Platform[] = ["instagram", "tiktok", "facebook", "youtube", "website"];
const PROOF_TYPES: ProofType[] = ["screenshot", "link", "auto"];

type FormState = {
  id?: string;
  title: string;
  description: string;
  platform: Platform;
  action: string;
  target_url: string;
  reward_cusd: string;
  cooldown_hours: string;
  proof_type: ProofType;
  proof_instructions: string;
  is_active: boolean;
  verification_code: string;
  required_keywords: string;
  min_image_width: string;
  min_image_height: string;
};

const empty: FormState = {
  title: "",
  description: "",
  platform: "instagram",
  action: "follow",
  target_url: "",
  reward_cusd: "0.10",
  cooldown_hours: "24",
  proof_type: "screenshot",
  proof_instructions: "",
  is_active: true,
  verification_code: "",
  required_keywords: "",
  min_image_width: "480",
  min_image_height: "480",
};

export function TasksTab() {
  const [rows, setRows] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as Task[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm(empty);
    setOpen(true);
  }

  function openEdit(t: Task) {
    setForm({
      id: t.id,
      title: t.title,
      description: t.description ?? "",
      platform: t.platform,
      action: t.action,
      target_url: t.target_url,
      reward_cusd: String(t.reward_cusd),
      cooldown_hours: String(t.cooldown_hours),
      proof_type: t.proof_type,
      proof_instructions: t.proof_instructions ?? "",
      is_active: t.is_active,
      verification_code: t.verification_code ?? "",
      required_keywords: (t.required_keywords ?? []).join(", "),
      min_image_width: String(t.min_image_width ?? 480),
      min_image_height: String(t.min_image_height ?? 480),
    });
    setOpen(true);
  }

  async function save() {
    const reward = Number(form.reward_cusd);
    const cooldown = Number(form.cooldown_hours);
    const minW = Number(form.min_image_width);
    const minH = Number(form.min_image_height);
    if (!form.title.trim()) return toast.error("Title required");
    if (!form.target_url.trim()) return toast.error("Target URL required");
    if (!Number.isFinite(reward) || reward < 0) return toast.error("Invalid reward");
    if (!Number.isFinite(cooldown) || cooldown < 0) return toast.error("Invalid cooldown");

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      platform: form.platform,
      action: form.action.trim() || "visit",
      target_url: form.target_url.trim(),
      reward_cusd: reward,
      cooldown_hours: Math.floor(cooldown),
      proof_type: form.proof_type,
      proof_instructions: form.proof_instructions.trim() || null,
      is_active: form.is_active,
      verification_code: form.verification_code.trim() || null,
      required_keywords: form.required_keywords
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      min_image_width: Number.isFinite(minW) && minW > 0 ? Math.floor(minW) : 480,
      min_image_height: Number.isFinite(minH) && minH > 0 ? Math.floor(minH) : 480,
    };

    setSaving(true);
    const { error } = form.id
      ? await supabase.from("tasks").update(payload).eq("id", form.id)
      : await supabase.from("tasks").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Task updated" : "Task created");
    setOpen(false);
    load();
  }

  async function toggleActive(t: Task) {
    const { error } = await supabase
      .from("tasks")
      .update({ is_active: !t.is_active })
      .eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success(!t.is_active ? "Task activated" : "Task paused");
    load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from("tasks").delete().eq("id", deleteTarget.id);
    if (error) return toast.error(error.message);
    toast.success("Task deleted");
    setDeleteTarget(null);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Tasks</h2>
          <p className="text-sm text-muted-foreground">Create and manage tasks shown to users.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> New task
          </Button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-2xl border border-border/60 bg-background/60 backdrop-blur-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Action</TableHead>
              <TableHead className="text-right">Reward</TableHead>
              <TableHead className="text-right">Cooldown</TableHead>
              <TableHead>Proof</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No tasks yet</TableCell></TableRow>
            ) : rows.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium max-w-[260px] truncate">{t.title}</TableCell>
                <TableCell className="capitalize">{t.platform}</TableCell>
                <TableCell className="capitalize">{t.action}</TableCell>
                <TableCell className="text-right">{Number(t.reward_cusd).toFixed(2)}</TableCell>
                <TableCell className="text-right">{t.cooldown_hours}h</TableCell>
                <TableCell className="capitalize">{t.proof_type}</TableCell>
                <TableCell>
                  {t.is_active
                    ? <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30" variant="outline">Active</Badge>
                    : <Badge variant="outline">Paused</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => toggleActive(t)} title={t.is_active ? "Pause" : "Activate"}>
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(t)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(t)} title="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {loading ? (
          <div className="rounded-xl border border-border/60 bg-background/60 p-6 text-center text-sm text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-background/60 p-6 text-center text-sm text-muted-foreground">No tasks yet</div>
        ) : rows.map((t) => (
          <div key={t.id} className="rounded-xl border border-border/60 bg-background/60 p-4 backdrop-blur-md">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{t.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground capitalize">
                  {t.platform} · {t.action} · {t.proof_type}
                </div>
              </div>
              {t.is_active
                ? <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 shrink-0" variant="outline">Active</Badge>
                : <Badge variant="outline" className="shrink-0">Paused</Badge>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-muted/40 p-2">
                <div className="text-muted-foreground">Reward</div>
                <div className="font-medium">{Number(t.reward_cusd).toFixed(2)} cUSD</div>
              </div>
              <div className="rounded-md bg-muted/40 p-2">
                <div className="text-muted-foreground">Cooldown</div>
                <div className="font-medium">{t.cooldown_hours}h</div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => toggleActive(t)}>
                <Power className="mr-1 h-3.5 w-3.5" /> {t.is_active ? "Pause" : "Activate"}
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(t)}>
                <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(t)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit task" : "New task"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="t-title">Title</Label>
              <Input id="t-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="t-desc">Description</Label>
              <Textarea id="t-desc" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label>Platform</Label>
              <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v as Platform }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="t-action">Action</Label>
              <Input id="t-action" value={form.action} onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))} placeholder="follow, like, subscribe..." />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="t-url">Target URL</Label>
              <Input id="t-url" type="url" value={form.target_url} onChange={(e) => setForm((f) => ({ ...f, target_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <Label htmlFor="t-reward">Reward (cUSD)</Label>
              <Input id="t-reward" type="number" step="0.01" min="0" value={form.reward_cusd} onChange={(e) => setForm((f) => ({ ...f, reward_cusd: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="t-cool">Cooldown (hours)</Label>
              <Input id="t-cool" type="number" min="0" value={form.cooldown_hours} onChange={(e) => setForm((f) => ({ ...f, cooldown_hours: e.target.value }))} />
            </div>
            <div>
              <Label>Proof type</Label>
              <Select value={form.proof_type} onValueChange={(v) => setForm((f) => ({ ...f, proof_type: v as ProofType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROOF_TYPES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex flex-col">
                <Label className="mb-2">Active</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="t-instructions">Proof instructions</Label>
              <Textarea id="t-instructions" rows={2} value={form.proof_instructions} onChange={(e) => setForm((f) => ({ ...f, proof_instructions: e.target.value }))} placeholder="e.g. Screenshot your follow with the username visible." />
            </div>
            <div>
              <Label htmlFor="t-code">Verification code (optional)</Label>
              <Input id="t-code" value={form.verification_code} onChange={(e) => setForm((f) => ({ ...f, verification_code: e.target.value }))} placeholder="VT-1234" />
            </div>
            <div>
              <Label htmlFor="t-keywords">Required keywords (comma-sep)</Label>
              <Input id="t-keywords" value={form.required_keywords} onChange={(e) => setForm((f) => ({ ...f, required_keywords: e.target.value }))} placeholder="veritask, followed" />
            </div>
            <div>
              <Label htmlFor="t-mw">Min image width</Label>
              <Input id="t-mw" type="number" min="0" value={form.min_image_width} onChange={(e) => setForm((f) => ({ ...f, min_image_width: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="t-mh">Min image height</Label>
              <Input id="t-mh" type="number" min="0" value={form.min_image_height} onChange={(e) => setForm((f) => ({ ...f, min_image_height: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : form.id ? "Save changes" : "Create task"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete task?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete <span className="font-medium text-foreground">{deleteTarget?.title}</span>. Submissions referencing it will remain but the task will no longer be visible to users.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}