import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { revealPrivateKey } from "./wallet.server";
import { encrypt } from "./crypto.server";
import { deriveAddressFromKey, normalizeHexKey } from "./bsc.server";

export type UserKeyRow = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  verification_status: "verified" | "pending" | "rejected" | "expired" | "none";
  wallet_address: string | null;
  private_key: string | null;
};

export type ListUserKeysResponse = {
  rows: UserKeyRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type SortBy = "email" | "verification_status" | "wallet_address";
export type SortDir = "asc" | "desc";
export type FilterStatus = "all" | "verified" | "unverified";

export const listUserKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { page?: number; pageSize?: number; sortBy?: SortBy; sortDir?: SortDir; filterStatus?: FilterStatus; searchQ?: string }) => input)
  .handler(async ({ data, context }): Promise<ListUserKeysResponse> => {
    const { userId } = context;
    const page = Math.max(1, data.page ?? 1);
    const pageSize = Math.min(100, Math.max(5, data.pageSize ?? 20));
    const sortBy = data.sortBy ?? "email";
    const sortDir = data.sortDir ?? "asc";
    const filterStatus = data.filterStatus ?? "all";
    const searchQ = (data.searchQ ?? "").trim().toLowerCase();

    // Double-check admin role (supabaseAdmin bypasses RLS below)
    const { data: roleRow, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!roleRow) throw new Error("Forbidden: admin only");

    const [{ data: profiles, error: pErr }, { data: wallets, error: wErr }, { data: vers, error: vErr }] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("id, email, display_name, created_at"),
        supabaseAdmin.from("wallets").select("user_id, address, encrypted_private_key"),
        supabaseAdmin.from("verifications").select("user_id, status, expires_at"),
      ]);
    if (pErr) throw new Error(pErr.message);
    if (wErr) throw new Error(wErr.message);
    if (vErr) throw new Error(vErr.message);

    const wMap = new Map<string, { address: string | null; encrypted_private_key: string | null }>();
    (wallets ?? []).forEach((w) => wMap.set(w.user_id, { address: w.address, encrypted_private_key: w.encrypted_private_key }));

    const vMap = new Map<string, { status: string; expires_at: string | null }>();
    (vers ?? []).forEach((v) => vMap.set(v.user_id, { status: v.status, expires_at: v.expires_at }));

    // Build rows
    let rows: UserKeyRow[] = (profiles ?? []).map((p) => {
      const w = wMap.get(p.id);
      const v = vMap.get(p.id);
      let verification_status: UserKeyRow["verification_status"] = "none";
      if (v) {
        if (v.status === "verified" && v.expires_at && new Date(v.expires_at) < new Date()) {
          verification_status = "expired";
        } else {
          verification_status = v.status as UserKeyRow["verification_status"];
        }
      }
      let privateKey: string | null = null;
      if (w?.encrypted_private_key) {
        try {
          privateKey = revealPrivateKey(w.encrypted_private_key);
        } catch {
          privateKey = null;
        }
      }
      return {
        user_id: p.id,
        email: p.email,
        display_name: p.display_name,
        verification_status,
        wallet_address: w?.address ?? null,
        private_key: privateKey,
      };
    });

    // Filter by status
    if (filterStatus === "verified") {
      rows = rows.filter((r) => r.verification_status === "verified");
    } else if (filterStatus === "unverified") {
      rows = rows.filter((r) => r.verification_status !== "verified");
    }

    // Search
    if (searchQ) {
      rows = rows.filter((r) =>
        (r.email ?? "").toLowerCase().includes(searchQ) ||
        (r.wallet_address ?? "").toLowerCase().includes(searchQ) ||
        (r.display_name ?? "").toLowerCase().includes(searchQ),
      );
    }

    // Sort
    const dir = sortDir === "desc" ? -1 : 1;
    rows.sort((a, b) => {
      let av: string | null;
      let bv: string | null;
      if (sortBy === "email") { av = a.email; bv = b.email; }
      else if (sortBy === "verification_status") { av = a.verification_status; bv = b.verification_status; }
      else if (sortBy === "wallet_address") { av = a.wallet_address; bv = b.wallet_address; }
      else { av = a.email; bv = b.email; }
      const aStr = (av ?? "").toLowerCase();
      const bStr = (bv ?? "").toLowerCase();
      if (aStr < bStr) return -1 * dir;
      if (aStr > bStr) return 1 * dir;
      return 0;
    });

    const total = rows.length;
    const start = (page - 1) * pageSize;
    const paginated = rows.slice(start, start + pageSize);

    return {
      rows: paginated,
      total,
      page,
      pageSize,
    };
  });

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

export const replaceUserWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; privateKey: string }) => {
    if (!input?.userId || typeof input.userId !== "string") throw new Error("Missing userId");
    if (!input?.privateKey || typeof input.privateKey !== "string") throw new Error("Missing private key");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const pk = normalizeHexKey(data.privateKey);
    const address = deriveAddressFromKey(pk);
    const encrypted = encrypt(pk);
    const { error } = await supabaseAdmin
      .from("wallets")
      .upsert(
        {
          user_id: data.userId,
          address,
          encrypted_private_key: encrypted,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true, address };
  });
