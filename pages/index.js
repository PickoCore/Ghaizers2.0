import Head from "next/head";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";

/* ── CREDIT ── */
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

/* ── MODES ── */
const MODES = {
  normal:  { id:"normal",  label:"Normal",       emoji:"🟢", description:"Seimbang, kualitas bagus dan pack tetap ringan.", scale:0.85, maxSize:512, minSize:16, minifyJson:true },
  extreme: { id:"extreme", label:"Extreme",       emoji:"🟡", description:"Sangat hemat, cocok untuk device mid–low.",      scale:0.6,  maxSize:256, minSize:8,  minifyJson:true },
  ultra:   { id:"ultra",   label:"Ultra Extreme", emoji:"🔴", description:"Paling ringan, untuk HP kentang / Pojav lemah.", scale:0.4,  maxSize:128, minSize:4,  minifyJson:true },
};

/* ── POLICIES ── */
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

function getPolicyForPath(lowerPath, dynamicStripPaths) {
  if (Array.isArray(dynamicStripPaths)) {
    for (const key of dynamicStripPaths) {
      if (key && lowerPath.includes(key)) return { enforceStrip:true, smoothing:"smooth" };
    }
  }
  for (const p of BASE_POLICIES) {
    if (p.pattern.test(lowerPath)) return { ...p };
  }
  return { scaleMul:1.0 };
}

function shouldExcludeNonGameFile(lower) {
  if ([".psd",".xcf",".txt",".md",".bak",".zip"].some(e=>lower.endsWith(e))) return true;
  if ([".png",".json",".mcmeta",".properties",".ogg",".fsh",".vsh",".glsl"].some(e=>lower.endsWith(e))) return false;
  if (["/raw/","/backup/","/unused/","/temp/"].some(d=>lower.includes(d))) {
    if ([".png",".json",".mcmeta",".ogg"].some(e=>lower.endsWith(e))) return false;
    return true;
  }
  return false;
}

function parsePojavLog(text) {
  const enforceStrip = new Set(), missing = new Set();
  const reStrip = /size .*? is not multiple of frame size|not multiple of frame size/i;
  const rePathPng = /(['"])([^'"]+?\.png)\1/i;
  const reMissing = /Missing sprite.*?([^\s]+?\.png)/i;
  for (const line of text.split(/\r?\n/)) {
    if (reStrip.test(line)) { const m=rePathPng.exec(line); if(m&&m[2]) enforceStrip.add(m[2].toLowerCase()); }
    const mm = reMissing.exec(line); if(mm&&mm[1]) missing.add(mm[1].toLowerCase());
  }
  return { enforceStrip:[...enforceStrip], missing:[...missing] };
}

function uniqueLower(arr) {
  const s=new Set(), out=[];
  for (const v of arr) { const l=(v||"").toLowerCase(); if(!s.has(l)){s.add(l);out.push(l);} }
  return out;
}

function readPngIHDRSize(buffer) {
  try {
    const u8=new Uint8Array(buffer);
    if (u8.length<24) return null;
    const sig=[137,80,78,71,13,10,26,10];
    for(let i=0;i<8;i++) if(u8[i]!==sig[i]) return null;
    const type=String.fromCharCode(u8[12],u8[13],u8[14],u8[15]);
    if(type!=="IHDR") return null;
    const dv=new DataView(buffer);
    const w=dv.getUint32(16,false), h=dv.getUint32(20,false);
    if(!w||!h) return null;
    return {w,h};
  } catch { return null; }
}

function detectAnimatedStrip(w,h) {
  if(!w||!h||h<=w) return null;
  const f=h/w;
  return (Number.isInteger(f)&&f>=2) ? f : null;
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
  if (!obj||typeof obj!=="object") return obj;
  const SKIP=["__comment","_comment","//","comment","__credits","__author"];
  if (Array.isArray(obj)) return obj.map(i=>deepCleanJson(i,lowerPath));
  const out={};
  for (const [k,v] of Object.entries(obj)) {
    if (SKIP.includes(k)) continue;
    out[k]=deepCleanJson(v,lowerPath);
  }
  if (lowerPath.endsWith("sounds.json")) {
    for (const [k,v] of Object.entries(out)) {
      if (v&&typeof v==="object"&&Array.isArray(v.sounds)&&v.sounds.length===0) delete out[k];
    }
  }
  return out;
}

async function optimizeOggSafe(buffer) {
  try {
    const bytes=new Uint8Array(buffer), len=bytes.length;
    if(len<16) return {out:buffer,changed:false};
    let start=0,end=len,changed=false;
    if(len>=10&&bytes[0]===0x49&&bytes[1]===0x44&&bytes[2]===0x33) {
      const size=((bytes[6]&0x7f)<<21)|((bytes[7]&0x7f)<<14)|((bytes[8]&0x7f)<<7)|(bytes[9]&0x7f);
      const hl=10+size; if(hl<end){start=hl;changed=true;}
    }
    if(end-start>128){const tp=end-128;if(bytes[tp]===0x54&&bytes[tp+1]===0x41&&bytes[tp+2]===0x47){end=tp;changed=true;}}
    while(end>start&&bytes[end-1]===0x00){end--;changed=true;}
    if(!changed||end<=start) return {out:buffer,changed:false};
    const out=new Uint8Array(bytes.subarray(start,end)); return {out:out.buffer,changed:true};
  } catch { return {out:buffer,changed:false}; }
}

async function buildPackIcon(file) {
  const buf=await file.arrayBuffer();
  const blob=new Blob([buf],{type:file.type||"image/png"});
  const img=await createImageBitmap(blob);
  const t=128, canvas=document.createElement("canvas");
  canvas.width=t; canvas.height=t;
  const ctx=canvas.getContext("2d");
  ctx.clearRect(0,0,t,t);
  const scale=Math.min(t/img.width,t/img.height,1);
  const dw=Math.round(img.width*scale),dh=Math.round(img.height*scale);
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality="high";
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

function triggerDownload(blob, name) {
  const url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url; a.download=name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}

/* ── WORKER ── */
function makePngWorkerURL() {
  const code=`
    function cleanAlpha(d){let n=0;for(let i=0;i<d.length;i+=4){if(d[i+3]===0&&(d[i]||d[i+1]||d[i+2])){d[i]=d[i+1]=d[i+2]=0;n++;}}return n;}
    function isSingleColor(d){if(d.length<4)return false;const r=d[0],g=d[1],b=d[2],a=d[3];for(let i=4;i<d.length;i+=4){if(d[i]!==r||d[i+1]!==g||d[i+2]!==b||d[i+3]!==a)return false;}return true;}
    self.onmessage=async(ev)=>{
      const{id,buffer,w0,h0,tW,tH,smoothing,sizeGuard,doAlphaClean,doSingleColor}=ev.data||{};
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
        const noResize=(tW===w0&&tH===h0);
        const canvas=new OffscreenCanvas(noResize?w0:tW,noResize?h0:tH);
        const ctx=canvas.getContext("2d");
        const nearest=smoothing==="nearest";
        ctx.imageSmoothingEnabled=!nearest;ctx.imageSmoothingQuality=nearest?"low":"high";
        ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(bmp,0,0,canvas.width,canvas.height);
        let alphaFixed=0;
        if(doAlphaClean){const id2=ctx.getImageData(0,0,canvas.width,canvas.height);alphaFixed=cleanAlpha(id2.data);if(alphaFixed>0)ctx.putImageData(id2,0,0);}
        const out=await(await canvas.convertToBlob({type:"image/png"})).arrayBuffer();
        if(sizeGuard&&!noResize&&out.byteLength>=orig&&alphaFixed===0){self.postMessage({id,ok:true,out:buffer,changed:false,guarded:true},[buffer]);return;}
        self.postMessage({id,ok:true,out,changed:(!noResize||alphaFixed>0),alphaFixed},[out]);
      }catch(e){
        try{self.postMessage({id,ok:false,error:String(e?.message||e),out:buffer,changed:false},[buffer]);}
        catch{self.postMessage({id,ok:false,error:String(e?.message||e),out:null,changed:false});}
      }
    };`;
  return URL.createObjectURL(new Blob([code],{type:"application/javascript"}));
}

function createWorkerPool(size) {
  const url=makePngWorkerURL(), workers=[], free=[], pending=new Map();
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

/* ── LOG CLASSIFIER ── */
function classifyLog(msg) {
  const m = msg.toLowerCase();
  if (m.includes("error") || m.includes("gagal") || m.includes("⚠️")) return "log-err";
  if (m.includes("warn") || m.includes("oversized") || m.includes("missing")) return "log-warn";
  if (m.includes("selesai") || m.includes("✔") || m.includes("berhasil") || m.includes("download")) return "log-ok";
  if (m.includes("sha") || m.includes("eta") || m.includes("mode") || m.includes("scale")) return "log-info";
  if (msg.startsWith("╔") || msg.startsWith("║") || msg.startsWith("╚") || msg.trim() === "") return "log-dim";
  return "";
}

/* ── PROGRESS RING COMPONENT ── */
function ProgressRing({ pct, done, total, etaSec }) {
  const r = 44, circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="progress-ring-wrap">
      <svg className="progress-ring-svg" width="108" height="108" viewBox="0 0 108 108">
        <circle className="progress-ring-bg" cx="54" cy="54" r={r} strokeWidth="8" />
        <circle className="progress-ring-fill" cx="54" cy="54" r={r} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <div className="progress-ring-info">
        <span className="progress-ring-pct">{pct}%</span>
        <div className="progress-ring-text">
          {total > 0 ? `${done} / ${total} file` : "Menunggu file..."}
        </div>
        {etaSec != null && etaSec > 0 && (
          <div className="progress-ring-eta">⏱ ETA {etaSec}s</div>
        )}
      </div>
    </div>
  );
}

/* ── CHECK ITEM ── */
function CheckItem({ id, checked, onChange, label, desc, disabled }) {
  return (
    <div className={`check-item${checked?" checked":""}`} onClick={() => !disabled && onChange(!checked)}>
      <div className="check-box">
        {checked && <span className="check-box-tick">✓</span>}
      </div>
      <div>
        <div className="check-label">{label}</div>
        <div className="check-desc">{desc}</div>
      </div>
    </div>
  );
}

/* ── SUMMARY CARD ── */
function SummaryCard({ label, value }) {
  return (
    <div className="summary-card">
      <div className="summary-card-label">{label}</div>
      <div className="summary-card-value">{value}</div>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */
export default function Home() {
  // core state
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

  // file state
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [iconFile, setIconFile] = useState(null);
  const [mcmetaText, setMcmetaText] = useState("");
  const [mcmetaLoaded, setMcmetaLoaded] = useState(false);
  const [mcmetaError, setMcmetaError] = useState("");
  const [dynamicStripPaths, setDynamicStripPaths] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // process state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ done:0, total:0, etaSec:null });
  const [summary, setSummary] = useState(null);

  // console state
  const [logs, setLogs] = useState([]);
  const [consoleFilter, setConsoleFilter] = useState("ALL");
  const logRef = useRef(null);
  const logBufferRef = useRef([]);
  const flushTimerRef = useRef(null);

  const computedWorkerCount = useMemo(() => {
    const hc = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
    return workerCount > 0 ? workerCount : Math.max(2, Math.min(4, Math.floor(hc/2)||2));
  }, [workerCount]);

  const progressPct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  /* ── Logging ── */
  const flushLogs = useCallback(() => {
    const buf = logBufferRef.current;
    if (!buf.length) return;
    setLogs(prev => [...prev, ...buf.splice(0, buf.length)]);
    setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 10);
  }, []);

  const appendLog = useCallback((msg) => {
    const time = new Date().toLocaleTimeString();
    logBufferRef.current.push(`[${time}] ${msg}`);
    if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(() => { flushTimerRef.current = null; flushLogs(); }, 200);
    }
  }, [flushLogs]);

  useEffect(() => () => { if (flushTimerRef.current) clearTimeout(flushTimerRef.current); }, []);

  /* ── Filtered logs ── */
  const filteredLogs = useMemo(() => {
    if (consoleFilter === "ALL") return logs;
    const map = { PNG: "png", OGG: "ogg", JSON: "json", WARN: "warn" };
    const kw = map[consoleFilter] || "";
    return logs.filter(l => l.toLowerCase().includes(kw));
  }, [logs, consoleFilter]);

  /* ── File handling ── */
  const handleFile = useCallback(async (f) => {
    if (!f) return;
    setFile(f); setFileName(f.name); setSummary(null);
    setLogs([]); logBufferRef.current = [];
    setProgress({ done:0, total:0, etaSec:null });
    setMcmetaText(""); setMcmetaLoaded(false); setMcmetaError("");
    appendLog(`File diterima: ${f.name} (${(f.size/1e6).toFixed(2)} MB)`);
    try {
      appendLog("Membaca pack.mcmeta...");
      const zip = await JSZip.loadAsync(f);
      const e = Object.values(zip.files).find(e => e.name.toLowerCase() === "pack.mcmeta");
      if (!e) { appendLog("pack.mcmeta tidak ditemukan."); return; }
      const text = await e.async("string");
      setMcmetaText(text); setMcmetaLoaded(true);
      appendLog("pack.mcmeta berhasil dibaca ✔");
    } catch (err) {
      setMcmetaError("Gagal membaca pack.mcmeta");
      appendLog("Gagal membaca pack.mcmeta: " + err.message);
    }
  }, [appendLog]);

  /* ── Drag & Drop ── */
  const onDrop = useCallback((e) => {
    e.preventDefault(); setIsDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.name.endsWith(".zip")) handleFile(f);
  }, [handleFile]);

  const onDragOver = useCallback((e) => { e.preventDefault(); setIsDragOver(true); }, []);
  const onDragLeave = useCallback(() => setIsDragOver(false), []);

  /* ── Optimize ── */
  const handleOptimize = async () => {
    if (!file || isProcessing) return;
    const baseMode = MODES[mode];
    const effectiveScale = baseMode.scale * (resolutionPercent / 100);
    const modeConfig = { ...baseMode, scale:effectiveScale, preservePixelArt };

    CREDIT_BANNER.forEach(l => appendLog(l));
    appendLog(" ");
    appendLog(`Mode: ${baseMode.label} | Scale: ${(effectiveScale*100).toFixed(0)}%`);
    appendLog(`Workers: ${computedWorkerCount} | ZIP Lv: ${zipCompressionLevel}`);
    appendLog(`Alpha:${doAlphaClean?"✔":"✘"} SingleColor:${doSingleColor?"✔":"✘"} DeepJSON:${doDeepCleanJson?"✔":"✘"} Shader:${doShaderMinify?"✔":"✘"}`);

    setIsProcessing(true); setSummary(null);
    setProgress({ done:0, total:0, etaSec:null });
    const pool = createWorkerPool(computedWorkerCount);
    const t0 = performance.now();

    try {
      const zip = await JSZip.loadAsync(file);
      appendLog("ZIP berhasil dibaca.");
      const outZip = new JSZip();
      const entries = Object.values(zip.files);
      const stats = { totalFiles:0, pngCount:0, pngOptimized:0, pngSkippedByIHDR:0, pngSingleColor:0, pngAlphaCleaned:0, jsonCount:0, jsonMinified:0, jsonDeepCleaned:0, removed:0, oggCount:0, oggOptimized:0, shaderCount:0, shaderMinified:0, oversizedWarnings:0 };
      const totalToProcess = entries.filter(e=>!e.dir).length;
      setProgress({ done:0, total:totalToProcess, etaSec:null });
      let done = 0;
      const tick = () => {
        done++;
        const elapsed = (performance.now()-t0)/1000;
        const rate = done/Math.max(0.001,elapsed);
        const left = Math.max(0,totalToProcess-done);
        if (done%15===0||done===totalToProcess) setProgress({ done, total:totalToProcess, etaSec:rate>0?Math.round(left/rate):null });
      };

      for (const entry of entries) {
        if (entry.dir) { outZip.folder(entry.name); continue; }
        const name=entry.name, lower=name.toLowerCase();
        stats.totalFiles++;

        if (shouldExcludeNonGameFile(lower)) { stats.removed++; appendLog(`Dibuang: ${name}`); tick(); continue; }

        if ([".fsh",".vsh",".glsl"].some(e=>lower.endsWith(e))) {
          stats.shaderCount++;
          if (doShaderMinify) {
            const txt = await entry.async("string"), min=minifyShader(txt);
            outZip.file(name, min.length<txt.length?min:txt);
            if(min.length<txt.length){stats.shaderMinified++;appendLog(`Shader: ${name}`);}
          } else outZip.file(name, await entry.async("arraybuffer"));
          tick(); continue;
        }

        if (lower.endsWith(".properties")) {
          outZip.file(name, doShaderMinify ? minifyProperties(await entry.async("string")) : await entry.async("arraybuffer"));
          tick(); continue;
        }

        if (lower==="pack.mcmeta") {
          stats.jsonCount++;
          const orig = await entry.async("string");
          let toWrite = (mcmetaLoaded&&mcmetaText.trim()) ? mcmetaText : orig;
          try {
            let obj = JSON.parse(toWrite);
            if(doDeepCleanJson) obj=deepCleanJson(obj,lower);
            const desc = obj?.pack?.description||"";
            obj.pack=obj.pack||{};
            obj.pack._credit="© ghaa (KhaizenNomazen) | Ghaizers2.0 | GRATIS | Dilarang dijual!";
            obj.pack._legal="UU Hak Cipta No.28/2014";
            obj.pack._source="github.com/KhaizenNomazen";
            if(typeof desc==="string"&&!desc.includes("ghaa")) obj.pack.description=desc?`${desc} §7| §cOptimized by §aghaa`:CREDIT_MCMETA_DESC;
            outZip.file(name,modeConfig.minifyJson?JSON.stringify(obj):JSON.stringify(obj,null,2));
            stats.jsonMinified++; appendLog("pack.mcmeta: credit injected ✔");
          } catch { outZip.file(name,toWrite); }
          tick(); continue;
        }

        if (lower.endsWith(".ogg")) {
          stats.oggCount++;
          const buf=await entry.async("arraybuffer");
          if(optimizeOgg){const{out,changed}=await optimizeOggSafe(buf);if(changed){stats.oggOptimized++;appendLog(`OGG: ${name}`);}outZip.file(name,out);}
          else outZip.file(name,buf);
          tick(); continue;
        }

        if (lower.endsWith(".png")) {
          stats.pngCount++;
          const policy=getPolicyForPath(lower,dynamicStripPaths);
          if(!preservePixelArt&&policy.smoothing==="nearest") policy.smoothing="smooth";
          if(policy.skip||policy.skipResize){outZip.file(name,await entry.async("arraybuffer"));tick();continue;}
          const buf=await entry.async("arraybuffer");
          if(buf.byteLength<2048){outZip.file(name,buf);stats.pngSkippedByIHDR++;tick();continue;}
          const sz=readPngIHDRSize(buf);
          if(!sz){outZip.file(name,buf);tick();continue;}
          const{w:w0,h:h0}=sz;
          if(w0>1024||h0>1024){stats.oversizedWarnings++;appendLog(`⚠️ Oversized: ${name} (${w0}x${h0})`);}
          const{tW,tH,smoothing}=computeTargetSize({w0,h0,policy,modeConfig});
          const res=await pool.runPngJob({buffer:buf,w0,h0,tW,tH,smoothing,sizeGuard:true,doAlphaClean,doSingleColor});
          if(res?.singleColor){stats.pngSingleColor++;stats.pngOptimized++;appendLog(`PNG 1×1: ${name}`);}
          else if(res?.changed){stats.pngOptimized++;if(res.alphaFixed>0)stats.pngAlphaCleaned++;if(tW!==w0||tH!==h0)appendLog(`PNG: ${name} (${w0}×${h0}→${tW}×${tH})`);else if(res.alphaFixed>0)appendLog(`Alpha: ${name}`);}
          outZip.file(name,res?.out||buf);tick();continue;
        }

        if (lower.endsWith(".json")||lower.endsWith(".mcmeta")) {
          stats.jsonCount++;
          const txt=await entry.async("string");
          if(modeConfig.minifyJson){
            try{let obj=JSON.parse(txt);if(doDeepCleanJson){const b=JSON.stringify(obj).length;obj=deepCleanJson(obj,lower);if(JSON.stringify(obj).length<b)stats.jsonDeepCleaned++;}outZip.file(name,JSON.stringify(obj));stats.jsonMinified++;}
            catch{outZip.file(name,txt);}
          }else outZip.file(name,txt);
          tick(); continue;
        }

        outZip.file(name,await entry.async("arraybuffer")); tick();
      }

      outZip.file("GHAIZERS_CREDIT.txt",CREDIT_TXT);
      outZip.file("JANGAN_BAYAR_INI.txt","⚠️ Tool Ghaizers2.0 ini GRATIS!\nJika kamu membayar → kamu DITIPU!\nLapor: github.com/KhaizenNomazen\nMenjual = UU Hak Cipta No.28/2014");
      appendLog("Credit injected ✔");
      if(iconFile){appendLog("Pack icon override...");outZip.file("pack.png",await buildPackIcon(iconFile));}
      appendLog("Menyusun ZIP...");
      const blob=await outZip.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:Math.max(1,Math.min(9,zipCompressionLevel))},comment:"Optimized by Ghaizers2.0 | (c) ghaa | GRATIS | github.com/KhaizenNomazen"});
      const sha1=await sha1HexFromBlob(blob);
      if(sha1)appendLog(`SHA-1: ${sha1}`);
      appendLog("Selesai ✔ Download dimulai...");
      triggerDownload(blob,"optimize_file.zip");
      setSummary({...stats,originalSize:file.size,optimizedSize:blob.size,sha1:sha1||null,workers:computedWorkerCount,compressionLevel:zipCompressionLevel});
      flushLogs();
      setProgress({done:totalToProcess,total:totalToProcess,etaSec:0});
    } catch(e) {
      appendLog("ERROR: "+e.message); flushLogs();
    } finally {
      pool.destroy(); setIsProcessing(false);
    }
  };

  /* ── RENDER ── */
  return (
    <>
      <Head>
        <title>Minecraft Resource Pack Optimizer Gratis – Ghaizers2.0</title>
        <meta name="description" content="Optimize resource pack Minecraft gratis. Kompres PNG, JSON, OGG tanpa kehilangan kualitas. Cocok Pojav, HP low-end, Bedrock. 100% client-side." />
        <meta name="keywords" content="optimize resource pack minecraft, minecraft pack optimizer, kompres texture pack, pojav launcher resource pack ringan, ghaizers" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://optimizer.ghaa.my.id" />
        <meta property="og:title" content="Minecraft Resource Pack Optimizer Gratis – Ghaizers2.0" />
        <meta property="og:description" content="Tool gratis optimize resource pack Minecraft. PNG, JSON, OGG. Cocok Pojav & low-end. Dibuat oleh ghaa." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://optimizer.ghaa.my.id" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({"@context":"https://schema.org","@type":"WebApplication","name":"Ghaizers2.0","url":"https://optimizer.ghaa.my.id","description":"Tool gratis optimize resource pack Minecraft","applicationCategory":"UtilitiesApplication","operatingSystem":"Any","offers":{"@type":"Offer","price":"0","priceCurrency":"IDR"},"author":{"@type":"Person","name":"ghaa (KhaizenNomazen)","url":"https://github.com/KhaizenNomazen"}})}} />
      </Head>

      {/* Background */}
      <div className="bg-root">
        <div className="bg-mesh" />
        <div className="bg-grid" />
        <div className="bg-scanlines" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div className="page-root">
        {/* Watermark */}
        <div className="watermark-bar">
          ⚠️ Tool ini 100% GRATIS oleh <strong>ghaa</strong> — Jika kamu membayar, kamu DITIPU! &nbsp;|&nbsp;
          <a href="https://github.com/KhaizenNomazen" target="_blank" rel="noopener noreferrer">github.com/KhaizenNomazen</a>
        </div>

        {/* Navbar */}
        <nav className="navbar">
          <div className="navbar-logo">
            <div className="navbar-logo-dot" />
            GHAIZERS
          </div>
          <div className="navbar-links">
            <a href="https://github.com/KhaizenNomazen" target="_blank" rel="noopener noreferrer" className="navbar-link">GitHub</a>
            <span className="navbar-badge">v2.0</span>
          </div>
        </nav>

        {/* Hero */}
        <section className="hero">
          <div className="hero-eyebrow">⚡ MINECRAFT PACK OPTIMIZER</div>
          <h1 className="hero-title">
            Optimize <span className="accent">Resource Pack</span><br />
            Minecraft Kamu <span className="gold">Gratis</span>
          </h1>
          <p className="hero-sub">
            Kompres PNG, minify JSON, optimize OGG — semua di browser kamu, tanpa upload ke server.
            Cocok untuk Pojav Launcher, HP low-end, dan Bedrock.
          </p>
          <div className="hero-cta-row">
            <button className="hero-btn-primary" onClick={() => document.getElementById("optimizer-start")?.scrollIntoView({behavior:"smooth"})}>
              ✨ MULAI OPTIMIZE
            </button>
            <a href="https://github.com/KhaizenNomazen" target="_blank" rel="noopener noreferrer">
              <button className="hero-btn-secondary">⭐ GitHub</button>
            </a>
          </div>

          {/* Stats */}
          <div className="hero-stats">
            {[["100%","Client-Side"],["0 MB","Upload ke Server"],["SHA-1","Verified Output"],["FREE","Selamanya"]].map(([v,l])=>(
              <div className="hero-stat" key={l}>
                <span className="hero-stat-value">{v}</span>
                <span className="hero-stat-label">{l}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Feature cards */}
        <div className="features-strip">
          {[
            ["🖼️","PNG Smart Resize","Scale otomatis per kategori texture"],
            ["✨","Alpha Cleanup","Zero RGB pixel transparan → ZIP kecil"],
            ["🎨","Single-Color Detect","PNG solid → 1×1 px (teknik PackSquash)"],
            ["📄","Deep JSON Clean","Hapus comment field & sounds kosong"],
            ["🔊","OGG Safe Strip","Hapus ID3 metadata tanpa re-encode"],
            ["⚡","Web Workers","Multi-thread, browser tidak freeze"],
            ["🎮","Pojav Auto-Fix","Parse log → fix animated strip otomatis"],
            ["🔐","SHA-1 Verify","Hash output untuk integritas file"],
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
              <div className="sec-number">1</div>
              <div><div className="sec-title">Upload Resource Pack</div><div className="sec-sub">Drag & drop atau klik untuk pilih file .zip</div></div>
            </div>
            <input type="file" accept=".zip" id="inputFile" className="hidden-input" disabled={isProcessing}
              onChange={e => handleFile(e.target.files?.[0])} />
            <label htmlFor="inputFile"
              className={`dropzone${isDragOver?" drag-over":""}${file?" has-file":""}`}
              onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}>
              <span className="dropzone-icon">{file ? "📦" : "⬆️"}</span>
              {file ? (
                <>
                  <div className="dropzone-file">{fileName}</div>
                  <div className="dropzone-size">{(file.size/1e6).toFixed(2)} MB · Klik untuk ganti</div>
                </>
              ) : (
                <>
                  <div className="dropzone-title">Drop file .zip di sini</div>
                  <div className="dropzone-sub">atau klik untuk browse · Proses 100% client-side</div>
                </>
              )}
            </label>
          </div>

          {/* 2. Mode */}
          <div className="glass-section">
            <div className="sec-header">
              <div className="sec-number">2</div>
              <div><div className="sec-title">Mode Optimasi</div><div className="sec-sub">Pilih sesuai target device</div></div>
            </div>
            <div className="mode-grid">
              {Object.values(MODES).map(m => (
                <button key={m.id} className={`mode-card${mode===m.id?" active":""}`}
                  disabled={isProcessing} onClick={() => setMode(m.id)}>
                  <div className="mode-card-top">
                    <span className="mode-name">{m.emoji} {m.label}</span>
                    {mode===m.id && <span className="mode-active-dot" />}
                  </div>
                  <p className="mode-desc">{m.description}</p>
                  <div className="mode-tags">
                    <span className="mode-tag">Scale {Math.round(m.scale*100)}%</span>
                    <span className="mode-tag">Max {m.maxSize}px</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Fine-tune */}
          <div className="glass-section">
            <div className="sec-header">
              <div className="sec-number">3</div>
              <div><div className="sec-title">Fine-tune Resolusi</div><div className="sec-sub">Kalikan scale mode × slider</div></div>
            </div>
            <div className="slider-row">
              <input type="range" min="40" max="120" value={resolutionPercent}
                onChange={e=>setResolutionPercent(Number(e.target.value))}
                className="slider" disabled={isProcessing}
                style={{"--value":`${((resolutionPercent-40)/80)*100}%`}} />
              <div className="slider-value">{resolutionPercent}%</div>
            </div>
            <div className="preset-btns">
              {[40,60,80,100,120].map(v=>(
                <button key={v} className="preset-btn" disabled={isProcessing} onClick={()=>setResolutionPercent(v)}>{v}%</button>
              ))}
            </div>
          </div>

          {/* 4. Opsi */}
          <div className="glass-section">
            <div className="sec-header">
              <div className="sec-number">4</div>
              <div><div className="sec-title">Opsi Optimasi</div><div className="sec-sub">Toggle fitur sesuai kebutuhan</div></div>
            </div>
            <div className="check-grid">
              <CheckItem checked={preservePixelArt} onChange={setPreservePixelArt} disabled={isProcessing}
                label="Preserve Pixel Art" desc="Jaga ketajaman GUI & font (nearest-neighbor)" />
              <CheckItem checked={optimizeOgg} onChange={setOptimizeOgg} disabled={isProcessing}
                label="Optimize OGG Sound" desc="Strip metadata ID3 tanpa re-encode audio" />
              <CheckItem checked={doAlphaClean} onChange={setDoAlphaClean} disabled={isProcessing}
                label="Alpha Pixel Cleanup" desc="Zero RGB transparan pixel → ZIP lebih kecil" />
              <CheckItem checked={doSingleColor} onChange={setDoSingleColor} disabled={isProcessing}
                label="Single-Color Detect" desc="PNG solid satu warna → resize ke 1×1" />
              <CheckItem checked={doDeepCleanJson} onChange={setDoDeepCleanJson} disabled={isProcessing}
                label="Deep JSON Clean" desc="Hapus __comment, sounds kosong, dll" />
              <CheckItem checked={doShaderMinify} onChange={setDoShaderMinify} disabled={isProcessing}
                label="Shader Minify" desc="Minify .fsh/.vsh/.glsl/.properties OptiFine" />
            </div>
          </div>

          {/* 5. Advanced */}
          <div className="glass-section">
            <div className="sec-header">
              <div className="sec-number">5</div>
              <div><div className="sec-title">Pengaturan Lanjutan</div></div>
            </div>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:10,color:"var(--text-dim)"}}>ZIP Compression Level</div>
              <div className="slider-row">
                <input type="range" min="1" max="9" value={zipCompressionLevel}
                  onChange={e=>setZipCompressionLevel(Number(e.target.value))}
                  className="slider" disabled={isProcessing}
                  style={{"--value":`${((zipCompressionLevel-1)/8)*100}%`}} />
                <div className="slider-value">Lv{zipCompressionLevel}</div>
              </div>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:600,marginBottom:10,color:"var(--text-dim)"}}>Web Workers</div>
              <div className="preset-btns">
                <button className="preset-btn" disabled={isProcessing} onClick={()=>setWorkerCount(0)}>Auto ({computedWorkerCount})</button>
                {[2,3,4].map(v=><button key={v} className="preset-btn" disabled={isProcessing} onClick={()=>setWorkerCount(v)}>{v} Workers</button>)}
              </div>
            </div>
          </div>

          {/* 6. Icon */}
          <div className="glass-section">
            <div className="sec-header">
              <div className="sec-number">6</div>
              <div><div className="sec-title">Custom Pack Icon</div><div className="sec-sub">Override pack.png · Auto-resize 128×128</div></div>
            </div>
            <input type="file" accept="image/png,image/jpeg,image/jpg" id="iconFile" className="hidden-input" disabled={isProcessing}
              onChange={e=>{const f=e.target.files?.[0];if(f){setIconFile(f);appendLog(`Icon: ${f.name}`);}}} />
            <label htmlFor="iconFile" className={`upload-btn${iconFile?" has-file":""}`}>
              <span className="upload-btn-icon">🖼️</span>
              <div>
                <div className="upload-btn-text">{iconFile?iconFile.name:"Klik untuk pilih gambar icon"}</div>
                <div className="upload-btn-sub">PNG atau JPG</div>
              </div>
            </label>
          </div>

          {/* 7. mcmeta */}
          <div className="glass-section">
            <div className="sec-header">
              <div className="sec-number">7</div>
              <div><div className="sec-title">pack.mcmeta Editor</div><div className="sec-sub">Credit ghaa otomatis diinjeksi</div></div>
            </div>
            {mcmetaError && <div style={{color:"var(--red)",fontSize:12,marginBottom:8}}>{mcmetaError}</div>}
            {mcmetaLoaded ? (
              <textarea className="mcmeta-ta" rows={8} value={mcmetaText}
                onChange={e=>setMcmetaText(e.target.value)} disabled={isProcessing}
                placeholder='{"pack": {"pack_format": 8, "description": "..."}}' />
            ) : (
              <div style={{color:"var(--text-muted)",fontSize:12,fontStyle:"italic",padding:"16px 0"}}>
                pack.mcmeta tidak ditemukan atau belum di-load.
              </div>
            )}
          </div>

          {/* 8. Pojav Log */}
          <div className="glass-section">
            <div className="sec-header">
              <div className="sec-number">8</div>
              <div><div className="sec-title">Pojav Log Auto-Fix</div><div className="sec-sub">Parse latestlog.txt → fix animated strip otomatis</div></div>
            </div>
            <input type="file" accept=".txt" id="logFile" className="hidden-input" disabled={isProcessing}
              onChange={async e=>{
                const f=e.target.files?.[0]; if(!f) return;
                const text=await f.text(); const parsed=parsePojavLog(text);
                if(parsed.enforceStrip.length>0){appendLog(`Auto-Fix: ${parsed.enforceStrip.length} path enforce-strip.`);setDynamicStripPaths(prev=>uniqueLower([...prev,...parsed.enforceStrip]));}
                else appendLog("Auto-Fix: tidak ada path bermasalah di log.");
                if(parsed.missing.length>0) appendLog(`Missing sprite: ${parsed.missing.length} (masalah pack asli)`);
              }} />
            <label htmlFor="logFile" className="upload-btn">
              <span className="upload-btn-icon">📝</span>
              <div>
                <div className="upload-btn-text">Klik untuk pilih latestlog.txt</div>
                <div className="upload-btn-sub">Terdeteksi: <strong style={{color:"var(--green)"}}>{dynamicStripPaths.length}</strong> path enforce-strip</div>
              </div>
            </label>
          </div>

          {/* 9. Progress */}
          <div className="glass-section">
            <div className="sec-header">
              <div className="sec-number">9</div>
              <div><div className="sec-title">Progress</div></div>
            </div>
            <ProgressRing pct={progressPct} done={progress.done} total={progress.total} etaSec={progress.etaSec} />
          </div>

          {/* 10. Console */}
          <div className="glass-section">
            <div className="sec-header">
              <div className="sec-number">10</div>
              <div><div className="sec-title">Console Output</div></div>
            </div>
            <div className="console-wrap">
              <div className="console-toolbar">
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div className="console-toolbar-dots">
                    <div className="console-dot console-dot-r"/>
                    <div className="console-dot console-dot-y"/>
                    <div className="console-dot console-dot-g"/>
                  </div>
                  <div className="console-filters">
                    {["ALL","PNG","OGG","JSON","WARN"].map(f=>(
                      <button key={f} className={`console-filter-btn${consoleFilter===f?" active":""}`} onClick={()=>setConsoleFilter(f)}>{f}</button>
                    ))}
                  </div>
                </div>
                <button className="console-copy-btn" onClick={()=>navigator.clipboard?.writeText(logs.join("\n"))}>Copy</button>
              </div>
              <div className="console-body" ref={logRef}>
                {filteredLogs.length===0 ? (
                  <div className="console-placeholder">Belum ada log. Upload pack lalu klik Optimize.</div>
                ) : (
                  filteredLogs.map((l,i) => (
                    <div key={i} className={`console-line ${classifyLog(l)}`}>{l}</div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          {summary && (
            <div className="glass-section fade-in">
              <div className="sec-header">
                <div className="sec-number" style={{background:"linear-gradient(135deg,#f59e0b,#d97706)"}}>✓</div>
                <div><div className="sec-title">Hasil Optimasi</div></div>
              </div>
              <div className="savings-big">
                <span className="savings-pct">{(((summary.originalSize-summary.optimizedSize)/summary.originalSize)*100).toFixed(1)}%</span>
                <div className="savings-label">ukuran berkurang</div>
                <div className="savings-sizes">{(summary.originalSize/1e6).toFixed(2)} MB → {(summary.optimizedSize/1e6).toFixed(2)} MB</div>
              </div>
              <div className="summary-grid">
                <SummaryCard label="PNG Dioptimasi" value={`${summary.pngOptimized}/${summary.pngCount}`} />
                <SummaryCard label="PNG Skipped" value={summary.pngSkippedByIHDR} />
                {summary.pngSingleColor>0 && <SummaryCard label="Single-Color→1×1" value={summary.pngSingleColor} />}
                {summary.pngAlphaCleaned>0 && <SummaryCard label="Alpha Cleaned" value={summary.pngAlphaCleaned} />}
                {summary.oggCount>0 && <SummaryCard label="OGG Optimized" value={`${summary.oggOptimized}/${summary.oggCount}`} />}
                <SummaryCard label="JSON Minified" value={`${summary.jsonMinified}/${summary.jsonCount}`} />
                {summary.jsonDeepCleaned>0 && <SummaryCard label="JSON Deep Clean" value={summary.jsonDeepCleaned} />}
                {summary.shaderCount>0 && <SummaryCard label="Shader Minified" value={`${summary.shaderMinified}/${summary.shaderCount}`} />}
                {summary.oversizedWarnings>0 && <SummaryCard label="⚠️ Oversized" value={summary.oversizedWarnings} />}
                <SummaryCard label="File Dihapus" value={summary.removed} />
                <SummaryCard label="Workers" value={summary.workers} />
                <SummaryCard label="ZIP Level" value={summary.compressionLevel} />
                {summary.sha1 && (
                  <div className="summary-card" style={{gridColumn:"1/-1"}}>
                    <div className="summary-card-label">SHA-1 Hash</div>
                    <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"center",flexWrap:"wrap",marginTop:4}}>
                      <code style={{fontSize:11}}>{summary.sha1.substring(0,20)}...</code>
                      <button className="preset-btn" style={{fontSize:11,padding:"3px 10px"}} onClick={()=>navigator.clipboard?.writeText(summary.sha1)}>Copy Full</button>
                    </div>
                  </div>
                )}
              </div>
              <p style={{textAlign:"center",fontSize:12,color:"var(--text-muted)",marginTop:16}}>
                ✅ <code>optimize_file.zip</code> sudah ter-download · Credit ghaa sudah diinjeksi
              </p>
            </div>
          )}

        </div>{/* /optimizer-wrap */}

        {/* Sticky optimize button */}
        <div className="optimize-btn-wrap">
          <button
            className={`optimize-btn${isProcessing?" processing":""}`}
            onClick={handleOptimize}
            disabled={isProcessing||!file}>
            {isProcessing
              ? `🔄 Mengoptimasi... ${progressPct}%`
              : !file
              ? "📦 Upload pack dulu"
              : "✨ OPTIMIZE SEKARANG"}
          </button>
        </div>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-logo">⚡ GHAIZERS 2.0</div>
          <div className="footer-by">Made with 💚 by <strong style={{color:"var(--green)"}}>ghaa</strong> (KhaizenNomazen)</div>
          <div className="footer-free">🆓 Tool ini GRATIS selamanya — Jangan bayar siapapun untuk ini!</div>
          <div className="footer-legal">
            ⚖️ Menjual tool ini = Pelanggaran UU Hak Cipta No. 28/2014<br/>
            Pidana max 10 tahun · Denda max Rp 4.000.000.000
          </div>
          <a href="https://github.com/KhaizenNomazen" target="_blank" rel="noopener noreferrer"
            style={{display:"block",color:"var(--green)",fontSize:12,marginBottom:16}}>
            🔗 github.com/KhaizenNomazen
          </a>
          <div className="footer-tech">
            IHDR Skip · Web Workers · OGG Safe · Alpha Cleanup · Single-Color · Deep JSON · Shader Minify · SHA-1 · Size Guard
          </div>
        </footer>

      </div>{/* /page-root */}
    </>
  );
}
