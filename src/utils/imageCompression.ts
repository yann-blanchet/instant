/**
 * Image compression utilities
 * Compresses images locally before storing/uploading to reduce storage and bandwidth
 * Uses Canvas API for native compression - no external dependencies
 */

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
  useWebWorker: false, // Canvas API is synchronous, not suitable for web workers
};

/**
 * Compress an image using Canvas API
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
    console.log(`[Image Compression] Skipping compression: ${originalSizeMB.toFixed(2)}MB (already under ${opts.maxSizeMB}MB target)`);
    return file instanceof Blob ? file : await file.arrayBuffer().then(b => new Blob([b], { type: file.type || 'image/jpeg' }));
  }
  
  console.log(`[Image Compression] Starting compression: ${originalSizeMB.toFixed(2)}MB`);
  
  try {
    // Read the image file
    const imageUrl = URL.createObjectURL(file);
    const img = new Image();
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        try {
          URL.revokeObjectURL(imageUrl);
          
          // Calculate new dimensions
          let width = img.width;
          let height = img.height;
          
          if (opts.maxWidthOrHeight && (width > opts.maxWidthOrHeight || height > opts.maxWidthOrHeight)) {
            const ratio = Math.min(opts.maxWidthOrHeight / width, opts.maxWidthOrHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          
          // Create canvas and draw image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Could not get canvas context');
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Compress with quality reduction
          let quality = opts.initialQuality || 0.8;
          let compressedBlob: Blob | null = null;
          
          // Try decreasing quality until we hit the target size
          const maxIterations = 5;
          let iteration = 0;
          
          const tryCompress = (q: number): Promise<Blob> => {
            return new Promise((resolveBlob) => {
              canvas.toBlob(
                (blob) => {
                  if (!blob) throw new Error('Canvas to blob failed');
                  resolveBlob(blob);
                },
                'image/jpeg',
                q
              );
            });
          };
          
          // Progressively reduce quality until target size is reached
          (async () => {
            while (iteration < maxIterations && quality > 0.1) {
              compressedBlob = await tryCompress(quality);
              const compressedSize = compressedBlob.size / 1024 / 1024;
              
              if (compressedSize <= opts.maxSizeMB!) {
                break;
              }
              
              quality -= 0.15; // Reduce quality by 15% each iteration
              iteration++;
            }
            
            if (!compressedBlob) {
              throw new Error('Failed to compress image');
            }
            
            const compressedSize = compressedBlob.size;
            const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);
            console.log(`[Image Compression] Completed: ${(compressedSize / 1024 / 1024).toFixed(2)}MB (${reduction}% reduction)`);
            
            resolve(compressedBlob);
          })();
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        reject(new Error('Failed to load image'));
      };
      
      img.src = imageUrl;
    });
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
