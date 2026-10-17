// Categorías y tipos de alquileres (copia de server/utils/alquileres.js: si cambiás uno, cambiá el otro). El id es fijo; "label" es lo que se ve.
export const CATEGORIAS = [
  { id: "viviendas", label: "Viviendas y espacios", corto: "Viviendas", tipos: [
    { id: "casa", label: "Casa" }, { id: "departamento", label: "Departamento" }, { id: "habitacion", label: "Habitación" },
    { id: "salon", label: "Salón" }, { id: "quincho", label: "Quincho o parrilla" }, { id: "local", label: "Local comercial" },
    { id: "cochera", label: "Cochera" }, { id: "terreno", label: "Terreno o campo" }, { id: "otro_espacio", label: "Otro espacio" } ] },
  { id: "eventos", label: "Cumpleaños y eventos", corto: "Eventos", tipos: [
    { id: "sillas_mesas", label: "Sillas y mesas" }, { id: "peloteros", label: "Peloteros e inflables" }, { id: "decoracion", label: "Decoración" },
    { id: "sonido", label: "Sonido e iluminación" }, { id: "vajilla", label: "Vajilla y manteles" }, { id: "carpas", label: "Carpas y gazebos" },
    { id: "disfraces", label: "Disfraces" }, { id: "otro_evento", label: "Otro para eventos" } ] },
  { id: "herramientas", label: "Herramientas y equipos", corto: "Herramientas", tipos: [
    { id: "herr_electricas", label: "Herramientas eléctricas" }, { id: "herr_manuales", label: "Herramientas manuales" }, { id: "construccion", label: "Construcción (andamios, mezcladoras)" },
    { id: "jardin", label: "Jardín y campo" }, { id: "limpieza", label: "Limpieza (hidrolavadoras, alfombras)" }, { id: "generadores", label: "Generadores y compresores" },
    { id: "otro_equipo", label: "Otros equipos" } ] },
  { id: "otros", label: "Otros alquileres", corto: "Otros", tipos: [
    { id: "vehiculos", label: "Vehículos, bicicletas y remolques" }, { id: "tecnologia", label: "Tecnología y electrónica" }, { id: "deportes", label: "Deportes y camping" },
    { id: "bebes", label: "Artículos para bebés" }, { id: "otro", label: "Otro" } ] },
];
export const ETIQUETA_CATEGORIA = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c.label]));
export const ETIQUETA_TIPO = Object.fromEntries(CATEGORIAS.flatMap((c) => c.tipos.map((t) => [t.id, t.label])));
export const UNIDADES = [["hora", "Por hora"], ["dia", "Por día"], ["semana", "Por semana"], ["mes", "Por mes"], ["consultar", "Consultar precio"]];
const POR = { hora: "por hora", dia: "por día", semana: "por semana", mes: "por mes" };
export const MAX_FICHAS = 5, MAX_ARTICULOS = 40, MAX_FOTOS = 6, VIGENCIA_DIAS = 30;

// "$15.000 por día" · "Consultar precio"
export const textoPrecio = (a) => (a.precioUnidad === "consultar" || a.precioValor == null ? "Consultar precio" : `$${Number(a.precioValor).toLocaleString("es-AR")} ${POR[a.precioUnidad] || ""}`.trim());
// Lo más útil de un vistazo para la tarjeta del listado
export function resumenVivienda(v) {
  if (!v) return "";
  const t = [];
  if (v.dormitorios != null) t.push(v.dormitorios === 0 ? "Monoambiente" : `${v.dormitorios} ${v.dormitorios === 1 ? "dormitorio" : "dormitorios"}`);
  if (v.capacidad != null) t.push(`hasta ${v.capacidad} personas`);
  if (v.amoblado === true) t.push("amoblado");
  return t.join(" · ");
}
