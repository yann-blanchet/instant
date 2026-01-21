import { supabase } from "../supabase";
import { db } from "../db";
import type { Project, Task, Visit, TaskPhoto, Intervenant, Category } from "../db/types";

/**
 * Sync strategy for solo user, multi-device, sequential updates:
 * - Pull: Fetch records updated after last sync timestamp
 * - Push: Upload local changes (new/updated since last sync)
 * - Last-write-wins: Use updated_at timestamp to resolve conflicts
 * - Soft deletes: Sync deleted_at field
 */

interface SyncState {
  lastSyncAt: string | null;
}

const SYNC_STATE_KEY = "sync_state";

function getSyncState(): SyncState {
  const stored = localStorage.getItem(SYNC_STATE_KEY);
  return stored ? JSON.parse(stored) : { lastSyncAt: null };
}

function setSyncState(state: SyncState) {
  localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state));
}

/**
 * Clear sync state - forces full sync on next run
 */
export function clearSyncState(): void {
  localStorage.removeItem(SYNC_STATE_KEY);
}

/**
 * Pull latest data from Supabase
 * Fetches records updated after last sync timestamp
 */
async function pullFromSupabase<T extends { id: string; updated_at: string }>(
  table: string,
  lastSyncAt: string | null
): Promise<T[]> {
  if (!supabase) {
    console.warn("Supabase not configured. Skipping pull.");
    return [];
  }

  let query = supabase
    .from(table)
    .select("*")
    .is("deleted_at", null) // Only get non-deleted records
    .order("updated_at", { ascending: false });

  // If we have a last sync time, only get records updated after that
  if (lastSyncAt) {
    query = query.gt("updated_at", lastSyncAt);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Pull failed for ${table}:`, error);
    console.error(`Query details: table=${table}, lastSyncAt=${lastSyncAt}`);
    return [];
  }

  if (data && data.length > 0) {
    console.log(`  → Pulled ${data.length} records from ${table}`);
  }

  return (data || []) as T[];
}

/**
 * Pull deleted records (soft deletes)
 */
async function pullDeletes<T extends { id: string; updated_at: string }>(
  table: string,
  lastSyncAt: string | null
): Promise<string[]> {
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from(table)
    .select("id")
    .not("deleted_at", "is", null)
    .order("updated_at", { ascending: false });

  if (lastSyncAt) {
    query = query.gt("updated_at", lastSyncAt);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Pull deletes failed for ${table}:`, error);
    return [];
  }

  return (data || []).map((row) => row.id);
}

/**
 * Push local changes to Supabase
 * Uploads records that are new or updated locally
 */
async function pushToSupabase<T extends { id: string; updated_at: string }>(
  table: string,
  lastSyncAt: string | null
): Promise<number> {
  if (!supabase) {
    console.warn("Supabase not configured. Skipping push.");
    return;
  }

  // Get all local records
  const localRecords = await db.table(table).toArray() as T[];

  // Filter to records that need syncing:
  // - If no lastSyncAt (first sync or force): push everything
  // - Otherwise: only records updated/deleted after last sync
  const recordsToSync = lastSyncAt
    ? localRecords.filter(
        (record) => {
          // Include if:
          // - No updated_at (new record)
          // - Updated after last sync
          // - Deleted after last sync
          // - Or if updated_at is missing/invalid, include it to be safe
          if (!record.updated_at) return true;
          if (record.updated_at > lastSyncAt) return true;
          if (record.deleted_at && record.deleted_at > lastSyncAt) return true;
          return false;
        }
      )
    : localRecords; // First sync or force: push everything

  if (recordsToSync.length === 0) {
    return 0;
  }
  

  // Map and clean records for Supabase
  const recordsForUpload = recordsToSync.map((record) => {
    const { image_blob, ...rest } = record as any;
    
    // Remove fields that don't exist in Supabase schema
    // intervenants: remove 'color' (color is on categories, not intervenants)
    if (table === 'intervenants') {
      delete rest.color;
    }
    
    // visits: remove 'comment' (we removed this field)
    if (table === 'visits') {
      delete rest.comment;
    }
    
    // tasks: map old field names to new ones
    if (table === 'tasks') {
      // Map text_list -> observations (if text_list exists and observations doesn't)
      if (rest.text_list && !rest.observations) {
        rest.observations = rest.text_list;
      }
      delete rest.text_list;
      
      // Map photo_list -> photo_ids (if photo_list exists and photo_ids doesn't)
      if (rest.photo_list && !rest.photo_ids) {
        rest.photo_ids = rest.photo_list;
      }
      delete rest.photo_list;
    }
    
    // task_photos: skip records with null url (they need to be uploaded to Storage first)
    // These records can't be synced until images are uploaded to Supabase Storage
    if (table === 'task_photos' && !rest.url && !rest.storage_path) {
      return null;
    }
    
    // Ensure UUIDs are strings (not objects)
    if (rest.id && typeof rest.id !== 'string') {
      rest.id = String(rest.id);
    }
    
    // Ensure foreign keys are strings or null
    Object.keys(rest).forEach(key => {
      if (key.endsWith('_id') && rest[key] && typeof rest[key] !== 'string') {
        rest[key] = String(rest[key]);
      }
    });
    
    return rest;
  }).filter(record => record !== null); // Remove null records (if any were skipped)

  if (recordsForUpload.length === 0) {
    return 0;
  }

  const { error } = await supabase.from(table).upsert(recordsForUpload, {
    onConflict: "id",
  });

  if (error) {
    console.error(`Push failed for ${table}:`, error);
    throw error;
  }

  return recordsForUpload.length;
}

/**
 * Apply pulled data to local database
 * Uses last-write-wins strategy based on updated_at
 */
async function applyPulledData<T extends { id: string; updated_at: string }>(
  table: string,
  pulledData: T[],
  deletedIds: string[]
): Promise<void> {
  // Apply soft deletes
  for (const id of deletedIds) {
    const existing = await db.table(table).get(id);
    if (existing) {
      await db.table(table).update(id, {
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Partial<T>);
    }
  }

  // Apply updates (last-write-wins)
  for (const record of pulledData) {
    const existing = await db.table(table).get(record.id);
    
    // If record doesn't exist locally, or server version is newer, use server version
    if (!existing || !existing.updated_at || record.updated_at >= existing.updated_at) {
      await db.table(table).put(record);
    }
    // Otherwise, keep local version (will be pushed in next sync)
  }
}

/**
 * Full sync: Pull from Supabase, then push local changes
 * This ensures we get latest data first, then upload our changes
 * 
 * @param forceFullSync - If true, ignores lastSyncAt and syncs everything
 */
export async function syncNow(forceFullSync: boolean = false): Promise<void> {
  if (!supabase) {
    console.warn("Supabase not configured. Skipping sync.");
    return;
  }

  const state = forceFullSync ? { lastSyncAt: null } : getSyncState();
  const syncStartTime = new Date().toISOString();

  const tables = [
    "categories",
    "intervenants",
    "projects",
    "visits",
    "tasks",
    "task_photos",
  ] as const;

  try {
    let pulledCount = 0;
    let pushedCount = 0;

    // Step 1: Pull latest data from Supabase (in dependency order)
    for (const table of tables) {
      const pulledData = await pullFromSupabase(table, state.lastSyncAt);
      const deletedIds = await pullDeletes(table, state.lastSyncAt);
      
      if (pulledData.length > 0 || deletedIds.length > 0) {
        await applyPulledData(table, pulledData, deletedIds);
        pulledCount += pulledData.length;
        if (pulledData.length > 0) {
          console.log(`  → ${table}: ${pulledData.length} pulled`);
        }
      }
    }

    // Step 2: Push local changes to Supabase
    for (const table of tables) {
      try {
        const count = await pushToSupabase(table, state.lastSyncAt);
        if (count) {
          pushedCount += count;
          console.log(`  → ${table}: ${count} pushed`);
        }
      } catch (error) {
        console.error(`  ✗ ${table}: push failed`, error);
        // Continue with other tables even if one fails
      }
    }

    // Step 3: Update sync state
    setSyncState({ lastSyncAt: syncStartTime });
    
    // Summary log
    if (pulledCount > 0 || pushedCount > 0) {
      console.log(`✓ Sync: ${pulledCount} pulled, ${pushedCount} pushed`);
    }
  } catch (error) {
    console.error("Sync failed:", error);
    throw error;
  }
}

/**
 * Pull-only sync: Useful for refreshing data without uploading
 */
export async function pullOnly(): Promise<void> {
  if (!supabase) {
    console.warn("Supabase not configured. Skipping pull.");
    return;
  }

  const state = getSyncState();
  
  // Check if local database is empty - if so, do a full pull (ignore lastSyncAt)
  const localProjectCount = await db.projects.count();
  const isEmpty = localProjectCount === 0;
  
  // If database is empty, ignore lastSyncAt to pull everything
  const effectiveLastSyncAt = isEmpty ? null : state.lastSyncAt;
  
  const syncStartTime = new Date().toISOString();
  let pulledCount = 0;

  const tables = [
    "categories",
    "intervenants",
    "projects",
    "visits",
    "tasks",
    "task_photos",
  ] as const;

  for (const table of tables) {
    const pulledData = await pullFromSupabase(table, effectiveLastSyncAt);
    const deletedIds = await pullDeletes(table, effectiveLastSyncAt);
    
    if (pulledData.length > 0 || deletedIds.length > 0) {
      await applyPulledData(table, pulledData, deletedIds);
      pulledCount += pulledData.length;
    }
  }

  setSyncState({ lastSyncAt: syncStartTime });
  
  // Detailed log for pull-only sync
  if (pulledCount > 0) {
    console.log(`✅ Pull sync: ${pulledCount} records updated${isEmpty ? ' (full sync - empty DB)' : ''}`);
  } else {
    console.log(`✅ Pull sync: checked (no updates)`);
  }
}

/**
 * Push-only sync: Upload local changes without pulling
 */
export async function pushOnly(): Promise<void> {
  if (!supabase) {
    console.warn("Supabase not configured. Skipping push.");
    return;
  }

  const state = getSyncState();
  let pushedCount = 0;

  const tables = [
    "categories",
    "intervenants",
    "projects",
    "visits",
    "tasks",
    "task_photos",
  ] as const;

  for (const table of tables) {
    try {
      const count = await pushToSupabase(table, state.lastSyncAt);
      if (count) {
        pushedCount += count;
        console.log(`  → ${table}: ${count} pushed`);
      }
    } catch (error) {
      console.error(`  ✗ ${table}: push failed`, error);
      // Continue with other tables
    }
  }

  if (pushedCount > 0) {
    console.log(`✓ Push sync: ${pushedCount} records pushed`);
  }
}

/**
 * Test Supabase connection and permissions
 */
export async function testSupabaseConnection(): Promise<void> {
  if (!supabase) {
    console.error("Supabase not configured");
    return;
  }
  
  // Test with a simple query
  const { error } = await supabase.from("categories").select("count").limit(1);
  
  if (error) {
    console.error("Supabase connection test failed:", error);
    console.error("This might be a permissions issue (RLS policies)");
    throw error;
  }
}

/**
 * Auto-sync on app start (pull only, to get latest data)
 */
export async function syncOnStart(): Promise<void> {
  if (!supabase) {
    return;
  }

  try {
    await pullOnly();
  } catch (error) {
    console.error("Startup sync failed:", error);
    // Don't throw - app should work offline
  }
}

/**
 * Auto-sync before app closes (push local changes)
 */
export async function syncOnClose(): Promise<void> {
  if (!supabase) {
    return;
  }

  try {
    await pushOnly();
  } catch (error) {
    console.error("Close sync failed:", error);
  }
}

/**
 * Debounced auto-sync after data changes
 * Batches multiple changes together (waits 2 seconds after last change)
 */
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleAutoSync(): void {
  if (!supabase) {
    return;
  }

  // Clear existing timer
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }

  // Schedule sync after 2 seconds of inactivity
  syncDebounceTimer = setTimeout(async () => {
    try {
      // Only push local changes (don't pull during active editing to avoid conflicts)
      await pushOnly();
    } catch (error) {
      console.error("Auto-sync failed:", error);
    }
    syncDebounceTimer = null;
  }, 2000);
}
