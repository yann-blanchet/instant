export const formatDate = (value: string) =>
  new Date(value).toLocaleDateString();

export const formatDateTime = (value: string) =>
  new Date(value).toLocaleString();

export const formatVisitNumber = (value?: number | null) =>
  String(value ?? 0).padStart(3, "0");

export const formatRelativeTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} h ago`;

  return date.toLocaleDateString();
};
