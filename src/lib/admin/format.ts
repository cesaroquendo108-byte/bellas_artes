const adminDateTimeFormat = new Intl.DateTimeFormat("es-VE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Caracas",
});

export function formatAdminDateTime(value: string) {
  return adminDateTimeFormat.format(new Date(value));
}

export function formatRelativeAt(value: string, reference: string) {
  const seconds = Math.max(
    Math.round((Date.parse(reference) - Date.parse(value)) / 1_000),
    0,
  );
  if (seconds < 60) return `hace ${seconds}s`;
  if (seconds < 3_600) return `hace ${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `hace ${Math.floor(seconds / 3_600)}h`;
  return formatAdminDateTime(value);
}
