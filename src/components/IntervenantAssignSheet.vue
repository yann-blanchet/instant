<template>
  <div v-if="isOpen" class="notes-sheet-backdrop" @click="handleClose">
    <div class="notes-sheet" @click.stop>
      <div class="notes-sheet-header">
        <h3 class="notes-sheet-title">{{ !isAddingNew ? "Assigner à" : "Create Intervenant" }}</h3>
        <button
          class="notes-sheet-close"
          type="button"
          aria-label="Close"
          @click="handleClose"
        >
          ✕
        </button>
      </div>
      
      <!-- Assignment list view -->
      <div v-if="!isAddingNew" class="notes-list">
        <div class="notes-sheet-section-label">Intervenants</div>
        <button
          class="notes-sheet-row"
          type="button"
          :class="{ active: !currentIntervenantId }"
          @click="handleAssign(null)"
        >
          <div class="notes-sheet-row-content">
            <div class="notes-sheet-row-name">Not assigned</div>
          </div>
        </button>

        <!-- Project intervenants -->
        <template v-if="projectIntervenants.length > 0">
          <div class="notes-sheet-divider"></div>
          <div class="notes-sheet-subsection-label">Project Intervenants</div>
          <button
            v-for="intervenant in projectIntervenants"
            :key="intervenant.id"
            class="notes-sheet-row"
            type="button"
            :class="{ active: currentIntervenantId === intervenant.id }"
            @click="handleAssign(intervenant.id)"
          >
            <div class="notes-sheet-row-content">
              <div class="notes-sheet-row-name">{{ intervenant.name }}</div>
              <div v-if="getIntervenantCategories(intervenant).length > 0" class="notes-sheet-row-badges">
                <CategoryBadge
                  v-for="category in getIntervenantCategories(intervenant)"
                  :key="category.id"
                  :category="category"
                  variant="header"
                />
              </div>
            </div>
          </button>
        </template>

        <!-- Other intervenants -->
        <template v-if="otherIntervenants.length > 0">
          <div class="notes-sheet-divider"></div>
          <div class="notes-sheet-subsection-label">Other Intervenants</div>
          <button
            v-for="intervenant in otherIntervenants"
            :key="intervenant.id"
            class="notes-sheet-row"
            type="button"
            :class="{ active: currentIntervenantId === intervenant.id }"
            @click="handleAssign(intervenant.id)"
          >
            <div class="notes-sheet-row-content">
              <div class="notes-sheet-row-name">{{ intervenant.name }}</div>
              <div v-if="getIntervenantCategories(intervenant).length > 0" class="notes-sheet-row-badges">
                <CategoryBadge
                  v-for="category in getIntervenantCategories(intervenant)"
                  :key="category.id"
                  :category="category"
                  variant="header"
                />
              </div>
            </div>
          </button>
        </template>
      </div>

      <!-- Add intervenant form view -->
      <div v-else class="notes-list notes-form notes-edit-form">
        <label class="notes-field">
          <span class="notes-label">Name *</span>
          <input
            v-model="newIntervenantName"
            class="notes-input"
            placeholder="Intervenant name"
            autofocus
          />
        </label>
        <label class="notes-field">
          <span class="notes-label">Email</span>
          <input
            v-model="newIntervenantEmail"
            type="email"
            class="notes-input"
            placeholder="Email address"
          />
        </label>
        <label class="notes-field">
          <span class="notes-label">Phone</span>
          <input
            v-model="newIntervenantPhone"
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
              :active="newIntervenantCategories.includes(category.id)"
              clickable
              @click="toggleNewCategory(category.id)"
            />
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="notes-sheet-actions">
        <button v-if="!isAddingNew" class="notes-button notes-button-secondary" type="button" @click="openAddForm">
          + Create Intervenant
        </button>
        <button v-else class="notes-button" type="button" @click="cancelAddForm">
          Cancel
        </button>
        <button v-if="isAddingNew" class="notes-button notes-button-primary" type="button" @click="saveNewIntervenant" :disabled="!newIntervenantName.trim()">
          Create & Assign
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { db } from "../db";
import type { Category, Intervenant } from "../db/types";
import { makeId, nowIso } from "../utils/time";
import CategoryBadge from "./CategoryBadge.vue";

const props = defineProps<{
  modelValue: boolean;
  allIntervenants: Intervenant[];
  projectIntervenantIds: string[];
  categories: Category[];
  currentIntervenantId?: string | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  close: [];
  assign: [intervenantId: string | null];
  "add-intervenant-to-project": [intervenantId: string];
}>();

const isOpen = computed(() => props.modelValue);
const isAddingNew = ref(false);

// New intervenant form state
const newIntervenantName = ref("");
const newIntervenantEmail = ref("");
const newIntervenantPhone = ref("");
const newIntervenantCategories = ref<string[]>([]);

const projectIntervenants = computed(() => {
  return props.allIntervenants.filter((i) => props.projectIntervenantIds.includes(i.id));
});

const otherIntervenants = computed(() => {
  return props.allIntervenants.filter((i) => !props.projectIntervenantIds.includes(i.id));
});

const handleClose = () => {
  isAddingNew.value = false;
  resetForm();
  emit("update:modelValue", false);
  emit("close");
};

const handleAssign = (intervenantId: string | null) => {
  if (intervenantId && !props.projectIntervenantIds.includes(intervenantId)) {
    // This is a non-project intervenant, add it to the project first
    emit("add-intervenant-to-project", intervenantId);
  }
  emit("assign", intervenantId);
  handleClose();
};

const openAddForm = () => {
  isAddingNew.value = true;
};

const cancelAddForm = () => {
  isAddingNew.value = false;
  resetForm();
};

const resetForm = () => {
  newIntervenantName.value = "";
  newIntervenantEmail.value = "";
  newIntervenantPhone.value = "";
  newIntervenantCategories.value = [];
};

const toggleNewCategory = (categoryId: string) => {
  const index = newIntervenantCategories.value.indexOf(categoryId);
  if (index >= 0) {
    newIntervenantCategories.value.splice(index, 1);
  } else {
    newIntervenantCategories.value.push(categoryId);
  }
};

const saveNewIntervenant = async () => {
  if (!newIntervenantName.value.trim()) return;
  
  const timestamp = nowIso();
  const newIntervenantId = makeId();
  
  // Create the new intervenant
  await db.intervenants.add({
    id: newIntervenantId,
    name: newIntervenantName.value.trim(),
    email: newIntervenantEmail.value.trim() || null,
    phone: newIntervenantPhone.value.trim() || null,
    category_ids: [...newIntervenantCategories.value],
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  });
  
  // Add to project
  emit("add-intervenant-to-project", newIntervenantId);
  
  // Assign to task
  emit("assign", newIntervenantId);
  
  handleClose();
};



const getIntervenantCategories = (intervenant: Intervenant) => {
  if (!intervenant?.category_ids || intervenant.category_ids.length === 0) return [];
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
  padding: 0 12px 12px;
  z-index: 50;
}

.notes-sheet {
  width: 100%;
  max-width: none;
  background: var(--notes-panel);
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 80vh;
}

.notes-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.notes-sheet-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--notes-text);
  margin: 0;
}

.notes-sheet-close {
  background: transparent;
  border: none;
  color: var(--notes-muted);
  font-size: 20px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  line-height: 1;
}

.notes-sheet-close:hover {
  background: var(--notes-hover);
  color: var(--notes-text);
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.notes-sheet-section-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--notes-muted);
  font-weight: 600;
  margin-bottom: 8px;
}

.notes-sheet-subsection-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--notes-muted);
  font-weight: 600;
  margin-top: 4px;
  margin-bottom: 8px;
}

.notes-sheet-divider {
  height: 1px;
  background: var(--notes-border);
  margin: 8px 0;
}

.notes-sheet-row {
  width: 100%;
  background: var(--notes-panel-strong);
  border: 1px solid var(--notes-border);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  color: var(--notes-text);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  margin-bottom: 8px;
}

.notes-sheet-row:last-child {
  margin-bottom: 0;
}

.notes-sheet-row:hover {
  background: var(--notes-hover);
  border-color: var(--notes-accent);
}

.notes-sheet-row.active {
  background: var(--notes-accent);
  color: var(--notes-accent-contrast);
  border-color: var(--notes-accent);
  font-weight: 600;
}

.notes-sheet-row-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.notes-sheet-row-name {
  font-size: 14px;
  font-weight: 500;
  flex: 1;
}

.notes-sheet-row-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.notes-form {
  gap: 16px;
}

.notes-edit-form {
  padding: 0;
  gap: 16px;
}

.notes-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notes-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--notes-muted);
  font-weight: 600;
}

.notes-input {
  padding: 12px 16px;
  border: 1px solid var(--notes-border);
  border-radius: 8px;
  background: var(--notes-panel-strong);
  color: var(--notes-text);
  font-size: 14px;
  transition: all 0.2s;
}

.notes-input:focus {
  outline: none;
  border-color: var(--notes-accent);
  background: var(--notes-panel);
}

.notes-category-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.notes-sheet-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.notes-button {
  flex: 1;
  min-width: 100px;
  padding: 12px 16px;
  border: 1px solid var(--notes-border);
  border-radius: 8px;
  background: var(--notes-panel-strong);
  color: var(--notes-text);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.notes-button:hover:not(:disabled) {
  background: var(--notes-hover);
  border-color: var(--notes-accent);
}

.notes-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.notes-button-primary {
  background: var(--notes-accent);
  color: var(--notes-accent-contrast);
  border-color: var(--notes-accent);
}

.notes-button-primary:hover:not(:disabled) {
  background: var(--notes-accent);
  opacity: 0.9;
}

.notes-button-secondary {
  background: transparent;
  border-color: var(--notes-accent);
  color: var(--notes-accent);
}

.notes-button-secondary:hover {
  background: var(--notes-accent);
  color: var(--notes-accent-contrast);
}
</style>
