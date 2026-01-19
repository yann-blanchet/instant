import { db } from "./index";

export async function getNextVisitNumber(projectId: string) {
  const visits = await db.visits
    .filter((visit) => visit.project_id === projectId)
    .toArray();
  const maxNumber = visits.reduce((max, visit) => {
    const value = visit.visit_number ?? 0;
    return value > max ? value : max;
  }, 0);
  return maxNumber + 1;
}
