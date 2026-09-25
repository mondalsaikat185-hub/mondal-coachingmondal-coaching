// Turns any photo the student picks into a small square WebP (default 256×256, ~10–30 KB)
// before it is sent to the server. Falls back to JPEG on browsers without WebP encoding.
export const PHOTO_MAX_CHARS = 200_000; // server rejects bigger data URLs

export async function compressPhoto(file: File, size = 256, quality = 0.72): Promise<string> {
  if (!file || !/^image\//.test(file.type)) throw new Error('শুধু ছবি (image) বেছে নিন।');
  if (file.size > 25 * 1024 * 1024) throw new Error('ছবিটা খুব বড় (25 MB-র বেশি)।');
  const bitmap = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('এই ফোনে ছবি ছোট করা যাচ্ছে না।');
  const w = (bitmap as any).width, h = (bitmap as any).height;
  const k = Math.max(size / w, size / h);
  const dw = w * k, dh = h * k;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size);
  ctx.drawImage(bitmap as any, (size - dw) / 2, (size - dh) / 2, dw, dh);
  if ((bitmap as any).close) try { (bitmap as any).close(); } catch (e) { /* ignore */ }
  let q = quality;
  let url = canvas.toDataURL('image/webp', q);
  if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', q); // old Safari
  while (url.length > PHOTO_MAX_CHARS && q > 0.3) {
    q -= 0.12;
    url = canvas.toDataURL(url.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg', q);
  }
  if (url.length > PHOTO_MAX_CHARS) throw new Error('ছবিটা ছোট করা গেল না, অন্য ছবি দিন।');
  return url;
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' } as any); } catch (e) { /* fall through */ }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('ছবিটা খোলা যাচ্ছে না (HEIC হলে JPG/PNG দিন)।')); };
    img.src = url;
  });
}

export function dataUrlKb(url: string): number { return Math.round((url.length * 0.75) / 1024); }
