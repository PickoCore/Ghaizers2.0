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

export default function Home() {
  const [mode, setMode] = useState("normal");
  const [logs, setLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState(null);

  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState(null);

  const [iconFile, setIconFile] = useState(null);

  const [mcmetaText, setMcmetaText] = useState("");
  const [mcmetaLoaded, setMcmetaLoaded] = useState(false);
  const [mcmetaError, setMcmetaError] = useState("");

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
  //   BACA pack.mcmeta
  // =========================
  const inspectZipForMcmeta = async (f) => {
    try {
      appendLog("Membaca pack.mcmeta dari ZIP...");
      const zip = await JSZip.loadAsync(f);
      const entries = Object.values(zip.files);

      const mcmetaEntry = entries.find(
        (e) => e.name.toLowerCase() === "pack.mcmeta"
      );

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
      console.error(e);
      setMcmetaLoaded(false);
      setMcmetaText("");
      setMcmetaError("Gagal membaca pack.mcmeta");
      appendLog("Gagal membaca pack.mcmeta: " + e.message);
    }
  };

  // =========================
  //   HANDLER FILE PACK
  // =========================
  const onMainFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);
    setFileName(f.name);
    setSummary(null);
    setLogs([]);
    setMcmetaText("");
    setMcmetaLoaded(false);
    setMcmetaError("");
    appendLog(`File diterima: ${f.name} (${(f.size / 1e6).toFixed(2)} MB)`);

    await inspectZipForMcmeta(f);
  };

  // =========================
  //   HANDLER ICON PACK
  // =========================
  const onIconChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setIconFile(f);
    appendLog(`Icon pack dipilih: ${f.name}`);
  };

  // =========================
  //   MAIN OPTIMIZER
  // =========================
  const handleOptimize = async () => {
    if (!file) {
      appendLog("Harap pilih resource pack (.zip) terlebih dahulu.");
      return;
    }

    const modeConfig = MODES[mode];
    appendLog(`Mulai optimasi dengan mode: ${modeConfig.label}`);

    setIsProcessing(true);
    setSummary(null);

    try {
      const zip = await JSZip.loadAsync(file);
      appendLog("ZIP berhasil dibaca.");

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

        // 1) Buang hanya file non-game (psd, txt, dll)
        if (shouldExcludeNonGameFile(lower)) {
          stats.removed++;
          appendLog(`Dibuang (non-game): ${name}`);
          continue;
        }

        // 2) pack.mcmeta — gunakan text yang diedit user jika ada
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
            } catch (e) {
              appendLog(
                "pack.mcmeta bukan JSON valid, ditulis apa adanya (tanpa minify)."
              );
              outZip.file(name, toWrite);
            }
          } else {
            outZip.file(name, toWrite);
          }

          continue;
        }

        // 3) PNG — resize, termasuk animated strip
        if (lower.endsWith(".png")) {
          stats.pngCount++;
          appendLog(`Optimize PNG: ${name}`);
          const buf = await entry.async("arraybuffer");
          const outBuf = await optimizePng(buf, modeConfig, appendLog);
          outZip.file(name, outBuf);
          stats.pngOptimized++;
          continue;
        }

        // 4) JSON lain — minify biasa
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
          continue;
        }

        // 5) Lain-lain — copy apa adanya
        const content = await entry.async("arraybuffer");
        outZip.file(name, content);
      }

      // 6) Tambah / override icon pack.png jika user upload
      if (iconFile) {
        appendLog("Menambahkan / override pack.png dari icon upload...");
        const iconBuffer = await buildPackIcon(iconFile, appendLog);
        outZip.file("pack.png", iconBuffer);
      }

      appendLog("Menyusun ZIP hasil optimasi...");
      const optimizedBlob = await outZip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 9 }
      });

      appendLog("Selesai ✔ Menyiapkan download optimize_file.zip");
      triggerDownload(optimizedBlob, "optimize_file.zip");

      setSummary({
        ...stats,
        originalSize: file.size,
        optimizedSize: optimizedBlob.size
      });
      appendLog("Optimasi selesai.");
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
              <p>Client-side • Vercel friendly • Icon & mcmeta editor</p>
            </div>
            <span className="badge">v1.3</span>
          </header>

          {/* 1. Upload pack */}
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

            <label
              htmlFor="inputFile"
              className={`upload-label ${isProcessing ? "disabled" : ""}`}
            >
              <div className="upload-icon">⬆️</div>
              <div>
                <div className="upload-title">
                  {fileName || "Klik untuk pilih file .zip"}
                </div>
                <div className="upload-sub">
                  File tidak dikirim ke server, semua proses di browser.
                </div>
              </div>
            </label>
          </section>

          {/* 2. Mode */}
          <section className="section">
            <h2>2. Pilih Mode Optimasi</h2>
            <p className="section-sub">
              Atur seberapa agresif optimasi texture pack.
            </p>

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
                    <li>Scale: {Math.round(m.scale * 100)}%</li>
                    <li>Max texture: {m.maxSize}px</li>
                    <li>
                      JSON: {m.minifyJson ? "Minified" : "Tidak di-minify"}
                    </li>
                  </ul>
                </button>
              ))}
            </div>
          </section>

          {/* 3. Icon pack */}
          <section className="section">
            <h2>3. Icon Pack (pack.png)</h2>
            <p className="section-sub">
              Upload gambar (PNG/JPG) untuk dijadikan icon pack (pack.png di
              root). Kalau tidak diisi, icon lama (kalau ada) tetap dipakai.
            </p>

            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              id="iconFile"
              className="hidden-input"
              disabled={isProcessing}
              onChange={onIconChange}
            />

            <label
              htmlFor="iconFile"
              className={`upload-label ${isProcessing ? "disabled" : ""}`}
            >
              <div className="upload-icon">🖼️</div>
              <div>
                <div className="upload-title">
                  {iconFile ? iconFile.name : "Klik untuk pilih gambar icon"}
                </div>
                <div className="upload-sub">
                  Icon akan diresize menjadi 128x128 dan disimpan sebagai{" "}
                  <code>pack.png</code>.
                </div>
              </div>
            </label>
          </section>

          {/* 4. pack.mcmeta editor */}
          <section className="section">
            <h2>4. pack.mcmeta Editor</h2>
            <p className="section-sub">
              Edit konten <code>pack.mcmeta</code> di sini. Pastikan tetap
              JSON valid. Kalau tidak disentuh, akan memakai isi asli pack.
            </p>

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

          {/* Tombol Optimize */}
          <section className="section">
            <div className="button-row">
              <button
                className="primary-button"
                onClick={handleOptimize}
                disabled={isProcessing || !file}
              >
                {isProcessing ? "Sedang mengoptimasi..." : "Optimize Sekarang"}
              </button>
              {!file && (
                <span className="small-note">
                  Pilih resource pack dulu sebelum optimize.
                </span>
              )}
            </div>
          </section>

          {/* 5. Console */}
          <section className="section">
            <h2>5. Console Log</h2>
            <p className="section-sub">
              Semua proses akan muncul di sini. Error saat load/resize juga
              akan tampil.
            </p>

            <div className="console" ref={logRef}>
              {logs.length === 0 ? (
                <div className="console-placeholder">
                  Belum ada log. Upload pack dan klik &quot;Optimize
                  Sekarang&quot;.
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

          {/* 6. Summary */}
          {summary && (
            <section className="section">
              <h2>6. Hasil Optimasi</h2>
              <p className="section-sub">
                Ringkasan perubahan yang dilakukan oleh optimizer.
              </p>

              <div className="summary-grid">
                <Summary
                  label="Ukuran"
                  value={`${(summary.originalSize / 1e6).toFixed(
                    2
                  )} MB → ${(summary.optimizedSize / 1e6).toFixed(2)} MB`}
                />
                <Summary
                  label="PNG"
                  value={`${summary.pngOptimized} / ${summary.pngCount} dioptimasi`}
                />
                <Summary
                  label="JSON Minified"
                  value={`${summary.jsonMinified} / ${summary.jsonCount}`}
                />
                <Summary
                  label="File Non-Game Dibuang"
                  value={summary.removed}
                />
              </div>

              <p className="section-sub">
                File hasil sudah otomatis di-download sebagai{" "}
                <code>optimize_file.zip</code>. Pasang di server / ItemsAdder
                seperti biasa.
              </p>
            </section>
          )}

          <footer className="footer">
            <span>Minecraft Pack Optimizer · Icon + pack.mcmeta editor</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

// =========================
//   KOMPONEN RINGKAS
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
  )
    return true;

  // Aset game utama: jangan pernah dibuang
  if (
    lower.endsWith(".png") ||
    lower.endsWith(".json") ||
    lower.endsWith(".mcmeta") ||
    lower.endsWith(".properties")
  )
    return false;

  // Folder tertentu: buang isi non-aset
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
    )
      return false;
    return true;
  }

  return false;
}

// =========================
//   ANIMATED STRIP DETECTOR
// =========================
function detectAnimatedStrip(width, height) {
  if (height <= width) return null;
  const frames = height / width;
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

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = URL.createObjectURL(blob);
  });
}

// =========================
//   OPTIMIZE PNG
// =========================
async function optimizePng(buffer, modeConfig, log) {
  const blob = new Blob([buffer], { type: "image/png" });

  let image;
  try {
    image = await loadImageFromBlob(blob);
  } catch {
    log("PNG gagal dibaca, disalin apa adanya.");
    return buffer;
  }

  const origWidth = image.width;
  const origHeight = image.height;
  if (!origWidth || !origHeight) return buffer;

  const frames = detectAnimatedStrip(origWidth, origHeight);

  let targetWidth = Math.round(origWidth * modeConfig.scale);
  if (targetWidth > modeConfig.maxSize) targetWidth = modeConfig.maxSize;
  if (targetWidth < modeConfig.minSize) targetWidth = modeConfig.minSize;

  let targetHeight;

  if (frames) {
    // Animated strip: jaga height = width * frames
    targetHeight = targetWidth * frames;
    log(
      `Animated strip (${frames} frames): ${origWidth}x${origHeight} → ${targetWidth}x${targetHeight}`
    );
  } else {
    // Texture biasa: scale dua arah + clamp
    let w = targetWidth;
    let h = Math.round(origHeight * modeConfig.scale);

    let maxSide = Math.max(w, h);
    if (maxSide > modeConfig.maxSize) {
      const factor = modeConfig.maxSize / maxSide;
      w = Math.round(w * factor);
      h = Math.round(h * factor);
    }

    let minSide = Math.min(w, h);
    if (minSide < modeConfig.minSize) {
      const factor = modeConfig.minSize / minSide;
      w = Math.round(w * factor);
      h = Math.round(h * factor);
    }

    targetWidth = w;
    targetHeight = h;
  }

  if (
    targetWidth <= 0 ||
    targetHeight <= 0 ||
    (targetWidth === origWidth && targetHeight === origHeight)
  ) {
    return buffer;
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, targetWidth, targetHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  const optimizedBlob = await new Promise((resolve) => {
    canvas.toBlob(
      (b) => resolve(b || blob),
      "image/png",
      0.92
    );
  });

  return await optimizedBlob.arrayBuffer();
}

// =========================
//   BUILD pack.png DARI ICON
// =========================
async function buildPackIcon(file, log) {
  const buf = await file.arrayBuffer();
  const blob = new Blob([buf], { type: file.type || "image/png" });

  let img;
  try {
    img = await loadImageFromBlob(blob);
  } catch {
    log("Icon gagal dibaca, pack.png tidak diubah.");
    return buf;
  }

  const targetSize = 128; // standar pack.png
  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, targetSize, targetSize);

  const scale = Math.min(targetSize / img.width, targetSize / img.height, 1);
  const drawWidth = img.width * scale;
  const drawHeight = img.height * scale;
  const offsetX = (targetSize - drawWidth) / 2;
  const offsetY = (targetSize - drawHeight) / 2;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

  const outBlob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b || blob), "image/png", 0.92)
  );

  log("pack.png berhasil dibuat dari icon.");
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
