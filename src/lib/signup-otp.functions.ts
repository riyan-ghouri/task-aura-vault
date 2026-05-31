import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendOtpEmail } from "./gmail-smtp.server";

const RESEND_COOLDOWN_SEC = 60;
const OTP_TTL_MIN = 5;
const MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generate6Digit(): string {
  // Cryptographically random
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return (arr[0] % 1_000_000).toString().padStart(6, "0");
}

const requestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(72),
});

export const requestSignupOtp = createServerFn({ method: "POST" })
  .inputValidator((d) => requestSchema.parse(d))
  .handler(async ({ data }) => {
    const { email } = data;

    // Check if email already exists in auth
    const { data: existing, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw new Error(listErr.message);
    if (existing.users.some((u) => u.email?.toLowerCase() === email)) {
      throw new Error("An account with this email already exists.");
    }

    // Cooldown check
    const { data: prev } = await supabaseAdmin
      .from("signup_otps")
      .select("last_sent_at")
      .eq("email", email)
      .maybeSingle();
    if (prev?.last_sent_at) {
      const ageSec = (Date.now() - new Date(prev.last_sent_at).getTime()) / 1000;
      if (ageSec < RESEND_COOLDOWN_SEC) {
        throw new Error(`Please wait ${Math.ceil(RESEND_COOLDOWN_SEC - ageSec)}s before requesting another code.`);
      }
    }

    const code = generate6Digit();
    const expires_at = new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString();

    const { error: upErr } = await supabaseAdmin
      .from("signup_otps")
      .upsert({
        email,
        code_hash: hashCode(code),
        expires_at,
        attempts: 0,
        last_sent_at: new Date().toISOString(),
      });
    if (upErr) throw new Error(upErr.message);

    try {
      await sendOtpEmail({ to: email, code });
    } catch (e) {
      console.error("[signup-otp] email send failed", e);
      throw new Error("Failed to send verification email. Please try again.");
    }

    return { ok: true, expires_at };
  });

const verifySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(72),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
  referralCode: z.string().trim().min(1).max(32).optional(),
});

export const verifySignupOtpAndSignup = createServerFn({ method: "POST" })
  .inputValidator((d) => verifySchema.parse(d))
  .handler(async ({ data }) => {
    const { email, password, code, referralCode } = data;

    const { data: row, error: selErr } = await supabaseAdmin
      .from("signup_otps")
      .select("code_hash, expires_at, attempts")
      .eq("email", email)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);
    if (!row) throw new Error("No verification code found. Please request a new one.");

    if (new Date(row.expires_at).getTime() < Date.now()) {
      await supabaseAdmin.from("signup_otps").delete().eq("email", email);
      throw new Error("Code expired. Please request a new one.");
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      await supabaseAdmin.from("signup_otps").delete().eq("email", email);
      throw new Error("Too many attempts. Please request a new code.");
    }
    if (hashCode(code) !== row.code_hash) {
      await supabaseAdmin
        .from("signup_otps")
        .update({ attempts: row.attempts + 1 })
        .eq("email", email);
      throw new Error("Incorrect code. Please try again.");
    }

    // Create user (email already verified via OTP).
    const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: referralCode ? { referral_code: referralCode.toUpperCase() } : undefined,
    });
    if (createErr) throw new Error(createErr.message);

    await supabaseAdmin.from("signup_otps").delete().eq("email", email);

    return { ok: true };
  });