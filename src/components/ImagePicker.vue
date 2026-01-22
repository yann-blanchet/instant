<template>
  <input
    ref="fileInputRef"
    type="file"
    accept="image/*"
    capture="environment"
    class="notes-hidden-input"
    @change="handleFileSelected"
  />
  <PhotoEditorModal
    :is-active="isPhotoEditorOpen"
    :image-field="photoEditorSource"
    :show-save="true"
    @send-image="handlePhotoEdited"
    @close="closePhotoEditor"
  />
</template>

<script setup lang="ts">
import { ref } from "vue";
import PhotoEditorModal from "./PhotoEditorModal.vue";

const emit = defineEmits<{
  "image-selected": [blob: Blob];
  "cancel": [];
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const isPhotoEditorOpen = ref(false);
const photoEditorSource = ref<{ value: string }>({ value: "" });

const open = () => {
  fileInputRef.value?.click();
};

const handleFileSelected = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  
  // Create blob URL for PhotoEditorModal
  photoEditorSource.value.value = URL.createObjectURL(file);
  isPhotoEditorOpen.value = true;
  
  // Reset input for next selection
  input.value = "";
};

const closePhotoEditor = (emitCancel = true) => {
  // Revoke blob URL if it exists
  if (photoEditorSource.value.value.startsWith("blob:")) {
    URL.revokeObjectURL(photoEditorSource.value.value);
  }
  photoEditorSource.value.value = "";
  isPhotoEditorOpen.value = false;
  if (emitCancel) {
    emit("cancel");
  }
};

const handlePhotoEdited = async (dataUrl: string) => {
  // Convert data URL to blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  
  // Close editor and clean up (don't emit cancel since we're sending the image)
  closePhotoEditor(false);
  
  // Emit the blob to parent
  emit("image-selected", blob);
};

// Expose open method for parent components
defineExpose({
  open,
});
</script>

<style scoped>
.notes-hidden-input {
  display: none;
}
</style>