import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { encrypt } from "./crypto.server";
import { deriveAddressFromKey, getAdminBalances, normalizeHexKey } from "./bsc.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admin access required");
}

export const getAdminWalletInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    return getAdminBalances();
  });

export const setAdminWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { privateKey: string }) => {
    if (!input || typeof input.privateKey !== "string") throw new Error("Missing private key");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const pk = normalizeHexKey(data.privateKey);
    const address = deriveAddressFromKey(pk);
    const encrypted = encrypt(pk);
    const { error } = await supabaseAdmin
      .from("admin_wallets")
      .upsert(
        {
          id: "default",
          address,
          encrypted_private_key: encrypted,
          updated_at: new Date().toISOString(),
          updated_by: context.userId,
        },
        { onConflict: "id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true, address };
  });