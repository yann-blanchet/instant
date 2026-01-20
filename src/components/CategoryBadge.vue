<template>
  <component
    :is="clickable ? 'button' : 'span'"
    :class="[
      'notes-category-badge',
      `notes-category-badge--${variant}`,
      { active: active },
    ]"
    :style="color ? { borderColor: color } : {}"
    :type="clickable ? 'button' : undefined"
    @click="clickable ? $emit('click', $event) : undefined"
  >
    {{ label }}
  </component>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Category } from "../db/types";

const props = withDefaults(
  defineProps<{
    category?: Category;
    label?: string;
    variant?: "default" | "header" | "task";
    active?: boolean;
    clickable?: boolean;
  }>(),
  {
    variant: "default",
    active: false,
    clickable: false,
  }
);

defineEmits<{
  click: [event: MouseEvent];
}>();

const color = computed(() => props.category?.color);
const label = computed(() => props.label || props.category?.name || "");
</script>

<style scoped>
.notes-category-badge {
  border-radius: 999px;
  font-weight: 500;
  border: 1px solid var(--notes-border);
  transition: all 0.2s;
}

/* Default variant */
.notes-category-badge--default {
  background: var(--notes-panel-strong);
  color: var(--notes-text);
  padding: 6px 12px;
  font-size: 12px;
}

.notes-category-badge--default.clickable,
.notes-category-badge--default[type="button"] {
  cursor: pointer;
}

.notes-category-badge--default.active {
  background: var(--notes-accent);
  color: var(--notes-accent-contrast);
  border-color: var(--notes-accent);
}

/* Header variant */
.notes-category-badge--header {
  background: transparent;
  color: var(--notes-text);
  padding: 4px 8px;
  font-size: 11px;
}

/* Task variant */
.notes-category-badge--task {
  background: transparent;
  color: var(--notes-text);
  padding: 2px 6px;
  font-size: 10px;
}
</style>
