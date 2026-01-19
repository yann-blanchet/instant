<template>
  <div v-if="open" class="image-modal" @click="emit('close')">
    <div class="image-modal-content" @click.stop>
      <img v-if="src" :src="src" :alt="alt" />
      <button class="image-modal-close" type="button" @click="emit('close')">
        ✕
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean;
  src: string | null;
  alt?: string;
}>();

const emit = defineEmits<{
  (event: "close"): void;
}>();

const alt = props.alt ?? "Image preview";
</script>

<style scoped>
.image-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.image-modal-content {
  position: relative;
  max-width: 100%;
  max-height: 100%;
}

.image-modal-content img {
  max-width: 100%;
  max-height: 90vh;
  border-radius: 12px;
  display: block;
}

.image-modal-close {
  position: absolute;
  top: -12px;
  right: -12px;
  border: none;
  background: #000;
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  font-size: 16px;
  line-height: 1;
}
</style>
