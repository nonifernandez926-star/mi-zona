// Las fechas de vencimiento se guardan como "YYYY-MM-DD" (igual que en la web).
export function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export function diasHasta(iso) {
  if (!iso) return null;
  const objetivo = new Date(`${iso}T00:00:00Z`);
  const hoy = new Date(`${hoyISO()}T00:00:00Z`);
  return Math.round((objetivo - hoy) / 86400000);
}

export function sumarMeses(iso, meses) {
  const d = new Date(`${iso}T00:00:00Z`);
  const diaOriginal = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + meses);
  // 31 de enero + 1 mes no debe saltar a marzo: si el día cambió, volvemos al último día del mes anterior
  if (d.getUTCDate() !== diaOriginal) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}
