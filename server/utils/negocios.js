import crypto from "crypto";

// Validación de lo que manda la web sobre un negocio. Es una LISTA BLANCA: solo se aceptan estos campos, con su tipo y
// su largo máximo. Cualquier otro campo (o claves con "." o "$", que en MongoDB sirven para meterse en campos internos
// como "suscripcion.plan") se descarta. Así el dueño nunca puede tocar pagos, vencimiento, estado ni otros dueños.

const txt = (max) => (v) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) : undefined);
const bool = (v) => (typeof v === "boolean" ? v : undefined);
const num = (min, max) => (v) => (v === null ? null : typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined);
const lista = (max, item) => (v) => (Array.isArray(v) ? v.slice(0, max).map(item).filter((x) => x !== undefined && x !== "") : undefined);

// Solo enlaces http(s) (nunca "javascript:" ni "data:")
export const urlSegura = (v) => {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (t === "") return "";
  return /^https:\/\/[^\s<>"']{3,1500}$/i.test(t) || /^http:\/\/[^\s<>"']{3,1500}$/i.test(t) ? t : undefined;
};


function horarios(v) {
  if (!Array.isArray(v) || v.length > 7) return undefined;
  return v.map((d) => (Array.isArray(d) ? d.slice(0, 2).map((h) => (typeof h === "number" && h >= 0 && h <= 48 ? h : 0)) : null));
}

function descuentos(v) {
  if (!Array.isArray(v)) return undefined;
  return v.slice(0, 50).map((d) => {
    if (!d || typeof d !== "object") return null;
    const out = {};
    for (const k of Object.keys(d)) {
      if (["id", "title", "item", "desc", "percent", "startDate", "endDate", "code", "conditions", "name", "tipo", "valor"].includes(k)) {
        const x = d[k];
        out[k] = typeof x === "string" ? x.slice(0, 300) : typeof x === "number" && Number.isFinite(x) ? x : undefined;
      } else if (k === "active") out.active = d.active === true;
    }
    return out;
  }).filter(Boolean);
}

function historias(v) {
  if (!Array.isArray(v)) return undefined;
  return v.slice(0, 30).map((h) => {
    const url = urlSegura(h?.url);
    if (!url) return null;
    return { id: txt(60)(h.id) || crypto.randomBytes(6).toString("hex"), url, subidaEn: txt(40)(h.subidaEn) || new Date().toISOString() };
  }).filter(Boolean);
}

function busquedaEmpleo(v) {
  if (v === null) return null;
  if (!v || typeof v !== "object") return undefined;
  const tipo = v.contactoTipo === "red_social" ? "red_social" : "whatsapp";
  let valor = txt(300)(v.contactoValor) || "";
  if (tipo === "whatsapp") valor = valor.replace(/\D/g, "").slice(0, 20);
  else if (valor && !/^https?:\/\//i.test(valor)) valor = ""; // el enlace de contacto tiene que ser http(s)
  return {
    puesto: txt(80)(v.puesto) || "", descripcion: txt(600)(v.descripcion) || "",
    contactoTipo: tipo, contactoValor: valor,
    fechaInicio: txt(10)(v.fechaInicio) || "", fechaFin: txt(10)(v.fechaFin) || "",
  };
}

const extra = (v) => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const out = {};
  for (const k of Object.keys(v).slice(0, 30)) {
    if (/^[\w-]{1,40}$/.test(k) && typeof v[k] === "string") out[k] = v[k].slice(0, 300);
  }
  return out;
};

const CAMPOS = {
  name: txt(80), desc: txt(1200),
  cat: (v) => (typeof v === "string" && /^[a-z_]{2,30}$/.test(v) ? v : undefined),
  zone: txt(80),
  services: lista(60, txt(80)), specialties: lista(60, txt(80)), paymentMethods: lista(30, txt(60)),
  delivery: bool, acceptsWhatsapp: bool,
  phone: txt(30), ig: txt(120), tiktok: txt(120), facebook: txt(300),
  logo: urlSegura, portada: urlSegura, photos: lista(40, urlSegura),
  loc: txt(200), lat: num(-90, 90), lng: num(-180, 180),
  weekHours: horarios, discounts: descuentos, historias, busquedaEmpleo, extra,
};

export const CAMPOS_EDITABLES = Object.keys(CAMPOS);

// Devuelve solo los campos permitidos y ya limpios. Lo inválido se omite (no rompe el resto).
export function sanearNegocio(body) {
  const out = {};
  if (!body || typeof body !== "object") return out;
  for (const k of CAMPOS_EDITABLES) {
    if (!Object.prototype.hasOwnProperty.call(body, k)) continue;
    const v = CAMPOS[k](body[k]);
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/* ---------- reseñas ---------- */

// Huella no reversible de la cuenta que escribió una reseña. Sirve para que cada persona pueda borrar SUS reseñas
// (Privacidad), sin mostrar nunca quién es: este campo no sale en las respuestas públicas.
export function huellaAutor(usuarioId) {
  return crypto.createHmac("sha256", process.env.JWT_SECRET || "sin-secreto").update(`resena:${usuarioId}`).digest("hex").slice(0, 24);
}

// La web manda la lista completa de reseñas. Acá se arma la lista final a partir de lo que YA hay guardado:
//  · las reseñas existentes no se pueden borrar ni modificar (solo el dueño puede agregar/cambiar la respuesta)
//  · cualquiera con cuenta puede sumar UNA reseña nueva, que el servidor limpia y firma con la huella de su cuenta
// Devuelve la lista nueva, o null si el pedido no es válido.
export function combinarResenas(actuales = [], enviadas, { esDueno, usuarioId, hoy }) {
  if (!Array.isArray(enviadas)) return null;
  const porId = new Map(enviadas.filter((x) => x && typeof x.id === "string").map((x) => [x.id, x]));
  if (enviadas.length > actuales.length + 1 || enviadas.length < actuales.length) return null;
  if (actuales.some((a) => !porId.has(a.id))) return null; // faltan reseñas: se intentó borrar

  const resultado = actuales.map((a) => {
    const n = porId.get(a.id);
    if (!esDueno || !n.respuesta || typeof n.respuesta !== "object") return a;
    const texto = txt(1000)(n.respuesta.texto);
    if (!texto) return a;
    const igual = a.respuesta && a.respuesta.texto === texto;
    return { ...a, respuesta: igual ? a.respuesta : { texto, esDueño: true, fecha: hoy } };
  });

  const ids = new Set(actuales.map((a) => a.id));
  const nuevas = enviadas.filter((x) => x && !ids.has(x.id));
  if (nuevas.length > 1) return null;
  if (nuevas.length === 1) {
    const n = nuevas[0];
    const texto = txt(1000)(n.text);
    const rating = Number(n.rating);
    const id = txt(60)(n.id);
    if (!texto || !id || !Number.isInteger(rating) || rating < 1 || rating > 5) return null;
    resultado.push({
      id, rating, text: texto, name: txt(60)(n.name) || "Anónimo", date: hoy,
      autorId: txt(80)(n.autorId) || "", autorUid: huellaAutor(usuarioId),
    });
  }
  return resultado;
}
