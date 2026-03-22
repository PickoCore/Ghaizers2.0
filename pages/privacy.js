import Head from "next/head";
import Link from "next/link";

const EFFECTIVE_DATE = "21 Maret 2026";
const SITE = "optimizer.ghaa.my.id";

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy – Ghaizers 2.0</title>
        <meta name="description" content="Privacy Policy Ghaizers 2.0 — Minecraft Resource Pack Optimizer. Kebijakan Privasi." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`https://${SITE}/privacy`} />
      </Head>

      <div style={{ fontFamily: "var(--f-body,DM Sans,sans-serif)", background: "var(--s0,#020508)", color: "var(--t1,#e2e8f0)", minHeight: "100vh" }}>

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

        {/* Content */}
        <div style={{ maxWidth:760, margin:"0 auto", padding:"48px 24px 80px" }}>

          {/* Header */}
          <div style={{ marginBottom:40 }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"5px 14px", borderRadius:20, background:"rgba(45,212,191,0.1)", border:"1px solid rgba(45,212,191,0.2)", fontSize:11, color:"var(--teal,#2dd4bf)", fontFamily:"var(--f-mono,DM Mono,monospace)", letterSpacing:2, textTransform:"uppercase", marginBottom:20 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--teal,#2dd4bf)" }}/>
              Legal Document
            </div>
            <h1 style={{ fontFamily:"var(--f-display,Syne,sans-serif)", fontSize:"clamp(28px,5vw,42px)", fontWeight:900, letterSpacing:-2, lineHeight:1.1, marginBottom:12 }}>
              Privacy Policy
            </h1>
            <p style={{ fontSize:14, color:"var(--t2,#94a3b8)" }}>
              Kebijakan Privasi · {SITE} · Berlaku sejak {EFFECTIVE_DATE}
            </p>
          </div>

          {/* Lang toggle */}
          <div style={{ display:"flex", gap:8, marginBottom:36, borderBottom:"1px solid rgba(255,255,255,0.06)", paddingBottom:24 }}>
            <a href="#english" style={{ padding:"6px 16px", borderRadius:20, background:"rgba(45,212,191,0.1)", border:"1px solid rgba(45,212,191,0.25)", color:"var(--teal,#2dd4bf)", fontSize:12, fontWeight:600, textDecoration:"none" }}>🇬🇧 English</a>
            <a href="#indonesia" style={{ padding:"6px 16px", borderRadius:20, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"var(--t2,#94a3b8)", fontSize:12, fontWeight:600, textDecoration:"none" }}>🇮🇩 Indonesia</a>
          </div>

          {/* ── ENGLISH ── */}
          <section id="english" style={{ marginBottom:64 }}>
            <SectionBadge>English Version</SectionBadge>

            <H2>1. Overview</H2>
            <P>Ghaizers 2.0 is a free, browser-based Minecraft resource pack optimizer created by ghaa (KhaizenNomazen). We take your privacy seriously. This Privacy Policy explains what information is collected, how it is used, and your rights as a user.</P>

            <H2>2. Data We Do NOT Collect</H2>
            <P>The following data is never collected, stored, or transmitted to any server:</P>
            <ul style={ulStyle}>
              <Li>Resource pack files you upload — all processing happens locally in your browser</Li>
              <Li>File contents, filenames, or pack metadata</Li>
              <Li>Personal identity information (name, email, address)</Li>
              <Li>Account credentials (there is no account system)</Li>
              <Li>Payment information (the Tool is completely free)</Li>
            </ul>

            <H2>3. Data We May Collect</H2>
            <H3>3.1 Analytics (Google Analytics)</H3>
            <P>We use Google Analytics to understand how users interact with the website. Google Analytics may collect:</P>
            <ul style={ulStyle}>
              <Li>Pages visited and time spent on pages</Li>
              <Li>Browser type, operating system, and device type</Li>
              <Li>Approximate geographic location (country/city level)</Li>
              <Li>Referral sources (how you found the site)</Li>
            </ul>
            <P>This data is anonymous and aggregated. It does not identify you personally. You can opt out via <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" style={linkStyle}>Google Analytics Opt-out Browser Add-on</a>.</P>

            <H3>3.2 Cookies</H3>
            <P>Google Analytics uses cookies to distinguish users and sessions. You can disable cookies in your browser settings, though this may affect website functionality.</P>

            <H2>4. Third-Party Services</H2>
            <P>When you use the Badge Generator or Share features, you may be redirected to third-party platforms (Twitter/X, WhatsApp). Once you leave our website, their respective privacy policies apply. We are not responsible for the privacy practices of external platforms.</P>

            <H2>5. Data Storage & Security</H2>
            <P>Since all resource pack processing is done entirely in your browser (client-side), no file data is ever transmitted to or stored on our servers. Your files remain on your device at all times.</P>

            <H2>6. Children's Privacy</H2>
            <P>Ghaizers 2.0 does not knowingly collect personal data from children under 13 years of age. If you believe a child has provided personal information to us, please contact us so we can delete it.</P>

            <H2>7. Changes to This Policy</H2>
            <P>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date. Continued use of the Tool after changes are posted constitutes your acceptance of the revised policy.</P>

            <H2>8. Contact</H2>
            <P>For privacy-related questions or concerns, contact us at: <a href="https://github.com/KhaizenNomazen" target="_blank" rel="noopener noreferrer" style={linkStyle}>github.com/KhaizenNomazen</a></P>
          </section>

          <Divider />

          {/* ── INDONESIA ── */}
          <section id="indonesia" style={{ marginTop:48 }}>
            <SectionBadge>Versi Indonesia</SectionBadge>

            <H2>1. Gambaran Umum</H2>
            <P>Ghaizers 2.0 adalah optimizer resource pack Minecraft berbasis browser yang dibuat oleh ghaa (KhaizenNomazen) dan tersedia secara gratis. Kami menghargai privasi kamu. Kebijakan Privasi ini menjelaskan informasi apa yang dikumpulkan, bagaimana digunakan, dan hak kamu sebagai pengguna.</P>

            <H2>2. Data yang TIDAK Kami Kumpulkan</H2>
            <P>Data berikut tidak pernah dikumpulkan, disimpan, atau dikirimkan ke server manapun:</P>
            <ul style={ulStyle}>
              <Li>File resource pack yang kamu upload — semua pemrosesan terjadi di browser kamu</Li>
              <Li>Isi file, nama file, atau metadata pack</Li>
              <Li>Informasi identitas pribadi (nama, email, alamat)</Li>
              <Li>Kredensial akun (tidak ada sistem akun)</Li>
              <Li>Informasi pembayaran (Tool ini sepenuhnya gratis)</Li>
            </ul>

            <H2>3. Data yang Mungkin Kami Kumpulkan</H2>
            <H3>3.1 Analitik (Google Analytics)</H3>
            <P>Kami menggunakan Google Analytics untuk memahami bagaimana pengguna berinteraksi dengan website. Google Analytics dapat mengumpulkan:</P>
            <ul style={ulStyle}>
              <Li>Halaman yang dikunjungi dan durasi kunjungan</Li>
              <Li>Jenis browser, sistem operasi, dan jenis perangkat</Li>
              <Li>Lokasi geografis perkiraan (tingkat negara/kota)</Li>
              <Li>Sumber referral (bagaimana kamu menemukan situs ini)</Li>
            </ul>
            <P>Data ini bersifat anonim dan teragregasi. Kamu dapat memilih keluar melalui <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" style={linkStyle}>Google Analytics Opt-out Browser Add-on</a>.</P>

            <H3>3.2 Cookie</H3>
            <P>Google Analytics menggunakan cookie untuk membedakan pengguna dan sesi. Kamu dapat menonaktifkan cookie di pengaturan browser, meskipun hal ini dapat memengaruhi fungsionalitas website.</P>

            <H2>4. Layanan Pihak Ketiga</H2>
            <P>Saat kamu menggunakan fitur Badge Generator atau Share, kamu mungkin diarahkan ke platform pihak ketiga (Twitter/X, WhatsApp). Begitu kamu meninggalkan website kami, kebijakan privasi platform masing-masing berlaku.</P>

            <H2>5. Penyimpanan & Keamanan Data</H2>
            <P>Karena semua pemrosesan resource pack dilakukan sepenuhnya di browser kamu (client-side), tidak ada data file yang pernah dikirim ke atau disimpan di server kami. File kamu tetap berada di perangkat kamu setiap saat.</P>

            <H2>6. Privasi Anak-Anak</H2>
            <P>Ghaizers 2.0 tidak secara sengaja mengumpulkan data pribadi dari anak-anak di bawah 13 tahun.</P>

            <H2>7. Perubahan Kebijakan Ini</H2>
            <P>Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Perubahan akan diposting di halaman ini dengan tanggal berlaku yang diperbarui.</P>

            <H2>8. Kontak</H2>
            <P>Untuk pertanyaan atau kekhawatiran terkait privasi, hubungi kami di: <a href="https://github.com/KhaizenNomazen" target="_blank" rel="noopener noreferrer" style={linkStyle}>github.com/KhaizenNomazen</a></P>
          </section>

        </div>

        {/* Footer */}
        <div style={{ textAlign:"center", padding:"24px", borderTop:"1px solid rgba(255,255,255,0.06)", fontSize:12, color:"rgba(148,163,184,0.5)" }}>
          © 2025–2026 ghaa (KhaizenNomazen) · <Link href="/terms" style={{ color:"var(--teal,#2dd4bf)", textDecoration:"none" }}>Terms of Service</Link> · <Link href="/" style={{ color:"inherit", textDecoration:"none" }}>optimizer.ghaa.my.id</Link>
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
  return <h3 style={{ fontSize:14, fontWeight:600, color:"var(--teal,#2dd4bf)", marginTop:20, marginBottom:8 }}>{children}</h3>;
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
