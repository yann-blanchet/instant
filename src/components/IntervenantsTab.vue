<template>
  <div>
    <div class="notes-section-label">Intervenants</div>
    <div class="notes-list">
      <div v-if="props.intervenants.length === 0" class="notes-row notes-row-empty">
        No intervenants yet.
      </div>
      <div class="notes-intervenant-grid">
        <button
          v-for="person in props.intervenants"
          :key="person.id"
          type="button"
          class="notes-intervenant-card"
          @click="openEditIntervenant(person)"
        >
          <div class="notes-intervenant-card-content">
            <div class="notes-intervenant-name">{{ person.name }}</div>
            <div v-if="person.email || person.phone" class="notes-intervenant-contact">
              <span v-if="person.email" class="notes-intervenant-email">{{ person.email }}</span>
              <span v-if="person.phone" class="notes-intervenant-phone">{{ person.phone }}</span>
            </div>
            <div v-if="getIntervenantCategoryBadges(person).length > 0" class="notes-intervenant-badges">
              <CategoryBadge
                v-for="category in getIntervenantCategoryBadges(person)"
                :key="category.id"
                :category="category"
                variant="task"
              />
            </div>
          </div>
          <span class="notes-chevron">›</span>
        </button>
      </div>
    </div>

    <button
      class="notes-fab"
      type="button"
      aria-label="Add intervenant"
      @click="openNewIntervenant"
    >
      +
    </button>

    <div
      v-if="isIntervenantSheetOpen"
      class="notes-sheet-backdrop"
      @click="closeIntervenantSheet"
    >
      <div class="notes-sheet" @click.stop>
        <div class="notes-sheet-header">
          <h3 class="notes-sheet-title">{{ editingIntervenantId ? "Edit intervenant" : "Add intervenant" }}</h3>
          <button
            class="notes-sheet-close"
            type="button"
            aria-label="Close"
            @click="closeIntervenantSheet"
          >
            ✕
          </button>
        </div>
        <div class="notes-list notes-form notes-edit-form">
          <label class="notes-field">
            <span class="notes-label">Name *</span>
            <input
              v-model="intervenantName"
              class="notes-input"
              placeholder="Intervenant name"
              autofocus
            />
          </label>
          <label class="notes-field">
            <span class="notes-label">Email</span>
            <input
              v-model="intervenantEmail"
              type="email"
              class="notes-input"
              placeholder="Email address"
            />
          </label>
          <label class="notes-field">
            <span class="notes-label">Phone</span>
            <input
              v-model="intervenantPhone"
              type="tel"
              class="notes-input"
              placeholder="Phone number"
            />
          </label>
          <div class="notes-field">
            <span class="notes-label">Categories</span>
            <div class="notes-category-badges">
              <CategoryBadge
                v-for="category in props.categories"
                :key="category.id"
                :category="category"
                :active="intervenantCategories.includes(category.id)"
                clickable
                @click="toggleCategory(category.id)"
              />
            </div>
          </div>
        </div>
        <div class="notes-sheet-actions">
          <button class="notes-button" type="button" @click="closeIntervenantSheet">
            Cancel
          </button>
          <button
            class="notes-button notes-button-primary"
            type="button"
            @click="saveIntervenant"
            :disabled="!intervenantName.trim()"
          >
            {{ editingIntervenantId ? "Update" : "Add" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { db } from "../db";
import type { Category, Intervenant } from "../db/types";
import { makeId, nowIso } from "../utils/time";
import CategoryBadge from "./CategoryBadge.vue";

interface Props {
  intervenants: Intervenant[];
  categories: Category[];
}

const props = defineProps<Props>();

const intervenantName = ref("");
const intervenantEmail = ref("");
const intervenantPhone = ref("");
const intervenantCategories = ref<string[]>([]);
const editingIntervenantId = ref<string | null>(null);
const isIntervenantSheetOpen = ref(false);

const openEditIntervenant = (intervenant: Intervenant) => {
  editingIntervenantId.value = intervenant.id;
  intervenantName.value = intervenant.name;
  intervenantEmail.value = intervenant.email || "";
  intervenantPhone.value = intervenant.phone || "";
  intervenantCategories.value = [...(intervenant.category_ids || [])];
  isIntervenantSheetOpen.value = true;
};

const openNewIntervenant = () => {
  editingIntervenantId.value = null;
  intervenantName.value = "";
  intervenantEmail.value = "";
  intervenantPhone.value = "";
  intervenantCategories.value = [];
  isIntervenantSheetOpen.value = true;
};

const saveIntervenant = async () => {
  if (!intervenantName.value.trim()) return;
  const timestamp = nowIso();
  if (editingIntervenantId.value) {
    await db.intervenants.update(editingIntervenantId.value, {
      name: intervenantName.value.trim(),
      email: intervenantEmail.value.trim() || null,
      phone: intervenantPhone.value.trim() || null,
      category_ids: [...intervenantCategories.value],
      updated_at: timestamp,
    });
  } else {
    await db.intervenants.add({
      id: makeId(),
      name: intervenantName.value.trim(),
      email: intervenantEmail.value.trim() || null,
      phone: intervenantPhone.value.trim() || null,
      category_ids: [...intervenantCategories.value],
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    });
  }
  closeIntervenantSheet();
};

const toggleCategory = (categoryId: string) => {
  const index = intervenantCategories.value.indexOf(categoryId);
  if (index >= 0) {
    intervenantCategories.value.splice(index, 1);
  } else {
    intervenantCategories.value.push(categoryId);
  }
};

const closeIntervenantSheet = () => {
  isIntervenantSheetOpen.value = false;
  editingIntervenantId.value = null;
  intervenantName.value = "";
  intervenantEmail.value = "";
  intervenantPhone.value = "";
  intervenantCategories.value = [];
};

const getIntervenantCategoryBadges = (intervenant: Intervenant) => {
  if (!intervenant.category_ids || intervenant.category_ids.length === 0) return [];
  return props.categories.filter((c) => intervenant.category_ids?.includes(c.id));
};
</script>

<style scoped>
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
  padding: 0;
  display: flex;
  flex-direction: column;
  max-height: 85vh;
}

.notes-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid var(--notes-border);
}

.notes-sheet-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--notes-text);
  margin: 0;
}

.notes-sheet-close {
  background: none;
  border: none;
  color: var(--notes-text);
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
}

.notes-sheet-close:hover {
  opacity: 0.6;
}

.notes-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px;
}

.notes-edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notes-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.notes-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--notes-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.notes-input {
  padding: 10px 12px;
  border: 1px solid var(--notes-border);
  border-radius: 8px;
  background: var(--notes-input-bg);
  color: var(--notes-text);
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.2s;
}

.notes-input:focus {
  outline: none;
  border-color: var(--notes-primary);
}

.notes-category-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 4px;
}

.notes-sheet-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 12px 18px;
  border-top: 1px solid var(--notes-border);
  background: var(--notes-panel);
}

.notes-button {
  padding: 10px 16px;
  border: 1px solid var(--notes-border);
  border-radius: 8px;
  background: var(--notes-panel);
  color: var(--notes-text);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.notes-button:hover {
  background: var(--notes-bg-hover);
  border-color: var(--notes-text);
}

.notes-button-primary {
  background: var(--notes-primary);
  color: white;
  border-color: var(--notes-primary);
}

.notes-button-primary:hover {
  opacity: 0.9;
}

.notes-button:disabled,
.notes-button-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  padding: 12px 16px;
  border: none;
  border-bottom: 1px solid var(--notes-border);
  background: var(--notes-panel);
  color: var(--notes-text);
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s;
}

.notes-intervenant-card:hover {
  background: var(--notes-bg-hover);
}

.notes-intervenant-card:last-child {
  border-bottom: none;
}

.notes-intervenant-card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notes-intervenant-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--notes-text);
}

.notes-intervenant-contact {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--notes-text-secondary);
}

.notes-intervenant-email,
.notes-intervenant-phone {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notes-intervenant-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}

.notes-chevron {
  color: var(--notes-text-secondary);
  margin-left: 12px;
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
  cursor: pointer;
  transition: all 0.2s;
}

.notes-fab:hover {
  opacity: 0.8;
}
</style>
