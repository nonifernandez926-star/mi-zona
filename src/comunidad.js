// Comunidad (Fase 7): tipos y opciones. Copia de server/utils/comunidad.js (el servidor es quien manda: si se agrega algo, se agrega en los dos).
export const TIPOS = [
  { id: "aviso", label: "Avisos de la zona", singular: "Aviso de la zona", ayuda: "Cortes, controles, cambios de horario. Duran pocas horas.", fotos: 0, contacto: false },
  { id: "seguridad", label: "Seguridad", singular: "Seguridad", ayuda: "Robos o actividad sospechosa. Sin fotos ni nombres.", fotos: 0, contacto: false },
  { id: "perdido", label: "Perdidos y encontrados", singular: "Perdido o encontrado", ayuda: "Mascotas y objetos.", fotos: 3, contacto: true },
  { id: "ayuda", label: "Ayuda vecinal", singular: "Ayuda vecinal", ayuda: "Necesito u ofrezco ayuda.", fotos: 0, contacto: true },
  { id: "regalo", label: "Regalos", singular: "Regalo", ayuda: "Cosas que ya no usás.", fotos: 3, contacto: true },
  { id: "deporte", label: "Deporte y actividades", singular: "Deporte o actividad", ayuda: "Fútbol, caminatas, talleres...", fotos: 1, contacto: true },
  { id: "evento", label: "Eventos y ferias", singular: "Evento o feria", ayuda: "Fecha, lugar y afiche.", fotos: 1, contacto: true },
  { id: "sorteo", label: "Sorteos y rifas", singular: "Sorteo o rifa", ayuda: "Anunciá tu rifa: premios, fecha y WhatsApp. No se cobra en la app.", fotos: 1, contacto: true },
];
export const TIPO = Object.fromEntries(TIPOS.map((t) => [t.id, t]));

export const AVISO_SUBTIPOS = [["transito", "Operativo de tránsito o control en la zona"], ["corte_calle", "Corte de calle"], ["corte_luz", "Corte de luz"], ["corte_agua", "Corte de agua"], ["horario", "Cambio de horario de una institución"], ["tramite", "Trámite o servicio local"], ["comunicado", "Comunicado a los vecinos"], ["otro", "Otro aviso"]];
export const GRAVEDADES = [["informativo", "Informativo"], ["importante", "Importante"], ["urgente", "Urgente"]];
export const AVISO_HORAS = [[2, "2 horas"], [6, "6 horas"], [12, "12 horas"], [24, "1 día"], [48, "2 días"]];
export const SEGURIDAD_SUBTIPOS = [["robo", "Robo o intento de robo"], ["sospechosa", "Actividad sospechosa"], ["otro", "Otra situación de seguridad"]];
export const SEGURIDAD_DIAS = [[1, "1 día"], [3, "3 días"], [7, "7 días"]];
export const PERDIDO_MODOS = [["perdido", "Lo perdí"], ["encontrado", "Lo encontré"]];
export const PERDIDO_OBJETOS = [["mascota", "Mascota"], ["objeto", "Objeto"], ["documento", "Documento"], ["otro", "Otra cosa"]];
export const ESPECIES = [["perro", "Perro"], ["gato", "Gato"], ["otro", "Otro animal"]];
export const TAMANOS = [["chico", "Chico"], ["mediano", "Mediano"], ["grande", "Grande"]];
export const DIAS_15 = [[7, "7 días"], [15, "15 días"], [30, "30 días"]];
export const AYUDA_MODOS = [["necesito", "Necesito ayuda"], ["ofrezco", "Ofrezco ayuda"]];
export const AYUDA_CATEGORIAS = [["compras", "Compras o mandados"], ["traslado", "Traslado"], ["cuidado", "Cuidado de personas o mascotas"], ["hogar", "Arreglos del hogar"], ["estudio", "Estudio o apoyo escolar"], ["otro", "Otra ayuda"]];
export const AYUDA_DIAS = [[3, "3 días"], [7, "7 días"], [15, "15 días"], [30, "30 días"]];
export const REGALO_CATEGORIAS = [["ropa", "Ropa"], ["muebles", "Muebles"], ["utiles", "Útiles escolares"], ["libros", "Libros"], ["uniformes", "Uniformes"], ["juguetes", "Juguetes"], ["otros", "Otros objetos"]];
export const DEPORTE_ACTIVIDADES = [["futbol", "Fútbol"], ["basquet", "Básquet"], ["voley", "Vóley"], ["caminata", "Caminata"], ["ciclismo", "Ciclismo"], ["taller", "Taller"], ["solidaria", "Actividad solidaria"], ["otra", "Otra actividad"]];
export const EVENTO_CATEGORIAS = [["feria", "Feria"], ["musical", "Música"], ["cultural", "Cultural"], ["deportivo", "Deportivo"], ["infantil", "Infantil"], ["solidario", "Solidario"], ["gastronomico", "Gastronómico"], ["religioso", "Religioso"], ["otro", "Otro"]];
export const SORTEO_MOTIVOS = [["beneficio", "A beneficio"], ["otro", "Otro motivo"]];
export const SORTEO_DEFINICIONES = [["quiniela", "Con la Quiniela"], ["loteria", "Con la Lotería"], ["vivo", "Sorteo en vivo"], ["redes", "Por redes sociales"], ["otra", "De otra forma"]];
export const MAX_PREMIOS = 6;
// Aviso que acompaña a todo sorteo (listado, ficha y formulario). Mi Zona solo muestra lo que publica cada persona.
export const AVISO_SORTEO = "Mi Zona no organiza ni cobra sorteos: solo muestra lo que publica cada persona. Pagá únicamente a quien conocés y no pagues por adelantado si algo no te cierra.";
export const VISTAS = [["", "Todo"], ["hoy", "Hoy"], ["semana", "Esta semana"], ["finde", "Fin de semana"]];

const mapa = (pares) => Object.fromEntries(pares);
const ETIQUETAS = { ...mapa(AVISO_SUBTIPOS), ...mapa(SEGURIDAD_SUBTIPOS), ...mapa(PERDIDO_OBJETOS), ...mapa(AYUDA_CATEGORIAS), ...mapa(REGALO_CATEGORIAS), ...mapa(DEPORTE_ACTIVIDADES), ...mapa(EVENTO_CATEGORIAS), ...mapa(ESPECIES), ...mapa(TAMANOS), ...mapa(SORTEO_MOTIVOS), ...mapa(SORTEO_DEFINICIONES) };
export const etiqueta = (id) => ETIQUETAS[id] || id || "";

// "hace 5 minutos", "hace 3 horas", "hace 2 días"
export function hace(iso) {
  if (!iso) return "";
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} ${min === 1 ? "minuto" : "minutos"}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.floor(h / 24);
  return `hace ${d} ${d === 1 ? "día" : "días"}`;
}
// "vence en 3 horas", "vence mañana"…
export function venceEn(iso) {
  if (!iso) return "";
  const min = Math.floor((new Date(iso).getTime() - Date.now()) / 60000);
  if (min <= 0) return "Venció";
  if (min < 60) return `Vence en ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Vence en ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.floor(h / 24);
  return `Vence en ${d} ${d === 1 ? "día" : "días"}`;
}
const FMT = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Argentina/Buenos_Aires" });
export const fechaLinda = (iso) => (iso ? FMT.format(new Date(iso)).replace(",", "") : "");
// Solo el día (sorteos sin hora): "dom 8 nov"
const FMT_DIA = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Argentina/Buenos_Aires" });
export const fechaSolo = (iso) => (iso ? FMT_DIA.format(new Date(iso)).replace(",", "").replace(/\./g, "") : "");
// Día de hoy en Argentina, "2026-10-25" (para el mínimo del calendario y para saber si ya llegó la fecha de un sorteo)
export const hoyAR = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
export const diaAR = (iso) => (iso ? new Date(new Date(iso).getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10) : "");
// valor para <input type="datetime-local"> (hora de Argentina) a partir de una fecha ISO
export function paraInputFecha(iso) {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() - 3 * 3600 * 1000).toISOString().slice(0, 16);
}
