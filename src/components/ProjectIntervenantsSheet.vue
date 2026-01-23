<template>
  <div
    v-if="isOpen"
    class="notes-sheet-backdrop"
    @click="onClose"
  >
    <div class="notes-sheet" @click.stop>
      <div class="notes-sheet-title">Project intervenants</div>
      <div class="notes-list notes-form">
        <div class="notes-field">
          <span class="notes-label">Selected Intervenants</span>
          <div v-if="selectedIntervenantIds.length === 0" class="notes-empty-message">
            No intervenants selected
          </div>
          <div v-else class="notes-intervenants-list">
            <div
              v-for="intervenantId in selectedIntervenantIds"
              :key="intervenantId"
              class="notes-intervenant-item"
            >
              <div class="notes-intervenant-info">
                <span class="notes-intervenant-name">{{ getIntervenantName(intervenantId) }}</span>
                <div v-if="getIntervenantCategoriesById(intervenantId).length > 0" class="notes-intervenant-badges">
                  <CategoryBadge
                    v-for="category in getIntervenantCategoriesById(intervenantId)"
                    :key="category.id"
                    :category="category"
                    variant="compact"
                  />
                </div>
              </div>
              <button
                class="notes-remove-button"
                type="button"
                @click="removeIntervenant(intervenantId)"
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="notes-sheet-actions">
        <button class="notes-button notes-button-add" type="button" @click="openAddIntervenant">
          + Add Intervenant
        </button>
        <button class="notes-button" type="button" @click="onClose">
          Cancel
        </button>
        <button
          class="notes-button notes-button-primary"
          type="button"
          @click="handleSave"
        >
          Save
        </button>
      </div>
    </div>

    <!-- Add Intervenant Sheet -->
    <div
      v-if="isAddIntervenantOpen"
      class="notes-sheet-backdrop notes-sheet-backdrop-nested"
      @click="closeAddIntervenant"
    >
      <div class="notes-sheet" @click.stop>
        <div class="notes-sheet-title">Add Intervenant</div>
        <div class="notes-list notes-form">
          <div class="notes-field">
            <span class="notes-label">Available Intervenants</span>
            <div v-if="availableIntervenants.length === 0" class="notes-empty-message">
              All intervenants are already selected
            </div>
            <div v-else class="notes-intervenants-list">
              <button
                v-for="intervenant in availableIntervenants"
                :key="intervenant.id"
                class="notes-intervenant-item notes-intervenant-selectable"
                type="button"
                @click="selectIntervenant(intervenant.id)"
              >
                <div class="notes-intervenant-info">
                  <span class="notes-intervenant-name">{{ intervenant.name }}</span>
                  <div v-if="getIntervenantCategories(intervenant).length > 0" class="notes-intervenant-badges">
                    <CategoryBadge
                      v-for="category in getIntervenantCategories(intervenant)"
                      :key="category.id"
                      :category="category"
                      variant="compact"
                    />
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
        <div class="notes-sheet-actions">
          <button class="notes-button" type="button" @click="closeAddIntervenant">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { Category, Intervenant } from "../db/types";
import CategoryBadge from "./CategoryBadge.vue";

const props = defineProps<{
  isOpen: boolean;
  intervenants: Intervenant[];
  selectedIds: string[];
  categories?: Category[];
}>();

const emit = defineEmits<{
  close: [];
  save: [ids: string[]];
}>();

const selectedIntervenantIds = ref<string[]>([]);
const isAddIntervenantOpen = ref(false);

watch(() => props.selectedIds, (newIds) => {
  selectedIntervenantIds.value = [...newIds];
}, { immediate: true });

const availableIntervenants = computed(() => {
  return props.intervenants.filter(i => !selectedIntervenantIds.value.includes(i.id));
});

const getIntervenantName = (id: string) => {
  return props.intervenants.find(i => i.id === id)?.name || "";
};

const getIntervenantCategories = (intervenant: Intervenant) => {
  if (!intervenant.category_ids || !props.categories) return [];
  return props.categories.filter((c) => intervenant.category_ids?.includes(c.id));
};

const getIntervenantCategoriesById = (id: string) => {
  const intervenant = props.intervenants.find(i => i.id === id);
  if (!intervenant) return [];
  return getIntervenantCategories(intervenant);
};

const selectIntervenant = (intervenantId: string) => {
  if (!selectedIntervenantIds.value.includes(intervenantId)) {
    selectedIntervenantIds.value.push(intervenantId);
  }
  closeAddIntervenant();
};

const removeIntervenant = (intervenantId: string) => {
  const index = selectedIntervenantIds.value.indexOf(intervenantId);
  if (index >= 0) {
    selectedIntervenantIds.value.splice(index, 1);
  }
};

const openAddIntervenant = () => {
  isAddIntervenantOpen.value = true;
};

const closeAddIntervenant = () => {
  isAddIntervenantOpen.value = false;
};

const handleSave = () => {
  emit("save", selectedIntervenantIds.value);
};

const onClose = () => {
  emit("close");
};
</script>

<style scoped>
.notes-sheet-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.notes-sheet-backdrop-nested {
  z-index: 1100;
}

.notes-sheet {
  width: 100%;
  background: var(--notes-panel);
  border-radius: 16px 16px 0 0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 80vh;
  overflow-y: auto;
}

.notes-sheet-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--notes-text);
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notes-form {
  background: transparent;
}

.notes-field {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notes-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--notes-muted);
  font-weight: 600;
}

.notes-empty-message {
  font-size: 14px;
  color: var(--notes-muted);
  text-align: center;
  padding: 20px;
}

.notes-intervenants-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notes-intervenant-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid var(--notes-border);
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.notes-intervenant-item:hover {
  background: var(--notes-hover);
  border-color: var(--notes-text);
}

.notes-intervenant-selectable:active {
  background: rgba(var(--notes-accent-rgb, 59, 130, 246), 0.1);
}

.notes-intervenant-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.notes-intervenant-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--notes-text);
}

.notes-intervenant-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.notes-remove-button {
  background: transparent;
  border: none;
  color: var(--notes-muted);
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.notes-remove-button:hover {
  color: var(--notes-text);
  background: var(--notes-hover);
}

.notes-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 2px solid var(--notes-border);
  border-radius: 6px;
  background: transparent;
  flex-shrink: 0;
}

.notes-intervenant-item.active .notes-checkbox {
  border-color: var(--notes-accent);
  background: var(--notes-accent);
}

.notes-checkbox-checked {
  color: white;
  font-weight: bold;
  font-size: 14px;
}

.notes-category-badge {
  border: 1px solid var(--notes-border);
  background: transparent;
  color: var(--notes-muted);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.notes-category-badge:hover {
  background: var(--notes-hover);
  color: var(--notes-text);
  border-color: var(--notes-text);
}

.notes-category-badge.active {
  background: transparent;
  color: var(--notes-text);
  border-color: var(--notes-accent);
}

.notes-sheet-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.notes-button {
  flex: 1;
  min-width: 100px;
  border: 1px solid var(--notes-border);
  background: transparent;
  color: var(--notes-text);
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.notes-button:hover {
  background: var(--notes-hover);
  border-color: var(--notes-text);
}

.notes-button-primary {
  border-color: var(--notes-accent);
  color: var(--notes-accent);
}

.notes-button-primary:hover {
  background: var(--notes-accent);
  color: var(--notes-panel);
}

.notes-button-add {
  flex: 0 1 auto;
  width: 100%;
}
</style>
