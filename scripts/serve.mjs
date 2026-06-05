// Dev server simple — sirve la raíz del proyecto sin build.
// Index.html mantiene los <script> individuales del bloque [BUNDLE], así que
// no necesitamos bundle en desarrollo. Solo un HTTP estático.

import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PORT = +process.env.PORT || 5173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".ico":  "image/x-icon"
};

createServer(async (req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const full = path.join(ROOT, urlPath);
  if (!full.startsWith(ROOT)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }
  try {
    const data = await fs.readFile(full);
    const ext = path.extname(full);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("Not found: " + urlPath);
  }
}).listen(PORT, () => {
  console.log(`📡 Dev server: http://localhost:${PORT}`);
});
