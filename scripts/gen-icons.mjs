// Genera icon-192.png y icon-512.png — PNG sólido azul corporativo con esquina
// verde, sin dependencias externas. Usa node:zlib para los chunks IDAT.
import { promises as fs } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = path.resolve(import.meta.dirname, "..");

// CRC-32 table para los chunks PNG
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[n] = c;
}
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// Pinta un cuadrado de tamaño N×N con color base + decoración esquina inferior derecha
function buildRaster(N) {
  const raster = Buffer.alloc(N * (1 + N * 3)); // filtro byte + RGB por fila
  const corner = Math.round(N * 0.65);
  const cornerSize = Math.round(N * 0.25);
  // Letra E aproximada — solo trazos horizontales centrales
  const letterPad = Math.round(N * 0.22);
  const letterW = Math.round(N * 0.30);
  const letterTop = Math.round(N * 0.22);
  const letterBot = Math.round(N * 0.78);
  const strokeH = Math.max(2, Math.round(N * 0.08));
  for (let y = 0; y < N; y++) {
    const rowStart = y * (1 + N * 3);
    raster[rowStart] = 0; // None filter
    for (let x = 0; x < N; x++) {
      let r = 0x0F, g = 0x17, b = 0x2A; // slate-900
      // Letra E (3 trazos horizontales + vertical izquierdo)
      const isLeftBar = x >= letterPad && x <= letterPad + Math.max(2, Math.round(N*0.06)) && y >= letterTop && y <= letterBot;
      const isTopBar = y >= letterTop && y <= letterTop + strokeH && x >= letterPad && x <= letterPad + letterW;
      const isMidBar = y >= Math.round(N*0.46) && y <= Math.round(N*0.46) + strokeH && x >= letterPad && x <= letterPad + Math.round(letterW*0.7);
      const isBotBar = y >= letterBot - strokeH && y <= letterBot && x >= letterPad && x <= letterPad + letterW;
      if (isLeftBar || isTopBar || isMidBar || isBotBar) {
        r = 0xFF; g = 0xFF; b = 0xFF;
      }
      // Esquina verde decorativa
      if (x >= corner && y >= corner && x < corner + cornerSize && y < corner + cornerSize) {
        r = 0x10; g = 0xB9; b = 0x81; // emerald-500
      }
      const i = rowStart + 1 + x * 3;
      raster[i] = r;
      raster[i+1] = g;
      raster[i+2] = b;
    }
  }
  return raster;
}

function buildPNG(N) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(N, 0);
  ihdr.writeUInt32BE(N, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raster = buildRaster(N);
  const compressed = zlib.deflateSync(raster);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

async function main() {
  const targets = [
    { size: 192, path: path.join(ROOT, 'icon-192.png') },
    { size: 512, path: path.join(ROOT, 'icon-512.png') }
  ];
  for (const t of targets) {
    const png = buildPNG(t.size);
    await fs.writeFile(t.path, png);
    console.log(`✓ ${path.basename(t.path)} (${t.size}×${t.size}, ${png.length} bytes)`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
