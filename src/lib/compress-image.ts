/**
 * Client-side image downscaling/compression.
 *
 * Used to keep background uploads under a hard byte limit: if a chosen image is
 * larger than `maxBytes`, we re-encode it (scaling dimensions + dropping quality)
 * until it fits. If it still can't fit, the caller should refuse the upload.
 */

const MAX_DIMENSION = 2560; // cap longest edge — plenty for a full-screen background

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = src;
  });
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function encode(
  img: HTMLImageElement,
  width: number,
  height: number,
  quality: number
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas not supported"));
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encode failed"))),
      // WebP keeps transparency and compresses well; backend whitelists it.
      "image/webp",
      quality
    );
  });
}

/**
 * Return a File no larger than `maxBytes`. Files already under the limit are
 * returned untouched. Throws if the image cannot be brought under the limit.
 */
export async function compressImageToLimit(
  file: File,
  maxBytes: number
): Promise<File> {
  if (file.size <= maxBytes) return file;

  const img = await loadImage(await readAsDataURL(file));

  let scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  let width = img.width * scale;
  let height = img.height * scale;

  let quality = 0.9;
  let blob = await encode(img, width, height, quality);

  // First drop quality, then progressively shrink dimensions.
  while (blob.size > maxBytes && quality > 0.4) {
    quality -= 0.1;
    blob = await encode(img, width, height, quality);
  }
  while (blob.size > maxBytes && Math.max(width, height) > 640) {
    width *= 0.8;
    height *= 0.8;
    blob = await encode(img, width, height, 0.7);
  }

  if (blob.size > maxBytes) {
    throw new Error("Image is too large to compress under the limit");
  }

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.webp`, { type: "image/webp" });
}
