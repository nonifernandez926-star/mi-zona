// Fichas de oficios y servicios: validación y armado de lo que sale al público. No depende de Express ni de MongoDB,
// así se puede probar suelto. Todo lo que manda la web se vuelve a revisar acá: la web solo ayuda a completar el formulario.
import { RUBRO_IDS, ETIQUETA_RUBRO } from "./rubros.js";
import { sanearLocalidad, sanearFoto } from "./perfil.js";

export const LIMITES = { nombre: [2, 60], desc: [10, 300], rubros: 6, otros: 3, otro: [2, 40], zona: 80, direccion: 120, horario: 60, precio: 80, fotos: 8 };
export const DIAS = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];
export const ETIQUETAS = ["urgencias", "finesDeSemana", "presupuestoSinCargo", "aDomicilio"];
// Todo lo que el dueño puede escribir en el formulario (el resto —dueño, estado, vencimiento— lo pone el servidor)
export const CAMPOS_FORMULARIO = ["nombre", "rubros", "otros", "desc", "localidad", "zona", "direccion", "whatsapp", "mostrarWhatsapp", "ig", "facebook", "tiktok", "logo", "fotos", "dias", "horario", "precio", "etiquetas"];

const limpiar = (s) => String(s ?? "").replace(/[\u0000-\u001F\u007F<>]/g, " ").replace(/\s+/g, " ").trim();
export const normalizar = (t) => String(t || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
const largo = (t, [min, max]) => t.length >= min && t.length <= max;

// Número de WhatsApp: solo dígitos, con código de país (ej. 5493815551234). Devuelve "" si no hay y null si no es válido.
export function sanearWhatsapp(v) {
  let d = String(v ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  // formato argentino: 549 + código de área + número (sin 0 ni 15). Si escribió 54 sin el 9, o solo el número local, se completa.
  if (d.startsWith("54") && !d.startsWith("549") && d.length === 12) d = `549${d.slice(2)}`;
  else if (d.startsWith("0") && d.length === 11) d = `549${d.slice(1)}`;
  else if (d.length === 10 && !d.startsWith("54")) d = `549${d}`;
  return /^\d{10,15}$/.test(d) ? d : null;
}

// Redes: un usuario (con o sin @) o un enlace https. Nunca "javascript:" ni otros esquemas.
export function sanearRed(v, max = 100) {
  const t = String(v ?? "").trim();
  if (!t) return "";
  if (/^https:\/\/[^\s<>"']{3,300}$/i.test(t)) return t;
  return /^@?[A-Za-z0-9._-]{2,60}$/.test(t) && t.length <= max ? t.replace(/^@/, "") : null;
}

const unicos = (arr) => [...new Set(arr)];

// Revisa el formulario completo. Devuelve { datos } si está bien o { error } con un mensaje claro para la persona.
export function sanearOficio(b) {
  const x = b && typeof b === "object" ? b : {};
  const nombre = limpiar(x.nombre);
  if (!largo(nombre, LIMITES.nombre)) return { error: "Escribí el nombre con el que querés aparecer (entre 2 y 60 letras)." };

  const rubros = unicos((Array.isArray(x.rubros) ? x.rubros : []).map(String).filter((id) => RUBRO_IDS.has(id)));
  const otros = unicos((Array.isArray(x.otros) ? x.otros : []).map(limpiar).filter(Boolean));
  if (otros.some((o) => !largo(o, LIMITES.otro))) return { error: "Cada rubro propio puede tener entre 2 y 40 letras." };
  if (rubros.length > LIMITES.rubros || otros.length > LIMITES.otros) return { error: `Podés elegir hasta ${LIMITES.rubros} rubros y sumar hasta ${LIMITES.otros} propios.` };
  if (rubros.length + otros.length === 0) return { error: "Elegí al menos un rubro." };

  const desc = limpiar(x.desc);
  if (!largo(desc, LIMITES.desc)) return { error: `Contá en pocas palabras qué hacés (entre ${LIMITES.desc[0]} y ${LIMITES.desc[1]} letras).` };

  const localidad = sanearLocalidad(x.localidad);
  if (!localidad) return { error: "Elegí tu provincia y tu localidad de la lista." };

  const zona = limpiar(x.zona);
  const direccion = limpiar(x.direccion);
  const horario = limpiar(x.horario);
  const precio = limpiar(x.precio);
  if (zona.length > LIMITES.zona) return { error: `La zona de trabajo puede tener hasta ${LIMITES.zona} letras.` };
  if (direccion.length > LIMITES.direccion) return { error: `La dirección puede tener hasta ${LIMITES.direccion} letras.` };
  if (horario.length > LIMITES.horario) return { error: `Los horarios pueden tener hasta ${LIMITES.horario} letras.` };
  if (precio.length > LIMITES.precio) return { error: `El precio orientativo puede tener hasta ${LIMITES.precio} letras.` };

  const whatsapp = sanearWhatsapp(x.whatsapp);
  if (whatsapp === null) return { error: "El WhatsApp no parece válido. Escribilo con código de país y de área, por ejemplo 5493815551234." };
  const mostrarWhatsapp = x.mostrarWhatsapp === true;
  if (mostrarWhatsapp && !whatsapp) return { error: "Para mostrar el botón de WhatsApp tenés que escribir tu número." };

  const ig = sanearRed(x.ig); const facebook = sanearRed(x.facebook, 300); const tiktok = sanearRed(x.tiktok);
  if (ig === null || facebook === null || tiktok === null) return { error: "Una de tus redes no es válida. Escribí el usuario o el enlace completo (https://...)." };

  let logo = "";
  if (x.logo) { logo = sanearFoto(x.logo); if (logo === undefined) return { error: "El logo no es válido. Probá subirlo de nuevo." }; }
  const fotosEnviadas = Array.isArray(x.fotos) ? x.fotos : [];
  if (fotosEnviadas.length > LIMITES.fotos) return { error: `Podés subir hasta ${LIMITES.fotos} fotos de trabajos.` };
  const fotos = fotosEnviadas.map(sanearFoto);
  if (fotos.some((f) => !f)) return { error: "Una de las fotos no es válida. Probá subirla de nuevo." };

  const dias = DIAS.filter((d) => Array.isArray(x.dias) && x.dias.includes(d));
  const etiquetas = ETIQUETAS.filter((e) => Array.isArray(x.etiquetas) && x.etiquetas.includes(e));

  return { datos: { nombre, rubros, otros, desc, localidad, zona, direccion, whatsapp, mostrarWhatsapp, ig, facebook, tiktok, logo, fotos: unicos(fotos), dias, horario, precio, etiquetas } };
}

// Texto para buscar (sin tildes ni mayúsculas): el nombre de cada rubro, los propios, la descripción y la zona
export function textoBusqueda(d) {
  return normalizar([...d.rubros.map((id) => ETIQUETA_RUBRO[id]), ...d.otros, d.desc, d.zona, d.localidad?.localidad, d.nombre].join(" "));
}

// Estado de la ficha: activa, pausada o vencida. "Vencida" sale de la fecha de vencimiento (YYYY-MM-DD): hoy todavía no se cobra,
// así que expiresAt queda vacío; cuando se conecten los pagos (Fase 9) alcanza con cargar esa fecha y la ficha vence sola.
export function estadoOficio(o, hoy) {
  if (o.status === "paused") return "pausada";
  if (o.expiresAt && o.expiresAt < hoy) return "vencida";
  return "activa";
}

// "Disponible hoy" solo vale el día en que se marcó: al día siguiente deja de afirmarse (la información ya no está al día).
// "Ocupado" se mantiene hasta que el dueño lo cambie. Devuelve "disponibleHoy" | "ocupado" | null.
export function disponibilidadVigente(o, hoy) {
  if (o.disponible === true) return o.disponibleEl === hoy ? "disponibleHoy" : null;
  if (o.disponible === false && o.disponibleEl) return "ocupado";
  return null;
}

const nombreLocalidad = (l) => (l?.localidadId ? { localidad: l.localidad, departamento: l.departamento, provincia: l.provincia } : null);

// Lo que ve cualquier persona. Nunca sale: dueño, correo, número de WhatsApp (solo se avisa si hay botón), vencimiento ni datos de pago.
export function oficioPublico(o, hoy, dueno = null) {
  return {
    id: o.id, nombre: o.nombre,
    rubros: o.rubros.map((id) => ({ id, label: ETIQUETA_RUBRO[id] || id })), otros: o.otros || [],
    desc: o.desc, localidad: nombreLocalidad(o.localidad), zona: o.zona || "", direccion: o.direccion || "",
    conWhatsapp: !!o.whatsapp && o.mostrarWhatsapp === true,
    ig: o.ig || "", facebook: o.facebook || "", tiktok: o.tiktok || "",
    logo: o.logo || "", fotos: o.fotos || [], dias: o.dias || [], horario: o.horario || "", precio: o.precio || "", etiquetas: o.etiquetas || [],
    disponibilidad: disponibilidadVigente(o, hoy), dueno, actualizadoEn: o.updatedAt || null,
  };
}

// Lo que ve su dueño: todo lo anterior más lo privado de su propia ficha
export function oficioDelDueno(o, hoy) {
  return {
    ...oficioPublico(o, hoy),
    whatsapp: o.whatsapp || "", mostrarWhatsapp: o.mostrarWhatsapp === true,
    estado: estadoOficio(o, hoy), status: o.status, vencimiento: o.expiresAt || null,
    disponible: o.disponible === true ? true : o.disponible === false ? false : null, disponibleEl: o.disponibleEl || null,
    duenoEnPerfil: !!o.duenoEnPerfil, duenoEnFicha: !!o.duenoEnFicha, apareceEnBusquedas: o.apareceEnBusquedas !== false,
    localidadCompleta: o.localidad?.localidadId ? { provinciaId: o.localidad.provinciaId, provincia: o.localidad.provincia, departamentoId: o.localidad.departamentoId, departamento: o.localidad.departamento, localidadId: o.localidad.localidadId, localidad: o.localidad.localidad } : null,
    creadaEn: o.createdAt || null, compartioEn: o.compartioEn || null,
  };
}

// Enlace oficial de WhatsApp con mensaje inicial bien codificado. Mi Zona nunca envía nada: solo abre el chat con el texto para que la persona lo revise.
export function enlaceWhatsapp(numero, mensaje) {
  const n = sanearWhatsapp(numero);
  if (!n) return null;
  const texto = limpiar(mensaje).slice(0, 500);
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}
