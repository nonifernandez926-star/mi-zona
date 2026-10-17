import express from "express";
import Oficio from "../models/Oficio.js";
import Alquiler from "../models/Alquiler.js";
import { identificar, limitar } from "../utils/auth.js";
import { ahoraArgentina } from "../utils/fechas.js";
import { oficioPublico, estadoOficio } from "../utils/oficios.js";
import { alquilerPublico, estadoFicha } from "../utils/alquileres.js";

// Favoritos de oficios y alquileres (Fase 6). Los favoritos se guardan en el dispositivo (igual que los de negocios); acá el servidor
// decide QUÉ SIGUE VISIBLE: una ficha pausada, vencida u oculta no vuelve (y vuelve sola si se reactiva o renueva).
// Las que ya no existen se avisan aparte para que la web las saque de la lista. No hace falta cuenta ni se guarda nada.
const router = express.Router();
router.use(identificar);

const MAX = 100;
const ID_VALIDO = /^[A-Za-z0-9_-]{3,60}$/;
const ids = (items, tipo) => [...new Set(items.filter((x) => x && x.tipo === tipo && typeof x.id === "string" && ID_VALIDO.test(x.id)).map((x) => x.id))];

// POST /api/favoritos/resolver   { items: [{ tipo: "oficio" | "alquiler", id }] }  → { oficios, alquileres, eliminados: [{ tipo, id }] }
router.post("/resolver", limitar("favoritos-resolver", 120, 10 * 60 * 1000), async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, MAX) : [];
    const idsO = ids(items, "oficio"), idsA = ids(items, "alquiler");
    const h = ahoraArgentina().fecha, ahora = new Date();
    const [filasO, filasA] = await Promise.all([
      idsO.length ? Oficio.find({ id: { $in: idsO } }).lean() : [],
      idsA.length ? Alquiler.find({ id: { $in: idsA } }).lean() : [],
    ]);
    const hay = (filas) => new Set(filas.map((f) => f.id));
    const hayO = hay(filasO), hayA = hay(filasA);
    res.json({
      oficios: filasO.filter((o) => estadoOficio(o, h) === "activa" && o.apareceEnBusquedas !== false).map((o) => oficioPublico(o, h, null)),
      alquileres: filasA.filter((a) => estadoFicha(a, h) === "activa" && a.apareceEnBusquedas !== false).map((a) => { const p = alquilerPublico(a, null, ahora); delete p.articulos; return p; }),
      eliminados: [...idsO.filter((i) => !hayO.has(i)).map((id) => ({ tipo: "oficio", id })), ...idsA.filter((i) => !hayA.has(i)).map((id) => ({ tipo: "alquiler", id }))],
    });
  } catch (e) {
    console.error("Error al resolver favoritos:", e);
    res.status(500).json({ error: "No se pudieron cargar tus favoritos." });
  }
});

export default router;
