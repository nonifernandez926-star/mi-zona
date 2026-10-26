// Horarios semanales (mismo formato que en negocios): 7 entradas indexadas por getDay() (0 = domingo); [abre, cierra] o [null] si ese día no atiende.
export const DIAS_LARGO = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const DIAS_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0]; // se muestra de lunes a domingo
export const semanaVacia = () => [0, 1, 2, 3, 4, 5, 6].map(() => [null]);
export const hayHorarios = (w) => Array.isArray(w) && w.length === 7 && w.some((d) => d && d[0] !== null && d[0] !== undefined);
export const hora = (h) => `${String(h === 24 ? 0 : h).padStart(2, "0")}:00`;

export function abiertoAhora(w, ahora = new Date()) {
  if (!hayHorarios(w)) return null; // null = no informó horarios
  const d = w[ahora.getDay()];
  if (!d || d[0] === null || d[0] === undefined) return false;
  const [a, c] = d, h = ahora.getHours();
  if (c > a) return h >= a && h < c;
  return h >= a || h < c; // cruza la medianoche
}

// "Lun a Vie 09:00–18:00 · Sáb 09:00–13:00": junta días seguidos con el mismo horario
export function resumenHorarios(w) {
  if (!hayHorarios(w)) return "";
  const grupos = [];
  ORDEN_SEMANA.forEach((dia) => {
    const e = w[dia]; if (!e || e[0] === null) return;
    const clave = `${e[0]}-${e[1]}`; const ult = grupos[grupos.length - 1];
    const idx = ORDEN_SEMANA.indexOf(dia);
    if (ult && ult.clave === clave && ult.fin === idx - 1) ult.fin = idx; else grupos.push({ clave, ini: idx, fin: idx, e });
  });
  return grupos.map((g) => {
    const dias = g.ini === g.fin ? DIAS_CORTO[ORDEN_SEMANA[g.ini]] : g.fin === g.ini + 1 ? `${DIAS_CORTO[ORDEN_SEMANA[g.ini]]} y ${DIAS_CORTO[ORDEN_SEMANA[g.fin]]}` : `${DIAS_CORTO[ORDEN_SEMANA[g.ini]]} a ${DIAS_CORTO[ORDEN_SEMANA[g.fin]]}`;
    return `${dias} ${hora(g.e[0])}–${hora(g.e[1])}`;
  }).join(" · ");
}
// Para las fichas viejas que usan "dias" + texto: se mantienen sincronizados al guardar
const CLAVES_DIA = { 1: "lun", 2: "mar", 3: "mie", 4: "jue", 5: "vie", 6: "sab", 0: "dom" };
export const diasDeHorarios = (w) => ORDEN_SEMANA.filter((d) => w[d] && w[d][0] !== null).map((d) => CLAVES_DIA[d]);
// Si la ficha vieja no tiene weekHours pero sí días, se arma una semana a partir de ellos (9 a 18) para editarla
export function semanaDesdeDias(dias = []) {
  const w = semanaVacia(); const inv = Object.fromEntries(Object.entries(CLAVES_DIA).map(([k, v]) => [v, Number(k)]));
  dias.forEach((d) => { if (inv[d] !== undefined) w[inv[d]] = [9, 18]; }); return w;
}
