import { supabase } from "../supabase";
import { db } from "../db";

/**
 * Permanently delete soft-deleted records from Supabase
 * This removes records that have deleted_at set (older than specified days)
 * 
 * @param olderThanDays - Only delete records soft-deleted more than X days ago (default: 30)
 */
export async function cleanupDeletedRecords(olderThanDays: number = 30): Promise<void> {
  if (!supabase) {
    console.warn("Supabase not configured. Skipping cleanup.");
    return;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  const cutoffIso = cutoffDate.toISOString();

  console.log(`🧹 Starting cleanup: deleting records soft-deleted before ${cutoffIso}`);

  const tables = [
    "categories",
    "intervenants",
    "projects",
    "visits",
    "tasks",
    "task_photos",
  ] as const;

  let totalDeleted = 0;

  for (const table of tables) {
    try {
      // Find records that are soft-deleted and older than cutoff
      const { data: deletedRecords, error: selectError } = await supabase
        .from(table)
        .select("id")
        .not("deleted_at", "is", null)
        .lt("deleted_at", cutoffIso);

      if (selectError) {
        console.error(`  ✗ ${table}: failed to query deleted records`, selectError);
        continue;
      }

      if (!deletedRecords || deletedRecords.length === 0) {
        continue;
      }

      const idsToDelete = deletedRecords.map((r) => r.id);

      // Permanently delete from Supabase
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .in("id", idsToDelete);

      if (deleteError) {
        console.error(`  ✗ ${table}: failed to delete`, deleteError);
        continue;
      }

      totalDeleted += idsToDelete.length;
      console.log(`  ✓ ${table}: ${idsToDelete.length} records permanently deleted`);

      // Also remove from local database
      for (const id of idsToDelete) {
        await db.table(table).delete(id);
      }
    } catch (error) {
      console.error(`  ✗ ${table}: cleanup failed`, error);
    }
  }

  if (totalDeleted > 0) {
    console.log(`✅ Cleanup completed: ${totalDeleted} records permanently deleted`);
  } else {
    console.log(`✅ Cleanup completed: no records to delete`);
  }
}

/**
 * Cleanup strategy options:
 * 
 * 1. Manual cleanup (recommended for now):
 *    - Add a button in Settings → Advanced
 *    - User triggers when they want to clean up
 * 
 * 2. Automatic cleanup (after X days):
 *    - Run cleanup automatically after records are soft-deleted for 30+ days
 *    - Could run on app start or periodically
 * 
 * 3. Scheduled cleanup:
 *    - Use a background job/service
 *    - More complex, requires server-side logic
 */
