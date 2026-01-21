# Sync Strategy for Solo User, Multi-Device

## Overview

This sync strategy is designed for a **solo user** with **multiple devices** where updates are done **sequentially** (one device at a time, not simultaneously).

## Key Principles

1. **Last-Write-Wins**: Based on `updated_at` timestamp
2. **Pull-First**: Always pull latest data before pushing local changes
3. **Timestamp-Based**: Only sync records changed since last sync
4. **Soft Deletes**: Sync `deleted_at` field for soft deletes
5. **Offline-First**: App works offline, syncs when online

## How It Works

### Sync Flow

```
1. Pull latest data from Supabase (updated after last sync)
2. Apply pulled data to local DB (last-write-wins)
3. Push local changes to Supabase (new/updated since last sync)
4. Update last sync timestamp
```

### Last-Write-Wins Strategy

- If a record exists in both local and remote:
  - Compare `updated_at` timestamps
  - Keep the version with the **newer** `updated_at`
  - If local is newer, it will be pushed in step 3
  - If remote is newer, it overwrites local

### Sequential Updates Benefit

Since you update one device at a time:
- ✅ Minimal conflicts (only if device was offline)
- ✅ Simple resolution (newer timestamp wins)
- ✅ No complex merge logic needed

## Usage

### Manual Sync

```typescript
import { syncNow } from "@/services/sync";

// Full sync (pull + push)
await syncNow();
```

### Auto-Sync on App Start

```typescript
import { syncOnStart } from "@/services/sync";

// In your main.ts or App.vue
syncOnStart();
```

### Auto-Sync on App Close

```typescript
import { syncOnClose } from "@/services/sync";

// Before app closes
window.addEventListener("beforeunload", () => {
  syncOnClose();
});
```

### Pull Only (Refresh Data)

```typescript
import { pullOnly } from "@/services/sync";

// Get latest data without uploading
await pullOnly();
```

### Push Only (Upload Changes)

```typescript
import { pushOnly } from "@/services/sync";

// Upload local changes without pulling
await pushOnly();
```

## Sync State

The sync state is stored in `localStorage`:
- `lastSyncAt`: ISO timestamp of last successful sync
- Used to determine which records need syncing

## Tables Sync Order

Tables are synced in dependency order:
1. `categories` (no dependencies)
2. `intervenants` (depends on categories)
3. `projects` (depends on intervenants)
4. `visits` (depends on projects)
5. `tasks` (depends on projects, visits, intervenants)
6. `task_photos` (depends on tasks)

## Image Sync

**Important**: Images should be synced separately using Supabase Storage:

1. **Upload image to Storage** first
2. **Get public URL** from Storage
3. **Save URL** in `task_photos.url` field
4. **Sync metadata** (task_photos table) normally

The sync service automatically excludes `image_blob` field when pushing to Supabase.

## Conflict Resolution

### Scenario 1: Device A offline, Device B makes changes
- Device A comes online → Pulls latest from B → No conflict ✅

### Scenario 2: Device A offline, makes changes, Device B also makes changes
- Device A comes online → Pulls B's changes → Compares timestamps → Newer wins ✅

### Scenario 3: Same record updated on both devices
- Last-write-wins based on `updated_at` timestamp ✅

## Best Practices

1. **Sync on app start**: Always pull latest data when opening app
2. **Sync before closing**: Push local changes before app closes
3. **Manual sync button**: Let user trigger sync manually if needed
4. **Handle errors gracefully**: App should work offline even if sync fails
5. **Show sync status**: Indicate to user when sync is in progress

## Limitations

- ⚠️ **No real-time sync**: Changes only sync when explicitly triggered
- ⚠️ **Last-write-wins**: Loses older changes if two devices edit same record
- ⚠️ **No conflict UI**: User doesn't see conflicts, newer version just wins

## Future Enhancements

If you need real-time sync or better conflict handling:
- Use Supabase Realtime subscriptions
- Implement operational transformation
- Add conflict resolution UI
- Track change history
