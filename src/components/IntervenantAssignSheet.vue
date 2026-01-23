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
        <button
          v-if="meIntervenant"
          class="notes-sheet-row"
          type="button"
          :class="{ active: currentIntervenantId === meIntervenant.id }"
          @click="handleAssign(meIntervenant.id)"
        >
          <div class="notes-sheet-row-content">
            <div class="notes-sheet-row-name">{{ meIntervenant.name }}</div>
            <div v-if="getIntervenantCategories(meIntervenant).length > 0" class="notes-sheet-row-badges">
              <CategoryBadge
                v-for="category in getIntervenantCategories(meIntervenant)"
                :key="category.id"
                :category="category"
                variant="header"
              />
            </div>
          </div>
        </button>
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Category, Intervenant } from "../db/types";
import CategoryBadge from "./CategoryBadge.vue";

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
  "create-generale": [];
  "create-me": [];
}>();

const isOpen = computed(() => props.modelValue);

const meIntervenant = computed(() => {
  return props.intervenants.find((i) => i.name.toLowerCase() === "me");
});

const generaleIntervenant = computed(() => {
  return props.intervenants.find((i) => i.name.toLowerCase() === "générale" || i.name.toLowerCase() === "generale");
});

const otherIntervenants = computed(() => {
  const filtered = props.intervenants.filter((i) => {
    const nameLower = i.name.toLowerCase();
    return nameLower !== "me" && nameLower !== "générale" && nameLower !== "generale";
  });
  return filtered;
});

const handleClose = () => {
  emit("update:modelValue", false);
  emit("close");
};

const handleAssign = (intervenantId: string | null) => {
  emit("assign", intervenantId);
  handleClose();
};

const handleAssignMe = () => {
  emit("create-me");
};

const handleAssignGenerale = () => {
  emit("create-generale");
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
</style>
