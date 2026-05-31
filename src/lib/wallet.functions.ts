import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateCeloWallet } from "./wallet.server";

export const getMyWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("wallets")
      .select("id, user_id, address, created_at, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const getOrCreateWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Try to fetch existing wallet
    const { data: existing, error: fetchErr } = await supabase
      .from("wallets")
      .select("id, user_id, address, created_at, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (existing?.address) {
      return existing;
    }

    // Generate new Celo wallet
    const bundle = generateCeloWallet();

    // Upsert wallet row (insert if not exists, update if exists but empty)
    const { data: row, error: upErr } = await supabase
      .from("wallets")
      .upsert(
        {
          user_id: userId,
          address: bundle.address,
          encrypted_private_key: bundle.encryptedPrivateKey,
        },
        { onConflict: "user_id" }
      )
      .select("id, user_id, address, created_at, updated_at")
      .single();
    if (upErr) throw new Error(upErr.message);
    return row;
  });
