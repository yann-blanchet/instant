# Image Compression Settings Guide

## Current Settings (Cost-Optimized)

- **Max file size**: 500KB (0.5MB)
- **Max dimensions**: 1920px (longest side)
- **Quality**: 80%
- **Format**: JPEG (automatic)

## Cost Analysis

### With 500KB per image:
- **Free plan (1GB)**: ~2,000 images
- **Pro plan (100GB)**: ~200,000 images
- **Over 100GB**: $0.021/GB/month = ~$1.05/month per 50GB of images

### Comparison with 800KB:
- **Free plan**: 1,250 images → **2,000 images** (+60% more)
- **Pro plan**: 125,000 images → **200,000 images** (+60% more)
- **Cost savings**: ~37.5% reduction in storage costs

## Quality vs Size Trade-offs

### Current (500KB, 80% quality):
- ✅ **Excellent** for most use cases
- ✅ Good for mobile viewing
- ✅ Good for PDF exports
- ✅ Minimal visible quality loss
- ✅ Significant cost savings

### Alternative Settings

#### High Quality (800KB, 85% quality):
```typescript
{
  maxSizeMB: 0.8,
  maxWidthOrHeight: 1920,
  initialQuality: 0.85,
}
```
- Better for professional photography
- Use if quality is more important than cost

#### Aggressive (300KB, 75% quality):
```typescript
{
  maxSizeMB: 0.3,
  maxWidthOrHeight: 1600,
  initialQuality: 0.75,
}
```
- Maximum cost savings
- Slight quality reduction
- Good for thumbnails/previews

#### Balanced (500KB, 80% quality) - **RECOMMENDED**:
```typescript
{
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1920,
  initialQuality: 0.80,
}
```
- Best balance of quality and cost
- Current default setting

## How to Change Settings

### Option 1: Change Default (affects all images)
Edit `src/utils/imageCompression.ts`:
```typescript
const DEFAULT_OPTIONS: CompressionOptions = {
  maxSizeMB: 0.5,        // Change this
  maxWidthOrHeight: 1920, // Or this
  initialQuality: 0.80,   // Or this
  useWebWorker: true,
};
```

### Option 2: Per-use-case (specific images)
In `TaskCreateView.vue` or `sync.ts`, override options:
```typescript
// High quality for important photos
const highQuality = await compressImage(file, {
  maxSizeMB: 0.8,
  initialQuality: 0.90,
});

// Aggressive for thumbnails
const thumbnail = await compressImage(file, {
  maxSizeMB: 0.2,
  maxWidthOrHeight: 800,
  initialQuality: 0.70,
});
```

## Testing Quality

1. Add a test photo
2. Check console logs for compression stats
3. Compare original vs compressed visually
4. Adjust settings if needed

## Recommendations by Use Case

### Site Inspection Photos (Current Use Case)
- **Recommended**: 500KB, 80% quality ✅
- Good balance for field photos
- Sufficient detail for reports
- Cost-effective for many photos

### Professional Photography
- **Recommended**: 800KB-1MB, 85-90% quality
- Higher quality needed
- Fewer photos typically

### Thumbnails/Previews
- **Recommended**: 200-300KB, 70-75% quality
- Smaller size for lists
- Faster loading

## Monitoring Storage Usage

Check your Supabase dashboard:
1. Go to **Storage** → **task-photos** bucket
2. View total storage used
3. Calculate: `total_storage / 0.5MB = approximate_image_count`
4. Monitor monthly costs in billing

## Future Optimizations

1. **WebP format**: Better compression (30% smaller than JPEG)
   - Requires browser support check
   - Can be added as fallback

2. **Progressive JPEG**: Better perceived quality
   - Loads faster
   - Better user experience

3. **Multiple sizes**: Store thumbnail + full size
   - Thumbnail: 200KB for lists
   - Full: 500KB for viewing
   - Use Supabase Image Transformations

4. **Lazy compression**: Compress in background
   - Show original immediately
   - Compress async
   - Update when done
