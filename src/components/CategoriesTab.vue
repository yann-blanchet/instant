<template>
  <div>
    <div class="notes-section-label">Categories / Lots</div>
    <div class="notes-list">
      <div v-if="activeCategories.length === 0" class="notes-row notes-row-empty">
        No categories yet.
      </div>
      <div class="notes-category-grid">
        <button
          v-for="category in activeCategories"
          :key="category.id"
          type="button"
          class="notes-category-card"
          @click="openEditCategory(category)"
        >
          <div
            v-if="category.color"
            class="notes-category-color-indicator"
            :style="{ background: category.color }"
          ></div>
          <div class="notes-category-name">{{ category.name }}</div>
          <span class="notes-chevron">›</span>
        </button>
      </div>
    </div>

    <button
      class="notes-fab"
      type="button"
      aria-label="Add category"
      @click="openNewCategory"
    >
      +
    </button>

    <div
      v-if="isCategorySheetOpen"
      class="notes-sheet-backdrop"
      @click="closeCategorySheet"
    >
      <div class="notes-sheet" @click.stop>
        <div class="notes-sheet-header">
          <h3 class="notes-sheet-title">{{ editingCategoryId ? "Edit category" : "Add category" }}</h3>
          <button
            class="notes-sheet-close"
            type="button"
            aria-label="Close"
            @click="closeCategorySheet"
          >
            ✕
          </button>
        </div>
        <div class="notes-list notes-form notes-edit-form">
          <label class="notes-field">
            <span class="notes-label">Name *</span>
            <input
              v-model="categoryName"
              class="notes-input"
              placeholder="Category name"
              autofocus
            />
          </label>
          <div class="notes-field">
            <span class="notes-label">Color</span>
            <div class="notes-color-palette">
              <button
                v-for="color in colorPalette"
                :key="color"
                class="notes-color-circle"
                :class="{ active: categoryColor === color }"
                type="button"
                :style="{ background: color }"
                @click="categoryColor = color"
              />
            </div>
          </div>
        </div>
        <div class="notes-sheet-actions">
          <button 
            v-if="editingCategoryId"
            class="notes-button notes-button-danger" 
            type="button" 
            @click="deleteCategory"
          >
            Delete
          </button>
          <div class="notes-sheet-actions-spacer"></div>
          <button class="notes-button" type="button" @click="closeCategorySheet">
            Cancel
          </button>
          <button
            class="notes-button notes-button-primary"
            type="button"
            @click="saveCategory"
            :disabled="!categoryName.trim()"
          >
            {{ editingCategoryId ? "Update" : "Add" }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="isDeleteConfirmOpen"
      class="notes-sheet-backdrop"
      @click="isDeleteConfirmOpen = false"
    >
      <div class="notes-sheet" @click.stop>
        <div class="notes-sheet-header">
          <h3 class="notes-sheet-title">Delete Category</h3>
          <button
            class="notes-sheet-close"
            type="button"
            aria-label="Close"
            @click="isDeleteConfirmOpen = false"
          >
            ✕
          </button>
        </div>
        <div class="notes-list notes-form notes-edit-form">
          <p class="notes-confirm-message">
            Are you sure you want to delete this category? This action cannot be undone.
          </p>
        </div>
        <div class="notes-sheet-actions">
          <button class="notes-button" type="button" @click="isDeleteConfirmOpen = false">
            Cancel
          </button>
          <button
            class="notes-button notes-button-danger"
            type="button"
            @click="confirmDelete"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { db } from "../db";
import type { Category } from "../db/types";
import { makeId, nowIso } from "../utils/time";

interface Props {
  categories: Category[];
}

const props = defineProps<Props>();

const activeCategories = computed(() => 
  props.categories.filter(cat => !cat.deleted_at)
);

const categoryName = ref("");
const categoryColor = ref("");
const editingCategoryId = ref<string | null>(null);
const isCategorySheetOpen = ref(false);
const isDeleteConfirmOpen = ref(false);

const colorPalette = [
  "#000000",
  "#ffffff",
  "#ff6b6b",
  "#4dabf7",
  "#40c057",
  "#845ef7",
  "#f8c44c",
  "#ff8787",
  "#51cf66",
  "#339af0",
  "#9775fa",
  "#ffd43b",
  "#ff922b",
  "#20c997",
  "#228be6",
  "#cc5de8",
  "#fab005",
  "#fd7e14",
  "#12b886",
  "#1c7ed6",
];

const openEditCategory = (category: Category) => {
  editingCategoryId.value = category.id;
  categoryName.value = category.name;
  categoryColor.value = category.color || colorPalette[0];
  isCategorySheetOpen.value = true;
};

const openNewCategory = () => {
  editingCategoryId.value = null;
  categoryName.value = "";
  categoryColor.value = colorPalette[0];
  isCategorySheetOpen.value = true;
};

const saveCategory = async () => {
  if (!categoryName.value.trim()) return;
  const timestamp = nowIso();
  if (editingCategoryId.value) {
    await db.categories.update(editingCategoryId.value, {
      name: categoryName.value.trim(),
      color: categoryColor.value || null,
      updated_at: timestamp,
    });
  } else {
    await db.categories.add({
      id: makeId(),
      name: categoryName.value.trim(),
      color: categoryColor.value || null,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    });
  }
  closeCategorySheet();
};

const deleteCategory = () => {
  if (!editingCategoryId.value) return;
  isDeleteConfirmOpen.value = true;
};

const confirmDelete = async () => {
  if (!editingCategoryId.value) return;
  try {
    const timestamp = nowIso();
    await db.categories.update(editingCategoryId.value, {
      deleted_at: timestamp,
      updated_at: timestamp,
    });
    isDeleteConfirmOpen.value = false;
    closeCategorySheet();
  } catch (error) {
    console.error("Delete error:", error);
    alert(`Delete failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const closeCategorySheet = () => {
  isCategorySheetOpen.value = false;
  editingCategoryId.value = null;
  categoryName.value = "";
  categoryColor.value = colorPalette[0];
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

.notes-color-palette {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: 8px;
  padding-top: 4px;
}

.notes-color-circle {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.notes-color-circle:hover {
  transform: scale(1.1);
}

.notes-color-circle.active {
  border-color: var(--notes-text);
  box-shadow: 0 0 0 2px var(--notes-panel);
}

.notes-sheet-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 12px 18px;
  border-top: 1px solid var(--notes-border);
  background: var(--notes-panel);
}

.notes-confirm-message {
  color: var(--notes-text);
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
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

.notes-button-danger {
  background: #ff6b6b;
  color: white;
  border-color: #ff6b6b;
}

.notes-button-danger:hover {
  opacity: 0.9;
}

.notes-sheet-actions-spacer {
  flex: 1;
}

.notes-category-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.notes-category-card {
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

.notes-category-card:hover {
  background: var(--notes-bg-hover);
}

.notes-category-card:last-child {
  border-bottom: none;
}

.notes-category-color-indicator {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  margin-right: 12px;
  flex-shrink: 0;
}

.notes-category-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
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
