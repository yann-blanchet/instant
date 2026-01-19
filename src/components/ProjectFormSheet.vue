<template>
  <div v-if="open" class="notes-sheet-backdrop" @click="emitClose">
    <div class="notes-sheet" @click.stop>
      <div class="notes-sheet-title">{{ title }}</div>
      <div class="notes-list notes-form notes-edit-form">
        <label class="notes-field">
          <span class="notes-label">Name</span>
          <input v-model="localName" class="notes-input" />
        </label>
        <label class="notes-field">
          <span class="notes-label">Address</span>
          <input v-model="localAddress" class="notes-input" />
        </label>
      </div>
      <div class="notes-sheet-actions">
        <button class="notes-button" type="button" @click="emitClose">Cancel</button>
        <button class="notes-button notes-button-primary" type="button" @click="emitSave">
          Save
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  open: boolean;
  title: string;
  name: string;
  address: string;
}>();

const emit = defineEmits<{
  (event: "close"): void;
  (event: "save", payload: { name: string; address: string }): void;
}>();

const localName = ref("");
const localAddress = ref("");

watch(
  () => [props.open, props.name, props.address],
  () => {
    if (!props.open) return;
    localName.value = props.name;
    localAddress.value = props.address;
  },
  { immediate: true },
);

const emitClose = () => emit("close");
const emitSave = () => emit("save", { name: localName.value, address: localAddress.value });
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
  padding: 18px 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notes-sheet-title {
  font-size: 18px;
  font-weight: 600;
}

.notes-list {
  background: var(--notes-panel);
  border-radius: 16px;
  overflow: hidden;
  padding: 12px 0 4px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notes-form {
  gap: 12px;
}

.notes-edit-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.notes-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notes-label {
  font-size: 13px;
  color: var(--notes-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.notes-input {
  width: 100%;
  background: var(--notes-panel-strong);
  border: 1px solid var(--notes-panel-strong);
  border-radius: 14px;
  padding: 12px 14px;
  color: var(--notes-text);
  font-size: 15px;
}

.notes-sheet-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.notes-button {
  flex: 1;
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid var(--notes-border);
  background: transparent;
  color: var(--notes-text);
}

.notes-button-primary {
  border: 2px solid var(--notes-accent);
  background: #000;
  color: var(--notes-accent);
}
</style>
