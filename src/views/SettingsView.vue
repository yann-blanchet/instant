<template>
  <section class="notes-screen">
    <header class="notes-header">
      <div class="notes-header-left">
        <button class="notes-back" type="button" aria-label="Back" @click="router.back()">
          ‹
        </button>
        <div>
          <h1 class="notes-title">Settings</h1>
          <div class="notes-subtitle">Theme, profile, intervenants, categories, sync</div>
        </div>
      </div>
    </header>

    <div class="notes-tabs">
      <button
        class="notes-tab"
        :class="{ active: activeTab === 'profile' }"
        type="button"
        @click="activeTab = 'profile'"
      >
        Profile
      </button>
      <button
        class="notes-tab"
        :class="{ active: activeTab === 'intervenants' }"
        type="button"
        @click="activeTab = 'intervenants'"
      >
        Intervenants
      </button>
      <button
        class="notes-tab"
        :class="{ active: activeTab === 'categories' }"
        type="button"
        @click="activeTab = 'categories'"
      >
        Categories
      </button>
      <button
        class="notes-tab"
        :class="{ active: activeTab === 'sync' }"
        type="button"
        @click="activeTab = 'sync'"
      >
        Sync
      </button>
    </div>

    <div v-if="activeTab === 'profile'">
      <div class="notes-section-label">Theme</div>
      <div class="notes-list">
        <label class="notes-switch-row">
          <span>Light mode</span>
          <span class="notes-switch">
            <input v-model="isLight" type="checkbox" />
            <span class="notes-switch-slider"></span>
          </span>
        </label>
      </div>

      <div class="notes-section-label">Profile</div>
      <div class="notes-list notes-form">
        <div class="notes-grid">
          <input class="notes-input" placeholder="Name" />
          <input class="notes-input" placeholder="Email" />
        </div>
        <button class="notes-button" type="button">Update Profile</button>
      </div>
    </div>

    <IntervenantsTab v-else-if="activeTab === 'intervenants'" :intervenants="intervenants" :categories="categories" />

    <CategoriesTab v-else-if="activeTab === 'categories'" :categories="categories" />

    <div v-else>
      <div class="notes-section-label">Backup / Sync</div>
      <div class="notes-list notes-form">
        <p class="notes-help">
          Sync is automatic. Data syncs in the background when you make changes.
        </p>
        <p class="notes-help" style="margin-top: 8px; font-size: 12px; color: var(--notes-muted);">
          Sync happens: on app start, after changes (2s delay), when online, every 5 minutes, and before closing.
        </p>
        <details style="margin-top: 12px;">
          <summary style="cursor: pointer; color: var(--notes-text); font-size: 13px; padding: 8px 0;">
            Advanced: Manual Sync & Cleanup
          </summary>
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
            <button class="notes-button" type="button" @click="runSync">
              Force Sync Now
            </button>
            <button class="notes-button" type="button" @click="runFullSync" style="font-size: 12px;">
              Full Sync (All Data)
            </button>
            <button class="notes-button" type="button" @click="runCleanup" style="font-size: 12px; color: var(--notes-muted);">
              Cleanup Deleted (30+ days)
            </button>
          </div>
        </details>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useLiveQuery } from "../composables/useLiveQuery";
import { db } from "../db";
import type { Category, Intervenant } from "../db/types";
import { makeId, nowIso } from "../utils/time";
import { syncNow } from "../services/sync";
import { cleanupDeletedRecords } from "../services/cleanup";
import CategoryBadge from "../components/CategoryBadge.vue";
import IntervenantsTab from "../components/IntervenantsTab.vue";
import CategoriesTab from "../components/CategoriesTab.vue";

const intervenants = useLiveQuery(() => db.intervenants.toArray(), []);
const categories = useLiveQuery(() => db.categories.toArray(), []);

const intervenantName = ref("");
const intervenantEmail = ref("");
const intervenantPhone = ref("");
const intervenantCategories = ref<string[]>([]);
const editingIntervenantId = ref<string | null>(null);
const isLight = ref(false);
const activeTab = ref<"profile" | "intervenants" | "categories" | "sync">("profile");
const isIntervenantSheetOpen = ref(false);
const router = useRouter();

const applyTheme = (theme: "light" | "dark") => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
};

onMounted(() => {
  const storedTheme = localStorage.getItem("theme") ?? "dark";
  isLight.value = storedTheme === "light";
});

watch(isLight, (value) => {
  applyTheme(value ? "light" : "dark");
});

const runSync = async () => {
  try {
    await syncNow(false);
    alert("Sync completed!");
  } catch (error) {
    console.error("Sync error:", error);
    alert(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const runFullSync = async () => {
  try {
    await syncNow(true);
    alert("Full sync completed! All data has been pushed.");
  } catch (error) {
    console.error("Full sync error:", error);
    alert(`Full sync failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const runCleanup = async () => {
  if (!confirm("Permanently delete records soft-deleted more than 30 days ago? This cannot be undone.")) {
    return;
  }
  try {
    await cleanupDeletedRecords(30);
    alert("Cleanup completed! Check console for details.");
  } catch (error) {
    console.error("Cleanup error:", error);
    alert(`Cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

</script>

<style scoped>
.notes-screen {
  min-height: 100vh;
  background: var(--notes-bg);
  color: var(--notes-text);
  padding: 28px 20px 36px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.notes-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.notes-header-left {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.notes-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.notes-subtitle {
  color: var(--notes-muted);
  font-size: 14px;
  margin-top: 4px;
}

.notes-back {
  border: none;
  background: transparent;
  color: var(--notes-accent);
  font-size: 28px;
  line-height: 1;
  padding: 2px 6px;
}

.notes-section-label {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--notes-muted);
  margin-top: 4px;
}

.notes-tabs {
  display: flex;
  gap: 8px;
  background: var(--notes-panel);
  padding: 6px;
  border-radius: 14px;
}

.notes-tab {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--notes-muted);
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.notes-tab.active {
  background: var(--notes-panel-strong);
  color: var(--notes-text);
}

.notes-fab {
  position: fixed;
  right: 20px;
  bottom: 24px;
  width: 52px;
  height: 52px;
  border-radius: 999px;
  border: 2px solid var(--notes-accent);
  background: #000;
  color: var(--notes-accent);
  font-size: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.notes-list {
  background: var(--notes-panel);
  border-radius: 16px;
  overflow: hidden;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notes-form {
  gap: 16px;
}

.notes-row-empty {
  color: var(--notes-muted);
  font-size: 14px;
}

.notes-input,
.notes-textarea,
.notes-select {
  width: 100%;
  background: var(--notes-panel-strong);
  border: 1px solid var(--notes-panel-strong);
  border-radius: 12px;
  padding: 10px 12px;
  color: var(--notes-text);
  font-size: 14px;
}

.notes-input::placeholder,
.notes-textarea::placeholder {
  color: var(--notes-muted);
}

.notes-row-inline {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 10px;
  align-items: center;
}

.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.notes-button {
  background: var(--notes-panel-strong);
  border: none;
  color: var(--notes-text);
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  width: fit-content;
}

.notes-button-primary {
  background: var(--notes-accent);
  color: var(--notes-accent-contrast);
  font-weight: 600;
}

.notes-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.notes-chip {
  background: var(--notes-chip);
  color: var(--notes-text);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
}

.notes-chip-clickable {
  cursor: pointer;
}

.notes-chip-clickable:hover {
  background: var(--notes-hover);
}

.notes-category-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.notes-category-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--notes-border);
}

.notes-category-card:last-child {
  border-bottom: none;
}

.notes-category-card:hover {
  background: var(--notes-hover);
}

.notes-category-color-indicator {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  flex-shrink: 0;
}

.notes-category-name {
  flex: 1;
  font-weight: 600;
}

.notes-intervenant-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.notes-intervenant-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--notes-border);
}

.notes-intervenant-card:last-child {
  border-bottom: none;
}

.notes-intervenant-card:hover {
  background: var(--notes-hover);
}

.notes-intervenant-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.notes-intervenant-name {
  font-weight: 600;
}

.notes-intervenant-contact {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: var(--notes-muted);
}

.notes-intervenant-email,
.notes-intervenant-phone {
  display: block;
}

.notes-intervenant-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}


.notes-row-right {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--notes-muted);
  font-size: 14px;
}

.notes-chevron {
  font-size: 18px;
}

.notes-row-title {
  font-weight: 600;
}

.notes-help {
  color: var(--notes-muted);
  font-size: 14px;
  margin: 0;
}

.notes-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.notes-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.notes-switch input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.notes-switch-slider {
  width: 44px;
  height: 26px;
  background: var(--notes-panel-strong);
  border-radius: 999px;
  position: relative;
  transition: background 0.2s ease;
}

.notes-switch-slider::after {
  content: "";
  width: 22px;
  height: 22px;
  background: var(--notes-text);
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.2s ease;
}

.notes-switch input:checked + .notes-switch-slider {
  background: var(--notes-accent);
}

.notes-switch input:checked + .notes-switch-slider::after {
  transform: translateX(18px);
  background: var(--notes-accent-contrast);
}

.notes-category-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.notes-category-badge {
  background: var(--notes-panel-strong);
  color: var(--notes-text);
  border: 1px solid var(--notes-border);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
}

.notes-category-badge.active {
  background: var(--notes-accent);
  color: var(--notes-accent-contrast);
  border-color: var(--notes-accent);
}

.notes-color-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.notes-color-circle {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 2px solid var(--notes-border);
  padding: 0;
  cursor: pointer;
}

.notes-color-circle.active {
  border-color: var(--notes-accent);
  box-shadow: 0 0 0 2px var(--notes-bg), 0 0 0 4px var(--notes-accent);
}

.notes-sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 40;
}

.notes-sheet {
  width: min(520px, 100%);
  background: var(--notes-panel);
  border-radius: 20px 20px 0 0;
  padding: 18px 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notes-sheet-title {
  font-size: 18px;
  font-weight: 600;
}

.notes-sheet-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 4px;
}

.notes-sheet-actions .notes-button {
  flex: 1;
}

.notes-sheet-actions .notes-button-primary {
  border: 2px solid var(--notes-accent);
  background: #000;
  color: var(--notes-accent);
}
</style>
