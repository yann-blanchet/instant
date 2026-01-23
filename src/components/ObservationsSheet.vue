<template>
  <div v-if="isOpen" class="notes-sheet-backdrop" @click="handleClose">
    <div class="notes-sheet" @click.stop>
      <div class="notes-sheet-header">
        <h3 class="notes-sheet-title">Observations</h3>
        <button
          class="notes-sheet-close"
          type="button"
          aria-label="Close"
          @click="handleClose"
        >
          ✕
        </button>
      </div>
      
      <div class="notes-observations-list">
        <div v-if="!observations.length" class="notes-empty-state">
          Aucune observation.
        </div>
        <div
          v-for="(observation, index) in observations"
          :key="index"
          class="notes-observation-item"
        >
          <div class="notes-observation-content">{{ observation }}</div>
          <div class="notes-observation-actions">
            <button
              class="notes-observation-action"
              type="button"
              aria-label="Edit observation"
              @click="handleEdit(index)"
            >
              ✏️
            </button>
            <button
              class="notes-observation-action"
              type="button"
              aria-label="Delete observation"
              @click="handleDelete(index)"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
      
      <div class="notes-sheet-actions">
        <button
          class="notes-button notes-button-primary"
          type="button"
          @click="handleAdd"
        >
          + Ajouter
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

const props = defineProps<{
  modelValue: boolean;
  observations: string[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  close: [];
  edit: [index: number];
  delete: [index: number];
  add: [];
}>();

const isOpen = computed(() => props.modelValue);

const handleClose = () => {
  emit("update:modelValue", false);
  emit("close");
};

const handleEdit = (index: number) => {
  emit("edit", index);
};

const handleDelete = (index: number) => {
  emit("delete", index);
};

const handleAdd = () => {
  emit("add");
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
  max-width: 600px;
  background: var(--notes-panel);
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 80vh;
}

@media (max-width: 768px) {
  .notes-sheet {
    max-width: none;
    max-height: 70vh;
    padding: 12px;
  }
}

@media (max-width: 480px) {
  .notes-sheet {
    max-width: none;
    max-height: 60vh;
    gap: 12px;
    padding: 10px;
    border-radius: 12px;
  }
}

.notes-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.notes-sheet-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--notes-text);
  margin: 0;
  flex: 1;
}

@media (max-width: 480px) {
  .notes-sheet-title {
    font-size: 16px;
  }
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

.notes-observations-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.notes-empty-state {
  color: var(--notes-muted);
  font-size: 14px;
  text-align: center;
  padding: 24px;
}

.notes-observation-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  background: var(--notes-panel-strong);
  border-radius: 12px;
}

@media (max-width: 480px) {
  .notes-observation-item {
    gap: 8px;
    padding: 10px;
    border-radius: 8px;
  }
}

.notes-observation-content {
  flex: 1;
  color: var(--notes-text);
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
  min-width: 0;
}

@media (max-width: 480px) {
  .notes-observation-content {
    font-size: 13px;
  }
}

.notes-observation-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.notes-observation-action {
  background: transparent;
  border: none;
  font-size: 16px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.notes-observation-action:hover {
  opacity: 1;
  background: var(--notes-hover);
}

.notes-sheet-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px solid var(--notes-border);
  flex-wrap: wrap;
}

@media (max-width: 480px) {
  .notes-sheet-actions {
    gap: 8px;
    padding-top: 6px;
  }
}

.notes-button {
  background: var(--notes-panel-strong);
  border: none;
  color: var(--notes-text);
  padding: 10px 18px;
  border-radius: 999px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
  white-space: nowrap;
}

@media (max-width: 480px) {
  .notes-button {
    padding: 8px 14px;
    font-size: 13px;
  }
}

.notes-button-primary {
  background: var(--notes-accent);
  color: var(--notes-accent-contrast);
  font-weight: 600;
}
</style>
