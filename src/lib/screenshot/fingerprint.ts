// Stable, hashed device fingerprint. Never includes PII directly; the final
// fingerprint is SHA-256 hashed so it can be stored and compared safely.

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function canvasFingerprint(): string {
  try {
    const c = document.createElement("canvas");
    c.width = 240; c.height = 60;
    const ctx = c.getContext("2d");
    if (!ctx) return "no-canvas";
    ctx.textBaseline = "top";
    ctx.font = "16px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 240, 60);
    ctx.fillStyle = "#069";
    ctx.fillText("veritask-fp-\u{1F512}", 2, 2);
    ctx.strokeStyle = "rgba(102,204,0,0.7)";
    ctx.beginPath();
    ctx.arc(120, 30, 20, 0, Math.PI * 2, true);
    ctx.stroke();
    return c.toDataURL();
  } catch {
    return "canvas-error";
  }
}

export async function buildClientMeta() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
  const lang = navigator.language || "unknown";
  const ua = navigator.userAgent;
  const screenSig = `${window.screen.width}x${window.screen.height}x${window.devicePixelRatio}`;
  const viewport = `${window.innerWidth}x${window.innerHeight}`;
  const canvas = canvasFingerprint();
  const raw = [ua, tz, lang, screenSig, canvas].join("||");
  const device_fp_hash = await sha256Hex(raw);
  return {
    ua,
    tz,
    lang,
    viewport,
    dpr: window.devicePixelRatio,
    screen: screenSig,
    device_fp_hash,
  };
}

export type ClientMeta = Awaited<ReturnType<typeof buildClientMeta>>;