// ============================================================
// GHAIZERS 2.0 — i18n Translation System
// Supports: Bahasa Indonesia (id) + English (en)
// Auto-detect from navigator.language
// ============================================================

export const TRANSLATIONS = {
  id: {
    // Navbar
    nav_docs: "Docs",
    nav_faq: "FAQ",
    nav_log: "Log",
    nav_github: "GitHub",

    // Watermark
    watermark: "Tool ini 100% GRATIS oleh ghaa — Jika kamu membayar, kamu DITIPU!",

    // Hero
    hero_eyebrow: "⚡ MINECRAFT PACK OPTIMIZER",
    hero_title_1: "Optimize",
    hero_title_accent: "Resource Pack",
    hero_title_2: "Minecraft Kamu",
    hero_title_gold: "Gratis",
    hero_sub: "Kompres PNG, minify JSON, optimize OGG — semua di browser kamu, tanpa upload ke server. Cocok untuk Pojav Launcher, HP low-end, dan Bedrock.",
    hero_cta: "✨ MULAI OPTIMIZE",
    hero_docs: "📚 Dokumentasi",
    hero_stat_1: "Client-Side",
    hero_stat_2: "Upload ke Server",
    hero_stat_3: "Verified",
    hero_stat_4: "Selamanya",

    // Feature cards
    feat_1_title: "PNG Smart Resize",
    feat_1_desc: "Scale + power-of-two enforcement",
    feat_2_title: "Alpha Cleanup",
    feat_2_desc: "Zero RGB pixel transparan → ZIP kecil",
    feat_3_title: "Single-Color Detect",
    feat_3_desc: "PNG solid → 1×1 px (PackSquash)",
    feat_4_title: "Deep JSON Clean",
    feat_4_desc: "Comment fields, sounds kosong, key sort",
    feat_5_title: "OGG Safe Strip",
    feat_5_desc: "Hapus ID3 metadata tanpa re-encode",
    feat_6_title: "Web Workers",
    feat_6_desc: "Multi-thread, browser tidak freeze",
    feat_7_title: "Pack Analyzer",
    feat_7_desc: "Scan & analisis tanpa optimize",
    feat_8_title: "Badge Generator",
    feat_8_desc: "Badge 'Optimized with Ghaizers'",

    // Sections
    sec_upload_title: "Upload Resource Pack",
    sec_upload_sub: "Drag & drop atau klik untuk pilih file .zip",
    sec_upload_drop_title: "Drop file .zip di sini",
    sec_upload_drop_sub: "atau klik untuk browse · Proses 100% client-side",
    sec_upload_change: "Klik untuk ganti",

    sec_preset_title: "Quick Preset",
    sec_preset_sub: "Terapkan konfigurasi siap pakai sesuai kebutuhan",

    sec_mode_title: "Mode Optimasi",
    sec_mode_sub: "Pilih sesuai target device",
    mode_normal_desc: "Seimbang, kualitas bagus dan pack tetap ringan.",
    mode_extreme_desc: "Sangat hemat, cocok untuk device mid–low.",
    mode_ultra_desc: "Paling ringan, untuk HP kentang / Pojav lemah.",

    sec_resolution_title: "Fine-tune Resolusi",
    sec_resolution_sub: "Kalikan scale mode × slider",

    sec_options_title: "Opsi Optimasi",
    sec_options_sub: "Toggle fitur sesuai kebutuhan",
    opt_pixelart: "Preserve Pixel Art",
    opt_pixelart_desc: "Jaga ketajaman GUI & font (nearest-neighbor)",
    opt_ogg: "Optimize OGG Sound",
    opt_ogg_desc: "Strip metadata ID3 tanpa re-encode audio",
    opt_alpha: "Alpha Pixel Cleanup",
    opt_alpha_desc: "Zero RGB transparan pixel → ZIP lebih kecil",
    opt_singlecolor: "Single-Color Detect",
    opt_singlecolor_desc: "PNG solid satu warna → resize ke 1×1",
    opt_deepjson: "Deep JSON Clean",
    opt_deepjson_desc: "Hapus __comment, sounds kosong, dll",
    opt_shader: "Shader Minify",
    opt_shader_desc: "Minify .fsh/.vsh/.glsl/.properties OptiFine",
    opt_pow2: "Power-of-Two",
    opt_pow2_desc: "Snap ukuran PNG ke 2^n terdekat (16,32,64...)",
    opt_jsonsort: "JSON Key Sorting",
    opt_jsonsort_desc: "Sort keys alphabetically → better compression",
    opt_lang: ".lang Minify",
    opt_lang_desc: "Minify legacy language files MC 1.12.2",

    sec_advanced_title: "Pengaturan Lanjutan",
    zip_level: "ZIP Compression Level",
    workers_label: "Web Workers",
    workers_auto: "Auto",

    sec_icon_title: "Custom Pack Icon",
    sec_icon_sub: "Override pack.png · Auto-resize 128×128",
    icon_placeholder: "Klik untuk pilih gambar icon",
    icon_sub: "PNG atau JPG",

    sec_mcmeta_title: "pack.mcmeta Editor",
    sec_mcmeta_sub: "Credit ghaa otomatis diinjeksi",
    mcmeta_empty: "pack.mcmeta tidak ditemukan atau belum di-load.",

    sec_pojav_title: "Pojav Log Auto-Fix",
    sec_pojav_sub: "Parse latestlog.txt → fix animated strip otomatis",
    pojav_placeholder: "Klik untuk pilih latestlog.txt",
    pojav_detected: "path enforce-strip",

    sec_progress_title: "Progress",
    progress_waiting: "Menunggu file...",
    progress_eta: "ETA",

    sec_console_title: "Console Output",
    console_empty: "Belum ada log. Upload pack lalu klik Optimize atau Analyze.",

    // Buttons
    btn_optimize: "✨ OPTIMIZE SEKARANG",
    btn_optimizing: "🔄 Mengoptimasi...",
    btn_upload_first: "📦 Upload pack dulu",

    // Summary
    sum_savings: "ukuran berkurang",
    sum_png: "PNG Dioptimasi",
    sum_png_skip: "PNG Skipped",
    sum_single: "Single-Color→1×1",
    sum_alpha: "Alpha Cleaned",
    sum_pow2: "Power-of-Two",
    sum_ogg: "OGG Optimized",
    sum_json: "JSON Minified",
    sum_deep: "JSON Deep Clean",
    sum_keysort: "JSON Key Sort",
    sum_shader: "Shader Minified",
    sum_lang: ".lang Minified",
    sum_bbmodel: ".bbmodel Cleaned",
    sum_oversized: "⚠️ Oversized",
    sum_removed: "File Dihapus",
    sum_workers: "Workers",
    sum_sha: "SHA-1 Hash",
    sum_done: "sudah ter-download · Credit ghaa sudah diinjeksi",
    share_wa: "📱 WhatsApp",
    share_tw: "🐦 Twitter/X",
    share_copy: "📋 Copy",

    // Badge gen
    sec_badge_title: "Badge Generator",
    sec_badge_sub: "Tambahkan badge 'Optimized with Ghaizers' ke README pack kamu",

    // Analyzer
    sec_analyzer_title: "Hasil Analisis",
    sec_analyzer_sub: "Scan pack tanpa proses optimize",
    tab_overview: "📊 Overview",
    tab_files: "📁 Top Files",
    tab_issues: "⚠️ Issues",
    analyzer_total: "Total File",
    analyzer_size: "Total Size",
    analyzer_no_issues: "✅ Tidak ada masalah terdeteksi!",

    // Docs
    docs_title: "📚 DOKUMENTASI",
    faq_title: "❓ FAQ",
    changelog_title: "📋 CHANGELOG",

    // Footer
    footer_free: "🆓 Tool ini GRATIS selamanya — Jangan bayar siapapun untuk ini!",
    footer_legal: "⚖️ Menjual tool ini = Pelanggaran UU Hak Cipta No. 28/2014\nPidana max 10 tahun · Denda max Rp 4.000.000.000",
  },

  en: {
    // Navbar
    nav_docs: "Docs",
    nav_faq: "FAQ",
    nav_log: "Log",
    nav_github: "GitHub",

    // Watermark
    watermark: "This tool is 100% FREE by ghaa — If you paid for this, you got SCAMMED!",

    // Hero
    hero_eyebrow: "⚡ MINECRAFT PACK OPTIMIZER",
    hero_title_1: "Optimize Your",
    hero_title_accent: "Minecraft",
    hero_title_2: "Resource Pack",
    hero_title_gold: "For Free",
    hero_sub: "Compress PNG, minify JSON, optimize OGG — all in your browser, no server upload needed. Perfect for Pojav Launcher, low-end devices, and Bedrock.",
    hero_cta: "✨ START OPTIMIZING",
    hero_docs: "📚 Documentation",
    hero_stat_1: "Client-Side",
    hero_stat_2: "Server Upload",
    hero_stat_3: "Verified",
    hero_stat_4: "Forever",

    // Feature cards
    feat_1_title: "PNG Smart Resize",
    feat_1_desc: "Scale + power-of-two enforcement",
    feat_2_title: "Alpha Cleanup",
    feat_2_desc: "Zero transparent pixel RGB → smaller ZIP",
    feat_3_title: "Single-Color Detect",
    feat_3_desc: "Solid PNG → 1×1 px (PackSquash technique)",
    feat_4_title: "Deep JSON Clean",
    feat_4_desc: "Remove comment fields, empty sounds, key sort",
    feat_5_title: "OGG Safe Strip",
    feat_5_desc: "Remove ID3 metadata without re-encoding",
    feat_6_title: "Web Workers",
    feat_6_desc: "Multi-threaded, browser stays responsive",
    feat_7_title: "Pack Analyzer",
    feat_7_desc: "Scan & analyze without optimizing",
    feat_8_title: "Badge Generator",
    feat_8_desc: "'Optimized with Ghaizers' badge for README",

    // Sections
    sec_upload_title: "Upload Resource Pack",
    sec_upload_sub: "Drag & drop or click to select a .zip file",
    sec_upload_drop_title: "Drop your .zip file here",
    sec_upload_drop_sub: "or click to browse · 100% client-side processing",
    sec_upload_change: "Click to change",

    sec_preset_title: "Quick Preset",
    sec_preset_sub: "Apply ready-made configurations for your needs",

    sec_mode_title: "Optimization Mode",
    sec_mode_sub: "Choose based on target device",
    mode_normal_desc: "Balanced, good quality while keeping pack lightweight.",
    mode_extreme_desc: "Very efficient, suited for mid-low end devices.",
    mode_ultra_desc: "Lightest output, for potato phones & Pojav Launcher.",

    sec_resolution_title: "Fine-tune Resolution",
    sec_resolution_sub: "Multiplies mode scale × slider value",

    sec_options_title: "Optimization Options",
    sec_options_sub: "Toggle features as needed",
    opt_pixelart: "Preserve Pixel Art",
    opt_pixelart_desc: "Keep GUI & font sharpness (nearest-neighbor)",
    opt_ogg: "Optimize OGG Sound",
    opt_ogg_desc: "Strip ID3 metadata without re-encoding audio",
    opt_alpha: "Alpha Pixel Cleanup",
    opt_alpha_desc: "Zero transparent pixel RGB → smaller ZIP",
    opt_singlecolor: "Single-Color Detection",
    opt_singlecolor_desc: "Solid single-color PNG → resize to 1×1",
    opt_deepjson: "Deep JSON Clean",
    opt_deepjson_desc: "Remove __comment, empty sounds arrays, etc.",
    opt_shader: "Shader Minify",
    opt_shader_desc: "Minify .fsh/.vsh/.glsl/.properties (OptiFine)",
    opt_pow2: "Power-of-Two",
    opt_pow2_desc: "Snap PNG sizes to nearest 2^n (16,32,64...)",
    opt_jsonsort: "JSON Key Sorting",
    opt_jsonsort_desc: "Sort keys alphabetically → better compression",
    opt_lang: ".lang Minify",
    opt_lang_desc: "Minify legacy MC 1.12.2 language files",

    sec_advanced_title: "Advanced Settings",
    zip_level: "ZIP Compression Level",
    workers_label: "Web Workers",
    workers_auto: "Auto",

    sec_icon_title: "Custom Pack Icon",
    sec_icon_sub: "Override pack.png · Auto-resize to 128×128",
    icon_placeholder: "Click to choose pack icon",
    icon_sub: "PNG or JPG",

    sec_mcmeta_title: "pack.mcmeta Editor",
    sec_mcmeta_sub: "ghaa credit is auto-injected",
    mcmeta_empty: "pack.mcmeta not found or not yet loaded.",

    sec_pojav_title: "Pojav Log Auto-Fix",
    sec_pojav_sub: "Parse latestlog.txt → auto-fix animated strips",
    pojav_placeholder: "Click to choose latestlog.txt",
    pojav_detected: "enforce-strip paths detected",

    sec_progress_title: "Progress",
    progress_waiting: "Waiting for file...",
    progress_eta: "ETA",

    sec_console_title: "Console Output",
    console_empty: "No logs yet. Upload a pack then click Optimize or Analyze.",

    // Buttons
    btn_optimize: "✨ OPTIMIZE NOW",
    btn_optimizing: "🔄 Optimizing...",
    btn_upload_first: "📦 Upload pack first",

    // Summary
    sum_savings: "size reduction",
    sum_png: "PNG Optimized",
    sum_png_skip: "PNG Skipped",
    sum_single: "Single-Color→1×1",
    sum_alpha: "Alpha Cleaned",
    sum_pow2: "Power-of-Two",
    sum_ogg: "OGG Optimized",
    sum_json: "JSON Minified",
    sum_deep: "JSON Deep Clean",
    sum_keysort: "JSON Key Sort",
    sum_shader: "Shader Minified",
    sum_lang: ".lang Minified",
    sum_bbmodel: ".bbmodel Cleaned",
    sum_oversized: "⚠️ Oversized",
    sum_removed: "Files Removed",
    sum_workers: "Workers",
    sum_sha: "SHA-1 Hash",
    sum_done: "downloaded · ghaa credit injected into pack",
    share_wa: "📱 WhatsApp",
    share_tw: "🐦 Twitter/X",
    share_copy: "📋 Copy",

    // Badge gen
    sec_badge_title: "Badge Generator",
    sec_badge_sub: "Add an 'Optimized with Ghaizers' badge to your pack README",

    // Analyzer
    sec_analyzer_title: "Analysis Results",
    sec_analyzer_sub: "Pack scanned without optimizing",
    tab_overview: "📊 Overview",
    tab_files: "📁 Top Files",
    tab_issues: "⚠️ Issues",
    analyzer_total: "Total Files",
    analyzer_size: "Total Size",
    analyzer_no_issues: "✅ No issues detected!",

    // Docs
    docs_title: "📚 DOCUMENTATION",
    faq_title: "❓ FAQ",
    changelog_title: "📋 CHANGELOG",

    // Footer
    footer_free: "🆓 This tool is FREE forever — Don't pay anyone for this!",
    footer_legal: "⚖️ Selling this tool = Copyright Infringement\nMax 10 years prison · Max Rp 4,000,000,000 fine",
  }
};

// Detect language from browser
export function detectLanguage() {
  if (typeof navigator === "undefined") return "id";
  const lang = navigator.language || navigator.languages?.[0] || "id";
  return lang.toLowerCase().startsWith("id") ? "id" : "en";
}

// Hook-like helper
export function t(translations, key, fallback = "") {
  return translations[key] ?? fallback;
}

