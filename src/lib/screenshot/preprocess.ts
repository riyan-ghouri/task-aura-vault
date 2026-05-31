import { computePHash } from "./phash";
import { buildClientMeta, type ClientMeta } from "./fingerprint";

export type PreprocessStep =
  | "reading"
  | "decoding"
  | "compressing"
  | "hashing"
  | "ocr"
  | "fingerprint"
  | "done";

export type ProgressFn = (step: PreprocessStep, pct: number) => void;

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];

export interface PreprocessResult {
  blob: Blob;            // re-encoded WebP to upload
  ext: "webp";
  sha256: string;
  phashHex: string;
  width: number;
  height: number;
  bytes: number;
  mime: "image/webp";
  ocrText: string;
  ocrConfidence: number;
  clientMeta: ClientMeta;
}

async function sha256OfBlob(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function encodeWebp(bitmap: ImageBitmap, quality = 0.85): Promise<Blob> {
  const c = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  return await c.convertToBlob({ type: "image/webp", quality });
}

async function runOcr(
  blob: Blob,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
): Promise<{ text: string; confidence: number }> {
  // Lazy-load tesseract only when needed
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", undefined, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress(m.progress);
    },
  });
  const onAbort = () => {
    worker.terminate().catch(() => {});
  };
  signal?.addEventListener("abort", onAbort);
  try {
    const { data } = await worker.recognize(blob);
    return { text: data.text || "", confidence: (data as { confidence?: number }).confidence ?? 0 };
  } finally {
    signal?.removeEventListener("abort", onAbort);
    try { await worker.terminate(); } catch { /* ignore */ }
  }
}

export async function preprocessScreenshot(
  file: File,
  onProgress: ProgressFn,
  opts?: { signal?: AbortSignal; skipOcr?: boolean },
): Promise<PreprocessResult> {
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new Error(`Unsupported file type. Use PNG, JPG, or WebP.`);
  }
  if (file.size === 0) throw new Error("File is empty.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Screenshot must be 5 MB or less.");

  onProgress("reading", 0);

  // Magic-byte sniff (client-side guard; server re-checks authoritatively)
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  const isJpg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const isWebp = head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
                 head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;
  if (!isPng && !isJpg && !isWebp) throw new Error("File contents do not match an image format.");

  onProgress("decoding", 0);
  const bitmap = await createImageBitmap(file);

  onProgress("compressing", 0);
  const webp = await encodeWebp(bitmap, 0.85);

  onProgress("hashing", 0);
  const [sha256, phashHex] = await Promise.all([
    sha256OfBlob(webp),
    computePHash(bitmap),
  ]);

  let ocrText = "";
  let ocrConfidence = 0;
  if (!opts?.skipOcr) {
    onProgress("ocr", 0);
    try {
      const r = await runOcr(webp, (pct) => onProgress("ocr", pct), opts?.signal);
      ocrText = r.text;
      ocrConfidence = r.confidence;
    } catch (e) {
      console.warn("OCR failed, continuing without text", e);
    }
  }

  onProgress("fingerprint", 0);
  const clientMeta = await buildClientMeta();

  onProgress("done", 1);
  return {
    blob: webp,
    ext: "webp",
    sha256,
    phashHex,
    width: bitmap.width,
    height: bitmap.height,
    bytes: webp.size,
    mime: "image/webp",
    ocrText,
    ocrConfidence,
    clientMeta,
  };
}