<template>
  <div v-if="isOpen" class="notes-sheet-backdrop" @click="handleClose">
    <div class="notes-sheet" @click.stop>
      <div class="notes-sheet-header">
        <h3 class="notes-sheet-title">Assigner à</h3>
        <button
          class="notes-sheet-close"
          type="button"
          aria-label="Close"
          @click="handleClose"
        >
          ✕
        </button>
      </div>
      
      <div class="notes-list">
        <div class="notes-sheet-section-label">Intervenants</div>
        <div class="notes-sheet-chips">
          <button
            class="notes-sheet-chip"
            type="button"
            :class="{ active: !currentIntervenantId }"
            @click="handleAssign(null)"
          >
            Générale
          </button>
          <button
            v-for="intervenant in intervenants"
            :key="intervenant.id"
            class="notes-sheet-chip"
            :class="{ active: currentIntervenantId === intervenant.id }"
            :style="getIntervenantCategories(intervenant).length > 0 && getIntervenantCategories(intervenant)[0]?.color ? { borderColor: getIntervenantCategories(intervenant)[0].color } : {}"
            type="button"
            @click="handleAssign(intervenant.id)"
          >
            <div class="notes-sheet-chip-content">
              <div class="notes-sheet-chip-name">{{ intervenant.name }}</div>
              <div v-if="getIntervenantCategories(intervenant).length > 0" class="notes-sheet-chip-category">
                {{ getIntervenantCategories(intervenant)[0].name }}
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Category, Intervenant } from "../db/types";

const props = defineProps<{
  modelValue: boolean;
  intervenants: Intervenant[];
  categories: Category[];
  currentIntervenantId?: string | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  close: [];
  assign: [intervenantId: string | null];
}>();

const isOpen = computed(() => props.modelValue);

const handleClose = () => {
  emit("update:modelValue", false);
  emit("close");
};

const handleAssign = (intervenantId: string | null) => {
  emit("assign", intervenantId);
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
  margin-bottom: 4px;
}

.notes-sheet-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.notes-sheet-chip {
  background: var(--notes-panel-strong);
  border: 1px solid var(--notes-border);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--notes-text);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.notes-sheet-chip:hover {
  background: var(--notes-hover);
  border-color: var(--notes-accent);
}

.notes-sheet-chip.active {
  background: var(--notes-accent);
  color: var(--notes-accent-contrast);
  border-color: var(--notes-accent);
  font-weight: 600;
}

.notes-sheet-chip-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notes-sheet-chip-name {
  font-size: 14px;
  font-weight: 500;
}

.notes-sheet-chip-category {
  font-size: 11px;
  opacity: 0.8;
}
</style>
