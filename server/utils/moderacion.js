// Moderación (Fase 8): reglas puras, sin Express ni MongoDB, así se pueden probar sueltas.
// La web tiene una copia de los motivos en src/denuncias.js: si se agrega uno, se agrega en los dos.
import { normalizarUsuario } from "./credenciales.js";

const DIA = 86400000;

export const MOTIVOS_DENUNCIA = [
  ["spam", "Spam o publicidad engañosa"],
  ["estafa", "Estafa o fraude"],
  ["suplantacion", "Se hace pasar por otra persona"],
  ["acoso", "Acoso o amenazas"],
  ["ofensivo", "Contenido ofensivo o sexual"],
  ["falso", "Información falsa"],
  ["otro", "Otro motivo"],
];
export const MOTIVO_IDS = MOTIVOS_DENUNCIA.map((m) => m[0]);
export const MOTIVO_TEXTO = Object.fromEntries(MOTIVOS_DENUNCIA);

export const OBJETOS = { publicacion: "Publicación de Comunidad", negocio: "Negocio", oficio: "Ficha de oficios", alquiler: "Ficha de alquiler", perfil: "Perfil" };
export const OBJETO_IDS = Object.keys(OBJETOS);

export const DIAS_SUSPENSION = [1, 3, 7, 15, 30, 90];
export const LIM = {
  detalle: 500, detalleOtro: 10, motivoMedida: [10, 600], apelacion: [20, 1000], nota: 500,
  ventanaApelacionDias: 30, repetirDenunciaDias: 30, maxBloqueos: 200,
};

export const limpiarTexto = (v, max) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>]/g, " ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim().slice(0, max);

const ID_FICHA = /^[A-Za-z0-9_-]{3,60}$/;
const ID_PERFIL = /^[a-z0-9._]{3,30}$/;

// Revisa lo que manda la web al denunciar. Devuelve { objetoTipo, objetoId, motivo, detalle } o { error }.
export function sanearDenuncia(b) {
  const x = b && typeof b === "object" ? b : {};
  const objetoTipo = String(x.tipo || "");
  if (!OBJETOS[objetoTipo]) return { error: "No sabemos qué querés denunciar." };
  let objetoId = String(x.id ?? "").trim();
  if (objetoTipo === "perfil") { objetoId = normalizarUsuario(objetoId); if (!ID_PERFIL.test(objetoId)) return { error: "No encontramos ese perfil." }; }
  else if (!ID_FICHA.test(objetoId)) return { error: "No encontramos eso para denunciar." };
  const motivo = String(x.motivo || "");
  if (!MOTIVO_IDS.includes(motivo)) return { error: "Elegí el motivo de la denuncia." };
  const detalle = limpiarTexto(x.detalle, LIM.detalle);
  if (motivo === "otro" && detalle.length < LIM.detalleOtro) return { error: `Contanos brevemente qué pasa (al menos ${LIM.detalleOtro} letras).` };
  return { objetoTipo, objetoId, motivo, detalle };
}

// ¿La suspensión de esta cuenta sigue vigente? (permanente, o temporal que todavía no venció)
export function suspensionVigente(u, ahora = new Date()) {
  const s = u?.suspension;
  if (!s?.activa) return null;
  if (s.permanente) return { permanente: true, hasta: null, desde: s.desde || null, motivo: s.motivo || "", medidaId: s.medidaId || "" };
  if (s.hasta && new Date(s.hasta).getTime() > ahora.getTime()) return { permanente: false, hasta: s.hasta, desde: s.desde || null, motivo: s.motivo || "", medidaId: s.medidaId || "" };
  return null;
}

// Condición de MongoDB para encontrar las cuentas con suspensión vigente
export const filtroSuspendidos = (ahora = new Date()) => ({ "suspension.activa": true, $or: [{ "suspension.permanente": true }, { "suspension.hasta": { $gt: ahora } }] });

// Rutas que una cuenta suspendida SÍ puede usar aunque escriba datos: ver el motivo y apelar, soporte, descargar datos / eliminar la cuenta, cerrar sesión.
// La búsqueda con IA (POST /api/buscar/ia) y «resolver favoritos» (POST /api/favoritos/resolver) son POST pero solo leen: no cambian nada.
const PERMITIDAS_SUSPENDIDO = [/^\/api\/auth(\/|$)/, /^\/api\/privacidad(\/|$)/, /^\/api\/soporte(\/|$)/, /^\/api\/moderacion\/(medidas|estado)(\/|$)/, /^\/api\/push(\/|$)/, /^\/api\/bloqueos(\/|$)/, /^\/api\/buscar\/ia$/, /^\/api\/favoritos\/resolver$/];
export function rutaPermitidaSuspendido(metodo, ruta) {
  if (["GET", "HEAD", "OPTIONS"].includes(String(metodo).toUpperCase())) return true; // mirar se puede; lo que publicó está oculto
  const r = String(ruta || "").split("?")[0];
  return PERMITIDAS_SUSPENDIDO.some((re) => re.test(r));
}

// ¿Se puede apelar esta medida? Una sola vez, dentro de los 30 días, y mientras no esté levantada.
export function puedeApelar(m, ahora = new Date()) {
  if (!m || m.estado === "levantada") return false;
  if (m.apelacion?.estado) return false;
  return ahora.getTime() - new Date(m.desde || m.createdAt).getTime() <= LIM.ventanaApelacionDias * DIA;
}

const TITULO_MEDIDA = { advertencia: "Advertencia del equipo", contenido_oculto: "Ocultamos un contenido tuyo", suspension: "Tu cuenta está suspendida" };

// Lo que ve la persona sobre una medida que se le aplicó
export function medidaPublica(m, ahora = new Date()) {
  return {
    id: String(m._id), tipo: m.tipo, titulo: TITULO_MEDIDA[m.tipo] || "Aviso del equipo", motivo: m.motivo,
    objeto: m.tipo === "contenido_oculto" ? { tipo: m.objeto?.tipo || "", titulo: m.objeto?.titulo || "" } : null,
    desde: m.desde || m.createdAt, hasta: m.hasta || null, permanente: !!m.permanente,
    estado: m.estado, vista: !!m.vistaEn,
    puedeApelar: puedeApelar(m, ahora),
    apelacion: m.apelacion?.estado ? { estado: m.apelacion.estado, texto: m.apelacion.texto, respuesta: m.apelacion.respuesta || "", creadaEn: m.apelacion.creadaEn, resueltaEn: m.apelacion.resueltaEn || null } : null,
  };
}

// "Foto" de lo denunciado para guardar en la denuncia. Recibe el documento ya leído (cualquier tipo).
export function snapshotDe(tipo, d) {
  const corto = (t, n = 300) => limpiarTexto(t, n);
  if (tipo === "publicacion") return { titulo: corto(d.titulo, 120), resumen: corto(d.desc), subtipo: d.tipo || "", zona: corto(d.zona || d.localidad?.localidad || "", 80), fotos: (d.fotos || []).slice(0, 3) };
  if (tipo === "negocio") return { titulo: corto(d.name, 120), resumen: corto(d.desc), subtipo: d.cat || "", zona: corto(d.zone || "", 80), fotos: [d.logo].filter(Boolean).slice(0, 1) };
  if (tipo === "oficio") return { titulo: corto(d.nombre, 120), resumen: corto(d.desc), subtipo: (d.rubros || []).slice(0, 4).join(", "), zona: corto(d.localidad?.localidad || d.zona || "", 80), fotos: [d.logo, ...(d.fotos || [])].filter(Boolean).slice(0, 3) };
  if (tipo === "alquiler") return { titulo: corto(d.nombre, 120), resumen: corto(d.desc), subtipo: d.categoria || "", zona: corto(d.localidad?.localidad || d.zona || "", 80), fotos: [d.logo].filter(Boolean).slice(0, 1) };
  if (tipo === "perfil") return { titulo: corto(d.nombre || d.usuario, 120), resumen: corto(d.descripcion), subtipo: "", zona: corto(d.localidad?.localidad || "", 80), fotos: [d.foto].filter(Boolean).slice(0, 1) };
  return { titulo: "", resumen: "", subtipo: "", zona: "", fotos: [] };
}

// Textos de las notificaciones (push) que se mandan a las personas
export function pushDeMedida(m) {
  if (m.tipo === "suspension") return { titulo: "Tu cuenta fue suspendida", cuerpo: "Abrí Mi Zona para ver el motivo y cómo apelar." };
  if (m.tipo === "contenido_oculto") return { titulo: "Ocultamos un contenido tuyo", cuerpo: "Abrí Mi Zona para ver el motivo y cómo apelar." };
  return { titulo: "Tenés una advertencia del equipo", cuerpo: "Abrí Mi Zona para leerla." };
}

// Texto para mostrar hasta cuándo dura una suspensión (hora de Argentina)
export function textoDuracion(m) {
  if (m.permanente) return "Sin fecha de fin";
  if (!m.hasta) return "";
  return `Hasta el ${new Date(m.hasta).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "numeric", month: "long", year: "numeric" })}`;
}

// Lo que sale al dueño sobre su propio contenido oculto por el equipo (null si no está oculto)
export const ocultaInfo = (d) => (d?.ocultaPorEquipo === true ? { motivo: d.ocultaMotivo || "", desde: d.ocultaDesde || null, medidaId: d.ocultaMedidaId || "" } : null);
