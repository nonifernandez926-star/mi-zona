// Comunidad (Fase 7): fichas breves de los vecinos. Validación y armado de lo que sale al público. No depende de Express ni de MongoDB,
// así se puede probar suelto. Todo lo que manda la web se vuelve a revisar acá: la web solo ayuda a completar el formulario.
import { sanearLocalidad, sanearFoto } from "./perfil.js";
import { sanearWhatsapp } from "./oficios.js";
import { ocultaInfo } from "./moderacion.js";

const HORA = 3600 * 1000, DIA = 24 * HORA;
const limpiar = (s) => String(s ?? "").replace(/[\u0000-\u001F\u007F<>]/g, " ").replace(/\s+/g, " ").trim();
const largo = (t, [min, max]) => t.length >= min && t.length <= max;
const entre = (v, lista) => (lista.includes(v) ? v : null);
const ids = (pares) => pares.map((p) => p[0]);

// ---- Tipos y sus opciones (la web tiene una copia en src/comunidad.js: si se agrega algo, se agrega en los dos) ----
export const TIPOS = {
  aviso:     { label: "Aviso de la zona",      fotos: 0, contacto: false },
  seguridad: { label: "Seguridad",             fotos: 0, contacto: false }, // nunca fotos, y sin contacto directo (no se arman acusaciones)
  perdido:   { label: "Perdido o encontrado",  fotos: 3, contacto: true },
  ayuda:     { label: "Ayuda vecinal",         fotos: 0, contacto: true },
  regalo:    { label: "Regalo",                fotos: 3, contacto: true },
  deporte:   { label: "Deporte o actividad",   fotos: 1, contacto: true },
  evento:    { label: "Evento o feria",        fotos: 1, contacto: true },
};
export const TIPO_IDS = Object.keys(TIPOS);

// Nombres neutros: nada de "operativo de la policía en tal esquina"
export const AVISO_SUBTIPOS = [["transito", "Operativo de tránsito o control en la zona"], ["corte_calle", "Corte de calle"], ["corte_luz", "Corte de luz"], ["corte_agua", "Corte de agua"], ["horario", "Cambio de horario de una institución"], ["tramite", "Trámite o servicio local"], ["comunicado", "Comunicado a los vecinos"], ["otro", "Otro aviso"]];
export const GRAVEDADES = ["informativo", "importante", "urgente"];
export const AVISO_HORAS = [2, 6, 12, 24, 48]; // vencimiento corto, de horas
export const SEGURIDAD_SUBTIPOS = [["robo", "Robo o intento de robo"], ["sospechosa", "Actividad sospechosa"], ["otro", "Otra situación de seguridad"]];
export const SEGURIDAD_DIAS = [1, 3, 7];
export const PERDIDO_MODOS = ["perdido", "encontrado"];
export const PERDIDO_OBJETOS = [["mascota", "Mascota"], ["objeto", "Objeto"], ["documento", "Documento"], ["otro", "Otra cosa"]];
export const ESPECIES = [["perro", "Perro"], ["gato", "Gato"], ["otro", "Otro animal"]];
export const TAMANOS = [["chico", "Chico"], ["mediano", "Mediano"], ["grande", "Grande"]];
export const PERDIDO_DIAS = [7, 15, 30];
export const AYUDA_MODOS = ["necesito", "ofrezco"];
export const AYUDA_CATEGORIAS = [["compras", "Compras o mandados"], ["traslado", "Traslado"], ["cuidado", "Cuidado de personas o mascotas"], ["hogar", "Arreglos del hogar"], ["estudio", "Estudio o apoyo escolar"], ["otro", "Otra ayuda"]];
export const AYUDA_DIAS = [3, 7, 15, 30];
export const REGALO_CATEGORIAS = [["ropa", "Ropa"], ["muebles", "Muebles"], ["utiles", "Útiles escolares"], ["libros", "Libros"], ["uniformes", "Uniformes"], ["juguetes", "Juguetes"], ["otros", "Otros objetos"]];
export const REGALO_DIAS = [7, 15, 30];
export const DEPORTE_ACTIVIDADES = [["futbol", "Fútbol"], ["basquet", "Básquet"], ["voley", "Vóley"], ["caminata", "Caminata"], ["ciclismo", "Ciclismo"], ["taller", "Taller"], ["solidaria", "Actividad solidaria"], ["otra", "Otra actividad"]];
export const EVENTO_CATEGORIAS = [["feria", "Feria"], ["musical", "Música"], ["cultural", "Cultural"], ["deportivo", "Deportivo"], ["infantil", "Infantil"], ["solidario", "Solidario"], ["gastronomico", "Gastronómico"], ["religioso", "Religioso"], ["otro", "Otro"]];
export const ESTADOS_EVENTO = ["normal", "cancelado", "reprogramado"];

export const LIMITES = { titulo: [4, 80], desc: [10, 500], zona: 80, lugar: 80, organizador: 60, precio: 40, color: 40, senas: 120, enlace: 300, porDia: 5, esperaSeg: 60, activas: 15, diasAdelante: 120, duracionEventoMax: 14 * DIA };

// "2026-10-20T18:00" (hora de Argentina, UTC-3 todo el año) o un ISO con zona → Date, o null
export function fechaAR(v) {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(t)) return null;
  const conZona = /(Z|[+-]\d{2}:\d{2})$/.test(t) ? t : `${t.length === 16 ? `${t}:00` : t}-03:00`;
  const d = new Date(conZona);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Ni teléfonos ni documentos dentro del texto de avisos y de seguridad (no se arman denuncias ni se señala a nadie)
const TIENE_NUMERO_LARGO = (t) => /\d[\d\s.-]{6,}\d/.test(t);

const urlHttps = (v) => { const t = limpiar(v); if (!t) return ""; return /^https:\/\/[^\s<>"']{4,300}$/i.test(t) ? t : null; };

// Revisa el formulario completo. Devuelve { datos, extra, vence, inicio } o { error }.
//  datos = campos comunes · extra = campos propios del tipo · vence = fecha de vencimiento · inicio = para ordenar y filtrar por fecha
export function sanearPublicacion(b, tipo, ahora = new Date()) {
  const x = b && typeof b === "object" ? b : {};
  if (!TIPOS[tipo]) return { error: "Ese tipo de publicación no existe." };
  const cfg = TIPOS[tipo];

  const titulo = limpiar(x.titulo);
  if (!largo(titulo, LIMITES.titulo)) return { error: `El título tiene que tener entre ${LIMITES.titulo[0]} y ${LIMITES.titulo[1]} letras.` };
  const desc = limpiar(x.desc);
  if (!largo(desc, LIMITES.desc)) return { error: `Contá los detalles en ${LIMITES.desc[0]} a ${LIMITES.desc[1]} letras.` };
  if ((tipo === "seguridad" || tipo === "aviso") && (TIENE_NUMERO_LARGO(titulo) || TIENE_NUMERO_LARGO(desc))) return { error: "No escribas teléfonos ni números de documento en este tipo de aviso." };

  const localidad = sanearLocalidad(x.localidad);
  if (!localidad) return { error: "Elegí la localidad de la lista." };
  const zona = limpiar(x.zona);
  if (zona.length > LIMITES.zona) return { error: `El lugar puede tener hasta ${LIMITES.zona} letras.` };

  // Fotos: opcionales y solo donde corresponde (nunca en avisos ni seguridad)
  const enviadas = Array.isArray(x.fotos) ? x.fotos : [];
  if (enviadas.length > cfg.fotos) return { error: cfg.fotos === 0 ? "Este tipo de publicación no lleva fotos." : `Podés subir hasta ${cfg.fotos} ${cfg.fotos === 1 ? "foto" : "fotos"}.` };
  const fotos = enviadas.map(sanearFoto);
  if (fotos.some((f) => !f)) return { error: "Una de las fotos no es válida. Probá subirla de nuevo." };

  // Contacto por WhatsApp (opcional): el número no sale en los listados, se entrega al tocar el botón
  let whatsapp = "", mostrarWhatsapp = false;
  if (cfg.contacto) {
    whatsapp = sanearWhatsapp(x.whatsapp);
    if (whatsapp === null) return { error: "El WhatsApp no parece válido. Escribilo con código de país y de área, por ejemplo 5493815551234." };
    mostrarWhatsapp = x.mostrarWhatsapp === true;
    if (mostrarWhatsapp && !whatsapp) return { error: "Para mostrar el botón de WhatsApp tenés que escribir tu número." };
  }

  const desde = (horas) => new Date(ahora.getTime() + horas * HORA);
  const dur = (valor, lista, porDefecto) => { const n = Number(valor ?? porDefecto); return lista.includes(n) ? n : null; };
  let extra = {}, vence = null, inicio = null;

  if (tipo === "aviso") {
    const subtipo = entre(x.subtipo, ids(AVISO_SUBTIPOS)); if (!subtipo) return { error: "Elegí qué tipo de aviso es." };
    const gravedad = entre(x.gravedad ?? "informativo", GRAVEDADES); if (!gravedad) return { error: "Elegí si es informativo, importante o urgente." };
    const horas = dur(x.horas, AVISO_HORAS, 6); if (!horas) return { error: "Elegí cuánto dura el aviso (hasta 48 horas)." };
    extra = { subtipo, gravedad }; vence = desde(horas);
  } else if (tipo === "seguridad") {
    const subtipo = entre(x.subtipo, ids(SEGURIDAD_SUBTIPOS)); if (!subtipo) return { error: "Elegí qué pasó." };
    const dias = dur(x.dias, SEGURIDAD_DIAS, 1); if (!dias) return { error: "Elegí cuánto dura el aviso (hasta 7 días)." };
    extra = { subtipo }; vence = desde(dias * 24);
  } else if (tipo === "perdido") {
    const modo = entre(x.modo, PERDIDO_MODOS); if (!modo) return { error: "Elegí si lo perdiste o lo encontraste." };
    const objeto = entre(x.objeto, ids(PERDIDO_OBJETOS)); if (!objeto) return { error: "Elegí qué es." };
    const dias = dur(x.dias, PERDIDO_DIAS, 15); if (!dias) return { error: "Elegí cuánto dura la publicación." };
    extra = { modo, objeto };
    if (objeto === "mascota") {
      const especie = entre(x.especie, ids(ESPECIES)); if (!especie) return { error: "Elegí qué animal es." };
      const tamano = entre(x.tamano, ids(TAMANOS)); if (!tamano) return { error: "Elegí el tamaño." };
      const color = limpiar(x.color), senas = limpiar(x.senas);
      if (color.length > LIMITES.color || senas.length > LIMITES.senas) return { error: "El color o las señas particulares son demasiado largos." };
      Object.assign(extra, { especie, tamano, color, senas });
    }
    vence = desde(dias * 24);
  } else if (tipo === "ayuda") {
    const modo = entre(x.modo, AYUDA_MODOS); if (!modo) return { error: "Elegí si necesitás u ofrecés ayuda." };
    const categoria = entre(x.categoria, ids(AYUDA_CATEGORIAS)); if (!categoria) return { error: "Elegí el tipo de ayuda." };
    const dias = dur(x.dias, AYUDA_DIAS, 7); if (!dias) return { error: "Elegí cuánto dura la publicación." };
    extra = { modo, categoria }; vence = desde(dias * 24);
  } else if (tipo === "regalo") {
    const categoria = entre(x.categoria, ids(REGALO_CATEGORIAS)); if (!categoria) return { error: "Elegí qué regalás." };
    const dias = dur(x.dias, REGALO_DIAS, 15); if (!dias) return { error: "Elegí cuánto dura la publicación." };
    extra = { categoria }; vence = desde(dias * 24);
  } else if (tipo === "deporte") {
    const actividad = entre(x.actividad, ids(DEPORTE_ACTIVIDADES)); if (!actividad) return { error: "Elegí la actividad." };
    const ini = fechaAR(x.inicio); if (!ini) return { error: "Elegí el día y la hora." };
    if (ini.getTime() < ahora.getTime() - HORA) return { error: "El día y la hora ya pasaron." };
    if (ini.getTime() > ahora.getTime() + LIMITES.diasAdelante * DIA) return { error: `Solo se puede publicar hasta ${LIMITES.diasAdelante} días antes.` };
    const lugar = limpiar(x.lugar);
    if (lugar.length < 2 || lugar.length > LIMITES.lugar) return { error: "Escribí el lugar general (por ejemplo, «Plaza principal»)." };
    extra = { actividad, lugar }; inicio = ini; vence = new Date(ini.getTime() + 3 * HORA);
  } else if (tipo === "evento") {
    const categoria = entre(x.categoria, ids(EVENTO_CATEGORIAS)); if (!categoria) return { error: "Elegí la categoría del evento." };
    const ini = fechaAR(x.inicio), fin = fechaAR(x.fin);
    if (!ini || !fin) return { error: "Elegí cuándo empieza y cuándo termina." };
    if (fin < ini) return { error: "El evento no puede terminar antes de empezar." };
    if (fin.getTime() - ini.getTime() > LIMITES.duracionEventoMax) return { error: "El evento puede durar hasta 14 días." };
    if (fin.getTime() < ahora.getTime()) return { error: "El evento ya terminó." };
    if (ini.getTime() > ahora.getTime() + 365 * DIA) return { error: "Solo se puede publicar hasta un año antes." };
    const lugar = limpiar(x.lugar);
    if (lugar.length < 2 || lugar.length > LIMITES.lugar) return { error: "Escribí el lugar general (por ejemplo, «Club Atlético»). No hace falta la dirección exacta." };
    const organizador = limpiar(x.organizador);
    if (organizador.length > LIMITES.organizador) return { error: "El organizador puede tener hasta 60 letras." };
    const gratis = x.gratis !== false;
    const precio = gratis ? "" : limpiar(x.precio);
    if (!gratis && (!precio || precio.length > LIMITES.precio)) return { error: "Escribí el precio (por ejemplo, «$3000»)." };
    const enlace = urlHttps(x.enlace);
    if (enlace === null) return { error: "El enlace tiene que empezar con https://" };
    extra = { categoria, lugar, organizador, gratis, precio, enlace }; inicio = ini; vence = fin;
  }

  return { datos: { titulo, desc, localidad, zona, fotos: [...new Set(fotos)], whatsapp, mostrarWhatsapp }, extra, vence, inicio };
}

export const prioridadAviso = (extra) => (extra?.gravedad === "urgente" ? 2 : extra?.gravedad === "importante" ? 1 : 0);

// Texto para buscar (sin tildes ni mayúsculas)
export const normalizar = (t) => String(t || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
export const textoBusqueda = (d, extra) => normalizar([d.titulo, d.desc, d.zona, d.localidad?.localidad, extra?.lugar, extra?.especie, extra?.color].join(" "));

// Estado: activa, resuelta o vencida
export function estadoPublicacion(p, ahora = new Date()) {
  if (p.resuelta) return "resuelta";
  if (p.expiresAt && new Date(p.expiresAt).getTime() <= ahora.getTime()) return "vencida";
  return "activa";
}

// Lo que ve cualquier vecino del departamento. Nunca sale: autor, número de WhatsApp (solo si hay botón), correo.
export function publicacionPublica(p, ahora = new Date()) {
  return {
    id: p.id, tipo: p.tipo, titulo: p.titulo, desc: p.desc,
    localidad: p.localidad?.localidadId ? { localidad: p.localidad.localidad, departamento: p.localidad.departamento, provincia: p.localidad.provincia } : null,
    zona: p.zona || "", fotos: p.fotos || [], datos: p.datos || {},
    estado: estadoPublicacion(p, ahora), estadoEvento: p.tipo === "evento" ? p.estadoEvento || "normal" : undefined,
    inicio: p.inicioAt || null, vence: p.expiresAt || null, creadaEn: p.createdAt || null, actualizadaEn: p.updatedAt || null,
    conContacto: TIPOS[p.tipo]?.contacto === true && !!p.whatsapp && p.mostrarWhatsapp === true,
    noVerificado: p.tipo === "seguridad",
  };
}

// Lo que ve su autor: todo lo anterior más lo suyo
export function publicacionDelAutor(p, ahora = new Date()) {
  return {
    ...publicacionPublica(p, ahora),
    whatsapp: p.whatsapp || "", mostrarWhatsapp: p.mostrarWhatsapp === true, ocultaPorEquipo: ocultaInfo(p),
    localidadCompleta: p.localidad?.localidadId ? { provinciaId: p.localidad.provinciaId, provincia: p.localidad.provincia, departamentoId: p.localidad.departamentoId, departamento: p.localidad.departamento, localidadId: p.localidad.localidadId, localidad: p.localidad.localidad } : null,
  };
}

// Rangos de "hoy", "esta semana" y "fin de semana" en hora de Argentina (UTC-3)
export function rangosAR(ahora = new Date()) {
  const ar = new Date(ahora.getTime() - 3 * HORA); // reloj de Argentina leído como UTC
  const inicioHoyAr = Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth(), ar.getUTCDate());
  const aUtc = (msAr) => new Date(msAr + 3 * HORA);
  const dow = ar.getUTCDay(); // 0 domingo … 6 sábado
  const aSabado = dow === 0 ? -1 : 6 - dow; // si hoy es domingo, el fin de semana empezó ayer
  const sabado = inicioHoyAr + aSabado * DIA;
  return {
    hoy: { desde: aUtc(inicioHoyAr), hasta: aUtc(inicioHoyAr + DIA) },
    semana: { desde: aUtc(inicioHoyAr), hasta: aUtc(inicioHoyAr + 7 * DIA) },
    finde: { desde: aUtc(sabado), hasta: aUtc(sabado + 2 * DIA) },
  };
}
