import { useRef, useState } from "react";
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
  // GUI & FONT → jaga ketajaman (nearest), minimum agak tinggi
  { pattern: /textures\/gui\//, smoothing: "nearest", minSize: 16, scaleMul: 1.0 },
  { pattern: /textures\/font\//, smoothing: "nearest", minSize: 16, scaleMul: 1.0, skipResize: true },

  // ModelEngine → paksa animated strip + batasi tinggi
  { pattern: /modelengine\//, enforceStrip: true, maxHeight: 8192, smoothing: "smooth" },

  // Colormap & Maps → data sensitif → skip
  { pattern: /colormap\//, skip: true },
  { pattern: /maps\//, skip: true },

  // Entity/mob → moderat
  { pattern: /textures\/entity\//, scaleMul: 0.85 },

  // Default
  { pattern: /.*/, scaleMul: 1.0 }
];

export default function Home() {
  /* ========= STATE UI ========= */
  const [mode, setMode] = useState("normal");
  const [resolutionPercent, setResolutionPercent] = useState(100); // 40..120
  const [preservePixelArt, setPreservePixelArt] = useState(true);
  const [optimizeOgg, setOptimizeOgg] = useState(true); // safe mode OGG

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

  // daftar path (substring) dari log Pojav yang perlu enforceStrip
  const [dynamicStripPaths, setDynamicStripPaths] = useState([]); // array<string lowercased>

  /* ========= LOGGING ========= */
  const appendLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${time}] ${msg}`]);
    setTimeout(() => {
      if (logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight;
      }
    }, 10);
  };

  /* ========= HELPERS POLICY ========= */
  function getPolicyForPath(lowerPath) {
    // 1) dynamic enforceStrip dari log (prioritas tertinggi)
    for (let i = 0; i < dynamicStripPaths.length; i++) {
      const key = dynamicStripPaths[i];
      if (key && lowerPath.includes(key)) {
        return { enforceStrip: true, smoothing: "smooth" };
      }
    }
    // 2) base policies
    for (let i = 0; i < BASE_POLICIES.length; i++) {
      if (BASE_POLICIES[i].pattern.test(lowerPath)) {
        return { ...BASE_POLICIES[i] };
      }
    }
    // fallback
    return { scaleMul: 1.0 };
  }

  /* ========= INPUT: PACK ========= */
  const onMainFileChange = async (e) => {
    const f = e.target.files && e.target.files[0];
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

  /* ========= INPUT: ICON ========= */
  const onIconChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setIconFile(f);
    appendLog(`Icon pack dipilih: ${f.name}`);
  };

  /* ========= INPUT: LOG POJAV (Auto-Fix) ========= */
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

  /* ========= BACA pack.mcmeta dari ZIP ========= */
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
      console.error(e);
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
      preservePixelArt // pass ke optimizer
    };

    appendLog(`Mode: ${baseMode.label}`);
    appendLog(
      `Scale efektif: ${(effectiveScale * 100).toFixed(0)}% (slider ${resolutionPercent}%)`
    );

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
        removed: 0,
        oggCount: 0,
        oggOptimized: 0
      };

      for (let idx = 0; idx < entries.length; idx++) {
        const entry = entries[idx];
        if (entry.dir) {
          outZip.folder(entry.name);
          continue;
        }

        const name = entry.name;
        const lower = name.toLowerCase();
        stats.totalFiles++;

        // Buang hanya file non-game
        if (shouldExcludeNonGameFile(lower)) {
          stats.removed++;
          appendLog(`Dibuang (non-game): ${name}`);
          continue;
        }

        // pack.mcmeta → pakai edit user jika ada
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
              outZip.file(name, toWrite);
              appendLog("pack.mcmeta bukan JSON valid, ditulis apa adanya.");
            }
          } else {
            outZip.file(name, toWrite);
          }
          continue;
        }

        // .ogg — optimisasi SAFE (tanpa re-encode)
        if (lower.endsWith(".ogg")) {
          stats.oggCount++;
          const buf = await entry.async("arraybuffer");

          if (optimizeOgg) {
            const outBuf = await optimizeOggSafe(buf, appendLog, name);
            if (outBuf !== buf) stats.oggOptimized++;
            outZip.file(name, outBuf);
            appendLog(`Optimize OGG (safe): ${name}`);
          } else {
            outZip.file(name, buf);
            appendLog(`Copy OGG (no optimize): ${name}`);
          }

          continue;
        }

        // PNG — resize (animated strip aman via policy + detector)
        if (lower.endsWith(".png")) {
          stats.pngCount++;
          const policy = getPolicyForPath(lower);
          // global toggle preserve pixel art
          if (!preservePixelArt && policy.smoothing === "nearest") {
            policy.smoothing = "smooth";
          }

          appendLog(`Optimize PNG: ${name}${policy.skip ? " [SKIP]" : ""}`);

          const buf = await entry.async("arraybuffer");
          let outBuf;

          if (policy.skip) {
            outBuf = buf; // simpan apa adanya
          } else if (policy.skipResize) {
            appendLog(`Skip resize (policy): ${name}`);
            outBuf = buf;
          } else {
            outBuf = await optimizePng(buf, { ...modeConfig, policy }, appendLog, lower);
          }

          outZip.file(name, outBuf);
          if (!policy.skip && !policy.skipResize) stats.pngOptimized++;
          continue;
        }

        // JSON lain — minify
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

        // Lain-lain — copy apa adanya
        const content = await entry.async("arraybuffer");
        outZip.file(name, content);
      }

      // Override pack icon bila ada
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

      // Hitung SHA-1 ZIP hasil (buat server.properties / ItemsAdder)
      const sha1 = await sha1HexFromBlob(optimizedBlob);
      if (sha1) appendLog(`SHA-1 hasil: ${sha1}`);

      appendLog("Selesai ✔ Menyiapkan download optimize_file.zip");
      triggerDownload(optimizedBlob, "optimize_file.zip");

      setSummary({
        ...stats,
        originalSize: file.size,
        optimizedSize: optimizedBlob.size,
        sha1: sha1 || null,
        dynamicStripCount: dynamicStripPaths.length
      });

      appendLog("Optimasi selesai.");
    } catch (e) {
      console.error(e);
      appendLog("ERROR: " + e.message);
    }

    setIsProcessing(false);
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
              <p>Client-side • Vercel friendly • Policy • Auto-Fix • SHA-1 • OGG Safe</p>
            </div>
            <span className="badge">v1.7</span>
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
            <label htmlFor="inputFile" className={`upload-label ${isProcessing ? "disabled" : ""}`}>
              <div className="upload-icon">⬆️</div>
              <div>
                <div className="upload-title">{fileName || "Klik untuk pilih file .zip"}</div>
                <div className="upload-sub">Semua proses di browser (tanpa server).</div>
              </div>
            </label>
          </section>

          {/* 2. Mode */}
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

          {/* 3. Slider Resolusi + Snap */}
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
              <button
                className="primary-button"
                onClick={() => setResolutionPercent(50)}
                disabled={isProcessing}
              >
                ½ (50%)
              </button>
              <button
                className="primary-button"
                onClick={() => setResolutionPercent(25)}
                disabled={isProcessing}
              >
                ¼ (25%)
              </button>
              <button
                className="primary-button"
                onClick={() => setResolutionPercent(12)}
                disabled={isProcessing}
              >
                ⅛ (12%)
              </button>
            </div>
          </section>

          {/* 4. Pixel Art */}
          <section className="section">
            <h2>4. Pixel Art</h2>
            <p className="section-sub">
              Jaga ketajaman GUI/font (nearest-neighbor untuk kategori terkait). Font rank kamu aman di semua mode.
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

          {/* 5. Sound Optimization (.ogg) */}
          <section className="section">
            <h2>5. Sound Optimization (.ogg)</h2>
            <p className="section-sub">
              Safe mode: hanya menghapus metadata & padding kosong di file <code>.ogg</code>, tanpa re-encode audio.
              Suara tidak berubah, tapi ukuran bisa sedikit lebih kecil.
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

          {/* 6. Icon pack */}
          <section className="section">
            <h2>6. Icon Pack (pack.png)</h2>
            <p className="section-sub">
              Upload gambar (PNG/JPG) untuk dijadikan icon pack (pack.png di root). Jika kosong, icon lama (kalau ada)
              tetap dipakai.
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
                <div className="upload-title">
                  {iconFile ? iconFile.name : "Klik untuk pilih gambar icon"}
                </div>
                <div className="upload-sub">
                  Icon akan diresize ke <code>128×128</code> dan disimpan sebagai <code>pack.png</code>.
                </div>
              </div>
            </label>
          </section>

          {/* 7. pack.mcmeta editor */}
          <section className="section">
            <h2>7. pack.mcmeta Editor</h2>
            <p className="section-sub">
              Edit konten <code>pack.mcmeta</code>. Jika tidak ada, bagian ini akan kosong.
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

          {/* 8. Upload log Pojav (Auto-Fix) */}
          <section className="section">
            <h2>8. Pojav Log (Auto-Fix)</h2>
            <p className="section-sub">
              Upload <code>latestlog.txt</code>. Path yang kena error “not multiple of frame size” akan otomatis
              di-enforce strip untuk build berikutnya.
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
                <div className="upload-title">Klik untuk pilih file log Pojav (latestlog.txt)</div>
                <div className="upload-sub">
                  Ditemukan: <strong>{dynamicStripPaths.length}</strong> path enforce-strip dari log.
                </div>
              </div>
            </label>
          </section>

          {/* Tombol Optimize */}
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
                <Summary
                  label="PNG"
                  value={`${summary.pngOptimized} / ${summary.pngCount} dioptimasi`}
                />
                {summary.oggCount > 0 && (
                  <Summary
                    label="Sound (.ogg)"
                    value={`${summary.oggOptimized} / ${summary.oggCount} dioptimasi (safe)`}
                  />
                )}
                <Summary
                  label="JSON Minified"
                  value={`${summary.jsonMinified} / ${summary.jsonCount}`}
                />
                <Summary
                  label="File Non-Game Dibuang"
                  value={summary.removed}
                />
                {summary.sha1 && (
                  <Summary
                    label="SHA-1 ZIP"
                    value={
                      <span style={{ wordBreak: "break-all" }}>
                        {summary.sha1}
                        <button
                          className="primary-button"
                          style={{ marginLeft: 8, padding: "4px 8px", fontSize: 12 }}
                          onClick={() =>
                            navigator.clipboard &&
                            navigator.clipboard.writeText(summary.sha1)
                          }
                        >
                          Copy
                        </button>
                      </span>
                    }
                  />
                )}
                {summary.dynamicStripCount != null && (
                  <Summary
                    label="Auto-Fix Paths"
                    value={`${summary.dynamicStripCount}`}
                  />
                )}
              </div>

              <p className="section-sub">
                File hasil sudah otomatis di-download sebagai{" "}
                <code>optimize_file.zip</code>.
              </p>
            </section>
          )}

          <footer className="footer">
            <span>Minecraft Pack Optimizer · Texture · Sound · Auto-Fix · SHA-1</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

/* ========== KOMponen ringkas ========== */
function Summary({ label, value }) {
  return (
    <div className="summary-card">
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
    </div>
  );
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

  // folder khusus: buang non-aset
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

/* ========== ANIMATED STRIP DETECTOR ========== */
function detectAnimatedStrip(width, height) {
  if (height <= width) return null;
  const frames = height / width;
  if (!Number.isInteger(frames) || frames < 2) return null;
  return frames;
}

/* ========== LOAD IMAGE (aman di browser) ========== */
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

/* ========== OPTIMIZE PNG (policy aware) ========== */
async function optimizePng(buffer, modeConfig, log) {
  const blob = new Blob([buffer], { type: "image/png" });

  let image;
  try {
    image = await loadImageFromBlob(blob);
  } catch (e) {
    log("PNG gagal dibaca, disalin apa adanya.");
    return buffer;
  }

  const w0 = image.width;
  const h0 = image.height;
  if (!w0 || !h0) return buffer;

  const { policy = {}, scale, minSize, maxSize, preservePixelArt } = modeConfig;

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
    log(
      `Animated strip${policy.enforceStrip && !frames ? " (enforced)" : ""}: ${w0}x${h0} → ${tW}x${tH}`
    );
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

  if (tW <= 0 || tH <= 0 || (tW === w0 && tH === h0)) {
    return buffer;
  }

  const canvas = document.createElement("canvas");
  canvas.width = tW;
  canvas.height = tH;
  const ctx = canvas.getContext("2d");

  const smoothing = policy.smoothing || (preservePixelArt ? "nearest" : "smooth");
  ctx.imageSmoothingEnabled = smoothing !== "nearest";
  ctx.imageSmoothingQuality = smoothing === "nearest" ? "low" : "high";

  ctx.clearRect(0, 0, tW, tH);
  ctx.drawImage(image, 0, 0, tW, tH);

  const outBlob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b || blob), "image/png", 0.92)
  );
  return await outBlob.arrayBuffer();
}

/* ========== SAFE OGG OPTIMIZER ==========
   - Hapus ID3v2 di awal (jika ada)
   - Hapus ID3v1 di akhir (TAG 128 byte, jika ada)
   - Hapus trailing 0x00 di akhir file
   Tidak mengubah audio stream utama
======================================== */
async function optimizeOggSafe(buffer, log, name) {
  try {
    const bytes = new Uint8Array(buffer);
    const len = bytes.length;
    if (len < 16) return buffer;

    let start = 0;
    let end = len;
    let changed = false;

    // ID3v2 di awal ("ID3")
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

    // ID3v1 di akhir ("TAG" 128 byte terakhir)
    if (end - start > 128) {
      const tagPos = end - 128;
      if (
        bytes[tagPos] === 0x54 && // 'T'
        bytes[tagPos + 1] === 0x41 && // 'A'
        bytes[tagPos + 2] === 0x47 // 'G'
      ) {
        end = tagPos;
        changed = true;
      }
    }

    // Hapus trailing 0x00 (padding)
    while (end > start && bytes[end - 1] === 0x00) {
      end--;
      changed = true;
    }

    if (!changed || end <= start) {
      return buffer;
    }

    const trimmed = bytes.subarray(start, end);
    const out = new Uint8Array(trimmed.length);
    out.set(trimmed);

    log(`OGG safe optimize: ${name} (${len} → ${out.length} bytes)`);
    return out.buffer;
  } catch (e) {
    log(`OGG optimize error, pakai original: ${e.message}`);
    return buffer;
  }
}

/* ========== BUILD pack.png DARI ICON ========== */
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
  log("pack.png berhasil dibuat dari icon.");
  return await outBlob.arrayBuffer();
}

/* ========== SHA-1 dari Blob (Web Crypto) ========== */
async function sha1HexFromBlob(blob) {
  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) return null;
  const ab = await blob.arrayBuffer();
  const hash = await window.crypto.subtle.digest("SHA-1", ab);
  const bytes = new Uint8Array(hash);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/* ========== DOWNLOAD ==========
   (link temporary + revoke)
============================== */
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