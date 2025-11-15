import { useRef, useState } from "react";
import JSZip from "jszip";

const MODES = {
  normal: {
    id: "normal",
    label: "Normal",
    description: "Kualitas seimbang, ukuran lebih kecil. Aman untuk kebanyakan device.",
    scale: 0.75,
    maxSize: 512,
    minifyJson: true
  },
  extreme: {
    id: "extreme",
    label: "Extreme",
    description: "Kualitas sedikit turun, performa naik. Cocok untuk device mid–low.",
    scale: 0.5,
    maxSize: 256,
    minifyJson: true
  },
  ultra: {
    id: "ultra",
    label: "Ultra Extreme",
    description: "Kualitas dikorbankan demi performa maksimal. Untuk device kentang / HP.",
    scale: 0.35,
    maxSize: 128,
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
  const fileInputRef = useRef(null);

  const appendLog = (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${msg}`]);
    // auto scroll
    setTimeout(() => {
      if (logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight;
      }
    }, 0);
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setSummary(null);
    setLogs([]);
    await handleOptimize(file);
  };

  const handleOptimize = async (file) => {
    const modeConfig = MODES[mode];

    try {
      setIsProcessing(true);
      appendLog(`File diterima: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
      appendLog(`Mode optimize: ${modeConfig.label}`);

      const zip = await JSZip.loadAsync(file);
      appendLog("Membaca isi ZIP...");

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
        const name = entry.name;

        if (entry.dir) {
          outZip.folder(name);
          continue;
        }

        stats.totalFiles++;

        if (shouldExclude(name)) {
          stats.removed++;
          appendLog(`Dibuang (tidak penting): ${name}`);
          continue;
        }

        if (name.toLowerCase().endsWith(".png")) {
          stats.pngCount++;
          appendLog(`Optimize image: ${name}`);
          const arrayBuffer = await entry.async("arraybuffer");
          const optimizedBuffer = await optimizePng(arrayBuffer, modeConfig, appendLog);
          outZip.file(name, optimizedBuffer);
          stats.pngOptimized++;
        } else if (name.toLowerCase().endsWith(".json")) {
          stats.jsonCount++;
          const text = await entry.async("string");
          if (modeConfig.minifyJson) {
            try {
              const obj = JSON.parse(text);
              const minified = JSON.stringify(obj);
              outZip.file(name, minified);
              stats.jsonMinified++;
              appendLog(`Minified JSON: ${name}`);
            } catch (err) {
              appendLog(`JSON invalid, tidak diubah: ${name}`);
              outZip.file(name, text);
            }
          } else {
            outZip.file(name, text);
          }
        } else {
          // file lain: copy apa adanya
          const content = await entry.async("arraybuffer");
          outZip.file(name, content);
        }
      }

      appendLog("Menyusun ZIP hasil optimize...");
      const optimizedBlob = await outZip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 9 }
      });

      appendLog("Selesai! Menyiapkan download optimize_file.zip");

      triggerDownload(optimizedBlob, "optimize_file.zip");

      setSummary({
        ...stats,
        originalSize: file.size,
        optimizedSize: optimizedBlob.size
      });

      setIsProcessing(false);
      appendLog("Proses selesai ✔");
    } catch (err) {
      console.error(err);
      appendLog(`ERROR: ${err.message || "Terjadi kesalahan saat optimize."}`);
      setIsProcessing(false);
    }
  };

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
              <p>Liquid glass UI • Client-side only • Vercel friendly</p>
            </div>
            <span className="badge">Beta</span>
          </header>

          <section className="section">
            <h2>1. Upload resource pack</h2>
            <p className="section-sub">
              Upload file <code>.zip</code> resource pack kamu. Proses optimize berjalan di browser, server tidak menyentuh data sama sekali.
            </p>

            <div className="upload-area">
              <input
                type="file"
                accept=".zip"
                ref={fileInputRef}
                onChange={onFileChange}
                disabled={isProcessing}
                className="hidden-input"
                id="file-input"
              />
              <label
                htmlFor="file-input"
                className={`upload-label ${isProcessing ? "disabled" : ""}`}
              >
                <div className="upload-icon">⬆️</div>
                <div>
                  <div className="upload-title">
                    {fileName || "Klik untuk memilih file .zip"}
                  </div>
                  <div className="upload-sub">
                    Atau drag & drop ke sini (kalau environment kamu mendukung).
                  </div>
                </div>
              </label>
            </div>
          </section>

          <section className="section">
            <h2>2. Pilih mode optimize</h2>
            <p className="section-sub">
              Setiap mode mengubah resolusi & pixel image, serta meminify JSON (kalau diaktifkan).
            </p>

            <div className="mode-grid">
              {Object.values(MODES).map((m) => (
                <button
                  key={m.id}
                  className={`mode-card ${mode === m.id ? "mode-active" : ""}`}
                  onClick={() => setMode(m.id)}
                  disabled={isProcessing}
                >
                  <div className="mode-title-row">
                    <span>{m.label}</span>
                    {mode === m.id && <span className="mode-dot" />}
                  </div>
                  <p className="mode-desc">{m.description}</p>
                  <ul className="mode-meta">
                    <li>Scale: {Math.round(m.scale * 100)}%</li>
                    <li>Max texture: {m.maxSize}px</li>
                    <li>JSON: {m.minifyJson ? "Minified" : "Original"}</li>
                  </ul>
                </button>
              ))}
            </div>
          </section>

          <section className="section">
            <div className="section-header-inline">
              <h2>3. Console log</h2>
              {isProcessing && <span className="processing-dot">Optimizing...</span>}
            </div>
            <p className="section-sub">
              Semua langkah proses ditampilkan di sini. Kalau ada error, akan muncul juga.
            </p>

            <div className="console" ref={logRef}>
              {logs.length === 0 ? (
                <div className="console-placeholder">
                  Menunggu file diupload...  
                  <br />
                  Setelah kamu upload, proses akan berjalan otomatis.
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

          {summary && (
            <section className="section">
              <h2>4. Hasil optimasi</h2>
              <p className="section-sub">
                Berikut ringkasan apa saja yang dioptimasi dari resource pack kamu.
              </p>

              <div className="summary-grid">
                <div className="summary-card">
                  <div className="summary-label">Ukuran</div>
                  <div className="summary-value">
                    {(summary.originalSize / (1024 * 1024)).toFixed(2)} MB →{" "}
                    {(summary.optimizedSize / (1024 * 1024)).toFixed(2)} MB
                  </div>
                  <div className="summary-extra">
                    Penghematan {(
                      (1 - summary.optimizedSize / summary.originalSize) *
                      100
                    ).toFixed(1)}
                    %
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">PNG</div>
                  <div className="summary-value">
                    {summary.pngOptimized} / {summary.pngCount} optimized
                  </div>
                  <div className="summary-extra">
                    Resolusi & pixel diperkecil sesuai mode.
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">JSON</div>
                  <div className="summary-value">
                    {summary.jsonMinified} / {summary.jsonCount} minified
                  </div>
                  <div className="summary-extra">
                    Spasi & newline dihapus untuk mengurangi ukuran.
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">File dibuang</div>
                  <div className="summary-value">{summary.removed}</div>
                  <div className="summary-extra">
                    File non-esensial seperti PSD, TXT, dan backup.
                  </div>
                </div>
              </div>

              <p className="section-sub">
                File hasil optimasi sudah otomatis di-download dengan nama{" "}
                <code>optimize_file.zip</code>.  
                Jika ingin mengulang, upload lagi file baru.
              </p>
            </section>
          )}

          <footer className="footer">
            <span>Minecraft Pack Optimizer · Client-side · No server timeout</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

// -------- Helpers & core optimization logic --------

function shouldExclude(name) {
  const lower = name.toLowerCase();
  // buang file yang hampir pasti tidak dibutuhkan client
  if (
    lower.endsWith(".psd") ||
    lower.endsWith(".xcf") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    lower.endsWith(".bak")
  ) {
    return true;
  }
  if (
    lower.includes("/raw/") ||
    lower.includes("/backup/") ||
    lower.includes("/unused/") ||
    lower.includes("/temp/")
  ) {
    return true;
  }
  return false;
}

async function optimizePng(arrayBuffer, modeConfig, log) {
  // convert ke Blob & ImageBitmap
  const blob = new Blob([arrayBuffer], { type: "image/png" });

  let bitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch (e) {
    log(`Gagal membaca PNG, file disalin apa adanya.`);
    return arrayBuffer; // fallback: tidak diubah
  }

  const origWidth = bitmap.width;
  const origHeight = bitmap.height;

  if (!origWidth || !origHeight) {
    return arrayBuffer;
  }

  let targetWidth = Math.round(origWidth * modeConfig.scale);
  let targetHeight = Math.round(origHeight * modeConfig.scale);

  const maxSide = Math.max(targetWidth, targetHeight);
  if (maxSide > modeConfig.maxSize) {
    const factor = modeConfig.maxSize / maxSide;
    targetWidth = Math.round(targetWidth * factor);
    targetHeight = Math.round(targetHeight * factor);
  }

  // Jangan resize kalau beda-nya hampir nggak ada
  if (
    targetWidth <= 0 ||
    targetHeight <= 0 ||
    (targetWidth === origWidth && targetHeight === origHeight)
  ) {
    return arrayBuffer;
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, targetWidth, targetHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

  const optimizedBlob = await new Promise((resolve) => {
    canvas.toBlob(
      (b) => resolve(b || blob),
      "image/png",
      0.92 // kualitas standar
    );
  });

  const optimizedArrayBuffer = await optimizedBlob.arrayBuffer();
  return optimizedArrayBuffer;
}

function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
