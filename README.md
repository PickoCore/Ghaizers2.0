<div align="center">

<img src="public/android-chrome-192x192.png" alt="Ghaizers logo" width="96" height="96" />

# Ghaizers 2.0

**Minecraft Resource Pack Optimizer — runs 100% in your browser. Free, private, no uploads.**

Shrink your pack, lighten it for mobile and Pojav, and keep it looking the way it should.

[![Live](https://img.shields.io/badge/LIVE-optimizer.ghaa.my.id-22c55e?style=for-the-badge)](https://optimizer.ghaa.my.id)
[![Version](https://img.shields.io/badge/version-2.2.1-6366f1?style=for-the-badge)](#-changelog)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
[![Made in Indonesia](https://img.shields.io/badge/Made%20in-Indonesia%20🇮🇩-ef4444?style=for-the-badge)](#-made-in-indonesia)

![Astro](https://img.shields.io/badge/Astro-4-ff5d01?logo=astro&logoColor=white)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=black)
![Client-side](https://img.shields.io/badge/processing-client--side-success)
![No upload](https://img.shields.io/badge/server%20upload-none-success)
![Lossless](https://img.shields.io/badge/PNG%20engine-lossless-8b5cf6)

[**Try it now**](https://optimizer.ghaa.my.id) · [Features](#-features) · [How it works](#-how-it-works) · [Getting started](#-getting-started) · [FAQ](#-faq)

</div>

---

## ✨ Why Ghaizers?

| | |
|---|---|
| 🔒 **Private** | Everything runs in your browser. Your pack is never sent to any server. |
| 🧠 **Smart PNG Encoder** | A custom lossless PNG encoder (palette + adaptive filtering) instead of the browser canvas encoder, which often makes files *bigger*. |
| 🛡️ **Size Guard** | Every file is compared against the original. The smaller one wins, so your pack never grows. |
| ⚡ **Fast** | Parallel processing with a Web Worker pool. The UI never freezes. |
| 📱 **Mobile-friendly** | Responsive UI with presets for Pojav Launcher and low-end devices. |
| 🆓 **Free forever** | Open source. No account, no ads. |

---

## 🚀 Features

### 🖼️ PNG
- **Smart PNG Encoder**: indexed/palette (1/2/4/8-bit), minimal color type, adaptive row filtering. 100% lossless.
- **Smart Resize**: per-category scaling (GUI, font, entity, particle). Textures are **never upscaled**.
- **Alpha Cleanup**: zeroes RGB on fully transparent pixels (no visual change).
- **Single-Color Detection**: collapses solid-color textures to 1×1.
- **Power-of-Two**: snaps dimensions to 16/32/64/… for GPU efficiency.
- **Metadata Strip**: removes hidden chunks (`tEXt`, `iCCP`, `gAMA`, etc.).
- **Palette Quantize** *(optional, lossy)*: reduces large textures to at most 256 colors.
- **Safe by design**: animated PNG (APNG), interlaced, and 16-bit PNGs are left untouched.

### 📄 Everything else
- **JSON**: minify, deep clean (removes comment fields), key sorting for better compression.
- **OGG**: strips ID3 tags and padding with **no re-encoding**. Audio quality stays identical. Stored without DEFLATE since OGG is already compressed.
- **Shaders / `.properties` / `.lang` / `.bbmodel`**: minify and cleanup.
- **Junk files**: `.DS_Store`, `Thumbs.db`, `__MACOSX`, and similar are removed automatically.

### 🧰 Tools
- **Pack Analyzer**: scan for problems (oversized textures, broken JSON, duplicates, empty files) without optimizing.
- **ZIP Diagnostics**: after optimizing, the log shows original stored vs. real size per file type and detects identical (duplicate) files.
- **pack.mcmeta Editor** with automatic credit injection.
- **Pojav Log Auto-Fix**: parses `latestlog.txt` and fixes problematic animated textures.
- **Custom pack icon**, **SHA-1 checksum**, **badge generator**, **share results**.
- **Bilingual UI**: Indonesian and English.

---

## 🎚️ Modes & Presets

| Mode | Scale | Max size | Best for |
|---|:---:|:---:|---|
| **Lossless** | 100% | No resize | Packs that must look exactly the same |
| **Normal** | 85% | 512 px | Balanced quality and size |
| **Extreme** | 55% | 128 px | Mid to low-end devices |
| **Ultra Extreme** | 35% | 64 px | Very weak phones / low-end Pojav |

**Ready-made presets:** `Lossless Safe` · `Pojav Lite` · `Server Pack` · `Ultra Compress` · `Quality`

> 💡 Start with **Lossless Safe** for guaranteed-safe results, then move to more aggressive modes if you need to.

---

## 🔬 How It Works

```
 pack ZIP ──► scan entries ──► parallel processing (Web Worker pool)
                                 │
                                 ├─ PNG   : strip meta → resize → alpha clean → (quantize)
                                 │          → lossless encode → ⚖️ Size Guard (keep smallest)
                                 ├─ JSON  : clean → sort → minify
                                 ├─ OGG   : strip ID3 (no re-encode), stored as-is
                                 └─ other : copy / minify
                                 │
                                 ▼
                      build ZIP ──► SHA-1 ──► download
```

**Why do PNGs grow in other optimizers?** The browser's built-in canvas PNG encoder always writes RGBA with no palette and no optimal filtering, so the output is frequently larger than the original. Ghaizers writes PNGs itself (`src/lib/png.js`) and compares the result with the original before using it.

---

## 📦 Getting Started

**Requirements:** Node.js 18+ (LTS recommended)

```bash
git clone https://github.com/PickoCore/Ghaizers2.0.git
cd Ghaizers2.0
npm install
npm run dev        # http://localhost:4321
```

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run test:png` | Run PNG engine tests (lossless round-trip) |

### 📱 Run on Android (Termux)

```bash
pkg update -y && pkg install git nodejs-lts -y
git clone https://github.com/PickoCore/Ghaizers2.0.git
cd Ghaizers2.0 && npm install && npm run dev
```

### ☁️ Deploy

The project is fully static (SSG) and works on Vercel, Cloudflare Pages, and Netlify.
Build command: `npm run build` · Output directory: `dist`

---

## 🗂️ Project Structure

```
Ghaizers2.0/
├── astro.config.mjs
├── package.json
├── public/                    # favicons, manifest, robots.txt, sitemap
├── scripts/
│   └── test-png.mjs           # PNG engine tests
└── src/
    ├── components/
    │   ├── PackOptimizer.jsx  # main UI + pipeline (React island)
    │   ├── PrivacyContent.jsx
    │   └── TermsContent.jsx
    ├── layouts/Layout.astro   # SEO shell: meta, OG, JSON-LD
    ├── lib/
    │   ├── png.js             # lossless PNG decoder/encoder/quantizer
    │   ├── pngWorker.js       # Web Worker: one job = one PNG
    │   └── i18n.js            # ID/EN translations
    ├── pages/                 # index, privacy, terms
    └── styles/globals.css
```

---

## 🧪 Testing

The PNG engine is verified with lossless round-trip tests (decode → encode → decode) covering palette, grayscale, RGB, RGBA, and 1-bit images.

```bash
npm run test:png
```

---

## ❓ FAQ

<details>
<summary><b>Is my pack uploaded to a server?</b></summary>

No. All processing happens locally in your browser.
</details>

<details>
<summary><b>Will texture quality drop?</b></summary>

It depends on the mode. **Lossless** does not change a single pixel. Normal, Extreme, and Ultra reduce resolution according to their scale. Alpha Cleanup, Metadata Strip, and the PNG encoder are visually lossless.
</details>

<details>
<summary><b>The result isn't smaller. Why?</b></summary>

Your pack may already be highly optimized. Size Guard makes sure files never grow. Try the **Ultra Compress** preset, or enable **Palette Quantize** if slight color changes are acceptable. If the result is not smaller than the original, auto-download is skipped, but you can still download it manually.
</details>

<details>
<summary><b>My sound-only pack got bigger. Why?</b></summary>

OGG files are already compressed, so there is little to gain, and some packs store identical sounds only once (deduplicated ZIP). Rewriting such a ZIP writes every duplicate in full. Check the **ZIP Diagnostics** lines in the log for duplicate counts and per-type sizes.
</details>

<details>
<summary><b>Are OGG files re-encoded?</b></summary>

No. Only ID3 metadata and padding are removed. Audio quality is identical.
</details>

<details>
<summary><b>Which browser should I use?</b></summary>

Chrome or any Chromium-based browser (Edge, Brave, etc.). Web Workers, OffscreenCanvas, and Compression Streams are required.
</details>

---

## 📝 Changelog

### v2.2.1
- ✨ ZIP diagnostics in the log (stored vs. real size per file type) and duplicate file detection
- 🛠️ OGG files are stored without DEFLATE

### v2.2
- 🐞 **Fix:** pack size increasing after optimization (canvas encoder + missing size guard)
- 🐞 **Fix:** small textures are no longer upscaled; non-strip atlases are no longer squashed
- 🐞 **Fix:** files no longer disappear when a worker fails; workers now run truly in parallel
- ✨ Smart PNG Encoder, universal Size Guard, Lossless mode and preset
- ✨ Optional Palette Quantize, new results summary (top savings, re-download)

### v2.0
- Astro.js + enterprise SEO (SSG, JSON-LD, sitemap)
- Pack Analyzer, preset system, power-of-two, JSON key sorting, `.lang` and `.bbmodel` support

### v1.x
- Alpha cleanup, single-color detection, deep JSON clean, safe OGG strip, Web Workers, Pojav Log Auto-Fix, SHA-1

---

## 🤝 Contributing

Issues and pull requests are welcome.

1. Fork this repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Run `npm run test:png` and `npm run build`
4. Commit and open a Pull Request

---

## 🇮🇩 Made in Indonesia

Ghaizers 2.0 is proudly **made from Indonesia 🇮🇩** for Minecraft players and pack creators around the world.

---

## ⚖️ License & Credits

Released under the [MIT License](LICENSE).

**Ghaizers 2.0** is created by **ghaa ([KhaizenNomazen](https://github.com/KhaizenNomazen))**.
This tool is **free**. If someone is selling it to you, you are being scammed. Please report it via GitHub.

<div align="center">

⭐ If this tool helped you, consider giving the repo a star!

**Made with ❤️ in Indonesia 🇮🇩**

[**optimizer.ghaa.my.id**](https://optimizer.ghaa.my.id)

</div>
