// Deterministic 64-bit perceptual hash (DCT-based), returned as a hex string.
// Pure browser; uses an OffscreenCanvas-decoded ImageBitmap.

function dct1D(vec: Float64Array): Float64Array {
  const N = vec.length;
  const out = new Float64Array(N);
  const factor = Math.PI / N;
  for (let k = 0; k < N; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) sum += vec[n] * Math.cos((n + 0.5) * k * factor);
    out[k] = sum;
  }
  return out;
}

export async function computePHash(bitmap: ImageBitmap): Promise<string> {
  const size = 32;
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const gray = new Float64Array(size * size);
  for (let i = 0; i < size * size; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // 2D DCT: rows then cols
  const rows: Float64Array[] = [];
  for (let y = 0; y < size; y++) {
    rows.push(dct1D(gray.subarray(y * size, y * size + size) as Float64Array));
  }
  const dct = new Float64Array(size * size);
  for (let x = 0; x < size; x++) {
    const col = new Float64Array(size);
    for (let y = 0; y < size; y++) col[y] = rows[y][x];
    const c = dct1D(col);
    for (let y = 0; y < size; y++) dct[y * size + x] = c[y];
  }

  // Top-left 8x8, drop the DC (0,0) coefficient when computing median
  const block: number[] = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) block.push(dct[y * size + x]);
  const sorted = [...block.slice(1)].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // 64-bit hash as hex
  let hex = "";
  for (let nibble = 0; nibble < 16; nibble++) {
    let v = 0;
    for (let bit = 0; bit < 4; bit++) {
      const idx = nibble * 4 + bit;
      if (block[idx] > median) v |= 1 << (3 - bit);
    }
    hex += v.toString(16);
  }
  return hex;
}

export function hammingDistanceHex(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { d += x & 1; x >>= 1; }
  }
  return d;
}

// Convert 16-char hex pHash to a signed BigInt safe for Postgres bigint storage.
export function phashHexToBigInt(hex: string): bigint {
  const u = BigInt("0x" + hex);
  // Map unsigned 64-bit -> signed bigint range
  const MAX = 1n << 63n;
  return u >= MAX ? u - (1n << 64n) : u;
}

export function phashBigIntToHex(v: bigint | number | string): string {
  let b = typeof v === "bigint" ? v : BigInt(v);
  if (b < 0n) b += 1n << 64n;
  return b.toString(16).padStart(16, "0");
}