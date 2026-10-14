import express from "express";
import Usuario from "../models/Usuario.js";
import Business from "../models/Business.js";
import Oficio from "../models/Oficio.js";
import { ahoraArgentina } from "../utils/fechas.js";
import { estadoOficio } from "../utils/oficios.js";
import { identificar, requiereUsuario, limitar } from "../utils/auth.js";
import { normalizarUsuario, validarUsuario } from "../utils/credenciales.js";
import { sanearLocalidad, sanearDescripcion, sanearFoto, localidadDe, DESCRIPCION_MAX } from "../utils/perfil.js";

const router = express.Router();

// PUT /api/perfiles/mio   { nombre?, descripcion?, foto?, localidad? }  → edita MI perfil público (solo lo que mando)
router.put("/mio", identificar, requiereUsuario, limitar("perfil-put", 60, 10 * 60 * 1000), async (req, res) => {
  try {
    const u = req.actor.usuario;
    const b = req.body || {};
    if (b.nombre !== undefined) {
      const nombre = String(b.nombre || "").replace(/\s+/g, " ").trim();
      if (nombre.length < 2 || nombre.length > 60) return res.status(400).json({ error: "Escribí tu nombre (entre 2 y 60 letras)." });
      u.nombre = nombre;
    }
    if (b.descripcion !== undefined) {
      const d = sanearDescripcion(b.descripcion);
      if (d.length > DESCRIPCION_MAX) return res.status(400).json({ error: `La descripción puede tener hasta ${DESCRIPCION_MAX} caracteres.` });
      u.descripcion = d;
    }
    if (b.foto !== undefined) {
      const f = sanearFoto(b.foto);
      if (f === undefined) return res.status(400).json({ error: "La foto no es válida. Probá subirla de nuevo." });
      u.foto = f;
    }
    if (b.localidad !== undefined) {
      const l = sanearLocalidad(b.localidad);
      if (!l) return res.status(400).json({ error: "Elegí tu provincia y tu localidad de la lista." });
      u.localidad = l;
    }
    await u.save();
    res.json({ perfil: { nombre: u.nombre, descripcion: u.descripcion || "", foto: u.foto || "", localidad: localidadDe(u) } });
  } catch (e) {
    console.error("Error al guardar el perfil:", e.message);
    res.status(500).json({ error: "No se pudo guardar tu perfil. Probá de nuevo." });
  }
});

// GET /api/perfiles/:usuario  → perfil público. Nunca incluye correo, teléfono ni ubicación exacta.
// Si la persona lo puso como privado, solo se informa eso. "Dueño de" lista únicamente los negocios que el dueño eligió mostrar.
router.get("/:usuario", limitar("perfil-get", 120, 10 * 60 * 1000), async (req, res) => {
  try {
    const nombreUsuario = normalizarUsuario(req.params.usuario);
    if (validarUsuario(nombreUsuario)) return res.status(404).json({ error: "No encontramos ese perfil." });
    const u = await Usuario.findOne({ usuario: nombreUsuario }).select("usuario nombre foto descripcion localidad privacidad");
    if (!u) return res.status(404).json({ error: "No encontramos ese perfil." });
    if (u.privacidad?.perfilVisible === false) return res.json({ perfil: { usuario: u.usuario, privado: true } });
    const negocios = await Business.find({ ownerId: String(u._id), duenoEnPerfil: true, status: "active", pendientePago: { $ne: true }, apareceEnBusquedas: { $ne: false } }).select("id name cat logo zone -_id").lean();
    // la ficha de oficios, solo si el dueño eligió mostrarla, está activa y aparece en las búsquedas
    const oficio = await Oficio.findOne({ ownerId: String(u._id), duenoEnPerfil: true, apareceEnBusquedas: { $ne: false } }).select("id nombre rubros logo localidad zona status expiresAt").lean();
    const oficioVisible = oficio && estadoOficio(oficio, ahoraArgentina().fecha) === "activa" ? oficio : null;
    const l = localidadDe(u);
    res.json({
      perfil: {
        usuario: u.usuario, nombre: u.nombre || u.usuario, foto: u.foto || "", descripcion: u.descripcion || "",
        localidad: l ? { localidad: l.localidad, provincia: l.provincia } : null,
        duenoDe: [
          ...negocios.map((n) => ({ tipo: "negocio", id: n.id, nombre: n.name, cat: n.cat, logo: n.logo || "", zona: n.zone || "" })),
          ...(oficioVisible ? [{ tipo: "oficio", id: oficioVisible.id, nombre: oficioVisible.nombre, logo: oficioVisible.logo || "", zona: oficioVisible.localidad?.localidad || "", rubros: oficioVisible.rubros }] : []),
        ],
      },
    });
  } catch (e) {
    console.error("Error al cargar el perfil:", e.message);
    res.status(500).json({ error: "No se pudo cargar el perfil." });
  }
});

export default router;
