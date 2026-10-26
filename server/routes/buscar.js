import express from "express";
import Oficio from "../models/Oficio.js";
import Alquiler from "../models/Alquiler.js";
import Business from "../models/Business.js";
import { identificar, limitar } from "../utils/auth.js";
import { permitir } from "../utils/limitador.js";
import { interpretarBusqueda, etiquetasDe, palabrasClave, regexSinTildes, puntuar, TIPOS_VALIDOS } from "../utils/busquedaIA.js";
import { ownersExcluidos, ownerExcluido } from "../utils/exclusiones.js";
import { ahoraArgentina } from "../utils/fechas.js";
import { RUBRO_IDS } from "../utils/rubros.js";
import { oficioPublico, estadoOficio, normalizar } from "../utils/oficios.js";
import { CATEGORIA_IDS, alquilerPublico, estadoFicha } from "../utils/alquileres.js";

// Buscador único (Fase 6): devuelve los resultados CLASIFICADOS por tipo (oficios y alquileres; los negocios ya se cargan completos en la web).
// Primero filtros y coincidencias directas (GET /). La IA (Fase 10, POST /ia) solo interviene cuando la web se lo pide: interpreta el texto y
// devuelve filtros; los resultados salen siempre de la base de datos. Solo muestra lo público: activo y no oculto de las búsquedas.
const router = express.Router();
router.use(identificar);

const POR_TIPO = 10;
export const hoy = () => ahoraArgentina().fecha;
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// "sillas" encuentra "silla" y "electricistas" encuentra "electricista": se quita la "s" final de las palabras largas
const raiz = (w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w);
export function palabrasDeBusqueda(q) {
  return normalizar(String(q ?? "")).slice(0, 60).split(" ").filter((w) => w.length >= 2).slice(0, 5).map(raiz);
}

export const visible = (h, excluidos = []) => ({
  status: "active", pendientePago: { $ne: true }, apareceEnBusquedas: { $ne: false }, ocultaPorEquipo: { $ne: true }, ownerId: { $nin: excluidos },
  $or: [{ expiresAt: null }, { expiresAt: "" }, { expiresAt: { $exists: false } }, { expiresAt: { $gte: h } }],
});

// Condiciones de zona (provincia, departamento, localidad). Devuelve { y } o { error } si algún filtro es inválido
export function condicionesZona(query) {
  const y = [];
  const { provinciaId, departamentoId, localidadId } = query || {};
  if (provinciaId) { if (!/^\d{2}$/.test(String(provinciaId))) return { error: "Provincia inválida." }; y.push({ "localidad.provinciaId": String(provinciaId) }); }
  if (departamentoId) { if (!/^\d{5}$/.test(String(departamentoId))) return { error: "Departamento inválido." }; y.push({ "localidad.departamentoId": String(departamentoId) }); }
  if (localidadId) { if (!/^\d{5,12}$/.test(String(localidadId))) return { error: "Localidad inválida." }; y.push({ "localidad.localidadId": String(localidadId) }); }
  return { y };
}

// Devuelve { y } (condiciones: cada palabra + la zona) o { error } si algún filtro es inválido
function condicionesComunes(query, palabras) {
  const zona = condicionesZona(query);
  if (zona.error) return zona;
  return { y: [...palabras.map((w) => ({ textoBusqueda: { $regex: esc(w) } })), ...zona.y] };
}

// GET /api/buscar?q=&tipo=todo|oficios|alquileres&rubro=&categoria=&provinciaId=&departamentoId=&localidadId=
router.get("/", limitar("buscar-todo", 120, 10 * 60 * 1000), async (req, res) => {
  try {
    const h = hoy();
    const palabras = palabrasDeBusqueda(req.query.q);
    if (!palabras.length) return res.status(400).json({ error: "Escribí al menos 2 letras para buscar." });
    const tipo = String(req.query.tipo || "todo");
    if (!["todo", "oficios", "alquileres"].includes(tipo)) return res.status(400).json({ error: "Tipo de búsqueda inválido." });
    const comunes = condicionesComunes(req.query, palabras);
    if (comunes.error) return res.status(400).json({ error: comunes.error });

    const extraO = [], extraA = [];
    if (req.query.rubro) { if (!RUBRO_IDS.has(String(req.query.rubro))) return res.status(400).json({ error: "Ese rubro no existe." }); extraO.push({ rubros: String(req.query.rubro) }); }
    if (req.query.categoria) { if (!CATEGORIA_IDS.has(String(req.query.categoria))) return res.status(400).json({ error: "Esa categoría no existe." }); extraA.push({ categoria: String(req.query.categoria) }); }

    const excluidos = await ownersExcluidos(req); // Fase 8: cuentas suspendidas y personas bloqueadas
    const matchO = { $and: [visible(h, excluidos), ...comunes.y, ...extraO] };
    const matchA = { $and: [visible(h, excluidos), ...comunes.y, ...extraA] };
    const [totalOficios, filasO, totalAlquileres, filasA] = await Promise.all([
      tipo === "alquileres" ? 0 : Oficio.countDocuments(matchO),
      tipo === "alquileres" ? [] : Oficio.find(matchO).sort({ updatedAt: -1, _id: 1 }).limit(POR_TIPO).lean(),
      tipo === "oficios" ? 0 : Alquiler.countDocuments(matchA),
      tipo === "oficios" ? [] : Alquiler.find(matchA).sort({ actualizadoEn: -1, _id: 1 }).limit(POR_TIPO).lean(),
    ]);
    const ahora = new Date();
    res.json({
      oficios: filasO.map((o) => oficioPublico(o, h, null)),
      alquileres: filasA.map((a) => { const p = alquilerPublico(a, null, ahora); delete p.articulos; return p; }),
      totalOficios, totalAlquileres,
    });
  } catch (e) {
    console.error("Error en la búsqueda:", e);
    res.status(500).json({ error: "No se pudo buscar. Probá de nuevo en unos minutos." });
  }
});

// POST /api/buscar/ia  { q, tipo, provinciaId, departamentoId, localidadId, zonaNegocios }
// Búsqueda con IA (Fase 10). La IA SOLO interpreta el texto (qué tipo de ficha, rubro o categoría, palabras clave, localidad) y devuelve filtros ya
// revisados contra las listas reales (utils/busquedaIA.js). Los resultados salen de la base de datos de Mi Zona, con las mismas reglas de
// visibilidad que la búsqueda común (activas, no ocultas, sin bloqueados ni suspendidos). La IA no inventa resultados, no publica, no envía
// mensajes ni modifica nada. Si no se puede usar la IA, responde { ia: false, motivo } y la web sigue con el buscador común.
router.post("/ia", limitar("buscar-ia-pedidos", 40, 10 * 60 * 1000), async (req, res) => {
  try {
    const body = req.body || {};
    const tipoPedido = TIPOS_VALIDOS.includes(body.tipo) ? body.tipo : "todo";
    const zona = condicionesZona(body);
    if (zona.error) return res.status(400).json({ error: zona.error });
    const zonaNegocios = typeof body.zonaNegocios === "string" ? body.zonaNegocios.trim().slice(0, 80) : "";

    const quien = req.actor?.usuario ? `u${req.actor.usuario._id}` : `ip${req.ip || "?"}`;
    const r = await interpretarBusqueda(body.q, { quien, permitir });
    if (!r.ok) return res.json({ ia: false, motivo: r.motivo });
    const i = r.interpretacion;

    const vacio = { ia: true, cache: r.cache, pregunta: i.pregunta, entendido: { etiquetas: [], localidad: "", localidadSinResultados: "" }, oficios: [], alquileres: [], negociosIds: [], totalOficios: 0, totalAlquileres: 0, totalNegocios: 0 };
    if (!i.hayFiltros) return res.json(vacio);

    // Qué tipos de ficha se consultan: lo que eligió la persona (si no es "Todo") o lo que entendió la IA. Si solo hay filtros de un tipo
    // (ej. un rubro de oficios), no se buscan palabras sueltas en los otros: traería resultados sin relación.
    const tipo = tipoPedido !== "todo" ? tipoPedido : i.tipo;
    const estO = i.rubros.length > 0, estA = i.tiposAlquiler.length + i.categoriasAlquiler.length > 0, estN = i.categoriasNegocio.length > 0;
    const hayEst = estO || estA || estN;
    const buscarO = (tipo === "todo" || tipo === "oficios") && (tipo === "oficios" || estO || !hayEst);
    const buscarA = (tipo === "todo" || tipo === "alquileres") && (tipo === "alquileres" || estA || !hayEst);
    const buscarN = (tipo === "todo" || tipo === "negocios") && (tipo === "negocios" || estN || !hayEst);

    const h = hoy();
    const ahora = new Date();
    const excluidos = await ownersExcluidos(req); // cuentas suspendidas y personas bloqueadas
    const kw = palabrasClave(i);
    const porTexto = kw.map((w) => ({ textoBusqueda: { $regex: esc(w) } }));
    const orO = [...(i.rubros.length ? [{ rubros: { $in: i.rubros } }] : []), ...porTexto];
    const orA = [...(i.tiposAlquiler.length ? [{ tipos: { $in: i.tiposAlquiler } }] : i.categoriasAlquiler.length ? [{ categoria: { $in: i.categoriasAlquiler } }] : []), ...porTexto];
    const orN = [...(i.categoriasNegocio.length ? [{ cat: { $in: i.categoriasNegocio } }] : []),
      ...kw.flatMap((w) => { const rx = { $regex: regexSinTildes(w), $options: "i" }; return [{ name: rx }, { desc: rx }, { services: rx }, { specialties: rx }]; })];

    const consultar = async (zonaY) => {
      const matchO = { $and: [visible(h, excluidos), ...zonaY, { $or: orO }] };
      const matchA = { $and: [visible(h, excluidos), ...zonaY, { $or: orA }] };
      const matchN = { status: "active", kind: { $ne: "job" }, pendientePago: { $ne: true }, apareceEnBusquedas: { $ne: false }, ocultaPorEquipo: { $ne: true }, ownerId: { $nin: excluidos }, ...(zonaNegocios ? { zone: zonaNegocios } : {}), $or: orN };
      const [filasO, totalO, filasA, totalA, filasN, totalN] = await Promise.all([
        buscarO && orO.length ? Oficio.find(matchO).sort({ updatedAt: -1, _id: 1 }).limit(30).lean() : [],
        buscarO && orO.length ? Oficio.countDocuments(matchO) : 0,
        buscarA && orA.length ? Alquiler.find(matchA).sort({ actualizadoEn: -1, _id: 1 }).limit(30).lean() : [],
        buscarA && orA.length ? Alquiler.countDocuments(matchA) : 0,
        buscarN && orN.length ? Business.find(matchN).select("id name cat desc services specialties").limit(40).lean() : [],
        buscarN && orN.length ? Business.countDocuments(matchN) : 0,
      ]);
      return { filasO, totalO, filasA, totalA, filasN, totalN };
    };

    // Si la persona escribió una localidad, manda sobre la zona elegida en pantalla. Si en esa localidad no hay nada, no se la deja
    // sin resultados en silencio: se busca en la zona elegida y se avisa.
    const locY = i.localidad ? [{ textoBusqueda: { $regex: esc(i.localidad) } }] : null;
    let datos = await consultar(locY || zona.y);
    let localidadSinResultados = "";
    if (locY && (buscarO || buscarA) && datos.totalO + datos.totalA === 0) {
      datos = await consultar(zona.y);
      localidadSinResultados = i.localidadTexto;
    }

    // Orden: primero lo que coincide con el rubro o tipo exacto, después las coincidencias de palabras; a igualdad, lo más reciente
    const ordenar = (filas, puntaje) => filas.map((x) => ({ x, p: puntaje(x) })).sort((a, b) => b.p - a.p).slice(0, POR_TIPO).map((e) => e.x);
    const oficios = ordenar(datos.filasO, (o) => puntuar({ texto: o.textoBusqueda, coincideExacto: (o.rubros || []).some((r) => i.rubros.includes(r)) }, kw));
    const alquileres = ordenar(datos.filasA, (a) => puntuar({ texto: a.textoBusqueda, coincideExacto: (a.tipos || []).some((t) => i.tiposAlquiler.includes(t)), coincideCategoria: i.categoriasAlquiler.includes(a.categoria) }, kw));
    const negocios = ordenar(datos.filasN, (b) => puntuar({ texto: [b.name, b.desc, ...(b.services || []), ...(b.specialties || [])].join(" "), coincideCategoria: i.categoriasNegocio.includes(b.cat) }, kw));

    res.json({
      ia: true, cache: r.cache, pregunta: "",
      entendido: { etiquetas: etiquetasDe(i), localidad: localidadSinResultados ? "" : i.localidadTexto, localidadSinResultados },
      oficios: oficios.map((o) => oficioPublico(o, h, null)),
      alquileres: alquileres.map((a) => { const p = alquilerPublico(a, null, ahora); delete p.articulos; return p; }),
      negociosIds: negocios.map((b) => b.id),
      totalOficios: datos.totalO, totalAlquileres: datos.totalA, totalNegocios: datos.totalN,
    });
  } catch (e) {
    console.error("Error en la búsqueda con IA:", e);
    // La web sigue con el buscador común: no se muestra un error si la IA falla
    res.json({ ia: false, motivo: "error" });
  }
});

export default router;
