import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PHASH_REJECT_CROSS_USER = 6;
const PHASH_FLAG_SAME_USER = 10;

const ClientReportSchema = z.object({
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  phashHex: z.string().regex(/^[a-f0-9]{16}$/),
  width: z.number().int().min(1).max(20000),
  height: z.number().int().min(1).max(20000),
  bytes: z.number().int().min(1).max(8 * 1024 * 1024),
  mime: z.literal("image/webp"),
  ocrText: z.string().max(20000).default(""),
  ocrConfidence: z.number().min(0).max(100).default(0),
  clientMeta: z
    .object({
      ua: z.string().max(500),
      tz: z.string().max(100),
      lang: z.string().max(50),
      viewport: z.string().max(50),
      dpr: z.number(),
      screen: z.string().max(50),
      device_fp_hash: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .passthrough(),
});

const InputSchema = z.object({
  taskId: z.string().uuid(),
  storagePath: z.string().min(1).max(500),
  proofText: z.string().max(500).optional().default(""),
  clientReport: ClientReportSchema,
});

type FraudReason = { code: string; weight: number; detail: string };

// --- helpers ---

function magicBytesOk(bytes: Uint8Array): boolean {
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp =
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  return isPng || isJpg || isWebp;
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function phashHexToSignedBigInt(hex: string): string {
  let u = BigInt("0x" + hex);
  const MAX = 1n << 63n;
  if (u >= MAX) u -= 1n << 64n;
  return u.toString();
}

function phashSignedBigIntToHex(v: string | number | bigint): string {
  let b = typeof v === "bigint" ? v : BigInt(v as string);
  if (b < 0n) b += 1n << 64n;
  return b.toString(16).padStart(16, "0");
}

function hammingHex(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { d += x & 1; x >>= 1; }
  }
  return d;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let cur = [i, ...new Array(b.length).fill(0)];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let k = 0; k <= b.length; k++) prev[k] = cur[k];
  }
  return prev[b.length];
}

function fuzzyContains(haystack: string, needle: string, minSim = 0.85): boolean {
  const H = normalize(haystack);
  const N = normalize(needle);
  if (!N) return true;
  if (H.includes(N)) return true;
  // Sliding window of words roughly the length of the needle
  const tokens = H.split(" ");
  const needleTokens = N.split(" ").length;
  for (let i = 0; i <= tokens.length - needleTokens; i++) {
    const window = tokens.slice(i, i + needleTokens).join(" ");
    const dist = levenshtein(window, N);
    const sim = 1 - dist / Math.max(window.length, N.length);
    if (sim >= minSim) return true;
  }
  return false;
}

// --- main server fn ---

export const submitVerifiedProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const reasons: FraudReason[] = [];
    let score = 0;
    const addReason = (code: string, weight: number, detail: string) => {
      reasons.push({ code, weight, detail });
      score = Math.min(100, score + weight);
    };

    // 1. Load task
    const { data: task, error: taskErr } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", data.taskId)
      .maybeSingle();
    if (taskErr) throw new Error(taskErr.message);
    if (!task) throw new Error("Task not found");
    if (!task.is_active) throw new Error("Task is not active");
    if (task.expires_at && new Date(task.expires_at) < new Date()) {
      throw new Error("Task has expired");
    }

    const userIdStr = userId as string;

    // 2. Cooldown check
    if (task.cooldown_hours > 0) {
      const since = new Date(Date.now() - task.cooldown_hours * 3600_000).toISOString();
      const { count: recent } = await supabase
        .from("task_submissions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userIdStr)
        .eq("task_id", data.taskId)
        .in("status", ["pending", "approved"])
        .gte("submitted_at", since);
      if ((recent ?? 0) > 0) {
        await supabaseAdmin.storage.from("task-proofs").remove([data.storagePath]).catch(() => {});
        return { decision: "rejected" as const, score: 100, reasons: [{ code: "cooldown", weight: 100, detail: `You can only submit this task every ${task.cooldown_hours}h.` }], submissionId: null };
      }
    }

    // 3. Banned device check
    const fpHash = data.clientReport.clientMeta.device_fp_hash;
    const { data: banned } = await supabaseAdmin
      .from("banned_devices")
      .select("device_fp_hash")
      .eq("device_fp_hash", fpHash)
      .maybeSingle();
    if (banned) {
      await supabaseAdmin.storage.from("task-proofs").remove([data.storagePath]).catch(() => {});
      return { decision: "rejected" as const, score: 100, reasons: [{ code: "device_banned", weight: 100, detail: "This device is banned from submitting proofs." }], submissionId: null };
    }

    // 4. Download uploaded bytes & verify magic + sha
    const { data: dl, error: dlErr } = await supabaseAdmin.storage
      .from("task-proofs")
      .download(data.storagePath);
    if (dlErr || !dl) throw new Error("Uploaded file could not be read");
    const buf = await dl.arrayBuffer();
    const head = new Uint8Array(buf.slice(0, 12));
    if (!magicBytesOk(head)) {
      await supabaseAdmin.storage.from("task-proofs").remove([data.storagePath]).catch(() => {});
      return { decision: "rejected" as const, score: 100, reasons: [{ code: "bad_magic_bytes", weight: 100, detail: "Uploaded file is not a valid image." }], submissionId: null };
    }
    const serverSha = await sha256Hex(buf);
    if (serverSha !== data.clientReport.sha256) {
      await supabaseAdmin.storage.from("task-proofs").remove([data.storagePath]).catch(() => {});
      return { decision: "rejected" as const, score: 100, reasons: [{ code: "tamper", weight: 100, detail: "Uploaded image does not match its declared fingerprint." }], submissionId: null };
    }

    // 5. Dimension / size checks
    if (data.clientReport.width < task.min_image_width || data.clientReport.height < task.min_image_height) {
      addReason("resolution_too_low", 30, `Resolution ${data.clientReport.width}x${data.clientReport.height} below required ${task.min_image_width}x${task.min_image_height}.`);
    }
    const ar = data.clientReport.width / Math.max(1, data.clientReport.height);
    if (ar < 0.4 || ar > 3.0) addReason("aspect_ratio", 15, `Unusual aspect ratio ${ar.toFixed(2)}.`);

    // 6. Duplicate detection via submission_hashes
    const { data: exactMatch } = await supabaseAdmin
      .from("submission_hashes")
      .select("user_id, task_id")
      .eq("sha256", serverSha)
      .limit(5);
    if (exactMatch && exactMatch.length > 0) {
      const sameUser = exactMatch.some((r) => r.user_id === userIdStr);
      const otherUser = exactMatch.some((r) => r.user_id !== userIdStr);
      if (otherUser) {
        await supabaseAdmin.storage.from("task-proofs").remove([data.storagePath]).catch(() => {});
        return { decision: "rejected" as const, score: 100, reasons: [{ code: "duplicate_exact_cross_user", weight: 100, detail: "This exact screenshot was already submitted by another user." }], submissionId: null };
      }
      if (sameUser) {
        await supabaseAdmin.storage.from("task-proofs").remove([data.storagePath]).catch(() => {});
        return { decision: "rejected" as const, score: 100, reasons: [{ code: "duplicate_self", weight: 100, detail: "You have already submitted this exact screenshot." }], submissionId: null };
      }
    }

    // pHash near-duplicate scan within the same task
    const { data: candidates } = await supabaseAdmin
      .from("submission_hashes")
      .select("user_id, phash")
      .eq("task_id", data.taskId)
      .not("phash", "is", null)
      .order("created_at", { ascending: false })
      .limit(500);
    let bestSimilarity = 0;
    if (candidates) {
      for (const c of candidates) {
        if (c.phash == null) continue;
        const otherHex = phashSignedBigIntToHex(c.phash as unknown as string);
        const dist = hammingHex(otherHex, data.clientReport.phashHex);
        const sim = (64 - dist) / 64;
        if (sim > bestSimilarity) bestSimilarity = sim;
        if (dist <= PHASH_REJECT_CROSS_USER && c.user_id !== userIdStr) {
          await supabaseAdmin.storage.from("task-proofs").remove([data.storagePath]).catch(() => {});
          return {
            decision: "rejected" as const,
            score: 100,
            reasons: [{ code: "duplicate_phash_cross_user", weight: 100, detail: `Near-identical screenshot already submitted by another user (similarity ${(sim * 100).toFixed(1)}%).` }],
            submissionId: null,
          };
        }
        if (dist <= PHASH_FLAG_SAME_USER && c.user_id === userIdStr) {
          addReason("near_duplicate_self", 30, `Very similar to a previous submission of yours (similarity ${(sim * 100).toFixed(1)}%).`);
          break;
        }
      }
    }

    // 7. OCR keyword & verification_code check
    const matched: string[] = [];
    const missing: string[] = [];
    const required: string[] = [];
    if (task.verification_code && task.verification_code.length > 0) required.push(task.verification_code);
    for (const k of (task.required_keywords ?? [])) if (k && k.length > 0) required.push(k);

    for (const term of required) {
      const ok = fuzzyContains(data.clientReport.ocrText, term);
      if (ok) matched.push(term);
      else missing.push(term);
    }
    if (missing.length > 0 && required.length > 0) {
      // Hard fail on missing verification_code; soft-flag on missing keywords
      if (task.verification_code && missing.includes(task.verification_code)) {
        await supabaseAdmin.storage.from("task-proofs").remove([data.storagePath]).catch(() => {});
        return {
          decision: "rejected" as const,
          score: 100,
          reasons: [{ code: "missing_verification_code", weight: 100, detail: `Required verification code "${task.verification_code}" not visible in screenshot.` }],
          submissionId: null,
        };
      }
      addReason("missing_keywords", 25, `Missing required text: ${missing.join(", ")}.`);
    }

    // 8. Behavior signal: user's rejection ratio (last 30 days)
    const since30 = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
    const { data: history } = await supabase
      .from("task_submissions")
      .select("status")
      .eq("user_id", userIdStr)
      .gte("submitted_at", since30);
    if (history && history.length >= 3) {
      const rejected = history.filter((h) => h.status === "rejected").length;
      const ratio = rejected / history.length;
      if (ratio > 0.5) addReason("high_rejection_history", 20, `High rejection ratio (${Math.round(ratio * 100)}% over last 30 days).`);
    }

    // 9. Decide
    // Hard failures (duplicates, tamper, banned device, missing verification code,
    // cooldown) have already returned above. Anything that reaches here is queued
    // for admin review — high fraud scores are surfaced to the admin instead of
    // auto-rejecting, so legitimate users aren't locked out by false positives.
    const decision: "high_risk_review" | "review" | "low_risk" =
      score >= 61 ? "high_risk_review" : score >= 31 ? "review" : "low_risk";
    const status: "pending" = "pending";

    // 10. Insert submission
    const phashSigned = phashHexToSignedBigInt(data.clientReport.phashHex);
    // Postgres bigint round-trips through PostgREST as number-ish; types.ts
    // declares it as number, so we cast through unknown.
    const phashForDb = phashSigned as unknown as number;
    const insertPayload = {
      user_id: userIdStr,
      task_id: data.taskId,
      status,
      proof_text: data.proofText?.trim() || null,
      proof_screenshot_path: data.storagePath,
      reward_cusd: task.reward_cusd,
      image_sha256: serverSha,
      image_phash: phashForDb,
      image_width: data.clientReport.width,
      image_height: data.clientReport.height,
      image_bytes: data.clientReport.bytes,
      image_mime: data.clientReport.mime,
      ocr_text: data.clientReport.ocrText.slice(0, 20000),
      ocr_matched_keywords: matched,
      ocr_missing_keywords: missing,
      fraud_score: score,
      fraud_reasons: reasons,
      client_meta: { ...data.clientReport.clientMeta, ocr_confidence: data.clientReport.ocrConfidence, best_phash_similarity: bestSimilarity },
      auto_decision: decision,
      reviewed_at: null,
      reviewer_notes: null,
    };

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("task_submissions")
      .insert(insertPayload)
      .select("id")
      .single();
    if (insErr) {
      await supabaseAdmin.storage.from("task-proofs").remove([data.storagePath]).catch(() => {});
      throw new Error(insErr.message);
    }

    // 11. Index hashes (even for auto_reject, so future dupes still hit)
    await supabaseAdmin.from("submission_hashes").insert({
      submission_id: inserted.id,
      user_id: userIdStr,
      task_id: data.taskId,
      sha256: serverSha,
      phash: phashForDb,
    });

    return { decision, score, reasons, submissionId: inserted.id };
  });

// --- Admin: ban a device fingerprint ---

export const banDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      deviceFpHash: z.string().regex(/^[a-f0-9]{64}$/),
      reason: z.string().max(500).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId as string)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Admin only");
    const { error } = await supabaseAdmin
      .from("banned_devices")
      .upsert({ device_fp_hash: data.deviceFpHash, reason: data.reason ?? null, banned_by: userId as string }, { onConflict: "device_fp_hash" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });