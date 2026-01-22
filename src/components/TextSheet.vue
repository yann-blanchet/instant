<template>
  <div v-if="isOpen" class="notes-sheet-backdrop" @click="handleClose">
    <div class="notes-sheet" @click.stop>
      <textarea
        ref="textAreaRef"
        v-model="localText"
        class="notes-sheet-textarea"
        rows="4"
        :placeholder="placeholder"
      />
      <div class="notes-sheet-actions">
        <button class="notes-button" type="button" @click="handleClose">Cancel</button>
        <button
          class="notes-button notes-button-primary"
          type="button"
          aria-label="Send text"
          @click="handleSend"
        >
          <svg class="notes-send-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M5 12h14M15 6l4 6-4 6"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    initialText?: string;
    placeholder?: string;
  }>(),
  {
    initialText: "",
    placeholder: "Écrire un texte...",
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  send: [text: string];
  close: [];
}>();

const isOpen = computed(() => props.modelValue);
const localText = ref(props.initialText);
const textAreaRef = ref<HTMLTextAreaElement | null>(null);

watch(
  () => props.modelValue,
  async (newValue) => {
    if (newValue) {
      localText.value = props.initialText || "";
      await nextTick();
      textAreaRef.value?.focus();
      // Select all text when editing (if initialText is provided)
      if (props.initialText && textAreaRef.value) {
        textAreaRef.value.select();
      }
    }
  }
);

watch(
  () => props.initialText,
  (newText) => {
    if (props.modelValue) {
      localText.value = newText || "";
    }
  }
);

const handleClose = () => {
  localText.value = "";
  emit("update:modelValue", false);
  emit("close");
};

const handleSend = () => {
  const trimmedText = localText.value.trim();
  if (!trimmedText) return;
  emit("send", trimmedText);
  localText.value = "";
  emit("update:modelValue", false);
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
  gap: 12px;
}

.notes-sheet-textarea {
  width: 100%;
  min-height: 120px;
  background: var(--notes-panel-strong);
  border: 1px solid var(--notes-panel-strong);
  border-radius: 12px;
  padding: 12px;
  color: var(--notes-text);
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
}

.notes-sheet-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.notes-button {
  background: var(--notes-panel-strong);
  border: none;
  color: var(--notes-text);
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
}

.notes-button-primary {
  background: var(--notes-accent);
  color: var(--notes-accent-contrast);
  font-weight: 600;
}

.notes-send-icon {
  width: 18px;
  height: 18px;
}
</style>