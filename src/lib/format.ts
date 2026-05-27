export const formatKES = (n: number | null | undefined) => {
  if (n === null || n === undefined || isNaN(Number(n))) return "—";
  return "KES " + Number(n).toLocaleString("en-KE", { maximumFractionDigits: 0 });
};

export const formatDate = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const formatPct = (n: number | null | undefined) => {
  if (n === null || n === undefined || isNaN(Number(n))) return "—";
  return Number(n).toFixed(1) + "%";
};
