export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

export function getStatusColor(status: string): "default" | "success" | "warning" | "danger" | "info" {
  const map: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
    DRAFT: "default",
    REVIEW: "warning",
    PUBLISHED: "success",
    ARCHIVED: "danger",
    APPROVED: "success",
    PENDING: "warning",
    SPAM: "danger",
    TRASHED: "default",
  };
  return map[status] || "default";
}

export function getStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}