import { useRef, useState } from "react";
import JSZip from "jszip";

// =========================
//   MODE KONFIGURASI
// =========================
const MODES = {
  normal: {
    id: "normal",
    label: "Normal",
    description: "Seimbang, kualitas cukup bagus, pack tetap ringan.",
    scale: 0.85,
    maxSize: 512,
    minSize: 16,
    minifyJson: true
  },
  extreme: {
    id: "extreme",
    label: "Extreme",
    description: "Sangat hemat, cocok untuk device mid-low.",
    scale: 0.6,
    maxSize: 256,
    minSize: 8,
    minifyJson: true
  },
  ultra: {
    id: "ultra",
    label: "Ultra Extreme",
    description: "Paling ringan, untuk HP kentang atau Pojav lemah.",
    scale: 0.4,
    maxSize: 128,
    minSize: 4,
    minifyJson: true
  }
};

export default function Home() {
  const [mode, setMode] = useState("normal");
  const [logs, setLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [fileName, setFileName] = useState("");

  const logRef = useRef(null);

  // =========================
  //   LOGGING
  // =========================
  const appendLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${time}] ${msg}`]);

    setTimeout(() => {
      if (logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight;
      }
    }, 10);
  };

  // =========================
  //   UPLOAD HANDLER
  // =========================
  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLogs([]);
    setSummary(null);

    await handleOptimize(file);
  };

  // =========================
  //   MAIN OPTIMIZER
  // =========================
  const handleOptimize = async (file) => {
    appendLog(`Input file: ${file.name}`);
    appendLog(`Mode: ${mode}`);

    setIsProcessing(true);
    const modeConfig = MODES[mode];

    try {
      const zip = await JSZip.loadAsync(file);
      appendLog("ZIP dibaca.");

      const outZip = new JSZip();
      const entries = Object.values(zip.files);

      const stats = {
        totalFiles: 0,
        pngCount: 0,
        pngOptimized: 0,
        jsonCount: 0,
        jsonMinified: 0,
        removed: 0
      };

      for (const entry of entries) {
        if (entry.dir) {
          outZip.folder(entry.name);
          continue;
        }

        const name = entry.name;
        const lower = name.toLowerCase();
        stats.totalFiles++;

        // =========================
        //  EXCLUDE FILE NON-GAME
        // =========================
        if (shouldExcludeNonGameFile(lower)) {
          stats.removed++;
          appendLog(`Dibuang (non-game): ${name}`);
          continue;
        }

        // =========================
        //  PNG — SELALU DIJAGA
        // =========================
        if (lower.endsWith(".png")) {
          stats.pngCount++;
          appendLog(`Optimize PNG: ${name}`);

          const buffer = await entry.async("arraybuffer");
          const out = await optimizePng(buffer, modeConfig, appendLog);

          stats.pngOptimized++;
          outZip.file(name, out);
          continue;
        }

        // =========================
        //  JSON — HANYA MINIFY
        // =========================
        if (lower.endsWith(".json")) {
          stats.jsonCount++;
          const text = await entry.async("string");

          try {
            const minified = JSON.stringify(JSON.parse(text));
            stats.jsonMinified++;
            outZip.file(name, minified);
            appendLog(`JSON minified: ${name}`);
          } catch {
            outZip.file(name, text);
            appendLog(`JSON invalid (skip): ${name}`);
          }
          continue;
        }

        // =========================
        //  FILE LAIN — COPY ORIGINAL
        // =========================
        const content = await entry.async("arraybuffer");
        outZip.file(name, content);
      }

      appendLog("Menyusun ZIP...");
      const optimizedBlob = await outZip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 9 }
      });

      appendLog("Selesai ✔ File siap diunduh.");

      triggerDownload(optimizedBlob, "optimize_file.zip");

      setSummary({
        ...stats,
        originalSize: file.size,
        optimizedSize: optimizedBlob.size
      });

    } catch (e) {
      console.error(e);
      appendLog("ERROR: " + e.message);
    }

    setIsProcessing(false);
  };

  // =========================
  //   RENDER UI
  // =========================
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
              <p>100% Client-Side • Aman • Vercel Friendly</p>
            </div>
            <span className="badge">v1.2</span>
          </header>

          <section className="section">
            <h2>1. Upload Resource Pack</h2>
            <p className="section-sub">Upload file ZIP sebelum optimasi.</p>

            <input
              type="file"
              accept=".zip"
              id="inputFile"
              className="hidden-input"
              disabled={isProcessing}
              onChange={onFileChange}
            />

            <label htmlFor="inputFile" className="upload-label">
              <div className="upload-icon">⬆️</div>
              <div>
                {fileName || "Klik untuk pilih file ZIP"}
              </div>
            </label>
          </section>

          <section className="section">
            <h2>2. Pilih Mode</h2>
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
                    {mode === m.id && <span className="mode-dot"></span>}
                  </div>
                  <p className="mode-desc">{m.description}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="section">
            <h2>3. Console</h2>
            <div className="console" ref={logRef}>
              {logs.map((l, i) => (
                <div key={i} className="console-line">{l}</div>
              ))}
            </div>
          </section>

          {summary && (
            <section className="section">
              <h2>4. Hasil</h2>
              <p className="section-sub">Ringkasan optimasi pack:</p>

              <div className="summary-grid">
                <Summary label="Ukuran"
                  value={`${(summary.originalSize/1e6).toFixed(2)} MB → ${(summary.optimizedSize/1e6).toFixed(2)} MB`} />

                <Summary label="PNG"
                  value={`${summary.pngOptimized} / ${summary.pngCount}`} />

                <Summary label="JSON Minified"
                  value={`${summary.jsonMinified} / ${summary.jsonCount}`} />

                <Summary label="File dibuang"
                  value={summary.removed} />
              </div>
            </section>
          )}

          <footer className="footer">
            <span>© 2025 Minecraft Pack Optimizer</span>
          </footer>
        </div>
      </main>
    </div>
  );
}


// =========================
//   UI KOMponen RINGKAS
// =========================
function Summary({ label, value }) {
  return (
    <div className="summary-card">
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
    </div>
  );
}


// =========================
//   FILE NON-GAME FILTER
// =========================
function shouldExcludeNonGameFile(lower) {
  if (
    lower.endsWith(".psd") ||
    lower.endsWith(".xcf") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    lower.endsWith(".bak") ||
    lower.endsWith(".zip")
  ) return true;

  if (
    lower.endsWith(".png") ||
    lower.endsWith(".json") ||
    lower.endsWith(".mcmeta") ||
    lower.endsWith(".properties")
  ) return false;

  if (
    lower.includes("/raw/") ||
    lower.includes("/backup/") ||
    lower.includes("/unused/") ||
    lower.includes("/temp/")
  ) {
    if (
      lower.endsWith(".png") ||
      lower.endsWith(".json") ||
      lower.endsWith(".mcmeta")
    ) return false;

    return true;
  }

  return false;
}


// =========================
//   ANIMATED STRIP DETECTOR
// =========================
function detectAnimatedStrip(w, h) {
  if (h <= w) return null;
  const frames = h / w;
  if (!Number.isInteger(frames)) return null;
  if (frames < 2) return null;
  return frames;
}


// =========================
//   LOAD IMAGE (SAFE)
// =========================
async function loadImageFromBlob(blob) {
  if (typeof createImageBitmap === "function") {
    return await createImageBitmap(blob);
  }

  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = URL.createObjectURL(blob);
  });
}


// =========================
//   PNG OPTIMIZER
// =========================
async function optimizePng(buffer, mode, log) {
  const blob = new Blob([buffer], { type: "image/png" });
  let img;

  try {
    img = await loadImageFromBlob(blob);
  } catch {
    log("PNG gagal dibaca, skip.");
    return buffer;
  }

  const w0 = img.width;
  const h0 = img.height;

  const frames = detectAnimatedStrip(w0, h0);

  // =========================
  //   ANIMATED STRIP LOGIC
  // =========================
  let targetW = Math.round(w0 * mode.scale);

  if (targetW > mode.maxSize) targetW = mode.maxSize;
  if (targetW < mode.minSize) targetW = mode.minSize;

  let targetH;

  if (frames) {
    targetH = targetW * frames;
    log(`Animated Texture: ${frames} frames → ${targetW}x${targetH}`);
  } else {
    let tW = targetW;
    let tH = Math.round(h0 * mode.scale);

    const maxSide = Math.max(tW, tH);
    if (maxSide > mode.maxSize) {
      const f = mode.maxSize / maxSide;
      tW = Math.round(tW * f);
      tH = Math.round(tH * f);
    }

    const minSide = Math.min(tW, tH);
    if (minSide < mode.minSize) {
      const f = mode.minSize / minSide;
      tW = Math.round(tW * f);
      tH = Math.round(tH * f);
    }

    targetW = tW;
    targetH = tH;
  }

  if (targetW === w0 && targetH === h0) return buffer;

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const outBlob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b || blob), "image/png", 0.92)
  );

  return await outBlob.arrayBuffer();
}


// =========================
//   DOWNLOAD
// =========================
function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
