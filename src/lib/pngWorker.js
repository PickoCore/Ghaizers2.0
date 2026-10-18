// Web Worker untuk memproses 1 PNG per job.
// Alur: strip metadata → (resize bila perlu) → alpha clean → single-color → quantize (opsional)
//       → encode ulang dengan encoder lossless sendiri → PILIH YANG TERKECIL (size guard).
import {
  decodePng, encodePng, stripPngMetadata, quantizeRGBA, cleanAlpha, isSingleColor,
  isAnimatedPng, hasCompressionStreams, nearestPow2, floorPow2,
} from "./png.js";

async function canvasEncode(rgba, w, h) {
  const oc = new OffscreenCanvas(w, h);
  const ctx = oc.getContext("2d");
  ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.length), w, h), 0, 0);
  const blob = await oc.convertToBlob({ type: "image/png" });
  return new Uint8Array(await blob.arrayBuffer());
}

self.onmessage = async ({ data: p }) => {
  const {
    id, buffer, w0, h0, tW, tH, smoothing,
    doAlphaClean, doSingleColor, doPowerOfTwo, doStripMeta, doQuantize, sizeGuard,
  } = p;
  try {
    const orig = new Uint8Array(buffer);
    const origLen = orig.length;
    const keep = (extra = {}) => self.postMessage({ id, ok: true, useOriginal: true, changed: false, ...extra });

    // APNG tidak disentuh (frame bisa rusak)
    if (isAnimatedPng(orig)) return keep({ reason: "apng" });

    // 1) metadata
    let metaStripped = 0;
    let base = orig;
    if (doStripMeta) {
      const r = stripPngMetadata(orig);
      base = r.out; metaStripped = r.stripped;
    }

    // 2) ukuran akhir — TIDAK PERNAH upscale
    let finalW = Math.min(tW, w0), finalH = Math.min(tH, h0);
    if (doPowerOfTwo) {
      const pw = nearestPow2(finalW), ph = nearestPow2(finalH);
      finalW = pw > w0 ? floorPow2(w0) : pw;
      finalH = ph > h0 ? floorPow2(h0) : ph;
    }
    const resized = finalW !== w0 || finalH !== h0;

    // 3) ambil pixel RGBA
    let W = w0, H = h0, rgba = null;
    if (!resized) {
      const dec = await decodePng(base);
      if (dec) { W = dec.w; H = dec.h; rgba = dec.data; }
    } else {
      const bmp = await createImageBitmap(new Blob([base], { type: "image/png" }));
      const oc = new OffscreenCanvas(finalW, finalH);
      const ctx = oc.getContext("2d", { willReadFrequently: true });
      ctx.imageSmoothingEnabled = smoothing !== "nearest";
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bmp, 0, 0, finalW, finalH);
      bmp.close();
      const d = ctx.getImageData(0, 0, finalW, finalH).data;
      rgba = new Uint8Array(d.buffer, d.byteOffset, d.length);
      W = finalW; H = finalH;
    }

    // Tidak bisa didecode tanpa resize (interlaced / 16-bit / dll) → jangan paksa re-encode via canvas
    if (!rgba) {
      if (base.length < origLen) {
        const out = base.buffer.slice(base.byteOffset, base.byteOffset + base.length);
        return self.postMessage({ id, ok: true, out, changed: true, metaStripped, finalW: w0, finalH: h0 }, [out]);
      }
      return keep({ reason: "undecodable" });
    }

    // 4) single color → 1×1
    if (doSingleColor && isSingleColor(rgba)) {
      const one = new Uint8Array([rgba[0], rgba[1], rgba[2], rgba[3]]);
      const enc = hasCompressionStreams() ? (await encodePng(one, 1, 1)).data : await canvasEncode(one, 1, 1);
      if (!sizeGuard || enc.length < origLen) {
        const out = enc.buffer.slice(enc.byteOffset, enc.byteOffset + enc.length);
        return self.postMessage({ id, ok: true, out, changed: true, singleColor: true, metaStripped, finalW: 1, finalH: 1 }, [out]);
      }
      return keep({ guarded: true });
    }

    // 5) alpha cleanup
    let alphaFixed = 0;
    if (doAlphaClean) alphaFixed = cleanAlpha(rgba);

    // 6) quantize lossy (opsional, hanya texture besar & banyak warna)
    let quantized = false;
    if (doQuantize && W * H >= 4096) {
      const before = rgba.slice();
      const n = quantizeRGBA(rgba, 256);
      quantized = n <= 256;
      if (!quantized) rgba.set(before);
    }

    // 7) encode
    let enc, kind = "canvas", colors = 0;
    if (hasCompressionStreams()) {
      const r = await encodePng(rgba, W, H);
      enc = r.data; kind = r.kind; colors = r.colors;
    } else {
      enc = await canvasEncode(rgba, W, H);
    }

    // 8) SIZE GUARD — pilih kandidat terkecil
    const candidates = [{ data: enc, tag: "new" }];
    if (base.length < origLen) candidates.push({ data: base, tag: "stripped" });
    candidates.push({ data: orig, tag: "orig" });
    // Kalau resize disengaja & guard dimatikan, hasil resize wajib dipakai.
    const forced = resized && !sizeGuard;
    let pick = candidates[0];
    if (!forced) for (const c of candidates) if (c.data.length < pick.data.length) pick = c;
    // Pixel berubah (alpha/quantize/resize) hanya boleh digantikan oleh versi asli bila memang lebih kecil.
    if (pick.tag === "orig") return keep({ guarded: true, kind, colors, metaStripped });

    const out = pick.data.buffer.slice(pick.data.byteOffset, pick.data.byteOffset + pick.data.length);
    const changedPixels = pick.tag === "new";
    self.postMessage({
      id, ok: true, out, changed: true, metaStripped,
      alphaFixed: changedPixels ? alphaFixed : 0,
      finalW: changedPixels ? W : w0, finalH: changedPixels ? H : h0,
      kind: changedPixels ? kind : "stripped", colors, quantized: changedPixels && quantized,
      guarded: pick.tag !== "new" && candidates[0].data.length >= origLen,
    }, [out]);
  } catch (e) {
    self.postMessage({ id, ok: false, error: e && e.message ? e.message : String(e) });
  }
};
