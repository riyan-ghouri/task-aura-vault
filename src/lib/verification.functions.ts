import { createServerFn } from "@tanstack/react-start";
import { getRequestHost, getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkGoodDollarStatus, normalizeCeloAddress } from "./gooddollar.server";
import { buildGoodDollarFVLink } from "./gooddollar-fv.server";
import { revealPrivateKey } from "./wallet.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PROVIDER = "gooddollar";

async function creditVerificationBonusIfNeeded(userId: string) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("verification_bonus_credited")
    .eq("id", userId)
    .maybeSingle();
  if (!data || data.verification_bonus_credited) return;
  await supabaseAdmin
    .from("profiles")
    .update({ verification_bonus_credited: true })
    .eq("id", userId);
}


function deriveStatus(
  whitelisted: boolean,
  expiresAt: string | null,
): { status: "pending" | "verified" | "expired"; verified_at: string | null; expires_at: string | null } {
  if (!whitelisted) {
    return { status: "pending", verified_at: null, expires_at: null };
  }
  const now = Date.now();
  if (expiresAt && new Date(expiresAt).getTime() < now) {
    return { status: "expired", verified_at: null, expires_at: expiresAt };
  }
  return { status: "verified", verified_at: new Date().toISOString(), expires_at: expiresAt };
}

async function getWalletAddress(supabase: any, userId: string): Promise<string> {
  const { data: wallet, error } = await supabase
    .from("wallets")
    .select("address")
    .eq("user_id", userId)
    .single();
  if (error || !wallet?.address) {
    throw new Error("No auto-provisioned wallet found. Please reload the page.");
  }
  return normalizeCeloAddress(wallet.address);
}

export const getMyVerification = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("verifications")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", PROVIDER)
      .maybeSingle();
    if (error) throw new Error(error.message);

    // Recompute "expired" on the fly for the UI
    if (data && data.status === "verified" && data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      return { ...data, status: "expired" as const };
    }
    return data;
  });

export const startVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const address = await getWalletAddress(supabase, userId);

    const { data: row, error } = await supabase
      .from("verifications")
      .upsert(
        {
          user_id: userId,
          provider: PROVIDER,
          wallet_address: address,
          status: "pending",
        },
        { onConflict: "user_id,provider" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const refreshVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: existing, error: fetchErr } = await supabase
      .from("verifications")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", PROVIDER)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);

    const address = await getWalletAddress(supabase, userId);

    let verificationId: string;
    let previousWallet: string | null = null;

    if (!existing) {
      // Create verification row if missing
      const { data: created, error: insErr } = await supabase
        .from("verifications")
        .insert({
          user_id: userId,
          provider: PROVIDER,
          wallet_address: address,
          status: "pending",
        })
        .select()
        .single();
      if (insErr) throw new Error(insErr.message);
      verificationId = created.id;
    } else {
      verificationId = existing.id;
      previousWallet = existing.wallet_address;
    }

    // Sync wallet address if it changed
    if (previousWallet && previousWallet.toLowerCase() !== address.toLowerCase()) {
      await supabase.from("verifications").update({ wallet_address: address }).eq("id", verificationId);
    }

    const onchain = await checkGoodDollarStatus(address);
    const derived = deriveStatus(onchain.isWhitelisted, onchain.expiresAt);

    const { data: updated, error: upErr } = await supabase
      .from("verifications")
      .update({
        status: derived.status,
        verified_at: derived.verified_at ?? existing?.verified_at ?? null,
        expires_at: derived.expires_at,
        last_checked_at: new Date().toISOString(),
        raw: JSON.parse(JSON.stringify(onchain)),
      })
      .eq("id", verificationId)
      .select()
      .single();
    if (upErr) throw new Error(upErr.message);
    if (derived.status === "verified") {
      await creditVerificationBonusIfNeeded(userId);
    }
    return updated;
  });

export const getFaceVerificationLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: wallet, error } = await supabase
      .from("wallets")
      .select("address, encrypted_private_key")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!wallet?.encrypted_private_key) {
      throw new Error("Wallet not provisioned yet. Please reload the page.");
    }

    // Derive callback URL from the current request host
    const proto = getRequestHeader("x-forwarded-proto") ?? "https";
    const host = getRequestHost();
    const callbackUrl = `${proto}://${host}/fv-callback`;

    const privateKey = revealPrivateKey(wallet.encrypted_private_key);
    const url = await buildGoodDollarFVLink(privateKey, callbackUrl);

    // Mark verification as pending so the UI reflects intent
    await supabase
      .from("verifications")
      .upsert(
        {
          user_id: userId,
          provider: PROVIDER,
          wallet_address: normalizeCeloAddress(wallet.address!),
          status: "pending",
        },
        { onConflict: "user_id,provider" },
      );

    return { url };
  });

