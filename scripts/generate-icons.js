import fs from 'fs';
import zlib from 'zlib';

function createPng(width, height, drawFn) {
  // Simple uncompressed or deflated truecolor PNG generator
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression: 0
  ihdr[11] = 0; // Filter: 0
  ihdr[12] = 0; // Interlace: 0

  function createChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);

    // CRC32 calculation
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeInt32BE(crc, 8 + len);
    return buf;
  }

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 table
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ -1;
}

function appIconDrawer(x, y, w, h) {
  // Normalize 0 to 1
  const nx = x / w;
  const ny = y / h;

  // Background: #1B4FD8 (27, 79, 216) with subtle gradient
  const rBg = Math.round(27 + 10 * (1 - ny));
  const gBg = Math.round(79 + 20 * (1 - ny));
  const bBg = Math.round(216 + 25 * (1 - ny));

  // House body bounds: x in [0.25, 0.75], y in [0.42, 0.78]
  // Roof triangle: apex at (0.5, 0.22), left at (0.22, 0.44), right at (0.78, 0.44)
  let isRoof = false;
  if (ny >= 0.22 && ny <= 0.44) {
    const progress = (ny - 0.22) / 0.22; // 0 at apex, 1 at base
    const halfWidth = progress * 0.28;
    if (Math.abs(nx - 0.5) <= halfWidth) {
      isRoof = true;
    }
  }

  const isHouseBody = nx >= 0.25 && nx <= 0.75 && ny >= 0.42 && ny <= 0.78;

  // Door: nx in [0.44, 0.56], ny in [0.58, 0.78]
  const isDoor = nx >= 0.44 && nx <= 0.56 && ny >= 0.58 && ny <= 0.78;

  // Windows: left [0.32, 0.40] x [0.48, 0.56], right [0.60, 0.68] x [0.48, 0.56]
  const isWin1 = nx >= 0.32 && nx <= 0.40 && ny >= 0.48 && ny <= 0.56;
  const isWin2 = nx >= 0.60 && nx <= 0.68 && ny >= 0.48 && ny <= 0.56;

  // Green coin badge: center at (0.68, 0.35), radius 0.10
  const dx = (nx - 0.68);
  const dy = (ny - 0.35);
  const isCoin = (dx * dx + dy * dy) <= (0.09 * 0.09);
  const isCoinBorder = (dx * dx + dy * dy) <= (0.105 * 0.105) && !isCoin;

  if (isCoinBorder) {
    return [255, 255, 255, 255];
  }
  if (isCoin) {
    // Emerald green #059669 (5, 150, 105)
    return [5, 150, 105, 255];
  }
  if (isDoor) {
    // Emerald door
    return [16, 185, 129, 255];
  }
  if (isWin1 || isWin2) {
    return [27, 79, 216, 255];
  }
  if (isRoof || isHouseBody) {
    return [255, 255, 255, 255];
  }

  return [rBg, gBg, bBg, 255];
}

const p192 = createPng(192, 192, appIconDrawer);
fs.writeFileSync('./public/pwa-192x192.png', p192);

const p512 = createPng(512, 512, appIconDrawer);
fs.writeFileSync('./public/pwa-512x512.png', p512);
fs.writeFileSync('./public/pwa-maskable-512x512.png', p512);
fs.writeFileSync('./public/apple-touch-icon.png', createPng(180, 180, appIconDrawer));

console.log('Icons generated successfully!');
