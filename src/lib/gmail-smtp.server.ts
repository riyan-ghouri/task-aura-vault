// Tiny SMTP-over-TLS client for Gmail (smtp.gmail.com:465) using Cloudflare Workers sockets.
// Sends a single message with HTML + plaintext body. App-password auth only.
import { connect } from "cloudflare:sockets";

type SmtpSocket = {
  writer: WritableStreamDefaultWriter<Uint8Array>;
  reader: ReadableStreamDefaultReader<Uint8Array>;
  buf: string;
  close: () => Promise<void>;
};

const enc = new TextEncoder();
const dec = new TextDecoder();

async function readLine(sock: SmtpSocket, expect: number): Promise<string> {
  // SMTP multi-line: lines like "250-..." continue, "250 ..." ends.
  while (true) {
    // If we already have at least one complete final line, return it.
    const lines = sock.buf.split("\r\n");
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      if (line.length >= 4 && line[3] === " ") {
        // consume up to and including this line
        sock.buf = lines.slice(i + 1).join("\r\n");
        const code = parseInt(line.slice(0, 3), 10);
        if (code !== expect) {
          throw new Error(`SMTP expected ${expect}, got: ${line}`);
        }
        return line;
      }
    }
    const { value, done } = await sock.reader.read();
    if (done) throw new Error("SMTP connection closed unexpectedly");
    sock.buf += dec.decode(value, { stream: true });
  }
}

async function write(sock: SmtpSocket, s: string) {
  await sock.writer.write(enc.encode(s));
}

function b64(s: string): string {
  // btoa works in workers
  return btoa(unescape(encodeURIComponent(s)));
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export interface SendOtpEmailParams {
  to: string;
  code: string;
  appName?: string;
}

export async function sendOtpEmail({ to, code, appName = "VerifyTasks" }: SendOtpEmailParams): Promise<void> {
  const user = process.env.GMAIL_SMTP_USER;
  const pass = process.env.GMAIL_SMTP_APP_PASSWORD;
  if (!user || !pass) throw new Error("Gmail SMTP not configured");

  const subject = `${code} is your ${appName} verification code`;
  const text =
    `Your ${appName} verification code is: ${code}\r\n\r\n` +
    `This code expires in 10 minutes. If you didn't request this, ignore this email.`;
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#ffffff;color:#0f172a;padding:24px;">
<div style="max-width:480px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;padding:32px;">
<h1 style="font-size:20px;margin:0 0 8px;">Verify your email</h1>
<p style="color:#475569;margin:0 0 24px;">Enter this 6-digit code in ${escapeHtml(appName)} to finish creating your account.</p>
<div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:16px;background:#f1f5f9;border-radius:8px;color:#0f172a;">${escapeHtml(code)}</div>
<p style="color:#64748b;font-size:13px;margin:24px 0 0;">This code expires in 10 minutes. If you didn't request it, you can safely ignore this email.</p>
</div></body></html>`;

  const boundary = "----=_VT_" + Math.random().toString(36).slice(2);
  const fromName = appName;
  const fromAddr = user;
  const date = new Date().toUTCString();
  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@${fromAddr.split("@")[1] || "gmail.com"}>`;

  const message =
    `From: ${fromName} <${fromAddr}>\r\n` +
    `To: ${to}\r\n` +
    `Subject: ${subject}\r\n` +
    `Date: ${date}\r\n` +
    `Message-ID: ${messageId}\r\n` +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: multipart/alternative; boundary="${boundary}"\r\n` +
    `\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/plain; charset="utf-8"\r\n` +
    `Content-Transfer-Encoding: 7bit\r\n\r\n` +
    `${text}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/html; charset="utf-8"\r\n` +
    `Content-Transfer-Encoding: 7bit\r\n\r\n` +
    `${html}\r\n` +
    `--${boundary}--\r\n`;

  // Dot-stuffing: any line starting with "." must be escaped to "..".
  const dotStuffed = message
    .split("\r\n")
    .map((l) => (l.startsWith(".") ? "." + l : l))
    .join("\r\n");

  const socket = connect(
    { hostname: "smtp.gmail.com", port: 465 },
    { secureTransport: "on", allowHalfOpen: false },
  );

  const sock: SmtpSocket = {
    writer: socket.writable.getWriter(),
    reader: socket.readable.getReader(),
    buf: "",
    close: async () => {
      try { sock.writer.releaseLock(); } catch {}
      try { sock.reader.releaseLock(); } catch {}
      try { await socket.close(); } catch {}
    },
  };

  try {
    await readLine(sock, 220); // greeting
    await write(sock, `EHLO localhost\r\n`);
    await readLine(sock, 250);
    await write(sock, `AUTH LOGIN\r\n`);
    await readLine(sock, 334);
    await write(sock, `${b64(user)}\r\n`);
    await readLine(sock, 334);
    await write(sock, `${b64(pass)}\r\n`);
    await readLine(sock, 235);
    await write(sock, `MAIL FROM:<${fromAddr}>\r\n`);
    await readLine(sock, 250);
    await write(sock, `RCPT TO:<${to}>\r\n`);
    await readLine(sock, 250);
    await write(sock, `DATA\r\n`);
    await readLine(sock, 354);
    await write(sock, `${dotStuffed}\r\n.\r\n`);
    await readLine(sock, 250);
    await write(sock, `QUIT\r\n`);
    // Don't error if QUIT response missing
    try { await readLine(sock, 221); } catch {}
  } finally {
    await sock.close();
  }
}