import Head from "next/head";
import Link from "next/link";

const EFFECTIVE_DATE = "21 Maret 2026";
const SITE = "optimizer.ghaa.my.id";

export default function TermsOfService() {
  return (
    <>
      <Head>
        <title>Terms of Service – Ghaizers 2.0</title>
        <meta name="description" content="Terms of Service Ghaizers 2.0 — Minecraft Resource Pack Optimizer. Syarat dan Ketentuan Layanan." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`https://${SITE}/terms`} />
      </Head>

      <div style={{ fontFamily:"var(--f-body,DM Sans,sans-serif)", background:"var(--s0,#020508)", color:"var(--t1,#e2e8f0)", minHeight:"100vh" }}>

        {/* Navbar minimal */}
        <nav style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", height:56, background:"rgba(2,5,8,0.9)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.06)", position:"sticky", top:0, zIndex:100 }}>
          <Link href="/" style={{ fontFamily:"var(--f-display,Syne,sans-serif)", fontWeight:800, fontSize:16, color:"var(--teal,#2dd4bf)", textDecoration:"none", display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ width:28, height:28, borderRadius:7, background:"linear-gradient(135deg,#0d9488,#2dd4bf)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#000" }}>G</span>
            GHAIZERS
          </Link>
          <Link href="/" style={{ fontSize:13, color:"var(--t2,#94a3b8)", textDecoration:"none", padding:"6px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.08)" }}>
            ← Kembali
          </Link>
        </nav>

        <div style={{ maxWidth:760, margin:"0 auto", padding:"48px 24px 80px" }}>

          {/* Header */}
          <div style={{ marginBottom:40 }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"5px 14px", borderRadius:20, background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.2)", fontSize:11, color:"#fbbf24", fontFamily:"var(--f-mono,DM Mono,monospace)", letterSpacing:2, textTransform:"uppercase", marginBottom:20 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#fbbf24" }}/>
              Legal Document
            </div>
            <h1 style={{ fontFamily:"var(--f-display,Syne,sans-serif)", fontSize:"clamp(28px,5vw,42px)", fontWeight:900, letterSpacing:-2, lineHeight:1.1, marginBottom:12 }}>
              Terms of Service
            </h1>
            <p style={{ fontSize:14, color:"var(--t2,#94a3b8)" }}>
              Syarat & Ketentuan Layanan · {SITE} · Berlaku sejak {EFFECTIVE_DATE}
            </p>
          </div>

          {/* Warning box */}
          <div style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:12, padding:"16px 20px", marginBottom:36, fontSize:13, color:"rgba(252,165,165,0.9)", lineHeight:1.7 }}>
            ⚠️ <strong>PERINGATAN:</strong> Menjual, mendistribusikan, atau mengklaim kepemilikan Ghaizers 2.0 tanpa izin tertulis dari ghaa (KhaizenNomazen) adalah pelanggaran hukum yang dapat dikenakan sanksi pidana berdasarkan UU Hak Cipta No. 28 Tahun 2014.
          </div>

          {/* Lang toggle */}
          <div style={{ display:"flex", gap:8, marginBottom:36, borderBottom:"1px solid rgba(255,255,255,0.06)", paddingBottom:24 }}>
            <a href="#english" style={{ padding:"6px 16px", borderRadius:20, background:"rgba(45,212,191,0.1)", border:"1px solid rgba(45,212,191,0.25)", color:"var(--teal,#2dd4bf)", fontSize:12, fontWeight:600, textDecoration:"none" }}>🇬🇧 English</a>
            <a href="#indonesia" style={{ padding:"6px 16px", borderRadius:20, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"var(--t2,#94a3b8)", fontSize:12, fontWeight:600, textDecoration:"none" }}>🇮🇩 Indonesia</a>
          </div>

          {/* ── ENGLISH ── */}
          <section id="english" style={{ marginBottom:64 }}>
            <SectionBadge>English Version</SectionBadge>

            <H2>1. Acceptance of Terms</H2>
            <P>By accessing or using Ghaizers 2.0 ("the Tool") available at optimizer.ghaa.my.id, you agree to be bound by these Terms of Service. If you do not agree, please do not use the Tool.</P>

            <H2>2. Description of Service</H2>
            <P>Ghaizers 2.0 is a free, browser-based Minecraft resource pack optimizer. It processes resource pack files locally in your browser to reduce file size through PNG compression, JSON minification, OGG metadata removal, and other optimization techniques. No files are uploaded to any server.</P>

            <H2>3. Free Use</H2>
            <P>Ghaizers 2.0 is provided completely free of charge for:</P>
            <ul style={ulStyle}>
              <Li>Personal use</Li>
              <Li>Non-commercial community use (including Minecraft servers)</Li>
              <Li>Modification with proper credit attribution</Li>
            </ul>
            <P>There is no premium tier, no subscription, and no payment required. If anyone charges you for access to this Tool, that is a scam — please report it to us.</P>

            <H2>4. Prohibited Activities</H2>
            <P>You agree NOT to:</P>
            <ul style={ulStyle}>
              <Li>Sell, resell, or commercially distribute the Tool or its output without written permission from ghaa (KhaizenNomazen)</Li>
              <Li>Remove, alter, or obscure any copyright notices or credits embedded in the Tool</Li>
              <Li>Claim ownership of the Tool or present it as your own creation</Li>
              <Li>Use the Tool for any illegal purpose</Li>
              <Li>Use automated scripts to overload or abuse the service</Li>
            </ul>

            <H2>5. Intellectual Property</H2>
            <P>Ghaizers 2.0 and all its components are protected under:</P>
            <ul style={ulStyle}>
              <Li>Indonesian Copyright Law No. 28 of 2014 (Undang-Undang Hak Cipta No. 28 Tahun 2014)</Li>
              <Li>The Berne Convention for the Protection of Literary and Artistic Works</Li>
              <Li>The WIPO Copyright Treaty</Li>
            </ul>
            <P>Unauthorized commercial use may result in criminal penalties of up to 10 years imprisonment and fines up to Rp 4,000,000,000 under Indonesian law.</P>

            <H2>6. Disclaimer of Warranties</H2>
            <P>The Tool is provided "as is" without warranty of any kind. We strongly recommend keeping backups of your original resource pack files before optimization.</P>

            <H2>7. Limitation of Liability</H2>
            <P>To the fullest extent permitted by applicable law, ghaa (KhaizenNomazen) shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Tool, including but not limited to loss of data or corruption of resource packs.</P>

            <H2>8. Third-Party Content</H2>
            <P>Minecraft is a trademark of Mojang AB / Microsoft Corporation. Ghaizers 2.0 is an independent tool and is not affiliated with, endorsed by, or sponsored by Mojang or Microsoft.</P>

            <H2>9. Changes to Terms</H2>
            <P>We reserve the right to modify these Terms of Service at any time. Continued use after changes are posted constitutes acceptance of the revised terms.</P>

            <H2>10. Governing Law</H2>
            <P>These Terms shall be governed by and construed in accordance with the laws of the Republic of Indonesia.</P>

            <H2>11. Contact</H2>
            <P>For questions about these Terms: <a href="https://github.com/KhaizenNomazen" target="_blank" rel="noopener noreferrer" style={linkStyle}>github.com/KhaizenNomazen</a></P>
          </section>

          <Divider />

          {/* ── INDONESIA ── */}
          <section id="indonesia" style={{ marginTop:48 }}>
            <SectionBadge>Versi Indonesia</SectionBadge>

            <H2>1. Penerimaan Syarat</H2>
            <P>Dengan mengakses atau menggunakan Ghaizers 2.0 ("Tool") yang tersedia di optimizer.ghaa.my.id, kamu setuju untuk terikat oleh Syarat & Ketentuan ini. Jika tidak setuju, harap jangan gunakan Tool ini.</P>

            <H2>2. Deskripsi Layanan</H2>
            <P>Ghaizers 2.0 adalah optimizer resource pack Minecraft berbasis browser yang gratis. Tool memproses file secara lokal di browser kamu — tidak ada file yang diunggah ke server manapun.</P>

            <H2>3. Penggunaan Gratis</H2>
            <P>Ghaizers 2.0 disediakan sepenuhnya gratis untuk:</P>
            <ul style={ulStyle}>
              <Li>Penggunaan pribadi</Li>
              <Li>Penggunaan komunitas non-komersial (termasuk server Minecraft)</Li>
              <Li>Modifikasi dengan tetap mencantumkan kredit yang tepat</Li>
            </ul>
            <P>Tidak ada tier premium, tidak ada langganan, dan tidak diperlukan pembayaran. Jika ada yang memungut biaya untuk akses ke Tool ini, itu adalah penipuan — harap laporkan kepada kami.</P>

            <H2>4. Aktivitas yang Dilarang</H2>
            <P>Kamu setuju untuk TIDAK:</P>
            <ul style={ulStyle}>
              <Li>Menjual, menjual kembali, atau mendistribusikan Tool secara komersial tanpa izin tertulis dari ghaa (KhaizenNomazen)</Li>
              <Li>Menghapus, mengubah, atau menyembunyikan pemberitahuan hak cipta atau kredit yang tertanam dalam Tool</Li>
              <Li>Mengklaim kepemilikan Tool atau mempresentasikannya sebagai karya sendiri</Li>
              <Li>Menggunakan Tool untuk tujuan ilegal apapun</Li>
              <Li>Menggunakan skrip otomatis untuk membebani atau menyalahgunakan layanan</Li>
            </ul>

            <H2>5. Kekayaan Intelektual</H2>
            <P>Ghaizers 2.0 dilindungi oleh:</P>
            <ul style={ulStyle}>
              <Li>Undang-Undang Hak Cipta No. 28 Tahun 2014 (Indonesia)</Li>
              <Li>Konvensi Berne untuk Perlindungan Karya Sastra dan Seni</Li>
              <Li>WIPO Copyright Treaty</Li>
            </ul>
            <P>Pelanggaran dapat mengakibatkan hukuman pidana hingga 10 tahun penjara dan denda hingga Rp 4.000.000.000 berdasarkan hukum Indonesia.</P>

            <H2>6. Penyangkalan Garansi</H2>
            <P>Tool disediakan "sebagaimana adanya" tanpa jaminan apapun. Kami sangat menyarankan untuk menyimpan backup file resource pack asli sebelum optimasi.</P>

            <H2>7. Batasan Tanggung Jawab</H2>
            <P>Sejauh diizinkan oleh hukum yang berlaku, ghaa (KhaizenNomazen) tidak bertanggung jawab atas kerusakan tidak langsung, insidental, atau konsekuensial yang timbul dari penggunaan Tool.</P>

            <H2>8. Konten Pihak Ketiga</H2>
            <P>Minecraft adalah merek dagang dari Mojang AB / Microsoft Corporation. Ghaizers 2.0 adalah tool independen dan tidak berafiliasi dengan Mojang atau Microsoft.</P>

            <H2>9. Perubahan Syarat</H2>
            <P>Kami berhak mengubah Syarat & Ketentuan ini kapan saja. Penggunaan yang berlanjut setelah perubahan diposting merupakan penerimaan syarat yang direvisi.</P>

            <H2>10. Hukum yang Berlaku</H2>
            <P>Syarat ini diatur oleh hukum Republik Indonesia.</P>

            <H2>11. Kontak</H2>
            <P>Untuk pertanyaan: <a href="https://github.com/KhaizenNomazen" target="_blank" rel="noopener noreferrer" style={linkStyle}>github.com/KhaizenNomazen</a></P>
          </section>

        </div>

        {/* Footer */}
        <div style={{ textAlign:"center", padding:"24px", borderTop:"1px solid rgba(255,255,255,0.06)", fontSize:12, color:"rgba(148,163,184,0.5)" }}>
          © 2025–2026 ghaa (KhaizenNomazen) · <Link href="/privacy" style={{ color:"var(--teal,#2dd4bf)", textDecoration:"none" }}>Privacy Policy</Link> · <Link href="/" style={{ color:"inherit", textDecoration:"none" }}>optimizer.ghaa.my.id</Link>
        </div>
      </div>
    </>
  );
}

/* ── Sub-components ── */
const ulStyle = { margin:"12px 0 16px 0", paddingLeft:0, listStyle:"none" };
const linkStyle = { color:"var(--teal,#2dd4bf)", textDecoration:"none" };

function SectionBadge({ children }) {
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:20, background:"rgba(45,212,191,0.08)", border:"1px solid rgba(45,212,191,0.15)", fontSize:11, color:"var(--teal,#2dd4bf)", fontWeight:600, letterSpacing:1, textTransform:"uppercase", marginBottom:28 }}>
      {children}
    </div>
  );
}

function H2({ children }) {
  return <h2 style={{ fontFamily:"var(--f-display,Syne,sans-serif)", fontSize:18, fontWeight:800, color:"var(--t1,#e2e8f0)", marginTop:36, marginBottom:12, letterSpacing:-0.5 }}>{children}</h2>;
}

function H3({ children }) {
  return <h3 style={{ fontSize:14, fontWeight:600, color:"#fbbf24", marginTop:20, marginBottom:8 }}>{children}</h3>;
}

function P({ children }) {
  return <p style={{ fontSize:14, color:"var(--t2,#94a3b8)", lineHeight:1.8, marginBottom:12 }}>{children}</p>;
}

function Li({ children }) {
  return (
    <li style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:8, fontSize:14, color:"var(--t2,#94a3b8)", lineHeight:1.6 }}>
      <span style={{ color:"var(--teal,#2dd4bf)", flexShrink:0, marginTop:2, fontSize:12 }}>▸</span>
      <span>{children}</span>
    </li>
  );
}

function Divider() {
  return <div style={{ height:1, background:"rgba(255,255,255,0.06)", margin:"8px 0" }} />;
}
