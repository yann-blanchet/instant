<template>
  <teleport to="body">
    <div v-if="isActive" class="photo-editor">
      <div class="photo-editor-header"></div>

      <div class="photo-editor-toolbar">
        <div class="photo-editor-colors">
          <button
            v-for="color in palette"
            :key="color"
            class="photo-editor-color"
            :class="{ active: activeColor === color }"
            type="button"
            :style="{ background: color }"
            @click="activeColor = color"
          />
        </div>
        <div class="photo-editor-sizes">
          <button
            v-for="size in brushSizes"
            :key="size"
            class="photo-editor-size"
            :class="{ active: activeSize === size }"
            type="button"
            @click="activeSize = size"
          >
            <span :style="{ width: `${size}px`, height: `${size}px` }"></span>
          </button>
        </div>
        <button class="photo-editor-action" type="button" @click="clearDrawings">
          Clear drawings
        </button>
      </div>

      <div ref="stageContainer" class="photo-editor-stage">
        <Stage
          ref="stageRef"
          :config="stageConfig"
          @mousedown="onPointerDown"
          @mousemove="onPointerMove"
          @mouseup="onPointerUp"
          @touchstart="onPointerDown"
          @touchmove="onPointerMove"
          @touchend="onPointerUp"
          @wheel="onWheel"
        >
          <Layer>
            <Group
              :config="groupConfig"
              @dragmove="onGroupDrag"
              @dragend="onGroupDrag"
            >
              <KImage :config="imageConfig" />
            </Group>
          </Layer>
          <Layer>
            <Group
              :config="groupConfig"
              @dragmove="onGroupDrag"
              @dragend="onGroupDrag"
            >
              <Line
                v-for="line in lines"
                :key="line.id"
                :config="line.config"
              />
            </Group>
          </Layer>
          <Layer>
            <Group
              :config="groupConfig"
              @dragmove="onGroupDrag"
              @dragend="onGroupDrag"
            >
              <Text
                v-for="item in texts"
                :key="item.id"
                :config="item.config"
                @click="selectText(item.id)"
                @tap="selectText(item.id)"
                @dragend="onTextDragEnd(item.id, $event)"
              />
            </Group>
          </Layer>
        </Stage>
      </div>

      <div v-if="isTextSheetOpen" class="photo-editor-sheet-backdrop" @click="closeTextSheet">
        <div class="photo-editor-sheet" @click.stop>
          <textarea
            v-model="textDraft"
            class="photo-editor-textarea"
            rows="4"
            placeholder="Ajouter un texte..."
          />
          <div class="photo-editor-sheet-actions">
            <button class="photo-editor-btn" type="button" @click="closeTextSheet">
              Cancel
            </button>
            <button
              class="photo-editor-btn photo-editor-btn-primary"
              type="button"
              @click="addText"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <div class="photo-editor-bottom-bar">
        <button class="photo-editor-bottom-cancel" type="button" @click="emitClose">
          Cancel
        </button>
        <button class="photo-editor-bottom-save" type="button" @click="sendImage">
          Save
        </button>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  Group,
  Image as KImage,
  Layer,
  Line,
  Stage,
  Text,
} from "vue-konva";

const props = defineProps<{
  isActive: boolean;
  imageField: { value: string };
  showSave: boolean;
}>();

const emit = defineEmits<{
  (event: "close"): void;
  (event: "update-image", payload: string): void;
  (event: "send-image", payload: string): void;
  (event: "delete"): void;
}>();

const stageRef = ref<InstanceType<typeof Stage> | null>(null);
const stageContainer = ref<HTMLDivElement | null>(null);
const stageSize = ref({ width: 0, height: 0 });
const transform = ref({ x: 0, y: 0, scale: 1 });
const tool = ref<"draw" | "text" | "pan">("draw");
const activeColor = ref("#000000");
const palette = ["#000000", "#ffffff", "#ff6b6b", "#4dabf7", "#40c057"];
const brushSizes = [6, 12, 20];
const activeSize = ref(10);
const isDrawing = ref(false);
const lines = ref<
  Array<{ id: string; config: { points: number[]; stroke: string; strokeWidth: number } }>
>([]);
const texts = ref<
  Array<{
    id: string;
    config: {
      text: string;
      x: number;
      y: number;
      fontSize: number;
      fill: string;
      draggable: boolean;
    };
  }>
>([]);
const selectedTextId = ref<string | null>(null);
const isTextSheetOpen = ref(false);
const textDraft = ref("");

const imageElement = ref<HTMLImageElement | null>(null);
const imageConfig = computed(() => ({
  image: imageElement.value,
  x: 0,
  y: 0,
  width: imageElement.value?.naturalWidth ?? 0,
  height: imageElement.value?.naturalHeight ?? 0,
}));

const stageConfig = computed(() => ({
  width: stageSize.value.width,
  height: stageSize.value.height,
}));

const groupConfig = computed(() => ({
  x: transform.value.x,
  y: transform.value.y,
  scaleX: transform.value.scale,
  scaleY: transform.value.scale,
  draggable: tool.value === "pan",
}));

const emitClose = () => emit("close");
const emitDelete = () => emit("delete");

const loadImage = (src: string) => {
  if (!src) return;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    imageElement.value = img;
    nextTick(() => {
      fitImageToStage();
    });
  };
  img.onerror = (error) => {
    console.error("Failed to load image:", error, src);
  };
  img.src = src;
};

const fitImageToStage = () => {
  if (!imageElement.value) return;
  if (!stageSize.value.width || !stageSize.value.height) return;
  const padding = 12;
  const scale = Math.min(
    (stageSize.value.width - padding * 2) / imageElement.value.naturalWidth,
    (stageSize.value.height - padding * 2) / imageElement.value.naturalHeight,
  );
  transform.value.scale = scale || 1;
  transform.value.x =
    (stageSize.value.width - imageElement.value.naturalWidth * transform.value.scale) / 2;
  transform.value.y =
    (stageSize.value.height - imageElement.value.naturalHeight * transform.value.scale) / 2;
};

const updateStageSize = () => {
  if (!stageContainer.value) return;
  const rect = stageContainer.value.getBoundingClientRect();
  const width = rect.width || window.innerWidth;
  const height = rect.height || window.innerHeight;
  stageSize.value = { width, height };
  fitImageToStage();
};

const toLocalPoint = (pos: { x: number; y: number }) => {
  return {
    x: (pos.x - transform.value.x) / transform.value.scale,
    y: (pos.y - transform.value.y) / transform.value.scale,
  };
};

const onPointerDown = (event: Event) => {
  if (!props.isActive) return;
  const stage = stageRef.value?.getStage();
  if (!stage) return;
  if (tool.value === "draw") {
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const local = toLocalPoint(pos);
    isDrawing.value = true;
    const id = `${Date.now()}-${Math.random()}`;
    lines.value.push({
      id,
      config: {
        points: [local.x, local.y],
        stroke: activeColor.value,
        strokeWidth: activeSize.value,
      },
    });
  } else if (tool.value === "text") {
    selectedTextId.value = null;
  }
};

const onPointerMove = (event: Event) => {
  if (!props.isActive) return;
  if (!isDrawing.value || tool.value !== "draw") return;
  const stage = stageRef.value?.getStage();
  if (!stage) return;
  const pos = stage.getPointerPosition();
  if (!pos) return;
  const local = toLocalPoint(pos);
  const line = lines.value[lines.value.length - 1];
  line.config.points = [...line.config.points, local.x, local.y];
};

const onPointerUp = () => {
  isDrawing.value = false;
};

const onWheel = (event: WheelEvent) => {
  event.preventDefault();
  const stage = stageRef.value?.getStage();
  if (!stage) return;
  const pointer = stage.getPointerPosition();
  if (!pointer) return;
  const oldScale = transform.value.scale;
  const scaleBy = 1.05;
  const newScale = event.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
  const local = toLocalPoint(pointer);
  transform.value.scale = Math.max(0.2, Math.min(newScale, 6));
  transform.value.x = pointer.x - local.x * transform.value.scale;
  transform.value.y = pointer.y - local.y * transform.value.scale;
};

let lastTouchDistance = 0;
const onTouchStart = (event: TouchEvent) => {
  if (event.touches.length === 2) {
    lastTouchDistance = getTouchDistance(event.touches);
  }
};

const onTouchMove = (event: TouchEvent) => {
  if (event.touches.length !== 2) return;
  const stage = stageRef.value?.getStage();
  if (!stage) return;
  const distance = getTouchDistance(event.touches);
  const delta = distance / lastTouchDistance;
  const midpoint = getTouchMidpoint(event.touches);
  const local = toLocalPoint(midpoint);
  transform.value.scale = Math.max(0.2, Math.min(transform.value.scale * delta, 6));
  transform.value.x = midpoint.x - local.x * transform.value.scale;
  transform.value.y = midpoint.y - local.y * transform.value.scale;
  lastTouchDistance = distance;
};

const getTouchDistance = (touches: TouchList) => {
  const [t1, t2] = [touches[0], touches[1]];
  return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
};

const getTouchMidpoint = (touches: TouchList) => {
  const [t1, t2] = [touches[0], touches[1]];
  return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
};

const onGroupDrag = (event: any) => {
  transform.value.x = event.target.x();
  transform.value.y = event.target.y();
};

const openTextSheet = () => {
  tool.value = "text";
  isTextSheetOpen.value = true;
};

const closeTextSheet = () => {
  isTextSheetOpen.value = false;
  textDraft.value = "";
};

const addText = () => {
  if (!textDraft.value.trim()) return;
  const stage = stageRef.value?.getStage();
  if (!stage) return;
  const center = toLocalPoint({ x: stage.width() / 2, y: stage.height() / 2 });
  const id = `${Date.now()}-${Math.random()}`;
  texts.value.push({
    id,
    config: {
      text: textDraft.value.trim(),
      x: center.x,
      y: center.y,
      fontSize: activeSize.value + 6,
      fill: activeColor.value,
      draggable: true,
    },
  });
  selectedTextId.value = id;
  closeTextSheet();
};

const selectText = (id: string) => {
  selectedTextId.value = id;
};

const onTextDragEnd = (id: string, event: any) => {
  const item = texts.value.find((entry) => entry.id === id);
  if (!item) return;
  item.config.x = event.target.x();
  item.config.y = event.target.y();
};

const clearDrawings = () => {
  lines.value = [];
};

const deleteSelectedText = () => {
  if (!selectedTextId.value) return;
  texts.value = texts.value.filter((item) => item.id !== selectedTextId.value);
  selectedTextId.value = null;
};

const saveImage = () => {
  const stage = stageRef.value?.getStage();
  if (!stage) return;
  const dataUrl = stage.toDataURL({ pixelRatio: 2 });
  emit("update-image", dataUrl);
};

const sendImage = () => {
  const stage = stageRef.value?.getStage();
  if (!stage) return;
  const dataUrl = stage.toDataURL({ pixelRatio: 2 });
  emit("send-image", dataUrl);
};

watch(
  () => props.imageField.value,
  (value) => {
    if (value && props.isActive) {
      nextTick(() => {
        updateStageSize();
        loadImage(value);
      });
    }
  },
  { immediate: true },
);

watch(
  () => stageSize.value,
  () => {
    fitImageToStage();
  },
  { deep: true },
);

watch(
  () => props.isActive,
  (active) => {
    if (active) {
      lines.value = [];
      texts.value = [];
      selectedTextId.value = null;
      tool.value = "draw";
      // Reload image when modal opens
      if (props.imageField.value) {
        nextTick(() => {
          updateStageSize();
          loadImage(props.imageField.value);
        });
      } else {
        nextTick(() => {
          updateStageSize();
        });
      }
    }
  },
);

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  window.addEventListener("resize", updateStageSize);
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: true });
  if (stageContainer.value) {
    resizeObserver = new ResizeObserver(() => updateStageSize());
    resizeObserver.observe(stageContainer.value);
  }
  requestAnimationFrame(updateStageSize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateStageSize);
  window.removeEventListener("touchstart", onTouchStart);
  window.removeEventListener("touchmove", onTouchMove);
  resizeObserver?.disconnect();
});
</script>

<style scoped>
.photo-editor {
  position: fixed;
  inset: 0;
  background: #000;
  color: #f3f4f6;
  z-index: 50;
  display: flex;
  flex-direction: column;
}

.photo-editor-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 16px;
}

.photo-editor-tools {
  display: flex;
  gap: 8px;
}

.photo-editor-tool {
  background: transparent;
  color: #f3f4f6;
  border: 1px solid #2c2c2e;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
}

.photo-editor-tool.active {
  border-color: #f8c44c;
  color: #f8c44c;
}

.photo-editor-btn {
  border: 1px solid #2c2c2e;
  background: transparent;
  color: #f3f4f6;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
}

.photo-editor-btn-primary {
  border: 2px solid #f8c44c;
  color: #f8c44c;
}

.photo-editor-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 16px;
  flex-wrap: wrap;
}

.photo-editor-colors {
  display: flex;
  gap: 8px;
  align-items: center;
}

.photo-editor-color {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: 2px solid #2c2c2e;
  padding: 0;
}

.photo-editor-color.active {
  border-color: #f8c44c;
}

.photo-editor-sizes {
  display: flex;
  gap: 8px;
  align-items: center;
}

.photo-editor-size {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 2px solid #2c2c2e;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.photo-editor-size span {
  display: block;
  border-radius: 999px;
  background: #f3f4f6;
}

.photo-editor-size.active {
  border-color: #f8c44c;
}

.photo-editor-field {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.photo-editor-action {
  background: transparent;
  color: #f3f4f6;
  border: 1px solid #2c2c2e;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
}

.photo-editor-action:disabled {
  opacity: 0.5;
}

.photo-editor-stage {
  flex: 1;
  background: #000;
  min-height: 0;
  display: flex;
}

.photo-editor-sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.photo-editor-sheet {
  background: #1c1c1e;
  width: min(480px, 100%);
  border-radius: 18px 18px 0 0;
  padding: 16px;
}

.photo-editor-textarea {
  width: 100%;
  background: #2c2c2e;
  border: none;
  border-radius: 12px;
  color: #f3f4f6;
  padding: 10px 12px;
  font-size: 14px;
}

.photo-editor-sheet-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.photo-editor-bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  padding: 12px 16px;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.photo-editor-bottom-cancel,
.photo-editor-bottom-save {
  flex: 1;
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
}

.photo-editor-bottom-cancel {
  border: 1px solid #2c2c2e;
  background: transparent;
  color: #f3f4f6;
}

.photo-editor-bottom-save {
  border: 2px solid #f8c44c;
  background: #000;
  color: #f8c44c;
}
</style>
