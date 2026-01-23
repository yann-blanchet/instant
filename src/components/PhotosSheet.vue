<template>
  <div v-if="isOpen" class="notes-sheet-backdrop" @click="handleClose">
    <div class="notes-sheet" @click.stop>
      <div class="notes-sheet-header">
        <h3 class="notes-sheet-title">Photos</h3>
        <button
          class="notes-sheet-close"
          type="button"
          aria-label="Close"
          @click="handleClose"
        >
          ✕
        </button>
      </div>
      
      <div class="notes-photos-list">
        <div v-if="!photos.length" class="notes-empty-state">
          Aucune photo.
        </div>
        <div
          v-for="(url, index) in photos"
          :key="index"
          class="notes-photo-item"
        >
          <img
            :src="url"
            alt="Task photo"
            class="notes-photo-item-image"
            @click="handleViewPhoto(url)"
          />
          <div class="notes-photo-item-actions">
            <button
              class="notes-photo-item-action"
              type="button"
              aria-label="Edit photo"
              @click="handleEdit(index)"
            >
              ✏️
            </button>
            <button
              class="notes-photo-item-action"
              type="button"
              aria-label="Delete photo"
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
          +
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  modelValue: boolean;
  photos: string[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  close: [];
  edit: [index: number];
  delete: [index: number];
  add: [];
  view: [url: string];
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

const handleViewPhoto = (url: string) => {
  emit("view", url);
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

.notes-photos-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.notes-empty-state {
  color: var(--notes-muted);
  font-size: 14px;
  text-align: center;
  padding: 24px;
  grid-column: 1 / -1;
}

.notes-photo-item {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  background: var(--notes-panel-strong);
}

.notes-photo-item-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  transition: opacity 0.2s;
}

.notes-photo-item-image:hover {
  opacity: 0.8;
}

.notes-photo-item-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.notes-photo-item:hover .notes-photo-item-actions {
  opacity: 1;
}

.notes-photo-item-action {
  background: rgba(0, 0, 0, 0.6);
  border: none;
  font-size: 14px;
  padding: 6px;
  cursor: pointer;
  border-radius: 4px;
  line-height: 1;
  backdrop-filter: blur(4px);
  transition: background 0.2s;
}

.notes-photo-item-action:hover {
  background: rgba(0, 0, 0, 0.8);
}

.notes-sheet-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px solid var(--notes-border);
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
}

.notes-button-primary {
  background: transparent;
  border: 2px solid var(--notes-accent);
  color: var(--notes-accent);
  font-weight: 600;
}
</style>
