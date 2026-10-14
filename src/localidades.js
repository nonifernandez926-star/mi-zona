// Catálogo oficial de localidades de Argentina: Georef (datos.gob.ar, Jefatura de Gabinete). Gratis y sin clave; datos de INDEC, IGN y BAHRA.
// La persona elige provincia → localidad. El departamento NO se pregunta: se toma de lo que devuelve Georef para cada localidad
// y se guarda junto con ella (sirve para filtrar por departamento y para mostrar Comunidad por departamento).
// Las respuestas quedan guardadas en memoria mientras la app está abierta.
const GEOREF = "https://apis.datos.gob.ar/georef/api";
const POR_PAGINA = 1000; // Georef devuelve de a 10 si no se pide más; se pagina con "inicio" hasta traer todo (hay provincias con cientos o miles)
const cache = new Map();

async function pedir(ruta) {
  if (cache.has(ruta)) return cache.get(ruta);
  const r = await fetch(`${GEOREF}${ruta}`);
  if (!r.ok) throw new Error("No se pudo cargar la lista");
  const datos = await r.json();
  cache.set(ruta, datos);
  return datos;
}

// Trae todas las páginas de un recurso de Georef (clave: "localidades", "departamentos"...)
async function pedirTodo(recurso, filtros) {
  const todos = [];
  for (let inicio = 0; inicio < 20000; inicio += POR_PAGINA) {
    const datos = await pedir(`/${recurso}?${filtros}&max=${POR_PAGINA}&inicio=${inicio}`);
    const pagina = datos[recurso] || [];
    todos.push(...pagina);
    const total = Number.isFinite(datos.total) ? datos.total : null;
    if (pagina.length < POR_PAGINA || (total !== null && todos.length >= total)) break;
  }
  return todos;
}

// Georef devuelve MAYÚSCULAS: se pasan a "Título" (con de/del/la... en minúscula)
const CORTAS = new Set(["de", "del", "la", "las", "los", "el", "y", "e", "en", "al"]);
export function aTitulo(texto) {
  return String(texto || "").toLocaleLowerCase("es").split(/(\s+)/).map((p, i) => (/^\s+$/.test(p) || (i > 0 && CORTAS.has(p)) ? p : p.charAt(0).toLocaleUpperCase("es") + p.slice(1))).join("");
}
const comparar = (a, b) => a.nombre.localeCompare(b.nombre, "es");

// Para buscar sin importar tildes ni mayúsculas ("famailla" encuentra "Famaillá")
export const normalizarBusqueda = (t) => String(t || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

export async function provincias() {
  const items = (await pedir("/provincias?campos=id,nombre&orden=nombre&max=30")).provincias;
  return items.map(({ id, nombre }) => ({ id: String(id), nombre: aTitulo(nombre) })).sort(comparar);
}

// Todas las localidades de una provincia, cada una con su departamento (lo que dice Georef):
//   { id, nombre, departamentoId, departamento, esDepartamento? }
// Si un departamento no tiene ninguna localidad en la lista oficial (pasa, por ejemplo, con las comunas de la Ciudad de Buenos Aires),
// el propio departamento aparece como opción y se usa como su localidad (esDepartamento: true).
export async function localidadesDeProvincia(provinciaId) {
  const pid = encodeURIComponent(provinciaId);
  const [locs, deps] = await Promise.all([
    pedirTodo("localidades", `provincia=${pid}&campos=id,nombre,departamento.id,departamento.nombre&orden=nombre`),
    pedirTodo("departamentos", `provincia=${pid}&campos=id,nombre&orden=nombre`),
  ]);
  const nombreDep = new Map(deps.map((d) => [String(d.id), aTitulo(d.nombre)]));
  const porId = new Map();
  for (const l of locs) {
    const id = String(l.id);
    if (porId.has(id)) continue;
    // si Georef no informa el departamento, sale de los primeros 5 dígitos del código (2 de la provincia + 3 del departamento)
    const departamentoId = String(l.departamento?.id || id.slice(0, 5));
    const departamento = l.departamento?.nombre ? aTitulo(l.departamento.nombre) : nombreDep.get(departamentoId) || "";
    if (!/^\d{5}$/.test(departamentoId) || !departamento) continue;
    porId.set(id, { id, nombre: aTitulo(l.nombre), departamentoId, departamento });
  }
  const conLocalidades = new Set([...porId.values()].map((l) => l.departamentoId));
  for (const [id, nombre] of nombreDep) {
    if (!conLocalidades.has(id)) porId.set(id, { id, nombre, departamentoId: id, departamento: nombre, esDepartamento: true });
  }
  return [...porId.values()].sort(comparar);
}

export const textoLocalidad = (l) => (l?.localidad ? (l.provincia ? `${l.localidad}, ${l.provincia}` : l.localidad) : "");
