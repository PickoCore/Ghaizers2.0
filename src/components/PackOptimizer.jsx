import { TRANSLATIONS, detectLanguage, t } from "../lib/i18n";
const TR_DEFAULT = TRANSLATIONS["id"];
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import {
  Upload, Package, Zap, Settings, ChevronDown, ChevronUp,
  FileImage, FileJson, Volume2, Code2, ScanSearch, Tag,
  Check, Copy, Download, Share2, Github, Globe,
  BarChart3, AlertTriangle, AlertCircle, Info,
  Cpu, Layers, Shield, RefreshCw, Trash2, FileText,
  ArrowRight, Minus, RotateCcw, HardDrive, Shuffle,
  Activity, Terminal, BookOpen, HelpCircle, Clock,
  CheckCircle2, XCircle, LayoutGrid, List, Maximize2,
  ChevronRight, Menu, X, Star
} from "lucide-react";

/* ─────────────────────────────────────────
   CREDIT
───────────────────────────────────────── */
const CREDIT_BANNER = [
  "╔══════════════════════════════════════════════════╗",
  "║     Ghaizers2.0 — Minecraft Pack Optimizer       ║",
  "║     Made with care by ghaa (KhaizenNomazen)      ║",
  "║     Tool ini 100% GRATIS — JANGAN DIBAYAR!       ║",
  "║     UU Hak Cipta No. 28 Tahun 2014 (Indonesia)   ║",
  "║     github.com/KhaizenNomazen                    ║",
  "╚══════════════════════════════════════════════════╝",
];
const CREDIT_TXT = `================================================================
  GHAIZERS 2.0 — Minecraft Resource Pack Optimizer
  © 2025 ghaa (KhaizenNomazen). All rights reserved.
================================================================
Tool ini GRATIS. Menjual = pelanggaran UU Hak Cipta No.28/2014.
Lapor: github.com/KhaizenNomazen
================================================================`;
const CREDIT_MCMETA_DESC = "§cDilarang Dijual! §r| Optimizer by §aghaa §7(KhaizenNomazen) | §eGRATIS di optimizer.ghaa.my.id";

/* ─────────────────────────────────────────
   MODES
───────────────────────────────────────── */
const MODES = {
  normal:  { id:"normal",  label:"Normal",       description:"Seimbang, kualitas bagus dan pack tetap ringan.", scale:0.85, maxSize:512, minSize:16, minifyJson:true },
  extreme: { id:"extreme", label:"Extreme",       description:"Sangat hemat, cocok untuk device mid–low.",      scale:0.6,  maxSize:256, minSize:8,  minifyJson:true },
  ultra:   { id:"ultra",   label:"Ultra Extreme", description:"Paling ringan, untuk HP kentang / Pojav lemah.", scale:0.4,  maxSize:128, minSize:4,  minifyJson:true },
};

/* ─────────────────────────────────────────
   PRESETS
───────────────────────────────────────── */
const DEFAULT_PRESETS = {
  "pojav-lite":    { label:"Pojav Lite",     mode:"ultra",   resolutionPercent:60,  zipCompressionLevel:9, preservePixelArt:true,  optimizeOgg:true, doAlphaClean:true, doSingleColor:true, doDeepCleanJson:true, doShaderMinify:true,  doPowerOfTwo:true,  doJsonKeySort:true,  doLangMinify:true },
  "server-pack":   { label:"Server Pack",    mode:"extreme", resolutionPercent:80,  zipCompressionLevel:8, preservePixelArt:true,  optimizeOgg:true, doAlphaClean:true, doSingleColor:true, doDeepCleanJson:true, doShaderMinify:true,  doPowerOfTwo:false, doJsonKeySort:true,  doLangMinify:true },
  "ultra-compress":{ label:"Ultra Compress", mode:"ultra",   resolutionPercent:50,  zipCompressionLevel:9, preservePixelArt:false, optimizeOgg:true, doAlphaClean:true, doSingleColor:true, doDeepCleanJson:true, doShaderMinify:true,  doPowerOfTwo:true,  doJsonKeySort:true,  doLangMinify:true },
  "quality":       { label:"Quality",        mode:"normal",  resolutionPercent:100, zipCompressionLevel:6, preservePixelArt:true,  optimizeOgg:true, doAlphaClean:true, doSingleColor:false,doDeepCleanJson:true, doShaderMinify:false, doPowerOfTwo:false, doJsonKeySort:false, doLangMinify:true },
};

/* ─────────────────────────────────────────
   POLICIES
───────────────────────────────────────── */
const BASE_POLICIES = [
  { pattern:/textures\/gui\//,    smoothing:"nearest", minSize:16, scaleMul:1.0 },
  { pattern:/textures\/font\//,   smoothing:"nearest", minSize:16, scaleMul:1.0, skipResize:true },
  { pattern:/modelengine\//,      enforceStrip:true, maxHeight:8192, smoothing:"smooth" },
  { pattern:/colormap\//,         skip:true },
  { pattern:/maps\//,             skip:true },
  { pattern:/textures\/entity\//, scaleMul:0.85 },
  { pattern:/textures\/particle\//,scaleMul:0.75, smoothing:"nearest" },
  { pattern:/.*/,                 scaleMul:1.0 },
];

/* ─────────────────────────────────────────
   UTILS
───────────────────────────────────────── */
function getPolicyForPath(lowerPath, dynamicStripPaths) {
  if (Array.isArray(dynamicStripPaths)) {
    for (const key of dynamicStripPaths) {
      if (key && lowerPath.includes(key)) return { enforceStrip:true, smoothing:"smooth" };
    }
  }
  for (const p of BASE_POLICIES) if (p.pattern.test(lowerPath)) return { ...p };
  return { scaleMul:1.0 };
}

const SYSTEM_FILES = [".DS_Store","Thumbs.db","desktop.ini",".gitignore",".gitattributes","__MACOSX",".Spotlight-V100",".Trashes",".fseventsd"];
function isSystemFile(name) { return SYSTEM_FILES.some(s => name.includes(s)); }

function shouldExcludeNonGameFile(lower, name) {
  if (isSystemFile(name)) return true;
  if ([".psd",".xcf",".txt",".md",".bak",".zip"].some(e=>lower.endsWith(e))) return true;
  if ([".png",".json",".mcmeta",".properties",".ogg",".fsh",".vsh",".glsl",".lang",".bbmodel"].some(e=>lower.endsWith(e))) return false;
  if (["/raw/","/backup/","/unused/","/temp/"].some(d=>lower.includes(d))) {
    if ([".png",".json",".mcmeta",".ogg"].some(e=>lower.endsWith(e))) return false;
    return true;
  }
  return false;
}

function parsePojavLog(text) {
  const enforceStrip = new Set();
  const missing = new Set();
  const shaderErrors = new Set();
  const overlayErrors = new Set();
  const soundErrors = new Set();
  const atlasErrors = new Set();
  const modelErrors = new Set();
  const hashErrors = new Set();
  const crashCauses = [];

  const RE = {
    strip:        /size\s+\S+\s+is not multiple of frame size|not multiple of frame size/i,
    stripPath:    /(['"'])([^'"]+?\.png)\1/i,
    missingSprite:/Missing (?:sprite|texture)\s*[:\-]?\s*(\S+\.(?:png|json))/i,
    missingFile:  /Unable to load (?:texture|model|sound)\s*[:\-]?\s*['"]?(\S+\.(?:png|json|ogg))['"]?/i,
    shaderCompile:/Couldn't compile (?:vertex|fragment) shader\s*\(([^)]+)\)/i,
    shaderVersion:/#version\s+(\d+)(?!\s+es)/,
    shaderVersionLine:/Language version '(\d+)' unknown/i,
    shaderFailed: /Failed to load required shader programs?/i,
    shaderPipeline:/^\s*-\s*([\w:\/]+pipeline\/[\w\/]+)/,
    reloadFailed: /Caught error loading resourcepacks|Resource reload failed|Failed to load resourcepack/i,
    overlayErr:   /overlays metadata.*Overlay "([^"]+)" declares support for version newer than (\d+)/i,
    overlayMiss:  /missing mandatory fields min_format and max_format/i,
    soundEvent:   /Unable to play unknown soundEvent:\s*([\w:.\/]+)/i,
    atlasOverflow:/Unable to fit:\s*(\S+)\s*[—-]\s*size:\s*(\d+x\d+)/i,
    atlasSize:    /Cannot fit all textures into atlas/i,
    missingModel: /Missing (?:block )?model:\s*(\S+)/i,
    hashMismatch: /not found or had mismatched hash/i,
    hashFile:     /Existing file\s+(\S+)\s+not found/i,
    jsonError:    /com\.google\.gson\.JsonParseException|Malformed JSON|JsonSyntaxException/i,
    jsonFile:     /in file ['"]?([^'":\s]+\.(?:json|mcmeta))['"]?/i,
    stitchErr:    /Stitching failed|Texture too large|Texture atlas.*full/i,
    serverPackRequired:/This server requires a custom resource pack/i,
  };

  const lines = text.split(/\r?\n/);
  let inShaderFailBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (RE.strip.test(line)) {
      const m = RE.stripPath.exec(line);
      if (m && m[2]) enforceStrip.add(m[2].toLowerCase());
    }
    const mSprite = RE.missingSprite.exec(line);
    if (mSprite) missing.add(mSprite[1].toLowerCase());
    const mFile = RE.missingFile.exec(line);
    if (mFile) missing.add(mFile[1].toLowerCase());
    const mShaderVersion = RE.shaderVersionLine.exec(line);
    if (mShaderVersion) {
      const ver = parseInt(mShaderVersion[1]);
      shaderErrors.add(`GLSL #version ${ver} tidak support di MobileGlues/OpenGL ES (max #version 320 es).`);
    }
    const mShaderCompile = RE.shaderCompile.exec(line);
    if (mShaderCompile) shaderErrors.add(`Shader gagal compile: ${mShaderCompile[1]}`);
    if (RE.shaderFailed.test(line)) {
      inShaderFailBlock = true;
      crashCauses.push("Shader pipeline gagal dimuat.");
    }
    if (inShaderFailBlock) {
      const mPipe = RE.shaderPipeline.exec(line);
      if (mPipe) shaderErrors.add(`Pipeline gagal: ${mPipe[1]}`);
      if (line.trim() === "" || line.includes("at java.") || line.includes("at knot//")) inShaderFailBlock = false;
    }
    if (RE.reloadFailed.test(line)) crashCauses.push("Resource pack gagal dimuat.");
    const mOverlay = RE.overlayErr.exec(line);
    if (mOverlay) overlayErrors.add(`Overlay "${mOverlay[1]}" versi terlalu baru.`);
    if (RE.overlayMiss.test(line)) overlayErrors.add("Overlay missing min_format/max_format.");
    const mSound = RE.soundEvent.exec(line);
    if (mSound) soundErrors.add(mSound[1]);
    const mAtlas = RE.atlasOverflow.exec(line);
    if (mAtlas) atlasErrors.add(`${mAtlas[1]} (${mAtlas[2]})`);
    const mModel = RE.missingModel.exec(line);
    if (mModel) modelErrors.add(mModel[1]);
    if (RE.hashMismatch.test(line)) {
      const mHash = RE.hashFile.exec(line);
      hashErrors.add(mHash ? mHash[1] : "unknown");
    }
  }

  const enforceStripArr = [...enforceStrip];
  return {
    enforceStrip: enforceStripArr,
    missing: [...missing],
    shaderErrors: [...shaderErrors],
    overlayErrors: [...overlayErrors],
    soundErrors: [...soundErrors],
    atlasErrors: [...atlasErrors],
    modelErrors: [...modelErrors],
    hashErrors: [...hashErrors],
    crashCauses,
    hasResourceReloadFailed: crashCauses.length > 0,
    totalIssues: missing.size + shaderErrors.size + overlayErrors.size + soundErrors.size + atlasErrors.size + modelErrors.size,
  };
}

function uniqueLower(arr) { return [...new Set(arr.map(s => s.toLowerCase()))]; }

/* ─────────────────────────────────────────
   IMAGE UTILS
───────────────────────────────────────── */
function readPngIHDRSize(buffer) {
  try {
    const u8 = new Uint8Array(buffer);
    const sig = [137,80,78,71,13,10,26,10];
    if(u8.length<24) return null;
    for(let i=0;i<8;i++) if(u8[i]!==sig[i]) return null;
    if(String.fromCharCode(u8[12],u8[13],u8[14],u8[15])!=="IHDR") return null;
    const w=(u8[16]<<24|u8[17]<<16|u8[18]<<8|u8[19])>>>0;
    const h=(u8[20]<<24|u8[21]<<16|u8[22]<<8|u8[23])>>>0;
    return (w&&h)?{w,h}:null;
  } catch { return null; }
}

function getFrameCount(w,h) {
  if(!w||!h||h<=w) return null;
  const f=h/w; return (Number.isInteger(f)&&f>=2)?f:null;
}

function nearestPowerOfTwo(n) {
  if (n <= 0) return 1;
  let p = 1;
  while (p < n) p <<= 1;
  const lower = p >> 1;
  return (n - lower < p - n) ? lower : p;
}

function isPowerOfTwo(n) { return n > 0 && (n & (n - 1)) === 0; }

function sortJsonKeys(obj) {
  if (Array.isArray(obj)) return obj.map(sortJsonKeys);
  if (obj && typeof obj === "object") {
    const sorted = {};
    Object.keys(obj).sort().forEach(k => { sorted[k] = sortJsonKeys(obj[k]); });
    return sorted;
  }
  return obj;
}

function minifyShader(text) {
  try {
    return text.split("\n")
      .map(l => l.replace(/\/\/[^\n]*/g, "").trim())
      .filter(l => l.length > 0)
      .join("\n");
  } catch { return text; }
}

function deepCleanJson(obj, lowerPath) {
  if (!obj || typeof obj !== "object") return obj;
  const COMMENT_KEYS = ["__comment", "_comment", "//", "comment"];
  if (Array.isArray(obj)) return obj.map(i => deepCleanJson(i, lowerPath));
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (COMMENT_KEYS.includes(k)) continue;
    if (lowerPath?.endsWith("sounds.json") && Array.isArray(v) && v.length === 0) continue;
    out[k] = deepCleanJson(v, lowerPath);
  }
  return out;
}

function optimizeOggSafe(buffer) {
  try {
    const u8 = new Uint8Array(buffer);
    const len = u8.length;
    if(len<16) return {out:buffer,changed:false};
    let start=0,end=len;
    if(u8[0]===73&&u8[1]===68&&u8[2]===51) {
      const id3size=(u8[6]&0x7f)<<21|(u8[7]&0x7f)<<14|(u8[8]&0x7f)<<7|(u8[9]&0x7f);
      start=10+id3size+(u8[5]&0x10?10:0);
    }
    if(u8[len-128]===84&&u8[len-127]===65&&u8[len-126]===71) end=len-128;
    const changed=start>0||end<len;
    if(!changed||end<=start) return {out:buffer,changed:false};
    const out=new Uint8Array(end-start);
    out.set(u8.subarray(start,end));
    return {out:out.buffer,changed:true};
  } catch { return {out:buffer,changed:false}; }
}

function minifyProperties(text) {
  try {
    return text.split("\n").map(l=>l.trim()).filter(l=>l&&!l.startsWith("#")&&!l.startsWith("!")).join("\n");
  } catch { return text; }
}

function minifyLang(text) {
  try {
    return text.split("\n").map(l=>l.trim()).filter(l=>l&&!l.startsWith("#")).join("\n");
  } catch { return text; }
}

function cleanBbmodel(text) {
  try {
    const obj = JSON.parse(text);
    if (obj && Array.isArray(obj.outliner)) {
      delete obj.history;
    }
    return JSON.stringify(obj);
  } catch { return text; }
}

async function sha1HexFromBlob(blob) {
  try {
    if(typeof window==="undefined"||!window.crypto?.subtle) return null;
    const buf = await blob.arrayBuffer();
    const hash = await window.crypto.subtle.digest("SHA-1", buf);
    return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");
  } catch { return null; }
}

function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function buildPackIcon(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 64; c.height = 64;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, 64, 64);
      URL.revokeObjectURL(url);
      c.toBlob(b => b.arrayBuffer().then(resolve), "image/png");
    };
    img.src = url;
  });
}

/* ─────────────────────────────────────────
   ANALYZER
───────────────────────────────────────── */
async function analyzePackOnly(file, appendLog) {
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter(e => !e.dir);
  appendLog(`Analyzing ${entries.length} files...`);
  let totalSize=0, pngCount=0, pngSize=0, jsonCount=0, jsonSize=0, oggCount=0, oggSize=0, shaderCount=0;
  const fileList=[], oversized=[], invalidJson=[], duplicates=[], emptyFiles=[];
  const seen = {};

  for (const entry of entries) {
    const name = entry.name, lower = name.toLowerCase();
    const buf = await entry.async("arraybuffer");
    const size = buf.byteLength;
    totalSize += size;
    fileList.push({ name, size });
    if (size === 0) emptyFiles.push(name);
    const base = name.split("/").pop();
    if (seen[base]) duplicates.push({ a: seen[base], b: name });
    else seen[base] = name;
    if (lower.endsWith(".png")) {
      pngCount++; pngSize += size;
      const sz = readPngIHDRSize(buf);
      if (sz && (sz.w > 512 || sz.h > 512)) oversized.push({ name, ...sz });
    }
    if (lower.endsWith(".json") || lower.endsWith(".mcmeta")) {
      jsonCount++; jsonSize += size;
      try { JSON.parse(await entry.async("string")); } catch { invalidJson.push(name); }
    }
    if (lower.endsWith(".ogg")) { oggCount++; oggSize += size; }
    if ([".fsh",".vsh",".glsl"].some(e=>lower.endsWith(e))) shaderCount++;
  }

  appendLog(`Scan selesai — ${totalSize > 1e6 ? (totalSize/1e6).toFixed(2)+"MB" : (totalSize/1e3).toFixed(1)+"KB"} total`);
  return { totalFiles: entries.length, totalSize, fileList, pngCount, pngSize, jsonCount, jsonSize, oggCount, oggSize, shaderCount, oversized, invalidJson, duplicates, emptyFiles };
}

/* ─────────────────────────────────────────
   COMPUTE TARGET SIZE
───────────────────────────────────────── */
function computeTargetSize({ w0, h0, policy, modeConfig }) {
  const frames = getFrameCount(w0, h0) || 1;
  const frameH = Math.round(h0 / frames);
  const effScale = (policy.scaleMul || 1.0) * modeConfig.scale;
  const minSz = policy.minSize || modeConfig.minSize || 16;
  const maxSz = policy.maxSize || modeConfig.maxSize || 512;
  let tW = Math.max(minSz, Math.min(maxSz, Math.round(w0 * effScale)));
  let tH = Math.max(minSz, Math.min(maxSz, Math.round(frameH * effScale))) * frames;
  if (policy.enforceStrip) tH = Math.round(tW * frames);
  return { tW, tH, smoothing: policy.smoothing || (modeConfig.preservePixelArt ? "nearest" : "smooth") };
}

/* ─────────────────────────────────────────
   WEB WORKER POOL
───────────────────────────────────────── */
function createWorkerPool(count) {
  const code = `
    function cleanAlpha(d){let n=0;for(let i=0;i<d.length;i+=4){if(d[i+3]===0&&(d[i]||d[i+1]||d[i+2])){d[i]=d[i+1]=d[i+2]=0;n++;}}return n;}
    function isSingleColor(d){if(d.length<4)return false;const r=d[0],g=d[1],b=d[2],a=d[3];for(let i=4;i<d.length;i+=4){if(d[i]!==r||d[i+1]!==g||d[i+2]!==b||d[i+3]!==a)return false;}return true;}
    function nearestPow2(n){if(n<=0)return 1;let p=1;while(p<n)p<<=1;const l=p>>1;return(n-l<p-n)?l:p;}
    self.onmessage=async({data:p})=>{
      const{id,buffer,w0,h0,tW,tH,smoothing,sizeGuard,doAlphaClean,doSingleColor,doPowerOfTwo}=p;
      try{
        if(!buffer){self.postMessage({id,ok:true,out:buffer,changed:false});return;}
        const blob=new Blob([buffer],{type:"image/png"});
        const bmp=await createImageBitmap(blob);
        let finalW=tW,finalH=tH;
        if(doPowerOfTwo){finalW=nearestPow2(tW);finalH=nearestPow2(tH);}
        const oc=new OffscreenCanvas(finalW,finalH);
        const ctx=oc.getContext("2d");
        ctx.imageSmoothingEnabled=smoothing!=="nearest";
        ctx.imageSmoothingQuality="high";
        ctx.drawImage(bmp,0,0,finalW,finalH);
        bmp.close();
        const id2=ctx.getImageData(0,0,finalW,finalH);
        if(doSingleColor&&isSingleColor(id2.data)){
          const sc=new OffscreenCanvas(1,1);
          const sc2=sc.getContext("2d");
          sc2.putImageData(new ImageData(new Uint8ClampedArray([id2.data[0],id2.data[1],id2.data[2],id2.data[3]]),1,1),0,0);
          const sb=await sc.convertToBlob({type:"image/png"});
          const sbuf=await sb.arrayBuffer();
          self.postMessage({id,ok:true,out:sbuf,changed:true,singleColor:true},[sbuf]);return;
        }
        let alphaFixed=0;
        if(doAlphaClean) alphaFixed=cleanAlpha(id2.data);
        if(alphaFixed>0) ctx.putImageData(id2,0,0);
        const outBlob=await oc.convertToBlob({type:"image/png"});
        const out=await outBlob.arrayBuffer();
        const orig=buffer.byteLength||buffer.length||0;
        const changed=finalW!==w0||finalH!==h0||alphaFixed>0;
        if(sizeGuard&&!changed&&out.byteLength>=orig){self.postMessage({id,ok:true,out:buffer,changed:false,guarded:true},[buffer]);return;}
        self.postMessage({id,ok:true,out,changed,alphaFixed,finalW,finalH},[out]);
      }catch(e){self.postMessage({id,ok:false,error:e.message});}
    };
  `;
  const url = URL.createObjectURL(new Blob([code], { type:"application/javascript" }));
  const workers = Array.from({ length: count }, () => new Worker(url));
  let seq = 0;
  const queues = workers.map(() => []);
  const active = workers.map(() => false);

  function pump(idx) {
    if (active[idx] || queues[idx].length === 0) return;
    const { id, resolve, reject, p } = queues[idx].shift();
    active[idx] = true;
    workers[idx].onmessage = ({ data }) => {
      active[idx] = false;
      if (data.ok) resolve(data); else reject(new Error(data.error));
      pump(idx);
    };
    workers[idx].postMessage({ ...p, id }, p.buffer ? [p.buffer] : []);
  }

  function runPngJob(payload) {
    const id = ++seq;
    const minIdx = queues.reduce((a, q, i) => q.length < queues[a].length ? i : a, 0);
    return new Promise((resolve, reject) => { queues[minIdx].push({ id, resolve, reject, p: { ...payload, id, type:"png" } }); pump(minIdx); });
  }

  return { runPngJob, destroy() { workers.forEach(w => w.terminate()); URL.revokeObjectURL(url); } };
}

/* ─────────────────────────────────────────
   LOG CLASSIFIER
───────────────────────────────────────── */
function classifyLog(msg) {
  const m = msg.toLowerCase();
  if (m.includes("error") || m.includes("gagal") || m.includes("invalid")) return "cl-err";
  if (m.includes("warn") || m.includes("oversized") || m.includes("missing")) return "cl-warn";
  if (m.includes("selesai") || m.includes("berhasil") || m.includes("download") || m.includes("sha")) return "cl-ok";
  if (m.includes("eta") || m.includes("mode") || m.includes("scale") || m.includes("scan")) return "cl-info";
  if (msg.startsWith("╔") || msg.startsWith("║") || msg.startsWith("╚") || msg.trim() === "") return "cl-dim";
  return "";
}

/* ─────────────────────────────────────────
   FAQ & CHANGELOG
───────────────────────────────────────── */
const FAQ_DATA = [
  { q:"Apakah tool ini aman?", a:"Ya, 100% aman. Semua proses berjalan di browser kamu (client-side). File packmu tidak pernah diunggah ke server manapun." },
  { q:"Kenapa file ZIP error saat diupload?", a:"Kemungkinan file ZIP dibuat dengan tool non-standard (WinRAR setting khusus). Solusi: extract dulu dengan ZArchiver/7-Zip, lalu zip ulang." },
  { q:"Apakah kualitas texture berkurang?", a:"Tergantung mode. Mode Normal mempertahankan kualitas visual yang sangat baik. Alpha Cleanup dan Single-Color Detection adalah 100% lossless secara visual." },
  { q:"Apa perbedaan 3 mode?", a:"Normal (85% scale, max 512px) untuk balance. Extreme (60% scale, max 256px) untuk mid-low device. Ultra (40%, max 128px) untuk HP kentang & Pojav Launcher." },
  { q:"Apakah OGG di-re-encode?", a:"Tidak. OGG optimization hanya menghapus metadata ID3 header dan null padding. Kualitas audio 100% sama persis." },
  { q:"Apa itu Single-Color Detection?", a:"Teknik dari PackSquash: jika semua pixel PNG warna sama → resize ke 1×1. Hemat hingga 98% untuk texture jenis ini, tanpa perubahan visual di Minecraft." },
  { q:"Bisakah saya jual tool ini?", a:"TIDAK. Tool ini gratis selamanya. Menjual tool ini atau outputnya adalah pelanggaran UU Hak Cipta No.28/2014. Lapor ke github.com/KhaizenNomazen." },
  { q:"Browser apa yang disarankan?", a:"Chrome atau Chromium-based browser (Edge, Brave, dll) untuk performa terbaik. OffscreenCanvas API yang dipakai Web Workers butuh browser modern." },
];

const CHANGELOG_DATA = [
  { version:"v2.0", date:"2025", changes:["Hero section & landing page baru","Drag & Drop zone dengan animasi","Progress ring SVG animated","Console dengan syntax highlighting & filter","Pack Analyzer (scan tanpa optimize)","Power-of-two enforcement","JSON key sorting untuk better compression",".lang & .bbmodel support","System file auto-skip (.DS_Store, Thumbs.db)","Preset system (Pojav Lite, Server Pack, dll)","Share hasil & badge generator","Halaman FAQ & Changelog"] },
  { version:"v1.x", date:"2024", changes:["Alpha pixel cleanup","Single-color detection → 1×1","Deep JSON clean","OGG safe strip","Shader/properties minify","Web Workers multi-thread","Pojav Log Auto-Fix","SHA-1 verification","SEO (sitemap, robots.txt, meta tags)"] },
];

/* ═══════════════════════════════════════
   COMPONENTS
═══════════════════════════════════════ */

function ProgressRing({ pct, done, total, etaSec, beating, waitingText }) {
  const r = 44, circ = 2 * Math.PI * r, offset = circ - (pct / 100) * circ;
  return (
    <div className="progress-ring-wrap">
      <div style={{ position:"relative", width:108, height:108 }}>
        <svg className="progress-ring-svg" width="108" height="108" viewBox="0 0 108 108">
          <circle className="ring-track" cx="54" cy="54" r={r} strokeWidth="6"/>
          <circle className={`ring-fill${beating ? " beating" : ""}`} cx="54" cy="54" r={r} strokeWidth="6"
            strokeDasharray={circ} strokeDashoffset={offset}/>
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <span className="ring-pct">{pct}%</span>
        </div>
      </div>
      <div className="ring-info">
        <div className="ring-detail">
          {total > 0 ? `${done} / ${total} file` : (waitingText || "Menunggu file...")}
        </div>
        {etaSec != null && etaSec > 0 && (
          <div className="ring-eta" style={{ display:"flex", alignItems:"center", gap:4, justifyContent:"center", marginTop:3 }}>
            <Clock size={11} style={{ color:"var(--text-disabled)" }}/>
            ETA {etaSec}s
          </div>
        )}
      </div>
    </div>
  );
}

function CheckItem({ checked, onChange, label, desc, disabled }) {
  return (
    <div
      className={`check-item${checked ? " checked" : ""}${disabled ? " disabled" : ""}`}
      onClick={() => !disabled && onChange(!checked)}
    >
      <div className="check-box">
        {checked && <Check size={9} strokeWidth={3.5} className="check-tick" style={{ color:"#000" }}/>}
      </div>
      <div>
        <div className="check-label">{label}</div>
        <div className="check-desc">{desc}</div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="sum-card">
      <div className="sum-label">{label}</div>
      <div className="sum-val">{value}</div>
    </div>
  );
}

function AnalyzerResult({ data, tr }) {
  tr = tr || TR_DEFAULT;
  const [activeTab, setActiveTab] = useState("overview");
  if (!data) return null;
  const topFiles = [...data.fileList].sort((a, b) => b.size - a.size).slice(0, 10);
  const fmt = n => n >= 1e6 ? `${(n/1e6).toFixed(2)}MB` : n >= 1e3 ? `${(n/1e3).toFixed(1)}KB` : `${n}B`;

  const TABS = [
    { id:"overview", label:"Overview", icon:BarChart3 },
    { id:"files", label:"Top Files", icon:List },
    { id:"issues", label:"Issues", icon:AlertTriangle },
  ];

  return (
    <div style={{ marginTop:16 }}>
      <div style={{ display:"flex", gap:4, marginBottom:16, borderBottom:"1px solid var(--border-faint)", paddingBottom:12 }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`tab-btn${activeTab === id ? " on" : ""}`}
            style={{ display:"flex", alignItems:"center", gap:5 }}>
            <Icon size={13}/>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div>
          <div className="summary-grid" style={{ marginBottom:16 }}>
            <SummaryCard label="Total Files" value={data.totalFiles}/>
            <SummaryCard label="Total Size" value={fmt(data.totalSize)}/>
            <SummaryCard label="PNG" value={`${data.pngCount} (${fmt(data.pngSize)})`}/>
            <SummaryCard label="JSON" value={`${data.jsonCount} (${fmt(data.jsonSize)})`}/>
            <SummaryCard label="OGG" value={`${data.oggCount} (${fmt(data.oggSize)})`}/>
            <SummaryCard label="Shader" value={data.shaderCount}/>
          </div>
          <div style={{ background:"var(--glass-subtle)", borderRadius:"var(--r-sm)", padding:14, border:"1px solid var(--border-faint)" }}>
            <div style={{ fontSize:10, color:"var(--text-disabled)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:12, fontWeight:600 }}>Distribusi File</div>
            {[["PNG", "var(--ok)", data.pngSize], ["JSON", "var(--warn)", data.jsonSize], ["OGG", "var(--info)", data.oggSize]].map(([label, color, size]) => (
              <div key={label} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:5 }}>
                  <span style={{ color, fontWeight:600 }}>{label}</span>
                  <span style={{ color:"var(--text-tertiary)", fontFamily:"var(--f-mono)" }}>{data.totalSize > 0 ? `${((size/data.totalSize)*100).toFixed(1)}%` : "—"}</span>
                </div>
                <div style={{ height:3, background:"var(--border-faint)", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${data.totalSize > 0 ? (size/data.totalSize)*100 : 0}%`, background:color, borderRadius:2, transition:"width 0.6s var(--ease-out)" }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "files" && (
        <div style={{ background:"var(--bg-base)", borderRadius:"var(--r-sm)", overflow:"hidden", border:"1px solid var(--border-faint)" }}>
          <div style={{ padding:"9px 14px", background:"var(--bg-elevated)", fontSize:10, color:"var(--text-disabled)", display:"flex", justifyContent:"space-between", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>
            <span>File</span><span>Ukuran</span>
          </div>
          {topFiles.map((f, i) => (
            <div key={i} style={{ padding:"9px 14px", borderBottom:"1px solid var(--border-faint)", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
              <div style={{ fontSize:11, fontFamily:"var(--f-mono)", color:"var(--text-tertiary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{f.name}</div>
              <div style={{ fontSize:11, color:"var(--ok)", fontWeight:700, flexShrink:0, fontFamily:"var(--f-mono)" }}>{fmt(f.size)}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "issues" && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {data.oversized.length > 0 && (
            <div className="analyzer-section warn">
              <div className="analyzer-title warn"><AlertTriangle size={13}/>Texture Oversized ({data.oversized.length})</div>
              {data.oversized.slice(0,5).map((f,i) => <div key={i} className="analyzer-entry">{f.name} — {f.w}×{f.h}</div>)}
              {data.oversized.length > 5 && <div style={{ fontSize:11, color:"var(--text-disabled)", marginTop:3 }}>+{data.oversized.length-5} lainnya</div>}
            </div>
          )}
          {data.invalidJson.length > 0 && (
            <div className="analyzer-section err">
              <div className="analyzer-title err"><XCircle size={13}/>JSON Invalid ({data.invalidJson.length})</div>
              {data.invalidJson.slice(0,5).map((f,i) => <div key={i} className="analyzer-entry">{f}</div>)}
            </div>
          )}
          {data.duplicates.length > 0 && (
            <div className="analyzer-section info">
              <div className="analyzer-title info"><Shuffle size={13}/>Filename Duplikat ({data.duplicates.length})</div>
              {data.duplicates.slice(0,3).map((d,i) => (
                <div key={i} className="analyzer-entry">
                  <div>{d.a}</div>
                  <div style={{ color:"var(--text-disabled)", paddingLeft:8 }}>↳ {d.b}</div>
                </div>
              ))}
            </div>
          )}
          {data.emptyFiles.length > 0 && (
            <div className="analyzer-section err">
              <div className="analyzer-title err"><Trash2 size={13}/>File Kosong ({data.emptyFiles.length})</div>
              {data.emptyFiles.slice(0,5).map((f,i) => <div key={i} className="analyzer-entry">{f}</div>)}
            </div>
          )}
          {data.oversized.length === 0 && data.invalidJson.length === 0 && data.duplicates.length === 0 && data.emptyFiles.length === 0 && (
            <div style={{ textAlign:"center", padding:28, color:"var(--ok)", fontSize:13, display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
              <CheckCircle2 size={28} strokeWidth={1.5}/>
              <span>Tidak ada masalah ditemukan.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BadgeGenerator() {
  const [style, setStyle] = useState("flat");
  const [color, setColor] = useState("22c55e");
  const badges = [
    `https://img.shields.io/badge/Optimized_with-Ghaizers2.0-${color}?style=${style}&logo=minecraft`,
    `https://img.shields.io/badge/Pack_Optimizer-Ghaizers2.0-${color}?style=${style}`,
  ];
  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"flex-end" }}>
        <div>
          <div style={{ fontSize:10, color:"var(--text-disabled)", marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Style</div>
          <select value={style} onChange={e=>setStyle(e.target.value)} className="badge-select">
            {["flat","flat-square","for-the-badge","plastic","social"].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize:10, color:"var(--text-disabled)", marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Color (hex)</div>
          <input value={color} onChange={e=>setColor(e.target.value.replace("#",""))}
            className="badge-input" maxLength={6} placeholder="22c55e"/>
        </div>
      </div>
      {badges.map((url, i) => (
        <div key={i} style={{ background:"var(--glass-subtle)", borderRadius:"var(--r-sm)", padding:14, marginBottom:8, border:"1px solid var(--border-faint)" }}>
          <img src={url} alt="badge" style={{ height:22, marginBottom:10, display:"block", opacity:0.9 }} onError={e=>e.target.style.opacity="0.3"}/>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <code style={{ fontSize:10, flex:1, wordBreak:"break-all" }}>{url}</code>
            <button onClick={()=>navigator.clipboard?.writeText(`![Optimized with Ghaizers](${url})`)}
              className="pill" style={{ fontSize:10, padding:"3px 10px", flexShrink:0, display:"flex", alignItems:"center", gap:4 }}>
              <Copy size={10}/>MD
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ShareResults({ summary }) {
  if (!summary) return null;
  const savings = (((summary.originalSize-summary.optimizedSize)/summary.originalSize)*100).toFixed(1);
  const text = `Resource pack Minecraft berhasil dioptimasi ${savings}% lebih kecil!\n${(summary.originalSize/1e6).toFixed(2)}MB → ${(summary.optimizedSize/1e6).toFixed(2)}MB\nPake tool gratis Ghaizers2.0 → optimizer.ghaa.my.id`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  return (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:16 }}>
      <a href={waUrl} target="_blank" rel="noopener noreferrer">
        <button className="pill" style={{ color:"#25d366" }}>WhatsApp</button>
      </a>
      <a href={twUrl} target="_blank" rel="noopener noreferrer">
        <button className="pill" style={{ color:"#1da1f2" }}>X / Twitter</button>
      </a>
      <button className="pill" onClick={()=>navigator.clipboard?.writeText(text)}
        style={{ display:"flex", alignItems:"center", gap:5 }}>
        <Copy size={11}/>Salin teks
      </button>
    </div>
  );
}

/* ─── DOCS PAGE ────────────────────────── */
const DOCS_ITEMS = [
  { title:"PNG Optimization", icon:FileImage, content:"Ghaizers menggunakan beberapa teknik untuk PNG:\n\n• Smart Resize: Scale texture berdasarkan mode yang dipilih, dengan kategori policy per folder (GUI, font, entity, particle)\n• Alpha Pixel Cleanup: Zero-out RGB pada pixel fully transparent (alpha=0). Tidak ada perubahan visual, tapi entropy PNG turun dan ZIP menjadi lebih kecil\n• Single-Color Detection: Deteksi PNG yang semua pixelnya identik warna → resize ke 1×1px\n• Power-of-Two: Snap ukuran ke dimensi 2^n terdekat (16,32,64...) untuk GPU efficiency\n• Size Guard: Jika hasil resize lebih besar dari original, file asli digunakan" },
  { title:"JSON Optimization", icon:FileJson, content:"• JSON Minify: Hapus semua whitespace dan newline yang tidak diperlukan Minecraft\n• Deep Clean: Hapus field comment (__comment, _comment, //) yang dibuat Blockbench dan tool lain\n• Key Sorting: Sort keys alphabetically untuk better DEFLATE compression\n• Sounds.json: Hapus entry dengan array sounds kosong\n• .mcmeta: Edit langsung di interface, credit ghaa otomatis diinjeksi" },
  { title:"OGG Optimization", icon:Volume2, content:"OGG optimization di Ghaizers adalah 100% lossless:\n• Strip ID3 header (metadata ID3v2 di awal file)\n• Strip ID3v1 tag (128 bytes di akhir file)\n• Trim null padding\n\nKualitas audio dijamin sama persis karena tidak ada re-encoding." },
  { title:"Web Workers", icon:Cpu, content:"Resize PNG adalah operasi CPU-intensive. Tanpa Workers, browser akan freeze.\n\nGhaizers membuat worker pool dengan ukuran: Math.floor(hardwareConcurrency/2), minimum 2, maximum 4.\n\nSetiap worker menggunakan OffscreenCanvas API untuk resize tanpa block main thread. Buffer dikirim sebagai Transferable Objects (zero-copy)." },
  { title:"Pojav Log Auto-Fix", icon:Activity, content:"Upload file latestlog.txt dari Pojav Launcher. Ghaizers akan:\n• Parse log untuk menemukan error 'size X is not multiple of frame size'\n• Extract nama file PNG yang bermasalah\n• Otomatis set enforce-strip untuk file tersebut saat optimize\n\nIni memperbaiki masalah texture animated yang tidak valid untuk Pojav." },
];

function DocsPage({ tr }) {
  tr = tr || TR_DEFAULT;
  return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:"32px 0" }}>
      <h2 className="page-h2">{tr.docs_title}</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        {DOCS_ITEMS.map(({ title, icon: Icon, content }) => (
          <div key={title} style={{ background:"var(--glass-subtle)", border:"1px solid var(--border-faint)", borderRadius:"var(--r-md)", padding:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <div style={{ width:30, height:30, background:"var(--glass-raised)", border:"1px solid var(--border-subtle)", borderRadius:"var(--r-sm)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Icon size={14} style={{ color:"var(--text-secondary)" }}/>
              </div>
              <h3 style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)" }}>{title}</h3>
            </div>
            <div style={{ fontSize:12, color:"var(--text-tertiary)", lineHeight:1.75, whiteSpace:"pre-line" }}>{content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqPage({ tr }) {
  tr = tr || TR_DEFAULT;
  const [open, setOpen] = useState(null);
  return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:"32px 0" }}>
      <h2 className="page-h2">{tr.faq_title}</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        {FAQ_DATA.map((item, i) => (
          <div key={i} className={`faq-item${open===i?" open":""}`}>
            <div className="faq-q" onClick={() => setOpen(open===i ? null : i)}>
              <div className="faq-q-text">{item.q}</div>
              <ChevronDown size={15} className="faq-chevron"/>
            </div>
            {open === i && (
              <div className="faq-a">{item.a}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChangelogPage({ tr }) {
  tr = tr || TR_DEFAULT;
  return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:"32px 0" }}>
      <h2 className="page-h2">{tr.changelog_title}</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {CHANGELOG_DATA.map((entry) => (
          <div key={entry.version}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <span className="version-badge">{entry.version}</span>
              <span style={{ fontSize:11, color:"var(--text-disabled)" }}>{entry.date}</span>
            </div>
            <div className="changelog-card">
              {entry.changes.map((c, i) => (
                <div key={i} className="changelog-entry">
                  <span className="changelog-plus">+</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
const FEATURE_ITEMS = [
  { icon:FileImage, title:"PNG Smart Resize", desc:"Scale texture cerdas dengan policy per folder" },
  { icon:Zap, title:"Single-Color Detect", desc:"1px optimization → hemat 98% untuk warna solid" },
  { icon:Shield, title:"Alpha Cleanup", desc:"Zero-out pixel transparan, lossless secara visual" },
  { icon:FileJson, title:"JSON Minify", desc:"Hapus whitespace, comment, dan deep clean" },
  { icon:Volume2, title:"OGG Safe Strip", desc:"Hapus metadata ID3, kualitas audio tetap sama" },
  { icon:Cpu, title:"Web Workers", desc:"Multi-thread processing, browser tidak freeze" },
  { icon:ScanSearch, title:"Pack Analyzer", desc:"Scan dan deteksi masalah tanpa optimize" },
  { icon:Tag, title:"Badge Generator", desc:"Badge shields.io untuk repo resource pack kamu" },
];

export default function Home() {
  const [currentPage, setCurrentPage] = useState("home");
  const [lang, setLang] = useState("id");
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => { setMounted(true); setLang(detectLanguage()); }, []);
  const toggleLang = () => setLang(l => l === "id" ? "en" : "id");
  const tr = TRANSLATIONS[lang] || TRANSLATIONS["id"];

  const [mode, setMode] = useState("normal");
  const [resolutionPercent, setResolutionPercent] = useState(100);
  const [preservePixelArt, setPreservePixelArt] = useState(true);
  const [optimizeOgg, setOptimizeOgg] = useState(true);
  const [zipCompressionLevel, setZipCompressionLevel] = useState(6);
  const [workerCount, setWorkerCount] = useState(0);
  const [doAlphaClean, setDoAlphaClean] = useState(true);
  const [doSingleColor, setDoSingleColor] = useState(true);
  const [doDeepCleanJson, setDoDeepCleanJson] = useState(true);
  const [doShaderMinify, setDoShaderMinify] = useState(true);
  const [doPowerOfTwo, setDoPowerOfTwo] = useState(false);
  const [doJsonKeySort, setDoJsonKeySort] = useState(true);
  const [doLangMinify, setDoLangMinify] = useState(true);

  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [iconFile, setIconFile] = useState(null);
  const [iconBuffer, setIconBuffer] = useState(null);
  const [mcmetaText, setMcmetaText] = useState("");
  const [mcmetaLoaded, setMcmetaLoaded] = useState(false);
  const [mcmetaError, setMcmetaError] = useState("");
  const [dynamicStripPaths, setDynamicStripPaths] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzerResult, setAnalyzerResult] = useState(null);
  const [progress, setProgress] = useState({ done:0, total:0, etaSec:null });
  const [summary, setSummary] = useState(null);

  const [logs, setLogs] = useState([]);
  const [consoleFilter, setConsoleFilter] = useState("ALL");
  const logRef = useRef(null);
  const logBufferRef = useRef([]);
  const flushTimerRef = useRef(null);

  const computedWorkerCount = useMemo(() => {
    const hc = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
    return workerCount > 0 ? workerCount : Math.max(2, Math.min(4, Math.floor(hc/2) || 2));
  }, [workerCount]);

  const progressPct = progress.total > 0 ? Math.round((progress.done/progress.total)*100) : 0;

  const flushLogs = useCallback(() => {
    const buf = logBufferRef.current;
    if (!buf.length) return;
    setLogs(prev => [...prev, ...buf.splice(0, buf.length)]);
    setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 10);
  }, []);

  const appendLog = useCallback((msg) => {
    const time = new Date().toLocaleTimeString();
    logBufferRef.current.push(`[${time}] ${msg}`);
    if (!flushTimerRef.current) { flushTimerRef.current = setTimeout(() => { flushTimerRef.current = null; flushLogs(); }, 200); }
  }, [flushLogs]);

  useEffect(() => () => { if (flushTimerRef.current) clearTimeout(flushTimerRef.current); }, []);

  const filteredLogs = useMemo(() => {
    if (consoleFilter === "ALL") return logs;
    const map = { PNG:"png", OGG:"ogg", JSON:"json", WARN:"warn" };
    const kw = map[consoleFilter] || "";
    return logs.filter(l => l.toLowerCase().includes(kw));
  }, [logs, consoleFilter]);

  const applyPreset = useCallback((key) => {
    const p = DEFAULT_PRESETS[key];
    if (!p) return;
    setMode(p.mode); setResolutionPercent(p.resolutionPercent);
    setZipCompressionLevel(p.zipCompressionLevel);
    setPreservePixelArt(p.preservePixelArt); setOptimizeOgg(p.optimizeOgg);
    setDoAlphaClean(p.doAlphaClean); setDoSingleColor(p.doSingleColor);
    setDoDeepCleanJson(p.doDeepCleanJson); setDoShaderMinify(p.doShaderMinify);
    setDoPowerOfTwo(p.doPowerOfTwo); setDoJsonKeySort(p.doJsonKeySort);
    setDoLangMinify(p.doLangMinify);
    appendLog(`Preset "${p.label}" diterapkan.`);
  }, [appendLog]);

  const handleFile = useCallback(async (f) => {
    if (!f) return;
    setFile(f); setFileName(f.name); setSummary(null); setAnalyzerResult(null);
    setLogs([]); logBufferRef.current = [];
    setProgress({ done:0, total:0, etaSec:null });
    setMcmetaText(""); setMcmetaLoaded(false); setMcmetaError("");
    appendLog(`File diterima: ${f.name} (${(f.size/1e6).toFixed(2)} MB)`);
    try {
      const zip = await JSZip.loadAsync(f);
      const e = Object.values(zip.files).find(e => e.name.toLowerCase() === "pack.mcmeta");
      if (!e) { appendLog("pack.mcmeta tidak ditemukan."); return; }
      const text = await e.async("string");
      setMcmetaText(text); setMcmetaLoaded(true); appendLog("pack.mcmeta dibaca.");
    } catch(err) { setMcmetaError("Gagal membaca pack.mcmeta"); appendLog("ERROR mcmeta: " + err.message); }
  }, [appendLog]);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setIsDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.name.endsWith(".zip")) handleFile(f);
  }, [handleFile]);
  const onDragOver = useCallback((e) => { e.preventDefault(); setIsDragOver(true); }, []);
  const onDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleAnalyze = async () => {
    if (!file || isAnalyzing || isProcessing) return;
    setIsAnalyzing(true); setAnalyzerResult(null);
    setLogs([]); logBufferRef.current = [];
    try {
      const result = await analyzePackOnly(file, appendLog);
      setAnalyzerResult(result); flushLogs();
    } catch(e) { appendLog("ERROR analyze: " + e.message); flushLogs(); }
    finally { setIsAnalyzing(false); }
  };

  const handleOptimize = async () => {
    if (!file || isProcessing) return;
    const baseMode = MODES[mode];
    const effectiveScale = baseMode.scale * (resolutionPercent/100);
    const modeConfig = { ...baseMode, scale:effectiveScale, preservePixelArt };

    CREDIT_BANNER.forEach(l => appendLog(l));
    appendLog(" ");
    appendLog(`Mode: ${baseMode.label} | Scale: ${(effectiveScale*100).toFixed(0)}%`);
    appendLog(`Workers: ${computedWorkerCount} | ZIP Lv: ${zipCompressionLevel}`);
    appendLog(`Alpha:${doAlphaClean?"on":"off"} 1Color:${doSingleColor?"on":"off"} Pow2:${doPowerOfTwo?"on":"off"} JSONSort:${doJsonKeySort?"on":"off"}`);

    setIsProcessing(true); setSummary(null); setAnalyzerResult(null);
    setProgress({ done:0, total:0, etaSec:null });
    const pool = createWorkerPool(computedWorkerCount);
    const t0 = performance.now();

    try {
      const zip = await JSZip.loadAsync(file);
      appendLog("ZIP berhasil dibaca.");
      const outZip = new JSZip();
      const entries = Object.values(zip.files);
      const stats = { totalFiles:0, pngCount:0, pngOptimized:0, pngSkippedByIHDR:0, pngSingleColor:0, pngAlphaCleaned:0, pngPowerOfTwo:0, jsonCount:0, jsonMinified:0, jsonDeepCleaned:0, jsonKeySorted:0, removed:0, oggCount:0, oggOptimized:0, shaderCount:0, shaderMinified:0, langCount:0, bbmodelCount:0, oversizedWarnings:0 };
      const totalToProcess = entries.filter(e => !e.dir).length;
      setProgress({ done:0, total:totalToProcess, etaSec:null });
      let done = 0;
      const tick = () => {
        done++;
        const elapsed = (performance.now()-t0)/1000;
        const rate = done/Math.max(0.001, elapsed);
        const left = Math.max(0, totalToProcess-done);
        if (done%15===0 || done===totalToProcess) setProgress({ done, total:totalToProcess, etaSec:rate>0?Math.round(left/rate):null });
      };

      for (const entry of entries) {
        if (entry.dir) { outZip.folder(entry.name); continue; }
        const name = entry.name, lower = name.toLowerCase();
        stats.totalFiles++;

        if (shouldExcludeNonGameFile(lower, name)) { stats.removed++; appendLog(`Dibuang: ${name}`); tick(); continue; }

        if ([".fsh",".vsh",".glsl"].some(e => lower.endsWith(e))) {
          stats.shaderCount++;
          if (doShaderMinify) { const txt = await entry.async("string"); const min = minifyShader(txt); outZip.file(name, min.length<txt.length?min:txt); if(min.length<txt.length)stats.shaderMinified++; }
          else outZip.file(name, await entry.async("arraybuffer"));
          tick(); continue;
        }

        if (lower.endsWith(".properties")) {
          outZip.file(name, doShaderMinify ? minifyProperties(await entry.async("string")) : await entry.async("arraybuffer"));
          tick(); continue;
        }

        if (lower.endsWith(".lang")) {
          stats.langCount++;
          if (doLangMinify) { outZip.file(name, minifyLang(await entry.async("string"))); }
          else outZip.file(name, await entry.async("arraybuffer"));
          tick(); continue;
        }

        if (lower.endsWith(".bbmodel")) {
          stats.bbmodelCount++;
          outZip.file(name, cleanBbmodel(await entry.async("string")));
          tick(); continue;
        }

        if (lower === "pack.mcmeta") {
          stats.jsonCount++;
          const orig = await entry.async("string");
          let toWrite = (mcmetaLoaded && mcmetaText.trim()) ? mcmetaText : orig;
          try {
            let obj = JSON.parse(toWrite);
            if (doDeepCleanJson) obj = deepCleanJson(obj, lower);
            if (doJsonKeySort) obj = sortJsonKeys(obj);
            const desc = obj?.pack?.description || "";
            obj.pack = obj.pack || {};
            obj.pack._credit = "© ghaa (KhaizenNomazen) | Ghaizers2.0 | GRATIS | Dilarang dijual!";
            obj.pack._legal = "UU Hak Cipta No.28/2014";
            obj.pack._source = "github.com/KhaizenNomazen";
            if (typeof desc === "string" && !desc.includes("ghaa")) obj.pack.description = desc ? `${desc} §7| §cOptimized by §aghaa` : CREDIT_MCMETA_DESC;
            outZip.file(name, modeConfig.minifyJson ? JSON.stringify(obj) : JSON.stringify(obj, null, 2));
            stats.jsonMinified++; appendLog("pack.mcmeta: credit injected.");
          } catch { outZip.file(name, toWrite); }
          tick(); continue;
        }

        if (lower.endsWith(".ogg")) {
          stats.oggCount++;
          const buf = await entry.async("arraybuffer");
          if (optimizeOgg) { const { out, changed } = await optimizeOggSafe(buf); if(changed){stats.oggOptimized++;appendLog(`OGG: ${name}`);} outZip.file(name, out); }
          else outZip.file(name, buf);
          tick(); continue;
        }

        if (lower.endsWith(".png")) {
          stats.pngCount++;
          const policy = getPolicyForPath(lower, dynamicStripPaths);
          if (!preservePixelArt && policy.smoothing === "nearest") policy.smoothing = "smooth";
          if (policy.skip || policy.skipResize) { outZip.file(name, await entry.async("arraybuffer")); tick(); continue; }
          const buf = await entry.async("arraybuffer");
          if (buf.byteLength < 2048) { outZip.file(name, buf); stats.pngSkippedByIHDR++; tick(); continue; }
          const sz = readPngIHDRSize(buf);
          if (!sz) { outZip.file(name, buf); tick(); continue; }
          const { w:w0, h:h0 } = sz;
          if (w0>1024 || h0>1024) { stats.oversizedWarnings++; appendLog(`Oversized: ${name} (${w0}×${h0})`); }
          const { tW, tH, smoothing } = computeTargetSize({ w0, h0, policy, modeConfig });
          const res = await pool.runPngJob({ buffer:buf, w0, h0, tW, tH, smoothing, sizeGuard:true, doAlphaClean, doSingleColor, doPowerOfTwo });
          if (res?.singleColor) { stats.pngSingleColor++; stats.pngOptimized++; appendLog(`1×1: ${name}`); }
          else if (res?.changed) {
            stats.pngOptimized++;
            if (res.alphaFixed>0) stats.pngAlphaCleaned++;
            if (doPowerOfTwo && res.finalW && (res.finalW!==w0||res.finalH!==h0)) stats.pngPowerOfTwo++;
            if (tW!==w0||tH!==h0) appendLog(`PNG: ${name} (${w0}×${h0}→${res.finalW||tW}×${res.finalH||tH})`);
            else if (res.alphaFixed>0) appendLog(`Alpha: ${name}`);
          }
          outZip.file(name, res?.out || buf); tick(); continue;
        }

        if (lower.endsWith(".json") || lower.endsWith(".mcmeta")) {
          stats.jsonCount++;
          const txt = await entry.async("string");
          if (modeConfig.minifyJson) {
            try {
              let obj = JSON.parse(txt);
              if (doDeepCleanJson) { const b=JSON.stringify(obj).length; obj=deepCleanJson(obj,lower); if(JSON.stringify(obj).length<b)stats.jsonDeepCleaned++; }
              if (doJsonKeySort) { const b=JSON.stringify(obj); obj=sortJsonKeys(obj); if(JSON.stringify(obj)!==b)stats.jsonKeySorted++; }
              outZip.file(name, JSON.stringify(obj)); stats.jsonMinified++;
            } catch { outZip.file(name, txt); }
          } else outZip.file(name, txt);
          tick(); continue;
        }

        outZip.file(name, await entry.async("arraybuffer")); tick();
      }

      outZip.file("GHAIZERS_CREDIT.txt", CREDIT_TXT);
      outZip.file("JANGAN_BAYAR_INI.txt", "Tool Ghaizers2.0 ini GRATIS!\nJika kamu membayar → kamu DITIPU!\nLapor: github.com/KhaizenNomazen\nMenjual = UU Hak Cipta No.28/2014");
      appendLog("Credit injected.");
      if (iconBuffer) { appendLog("Override pack.png..."); outZip.file("pack.png", iconBuffer); }
      else if (iconFile) { appendLog("Override pack.png..."); outZip.file("pack.png", await buildPackIcon(iconFile)); }
      appendLog("Menyusun ZIP...");
      const blob = await outZip.generateAsync({
        type:"blob", compression:"DEFLATE",
        compressionOptions:{ level:Math.max(1,Math.min(9,zipCompressionLevel)) },
        comment:"Optimized by Ghaizers2.0 | (c) ghaa | GRATIS | github.com/KhaizenNomazen"
      });
      const sha1 = await sha1HexFromBlob(blob);
      if (sha1) appendLog(`SHA-1: ${sha1}`);
      appendLog("Selesai. Download dimulai...");
      triggerDownload(blob, "optimize_file.zip");
      setSummary({ ...stats, originalSize:file.size, optimizedSize:blob.size, sha1:sha1||null, workers:computedWorkerCount, compressionLevel:zipCompressionLevel });
      flushLogs();
      setProgress({ done:totalToProcess, total:totalToProcess, etaSec:0 });
    } catch(e) { appendLog("ERROR: " + e.message); flushLogs(); }
    finally { pool.destroy(); setIsProcessing(false); }
  };

  /* ─────────── RENDER ─────────── */
  return (
    <>

      {/* Background */}
      <div className="bg-root">
        <div className="bg-mesh"/>
        <div className="bg-grid"/>
        <div className="bg-scanlines"/>
        <div className="orb orb-1"/>
        <div className="orb orb-2"/>
        <div className="orb orb-3"/>
      </div>

      <div className="page-root">

        {/* Watermark */}
        <div className="watermark-bar">
          <Shield size={11}/>
          {tr.watermark}
          <span style={{ opacity:0.5 }}>·</span>
          <a href="https://github.com/KhaizenNomazen" target="_blank" rel="noopener noreferrer">github.com/KhaizenNomazen</a>
        </div>

        {/* Navbar */}
        <nav className="navbar">
         <div className="navbar-logo" onClick={() => setCurrentPage("home")}>
            <img src="/android-chrome-192x192.png" alt="Ghaizers" className="navbar-favicon" />
            Ghaizers
          </div>

          <div className="navbar-links">
            {[
              ["home", "Home", null],
              ["docs", "Docs", BookOpen],
              ["faq", "FAQ", HelpCircle],
              ["changelog", "Changelog", Clock],
            ].map(([page, label, Icon]) => (
              <button key={page}
                className={`navbar-link${currentPage===page?" active":""}`}
                onClick={() => setCurrentPage(page)}>
                {Icon && <Icon size={13}/>}
                {label}
              </button>
            ))}
            <a href="https://github.com/KhaizenNomazen" target="_blank" rel="noopener noreferrer"
              className="navbar-link navbar-link-external" style={{ display:"flex", alignItems:"center", gap:5 }}>
              <Github size={13}/>
              GitHub
            </a>
            <button onClick={toggleLang} className="lang-toggle" title={lang==="id"?"Switch to English":"Ganti ke Indonesia"}>
              <Globe size={12}/>
              {lang==="id" ? "ID" : "EN"}
            </button>
            <span className="navbar-version">v2.0</span>
          </div>
        </nav>

        {/* ── DOCS PAGE ── */}
        {currentPage === "docs" && (
          <div className="optimizer-wrap"><DocsPage tr={tr}/></div>
        )}

        {/* ── FAQ PAGE ── */}
        {currentPage === "faq" && (
          <div className="optimizer-wrap"><FaqPage tr={tr}/></div>
        )}

        {/* ── CHANGELOG PAGE ── */}
        {currentPage === "changelog" && (
          <div className="optimizer-wrap"><ChangelogPage tr={tr}/></div>
        )}

        {/* ── HOME PAGE ── */}
        {currentPage === "home" && (<>

          {/* Hero */}
          <section className="hero">
            <div className="hero-eyebrow">
              <Zap size={11} strokeWidth={2.5}/>
              Minecraft Resource Pack Optimizer
            </div>
            <h1 className="hero-h1">
              {tr.hero_title_1}{" "}
              <span className="accent">{tr.hero_title_accent}</span>
              <br/>
              {tr.hero_title_2}
            </h1>
            <p className="hero-sub">{tr.hero_sub}</p>
            <div className="hero-actions">
              <button className="btn-primary"
                onClick={() => document.getElementById("optimizer-start")?.scrollIntoView({ behavior:"smooth" })}
                style={{ display:"flex", alignItems:"center", gap:7 }}>
                {tr.hero_cta}
                <ArrowRight size={15}/>
              </button>
              <button className="btn-secondary" onClick={() => setCurrentPage("docs")}
                style={{ display:"flex", alignItems:"center", gap:7 }}>
                <BookOpen size={14}/>
                {tr.hero_docs}
              </button>
            </div>
            <div className="hero-stats">
              {[
                ["100%", tr.hero_stat_1],
                ["0 MB", tr.hero_stat_2],
                ["SHA-1", tr.hero_stat_3],
                ["FREE", tr.hero_stat_4],
              ].map(([v, l]) => (
                <div className="hero-stat" key={l}>
                  <span className="hero-stat-val">{v}</span>
                  <span className="hero-stat-lbl">{l}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Feature Strip */}
<div className="feature-strip">
            <div className="feature-track">
              {[...FEATURE_ITEMS, ...FEATURE_ITEMS].map(({ icon: Icon, title, desc }, i) => (
                <div className="feature-card" key={`${title}-${i}`}>
                  <div className="feature-card-icon">
                    <Icon size={15} strokeWidth={1.75}/>
                  </div>
                  <div className="feature-card-title">{title}</div>
                  <div className="feature-card-desc">{desc}</div>
                </div>
              ))}
            </div>
          </div>
          {/* ── OPTIMIZER ── */}
          <div className="optimizer-wrap" id="optimizer-start">

            {/* 1. Upload */}
            <div className="glass-section">
              <div className="sec-header">
                <div className="sec-num">01</div>
                <div>
                  <div className="sec-title">{tr.sec_upload_title}</div>
                  <div className="sec-sub">{tr.sec_upload_sub}</div>
                </div>
              </div>
              <input type="file" accept=".zip" id="inputFile" className="hidden-input"
                disabled={isProcessing || isAnalyzing}
                onChange={e => handleFile(e.target.files?.[0])}/>
              <label htmlFor="inputFile"
                className={`dropzone${isDragOver?" drag-over":""}${file?" has-file":""}`}
                onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}>
                <div className="drop-icon">
                  {file ? <Package size={18} strokeWidth={1.5}/> : <Upload size={18} strokeWidth={1.5}/>}
                </div>
                {file ? (
                  <>
                    <div className="drop-filename">{fileName}</div>
                    <div className="drop-sub">{(file.size/1e6).toFixed(2)} MB · Klik untuk ganti</div>
                  </>
                ) : (
                  <>
                    <div className="drop-title">{tr.sec_upload_drop_title}</div>
                    <div className="drop-sub">{tr.sec_upload_drop_sub}</div>
                  </>
                )}
              </label>
            </div>

            {/* 2. Preset */}
            <div className="glass-section">
              <div className="sec-header">
                <div className="sec-num">02</div>
                <div>
                  <div className="sec-title">{tr.sec_preset_title}</div>
                  <div className="sec-sub">{tr.sec_preset_sub}</div>
                </div>
              </div>
              <div className="pill-row">
                {Object.entries(DEFAULT_PRESETS).map(([key, p]) => (
                  <button key={key} className="pill" disabled={isProcessing||isAnalyzing}
                    onClick={() => applyPreset(key)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Mode */}
            <div className="glass-section">
              <div className="sec-header">
                <div className="sec-num">03</div>
                <div>
                  <div className="sec-title">{tr.sec_mode_title}</div>
                  <div className="sec-sub">{tr.sec_mode_sub}</div>
                </div>
              </div>
              <div className="mode-grid">
                {Object.values(MODES).map(m => (
                  <button key={m.id}
                    className={`mode-card${mode===m.id?" active":""}`}
                    disabled={isProcessing||isAnalyzing}
                    onClick={() => setMode(m.id)}>
                    <div className="mode-card-head">
                      <div className="mode-card-icon">
                        <Layers size={13} strokeWidth={1.75}/>
                        <span className="mode-card-name">{m.label}</span>
                      </div>
                      {mode === m.id && <div className="mode-card-dot"/>}
                    </div>
                    <p className="mode-card-desc">
                      {m.id==="normal" ? tr.mode_normal_desc : m.id==="extreme" ? tr.mode_extreme_desc : tr.mode_ultra_desc}
                    </p>
                    <div className="mode-card-tags">
                      <span className="mode-tag">Scale {Math.round(m.scale*100)}%</span>
                      <span className="mode-tag">Max {m.maxSize}px</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Resolution */}
            <div className="glass-section">
              <div className="sec-header">
                <div className="sec-num">04</div>
                <div>
                  <div className="sec-title">{tr.sec_resolution_title}</div>
                  <div className="sec-sub">{tr.sec_resolution_sub}</div>
                </div>
              </div>
              <div className="slider-row">
                <input type="range" min="40" max="120" value={resolutionPercent}
                  onChange={e => setResolutionPercent(Number(e.target.value))}
                  className="slider" disabled={isProcessing||isAnalyzing}
                  style={{"--value":`${((resolutionPercent-40)/80)*100}%`}}/>
                <div className="slider-val">{resolutionPercent}%</div>
              </div>
              <div className="pill-row">
                {[40,60,80,100,120].map(v => (
                  <button key={v} className="pill" disabled={isProcessing||isAnalyzing}
                    onClick={() => setResolutionPercent(v)}>{v}%</button>
                ))}
              </div>
            </div>

            {/* 5. Options */}
            <div className="glass-section">
              <div className="sec-header">
                <div className="sec-num">05</div>
                <div>
                  <div className="sec-title">{tr.sec_options_title}</div>
                  <div className="sec-sub">{tr.sec_options_sub}</div>
                </div>
              </div>
              <div className="check-grid">
                <CheckItem checked={preservePixelArt} onChange={setPreservePixelArt} disabled={isProcessing||isAnalyzing} label={tr.opt_pixelart} desc={tr.opt_pixelart_desc}/>
                <CheckItem checked={optimizeOgg} onChange={setOptimizeOgg} disabled={isProcessing||isAnalyzing} label={tr.opt_ogg} desc={tr.opt_ogg_desc}/>
                <CheckItem checked={doAlphaClean} onChange={setDoAlphaClean} disabled={isProcessing||isAnalyzing} label={tr.opt_alpha} desc={tr.opt_alpha_desc}/>
                <CheckItem checked={doSingleColor} onChange={setDoSingleColor} disabled={isProcessing||isAnalyzing} label={tr.opt_singlecolor} desc={tr.opt_singlecolor_desc}/>
                <CheckItem checked={doDeepCleanJson} onChange={setDoDeepCleanJson} disabled={isProcessing||isAnalyzing} label={tr.opt_deepjson} desc={tr.opt_deepjson_desc}/>
                <CheckItem checked={doShaderMinify} onChange={setDoShaderMinify} disabled={isProcessing||isAnalyzing} label={tr.opt_shader} desc={tr.opt_shader_desc}/>
                <CheckItem checked={doPowerOfTwo} onChange={setDoPowerOfTwo} disabled={isProcessing||isAnalyzing} label={tr.opt_pow2} desc={tr.opt_pow2_desc}/>
                <CheckItem checked={doJsonKeySort} onChange={setDoJsonKeySort} disabled={isProcessing||isAnalyzing} label={tr.opt_jsonsort} desc={tr.opt_jsonsort_desc}/>
                <CheckItem checked={doLangMinify} onChange={setDoLangMinify} disabled={isProcessing||isAnalyzing} label={tr.opt_lang} desc={tr.opt_lang_desc}/>
              </div>
            </div>

            {/* 6. Advanced */}
            <div className="glass-section">
              <div className="sec-header">
                <div className="sec-num">06</div>
                <div><div className="sec-title">{tr.sec_advanced_title}</div></div>
              </div>
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:12, fontWeight:600, marginBottom:10, color:"var(--text-secondary)", display:"flex", alignItems:"center", gap:6 }}>
                  <HardDrive size={13} style={{ color:"var(--text-tertiary)" }}/>
                  {tr.zip_level}
                </div>
                <div className="slider-row">
                  <input type="range" min="1" max="9" value={zipCompressionLevel}
                    onChange={e => setZipCompressionLevel(Number(e.target.value))}
                    className="slider" disabled={isProcessing||isAnalyzing}
                    style={{"--value":`${((zipCompressionLevel-1)/8)*100}%`}}/>
                  <div className="slider-val">Lv{zipCompressionLevel}</div>
                </div>
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:600, marginBottom:10, color:"var(--text-secondary)", display:"flex", alignItems:"center", gap:6 }}>
                  <Cpu size={13} style={{ color:"var(--text-tertiary)" }}/>
                  Web Workers
                </div>
                <div className="pill-row">
                  <button className="pill" disabled={isProcessing||isAnalyzing} onClick={() => setWorkerCount(0)}>
                    {tr.workers_auto} ({computedWorkerCount})
                  </button>
                  {[2,3,4].map(v => (
                    <button key={v} className="pill" disabled={isProcessing||isAnalyzing} onClick={() => setWorkerCount(v)}>
                      {v} Workers
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 7. Icon */}
            <div className="glass-section">
              <div className="sec-header">
                <div className="sec-num">07</div>
                <div>
                  <div className="sec-title">{tr.sec_icon_title}</div>
                  <div className="sec-sub">{tr.sec_icon_sub}</div>
                </div>
              </div>
              <input type="file" accept="image/png,image/jpeg,image/jpg" id="iconFile" className="hidden-input"
                disabled={isProcessing||isAnalyzing}
                onChange={async e => {
                  const f = e.target.files?.[0];
                  if (f) { setIconFile(f); const ab = await f.arrayBuffer(); setIconBuffer(ab); appendLog(`Icon: ${f.name}`); }
                }}/>
              <label htmlFor="iconFile" className={`upload-btn${iconFile?" has-file":""}`}>
                <div className="upload-btn-icon">
                  <FileImage size={16} strokeWidth={1.75}/>
                </div>
                <div>
                  <div className="upload-btn-text">{iconFile ? iconFile.name : tr.icon_placeholder}</div>
                  <div className="upload-btn-sub">{tr.icon_sub}</div>
                </div>
              </label>
            </div>

            {/* 8. mcmeta */}
            <div className="glass-section">
              <div className="sec-header">
                <div className="sec-num">08</div>
                <div>
                  <div className="sec-title">{tr.sec_mcmeta_title}</div>
                  <div className="sec-sub">{tr.sec_mcmeta_sub}</div>
                </div>
              </div>
              {mcmetaError && (
                <div style={{ color:"var(--err)", fontSize:12, marginBottom:8, display:"flex", alignItems:"center", gap:5 }}>
                  <AlertCircle size={13}/>{mcmetaError}
                </div>
              )}
              {mcmetaLoaded ? (
                <textarea className="mcmeta-ta" rows={8} value={mcmetaText}
                  onChange={e => setMcmetaText(e.target.value)} disabled={isProcessing||isAnalyzing}
                  placeholder='{"pack": {"pack_format": 8, "description": "..."}}' />
              ) : (
                <div style={{ color:"var(--text-disabled)", fontSize:12, fontStyle:"italic", padding:"16px 0" }}>{tr.mcmeta_empty}</div>
              )}
            </div>

            {/* 9. Pojav Log */}
            <div className="glass-section">
              <div className="sec-header">
                <div className="sec-num">09</div>
                <div>
                  <div className="sec-title">{tr.sec_pojav_title}</div>
                  <div className="sec-sub">{tr.sec_pojav_sub}</div>
                </div>
              </div>
              <input type="file" accept=".txt" id="logFile" className="hidden-input"
                disabled={isProcessing||isAnalyzing}
                onChange={async e => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const text = await f.text(); const parsed = parsePojavLog(text);
                  if (parsed.enforceStrip.length > 0) {
                    appendLog(`Auto-Fix: ${parsed.enforceStrip.length} path animated strip bermasalah → enforce resize.`);
                    setDynamicStripPaths(prev => uniqueLower([...prev, ...parsed.enforceStrip]));
                  } else {
                    appendLog("Auto-Fix: tidak ada animated strip bermasalah di log.");
                  }
                  if (parsed.hasResourceReloadFailed) {
                    appendLog("RESOURCE RELOAD FAILED terdeteksi di log!");
                    parsed.crashCauses.forEach(c => appendLog(`  → ${c}`));
                  }
                  if (parsed.shaderErrors.length > 0) {
                    appendLog(`Shader Error: ${parsed.shaderErrors.length} masalah ditemukan.`);
                    parsed.shaderErrors.slice(0,3).forEach(e => appendLog(`  • ${e}`));
                  }
                  if (parsed.overlayErrors.length > 0) {
                    appendLog(`Overlay Error: ${parsed.overlayErrors.length} masalah ditemukan.`);
                    parsed.overlayErrors.forEach(e => appendLog(`  • ${e}`));
                  }
                  if (parsed.soundErrors.length > 0) {
                    appendLog(`Sound Error: ${parsed.soundErrors.length} unknown soundEvent.`);
                    parsed.soundErrors.slice(0,5).forEach(s => appendLog(`  • ${s}`));
                  }
                  if (parsed.missing.length > 0) {
                    appendLog(`Missing texture/sprite: ${parsed.missing.length} file tidak ditemukan.`);
                  }
                  if (parsed.atlasErrors.length > 0) {
                    appendLog(`Atlas Error: ${parsed.atlasErrors.length} texture tidak muat.`);
                  }
                  if (parsed.modelErrors.length > 0) {
                    appendLog(`Missing Model: ${parsed.modelErrors.length} model tidak ditemukan.`);
                  }
                  if (parsed.totalIssues === 0 && !parsed.hasResourceReloadFailed) {
                    appendLog("Log dianalisis — tidak ada masalah resource pack terdeteksi.");
                  } else {
                    appendLog(`Total: ${parsed.totalIssues} masalah terdeteksi dari log.`);
                  }
                }}/>
              <label htmlFor="logFile" className="upload-btn">
                <div className="upload-btn-icon">
                  <FileText size={16} strokeWidth={1.75}/>
                </div>
                <div>
                  <div className="upload-btn-text">{tr.pojav_placeholder}</div>
                  <div className="upload-btn-sub">
                    Detected:{" "}
                    <strong style={{ color:"var(--ok)", fontFamily:"var(--f-mono)" }}>{dynamicStripPaths.length}</strong>
                    {" "}{tr.pojav_detected}
                  </div>
                </div>
              </label>
            </div>

            {/* 10. Progress */}
            <div className="glass-section">
              <div className="sec-header">
                <div className="sec-num">10</div>
                <div><div className="sec-title">{tr.sec_progress_title}</div></div>
              </div>
              <ProgressRing pct={progressPct} done={progress.done} total={progress.total}
                etaSec={progress.etaSec} beating={isProcessing} waitingText={tr.progress_waiting}/>
            </div>

            {/* 11. Console */}
            <div className="glass-section">
              <div className="sec-header">
                <div className="sec-num">11</div>
                <div><div className="sec-title">{tr.sec_console_title}</div></div>
              </div>
              <div className="console-wrap">
                <div className="console-bar">
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div className="console-dots">
                      <div className="cdot cdot-r"/><div className="cdot cdot-y"/><div className="cdot cdot-g"/>
                    </div>
                    <div className="console-filters">
                      {["ALL","PNG","OGG","JSON","WARN"].map(f => (
                        <button key={f} className={`cf-btn${consoleFilter===f?" on":""}`} onClick={() => setConsoleFilter(f)}>{f}</button>
                      ))}
                    </div>
                  </div>
                  <button className="console-copy" onClick={() => navigator.clipboard?.writeText(logs.join("\n"))}
                    style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <Copy size={11}/>Copy
                  </button>
                </div>
                <div className="console-body" ref={logRef}>
                  {filteredLogs.length === 0 ? (
                    <div className="console-empty">
                      <Terminal size={20} strokeWidth={1} style={{ margin:"0 auto 8px", display:"block", opacity:0.3 }}/>
                      {tr.console_empty}
                    </div>
                  ) : (
                    filteredLogs.map((l, i) => <div key={i} className={`cl ${classifyLog(l)}`}>{l}</div>)
                  )}
                </div>
              </div>
            </div>

            {/* Analyzer Result */}
            {analyzerResult && (
              <div className="glass-section fade-in">
                <div className="sec-header">
                  <div className="sec-num" style={{ background:"var(--info-dim)", borderColor:"rgba(147,197,253,0.2)", color:"var(--info)" }}>
                    <ScanSearch size={13}/>
                  </div>
                  <div>
                    <div className="sec-title">{tr.sec_analyzer_title}</div>
                    <div className="sec-sub">{tr.sec_analyzer_sub}</div>
                  </div>
                </div>
                <AnalyzerResult data={analyzerResult} tr={tr}/>
              </div>
            )}

            {/* Summary */}
            {summary && (
              <div className="glass-section fade-in">
                <div className="sec-header">
                  <div className="sec-num" style={{ background:"var(--ok-dim)", borderColor:"rgba(52,211,153,0.2)", color:"var(--ok)" }}>
                    <CheckCircle2 size={13}/>
                  </div>
                  <div><div className="sec-title">Hasil Optimasi</div></div>
                </div>
                <div className="savings-hero">
                  <span className="savings-num">
                    {(((summary.originalSize-summary.optimizedSize)/summary.originalSize)*100).toFixed(1)}%
                  </span>
                  <div className="savings-lbl">ukuran berkurang</div>
                  <div className="savings-sizes">
                    {(summary.originalSize/1e6).toFixed(2)} MB
                    <ArrowRight size={12} style={{ display:"inline", margin:"0 6px", color:"var(--text-disabled)" }}/>
                    {(summary.optimizedSize/1e6).toFixed(2)} MB
                  </div>
                </div>
                <div className="summary-grid">
                  <SummaryCard label={tr.sum_png} value={`${summary.pngOptimized}/${summary.pngCount}`}/>
                  <SummaryCard label={tr.sum_png_skip} value={summary.pngSkippedByIHDR}/>
                  {summary.pngSingleColor>0&&<SummaryCard label={tr.sum_single} value={summary.pngSingleColor}/>}
                  {summary.pngAlphaCleaned>0&&<SummaryCard label={tr.sum_alpha} value={summary.pngAlphaCleaned}/>}
                  {summary.pngPowerOfTwo>0&&<SummaryCard label={tr.sum_pow2} value={summary.pngPowerOfTwo}/>}
                  {summary.oggCount>0&&<SummaryCard label={tr.sum_ogg} value={`${summary.oggOptimized}/${summary.oggCount}`}/>}
                  <SummaryCard label={tr.sum_json} value={`${summary.jsonMinified}/${summary.jsonCount}`}/>
                  {summary.jsonDeepCleaned>0&&<SummaryCard label={tr.sum_deep} value={summary.jsonDeepCleaned}/>}
                  {summary.jsonKeySorted>0&&<SummaryCard label={tr.sum_keysort} value={summary.jsonKeySorted}/>}
                  {summary.shaderCount>0&&<SummaryCard label={tr.sum_shader} value={`${summary.shaderMinified}/${summary.shaderCount}`}/>}
                  {summary.langCount>0&&<SummaryCard label={tr.sum_lang} value={summary.langCount}/>}
                  {summary.bbmodelCount>0&&<SummaryCard label={tr.sum_bbmodel} value={summary.bbmodelCount}/>}
                  {summary.oversizedWarnings>0&&<SummaryCard label={tr.sum_oversized} value={summary.oversizedWarnings}/>}
                  <SummaryCard label={tr.sum_removed} value={summary.removed}/>
                  <SummaryCard label={tr.sum_workers} value={summary.workers}/>
                  {summary.sha1 && (
                    <div className="sum-card" style={{ gridColumn:"1/-1" }}>
                      <div className="sum-label">SHA-1 Hash</div>
                      <div style={{ display:"flex", gap:8, alignItems:"center", justifyContent:"center", flexWrap:"wrap", marginTop:4 }}>
                        <code style={{ fontSize:10 }}>{summary.sha1.substring(0,20)}...</code>
                        <button className="pill" style={{ fontSize:10, padding:"3px 10px", display:"flex", alignItems:"center", gap:4 }}
                          onClick={() => navigator.clipboard?.writeText(summary.sha1)}>
                          <Copy size={10}/>Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <ShareResults summary={summary}/>
                <p style={{ textAlign:"center", fontSize:11, color:"var(--text-disabled)", marginTop:16, display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                  <CheckCircle2 size={12} style={{ color:"var(--ok)" }}/>
                  <code>optimize_file.zip</code>{" "}{tr.sum_done}
                </p>
              </div>
            )}

            {/* Badge Generator */}
            <div className="glass-section">
              <div className="sec-header">
                <div className="sec-num" style={{ background:"rgba(139,92,246,0.12)", borderColor:"rgba(139,92,246,0.25)", color:"rgba(167,139,250,1)" }}>
                  <Tag size={13}/>
                </div>
                <div>
                  <div className="sec-title">{tr.sec_badge_title}</div>
                  <div className="sec-sub">{tr.sec_badge_sub}</div>
                </div>
              </div>
              <BadgeGenerator/>
            </div>

          </div>{/* /optimizer-wrap */}

          {/* Sticky buttons */}
          <div className="sticky-btn-wrap">
            <div className="sticky-btn-inner">
              <button
                className="btn-analyze"
                onClick={handleAnalyze}
                disabled={isProcessing || isAnalyzing || !file}
                style={{ display:"flex", alignItems:"center", gap:6,
                  background:isAnalyzing?"var(--info-dim)":"var(--glass-base)",
                  borderColor:isAnalyzing?"rgba(147,197,253,0.3)":"var(--border-subtle)",
                  color:isAnalyzing?"var(--info)":"var(--text-secondary)" }}>
                <ScanSearch size={15} style={{ animation:isAnalyzing?"spin 1.5s linear infinite":"none" }}/>
                {isAnalyzing ? "Scanning..." : "Analyze"}
              </button>
              <button
                className={`btn-optimize${isProcessing?" processing":""}`}
                style={{ flex:1 }}
                onClick={handleOptimize}
                disabled={isProcessing || isAnalyzing || !file}>
                {isProcessing ? (
                  <><RefreshCw size={15} style={{ animation:"spin 1s linear infinite" }}/>{tr.btn_optimizing} {progressPct}%</>
                ) : !file ? (
                  <><Upload size={15}/>{tr.btn_upload_first}</>
                ) : (
                  <><Zap size={15}/>{tr.btn_optimize}</>
                )}
              </button>
            </div>
          </div>

{/* Support */}
          <div className="support-section">
            <div className="support-inner">
              <div className="support-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.014.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                </svg>
              </div>
              <div>
                <div className="support-title">Join komunitas Discord</div>
                <div className="support-desc">Tanya, diskusi, dan dapat update terbaru Ghaizers</div>
              </div>
              <a href="https://dsc.gg/ghaizers" target="_blank" rel="noopener noreferrer" className="support-btn">
                Join Discord
              </a>
            </div>
          </div>

          {/* Footer */}
          <footer className="footer">
          {/* Footer */}
          <footer className="footer">
            <div className="footer-logo">
              <Zap size={15} strokeWidth={2}/>
              Ghaizers 2.0
            </div>
            <div className="footer-by">
              Made with care by <strong style={{ color:"var(--text-primary)" }}>ghaa</strong> (KhaizenNomazen)
            </div>
            <div className="footer-free">{tr.footer_free}</div>
            <div className="footer-legal">{tr.footer_legal}</div>
            <a href="https://github.com/KhaizenNomazen" target="_blank" rel="noopener noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:5, color:"var(--text-secondary)", fontSize:12, marginBottom:20 }}>
              <Github size={13}/>github.com/KhaizenNomazen
            </a>
            <div className="footer-links">
              {[["docs","Docs"],["faq","FAQ"],["changelog","Changelog"]].map(([page, label]) => (
                <button key={page} onClick={() => setCurrentPage(page)}>{label}</button>
              ))}
              <span className="footer-sep">·</span>
              <a href="/privacy">Privacy Policy</a>
              <span className="footer-sep">·</span>
              <a href="/terms">Terms of Service</a>
            </div>
            <div className="footer-tech">
              IHDR Skip · Web Workers · OGG Safe · Alpha Cleanup · Single-Color · Pow2 · Deep JSON · JSON Sort · .lang · .bbmodel · Shader Minify · SHA-1 · Pack Analyzer · Badge Gen
            </div>
          </footer>

        </>)}

      </div>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
