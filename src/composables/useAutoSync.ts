import { syncOnStart, syncOnClose, pullOnly } from "../services/sync";
import { scheduleAutoSync } from "../services/sync";
import { supabase } from "../supabase";
import { db } from "../db";

let isOnline = navigator.onLine;
let backgroundSyncInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Sync when coming back online
 */
function handleOnline() {
  isOnline = true;
  if (supabase) {
    // Pull latest data when coming back online
    pullOnly().catch(console.error);
  }
}

function handleOffline() {
  isOnline = false;
}

/**
 * Sync when page becomes visible (user switches back to tab)
 */
function handleVisibilityChange() {
  if (document.visibilityState === "visible" && supabase && isOnline) {
    // Pull latest data when user returns to the app
    pullOnly().catch(console.error);
  }
}

/**
 * Initialize automatic syncing
 * Call this once in main.ts
 * 
 * Auto-sync happens:
 * - On app start (pull latest)
 * - After data changes (debounced push, 2 seconds)
 * - When coming back online (pull latest)
 * - When page becomes visible (pull latest)
 * - Every 1 minute in background (pull latest, only when page visible)
 * - Before app closes (push local changes)
 */
export function initAutoSync() {
  if (!supabase) return;

  // Sync on app start (pull latest data)
  syncOnStart().catch(console.error);

  // Listen for online/offline events
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Sync when page becomes visible
  document.addEventListener("visibilitychange", handleVisibilityChange);

  // Sync before page unload (push local changes)
  window.addEventListener("beforeunload", () => {
    if (isOnline) {
      syncOnClose().catch(console.error);
    }
  });

  // Periodic background sync (every 1 minute if online and page is visible)
  // More frequent sync for better responsiveness when switching devices
  backgroundSyncInterval = setInterval(() => {
    if (isOnline && document.visibilityState === "visible") {
      pullOnly().catch(console.error);
    }
  }, 60 * 1000); // 1 minute (only when page is visible)
}

/**
 * Composable version for use in Vue components
 */
export function useAutoSync() {
  onMounted(() => {
    initAutoSync();
  });
}

/**
 * Hook into Dexie database operations to auto-sync
 * This intercepts mutations (add/update/delete) to trigger sync
 */
export function setupDexieAutoSync() {
  if (!supabase) return;

  try {
    // Use Dexie's hooks to intercept mutations
    db.use({
      stack: "dbcore",
      name: "AutoSyncHook",
      create(downlevelDatabase: any) {
        return {
          ...downlevelDatabase,
          table(tableName: string) {
            const table = downlevelDatabase.table(tableName);
            
            // Wrap mutate to trigger sync after mutations
            const originalMutate = table.mutate.bind(table);
            table.mutate = function(req: any) {
              const result = originalMutate(req);
              // Schedule sync after mutation completes
              if (result && typeof result.then === "function") {
                result.then(() => {
                  scheduleAutoSync();
                }).catch(() => {
                  // Ignore errors in sync scheduling
                });
              } else {
                scheduleAutoSync();
              }
              return result;
            };
            
            return table;
          },
        };
      },
    });
  } catch (error) {
    console.error("Failed to set up auto-sync hook:", error);
  }
}
