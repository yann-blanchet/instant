import type { Category, Intervenant, Task } from "../db/types";
import { formatVisitNumber } from "./format";

export const PDF_CSS = `
  .pdf-header {
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e0e0e0;
  }
  .pdf-header h1 {
    font-size: 22px;
    margin: 0 0 8px;
    font-weight: 700;
    color: #111;
  }
  .pdf-meta {
    font-size: 14px;
    color: #666;
  }
  .pdf-section-title {
    font-size: 14px;
    text-transform: uppercase;
    color: #666;
    margin: 24px 0 12px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  .pdf-assignee-group {
    margin-bottom: 20px;
  }
  .pdf-assignee-name {
    font-size: 13px;
    font-weight: 600;
    margin: 0 0 8px;
    color: #333;
  }
  .pdf-task {
    margin-bottom: 12px;
    padding-left: 12px;
    border-left: 2px solid #e0e0e0;
  }
  .pdf-observations {
    margin-bottom: 8px;
  }
  .pdf-observation-text {
    margin-bottom: 6px;
    line-height: 1.6;
    color: #333;
  }
  .pdf-photos {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }
  .pdf-photo {
    max-width: 200px;
    max-height: 200px;
    object-fit: contain;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
  }
  .pdf-category-badge {
    display: inline-block;
    border: 1px solid #ccc;
    border-radius: 999px;
    padding: 2px 6px;
    font-size: 10px;
    margin-left: 6px;
    font-weight: 500;
  }
  .pdf-conclusion {
    margin-bottom: 12px;
    line-height: 1.6;
    color: #333;
  }
  .pdf-empty {
    padding: 20px;
    color: #999;
    font-style: italic;
    text-align: center;
  }
  .pdf-empty-task {
    color: #999;
    font-style: italic;
    font-size: 13px;
  }
`;

export interface GeneratePdfContentOptions {
  projectName: string;
  tasks: Task[];
  taskContentMap: Record<string, { observations: string[]; photos: string[] }>;
  intervenants: Intervenant[];
  categories: Category[];
  visitNumber?: number;
  visitDate?: string;
  conclusion?: string | null;
}

const getTaskAssignee = (task: Task, intervenants: Intervenant[]): Intervenant | null => {
  if (!task.intervenant_id) return null;
  return intervenants.find((i) => i.id === task.intervenant_id) ?? null;
};

const getAssigneeDisplayName = (task: Task, intervenants: Intervenant[]): string => {
  const assignee = getTaskAssignee(task, intervenants);
  return assignee?.name || "Générale";
};

const getIntervenantCategories = (intervenant: Intervenant | null, categories: Category[]) => {
  if (!intervenant?.category_ids || intervenant.category_ids.length === 0) return [];
  return categories.filter((c) => intervenant.category_ids?.includes(c.id));
};

export const generatePdfContent = (options: GeneratePdfContentOptions): string => {
  const {
    projectName,
    tasks,
    taskContentMap,
    intervenants,
    categories,
    visitNumber,
    visitDate,
    conclusion,
  } = options;

  if (tasks.length === 0) {
    const metaHtml = visitNumber !== undefined && visitDate
      ? `<div class="pdf-meta">Visite ${formatVisitNumber(visitNumber)} · ${visitDate}</div>`
      : "";
    const conclusionHtml = conclusion
      ? `<h2 class="pdf-section-title">Conclusion</h2><div class="pdf-conclusion">${conclusion}</div>`
      : "";
    
    return `
      <div class="pdf-header">
        <h1>${projectName}</h1>
        ${metaHtml}
      </div>
      <div class="pdf-empty">Aucune observation ouverte pour ce projet.</div>
      ${conclusionHtml}
    `;
  }

  const assignedTasks: Task[] = [];
  const generaleTasks: Task[] = [];

  tasks.forEach((task) => {
    if (task.intervenant_id) {
      assignedTasks.push(task);
    } else {
      generaleTasks.push(task);
    }
  });

  // Group assigned tasks by assignee
  const assigneeMap = new Map<string, Task[]>();
  assignedTasks.forEach((task) => {
    const assigneeId = task.intervenant_id!;
    if (!assigneeMap.has(assigneeId)) {
      assigneeMap.set(assigneeId, []);
    }
    assigneeMap.get(assigneeId)!.push(task);
  });

  const assignedGroups: Array<{ assigneeName: string; categories: Category[]; tasks: Task[] }> = [];
  assigneeMap.forEach((taskList, assigneeId) => {
    const assignee = intervenants.find(i => i.id === assigneeId) ?? null;
    const firstTask = taskList[0];
    assignedGroups.push({
      assigneeName: getAssigneeDisplayName(firstTask, intervenants),
      categories: getIntervenantCategories(assignee, categories),
      tasks: taskList,
    });
  });

  assignedGroups.sort((a, b) => a.assigneeName.localeCompare(b.assigneeName));

  const renderTaskContent = (task: Task) => {
    const taskObservations = task.observations ?? [];
    const content = taskContentMap[task.id] || { observations: [], photos: [] };
    const allObservations = taskObservations.length > 0 ? taskObservations : content.observations;

    let html = "";

    if (allObservations.length > 0) {
      html += `<div class="pdf-observations">${allObservations.map(obs => `<div class="pdf-observation-text">${obs}</div>`).join("")}</div>`;
    }

    if (content.photos.length > 0) {
      html += `<div class="pdf-photos">${content.photos.map(url => `<img src="${url}" alt="Observation photo" class="pdf-photo" />`).join("")}</div>`;
    }

    if (!html) {
      html = `<div class="pdf-empty-task">Aucun contenu</div>`;
    }

    return html;
  };

  const assignedHtml = assignedGroups.length > 0
    ? assignedGroups.map((group) => {
        const categoryBadges = group.categories.length > 0
          ? group.categories.map(c => `<span class="pdf-category-badge" style="border-color: ${c.color || '#ccc'};"">${c.name}</span>`).join("")
          : "";
        const tasksHtml = group.tasks.map(task => `<div class="pdf-task">${renderTaskContent(task)}</div>`).join("");
        return `
          <div class="pdf-assignee-group">
            <h3 class="pdf-assignee-name">${group.assigneeName}${categoryBadges}</h3>
            ${tasksHtml}
          </div>
        `;
      }).join("")
    : "";

  const generaleHtml = generaleTasks.length > 0
    ? `<div class="pdf-assignee-group">
        <h3 class="pdf-assignee-name">Générale</h3>
        ${generaleTasks.map(task => `<div class="pdf-task">${renderTaskContent(task)}</div>`).join("")}
      </div>`
    : "";

  const conclusionHtml = conclusion
    ? `<h2 class="pdf-section-title">Conclusion</h2><div class="pdf-conclusion">${conclusion}</div>`
    : "";

  const metaHtml = visitNumber !== undefined && visitDate
    ? `<div class="pdf-meta">Visite ${formatVisitNumber(visitNumber)} · ${visitDate}</div>`
    : "";

  return `
    <div class="pdf-header">
      <h1>${projectName}</h1>
      ${metaHtml}
    </div>
    ${assignedHtml ? `<h2 class="pdf-section-title">Observations par intervenant</h2>${assignedHtml}` : ""}
    ${generaleHtml ? `<h2 class="pdf-section-title">Observations générales</h2>${generaleHtml}` : ""}
    ${conclusionHtml}
  `;
};

export const exportPdf = (
  title: string,
  content: string,
  css: string = PDF_CSS
) => {
  const fullCss = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      padding: 24px; 
      color: #111; 
      background: white; 
      line-height: 1.5;
    }
    ${css}
    @media print {
      body { padding: 0; }
      .pdf-header { page-break-after: avoid; }
      .pdf-assignee-group { page-break-inside: avoid; }
      .pdf-task { page-break-inside: avoid; }
    }
  `;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>${fullCss}</style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
};
