import { createServerFn } from "@tanstack/react-start";
import { isAddress } from "viem";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendUsdtBep20 } from "./bsc.server";

async function getSetting(key: string, fallback: number): Promise<number> {
  const { data } = await supabaseAdmin.from("app_settings").select("value").eq("key", key).maybeSingle();
  const v = data?.value as unknown;
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : Number(v as never);
  return Number.isFinite(n) ? n : fallback;
}

export interface WithdrawalEligibility {
  balance: number;
  signupBonus: number;
  bonusCredited: boolean;
  firstAutoDone: boolean;
  approvedTasks: number;
  minTasks: number;
  minWithdrawal: number;
  firstWithdrawalAmount: number;
  verified: boolean;
}

export const getWithdrawalEligibility = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WithdrawalEligibility> => {
    const { userId } = context;
    const [
      signupBonus,
      firstWithdrawalAmount,
      minWithdrawal,
      minTasks,
    ] = await Promise.all([
      getSetting("signup_bonus_usdt", 0.05),
      getSetting("first_withdrawal_amount_usdt", 0.05),
      getSetting("min_withdrawal_usdt", 1),
      getSetting("min_tasks_for_withdrawal", 100),
    ]);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("verification_bonus_credited, first_auto_withdrawal_done")
      .eq("id", userId)
      .maybeSingle();

    const { data: verif } = await supabaseAdmin
      .from("verifications")
      .select("status, expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    const now = Date.now();
    const verified =
      verif?.status === "verified" &&
      (!verif.expires_at || new Date(verif.expires_at).getTime() > now);

    const { data: subs } = await supabaseAdmin
      .from("task_submissions")
      .select("status, reward_cusd")
      .eq("user_id", userId);
    const approvedTasks = (subs ?? []).filter((s) => s.status === "approved").length;
    const earned = (subs ?? [])
      .filter((s) => s.status === "approved")
      .reduce((a, s) => a + Number(s.reward_cusd || 0), 0);

    const { data: wds } = await supabaseAdmin
      .from("withdrawals")
      .select("amount_cusd, status")
      .eq("user_id", userId);
    const reserved = (wds ?? [])
      .filter((w) => w.status !== "rejected")
      .reduce((a, w) => a + Number(w.amount_cusd || 0), 0);

    const bonusCredited = !!profile?.verification_bonus_credited;
    const bonusContribution = bonusCredited ? signupBonus : 0;
    const balance = +(earned + bonusContribution - reserved).toFixed(8);

    return {
      balance,
      signupBonus,
      bonusCredited,
      firstAutoDone: !!profile?.first_auto_withdrawal_done,
      approvedTasks,
      minTasks,
      minWithdrawal,
      firstWithdrawalAmount,
      verified: !!verified,
    };
  });

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { amount: number; walletAddress: string }) => {
    if (!input) throw new Error("Missing input");
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");
    const walletAddress = String(input.walletAddress || "").trim();
    if (!isAddress(walletAddress)) throw new Error("Invalid BEP20 (BNB Smart Chain) address");
    return { amount, walletAddress };
  })
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { amount, walletAddress } = data;

    // Banned check
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_banned, verification_bonus_credited, first_auto_withdrawal_done")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Profile not found");
    if (profile.is_banned) throw new Error("Your account is suspended");

    // Eligibility (recomputed server-side)
    const [signupBonus, firstAmt, minWd, minTasks] = await Promise.all([
      getSetting("signup_bonus_usdt", 0.05),
      getSetting("first_withdrawal_amount_usdt", 0.05),
      getSetting("min_withdrawal_usdt", 1),
      getSetting("min_tasks_for_withdrawal", 100),
    ]);

    const { data: subs } = await supabaseAdmin
      .from("task_submissions")
      .select("status, reward_cusd")
      .eq("user_id", userId);
    const approvedTasks = (subs ?? []).filter((s) => s.status === "approved").length;
    const earned = (subs ?? [])
      .filter((s) => s.status === "approved")
      .reduce((a, s) => a + Number(s.reward_cusd || 0), 0);

    const { data: wds } = await supabaseAdmin
      .from("withdrawals")
      .select("amount_cusd, status")
      .eq("user_id", userId);
    const reserved = (wds ?? [])
      .filter((w) => w.status !== "rejected")
      .reduce((a, w) => a + Number(w.amount_cusd || 0), 0);

    const bonusContribution = profile.verification_bonus_credited ? signupBonus : 0;
    const balance = +(earned + bonusContribution - reserved).toFixed(8);

    if (amount > balance + 1e-9) throw new Error("Amount exceeds available balance");

    const isFirstAuto = !profile.first_auto_withdrawal_done;

    if (isFirstAuto) {
      // The one-time instant payout — must match the configured first amount
      if (Math.abs(amount - firstAmt) > 1e-9) {
        throw new Error(`Your first withdrawal must be exactly ${firstAmt} USDT`);
      }
      if (!profile.verification_bonus_credited) {
        throw new Error("Complete verification first to unlock your bonus payout");
      }

      // Insert pending row, then attempt broadcast
      const { data: row, error: insErr } = await supabaseAdmin
        .from("withdrawals")
        .insert({
          user_id: userId,
          amount_cusd: amount,
          wallet_address: walletAddress,
          status: "pending",
          is_auto: true,
        })
        .select()
        .single();
      if (insErr || !row) throw new Error(insErr?.message || "Could not create withdrawal");

      try {
        const { txHash } = await sendUsdtBep20(walletAddress, amount);
        await supabaseAdmin
          .from("withdrawals")
          .update({
            status: "completed",
            tx_hash: txHash,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        await supabaseAdmin
          .from("profiles")
          .update({ first_auto_withdrawal_done: true })
          .eq("id", userId);
        return { ok: true as const, auto: true as const, txHash, withdrawalId: row.id };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Broadcast failed";
        // Hot wallet not funded or transient RPC failure — keep the withdrawal
        // queued as pending so it auto-completes once the wallet is funded.
        // Do NOT surface internal wallet status to the user.
        await supabaseAdmin
          .from("withdrawals")
          .update({ error: msg })
          .eq("id", row.id);
        await supabaseAdmin
          .from("profiles")
          .update({ first_auto_withdrawal_done: true })
          .eq("id", userId);
        return { ok: true as const, auto: true as const, queued: true as const, withdrawalId: row.id };
      }
    }

    // Subsequent withdrawals — manual admin approval
    if (amount < minWd - 1e-9) {
      throw new Error(`Minimum withdrawal is ${minWd} USDT`);
    }
    if (approvedTasks < minTasks) {
      throw new Error(`You need ${minTasks} approved tasks to withdraw (you have ${approvedTasks})`);
    }

    const { data: row, error: insErr } = await supabaseAdmin
      .from("withdrawals")
      .insert({
        user_id: userId,
        amount_cusd: amount,
        wallet_address: walletAddress,
        status: "pending",
        is_auto: false,
      })
      .select()
      .single();
    if (insErr || !row) throw new Error(insErr?.message || "Could not create withdrawal");

    return { ok: true as const, auto: false as const, withdrawalId: row.id };
  });

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admin access required");
}

/**
 * Processes any pending auto-payout withdrawals (typically first 0.05 USDT
 * payouts that were queued because the hot wallet had no funds yet).
 * Safe to call repeatedly; stops on the first send failure for a row.
 */
export const retryPendingAutoWithdrawals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: rows } = await supabaseAdmin
      .from("withdrawals")
      .select("id, user_id, amount_cusd, wallet_address")
      .eq("status", "pending")
      .eq("is_auto", true)
      .order("requested_at", { ascending: true })
      .limit(50);

    let processed = 0;
    const failures: string[] = [];
    for (const row of rows ?? []) {
      try {
        const { txHash } = await sendUsdtBep20(row.wallet_address, Number(row.amount_cusd));
        await supabaseAdmin
          .from("withdrawals")
          .update({
            status: "completed",
            tx_hash: txHash,
            error: null,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        processed += 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Broadcast failed";
        await supabaseAdmin.from("withdrawals").update({ error: msg }).eq("id", row.id);
        failures.push(msg);
        // Likely still under-funded; stop to avoid hammering RPC
        break;
      }
    }
    return { ok: true as const, processed, queued: (rows?.length ?? 0) - processed, failures };
  });