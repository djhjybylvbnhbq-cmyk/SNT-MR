import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(2, 9); // color type 2: RGB
  ihdrData.writeUInt8(0, 10); // compression method 0
  ihdrData.writeUInt8(0, 11); // filter method 0
  ihdrData.writeUInt8(0, 12); // interlace method 0

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image scanlines: filter byte 0 + RGB
  const rawData = Buffer.alloc(height * (1 + width * 3));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // No filter
    for (let x = 0; x < width; x++) {
      // Draw border / gradient / center emblem shape
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const isInner = dist < width * 0.38;
      const isCorner = Math.abs(dx) > width * 0.44 && Math.abs(dy) > height * 0.44;

      let pixelR = r;
      let pixelG = g;
      let pixelB = b;

      if (isInner) {
        // Gold / emerald center emblem
        pixelR = Math.min(255, r + 30);
        pixelG = Math.min(255, g + 60);
        pixelB = Math.min(255, b + 20);
      } else if (isCorner) {
        pixelR = Math.max(0, r - 30);
        pixelG = Math.max(0, g - 30);
        pixelB = Math.max(0, b - 20);
      }

      rawData[offset++] = pixelR;
      rawData[offset++] = pixelG;
      rawData[offset++] = pixelB;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);

  const crc = crc32(body);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([length, body, crcBuf]);
}

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Generate icons
fs.writeFileSync('./public/pwa-192x192.png', createPNG(192, 192, 21, 128, 61));
fs.writeFileSync('./public/pwa-512x512.png', createPNG(512, 512, 21, 128, 61));
fs.writeFileSync('./public/pwa-maskable-512x512.png', createPNG(512, 512, 21, 128, 61));
fs.writeFileSync('./public/apple-touch-icon.png', createPNG(180, 180, 21, 128, 61));
console.log('Icons generated successfully!');
