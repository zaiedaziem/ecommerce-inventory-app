// Resizes and re-encodes an image File in the browser, returning a base64 data URI small
// enough to store on the product document. Keep TARGET_BYTES under the backend's 500 KB cap.
const MAX_DIMENSION = 800;
const TARGET_BYTES = 300 * 1024;
const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.5, 0.4];

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image file'));
    };
    img.src = url;
  });
}

// Approximate decoded size of a base64 data URI.
function dataUriBytes(dataUri) {
  const base64 = dataUri.slice(dataUri.indexOf(',') + 1);
  return Math.floor((base64.length * 3) / 4);
}

export async function compressImage(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file');
  }

  const img = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);

  const ctx = canvas.getContext('2d');
  // White background so transparent PNGs don't turn black when encoded without alpha.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Prefer WebP; browsers that can't encode it silently return PNG, so fall back to JPEG.
  const supportsWebp = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  const mimeType = supportsWebp ? 'image/webp' : 'image/jpeg';

  let dataUri = '';
  for (const quality of QUALITY_STEPS) {
    dataUri = canvas.toDataURL(mimeType, quality);
    if (dataUriBytes(dataUri) <= TARGET_BYTES) {
      return dataUri;
    }
  }
  throw new Error('Image is too detailed to compress under 300 KB, please try another');
}
