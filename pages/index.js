import Head from "next/head";
import { TRANSLATIONS, detectLanguage, t } from "../lib/i18n";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";

/* ─────────────────────────────────────────
   CREDIT
───────────────────────────────────────── */
const CREDIT_BANNER = [
  "╔══════════════════════════════════════════════════╗",
  "║     Ghaizers2.0 — Minecraft Pack Optimizer       ║",
  "║     Made with 💚 by ghaa (KhaizenNomazen)        ║",
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
  normal:  { id:"normal",  label:"Normal",       emoji:"🟢", description:"Seimbang, kualitas bagus dan pack tetap ringan.", scale:0.85, maxSize:512, minSize:16, minifyJson:true },
  extreme: { id:"extreme", label:"Extreme",       emoji:"🟡", description:"Sangat hemat, cocok untuk device mid–low.",      scale:0.6,  maxSize:256, minSize:8,  minifyJson:true },
  ultra:   { id:"ultra",   label:"Ultra Extreme", emoji:"🔴", description:"Paling ringan, untuk HP kentang / Pojav lemah.", scale:0.4,  maxSize:128, minSize:4,  minifyJson:true },
};

/* ─────────────────────────────────────────
   PRESETS (Fase 2)
───────────────────────────────────────── */
const DEFAULT_PRESETS = {
  "pojav-lite":   { label:"Pojav Lite",    mode:"ultra",   resolutionPercent:60,  zipCompressionLevel:9, preservePixelArt:true,  optimizeOgg:true, doAlphaClean:true, doSingleColor:true, doDeepCleanJson:true, doShaderMinify:true,  doPowerOfTwo:true,  doJsonKeySort:true,  doLangMinify:true },
  "server-pack":  { label:"Server Pack",   mode:"extreme", resolutionPercent:80,  zipCompressionLevel:8, preservePixelArt:true,  optimizeOgg:true, doAlphaClean:true, doSingleColor:true, doDeepCleanJson:true, doShaderMinify:true,  doPowerOfTwo:false, doJsonKeySort:true,  doLangMinify:true },
  "ultra-compress":{ label:"Ultra Compress",mode:"ultra",  resolutionPercent:50,  zipCompressionLevel:9, preservePixelArt:false, optimizeOgg:true, doAlphaClean:true, doSingleColor:true, doDeepCleanJson:true, doShaderMinify:true,  doPowerOfTwo:true,  doJsonKeySort:true,  doLangMinify:true },
  "quality":      { label:"Quality",       mode:"normal",  resolutionPercent:100, zipCompressionLevel:6, preservePixelArt:true,  optimizeOgg:true, doAlphaClean:true, doSingleColor:false,doDeepCleanJson:true, doShaderMinify:false, doPowerOfTwo:false, doJsonKeySort:false, doLangMinify:true },
};

/* ─────────────────────────────────────────
   POLICIES
───────────────────────────────────────── */
const BASE_POLICIES = [
  { pattern:/textures\/gui\//, smoothing:"nearest", minSize:16, scaleMul:1.0 },
  { pattern:/textures\/font\//, smoothing:"nearest", minSize:16, scaleMul:1.0, skipResize:true },
  { pattern:/modelengine\//, enforceStrip:true, maxHeight:8192, smoothing:"smooth" },
  { pattern:/colormap\//, skip:true },
  { pattern:/maps\//, skip:true },
  { pattern:/textures\/entity\//, scaleMul:0.85 },
  { pattern:/textures\/particle\//, scaleMul:0.75, smoothing:"nearest" },
  { pattern:/.*/, scaleMul:1.0 },
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

// [Fase 2] System file detection
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
  const enforceStrip=new Set(), missing=new Set();
  const reStrip=/size .*? is not multiple of frame size|not multiple of frame size/i;
  const rePathPng=/(['"])([^'"]+?\.png)\1/i;
  const reMissing=/Missing sprite.*?([^\s]+?\.png)/i;
  for (const line of text.split(/\r?\n/)) {
    if (reStrip.test(line)) { const m=rePathPng.exec(line); if(m&&m[2]) enforceStrip.add(m[2].toLowerCase()); }
    const mm=reMissing.exec(line); if(mm&&mm[1]) missing.add(mm[1].toLowerCase());
  }
  return { enforceStrip:[...enforceStrip], missing:[...missing] };
}

function uniqueLower(arr) {
  const s=new Set(),out=[];
  for (const v of arr) { const l=(v||"").toLowerCase(); if(!s.has(l)){s.add(l);out.push(l);} }
  return out;
}

function readPngIHDRSize(buffer) {
  try {
    const u8=new Uint8Array(buffer);
    if(u8.length<24) return null;
    const sig=[137,80,78,71,13,10,26,10];
    for(let i=0;i<8;i++) if(u8[i]!==sig[i]) return null;
    if(String.fromCharCode(u8[12],u8[13],u8[14],u8[15])!=="IHDR") return null;
    const dv=new DataView(buffer);
    const w=dv.getUint32(16,false),h=dv.getUint32(20,false);
    return (w&&h)?{w,h}:null;
  } catch { return null; }
}

function detectAnimatedStrip(w,h) {
  if(!w||!h||h<=w) return null;
  const f=h/w; return (Number.isInteger(f)&&f>=2)?f:null;
}

// [Fase 2] Power-of-two snap
function nearestPowerOfTwo(n) {
  if (n <= 0) return 1;
  let p = 1;
  while (p < n) p <<= 1;
  const lower = p >> 1;
  return (n - lower < p - n) ? lower : p;
}

function isPowerOfTwo(n) { return n > 0 && (n & (n - 1)) === 0; }

// [Fase 2] JSON key sort (better compression)
function sortJsonKeys(obj) {
  if (Array.isArray(obj)) return obj.map(sortJsonKeys);
  if (obj && typeof obj === "object") {
    const sorted = {};
    for (const k of Object.keys(obj).sort()) sorted[k] = sortJsonKeys(obj[k]);
    return sorted;
  }
  return obj;
}

// [Fase 2] .lang minify
function minifyLang(text) {
  try {
    return text.split("\n")
      .map(l => l.trim())
      .filter(l => l && !l.startsWith("#"))
      .join("\n");
  } catch { return text; }
}

// [Fase 2] .bbmodel clean (Blockbench metadata)
function cleanBbmodel(text) {
  try {
    let obj = JSON.parse(text);
    const REMOVE_KEYS = ["__comment","_comment","author","credit","date_modified","resolution","ambientocclusion"];
    function clean(o) {
      if (!o || typeof o !== "object") return o;
      if (Array.isArray(o)) return o.map(clean);
      const out = {};
      for (const [k, v] of Object.entries(o)) {
        if (REMOVE_KEYS.includes(k)) continue;
        out[k] = clean(v);
      }
      return out;
    }
    return JSON.stringify(clean(obj));
  } catch { return text; }
}

function minifyShader(text) {
  try {
    return text.replace(/\/\/[^\n]*/g,"").replace(/\/\*[\s\S]*?\*\//g,"")
      .replace(/[ \t]+/g," ").replace(/\n\s*\n/g,"\n").trim();
  } catch { return text; }
}

function minifyProperties(text) {
  try {
    return text.split("\n").map(l=>l.trim()).filter(l=>l&&!l.startsWith("#")&&!l.startsWith("!")).join("\n");
  } catch { return text; }
}

function deepCleanJson(obj, lowerPath) {
  if(!obj||typeof obj!=="object") return obj;
  const SKIP=["__comment","_comment","//","comment","__credits","__author"];
  if(Array.isArray(obj)) return obj.map(i=>deepCleanJson(i,lowerPath));
  const out={};
  for(const [k,v] of Object.entries(obj)) {
    if(SKIP.includes(k)) continue;
    out[k]=deepCleanJson(v,lowerPath);
  }
  if(lowerPath.endsWith("sounds.json")) {
    for(const [k,v] of Object.entries(out)) {
      if(v&&typeof v==="object"&&Array.isArray(v.sounds)&&v.sounds.length===0) delete out[k];
    }
  }
  return out;
}

async function optimizeOggSafe(buffer) {
  try {
    const bytes=new Uint8Array(buffer),len=bytes.length;
    if(len<16) return {out:buffer,changed:false};
    let start=0,end=len,changed=false;
    if(len>=10&&bytes[0]===0x49&&bytes[1]===0x44&&bytes[2]===0x33) {
      const size=((bytes[6]&0x7f)<<21)|((bytes[7]&0x7f)<<14)|((bytes[8]&0x7f)<<7)|(bytes[9]&0x7f);
      const hl=10+size; if(hl<end){start=hl;changed=true;}
    }
    if(end-start>128){const tp=end-128;if(bytes[tp]===0x54&&bytes[tp+1]===0x41&&bytes[tp+2]===0x47){end=tp;changed=true;}}
    while(end>start&&bytes[end-1]===0x00){end--;changed=true;}
    if(!changed||end<=start) return {out:buffer,changed:false};
    const out=new Uint8Array(bytes.subarray(start,end));
    return {out:out.buffer,changed:true};
  } catch { return {out:buffer,changed:false}; }
}

async function buildPackIcon(file) {
  const buf=await file.arrayBuffer();
  const blob=new Blob([buf],{type:file.type||"image/png"});
  const img=await createImageBitmap(blob);
  const t=128,canvas=document.createElement("canvas");
  canvas.width=t;canvas.height=t;
  const ctx=canvas.getContext("2d");
  ctx.clearRect(0,0,t,t);
  const scale=Math.min(t/img.width,t/img.height,1);
  const dw=Math.round(img.width*scale),dh=Math.round(img.height*scale);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
  ctx.drawImage(img,Math.floor((t-dw)/2),Math.floor((t-dh)/2),dw,dh);
  const outBlob=await new Promise(r=>canvas.toBlob(b=>r(b||blob),"image/png",0.92));
  return outBlob.arrayBuffer();
}

async function sha1HexFromBlob(blob) {
  try {
    if(typeof window==="undefined"||!window.crypto?.subtle) return null;
    const hash=await window.crypto.subtle.digest("SHA-1",await blob.arrayBuffer());
    return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");
  } catch { return null; }
}

function triggerDownload(blob,name) {
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=name;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}

/* ─────────────────────────────────────────
   WORKER (Fase 2: tambah power-of-two)
───────────────────────────────────────── */
function makePngWorkerURL() {
  const code=`
    function cleanAlpha(d){let n=0;for(let i=0;i<d.length;i+=4){if(d[i+3]===0&&(d[i]||d[i+1]||d[i+2])){d[i]=d[i+1]=d[i+2]=0;n++;}}return n;}
    function isSingleColor(d){if(d.length<4)return false;const r=d[0],g=d[1],b=d[2],a=d[3];for(let i=4;i<d.length;i+=4){if(d[i]!==r||d[i+1]!==g||d[i+2]!==b||d[i+3]!==a)return false;}return true;}
    function nearestPow2(n){if(n<=0)return 1;let p=1;while(p<n)p<<=1;const l=p>>1;return(n-l<p-n)?l:p;}
    self.onmessage=async(ev)=>{
      const{id,buffer,w0,h0,tW,tH,smoothing,sizeGuard,doAlphaClean,doSingleColor,doPowerOfTwo}=ev.data||{};
      if(!buffer){self.postMessage({id,ok:true,out:buffer,changed:false});return;}
      try{
        const orig=buffer.byteLength||0;
        const bmp=await createImageBitmap(new Blob([buffer],{type:"image/png"}));
        if(doSingleColor&&w0>1&&h0>1){
          const cc=new OffscreenCanvas(w0,h0);cc.getContext("2d").drawImage(bmp,0,0);
          if(isSingleColor(cc.getContext("2d").getImageData(0,0,w0,h0).data)){
            const sc=new OffscreenCanvas(1,1);sc.getContext("2d").drawImage(bmp,0,0,1,1);
            const sb=await sc.convertToBlob({type:"image/png"});const sbuf=await sb.arrayBuffer();
            self.postMessage({id,ok:true,out:sbuf,changed:true,singleColor:true},[sbuf]);return;
          }
        }
        // Power-of-two snap (Fase 2)
        let finalW=tW,finalH=tH;
        if(doPowerOfTwo){
          const frames=(h0>w0&&Number.isInteger(h0/w0)&&h0/w0>=2)?h0/w0:null;
          if(frames){
            const frameH=tH/frames;
            finalW=nearestPow2(tW);
            finalH=finalW*frames;
          }else{
            finalW=nearestPow2(tW);
            finalH=nearestPow2(tH);
          }
        }
        const noResize=(finalW===w0&&finalH===h0);
        const canvas=new OffscreenCanvas(noResize?w0:finalW,noResize?h0:finalH);
        const ctx=canvas.getContext("2d");
        const nearest=smoothing==="nearest";
        ctx.imageSmoothingEnabled=!nearest;ctx.imageSmoothingQuality=nearest?"low":"high";
        ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(bmp,0,0,canvas.width,canvas.height);
        let alphaFixed=0;
        if(doAlphaClean){const id2=ctx.getImageData(0,0,canvas.width,canvas.height);alphaFixed=cleanAlpha(id2.data);if(alphaFixed>0)ctx.putImageData(id2,0,0);}
        const out=await(await canvas.convertToBlob({type:"image/png"})).arrayBuffer();
        if(sizeGuard&&!noResize&&out.byteLength>=orig&&alphaFixed===0){self.postMessage({id,ok:true,out:buffer,changed:false,guarded:true},[buffer]);return;}
        self.postMessage({id,ok:true,out,changed:(!noResize||alphaFixed>0),alphaFixed,finalW,finalH},[out]);
      }catch(e){
        try{self.postMessage({id,ok:false,error:String(e?.message||e),out:buffer,changed:false},[buffer]);}
        catch{self.postMessage({id,ok:false,error:String(e?.message||e),out:null,changed:false});}
      }
    };`;
  return URL.createObjectURL(new Blob([code],{type:"application/javascript"}));
}

function createWorkerPool(size) {
  const url=makePngWorkerURL(),workers=[],free=[],pending=new Map();
  let seq=0;
  function spawn(){
    const w=new Worker(url);
    w.onmessage=(ev)=>{const{id,...r}=ev.data||{};const cb=pending.get(id);if(cb){pending.delete(id);cb.resolve(r);}free.push(w);pump();};
    w.onerror=()=>{free.push(w);pump();};
    workers.push(w);free.push(w);
  }
  for(let i=0;i<size;i++) spawn();
  const queue=[];
  function pump(){while(free.length>0&&queue.length>0){const w=free.pop(),job=queue.shift();pending.set(job.id,job);w.postMessage(job.p,[job.p.buffer]);}}
  function runPngJob(payload){const id=++seq;return new Promise((resolve,reject)=>{queue.push({id,resolve,reject,p:{...payload,id,type:"png"}});pump();});}
  function destroy(){for(const w of workers)w.terminate();URL.revokeObjectURL(url);}
  return {runPngJob,destroy};
}

function computeTargetSize({w0,h0,policy,modeConfig}){
  const{scale,minSize,maxSize}=modeConfig;
  const frames=detectAnimatedStrip(w0,h0);
  const baseScale=Math.max(0.01,scale)*(policy.scaleMul||1.0);
  let tW=Math.round(w0*baseScale);
  const minAllowed=Math.max(minSize,policy.minSize||0);
  tW=Math.min(Math.max(tW,minAllowed),maxSize);
  let tH;
  if(frames||policy.enforceStrip){
    const fCount=frames||Math.max(1,Math.round(h0/w0));
    tH=tW*fCount;
    if(policy.maxHeight&&tH>policy.maxHeight){const fac=policy.maxHeight/tH;tW=Math.max(1,Math.round(tW*fac));tH=tW*fCount;}
  }else{
    let hScaled=Math.round(h0*baseScale);
    let maxSide=Math.max(tW,hScaled);
    if(maxSide>maxSize){const fac=maxSize/maxSide;tW=Math.round(tW*fac);hScaled=Math.round(hScaled*fac);}
    let minSide=Math.min(tW,hScaled);
    if(minSide<minAllowed){const fac=minAllowed/minSide;tW=Math.round(tW*fac);hScaled=Math.round(hScaled*fac);}
    tH=hScaled;
  }
  return {tW,tH,smoothing:policy.smoothing||(modeConfig.preservePixelArt?"nearest":"smooth")};
}

/* ─────────────────────────────────────────
   FASE 3: PACK ANALYZER
───────────────────────────────────────── */
async function analyzePackOnly(file, appendLog) {
  const results = {
    totalFiles: 0, totalSize: 0,
    pngCount: 0, pngSize: 0,
    jsonCount: 0, jsonSize: 0,
    oggCount: 0, oggSize: 0,
    shaderCount: 0, otherCount: 0,
    oversized: [], invalidJson: [], duplicates: [],
    missingTextures: [], emptyFiles: [],
    fileList: [],
  };

  appendLog("🔍 Memulai analisis pack...");
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter(e => !e.dir);
  const seenNames = new Map();

  for (const entry of entries) {
    const name = entry.name;
    const lower = name.toLowerCase();
    const buf = await entry.async("arraybuffer");
    const size = buf.byteLength;

    results.totalFiles++;
    results.totalSize += size;

    if (size === 0) { results.emptyFiles.push(name); continue; }

    // Duplicate detection
    const baseName = name.split("/").pop().toLowerCase();
    if (seenNames.has(baseName)) { results.duplicates.push({ a: seenNames.get(baseName), b: name }); }
    else seenNames.set(baseName, name);

    results.fileList.push({ name, size, type: lower.split(".").pop() });

    if (lower.endsWith(".png")) {
      results.pngCount++; results.pngSize += size;
      const sz = readPngIHDRSize(buf);
      if (sz && (sz.w > 512 || sz.h > 512)) results.oversized.push({ name, w: sz.w, h: sz.h, size });
    } else if (lower.endsWith(".json") || lower.endsWith(".mcmeta")) {
      results.jsonCount++; results.jsonSize += size;
      try { JSON.parse(new TextDecoder().decode(buf)); }
      catch { results.invalidJson.push(name); }
    } else if (lower.endsWith(".ogg")) {
      results.oggCount++; results.oggSize += size;
    } else if ([".fsh",".vsh",".glsl"].some(e=>lower.endsWith(e))) {
      results.shaderCount++;
    } else { results.otherCount++; }
  }

  appendLog(`✔ Analisis selesai: ${results.totalFiles} file, ${(results.totalSize/1e6).toFixed(2)} MB`);
  if (results.oversized.length > 0) appendLog(`⚠️ ${results.oversized.length} texture oversized (>512px)`);
  if (results.invalidJson.length > 0) appendLog(`⚠️ ${results.invalidJson.length} file JSON invalid`);
  if (results.duplicates.length > 0) appendLog(`⚠️ ${results.duplicates.length} filename duplikat terdeteksi`);
  if (results.emptyFiles.length > 0) appendLog(`⚠️ ${results.emptyFiles.length} file kosong (0 byte)`);

  return results;
}

/* ─────────────────────────────────────────
   LOG CLASSIFIER
───────────────────────────────────────── */
function classifyLog(msg) {
  const m=msg.toLowerCase();
  if(m.includes("error")||m.includes("gagal")||m.includes("invalid")) return "cl-err";
  if(m.includes("⚠️")||m.includes("warn")||m.includes("oversized")||m.includes("missing")) return "cl-warn";
  if(m.includes("selesai")||m.includes("✔")||m.includes("berhasil")||m.includes("download")||m.includes("✅")) return "cl-ok";
  if(m.includes("sha")||m.includes("eta")||m.includes("mode")||m.includes("scale")||m.includes("🔍")) return "cl-info";
  if(msg.startsWith("╔")||msg.startsWith("║")||msg.startsWith("╚")||msg.trim()==="") return "cl-dim";
  return "";
}

/* ─────────────────────────────────────────
   COMPONENTS
───────────────────────────────────────── */
function ProgressRing({pct,done,total,etaSec,beating}){
  const r=44,circ=2*Math.PI*r,offset=circ-(pct/100)*circ;
  return (
    <div className="progress-ring-wrap">
      <svg className="progress-ring-svg" width="108" height="108" viewBox="0 0 108 108">
        <circle className="ring-track" cx="54" cy="54" r={r} strokeWidth="8"/>
        <circle className={`ring-fill${beating?" beating":""}`} cx="54" cy="54" r={r} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}/>
      </svg>
      <div className="ring-info">
        <span className="ring-pct">{pct}%</span>
        <div className="ring-detail">{total>0?`${done} / ${total} file`:tr.progress_waiting}</div>
        {etaSec!=null&&etaSec>0&&<div className="ring-eta">⏱ ETA {etaSec}s</div>}
      </div>
    </div>
  );
}

function CheckItem({checked,onChange,label,desc,disabled}){
  return (
    <div className={`check-item${checked?" checked":""}`} onClick={()=>!disabled&&onChange(!checked)}>
      <div className="check-box">{checked&&<span className="check-tick">✓</span>}</div>
      <div><div className="check-label">{label}</div><div className="check-desc">{desc}</div></div>
    </div>
  );
}

function SummaryCard({label,value}){
  return (
    <div className="sum-card">
      <div className="sum-label">{label}</div>
      <div className="sum-val">{value}</div>
    </div>
  );
}

/* ─────────────────────────────────────────
   ANALYZER RESULT COMPONENT (Fase 3)
───────────────────────────────────────── */
function AnalyzerResult({data,tr=TRANSLATIONS.id}){
  const [activeTab, setActiveTab] = useState("overview");
  if(!data) return null;
  const topFiles = [...data.fileList].sort((a,b)=>b.size-a.size).slice(0,10);
  const fmt = n => n>=1e6?`${(n/1e6).toFixed(2)}MB`:n>=1e3?`${(n/1e3).toFixed(1)}KB`:`${n}B`;

  return (
    <div style={{marginTop:20}}>
      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {[["overview",tr.tab_overview],["files",tr.tab_files],["issues",tr.tab_issues]].map(([id,label])=>(
          <button key={id} onClick={()=>setActiveTab(id)}
            className={`tab-btn${activeTab===id?" on":""}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab==="overview"&&(
        <div>
          <div className="summary-grid" style={{marginBottom:16}}>
            <SummaryCard label={tr.analyzer_total} value={data.totalFiles}/>
            <SummaryCard label={tr.analyzer_size} value={fmt(data.totalSize)}/>
            <SummaryCard label="PNG" value={`${data.pngCount} (${fmt(data.pngSize)})`}/>
            <SummaryCard label="JSON" value={`${data.jsonCount} (${fmt(data.jsonSize)})`}/>
            <SummaryCard label="OGG" value={`${data.oggCount} (${fmt(data.oggSize)})`}/>
            <SummaryCard label="Shader" value={data.shaderCount}/>
          </div>
          {/* Distribution bar */}
          <div style={{background:"var(--surface2)",borderRadius:10,padding:16,border:"1px solid var(--border)"}}>
            <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Distribusi File</div>
            {[["PNG","var(--green)",data.pngSize],["JSON","var(--gold)",data.jsonSize],["OGG","var(--blue)",data.oggSize]].map(([label,color,size])=>(
              <div key={label} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
                  <span style={{color}}>{label}</span>
                  <span style={{color:"var(--text-dim)"}}>{data.totalSize>0?`${((size/data.totalSize)*100).toFixed(1)}%`:"-"}</span>
                </div>
                <div style={{height:6,background:"var(--surface3)",borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${data.totalSize>0?(size/data.totalSize)*100:0}%`,background:color,borderRadius:3,transition:"width 0.5s"}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab==="files"&&(
        <div style={{background:"var(--surface2)",borderRadius:10,overflow:"hidden",border:"1px solid var(--border)"}}>
          <div style={{padding:"10px 14px",background:"var(--surface3)",fontSize:11,color:"var(--text-muted)",display:"flex",justifyContent:"space-between"}}>
            <span>File</span><span>Ukuran</span>
          </div>
          {topFiles.map((f,i)=>(
            <div key={i} style={{padding:"10px 14px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
              <div style={{fontSize:11,fontFamily:"var(--font-mono)",color:"var(--text-dim)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{f.name}</div>
              <div style={{fontSize:11,color:"var(--green)",fontWeight:700,flexShrink:0,fontFamily:"var(--font-mono)"}}>{fmt(f.size)}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab==="issues"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {data.oversized.length>0&&(
            <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:10,padding:14}}>
              <div style={{color:"var(--gold)",fontWeight:700,fontSize:13,marginBottom:8}}>⚠️ Texture Oversized ({data.oversized.length})</div>
              {data.oversized.slice(0,5).map((f,i)=>(
                <div key={i} style={{fontSize:11,color:"var(--text-dim)",fontFamily:"var(--font-mono)",marginBottom:3}}>{f.name} — {f.w}×{f.h}</div>
              ))}
              {data.oversized.length>5&&<div style={{fontSize:11,color:"var(--text-muted)"}}>+{data.oversized.length-5} lagi...</div>}
            </div>
          )}
          {data.invalidJson.length>0&&(
            <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:10,padding:14}}>
              <div style={{color:"var(--red)",fontWeight:700,fontSize:13,marginBottom:8}}>❌ JSON Invalid ({data.invalidJson.length})</div>
              {data.invalidJson.slice(0,5).map((f,i)=>(
                <div key={i} style={{fontSize:11,color:"var(--text-dim)",fontFamily:"var(--font-mono)",marginBottom:3}}>{f}</div>
              ))}
            </div>
          )}
          {data.duplicates.length>0&&(
            <div style={{background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.2)",borderRadius:10,padding:14}}>
              <div style={{color:"var(--blue)",fontWeight:700,fontSize:13,marginBottom:8}}>🔄 Filename Duplikat ({data.duplicates.length})</div>
              {data.duplicates.slice(0,3).map((d,i)=>(
                <div key={i} style={{fontSize:11,color:"var(--text-dim)",fontFamily:"var(--font-mono)",marginBottom:4}}>
                  <div>{d.a}</div><div style={{color:"var(--text-muted)"}}>↳ {d.b}</div>
                </div>
              ))}
            </div>
          )}
          {data.emptyFiles.length>0&&(
            <div style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:10,padding:14}}>
              <div style={{color:"var(--red)",fontWeight:700,fontSize:13,marginBottom:8}}>🗑️ File Kosong ({data.emptyFiles.length})</div>
              {data.emptyFiles.slice(0,5).map((f,i)=>(
                <div key={i} style={{fontSize:11,color:"var(--text-dim)",fontFamily:"var(--font-mono)",marginBottom:3}}>{f}</div>
              ))}
            </div>
          )}
          {data.oversized.length===0&&data.invalidJson.length===0&&data.duplicates.length===0&&data.emptyFiles.length===0&&(
            <div style={{textAlign:"center",padding:"24px",color:"var(--green)",fontSize:14}}>{tr.analyzer_no_issues}</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   FASE 4: BADGE GENERATOR
───────────────────────────────────────── */
function BadgeGenerator(){
  const [style, setStyle] = useState("flat");
  const [color, setColor] = useState("22c55e");
  const badges = [
    `https://img.shields.io/badge/Optimized_with-Ghaizers2.0-${color}?style=${style}&logo=minecraft`,
    `https://img.shields.io/badge/Pack_Optimizer-Ghaizers2.0-${color}?style=${style}`,
    `https://img.shields.io/badge/🎮_Optimized-Ghaizers.ghaa.my.id-${color}?style=${style}`,
  ];
  return (
    <div>
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <div>
          <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:4}}>Style</div>
          <select value={style} onChange={e=>setStyle(e.target.value)}
            className="badge-select">
            {["flat","flat-square","for-the-badge","plastic","social"].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:4}}>Color (hex)</div>
          <input value={color} onChange={e=>setColor(e.target.value.replace("#",""))}
            className="badge-input"
            maxLength={6} placeholder="22c55e"/>
        </div>
      </div>
      {badges.map((url,i)=>(
        <div key={i} style={{background:"var(--surface2)",borderRadius:10,padding:14,marginBottom:10,border:"1px solid var(--border)"}}>
          <img src={url} alt="badge" style={{height:24,marginBottom:10,display:"block"}} onError={e=>e.target.style.opacity="0.3"}/>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <code style={{fontSize:10,flex:1,wordBreak:"break-all",color:"var(--text-dim)"}}>{url}</code>
            <button onClick={()=>navigator.clipboard?.writeText(`![Optimized with Ghaizers](${url})`)}
              className="pill" style={{fontSize:10,padding:"3px 10px",flexShrink:0}}>
              Copy MD
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   FASE 4: SHARE RESULTS
───────────────────────────────────────── */
function ShareResults({summary}){
  if(!summary) return null;
  const savings = (((summary.originalSize-summary.optimizedSize)/summary.originalSize)*100).toFixed(1);
  const text = `✨ Resource pack Minecraft aku berhasil dioptimasi ${savings}% lebih kecil!\n${(summary.originalSize/1e6).toFixed(2)}MB → ${(summary.optimizedSize/1e6).toFixed(2)}MB\nPake tool gratis Ghaizers2.0 → optimizer.ghaa.my.id`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  return (
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:16}}>
      <a href={waUrl} target="_blank" rel="noopener noreferrer">
        <button className="pill" style={{background:"rgba(37,211,102,0.15)",borderColor:"rgba(37,211,102,0.4)",color:"#25d366"}}>
          📱 Share WhatsApp
        </button>
      </a>
      <a href={twUrl} target="_blank" rel="noopener noreferrer">
        <button className="pill" style={{background:"rgba(29,161,242,0.15)",borderColor:"rgba(29,161,242,0.4)",color:"#1da1f2"}}>
          🐦 Share Twitter/X
        </button>
      </a>
      <button className="pill" onClick={()=>navigator.clipboard?.writeText(text)}>
        📋 Copy Teks
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   FASE 4: PAGES (Docs, FAQ, Changelog)
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
  { version:"v2.0", date:"2025", changes:["Hero section & landing page baru","Drag & Drop zone dengan animasi","Progress ring SVG animated","Console dengan syntax highlighting & filter","Pack Analyzer (scan tanpa optimize)","Power-of-two enforcement (Fase 2)","JSON key sorting untuk better compression",".lang & .bbmodel support","System file auto-skip (.DS_Store, Thumbs.db)","Preset system (Pojav Lite, Server Pack, dll)","Diff view & share hasil","Badge generator","Halaman FAQ & Changelog"] },
  { version:"v1.x", date:"2024", changes:["Alpha pixel cleanup","Single-color detection → 1×1","Deep JSON clean","OGG safe strip","Shader/properties minify","Web Workers multi-thread","Pojav Log Auto-Fix","SHA-1 verification","SEO (sitemap, robots.txt, meta tags)"] },
];

function DocsPage({tr=TRANSLATIONS.id}){
  return (
    <div style={{maxWidth:720,margin:"0 auto",padding:"24px 0"}}>
      <h2 className="page-h2">{tr.docs_title}</h2>
      {[
        {title:"🖼️ PNG Optimization",content:"Ghaizers menggunakan beberapa teknik untuk PNG:\n\n• Smart Resize: Scale texture berdasarkan mode yang dipilih, dengan kategori policy per folder (GUI, font, entity, particle)\n• Alpha Pixel Cleanup: Zero-out RGB pada pixel fully transparent (alpha=0). Tidak ada perubahan visual, tapi entropy PNG turun dan ZIP menjadi lebih kecil\n• Single-Color Detection: Deteksi PNG yang semua pixelnya identik warna → resize ke 1×1px\n• Power-of-Two: Snap ukuran ke dimensi 2^n terdekat (16,32,64...) untuk GPU efficiency\n• Size Guard: Jika hasil resize lebih besar dari original, file asli digunakan"},
        {title:"📄 JSON Optimization",content:"• JSON Minify: Hapus semua whitespace dan newline yang tidak diperlukan Minecraft\n• Deep Clean: Hapus field comment (__comment, _comment, //) yang dibuat Blockbench dan tool lain\n• Key Sorting: Sort keys alphabetically untuk better DEFLATE compression\n• Sounds.json: Hapus entry dengan array sounds kosong\n• .mcmeta: Edit langsung di interface, credit ghaa otomatis diinjeksi"},
        {title:"🔊 OGG Optimization",content:"OGG optimization di Ghaizers adalah 100% lossless:\n• Strip ID3 header (metadata ID3v2 di awal file)\n• Strip ID3v1 tag (128 bytes di akhir file)\n• Trim null padding\n\nKualitas audio dijamin sama persis karena tidak ada re-encoding."},
        {title:"⚡ Web Workers",content:"Resize PNG adalah operasi CPU-intensive. Tanpa Workers, browser akan freeze.\n\nGhaizers membuat worker pool dengan ukuran: Math.floor(hardwareConcurrency/2), minimum 2, maximum 4.\n\nSetiap worker menggunakan OffscreenCanvas API untuk resize tanpa block main thread. Buffer dikirim sebagai Transferable Objects (zero-copy)."},
        {title:"🎮 Pojav Log Auto-Fix",content:"Upload file latestlog.txt dari Pojav Launcher. Ghaizers akan:\n• Parse log untuk menemukan error 'size X is not multiple of frame size'\n• Extract nama file PNG yang bermasalah\n• Otomatis set enforce-strip untuk file tersebut saat optimize\n\nIni memperbaiki masalah texture animated yang tidak valid untuk Pojav."},
      ].map(({title,content})=>(
        <div key={title} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:20,marginBottom:12}}>
          <h3 style={{fontSize:14,fontWeight:700,marginBottom:12,color:"var(--text)"}}>{title}</h3>
          <div style={{fontSize:13,color:"var(--text-dim)",lineHeight:1.8,whiteSpace:"pre-line"}}>{content}</div>
        </div>
      ))}
    </div>
  );
}

function FaqPage({tr=TRANSLATIONS.id}){
  const [open, setOpen] = useState(null);
  return (
    <div style={{maxWidth:720,margin:"0 auto",padding:"24px 0"}}>
      <h2 className="page-h2">{tr.faq_title}</h2>
      {FAQ_DATA.map((item,i)=>(
        <div key={i} style={{background:"var(--card)",border:`1px solid ${open===i?"var(--border-bright)":"var(--border)"}`,borderRadius:12,marginBottom:8,overflow:"hidden",transition:"border-color 0.2s"}}>
          <div onClick={()=>setOpen(open===i?null:i)}
            style={{padding:"16px 20px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
            <div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>{item.q}</div>
            <div style={{color:"var(--green)",fontSize:18,transform:open===i?"rotate(180deg)":"none",transition:"0.2s",flexShrink:0}}>▾</div>
          </div>
          {open===i&&(
            <div style={{padding:"0 20px 16px",fontSize:13,color:"var(--text-dim)",lineHeight:1.7,borderTop:"1px solid var(--border)"}}>
              <div style={{paddingTop:12}}>{item.a}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ChangelogPage({tr=TRANSLATIONS.id}){
  return (
    <div style={{maxWidth:720,margin:"0 auto",padding:"24px 0"}}>
      <h2 className="page-h2">{tr.changelog_title}</h2>
      {CHANGELOG_DATA.map((entry)=>(
        <div key={entry.version} style={{marginBottom:24}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <span style={{fontFamily:"var(--font-pixel)",fontSize:12,color:"var(--green)",background:"rgba(34,197,94,0.1)",padding:"6px 14px",borderRadius:20,border:"1px solid rgba(34,197,94,0.3)"}}>{entry.version}</span>
            <span style={{fontSize:12,color:"var(--text-muted)"}}>{entry.date}</span>
          </div>
          <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"16px 20px"}}>
            {entry.changes.map((c,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8,fontSize:13,color:"var(--text-dim)"}}>
                <span style={{color:"var(--green)",flexShrink:0,marginTop:2}}>+</span>
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function Home() {
  // page routing (Fase 4)
  const [currentPage, setCurrentPage] = useState("home");

  // i18n
  const [lang, setLang] = useState("id");
  const tr = TRANSLATIONS[lang];
  useEffect(() => { setLang(detectLanguage()); }, []);
  const toggleLang = () => setLang(l => l === "id" ? "en" : "id");

  // optimizer settings
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

  // files
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [iconFile, setIconFile] = useState(null);
  const [iconBuffer, setIconBuffer] = useState(null); // fix: read immediately on select
  const [mcmetaText, setMcmetaText] = useState("");
  const [mcmetaLoaded, setMcmetaLoaded] = useState(false);
  const [mcmetaError, setMcmetaError] = useState("");
  const [dynamicStripPaths, setDynamicStripPaths] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // process
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzerResult, setAnalyzerResult] = useState(null);
  const [progress, setProgress] = useState({ done:0, total:0, etaSec:null });
  const [summary, setSummary] = useState(null);

  // console
  const [logs, setLogs] = useState([]);
  const [consoleFilter, setConsoleFilter] = useState("ALL");
  const logRef = useRef(null);
  const logBufferRef = useRef([]);
  const flushTimerRef = useRef(null);

  const computedWorkerCount = useMemo(()=>{
    const hc=typeof navigator!=="undefined"?navigator.hardwareConcurrency||4:4;
    return workerCount>0?workerCount:Math.max(2,Math.min(4,Math.floor(hc/2)||2));
  },[workerCount]);

  const progressPct = progress.total>0?Math.round((progress.done/progress.total)*100):0;

  const flushLogs = useCallback(()=>{
    const buf=logBufferRef.current;
    if(!buf.length) return;
    setLogs(prev=>[...prev,...buf.splice(0,buf.length)]);
    setTimeout(()=>{if(logRef.current)logRef.current.scrollTop=logRef.current.scrollHeight;},10);
  },[]);

  const appendLog = useCallback((msg)=>{
    const time=new Date().toLocaleTimeString();
    logBufferRef.current.push(`[${time}] ${msg}`);
    if(!flushTimerRef.current){flushTimerRef.current=setTimeout(()=>{flushTimerRef.current=null;flushLogs();},200);}
  },[flushLogs]);

  useEffect(()=>()=>{if(flushTimerRef.current)clearTimeout(flushTimerRef.current);},[]);

  const filteredLogs = useMemo(()=>{
    if(consoleFilter==="ALL") return logs;
    const map={PNG:"png",OGG:"ogg",JSON:"json",WARN:"warn"};
    const kw=map[consoleFilter]||"";
    return logs.filter(l=>l.toLowerCase().includes(kw));
  },[logs,consoleFilter]);

  // Load preset (Fase 2)
  const applyPreset = useCallback((key)=>{
    const p=DEFAULT_PRESETS[key];
    if(!p) return;
    setMode(p.mode); setResolutionPercent(p.resolutionPercent);
    setZipCompressionLevel(p.zipCompressionLevel);
    setPreservePixelArt(p.preservePixelArt); setOptimizeOgg(p.optimizeOgg);
    setDoAlphaClean(p.doAlphaClean); setDoSingleColor(p.doSingleColor);
    setDoDeepCleanJson(p.doDeepCleanJson); setDoShaderMinify(p.doShaderMinify);
    setDoPowerOfTwo(p.doPowerOfTwo); setDoJsonKeySort(p.doJsonKeySort);
    setDoLangMinify(p.doLangMinify);
    appendLog(`✔ Preset "${p.label}" diterapkan.`);
  },[appendLog]);

  const handleFile = useCallback(async(f)=>{
    if(!f) return;
    setFile(f); setFileName(f.name); setSummary(null); setAnalyzerResult(null);
    setLogs([]); logBufferRef.current=[];
    setProgress({done:0,total:0,etaSec:null});
    setMcmetaText(""); setMcmetaLoaded(false); setMcmetaError("");
    appendLog(`File diterima: ${f.name} (${(f.size/1e6).toFixed(2)} MB)`);
    try {
      const zip=await JSZip.loadAsync(f);
      const e=Object.values(zip.files).find(e=>e.name.toLowerCase()==="pack.mcmeta");
      if(!e){appendLog("pack.mcmeta tidak ditemukan.");return;}
      const text=await e.async("string");
      setMcmetaText(text);setMcmetaLoaded(true);appendLog("pack.mcmeta dibaca ✔");
    } catch(err){setMcmetaError("Gagal membaca pack.mcmeta");appendLog("ERROR mcmeta: "+err.message);}
  },[appendLog]);

  const onDrop=useCallback((e)=>{e.preventDefault();setIsDragOver(false);const f=e.dataTransfer.files?.[0];if(f&&f.name.endsWith(".zip"))handleFile(f);},[handleFile]);
  const onDragOver=useCallback((e)=>{e.preventDefault();setIsDragOver(true);},[]);
  const onDragLeave=useCallback(()=>setIsDragOver(false),[]);

  // Fase 3: Analyze only
  const handleAnalyze = async()=>{
    if(!file||isAnalyzing||isProcessing) return;
    setIsAnalyzing(true); setAnalyzerResult(null);
    setLogs([]); logBufferRef.current=[];
    try {
      const result=await analyzePackOnly(file,appendLog);
      setAnalyzerResult(result); flushLogs();
    } catch(e){appendLog("ERROR analyze: "+e.message);flushLogs();}
    finally{setIsAnalyzing(false);}
  };

  const handleOptimize = async()=>{
    if(!file||isProcessing) return;
    const baseMode=MODES[mode];
    const effectiveScale=baseMode.scale*(resolutionPercent/100);
    const modeConfig={...baseMode,scale:effectiveScale,preservePixelArt};

    CREDIT_BANNER.forEach(l=>appendLog(l));
    appendLog(" ");
    appendLog(`Mode: ${baseMode.label} | Scale: ${(effectiveScale*100).toFixed(0)}%`);
    appendLog(`Workers: ${computedWorkerCount} | ZIP Lv: ${zipCompressionLevel}`);
    appendLog(`Alpha:${doAlphaClean?"✔":"✘"} 1Color:${doSingleColor?"✔":"✘"} Pow2:${doPowerOfTwo?"✔":"✘"} JSONSort:${doJsonKeySort?"✔":"✘"}`);

    setIsProcessing(true); setSummary(null); setAnalyzerResult(null);
    setProgress({done:0,total:0,etaSec:null});
    const pool=createWorkerPool(computedWorkerCount);
    const t0=performance.now();

    try {
      const zip=await JSZip.loadAsync(file);
      appendLog("ZIP berhasil dibaca.");
      const outZip=new JSZip();
      const entries=Object.values(zip.files);
      const stats={totalFiles:0,pngCount:0,pngOptimized:0,pngSkippedByIHDR:0,pngSingleColor:0,pngAlphaCleaned:0,pngPowerOfTwo:0,jsonCount:0,jsonMinified:0,jsonDeepCleaned:0,jsonKeySorted:0,removed:0,oggCount:0,oggOptimized:0,shaderCount:0,shaderMinified:0,langCount:0,bbmodelCount:0,oversizedWarnings:0};
      const totalToProcess=entries.filter(e=>!e.dir).length;
      setProgress({done:0,total:totalToProcess,etaSec:null});
      let done=0;
      const tick=()=>{
        done++;
        const elapsed=(performance.now()-t0)/1000;
        const rate=done/Math.max(0.001,elapsed);
        const left=Math.max(0,totalToProcess-done);
        if(done%15===0||done===totalToProcess) setProgress({done,total:totalToProcess,etaSec:rate>0?Math.round(left/rate):null});
      };

      for(const entry of entries){
        if(entry.dir){outZip.folder(entry.name);continue;}
        const name=entry.name,lower=name.toLowerCase();
        stats.totalFiles++;

        // System file & exclusion
        if(shouldExcludeNonGameFile(lower,name)){stats.removed++;appendLog(`Dibuang: ${name}`);tick();continue;}

        // Shader
        if([".fsh",".vsh",".glsl"].some(e=>lower.endsWith(e))){
          stats.shaderCount++;
          if(doShaderMinify){const txt=await entry.async("string");const min=minifyShader(txt);outZip.file(name,min.length<txt.length?min:txt);if(min.length<txt.length)stats.shaderMinified++;}
          else outZip.file(name,await entry.async("arraybuffer"));
          tick();continue;
        }

        // Properties
        if(lower.endsWith(".properties")){
          outZip.file(name,doShaderMinify?minifyProperties(await entry.async("string")):await entry.async("arraybuffer"));
          tick();continue;
        }

        // [Fase 2] .lang
        if(lower.endsWith(".lang")){
          stats.langCount++;
          if(doLangMinify){outZip.file(name,minifyLang(await entry.async("string")));}
          else outZip.file(name,await entry.async("arraybuffer"));
          tick();continue;
        }

        // [Fase 2] .bbmodel
        if(lower.endsWith(".bbmodel")){
          stats.bbmodelCount++;
          const txt=await entry.async("string");
          outZip.file(name,cleanBbmodel(txt));
          tick();continue;
        }

        // pack.mcmeta
        if(lower==="pack.mcmeta"){
          stats.jsonCount++;
          const orig=await entry.async("string");
          let toWrite=(mcmetaLoaded&&mcmetaText.trim())?mcmetaText:orig;
          try{
            let obj=JSON.parse(toWrite);
            if(doDeepCleanJson) obj=deepCleanJson(obj,lower);
            if(doJsonKeySort) obj=sortJsonKeys(obj);
            const desc=obj?.pack?.description||"";
            obj.pack=obj.pack||{};
            obj.pack._credit="© ghaa (KhaizenNomazen) | Ghaizers2.0 | GRATIS | Dilarang dijual!";
            obj.pack._legal="UU Hak Cipta No.28/2014";
            obj.pack._source="github.com/KhaizenNomazen";
            if(typeof desc==="string"&&!desc.includes("ghaa")) obj.pack.description=desc?`${desc} §7| §cOptimized by §aghaa`:CREDIT_MCMETA_DESC;
            outZip.file(name,modeConfig.minifyJson?JSON.stringify(obj):JSON.stringify(obj,null,2));
            stats.jsonMinified++;appendLog("pack.mcmeta: credit injected ✔");
          }catch{outZip.file(name,toWrite);}
          tick();continue;
        }

        // OGG
        if(lower.endsWith(".ogg")){
          stats.oggCount++;
          const buf=await entry.async("arraybuffer");
          if(optimizeOgg){const{out,changed}=await optimizeOggSafe(buf);if(changed){stats.oggOptimized++;appendLog(`OGG: ${name}`);}outZip.file(name,out);}
          else outZip.file(name,buf);
          tick();continue;
        }

        // PNG
        if(lower.endsWith(".png")){
          stats.pngCount++;
          const policy=getPolicyForPath(lower,dynamicStripPaths);
          if(!preservePixelArt&&policy.smoothing==="nearest") policy.smoothing="smooth";
          if(policy.skip||policy.skipResize){outZip.file(name,await entry.async("arraybuffer"));tick();continue;}
          const buf=await entry.async("arraybuffer");
          if(buf.byteLength<2048){outZip.file(name,buf);stats.pngSkippedByIHDR++;tick();continue;}
          const sz=readPngIHDRSize(buf);
          if(!sz){outZip.file(name,buf);tick();continue;}
          const{w:w0,h:h0}=sz;
          if(w0>1024||h0>1024){stats.oversizedWarnings++;appendLog(`⚠️ Oversized: ${name} (${w0}×${h0})`);}
          // [Fase 2] warn if not power of two
          if(doPowerOfTwo&&!isPowerOfTwo(w0)) appendLog(`Pow2: ${name} (${w0}→${nearestPowerOfTwo(w0)})`);
          const{tW,tH,smoothing}=computeTargetSize({w0,h0,policy,modeConfig});
          const res=await pool.runPngJob({buffer:buf,w0,h0,tW,tH,smoothing,sizeGuard:true,doAlphaClean,doSingleColor,doPowerOfTwo});
          if(res?.singleColor){stats.pngSingleColor++;stats.pngOptimized++;appendLog(`1×1: ${name}`);}
          else if(res?.changed){
            stats.pngOptimized++;
            if(res.alphaFixed>0) stats.pngAlphaCleaned++;
            if(doPowerOfTwo&&res.finalW&&(res.finalW!==w0||res.finalH!==h0)) stats.pngPowerOfTwo++;
            if(tW!==w0||tH!==h0) appendLog(`PNG: ${name} (${w0}×${h0}→${res.finalW||tW}×${res.finalH||tH})`);
            else if(res.alphaFixed>0) appendLog(`Alpha: ${name}`);
          }
          outZip.file(name,res?.out||buf);tick();continue;
        }

        // JSON
        if(lower.endsWith(".json")||lower.endsWith(".mcmeta")){
          stats.jsonCount++;
          const txt=await entry.async("string");
          if(modeConfig.minifyJson){
            try{
              let obj=JSON.parse(txt);
              if(doDeepCleanJson){const b=JSON.stringify(obj).length;obj=deepCleanJson(obj,lower);if(JSON.stringify(obj).length<b)stats.jsonDeepCleaned++;}
              if(doJsonKeySort){const b=JSON.stringify(obj);obj=sortJsonKeys(obj);if(JSON.stringify(obj)!==b)stats.jsonKeySorted++;}
              outZip.file(name,JSON.stringify(obj));stats.jsonMinified++;
            }catch{outZip.file(name,txt);}
          }else outZip.file(name,txt);
          tick();continue;
        }

        outZip.file(name,await entry.async("arraybuffer"));tick();
      }

      outZip.file("GHAIZERS_CREDIT.txt",CREDIT_TXT);
      outZip.file("JANGAN_BAYAR_INI.txt","⚠️ Tool Ghaizers2.0 ini GRATIS!\nJika kamu membayar → kamu DITIPU!\nLapor: github.com/KhaizenNomazen\nMenjual = UU Hak Cipta No.28/2014");
      appendLog("Credit injected ✔");
      if(iconBuffer){appendLog("Override pack.png...");outZip.file("pack.png",iconBuffer);} else if(iconFile){appendLog("Override pack.png...");outZip.file("pack.png",await buildPackIcon(iconFile));}
      appendLog("Menyusun ZIP...");
      const blob=await outZip.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:Math.max(1,Math.min(9,zipCompressionLevel))},comment:"Optimized by Ghaizers2.0 | (c) ghaa | GRATIS | github.com/KhaizenNomazen"});
      const sha1=await sha1HexFromBlob(blob);
      if(sha1)appendLog(`SHA-1: ${sha1}`);
      appendLog("Selesai ✔ Download dimulai...");
      triggerDownload(blob,"optimize_file.zip");
      setSummary({...stats,originalSize:file.size,optimizedSize:blob.size,sha1:sha1||null,workers:computedWorkerCount,compressionLevel:zipCompressionLevel});
      flushLogs();
      setProgress({done:totalToProcess,total:totalToProcess,etaSec:0});
    }catch(e){appendLog("ERROR: "+e.message);flushLogs();}
    finally{pool.destroy();setIsProcessing(false);}
  };

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <>
      <Head>
        <title>{lang==="en"?"Minecraft Resource Pack Optimizer Free – Ghaizers2.0":"Minecraft Resource Pack Optimizer Gratis – Ghaizers2.0"}</title>
        <meta name="description" content={lang==="en"?"Optimize your Minecraft resource pack for free. Compress PNG, JSON, OGG without quality loss. Perfect for Pojav, low-end devices, Bedrock. 100% client-side.":"Optimize resource pack Minecraft gratis. Kompres PNG, JSON, OGG tanpa kehilangan kualitas. Cocok Pojav, HP low-end, Bedrock. 100% client-side."} />
        <meta name="keywords" content="optimize resource pack minecraft, minecraft pack optimizer, kompres texture pack, pojav launcher resource pack ringan, ghaizers" />
        <meta property="og:type" content="website"/>
        <meta property="og:url" content="https://optimizer.ghaa.my.id"/>
        <meta property="og:title" content="Minecraft Resource Pack Optimizer Gratis – Ghaizers2.0"/>
        <meta property="og:description" content="Tool gratis optimize resource pack Minecraft. PNG, JSON, OGG. Cocok Pojav & low-end."/>
        <meta name="robots" content="index, follow"/>
        <link rel="canonical" href="https://optimizer.ghaa.my.id"/>
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({"@context":"https://schema.org","@type":"WebApplication","name":"Ghaizers2.0","url":"https://optimizer.ghaa.my.id","description":"Tool gratis optimize resource pack Minecraft","applicationCategory":"UtilitiesApplication","operatingSystem":"Any","offers":{"@type":"Offer","price":"0","priceCurrency":"IDR"},"author":{"@type":"Person","name":"ghaa (KhaizenNomazen)","url":"https://github.com/KhaizenNomazen"}})}}/>
      </Head>

      {/* Background */}
      <div className="bg-root">
        <div className="bg-mesh"/><div className="bg-grid"/><div className="bg-scanlines"/>
        <div className="orb orb-1"/><div className="orb orb-2"/><div className="orb orb-3"/>
      </div>

      <div className="page-root">
        {/* Watermark */}
        <div className="watermark-bar">
          {tr.watermark} &nbsp;|&nbsp;
          <a href="https://github.com/KhaizenNomazen" target="_blank" rel="noopener noreferrer">github.com/KhaizenNomazen</a>
        </div>

        {/* Navbar */}
        <nav className="navbar">
          <div className="navbar-logo" onClick={()=>setCurrentPage("home")}>
            <div className="navbar-logo-mark">G</div>
            GHAIZERS
          </div>
          <div className="navbar-links">
            {[["home","🏠"],["docs","📚 Docs"],["faq","❓ FAQ"],["changelog","📋 Log"]].map(([page,label])=>(
              <button key={page} className={`navbar-link${currentPage===page?" active":""}`}
                onClick={()=>setCurrentPage(page)}
                style={currentPage===page?{color:"var(--green)",background:"var(--green-glow)"}:{}}>
                {label}
              </button>
            ))}
            <a href="https://github.com/KhaizenNomazen" target="_blank" rel="noopener noreferrer" className="navbar-link">GitHub</a>
            <button onClick={toggleLang}
              style={{padding:"5px 12px",borderRadius:20,border:"1px solid rgba(45,212,191,0.25)",
                background:"rgba(45,212,191,0.08)",color:"var(--teal)",fontSize:12,
                fontWeight:700,cursor:"pointer",fontFamily:"var(--f-mono)",
                letterSpacing:"0.5px",transition:"all 0.2s",marginRight:4}}
              title={lang==="id"?"Switch to English":"Ganti ke Indonesia"}>
              {lang==="id"?"🇮🇩 ID":"🇬🇧 EN"}
            </button>
            <span className="navbar-version">v2.0</span>
          </div>
        </nav>

        {/* ── DOCS PAGE ── */}
        {currentPage==="docs"&&(
          <div className="optimizer-wrap"><DocsPage tr={tr}/></div>
        )}

        {/* ── FAQ PAGE ── */}
        {currentPage==="faq"&&(
          <div className="optimizer-wrap"><FaqPage tr={tr}/></div>
        )}

        {/* ── CHANGELOG PAGE ── */}
        {currentPage==="changelog"&&(
          <div className="optimizer-wrap"><ChangelogPage tr={tr}/></div>
        )}

        {/* ── HOME PAGE ── */}
        {currentPage==="home"&&(<>

          {/* Hero */}
          <section className="hero">
            <div className="hero-eyebrow">{tr.hero_eyebrow}</div>
            <h1 className="hero-h1">
              {tr.hero_title_1} <span className="accent">{tr.hero_title_accent}</span><br/>
              {tr.hero_title_2} <span className="gold">{tr.hero_title_gold}</span>
            </h1>
            <p className="hero-sub">{tr.hero_sub}</p>
            <div className="hero-actions">
              <button className="btn-primary" onClick={()=>document.getElementById("optimizer-start")?.scrollIntoView({behavior:"smooth"})}>{tr.hero_cta}</button>
              <button className="btn-secondary" onClick={()=>setCurrentPage("docs")}>{tr.hero_docs}</button>
            </div>
            <div className="hero-stats">
              {[["100%",tr.hero_stat_1],["0 MB",tr.hero_stat_2],["SHA-1",tr.hero_stat_3],["FREE",tr.hero_stat_4]].map(([v,l])=>(
                <div className="hero-stat" key={l}>
                  <span className="hero-stat-val">{v}</span>
                  <span className="hero-stat-lbl">{l}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Feature Cards */}
          <div className="feature-strip">
            {[
              ["🖼️",tr.feat_1_title,tr.feat_1_desc],
              ["✨",tr.feat_2_title,tr.feat_2_desc],
              ["🎨",tr.feat_3_title,tr.feat_3_desc],
              ["📄",tr.feat_4_title,tr.feat_4_desc],
              ["🔊",tr.feat_5_title,tr.feat_5_desc],
              ["⚡",tr.feat_6_title,tr.feat_6_desc],
              ["🔍",tr.feat_7_title,tr.feat_7_desc],
              ["🏷️",tr.feat_8_title,tr.feat_8_desc],
            ].map(([icon,title,desc])=>(
              <div className="feature-card" key={title}>
                <span className="feature-card-icon">{icon}</span>
                <div className="feature-card-title">{title}</div>
                <div className="feature-card-desc">{desc}</div>
              </div>
            ))}
          </div>

          {/* ── OPTIMIZER ── */}
          <div className="optimizer-wrap" id="optimizer-start">

            {/* 1. Upload */}
            <div className="glass-section">
              <div className="sec-header">
                <div className="sec-num">1</div>
                <div><div className="sec-title">{tr.sec_upload_title}</div><div className="sec-sub">{tr.sec_upload_sub}</div></div>
              </div>
              <input type="file" accept=".zip" id="inputFile" className="hidden-input" disabled={isProcessing||isAnalyzing}
                onChange={e=>handleFile(e.target.files?.[0])}/>
              <label htmlFor="inputFile"
                className={`dropzone${isDragOver?" drag-over":""}${file?" has-file":""}`}
                onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}>
                <span className="drop-icon">{file?"📦":"⬆️"}</span>
                {file?(<><div className="drop-filename">{fileName}</div><div className="drop-filesize">{(file.size/1e6).toFixed(2)} MB · Klik untuk ganti</div></>)
                     :(<><div className="drop-title">{tr.sec_upload_drop_title}</div><div className="drop-sub">{tr.sec_upload_drop_sub}</div></>)}
              </label>
            </div>

            {/* 2. Preset (Fase 2) */}
            <div className="glass-section">
              <div className="sec-header">
                <div className="sec-num">2</div>
                <div><div className="sec-title">{tr.sec_preset_title}</div><div className="sec-sub">{tr.sec_preset_sub}</div></div>
              </div>
              <div className="pill-row">
                {Object.entries(DEFAULT_PRESETS).map(([key,p])=>(
                  <button key={key} className="pill" disabled={isProcessing||isAnalyzing} onClick={()=>applyPreset(key)}
                    style={{padding:"10px 16px",fontSize:12,fontWeight:600}}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Mode */}
            <div className="glass-section">
              <div className="sec-header">
                <div className="sec-num">3</div>
                <div><div className="sec-title">{tr.sec_mode_title}</div><div className="sec-sub">{tr.sec_mode_sub}</div></div>
              </div>
              <div className="mode-grid">
                {Object.values(MODES).map(m=>(
                  <button key={m.id} className={`mode-card${mode===m.id?" active":""}`}
                    disabled={isProcessing||isAnalyzing} onClick={()=>setMode(m.id)}>
                    <div className="mode-card-head">
                      <span className="mode-card-name">{m.emoji} {m.label}</span>
                      {mode===m.id&&<span className="mode-card-dot"/>}
                    </div>
                    <p className="mode-card-desc">{m.id==="normal"?tr.mode_normal_desc:m.id==="extreme"?tr.mode_extreme_desc:tr.mode_ultra_desc}</p>
                    <div className="mode-card-tags">
                      <span className="mode-tag">Scale {Math.round(m.scale*100)}%</span>
                      <span className="mode-tag">Max {m.maxSize}px</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Fine-tune */}
            <div className="glass-section">
              <div className="sec-header">
                <div className="sec-num">4</div>
                <div><div className="sec-title">{tr.sec_resolution_title}</div><div className="sec-sub">{tr.sec_resolution_sub}</div></div>
              </div>
              <div className="slider-row">
                <input type="range" min="40" max="120" value={resolutionPercent}
                  onChange={e=>setResolutionPercent(Number(e.target.value))}
                  className="slider" disabled={isProcessing||isAnalyzing}
                  style={{"--value":`${((resolutionPercent-40)/80)*100}%`}}/>
                <div className="slider-val">{resolutionPercent}%</div>
              </div>
              <div className="pill-row">
                {[40,60,80,100,120].map(v=>(
                  <button key={v} className="pill" disabled={isProcessing||isAnalyzing} onClick={()=>setResolutionPercent(v)}>{v}%</button>
                ))}
              </div>
            </div>

            {/* 5. Opsi */}
            <div className="glass-section">
              <div className="sec-header">
                <div className="sec-num">5</div>
                <div><div className="sec-title">{tr.sec_options_title}</div><div className="sec-sub">{tr.sec_options_sub}</div></div>
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
                <div className="sec-num">6</div>
                <div><div className="sec-title">{tr.sec_advanced_title}</div></div>
              </div>
              <div style={{marginBottom:24}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:10,color:"var(--t2)"}}>{tr.zip_level}</div>
                <div className="slider-row">
                  <input type="range" min="1" max="9" value={zipCompressionLevel}
                    onChange={e=>setZipCompressionLevel(Number(e.target.value))}
                    className="slider" disabled={isProcessing||isAnalyzing}
                    style={{"--value":`${((zipCompressionLevel-1)/8)*100}%`}}/>
                  <div className="slider-val">Lv{zipCompressionLevel}</div>
                </div>
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:600,marginBottom:10,color:"var(--text-dim)"}}>Web Workers</div>
                <div className="pill-row">
                  <button className="pill" disabled={isProcessing||isAnalyzing} onClick={()=>setWorkerCount(0)}>{tr.workers_auto} ({computedWorkerCount})</button>
                  {[2,3,4].map(v=><button key={v} className="pill" disabled={isProcessing||isAnalyzing} onClick={()=>setWorkerCount(v)}>{v} Workers</button>)}
                </div>
              </div>
            </div>

            {/* 7. Icon */}
            <div className="glass-section">
              <div className="sec-header">
                <div className="sec-num">7</div>
                <div><div className="sec-title">{tr.sec_icon_title}</div><div className="sec-sub">{tr.sec_icon_sub}</div></div>
              </div>
              <input type="file" accept="image/png,image/jpeg,image/jpg" id="iconFile" className="hidden-input" disabled={isProcessing||isAnalyzing}
                onChange={async e=>{const f=e.target.files?.[0];if(f){setIconFile(f);const ab=await f.arrayBuffer();setIconBuffer(ab);appendLog(`Icon: ${f.name}`);}}}/>
              <label htmlFor="iconFile" className={`upload-btn${iconFile?" has-file":""}`}>
                <span className="upload-btn-icon">🖼️</span>
                <div><div className="upload-btn-text">{iconFile?iconFile.name:tr.icon_placeholder}</div><div className="upload-btn-sub">{tr.icon_sub}</div></div>
              </label>
            </div>

            {/* 8. mcmeta */}
            <div className="glass-section">
              <div className="sec-header">
                <div className="sec-num">8</div>
                <div><div className="sec-title">{tr.sec_mcmeta_title}</div><div className="sec-sub">{tr.sec_mcmeta_sub}</div></div>
              </div>
              {mcmetaError&&<div style={{color:"var(--red)",fontSize:12,marginBottom:8}}>{mcmetaError}</div>}
              {mcmetaLoaded?(
                <textarea className="mcmeta-ta" rows={8} value={mcmetaText}
                  onChange={e=>setMcmetaText(e.target.value)} disabled={isProcessing||isAnalyzing}
                  placeholder='{"pack": {"pack_format": 8, "description": "..."}}' />
              ):(
                <div style={{color:"var(--t3)",fontSize:12,fontStyle:"italic",padding:"16px 0"}}>{tr.mcmeta_empty}</div>
              )}
            </div>

            {/* 9. Pojav Log */}
            <div className="glass-section">
              <div className="sec-header">
                <div className="sec-num">9</div>
                <div><div className="sec-title">{tr.sec_pojav_title}</div><div className="sec-sub">{tr.sec_pojav_sub}</div></div>
              </div>
              <input type="file" accept=".txt" id="logFile" className="hidden-input" disabled={isProcessing||isAnalyzing}
                onChange={async e=>{
                  const f=e.target.files?.[0];if(!f)return;
                  const text=await f.text();const parsed=parsePojavLog(text);
                  if(parsed.enforceStrip.length>0){appendLog(`Auto-Fix: ${parsed.enforceStrip.length} path.`);setDynamicStripPaths(prev=>uniqueLower([...prev,...parsed.enforceStrip]));}
                  else appendLog("Auto-Fix: tidak ada path bermasalah.");
                  if(parsed.missing.length>0)appendLog(`Missing: ${parsed.missing.length} sprite`);
                }}/>
              <label htmlFor="logFile" className="upload-btn">
                <span className="upload-btn-icon">📝</span>
                <div>
                  <div className="upload-btn-text">{tr.pojav_placeholder}</div>
                  <div className="upload-btn-sub">Detected: <strong style={{color:"var(--green)"}}>{dynamicStripPaths.length}</strong> {tr.pojav_detected}</div>
                </div>
              </label>
            </div>

            {/* 10. Progress */}
            <div className="glass-section">
              <div className="sec-header">
                <div className="sec-num">10</div>
                <div><div className="sec-title">{tr.sec_progress_title}</div></div>
              </div>
              <ProgressRing pct={progressPct} done={progress.done} total={progress.total} etaSec={progress.etaSec} beating={isProcessing}/>
            </div>

            {/* 11. Console */}
            <div className="glass-section">
              <div className="sec-header">
                <div className="sec-num">11</div>
                <div><div className="sec-title">{tr.sec_console_title}</div></div>
              </div>
              <div className="console-wrap">
                <div className="console-bar">
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div className="console-dots">
                      <div className="cdot cdot-r"/><div className="cdot cdot-y"/><div className="cdot cdot-g"/>
                    </div>
                    <div className="console-filters">
                      {["ALL","PNG","OGG","JSON","WARN"].map(f=>(
                        <button key={f} className={`cf-btn${consoleFilter===f?" on":""}`} onClick={()=>setConsoleFilter(f)}>{f}</button>
                      ))}
                    </div>
                  </div>
                  <button className="console-copy" onClick={()=>navigator.clipboard?.writeText(logs.join("\n"))}>Copy</button>
                </div>
                <div className="console-body" ref={logRef}>
                  {filteredLogs.length===0?(
                    <div className="console-empty">{tr.console_empty}</div>
                  ):(
                    filteredLogs.map((l,i)=><div key={i} className={`cl ${classifyLog(l)}`}>{l}</div>)
                  )}
                </div>
              </div>
            </div>

            {/* Fase 3: Analyzer Result */}
            {analyzerResult&&(
              <div className="glass-section fade-in">
                <div className="sec-header">
                  <div className="sec-num" style={{background:"rgba(96,165,250,0.15)",color:"var(--blue)"}}>🔍</div>
                  <div><div className="sec-title">{tr.sec_analyzer_title}</div><div className="sec-sub">{tr.sec_analyzer_sub}</div></div>
                </div>
                <AnalyzerResult data={analyzerResult} tr={tr}/>
              </div>
            )}

            {/* Summary */}
            {summary&&(
              <div className="glass-section fade-in">
                <div className="sec-header">
                  <div className="sec-num" style={{background:"rgba(251,191,36,0.15)",color:"var(--amber)"}}>✓</div>
                  <div><div className="sec-title">Hasil Optimasi</div></div>
                </div>
                <div className="savings-hero">
                  <span className="savings-num">{(((summary.originalSize-summary.optimizedSize)/summary.originalSize)*100).toFixed(1)}%</span>
                  <div className="savings-lbl">ukuran berkurang</div>
                  <div className="savings-sizes">{(summary.originalSize/1e6).toFixed(2)} MB → {(summary.optimizedSize/1e6).toFixed(2)} MB</div>
                </div>
                <div className="summary-grid">
                  <SummaryCard label=tr.sum_png value={`${summary.pngOptimized}/${summary.pngCount}`}/>
                  <SummaryCard label=tr.sum_png_skip value={summary.pngSkippedByIHDR}/>
                  {summary.pngSingleColor>0&&<SummaryCard label=tr.sum_single value={summary.pngSingleColor}/>}
                  {summary.pngAlphaCleaned>0&&<SummaryCard label=tr.sum_alpha value={summary.pngAlphaCleaned}/>}
                  {summary.pngPowerOfTwo>0&&<SummaryCard label=tr.sum_pow2 value={summary.pngPowerOfTwo}/>}
                  {summary.oggCount>0&&<SummaryCard label=tr.sum_ogg value={`${summary.oggOptimized}/${summary.oggCount}`}/>}
                  <SummaryCard label=tr.sum_json value={`${summary.jsonMinified}/${summary.jsonCount}`}/>
                  {summary.jsonDeepCleaned>0&&<SummaryCard label=tr.sum_deep value={summary.jsonDeepCleaned}/>}
                  {summary.jsonKeySorted>0&&<SummaryCard label=tr.sum_keysort value={summary.jsonKeySorted}/>}
                  {summary.shaderCount>0&&<SummaryCard label=tr.sum_shader value={`${summary.shaderMinified}/${summary.shaderCount}`}/>}
                  {summary.langCount>0&&<SummaryCard label=tr.sum_lang value={summary.langCount}/>}
                  {summary.bbmodelCount>0&&<SummaryCard label=tr.sum_bbmodel value={summary.bbmodelCount}/>}
                  {summary.oversizedWarnings>0&&<SummaryCard label=tr.sum_oversized value={summary.oversizedWarnings}/>}
                  <SummaryCard label=tr.sum_removed value={summary.removed}/>
                  <SummaryCard label=tr.sum_workers value={summary.workers}/>
                  {summary.sha1&&(
                    <div className="sum-card" style={{gridColumn:"1/-1"}}>
                      <div className="sum-label">SHA-1 Hash</div>
                      <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"center",flexWrap:"wrap",marginTop:4}}>
                        <code style={{fontSize:11}}>{summary.sha1.substring(0,20)}...</code>
                        <button className="pill" style={{fontSize:11,padding:"3px 10px"}} onClick={()=>navigator.clipboard?.writeText(summary.sha1)}>Copy</button>
                      </div>
                    </div>
                  )}
                </div>
                {/* Fase 4: Share */}
                <ShareResults summary={summary}/>
                <p style={{textAlign:"center",fontSize:12,color:"var(--text-muted)",marginTop:16}}>
                  ✅ <code>optimize_file.zip</code> {tr.sum_done}
                </p>
              </div>
            )}

            {/* Fase 4: Badge Generator */}
            <div className="glass-section">
              <div className="sec-header">
                <div className="sec-num" style={{background:"linear-gradient(135deg,#8b5cf6,#6d28d9)"}}>🏷️</div>
                <div><div className="sec-title">{tr.sec_badge_title}</div><div className="sec-sub">{tr.sec_badge_sub}</div></div>
              </div>
              <BadgeGenerator/>
            </div>

          </div>{/* /optimizer-wrap */}

          {/* Sticky button */}
          <div className="sticky-btn-wrap">
            <div className="sticky-btn-inner">
              <button
                className="pill"
                onClick={handleAnalyze}
                disabled={isProcessing||isAnalyzing||!file}
                className="btn-analyze" style={{
                  background:isAnalyzing?"rgba(59,130,246,0.2)":"var(--surface3)",
                  borderColor:isAnalyzing?"var(--blue)":"var(--border)",
                  color:isAnalyzing?"var(--blue)":"var(--text-dim)"}}>
                {isAnalyzing?"🔍...":"🔍"}
              </button>
              <button
                className={`btn-optimize${isProcessing?" processing":""}`}
                style={{flex:1}}
                onClick={handleOptimize}
                disabled={isProcessing||isAnalyzing||!file}>
                {isProcessing?`${tr.btn_optimizing} ${progressPct}%`:!file?tr.btn_upload_first:tr.btn_optimize}
              </button>
            </div>
          </div>

          {/* Footer */}
          <footer className="footer">
            <div className="footer-logo">⚡ GHAIZERS 2.0</div>
            <div className="footer-by">Made with 💚 by <strong style={{color:"var(--green)"}}>ghaa</strong> (KhaizenNomazen)</div>
            <div className="footer-free">{tr.footer_free}</div>
            <div className="footer-legal">
              {tr.footer_legal}
            </div>
            <a href="https://github.com/KhaizenNomazen" target="_blank" rel="noopener noreferrer"
              style={{display:"block",color:"var(--green)",fontSize:12,marginBottom:16}}>
              🔗 github.com/KhaizenNomazen
            </a>
            <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
              {[["docs","📚 Docs"],["faq","❓ FAQ"],["changelog","📋 Changelog"]].map(([page,label])=>(
                <button key={page} className="pill" onClick={()=>setCurrentPage(page)} style={{fontSize:11}}>{label}</button>
              ))}
            </div>
            <div className="footer-tech">
              IHDR Skip · Web Workers · OGG Safe · Alpha Cleanup · Single-Color · Pow2 · Deep JSON · JSON Sort · .lang · .bbmodel · Shader Minify · SHA-1 · Pack Analyzer · Badge Gen
            </div>
          </footer>

        </>)}

      </div>
    </>
  );
}
