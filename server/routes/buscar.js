import express from "express";
import Oficio from "../models/Oficio.js";
import Alquiler from "../models/Alquiler.js";
import { identificar, limitar } from "../utils/auth.js";
import { ownersExcluidos, ownerExcluido } from "../utils/exclusiones.js";
import { ahoraArgentina } from "../utils/fechas.js";
import { RUBRO_IDS } from "../utils/rubros.js";
import { oficioPublico, estadoOficio, normalizar } from "../utils/oficios.js";
import { CATEGORIA_IDS, alquilerPublico, estadoFicha } from "../utils/alquileres.js";

// Buscador único (Fase 6): devuelve los resultados CLASIFICADOS por tipo (oficios y alquileres; los negocios ya se cargan completos en la web).
// Primero filtros y coincidencias directas; no usa IA (eso es la Fase 10). Solo muestra lo público: activo y no oculto de las búsquedas.
const router = express.Router();
router.use(identificar);

const POR_TIPO = 10;
const hoy = () => ahoraArgentina().fecha;
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// "sillas" encuentra "silla" y "electricistas" encuentra "electricista": se quita la "s" final de las palabras largas
const raiz = (w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w);
export function palabrasDeBusqueda(q) {
  return normalizar(String(q ?? "")).slice(0, 60).split(" ").filter((w) => w.length >= 2).slice(0, 5).map(raiz);
}

const visible = (h, excluidos = []) => ({
  status: "active", pendientePago: { $ne: true }, apareceEnBusquedas: { $ne: false }, ocultaPorEquipo: { $ne: true }, ownerId: { $nin: excluidos },
  $or: [{ expiresAt: null }, { expiresAt: "" }, { expiresAt: { $exists: false } }, { expiresAt: { $gte: h } }],
});

// Devuelve { y } (condiciones) o { error } si algún filtro es inválido
function condicionesComunes(query, palabras) {
  const y = palabras.map((w) => ({ textoBusqueda: { $regex: esc(w) } }));
  const { provinciaId, departamentoId, localidadId } = query;
  if (provinciaId) { if (!/^\d{2}$/.test(String(provinciaId))) return { error: "Provincia inválida." }; y.push({ "localidad.provinciaId": String(provinciaId) }); }
  if (departamentoId) { if (!/^\d{5}$/.test(String(departamentoId))) return { error: "Departamento inválido." }; y.push({ "localidad.departamentoId": String(departamentoId) }); }
  if (localidadId) { if (!/^\d{5,12}$/.test(String(localidadId))) return { error: "Localidad inválida." }; y.push({ "localidad.localidadId": String(localidadId) }); }
  return { y };
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

export default router;
