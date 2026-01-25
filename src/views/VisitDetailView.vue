<template>
  <section class="notes-screen notes-bottom-sheet">
    <div class="notes-sheet-handle" aria-hidden="true"></div>
    <header class="notes-header">
      <div class="notes-header-left">
        <div>
          <h1 class="notes-title">
            Visite {{ formatVisitNumber(visit?.visit_number) }}
          </h1>
          <div class="notes-subtitle">{{ project?.name }}</div>
        </div>
      </div>
      <div class="notes-header-actions">
      </div>
    </header>

    <div v-if="!visit" class="notes-list">
      <div class="notes-row notes-row-empty">Visit not found.</div>
    </div>

    <div v-else>
      <div class="notes-tabs">
        <button
          class="notes-tab"
          :class="{ active: activeTab === 'details' }"
          type="button"
          @click="activeTab = 'details'"
        >
          Details
        </button>
        <button
          class="notes-tab"
          :class="{ active: activeTab === 'preview' }"
          type="button"
          @click="activeTab = 'preview'"
        >
          PDF Preview
        </button>
      </div>

      <div v-if="activeTab === 'details'" class="notes-stack">
        <div class="notes-list notes-form">
          <label class="notes-field">
            <span class="notes-label">Date</span>
            <input v-model="draft.date" type="date" class="notes-input" />
          </label>
          <label class="notes-field">
            <span class="notes-label">Conclusion</span>
            <textarea v-model="draft.conclusion" class="notes-textarea" rows="3" />
          </label>
        </div>
      </div>

      <VisitPdfPreview
        v-else-if="activeTab === 'preview'"
        :visit="visit"
        :project="project"
        :tasks="openTasks"
        :task-content-map="taskContentMap"
        :intervenants="intervenants"
        :categories="categories"
      />
    </div>

    <div class="notes-bottom-bar">
      <button class="notes-bottom-cancel" type="button" @click="handleBack" :disabled="isGeneratingPdf">
        Cancel
      </button>
      <button class="notes-bottom-action" type="button" @click="exportVisitPdf">
        PDF
      </button>
      <button class="notes-bottom-save" type="button" @click="handleTerminerVisit()" :disabled="isGeneratingPdf">
        <span v-if="isGeneratingPdf" class="spinner">
          <svg class="spinner-icon" viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="31.4 62.8">
              <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
            </circle>
          </svg>
          Génération...
        </span>
        <span v-else>Clore</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useLiveQuery } from "../composables/useLiveQuery";
import { db } from "../db";
import type { Category, Intervenant, Task, TaskPhoto } from "../db/types";
import { formatVisitNumber } from "../utils/format";
import { nowIso } from "../utils/time";
import VisitPdfPreview from "../components/VisitPdfPreview.vue";
import { generatePdfContent, exportPdf, generatePdfHtml, PDF_CSS } from "../utils/pdfGenerator";
import { supabase } from "../supabase";

const props = defineProps<{ id: string }>();
const router = useRouter();

const visit = useLiveQuery(() => db.visits.get(props.id), null);
const project = useLiveQuery(
  async () => {
    if (!visit.value?.project_id) return null;
    const proj = await db.projects.get(visit.value.project_id);
    return proj;
  },
  null,
);
// Use a ref for tasks and watch projectId to update it
const openTasks = ref<Task[]>([]);
const isGeneratingPdf = ref(false);

watch(
  () => visit.value?.project_id,
  async (projectId) => {
    if (!projectId) {
      openTasks.value = [];
      return;
    }
    console.log("Querying open tasks for project:", projectId);
    // Get all open tasks for the project
    const allTasks = await db.tasks
      .filter((task) => !task.deleted_at && task.project_id === projectId)
      .toArray();
    console.log("All tasks for project:", allTasks.length, allTasks.map(t => ({ id: t.id, status: t.status, project_id: t.project_id })));
    const open = allTasks.filter(task => task.status === "open");
    console.log("Open tasks:", open.length, open.map(t => ({ id: t.id, observations: t.observations?.length || 0, photo_ids: t.photo_ids?.length || 0 })));
    openTasks.value = open;
  },
  { immediate: true }
);

const taskPhotos = ref<TaskPhoto[]>([]);

watch(openTasks, async () => {
  const taskIds = openTasks.value.map(t => t.id);
  if (taskIds.length === 0) {
    taskPhotos.value = [];
    return;
  }
  taskPhotos.value = await db.task_photos
    .where("task_id")
    .anyOf(taskIds)
    .toArray();
}, { immediate: true });

const intervenants = useLiveQuery(() => db.intervenants.toArray(), []);
const categories = useLiveQuery(() => db.categories.toArray(), []);

const taskContentMap = computed(() => {
  const map: Record<string, { observations: string[]; photos: string[] }> = {};
  const photosById = new Map(taskPhotos.value.map((photo: TaskPhoto) => [photo.id, photo]));
  
  openTasks.value.forEach((task) => {
    const observations = task.observations ?? [];
    const photoUrls: string[] = [];
    
    (task.photo_ids ?? []).forEach((photoId) => {
      const photo = photosById.get(photoId);
      if (photo?.image_blob) {
        photoUrls.push(URL.createObjectURL(photo.image_blob));
      } else if (photo?.url) {
        photoUrls.push(photo.url);
      }
    });
    
    map[task.id] = { observations, photos: photoUrls };
  });
  
  return map;
});

const activeTab = ref<"details" | "preview">("details");
const statusTasks = useLiveQuery(
  async () => {
    if (!visit.value) return [] as Task[];
    const visitId = visit.value.id;
    return db.tasks
      .filter(
        (task) =>
          !task.deleted_at &&
          (task.opened_visit_id === visitId || task.done_visit_id === visitId),
      )
      .toArray();
  },
  [] as Task[],
);

const draft = reactive({
  date: "",
  conclusion: "",
});


watch(
  visit,
  (value) => {
    if (!value) return;
    draft.date = value.date;
    draft.conclusion = value.conclusion ?? "";
  },
  { immediate: true },
);

const handleTerminerVisit = async () => {
  console.log("=== CLORE BUTTON CLICKED ===");
  console.log("Visit exists:", !!visit.value);
  
  isGeneratingPdf.value = true;
  
  try {
    if (!visit.value) {
      console.log("Early return: missing visit");
      return;
    }
    
    // Fetch project directly to ensure it's loaded
    const currentProject = await db.projects.get(visit.value.project_id);
    console.log("Project loaded:", !!currentProject);
    
    if (!currentProject) {
      console.log("Early return: project not found");
      return;
    }
    
    console.log("=== Starting visit finalization ===");
    console.log("Visit ID:", visit.value.id);
    console.log("Project ID:", currentProject.id);
    console.log("Supabase configured:", !!supabase);
    
    // Convert image URLs to base64 for embedding in PDF
    console.log("Converting images to base64...");
    const taskContentMapWithBase64: Record<string, { observations: string[]; photos: string[] }> = {};
    
    for (const [taskId, content] of Object.entries(taskContentMap.value)) {
      const base64Photos: string[] = [];
      
      for (const photoUrl of content.photos) {
        try {
          const response = await fetch(photoUrl);
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          base64Photos.push(base64);
        } catch (error) {
          console.error("Error converting image to base64:", error);
          // Keep original URL as fallback
          base64Photos.push(photoUrl);
        }
      }
      
      taskContentMapWithBase64[taskId] = {
        observations: content.observations,
        photos: base64Photos,
      };
    }
    
    console.log("Images converted, generating PDF content...");
    
    // Generate PDF
    const title = `Visite ${formatVisitNumber(visit.value.visit_number ?? 0)}`;
    
    const content = generatePdfContent({
      projectName: currentProject.name,
      tasks: openTasks.value,
      taskContentMap: taskContentMapWithBase64,
      intervenants: intervenants.value,
      categories: categories.value,
      visitNumber: visit.value.visit_number,
      visitDate: draft.date,
      conclusion: draft.conclusion,
    });
    
    console.log("Generating PDF HTML...");
    const htmlContent = generatePdfHtml(title, content);
    const blob = new Blob([htmlContent], { type: "text/html" });
    console.log("PDF blob created, size:", blob.size, "bytes");
    
    let pdfUrl: string | null = null;
    
    // Upload to Supabase if available
    if (supabase) {
      try {
        const filePath = `project_${currentProject.id}/visit_${visit.value.id}.pdf`;
        
        console.log("Uploading PDF to:", filePath);
        
        // Upload the HTML file (which can be opened and printed as PDF)
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("visit-pdfs")
          .upload(filePath, blob, {
            contentType: "text/html",
            upsert: true,
          });
        
        if (uploadError) {
          console.error("Error uploading PDF:", uploadError);
        } else {
          console.log("PDF uploaded successfully:", uploadData);
          // Get public URL
          const { data } = supabase.storage
            .from("visit-pdfs")
            .getPublicUrl(filePath);
          
          pdfUrl = data.publicUrl;
          console.log("PDF public URL:", pdfUrl);
        }
      } catch (error) {
        console.error("Error uploading PDF to Supabase:", error);
      }
    } else {
      console.warn("Supabase not configured, PDF will not be uploaded");
    }
    
    // Update visit with pdf_url
    await db.visits.update(visit.value.id, {
      date: draft.date,
      conclusion: draft.conclusion,
      ended_at: nowIso(),
      pdf_url: pdfUrl,
      updated_at: nowIso(),
    });
  } finally {
    isGeneratingPdf.value = false;
    handleBack();
  }
};

const handleBack = () => {
  router.back();
};


const getTaskAssignee = (task: Task): Intervenant | null => {
  if (!task.intervenant_id) return null;
  return intervenants.value.find((i) => i.id === task.intervenant_id) ?? null;
};

const getAssigneeDisplayName = (task: Task): string => {
  const assignee = getTaskAssignee(task);
  return assignee?.name || "Générale";
};

const getIntervenantCategories = (intervenant: Intervenant | null) => {
  if (!intervenant?.category_ids || intervenant.category_ids.length === 0) return [];
  return categories.value.filter((c) => intervenant.category_ids?.includes(c.id));
};

const exportVisitPdf = async () => {
  if (!visit.value) return;
  const title = `Visite ${formatVisitNumber(visit.value.visit_number ?? 0)}`;
  
  const content = generatePdfContent({
    projectName: project.value?.name || "Projet",
    tasks: openTasks.value,
    taskContentMap: taskContentMap.value,
    intervenants: intervenants.value,
    categories: categories.value,
    visitNumber: visit.value.visit_number,
    visitDate: visit.value.date,
    conclusion: visit.value.conclusion,
  });
  
  exportPdf(title, content);
};
</script>

<style scoped>
.notes-screen {
  min-height: 100vh;
  background: var(--notes-bg);
  color: var(--notes-text);
  padding: 28px 20px 36px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.notes-bottom-sheet {
  position: fixed;
  inset: 0;
  overflow-y: auto;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  box-shadow: 0 -18px 40px rgba(0, 0, 0, 0.45);
  padding-bottom: calc(36px + env(safe-area-inset-bottom));
}

.notes-sheet-handle {
  width: 48px;
  height: 5px;
  border-radius: 999px;
  background: var(--notes-border);
  margin: 10px auto 6px;
}

.notes-bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  border-top: none;
  padding: 12px 20px;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.notes-bottom-cancel,
.notes-bottom-save,
.notes-bottom-action {
  flex: 1;
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
}

.notes-bottom-cancel {
  border: 1px solid var(--notes-border);
  background: transparent;
  color: var(--notes-text);
}

.notes-bottom-action {
  border: 1px solid var(--notes-border);
  background: transparent;
  color: var(--notes-text);
}

.notes-bottom-save {
  border: 2px solid var(--notes-accent);
  background: #000;
  color: var(--notes-accent);
}

.notes-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.notes-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.notes-header-left {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.notes-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.notes-subtitle {
  color: var(--notes-muted);
  font-size: 14px;
  margin-top: 4px;
}

.notes-back {
  border: none;
  background: transparent;
  color: var(--notes-accent);
  font-size: 28px;
  line-height: 1;
  padding: 2px 6px;
}

.notes-action {
  color: var(--notes-accent);
  font-weight: 600;
  background: transparent;
  border: none;
}

.notes-section-label {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--notes-muted);
  margin-top: 4px;
}

.notes-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notes-list {
  background: var(--notes-panel);
  border-radius: 16px;
  overflow: hidden;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}


.notes-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: inherit;
}

.notes-row-empty {
  color: var(--notes-muted);
  font-size: 14px;
}

.notes-form {
  gap: 16px;
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

.notes-input,
.notes-textarea {
  width: 100%;
  background: var(--notes-panel-strong);
  border: 1px solid var(--notes-panel-strong);
  border-radius: 12px;
  padding: 10px 12px;
  color: var(--notes-text);
  font-size: 14px;
}

.notes-input::placeholder,
.notes-textarea::placeholder {
  color: var(--notes-muted);
}

.notes-row-inline {
  display: flex;
  gap: 10px;
  align-items: center;
}

.notes-button {
  background: var(--notes-panel-strong);
  border: none;
  color: var(--notes-text);
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
}

.notes-button-primary {
  background: var(--notes-accent);
  color: var(--notes-accent-contrast);
  font-weight: 600;
}

.notes-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.notes-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.notes-chip {
  background: var(--notes-chip);
  color: var(--notes-text);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
}

.notes-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.notes-tab {
  border: 1px solid var(--notes-border);
  background: transparent;
  color: var(--notes-text);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.notes-tab.active {
  background: var(--notes-panel-strong);
  border-color: var(--notes-accent);
}

.spinner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.spinner-icon {
  width: 16px;
  height: 16px;
  color: currentColor;
}

</style>
