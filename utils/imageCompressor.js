const sharp = require('sharp');

async function compressImage(inputBuffer, options = {}) {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 75,
    format = 'jpeg'
  } = options;

  try {
    const metadata = await sharp(inputBuffer).metadata();

    let pipeline = sharp(inputBuffer)
      .rotate()
      .resize({
        width: maxWidth,
        height: maxHeight,
        fit: 'inside',
        withoutEnlargement: true
      });

    if (format === 'jpeg' || format === 'jpg') {
      pipeline = pipeline.jpeg({
        quality,
        progressive: true,
        mozjpeg: true
      });
    } else if (format === 'webp') {
      pipeline = pipeline.webp({ quality });
    } else if (format === 'png') {
      pipeline = pipeline.png({ quality: Math.min(quality, 100), compressionLevel: 9 });
    }

    pipeline = pipeline.withMetadata({ orientation: undefined });

    const outputBuffer = await pipeline.toBuffer();

    console.log(
      `[IMAGE] Compressed: ${metadata.width}x${metadata.height} ${metadata.format} ` +
      `(${(inputBuffer.length / 1024).toFixed(1)}KB) → ` +
      `${maxWidth}x${maxHeight}max ${format} ` +
      `(${(outputBuffer.length / 1024).toFixed(1)}KB) ` +
      `[${Math.round((1 - outputBuffer.length / inputBuffer.length) * 100)}% saved]`
    );

    return outputBuffer;
  } catch (err) {
    console.error('[IMAGE] Compression failed:', err.message);
    throw err;
  }
}

module.exports = { compressImage };
