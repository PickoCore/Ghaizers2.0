// Ghaizers PNG engine — pure JS, no dependencies.
// Dipakai oleh Web Worker (src/lib/pngWorker.js) dan bisa dites langsung di Node 18+.
//
// Kenapa ada file ini?
// Encoder PNG bawaan browser (canvas.convertToBlob) SELALU menulis RGBA 8-bit tanpa palette
// dan tanpa pemilihan filter yang optimal. Untuk texture Minecraft (sedikit warna, pixel art)
// hasilnya hampir selalu LEBIH BESAR dari PNG asli yang sudah dioptimasi — inilah penyebab
// ukuran pack naik setelah "optimize". Engine ini menulis PNG sendiri dengan:
//   • palette (indexed) + bit-depth 1/2/4/8 bila warna ≤ 256
//   • color type minimum (gray / gray+alpha / RGB / RGBA) bila tidak bisa pakai palette
//   • adaptive row filter (heuristik min-sum-abs) + opsi "no filter"
// Semuanya lossless (kecuali quantizeRGBA yang memang opt-in).

const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];

// ───────────────────────── CRC32 ─────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes, start, end) {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out, 4, 8 + data.length));
  return out;
}

// ───────────────────────── zlib via Compression Streams ─────────────────────────
export function hasCompressionStreams() {
  return typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";
}

async function pipeThrough(data, stream) {
  const out = new Blob([data]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}
const deflateZlib = (data) => pipeThrough(data, new CompressionStream("deflate"));
const inflateZlib = (data) => pipeThrough(data, new DecompressionStream("deflate"));

function concatBytes(parts) {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

// ───────────────────────── Metadata helpers ─────────────────────────
const KEEP_CHUNKS = new Set(["IHDR", "PLTE", "tRNS", "IDAT", "IEND", "acTL", "fcTL", "fdAT"]);

export function isPng(u8) {
  if (!u8 || u8.length < 24) return false;
  for (let i = 0; i < 8; i++) if (u8[i] !== PNG_SIG[i]) return false;
  return true;
}

export function isAnimatedPng(u8) {
  let pos = 8;
  while (pos + 12 <= u8.length) {
    const len = ((u8[pos] << 24) | (u8[pos + 1] << 16) | (u8[pos + 2] << 8) | u8[pos + 3]) >>> 0;
    const type = String.fromCharCode(u8[pos + 4], u8[pos + 5], u8[pos + 6], u8[pos + 7]);
    if (type === "acTL") return true;
    if (type === "IDAT" || type === "IEND") return false;
    pos += 12 + len;
  }
  return false;
}

/** Buang chunk non-esensial (tEXt, iCCP, gAMA, pHYs, dst). Mengembalikan {out, stripped}. */
export function stripPngMetadata(buf) {
  try {
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    if (!isPng(u8)) return { out: u8, stripped: 0 };
    let pos = 8, stripped = 0;
    const keep = [u8.subarray(0, 8)];
    while (pos + 12 <= u8.length) {
      const len = ((u8[pos] << 24) | (u8[pos + 1] << 16) | (u8[pos + 2] << 8) | u8[pos + 3]) >>> 0;
      const type = String.fromCharCode(u8[pos + 4], u8[pos + 5], u8[pos + 6], u8[pos + 7]);
      const total = 12 + len;
      if (pos + total > u8.length) break;
      if (KEEP_CHUNKS.has(type)) keep.push(u8.subarray(pos, pos + total));
      else stripped += total;
      pos += total;
      if (type === "IEND") break;
    }
    if (stripped === 0) return { out: u8, stripped: 0 };
    return { out: concatBytes(keep), stripped };
  } catch {
    return { out: buf instanceof Uint8Array ? buf : new Uint8Array(buf), stripped: 0 };
  }
}

// ───────────────────────── Decoder ─────────────────────────
function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/**
 * Decode PNG non-interlaced (bit depth 1/2/4/8) ke RGBA 8-bit TANPA premultiply
 * (jadi benar-benar lossless, tidak seperti canvas getImageData).
 * Mengembalikan null untuk kasus yang tidak didukung (interlaced, 16-bit, APNG, rusak).
 */
export async function decodePng(buf) {
  try {
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    if (!isPng(u8)) return null;
    let pos = 8, ihdr = null, plte = null, trns = null;
    const idat = [];
    while (pos + 12 <= u8.length) {
      const len = ((u8[pos] << 24) | (u8[pos + 1] << 16) | (u8[pos + 2] << 8) | u8[pos + 3]) >>> 0;
      const type = String.fromCharCode(u8[pos + 4], u8[pos + 5], u8[pos + 6], u8[pos + 7]);
      if (pos + 12 + len > u8.length) return null;
      const data = u8.subarray(pos + 8, pos + 8 + len);
      if (type === "IHDR") ihdr = data;
      else if (type === "PLTE") plte = data;
      else if (type === "tRNS") trns = data;
      else if (type === "IDAT") idat.push(data);
      else if (type === "acTL") return null;
      pos += 12 + len;
      if (type === "IEND") break;
    }
    if (!ihdr || ihdr.length < 13 || idat.length === 0) return null;
    const dv = new DataView(ihdr.buffer, ihdr.byteOffset, ihdr.byteLength);
    const w = dv.getUint32(0), h = dv.getUint32(4);
    const depth = ihdr[8], ctype = ihdr[9], interlace = ihdr[12];
    if (!w || !h || interlace !== 0 || depth === 16 || w * h > 1 << 26) return null;
    const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
    if (!channels) return null;
    if (ctype === 3 && !plte) return null;

    const bpp = Math.max(1, (channels * depth) >> 3);
    const rowBytes = Math.ceil((w * channels * depth) / 8);
    const raw = await inflateZlib(concatBytes(idat));
    if (raw.length < h * (rowBytes + 1)) return null;

    // un-filter in place
    for (let y = 0; y < h; y++) {
      const ro = y * (rowBytes + 1);
      const ft = raw[ro];
      const s = ro + 1;
      const p = s - (rowBytes + 1);
      if (ft === 0) continue;
      if (ft > 4) return null;
      for (let i = 0; i < rowBytes; i++) {
        const a = i >= bpp ? raw[s + i - bpp] : 0;
        const b = y > 0 ? raw[p + i] : 0;
        const c = y > 0 && i >= bpp ? raw[p + i - bpp] : 0;
        let add;
        if (ft === 1) add = a;
        else if (ft === 2) add = b;
        else if (ft === 3) add = (a + b) >> 1;
        else add = paeth(a, b, c);
        raw[s + i] = (raw[s + i] + add) & 255;
      }
    }

    const rgba = new Uint8Array(w * h * 4);
    const mask = (1 << depth) - 1;
    const scale = depth < 8 ? 255 / mask : 1;
    const sampleAt = (s, idx) => {
      if (depth === 8) return raw[s + idx];
      const bit = idx * depth;
      return (raw[s + (bit >> 3)] >> (8 - depth - (bit & 7))) & mask;
    };
    // tRNS color key (gray/RGB)
    let keyGray = -1, keyR = -1, keyG = -1, keyB = -1;
    if (trns) {
      if (ctype === 0 && trns.length >= 2) keyGray = ((trns[0] << 8) | trns[1]) & mask;
      if (ctype === 2 && trns.length >= 6) {
        keyR = ((trns[0] << 8) | trns[1]) & 255;
        keyG = ((trns[2] << 8) | trns[3]) & 255;
        keyB = ((trns[4] << 8) | trns[5]) & 255;
      }
    }
    let o = 0;
    for (let y = 0; y < h; y++) {
      const s = y * (rowBytes + 1) + 1;
      for (let x = 0; x < w; x++) {
        if (ctype === 6) {
          const k = s + x * 4;
          rgba[o++] = raw[k]; rgba[o++] = raw[k + 1]; rgba[o++] = raw[k + 2]; rgba[o++] = raw[k + 3];
        } else if (ctype === 2) {
          const k = s + x * 3;
          const r = raw[k], g = raw[k + 1], b = raw[k + 2];
          rgba[o++] = r; rgba[o++] = g; rgba[o++] = b;
          rgba[o++] = r === keyR && g === keyG && b === keyB ? 0 : 255;
        } else if (ctype === 0) {
          const v = sampleAt(s, x);
          const g8 = Math.round(v * scale);
          rgba[o++] = g8; rgba[o++] = g8; rgba[o++] = g8;
          rgba[o++] = v === keyGray ? 0 : 255;
        } else if (ctype === 4) {
          const k = s + x * 2;
          rgba[o++] = raw[k]; rgba[o++] = raw[k]; rgba[o++] = raw[k]; rgba[o++] = raw[k + 1];
        } else {
          const idx = sampleAt(s, x);
          if (idx * 3 + 2 >= plte.length) return null;
          rgba[o++] = plte[idx * 3]; rgba[o++] = plte[idx * 3 + 1]; rgba[o++] = plte[idx * 3 + 2];
          rgba[o++] = trns && idx < trns.length ? trns[idx] : 255;
        }
      }
    }
    return { w, h, data: rgba };
  } catch {
    return null;
  }
}

// ───────────────────────── Encoder ─────────────────────────
/** Filter semua baris. strategy: "adaptive" (min sum-abs per baris) atau "none". */
function filterRows(pix, rowBytes, h, bpp, strategy) {
  const out = new Uint8Array(h * (rowBytes + 1));
  if (strategy === "none") {
    for (let y = 0; y < h; y++) out.set(pix.subarray(y * rowBytes, (y + 1) * rowBytes), y * (rowBytes + 1) + 1);
    return out;
  }
  const f = [new Uint8Array(rowBytes), new Uint8Array(rowBytes), new Uint8Array(rowBytes), new Uint8Array(rowBytes), new Uint8Array(rowBytes)];
  const zero = new Uint8Array(rowBytes);
  for (let y = 0; y < h; y++) {
    const cur = pix.subarray(y * rowBytes, (y + 1) * rowBytes);
    const prev = y > 0 ? pix.subarray((y - 1) * rowBytes, y * rowBytes) : zero;
    const sums = [0, 0, 0, 0, 0];
    for (let i = 0; i < rowBytes; i++) {
      const x = cur[i];
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      const v0 = x;
      const v1 = (x - a) & 255;
      const v2 = (x - b) & 255;
      const v3 = (x - ((a + b) >> 1)) & 255;
      const v4 = (x - paeth(a, b, c)) & 255;
      f[0][i] = v0; f[1][i] = v1; f[2][i] = v2; f[3][i] = v3; f[4][i] = v4;
      sums[0] += v0 < 128 ? v0 : 256 - v0;
      sums[1] += v1 < 128 ? v1 : 256 - v1;
      sums[2] += v2 < 128 ? v2 : 256 - v2;
      sums[3] += v3 < 128 ? v3 : 256 - v3;
      sums[4] += v4 < 128 ? v4 : 256 - v4;
    }
    let best = 0;
    for (let k = 1; k < 5; k++) if (sums[k] < sums[best]) best = k;
    const o = y * (rowBytes + 1);
    out[o] = best;
    out.set(f[best], o + 1);
  }
  return out;
}

function analyze(rgba) {
  const n = rgba.length >> 2;
  let opaque = true, gray = true;
  const map = new Map();
  let overflow = false;
  for (let i = 0; i < n; i++) {
    const k = i << 2;
    const r = rgba[k], g = rgba[k + 1], b = rgba[k + 2], a = rgba[k + 3];
    if (a !== 255) opaque = false;
    if (r !== g || g !== b) gray = false;
    if (!overflow) {
      const key = ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
      const e = map.get(key);
      if (e) e.n++;
      else {
        map.set(key, { key, n: 1 });
        if (map.size > 256) overflow = true;
      }
    }
  }
  return { opaque, gray, colors: overflow ? 257 : map.size, map: overflow ? null : map };
}

function buildPng(w, h, depth, ctype, idat, plte, trns) {
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h);
  ihdr[8] = depth; ihdr[9] = ctype;
  const parts = [Uint8Array.from(PNG_SIG), makeChunk("IHDR", ihdr)];
  if (plte) parts.push(makeChunk("PLTE", plte));
  if (trns && trns.length) parts.push(makeChunk("tRNS", trns));
  parts.push(makeChunk("IDAT", idat), makeChunk("IEND", new Uint8Array(0)));
  return concatBytes(parts);
}

async function bestDeflate(pix, rowBytes, h, bpp, strategies) {
  let best = null;
  for (const st of strategies) {
    const z = await deflateZlib(filterRows(pix, rowBytes, h, bpp, st));
    if (!best || z.length < best.length) best = z;
  }
  return best;
}

/**
 * Encode RGBA 8-bit → PNG paling kecil yang bisa dibuat (lossless).
 * Mencoba palette dan truecolor, memilih yang terkecil.
 * @returns {Promise<{data:Uint8Array, colors:number, kind:string}>}
 */
export async function encodePng(rgba, w, h) {
  const info = analyze(rgba);
  const small = w * h <= 512 * 512;
  const candidates = [];

  // ── palette ──
  if (info.map) {
    const entries = [...info.map.values()];
    // non-opaque dulu (supaya tRNS pendek), lalu urut frekuensi
    entries.sort((p, q) => {
      const pa = (p.key & 255) !== 255 ? 0 : 1, qa = (q.key & 255) !== 255 ? 0 : 1;
      return pa - qa || q.n - p.n;
    });
    const n = entries.length;
    const depth = n <= 2 ? 1 : n <= 4 ? 2 : n <= 16 ? 4 : 8;
    const plte = new Uint8Array(n * 3);
    const alphas = new Uint8Array(n);
    let lastTrans = -1;
    const index = new Map();
    entries.forEach((e, i) => {
      plte[i * 3] = (e.key >>> 24) & 255;
      plte[i * 3 + 1] = (e.key >>> 16) & 255;
      plte[i * 3 + 2] = (e.key >>> 8) & 255;
      alphas[i] = e.key & 255;
      if (alphas[i] !== 255) lastTrans = i;
      index.set(e.key, i);
    });
    const trns = lastTrans >= 0 ? alphas.subarray(0, lastTrans + 1) : null;
    const rowBytes = Math.ceil((w * depth) / 8);
    const pix = new Uint8Array(rowBytes * h);
    for (let y = 0; y < h; y++) {
      const ro = y * rowBytes;
      for (let x = 0; x < w; x++) {
        const k = (y * w + x) << 2;
        const idx = index.get(((rgba[k] << 24) | (rgba[k + 1] << 16) | (rgba[k + 2] << 8) | rgba[k + 3]) >>> 0);
        if (depth === 8) pix[ro + x] = idx;
        else {
          const bit = x * depth;
          pix[ro + (bit >> 3)] |= idx << (8 - depth - (bit & 7));
        }
      }
    }
    const z = await bestDeflate(pix, rowBytes, h, 1, small ? ["adaptive", "none"] : ["adaptive"]);
    candidates.push({ data: buildPng(w, h, depth, 3, z, plte, trns), kind: `palette${depth}` });
  }

  // ── truecolor / gray (dicoba bila palette tidak ada, atau warna > 16 supaya adil) ──
  if (!info.map || info.colors > 16) {
    const n = w * h;
    let ctype, ch, pix;
    if (info.gray && info.opaque) {
      ctype = 0; ch = 1; pix = new Uint8Array(n);
      for (let i = 0; i < n; i++) pix[i] = rgba[i << 2];
    } else if (info.gray) {
      ctype = 4; ch = 2; pix = new Uint8Array(n * 2);
      for (let i = 0; i < n; i++) { pix[i * 2] = rgba[i << 2]; pix[i * 2 + 1] = rgba[(i << 2) + 3]; }
    } else if (info.opaque) {
      ctype = 2; ch = 3; pix = new Uint8Array(n * 3);
      for (let i = 0; i < n; i++) { pix[i * 3] = rgba[i << 2]; pix[i * 3 + 1] = rgba[(i << 2) + 1]; pix[i * 3 + 2] = rgba[(i << 2) + 2]; }
    } else {
      ctype = 6; ch = 4; pix = rgba;
    }
    const z = await bestDeflate(pix, w * ch, h, ch, small ? ["adaptive", "none"] : ["adaptive"]);
    candidates.push({ data: buildPng(w, h, 8, ctype, z, null, null), kind: `type${ctype}` });
  }

  candidates.sort((a, b) => a.data.length - b.data.length);
  return { data: candidates[0].data, colors: info.colors, kind: candidates[0].kind };
}

// ───────────────────────── Opsional: lossy palette quantization ─────────────────────────
/**
 * Median-cut quantizer (RGBA). LOSSY — hanya dipanggil bila user mengaktifkan.
 * Mengubah rgba in-place dan mengembalikan jumlah warna akhir.
 */
export function quantizeRGBA(rgba, maxColors = 256) {
  const n = rgba.length >> 2;
  const hist = new Map();
  for (let i = 0; i < n; i++) {
    const k = i << 2;
    const key = ((rgba[k] << 24) | (rgba[k + 1] << 16) | (rgba[k + 2] << 8) | rgba[k + 3]) >>> 0;
    hist.set(key, (hist.get(key) || 0) + 1);
  }
  if (hist.size <= maxColors) return hist.size;

  const colors = [...hist.entries()].map(([key, cnt]) => ({
    c: [(key >>> 24) & 255, (key >>> 16) & 255, (key >>> 8) & 255, key & 255], cnt, key,
  }));
  const boxes = [colors];
  const rangeOf = (box) => {
    let best = 0, bestCh = 0;
    for (let ch = 0; ch < 4; ch++) {
      let lo = 255, hi = 0;
      for (const e of box) { const v = e.c[ch]; if (v < lo) lo = v; if (v > hi) hi = v; }
      if (hi - lo > best) { best = hi - lo; bestCh = ch; }
    }
    return { range: best, ch: bestCh };
  };
  while (boxes.length < maxColors) {
    let pick = -1, pickScore = 0, pickCh = 0;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length < 2) continue;
      const { range, ch } = rangeOf(boxes[i]);
      if (range > pickScore) { pickScore = range; pick = i; pickCh = ch; }
    }
    if (pick < 0 || pickScore === 0) break;
    const box = boxes[pick];
    box.sort((p, q) => p.c[pickCh] - q.c[pickCh]);
    let total = 0;
    for (const e of box) total += e.cnt;
    let acc = 0, cut = 1;
    for (let i = 0; i < box.length - 1; i++) {
      acc += box[i].cnt;
      cut = i + 1;
      if (acc >= total / 2) break;
    }
    boxes.splice(pick, 1, box.slice(0, cut), box.slice(cut));
  }
  const remap = new Map();
  for (const box of boxes) {
    let r = 0, g = 0, b = 0, a = 0, t = 0;
    for (const e of box) { r += e.c[0] * e.cnt; g += e.c[1] * e.cnt; b += e.c[2] * e.cnt; a += e.c[3] * e.cnt; t += e.cnt; }
    const rep = ((Math.round(r / t) << 24) | (Math.round(g / t) << 16) | (Math.round(b / t) << 8) | Math.round(a / t)) >>> 0;
    for (const e of box) remap.set(e.key, rep);
  }
  for (let i = 0; i < n; i++) {
    const k = i << 2;
    const rep = remap.get(((rgba[k] << 24) | (rgba[k + 1] << 16) | (rgba[k + 2] << 8) | rgba[k + 3]) >>> 0);
    rgba[k] = (rep >>> 24) & 255; rgba[k + 1] = (rep >>> 16) & 255; rgba[k + 2] = (rep >>> 8) & 255; rgba[k + 3] = rep & 255;
  }
  return boxes.length;
}

// ───────────────────────── Util pixel ─────────────────────────
export function cleanAlpha(d) {
  let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0 && (d[i] || d[i + 1] || d[i + 2])) { d[i] = d[i + 1] = d[i + 2] = 0; n++; }
  }
  return n;
}

export function isSingleColor(d) {
  if (d.length < 4) return false;
  const r = d[0], g = d[1], b = d[2], a = d[3];
  for (let i = 4; i < d.length; i += 4) {
    if (d[i] !== r || d[i + 1] !== g || d[i + 2] !== b || d[i + 3] !== a) return false;
  }
  return true;
}

export function floorPow2(n) { let p = 1; while (p * 2 <= n) p *= 2; return p; }
export function nearestPow2(n) {
  if (n <= 0) return 1;
  let p = 1;
  while (p < n) p <<= 1;
  const l = p >> 1;
  return n - l < p - n ? l : p;
}
