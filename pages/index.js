import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";

/* =========================
   MODE PRESET (dasar)
========================= */
const MODES = {
  normal: {
    id: "normal",
    label: "Normal",
    description: "Seimbang, kualitas bagus dan pack tetap ringan.",
    scale: 0.85,
    maxSize: 512,
    minSize: 16,
    minifyJson: true
  },
  extreme: {
    id: "extreme",
    label: "Extreme",
    description: "Sangat hemat, cocok untuk device mid–low.",
    scale: 0.6,
    maxSize: 256,
    minSize: 8,
    minifyJson: true
  },
  ultra: {
    id: "ultra",
    label: "Ultra Extreme",
    description: "Paling ringan, untuk HP kentang / Pojav lemah.",
    scale: 0.4,
    maxSize: 128,
    minSize: 4,
    minifyJson: true
  }
};

/* =========================
   POLICY STATIS PER KATEGORI
   (dievaluasi berurutan)
========================= */
const BASE_POLICIES = [
  // GUI & FONT → jaga ketajaman
  { pattern: /textures\/gui\//, smoothing: "nearest", minSize: 16, scaleMul: 1.0 },
  { pattern: /textures\/font\//, smoothing: "nearest", minSize: 16, scaleMul: 1.0, skipResize: true },

  // ModelEngine → paksa animated strip + batasi tinggi
  { pattern: /modelengine\//, enforceStrip: true, maxHeight: 8192, smoothing: "smooth" },

  // Colormap & Maps → data sensitif → skip
  { pattern: /colormap\//, skip: true },
  { pattern: /maps\//, skip: true },

  // Entity/mob → moderat
  { pattern: /textures\/entity\//, scaleMul: 0.85 },

  // Particles → agresif (biasanya kecil & banyak)
  { pattern: /textures\/particle\//, scaleMul: 0.75, smoothing: "nearest" },

  // Default
  { pattern: /.*/, scaleMul: 1.0 }
];

function getPolicyForPath(lowerPath, dynamicStripPaths) {
  // 1) dynamic enforceStrip dari log (prioritas tertinggi)
  if (Array.isArray(dynamicStripPaths)) {
    for (let i = 0; i < dynamicStripPaths.length; i++) {
      const key = dynamicStripPaths[i];
      if (key && lowerPath.includes(key)) {
        return { enforceStrip: true, smoothing: "smooth" };
      }
    }
  }

  // 2) base policies
  for (let i = 0; i < BASE_POLICIES.length; i++) {
    if (BASE_POLICIES[i].pattern.test(lowerPath)) {
      return { ...BASE_POLICIES[i] };
    }
  }

  return { scaleMul: 1.0 };
}

/* ========== FILTER FILE NON-GAME ========== */
function shouldExcludeNonGameFile(lower) {
  if (
    lower.endsWith(".psd") ||
    lower.endsWith(".xcf") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    lower.endsWith(".bak") ||
    lower.endsWith(".zip")
  )
    return true;

  // aset utama: jangan buang
  if (
    lower.endsWith(".png") ||
    lower.endsWith(".json") ||
    lower.endsWith(".mcmeta") ||
    lower.endsWith(".properties") ||
    lower.endsWith(".ogg")
  )
    return false;

  if (
    lower.includes("/raw/") ||
    lower.includes("/backup/") ||
    lower.includes("/unused/") ||
    lower.includes("/temp/")
  ) {
    if (
      lower.endsWith(".png") ||
      lower.endsWith(".json") ||
      lower.endsWith(".mcmeta") ||
      lower.endsWith(".ogg")
    )
      return false;
    return true;
  }
  return false;
}

/* ========== PARSER LOG POJAV (Auto-Fix) ========== */
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
  const s = new Set();
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const v = (arr[i] || "").toLowerCase();
    if (!s.has(v)) {
      s.add(v);
      out.push(v);
    }
  }
  return out;
}

/* ========== PNG IHDR FAST SIZE PARSE (tanpa decode) ==========
   PNG signature 8 bytes, lalu chunk: [len(4)][type(4)] => IHDR harus pertama
   IHDR data: width(4) height(4) ... big endian
   Spec: IHDR width/height 4-byte integers. 4
=============================================================== */
function readPngIHDRSize(buffer) {
  try {
    const u8 = new Uint8Array(buffer);
    if (u8.length < 24) return null;

    // signature 8 bytes
    const sig = [137, 80, 78, 71, 13, 10, 26, 10];
    for (let i = 0; i < 8; i++) if (u8[i] !== sig[i]) return null;

    // chunk length (4) at 8..11, type at 12..15
    const type =
      String.fromCharCode(u8[12]) +
      String.fromCharCode(u8[13]) +
      String.fromCharCode(u8[14]) +
      String.fromCharCode(u8[15]);
    if (type !== "IHDR") return null;

    // IHDR data starts at 16
    const dv = new DataView(buffer);
    const w = dv.getUint32(16, false);
    const h = dv.getUint32(20, false);
    if (!w || !h) return null;
    return { w, h };
  } catch {
    return null;
  }
}

/* ========== ANIMATED STRIP DETECTOR ========== */
function detectAnimatedStrip(width, height) {
  if (!width || !height) return null;
  if (height <= width) return null;
  const frames = height / width;
  if (!Number.isInteger(frames) || frames < 2) return null;
  return frames;
}

/* ========== SAFE OGG OPTIMIZER ==========
   - Hapus ID3v2 awal ("ID3")
   - Hapus ID3v1 akhir ("TAG" 128 byte)
   - Hapus trailing 0x00
======================================== */
async function optimizeOggSafe(buffer) {
  try {
    const bytes = new Uint8Array(buffer);
    const len = bytes.length;
    if (len < 16) return { out: buffer, changed: false };

    let start = 0;
    let end = len;
    let changed = false;

    // ID3v2
    if (len >= 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
      const size =
        ((bytes[6] & 0x7f) << 21) |
        ((bytes[7] & 0x7f) << 14) |
        ((bytes[8] & 0x7f) << 7) |
        (bytes[9] & 0x7f);
      const headerLen = 10 + size;
      if (headerLen < end) {
        start = headerLen;
        changed = true;
      }
    }

    // ID3v1
    if (end - start > 128) {
      const tagPos = end - 128;
      if (
        bytes[tagPos] === 0x54 &&
        bytes[tagPos + 1] === 0x41 &&
        bytes[tagPos + 2] === 0x47
      ) {
        end = tagPos;
        changed = true;
      }
    }

    while (end > start && bytes[end - 1] === 0x00) {
      end--;
      changed = true;
    }

    if (!changed || end <= start) return { out: buffer, changed: false };

    const trimmed = bytes.subarray(start, end);
    const out = new Uint8Array(trimmed.length);
    out.set(trimmed);
    return { out: out.buffer, changed: true };
  } catch {
    return { out: buffer, changed: false };
  }
}

/* ========== BUILD pack.png DARI ICON ========== */
async function buildPackIcon(file) {
  const buf = await file.arrayBuffer();
  const blob = new Blob([buf], { type: file.type || "image/png" });

  const img = await createImageBitmap(blob);
  const target = 128;

  const canvas = document.createElement("canvas");
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, target, target);
  const scale = Math.min(target / img.width, target / img.height, 1);
  const dw = Math.round(img.width * scale);
  const dh = Math.round(img.height * scale);
  const ox = Math.floor((target - dw) / 2);
  const oy = Math.floor((target - dh) / 2);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, ox, oy, dw, dh);

  const outBlob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b || blob), "image/png", 0.92)
  );
  return await outBlob.arrayBuffer();
}

/* ========== SHA-1 dari Blob (WebCrypto) ==========
   WebCrypto subtle.digest tersedia di Chrome (secure origin). 5
================================================== */
async function sha1HexFromBlob(blob) {
  try {
    if (typeof window === "undefined" || !window.crypto?.subtle) return null;
    const ab = await blob.arrayBuffer();
    const hash = await window.crypto.subtle.digest("SHA-1", ab);
    const bytes = new Uint8Array(hash);
    let hex = "";
    for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
    return hex;
  } catch {
    return null;
  }
}

/* ========== DOWNLOAD ========= */
function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* =========================
   WORKER POOL (PNG resize)
   - OffscreenCanvas di Worker (supported) 6
========================= */
function makePngWorkerURL() {
  const workerCode = `
    self.onmessage = async (ev) => {
      const msg = ev.data;
      if (!msg || msg.type !== "png") return;

      const { id, buffer, w0, h0, tW, tH, smoothing, sizeGuard } = msg;

      try {
        // quick bail
        if (!buffer || !tW || !tH || (tW === w0 && tH === h0)) {
          self.postMessage({ id, ok: true, out: buffer, changed: false }, buffer ? [buffer] : []);
          return;
        }

        const originalSize = buffer.byteLength || 0;

        const blob = new Blob([buffer], { type: "image/png" });
        const bmp = await createImageBitmap(blob);

        const canvas = new OffscreenCanvas(tW, tH);
        const ctx = canvas.getContext("2d");

        const nearest = smoothing === "nearest";
        ctx.imageSmoothingEnabled = !nearest;
        ctx.imageSmoothingQuality = nearest ? "low" : "high";

        ctx.clearRect(0, 0, tW, tH);
        ctx.drawImage(bmp, 0, 0, tW, tH);

        // convert to blob, then to arraybuffer
        const outBlob = await canvas.convertToBlob({ type: "image/png" });
        const outBuf = await outBlob.arrayBuffer();

        // size guard: kalau lebih gede / sama, balikin original
        if (sizeGuard && outBuf.byteLength >= originalSize) {
          self.postMessage({ id, ok: true, out: buffer, changed: false, guarded: true }, [buffer]);
          return;
        }

        self.postMessage({ id, ok: true, out: outBuf, changed: true, guarded: false }, [outBuf]);
      } catch (e) {
        // fallback: return original
        try {
          self.postMessage({ id, ok: false, error: String(e?.message || e), out: buffer, changed: false }, [buffer]);
        } catch {
          self.postMessage({ id, ok: false, error: String(e?.message || e), out: null, changed: false });
        }
      }
    };
  `;
  const blob = new Blob([workerCode], { type: "application/javascript" });
  return URL.createObjectURL(blob);
}

function createWorkerPool(size) {
  const url = makePngWorkerURL();
  const workers = [];
  const free = [];
  const pending = new Map();
  let seq = 0;

  function spawn() {
    const w = new Worker(url);
    w.onmessage = (ev) => {
      const { id, ok, out, changed, guarded, error } = ev.data || {};
      const cb = pending.get(id);
      if (cb) {
        pending.delete(id);
        cb.resolve({ ok, out, changed, guarded, error });
      }
      free.push(w);
      pump();
    };
    w.onerror = (err) => {
      // reject all pending? keep simple: mark worker free
      free.push(w);
      pump();
    };
    workers.push(w);
    free.push(w);
  }

  for (let i = 0; i < size; i++) spawn();

  const queue = [];
  function pump() {
    while (free.length > 0 && queue.length > 0) {
      const w = free.pop();
      const job = queue.shift();
      pending.set(job.id, job);
      // transfer buffer
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

  function destroy() {
    for (const w of workers) w.terminate();
    URL.revokeObjectURL(url);
  }

  return { runPngJob, destroy };
}

/* =========================
   TARGET SIZE CALC (tanpa decode)
========================= */
function computeTargetSize({ w0, h0, policy, modeConfig }) {
  const { scale, minSize, maxSize, preservePixelArt } = modeConfig;

  const frames = detectAnimatedStrip(w0, h0);
  const baseScale = Math.max(0.01, scale) * (policy.scaleMul || 1.0);

  let tW = Math.round(w0 * baseScale);
  const minAllowed = Math.max(minSize, policy.minSize || 0);
  tW = Math.min(Math.max(tW, minAllowed), maxSize);

  let tH;

  if (frames || policy.enforceStrip) {
    // kalau enforceStrip tapi frames null, jangan nebak ngawur:
    // fallback aman: pakai ratio existing (round) tapi tetep menjaga divisible
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
    if (maxSide > maxSize) {
      const fac = maxSize / maxSide;
      tW = Math.round(tW * fac);
      hScaled = Math.round(hScaled * fac);
    }

    let minSide = Math.min(tW, hScaled);
    if (minSide < minAllowed) {
      const fac = minAllowed / minSide;
      tW = Math.round(tW * fac);
      hScaled = Math.round(hScaled * fac);
    }
    tH = hScaled;
  }

  const smoothing = policy.smoothing || (preservePixelArt ? "nearest" : "smooth");
  return { tW, tH, smoothing };
}

/* =========================
   UI COMPONENTS
========================= */
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
  const [resolutionPercent, setResolutionPercent] = useState(100); // 40..120
  const [preservePixelArt, setPreservePixelArt] = useState(true);
  const [optimizeOgg, setOptimizeOgg] = useState(true);

  const [zipCompressionLevel, setZipCompressionLevel] = useState(6); // default cepat (level 9 lambat)
  const [workerCount, setWorkerCount] = useState(0); // auto

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

  // progress
  const [progress, setProgress] = useState({ done: 0, total: 0, etaSec: null });

  // log batching
  const logBufferRef = useRef([]);
  const flushTimerRef = useRef(null);

  const computedWorkerCount = useMemo(() => {
    const hc = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
    // chrome android: 2-4 worker cukup, jangan kebanyakan biar ga overheat
    const suggested = Math.max(2, Math.min(4, Math.floor(hc / 2) || 2));
    return workerCount > 0 ? workerCount : suggested;
  }, [workerCount]);

  const flushLogs = () => {
    const buf = logBufferRef.current;
    if (!buf.length) return;
    setLogs((prev) => [...prev, ...buf.splice(0, buf.length)]);
    setTimeout(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, 10);
  };

  const appendLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    logBufferRef.current.push(`[${time}] ${msg}`);
    if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null;
        flushLogs();
      }, 250);
    }
  };

  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    };
  }, []);

  /* ========= INPUT: PACK ========= */
  const onMainFileChange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;

    setFile(f);
    setFileName(f.name);
    setSummary(null);
    setLogs([]);
    logBufferRef.current = [];
    setProgress({ done: 0, total: 0, etaSec: null });

    setMcmetaText("");
    setMcmetaLoaded(false);
    setMcmetaError("");
    appendLog(`File diterima: ${f.name} (${(f.size / 1e6).toFixed(2)} MB)`);

    await inspectZipForMcmeta(f);
  };

  /* ========= INPUT: ICON ========= */
  const onIconChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setIconFile(f);
    appendLog(`Icon pack dipilih: ${f.name}`);
  };

  /* ========= INPUT: LOG POJAV ========= */
  const onLogFileChange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const text = await f.text();
    const parsed = parsePojavLog(text);
    if (parsed.enforceStrip.length > 0) {
      appendLog(`Auto-Fix: ${parsed.enforceStrip.length} path akan di-enforce strip.`);
      setDynamicStripPaths((prev) => uniqueLower([...prev, ...parsed.enforceStrip]));
    } else {
      appendLog("Auto-Fix: tidak ada path animated strip bermasalah di log.");
    }
    if (parsed.missing.length > 0) {
      appendLog(
        `Missing sprite terdeteksi (${parsed.missing.length}) — ini masalah pack asli, bukan optimizer.`
      );
    }
  };

  /* ========= BACA pack.mcmeta ========= */
  const inspectZipForMcmeta = async (f) => {
    try {
      appendLog("Membaca pack.mcmeta dari ZIP...");
      const zip = await JSZip.loadAsync(f);
      const entries = Object.values(zip.files);
      const mcmetaEntry = entries.find((e) => e.name.toLowerCase() === "pack.mcmeta");

      if (!mcmetaEntry) {
        appendLog("pack.mcmeta tidak ditemukan di root pack.");
        setMcmetaLoaded(false);
        setMcmetaText("");
        setMcmetaError("");
        return;
      }

      const text = await mcmetaEntry.async("string");
      setMcmetaText(text);
      setMcmetaLoaded(true);
      setMcmetaError("");
      appendLog("pack.mcmeta berhasil dibaca. Kamu bisa mengeditnya.");
    } catch (e) {
      setMcmetaLoaded(false);
      setMcmetaText("");
      setMcmetaError("Gagal membaca pack.mcmeta");
      appendLog("Gagal membaca pack.mcmeta: " + e.message);
    }
  };

  /* ========= OPTIMIZER UTAMA ========= */
  const handleOptimize = async () => {
    if (!file) {
      appendLog("Pilih resource pack (.zip) dulu.");
      return;
    }

    const baseMode = MODES[mode];
    const effectiveScale = baseMode.scale * (resolutionPercent / 100);

    const modeConfig = {
      ...baseMode,
      scale: effectiveScale,
      preservePixelArt
    };

    appendLog(`Mode: ${baseMode.label}`);
    appendLog(`Scale efektif: ${(effectiveScale * 100).toFixed(0)}% (slider ${resolutionPercent}%)`);
    appendLog(`PNG precheck: IHDR parse aktif (skip decode kalau ga perlu resize).`);
    appendLog(`Workers: ${computedWorkerCount} (PNG resize off-main-thread)`);
    appendLog(`ZIP compression level: ${zipCompressionLevel} (6 = cepat, 9 = paling kecil tapi lambat)`);
    appendLog(`JSZip: typed-array flow dipakai untuk performa. 7`);

    setIsProcessing(true);
    setSummary(null);
    setProgress({ done: 0, total: 0, etaSec: null });

    const pool = createWorkerPool(computedWorkerCount);
    const t0 = performance.now();

    try {
      const zip = await JSZip.loadAsync(file);
      appendLog("ZIP berhasil dibaca.");

      const outZip = new JSZip();
      const entries = Object.values(zip.files);

      const stats = {
        totalFiles: 0,
        pngCount: 0,
        pngOptimized: 0,
        pngSkippedByIHDR: 0,
        jsonCount: 0,
        jsonMinified: 0,
        removed: 0,
        oggCount: 0,
        oggOptimized: 0
      };

      // set progress total (count files that are not dirs)
      const totalToProcess = entries.filter((e) => !e.dir).length;
      setProgress({ done: 0, total: totalToProcess, etaSec: null });

      let done = 0;
      const updateProgress = () => {
        done++;
        const elapsed = (performance.now() - t0) / 1000;
        const rate = done / Math.max(0.001, elapsed);
        const left = Math.max(0, totalToProcess - done);
        const etaSec = rate > 0 ? Math.round(left / rate) : null;
        // throttle UI updates
        if (done % 20 === 0 || done === totalToProcess) {
          setProgress({ done, total: totalToProcess, etaSec });
        }
      };

      // process sequential JSZip reads, but PNG heavy work parallel via workers
      for (let idx = 0; idx < entries.length; idx++) {
        const entry = entries[idx];

        if (entry.dir) {
          outZip.folder(entry.name);
          continue;
        }

        const name = entry.name;
        const lower = name.toLowerCase();
        stats.totalFiles++;

        if (shouldExcludeNonGameFile(lower)) {
          stats.removed++;
          appendLog(`Dibuang (non-game): ${name}`);
          updateProgress();
          continue;
        }

        // pack.mcmeta
        if (lower === "pack.mcmeta") {
          stats.jsonCount++;
          const original = await entry.async("string");
          let toWrite = original;
          if (mcmetaLoaded && mcmetaText.trim().length > 0) {
            toWrite = mcmetaText;
            appendLog("Menggunakan pack.mcmeta hasil edit user.");
          }

          if (modeConfig.minifyJson) {
            try {
              const obj = JSON.parse(toWrite);
              const minified = JSON.stringify(obj);
              outZip.file(name, minified);
              stats.jsonMinified++;
              appendLog("pack.mcmeta di-minify.");
            } catch {
              outZip.file(name, toWrite);
              appendLog("pack.mcmeta bukan JSON valid, ditulis apa adanya.");
            }
          } else {
            outZip.file(name, toWrite);
          }

          updateProgress();
          continue;
        }

        // OGG safe
        if (lower.endsWith(".ogg")) {
          stats.oggCount++;
          const buf = await entry.async("arraybuffer");

          if (optimizeOgg) {
            const { out, changed } = await optimizeOggSafe(buf);
            if (changed) {
              stats.oggOptimized++;
              appendLog(`OGG safe optimized: ${name} (${buf.byteLength} → ${out.byteLength} bytes)`);
            } else {
              appendLog(`OGG copy (no change): ${name}`);
            }
            outZip.file(name, out);
          } else {
            outZip.file(name, buf);
            appendLog(`OGG copy (optimize off): ${name}`);
          }

          updateProgress();
          continue;
        }

        // PNG (IHDR precheck + worker resize)
        if (lower.endsWith(".png")) {
          stats.pngCount++;

          const policy = getPolicyForPath(lower, dynamicStripPaths);

          // preservePixelArt toggle global
          if (!preservePixelArt && policy.smoothing === "nearest") policy.smoothing = "smooth";

          if (policy.skip) {
            const buf = await entry.async("arraybuffer");
            outZip.file(name, buf);
            appendLog(`PNG skip (policy): ${name}`);
            updateProgress();
            continue;
          }

          if (policy.skipResize) {
            const buf = await entry.async("arraybuffer");
            outZip.file(name, buf);
            appendLog(`PNG skip resize (policy): ${name}`);
            updateProgress();
            continue;
          }

          // read buffer once (typed array path)
          const buf = await entry.async("arraybuffer");

          // micro-early skip: super tiny file (likely no benefit)
          if (buf.byteLength < 2048) {
            outZip.file(name, buf);
            stats.pngSkippedByIHDR++;
            appendLog(`PNG tiny skip (<2KB): ${name}`);
            updateProgress();
            continue;
          }

          const sz = readPngIHDRSize(buf);
          if (!sz) {
            // cannot parse, fallback copy
            outZip.file(name, buf);
            appendLog(`PNG IHDR parse gagal, copy: ${name}`);
            updateProgress();
            continue;
          }

          const { w: w0, h: h0 } = sz;
          const { tW, tH, smoothing } = computeTargetSize({ w0, h0, policy, modeConfig });

          // if same size => skip without decode
          if (tW === w0 && tH === h0) {
            outZip.file(name, buf);
            stats.pngSkippedByIHDR++;
            updateProgress();
            continue;
          }

          // do resize in worker (size guard true)
          const res = await pool.runPngJob({
            buffer: buf,
            w0,
            h0,
            tW,
            tH,
            smoothing,
            sizeGuard: true
          });

          if (res?.changed) {
            stats.pngOptimized++;
            appendLog(`PNG resized: ${name} (${w0}x${h0} → ${tW}x${tH}, ${buf.byteLength} → ${res.out.byteLength} bytes)`);
          } else if (res?.guarded) {
            appendLog(`PNG size-guard (hasil >= asli), keep original: ${name}`);
          }

          outZip.file(name, res?.out || buf);
          updateProgress();
          continue;
        }

        // JSON lain
        if (lower.endsWith(".json")) {
          stats.jsonCount++;
          const text = await entry.async("string");
          if (modeConfig.minifyJson) {
            try {
              const obj = JSON.parse(text);
              const minified = JSON.stringify(obj);
              outZip.file(name, minified);
              stats.jsonMinified++;
              appendLog(`JSON minified: ${name}`);
            } catch {
              outZip.file(name, text);
              appendLog(`JSON invalid (skip minify): ${name}`);
            }
          } else {
            outZip.file(name, text);
          }
          updateProgress();
          continue;
        }

        // lainnya copy
        const content = await entry.async("arraybuffer");
        outZip.file(name, content);
        updateProgress();
      }

      // Override pack icon bila ada
      if (iconFile) {
        appendLog("Menambahkan / override pack.png dari icon upload...");
        const iconBuffer = await buildPackIcon(iconFile);
        outZip.file("pack.png", iconBuffer);
      }

      appendLog("Menyusun ZIP hasil optimasi...");
      // JSZip note: typed arrays & compression choice matters 8
      const optimizedBlob = await outZip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: Math.max(1, Math.min(9, zipCompressionLevel)) }
      });

      const sha1 = await sha1HexFromBlob(optimizedBlob);
      if (sha1) appendLog(`SHA-1 hasil: ${sha1}`);

      appendLog("Selesai ✔ Menyiapkan download optimize_file.zip");
      triggerDownload(optimizedBlob, "optimize_file.zip");

      setSummary({
        ...stats,
        originalSize: file.size,
        optimizedSize: optimizedBlob.size,
        sha1: sha1 || null,
        dynamicStripCount: dynamicStripPaths.length,
        workers: computedWorkerCount,
        compressionLevel: zipCompressionLevel
      });

      appendLog("Optimasi selesai.");
      flushLogs();
      setProgress({ done: totalToProcess, total: totalToProcess, etaSec: 0 });
    } catch (e) {
      appendLog("ERROR: " + e.message);
      flushLogs();
    } finally {
      pool.destroy();
      setIsProcessing(false);
    }
  };

  /* ========= RENDER ========= */
  return (
    <div className="page">
      <div className="background-orbit" />
      <div className="background-orbit bg-2" />
      <div className="background-gradient" />

      <main className="container">
        <div className="glass-card">
          <header className="header">
            <div>
              <h1>Minecraft Pack Optimizer</h1>
              <p>Client-side • Chrome Android optimized • Workers • IHDR precheck • OGG Safe • SHA-1</p>
            </div>
            <span className="badge">v2.0</span>
          </header>

          {/* Upload pack */}
          <section className="section">
            <h2>1. Upload Resource Pack</h2>
            <p className="section-sub">
              Upload file <code>.zip</code> pack asli (sebelum dioptimize).
            </p>

            <input
              type="file"
              accept=".zip"
              id="inputFile"
              className="hidden-input"
              disabled={isProcessing}
              onChange={onMainFileChange}
            />
            <label htmlFor="inputFile" className={`upload-label ${isProcessing ? "disabled" : ""}`}>
              <div className="upload-icon">⬆️</div>
              <div>
                <div className="upload-title">{fileName || "Klik untuk pilih file .zip"}</div>
                <div className="upload-sub">Semua proses di browser (tanpa server).</div>
              </div>
            </label>
          </section>

          {/* Mode */}
          <section className="section">
            <h2>2. Pilih Mode Optimasi</h2>
            <p className="section-sub">Mode menentukan karakter dasar optimasi.</p>

            <div className="mode-grid">
              {Object.values(MODES).map((m) => (
                <button
                  key={m.id}
                  className={`mode-card ${m.id === mode ? "mode-active" : ""}`}
                  disabled={isProcessing}
                  onClick={() => setMode(m.id)}
                >
                  <div className="mode-title-row">
                    <span>{m.label}</span>
                    {mode === m.id && <span className="mode-dot" />}
                  </div>
                  <p className="mode-desc">{m.description}</p>
                  <ul className="mode-meta">
                    <li>Scale dasar: {Math.round(m.scale * 100)}%</li>
                    <li>Max texture: {m.maxSize}px</li>
                    <li>JSON: {m.minifyJson ? "Minified" : "Original"}</li>
                  </ul>
                </button>
              ))}
            </div>
          </section>

          {/* Slider resolusi */}
          <section className="section">
            <h2>3. Slider Resolusi</h2>
            <p className="section-sub">
              <strong>100%</strong> = standar mode. Kecilkan untuk lebih ringan, besarkan untuk lebih tajam.
            </p>

            <div className="slider-row">
              <input
                type="range"
                min="40"
                max="120"
                value={resolutionPercent}
                onChange={(e) => setResolutionPercent(Number(e.target.value))}
                className="slider"
                disabled={isProcessing}
              />
              <div className="slider-value">{resolutionPercent}%</div>
            </div>

            <div className="button-row" style={{ marginTop: 10 }}>
              <button className="primary-button" onClick={() => setResolutionPercent(40)} disabled={isProcessing}>
                40% (min)
              </button>
              <button className="primary-button" onClick={() => setResolutionPercent(60)} disabled={isProcessing}>
                60%
              </button>
              <button className="primary-button" onClick={() => setResolutionPercent(80)} disabled={isProcessing}>
                80%
              </button>
              <button className="primary-button" onClick={() => setResolutionPercent(100)} disabled={isProcessing}>
                100%
              </button>
              <button className="primary-button" onClick={() => setResolutionPercent(120)} disabled={isProcessing}>
                120% (max)
              </button>
            </div>
          </section>

          {/* Pixel art */}
          <section className="section">
            <h2>4. Pixel Art</h2>
            <p className="section-sub">
              Jaga ketajaman GUI/font (nearest). Font tetap di-skip resize by policy.
            </p>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <input
                type="checkbox"
                checked={preservePixelArt}
                onChange={(e) => setPreservePixelArt(e.target.checked)}
                disabled={isProcessing}
              />
              Preserve Pixel Art
            </label>
          </section>

          {/* OGG */}
          <section className="section">
            <h2>5. Sound Optimization (.ogg)</h2>
            <p className="section-sub">
              Safe mode: hanya menghapus metadata & padding kosong di file <code>.ogg</code>, tanpa re-encode audio.
            </p>

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <input
                type="checkbox"
                checked={optimizeOgg}
                onChange={(e) => setOptimizeOgg(e.target.checked)}
                disabled={isProcessing}
              />
              Aktifkan optimisasi sound (.ogg)
            </label>
          </section>

          {/* ZIP compression level */}
          <section className="section">
            <h2>6. ZIP Compression</h2>
            <p className="section-sub">
              Level <strong>6</strong> biasanya paling “worth it” (cepat). Level <strong>9</strong> paling kecil tapi bisa jauh lebih lama.
            </p>

            <div className="slider-row">
              <input
                type="range"
                min="1"
                max="9"
                value={zipCompressionLevel}
                onChange={(e) => setZipCompressionLevel(Number(e.target.value))}
                className="slider"
                disabled={isProcessing}
              />
              <div className="slider-value">level {zipCompressionLevel}</div>
            </div>
          </section>

          {/* Worker count */}
          <section className="section">
            <h2>7. Workers (PNG resize)</h2>
            <p className="section-sub">
              Default auto: 2–4 worker (aman buat Chrome Android biar ga ngelag/overheat).
            </p>
            <div className="button-row" style={{ marginTop: 10 }}>
              <button className="primary-button" disabled={isProcessing} onClick={() => setWorkerCount(0)}>
                Auto ({computedWorkerCount})
              </button>
              <button className="primary-button" disabled={isProcessing} onClick={() => setWorkerCount(2)}>
                2
              </button>
              <button className="primary-button" disabled={isProcessing} onClick={() => setWorkerCount(3)}>
                3
              </button>
              <button className="primary-button" disabled={isProcessing} onClick={() => setWorkerCount(4)}>
                4
              </button>
            </div>
          </section>

          {/* Icon pack */}
          <section className="section">
            <h2>8. Icon Pack (pack.png)</h2>
            <p className="section-sub">
              Upload gambar (PNG/JPG) untuk dijadikan icon pack (pack.png di root).
            </p>

            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              id="iconFile"
              className="hidden-input"
              disabled={isProcessing}
              onChange={onIconChange}
            />
            <label htmlFor="iconFile" className={`upload-label ${isProcessing ? "disabled" : ""}`}>
              <div className="upload-icon">🖼️</div>
              <div>
                <div className="upload-title">{iconFile ? iconFile.name : "Klik untuk pilih gambar icon"}</div>
                <div className="upload-sub">
                  Icon diresize ke <code>128×128</code> → disimpan sebagai <code>pack.png</code>.
                </div>
              </div>
            </label>
          </section>

          {/* mcmeta editor */}
          <section className="section">
            <h2>9. pack.mcmeta Editor</h2>
            <p className="section-sub">Edit konten <code>pack.mcmeta</code>.</p>

            {mcmetaError && (
              <p className="section-sub" style={{ color: "#f87171" }}>
                {mcmetaError}
              </p>
            )}

            {mcmetaLoaded ? (
              <textarea
                className="mcmeta-textarea"
                rows={8}
                value={mcmetaText}
                onChange={(e) => setMcmetaText(e.target.value)}
                disabled={isProcessing}
              />
            ) : (
              <p className="section-sub">
                <em>pack.mcmeta tidak ditemukan di root pack.</em>
              </p>
            )}
          </section>

          {/* Pojav log */}
          <section className="section">
            <h2>10. Pojav Log (Auto-Fix)</h2>
            <p className="section-sub">
              Upload <code>latestlog.txt</code>. Path “not multiple of frame size” akan di-enforce strip otomatis.
            </p>
            <input
              type="file"
              accept=".txt"
              id="logFile"
              className="hidden-input"
              disabled={isProcessing}
              onChange={onLogFileChange}
            />
            <label htmlFor="logFile" className={`upload-label ${isProcessing ? "disabled" : ""}`}>
              <div className="upload-icon">📄</div>
              <div>
                <div className="upload-title">Klik untuk pilih log Pojav (latestlog.txt)</div>
                <div className="upload-sub">
                  Ditemukan: <strong>{dynamicStripPaths.length}</strong> path enforce-strip dari log.
                </div>
              </div>
            </label>
          </section>

          {/* Progress */}
          <section className="section">
            <h2>Progress</h2>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ flex: 1, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: progress.total ? `${Math.round((progress.done / progress.total) * 100)}%` : "0%",
                    background: "rgba(255,255,255,0.65)"
                  }}
                />
              </div>
              <div className="small-note" style={{ minWidth: 140, textAlign: "right" }}>
                {progress.total ? `${progress.done}/${progress.total}` : "0/0"}{" "}
                {progress.etaSec != null ? `• ETA ${progress.etaSec}s` : ""}
              </div>
            </div>
          </section>

          {/* Optimize button */}
          <section className="section">
            <div className="button-row">
              <button className="primary-button" onClick={handleOptimize} disabled={isProcessing || !file}>
                {isProcessing ? "Sedang mengoptimasi..." : "Optimize Sekarang"}
              </button>
              {!file && <span className="small-note">Pilih resource pack dulu sebelum optimize.</span>}
            </div>
          </section>

          {/* Console */}
          <section className="section">
            <h2>Console Log</h2>
            <div className="console" ref={logRef}>
              {logs.length === 0 ? (
                <div className="console-placeholder">
                  Belum ada log. Upload pack dan klik &quot;Optimize Sekarang&quot;.
                </div>
              ) : (
                logs.map((l, i) => (
                  <div key={i} className="console-line">
                    {l}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Summary */}
          {summary && (
            <section className="section">
              <h2>Hasil Optimasi</h2>
              <p className="section-sub">Ringkasan perubahan oleh optimizer.</p>

              <div className="summary-grid">
                <Summary
                  label="Ukuran"
                  value={`${(summary.originalSize / 1e6).toFixed(2)} MB → ${(summary.optimizedSize / 1e6).toFixed(2)} MB`}
                />
                <Summary label="PNG" value={`${summary.pngOptimized} / ${summary.pngCount} resized`} />
                <Summary label="PNG Skip (IHDR)" value={`${summary.pngSkippedByIHDR}`} />
                {summary.oggCount > 0 && (
                  <Summary label="Sound (.ogg)" value={`${summary.oggOptimized} / ${summary.oggCount} optimized (safe)`} />
                )}
                <Summary label="JSON Minified" value={`${summary.jsonMinified} / ${summary.jsonCount}`} />
                <Summary label="File Non-Game Dibuang" value={summary.removed} />
                <Summary label="Workers" value={summary.workers} />
                <Summary label="ZIP level" value={summary.compressionLevel} />
                {summary.sha1 && (
                  <Summary
                    label="SHA-1 ZIP"
                    value={
                      <span style={{ wordBreak: "break-all" }}>
                        {summary.sha1}
                        <button
                          className="primary-button"
                          style={{ marginLeft: 8, padding: "4px 8px", fontSize: 12 }}
                          onClick={() => navigator.clipboard?.writeText(summary.sha1)}
                        >
                          Copy
                        </button>
                      </span>
                    }
                  />
                )}
                {summary.dynamicStripCount != null && <Summary label="Auto-Fix Paths" value={`${summary.dynamicStripCount}`} />}
              </div>

              <p className="section-sub">
                File hasil sudah otomatis di-download sebagai <code>optimize_file.zip</code>.
              </p>
            </section>
          )}

          <footer className="footer">
            <span>Minecraft Pack Optimizer · v2 · IHDR skip · Workers · OGG Safe · SHA-1 · Size Guard</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
