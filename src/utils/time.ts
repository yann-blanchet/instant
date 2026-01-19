export const nowIso = () => new Date().toISOString();
export const todayIso = () => new Date().toISOString().slice(0, 10);
export const makeId = () => crypto.randomUUID();
