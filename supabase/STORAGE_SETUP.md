# Supabase Storage Setup Guide

## Step 1: Create the Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Configure the bucket:
   - **Name**: `task-photos`
   - **Public bucket**: Choose based on your needs:
     - ✅ **Public**: Photos are accessible via public URLs (no auth required to view)
     - ❌ **Private**: Photos require authentication to access
   - **File size limit**: Set appropriate limit (e.g., 10MB)
   - **Allowed MIME types**: `image/*` (allows all image types: jpeg, png, webp, gif, svg, etc.)

5. Click **"Create bucket"**

## Step 2: Set Up Storage Policies

**IMPORTANT**: You must set up storage policies for uploads to work. The app uses anonymous access, so policies must allow `anon` role.

### Quick Setup (Recommended)

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the entire contents of `supabase/storage-setup.sql`
3. Click **Run** to execute the SQL
4. This will:
   - Enable RLS on storage.objects
   - Drop any existing conflicting policies
   - Create policies that allow both `anon` and `authenticated` users to upload, read, update, and delete photos

### Manual Setup (Alternative)

If you prefer to set up policies via the UI:

1. Go to **Storage** > **Policies** > **task-photos**
2. Create policies for:
   - **INSERT** (upload): Allow `anon` and `authenticated` roles, condition: `bucket_id = 'task-photos'`
   - **SELECT** (read): Allow `anon` and `authenticated` roles, condition: `bucket_id = 'task-photos'`
   - **UPDATE**: Allow `anon` and `authenticated` roles, condition: `bucket_id = 'task-photos'`
   - **DELETE**: Allow `anon` and `authenticated` roles, condition: `bucket_id = 'task-photos'`

**Note**: The bucket can be either public or private - the policies will work for both. Public buckets allow direct URL access, private buckets require authentication to view.

## Step 3: Update Your Application Code

You'll need to update your code to:

1. **Upload images to Supabase Storage** instead of storing as blobs
2. **Store the public URL** in the `task_photos.url` field
3. **Store the storage path** in the `task_photos.storage_path` field (optional, for easier deletion)

### Example Upload Code (TypeScript)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

async function uploadTaskPhoto(taskId: string, photoId: string, file: File) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${taskId}/${photoId}.${fileExt}`
  const filePath = `task-photos/${fileName}`

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('task-photos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('task-photos')
    .getPublicUrl(filePath)

  // Save to database
  await supabase.from('task_photos').insert({
    id: photoId,
    task_id: taskId,
    url: publicUrl,
    storage_path: filePath
  })

  return publicUrl
}

async function deleteTaskPhoto(photoId: string, storagePath: string) {
  // Delete from storage
  await supabase.storage
    .from('task-photos')
    .remove([storagePath])

  // Delete from database (or soft delete)
  await supabase
    .from('task_photos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', photoId)
}
```

## Benefits of Using Supabase Storage

- ✅ **Better performance**: Images served via CDN
- ✅ **Scalability**: No database bloat
- ✅ **Cost-effective**: Storage is cheaper than database storage
- ✅ **Automatic optimization**: Can use Supabase Image Transformations
- ✅ **Direct uploads**: Can upload directly from client to storage

## Migration from Blob Storage

If you're migrating from IndexedDB blob storage:

1. Export all images from IndexedDB
2. Upload them to Supabase Storage
3. Update database records with the new URLs
4. Remove the `image_blob` field from your code
