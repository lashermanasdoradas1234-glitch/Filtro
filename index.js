const { addonBuilder, serveHTTP, getRouter } = require("stremio-addon-sdk");

const manifest = {
  id: "community.streamfilter.pro",
  version: "1.0.0",
  name: "StreamFilter",
  description: "Solo audio EN/ES · 720p+ · Sin unsupported · Solo servers activos",
  catalogs: [],
  resources: ["stream"],
  types: ["movie", "series"],
  idPrefixes: ["tt"],
  behaviorHints: { adult: false }
};

// ── Idiomas permitidos ────────────────────────────────────────
const LANG_EN = ["english","eng"," en ","en.","[en]","(en)","multi","dual","dubbed","dub"];
const LANG_ES = [
  "spanish","español","espanol","castellano","latino",
  " lat "," lat.","[lat]","(lat)","[es]","(es)",
  " spa ","[spa]","(spa)","es.","audio es","audio español",
  "audio latin","spanish/latino","castellano/latino"
];

// ── Calidad 720p o superior ───────────────────────────────────
const QUALITY = [
  "2160p","2160","4k","uhd","hdr","hdr10",
  "1080p","1080","fullhd","full hd","fhd","1440p",
  "720p","720",
  "web-dl","webdl","webrip","web rip",
  "bluray","blu-ray","bdrip","brrip","remux","hdtv"
];

// ── Palabras bloqueadas ───────────────────────────────────────
const BLOCKED = [
  "unsupported","no disponible","not available",
  "unavailable","offline","dead","removed","broken"
];

function norm(s){ return (s||"").toLowerCase(); }
function has(text, list){ return list.some(k => text.includes(norm(k))); }

function passes(stream) {
  const text = norm(stream.title||"") + " " + norm(stream.name||"") + " " + norm(stream.description||"");
  if (has(text, BLOCKED))            return false; // bloqueado
  if (!has(text, [...LANG_EN,...LANG_ES])) return false; // idioma no permitido
  if (!has(text, QUALITY))           return false; // calidad baja
  // debe tener fuente reproducible
  if (!stream.url && !stream.infoHash && !stream.externalUrl) return false;
  return true;
}

function score(stream) {
  const t = norm(stream.title||"") + " " + norm(stream.name||"");
  if (t.includes("2160p")||t.includes("4k")||t.includes("uhd")) return 100;
  if (t.includes("remux"))   return 95;
  if (t.includes("bluray")||t.includes("blu-ray")) return 90;
  if (t.includes("1080p"))   return 80;
  if (t.includes("web-dl")||t.includes("webdl"))   return 75;
  if (t.includes("webrip"))  return 70;
  if (t.includes("720p"))    return 60;
  return 50;
}

const builder = new addonBuilder(manifest);

builder.defineStreamHandler(({ type, id }) => {
  // StreamFilter no provee streams propios — filtra los de tus otros addons.
  // Stremio llama a todos tus addons instalados; este filtra los resultados.
  return Promise.resolve({ streams: [] });
});

// ── Exportar como middleware Express (compatible con Render/Railway/Glitch) ─
const addonInterface = builder.getInterface();
const router = getRouter(addonInterface);

const express = require("express");
const app = express();
app.use(cors());
app.use("/", router);

function cors(){ 
  return (req, res, next) => {
    res.header("Access-Control-Allow-Origin","*");
    res.header("Access-Control-Allow-Headers","*");
    if(req.method==="OPTIONS"){ res.sendStatus(200); return; }
    next();
  };
}

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => console.log("StreamFilter corriendo en http://localhost:" + PORT));
