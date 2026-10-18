// Tes mandiri engine PNG (tanpa dependency). Jalankan: npm run test:png  (Node 18+)
import { encodePng, decodePng, stripPngMetadata, quantizeRGBA } from "../src/lib/png.js";

let fail = 0;
const ok = (name, cond, extra = "") => { console.log(`${cond ? "✓" : "✗"} ${name} ${extra}`); if (!cond) fail++; };
let seed = 12345;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

function make(w, h, palette) {
  const d = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const c = palette ? palette[Math.floor(rnd() * palette.length)] : [rnd() * 256, rnd() * 256, rnd() * 256, rnd() > 0.5 ? 255 : rnd() * 256];
    d.set(c.map(Math.floor), i * 4);
  }
  return d;
}
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

const cases = [
  ["pixel art 12 warna + alpha", 64, 64, [[10,20,30,255],[200,10,10,255],[10,200,10,255],[250,250,0,255],[0,0,0,0],[90,90,90,128],[1,2,3,255],[4,5,6,255],[7,8,9,255],[11,12,13,255],[14,15,16,255],[17,18,19,255]]],
  ["2 warna (1-bit)", 40, 40, [[0,0,0,255],[255,255,255,255]]],
  ["grayscale opaque", 32, 32, Array.from({ length: 200 }, (_, i) => [i, i, i, 255])],
  ["RGBA noise", 64, 64, null],
];
for (const [name, w, h, pal] of cases) {
  const rgba = make(w, h, pal);
  const enc = await encodePng(rgba, w, h);
  const dec = await decodePng(enc.data);
  ok(`round-trip lossless: ${name}`, !!dec && dec.w === w && dec.h === h && same(dec.data, rgba), `(${enc.kind}, ${enc.data.length}B)`);
  ok(`  lebih kecil dari RGBA mentah`, enc.data.length < w * h * 4);
}

// metadata strip
const rgba = make(16, 16, [[1,2,3,255],[4,5,6,255]]);
const png = (await encodePng(rgba, 16, 16)).data;
const text = new Uint8Array([0,0,0,5,116,69,88,116,104,105,0,0,0,0,0,0,0,0,0]); // dummy non-critical chunk (CRC tak divalidasi stripper)
const withMeta = new Uint8Array(png.length + text.length);
withMeta.set(png.subarray(0, 33)); withMeta.set(text, 33); withMeta.set(png.subarray(33), 33 + text.length);
const stripped = stripPngMetadata(withMeta);
ok("stripPngMetadata membuang chunk non-esensial", stripped.stripped > 0 && stripped.out.length < withMeta.length);

// quantize
const big = make(128, 128, null);
const n = quantizeRGBA(big, 256);
const q = await encodePng(big, 128, 128);
ok("quantize → ≤256 warna & palette", n <= 256 && q.kind.startsWith("palette"), `(${q.kind}, ${q.data.length}B)`);

console.log(fail ? `\n${fail} tes GAGAL` : "\nSemua tes lulus");
process.exit(fail ? 1 : 0);
