// Perfil público y declaración de registro. Todo se valida acá, en el servidor (la web solo ayuda a completarlo).
// Nunca se pide ni se guarda edad ni fecha de nacimiento: solo la declaración de ser mayor de 18 y cuándo se aceptaron los términos.
export const VERSION_TERMINOS = "2026-10";
const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || "hiyaxxdk";

const limpiar = (s) => String(s ?? "").replace(/[\u0000-\u001F\u007F<>]/g, " ").replace(/\s+/g, " ").trim();
const nombreTerritorio = (s) => { const t = limpiar(s); return t.length >= 2 && t.length <= 80 ? t : ""; };

// Localidad elegida del catálogo oficial (Georef). La persona elige solo provincia y localidad: el departamento NO se le pregunta,
// la web lo toma de lo que devuelve Georef para esa localidad y lo manda junto. Acá se guarda (sirve para filtrar por departamento).
// Una localidad que Georef no lista llega con el departamento como localidad (localidadId = departamentoId).
// Devuelve null si algo no cuadra (códigos mal formados, o un departamento que no es de esa provincia).
export function sanearLocalidad(v) {
  if (!v || typeof v !== "object") return null;
  const provinciaId = String(v.provinciaId ?? "");
  const departamentoId = String(v.departamentoId ?? "");
  const localidadId = String(v.localidadId ?? "");
  if (!/^\d{2}$/.test(provinciaId) || !/^\d{5}$/.test(departamentoId) || !/^\d{5,12}$/.test(localidadId)) return null;
  if (!departamentoId.startsWith(provinciaId) || !localidadId.startsWith(provinciaId)) return null;
  const provincia = nombreTerritorio(v.provincia);
  const departamento = nombreTerritorio(v.departamento);
  const localidad = nombreTerritorio(v.localidad);
  if (!provincia || !departamento || !localidad) return null;
  return { provinciaId, provincia, departamentoId, departamento, localidadId, localidad };
}

export const localidadDe = (u) => (u?.localidad?.localidadId
  ? { provinciaId: u.localidad.provinciaId, provincia: u.localidad.provincia, departamentoId: u.localidad.departamentoId, departamento: u.localidad.departamento, localidadId: u.localidad.localidadId, localidad: u.localidad.localidad }
  : null);

export const DESCRIPCION_MAX = 200;
export const sanearDescripcion = (v) => limpiar(v);

// Solo se acepta una foto subida a nuestro Cloudinary (o "" para quitarla). Devuelve undefined si no es válida.
export function sanearFoto(v) {
  if (v === "" || v === null) return "";
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  const re = new RegExp(`^https://res\\.cloudinary\\.com/${CLOUD.replace(/[^a-zA-Z0-9_-]/g, "")}/image/upload/[A-Za-z0-9_\\-./,:%]{3,300}$`);
  return re.test(t) ? t : undefined;
}

// La cuenta todavía no confirmó que es mayor de 18 ni aceptó los términos (todas las cuentas nuevas, y las viejas hasta que lo hagan)
export const declaracionPendiente = (u) => !(u?.mayor18 && u?.terminosAceptadosEn);

// Revisa lo que manda la web para declarar: { declaracion: { mayor18, terminos }, localidad }. Devuelve null si está bien.
export function errorDeclaracion(body) {
  const d = body?.declaracion || {};
  if (d.mayor18 !== true) return { error: "Tenés que confirmar que tenés 18 años o más para usar Mi Zona.", codigo: "mayor18_requerido" };
  if (d.terminos !== true) return { error: "Tenés que aceptar los Términos y la Política de privacidad para continuar.", codigo: "terminos_requeridos" };
  if (!sanearLocalidad(body?.localidad)) return { error: "Elegí tu provincia y tu localidad de la lista.", codigo: "localidad_invalida" };
  return null;
}

export function aplicarDeclaracion(u, body) {
  const ahora = new Date();
  u.mayor18 = true;
  u.mayor18Fecha = ahora;
  u.terminosAceptadosEn = ahora;
  u.terminosVersion = VERSION_TERMINOS;
  u.localidad = sanearLocalidad(body.localidad);
}
