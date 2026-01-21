/**
 * Image compression utilities
 * Compresses images locally before storing/uploading to reduce storage and bandwidth
 */

import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  initialQuality?: number;
  useWebWorker?: boolean;
  fileType?: string;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxSizeMB: 0.5, // Target 500KB max file size (optimized for cost)
  maxWidthOrHeight: 1920, // Limit to 1920px on longest side (good for most displays)
  initialQuality: 0.80, // 80% quality (good balance - slight reduction for better compression)
  useWebWorker: true, // Use Web Worker to avoid blocking UI
};

/**
 * Compress an image file
 * @param file - The image file to compress
 * @param options - Compression options (optional)
 * @returns Compressed file as Blob
 */
export async function compressImage(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const originalSize = file.size;
  const originalSizeMB = originalSize / 1024 / 1024;
  
  // Skip compression if image is already small enough (faster)
  if (originalSizeMB <= opts.maxSizeMB! * 1.1) {
    // Image is already close to target size, skip compression
    console.log(`[Image Compression] Skipping compression: ${originalSizeMB.toFixed(2)}MB (already under ${opts.maxSizeMB}MB target)`);
    return file instanceof Blob ? file : await file.arrayBuffer().then(b => new Blob([b], { type: file.type || 'image/jpeg' }));
  }
  
  console.log(`[Image Compression] Starting compression: ${originalSizeMB.toFixed(2)}MB`);
  
  // If it's already a Blob, convert to File for the library
  const imageFile = file instanceof File 
    ? file 
    : new File([file], 'image.jpg', { type: file.type || 'image/jpeg' });

  try {
    const compressedFile = await imageCompression(imageFile, {
      maxSizeMB: opts.maxSizeMB,
      maxWidthOrHeight: opts.maxWidthOrHeight,
      initialQuality: opts.initialQuality,
      useWebWorker: opts.useWebWorker,
      fileType: opts.fileType,
      maxIteration: 5, // Limit iterations for faster compression (default is 10)
    });

    // The library returns a File, convert to Blob for consistency
    // File extends Blob, but we want a pure Blob
    const compressedBlob = compressedFile instanceof File
      ? new Blob([compressedFile], { type: compressedFile.type })
      : compressedFile instanceof Blob
      ? compressedFile
      : await compressedFile.arrayBuffer().then(b => new Blob([b], { type: compressedFile.type || 'image/jpeg' }));
    
    const compressedSize = compressedBlob.size;
    const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    console.log(`[Image Compression] Completed: ${(compressedSize / 1024 / 1024).toFixed(2)}MB (${reduction}% reduction)`);
    
    return compressedBlob;
  } catch (error) {
    console.error('[Image Compression] Failed:', error);
    // Return original file if compression fails
    const originalBlob = file instanceof Blob 
      ? file 
      : await file.arrayBuffer().then(b => new Blob([b], { type: file.type }));
    console.warn('[Image Compression] Using original file (compression failed)');
    return originalBlob;
  }
}

/**
 * Compress image with progress callback
 * Useful for showing upload progress
 */
export async function compressImageWithProgress(
  file: File | Blob,
  onProgress?: (percent: number) => void,
  options: CompressionOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const imageFile = file instanceof File 
    ? file 
    : new File([file], 'image.jpg', { type: file.type || 'image/jpeg' });

  try {
    const compressedFile = await imageCompression(imageFile, {
      maxSizeMB: opts.maxSizeMB,
      maxWidthOrHeight: opts.maxWidthOrHeight,
      initialQuality: opts.initialQuality,
      useWebWorker: opts.useWebWorker,
      fileType: opts.fileType,
      onProgress: onProgress,
    });

    // The library returns a File, convert to Blob for consistency
    const compressedBlob = compressedFile instanceof File
      ? new Blob([compressedFile], { type: compressedFile.type })
      : compressedFile instanceof Blob
      ? compressedFile
      : await compressedFile.arrayBuffer().then(b => new Blob([b], { type: compressedFile.type || 'image/jpeg' }));
    
    return compressedBlob;
  } catch (error) {
    console.error('Image compression failed:', error);
    return file instanceof Blob ? file : await file.arrayBuffer().then(b => new Blob([b], { type: file.type }));
  }
}

/**
 * Get Supabase Image Transformation URL
 * Use this for serving optimized/thumbnail versions of images
 * 
 * @param storageUrl - The public URL from Supabase Storage
 * @param options - Transformation options
 * @returns Transformed image URL
 * 
 * @example
 * // Thumbnail (200x200)
 * getImageTransformUrl(photoUrl, { width: 200, height: 200 })
 * 
 * // Medium size (800px width)
 * getImageTransformUrl(photoUrl, { width: 800 })
 * 
 * // WebP format with quality
 * getImageTransformUrl(photoUrl, { width: 1920, format: 'webp', quality: 80 })
 */
export function getImageTransformUrl(
  storageUrl: string,
  options: {
    width?: number;
    height?: number;
    format?: 'webp' | 'jpeg' | 'png';
    quality?: number;
  } = {}
): string {
  if (!storageUrl) return storageUrl;
  
  // Supabase uses Imgix for image transformations
  // Format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]?[params]
  
  const url = new URL(storageUrl);
  const params = new URLSearchParams();
  
  if (options.width) {
    params.set('width', options.width.toString());
  }
  if (options.height) {
    params.set('height', options.height.toString());
  }
  if (options.format) {
    params.set('format', options.format);
  }
  if (options.quality) {
    params.set('quality', options.quality.toString());
  }
  
  // If we have transformation params, add them
  if (params.toString()) {
    // Supabase Storage URLs can be transformed by adding query params
    // But we need to check if it's a Supabase Storage URL first
    if (url.hostname.includes('supabase.co') && url.pathname.includes('/storage/v1/object/public/')) {
      // Add transformation params
      const existingParams = new URLSearchParams(url.search);
      params.forEach((value, key) => {
        existingParams.set(key, value);
      });
      url.search = existingParams.toString();
      return url.toString();
    }
  }
  
  return storageUrl;
}

/**
 * Get thumbnail URL for an image
 * Convenience function for common thumbnail size
 */
export function getThumbnailUrl(storageUrl: string, size: number = 200): string {
  return getImageTransformUrl(storageUrl, {
    width: size,
    height: size,
    format: 'webp',
    quality: 75,
  });
}

/**
 * Get optimized URL for display
 * Convenience function for common display size
 */
export function getDisplayUrl(storageUrl: string, maxWidth: number = 1920): string {
  return getImageTransformUrl(storageUrl, {
    width: maxWidth,
    format: 'webp',
    quality: 85,
  });
}
