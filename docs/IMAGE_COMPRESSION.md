# Image Compression Strategy

This document explains the image compression strategy used in the application.

## Overview

The app uses a **hybrid compression approach**:
1. **Local compression** before storing/uploading (reduces storage and bandwidth)
2. **Supabase Image Transformations** for serving optimized versions (optional, for future use)

## Local Compression

### When Compression Happens

1. **When adding a photo**: Images are compressed immediately when the user adds them (in `TaskCreateView.vue`)
2. **During sync**: Images are compressed again before uploading to Supabase Storage (in `sync.ts`)

### Compression Settings

Default settings (configurable in `src/utils/imageCompression.ts`):
- **Max file size**: 1MB
- **Max dimensions**: 1920px on longest side
- **Quality**: 85% (good balance between quality and file size)
- **Web Worker**: Enabled (non-blocking compression)

### Benefits

- ✅ **Reduced storage costs**: Smaller files in IndexedDB and Supabase Storage
- ✅ **Faster uploads**: Less bandwidth needed during sync
- ✅ **Better offline experience**: More photos can be stored locally
- ✅ **Non-blocking**: Uses Web Workers to avoid freezing the UI

## Supabase Image Transformations (Future)

Supabase provides image transformations via Imgix. You can use the helper functions in `src/utils/imageCompression.ts`:

```typescript
import { getThumbnailUrl, getDisplayUrl } from '../utils/imageCompression';

// Get thumbnail (200x200, WebP, 75% quality)
const thumbnailUrl = getThumbnailUrl(photoUrl, 200);

// Get optimized display version (1920px width, WebP, 85% quality)
const displayUrl = getDisplayUrl(photoUrl, 1920);
```

### Example Usage

```vue
<template>
  <!-- Thumbnail in list -->
  <img :src="getThumbnailUrl(photo.url)" alt="Photo thumbnail" />
  
  <!-- Full size in modal -->
  <img :src="getDisplayUrl(photo.url)" alt="Photo" />
</template>

<script setup>
import { getThumbnailUrl, getDisplayUrl } from '../utils/imageCompression';
</script>
```

## Customizing Compression

You can customize compression settings per use case:

```typescript
import { compressImage } from '../utils/imageCompression';

// High quality (for important photos)
const highQuality = await compressImage(file, {
  maxSizeMB: 2,
  maxWidthOrHeight: 2560,
  initialQuality: 0.95,
});

// Low quality (for thumbnails/previews)
const lowQuality = await compressImage(file, {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 800,
  initialQuality: 0.7,
});
```

## Technical Details

### Library Used

- **browser-image-compression**: Client-side image compression library
- Uses Canvas API and Web Workers
- Supports JPEG, PNG, WebP, BMP
- Maintains aspect ratio automatically

### Compression Algorithm

1. Resizes image if dimensions exceed `maxWidthOrHeight`
2. Compresses using JPEG/WebP quality settings
3. Iteratively reduces quality until file size is under `maxSizeMB`
4. Returns compressed Blob

### Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Uses OffscreenCanvas where available
- Falls back to regular Canvas API
- Web Workers supported in all modern browsers

## Performance Considerations

- **Compression time**: Typically 100-500ms for a 5MB photo
- **Memory usage**: Temporary memory spike during compression
- **UI blocking**: None (uses Web Workers)
- **File size reduction**: Typically 70-90% reduction (5MB → 0.5-1.5MB)

## Future Improvements

1. **Progressive compression**: Compress in background, show original immediately
2. **Format detection**: Automatically use WebP when supported
3. **Adaptive quality**: Adjust quality based on image content
4. **Batch compression**: Compress multiple images in parallel
5. **Cache compressed versions**: Store multiple sizes for different use cases
