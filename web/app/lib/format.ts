// Created once at module level: building Intl formatters is slow, and the table renders many cells.
const priceFormatter = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
const dateFormatter = new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" });
const numberFormatter = new Intl.NumberFormat("en-AU");

// The API sends numeric(12,2) as a string; it only becomes a number here, at display.
export function formatPrice(value: string): string {
  return priceFormatter.format(Number(value));
}

// The API sends an ISO string, since JSON has no Date type.
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}
