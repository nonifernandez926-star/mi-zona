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

const ZONA_ARG = "America/Argentina/Buenos_Aires";

// Fecha ('YYYY-MM-DD') y minutos del día en hora Argentina (el servidor de Render corre en UTC)
export function ahoraArgentina(fecha) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_ARG, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(fecha || new Date());
  const get = (t) => partes.find((x) => x.type === t).value;
  return { fecha: `${get("year")}-${get("month")}-${get("day")}`, minutos: (Number(get("hour")) % 24) * 60 + Number(get("minute")) };
}

export function sumarDias(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const nombreDia = (iso) => DIAS_SEMANA[new Date(`${iso}T12:00:00Z`).getUTCDay()];

// "viernes 3 de octubre de 2026"
export function descripcionDeFecha(iso) {
  return new Intl.DateTimeFormat("es-AR", { timeZone: ZONA_ARG, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${iso}T12:00:00-03:00`));
}

// Momento exacto de un evento (Argentina no tiene horario de verano: siempre UTC-3). Sin hora = 9:00.
export function momentoDeEvento(fecha, hora) {
  return Date.parse(`${fecha}T${hora || "09:00"}:00-03:00`);
}

export function sumarMeses(iso, meses) {
  const d = new Date(`${iso}T00:00:00Z`);
  const diaOriginal = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + meses);
  // 31 de enero + 1 mes no debe saltar a marzo: si el día cambió, volvemos al último día del mes anterior
  if (d.getUTCDate() !== diaOriginal) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}
