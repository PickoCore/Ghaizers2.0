<div align="center">

```
 ██████╗ ██╗  ██╗ █████╗ ██╗███████╗███████╗██████╗ ███████╗
██╔════╝ ██║  ██║██╔══██╗██║╚══███╔╝██╔════╝██╔══██╗██╔════╝
██║  ███╗███████║███████║██║  ███╔╝ █████╗  ██████╔╝███████╗
██║   ██║██╔══██║██╔══██║██║ ███╔╝  ██╔══╝  ██╔══██╗╚════██║
╚██████╔╝██║  ██║██║  ██║██║███████╗███████╗██║  ██║███████║
 ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝
                          2.0
```

### ⚡ Minecraft Resource Pack Optimizer — 100% Free, 100% Client-Side

<br/>

[![Website](https://img.shields.io/badge/🌐_Website-optimizer.ghaa.my.id-22c55e?style=for-the-badge)](https://optimizer.ghaa.my.id)
[![Made by ghaa](https://img.shields.io/badge/Made_by-ghaa_(KhaizenNomazen)-16a34a?style=for-the-badge&logo=github)](https://github.com/KhaizenNomazen)
[![License](https://img.shields.io/badge/License-Free_Forever-f59e0b?style=for-the-badge)](#)
[![Status](https://img.shields.io/badge/Status-Live_✔-22c55e?style=for-the-badge)](#)

<br/>

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![JSZip](https://img.shields.io/badge/JSZip-ff6b35?style=flat-square&logo=files&logoColor=white)](https://stuk.github.io/jszip/)
[![Web Workers](https://img.shields.io/badge/Web_Workers-Multi--threaded-8b5cf6?style=flat-square)](#)

<br/>

> **Tool gratis untuk mengoptimasi resource pack Minecraft.**
> Kompres PNG, minify JSON, optimize OGG — semuanya di browser kamu, tanpa upload ke server.
> Dibuat khusus untuk komunitas Minecraft Indonesia 🇮🇩

<br/>

---

</div>

## 📋 Daftar Isi

- [✨ Fitur Unggulan](#-fitur-unggulan)
- [🚀 Demo Langsung](#-demo-langsung)
- [⚙️ Cara Kerja](#️-cara-kerja)
- [🎯 Mode Optimasi](#-mode-optimasi)
- [🔬 Teknik Optimasi](#-teknik-optimasi)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Struktur Project](#-struktur-project)
- [💻 Development](#-development)
- [⚖️ Legal & Lisensi](#️-legal--lisensi)
- [👤 Author](#-author)

---

## ✨ Fitur Unggulan

<table>
<tr>
<td width="50%">

### 🖼️ PNG Optimization
- **Smart Resize** — Scale texture berdasarkan mode & kategori
- **Alpha Pixel Cleanup** — Zero RGB pada transparan pixel → entropy turun → ZIP lebih kecil
- **Single-Color Detection** — PNG solid 1 warna → resize ke 1×1 (teknik PackSquash)
- **IHDR Precheck** — Baca header PNG langsung tanpa decode penuh
- **Animated Strip Support** — Deteksi otomatis sprite sheet animasi
- **Size Guard** — Jika hasil resize lebih besar dari original, skip

</td>
<td width="50%">

### 🔊 JSON & Audio
- **JSON Minify** — Hapus whitespace & newline tidak perlu
- **Deep JSON Clean** — Hapus `__comment`, `_comment`, entry sounds kosong
- **OGG Safe Optimize** — Strip ID3 header & null padding tanpa re-encode
- **pack.mcmeta Editor** — Edit deskripsi pack langsung di browser
- **Sounds.json Cleanup** — Hapus entry dengan array kosong otomatis

</td>
</tr>
<tr>
<td width="50%">

### ⚡ Performance
- **Web Workers Multi-threaded** — PNG diproses paralel, tidak block UI
- **Worker Pool** — Auto-adjust berdasarkan `navigator.hardwareConcurrency`
- **Batch Progress** — Update progress setiap 20 file untuk efisiensi
- **ETA Counter** — Estimasi waktu selesai real-time
- **ZIP Level Control** — Pilih compression level 1–9

</td>
<td width="50%">

### 🛡️ Lainnya
- **Shader/Properties Minify** — Minify `.fsh`, `.vsh`, `.glsl`, `.properties`
- **Pojav Log Auto-Fix** — Parse `latestlog.txt` → otomatis fix animated strip
- **SHA-1 Verification** — Hash output untuk verifikasi integritas
- **Custom Pack Icon** — Override `pack.png` dengan auto-resize 128×128
- **Credit Injection** — Watermark hukum otomatis diinjeksi ke pack

</td>
</tr>
</table>

---

## 🚀 Demo Langsung

<div align="center">

### 🌐 [optimizer.ghaa.my.id](https://optimizer.ghaa.my.id)

| Step | Aksi |
|------|------|
| **1** | Upload file `.zip` resource pack kamu |
| **2** | Pilih mode optimasi (Normal / Extreme / Ultra) |
| **3** | Sesuaikan fine-tune slider resolusi |
| **4** | Toggle opsi yang diinginkan |
| **5** | Klik **✨ Optimize Sekarang** |
| **6** | Download `optimize_file.zip` otomatis |

</div>

---

## ⚙️ Cara Kerja

```
┌─────────────────────────────────────────────────────────────┐
│                    GHAIZERS 2.0 PIPELINE                    │
└─────────────────────────────────────────────────────────────┘

  📦 Input ZIP
       │
       ▼
  ┌─────────┐    ┌──────────────────────────────────────────┐
  │ JSZip   │───▶│ File Iterator (entry by entry)           │
  │ Parse   │    └──────────────────────────────────────────┘
  └─────────┘                      │
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
         📸 .png             📄 .json             🔊 .ogg
              │              .mcmeta              .properties
              │              .fsh .vsh                 │
              ▼                    │                    ▼
   ┌─────────────────┐             ▼         ┌─────────────────┐
   │  Worker Pool    │    ┌─────────────┐    │  OGG Safe       │
   │  (Multi-thread) │    │ Deep Clean  │    │  Strip ID3      │
   │                 │    │ Minify JSON │    │  Trim null pad  │
   │ • IHDR check    │    │ Rm comments │    └────────┬────────┘
   │ • Single-color? │    └──────┬──────┘             │
   │ • Alpha clean   │           │                    │
   │ • Resize        │           │                    │
   └────────┬────────┘           │                    │
            │                    │                    │
            └────────────────────┴────────────────────┘
                                 │
                                 ▼
                      ┌─────────────────┐
                      │  outZip.file()  │
                      │  Inject credits │
                      └────────┬────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │  DEFLATE Level   │
                    │  1–9 (user set)  │
                    └────────┬─────────┘
                             │
                             ▼
                    📦 optimize_file.zip
                    🔐 SHA-1 verified
```

---

## 🎯 Mode Optimasi

<div align="center">

| Mode | Scale | Max Size | Min Size | Target |
|------|-------|----------|----------|--------|
| 🟢 **Normal** | 85% | 512px | 16px | PC & HP mid-high |
| 🟡 **Extreme** | 60% | 256px | 8px | HP mid-low |
| 🔴 **Ultra Extreme** | 40% | 128px | 4px | HP kentang / Pojav lemah |

> **Fine-tune Slider**: Kalikan scale mode × slider (40%–120%) untuk kontrol presisi

</div>

---

## 🔬 Teknik Optimasi

<details>
<summary><b>🖼️ Alpha Pixel Cleanup — klik untuk detail</b></summary>

<br/>

PNG menyimpan data RGBA untuk setiap pixel. Pixel yang **fully transparent** (alpha = 0) seharusnya memiliki RGB = 0,0,0 — tapi banyak tool yang membiarkan RGB tetap berisi data warna, menyebabkan entropy tinggi.

**Solusi:** Zero out RGB pada semua pixel transparan sebelum encoding.

```
Sebelum:  pixel [255, 128, 64, 0]  ← transparan tapi RGB berisi data
Sesudah:  pixel [0,   0,   0,  0]  ← entropy rendah, ZIP lebih efektif
```

✅ **100% aman** — tidak ada perubahan visual sama sekali
✅ **Kompatibel** dengan semua versi Minecraft
✅ Terinspirasi dari teknik yang dipakai **PackSquash**

</details>

<details>
<summary><b>🎨 Single-Color Detection — klik untuk detail</b></summary>

<br/>

Beberapa texture dalam resource pack adalah warna solid satu warna (misalnya background transparan penuh, atau placeholder). Menyimpan PNG 16×16 warna solid adalah pemborosan.

**Solusi:** Jika semua pixel identik → resize ke 1×1.

```
Sebelum:  pack.png 256×256 = ~5KB (semua pixel #000000FF)
Sesudah:  pack.png 1×1    = ~67 bytes

Hemat: ~98.7% untuk file ini
```

✅ Minecraft akan scale texture ini secara normal
✅ Teknik resmi dari **PackSquash** optimizer

</details>

<details>
<summary><b>🔊 OGG Safe Optimization — klik untuk detail</b></summary>

<br/>

File `.ogg` dari resource pack sering mengandung metadata tidak perlu:

| Jenis Metadata | Ukuran Tipikal | Pengaruh Audio |
|----------------|----------------|----------------|
| ID3 Header | 1–50 KB | Tidak ada |
| ID3v1 Tag (akhir file) | 128 bytes | Tidak ada |
| Null padding | Bervariasi | Tidak ada |

**Solusi:** Strip semua metadata tanpa re-encode audio.

✅ **Kualitas audio 100% sama** — hanya metadata yang dihapus
✅ Tidak perlu library audio tambahan
✅ Bekerja murni dengan `Uint8Array` di browser

</details>

<details>
<summary><b>📄 Deep JSON Clean — klik untuk detail</b></summary>

<br/>

Banyak resource pack dibuat dengan **Blockbench**, tool 3D Minecraft editor yang menyisipkan field comment di JSON:

```json
{
  "__comment": "Made with Blockbench 4.x",
  "__author": "SomeCreator",
  "textures": { ... },
  "elements": [ ... ]
}
```

Field-field ini **tidak dibaca Minecraft sama sekali** — murni metadata tool.

**Selain itu**, `sounds.json` sering punya entry kosong:
```json
{
  "block.wood.hit": { "sounds": [] }
}
```

**Solusi:** Hapus semua field comment & entry sounds kosong.

</details>

<details>
<summary><b>⚡ Web Workers Multi-Threading — klik untuk detail</b></summary>

<br/>

Resize PNG adalah operasi CPU-intensive. Tanpa Workers, browser akan **freeze** saat memproses.

**Arsitektur Worker Pool:**

```
Main Thread                  Worker Pool (N workers)
     │                              │
     │─── runPngJob(payload) ──────▶│
     │                         ┌───┴────┐
     │                         │ Worker │ ← OffscreenCanvas API
     │                         │   1    │ ← ImageBitmap
     │                         └───┬────┘
     │                         ┌───┴────┐
     │                         │ Worker │
     │                         │   2    │
     │                         └───┬────┘
     │◀── { out, changed } ────────│
```

- **Auto-detect**: `Math.floor(navigator.hardwareConcurrency / 2)`
- **Min 2, Max 4** workers untuk stabilitas
- **Transferable objects**: buffer dikirim tanpa copy (zero-copy transfer)

</details>

---

## 🛠️ Tech Stack

<div align="center">

| Teknologi | Kegunaan |
|-----------|----------|
| ![Next.js](https://img.shields.io/badge/Next.js_14-000?style=flat-square&logo=nextdotjs) | Framework React + SSR |
| ![JSZip](https://img.shields.io/badge/JSZip_3.x-ff6b35?style=flat-square) | Read/write ZIP di browser |
| ![Web Workers](https://img.shields.io/badge/Web_Workers-API-8b5cf6?style=flat-square) | Multi-thread PNG processing |
| ![OffscreenCanvas](https://img.shields.io/badge/OffscreenCanvas-API-0ea5e9?style=flat-square) | GPU-accelerated image resize |
| ![Web Crypto](https://img.shields.io/badge/Web_Crypto-API-22c55e?style=flat-square) | SHA-1 verification |
| ![Vercel](https://img.shields.io/badge/Vercel-Deploy-000?style=flat-square&logo=vercel) | Hosting & deployment |
| ![Cloudflare](https://img.shields.io/badge/Cloudflare-DNS-f97316?style=flat-square&logo=cloudflare) | Domain & CDN |

</div>

---

## 📁 Struktur Project

```
ghaizers2.0/
│
├── 📁 pages/
│   ├── 📄 index.js          ← Main optimizer (semua logic ada di sini)
│   └── 📄 _app.js           ← Global head, SEO meta, Google verification
│
├── 📁 public/
│   ├── 📄 sitemap.xml       ← SEO sitemap
│   ├── 📄 robots.txt        ← Search engine crawl rules
│   └── 🖼️ og-image.png      ← Open Graph preview image
│
├── 📁 styles/
│   └── 📄 globals.css       ← Global styles & dark theme
│
├── 📄 package.json
├── 📄 next.config.js
└── 📄 README.md             ← You are here!
```

---

## 💻 Development

### Prerequisites
- Node.js 18+
- npm atau yarn

### Install & Run

```bash
# Clone repo
git clone https://github.com/KhaizenNomazen/ghaizers2.0.git
cd ghaizers2.0

# Install dependencies
npm install

# Run development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

### Build & Deploy

```bash
# Build production
npm run build

# Deploy ke Vercel (otomatis via GitHub push)
git push origin main
```

### Environment Variables

```env
# Tidak diperlukan untuk versi tanpa CAPTCHA
# .env.local (opsional)
```

---

## 📊 Performa Tipikal

<div align="center">

| Pack Size | Waktu Proses | Penghematan Rata-rata |
|-----------|-------------|----------------------|
| < 5 MB | < 10 detik | 30–50% |
| 5–20 MB | 10–45 detik | 25–45% |
| 20–50 MB | 45–120 detik | 20–40% |
| > 50 MB | > 2 menit | 15–35% |

> *Diukur pada Chrome Android dengan 4 Web Workers*

</div>

---

## ⚠️ Batasan yang Diketahui

- **JSZip tidak support ZIP non-standard** — Pack yang dibuat dengan WinRAR/7-Zip setting tertentu mungkin gagal dibaca. Solusi: re-zip pack dengan ZArchiver di Android
- **OffscreenCanvas** tidak tersedia di Safari lama — gunakan Chrome/Firefox
- **File > 500MB** mungkin crash di HP dengan RAM terbatas
- **Shader minify** agresif — cek pack jika ada visual glitch pada OptiFine shader

---

## ⚖️ Legal & Lisensi

<div align="center">

```
╔══════════════════════════════════════════════════════════════╗
║                    ⚠️  PERINGATAN HUKUM                      ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Tool ini adalah KARYA CIPTA ghaa (KhaizenNomazen)           ║
║                                                              ║
║  ✅ DIIZINKAN:                                               ║
║     • Penggunaan pribadi — GRATIS                            ║
║     • Komunitas / server non-komersial — GRATIS              ║
║     • Fork & modifikasi dengan tetap mencantumkan credit     ║
║                                                              ║
║  ❌ DILARANG KERAS:                                          ║
║     • Menjual tool ini dalam bentuk apapun                   ║
║     • Menghapus credit / watermark                           ║
║     • Mengklaim sebagai karya sendiri                        ║
║                                                              ║
║  Pelanggaran dapat dituntut berdasarkan:                     ║
║  🇮🇩 UU Hak Cipta No. 28 Tahun 2014                          ║
║  🌍 Berne Convention (Internasional)                          ║
║  🌍 WIPO Copyright Treaty                                     ║
║                                                              ║
║  Pidana: max 10 tahun | Denda: max Rp 4.000.000.000          ║
╚══════════════════════════════════════════════════════════════╝
```

**Jika kamu MEMBAYAR untuk tool ini → kamu DITIPU!**
Laporkan ke: [github.com/KhaizenNomazen](https://github.com/KhaizenNomazen)

</div>

---

## 👤 Author

<div align="center">

<img src="https://github.com/KhaizenNomazen.png" width="100" style="border-radius: 50%" alt="ghaa"/>

### ghaa (KhaizenNomazen)

[![GitHub](https://img.shields.io/badge/GitHub-KhaizenNomazen-181717?style=for-the-badge&logo=github)](https://github.com/KhaizenNomazen)
[![Website](https://img.shields.io/badge/Website-ghaa.my.id-22c55e?style=for-the-badge&logo=globe)](https://ghaa.my.id)
[![Optimizer](https://img.shields.io/badge/Tool-optimizer.ghaa.my.id-16a34a?style=for-the-badge&logo=minecraft)](https://optimizer.ghaa.my.id)

*Minecraft server developer & resource pack tooling enthusiast 🎮*
*NusaLife Server — Indonesia 🇮🇩*

</div>

---

## ⭐ Support

Kalau tool ini membantu kamu, please:

- ⭐ **Star** repo ini di GitHub
- 🔗 **Share** ke teman-teman komunitas Minecraft Indonesia
- 🐛 **Report bug** via GitHub Issues
- 💡 **Suggest fitur** baru via GitHub Discussions

---

<div align="center">

```
Made with 💚 by ghaa (KhaizenNomazen)
Tool ini GRATIS selamanya — untuk komunitas Minecraft Indonesia 🇮🇩
```

[![Back to Top](https://img.shields.io/badge/⬆️_Back_to_Top-gray?style=flat-square)](#)

</div>

---

## 🔄 Gimana Cara Kerjanya?

Banyak yang nanya flow compress-nya kayak gimana, jadi gw jelasin di sini.

Intinya ada **2 layer** yang terjadi:

**Layer 1 — Kurangin ukuran file itu sendiri**
Sebelum dizip, setiap file udah diproses dulu biar lebih kecil.

**Layer 2 — DEFLATE ZIP compression**
Karena kontennya udah ramping + entropy rendah, DEFLATE bisa kerja jauh lebih efektif.

---

### Urutan proses tiap file:

```
File masuk dari ZIP
  │
  ├─ System file? (.DS_Store, Thumbs.db, desktop.ini)
  │    → langsung dibuang
  │
  ├─ Non-game file? (.psd, .bak, .md, dll)
  │    → langsung dibuang
  │
  ├─ .fsh / .vsh / .glsl
  │    → hapus komentar // dan /* */ + collapse whitespace
  │
  ├─ .properties
  │    → hapus baris yang diawali #
  │
  ├─ .lang  (legacy MC 1.12.2)
  │    → hapus baris komentar
  │
  ├─ .bbmodel  (Blockbench)
  │    → hapus metadata: author, credit, date_modified, dll
  │
  ├─ .ogg
  │    → strip ID3v2 header di awal file
  │    → strip ID3v1 tag 128 byte di akhir file
  │    → trim null padding
  │    → TIDAK re-encode, kualitas audio 100% sama
  │
  ├─ .json / .mcmeta
  │    → parse → deep clean (__comment, sounds array kosong)
  │    → sort keys alphabetical (entropy turun, ZIP makin efektif)
  │    → minify (hapus semua whitespace yang ga dibutuhin MC)
  │
  └─ .png
       │
       ├─ Baca IHDR header langsung (tanpa decode penuh)
       ├─ Skip kalau < 2KB (ga worth diproses)
       │
       ├─ Single-color check
       │    semua pixel warna sama? → resize ke 1×1 px
       │    hemat sampai 98% untuk jenis texture ini
       │
       ├─ Resize berdasarkan mode yang dipilih
       │    Normal   → 85% scale, max 512px
       │    Extreme  → 60% scale, max 256px
       │    Ultra    → 40% scale, max 128px
       │
       │    + policy per kategori folder:
       │    textures/gui/    → scale 100%, min 16px, nearest
       │    textures/font/   → skip resize sama sekali
       │    textures/entity/ → scale 85%
       │    textures/particle/→ scale 75%, nearest
       │    modelengine/     → enforce animated strip fix
       │
       ├─ Power-of-two snap (opsional)
       │    snap ukuran ke 16, 32, 64, 128... dst
       │    GPU load lebih ringan
       │
       ├─ Alpha cleanup
       │    pixel fully transparent (alpha=0) → zero RGB-nya
       │    ga ada perubahan visual, tapi entropy PNG turun
       │    ZIP jadi lebih efektif
       │
       └─ Size guard
            kalau hasil resize ternyata lebih gede dari original
            → pakai file asli aja
```

---

### PNG diproses paralel (Web Workers)

PNG adalah operasi paling berat. Kalau dikerjain di main thread, browser bakal freeze.

Ghaizers bikin **worker pool** yang jumlahnya auto-detect dari `navigator.hardwareConcurrency`:

```
Main Thread
    │
    ├──▶ Worker 1 ──▶ OffscreenCanvas resize ──▶ hasil
    ├──▶ Worker 2 ──▶ OffscreenCanvas resize ──▶ hasil
    ├──▶ Worker 3 ──▶ OffscreenCanvas resize ──▶ hasil
    └──▶ Worker 4 ──▶ OffscreenCanvas resize ──▶ hasil
```

Buffer dikirim sebagai **Transferable Objects** — zero copy, tidak ada duplikasi memori.

---

### Output

Setelah semua file selesai:
- 2 file credit diinjeksi (`GHAIZERS_CREDIT.txt`, `JANGAN_BAYAR_INI.txt`)
- ZIP di-generate dengan DEFLATE level 1–9
- SHA-1 hash dihitung untuk verifikasi integritas
- File langsung ke-download otomatis sebagai `optimize_file.zip`
