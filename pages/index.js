import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";

/* =========================
   CREDIT & WATERMARK
   © 2025 ghaa (KhaizenNomazen)
========================= */
const CREDIT_BANNER = [
  "╔══════════════════════════════════════════════════╗",
  "║     Ghaizers2.0 — Minecraft Pack Optimizer       ║",
  "║     Made with 💚 by ghaa (KhaizenNomazen)        ║",
  "║     Tool ini 100% GRATIS — JANGAN DIBAYAR!       ║",
  "║     Menjual tool ini = PELANGGARAN HUKUM         ║",
  "║     UU Hak Cipta No. 28 Tahun 2014 (Indonesia)   ║",
  "║     github.com/KhaizenNomazen                    ║",
  "╚══════════════════════════════════════════════════╝",
];

const CREDIT_TXT = `================================================================
  GHAIZERS 2.0 — Minecraft Resource Pack Optimizer
  © 2025 ghaa (KhaizenNomazen). All rights reserved.
================================================================

Tool ini dibuat GRATIS oleh ghaa untuk komunitas Minecraft.

⚠️  PERINGATAN HUKUM / LEGAL WARNING:
    Menjual, mendistribusikan ulang secara komersial, atau
    mengklaim kepemilikan tool ini TANPA izin tertulis dari
    ghaa (KhaizenNomazen) adalah PELANGGARAN HUKUM yang
    dapat dituntut berdasarkan:

    🇮🇩 UU Hak Cipta No. 28 Tahun 2014 (Indonesia)
    🌍 Berne Convention for the Protection of Literary
       and Artistic Works (Internasional)
    🌍 WIPO Copyright Treaty

    Pelanggar dapat dikenakan:
    - Pidana penjara maksimal 10 tahun
    - Denda maksimal Rp 4.000.000.000 (4 miliar rupiah)

✅  PENGGUNAAN YANG DIIZINKAN:
    - Gratis untuk penggunaan pribadi
    - Gratis untuk komunitas / server non-komersial
    - Modifikasi dengan tetap mencantumkan credit

❌  DILARANG KERAS:
    - Menjual tool ini dalam bentuk apapun
    - Menghapus credit / watermark ini
    - Mengklaim sebagai karya sendiri

📧  Kontak / Laporan penyalahgunaan:
    github.com/KhaizenNomazen

================================================================
  Jika kamu MEMBAYAR untuk tool ini → kamu DITIPU.
  Laporkan ke: github.com/KhaizenNomazen
================================================================`;

const CREDIT_MCMETA_DESC = "§cDilarang Dijual! §r| Optimizer by §aghaa §7(KhaizenNomazen) | §eGRATIS di optimizer.ghaa.my.id";

const MODES = {
  normal: { id: "normal", label: "Normal", description: "Seimbang, kualitas bagus dan pack tetap ringan.", scale: 0.85, maxSize: 512, minSize: 16, minifyJson: true },
  extreme: { id: "extreme", label: "Extreme", description: "Sangat hemat, cocok untuk device mid–low.", scale: 0.6, maxSize: 256, minSize: 8, minifyJson: true },
  ultra: { id: "ultra", label: "Ultra Extreme", description: "Paling ringan, untuk HP kentang / Pojav lemah.", scale: 0.4, maxSize: 128, minSize: 4, minifyJson: true }
};

const BASE_POLICIES = [
  { pattern: /textures\/gui\//, smoothing: "nearest", minSize: 16, scaleMul: 1.0 },
  { pattern: /textures\/font\//, smoothing: "nearest", minSize: 16, scaleMul: 1.0, skipResize: true },
  { pattern: /modelengine\//, enforceStrip: true, maxHeight: 8192, smoothing: "smooth" },
  { pattern: /colormap\//, skip: true },
  { pattern: /maps\//, skip: true },
  { pattern: /textures\/entity\//, scaleMul: 0.85 },
  { pattern: /textures\/particle\//, scaleMul: 0.75, smoothing: "nearest" },
  { pattern: /.*/, scaleMul: 1.0 }
];

function getPolicyForPath(lowerPath, dynamicStripPaths) {
  if (Array.isArray(dynamicStripPaths)) {
    for (let i = 0; i < dynamicStripPaths.length; i++) {
      const key = dynamicStripPaths[i];
      if (key && lowerPath.includes(key)) return { enforceStrip: true, smoothing: "smooth" };
    }
  }
  for (let i = 0; i < BASE_POLICIES.length; i++) {
    if (BASE_POLICIES[i].pattern.test(lowerPath)) return { ...BASE_POLICIES[i] };
  }
  return { scaleMul: 1.0 };
}

function shouldExcludeNonGameFile(lower) {
  if (lower.endsWith(".psd") || lower.endsWith(".xcf") || lower.endsWith(".txt") ||
    lower.endsWith(".md") || lower.endsWith(".bak") || lower.endsWith(".zip")) return true;
  if (lower.endsWith(".png") || lower.endsWith(".json") || lower.endsWith(".mcmeta") ||
    lower.endsWith(".properties") || lower.endsWith(".ogg") ||
    lower.endsWith(".fsh") || lower.endsWith(".vsh") || lower.endsWith(".glsl")) return false;
  if (lower.includes("/raw/") || lower.includes("/backup/") ||
    lower.includes("/unused/") || lower.includes("/temp/")) {
    if (lower.endsWith(".png") || lower.endsWith(".json") ||
      lower.endsWith(".mcmeta") || lower.endsWith(".ogg")) return false;
    return true;
  }
  return false;
}

function parsePojavLog(text) {
  const enforceStrip = new Set();
  const missing = new Set();
  const reStrip = /size .*? is not multiple of frame size|not multiple of frame size/i;
  const rePathPng = /(['"])([^'"]+?\.png)\1/i;
  const reMissing = /Missing sprite.*?([^\s]+?\.png)/i;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (reStrip.test(line)) {
      const m = rePathPng.exec(line);
      if (m && m[2]) enforceStrip.add(m[2].toLowerCase());
    }
    const mm = reMissing.exec(line);
    if (mm && mm[1]) missing.add(mm[1].toLowerCase());
  }
  return { enforceStrip: [...enforceStrip], missing: [...missing] };
}

function uniqueLower(arr) {
  const s = new Set(); const out = [];
  for (let i = 0; i < arr.length; i++) {
    const v = (arr[i] || "").toLowerCase();
    if (!s.has(v)) { s.add(v); out.push(v); }
  }
  return out;
}

function readPngIHDRSize(buffer) {
  try {
    const u8 = new Uint8Array(buffer);
    if (u8.length < 24) return null;
    const sig = [137, 80, 78, 71, 13, 10, 26, 10];
    for (let i = 0; i < 8; i++) if (u8[i] !== sig[i]) return null;
    const type = String.fromCharCode(u8[12]) + String.fromCharCode(u8[13]) +
      String.fromCharCode(u8[14]) + String.fromCharCode(u8[15]);
    if (type !== "IHDR") return null;
    const dv = new DataView(buffer);
    const w = dv.getUint32(16, false);
    const h = dv.getUint32(20, false);
    if (!w || !h) return null;
    return { w, h };
  } catch { return null; }
}

function detectAnimatedStrip(width, height) {
  if (!width || !height || height <= width) return null;
  const frames = height / width;
  if (!Number.isInteger(frames) || frames < 2) return null;
  return frames;
}

function minifyShader(text) {
  try {
    return text
      .replace(/\/\/[^\n]*/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n/g, "\n")
      .trim();
  } catch { return text; }
}

function minifyProperties(text) {
  try {
    return text.split("\n").map(l => l.trim())
      .filter(l => l && !l.startsWith("#") && !l.startsWith("!"))
      .join("\n");
  } catch { return text; }
}

function deepCleanJson(obj, lowerPath) {
  if (!obj || typeof obj !== "object") return obj;
  const COMMENT_KEYS = ["__comment", "_comment", "//", "comment", "__credits", "__author"];
  if (Array.isArray(obj)) return obj.map(item => deepCleanJson(item, lowerPath));
  const cleaned = {};
  for (const [k, v] of Object.entries(obj)) {
    if (COMMENT_KEYS.includes(k)) continue;
    cleaned[k] = deepCleanJson(v, lowerPath);
  }
  if (lowerPath.endsWith("sounds.json")) {
    for (const [k, v] of Object.entries(cleaned)) {
      if (v && typeof v === "object" && Array.isArray(v.sounds) && v.sounds.length === 0) delete cleaned[k];
    }
  }
  return cleaned;
}

async function optimizeOggSafe(buffer) {
  try {
    const bytes = new Uint8Array(buffer);
    const len = bytes.length;
    if (len < 16) return { out: buffer, changed: false };
    let start = 0, end = len, changed = false;
    if (len >= 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
      const size = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) |
        ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
      const headerLen = 10 + size;
      if (headerLen < end) { start = headerLen; changed = true; }
    }
    if (end - start > 128) {
      const tagPos = end - 128;
      if (bytes[tagPos] === 0x54 && bytes[tagPos + 1] === 0x41 && bytes[tagPos + 2] === 0x47) {
        end = tagPos; changed = true;
      }
    }
    while (end > start && bytes[end - 1] === 0x00) { end--; changed = true; }
    if (!changed || end <= start) return { out: buffer, changed: false };
    const trimmed = bytes.subarray(start, end);
    const out = new Uint8Array(trimmed.length);
    out.set(trimmed);
    return { out: out.buffer, changed: true };
  } catch { return { out: buffer, changed: false }; }
}

async function buildPackIcon(file) {
  const buf = await file.arrayBuffer();
  const blob = new Blob([buf], { type: file.type || "image/png" });
  const img = await createImageBitmap(blob);
  const target = 128;
  const canvas = document.createElement("canvas");
  canvas.width = target; canvas.height = target;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, target, target);
  const scale = Math.min(target / img.width, target / img.height, 1);
  const dw = Math.round(img.width * scale);
  const dh = Math.round(img.height * scale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, Math.floor((target - dw) / 2), Math.floor((target - dh) / 2), dw, dh);
  const outBlob = await new Promise(r => canvas.toBlob(b => r(b || blob), "image/png", 0.92));
  return await outBlob.arrayBuffer();
}

async function sha1HexFromBlob(blob) {
  try {
    if (typeof window === "undefined" || !window.crypto?.subtle) return null;
    const hash = await window.crypto.subtle.digest("SHA-1", await blob.arrayBuffer());
    const bytes = new Uint8Array(hash);
    let hex = "";
    for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
    return hex;
  } catch { return null; }
}

function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function makePngWorkerURL() {
  const workerCode = `
    function cleanAlphaPixels(data) {
      let n = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i+3] === 0 && (data[i] || data[i+1] || data[i+2])) {
          data[i] = 0; data[i+1] = 0; data[i+2] = 0; n++;
        }
      }
      return n;
    }
    function isSingleColor(data) {
      if (data.length < 4) return false;
      const r=data[0],g=data[1],b=data[2],a=data[3];
      for (let i=4; i<data.length; i+=4) {
        if (data[i]!==r||data[i+1]!==g||data[i+2]!==b||data[i+3]!==a) return false;
      }
      return true;
    }
    self.onmessage = async (ev) => {
      const msg = ev.data;
      if (!msg || msg.type !== "png") return;
      const { id, buffer, w0, h0, tW, tH, smoothing, sizeGuard, doAlphaClean, doSingleColor } = msg;
      try {
        if (!buffer) { self.postMessage({ id, ok: true, out: buffer, changed: false }, []); return; }
        const originalSize = buffer.byteLength || 0;
        const blob = new Blob([buffer], { type: "image/png" });
        const bmp = await createImageBitmap(blob);
        if (doSingleColor && w0 > 1 && h0 > 1) {
          const checkCanvas = new OffscreenCanvas(w0, h0);
          const checkCtx = checkCanvas.getContext("2d");
          checkCtx.drawImage(bmp, 0, 0);
          const checkData = checkCtx.getImageData(0, 0, w0, h0).data;
          if (isSingleColor(checkData)) {
            const sc = new OffscreenCanvas(1, 1);
            const scCtx = sc.getContext("2d");
            scCtx.drawImage(bmp, 0, 0, 1, 1);
            const scBlob = await sc.convertToBlob({ type: "image/png" });
            const scBuf = await scBlob.arrayBuffer();
            self.postMessage({ id, ok: true, out: scBuf, changed: true, singleColor: true }, [scBuf]);
            return;
          }
        }
        const noResize = (tW === w0 && tH === h0);
        const canvas = new OffscreenCanvas(noResize ? w0 : tW, noResize ? h0 : tH);
        const ctx = canvas.getContext("2d");
        const nearest = smoothing === "nearest";
        ctx.imageSmoothingEnabled = !nearest;
        ctx.imageSmoothingQuality = nearest ? "low" : "high";
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
        let alphaFixed = 0;
        if (doAlphaClean) {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          alphaFixed = cleanAlphaPixels(imgData.data);
          if (alphaFixed > 0) ctx.putImageData(imgData, 0, 0);
        }
        const outBlob = await canvas.convertToBlob({ type: "image/png" });
        const outBuf = await outBlob.arrayBuffer();
        if (sizeGuard && !noResize && outBuf.byteLength >= originalSize && alphaFixed === 0) {
          self.postMessage({ id, ok: true, out: buffer, changed: false, guarded: true }, [buffer]);
          return;
        }
        const changed = !noResize || alphaFixed > 0;
        self.postMessage({ id, ok: true, out: outBuf, changed, alphaFixed }, [outBuf]);
      } catch (e) {
        try { self.postMessage({ id, ok: false, error: String(e?.message || e), out: buffer, changed: false }, [buffer]); }
        catch { self.postMessage({ id, ok: false, error: String(e?.message || e), out: null, changed: false }); }
      }
    };
  `;
  const blob = new Blob([workerCode], { type: "application/javascript" });
  return URL.createObjectURL(blob);
}

function createWorkerPool(size) {
  const url = makePngWorkerURL();
  const workers = [], free = [], pending = new Map();
  let seq = 0;
  function spawn() {
    const w = new Worker(url);
    w.onmessage = (ev) => {
      const { id, ok, out, changed, guarded, error, singleColor, alphaFixed } = ev.data || {};
      const cb = pending.get(id);
      if (cb) { pending.delete(id); cb.resolve({ ok, out, changed, guarded, error, singleColor, alphaFixed }); }
      free.push(w); pump();
    };
    w.onerror = () => { free.push(w); pump(); };
    workers.push(w); free.push(w);
  }
  for (let i = 0; i < size; i++) spawn();
  const queue = [];
  function pump() {
    while (free.length > 0 && queue.length > 0) {
      const w = free.pop(); const job = queue.shift();
      pending.set(job.id, job);
      w.postMessage(job.payload, [job.payload.buffer]);
    }
  }
  function runPngJob(payload) {
    const id = ++seq;
    return new Promise((resolve, reject) => {
      queue.push({ id, resolve, reject, payload: { ...payload, id, type: "png" } });
      pump();
    });
  }
  function destroy() { for (const w of workers) w.terminate(); URL.revokeObjectURL(url); }
  return { runPngJob, destroy };
}

function computeTargetSize({ w0, h0, policy, modeConfig }) {
  const { scale, minSize, maxSize } = modeConfig;
  const frames = detectAnimatedStrip(w0, h0);
  const baseScale = Math.max(0.01, scale) * (policy.scaleMul || 1.0);
  let tW = Math.round(w0 * baseScale);
  const minAllowed = Math.max(minSize, policy.minSize || 0);
  tW = Math.min(Math.max(tW, minAllowed), maxSize);
  let tH;
  if (frames || policy.enforceStrip) {
    const fCount = frames || Math.max(1, Math.round(h0 / w0));
    tH = tW * fCount;
    if (policy.maxHeight && tH > policy.maxHeight) {
      const fac = policy.maxHeight / tH;
      tW = Math.max(1, Math.round(tW * fac));
      tH = tW * fCount;
    }
  } else {
    let hScaled = Math.round(h0 * baseScale);
    let maxSide = Math.max(tW, hScaled);
    if (maxSide > maxSize) { const fac = maxSize / maxSide; tW = Math.round(tW * fac); hScaled = Math.round(hScaled * fac); }
    let minSide = Math.min(tW, hScaled);
    if (minSide < minAllowed) { const fac = minAllowed / minSide; tW = Math.round(tW * fac); hScaled = Math.round(hScaled * fac); }
    tH = hScaled;
  }
  const smoothing = policy.smoothing || (modeConfig.preservePixelArt ? "nearest" : "smooth");
  return { tW, tH, smoothing };
}

function Summary({ label, value }) {
  return (
    <div className="summary-card">
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState("normal");
  const [resolutionPercent, setResolutionPercent] = useState(100);
  const [preservePixelArt, setPreservePixelArt] = useState(true);
  const [optimizeOgg, setOptimizeOgg] = useState(true);
  const [zipCompressionLevel, setZipCompressionLevel] = useState(6);
  const [workerCount, setWorkerCount] = useState(0);
  const [doAlphaClean, setDoAlphaClean] = useState(true);
  const [doSingleColor, setDoSingleColor] = useState(true);
  const [doDeepCleanJson, setDoDeepCleanJson] = useState(true);
  const [doShaderMinify, setDoShaderMinify] = useState(true);
  const [logs, setLogs] = useState([]);
  const logRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState(null);
  const [iconFile, setIconFile] = useState(null);
  const [mcmetaText, setMcmetaText] = useState("");
  const [mcmetaLoaded, setMcmetaLoaded] = useState(false);
  const [mcmetaError, setMcmetaError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [dynamicStripPaths, setDynamicStripPaths] = useState([]);
  const [progress, setProgress] = useState({ done: 0, total: 0, etaSec: null });
  const logBufferRef = useRef([]);
  const flushTimerRef = useRef(null);

  const computedWorkerCount = useMemo(() => {
    const hc = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
    const suggested = Math.max(2, Math.min(4, Math.floor(hc / 2) || 2));
    return workerCount > 0 ? workerCount : suggested;
  }, [workerCount]);

  const flushLogs = () => {
    const buf = logBufferRef.current;
    if (!buf.length) return;
    setLogs(prev => [...prev, ...buf.splice(0, buf.length)]);
    setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 10);
  };

  const appendLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    logBufferRef.current.push(`[${time}] ${msg}`);
    if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(() => { flushTimerRef.current = null; flushLogs(); }, 250);
    }
  };

  useEffect(() => { return () => { if (flushTimerRef.current) clearTimeout(flushTimerRef.current); }; }, []);

  const onMainFileChange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFile(f); setFileName(f.name); setSummary(null);
    setLogs([]); logBufferRef.current = [];
    setProgress({ done: 0, total: 0, etaSec: null });
    setMcmetaText(""); setMcmetaLoaded(false); setMcmetaError("");
    appendLog(`File diterima: ${f.name} (${(f.size / 1e6).toFixed(2)} MB)`);
    await inspectZipForMcmeta(f);
  };

  const onIconChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setIconFile(f); appendLog(`Icon pack dipilih: ${f.name}`);
  };

  const onLogFileChange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const text = await f.text();
    const parsed = parsePojavLog(text);
    if (parsed.enforceStrip.length > 0) {
      appendLog(`Auto-Fix: ${parsed.enforceStrip.length} path akan di-enforce strip.`);
      setDynamicStripPaths(prev => uniqueLower([...prev, ...parsed.enforceStrip]));
    } else { appendLog("Auto-Fix: tidak ada path animated strip bermasalah di log."); }
    if (parsed.missing.length > 0) appendLog(`Missing sprite terdeteksi (${parsed.missing.length}) — ini masalah pack asli.`);
  };

  const inspectZipForMcmeta = async (f) => {
    try {
      appendLog("Membaca pack.mcmeta dari ZIP...");
      const zip = await JSZip.loadAsync(f);
      const entries = Object.values(zip.files);
      const mcmetaEntry = entries.find(e => e.name.toLowerCase() === "pack.mcmeta");
      if (!mcmetaEntry) { appendLog("pack.mcmeta tidak ditemukan."); setMcmetaLoaded(false); setMcmetaText(""); setMcmetaError(""); return; }
      const text = await mcmetaEntry.async("string");
      setMcmetaText(text); setMcmetaLoaded(true); setMcmetaError("");
      appendLog("pack.mcmeta berhasil dibaca.");
    } catch (e) {
      setMcmetaLoaded(false); setMcmetaText(""); setMcmetaError("Gagal membaca pack.mcmeta");
      appendLog("Gagal membaca pack.mcmeta: " + e.message);
    }
  };

  const handleOptimize = async () => {
    if (!file) { appendLog("Pilih resource pack (.zip) dulu."); return; }

    const baseMode = MODES[mode];
    const effectiveScale = baseMode.scale * (resolutionPercent / 100);
    const modeConfig = { ...baseMode, scale: effectiveScale, preservePixelArt };

    CREDIT_BANNER.forEach(line => appendLog(line));
    appendLog(" ");
    appendLog(`Mode: ${baseMode.label}`);
    appendLog(`Scale efektif: ${(effectiveScale * 100).toFixed(0)}% (slider ${resolutionPercent}%)`);
    appendLog(`Workers: ${computedWorkerCount} | ZIP Level: ${zipCompressionLevel}`);
    appendLog(`Alpha: ${doAlphaClean?"ON":"OFF"} | SingleColor: ${doSingleColor?"ON":"OFF"} | DeepJSON: ${doDeepCleanJson?"ON":"OFF"} | Shader: ${doShaderMinify?"ON":"OFF"}`);

    setIsProcessing(true); setSummary(null);
    setProgress({ done: 0, total: 0, etaSec: null });

    const pool = createWorkerPool(computedWorkerCount);
    const t0 = performance.now();

    try {
      const zip = await JSZip.loadAsync(file);
      appendLog("ZIP berhasil dibaca.");

      const outZip = new JSZip();
      const entries = Object.values(zip.files);
      const stats = {
        totalFiles: 0, pngCount: 0, pngOptimized: 0, pngSkippedByIHDR: 0,
        pngSingleColor: 0, pngAlphaCleaned: 0,
        jsonCount: 0, jsonMinified: 0, jsonDeepCleaned: 0,
        removed: 0, oggCount: 0, oggOptimized: 0,
        shaderCount: 0, shaderMinified: 0, oversizedWarnings: 0
      };

      const totalToProcess = entries.filter(e => !e.dir).length;
      setProgress({ done: 0, total: totalToProcess, etaSec: null });

      let done = 0;
      const updateProgress = () => {
        done++;
        const elapsed = (performance.now() - t0) / 1000;
        const rate = done / Math.max(0.001, elapsed);
        const left = Math.max(0, totalToProcess - done);
        const etaSec = rate > 0 ? Math.round(left / rate) : null;
        if (done % 20 === 0 || done === totalToProcess) setProgress({ done, total: totalToProcess, etaSec });
      };

      for (let idx = 0; idx < entries.length; idx++) {
        const entry = entries[idx];
        if (entry.dir) { outZip.folder(entry.name); continue; }
        const name = entry.name;
        const lower = name.toLowerCase();
        stats.totalFiles++;

        if (shouldExcludeNonGameFile(lower)) {
          stats.removed++; appendLog(`Dibuang (non-game): ${name}`); updateProgress(); continue;
        }

        if (lower.endsWith(".fsh") || lower.endsWith(".vsh") || lower.endsWith(".glsl")) {
          stats.shaderCount++;
          if (doShaderMinify) {
            const text = await entry.async("string");
            const minified = minifyShader(text);
            outZip.file(name, minified.length < text.length ? minified : text);
            if (minified.length < text.length) { stats.shaderMinified++; appendLog(`Shader minified: ${name}`); }
          } else { outZip.file(name, await entry.async("arraybuffer")); }
          updateProgress(); continue;
        }

        if (lower.endsWith(".properties")) {
          if (doShaderMinify) { outZip.file(name, minifyProperties(await entry.async("string"))); }
          else { outZip.file(name, await entry.async("arraybuffer")); }
          updateProgress(); continue;
        }

        if (lower === "pack.mcmeta") {
          stats.jsonCount++;
          const original = await entry.async("string");
          let toWrite = (mcmetaLoaded && mcmetaText.trim().length > 0) ? mcmetaText : original;
          if (toWrite !== original) appendLog("Menggunakan pack.mcmeta hasil edit user.");
          try {
            let obj = JSON.parse(toWrite);
            if (doDeepCleanJson) obj = deepCleanJson(obj, lower);
            const originalDesc = obj?.pack?.description || "";
            obj.pack = obj.pack || {};
            obj.pack._credit = "© ghaa (KhaizenNomazen) | Ghaizers2.0 | GRATIS | Dilarang dijual!";
            obj.pack._legal = "UU Hak Cipta No.28/2014 | Melanggar = pidana & denda";
            obj.pack._source = "github.com/KhaizenNomazen";
            if (typeof originalDesc === "string" && !originalDesc.includes("ghaa")) {
              obj.pack.description = originalDesc ? `${originalDesc} §7| §cOptimized by §aghaa` : CREDIT_MCMETA_DESC;
            }
            outZip.file(name, modeConfig.minifyJson ? JSON.stringify(obj) : JSON.stringify(obj, null, 2));
            stats.jsonMinified++; appendLog("pack.mcmeta: credit injected ✔");
          } catch { outZip.file(name, toWrite); appendLog("pack.mcmeta bukan JSON valid."); }
          updateProgress(); continue;
        }

        if (lower.endsWith(".ogg")) {
          stats.oggCount++;
          const buf = await entry.async("arraybuffer");
          if (optimizeOgg) {
            const { out, changed } = await optimizeOggSafe(buf);
            if (changed) { stats.oggOptimized++; appendLog(`OGG optimized: ${name}`); }
            outZip.file(name, out);
          } else { outZip.file(name, buf); }
          updateProgress(); continue;
        }

        if (lower.endsWith(".png")) {
          stats.pngCount++;
          const policy = getPolicyForPath(lower, dynamicStripPaths);
          if (!preservePixelArt && policy.smoothing === "nearest") policy.smoothing = "smooth";
          if (policy.skip || policy.skipResize) {
            outZip.file(name, await entry.async("arraybuffer")); updateProgress(); continue;
          }
          const buf = await entry.async("arraybuffer");
          if (buf.byteLength < 2048) {
            outZip.file(name, buf); stats.pngSkippedByIHDR++; updateProgress(); continue;
          }
          const sz = readPngIHDRSize(buf);
          if (!sz) { outZip.file(name, buf); updateProgress(); continue; }
          const { w: w0, h: h0 } = sz;
          if (w0 > 1024 || h0 > 1024) { stats.oversizedWarnings++; appendLog(`⚠️ Oversized: ${name} (${w0}x${h0})`); }
          const { tW, tH, smoothing } = computeTargetSize({ w0, h0, policy, modeConfig });
          const res = await pool.runPngJob({ buffer: buf, w0, h0, tW, tH, smoothing, sizeGuard: true, doAlphaClean, doSingleColor });
          if (res?.singleColor) {
            stats.pngSingleColor++; stats.pngOptimized++; appendLog(`PNG single-color→1×1: ${name}`);
          } else if (res?.changed) {
            stats.pngOptimized++;
            if (res.alphaFixed > 0) stats.pngAlphaCleaned++;
            if (tW !== w0 || tH !== h0) appendLog(`PNG resized: ${name} (${w0}x${h0}→${tW}x${tH})`);
            else if (res.alphaFixed > 0) appendLog(`PNG alpha cleaned: ${name}`);
          }
          outZip.file(name, res?.out || buf); updateProgress(); continue;
        }

        if (lower.endsWith(".json") || lower.endsWith(".mcmeta")) {
          stats.jsonCount++;
          const text = await entry.async("string");
          if (modeConfig.minifyJson) {
            try {
              let obj = JSON.parse(text);
              if (doDeepCleanJson) {
                const before = JSON.stringify(obj).length;
                obj = deepCleanJson(obj, lower);
                if (JSON.stringify(obj).length < before) stats.jsonDeepCleaned++;
              }
              outZip.file(name, JSON.stringify(obj)); stats.jsonMinified++;
            } catch { outZip.file(name, text); }
          } else { outZip.file(name, text); }
          updateProgress(); continue;
        }

        outZip.file(name, await entry.async("arraybuffer")); updateProgress();
      }

      outZip.file("GHAIZERS_CREDIT.txt", CREDIT_TXT);
      outZip.file("JANGAN_BAYAR_INI.txt",
        "⚠️  PERINGATAN PENTING!\n\nJika kamu MEMBAYAR untuk mendapatkan tool ini, kamu sedang DITIPU!\n\n" +
        "Tool Ghaizers2.0 oleh ghaa (KhaizenNomazen) adalah GRATIS.\n" +
        "Laporkan: github.com/KhaizenNomazen\n\n" +
        "Menjual tool/output ini = MELANGGAR UU Hak Cipta No. 28 Tahun 2014"
      );
      appendLog("Credit files injected ✔");

      if (iconFile) {
        appendLog("Override pack.png dari icon upload...");
        outZip.file("pack.png", await buildPackIcon(iconFile));
      }

      appendLog("Menyusun ZIP...");
      const optimizedBlob = await outZip.generateAsync({
        type: "blob", compression: "DEFLATE",
        compressionOptions: { level: Math.max(1, Math.min(9, zipCompressionLevel)) },
        comment: "Optimized by Ghaizers2.0 | (c) ghaa (KhaizenNomazen) | GRATIS | github.com/KhaizenNomazen"
      });

      const sha1 = await sha1HexFromBlob(optimizedBlob);
      if (sha1) appendLog(`SHA-1: ${sha1}`);
      CREDIT_BANNER.forEach(line => appendLog(line));
      appendLog("Selesai ✔ Download dimulai...");
      triggerDownload(optimizedBlob, "optimize_file.zip");

      setSummary({
        ...stats, originalSize: file.size, optimizedSize: optimizedBlob.size,
        sha1: sha1 || null, workers: computedWorkerCount, compressionLevel: zipCompressionLevel
      });
      flushLogs();
      setProgress({ done: totalToProcess, total: totalToProcess, etaSec: 0 });
    } catch (e) {
      appendLog("ERROR: " + e.message); flushLogs();
    } finally {
      pool.destroy(); setIsProcessing(false);
    }
  };

  return (
    <>
      {/* ==================== SEO HEAD ==================== */}
      <Head>
        <title>Minecraft Resource Pack Optimizer Gratis – Ghaizers2.0</title>
        <meta name="description" content="Optimize resource pack Minecraft kamu secara gratis dan otomatis. Kompres PNG, JSON, OGG tanpa kehilangan kualitas. Cocok untuk Pojav Launcher, HP low-end, dan Bedrock. 100% client-side, aman, cepat." />
        <meta name="keywords" content="optimize resource pack minecraft, minecraft pack optimizer, kompres texture pack minecraft, pojav launcher resource pack ringan, minecraft pack optimizer gratis, optimize texture pack, ghaizers, resource pack compressor" />

        {/* Open Graph (WhatsApp, Facebook preview) */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://optimizer.ghaa.my.id" />
        <meta property="og:title" content="Minecraft Resource Pack Optimizer Gratis – Ghaizers2.0" />
        <meta property="og:description" content="Tool gratis untuk mengoptimasi resource pack Minecraft. Ringankan pack untuk Pojav, HP low-end, dan Bedrock. Dibuat oleh ghaa." />
        <meta property="og:image" content="https://optimizer.ghaa.my.id/og-image.png" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Minecraft Resource Pack Optimizer Gratis – Ghaizers2.0" />
        <meta name="twitter:description" content="Optimize resource pack Minecraft gratis. PNG, JSON, OGG. Cocok Pojav & low-end." />

        {/* Canonical & robots */}
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://optimizer.ghaa.my.id" />

        {/* Structured Data (JSON-LD) — bantu Google ngerti ini WebApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Ghaizers2.0 – Minecraft Resource Pack Optimizer",
              "url": "https://optimizer.ghaa.my.id",
              "description": "Tool gratis untuk mengoptimasi resource pack Minecraft. Kompres PNG, JSON, OGG secara otomatis.",
              "applicationCategory": "UtilitiesApplication",
              "operatingSystem": "Any",
              "offers": { "@type": "Offer", "price": "0", "priceCurrency": "IDR" },
              "author": { "@type": "Person", "name": "ghaa (KhaizenNomazen)", "url": "https://github.com/KhaizenNomazen" }
            })
          }}
        />
      </Head>
      {/* ==================== END SEO HEAD ==================== */}

      <div className="page">
        <div className="grid-pattern" />
        <div className="background-orbit" />
        <div className="background-orbit bg-2" />
        <div className="background-gradient" />

        <div className="watermark-topbar">
          ⚠️ Tool ini 100% GRATIS oleh <strong>ghaa</strong> — Jika kamu membayar untuk ini, kamu DITIPU! &nbsp;|&nbsp;
          <a href="https://github.com/KhaizenNomazen" target="_blank" rel="noopener noreferrer">github.com/KhaizenNomazen</a>
        </div>

        <main className="container">
          <div className="glass-card">
            <header className="header">
              <div className="header-content">
                <div className="header-left">
                  <h1>Minecraft Pack Optimizer</h1>
                  <p>Client-side • Web Workers • IHDR precheck • OGG Safe • Alpha Cleanup • Single-Color Detect • SHA-1</p>
                  <p className="header-credit">
                    Made with 💚 by <strong>ghaa</strong> (KhaizenNomazen) &nbsp;•&nbsp;
                    Tool ini <span className="credit-free">GRATIS</span> selamanya &nbsp;•&nbsp;
                    <a href="https://github.com/KhaizenNomazen" target="_blank" rel="noopener noreferrer">github.com/KhaizenNomazen</a>
                  </p>
                </div>
                <div className="header-right">
                  <span className="badge">v2.0</span>
                  <span className="badge-credit">by ghaa</span>
                </div>
              </div>
            </header>

            <div className="legal-banner">
              <div className="legal-banner-icon">⚠️</div>
              <div className="legal-banner-text">
                <strong>PERINGATAN HUKUM:</strong> Menjual tool ini tanpa izin = pelanggaran <strong>UU Hak Cipta No. 28 Tahun 2014</strong>.
                Pidana max 10 tahun &amp; denda max Rp 4 miliar. Tool ini <strong>GRATIS</strong> — laporkan penjual ke{" "}
                <a href="https://github.com/KhaizenNomazen" target="_blank" rel="noopener noreferrer">github.com/KhaizenNomazen</a>
              </div>
            </div>

            <div className="main-content">
              {/* 1. Upload */}
              <section className="section">
                <div className="section-header"><div className="section-number">1</div><h2>Upload Resource Pack</h2></div>
                <p className="section-sub">Upload file <code>.zip</code> resource pack Minecraft. Semua proses berjalan di browser, tidak diupload ke server.</p>
                <input type="file" accept=".zip" id="inputFile" className="hidden-input" disabled={isProcessing} onChange={onMainFileChange} />
                <label htmlFor="inputFile" className={`upload-label ${isProcessing ? "disabled" : ""}`}>
                  <div className="upload-content">
                    <div className="upload-icon">📦</div>
                    <div className="upload-title">{fileName || "Klik untuk memilih file .zip"}</div>
                    <div className="upload-sub">{fileName ? `${(file?.size / 1e6).toFixed(2)} MB` : "Proses 100% client-side"}</div>
                  </div>
                </label>
              </section>

              {/* 2. Mode */}
              <section className="section">
                <div className="section-header"><div className="section-number">2</div><h2>Pilih Mode Optimasi</h2></div>
                <p className="section-sub">Setiap mode memiliki karakteristik berbeda sesuai kebutuhan device kamu.</p>
                <div className="mode-grid">
                  {Object.values(MODES).map(m => (
                    <button key={m.id} className={`mode-card ${m.id === mode ? "mode-active" : ""}`}
                      disabled={isProcessing} onClick={() => setMode(m.id)}>
                      <div className="mode-title-row"><span>{m.label}</span>{mode === m.id && <span className="mode-dot" />}</div>
                      <p className="mode-desc">{m.description}</p>
                      <ul className="mode-meta">
                        <li>Scale: {Math.round(m.scale * 100)}%</li>
                        <li>Max: {m.maxSize}px</li>
                        <li>Minify: {m.minifyJson ? "Ya" : "Tidak"}</li>
                      </ul>
                    </button>
                  ))}
                </div>
              </section>

              {/* 3. Slider */}
              <section className="section">
                <div className="section-header"><div className="section-number">3</div><h2>Fine-tune Resolusi</h2></div>
                <p className="section-sub">Sesuaikan resolusi dari mode yang dipilih.</p>
                <div className="slider-row">
                  <input type="range" min="40" max="120" value={resolutionPercent}
                    onChange={e => setResolutionPercent(Number(e.target.value))}
                    className="slider" disabled={isProcessing}
                    style={{ "--value": `${((resolutionPercent - 40) / 80) * 100}%` }} />
                  <div className="slider-value">{resolutionPercent}%</div>
                </div>
                <div className="button-row">
                  {[40, 60, 80, 100, 120].map(v => (
                    <button key={v} className="primary-button" onClick={() => setResolutionPercent(v)} disabled={isProcessing}>{v}%</button>
                  ))}
                </div>
              </section>

              {/* 4. Opsi */}
              <section className="section">
                <div className="section-header"><div className="section-number">4</div><h2>Opsi Optimasi</h2></div>
                <div className="checkbox-wrapper">
                  <input type="checkbox" id="pixelArt" checked={preservePixelArt} onChange={e => setPreservePixelArt(e.target.checked)} disabled={isProcessing} />
                  <label htmlFor="pixelArt"><strong>Preserve Pixel Art</strong> — Jaga ketajaman GUI/font</label>
                </div>
                <div className="checkbox-wrapper">
                  <input type="checkbox" id="oggOpt" checked={optimizeOgg} onChange={e => setOptimizeOgg(e.target.checked)} disabled={isProcessing} />
                  <label htmlFor="oggOpt"><strong>Optimize Sound (.ogg)</strong> — Hapus metadata tanpa re-encode</label>
                </div>
                <div className="checkbox-wrapper">
                  <input type="checkbox" id="alphaClean" checked={doAlphaClean} onChange={e => setDoAlphaClean(e.target.checked)} disabled={isProcessing} />
                  <label htmlFor="alphaClean"><strong>Alpha Pixel Cleanup</strong> — Zero RGB pixel transparan → ZIP lebih kecil (no visual loss)</label>
                </div>
                <div className="checkbox-wrapper">
                  <input type="checkbox" id="singleColor" checked={doSingleColor} onChange={e => setDoSingleColor(e.target.checked)} disabled={isProcessing} />
                  <label htmlFor="singleColor"><strong>Single-Color Detect</strong> — PNG solid 1 warna → resize ke 1×1 (teknik PackSquash)</label>
                </div>
                <div className="checkbox-wrapper">
                  <input type="checkbox" id="deepJson" checked={doDeepCleanJson} onChange={e => setDoDeepCleanJson(e.target.checked)} disabled={isProcessing} />
                  <label htmlFor="deepJson"><strong>Deep JSON Clean</strong> — Hapus field __comment, entry sounds kosong, dll</label>
                </div>
                <div className="checkbox-wrapper">
                  <input type="checkbox" id="shaderMin" checked={doShaderMinify} onChange={e => setDoShaderMinify(e.target.checked)} disabled={isProcessing} />
                  <label htmlFor="shaderMin"><strong>Shader/Properties Minify</strong> — Minify .fsh/.vsh/.glsl/.properties (OptiFine)</label>
                </div>
              </section>

              {/* 5. Advanced */}
              <section className="section">
                <div className="section-header"><div className="section-number">5</div><h2>Pengaturan Lanjutan</h2></div>
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 8, opacity: 0.9 }}>ZIP Compression Level</h3>
                  <div className="slider-row">
                    <input type="range" min="1" max="9" value={zipCompressionLevel}
                      onChange={e => setZipCompressionLevel(Number(e.target.value))}
                      className="slider" disabled={isProcessing}
                      style={{ "--value": `${((zipCompressionLevel - 1) / 8) * 100}%` }} />
                    <div className="slider-value">Level {zipCompressionLevel}</div>
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: 16, marginBottom: 8, opacity: 0.9 }}>Web Workers</h3>
                  <div className="button-row">
                    <button className="primary-button" disabled={isProcessing} onClick={() => setWorkerCount(0)}>Auto ({computedWorkerCount})</button>
                    {[2, 3, 4].map(v => (
                      <button key={v} className="primary-button" disabled={isProcessing} onClick={() => setWorkerCount(v)}>{v} Workers</button>
                    ))}
                  </div>
                </div>
              </section>

              {/* 6. Icon */}
              <section className="section">
                <div className="section-header"><div className="section-number">6</div><h2>Custom Pack Icon</h2></div>
                <input type="file" accept="image/png,image/jpeg,image/jpg" id="iconFile" className="hidden-input" disabled={isProcessing} onChange={onIconChange} />
                <label htmlFor="iconFile" className={`upload-label ${isProcessing ? "disabled" : ""}`}>
                  <div className="upload-content">
                    <div className="upload-icon">🖼️</div>
                    <div className="upload-title">{iconFile ? iconFile.name : "Klik untuk pilih gambar icon"}</div>
                    <div className="upload-sub">PNG atau JPG • Auto-resize 128×128</div>
                  </div>
                </label>
              </section>

              {/* 7. mcmeta */}
              <section className="section">
                <div className="section-header"><div className="section-number">7</div><h2>pack.mcmeta Editor</h2></div>
                <p className="section-sub">Edit konten pack.mcmeta. <strong>Credit ghaa akan otomatis diinjeksi.</strong></p>
                {mcmetaError && <p className="section-sub" style={{ color: "#ef4444" }}>{mcmetaError}</p>}
                {mcmetaLoaded ? (
                  <textarea className="mcmeta-textarea" rows={8} value={mcmetaText}
                    onChange={e => setMcmetaText(e.target.value)} disabled={isProcessing}
                    placeholder='{"pack": {"pack_format": 8, "description": "..."}}' />
                ) : (
                  <p className="section-sub" style={{ fontStyle: "italic", marginTop: 12, opacity: 0.6 }}>pack.mcmeta tidak ditemukan atau belum di-load.</p>
                )}
              </section>

              {/* 8. Pojav Log */}
              <section className="section">
                <div className="section-header"><div className="section-number">8</div><h2>Pojav Log Auto-Fix</h2></div>
                <input type="file" accept=".txt" id="logFile" className="hidden-input" disabled={isProcessing} onChange={onLogFileChange} />
                <label htmlFor="logFile" className={`upload-label ${isProcessing ? "disabled" : ""}`}>
                  <div className="upload-content">
                    <div className="upload-icon">📝</div>
                    <div className="upload-title">Klik untuk pilih latestlog.txt</div>
                    <div className="upload-sub">Terdeteksi: <strong>{dynamicStripPaths.length}</strong> path enforce-strip</div>
                  </div>
                </label>
              </section>

              {/* 9. Progress */}
              <section className="section">
                <div className="section-header"><div className="section-number">9</div><h2>Progress</h2></div>
                <div className="progress-wrapper">
                  <div className="progress-bar-container">
                    <div className="progress-bar">
                      <div className="progress-bar-fill"
                        style={{ width: progress.total ? `${Math.round((progress.done / progress.total) * 100)}%` : "0%" }} />
                    </div>
                    <div className="progress-text">
                      {progress.total ? `${progress.done}/${progress.total}` : "0/0"}
                      {progress.etaSec != null && progress.etaSec > 0 ? ` • ETA ${progress.etaSec}s` : ""}
                    </div>
                  </div>
                </div>
              </section>

              {/* 10. Optimize */}
              <section className="section">
                <div className="section-header"><div className="section-number">10</div><h2>Optimize</h2></div>
                <div className="button-row">
                  <button className="primary-button optimize-button" onClick={handleOptimize} disabled={isProcessing || !file}>
                    {isProcessing ? "🔄 Sedang mengoptimasi..." : !file ? "📦 Upload pack dulu" : "✨ Optimize Sekarang"}
                  </button>
                </div>
              </section>

              {/* 11. Console */}
              <section className="section">
                <div className="section-header"><div className="section-number">11</div><h2>Console Output</h2></div>
                <div className="console" ref={logRef}>
                  {logs.length === 0 ? (
                    <div className="console-placeholder">Belum ada log. Upload pack dan klik &quot;Optimize Sekarang&quot;.</div>
                  ) : (
                    logs.map((l, i) => <div key={i} className="console-line">{l}</div>)
                  )}
                </div>
              </section>

              {/* Summary */}
              {summary && (
                <section className="section">
                  <div className="section-header"><div className="section-number">✓</div><h2>Hasil Optimasi</h2></div>
                  <div className="summary-grid">
                    <Summary label="Ukuran File" value={`${(summary.originalSize / 1e6).toFixed(2)} MB → ${(summary.optimizedSize / 1e6).toFixed(2)} MB`} />
                    <Summary label="Penghematan" value={`${(((summary.originalSize - summary.optimizedSize) / summary.originalSize) * 100).toFixed(1)}%`} />
                    <Summary label="PNG Optimized" value={`${summary.pngOptimized} / ${summary.pngCount}`} />
                    <Summary label="PNG Skipped" value={summary.pngSkippedByIHDR} />
                    {summary.pngSingleColor > 0 && <Summary label="PNG Single-Color→1×1" value={summary.pngSingleColor} />}
                    {summary.pngAlphaCleaned > 0 && <Summary label="PNG Alpha Cleaned" value={summary.pngAlphaCleaned} />}
                    {summary.oggCount > 0 && <Summary label="Sound (.ogg)" value={`${summary.oggOptimized} / ${summary.oggCount}`} />}
                    <Summary label="JSON Minified" value={`${summary.jsonMinified} / ${summary.jsonCount}`} />
                    {summary.jsonDeepCleaned > 0 && <Summary label="JSON Deep Cleaned" value={summary.jsonDeepCleaned} />}
                    {summary.shaderCount > 0 && <Summary label="Shader Minified" value={`${summary.shaderMinified} / ${summary.shaderCount}`} />}
                    {summary.oversizedWarnings > 0 && <Summary label="⚠️ Oversized Textures" value={summary.oversizedWarnings} />}
                    <Summary label="Files Removed" value={summary.removed} />
                    <Summary label="Workers Used" value={summary.workers} />
                    {summary.sha1 && (
                      <Summary label="SHA-1 Hash" value={
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "monospace", fontSize: 11 }}>{summary.sha1.substring(0, 16)}...</span>
                          <button className="primary-button" style={{ padding: "4px 12px", fontSize: 11 }}
                            onClick={() => navigator.clipboard?.writeText(summary.sha1)}>Copy</button>
                        </div>
                      } />
                    )}
                  </div>
                  <p className="section-sub" style={{ marginTop: 20, textAlign: "center" }}>
                    ✅ <code>optimize_file.zip</code> sudah ter-download • Credit ghaa sudah diinjeksi
                  </p>
                </section>
              )}
            </div>

            <footer className="footer">
              <div className="footer-credit-box">
                <p className="footer-title">⚡ Ghaizers2.0 — Minecraft Resource Pack Optimizer</p>
                <p className="footer-author">Made with 💚 by <strong>ghaa</strong> (KhaizenNomazen)</p>
                <p className="footer-free">🆓 Tool ini GRATIS selamanya — Jangan bayar siapapun untuk ini!</p>
                <p className="footer-legal">⚖️ Menjual tool ini = Pelanggaran UU Hak Cipta No. 28/2014 — Pidana max 10 tahun &amp; denda max Rp 4 miliar</p>
                <a className="footer-link" href="https://github.com/KhaizenNomazen" target="_blank" rel="noopener noreferrer">
                  🔗 github.com/KhaizenNomazen — Laporkan penyalahgunaan di sini
                </a>
              </div>
              {/* SEO-friendly footer text */}
              <p style={{ fontSize: 12, marginTop: 16, opacity: 0.5, textAlign: "center", lineHeight: 1.6 }}>
                Tool optimize resource pack Minecraft gratis • Kompres texture pack • Ringankan pack untuk Pojav Launcher &amp; HP low-end<br />
                Mendukung Minecraft Java &amp; Bedrock • PNG resize • OGG optimize • JSON minify • SHA-1 verify
              </p>
              <p style={{ fontSize: 11, marginTop: 8, opacity: 0.3 }}>
                IHDR Skip • Web Workers • OGG Safe • Alpha Cleanup • Single-Color Detect • Deep JSON Clean • Shader Minify • SHA-1 • Size Guard
              </p>
            </footer>
          </div>
        </main>
      </div>
    </>
  );
}
