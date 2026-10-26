// Fichas de alquiler y sus artículos: listas, validación y armado de lo que sale al público. No depende de Express ni de MongoDB,
// así se puede probar suelto. Todo lo que manda la web se vuelve a revisar acá.
import crypto from "crypto";
import { ocultaInfo } from "./moderacion.js";
import { sanearLocalidad, sanearFoto } from "./perfil.js";
import { sanearWhatsapp, sanearRed, normalizar, estadoOficio, enlaceWhatsapp, sanearHorarios } from "./oficios.js";

export { normalizar, enlaceWhatsapp, sanearWhatsapp };
export const estadoFicha = estadoOficio; // mismas reglas: pausada | vencida | activa

// Categorías y sus tipos. Se pueden ampliar agregando una línea (no cambies un id ya usado: las fichas guardan el id).
// Copiá lo mismo en src/alquileres.js (la web usa su propia copia).
export const CATEGORIAS = [
  { id: "viviendas", label: "Viviendas y espacios", tipos: [
    { id: "casa", label: "Casa" }, { id: "departamento", label: "Departamento" }, { id: "habitacion", label: "Habitación" },
    { id: "salon", label: "Salón" }, { id: "quincho", label: "Quincho o parrilla" }, { id: "local", label: "Local comercial" },
    { id: "cochera", label: "Cochera" }, { id: "terreno", label: "Terreno o campo" }, { id: "otro_espacio", label: "Otro espacio" } ] },
  { id: "eventos", label: "Cumpleaños y eventos", tipos: [
    { id: "sillas_mesas", label: "Sillas y mesas" }, { id: "peloteros", label: "Peloteros e inflables" }, { id: "decoracion", label: "Decoración" },
    { id: "sonido", label: "Sonido e iluminación" }, { id: "vajilla", label: "Vajilla y manteles" }, { id: "carpas", label: "Carpas y gazebos" },
    { id: "disfraces", label: "Disfraces" }, { id: "otro_evento", label: "Otro para eventos" } ] },
  { id: "herramientas", label: "Herramientas y equipos", tipos: [
    { id: "herr_electricas", label: "Herramientas eléctricas" }, { id: "herr_manuales", label: "Herramientas manuales" }, { id: "construccion", label: "Construcción (andamios, mezcladoras)" },
    { id: "jardin", label: "Jardín y campo" }, { id: "limpieza", label: "Limpieza (hidrolavadoras, alfombras)" }, { id: "generadores", label: "Generadores y compresores" },
    { id: "otro_equipo", label: "Otros equipos" } ] },
  { id: "otros", label: "Otros alquileres", tipos: [
    { id: "vehiculos", label: "Vehículos, bicicletas y remolques" }, { id: "tecnologia", label: "Tecnología y electrónica" }, { id: "deportes", label: "Deportes y camping" },
    { id: "bebes", label: "Artículos para bebés" }, { id: "otro", label: "Otro" } ] },
];
export const CATEGORIA_IDS = new Set(CATEGORIAS.map((c) => c.id));
const TIPOS_DE = Object.fromEntries(CATEGORIAS.map((c) => [c.id, new Set(c.tipos.map((t) => t.id))]));
export const ETIQUETA_TIPO = Object.fromEntries(CATEGORIAS.flatMap((c) => c.tipos.map((t) => [t.id, t.label])));
export const ETIQUETA_CATEGORIA = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c.label]));

export const UNIDADES = ["hora", "dia", "semana", "mes", "consultar"];
export const ESTADOS_ARTICULO = ["disponible", "ocupado", "retirado"];
export const LIMITES = { nombre: [2, 60], desc: [10, 400], tipos: 6, zona: 80, direccion: 120, condiciones: 400, fotos: 6, articulos: 40, fichas: 5, articuloNombre: [2, 60], precioMax: 99999999, dormitorios: 20, banos: 20, capacidad: 5000 };
export const VIGENCIA_DIAS = 30; // pasado este tiempo sin confirmar, un artículo "Disponible" se muestra como "Sin confirmar"
export const CAMPOS_FORMULARIO = ["nombre", "categoria", "tipos", "desc", "localidad", "zona", "direccion", "whatsapp", "mostrarWhatsapp", "ig", "facebook", "tiktok", "logo", "fotos", "weekHours", "condiciones", "vivienda"];

const limpiar = (s) => String(s ?? "").replace(/[\u0000-\u001F\u007F<>]/g, " ").replace(/\s+/g, " ").trim();
const largo = (t, [min, max]) => t.length >= min && t.length <= max;
const unicos = (a) => [...new Set(a)];
const entero = (v, max) => { if (v === null || v === undefined || v === "") return null; const n = Number(v); return Number.isInteger(n) && n >= 0 && n <= max ? n : undefined; };
const triestado = (v) => (v === true ? true : v === false ? false : null);

// Revisa un artículo. Devuelve { datos } o { error }.
export function sanearArticulo(b) {
  const x = b && typeof b === "object" ? b : {};
  const nombre = limpiar(x.nombre);
  if (!largo(nombre, LIMITES.articuloNombre)) return { error: "Escribí el nombre del artículo (entre 2 y 60 letras)." };
  const precioUnidad = UNIDADES.includes(x.precioUnidad) ? x.precioUnidad : "consultar";
  let precioValor = null;
  if (precioUnidad !== "consultar") {
    const n = Number(x.precioValor);
    if (x.precioValor === "" || x.precioValor === null || x.precioValor === undefined) return { error: "Escribí el precio o elegí «Consultar precio»." };
    if (!Number.isInteger(n) || n < 1 || n > LIMITES.precioMax) return { error: "El precio tiene que ser un número entero en pesos, mayor a cero." };
    precioValor = n;
  }
  let foto = "";
  if (x.foto) { foto = sanearFoto(x.foto); if (foto === undefined || foto === null || foto === "") return { error: "La foto del artículo no es válida. Probá subirla de nuevo." }; }
  return { datos: { nombre, foto, precioValor, precioUnidad } };
}

export const nuevoArticulo = (datos) => ({ id: crypto.randomBytes(5).toString("hex"), ...datos, estado: "disponible", estadoEl: new Date() });

// Revisa el formulario completo de la ficha (sin artículos: esos tienen su propia validación). Devuelve { datos } o { error }.
export function sanearAlquiler(b) {
  const x = b && typeof b === "object" ? b : {};
  const nombre = limpiar(x.nombre);
  if (!largo(nombre, LIMITES.nombre)) return { error: "Escribí el nombre de tu ficha (entre 2 y 60 letras)." };
  if (!CATEGORIA_IDS.has(x.categoria)) return { error: "Elegí una categoría." };
  const categoria = x.categoria;
  const tipos = unicos((Array.isArray(x.tipos) ? x.tipos : []).map(String).filter((t) => TIPOS_DE[categoria].has(t)));
  if (tipos.length === 0) return { error: "Elegí al menos un tipo de lo que alquilás." };
  if (tipos.length > LIMITES.tipos) return { error: `Podés elegir hasta ${LIMITES.tipos} tipos.` };
  const desc = limpiar(x.desc);
  if (!largo(desc, LIMITES.desc)) return { error: `Contá en pocas palabras qué alquilás (entre ${LIMITES.desc[0]} y ${LIMITES.desc[1]} letras).` };
  const localidad = sanearLocalidad(x.localidad);
  if (!localidad) return { error: "Elegí tu provincia y tu localidad de la lista." };
  const zona = limpiar(x.zona), direccion = limpiar(x.direccion), condiciones = limpiar(x.condiciones);
  if (zona.length > LIMITES.zona) return { error: `La zona puede tener hasta ${LIMITES.zona} letras.` };
  if (direccion.length > LIMITES.direccion) return { error: `La dirección puede tener hasta ${LIMITES.direccion} letras.` };
  if (condiciones.length > LIMITES.condiciones) return { error: `Las condiciones pueden tener hasta ${LIMITES.condiciones} letras.` };

  const whatsapp = sanearWhatsapp(x.whatsapp);
  if (whatsapp === null) return { error: "El WhatsApp no parece válido. Escribilo con código de país y de área, por ejemplo 5493815551234." };
  const mostrarWhatsapp = x.mostrarWhatsapp === true;
  if (mostrarWhatsapp && !whatsapp) return { error: "Para mostrar el botón de WhatsApp tenés que escribir tu número." };
  const ig = sanearRed(x.ig), facebook = sanearRed(x.facebook, 300), tiktok = sanearRed(x.tiktok);
  if (ig === null || facebook === null || tiktok === null) return { error: "Una de tus redes no es válida. Escribí el usuario o el enlace completo (https://...)." };

  let logo = "";
  if (x.logo) { logo = sanearFoto(x.logo); if (logo === undefined) return { error: "El logo no es válido. Probá subirlo de nuevo." }; }
  const enviadas = Array.isArray(x.fotos) ? x.fotos : [];
  if (enviadas.length > LIMITES.fotos) return { error: `Podés subir hasta ${LIMITES.fotos} fotos.` };
  const fotos = enviadas.map(sanearFoto);
  if (fotos.some((f) => !f)) return { error: "Una de las fotos no es válida. Probá subirla de nuevo." };

  const weekHours = sanearHorarios(x.weekHours);
  if (weekHours === null) return { error: "Los horarios no son válidos. Elegí de nuevo los días y las horas." };

  // Datos de vivienda: solo existen en esa categoría. En las demás se descartan aunque la web los mande.
  let vivienda = { dormitorios: null, banos: null, amoblado: null, mascotas: null, capacidad: null };
  if (categoria === "viviendas") {
    const v = x.vivienda && typeof x.vivienda === "object" ? x.vivienda : {};
    const dormitorios = entero(v.dormitorios, LIMITES.dormitorios), banos = entero(v.banos, LIMITES.banos), capacidad = entero(v.capacidad, LIMITES.capacidad);
    if (dormitorios === undefined) return { error: "Los dormitorios tienen que ser un número entre 0 y 20." };
    if (banos === undefined) return { error: "Los baños tienen que ser un número entre 0 y 20." };
    if (capacidad === undefined) return { error: "La capacidad tiene que ser un número de personas." };
    vivienda = { dormitorios, banos, amoblado: triestado(v.amoblado), mascotas: triestado(v.mascotas), capacidad };
  }
  return { datos: { nombre, categoria, tipos, desc, localidad, zona, direccion, whatsapp, mostrarWhatsapp, ig, facebook, tiktok, logo, fotos: unicos(fotos), weekHours, condiciones, vivienda } };
}

export function textoBusqueda(d) {
  return normalizar([d.nombre, ETIQUETA_CATEGORIA[d.categoria], ...d.tipos.map((t) => ETIQUETA_TIPO[t]), d.desc, d.zona, d.localidad?.localidad, ...(d.articulos || []).map((a) => a.nombre)].join(" "));
}

const diasEntre = (desde, hasta) => Math.floor((hasta.getTime() - new Date(desde).getTime()) / 86400000);

// Lo que se puede AFIRMAR de un artículo ahora: "disponible" solo si se confirmó hace poco; si no, "sinConfirmar".
export function estadoVigente(a, ahora = new Date()) {
  if (a.estado === "ocupado") return "ocupado";
  if (a.estado === "retirado") return "retirado";
  return a.estadoEl && diasEntre(a.estadoEl, ahora) <= VIGENCIA_DIAS ? "disponible" : "sinConfirmar";
}

const nombreLocalidad = (l) => (l?.localidadId ? { localidad: l.localidad, departamento: l.departamento, provincia: l.provincia } : null);
const articuloVista = (a, ahora) => ({ id: a.id, nombre: a.nombre, foto: a.foto || "", precioValor: a.precioValor ?? null, precioUnidad: a.precioUnidad, estado: estadoVigente(a, ahora), confirmadoEn: a.estadoEl || null });

// Resumen de disponibilidad de la ficha, para el listado: "disponible" si hay algo confirmado; "ocupado" si todo está ocupado; si no, nada.
export function disponibilidadFicha(articulos, ahora = new Date()) {
  const v = (articulos || []).filter((a) => a.estado !== "retirado").map((a) => estadoVigente(a, ahora));
  if (v.includes("disponible")) return "disponible";
  if (v.length && v.every((e) => e === "ocupado")) return "ocupado";
  return null;
}

// Lo que ve cualquier persona. Nunca sale: dueño, número de WhatsApp (solo se avisa si hay botón), vencimiento ni artículos retirados.
export function alquilerPublico(a, dueno = null, ahora = new Date()) {
  const arts = (a.articulos || []).filter((x) => x.estado !== "retirado");
  return {
    id: a.id, nombre: a.nombre, categoria: a.categoria,
    tipos: (a.tipos || []).map((id) => ({ id, label: ETIQUETA_TIPO[id] || id })),
    desc: a.desc, localidad: nombreLocalidad(a.localidad), zona: a.zona || "", direccion: a.direccion || "",
    conWhatsapp: !!a.whatsapp && a.mostrarWhatsapp === true,
    ig: a.ig || "", facebook: a.facebook || "", tiktok: a.tiktok || "",
    logo: a.logo || "", fotos: a.fotos || [], weekHours: a.weekHours || [], condiciones: a.condiciones || "",
    vivienda: a.categoria === "viviendas" ? { dormitorios: a.vivienda?.dormitorios ?? null, banos: a.vivienda?.banos ?? null, amoblado: a.vivienda?.amoblado ?? null, mascotas: a.vivienda?.mascotas ?? null, capacidad: a.vivienda?.capacidad ?? null } : null,
    articulos: arts.map((x) => articuloVista(x, ahora)),
    cantidadArticulos: arts.length,
    disponibilidad: disponibilidadFicha(a.articulos, ahora),
    dueno, actualizadoEn: a.actualizadoEn || a.updatedAt || null,
  };
}

// Lo que ve su dueño: todo lo anterior más lo privado, y también los artículos retirados ("Ya no lo tengo")
export function alquilerDelDueno(a, hoy, ahora = new Date()) {
  const base = alquilerPublico(a, null, ahora);
  return {
    ...base,
    articulos: (a.articulos || []).map((x) => articuloVista(x, ahora)).map((x, i) => ({ ...x, estadoGuardado: a.articulos[i].estado })),
    cantidadArticulos: (a.articulos || []).filter((x) => x.estado !== "retirado").length,
    whatsapp: a.whatsapp || "", mostrarWhatsapp: a.mostrarWhatsapp === true,
    estado: estadoFicha(a, hoy), status: a.status, vencimiento: a.expiresAt || null, pendientePago: a.pendientePago === true, planOrigen: a.suscripcion?.origen || null,
    duenoEnPerfil: !!a.duenoEnPerfil, duenoEnFicha: !!a.duenoEnFicha, apareceEnBusquedas: a.apareceEnBusquedas !== false, ocultaPorEquipo: ocultaInfo(a), compartioEn: a.compartioEn || null,
    localidadCompleta: a.localidad?.localidadId ? { provinciaId: a.localidad.provinciaId, provincia: a.localidad.provincia, departamentoId: a.localidad.departamentoId, departamento: a.localidad.departamento, localidadId: a.localidad.localidadId, localidad: a.localidad.localidad } : null,
    creadaEn: a.createdAt || null,
  };
}
