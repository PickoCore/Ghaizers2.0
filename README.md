# Ghaizers2.0 — Astro.js Edition (Enterprise SEO)

Migrasi dari Next.js ke **Astro.js**. Halaman utama dirender sebagai HTML statis
(SSG) untuk SEO maksimal, dan tool optimizer (interaktif) tetap berjalan penuh
di browser sebagai **React island** (`client:load`) — jadi cepat di-crawl
Google *dan* tetap 100% client-side processing seperti sebelumnya.

## Apa yang berubah
- ✅ Framework: Next.js → **Astro 4** (output HTML default = 0 JS kecuali komponen interaktif)
- ✅ SEO: meta title/description per halaman, Open Graph, Twitter Card, canonical, hreflang, `robots` meta
- ✅ Structured data (JSON-LD): `WebApplication`, `Organization`, `FAQPage`
- ✅ Sitemap otomatis via `@astrojs/sitemap` (`/sitemap-index.xml`) — tidak perlu update manual lagi
- ✅ `robots.txt` mengarah ke sitemap otomatis
- ✅ Logic optimizer (PNG/JSON/OGG compression, JSZip, dst) **tidak diubah sama sekali** — dipindah utuh ke `src/components/PackOptimizer.jsx`

## Yang masih perlu kamu lakukan secara manual
1. **Buat gambar Open Graph** `public/og-cover.png` ukuran 1200×630px (untuk preview share di WhatsApp/Twitter/Facebook). Tanpa file ini, link masih valid tapi tidak ada gambar preview.
2. Cek ulang `google-site-verification` di `src/layouts/Layout.astro` — pastikan masih sama dengan punya kamu di Google Search Console.
3. Setelah deploy live, **submit ulang sitemap** (`https://optimizer.ghaa.my.id/sitemap-index.xml`) ke Google Search Console.
4. ⚠️ Project ini belum pernah dijalankan `npm install` / `npm run build` oleh saya (sandbox saya tidak punya akses internet). **Wajib kamu test `npm run dev` dan `npm run build` dulu** sebelum deploy ke production, untuk memastikan tidak ada typo/error saat porting dari JSX Next.js ke Astro.

---

## Langkah Deploy via Termux (lengkap, dari nol)

### 1. Siapkan Termux
```bash
pkg update && pkg upgrade -y
pkg install git nodejs-lts -y
node -v   # pastikan v18+ atau v20+
```

### 2. Pindahkan/ekstrak project ke Termux
```bash
termux-setup-storage
cd ~
cp -r /storage/emulated/0/Download/ghaizers-astro ~/ghaizers-astro
cd ~/ghaizers-astro
```

### 3. Install dependencies & test lokal
```bash
npm install
npm run dev
# buka http://localhost:4321 di browser HP kamu untuk cek tampilan & fungsi
```
Kalau ada error saat `npm run dev`, baca pesan errornya — biasanya typo JSX hasil migrasi. Beri tahu saya pesan errornya kalau butuh dibantu fix.

### 4. Build production (cek SEO output)
```bash
npm run build
npm run preview
```
Cek `dist/index.html` — pastikan `<title>`, `<meta description>`, dan JSON-LD sudah muncul di HTML (klik kanan → View Source, bukan inspect element, supaya kelihatan HTML aslinya sebelum JS jalan — ini yang dilihat Googlebot).

### 5. Setup Git & GitHub
```bash
git config --global user.name "Nama Kamu"
git config --global user.email "email@kamu.com"

git init
git add .
git commit -m "Migrate to Astro.js with enterprise-grade SEO"
git branch -M main
```

Buat repo baru kosong di github.com (jangan centang "Initialize with README"), lalu:
```bash
git remote add origin https://github.com/USERNAME/Ghaizers2.0.git
git push -u origin main
```
Saat diminta login:
- Username: username GitHub kamu
- Password: **bukan password akun** — gunakan Personal Access Token (PAT).
  Buat di: GitHub → Settings → Developer settings → Personal access tokens → Generate new token (centang scope `repo`).

### 6. Deploy ke hosting (gratis, auto-deploy tiap push)
Pilih salah satu — semua support Astro secara native:

**Vercel** (paling mudah):
1. Buka vercel.com → Add New Project → Import repo GitHub kamu
2. Framework preset otomatis terdeteksi "Astro" — biarkan default
3. Deploy

**Cloudflare Pages**:
1. Buka dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git
2. Build command: `npm run build`, Output directory: `dist`
3. Deploy

Setelah connect, **setiap kali `git push` dari Termux, situs otomatis re-build & deploy** — tidak perlu upload manual lagi.

### 7. Custom domain (kalau pakai `optimizer.ghaa.my.id`)
Tambahkan domain di dashboard Vercel/Cloudflare Pages → ikuti instruksi DNS (biasanya tinggal tambah CNAME record di pengaturan DNS domain kamu).

---

## Struktur project
```
ghaizers-astro/
├── astro.config.mjs        # config Astro + integrasi React & sitemap
├── package.json
├── public/                  # favicon, manifest, robots.txt (file statis)
├── src/
│   ├── layouts/
│   │   └── Layout.astro     # SEO shell: meta, OG, JSON-LD, favicon (dipakai semua halaman)
│   ├── pages/
│   │   ├── index.astro      # homepage
│   │   ├── privacy.astro
│   │   └── terms.astro
│   ├── components/
│   │   ├── PackOptimizer.jsx   # tool utama (React island, client:load)
│   │   ├── PrivacyContent.jsx
│   │   └── TermsContent.jsx
│   ├── lib/i18n.js           # sistem translasi ID/EN (tidak diubah)
│   └── styles/globals.css
```

## Catatan soal "rank #1 di Google"
SEO teknis di project ini sudah enterprise-grade (SSG, structured data, sitemap, Core Web Vitals-friendly karena Astro 0-JS by default). Tapi ranking aktual juga ditentukan oleh **backlink, domain authority, dan kompetitor** — bagian itu di luar kode, perlu strategi konten & promosi jangka panjang.
