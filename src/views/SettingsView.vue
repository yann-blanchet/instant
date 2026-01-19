<template>
  <section class="notes-screen">
    <header class="notes-header">
      <div class="notes-header-left">
        <button class="notes-back" type="button" aria-label="Back" @click="router.back()">
          ‹
        </button>
        <div>
          <h1 class="notes-title">Settings</h1>
          <div class="notes-subtitle">Profile, intervenants, categories, sync</div>
        </div>
      </div>
    </header>

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

    <div class="notes-section-label">Intervenants</div>
    <div class="notes-list notes-form">
      <div class="notes-row-inline">
        <input
          v-model="intervenantName"
          class="notes-input"
          placeholder="Add intervenant"
        />
        <select v-model="intervenantColor" class="notes-select">
          <option v-for="color in colors" :key="color" :value="color">
            {{ color }}
          </option>
        </select>
        <button class="notes-button notes-button-primary" type="button" @click="addIntervenant">
          Add
        </button>
      </div>
      <div class="notes-chip-row">
        <span v-if="intervenants.length === 0" class="notes-row-empty">
          No intervenants yet.
        </span>
        <span v-for="person in intervenants" :key="person.id" class="notes-chip">
          {{ person.name }}
        </span>
      </div>
    </div>

    <div class="notes-section-label">Categories / Lots</div>
    <div class="notes-list notes-form">
      <div class="notes-row-inline">
        <input v-model="categoryName" class="notes-input" placeholder="Add category" />
        <button class="notes-button notes-button-primary" type="button" @click="addCategory">
          Add
        </button>
      </div>
      <div class="notes-chip-row">
        <span v-if="categories.length === 0" class="notes-row-empty">
          No categories yet.
        </span>
        <span v-for="category in categories" :key="category.id" class="notes-chip">
          {{ category.name }}
        </span>
      </div>
    </div>

    <div class="notes-section-label">Backup / Sync</div>
    <div class="notes-list notes-form">
      <p class="notes-help">
        Configure Supabase credentials in <code>.env</code> to enable sync.
      </p>
      <button class="notes-button" type="button" @click="runSync">Run Sync</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useLiveQuery } from "../composables/useLiveQuery";
import { db } from "../db";
import { makeId, nowIso } from "../utils/time";
import { syncNow } from "../services/sync";

const intervenants = useLiveQuery(() => db.intervenants.toArray(), []);
const categories = useLiveQuery(() => db.categories.toArray(), []);

const colors = ["primary", "secondary", "accent", "info", "success", "warning"];

const intervenantName = ref("");
const intervenantColor = ref(colors[0]);
const categoryName = ref("");
const isLight = ref(false);
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

const addIntervenant = async () => {
  if (!intervenantName.value.trim()) return;
  const timestamp = nowIso();
  await db.intervenants.add({
    id: makeId(),
    name: intervenantName.value.trim(),
    color: intervenantColor.value,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  });
  intervenantName.value = "";
};

const addCategory = async () => {
  if (!categoryName.value.trim()) return;
  const timestamp = nowIso();
  await db.categories.add({
    id: makeId(),
    name: categoryName.value.trim(),
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  });
  categoryName.value = "";
};

const runSync = async () => {
  await syncNow();
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
</style>
